// Alerts channel: new site posts and live streams also go to one fixed Discord channel (Staff Tools → Bot → "Alerts channel").
//   Flag `alertRoute` (off = nothing posts, owner/managers/members/public = on; flipped in the Boardroom's Switches tab).
//   Settings (bot_settings): `alertChannel` (Discord channel ID) and `autoPosts.posts` / `autoPosts.live` (one toggle per kind).
//   POST /api/bot/alerts/test { kind: 'posts'|'live' }   owner: sends the real card to the owner's own Discord DMs only –
//   the handler ignores any channel or recipient in the request, so a test can never reach members.
// Posts go through postEmbed with `remember: false`: this channel must not replace the shared `announce_channel`.
import { can, flagOn } from './roles.js';
import { getBotSettings } from './settings.js';
import { postEmbed } from './docs.js';
import { message, header, text, sep, footer, buttons } from './ui.js';
import { it } from './icons.js';

export const KINDS = ['posts', 'live'];
const TAGS = { chat: ['💬', 'Chat'], highlight: ['🎬', 'Highlight'], league: ['🏟️', 'League'], rush: ['⚡', 'Rush'] }; // same keys as bot/feed.js
const excerpt = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);

// The card for one new feed post. Mentions are switched off: the text is a member's, never a ping.
export function postAlertCard(env, p) {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/');
  const [icon, label] = TAGS[p.tag] ?? TAGS.chat;
  return message({ mentions: { parse: [] }, blocks: [
    header({ eyebrow: `NOREX UNITED · New post · ${label}`, title: `${icon} ${p.name ?? 'A member'}`, size: 3 }),
    text(excerpt(p.text, 400) || (p.media ? '📎 Shared a photo or clip' : '(no text)')),
    sep(),
    footer('Posted on the club feed'),
    buttons([{ label: 'Open post', url: `${site}feed.html#p${p.id}` }]),
  ] });
}

// Where `kind` posts right now, or null (flag off, toggle off, no channel set, no bot token).
export async function alertTarget(env, kind) {
  if (!KINDS.includes(kind) || !env.DB || !env.DISCORD_BOT_TOKEN || !flagOn(env, { role: 'owner' }, 'alertRoute')) return null;
  const s = await getBotSettings(env);
  return s.autoPosts?.[kind] && /^\d{5,25}$/.test(s.alertChannel) ? s.alertChannel : null;
}

// Posts `card` to the alerts channel. `not` = a channel this event already went to (no double post). Never throws.
export async function postAlert(env, kind, card, { not } = {}) {
  try {
    const channel = await alertTarget(env, kind);
    if (!channel || channel === String(not ?? '')) return null;
    return await postEmbed(env, channel, '', card, { remember: false });
  } catch (e) { console.log('alert route failed', e.message); return null; }
}

const SAMPLES = {
  posts: (env) => postAlertCard(env, { id: 0, tag: 'highlight', name: 'Sample Player', text: 'Test alert: this is how a new site post will look in the alerts channel.' }),
  live: () => message({ accent: 'win', mentions: { parse: [] }, blocks: [
    header({ eyebrow: 'NOREX UNITED · Live · Twitch', title: `${it('live')} Sample Player is live`, sub: 'Test alert', size: 3 }),
    text('Test alert: this is how a live stream will look in the alerts channel.'),
  ] }),
};

export async function alertRoute(p, method, body, me, env, log) {
  if (p !== '/api/bot/alerts/test') return null;
  if (!can(me, 'settings.bot')) return fail('Owner only.', 403);
  if (method !== 'POST') return fail('Not found', 404);
  const kind = KINDS.includes(body.kind) ? body.kind : 'posts';
  if (!env.DISCORD_BOT_TOKEN) return fail('The bot token is not set on the Worker.', 503);
  const h = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' };
  const dm = await fetch('https://discord.com/api/v10/users/@me/channels', { method: 'POST', headers: h, body: JSON.stringify({ recipient_id: me.u }) });
  const d = await dm.json().catch(() => ({}));
  if (!dm.ok || !d.id) return fail('Could not open a DM with you – check that you accept DMs from server members.', 502);
  const r = await postEmbed(env, d.id, '', SAMPLES[kind](env), { remember: false });
  if (!r.ok) return fail(r.error, 502);
  await log?.(env, me, 'alert-test', kind);
  return json({ ok: true, sentTo: 'your DMs', channel: (await getBotSettings(env)).alertChannel, active: !!(await alertTarget(env, kind)) });
}
