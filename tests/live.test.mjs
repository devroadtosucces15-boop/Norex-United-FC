// Live stream detection (P1.3): page parsers, cron update → KV, GET /api/live behind the liveBanner flag.
import { call, env, KV, login, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import { parseTwitch, parseYouTube, streams, updateLive } from '../bot/live.js';

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
