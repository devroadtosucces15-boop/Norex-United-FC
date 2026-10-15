// AI lineup recommender (roadmap P11.15) – doesn't add a separate tool: it reuses P11.14's per-player read
// (bot/aiinsights.js's styleTag/bestPosition, via the already-exported insightsFor()) and P3.4's lineup builder
// (bot/events.js's FORMATIONS/POS_OF, the same `lineup`/`formation` shape POST /api/events/lineup already saves).
//   POST /api/events/recommend { id, formation? }   managers: propose a formation + slot assignment for the
//                                                    event's confirmed "yes" RSVPs – a draft the manager still
//                                                    reviews/edits before publishing (flag lineupRec, owner first).
// Only League/playoffs/friendly events get a stats-based read – same as /api/insights/player, which only ever
// builds its report from api/squad.json (fromSquad), never Rush – so a Rush night falls back to profile positions.
import { can, flagOn } from './roles.js';
import { FORMATIONS, POS_OF } from './events.js';
import { insightsFor } from './aiinsights.js';
import '../web/scout.js';

const { report, fromSquad } = globalThis.NXScout;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const parse = (s, fb) => { try { return s ? JSON.parse(s) ?? fb : fb; } catch { return fb; } };

const GROUP = (p) => (p === 'GK' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(p) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM', 'MID'].includes(p) ? 'MID' : p ? 'FWD' : null);

// Best position + rating from the member's own match log (P11.14's pure rule-based read) – null if not enough games.
function statsRead(k, squad, players) {
  const names = Object.fromEntries((players ?? []).map((p) => [p.k, p.n]));
  const R = report(k, fromSquad(squad), { tracked: players ?? [], names, mode: 'league' });
  if (!R.enough) return null;
  const { style, best } = insightsFor(R);
  return best ? { grp: best.grp, rating: best.rating, games: best.games, style } : null;
}

// Greedy fill: each slot takes the highest-rated unplaced candidate whose best group matches (pass 1), then
// leftover slots take whoever's left, best-rated first, regardless of group (pass 2 – nobody sits out over a mismatch).
function fillSlots(slots, candidates) {
  const pool = [...candidates].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  const used = new Set(), filled = new Set(), lineup = {};
  for (const { slot, grp } of slots) {
    const pick = pool.find((c) => !used.has(c.id) && c.grp === grp);
    if (!pick) continue;
    lineup[pick.id] = slot; used.add(pick.id); filled.add(slot);
  }
  for (const { slot } of slots) {
    if (filled.has(slot)) continue;
    const pick = pool.find((c) => !used.has(c.id));
    if (!pick) continue;
    lineup[pick.id] = slot; used.add(pick.id); filled.add(slot);
  }
  return lineup;
}

export async function recommendRoute(p, method, body, me, env, log, loadSite) {
  if (p !== '/api/events/recommend') return null;
  if (!can(me, 'events.manage')) return fail('Managers only.', 403);
  if (!flagOn(env, me, 'lineupRec')) return fail('Not available yet.', 404);
  if (method !== 'POST') return fail('Not found', 404);
  const row = await one(env, "SELECT * FROM events WHERE id = ? AND status = 'scheduled'", Number(body.id) || 0);
  if (!row) return fail('That event is not on.', 404);
  const formation = FORMATIONS[body.formation] ? body.formation : (FORMATIONS[row.formation] ? row.formation : '4-3-3');
  const mode = row.type === 'rush' ? 'rush' : 'league';
  const yes = await all(env, `SELECT r.user_id AS id, c.player, p.positions, p.rush_positions
    FROM event_rsvps r LEFT JOIN claims c ON c.user_id = r.user_id AND c.status = 'approved' LEFT JOIN profiles p ON p.user_id = r.user_id
    WHERE r.event_id = ? AND r.status = 'yes'`, row.id);
  if (!yes.length) return json({ formation, lineup: {}, reasons: {} });
  const squad = mode === 'league' ? await loadSite('squad') : null;
  const players = mode === 'league' ? await loadSite('players') : null;
  const candidates = yes.map((u) => {
    const stats = mode === 'league' && u.player ? statsRead(u.player, squad, players) : null;
    const profPos = parse(mode === 'rush' ? u.rush_positions : u.positions, [])[0] ?? null;
    return { id: u.id, grp: stats?.grp ?? GROUP(profPos) ?? 'MID', rating: stats?.rating ?? null, games: stats?.games ?? 0, style: stats?.style ?? null };
  });
  const slots = FORMATIONS[formation].map(([slot]) => ({ slot, grp: GROUP(POS_OF(slot)) }));
  const lineup = fillSlots(slots, candidates);
  const reasons = Object.fromEntries(Object.entries(lineup).map(([uid, slot]) => {
    const c = candidates.find((x) => x.id === uid);
    return [uid, c?.rating != null
      ? `Rated ${c.rating.toFixed(1)} avg over ${c.games} game${c.games === 1 ? '' : 's'} as ${c.grp}${c.style ? ` · ${c.style}` : ''}`
      : `Placed by usual position${c?.style ? ` · ${c.style}` : ''} – not enough games logged yet for a stats-based read`];
  }));
  await log(env, me, 'event-lineup-suggest', `${formation} · ${Object.keys(lineup).length} players`);
  return json({ formation, lineup, reasons });
}
