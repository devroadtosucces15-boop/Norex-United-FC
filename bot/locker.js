// Locker Room (redesign BE2, board 07) – one batched summary for the club's shared "front page":
//   GET /api/locker   members: next event + my RSVP + who's in, this week's award vote + deadline,
//                      unread notification count, achievements unlocked since I last saw them,
//                      my top medals (board 07 "achievements as medals") and my 3 latest alerts
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
const marks = (n) => Array(n).fill('?').join(',');
const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };

async function nextEvent(env, me) {
  const e = await one(env, "SELECT * FROM events WHERE status = 'scheduled' AND start + duration * 60000 > ? ORDER BY start LIMIT 1", Date.now());
  if (!e) return null;
  const rsvps = await all(env, 'SELECT user_id, status, name, avatar FROM event_rsvps WHERE event_id = ? ORDER BY at', e.id);
  const yes = rsvps.filter((r) => r.status === 'yes');
  const plays = await tonightPlays(env, me, e);
  return {
    id: e.id, type: e.type, title: opt(e.title), start: e.start, duration: e.duration, tz: e.tz,
    mine: rsvps.find((r) => r.user_id === me.u)?.status ?? null,
    in: yes.slice(0, 24).map((r) => ({ id: r.user_id, n: r.name, a: opt(r.avatar) })), inCount: yes.length,
    plays,
  };
}
// Board 08 → 07: the plays a manager pinned to this night (published only), each with my learned state – an assigned
// play I haven't ticked is `todo`. Only when the Tactics Studio is visible to me, so a hidden feature never leaks.
async function tonightPlays(env, me, e) {
  let ids = [];
  try { ids = JSON.parse(e.plays || '[]'); } catch { /* bad json → none */ }
  if (!Array.isArray(ids) || !ids.length || !flagOn(env, me, 'tactics')) return [];
  const list = await all(env, `SELECT id, title, category FROM plays WHERE id IN (${marks(ids.length)}) AND published = 1 AND archived = 0`, ...ids);
  const mine = list.length ? await all(env, `SELECT play_id, learned FROM play_assign WHERE user_id = ? AND play_id IN (${marks(list.length)})`, me.u, ...list.map((p) => p.id)) : [];
  const by = new Map(mine.map((a) => [a.play_id, !!a.learned]));
  return ids.map((id) => list.find((p) => p.id === id)).filter(Boolean)
    .map((p) => ({ id: p.id, title: p.title, category: opt(p.category), assigned: by.has(p.id), learned: by.get(p.id) === true }));
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

// Board 07 medal shelf: everything I've unlocked, rarest first then newest – top 5 shown, the rest counted.
async function medals(env, me) {
  const rows = (await all(env, 'SELECT id, at FROM achievements WHERE user_id = ?', me.u)).filter((r) => ACH[r.id]);
  rows.sort((a, b) => RANK[ACH[b.id].tier] - RANK[ACH[a.id].tier] || b.at - a.at);
  return { count: rows.length, total: ACHIEVEMENTS.length, top: rows.slice(0, 5).map((r) => ({ id: r.id, icon: ACH[r.id].icon, name: ACH[r.id].name, tier: ACH[r.id].tier, at: r.at })) };
}
// Board 07 badges: Playbook = published plays assigned to me that I haven't ticked as learned; builds = my saved builds.
async function playbookCount(env, me) {
  if (!flagOn(env, me, 'tactics')) return 0;
  const r = await one(env, 'SELECT COUNT(*) AS n FROM play_assign a JOIN plays p ON p.id = a.play_id WHERE a.user_id = ? AND a.learned = 0 AND p.published = 1 AND p.archived = 0', me.u);
  return r?.n || 0;
}
async function buildsCount(env, me) {
  if (!flagOn(env, me, 'builder')) return 0;
  const r = await one(env, 'SELECT COUNT(*) AS n FROM builds WHERE user_id = ? AND removed_at IS NULL', me.u);
  return r?.n || 0;
}

// MOTM vote close (flag lockerRoom): a match's vote stays open for 72 h after the final whistle (match `ts` is in
// seconds). Once closed the most-voted player is the winner (ties → higher match rating); no votes → no winner.
export const MOTM_WINDOW_MS = 72 * 3600e3;
export const motmCloses = (m) => (Number(m.ts) || 0) * 1000 + MOTM_WINDOW_MS;
export const motmClosed = (m, now = Date.now()) => !!m.ts && now >= motmCloses(m);
export async function motmStatus(env, loadSite) {
  const matches = ((await loadSite('club'))?.matches || []).slice(0, 3);
  if (!matches.length) return [];
  const rows = await all(env, `SELECT match_id, player FROM votes WHERE match_id IN (${marks(matches.length)})`, ...matches.map((m) => String(m.id)));
  const now = Date.now();
  return matches.map((m) => {
    const tally = {};
    for (const r of rows) if (r.match_id === String(m.id)) tally[r.player] = (tally[r.player] || 0) + 1;
    const closed = motmClosed(m, now);
    let winner = null;
    if (closed) {
      const top = (m.ps || []).filter((p) => tally[p.k]).sort((a, b) => tally[b.k] - tally[a.k] || (b.r ?? 0) - (a.r ?? 0))[0];
      if (top) winner = { k: top.k, n: top.n, pos: opt(top.pos), r: opt(top.r), votes: tally[top.k], tie: Object.values(tally).filter((v) => v === tally[top.k]).length > 1 };
    }
    return { id: m.id, closes: motmCloses(m), closed, winner };
  });
}
async function latestAlerts(env, me) {
  const rows = await all(env, 'SELECT id, icon, title, link, at, read_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 3', me.u);
  return rows.map((r) => ({ id: r.id, icon: opt(r.icon), title: r.title, link: opt(r.link), at: r.at, read: !!r.read_at }));
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
export async function lockerRoute(p, method, me, env, loadSite) {
  if (p !== '/api/locker') return null;
  if (!flagOn(env, me, 'locker')) return fail('Not available yet.', 404);
  if (method !== 'GET') return fail('Not found', 404);
  const [next, vote, counts, achievements, shelf, alerts, playbook, builds, motm] = await Promise.all([nextEvent(env, me), openVote(env, me), notifyCounts(env, me), newAchievements(env, me), medals(env, me), latestAlerts(env, me),
    playbookCount(env, me), buildsCount(env, me), loadSite && flagOn(env, me, 'lockerRoom') ? motmStatus(env, loadSite).catch(() => []) : []]);
  return json({ next, vote, unread: counts.unread, achievements, medals: shelf, alerts, playbook, builds, motm });
}
