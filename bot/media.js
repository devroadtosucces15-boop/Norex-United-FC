// Photos and clips for the club feed (roadmap P6.1b) – Cloudflare R2 bucket `norex-media` (binding MEDIA), with the
// storage guard from R0.4 that keeps the club inside R2's free 10 GB (R2 has no size cap of its own):
//   POST /api/feed/upload?name=&w=&h=  raw file body, Content-Type = MIME     members: one photo/clip → { media } (attach it with the post)
//   POST /api/feed/unupload    { key }                                        uploader: drop a file that isn't in a post yet
//   GET  /api/feed/storage                                                    owner: used vs. limits, biggest files, what goes next
//   POST /api/feed/media/delete { key }                                       owner: delete one file now (post keeps a placeholder)
//   GET  /media/<key>                                                         anyone with the link – keys are random; Range for video
// Guard (hourly, from the 10-minute cron): drops uploads that never made it into a post (after a day) and files older than
// 365 days (the bucket's lifecycle rule does the same as a backstop), then totals the bucket; above GUARD_HIGH it deletes
// the oldest files until it is under GUARD_LOW – their posts show "clip expired" – and tells the owner.
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';

export const MB = 1e6, GB = 1e9;
export const IMAGE_MAX = 10 * MB;
export const VIDEO_MAX = 100 * MB;
export const UPLOADS_DAY = 5;
export const PER_POST = 4; // photos per post (or one clip)
export const FREE = 10 * GB;
export const GUARD_HIGH = 9 * GB;
export const GUARD_LOW = 8 * GB;
export const REFUSE_AT = 9.5 * GB;
export const MAX_AGE = 365 * 86400e3;
const DAY = 86400e3;
const HOUR = 3600e3;
export const TYPES = {
  'image/jpeg': ['image', 'jpg'], 'image/png': ['image', 'png'], 'image/webp': ['image', 'webp'], 'image/gif': ['image', 'gif'],
  'video/mp4': ['video', 'mp4'], 'video/webm': ['video', 'webm'], 'video/quicktime': ['video', 'mov'],
};
const KEY = /^(?:[iv]|card)\/[0-9a-f]{32}\.(jpg|png|webp|gif|mp4|webm|mov)$/;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;
export const mb = (n) => (!n ? '0 MB' : n >= GB ? `${(n / GB).toFixed(2)} GB` : `${Math.max(0.1, n / MB).toFixed(n < 10 * MB ? 1 : 0)} MB`);
export const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const dim = (v) => { const n = Math.round(Number(v)); return n > 0 && n <= 20000 ? n : null; };
const getMeta = async (env, k) => { const r = await one(env, 'SELECT value FROM meta WHERE key = ?', k); try { return r ? JSON.parse(r.value) : null; } catch { return null; } };
const setMeta = (env, k, v) => run(env, 'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', k, JSON.stringify(v));

// First bytes of each allowed type – a file has to be what its Content-Type says.
export function sniff(b, type) {
  const at = (i, ...xs) => xs.every((x, j) => b[i + j] === x);
  const str = (i, s) => at(i, ...[...s].map((c) => c.charCodeAt(0)));
  if (type === 'image/jpeg') return at(0, 0xff, 0xd8, 0xff);
  if (type === 'image/png') return at(0, 0x89, 0x50, 0x4e, 0x47);
  if (type === 'image/gif') return str(0, 'GIF8');
  if (type === 'image/webp') return str(0, 'RIFF') && str(8, 'WEBP');
  if (type === 'video/webm') return at(0, 0x1a, 0x45, 0xdf, 0xa3);
  return ['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip'].some((s) => str(4, s)); // mp4 / mov
}
// Streams the upload through a check (type sniff on the first bytes, never more than the declared length) into R2.
// R2 needs to know a stream's length up front – FixedLengthStream does that on Workers (tests run without it).
function checked(body, len, type) {
  let seen = 0, head = new Uint8Array(0), ok = false;
  const check = new TransformStream({
    transform(chunk, c) {
      seen += chunk.byteLength;
      if (seen > len) return c.error(new Error('size'));
      if (!ok) {
        const h = new Uint8Array(Math.min(16, head.length + chunk.byteLength));
        h.set(head.subarray(0, h.length)); h.set(chunk.subarray(0, h.length - head.length), head.length);
        head = h;
        if (head.length >= 12 || seen === len) { if (!sniff(head, type)) return c.error(new Error('type')); ok = true; }
      }
      c.enqueue(chunk);
    },
    flush(c) { if (seen !== len) c.error(new Error('size')); },
  });
  const out = body.pipeThrough(check);
  return typeof FixedLengthStream === 'function' ? out.pipeThrough(new FixedLengthStream(len)) : out;
}

