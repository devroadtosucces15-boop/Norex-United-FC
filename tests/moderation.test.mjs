// P8.3 Moderation & audit: unified reported-content queue, warn/mute members, role-change history.
// The generic activity log (P8.2's Activity tab, already global) doubles as the audit trail of manager actions.
import { call, env, login } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
setFlags({ feed: 'members', messages: 'members', notifications: 'members' });
const owner = await login('111', [], 'Boss');
const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('500', [], 'Player One');
const m2 = await login('501', [], 'Player Two');

// ---------- reports queue ----------
t('members cannot see the reports queue → 403', (await call(m1, '/api/admin/reports')).s === 403);
t('empty queue to start', (await call(mgr, '/api/admin/reports')).d.items.length === 0);

const post = (await call(m1, '/api/feed/post', { text: 'Anyone free for Rush tonight?', tag: 'chat' })).d.post;
await call(m2, '/api/feed/report', { id: post.id, reason: 'Off-topic spam' });

const dm = (await call(m1, '/api/chats', { kind: 'dm', user: '501' })).d.chat.id;
const msg = (await call(m1, `/api/chats/${dm}/messages`, { text: 'not nice' })).d.message;
await call(m2, `/api/chats/${dm}/messages/${msg.id}/report`, { reason: 'Rude' });

let q = (await call(mgr, '/api/admin/reports')).d.items;
t('reports queue: both sources show up, newest first', q.length === 2 && q.every((x) => ['post', 'message'].includes(x.source)));
t('reports queue: reason + author carried through', q.find((x) => x.source === 'post').reason === 'Off-topic spam' && q.find((x) => x.source === 'post').author === 'Player One');

// clearing the post report (existing /api/feed/unreport) drops it from the queue
await call(mgr, '/api/feed/unreport', { id: post.id });
q = (await call(mgr, '/api/admin/reports')).d.items;
t('reports queue: clearing a report drops it', q.length === 1 && q[0].source === 'message');

// ---------- warn / mute ----------
t('member cannot warn → 403', (await call(m1, '/api/admin/warn', { user: '501', reason: 'x' })).s === 403);
t('warn needs a reason', (await call(mgr, '/api/admin/warn', { user: '501' })).s === 400);
let r = await call(mgr, '/api/admin/warn', { user: '501', reason: 'Please keep it friendly in chat' });
t('warn recorded', r.s === 200 && r.d.warnings.length === 1 && r.d.warnings[0].by === 'Coach');
t('warning shows up on the member record', (await call(mgr, '/api/admin/overview')).d.users['501'].warnings.length === 1);

t('member cannot mute → 403', (await call(m1, '/api/admin/mute', { user: '501', hours: 1 })).s === 403);
r = await call(mgr, '/api/admin/mute', { user: '501', hours: 2 });
t('mute recorded with an expiry', r.s === 200 && r.d.mutedUntil > Date.now());
t('muted: feed post refused', (await call(m2, '/api/feed/post', { text: 'hi', tag: 'chat' })).s === 403);
t('muted: feed comment refused', (await call(m2, '/api/feed/comment', { id: post.id, text: 'hi' })).s === 403);
t('muted: chat message refused', (await call(m2, `/api/chats/${dm}/messages`, { text: 'hi' })).s === 403);
t('muted member can still read', (await call(m2, '/api/feed')).s === 200);

r = await call(mgr, '/api/admin/mute', { user: '501', hours: 0 });
t('unmute (hours: 0) clears it', r.s === 200 && r.d.mutedUntil === undefined);
t('unmuted: posting works again', (await call(m2, '/api/feed/post', { text: 'back', tag: 'chat' })).s === 200);

// ---------- role-change history ----------
await login('700', ['mgr'], 'New Manager'); // first login: member → manager, no "from" yet since it's their first role
await login('700', [], 'New Manager'); // demoted back to member
let d = await call(mgr, '/api/admin/member/700');
t('role-change history recorded on demotion', d.d.roleHistory.some((h) => h.from === 'manager' && h.to === 'member'));

done();
