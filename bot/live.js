// Live stream detection (roadmap P1.3). The cron checks the club's Twitch and YouTube channels every 10 minutes
// and keeps the result in KV (`live`); the site polls GET /api/live and shows a "🔴 LIVE" bar + embed.
// Free and credential-free: we read the public channel pages. If TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET are
// ever set as Worker secrets, Twitch is asked through its official Helix API instead.
//
// Env: STREAMS – JSON { twitch: url, youtube: url } copied from config.json → streams by bot.yml.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const OFF = { live: false };

export function streams(env) {
  let s = {};
  try { s = JSON.parse(env.STREAMS || '{}'); } catch { console.log('STREAMS is not valid JSON'); }
  const twitch = String(s.twitch || '').match(/twitch\.tv\/([A-Za-z0-9_]{3,25})/)?.[1] ?? null;
  const youtube = String(s.youtube || '').match(/youtube\.com\/(@[A-Za-z0-9._-]{3,30}|channel\/UC[A-Za-z0-9_-]{22})/)?.[1] ?? null;
  return { twitch, youtube, twitchUrl: twitch && `https://www.twitch.tv/${twitch}`, youtubeUrl: youtube && `https://www.youtube.com/${youtube}` };
}

// ---------- page parsers (exported for tests) ----------
// Twitch puts schema.org VideoObject data with "isLiveBroadcast":true into the channel page while live.
export function parseTwitch(html) {
  if (!/"isLiveBroadcast"\s*:\s*true/.test(html)) return OFF;
  // "<stream title> | Streaming <game> for 133 viewers." (attribute order varies)
  const desc = html.match(/<meta name="description" content="([^"]{1,300})"/)?.[1] ?? html.match(/<meta content="([^"]{1,300})" property="og:description"/)?.[1] ?? '';
  return { live: true, title: decode(desc.replace(/\s*\|[^|]*\bviewers?\.?\s*$/, '')) };
}
// youtube.com/@handle/live resolves to the current broadcast; "isLiveNow":true only while it is on air
// (an upcoming/scheduled stream has it false).
export function parseYouTube(html) {
  if (!/"isLiveNow"\s*:\s*true/.test(html)) return OFF;
  const id = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/)?.[1]
    ?? html.match(/"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/)?.[1];
  if (!id) return OFF;
  const title = html.match(/<meta name="title" content="([^"]{1,200})"/)?.[1] ?? '';
  return { live: true, videoId: id, title: decode(title) };
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').slice(0, 140);

async function page(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-GB,en;q=0.9', Cookie: 'CONSENT=YES+1; SOCS=CAI' }, redirect: 'follow' });
  return r.ok ? r.text() : '';
}

async function twitchHelix(env, login) {
  const t = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET, grant_type: 'client_credentials' }),
  }).then((r) => r.json());
  const d = await fetch(`https://api.twitch.tv/helix/streams?user_login=${login}`, { headers: { 'Client-Id': env.TWITCH_CLIENT_ID, Authorization: `Bearer ${t.access_token}` } }).then((r) => r.json());
  const s = d.data?.[0];
  return s?.type === 'live' ? { live: true, title: decode(String(s.title || '')) } : OFF;
}

// One check of every channel → the status document stored in KV.
export async function checkLive(env) {
  const S = streams(env);
  const tries = [];
  if (S.twitch) tries.push((env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET ? twitchHelix(env, S.twitch) : page(S.twitchUrl).then(parseTwitch))
    .then((r) => r.live && { live: true, platform: 'twitch', channel: S.twitch, url: S.twitchUrl, title: r.title }));
  if (S.youtube) tries.push(page(`${S.youtubeUrl}/live`).then(parseYouTube)
    .then((r) => r.live && { live: true, platform: 'youtube', videoId: r.videoId, url: `https://www.youtube.com/watch?v=${r.videoId}`, title: r.title }));
  const found = (await Promise.allSettled(tries)).map((x) => (x.status === 'fulfilled' ? x.value : (console.log('live check failed', x.reason?.message), null))).filter(Boolean);
  // Twitch first if both are on air – the site shows one stream.
  return found.sort((a, b) => (a.platform === 'twitch' ? -1 : 1) - (b.platform === 'twitch' ? -1 : 1))[0] ?? { live: false };
}

// Cron step: check, and write to KV only when something changed (KV free tier = 1,000 writes/day).
export async function updateLive(env) {
  if (!env.NOREX_KV) return null;
  const now = await checkLive(env);
  const prev = await env.NOREX_KV.get('live', 'json');
  const same = prev && prev.live === now.live && prev.platform === now.platform && prev.videoId === now.videoId && prev.title === now.title;
  if (!same) await env.NOREX_KV.put('live', JSON.stringify({ ...now, since: now.live ? (prev?.live && prev.platform === now.platform ? prev.since : Date.now()) : null, at: Date.now() }));
  return now;
}

export async function getLive(env) {
  const S = streams(env);
  const cur = (await env.NOREX_KV?.get('live', 'json')) ?? { live: false };
  return { ...cur, channels: { twitch: S.twitchUrl, youtube: S.youtubeUrl } };
}
