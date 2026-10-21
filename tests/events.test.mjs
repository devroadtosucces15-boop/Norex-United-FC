// Match operations: P3.1 scheduling, P3.2 availability per event, P3.7 check-in, quick lineup and session report.
import { plainText, images } from '../bot/ui.js';
import fs from 'node:fs';
import { call, env, login, r2objects, ROOT, siteJson, sqlite, W } from './mock.mjs';
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
const posts = [], dmPosts = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/guilds/9/channels')) return Response.json([{ id: '70001', name: 'match-nights', type: 0, position: 1 }]);
  if (u.endsWith('/guilds/9/roles')) return Response.json([{ id: '9', name: '@everyone', position: 0 }]);
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  const m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m && m[1] !== 'dm') { posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: `m${posts.length}` }); }
  if (m) { dmPosts.push(JSON.parse(init.body)); return Response.json({ id: 'dm-msg' }); }
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
t('posted to Discord with a live timestamp + @everyone', made.d.discord?.ok && posts.at(-1).channel === '70001' && posts.at(-1).components[0].content === '@everyone' && posts.at(-1).allowed_mentions.parse.includes('everyone') && /<t:\d+:F>/.test(plainText(posts.at(-1))));

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

// ----- BE3 ready check -----
await call(member, '/api/events/rsvp', { ids: [liveId], status: 'yes' });
await call(member2, '/api/events/rsvp', { ids: [liveId], status: 'yes' });
const readyForm = await call(mgr, '/api/events/lineup', { id: liveId, formation: '4-3-3', lineup: { 500: 'LCB', 502: 'GK' } });
const readyEv = readyForm.d.events.find((e) => e.id === liveId);
t('ready check: slots sorted by formation, each with its answer + check-in', readyEv.ready.slots.length === 2 && readyEv.ready.slots[0].slot === 'GK' && readyEv.ready.slots[1].slot === 'LCB'
  && readyEv.ready.slots.find((s) => s.id === '500').status === 'yes' && readyEv.ready.slots.find((s) => s.id === '500').checkedIn === true
  && readyEv.ready.slots.find((s) => s.id === '502').status === 'unanswered' && readyEv.ready.slots.find((s) => s.id === '502').checkedIn === false);
t('ready check: subs = said yes but not in the lineup', readyEv.ready.subs.some((s) => s.id === '501') && !readyEv.ready.subs.some((s) => s.id === '500'));
t('ready check: counts tally the slots', readyEv.ready.counts.yes === 1 && readyEv.ready.counts.unanswered === 1);
t('ready check hidden from members (manager-only field)', (await call(member, '/api/events')).d.events.find((e) => e.id === liveId)?.ready === undefined);

// ----- Dugout post options: DM, channel + tags, home page, preview -----
const notesFor = (u) => sqlite.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND title LIKE 'You%starting at%'").get(u).n;
const pub = async () => (await W('/api/events/public')).json();
const pl = { id: liveId, formation: '4-3-3', lineup: { 500: 'LCB', 501: 'GK' } };
sqlite.prepare('INSERT OR REPLACE INTO notify_prefs (user_id, prefs, updated) VALUES (?, ?, ?)').run('501', JSON.stringify({ event: 'off' }), Date.now());
const pv = await call(mgr, '/api/events/lineup', { ...pl, preview: true, dm: true, channel: '70001', tag: true, home: true });
t('preview: says who is told and tagged (muted skipped) and changes nothing', pv.d.preview.dm.join() === '500' && pv.d.preview.tag.join() === '500' && pv.d.preview.muted.join() === '501' && pv.d.preview.home === true && !(await call(mgr, '/api/events')).d.events.find((e) => e.id === liveId).lineupAt);
const before = [notesFor('500'), notesFor('501')], nPosts = posts.length;
const quiet = await call(mgr, '/api/events/lineup', { ...pl, publish: true, dm: false, discord: false, home: true });
t('post with DM off and no channel: nobody told, nothing on Discord', quiet.s === 200 && !quiet.d.notified && posts.length === nPosts && notesFor('500') === before[0]);
t('home on: public events carry the line-up (names + positions, no ids)', (await pub()).events?.find((e) => e.id === liveId)?.lineup?.players?.some((p) => p.pos === 'GK') && !JSON.stringify((await pub()).events).includes('"501"'));
const loud = await call(mgr, '/api/events/lineup', { ...pl, publish: true, dm: true, channel: '70001', tag: true, home: false, discord: false });
t('post with DM on: each starter who has not muted is told their position', loud.d.notified === 1 && notesFor('500') === before[0] + 1 && notesFor('501') === before[1]);
const sent = posts.at(-1); var lineupMsg = sent;
t('post to a chosen channel tags the starters (muted one stays a plain name)', sent?.channel === '70001' && loud.d.discord?.ok && loud.d.tagged === 1 && JSON.stringify(sent).includes('<@500>') && !JSON.stringify(sent).includes('<@501>') && sent.allowed_mentions.users.join() === '500');
t('home off again: line-up leaves the public route', !(await pub()).events?.find((e) => e.id === liveId)?.lineup);
sqlite.prepare("DELETE FROM notify_prefs WHERE user_id = '501'").run();
setFlags({ matchNight: 'owner' });
t('match night flag gates check-in', (await call(member, '/api/events/checkin', { id: liveId, on: true })).s === 404);
setFlags({ matchNight: 'members' });

