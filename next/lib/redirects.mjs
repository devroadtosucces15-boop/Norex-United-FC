// Swap-over step 2: old URL → new page redirect stubs (PLANNING/NEXT-SWAPOVER.md).
// GitHub Pages has no server redirects, so every old page address that the new build does not produce gets a tiny page that sends the visitor
// on (meta refresh + location.replace, query and #fragment kept). Anything without a new equivalent goes to the same page under classic/.
import fs from 'node:fs'; import path from 'node:path';

// Old root pages with a different home in the new design (target is relative to the site root; '#x' fragments are kept).
export const ROOT_MAP = {
  'members.html': 'hub.html',
  'builder.html': 'builds.html',
  'probuilds.html': 'builds.html',
  'compare.html': 'players.html#compare',
  'apply.html': 'join.html',
  'docs.html': 'news.html',
  'feed.html': 'news.html',
  'messages.html': 'hub-clubhouse.html',
  'burners.html': 'opponents.html',
  'hub/index.html': 'hub.html',
};
// members.html#fragment → page (the bot's Discord embeds link to these)
export const HASH_MAP = { schedule: 'hub-matchnight.html', events: 'hub-matchnight.html', squads: 'hub-squad.html', awards: 'hub-squad.html', handbook: 'hub-handbook.html', clubhouse: 'hub-clubhouse.html' };

const walk = (dir, base = dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, base, acc) : acc.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return acc;
};
export const listFiles = (dir) => walk(dir);

// Pure planner. oldFiles / newFiles: site-relative paths; players: [{ id, k }] (old page key → new page key); returns { 'old/path.html': 'target.html[#frag]' }.
export function planRedirects({ oldFiles, newFiles, players = [] }) {
  const have = new Set(newFiles);
  const byId = new Map(players.filter((p) => p.id != null).map((p) => [String(p.id), p.k]));
  const plan = {};
  for (const f of oldFiles) {
    if (!f.endsWith('.html') || have.has(f)) continue;
    if (/^(assets|api)\//.test(f)) continue;
    let t = null, m;
    if (ROOT_MAP[f]) t = ROOT_MAP[f];
    else if ((m = f.match(/^players\/(.+)\.html$/))) { const k = byId.get(m[1]); if (k != null && have.has(`player-${encodeURIComponent(k)}.html`)) t = `player-${encodeURIComponent(k)}.html`; }
    else if ((m = f.match(/^matches\/(.+)\.html$/))) { if (have.has(`match-${m[1]}.html`)) t = `match-${m[1]}.html`; }
    else if ((m = f.match(/^clubs\/(\d+)(?:-results)?\.html$/))) { if (have.has(`opp-${m[1]}.html`)) t = `opp-${m[1]}.html`; }
    if (t && !have.has(t.split('#')[0])) t = null; // never point at a page the new build lacks
    plan[f] = t || `classic/${f}`;
  }
  return plan;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function stubHtml(file, target) {
  const up = '../'.repeat(file.split('/').length - 1);
  const [page, frag] = target.split('#');
  const to = up + page + (frag ? '#' + frag : '');
  const hashes = file === 'members.html' ? JSON.stringify(Object.fromEntries(Object.entries(HASH_MAP).map(([k, v]) => [k, up + v]))) : 'null';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>NOREX UNITED FC</title><meta http-equiv="refresh" content="0;url=${esc(to)}"><link rel="canonical" href="${esc(to)}">
<script>(function(){var t=${JSON.stringify(to)},m=${hashes},h=location.hash.slice(1).split('?')[0],i=t.indexOf('#'),base=i<0?t:t.slice(0,i),f=i<0?'':t.slice(i);if(m&&m[h]){base=m[h];f=''}else if(!f)f=location.hash;location.replace(base+location.search+f)})()</script></head>
<body style="background:#0b0f16;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:40px"><p>Taking you to the new page… <a style="color:#c8352c" href="${esc(to)}">continue</a></p></body></html>
`;
}

export function emitRedirects({ out, classicDir, players }) {
  const oldFiles = listFiles(classicDir);
  const newFiles = listFiles(out);
  const plan = planRedirects({ oldFiles, newFiles, players });
  // the old preview address: /next/<page> → /<page> (links people shared while the new design lived at /next/)
  for (const f of newFiles) if (f.endsWith('.html') && !/^(api|assets)\//.test(f)) plan[`next/${f}`] = f;
  plan['next/index.html'] = 'index.html';
  for (const [f, t] of Object.entries(plan)) {
    const dest = path.join(out, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, stubHtml(f, t));
  }
  return plan;
}
