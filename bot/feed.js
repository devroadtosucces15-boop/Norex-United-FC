// Club social feed (roadmap P6.1) – step (a): text posts with links/embeds, reactions, comments (one level of replies),
// author edit/delete, manager pin/remove; (b) photos and clips from R2 – upload, storage guard and owner dashboard in media.js.
// Sharing/public posts follow as P6.1c.
//   GET  /api/feed?f=all|highlight|league|rush|mine&before=<id>   members: a page of posts (pinned first on page one)
//   GET  /api/feed/post?id=                                       members: one post (permalink feed.html#p<id>)
//   POST /api/feed/post      { text, tag, media? }                members: new post – POSTS_DAY per day (media = uploaded keys)
//   POST /api/feed/edit      { id, text, tag }                    author: edit
//   POST /api/feed/delete    { id }                               author or managers: remove (kept for the record)
//   POST /api/feed/react     { id, emoji }                        members: toggle one club emoji
//   POST /api/feed/comment   { id, parent?, text }                members: comment or reply – COMMENTS_DAY per day
//   POST /api/feed/uncomment { id }                               author or managers: remove a comment
//   POST /api/feed/pin       { id, pinned }                       managers: pin to the top (max MAX_PINNED)
//   GET  /api/feed/public                                         anyone (flag): latest public posts for the home page strip
//   POST /api/feed/setpublic { id, public }                       author or managers: show/hide on the public home page
//   POST /api/feed/report    { id, reason }                       members: flag a post for the managers (one at a time)
//   POST /api/feed/unreport  { id }                                managers: clear a report without removing the post
//   POST /api/feed/share     { id, channel, role }                managers: post it to a Discord channel
// Authors show with their current Discord name, avatar, @username and ID (joined from users at read time).
import { can, flagOn, muted } from './roles.js';
import { notify, notifyManagers, safely } from './notify.js';
import { postEmbed } from './docs.js';
import { mentionMap, mentionTags, notifyMentions, reactionsFor } from './social.js';
import { attach, checkAttach, dropMedia, IMAGE_MAX, mediaFor, mediaRoute, PER_POST, postMediaKeys, UPLOADS_DAY, VIDEO_MAX } from './media.js';

