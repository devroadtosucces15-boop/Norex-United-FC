// Overflow sweep for the /next/ preview: opens every built page at phone widths (and landscape) in a real browser and reports
// anything that makes the page itself scroll sideways. Wide things are fine only inside their own scroll box.
// Usage: node next/tools/overflow-audit.mjs [baseUrl] [--pages a.html,b.html]
//   baseUrl defaults to http://localhost:4431/ (serve a build with: cd /tmp/nxp && python3 -m http.server 4431)
// Uses an existing local playwright-core install (PLAYWRIGHT_CORE=/path/to/playwright-core); it is a dev tool, not a site dependency.
import { createRequire } from 'node:module'; import os from 'node:os'; import path from 'node:path'; import fs from 'node:fs';
const base = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:4431/').replace(/\/?$/, '/');
const pick = process.argv.includes('--pages') ? process.argv[process.argv.indexOf('--pages') + 1].split(',') : null;
const candidates = [process.env.PLAYWRIGHT_CORE, path.join(os.homedir(), 'playwright-ui-auditor/node_modules/playwright-core'), 'playwright-core'].filter(Boolean);
let pw = null; for (const c of candidates) { try { pw = createRequire(import.meta.url)(c); break; } catch {} }
if (!pw) { console.error('playwright-core not found. Set PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core'); process.exit(2); }
const SIZES = [[320, 640], [360, 740], [390, 844], [430, 932], [844, 390]];
const exe = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((x) => x && fs.existsSync(x));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const ctxFor = (w, h) => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 700, hasTouch: true });
// discover pages from the index's links, plus one match and one player page
const probe = await (await ctxFor(1280, 800)).newPage(); await probe.goto(base + 'index.html');
let pages = pick || await probe.evaluate(() => [...new Set([...document.querySelectorAll('a[href$=".html"]')].map((a) => a.getAttribute('href')).filter((h) => !/^https?:|^\/\//.test(h)))]);
if (!pick) { const m = pages.find((p) => p.startsWith('match-')), pl = pages.find((p) => p.startsWith('player-')); pages = [...new Set(pages.filter((p) => !/^(match-|player-)/.test(p)).concat(m || [], pl || []))].filter((p) => !/^(lookbook|canvas)\.html$/.test(p)); }
let bad = 0; const rows = [];
for (const [w, h] of SIZES) {
  const ctx = await ctxFor(w, h), page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'load' }).catch(() => {});
    await page.evaluate(() => { document.documentElement.dataset.motion = 'off'; document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')); });
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const W = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth, out = [];
      const clipped = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) || cs.position === 'fixed') return true; } return false; };
      for (const e of document.querySelectorAll('body *')) { const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue; const cs = getComputedStyle(e); if (cs.position === 'fixed' || cs.visibility === 'hidden') continue; if (b.right > W + 1 && !clipped(e)) out.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${[...e.classList].slice(0, 2).join('.')} → ${Math.round(b.right - W)}px`); }
      return { sw, W, out: out.slice(0, 4) };
    });
    const fail = r.sw > r.W + 1 || r.out.length; if (fail) bad++;
    rows.push(`${fail ? '✘' : '✔'} ${w}×${h} ${p}${fail ? `  page ${r.sw}/${r.W}  ${r.out.join(' | ')}` : ''}`);
  }
  await ctx.close();
}
await browser.close();
console.log(rows.filter((x) => x.startsWith('✘')).join('\n') || 'no sideways scrolling found');
console.log(`\n${pages.length} pages × ${SIZES.length} sizes · ${bad} problem${bad === 1 ? '' : 's'}`);
process.exit(bad ? 1 : 0);
