// P6.1 social feed (a): posts, reactions, comments + replies, edit/remove, manager pin/remove, limits, notifications.
import { call, env, login, sqlite } from './mock.mjs';
import { POSTS_DAY, MAX_PINNED, EMOJI } from '../bot/feed.js';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const owner = await login('111', [], 'Boss');
const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('500', [], 'Player One');
const m2 = await login('501', [], 'Player Two');
setFlags({ notifications: 'members' });

setFlags({ feed: 'owner' });
t('feed: 404 for members while owner-only', (await call(m1, '/api/feed')).s === 404);
t('feed: owner sees it', (await call(owner, '/api/feed')).s === 200);
setFlags({ feed: 'members' });
t('feed: guests are refused', (await call(null, '/api/feed')).s === 401 || (await call(null, '/api/feed')).s === 404);

const empty = (await call(m1, '/api/feed')).d;
t('empty feed: no posts, tags + emoji + limit', empty.posts.length === 0 && empty.tags.highlight && empty.emoji.length === EMOJI.length && empty.left === POSTS_DAY && !empty.canModerate);

// ---- posting ----
t('post: needs text', (await call(m1, '/api/feed/post', { text: '  ', tag: 'chat' })).s === 400);
t('post: unknown tag refused', (await call(m1, '/api/feed/post', { text: 'hi', tag: 'spam' })).s === 400);
const p1 = (await call(m1, '/api/feed/post', { text: 'What a worldie <script>alert(1)</script>\nhttps://youtu.be/dQw4w9WgXcQ', tag: 'highlight' })).d.post;
t('post: created with author name, @username and id', p1.id && p1.by.id === '500' && p1.by.n === 'Player One' && p1.by.tag === 'u500' && p1.tag === 'highlight');
t('post: text kept as text (the client escapes it)', p1.text.includes('<script>') && !p1.text.includes('\r'));
const p2 = (await call(m2, '/api/feed/post', { text: 'Rush tonight 9pm, who is in?', tag: 'rush' })).d.post;
const p3 = (await call(m1, '/api/feed/post', { text: 'League 3-1 W', tag: 'league' })).d.post;

const all = (await call(m2, '/api/feed')).d;
t('feed: newest first', all.posts.map((p) => p.id).join() === [p3.id, p2.id, p1.id].join());
t('filter: highlights', (await call(m2, '/api/feed?f=highlight')).d.posts.map((p) => p.id).join() === String(p1.id));
t('filter: Rush', (await call(m2, '/api/feed?f=rush')).d.posts.map((p) => p.id).join() === String(p2.id));
t('filter: League', (await call(m2, '/api/feed?f=league')).d.posts.map((p) => p.id).join() === String(p3.id));
t('filter: my posts', (await call(m1, '/api/feed?f=mine')).d.posts.map((p) => p.id).join() === [p3.id, p1.id].join());

// ---- edit / delete ----
t('edit: someone else can’t', (await call(m2, '/api/feed/edit', { id: p1.id, text: 'hacked', tag: 'chat' })).s === 403);
const ed = (await call(m1, '/api/feed/edit', { id: p1.id, text: 'What a worldie ⚽', tag: 'highlight' })).d.post;
t('edit: author can, marked edited', ed.text === 'What a worldie ⚽' && ed.edited);
t('delete: someone else can’t', (await call(m2, '/api/feed/delete', { id: p3.id })).s === 403);

