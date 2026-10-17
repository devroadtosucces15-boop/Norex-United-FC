// Watch list (bot/watchlist.js): feed parsing, topic sorting, the hourly check, the Discord post, commands and the site API.
import { env, call, login, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { plainText, images } from '../bot/ui.js';
import { topicOf, tagsOf, parseFeed, parseSource, resolveSource, watchlistCron, TOPICS } from '../bot/watchlist.js';

const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
env.DISCORD_PUBLIC_KEY = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
env.DISCORD_BOT_TOKEN = 'bot'; env.DISCORD_GUILD_ID = '9';
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
async function send(payload) {
  const body = JSON.stringify(payload), ts = String(Date.now());
  const sig = Buffer.from(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(ts + body))).toString('hex');
  const res = await worker.fetch(new Request('https://bot/', { method: 'POST', body, headers: { 'X-Signature-Ed25519': sig, 'X-Signature-Timestamp': ts } }), env, { waitUntil: () => {} });
  return { s: res.status, d: await res.json().catch(() => null) };
}
const as = (id, name, roles = []) => ({ member: { user: { id, username: name }, roles }, channel_id: 'c1', token: 'tok' });
const cmd = (who, name, options = []) => send({ type: 2, ...who, data: { name, options } });
const press = (who, id) => send({ type: 3, ...who, data: { component_type: 2, custom_id: id } });
const ids = (m) => { const out = []; const w = (c) => { if (!c || typeof c !== 'object') return; if (Array.isArray(c)) return c.forEach(w); if (c.custom_id) out.push(c.custom_id); w(c.components); }; w(m.components); return out; };

// ---------- pure ----------
t('topics: builds, tactics, meta, news, and tips as the default', topicOf('Best CAM build in Pro Clubs') === 'builds' && topicOf('How to set up your formation and positioning') === 'tactics'
  && topicOf('This is broken: the meta right now') === 'meta' && topicOf('FC 26 trailer and release date news') === 'news' && topicOf('5 dribbling skills you need') === 'tips');
t('tags: positions found as whole words', tagsOf('Best CAM and ST builds').join() === 'CAM,ST' && tagsOf('Camera angles for CAMs') .length === 0 && tagsOf('GK tips').join() === 'GK');
const NOW = Date.UTC(2026, 9, 13, 12);
const iso = (ms) => new Date(ms).toISOString();
const feed = (name, vids) => `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/"><title>${name}</title>${vids.map((v) => `<entry><id>yt:video:${v.id}</id><yt:videoId>${v.id}</yt:videoId><title>${v.title}</title><author><name>${name}</name></author><published>${iso(v.at)}</published><media:group><media:thumbnail url="https://i.ytimg.com/vi/${v.id}/hq.jpg" width="480" height="360"/></media:group></entry>`).join('')}</feed>`;
const parsed = parseFeed(feed('Pitch &amp; Co', [{ id: 'abcDEF12345', title: 'Best &quot;CAM&quot; build', at: NOW - 3600e3 }]));
t('feed: id, decoded title, channel, published, thumbnail', parsed.length === 1 && parsed[0].id === 'abcDEF12345' && parsed[0].title === 'Best "CAM" build' && parsed[0].channel === 'Pitch & Co' && parsed[0].published === NOW - 3600e3 && /hq\.jpg$/.test(parsed[0].thumb));
t('feed: nonsense gives an empty list', parseFeed('<html>nope</html>').length === 0);

// ---------- fake YouTube + Discord ----------
const posts = [];
let feeds = {};
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const f = u.match(/feeds\/videos\.xml\?channel_id=(\w+)/);
  if (f) return feeds[f[1]] ? new Response(feeds[f[1]]) : new Response('no', { status: 404 });
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  const m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m) { if (m[1] !== 'dm') posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: 'm1' }); }
  return realFetch(url, init);
};
const UC1 = 'UC' + 'a'.repeat(22), UC2 = 'UC' + 'b'.repeat(22);

