// /streamalerts (bot/streamalerts.js): owner sets up stream + post alerts per source; each thing is announced once.
import { env, sqlite } from './mock.mjs';
import worker from '../bot/worker.js';
import { t, tt, done } from './lib.mjs';
import { plainText } from '../bot/ui.js';
import { parseLink, streamAlertsCron } from '../bot/streamalerts.js';
import { updateLive } from '../bot/live.js';

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
const as = (id, name) => ({ member: { user: { id, username: name }, roles: [] }, channel_id: 'c1', token: 'tok' });
const sa = (who, sub, o = {}) => send({ type: 2, ...who, data: { name: 'streamalerts', options: [{ type: 1, name: sub, options: Object.entries(o).map(([name, value]) => ({ name, value })) }] } });
const owner = as('111', 'Boss'), member = as('500', 'Player');

const posts = []; let twitchLive = false, ytLive = false, feed = [];
const realFetch = globalThis.fetch;
const entry = (id, title, ts) => `<entry><yt:videoId>${id}</yt:videoId><title>${title}</title><published>${new Date(ts).toISOString()}</published><author><name>Jez</name></author></entry>`;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m) { posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: 'm1' }); }
  if (u.startsWith('https://www.twitch.tv/')) return new Response(twitchLive ? '<meta name="description" content="Rush night | Streaming FC for 3 viewers."/>"isLiveBroadcast":true' : '<html></html>');
  if (u.endsWith('/live')) return new Response(ytLive ? '<link rel="canonical" href="https://www.youtube.com/watch?v=abcdefghijk">"isLiveNow":true<meta name="title" content="Grind">' : '<html></html>');
  if (u.startsWith('https://www.youtube.com/@')) return new Response('<html>"channelId":"UCaaaaaaaaaaaaaaaaaaaaaa"</html>');
  if (u.includes('/feeds/videos.xml')) return new Response(`<feed>${feed.join('')}</feed>`);
  if (u.includes('/shorts/')) return new Response('', { status: u.includes('SHORT') ? 200 : 303 });
  return realFetch(url, init);
};

// ---------- links ----------
t('link: twitch, kick, youtube @handle and /channel/UC… parse', parseLink('https://www.twitch.tv/NorexFC/videos')?.handle === 'norexfc' && parseLink('kick.com/jez')?.platform === 'kick'
  && parseLink('https://www.youtube.com/@NorexUnited')?.handle === '@NorexUnited' && parseLink('https://youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa')?.platform === 'youtube');
t('link: other sites and junk are refused', parseLink('https://evil.com/x') === null && parseLink('twitch.tv/a') === null && parseLink('') === null);

