// Notification routing – the owner's one table for "when X happens, tell Y, this way".
//   GET  /api/bot/routes   owner: { rules, actions, groups, methods }
//   POST /api/bot/routes/test  owner: { rule } – send that one rule's message to the OWNER ONLY (the site bell, a DM, or a DM preview of a channel post); never to members or the real channel
//   POST /api/bot/routes   owner: { rules: [{ action, group, role?, method, channel?, force?, on? }] } – replaces the whole table
//   force (DM rules only) = “send even if muted”: see notify() – flag, closed DMs and a daily cap still apply, and it goes first in the DM queue.
// Each rule says: for this ACTION (new event, reminder, cancelled …) tell this GROUP (everyone, managers, who said yes …)
// this WAY (Discord DM · post in a channel · post and tag the group · post and tag @everyone), optionally in a specific
// channel. An action with no rules keeps its built-in behaviour; an action with rules uses only those, so the table is the
// single place to change where anything goes. Callers use routeNotification(); it returns null when the action has no rules.
import { can } from './roles.js';
import { notify } from './notify.js';
import { getBotSettings } from './settings.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const SNOWFLAKE = /^\d{5,25}$/;
const MAX_RULES = 60;
const TAG_MAX = 50; // people tagged by name in one post
const DAY = 86400e3;

export const ACTIONS = {
  // feature = the site switch (config.json → features) the Control Center row belongs to
  'event.created': { icon: '🗓️', label: 'New event created', feature: 'events' },
  'event.changed': { icon: '🕒', label: 'Event time changed', feature: 'events' },
  'event.cancelled': { icon: '🚫', label: 'Event cancelled', feature: 'events' },
  'event.reminder': { icon: '📅', label: 'Reminder 24 h / 2 h before', feature: 'events' },
  'event.starting': { icon: '⏰', label: 'Starting soon (minutes set in the Notification Center)', feature: 'events' },
  'event.report': { icon: '📋', label: 'Session report shared', feature: 'events' },
  // channelOnly: posted from GitHub Actions (no database there), so no DMs and no tagging of individuals – a channel, a role or @everyone
  'results.posted': { icon: '⚽', label: 'Match result posted', feature: 'results', channelOnly: true },
  'awards.results': { icon: '🏆', label: 'Weekly awards: winners revealed', feature: 'awards' },
  'hotw.winner': { icon: '🎬', label: 'Highlight of the week', feature: 'hotw' },
  'insights.weekly': { icon: '📈', label: 'Insight of the week', feature: 'statInsights' },
  'discoveries.approved': { icon: '🔎', label: 'Discovery approved by a manager', feature: 'discoveries' },
  'live.club': { icon: '🔴', label: 'Club goes live', feature: 'liveAnnounce' },
  'live.member': { icon: '🎥', label: 'A member goes live', feature: 'memberLive' },
  'live.stream': { icon: '📡', label: 'A followed stream goes live or posts', feature: 'streamAlerts' },
  'creator.video': { icon: '🎞️', label: 'New video from a followed creator', feature: 'watchlist' },
  'feed.newpost': { icon: '💬', label: 'New post on the club feed', feature: 'feed' },
  'member.welcome': { icon: '👋', label: 'Someone joins the server', feature: 'serverTools' },
  'member.leave': { icon: '🚪', label: 'Someone leaves the server (staff log)', feature: 'serverTools' },
};
export const GROUPS = {
  everyone: 'Every member',
  managers: 'Managers & owner',
  yes: 'Said yes to that event',
  going: 'Said yes or maybe',
  unanswered: 'Haven’t answered yet',
  lineup: 'In the lineup',
  role: 'A Discord role…',
};
export const METHODS = {
  web: 'Site bell only',
  dm: 'Bell + Discord DM',
  channel: 'Post in a channel',
  tag: 'Post + tag the group',
  everyone: 'Post + tag @everyone',
};

