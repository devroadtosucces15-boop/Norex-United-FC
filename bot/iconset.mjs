// The NOREX icon set from the bot design system: small glyphs in the site's palette that replace generic emoji in every message.
// [svg (24×24 box), unicode fallback]. Drawn with strokes only, so no font is needed to turn them into PNGs.
// bot/ensure-emojis.mjs uploads them once as the bot's own (application) emoji; bot/icons.js looks them up at runtime.
const WIN = '#4be08a', DRAW = '#efcf7a', LOSS = '#ff7d72', L = '#e4ebf7', RED = '#e0493f', GOLD = '#efcf7a';
const st = (c, w = 2.4) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const tile = (bg, edge) => `<rect x="1" y="1" width="22" height="22" rx="6" fill="${bg}" stroke="${edge}" stroke-width="1.2"/>`;
const medal = (a, b) => `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect x="1" y="1" width="22" height="22" rx="6" fill="url(#g)"/>`;
export const GLYPHS = {
  win: [`${tile('#12331f', '#1d6b3d')}<path d="M5.5 7l2.6 10 3.9-7 3.9 7 2.6-10" ${st(WIN, 2.2)}/>`, '🟩'],
  draw: [`${tile('#332b12', '#6d5a1f')}<path d="M8 6.5h4a5.5 5.5 0 0 1 0 11H8z" ${st(DRAW, 2.2)}/>`, '🟨'],
  loss: [`${tile('#3a1613', '#7a2a24')}<path d="M9 6v11h7" ${st(LOSS, 2.4)}/>`, '🟥'],
  first: [`${medal('#fff1c2', '#c9993a')}<path d="M9.5 9l3-2.5V17.5" ${st('#2d1f06', 2.4)}/>`, '🥇'],
  second: [`${tile('#2a3446', '#6c7890')}<path d="M8.6 9.2a3.4 3.4 0 0 1 6.4 1.4c0 2-2 3.2-6.6 6.9h6.8" ${st('#e4ebf7', 2.2)}/>`, '🥈'],
  third: [`${tile('#c8352c', '#e0493f')}<path d="M8.5 8a3.3 3.3 0 0 1 6.2 1.2c0 1.6-1.3 2.4-3 2.6 1.8 0 3.2.9 3.2 2.6A3.6 3.6 0 0 1 8.4 16" ${st('#fff', 2.1)}/>`, '🥉'],
  motm: [`${medal('#fff1c2', '#c9993a')}<path d="M12 5l2 4.4 4.8.5-3.6 3.2 1 4.7-4.2-2.4L7.8 17.8l1-4.7L5.2 9.9 10 9.4z" fill="#2d1f06"/>`, '⭐'],
  goal: [`${tile('#c8352c', '#e0493f')}<circle cx="12" cy="12" r="6.2" ${st('#fff', 1.8)}/><path d="M12 8.3l2.6 1.9-1 3.1h-3.2l-1-3.1z" fill="#fff"/>`, '⚽'],
  assist: [`${tile('#2a3446', '#6c7890')}<path d="M5 16c3.5-6 7.5-7.5 13-7.5M14 5l4 3.5-3.5 4" ${st(L, 2)}/>`, '🎯'],
  live: [`${tile('#3a1613', '#7a2a24')}<circle cx="12" cy="12" r="4.2" fill="#ff5a4e"/><circle cx="12" cy="12" r="7.2" ${st('#ff5a4e', 1.5)} opacity=".55"/>`, '🔴'],
  music: [`${tile('#2a3446', '#6c7890')}<path d="M10 16.5V6.5l8-1.5v9.5" ${st(L, 1.9)}/><circle cx="8" cy="16.8" r="2.3" fill="${L}"/><circle cx="16" cy="14.8" r="2.3" fill="${L}"/>`, '🎵'],
};
export const NAMES = Object.keys(GLYPHS);
export const svgOf = (name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${GLYPHS[name][0]}</svg>`;
