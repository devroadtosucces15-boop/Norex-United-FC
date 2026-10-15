// P1.8 extra EA data: dribbles + second assists (event codes 174/115), friendlies as a third mode, world top 100,
// match calendar filter. Builds the site once from a fixture copy of data/ with a fake friendly, event counts on one
// League match and a world table – then reads the pages.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { t, done } from './lib.mjs';
import { eventCounts } from '../scripts/lib.mjs';
import '../web/metrics.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const M = globalThis.NXMetrics;

// --- event parsing
const ev = eventCounts('111:21,174:5,115:2,24:2');
t('174 → dribbles, 115 → second assists, rest dropped', ev.dribbles === '5' && ev.secondassists === '2' && Object.keys(ev).length === 2);
t('missing codes count as 0', eventCounts('24:1').dribbles === '0' && eventCounts('24:1').secondassists === '0');
t('no event data → null (older matches stay unknown)', eventCounts('') === null && eventCounts(undefined) === null);

// --- metrics engine
const mk = (id, ts, ps) => ({ id, ts, gf: 2, ga: 1, res: 'W', players: ps });
const rows = M.table([
  mk(1, 1, [{ k: 'a', n: 'A', g: 1, a: 0, r: 7, motm: false, secs: 5400, dr: 10, sa: 1 }]),
  mk(2, 2, [{ k: 'a', n: 'A', g: 0, a: 1, r: 8, motm: false, secs: 5400, dr: 20, sa: 0 }, { k: 'b', n: 'B', g: 0, a: 0, r: 6, motm: false, secs: 5400 }]),
  mk(3, 3, [{ k: 'a', n: 'A', g: 0, a: 0, r: 7, motm: false, secs: 5400 }]),
]);
const A = rows.find((p) => p.k === 'a'), B = rows.find((p) => p.k === 'b');
t('dribbles per 90 only over games that have them', A.dr === 30 && A.dr90 === 15 && A.sa === 1 && A.evApps === 2);
t('players without event data stay null', B.dr === null && B.dr90 === null);
const ctx = { esc: (s) => String(s), id: 'x', link: (p) => p.n, empty: '' };
t('advanced table shows Drb/90 + 2nd A when data exists', /Drb\/90/.test(M.advancedHtml(ctx, [mk(1, 1, [{ k: 'a', n: 'A', g: 1, a: 0, r: 7, dr: 3, sa: 0 }])])));
t('…and hides them without (Rush)', !/Drb\/90/.test(M.advancedHtml(ctx, [mk(1, 1, [{ k: 'a', n: 'A', g: 1, a: 0, r: 7 }])])));

// --- fixture build
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'norex-p18-'));
const DATA = path.join(tmp, 'data'), OUT = path.join(tmp, 'site');
fs.cpSync(ROOT + 'data', DATA, { recursive: true });
const config = JSON.parse(fs.readFileSync(ROOT + 'config.json', 'utf8'));
const home = String(config.homeClubId);
const files = fs.readdirSync(path.join(DATA, 'matches')).filter((f) => f.endsWith('.json'));
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, 'matches', f), 'utf8'));
const league = files.map(read).filter((m) => m.clubs[home]).sort((a, b) => b.timestamp - a.timestamp);
if (!league.length) { t('fixture needs at least one archived home match', false); done(); process.exit(); }
// Event counts on the newest League match.
const evm = league[0];
for (const list of Object.values(evm.players)) for (const p of Object.values(list)) Object.assign(p, { dribbles: '7', secondassists: '1' });
fs.writeFileSync(path.join(DATA, 'matches', `${evm.matchId}.json`), JSON.stringify(evm));
// Keep one explicit pre-event-data fixture. Production data eventually ages past this transition, so the
// test must not depend on a naturally old archive row continuing to exist forever.
const olderFixture = league.find((m) => m.matchId !== evm.matchId);
if (olderFixture) {
  for (const list of Object.values(olderFixture.players || {})) for (const p of Object.values(list)) { delete p.dribbles; delete p.secondassists; }
  fs.writeFileSync(path.join(DATA, 'matches', `${olderFixture.matchId}.json`), JSON.stringify(olderFixture));
}
// A friendly: copy of the oldest match, new id, a day later, with a 9–0 score nobody could miss.
const fr = JSON.parse(JSON.stringify(league.at(-1)));
fr.matchId = '999000111'; fr.matchType = 'friendlyMatch'; fr.timestamp = league[0].timestamp + 86400;
const opp = Object.keys(fr.clubs).find((k) => k !== home);
fr.clubs[home] = { ...fr.clubs[home], goals: '9', wins: '1', losses: '0', ties: '0' };
fr.clubs[opp] = { ...fr.clubs[opp], goals: '0', wins: '0', losses: '1', ties: '0' };
fs.writeFileSync(path.join(DATA, 'matches', `${fr.matchId}.json`), JSON.stringify(fr));
// World top 100 without us, #100 at SR 2026.
const club = JSON.parse(fs.readFileSync(path.join(DATA, 'clubs', `${home}.json`), 'utf8'));
const sr = Number(club.overall?.skillRating) || 0;
fs.writeFileSync(path.join(DATA, 'world.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), clubs: Array.from({ length: 100 }, (_, i) => ({
  rank: i + 1, id: String(900000 + i), name: `World Club <${i + 1}>`, crest: null, sr: 2221 - i * 2 < 2026 ? 2026 : 2221 - i * 2, gp: 100, w: 70, d: 10, l: 20, gf: 300, ga: 100, cs: 30, div: 1, rep: 1,
})) }));
const b = spawnSync(process.execPath, [ROOT + 'scripts/build.mjs'], { cwd: ROOT, env: { ...process.env, NOREX_DATA: DATA, NOREX_OUT: OUT }, encoding: 'utf8' });
t('fixture site builds', b.status === 0);
const page = (p) => (fs.existsSync(path.join(OUT, p)) ? fs.readFileSync(path.join(OUT, p), 'utf8') : '');
const results = page('results.html'), matchesIdx = page('matches/index.html'), leaders = page('leaders.html');