// ---- reactions ----
t('react: only club emoji', (await call(m2, '/api/feed/react', { id: p1.id, emoji: '💩' })).s === 400);
let r = (await call(m2, '/api/feed/react', { id: p1.id, emoji: '🔥' })).d;
t('react: adds', r.reacts['🔥'] === 1 && r.mine.includes('🔥') && r.who['🔥'][0] === 'Player Two');
await call(mgr, '/api/feed/react', { id: p1.id, emoji: '🔥' });
r = (await call(m2, '/api/feed/react', { id: p1.id, emoji: '👑' })).d;
t('react: several emoji per member, counts per emoji', r.reacts['🔥'] === 2 && r.reacts['👑'] === 1 && r.mine.length === 2);
r = (await call(m2, '/api/feed/react', { id: p1.id, emoji: '🔥' })).d;
t('react: same emoji again takes it back', r.reacts['🔥'] === 1 && !r.mine.includes('🔥'));
await call(m2, '/api/feed/react', { id: p1.id, emoji: '🔥' });
const reactNotes = sqlite.prepare("SELECT * FROM notifications WHERE user_id = '500' AND ref = ?").all(`feed-react:${p1.id}`);
t('react: one unread bell note for the author, not one per click', reactNotes.length === 1 && reactNotes[0].link === `feed.html#p${p1.id}`);
await call(m1, '/api/feed/react', { id: p1.id, emoji: '😂' });
t('react: own post → no note', sqlite.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = '500' AND ref = ?").get(`feed-react:${p1.id}`).n === 1);

// ---- comments + replies ----
t('comment: needs text', (await call(m2, '/api/feed/comment', { id: p1.id, text: '' })).s === 400);
let post = (await call(m2, '/api/feed/comment', { id: p1.id, text: 'Top bins!' })).d.post;
const c1 = post.comments[0];
t('comment: added', post.nComments === 1 && c1.by.n === 'Player Two' && !c1.parent);
t('comment: author notified', sqlite.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = '500' AND ref = ? AND title LIKE '%commented%'").get(`feed:${p1.id}`).n === 1);
post = (await call(m1, '/api/feed/comment', { id: p1.id, parent: c1.id, text: 'Cheers 🙌' })).d.post;
const reply = post.comments.find((c) => c.parent === c1.id);
t('reply: threaded under the comment', !!reply && reply.by.id === '500');
t('reply: comment author notified', sqlite.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = '501' AND title LIKE '%replied%'").get().n === 1);
post = (await call(mgr, '/api/feed/comment', { id: p1.id, parent: reply.id, text: 'Class.' })).d.post;
t('reply to a reply joins the same thread (one level)', post.comments.filter((c) => c.parent === c1.id).length === 2);
t('uncomment: someone else can’t', (await call(m2, '/api/feed/uncomment', { id: reply.id })).s === 403);
post = (await call(m2, '/api/feed/uncomment', { id: c1.id })).d.post;
t('uncomment: top comment with replies leaves a “removed” stub', post.comments.find((c) => c.id === c1.id)?.removed === true && !post.comments.find((c) => c.id === c1.id).text && post.nComments === 2);

// ---- managers: pin / remove ----
t('pin: members can’t', (await call(m1, '/api/feed/pin', { id: p1.id })).s === 403);
t('pin: manager can', (await call(mgr, '/api/feed/pin', { id: p1.id })).d.post.pinned === true);
const pf = (await call(m2, '/api/feed')).d;
t('pinned post comes first', pf.posts[0].id === p1.id && pf.posts[0].pinned);
const extra = [];
for (let i = 0; i < MAX_PINNED; i++) extra.push((await call(mgr, '/api/feed/post', { text: `Notice ${i}`, tag: 'chat' })).d.post.id);
for (const id of extra.slice(0, MAX_PINNED - 1)) await call(mgr, '/api/feed/pin', { id });
t(`pin: max ${MAX_PINNED}`, (await call(mgr, '/api/feed/pin', { id: extra.at(-1) })).s === 409);
await call(mgr, '/api/feed/pin', { id: p1.id, pinned: false });
t('unpin: back in the timeline', !(await call(m2, '/api/feed')).d.posts.find((p) => p.id === p1.id).pinned);
t('remove: manager can remove any post', (await call(mgr, '/api/feed/delete', { id: p3.id })).d.ok);
t('remove: gone from the feed and its permalink', !(await call(m2, '/api/feed')).d.posts.some((p) => p.id === p3.id) && (await call(m2, `/api/feed/post?id=${p3.id}`)).s === 404);
t('remove: author told a manager removed it', sqlite.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = '500' AND title LIKE '%removed%'").get().n === 1);
t('remove: activity log records it', sqlite.prepare("SELECT COUNT(*) AS n FROM activity WHERE type = 'post-remove'").get().n === 1);
t('delete: author removes own', (await call(m2, '/api/feed/delete', { id: p2.id })).d.ok);
t('permalink: GET one post', (await call(m2, `/api/feed/post?id=${p1.id}`)).d.post.id === p1.id);

// ---- limits + paging ----
const left = (await call(m2, '/api/feed')).d.left;
const burst = await Promise.all(Array.from({ length: left + 3 }, (_, i) => call(m2, '/api/feed/post', { text: `spam ${i}`, tag: 'chat' })));
t(`post: ${POSTS_DAY} per day, even in parallel`, burst.filter((x) => x.s === 200).length === left && burst.some((x) => x.s === 429));
for (const tok of [m1, mgr]) for (let i = 0; i < 7; i++) await call(tok, '/api/feed/post', { text: `filler ${i}`, tag: 'chat' });
const pg1 = (await call(mgr, '/api/feed')).d;
t('paging: 20 per page + next cursor', pg1.more && pg1.next && pg1.posts.filter((p) => !p.pinned).length === 20);
const pg2 = (await call(mgr, `/api/feed?before=${pg1.next}`)).d;
t('paging: page two has no pinned repeats and no overlap', pg2.posts.length && !pg2.posts.some((p) => p.pinned || pg1.posts.some((q) => q.id === p.id)));
t('canModerate for managers', pg1.canModerate === true);

done();
