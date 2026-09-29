// Wave 11 lane B: PB.6 game-rules updates (what changed, member notification, build upgrade) + PB.5 scout report visuals.
import { call, env, login, siteJson, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import { gameDiff } from '../bot/game.js';
import '../web/scout.js';

const seed = siteJson('game');
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ gameRules: 'owner', builder: 'members', notifications: 'members' });
const owner = await login('111');
const builder = await login('701', [], 'Builder Bo');
const fan = await login('702', [], 'Fan Flo');
const changes = async (from) => { const r = await W(`/api/game/changes?from=${encodeURIComponent(from)}`); return { s: r.status, d: await r.json() }; };

// ---------- PB.6 ----------
const s1 = await call(builder, '/api/builds', { title: 'Old poacher', code: `a=finisher&l=${seed.levelCap.value}&p=3x4&v=${seed.version}` });
t('build saved on the seed version', s1.s === 200 && s1.d.builds[0].version === seed.version);
const c0 = await changes(seed.version);
t('changes from the live version → current, nothing listed', c0.s === 200 && c0.d.current && c0.d.items.length === 0);
t('changes: bad version name → 400', (await changes('Bad name!')).s === 400);

const cap = seed.levelCap.value + 5;
const pub = await call(owner, '/api/game/publish', { version: 'fc27-w11', levelCap: cap, note: 'TU', changes: { apPerLevel: [3, 2], playstyles: [{ id: 'finesse', name: 'Finesse Shot', icon: '🎯', plus: true }] } });
t('publish tells members (count returned)', pub.s === 200 && pub.d.told >= 2);
const nb = (await call(builder, '/api/notify')).d;
const gb = (nb.items ?? nb.list ?? nb.notifications ?? []).find((n) => n.type === 'game');
t('builder gets a game notification with the cap change', gb && gb.title.includes(`${seed.levelCap.value} → ${cap}`) && gb.title.includes('fc27-w11'));
t('…with how many builds need upgrading + upgrade link', gb && /1 of your builds is on an older version/.test(gb.body) && gb.link === 'builder.html?upgrade=1');
t('…and the what-changed lines', gb && gb.body.includes('PlayStyles added: Finesse Shot') && gb.body.includes('Archetype points per level'));
const nf = (await call(fan, '/api/notify')).d;
const gf = (nf.items ?? nf.list ?? nf.notifications ?? []).find((n) => n.type === 'game');
t('member without builds gets the headline only', gf && !/your builds/.test(gf.body ?? '') && gf.link === 'builder.html');
t('notification type listed in settings', JSON.stringify(nf).includes('Game updates'));

const c1 = await changes(seed.version);
t('public changes since the seed: cap, AP, PlayStyles', c1.s === 200 && c1.d.from === seed.version && c1.d.to === 'fc27-w11' && c1.d.cap[1] === cap
  && c1.d.items.some((x) => x.text === `Max level ${seed.levelCap.value} → ${cap}`) && c1.d.items.some((x) => x.text.startsWith('PlayStyles added')));
t('unknown old version → unknown flag, no crash', (await changes('fc27-gone')).d.unknown === true);

const up = await call(builder, '/api/builds', { id: s1.d.saved, title: 'Old poacher', code: `a=finisher&l=${cap}&p=3x4&v=fc27-w11` });
t('upgrading a build = saving it on the live version at MAX', up.s === 200 && up.d.builds[0].version === 'fc27-w11' && up.d.builds[0].level === cap);
const quiet = await call(owner, '/api/game/publish', { version: 'fc27-w11b', levelCap: cap, notify: false });
t('publish with "tell members" off → nobody told', quiet.s === 200 && quiet.d.told === 0);
const c2 = await changes('fc27-w11');
t('same cap, no data change → empty diff', c2.s === 200 && c2.d.items.length === 0);

const A = { version: 'a', levelCap: { value: 40 }, archetypes: [{ id: 'x', name: 'X', base: {} }, { id: 'y', name: 'Y' }], attributeGroups: [{ attributes: ['Pace'] }] };
const B = { version: 'b', levelCap: { value: 40, verified: true }, archetypes: [{ id: 'x', name: 'X', base: { Pace: 60 } }, { id: 'z', name: 'Z' }], attributeGroups: [{ attributes: ['Pace', 'Agility'] }] };
const d = gameDiff(A, B).items.map((x) => x.text);
t('diff: cap confirmed, archetype added/removed/updated, attribute list', d.includes('Max level 40 confirmed by EA') && d.includes('Archetypes added: Z') && d.includes('Archetypes removed: Y') && d.includes('Archetypes updated: X') && d.some((x) => x.startsWith('Attribute list changed')));

