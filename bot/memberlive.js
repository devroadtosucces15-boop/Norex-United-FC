// Member live alerts – a member who has put a Twitch, YouTube or Kick channel on their profile gets a "🔴 is live" post when
// they go on air, and shows on the site's "Live now" strip.
//   cron (10 min)   checks a few members per run (the free plan allows 50 outgoing requests per run, so it rotates through
//                   everyone) → D1 `member_live`; a stream that has just started gets one post in the announce channel
//   GET /api/live/members   who is streaming right now: [{ user, name, platform, url, title, since }]   (flag `memberLive`)
// The club's own channels stay in bot/live.js (GET /api/live). Free and credential-free: public channel pages; Kick's public
// channel endpoint. A check that fails counts as "not live" – nothing is posted on a failed fetch.
import { flagOn } from './roles.js';
import { parseTwitch, parseYouTube } from './live.js';
import { message, header, text, sep, footer, buttons } from './ui.js';
import { it } from './icons.js';
import { postEmbed } from './docs.js';

const PER_RUN = 8, UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results ?? []);
const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();

async function page(fetcher, url) {
  const r = await fetcher(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-GB,en;q=0.9', Cookie: 'CONSENT=YES+1; SOCS=CAI' }, redirect: 'follow' });
  return r.ok ? r.text() : '';
}
// One member: the first platform that is on air wins (Twitch, then YouTube, then Kick).
export async function liveOf(profile, fetcher = fetch) {
  const tries = [];
  if (profile.twitch) tries.push(page(fetcher, `https://www.twitch.tv/${profile.twitch}`).then(parseTwitch).then((r) => r.live && { platform: 'twitch', url: `https://www.twitch.tv/${profile.twitch}`, title: r.title }));
  if (profile.youtube) {
    const base = `https://www.youtube.com/${profile.youtube}`;
    tries.push(page(fetcher, `${base}/live`).then(parseYouTube).then((r) => r.live && { platform: 'youtube', url: `https://www.youtube.com/watch?v=${r.videoId}`, title: r.title }));
  }
  if (profile.kick) {
    tries.push(fetcher(`https://kick.com/api/v2/channels/${profile.kick}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null)).then((d) => d?.livestream && { platform: 'kick', url: `https://kick.com/${profile.kick}`, title: String(d.livestream.session_title ?? '').slice(0, 140) }));
  }
  const found = (await Promise.allSettled(tries)).map((x) => (x.status === 'fulfilled' ? x.value : null)).filter(Boolean);
  const order = { twitch: 0, youtube: 1, kick: 2 };
  return found.sort((a, b) => order[a.platform] - order[b.platform])[0] ?? null;
}

export const livePanel = (row) => message({ accent: 'win', mentions: { parse: [] }, blocks: [
  header({ eyebrow: `NOREX UNITED · Live · ${row.platform}`, title: `${it('live')} ${row.name ?? 'A member'} is live`, sub: row.title || undefined, size: 3 }),
  text(`<@${row.user_id}> just went on air – drop in and say hello.`),
  sep(),
  footer('Streaming from their profile on the site'),
  buttons([{ label: 'Watch live', url: row.url }]),
] });

export async function memberLiveCron(env, now = Date.now(), fetcher = fetch) {
  if (!env.DB) return { checked: 0, live: 0, posted: 0 };
  const cursor = Number((await one(env, "SELECT value FROM meta WHERE key = 'memberlive_cursor'"))?.value ?? 0);
  const members = await all(env, `SELECT p.user_id, p.twitch, p.youtube, p.kick, u.name FROM profiles p JOIN users u ON u.id = p.user_id
    WHERE (p.twitch != '' OR p.youtube != '' OR p.kick != '') ORDER BY p.user_id`);
  if (!members.length) return { checked: 0, live: 0, posted: 0 };
  const start = cursor % members.length;
  const batch = [...members.slice(start), ...members.slice(0, start)].slice(0, PER_RUN);
  if (start + batch.length !== cursor) await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('memberlive_cursor', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(String(start + batch.length)).run(); // skip the no-op write when everyone fits in one run
  const channel = (await one(env, "SELECT value FROM meta WHERE key = 'announce_channel'"))?.value;
  let live = 0, posted = 0;
  for (const m of batch) {
    const found = await liveOf(m, fetcher).catch(() => null);
    const cur = await one(env, 'SELECT * FROM member_live WHERE user_id = ?', m.user_id);
    if (!found) { if (cur) await env.DB.prepare('DELETE FROM member_live WHERE user_id = ?').bind(m.user_id).run(); continue; }
    live++;
    const sameStream = cur && cur.platform === found.platform;
    await env.DB.prepare(`INSERT INTO member_live (user_id, platform, url, title, since, at, announced_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET platform = excluded.platform, url = excluded.url, title = excluded.title, at = excluded.at, since = ?, announced_at = ?`)
      .bind(m.user_id, found.platform, found.url, found.title ?? '', now, now, null, sameStream ? cur.since : now, sameStream ? cur.announced_at : null).run();
    if (!(sameStream && cur.announced_at) && channel && env.DISCORD_BOT_TOKEN) {
      const r = await postEmbed(env, channel, '', livePanel({ ...found, user_id: m.user_id, name: m.name })).catch(() => null);
      if (r?.ok) { await env.DB.prepare('UPDATE member_live SET announced_at = ? WHERE user_id = ?').bind(now, m.user_id).run(); posted++; }
    }
  }
  return { checked: batch.length, live, posted };
}

export async function memberLiveRoute(p, method, me, env) {
  if (p !== '/api/live/members') return null;
  if (method !== 'GET') return fail('Not found', 404);
  if (!flagOn(env, me, 'memberLive')) return fail('Not available yet.', 404);
  const rows = await all(env, 'SELECT l.*, u.name FROM member_live l JOIN users u ON u.id = l.user_id WHERE l.at > ? ORDER BY l.since', Date.now() - 45 * 60e3);
  return json(rows.map((r) => ({ user: r.user_id, name: r.name, platform: r.platform, url: r.url, title: r.title, since: Math.floor(r.since / 1000) })));
}
