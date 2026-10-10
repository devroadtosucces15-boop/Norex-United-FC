// NOREX redesign preview site. Detached from the live site: reads the repo's data/ folder (read-only), writes only to dist/.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
// usage: node next/build.mjs [--out <dir>] [--preview]   (--preview = public test build: hidden from search engines, labelled PREVIEW)
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const out = path.resolve(arg('--out') || path.join(here, 'dist'));
if (process.argv.includes('--preview')) process.env.NEXT_PREVIEW = '1';
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const { players, matches } = await import('./lib/data.mjs');
const W = (f, h) => fs.writeFileSync(path.join(out, f), h);
for (const f of fs.readdirSync(path.join(here, 'static')).filter((f) => !f.startsWith('.'))) fs.copyFileSync(path.join(here, 'static', f), path.join(out, f));
fs.copyFileSync(path.join(here, 'crest.png'), path.join(out, 'crest.png'));
fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify({ id: 'norex-next', name: 'NOREX UNITED FC', short_name: 'NOREX', description: 'Results, squad, stats and the members Hub of NOREX UNITED FC.', start_url: 'index.html', scope: './', display: 'standalone', orientation: 'portrait', background_color: '#080b11', theme_color: '#080b11', icons: [{ src: 'crest.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'crest.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }], shortcuts: [{ name: 'Results', url: 'results.html' }, { name: 'Match Night', url: 'hub-matchnight.html' }, { name: 'Stats', url: 'stats.html' }] }));
let n = 0; const P = (f, h) => { W(f, h); n++; };
const mods = ['club', 'matches', 'stats', 'tactics', 'hub', 'lookbook', 'canvas'];
for (const m of mods) { const file = path.join(here, 'pages', m + '.mjs'); if (!fs.existsSync(file)) continue; const mod = await import('./pages/' + m + '.mjs'); await mod.default?.(P) ; }
console.log(`built ${n} pages · ${players.length} players · ${matches.length} matches`);
