// Registers the slash commands with Discord. Needs DISCORD_TOKEN and DISCORD_CLIENT_ID in the environment.
import { commands } from './core/commands.js';
const { DISCORD_TOKEN: token, DISCORD_CLIENT_ID: app = '1574674400056188958', DISCORD_GUILD_ID: guild } = process.env;
if (!token) { console.error('Set DISCORD_TOKEN first.'); process.exit(1); }
const url = guild ? `https://discord.com/api/v10/applications/${app}/guilds/${guild}/commands` : `https://discord.com/api/v10/applications/${app}/commands`;
const r = await fetch(url, { method: 'PUT', headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commands) });
console.log(r.ok ? `Registered ${commands.length} command(s).` : `Failed: ${r.status} ${await r.text()}`);
