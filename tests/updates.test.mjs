// FC updates log (P1.7): EA page parsing, section split, Clubs keyword + level-cap detectors, the built page.
import fs from 'node:fs';
import { parseIndex, parseArticle, capValue, catOf } from '../scripts/updates.mjs';
import { ROOT, siteJson } from './mock.mjs';
import { t, done } from './lib.mjs';

const next = (o) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(o)}</script>`;
const idx = parseIndex(`<html>${next({ props: { cards: [{ slug: 'pitch-notes-fc27-title-update-2', title: 'Title Update 2', publishingDate: '2026-10-01T16:00:00Z', summary: 'TU2' }, { slug: 'fc-27-soundtrack', title: 'Soundtrack', publishingDate: '2026-09-10' }] } })}
<a href="/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-old-deep-dive">x</a></html>`);
t('index: cards from page data', idx.find((a) => a.slug === 'pitch-notes-fc27-title-update-2')?.published === '2026-10-01T16:00:00Z');
t('index: extra links without data are kept', idx.some((a) => a.slug === 'pitch-notes-fc27-old-deep-dive' && !a.published));

const html = `<nav><li>News</li></nav><h1>EA SPORTS FC™ 27 | Title Update 2</h1><p>October 1, 2026</p><p>Intro text here. Second sentence.</p>
<h3>Table of Contents:</h3><li>Clubs</li><li>Gameplay</li>
<h2 id="clubs">Clubs</h2><h3>Progression</h3><p>We&rsquo;ve heard your feedback. The level cap has been raised to 50 for every Archetype. AXP gains are up.</p>
<p>One Consumable may have a level cap of 25.</p><p>Rush matchmaking is faster.</p>
<h2>Gameplay</h2><p>Corner kicks are more consistent. Dinked passes <b>fixed</b>.</p><p>-The EA SPORTS FC™ Team</p>
<footer><li>Legal</li></footer>`;
const a = parseArticle(html, { slug: 'tu2' });
t('title from h1', a.title === 'EA SPORTS FC™ 27 | Title Update 2');
t('date from page text when missing', a.published?.startsWith('2026-10-01'));
t('sections: overview + h2s, TOC skipped', a.sections.map((s) => s.title).join('|') === 'Overview|Clubs|Gameplay');
t('entities decoded, tags stripped', a.sections[1].summary.startsWith('We’ve heard') && !a.sections[2].summary.includes('<'));
t('sign-off and footer dropped', !JSON.stringify(a).includes('Legal') && !JSON.stringify(a).includes('The EA SPORTS FC™ Team'));
t('categories', a.sections[1].cat === 'clubs' && a.sections[2].cat === 'gameplay' && a.clubs);
const cap = a.hits.filter((h) => h.kind === 'levelCap');
t('level cap detected with value 50 (consumable cap ignored)', cap.length === 1 && cap[0].value === 50 && cap[0].quote.includes('raised to 50'));
t('Clubs keywords: AXP, Archetype, Rush', ['axp', 'archetype', 'rush'].every((k) => a.hits.some((h) => h.kind === k)));
t('keywords outside Clubs are ignored', !a.hits.some((h) => h.section === 'Gameplay'));
t('capValue variants', capValue('Max level is now 45.') === 45 && capValue('Reaching level 10 unlocks a Mastery.') === null && capValue('The global maximum level cap stays.') === null);
t('catOf deep-dive fallback', catOf('Kickabouts', 'clubs') === 'clubs' && catOf('Anything', 'fut') === 'fut');

// Built site
const up = siteJson('updates');
const game = siteJson('game');
t('api/updates.json newest first', up.entries.length > 0 && up.entries.every((e, i, l) => !i || Date.parse(l[i - 1].published) >= Date.parse(e.published)));
t('api/game.json has a level cap + archetypes', Number.isInteger(game.levelCap?.value) && game.archetypes.length >= 10 && game.version);
const pageHtml = fs.readFileSync(ROOT + 'site/updates.html', 'utf8');
t('updates page: entries, filters, cap strip', pageHtml.includes('data-upd-filter') && pageHtml.includes('data-game-cap') && (pageHtml.match(/class="upd card/g) || []).length === up.entries.length);
t('updates page linked in the nav', fs.readFileSync(ROOT + 'site/index.html', 'utf8').includes('href="updates.html"'));
t('no full EA text stored (summaries only)', up.entries.every((e) => e.sections.every((s) => s.summary.length <= 260)));
done();
