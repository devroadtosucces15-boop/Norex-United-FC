// P6.3a messaging: DMs, group chats, unread counts, reports, owner read-all.
import { call, env, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const owner = await login('111', [], 'Boss');
const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('500', [], 'Player One');
const m2 = await login('501', [], 'Player Two');
const m3 = await login('502', [], 'Player Three');

t('chats: 404 while owner-only and I am a member', (await call(m1, '/api/chats')).s === 404);
setFlags({ messages: 'members' });
t('chats: guests refused', [401, 404].includes((await call(null, '/api/chats')).s));

// ---------- DMs ----------
t('chats: empty list to start', (await call(m1, '/api/chats')).d.chats.length === 0);
t('chats: cannot DM yourself', (await call(m1, '/api/chats', { kind: 'dm', user: '500' })).s === 400);
t('chats: cannot DM someone who does not exist', (await call(m1, '/api/chats', { kind: 'dm', user: 'ghost' })).s === 404);
let r = await call(m1, '/api/chats', { kind: 'dm', user: '501' });
const dmId = r.d.chat.id;
t('chats: DM opens with the other member as the title', r.d.chat.kind === 'dm' && r.d.chat.name === 'Player Two');
r = await call(m2, '/api/chats', { kind: 'dm', user: '500' });
t('chats: same pair reuses the DM either direction', r.d.chat.id === dmId);
t('chats: DM shows in both inboxes', (await call(m1, '/api/chats')).d.chats.length === 1 && (await call(m2, '/api/chats')).d.chats.length === 1);

// ---------- messages ----------
t('chats: outsider cannot read', (await call(m3, `/api/chats/${dmId}/messages`)).s === 404);
r = await call(m1, `/api/chats/${dmId}/messages`, { text: 'Hey, on tonight?' });
t('chats: send a message', r.d.message.text === 'Hey, on tonight?' && r.d.message.by.id === '500');
t('chats: outsider cannot post', (await call(m3, `/api/chats/${dmId}/messages`, { text: 'sneaky' })).s === 404);
t('chats: blank message refused', (await call(m1, `/api/chats/${dmId}/messages`, { text: '   ' })).s === 400);
let list = (await call(m2, '/api/chats')).d.chats;
t('chats: recipient sees 1 unread + preview', list[0].unread === 1 && list[0].last.text === 'Hey, on tonight?' && list[0].last.mine === false);
list = (await call(m1, '/api/chats')).d.chats;
t('chats: sender has 0 unread of their own message', list[0].unread === 0 && list[0].last.mine === true);
await call(m2, `/api/chats/${dmId}/read`, {});
list = (await call(m2, '/api/chats')).d.chats;
t('chats: marking read clears unread', list[0].unread === 0);
await call(m2, `/api/chats/${dmId}/messages`, { text: 'Yep, see you at 8' });
r = await call(m1, `/api/chats/${dmId}/messages`);
t('chats: thread returns both messages oldest-first', r.d.messages.length === 2 && r.d.messages[0].text === 'Hey, on tonight?' && r.d.messages[1].text === 'Yep, see you at 8');

// ---------- notifications ----------
setFlags({ messages: 'members', notifications: 'members' });
await call(m1, `/api/chats/${dmId}/messages`, { text: 'One more ping' });
const note = sqlite.prepare("SELECT * FROM notifications WHERE user_id = '501' AND type = 'message' ORDER BY id DESC").get();
t('chats: a DM notifies the other member', !!note && note.title.includes('messaged you'));

// ---------- groups ----------
r = await call(m1, '/api/chats', { kind: 'group', name: 'Rush squad', emoji: '⚡', members: ['501', '502'] });
t('chats: group needs a name', (await call(m1, '/api/chats', { kind: 'group', name: '', members: ['501'] })).s === 400);
t('chats: group needs a member', (await call(m1, '/api/chats', { kind: 'group', name: 'Solo', members: [] })).s === 400);
const groupId = r.d.chat.id;
t('chats: group created with 3 members', r.d.chat.kind === 'group' && r.d.chat.name === 'Rush squad' && r.d.chat.members.length === 3);
t('chats: unknown emoji falls back to the default', (await call(m1, '/api/chats', { kind: 'group', name: 'X', emoji: '🦄', members: ['501'] })).d.chat.emoji === '💬');
t('chats: invited members were notified', !!sqlite.prepare("SELECT 1 FROM notifications WHERE user_id = '502' AND type = 'message' AND title LIKE '%Rush squad%'").get());
r = await call(m2, `/api/chats/${groupId}/messages`, { text: 'Who is in tonight?' });
t('chats: group message shows the sender in unread previews', (await call(m3, '/api/chats')).d.chats.find((c) => c.id === groupId).unread === 1);
const ghost = await login('999', [], 'Ghost');
t('chats: outsider cannot leave a chat they are not in', (await call(ghost, `/api/chats/${groupId}/leave`, {})).s === 404);
t('chats: DMs cannot be left', (await call(m1, `/api/chats/${dmId}/leave`, {})).s === 400);
await call(m3, `/api/chats/${groupId}/leave`, {});
t('chats: leaving a group removes it from your inbox', !(await call(m3, '/api/chats')).d.chats.some((c) => c.id === groupId));
t('chats: group re-fetch confirms only 2 members left', (await call(m1, '/api/chats')).d.chats.find((c) => c.id === groupId).members.length === 2);

// ---------- reports ----------
r = await call(m2, `/api/chats/${dmId}/messages`, { text: 'rude thing' });
const rudeId = r.d.message.id;
t('chats: cannot report your own message', (await call(m2, `/api/chats/${dmId}/messages/${rudeId}/report`, { reason: 'x' })).s === 400);
t('chats: managers can call the report queue even when empty', (await call(mgr, '/api/chats/reports')).d.reports.length === 0);
t('report the message', (await call(m1, `/api/chats/${dmId}/messages/${rudeId}/report`, { reason: 'Not appropriate' })).d.ok === true);
t('chats: cannot double-report', (await call(m1, `/api/chats/${dmId}/messages/${rudeId}/report`, { reason: 'again' })).s === 409);
t('chats: members cannot see the report queue', (await call(m1, '/api/chats/reports')).s === 403);
let reports = (await call(mgr, '/api/chats/reports')).d.reports;
t('chats: managers see the reported message with context', reports.length === 1 && reports[0].text === 'rude thing' && reports[0].reported.reason === 'Not appropriate' && reports[0].chatKind === 'dm');
await call(mgr, `/api/chats/reports/${rudeId}`, { action: 'clear' });
t('chats: clearing drops it from the queue', (await call(mgr, '/api/chats/reports')).d.reports.length === 0);
r = await call(m2, `/api/chats/${dmId}/messages`, { text: 'worse thing' });
await call(m1, `/api/chats/${dmId}/messages/${r.d.message.id}/report`, { reason: 'bad' });
await call(mgr, `/api/chats/reports/${r.d.message.id}`, { action: 'remove' });
t('chats: removing takes the message out of the thread', !(await call(m1, `/api/chats/${dmId}/messages`)).d.messages.some((x) => x.id === r.d.message.id));

// ---------- owner reads everything ----------
t('chats: a manager cannot read a chat they are not in', (await call(mgr, `/api/chats/${dmId}/messages`)).s === 404);
r = await call(owner, `/api/chats/${dmId}/messages`);
t('chats: owner can read any chat, flagged read-only', r.s === 200 && r.d.readonly === true);
t('chats: owner cannot post into a chat they are not in', (await call(owner, `/api/chats/${dmId}/messages`, { text: 'butting in' })).s === 403);
t('chats: owner "all chats" listing sees every chat, not just their own', (await call(owner, '/api/chats?all=1')).d.chats.length >= 2);
t('chats: owner listing flag exposed to the client', (await call(owner, '/api/chats')).d.canReadAll === true && (await call(m1, '/api/chats')).d.canReadAll === false);

done();