// Friendlies
t('friendly gets its own match page, labelled', /Club friendly – not counted/.test(page(`matches/${fr.matchId}.html`)));
t('results + matches pages get a Friendly tab with the friendly', [results, matchesIdx].every((h) => /data-key="friendly"/.test(h) && /data-mode="friendly"[^>]*>[\s\S]*9<i>–<\/i>0/.test(h)));
const leaguePart = (h) => h.split('data-mode="friendly"')[0];
t('friendly never lands in League lists or totals', !leaguePart(results).includes(fr.matchId) && !leaguePart(matchesIdx).includes(fr.matchId)
  && !JSON.parse(page('api/club.json')).matches.some((m) => m.id === fr.matchId));
t('League record on results.html unchanged by the friendly', new RegExp(`<span>Archived</span><b class="count" data-to="${league.length}"`).test(results));
const frPlayer = Object.keys(fr.players[home])[0];
t('player page has a Friendly log for a friendly player', /data-mode="friendly"/.test(page(`players/${frPlayer}.html`)));

// Dribbles / second assists
const evPage = page(`matches/${evm.matchId}.html`);
t('match page shows Drb + 2nd A columns when EA sent them', />Drb</.test(evPage) && />2nd A</.test(evPage) && /<span>Dribbles<\/span>/.test(evPage));
const older = olderFixture;
t('older matches keep their old columns', !older || !/>Drb</.test(page(`matches/${older.matchId}.html`)));
const evPid = Object.keys(evm.players[home])[0];
t('player page counts dribbles with a "since" note', /<span>Dribbles<\/span>/.test(page(`players/${evPid}.html`)) && /only in games archived since/.test(page(`players/${evPid}.html`)));
const squad = JSON.parse(page('api/squad.json'));
t('squad.json carries dri/sa (null before they were kept)', squad.cols.includes('dri') && Object.values(squad.players).flat().some((r) => r[squad.cols.indexOf('dri')] === 7) && (!older || Object.values(squad.players).flat().some((r) => r[squad.cols.indexOf('dri')] === null)));
t('stats advanced table gets Drb/90', /Drb\/90/.test(page('stats.html')));

// World top 100
t('leaders page: world table with 100 clubs, escaped names', ((leaders.split('<table id="world-top"')[1] || '').split('</table>')[0].match(/<tr[ >]/g) || []).length === 101 && leaders.includes('World Club &lt;1&gt;'));
t('leaders page: SR gap to the cut-off', leaders.includes(`${Math.max(0, 2026 - sr + 1)} SR</b> to break into the world top 100`));

// Calendar
t('calendar filter on results + matches lists, items carry data-day', /data-cal="cal-all"/.test(matchesIdx) && /data-cal="cal-\d+"/.test(results) && /class="fixture [WDL]" href="[^"]+" data-day="\d{4}-\d\d-\d\d"/.test(matchesIdx) && /<tr data-day="\d{4}-\d\d-\d\d"/.test(results));
t('no template leftovers in the fixture build', [results, matchesIdx, leaders, evPage].every((h) => !/\$\{|undefined<|>undefined|NaN/.test(h)));

fs.rmSync(tmp, { recursive: true, force: true });
done();
