// Phoenix Fire – a made-up second club, built from the live redesign (next/) into a sub-address of the site (e.g. /phoenix/).
// usage: node phoenix/build.mjs [--out site/phoenix]
// Nothing in next/, web/, bot/ or data/ is modified: everything is staged in a temp folder, re-skinned there, built, and removed.
//   1. stage copy of next/ + web/ + bot/*.js   2. mock club data (phoenix/gen-data.mjs)   3. colours + names swapped
//   4. overlay (badge crest, 3D crest, theme layer, small design touches)   5. build the preview flavour (toolbar, noindex)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const out = path.resolve(arg('--out') || path.join(repo, 'site', 'phoenix'));
const LIVE = process.argv.includes('--live');
const liveCfg = LIVE ? JSON.parse(fs.readFileSync(path.join(here, 'live.json'), 'utf8')) : null;
const API = arg('--api') || (LIVE ? liveCfg.api : '') || 'https://phoenix.mock', MOCK = API === 'https://phoenix.mock';
if (LIVE && MOCK) { console.error('phoenix: --live needs the Worker URL: set "api" in phoenix/live.json or pass --api <url>'); process.exit(1); } // recording builds point at a local Worker; the published build points at the in-page mock (phoenix-mock.js)
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'phoenix-'));
const warn = (m) => console.warn('phoenix: ' + m);
try {
  // 1. stage
  fs.cpSync(path.join(repo, 'next'), path.join(stage, 'next'), { recursive: true, filter: (s) => !/[\\/](dist|node_modules)([\\/]|$)/.test(s) });
  fs.cpSync(path.join(repo, 'web'), path.join(stage, 'web'), { recursive: true });
  fs.cpSync(path.join(repo, 'scripts'), path.join(stage, 'scripts'), { recursive: true, filter: (f) => !/__pycache__/.test(f) });
  fs.mkdirSync(path.join(stage, 'bot'));
  for (const f of fs.readdirSync(path.join(repo, 'bot'))) if (/\.m?js$/.test(f)) fs.copyFileSync(path.join(repo, 'bot', f), path.join(stage, 'bot', f));
  // 2. mock data (config.json + data/ in the stage root, which is where the build looks for them)
  if (LIVE) {
    const rc = JSON.parse(fs.readFileSync(path.join(repo, 'config.json'), 'utf8'));
    const cfg = { ...rc, siteTitle: 'PHOENIX FIRE', siteUrl: liveCfg.siteUrl || 'https://example.invalid/phoenix-fire/', homeClubId: liveCfg.club, extraClubIds: [], hiddenPlayers: [], platform: liveCfg.platform || 'common-gen5',
      discovery: { ...(rc.discovery || {}), enabled: false }, discord: { applyLink: liveCfg.invite || '#', note: '' },
      brand: { red: '#e8651a', ink: '#0a0705', founded: liveCfg.founded || '', motto: 'Rise. Burn. Repeat.' }, members: { api: API }, streams: { youtube: '', twitch: '' } };
    fs.mkdirSync(path.join(stage, 'data'), { recursive: true });
    fs.writeFileSync(path.join(stage, 'config.json'), JSON.stringify(cfg));
    for (const d of ['updates', 'game']) fs.cpSync(path.join(repo, 'data', d), path.join(stage, 'data', d), { recursive: true });
    try { execFileSync('node', [path.join(stage, 'scripts/fetch.mjs')], { stdio: 'inherit', cwd: stage }); }
    catch (e) { console.error('phoenix: EA fetch failed for club ' + liveCfg.club + ': ' + e.message); process.exit(1); }
    if (!fs.existsSync(path.join(stage, 'data', 'clubs', liveCfg.club + '.json'))) { console.error('phoenix: no data written for club ' + liveCfg.club); process.exit(1); }
  } else execFileSync('node', [path.join(here, 'gen-data.mjs'), stage], { stdio: 'inherit', env: { ...process.env, PF_API: API } });
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
  for (const f of fs.readdirSync(path.join(here, 'overlay'))) if (!f.startsWith('.')) fs.copyFileSync(path.join(here, 'overlay', f), path.join(stage, 'next', f === 'crest.png' ? f : path.join('static', f)));
  const appjs = path.join(stage, 'next/static/app.js'), as = fs.readFileSync(appjs, 'utf8');
  if (as.includes('if (!window.NOREX_API) {')) fs.writeFileSync(appjs, as.replace('if (!window.NOREX_API) {', 'if (!window.NOREX_API || window.PF_MOCK) {'));
  else warn('app.js preview toolbar condition changed upstream – toolbar may be missing');
  // page transitions: fx.js asks window.PhoenixFX (pf-trans.js) for its scene map; the stock scenes remain the fallback
  const fxjs = path.join(stage, 'next/static/fx.js');
  if (fs.existsSync(fxjs)) {
    let s = fs.readFileSync(fxjs, 'utf8'); const kind = "const KIND = { club: 'cclub', matches: 'cmatches', stats: 'cstats', tactics: 'ctactics', hub: 'locker' };";
    if (s.includes(kind)) fs.writeFileSync(fxjs, s.replace(kind, kind.replace('const KIND =', 'let KIND =') + " try { const k = window.PhoenixFX && window.PhoenixFX({ FX, mk, run, frames }); if (k) KIND = k; } catch (e) {}"));
    else warn('fx.js KIND map changed upstream – stock page transitions are used');
  }
  // smooth.js: its class/style observer restarts Lenis on every mutation, and Lenis rewrites the html class, so locking the page
  // (the hub entrance sets overflow:hidden) flip-flops forever (Lenis answers with overflow:clip, which reads as unlocked) and freezes the tab.
  // Treat the hub class as the lock, ignore Lenis's own clip, and only act when the state really changes.
  const smjs = path.join(stage, 'next/static/smooth.js');
  if (fs.existsSync(smjs)) {
    let s = fs.readFileSync(smjs, 'utf8'); const syn = 'const sync = () => (locked() ? lenis.stop() : lenis.start());';
    const lk = "getComputedStyle(H).overflowY === 'hidden' ||";
    if (s.includes(syn) && s.includes(lk)) fs.writeFileSync(smjs, s.replace(syn, 'let lockedNow = null; const sync = () => { const l = locked(); if (l === lockedNow) return; lockedNow = l; l ? lenis.stop() : lenis.start(); };').replace(lk, "H.classList.contains('hubfx-on') || (H.style.overflow !== 'clip' && getComputedStyle(H).overflowY === 'hidden') ||"));
    else warn('smooth.js lock sync changed upstream – the hub entrance may freeze the page');
  }
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
  // The pages read api/*.json, the service worker and the manifest from their own folder – never from the real site next door.
  // api/*.json comes from the classic build of the mock data; sw.js/offline.html/404.html from the same emitter the real site uses.
  const classic = path.join(stage, 'classic-build');
  execFileSync('node', [path.join(stage, 'scripts/build.mjs')], { stdio: 'inherit', cwd: stage, env: { ...process.env, NOREX_OUT: classic } });
  const htmls = fs.readdirSync(out).filter((f) => f.endsWith('.html'));
  const { emitSwap } = await import(pathToFileURL(path.join(stage, 'next/lib/swap.mjs')).href);
  const api = emitSwap({ out, root: stage, classic, pages: htmls });
  fs.writeFileSync(path.join(out, 'sw.js'), fs.readFileSync(path.join(out, 'sw.js'), 'utf8').replace(/nx-v2/g, 'pf-v1'));
  fs.rmSync(path.join(out, 'sitemap.xml'), { force: true });
  const mf = path.join(out, 'manifest.webmanifest'); fs.writeFileSync(mf, fs.readFileSync(mf, 'utf8').replace('"norex-next"', '"phoenix-fire"').replace('"short_name":"PHOENIX"', '"short_name":"PHOENIX"'));
  console.log(`phoenix: ${api.length} api files, sw.js, offline/404`);
  // first visit defaults for the preview toolbar: Owner, full entrance, gold orb menu, transitions on, full motion (tilt, parallax…). Later changes stick.
  const init = '<script>try{var L=localStorage;if(!L.getItem("pf.init")){L.setItem("pf.init","1");L.setItem("norex.as","owner");L.setItem("norex.entrance","full");L.setItem("norex.nav","orb");L.setItem("norex.fx","on");L.setItem("norex.mx","full");L.removeItem("norex.motion");L.removeItem("norex.viewas")}}catch(e){}</script>';
  let pages = 0;
  for (const f of htmls) {
    const p = path.join(out, f); let h = fs.readFileSync(p, 'utf8');
    h = h.replace("window.NOREX_ROOT='../'", "window.NOREX_ROOT=''").replace("window.NOREX_SW='../sw.js'", "window.NOREX_SW='sw.js'");
    if (MOCK && !h.includes('phoenix-mock.js')) h = h.replace('<head>', '<head><script src="phoenix-mock.js"></script>');
    if (!h.includes('pf.init')) h = h.replace('<head>', '<head>' + init);
    if (!h.includes('phoenix.css')) h = h.replace('</head>', '<link rel="stylesheet" href="phoenix.css"><link rel="stylesheet" href="pf-forge.css"><link rel="stylesheet" href="pf-ignite.css"><link rel="stylesheet" href="pf-hub.css"></head>');
    if (!h.includes('pf-trans.js')) h = h.replace('<head>', '<head><script src="pf-trans.js"></script>');
    if (!h.includes('phoenix3d.js')) h = h.replace('</body>', '<script src="phoenix3d.js" defer></script><script src="phoenix-fx.js" defer></script><script src="vendor-motion.js" defer></script><script src="vendor-anime.js" defer></script><script src="pf-forge.js" defer></script><script src="pf-ignite.js" defer></script><script src="pf-hub.js" defer></script></body>');
    if (f === 'index.html') { // home hero: the club's own line and the six stars of the badge (skipped silently if the upstream copy changes)
      h = h.replace(/(<div class="eyebrow reveal">)(EA SPORTS)/, '$1<span class="pf-stars" aria-hidden="true">★★★★★★</span> $2').replace(/<h1 class="reveal" style="--i:1">[\s\S]*?<\/h1>/, '<h1 class="reveal" style="--i:1">Rise. Burn.<br><em>Repeat.</em></h1>');
    }
    if (!/name="robots"/.test(h)) h = h.replace('</head>', '<meta name="robots" content="noindex,nofollow"></head>');
    fs.writeFileSync(p, h); pages++;
  }
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  console.log(`phoenix: ${pages} pages -> ${path.relative(repo, out)}`);
} finally { fs.rmSync(stage, { recursive: true, force: true }); }
