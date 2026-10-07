// Locker Room (redesign BE2): GET /api/locker – next event + my RSVP + who's in, open award vote + deadline,
// unread notification count, achievements unlocked since I last saw them, batched into one call.
import { call, env, login, sqlite } from './mock.mjs';
import { readFileSync } from 'node:fs';
import { t, done } from './lib.mjs';
import { motmClosed, motmCloses, motmStatus, MOTM_WINDOW_MS } from '../bot/locker.js';
import { weekOf } from '../bot/awards.js';
import { ClubRoom, broadcastRoom } from '../bot/clubroom.js';
import { notify } from '../bot/notify.js';
import { W } from './mock.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ locker: 'members', events: 'members', notifications: 'members', awards: 'members' });

const member = await login('800', [], 'Locker One');
const member2 = await login('801', [], 'Locker Two');

t('flag off → 404', await (async () => { setFlags({ locker: 'off' }); const r = await call(member, '/api/locker'); setFlags({ locker: 'members' }); return r.s === 404; })());
t('no event → next is null, empty vote/achievements', (await call(member, '/api/locker')).d.next === null);

// ----- next event + who's in -----
const start = Date.now() + 3600e3;
const evId = Number(sqlite.prepare("INSERT INTO events (type, start, duration, tz, status, at) VALUES ('league', ?, 90, 'UTC', 'scheduled', ?)").run(start, Date.now()).lastInsertRowid);
sqlite.prepare("INSERT INTO event_rsvps (event_id, user_id, status, name, at) VALUES (?, '800', 'yes', 'Locker One', ?)").run(evId, Date.now());
sqlite.prepare("INSERT INTO event_rsvps (event_id, user_id, status, name, at) VALUES (?, '801', 'maybe', 'Locker Two', ?)").run(evId, Date.now());
let r = await call(member, '/api/locker');
t('next event: id/start, my answer, who said yes', r.d.next.id === evId && r.d.next.mine === 'yes' && r.d.next.inCount === 1 && r.d.next.in.some((p) => p.id === '800'));
t('maybe is not counted as "in"', !r.d.next.in.some((p) => p.id === '801'));

// ----- open vote + deadline -----
const week = weekOf(Date.now());
r = await call(member, '/api/locker');
t('vote: this week, closes at the week end, not voted yet', r.d.vote.week === week.key && r.d.vote.closes === week.end && r.d.vote.voted === false);
const cat = sqlite.prepare('SELECT id FROM award_categories WHERE active = 1 LIMIT 1').get();
sqlite.prepare("INSERT INTO award_votes (week, category_id, user_id, player, at) VALUES (?, ?, '800', 'somekey', ?)").run(week.key, cat.id, Date.now());
t('vote: voted flips true after a ballot', (await call(member, '/api/locker')).d.vote.voted === true);
t('vote: per-member, not shared', (await call(member2, '/api/locker')).d.vote.voted === false);

// ----- unread notifications -----
sqlite.prepare("INSERT INTO notifications (user_id, type, title, ack, at) VALUES ('800', 'event', 'Test', 0, ?)").run(Date.now());
t('unread notification count', (await call(member, '/api/locker')).d.unread === 1);

// ----- new achievements -----
sqlite.prepare("INSERT INTO achievements (user_id, id, at, seen) VALUES ('800', 'debut', ?, 0)").run(Date.now());
sqlite.prepare("INSERT INTO achievements (user_id, id, at, seen) VALUES ('800', 'profile', ?, 1)").run(Date.now());
r = await call(member, '/api/locker');
t('achievements: only unseen ones, with icon/name/tier', r.d.achievements.length === 1 && r.d.achievements[0].id === 'debut' && r.d.achievements[0].icon === '👟' && r.d.achievements[0].tier === 'common');

