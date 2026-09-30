// Weekly pack openings (P11.8): built on the existing awards reveal animation (web/awards.js) rather than a
// new system – a winner's foil tier is how many awards they swept that week (bronze/silver/gold/legendary),
// shown on the same flip cards. Client-only DOM code isn't unit-tested elsewhere in this project (no DOM
// harness), so this checks the built assets carry the right pieces, same convention as other content checks.
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const js = fs.readFileSync(ROOT + 'site/assets/awards.js', 'utf8');
const css = fs.readFileSync(ROOT + 'site/assets/awards.css', 'utf8');

t('tier thresholds: 1 award = bronze, 2 = silver, 3 = gold, 4+ = legendary', /1:\s*\['bronze'/.test(js) && /2:\s*\['silver'/.test(js) && /3:\s*\['gold'/.test(js) && /4:\s*\['legendary'/.test(js));
t('sweep count comes from every winner that week, not just this card', js.includes('sweeps.set(w.k') && js.includes('sweeps.get(c.k)'));
t('each revealed card gets a tier class and a foil badge', js.includes('tier-${tier}') && js.includes('aw-foil'));
t('every tier has a distinct foil colour in CSS (reuses the site FUT palette)', ['bronze', 'silver', 'gold', 'legendary'].every((tier) => css.includes(`.aw-card.tier-${tier} .aw-front`)));
done();
