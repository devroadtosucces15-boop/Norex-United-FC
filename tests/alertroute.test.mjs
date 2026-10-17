// Alerts channel (bot/alertroute.js): new site posts + live streams also post to one fixed channel, behind flag `alertRoute`.
import { env, call, login, sqlite, KV } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { plainText } from '../bot/ui.js';
import { updateLive } from '../bot/live.js';

env.DISCORD_BOT_TOKEN = 'bot'; env.DISCORD_GUILD_ID = '9';
const SITE = env.SITE_URL.replace(/\/?$/, '/');
const CH = '1560827976348602429';
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const meta = (k) => sqlite.prepare('SELECT value FROM meta WHERE key = ?').get(k)?.value;
const sent = []; let air = false;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), m = u.match(/\/channels\/(\w+)\/messages$/);
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: '5550001', recipient: JSON.parse(init.body).recipient_id });
  if (m) { sent.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: 'm1' }); }
  if (u.startsWith('https://www.twitch.tv/')) return new Response(air ? '<meta name="description" content="Night | Streaming FC for 3 viewers."/>"isLiveBroadcast":true' : '<html></html>');
  if (u.startsWith('https://www.youtube.com/')) return new Response('<html></html>');
  return realFetch(url, init);
};
env.STREAMS = JSON.stringify({ twitch: 'https://www.twitch.tv/norexunitedfc' });
const owner = await login('111', [], 'Boss');
const m1 = await login('500', [], 'Player One');
setFlags({ feed: 'members', liveAnnounce: 'owner' });
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('announce_channel', '42420') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
const post = (text) => call(m1, '/api/feed/post', { text, tag: 'highlight' });

// ---------- flag off (shipped state): nothing goes to the channel ----------
t('config ships with alertRoute off', JSON.parse((await import('node:fs')).readFileSync(new URL('../config.json', import.meta.url))).features.alertRoute === 'off');
setFlags({ alertRoute: 'off' });
await post('Worldie from the halfway line');
t('flag off → a new post makes no Discord post', sent.length === 0);

// ---------- new site posts ----------
setFlags({ alertRoute: 'owner' });
const p = (await post('Rush tonight @everyone <@123> 9pm')).d.post;
const card = sent.at(-1);
t('post: one card in the alerts channel, linking to the post', sent.length === 1 && card.channel === CH && JSON.stringify(card.components).includes(`${SITE}feed.html#p${p.id}`) && /Player One/.test(plainText(card)) && /Rush tonight/.test(plainText(card)));
t('post: member text cannot ping anyone', JSON.stringify(card.allowed_mentions) === JSON.stringify({ parse: [], users: [] }) || card.allowed_mentions?.parse?.length === 0);
t('alerts channel does not replace the shared announce channel', meta('announce_channel') === '42420');

// ---------- settings: toggles + channel ----------
const s0 = (await call(owner, '/api/bot/settings')).d;
t('settings: default alert channel and both toggles on', s0.alertChannel === CH && s0.autoPosts.posts && s0.autoPosts.live);
t('settings: a members cannot read or change them', (await call(m1, '/api/bot/settings')).s === 403);
t('settings: bad channel id refused', (await call(owner, '/api/bot/settings', { alertChannel: 'abc' })).s === 400);
await call(owner, '/api/bot/settings', { autoPosts: { posts: false } });
await post('Second post');
t('toggle: posts off → no card', sent.length === 1);
await call(owner, '/api/bot/settings', { autoPosts: { posts: true }, alertChannel: '777777' });
await post('Third post');
t('channel is configurable (not hard-coded)', sent.at(-1).channel === '777777' && sent.length === 2);
await call(owner, '/api/bot/settings', { alertChannel: CH });
t('saving other fields keeps the alert channel', (await call(owner, '/api/bot/settings', { emoji: '⚽' })).d.alertChannel === CH);

// ---------- live streams ----------
sent.length = 0;
await KV.delete('live'); await KV.delete('live_announced');
air = false; await updateLive(env); air = true; await updateLive(env);
t('live: club going live posts to the announce channel and the alerts channel', sent.length === 2 && sent.some((x) => x.channel === '42420') && sent.some((x) => x.channel === CH));
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('announce_channel', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(CH);
sent.length = 0; await KV.delete('live'); await KV.delete('live_announced');
air = false; await updateLive(env); air = true; await updateLive(env);
t('live: same channel as announce → posted once, not twice', sent.length === 1 && sent[0].channel === CH);
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('announce_channel', '42420') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();

// ---------- test send goes to the owner only ----------
sent.length = 0;
t('test send: members refused', (await call(m1, '/api/bot/alerts/test', { kind: 'posts' })).s === 403);
const r = await call(owner, '/api/bot/alerts/test', { kind: 'live', channel: '999999', user: '500' });
t('test send: only the owner\'s DM, request channel/recipient ignored', r.s === 200 && sent.length === 1 && sent[0].channel === '5550001' && r.d.active === true && /Test alert/.test(plainText(sent[0])));
t('test send: leaves the announce channel alone', meta('announce_channel') === '42420');

globalThis.fetch = realFetch;
done();