// Session report for a real archived night: an event around the newest League match + a Rush result that day.
// Isolate this report from Rush fixtures created by earlier cases; otherwise a real newest match dated today can
// make unrelated same-day fixture rows leak into the report and change its totals.
sqlite.exec('DELETE FROM rush_players; DELETE FROM rush_matches;');
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
t('report: team games include every League match in the window + the Rush result', inWin.length >= 1 && rep.d.team.games === inWin.length + 1);
t('report: team goals include every League match in the window + the Rush result', rep.d.team.gf === inWin.reduce((a, m) => a + m.gf, 0) + 3);
t('report: team grade is derived from the report totals', rep.d.team.grade === teamGrade(rep.d.team.w, rep.d.team.d, rep.d.team.games, rep.d.team.gf, rep.d.team.ga));
t('report: player lines merge League + Rush, graded', me0 && me0.games === p0lines.length + 1 && me0.g === p0lines.reduce((a, x) => a + x.g, 0) + 2 && me0.grade === playerGrade(me0.avg) && me0.user?.id === '500');
t('report: position trial compared with the season average', me0.trial?.pos === 'CB' && (me0.trial.season == null || me0.trial.diff === Math.round((me0.avg - me0.trial.season) * 10) / 10));
t('report: attendance – no-shows and walk-ins', rep.d.attendance.came === 1 && rep.d.attendance.noShow.some((x) => x.id === '501') && rep.d.attendance.walkIns.some((x) => x.id === '500'));
t('member cannot share the report', (await call(member, '/api/events/report/post', { id: evId })).s === 403);
const shared = await call(mgr, '/api/events/report/post', { id: evId, channel: '70001' });
t('manager shares: Discord post + attendees notified + marked', shared.s === 200 && shared.d.discord?.ok && /Session report/.test(plainText(posts.at(-1))) && shared.d.notified === 2 && (await call(member2, '/api/notify')).d.items.some((n) => /^Session report/.test(n.title)));

