// Member live alerts (bot/memberlive.js): per-member checks, one post per stream, rotation, GET /api/live/members.
import { env, call, login, sqlite } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { plainText } from '../bot/ui.js';
import { liveOf, memberLiveCron } from '../bot/memberlive.js';

env.DISCORD_BOT_TOKEN = 'bot'; env.DISCORD_GUILD_ID = '9';
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const posts = [];
let onAir = {}; // channel → platform currently live
const realFetch = globalThis.fetch;
const fake = async (url, init = {}) => {
  const u = String(url);
  let m;
  if (u.includes('gql.twitch.tv')) return new Response('', { status: 503 }); // falls back to the channel page
  if ((m = u.match(/twitch\.tv\/(\w+)$/))) return new Response(onAir[m[1]] === 'twitch' ? '<html><meta name="description" content="Rush night | Streaming FC 26 for 12 viewers."/>"isLiveBroadcast":true</html>' : '<html>offline</html>');
  if ((m = u.match(/youtube\.com\/(@[\w.-]+)\/live$/))) return new Response(onAir[m[1]] === 'youtube' ? '<link rel="canonical" href="https://www.youtube.com/watch?v=abcdefghijk">"isLiveNow":true<meta name="title" content="Pro Clubs grind">' : '<html>no</html>');
  if ((m = u.match(/kick\.com\/api\/v2\/channels\/(\w+)$/))) return onAir[m[1]] === 'kick' ? Response.json({ livestream: { session_title: 'Kick night' } }) : Response.json({ livestream: null });
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  if ((m = u.match(/\/channels\/(\w+)\/messages$/))) { if (m[1] !== 'dm') posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: 'm1' }); }
  return realFetch(url, init);
};
globalThis.fetch = fake;

// ---------- one member ----------
t('liveOf: Twitch live, with the title', (await liveOf({ twitch: 'jez_tv' }, (u, i) => { onAir = { jez_tv: 'twitch' }; return fake(u, i); }))?.title === 'Rush night');
onAir = { jez_tv: 'twitch', '@jez': 'youtube', jezk: 'kick' };
const both = await liveOf({ twitch: 'jez_tv', youtube: '@jez', kick: 'jezk' }, fake);
t('liveOf: Twitch wins when several are on air', both.platform === 'twitch' && both.url === 'https://www.twitch.tv/jez_tv');
onAir = { '@jez': 'youtube' };
t('liveOf: YouTube gives the watch link', (await liveOf({ twitch: 'jez_tv', youtube: '@jez' }, fake)).url === 'https://www.youtube.com/watch?v=abcdefghijk');
onAir = { jezk: 'kick' };
t('liveOf: Kick from the public channel endpoint', (await liveOf({ kick: 'jezk' }, fake)).title === 'Kick night');
onAir = {};
t('liveOf: nobody on air, or a failing fetch, is "not live"', (await liveOf({ twitch: 'jez_tv', kick: 'jezk' }, fake)) === null && (await liveOf({ twitch: 'x' }, async () => { throw new Error('net'); })) === null);

// ---------- cron ----------
setFlags({ memberLive: 'members', streamAlerts: 'off', alertRoute: 'off' }); // the old post only runs while /streamalerts is off
const a = await login('500', []), b = await login('501', []);
await call(a, '/api/profile', { twitch: 'jez_tv' });
await call(b, '/api/profile', { kick: 'bashk' });
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('announce_channel', '42420') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
const NOW = Date.now();
onAir = { jez_tv: 'twitch' };
const c1 = await memberLiveCron(env, NOW, fake);
await tt('cron: one member on air → stored and one green post with a Watch live button', async () => {
  const panel = posts.at(-1)?.components?.find((c) => c.type === 17);
  return c1.checked === 2 && c1.live === 1 && c1.posted === 1 && posts.length === 1 && posts[0].channel === '42420' && panel.accent_color === 0x4be08a
    && /is live/.test(plainText(posts[0])) && /<@500>/.test(plainText(posts[0])) && JSON.stringify(posts[0].components).includes('https://www.twitch.tv/jez_tv');
});
const c2 = await memberLiveCron(env, NOW + 600e3, fake);
t('cron: the same stream is not announced again', c2.live === 1 && c2.posted === 0 && posts.length === 1 && sqlite.prepare("SELECT since FROM member_live WHERE user_id = '500'").get().since === NOW);
onAir = {};
await memberLiveCron(env, NOW + 1200e3, fake);
t('cron: going offline clears the row', sqlite.prepare('SELECT COUNT(*) AS n FROM member_live').get().n === 0);
onAir = { jez_tv: 'twitch' };
const c4 = await memberLiveCron(env, NOW + 3600e3, fake);
t('cron: a new stream later is announced again', c4.posted === 1 && posts.length === 2);

// ---------- rotation: only a few members per run ----------
for (let n = 0; n < 12; n++) {
  sqlite.prepare("INSERT OR IGNORE INTO users (id, name, role, first_at, last_at) VALUES (?, ?, 'member', 1, 1)").run(`80${n}`, `Extra${n}`);
  sqlite.prepare("INSERT OR IGNORE INTO profiles (user_id, bio, positions, platform, updated, twitch) VALUES (?, '', '[]', '', 1, ?)").run(`80${n}`, `extra_${n}`);
}
const cur = () => Number(sqlite.prepare("SELECT value FROM meta WHERE key = 'memberlive_cursor'").get().value);
const total = sqlite.prepare("SELECT COUNT(*) AS n FROM profiles WHERE twitch != '' OR youtube != '' OR kick != ''").get().n;
const c0 = cur();
const r1 = await memberLiveCron(env, NOW + 7200e3, fake), k1 = cur(), r2 = await memberLiveCron(env, NOW + 7800e3, fake), k2 = cur();
t('rotation: eight per run, the next run carries on where the last stopped', r1.checked === 8 && r2.checked === 8 && k1 === (c0 % total) + 8 && k2 === (k1 % total) + 8 && total === 14);

// ---------- API ----------
onAir = { jez_tv: 'twitch' };
await memberLiveCron(env, Date.now(), fake); await memberLiveCron(env, Date.now(), fake); await memberLiveCron(env, Date.now(), fake);
const api = await call(a, '/api/live/members');
t('API: who is on air now with the contract fields', api.s === 200 && api.d.some((x) => x.user === '500' && x.platform === 'twitch' && x.url === 'https://www.twitch.tv/jez_tv' && typeof x.since === 'number' && x.name));
setFlags({ memberLive: 'owner' });
t('API: hidden while the flag is owner-only for a member', (await call(a, '/api/live/members')).s === 404);
done();
