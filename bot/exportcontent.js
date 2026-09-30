// /exportcontent (owner only) – dumps pinned + recent messages from the server's guide/rule/playstyle/announcement
// channels to the owner's DMs, as plain text, so old Discord content can be copied into the site's docs (P5.2)
// or just reviewed. Read-only: nothing is changed in Discord or the site. Needs DISCORD_BOT_TOKEN + View
// Channels / Read Message History on those channels.
import { can } from './roles.js';

const API = 'https://discord.com/api/v10';
const TEXT = [0, 5]; // text + announcement channel types
const MATCH = /guide|rule|playstyle|play-style|announce|faq|requirement/i;
const CHAN_CAP = 10; // channel reads per run (2 calls each: pins + messages)
const MSG_CAP = 50; // recent messages per channel
const CHUNK = 1900; // stay under Discord's 2000-char message limit

async function dget(env, path) {
  const r = await fetch(API + path, { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
  if (r.ok) return r.json();
  const e = await r.json().catch(() => ({}));
  throw new Error(r.status === 403 || e.code === 50001 || e.code === 50013 ? 'no-access' : `discord-${r.status}`);
}

const dpost = (env, path, body) => fetch(`${API}${path}`, {
  method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

// One message → a few lines of plain text (author, time, content, attachment links).
function line(m) {
  const when = new Date(m.timestamp).toISOString().slice(0, 16).replace('T', ' ');
  const who = m.author?.username ?? 'unknown';
  const text = (m.content || '').trim();
  const files = (m.attachments ?? []).map((a) => `  📎 ${a.filename} — ${a.url}`).join('\n');
  return [`[${when}] ${who}${text ? `: ${text}` : ''}`, files].filter(Boolean).join('\n');
}

async function channelDump(env, ch) {
  const out = [`\n━━━ #${ch.name} ━━━`];
  try {
    const pins = await dget(env, `/channels/${ch.id}/pins`);
    if (pins.length) out.push('📌 Pinned:', ...pins.map(line));
  } catch (e) {
    out.push(`⚠️ pins: ${e.message}`);
  }
  try {
    const msgs = await dget(env, `/channels/${ch.id}/messages?limit=${MSG_CAP}`);
    if (msgs.length) out.push('🗒️ Recent:', ...msgs.reverse().map(line));
    else out.push('(no messages)');
  } catch (e) {
    out.push(`⚠️ messages: ${e.message}`);
  }
  return out.join('\n');
}

// Splits one long text into ≤CHUNK pieces without cutting a line in half where avoidable.
function chunks(text) {
  const out = [];
  let buf = '';
  for (const l of text.split('\n')) {
    if (buf.length + l.length + 1 > CHUNK) { out.push(buf); buf = ''; }
    buf += (buf ? '\n' : '') + l;
  }
  if (buf) out.push(buf);
  return out;
}

async function dmChannel(env, userId) {
  const r = await dpost(env, '/users/@me/channels', { recipient_id: userId });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.id) throw new Error('Could not open a DM (check your Discord privacy settings allow DMs from server members).');
  return d.id;
}

// Runs the export and DMs the owner the result in as many messages as needed.
export async function exportContent(env, who, filter) {
  if (!can(who, 'settings.bot')) throw new Error('Owner only.');
  if (!env.DISCORD_BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN is not set.');
  const channels = await dget(env, `/guilds/${env.DISCORD_GUILD_ID}/channels`);
  const rx = filter ? new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : MATCH;
  const matched = channels.filter((c) => TEXT.includes(c.type) && rx.test(c.name)).slice(0, CHAN_CAP);
  if (!matched.length) throw new Error(filter ? `No text channel matched "${filter}".` : 'No channel names matched guide/rule/playstyle/announce/faq/requirement.');
  const dm = await dmChannel(env, who.u);
  const parts = await Promise.all(matched.map((c) => channelDump(env, c)));
  const header = `📚 Export of ${matched.length} channel(s): ${matched.map((c) => `#${c.name}`).join(', ')}\n(pinned + last ${MSG_CAP} messages each — paste this to Claude to summarise/organise)`;
  const pieces = chunks([header, ...parts].join('\n'));
  for (const content of pieces) await dpost(env, `/channels/${dm}/messages`, { content });
  return { channels: matched.map((c) => c.name), messages: pieces.length };
}
