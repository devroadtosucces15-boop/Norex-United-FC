// Owner-only issue tool back end (front end: web/report.js). POST /api/issues saves one pinned note; reads happen with SQL
// (wrangler d1 / the Cloudflare dashboard), so there is no list route to secure.
// Screen recordings (web/record.js) go to the MEDIA R2 bucket under `issues/<session>/<n>.<ext>`:
//   POST /api/issues/recording?session=&n=   owner, flag issueTool: raw body (Content-Type video/webm | video/mp4), up to REC_MAX → { ok, key }
//   GET  /api/issues/recording?session=&n=   owner: the file (Bearer auth; the page fetches it as a blob)
// No table: the report row's `data` JSON gets recording.uploaded / recording.key so SQL shows which reports have a video.
import { can, flagOn } from './roles.js';
const MAX_BYTES = 60_000;
const MAX_ROWS = 1500;
const SEVERITY = new Set(['broken', 'wrong', 'polish', 'idea']);
const clip = (v, n) => String(v ?? '').slice(0, n);

export async function issueSave(env, me, body) {
  const session = String(body?.session ?? '');
  const item = body?.item;
  if (!/^[a-z0-9]{6,40}$/.test(session) || !item || typeof item !== 'object') return { error: 'Bad report.' };
  const n = Number(item.n);
  if (!Number.isInteger(n) || n < 1 || n > 500) return { error: 'Bad report number.' };
  const data = JSON.stringify(item);
  if (data.length > MAX_BYTES) return { error: 'Report too large.' };
  const id = `${session}:${n}`;
  const have = await env.DB.prepare('SELECT 1 AS x FROM issue_reports WHERE id = ?').bind(id).first();
  if (!have && (await env.DB.prepare('SELECT COUNT(*) AS c FROM issue_reports').first()).c >= MAX_ROWS) return { error: 'Too many reports – mark some fixed and delete them first.' };
  const d = item.device ?? {};
  const device = [d.device, d.os && `${d.os}${d.osVersion ? ` ${d.osVersion}` : ''}`, d.browser && `${d.browser}${d.browserVersion ? ` ${d.browserVersion}` : ''}`,
    d.viewport && `${d.viewport.w}x${d.viewport.h}${d.dpr ? ` @${d.dpr}x` : ''}`, d.standalone ? 'installed app' : 'browser'].filter(Boolean).join(' · ');
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO issue_reports (id, session, n, user_id, user_name, page, severity, note, role, view_as, device, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET page = excluded.page, severity = excluded.severity, note = excluded.note, role = excluded.role, view_as = excluded.view_as,
      device = excluded.device, data = excluded.data, updated_at = excluded.updated_at`)
    .bind(id, session, n, me.u, clip(me.n, 60), clip(item.page, 300), SEVERITY.has(item.severity) ? item.severity : 'wrong', clip(item.note, 2000),
      clip(item.role?.real, 20), item.role?.viewAs ? clip(item.role.viewAs, 20) : null, clip(device, 200), data, Number(item.t) || now, now).run();
  return { ok: true, id };
}

const REC_MAX = 60_000_000;
const REC_TYPES = { 'video/webm': 'webm', 'video/mp4': 'mp4' };
const recKey = (url, ext) => {
  const session = url.searchParams.get('session') ?? '', n = Number(url.searchParams.get('n'));
  if (!/^[a-z0-9]{6,40}$/.test(session) || !Number.isInteger(n) || n < 1 || n > 500) return null;
  return { session, n, id: `${session}:${n}`, key: `issues/${session}/${n}.${ext}` };
};
const gate = (env, me) => (!can(me, 'issues.report') || !flagOn(env, me, 'issueTool') ? { error: 'Owner only.', status: 403 } : !env.MEDIA ? { error: 'Recordings need the R2 bucket, which isn’t switched on yet.', status: 503 } : null);

export async function issueRecordingUpload(request, me, env, url) {
  const g = gate(env, me);
  if (g) return g;
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const ext = REC_TYPES[type];
  if (!ext) return { error: 'Video (WebM or MP4) only.', status: 415 };
  const k = recKey(url, ext);
  if (!k) return { error: 'Bad report.', status: 400 };
  const len = Number(request.headers.get('Content-Length')) || 0;
  if (!len || !request.body) return { error: 'That recording is empty.', status: 411 };
  if (len > REC_MAX) return { error: `Recordings can be up to ${Math.round(REC_MAX / 1e6)} MB – this one is ${Math.round(len / 1e6)} MB.`, status: 413 };
  try { await env.MEDIA.put(k.key, request.body, { httpMetadata: { contentType: type, cacheControl: 'private, max-age=3600' }, customMetadata: { issue: k.id } }); }
  catch { return { error: 'The upload didn’t finish – try again.', status: 400 }; }
  // mark the report row if it is already saved; if not, the page re-saves the report with the flag (the save is an upsert)
  await env.DB.prepare("UPDATE issue_reports SET data = json_set(data, '$.recording.uploaded', json('true'), '$.recording.key', ?), updated_at = ? WHERE id = ?").bind(k.key, Date.now(), k.id).run();
  return { ok: true, key: k.key, size: len };
}

export async function issueRecordingGet(request, me, env, url) {
  const g = gate(env, me);
  if (g) return new Response(JSON.stringify({ error: g.error }), { status: g.status, headers: { 'Content-Type': 'application/json' } });
  for (const ext of ['webm', 'mp4']) {
    const k = recKey(url, ext);
    if (!k) break;
    const obj = await env.MEDIA.get(k.key);
    if (obj) return new Response(obj.body, { headers: { 'Content-Type': ext === 'mp4' ? 'video/mp4' : 'video/webm', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
  }
  return new Response(JSON.stringify({ error: 'No recording for that report.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}

// ---------- triage: list, mark fixed, and the automatic clean-up ----------
// A report marked fixed (or wontfix) is deleted FIX_GRACE later – row and video – after one line is written to the activity log so there is a record.
// The grace period is the undo window: set it back to open and nothing is deleted.
export const FIX_GRACE = 24 * 3600e3;
const STATUS = new Set(['open', 'fixed', 'wontfix']);
const ownerGate = (env, me) => (!can(me, 'issues.report') || !flagOn(env, me, 'issueTool') ? { error: 'Owner only.' } : null);

export async function issueList(env, me) {
  const g = ownerGate(env, me);
  if (g) return g;
  const { results } = await env.DB.prepare('SELECT id, session, n, page, severity, note, status, device, created_at, updated_at, json_extract(data, \'$.recording.uploaded\') AS video FROM issue_reports ORDER BY created_at DESC LIMIT 300').all();
  return { items: results.map((r) => ({ ...r, video: !!r.video, deleteAt: r.status === 'open' ? null : r.updated_at + FIX_GRACE })) };
}

export async function issueStatus(env, me, body) {
  const g = ownerGate(env, me);
  if (g) return g;
  const id = String(body?.id ?? ''), status = String(body?.status ?? '');
  if (!STATUS.has(status)) return { error: 'Status must be open, fixed or wontfix.' };
  const r = await env.DB.prepare('UPDATE issue_reports SET status = ?, updated_at = ? WHERE id = ?').bind(status, Date.now(), id).run();
  if (!r.meta?.changes) return { error: 'No such report.' };
  return { ok: true, id, status, deleteAt: status === 'open' ? null : Date.now() + FIX_GRACE };
}

export async function issueSweep(env, now = Date.now()) {
  if (!env.DB) return 0;
  const { results } = await env.DB.prepare("SELECT id, session, n, page, severity, note, status, json_extract(data, '$.recording.key') AS key FROM issue_reports WHERE status IN ('fixed', 'wontfix') AND updated_at < ? LIMIT 100").bind(now - FIX_GRACE).all();
  for (const r of results) {
    if (r.key && env.MEDIA) await env.MEDIA.delete(r.key).catch(() => {});
    await env.DB.batch([
      env.DB.prepare('INSERT INTO activity (at, user_id, name, avatar, type, detail) VALUES (?, ?, ?, ?, ?, ?)').bind(now, 'system', 'Issue tool', '', 'issue-cleared', `${r.status} #${r.n} ${r.severity} · ${r.page} · ${clip(r.note, 140)}${r.key ? ' · video deleted' : ''}`),
      env.DB.prepare('DELETE FROM issue_reports WHERE id = ?').bind(r.id),
    ]);
  }
  return results.length;
}
