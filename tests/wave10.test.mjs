// Wave 10: P4.2 community star ratings, P4.4 anonymous feedback, P3.8 predictions game, P3.6 who to play with, PB.5 scout report (a).
import { call, env, login, siteJson, sqlite } from './mock.mjs';
import { summarise, MIN_RATERS } from '../bot/ratings.js';
import { unclean, PER_DAY } from '../bot/feedback.js';
import { points, scoreDue, seasonStart } from '../bot/predict.js';
import { localDate } from '../bot/events.js';
import { t, tt, done } from './lib.mjs';
import '../web/recs.js';
import '../web/scout.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const R = globalThis.NXRecs, S = globalThis.NXScout;
const claim = (uid, p, name) => sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at, name) VALUES (?, ?, ?, 'approved', ?, ?)").run(uid, p.k, p.n, Date.now(), name);
const home = siteJson('players').filter((p) => p.home);
const [pA, pB, pC, pD] = home;

const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('500', [], 'Player One');
const m2 = await login('501', [], 'Player Two');
const m3 = await login('502', [], 'Player Three');
const m4 = await login('503', [], 'Player Four');
claim('501', pC, 'Player Two'); claim('502', pA, 'Player Three'); claim('503', pD, 'Player Four');
setFlags({ notifications: 'members' });

// ================= P4.2 star ratings =================
{
  const keys = Array.from({ length: 12 }, (_, i) => `2026-W${String(30 + i).padStart(2, '0')}`);
  const s = summarise([{ week: '2026-W41', stars: 5, user_id: 'a' }, { week: '2026-W41', stars: 4, user_id: 'b' }, { week: '2026-W40', stars: 3, user_id: 'c' }], keys);
  t('rolling: newer weeks weigh more (5 + 4 this week, 3 last week → 4.05)', s.rolling === 4.05 && s.raters === 3);
  t('trend: a week with fewer than 3 ratings stays blank', s.trend.at(-1).avg === null && s.trend.at(-2).avg === null);
  t(`nothing shows under ${MIN_RATERS} raters`, summarise([{ week: '2026-W41', stars: 5, user_id: 'a' }, { week: '2026-W41', stars: 5, user_id: 'b' }], keys).rolling === null);
  t('ratings older than 8 weeks leave the rolling score', summarise([1, 2, 3].map((i) => ({ week: '2026-W31', stars: 5, user_id: `u${i}` })), keys).rolling === null);
}
setFlags({ starRatings: 'owner' });
t('ratings: 404 for members while owner-only', (await call(m1, '/api/ratings')).s === 404);
setFlags({ starRatings: 'members' });
const rs = (await call(m1, '/api/ratings')).d;
t('ratings: this week’s list = every NOREX player', rs.players.length === home.length && rs.min === MIN_RATERS && !rs.canSeeRaters);
t('rate 4★', (await call(m1, '/api/ratings/rate', { player: pA.k, stars: 4 })).d.my[pA.k] === 4);
t('take it back (0)', !(await call(m1, '/api/ratings/rate', { player: pA.k, stars: 0 })).d.my[pA.k]);
t('6★ refused', (await call(m1, '/api/ratings/rate', { player: pA.k, stars: 6 })).s === 400);
t('non-NOREX player refused', (await call(m1, '/api/ratings/rate', { player: 'nobody', stars: 3 })).s === 400);
t('no rating yourself', (await call(m3, '/api/ratings/rate', { player: pA.k, stars: 5 })).s === 400);
await call(m1, '/api/ratings/rate', { player: pA.k, stars: 5 });
await call(m2, '/api/ratings/rate', { player: pA.k, stars: 4 });
t('hover card: no score after 2 raters', (await call(m1, '/api/member?u=502')).d.stars?.rolling === null);
await call(m4, '/api/ratings/rate', { player: pA.k, stars: 3 });
const card = (await call(m1, '/api/member?u=502')).d;
t('hover card: score shows at 3 raters (4.0) with a trend', card.stars.rolling === 4 && card.stars.raters === 3 && card.stars.trend.length === 12 && card.stars.trend.at(-1) === 4);
t('board lists the rated player', (await call(m1, '/api/ratings')).d.board[0]?.k === pA.k);
const asMember = (await call(m1, `/api/ratings/player?k=${pA.k}`)).d;
t('raters stay private for members', !asMember.raterList && !JSON.stringify(asMember).includes('Player Two'));
const asMgr = (await call(mgr, `/api/ratings/player?k=${pA.k}`)).d;
t('managers see who rated', asMgr.raterList.length === 3 && asMgr.raterList.some((r) => r.n === 'Player Two' && r.stars === 4));

