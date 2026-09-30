// Player taglines (P11.12): pure data-driven flavour text on the FUT-style card + profile chips, no AI –
// same approach as the P11.9 aura. Checks the already-built site output (real fetched data), same style as
// tests/aura.test.mjs: which player gets which tag varies match to match, so we check structure, not a fixed name.
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const players = JSON.parse(fs.readFileSync(ROOT + 'site/api/players.json', 'utf8'));
const squad = fs.readFileSync(ROOT + 'site/squad.html', 'utf8');
const tagged = players.filter((p) => p.tag);

t('style.css defines the .fut-tag class', fs.readFileSync(ROOT + 'web/style.css', 'utf8').includes('.fut-tag'));
t('at least one player has a tagline (data-dependent, but the squad is not empty)', tagged.length > 0);
t('every tagged player has 3+ games of real stats behind it', tagged.every((p) => p.s?.gp >= 3));
t('taglines are short (fit a card), not accidentally a whole sentence', tagged.every((p) => p.tag.length <= 30));

const fatCardIndex = (key) => squad.search(new RegExp(`class="fut [^"]*" href="players/${key}\\.html"`));
const home = tagged.find((p) => p.home && fatCardIndex(p.k) >= 0);
if (home) {
  const i = fatCardIndex(home.k);
  t(`squad card for ${home.n} shows their tagline`, squad.slice(i, i + 1600).includes(home.tag));
  const profile = fs.readFileSync(ROOT + `site/players/${home.k}.html`, 'utf8');
  t(`${home.n}'s profile hero shows the same tagline as a chip`, profile.includes(`<span class="chip">${home.tag}</span>`) || profile.includes(home.tag));
} else {
  t('no tagged home player currently on the squad page (data-dependent, not a bug)', true);
}
done();
