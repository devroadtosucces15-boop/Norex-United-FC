// Match intelligence aggregation (scripts/lib/intel.mjs) and the new site's data layer (next/lib/data.mjs).
import { t, done } from './lib.mjs';
import { decodeEvents } from '../scripts/lib/events.mjs';
import { sumEvents, summarize, ratesOf, coverage } from '../scripts/lib/intel.mjs';

const a = decodeEvents('215:20,216:5,30:8,24:10,28:2,0:3,1:1,109:4,105:2,111:3,219:1,217:3,218:1');
const b = decodeEvents('215:10,216:5,0:1');

t('sumEvents skips null rows and counts apps', sumEvents([a, null, undefined, b]).apps === 2);
t('sumEvents adds counters', sumEvents([a, b]).totals.passesCompleted === 30 && sumEvents([a, b]).totals.tacklesWon === 4);
t('summarize of nothing is null, not zeros', summarize([]) === null && summarize([null]) === null && summarize(undefined) === null);

const s = summarize([a, b]);
t('summary: apps, sparse totals (no zero keys), per-app average', s.apps === 2 && s.totals.passesCompleted === 30 && !('switchesOfPlay' in s.totals) && s.perApp.passesCompleted === 15);
t('pass accuracy = completed / all', s.rates.passAccuracy === 75 && ratesOf({ passesCompleted: 1, passesFailed: 3 }).passAccuracy === 25);
t('tackle win rate and positioning', s.rates.tackleWinRate === 80 && s.rates.positioning === 75);
t('possession won / lost / net', s.rates.possessionWon === 4 && s.rates.possessionLost === 2 && s.rates.possessionNet === 2);
t('shot accuracy', s.rates.shotAccuracy === 75);
t('no divide-by-zero: rates are null, never NaN', Object.values(ratesOf({})).every((v) => v === null || v === 0) && ratesOf({}).passAccuracy === null);
t('coverage counts matches with events and the first date', JSON.stringify(coverage([{ t: 5, hasEv: false }, { t: 9, hasEv: true }, { t: 7, hasEv: true }])) === JSON.stringify({ matches: 3, withEvents: 2, since: 7 }));
t('coverage with none', coverage([]).since === null && coverage([{ t: 1, hasEv: false }]).withEvents === 0);

// the data layer reads the real data/ folder
const d = await import('../next/lib/data.mjs');
const withEv = d.matches.filter((m) => m.lines.some((l) => l.ev));
t('data layer: some archived matches carry decoded events', withEv.length > 0);
t('data layer: coverage matches the archive', d.intel.coverage.matches === d.matches.length && d.intel.coverage.withEvents === withEv.length);
t('data layer: lines without evraw have ev null, with evraw have named stats', d.matches.every((m) => m.lines.every((l) => l.ev === null || typeof l.ev.passesCompleted === 'number')));
const m = withEv[0];
t('data layer: match intel for our side sums our lines', m.intel.us && m.intel.us.apps === m.lines.filter((l) => l.ev).length);
const pl = d.players.find((p) => p.intel);
t('data layer: a player summary exists and is bounded by games with events', !!pl && pl.intel.apps >= 1 && pl.intel.apps <= pl.archived);
t('data layer: club summary covers every player appearance with events', d.intel.club.apps === d.matches.reduce((n, x) => n + x.lines.filter((l) => l.ev).length, 0));
t('rates stay in 0-100', [d.intel.club, pl.intel].every((x) => Object.entries(x.rates).every(([k, v]) => v === null || k.startsWith('possession') || (v >= 0 && v <= 100))));
done();
