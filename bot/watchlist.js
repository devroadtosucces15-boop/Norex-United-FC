// Watch list – Pro Clubs YouTube videos worth the squad's time, sorted by topic.
//   managers  /watchlist add <link> [channel] [name] · remove · list   the creators the bot follows. Paste any YouTube link (channel,
//             @handle, or one of their videos) – no IDs to look up. `channel` picks where their new videos post (default: the shared announce channel).
//   members   /watch [topic]                                          the latest videos, newest first
//   cron      about once an hour: each creator's public RSS feed (no API key) → new videos stored, topic-sorted, and the new
//             ones posted to the announce channel with "👍 Useful · n" and a Watch button
//   site      GET /api/watchlist?topic=&limit=&related=    ·    POST /api/watchlist/<id>/useful
// Topics come from keyword rules on the title: builds · tactics · tips · meta · news. Positions found in the title become tags,
// which `related=<position>` uses (a build page can ask for "CAM" videos). Flag `watchlist` (owner first).
import { can, flagOn } from './roles.js';
import { message, notice, reply, header, text, sep, footer, buttons, cards } from './ui.js';
import { postEmbed } from './docs.js';
import { routeOr, pinged, publicRoutes } from './routing.js';

export const WATCH_COMMANDS = new Set(['watchlist', 'watch']);
export const WATCH_BUTTON = /^norex:wl:/;
export const TOPICS = ['builds', 'tactics', 'tips', 'meta', 'news'];
const TOPIC_ICON = { builds: '🛠️', tactics: '📐', tips: '💡', meta: '🔥', news: '📰' };
const RULES = [
  ['builds', /\b(build|builds|archetype|attributes?|play ?styles?|skill points?|ap\b)/i],
  ['tactics', /\b(tactics?|formation|shape|positioning|set[- ]?pieces?|corners?|defending|pressing|instructions?|roles?)\b/i],
  ['meta', /\b(meta|op\b|broken|best (build|position|formation)|patch|nerf|buff|season \d+)/i],
  ['news', /\b(news|release|announce|trailer|reveal|leak|update|totw|team of the)/i],
];
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
const MAX_CREATORS = 30, FEED_EVERY = 55 * 60e3, POST_MAX_AGE = 3 * 864e5, POST_CAP = 3;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const say = (title, body) => reply(notice(title, body));
const upd = (m) => ({ type: 7, data: { components: m.components, allowed_mentions: { parse: [] } } });
const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results ?? []);
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

// ---------- setup by link ----------
// Any of: channel link (/channel/UC…, /@handle, /c/x, /user/x), a video link (watch?v=, youtu.be/, shorts/), @handle, or a bare UC id.
export function parseSource(input) {
  const raw = String(input ?? '').trim().replace(/^<|>$/g, '');
  if (/^UC[\w-]{22}$/.test(raw)) return { id: raw };
  if (/^@[\w.-]{2,60}$/.test(raw)) return { page: `https://www.youtube.com/${raw}` };
  let u; try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, '');
  if (host === 'youtu.be') { const v = u.pathname.split('/')[1]; return /^[\w-]{6,20}$/.test(v ?? '') ? { page: `https://www.youtube.com/watch?v=${v}` } : null; }
  if (host !== 'youtube.com') return null;
  const seg = u.pathname.split('/').filter(Boolean);
  if (seg[0] === 'channel' && /^UC[\w-]{22}$/.test(seg[1] ?? '')) return { id: seg[1] };
  if (seg[0]?.startsWith('@')) return { page: `https://www.youtube.com/${seg[0]}` };
  if ((seg[0] === 'c' || seg[0] === 'user') && seg[1]) return { page: `https://www.youtube.com/${seg[0]}/${encodeURIComponent(seg[1])}` };
  if (seg[0] === 'shorts' && seg[1]) return { page: `https://www.youtube.com/watch?v=${seg[1]}` };
  if (seg[0] === 'watch' && /^[\w-]{6,20}$/.test(u.searchParams.get('v') ?? '')) return { page: `https://www.youtube.com/watch?v=${u.searchParams.get('v')}` };
  return null;
}
// Link → { id, name } from the channel's public feed (its title is the creator's name). Null when it can't be found.
export async function resolveSource(input, fetcher = fetch) {
  const src = parseSource(input);
  if (!src) return null;
  const get = (url) => fetcher(url, { headers: { 'User-Agent': 'Mozilla/5.0 NorexUnitedBot/1.0', Cookie: 'CONSENT=YES+1' }, signal: AbortSignal.timeout(2000) }).catch(() => null);
  let id = src.id;
  if (!id) {
    const r = await get(src.page);
    const html = r?.ok ? await r.text() : '';
    id = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ?? html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/)?.[1];
  }
  if (!id) return null;
  const f = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  if (!f?.ok) return null; // not a real channel
  const name = clean(decode((await f.text()).match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''), 60);
  return { id, name };
}

