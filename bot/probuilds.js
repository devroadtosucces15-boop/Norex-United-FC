// Pro Builds board (roadmap PB.3) and "my build" on profiles (PB.4). A posted build is a row of `builds`
// (bot/builds.js) with posted_at set, so the site decodes it with the same maths as a share link.
//   GET  /api/probuilds                 public – every posted build (short text), votes, "Club recommended"
//   GET  /api/probuilds/get?id=         public – one posted build with its full description + comments
//   GET  /api/probuilds/player?u=       public for verified players (else members) – someone's League/Rush build
//   POST /api/probuilds/post            members – save + post straight from the sandbox (own build or a new one)
//   POST /api/probuilds/unpost          the author, or a manager (remove post)
//   POST /api/probuilds/vote            members – { id, v: 1 | -1 | 0 }, not on your own build
//   POST /api/probuilds/comment         members – { id, text }, 30 per day
//   POST /api/probuilds/comment/delete  the author of the comment, or a manager
//   POST /api/probuilds/feature         managers – { id, label | null } "Club recommended"
//   GET  /api/probuilds/squad           managers – everyone's League/Rush build (portal, by position)
//   GET  /api/mybuild                   members – my League/Rush picks
//   POST /api/mybuild                   members – { mode, id | code+title, position } or { mode, id: null } to clear;
//                                       someone else's posted build is forked into my builds first
// Everything sits behind the `proBuilds` flag.
import { can, flagOn } from './roles.js';
import { MAX_BUILDS, buildInput } from './builds.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
// Multi-line text: keep line breaks (max 2 in a row), drop other control characters and angle brackets.
const cleanText = (s, max) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();

export const MODES = ['league', 'rush'];
export const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
export const COMMENTS_DAILY = 30;
const LIST_MAX = 400;
// Clip links: only well-known video hosts, https only.
const CLIP_HOSTS = ['youtube.com', 'youtu.be', 'twitch.tv', 'medal.tv', 'streamable.com', 'x.com', 'twitter.com', 'tiktok.com', 'instagram.com', 'outplayed.tv', 'allstar.gg', 'kick.com'];

