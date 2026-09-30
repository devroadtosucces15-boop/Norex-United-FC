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
//   GET  /api/events/report?id=      members: session report – results that night (League from EA, confirmed Rush),
//                                    team + player grades A+–F, position trials vs season average, attendance
//   POST /api/events/report/post     managers: share the report (notify who came, optional Discord post)
// P3.3: the Discord post carries ✅ ❔ ❌ buttons (bot/worker.js → eventButton) that write the same answers, its counts
// stay live (refreshEventPost after every answer), and eventReminders() – run by the 10-minute cron – posts T-24h / T-2h
// reminders and nudges members who haven't answered (event.remind: dm = bell + DM · mention = @ in the channel · off).
import { can, flagOn, flags } from './roles.js';
import { notify, notifyMembers, safely } from './notify.js';
import { POSITIONS } from './profiles.js';
import { discordTargets, postEmbed } from './docs.js';
import { awardPoints } from './points.js';
import { getBotSettings } from './settings.js';

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
  return { id: r.user_id, n: r.name, a: opt(r.avatar), s: r.status, pos: parse(mode === 'rush' ? pf?.rush_positions : pf?.positions, []) };
};
const eventOut = (r, rs, cs, profiles, manager, people = new Map()) => ({
  id: r.id, type: r.type, title: opt(r.title), start: r.start, duration: r.duration, end: r.start + r.duration * MIN, tz: r.tz,
  notes: opt(r.notes), needs: parse(r.needs, {}), public: !!r.public, status: r.status, cancelReason: opt(r.cancel_reason),
  by: opt(r.by_name), at: r.at, editedBy: opt(r.edited_by), editedAt: opt(r.edited_at), series: opt(r.series), lineup: parse(r.lineup, {}),
  rsvps: rs.map((x) => rsvpOut(x, profiles, r.type)), checkins: cs.map((x) => ({ id: x.user_id, n: x.name, a: opt(x.avatar), trial: opt(x.trial), at: x.at })),
  // P3.4: names for lineup players who haven't answered / checked in (e.g. withdrew after being picked)
  lineupPeople: Object.fromEntries(Object.keys(parse(r.lineup, {})).filter((id) => !rs.some((x) => x.user_id === id) && !cs.some((x) => x.user_id === id) && people.has(id)).map((id) => [id, people.get(id)])),
  reportAt: opt(r.report_at), remind: r.remind ?? 'dm', formation: opt(r.formation), lineupAt: opt(r.lineup_at), ...(manager ? { posted: !!r.discord_msg } : {}),
});
async function load(env, where, args, me) {
  const rows = await all(env, `SELECT * FROM events WHERE ${where} ORDER BY start LIMIT 120`, ...args);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [rs, cs] = await Promise.all([
    all(env, `SELECT * FROM event_rsvps WHERE event_id IN (${marks(ids.length)}) ORDER BY at`, ...ids),
    all(env, `SELECT * FROM event_checkins WHERE event_id IN (${marks(ids.length)}) ORDER BY at`, ...ids),
  ]);
  const users = [...new Set(rs.map((x) => x.user_id))];
  const profiles = new Map(users.length ? (await all(env, `SELECT user_id, positions, rush_positions FROM profiles WHERE user_id IN (${marks(users.length)})`, ...users)).map((p) => [p.user_id, p]) : []);
  const manager = !!me && can(me, 'events.manage');
  const inLineups = [...new Set(rows.flatMap((r) => Object.keys(parse(r.lineup, {}))))];
  const people = new Map(inLineups.length ? (await all(env, `SELECT id, name, avatar FROM users WHERE id IN (${marks(inLineups.length)})`, ...inLineups)).map((u) => [u.id, { n: u.name, a: opt(u.avatar) }]) : []);
  return rows.map((r) => eventOut(r, rs.filter((x) => x.event_id === r.id), cs.filter((x) => x.event_id === r.id), profiles, manager, people));
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
  const rows = await all(env, "SELECT id, type, title, start, duration, tz FROM events WHERE public = 1 AND status = 'scheduled' AND start + duration * 60000 > ? ORDER BY start LIMIT 3", Date.now());
  return { events: rows.map((r) => ({ id: r.id, type: r.type, title: opt(r.title), start: r.start, duration: r.duration, tz: r.tz })) };
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
export function eventMessage(env, e, rsvps = [], heading = '') {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/'), unix = Math.floor(e.start / 1000);
  const needs = typeof e.needs === 'string' ? parse(e.needs, {}) : e.needs ?? {};
  const yes = rsvps.filter((r) => r.status === 'yes'), n = (st) => rsvps.filter((r) => r.status === st).length;
  const missing = Object.entries(needs).filter(([k]) => k !== 'players').map(([k, v]) => [k, v - yes.filter((r) => parse(e.type === 'rush' ? r.rush_positions : r.positions, [])[0] === k).length]).filter(([, left]) => left > 0);
  const short = needs.players && yes.length < needs.players ? needs.players - yes.length : 0;
  const done = e.status === 'cancelled' || e.start + e.duration * MIN < Date.now();
  return {
    embeds: [{
      title: `${EVENT_TYPES[e.type][0]} ${e.status === 'cancelled' ? '🚫 Cancelled · ' : ''}${heading}${label(e)}`.slice(0, 250), url: `${site}members.html#schedule-${e.id ?? ''}`, color: e.status === 'cancelled' ? 0x555555 : RED,
      description: [`🗓️ <t:${unix}:F> · <t:${unix}:R>`, `⏱️ ${e.duration >= 60 ? `${Math.floor(e.duration / 60)} h${e.duration % 60 ? ` ${e.duration % 60} min` : ''}` : `${e.duration} min`}`, e.notes && `📝 ${e.notes}`].filter(Boolean).join('\n').slice(0, 3000),
      fields: [
        { name: 'Answers', value: `✅ ${n('yes')} · ❔ ${n('maybe')} · ❌ ${n('no')}${yes.length ? `\n${yes.slice(0, 20).map((r) => r.name).join(', ')}${yes.length > 20 ? ' …' : ''}` : ''}`.slice(0, 1000) },
        ...(missing.length || short ? [{ name: '🧩 Still needed', value: [short && `${short} more player${short > 1 ? 's' : ''}`, ...missing.map(([k, left]) => `${left} ${k}`)].filter(Boolean).join(' · ') }] : []),
      ],
      footer: { text: done ? 'NOREX UNITED · this event is closed' : 'NOREX UNITED · tap a button to answer (only you see the confirmation)' },
    }],
    components: [{ type: 1, components: [
      ...(done || !rsvpButtons(env) ? [] : [['yes', '✅', 'I’m in', 3], ['maybe', '❔', 'Maybe', 2], ['no', '❌', 'Can’t make it', 4]].map(([st, emoji, lbl, style]) => ({ type: 2, style, label: lbl, emoji: { name: emoji }, custom_id: `norex:ev:${e.id}:${st}` }))),
      { type: 2, style: 5, label: 'Squad Hub', url: `${site}members.html#schedule` },
    ] }],
  };
}
const rsvpRows = (env, id) => all(env, 'SELECT r.status, r.name, r.user_id, p.positions, p.rush_positions FROM event_rsvps r LEFT JOIN profiles p ON p.user_id = r.user_id WHERE r.event_id = ? ORDER BY r.at', id);
// Keeps the Discord post's counts in step with the site. Never throws.
export async function refreshEventPost(env, id) {
  try {
    const e = await one(env, 'SELECT * FROM events WHERE id = ?', id);
    if (!e?.discord_msg || !e.discord_channel || !env.DISCORD_BOT_TOKEN) return;
    const msg = eventMessage(env, e, await rsvpRows(env, id), e.series ? 'Weekly · ' : '');
    await fetch(`https://discord.com/api/v10/channels/${e.discord_channel}/messages/${e.discord_msg}`, {
      method: 'PATCH', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: msg.embeds, components: msg.components }),
    });
  } catch (err) { console.log('event post refresh failed', err.message); }
}
// People to tell about a change: everyone who said yes or maybe.
const keen = async (env, id) => (await all(env, "SELECT user_id FROM event_rsvps WHERE event_id = ? AND status IN ('yes', 'maybe')", id)).map((r) => r.user_id);

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
      out.notified = await safely(notify(env, await keen(env, existing.id), { type: 'event', icon: '🕒', title: `Time changed: ${label(e)} – now ${when(e)}`, link: 'members.html#schedule' })) ?? 0;
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
    if (body.notify) {
      out.notified = await safely(notifyMembers(env, { type: 'event', title: `New: ${label(e)} – ${when(e)}${repeat ? ` (weekly, ${repeat + 1} dates)` : ''}`, body: e.notes || 'Say if you can make it in the Squad Hub.', link: 'members.html#schedule' })) ?? 0;
    }
    if (body.discord?.channel && can(me, 'announce.discord')) {
      out.discord = await postEmbed(env, body.discord.channel, body.discord.role, eventMessage(env, { ...e, id: ids[0], status: 'scheduled' }, [], repeat ? 'Weekly · ' : ''));
      if (out.discord.ok) await run(env, 'UPDATE events SET discord_channel = ?, discord_msg = ? WHERE id = ?', String(body.discord.channel), out.discord.id ?? null, ids[0]);
    }
  }
  return json({ ...out, ...(await listFor(env, me)) });
}