// ---------- command: owner only ----------
t('config has streamAlerts at owner level (never public)', JSON.parse((await import('node:fs')).readFileSync(new URL('../config.json', import.meta.url))).features.streamAlerts === 'owner');
setFlags({ streamAlerts: 'off' }); // set-up works while the alerts are off
await tt('members are refused', async () => /Owner only/.test(plainText((await sa(member, 'add', { source: 'main', link: 'twitch.tv/norexfc', channel: '777777' })).d.data)));
await tt('bad link → friendly refusal', async () => /can’t read that link/.test(plainText((await sa(owner, 'add', { source: 'main', link: 'https://evil.com/x', channel: '777777' })).d.data)));
await tt('add main twitch (live) + contributor youtube (both)', async () => {
  const a = await sa(owner, 'add', { source: 'main', link: 'https://www.twitch.tv/norexfc', channel: '777777' });
  const b = await sa(owner, 'add', { source: 'contributor', link: 'https://www.youtube.com/@Jez', channel: '888888', member: '500', name: 'Jez' });
  return /Watching NOREX/.test(plainText(a.d.data)) && /Watching Jez/.test(plainText(b.d.data)) && /switched off/.test(plainText(a.d.data))
    && sqlite.prepare('SELECT COUNT(*) AS n FROM stream_sources WHERE active = 1').get().n === 2;
});
await tt('twitch posts are not available: said so, live only', async () => {
  const r = await sa(owner, 'add', { source: 'contributor', link: 'kick.com/bashk', channel: '888888', what: 'posts' });
  return /Nothing to watch/.test(plainText(r.d.data));
});
await tt('list shows both with ids and channels', async () => { const r = plainText((await sa(owner, 'list')).d.data); return /#1/.test(r) && /<#777777>/.test(r) && /<#888888>/.test(r); });
await tt('test shows the card privately, nothing posted', async () => { const n = posts.length; const r = (await sa(owner, 'test', { id: 1 })).d; return (r.data.flags & 64) === 64 && /Test alert/.test(plainText(r.data)) && posts.length === n; });

// ---------- cron: flag off posts nothing ----------
setFlags({ streamAlerts: 'off' });
const NOW = Date.now();
twitchLive = true;
await streamAlertsCron(env, NOW, globalThis.fetch);
t('flag off → nothing posts', posts.length === 0);

// ---------- live: once ----------
const T = NOW + 5 * 3600e3;
feed = [entry('old00000001', 'Old upload', T - 10 * 864e5), entry('new00000001', 'Fresh build guide', NOW - 3600e3)]; // there before the source was added
setFlags({ streamAlerts: 'owner', liveAnnounce: 'owner' });
const r1 = await streamAlertsCron(env, NOW, globalThis.fetch);
const live = posts.filter((p) => p.channel === '777777');
t('live: one card in the chosen channel with the site link', r1.live === 1 && live.length === 1 && /is live/.test(plainText(live[0])) && JSON.stringify(live[0].components).includes('watch.html'));
await streamAlertsCron(env, NOW + 600e3, globalThis.fetch); await streamAlertsCron(env, NOW + 1200e3, globalThis.fetch);
t('live: still on air over several runs → still one post', posts.filter((p) => p.channel === '777777').length === 1);
t('shared announce channel untouched', sqlite.prepare("SELECT value FROM meta WHERE key = 'announce_channel'").get()?.value !== '777777');
twitchLive = false; await streamAlertsCron(env, NOW + 1800e3, globalThis.fetch); twitchLive = true; await streamAlertsCron(env, NOW + 2400e3, globalThis.fetch);
t('live: a blip within 3 hours is not announced again', posts.filter((p) => p.channel === '777777').length === 1);
twitchLive = false; await streamAlertsCron(env, NOW + 4 * 3600e3, globalThis.fetch); twitchLive = true; await streamAlertsCron(env, NOW + 4 * 3600e3 + 600e3, globalThis.fetch);
t('live: a stream hours later is a new post', posts.filter((p) => p.channel === '777777').length === 2);

// ---------- posts: seeded, then once each ----------
t('posts: first read remembered the existing uploads and posted none', posts.filter((p) => p.channel === '888888').length === 0);
posts.length = 0;
feed.push(entry('SHORT000001', 'Top bins #shorts', T + 60e3), entry('vid00000002', 'New video', T + 120e3));
await streamAlertsCron(env, T + 600e3, globalThis.fetch); await streamAlertsCron(env, T + 1200e3, globalThis.fetch); await streamAlertsCron(env, T + 1800e3, globalThis.fetch);
const vids = posts.filter((p) => p.channel === '888888');
t('posts: new video and new Short, each exactly once, in the contributor channel', vids.length === 2 && vids.some((p) => /New short/i.test(plainText(p))) && vids.some((p) => /New video/i.test(plainText(p))) && vids.every((p) => /Jez/.test(plainText(p))));
t('posts: card shows the thumbnail and a Watch button', JSON.stringify(vids[0].components).includes('i.ytimg.com') && /youtube\.com\/(watch|shorts)/.test(JSON.stringify(vids[0].components)));
t('posts: members mention nobody', vids.every((p) => !/<@/.test(plainText(p))));

// ---------- replaces the old live posts ----------
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('announce_channel', '42420') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
env.STREAMS = JSON.stringify({ twitch: 'https://www.twitch.tv/norexunitedfc' });
const kv = env.NOREX_KV; await kv.delete('live'); await kv.delete('live_announced');
posts.length = 0; twitchLive = false; await updateLive(env); twitchLive = true; await updateLive(env);
t('flag on: the old club live post to the announce channel stops', posts.length === 0);
setFlags({ streamAlerts: 'off' });
await kv.delete('live'); await kv.delete('live_announced');
twitchLive = false; await updateLive(env); twitchLive = true; await updateLive(env);
t('flag off: the old live post still works', posts.some((p) => p.channel === '42420'));

globalThis.fetch = realFetch;
done();
