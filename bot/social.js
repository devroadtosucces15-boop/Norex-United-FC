// Social building blocks shared by the feed now and chats later (roadmap P6.4 + P6.5).
//   P6.4 online presence – every logged-in request stamps users.seen_at (at most once a minute).
//     GET  /api/presence                 members: who is online now (5 min) / earlier today (60 min), my "appear offline"
//     POST /api/presence { hidden }      members: appear offline (you still see everyone else)
//   P6.5 mentions + reactions everywhere
//     GET  /api/mentions?q=              members: people to @mention (name or Discord username)
//     POST /api/react { kind, id, emoji } members: toggle a club reaction on a comment (chat messages next – P6.3)
// Mentions are Discord usernames (@name) – unique, stable, and what members already type on Discord.
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';

export const CLUB_EMOJI = ['⚽', '🔥', '👑', '👏', '😂', '😮', '🧤'];
export const ONLINE_MS = 5 * 60e3;
export const RECENT_MS = 60 * 60e3;
const TOUCH_MS = 60e3;
const MAX_MENTIONS = 10;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;
const excerpt = (s, n = 90) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

// ---------- P6.4 presence ----------
// The WHERE makes this a no-op write most of the time: D1 only bills rows that actually change.
export const touch = (env, me) => (env.DB && me?.u
  ? run(env, 'UPDATE users SET seen_at = ?1 WHERE id = ?2 AND (seen_at IS NULL OR seen_at < ?1 - ?3)', Date.now(), me.u, TOUCH_MS).catch(() => {})
  : Promise.resolve());

const personOut = (r) => ({ id: r.id, n: r.name, a: opt(r.avatar), tag: opt(r.tag), at: r.seen_at });
async function presence(env, me) {
  const now = Date.now();
  const rows = await all(env, 'SELECT id, name, avatar, tag, seen_at, presence_hidden FROM users WHERE seen_at > ? ORDER BY seen_at DESC LIMIT 200', now - RECENT_MS);
  const hidden = !!(await one(env, 'SELECT presence_hidden FROM users WHERE id = ?', me.u))?.presence_hidden;
  const shown = rows.filter((r) => !r.presence_hidden);
  return {
    online: shown.filter((r) => r.seen_at > now - ONLINE_MS).map(personOut),
    recent: shown.filter((r) => r.seen_at <= now - ONLINE_MS).slice(0, 40).map(personOut),
    hidden, me: me.u, onlineMin: ONLINE_MS / 60e3, now,
  };
}

// ---------- P6.5 mentions ----------
// @username – Discord usernames are 2–32 of a-z 0-9 _ . (a trailing dot is punctuation, not part of the name).
const MENTION = /(^|[^\w@./])@([a-z0-9_.]{2,32})/gi;
export function mentionTags(text) {
  const tags = new Set();
  for (const m of String(text ?? '').matchAll(MENTION)) { const t = m[2].replace(/\.+$/, '').toLowerCase(); if (t.length >= 2) tags.add(t); }
  return [...tags];
}
// Texts → { username: { id, n } } for the ones that are real members (the client turns those into chips).
export async function mentionMap(env, texts) {
  const tags = [...new Set(texts.flatMap(mentionTags))].slice(0, 200);
  if (!tags.length || !env.DB) return {};
  const rows = await all(env, `SELECT id, name, tag FROM users WHERE lower(tag) IN (${marks(tags.length)})`, ...tags);
  return Object.fromEntries(rows.map((r) => [String(r.tag).toLowerCase(), { id: r.id, n: r.name }]));
}
// Bell/DM for everyone newly @mentioned in `text` (not in `before`), who can see where it was said (`flag`).
// skip = ids that already get a note about the same thing (post author on a comment, …). → ids notified.
export async function notifyMentions(env, me, { text, before = '', flag, where, link, ref, skip = [] }) {
  if (!flagOn(env, me, 'mentions')) return [];
  const old = new Set(mentionTags(before));
  const tags = mentionTags(text).filter((t) => !old.has(t)).slice(0, MAX_MENTIONS);
  if (!tags.length) return [];
  const rows = await all(env, `SELECT id, role FROM users WHERE lower(tag) IN (${marks(tags.length)})`, ...tags);
  const ids = rows.filter((r) => r.id !== me.u && !skip.includes(r.id) && (!flag || flagOn(env, { role: r.role }, flag))).map((r) => r.id);
  if (ids.length) await safely(notify(env, ids, { type: 'mention', icon: '📣', title: `${me.n} mentioned you ${where}`, body: excerpt(text, 160), link, ref }));
  return ids;
}