export const TAGS = { chat: ['💬', 'Chat'], highlight: ['🎬', 'Highlight'], league: ['🏟️', 'League'], rush: ['⚡', 'Rush'] };
export const EMOJI = ['⚽', '🔥', '👑', '👏', '😂', '😮', '🧤'];
export const POSTS_DAY = 10;
export const COMMENTS_DAY = 100;
export const MAX_PINNED = 3;
const PAGE = 20;
const DAY = 86400e3;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const cleanText = (s, max) => String(s ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;
const excerpt = (s, n = 90) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const only = (map, texts) => Object.fromEntries(texts.flatMap(mentionTags).filter((t) => map[t]).map((t) => [t, map[t]]));
const author = (r) => ({ id: r.user_id, n: r.u_name ?? r.name ?? 'Member', a: opt(r.u_avatar), tag: opt(r.u_tag) });
const FILTER = { all: '', highlight: " AND p.tag = 'highlight'", league: " AND p.tag = 'league'", rush: " AND p.tag = 'rush'", mine: ' AND p.user_id = ?' };
const POST_SQL = 'SELECT p.*, u.name AS u_name, u.avatar AS u_avatar, u.tag AS u_tag FROM posts p LEFT JOIN users u ON u.id = p.user_id';

// Reactions + comments for a list of post rows → API shape.
async function hydrate(env, me, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [reacts, comments, media] = await Promise.all([
    all(env, `SELECT r.post_id, r.user_id, r.emoji, u.name FROM post_reactions r LEFT JOIN users u ON u.id = r.user_id WHERE r.post_id IN (${marks(ids.length)}) ORDER BY r.at`, ...ids),
    all(env, `SELECT c.*, u.name AS u_name, u.avatar AS u_avatar, u.tag AS u_tag FROM post_comments c LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_id IN (${marks(ids.length)}) ORDER BY c.id LIMIT 3000`, ...ids),
    mediaFor(env, ids),
  ]);
  // P6.5 – club reactions on comments + @mentions that point at real members (the client turns those into chips).
  const liveComments = comments.filter((c) => !c.removed);
  const [crx, ats] = await Promise.all([
    reactionsFor(env, 'comment', liveComments.map((c) => c.id), me),
    mentionMap(env, [...rows.map((r) => r.body), ...liveComments.map((c) => c.body)]),
  ]);
  return rows.map((r) => {
    const rs = reacts.filter((x) => x.post_id === r.id);
    const counts = {}, who = {};
    for (const x of rs) { counts[x.emoji] = (counts[x.emoji] ?? 0) + 1; (who[x.emoji] ??= []).length < 12 && who[x.emoji].push(x.name ?? 'Member'); }
    const cs = comments.filter((c) => c.post_id === r.id);
    // A removed comment stays as a "removed" stub only while it still has visible replies.
    const live = cs.filter((c) => !c.removed);
    const shown = cs.filter((c) => !c.removed || (!c.parent_id && live.some((x) => x.parent_id === c.id)));
    const mod = can(me, 'posts.moderate');
    return {
      id: r.id, by: author(r), text: r.body, tag: r.tag, at: r.at, edited: opt(r.edited_at), pinned: !!r.pinned,
      media: media[r.id] ?? [], reacts: counts, who, mine: rs.filter((x) => x.user_id === me.u).map((x) => x.emoji),
      comments: shown.map((c) => (c.removed ? { id: c.id, removed: true, at: c.at } : { id: c.id, parent: opt(c.parent_id), by: author(c), text: c.body, at: c.at, ...crx[c.id] })),
      nComments: live.length, mentions: only(ats, [r.body, ...live.map((c) => c.body)]),
      public: !!r.public, myReport: r.reported_by === me.u,
      // P6.1c – managers see who reported it and why; a member only sees whether they reported it themselves.
      reported: !r.reported_at ? false : mod ? { at: r.reported_at, by: r.reported_by, reason: r.reported_reason } : true,
      shared: opt(r.discord_at),
    };
  });
}

async function page(env, me, f, before) {
  const filter = FILTER[f] ?? '';
  const fArgs = f === 'mine' ? [me.u] : [];
  const pinned = before ? [] : await all(env, `${POST_SQL} WHERE p.removed = 0 AND p.pinned = 1${filter} ORDER BY p.id DESC`, ...fArgs);
  const rest = await all(env, `${POST_SQL} WHERE p.removed = 0 AND p.pinned = 0 AND p.id < ?${filter} ORDER BY p.id DESC LIMIT ?`, before || 2 ** 52, ...fArgs, PAGE + 1);
  const more = rest.length > PAGE;
  const posts = await hydrate(env, me, [...pinned, ...rest.slice(0, PAGE)]);
  const today = await one(env, 'SELECT COUNT(*) AS n FROM posts WHERE user_id = ? AND at > ?', me.u, Date.now() - DAY);
  const ups = await one(env, 'SELECT COUNT(*) AS n FROM media WHERE user_id = ? AND at > ?', me.u, Date.now() - DAY);
  const uploads = { on: !!env.MEDIA, left: Math.max(0, UPLOADS_DAY - ups.n), perDay: UPLOADS_DAY, image: IMAGE_MAX, video: VIDEO_MAX, perPost: PER_POST };
  return { posts, more, next: more ? rest[PAGE - 1].id : undefined, tags: TAGS, emoji: EMOJI, canModerate: can(me, 'posts.moderate'), canStorage: can(me, 'media.storage'), canShare: can(me, 'announce.discord'), uploads, left: Math.max(0, POSTS_DAY - today.n), perDay: POSTS_DAY, me: me.u };
}
const onePost = async (env, me, id) => {
  const r = await one(env, `${POST_SQL} WHERE p.id = ? AND p.removed = 0`, Number(id) || 0);
  return r ? (await hydrate(env, me, [r]))[0] : null;
};
// P6.1c – latest public posts for the guest-facing home page strip (no login, no moderation details).
export async function feedPublic(env) {
  const rows = await all(env, `${POST_SQL} WHERE p.removed = 0 AND p.public = 1 ORDER BY p.id DESC LIMIT 6`);
  if (!rows.length) return { posts: [] };
  const media = await mediaFor(env, rows.map((r) => r.id));
  return {
    posts: rows.map((r) => ({
      id: r.id, by: author(r), text: excerpt(r.body, 220), tag: r.tag, at: r.at,
      media: (media[r.id] ?? []).slice(0, 1),
    })),
  };
}
// A post needs text unless it carries a photo or clip.
const postBody = (body, hasMedia = false) => {
  const text = cleanText(body.text, 2000);
  if (!text && !hasMedia) return { error: 'Write something first.' };
  if (!TAGS[body.tag]) return { error: 'Pick a tag: chat, highlight, League or Rush.' };
  return { text, tag: body.tag };
};

export async function feedRoute(p, method, body, me, env, log, url) {
  if (p !== '/api/feed' && !p.startsWith('/api/feed/')) return null;
  if (!flagOn(env, me, 'feed')) return fail('Not available yet.', 404);
  if (!can(me, 'feed.view')) return fail('Members only.', 403);
  if (p === '/api/feed' && method === 'GET') return json(await page(env, me, url.searchParams.get('f') || 'all', Number(url.searchParams.get('before')) || 0));
  if (p === '/api/feed/post' && method === 'GET') {
    const post = await onePost(env, me, url.searchParams.get('id'));
    return post ? json({ post, tags: TAGS, emoji: EMOJI, canModerate: can(me, 'posts.moderate'), canShare: can(me, 'announce.discord'), me: me.u }) : fail('This post was removed or never existed.', 404);
  }
  const med = await mediaRoute(p, method, body, me, env, log);
  if (med) return med;
  if (method !== 'POST') return fail('Not found', 404);
  const id = Number(body.id) || 0;

  if (p === '/api/feed/post') {
    if (!can(me, 'feed.post')) return fail('Members only.', 403);
    const mutedUntil = await muted(env, me.u);
    if (mutedUntil) return fail(`You’re muted until ${new Date(mutedUntil).toLocaleString()}.`, 403);
    const m = await checkAttach(env, me, body.media);
    if (m.error) return fail(m.error);
    const v = postBody(body, m.keys.length > 0);
    if (v.error) return fail(v.error);
    // The daily limit sits inside the INSERT so posting in parallel can't slip past it.
    const now = Date.now();
    const ins = await run(env, `INSERT INTO posts (user_id, name, body, tag, at) SELECT ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM posts WHERE user_id = ? AND at > ?) < ?`, me.u, me.n, v.text, v.tag, now, me.u, now - DAY, POSTS_DAY);
    if (!ins.meta?.changes) return fail(`That’s ${POSTS_DAY} posts today – post again tomorrow.`, 429);
    await attach(env, me, ins.meta.last_row_id, m.keys);
    await log(env, me, 'post', `${TAGS[v.tag][0]} ${m.keys.length ? '📎 ' : ''}${excerpt(v.text || 'photo/clip', 60)}`);
    await notifyMentions(env, me, { text: v.text, flag: 'feed', where: 'in a feed post', link: `feed.html#p${ins.meta.last_row_id}`, ref: `feed:${ins.meta.last_row_id}` }); // P6.5
    return json({ post: await onePost(env, me, ins.meta.last_row_id) });
  }
  if (p === '/api/feed/edit') {
    const r = await one(env, 'SELECT user_id FROM posts WHERE id = ? AND removed = 0', id);
    if (!r) return fail('Post not found.', 404);
    if (r.user_id !== me.u) return fail('Only the author can edit a post.', 403);
    const v = postBody(body, (await postMediaKeys(env, id)).length > 0);
    if (v.error) return fail(v.error);
    const before = (await one(env, 'SELECT body FROM posts WHERE id = ?', id))?.body ?? '';
    await run(env, 'UPDATE posts SET body = ?, tag = ?, edited_at = ? WHERE id = ?', v.text, v.tag, Date.now(), id);
    await notifyMentions(env, me, { text: v.text, before, flag: 'feed', where: 'in a feed post', link: `feed.html#p${id}`, ref: `feed:${id}` }); // P6.5 – only newly added names
    return json({ post: await onePost(env, me, id) });
  }
  if (p === '/api/feed/delete') {
    const r = await one(env, 'SELECT user_id, body FROM posts WHERE id = ? AND removed = 0', id);
    if (!r) return fail('Post not found.', 404);
    const mine = r.user_id === me.u;
    if (!mine && !can(me, 'posts.moderate')) return fail('Only the author or a manager can remove a post.', 403);
    await run(env, 'UPDATE posts SET removed = 1, removed_by = ?, removed_at = ?, pinned = 0 WHERE id = ?', me.n, Date.now(), id);
    await dropMedia(env, await postMediaKeys(env, id), 2); // photos/clips of a removed post leave storage straight away
    await run(env, 'DELETE FROM notifications WHERE ref IN (?, ?)', `feed:${id}`, `feed-react:${id}`);
    if (!mine) await safely(notify(env, [r.user_id], { type: 'feed', icon: '🛡️', title: 'A manager removed one of your feed posts', body: `“${excerpt(r.body || 'photo/clip')}” – ask a manager on Discord if you think this was a mistake.`, link: 'feed.html' }));
    await log(env, me, mine ? 'post-delete' : 'post-remove', `#${id} ${excerpt(r.body, 60)}`);
    return json({ ok: true, id });
  }
  if (p === '/api/feed/react') {
    if (!EMOJI.includes(body.emoji)) return fail('Pick one of the club reactions.');
    const r = await one(env, 'SELECT user_id FROM posts WHERE id = ? AND removed = 0', id);
    if (!r) return fail('Post not found.', 404);
    const add = await run(env, 'INSERT OR IGNORE INTO post_reactions (post_id, user_id, emoji, at) VALUES (?, ?, ?, ?)', id, me.u, body.emoji, Date.now());
    if (!add.meta?.changes) await run(env, 'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ? AND emoji = ?', id, me.u, body.emoji);
    // One unread "reacted" bell note per post at a time – not one per click.
    else if (r.user_id !== me.u && !(await one(env, 'SELECT 1 FROM notifications WHERE user_id = ? AND ref = ? AND read_at IS NULL', r.user_id, `feed-react:${id}`))) {
      await safely(notify(env, [r.user_id], { type: 'feed', icon: body.emoji, title: `${me.n} reacted ${body.emoji} to your post`, link: `feed.html#p${id}`, ref: `feed-react:${id}` }));
    }
    const post = await onePost(env, me, id);
    return json({ id, reacts: post.reacts, who: post.who, mine: post.mine });
  }
  if (p === '/api/feed/comment') {
    const mutedUntil = await muted(env, me.u);
    if (mutedUntil) return fail(`You’re muted until ${new Date(mutedUntil).toLocaleString()}.`, 403);
    const post = await one(env, 'SELECT user_id, body FROM posts WHERE id = ? AND removed = 0', id);
    if (!post) return fail('Post not found.', 404);
    const text = cleanText(body.text, 500);
    if (!text) return fail('Write a comment first.');
    // Threads are one level deep: a reply to a reply joins the same top-level comment.
    let parent = null;
    if (body.parent) {
      const c = await one(env, 'SELECT id, parent_id, user_id FROM post_comments WHERE id = ? AND post_id = ?', Number(body.parent) || 0, id);
      if (!c) return fail('That comment is gone.', 404);
      parent = c.parent_id ? await one(env, 'SELECT id, user_id FROM post_comments WHERE id = ?', c.parent_id) : c;
      parent = { ...parent, replyTo: c.user_id };
    }
    const now = Date.now();
    const ins = await run(env, `INSERT INTO post_comments (post_id, parent_id, user_id, name, body, at) SELECT ?, ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM post_comments WHERE user_id = ? AND at > ?) < ?`, id, parent?.id ?? null, me.u, me.n, text, now, me.u, now - DAY, COMMENTS_DAY);
    if (!ins.meta?.changes) return fail(`That’s ${COMMENTS_DAY} comments today – take a breather.`, 429);
    const n = { type: 'feed', icon: '💬', body: excerpt(text, 120), link: `feed.html#p${id}`, ref: `feed:${id}` };
    const replyTo = parent?.replyTo && parent.replyTo !== me.u ? parent.replyTo : null;
    if (replyTo) await safely(notify(env, [replyTo], { ...n, icon: '↩️', title: `${me.n} replied to your comment` }));
    if (post.user_id !== me.u && post.user_id !== replyTo) await safely(notify(env, [post.user_id], { ...n, title: `${me.n} commented on your post` }));
    await notifyMentions(env, me, { text, flag: 'feed', where: 'in a comment', link: n.link, ref: n.ref, skip: [post.user_id, replyTo] }); // P6.5
    return json({ post: await onePost(env, me, id) });
  }
  if (p === '/api/feed/uncomment') {
    const c = await one(env, 'SELECT * FROM post_comments WHERE id = ? AND removed = 0', id);
    if (!c) return fail('Comment not found.', 404);
    const mine = c.user_id === me.u;
    if (!mine && !can(me, 'posts.moderate')) return fail('Only the author or a manager can remove a comment.', 403);
    await run(env, 'UPDATE post_comments SET removed = 1, removed_by = ? WHERE id = ?', me.n, id);
    if (!mine) await log(env, me, 'comment-remove', `#${c.post_id} ${c.name}: ${excerpt(c.body, 60)}`);
    const post = await onePost(env, me, c.post_id);
    return post ? json({ post }) : fail('Post not found.', 404);
  }
  if (p === '/api/feed/pin') {
    if (!can(me, 'posts.moderate')) return fail('Managers only.', 403);
    const pinned = body.pinned !== false;
    if (pinned && (await one(env, 'SELECT COUNT(*) AS n FROM posts WHERE pinned = 1 AND removed = 0 AND id != ?', id)).n >= MAX_PINNED) return fail(`Up to ${MAX_PINNED} pinned posts – unpin one first.`, 409);
    const r = await run(env, 'UPDATE posts SET pinned = ?, pinned_by = ? WHERE id = ? AND removed = 0', pinned ? 1 : 0, pinned ? me.n : null, id);
    if (!r.meta?.changes) return fail('Post not found.', 404);
    await log(env, me, pinned ? 'post-pin' : 'post-unpin', `#${id}`);
    return json({ post: await onePost(env, me, id) });
  }
  if (p === '/api/feed/setpublic') {
    const r = await one(env, 'SELECT user_id FROM posts WHERE id = ? AND removed = 0', id);
    if (!r) return fail('Post not found.', 404);
    if (r.user_id !== me.u && !can(me, 'posts.moderate')) return fail('Only the author or a manager can do that.', 403);
    const pub = body.public !== false;
    await run(env, 'UPDATE posts SET public = ? WHERE id = ?', pub ? 1 : 0, id);
    await log(env, me, pub ? 'post-public' : 'post-private', `#${id}`);
    return json({ post: await onePost(env, me, id) });
  }
  if (p === '/api/feed/report') {
    const r = await one(env, 'SELECT user_id, body, reported_at FROM posts WHERE id = ? AND removed = 0', id);
    if (!r) return fail('Post not found.', 404);
    if (r.user_id === me.u) return fail('You can’t report your own post.');
    if (r.reported_at) return fail('Already reported – the managers are on it.', 409);
    const reason = cleanText(body.reason, 200) || 'No reason given';
    await run(env, 'UPDATE posts SET reported_at = ?, reported_by = ?, reported_reason = ? WHERE id = ?', Date.now(), me.u, reason, id);
    await safely(notifyManagers(env, { type: 'queue', icon: '🚩', title: `${me.n} reported a feed post`, body: `“${excerpt(r.body || 'photo/clip', 100)}” – ${reason}`, link: `feed.html#p${id}` }, me.u));
    await log(env, me, 'post-report', `#${id}: ${reason}`);
    return json({ post: await onePost(env, me, id) });
  }
  if (p === '/api/feed/unreport') {
    if (!can(me, 'posts.moderate')) return fail('Managers only.', 403);
    const r = await run(env, 'UPDATE posts SET reported_at = NULL, reported_by = NULL, reported_reason = NULL WHERE id = ? AND removed = 0', id);
    if (!r.meta?.changes) return fail('Post not found.', 404);
    await log(env, me, 'post-unreport', `#${id}`);
    return json({ post: await onePost(env, me, id) });
  }
  if (p === '/api/feed/share') {
    if (!can(me, 'announce.discord')) return fail('Managers only.', 403);
    const r = await one(env, `${POST_SQL} WHERE p.id = ? AND p.removed = 0`, id);
    if (!r) return fail('Post not found.', 404);
    const site = String(env.SITE_URL || '').replace(/\/?$/, '/');
    const res = await postEmbed(env, body.channel, body.role, {
      embeds: [{
        title: `${TAGS[r.tag]?.[0] ?? '💬'} ${r.name ?? 'A member'} on the club feed`, url: `${site}feed.html#p${id}`, color: 0xc8352c,
        description: excerpt(r.body || '(photo/clip)', 400),
        footer: { text: 'NOREX UNITED · club feed' },
      }],
    });
    if (!res.ok) return fail(res.error, 400);
    await run(env, 'UPDATE posts SET discord_at = ? WHERE id = ?', Date.now(), id);
    await log(env, me, 'post-share', `#${id}`);
    return json({ post: await onePost(env, me, id) });
  }
  return fail('Not found', 404);
}
