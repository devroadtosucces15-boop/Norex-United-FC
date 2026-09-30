// Match operations: P3.1 scheduling, P3.2 availability per event, P3.7 check-in, quick lineup and session report.
import fs from 'node:fs';
import { call, env, login, ROOT, siteJson, sqlite, W } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import { localDate, playerGrade, teamGrade, usuallyOn, zonedToUtc } from '../bot/events.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const iso = (ms) => new Date(ms).toISOString();

// ----- time zones + grades -----
t('zonedToUtc: London summer time (BST = UTC+1)', iso(zonedToUtc('2026-10-02', '20:00', 'Europe/London')) === '2026-10-02T19:00:00.000Z');
t('zonedToUtc: London winter time (GMT)', iso(zonedToUtc('2026-11-02', '20:00', 'Europe/London')) === '2026-11-02T20:00:00.000Z');
t('zonedToUtc: New York + Tokyo', iso(zonedToUtc('2026-12-01', '19:30', 'America/New_York')) === '2026-12-02T00:30:00.000Z' && iso(zonedToUtc('2026-12-01', '09:00', 'Asia/Tokyo')) === '2026-12-01T00:00:00.000Z');
t('localDate crosses midnight by zone', localDate(Date.parse('2026-10-02T23:30:00Z'), 'Europe/Berlin') === '2026-10-03' && localDate(Date.parse('2026-10-02T23:30:00Z'), 'UTC') === '2026-10-02');
const fri20 = [0, 0, 0, 0, 1 << 20, 0, 0]; // Friday 20:00–21:00 in the member's zone
t('usual play times: Friday 20:15 London yes, 22:00 no, no profile → null', usuallyOn({ tz: 'Europe/London', play_times: JSON.stringify(fri20) }, zonedToUtc('2026-10-02', '20:15', 'Europe/London')) === true
  && usuallyOn({ tz: 'Europe/London', play_times: JSON.stringify(fri20) }, zonedToUtc('2026-10-02', '22:00', 'Europe/London')) === false && usuallyOn(null, Date.now()) === null);
t('team grade = the session-card formula', teamGrade(3, 0, 3, 9, 2) === 'A+' && teamGrade(1, 1, 3, 3, 4) === 'D' && teamGrade(0, 0, 2, 0, 5) === 'F' && teamGrade(0, 0, 0, 0, 0) === null);
t('player grade by average rating', playerGrade(8.6) === 'A+' && playerGrade(7.5) === 'B' && playerGrade(5.9) === 'F' && playerGrade(null) === null);

// ----- pages + assets -----
const home = fs.readFileSync(ROOT + 'site/index.html', 'utf8');
t('home page has the next-event slot', home.includes('data-next-event'));
t('assets shipped', ['events.js', 'events.css'].every((f) => fs.existsSync(ROOT + 'site/assets/' + f)));

// ----- fake Discord -----
env.DISCORD_BOT_TOKEN = 'bot';
const posts = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/guilds/9/channels')) return Response.json([{ id: '70001', name: 'match-nights', type: 0, position: 1 }]);
  if (u.endsWith('/guilds/9/roles')) return Response.json([{ id: '9', name: '@everyone', position: 0 }]);
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  const m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m && m[1] !== 'dm') { posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: `m${posts.length}` }); }
  if (m) return Response.json({ id: 'dm-msg' });
  return realFetch(url, init);
};

const owner = await login('111', [], 'Founder');
const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500', [], 'Player One');
const member2 = await login('501', [], 'Player Two');

// ----- flags -----
setFlags({ events: 'owner', matchNight: 'owner', notifications: 'members', profiles: 'members' });
t('flags: schedule 404 for a member + the public strip for guests while owner-only', (await call(member, '/api/events')).s === 404 && (await W('/api/events/public')).status === 404);
t('flags: owner gets in', (await call(owner, '/api/events')).s === 200);
setFlags({ events: 'public', matchNight: 'members' });