// ----- board 07: medal shelf (rarest first) + latest alerts -----
sqlite.prepare("INSERT INTO achievements (user_id, id, at, seen) VALUES ('800', 'goals-50', ?, 1)").run(Date.now() - 5000);
r = await call(member, '/api/locker');
t('medals: every unlock counted, rarest first, with icon/name/tier', r.d.medals.count === 3 && r.d.medals.total > 3 && r.d.medals.top[0].id === 'goals-50' && r.d.medals.top.every((m) => m.icon && m.name && m.tier));
t('medals: per member', (await call(member2, '/api/locker')).d.medals.count === 0);
for (let i = 0; i < 4; i++) sqlite.prepare("INSERT INTO notifications (user_id, type, title, ack, at) VALUES ('800', 'event', ?, 0, ?)").run(`Alert ${i}`, Date.now());
r = await call(member, '/api/locker');
t('alerts: my 3 newest, newest first', r.d.alerts.length === 3 && r.d.alerts[0].title === 'Alert 3' && r.d.alerts.every((a) => a.read === false));
t('alerts: never someone else\'s', (await call(member2, '/api/locker')).d.alerts.length === 0);

// ----- board 07 badges: Playbook to-learn count + My builds -----
setFlags({ tactics: 'members', builder: 'members' });
r = await call(member, '/api/locker');
t('playbook: 0 with nothing assigned, builds 0', r.d.playbook === 0 && r.d.builds === 0);
const mkPlay = (pub, arch) => Number(sqlite.prepare("INSERT INTO plays (title, created_by, created_at, updated_at, published, archived) VALUES ('P', '1', ?, ?, ?, ?)").run(Date.now(), Date.now(), pub, arch).lastInsertRowid);
const [pA, pB, pC, pD] = [mkPlay(1, 0), mkPlay(1, 0), mkPlay(0, 0), mkPlay(1, 1)];
for (const id of [pA, pB, pC, pD]) sqlite.prepare("INSERT INTO play_assign (play_id, user_id, assigned_at) VALUES (?, '800', ?)").run(id, Date.now());
t('playbook: counts published, unarchived, unlearned assigned plays', (await call(member, '/api/locker')).d.playbook === 2);
sqlite.prepare("UPDATE play_assign SET learned = 1 WHERE play_id = ? AND user_id = '800'").run(pA);
t('playbook: drops once learned', (await call(member, '/api/locker')).d.playbook === 1);
t('playbook: per member', (await call(member2, '/api/locker')).d.playbook === 0);
setFlags({ tactics: 'off' });
t('playbook: tactics flag off → 0', (await call(member, '/api/locker')).d.playbook === 0);
setFlags({ tactics: 'members' });
const mkBuild = (uid, removed) => sqlite.prepare("INSERT INTO builds (user_id, title, code, arch, level, at, updated_at, removed_at) VALUES (?, 'B', 'abc', 'a', 50, ?, ?, ?)").run(uid, Date.now(), Date.now(), removed);
mkBuild('800', null); mkBuild('800', null); mkBuild('800', Date.now()); mkBuild('801', null);
t('builds: my live builds only', (await call(member, '/api/locker')).d.builds === 2 && (await call(member2, '/api/locker')).d.builds === 1);
setFlags({ builder: 'off' });
t('builds: builder flag off → 0', (await call(member, '/api/locker')).d.builds === 0);

// ----- board 07 MOTM close + winner flip (flag lockerRoom) -----
const nowS = Math.floor(Date.now() / 1000);
t('motm: closes 72 h after the match', motmCloses({ ts: nowS }) === nowS * 1000 + MOTM_WINDOW_MS && !motmClosed({ ts: nowS - 3600 }) && motmClosed({ ts: nowS - 73 * 3600 }) && !motmClosed({}));
const ps = [{ k: 'a', n: 'Ann', pos: 'forward', r: 7 }, { k: 'b', n: 'Bea', pos: 'defender', r: 8 }, { k: 'c', n: 'Cat', pos: 'goalkeeper', r: 6 }];
const fake = async () => ({ matches: [{ id: 'm-old', ts: nowS - 80 * 3600, ps }, { id: 'm-tie', ts: nowS - 90 * 3600, ps }, { id: 'm-none', ts: nowS - 100 * 3600, ps }, { id: 'm-new', ts: nowS - 3600, ps }].slice(0, 3) });
const vote = (m, u, p) => sqlite.prepare('INSERT INTO votes (match_id, user_id, player, name, at) VALUES (?, ?, ?, ?, 1)').run(m, u, p, 'x');
vote('m-old', 'u1', 'a'); vote('m-old', 'u2', 'a'); vote('m-old', 'u3', 'b'); vote('m-tie', 'u1', 'a'); vote('m-tie', 'u2', 'b');
let ms = await motmStatus(env, fake);
t('motm: closed match → winner is the most-voted player', ms[0].closed && ms[0].winner.k === 'a' && ms[0].winner.votes === 2 && ms[0].winner.tie === false);
t('motm: tie → higher match rating wins, flagged tied', ms[1].winner.k === 'b' && ms[1].winner.tie === true);
t('motm: closed with no votes → no winner', ms[2].closed && ms[2].winner === null);
const fake2 = async () => ({ matches: [{ id: 'm-open', ts: nowS - 3600, ps }] });
vote('m-open', 'u1', 'c');
ms = await motmStatus(env, fake2);
t('motm: open match → not closed, winner hidden until it closes', !ms[0].closed && ms[0].winner === null && ms[0].closes > Date.now());
setFlags({ lockerRoom: 'off' });
t('motm: lockerRoom off → no motm payload on /api/locker', (await call(member, '/api/locker')).d.motm.length === 0);
setFlags({ lockerRoom: 'members' });
r = await call(member, '/api/locker');
t('motm: lockerRoom on → statuses for the recent matches', Array.isArray(r.d.motm) && r.d.motm.every((x) => typeof x.closes === 'number' && typeof x.closed === 'boolean'));

