// P4.1 weekly awards: ISO weeks, ballots, closing (vote winners + stat awards), Player of the Month, reveal data,
// trophy cabinet, Discord announcement, manager tools.
import { call, env, login, siteJson, sqlite, W } from './mock.mjs';
import { closeDue, closeWeek, weekOf } from '../bot/awards.js';
import { t, tt, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const load = (f) => Promise.resolve(siteJson(f));

// ----- weeks -----
const w1 = weekOf(Date.parse('2026-09-28T12:00:00Z'));
t('ISO week: Mon 28 Sep 2026 = 2026-W40, Monday 00:00 → +7 days', w1.key === '2026-W40' && new Date(w1.start).toISOString() === '2026-09-28T00:00:00.000Z' && w1.end - w1.start === 7 * 864e5);
t('ISO week: Sunday belongs to the week before, year edges', weekOf(Date.parse('2026-10-04T23:59:00Z')).key === '2026-W40' && weekOf(Date.parse('2027-01-01T12:00:00Z')).key === '2026-W53' && weekOf(Date.parse('2026-01-01T12:00:00Z')).key === '2026-W01');
t('week month = the month of its Sunday', weekOf(Date.parse('2026-09-30T12:00:00Z')).month === '2026-10');

// ----- setup -----
env.DISCORD_BOT_TOKEN = 'bot';
const posts = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  const m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m && m[1] !== 'dm') { posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: 'p' }); }
  if (m) return Response.json({ id: 'dm-msg' });
  return realFetch(url, init);
};
const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500', [], 'Player One');
const member2 = await login('501', [], 'Player Two');
const home = siteJson('players').filter((p) => p.home);
const [pA, pB, pC] = home;

setFlags({ awards: 'owner', notifications: 'members' });
t('flag: awards 404 for members while owner-only', (await call(member, '/api/awards')).s === 404 && (await W(`/api/awards/player?k=${pA.k}`)).status === 404);
setFlags({ awards: 'public' });

// ----- ballot -----
const st = (await call(member, '/api/awards')).d;
t('ballot: 4 built-in awards, NOREX nominees, stat awards listed', st.categories.length === 4 && st.categories.every((c) => c.builtin) && st.nominees.length === home.length && st.stats.map((s) => s.k).join() === 'boot,playmaker,ironman,rising' && !st.canManage);
const striker = st.categories.find((c) => c.name === 'Best Striker');
t('vote', (await call(member, '/api/awards/vote', { category: striker.id, player: pA.k })).d.my[striker.id] === pA.k);
t('change vote', (await call(member, '/api/awards/vote', { category: striker.id, player: pB.k })).d.my[striker.id] === pB.k);
t('take vote back', !(await call(member, '/api/awards/vote', { category: striker.id, player: null })).d.my[striker.id]);
t('only NOREX players', (await call(member, '/api/awards/vote', { category: striker.id, player: 'nobody' })).s === 400);
sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at, name) VALUES ('501', ?, ?, 'approved', ?, 'Player Two')").run(pC.k, pC.n, Date.now());
t('no voting for yourself', (await call(member2, '/api/awards/vote', { category: striker.id, player: pC.k })).s === 400);
t('members can’t manage', (await call(member, '/api/awards/category', { name: 'Most Non-Sleeper' })).s === 403);
const fun = await call(mgr, '/api/awards/category', { name: 'Most Non-Sleeper', icon: '😴🌙x', grp: 'any' });
const funCat = fun.d.categories.find((c) => c.name === 'Most Non-Sleeper');
t('manager adds a fun award (icon trimmed)', funCat && !funCat.builtin && funCat.icon === '😴🌙' && fun.d.canManage);
t('built-in awards can’t be retired', (await call(mgr, '/api/awards/category/remove', { id: striker.id })).s === 409);
t('fun awards can', !(await call(mgr, '/api/awards/category/remove', { id: funCat.id })).d.categories.some((c) => c.id === funCat.id));
t('bad nominee group refused', (await call(mgr, '/api/awards/category', { name: 'Odd one', grp: 'COACH' })).s === 400);