function clipUrl(s) {
  const raw = String(s ?? '').trim();
  if (!raw) return { url: null };
  let u;
  try { u = new URL(raw); } catch { return { err: 'The clip link isn’t a web address.' }; }
  const host = u.hostname.toLowerCase().replace(/^(www|m|clips)\./, '');
  if (u.protocol !== 'https:' || !CLIP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return { err: `Clip links work from ${CLIP_HOSTS.slice(0, 5).join(', ')} and a few more (https).` };
  return { url: u.href.slice(0, 300) };
}
const tagsOf = (list) => [...new Set((Array.isArray(list) ? list : String(list ?? '').split(','))
  .map((t) => clean(t, 20).toLowerCase().replace(/[^\p{L}\p{N} +-]/gu, '').trim()).filter(Boolean))].slice(0, 5);
const parseTags = (s) => { try { const t = JSON.parse(s || '[]'); return Array.isArray(t) ? t : []; } catch { return []; } };

// Card for the board. `full` adds the whole description (the list sends a short one).
const out = (r, me, myVote, full = false) => ({
  id: r.id, title: r.title, code: r.code, arch: r.arch, level: r.level, version: r.version,
  desc: full ? r.description || '' : (r.description || '').slice(0, 180), more: !full && (r.description || '').length > 180,
  position: r.position, mode: r.mode, clip: r.clip, tags: parseTags(r.tags),
  up: r.up, down: r.down, score: r.up - r.down, comments: r.comments, featured: r.featured || null,
  by: { id: r.user_id, n: r.name, a: r.avatar }, mine: !!me && r.user_id === me.u, myVote: myVote ?? 0,
  at: r.posted_at, updated: r.updated_at, forkedFrom: r.forked_from ?? null,
});
const commentOut = (c, me) => ({ id: c.id, text: c.text, by: { id: c.user_id, n: c.name, a: c.avatar }, at: c.at, mine: !!me && c.user_id === me.u, canDelete: !!me && (c.user_id === me.u || can(me, 'posts.moderate')) });
const posted = (env, id) => one(env, 'SELECT * FROM builds WHERE id = ? AND posted_at IS NOT NULL AND removed_at IS NULL', Number(id) || 0);
const myVoteOf = async (env, me, id) => (me ? (await one(env, 'SELECT v FROM build_votes WHERE build_id = ? AND user_id = ?', id, me.u))?.v ?? 0 : 0);
const commentsOf = (env, id) => all(env, 'SELECT * FROM build_comments WHERE build_id = ? AND removed_at IS NULL ORDER BY id LIMIT 300', id);
async function detail(env, me, r) {
  return { build: out(r, me, await myVoteOf(env, me, r.id), true), comments: (await commentsOf(env, r.id)).map((c) => commentOut(c, me)) };
}

// ---------- PB.4: picks ----------
const pickOut = (r) => r && { id: r.id, title: r.title, code: r.code, arch: r.arch, level: r.level, version: r.version, position: r.pick_position || r.position, mode: r.mode, posted: !!r.posted_at, at: r.pick_at };
export async function picksOf(env, uid) {
  const rows = await all(env, `SELECT b.*, m.mode AS pick_mode, m.position AS pick_position, m.at AS pick_at FROM my_builds m
    JOIN builds b ON b.id = m.build_id AND b.removed_at IS NULL WHERE m.user_id = ?`, uid);
  const o = { league: null, rush: null };
  for (const r of rows) o[r.pick_mode] = pickOut(r);
  return o;
}
const countMine = async (env, me) => (await one(env, 'SELECT COUNT(*) AS n FROM builds WHERE user_id = ? AND removed_at IS NULL', me.u)).n;

// Public GET routes (no login needed) – called from handleMembers before the login check.
export async function probuildsPublic(p, env, me, url) {
  if (!flagOn(env, me, 'proBuilds')) return fail('Not available yet.', 404);
  if (p === '/api/probuilds') {
    const rows = await all(env, 'SELECT * FROM builds WHERE posted_at IS NOT NULL AND removed_at IS NULL ORDER BY posted_at DESC LIMIT ?', LIST_MAX);
    const votes = me ? Object.fromEntries((await all(env, 'SELECT build_id, v FROM build_votes WHERE user_id = ?', me.u)).map((x) => [x.build_id, x.v])) : {};
    return json({ builds: rows.map((r) => out(r, me, votes[r.id])), canPost: !!me && can(me, 'builds.save'), canFeature: !!me && can(me, 'builds.feature'), canModerate: !!me && can(me, 'posts.moderate') });
  }
  if (p === '/api/probuilds/get') {
    const r = await posted(env, url.searchParams.get('id'));
    return r ? json(await detail(env, me, r)) : fail('That build isn’t on the board (any more).', 404);
  }
  if (p === '/api/probuilds/player') {
    const uid = String(url.searchParams.get('u') || '').slice(0, 24);
    // Guests only see the builds of verified players (the ones with a public player page).
    if (!(me && can(me, 'profiles.view')) && !(await one(env, "SELECT 1 AS ok FROM claims WHERE user_id = ? AND status = 'approved'", uid))) return fail('Not found', 404);
    return json({ picks: await picksOf(env, uid) });
  }
  return fail('Not found', 404);
}

export async function probuildsRoute(p, method, body, me, env, log) {
  const pb = p === '/api/probuilds' || p.startsWith('/api/probuilds/');
  if (!pb && p !== '/api/mybuild') return null;
  if (!flagOn(env, me, 'proBuilds')) return fail('Not available yet.', 404);

  if (p === '/api/probuilds/squad' && method === 'GET') {
    if (!can(me, 'builds.squad')) return fail('Managers only.', 403);
    const rows = await all(env, `SELECT b.*, m.mode AS pick_mode, m.position AS pick_position, m.at AS pick_at, m.user_id AS pick_user, u.name AS u_name, u.avatar AS u_avatar
      FROM my_builds m JOIN builds b ON b.id = m.build_id AND b.removed_at IS NULL LEFT JOIN users u ON u.id = m.user_id ORDER BY m.at DESC`);
    return json({ picks: rows.map((r) => ({ user: { id: r.pick_user, n: r.u_name ?? r.name, a: r.u_avatar ?? r.avatar }, mode: r.pick_mode, build: pickOut(r) })) });
  }
  if (!can(me, 'builds.save')) return fail('Members only.', 403);
  if (p === '/api/mybuild' && method === 'GET') return json({ picks: await picksOf(env, me.u) });
  if (method !== 'POST') return fail('Not found', 404);

  if (p === '/api/mybuild') {
    const mode = MODES.includes(body.mode) ? body.mode : null;
    if (!mode) return fail('Pick League or Rush.');
    if (body.id === null && !body.code) {
      await run(env, 'DELETE FROM my_builds WHERE user_id = ? AND mode = ?', me.u, mode);
      await log(env, me, 'mybuild', `cleared ${mode}`);
      return json({ picks: await picksOf(env, me.u) });
    }
    const position = POSITIONS.includes(body.position) ? body.position : null;
    let id = null, title;
    if (body.id != null) {
      const r = await one(env, `SELECT * FROM builds WHERE id = ? AND removed_at IS NULL AND (user_id = ? OR posted_at IS NOT NULL)`, Number(body.id) || 0, me.u);
      if (!r) return fail('Build not found.', 404);
      title = r.title;
      if (r.user_id === me.u) id = r.id;
      else { // someone else's posted build → my own copy, so it stays mine even if they change or delete theirs
        if ((await countMine(env, me)) >= MAX_BUILDS) return fail(`You have ${MAX_BUILDS} builds saved – delete one first.`, 429);
        const at = Date.now();
        id = (await run(env, 'INSERT INTO builds (user_id, name, avatar, title, code, arch, level, version, forked_from, position, mode, at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          me.u, me.n, me.a ?? null, r.title, r.code, r.arch, r.level, r.version, r.id, r.position, r.mode, at, at)).meta.last_row_id;
        await log(env, me, 'build-fork', `${r.title} → my ${mode} build`);
      }
    } else {
      const v = buildInput(body);
      if (v.err) return fail(v.err);
      if ((await countMine(env, me)) >= MAX_BUILDS) return fail(`You have ${MAX_BUILDS} builds saved – delete one first.`, 429);
      const at = Date.now();
      id = (await run(env, 'INSERT INTO builds (user_id, name, avatar, title, code, arch, level, version, position, mode, at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        me.u, me.n, me.a ?? null, v.title, v.code, v.arch, v.level, v.version, position, mode, at, at)).meta.last_row_id;
      title = v.title;
    }
    await run(env, `INSERT INTO my_builds (user_id, mode, build_id, position, at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id, mode) DO UPDATE SET build_id = excluded.build_id, position = excluded.position, at = excluded.at`, me.u, mode, id, position, Date.now());
    await log(env, me, 'mybuild', `${mode}: ${title}`);
    return json({ picks: await picksOf(env, me.u), saved: id });
  }

  if (p === '/api/probuilds/post') {
    const v = buildInput(body);
    if (v.err) return fail(v.err);
    const position = POSITIONS.includes(body.position) ? body.position : null;
    if (!position) return fail('Pick the position this build is for.');
    const mode = MODES.includes(body.mode) ? body.mode : null;
    if (!mode) return fail('Is it a League or a Rush build?');
    const clip = clipUrl(body.clip);
    if (clip.err) return fail(clip.err);
    const description = cleanText(body.description, 1000);
    const tags = JSON.stringify(tagsOf(body.tags));
    const at = Date.now();
    let id;
    if (body.id != null) {
      const r = await one(env, 'SELECT id, user_id, posted_at FROM builds WHERE id = ? AND removed_at IS NULL', Number(body.id) || 0);
      if (!r || r.user_id !== me.u) return fail('You can only post your own builds – fork it first.', 403);
      await run(env, `UPDATE builds SET title = ?, code = ?, arch = ?, level = ?, version = ?, name = ?, avatar = ?, description = ?, position = ?, mode = ?, clip = ?, tags = ?,
        posted_at = COALESCE(posted_at, ?), unposted_by = NULL, updated_at = ? WHERE id = ?`,
      v.title, v.code, v.arch, v.level, v.version, me.n, me.a ?? null, description, position, mode, clip.url, tags, at, at, r.id);
      id = r.id;
    } else {
      if ((await countMine(env, me)) >= MAX_BUILDS) return fail(`You have ${MAX_BUILDS} builds saved – delete one first.`, 429);
      id = (await run(env, `INSERT INTO builds (user_id, name, avatar, title, code, arch, level, version, description, position, mode, clip, tags, posted_at, at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, me.u, me.n, me.a ?? null, v.title, v.code, v.arch, v.level, v.version, description, position, mode, clip.url, tags, at, at, at)).meta.last_row_id;
    }
    await log(env, me, 'probuild-post', `${v.title} · ${position} ${mode}`);
    return json(await detail(env, me, await posted(env, id)));
  }

  if (p === '/api/probuilds/comment/delete') return commentDelete(body, me, env, log);
  const r = await posted(env, body.id);
  if (!r) return fail('That build isn’t on the board (any more).', 404);

  if (p === '/api/probuilds/unpost') {
    const own = r.user_id === me.u;
    if (!own && !can(me, 'posts.moderate')) return fail('Only the author or a manager can take a build down.', 403);
    await run(env, 'UPDATE builds SET posted_at = NULL, featured = NULL, featured_by = NULL, unposted_by = ? WHERE id = ?', own ? null : me.n, r.id);
    await log(env, me, own ? 'probuild-unpost' : 'probuild-remove', `${r.title}${own ? '' : ` by ${r.name}`}`);
    return json({ ok: true, id: r.id });
  }

  if (p === '/api/probuilds/vote') {
    if (r.user_id === me.u) return fail('You can’t vote on your own build.');
    const v = [1, -1, 0].includes(body.v) ? body.v : null;
    if (v === null) return fail('Bad vote');
    const stmts = [v
      ? env.DB.prepare('INSERT INTO build_votes (build_id, user_id, v, at) VALUES (?, ?, ?, ?) ON CONFLICT (build_id, user_id) DO UPDATE SET v = excluded.v, at = excluded.at').bind(r.id, me.u, v, Date.now())
      : env.DB.prepare('DELETE FROM build_votes WHERE build_id = ? AND user_id = ?').bind(r.id, me.u),
    env.DB.prepare(`UPDATE builds SET up = (SELECT COUNT(*) FROM build_votes WHERE build_id = ?1 AND v > 0),
      down = (SELECT COUNT(*) FROM build_votes WHERE build_id = ?1 AND v < 0) WHERE id = ?1`).bind(r.id)];
    await env.DB.batch(stmts);
    const n = await one(env, 'SELECT up, down FROM builds WHERE id = ?', r.id);
    return json({ id: r.id, up: n.up, down: n.down, score: n.up - n.down, myVote: v });
  }

  if (p === '/api/probuilds/comment') {
    const text = cleanText(body.text, 500);
    if (text.length < 2) return fail('Write a little more.');
    const today = (await one(env, 'SELECT COUNT(*) AS n FROM build_comments WHERE user_id = ? AND at > ?', me.u, Date.now() - 86400000)).n;
    if (today >= COMMENTS_DAILY) return fail(`That’s ${COMMENTS_DAILY} comments today – try again tomorrow.`, 429);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO build_comments (build_id, user_id, name, avatar, text, at) VALUES (?, ?, ?, ?, ?, ?)').bind(r.id, me.u, me.n, me.a ?? null, text, Date.now()),
      env.DB.prepare('UPDATE builds SET comments = (SELECT COUNT(*) FROM build_comments WHERE build_id = ?1 AND removed_at IS NULL) WHERE id = ?1').bind(r.id),
    ]);
    await log(env, me, 'probuild-comment', r.title);
    return json(await detail(env, me, await posted(env, r.id)));
  }

  if (p === '/api/probuilds/feature') {
    if (!can(me, 'builds.feature')) return fail('Managers only.', 403);
    const label = body.label == null ? null : clean(body.label, 30) || `${r.position ?? ''} · ${r.mode === 'rush' ? 'Rush' : 'League'}`;
    await run(env, 'UPDATE builds SET featured = ?, featured_by = ? WHERE id = ?', label, label ? me.n : null, r.id);
    await log(env, me, 'probuild-feature', `${label ? '⭐' : 'unfeatured'} ${r.title}${label ? ` (${label})` : ''}`);
    return json(await detail(env, me, await posted(env, r.id)));
  }
  return fail('Not found', 404);
}

// Comment delete takes a comment id, not a build id.
async function commentDelete(body, me, env, log) {
  const c = await one(env, 'SELECT * FROM build_comments WHERE id = ? AND removed_at IS NULL', Number(body.comment) || 0);
  if (!c) return fail('Comment not found.', 404);
  if (c.user_id !== me.u && !can(me, 'posts.moderate')) return fail('You can only delete your own comments.', 403);
  await env.DB.batch([
    env.DB.prepare('UPDATE build_comments SET removed_at = ? WHERE id = ?').bind(Date.now(), c.id),
    env.DB.prepare('UPDATE builds SET comments = (SELECT COUNT(*) FROM build_comments WHERE build_id = ?1 AND removed_at IS NULL) WHERE id = ?1').bind(c.build_id),
  ]);
  if (c.user_id !== me.u) await log(env, me, 'probuild-comment-remove', `${c.name}: ${c.text.slice(0, 60)}`);
  const r = await posted(env, c.build_id);
  return r ? json(await detail(env, me, r)) : json({ ok: true });
}