// ---------- commands ----------
setFlags({ watchlist: 'owner' });
const MEMBER = as('500', 'Jez'), MGR = as('900', 'Kruger', ['mgr']);
t('flag owner: a member is told it isn’t on yet', /switched on/.test(plainText((await cmd(MEMBER, 'watch')).d.data)));
setFlags({ watchlist: 'members' });
await tt('/watchlist: members can’t change it', async () => /Only managers/.test(plainText((await cmd(MEMBER, 'watchlist', [{ type: 1, name: 'list' }])).d.data)));
t('source: channel, @handle, video and short links are all understood', parseSource(`https://www.youtube.com/channel/${UC1}?x=1`).id === UC1 && parseSource(UC1).id === UC1
  && parseSource('@PitchCo').page === 'https://www.youtube.com/@PitchCo' && parseSource('https://youtu.be/abcDEF12345?t=4').page === 'https://www.youtube.com/watch?v=abcDEF12345'
  && parseSource('https://www.youtube.com/watch?v=abcDEF12345&list=x').page === 'https://www.youtube.com/watch?v=abcDEF12345' && parseSource('https://twitch.tv/x') === null && parseSource('nope nope') === null);
feeds[UC1] = feed('Pitch Co', []);
const page = (id) => new Response(`<html><link rel="canonical" href="https://www.youtube.com/channel/${id}"></html>`);
t('resolve: a handle page gives the channel and its name; a dead page gives null', (await resolveSource('@PitchCo', async (u) => (/feeds/.test(u) ? new Response(feed('Pitch Co', [])) : page(UC1))))?.name === 'Pitch Co'
  && (await resolveSource('@Ghost', async () => new Response('nothing', { status: 404 }))) === null);
await tt('/watchlist add: something that isn’t a channel is explained', async () => /couldn’t find/.test(plainText((await cmd(MGR, 'watchlist', [{ type: 1, name: 'add', options: [{ name: 'source', value: 'nope' }] }])).d.data)));
await tt('/watchlist add: a pasted link works, name comes from YouTube, posts to the chosen channel', async () => {
  const r = await cmd(MGR, 'watchlist', [{ type: 1, name: 'add', options: [{ name: 'source', value: `https://www.youtube.com/channel/${UC1}?x=1` }, { name: 'channel', value: '77777' }] }]);
  const row = sqlite.prepare('SELECT * FROM watch_creators').get();
  return /Following Pitch Co/.test(plainText(r.d.data)) && row.channel_id === UC1 && row.post_channel === '77777';
});
await tt('/watchlist list shows who we follow', async () => /Pitch Co/.test(plainText((await cmd(MGR, 'watchlist', [{ type: 1, name: 'list' }])).d.data)));
await tt('/watch with nothing yet', async () => /No videos yet/.test(plainText((await cmd(MEMBER, 'watch')).d.data)));

