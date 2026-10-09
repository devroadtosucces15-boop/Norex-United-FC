// Registers the bot's slash commands with Discord. Run by .github/workflows/bot.yml
// (needs DISCORD_APP_ID and DISCORD_BOT_TOKEN), so no PC is required.
import { COMMANDS, buildRegistration } from './commanddefs.js';

const { DISCORD_APP_ID: app, DISCORD_BOT_TOKEN: token } = process.env;
if (!app || !token) {
  console.error('Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN');
  process.exit(1);
}

// The owner's per-command settings (Boardroom → Bot) decide what gets registered: switched-off commands are left out and
// manager/owner-only ones are hidden from members in Discord. Read from the Worker with the same key fetch.mjs uses.
async function loadCommandSettings() {
  const secret = process.env.DISCORD_CLIENT_SECRET;
  try {
    const { createHash } = await import('node:crypto');
    const api = JSON.parse((await import('node:fs')).readFileSync(new URL('../config.json', import.meta.url), 'utf8')).members?.api;
    if (!secret || !api) return {};
    const key = createHash('sha256').update(`${secret}:norex-bot-settings`).digest('hex');
    const r = await fetch(`${api.replace(/\/$/, '')}/api/bot/settings/public`, { signal: AbortSignal.timeout(10000), headers: { 'X-Norex-Key': key } });
    return r.ok ? ((await r.json()).commands ?? {}) : {};
  } catch (e) { console.warn('Command settings not loaded:', e.message); return {}; }
}
const commands = buildRegistration(COMMANDS, await loadCommandSettings());

const res = await fetch(`https://discord.com/api/v10/applications/${app}/commands`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(commands),
});
console.log(res.status, res.ok ? `Registered ${commands.length} commands` : await res.text());
if (!res.ok) process.exit(1);
