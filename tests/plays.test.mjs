// Tactics Studio + Playbook (redesign BE1): plays as a versioned document (pieces/steps/drawings/quiz) in
// R2, assignment + learned state, quiz scored server-side.
import { call, env, login } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ tactics: 'members', notifications: 'members' });

const manager = await login('900', ['mgr'], 'Coach');
const member = await login('901', [], 'Player One');
const member2 = await login('902', [], 'Player Two');

t('flag off → 404', await (async () => { setFlags({ tactics: 'off' }); const r = await call(member, '/api/plays'); setFlags({ tactics: 'members' }); return r.s === 404; })());
t('no login → 401', (await call(null, '/api/plays')).s === 401);

t('member cannot create', (await call(member, '/api/plays', { title: 'Corner routine', category: 'set-piece' })).s === 403);
let r = await call(manager, '/api/plays', { title: 'Corner routine', category: 'set-piece' });
t('manager creates a play (draft, v1, empty doc)', r.s === 200 && r.d.published === false && r.d.version === 1 && r.d.doc.pieces.length === 0);
const id = r.d.id;

t('draft is invisible to a member', (await call(member, `/api/plays/${id}`)).s === 404);
t("member's list only shows published plays", (await call(member, '/api/plays')).d.plays.every((p) => p.published));
t("manager's list includes the draft", (await call(manager, '/api/plays')).d.plays.some((p) => p.id === id));

const doc = {
  pieces: [{ id: 'k1', team: 'us', x: 500, y: 20 }, { id: 'k2', team: 'opp', x: 500, y: 60 }],
  steps: [{ at: 0, pieces: { k1: { x: 500, y: 20 } } }],
  drawings: [{ points: [[500, 20], [480, 100]], color: '#c8352c' }],
  quiz: [{ q: 'Who takes the corner?', options: ['k1', 'k2'], answer: 0 }],
};
r = await call(manager, `/api/plays/${id}`, { doc });
t('save bumps the version and keeps the doc', r.s === 200 && r.d.version === 2 && r.d.doc.pieces.length === 2);
t('save rejects a piece off the pitch', (await call(manager, `/api/plays/${id}`, { doc: { ...doc, pieces: [{ id: 'k1', team: 'us', x: 5000, y: 20 }] } })).d.doc.pieces.length === 0);
t('save rejects an unbalanced team value', (await call(manager, `/api/plays/${id}`, { doc: { ...doc, pieces: [{ id: 'k1', team: 'ref', x: 1, y: 1 }] } })).d.doc.pieces.length === 0);

t('member still 404s before publish', (await call(member, `/api/plays/${id}`)).s === 404);
r = await call(manager, `/api/plays/${id}/publish`, { published: true, userIds: ['901'] });
t('publish + assign succeeds', r.s === 200 && r.d.published === true);

r = await call(member, `/api/plays/${id}`);
t('member sees the published play and is marked assigned', r.s === 200 && r.d.mine.assigned === true && r.d.mine.learned === false);
t("member doesn't see the quiz answers", r.d.doc.quiz[0].answer === undefined);

t('quiz: wrong answer does not mark learned', (await call(member, `/api/plays/${id}/quiz`, { answers: [1] })).d.score === 0);
t('still not learned after a wrong attempt', (await call(member, `/api/plays/${id}`)).d.mine.learned === false);
r = await call(member, `/api/plays/${id}/quiz`, { answers: [0] });
t('quiz: perfect score', r.s === 200 && r.d.score === 1 && r.d.total === 1);
t('a perfect quiz marks the play learned', (await call(member, `/api/plays/${id}`)).d.mine.learned === true);

t('a non-assigned member can still self-mark learned on a published play', (await call(member2, `/api/plays/${id}/learned`, { learned: true })).d.learned === true);
t('member cannot publish/assign/delete', (await call(member, `/api/plays/${id}/delete`, {})).s === 403);

const before = (await call(manager, `/api/plays/${id}`)).d.version;
r = await call(manager, `/api/plays/${id}/restore`, { version: 1 });
t('restore makes the empty v1 doc current again, as a new version', r.s === 200 && r.d.version === before + 1 && r.d.doc.pieces.length === 0);

r = await call(manager, `/api/plays/${id}/delete`, {});
t('manager archives the play', r.s === 200);
t('archived play is gone from both lists', !(await call(manager, '/api/plays')).d.plays.some((p) => p.id === id) && (await call(manager, `/api/plays/${id}`)).s === 404);

done();
