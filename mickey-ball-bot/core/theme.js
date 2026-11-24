// Generic green / black / gold look. Everything visual comes from here.
export const theme = { green: 0x10b981, win: 0x10b981, draw: 0xd4af37, loss: 0xe5484d, gold: 0xd4af37, name: 'Mickey Ball Bot', tagline: 'Every match. Every club.' };
export const EMBLEM = { mom: '⭐', goal: '⚽', assist: '🎯', pass: '🅿️' };
export const resultColor = (r) => (r === 'W' ? theme.win : r === 'D' ? theme.draw : theme.loss);
export const resultWord = (r) => ({ W: '🟢 WIN', D: '🟡 DRAW', L: '🔴 DEFEAT' })[r] ?? '';
export const ratingDot = (r) => (r >= 8 ? '🟢' : r >= 7 ? '🟡' : r >= 6 ? '🟠' : '🔴');
