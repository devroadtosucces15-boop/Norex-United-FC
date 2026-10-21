// Match operations (roadmap P3.1 scheduling, P3.2 availability 2.0, P3.7 session check-in & live match night).
//   GET  /api/events                 members: upcoming (60 days) + recent (14 days) events with everyone's answers,
//                                    my "usually on at this time" hints (P2.2 play times)            (flag `events`)
//   GET  /api/events/public          anyone: the next public events – home page "next match night" strip
//   GET  /api/events/calendar?month=YYYY-MM  members: one month's events + my answers + type colours, one call (BE11)
//   POST /api/events                 managers: create (optionally repeat weekly, notify, post to Discord) or edit
//   POST /api/events/cancel          managers: cancel { id, reason } – people who said yes/maybe are told
//   POST /api/events/rsvp            members: { ids: [...], status: yes | maybe | no | clear } – bulk, like day availability
//   GET  /api/events/discord         managers: channels + roles to post to (shared with P5.3)
//   POST /api/events/checkin         members, during the night: "I'm on" { id, on, trial }       (flag `matchNight`)
//   POST /api/events/lineup          managers: quick lineup { id, lineup: { <discord id>: 'CB' } }
//   POST /api/events/plays           managers: { id, plays: [playId…] } – pin up to 4 published plays for that night (board 08)
//   GET  /api/events/:id/lineup/ws   managers: live Dugout – a nudge on room 'lineup:<id>' when the line-up, a yes/no or a check-in changes
//   GET  /api/events/report?id=      members: session report – results that night (League from EA, confirmed Rush),
//                                    team + player grades A+–F, position trials vs season average, attendance
//   POST /api/events/report/post     managers: share the report (notify who came, optional Discord post)
//   POST /api/events/report/poster?id=  managers, raw PNG body: upload the client-rendered report poster to R2
//                                    (BE11) – the report embed's Discord image once uploaded
// P3.3: the Discord post carries ✅ ❔ ❌ buttons (bot/worker.js → eventButton) that write the same answers, its counts
// stay live (refreshEventPost after every answer), and eventReminders() – run by the 10-minute cron – posts T-24h / T-2h
// reminders and nudges members who haven't answered (event.remind: dm = bell + DM · mention = @ in the channel · off).
import { can, flagOn, flags } from './roles.js';
import { notify, notifyMembers, safely, mutedFor } from './notify.js';
import { notifTiming } from './notifcenter.js';
import { broadcastRoom } from './clubroom.js';
import { POSITIONS } from './profiles.js';
import { discordTargets, postEmbed } from './docs.js';
import { message, header, text, sep, facts, footer, buttons, side, thumb, toLegacy, cards, RESULT_ICON, bannerUrl, lineupUrl } from './ui.js';
import { facesOf } from './faces.js';
import { awardPoints } from './points.js';
import { getBotSettings } from './settings.js';
import { routeNotification } from './routing.js';
import { recommendRoute } from './lineuprec.js';
import { hex } from './media.js';

const REMIND = ['dm', 'mention', 'off'];

const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;
// 3rd element (BE11) is a per-type calendar colour, on-theme with the crest red.
export const EVENT_TYPES = {
  league: ['🏆', 'League night', '#c8352c'], rush: ['⚡', 'Rush session', '#e08a1e'], playoffs: ['🥇', 'Playoffs', '#caa63b'],
  friendly: ['🤝', 'Friendly', '#3f8f5f'], trial: ['🧭', 'Trial session', '#3a7bd5'], training: ['🎯', 'Training', '#7a5fc9'],
};
const STATUSES = ['yes', 'maybe', 'no'];
const RED = 0xc8352c;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanText = (s, max) => String(s ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;
const parse = (s, fb) => { try { return JSON.parse(s) ?? fb; } catch { return fb; } };

// ---------- time zones (no libraries: Intl gives the wall clock in any zone) ----------
const parts = (ms, tz) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  .formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
const offsetAt = (ms, tz) => { const p = parts(ms, tz); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000; };
export const validZone = (tz) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$|^UTC$/.test(tz); } catch { return false; } };
// Wall-clock date + time in `tz` → UTC ms (two passes settle daylight-saving edges).
export function zonedToUtc(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, h, mi);
  const first = wall - offsetAt(wall, tz);
  return wall - offsetAt(first, tz);
}
export const localDate = (ms, tz) => { const p = parts(ms, tz); return `${p.year}-${p.month}-${p.day}`; };
const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
// P2.2 play times: 7 ints Mon..Sun, bit h = usually plays at hour h in the member's own zone.
export function usuallyOn(profile, ms) {
  const pt = parse(profile?.play_times, null);
  if (!Array.isArray(pt) || !profile?.tz || !validZone(profile.tz)) return null;
  const p = parts(ms, profile.tz);
  return !!((pt[WD[p.weekday]] >> +p.hour) & 1);
}

// ---------- reading ----------
const rsvpOut = (r, profiles, mode) => {
  const pf = profiles.get(r.user_id);
  return { id: r.user_id, n: r.name, a: opt(r.avatar), s: r.status, first: r.first_at ?? r.at, pos: parse(mode === 'rush' ? pf?.rush_positions : pf?.positions, []) };
};
// BE3: ready-check breakdown for a published lineup – each slot's answer (yes/maybe/no/unanswered) + check-in,
// plus "subs" (said yes but not in the lineup). Learned % per play needs the Tactics Studio (BE1, not built yet).
function readyCheck(lineup, formation, rs, cs, people) {
  if (!Object.keys(lineup).length) return undefined;
  const order = (FORMATIONS[formation] ?? []).map((x) => x[0]);
  const byId = new Map(rs.map((r) => [r.user_id, r]));
  const checkedIn = new Set(cs.map((c) => c.user_id));
  const nameOf = (uid) => byId.get(uid)?.name ?? people.get(uid)?.n ?? 'Member';
  const avatarOf = (uid) => byId.get(uid)?.avatar ?? people.get(uid)?.a;
  const slots = Object.entries(lineup).sort((a, b) => order.indexOf(a[1]) - order.indexOf(b[1]))
    .map(([uid, slot]) => ({ slot, pos: POS_OF(slot), id: uid, n: nameOf(uid), a: opt(avatarOf(uid)), status: byId.get(uid)?.status ?? 'unanswered', checkedIn: checkedIn.has(uid) }));
  const subs = rs.filter((r) => r.status === 'yes' && !lineup[r.user_id]).map((r) => ({ id: r.user_id, n: r.name, a: opt(r.avatar) }));
  const counts = { yes: 0, maybe: 0, no: 0, unanswered: 0 };
  for (const s of slots) counts[s.status]++;
  return { slots, subs, counts };
}
const eventOut = (r, rs, cs, profiles, manager, people = new Map(), plays = new Map()) => ({
  id: r.id, type: r.type, title: opt(r.title), start: r.start, duration: r.duration, end: r.start + r.duration * MIN, tz: r.tz,
  notes: opt(r.notes), needs: parse(r.needs, {}), public: !!r.public, status: r.status, cancelReason: opt(r.cancel_reason),
  by: opt(r.by_name), at: r.at, editedBy: opt(r.edited_by), editedAt: opt(r.edited_at), series: opt(r.series), lineup: parse(r.lineup, {}),
  rsvps: rs.map((x) => rsvpOut(x, profiles, r.type)), checkins: cs.map((x) => ({ id: x.user_id, n: x.name, a: opt(x.avatar), trial: opt(x.trial), at: x.at })),
  // P3.4: names for lineup players who haven't answered / checked in (e.g. withdrew after being picked)
  lineupPeople: Object.fromEntries(Object.keys(parse(r.lineup, {})).filter((id) => !rs.some((x) => x.user_id === id) && !cs.some((x) => x.user_id === id) && people.has(id)).map((id) => [id, people.get(id)])),
  ready: manager ? readyCheck(parse(r.lineup, {}), r.formation, rs, cs, people) : undefined, // BE3 – managers only
  reportAt: opt(r.report_at), remind: r.remind ?? 'dm', formation: opt(r.formation), lineupAt: opt(r.lineup_at), ...(manager ? { posted: !!r.discord_msg } : {}),
  reportPoster: opt(r.report_poster), // BE11 – R2 key of the uploaded report poster, if any
  plays: parse(r.plays, []).map((id) => plays.get(id)).filter(Boolean), // board 08 – plays for tonight (managers also get who's assigned/learned)
});
async function load(env, where, args, me) {
  const rows = await all(env, `SELECT * FROM events WHERE ${where} ORDER BY start LIMIT 120`, ...args);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [rs, cs] = await Promise.all([
    all(env, `SELECT * FROM event_rsvps WHERE event_id IN (${marks(ids.length)}) ORDER BY COALESCE(first_at, at)`, ...ids),
    all(env, `SELECT * FROM event_checkins WHERE event_id IN (${marks(ids.length)}) ORDER BY at`, ...ids),
  ]);
  const users = [...new Set(rs.map((x) => x.user_id))];
  const profiles = new Map(users.length ? (await all(env, `SELECT user_id, positions, rush_positions FROM profiles WHERE user_id IN (${marks(users.length)})`, ...users)).map((p) => [p.user_id, p]) : []);
  const manager = !!me && can(me, 'events.manage');
  const inLineups = [...new Set(rows.flatMap((r) => Object.keys(parse(r.lineup, {}))))];
  const people = new Map(inLineups.length ? (await all(env, `SELECT id, name, avatar FROM users WHERE id IN (${marks(inLineups.length)})`, ...inLineups)).map((u) => [u.id, { n: u.name, a: opt(u.avatar) }]) : []);
  const plays = await pinnedPlays(env, rows, manager);
  return rows.map((r) => eventOut(r, rs.filter((x) => x.event_id === r.id), cs.filter((x) => x.event_id === r.id), profiles, manager, people, plays));
}
// Board 08: titles of the plays pinned to these events (still published only); managers also get who's assigned / learned.
async function pinnedPlays(env, rows, manager) {
  const ids = [...new Set(rows.flatMap((r) => parse(r.plays, [])))];
  if (!ids.length) return new Map();
  const list = await all(env, `SELECT id, title, category FROM plays WHERE id IN (${marks(ids.length)}) AND published = 1 AND archived = 0`, ...ids);
  const asg = manager && list.length ? await all(env, `SELECT play_id, user_id, learned FROM play_assign WHERE play_id IN (${marks(list.length)})`, ...list.map((p) => p.id)) : [];
  return new Map(list.map((p) => [p.id, { id: p.id, title: p.title, category: p.category,
    ...(manager ? { assigned: asg.filter((a) => a.play_id === p.id).map((a) => a.user_id), learned: asg.filter((a) => a.play_id === p.id && a.learned).map((a) => a.user_id) } : {}) }]));
}
async function playsRoute(body, me, env, log) {
  if (!can(me, 'events.manage')) return fail('Managers only.', 403);
  const row = await one(env, "SELECT * FROM events WHERE id = ? AND status = 'scheduled'", Number(body.id) || 0);
  if (!row) return fail('That event is not on.', 404);
  if (!Array.isArray(body.plays)) return fail('Send a list of plays.');
  const want = [...new Set(body.plays.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (want.length > 4) return fail('Pin up to 4 plays for one night.');
  const ok = want.length ? new Set((await all(env, `SELECT id FROM plays WHERE id IN (${marks(want.length)}) AND published = 1 AND archived = 0`, ...want)).map((p) => p.id)) : new Set();
  if (want.some((id) => !ok.has(id))) return fail('Only published plays can be pinned.');
  await run(env, 'UPDATE events SET plays = ? WHERE id = ?', want.length ? JSON.stringify(want) : null, row.id);
  await log(env, me, 'event-plays', `${label(row)} · ${want.length} play(s)`);
  await pushLineup(env, row.id, 'plays'); // other open Dugouts refresh
  return json(await listFor(env, me));
}
async function listFor(env, me) {
  const now = Date.now();
  const [events, profile] = await Promise.all([
    load(env, 'start > ? AND start < ?', [now - 14 * DAY, now + 60 * DAY], me),
    one(env, 'SELECT tz, play_times FROM profiles WHERE user_id = ?', me.u),
  ]);
  for (const e of events) {
    if (e.status !== 'scheduled' || e.end < now || e.rsvps.some((x) => x.id === me.u)) continue;
    const on = usuallyOn(profile, e.start);
    if (on !== null) e.usual = on;
  }
  return { events, canManage: can(me, 'events.manage'), formations: FORMATIONS, types: EVENT_TYPES, positions: POSITIONS, hasPlayTimes: usuallyOn(profile, now) !== null, matchNight: flagOn(env, me, 'matchNight') };
}
// Squad week in the manager portal (P3.2): the next 7 days' events as columns.
export const weekEvents = (env, me) => load(env, "start > ? AND start < ? AND status = 'scheduled'", [Date.now() - 6 * HOUR, Date.now() + 7 * DAY], me);
// BE11: single-call month view for a calendar grid – events + my own answer + type colours, one round trip.
export async function calendarMonth(env, me, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '')) return { error: 'Bad month.' };
  const [y, m] = month.split('-').map(Number);
  const start = Date.UTC(y, m - 1, 1), end = Date.UTC(y, m, 1);
  const events = await load(env, 'start >= ? AND start < ?', [start, end], me);
  return {
    events: events.map((e) => ({ ...e, mine: e.rsvps.find((r) => r.id === me.u)?.s ?? null })),
    types: Object.fromEntries(Object.entries(EVENT_TYPES).map(([k, [emoji, label, colour]]) => [k, { emoji, label, colour }])),
  };
}
export async function publicEvents(env) {
  const rows = await all(env, "SELECT id, type, title, start, duration, tz, lineup, formation, lineup_at, lineup_home FROM events WHERE (public = 1 OR lineup_home = 1) AND status = 'scheduled' AND start + duration * 60000 > ? ORDER BY start LIMIT 3", Date.now());
  // A line-up shows only when a manager ticked "post on the home page" while posting it: display names + positions, no ids.
  const onHome = rows.filter((r) => r.lineup_home && r.lineup_at);
  const ids = [...new Set(onHome.flatMap((r) => Object.keys(parse(r.lineup, {}))))];
  const names = ids.length ? new Map((await all(env, `SELECT id, name FROM users WHERE id IN (${marks(ids.length)})`, ...ids)).map((u) => [u.id, u.name])) : new Map();
  const order = (f) => (FORMATIONS[f] ?? []).map((x) => x[0]);
  return { events: rows.map((r) => ({ id: r.id, type: r.type, title: opt(r.title), start: r.start, duration: r.duration, tz: r.tz,
    ...(r.lineup_home && r.lineup_at ? { lineup: { formation: opt(r.formation), at: r.lineup_at, players: Object.entries(parse(r.lineup, {})).sort((a, b) => order(r.formation).indexOf(a[1]) - order(r.formation).indexOf(b[1])).map(([uid, slot]) => ({ n: names.get(uid) ?? 'Member', pos: POS_OF(slot) })) } } : {}) })) };
}