const appJs = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const lockerJs = readFileSync(new URL('../web/locker.js', import.meta.url), 'utf8');
const membersJs = readFileSync(new URL('../bot/members.js', import.meta.url), 'utf8');
t('motm: POST /api/vote refuses a closed match only when lockerRoom is on', /flagOn\(env, me, 'lockerRoom'\) && motmClosed\(m\)/.test(membersJs));
t('front end: rail badges for Playbook + My builds, My builds entry gated by builder flag', appJs.includes('data-badge="playbook"') && appJs.includes('data-badge="builds"') && appJs.includes("flagOn('builder', baseRole)") && lockerJs.includes('playbook: data.playbook'));
t('front end: closed vote shows a flip-to-reveal winner card, escaped', lockerJs.includes('data-wflip') && lockerJs.includes('${esc(w.n)}') && lockerJs.includes('closesIn(st.closes)'));

// ----- front end: the hub tab is wired to the route -----
t('hub: Locker Room tab is flag-gated and loads /api/locker', appJs.includes("['locker', '🎽 My locker']") && appJs.includes('NXLocker') && readFileSync(new URL('../web/locker.js', import.meta.url), 'utf8').includes("call('/api/locker')"));

// ----- live refresh (BE2): broadcasts + socket route -----
const pushes = [], sockets = [];
env.CLUB_ROOM = {
  idFromName: (n) => n,
  get: (name) => ({ fetch: async (req, init) => {
    const url = typeof req === 'string' ? req : req.url;
    if (url.includes('/push')) pushes.push({ room: name, ...JSON.parse(init.body) });
    else sockets.push({ room: name, u: new URL(url).searchParams.get('u') });
    return new Response('ok');
  } }),
};
const last = () => pushes[pushes.length - 1];

t('broadcast: unknown room names are refused, nothing sent', (await broadcastRoom(env, 'bogus', { t: 'x' })) === false && pushes.length === 0);
t('broadcast: no binding (local dev) is a quiet no-op', (await broadcastRoom({ ...env, CLUB_ROOM: undefined }, 'locker', {})) === false);

pushes.length = 0;
await call(member, '/api/events/rsvp', { id: evId, status: 'no' });
t('rsvp: pings the locker for everyone (no `to`)', last()?.t === 'locker' && last().why === 'rsvp' && last().to === undefined && last().room === 'locker');

pushes.length = 0;
await call(member, '/api/awards/vote', { category: cat.id, player: null });
const votePing = pushes.find((p) => p.why === 'vote');
t('vote: pings only the voter (to = my id)', votePing && JSON.stringify(votePing.to) === '["800"]');

pushes.length = 0;
await notify(env, ['800', '801'], { type: 'event', title: 'Locker ping test' });
t('notify: unread ping goes to the members who got a row', last()?.why === 'unread' && last().to.includes('800') && last().to.includes('801'));

pushes.length = 0;
await call(member, '/api/notify/read', { all: true });
t('notify read: pings only me', last()?.why === 'unread' && JSON.stringify(last().to) === '["800"]');