// ----- P3.1 create -----
const tomorrow = new Date(Date.now() + 86400e3).toISOString().slice(0, 10);
const base = { type: 'league', date: tomorrow, time: '20:00', tz: 'Europe/London', duration: 120, needs: { GK: 1, CB: 2, players: 5 }, notes: 'Lobby <b>host</b>: Coach', public: true };
t('member cannot schedule (403)', (await call(member, '/api/events', base)).s === 403);
t('bad time zone refused', (await call(mgr, '/api/events', { ...base, tz: 'Mars/Olympus' })).s === 400);
t('bad needs refused', (await call(mgr, '/api/events', { ...base, needs: { XX: 1 } })).s === 400);
t('past time refused', (await call(mgr, '/api/events', { ...base, date: '2026-01-01' })).s === 400);
const made = await call(mgr, '/api/events', { ...base, repeat: 2, notify: true, discord: { channel: '70001', role: '9' } });
const evs = made.d.events;
t('manager schedules a weekly series (3 dates, same wall time in London)', made.s === 200 && made.d.created === 3 && evs.length === 3 && evs[0].series && evs.every((e) => e.series === evs[0].series)
  && new Date(evs[0].start).toISOString() === iso(zonedToUtc(tomorrow, '20:00', 'Europe/London')));
t('notes cleaned, needs kept, end = start + duration', evs[0].notes === 'Lobby  b host /b : Coach' && evs[0].needs.GK === 1 && evs[0].needs.players === 5 && evs[0].end - evs[0].start === 120 * 60e3);
t('members notified', made.d.notified >= 3 && (await call(member, '/api/notify')).d.items.some((n) => n.type === 'event' && /^New: League night/.test(n.title)));
t('posted to Discord with a live timestamp + @everyone', made.d.discord?.ok && posts.at(-1).channel === '70001' && posts.at(-1).content === '@everyone' && /<t:\d+:F>/.test(posts.at(-1).embeds[0].description));

// ----- P3.2 answers -----
const [e1, e2, e3] = evs.map((e) => e.id);
await call(member, '/api/profile', { tz: 'Europe/London', playTimes: [0, 0, 0, 0, 0, 0, 0].map((_, i) => (i === (new Date(evs[0].start).getUTCDay() + 6) % 7 ? 1 << 20 : 0)) });
const mine = (await call(member, '/api/events')).d;
t('usual play times hint on unanswered events', mine.hasPlayTimes && mine.events.every((e) => e.usual === true));
const r1 = await call(member, '/api/events/rsvp', { ids: [e1, e2], status: 'yes' });
t('bulk yes to two events', r1.s === 200 && [e1, e2].every((id) => r1.d.events.find((e) => e.id === id).rsvps.some((r) => r.id === '500' && r.s === 'yes')) && !r1.d.events.find((e) => e.id === e3).rsvps.length);
t('yes also counts as “I’m in” that day', !!sqlite.prepare('SELECT 1 FROM availability WHERE user_id = ? AND date = ?').get('500', new Date(evs[0].start).toISOString().slice(0, 10)));
t('answered events drop the usual hint', r1.d.events.find((e) => e.id === e1).usual === undefined);
await call(member2, '/api/events/rsvp', { ids: [e1], status: 'maybe' });
t('clear takes the answer back', (await call(member, '/api/events/rsvp', { ids: [e2], status: 'clear' })).d.events.find((e) => e.id === e2).rsvps.length === 0);
t('bad answer refused', (await call(member, '/api/events/rsvp', { ids: [e1], status: 'sure' })).s === 400);
const ov = (await call(mgr, '/api/admin/overview')).d;
t('portal squad week gets this week’s events with answers', Array.isArray(ov.events) && ov.events.some((e) => e.id === e1 && e.rsvps.length === 2));
const guestStrip = await (await W('/api/events/public')).json();
t('public strip: next public events, no answers leaked', guestStrip.events.length >= 1 && guestStrip.events[0].id === e1 && !('rsvps' in guestStrip.events[0]) && !('notes' in guestStrip.events[0]));