// ---------- writing ----------
const label = (e) => e.title || EVENT_TYPES[e.type][1];
const when = (e) => { const p = parts(e.start, e.tz); return `${p.weekday} ${p.day}/${p.month} ${p.hour}:${p.minute} (${e.tz.replace(/_/g, ' ')})`; };
function readEvent(body, existing) {
  const type = body.type ?? existing?.type;
  if (!EVENT_TYPES[type]) return { error: 'Pick the kind of event.' };
  const tz = String(body.tz ?? existing?.tz ?? 'UTC');
  if (!validZone(tz)) return { error: 'Unknown time zone.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date ?? '') || isNaN(Date.parse(body.date + 'T00:00:00Z'))) return { error: 'Pick a date.' };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time ?? '')) return { error: 'Pick a start time.' };
  const duration = Math.round(Number(body.duration ?? 120));
  if (!(duration >= 15 && duration <= 600)) return { error: 'Length must be between 15 minutes and 10 hours.' };
  const needs = {};
  for (const [k, v] of Object.entries(body.needs && typeof body.needs === 'object' ? body.needs : {})) {
    const n = Math.round(Number(v));
    if (!n) continue;
    if (k === 'players' ? !(n >= 1 && n <= 30) : !POSITIONS.includes(k) || !(n >= 1 && n <= 11)) return { error: 'Check the positions and numbers needed.' };
    needs[k] = n;
  }
  const start = zonedToUtc(body.date, body.time, tz);
  const remind = REMIND.includes(body.remind) ? body.remind : existing?.remind ?? 'dm';
  return { e: { type, tz, duration, start, needs, remind, title: clean(body.title, 80) || null, notes: cleanText(body.notes, 1000) || null, public: body.public ? 1 : 0 } };
}
// P3.3 buttons + reminders ship behind the `discordRsvp` flag (the Discord post is shared, so any level but off shows the
// buttons; eventButton then checks who may press them).
const rsvpButtons = (env) => (flags(env).discordRsvp ?? 'off') !== 'off';
// Discord message for an event: embed with a live timestamp, answers so far, positions still missing + ✅ ❔ ❌ buttons (P3.3).
// The match-night post (design system, bot/ui.js) – shared by /schedule, /nextevent, /availability, the post a manager
// sends from the Squad Hub, its live refresh and the 24 h / 2 h reminders. opts: ping (line above the panel), mentions,
// who (list everyone's answer, for /availability).
export function eventMessage(env, e, rsvps = [], heading = '', { ping = null, mentions, who = false, faces = null } = {}) {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/'), unix = Math.floor(e.start / 1000);
  const needs = typeof e.needs === 'string' ? parse(e.needs, {}) : e.needs ?? {};
  const yes = rsvps.filter((r) => r.status === 'yes'), names = (st) => rsvps.filter((r) => r.status === st).map((r) => r.name);
  const posOf = (r) => parse(e.type === 'rush' ? r.rush_positions : r.positions, [])[0] ?? '';
  const missing = Object.entries(needs).filter(([k]) => k !== 'players').map(([k, v]) => [k, v - yes.filter((r) => parse(e.type === 'rush' ? r.rush_positions : r.positions, [])[0] === k).length]).filter(([, left]) => left > 0);
  const short = needs.players && yes.length < needs.players ? needs.players - yes.length : 0;
  const cancelled = e.status === 'cancelled', done = cancelled || e.start + e.duration * MIN < Date.now();
  const length = e.duration >= 60 ? `${Math.floor(e.duration / 60)} h${e.duration % 60 ? ` ${e.duration % 60} min` : ''}` : `${e.duration} min`;
  const list = (arr) => (arr.length ? `${arr.slice(0, 25).join(', ')}${arr.length > 25 ? ' …' : ''}` : '–');
  const still = [short && `${short} more player${short > 1 ? 's' : ''}`, ...missing.map(([k, left]) => `${left} ${k}`)].filter(Boolean).join(' · ');
  return message({ ping, mentions, accent: cancelled ? 'steel' : 'red', blocks: [
    cancelled ? null : cards(bannerUrl(env, 'matchnight')),
    header({ eyebrow: `NOREX UNITED · ${EVENT_TYPES[e.type][1] ?? 'Match night'}`, title: `${EVENT_TYPES[e.type][0]} ${cancelled ? '🚫 Cancelled · ' : ''}${heading}${label(e)}`.slice(0, 200), sub: `<t:${unix}:F> · <t:${unix}:R> · ${length}` }),
    e.notes ? text(`📝 ${String(e.notes).slice(0, 1500)}`) : null,
    sep(),
    facts([['Answers', `✅ ${yes.length} · ❔ ${names('maybe').length} · ❌ ${names('no').length}`]]),
    // who's in: one row each with their face on the right (card if shipped, else Discord picture – bot/faces.js)
    faces ? yes.slice(0, FACE_ROWS).map((r) => side(`\`${String(rsvps.indexOf(r) + 1).padStart(2)}\` ✅ **${r.name}**${posOf(r) ? ` · ${posOf(r)}` : ''}`, thumb(faces.get(String(r.user_id))))) : null,
    faces && yes.length > FACE_ROWS ? text(`+ ${list(names('yes').slice(FACE_ROWS))}`) : !faces && yes.length ? facts([['In', list(names('yes'))]]) : null,
    who ? facts([[`❔ Maybe (${names('maybe').length})`, list(names('maybe'))], [`❌ Out (${names('no').length})`, list(names('no'))]]) : null,
    still ? facts([['🧩 Still needed', still]]) : null,
    footer(done ? 'This event is closed' : 'Tap a button to answer · only you see the confirmation'),
    buttons([
      ...(done || !rsvpButtons(env) ? [] : [['yes', '✅', 'I’m in', 'ok'], ['maybe', '❔', 'Maybe', 'grey'], ['no', '❌', 'Can’t make it', 'no']].map(([st, emoji, lbl, style]) => ({ label: lbl, emoji, style, id: `norex:ev:${e.id}:${st}` }))),
      { label: 'Match night', url: `${site}hub-matchnight.html` },
    ]),
  ] });
}
// Six rows of faces keeps the post under Discord's 40-component limit with room for the buttons and /schedule's 2nd panel.
const FACE_ROWS = 6;
// eventMessage plus everyone's face – what every caller uses unless it's building a post with no answers yet.
export async function eventPost(env, e, rsvps = [], heading = '', opts = {}) {
  const yes = rsvps.filter((r) => r.status === 'yes').slice(0, FACE_ROWS).map((r) => r.user_id);
  return eventMessage(env, e, rsvps, heading, { ...opts, faces: await facesOf(env, yes) });
}
// Everyone's answer, in the order they FIRST answered (r.at moves on every change, r.first_at does not).
export const rsvpRows = (env, id) => all(env, 'SELECT r.status, r.name, r.user_id, r.first_at, r.at, p.positions, p.rush_positions FROM event_rsvps r LEFT JOIN profiles p ON p.user_id = r.user_id WHERE r.event_id = ? ORDER BY COALESCE(r.first_at, r.at), r.user_id', id);
// Keeps the Discord post's counts in step with the site. Never throws.
export async function refreshEventPost(env, id) {
  try {
    const e = await one(env, 'SELECT * FROM events WHERE id = ?', id);
    if (!e?.discord_msg || !e.discord_channel || !env.DISCORD_BOT_TOKEN) return;
    const msg = await eventPost(env, e, await rsvpRows(env, id), e.series ? 'Weekly · ' : '');
    const patch = (body) => fetch(`https://discord.com/api/v10/channels/${e.discord_channel}/messages/${e.discord_msg}`, {
      method: 'PATCH', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    // posts made before the design system can't always switch layout → keep them up to date in the old embed style
    const r = await patch({ components: msg.components, flags: msg.flags });
    if (!r.ok) await patch(toLegacy(msg));
  } catch (err) { console.log('event post refresh failed', err.message); }
}
// People to tell about a change: everyone who said yes or maybe.
const keen = async (env, id) => (await all(env, "SELECT user_id FROM event_rsvps WHERE event_id = ? AND status IN ('yes', 'maybe')", id)).map((r) => r.user_id);
// The groups a notification rule (bot/routing.js) can aim at for one event.
const eventGroups = (env, e) => ({
  going: () => keen(env, e.id),
  yes: async () => (await rsvpRows(env, e.id)).filter((r) => r.status === 'yes').map((r) => r.user_id),
  unanswered: async () => {
    const answered = new Set((await rsvpRows(env, e.id)).map((r) => r.user_id));
    return (await all(env, 'SELECT id FROM users WHERE last_at > ?', Date.now() - 60 * DAY)).map((u) => u.id).filter((id) => !answered.has(id));
  },
  lineup: async () => Object.keys(parse(e.lineup, {})),
});
// Applies the owner's routing rules for one event action. null = no rules for it, so the caller keeps its built-in behaviour.
const routeEvent = async (env, action, e, n, heading = '') => routeNotification(env, action, {
  notify: n, channel: e.discord_channel || undefined, groups: eventGroups(env, e),
  build: async (o) => eventPost(env, e, await rsvpRows(env, e.id), heading, o),
});

// Where a new event is announced: the channel the form picked, else the bot settings' reminder channel, else the channel
// last posted to. Null (nothing to post to) when none is known.
async function announceTarget(env, pick) {
  const s = await getBotSettings(env);
  const channel = pick?.channel || s.reminderChannel || (await one(env, "SELECT value FROM meta WHERE key = 'announce_channel'"))?.value;
  if (!channel) return null;
  return { channel, role: pick?.channel ? pick.role : (pick?.role ?? s.pingRole) };
}

async function saveEvent(body, me, env, log) {
  if (!can(me, 'events.manage')) return fail('Managers only.', 403);
  const existing = body.id ? await one(env, 'SELECT * FROM events WHERE id = ?', Number(body.id) || 0) : null;
  if (body.id && !existing) return fail('That event no longer exists.', 404);
  const { e, error } = readEvent(body, existing);
  if (error) return fail(error);
  if (!existing && e.start < Date.now() - HOUR) return fail('That time has already passed.');
  const out = {};
  if (existing) {
    const moved = existing.start !== e.start;
    await run(env, `UPDATE events SET type = ?, title = ?, start = ?, duration = ?, tz = ?, notes = ?, needs = ?, public = ?, remind = ?, edited_by = ?, edited_at = ?${moved ? ', remind24_at = NULL, remind2_at = NULL' : ''} WHERE id = ?`,
      e.type, e.title, e.start, e.duration, e.tz, e.notes, JSON.stringify(e.needs), e.public, e.remind, me.n, Date.now(), existing.id);
    await refreshEventPost(env, existing.id);
    out.id = existing.id;
    await log(env, me, 'event-edit', `${label(e)} · ${when(e)}`);
    if (existing.start !== e.start && existing.status === 'scheduled') {
      const n = { type: 'event', nkey: 'event.timechange', vars: { event: label(e), when: when(e) }, icon: '🕒', title: `Time changed: ${label(e)} – now ${when(e)}`, link: 'members.html#schedule' };
      const row = await one(env, 'SELECT * FROM events WHERE id = ?', existing.id);
      const routed = await safely(routeEvent(env, 'event.changed', row, n, '🕒 Time changed · '));
      if (routed) { out.notified = routed.notified; out.discord = routed.posts[0]; }
      else out.notified = await safely(notify(env, await keen(env, existing.id), n)) ?? 0;
    }
  } else {
    const repeat = Math.max(0, Math.min(8, Math.round(Number(body.repeat) || 0)));
    const series = repeat ? `s${Date.now().toString(36)}` : null;
    const ids = [];
    for (let i = 0; i <= repeat; i++) {
      const date = new Date(Date.parse(body.date + 'T12:00:00Z') + i * 7 * DAY).toISOString().slice(0, 10);
      const start = i ? zonedToUtc(date, body.time, e.tz) : e.start;
      const r = await run(env, 'INSERT INTO events (type, title, start, duration, tz, notes, needs, public, remind, series, by_id, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        e.type, e.title, start, e.duration, e.tz, e.notes, JSON.stringify(e.needs), e.public, e.remind, series, me.u, me.n, Date.now());
      ids.push(r.meta.last_row_id);
    }
    out.id = ids[0]; out.created = ids.length;
    await log(env, me, 'event-new', `${label(e)} · ${when(e)}${repeat ? ` · weekly ×${repeat + 1}` : ''}`);
    // The owner's routing rules (Tools → Bot → Notification routing) decide who is told and where it is posted. With no rules for
    // this action: announce by default – players told and the event posted to Discord straight away. A caller opts out with
    // `notify: false` and `discord: false`; `discord: { channel, role }` picks a channel, otherwise the bot settings' reminder
    // channel (or the last one used) and ping role are used.
    const silent = body.notify === false && body.discord === false;
    const created = { ...e, id: ids[0], status: 'scheduled' };
    const whenTxt = `${when(e)}${repeat ? ` (weekly, ${repeat + 1} dates)` : ''}`, notes = e.notes || 'Say if you can make it in the Squad Hub.';
    const n = { type: 'event', nkey: 'event.created', vars: { event: label(e), when: whenTxt, notes }, title: `New: ${label(e)} – ${whenTxt}`, body: notes, link: 'members.html#schedule' };
    const routed = silent ? null : await safely(routeNotification(env, 'event.created', {
      notify: n, groups: eventGroups(env, created), build: (o) => eventMessage(env, created, [], repeat ? 'Weekly · ' : '', o),
    }));
    if (routed) {
      out.notified = routed.notified;
      out.discord = routed.posts[0] ?? (routed.errors[0] ? { ok: false, error: routed.errors[0] } : undefined);
      const first = routed.posts.find((p) => p.ok);
      if (first) await run(env, 'UPDATE events SET discord_channel = ?, discord_msg = ? WHERE id = ?', String(first.channel), first.id ?? null, ids[0]);
    } else {
      if (body.notify !== false) out.notified = await safely(notifyMembers(env, n)) ?? 0;
      const target = body.discord === false ? null : await announceTarget(env, body.discord);
      if (target && can(me, 'announce.discord')) {
        out.discord = await postEmbed(env, target.channel, target.role, eventMessage(env, created, [], repeat ? 'Weekly · ' : ''));
        if (out.discord.ok) await run(env, 'UPDATE events SET discord_channel = ?, discord_msg = ? WHERE id = ?', String(target.channel), out.discord.id ?? null, ids[0]);
      }
    }
  }
  return json({ ...out, ...(await listFor(env, me)) });
}

// One member's answer to one or more events – used by the Squad Hub and the Discord buttons. → rows answered (or [] if none open).
export async function answerEvents(env, me, ids, status) {
  const rows = ids.length ? await all(env, `SELECT id, start, duration, lineup FROM events WHERE id IN (${marks(ids.length)}) AND status = 'scheduled' AND start + duration * 60000 > ?`, ...ids, Date.now()) : [];
  if (!rows.length) return rows;
  const before = new Map((await all(env, `SELECT event_id, status FROM event_rsvps WHERE user_id = ? AND event_id IN (${marks(rows.length)})`, me.u, ...rows.map((r) => r.id))).map((x) => [x.event_id, x.status]));
  const stmts = [], now = Date.now();
  const note = (r, kind) => stmts.push(env.DB.prepare('INSERT INTO event_answer_log (event_id, user_id, name, kind, prev, at) VALUES (?, ?, ?, ?, ?, ?)').bind(r.id, me.u, me.n, kind, before.get(r.id) ?? null, now));
  for (const r of rows) {
    if (status === 'clear') { stmts.push(env.DB.prepare('DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(r.id, me.u)); if (before.has(r.id)) note(r, 'clear'); continue; }
    // first_at is set once, on the first answer, and never moves when the answer changes – it is the order people answered in.
    stmts.push(env.DB.prepare(`INSERT INTO event_rsvps (event_id, user_id, status, name, avatar, at, first_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (event_id, user_id) DO UPDATE SET status = excluded.status, name = excluded.name, avatar = excluded.avatar, at = excluded.at`).bind(r.id, me.u, status, me.n, me.a ?? null, now, now));
    if (before.get(r.id) !== status) note(r, status);
    // "Yes" to an event also counts as "I'm in" that day (attendance boards + streaks read day availability) – never overwrites a day answer.
    if (status === 'yes') stmts.push(env.DB.prepare('INSERT OR IGNORE INTO availability (date, user_id, status, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)').bind(new Date(r.start).toISOString().slice(0, 10), me.u, 'yes', me.n, me.a ?? null, now));
  }
  await env.DB.batch(stmts);
  for (const r of rows) { await refreshEventPost(env, r.id); await refreshCheckinPost(env, r.id); }
  return rows;
}
async function rsvp(body, me, env, log) {
  if (!can(me, 'events.rsvp')) return fail('Members only.', 403);
  const ids = [...new Set((Array.isArray(body.ids) ? body.ids : [body.id]).map(Number).filter(Number.isInteger))].slice(0, 30);
  const status = body.status;
  if (!ids.length || !(STATUSES.includes(status) || status === 'clear')) return fail('Bad answer.');
  const rows = await answerEvents(env, me, ids, status);
  if (!rows.length) return fail('Those events are over or cancelled.', 409);
  await broadcastRoom(env, 'locker', { t: 'locker', why: 'rsvp' }); // BE2: "who's in" changed for everyone
  for (const r of rows) if (hasLineup(r)) await pushLineup(env, r.id, 'rsvp'); // BE3: the ready check moved
  await log(env, me, 'event-rsvp', `${status} · ${rows.length} event${rows.length > 1 ? 's' : ''}`);
  return json(await listFor(env, me));
}

// ---------- P3.7 match night ----------
const liveWindow = (e) => Date.now() > e.start - HOUR && Date.now() < e.start + e.duration * MIN + 2 * HOUR;
const GRADE = (score) => (score >= 88 ? 'A+' : score >= 78 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F');
// Same formula as the site's session cards (sessionsFor in build.mjs): 75 % points per game, 25 % goal difference per game.
export const teamGrade = (w, d, n, gf, ga) => (n ? GRADE(((3 * w + d) / n / 3) * 75 + ((Math.max(-3, Math.min(3, (gf - ga) / n)) + 3) / 6) * 25) : null);
export const playerGrade = (r) => (r == null ? null : r >= 8.5 ? 'A+' : r >= 8 ? 'A' : r >= 7.3 ? 'B' : r >= 6.7 ? 'C' : r >= 6 ? 'D' : 'F');
const round1 = (v) => Math.round(v * 10) / 10;

export async function sessionReport(env, id, loadSite) {
  const ev = (await load(env, 'id = ?', [id], null))[0];
  if (!ev) return null;
  const from = ev.start - 30 * MIN, to = ev.end + 90 * MIN;
  const [club, players, claims] = await Promise.all([
    loadSite('club').catch(() => ({ matches: [] })), loadSite('players').catch(() => []),
    all(env, "SELECT user_id, player FROM claims WHERE status = 'approved'"),
  ]);
  const days = [...new Set([localDate(ev.start, ev.tz), localDate(ev.end, ev.tz)])];
  const rush = await all(env, `SELECT * FROM rush_matches WHERE status = 'confirmed' AND date IN (${marks(days.length)}) ORDER BY id`, ...days);
  const rushPl = rush.length ? await all(env, `SELECT * FROM rush_players WHERE match_id IN (${marks(rush.length)})`, ...rush.map((r) => r.id)) : [];
  const res = (gf, ga) => (gf > ga ? 'W' : gf < ga ? 'L' : 'D');
  const league = (club.matches ?? []).filter((m) => m.ts * 1000 >= from && m.ts * 1000 <= to).sort((a, b) => a.ts - b.ts);
  const results = [
    ...league.map((m) => ({ mode: 'league', res: m.res, gf: m.gf, ga: m.ga, opp: m.opp, url: m.url, at: m.ts * 1000 })),
    ...rush.map((m) => ({ mode: 'rush', res: res(m.gf, m.ga), gf: m.gf, ga: m.ga, opp: m.opponent, at: m.at })),
  ];
  // Per player: EA lines (League) + logged Rush lines, keyed by EA player key (guests by name).
  const byKey = new Map();
  const add = (k, n, r, g, a, motm) => {
    const p = byKey.get(k) ?? { k, n, games: 0, g: 0, a: 0, ratings: [], motm: 0 };
    p.games++; p.g += g; p.a += a; p.motm += motm ? 1 : 0;
    if (r != null && r > 0) p.ratings.push(r);
    byKey.set(k, p);
  };
  for (const m of league) for (const x of m.ps ?? []) add(x.k, x.n, x.r, x.g, x.a, x.mom);
  for (const x of rushPl) add(x.player || `guest:${x.name}`, x.name, x.rating, x.goals, x.assists, x.motm);
  const userOf = new Map(claims.map((c) => [c.player, c.user_id]));
  const who = new Map([...ev.rsvps, ...ev.checkins].map((u) => [u.id, u]));
  const season = new Map(players.map((p) => [p.k, p.s?.r]));
  const trials = new Map(ev.checkins.filter((c) => c.trial).map((c) => [c.id, c.trial]));
  const list = [...byKey.values()].map((p) => {
    const avg = p.ratings.length ? round1(p.ratings.reduce((s, v) => s + v, 0) / p.ratings.length) : null;
    const uid = userOf.get(p.k), u = uid ? who.get(uid) : null;
    const trial = uid && trials.get(uid);
    const base = season.get(p.k);
    return {
      k: p.k.startsWith('guest:') ? undefined : p.k, n: p.n, games: p.games, g: p.g, a: p.a, motm: p.motm, avg, grade: playerGrade(avg),
      ...(u ? { user: { id: u.id, n: u.n, a: u.a } } : {}),
      ...(trial ? { trial: { pos: trial, season: base ? round1(base) : null, diff: base && avg != null ? round1(avg - base) : null } } : {}),
    };
  }).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0) || b.g + b.a - (a.g + a.a));
  const w = results.filter((r) => r.res === 'W').length, d = results.filter((r) => r.res === 'D').length, l = results.length - w - d;
  const gf = results.reduce((s, r) => s + r.gf, 0), ga = results.reduce((s, r) => s + r.ga, 0);
  const yes = ev.rsvps.filter((x) => x.s === 'yes').map((x) => x.id), came = ev.checkins.map((x) => x.id);
  return {
    event: ev, results, team: { games: results.length, w, d, l, gf, ga, grade: teamGrade(w, d, results.length, gf, ga) }, players: list,
    mvp: list.find((p) => p.avg != null) ?? null,
    attendance: { came: came.length, saidYes: yes.length, noShow: ev.rsvps.filter((x) => x.s === 'yes' && !came.includes(x.id)).map((x) => ({ id: x.id, n: x.n, a: x.a })), walkIns: ev.checkins.filter((x) => !yes.includes(x.id)).map((x) => ({ id: x.id, n: x.n, a: x.a })) },
  };
}
function reportEmbed(env, rep, origin, { ping, mentions } = {}) {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/'), e = rep.event, t = rep.team;
  const icon = RESULT_ICON;
  const mvp = rep.mvp ? `⭐ Player of the night: **${rep.mvp.n}** (${rep.mvp.avg} avg${rep.mvp.g ? ` · ${rep.mvp.g} G` : ''}${rep.mvp.a ? ` · ${rep.mvp.a} A` : ''})` : '';
  const graded = rep.players.filter((p) => p.grade).slice(0, 10).map((p) => `\`${p.grade.padEnd(2)}\` ${p.n} · ${p.avg}${p.trial ? ` · 🧪 tried ${p.trial.pos}${p.trial.diff != null ? ` (${p.trial.diff >= 0 ? '+' : ''}${p.trial.diff} vs usual)` : ''}` : ''}`).join('\n');
  return message({ ping, mentions, accent: t.games ? (t.w > t.l ? 'win' : t.w < t.l ? 'loss' : 'gold') : 'red', blocks: [
    header({ eyebrow: 'NOREX UNITED · Match night', title: `📋 Session report · Grade ${t.grade ?? '–'}`, sub: `${label(e)} · <t:${Math.floor(e.start / 1000)}:f>` }),
    e.reportPoster && origin ? cards(`${origin}/media/${e.reportPoster}`) : null, // BE11 – client-rendered poster, if uploaded
    text(t.games ? `**${t.w}W ${t.d}D ${t.l}L** · ${t.gf}–${t.ga}` : 'No results logged for this night yet.'),
    rep.results.length ? text(rep.results.map((r) => `${icon[r.res]} ${r.mode === 'rush' ? '⚡ ' : ''}**${r.gf}–${r.ga}** vs ${r.opp}`).join('\n')) : null,
    mvp ? sep() : null, text(mvp), text(graded),
    sep(),
    footer(`👥 ${rep.attendance.came} checked in · ${rep.attendance.saidYes} said yes`),
    buttons([{ label: 'Full report', url: `${site}members.html#schedule` }]),
  ] });
}

// "I'm on" for one event – the site and the Discord Check in button both come here. Logged (event_answer_log) so the post can show when.
export async function setCheckin(env, me, row, on, trial = null) {
  const already = await one(env, 'SELECT 1 FROM event_checkins WHERE event_id = ? AND user_id = ?', row.id, me.u);
  if (!on) {
    await run(env, 'DELETE FROM event_checkins WHERE event_id = ? AND user_id = ?', row.id, me.u);
    if (already) await run(env, "INSERT INTO event_answer_log (event_id, user_id, name, kind, at) VALUES (?, ?, ?, 'checkout', ?)", row.id, me.u, me.n, Date.now());
  } else {
    await run(env, `INSERT INTO event_checkins (event_id, user_id, name, avatar, trial, at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (event_id, user_id) DO UPDATE SET trial = excluded.trial, name = excluded.name, avatar = excluded.avatar`, row.id, me.u, me.n, me.a ?? null, trial, Date.now());
    if (!already) {
      await run(env, "INSERT INTO event_answer_log (event_id, user_id, name, kind, at) VALUES (?, ?, ?, 'checkin', ?)", row.id, me.u, me.n, Date.now());
      await awardPoints(env, me.u, 'attendance', 5, `Checked in · ${label(row)}`); // P11.3 – only the first check-in for this night
    }
  }
  await refreshCheckinPost(env, row.id);
}
async function nightRoute(p, method, body, me, env, log, loadSite, url) {
  if (!flagOn(env, me, 'matchNight')) return fail('Not available yet.', 404);
  if (p === '/api/events/report' && method === 'GET') {
    if (!can(me, 'events.view')) return fail('Members only.', 403);
    const rep = await sessionReport(env, Number(url?.searchParams.get('id')) || 0, loadSite);
    return rep ? json(rep) : fail('That event no longer exists.', 404);
  }
  if (method !== 'POST') return fail('Not found', 404);
  const row = await one(env, 'SELECT * FROM events WHERE id = ?', Number(body.id) || 0);
  if (!row || row.status !== 'scheduled') return fail('That event is not on.', 404);
  if (p === '/api/events/checkin') {
    if (!can(me, 'events.checkin')) return fail('Members only.', 403);
    if (!liveWindow(row)) return fail('Check-in opens an hour before the start and closes two hours after the end.', 409);
    const trial = body.trial ? String(body.trial) : null;
    if (trial && !POSITIONS.includes(trial)) return fail('Pick a real position to try.');
    await setCheckin(env, me, row, body.on !== false, trial);
    if (hasLineup(row)) await pushLineup(env, row.id, 'checkin'); // BE3: the ready check shows who's on
    await log(env, me, 'event-checkin', `${body.on === false ? 'left' : 'on'}${trial ? ` · trying ${trial}` : ''} · ${label(row)}`);
    return json(await listFor(env, me));
  }
  if (!can(me, 'events.manage')) return fail('Managers only.', 403);
  if (p === '/api/events/report/post') {
    const rep = await sessionReport(env, row.id, loadSite);
    const out = {};
    const people = [...new Set([...rep.event.checkins.map((x) => x.id), ...rep.event.rsvps.filter((x) => x.s === 'yes').map((x) => x.id)])];
    const summary = rep.team.games ? `${rep.team.w}W ${rep.team.d}D ${rep.team.l}L · ${rep.team.gf}–${rep.team.ga}${rep.mvp ? ` · ⭐ ${rep.mvp.n}` : ''}` : null;
    const n = { type: 'event', nkey: 'event.report', vars: { event: label(row), grade: rep.team.grade ?? '–', summary: summary ?? '' }, icon: '📋', title: `Session report: ${label(row)} · Grade ${rep.team.grade ?? '–'}`, body: summary, link: 'members.html#schedule' };
    // a channel picked on the button wins; otherwise the owner's routing rules, otherwise the built-in (players told, no post)
    const routed = body.channel ? null : await safely(routeNotification(env, 'event.report', {
      notify: n, channel: row.discord_channel || undefined, groups: { ...eventGroups(env, row), yes: async () => people, going: async () => people },
      build: (o) => reportEmbed(env, rep, url?.origin, o),
    }));
    if (routed) { out.notified = routed.notified; out.discord = routed.posts[0]; }
    else {
      if (body.channel) out.discord = await postEmbed(env, body.channel, body.role, reportEmbed(env, rep, url?.origin));
      out.notified = await safely(notify(env, people, n)) ?? 0;
    }
    await run(env, 'UPDATE events SET report_at = ? WHERE id = ?', Date.now(), row.id);
    await log(env, me, 'event-report', `${label(row)}${out.discord?.ok ? ' · Discord' : ''}`);
    return json({ ...out, ...(await listFor(env, me)) });
  }
  return fail('Not found', 404);
}

// BE11 – raw PNG body (client-rendered report poster, same canvas technique as the result-card poster PNG).
// Dispatched before JSON body parsing, same shape as mediaUploadRoute (bot/media.js).
export async function reportPosterRoute(request, me, env, url) {
  if (!flagOn(env, me, 'matchNight')) return fail('Not available yet.', 404);
  if (!can(me, 'events.manage')) return fail('Managers only.', 403);
  if (!env.MEDIA) return fail('Poster storage isn’t switched on yet.', 503);
  const id = Number(url.searchParams.get('id')) || 0;
  const row = await one(env, 'SELECT id FROM events WHERE id = ?', id);
  if (!row) return fail('That event no longer exists.', 404);
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'image/png') return fail('PNG only.', 415);
  const len = Number(request.headers.get('Content-Length')) || 0;
  if (!len || !request.body) return fail('That image is empty.', 411);
  if (len > 3e6) return fail('Poster image is too large – under 3 MB please.', 413);
  const buf = new Uint8Array(await request.arrayBuffer());
  if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) return fail('That doesn’t look like a real PNG.', 415);
  const key = `i/${hex(16)}.png`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' } });
  await run(env, 'UPDATE events SET report_poster = ? WHERE id = ?', key, id);
  return json({ key, url: `${url.origin}/media/${key}` });
}

// ---------- before kick-off: the rules every lineup and check-in post repeats ----------
// Real players (not AI) needed to start a session of each type. Types not listed have no minimum posted.
export const MIN_REAL = { league: 6, playoffs: 8 };
export const kickoffNotes = (e) => [
  '⏱️ **Be lined up 10 minutes before the start.** There is a grace period of 5 to 10 minutes. After that we start without you.',
  MIN_REAL[e.type] ? `👥 **${MIN_REAL[e.type]} real players are needed to start.** AI players do not count${e.type === 'league' ? '; playoffs and other tournaments need 8' : ''}. Fewer than ${MIN_REAL[e.type]} by the start time and the session is cancelled or rescheduled.` : null,
].filter(Boolean).join('\n');

// The "Check in now" post (30 minutes before by default): who has checked in, who has not, and the Check in button.
// Players are numbered in the order they FIRST answered.
export function checkinMessage(env, e, rsvps = [], checkins = [], { ping = null, mentions } = {}) {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/'), unix = Math.floor(e.start / 1000);
  const on = new Set(checkins.map((c) => c.user_id)), done = e.status === 'cancelled' || e.start + e.duration * MIN < Date.now();
  const keen = rsvps.filter((r) => r.status !== 'no');
  const here = [...keen.filter((r) => on.has(r.user_id)), ...checkins.filter((c) => !keen.some((r) => r.user_id === c.user_id)).map((c) => ({ user_id: c.user_id, name: c.name, status: 'walk-in' }))];
  const wait = keen.filter((r) => !on.has(r.user_id));
  const rank = new Map(rsvps.map((r, i) => [r.user_id, i + 1]));
  const row = (r) => `${rank.has(r.user_id) ? `\`${String(rank.get(r.user_id)).padStart(2)}\`` : '` +`'} **${r.name}**${r.status === 'maybe' ? ' · maybe' : r.status === 'walk-in' ? ' · walk-in' : ''}`;
  const list = (arr) => (arr.length ? `${arr.slice(0, 25).map(row).join('\n')}${arr.length > 25 ? `\n+ ${arr.length - 25} more` : ''}` : '–');
  return message({ ping, mentions, accent: 'red', blocks: [
    header({ eyebrow: 'NOREX UNITED · CHECK-IN', title: `⏰ Check in now · ${label(e)}`.slice(0, 200), sub: `<t:${unix}:F> · <t:${unix}:R>` }),
    sep(),
    facts([['Checked in', `✅ ${here.length}`], ['Not yet', `${wait.length}`]]),
    text(`-# **CHECKED IN**\n${list(here)}`),
    wait.length ? text(`-# **NOT CHECKED IN – NOT CONSIDERED UNTIL THEY DO**\n${list(wait)}`) : null,
    sep(),
    text(kickoffNotes(e)),
    footer(done ? 'This event is closed' : 'Only players who check in are considered for the lineup'),
    buttons([...(done ? [] : [{ label: 'Check in', emoji: '✅', style: 'ok', id: `norex:ci:${e.id}` }]), { label: 'Match night', url: `${site}hub-matchnight.html` }]),
  ] });
}
// Keeps that post live as people check in or out. Never throws.
export async function refreshCheckinPost(env, id) {
  try {
    const e = await one(env, 'SELECT * FROM events WHERE id = ?', id);
    if (!e?.checkin_msg || !e.discord_channel || !env.DISCORD_BOT_TOKEN) return;
    const msg = checkinMessage(env, e, await rsvpRows(env, id), await all(env, 'SELECT * FROM event_checkins WHERE event_id = ? ORDER BY at', id));
    await fetch(`https://discord.com/api/v10/channels/${e.discord_channel}/messages/${e.checkin_msg}`, {
      method: 'PATCH', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ components: msg.components, flags: msg.flags }),
    });
  } catch (err) { console.log('check-in post refresh failed', err.message); }
}

