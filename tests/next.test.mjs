// New-design preview (/next/): builds with live data, stays hidden from search engines, keeps every formation, no broken markup.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-'));
execFileSync(process.execPath, ['next/build.mjs', '--out', out, '--preview'], { cwd: ROOT, stdio: 'pipe' });
const html = fs.readdirSync(out).filter((f) => f.endsWith('.html'));
const read = (f) => fs.readFileSync(path.join(out, f), 'utf8');
const need = ['index', 'squad', 'halloffame', 'join', 'results', 'fixtures', 'opponents', 'stats', 'leaders', 'players', 'tactics', 'playstyle', 'studio', 'builds', 'updates', 'hub', 'staff-dugout'];

t('preview: every main page is built', need.every((n) => html.includes(n + '.html')));
t('preview: one profile page per player and a page per match', html.filter((f) => f.startsWith('player-')).length >= 30 && html.filter((f) => f.startsWith('match-')).length >= 30);
t('preview: hidden from search engines', html.every((f) => !/^(index|tactics|hub)\.html$/.test(f) || read(f).includes('noindex,nofollow')));
t('preview: labelled as a preview', read('index.html').includes('prevrib'));
t('preview: no template leftovers or undefined text', html.every((f) => { const s = read(f).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ''); return !/\bundefined\b|\bNaN\b|\[object Object\]|\$\{/.test(s); }));
t('preview: no links to the code repository or localhost', html.every((f) => !/github\.com\/devroadtosucces15|localhost|127\.0\.0\.1/.test(read(f).replace(/<script[\s\S]*?<\/script>/g, ''))));
t('preview: all 29 FC27 formations ship with the tactics pages', (JSON.parse(read('tactics.html').match(/"formations":(\[[\s\S]*?\]),"formationNote"/)?.[1] ?? '[]')).length === 29);
t('preview: static assets present', ['style.css', 'widgets.css', 'fx.css', 'fx.js', 'widgets.js', 'pitch.js', 'cards.js', 'crest.png'].every((f) => fs.existsSync(path.join(out, f))));
t('preview: real card-art API is configured only in preview builds', read('index.html').includes('norex-bot.norexunited.workers.dev'));
// ---- app shell, phone layout and motion guards (the browser overflow sweep is next/tools/overflow-audit.mjs) ----
const pages = html.filter((f) => !/^(lookbook|canvas)\.html$/.test(f)), css = ['style.css', 'motion.css', 'widgets.css'].map((f) => read(f)).join('\n');
t('app: viewport is locked for the installed app (cover, no zoom)', pages.every((f) => /name="viewport" content="[^"]*viewport-fit=cover[^"]*"/.test(read(f)) && /maximum-scale=1/.test(read(f))));
t('app: manifest linked and valid', read('index.html').includes('rel="manifest"') && (() => { try { const m = JSON.parse(read('manifest.webmanifest')); return m.display === 'standalone' && m.start_url && m.icons?.length; } catch { return false; } })());
t('app: motion system, app layer and motion settings on every page', pages.every((f) => { const h = read(f); return h.includes('motion.css') && h.includes('pwa.js') && h.includes('data-motion-settings'); }));
t('app: canvas never scrolls sideways and inputs never trigger iOS zoom', /html\{[^}]*overflow-x:clip/.test(css) && /input,select,textarea\{font-size:max\(16px/.test(css));
t('app: every table scrolls inside its own box', pages.every((f) => { const h = read(f).replace(/<script[\s\S]*?<\/script>/g, ''); let i = -1, ok = true; while ((i = h.indexOf('<table', i + 1)) > -1) { const before = h.slice(Math.max(0, i - 400), i); if (!/overflow-x:auto|tscroll|tablewrap|hscroll/.test(before)) { ok = false; break; } } return ok; }));
t('app: no fixed inline widths wider than a small phone', pages.every((f) => !/style="(?![^"]*max-width)[^"]*(?:^|[;"\s])width:\s*(3[3-9]\d|[4-9]\d\d|\d{4,})px/.test(read(f).replace(/<script[\s\S]*?<\/script>/g, ''))));
const mp = html.find((f) => f.startsWith('match-')), mh = mp ? read(mp) : '';
t('match: field view, table view, team comparison and result graphic', ['id="mfield"', 'id="mv-table"', 'class="cmp', 'id="mposter"', 'data-pt="us"'].every((k) => mh.includes(k)));
t('match: comparison uses only fields EA sends (no possession)', !/possession<\/span>|Possession<\/span>/.test(mh));
t('portraits: players carry their EA id (the Card Studio key)', /"players":\[\{"k":"[^"]+","id":"(\d+|n-[^"]+)"/.test(read('index.html')));
t('reel: spotlight reel centres with spacers, not padding', read('index.html').includes('class="spot"') && /\.spot::before,\.wx \.spot::after/.test(read('widgets.css')));
// ---- tactics detail pass: real fielded line-ups, line stats, set pieces, Rush log, archetype usage ----
const th = read('tactics.html');
t('tactics: fielded line-ups and line stats come from the archive', th.includes('tx-fielded') && th.includes('tx-lines') && /win rate with a full 11 \(\d+-\d+-\d+ in \d+\)/.test(th));
t('tactics: set pieces panel in League and Rush, Rush log slot, pane transition', (th.match(/class="panel reveal tx-sp"/g) || []).length === 2 && th.includes('id="rushlogBody"') && (th.match(/class="txpane"/g) || []).length === 3);
t('tactics: play style roles carry real line numbers, builds show archetype use', (read('playstyle.html').match(/class="ps-strip"/g) || []).length >= 5 && read('builds.html').includes('class="bld-use"'));
const lh = read('leaders.html');
t('insights: leaders carry goals/assists/rating/motm slots, stats carries club.records, all hidden until filled', ['goals', 'assists', 'rating', 'motm'].every((k) => lh.includes(`data-insight="leaders.${k}" hidden`)) && read('stats.html').includes('data-insight="club.records" hidden') && !/data-insight-sec(?! hidden)/.test(lh));
fs.rmSync(out, { recursive: true, force: true });
done();
