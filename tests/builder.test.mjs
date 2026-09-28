// Builder sandbox (PB.2): AP maths, cap/MAX from game data, over-cap guards, masteries, share links, the built page.
import fs from 'node:fs';
import { ROOT, siteJson } from './mock.mjs';
import { t, done } from './lib.mjs';

await import('../web/build-math.js');
const M = globalThis.NXBuildMath;
const seed = siteJson('game');
const cap = seed.levelCap.value;

const ev0 = M.evaluate(seed, { arch: 'finisher', level: cap, spent: {} });
t('level cap from game data is the MAX', ev0.cap === cap && ev0.level === cap);
t('level clamped to 1…cap', M.evaluate(seed, { arch: 'finisher', level: 999, spent: {} }).level === cap && M.evaluate(seed, { arch: 'finisher', level: 0, spent: {} }).level === 1);
t('seed has no in-game numbers → preview flagged', ev0.status.preview);
t('AP total grows with level', M.apAt(seed, 1) < M.apAt(seed, 10) && M.apAt(seed, 10) < M.apAt(seed, cap));
t('face stats + OVR present', ev0.face.length === 6 && ev0.ovr > 0);
t('Finisher mastery at L10: +1 Finishing', M.evaluate(seed, { arch: 'finisher', level: 10, spent: {} }).rows.find((r) => r.name === 'Finishing').bonus === 1
  && M.evaluate(seed, { arch: 'finisher', level: 9, spent: {} }).rows.find((r) => r.name === 'Finishing').bonus === 0);

// Real-looking numbers once managers enter them.
const g = { ...seed, levelCap: { value: 10 }, apPerLevel: [5, 2], apCosts: [{ upTo: 60, cost: 1 }, { upTo: 99, cost: 3 }],
  archetypes: [{ id: 'x', name: 'X', group: 'FWD', signature: ['Finishing'], base: Object.fromEntries(M.attrsOf(seed).map((a) => [a.name, 58])) }] };
t('real data → no preview flag', !M.evaluate(g, { arch: 'x', level: 10, spent: {} }).status.preview);
t('AP at level: start + per level', M.apAt(g, 1) === 5 && M.apAt(g, 10) === 5 + 9 * 2);
t('tiered costs: 58→61 costs 1+1+3', M.costOf(g, 58, 3) === 5);
const ev = M.evaluate(g, { arch: 'x', level: 10, spent: { Finishing: 3 } });
t('used/left AP', ev.used === 5 && ev.left === 23 - 5);
t('signature attribute flagged ★', ev.rows.find((r) => r.name === 'Finishing').sig);
t('canAdd returns next cost', M.canAdd(g, ev, 'Finishing') === 3);
const broke = M.evaluate(g, { arch: 'x', level: 1, spent: { Finishing: 2 } });
t('canAdd null when out of AP', M.canAdd(g, broke, 'Finishing') === 3 && M.canAdd(g, M.evaluate(g, { arch: 'x', level: 1, spent: { Finishing: 3 } }), 'Finishing') === null);
t('canAdd null at attribute max', M.canAdd({ ...g, levelCap: { value: 200 }, apPerLevel: [999] }, M.evaluate({ ...g, apPerLevel: [999] }, { arch: 'x', level: 1, spent: { Finishing: 41 } }), 'Finishing') === null);
const fitted = M.fit(g, { arch: 'x', level: 1, spent: { Finishing: 5, Vision: 2 } });
t('lowering level trims points until it fits', M.evaluate(g, fitted).left >= 0 && M.evaluate(g, fitted).used <= M.apAt(g, 1));

// Share links
const b = { arch: 'x', level: 7, spent: { Finishing: 3, Vision: 1 } };
const back = M.decode(g, '#' + M.encode(g, b));
t('share link round-trip', back.arch === 'x' && back.level === 7 && back.spent.Finishing === 3 && back.spent.Vision === 1 && back.version === g.version);
t('share link: junk ignored, over-budget trimmed', (() => { const d = M.decode(g, 'a=x&l=1&p=zz9x5.0x999.bad'); return d && M.evaluate(g, d).left >= 0; })());
t('share link without archetype → null', M.decode(g, 'l=5') === null);

const html = fs.readFileSync(`${ROOT}site/builder.html`, 'utf8');
t('builder page built, behind the builder flag, with coming-soon fallback', html.includes('data-flag="builder"') && html.includes('bd-soon') && html.includes('assets/builder.js'));
done();
