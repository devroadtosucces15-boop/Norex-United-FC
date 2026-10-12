// A Helper = one Discord bot account + its own Shoukaku connection to the shared Lavalink node.
// A bot account can sit in only one voice channel per server, so each helper serves one room per guild.
import { Client, GatewayIntentBits } from 'discord.js';
import { Shoukaku, Connectors } from 'shoukaku';

export class Helper {
  constructor(name, token, lavalink, { messages = false } = {}) {
    this.name = name; this.token = token; this.rooms = new Map(); // guildId -> Room
    this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, ...(messages ? [GatewayIntentBits.GuildMessages] : [])] });
    this.shoukaku = new Shoukaku(new Connectors.DiscordJS(this.client),
      [{ name: 'main', url: lavalink.host, auth: lavalink.password }],
      { moveOnDisconnect: false, resume: true, resumeTimeout: 30, reconnectTries: 1000, reconnectInterval: 5 });
    this.shoukaku.on('error', (n, e) => console.error(`[${name}] lavalink`, e.message));
    this.client.on('error', (e) => console.error(`[${name}]`, e.message));
  }
  login() { return this.client.login(this.token); }
  ready() { return new Promise((r) => this.client.once('ready', r)); }
}

export class Pool {
  constructor(helpers) { this.helpers = helpers; }
  // Same channel → its room; otherwise a helper with no room in this guild.
  roomFor(guildId, channelId) {
    for (const h of this.helpers) { const r = h.rooms.get(guildId); if (r?.channelId === channelId) return r; }
    return null;
  }
  freeHelper(guildId) { return this.helpers.find((h) => !h.rooms.has(guildId)) || null; }
}