// Bytes in use: what D1 knows about, or the last bucket total if that is higher (files D1 doesn't know about).
export async function usedBytes(env) {
  const r = await one(env, 'SELECT COALESCE(SUM(size), 0) AS n FROM media WHERE gone = 0');
  const b = await getMeta(env, 'media_bucket');
  return Math.max(Number(r.n) || 0, b?.bytes ?? 0);
}
// Deletes files from R2 (up to 1000 per call) and marks their rows gone.
export async function dropMedia(env, keys, gone) {
  keys = [...new Set(keys)].filter((k) => KEY.test(k));
  if (!keys.length) return 0;
  for (let i = 0; i < keys.length; i += 500) {
    const part = keys.slice(i, i + 500);
    if (env.MEDIA) await env.MEDIA.delete(part);
    await run(env, `UPDATE media SET gone = ?, gone_at = ? WHERE key IN (${marks(part.length)}) AND gone = 0`, gone, Date.now(), ...part);
  }
  return keys.length;
}

const view = (r) => (r.gone ? { kind: r.kind, gone: r.gone === 1 ? 'expired' : 'removed' } : { key: r.key, kind: r.kind, type: r.type, size: r.size, w: opt(r.w), h: opt(r.h) });
// post id → [media] for the feed's post list.
export async function mediaFor(env, postIds) {
  if (!postIds.length) return {};
  const rows = await all(env, `SELECT * FROM media WHERE post_id IN (${marks(postIds.length)}) ORDER BY at, key`, ...postIds);
  const out = {};
  for (const r of rows) (out[r.post_id] ??= []).push(view(r));
  return out;
}
// Checks the keys a new post wants to use: the poster's own, uploaded, not in another post; max PER_POST photos or one clip.
export async function checkAttach(env, me, keys) {
  if (keys == null) return { keys: [] };
  if (!Array.isArray(keys) || keys.length > PER_POST) return { error: `Up to ${PER_POST} photos or one clip per post.` };
  keys = [...new Set(keys.map(String))];
  if (!keys.length) return { keys };
  if (keys.some((k) => !KEY.test(k))) return { error: 'That upload is gone – add the file again.' };
  const rows = await all(env, `SELECT key, kind FROM media WHERE key IN (${marks(keys.length)}) AND user_id = ? AND post_id IS NULL AND gone = 0`, ...keys, me.u);
  if (rows.length !== keys.length) return { error: 'One of the uploads is gone – add the file again.' };
  if (rows.some((r) => r.kind === 'video') && rows.length > 1) return { error: 'A clip goes in a post on its own – post the photos separately.' };
  return { keys };
}
export async function attach(env, me, postId, keys) {
  if (!keys.length) return;
  await run(env, `UPDATE media SET post_id = ? WHERE key IN (${marks(keys.length)}) AND user_id = ? AND post_id IS NULL AND gone = 0`, postId, ...keys, me.u);
  await run(env, 'UPDATE posts SET media = ? WHERE id = ?', JSON.stringify(keys), postId);
}
export const postMediaKeys = async (env, postId) => (await all(env, 'SELECT key FROM media WHERE post_id = ? AND gone = 0', postId)).map((r) => r.key);

