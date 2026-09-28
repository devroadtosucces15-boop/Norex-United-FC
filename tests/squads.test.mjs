// P3.5 Rush squad builder: the generator (web/squadgen.js) and the API (preferences, save / publish, re-scoring).
import { call, env, login, siteJson, sqlite } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import '../web/squadgen.js';

const G = globalThis.NXSquadGen;
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };

// ----- generator -----
t('pair score: rank weights + mutual bonus', G.pairScore({ a: ['b'], b: ['a'] }, 'a', 'b') === 2.5 && G.pairScore({ a: ['x', 'b'] }, 'a', 'b') === 0.9 && G.pairScore({}, 'a', 'b') === 0);
const fit = G.assignRoles([{ id: 1, pos: ['CB', 'CM'] }, { id: 2, pos: ['CB', 'ST'] }, { id: 3, pos: ['CM'] }, { id: 4, pos: ['GK'] }, { id: 5, pos: ['CB'] }]);
t('roles: covers DEF / MID / FWD, even if someone plays their 2nd choice', !fit.missing.length && fit.roles[2] === 'ST' && Object.values(fit.roles).filter((r) => r === 'GK').length <= 1);
t('roles: a squad without any forward says so', G.assignRoles([{ id: 1, pos: ['CB'] }, { id: 2, pos: ['CB'] }, { id: 3, pos: ['CM'] }]).missing.join() === 'FWD');
const P = (id, pos) => ({ id, n: id, pos });
const pool = [P('a', ['GK']), P('b', ['CB', 'CDM']), P('c', ['CM', 'CAM']), P('d', ['ST']), P('e', ['LW', 'ST']), P('f', ['CB']), P('g', ['CM']), P('h', ['ST', 'CAM']), P('i', ['RB', 'CB']), P('j', ['CAM', 'CM']), P('k', ['ST'])];
const prefs = { a: ['b', 'c'], b: ['a', 'c'], c: ['a', 'b'], d: ['e'], e: ['d'] };
const r = G.generate(pool, prefs);
const withA = r.squads.find((s) => s.ids.includes('a'));
t('generate: 11 players → 2 squads of 5 + 1 on the bench', r.squads.length === 2 && r.squads.every((s) => s.ids.length === 5) && r.bench.length === 1);
t('generate: a trio who picked each other plays together', ['a', 'b', 'c'].every((x) => withA.ids.includes(x)));
t('generate: every squad has DEF, MID and FWD', r.squads.every((s) => !s.missing.length));
t('generate: deterministic', JSON.stringify(G.generate(pool, prefs)) === JSON.stringify(r));
const lock = G.generate(pool, prefs, { locked: [['d', 'e', 'f', 'g', 'h']] });
t('generate: locked squads stay exactly as they were', lock.squads[0].locked && lock.squads[0].ids.join() === 'd,e,f,g,h' && lock.squads.slice(1).every((s) => !s.ids.some((x) => 'defgh'.includes(x))));
t('chemistry is 0–100', r.squads.every((s) => s.chemistry >= 0 && s.chemistry <= 100));

// ----- API -----
const owner = await login('111', [], 'Founder');
const mgr = await login('600', ['mgr'], 'Coach');
const toks = {};
const home = siteJson('players').filter((p) => p.home);
for (const [i, id] of ['700', '701', '702', '703', '704', '705'].entries()) {
  toks[id] = await login(id, [], `Rush ${i}`);
  sqlite.prepare("INSERT OR REPLACE INTO claims (user_id, player, player_name, status, at, name) VALUES (?, ?, ?, 'approved', ?, ?)").run(id, home[i].k, home[i].n, Date.now(), `Rush ${i}`);
  await call(toks[id], '/api/profile', { rushPositions: [['GK'], ['CB', 'CDM'], ['CM'], ['ST'], ['LW', 'ST'], ['CB']][i] });
}
const plain = await login('799', [], 'No claim');
setFlags({ rushSquads: 'owner' });
t('flag: members get 404 while owner-only', (await call(toks['700'], '/api/squads')).s === 404 && (await call(owner, '/api/squads')).s === 200);
setFlags({ rushSquads: 'members' });
const s0 = (await call(toks['700'], '/api/squads')).d;
t('candidates = verified players with Rush positions', s0.candidates.length === 6 && s0.me.unlocked && !s0.canManage && !('prefsAll' in s0));
t('locked for members without a claim', (await call(plain, '/api/squads')).d.me.reason === 'claim' && (await call(plain, '/api/squads/prefs', { ids: [] })).s === 403);
t('prefs: pick up to 10, best first', (await call(toks['700'], '/api/squads/prefs', { ids: ['701', '702'] })).d.me.prefs.join() === '701,702');
await call(toks['701'], '/api/squads/prefs', { ids: ['700'] });
t('prefs: not yourself, only candidates', (await call(toks['700'], '/api/squads/prefs', { ids: ['700'] })).s === 400 && (await call(toks['700'], '/api/squads/prefs', { ids: ['799'] })).s === 400);
t('prefs are private: members never get prefsAll, managers do', !('prefsAll' in (await call(toks['702'], '/api/squads')).d) && (await call(mgr, '/api/squads')).d.prefsAll['700'].join() === '701,702');
t('members cannot save squads', (await call(toks['700'], '/api/squads/save', { squads: [{ ids: ['700'] }], bench: [] })).s === 403);
t('save rejects someone twice / a non-candidate / an oversized squad', (await call(mgr, '/api/squads/save', { squads: [{ ids: ['700', '700'] }], bench: [] })).s === 400
  && (await call(mgr, '/api/squads/save', { squads: [{ ids: ['799'] }], bench: [] })).s === 400 && (await call(mgr, '/api/squads/save', { squads: [{ ids: ['700', '701', '702', '703', '704', '705'] }], bench: [] })).s === 400);
const draft = await call(mgr, '/api/squads/save', { title: 'Friday Rush', squads: [{ ids: ['700', '701', '702', '703', '704'], chemistry: 100 }], bench: ['705'] });
const sq = draft.d.drafts[0].squads[0];
t('draft saved, chemistry re-scored on the server (client value ignored)', draft.s === 200 && sq.chemistry === G.squadScore(['700', '701', '702', '703', '704'].map((id) => draft.d.candidates.find((c) => c.id === id)), draft.d.prefsAll).chemistry && sq.chemistry !== 100);
t('drafts are hidden from members', !(await call(toks['705'], '/api/squads')).d.published);
const pub = await call(mgr, '/api/squads/save', { id: draft.d.id, title: 'Friday Rush', squads: [{ ids: ['700', '701', '702', '703', '704'] }], bench: ['705'], publish: true });
t('publish → everyone in a squad told their squad + role', pub.d.notified === 5 && (await call(toks['703'], '/api/notify')).d.items.some((n) => /Squad 1 as/.test(n.title)));
t('members see the published squads', (await call(toks['705'], '/api/squads')).d.published?.title === 'Friday Rush');
t('delete', (await call(mgr, '/api/squads/delete', { id: draft.d.id })).s === 200 && !(await call(mgr, '/api/squads')).d.published);
await tt('activity log', async () => ['squads-prefs', 'squads-save', 'squads-publish', 'squads-delete'].every((x) => sqlite.prepare('SELECT 1 FROM activity WHERE type = ?').get(x)));
done();
