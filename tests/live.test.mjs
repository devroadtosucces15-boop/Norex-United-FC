// Live stream detection (P1.3): page parsers, cron update → KV, GET /api/live behind the liveBanner flag.
import { call, env, KV, login, W, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';
import { parseTwitch, parseYouTube, streams, updateLive } from '../bot/live.js';
import { plainText } from '../bot/ui.js';

env.STREAMS = JSON.stringify({ youtube: 'https://www.youtube.com/@NorexUnitedFC', twitch: 'https://www.twitch.tv/norexunitedfc' });
const S = streams(env);
t('channels parsed from STREAMS', S.twitch === 'norexunitedfc' && S.youtube === '@NorexUnitedFC');
t('bad STREAMS → no channels', streams({ STREAMS: '{"twitch":"https://evil.com/x"}' }).twitch === null);

const TW_LIVE = '<meta name="description" content="Rush night &amp; trials | Streaming EA SPORTS FC 27 for 12 viewers."><script type="application/ld+json">[{"@type":"VideoObject","publication":{"isLiveBroadcast":true}}]</script>';
const YT_LIVE = '<meta name="title" content="NOREX vs <everyone>"><link rel="canonical" href="https://www.youtube.com/watch?v=abcDEF12345">..."isLiveNow":true...';
const YT_UPCOMING = '<link rel="canonical" href="https://www.youtube.com/watch?v=abcDEF12345">..."isLiveNow":false...';
t('twitch live page detected with title', parseTwitch(TW_LIVE).live && parseTwitch(TW_LIVE).title === 'Rush night & trials');
t('twitch offline page', !parseTwitch('<html>offline</html>').live);
t('youtube live page → video id', parseYouTube(YT_LIVE).videoId === 'abcDEF12345');
t('youtube upcoming stream is not live', !parseYouTube(YT_UPCOMING).live);

// Cron: intercept the two channel pages.
let pages = { tw: '<html></html>', yt: '<html></html>' };
const realFetch = globalThis.fetch;
let hits = 0;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith('https://www.twitch.tv/')) { hits++; return new Response(pages.tw); }
  if (u.startsWith('https://www.youtube.com/@NorexUnitedFC/live')) { hits++; return new Response(pages.yt); }
  return realFetch(url, init);
};
await updateLive(env);
t('cron: offline stored', hits === 2 && (await KV.get('live', 'json')).live === false);
pages.yt = YT_LIVE;
await updateLive(env);
const yt = await KV.get('live', 'json');
t('cron: youtube live stored', yt.live && yt.platform === 'youtube' && yt.videoId === 'abcDEF12345' && yt.since > 0);
pages.tw = TW_LIVE;
await updateLive(env);
t('cron: twitch wins when both are live', (await KV.get('live', 'json')).platform === 'twitch');
pages.tw = '<html></html>';
globalThis.fetch = async (url, init) => (String(url).includes('youtube.com') ? Promise.reject(new Error('down')) : String(url).startsWith('https://www.twitch.tv/') ? new Response(pages.tw) : realFetch(url, init));
await updateLive(env);
t('cron: a failing channel does not crash, status goes offline', (await KV.get('live', 'json')).live === false);
globalThis.fetch = realFetch;
// ---------- E2: Discord post when the club goes live (flag liveAnnounce) ----------
env.DISCORD_BOT_TOKEN = 'bot'; env.DISCORD_GUILD_ID = '9'; const SITE0 = env.SITE_URL; env.SITE_URL = 'https://norex.test/';
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('announce_channel', '42420') ON CONFLICT (key) DO UPDATE SET value = excluded.value").run();
const posts = [];
let air = false;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m) { posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: 'm1' }); }
  if (u.startsWith('https://www.twitch.tv/')) return new Response(air ? TW_LIVE : '<html></html>');
  if (u.startsWith('https://www.youtube.com/')) return new Response('<html></html>');
  return realFetch(url, init);
};
const setFlag = (v) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), liveAnnounce: v }); };
await KV.delete('live'); await KV.delete('live_announced');
setFlag('off'); air = true; await updateLive(env);
t('announce: flag off → no post', posts.length === 0);
await KV.delete('live'); await KV.delete('live_announced');
setFlag('owner'); air = false; await updateLive(env); air = true; await updateLive(env);
t('announce: off → on posts once, linking to watch.html', posts.length === 1 && posts[0].channel === '42420' && JSON.stringify(posts[0].components).includes('https://norex.test/watch.html') && /is live/.test(plainText(posts[0])));
await updateLive(env);
t('announce: still live → not posted again', posts.length === 1);
air = false; await updateLive(env); air = true; await updateLive(env);
t('announce: a blip within 3 hours is not announced twice', posts.length === 1);
await KV.put('live_announced', JSON.stringify({ at: Date.now() - 4 * 3600e3 }));
air = false; await updateLive(env); air = true; await updateLive(env);
t('announce: a stream 4 hours later is announced again', posts.length === 2);
globalThis.fetch = realFetch; env.SITE_URL = SITE0; setFlag('owner');
await KV.put('live', JSON.stringify({ live: true, platform: 'youtube', videoId: 'abcDEF12345', url: 'https://www.youtube.com/watch?v=abcDEF12345', title: 'x' }));

// Route: flag 'liveBanner' decides who may see it.
const flag = JSON.parse(env.FEATURES).liveBanner;
const owner = await login('111');
const member = await login('500');
const guest = await W('/api/live');
const own = await call(owner, '/api/live');
t(`guest GET /api/live → ${flag === 'public' ? 200 : 404} (flag ${flag})`, guest.status === (flag === 'public' ? 200 : 404));
t('owner sees live status + channels', own.s === 200 && own.d.live && own.d.channels.twitch === 'https://www.twitch.tv/norexunitedfc');
t(`member ${['members', 'public'].includes(flag) ? 'sees' : 'does not see'} it`, (await call(member, '/api/live')).s === (['members', 'public'].includes(flag) ? 200 : 404));
done();
