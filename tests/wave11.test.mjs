// Wave 11 lane B: PB.6 game-rules updates (what changed, member notification, build upgrade) + PB.5 scout report visuals.
import { call, env, login, siteJson, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import { gameDiff } from '../bot/game.js';

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

done();
