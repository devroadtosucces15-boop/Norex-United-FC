// Game rules & versions (PB.1): public latest version, manager portal publish/dismiss, validation, flag gate.
import { call, env, login, siteJson, W } from './mock.mjs';
import { t, done } from './lib.mjs';

const seed = siteJson('game');
const owner = await login('111');
const mgr = await login('600', ['mgr']);
const member = await login('500');
const latest = async () => (await (await W('/api/game')).json());

const g0 = await latest();
t('public GET /api/game without login → seed', g0.version === seed.version && g0.levelCap.value === seed.levelCap.value && !g0.levelCap.verified);
t('flag is owner-only: manager gets 404', (await call(mgr, '/api/game/admin')).s === 404);
const a0 = await call(owner, '/api/game/admin');
t('owner sees admin state: current + seed in history', a0.s === 200 && a0.d.current.version === seed.version && a0.d.versions.at(-1).seed);
t('pending level-cap mentions come from the updates log', Array.isArray(a0.d.pending));

const base = { version: 'fc27-tu1', levelCap: 50, verified: true, source: 'https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-x', note: 'Cap <b>raised</b>' };
t('bad version name rejected', (await call(owner, '/api/game/publish', { ...base, version: 'Bad name!' })).s === 400);
t('existing (seed) version rejected', (await call(owner, '/api/game/publish', { ...base, version: seed.version })).s === 409);
t('cap out of range rejected', (await call(owner, '/api/game/publish', { ...base, levelCap: 0 })).s === 400);
t('official without source rejected', (await call(owner, '/api/game/publish', { ...base, source: '' })).s === 400);
t('javascript: source rejected', (await call(owner, '/api/game/publish', { ...base, source: 'javascript:alert(1)' })).s === 400);
t('invalid JSON changes rejected', (await call(owner, '/api/game/publish', { ...base, changes: '{nope' })).d.error?.includes('JSON'));
t('unknown dataset field rejected', (await call(owner, '/api/game/publish', { ...base, changes: { levelCap: 99 } })).d.error?.includes('Unknown field'));
const p1 = await call(owner, '/api/game/publish', { ...base, changes: '{"apPerLevel":[2,2,3]}' });
t('publish → new live version', p1.s === 200 && p1.d.current.version === 'fc27-tu1' && p1.d.current.levelCap.value === 50 && p1.d.versions.length === 2);
const g1 = await latest();
t('MAX changes everywhere: public GET returns the new cap', g1.levelCap.value === 50 && g1.levelCap.verified && g1.basedOn === seed.version);
t('changes merged, rest kept from the previous version', JSON.stringify(g1.apPerLevel) === '[2,2,3]' && g1.archetypes.length === seed.archetypes.length);
t('XSS: note cleaned', !p1.d.versions[0].note.includes('<'));
t('duplicate version rejected', (await call(owner, '/api/game/publish', base)).s === 409);
const p2 = await call(owner, '/api/game/publish', { version: 'fc27-tu2', levelCap: 55 });
t('unverified publish keeps the previous dataset', p2.s === 200 && !p2.d.current.levelCap.verified && JSON.stringify(p2.d.current.apPerLevel) === '[2,2,3]');
const act = await call(owner, '/api/admin/overview');
t('publishing is logged in the activity feed', act.d.activity.some((x) => x.type === 'game-publish' && x.detail.includes('fc27-tu2')));

// Pending caps: dismiss + apply (uses whatever cap mentions the updates log found; fakes one if none).
const hit = a0.d.pending[0]?.id ?? 'fake#1-levelCap';
const d1 = await call(owner, '/api/game/dismiss', { id: hit });
t('dismiss removes the mention from pending', d1.s === 200 && !d1.d.pending.some((p) => p.id === hit));
const p3 = await call(owner, '/api/game/publish', { version: 'fc27-tu3', levelCap: 60, pending: 'other#2-levelCap' });
t('apply via pending records the decision', p3.s === 200 && p3.d.current.levelCap.value === 60);

// Flag opened to managers: managers may publish, members may not.
env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), gameRules: 'managers' });
t('flag managers: manager can open admin', (await call(mgr, '/api/game/admin')).s === 200);
t('member is refused (404 flag / 403 permission)', [403, 404].includes((await call(member, '/api/game/publish', base)).s));
env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), gameRules: 'members' });
t('flag members: member still 403 (can game.edit = manager)', (await call(member, '/api/game/admin')).s === 403);
t('no login → 401', (await W('/api/game/admin')).status === 401);
done();