// A Discord message with a ping line above it (the routing engine's build() callback for any panel made with ui.js message()).
export const pinged = (msg, { ping, mentions } = {}) => (ping ? { ...msg, components: [{ type: 10, content: ping }, ...msg.components], allowed_mentions: mentions ?? msg.allowed_mentions } : msg);

// What an outside runner (the result poster in GitHub Actions) needs: are this action's rules managed, and where to post.
export async function publicRoutes(env, action) {
  const managed = (await loadRules(env)).filter((r) => r.action === action);
  return { managed: managed.length > 0, targets: managed.filter((r) => r.on !== false).map((r) => ({ method: r.method, channel: r.channel || '', role: r.group === 'role' ? r.role : '' })) };
}

export async function loadRules(env) {
  const row = await one(env, "SELECT value FROM meta WHERE key = 'notify_routes'");
  try { const r = JSON.parse(row?.value ?? '[]'); return Array.isArray(r) ? r : []; } catch { return []; }
}

// Returns an error string, or { rules } cleaned.
function cleanRules(list) {
  if (!Array.isArray(list)) return { error: 'Send a list of rules.' };
  if (list.length > MAX_RULES) return { error: `At most ${MAX_RULES} rules.` };
  const rules = [];
  for (const [i, r] of list.entries()) {
    const n = `Rule ${i + 1}`;
    if (!ACTIONS[r?.action]) return { error: `${n}: pick what it applies to.` };
    if (!GROUPS[r.group]) return { error: `${n}: pick who it is for.` };
    if (!METHODS[r.method]) return { error: `${n}: pick how to tell them.` };
    const channel = String(r.channel ?? '').trim(), role = String(r.role ?? '').trim();
    if (channel && !SNOWFLAKE.test(channel)) return { error: `${n}: the channel must be a Discord ID (right-click → Copy ID).` };
    if (r.group === 'role' && !SNOWFLAKE.test(role)) return { error: `${n}: pick the Discord role.` };
    if (r.group === 'role' && r.method === 'dm') return { error: `${n}: a Discord role can be tagged, not messaged. Use “tag the group” or pick a group of people.` };
    if (ACTIONS[r.action].channelOnly && (r.method === 'dm' || r.method === 'web' || (r.method === 'tag' && r.group !== 'role'))) return { error: `${n}: ${ACTIONS[r.action].label} is posted from outside the app, so it can only post in a channel, tag a Discord role, or tag @everyone.` };
    if (r.force && r.method !== 'dm') return { error: `${n}: “send even if muted” only applies to Discord DMs.` };
    rules.push({ action: r.action, group: r.group, ...(r.group === 'role' ? { role } : {}), method: r.method, ...(channel ? { channel } : {}), ...(r.force ? { force: true } : {}), on: r.on !== false });
  }
  return { rules };
}

