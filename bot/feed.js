// Social feed (roadmap P6.1): posts with text, links (YouTube / Twitch / X / Streamable embeds), images and highlight videos,
// reactions from the club emoji set, comments one level deep, pin / remove, share to Discord, public posts on the home page.
//   GET  /api/feed?filter=all|highlights|league|rush|mine&before=<id>   members: 15 posts a page (pinned first on page one)
//   POST /api/feed/upload            members: raw file body (Content-Type image/* or video/*) → R2; answered before JSON parsing
//   POST /api/feed/post              members: { text, link?, media?, mode }
//   POST /api/feed/delete            author or managers: { id } – the media file goes too
//   POST /api/feed/react             members: { id, emoji } – toggles
//   POST /api/feed/comment           members: { id, text, parent? }        POST /api/feed/comment/delete { id }
//   POST /api/feed/pin | /public     managers: { id, on }                  POST /api/feed/share { id, channel, role? } managers
//   GET  /api/feed/public            anyone, once the feed is on for members: posts managers marked public
//   GET  /api/feed/storage           owner: storage used, biggest files, what the guard deletes next
//   GET  /media/<key>                anyone with the (unguessable) link – served from R2 with Range support
// Storage guard (R0.4, runs hourly on the cron): R2 has no size-based auto-delete and no spending cap, so above 9 GB the
// oldest media is deleted until we're under 8 GB (posts keep a "clip expired" placeholder, the owner is told); uploads are
// refused from 9.5 GB; unused uploads go after a day; files older than 365 days are dropped (R2 lifecycle does the same).
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';
import { postEmbed } from './docs.js';

