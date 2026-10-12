// One Room = one voice channel being served by one helper bot, with its own queue/volume/filter/vote-skip.
import { FILTERS } from './filters.js';

export class Room {
  constructor({ helper, guildId, channelId, textChannel }) {
    Object.assign(this, { helper, guildId, channelId, textChannel });
    this.queue = []; this.current = null; this.loop = 'off'; this.volume = 80;
    this.filter = 'clear'; this.owner = null; this.votes = new Set(); this.player = null;
  }
  async join() {
    this.player = await this.helper.shoukaku.joinVoiceChannel({
      guildId: this.guildId, channelId: this.channelId, shardId: 0, deaf: true
    });
    await this.player.setGlobalVolume(this.volume);
    this.player.on('end', (e) => { if (e.reason !== 'replaced') this.next(e.reason === 'finished'); });
    this.player.on('exception', () => this.next(false));
    this.player.on('closed', () => this.destroy());
  }
  async add(tracks) {
    this.queue.push(...tracks);
    if (!this.current) await this.next(false);
  }
  async next(finished) {
    this.votes.clear();
    if (finished && this.current) {
      if (this.loop === 'track') this.queue.unshift(this.current);
      else if (this.loop === 'queue') this.queue.push(this.current);
    }
    this.current = this.queue.shift() || null;
    if (!this.current) { this.idleTimer = setTimeout(() => this.destroy(), 120_000); return; }
    clearTimeout(this.idleTimer);
    await this.player.playTrack({ track: { encoded: this.current.encoded } });
  }
  skip() { return this.player.stopTrack(); }
  pause(p) { return this.player.setPaused(p); }
  setVolume(v) { this.volume = v; return this.player.setGlobalVolume(v); }
  shuffle() { for (let i = this.queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]]; } }
  setFilter(name) { this.filter = name; return this.player.setFilters(name === 'clear' ? {} : FILTERS[name]); }
  stop() { this.queue = []; this.loop = 'off'; return this.destroy(); }
  async destroy() {
    clearTimeout(this.idleTimer);
    this.helper.rooms.delete(this.guildId);
    try { await this.helper.shoukaku.leaveVoiceChannel(this.guildId); } catch {}
  }
}