// ---------- P3.4 lineup builder ----------
// Slots per formation: [slot, x %, y %] (y = 0 at the opponent's goal). Slot keys are unique; POS_OF gives the plain position.
const HAND = {
  '4-3-3': [['GK', 50, 90], ['LB', 14, 70], ['LCB', 37, 75], ['RCB', 63, 75], ['RB', 86, 70], ['LCM', 28, 50], ['CDM', 50, 58], ['RCM', 72, 50], ['LW', 17, 24], ['ST', 50, 15], ['RW', 83, 24]],
  '4-4-2': [['GK', 50, 90], ['LB', 14, 70], ['LCB', 37, 75], ['RCB', 63, 75], ['RB', 86, 70], ['LM', 14, 44], ['LCM', 38, 50], ['RCM', 62, 50], ['RM', 86, 44], ['LS', 38, 18], ['RS', 62, 18]],
  '4-2-3-1': [['GK', 50, 90], ['LB', 14, 70], ['LCB', 37, 75], ['RCB', 63, 75], ['RB', 86, 70], ['LDM', 38, 57], ['RDM', 62, 57], ['LAM', 20, 34], ['CAM', 50, 37], ['RAM', 80, 34], ['ST', 50, 14]],
  '4-1-2-1-2': [['GK', 50, 90], ['LB', 14, 70], ['LCB', 37, 75], ['RCB', 63, 75], ['RB', 86, 70], ['CDM', 50, 60], ['LCM', 30, 47], ['RCM', 70, 47], ['CAM', 50, 34], ['LS', 38, 16], ['RS', 62, 16]],
  '3-5-2': [['GK', 50, 90], ['LCB', 27, 74], ['CB', 50, 77], ['RCB', 73, 74], ['LWB', 11, 50], ['LCM', 34, 50], ['CDM', 50, 58], ['RCM', 66, 50], ['RWB', 89, 50], ['LS', 38, 17], ['RS', 62, 17]],
  '5-3-2': [['GK', 50, 90], ['LWB', 10, 64], ['LCB', 30, 74], ['CB', 50, 77], ['RCB', 70, 74], ['RWB', 90, 64], ['LCM', 30, 48], ['CM', 50, 52], ['RCM', 70, 48], ['LS', 38, 18], ['RS', 62, 18]],
};
// zn10: every FC 27 tactic-builder shape (29, same list as next/data/formations.json), back line first, rows split by ' / '.
// The six hand-placed shapes above keep their slots so lineups already saved for them still load.
const SHAPES = {
  '3-1-4-2': 'LCB CB RCB / CDM / LM LCM RCM RM / LS RS',
  '3-4-1-2': 'LCB CB RCB / LM LCM RCM RM / CAM / LS RS',
  '3-4-2-1': 'LCB CB RCB / LM LCM RCM RM / LF RF / ST',
  '3-5-2': 'LCB CB RCB / LM LDM RDM RM / CAM / LS RS',
  '3-4-3': 'LCB CB RCB / LM LCM RCM RM / LW ST RW',
  '4-1-2-1-2': 'LB LCB RCB RB / CDM / LCM RCM / CAM / LS RS',
  '4-1-2-1-2 (2)': 'LB LCB RCB RB / CDM / LM RM / CAM / LS RS',
  '4-1-3-2': 'LB LCB RCB RB / CDM / LM CM RM / LS RS',
  '4-1-4-1': 'LB LCB RCB RB / CDM / LM LCM RCM RM / ST',
  '4-2-1-3': 'LB LCB RCB RB / LDM RDM / CAM / LW ST RW',
  '4-2-2-2': 'LB LCB RCB RB / LDM RDM / LAM RAM / LS RS',
  '4-2-3-1': 'LB LCB RCB RB / LDM RDM / LAM CAM RAM / ST',
  '4-2-3-1 (2)': 'LB LCB RCB RB / LDM RDM / LM CAM RM / ST',
  '4-2-4': 'LB LCB RCB RB / LCM RCM / LW LS RS RW',
  '4-3-1-2': 'LB LCB RCB RB / LCM CM RCM / CAM / LS RS',
  '4-3-2-1': 'LB LCB RCB RB / LCM CM RCM / LF RF / ST',
  '4-3-3': 'LB LCB RCB RB / LCM CM RCM / LW ST RW',
  '4-3-3 (2)': 'LB LCB RCB RB / LCM CDM RCM / LW ST RW',
  '4-3-3 (3)': 'LB LCB RCB RB / LDM CM RCM / LW ST RW',
  '4-3-3 (4)': 'LB LCB RCB RB / LCM CAM RCM / LW ST RW',
  '4-4-1-1 (2)': 'LB LCB RCB RB / LM LCM RCM RM / CF / ST',
  '4-4-2': 'LB LCB RCB RB / LM LCM RCM RM / LS RS',
  '4-4-2 (2)': 'LB LCB RCB RB / LM LDM RDM RM / LS RS',
  '4-5-1': 'LB LCB RCB RB / LM LCM CM RCM RM / ST',
  '4-5-1 (2)': 'LB LCB RCB RB / LM LDM CAM RDM RM / ST',
  '5-2-1-2': 'LWB LCB CB RCB RWB / LCM RCM / CAM / LS RS',
  '5-2-3': 'LWB LCB CB RCB RWB / LCM RCM / LW ST RW',
  '5-3-2': 'LWB LCB CB RCB RWB / LCM CM RCM / LS RS',
  '5-4-1': 'LWB LCB CB RCB RWB / LM LCM RCM RM / ST',
};
const WIDE = new Set(['LB', 'RB', 'LWB', 'RWB', 'LM', 'RM', 'LW', 'RW']);
const place = (spec) => {
  const rows = spec.split(' / ').map((r) => r.split(' ')), out = [['GK', 50, 90]];
  rows.forEach((row, i) => {
    const y = Math.round(75 - (i * 59) / (rows.length - 1)), step = row.length >= 5 ? 19 : row.length === 4 ? 24 : row.length === 3 ? 26 : 24;
    row.forEach((slot, j) => {
      let x = Math.round(50 + (j - (row.length - 1) / 2) * step);
      if (WIDE.has(slot) && row.length <= 3) x = slot[0] === 'L' ? 14 : 86;
      out.push([slot, x, WIDE.has(slot) && i < rows.length - 1 ? y - 4 : y]);
    });
  });
  return out;
};
export const FORMATIONS = Object.fromEntries(Object.keys({ ...SHAPES, ...HAND }).sort().map((k) => [k, HAND[k] ?? place(SHAPES[k])]));
export const POS_OF = (slot) => ({ LCB: 'CB', RCB: 'CB', LCM: 'CM', RCM: 'CM', LDM: 'CDM', RDM: 'CDM', LAM: 'CAM', RAM: 'CAM', LS: 'ST', RS: 'ST', LF: 'CF', RF: 'CF' })[slot] ?? slot;
// { lineup, formation } from a request – formation slots, or plain positions for a quick list (formation = null).
function readLineup(body) {
  const formation = body.formation ? String(body.formation) : null;
  if (formation && !FORMATIONS[formation]) return { error: 'Unknown formation.' };
  const slots = formation ? FORMATIONS[formation].map((x) => x[0]) : POSITIONS;
  const lineup = {}, used = new Set();
  for (const [uid, slot] of Object.entries(body.lineup && typeof body.lineup === 'object' ? body.lineup : {}).slice(0, 30)) {
    if (!slot) continue;
    if (!/^\d{1,25}$/.test(uid) || !slots.includes(slot)) return { error: 'Check the lineup.' };
    if (formation && used.has(slot)) return { error: `Two players are in ${slot}.` };
    used.add(slot); lineup[uid] = slot;
  }
  return { lineup, formation };
}
// The line-up post for a channel (group look: banner, the XI by line, tags in the line above the panel). The DM each starter gets is
// a different, personal layout (notify.js dmMessage).
const LINES = [['GK', ['GK']], ['Defence', ['CB', 'LB', 'RB', 'LWB', 'RWB']], ['Midfield', ['CDM', 'CM', 'CAM', 'LM', 'RM']], ['Attack', ['LW', 'RW', 'CF', 'ST']]];
function lineupEmbed(env, e, lineup, names, tagged = new Set(), { suggested = false, bench = [], mins = 30 } = {}) {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/'), order = (FORMATIONS[e.formation] ?? []).map((x) => x[0]);
  const rows = Object.entries(lineup).sort((a, b) => order.indexOf(a[1]) - order.indexOf(b[1]));
  const who = ([uid]) => (tagged.has(uid) ? `<@${uid}>` : `**${names.get(uid) ?? 'Member'}**`);
  const byLine = LINES.map(([name, pos]) => [name, rows.filter(([, slot]) => pos.includes(POS_OF(slot)))]);
  const rest = rows.filter(([, slot]) => !LINES.some(([, pos]) => pos.includes(POS_OF(slot))));
  const unix = Math.floor(e.start / 1000);
  return message({
    accent: 'red',
    ping: tagged.size ? `**🧩 ${suggested ? 'Suggested line-up' : 'Line-up is out'} · ${label(e)}**\n${[...tagged].map((u) => `<@${u}>`).join(' ')}` : null,
    mentions: tagged.size ? { parse: [], users: [...tagged] } : { parse: [] },
    blocks: [
      cards(lineupUrl(env, e.formation) ?? bannerUrl(env, 'matchnight')),   // field view: the shape's pitch (names below)
      header({ eyebrow: 'NOREX UNITED · Match night', title: `🧩 ${e.formation ?? 'Starting XI'}`, sub: `${label(e)} · <t:${unix}:F> · <t:${unix}:R>` }),
      sep(),
      ...[...byLine, ['Others', rest]].filter(([, r]) => r.length).map(([name, r]) => text(`-# **${name.toUpperCase()}**\n${r.map(([uid, slot]) => `\`${POS_OF(slot).padEnd(3)}\` ${who([uid])}`).join('\n')}`)),
      bench.length ? text(`-# **BENCH · IN THE ORDER THEY ANSWERED**\n${bench.slice(0, 15).map((b) => `\`${String(b.rank).padStart(2)}\` **${b.name}** · ${b.status === 'maybe' ? '❔ maybe' : '✅ in'}`).join('\n')}`) : null,
      sep(),
      suggested ? text(`📝 **This is a suggested lineup.** It was picked from the answers so far.\n⏰ **Check in ${mins} minutes before kick-off.** Anyone who has not checked in will not be considered.`) : null,
      text(kickoffNotes(e)),
      footer(`${rows.length} starting${bench.length ? ` · ${bench.length} on the bench` : ''} · Play Style per position in the Handbook`),
      buttons([{ label: 'Match night', url: `${site}hub-matchnight.html` }]),
    ],
  });
}
async function lineupRoute(p, method, body, me, env, log) {
  if (p === '/api/events/templates') {
    if (method === 'GET') return json({ templates: (await all(env, 'SELECT * FROM lineup_templates ORDER BY name LIMIT 50')).map((t) => ({ id: t.id, name: t.name, formation: t.formation, slots: parse(t.slots, {}), by: opt(t.by_name), at: t.at })) });
    const name = clean(body.name, 40), formation = String(body.formation ?? '');
    if (name.length < 2) return fail('Give the template a name.');
    if (!FORMATIONS[formation]) return fail('Unknown formation.');
    const valid = new Set(FORMATIONS[formation].map((x) => x[0]));
    const slots = Object.fromEntries(Object.entries(body.slots && typeof body.slots === 'object' ? body.slots : {}).filter(([slot, uid]) => valid.has(slot) && /^\d{1,25}$/.test(String(uid))));
    const had = await one(env, 'SELECT id FROM lineup_templates WHERE lower(name) = lower(?)', name);
    if (!had && (await one(env, 'SELECT COUNT(*) AS n FROM lineup_templates')).n >= 50) return fail('That’s 50 templates – delete one first.', 429);
    if (had) await run(env, 'UPDATE lineup_templates SET formation = ?, slots = ?, by_name = ?, at = ? WHERE id = ?', formation, JSON.stringify(slots), me.n, Date.now(), had.id);
    else await run(env, 'INSERT INTO lineup_templates (name, formation, slots, by_name, at) VALUES (?, ?, ?, ?, ?)', name, formation, JSON.stringify(slots), me.n, Date.now());
    await log(env, me, 'lineup-template', `${name} · ${formation}`);
    return lineupRoute(p, 'GET', {}, me, env, log);
  }
  if (p === '/api/events/templates/delete') {
    await run(env, 'DELETE FROM lineup_templates WHERE id = ?', Number(body.id) || 0);
    return lineupRoute('/api/events/templates', 'GET', {}, me, env, log);
  }
  // POST /api/events/lineup { id, formation?, lineup, publish?, channel?, role?, dm?, tag?, home?, preview? }
  //   dm      – tell each starter their position (bell + DM, per their own notification settings). Omitted = yes (older callers).
  //   channel – a Discord channel id to post the line-up in; tag = @-tag the starters there (not those who muted match-night alerts).
  //   home    – show the line-up on the public home page (events.lineup_home).
  //   preview – answer who would be told and tagged, and change nothing.
  const row = await one(env, "SELECT * FROM events WHERE id = ? AND status = 'scheduled'", Number(body.id) || 0);
  if (!row) return fail('That event is not on.', 404);
  const { lineup, formation, error } = readLineup(body);
  if (error) return fail(error);
  const ids = Object.keys(lineup);
  const wantDm = body.dm === undefined ? true : !!body.dm;
  const channel = body.channel || (body.discord !== false ? row.discord_channel : null) || null;
  if (body.preview) {
    const muted = await mutedFor(env, ids, 'event');
    return json({ preview: { players: ids.length, dm: wantDm ? ids.filter((u) => !muted.has(u)) : [], tag: channel && body.tag ? ids.filter((u) => !muted.has(u)) : [], muted: [...muted], channel: channel ?? null, home: !!body.home } });
  }
  const publish = !!body.publish && ids.length > 0;
  const homeSet = publish && typeof body.home === 'boolean' ? (body.home ? 1 : 0) : null;
  await run(env, `UPDATE events SET lineup = ?, formation = ?${publish ? ', lineup_at = ?' : ''}${homeSet === null ? '' : ', lineup_home = ?'} WHERE id = ?`, JSON.stringify(lineup), formation, ...(publish ? [Date.now()] : []), ...(homeSet === null ? [] : [homeSet]), row.id);
  await log(env, me, publish ? 'event-lineup-publish' : 'event-lineup', `${label(row)}${formation ? ` · ${formation}` : ''} · ${ids.length} players${publish ? `${wantDm ? ' · DM' : ''}${channel ? ' · channel' : ''}${homeSet ? ' · home' : ''}` : ''}`);
  await pushLineup(env, row.id, publish ? 'publish' : 'draft'); // BE3: other managers with the builder open refresh
  const out = {};
  if (publish) {
    const names = new Map((await all(env, `SELECT id, name FROM users WHERE id IN (${marks(ids.length)})`, ...ids)).map((u) => [u.id, u.name]));
    for (const r of await all(env, 'SELECT user_id, name FROM event_rsvps WHERE event_id = ?', row.id)) if (!names.has(r.user_id)) names.set(r.user_id, r.name);
    // Everyone told their own position (one notification each – the text differs).
    let told = 0;
    if (wantDm) for (const uid of ids) told += (await safely(notify(env, [uid], { type: 'event', icon: '🧩', title: `You’re starting at ${POS_OF(lineup[uid])} – ${label(row)} · ${when(row)}`, body: formation ? `Formation ${formation}. Check the Play Style for your position.` : null, link: 'hub-matchnight.html', ref: `lineup:${row.id}:${Date.now()}` }))) ?? 0;
    out.notified = told;
    if (channel && can(me, 'announce.discord')) {
      const muted = body.tag ? await mutedFor(env, ids, 'event') : new Set();
      const tagged = body.tag ? new Set(ids.filter((u) => !muted.has(u))) : new Set();
      // Published before check-in opens = a suggestion until people check in; the bench is everyone who said yes or maybe and isn't starting.
      const mins = await notifTiming(env, 'event.start30', 'mins');
      const answers = await rsvpRows(env, row.id);
      const bench = answers.map((r, i) => ({ rank: i + 1, name: r.name, status: r.status, id: r.user_id })).filter((b) => b.status !== 'no' && !lineup[b.id]).sort((a, b) => (a.status === 'yes' ? 0 : 1) - (b.status === 'yes' ? 0 : 1) || a.rank - b.rank);
      const suggested = body.final === true ? false : body.suggested === true || row.start - Date.now() > mins * MIN;
      out.discord = await postEmbed(env, channel, body.role, lineupEmbed(env, { ...row, formation }, lineup, names, tagged, { suggested, bench, mins }));
      out.tagged = tagged.size;
    }
    if (homeSet !== null) out.home = !!homeSet;
  }
  return json({ ...out, ...(await listFor(env, me)) });
}

