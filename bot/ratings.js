// Community star ratings (roadmap P4.2) – a weekly list next to the awards ballot, separate from it.
//   GET  /api/ratings              members: this week's list (NOREX players, who played this week first), my stars, the board
//   POST /api/ratings/rate         members: { player, stars } (1–5, 0 = take it back) – changeable until the week ends
//   GET  /api/ratings/player?k=    members: a player's rolling + all-time rating and weekly trend; managers also see the raters
// Nobody rates everybody: a player's rating only shows once MIN_RATERS different members rated them in the window.
// Rolling = the last 8 weeks, each week weighted 0.85^age, so recent form counts most. Can't rate yourself.
import { can, flagOn } from './roles.js';
import { weekOf } from './awards.js';
import { awardPoints } from './points.js';

const WEEK = 7 * 86400e3, WINDOW = 8, DECAY = 0.85, TREND = 12;
export const MIN_RATERS = 3;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const r2 = (x) => Math.round(x * 100) / 100;
const weeksBack = (n) => weekOf(Date.now() - n * WEEK).key; // ISO week keys sort as text

// rows = [{ week, stars, user_id }] for one player → { rolling, allTime, raters, trend }. Pure – tested directly.
// keys = the TREND week keys, oldest first (default: the 12 weeks up to this one).
export function summarise(rows, keys = Array.from({ length: TREND }, (_, i) => weeksBack(i)).reverse()) {
  const recent = keys;
  const inWindow = rows.filter((r) => r.week >= recent[recent.length - WINDOW] && r.week <= recent[recent.length - 1]);
  const age = (w) => recent.length - 1 - recent.indexOf(w);
  let sw = 0, s = 0;
  for (const r of inWindow) { const w = DECAY ** Math.max(0, age(r.week)); sw += w; s += w * r.stars; }
  const raters = new Set(inWindow.map((r) => r.user_id)).size;
  const allRaters = new Set(rows.map((r) => r.user_id)).size;
  const byWeek = new Map();
  for (const r of rows) { const b = byWeek.get(r.week) ?? []; b.push(r.stars); byWeek.set(r.week, b); }
  return {
    rolling: raters >= MIN_RATERS && sw ? r2(s / sw) : null,
    allTime: allRaters >= MIN_RATERS ? r2(rows.reduce((t, r) => t + r.stars, 0) / rows.length) : null,
    raters, ratings: rows.length,
    // A week only shows once MIN_RATERS rated in it, so one member's stars can't be read off the chart.
    trend: recent.map((w) => { const b = byWeek.get(w) ?? []; return { week: w, avg: b.length >= MIN_RATERS ? r2(b.reduce((t, x) => t + x, 0) / b.length) : null }; }),
  };
}

// Short version for hover cards and profiles (/api/member): the ratings stay null until enough members rated.
export async function starSummary(env, k) {
  if (!k) return null;
  const [rows, total] = await Promise.all([
    all(env, 'SELECT week, stars, user_id FROM star_ratings WHERE player = ? AND week >= ?', String(k), weeksBack(TREND - 1)),
    one(env, 'SELECT COUNT(*) AS n, SUM(stars) AS s, COUNT(DISTINCT user_id) AS u FROM star_ratings WHERE player = ?', String(k)),
  ]);
  const s = summarise(rows);
  const allTime = total.u >= MIN_RATERS ? r2(total.s / total.n) : null;
  return { k: String(k), rolling: s.rolling, allTime, raters: s.raters, ratings: total.n, trend: s.rolling == null && allTime == null ? [] : s.trend.map((t) => t.avg), min: MIN_RATERS };
}

