// Designed trophy icons: one SVG per award, built from a shape (cup, boot, glove, star, shield, ball, crown), a rarity finish
// (bronze, silver, gold, crest red) and the award's emoji on the plate. NorexTrophy.svg({ shape, tier, icon, size }) and
// NorexTrophy.pick(title, kind) which chooses a shape from the award's wording. Pure SVG, no assets, scales to any size.
(() => {
  const FIN = { common: ['#e6a572', '#a8642f', '#6b3d18'], rare: ['#f1f4fa', '#aab4c9', '#667089'], epic: ['#ffe27a', '#f1c40f', '#a77b05'], legendary: ['#ff8a80', '#c8352c', '#7d1912'] };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let n = 0;
  const SHAPES = {
    cup: (u) => `<path d="M14 10h36v14c0 11-8 19-18 19S14 35 14 24z" fill="url(#${u}g)"/><path d="M14 14H6c0 10 4 16 11 18M50 14h8c0 10-4 16-11 18" fill="none" stroke="url(#${u}g)" stroke-width="4" stroke-linecap="round"/><path d="M28 42h8v8h-8z" fill="url(#${u}g)"/>`,
    boot: (u) => `<path d="M16 8h16v22c0 4 3 6 8 7l14 4c4 1 6 4 6 8v3H14c-3 0-5-2-5-5V18c0-5 3-10 7-10z" fill="url(#${u}g)"/><path d="M20 54v6M30 54v6M40 54v6M50 54v6" stroke="#2a2118" stroke-width="3" stroke-linecap="round"/>`,
    glove: (u) => `<path d="M18 30V14a4 4 0 018 0v10h2V8a4 4 0 018 0v16h2V12a4 4 0 018 0v22c0 10-6 18-16 18-8 0-16-6-16-14l-6-10a4 4 0 017-4z" fill="url(#${u}g)"/>`,
    star: (u) => `<path d="M32 4l8.5 17.5 19 2.7-13.8 13.5 3.3 19L32 47.6 15 56.7l3.3-19L4.5 24.2l19-2.7z" fill="url(#${u}g)"/>`,
    shield: (u) => `<path d="M32 4l22 8v18c0 14-9 24-22 30C19 54 10 44 10 30V12z" fill="url(#${u}g)"/>`,
    ball: (u) => `<circle cx="32" cy="32" r="26" fill="url(#${u}g)"/><path d="M32 18l10 7-4 12H26l-4-12zM32 18V6M42 25l12-4M38 37l8 10M26 37l-8 10M22 25L10 21" fill="none" stroke="#10151f" stroke-width="2.4" stroke-linejoin="round" opacity=".75"/>`,
    crown: (u) => `<path d="M8 46L4 16l16 14 12-22 12 22 16-14-4 30z" fill="url(#${u}g)"/>`,
  };
  const BASE_Y = { cup: 51, boot: 0, glove: 0, star: 0, shield: 0, ball: 0, crown: 46 };
  function svg(o = {}) {
    const shape = SHAPES[o.shape] ? o.shape : 'cup', f = FIN[o.tier] || FIN.epic, u = 'nt' + (++n);
    const plinth = shape === 'cup' || shape === 'crown' ? `<rect x="18" y="${shape === 'cup' ? 50 : 50}" width="28" height="7" rx="2" fill="url(#${u}p)"/><rect x="12" y="57" width="40" height="7" rx="2" fill="url(#${u}p)"/>` : `<rect x="12" y="58" width="40" height="7" rx="2" fill="url(#${u}p)"/>`;
    const cy = shape === 'cup' ? 26 : shape === 'boot' ? 38 : shape === 'crown' ? 34 : shape === 'glove' ? 34 : 32;
    const plate = o.icon ? `<circle cx="32" cy="${cy}" r="11" fill="rgba(11,15,22,.78)" stroke="${f[0]}" stroke-width="1.4"/><text x="32" y="${cy + 5}" text-anchor="middle" font-size="14">${esc(o.icon)}</text>` : '';
    const s = o.size || 64;
    return `<svg class="nt" viewBox="0 0 64 68" width="${s}" height="${Math.round(s * 68 / 64)}" role="img" aria-label="${esc(o.label || 'Trophy')}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${f[0]}"/><stop offset=".55" stop-color="${f[1]}"/><stop offset="1" stop-color="${f[2]}"/></linearGradient><linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4357"/><stop offset="1" stop-color="#171d2a"/></linearGradient></defs>${SHAPES[shape](u)}<ellipse cx="22" cy="14" rx="5" ry="2.4" fill="#fff" opacity=".35" transform="rotate(-24 22 14)"/>${plate}${plinth}</svg>`;
  }
  const RULES = [[/boot|scor|goal|striker|finish/i, 'boot'], [/keeper|glove|clean|wall|save|defen/i, 'glove'], [/captain|leader|crown|king|legend|founder/i, 'crown'], [/assist|play ?maker|creat|vision|pass/i, 'ball'], [/team|club|season|moment|history|derby|cup/i, 'shield'], [/star|motm|man of the match|rating|potm|player of/i, 'star']];
  const pick = (title, kind) => { for (const [re, sh] of RULES) if (re.test(title || '')) return sh; return kind === 'moment' ? 'shield' : 'cup'; };
  window.NorexTrophy = { svg, pick, shapes: Object.keys(SHAPES), tiers: Object.keys(FIN) };
})();
