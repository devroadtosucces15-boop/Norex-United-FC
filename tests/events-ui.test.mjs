// The Schedule tab lives inside app.js's #panel, whose delegated onclick also serves the Availability tab.
// A shared data-* name makes one click fire both handlers (bulk-answer repainted the panel and lost the selection).
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const ev = fs.readFileSync(ROOT + 'web/events.js', 'utf8');
const app = fs.readFileSync(ROOT + 'web/app.js', 'utf8');
const panel = app.slice(app.indexOf('function bind()'), app.indexOf('function bind()') + 12000);
const used = new Set([...ev.matchAll(/\bdata-([a-z][a-z-]*)/g)].map((m) => m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())));
const handled = new Set([...panel.matchAll(/\bd\.([a-zA-Z]+)/g)].map((m) => m[1]));
// id, p, u: only read together with a claim/rush/vote attribute, or from modals outside #panel
const clash = [...used].filter((k) => handled.has(k) && !['id', 'p', 'tip', 'u'].includes(k));
t('events.js data-* names do not collide with the panel onclick handlers' + (clash.length ? ` (${clash.join(', ')})` : ''), clash.length === 0);
t('Before/During/After switch and check-in ring are rendered by the schedule card', /data-evmode/.test(ev) && /class="ev-ring"/.test(ev) && /STAGES/.test(ev));
const build = fs.readFileSync(ROOT + 'scripts/build.mjs', 'utf8');
t('match pages carry an insight slot (board 12 match card)', /const insightSlot/.test(build) && /\$\{insightSlot\}/.test(build));
const read = (f) => fs.readFileSync(ROOT + f, 'utf8');
t('Hub page has a coach slot; hub.js mounts note.<claimed player>, falling back to the club insight (board 12)', /data-hubw-coach/.test(read('scripts/hub-page.mjs')) && /note\.\$\{me\.claim\.player\}/.test(read('web/hub.js')) && /tryKey\('club'\)/.test(read('web/hub.js')) && /mountInsight: flagOn\('statInsights'/.test(app));
t('Dugout hints: club + last-5 slots and a coach\'s note picker, kept across repaints, behind mountNote', /D\.hints = document\.createElement/.test(read('web/dugout.js')) && /data-hint="matches\.last5"/.test(read('web/dugout.js')) && /\.dg-hints/.test(read('web/style.css')) && /mountNote: flagOn\('statInsights'[^\n]*loadAsset\('insights\.js'/.test(app));

// ----- Hub redesign (flag hubGold, owner) -----
{
  const cfg = JSON.parse(read('config.json'));
  const gold = read('web/hubgold.js'), hub = read('web/hub.js'), app2 = read('web/app.js'), build = read('scripts/build.mjs');
  t('hubGold ships as an owner flag', cfg.features.hubGold === 'owner');
  t('hub.js only adds the moved rooms and the gold layout when ctx.gold', /\(!r\.gold \|\| ctx\.gold\)/.test(hub) && /ctx\.gold && window\.NXHubGold/.test(hub));
  t('hubgold.js: locker is a card with a door, entrance skips under reduced motion, no burner room', /hubg-lockercard/.test(gold) && /hubg-door-card/.test(gold) && /reduced\(\) \|\| seen/.test(gold) && !/burner/i.test(gold + hub));
  t('moved nav links hidden by hubGold; burners stay in the nav', ['docs', 'playstyle', 'messages', 'builder', 'probuilds'].every((id) => new RegExp(`moved: true, id: '${id}'`).test(build)) && !/moved: true, id: 'burners'/.test(build) && /flagOn\('hubGold', role\)\) \$\$\('\[data-hubmove\]'\)/.test(app2));
}
done();
