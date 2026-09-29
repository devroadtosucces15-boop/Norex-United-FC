// P8.2 Member drill-down: GET /api/admin/member/:id aggregates one member's activity for the portal.
import { call, env, login } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const owner = await login('111', [], 'Boss');
const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('500', [], 'Player One');
const m2 = await login('501', [], 'Player Two');

t('member cannot drill down → 403', (await call(m1, '/api/admin/member/501')).s === 403);
t('unknown member → 404', (await call(mgr, '/api/admin/member/ghost')).s === 404);

let r = await call(mgr, '/api/admin/member/500');
t('manager can drill down', r.s === 200 && r.d.user.n === 'Player One');
t('shape: every section present as an array/object', Array.isArray(r.d.votes) && Array.isArray(r.d.ratings) && Array.isArray(r.d.availability) && Array.isArray(r.d.posts) && Array.isArray(r.d.acknowledgements) && Array.isArray(r.d.activity) && Array.isArray(r.d.messages) && (r.d.claim === null || typeof r.d.claim === 'object'));

// ---------- messages metadata vs content (P0.6 privacy tiers) ----------
setFlags({ messages: 'members' });
let dm = (await call(m1, '/api/chats', { kind: 'dm', user: '501' })).d.chat.id;
await call(m1, `/api/chats/${dm}/messages`, { text: 'secret plans' });
const msg2 = await call(m2, `/api/chats/${dm}/messages`, { text: 'reported one' });
await call(m1, `/api/chats/${dm}/messages/${msg2.d.message.id}/report`, { reason: 'spam' });

r = await call(mgr, '/api/admin/member/500');
const plain = r.d.messages.find((x) => x.text === 'secret plans');
t('manager: ordinary DM text hidden (metadata only)', r.d.messages.some((x) => x.kind === 'dm' && x.text === undefined) && !plain);

r = await call(mgr, '/api/admin/member/501');
const reported = r.d.messages.find((x) => x.reported);
t('manager: reported message text IS visible', reported?.text === 'reported one');

r = await call(owner, '/api/admin/member/500');
t('owner: sees every message body, reported or not', r.d.messages.find((x) => x.at)?.text === 'secret plans');

done();
