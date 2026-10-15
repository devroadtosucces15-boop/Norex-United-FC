// Our own icon set (bot/iconset.mjs) at runtime: the bot's uploaded emoji when it has them, a plain unicode one otherwise.
//   it('goal')  → "<:nx_goal:123>" for message text         ic('goal') → { id, name } for a button's `emoji`
import map from './emojis.gen.js';
import { GLYPHS } from './iconset.mjs';

export const it = (name) => (map[name] ? `<:${map[name].name}:${map[name].id}>` : GLYPHS[name]?.[1] ?? '');
export const ic = (name) => (map[name] ? { id: map[name].id, name: map[name].name } : GLYPHS[name]?.[1]);
export const resultIcon = (res) => it({ W: 'win', D: 'draw', L: 'loss' }[res] ?? '');
