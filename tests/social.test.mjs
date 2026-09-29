// P6.2 highlight of the week · P6.4 online presence · P6.5 @mentions + reactions on comments.
import { call, env, login, sqlite } from './mock.mjs';
import { EMOJI } from '../bot/feed.js';
import { CLUB_EMOJI, mentionTags, ONLINE_MS } from '../bot/social.js';
import { hotwDue, clipOf } from '../bot/hotw.js';
import { weekOf } from '../bot/awards.js';
import fs from 'node:fs';
import { ROOT, config } from './mock.mjs';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const owner = await login('111', [], 'Boss');
const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('500', [], 'Player One');
const m2 = await login('501', [], 'Player Two');
const m3 = await login('502', [], 'Player Three');
setFlags({ notifications: 'members', feed: 'members' });
const notes = (uid, type) => sqlite.prepare('SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY id').all(uid, type);

t('reactions: shared club set = feed set', CLUB_EMOJI.join() === EMOJI.join());

// ================= P6.4 presence =================
setFlags({ presence: 'owner' });
t('presence: 404 for members while owner-only', (await call(m1, '/api/presence')).s === 404);
setFlags({ presence: 'members' });
t('presence: guests refused', [401, 404].includes((await call(null, '/api/presence')).s));
await call(m2, '/api/presence');
let pr = (await call(m1, '/api/presence')).d;
t('presence: both callers are online now', ['500', '501'].every((id) => pr.online.some((u) => u.id === id)) && pr.me === '500' && !pr.hidden);
t('presence: online entries carry name + @username', pr.online.find((u) => u.id === '501')?.n === 'Player Two' && pr.online.find((u) => u.id === '501')?.tag === 'u501');
// Any logged-in request stamps seen_at (throttled to once a minute).
sqlite.prepare("UPDATE users SET seen_at = NULL WHERE id = '502'").run();
await call(m3, '/api/feed');
t('presence: any API call marks you seen', sqlite.prepare("SELECT seen_at FROM users WHERE id = '502'").get().seen_at > Date.now() - 5000);
sqlite.prepare("UPDATE users SET seen_at = ? WHERE id = '502'").run(Date.now() - ONLINE_MS - 60e3);
const stamp = Date.now() - 20e3;
sqlite.prepare("UPDATE users SET seen_at = ? WHERE id = '600'").run(stamp);
await call(mgr, '/api/feed');
t('presence: no write within a minute of the last one', sqlite.prepare("SELECT seen_at FROM users WHERE id = '600'").get().seen_at === stamp);
pr = (await call(m1, '/api/presence')).d;
t('presence: seen 6 min ago → "earlier this hour", not online', pr.recent.some((u) => u.id === '502') && !pr.online.some((u) => u.id === '502'));
pr = (await call(m2, '/api/presence', { hidden: true })).d;
t('presence: appear offline', pr.hidden === true && !pr.online.some((u) => u.id === '501'));
pr = (await call(m1, '/api/presence')).d;
t('presence: hidden member invisible to others', !pr.online.some((u) => u.id === '501') && !pr.recent.some((u) => u.id === '501'));
t('presence: switch logged', !!sqlite.prepare("SELECT 1 FROM activity WHERE user_id = '501' AND type = 'presence-hide'").get());
pr = (await call(m2, '/api/presence', { hidden: false })).d;
t('presence: visible again', !pr.hidden && pr.online.some((u) => u.id === '501'));

// ================= P6.5 mentions =================
t('mentionTags: usernames, lowercase, no emails / trailing dots', mentionTags('hi @U500 and @u501. mail a@b.com @x').join() === 'u500,u501');
setFlags({ mentions: 'owner' });
t('mentions: people search 404 for members while owner-only', (await call(m1, '/api/mentions?q=u5')).s === 404);
setFlags({ mentions: 'members' });
const ppl = (await call(m1, '/api/mentions?q=u50')).d.people;
t('mentions: search by username prefix', ppl.length >= 3 && ppl.every((p) => p.tag.startsWith('u50')));
t('mentions: search by display name', (await call(m1, '/api/mentions?q=three')).d.people.map((p) => p.id).join() === '502');
t('mentions: LIKE wildcards are literal', (await call(m1, '/api/mentions?q=%25')).d.people.length === 0);

