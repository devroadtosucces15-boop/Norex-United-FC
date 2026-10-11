// Server tools – what Miona and Carl-bot did for NOREX, now on the Worker. There is no Gateway connection here, so
// everything is a slash command, a button, or a cron check:
//   leave/join alerts  the 10-min cron compares the member list with a D1 snapshot → posts to the managers' channel
//   welcome posts      same check → a welcome message for each new member in the welcome channel
//   /purge             managers: bulk-delete recent messages (Discord only allows it for messages under 14 days old)
//   /tag  /tags        saved answers anyone can post (/tag rules @newguy); managers add and remove them
//   /remind            a reminder in this channel; managers can pick any channel and ping a role; a 1-min cron sends them
//   ping roles         /setup pingroles posts a button panel; each button turns an opt-in ping role on or off
//   /setup             managers: the leave-log channel, the welcome channel and the ping-role panel
// Reading the member list needs "Server Members Intent" switched on (Discord developer portal → Bot).
import { can, flagOn } from './roles.js';

const API = 'https://discord.com/api/v10';
const MIN = 60e3, HOUR = 36e5, DAY = 864e5;
const BULK_MAX_AGE = 14 * DAY - 5 * MIN; // Discord rejects bulk-delete for anything older than 14 days
const RED = 0xc8352c, GREEN = 0x22c55e;
const TAG_NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;
const MAX_PENDING = 25; // reminders per member
const MAX_REMIND = 60 * DAY;
const POST_CAP = 10; // separate leave/join posts per check – a mass leave is summed up in one post instead
const KEY = 'server_tools';
const DEFAULT_WELCOME = 'Welcome to the crew, {user}! 👋';

export const SERVER_COMMANDS = new Set(['setup', 'purge', 'tag', 'tags', 'remind', 'reminders']);
export const PING_ROLES = [
  { key: 'match', name: 'Match night', emoji: '⚽', blurb: 'League and match-night call-ups' },
  { key: 'rush', name: 'Rush LFG', emoji: '🎮', blurb: 'Someone is looking for a Rush squad' },
  { key: 'streams', name: 'Stream alerts', emoji: '🔴', blurb: 'A member or the club goes live' },
  { key: 'videos', name: 'New videos', emoji: '🎬', blurb: 'New FC Clubs videos worth watching' },
];

const HELP = {
  'no-access': "⚠️ Discord said no – I'm missing a permission here (Manage Messages, Manage Roles, Send Messages or Read Message History).",
  'no-members': '⚠️ I can’t read the member list. Switch on **Server Members Intent**: discord.com/developers → NOREX app → Bot → Privileged Gateway Intents, then run this again.',
  'member-list-short': '⚠️ Discord sent back a half-empty member list – skipped this check so nobody is wrongly reported as gone.',
};