// ---------- BE3 live Dugout ----------
// Room 'lineup:<id>' (bot/clubroom.js). The wire carries only *what* changed: the open builder re-reads GET /api/events,
// so the manager-only ready check never travels over a socket.
const hasLineup = (row) => Object.keys(parse(row.lineup, {})).length > 0;
export const lineupRoom = (id) => `lineup:${Number(id)}`;
export const pushLineup = (env, id, kind) => broadcastRoom(env, lineupRoom(id), { t: 'lineup', id: Number(id), kind, at: Date.now() });

// WebSocket upgrade – called from members.js with the session already unsealed from `?t=`. Managers and the owner only
// (the ready check is manager data); the room is broadcast-only, so a socket can't write anything.
export async function lineupSocket(request, env, me, id) {
  if (request.headers.get('Upgrade') !== 'websocket') return fail('Expected a WebSocket.', 426);
  if (!me || !flagOn(env, me, 'events')) return fail('Not available yet.', 404);
  if (!can(me, 'events.manage')) return fail('Managers only.', 403);
  if (!env.CLUB_ROOM) return fail('Live updates are not set up yet.', 503);
  if (!/^\d{1,9}$/.test(String(id)) || Number(id) < 1) return fail('Not found', 404);
  const q = new URLSearchParams({ u: me.u, n: me.n || 'Manager' });
  const room = env.CLUB_ROOM.get(env.CLUB_ROOM.idFromName(lineupRoom(id)));
  return room.fetch(new Request(`https://room/ws?${q}`, { headers: request.headers }));
}