export function topicOf(title) {
  for (const [topic, re] of RULES) if (re.test(title)) return topic;
  return 'tips';
}
export function tagsOf(title) {
  const up = String(title).toUpperCase();
  return POSITIONS.filter((p) => new RegExp(`(^|[^A-Z])${p}($|[^A-Z])`).test(up));
}
const decode = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
// No DOM in a Worker: the feed is regular enough to read with patterns.
export function parseFeed(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1], pick = (re) => e.match(re)?.[1];
    const id = pick(/<yt:videoId>([\w-]{6,20})<\/yt:videoId>/);
    const title = pick(/<title>([\s\S]*?)<\/title>/);
    if (!id || !title) continue;
    out.push({
      id, title: clean(decode(title), 140), published: Date.parse(pick(/<published>([^<]+)<\/published>/) ?? '') || 0,
      thumb: pick(/<media:thumbnail[^>]*url="([^"]+)"/) ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      channel: clean(decode(pick(/<author>\s*<name>([\s\S]*?)<\/name>/) ?? ''), 60),
    });
  }
  return out;
}

// ---------- the Discord post ----------
export function videoPanel(v, useful) {
  return message({ accent: 'red', mentions: { parse: [] }, blocks: [
    header({ eyebrow: `NOREX UNITED · New video · ${TOPIC_ICON[v.topic] ?? ''} ${v.topic}`, title: v.title, sub: v.channel_name, size: 3 }),
    cards({ url: v.thumb, alt: v.title }),
    sep(),
    buttons([{ label: `👍 Useful · ${useful}`, id: `norex:wl:useful:${v.id}` }, { label: 'Watch', url: watchUrl(v.id) }]),
  ] });
}
const usefulCount = async (env, id) => (await one(env, 'SELECT COUNT(*) AS n FROM watch_useful WHERE video_id = ?', id))?.n ?? 0;

// ---------- cron ----------
export async function watchlistCron(env, now = Date.now(), fetcher = fetch) {
  if (!env.DB) return { stored: 0, posted: 0 };
  const last = Number((await one(env, "SELECT value FROM meta WHERE key = 'watch_checked'"))?.value ?? 0);
  if (now - last < FEED_EVERY) return { stored: 0, posted: 0 };
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('watch_checked', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(String(now)).run();
  const creators = await all(env, 'SELECT * FROM watch_creators WHERE active = 1');
  let stored = 0;
  for (const c of creators) {
    const r = await fetcher(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.channel_id}`, { headers: { 'User-Agent': 'NorexUnitedBot/1.0' } }).catch(() => null);
    if (!r?.ok) continue;
    const first = c.seen_at == null; // a creator just added: take the backlog silently, only recent uploads get posted
    for (const v of parseFeed(await r.text()).slice(0, 15)) {
      const fresh = v.published > now - POST_MAX_AGE;
      const ins = await env.DB.prepare('INSERT OR IGNORE INTO watch_videos (id, channel_id, channel_name, title, thumb, published, topic, tags, at, posted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(v.id, c.channel_id, c.name || v.channel, v.title, v.thumb, v.published, topicOf(v.title), JSON.stringify(tagsOf(v.title)), now, first && !fresh ? now : null).run();
      if (ins.meta?.changes) stored++;
    }
    await env.DB.prepare('UPDATE watch_creators SET seen_at = ? WHERE channel_id = ?').bind(now, c.channel_id).run();
  }
  let posted = 0;
  const shared = (await one(env, "SELECT value FROM meta WHERE key = 'announce_channel'"))?.value;
  if (env.DISCORD_BOT_TOKEN) {
    const fresh = await all(env, `SELECT v.*, c.post_channel FROM watch_videos v LEFT JOIN watch_creators c ON c.channel_id = v.channel_id
      WHERE v.posted_at IS NULL AND v.published > ? ORDER BY v.published LIMIT ?`, now - POST_MAX_AGE, POST_CAP);
    for (const v of fresh) {
      const channel = v.post_channel || shared;
      if (!channel && !(await publicRoutes(env, 'creator.video')).managed) continue;
      // Claim the video first: two overlapping checks can never post it twice. A failed send gives the claim back.
      const claim = await env.DB.prepare('UPDATE watch_videos SET posted_at = ? WHERE id = ? AND posted_at IS NULL').bind(now, v.id).run();
      if (!claim.meta?.changes) continue;
      const panel = videoPanel(v, 0);
      const r = await routeOr(env, 'creator.video', { build: (o) => pinged(panel, o), channel }, () => postEmbed(env, channel, '', panel, { remember: false })).catch(() => null);
      if (!r?.ok) { await env.DB.prepare('UPDATE watch_videos SET posted_at = NULL WHERE id = ?').bind(v.id).run(); break; }
      posted++;
    }
  }
  // Older unposted rows are not worth a post any more.
  await env.DB.prepare('UPDATE watch_videos SET posted_at = ? WHERE posted_at IS NULL AND published <= ?').bind(now, now - POST_MAX_AGE).run();
  return { stored, posted };
}

// ---------- commands ----------
function listPanel(rows, topic) {
  if (!rows.length) return message({ ephemeral: true, accent: 'steel', blocks: [text('**No videos yet**\nThe watch list fills up as the creators upload.')] });
  return message({ ephemeral: true, blocks: [
    header({ eyebrow: 'NOREX UNITED · Watch list', title: topic ? `${TOPIC_ICON[topic]} ${topic[0].toUpperCase()}${topic.slice(1)}` : '🎬 Latest videos', sub: 'Pro Clubs creators the squad follows', size: 3 }),
    text(rows.map((v) => `${TOPIC_ICON[v.topic] ?? ''} [${v.title}](${watchUrl(v.id)})\n-# ${v.channel_name} · <t:${Math.floor(v.published / 1000)}:R>`).join('\n\n')),
  ] });
}