const DAY = 86400e3, GB = 1024 ** 3, MB = 1024 ** 2;
export const LIMITS = { image: 10 * MB, video: 100 * MB, uploadsPerDay: 5, postsPerDay: 20, commentsPerDay: 100, guardAt: 9 * GB, guardTo: 8 * GB, refuseAt: 9.5 * GB, free: 10 * GB, maxAge: 365 * DAY };
export const EMOJI = ['🔥', '⚽', '👏', '😂', '😮', '🐐'];
const MIME = { 'image/jpeg': ['image', 'jpg'], 'image/png': ['image', 'png'], 'image/webp': ['image', 'webp'], 'image/gif': ['image', 'gif'], 'video/mp4': ['video', 'mp4'], 'video/webm': ['video', 'webm'], 'video/quicktime': ['video', 'mov'] };
const MODES = ['general', 'league', 'rush'];
const PAGE = 15;
const RED = 0xc8352c;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const cleanText = (s, max) => String(s ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;
const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

// ---------- link → embed (pure, tested) ----------
export function embedOf(link) {
  let u;
  try { u = new URL(String(link ?? '').trim()); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^(www|m)\./, '').toLowerCase(), path = u.pathname.split('/').filter(Boolean);
  const url = u.href.slice(0, 400);
  const ok = (id, re = /^[\w-]{2,100}$/) => (re.test(id ?? '') ? id : null);
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = ok(u.searchParams.get('v')) ?? (['shorts', 'live', 'embed'].includes(path[0]) ? ok(path[1]) : null);
    if (id) return { kind: 'youtube', id, url };
  }
  if (host === 'youtu.be' && ok(path[0])) return { kind: 'youtube', id: path[0], url };
  if (host === 'clips.twitch.tv' && ok(path[0])) return { kind: 'twitch-clip', id: path[0], url };
  if (host === 'twitch.tv') {
    if (path[1] === 'clip' && ok(path[2])) return { kind: 'twitch-clip', id: path[2], url };
    if (path[0] === 'videos' && ok(path[1], /^\d{3,20}$/)) return { kind: 'twitch-video', id: path[1], url };
    if (path.length === 1 && ok(path[0], /^\w{3,25}$/)) return { kind: 'twitch', id: path[0].toLowerCase(), url };
  }
  if ((host === 'x.com' || host === 'twitter.com') && path[1] === 'status' && ok(path[2], /^\d{5,25}$/)) return { kind: 'x', id: path[2], user: ok(path[0], /^\w{1,20}$/) ?? '', url };
  if (host === 'streamable.com' && ok(path[path[0] === 'e' ? 1 : 0], /^\w{3,20}$/)) return { kind: 'streamable', id: path[path[0] === 'e' ? 1 : 0], url };
  return { kind: 'link', host, url };
}
const CLIP_KINDS = ['youtube', 'twitch-clip', 'twitch-video', 'streamable', 'x'];
const firstUrl = (text) => (String(text).match(/https?:\/\/[^\s<>"']+/) ?? [])[0];

// ---------- reading ----------
async function hydrate(env, me, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [reacts, mine, comments, media] = await Promise.all([
    all(env, `SELECT post_id, emoji, COUNT(*) AS n FROM post_reactions WHERE post_id IN (${marks(ids.length)}) GROUP BY post_id, emoji`, ...ids),
    me ? all(env, `SELECT post_id, emoji FROM post_reactions WHERE user_id = ? AND post_id IN (${marks(ids.length)})`, me.u, ...ids) : [],
    all(env, `SELECT * FROM post_comments WHERE removed_at IS NULL AND post_id IN (${marks(ids.length)}) ORDER BY at LIMIT 600`, ...ids),
    all(env, `SELECT key, deleted_at FROM media WHERE key IN (${marks(ids.length)})`, ...rows.map((r) => r.media_key ?? '')),
  ]);
  const gone = new Set(media.filter((m) => m.deleted_at).map((m) => m.key));
  const mod = !!me && can(me, 'posts.moderate');
  return rows.map((r) => ({
    id: r.id, by: { id: r.user_id, n: r.name, a: opt(r.avatar), tag: opt(r.tag) }, mode: r.mode, text: r.body, link: opt(r.link), embed: parse(r.embed) ?? undefined,
    media: r.media_key ? { key: r.media_key, type: r.media_type, expired: gone.has(r.media_key) || undefined } : undefined, // the site adds its API origin: <api>/media/<key>
    highlight: !!r.highlight, public: !!r.public, pinned: !!r.pinned_at, at: r.at,
    reactions: Object.fromEntries(reacts.filter((x) => x.post_id === r.id).map((x) => [x.emoji, x.n])),
    my: mine.filter((x) => x.post_id === r.id).map((x) => x.emoji),
    comments: comments.filter((c) => c.post_id === r.id).map((c) => ({ id: c.id, parent: opt(c.parent_id), by: { id: c.user_id, n: c.name, a: opt(c.avatar), tag: opt(c.tag) }, text: c.body, at: c.at, mine: !!me && c.user_id === me.u })),
    mine: !!me && r.user_id === me.u, canRemove: !!me && (r.user_id === me.u || mod),
  }));
}
const FILTERS = { all: '', highlights: 'AND p.highlight = 1', league: "AND p.mode = 'league'", rush: "AND p.mode = 'rush'", mine: 'AND p.user_id = ?' };
async function page(env, me, filter, before) {
  const f = FILTERS[filter] !== undefined ? filter : 'all';
  const args = [...(f === 'mine' ? [me.u] : []), before || Number.MAX_SAFE_INTEGER];
  const rows = await all(env, `SELECT p.* FROM posts p WHERE p.removed_at IS NULL ${FILTERS[f]} AND p.id < ? ORDER BY p.id DESC LIMIT ${PAGE + 1}`, ...args);
  const pinned = !before && f === 'all' ? await all(env, 'SELECT * FROM posts WHERE removed_at IS NULL AND pinned_at IS NOT NULL ORDER BY pinned_at DESC LIMIT 3') : [];
  const list = [...pinned, ...rows.slice(0, PAGE).filter((r) => !pinned.some((x) => x.id === r.id))];
  return {
    posts: await hydrate(env, me, list), more: rows.length > PAGE ? rows[PAGE - 1].id : null, filter: f, emoji: EMOJI,
    limits: { image: LIMITS.image, video: LIMITS.video, uploadsPerDay: LIMITS.uploadsPerDay }, canModerate: can(me, 'posts.moderate'), canStorage: can(me, 'settings.bot'),
  };
}
export async function publicPosts(env) {
  const rows = await all(env, 'SELECT * FROM posts WHERE removed_at IS NULL AND public = 1 ORDER BY COALESCE(pinned_at, 0) DESC, id DESC LIMIT 3');
  return { posts: (await hydrate(env, null, rows)).map(({ comments, my, mine, canRemove, ...p }) => ({ ...p, comments: comments.length })) };
}

// ---------- storage ----------
const used = async (env) => (await one(env, 'SELECT COALESCE(SUM(size), 0) AS b, COUNT(*) AS n FROM media WHERE deleted_at IS NULL')) ?? { b: 0, n: 0 };
async function dropMedia(env, keys, why) {
  if (!keys.length) return;
  for (let i = 0; i < keys.length; i += 500) await env.MEDIA?.delete(keys.slice(i, i + 500));
  await run(env, `UPDATE media SET deleted_at = ?, deleted_why = ? WHERE key IN (${marks(keys.length)}) AND deleted_at IS NULL`, Date.now(), why, ...keys);
}
export async function storageGuard(env, now = Date.now()) {
  if (!env.DB) return { deleted: 0 };
  const stale = await all(env, 'SELECT key FROM media WHERE deleted_at IS NULL AND ((post_id IS NULL AND at < ?) OR at < ?) LIMIT 500', now - DAY, now - LIMITS.maxAge);
  await dropMedia(env, stale.map((m) => m.key), 'expired');
  let { b } = await used(env);
  const before = b;
  const deleted = [];
  if (b > LIMITS.guardAt) {
    const oldest = await all(env, 'SELECT key, size FROM media WHERE deleted_at IS NULL ORDER BY at LIMIT 2000');
    for (const m of oldest) { if (b < LIMITS.guardTo) break; deleted.push(m.key); b -= m.size; }
    await dropMedia(env, deleted, 'storage');
    const owners = (await all(env, "SELECT id FROM users WHERE role = 'owner'")).map((r) => r.id);
    const ids = [...new Set([...owners, ...String(env.ADMIN_IDS || '').split(',').map((x) => x.trim()).filter(Boolean)])];
    await safely(notify(env, ids, { type: 'queue', icon: '🗄️', title: `Media storage hit ${(before / GB).toFixed(1)} GB – deleted the ${deleted.length} oldest file${deleted.length === 1 ? '' : 's'}`, body: `Now ${(b / GB).toFixed(1)} GB of the free 10 GB. Their posts show "clip expired".`, link: 'members.html#feed' }));
  }
  return { deleted: deleted.length, expired: stale.length, used: b };
}
async function storage(env) {
  const [{ b, n }, biggest, next] = await Promise.all([
    used(env),
    all(env, 'SELECT m.key, m.size, m.type, m.at, m.post_id, u.name FROM media m LEFT JOIN users u ON u.id = m.user_id WHERE m.deleted_at IS NULL ORDER BY m.size DESC LIMIT 8'),
    all(env, 'SELECT m.key, m.size, m.type, m.at, m.post_id, u.name FROM media m LEFT JOIN users u ON u.id = m.user_id WHERE m.deleted_at IS NULL ORDER BY m.at LIMIT 8'),
  ]);
  const row = (m) => ({ key: m.key, size: m.size, type: m.type, at: m.at, post: opt(m.post_id), by: opt(m.name) });
  return { used: b, files: n, ...LIMITS, biggest: biggest.map(row), next: next.map(row), bound: !!env.MEDIA };
}

// POST /api/feed/upload – the body is the file itself; nothing is buffered in the Worker.
export async function uploadMedia(request, env, me) {
  if (!flagOn(env, me, 'feed')) return fail('Not available yet.', 404);
  if (!can(me, 'posts.create')) return fail('Members only.', 403);
  if (!env.MEDIA) return fail('Media uploads are not set up yet.', 503);
  const mime = String(request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const kind = MIME[mime];
  if (!kind) return fail('Images (JPG, PNG, WebP, GIF) or videos (MP4, WebM, MOV) only.', 415);
  const size = Number(request.headers.get('Content-Length'));
  if (!Number.isFinite(size) || size <= 0) return fail('File size missing.', 411);
  if (size > LIMITS[kind[0]]) return fail(`${kind[0] === 'video' ? 'Videos' : 'Images'} up to ${LIMITS[kind[0]] / MB} MB.`, 413);
  const today = await one(env, 'SELECT COUNT(*) AS n FROM media WHERE user_id = ? AND at > ?', me.u, Date.now() - DAY);
  if (today.n >= LIMITS.uploadsPerDay) return fail(`That’s ${LIMITS.uploadsPerDay} uploads today – try again tomorrow.`, 429);
  if ((await used(env)).b + size > LIMITS.refuseAt) return fail('Media storage is full right now – post a link instead, the club is clearing space.', 507);
  const key = `feed/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${kind[1]}`;
  const obj = await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' } });
  if (!obj || obj.size > LIMITS[kind[0]]) { await env.MEDIA.delete(key); return fail('That file is too big.', 413); }
  await run(env, 'INSERT INTO media (key, user_id, type, mime, size, at) VALUES (?, ?, ?, ?, ?, ?)', key, me.u, kind[0], mime, obj.size, Date.now());
  return json({ key, type: kind[0], size: obj.size });
}
// GET /media/<key>
export async function serveMedia(request, env, path) {
  const key = decodeURIComponent(path.slice('/media/'.length));
  if (!/^feed\/\d{4}-\d{2}\/[0-9a-f-]{36}\.\w{3,4}$/.test(key) || !env.MEDIA) return new Response('Not found', { status: 404 });
  const range = request.headers.get('Range');
  const obj = await env.MEDIA.get(key, range ? { range: request.headers } : {});
  if (!obj) return new Response('This clip has expired', { status: 404 });
  const h = new Headers({ 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'", 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable' });
  obj.writeHttpMetadata?.(h);
  if (obj.httpMetadata?.contentType) h.set('Content-Type', obj.httpMetadata.contentType);
  if (range && obj.range) {
    const start = obj.range.offset ?? 0, len = obj.range.length ?? obj.size - start;
    h.set('Content-Range', `bytes ${start}-${start + len - 1}/${obj.size}`);
    h.set('Content-Length', String(len));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set('Content-Length', String(obj.size));
  return new Response(obj.body, { headers: h });
}

// ---------- routes ----------
const who = async (env, me) => ({ n: me.n, a: me.a ?? null, tag: (await one(env, 'SELECT tag FROM users WHERE id = ?', me.u))?.tag ?? null });
const shareUrl = (env, id) => `${String(env.SITE_URL || '').replace(/\/?$/, '/')}members.html#feed-${id}`;
export async function feedRoute(p, method, body, me, env, log, url) {
  if (p !== '/api/feed' && !p.startsWith('/api/feed/')) return null;
  if (!flagOn(env, me, 'feed')) return fail('Not available yet.', 404);
  if (!can(me, 'hub.use')) return fail('Members only.', 403);
  if (p === '/api/feed' && method === 'GET') return json(await page(env, me, url?.searchParams.get('filter') || 'all', Number(url?.searchParams.get('before')) || 0));
  if (p === '/api/feed/storage' && method === 'GET') return can(me, 'settings.bot') ? json(await storage(env)) : fail('Owner only.', 403);
  if (method !== 'POST') return fail('Not found', 404);
  const post = body.id != null ? await one(env, 'SELECT * FROM posts WHERE id = ? AND removed_at IS NULL', Number(body.id) || 0) : null;

  if (p === '/api/feed/post') {
    if (!can(me, 'posts.create')) return fail('Members only.', 403);
    const text = cleanText(body.text, 1000);
    const link = cleanText(body.link, 400) || firstUrl(text) || null;
    const embed = link ? embedOf(link) : null;
    if (link && !embed) return fail('That link doesn’t look right (https://…).');
    let media = null;
    if (body.media) {
      media = await one(env, 'SELECT * FROM media WHERE key = ? AND user_id = ? AND post_id IS NULL AND deleted_at IS NULL', String(body.media), me.u);
      if (!media) return fail('That upload has expired – attach it again.', 409);
    }
    if (!text && !embed && !media) return fail('Write something, add a link or attach a picture or clip.');
    if ((await one(env, 'SELECT COUNT(*) AS n FROM posts WHERE user_id = ? AND at > ?', me.u, Date.now() - DAY)).n >= LIMITS.postsPerDay) return fail(`That’s ${LIMITS.postsPerDay} posts today.`, 429);
    const mode = MODES.includes(body.mode) ? body.mode : 'general';
    const w = await who(env, me);
    const highlight = media?.type === 'video' || CLIP_KINDS.includes(embed?.kind) ? 1 : 0;
    const r = await run(env, 'INSERT INTO posts (user_id, name, avatar, tag, mode, body, link, embed, media_key, media_type, highlight, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      me.u, w.n, w.a, w.tag, mode, text, embed?.url ?? null, embed ? JSON.stringify(embed) : null, media?.key ?? null, media?.type ?? null, highlight, Date.now());
    if (media) await run(env, 'UPDATE media SET post_id = ? WHERE key = ?', r.meta.last_row_id, media.key);
    await log(env, me, 'post', `#${r.meta.last_row_id}${highlight ? ' · highlight' : ''}`);
    return json({ id: r.meta.last_row_id, ...(await page(env, me, 'all', 0)) });
  }
  if (!post) return fail('Post not found.', 404);
  const mod = can(me, 'posts.moderate');

  if (p === '/api/feed/delete') {
    if (post.user_id !== me.u && !mod) return fail('Only the author or a manager can remove a post.', 403);
    await run(env, 'UPDATE posts SET removed_at = ?, removed_by = ? WHERE id = ?', Date.now(), me.n, post.id);
    if (post.media_key) await dropMedia(env, [post.media_key], 'removed');
    await log(env, me, post.user_id === me.u ? 'post-delete' : 'post-remove', `#${post.id} · ${post.name}`);
    return json({ ok: true });
  }
  if (p === '/api/feed/react') {
    if (!EMOJI.includes(body.emoji)) return fail('Pick a club reaction.');
    const had = await one(env, 'SELECT 1 FROM post_reactions WHERE post_id = ? AND user_id = ? AND emoji = ?', post.id, me.u, body.emoji);
    if (had) await run(env, 'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ? AND emoji = ?', post.id, me.u, body.emoji);
    else {
      await run(env, 'INSERT INTO post_reactions (post_id, user_id, emoji, at) VALUES (?, ?, ?, ?)', post.id, me.u, body.emoji, Date.now());
      // One note per person per post, however many emoji they tap.
      const first = (await one(env, 'SELECT COUNT(*) AS n FROM post_reactions WHERE post_id = ? AND user_id = ?', post.id, me.u)).n === 1;
      if (first && post.user_id !== me.u) await safely(notify(env, [post.user_id], { type: 'social', icon: body.emoji, title: `${me.n} reacted ${body.emoji} to your post`, link: `members.html#feed-${post.id}` }));
    }
    return json((await hydrate(env, me, [post]))[0]);
  }
  if (p === '/api/feed/comment') {
    if (!can(me, 'posts.create')) return fail('Members only.', 403);
    const text = cleanText(body.text, 500);
    if (!text) return fail('Write a comment.');
    let parent = null;
    if (body.parent) {
      parent = await one(env, 'SELECT * FROM post_comments WHERE id = ? AND post_id = ? AND parent_id IS NULL AND removed_at IS NULL', Number(body.parent) || 0, post.id);
      if (!parent) return fail('You can reply to a comment on this post only.');
    }
    if ((await one(env, 'SELECT COUNT(*) AS n FROM post_comments WHERE user_id = ? AND at > ?', me.u, Date.now() - DAY)).n >= LIMITS.commentsPerDay) return fail('That’s a lot of comments today – take a breather.', 429);
    const w = await who(env, me);
    await run(env, 'INSERT INTO post_comments (post_id, parent_id, user_id, name, avatar, tag, body, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', post.id, parent?.id ?? null, me.u, w.n, w.a, w.tag, text, Date.now());
    const tell = [...new Set([post.user_id, parent?.user_id].filter((x) => x && x !== me.u))];
    if (tell.length) await safely(notify(env, tell, { type: 'social', icon: '💬', title: `${me.n} ${parent ? 'replied to a comment' : 'commented'} on ${tell.length === 1 && tell[0] === post.user_id ? 'your post' : 'a post'}`, body: text.slice(0, 140), link: `members.html#feed-${post.id}` }));
    await log(env, me, 'comment', `#${post.id}`);
    return json((await hydrate(env, me, [post]))[0]);
  }
  if (p === '/api/feed/comment/delete') {
    const c = await one(env, 'SELECT * FROM post_comments WHERE id = ? AND post_id = ? AND removed_at IS NULL', Number(body.comment) || 0, post.id);
    if (!c) return fail('Comment not found.', 404);
    if (c.user_id !== me.u && !mod) return fail('Only the author or a manager can remove a comment.', 403);
    await run(env, 'UPDATE post_comments SET removed_at = ? WHERE id = ? OR parent_id = ?', Date.now(), c.id, c.id);
    if (c.user_id !== me.u) await log(env, me, 'comment-remove', `#${post.id} · ${c.name}`);
    return json((await hydrate(env, me, [post]))[0]);
  }
  if (!mod) return fail('Managers only.', 403);
  if (p === '/api/feed/pin' || p === '/api/feed/public') {
    const on = body.on !== false;
    await run(env, `UPDATE posts SET ${p.endsWith('pin') ? 'pinned_at' : 'public'} = ? WHERE id = ?`, p.endsWith('pin') ? (on ? Date.now() : null) : on ? 1 : 0, post.id);
    await log(env, me, p.endsWith('pin') ? (on ? 'post-pin' : 'post-unpin') : on ? 'post-public' : 'post-private', `#${post.id}`);
    return json((await hydrate(env, me, [{ ...post, ...(p.endsWith('pin') ? { pinned_at: on ? Date.now() : null } : { public: on ? 1 : 0 }) }]))[0]);
  }
  if (p === '/api/feed/share') {
    if (!can(me, 'announce.discord')) return fail('Managers only.', 403);
    const channel = String(body.channel ?? '');
    if (!/^\d{5,25}$/.test(channel)) return fail('Pick a channel.');
    const e = parse(post.embed);
    const media = post.media_key && post.media_type === 'image' && url ? { image: { url: `${url.origin}/media/${post.media_key}` } } : {};
    const res = await postEmbed(env, channel, body.role, { content: e && e.kind !== 'link' ? e.url : '', embeds: [{
      author: { name: `${post.name}${post.tag ? ` (@${post.tag})` : ''}`, ...(post.avatar ? { icon_url: post.avatar } : {}) },
      description: [post.body, e?.kind === 'link' ? e.url : '', post.media_type === 'video' ? `🎬 Watch the clip: ${shareUrl(env, post.id)}` : ''].filter(Boolean).join('\n\n').slice(0, 4000) || '📰 New post',
      url: shareUrl(env, post.id), color: RED, timestamp: new Date(post.at).toISOString(), ...media, footer: { text: 'NOREX UNITED · Squad feed' },
    }] });
    await log(env, me, 'post-share', `#${post.id}`);
    return json({ ok: true, ...res });
  }
  return fail('Not found', 404);
}
