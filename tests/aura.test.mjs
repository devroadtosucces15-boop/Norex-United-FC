// Seasonal aura cards (P11.9): pure data-driven glow on the FUT-style cards, no AI. Recomputes the same
// "average of the last 3 games" formula independently from the site's own players.json (tr = last 15 ratings,
// oldest→newest) and checks the already-built squad page actually carries the matching class for at least one
// real player – this is real fetched data, so which player (if any) is hot/cold varies match to match.
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const HOT = 7.6, COLD = 6.0;
const players = JSON.parse(fs.readFileSync(ROOT + 'site/api/players.json', 'utf8'));
const squad = fs.readFileSync(ROOT + 'site/squad.html', 'utf8');
// squad.html's card grid is the strict "isHome" roster, which can be a narrower set than players.json's
// `home` flag (playedForHome also counts there) – so only test players actually rendered as a squad.html card.
const home = players.filter((p) => p.home && p.tr?.length >= 2 && squad.includes(`players/${p.k}.html`));
const form = (p) => { const last3 = p.tr.slice(-3); return last3.reduce((a, b) => a + b, 0) / last3.length; };
const cardClass = (key) => squad.match(new RegExp(`class="fut ([^"]*)" href="players/${key}\\.html"`))?.[1] ?? '';

t('style.css defines the aura keyframes + classes', fs.readFileSync(ROOT + 'web/style.css', 'utf8').includes('.aura-hot') && fs.readFileSync(ROOT + 'web/style.css', 'utf8').includes('auraHot'));

const hot = home.find((p) => form(p) >= HOT);
if (hot) t(`hottest-form player (${hot.n}) gets aura-hot on their squad card`, cardClass(hot.k).includes('aura-hot'));
else t('no player currently meets the hot-form threshold (data-dependent, not a bug)', true);

const cold = home.find((p) => form(p) <= COLD);
if (cold) t(`coldest-form player (${cold.n}) gets aura-cold on their squad card`, cardClass(cold.k).includes('aura-cold'));
else t('no player currently meets the cold-form threshold (data-dependent, not a bug)', true);

const steady = home.find((p) => { const f = form(p); return f > COLD && f < HOT; });
if (steady) t(`a player with unremarkable recent form (${steady.n}) gets no aura class`, !cardClass(steady.k).includes('aura-'));
else t('every home player currently has a notable hot/cold streak (data-dependent, not a bug)', true);
done();