// ---------- P6.5 shared reactions (everything that isn't a feed post) ----------
// kind → how to find the thing, who owns it, where it lives and which flag/permission guards it.
const KINDS = {
  comment: {
    flag: 'feed', perm: 'feed.view', what: 'comment',
    target: (env, id) => one(env, `SELECT c.user_id, c.post_id FROM post_comments c JOIN posts p ON p.id = c.post_id
      WHERE c.id = ? AND c.removed = 0 AND p.removed = 0`, id),
    link: (t) => `feed.html#p${t.post_id}`,
  },
};
// ids → { id: { reacts: {emoji: n}, who: {emoji: [names ≤12]}, mine: [emoji] } } – same shape as feed posts.
export async function reactionsFor(env, kind, ids, me) {
  const out = {};
  if (!ids.length) return out;
  const rows = await all(env, `SELECT r.ref, r.user_id, r.emoji, u.name FROM reactions r LEFT JOIN users u ON u.id = r.user_id
    WHERE r.kind = ? AND r.ref IN (${marks(ids.length)}) ORDER BY r.at`, kind, ...ids);
  for (const x of rows) {
    const o = (out[x.ref] ??= { reacts: {}, who: {}, mine: [] });
    o.reacts[x.emoji] = (o.reacts[x.emoji] ?? 0) + 1;
    (o.who[x.emoji] ??= []).length < 12 && o.who[x.emoji].push(x.name ?? 'Member');
    if (x.user_id === me.u) o.mine.push(x.emoji);
  }
  return out;
}

export async function socialRoute(p, method, body, me, env, log, url) {
  if (p === '/api/presence') {
    if (!flagOn(env, me, 'presence')) return fail('Not available yet.', 404);
    if (!can(me, 'presence.view')) return fail('Members only.', 403);
    if (method === 'POST') {
      const hidden = !!body.hidden;
      await run(env, 'UPDATE users SET presence_hidden = ? WHERE id = ?', hidden ? 1 : 0, me.u);
      await log(env, me, hidden ? 'presence-hide' : 'presence-show', '');
    } else await touch(env, me);
    return json(await presence(env, me));
  }
  if (p === '/api/mentions' && method === 'GET') {
    if (!flagOn(env, me, 'mentions')) return fail('Not available yet.', 404);
    if (!can(me, 'mentions.use')) return fail('Members only.', 403);
    const q = String(url.searchParams.get('q') ?? '').toLowerCase().replace(/^@/, '').trim().slice(0, 32);
    const like = q.replace(/[\\%_]/g, '\\$&');
    // Recently active people first – they're who you're most likely talking to.
    const rows = await all(env, `SELECT id, name, avatar, tag FROM users WHERE tag IS NOT NULL AND tag != ''
      AND (? = '' OR lower(tag) LIKE ? ESCAPE '\\' OR lower(name) LIKE ? ESCAPE '\\') ORDER BY (lower(tag) LIKE ? ESCAPE '\\') DESC, COALESCE(seen_at, last_at) DESC LIMIT 8`, q, `${like}%`, `%${like}%`, `${like}%`);
    return json({ people: rows.map((r) => ({ id: r.id, n: r.name, a: opt(r.avatar), tag: r.tag })) });
  }
  if (p === '/api/react' && method === 'POST') {
    const k = KINDS[body.kind];
    if (!k) return fail('Unknown thing to react to.');
    if (!flagOn(env, me, 'mentions') || !flagOn(env, me, k.flag)) return fail('Not available yet.', 404);
    if (!can(me, k.perm)) return fail('Members only.', 403);
    if (!CLUB_EMOJI.includes(body.emoji)) return fail('Pick one of the club reactions.');
    const id = Number(body.id) || 0;
    const t = await k.target(env, id);
    if (!t) return fail(`That ${k.what} is gone.`, 404);
    const add = await run(env, 'INSERT OR IGNORE INTO reactions (kind, ref, user_id, emoji, at) VALUES (?, ?, ?, ?, ?)', body.kind, id, me.u, body.emoji, Date.now());
    if (!add.meta?.changes) await run(env, 'DELETE FROM reactions WHERE kind = ? AND ref = ? AND user_id = ? AND emoji = ?', body.kind, id, me.u, body.emoji);
    // One unread bell note per thing at a time, like feed posts.
    else if (t.user_id !== me.u && !(await one(env, 'SELECT 1 FROM notifications WHERE user_id = ? AND ref = ? AND read_at IS NULL', t.user_id, `${body.kind}-react:${id}`))) {
      await safely(notify(env, [t.user_id], { type: 'feed', icon: body.emoji, title: `${me.n} reacted ${body.emoji} to your ${k.what}`, link: k.link(t), ref: `${body.kind}-react:${id}` }));
    }
    const r = (await reactionsFor(env, body.kind, [id], me))[id] ?? { reacts: {}, who: {}, mine: [] };
    return json({ kind: body.kind, id, ...r });
  }
  return null;
}