// ================= P4.4 anonymous feedback =================
t('filter: catches swearing, l33t and "kys" phrases', unclean('you are sh1t') && unclean('FUUUCK off') && unclean('just kill yourself') && unclean('what a wanker'));
t('filter: leaves normal football talk alone', !unclean('Great pass, class finish – Scunthorpe away was mad') && !unclean('assist king, passes for days') && !unclean('Cocky run but it worked'));
setFlags({ feedback: 'owner' });
t('feedback: 404 for members while owner-only', (await call(m2, '/api/feedback')).s === 404);
setFlags({ feedback: 'members' });
const fb0 = (await call(m2, '/api/feedback')).d;
t('verified player can send; recipients = other verified players', fb0.canSend && fb0.left === PER_DAY && fb0.recipients.some((r) => r.id === '502') && !fb0.recipients.some((r) => r.id === '501' || r.id === '500'));
t('unverified member can’t send', (await call(m1, '/api/feedback/send', { to: '502', kind: 'tip', text: 'Keep your shape at the back' })).s === 403);
t('only to verified players', (await call(m2, '/api/feedback/send', { to: '500', kind: 'tip', text: 'Keep your shape at the back' })).s === 400);
t('bad kind refused', (await call(m2, '/api/feedback/send', { to: '502', kind: 'rant', text: 'Keep your shape at the back' })).s === 400);
t('too short refused', (await call(m2, '/api/feedback/send', { to: '502', kind: 'tip', text: 'meh' })).s === 400);
t('bad language refused (422), nothing sent', (await call(m2, '/api/feedback/send', { to: '502', kind: 'concern', text: 'stop being a d1ckhead on comms' })).s === 422 && !sqlite.prepare("SELECT 1 FROM feedback WHERE from_id = '501'").get());
const sent = await call(m2, '/api/feedback/send', { to: '502', kind: 'praise', text: 'Your runs in behind are class – keep calling for it early' });
t('sent: counts down, shows in my sent list', sent.s === 200 && sent.d.left === PER_DAY - 1 && sent.d.sent[0].toName === 'Player Three');
const inbox = (await call(m3, '/api/feedback')).d;
t('recipient sees the message but not the author', inbox.inbox.length === 1 && inbox.unread === 1 && !JSON.stringify(inbox.inbox).includes('Player Two') && !('from' in inbox.inbox[0]));
t('recipient is told (bell), without the author', (await call(m3, '/api/notify')).d.items.some((n) => n.type === 'feedback' && !JSON.stringify(n).includes('Player Two')));
t('mark read', (await call(m3, '/api/feedback/read', {})).d.unread === 0);
await call(m2, '/api/feedback/send', { to: '502', kind: 'tip', text: 'Check your shoulder before receiving' });
await call(m2, '/api/feedback/send', { to: '503', kind: 'tip', text: 'Hold the line when we press high' });
t(`${PER_DAY} per day`, (await call(m2, '/api/feedback/send', { to: '503', kind: 'tip', text: 'One more thought for today' })).s === 429);
const fid = (await call(m3, '/api/feedback')).d.inbox.find((f) => f.kind === 'tip').id;
t('only the recipient can report', (await call(m4, '/api/feedback/report', { id: fid, reason: 'x' })).s === 404);
t('report → flagged', (await call(m3, '/api/feedback/report', { id: fid, reason: 'Not fair' })).d.inbox.find((f) => f.id === fid).reported);
t('reported twice → 409', (await call(m3, '/api/feedback/report', { id: fid, reason: 'again' })).s === 409);
t('members can’t see authors', (await call(m1, '/api/feedback/all')).s === 403 && (await call(m3, '/api/feedback/hide', { id: fid })).s === 403);
const all = (await call(mgr, '/api/feedback/all')).d.items;
t('managers see authors, reported first', all[0].id === fid && all[0].fromName === 'Player Two' && all[0].report === 'Not fair');
t('managers are told about reports', (await call(mgr, '/api/notify')).d.items.some((n) => /feedback reported/i.test(n.title)));
await call(mgr, '/api/feedback/hide', { id: fid, hidden: true });
t('hidden → gone from the inbox, sender sees it was hidden', !(await call(m3, '/api/feedback')).d.inbox.some((f) => f.id === fid) && (await call(m2, '/api/feedback')).d.sent.find((f) => f.id === fid).hidden);
t('profile shows "Send feedback" to verified players only', (await call(m2, '/api/member?u=502')).d.feedback === true && !(await call(m1, '/api/member?u=502')).d.feedback && !(await call(m3, '/api/member?u=502')).d.feedback);