// ---------- small helpers ----------
const eph = (content, extra = {}) => ({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] }, ...extra } });
export const snowTime = (id) => Number(BigInt(id) >> 22n) + 1420070400000;
const unix = (ms) => Math.floor(ms / 1000);
const memberName = (m) => m.nick || m.user.global_name || m.user.username;
const avatarUrl = (u) => (u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`);
function opts(i) {
  let o = i.data?.options ?? [], sub = null;
  if (o[0]?.type === 1) { sub = o[0].name; o = o[0].options ?? []; }
  return { sub, o: Object.fromEntries(o.map((x) => [x.name, x.value])) };
}
export function since(fromMs, now) {
  const d = Math.max(0, now - fromMs), days = Math.floor(d / DAY);
  if (days >= 365) { const y = Math.floor(days / 365); return `${y} year${y > 1 ? 's' : ''}`; }
  if (days >= 60) return `${Math.floor(days / 30)} months`;
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;
  const h = Math.floor(d / HOUR);
  return h >= 1 ? `${h} hour${h > 1 ? 's' : ''}` : 'under an hour';
}

async function discord(env, method, path, body, reason) {
  const headers = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(reason);
  const r = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.status === 204) return null;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 403 || d.code === 50001 || d.code === 50013 ? 'no-access' : d.message || `discord-${r.status}`);
  return d;
}
const post = (env, channel, msg) => discord(env, 'POST', `/channels/${channel}/messages`, msg);

// Deferred reply: answer "thinking…" now (Discord's 3-second limit), patch the real answer in when the work is done.
function later(env, i, ctx, work) {
  ctx.waitUntil((async () => {
    let content;
    try { content = await work(); } catch (e) { content = HELP[e.message] ?? `⚠️ ${e.message}`; }
    await fetch(`${API}/webhooks/${env.DISCORD_APP_ID}/${i.token}/messages/@original`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    }).catch((e) => console.log('server tools reply failed', e.message));
  })());
  return { type: 5, data: { flags: 64 } };
}

// ---------- settings (one JSON blob in D1 meta) ----------
export async function getToolSettings(env) {
  const base = { leaveChannel: '', welcomeChannel: '', welcomeText: '', pingRoles: {} };
  try {
    const v = await env.DB.prepare('SELECT value FROM meta WHERE key = ?').bind(KEY).first('value');
    return v ? { ...base, ...JSON.parse(v) } : base;
  } catch { return base; }
}
const saveToolSettings = (env, s) => env.DB.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind(KEY, JSON.stringify(s)).run();
async function batch(env, list) {
  for (let k = 0; k < list.length; k += 50) await env.DB.batch(list.slice(k, k + 50));
}

// ---------- leave / join alerts + welcome posts ----------
async function listMembers(env) {
  const out = [];
  let after = '0';
  for (let page = 0; page < 20; page++) {
    let chunk;
    try { chunk = await discord(env, 'GET', `/guilds/${env.DISCORD_GUILD_ID}/members?limit=1000&after=${after}`); } catch (e) { throw new Error(e.message === 'no-access' ? 'no-members' : e.message); }
    out.push(...chunk);
    if (chunk.length < 1000) return out;
    after = chunk[chunk.length - 1].user.id;
  }
  throw new Error('too-many-members'); // a cut-off list would report everyone past it as gone
}

const row = (m) => ({ user_id: m.user.id, name: memberName(m), avatar: avatarUrl(m.user), joined_at: m.joined_at ?? '', roles: JSON.stringify([...(m.roles ?? [])].sort()) });
const upsert = (env, r) => env.DB.prepare('INSERT INTO guild_members (user_id, name, avatar, joined_at, roles) VALUES (?, ?, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, joined_at = excluded.joined_at, roles = excluded.roles')
  .bind(r.user_id, r.name, r.avatar, r.joined_at, r.roles);

// Compares Discord's member list with the snapshot. The first run only takes the snapshot. Only changed rows are written,
// so a quiet server costs one read per check. Returns { joined, left } (rows) or { seeded }.
export async function memberWatch(env, now = Date.now()) {
  if (!env.DB || !env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return null;
  const st = await getToolSettings(env);
  if (!st.leaveChannel && !st.welcomeChannel) return null;
  const list = (await listMembers(env)).filter((m) => m.user && !m.user.bot).map(row);
  const { results: known } = await env.DB.prepare('SELECT * FROM guild_members').all();
  if (!known.length) {
    await batch(env, list.map((r) => upsert(env, r)));
    return { seeded: list.length, joined: [], left: [] };
  }
  if (list.length < known.length / 2) throw new Error('member-list-short'); // a Discord hiccup, not a mass exodus
  const old = new Map(known.map((k) => [k.user_id, k]));
  const cur = new Set(list.map((r) => r.user_id));
  const joined = list.filter((r) => !old.has(r.user_id));
  const left = known.filter((k) => !cur.has(k.user_id));
  const changed = list.filter((r) => { const k = old.get(r.user_id); return !k || k.name !== r.name || k.avatar !== r.avatar || k.roles !== r.roles || k.joined_at !== r.joined_at; });
  await batch(env, [...changed.map((r) => upsert(env, r)), ...left.map((k) => env.DB.prepare('DELETE FROM guild_members WHERE user_id = ?').bind(k.user_id))]);
  if (joined.length || left.length) await postMemberChanges(env, st, joined, left, now);
  return { joined, left };
}

async function postMemberChanges(env, st, joined, left, now) {
  const roles = await discord(env, 'GET', `/guilds/${env.DISCORD_GUILD_ID}/roles`).catch(() => []);
  const roleName = new Map(roles.map((r) => [r.id, r.name]));
  const gamertag = (uid) => env.DB.prepare("SELECT player_name FROM claims WHERE user_id = ? AND status = 'approved'").bind(uid).first('player_name');
  const roleList = (r) => JSON.parse(r.roles || '[]').map((id) => roleName.get(id)).filter((n) => n && n !== '@everyone').join(', ') || 'none';
  const embeds = [];
  if (left.length > POST_CAP) {
    embeds.push({ color: RED, title: `👋 ${left.length} members left`, description: left.map((k) => `• ${k.name} (<@${k.user_id}>)`).join('\n').slice(0, 4000), timestamp: new Date(now).toISOString() });
  } else {
    for (const k of left) {
      const tag = await gamertag(k.user_id);
      const j = Date.parse(k.joined_at);
      embeds.push({
        color: RED, author: { name: `${k.name} left the server`, icon_url: k.avatar }, description: `<@${k.user_id}> · \`${k.user_id}\``,
        fields: [
          { name: 'Was here for', value: Number.isFinite(j) ? `${since(j, now)} (joined <t:${unix(j)}:D>)` : 'unknown', inline: true },
          { name: 'Verified player', value: tag ? `🎮 ${tag}` : '—', inline: true },
          { name: 'Roles', value: roleList(k).slice(0, 1000) },
        ],
        footer: { text: 'Spotted by the 10-minute member check' }, timestamp: new Date(now).toISOString(),
      });
    }
  }
  if (joined.length > POST_CAP) {
    embeds.push({ color: GREEN, title: `📥 ${joined.length} members joined`, description: joined.map((r) => `• ${r.name} (<@${r.user_id}>)`).join('\n').slice(0, 4000), timestamp: new Date(now).toISOString() });
  } else {
    for (const r of joined) {
      const made = snowTime(r.user_id);
      embeds.push({
        color: GREEN, author: { name: `${r.name} joined the server`, icon_url: r.avatar }, description: `<@${r.user_id}> · \`${r.user_id}\``,
        fields: [{ name: 'Account created', value: `<t:${unix(made)}:R>${now - made < 7 * DAY ? ' ⚠️ brand-new account' : ''}`, inline: true }],
        timestamp: new Date(now).toISOString(),
      });
    }
  }
  if (st.leaveChannel) {
    for (let k = 0; k < embeds.length; k += 10) {
      await post(env, st.leaveChannel, { embeds: embeds.slice(k, k + 10), allowed_mentions: { parse: [] } }).catch((e) => console.log('leave log post failed', e.message));
    }
  }
  if (st.welcomeChannel) for (const r of joined.slice(0, POST_CAP)) await post(env, st.welcomeChannel, welcomeMessage(env, st, r)).catch((e) => console.log('welcome post failed', e.message));
}

