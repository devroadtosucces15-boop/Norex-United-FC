// /streamalerts (owner): stream and post alerts for the club's main channel or for contributors (member channels).
//   /streamalerts add source:(Main club channel | Contributor) link:<channel link> [channel] [member] [name] [what]
//   /streamalerts list · remove id · test id (the card goes to you only)
//   cron (10 min, flag `streamAlerts`): live checks on Twitch, YouTube and Kick; new YouTube videos and Shorts.
// Everything is announced once: a live claim is one atomic UPDATE per stream, and every video is claimed in `stream_seen`
// (primary key) before it is posted. Adding a source never posts old uploads. Alerts go to the source's own channel and never
// become the shared announce channel. With the flag on, the old live posts in bot/live.js and bot/memberlive.js stop.
// Twitch and Kick posts (clips) need API access we do not have: live works on all three, posts on YouTube only.
import { can, flagOn } from './roles.js';
import { message, notice, reply, header, text, sep, facts, footer, buttons, cards, bannerUrl } from './ui.js';
import { it } from './icons.js';
import { postEmbed } from './docs.js';
import { getBotSettings } from './settings.js';
import { liveOf } from './memberlive.js';
import { parseFeed } from './watchlist.js';

export const STREAM_COMMANDS = new Set(['streamalerts']);
export const streamAlertsOn = (env) => flagOn(env, { role: 'owner' }, 'streamAlerts');
const PER_RUN = 10, MAX_SOURCES = 40, BLIP_GAP = 3 * 3600e3, POST_MAX_AGE = 3 * 864e5, POST_CAP = 3;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const PLATFORM = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick' };
const say = (title, body) => reply(notice(title, body));
const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results ?? []);
const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