// ================= P3.8 predictions =================
t('points: exact 3 · result + GD 2 · result 1 · miss 0', points({ gf: 2, ga: 1 }, { gf: 2, ga: 1 }) === 3 && points({ gf: 3, ga: 2 }, { gf: 2, ga: 1 }) === 2 && points({ gf: 1, ga: 0 }, { gf: 3, ga: 1 }) === 1 && points({ gf: 0, ga: 1 }, { gf: 2, ga: 1 }) === 0 && points({ gf: 1, ga: 1 }, { gf: 2, ga: 2 }) === 2);
t('season starts 1 September', seasonStart(Date.parse('2026-09-28T00:00:00Z')).label === '2026/27' && seasonStart(Date.parse('2027-03-01T00:00:00Z')).label === '2026/27' && seasonStart(Date.parse('2026-08-31T00:00:00Z')).label === '2025/26');
const addEvent = (type, start, duration = 120, title = null) => Number(sqlite.prepare('INSERT INTO events (type, title, start, duration, tz, at) VALUES (?, ?, ?, ?, ?, ?)').run(type, title, start, duration, 'UTC', Date.now()).lastInsertRowid);
const future = addEvent('league', Date.now() + 2 * 864e5, 120, 'Cup night');
const training = addEvent('training', Date.now() + 864e5);
setFlags({ predictions: 'owner' });
t('predictions: 404 for members while owner-only', (await call(m1, '/api/predict')).s === 404);
setFlags({ predictions: 'members' });
const pr0 = (await call(m1, '/api/predict')).d;
t('open: match nights only (no training)', pr0.open.some((e) => e.id === future && e.title === 'Cup night') && !pr0.open.some((e) => e.id === training));
t('predict 2–1', (await call(m1, '/api/predict', { event: future, gf: 2, ga: 1 })).d.open.find((e) => e.id === future).mine.gf === 2);
t('change it', (await call(m1, '/api/predict', { event: future, gf: 3, ga: 1 })).d.open.find((e) => e.id === future).mine.gf === 3);
t('bad score refused', (await call(m1, '/api/predict', { event: future, gf: 21, ga: 0 })).s === 400 && (await call(m1, '/api/predict', { event: future, gf: 1.5, ga: 0 })).s === 400);
t('training can’t be predicted', (await call(m1, '/api/predict', { event: training, gf: 1, ga: 0 })).s === 404);
t('others see how many predicted, not what', (await call(m2, '/api/predict')).d.open.find((e) => e.id === future).count === 1 && !('picks' in (await call(m2, '/api/predict')).d.open[0]));
const started = addEvent('league', Date.now() - 60e3);
t('locked at kick-off', (await call(m1, '/api/predict', { event: started, gf: 1, ga: 0 })).s === 409);

// League night scored on the first match in the window
const club = siteJson('club');
const first = [...club.matches].sort((a, b) => a.ts - b.ts)[0];
const night = addEvent('league', first.ts * 1000 - 10 * 60e3, 60, 'Past league night');
const res = (gf, ga) => Math.sign(gf - ga);
const pred = (uid, n, gf, ga) => sqlite.prepare('INSERT INTO predictions (event_id, user_id, name, gf, ga, at) VALUES (?, ?, ?, ?, ?, ?)').run(night, uid, n, gf, ga, 1);
pred('500', 'Player One', first.gf, first.ga); // exact
pred('501', 'Player Two', first.gf + 1, first.ga + 1); // same result + GD
pred('502', 'Player Three', first.ga + (res(first.gf, first.ga) ? 0 : 1), first.gf); // flipped (a miss unless a draw → still a miss: 1–0 vs draw)
const scored = (await call(m1, '/api/predict')).d;
const r = scored.recent.find((e) => e.id === night);
const pts = Object.fromEntries(sqlite.prepare('SELECT user_id, points FROM predictions WHERE event_id = ?').all(night).map((x) => [x.user_id, x.points]));
t('league night scored from the EA match log', r?.result.status === 'scored' && r.result.gf === first.gf && r.result.ga === first.ga);
t('points: exact 3, same GD 2, wrong 0', pts['500'] === 3 && pts['501'] === 2 && pts['502'] === 0);
t('after kick-off everyone’s picks are shown', r.picks.length === 3 && r.mine.points === 3);
t('predictors are told their points', (await call(m1, '/api/notify')).d.items.some((n) => n.type === 'predict' && /3 points – exact/.test(n.title)));
t('scoring runs once', (await scoreDue(env, (f) => Promise.resolve(siteJson(f)))).scored === 0);
t('boards: all-time + season', scored.boards.all[0].id === '500' && scored.boards.all[0].pts === 3 && typeof scored.boards.seasonLabel === 'string');

