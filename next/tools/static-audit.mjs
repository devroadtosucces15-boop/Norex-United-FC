// Phase E static audit of a built /next/ folder (no browser needed): accessibility basics, page weight, script load.
//   node next/tools/static-audit.mjs [dir]      (dir defaults to a fresh --preview build in the temp folder)
// Exports `audit(dir)` so tests/next-quality.test.mjs can enforce the invariants.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export function audit(dir, { skip = /^(canvas|lookbook)\.html$/ } = {}) {
  const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
  const pages = fs.readdirSync(dir).filter((f) => f.endsWith('.html') && !skip.test(f));
  const issues = {}; const add = (k, f) => (issues[k] ||= new Set()).add(f);
  const css = read('style.css');
  const tok = (n) => (css.match(new RegExp('--' + n + ':(#[0-9a-fA-F]{6})')) || [])[1];
  const contrast = [];
  for (const [fg, bgs] of [['text', ['ink', 'p1', 'p3']], ['soft', ['ink', 'p1', 'p3']], ['mute', ['ink', 'p1', 'p3']], ['g2', ['ink', 'p1']]]) for (const bg of bgs) if (tok(fg) && tok(bg)) contrast.push({ fg, bg, ratio: +ratio(tok(fg), tok(bg)).toFixed(2) });
  const rows = [];
  for (const f of pages) {
    const h = read(f); const body = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
    if (!/<html lang="/.test(h)) add('no lang', f);
    if (!/<title>[^<]{3,}/.test(h)) add('no title', f);
    if (/user-scalable=no|maximum-scale=1(?![0-9])/.test(h)) add('pinch-zoom blocked', f);
    if (!/<main[ >]/.test(h)) add('no main landmark', f);
    if (!/class="skip"/.test(h)) add('no skip link', f);
    const h1 = (body.match(/<h1[ >]/g) || []).length + (body.match(/<h[23][^>]*aria-level="1"/g) || []).length; if (h1 !== 1) add(h1 ? 'several h1' : 'no h1', f);
    for (const m of body.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) add('img without alt', f);
    for (const m of body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) { const txt = m[2].replace(/<[^>]+>/g, '').trim(); if (!txt && !/aria-label=|title=/.test(m[1]) && !/\bid="/.test(m[1])) add('button without a name', f); }
    for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) { const txt = m[2].replace(/<(?!img)[^>]+>/g, '').trim(); if (!txt && !/aria-label=|title=/.test(m[1]) && !/<img[^>]+alt="[^"]+"/.test(m[2])) add('link without a name', f); }
    for (const m of body.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) { if (/type="(hidden|checkbox|radio|submit|button)"|aria-hidden="true"/.test(m[2])) continue; const before = body.slice(Math.max(0, m.index - 220), m.index); if (/<label\b(?![\s\S]*<\/label>)/.test(before)) continue; if (!/aria-label=|aria-labelledby=/.test(m[2]) && !/placeholder=/.test(m[2])) add('form field without a label', f); }
    for (const m of body.matchAll(/<(div|span|li|p|i|b)\b[^>]*\bonclick=[^>]*>/g)) if (!/role="button"/.test(m[0])) add('click handler on a non-button', f);
    if (/tabindex="[1-9]/.test(body)) add('positive tabindex', f);
    const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]); if (new Set(ids).size < ids.length) add('duplicate ids', f);
    const scripts = [...h.matchAll(/<script src="([^"]+)"([^>]*)>/g)];
    const size = (n) => (fs.existsSync(path.join(dir, n)) ? fs.statSync(path.join(dir, n)).size : 0);
    rows.push({ f, html: Buffer.byteLength(h), htmlGz: zlib.gzipSync(h).length, scripts: scripts.length, jsBytes: scripts.reduce((n, m) => n + size(m[1]), 0), inline: [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].reduce((n, m) => n + m[1].length, 0), cssBytes: [...h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].reduce((n, m) => n + size(m[1]), 0), crestBig: [...h.matchAll(/<img([^>]*) src="crest\.png"([^>]*)>/g)].some((m) => { const a = m[1] + m[2], w = +((/\bwidth="(\d+)"/.exec(a) || /width:(\d+)px/.exec(a) || [])[1] || 0); return !w || w <= 96; }), /* the 180 KB original is for mid-size spots only; logos use crest-sm, hero crests crest-lg */ });
  }
  const sum = (k) => rows.reduce((n, r) => n + r[k], 0); const kb = (n) => Math.round(n / 1024);
  const worst = (k, n = 5) => [...rows].sort((a, b) => b[k] - a[k]).slice(0, n).map((r) => `${r.f} ${kb(r[k])}k`);
  return {
    pages: pages.length, contrast, lowContrast: contrast.filter((c) => c.ratio < 4.5),
    issues: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, { pages: v.size, e: [...v].slice(0, 3) }])),
    bigCrestPages: rows.filter((r) => r.crestBig).length,
    weight: { avgHtmlKB: kb(sum('html') / rows.length), avgHtmlGzKB: kb(sum('htmlGz') / rows.length), avgScripts: +(sum('scripts') / rows.length).toFixed(1), avgJsKB: kb(sum('jsBytes') / rows.length), avgCssKB: kb(sum('cssBytes') / rows.length), heaviestHtml: worst('html'), heaviestJs: worst('jsBytes'), heaviestInline: worst('inline', 3) },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let dir = process.argv[2];
  if (!dir) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nxq-')); execFileSync(process.execPath, ['next/build.mjs', '--out', dir, '--preview'], { cwd: ROOT, stdio: 'pipe' }); }
  console.log(JSON.stringify(audit(dir), null, 1));
}