// ctx = {
//   notify: { type, icon, title, body, link, ref }      what a DM / bell says
//   build: ({ ping, mentions }) => Discord message      what a channel post looks like (ping = the line above it)
//   channel?: fallback channel (the event's own post)
//   groups?: { yes, going, unanswered, lineup: () => Promise<ids> }   the groups only this action knows
// }
// → null when the action has no rules, else { notified, posts: [{ ok, id, channel } | { ok: false, error }], errors }
export async function routeNotification(env, action, ctx) {
  if (!env.DB) return null;
  const managed = (await loadRules(env)).filter((r) => r.action === action);
  if (!managed.length) return null; // no rules at all: the caller keeps its built-in behaviour
  const rules = managed.filter((r) => r.on !== false);
  const out = { notified: 0, posts: [], errors: [], silenced: !rules.length }; // every rule switched off = the owner silenced it
  const cache = {};
  const people = (g) => (cache[g] ??= peopleOf(env, g, ctx));
  const settings = await getBotSettings(env);
  for (const r of rules) {
    try {
      if (r.method === 'dm' || r.method === 'web') {
        const ids = await people(r.group);
        const n = r.method === 'web' ? { ...ctx.notify, route: 'site' } : r.force ? { ...ctx.notify, force: true } : ctx.notify; // web = the site bell, no Discord DM
        if (ids.length && ctx.notify) out.notified += (await notify(env, ids, n)) ?? 0;
        continue;
      }
      const channel = r.channel || ctx.channel || settings.reminderChannel
        || (await one(env, "SELECT value FROM meta WHERE key = 'announce_channel'"))?.value;
      if (!channel) { out.errors.push(`${ACTIONS[action].label}: no channel to post in – pick one on the rule.`); continue; }
      let ping = null, mentions = { parse: [] };
      if (r.method === 'everyone') { ping = '@everyone'; mentions = { parse: ['everyone'] }; }
      else if (r.method === 'tag') {
        if (r.group === 'role') { ping = `<@&${r.role}>`; mentions = { roles: [r.role] }; }
        else {
          const ids = (await people(r.group)).slice(0, TAG_MAX);
          if (ids.length) { ping = ids.map((id) => `<@${id}>`).join(' '); mentions = { users: ids }; }
        }
      }
      out.posts.push(await post(env, channel, await ctx.build({ ping, mentions })));
    } catch (e) { out.errors.push(e.message); }
  }
  for (const p of out.posts) if (!p.ok && p.error) out.errors.push(p.error);
  return out;
}

// For the channel posts that used to go to one fixed place: with rules, the rules decide; without, `legacy()` runs as before.
// Returns what postEmbed returns ({ ok, id, channel }), or { ok: true, silenced: true } when the owner switched every rule off.
// `build` makes the message (called once per rule); `channel` is the old fixed channel, kept as the fallback for rules left on "Default channel".
export async function routeOr(env, action, { build, channel, notify: n, groups } = {}, legacy) {
  const res = await routeNotification(env, action, { build, channel, notify: n, groups }).catch((e) => { console.log('route failed', action, e.message); return null; });
  if (!res) return legacy();
  if (res.silenced) return { ok: true, silenced: true };
  const posted = res.posts.find((p) => p.ok);
  return posted ?? (res.notified ? { ok: true, notified: res.notified } : { ok: false, error: res.errors[0] || res.posts[0]?.error || 'nothing sent' });
}

async function peopleOf(env, group, ctx) {
  if (group === 'everyone') return (await all(env, 'SELECT id FROM users WHERE last_at > ?', Date.now() - 180 * DAY)).map((u) => u.id);
  if (group === 'managers') return (await all(env, "SELECT id FROM users WHERE role IN ('manager', 'owner') AND last_at > ?", Date.now() - 120 * DAY)).map((u) => u.id);
  return (await ctx.groups?.[group]?.()) ?? [];
}

async function post(env, channel, msg) {
  if (!env.DISCORD_BOT_TOKEN) return { ok: false, channel, error: 'Discord is not connected.' };
  const r = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, {
    method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(msg),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, channel, error: `Discord refused the post in <#${channel}> (${r.status}${d.message ? `: ${d.message}` : ''}).` };
  return { ok: true, id: d.id, channel };
}

export async function routingRoute(p, method, body, me, env, log) {
  if (p !== '/api/bot/routes' && p !== '/api/bot/routes/test') return null;
  if (!can(me, 'settings.bot')) return fail('Owner only.', 403);
  if (p === '/api/bot/routes/test') return method === 'POST' ? testRule(body, me, env, log) : fail('Not found', 404);
  if (method === 'GET') return json({ rules: await loadRules(env), actions: ACTIONS, groups: GROUPS, methods: METHODS });
  if (method !== 'POST') return fail('Not found', 404);
  const { rules, error } = cleanRules(body.rules);
  if (error) return fail(error);
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('notify_routes', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(rules)).run();
  await log?.(env, me, 'notify-routes', `${rules.length} rule${rules.length === 1 ? '' : 's'}`);
  return json({ rules, actions: ACTIONS, groups: GROUPS, methods: METHODS });
}