export function welcomeMessage(env, st, r) {
  const site = (env.SITE_URL || '').replace(/\/?$/, '/');
  const content = (st.welcomeText || DEFAULT_WELCOME).replaceAll('{user}', `<@${r.user_id}>`).replaceAll('{name}', r.name);
  const lines = ['**Start here**', '📜 Read the rules and say hi in the chat'];
  if (env.SITE_URL) lines.push(`🏠 [Squad Hub](${site}members.html) – log in with Discord and claim your player`, `📊 [Club site](${site}) – results, stats and the squad`);
  return { content, embeds: [{ color: RED, title: 'Welcome to NOREX UNITED ⚽', description: lines.join('\n'), thumbnail: { url: r.avatar } }], allowed_mentions: { users: [r.user_id] } };
}

// ---------- /purge ----------
export async function purge(env, channelId, count, userId, byName, now = Date.now()) {
  const msgs = await discord(env, 'GET', `/channels/${channelId}/messages?limit=100`);
  const pick = msgs.filter((m) => !m.pinned && (!userId || m.author?.id === userId)).slice(0, count);
  const fresh = pick.filter((m) => now - snowTime(m.id) < BULK_MAX_AGE);
  const reason = `/purge by ${byName}`;
  if (fresh.length === 1) await discord(env, 'DELETE', `/channels/${channelId}/messages/${fresh[0].id}`, undefined, reason);
  else if (fresh.length > 1) await discord(env, 'POST', `/channels/${channelId}/messages/bulk-delete`, { messages: fresh.map((m) => m.id) }, reason);
  const lines = [`🧹 Deleted **${fresh.length}** message${fresh.length === 1 ? '' : 's'}${userId ? ` from <@${userId}>` : ''}.`];
  if (pick.length > fresh.length) lines.push(`⏳ ${pick.length - fresh.length} more are older than 14 days – Discord doesn't let bots bulk-delete those.`);
  if (userId && pick.length < count) lines.push('🔎 Only the last 100 messages in this channel are searched.');
  if (msgs.some((m) => m.pinned)) lines.push('📌 Pinned messages are always kept.');
  return lines.join('\n');
}