// ----- BE11 calendar month view -----
const monthStr = new Date(evs[0].start).toISOString().slice(0, 7);
const cal = await call(member, `/api/events/calendar?month=${monthStr}`);
t('calendar: one call gets the month\'s events + my answer + type colours', cal.s === 200
  && cal.d.events.some((e) => e.id === e1 && e.mine === 'yes') && cal.d.events.some((e) => e.id === e2 && e.mine === null)
  && cal.d.types.league.colour === '#c8352c' && cal.d.types.league.emoji === '🏆');
t('calendar: bad month refused', (await call(member, '/api/events/calendar?month=2026-13')).s === 400
  && (await call(member, '/api/events/calendar')).s === 400);
t('calendar: guests/logged-out kept out', (await call(null, `/api/events/calendar?month=${monthStr}`)).s === 401);

// ----- edit + cancel -----
const moved = await call(mgr, '/api/events', { ...base, id: e1, time: '21:00' });
t('moving the time tells people who said yes / maybe', moved.s === 200 && moved.d.notified === 2 && (await call(member2, '/api/notify')).d.items.some((n) => /^Time changed/.test(n.title)));
t('edit keeps the answers', moved.d.events.find((e) => e.id === e1).rsvps.length === 2);
t('member cannot cancel', (await call(member, '/api/events/cancel', { id: e3 })).s === 403);
await call(member, '/api/events/rsvp', { ids: [e3], status: 'yes' });
const cancelled = await call(mgr, '/api/events/cancel', { id: e3, reason: 'Server maintenance' });
t('cancel → marked + keen people told', cancelled.d.events.find((e) => e.id === e3).status === 'cancelled' && cancelled.d.notified === 1 && (await call(member, '/api/notify')).d.items.some((n) => /^Cancelled/.test(n.title) && n.body === 'Server maintenance'));
t('no answers on a cancelled event', (await call(member2, '/api/events/rsvp', { ids: [e3], status: 'yes' })).s === 409);

// ----- P3.7 match night -----
t('check-in closed before the night', (await call(member, '/api/events/checkin', { id: e1, on: true })).s === 409);
const now = new Date(Date.now() - 20 * 60e3);
const live = await call(mgr, '/api/events', { type: 'rush', date: now.toISOString().slice(0, 10), time: now.toISOString().slice(11, 16), tz: 'UTC', duration: 120 });
const liveId = live.d.id;
const ci = await call(member, '/api/events/checkin', { id: liveId, on: true, trial: 'CB' });
t('check-in during the night, with a position trial', ci.s === 200 && ci.d.events.find((e) => e.id === liveId).checkins.some((c) => c.id === '500' && c.trial === 'CB'));
t('unknown trial position refused', (await call(member2, '/api/events/checkin', { id: liveId, on: true, trial: 'QB' })).s === 400);
await call(member2, '/api/events/checkin', { id: liveId, on: true });
t('check out', (await call(member2, '/api/events/checkin', { id: liveId, on: false })).d.events.find((e) => e.id === liveId).checkins.length === 1);
t('member cannot set the lineup', (await call(member, '/api/events/lineup', { id: liveId, lineup: { 500: 'CB' } })).s === 403);
t('bad lineup position refused', (await call(mgr, '/api/events/lineup', { id: liveId, lineup: { 500: 'QB' } })).s === 400);
t('manager sets a quick lineup', (await call(mgr, '/api/events/lineup', { id: liveId, lineup: { 500: 'CB', 501: '' } })).d.events.find((e) => e.id === liveId).lineup['500'] === 'CB');
setFlags({ matchNight: 'owner' });
t('match night flag gates check-in', (await call(member, '/api/events/checkin', { id: liveId, on: true })).s === 404);
setFlags({ matchNight: 'members' });

