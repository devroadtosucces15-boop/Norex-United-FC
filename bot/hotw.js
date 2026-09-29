// Highlight of the week (roadmap P6.2) – members vote the best 🎬 Highlight post of the week in the club feed.
//   GET  /api/hotw                 members: this week's clips (post ids), my vote, closes at, last week's winner
//   POST /api/hotw/vote { post }   members: vote (same post again or post null = take it back) – changeable until close,
//                                  not for your own clip
//   GET  /api/hotw/public          anyone (flag): the latest winner for the home page strip
// hotwDue(env) runs on the 10-minute cron (after the weekly awards): a finished week's winner = most votes, then most
// reactions, then the earliest post. The winner is told, the clip is copied into `hotw` (public strip + history) and
// posted to the awards Discord channel once the flag is open to members.
import { can, flagOn, flags } from './roles.js';
import { notify, safely } from './notify.js';
import { weekOf } from './awards.js';
import { postEmbed } from './docs.js';

const DAY = 86400e3, WEEK = 7 * DAY;
const RED = 0xc8352c;
const SHOW_DAYS = 14; // the home page strip shows a winner for two weeks
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const opt = (v) => v ?? undefined;
const excerpt = (s, n = 90) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const weekNo = (key) => Number(String(key).split('-W')[1]);
const weekByKey = (key) => { const [y, w] = key.split('-W').map(Number); return weekOf(Date.UTC(y, 0, 4) + (w - 1) * WEEK); };

