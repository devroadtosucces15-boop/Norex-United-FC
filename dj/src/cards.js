// Drawn cards in the site's style (see the bot design system): built as SVG, rendered to PNG with the site's fonts.
import { Resvg } from '@resvg/resvg-js';
const fmt = (ms) => { const t = Math.floor((ms || 0) / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

const F = (n) => new URL(`../assets/fonts/${n}`, import.meta.url).pathname;
const FONTS = ['Oswald-Bold.ttf', 'Oswald-SemiBold.ttf', 'Inter-Regular.otf', 'Inter-SemiBold.otf'].map(F);
export const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const seed = (str) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (n) => { n = Math.imul(n ^ (n >>> 15), 1 | n); n ^= n + Math.imul(n ^ (n >>> 7), 61 | n); return ((n ^ (n >>> 14)) >>> 0) / 4294967296; };

// A pill: small uppercase label in a rounded rectangle. Returns [svg, width].
function pill(x, y, label, { stroke = '#2a3446', fill = '#111722', color = '#9ba7bd' } = {}) {
  const w = Math.round(label.length * 12.6 + 32);
  return [`<g><rect x="${x}" y="${y}" width="${w}" height="40" rx="11" fill="${fill}" stroke="${stroke}"/><text x="${x + w / 2}" y="${y + 27}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="19" letter-spacing="2.2" fill="${color}">${esc(label)}</text></g>`, w];
}

/** Now-playing banner: equalizer bars, time readout, progress bar and info pills. */
export function nowPlayingCard({ title = '', pos = 0, len = 0, paused = false, live = false, source = '', volume = 80, effects = 0, listeners = 0, loop = 'off' }) {
  const W = 1200, H = 250;
  const ratio = len ? Math.min(1, Math.max(0, pos / len)) : 1;
  const bars = [];
  const base = seed(title) + Math.floor(pos / 5000) * 7919;
  for (let n = 0; n < 18; n++) {
    const h = paused ? 14 + rnd(base + n * 31) * 18 : 24 + rnd(base + n * 31) * 118;
    const x = 56 + n * 17;
    bars.push(`<rect x="${x}" y="${190 - h}" width="10" height="${h}" rx="3" fill="url(#bar)" opacity="${paused ? 0.45 : 0.55 + 0.45 * (n % 3 === 0 ? 1 : 0.8)}"/>`);
  }
  const bx = 400, bw = 760, by = 126, filled = Math.max(10, Math.round(bw * ratio));
  const status = live ? 'LIVE' : paused ? 'PAUSED' : 'NOW PLAYING';
  let px = bx; const pills = [];
  for (const [label, o] of [[source.toUpperCase() || 'LINK', { stroke: '#8a6a1c', color: '#efcf7a' }], [`VOL ${volume}%`], [`LOOP ${loop === 'track' ? 'SONG' : loop.toUpperCase()}`], [effects ? `FX ${effects}` : 'NO FX'], [`${listeners} LISTENING`]]) {
    const [svg, w] = pill(px, 182, label, o); pills.push(svg); px += w + 12;
  }
  const time = live ? 'LIVE' : fmt(pos);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1520"/><stop offset="1" stop-color="#06080c"/></linearGradient>
    <radialGradient id="glow" cx="0.18" cy="0" r="0.75"><stop offset="0" stop-color="#c8352c" stop-opacity="0.5"/><stop offset="1" stop-color="#c8352c" stop-opacity="0"/></radialGradient>
    <linearGradient id="bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#c8352c"/><stop offset="1" stop-color="#efcf7a"/></linearGradient>
    <linearGradient id="fill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8352c"/><stop offset="1" stop-color="#e0493f"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="18" fill="url(#bg)"/><rect width="${W}" height="${H}" rx="18" fill="url(#glow)"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="#ffffff" stroke-opacity="0.08"/>
  ${bars.join('')}
  <text x="${bx}" y="50" font-family="Inter" font-weight="600" font-size="20" letter-spacing="6" fill="${paused ? '#6c7890' : '#f08f87'}">${status}</text>
  <text x="${W - 40}" y="50" text-anchor="end" font-family="Oswald" font-weight="700" font-size="22" letter-spacing="5" fill="#6c7890">NOREX DJ</text>
  <text x="${bx}" y="${by - 12}" font-family="Oswald" font-weight="700" font-size="46" fill="#eef2f9">${time}<tspan font-family="Inter" font-weight="600" font-size="24" fill="#6c7890" dx="12">${live ? '' : '/ ' + fmt(len)}</tspan></text>
  <rect x="${bx}" y="${by + 10}" width="${bw}" height="10" rx="5" fill="#1f2a3c"/>
  <rect x="${bx}" y="${by + 10}" width="${filled}" height="10" rx="5" fill="url(#fill)"/>
  <circle cx="${bx + filled}" cy="${by + 15}" r="${live ? 0 : 11}" fill="#ffffff"/>
  ${pills.join('')}
</svg>`;
}
export const nowPlayingPng = (o) => png(nowPlayingCard(o), 1200);
