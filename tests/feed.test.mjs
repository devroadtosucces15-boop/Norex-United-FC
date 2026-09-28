// P6.1 social feed: link embeds, R2 uploads + limits, posts, reactions, comments, moderation, public posts, media serving,
// and the R0.4 storage guard that keeps R2 under the free 10 GB.
import { call, env, login, r2, sqlite, W } from './mock.mjs';
import { embedOf, LIMITS, storageGuard } from '../bot/feed.js';
import { t, tt, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const GB = 1024 ** 3, MB = 1024 ** 2;

// ----- embeds -----
t('YouTube watch / youtu.be / shorts → youtube', embedOf('https://www.youtube.com/watch?v=dQw4w9WgXcQ').kind === 'youtube' && embedOf('https://youtu.be/dQw4w9WgXcQ').id === 'dQw4w9WgXcQ' && embedOf('https://youtube.com/shorts/abcDEF123_-').id === 'abcDEF123_-');
t('Twitch clip (both link styles), video, channel', embedOf('https://clips.twitch.tv/FunnyClipSlug-abc').kind === 'twitch-clip' && embedOf('https://www.twitch.tv/norex/clip/FunnyClipSlug-abc').id === 'FunnyClipSlug-abc' && embedOf('https://twitch.tv/videos/123456789').kind === 'twitch-video' && embedOf('https://twitch.tv/NorexUnitedFC').id === 'norexunitedfc');
t('X / Twitter post, Streamable', embedOf('https://x.com/norex/status/1234567890').kind === 'x' && embedOf('https://twitter.com/norex/status/1234567890').user === 'norex' && embedOf('https://streamable.com/abc123').kind === 'streamable');
t('anything else → link card; junk → null', embedOf('https://example.com/a').kind === 'link' && embedOf('javascript:alert(1)') === null && embedOf('not a url') === null);
t('bad ids never reach an embed', embedOf('https://www.youtube.com/watch?v=%22%3E%3Cscript').kind === 'link');

// ----- setup -----
env.DISCORD_BOT_TOKEN = 'bot';
const posts = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  const m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m && m[1] !== 'dm') { posts.push({ channel: m[1], ...JSON.parse(init.body) }); return Response.json({ id: 'p' }); }
  if (m) return Response.json({ id: 'dm-msg' });
  return realFetch(url, init);
};
const owner = await login('111', [], 'Founder');
const mgr = await login('600', ['mgr'], 'Coach');
const a = await login('500', [], 'Player One');
const b = await login('501', [], 'Player Two');
setFlags({ feed: 'owner', notifications: 'members' });
t('feed: 404 for members while owner-only', (await call(a, '/api/feed')).s === 404);
setFlags({ feed: 'members' });

const up = (tok, bytes, type, len = bytes.length) => W('/api/feed/upload', { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': type, 'Content-Length': String(len) }, body: bytes, duplex: 'half' });
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...Array(200).fill(7)]);
const u1 = await up(a, png, 'image/png');
const m1 = await u1.json();
t('upload a picture → R2 (key, size)', u1.status === 200 && /^feed\/\d{4}-\d{2}\/[0-9a-f-]{36}\.png$/.test(m1.key) && r2.get(m1.key)?.bytes.length === png.length && m1.size === png.length);
t('upload: wrong type refused (415)', (await up(a, png, 'text/html')).status === 415 && (await up(a, png, 'image/svg+xml')).status === 415);
t('upload: over the size limit refused before reading (413)', (await up(a, png, 'image/png', LIMITS.image + 1)).status === 413);
t('upload: guests can’t', (await W('/api/feed/upload', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png })).status === 401);

// serving
const g = await W(`/media/${m1.key}`);
t('media served with its type, nosniff and a locked-down CSP', g.status === 200 && g.headers.get('Content-Type') === 'image/png' && g.headers.get('X-Content-Type-Options') === 'nosniff' && /default-src 'none'/.test(g.headers.get('Content-Security-Policy')) && (await g.arrayBuffer()).byteLength === png.length);
const rg = await W(`/media/${m1.key}`, { headers: { Range: 'bytes=0-7' } });
t('Range requests → 206 (video seeking)', rg.status === 206 && rg.headers.get('Content-Range') === `bytes 0-7/${png.length}` && (await rg.arrayBuffer()).byteLength === 8);
t('odd keys → 404', (await W('/media/..%2Fsecret')).status === 404 && (await W('/media/feed/2026-09/nope.png')).status === 404);

