// Match operations (roadmap P3.1 scheduling, P3.2 availability 2.0, P3.7 session check-in & live match night).
//   GET  /api/events                 members: upcoming (60 days) + recent (14 days) events with everyone's answers,
//                                    my "usually on at this time" hints (P2.2 play times)            (flag `events`)
//   GET  /api/events/public          anyone: the next public events – home page "next match night" strip
//   POST /api/events                 managers: create (optionally repeat weekly, notify, post to Discord) or edit
//   POST /api/events/cancel          managers: cancel { id, reason } – people who said yes/maybe are told
//   POST /api/events/rsvp            members: { ids: [...], status: yes | maybe | no | clear } – bulk, like day availability
//   GET  /api/events/discord         managers: channels + roles to post to (shared with P5.3)
//   POST /api/events/checkin         members, during the night: "I'm on" { id, on, trial }       (flag `matchNight`)
//   POST /api/events/lineup          managers: quick lineup { id, lineup: { <discord id>: 'CB' } }
//   GET  /api/events/report?id=      members: session report – results that night (League from EA, confirmed Rush),
//                                    team + player grades A+–F, position trials vs season average, attendance
//   POST /api/events/report/post     managers: share the report (notify who came, optional Discord post)
import { can, flagOn } from './roles.js';
import { notify, notifyMembers, safely } from './notify.js';
import { POSITIONS } from './profiles.js';
import { discordTargets, postEmbed } from './docs.js';

const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;
export const EVENT_TYPES = { league: ['🏆', 'League night'], rush: ['⚡', 'Rush session'], playoffs: ['🥇', 'Playoffs'], friendly: ['🤝', 'Friendly'], trial: ['🧭', 'Trial session'], training: ['🎯', 'Training'] };
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
const eventOut = (r, rs, cs, profiles, manager) => ({
  id: r.id, type: r.type, title: opt(r.title), start: r.start, duration: r.duration, end: r.start + r.duration * MIN, tz: r.tz,
  notes: opt(r.notes), needs: parse(r.needs, {}), public: !!r.public, status: r.status, cancelReason: opt(r.cancel_reason),
  by: opt(r.by_name), at: r.at, editedBy: opt(r.edited_by), editedAt: opt(r.edited_at), series: opt(r.series), lineup: parse(r.lineup, {}),
  rsvps: rs.map((x) => rsvpOut(x, profiles, r.type)), checkins: cs.map((x) => ({ id: x.user_id, n: x.name, a: opt(x.avatar), trial: opt(x.trial), at: x.at })),
  reportAt: opt(r.report_at), ...(manager ? { posted: !!r.discord_msg } : {}),
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
  return rows.map((r) => eventOut(r, rs.filter((x) => x.event_id === r.id), cs.filter((x) => x.event_id === r.id), profiles, manager));
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
  return { events, canManage: can(me, 'events.manage'), types: EVENT_TYPES, positions: POSITIONS, hasPlayTimes: usuallyOn(profile, now) !== null, matchNight: flagOn(env, me, 'matchNight') };
}
// Squad week in the manager portal (P3.2): the next 7 days' events as columns.
export const weekEvents = (env, me) => load(env, "start > ? AND start < ? AND status = 'scheduled'", [Date.now() - 6 * HOUR, Date.now() + 7 * DAY], me);
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
  return { e: { type, tz, duration, start, needs, title: clean(body.title, 80) || null, notes: cleanText(body.notes, 1000) || null, public: body.public ? 1 : 0 } };
}
const eventEmbed = (env, e, heading) => {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/'), unix = Math.floor(e.start / 1000);
  const needs = Object.entries(e.needs ?? {}).map(([k, n]) => (k === 'players' ? `${n} players` : `${n} ${k}`)).join(' · ');
  return {
    embeds: [{
      title: `${EVENT_TYPES[e.type][0]} ${heading ?? ''}${label(e)}`.slice(0, 250), url: `${site}members.html#schedule`, color: RED,
      description: [`🗓️ <t:${unix}:F> · <t:${unix}:R>`, `⏱️ ${e.duration >= 60 ? `${Math.floor(e.duration / 60)} h${e.duration % 60 ? ` ${e.duration % 60} min` : ''}` : `${e.duration} min`}`, needs && `🧩 Need: ${needs}`, e.notes && `📝 ${e.notes}`].filter(Boolean).join('\n').slice(0, 3900),
      footer: { text: 'NOREX UNITED · answer ✅ ❔ ❌ in the Squad Hub' },
    }],
    components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Answer in the Squad Hub', url: `${site}members.html#schedule` }] }],
  };
};
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
    await run(env, 'UPDATE events SET type = ?, title = ?, start = ?, duration = ?, tz = ?, notes = ?, needs = ?, public = ?, edited_by = ?, edited_at = ? WHERE id = ?',
      e.type, e.title, e.start, e.duration, e.tz, e.notes, JSON.stringify(e.needs), e.public, me.n, Date.now(), existing.id);
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
      const r = await run(env, 'INSERT INTO events (type, title, start, duration, tz, notes, needs, public, series, by_id, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        e.type, e.title, start, e.duration, e.tz, e.notes, JSON.stringify(e.needs), e.public, series, me.u, me.n, Date.now());
      ids.push(r.meta.last_row_id);
    }
    out.id = ids[0]; out.created = ids.length;
    await log(env, me, 'event-new', `${label(e)} · ${when(e)}${repeat ? ` · weekly ×${repeat + 1}` : ''}`);
    if (body.notify) {
      out.notified = await safely(notifyMembers(env, { type: 'event', title: `New: ${label(e)} – ${when(e)}${repeat ? ` (weekly, ${repeat + 1} dates)` : ''}`, body: e.notes || 'Say if you can make it in the Squad Hub.', link: 'members.html#schedule' })) ?? 0;
    }
    if (body.discord?.channel && can(me, 'announce.discord')) {
      out.discord = await postEmbed(env, body.discord.channel, body.discord.role, eventEmbed(env, e, repeat ? 'Weekly · ' : ''));
      if (out.discord.ok) await run(env, 'UPDATE events SET discord_channel = ?, discord_msg = ? WHERE id = ?', String(body.discord.channel), out.discord.id ?? null, ids[0]);
    }
  }
  return json({ ...out, ...(await listFor(env, me)) });
}