export async function watchCommand(i, env, ctx, who, now = Date.now()) {
  if (!flagOn(env, who, 'watchlist')) return say('This isn’t switched on yet', 'The watch list is being tested.');
  if (!env.DB) return say('The member database isn’t connected');
  try {
    if (i.data.name === 'watch') {
      const topic = TOPICS.includes(i.data.options?.[0]?.value) ? i.data.options[0].value : null;
      const rows = await all(env, `SELECT * FROM watch_videos ${topic ? 'WHERE topic = ?' : ''} ORDER BY published DESC LIMIT 6`, ...(topic ? [topic] : []));
      return reply(listPanel(rows, topic));
    }
    if (!can(who, 'watchlist.manage')) return say('Only managers can change the watch list', 'Ask a manager to add a creator.');
    const sub = i.data.options?.[0], o = Object.fromEntries((sub?.options ?? []).map((x) => [x.name, x.value]));
    if (sub?.name === 'add') {
      const found = await resolveSource(o.source);
      if (!found) return say('I couldn’t find that channel', 'Paste a YouTube channel link, an @handle, or a link to one of their videos.');
      if ((await one(env, 'SELECT COUNT(*) AS n FROM watch_creators WHERE active = 1'))?.n >= MAX_CREATORS) return say('That’s 30 creators', 'Remove one first.');
      const name = clean(o.name, 60) || found.name || found.id;
      const chan = /^\d{5,25}$/.test(String(o.channel ?? '')) ? String(o.channel) : null;
      await env.DB.prepare('INSERT INTO watch_creators (channel_id, name, added_by, at, active, post_channel) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT (channel_id) DO UPDATE SET name = excluded.name, active = 1, post_channel = excluded.post_channel').bind(found.id, name, i.member?.user?.id ?? '', now, chan).run();
      return reply(notice(`Following ${name}`, `Their latest videos appear within the hour; new uploads post once in ${chan ? `<#${chan}>` : 'the announce channel'}.`, { accent: 'win' }));
    }
    if (sub?.name === 'remove') {
      const key = String(o.channel ?? '').trim(), id = parseSource(key)?.id ?? key;
      const r = await env.DB.prepare('UPDATE watch_creators SET active = 0 WHERE channel_id = ? OR lower(name) = lower(?)').bind(id, key).run();
      return r.meta?.changes ? say('Stopped following', 'Their videos stay on the list.') : say('Not found', 'Use the channel ID or the name shown in /watchlist list.');
    }
    const rows = await all(env, 'SELECT * FROM watch_creators WHERE active = 1 ORDER BY name');
    return reply(message({ ephemeral: true, accent: 'steel', blocks: [header({ eyebrow: 'Staff · Watch list', title: `🎬 ${rows.length} creator${rows.length === 1 ? '' : 's'}`, size: 3 }), text(rows.map((r) => `**${r.name}** · ${r.post_channel ? `<#${r.post_channel}>` : 'announce channel'} · \`${r.channel_id}\``).join('\n') || 'None yet – /watchlist add')] }));
  } catch (e) {
    return say('Something went wrong', String(e.message ?? e).slice(0, 200));
  }
}

export async function watchButton(i, env, who) {
  if (!flagOn(env, who, 'watchlist')) return say('This isn’t switched on yet');
  if (!env.DB) return say('The member database isn’t connected');
  const [, , kind, id] = String(i.data?.custom_id ?? '').split(':');
  if (kind !== 'useful') return say('Unknown button');
  if (!can(who, 'watchlist.view')) return say('Members only', 'Link your Discord account on the site first.');
  const v = await one(env, 'SELECT * FROM watch_videos WHERE id = ?', id);
  if (!v) return say('That video is gone');
  const me = i.member?.user?.id ?? i.user?.id;
  const had = await one(env, 'SELECT 1 AS x FROM watch_useful WHERE video_id = ? AND user_id = ?', id, me);
  if (had) await env.DB.prepare('DELETE FROM watch_useful WHERE video_id = ? AND user_id = ?').bind(id, me).run();
  else await env.DB.prepare('INSERT OR IGNORE INTO watch_useful (video_id, user_id) VALUES (?, ?)').bind(id, me).run();
  return upd(videoPanel(v, await usefulCount(env, id)));
}

// ---------- site API ----------
export async function watchlistRoute(p, method, body, me, env, url) {
  if (p !== '/api/watchlist' && !/^\/api\/watchlist\/[\w-]{6,20}\/useful$/.test(p)) return null;
  if (!flagOn(env, me, 'watchlist')) return fail('Not available yet.', 404);
  if (!can(me, 'watchlist.view')) return fail('Members only.', 403);
  if (p !== '/api/watchlist') {
    if (method !== 'POST') return fail('Not found', 404);
    const id = p.split('/')[3];
    if (!(await one(env, 'SELECT 1 AS x FROM watch_videos WHERE id = ?', id))) return fail('Video not found.', 404);
    const had = await one(env, 'SELECT 1 AS x FROM watch_useful WHERE video_id = ? AND user_id = ?', id, me.u);
    if (had) await env.DB.prepare('DELETE FROM watch_useful WHERE video_id = ? AND user_id = ?').bind(id, me.u).run();
    else await env.DB.prepare('INSERT OR IGNORE INTO watch_useful (video_id, user_id) VALUES (?, ?)').bind(id, me.u).run();
    return json({ id, useful: await usefulCount(env, id), mine: !had });
  }
  if (method !== 'GET') return fail('Not found', 404);
  const q = url?.searchParams ?? new URLSearchParams();
  const topic = TOPICS.includes(q.get('topic')) ? q.get('topic') : null;
  const limit = Math.min(50, Math.max(1, Number(q.get('limit')) || 20));
  const rel = String(q.get('related') ?? '').trim();
  const where = [], args = [me.u];
  if (topic) { where.push('v.topic = ?'); args.push(topic); }
  if (rel) {
    if (TOPICS.includes(rel)) { where.push('v.topic = ?'); args.push(rel); }
    else if (POSITIONS.includes(rel.toUpperCase())) { where.push('v.tags LIKE ?'); args.push(`%"${rel.toUpperCase()}"%`); }
  }
  const rows = await all(env, `SELECT v.*, (SELECT COUNT(*) FROM watch_useful x WHERE x.video_id = v.id) AS useful,
      EXISTS (SELECT 1 FROM watch_useful x WHERE x.video_id = v.id AND x.user_id = ?) AS mine
    FROM watch_videos v ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY v.published DESC LIMIT ${limit}`, ...args);
  return json(rows.map((r) => ({
    id: r.id, title: r.title, channel: r.channel_name, url: watchUrl(r.id), thumb: r.thumb, topic: r.topic,
    tags: JSON.parse(r.tags || '[]'), published: Math.floor(r.published / 1000), useful: r.useful, mine: !!r.mine,
  })));
}