// The first clip-like link in a post (the client decides how to embed it) – same hosts the feed embeds or cards.
const CLIP = /https:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv|streamable\.com|x\.com|twitter\.com)\/[^\s<>"']+/i;
export const clipOf = (text) => String(text ?? '').match(CLIP)?.[0] ?? null;

const entries = (env, week) => all(env, "SELECT id FROM posts WHERE tag = 'highlight' AND removed = 0 AND at >= ? AND at < ? ORDER BY id DESC", week.start, week.end).then((r) => r.map((x) => x.id));
const winnerOut = (w) => (w?.post_id ? {
  week: w.week, weekNo: weekNo(w.week), post: w.post_id, by: { id: w.user_id, n: w.name, a: opt(w.avatar) },
  text: excerpt(w.body, 280), video: opt(w.video), votes: w.votes, entries: w.entries, at: w.closed_at,
} : null);

async function state(env, me) {
  await hotwDue(env).catch((e) => console.log('hotw close failed', e.message)); // in case the cron hasn't yet
  const week = weekOf(Date.now());
  const [ids, mine, voters, last] = await Promise.all([
    entries(env, week), one(env, 'SELECT post_id FROM hotw_votes WHERE week = ? AND user_id = ?', week.key, me.u),
    one(env, 'SELECT COUNT(*) AS n FROM hotw_votes WHERE week = ?', week.key),
    one(env, 'SELECT * FROM hotw WHERE post_id IS NOT NULL ORDER BY week DESC LIMIT 1'),
  ]);
  // Votes stay secret until the week closes – members only see how many have voted.
  return { week: week.key, weekNo: weekNo(week.key), closes: week.end, entries: ids, myVote: opt(mine?.post_id), voters: voters.n, last: winnerOut(last), canVote: can(me, 'hotw.vote') };
}

// Close one finished week (INSERT OR IGNORE: the cron and a page load can race). → the row, or null if already closed.
export async function closeHotw(env, week) {
  if (await one(env, 'SELECT 1 FROM hotw WHERE week = ?', week.key)) return null;
  const ids = await entries(env, week);
  const tally = await all(env, `SELECT v.post_id, COUNT(*) AS n FROM hotw_votes v JOIN posts p ON p.id = v.post_id AND p.removed = 0
    WHERE v.week = ? GROUP BY v.post_id ORDER BY n DESC, v.post_id`, week.key);
  let win = null;
  if (tally.length) {
    const top = tally.filter((t) => t.n === tally[0].n);
    const rx = top.length > 1 ? await all(env, `SELECT post_id, COUNT(*) AS n FROM post_reactions WHERE post_id IN (${top.map(() => '?').join(',')}) GROUP BY post_id`, ...top.map((t) => t.post_id)) : [];
    const rxOf = (id) => rx.find((r) => r.post_id === id)?.n ?? 0;
    const best = top.sort((a, b) => rxOf(b.post_id) - rxOf(a.post_id) || a.post_id - b.post_id)[0];
    const post = await one(env, 'SELECT p.*, u.name AS u_name, u.avatar AS u_avatar FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?', best.post_id);
    win = { post, votes: best.n };
  }
  const p = win?.post;
  const ins = await run(env, `INSERT OR IGNORE INTO hotw (week, post_id, user_id, name, avatar, body, video, media, votes, entries, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    week.key, p?.id ?? null, p?.user_id ?? null, p ? (p.u_name ?? p.name) : null, p?.u_avatar ?? null, p?.body ?? null, p ? clipOf(p.body) : null, p?.media ?? null, win?.votes ?? 0, ids.length, Date.now());
  if (!ins.meta?.changes) return null;
  return one(env, 'SELECT * FROM hotw WHERE week = ?', week.key);
}

// Cron + lazy: last week and any older week with votes that isn't closed yet.
export async function hotwDue(env) {
  if (!env.DB) return { closed: 0 };
  const now = weekOf(Date.now());
  const keys = [...new Set([weekOf(Date.now() - WEEK).key, ...(await all(env, 'SELECT DISTINCT week FROM hotw_votes WHERE week < ?', now.key)).map((r) => r.week)])];
  let closed = 0;
  for (const key of keys) {
    const week = weekByKey(key);
    if (week.end > Date.now()) continue;
    const row = await closeHotw(env, week);
    if (!row) continue;
    closed++;
    if (row.post_id) await safely(announce(env, row));
  }
  return { closed };
}

async function announce(env, w) {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/');
  await safely(notify(env, [w.user_id], { type: 'award', icon: '🎬', title: `Your clip is the Highlight of week ${weekNo(w.week)}! 🏆`, body: `${w.votes} vote${w.votes === 1 ? '' : 's'} from the squad.`, link: `feed.html#p${w.post_id}` }));
  // Discord only once members can see it – while the flag is owner/managers the club shouldn't be told about it.
  const level = flags(env).hotw;
  const channel = (await one(env, "SELECT value FROM meta WHERE key = 'awards_channel'"))?.value;
  if (!['members', 'public'].includes(level) || !channel || !env.DISCORD_BOT_TOKEN) return;
  const r = await postEmbed(env, channel, '', {
    content: w.video ?? '', // Discord unfurls the clip itself under the embed
    embeds: [{
      title: `🎬 Highlight of the week · week ${weekNo(w.week)}`, url: `${site}${level === 'public' ? 'index.html' : `feed.html#p${w.post_id}`}`, color: RED,
      description: `**${w.name}**${w.body ? ` — ${excerpt(w.body.replace(CLIP, '').trim() || '🎬', 300)}` : ''}`,
      footer: { text: `${w.votes} vote${w.votes === 1 ? '' : 's'} · ${w.entries} clip${w.entries === 1 ? '' : 's'} in the running · NOREX UNITED` },
    }],
  });
  if (r.ok) await run(env, 'UPDATE hotw SET posted_at = ? WHERE week = ?', Date.now(), w.week);
}

export async function hotwPublic(env) {
  const w = await one(env, 'SELECT * FROM hotw WHERE post_id IS NOT NULL AND closed_at > ? ORDER BY week DESC LIMIT 1', Date.now() - SHOW_DAYS * DAY);
  // The public strip needs the post to still be up – a removed post drops off the home page too.
  if (w && !(await one(env, 'SELECT 1 FROM posts WHERE id = ? AND removed = 0', w.post_id))) return { last: null };
  return { last: winnerOut(w) };
}

export async function hotwRoute(p, method, body, me, env, log) {
  if (p !== '/api/hotw' && !p.startsWith('/api/hotw/')) return null;
  if (!flagOn(env, me, 'hotw') || !flagOn(env, me, 'feed')) return fail('Not available yet.', 404);
  if (!can(me, 'feed.view')) return fail('Members only.', 403);
  if (p === '/api/hotw' && method === 'GET') return json(await state(env, me));
  if (p === '/api/hotw/vote' && method === 'POST') {
    if (!can(me, 'hotw.vote')) return fail('Members only.', 403);
    const week = weekOf(Date.now());
    const cur = await one(env, 'SELECT post_id FROM hotw_votes WHERE week = ? AND user_id = ?', week.key, me.u);
    const id = Number(body.post) || 0;
    if (!id || cur?.post_id === id) {
      await run(env, 'DELETE FROM hotw_votes WHERE week = ? AND user_id = ?', week.key, me.u);
      if (cur) await log(env, me, 'hotw-unvote', `#${cur.post_id}`);
      return json(await state(env, me));
    }
    const post = await one(env, "SELECT user_id, body FROM posts WHERE id = ? AND removed = 0 AND tag = 'highlight' AND at >= ? AND at < ?", id, week.start, week.end);
    if (!post) return fail('Only this week’s 🎬 highlights are in the running.', 404);
    if (post.user_id === me.u) return fail('You can’t vote for your own clip – pick a teammate’s.', 403);
    await run(env, `INSERT INTO hotw_votes (week, user_id, post_id, at) VALUES (?, ?, ?, ?)
      ON CONFLICT (week, user_id) DO UPDATE SET post_id = excluded.post_id, at = excluded.at`, week.key, me.u, id, Date.now());
    await log(env, me, 'hotw-vote', `#${id} ${excerpt(post.body, 50)}`);
    return json(await state(env, me));
  }
  return fail('Not found', 404);
}
