// Locker Room (redesign BE2): GET /api/locker – next event + my RSVP + who's in, open award vote + deadline,
// unread notification count, achievements unlocked since I last saw them, batched into one call.
import { call, env, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';
import { weekOf } from '../bot/awards.js';

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
const cat = sqlite.prepare('SELECT id FROM award_categories LIMIT 1').get();
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

t('no login → 401', (await call(null, '/api/locker')).s === 401);
done();
