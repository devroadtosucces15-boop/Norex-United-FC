// EA event-counter decoder (all four match_event_aggregate buckets), schema-drift probe and platform check.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { t, done } from './lib.mjs';
import { EVENT_STATS, parseAggregate, rawEvents, decodeEvents } from '../scripts/lib/events.mjs';
import { missingKeys, platformProblem } from '../scripts/lib/schema.mjs';

const ids = EVENT_STATS.map(([, id]) => id);
t('event table has no duplicate ids or names', new Set(ids).size === ids.length && new Set(EVENT_STATS.map(([n]) => n)).size === ids.length);

t('parse sums duplicates and skips junk', JSON.stringify(parseAggregate('1:2,1:3,x:y,,7:0')) === JSON.stringify({ 1: 5, 7: 0 }));
const p = { match_event_aggregate_0: '215:21,216:5,30:8,32:2,24:17,26:2,28:1,36:1,0:3,109:4', match_event_aggregate_1: '97:10,219:2', match_event_aggregate_2: '', match_event_aggregate_3: '217:3,218:2,112:5,38:2' };
t('rawEvents merges the four buckets, drops zeros', rawEvents({ match_event_aggregate_0: '1:0,2:4', match_event_aggregate_1: '9:1' }) === '2:4,9:1');
t('rawEvents empty when no events', rawEvents({}) === '' && rawEvents(null) === '');

const d = decodeEvents(rawEvents(p));
t('named stats from every bucket', d.passesCompleted === 21 && d.dribblesCarried === 10 && d.outOfPosition === 2 && d.tacklesWon === 3 && d.possessionWonMiddleThird === 4);
t('shots = on + off target', d.shots === 5);
t('direction remainder is unknown, never negative', d.passesCompletedDirectionUnknown === 11 && decodeEvents('215:1,30:3').passesCompletedDirectionUnknown === 0);
t('length remainder', d.passesCompletedLengthUnknown === 0);
t('dribbles beaten without a skill move = 112 - 38', d.dribblesBeat === 3 && decodeEvents('38:4').dribblesBeat === 0);
t('fouls and yellows are sums', decodeEvents('2:1,3:2,95:1,213:1').foulsConceded === 3 && decodeEvents('95:1,213:1').yellowCards === 2);
t('absent ids decode to 0', decodeEvents('').passesCompleted === 0 && decodeEvents(undefined).shots === 0);

t('schema probe: matching shape → no keys missing', missingKeys('clubs/overallStats', [{ clubId: '1', gamesPlayed: '1', wins: '1', losses: '0', ties: '0', goals: '1', goalsAgainst: '0', skillRating: '1', lastOpponent0: '2' }]).length === 0);
t('schema probe: reports dropped keys', missingKeys('members/stats', { members: [{ name: 'a', goals: '1' }] }).includes('ratingAve'));
t('schema probe: empty or unknown payload is not drift', missingKeys('clubs/matches', []).length === 0 && missingKeys('club/playoffAchievements', []).length === 0 && missingKeys('clubs/info', null).length === 0);
t('schema probe: clubs/info is keyed by club id', missingKeys('clubs/info', { 1001: { name: 'x', clubId: 1001, customKit: {} } }).length === 0);
t('platform check: gen5 and nx pass, gen4 rejected', platformProblem('common-gen5') === null && platformProblem('nx') === null && /gen4/.test(platformProblem('common-gen4')));
// --- player page: Match intelligence section, only with decoded event data
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'norex-evdec-'));
const DATA = path.join(tmp, 'data'), OUT = path.join(tmp, 'site');
fs.cpSync(ROOT + 'data', DATA, { recursive: true });
const home = String(JSON.parse(fs.readFileSync(ROOT + 'config.json', 'utf8')).homeClubId);
const dir = path.join(DATA, 'matches');
const ms = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
for (const m of ms) for (const list of Object.values(m.players || {})) for (const q of Object.values(list)) delete q.evraw;
const hm = ms.filter((m) => m.clubs[home] && m.matchType !== 'friendlyMatch').sort((a, b) => b.timestamp - a.timestamp);
const build = () => spawnSync(process.execPath, [ROOT + 'scripts/build.mjs'], { cwd: ROOT, env: { ...process.env, NOREX_DATA: DATA, NOREX_OUT: OUT }, encoding: 'utf8' });
const write = (m) => fs.writeFileSync(path.join(dir, `${m.matchId}.json`), JSON.stringify(m));
ms.forEach(write);
if (!hm.length) t('fixture needs a home match', false);
else {
  const pid = Object.keys(hm[0].players[home])[0];
  t('fixture builds without event data', build().status === 0);
  const pg = () => fs.readFileSync(path.join(OUT, 'players', `${pid}.html`), 'utf8');
  t('no Match intelligence without evraw', !/Match intelligence/.test(pg()));
  hm[0].players[home][pid].evraw = '215:20,216:5,30:8,109:4,0:3,1:1,6:2,111:3,219:1';
  write(hm[0]);
  t('fixture builds with event data', build().status === 0);
  const html = pg();
  t('Match intelligence shows, with credit and game count', /Match intelligence/.test(html) && /community research/.test(html) && /1 game with event data/.test(html));
  t('pass accuracy 80% and forward share 40%', />80%<\/b>/.test(html) && />40%<\/b>/.test(html));
  t('no template leftovers', !/\$\{|undefined<|>undefined|NaN/.test(html));
}
fs.rmSync(tmp, { recursive: true, force: true });
done();
