// Phase E quality sweep for the /next/ preview: accessibility + performance checks in a real browser.
// Usage: node next/tools/quality-audit.mjs <builtDir> [--pages a.html,b.html] [--json out.json]
//   <builtDir> is a folder made by: node next/build.mjs --out <dir> --preview
// Serves the folder itself on a free local port. Every request to another origin (Worker, fonts, EA crests) is blocked, so nothing
// touches live data. Needs a local playwright-core (PLAYWRIGHT_CORE=/path) – a dev tool, not a site dependency.
import { createRequire } from 'node:module'; import os from 'node:os'; import path from 'node:path'; import fs from 'node:fs'; import http from 'node:http'; import zlib from 'node:zlib';
const dir = path.resolve(process.argv[2] || ''); if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error('usage: quality-audit.mjs <builtDir>'); process.exit(2); }
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const candidates = [process.env.PLAYWRIGHT_CORE, path.join(os.homedir(), 'playwright-ui-auditor/node_modules/playwright-core'), 'playwright-core'].filter(Boolean);
let pw = null; for (const c of candidates) { try { pw = createRequire(import.meta.url)(c); break; } catch {} }
if (!pw) { console.error('playwright-core not found. Set PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core'); process.exit(2); }
const exe = [process.env.CHROME, '/usr/bin/chromium', '/usr/bin/google-chrome'].find((x) => x && fs.existsSync(x));
const MIME = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', webmanifest: 'application/manifest+json', svg: 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  let f = path.join(dir, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nope'); }
  const buf = fs.readFileSync(f), ext = f.split('.').pop(), h = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' };
  if (/html|js|css|json/.test(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { h['content-encoding'] = 'gzip'; res.writeHead(200, h); return res.end(zlib.gzipSync(buf)); }
  res.writeHead(200, h); res.end(buf);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${srv.address().port}/`;
const all = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));
const first = (re) => all.find((f) => re.test(f));
const pages = arg('--pages') ? arg('--pages').split(',') : ['index.html', 'results.html', 'stats.html', 'players.html', first(/^player-/), first(/^match-/), first(/^opp-/), 'hub.html', 'hub-locker.html', 'hub-matchnight.html', 'hub-squad.html', 'hub-clubhouse.html', 'hub-handbook.html', 'builds.html', 'playbook.html', 'join.html', 'watch.html', 'news.html', 'rush.html', 'tactics.html'].filter((p) => p && all.includes(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe, args: ['--no-sandbox'] } : { args: ['--no-sandbox'] });
const out = [];
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
for (const [label, vp, mobile] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  for (const p of pages) {
    const page = await ctx.newPage(); const bytes = { html: 0, js: 0, css: 0, img: 0, other: 0 }, reqs = []; const sizes = new Map();
    page.on('response', async (r) => { if (!r.url().startsWith(base)) return; try { const b = (await r.body()).length, enc = r.headers()['content-encoding'] ? 'gz' : ''; const t = r.url().split('?')[0].split('.').pop(); const k = t === 'html' ? 'html' : t === 'js' ? 'js' : t === 'css' ? 'css' : /png|jpe?g|webp|svg/.test(t) ? 'img' : 'other'; bytes[k] += b; sizes.set(r.url().replace(base, ''), b); reqs.push(1); } catch {} });
    await page.addInitScript(() => { window.__cls = 0; window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); window.__lt = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true }); } catch {} });
    await page.goto(base + p, { waitUntil: 'load' }).catch(() => {}); await page.waitForTimeout(1800);
    const r = await page.evaluate((lumSrc) => {
      const L = eval(lumSrc);
      const vis = (e) => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
      const name = (e) => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') && [...e.getAttribute('aria-labelledby').split(' ')].map((i) => document.getElementById(i)?.textContent || '').join(' ') || e.textContent || e.getAttribute('title') || e.getAttribute('alt') || e.querySelector('img[alt]')?.alt || (e.id && document.querySelector(`label[for="${e.id}"]`)?.textContent) || e.closest('label')?.textContent || e.getAttribute('placeholder') || '').trim();
      const sel = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
      const noName = [...document.querySelectorAll('a[href],button,[role=button],input:not([type=hidden]),select,textarea')].filter((e) => vis(e) && !name(e)).map(sel);
      const imgNoAlt = [...document.querySelectorAll('img:not([alt])')].map((e) => e.getAttribute('src'));
      const imgNoSize = [...document.querySelectorAll('img')].filter((e) => vis(e) && !(e.getAttribute('width') && e.getAttribute('height')) && !getComputedStyle(e).aspectRatio.match(/\d/) && !e.closest('[class*=ph],[class*=ava],[class*=crest]')).length;
      const imgNoLazy = [...document.querySelectorAll('img')].filter((e) => !e.loading && e.getBoundingClientRect().top > innerHeight * 1.5).length;
      const ids = {}; document.querySelectorAll('[id]').forEach((e) => (ids[e.id] = (ids[e.id] || 0) + 1)); const dupIds = Object.keys(ids).filter((k) => ids[k] > 1);
      const hs = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map((h) => +h.tagName[1]); let skip = 0; for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) skip++;
      const small = [...document.querySelectorAll('a[href],button,[role=button],input:not([type=hidden]),select,[role=tab]')].filter(vis).filter((e) => { const b = e.getBoundingClientRect(); return (b.width < 24 || b.height < 24) && !(e.tagName === 'A' && e.closest('p,li,.md,.txt') && getComputedStyle(e).display === 'inline'); }).map(sel);
      // contrast: text nodes with a solid ancestor background (gradients/images are skipped, so this is a floor, not a verdict)
      const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor.match(/[\d.]+/g); if (c && (c[3] === undefined || +c[3] > 0.9) && !(+c[0] === 0 && +c[1] === 0 && +c[2] === 0 && c[3] === '0')) { if (getComputedStyle(n).backgroundImage !== 'none') return null; return c.slice(0, 3).map(Number); } if (getComputedStyle(n).backgroundImage !== 'none') return null; } return [8, 11, 17]; };
      const low = [], seen = new Set(); const art = (e) => e.closest('.pc-card,.pc-hero,.pc-chip,.fut'); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) { const t = n.textContent.trim(); const e = n.parentElement; if (t.length < 2 || !e || seen.has(e) || art(e) || !vis(e) || /script|style/i.test(e.tagName)) continue; seen.add(e); const cs = getComputedStyle(e); const fg = cs.color.match(/[\d.]+/g).map(Number); const bg = bgOf(e); if (!bg) continue; const a = fg[3] ?? 1; const f = [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a))); const o = +cs.opacity; if (o < 1) continue; const l1 = L(f), l2 = L(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); const size = parseFloat(cs.fontSize), big = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700); if (ratio < (big ? 3 : 4.5)) low.push(`${ratio.toFixed(1)} ${sel(e)} "${t.slice(0, 22)}" ${size}px`); }
      const tiny = [...seen].filter((e) => parseFloat(getComputedStyle(e).fontSize) < 11).length;
      const anim = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).length;
      const lm = { main: document.querySelectorAll('main').length, nav: document.querySelectorAll('nav').length, h1: document.querySelectorAll('h1').length, header: document.querySelectorAll('header').length, footer: document.querySelectorAll('footer').length };
      return { lang: document.documentElement.lang, title: document.title, noName: [...new Set(noName)].slice(0, 6), noNameN: noName.length, imgNoAlt: imgNoAlt.slice(0, 3), imgNoAltN: imgNoAlt.length, imgNoSize, imgNoLazy, dupIds: dupIds.slice(0, 4), hSkip: skip, small: [...new Set(small)].slice(0, 5), smallN: small.length, low: low.slice(0, 40), lowN: low.length, tiny, anim, lm, dom: document.getElementsByTagName('*').length, scripts: document.scripts.length, cls: +(window.__cls || 0).toFixed(3), lcp: Math.round(window.__lcp || 0), lt: Math.round(window.__lt || 0), tabindexPos: document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').length, clickDivs: [...document.querySelectorAll('div[onclick],span[onclick]')].length };
    }, `(${lum.toString()})`);
    // keyboard: tab through the first 60 stops, count stops with no visible focus indicator
    let blind = [], stops = 0, trapped = false; if (!mobile) {
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      let lastKey = ''; for (let i = 0; i < 60; i++) {
        await page.keyboard.press('Tab'); const k = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e), b = e.getBoundingClientRect(); const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || /rgba?\([^)]*\)\s+\d/.test(cs.boxShadow) && cs.boxShadow !== 'none' || cs.borderColor !== ''; const shadow = cs.boxShadow !== 'none'; return { k: e.tagName + (e.id || '') + e.className + Math.round(b.x) + Math.round(b.y), s: `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className).split(' ')[0]}`, outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, shadow, off: b.bottom < 0 || b.top > innerHeight + 4 || b.width === 0, t: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18) }; });
        if (!k) continue; stops++; if (k.k === lastKey) { trapped = true; break; } if (k.off) blind.push('OFFSCREEN ' + k.s + ' "' + k.t + '"'); lastKey = k.k; if (!k.outline && !k.shadow) blind.push(`${k.s} "${k.t}"`);
      }
    }
    // reduced motion: infinite animations still running?
    const rm = await ctx.newPage(); await rm.emulateMedia({ reducedMotion: 'reduce' }); await rm.goto(base + p, { waitUntil: 'load' }).catch(() => {}); await rm.waitForTimeout(1200);
    const animRM = await rm.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).map((a) => a.effect?.target?.className?.toString().split(' ')[0] || a.effect?.target?.tagName).slice(0, 8)); await rm.close();
    const top = [...sizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${(v / 1024).toFixed(0)}K`);
    out.push({ page: p, vp: label, ...r, blind: [...new Set(blind)].slice(0, 6), blindN: blind.length, stops, trapped, animRM, kb: Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, Math.round(v / 1024)])), requests: reqs.length, top });
    await page.close();
  }
  await ctx.close();
}
await browser.close(); srv.close();
if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(out, null, 1));
const t = (o) => Object.values(o.kb).reduce((a, b) => a + b, 0);
console.log('page | vp | KB(gz) js/css/img | reqs | DOM | CLS | LCP | TBT | noName | low-contrast | small targets | focus-blind | anim@reduce');
for (const o of out) console.log(`${o.page} | ${o.vp} | ${t(o)} (${o.kb.js}/${o.kb.css}/${o.kb.img}) | ${o.requests} | ${o.dom} | ${o.cls} | ${o.lcp} | ${o.lt} | ${o.noNameN} | ${o.lowN} | ${o.smallN} | ${o.blindN}${o.trapped ? ' TRAP' : ''} | ${o.animRM.length}`);
const uniq = (k) => [...new Set(out.flatMap((o) => o[k]))];
console.log('\nNO NAME:', uniq('noName').slice(0, 25).join(' · ')); console.log('IMG NO ALT:', uniq('imgNoAlt').join(' · ')); console.log('DUP IDS:', uniq('dupIds').join(' · '));
console.log('FOCUS BLIND:', uniq('blind').slice(0, 20).join(' · ')); console.log('ANIM UNDER REDUCED MOTION:', uniq('animRM').join(' · '));
console.log('SMALL TARGETS:', uniq('small').slice(0, 20).join(' · '));
console.log('LOW CONTRAST (sample):'); for (const l of uniq('low').slice(0, 30)) console.log('  ' + l);
console.log('LANDMARKS:', JSON.stringify(out.filter((o) => o.lm.main !== 1 || o.lm.h1 !== 1).map((o) => `${o.page}:${JSON.stringify(o.lm)}`).slice(0, 8)), '· lang:', uniq('lang').join(','), '· heading skips pages:', out.filter((o) => o.hSkip).length, '· tabindex>0:', out.filter((o) => o.tabindexPos).length);
console.log('HEAVIEST FILES:', uniq('top').slice(0, 10).join(' · '));
