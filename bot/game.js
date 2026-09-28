// Game rules & versions (roadmap PB.1). The FC dataset (archetypes, attributes, AP per level, level cap …) is
// versioned: the site ships the seed from data/game/ as api/game.json, managers publish new versions here
// (stored whole in D1), and everything that needs the max level reads GET /api/game – so a cap change needs
// no code change. Level-cap sentences found in EA's patch notes (P1.7, site api/updates.json) show up as
// pending changes a manager confirms with one click.
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';

// Dataset keys a manager may replace when publishing. Anything else in "changes" is rejected.
export const DATA_KEYS = ['archetypeGroups', 'archetypes', 'attributeGroups', 'apPerLevel', 'apCosts', 'slots', 'playstyles', 'specializations', 'facilities', 'masteries', 'body', 'rules', 'sources', 'note'];
const MAX_BYTES = 200_000;
const VERSION_RE = /^[a-z0-9][a-z0-9.-]{0,39}$/;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const safeUrl = (u) => { try { const x = new URL(String(u)); return /^https?:$/.test(x.protocol) ? x.href.slice(0, 300) : null; } catch { return null; } };

const outRow = (r) => ({ ...JSON.parse(r.data), version: r.version, levelCap: { value: r.level_cap, verified: !!r.cap_verified, source: r.cap_source || (r.cap_verified ? 'ea-notes' : 'unverified') }, publishedBy: r.by_name, publishedAt: r.at, basedOn: r.based_on });

// Newest version: D1 first, else the seed the site build publishes.
export async function latestGame(env, loadSite) {
  const r = env.DB && (await env.DB.prepare('SELECT * FROM game_versions ORDER BY id DESC LIMIT 1').first());
  if (r) return outRow(r);
  const seed = await loadSite('game');
  return { ...seed, publishedBy: null, publishedAt: null, basedOn: null };
}

async function pendingCaps(env, loadSite, current) {
  const updates = await loadSite('updates').catch(() => ({ entries: [] }));
  const decided = new Set((await env.DB.prepare('SELECT hit_id FROM game_decisions').all()).results.map((r) => r.hit_id));
  return (updates.entries || []).flatMap((e) => (e.hits || []).filter((h) => h.kind === 'levelCap' && !decided.has(h.id)).map((h) => ({
    id: h.id, value: h.value ?? null, quote: h.quote, section: h.section, title: e.title, url: e.url, published: e.published,
    same: h.value != null && h.value === current.levelCap?.value && current.levelCap?.verified,
  })));
}

async function adminState(env, loadSite) {
  const current = await latestGame(env, loadSite);
  const rows = (await env.DB.prepare('SELECT id, version, level_cap, cap_verified, cap_source, note, based_on, by_name, at FROM game_versions ORDER BY id DESC LIMIT 50').all()).results;
  const seed = await loadSite('game');
  const versions = [
    ...rows.map((r) => ({ version: r.version, cap: r.level_cap, verified: !!r.cap_verified, source: r.cap_source, note: r.note, basedOn: r.based_on, by: r.by_name, at: r.at })),
    { version: seed.version, cap: seed.levelCap?.value, verified: !!seed.levelCap?.verified, source: seed.levelCap?.source, note: 'Starting dataset (site file)', basedOn: null, by: null, at: Date.parse(seed.published) || null, seed: true },
  ];
  return { current, versions, pending: await pendingCaps(env, loadSite, current), keys: DATA_KEYS };
}

// ---------- PB.6: what changed between two versions (pure, tested) ----------
const names = (l) => new Map((Array.isArray(l) ? l : []).map((x) => [x.id ?? x.name, x.name ?? x.id]));
const same = (x, y) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
export function gameDiff(a, b) {
  const out = [];
  const capA = a?.levelCap?.value, capB = b?.levelCap?.value;
  if (capA !== capB) out.push({ icon: '🔝', text: `Max level ${capA ?? '?'} → ${capB ?? '?'}${capB > capA ? ` – ${capB - capA} more level${capB - capA === 1 ? '' : 's'} of AP to spend` : ''}` });
  const list = (key, label) => {
    const A = names(a?.[key]), B = names(b?.[key]);
    const added = [...B.keys()].filter((k) => !A.has(k)).map((k) => B.get(k)), gone = [...A.keys()].filter((k) => !B.has(k)).map((k) => A.get(k));
    const changed = [...B.keys()].filter((k) => A.has(k) && !same((a[key] ?? []).find((x) => (x.id ?? x.name) === k), (b[key] ?? []).find((x) => (x.id ?? x.name) === k))).map((k) => B.get(k));
    const few = (l) => `${l.slice(0, 6).join(', ')}${l.length > 6 ? ` +${l.length - 6} more` : ''}`;
    if (added.length) out.push({ icon: '➕', text: `New ${label}: ${few(added)}` });
    if (gone.length) out.push({ icon: '➖', text: `${label.charAt(0).toUpperCase() + label.slice(1)} removed: ${few(gone)}` });
    if (changed.length) out.push({ icon: '✏️', text: `${label.charAt(0).toUpperCase() + label.slice(1)} changed: ${few(changed)}` });
  };
  list('archetypes', 'archetypes'); list('playstyles', 'PlayStyles'); list('specializations', 'specializations'); list('facilities', 'facilities');
  for (const [key, label] of [['apPerLevel', 'AP per level'], ['apCosts', 'AP costs'], ['slots', 'PlayStyle slots'], ['masteries', 'Masteries'], ['body', 'height / weight effects'], ['rules', 'game rules']]) {
    if (!same(a?.[key], b?.[key])) out.push({ icon: '🔧', text: `${label} updated` });
  }
  return out;
}
// GET /api/game/diff?from=<version> – public (the builder shows it on builds made on older rules).
export async function gameDiffRoute(env, loadSite, from) {
  const to = await latestGame(env, loadSite);
  const f = String(from ?? '').toLowerCase().slice(0, 40);
  let old = null;
  const row = env.DB && VERSION_RE.test(f) ? await env.DB.prepare('SELECT * FROM game_versions WHERE version = ?').bind(f).first() : null;
  if (row) old = outRow(row);
  else { const seed = await loadSite('game'); if (seed.version === f) old = seed; }
  if (!old) return { from: f, to: to.version, known: false, changes: [] };
  return { from: f, to: to.version, known: true, cap: { from: old.levelCap?.value, to: to.levelCap?.value }, changes: gameDiff(old, to) };
}
// After a publish: builders hear about it; anyone with builds on older rules gets their count.
async function announcePatch(env, version, cap, before) {
  const users = (await env.DB.prepare('SELECT id, role FROM users WHERE last_at > ?').bind(Date.now() - 180 * 86400e3).all()).results.filter((u) => flagOn(env, { role: u.role }, 'builder'));
  if (!users.length) return;
  const old = new Map((await env.DB.prepare('SELECT user_id, COUNT(*) AS n FROM builds WHERE removed_at IS NULL AND (version IS NULL OR version != ?) GROUP BY user_id').bind(version).all()).results.map((r) => [r.user_id, r.n]));
  const capText = before !== cap ? `max level ${before} → ${cap}` : `max level ${cap}`;
  const groups = new Map();
  for (const u of users) { const n = old.get(u.id) ?? 0; (groups.get(n) ?? groups.set(n, []).get(n)).push(u.id); }
  for (const [n, ids] of groups) {
    await safely(notify(env, ids, { type: 'patch', icon: '🧬', title: `Game rules ${version}: ${capText}`, body: n ? `${n} of your builds ${n === 1 ? 'was' : 'were'} made on older rules – open ${n === 1 ? 'it' : 'one'} in the Pro Builder to see what changed and upgrade to the new max in one click.` : 'The Pro Builder uses the new rules now.', link: 'builder.html' }));
  }
}

