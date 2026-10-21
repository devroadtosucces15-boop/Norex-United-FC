// Discord card templates (bot design system). Draws the pictures the bot attaches to stat and match messages – score card,
// field view, player card, leaderboard tables, club card, recent results – in the site's own look (tokens from
// next/static/style.css, Oswald + Inter bundled in scripts/cards/fonts). Runs after the site build:
//   node scripts/cards.mjs            reads site/api/*.json → site/cards/*.png + site/api/cards.json (what the bot reads)
//   node scripts/cards.mjs --html     also writes each card's HTML next to it (for tweaking templates in a browser)
// Cards are 1200 px wide: Discord shows them at ~550 px, so nothing in them is set smaller than ~24 px.
// File names carry a hash of what's drawn, so Discord never shows a stale cached picture after the numbers change.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FORMATIONS, POS_OF } from '../bot/events.js';
import { loadConfig } from './lib.mjs';
import { buildReview, loadHistory } from './lib/matchreview.mjs';
import { buildMatchPicture, fetchPlayerFaces } from './lib/matchpicture.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const TEMPLATE_VERSION = 4; // bump to redraw every card after a template change
const W = 1200;
const COMPARE_PAIRS = 12; // busiest players whose every pairing gets a /compare picture (12 → 66 cards)

// ---------- shared look ----------
const font = (f) => fs.readFileSync(path.join(ROOT, 'scripts/cards/fonts', f)).toString('base64');
let FONTS = null;
const fontFaces = () => (FONTS ??= `@font-face{font-family:Oswald;font-weight:200 700;src:url(data:font/woff2;base64,${font('Oswald.woff2')}) format('woff2')}
@font-face{font-family:Inter;font-weight:100 900;src:url(data:font/woff2;base64,${font('Inter.woff2')}) format('woff2')}`);

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BASE = `
:root{--ink:#080b11;--p1:#111722;--p2:#171f2d;--p3:#1f2a3c;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--red:#c8352c;--red2:#e0493f;
--text:#eef2f9;--soft:#9ba7bd;--mute:#6c7890;--g1:#fff1c2;--g2:#efcf7a;--g3:#c9993a;--g4:#8a6a1c;--gold:linear-gradient(135deg,var(--g1),var(--g2) 40%,var(--g3) 75%,var(--g4));
--win:#4be08a;--winbg:#12331f;--draw:#efcf7a;--drawbg:#332b12;--loss:#ff7d72;--lossbg:#3a1613}
*{box-sizing:border-box;margin:0}
html,body{background:var(--ink);color:var(--text);font:500 26px/1.35 Inter,sans-serif;-webkit-font-smoothing:antialiased}
body{width:${W}px;position:relative;overflow:hidden;isolation:isolate}
body:before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(900px 420px at 80% -10%,rgba(200,53,44,.32),transparent 65%),radial-gradient(700px 400px at 0% 110%,rgba(200,53,44,.12),transparent 60%),linear-gradient(180deg,#0d121b,#06080c)}
.osw{font-family:Oswald,sans-serif;text-transform:uppercase;letter-spacing:.03em}
.eyebrow{font:700 20px Inter;letter-spacing:.3em;text-transform:uppercase;color:#f08f87}
.gold{background:var(--gold);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand{position:absolute;right:34px;bottom:24px;font:600 17px Inter;letter-spacing:.32em;text-transform:uppercase;color:rgba(255,255,255,.32)}
.pill{display:inline-block;font:800 24px Inter;letter-spacing:.12em;padding:6px 18px;border-radius:999px;border:2px solid}
.pill.W{background:var(--winbg);border-color:#1d6b3d;color:var(--win)}.pill.D{background:var(--drawbg);border-color:#6d5a1f;color:var(--draw)}.pill.L{background:var(--lossbg);border-color:#7a2a24;color:var(--loss)}
.chip{display:inline-block;font:600 20px Oswald;letter-spacing:.08em;color:var(--g2);background:var(--p3);border:1px solid var(--line2);border-radius:8px;padding:2px 10px;vertical-align:4px}
.tile{background:linear-gradient(180deg,#111827,#0a0e15);border:1px solid var(--line);border-radius:18px;padding:22px 24px 20px 30px;position:relative;overflow:hidden}
.tile:before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--red)}.tile.g:before{background:var(--gold)}
.tile b{display:block;font:700 78px/1 Oswald;font-variant-numeric:tabular-nums}.tile.g b{background:var(--gold);-webkit-background-clip:text;background-clip:text;color:transparent}
.tile span{display:block;margin-top:10px;font:700 18px Inter;letter-spacing:.22em;text-transform:uppercase;color:var(--soft)}
`;
const page = (css, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces()}${BASE}${css}</style></head><body>${body}</body></html>`;
const SHIELD = (fill, stroke, letter) => `<svg viewBox="0 0 40 46" width="100%" height="100%"><path d="M20 1 38 7v15c0 11-8 19-18 23C10 41 2 33 2 22V7z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><text x="20" y="29" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="16" fill="#fff">${esc(letter)}</text></svg>`;
// a crest <img> that falls back to a drawn shield if the picture can't load
const crest = (src, name, size, home) => {
  const fb = SHIELD(home ? '#c8352c' : '#2a3446', home ? '#efcf7a' : '#9ba7bd', String(name || '?').trim()[0]?.toUpperCase() ?? '?').replace(/"/g, "'");
  return src
    ? `<span style="display:inline-block;width:${size}px;height:${size}px"><img src="${esc(src)}" width="${size}" height="${size}" style="object-fit:contain;filter:drop-shadow(0 14px 24px rgba(0,0,0,.6))" onerror="this.outerHTML=&quot;${fb.replace(/&/g, '&amp;')}&quot;"></span>`
    : `<span style="display:inline-block;width:${size}px;height:${size}px">${fb}</span>`;
};
const r1 = (v) => (+v || 0).toFixed(1);
const band = (r, motm) => (motm ? 'gold' : r >= 7 ? 'win' : r >= 6 ? 'draw' : 'loss');
const BAND = { gold: '#efcf7a', win: '#4be08a', draw: '#ff9f43', loss: '#ff7d72' }; // 6–6.9 is orange, so it never reads as MOTM gold
const RESULT = { W: 'Win', D: 'Draw', L: 'Loss' };
const when = (ts) => new Date(ts * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

// ---------- score card (top of every match message) ----------
export function scoreCard(m, club) {
  const scorers = (m.scorers ?? []).map((s) => `${esc(s.n)}${s.g > 1 ? ` ×${s.g}` : ''}`).join(' · ');
  return page(`
body{height:500px}
.top{position:absolute;left:0;right:0;top:34px;text-align:center}
.row{position:absolute;left:50px;right:50px;top:96px;display:grid;grid-template-columns:1fr 420px 1fr;align-items:center}
.side{display:grid;justify-items:center;gap:14px;text-align:center}
.side b{font:600 34px/1.1 Oswald;letter-spacing:.06em;text-transform:uppercase;max-width:330px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.score{text-align:center}.score b{display:block;font:700 190px/1 Oswald;letter-spacing:.01em;text-shadow:0 10px 50px rgba(200,53,44,.55)}
.foot{position:absolute;left:60px;right:60px;bottom:40px;display:flex;justify-content:center;gap:36px;font-size:24px;color:#cfd8e8;white-space:nowrap;overflow:hidden}
.foot i{font-style:normal;color:var(--soft);font-weight:700;letter-spacing:.16em;text-transform:uppercase;font-size:18px;margin-right:10px}`,
  `<div class="top eyebrow">${esc(club.name)} · ${m.mode === 'rush' ? 'Rush' : 'League'} · ${esc(when(m.ts))}</div>
<div class="row">
  <div class="side">${crest(club.crest, club.name, 170, true)}<b>${esc(club.name.replace(/\s+FC$/i, ''))}</b></div>
  <div class="score"><b>${m.gf}–${m.ga}</b><span class="pill ${m.res}">${RESULT[m.res] ?? ''}</span></div>
  <div class="side">${crest(m.oppCrest, m.opp, 170, false)}<b>${esc(m.opp)}</b></div>
</div>
<div class="foot">${scorers ? `<span><i>Goals</i>${scorers}</span>` : '<span><i>Goals</i>none</span>'}${m.motm ? `<span><i>MOTM</i><span class="gold" style="font-weight:700">${esc(m.motm)}</span></span>` : ''}</div>`);
}

// ---------- field view (bottom of every match message) ----------
const GROUPS = [['goalkeeper', 7], ['defender', 27], ['midfielder', 52], ['forward', 79]];
const LAT = { 1: [.5], 2: [.33, .67], 3: [.2, .5, .8], 4: [.12, .37, .63, .88], 5: [.1, .3, .5, .7, .9] };
export function fieldSlots(ps) {
  const out = [];
  for (const [pos, x] of GROUPS) {
    const g = ps.filter((p) => (p.pos ?? 'midfielder') === pos);
    const lat = LAT[g.length] ?? g.map((_, j) => .08 + .84 * j / (g.length - 1));
    g.forEach((p, j) => out.push({ p, x: g.length > 5 ? x + (j % 2 ? 5 : -5) : x, y: 3 + 62 * lat[j] }));
  }
  return out;
}
export function fieldCard(m) {
  const ps = m.ps ?? [];
  const avg = ps.length ? ps.reduce((t, p) => t + (+p.r || 0), 0) / ps.length : 0;
  const stripes = Array.from({ length: 7 }, (_, k) => `<rect x="${7.5 + 15 * k}" width="7.5" height="68" fill="#17603a"/>`).join('');
  const markers = fieldSlots(ps).map(({ p, x, y }) => {
    const b = band(+p.r, p.mom), gold = b === 'gold';
    const name = String(p.n).length > 15 ? `${String(p.n).slice(0, 14)}…` : p.n;
    return `<g>${gold ? `<circle cx="${x}" cy="${y}" r="4.3" fill="url(#gd)"/>` : `<circle cx="${x}" cy="${y}" r="3.7" fill="#0b0f16" stroke="${BAND[b]}" stroke-width=".55"/>`}
<text x="${x}" y="${y + 1.05}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="${gold ? 3.2 : 2.9}" fill="${gold ? '#2d1f06' : BAND[b]}">${r1(p.r)}</text>
<text x="${x}" y="${y + (gold ? 7 : 6.5)}" text-anchor="middle" font-family="Inter" font-weight="${gold ? 800 : 600}" font-size="2.15" fill="${gold ? '#fff1c2' : '#fff'}" stroke="#0b0f16" stroke-width=".55" paint-order="stroke">${esc(name)}</text></g>`;
  }).join('');
  return page('body{height:777px}svg{display:block}', `<svg viewBox="0 0 105 68" width="${W}" height="777">
<defs><linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1c2"/><stop offset=".45" stop-color="#efcf7a"/><stop offset="1" stop-color="#c9993a"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>
<rect width="105" height="68" fill="#14502e"/>${stripes}
<g fill="none" stroke="#ffffffb0" stroke-width=".3"><rect x="1" y="1" width="103" height="66"/><line x1="52.5" y1="1" x2="52.5" y2="67"/><circle cx="52.5" cy="34" r="9.15"/>
<rect x="1" y="13.84" width="16.5" height="40.32"/><rect x="1" y="24.84" width="5.5" height="18.32"/><rect x="87.5" y="13.84" width="16.5" height="40.32"/><rect x="98.5" y="24.84" width="5.5" height="18.32"/></g>
<rect width="105" height="68" fill="url(#vig)"/>
<text x="3" y="4.4" font-family="Inter" font-weight="800" font-size="1.75" letter-spacing=".45" fill="#ffffffb0">NOREX RATINGS · ${esc(m.opp).toUpperCase()}</text>
<text x="102" y="4.4" text-anchor="end" font-family="Inter" font-weight="800" font-size="1.75" letter-spacing=".45" fill="#ffffffb0">TEAM AVG ${r1(avg)}  ·  ATTACKING →</text>
${markers}</svg>`);
}

// ---------- player card (stat tiles + rating graph) ----------
export function ratingGraph(tr, { w = 1080, h = 270 } = {}) {
  const pts = (tr ?? []).slice(-10).map(Number).filter((r) => r > 0);
  if (pts.length < 2) return '';
  const lo = Math.min(5, Math.floor(Math.min(...pts))), hi = 10, L = 60, R = w - 40, T = 50, B = h - 30;
  const X = (i) => L + (R - L) * i / (pts.length - 1), Y = (r) => B - (B - T) * (r - lo) / (hi - lo);
  const line = pts.map((r, i) => `${X(i).toFixed(1)},${Y(r).toFixed(1)}`).join(' ');
  const best = pts.indexOf(Math.max(...pts)), last = pts.length - 1;
  const grid = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).map((v) => `<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.07)"/><text x="${L - 14}" y="${Y(v) + 8}" text-anchor="end" font-family="Inter" font-weight="600" font-size="22" fill="#6c7890">${v}</text>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0493f" stop-opacity=".42"/><stop offset="1" stop-color="#e0493f" stop-opacity="0"/></linearGradient></defs>
${grid}<path d="M${X(0)} ${B} L${line.replace(/ /g, ' L')} L${X(last)} ${B} Z" fill="url(#ar)"/>
<polyline points="${line}" fill="none" stroke="#e0493f" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
${pts.map((r, i) => `<circle cx="${X(i)}" cy="${Y(r)}" r="${i === last ? 11 : 6}" fill="${i === last ? '#efcf7a' : BAND[band(r)]}" stroke="#0b0f16" stroke-width="3"/>`).join('')}
<text x="${X(best)}" y="${Y(pts[best]) - 18}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="26" fill="#efcf7a">${r1(pts[best])}</text>
${best !== last ? `<text x="${X(last)}" y="${Y(pts[last]) - 18}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="26" fill="#fff">${r1(pts[last])}</text>` : ''}</svg>`;
}
export function playerCard(p) {
  const s = p.s ?? {}, graph = ratingGraph(p.tr);
  const tiles = [['Games', s.gp ?? 0], ['Goals', s.g ?? 0], ['Assists', s.a ?? 0], ['Rating', r1(s.r), 'g'], ['MOTM', s.m ?? 0]];
  return page(`
.wrap{padding:44px 60px 64px}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:30px}
.head h1{font:700 70px/1 Oswald;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:860px}
.ovr{text-align:right}.ovr b{display:block;font:700 92px/0.9 Oswald}.ovr span{font:700 18px Inter;letter-spacing:.3em;color:var(--soft)}
.tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:30px}
.g-h{margin:34px 0 6px;font:700 19px Inter;letter-spacing:.26em;text-transform:uppercase;color:var(--soft)}`,
  `<div class="wrap">
<div class="eyebrow">${esc(p.sc ?? 'NOREX UNITED')} · Player card</div>
<div class="head"><h1>${esc(p.n)} <span class="chip">${esc(p.pos ?? '')}</span></h1>${p.ovr ? `<div class="ovr"><b class="gold">${p.ovr}</b><span>OVR</span></div>` : ''}</div>
<div class="tiles">${tiles.map(([k, v, c]) => `<div class="tile ${c ?? ''}"><b>${esc(v)}</b><span>${k}</span></div>`).join('')}</div>
${graph ? `<div class="g-h">Match rating · last ${Math.min(10, (p.tr ?? []).length)}</div>${graph}` : ''}
</div><div class="brand">norex united</div>`);
}

// ---------- box score (the "Box score" button on a match message) ----------
// Our side only: the match data carries every player's line for us but nothing for the other team beyond the score.
const pc = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
export function boxScoreCard(m, club) {
  const ps = [...(m.ps ?? [])].sort((a, b) => (+b.r || 0) - (+a.r || 0)).slice(0, 11);
  const sum = (f) => (m.ps ?? []).reduce((t, p) => t + (+p[f] || 0), 0);
  const rows = ps.map((p) => {
    const b = band(+p.r, p.mom);
    return `<div class="r${p.mom ? ' top' : ''}"><span class="n">${esc(p.n)}${p.pos ? ` <i>${esc(String(p.pos).slice(0, 3).toUpperCase())}</i>` : ''}</span>
<span class="v big" style="color:${BAND[b]}">${r1(p.r)}</span><span class="v">${p.g ?? 0}</span><span class="v">${p.a ?? 0}</span><span class="v">${pc(p.pm, p.pa)}</span><span class="v">${p.tm ?? 0}/${p.ta ?? 0}</span><span class="v">${p.sh ?? 0}</span></div>`;
  }).join('');
  return page(`
.wrap{padding:44px 60px 70px}
.head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px}
.head h1{font:700 64px/1 Oswald;text-transform:uppercase;letter-spacing:.02em}
.head .res{text-align:right}
.h{display:grid;grid-template-columns:minmax(0,1fr) 110px 70px 70px 120px 160px 120px;font:700 19px Inter;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);padding:0 0 12px;border-bottom:1px solid var(--line)}
.r{display:grid;grid-template-columns:minmax(0,1fr) 110px 70px 70px 120px 160px 120px;align-items:center;column-gap:10px;padding:13px 14px;margin-top:8px;border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.04),transparent)}
.r.top{background:linear-gradient(90deg,rgba(239,207,122,.14),transparent 75%)}
.n{font:600 30px Inter;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.n i{font:600 19px Oswald;font-style:normal;letter-spacing:.08em;color:var(--g2);background:var(--p3);border-radius:6px;padding:1px 8px;margin-left:8px;vertical-align:3px}
.v{text-align:right;font:600 30px Oswald;font-variant-numeric:tabular-nums;color:#cfd8e8}.v.big{font-size:38px}
.h span:nth-child(n+2){text-align:right}
.tot{margin-top:18px;padding:16px 14px 0;border-top:1px solid var(--line);display:grid;grid-template-columns:minmax(0,1fr) 110px 70px 70px 120px 160px 120px;column-gap:10px;font:700 24px Oswald;color:var(--soft);text-transform:uppercase;letter-spacing:.06em}
.tot span:nth-child(n+2){text-align:right;color:var(--text)}`,
  `<div class="wrap">
<div class="eyebrow">${esc(club.name)} · Box score</div>
<div class="head"><h1>${esc(club.name.replace(/\s+FC$/i, ''))} ${m.gf}–${m.ga} ${esc(m.opp)}</h1><div class="res"><span class="pill ${m.res}">${RESULT[m.res] ?? ''}</span></div></div>
<div class="h"><span>Player</span><span>RTG</span><span>G</span><span>A</span><span>Pass</span><span>Tackles</span><span>Shots</span></div>
${rows}
<div class="tot"><span>Team</span><span>${r1((m.ps ?? []).length ? sum('r') / m.ps.length : 0)}</span><span>${sum('g')}</span><span>${sum('a')}</span><span>${pc(sum('pm'), sum('pa'))}</span><span>${sum('tm')}/${sum('ta')}</span><span>${sum('sh')}</span></div>
</div><div class="brand">norex united</div>`);
}

// ---------- compare (bar chart for /compare) ----------
export const COMPARE_ROWS = (a, b) => [['OVR', a.ovr, b.ovr], ['Games', a.s?.gp, b.s?.gp], ['Goals', a.s?.g, b.s?.g], ['Assists', a.s?.a, b.s?.a], ['Rating', a.s?.r, b.s?.r, 1], ['MOTM', a.s?.m, b.s?.m], ['Pass %', a.s?.p, b.s?.p], ['Tackle %', a.s?.t, b.s?.t], ['Win %', a.s?.w, b.s?.w]];
export function compareCard(a, b) {
  const rows = COMPARE_ROWS(a, b).filter(([, x, y]) => (+x || 0) + (+y || 0) > 0).map(([k, x, y, dec = 0]) => {
    const hi = Math.max(+x || 0, +y || 0) || 1, xa = +x || 0, ya = +y || 0;
    const side = (v, win, left) => `<div class="bar ${left ? 'l' : 'r'}"><i class="${win ? 'w' : ''}" style="width:${Math.max(3, Math.round((v / hi) * 100))}%"></i></div>`;
    return `<div class="row"><b class="${xa > ya ? 'gold' : ''}">${xa.toFixed(dec)}</b>${side(xa, xa > ya, true)}<span>${esc(k)}</span>${side(ya, ya > xa, false)}<b class="${ya > xa ? 'gold' : ''}">${ya.toFixed(dec)}</b></div>`;
  }).join('');
  return page(`
.wrap{padding:44px 60px 70px}
.top{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:26px}
.top div:last-child{text-align:right}
.top h1{font:700 60px/1 Oswald;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.top small{display:block;margin-top:6px;font:700 20px Inter;letter-spacing:.24em;color:var(--soft);text-transform:uppercase}
.row{display:grid;grid-template-columns:110px 1fr 190px 1fr 110px;align-items:center;column-gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}
.row b{font:700 44px Oswald;font-variant-numeric:tabular-nums}.row b:first-child{text-align:right}
.row span{text-align:center;font:700 20px Inter;letter-spacing:.2em;text-transform:uppercase;color:var(--soft)}
.bar{height:20px;border-radius:10px;background:rgba(255,255,255,.07);display:flex}.bar.l{justify-content:flex-end}
.bar i{display:block;height:100%;border-radius:10px;background:#3a4a66}.bar i.w{background:linear-gradient(90deg,var(--red),#ff8a3c)}`,
  `<div class="wrap"><div class="eyebrow">Compare</div>
<div class="top"><div><h1>${esc(a.n)}</h1><small>${esc(a.pos ?? '')}</small></div><div><h1>${esc(b.n)}</h1><small>${esc(b.pos ?? '')}</small></div></div>
${rows || '<div class="row"><span style="grid-column:1/-1">No stats to compare yet</span></div>'}
</div><div class="brand">norex united</div>`);
}

// ---------- leaderboard table ----------
export const TOP_STATS = {
  goals: ['Top scorers', (p) => p.s.g], assists: ['Most assists', (p) => p.s.a], ga: ['Goals + assists', (p) => p.s.g + p.s.a],
  rating: ['Best average rating', (p) => (p.s.gp >= 3 ? p.s.r : 0), 1], motm: ['Most man of the match', (p) => p.s.m], games: ['Most appearances', (p) => p.s.gp],
};
export function topRows(players, stat) {
  const [, f] = TOP_STATS[stat] ?? TOP_STATS.goals;
  return players.filter((p) => p.home && p.s && p.src === 'club').map((p) => [p, f(p)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
}
const COLS = [['GP', (p) => p.s.gp, 'games'], ['G', (p) => p.s.g, 'goals'], ['A', (p) => p.s.a, 'assists'], ['RTG', (p) => r1(p.s.r), 'rating'], ['MOTM', (p) => p.s.m, 'motm']];
export function tableCard(players, stat, club) {
  const [title, , dec = 0] = TOP_STATS[stat] ?? TOP_STATS.goals;
  const rows = topRows(players, stat), max = rows[0]?.[1] || 1;
  const hot = stat === 'ga' ? ['goals', 'assists'] : [stat];
  return page(`
.wrap{padding:42px 50px 70px}
h1{font:700 56px/1.05 Oswald;text-transform:uppercase;margin:8px 0 24px}
.r{display:grid;grid-template-columns:70px minmax(0,1fr) 92px 92px 92px 104px 104px 140px;align-items:center;column-gap:10px;position:relative}
.hd{font:700 17px Inter;letter-spacing:.2em;color:var(--mute);padding:0 0 12px;border-bottom:1px solid var(--line);text-transform:uppercase}
.row{height:76px;border-radius:12px;margin-top:8px;background:linear-gradient(90deg,rgba(255,255,255,.035),transparent);overflow:hidden}
.row.first{background:linear-gradient(90deg,rgba(239,207,122,.14),transparent 75%)}
.n{text-align:right;font:600 32px Oswald;font-variant-numeric:tabular-nums;color:#cfd8e8}.n.hot{color:#fff;font-size:38px}
.row.first .n.hot{background:var(--gold);-webkit-background-clip:text;background-clip:text;color:transparent}
.val{text-align:right;font:700 44px Oswald;font-variant-numeric:tabular-nums}
.rk{justify-self:center;width:46px;height:46px;border-radius:12px;display:grid;place-items:center;font:700 26px Oswald;background:var(--p3);color:var(--soft)}
.rk.k1{background:var(--gold);color:#2d1f06}.rk.k2{background:#2a3446;color:#e4ebf7}.rk.k3{background:var(--red);color:#fff}
.nm{font-weight:700;font-size:30px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:8px}
.meter{position:absolute;left:80px;bottom:0;height:4px;border-radius:3px;background:linear-gradient(90deg,var(--red),#ff8a3c)}.row.first .meter{background:var(--gold)}
.empty{padding:60px 0;color:var(--soft);font-size:30px}`,
  `<div class="wrap"><div class="eyebrow">${esc(club.name)} · Leaderboard</div><h1>${esc(title)}</h1>
<div class="r hd"><span></span><span style="padding-left:8px">Player</span>${COLS.map(([k, , id]) => `<span class="n" style="font:inherit;color:${hot.includes(id) ? '#f08f87' : 'inherit'}">${k}</span>`).join('')}<span class="n" style="font:inherit">${stat === 'ga' ? 'G+A' : 'Total'}</span></div>
${rows.length ? rows.map(([p, v], i) => `<div class="r row ${i ? '' : 'first'}"><span class="rk ${i < 3 ? `k${i + 1}` : ''}">${i + 1}</span><span class="nm">${esc(p.n)} <span class="chip">${esc(p.pos ?? '')}</span></span>${COLS.map(([, f, id]) => `<span class="n ${hot.includes(id) ? 'hot' : ''}">${esc(f(p))}</span>`).join('')}<span class="val ${i ? '' : 'gold'}">${(+v).toFixed(dec)}</span><span class="meter" style="width:${Math.max(4, Math.round(900 * v / max))}px"></span></div>`).join('') : '<div class="empty">No games logged yet this season.</div>'}
</div><div class="brand">norex united</div>`);
}

// ---------- club card ----------
export function clubCard(club) {
  const form = [...(club.form ?? [])].slice(0, 10).reverse(); // oldest → newest, left to right
  const gd = (club.gf ?? 0) - (club.ga ?? 0);
  return page(`
.wrap{padding:46px 60px 70px}
.head{display:grid;grid-template-columns:150px 1fr auto;gap:34px;align-items:center}
.head h1{font:700 68px/1 Oswald;text-transform:uppercase}
.div{text-align:right}.div b{display:block;font:700 88px/0.9 Oswald}.div span{font:700 18px Inter;letter-spacing:.3em;color:var(--soft)}
.tiles{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-top:34px}.tiles .tile{padding:22px 16px 20px 26px}.tiles .tile b{font-size:60px}.tiles .tile span{letter-spacing:.14em;font-size:16px;white-space:nowrap}
.tile.w b{color:var(--win)}.tile.d b{color:var(--draw)}.tile.l b{color:var(--loss)}
.form{margin-top:30px;display:flex;align-items:center;gap:12px}.form i{width:64px;height:64px;border-radius:14px;display:grid;place-items:center;font:700 30px Oswald;font-style:normal}
.form .W{background:var(--winbg);color:var(--win);box-shadow:inset 0 0 0 2px #1d6b3d}.form .D{background:var(--drawbg);color:var(--draw);box-shadow:inset 0 0 0 2px #6d5a1f}.form .L{background:var(--lossbg);color:var(--loss);box-shadow:inset 0 0 0 2px #7a2a24}
.form span{font:700 18px Inter;letter-spacing:.24em;color:var(--soft);margin-right:10px}`,
  `<div class="wrap"><div class="head">${crest(club.crest, club.name, 150, true)}<div><div class="eyebrow">Club record · this season</div><h1>${esc(club.name)}</h1></div>
<div class="div"><b class="gold">${esc(club.division ?? '–')}</b><span>DIVISION</span></div></div>
<div class="tiles"><div class="tile"><b>${club.gp ?? 0}</b><span>Played</span></div><div class="tile w"><b>${club.w ?? 0}</b><span>Won</span></div><div class="tile d"><b>${club.d ?? 0}</b><span>Drawn</span></div><div class="tile l"><b>${club.l ?? 0}</b><span>Lost</span></div>
<div class="tile"><b>${club.gf ?? 0}</b><span>Scored</span></div><div class="tile g"><b>${gd >= 0 ? '+' : ''}${gd}</b><span>Goal diff</span></div></div>
${form.length ? `<div class="form"><span>FORM</span>${form.map((r) => `<i class="${r}">${r}</i>`).join('')}<span style="margin-left:10px">→ NEWEST</span></div>` : ''}
</div><div class="brand">norex united</div>`);
}

// ---------- recent results ----------
export function resultsCard(club, n = 8) {
  const ms = (club.matches ?? []).slice(0, n);
  return page(`
.wrap{padding:42px 50px 70px}
h1{font:700 56px/1.05 Oswald;text-transform:uppercase;margin:8px 0 22px}
.row{display:grid;grid-template-columns:110px 150px 70px minmax(0,1fr) 190px;align-items:center;gap:18px;height:84px;border-bottom:1px solid var(--line)}
.sc{font:700 46px Oswald;font-variant-numeric:tabular-nums;text-align:center}
.opp{min-width:0}.opp b{display:block;font-weight:700;font-size:30px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.opp small{display:block;color:var(--soft);font-size:21px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dt{text-align:right;color:var(--soft);font-size:22px}`,
  `<div class="wrap"><div class="eyebrow">${esc(club.name)} · Results</div><h1>Last ${ms.length} matches</h1>
${ms.map((m) => `<div class="row"><span class="pill ${m.res}" style="text-align:center">${RESULT[m.res]?.toUpperCase() ?? ''}</span><span class="sc">${m.gf}–${m.ga}</span>${crest(m.oppCrest, m.opp, 58, false)}
<span class="opp"><b>${esc(m.opp)}</b><small>${(m.scorers ?? []).length ? (m.scorers ?? []).map((s) => `${esc(s.n)}${s.g > 1 ? ` ×${s.g}` : ''}`).join(', ') : 'no scorers'}</small></span><span class="dt">${esc(when(m.ts))}</span></div>`).join('')}
</div><div class="brand">norex united</div>`);
}


// ---------- match review (message 2 of a result): one picture, one plain pattern for every row ----------
// Neutral palette: white headings, icon tiles, rows that all follow the same shape. Colour only on small status marks – gold stays for
// special callouts (man of the match), so nothing here uses it. Model comes from scripts/lib/matchreview.mjs.
const RV = (d) => (c = '#fff', s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}">${d.replaceAll('$', c)}</svg>`;
export const REVIEW_ICON = {
  team: RV('<circle cx="8" cy="8" r="3.2" fill="$"/><circle cx="17" cy="9" r="2.6" fill="$" opacity=".7"/><path d="M2 20c0-4 3-6 6-6s6 2 6 6zM14 20c0-3 2-5 4.5-5S23 17 23 20z" fill="$"/>'),
  glove: RV('<path d="M7 21v-6.5L4.6 11a1.6 1.6 0 0 1 2.5-2L9 11V4.6a1.4 1.4 0 0 1 2.8 0V10h.4V3.6a1.4 1.4 0 0 1 2.8 0V10h.4V4.8a1.4 1.4 0 0 1 2.8 0V15c0 3-2 6-5 6z" fill="none" stroke="$" stroke-width="1.8" stroke-linejoin="round"/>'),
  shield: RV('<path d="M12 2.5l8 2.8v6.2c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V5.3z" fill="none" stroke="$" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="$" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  flow: RV('<path d="M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4" fill="none" stroke="$" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  goal: RV('<circle cx="12" cy="12" r="10" fill="none" stroke="$" stroke-width="2"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="$"/>'),
  assist: RV('<circle cx="12" cy="12" r="9" fill="none" stroke="$" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="$" stroke-width="2"/><circle cx="12" cy="12" r="1.5" fill="$"/>'),
  chip: RV('<rect x="6" y="6" width="12" height="12" rx="2.5" fill="none" stroke="$" stroke-width="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" stroke="$" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="$"/>'),
  check: RV('<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="$" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  swap: RV('<path d="M4 9h14M14 5l4 4-4 4M20 16H6M10 12l-4 4 4 4" fill="none" stroke="$" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  me: RV('<circle cx="12" cy="8" r="4" fill="$"/><path d="M4 21c0-5 4-8 8-8s8 3 8 8z" fill="$"/>'),
};
const rvIcon = (k, c, s) => (REVIEW_ICON[k] ?? REVIEW_ICON.team)(c, s);
function shapeDiagram(model, w = 600, h = 250) {
  const cols = [['GK', 0.1], ['DEF', 0.33], ['MID', 0.58], ['FWD', 0.84]], rad = 20;
  const LATS = { 1: [.5], 2: [.34, .66], 5: [.09, .29, .5, .71, .91] };
  let out = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="22" fill="#10301f"/><rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="20" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/><line x1="${w / 2}" y1="6" x2="${w / 2}" y2="${h - 6}" stroke="rgba(255,255,255,.16)" stroke-width="2"/><circle cx="${w / 2}" cy="${h / 2}" r="${h * 0.16}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="2"/>`;
  for (const [g, fx] of cols) {
    const ps = model.shape.players.filter((p) => p.g === g).sort((a, b) => b.r - a.r);
    const lat = LATS[ps.length] ?? ps.map((_, j) => .1 + .8 * j / Math.max(1, ps.length - 1));
    ps.forEach((_, j) => { const x = w * fx + (ps.length >= 5 ? (j % 2 ? 0.032 : -0.032) * w : 0), y = h * (0.12 + 0.76 * lat[j]); out += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#0b0f16" stroke="#9fb0cf" stroke-width="3.5"/>`; });
    out += `<text x="${w * fx}" y="${h - 10}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="19" letter-spacing="3" fill="rgba(255,255,255,.7)">${g} ${ps.length}</text>`;
  }
  if (model.shape.ai > 0) out += `<circle cx="${w * 0.955}" cy="${h * 0.5}" r="25" fill="none" stroke="#9fb0cf" stroke-width="3" stroke-dasharray="7 6"/><text x="${w * 0.955}" y="${h * 0.5 + 8}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="22" fill="#9fb0cf">AI</text>`;
  return `${out}</svg>`;
}
export function reviewCard(model, club) {
  const head = (icon, t) => `<div class="sh"><span class="si">${rvIcon(icon, '#fff', 26)}</span><b class="osw">${esc(t)}</b></div>`;
  const row = (r, label) => `<div class="rw"><span class="ri">${rvIcon(r.icon, '#fff', 26)}</span><div><b>${esc(r.lead ?? r.t)}</b><p>${label ? `<i>${label}</i>` : ''}${esc(r.text ?? r.tr)}</p>${r.why ? `<p class="wy">${esc(r.why)}</p>` : ''}</div></div>`;
  const ring = (t) => { const frac = t.lower ? Math.min(1, t.b / Math.max(1, t.a)) : Math.min(1, t.a / Math.max(1, t.b)); return `<svg viewBox="0 0 100 100" width="88" height="88"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="11"/><circle cx="50" cy="50" r="40" fill="none" stroke="#e0493f" stroke-width="11" stroke-linecap="round" stroke-dasharray="${frac * 251.3} 251.3" transform="rotate(-90 50 50)"/><text x="50" y="61" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="29" fill="#fff">${t.a}${t.u}</text></svg>`; };
  const next = model.next.map((t) => `<div class="nx">${ring(t)}<span>${esc(t.k)}</span><b class="osw">${t.lower ? 'Under' : 'Target'} ${t.b}${t.u}</b></div>`).join('');
  const sh = model.shape;
  return page(`
body:before{background:radial-gradient(900px 340px at 50% -12%,rgba(200,53,44,.26),transparent 65%),linear-gradient(180deg,#0d121b,#080b11)}
.top{padding:26px 40px 6px;border-top:8px solid var(--red)}.top .eyebrow{font-size:19px;display:block}
.big{font:700 70px/1.05 Oswald;letter-spacing:.03em;margin-top:4px;display:block;text-transform:uppercase}
.sub{font:600 25px/1.3 Inter;color:var(--soft);margin-top:2px}
.sec{margin:22px 40px 0}.two{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin:0 40px}.two .sec{margin:22px 0 0}
.sh{display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--line);padding-bottom:9px;margin-bottom:4px}.sh b{font:600 31px/1 Oswald;letter-spacing:.08em}.si{display:inline-flex;width:40px;height:40px;border-radius:11px;background:var(--red);align-items:center;justify-content:center}
.lu{display:grid;grid-template-columns:600px 1fr;gap:28px;align-items:center;margin-top:12px}.lf{display:grid;gap:4px}.lf b{font:700 76px/1 Oswald;letter-spacing:.04em}.lf span{font:700 26px/1.2 Inter;color:#e1e8f5}.lf em{font:500 21px/1.3 Inter;color:var(--mute);font-style:normal;margin-top:6px}
.rw{display:grid;grid-template-columns:46px 1fr;gap:14px;padding:11px 0;border-bottom:1px solid var(--line);align-items:start}.rw:last-child{border-bottom:0}
.ri{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.07);border:1px solid var(--line);display:grid;place-items:center}
.rw b{font:800 25px/1.2 Inter;color:#fff;display:block}.rw p{font:500 22px/1.3 Inter;color:#cfd8e8;margin-top:3px}.rw p.wy{font-size:20px;color:var(--mute)}.rw i{font:800 17px Inter;letter-spacing:.16em;text-transform:uppercase;font-style:normal;color:var(--red2);margin-right:10px}
.nxh{margin-top:18px}.nxs{display:grid;grid-template-columns:repeat(3,1fr);margin-top:10px}.nx{display:grid;justify-items:center;gap:2px;text-align:center}.nx span{font:700 20px Inter;color:#cfd8e8}.nx b{font:600 24px/1 Oswald;letter-spacing:.04em}
.last{padding-bottom:34px}.rg{display:grid;grid-template-columns:1fr 1fr;gap:0 36px}`,
  `<div class="top"><div class="eyebrow">${esc(club?.name ?? 'NOREX UNITED')} · Match review · vs ${esc(model.opp)}</div><div class="big">${esc(model.title)}</div><div class="sub">${esc(model.sub)}</div></div>
<div class="sec">${head('me', 'How we lined up')}<div class="lu"><div>${shapeDiagram(model)}</div><div class="lf"><b class="osw">${esc(sh.label)}</b><span>${sh.humans} player${sh.humans === 1 ? '' : 's'}${sh.ai ? ` and ${sh.ai} AI slot${sh.ai === 1 ? '' : 's'}` : ''}</span><em>Shape from where the players lined up. EA does not record which slot the AI took.</em></div></div></div>
<div class="two">
  <div class="sec">${head('check', 'What went well')}${model.good.map((g) => row(g)).join('')}</div>
  <div class="sec">${head('assist', 'What to work on')}${model.work.map((g) => row(g)).join('')}${next ? `<div class="nxh">${head('goal', 'Next match')}<div class="nxs">${next}</div></div>` : ''}</div>
</div>
${model.recs.length ? `<div class="sec last">${head('swap', 'Recommendations for the squad')}<div class="rg">${model.recs.map((r) => row(r, 'Try')).join('')}</div></div>` : '<div style="height:34px"></div>'}`);
}


// ---------- merged match picture (message 1 of a result): scoreboard → goals and assists + man of the match → stats → rating by line → field view ----------
// Model from scripts/lib/matchpicture.mjs. faces: Map(EA player key → data URI); anyone without one gets a drawn avatar. Gold is for the
// man of the match only (the one special callout); everything else is the plain palette.
const MEDAL = (c = '#efcf7a', s = 40) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M6.5 1.5h4l2 6.5-3 .6zM17.5 1.5h-4l-2 6.5 3 .6z" fill="${c}" opacity=".6"/><circle cx="12" cy="15.2" r="7" fill="${c}"/><circle cx="12" cy="15.2" r="4.6" fill="none" stroke="#0b0f16" stroke-opacity=".45" stroke-width="1.4"/><path d="M12 11.8l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z" fill="#0b0f16" fill-opacity=".5"/></svg>`;
const initials = (name) => String(name ?? '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || '?';
const avatar = (p, faces, size, ring = null, ringW = 0) => {
  const src = faces?.get(String(p.k));
  const shadow = ring ? `box-shadow:0 0 0 ${ringW}px ${ring},0 10px 24px rgba(0,0,0,.55)` : 'box-shadow:0 8px 20px rgba(0,0,0,.5)';
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex:none;${shadow};background:linear-gradient(160deg,#3a4c72,#101827)">${src
    ? `<img src="${src}" width="${size}" height="${size}" style="display:block;object-fit:cover">`
    : `<span style="display:grid;place-items:center;width:100%;height:100%;font:700 ${Math.round(size * 0.4)}px Oswald;letter-spacing:.04em;color:#cfd8e8;text-transform:uppercase">${esc(initials(p.n))}</span>`}</span>`;
};
const GENERIC_BUST = (h = 200) => `<svg viewBox="0 0 200 232" width="${Math.round(h * 0.86)}" height="${h}" style="display:block"><defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a8aa6"/><stop offset="1" stop-color="#4a5973"/></linearGradient></defs><path d="M4 232c0-46 38-70 96-70s96 24 96 70z" fill="url(#gb)"/><ellipse cx="100" cy="86" rx="42" ry="50" fill="url(#gb)"/><rect x="82" y="124" width="36" height="44" rx="14" fill="url(#gb)"/></svg>`;
export function matchPicture(mp, club, faces = new Map()) {
  const TONE = { good: '#4be08a', even: '#efcf7a', bad: '#ff7d72' };
  const donut = (frac, color, label, size = 124) => `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="11"/><circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${Math.max(0.02, Math.min(1, frac)) * 251.3} 251.3" transform="rotate(-90 50 50)"/><text x="50" y="61" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="29" fill="#fff">${label}</text></svg>`;
  const row = (r) => {
    const d = r.a - r.b, tol = r.tol ?? 0, tone = Math.abs(d) <= tol ? 'even' : d > 0 ? 'good' : 'bad';
    const frac = (v) => (r.kind === 'pct' ? v / 100 : r.kind === 'rate' ? v / 10 : v / ((r.a + r.b) || 1));
    const lab = (v) => (r.kind === 'pct' ? `${v}%` : r.kind === 'rate' ? v.toFixed(1) : `${v}`);
    const sign = d > 0 ? '+' : d < 0 ? '−' : '';
    const delta = r.kind === 'pct' ? `${sign}${Math.abs(d)} pts` : r.kind === 'rate' ? `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}` : `${sign}${Math.abs(d)}`;
    return `<div class="sr"><div class="dc">${donut(frac(r.a), TONE[tone], lab(r.a))}</div><div class="sm"><span>${r.k}</span><b class="chipd ${tone}">${tone === 'even' ? 'Level' : delta}</b></div><div class="dc">${donut(frac(r.b), '#6b7da0', lab(r.b))}</div></div>`;
  };
  const crow = (p) => `<div class="cr"><b class="osw">${esc(String(p.n).length > 14 ? `${String(p.n).slice(0, 13)}…` : p.n)}</b><span class="ic">${REVIEW_ICON.goal('#e0493f', 32).repeat(p.g)}${REVIEW_ICON.assist('#efcf7a', 32).repeat(p.a)}</span></div>`;
  const contrib = mp.contrib.slice(0, 6);
  const motm = mp.motm;
  const motmCell = motm ? `<div class="mo"><div class="glow"></div><div class="bw">${faces.get(String(motm.k)) ? `<img src="${faces.get(String(motm.k))}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : GENERIC_BUST(200)}<span class="mb">${MEDAL('#efcf7a', 46)}</span></div><div class="ml"><div class="lab gold">${MEDAL('#efcf7a', 26)}<span>Man of<br>the match</span></div><div class="mt"><b class="osw" style="font-size:${Math.max(22, Math.min(34, Math.floor(165 / (String(motm.n).length * 0.47))))}px">${esc(motm.n)}</b><em class="osw gold">${r1(motm.r)}</em></div></div></div>` : '';
  const GR = [['goalkeeper', 7], ['defender', 27], ['midfielder', 52], ['forward', 79]];
  const LATS = { 1: [.5], 2: [.3, .7], 3: [.18, .5, .82], 4: [.1, .37, .63, .9], 5: [.08, .29, .5, .71, .92] };
  const slots = [];
  for (const [pos, bx] of GR) {
    const g = mp.players.filter((p) => p.pos === pos).sort((a, b) => b.r - a.r);
    const lat = LATS[g.length] ?? g.map((_, j) => .08 + .84 * j / Math.max(1, g.length - 1));
    g.forEach((p, j) => slots.push({ p, x: g.length >= 4 ? bx + (j % 2 ? 6.5 : -6.5) : bx, y: 6 + 58 * lat[j] }));
  }
  const stripes = Array.from({ length: 7 }, (_, k) => `<rect x="${7.5 + 15 * k}" width="7.5" height="68" fill="#17603a"/>`).join('');
  const marks = slots.map(({ p, x, y }) => {
    const b = band(p.r, p.mom), c = BAND[b], big = b === 'gold', sz = big ? 92 : 76;
    const ev = (p.g ? `<span class="ev">${REVIEW_ICON.goal('#0b0f16', 22)}${p.g > 1 ? `<small>×${p.g}</small>` : ''}</span>` : '') + (p.a ? `<span class="ev as">${REVIEW_ICON.assist('#0b0f16', 22)}</span>` : '');
    return `<div class="pl" style="left:${(x / 105) * 100}%;top:${(y / 68) * 100}%"><div class="fw">${avatar(p, faces, sz, c, big ? 7 : 5)}<span class="rt ${big ? 'g' : ''}" style="${big ? '' : `border-color:${c};color:${c}`}">${r1(p.r)}</span>${ev ? `<span class="evs">${ev}</span>` : ''}${big ? `<span class="crown">${MEDAL('#2d1f06', 30)}</span>` : ''}</div><div class="nm ${big ? 'g' : ''}">${esc(String(p.n).length > 13 ? `${String(p.n).slice(0, 12)}…` : p.n)}</div></div>`;
  }).join('');
  const ring = `<svg viewBox="0 0 120 120" width="112" height="112"><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="#efcf7a" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(mp.avg / 10) * 314} 314" transform="rotate(-90 60 60)"/><text x="60" y="73" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="36" fill="#fff">${r1(mp.avg)}</text></svg>`;
  const opp = String(mp.opp);
  return page(`
body:before{background:radial-gradient(900px 420px at 82% -10%,rgba(200,53,44,.3),transparent 65%),linear-gradient(180deg,#0d121b,#080b11)}
.lab{font:700 18px Inter;letter-spacing:.22em;text-transform:uppercase;color:var(--soft)}
.sb{padding:30px 40px 0;text-align:center;position:relative}.sb .eyebrow{font-size:20px}
.srow{display:grid;grid-template-columns:1fr 420px 1fr;align-items:center;margin-top:14px}
.team{display:grid;justify-items:center;gap:6px}.team b{font:600 40px/1.1 Oswald;letter-spacing:.06em;text-transform:uppercase;max-width:330px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mid b{display:block;font:700 176px/1 Oswald;text-shadow:0 10px 50px rgba(200,53,44,.6)}.mid .pill{margin-top:-6px}
.gm{display:grid;grid-template-columns:1fr 400px;gap:0;margin:20px 40px 0;border-top:2px solid rgba(255,255,255,.1);padding-top:20px;min-height:214px;align-items:stretch}
.gl{padding-right:30px;display:grid;align-content:center}.legend{display:flex;gap:24px;font:600 22px Inter;color:#b9c4d9;margin-bottom:6px}.legend span{display:inline-flex;align-items:center;gap:8px}
.cr{display:flex;justify-content:space-between;align-items:center;height:52px;border-bottom:1px solid rgba(255,255,255,.07)}.cr b{font:600 28px/1 Oswald;letter-spacing:.04em}.ic{display:inline-flex;gap:8px}
.mo{position:relative;contain:size;border-left:2px solid rgba(239,207,122,.4);padding-left:32px;display:grid;align-items:center}
.ml{display:grid;gap:14px;max-width:196px;z-index:2}.ml .lab{display:flex;align-items:center;gap:10px;font-size:19px;line-height:1.25;letter-spacing:.13em;white-space:nowrap}.ml .lab svg{flex:none}
.mt{display:grid;gap:0;text-align:left}.mt b{font:600 34px/1.05 Oswald;letter-spacing:.04em;white-space:nowrap}.mt em{font:700 60px/1.05 Oswald;font-style:normal}
.bw{position:absolute;right:30px;top:50%;height:70%;max-height:168px;aspect-ratio:200/232;line-height:0;z-index:1;transform:translateY(-50%)}.bw svg{width:100%;height:100%}
.mb{position:absolute;left:-14px;bottom:6px;line-height:0;filter:drop-shadow(0 4px 10px rgba(0,0,0,.55))}
.glow{position:absolute;right:-30px;top:-10px;bottom:-30px;aspect-ratio:1;background:radial-gradient(closest-side,rgba(239,207,122,.13),rgba(239,207,122,.05) 55%,rgba(239,207,122,0));z-index:0}
.st{margin:18px 40px 0;border-top:2px solid rgba(255,255,255,.1)}
.sr,.sh{display:grid;grid-template-columns:340px 1fr 340px;align-items:center}.sr{height:132px;border-bottom:1px solid rgba(255,255,255,.07)}
.dc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}.dc svg{display:block}
.sh{height:84px}.sh .dc{flex-direction:row;gap:14px}.sh .lab{font-size:26px;color:#e1e8f5}
.sm{text-align:center;display:grid;justify-items:center;gap:10px}.sm span{font:700 25px Inter;letter-spacing:.14em;text-transform:uppercase;color:#e1e8f5}
.chipd{font:700 26px/1 Oswald;letter-spacing:.06em;padding:6px 16px 4px;border-radius:999px;border:2px solid}
.chipd.good{color:#4be08a;background:rgba(75,224,138,.12);border-color:rgba(75,224,138,.45)}.chipd.even{color:#efcf7a;background:rgba(239,207,122,.12);border-color:rgba(239,207,122,.45)}.chipd.bad{color:#ff7d72;background:rgba(255,125,114,.12);border-color:rgba(255,125,114,.45)}
.key{display:flex;gap:30px;justify-content:center;padding:12px 0 2px;font:600 22px Inter;color:#b9c4d9}.key i{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:9px}
.ln4{display:grid;grid-template-columns:repeat(${Math.max(1, mp.lines.length)},1fr);gap:20px;margin:10px 40px 0;padding:16px 0 50px;border-top:2px solid rgba(255,255,255,.1);position:relative}
.ln{display:grid;justify-items:center;gap:6px;grid-template-rows:auto 48px auto}.ln b{font:700 32px/1 Oswald}.lb{display:flex;align-items:flex-end;width:52px;height:48px;border-radius:10px;background:rgba(255,255,255,.06)}.lb i{display:block;width:100%;border-radius:10px}.ln .lab{font-size:21px;color:#e1e8f5}
.cap{position:absolute;left:0;right:0;bottom:16px;text-align:center;font-size:19px}
.fv{padding:0 40px}.pitch{position:relative;width:1120px;height:725px;border-radius:24px;overflow:hidden;box-shadow:0 0 0 2px rgba(255,255,255,.08)}
.pl{position:absolute;transform:translate(-50%,-44%);display:grid;justify-items:center}
.fw{position:relative}.rt{position:absolute;left:50%;bottom:-18px;transform:translateX(-50%);font:700 28px/1 Oswald;background:#0b0f16;border:3px solid;border-radius:999px;padding:3px 12px 2px;white-space:nowrap}
.rt.g{background:var(--gold);color:#2d1f06;border-color:#fff1c2;font-size:34px}
.nm{margin-top:24px;font:700 25px Inter;color:#fff;text-shadow:0 0 6px #0b0f16,0 0 3px #0b0f16,0 2px 6px #0b0f16;white-space:nowrap}.nm.g{color:#fff1c2;font-size:27px}
.evs{position:absolute;left:-14px;top:-8px;display:flex;flex-direction:column;gap:4px}
.ev{display:flex;align-items:center;background:#fff;border-radius:999px;padding:4px 7px;box-shadow:0 3px 10px rgba(0,0,0,.5);font:700 18px Oswald;gap:2px}.ev small{font-size:18px;color:#0b0f16}.ev.as{background:#efcf7a}
.crown{position:absolute;right:-12px;top:-14px;width:46px;height:46px;border-radius:50%;background:var(--gold);display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.55)}
.hud{position:absolute;display:flex;align-items:center;gap:14px}.hud.l{left:26px;top:22px}.hud.r{right:26px;top:16px;flex-direction:column;gap:2px}
.eb{font:800 21px Inter;letter-spacing:.3em;text-transform:uppercase;color:#ffffffb8;text-shadow:0 2px 6px #0b0f16}
.fkey{display:flex;gap:28px;justify-content:center;flex-wrap:wrap;padding:18px 0 34px;font:600 22px Inter;color:#b9c4d9}.fkey i{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:9px}`,
  `<div class="sb">
  <div class="eyebrow">${esc(club?.name ?? 'NOREX UNITED')} · ${mp.mode} · ${esc(when(mp.ts))}</div>
  <div class="srow">
    <div class="team">${crest(club?.crest, club?.name ?? 'NOREX', 150, true)}<b class="osw">${esc(String(club?.name ?? 'Norex United').replace(/\s+FC$/i, ''))}</b></div>
    <div class="mid"><b class="osw">${mp.gf}–${mp.ga}</b><span class="pill ${mp.res}">${RESULT[mp.res] ?? ''}</span></div>
    <div class="team">${crest(mp.oppCrest, opp, 150, false)}<b class="osw">${esc(opp)}</b></div>
  </div>
</div>
<div class="gm">
  <div class="gl"><div class="legend"><span>${REVIEW_ICON.goal('#e0493f', 30)}Goal</span><span>${REVIEW_ICON.assist('#efcf7a', 30)}Assist</span></div>${contrib.length ? contrib.map(crow).join('') : '<div class="cr"><b class="osw">No goals for us</b></div>'}</div>
  ${motmCell}
</div>
<div class="st">
  <div class="sh"><div class="dc">${crest(club?.crest, club?.name ?? 'NOREX', 54, true)}<span class="lab">Norex</span></div><div class="sm"></div><div class="dc">${crest(mp.oppCrest, opp, 54, false)}<span class="lab">${esc(opp.length > 12 ? `${opp.slice(0, 11)}…` : opp)}</span></div></div>
  ${mp.rows.map(row).join('')}
  <div class="key"><span><i style="background:#4be08a"></i>Ahead</span><span><i style="background:#efcf7a"></i>Level</span><span><i style="background:#ff7d72"></i>Behind</span></div>
</div>
<div class="ln4">${mp.lines.map((l) => { const c = BAND[band(l.r)]; return `<div class="ln"><b class="osw" style="color:${c}">${r1(l.r)}</b><div class="lb"><i style="height:${Math.max(20, Math.min(100, Math.round(((l.r - 6) / 2) * 100)))}%;background:${c}"></i></div><span class="lab">${l.t}</span></div>`; }).join('')}<span class="lab cap">Rating by line</span></div>
<div class="fv"><div class="pitch"><svg viewBox="0 0 105 68" style="position:absolute;inset:0;width:100%;height:100%"><defs><radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs>
<rect width="105" height="68" fill="#14502e"/>${stripes}<g fill="none" stroke="#ffffffb0" stroke-width=".3"><rect x="1" y="1" width="103" height="66"/><line x1="52.5" y1="1" x2="52.5" y2="67"/><circle cx="52.5" cy="34" r="9.15"/><rect x="1" y="13.84" width="16.5" height="40.32"/><rect x="1" y="24.84" width="5.5" height="18.32"/><rect x="87.5" y="13.84" width="16.5" height="40.32"/><rect x="98.5" y="24.84" width="5.5" height="18.32"/></g><rect width="105" height="68" fill="url(#vig)"/></svg>
<div class="hud l"><span class="eb">Field view</span></div><div class="hud r">${ring}<span class="eb">Team rating</span></div>${marks}</div>
<div class="fkey"><span><i style="background:#efcf7a"></i>Man of the match</span><span><i style="background:#4be08a"></i>7 and up</span><span><i style="background:#ff9f43"></i>6 to 6.9</span><span><i style="background:#ff7d72"></i>Under 6</span></div></div>`);
}

// ---------- what gets drawn, and the manifest the bot reads ----------
const hash = (x) => crypto.createHash('sha1').update(JSON.stringify([TEMPLATE_VERSION, x])).digest('hex').slice(0, 10);

// ---------- banners (fixed pictures for the fun, discovery and match-night messages) ----------
// The bot can't draw a picture per member on the fly, so these are drawn once at build time: a wide banner that sets the
// scene, with the names, reasons and times left to the message text. Stable file names (the ?v= in the URL busts Discord's cache).
const BANNER_CSS = 'body{height:300px}.bn{position:absolute;inset:0;display:flex;align-items:center;gap:56px;padding:0 76px}.bn h1{font:700 104px/.95 Oswald;text-transform:uppercase;letter-spacing:.03em;text-shadow:0 8px 40px rgba(200,53,44,.55)}.bn p{margin-top:16px;font:600 26px Inter;letter-spacing:.22em;text-transform:uppercase;color:var(--soft)}.art{flex:none}';
export const BANNERS = {
  jail: () => page(`${BANNER_CSS}.bars{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 78px,rgba(255,255,255,.07) 78px 90px)}`,
    `<div class="bars"></div><div class="bn"><svg class="art" width="170" height="170" viewBox="0 0 40 40"><rect x="4" y="3" width="32" height="34" rx="3" fill="#0b0f16" stroke="#efcf7a" stroke-width="1.6"/><g stroke="#efcf7a" stroke-width="1.6"><path d="M12 3v34M20 3v34M28 3v34"/></g><circle cx="20" cy="20" r="3.2" fill="#c8352c" stroke="#0b0f16" stroke-width="1"/></svg>
<div><div class="eyebrow">Norex United</div><h1 class="gold">County Jail</h1><p>Just for fun · bail is one tap</p></div></div><div class="brand">NOREX UNITED</div>`),
  wheel: () => page(`${BANNER_CSS}`, `<div class="bn"><svg class="art" width="210" height="210" viewBox="-50 -50 100 100"><g transform="rotate(-20)"><circle r="44" fill="#c9993a"/><path d="M0 0L0-40A40 40 0 0 1 40 0Z" fill="#c8352c"/><path d="M0 0L40 0A40 40 0 0 1 0 40Z" fill="#1f2a3c"/><path d="M0 0L0 40A40 40 0 0 1-40 0Z" fill="#a82820"/><path d="M0 0L-40 0A40 40 0 0 1 0-40Z" fill="#2a3446"/><circle r="12" fill="#efcf7a"/></g><path d="M0-52L7-42H-7Z" fill="#fff1c2"/></svg>
<div><div class="eyebrow">Norex United</div><h1 class="gold">Spin the wheel</h1><p>Let fate pick</p></div></div><div class="brand">NOREX UNITED</div>`),
  discovery: () => page(BANNER_CSS, `<div class="bn"><svg class="art" width="170" height="170" viewBox="0 0 40 40"><circle cx="17" cy="17" r="10.5" fill="none" stroke="#efcf7a" stroke-width="2.6"/><path d="M25 25l10 10" stroke="#efcf7a" stroke-width="3.4" stroke-linecap="round"/><path d="M17 11.5l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="#c8352c"/></svg>
<div><div class="eyebrow">Norex United</div><h1 class="gold">Discovery</h1><p>Worth knowing · shared by a teammate</p></div></div><div class="brand">NOREX UNITED</div>`),
  onair: () => page(`${BANNER_CSS}.dot{width:30px;height:30px;border-radius:50%;background:#4be08a;box-shadow:0 0 0 14px rgba(75,224,138,.18),0 0 60px 12px rgba(75,224,138,.45)}.bn h1{text-shadow:0 8px 40px rgba(75,224,138,.45)}`,
    `<div class="bn"><svg class="art" width="170" height="170" viewBox="0 0 40 40"><circle cx="20" cy="20" r="5" fill="#4be08a"/><path d="M11 11a13 13 0 0 0 0 18M29 11a13 13 0 0 1 0 18M5.5 5.5a21 21 0 0 0 0 29M34.5 5.5a21 21 0 0 1 0 29" fill="none" stroke="#4be08a" stroke-width="2.4" stroke-linecap="round"/></svg>
<div><div class="eyebrow">Norex United</div><h1 style="color:#4be08a">On air</h1><p>Drop in · say hello in the chat</p></div></div><div class="brand">NOREX UNITED</div>`),
  channel: () => page(BANNER_CSS, `<div class="bn"><svg class="art" width="170" height="170" viewBox="0 0 40 40"><rect x="3" y="7" width="34" height="23" rx="3.5" fill="none" stroke="#e0493f" stroke-width="2.4"/><path d="M17 13.5v10l8.5-5z" fill="#e0493f"/><path d="M13 35h14" stroke="#e0493f" stroke-width="2.4" stroke-linecap="round"/></svg>
<div><div class="eyebrow">Norex United</div><h1>Watch</h1><p>Streams, clips and uploads</p></div></div><div class="brand">NOREX UNITED</div>`),
  matchnight: () => page(`${BANNER_CSS}.ln{position:absolute;inset:34px 60px;border:3px solid rgba(255,255,255,.14);border-radius:10px}.ln:before{content:"";position:absolute;left:50%;top:0;bottom:0;border-left:3px solid rgba(255,255,255,.14)}.ln:after{content:"";position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px;border:3px solid rgba(255,255,255,.14);border-radius:50%}`,
    `<div class="ln"></div><div class="bn" style="justify-content:center;text-align:center"><div><div class="eyebrow">Norex United</div><h1 class="gold">Match night</h1><p>Be there · tell us if you can play</p></div></div><div class="brand">NOREX UNITED</div>`),
};

// ---------- line-up pitch (Staff Dugout posts) ----------
// One empty pitch per formation – the bot can't draw per event, so the spots are drawn here at build time and the names sit in the
// message text beside it. Stable file names (lineup-<slug>.png); same pitch and markers as the field view.
export const lineupSlug = (f) => String(f).toLowerCase().replace(/[^0-9a-z]+/g, '-').replace(/^-|-$/g, '');
export function lineupCard(formation) {
  const stripes = Array.from({ length: 7 }, (_, k) => `<rect x="${7.5 + 15 * k}" width="7.5" height="68" fill="#17603a"/>`).join('');
  const markers = (FORMATIONS[formation] ?? []).map(([slot, x, y]) => {
    const px = 6 + ((92 - y) / 80) * 90, py = 5 + (x / 100) * 58;
    return `<g><circle cx="${px}" cy="${py}" r="4" fill="#0b0f16" stroke="#e0493f" stroke-width=".6"/><text x="${px}" y="${py + 1.1}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="3" fill="#efcf7a">${esc(POS_OF(slot))}</text></g>`;
  }).join('');
  return page('body{height:777px}svg{display:block}', `<svg viewBox="0 0 105 68" width="${W}" height="777">
<defs><radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>
<rect width="105" height="68" fill="#14502e"/>${stripes}
<g fill="none" stroke="#ffffffb0" stroke-width=".3"><rect x="1" y="1" width="103" height="66"/><line x1="52.5" y1="1" x2="52.5" y2="67"/><circle cx="52.5" cy="34" r="9.15"/>
<rect x="1" y="13.84" width="16.5" height="40.32"/><rect x="1" y="24.84" width="5.5" height="18.32"/><rect x="87.5" y="13.84" width="16.5" height="40.32"/><rect x="98.5" y="24.84" width="5.5" height="18.32"/></g>
<rect width="105" height="68" fill="url(#vig)"/>
<text x="3" y="4.4" font-family="Inter" font-weight="800" font-size="1.75" letter-spacing=".45" fill="#ffffffb0">NOREX LINE-UP · ${esc(formation).toUpperCase()}</text>
<text x="102" y="4.4" text-anchor="end" font-family="Inter" font-weight="800" font-size="1.75" letter-spacing=".45" fill="#ffffffb0">ATTACKING →</text>
${markers}</svg>`);
}

// review: (matchId) → the match review model (scripts/lib/matchreview.mjs) or null; given only by the real build, for the newest few matches.
const REVIEW_MATCHES = 3;
export function cardJobs(club, players, { matches = 10, review = null, picture = null } = {}) {
  const jobs = [];
  for (const [i, m] of (club.matches ?? []).slice(0, matches).entries()) {
    const model = review && i < REVIEW_MATCHES ? review(m.id) : null;
    const pic = picture && i < REVIEW_MATCHES ? picture(m.id) : null;
    if (pic) jobs.push({ key: ['match', m.id, 'picture'], file: `picture-${m.id}-${hash([pic.model, club.name, [...pic.faces.keys()]])}.png`, html: () => matchPicture({ ...pic.model, oppCrest: m.oppCrest }, club, pic.faces) });
    if (model) jobs.push({ key: ['match', m.id, 'review'], file: `review-${m.id}-${hash([model, club.name])}.png`, html: () => reviewCard(model, club) });
    jobs.push({ key: ['match', m.id, 'score'], file: `score-${m.id}-${hash([m, club.name, club.crest])}.png`, html: () => scoreCard(m, club) });
    if (m.ps?.length) jobs.push({ key: ['match', m.id, 'field'], file: `field-${m.id}-${hash(m.ps)}.png`, html: () => fieldCard(m) });
    if (m.ps?.length) jobs.push({ key: ['match', m.id, 'box'], file: `box-${m.id}-${hash([m.ps, m.gf, m.ga, m.opp])}.png`, html: () => boxScoreCard(m, club) });
  }
  for (const p of players.filter((x) => x.home && x.s?.gp)) {
    jobs.push({ key: ['player', p.k], file: `player-${p.k}-${hash([p.n, p.pos, p.ovr, p.s, p.sc, (p.tr ?? []).slice(-10)])}.png`, html: () => playerCard(p) });
  }
  // /compare: every pair among the busiest home players (the bot can't draw on the fly, so the likely pairs are made ahead)
  const regulars = players.filter((x) => x.home && x.s?.gp).sort((a, b) => b.s.gp - a.s.gp).slice(0, COMPARE_PAIRS);
  for (let i = 0; i < regulars.length; i++) for (let j = i + 1; j < regulars.length; j++) {
    const [a, b] = [regulars[i], regulars[j]].sort((x, y) => (x.k < y.k ? -1 : 1));
    jobs.push({ key: ['compare', a.k, b.k], file: `cmp-${a.k}-${b.k}-${hash([a.n, a.pos, a.ovr, a.s, b.n, b.pos, b.ovr, b.s])}.png`, html: () => compareCard(a, b) });
  }
  for (const stat of Object.keys(TOP_STATS)) {
    const rows = topRows(players, stat).map(([p, v]) => [p.n, p.pos, p.s, v]);
    jobs.push({ key: ['top', stat], file: `top-${stat}-${hash([rows, club.name])}.png`, html: () => tableCard(players, stat, club) });
  }
  for (const f of Object.keys(FORMATIONS)) jobs.push({ key: ['lineup', f], file: `lineup-${lineupSlug(f)}.png`, html: () => lineupCard(f) });
  for (const [name, html] of Object.entries(BANNERS)) jobs.push({ key: ['banner', name], file: `banner-${name}.png`, html });
  jobs.push({ key: ['club'], file: `club-${hash([club.name, club.crest, club.division, club.gp, club.w, club.d, club.l, club.gf, club.ga, club.form])}.png`, html: () => clubCard(club) });
  jobs.push({ key: ['results'], file: `results-${hash((club.matches ?? []).slice(0, 8))}.png`, html: () => resultsCard(club) });
  return jobs;
}
const setIn = (o, key, v) => { let x = o; key.slice(0, -1).forEach((k) => (x = x[k] ??= {})); x[key.at(-1)] = v; };

// Crests are fetched once and inlined, so a slow image host can't stall Chrome; a crest that fails falls back to the shield.
async function inlineCrests(club, siteDir) {
  const cache = new Map();
  const local = (url) => {
    const rel = club.url && url?.startsWith(club.url) ? url.slice(club.url.length) : null;
    const f = rel && path.join(siteDir, rel);
    return f && fs.existsSync(f) ? `data:image/png;base64,${fs.readFileSync(f).toString('base64')}` : null;
  };
  const get = async (url) => {
    if (!url) return url;
    if (!cache.has(url)) {
      cache.set(url, local(url) ?? await fetch(url, { signal: AbortSignal.timeout(5000) })
        .then(async (r) => (r.ok ? `data:${r.headers.get('content-type') || 'image/png'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}` : null))
        .catch(() => null));
    }
    return cache.get(url);
  };
  // Our own crest: the published URL, else the file in the site folder, else the drawn shield (never a broken picture).
  const ownFile = ['assets/crest.png', 'crest.png'].map((f) => path.join(siteDir, f)).find((f) => fs.existsSync(f));
  club.crest = await get(club.crest) ?? (ownFile ? `data:image/png;base64,${fs.readFileSync(ownFile).toString('base64')}` : null);
  for (const m of club.matches ?? []) m.oppCrest = await get(m.oppCrest);
}

async function main() {
  const siteDir = path.join(ROOT, 'site');
  const read = (f) => JSON.parse(fs.readFileSync(path.join(siteDir, 'api', f), 'utf8'));
  const club = read('club.json'), players = read('players.json');
  const outDir = path.join(siteDir, 'cards');
  fs.mkdirSync(outDir, { recursive: true });
  const publicClub = { ...club }; // the manifest keeps real URLs; only the drawn copy gets inlined crests
  const drawClub = structuredClone(club);
  await inlineCrests(drawClub, siteDir);
  const config = loadConfig(), homeId = String(config.homeClubId), hide = new Set((config.hiddenPlayers ?? []).map((h) => String(h).toLowerCase()));
  const rawDir = path.join(ROOT, 'data/matches');
  const review = (id) => {
    const f = path.join(rawDir, `${id}.json`);
    if (!fs.existsSync(f)) return null;
    try { const raw = JSON.parse(fs.readFileSync(f, 'utf8')); return buildReview(raw, homeId, { history: loadHistory(rawDir, homeId, +raw.timestamp), hide }); } catch { return null; }
  };
  // The merged match picture: faces come from the Worker once for the newest matches, then every picture reads them from memory.
  const rawOf = (id) => { try { return JSON.parse(fs.readFileSync(path.join(rawDir, `${id}.json`), 'utf8')); } catch { return null; } };
  const models = new Map(drawClub.matches.slice(0, REVIEW_MATCHES).map((cm) => [cm.id, rawOf(cm.id)]).filter(([, raw]) => raw).map(([id, raw]) => [id, buildMatchPicture(raw, homeId, { hide })]).filter(([, mp]) => mp));
  const faces = await fetchPlayerFaces(config, [...models.values()].flatMap((mp) => mp.players.map((p) => p.k)));
  const picture = (id) => (models.has(id) ? { model: models.get(id), faces: new Map([...faces].filter(([k]) => models.get(id).players.some((p) => p.k === k))) } : null);
  const jobs = cardJobs(drawClub, players, { review, picture });
  const { launchChrome } = await import('./lib/chrome.mjs');
  const chrome = await launchChrome();
  const manifest = { v: TEMPLATE_VERSION, at: Date.now(), base: `${(publicClub.url || '').replace(/\/?$/, '/')}cards/` };
  const t0 = Date.now();
  let drawn = 0;
  try {
    for (const j of jobs) {
      const html = j.html();
      if (process.argv.includes('--html')) fs.writeFileSync(path.join(outDir, j.file.replace(/\.png$/, '.html')), html);
      try {
        fs.writeFileSync(path.join(outDir, j.file), await chrome.shot(html, W));
        setIn(manifest, j.key, j.file);
        drawn++;
      } catch (e) { console.log(`::warning title=Card failed::${j.file}: ${e.message}`); }
    }
  } finally { await chrome.close(); }
  fs.writeFileSync(path.join(siteDir, 'api', 'cards.json'), JSON.stringify(manifest));
  console.log(`✔ cards  ${drawn}/${jobs.length} drawn in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
