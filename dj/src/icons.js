// The NOREX icon set: simple glyphs in the site's palette, rendered to PNG and uploaded once as the bot's own (application) emoji.
// Buttons and messages use them instead of generic emoji. If an upload fails, the unicode fallback is used.
import fs from 'node:fs';
import path from 'node:path';
import { png } from './cards.js';

const FILE = path.join(process.env.DATA_DIR || '/app/data', 'emojis.json');
const L = '#e4ebf7', RED = '#e0493f', GOLD = '#efcf7a';
const st = (c = L, w = 2.2) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
export const GLYPH = {
  play: [`<path d="M7 4.5v15l12-7.5z" fill="${L}"/>`, '▶'],
  pause: [`<rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="${L}"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="${L}"/>`, '⏸'],
  skip: [`<path d="M5 5v14l10-7z" fill="${L}"/><rect x="16.5" y="5" width="3" height="14" rx="1" fill="${L}"/>`, '⏭'],
  stop: [`<rect x="6" y="6" width="12" height="12" rx="2.2" fill="#ff7d72"/>`, '⏹'],
  shuffle: [`<path d="M3 7h3c3 0 4 2 6 5s3 5 6 5h3M3 17h3c1.5 0 2.5-.7 3.5-2M13 8.5C14 7.5 15.5 7 17 7h4M18 4l3 3-3 3M18 14l3 3-3 3" ${st()}/>`, '🔀'],
  loop: [`<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" ${st()}/>`, '🔁'],
  loop1: [`<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" ${st(GOLD)}/><path d="M11 10.5l1.5-1v6" ${st(GOLD, 1.8)}/>`, '🔂'],
  voldown: [`<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="${L}"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" ${st()}/>`, '🔉'],
  volup: [`<path d="M3 9.5v5h3.5L11 18.5v-13L6.5 9.5z" fill="${L}"/><path d="M14.5 9a4 4 0 0 1 0 6M17 6.5a7.5 7.5 0 0 1 0 11" ${st()}/>`, '🔊'],
  spark: [`<path d="M12 2l2.2 7.3L22 12l-7.8 2.7L12 22l-2.2-7.3L2 12l7.8-2.7z" fill="${GOLD}"/>`, '🔮'],
  heart: [`<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="${RED}"/>`, '❤'],
  thumbdown: [`<path d="M10 15v4a2 2 0 0 0 2 2l4-9V3H6.5a2 2 0 0 0-2 1.7l-1.3 8A2 2 0 0 0 5.2 15zM16 3h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3" ${st()}/>`, '👎'],
  lock: [`<rect x="5" y="11" width="14" height="10" rx="2.2" fill="${GOLD}"/><path d="M8 11V8a4 4 0 0 1 8 0v3" ${st(GOLD)}/>`, '🔒'],
  unlock: [`<rect x="5" y="11" width="14" height="10" rx="2.2" fill="${L}"/><path d="M8 11V8a4 4 0 0 1 7.5-1.8" ${st(L)}/>`, '🔓'],
  pencil: [`<path d="M4 20h4L19 9l-4-4L4 16z" ${st()}/><path d="M13.5 6.5l4 4" ${st()}/>`, '📝'],
  minus: [`<path d="M5 12h14" ${st(L, 3)}/>`, '➖'],
  plus: [`<path d="M12 5v14M5 12h14" ${st(L, 3)}/>`, '➕'],
  users: [`<circle cx="9" cy="8" r="3.2" fill="${L}"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6z" fill="${L}"/><circle cx="17" cy="9" r="2.4" fill="${GOLD}"/><path d="M16 14.2c2.6-.3 5 1.7 5 4.8h-4.5" fill="${GOLD}"/>`, '👥'],
  music: [`<path d="M9 17V5l11-2v12" ${st()}/><circle cx="6.5" cy="17.5" r="3" fill="${L}"/><circle cx="17.5" cy="15.5" r="3" fill="${L}"/>`, '🎵'],
  live: [`<circle cx="12" cy="12" r="4.5" fill="${RED}"/><circle cx="12" cy="12" r="8.5" ${st(RED, 1.8)} opacity=".6"/>`, '🔴'],
  door: [`<path d="M14 3H6v18h8M10 12h11M17 8l4 4-4 4" ${st()}/>`, '🚪'],
  close: [`<path d="M6 6l12 12M18 6L6 18" ${st('#ff7d72', 3)}/>`, '✖']
};
let map = {};
try { map = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* first run */ }

export async function ensure(rest, appId) {
  try {
    const have = await rest.get(`/applications/${appId}/emojis`);
    for (const e of have.items || []) map[e.name.replace(/^nx_/, '')] = { id: e.id, name: e.name };
    for (const [name, [svg]] of Object.entries(GLYPH)) {
      if (map[name]) continue;
      const img = png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${svg}</svg>`, 128);
      const e = await rest.post(`/applications/${appId}/emojis`, { body: { name: `nx_${name}`, image: `data:image/png;base64,${img.toString('base64')}` } });
      map[name] = { id: e.id, name: e.name };
    }
    fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(map));
  } catch (e) { console.error('icons', e.message); }
}
// Emoji for a button/select: our icon when uploaded, otherwise a plain unicode one.
export const ic = (name) => map[name] ? { id: map[name].id, name: map[name].name } : GLYPH[name]?.[1];
// Inline in message text.
export const it = (name) => map[name] ? `<:${map[name].name}:${map[name].id}>` : GLYPH[name]?.[1] || '';
export const names = () => Object.keys(GLYPH);