// ---------- /tag and /tags ----------
const tagName = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, '-');
async function tagCommand(i, env, o) {
  const name = tagName(o.name);
  const t = await env.DB.prepare('SELECT * FROM tags WHERE name = ?').bind(name).first();
  if (!t) return eph(`🤷 No tag called **${name}**. \`/tags list\` shows them all.`);
  await env.DB.prepare('UPDATE tags SET uses = uses + 1 WHERE name = ?').bind(name).run();
  return { type: 4, data: { content: o.member ? `<@${o.member}>` : undefined, embeds: [{ color: RED, title: `🏷️ ${t.name}`, description: t.body }], allowed_mentions: { users: o.member ? [o.member] : [] } } };
}
async function tagsCommand(i, env, who, sub, o) {
  if (sub === 'list') {
    const { results } = await env.DB.prepare('SELECT name, uses FROM tags ORDER BY name').all();
    return eph(results.length ? `🏷️ **Tags** – post one with \`/tag\`\n${results.map((t) => `• \`${t.name}\` (${t.uses} use${t.uses === 1 ? '' : 's'})`).join('\n')}`.slice(0, 1990) : '🏷️ No tags yet. Managers add them with `/tags set`.');
  }
  if (!can(who, 'tags.manage')) return eph('🔒 Managers only.');
  const name = tagName(o.name);
  if (!TAG_NAME.test(name)) return eph('⚠️ Tag names are 1–32 letters, numbers or dashes, e.g. `rules` or `trial-info`.');
  if (sub === 'delete') {
    const r = await env.DB.prepare('DELETE FROM tags WHERE name = ?').bind(name).run();
    return eph(r.meta.changes ? `🗑️ Deleted **${name}**.` : `🤷 No tag called **${name}**.`);
  }
  // Slash-command text can't hold line breaks on mobile, so "\n" (typed as backslash-n) becomes a new line.
  const body = String(o.text ?? '').replaceAll('\\n', '\n').trim().slice(0, 4000);
  if (!body) return eph('⚠️ The tag needs some text.');
  await env.DB.prepare('INSERT INTO tags (name, body, by_id, uses, at) VALUES (?, ?, ?, 0, ?) ON CONFLICT (name) DO UPDATE SET body = excluded.body, by_id = excluded.by_id, at = excluded.at')
    .bind(name, body, who.u, Date.now()).run();
  return eph(`✅ Saved **${name}** – anyone can post it with \`/tag name:${name}\`.`);
}
export async function tagChoices(env, q) {
  const { results } = await env.DB.prepare('SELECT name FROM tags WHERE name LIKE ? ORDER BY uses DESC, name LIMIT 25').bind(`%${tagName(q)}%`).all();
  return results.map((t) => ({ name: t.name, value: t.name }));
}