// Session report for a real archived night: an event around the newest League match + a Rush result that day.
const m0 = siteJson('club').matches[0], p0 = m0.ps[0];
const start = m0.ts * 1000 - 10 * 60e3, day = new Date(start).toISOString().slice(0, 10);
const evId = Number(sqlite.prepare("INSERT INTO events (type, start, duration, tz, at) VALUES ('league', ?, 120, 'UTC', ?)").run(start, Date.now()).lastInsertRowid);
sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at) VALUES ('500', ?, ?, 'approved', ?)").run(p0.k, p0.n, Date.now());
sqlite.prepare("INSERT INTO event_checkins (event_id, user_id, name, trial, at) VALUES (?, '500', 'Player One', 'CB', ?)").run(evId, Date.now());
sqlite.prepare("INSERT INTO event_rsvps (event_id, user_id, status, name, at) VALUES (?, '501', 'yes', 'Player Two', ?)").run(evId, Date.now());
const rid = Number(sqlite.prepare("INSERT INTO rush_matches (date, opponent, gf, ga, status, by_id, at) VALUES (?, 'Rush FC', 3, 1, 'confirmed', '500', ?)").run(day, Date.now()).lastInsertRowid);
sqlite.prepare("INSERT INTO rush_players (match_id, slot, player, name, goals, assists, rating, motm) VALUES (?, 0, ?, ?, 2, 0, 9.0, 1)").run(rid, p0.k, p0.n);
const rep = await call(member, `/api/events/report?id=${evId}`);
const inWin = siteJson('club').matches.filter((m) => m.ts * 1000 >= start - 30 * 60e3 && m.ts * 1000 <= start + 210 * 60e3);
const p0lines = inWin.flatMap((m) => m.ps.filter((x) => x.k === p0.k));
const me0 = rep.d.players.find((p) => p.k === p0.k);
t('report: League match from EA + confirmed Rush that day', rep.s === 200 && rep.d.results.some((r) => r.mode === 'league' && r.gf === m0.gf) && rep.d.results.some((r) => r.mode === 'rush' && r.opp === 'Rush FC'));
t('report: team grade + totals (every League match in the window + the Rush result)', inWin.length >= 1 && rep.d.team.games === inWin.length + 1 && rep.d.team.gf === inWin.reduce((a, m) => a + m.gf, 0) + 3 && rep.d.team.grade === teamGrade(rep.d.team.w, rep.d.team.d, 2, rep.d.team.gf, rep.d.team.ga));
t('report: player lines merge League + Rush, graded', me0 && me0.games === p0lines.length + 1 && me0.g === p0lines.reduce((a, x) => a + x.g, 0) + 2 && me0.grade === playerGrade(me0.avg) && me0.user?.id === '500');
t('report: position trial compared with the season average', me0.trial?.pos === 'CB' && (me0.trial.season == null || me0.trial.diff === Math.round((me0.avg - me0.trial.season) * 10) / 10));
t('report: attendance – no-shows and walk-ins', rep.d.attendance.came === 1 && rep.d.attendance.noShow.some((x) => x.id === '501') && rep.d.attendance.walkIns.some((x) => x.id === '500'));
t('member cannot share the report', (await call(member, '/api/events/report/post', { id: evId })).s === 403);
const shared = await call(mgr, '/api/events/report/post', { id: evId, channel: '70001' });
t('manager shares: Discord post + attendees notified + marked', shared.s === 200 && shared.d.discord?.ok && /Session report/.test(posts.at(-1).embeds[0].title) && shared.d.notified === 2 && (await call(member2, '/api/notify')).d.items.some((n) => /^Session report/.test(n.title)));

await tt('activity log records the night', async () => {
  const types = sqlite.prepare("SELECT DISTINCT type FROM activity WHERE type LIKE 'event-%'").all().map((r) => r.type);
  return ['event-new', 'event-edit', 'event-cancel', 'event-rsvp', 'event-checkin', 'event-lineup', 'event-report'].every((x) => types.includes(x));
});
done();
