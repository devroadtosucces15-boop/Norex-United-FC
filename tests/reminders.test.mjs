// Gentle reminders (E3, bot/reminders.js): MOTM vote, weekly ratings, Rush squad – once each, one per member per day, daytime only.
import { env, call, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';
import { remindersCron } from '../bot/reminders.js';
import { weekOf } from '../bot/awards.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ notifications: 'members', reminders: 'members' });
const a = await login('500'), b = await login('501'), c = await login('502');
const count = (id, type = 'remind') => sqlite.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND type = ?').get(id, type).n;

// Tuesday 2026-10-13 14:00 UTC; the match ended 5 hours earlier
const NOW = Date.UTC(2026, 9, 13, 14, 0);
const club = { matches: [{ id: 'm1', opp: 'Rivals FC', ts: Math.floor((NOW - 5 * 3600e3) / 1000), ps: [] }] };
const site = async () => club;
sqlite.prepare("INSERT INTO votes (match_id, user_id, player, name, at) VALUES ('m1', '500', 'p1', 'A', ?)").run(NOW);

setFlags({ reminders: 'off' });
t('flag off → nothing', (await remindersCron(env, site, NOW)).motm === 0 && count('501') === 0);
setFlags({ reminders: 'members' });

const r1 = await remindersCron(env, site, NOW - 6 * 3600e3); // 08:00 UTC
t('before 09:00 UTC → nothing', r1.motm === 0 && count('501') === 0);

const r2 = await remindersCron(env, site, NOW);
t('MOTM: only members who have not voted are nudged', r2.motm >= 2 && count('500') === 0 && count('501') === 1 && count('502') === 1);
const row = sqlite.prepare("SELECT * FROM notifications WHERE user_id = '501' AND type = 'remind'").get();
t('MOTM: points at the vote, mentions the opponent', row.link === 'hub-matchnight.html#mn-motm' && /Rivals FC/.test(row.title));
await remindersCron(env, site, NOW + 600e3);
t('MOTM: never sent twice for the same match', count('501') === 1);

// Sunday 2026-10-18 13:00 UTC – rating reminder, but only for those without a reminder in the last 20 h (everyone had one Tuesday, so all eligible)
const SUN = Date.UTC(2026, 9, 18, 13, 0), wk = weekOf(SUN).key;
sqlite.prepare("INSERT INTO star_ratings (week, user_id, player, stars, name, at) VALUES (?, '500', 'p1', 4, 'A', ?)").run(wk, SUN);
const r3 = await remindersCron(env, async () => ({ matches: [] }), SUN);
t('rate: Sunday afternoon, only members who have not rated', r3.rate >= 2 && count('500') === 0 && count('501') === 2);
await remindersCron(env, async () => ({ matches: [] }), SUN + 600e3);
t('rate: once per week', count('501') === 2);

// daily cap: a member who just got a reminder is skipped by the next kind
const MON = Date.UTC(2026, 9, 19, 12, 0);
sqlite.prepare("INSERT INTO events (type, title, start, duration, tz, status, at) VALUES ('rush', 'Rush night', ?, 120, 'UTC', 'scheduled', ?)").run(MON + 5 * 3600e3, MON);
const ev = sqlite.prepare('SELECT id FROM events ORDER BY id DESC LIMIT 1').get().id;
for (const u of ['500', '501']) sqlite.prepare("INSERT INTO event_rsvps (event_id, user_id, name, status, at) VALUES (?, ?, ?, 'yes', ?)").run(ev, u, 'x', MON);
sqlite.prepare("INSERT INTO rush_prefs (user_id, ranks, updated) VALUES ('500', '[]', ?)").run(MON);
const r4 = await remindersCron(env, async () => ({ matches: [] }), MON);
t('squad: RSVP-yes members without picks get one nudge', r4.squad === 1 && count('501') === 3 && count('500') === 0);
const r5 = await remindersCron(env, async () => ({ matches: [] }), MON + 600e3);
t('squad: once per event', r5.squad === 0 && count('501') === 3);
done();
