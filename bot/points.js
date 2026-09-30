// Point system (roadmap P11.3). A running total per member (no season reset), broken down by category:
// match performance, event attendance, community activity, and good behaviour (the P11.4 profanity counter
// feeds "behaviour" with clean-streak bonuses). Other modules call awardPoints() when something point-worthy
// happens – this file has no dependency on them, so there's no import cycle.
//   GET /api/points               members: my total + category breakdown + recent log
//   GET /api/points/leaderboard   members: top 20 by total points
//
// Not yet wired: match performance (goals/assists/MOTM/win) – that data is fetched by scripts/fetch.mjs in
// GitHub Actions, which has no direct D1 access (see crawl.js's keyed-HTTP pattern for how another Actions
// script reaches D1 – the same approach would work here, left for a follow-up).
import { can, flagOn } from './roles.js';

export const CATEGORIES = ['match', 'attendance', 'community', 'behaviour'];

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();

// Never lets a points failure break the action that earned them – callers fire-and-forget or await, either is fine.
export async function awardPoints(env, userId, category, delta, reason) {
  if (!env.DB || !userId || !delta) return;
  if (!CATEGORIES.includes(category)) throw new Error(`Unknown point category: ${category}`);
  try {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(delta, userId),
      env.DB.prepare('INSERT INTO points_log (user_id, category, delta, reason, at) VALUES (?, ?, ?, ?, ?)').bind(userId, category, delta, reason, Date.now()),
    ]);
  } catch (e) {
    console.log('awardPoints failed', e.message);
  }
}

async function breakdown(env, uid) {
  const rows = await all(env, 'SELECT category, SUM(delta) AS pts FROM points_log WHERE user_id = ? GROUP BY category', uid);
  const by = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const r of rows) by[r.category] = r.pts;
  return by;
}

async function leaderboard(env) {
  const rows = await all(env, 'SELECT id, name, avatar, points FROM users WHERE points > 0 ORDER BY points DESC LIMIT 20');
  return rows.map((r) => ({ id: r.id, n: r.name, a: r.avatar ?? undefined, pts: r.points }));
}

export async function pointsRoute(p, method, body, me, env) {
  if (p !== '/api/points' && p !== '/api/points/leaderboard') return null;
  if (!flagOn(env, me, 'points')) return fail('Not available yet.', 404);
  if (!can(me, 'points.view')) return fail('Members only.', 403);
  if (method !== 'GET') return fail('Not found', 404);
  if (p === '/api/points/leaderboard') return json({ rows: await leaderboard(env) });
  const u = await one(env, 'SELECT points FROM users WHERE id = ?', me.u);
  const recent = await all(env, 'SELECT category, delta, reason, at FROM points_log WHERE user_id = ? ORDER BY id DESC LIMIT 20', me.u);
  return json({ total: u?.points ?? 0, by: await breakdown(env, me.u), recent });
}
