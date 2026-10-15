// Owner-only issue tool back end (front end: web/report.js). POST /api/issues saves one pinned note; reads happen with SQL
// (wrangler d1 / the Cloudflare dashboard), so there is no list route to secure.
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