// the Durable Object itself: `to` limits delivery, and the id list is not forwarded to clients
{
  const got = { a: [], b: [] };
  const ws = (u, bucket) => ({ deserializeAttachment: () => ({ u }), send: (d) => bucket.push(d) });
  const ctx = { getWebSockets: () => [ws('800', got.a), ws('801', got.b)], setWebSocketAutoResponse() {} };
  const room = new ClubRoom(ctx, env);
  const post = (body) => room.fetch(new Request('https://room/push', { method: 'POST', body: JSON.stringify(body) }));
  await post({ t: 'locker', why: 'unread', to: ['800'] });
  t('room: targeted event reaches only the named member', got.a.length === 1 && got.b.length === 0);
  t('room: `to` is stripped before it reaches clients', !('to' in JSON.parse(got.a[0])) && JSON.parse(got.a[0]).why === 'unread');
  await post({ t: 'locker', why: 'rsvp' });
  t('room: untargeted event reaches everyone', got.a.length === 2 && got.b.length === 1);
  t('room: bad body → 400', (await room.fetch(new Request('https://room/push', { method: 'POST', body: 'nope' }))).status === 400);
}

// socket route: session checked first, then the flag; the room is only reached with a real member
const sock = (tok, extra = {}) => W('/api/locker/ws?t=' + encodeURIComponent(tok), { headers: { Upgrade: 'websocket' }, ...extra });
sockets.length = 0;
t('socket: no token → 404, room never reached', (await sock('garbage')).status === 404 && sockets.length === 0);
t('socket: plain GET (no upgrade) → 426', (await W('/api/locker/ws?t=' + member)).status === 426);
setFlags({ locker: 'off' });
t('socket: flag off → 404, room never reached', (await sock(member)).status === 404 && sockets.length === 0);
setFlags({ locker: 'members' });
const up = await sock(member);
t('socket: member is routed into the locker room as me', up.status === 200 && sockets.length === 1 && sockets[0].room === 'locker' && sockets[0].u === '800');
env.CLUB_ROOM = undefined;
t('socket: no binding → 503', (await sock(member)).status === 503);
env.CLUB_ROOM = { idFromName: (n) => n, get: () => ({ fetch: async () => new Response('ok') }) };

// ----- front end: live refresh is wired to the socket, poll stays as the fallback -----
t('front end: Locker tab opens /api/locker/ws and closes it on other tabs', appJs.includes('/api/locker/ws?t=') && appJs.includes("if (tab === 'locker' && lockerOn) { lockerLive(true); return; }") && appJs.includes('window.NXLocker?.refresh()') && appJs.includes("if (tab !== 'locker') lockerLive(false);"));
t('front end: refresh on ping, 60 s fallback while the socket is down', appJs.includes("e.data !== 'pong') lockerRefresh()") && appJs.includes('}, 60000);') && appJs.includes('lockerLive'));

// ----- board 07 front end: grouped rail, opens on the locker, every section wired -----
const lkJs = readFileSync(new URL('../web/locker.js', import.meta.url), 'utf8');
t('board 07: hub opens on the locker and swaps chips for a grouped rail when the flag is on', appJs.includes("const HOME = lockerOn ? 'locker' : 'me'") && appJs.includes('class="hub-rail') && appJs.includes("['Match nights',"));
t('board 07: one-tap RSVP, card vote, flip + save image, all user text escaped', lkJs.includes("'/api/events/rsvp'") && lkJs.includes("'/api/vote'") && lkJs.includes("data-lk=\"flip\"") && lkJs.includes('toBlob') && !/\$\{(p|a|pl|m)\.(n|title|opp|name)\}/.test(lkJs));
t('board 07 ships behind its own managers flag (QA 2026-10-06); members keep the simple Locker tab', JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8')).features.lockerRoom === 'managers' && appJs.includes("flagOn('lockerRoom', baseRole)") && appJs.includes("['locker', '🎽 Locker Room']") && appJs.includes('function viewLocker()'));
t('board 07: motion respects reduced-motion', lkJs.includes('reduced()') && readFileSync(new URL('../web/style.css', import.meta.url), 'utf8').includes('.lk-swing.swing,.lk-medal.fresh .lk-coin'));

t('board 07: error state hands raw text to UI.empty (it escapes once, no double-escape)', lkJs.includes("title: 'Could not open your locker', text: er.message") && !lkJs.includes('text: esc(er.message)'));

t('no login → 401', (await call(null, '/api/locker')).s === 401);
done();
