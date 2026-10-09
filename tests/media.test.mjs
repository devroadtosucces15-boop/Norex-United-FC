// P6.1b feed photos/clips: upload checks, daily limit, attach to posts, /media serving (ranges), removal, storage guard, owner dashboard.
import { call, env, login, sqlite, r2objects, W } from './mock.mjs';
import { GUARD_HIGH, GUARD_LOW, IMAGE_MAX, mediaCron, UPLOADS_DAY, VIDEO_MAX } from '../bot/media.js';
import { t, tt, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const owner = await login('111', [], 'Boss');
const mgr = await login('600', ['mgr'], 'Coach');
const m1 = await login('500', [], 'Player One');
const m2 = await login('501', [], 'Player Two');
setFlags({ notifications: 'members', feed: 'members' });

const PNG = (n = 200) => { const b = new Uint8Array(n); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); return b; };
const MP4 = (n = 400) => { const b = new Uint8Array(n); b.set([0, 0, 0, 0x20, ...Buffer.from('ftypisom')]); return b; };
const up = async (tok, bytes, type, q = '') => {
  const r = await W(`/api/feed/upload?name=clip${q}`, { method: 'POST', headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': type, 'Content-Length': String(bytes.length) }, body: bytes });
  return { s: r.status, d: await r.json().catch(() => null) };
};

// ---- upload checks ----
t('upload: guests refused', (await up(null, PNG(), 'image/png')).s === 401);
setFlags({ feed: 'owner' });
t('upload: behind the feed flag', (await up(m1, PNG(), 'image/png')).s === 404);
setFlags({ feed: 'members' });
t('upload: SVG/HTML refused (type whitelist)', (await up(m1, Buffer.from('<svg onload=alert(1)>'), 'image/svg+xml')).s === 415);
t('upload: file must match its type (sniffed)', (await up(m1, Buffer.from('<html><script>alert(1)</script></html>'), 'image/png')).s === 415);
const fakeBig = await W('/api/feed/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + m2, 'Content-Type': 'image/jpeg', 'Content-Length': String(IMAGE_MAX + 1) }, body: new Uint8Array(10) });
t('upload: photo over 10 MB refused before reading it', fakeBig.status === 413);
const fakeVid = await W('/api/feed/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + m2, 'Content-Type': 'video/mp4', 'Content-Length': String(VIDEO_MAX + 1) }, body: new Uint8Array(10) });
t('upload: clip over 100 MB refused', fakeVid.status === 413);
const img = (await up(m1, PNG(), 'image/png', '&w=1200&h=800')).d;
t('upload: photo stored with key, size and dimensions', img.media?.key?.startsWith('i/') && img.media.size === 200 && img.media.w === 1200 && r2objects.has(img.media.key));
t('upload: failed/refused uploads still count towards the day', img.left === UPLOADS_DAY - 2);

// ---- /media serving ----
const get = await W(`/media/${img.media.key}`);
t('serve: right type, nosniff, sandbox CSP, cacheable', get.status === 200 && get.headers.get('content-type') === 'image/png' && get.headers.get('x-content-type-options') === 'nosniff' && /sandbox/.test(get.headers.get('content-security-policy')) && /immutable/.test(get.headers.get('cache-control')) && (await get.arrayBuffer()).byteLength === 200);
const vid = (await up(m2, MP4(), 'video/mp4')).d;
t('upload: clip stored', vid.media?.kind === 'video' && vid.media.key.startsWith('v/'));
const part = await W(`/media/${vid.media.key}`, { headers: { Range: 'bytes=4-11' } });
t('serve: byte ranges for video players', part.status === 206 && part.headers.get('content-range') === 'bytes 4-11/400' && Buffer.from(await part.arrayBuffer()).toString() === 'ftypisom');
t('serve: unknown / malformed keys 404', (await W('/media/i/deadbeef.png')).status === 404 && (await W('/media/i/..%2Fsecret.png')).status === 404);

// ---- attach to posts ----
t('post: someone else’s upload refused', (await call(m2, '/api/feed/post', { text: 'stolen', tag: 'chat', media: [img.media.key] })).s === 400);
t('post: clip + photo in one post refused', (await call(m2, '/api/feed/post', { text: 'x', tag: 'chat', media: [vid.media.key, img.media.key] })).s === 400);
const p1 = (await call(m1, '/api/feed/post', { text: '', tag: 'highlight', media: [img.media.key] })).d.post;
t('post: photo-only post (no text needed)', p1?.media.length === 1 && p1.media[0].key === img.media.key && p1.media[0].w === 1200);
t('post: an upload can only be used once', (await call(m1, '/api/feed/post', { text: 'again', tag: 'chat', media: [img.media.key] })).s === 400);
t('post: text-only still needs text', (await call(m1, '/api/feed/post', { text: ' ', tag: 'chat' })).s === 400);
const p2 = (await call(m2, '/api/feed/post', { text: 'Bike 🚲', tag: 'highlight', media: [vid.media.key] })).d.post;
t('feed: posts carry their media', (await call(m1, '/api/feed')).d.posts.find((p) => p.id === p2.id).media[0].kind === 'video');
t('edit: photo post can drop its text', (await call(m1, '/api/feed/edit', { id: p1.id, text: '', tag: 'chat' })).s === 200);
const pg = (await call(m1, '/api/feed')).d;
t('page: upload info for the composer', pg.uploads.on && pg.uploads.perDay === UPLOADS_DAY && pg.uploads.left === UPLOADS_DAY - 2 && pg.canStorage === false);

// ---- drop before posting / removal ----
const spare = (await up(m2, PNG(64), 'image/png')).d.media.key;
await call(m1, '/api/feed/unupload', { key: spare });
t('unupload: only the uploader', r2objects.has(spare));
await call(m2, '/api/feed/unupload', { key: spare });
t('unupload: file leaves storage', !r2objects.has(spare));
await call(mgr, '/api/feed/delete', { id: p2.id });
t('remove post: its clip is deleted from storage', !r2objects.has(vid.media.key) && sqlite.prepare('SELECT gone FROM media WHERE key = ?').get(vid.media.key).gone === 2);

// ---- daily limit (race-safe) ----
const burst = await Promise.all(Array.from({ length: 6 }, () => up(m2, PNG(), 'image/png')));
t(`upload: ${UPLOADS_DAY} per day even in parallel`, burst.filter((x) => x.s === 200).length === UPLOADS_DAY - 2 && burst.some((x) => x.s === 429));

// ---- storage guard ----
t('dashboard: owner only', (await call(m1, '/api/feed/storage')).s === 403 && (await call(mgr, '/api/feed/storage')).s === 403);
let st = (await call(owner, '/api/feed/storage')).d;
t('dashboard: used, limits, biggest + next files', st.on && st.used > 0 && st.limits.high === GUARD_HIGH && st.biggest.some((x) => x.key === img.media.key) && st.next[0].by === 'Player One');
// Orphan uploads from yesterday go; old posted files over the high-water mark go oldest-first.
sqlite.prepare("UPDATE media SET at = at - 2 * 86400000 WHERE post_id IS NULL AND gone = 0").run();
const orphans = sqlite.prepare('SELECT key FROM media WHERE post_id IS NULL AND gone = 0').all().map((r) => r.key);
const big = [];
for (let i = 0; i < 3; i++) {
  const k = (await up(owner, PNG(), 'image/png')).d.media.key;
  const post = (await call(owner, '/api/feed/post', { text: `old ${i}`, tag: 'chat', media: [k] })).d.post;
  // pretend each is 3.5 GB and uploaded i days ago (oldest first = i 0)
  r2objects.get(k).buf = { length: 3.5e9, subarray: () => Buffer.alloc(0) };
  r2objects.get(k).uploaded = new Date(Date.now() - (10 - i) * 86400e3);
  sqlite.prepare('UPDATE media SET size = ? WHERE key = ?').run(3.5e9, k);
  big.push({ k, post: post.id });
}
await env.MEDIA.put('cardresult/retained.png', PNG());
r2objects.get('cardresult/retained.png').uploaded = new Date(Date.now() - 30 * 86400e3);
const g = await mediaCron(env);
t('guard: private player artwork is retained under storage pressure', r2objects.has('cardresult/retained.png'));
t('guard: abandoned uploads dropped after a day', orphans.length > 0 && orphans.every((k) => !r2objects.has(k)));
t('guard: over 9 GB → oldest deleted until under 8 GB', g.before > GUARD_HIGH && g.after <= GUARD_LOW && g.dropped === 1 && !r2objects.has(big[0].k) && r2objects.has(big[2].k));
const shown = (await call(m1, `/api/feed/post?id=${big[0].post}`)).d.post;
t('guard: the post stays with an “expired” placeholder', shown.media[0].gone === 'expired' && !shown.media[0].key);
t('guard: owner notified', sqlite.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = '111' AND type = 'storage'").get().n === 1);
t('guard: runs at most hourly', (await mediaCron(env)) === null);
t('guard: next run an hour later', (await mediaCron(env, Date.now() + 3600e3))?.dropped === 0);
st = (await call(owner, '/api/feed/storage')).d;
t('dashboard: bucket total + last clean-up', st.bucket.bytes <= GUARD_LOW && st.guard.lastClean.n === 1 && st.expired30 >= 1);
// Nearly full → uploads refused.
sqlite.prepare("INSERT INTO meta (key, value) VALUES ('media_bucket', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify({ bytes: 9.6e9, count: 1, at: Date.now() }));
t('upload: refused at ≥ 9.5 GB', (await up(mgr, PNG(), 'image/png')).s === 507);
const del = await call(owner, '/api/feed/media/delete', { key: big[2].k });
t('dashboard: owner deletes a file', del.s === 200 && !r2objects.has(big[2].k));
await tt('dashboard: members can’t delete files', async () => (await call(m1, '/api/feed/media/delete', { key: big[1].k })).s === 403);
t('media-delete is in the activity log', sqlite.prepare("SELECT COUNT(*) AS n FROM activity WHERE type = 'media-delete'").get().n === 1);

// Without an R2 binding the upload says so and the composer hides the button.
const saved = env.MEDIA; delete env.MEDIA;
t('no R2 bound: upload → 503, page says uploads off', (await up(m1, PNG(), 'image/png')).s === 503 && (await call(m1, '/api/feed')).d.uploads.on === false);
env.MEDIA = saved;

done();