// ---------- BE4: nudge a short position ----------
// Managers, from the Dugout squad view: DM/push only the members who play a short position and haven't
// answered yet – a targeted version of the T-24h/T-2h cron reminder (eventReminders), fired on demand.
async function nudgeRoute(body, me, env, log) {
  if (!can(me, 'events.manage')) return fail('Managers only.', 403);
  const row = await one(env, "SELECT * FROM events WHERE id = ? AND status = 'scheduled'", Number(body.id) || 0);
  if (!row) return fail('That event is not on.', 404);
  const position = String(body.position ?? '');
  if (!POSITIONS.includes(position)) return fail('Pick a position.');
  const answered = new Set((await all(env, 'SELECT user_id FROM event_rsvps WHERE event_id = ?', row.id)).map((r) => r.user_id));
  const col = row.type === 'rush' ? 'rush_positions' : 'positions';
  const rows = await all(env, `SELECT p.user_id, p.${col} AS pos FROM profiles p JOIN users u ON u.id = p.user_id WHERE u.last_at > ?`, Date.now() - 120 * DAY);
  const ids = rows.filter((r) => !answered.has(r.user_id) && parse(r.pos, []).includes(position)).map((r) => r.user_id);
  if (!ids.length) return fail('Nobody to nudge – everyone who plays there has answered, or nobody has that position set.', 409);
  const notified = await safely(notify(env, ids, { type: 'event', icon: '📣', title: `Can you make it? ${label(row)} – short on ${position}`, body: when(row), link: 'members.html#schedule' })) ?? 0;
  await log(env, me, 'event-nudge', `${label(row)} · ${position} · ${notified} nudged`);
  return json({ notified, ...(await listFor(env, me)) });
}