// ---------- /remind and /reminders ----------
const UNIT = { d: DAY, h: HOUR, m: MIN };
// "30m", "2h", "1h30m", "1d 12h", "45 minutes", "2 hours" → milliseconds (null if it doesn't read as a duration).
export function parseDuration(s) {
  let total = 0;
  const rest = String(s ?? '').toLowerCase().replace(/\band\b|,/g, ' ')
    .replace(/(\d+(?:\.\d+)?)\s*(d|days?|h|hrs?|hours?|m|mins?|minutes?)(?![a-z])/g, (_, n, u) => { total += Number(n) * UNIT[u[0]]; return ' '; });
  return total > 0 && !rest.trim() ? Math.round(total) : null;
}
async function remindCommand(i, env, who, o, now) {
  const ms = parseDuration(o.in);
  if (!ms) return eph('⚠️ I couldn’t read that time. Try `10m`, `2h`, `1h30m` or `1d`.');
  if (ms < MIN || ms > MAX_REMIND) return eph('⚠️ Reminders can be from 1 minute up to 60 days away.');
  if ((o.channel || o.role) && !can(who, 'remind.channel')) return eph('🔒 Only managers can pick another channel or ping a role – leave those empty for a reminder here.');
  const pending = await env.DB.prepare('SELECT COUNT(*) AS n FROM reminders WHERE user_id = ? AND sent_at IS NULL').bind(who.u).first('n');
  if (pending >= MAX_PENDING) return eph(`⚠️ You already have ${MAX_PENDING} reminders waiting – \`/reminders\` to cancel some.`);
  const channel = o.channel || i.channel_id, due = now + ms;
  const body = String(o.text).trim().slice(0, 1000);
  await env.DB.prepare('INSERT INTO reminders (user_id, channel_id, role_id, body, due_at, at) VALUES (?, ?, ?, ?, ?, ?)').bind(who.u, channel, o.role || null, body, due, now).run();
  return eph(`⏰ Got it – <t:${unix(due)}:R> (<t:${unix(due)}:f>) I'll post in <#${channel}>${o.role ? ` and ping <@&${o.role}>` : ''}:\n> ${body}`);
}
async function remindersList(env, who) {
  const { results } = await env.DB.prepare('SELECT id, channel_id, body, due_at FROM reminders WHERE user_id = ? AND sent_at IS NULL ORDER BY due_at LIMIT 25').bind(who.u).all();
  if (!results.length) return eph('⏰ No reminders waiting. Set one with `/remind`.');
  const shown = results.slice(0, 5);
  return eph([`⏰ **Your reminders** (${results.length})`, ...results.map((r, k) => `${k + 1}. <t:${unix(r.due_at)}:R> in <#${r.channel_id}> – ${r.body.slice(0, 80)}`)].join('\n').slice(0, 1990), {
    components: [{ type: 1, components: shown.map((r, k) => ({ type: 2, style: 4, label: `Cancel ${k + 1}`, custom_id: `norex:rm:x:${r.id}` })) }],
  });
}
// 1-minute cron. Each row is claimed (sent_at set) before posting, so overlapping runs never post twice.
export async function sendDueReminders(env, now = Date.now()) {
  if (!env.DB || !env.DISCORD_BOT_TOKEN) return 0;
  const { results } = await env.DB.prepare('SELECT * FROM reminders WHERE sent_at IS NULL AND due_at <= ? ORDER BY due_at LIMIT 20').bind(now).all();
  let sent = 0;
  for (const r of results) {
    const claimed = await env.DB.prepare('UPDATE reminders SET sent_at = ? WHERE id = ? AND sent_at IS NULL').bind(now, r.id).run();
    if (!claimed.meta.changes) continue;
    const content = r.role_id
      ? `⏰ <@&${r.role_id}> **Reminder:** ${r.body}\n-# set by <@${r.user_id}>`
      : `⏰ <@${r.user_id}> **Reminder:** ${r.body}\n-# set <t:${unix(r.at)}:R>`;
    try {
      await post(env, r.channel_id, { content, allowed_mentions: { users: [r.user_id], roles: r.role_id ? [r.role_id] : [] } });
      sent++;
    } catch (e) { console.log('reminder post failed', r.id, e.message); }
  }
  return sent;
}

// ---------- ping roles ----------
async function ensurePingRoles(env, st) {
  const roles = await discord(env, 'GET', `/guilds/${env.DISCORD_GUILD_ID}/roles`);
  const ids = new Set(roles.map((r) => r.id));
  const byName = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]));
  const pingRoles = { ...st.pingRoles };
  for (const p of PING_ROLES) {
    if (pingRoles[p.key] && ids.has(pingRoles[p.key])) continue;
    pingRoles[p.key] = byName.get(p.name.toLowerCase())
      ?? (await discord(env, 'POST', `/guilds/${env.DISCORD_GUILD_ID}/roles`, { name: p.name, mentionable: true, permissions: '0' }, 'Ping-role panel (/setup pingroles)')).id;
  }
  return pingRoles;
}
export const pingPanel = () => ({
  embeds: [{
    color: RED, title: '🔔 Pick your pings',
    description: ['Tap a button to turn a ping on – tap it again to turn it off. Only you see the answer.', '', ...PING_ROLES.map((p) => `${p.emoji} **${p.name}** – ${p.blurb}`)].join('\n'),
  }],
  components: [{ type: 1, components: PING_ROLES.map((p) => ({ type: 2, style: 2, emoji: { name: p.emoji }, label: p.name, custom_id: `norex:pr:${p.key}` })) }],
});

