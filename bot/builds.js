// Pro Builder saved builds (roadmap PB.2 c). Members keep their own builds; a build is stored as the builder's
// share-link string, so the site decodes it with the same maths as a shared URL (web/build-math.js).
//   GET  /api/builds              members – my builds (newest first)
//   GET  /api/builds/get?id=      one build: mine, or a posted one (PB.3) – for opening / comparing / forking
//   POST /api/builds              save a new build, or update my own ({ id })
//   POST /api/builds/delete       remove one of mine (also unposts it and clears it as my League/Rush build)
//   POST /api/builds/fork         copy a build I can see into my builds (forked_from keeps the trail)
// All behind the `builder` flag; saving needs the builds.save permission (member).
import { can, flagOn } from './roles.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();

export const MAX_BUILDS = 50; // per member
const CODE_RE = /^[A-Za-z0-9=&._%+-]{3,800}$/;
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const VERSION_RE = /^[a-z0-9][a-z0-9.-]{0,39}$/;

const out = (r, me) => ({ id: r.id, title: r.title, code: r.code, arch: r.arch, level: r.level, version: r.version, forkedFrom: r.forked_from ?? null,
  posted: !!r.posted_at, position: r.position ?? null, mode: r.mode ?? null, by: { id: r.user_id, n: r.name, a: r.avatar }, mine: r.user_id === me.u, at: r.at, updated: r.updated_at });
// picks = which of my builds is my League / Rush build (PB.4, table my_builds).
const mine = async (env, me) => {
  const [rows, picks] = await Promise.all([
    all(env, 'SELECT * FROM builds WHERE user_id = ? AND removed_at IS NULL ORDER BY updated_at DESC LIMIT ?', me.u, MAX_BUILDS),
    all(env, 'SELECT mode, build_id FROM my_builds WHERE user_id = ?', me.u),
  ]);
  return { builds: rows.map((r) => out(r, me)), max: MAX_BUILDS, picks: Object.fromEntries(picks.map((x) => [x.mode, x.build_id])) };
};
// A build someone may open: their own, a posted one (PB.3), or one a member shows on their profile (PB.4).
const visible = (env, me, id) => one(env, `SELECT * FROM builds WHERE id = ? AND removed_at IS NULL
  AND (user_id = ? OR posted_at IS NOT NULL OR id IN (SELECT build_id FROM my_builds))`, Number(id) || 0, me.u);

// Validate what the builder sends: title + share code (+ archetype/level/version for listing without decoding).
export function buildInput(body) {
  const code = String(body.code ?? '').replace(/^#/, '');
  if (!CODE_RE.test(code)) return { err: 'That build could not be read – try the Share link button first.' };
  const q = new URLSearchParams(code);
  const arch = clean(q.get('a'), 40).toLowerCase();
  if (!ID_RE.test(arch)) return { err: 'Pick an archetype first.' };
  const level = parseInt(q.get('l'), 10);
  if (!Number.isInteger(level) || level < 1 || level > 200) return { err: 'Level must be between 1 and 200.' };
  const version = clean(q.get('v'), 40).toLowerCase();
  const title = clean(body.title, 60) || 'Untitled build';
  return { code, arch, level, version: VERSION_RE.test(version) ? version : null, title };
}

export async function buildsRoute(p, method, body, me, env, log, url) {
  if (p !== '/api/builds' && !p.startsWith('/api/builds/')) return null;
  if (!flagOn(env, me, 'builder')) return fail('Not available yet.', 404);
  if (!can(me, 'builds.save')) return fail('Members only.', 403);

  if (p === '/api/builds' && method === 'GET') return json(await mine(env, me));
  if (p === '/api/builds/get' && method === 'GET') {
    const r = await visible(env, me, url?.searchParams.get('id'));
    return r ? json({ build: out(r, me) }) : fail('Build not found.', 404);
  }
  if (method !== 'POST') return fail('Not found', 404);

  if (p === '/api/builds') {
    const v = buildInput(body);
    if (v.err) return fail(v.err);
    const at = Date.now();
    if (body.id != null) {
      const r = await one(env, 'SELECT id, user_id FROM builds WHERE id = ? AND removed_at IS NULL', Number(body.id) || 0);
      if (!r || r.user_id !== me.u) return fail('You can only update your own builds – fork it instead.', 403);
      await run(env, 'UPDATE builds SET title = ?, code = ?, arch = ?, level = ?, version = ?, name = ?, avatar = ?, updated_at = ? WHERE id = ?', v.title, v.code, v.arch, v.level, v.version, me.n, me.a ?? null, at, r.id);
      await log(env, me, 'build-update', v.title);
      return json({ ...(await mine(env, me)), saved: r.id });
    }
    const n = (await one(env, 'SELECT COUNT(*) AS n FROM builds WHERE user_id = ? AND removed_at IS NULL', me.u)).n;
    if (n >= MAX_BUILDS) return fail(`You have ${MAX_BUILDS} builds saved – delete one first.`, 429);
    const res = await run(env, 'INSERT INTO builds (user_id, name, avatar, title, code, arch, level, version, at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', me.u, me.n, me.a ?? null, v.title, v.code, v.arch, v.level, v.version, at, at);
    await log(env, me, 'build-save', v.title);
    return json({ ...(await mine(env, me)), saved: res.meta.last_row_id });
  }

  if (p === '/api/builds/delete') {
    const r = await one(env, 'SELECT id, user_id, title FROM builds WHERE id = ? AND removed_at IS NULL', Number(body.id) || 0);
    if (!r || r.user_id !== me.u) return fail('Build not found.', 404);
    await env.DB.batch([ // deleting also takes it off the Pro Builds board and off my profile
      env.DB.prepare('UPDATE builds SET removed_at = ?, posted_at = NULL, featured = NULL WHERE id = ?').bind(Date.now(), r.id),
      env.DB.prepare('DELETE FROM my_builds WHERE build_id = ?').bind(r.id),
    ]);
    await log(env, me, 'build-delete', r.title);
    return json(await mine(env, me));
  }

  if (p === '/api/builds/fork') {
    const src = await visible(env, me, body.id);
    if (!src) return fail('Build not found.', 404);
    const n = (await one(env, 'SELECT COUNT(*) AS n FROM builds WHERE user_id = ? AND removed_at IS NULL', me.u)).n;
    if (n >= MAX_BUILDS) return fail(`You have ${MAX_BUILDS} builds saved – delete one first.`, 429);
    const at = Date.now();
    const title = clean(body.title, 60) || clean(`${src.title} (fork)`, 60);
    const res = await run(env, 'INSERT INTO builds (user_id, name, avatar, title, code, arch, level, version, forked_from, at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', me.u, me.n, me.a ?? null, title, src.code, src.arch, src.level, src.version, src.id, at, at);
    await log(env, me, 'build-fork', `${src.title} → ${title}`);
    return json({ ...(await mine(env, me)), saved: res.meta.last_row_id });
  }
  return fail('Not found', 404);
}
