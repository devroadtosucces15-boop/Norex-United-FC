// Predictions game (roadmap P3.8). Members predict our score for scheduled match nights; the night is scored on its first
// match – the first League match in the event window (EA data), or for Rush sessions the first confirmed Rush result that day.
//   GET  /api/predict          members: open nights (my pick, how many picked), locked nights (everyone's picks), recent
//                              results with points, leaderboards (month, season, all-time)
//   POST /api/predict          members: { event, gf, ga } – changeable until kick-off; gf = null takes it back
// Points: exact score 3 · right result + goal difference 2 · right result 1. A season starts on 1 September (UTC).
// scoreDue(env) runs on the cron and lazily on GET; a night without a match within a week is void (no points).
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';
import { EVENT_TYPES, localDate } from './events.js';
import { awardPoints } from './points.js';

const MIN = 60e3, DAY = 86400e3;
export const LEAGUE_TYPES = ['league', 'playoffs', 'friendly'];
const TYPES = [...LEAGUE_TYPES, 'rush'];
const AHEAD = 21 * DAY, VOID_AFTER = 7 * DAY;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;
const siteJson = (env, file) => fetch(`${String(env.SITE_URL).replace(/\/?$/, '/')}api/${file}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);

const sign = (x) => Math.sign(x);
export function points(p, r) {
  if (p.gf === r.gf && p.ga === r.ga) return 3;
  if (sign(p.gf - p.ga) !== sign(r.gf - r.ga)) return 0;
  return p.gf - p.ga === r.gf - r.ga ? 2 : 1;
}
export const RULES = [[3, 'Exact score'], [2, 'Right result + goal difference'], [1, 'Right result']];
export function seasonStart(ms = Date.now()) {
  const d = new Date(ms), y = d.getUTCMonth() >= 8 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return { start: Date.UTC(y, 8, 1), label: `${y}/${String(y + 1).slice(2)}` };
}
const monthStart = (ms = Date.now()) => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); };
const endOf = (e) => e.start + e.duration * MIN;
const modeOf = (type) => (type === 'rush' ? 'rush' : 'league');

// ---------- scoring ----------
// The match a night is scored on, 'void', or null (not known yet).
async function resultFor(env, ev, club) {
  if (ev.type === 'rush') {
    const days = [...new Set([localDate(ev.start, ev.tz), localDate(endOf(ev), ev.tz)])];
    const m = await one(env, `SELECT id, gf, ga, opponent FROM rush_matches WHERE status = 'confirmed' AND date IN (${marks(days.length)}) ORDER BY id LIMIT 1`, ...days);
    if (m) return { gf: m.gf, ga: m.ga, opp: m.opponent, ref: `rush:${m.id}` };
    return Date.now() > endOf(ev) + VOID_AFTER ? 'void' : null;
  }
  const from = ev.start - 30 * MIN, to = endOf(ev) + 90 * MIN;
  const list = (club?.matches ?? []).map((m) => ({ ...m, t: m.ts * 1000 }));
  const m = list.filter((x) => x.t >= from && x.t <= to).sort((a, b) => a.t - b.t)[0];
  if (m) return { gf: m.gf, ga: m.ga, opp: m.opp, ref: `league:${m.id}` };
  // Data already runs past the window (a later match is in) and nothing was played → nothing to score on.
  if (list.some((x) => x.t > to) && Date.now() > to) return 'void';
  return Date.now() > endOf(ev) + VOID_AFTER ? 'void' : null;
}
export async function scoreDue(env, loadSite = (f) => siteJson(env, f)) {
  if (!env.DB) return { scored: 0 };
  const due = await all(env, `SELECT e.* FROM events e WHERE e.status = 'scheduled' AND e.start + e.duration * 60000 < ?
    AND e.id IN (SELECT DISTINCT event_id FROM predictions) AND e.id NOT IN (SELECT event_id FROM prediction_results) ORDER BY e.start LIMIT 10`, Date.now());
  if (!due.length) return { scored: 0 };
  const club = due.some((e) => e.type !== 'rush') ? await loadSite('club').catch(() => null) : null;
  let scored = 0;
  for (const ev of due) {
    const r = await resultFor(env, ev, club);
    if (!r) continue;
    const preds = await all(env, 'SELECT user_id, gf, ga FROM predictions WHERE event_id = ?', ev.id);
    const at = Date.now();
    if (r === 'void') {
      await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO prediction_results (event_id, status, at) VALUES (?, 'void', ?)").bind(ev.id, at),
        env.DB.prepare('UPDATE predictions SET points = 0 WHERE event_id = ?').bind(ev.id)]);
      continue;
    }
    const pts = preds.map((p) => [p.user_id, points(p, r)]);
    const ins = await run(env, "INSERT OR IGNORE INTO prediction_results (event_id, status, gf, ga, opp, match_ref, at) VALUES (?, 'scored', ?, ?, ?, ?, ?)", ev.id, r.gf, r.ga, r.opp ?? null, r.ref, at);
    if (!ins.meta?.changes) continue; // someone else scored it first
    await env.DB.batch(pts.map(([u, n]) => env.DB.prepare('UPDATE predictions SET points = ? WHERE event_id = ? AND user_id = ?').bind(n, ev.id, u)));
    await Promise.all(pts.filter(([, n]) => n > 0).map(([u, n]) => awardPoints(env, u, 'community', n, 'Correct prediction'))); // P11.3
    scored++;
    const title = ev.title || EVENT_TYPES[ev.type]?.[1] || 'Match night';
    for (const n of [3, 2, 1, 0]) {
      const ids = pts.filter(([, x]) => x === n).map(([u]) => u);
      if (ids.length) await safely(notify(env, ids, { type: 'predict', icon: n === 3 ? '🎯' : '🔮', title: `${title}: ${r.gf}–${r.ga}${r.opp ? ` vs ${r.opp}` : ''} · you scored ${n} point${n === 1 ? '' : 's'}${n === 3 ? ' – exact!' : ''}`, link: 'members.html#predict' }));
    }
  }
  return { scored };
}

// ---------- reading ----------
async function boards(env) {
  const q = (from) => all(env, `SELECT p.user_id AS id, MAX(p.name) AS n, MAX(p.avatar) AS a, SUM(p.points) AS pts, COUNT(*) AS played, SUM(p.points = 3) AS exact
    FROM predictions p JOIN prediction_results r ON r.event_id = p.event_id AND r.status = 'scored' JOIN events e ON e.id = p.event_id
    WHERE e.start >= ? GROUP BY p.user_id ORDER BY pts DESC, exact DESC, played ASC LIMIT 20`, from);
  const season = seasonStart();
  const [month, seasonRows, allTime] = await Promise.all([q(monthStart()), q(season.start), q(0)]);
  const out = (rows) => rows.map((r) => ({ id: r.id, n: r.n, a: opt(r.a), pts: r.pts, played: r.played, exact: r.exact }));
  return { month: out(month), season: out(seasonRows), all: out(allTime), seasonLabel: season.label };
}
// Month board for the Leaders page (P4.5): points from nights played in that month.
export async function predictionMonth(env, from, to) {
  const rows = await all(env, `SELECT p.user_id AS id, MAX(p.name) AS n, MAX(p.avatar) AS a, SUM(p.points) AS pts, SUM(p.points = 3) AS exact
    FROM predictions p JOIN prediction_results r ON r.event_id = p.event_id AND r.status = 'scored' JOIN events e ON e.id = p.event_id
    WHERE e.start >= ? AND e.start < ? GROUP BY p.user_id ORDER BY pts DESC, exact DESC LIMIT 10`, from, to);
  return rows.map((r) => ({ id: r.id, n: r.n, a: opt(r.a), pts: r.pts, exact: r.exact }));
}

const evOut = (e) => ({ id: e.id, type: e.type, mode: modeOf(e.type), title: e.title || EVENT_TYPES[e.type]?.[1], start: e.start, end: endOf(e), tz: e.tz });
async function state(env, me, loadSite) {
  await scoreDue(env, loadSite).catch((e) => console.log('prediction scoring failed', e.message));
  const now = Date.now();
  const [open, locked, recent] = await Promise.all([
    all(env, `SELECT * FROM events WHERE status = 'scheduled' AND type IN (${marks(TYPES.length)}) AND start > ? AND start < ? ORDER BY start LIMIT 8`, ...TYPES, now, now + AHEAD),
    all(env, `SELECT * FROM events WHERE status = 'scheduled' AND type IN (${marks(TYPES.length)}) AND start <= ? AND id NOT IN (SELECT event_id FROM prediction_results)
      AND id IN (SELECT event_id FROM predictions) ORDER BY start DESC LIMIT 5`, ...TYPES, now),
    all(env, 'SELECT e.*, r.status AS r_status, r.gf AS r_gf, r.ga AS r_ga, r.opp AS r_opp, r.at AS r_at FROM prediction_results r JOIN events e ON e.id = r.event_id ORDER BY e.start DESC LIMIT 8'),
  ]);
  const ids = [...open, ...locked, ...recent].map((e) => e.id);
  const preds = ids.length ? await all(env, `SELECT * FROM predictions WHERE event_id IN (${marks(ids.length)}) ORDER BY points DESC, at`, ...ids) : [];
  const of = (id) => preds.filter((p) => p.event_id === id);
  const pick = (p) => p && { gf: p.gf, ga: p.ga, points: opt(p.points) };
  const everyone = (id) => of(id).map((p) => ({ id: p.user_id, n: p.name, a: opt(p.avatar), gf: p.gf, ga: p.ga, points: opt(p.points) }));
  return {
    open: open.map((e) => ({ ...evOut(e), mine: pick(of(e.id).find((p) => p.user_id === me.u)) ?? null, count: of(e.id).length })),
    locked: locked.map((e) => ({ ...evOut(e), mine: pick(of(e.id).find((p) => p.user_id === me.u)) ?? null, picks: everyone(e.id) })),
    recent: recent.map((e) => ({ ...evOut(e), result: { status: e.r_status, gf: opt(e.r_gf), ga: opt(e.r_ga), opp: opt(e.r_opp), at: e.r_at }, mine: pick(of(e.id).find((p) => p.user_id === me.u)) ?? null, picks: everyone(e.id) })),
    boards: await boards(env), rules: RULES,
  };
}

export async function predictRoute(p, method, body, me, env, loadSite, log) {
  if (p !== '/api/predict') return null;
  if (!flagOn(env, me, 'predictions')) return fail('Not available yet.', 404);
  if (!can(me, 'predict.play')) return fail('Members only.', 403);
  if (method === 'GET') return json(await state(env, me, loadSite));
  if (method !== 'POST') return fail('Not found', 404);
  const ev = await one(env, `SELECT * FROM events WHERE id = ? AND status = 'scheduled' AND type IN (${marks(TYPES.length)})`, Number(body.event) || 0, ...TYPES);
  if (!ev) return fail('Pick a match night.', 404);
  if (ev.start <= Date.now()) return fail('Kick-off has passed – predictions are locked.', 409);
  if (body.gf == null) {
    await run(env, 'DELETE FROM predictions WHERE event_id = ? AND user_id = ?', ev.id, me.u);
    return json(await state(env, me, loadSite));
  }
  const gf = Number(body.gf), ga = Number(body.ga);
  if (![gf, ga].every((x) => Number.isInteger(x) && x >= 0 && x <= 20)) return fail('Enter a score from 0 to 20.');
  await run(env, `INSERT INTO predictions (event_id, user_id, name, avatar, gf, ga, at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (event_id, user_id) DO UPDATE SET gf = excluded.gf, ga = excluded.ga, at = excluded.at, name = excluded.name, avatar = excluded.avatar`, ev.id, me.u, me.n, me.a ?? null, gf, ga, Date.now());
  await log(env, me, 'predict', `${ev.title || EVENT_TYPES[ev.type][1]} · ${gf}–${ga}`);
  return json(await state(env, me, loadSite));
}
