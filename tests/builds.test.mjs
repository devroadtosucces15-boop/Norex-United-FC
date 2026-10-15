// Pro Builder saved builds (PB.2 c): save / update / list / delete / fork, ownership, validation, flag gate.
import { call, env, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';

env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), builder: 'owner' });
const owner = await login('111');
const mgr = await login('600', ['mgr']);
t('flag owner-only: manager gets 404', (await call(mgr, '/api/builds')).s === 404);
t('logged out → 401', (await call(null, '/api/builds')).s === 401);
env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), builder: 'members' });
const m1 = await login('501', [], 'Ana');
const m2 = await login('502', [], 'Ben');

const code = 'a=finisher&l=30&p=3x4.5x2&ps=0&h=185&v=fc27-launch';
t('empty list', (await call(m1, '/api/builds')).d.builds.length === 0);
const s1 = await call(m1, '/api/builds', { title: 'Poacher <script>', code });
t('save → listed with archetype/level/version', s1.s === 200 && s1.d.builds.length === 1 && s1.d.builds[0].arch === 'finisher' && s1.d.builds[0].level === 30 && s1.d.builds[0].version === 'fc27-launch' && s1.d.saved);
t('XSS: title cleaned', !s1.d.builds[0].title.includes('<'));
t('bad code rejected', (await call(m1, '/api/builds', { title: 'x', code: 'a=<b>' })).s === 400);
t('no archetype rejected', (await call(m1, '/api/builds', { title: 'x', code: 'l=5&v=x' })).s === 400);
t('level out of range rejected', (await call(m1, '/api/builds', { title: 'x', code: 'a=finisher&l=999' })).s === 400);
const id = s1.d.saved;
const u1 = await call(m1, '/api/builds', { id, title: 'Poacher v2', code: code.replace('l=30', 'l=31') });
t('update own build', u1.s === 200 && u1.d.builds.length === 1 && u1.d.builds[0].title === 'Poacher v2' && u1.d.builds[0].level === 31);
t('cannot update someone else’s build', (await call(m2, '/api/builds', { id, title: 'hijack', code })).s === 403);
t('cannot open someone else’s unposted build', (await call(m2, `/api/builds/get?id=${id}`)).s === 404);
t('cannot fork an unposted build of someone else', (await call(m2, '/api/builds/fork', { id })).s === 404);
t('open own build', (await call(m1, `/api/builds/get?id=${id}`)).d.build.mine === true);
sqlite.prepare('UPDATE builds SET posted_at = 1 WHERE id = ?').run(id); // PB.3 will post builds
const g2 = await call(m2, `/api/builds/get?id=${id}`);
t('posted build is visible to others (not mine)', g2.s === 200 && g2.d.build.mine === false && g2.d.build.by.n === 'Ana');
const f = await call(m2, '/api/builds/fork', { id });
t('fork copies into my builds with the trail', f.s === 200 && f.d.builds.length === 1 && f.d.builds[0].forkedFrom === id && f.d.builds[0].title.includes('(fork)') && f.d.builds[0].code === u1.d.builds[0].code);
t('forks are separate: original unchanged', (await call(m1, '/api/builds')).d.builds[0].title === 'Poacher v2');
t('cannot delete someone else’s build', (await call(m2, '/api/builds/delete', { id })).s === 404);
const d = await call(m1, '/api/builds/delete', { id });
t('delete own build', d.s === 200 && d.d.builds.length === 0);
t('deleted build is gone for others', (await call(m2, `/api/builds/get?id=${id}`)).s === 404);
const ov = await call(owner, '/api/admin/overview');
t('saves and forks are logged', ov.d.activity.some((x) => x.type === 'build-save') && ov.d.activity.some((x) => x.type === 'build-fork'));
sqlite.prepare("UPDATE builds SET removed_at = NULL WHERE user_id = '501'").run();
for (let i = 0; i < 49; i++) sqlite.prepare("INSERT INTO builds (user_id, title, code, arch, level, at, updated_at) VALUES ('501', 't', 'a=x&l=1', 'x', 1, 1, 1)").run();
t('limit of 50 builds per member', (await call(m1, '/api/builds', { title: 'one too many', code })).s === 429);
done();