// ---------- the hourly check ----------
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('announce_channel', '42420') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
feeds[UC1] = feed('Pitch Co', [
  { id: 'new00000001', title: 'Best CAM build after the patch', at: NOW - 2 * 3600e3 },
  { id: 'old00000001', title: 'Formation guide from last month', at: NOW - 30 * 864e5 },
]);
const c1 = await watchlistCron(env, NOW);
await tt('cron: stores both, posts only the fresh one (the old backlog is silent)', async () => {
  const rows = sqlite.prepare('SELECT id, topic, tags, posted_at FROM watch_videos ORDER BY id').all();
  const panel = posts.at(-1)?.components?.find((c) => c.type === 17);
  return c1.stored === 2 && c1.posted === 1 && rows.length === 2 && rows.find((r) => r.id === 'new00000001').topic === 'builds' && rows.find((r) => r.id === 'new00000001').tags === '["CAM"]'
    && rows.every((r) => r.posted_at) && posts.length === 1 && posts[0].channel === '77777' && panel.accent_color === 0xc8352c
    && /Best CAM build/.test(plainText(posts[0])) && images(posts[0]).some((u) => /hq\.jpg/.test(u)) && ids(posts[0]).join() === 'norex:wl:useful:new00000001';
});
t('cron: not again within the hour', (await watchlistCron(env, NOW + 600e3)).stored === 0 && posts.length === 1);
feeds[UC1] = feed('Pitch Co', [{ id: 'new00000002', title: 'Defending tips', at: NOW + 3600e3 }, { id: 'new00000001', title: 'Best CAM build after the patch', at: NOW - 2 * 3600e3 }]);
sqlite.prepare('UPDATE watch_creators SET post_channel = NULL').run();
const c2 = await watchlistCron(env, NOW + 2 * 3600e3);
t('cron: a later upload is stored and posted, already-seen ones are not repeated', c2.stored === 1 && c2.posted === 1 && posts.length === 2 && posts[1].channel === '42420' && /Defending tips/.test(plainText(posts[1])));
t('cron: a broken feed (404) is skipped quietly', ((await watchlistCron(env, NOW + 4 * 3600e3, async () => new Response('x', { status: 404 }))).stored) === 0);

// ---------- /watch + Useful ----------
await tt('/watch: newest first, linked, topic filter works', async () => {
  const all = plainText((await cmd(MEMBER, 'watch')).d.data);
  const tips = plainText((await cmd(MEMBER, 'watch', [{ name: 'topic', value: 'builds' }])).d.data);
  return all.indexOf('Defending tips') < all.indexOf('Best CAM build') && all.includes('youtube.com/watch?v=new00000001') && /Builds/.test(tips) && !/Defending tips/.test(tips);
});
await tt('useful: toggles with the count in the button, in place', async () => {
  const a = await press(as('501', 'Mate'), 'norex:wl:useful:new00000001');
  const b = await press(as('502', 'Pal'), 'norex:wl:useful:new00000001');
  const c = await press(as('501', 'Mate'), 'norex:wl:useful:new00000001');
  return a.d.type === 7 && /Useful · 1/.test(JSON.stringify(a.d.data)) && /Useful · 2/.test(JSON.stringify(b.d.data)) && /Useful · 1/.test(JSON.stringify(c.d.data));
});

// ---------- site API ----------
const tok = await login('500', []);
const list = await call(tok, '/api/watchlist');
t('API: videos newest first with the contract fields', list.s === 200 && list.d.length === 3 && list.d[0].id === 'new00000002' && list.d[0].url === 'https://www.youtube.com/watch?v=new00000002' && list.d[0].topic === 'tactics'
  && Array.isArray(list.d[0].tags) && typeof list.d[0].published === 'number' && list.d[0].mine === false && list.d.find((v) => v.id === 'new00000001').useful === 1);
t('API: topic filter', (await call(tok, '/api/watchlist?topic=builds')).d.map((v) => v.id).join() === 'new00000001');
t('API: related=CAM picks videos tagged with that position, related=tactics by topic', (await call(tok, '/api/watchlist?related=CAM')).d.map((v) => v.id).join() === 'new00000001' && (await call(tok, '/api/watchlist?related=tactics')).d.map((v) => v.id).join() === 'new00000002,old00000001');
t('API: limit is respected', (await call(tok, '/api/watchlist?limit=1')).d.length === 1);
const us = await call(tok, '/api/watchlist/new00000002/useful', {});
t('API: useful toggles for the signed-in member', us.s === 200 && us.d.useful === 1 && us.d.mine === true && (await call(tok, '/api/watchlist')).d[0].mine === true);
t('API: unknown video → 404', (await call(tok, '/api/watchlist/nope0000001/useful', {})).s === 404);
t('topics list is the contract’s five', TOPICS.join() === 'builds,tactics,tips,meta,news');
setFlags({ watchlist: 'owner' });
t('API: hidden while the flag is owner-only for a member', (await call(tok, '/api/watchlist')).s === 404);
done();
