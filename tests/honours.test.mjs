// Advanced metrics (P1.2), leaderboards (P4.5), hall of fame (P4.6): metrics engine, pages, squad boards + legends API.
import fs from 'node:fs';
import { call, env, login, ROOT, siteJson, sqlite, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import '../web/metrics.js';

const M = globalThis.NXMetrics;
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };

// ----- metrics engine -----
const ts = (d) => Date.parse(d + 'T20:00:00Z') / 1000;
const P = (k, g, a, r, x = {}) => ({ k, n: k.toUpperCase(), g, a, r, motm: false, shots: 0, secs: 5400, ...x });
const ms = [
  { id: 1, ts: ts('2026-08-30'), gf: 3, ga: 0, res: 'W', players: [P('a', 2, 0, 9, { shots: 4, motm: true, grp: 'FWD' }), P('b', 0, 2, 7.5, { grp: 'MID' })] },
  { id: 2, ts: ts('2026-09-02'), gf: 1, ga: 1, res: 'D', players: [P('a', 1, 0, 7, { shots: 2, grp: 'FWD' }), P('b', 0, 1, 6.5, { grp: 'MID' })] },
  { id: 3, ts: ts('2026-09-05'), gf: 2, ga: 1, res: 'W', players: [P('a', 1, 1, 8, { shots: 2, grp: 'FWD' }), P('b', 1, 0, 8.5, { grp: 'MID' }), P('c', 0, 0, 6, { grp: 'GK' })] },
  { id: 4, ts: ts('2026-09-09'), gf: 0, ga: 2, res: 'L', players: [P('a', 0, 0, 6, { grp: 'FWD' }), P('b', 0, 0, 6, { grp: 'MID' })] },
];
const tab = M.table(ms);
const a = tab.find((x) => x.k === 'a'), b = tab.find((x) => x.k === 'b');
t('metrics: totals', a.apps === 4 && a.g === 4 && a.a === 1 && a.motm === 1 && b.ga === 4);
t('metrics: per 90 + conversion + involvement', a.ga90 === 1.25 && a.conv === 50 && a.inv === 83);
t('metrics: clutch = goals in one-goal games and draws', a.clutch === 2 && b.clutch === 1);
t('metrics: form weights recent games (a 9,7,8,6 → 7.1)', a.form === 7.1);
t('metrics: consistency needs 3 games', a.sd > 0 && tab.find((x) => x.k === 'c').sd === null);
t('metrics: scoring streak resets, best kept, unbeaten run ends at the loss', a.streak === 0 && a.bestStreak === 3 && a.unbeaten === 0);
const per = M.periods(ms);
t('periods: newest month first', per.map((p) => p.key).join() === '2026-09,2026-08' && per[0].label === 'September 2026');
t('potm: needs regular apps', M.potm(M.table(per[0].matches), M.minApps(per[0].matches))?.k === 'a');
const xi = M.bestXI(tab, 2);
t('best XI: lines by group, short lines stay short', xi.find(([g]) => g === 'FWD')[1][0].k === 'a' && xi.find(([g]) => g === 'GK')[1].length === 0);
const ctx = { esc: (s) => String(s).replace(/</g, '&lt;'), id: 't', link: (p) => ctx.esc(p.n), empty: 'EMPTY' };
const html = M.leadersHtml(ctx, ms);
t('leaders html: a tab per month + season', (html.match(/role="tab"/g) || []).length === 3 && html.includes('data-p="season"'));
t('leaders html: empty input → empty state', M.leadersHtml(ctx, []) === 'EMPTY');
t('names are escaped', !M.advancedHtml({ ...ctx, link: (p) => ctx.esc('<b>' + p.n) }, ms).includes('<b>A'));

// ----- pages -----
const read = (f) => fs.readFileSync(ROOT + 'site/' + f, 'utf8');
const lead = read('leaders.html'), hof = read('halloffame.html'), stats = read('stats.html');
t('P4.5 leaders.html: League/Rush switch + months view', lead.includes('data-rush="months"') && lead.includes('mx-periods'));
t('P4.5 leaders.html: squad boards behind flag', lead.includes('data-flag="leaders"') && lead.includes('data-leaders-members'));
t('P4.5 nav links Leaders', read('index.html').includes('href="leaders.html"'));
t('P4.6 hall of fame: awards, history, legends slot', hof.includes('id="awards"') && hof.includes('data-hof-timeline') && hof.includes('data-flag="hallOfFame"'));
t('P4.6 footer links the Hall of Fame', read('index.html').includes('halloffame.html'));
t('P1.2 stats page: advanced metrics with Rush view', stats.includes('id="advanced"') && stats.includes('data-rush="advanced"') && stats.includes('assets/metrics.js'));
t('assets shipped', ['metrics.js', 'honours.js', 'honours.css'].every((f) => fs.existsSync(ROOT + 'site/assets/' + f)));