// ----- posts -----
const p1 = await call(a, '/api/feed/post', { text: 'Worldie from last night 🚀', media: m1.key, mode: 'league' });
t('post with a picture', p1.s === 200 && p1.d.posts[0].media.key === m1.key && p1.d.posts[0].mode === 'league' && p1.d.posts[0].by.n === 'Player One');
t('an upload is used once', (await call(a, '/api/feed/post', { text: 'again', media: m1.key })).s === 409);
t('someone else’s upload can’t be used', (await call(b, '/api/feed/post', { text: 'mine now', media: (await (await up(a, png, 'image/png')).json()).key })).s === 409);
const p2 = await call(b, '/api/feed/post', { text: 'Check this clip https://youtu.be/dQw4w9WgXcQ', mode: 'rush' });
t('link in the text becomes an embed; clips are highlights', p2.d.posts[0].embed.kind === 'youtube' && p2.d.posts[0].highlight);
t('empty post refused', (await call(b, '/api/feed/post', { text: '   ' })).s === 400);
t('text is cleaned (no tags)', !(await call(b, '/api/feed/post', { text: '<img src=x onerror=alert(1)> hi' })).d.posts[0].text.includes('<'));
t('filters: highlights / rush / mine', (await call(a, '/api/feed?filter=highlights')).d.posts.every((p) => p.highlight) && (await call(a, '/api/feed?filter=rush')).d.posts.every((p) => p.mode === 'rush') && (await call(a, '/api/feed?filter=mine')).d.posts.every((p) => p.by.id === '500'));
for (let i = 0; i < 16; i++) sqlite.prepare("INSERT INTO posts (user_id, name, body, at) VALUES ('600', 'Coach', ?, ?)").run(`filler ${i}`, Date.now() - 1e6);
const pg1 = (await call(a, '/api/feed')).d;
const pg2 = (await call(a, `/api/feed?before=${pg1.more}`)).d;
t('pages of 15, "load more" carries on without repeats', pg1.posts.length === 15 && pg1.more && pg2.posts.length > 0 && !pg2.posts.some((p) => pg1.posts.some((q) => q.id === p.id)));

// ----- reactions + comments -----
const pid = p1.d.id;
const r1 = await call(b, '/api/feed/react', { id: pid, emoji: '🔥' });
await call(b, '/api/feed/react', { id: pid, emoji: '🐐' });
t('react (club emoji only), counted', r1.d.reactions['🔥'] === 1 && r1.d.my.includes('🔥') && (await call(b, '/api/feed/react', { id: pid, emoji: '💩' })).s === 400);
t('react again = take it back', !(await call(b, '/api/feed/react', { id: pid, emoji: '🔥' })).d.reactions['🔥']);
t('author told once per person, not per emoji', (await call(a, '/api/notify')).d.items.filter((n) => n.type === 'social' && /reacted/.test(n.title)).length === 1);
const c1 = await call(b, '/api/feed/comment', { id: pid, text: 'Unreal finish' });
const cid = c1.d.comments[0].id;
const c2 = await call(a, '/api/feed/comment', { id: pid, text: 'Cheers mate', parent: cid });
t('comment + reply (one level)', c2.d.comments.length === 2 && c2.d.comments[1].parent === cid);
t('no replies to replies', (await call(b, '/api/feed/comment', { id: pid, text: 'deeper', parent: c2.d.comments[1].id })).s === 400);
t('comment author told about the reply, post author about the comment', (await call(b, '/api/notify')).d.items.some((n) => /replied/.test(n.title)) && (await call(a, '/api/notify')).d.items.some((n) => /commented on your post/.test(n.title)));
t('others can’t remove your comment', (await call(a, '/api/feed/comment/delete', { id: pid, comment: cid })).s === 403);
t('removing a comment takes its replies', (await call(b, '/api/feed/comment/delete', { id: pid, comment: cid })).d.comments.length === 0);