const post = (await call(m1, '/api/feed/post', { text: 'Great pass @u501 and @u502! (not @nobody, not @u500 = me)', tag: 'chat' })).d.post;
t('mentions: post carries a map of real members only', post.mentions.u501?.id === '501' && post.mentions.u502?.n === 'Player Three' && !post.mentions.nobody);
t('mentions: both mentioned get a note, the author doesn’t', notes('501', 'mention').length === 1 && notes('502', 'mention').length === 1 && notes('500', 'mention').length === 0);
t('mentions: note links to the post', notes('501', 'mention')[0].link === `feed.html#p${post.id}` && notes('501', 'mention')[0].title.includes('Player One'));
await call(m1, '/api/feed/edit', { id: post.id, text: 'Great pass @u501 and @u502 – and @u600!', tag: 'chat' });
t('mentions: edit only notifies newly added names', notes('501', 'mention').length === 1 && notes('600', 'mention').length === 1);
await call(m3, '/api/feed/comment', { id: post.id, text: 'cheers @u500 @u501' });
t('mentions: comment mention notifies – post author gets the comment note instead', notes('501', 'mention').length === 2 && notes('500', 'mention').length === 0);
setFlags({ feed: 'owner' });
await call(owner, '/api/feed/post', { text: 'secret @u501', tag: 'chat' });
t('mentions: nobody is told about a page they can’t open', notes('501', 'mention').length === 2);
setFlags({ feed: 'members' });

// ================= P6.5 reactions on comments =================
const withC = (await call(m2, `/api/feed/post?id=${post.id}`)).d.post;
const cid = withC.comments[0].id;
t('comments: mention map covers comments', withC.mentions.u500?.id === '500');
t('react: unknown kind refused', (await call(m1, '/api/react', { kind: 'post', id: cid, emoji: '🔥' })).s === 400);
t('react: only club emoji', (await call(m1, '/api/react', { kind: 'comment', id: cid, emoji: '💩' })).s === 400);
let rx = (await call(m1, '/api/react', { kind: 'comment', id: cid, emoji: '🔥' })).d;
t('react: comment reaction added', rx.reacts['🔥'] === 1 && rx.mine.join() === '🔥' && rx.who['🔥'][0] === 'Player One');
await call(m2, '/api/react', { kind: 'comment', id: cid, emoji: '🔥' });
const cNotes = sqlite.prepare("SELECT * FROM notifications WHERE user_id = '502' AND ref = ?").all(`comment-react:${cid}`);
t('react: comment author gets one unread note', cNotes.length === 1 && cNotes[0].link === `feed.html#p${post.id}`);
rx = (await call(m1, '/api/react', { kind: 'comment', id: cid, emoji: '🔥' })).d;
t('react: same emoji again takes it back', rx.reacts['🔥'] === 1 && !rx.mine.length);
const seen = (await call(m1, `/api/feed/post?id=${post.id}`)).d.post.comments.find((c) => c.id === cid);
t('react: comment reactions come back with the feed', seen.reacts['🔥'] === 1 && seen.who['🔥'][0] === 'Player Two' && !seen.mine.length);
await call(m3, '/api/feed/uncomment', { id: cid });
t('react: removed comment → 404', (await call(m1, '/api/react', { kind: 'comment', id: cid, emoji: '👏' })).s === 404);
setFlags({ mentions: 'owner' });
t('react: behind the mentions flag', (await call(m1, '/api/react', { kind: 'comment', id: cid, emoji: '👏' })).s === 404);
setFlags({ mentions: 'members' });