// Rush session scored on that day's first confirmed Rush result
const rushStart = Date.now() - 5 * 3600e3;
const rushNight = addEvent('rush', rushStart, 60);
sqlite.prepare("INSERT INTO rush_matches (date, opponent, gf, ga, status, by_id, at) VALUES (?, 'Pub XI', 4, 2, 'confirmed', '500', ?)").run(localDate(rushStart, 'UTC'), Date.now());
sqlite.prepare('INSERT INTO predictions (event_id, user_id, name, gf, ga, at) VALUES (?, ?, ?, ?, ?, ?)').run(rushNight, '501', 'Player Two', 3, 1, 1);
const rr = (await call(m2, '/api/predict')).d.recent.find((e) => e.id === rushNight);
t('Rush night scored from the logged result (3–1 vs 4–2 = 2 pts)', rr?.result.gf === 4 && rr.result.opp === 'Pub XI' && rr.mine.points === 2);
// A night with no match (data already runs past it) is void
const empty = addEvent('friendly', first.ts * 1000 - 40 * 864e5, 60);
sqlite.prepare('INSERT INTO predictions (event_id, user_id, name, gf, ga, at) VALUES (?, ?, ?, ?, ?, ?)').run(empty, '500', 'Player One', 1, 0, 1);
t('no match in the window → void, no points', (await call(m1, '/api/predict')).d.recent.find((e) => e.id === empty)?.result.status === 'void');
const month = new Date(first.ts * 1000).toISOString().slice(0, 7);
const lb = (await call(m1, `/api/leaders?month=${month}`)).d;
t('Leaders page gets the month’s prediction table', lb.predictions?.some((u) => u.id === '500' && u.pts === 3));

// ================= P3.6 who to play with =================
setFlags({ recommendations: 'owner' });
t('recs: 404 for members while owner-only', (await call(m3, '/api/recs')).s === 404);
setFlags({ recommendations: 'members' });
sqlite.prepare("INSERT OR REPLACE INTO rush_prefs (user_id, ranks, updated) VALUES ('502', '[\"503\"]', 1), ('501', '[\"502\"]', 1)").run();
const rushId = Number(sqlite.prepare("INSERT INTO rush_matches (date, opponent, gf, ga, status, by_id, at) VALUES ('2026-09-01', 'Five Guys', 3, 0, 'confirmed', '502', 1)").run().lastInsertRowid);
sqlite.prepare("INSERT INTO rush_players (match_id, slot, player, name) VALUES (?, 1, ?, 'A'), (?, 2, ?, 'D')").run(rushId, pA.k, rushId, pD.k);
const today = new Date().toISOString().slice(0, 10);
sqlite.prepare("INSERT OR REPLACE INTO availability (date, user_id, status, at) VALUES (?, '503', 'yes', 1), (?, '500', 'no', 1)").run(today, today);
const rec = (await call(m3, '/api/recs?mode=rush')).d;
const p503 = rec.people.find((p) => p.id === '503'), p501 = rec.people.find((p) => p.id === '501');
t('recs: everyone but me, with today’s availability', !rec.people.some((p) => p.id === '502') && p503.avail === 'yes' && rec.people.find((p) => p.id === '500').avail === 'no');
t('recs: my own pick is used', p503.myPick === 0);
t('recs: other members’ picks stay private (501 picked me – not shown)', p501.myPick === undefined && !JSON.stringify(rec).includes('ranks'));
t('recs: Rush results together from the log', rec.together[pD.k]?.games === 1 && rec.together[pD.k].wins === 1);
const ranked = R.rank(rec.me, rec.people, { together: rec.together });
t('rank: available + my pick + a win together comes first, "out today" last', ranked[0].id === '503' && ranked.at(-1).id === '500' && ranked[0].why.some((w) => /teammate pick/.test(w.text)));
t('rank: complementary positions score, same position doesn’t', R.score({ pos: ['ST'] }, { pos: ['CB'] }).score > R.score({ pos: ['ST'] }, { pos: ['ST'] }).score);
const grid = Array(7).fill(0xffffff);
t('rank: overlapping play times count', R.score({ pos: [], playTimes: grid, tz: 'UTC' }, { pos: [], playTimes: grid, tz: 'Europe/London' }).why.some((w) => /together 6 h/.test(w.text)));
const sq = siteJson('squad');
const [k0] = Object.keys(sq.players);
const pairs = R.pairs(sq, k0);
t('League pairs from api/squad.json (same match = together)', Object.values(pairs).every((p) => p.games >= 1 && p.wins <= p.games) && Object.keys(pairs).length > 0);
t('League mode works too', (await call(m3, '/api/recs?mode=league')).d.mode === 'league');