// Routes under /api/game/* (the public GET /api/game is answered before login in members.js).
export async function gameRoute(p, method, body, me, env, loadSite, log) {
  if (!can(me, 'game.edit')) return fail('Managers only.', 403);
  if (p === '/api/game/admin' && method === 'GET') return json(await adminState(env, loadSite));

  if (p === '/api/game/publish' && method === 'POST') {
    const current = await latestGame(env, loadSite);
    const version = clean(body.version, 40).toLowerCase();
    if (!VERSION_RE.test(version)) return fail('Version: letters, numbers, dots and dashes only (e.g. fc27-tu3).');
    const seed = await loadSite('game');
    if (version === seed.version || (await env.DB.prepare('SELECT 1 FROM game_versions WHERE version = ?').bind(version).first())) return fail(`Version ${version} already exists – pick a new name.`, 409);
    const cap = Number(body.levelCap);
    if (!Number.isInteger(cap) || cap < 1 || cap > 200) return fail('Max level must be a whole number between 1 and 200.');
    const verified = body.verified === true;
    const source = body.source ? safeUrl(body.source) : null;
    if (body.source && !source) return fail('Source must be a link (https://…).');
    if (verified && !source) return fail('Add the link to the official note when marking the cap as confirmed.');
    let changes = body.changes ?? {};
    if (typeof changes === 'string') {
      if (!changes.trim()) changes = {};
      else try { changes = JSON.parse(changes); } catch { return fail('Changed values are not valid JSON.'); }
    }
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return fail('Changed values must be a JSON object, e.g. {"apPerLevel": [...]}');
    const bad = Object.keys(changes).filter((k) => !DATA_KEYS.includes(k));
    if (bad.length) return fail(`Unknown field(s): ${bad.join(', ')}. Allowed: ${DATA_KEYS.join(', ')}`);
    const { version: _v, levelCap: _c, publishedBy: _b, publishedAt: _a, basedOn: _o, ...base } = current;
    const data = JSON.stringify({ ...base, ...changes, published: new Date().toISOString().slice(0, 10) });
    if (data.length > MAX_BYTES) return fail('Dataset too large (200 KB max).');
    const note = clean(body.note, 300) || null;
    const hit = body.pending ? clean(body.pending, 200) : null;
    const at = Date.now();
    const stmts = [env.DB.prepare('INSERT INTO game_versions (version, level_cap, cap_verified, cap_source, data, note, based_on, by_id, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(version, cap, verified ? 1 : 0, source ?? (verified ? 'ea-notes' : 'unverified'), data, note, current.version, me.u, me.n, at)];
    if (hit) stmts.push(env.DB.prepare('INSERT OR REPLACE INTO game_decisions (hit_id, status, version, by_name, at) VALUES (?, ?, ?, ?, ?)').bind(hit, 'applied', version, me.n, at));
    await env.DB.batch(stmts);
    await safely(announcePatch(env, version, cap, current.levelCap?.value)); // PB.6
    await log(env, me, 'game-publish', `${version} · max level ${cap}${verified ? ' ✓' : ''}`);
    return json(await adminState(env, loadSite));
  }

  if (p === '/api/game/dismiss' && method === 'POST') {
    const id = clean(body.id, 200);
    if (!id) return fail('Missing id');
    await env.DB.prepare('INSERT OR REPLACE INTO game_decisions (hit_id, status, version, by_name, at) VALUES (?, ?, NULL, ?, ?)').bind(id, 'dismissed', me.n, Date.now()).run();
    await log(env, me, 'game-dismiss', id.split('#')[0]);
    return json(await adminState(env, loadSite));
  }
  return fail('Not found', 404);
}
