// Game rules & versions (roadmap PB.1). The FC dataset (archetypes, attributes, AP per level, level cap …) is
// versioned: the site ships the seed from data/game/ as api/game.json, managers publish new versions here
// (stored whole in D1), and everything that needs the max level reads GET /api/game – so a cap change needs
// no code change. Level-cap sentences found in EA's patch notes (P1.7, site api/updates.json) show up as
// pending changes a manager confirms with one click.
// PB.6: publishing tells members (notification type `game`, DM per their settings) with a short "what changed" list,
// and GET /api/game/changes?from=<version> (public) gives the builder the diff for a build made on an older version.
import { can } from './roles.js';
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

// A stored version's dataset: D1 row, or the seed the site ships.
export async function versionData(env, loadSite, version) {
  const r = env.DB && (await env.DB.prepare('SELECT * FROM game_versions WHERE version = ?').bind(version).first());
  if (r) return outRow(r);
  const seed = await loadSite('game');
  return seed.version === version ? seed : null;
}

const same = (x, y) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
const byId = (l) => new Map((l || []).map((x) => [x.id, x]));

// "What changed" between two dataset versions → short plain-text lines (never EA's text, only our own fields).
export function gameDiff(a, b) {
  const items = [];
  const add = (icon, text) => items.push({ icon, text });
  const names = (l) => l.map((x) => x.name || x.id).join(', ');
  const ca = a.levelCap?.value, cb = b.levelCap?.value;
  if (ca !== cb) add(cb > ca ? '🔝' : '🔻', `Max level ${ca ?? '–'} → ${cb ?? '–'}`);
  else if (!a.levelCap?.verified && b.levelCap?.verified) add('✅', `Max level ${cb} confirmed by EA`);
  if (!same(a.apPerLevel, b.apPerLevel)) add('🪙', (a.apPerLevel || []).length ? 'Archetype points per level changed' : 'Archetype points per level entered from the game');
  if (!same(a.apCosts, b.apCosts)) add('💸', 'Attribute upgrade costs changed');
  if (!same(a.slots, b.slots)) add('🎰', `Slots: ${['playstyles', 'plus', 'facilities'].map((k) => `${k === 'plus' ? 'PlayStyle+' : k} ${b.slots?.[k] ?? '–'}`).join(' · ')}`);
  const la = (a.attributeGroups || []).flatMap((x) => x.attributes), lb = (b.attributeGroups || []).flatMap((x) => x.attributes);
  if (!same(la, lb)) add('🧩', 'Attribute list changed – check older builds’ points');
  for (const [key, icon, word] of [['archetypes', '🧬', 'Archetypes'], ['playstyles', '💫', 'PlayStyles'], ['specializations', '🎓', 'Specializations'], ['facilities', '🏟️', 'Facilities']]) {
    const A = byId(a[key]), B = byId(b[key]);
    const added = [...B.values()].filter((x) => !A.has(x.id)), gone = [...A.values()].filter((x) => !B.has(x.id));
    const changed = [...B.values()].filter((x) => A.has(x.id) && !same({ ...A.get(x.id), source: 0 }, { ...x, source: 0 }));
    if (added.length) add(icon, `${word} added: ${names(added.slice(0, 5))}${added.length > 5 ? ` +${added.length - 5}` : ''}`);
    if (gone.length) add('➖', `${word} removed: ${names(gone.slice(0, 5))}${gone.length > 5 ? ` +${gone.length - 5}` : ''}`);
    if (changed.length) add('✏️', `${word} updated: ${names(changed.slice(0, 5))}${changed.length > 5 ? ` +${changed.length - 5}` : ''}`);
  }
  if (!same(a.masteries, b.masteries)) add('🏅', 'Masteries changed');
  if (!same(a.body, b.body)) add('📏', 'Height / weight modifiers changed');
  if (!same(a.rules, b.rules)) add('📜', 'Club rules notes changed');
  return { from: a.version, to: b.version, cap: [ca ?? null, cb ?? null], items };
}

// Public: GET /api/game/changes?from=<version> – what changed from that version to the live one.
export async function gameChanges(env, loadSite, from) {
  const now = await latestGame(env, loadSite);
  const v = String(from ?? '').toLowerCase();
  if (!VERSION_RE.test(v)) return { error: 'Unknown version', status: 400 };
  if (v === now.version) return { from: v, to: v, cap: [now.levelCap?.value, now.levelCap?.value], items: [], current: true };
  const old = await versionData(env, loadSite, v);
  if (!old) return { from: v, to: now.version, cap: [null, now.levelCap?.value ?? null], items: [], unknown: true };
  return gameDiff(old, now);
}

