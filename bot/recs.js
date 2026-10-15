// "Who to play with tonight" (roadmap P3.6). The Worker gathers the signals; the ranking itself (web/recs.js, NXRecs.rank)
// runs in the browser, where League results together are also worked out from api/squad.json.
//   GET /api/recs?mode=league|rush   members: me + every other member with their positions, play times, today's availability,
//                                    tonight's event answer / check-in, my own Rush teammate picks, Rush results together
// Only *my* teammate picks are used – other members' picks stay private (P3.5).
import { can, flagOn } from './roles.js';

const HOUR = 3600e3, MIN = 60e3;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const parse = (s, fb) => { try { return s ? JSON.parse(s) ?? fb : fb; } catch { return fb; } };
const opt = (v) => v ?? undefined;
const TYPES = { league: ['league', 'playoffs', 'friendly'], rush: ['rush'] };

async function state(env, me, mode) {
  const now = Date.now(), today = new Date(now).toISOString().slice(0, 10);
  const types = TYPES[mode];
  const [people, avail, tonight, prefs] = await Promise.all([
    all(env, `SELECT u.id, u.name, u.avatar, u.last_at, c.player, c.player_name, p.positions, p.rush_positions, p.tz, p.play_times
      FROM users u LEFT JOIN claims c ON c.user_id = u.id AND c.status = 'approved' LEFT JOIN profiles p ON p.user_id = u.id ORDER BY u.last_at DESC LIMIT 300`),
    all(env, 'SELECT user_id, status FROM availability WHERE date = ?', today),
    one(env, `SELECT id, type, title, start, duration FROM events WHERE status = 'scheduled' AND type IN (${types.map(() => '?').join(',')})
      AND start < ? AND start + duration * 60000 > ? ORDER BY start LIMIT 1`, ...types, now + 12 * HOUR, now),
    one(env, 'SELECT ranks FROM rush_prefs WHERE user_id = ?', me.u),
  ]);
  const [rsvps, checkins] = tonight ? await Promise.all([
    all(env, 'SELECT user_id, status FROM event_rsvps WHERE event_id = ?', tonight.id),
    all(env, 'SELECT user_id FROM event_checkins WHERE event_id = ?', tonight.id),
  ]) : [[], []];
  const self = people.find((p) => p.id === me.u);
  // Rush results together: confirmed matches where my player and theirs were both in the five.
  const together = mode === 'rush' && self?.player ? await all(env, `SELECT b.player, COUNT(*) AS games, SUM(m.gf > m.ga) AS wins, SUM(m.gf = m.ga) AS draws
    FROM rush_players a JOIN rush_players b ON b.match_id = a.match_id AND b.player != a.player AND b.player != ''
    JOIN rush_matches m ON m.id = a.match_id AND m.status = 'confirmed' WHERE a.player = ? GROUP BY b.player`, self.player) : [];
  const av = new Map(avail.map((r) => [r.user_id, r.status]));
  const rs = new Map(rsvps.map((r) => [r.user_id, r.status]));
  const on = new Set(checkins.map((r) => r.user_id));
  const picks = parse(prefs?.ranks, []);
  const out = (p) => ({
    id: p.id, n: p.name, a: opt(p.avatar), last: opt(p.last_at), player: opt(p.player), playerName: opt(p.player_name),
    pos: parse(mode === 'rush' ? p.rush_positions : p.positions, []), tz: opt(p.tz || undefined), playTimes: parse(p.play_times, null),
    avail: opt(av.get(p.id)), rsvp: opt(rs.get(p.id)), checkedIn: on.has(p.id) || undefined, myPick: picks.includes(p.id) ? picks.indexOf(p.id) : undefined,
  });
  return {
    mode, now, me: self ? out(self) : { id: me.u, n: me.n, pos: [] },
    tonight: tonight ? { id: tonight.id, type: tonight.type, title: opt(tonight.title), start: tonight.start, end: tonight.start + tonight.duration * MIN } : null,
    people: people.filter((p) => p.id !== me.u).map(out),
    together: Object.fromEntries(together.map((t) => [t.player, { games: t.games, wins: t.wins, draws: t.draws }])),
  };
}

export async function recsRoute(p, method, body, me, env, url) {
  if (p !== '/api/recs') return null;
  if (!flagOn(env, me, 'recommendations')) return fail('Not available yet.', 404);
  if (!can(me, 'recs.view')) return fail('Members only.', 403);
  if (method !== 'GET') return fail('Not found', 404);
  const mode = url?.searchParams.get('mode') === 'rush' ? 'rush' : 'league';
  return json(await state(env, me, mode));
}
