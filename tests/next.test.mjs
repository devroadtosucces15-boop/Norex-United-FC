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
fs.rmSync(out, { recursive: true, force: true });
done();