// ---------- P3.3 reminders (10-minute cron) ----------
// T-24h and T-2h: a reminder in the event's Discord channel ("7 ✅ – need a GK", with the answer buttons) and a nudge for
// members who haven't answered yet – bell + DM (remind = dm) or an @mention in that channel (remind = mention).
// Events scheduled less than 2 h ahead only get the T-2h one. Each fires once (remind24_at / remind2_at).
// Owner-set minutes before (default 30): everyone who said ✅ gets the site alert + Discord DM (their "Events" alert setting, DM + site by default) and is
// tagged by name in the event's channel post. Once per event (meta `remind30:<id>`); owner/manager-only while `discordRsvp` is.
export async function thirtyMinutes(env, now, everyone) {
  const mins = await notifTiming(env, 'event.start30', 'mins'); // owner-set in the Notification Center (default 30)
  const rows = await all(env, "SELECT * FROM events WHERE status = 'scheduled' AND start > ? AND start <= ? ORDER BY start LIMIT 5", now, now + mins * 60e3);
  let sent = 0;
  for (const e of rows) {
    const key = `remind30:${e.id}`;
    const r = await run(env, 'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING', key, String(now));
    if (!r.meta?.changes) continue;
    const answers = await rsvpRows(env, e.id), yes = answers.filter((x) => x.status === 'yes');
    const routed = await safely(routeEvent(env, 'event.starting', e, { type: 'event', nkey: 'event.start30', vars: { mins, event: label(e) }, icon: '⏰', title: `Starting in ${mins} minutes · ${label(e)}`, body: 'Get ready – the lobby is about to open.', link: `members.html#schedule-${e.id}`, ref: `event30:${e.id}` }, '⏰ '));
    if (routed) { sent++; continue; }
    if (!yes.length && !answers.some((x) => x.status === 'maybe')) continue;
    const ids = yes.map((x) => x.user_id);
    await safely(notify(env, ids, { type: 'event', nkey: 'event.start30', vars: { mins, event: label(e) }, icon: '⏰', title: `Starting in ${mins} minutes · ${label(e)}`, body: 'You said you are in – get ready.', link: `members.html#schedule-${e.id}`, ref: `event30:${e.id}` }));
    if (everyone && e.discord_channel && env.DISCORD_BOT_TOKEN) {
      const tags = answers.filter((x) => x.status !== 'no').map((x) => x.user_id).slice(0, 50); // everyone who said yes or maybe needs to check in
      const msg = checkinMessage(env, e, answers, await all(env, 'SELECT * FROM event_checkins WHERE event_id = ? ORDER BY at', e.id), { ping: `**⏰ Starting in ${mins} minutes · ${label(e)} – check in now**\n${tags.map((id) => `<@${id}>`).join(' ')}`, mentions: { users: tags } });
      const res = await safely(fetch(`https://discord.com/api/v10/channels/${e.discord_channel}/messages`, { method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(msg) }));
      const posted = res?.ok ? await res.json().catch(() => null) : null;
      if (posted?.id) await run(env, 'UPDATE events SET checkin_msg = ? WHERE id = ?', posted.id, e.id);
    }
    sent++;
  }
  return sent;
}