// ================= P6.2 highlight of the week =================
t('clipOf: first clip link', clipOf('look https://youtu.be/abc123 and https://streamable.com/x') === 'https://youtu.be/abc123' && clipOf('no link') === null);
// Close last week: fake two clips + votes there (tie on votes → more reactions wins).
const last = weekOf(Date.now() - 7 * 86400e3);
const ins = (uid, body) => Number(sqlite.prepare("INSERT INTO posts (user_id, name, body, tag, at) VALUES (?, ?, ?, 'highlight', ?)").run(uid, 'x', body, last.start + 3600e3).lastInsertRowid);
const a = ins('500', 'Solo goal https://youtu.be/aaaaaaaaaaa'), b = ins('501', 'Screamer https://youtu.be/bbbbbbbbbbb');
const vote = (uid, pid) => sqlite.prepare('INSERT INTO hotw_votes (week, user_id, post_id, at) VALUES (?, ?, ?, ?)').run(last.key, uid, pid, last.start + 7200e3);
vote('502', a); vote('600', a); vote('111', b); vote('500', b);
sqlite.prepare("INSERT INTO post_reactions (post_id, user_id, emoji, at) VALUES (?, '502', '🔥', 1), (?, '600', '🔥', 1)").run(b, b);
const r1 = await hotwDue(env);
setFlags({ hotw: 'owner' });
t('hotw: 404 for members while owner-only', (await call(m1, '/api/hotw')).s === 404);
t('hotw: public strip 404 for guests while owner-only', (await call(null, '/api/hotw/public')).s === 404);
setFlags({ hotw: 'members' });
const h1 = (await call(m1, '/api/feed/post', { text: 'Bicycle kick https://youtu.be/dQw4w9WgXcQ', tag: 'highlight' })).d.post;
const h2 = (await call(m2, '/api/feed/post', { text: 'Last-minute winner https://streamable.com/abcde', tag: 'highlight' })).d.post;
const chat = (await call(m2, '/api/feed/post', { text: 'not a clip', tag: 'chat' })).d.post;
let hs = (await call(m3, '/api/hotw')).d;
t('hotw: this week’s highlight posts are in the running', hs.entries.includes(h1.id) && hs.entries.includes(h2.id) && !hs.entries.includes(chat.id) && hs.voters === 0 && hs.closes > Date.now());
t('hotw: own clip refused', (await call(m1, '/api/hotw/vote', { post: h1.id })).s === 403);
t('hotw: non-highlight refused', (await call(m1, '/api/hotw/vote', { post: chat.id })).s === 404);
hs = (await call(m3, '/api/hotw/vote', { post: h1.id })).d;
t('hotw: vote counted, choice returned', hs.myVote === h1.id && hs.voters === 1);
hs = (await call(m3, '/api/hotw/vote', { post: h2.id })).d;
t('hotw: vote can change (still one vote)', hs.myVote === h2.id && hs.voters === 1);
hs = (await call(m3, '/api/hotw/vote', { post: h2.id })).d;
t('hotw: same clip again takes it back', !hs.myVote && hs.voters === 0);
t('hotw: nothing public before a week closes', (await call(null, '/api/hotw/public')).d?.last == null);

t('hotw: cron closes last week once', r1.closed === 1 && (await hotwDue(env)).closed === 0);
const row = sqlite.prepare('SELECT * FROM hotw WHERE week = ?').get(last.key);
t('hotw: tie on votes → more reactions wins', row.post_id === b && row.votes === 2 && row.entries === 2 && row.video === 'https://youtu.be/bbbbbbbbbbb');
t('hotw: winner told', notes('501', 'award').some((n) => n.title.includes('Highlight of week') && n.link === `feed.html#p${b}`));
hs = (await call(m1, '/api/hotw')).d;
t('hotw: last week’s winner shown in the feed strip', hs.last?.post === b && hs.last.by.n === 'Player Two' && hs.last.votes === 2);
t('hotw: public strip hidden from guests until the flag is public', (await call(null, '/api/hotw/public')).s === 404);
setFlags({ hotw: 'public' });
const pub = (await call(null, '/api/hotw/public')).d.last;
t('hotw: public strip shows winner, clip link, votes', pub?.post === b && pub.video === 'https://youtu.be/bbbbbbbbbbb' && pub.by.n === 'Player Two' && pub.weekNo === Number(last.key.split('-W')[1]));
sqlite.prepare('UPDATE posts SET removed = 1 WHERE id = ?').run(b);
t('hotw: removed post drops off the home page', (await call(null, '/api/hotw/public')).d.last === null);
t('hotw: activity log records votes', !!sqlite.prepare("SELECT 1 FROM activity WHERE user_id = '502' AND type = 'hotw-vote'").get());

// ================= pages =================
const feedHtml = fs.readFileSync(ROOT + 'site/feed.html', 'utf8'), home = fs.readFileSync(ROOT + 'site/index.html', 'utf8');
t('pages: feed loads social.js before feed.js', feedHtml.indexOf('assets/social.js') > 0 && feedHtml.indexOf('assets/social.js') < feedHtml.indexOf('assets/feed.js'));
t('pages: home page has the highlight-of-the-week slot', home.includes('<div data-hotw hidden></div>'));
t('pages: new assets shipped', ['social.js', 'social.css', 'presence.js', 'hotw.js'].every((f) => fs.existsSync(ROOT + 'site/assets/' + f)));
t('flags: hotw, presence, mentions ship as owner', ['hotw', 'presence', 'mentions'].every((f) => config.features[f] === 'owner'));

done();
