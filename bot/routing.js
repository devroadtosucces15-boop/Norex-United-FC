// Notification routing – the owner's one table for "when X happens, tell Y, this way".
//   GET  /api/bot/routes   owner: { rules, actions, groups, methods }
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
  dm: 'Bell + Discord DM',
  channel: 'Post in a channel',
  tag: 'Post + tag the group',
  everyone: 'Post + tag @everyone',
};

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
  const rules = (await loadRules(env)).filter((r) => r.action === action && r.on !== false);
  if (!rules.length) return null;
  const out = { notified: 0, posts: [], errors: [] };
  const cache = {};
  const people = (g) => (cache[g] ??= peopleOf(env, g, ctx));
  const settings = await getBotSettings(env);
  for (const r of rules) {
    try {
      if (r.method === 'dm') {
        const ids = await people(r.group);
        if (ids.length && ctx.notify) out.notified += (await notify(env, ids, r.force ? { ...ctx.notify, force: true } : ctx.notify)) ?? 0;
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
  if (p !== '/api/bot/routes') return null;
  if (!can(me, 'settings.bot')) return fail('Owner only.', 403);
  if (method === 'GET') return json({ rules: await loadRules(env), actions: ACTIONS, groups: GROUPS, methods: METHODS });
  if (method !== 'POST') return fail('Not found', 404);
  const { rules, error } = cleanRules(body.rules);
  if (error) return fail(error);
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('notify_routes', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(rules)).run();
  await log?.(env, me, 'notify-routes', `${rules.length} rule${rules.length === 1 ? '' : 's'}`);
  return json({ rules, actions: ACTIONS, groups: GROUPS, methods: METHODS });
}
