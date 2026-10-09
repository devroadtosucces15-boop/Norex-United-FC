// Per-command control for the Discord bot (owner panel in the Boardroom):
//   enabled · min role (guest…owner) · allowed channels · private/public reply · post-to channel.
// Stored as one JSON blob in D1 meta key `bot_commands`.
//   GET  /api/bot/commands        owner: the table (every command + its settings + the channel list)
//   POST /api/bot/commands        owner: save { commands: { name: {…} } }
//   POST /api/bot/commands/sync   owner: re-register the slash commands with Discord right now
// The Worker enforces everything on every interaction (so the rules apply even before a sync); the sync only
// changes what Discord *shows* (hidden / staff-only commands), see buildRegistration() in commanddefs.js.
import { can, atLeast, ROLES } from './roles.js';
import { COMMANDS, buildRegistration } from './commanddefs.js';
import { discordTargets } from './docs.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const ID = /^\d{5,25}$/;
const REPLIES = ['default', 'private', 'public'];

export async function getCommandSettings(env) {
  if (!env.DB) return {};
  const row = await env.DB.prepare("SELECT value FROM meta WHERE key = 'bot_commands'").first();
  try { return row?.value ? JSON.parse(row.value) : {}; } catch { return {}; }
}

// Keep only known commands and valid values; drop entries equal to the defaults.
export function cleanCommandSettings(input) {
  const names = new Set(COMMANDS.map((c) => c.name));
  const out = {};
  for (const [name, v] of Object.entries(input && typeof input === 'object' ? input : {})) {
    if (!names.has(name) || !v || typeof v !== 'object') continue;
    const s = {};
    if (v.enabled === false) s.enabled = false;
    if (ROLES.includes(v.min)) s.min = v.min;
    const channels = (Array.isArray(v.channels) ? v.channels : []).map(String).filter((x) => ID.test(x)).slice(0, 25);
    if (channels.length) s.channels = channels;
    if (REPLIES.includes(v.reply) && v.reply !== 'default') s.reply = v.reply;
    if (ID.test(String(v.postTo ?? ''))) s.postTo = String(v.postTo);
    if (Object.keys(s).length) out[name] = s;
  }
  return out;
}

// → null when the person may run it, else the ephemeral message to show.
// Owners are never blocked; managers ignore channel limits (so they can always fix a bad setting).
export async function commandBlocked(env, name, who, channelId, settings) {
  const s = (settings ?? await getCommandSettings(env))[name];
  if (!s) return null;
  if (who.role === 'owner') return null;
  if (s.enabled === false) return '🔕 That command is switched off right now.';
  if (s.min && s.min !== 'guest') {
    let ok = atLeast(who.role, s.min);
    if (!ok && s.min === 'claimed' && env.DB && who.u) ok = !!(await env.DB.prepare("SELECT 1 AS x FROM claims WHERE user_id = ? AND status = 'approved'").bind(who.u).first());
    if (!ok) return `🔒 /${name} is for ${s.min === 'claimed' ? 'verified players' : s.min + 's'} and up.`;
  }
  if (s.channels?.length && !atLeast(who.role, 'manager') && !s.channels.includes(channelId)) return `📍 Use /${name} in ${s.channels.map((c) => `<#${c}>`).join(' or ')}.`;
  return null;
}

// Applies private/public + post-to to an immediate (type 4) reply. Anything else passes through untouched.
export async function shapeReply(env, name, res, settings) {
  const s = (settings ?? await getCommandSettings(env))[name];
  if (!s || !(s.reply || s.postTo) || !res || typeof res.json !== 'function') return res;
  let body;
  try { body = await res.clone().json(); } catch { return res; }
  if (body?.type !== 4 || !body.data) return res;
  if (s.postTo && env.DISCORD_BOT_TOKEN && !(body.data.flags & 64)) {
    const { flags, ...msg } = body.data;
    const r = await fetch(`https://discord.com/api/v10/channels/${s.postTo}/messages`, {
      method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...msg, allowed_mentions: msg.allowed_mentions ?? { parse: [] } }),
    }).catch(() => null);
    if (r?.ok) return json({ type: 4, data: { content: `✅ Posted in <#${s.postTo}>.`, flags: 64 } });
  }
  if (s.reply === 'private') body.data.flags = (body.data.flags ?? 0) | 64;
  else if (s.reply === 'public') body.data.flags = (body.data.flags ?? 0) & ~64;
  return json(body);
}

export async function syncCommands(env, settings) {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_APP_ID) return { ok: false, error: 'The bot token / app id are not set on the Worker.' };
  const list = buildRegistration(COMMANDS, settings);
  const r = await fetch(`https://discord.com/api/v10/applications/${env.DISCORD_APP_ID}/commands`, {
    method: 'PUT', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(list),
  });
  if (!r.ok) return { ok: false, error: `Discord said ${r.status}: ${(await r.text()).slice(0, 200)}` };
  return { ok: true, count: list.length };
}

export async function botCommandsRoute(p, method, body, me, env, log) {
  if (p !== '/api/bot/commands' && p !== '/api/bot/commands/sync') return null;
  if (!can(me, 'settings.bot')) return fail('Owner only.', 403);
  if (p === '/api/bot/commands/sync') {
    if (method !== 'POST') return fail('Not found', 404);
    const r = await syncCommands(env, await getCommandSettings(env));
    if (r.ok) await log?.(env, me, 'bot-commands-sync', `Synced ${r.count} commands to Discord`);
    return r.ok ? json(r) : fail(r.error, 502);
  }
  if (method === 'GET') {
    const settings = await getCommandSettings(env);
    const t = await discordTargets(env).catch(() => ({ ready: false }));
    return json({
      commands: COMMANDS.map((c) => ({ name: c.name, description: c.description, staff: !!c.default_member_permissions, ...(settings[c.name] ?? {}) })),
      channels: t.ready ? t.channels : [], channelsError: t.ready ? '' : (t.error ?? ''),
    });
  }
  if (method !== 'POST') return fail('Not found', 404);
  const clean = cleanCommandSettings(body.commands);
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('bot_commands', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(clean)).run();
  await log?.(env, me, 'bot-commands', 'Updated per-command bot settings');
  return json({ ok: true, saved: Object.keys(clean).length });
}
