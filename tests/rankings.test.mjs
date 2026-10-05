// Global rankings (P9.2): the world top 100 becomes the rankings payload with Norex's rank and gap to the cut-off.
import { t, done } from './lib.mjs';
import { buildRankings } from '../scripts/rankings.mjs';

const world = { fetchedAt: '2026-10-05', clubs: [
  { rank: 1, id: '10', name: 'Top', sr: 2000, gp: 50, w: 40, d: 5, l: 5, gf: 100, ga: 50, cs: 20, div: 1, crest: '1' },
  { rank: 2, id: '20', name: 'Second', sr: 1900, gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, cs: 0, div: 1 },
  { rank: 3, id: '30', name: 'Third', sr: 1800, gp: 10, w: 5, d: 2, l: 3, gf: 20, ga: 15, cs: 3, div: 2 },
] };

const inside = buildRankings(world, '30', 1800);
t('reports the top SR and the cut-off', inside.top === 2000 && inside.cut === 1800 && inside.size === 3);
t('finds Norex inside the table', inside.me?.rank === 3 && inside.gapToCut === 0);
t('computes win % and per-game goals', inside.rows[2].winPct === 50 && inside.rows[2].goalsPerGame === 2);
t('a zero-game club gets zero rates, not NaN', inside.rows[1].winPct === 0 && inside.rows[1].goalsPerGame === 0);

const outside = buildRankings(world, '99', 1700);
t('Norex outside the top 100 gets its SR gap to the cut-off', outside.me === null && outside.gapToCut === 101);
t('unknown Norex SR gives no gap', buildRankings(world, '99').gapToCut === 0);

const empty = buildRankings(null, '1');
t('no world data gives an empty payload', empty.size === 0 && empty.cut === null && empty.rows.length === 0);
done();
