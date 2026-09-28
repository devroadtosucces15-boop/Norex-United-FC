// Leaderboards (roadmap P4.5) and hall of fame (P4.6) – the member-data parts. The EA-based tables are static
// (scripts/leaders-page.mjs); this adds what only the member API knows.
//   GET  /api/hof             public – legends + history moments (flag hallOfFame); canManage for managers
//   POST /api/hof             managers – induct a legend or add a moment
//   POST /api/hof/remove      managers – take one down (kept with removed_at)
//   GET  /api/leaders?month=  members – squad boards for a month: attendance, MOTM vote wins, votes cast (flag leaders)
import { can, flagOn } from './roles.js';
import { predictionMonth } from './predict.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const opt = (v) => v ?? undefined;
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + 'T00:00:00Z'));
const MAX_ENTRIES = 300;

const hofOut = (r) => ({ id: r.id, kind: r.kind, k: opt(r.player), n: r.name, title: opt(r.title), text: opt(r.text), date: opt(r.date), by: opt(r.by_name), at: r.at });

export async function getHof(env, me) {
  const rows = await all(env, 'SELECT * FROM hof WHERE removed_at IS NULL ORDER BY date DESC, id DESC LIMIT ?', MAX_ENTRIES);
  return { legends: rows.filter((r) => r.kind === 'legend').map(hofOut), moments: rows.filter((r) => r.kind === 'moment').map(hofOut), canManage: !!me && can(me, 'hof.manage') };
}

async function addHof(body, me, env, loadSite, log) {
  const kind = body.kind === 'moment' ? 'moment' : body.kind === 'legend' ? 'legend' : null;
  if (!kind) return fail('Pick a legend or a moment.');
  const count = (await one(env, 'SELECT COUNT(*) AS n FROM hof WHERE removed_at IS NULL')).n;
  if (count >= MAX_ENTRIES) return fail('The hall of fame is full – remove an old entry first.', 429);
  let player = null;
  let name = clean(body.name, 60);
  if (kind === 'legend' && body.player) {
    const pl = (await loadSite('players').catch(() => [])).find((x) => x.k === String(body.player));
    if (!pl) return fail('That player is not on the site.');
    player = pl.k; name = pl.n;
  }
  if (name.length < 2) return fail(kind === 'legend' ? 'Pick a player or type a name.' : 'Give the moment a title.');
  const date = clean(body.date, 10) || new Date().toISOString().slice(0, 10);
  if (!isDate(date)) return fail('Use a real date (YYYY-MM-DD).');
  if (kind === 'moment' && !clean(body.text, 400)) return fail('Say what happened.');
  const r = await run(env, 'INSERT INTO hof (kind, player, name, title, text, date, by_id, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    kind, player, name, clean(body.title, 80) || null, clean(body.text, 400) || null, date, me.u, me.n, Date.now());
  await log(env, me, kind === 'legend' ? 'hof-induct' : 'hof-moment', name);
  return json({ id: r.meta.last_row_id, ...(await getHof(env, me)) });
}

// Squad boards for one month (dates are UTC). Votes count toward the month they were cast in.
export async function squadBoards(env, month, loadSite) {
  const from = Date.parse(month + '-01T00:00:00Z');
  const [y, m] = month.split('-').map(Number);
  const to = Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1);
  const [avail, cast, votes, players] = await Promise.all([
    all(env, `SELECT user_id AS id, MAX(name) AS n, MAX(avatar) AS a, SUM(status = 'yes') AS yes, SUM(status = 'maybe') AS maybe, COUNT(*) AS days
      FROM availability WHERE date >= ? AND date < ? GROUP BY user_id`, `${month}-01`, new Date(to).toISOString().slice(0, 10)),
    all(env, 'SELECT user_id AS id, MAX(name) AS n, MAX(avatar) AS a, COUNT(*) AS votes FROM votes WHERE at >= ? AND at < ? GROUP BY user_id', from, to),
    all(env, 'SELECT match_id, player, COUNT(*) AS n FROM votes WHERE at >= ? AND at < ? GROUP BY match_id, player', from, to),
    loadSite('players').catch(() => []),
  ]);
  // MOTM vote winner per match (a tie crowns everyone tied).
  const top = new Map();
  for (const v of votes) { const t = top.get(v.match_id); if (!t || v.n > t.n) top.set(v.match_id, { n: v.n, ps: [v.player] }); else if (v.n === t.n) t.ps.push(v.player); }
  const wins = new Map();
  for (const t of top.values()) for (const k of t.ps) wins.set(k, (wins.get(k) ?? 0) + 1);
  const nameOf = new Map(players.map((p) => [p.k, p.n]));
  return {
    month,
    attendance: avail.map((r) => ({ id: r.id, n: r.n, a: opt(r.a), yes: r.yes, maybe: r.maybe, days: r.days })).sort((a, b) => b.yes - a.yes || b.maybe - a.maybe),
    voters: cast.map((r) => ({ id: r.id, n: r.n, a: opt(r.a), votes: r.votes })).sort((a, b) => b.votes - a.votes),
    motmVotes: [...wins].map(([k, n]) => ({ k, n: nameOf.get(k) ?? k, wins: n })).sort((a, b) => b.wins - a.wins),
    matchesVoted: top.size,
  };
}

// Routes behind login (called from members.js route()). Returns null when the path isn't ours.
export async function honoursRoute(p, method, body, me, env, loadSite, log, url) {
  if (p === '/api/leaders' && method === 'GET') {
    if (!flagOn(env, me, 'leaders')) return fail('Not available yet.', 404);
    if (!can(me, 'leaders.view')) return fail('Members only.', 403);
    const month = url?.searchParams.get('month') || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return fail('Bad month.');
    const out = await squadBoards(env, month, loadSite);
    const [y, m] = month.split('-').map(Number);
    if (flagOn(env, me, 'awards')) { // P4.1 – weekly award wins of the weeks that belong to this month
      out.awards = (await all(env, `SELECT w.player AS k, MAX(w.name) AS n, COUNT(*) AS wins FROM award_winners w JOIN award_weeks k ON k.week = w.period
        WHERE k.month = ? AND w.player != '' GROUP BY w.player ORDER BY wins DESC LIMIT 10`, month));
    }
    if (flagOn(env, me, 'predictions')) out.predictions = await predictionMonth(env, Date.UTC(y, m - 1, 1), Date.UTC(y, m, 1)); // P3.8
    return json(out);
  }
  if (p === '/api/hof' || p === '/api/hof/remove') {
    if (!flagOn(env, me, 'hallOfFame')) return fail('Not available yet.', 404);
    if (method === 'GET' && p === '/api/hof') return json(await getHof(env, me));
    if (method !== 'POST') return fail('Not found', 404);
    if (!can(me, 'hof.manage')) return fail('Managers only.', 403);
    if (p === '/api/hof') return addHof(body, me, env, loadSite, log);
    const row = await one(env, 'SELECT * FROM hof WHERE id = ? AND removed_at IS NULL', Number(body.id) || 0);
    if (!row) return fail('Entry not found', 404);
    await run(env, 'UPDATE hof SET removed_at = ? WHERE id = ?', Date.now(), row.id);
    await log(env, me, 'hof-remove', row.name);
    return json(await getHof(env, me));
  }
  return null;
}