// ----- closing a past week: vote winners (ties crown both) + stat awards from the match log -----
const squad = siteJson('squad'), cols = Object.fromEntries(squad.cols.map((c, i) => [c, i]));
const ts = Object.values(squad.players).flat()[0][cols.ts] * 1000;
const past = weekOf(ts);
// Opening the ballot already closed last week (lazy close, like the cron) – check, then reopen it for this test.
t('opening the ballot closes last week on its own (lazy close)', !!sqlite.prepare('SELECT 1 FROM award_weeks WHERE week = ?').get(weekOf(Date.now() - 7 * 864e5).key));
sqlite.prepare('DELETE FROM award_weeks WHERE week = ?').run(past.key); sqlite.prepare('DELETE FROM award_winners WHERE period = ?').run(past.key);
const vote = (uid, cat, k) => sqlite.prepare('INSERT INTO award_votes (week, category_id, user_id, player, at) VALUES (?, ?, ?, ?, ?)').run(past.key, cat, uid, k, Date.now());
vote('500', striker.id, pA.k); vote('501', striker.id, pB.k); vote('600', striker.id, pA.k); vote('601', striker.id, pB.k);
const res = await closeWeek(env, past, load);
const won = sqlite.prepare('SELECT award, player, value FROM award_winners WHERE period = ?').all(past.key);
t('close: a tie crowns both with their votes', won.filter((w) => w.award === String(striker.id)).map((w) => w.player).sort().join() === [pA.k, pB.k].sort().join() && won.find((w) => w.award === String(striker.id)).value === 2);
const inWeek = Object.entries(squad.players).map(([k, l]) => [k, l.filter((r) => r[cols.ts] * 1000 >= past.start && r[cols.ts] * 1000 < past.end)]).filter(([, l]) => l.length);
const maxG = Math.max(...inWeek.map(([, l]) => l.reduce((s, r) => s + r[cols.g], 0)));
const maxGp = Math.max(...inWeek.map(([, l]) => l.length));
t('close: Golden Boot = most goals that week', maxG === 0 ? !won.some((w) => w.award === 'boot') : won.filter((w) => w.award === 'boot').every((w) => w.value === maxG));
t('close: Iron Man = most appearances that week', won.filter((w) => w.award === 'ironman').every((w) => w.value === maxGp) && won.some((w) => w.award === 'ironman'));
t('close happens once', res && (await closeWeek(env, past, load)) === null);

// ----- manual close of this week + Player of the Month roll-up + announcement -----
sqlite.prepare("INSERT INTO award_weeks (week, month, closed_at, posted_at) VALUES ('2026-W33', '2026-08', 1, 1)").run();
for (const [a, k] of [['1', pA.k], ['2', pA.k], ['boot', pB.k]]) sqlite.prepare("INSERT INTO award_winners (period, award, player, name, value, at) VALUES ('2026-W33', ?, ?, 'x', 3, 1)").run(a, k);
await call(mgr, '/api/awards/settings', { channel: '70001' });
await call(member, '/api/awards/vote', { category: striker.id, player: pC.k });
const closed = await call(mgr, '/api/awards/close', {});
t('manager closes this week: winners out, ballot locked', closed.s === 200 && closed.d.closed && closed.d.last.week === closed.d.week && closed.d.last.winners.some((w) => w.k === pC.k && w.name === 'Best Striker'));
t('voting after close → 409', (await call(member, '/api/awards/vote', { category: striker.id, player: pA.k })).s === 409);
t('Player of the Month for a finished month (vote wins count 1, stat ½)', sqlite.prepare("SELECT player FROM award_winners WHERE period = 'M2026-08' AND award = 'potm'").all().map((r) => r.player).join() === pA.k);
t('winner (claimed) is told + everyone gets the reveal note', (await call(member2, '/api/notify')).d.items.some((n) => n.type === 'award' && /You won/.test(n.title)) && (await call(member, '/api/notify')).d.items.some((n) => n.type === 'award' && /awards are in/.test(n.title)));
t('results posted to the awards channel', posts.some((p) => p.channel === '70001' && /Weekly awards/.test(p.embeds[0].title) && p.embeds[0].description.includes(pC.n)));
t('second close refused', (await call(mgr, '/api/awards/close', {})).s === 409);
t('cron close is idempotent', (await closeDue(env, load)).closed === 0);

// ----- boards + trophy cabinet -----
const board = (await call(member, '/api/awards/board')).d;
t('boards: recent weeks, per-award leaders, Player of the Month', board.weeks.length >= 2 && board.awards.some((a) => a.name === 'Best Striker') && board.potm.some((p) => p.k === pA.k));
const cab = await (await W(`/api/awards/player?k=${pA.k}`)).json();
t('trophy cabinet is public: counts per award', cab.total >= 4 && cab.counts.some((c) => c.name === 'Player of the Month') && cab.counts.some((c) => c.name === 'Best Striker'));
t('unknown player → empty cabinet', (await (await W('/api/awards/player?k=nobody')).json()).total === 0);

await tt('activity log', async () => ['award-vote', 'award-category', 'award-category-remove', 'award-close'].every((x) => sqlite.prepare('SELECT 1 FROM activity WHERE type = ?').get(x)));
done();
