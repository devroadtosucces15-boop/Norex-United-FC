// Tactics Studio recordings (redesign BE1, board 06): a recorded video of a play (tab capture in the studio)
// and voice-over narration. Flag `tactics`, same gate as plays.js.
//   POST /api/plays/:id/media?kind=video|voice   managers: raw body, Content-Type = MIME → { media }   (raw body, read before members.js parses JSON)
//   GET  /api/plays/:id/media                    members who can see the play: list (ready only)
//   GET  /api/plays/:id/media/:mid               members who can see the play: the file (Bearer auth; the page fetches it as a blob)
//   POST /api/plays/:id/media/:mid/delete        managers: hide one recording (row kept, nothing hard-deleted)
// Files are stored in the MEDIA bucket under `play/<id>/m/` – never in the feed's storage guard, so they can't be evicted.
import { can, flagOn } from './roles.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();

export const MEDIA_MAX = { video: 60e6, voice: 10e6 }; // bytes – a 60-second 720p tab capture is well under the video cap
export const MEDIA_PER_PLAY = 6;
const TYPES = {
  'video/webm': ['video', 'webm'], 'video/mp4': ['video', 'mp4'],
  'audio/webm': ['voice', 'webm'], 'audio/mp4': ['voice', 'm4a'],
};
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const mb = (b) => `${Math.round(b / 1e6)} MB`;

// Same visibility rule as getOne() in plays.js: published (or assigned) and not archived; managers see every play.
async function canSee(env, me, id) {
  const r = await one(env, 'SELECT published, archived FROM plays WHERE id = ?', id);
  if (!r || r.archived) return null;
  if (can(me, 'plays.manage')) return r;
  if (!r.published) return null;
  return r;
}
const view = (r) => ({ id: r.id, kind: r.kind, type: r.type, size: r.size, at: r.created_at });

export async function playMediaUpload(request, me, env, url, id, log) {
  if (!flagOn(env, me, 'tactics')) return fail('Not available yet.', 404);
  if (!can(me, 'plays.manage')) return fail('Managers only.', 403);
  if (!env.MEDIA) return fail('Recordings need the R2 bucket, which isn’t switched on yet.', 503);
  if (!(await one(env, 'SELECT id FROM plays WHERE id = ? AND archived = 0', id))) return fail('Play not found.', 404);
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const t = TYPES[type];
  const kind = url.searchParams.get('kind');
  if (!t || t[0] !== kind) return fail('Video (WebM, MP4) or voice-over (WebM, M4A) only, matching the kind.', 415);
  const len = Number(request.headers.get('Content-Length')) || 0;
  if (!len || !request.body) return fail('That recording is empty.', 411);
  if (len > MEDIA_MAX[kind]) return fail(`${kind === 'video' ? 'Videos' : 'Voice-overs'} can be up to ${mb(MEDIA_MAX[kind])} – this one is ${mb(len)}.`, 413);
  const count = await one(env, 'SELECT COUNT(*) AS n FROM play_media WHERE play_id = ? AND deleted = 0', id);
  if (count.n >= MEDIA_PER_PLAY) return fail(`A play holds ${MEDIA_PER_PLAY} recordings – hide an old one first.`, 409);

  const mid = hex(16);
  const key = `play/${id}/m/${mid}.${t[1]}`;
  const now = Date.now();
  await run(env, 'INSERT INTO play_media (id, play_id, kind, key, type, size, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    mid, id, kind, key, type, len, 'pending', me.u, now);
  try {
    await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type, cacheControl: 'private, max-age=3600' }, customMetadata: { play: String(id) } });
  } catch {
    await run(env, "UPDATE play_media SET status = 'failed' WHERE id = ?", mid);
    return fail('The upload didn’t finish – try again.', 400);
  }
  await run(env, "UPDATE play_media SET status = 'ready' WHERE id = ?", mid);
  await log(env, me, 'play-media', `#${id} · ${kind} ${mb(len)}`);
  return json({ media: view({ id: mid, kind, type, size: len, created_at: now }) });
}

export async function playMediaRoute(p, method, me, env) {
  const m = /^\/api\/plays\/(\d+)\/media(?:\/([0-9a-f]{32})(\/delete)?)?$/.exec(p);
  if (!m) return null;
  if (!flagOn(env, me, 'tactics')) return fail('Not available yet.', 404);
  if (!can(me, 'plays.view')) return fail('Members only.', 403);
  const id = Number(m[1]);
  const mid = m[2];
  const del = m[3];
  if (!(await canSee(env, me, id))) return fail('Play not found.', 404);

  if (!mid) {
    if (method !== 'GET') return fail('Not found', 404);
    const rows = await all(env, "SELECT * FROM play_media WHERE play_id = ? AND deleted = 0 AND status = 'ready' ORDER BY created_at", id);
    return json({ media: rows.map(view) });
  }
  if (del) {
    if (method !== 'POST') return fail('Not found', 404);
    if (!can(me, 'plays.manage')) return fail('Managers only.', 403);
    await run(env, 'UPDATE play_media SET deleted = 1 WHERE id = ? AND play_id = ?', mid, id);
    return json({ ok: true });
  }
  if (method !== 'GET') return fail('Not found', 404);
  const row = await one(env, "SELECT * FROM play_media WHERE id = ? AND play_id = ? AND deleted = 0 AND status = 'ready'", mid, id);
  if (!row) return fail('Recording not found.', 404);
  const obj = await env.MEDIA.get(row.key);
  if (!obj) return fail('Recording not found.', 404);
  return new Response(obj.body, { headers: { 'Content-Type': row.type, 'Content-Length': String(row.size), 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}
