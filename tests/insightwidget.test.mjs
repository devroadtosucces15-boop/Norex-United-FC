// Board 12 front end: the ✨ Insight widget sits behind its own owner flag `insightWidget` (on top of the BE9 backend flag
// `statInsights`), with tile chips, a toggle + I key and 👍/👎.
import { readFileSync } from 'node:fs';
import { t, done } from './lib.mjs';
import { config } from './mock.mjs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const app = read('web/app.js'), ins = read('web/insights.js'), build = read('scripts/build.mjs'), css = read('web/style.css');

t('insightWidget ships at members level, separate from statInsights', config.features.insightWidget === 'members' && config.features.statInsights === 'members');
const mounts = [...app.matchAll(/flagOn\('statInsights', ([^)]*)\)/g)];
t('every front-end statInsights check in app.js is paired with insightWidget', mounts.length >= 7 && mounts.every((m) => app.slice(m.index, m.index + 140).includes(`flagOn('insightWidget', ${m[1]})`)));
t('compare hook negates the pair as a whole', /!\(flagOn\('statInsights'[^)]*\) && flagOn\('insightWidget'[^)]*\)\)/.test(app));
t('tiles: home Season grid and a home player Career grid carry data-ins-tile', /stats stats-8" data-ins-tile="club"/.test(build) && /data-ins-tile="player\.\$\{esc\(pl\.key\)\}"/.test(build));
t('app.js hands each [data-ins-tile] grid to NXInsight.tiles', /\$\$\('\[data-ins-tile\]'\)[\s\S]{0,500}NXInsight\.tiles\(g, g\.dataset\.insTile/.test(app));
t('insights.js exports tiles + mount; chips are buttons toggling one panel', /globalThis\.NXInsight = \{ mount, tiles \}/.test(ins) && /className = 'nx-ins-tile'/.test(ins) && /aria-expanded/.test(ins));
t('insight mode (I key + pill) hides tile chips and panel too', /\.insights-off \.nx-insight,\.insights-off \.nx-ins-tile,\.insights-off \.nx-ins-tilepanel\{display:none\}/.test(css) && /toLowerCase\(\) !== 'i'/.test(ins));
t('thumbs up/down post to /api/insights/feedback', /data-vote="1"/.test(ins) && /data-vote="-1"/.test(ins) && /\/api\/insights\/feedback/.test(ins));
t('no AI wording in the widget', !/\b(AI|LLM|machine)\b/.test(ins.replace(/^\/\/.*$/gm, '')));
done();