// ================= PB.5 scout report (a) =================
const games = S.fromSquad(sq);
const names = Object.fromEntries(siteJson('players').map((p) => [p.k, p.n]));
const rep = S.report(k0, games, { tracked: siteJson('players'), names });
t('scout: enough games → report with narrative, strengths, patterns', rep.enough && rep.narrative.length >= 3 && rep.narrative.every((x) => typeof x === 'string' && x.length > 20) && rep.patterns.length > 0);
t('scout: team-play scores are 0–100 (or null without data)', Object.values(rep.team).every((v) => v === null || (v >= 0 && v <= 100)));
t('scout: deterministic', JSON.stringify(S.report(k0, games, { tracked: siteJson('players'), names })) === JSON.stringify(rep));
t('scout: under 3 games → not enough yet', S.report('nobody', games).enough === false);
t('percentile: share below + half of ties, flips when lower is better', S.pctile(5, [1, 2, 3, 4]) === 100 && S.pctile(1, [2, 3, 4]) === 0 && S.pctile(1, [2, 3, 4], false) === 100 && S.pctile(3, [1, 2]) === null);
// Synthetic squad: X scores a lot but his passing falls away session after session.
const row = (ts, o) => ({ ts, res: 'W', g: 0, a: 0, r: 7, motm: 0, grp: 'FWD', pass: 8, passAtt: 10, tkl: 1, tklAtt: 2, shots: 2, saves: 0, ga: 1, dri: null, match: ts, ...o });
const synth = {};
for (const k of ['x', 'y', 'z', 'w']) synth[k] = [];
const day = 86400;
for (let s = 0; s < 5; s++) for (let i = 0; i < 2; i++) {
  const ts = 1e9 + s * day + i * 900;
  synth.x.push(row(ts, { g: 2, shots: 3, pass: 9 - s * 2, passAtt: 10, r: 8 - s * 0.2 }));
  for (const k of ['y', 'z', 'w']) synth[k].push(row(ts, { g: 0, pass: 9, passAtt: 10 }));
}
const sx = S.report('x', synth, { names: { x: 'Xavi', y: 'Yann' } });
t('scout: strength found (goals per game, best in the squad)', sx.strengths.some((s) => s.k === 'gpg' && /Best in squad forwards/.test(s.text)));
t('scout: area to improve with a target (pass accuracy vs squad)', sx.improve.some((i) => i.k === 'passPct' && /aim for 90%/.test(i.text)));
t('scout: red flags – pass % and rating falling 3 sessions running', sx.flags.some((f) => /Pass accuracy/.test(f.text)) && sx.flags.some((f) => /Rating/.test(f.text)));
t('scout: form pattern + partner', sx.patterns.some((p) => /Form has dipped/.test(p.text)) && sx.patterns.some((p) => /Plays best with/.test(p.text)));
t('scout: narrative names the player and the next step', sx.narrative[0].startsWith('Xavi is a forward with 10 League games') && sx.narrative.some((p) => p.startsWith('Next step – pass accuracy')));
const rush = { matches: [{ id: 1, date: '2026-09-01', res: 'W', ga: 1, players: [{ k: 'x', pos: 'ST', g: 2, a: 0, r: 8 }, { k: 'y', pos: 'CB', g: 0, a: 1 }] }, { id: 2, date: '2026-09-01', res: 'L', ga: 3, players: [{ k: 'x', pos: 'ST', g: 0, a: 0 }] }] };
const fr = S.fromRush(rush);
t('Rush adapter: games per player in order, position groups', fr.x.length === 2 && fr.x[0].g === 2 && fr.x[0].grp === 'FWD' && fr.y[0].grp === 'DEF' && fr.x[0].ts < fr.x[1].ts);

await tt('activity log', async () => ['star-rate', 'feedback-send', 'feedback-report', 'feedback-hide', 'predict'].every((x) => sqlite.prepare('SELECT 1 FROM activity WHERE type = ?').get(x)));
done();