export async function eventReminders(env) {
  if (!env.DB || !rsvpButtons(env)) return { sent: 0 };
  const settings = await getBotSettings(env); // P7.5 – "which auto-posts are on"
  const everyone = flagOn(env, { role: 'member' }, 'discordRsvp') && settings.autoPosts.reminders; // owner/managers-only while testing: no channel post
  const now = Date.now();
  await thirtyMinutes(env, now, everyone); // default for everyone who said yes: site + DM + a tag in the event's channel
  const due = await all(env, `SELECT * FROM events WHERE status = 'scheduled' AND start > ? AND (
    (remind24_at IS NULL AND start <= ? AND start > ?) OR (remind2_at IS NULL AND start <= ?)) ORDER BY start LIMIT 10`, now, now + 24 * HOUR, now + 2 * HOUR, now + 2 * HOUR);
  let sent = 0;
  for (const e of due) {
    const soon = e.start <= now + 2 * HOUR;
    await run(env, `UPDATE events SET ${soon ? 'remind2_at = ?, remind24_at = COALESCE(remind24_at, ?)' : 'remind24_at = ?'} WHERE id = ?`, ...(soon ? [now, now] : [now]), e.id);
    const rsvps = await rsvpRows(env, e.id);
    const answered = new Set(rsvps.map((r) => r.user_id));
    const quiet = (await all(env, 'SELECT id, role FROM users WHERE last_at > ?', now - 60 * DAY)).filter((u) => !answered.has(u.id) && flagOn(env, { role: u.role }, 'discordRsvp')).map((u) => u.id);
    const yes = rsvps.filter((r) => r.status === 'yes').length;
    const head = `${soon ? '⏰ Starting soon' : '📅 Tomorrow'} · ${label(e)}`;
    const routed = await safely(routeEvent(env, 'event.reminder', e, { type: 'event', icon: soon ? '⏰' : '📅', title: `${head} – can you make it?`, body: `${yes} said yes so far. Answer ✅ ❔ ❌ in the Squad Hub.`, link: `members.html#schedule-${e.id}` }, soon ? '⏰ ' : '📅 '));
    if (routed) { sent++; continue; }
    if (everyone && e.discord_channel && env.DISCORD_BOT_TOKEN) {
      const pings = e.remind === 'mention' ? quiet.slice(0, 50) : [];
      const msg = await eventPost(env, e, rsvps, soon ? '⏰ ' : '📅 ', {
        ping: `**${head}** – ${yes} ✅ so far${pings.length ? `\nNot answered yet: ${pings.map((id) => `<@${id}>`).join(' ')}` : ''}`, mentions: { users: pings },
      });
      await safely(fetch(`https://discord.com/api/v10/channels/${e.discord_channel}/messages`, {
        method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(msg),
      }));
    }
    if (e.remind === 'dm' && quiet.length) await safely(notify(env, quiet, { type: 'event', nkey: 'event.nudge', vars: { head, yes }, icon: soon ? '⏰' : '📅', title: `${head} – can you make it?`, body: `${yes} said yes so far. Answer ✅ ❔ ❌ in the Squad Hub${e.discord_channel ? ' or on the Discord post' : ''}.`, link: `members.html#schedule-${e.id}` }));
    sent++;
  }
  return { sent };
}