async function rsvp(body, me, env, log) {
  if (!can(me, 'events.rsvp')) return fail('Members only.', 403);
  const ids = [...new Set((Array.isArray(body.ids) ? body.ids : [body.id]).map(Number).filter(Number.isInteger))].slice(0, 30);
  const status = body.status;
  if (!ids.length || !(STATUSES.includes(status) || status === 'clear')) return fail('Bad answer.');
  const rows = await all(env, `SELECT id, start, duration FROM events WHERE id IN (${marks(ids.length)}) AND status = 'scheduled' AND start + duration * 60000 > ?`, ...ids, Date.now());
  if (!rows.length) return fail('Those events are over or cancelled.', 409);
  const stmts = [];
  for (const r of rows) {
    if (status === 'clear') { stmts.push(env.DB.prepare('DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(r.id, me.u)); continue; }
    stmts.push(env.DB.prepare(`INSERT INTO event_rsvps (event_id, user_id, status, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (event_id, user_id) DO UPDATE SET status = excluded.status, name = excluded.name, avatar = excluded.avatar, at = excluded.at`).bind(r.id, me.u, status, me.n, me.a ?? null, Date.now()));
    // "Yes" to an event also counts as "I'm in" that day (attendance boards + streaks read day availability) – never overwrites a day answer.
    if (status === 'yes') stmts.push(env.DB.prepare('INSERT OR IGNORE INTO availability (date, user_id, status, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)').bind(new Date(r.start).toISOString().slice(0, 10), me.u, 'yes', me.n, me.a ?? null, Date.now()));
  }
  await env.DB.batch(stmts);
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
    else await run(env, `INSERT INTO event_checkins (event_id, user_id, name, avatar, trial, at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (event_id, user_id) DO UPDATE SET trial = excluded.trial, name = excluded.name, avatar = excluded.avatar`, row.id, me.u, me.n, me.a ?? null, trial, Date.now());
    await log(env, me, 'event-checkin', `${body.on === false ? 'left' : 'on'}${trial ? ` · trying ${trial}` : ''} · ${label(row)}`);
    return json(await listFor(env, me));
  }
  if (!can(me, 'events.manage')) return fail('Managers only.', 403);
  if (p === '/api/events/lineup') {
    const lineup = {};
    for (const [uid, pos] of Object.entries(body.lineup && typeof body.lineup === 'object' ? body.lineup : {}).slice(0, 22)) {
      if (!pos) continue;
      if (!/^\d{1,25}$/.test(uid) || !POSITIONS.includes(pos)) return fail('Check the lineup.');
      lineup[uid] = pos;
    }
    await run(env, 'UPDATE events SET lineup = ? WHERE id = ?', JSON.stringify(lineup), row.id);
    await log(env, me, 'event-lineup', `${label(row)} · ${Object.keys(lineup).length} players`);
    return json(await listFor(env, me));
  }
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

// Routes behind login (called from members.js route()). Returns null when the path isn't ours.
export async function eventsRoute(p, method, body, me, env, log, loadSite, url) {
  if (p !== '/api/events' && !p.startsWith('/api/events/')) return null;
  if (!flagOn(env, me, 'events')) return fail('Not available yet.', 404);
  if (!can(me, 'events.view')) return fail('Members only.', 403);
  if (['/api/events/checkin', '/api/events/lineup', '/api/events/report', '/api/events/report/post'].includes(p)) return nightRoute(p, method, body, me, env, log, loadSite, url);
  if (p === '/api/events' && method === 'GET') return json(await listFor(env, me));
  if (p === '/api/events/discord' && method === 'GET') return can(me, 'announce.discord') ? json(await discordTargets(env)) : fail('Managers only.', 403);
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
    const notified = await safely(notify(env, await keen(env, row.id), { type: 'event', icon: '🚫', title: `Cancelled: ${label(row)} – ${when(row)}`, body: reason, link: 'members.html#schedule' })) ?? 0;
    return json({ notified, ...(await listFor(env, me)) });
  }
  return fail('Not found', 404);
}