// ----- API -----
const owner = await login('111', [], 'Founder');
const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500');
setFlags({ hallOfFame: 'owner', leaders: 'owner' }); // config.json may already have them on (QA1)
t('flags: hof 404 while owner-only (guest)', (await W('/api/hof')).status === 404);
t('flags: leaders 404 for a member while owner-only', (await call(member, '/api/leaders')).s === 404);
t('owner can read hof while owner-only', (await call(owner, '/api/hof')).s === 200);
setFlags({ hallOfFame: 'public', leaders: 'members' });

const pl = siteJson('players').find((p) => p.home) ?? siteJson('players')[0];
t('member cannot induct (403)', (await call(member, '/api/hof', { kind: 'legend', player: pl.k })).s === 403);
t('legend: unknown player rejected', (await call(mgr, '/api/hof', { kind: 'legend', player: 'nope' })).s === 400);
t('moment: needs text', (await call(mgr, '/api/hof', { kind: 'moment', name: 'Promoted' })).s === 400);
t('moment: bad date rejected', (await call(mgr, '/api/hof', { kind: 'moment', name: 'Promoted', text: 'x', date: '2026-13-40' })).s === 400);
const ind = await call(mgr, '/api/hof', { kind: 'legend', player: pl.k, title: 'Captain <script>', text: 'Led the line', date: '2026-09-20' });
t('legend: manager inducts a site player (name from the site)', ind.s === 200 && ind.d.legends[0].k === pl.k && ind.d.legends[0].n === pl.n);
t('legend: angle brackets stripped', !ind.d.legends[0].title.includes('<'));
const mo = await call(mgr, '/api/hof', { kind: 'moment', name: 'Promoted to Division 3', text: 'Won the last game 4–1', date: '2026-09-21' });
t('moment added', mo.s === 200 && mo.d.moments.length === 1);
const pub = await (await W('/api/hof')).json();
t('public GET shows legends + moments, no manage rights', pub.legends.length === 1 && pub.moments.length === 1 && pub.canManage === false);
t('manager sees canManage', (await call(mgr, '/api/hof')).d.canManage === true);
const rm = await call(mgr, '/api/hof/remove', { id: mo.d.moments[0].id });
t('remove hides the moment, row kept', rm.s === 200 && rm.d.moments.length === 0 && sqlite.prepare('SELECT removed_at FROM hof WHERE kind = ?').get('moment').removed_at > 0);
t('member cannot remove (403)', (await call(member, '/api/hof/remove', { id: ind.d.legends[0].id })).s === 403);

// squad boards
const month = new Date().toISOString().slice(0, 7);
const today = new Date().toISOString().slice(0, 10);
sqlite.prepare('INSERT OR REPLACE INTO availability (date, user_id, status, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)').run(today, '500', 'yes', 'User 500', null, Date.now());
sqlite.prepare('INSERT OR REPLACE INTO votes (match_id, user_id, player, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)').run('m1', '500', pl.k, 'User 500', null, Date.now());
sqlite.prepare('INSERT OR REPLACE INTO votes (match_id, user_id, player, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)').run('m1', '600', pl.k, 'Coach', null, Date.now());
const sb = await call(member, `/api/leaders?month=${month}`);
t('squad boards: attendance counts "yes" days', sb.s === 200 && sb.d.attendance.some((u) => u.id === '500' && u.yes >= 1));
t('squad boards: MOTM vote winner tallied with site name', sb.d.motmVotes.some((p) => p.k === pl.k && p.n === pl.n && p.wins >= 1));
t('squad boards: votes cast per member', sb.d.voters.some((u) => u.id === '600' && u.votes >= 1));
t('squad boards: bad month rejected', (await call(member, '/api/leaders?month=2026-13')).s === 400);
t('squad boards: guests need login', (await W('/api/leaders')).status === 401);
done();
