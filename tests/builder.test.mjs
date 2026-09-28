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

// (b) PlayStyles, Specializations, Facilities, Body
const gb = { ...g, slots: { playstyles: 2, plus: 1, facilities: 1 },
  playstyles: [{ id: 'finesse', name: 'Finesse Shot', plus: true }, { id: 'power', name: 'Power Shot', plus: true }, { id: 'trick', name: 'Trickster' }],
  specializations: [{ id: 'poacher', name: 'Poacher', archetypes: ['x'], bonus: { Finishing: 2 } }, { id: 'other', name: 'Other', archetypes: ['nope'], bonus: { Vision: 5 } }],
  facilities: [{ id: 'gym', name: 'Gym', bonus: { Strength: 3 } }, { id: 'track', name: 'Track', bonus: { 'Sprint Speed': 2 } }],
  body: { height: { min: 160, max: 200, def: 180 }, weight: { min: 60, max: 100, def: 75 }, heightMods: [{ from: 190, to: 200, mods: { Agility: -3, 'Heading Accuracy': 2 } }], weightMods: [] } };
const c1 = M.choices(gb, { arch: 'x', ps: ['finesse', 'power', 'trick', 'bogus'], plus: ['trick', 'power'], sp: 'other', fa: ['gym', 'track'], h: 250, w: 0 });
t('choices: slot limits, unknown ids, + only where allowed', c1.plus.join() === 'power' && c1.ps.join() === 'finesse,trick' && c1.fa.join() === 'gym');
t('choices: specialization must fit the archetype', c1.sp === null && M.choices(gb, { arch: 'x', sp: 'poacher' }).sp === 'poacher');
t('choices: body clamped / defaulted', c1.h === 200 && c1.w === 75);
const evb = M.evaluate(gb, { arch: 'x', level: 10, spent: {}, sp: 'poacher', fa: ['gym'], h: 195 });
const row = (n) => evb.rows.find((r) => r.name === n);
t('modifiers applied: spec +2, facility +3, height −3/+2', row('Finishing').mod === 2 && row('Strength').mod === 3 && row('Agility').mod === -3 && row('Heading Accuracy').mod === 2);
t('modifier sources listed for badges', row('Agility').modFrom[0][0] === 'Height' && row('Finishing').value === 58 + 2);
t('modifiers cost no AP', evb.used === 0);
t('position fit: default positions per group, sorted', evb.fit.length === 3 && evb.fit[0][1] >= evb.fit[2][1] && evb.fit.every(([p]) => ['ST', 'LW', 'RW'].includes(p)));
const bb = { arch: 'x', level: 5, spent: { Finishing: 1 }, ps: ['trick'], plus: ['power'], sp: 'poacher', fa: ['track'], h: 192, w: 81 };
const back2 = M.decode(gb, M.encode(gb, bb));
t('share link keeps PlayStyles, +, spec, facilities, body', back2.ps.join() === 'trick' && back2.plus.join() === 'power' && back2.sp === 'poacher' && back2.fa.join() === 'track' && back2.h === 192 && back2.w === 81);

const html = fs.readFileSync(`${ROOT}site/builder.html`, 'utf8');
t('builder page built, behind the builder flag, with coming-soon fallback', html.includes('data-flag="builder"') && html.includes('bd-soon') && html.includes('assets/builder.js'));
t('Builder nav link hidden behind the flag', /<a href="builder.html"[^>]*data-flag="builder" hidden>Builder<\/a>/.test(html));
const js = fs.readFileSync(`${ROOT}site/assets/builder.js`, 'utf8');
t('(c) save / my builds / compare / image / fork wired', ['data-save', 'data-mine', 'data-compare', 'data-image', 'data-fork', '/api/builds/fork'].every((k) => js.includes(k)));
done();
