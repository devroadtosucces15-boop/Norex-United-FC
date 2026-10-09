// Fixes from the owner's first issue-tool session (notes 9, 10, 14/15, session pitch)
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const read = (f) => fs.readFileSync(ROOT + f, 'utf8');
const hub = read('web/hub.js'), app = read('web/app.js'), notify = read('web/notify.js');
t('hub "Back to the site": href is read before the timer (currentTarget is null later → black screen, no navigation)', /const href = e\.currentTarget\.href;[\s\S]{0,700}location\.href = href/.test(hub) && !/setTimeout\(\(\) => \{ location\.href = e\.currentTarget/.test(hub));
t('hub tunnel overlay is removed when the page is restored from the back/forward cache', hub.includes("addEventListener('pageshow', () => el.remove()"));
t('sub-tab row centres the active tab on load and after flag-gated tabs appear', app.includes('const centerSubtab') && app.includes('}); centerSubtab(); };') && app.includes("addEventListener('load', () => { centerSubtab()"));
t('About page no longer offers "Hide me from the site"', !notify.includes('id="req-hide"') && !notify.includes('Ask to be hidden'));

const idx = fs.readdirSync(ROOT + 'site/matches').filter((f) => /^\d+\.html$/.test(f));
const page = read('site/matches/' + idx[0]);
t('match page pitch: our team first on the whole pitch, opponent and "Both" as tabs', ['pv-h', 'pv-a', 'pv-b'].every((id) => page.includes(`id="${id}"`)) && /id="pv-a"[^>]*hidden/.test(page) && /id="pv-b"[^>]*hidden/.test(page) && !/id="pv-h"[^>]*hidden/.test(page));
const bd = read('web/builder.js');
t('chip pill follows the active chip box (no white bar over wrapped rows) and re-seats on resize', app.includes('pill.style.height = `${btn.offsetHeight}px`') && app.includes('new ResizeObserver') && !read('web/style.css').includes('.chip-pill{position:absolute;top:0;left:0;height:100%'));
t('builder redraw keeps the page where it is (no scrollIntoView on the page, instant scrollTo)', !bd.includes('scrollIntoView?.({ block') && bd.includes("behavior: 'instant'"));
t('builder: Min / −5 / +5 / Max strip per attribute', ['data-q="min"', 'data-q="-5"', 'data-q="+5"', 'data-q="max"'].every((x) => bd.includes(x)));
done();
