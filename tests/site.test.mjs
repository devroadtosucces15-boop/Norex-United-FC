// Built site (run after scripts/build.mjs): pages exist, flags are wired, no repo links / AI mentions (P0.1).
import fs from 'node:fs';
import { config, ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const SITE = ROOT + 'site/';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? walk(d + f.name + '/') : [d + f.name]));
const files = walk(SITE);
const html = files.filter((f) => f.endsWith('.html'));
const read = (f) => fs.readFileSync(f, 'utf8');
for (const p of ['index.html', 'squad.html', 'stats.html', 'compare.html', 'matches/index.html', 'players/index.html', 'clubs/index.html', 'about.html', 'apply.html', 'members.html', 'tactics.html', 'hub/index.html'])
  t(`page ${p}`, fs.existsSync(SITE + p));
t('JSON API files parse', ['players', 'club', 'clubs'].every((f) => JSON.parse(read(`${SITE}api/${f}.json`))));
const index = read(SITE + 'index.html');
const attr = index.match(/data-features="([^"]*)"/)?.[1]?.replace(/&quot;/g, '"');
t('body carries data-features from config.json', attr != null && JSON.stringify(JSON.parse(attr)) === JSON.stringify(config.features ?? {}));
const text = [...html, ...files.filter((f) => /\.(js|css|json)$/.test(f))].map(read).join('\n');
t('no link to the GitHub repo', !/github\.com\/devroadtosucces15-boop/i.test(text));
t('no AI mentions', !/\b(claude|anthropic|chatgpt|openai)\b/i.test(text));
t('every page has a <title> (redirects aside)', html.every((f) => /<title>[^<]+<\/title>|http-equiv="refresh"/.test(read(f))));
// QA2: a duplicate id broke the World top 100 search (getElementById found the section, not the table).
const dupIds = html.flatMap((f) => { const seen = new Set(); return [...read(f).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((i) => (seen.has(i) ? true : (seen.add(i), false))).map((i) => `${f.slice(SITE.length)}#${i}`); });
t(`no duplicate ids on any page${dupIds.length ? ` (${dupIds.slice(0, 3).join(', ')})` : ''}`, !dupIds.length);
// board 01: 4 grouped mega-menu buttons on desktop, a bottom tab bar + slide-up sheet on phones.
t('board-01 grouped nav renders on every page + mobile tab bar exists', html.every((f) => { const h = read(f); return !h.includes('<header class="top">') || (h.includes('class="grpnav"') && h.includes('class="tabbar"')); }) && read(SITE + 'assets/style.css').includes('.tabbar{'));
t('no unescaped template leftovers', html.every((f) => !/\$\{|undefined<|>undefined|NaN%/.test(read(f))));
// P1.1 stat drill-downs
const res = fs.existsSync(SITE + 'results.html') ? read(SITE + 'results.html') : '';
t('P1.1 results.html has all 8 drill-down panels', ['played', 'won', 'drawn', 'lost', 'goals', 'conceded', 'cleansheets', 'winrate'].every((f) => res.includes(`id="f-${f}"`)));
// board 04 part 1: home's "Season at a glance" is 8 even tiles (won…goal diff) – clean sheets dropped
// from the home row to fix the old 9-tile wrap; it still has its own drill-down panel on results.html.
t('P1.1 home stat cards link to drill-downs', /class="stat link" href="results\.html\?f=won"/.test(index) && /href="results\.html\?f=winrate"/.test(index));
t('P1.1 results page has League/Rush switch', res.includes('data-rush="results"'));
const clubPages = files.filter((f) => /clubs\/\d+\.html$/.test(f));
t('P1.1 other clubs link to their own drill-down (if archived)', clubPages.every((f) => { const h = read(f); const m = h.match(/href="(\d+-results\.html)\?f=played"/); return !m || fs.existsSync(SITE + 'clubs/' + m[1]); }) && clubPages.some((f) => /-results\.html\?f=won/.test(read(f))));
// P1.3 streams
t('P1.3 home has Watch section + live embed slot', index.includes('id="watch"') && index.includes('class="live-embed"') && index.includes(config.streams.twitch));
t('P1.3 footer links both channels on every page', read(SITE + 'stats.html').includes(`href="${config.streams.youtube}"`) && read(SITE + 'stats.html').includes('class="live-bar"'));
// QA1: deferred page scripts placed before ui.js run first – they must wait for DOMContentLoaded or guard window.UI
const early = new Set(html.flatMap((f) => { const h = read(f); const ui = h.indexOf('assets/ui.js'); return [...h.matchAll(/src="(?:\.\.\/)*assets\/([\w-]+\.js)"/g)].filter((m) => ui < 0 || m.index < ui).map((m) => m[1]); }));
t('QA1 page scripts before ui.js never touch UI at load', [...early].every((js) => { const src = fs.existsSync(SITE + 'assets/' + js) ? read(SITE + 'assets/' + js) : ''; return !/\bUI\./.test(src) || /DOMContentLoaded|window\.UI/.test(src); }));
t('QA1 hub grid column can shrink (no phone overflow)', /\.hub\{display:grid;grid-template-columns:minmax\(0,1fr\)/.test(read(SITE + 'assets/style.css')));
done();

// BE1 production integration: backend assignments link here, so the static build must always ship the member surface.
const tactics = read(SITE + 'tactics.html');
t('BE1 tactics page is built behind the tactics flag', tactics.includes('data-flag="tactics"') && tactics.includes('assets/tactics.js') && tactics.includes('assets/tactics.css'));
t('BE1 tactics page is in grouped navigation', index.includes('href="tactics.html"') && index.includes('data-flag="tactics"'));

// board 10: the Hub gets its own gold shell (no public nav, its own bar), behind the hub flag, with a key into it.
const hub = read(SITE + 'hub/index.html');
t('board-10 hub page has its own gold bar, not the public nav', hub.includes('class="hubw-bar"') && !hub.includes('<header class="top">'));
t('board-10 hub page is built behind the hub flag', hub.includes('data-flag="hub"') && hub.includes('assets/hub.css'));
t('board-10 gold key into the Hub is on every page, flag-gated', index.includes('class="hubw-key"') && index.includes('data-flag="hub"') && index.includes('href="hub/index.html"'));
