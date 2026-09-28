// Built site (run after scripts/build.mjs): pages exist, flags are wired, no repo links / AI mentions (P0.1).
import fs from 'node:fs';
import { config, ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const SITE = ROOT + 'site/';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? walk(d + f.name + '/') : [d + f.name]));
const files = walk(SITE);
const html = files.filter((f) => f.endsWith('.html'));
const read = (f) => fs.readFileSync(f, 'utf8');
for (const p of ['index.html', 'squad.html', 'stats.html', 'compare.html', 'matches/index.html', 'players/index.html', 'clubs/index.html', 'about.html', 'apply.html', 'members.html'])
  t(`page ${p}`, fs.existsSync(SITE + p));
t('JSON API files parse', ['players', 'club', 'clubs'].every((f) => JSON.parse(read(`${SITE}api/${f}.json`))));
const index = read(SITE + 'index.html');
const attr = index.match(/data-features="([^"]*)"/)?.[1]?.replace(/&quot;/g, '"');
t('body carries data-features from config.json', attr != null && JSON.stringify(JSON.parse(attr)) === JSON.stringify(config.features ?? {}));
const text = [...html, ...files.filter((f) => /\.(js|css|json)$/.test(f))].map(read).join('\n');
t('no link to the GitHub repo', !/github\.com\/devroadtosucces15-boop/i.test(text));
t('no AI mentions', !/\b(claude|anthropic|chatgpt|openai)\b/i.test(text));
t('every page has a <title> (redirects aside)', html.every((f) => /<title>[^<]+<\/title>|http-equiv="refresh"/.test(read(f))));
t('no unescaped template leftovers', html.every((f) => !/\$\{|undefined<|>undefined|NaN%/.test(read(f))));
// P1.1 stat drill-downs
const res = fs.existsSync(SITE + 'results.html') ? read(SITE + 'results.html') : '';
t('P1.1 results.html has all 8 drill-down panels', ['played', 'won', 'drawn', 'lost', 'goals', 'conceded', 'cleansheets', 'winrate'].every((f) => res.includes(`id="f-${f}"`)));
t('P1.1 home stat cards link to drill-downs', /class="stat link" href="results\.html\?f=won"/.test(index) && /href="results\.html\?f=cleansheets"/.test(index));
t('P1.1 results page has League/Rush switch', res.includes('data-rush="results"'));
const clubPages = files.filter((f) => /clubs\/\d+\.html$/.test(f));
t('P1.1 other clubs link to their own drill-down (if archived)', clubPages.every((f) => { const h = read(f); const m = h.match(/href="(\d+-results\.html)\?f=played"/); return !m || fs.existsSync(SITE + 'clubs/' + m[1]); }) && clubPages.some((f) => /-results\.html\?f=won/.test(read(f))));
done();