// ----- BE11 report poster (R2) -----
const PNG = (n = 200) => { const b = new Uint8Array(n); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); return b; };
const posterUp = async (tok, bytes, type = 'image/png', id = evId) => {
  const r = await W(`/api/events/report/poster?id=${id}`, { method: 'POST', headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': type, 'Content-Length': String(bytes.length) }, body: bytes });
  return { s: r.status, d: await r.json().catch(() => null) };
};
t('report poster: members cannot upload', (await posterUp(member, PNG())).s === 403);
t('report poster: non-PNG refused', (await posterUp(mgr, PNG(), 'image/jpeg')).s === 415);
t('report poster: a file that isn’t really a PNG is refused (sniffed)', (await posterUp(mgr, Buffer.from('<html></html>'))).s === 415);
t('report poster: unknown event refused', (await posterUp(mgr, PNG(), 'image/png', 999999)).s === 404);
const posted = await posterUp(mgr, PNG());
t('report poster: manager uploads, stored in R2, key saved on the event', posted.s === 200 && !!posted.d.key && r2objects.has(posted.d.key) && posted.d.url.endsWith(`/media/${posted.d.key}`));
const repAfter = await call(mgr, `/api/events/report?id=${evId}`);
t('report poster: the key round-trips through the report + the share embed carries it as the image', repAfter.d.event.reportPoster === posted.d.key
  && (await call(mgr, '/api/events/report/post', { id: evId, channel: '70001' })).d.discord?.ok && images(posts.at(-1)).some((u) => u.endsWith(`/media/${posted.d.key}`)));

// ----- BE4 nudge a short position -----
await call(member2, '/api/profile', { positions: ['GK'] });
const nudged = await call(mgr, '/api/events/nudge', { id: e2, position: 'GK' });
t('manager nudges members who play a short position and have not answered', nudged.s === 200 && nudged.d.notified === 1
  && (await call(member2, '/api/notify')).d.items.some((n) => n.type === 'event' && /short on GK/.test(n.title)));
t('member cannot nudge', (await call(member, '/api/events/nudge', { id: e2, position: 'GK' })).s === 403);
t('nudging a position nobody plays fails', (await call(mgr, '/api/events/nudge', { id: e2, position: 'RW' })).s === 409);
t('unknown position refused', (await call(mgr, '/api/events/nudge', { id: e2, position: 'QB' })).s === 400);

await tt('activity log records the night', async () => {
  const types = sqlite.prepare("SELECT DISTINCT type FROM activity WHERE type LIKE 'event-%'").all().map((r) => r.type);
  return ['event-new', 'event-edit', 'event-cancel', 'event-rsvp', 'event-checkin', 'event-lineup', 'event-report', 'event-nudge'].every((x) => types.includes(x));
});
// ----- BE11 month grid front end (web/calendar.js, wired from web/events.js) -----
const { readFileSync } = await import('node:fs');
const calJs = readFileSync(new URL('../web/calendar.js', import.meta.url), 'utf8');
const evJs = readFileSync(new URL('../web/events.js', import.meta.url), 'utf8');
t('month grid: calendar.js exposes NXCalendar.grid and calls the month endpoint', /window\.NXCalendar\s*=\s*\{\s*grid\s*\}/.test(calJs) && calJs.includes('/api/events/calendar?month='));
t('month grid: Monday-first offset and no NaN/undefined in the markup path', calJs.includes('(cur.getDay() + 6) % 7') && !/\bundefined\b\s*\+/.test(calJs));
t('month grid: schedule toggles 📆 Month and loads assets/calendar.js', evJs.includes('data-cal-view') && evJs.includes('assets/calendar.js') && evJs.includes("view = 'list'"));

// ----- notifications: one DM each, new design, links that land on the new pages -----
const nt = await import('../bot/notify.js');
t('old members.html links map to the new Hub pages', nt.relink('members.html#schedule-12') === 'hub-matchnight.html' && nt.relink('members.html#awards') === 'hub-squad.html' && nt.relink('players/5.html') === 'players/5.html');
const dupA = await nt.notify(env, ['500'], { type: 'event', title: 'Dup guard test', link: 'members.html#schedule-3' }), dupB = await nt.notify(env, ['500'], { type: 'event', title: 'Dup guard test', link: 'members.html#schedule-3' });
t('the same alert twice in a row lands once, with the new link', dupA === 1 && dupB === 0 && sqlite.prepare("SELECT link FROM notifications WHERE user_id = '500' AND title = 'Dup guard test'").get().link === 'hub-matchnight.html');
sqlite.prepare("DELETE FROM notifications WHERE title = 'Dup guard test'").run();
await nt.notify(env, ['500'], { type: 'event', title: 'Claim test', link: 'hub-matchnight.html' });
let dmSends = 0; const wrapped = globalThis.fetch;
globalThis.fetch = async (u, init) => { if (String(u).endsWith('/channels/dm/messages')) dmSends++; return wrapped(u, init); };
await Promise.all([nt.deliverDMs(env), nt.deliverDMs(env)]);
globalThis.fetch = wrapped;
t('two DM senders at once: the queued DM goes out exactly once', dmSends === 1);
const dmText = JSON.stringify(nt.dmMessage(env, { type: 'event', icon: '🧩', title: 'You’re starting at CM', ref: 'lineup:4:1', at: Date.now() }, 'https://x/hub-matchnight.html'));
const chText = JSON.stringify(lineupMsg);
t('DM and channel post look different: DM is personal with the banner + gold stripe, the channel post groups the XI by line', /your position/i.test(dmText) && dmText.includes('Just for you') && dmText.includes('banner-matchnight') && !chText.includes('Just for you') && /DEFENCE/.test(chText) && /GK/.test(chText) && chText.includes('hub-matchnight.html'));
const { cardJobs, lineupSlug } = await import('../scripts/cards.mjs');
t('line-up post carries the drawn pitch for its shape (field view), and the build draws one per shape', JSON.stringify(lineupMsg).includes('cards/lineup-4-3-3.png') && cardJobs({ matches: [] }, []).filter((j) => j.key[0] === 'lineup').length === Object.keys((await import('../bot/events.js')).FORMATIONS).length && lineupSlug('4-3-3 (2)') === '4-3-3-2');
// Announced by default: no notify/discord in the request -> players told + posted to the last-used channel; discord:false opts out.
const annBefore = posts.length;
const auto = await call(mgr, '/api/events', { ...base, date: tomorrow, time: '21:30' });
t('create with no flags announces by default (players told + Discord post)', auto.s === 200 && auto.d.notified >= 1 && auto.d.discord?.ok && posts.length === annBefore + 1 && posts.at(-1).channel === '70001');
const silentEv = await call(mgr, '/api/events', { ...base, date: tomorrow, time: '22:30', notify: false, discord: false });
t('notify:false + discord:false stay silent', silentEv.s === 200 && !silentEv.d.notified && !silentEv.d.discord && posts.length === annBefore + 1);
for (const id of [auto.d.id, silentEv.d.id]) await call(mgr, '/api/events/cancel', { id });

// ----- notification routing table (bot/routing.js): action -> group -> method -> channel -----
t('routing: managers cannot read or write the table', (await call(mgr, '/api/bot/routes')).s === 403 && (await call(mgr, '/api/bot/routes', { rules: [] })).s === 403);
const table = (await call(owner, '/api/bot/routes')).d;
t('routing: owner sees the actions, groups and methods', table.rules.length === 0 && table.actions['event.created'] && table.groups.role && table.methods.everyone);
t('routing: a role cannot be DMed, bad ids and unknown picks are refused', (await call(owner, '/api/bot/routes', { rules: [{ action: 'event.created', group: 'role', role: '77777', method: 'dm' }] })).s === 400
  && (await call(owner, '/api/bot/routes', { rules: [{ action: 'event.created', group: 'everyone', method: 'channel', channel: 'general' }] })).s === 400
  && (await call(owner, '/api/bot/routes', { rules: [{ action: 'nope', group: 'everyone', method: 'channel' }] })).s === 400
  && (await call(owner, '/api/bot/routes', { rules: [{ action: 'event.created', group: 'role', method: 'tag' }] })).s === 400);
const saved = await call(owner, '/api/bot/routes', { rules: [
  { action: 'event.created', group: 'managers', method: 'dm' },
  { action: 'event.created', group: 'everyone', method: 'everyone', channel: '70002' },
  { action: 'event.created', group: 'role', role: '77777', method: 'tag', channel: '70003' },
  { action: 'event.created', group: 'everyone', method: 'channel', channel: '70004', on: false },
] });
t('routing: the table is saved', saved.s === 200 && saved.d.rules.length === 4 && saved.d.rules[3].on === false);
const sentBefore = posts.length;
const routedEv = await call(mgr, '/api/events', { ...base, title: 'Routed night', date: tomorrow, time: '19:15' });
const routedPosts = posts.slice(sentBefore);
t('routing: rules replace the defaults – posts only where the rules say', routedEv.s === 200 && routedPosts.map((p) => p.channel).join() === '70002,70003');
t('routing: tag @everyone → ping line + parse everyone', routedPosts[0].allowed_mentions.parse.includes('everyone') && routedPosts[0].components[0].content === '@everyone');
t('routing: tag a role → role mention only', routedPosts[1].components[0].content.startsWith('<@&77777>') && routedPosts[1].allowed_mentions.roles?.[0] === '77777' && !routedPosts[1].allowed_mentions.parse?.length);
t('routing: DM rule reaches managers, a plain member gets nothing', (await call(owner, '/api/notify')).d.items.some((n) => /^New: Routed night/.test(n.title)) && !(await call(member, '/api/notify')).d.items.some((n) => /^New: Routed night/.test(n.title)));
t('routing: the event remembers its first posted channel (so answer buttons stay live)', (await call(mgr, '/api/events')).d.events.find((e) => e.title === 'Routed night')?.posted === true);
const tagged = await call(owner, '/api/bot/routes', { rules: [{ action: 'event.created', group: 'managers', method: 'tag', channel: '70005' }] });
const b4 = posts.length;
await call(mgr, '/api/events', { ...base, title: 'Tagged night', date: tomorrow, time: '19:45' });
t('routing: tag a group → members mentioned by name', tagged.s === 200 && posts.length === b4 + 1 && posts.at(-1).channel === '70005' && /<@(111|600)>/.test(posts.at(-1).components[0].content) && posts.at(-1).allowed_mentions.users.length >= 1);
const quietEv = await call(mgr, '/api/events', { ...base, title: 'Quiet night', date: tomorrow, time: '20:45', notify: false, discord: false });
t('routing: the form’s opt-out beats the rules', quietEv.s === 200 && posts.length === b4 + 1);
await call(owner, '/api/bot/routes', { rules: [] });
const b5 = posts.length;
await call(mgr, '/api/events', { ...base, title: 'Back to default', date: tomorrow, time: '21:15' });
t('routing: clearing the table restores the built-in announce', posts.length === b5 + 1 && posts.at(-1).channel === '70001');

// ----- paid plan switch + forced DMs (bot/limits.js, notify() force) -----
const { limitsFor } = await import('../bot/limits.js');
const { deliverDMs } = await import('../bot/notify.js');
t('plan: paid lifts the free-plan numbers', limitsFor('paid').dmPerRun > limitsFor('free').dmPerRun && limitsFor('paid').memberLivePerRun > limitsFor('free').memberLivePerRun && limitsFor('nonsense').dmPerRun === 25);
t('plan: managers cannot change it, a bad value is refused, the owner can', (await call(mgr, '/api/bot/settings', { plan: 'paid' })).s === 403 && (await call(owner, '/api/bot/settings', { plan: 'gold' })).s === 400
  && (await call(owner, '/api/bot/settings', { plan: 'paid' })).d.plan === 'paid' && (await call(owner, '/api/bot/settings')).d.plan === 'paid' && (await call(member, '/api/notify/count')).d.pollSec === 60);
await call(owner, '/api/bot/settings', { plan: 'free' });
t('forced DM: refused on a channel rule', (await call(owner, '/api/bot/routes', { rules: [{ action: 'event.created', group: 'everyone', method: 'channel', force: true }] })).s === 400);
await call(member, '/api/notify/prefs', { prefs: { event: 'off' } });
const frow = (uid, like) => sqlite.prepare('SELECT forced, dm FROM notifications WHERE user_id = ? AND title LIKE ?').get(uid, like);
await call(owner, '/api/bot/routes', { rules: [{ action: 'event.created', group: 'everyone', method: 'dm' }] });
await call(mgr, '/api/events', { ...base, title: 'Respectful night', date: tomorrow, time: '10:15', discord: false });
t('without force a muted member is left alone', !frow('500', 'New: Respectful night%') && !!frow('501', 'New: Respectful night%'));
await call(owner, '/api/bot/routes', { rules: [{ action: 'event.created', group: 'everyone', method: 'dm', force: true }] });
await call(mgr, '/api/events', { ...base, title: 'Forced night 1', date: tomorrow, time: '10:30', discord: false });
t('with force a muted member gets the DM, marked forced (urgent queue)', frow('500', 'New: Forced night 1%')?.forced === 1 && frow('500', 'New: Forced night 1%')?.dm === 'queued');
sqlite.prepare("INSERT INTO notify_prefs (user_id, dm_failed_at, updated) VALUES ('501', ?, ?) ON CONFLICT (user_id) DO UPDATE SET dm_failed_at = excluded.dm_failed_at").run(Date.now(), Date.now());
await call(mgr, '/api/events', { ...base, title: 'Forced night 2', date: tomorrow, time: '10:45', discord: false });
t('closed DMs: bell only, not forced', frow('501', 'New: Forced night 2%')?.dm === null && frow('501', 'New: Forced night 2%')?.forced === 0);
for (const k of [3, 4, 5, 6]) await call(mgr, '/api/events', { ...base, title: `Forced night ${k}`, date: tomorrow, time: `1${k}:00`.slice(-5), discord: false });
t('forced DMs are capped at 5 a day per member', sqlite.prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = '500' AND forced = 1").get().c === 5 && !frow('500', 'New: Forced night 6%'));
sqlite.prepare("DELETE FROM notifications WHERE user_id = '500'").run();
const ins = (title, forced) => sqlite.prepare("INSERT INTO notifications (user_id, type, title, at, dm, forced) VALUES ('500', 'event', ?, ?, 'queued', ?)").run(title, Date.now(), forced).lastInsertRowid;
const plain = ins('plain first', 0), urgent = ins('urgent second', 1);
await deliverDMs(env, 1);
t('urgent DMs go first in the queue', sqlite.prepare('SELECT dm FROM notifications WHERE id = ?').get(urgent).dm === 'sent' && sqlite.prepare('SELECT dm FROM notifications WHERE id = ?').get(plain).dm === 'queued');
await call(owner, '/api/bot/routes', { rules: [] });

// ----- Control Center: saving one setting must not wipe the others; routing actions know their feature -----
await call(owner, '/api/bot/settings', { resultChannel: '12345678901', pingRole: '22222', reminderChannel: '33333' });
const keep = await call(owner, '/api/bot/settings', { reminderChannel: '44444' });
t('settings: a partial save keeps the other channels and the plan', keep.d.reminderChannel === '44444' && keep.d.resultChannel === '12345678901' && keep.d.pingRole === '22222' && keep.d.plan === 'free');
t('routing: every action belongs to a site feature (Control Center rows)', Object.values((await call(owner, '/api/bot/routes')).d.actions).every((a) => a.feature) && Object.entries((await call(owner, '/api/bot/routes')).d.actions).filter(([k]) => k.startsWith('event.')).every(([, a]) => a.feature === 'events'));

// ----- Wave A actions + engine rules: silenced, channel-only actions -----
t('routing: results/awards/highlight/insight/discovery actions exist with their feature', ['results.posted', 'awards.results', 'hotw.winner', 'insights.weekly', 'discoveries.approved'].every((k) => (table.actions[k]?.feature)));
t('routing: match results are posted from outside the app – DMs and per-person tags are refused', (await call(owner, '/api/bot/routes', { rules: [{ action: 'results.posted', group: 'everyone', method: 'dm' }] })).s === 400
  && (await call(owner, '/api/bot/routes', { rules: [{ action: 'results.posted', group: 'everyone', method: 'tag' }] })).s === 400
  && (await call(owner, '/api/bot/routes', { rules: [{ action: 'results.posted', group: 'role', role: '55555', method: 'tag', channel: '70001' }, { action: 'results.posted', group: 'everyone', method: 'everyone' }] })).s === 200);
const { routeNotification } = await import('../bot/routing.js');
await call(owner, '/api/bot/routes', { rules: [{ action: 'awards.results', group: 'everyone', method: 'channel', channel: '70009', on: false }] });
const silenced = await routeNotification(env, 'awards.results', { build: () => ({}) });
t('routing: an action whose rules are all off is silenced (not back to the old behaviour)', silenced?.silenced === true && silenced.posts.length === 0 && (await routeNotification(env, 'hotw.winner', { build: () => ({}) })) === null);
const rtmod = await import('../bot/routing.js');
t('routing: the result poster reads the rules for match results', (await rtmod.publicRoutes(env, 'results.posted')).managed === false && (await rtmod.publicRoutes(env, 'awards.results')).managed === true);
await call(owner, '/api/bot/routes', { rules: [] });

// ----- Test button + web method + routeOr -----
const rt0 = posts.length, dm0 = dmPosts.length;
const tChan = await call(owner, '/api/bot/routes/test', { rule: { action: 'event.created', group: 'everyone', method: 'everyone', channel: '70002' } });
t('route test: a channel/@everyone rule is previewed in the owner’s DMs only, pings off, nothing posted', tChan.s === 200 && posts.length === rt0 && dmPosts.length === dm0 + 1
  && dmPosts.at(-1).allowed_mentions.parse.length === 0 && /TEST/.test(JSON.stringify(dmPosts.at(-1))));
const tWeb = await call(owner, '/api/bot/routes/test', { rule: { action: 'awards.results', group: 'everyone', method: 'web' } });
t('route test: web → the owner’s bell, no Discord message, nobody else', tWeb.s === 200 && dmPosts.length === dm0 + 1
  && (await call(owner, '/api/notify')).d.items.some((n) => /\[Test\] Weekly awards/.test(n.title)) && !(await call(member, '/api/notify')).d.items.some((n) => /\[Test\]/.test(n.title)));
const tDm = await call(owner, '/api/bot/routes/test', { rule: { action: 'hotw.winner', group: 'managers', method: 'dm' } });
t('route test: dm → the owner’s bell + Discord DM even if muted', tDm.s === 200 && dmPosts.length === dm0 + 2 && posts.length === rt0);
t('route test: owner only, bad rules refused', (await call(mgr, '/api/bot/routes/test', { rule: { action: 'hotw.winner', group: 'everyone', method: 'web' } })).s === 403
  && (await call(owner, '/api/bot/routes/test', { rule: { action: 'nope', group: 'everyone', method: 'web' } })).s === 400
  && (await call(owner, '/api/bot/routes/test', { rule: { action: 'results.posted', group: 'everyone', method: 'dm' } })).s === 400);
const { routeOr } = await import('../bot/routing.js');
let legacyRan = 0;
const viaLegacy = await routeOr(env, 'live.club', { build: () => ({ components: [] }), channel: '70001' }, async () => { legacyRan++; return { ok: true, id: 'old' }; });
t('routeOr: no rules → the old behaviour runs', legacyRan === 1 && viaLegacy.id === 'old');
await call(owner, '/api/bot/routes', { rules: [{ action: 'live.club', group: 'everyone', method: 'channel', channel: '70008' }] });
const b6 = posts.length;
const viaRule = await routeOr(env, 'live.club', { build: (o) => ({ components: [], allowed_mentions: { parse: [] } }), channel: '70001' }, async () => { legacyRan++; return { ok: true }; });
t('routeOr: rules decide, the old channel is not used', legacyRan === 1 && viaRule.ok && posts.length === b6 + 1 && posts.at(-1).channel === '70008');
await call(owner, '/api/bot/routes', { rules: [{ action: 'live.club', group: 'everyone', method: 'channel', on: false }] });
const viaOff = await routeOr(env, 'live.club', { build: () => ({ components: [] }), channel: '70001' }, async () => { legacyRan++; return { ok: true }; });
t('routeOr: every rule off = silenced, nothing posted', viaOff.silenced === true && legacyRan === 1 && posts.length === b6 + 1);
t('routing: live, feed, welcome/leave actions know their feature', ['live.club', 'live.member', 'live.stream', 'creator.video', 'feed.newpost', 'member.welcome', 'member.leave'].every((k) => (rtmod.ACTIONS[k] ?? {}).feature));
await call(owner, '/api/bot/routes', { rules: [] });

done();