// BE12: does one archetype's own definition still exist / still match, between two dataset versions?
function archStatus(a, b, id) {
  const before = byId(a.archetypes)?.get(id), after = byId(b.archetypes)?.get(id);
  if (!after) return 'removed';
  if (!before) return null; // predates archetypes being tracked – nothing to compare
  return same({ ...before, source: 0 }, { ...after, source: 0 }) ? null : 'updated';
}
// Per-build impact of a dataset change (roadmap BE12): archetype-specific (removed/updated) plus the generic
// changes that touch every build regardless of archetype (points per level, upgrade costs, attribute list, cap).
function oneBuildImpact(r, old, now) {
  const changes = [];
  let breaking = false;
  const add = (icon, text, isBreaking = false) => { changes.push({ icon, text }); if (isBreaking) breaking = true; };
  const arch = archStatus(old, now, r.arch);
  if (arch === 'removed') add('➖', 'Your archetype no longer exists – pick a new one', true);
  else if (arch === 'updated') add('✏️', 'Your archetype’s values changed');
  if (old.levelCap?.value !== now.levelCap?.value) add(now.levelCap.value > old.levelCap?.value ? '🔝' : '🔻', `Max level ${old.levelCap?.value ?? '–'} → ${now.levelCap.value}`, true);
  if (!same(old.apPerLevel, now.apPerLevel)) add('🪙', 'Archetype points per level changed', true);
  if (!same(old.apCosts, now.apCosts)) add('💸', 'Attribute upgrade costs changed', true);
  const la = (old.attributeGroups || []).flatMap((x) => x.attributes), lb = (now.attributeGroups || []).flatMap((x) => x.attributes);
  if (!same(la, lb)) add('🧩', 'Attribute list changed – check your points', true);
  if (!same(old.body, now.body)) add('📏', 'Height / weight modifiers changed');
  return { id: r.id, title: r.title, arch: r.arch, fromVersion: r.version, toVersion: now.version, breaking, changes };
}
// GET /api/builds/impact (members) – across all my saved builds, what a dataset bump actually changed for each one.
export async function buildsImpact(env, loadSite, me) {
  const now = await latestGame(env, loadSite);
  const rows = (await env.DB.prepare('SELECT id, title, arch, version FROM builds WHERE user_id = ? AND removed_at IS NULL').bind(me.u).all()).results;
  const cache = new Map();
  const out = [];
  for (const r of rows) {
    if (!r.version || r.version === now.version) { out.push({ id: r.id, title: r.title, arch: r.arch, current: true, breaking: false, changes: [] }); continue; }
    if (!cache.has(r.version)) cache.set(r.version, await versionData(env, loadSite, r.version));
    const old = cache.get(r.version);
    out.push(old ? { current: false, ...oneBuildImpact(r, old, now) } : { id: r.id, title: r.title, arch: r.arch, current: false, unknown: true, breaking: false, changes: [] });
  }
  return { current: now.version, builds: out, breaking: out.filter((b) => b.breaking).length, changed: out.filter((b) => b.changes?.length).length };
}

// After a publish: members with builds on older versions hear how many need a look; everyone else gets the headline.
// BE12: distinguishes "breaking" (archetype gone, cap/points/attribute-list change – the build is actually wrong
// now) from a plain version bump, same per-build logic as GET /api/builds/impact, so the notification tells a
// member whether they need to act or can ignore it.
async function tellMembers(env, loadSite, prev, next) {
  const d = gameDiff(prev, next);
  const cap = d.cap[0] !== d.cap[1] ? `max level ${d.cap[0] ?? '–'} → ${d.cap[1]}` : `max level ${d.cap[1]}`;
  const title = `🎮 New game rules ${next.version}: ${cap}`;
  const lines = d.items.slice(0, 6).map((x) => `${x.icon} ${x.text}`).join('\n');
  const rows = (await env.DB.prepare('SELECT user_id, id, title, arch, version FROM builds WHERE removed_at IS NULL AND (version IS NULL OR version != ?)').bind(next.version).all()).results;
  const cache = new Map();
  const byUser = new Map();
  for (const r of rows) {
    let imp = null;
    if (r.version) {
      if (!cache.has(r.version)) cache.set(r.version, await versionData(env, loadSite, r.version));
      const old = cache.get(r.version);
      if (old) imp = oneBuildImpact(r, old, next);
    }
    const u = byUser.get(r.user_id) ?? { n: 0, breaking: 0, named: [] };
    u.n++; if (imp?.breaking) u.breaking++;
    // per-build line: the build's name + the first thing that changed for it (breaking builds first when listed)
    u.named.push({ title: r.title, breaking: !!imp?.breaking, text: imp?.changes[0]?.text ?? 'on an older version' });
    byUser.set(r.user_id, u);
  }
  let sent = 0;
  for (const [uid, { n, breaking, named }] of byUser) {
    named.sort((x, y) => y.breaking - x.breaking);
    const per = named.slice(0, 3).map((x) => `${x.breaking ? '⚠️' : '⬆'} “${String(x.title || 'Untitled').slice(0, 40)}” – ${x.text}`).join('\n') + (named.length > 3 ? `\n… and ${named.length - 3} more` : '');
    const upgrade = breaking
      ? `⚠️ ${breaking} of your builds ${breaking === 1 ? 'needs' : 'need'} attention (archetype or points changed)${breaking < n ? ` · ${n} total on an older version` : ''} – upgrade to the new MAX in one click.`
      : `⬆ ${n} of your builds ${n === 1 ? 'is' : 'are'} on an older version – upgrade to the new MAX in one click.`;
    sent += await notify(env, [uid], { type: 'game', icon: '🎮', title, body: `${lines}${lines ? '\n' : ''}${per}\n${upgrade}`, link: 'builder.html?upgrade=1' });
  }
  const builders = new Set(rows.map((r) => r.user_id));
  const users = (await env.DB.prepare('SELECT id FROM users WHERE last_at > ?').bind(Date.now() - 180 * 86400e3).all()).results.map((u) => u.id).filter((id) => !builders.has(id));
  sent += await notify(env, users, { type: 'game', icon: '🎮', title, body: lines || null, link: 'builder.html' });
  return sent;
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
    const told = body.notify === false ? 0 : (await safely(tellMembers(env, loadSite, current, await latestGame(env, loadSite)))) ?? 0;
    await log(env, me, 'game-publish', `${version} · max level ${cap}${verified ? ' ✓' : ''}`);
    return json({ ...(await adminState(env, loadSite)), told });
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