async function roster(env, loadSite, week) {
  const [players, squad] = await Promise.all([loadSite('players').catch(() => []), loadSite('squad').catch(() => null)]);
  const played = new Set(Object.entries(squad?.players ?? {}).filter(([, rows]) => rows.some((r) => r[0] * 1000 >= week.start && r[0] * 1000 < week.end)).map(([k]) => k));
  return players.filter((p) => p.home).map((p) => ({ k: p.k, n: p.n, pos: p.pos, ovr: p.ovr, played: played.has(p.k) }))
    .sort((a, b) => b.played - a.played || a.n.localeCompare(b.n));
}
async function board(env, players) {
  const rows = await all(env, 'SELECT player, week, stars, user_id FROM star_ratings WHERE week >= ?', weeksBack(TREND - 1));
  const by = new Map();
  for (const r of rows) (by.get(r.player) ?? by.set(r.player, []).get(r.player)).push(r);
  const name = new Map(players.map((p) => [p.k, p.n]));
  return [...by.entries()].map(([k, list]) => ({ k, n: name.get(k) ?? k, ...summarise(list) }))
    .filter((x) => x.rolling != null).sort((a, b) => b.rolling - a.rolling || b.raters - a.raters).slice(0, 15)
    .map(({ k, n, rolling, raters, trend }) => ({ k, n, rolling, raters, trend: trend.map((t) => t.avg) }));
}
async function state(env, me, loadSite) {
  const week = weekOf(Date.now());
  const [players, mine, claim] = await Promise.all([
    roster(env, loadSite, week), all(env, 'SELECT player, stars FROM star_ratings WHERE week = ? AND user_id = ?', week.key, me.u),
    one(env, "SELECT player FROM claims WHERE user_id = ? AND status = 'approved'", me.u),
  ]);
  return {
    week: week.key, closes: week.end, min: MIN_RATERS, self: claim?.player ?? null,
    players, my: Object.fromEntries(mine.map((r) => [r.player, r.stars])), board: await board(env, players), canSeeRaters: can(me, 'ratings.raters'),
  };
}

export async function ratingsRoute(p, method, body, me, env, loadSite, log, url) {
  if (p !== '/api/ratings' && !p.startsWith('/api/ratings/')) return null;
  if (!flagOn(env, me, 'starRatings')) return fail('Not available yet.', 404);
  if (!can(me, 'ratings.give')) return fail('Members only.', 403);
  if (p === '/api/ratings' && method === 'GET') return json(await state(env, me, loadSite));
  if (p === '/api/ratings/player' && method === 'GET') {
    const k = String(url?.searchParams.get('k') ?? '');
    const out = await starSummary(env, k);
    if (can(me, 'ratings.raters')) {
      const raters = await all(env, 'SELECT user_id, name, week, stars, at FROM star_ratings WHERE player = ? ORDER BY at DESC LIMIT 60', k);
      out.raterList = raters.map((r) => ({ id: r.user_id, n: r.name, week: r.week, stars: r.stars, at: r.at }));
    }
    return json(out);
  }
  if (p === '/api/ratings/rate' && method === 'POST') {
    const week = weekOf(Date.now());
    const stars = Number(body.stars);
    if (!Number.isInteger(stars) || stars < 0 || stars > 5) return fail('Give 1 to 5 stars.');
    const pl = (await loadSite('players')).find((x) => x.k === String(body.player ?? '') && x.home);
    if (!pl) return fail('Pick a NOREX player.');
    if ((await one(env, "SELECT player FROM claims WHERE user_id = ? AND status = 'approved'", me.u))?.player === pl.k) return fail('No rating yourself 😉');
    if (!stars) await run(env, 'DELETE FROM star_ratings WHERE week = ? AND user_id = ? AND player = ?', week.key, me.u, pl.k);
    else {
      const already = await one(env, 'SELECT 1 FROM star_ratings WHERE week = ? AND user_id = ? AND player = ?', week.key, me.u, pl.k);
      await run(env, `INSERT INTO star_ratings (week, user_id, player, stars, name, at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (week, user_id, player) DO UPDATE SET stars = excluded.stars, at = excluded.at`, week.key, me.u, pl.k, stars, me.n, Date.now());
      await log(env, me, 'star-rate', `${pl.n} · ${stars}★`);
      if (!already) await awardPoints(env, me.u, 'community', 2, `Rated ${pl.n}`); // P11.3 – only a first rating this week, not changing stars
    }
    return json(await state(env, me, loadSite));
  }
  return fail('Not found', 404);
}