// ---------- /setup ----------
async function setupCommand(i, env, ctx, who, sub, o) {
  if (!can(who, 'servertools.setup')) return eph('🔒 Managers only.');
  const st = await getToolSettings(env);
  if (sub === 'off') {
    const field = o.feature === 'welcome' ? 'welcomeChannel' : 'leaveChannel';
    await saveToolSettings(env, { ...st, [field]: '' });
    return eph(o.feature === 'welcome' ? '🔕 Welcome posts are off.' : '🔕 Leave/join alerts are off.');
  }
  if (sub === 'leavelog' || sub === 'welcome') {
    return later(env, i, ctx, async () => {
      if (sub === 'welcome' && o.message) st.welcomeText = String(o.message).replaceAll('\\n', '\n').slice(0, 1000);
      st[sub === 'welcome' ? 'welcomeChannel' : 'leaveChannel'] = o.channel;
      const members = await listMembers(env); // fails early (with the fix) if the Server Members Intent is off
      await saveToolSettings(env, st);
      // fresh snapshot now, so the first check can already spot changes (and an old one never reports months of comings and goings)
      await batch(env, [env.DB.prepare('DELETE FROM guild_members'), ...members.filter((m) => m.user && !m.user.bot).map((m) => upsert(env, row(m)))]);
      if (sub === 'leavelog') {
        await post(env, o.channel, { content: '✅ Leave and join alerts will show up here (checked every 10 minutes).', allowed_mentions: { parse: [] } });
        return `✅ Leave/join alerts go to <#${o.channel}>. Tracking ${members.filter((m) => !m.user?.bot).length} members.`;
      }
      const preview = welcomeMessage(env, st, { user_id: who.u, name: 'you', avatar: i.member?.user ? avatarUrl(i.member.user) : '' });
      return `✅ New members get welcomed in <#${o.channel}>. Preview of the first line:\n> ${preview.content}`;
    });
  }
  if (sub === 'pingroles') {
    return later(env, i, ctx, async () => {
      st.pingRoles = await ensurePingRoles(env, st);
      await saveToolSettings(env, st);
      await post(env, o.channel, { ...pingPanel(), allowed_mentions: { parse: [] } });
      return `✅ Ping-role panel posted in <#${o.channel}>. Roles: ${PING_ROLES.map((p) => `<@&${st.pingRoles[p.key]}>`).join(' ')}\nPing them in posts (or set one as the result ping in Bot settings) – only people who opted in get notified.`;
    });
  }
  return eph('⚠️ Unknown setup option.');
}

// ---------- entry points (called from worker.js) ----------
export async function serverCommand(i, env, ctx, who, now = Date.now()) {
  if (!flagOn(env, who, 'serverTools')) return eph('🔒 This isn’t switched on yet.');
  if (!env.DB) return eph('⚠️ The member database is not connected.');
  const { sub, o } = opts(i);
  try {
    switch (i.data.name) {
      case 'setup': return await setupCommand(i, env, ctx, who, sub, o);
      case 'purge': {
        if (!can(who, 'messages.purge')) return eph('🔒 Managers only.');
        const by = i.member?.user?.username ?? who.u;
        return later(env, i, ctx, () => purge(env, i.channel_id, Math.min(100, Math.max(1, Number(o.count) || 1)), o.member || null, by, now));
      }
      case 'tag': return await tagCommand(i, env, o);
      case 'tags': return await tagsCommand(i, env, who, sub, o);
      case 'remind': return await remindCommand(i, env, who, o, now);
      case 'reminders': return await remindersList(env, who);
    }
  } catch (e) {
    return eph(HELP[e.message] ?? `⚠️ ${e.message}`);
  }
  return eph('⚠️ Unknown command.');
}

export const SERVER_BUTTON = /^norex:(pr|rm):/;
export async function serverButton(i, env, who) {
  if (!flagOn(env, who, 'serverTools')) return eph('🔒 This isn’t switched on yet.');
  const id = i.data.custom_id;
  try {
    const rm = id.match(/^norex:rm:x:(\d+)$/);
    if (rm) {
      const r = await env.DB.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ? AND sent_at IS NULL').bind(Number(rm[1]), who.u).run();
      return eph(r.meta.changes ? '🗑️ Reminder cancelled.' : '🤷 That reminder was already sent or cancelled.');
    }
    const p = PING_ROLES.find((x) => id === `norex:pr:${x.key}`);
    if (!p) return eph('⚠️ Unknown button.');
    const rid = (await getToolSettings(env)).pingRoles[p.key];
    if (!rid) return eph('⚠️ These ping roles aren’t set up yet – a manager can run `/setup pingroles`.');
    const has = (i.member?.roles ?? []).includes(rid);
    await discord(env, has ? 'DELETE' : 'PUT', `/guilds/${env.DISCORD_GUILD_ID}/members/${who.u}/roles/${rid}`, undefined, 'Ping-role panel');
    return eph(has ? `🔕 **${p.name}** pings are off.` : `${p.emoji} **${p.name}** pings are on – ${p.blurb.toLowerCase()}.`);
  } catch (e) {
    return eph(HELP[e.message] ?? `⚠️ ${e.message}`);
  }
}