// ----- moderation -----
t('members can’t pin / publish / share', (await call(b, '/api/feed/pin', { id: pid })).s === 403 && (await call(b, '/api/feed/public', { id: pid })).s === 403 && (await call(b, '/api/feed/share', { id: pid, channel: '70001' })).s === 403);
t('others can’t remove your post', (await call(b, '/api/feed/delete', { id: pid })).s === 403);
await call(mgr, '/api/feed/pin', { id: p2.d.id });
t('pinned posts come first', (await call(a, '/api/feed')).d.posts[0].id === p2.d.id && (await call(a, '/api/feed')).d.posts[0].pinned);
await call(mgr, '/api/feed/public', { id: pid });
const pub = await (await W('/api/feed/public')).json();
t('public posts on the home page (guests), without comment text', pub.posts.length === 1 && pub.posts[0].id === pid && typeof pub.posts[0].comments === 'number');
const sh = await call(mgr, '/api/feed/share', { id: pid, channel: '70001' });
t('share to Discord: author, text, picture', sh.s === 200 && posts.some((x) => x.channel === '70001' && x.embeds[0].author.name.startsWith('Player One') && x.embeds[0].image?.url.endsWith(m1.key)));
t('managers remove any post – its media goes from R2 too', (await call(mgr, '/api/feed/delete', { id: pid })).s === 200 && !r2.has(m1.key) && sqlite.prepare('SELECT deleted_why FROM media WHERE key = ?').get(m1.key).deleted_why === 'removed' && !(await (await W('/api/feed/public')).json()).posts.length);

// ----- limits + storage guard -----
for (let i = 0; i < LIMITS.uploadsPerDay; i++) sqlite.prepare("INSERT INTO media (key, user_id, type, mime, size, at) VALUES (?, '501', 'image', 'image/png', 10, ?)").run(`feed/2026-09/00000000-0000-0000-0000-00000000000${i}.png`, Date.now());
t(`${LIMITS.uploadsPerDay} uploads a day`, (await up(b, png, 'image/png')).status === 429);
sqlite.prepare("DELETE FROM media WHERE user_id = '501'").run();
const fake = (key, size, at, post = null) => sqlite.prepare("INSERT INTO media (key, user_id, type, mime, size, post_id, at) VALUES (?, '500', 'video', 'video/mp4', ?, ?, ?)").run(key, size, post, at);
const now = Date.now();
const vid = Number(sqlite.prepare("INSERT INTO posts (user_id, name, body, media_key, media_type, highlight, at) VALUES ('500', 'Player One', 'old clip', 'feed/2026-01/old-0.mp4', 'video', 1, ?)").run(now - 50 * 864e5).lastInsertRowid);
for (let i = 0; i < 10; i++) fake(`feed/2026-01/old-${i}.mp4`, 0.95 * GB, now - (50 - i) * 864e5, i === 0 ? vid : 1);
fake('feed/2026-09/unused.mp4', 1 * MB, now - 2 * 864e5);
t('uploads refused near the top (9.5 GB)', (await up(a, png, 'image/png')).status === 507);
const res = await storageGuard(env, now);
const left = sqlite.prepare('SELECT COALESCE(SUM(size), 0) AS b FROM media WHERE deleted_at IS NULL').get().b;
t('guard: above 9 GB → oldest deleted until under 8 GB', res.deleted === 2 && left < LIMITS.guardTo && left > 7 * GB);
t('guard: the oldest went first', !!sqlite.prepare("SELECT deleted_at FROM media WHERE key = 'feed/2026-01/old-0.mp4'").get().deleted_at && !sqlite.prepare("SELECT deleted_at FROM media WHERE key = 'feed/2026-01/old-9.mp4'").get().deleted_at);
t('guard: unused uploads cleared after a day', !!sqlite.prepare("SELECT deleted_at FROM media WHERE key = 'feed/2026-09/unused.mp4'").get().deleted_at);
t('guard: the post stays, its clip shows as expired', (await call(a, '/api/feed?filter=mine')).d.posts.find((p) => p.id === vid)?.media.expired === true);
t('guard: owner told', (await call(owner, '/api/notify')).d.items.some((n) => /Media storage hit/.test(n.title)));
t('guard: nothing to do under the line', (await storageGuard(env, now)).deleted === 0);
fake('feed/2025-01/ancient.mp4', 10, now - 400 * 864e5, 1);
await storageGuard(env, now);
t('guard: files older than 365 days go', sqlite.prepare("SELECT deleted_why FROM media WHERE key = 'feed/2025-01/ancient.mp4'").get().deleted_why === 'expired');
const st = await call(owner, '/api/feed/storage');
t('storage panel: owner only, with used / biggest / next', st.s === 200 && st.d.used === left && st.d.biggest[0].size >= st.d.biggest.at(-1).size && st.d.next[0].at <= st.d.next.at(-1).at && (await call(mgr, '/api/feed/storage')).s === 403);

await tt('activity log', async () => ['post', 'comment', 'post-pin', 'post-public', 'post-share', 'post-remove'].every((x) => sqlite.prepare('SELECT 1 FROM activity WHERE type = ?').get(x)));
done();
