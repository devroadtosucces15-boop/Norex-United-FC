// A Helper = one Discord bot account + its own Shoukaku connection to the shared Lavalink node.
// A bot account can sit in only one voice channel per server, so each helper serves one room per guild.
import { Client, GatewayIntentBits } from 'discord.js';
import { Shoukaku, Connectors } from 'shoukaku';

const nodes = (l) => [
  { name: 'main', url: l.host, auth: l.password },
  ...(process.env.HOME_LAVALINK_HOST ? [{ name: 'home', url: process.env.HOME_LAVALINK_HOST, auth: process.env.HOME_LAVALINK_PASSWORD }] : [])
];

export class Helper {
  constructor(name, token, lavalink, { messages = false } = {}) {
    this.name = name; this.token = token; this.rooms = new Map(); // guildId -> Room
    this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, ...(messages ? [GatewayIntentBits.GuildMessages] : [])] });
    this.shoukaku = new Shoukaku(new Connectors.DiscordJS(this.client),
      nodes(lavalink),
      { moveOnDisconnect: true, resume: true, resumeTimeout: 30, reconnectTries: 1000, reconnectInterval: 5,
        // The home PC node ("home") is preferred whenever it is connected; the VM node ("main") is the fallback.
        nodeResolver: (all) => { const h = all.get('home'); return h?.state === 1 ? h : [...all.values()].filter((n) => n.state === 1).sort((a, b) => a.penalties - b.penalties)[0]; } });
    this.shoukaku.on('error', (n, e) => console.error(`[${name}] lavalink`, e.message));
    this.client.on('error', (e) => console.error(`[${name}]`, e.message));
    // Safety net: Shoukaku gives up after its tries or can get stuck mid-handshake (e.g. the home PC restarts).
    // Every 20 s any node that is fully disconnected is reconnected, and the first change is logged once.
    this.last = new Map();
    this.watch = setInterval(() => {
      for (const [id, n] of this.shoukaku.nodes) {
        if (this.last.get(id) !== n.state) { this.last.set(id, n.state); console.log(`[${name}] node ${id} ${['connecting', 'connected', 'disconnecting', 'disconnected'][n.state]}`); }
        // Down for 3 ticks in a row (60 s), including a handshake that never finishes: reset it and connect again.
        this.down ??= new Map(); const d = n.state === 1 ? 0 : (this.down.get(id) || 0) + 1; this.down.set(id, d);
        if (n.state === 3) { try { n.connect(); } catch {} }
        else if (d >= 3) { this.down.set(id, 0); try { n.disconnect(1000, 'watchdog'); setTimeout(() => { try { n.connect(); } catch {} }, 2000); } catch {} }
      }
    }, 20_000);
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