async function upload(request, me, env, url) {
  if (!can(me, 'feed.post')) return fail('Members only.', 403);
  if (!env.MEDIA) return fail('Photo and clip uploads aren’t switched on yet – paste a YouTube, Twitch or Streamable link instead.', 503);
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const t = TYPES[type];
  if (!t) return fail('Photos (JPG, PNG, WebP, GIF) and clips (MP4, WebM, MOV) only.', 415);
  const len = Number(request.headers.get('Content-Length')) || 0;
  if (!len || !request.body) return fail('That file is empty.', 411);
  const max = t[0] === 'video' ? VIDEO_MAX : IMAGE_MAX;
  if (len > max) return fail(`${t[0] === 'video' ? 'Clips' : 'Photos'} can be up to ${mb(max)} – this one is ${mb(len)}. Trim it or post a YouTube/Streamable link.`, 413);
  if ((await usedBytes(env)) + len >= REFUSE_AT) {
    return fail('Club storage is nearly full, so uploads are paused until old clips are cleared. Paste a YouTube or Streamable link instead.', 507);
  }
  const key = `${t[0][0]}/${hex(16)}.${t[1]}`;
  const name = String(url.searchParams.get('name') ?? '').replace(/[\u0000-\u001f<>"]/g, '').trim().slice(0, 80) || null;
  // Reserve the row first – the daily limit sits inside the INSERT so parallel uploads can't slip past it.
  const now = Date.now();
  const ins = await run(env, `INSERT INTO media (key, user_id, kind, type, size, name, w, h, at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE (SELECT COUNT(*) FROM media WHERE user_id = ? AND at > ?) < ?`,
  key, me.u, t[0], type, len, name, dim(url.searchParams.get('w')), dim(url.searchParams.get('h')), now, me.u, now - DAY, UPLOADS_DAY);
  if (!ins.meta?.changes) return fail(`That’s ${UPLOADS_DAY} uploads today – more tomorrow (links to YouTube/Streamable don’t count).`, 429);
  try {
    await env.MEDIA.put(key, checked(request.body, len, type), {
      httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { user: me.u },
    });
  } catch (e) {
    await run(env, 'UPDATE media SET gone = 3, gone_at = ? WHERE key = ?', Date.now(), key);
    return fail(e.message === 'type' ? 'That file doesn’t look like a real photo or clip.' : 'The upload didn’t finish – try again.', e.message === 'type' ? 415 : 400);
  }
  const left = UPLOADS_DAY - (await one(env, 'SELECT COUNT(*) AS n FROM media WHERE user_id = ? AND at > ?', me.u, now - DAY)).n;
  return json({ media: view(await one(env, 'SELECT * FROM media WHERE key = ?', key)), left: Math.max(0, left) });
}

// Owner dashboard: used vs. the free 10 GB, per kind, biggest files, oldest files (= deleted first when the guard runs).
async function storage(env) {
  const live = "SELECT m.key, m.kind, m.size, m.at, m.post_id, m.name, u.name AS u_name FROM media m LEFT JOIN users u ON u.id = m.user_id WHERE m.gone = 0 AND m.post_id IS NOT NULL";
  const row = (r) => ({ key: r.key, kind: r.kind, size: r.size, at: r.at, post: r.post_id, name: opt(r.name), by: r.u_name ?? 'Member' });
  const [kinds, biggest, oldest, bucket, guard, gone] = await Promise.all([
    all(env, 'SELECT kind, COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM media WHERE gone = 0 GROUP BY kind'),
    all(env, `${live} ORDER BY m.size DESC LIMIT 8`),
    all(env, `${live} ORDER BY m.at LIMIT 8`),
    getMeta(env, 'media_bucket'),
    getMeta(env, 'media_guard'),
    one(env, 'SELECT COUNT(*) AS n FROM media WHERE gone = 1 AND gone_at > ?', Date.now() - 30 * DAY),
  ]);
  const byKind = Object.fromEntries(kinds.map((k) => [k.kind, { n: k.n, bytes: k.bytes }]));
  return {
    on: !!env.MEDIA, used: await usedBytes(env), byKind, biggest: biggest.map(row), next: oldest.map(row), bucket: bucket ?? null, guard: guard ?? null,
    expired30: gone.n, limits: { free: FREE, high: GUARD_HIGH, low: GUARD_LOW, refuse: REFUSE_AT, image: IMAGE_MAX, video: VIDEO_MAX, perDay: UPLOADS_DAY, maxAgeDays: MAX_AGE / DAY },
  };
}

// Routes that need the raw request (the upload body) go through here before handleMembers parses JSON.
export async function mediaUploadRoute(request, me, env, url) {
  if (!flagOn(env, me, 'feed')) return fail('Not available yet.', 404);
  return upload(request, me, env, url);
}
export async function mediaRoute(p, method, body, me, env, log) {
  if (p === '/api/feed/unupload' && method === 'POST') {
    const r = await one(env, 'SELECT key FROM media WHERE key = ? AND user_id = ? AND post_id IS NULL AND gone = 0', String(body.key ?? ''), me.u);
    if (r) await dropMedia(env, [r.key], 3);
    return json({ ok: true });
  }
  if (p === '/api/feed/storage' && method === 'GET') {
    if (!can(me, 'media.storage')) return fail('Owner only.', 403);
    return json(await storage(env));
  }
  if (p === '/api/feed/media/delete' && method === 'POST') {
    if (!can(me, 'media.storage')) return fail('Owner only.', 403);
    const r = await one(env, 'SELECT key, size, post_id FROM media WHERE key = ? AND gone = 0', String(body.key ?? ''));
    if (!r) return fail('That file is already gone.', 404);
    await dropMedia(env, [r.key], 2);
    await log(env, me, 'media-delete', `${mb(r.size)}${r.post_id ? ` from post #${r.post_id}` : ''}`);
    return json(await storage(env));
  }
  return null;
}

// GET /media/<key> – straight from R2. Types come from our whitelist and nosniff + a sandbox CSP stop a file being
// run as a page if someone opens it directly. Video players get byte ranges.
export async function serveMedia(request, env, key) {
  if (!env.MEDIA || !KEY.test(key) || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
  const ranged = request.headers.has('Range');
  const obj = await env.MEDIA.get(key, { range: ranged ? request.headers : undefined, onlyIf: request.headers });
  if (!obj) return new Response('This clip has expired.', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  const type = Object.keys(TYPES).find((t) => t === h.get('Content-Type')) ?? 'application/octet-stream';
  h.set('Content-Type', type);
  h.set('ETag', obj.httpEtag);
  h.set('Accept-Ranges', 'bytes');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Content-Security-Policy', "default-src 'none'; sandbox");
  h.set('Cross-Origin-Resource-Policy', 'cross-origin');
  h.set('Access-Control-Allow-Origin', '*'); // keys are random + content is public anyway – lets canvas compositing (P11.5) read it cross-origin
  h.set('Cache-Control', 'public, max-age=31536000, immutable');
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers: h });
  if (ranged && obj.range) {
    const r = obj.range;
    const offset = r.offset ?? (r.suffix != null ? obj.size - r.suffix : 0);
    const length = r.length ?? obj.size - offset;
    h.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    h.set('Content-Length', String(length));
    return new Response(request.method === 'HEAD' ? null : obj.body, { status: 206, headers: h });
  }
  h.set('Content-Length', String(obj.size));
  return new Response(request.method === 'HEAD' ? null : obj.body, { headers: h });
}

// Storage guard – called from every cron run, does its work at most once an hour.
export async function mediaCron(env, now = Date.now()) {
  if (!env.MEDIA || !env.DB) return null;
  const last = await getMeta(env, 'media_guard');
  if (last?.at && now - last.at < HOUR - 5 * 60e3) return null;
  // 1. uploads nobody posted within a day, and anything past the age limit
  const stale = await all(env, 'SELECT key, post_id FROM media WHERE gone = 0 AND ((post_id IS NULL AND at < ?) OR at < ?) LIMIT 1000', now - DAY, now - MAX_AGE);
  await dropMedia(env, stale.filter((r) => r.post_id == null).map((r) => r.key), 3);
  await dropMedia(env, stale.filter((r) => r.post_id != null).map((r) => r.key), 1);
  // 2. the real total, straight from the bucket
  const objects = [];
  let cursor;
  do {
    const page = await env.MEDIA.list({ cursor, limit: 1000 });
    for (const o of page.objects) objects.push({ key: o.key, size: o.size, at: +new Date(o.uploaded) || 0 });
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  let bytes = objects.reduce((s, o) => s + o.size, 0);
  const before = bytes;
  // 3. over the high-water mark → oldest first until under the low one
  const dropped = [];
  if (bytes > GUARD_HIGH) {
    for (const o of objects.sort((a, b) => a.at - b.at)) {
      if (bytes <= GUARD_LOW) break;
      if (o.key.startsWith('play/') || o.key.startsWith('card/') || o.key.startsWith('cardphoto/')) continue; // BE1 playbook documents aren't disposable like feed photos/clips
      dropped.push(o.key); bytes -= o.size;
    }
    if (dropped.length) {
      const strays = dropped.filter((k) => !KEY.test(k)); // files that aren't ours go too
      if (strays.length) await env.MEDIA.delete(strays);
      await dropMedia(env, dropped, 1);
    }
  }
  await setMeta(env, 'media_bucket', { bytes, count: objects.length - dropped.length, at: now });
  const guard = { at: now, before, after: bytes, dropped: dropped.length, stale: stale.length };
  if (dropped.length) guard.lastClean = { at: now, n: dropped.length, freed: before - bytes };
  else if (last?.lastClean) guard.lastClean = last.lastClean;
  await setMeta(env, 'media_guard', guard);
  if (dropped.length) {
    const owners = await all(env, "SELECT id FROM users WHERE role = 'owner'");
    await safely(notify(env, owners.map((o) => o.id), {
      type: 'storage', icon: '💾', title: `Storage guard cleared ${dropped.length} old feed file${dropped.length === 1 ? '' : 's'}`,
      body: `Media storage hit ${mb(before)} (limit ${mb(GUARD_HIGH)}), so the oldest photos and clips were deleted – ${mb(before - bytes)} freed, now ${mb(bytes)} of the free ${mb(FREE)}. Their posts show “clip expired”.`,
      link: 'feed.html#storage',
    }));
  }
  return guard;
}
