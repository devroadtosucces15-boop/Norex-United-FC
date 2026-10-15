// Latest videos for the Watch page previews → data/media.json (committed with the other data, read at build time).
// YouTube's RSS feed and Twitch's lists are blocked for browsers (CORS), so they are fetched here instead.
//   node scripts/media.mjs           check if the last check is older than CHECK_MINUTES
//   node scripts/media.mjs --force   check now
// Free, no keys, no npm. A failed source keeps its previous list; a failed run never breaks the site update.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DATA, readJson, writeJson, loadConfig } from './lib.mjs';

const FILE = path.join(DATA, 'media.json');
const STATE = path.join(DATA, 'media-state.json');
const CHECK_MINUTES = 60;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const get = async (url, opt = {}) => { const r = await fetch(url, { ...opt, headers: { 'user-agent': UA, 'accept-language': 'en', cookie: 'CONSENT=YES+1; SOCS=CAI', ...(opt.headers ?? {}) }, signal: AbortSignal.timeout(15000) }); if (!r.ok && !opt.soft) throw new Error(`${url} ${r.status}`); return r; };
const clean = (s) => String(s ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').slice(0, 120);

export function parseFeed(xml) {
  return [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1], title: clean(e.match(/<title>([^<]*)<\/title>/)?.[1]), published: e.match(/<published>([^<]*)<\/published>/)?.[1] ?? '',
  })).filter((v) => v.id);
}

async function youtube(handleUrl) {
  let ch = handleUrl.match(/channel\/(UC[\w-]{22})/)?.[1];
  if (!ch) { const html = await (await get(handleUrl)).text(); ch = html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/)?.[1] ?? html.match(/channel\/(UC[\w-]{22})/)?.[1]; }
  if (!ch) throw new Error('no YouTube channel id');
  const list = parseFeed(await (await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch}`)).text()).slice(0, 8);
  // a Short answers 200 on /shorts/<id>; a normal video redirects away
  await Promise.all(list.map(async (v) => { try { v.short = (await get(`https://www.youtube.com/shorts/${v.id}`, { method: 'HEAD', redirect: 'manual', soft: true })).status === 200; } catch { v.short = false; } }));
  return list;
}

async function twitch(login) {
  const q = `{ user(login: "${login}") {
    clips(first: 8) { edges { node { slug title durationSeconds thumbnailURL(width: 480, height: 272) } } }
    videos(first: 6) { edges { node { id title lengthSeconds previewThumbnailURL(width: 480, height: 272) } } } } }`;
  // twitch.tv's own pages carry the public client id they use for anonymous reads
  const page = await (await get(`https://www.twitch.tv/${login}`)).text(), cid = page.match(/clientId\s*[=:]\s*\\?"(\w{20,})/)?.[1]; if (!cid) throw new Error('Twitch: no client id on the page');
  const r = await (await get('https://gql.twitch.tv/gql', { method: 'POST', headers: { 'client-id': cid, 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) })).json();
  const u = r?.data?.user; if (!u) throw new Error('Twitch: no user in answer');
  const clips = (u.clips?.edges ?? []).map((e) => e.node).filter((n) => n?.slug).map((n) => ({ kind: 'clip', id: n.slug, title: clean(n.title), secs: Math.round(n.durationSeconds || 0), thumb: n.thumbnailURL || '' }));
  const vids = (u.videos?.edges ?? []).map((e) => e.node).filter((n) => n?.id && !/^\d+$/.test(n.previewThumbnailURL ?? '')).map((n) => ({ kind: 'video', id: String(n.id), title: clean(n.title), secs: Math.round(n.lengthSeconds || 0), thumb: (n.previewThumbnailURL || '').replace('%{width}', '480').replace('%{height}', '272') }));
  return [...clips, ...vids];
}

export async function main(force = false) {
  const state = readJson(STATE, {});
  if (!force && state.checked && Date.now() - Date.parse(state.checked) < CHECK_MINUTES * 60000) { console.log('media: checked recently, skipping'); return; }
  const S = loadConfig().streams ?? {}, prev = readJson(FILE, { youtube: [], twitch: [] }), next = { ...prev };
  const tw = String(S.twitch ?? '').match(/twitch\.tv\/([\w]{3,25})/)?.[1];
  if (S.youtube) try { next.youtube = await youtube(S.youtube); console.log(`media: ${next.youtube.length} YouTube videos`); } catch (e) { console.log('media: YouTube failed –', e.message); }
  if (tw) try { next.twitch = await twitch(tw); console.log(`media: ${next.twitch.length} Twitch items`); } catch (e) { console.log('media: Twitch failed –', e.message); }
  if (JSON.stringify(next) !== JSON.stringify(prev) || !fs.existsSync(FILE)) writeJson(FILE, next);
  writeJson(STATE, { checked: new Date().toISOString() });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.includes('--force')).catch((e) => { console.log('media: failed –', e.message); });