// One member's answer to one or more events – used by the Squad Hub and the Discord buttons. → rows answered (or [] if none open).
export async function answerEvents(env, me, ids, status) {
  const rows = ids.length ? await all(env, `SELECT id, start, duration FROM events WHERE id IN (${marks(ids.length)}) AND status = 'scheduled' AND start + duration * 60000 > ?`, ...ids, Date.now()) : [];
  if (!rows.length) return rows;
  const stmts = [];
  for (const r of rows) {
    if (status === 'clear') { stmts.push(env.DB.prepare('DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(r.id, me.u)); continue; }
    stmts.push(env.DB.prepare(`INSERT INTO event_rsvps (event_id, user_id, status, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (event_id, user_id) DO UPDATE SET status = excluded.status, name = excluded.name, avatar = excluded.avatar, at = excluded.at`).bind(r.id, me.u, status, me.n, me.a ?? null, Date.now()));
    // "Yes" to an event also counts as "I'm in" that day (attendance boards + streaks read day availability) – never overwrites a day answer.
    if (status === 'yes') stmts.push(env.DB.prepare('INSERT OR IGNORE INTO availability (date, user_id, status, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)').bind(new Date(r.start).toISOString().slice(0, 10), me.u, 'yes', me.n, me.a ?? null, Date.now()));
  }
  await env.DB.batch(stmts);
  for (const r of rows) await refreshEventPost(env, r.id);
  return rows;
}
async function rsvp(body, me, env, log) {
  if (!can(me, 'events.rsvp')) return fail('Members only.', 403);
  const ids = [...new Set((Array.isArray(body.ids) ? body.ids : [body.id]).map(Number).filter(Number.isInteger))].slice(0, 30);
  const status = body.status;
  if (!ids.length || !(STATUSES.includes(status) || status === 'clear')) return fail('Bad answer.');
  const rows = await answerEvents(env, me, ids, status);
  if (!rows.length) return fail('Those events are over or cancelled.', 409);
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
function reportEmbed(env, rep) {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/'), e = rep.event, t = rep.team;
  const icon = { W: '🟩', D: '🟨', L: '🟥' };
  return {
    embeds: [{
      title: `📋 Session report · ${label(e)} · Grade ${t.grade ?? '–'}`.slice(0, 250), url: `${site}members.html#schedule`, color: RED, timestamp: new Date(e.start).toISOString(),
      description: [
        t.games ? `**${t.w}W ${t.d}D ${t.l}L** · ${t.gf}–${t.ga}` : 'No results logged for this night yet.',
        rep.results.map((r) => `${icon[r.res]} ${r.mode === 'rush' ? '⚡ ' : ''}**${r.gf}–${r.ga}** vs ${r.opp}`).join('\n'),
        rep.mvp ? `⭐ Player of the night: **${rep.mvp.n}** (${rep.mvp.avg} avg${rep.mvp.g ? ` · ${rep.mvp.g} G` : ''}${rep.mvp.a ? ` · ${rep.mvp.a} A` : ''})` : '',
        rep.players.filter((p) => p.grade).slice(0, 10).map((p) => `\`${p.grade.padEnd(2)}\` ${p.n} · ${p.avg}${p.trial ? ` · 🧪 tried ${p.trial.pos}${p.trial.diff != null ? ` (${p.trial.diff >= 0 ? '+' : ''}${p.trial.diff} vs usual)` : ''}` : ''}`).join('\n'),
        `👥 ${rep.attendance.came} checked in · ${rep.attendance.saidYes} said yes`,
      ].filter(Boolean).join('\n\n').slice(0, 3900),
      footer: { text: 'NOREX UNITED · match night' },
    }],
    components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Full report', url: `${site}members.html#schedule` }] }],
  };
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
    if (body.on === false) await run(env, 'DELETE FROM event_checkins WHERE event_id = ? AND user_id = ?', row.id, me.u);
    else {
      const already = await one(env, 'SELECT 1 FROM event_checkins WHERE event_id = ? AND user_id = ?', row.id, me.u);
      await run(env, `INSERT INTO event_checkins (event_id, user_id, name, avatar, trial, at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (event_id, user_id) DO UPDATE SET trial = excluded.trial, name = excluded.name, avatar = excluded.avatar`, row.id, me.u, me.n, me.a ?? null, trial, Date.now());
      if (!already) await awardPoints(env, me.u, 'attendance', 5, `Checked in · ${label(row)}`); // P11.3 – only the first check-in for this night
    }
    await log(env, me, 'event-checkin', `${body.on === false ? 'left' : 'on'}${trial ? ` · trying ${trial}` : ''} · ${label(row)}`);
    return json(await listFor(env, me));
  }
  if (!can(me, 'events.manage')) return fail('Managers only.', 403);
  if (p === '/api/events/report/post') {
    const rep = await sessionReport(env, row.id, loadSite);
    const out = {};
    if (body.channel) out.discord = await postEmbed(env, body.channel, body.role, reportEmbed(env, rep));
    const people = [...new Set([...rep.event.checkins.map((x) => x.id), ...rep.event.rsvps.filter((x) => x.s === 'yes').map((x) => x.id)])];
    out.notified = await safely(notify(env, people, { type: 'event', icon: '📋', title: `Session report: ${label(row)} · Grade ${rep.team.grade ?? '–'}`, body: rep.team.games ? `${rep.team.w}W ${rep.team.d}D ${rep.team.l}L · ${rep.team.gf}–${rep.team.ga}${rep.mvp ? ` · ⭐ ${rep.mvp.n}` : ''}` : null, link: 'members.html#schedule' })) ?? 0;
    await run(env, 'UPDATE events SET report_at = ? WHERE id = ?', Date.now(), row.id);
    await log(env, me, 'event-report', `${label(row)}${out.discord?.ok ? ' · Discord' : ''}`);
    return json({ ...out, ...(await listFor(env, me)) });
  }
  return fail('Not found', 404);
}

// ---------- P3.4 lineup builder ----------
// Slots per formation: [slot, x %, y %] (y = 0 at the opponent's goal). Slot keys are unique; POS_OF gives the plain position.
export const FORMATIONS = {
  '4-3-3': [['GK', 50, 90], ['LB', 14, 70], ['LCB', 37, 75], ['RCB', 63, 75], ['RB', 86, 70], ['LCM', 28, 50], ['CDM', 50, 58], ['RCM', 72, 50], ['LW', 17, 24], ['ST', 50, 15], ['RW', 83, 24]],
  '4-4-2': [['GK', 50, 90], ['LB', 14, 70], ['LCB', 37, 75], ['RCB', 63, 75], ['RB', 86, 70], ['LM', 14, 44], ['LCM', 38, 50], ['RCM', 62, 50], ['RM', 86, 44], ['LS', 38, 18], ['RS', 62, 18]],
  '4-2-3-1': [['GK', 50, 90], ['LB', 14, 70], ['LCB', 37, 75], ['RCB', 63, 75], ['RB', 86, 70], ['LDM', 38, 57], ['RDM', 62, 57], ['LAM', 20, 34], ['CAM', 50, 37], ['RAM', 80, 34], ['ST', 50, 14]],
  '4-1-2-1-2': [['GK', 50, 90], ['LB', 14, 70], ['LCB', 37, 75], ['RCB', 63, 75], ['RB', 86, 70], ['CDM', 50, 60], ['LCM', 30, 47], ['RCM', 70, 47], ['CAM', 50, 34], ['LS', 38, 16], ['RS', 62, 16]],
  '3-5-2': [['GK', 50, 90], ['LCB', 27, 74], ['CB', 50, 77], ['RCB', 73, 74], ['LWB', 11, 50], ['LCM', 34, 50], ['CDM', 50, 58], ['RCM', 66, 50], ['RWB', 89, 50], ['LS', 38, 17], ['RS', 62, 17]],
  '5-3-2': [['GK', 50, 90], ['LWB', 10, 64], ['LCB', 30, 74], ['CB', 50, 77], ['RCB', 70, 74], ['RWB', 90, 64], ['LCM', 30, 48], ['CM', 50, 52], ['RCM', 70, 48], ['LS', 38, 18], ['RS', 62, 18]],
};
export const POS_OF = (slot) => ({ LCB: 'CB', RCB: 'CB', LCM: 'CM', RCM: 'CM', LDM: 'CDM', RDM: 'CDM', LAM: 'CAM', RAM: 'CAM', LS: 'ST', RS: 'ST' })[slot] ?? slot;
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
function lineupEmbed(env, e, lineup, names) {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/'), order = (FORMATIONS[e.formation] ?? []).map((x) => x[0]);
  const rows = Object.entries(lineup).sort((a, b) => order.indexOf(a[1]) - order.indexOf(b[1]));
  return { embeds: [{
    title: `🧩 Lineup · ${label(e)}${e.formation ? ` · ${e.formation}` : ''}`.slice(0, 250), url: `${site}members.html#schedule-${e.id}`, color: RED,
    description: `🗓️ <t:${Math.floor(e.start / 1000)}:F> · <t:${Math.floor(e.start / 1000)}:R>\n\n${rows.map(([uid, slot]) => `\`${POS_OF(slot).padEnd(4)}\` ${names.get(uid) ?? 'Member'}`).join('\n')}`.slice(0, 3900),
    footer: { text: 'NOREX UNITED · Play Style per position: playstyle.html' },
  }] };
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
  // POST /api/events/lineup { id, formation?, lineup, publish?, channel?, role? }
  const row = await one(env, "SELECT * FROM events WHERE id = ? AND status = 'scheduled'", Number(body.id) || 0);
  if (!row) return fail('That event is not on.', 404);
  const { lineup, formation, error } = readLineup(body);
  if (error) return fail(error);
  const publish = !!body.publish && Object.keys(lineup).length > 0;
  await run(env, `UPDATE events SET lineup = ?, formation = ?${publish ? ', lineup_at = ?' : ''} WHERE id = ?`, JSON.stringify(lineup), formation, ...(publish ? [Date.now()] : []), row.id);
  await log(env, me, publish ? 'event-lineup-publish' : 'event-lineup', `${label(row)}${formation ? ` · ${formation}` : ''} · ${Object.keys(lineup).length} players`);
  const out = {};
  if (publish) {
    const ids = Object.keys(lineup);
    const names = new Map((await all(env, `SELECT id, name FROM users WHERE id IN (${marks(ids.length)})`, ...ids)).map((u) => [u.id, u.name]));
    for (const r of await all(env, 'SELECT user_id, name FROM event_rsvps WHERE event_id = ?', row.id)) if (!names.has(r.user_id)) names.set(r.user_id, r.name);
    // Everyone told their own position (one notification each – the text differs).
    let told = 0;
    for (const uid of ids) told += (await safely(notify(env, [uid], { type: 'event', icon: '🧩', title: `You’re starting at ${POS_OF(lineup[uid])} – ${label(row)} · ${when(row)}`, body: formation ? `Formation ${formation}. Check the Play Style for your position.` : null, link: `members.html#schedule-${row.id}` }))) ?? 0;
    out.notified = told;
    const channel = body.channel || (body.discord !== false ? row.discord_channel : null);
    if (channel && can(me, 'announce.discord')) out.discord = await postEmbed(env, channel, body.role, lineupEmbed(env, { ...row, formation }, lineup, names));
  }
  return json({ ...out, ...(await listFor(env, me)) });
}

// ---------- P3.3 reminders (10-minute cron) ----------
// T-24h and T-2h: a reminder in the event's Discord channel ("7 ✅ – need a GK", with the answer buttons) and a nudge for
// members who haven't answered yet – bell + DM (remind = dm) or an @mention in that channel (remind = mention).
// Events scheduled less than 2 h ahead only get the T-2h one. Each fires once (remind24_at / remind2_at).
export async function eventReminders(env) {
  if (!env.DB || !rsvpButtons(env)) return { sent: 0 };
  const settings = await getBotSettings(env); // P7.5 – "which auto-posts are on"
  const everyone = flagOn(env, { role: 'member' }, 'discordRsvp') && settings.autoPosts.reminders; // owner/managers-only while testing: no channel post
  const now = Date.now();
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
    if (everyone && e.discord_channel && env.DISCORD_BOT_TOKEN) {
      const msg = eventMessage(env, e, rsvps, soon ? '⏰ ' : '📅 ');
      const pings = e.remind === 'mention' ? quiet.slice(0, 50) : [];
      await safely(fetch(`https://discord.com/api/v10/channels/${e.discord_channel}/messages`, {
        method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...msg, content: `**${head}** – ${yes} ✅ so far${pings.length ? `\nNot answered yet: ${pings.map((id) => `<@${id}>`).join(' ')}` : ''}`, allowed_mentions: { users: pings } }),
      }));
    }
    if (e.remind === 'dm' && quiet.length) await safely(notify(env, quiet, { type: 'event', icon: soon ? '⏰' : '📅', title: `${head} – can you make it?`, body: `${yes} said yes so far. Answer ✅ ❔ ❌ in the Squad Hub${e.discord_channel ? ' or on the Discord post' : ''}.`, link: `members.html#schedule-${e.id}` }));
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
  if (method !== 'POST') return fail('Not found', 404);
  if (p === '/api/events') return saveEvent(body, me, env, log);
  if (p === '/api/events/rsvp') return rsvp(body, me, env, log);
  if (p === '/api/events/cancel') {
    if (!can(me, 'events.manage')) return fail('Managers only.', 403);
    const row = await one(env, "SELECT * FROM events WHERE id = ? AND status = 'scheduled'", Number(body.id) || 0);
    if (!row) return fail('That event is already cancelled or gone.', 404);
    const reason = clean(body.reason, 200) || null;
    await run(env, "UPDATE events SET status = 'cancelled', cancel_reason = ?, edited_by = ?, edited_at = ? WHERE id = ?", reason, me.n, Date.now(), row.id);
    await log(env, me, 'event-cancel', `${label(row)} · ${when(row)}`);
    await refreshEventPost(env, row.id);
    const notified = await safely(notify(env, await keen(env, row.id), { type: 'event', icon: '🚫', title: `Cancelled: ${label(row)} – ${when(row)}`, body: reason, link: 'members.html#schedule' })) ?? 0;
    return json({ notified, ...(await listFor(env, me)) });
  }
  return fail('Not found', 404);
}
