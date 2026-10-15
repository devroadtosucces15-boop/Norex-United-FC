// Reminders (E3, bot/reminders.js): feedback waiting for a reaction, and the occasional "this exists" nudge – not nagging.
import { env, call, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';
import { remindersCron } from '../bot/reminders.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ notifications: 'members', reminders: 'members', feedback: 'members' });
const a = await login('500'), b = await login('501'), c = await login('502');
const rem = (id) => sqlite.prepare("SELECT * FROM notifications WHERE user_id = ? AND type = 'remind' ORDER BY id").all(id);
const NOW = Date.UTC(2026, 9, 13, 14, 0); // Tuesday 14:00 UTC
const site = async () => ({ matches: [] });
const stamp = (at) => sqlite.prepare("UPDATE notifications SET at = ? WHERE type = 'remind' AND at > ?").run(at, at); // notify() stamps real time – pin it to the simulated clock
for (const u of ['500', '501', '502']) sqlite.prepare('UPDATE users SET last_at = ? WHERE id = ?').run(NOW - 3600e3, u);

// 501 got a message 30 h ago and never reacted; 502 reacted; 500 got one only 2 h ago
const ins = sqlite.prepare("INSERT INTO feedback (from_id, from_name, to_id, to_name, kind, body, at, reaction) VALUES ('900', 'X', ?, 'N', 'tip', 'a long enough body', ?, ?)");
ins.run('501', NOW - 30 * 3600e3, null); ins.run('502', NOW - 30 * 3600e3, 'check'); ins.run('500', NOW - 2 * 3600e3, null);

setFlags({ reminders: 'off' });
t('flag off → nothing', (await remindersCron(env, site, NOW)).waiting === 0 && rem('501').length === 0);
setFlags({ reminders: 'members' });
t('before 09:00 UTC → nothing', (await remindersCron(env, site, NOW - 6 * 3600e3)).waiting === 0);

const r1 = await remindersCron(env, site, NOW); stamp(NOW);
t('waiting: only the member with feedback unanswered for 24 h+', r1.waiting === 1 && rem('501').length === 1 && rem('500').length === 0 && rem('502').length === 0);
t('waiting: points at the feedback and carries no message text', rem('501')[0].link === 'members.html#feedback' && !/long enough/.test(JSON.stringify(rem('501')[0])));
await remindersCron(env, site, NOW + 3 * 3600e3);
t('waiting: not again the same day', rem('501').length === 1);
await remindersCron(env, site, NOW + 3 * DAY(1)); stamp(NOW + 3 * DAY(1));
t('waiting: again after 3 days while it is still unanswered', rem('501').length === 2);
sqlite.prepare("UPDATE feedback SET reaction = 'like' WHERE to_id = '501'").run();
await remindersCron(env, site, NOW + 8 * DAY(1));
t('waiting: stops once they react', rem('501').length === 2);

// the occasional nudge: after a match, verified players, once a fortnight
for (const u of ['501', '502']) sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at) VALUES (?, ?, ?, 'approved', 1)").run(u, `p${u}`, `P${u}`);
const N2 = NOW + 20 * DAY(1);
for (const u of ['500', '501', '502']) sqlite.prepare('UPDATE users SET last_at = ? WHERE id = ?').run(N2 - 3600e3, u);
const match = { matches: [{ id: 'm9', ts: Math.floor((N2 - 5 * 3600e3) / 1000) }] };
const r2 = await remindersCron(env, async () => match, N2);
t('nudge: after a match, to verified players only', r2.nudge === 2 && rem('501').at(-1).ref === 'remind:nudge' && rem('502').length === 1 && !rem('500').some((x) => x.ref === 'remind:nudge'));
const N3 = N2 + 3 * DAY(1);
for (const u of ['501', '502']) sqlite.prepare('UPDATE users SET last_at = ? WHERE id = ?').run(N3 - 3600e3, u);
t('nudge: at most once a fortnight', (await remindersCron(env, async () => ({ matches: [{ id: 'm10', ts: Math.floor((N3 - 5 * 3600e3) / 1000) }] }), N3)).nudge === 0);
done();
function DAY(n) { return n * 86400e3; }