// A pasted link (or bare handle with a platform link) → { platform, handle, url }, or null.
export function parseLink(input) {
  const s = String(input ?? '').trim();
  let m = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/([A-Za-z0-9_]{3,25})(?:[/?#].*)?$/i);
  if (m) return { platform: 'twitch', handle: m[1].toLowerCase(), url: `https://www.twitch.tv/${m[1].toLowerCase()}` };
  m = s.match(/^(?:https?:\/\/)?(?:www\.)?kick\.com\/([A-Za-z0-9_-]{3,25})(?:[/?#].*)?$/i);
  if (m) return { platform: 'kick', handle: m[1].toLowerCase(), url: `https://kick.com/${m[1].toLowerCase()}` };
  m = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(@[A-Za-z0-9._-]{3,30}|channel\/UC[A-Za-z0-9_-]{22})(?:[/?#].*)?$/i);
  if (m) return { platform: 'youtube', handle: m[1], url: `https://www.youtube.com/${m[1]}` };
  return null;
}

// ---------- the Discord cards (same panels as the post-match stats and the DJ: eyebrow, big picture, facts, link buttons) ----------
const who = (src) => (src.scope === 'main' ? 'NOREX' : src.label || 'A contributor');
// The big picture: the stream's own preview while it is live, else the banner drawn for the site (scripts/cards.mjs).
function preview(src, v, env, now) {
  if (v.live !== false && v.preview) return `${v.preview}${v.preview.includes('?') ? '&' : '?'}t=${Math.floor(now / 60e3)}`; // the frame the platform gave us at pull time
  if (src.platform === 'twitch') return v.live === false ? bannerUrl(env, 'channel') : `https://static-cdn.jtvnw.net/previews-ttv/live_user_${src.handle}-1280x720.jpg?t=${Math.floor(now / 60e3)}`;
  if (src.platform === 'youtube' && v.url?.includes('watch?v=') && v.live !== false) return `https://i.ytimg.com/vi/${v.url.split('v=')[1]}/maxresdefault_live.jpg`;
  return bannerUrl(env, v.live === false ? 'channel' : 'onair');
}
export function livePanel(src, v, site, ephemeral = false, env = null, now = Date.now()) {
  const main = src.scope === 'main', on = v.live !== false;
  return message({ accent: on ? 'win' : 'red', ephemeral, mentions: { parse: [] }, blocks: [
    header({ eyebrow: `NOREX UNITED · ${on ? (main ? 'Live' : 'Member live') : 'Channel'} · ${PLATFORM[src.platform]}`, title: on ? `${it('live')} ${who(src)} is live` : `${it('live')} ${who(src)} on ${PLATFORM[src.platform]}`, sub: on ? v.title || undefined : 'Not live right now', size: 3 }),
    cards(preview(src, v, env, now)),
    facts([['Where', PLATFORM[src.platform]], ['Channel', src.handle.replace(/^channel\//, '')], ['Status', on ? '🟢 On air' : '⚪ Offline'], on && v.game ? ['Playing', v.game] : null, on && v.viewers != null ? ['Viewers', `${v.viewers} when posted`] : null].filter(Boolean)),
    sep(),
    footer(on ? (main ? 'Picture and viewers are a snapshot from when this was posted · drop in and say hello' : 'A NOREX contributor · snapshot from when this was posted') : 'Follow the channel to catch the next stream'),
    buttons([...(main && site ? [{ label: 'Watch on the site', url: `${site}watch.html` }] : []), { label: `Open ${PLATFORM[src.platform]}`, url: v.url || src.url }]),
  ] });
}
export function videoPanel(src, v, ephemeral = false) {
  const kind = v.short ? 'Short' : 'Video';
  return message({ accent: 'red', ephemeral, mentions: { parse: [] }, blocks: [
    header({ eyebrow: `NOREX UNITED · New ${kind.toLowerCase()} · ${src.scope === 'main' ? 'NOREX' : 'Contributor'}`, title: v.title, sub: who(src), size: 3 }),
    cards({ url: v.thumb, alt: v.title }),
    facts([['Where', 'YouTube'], ['Type', kind]]),
    sep(),
    buttons([{ label: v.short ? 'Watch the Short' : 'Watch', url: v.short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}` }, { label: 'Channel', url: src.url }]),
  ] });
}
const siteOf = (env) => (env.SITE_URL ? String(env.SITE_URL).replace(/\/?$/, '/') : '');

// ---------- cron ----------
async function ytChannel(env, src, fetcher) {
  if (src.yt_channel) return src.yt_channel;
  const id = src.handle.startsWith('channel/') ? src.handle.slice(8)
    : (await (await fetcher(src.url, { headers: { 'User-Agent': UA, Cookie: 'CONSENT=YES+1; SOCS=CAI' } })).text().catch(() => '')).match(/"(?:channelId|externalId)"\s*:\s*"(UC[\w-]{22})"/)?.[1];
  if (id) await run(env, 'UPDATE stream_sources SET yt_channel = ? WHERE id = ?', id, src.id);
  return id ?? null;
}
const isShort = (id, fetcher) => fetcher(`https://www.youtube.com/shorts/${id}`, { redirect: 'manual', headers: { 'User-Agent': UA } }).then((r) => r.status === 200).catch(() => false);

async function checkLive(env, src, now, fetcher, out) {
  const found = await liveOf({ [src.platform]: src.handle }, fetcher).catch(() => null);
  if (!found) { if (src.live) await run(env, 'UPDATE stream_sources SET live = 0 WHERE id = ?', src.id); return; }
  if (src.live) return; // still the same stream
  const recent = src.live_announced_at && now - src.live_announced_at < BLIP_GAP; // a stream that blips off and on is not a new one
  const claim = await run(env, `UPDATE stream_sources SET live = 1${recent ? '' : ', live_announced_at = ?'} WHERE id = ? AND live = 0`, ...(recent ? [] : [now]), src.id);
  if (!claim.meta?.changes || recent) return;
  const r = await postEmbed(env, src.channel_id, '', livePanel(src, found, siteOf(env), false, env, now), { remember: false });
  if (r?.ok) out.live++;
  else await run(env, 'UPDATE stream_sources SET live = 0, live_announced_at = ? WHERE id = ?', src.live_announced_at ?? null, src.id); // retry next run
}

async function checkPosts(env, src, now, fetcher, out) {
  const uc = await ytChannel(env, src, fetcher);
  if (!uc) return;
  const res = await fetcher(`https://www.youtube.com/feeds/videos.xml?channel_id=${uc}`, { headers: { 'User-Agent': 'NorexUnitedBot/1.0' } }).catch(() => null);
  if (!res?.ok) return;
  const videos = parseFeed(await res.text()).sort((a, b) => a.published - b.published);
  const seeding = !src.seeded_at;
  let posted = 0;
  for (const v of videos) {
    const fresh = v.published > now - POST_MAX_AGE;
    if (!seeding && (!fresh || posted >= POST_CAP)) { if (!fresh) await run(env, 'INSERT OR IGNORE INTO stream_seen (source_id, item_id, at) VALUES (?, ?, ?)', src.id, v.id, now); continue; }
    const claim = await run(env, 'INSERT OR IGNORE INTO stream_seen (source_id, item_id, at) VALUES (?, ?, ?)', src.id, v.id, now);
    if (!claim.meta?.changes || seeding) continue; // already announced (or just remembered on the first read)
    const r = await postEmbed(env, src.channel_id, '', videoPanel(src, { ...v, short: await isShort(v.id, fetcher) }), { remember: false });
    if (r?.ok) { posted++; out.posts++; } else await run(env, 'DELETE FROM stream_seen WHERE source_id = ? AND item_id = ?', src.id, v.id); // retry next run
  }
  if (seeding) await run(env, 'UPDATE stream_sources SET seeded_at = ? WHERE id = ?', now, src.id);
}

export async function streamAlertsCron(env, now = Date.now(), fetcher = fetch) {
  const out = { checked: 0, live: 0, posts: 0 };
  if (!env.DB || !env.DISCORD_BOT_TOKEN || !streamAlertsOn(env)) return out;
  const rows = await all(env, 'SELECT * FROM stream_sources WHERE active = 1 ORDER BY checked_at LIMIT ?', PER_RUN);
  for (const src of rows) {
    await run(env, 'UPDATE stream_sources SET checked_at = ? WHERE id = ?', now, src.id);
    out.checked++;
    try {
      if (src.want_live) await checkLive(env, src, now, fetcher, out);
      if (src.want_posts && src.platform === 'youtube') await checkPosts(env, src, now, fetcher, out);
    } catch (e) { console.log('stream alert failed', src.id, e.message); }
  }
  return out;
}

// Post the card now. Live → the live card (and the stream counts as announced, so the cron will not post it again);
// not live → the channel card ("not live right now"). Used by /streamalerts push.
export async function streamPush(env, src, now = Date.now(), fetcher = fetch) {
  const found = await liveOf({ [src.platform]: src.handle }, fetcher).catch(() => null);
  if (found) await run(env, 'UPDATE stream_sources SET live = 1, live_announced_at = ? WHERE id = ?', now, src.id);
  const r = await postEmbed(env, src.channel_id, '', livePanel(src, found ?? { live: false, url: src.url }, siteOf(env), false, env, now), { remember: false });
  return { live: !!found, ok: !!r?.ok, error: r?.error };
}

// ---------- the command ----------
const ID = /^\d{5,25}$/;
export async function streamCommand(i, env, ctx, me) {
  if (!env.DB) return say('The member database isn’t connected');
  if (!can(me, 'settings.bot')) return say('Owner only', 'Stream alerts are set up by the owner.');
  const sub = i.data.options?.[0], o = Object.fromEntries((sub?.options ?? []).map((x) => [x.name, x.value]));
  try {
    if (sub?.name === 'add') {
      const link = parseLink(o.link);
      if (!link) return say('I can’t read that link', 'Paste a Twitch, YouTube (@handle or /channel/UC…) or Kick channel link.');
      const channel = ID.test(String(o.channel ?? '')) ? String(o.channel) : (await getBotSettings(env)).alertChannel;
      if (!ID.test(String(channel))) return say('Pick a channel', 'Choose a channel in the command, or set an Alerts channel in Staff Tools → Bot.');
      if ((await one(env, 'SELECT COUNT(*) AS n FROM stream_sources WHERE active = 1'))?.n >= MAX_SOURCES) return say(`That’s ${MAX_SOURCES} sources`, 'Remove one first.');
      const scope = o.source === 'contributor' ? 'contributor' : 'main';
      const what = ['live', 'posts'].includes(o.what) ? o.what : 'both';
      const wantPosts = what !== 'live' && link.platform === 'youtube' ? 1 : 0, wantLive = what !== 'posts' ? 1 : 0;
      if (!wantLive && !wantPosts) return say('Nothing to watch', 'Posts are YouTube only for now (Twitch and Kick clips need API access). Pick Live, or a YouTube link.');
      const label = clean(o.name, 40) || (scope === 'main' ? 'NOREX' : link.handle.replace(/^@|^channel\//, ''));
      await run(env, `INSERT INTO stream_sources (scope, platform, handle, url, label, user_id, channel_id, want_live, want_posts, added_by, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (platform, handle, channel_id) DO UPDATE SET scope = excluded.scope, label = excluded.label, user_id = excluded.user_id, want_live = excluded.want_live, want_posts = excluded.want_posts, active = 1`,
        scope, link.platform, link.handle, link.url, label, ID.test(String(o.member ?? '')) ? String(o.member) : null, channel, wantLive, wantPosts, me.u, Date.now());
      if (wantLive && streamAlertsOn(env) && ctx?.waitUntil) { // already on air? announce now instead of waiting for the next 10-minute check
        const row = await one(env, 'SELECT * FROM stream_sources WHERE platform = ? AND handle = ? AND channel_id = ?', link.platform, link.handle, channel);
        ctx.waitUntil(checkLive(env, row, Date.now(), fetch, { live: 0 }).catch((e) => console.log('stream check failed', e.message)));
      }
      const note = [wantLive ? 'goes live' : null, wantPosts ? 'posts a video or Short' : null].filter(Boolean).join(' and ');
      return reply(notice(`Watching ${label}`, `I’ll post in <#${channel}> once when they ${note}. Existing videos are not posted.${streamAlertsOn(env) ? '' : '\nAlerts are switched off for now (flag `streamAlerts`), so nothing posts yet. Try `/streamalerts test` to see the card.'}${what !== 'live' && link.platform !== 'youtube' ? '\nPosts are YouTube only, so this source does live alerts only.' : ''}`, { accent: 'win' }));
    }
    if (sub?.name === 'remove') {
      const r = await run(env, 'UPDATE stream_sources SET active = 0 WHERE id = ?', Number(o.id) || 0);
      return r.meta?.changes ? say('Stopped', 'No more alerts from that source.') : say('Not found', 'Use the number shown in /streamalerts list.');
    }
    if (sub?.name === 'push') {
      const src = await one(env, 'SELECT * FROM stream_sources WHERE id = ? AND active = 1', Number(o.id) || 0);
      if (!src) return say('Not found', 'Use the number shown in /streamalerts list.');
      if (!ctx?.waitUntil) { const r = await streamPush(env, src); return r.ok ? say('Posted', `In <#${src.channel_id}> (${r.live ? 'live' : 'not live'}).`) : say('Could not post', r.error ?? 'Discord refused it.'); }
      ctx.waitUntil(streamPush(env, src).catch((e) => console.log('stream push failed', e.message)));
      return say('Posting now', `I’ll check ${src.label} and post in <#${src.channel_id}>: the live card if they are on air, otherwise the channel card.`);
    }
    if (sub?.name === 'test') {
      const src = await one(env, 'SELECT * FROM stream_sources WHERE id = ?', Number(o.id) || 0);
      if (!src) return say('Not found', 'Use the number shown in /streamalerts list.');
      const card = src.want_live || src.platform !== 'youtube'
        ? livePanel(src, { title: 'Test alert: this is how a live stream looks', url: src.url }, siteOf(env), true, env)
        : videoPanel(src, { id: 'dQw4w9WgXcQ', title: 'Test alert: this is how a new video looks', thumb: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }, true);
      return reply(card); // ephemeral: only the owner who ran it sees the card
    }
    const rows = await all(env, 'SELECT * FROM stream_sources WHERE active = 1 ORDER BY scope, label');
    return reply(message({ ephemeral: true, accent: 'steel', blocks: [
      header({ eyebrow: 'Staff · Stream alerts', title: `📡 ${rows.length} source${rows.length === 1 ? '' : 's'}`, sub: streamAlertsOn(env) ? 'Alerts are on' : 'Alerts are off (flag streamAlerts)', size: 3 }),
      text(rows.length ? rows.map((r) => `**#${r.id}** ${r.scope === 'main' ? '🏟️' : '🎙️'} [${r.label}](${r.url}) · ${PLATFORM[r.platform]} · ${[r.want_live ? 'live' : null, r.want_posts ? 'posts' : null].filter(Boolean).join(' + ')} → <#${r.channel_id}>`).join('\n') : 'Nothing yet. Add one with `/streamalerts add`.'),
    ] }));
  } catch (e) {
    return say('Something went wrong', String(e.message ?? e).slice(0, 200));
  }
}
