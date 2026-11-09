// Phoenix Fire – a made-up second club, built from the live redesign (next/) into a sub-address of the site (e.g. /phoenix/).
// usage: node phoenix/build.mjs [--out site/phoenix]
// Nothing in next/, web/, bot/ or data/ is modified: everything is staged in a temp folder, re-skinned there, built, and removed.
//   1. stage copy of next/ + web/ + bot/*.js   2. mock club data (phoenix/gen-data.mjs)   3. colours + names swapped
//   4. overlay (badge crest, 3D crest, theme layer, small design touches)   5. build the preview flavour (toolbar, noindex)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const out = path.resolve(arg('--out') || path.join(repo, 'site', 'phoenix'));
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'phoenix-'));
const warn = (m) => console.warn('phoenix: ' + m);
try {
  // 1. stage
  fs.cpSync(path.join(repo, 'next'), path.join(stage, 'next'), { recursive: true, filter: (s) => !/[\\/](dist|node_modules)([\\/]|$)/.test(s) });
  fs.cpSync(path.join(repo, 'web'), path.join(stage, 'web'), { recursive: true });
  fs.mkdirSync(path.join(stage, 'bot'));
  for (const f of fs.readdirSync(path.join(repo, 'bot'))) if (/\.m?js$/.test(f)) fs.copyFileSync(path.join(repo, 'bot', f), path.join(stage, 'bot', f));
  // 2. mock data (config.json + data/ in the stage root, which is where the build looks for them)
  execFileSync('node', [path.join(here, 'gen-data.mjs'), stage], { stdio: 'inherit' });
  // 3. colours (shell sed) and names (below)
  execFileSync('sh', [path.join(here, 'recolor.sh'), path.join(stage, 'next')], { stdio: 'inherit' });
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'dist' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
  const names = [
    [/<b>NOREX<\/b> UNITED/g, '<b>PHOENIX</b> FIRE'], [/NOREX <b>UNITED<\/b>/g, 'PHOENIX <b>FIRE</b>'], [/NOREX UNITED FC/g, 'PHOENIX FIRE'], [/NOREX UNITED/g, 'PHOENIX FIRE'], [/Norex United FC/g, 'Phoenix Fire'], [/Norex United/g, 'Phoenix Fire'],
    [/\bNorex DJ\b/g, 'Phoenix DJ'], [/\bNOREX\b/g, 'PHOENIX'], [/\bNorex\b(?![-\w])/g, 'Phoenix'],
    [/https:\/\/discord\.(?:gg|com\/invite)\/[A-Za-z0-9_-]+/g, '#join-discord'], [/https:\/\/discord\.com\/channels\/\d+(?:\/\d+)*/g, '#join-discord'],
  ];
  for (const f of walk(path.join(stage, 'next')).concat(walk(path.join(stage, 'web')))) {
    if (!/\.(m?js|css|html)$/.test(f) || /vendor-/.test(f)) continue;
    let s = fs.readFileSync(f, 'utf8'); const o = s; for (const [re, to] of names) s = s.replace(re, to);
    if (s !== o) fs.writeFileSync(f, s);
  }
  // 4. overlay: badge crest, icons, 3D crest, theme layer
  for (const f of fs.readdirSync(path.join(here, 'overlay'))) fs.copyFileSync(path.join(here, 'overlay', f), path.join(stage, 'next', f === 'crest.png' ? f : path.join('static', f)));
  // 3D crest in the About-page toggle: swap the stacked flat layers for the Blender relief model
  const c3 = path.join(stage, 'next/static/crest3d.js');
  if (fs.existsSync(c3)) {
    let s = fs.readFileSync(c3, 'utf8');
    const re = /const tex = new T\.TextureLoader\(\)[\s\S]*?p\.position\.z = -i \* 0\.018; group\.add\(p\);\s*\}/;
    if (re.test(s)) fs.writeFileSync(c3, s.replace(re, 'const group = new T.Group(); scene.add(group); const built = await window.PhoenixCrest3D.build(T, 2.5); group.add(built.group); cam.position.z = 6.4;'));
    else warn('About-page 3D block changed upstream – the flat crest is used there');
  }
  // 5. build (preview flavour: preview toolbar, noindex), then a post-pass over the html
  execFileSync('node', [path.join(stage, 'next/build.mjs'), '--out', out, '--preview'], { stdio: 'inherit', cwd: stage });
  let pages = 0;
  for (const f of fs.readdirSync(out).filter((f) => f.endsWith('.html'))) {
    const p = path.join(out, f); let h = fs.readFileSync(p, 'utf8');
    if (!h.includes('phoenix.css')) h = h.replace('</head>', '<link rel="stylesheet" href="phoenix.css"></head>');
    if (!h.includes('phoenix3d.js')) h = h.replace('</body>', '<script src="phoenix3d.js" defer></script><script src="phoenix-fx.js" defer></script></body>');
    if (f === 'index.html') { // home hero: the club's own line and the six stars of the badge (skipped silently if the upstream copy changes)
      h = h.replace(/(<div class="eyebrow reveal">)(EA SPORTS)/, '$1<span class="pf-stars" aria-hidden="true">★★★★★★</span> $2').replace(/<h1 class="reveal" style="--i:1">[\s\S]*?<\/h1>/, '<h1 class="reveal" style="--i:1">Rise. Burn.<br><em>Repeat.</em></h1>');
    }
    if (!/name="robots"/.test(h)) h = h.replace('</head>', '<meta name="robots" content="noindex,nofollow"></head>');
    fs.writeFileSync(p, h); pages++;
  }
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  console.log(`phoenix: ${pages} pages -> ${path.relative(repo, out)}`);
} finally { fs.rmSync(stage, { recursive: true, force: true }); }
