// Locker Room (redesign BE2, board 07) – one batched summary for the club's shared "front page":
//   GET /api/locker   members: next event + my RSVP + who's in, this week's award vote + deadline,
//                      unread notification count, achievements unlocked since I last saw them
// The data here already exists (events, awards, notifications, achievements) – this just batches it into
// one round trip instead of four. Flag `locker`.
import { flagOn } from './roles.js';
import { weekOf } from './awards.js';
import { counts as notifyCounts } from './notify.js';
import { ACHIEVEMENTS } from './badges.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const opt = (v) => v ?? undefined;
const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

async function nextEvent(env, me) {
  const e = await one(env, "SELECT * FROM events WHERE status = 'scheduled' AND start + duration * 60000 > ? ORDER BY start LIMIT 1", Date.now());
  if (!e) return null;
  const rsvps = await all(env, 'SELECT user_id, status, name, avatar FROM event_rsvps WHERE event_id = ? ORDER BY at', e.id);
  const yes = rsvps.filter((r) => r.status === 'yes');
  return {
    id: e.id, type: e.type, title: opt(e.title), start: e.start, duration: e.duration, tz: e.tz,
    mine: rsvps.find((r) => r.user_id === me.u)?.status ?? null,
    in: yes.slice(0, 24).map((r) => ({ id: r.user_id, n: r.name, a: opt(r.avatar) })), inCount: yes.length,
  };
}
async function openVote(env, me) {
  const week = weekOf(Date.now());
  const mine = await one(env, 'SELECT COUNT(*) AS n FROM award_votes WHERE week = ? AND user_id = ?', week.key, me.u);
  return { week: week.key, closes: week.end, voted: mine.n > 0 };
}
async function newAchievements(env, me) {
  const rows = await all(env, 'SELECT id, at FROM achievements WHERE user_id = ? AND seen = 0 ORDER BY at DESC LIMIT 10', me.u);
  return rows.filter((r) => ACH[r.id]).map((r) => ({ id: r.id, icon: ACH[r.id].icon, name: ACH[r.id].name, tier: ACH[r.id].tier, at: r.at }));
}

// WebSocket upgrade for the Locker room – called from members.js with the session already unsealed from `?t=`.
// Same shape as hubSocket/chatSocket: the session and the flag are checked before anything is opened.
export async function lockerSocket(request, env, me) {
  if (request.headers.get('Upgrade') !== 'websocket') return fail('Expected a WebSocket.', 426);
  if (!env.CLUB_ROOM) return fail('The Locker Room is not set up yet.', 503);
  if (!me || !flagOn(env, me, 'locker')) return fail('Not available yet.', 404);
  const q = new URLSearchParams({ u: me.u, n: me.n || 'Member' });
  const room = env.CLUB_ROOM.get(env.CLUB_ROOM.idFromName('locker'));
  return room.fetch(new Request(`https://room/ws?${q}`, { headers: request.headers }));
}

// Logged-in route – called from members.js route() for paths it doesn't own.
export async function lockerRoute(p, method, me, env) {
  if (p !== '/api/locker') return null;
  if (!flagOn(env, me, 'locker')) return fail('Not available yet.', 404);
  if (method !== 'GET') return fail('Not found', 404);
  const [next, vote, counts, achievements] = await Promise.all([nextEvent(env, me), openVote(env, me), notifyCounts(env, me), newAchievements(env, me)]);
  return json({ next, vote, unread: counts.unread, achievements });
}