// ---------- PB.5 (b): visuals + build check ----------
const S = globalThis.NXScout;
const row = (ts, o) => ({ ts, res: 'W', g: 0, a: 0, r: 7, motm: 0, grp: 'FWD', pass: 9, passAtt: 10, tkl: 1, tklAtt: 2, shots: 2, saves: 0, ga: 1, dri: null, match: ts, ...o });
const synth = { x: [], y: [], z: [], w: [] };
for (let s = 0; s < 6; s++) for (let i = 0; i < 2; i++) {
  const ts = 1.79e9 + s * 3 * 86400 + i * 900;
  synth.x.push(row(ts, { g: 2, shots: 3, pass: 6, passAtt: 10, r: 7 + s * 0.2, res: i ? 'L' : 'W', grp: s < 4 ? 'FWD' : 'MID' }));
  for (const k of ['y', 'z', 'w']) synth[k].push(row(ts, {}));
}
const R = S.report('x', synth, { names: { x: 'Xavi' } });
t('radar: key metrics vs squad average (1 = squad level, capped at 2, needs a squad value)', R.radar.length >= 3 && R.radar.every((a) => a.rel >= 0 && a.rel <= 2 && a.label && a.avg) && R.radar.find((a) => a.k === 'passPct')?.rel < 1 && !R.radar.some((a) => a.k === 'gpg')); // squad scores 0 → no scale for goals
t('trend: one point per session with record + rating', R.trend.length === 6 && R.trend.every((p) => p.n === 2 && p.w === 1 && p.l === 1) && R.trend.at(-1).r > R.trend[0].r);
t('position usage: groups with games + rating', R.usage.groups.FWD.n === 8 && R.usage.groups.MID.n === 4 && R.usage.groups.FWD.r != null && !Object.keys(R.usage.pos).length);
t('form calendar: one entry per match day', Object.keys(R.days).length === 6 && Object.values(R.days).every((d) => d.n === 2));
const html = S.visualsHtml(R);
t('visuals render: radar, trend, pitch, calendar – no NaN', ['sc-radar', 'sc-trend', 'sc-pitch', 'sc-cal'].every((c) => html.includes(c)) && !/NaN|undefined/.test(html));
const rushR = S.report('x', S.fromRush({ matches: [1, 2, 3, 4].map((id) => ({ id, date: '2026-09-0' + id, res: 'W', ga: 1, players: [{ k: 'x', pos: id < 4 ? 'ST' : 'CAM', g: 1, r: 7.5 }] })) }), { mode: 'rush' });
t('Rush usage keeps exact positions → pitch spots', rushR.usage.pos.ST.n === 3 && rushR.usage.pos.CAM.n === 1 && S.visualsHtml(rushR).includes('class="spot"'));

const rowsOf = (o) => Object.entries(o).map(([name, value]) => ({ name, value }));
const ev = { arch: { name: 'Boss', group: 'DEF' }, fit: [['CB', 80], ['CDM', 74]], rows: rowsOf({ 'Short Passing': 55, Vision: 61, Composure: 70, 'Ball Control': 72, Finishing: 58, Positioning: 64, 'Sprint Speed': 66 }) };
const C = S.buildCheck(R, { id: 5, title: 'Wall', position: 'CB', mode: 'league' }, ev);
t('build check: build role vs where they play', C.role[0].icon === '🧭' && /CB Boss \(defender\)/.test(C.role[0].text) && /as a forward/.test(C.role[0].text));
t('build check: strength despite a low attribute is called out', C.role.some((r) => /Goals is a strength even with Finishing at 58/.test(r.text)));
t('build tweak: weakest linked attribute, with why + target', C.tweaks[0]?.attr === 'Short Passing' && /More Short Passing \(55 in the build\)/.test(C.tweaks[0].text) && /pass accuracy is 60% vs 90%/.test(C.tweaks[0].text));
const ok = S.buildCheck(R, { title: 'Nine', position: 'ST' }, { ...ev, arch: { name: 'Finisher', group: 'FWD' }, fit: [['ST', 70], ['CF', 69]] });
t('build check: matching role → ✅', ok.role[0].icon === '✅' && /67% of your League games/.test(ok.role[0].text));
t('build check: fit better elsewhere', S.buildCheck(R, { title: 'x', position: 'CDM' }, ev).role.some((r) => /fits CB better than CDM \(80 vs 74/.test(r.text)));
t('build check: nothing without a build or data', S.buildCheck(R, null, ev) === null && S.buildCheck({ enough: false }, {}, ev) === null);

done();