// Routes behind login (called from members.js route()). Returns null when the path isn't ours.
export async function eventsRoute(p, method, body, me, env, log, loadSite, url) {
  if (p !== '/api/events' && !p.startsWith('/api/events/')) return null;
  if (!flagOn(env, me, 'events')) return fail('Not available yet.', 404);
  if (!can(me, 'events.view')) return fail('Members only.', 403);
  if (['/api/events/checkin', '/api/events/report', '/api/events/report/post'].includes(p)) return nightRoute(p, method, body, me, env, log, loadSite, url);
  if (p === '/api/events' && method === 'GET') return json(await listFor(env, me));
  if (p === '/api/events/calendar' && method === 'GET') {
    const out = await calendarMonth(env, me, url.searchParams.get('month'));
    return out.error ? fail(out.error) : json(out);
  }
  if (p === '/api/events/discord' && method === 'GET') return can(me, 'announce.discord') ? json(await discordTargets(env)) : fail('Managers only.', 403);
  if (['/api/events/lineup', '/api/events/templates', '/api/events/templates/delete'].includes(p)) { // P3.4 (+ P3.7 quick lineup)
    if (!can(me, 'events.manage')) return fail('Managers only.', 403);
    return lineupRoute(p, method, body, me, env, log);
  }
  if (p === '/api/events/recommend') return recommendRoute(p, method, body, me, env, log, loadSite); // P11.15 AI lineup recommender
  if (method !== 'POST') return fail('Not found', 404);
  if (p === '/api/events') return saveEvent(body, me, env, log);
  if (p === '/api/events/rsvp') return rsvp(body, me, env, log);
  if (p === '/api/events/nudge') return nudgeRoute(body, me, env, log); // BE4 – nudge a short position
  if (p === '/api/events/plays') return playsRoute(body, me, env, log); // board 08 – plays for tonight
  if (p === '/api/events/cancel') {
    if (!can(me, 'events.manage')) return fail('Managers only.', 403);
    const row = await one(env, "SELECT * FROM events WHERE id = ? AND status = 'scheduled'", Number(body.id) || 0);
    if (!row) return fail('That event is already cancelled or gone.', 404);
    const reason = clean(body.reason, 200) || null;
    await run(env, "UPDATE events SET status = 'cancelled', cancel_reason = ?, edited_by = ?, edited_at = ? WHERE id = ?", reason, me.n, Date.now(), row.id);
    await log(env, me, 'event-cancel', `${label(row)} · ${when(row)}`);
    await refreshEventPost(env, row.id);
    const n = { type: 'event', nkey: 'event.cancelled', vars: { event: label(row), when: when(row), reason }, icon: '🚫', title: `Cancelled: ${label(row)} – ${when(row)}`, body: reason, link: 'members.html#schedule' };
    const routed = await safely(routeEvent(env, 'event.cancelled', { ...row, status: 'cancelled' }, n));
    const notified = routed ? routed.notified : await safely(notify(env, await keen(env, row.id), n)) ?? 0;
    return json({ notified, ...(routed?.posts[0] ? { discord: routed.posts[0] } : {}), ...(await listFor(env, me)) });
  }
  return fail('Not found', 404);
}