// ---------- the test button: the rule as the owner has it on screen, delivered to the owner only ----------
// A sample card per action (event actions use the real match-night card). Nothing here ever reaches a member or the real channel:
// recipients are fixed to the signed-in owner, and channel posts are previewed in the owner's own DMs with pings switched off.
async function sampleFor(env, action) {
  const a = ACTIONS[action];
  const n = { type: 'test', icon: a.icon, title: `[Test] ${a.label}`, body: 'This is a test of this alert. Members were not told.', link: 'members.html#alerts' };
  if (action.startsWith('event.')) {
    const { eventMessage } = await import('./events.js');
    const e = { id: 0, type: 'league', title: 'Friday Pro Clubs night', start: Date.now() + 2 * 86400e3, duration: 120, tz: 'Europe/London', notes: 'Sample event for a test', needs: { players: 8 }, status: action === 'event.cancelled' ? 'cancelled' : 'scheduled' };
    return { notify: n, build: (o) => eventMessage(env, e, [], '', o) };
  }
  const { message, header, text, footer } = await import('./ui.js');
  return { notify: n, build: (o) => pinged(message({ blocks: [
    header({ eyebrow: 'NOREX UNITED · Test', title: `${a.icon} ${a.label}`, size: 3 }),
    text('This is how this alert will look. It is only a test – nobody else received it.'),
    footer('Sent from the Control Center'),
  ] }), o) };
}

async function testRule(body, me, env, log) {
  const { rules, error } = cleanRules([body?.rule]);
  if (error) return fail(error.replace(/^Rule 1: /, ''));
  const r = rules[0], s = await sampleFor(env, r.action);
  if (r.method === 'dm' || r.method === 'web') {
    // the owner's own bell (and DM for "dm"), whatever their alert settings say – it is a test
    const sent = await notify(env, [me.u], { ...s.notify, locked: true, ...(r.method === 'web' ? { route: 'site' } : { route: 'dm' }) });
    await log?.(env, me, 'route-test', `${r.action} · ${r.method}`);
    return json({ ok: true, sentTo: r.method === 'web' ? 'your site bell' : 'your site bell and Discord DMs', sent });
  }
  if (!env.DISCORD_BOT_TOKEN) return fail('The bot token is not set on the Worker, so a Discord preview cannot be sent.', 503);
  const settings = await getBotSettings(env);
  const channel = r.channel || settings.reminderChannel || (await one(env, "SELECT value FROM meta WHERE key = 'announce_channel'"))?.value || '';
  let ping = null;
  if (r.method === 'everyone') ping = '@everyone';
  else if (r.method === 'tag') ping = r.group === 'role' ? `<@&${r.role}>` : `${GROUPS[r.group]} (each person by name)`;
  const note = `🧪 **TEST** – nothing was posted${channel ? ` in <#${channel}>` : ' (no channel is set yet)'}. This is how it would look${ping ? `, with this tag above it: ${ping}` : ''}.`;
  const h = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' };
  const dm = await fetch('https://discord.com/api/v10/users/@me/channels', { method: 'POST', headers: h, body: JSON.stringify({ recipient_id: me.u }) });
  const d = await dm.json().catch(() => ({}));
  if (!dm.ok || !d.id) return fail('Could not open a DM with you – check that you accept DMs from server members.', 502);
  const card = await s.build({ ping: null, mentions: { parse: [] } }); // no ping line, and no mention can fire
  const msg = { ...card, components: [{ type: 10, content: note }, ...card.components], allowed_mentions: { parse: [] } };
  const res = await post(env, d.id, msg);
  if (!res.ok) return fail(res.error, 502);
  await log?.(env, me, 'route-test', `${r.action} · ${r.method} · preview`);
  return json({ ok: true, sentTo: 'your Discord DMs (a preview – nothing was posted in the channel)', channel });
}
