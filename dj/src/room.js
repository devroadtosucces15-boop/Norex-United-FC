// One Room = one voice channel being served by one helper bot. Settings (volume, loop, autoplay, effects) live on the
// binding so they survive restarts; the queue does not.
import { compose } from './effects.js';
import { suggest } from './autoplay.js';
import { store } from './store.js';

export class Room {
  constructor({ helper, binding, onChange, onDestroy }) {
    this.helper = helper; this.binding = binding; this.settings = binding.settings;
    this.guildId = binding.guildId; this.channelId = binding.voiceId;
    this.onChange = onChange; this.onDestroy = onDestroy;
    this.queue = []; this.current = null; this.history = []; this.votes = new Set(); this.player = null; this.dead = false;
  }
  changed() { this.onChange?.(this); }
  async join() {
    this.player = await this.helper.shoukaku.joinVoiceChannel({ guildId: this.guildId, channelId: this.channelId, shardId: 0, deaf: true });
    await this.player.setGlobalVolume(this.settings.volume);
    await this.applyFilters();
    this.player.on('end', (e) => { if (e.reason !== 'replaced') this.next(e.reason === 'finished'); });
    this.player.on('exception', () => this.next(false));
    this.player.on('closed', () => this.destroy());
  }
  async add(tracks) {
    const i = this.queue.findIndex((t) => t.auto);
    if (i < 0) this.queue.push(...tracks); else this.queue.splice(i, 0, ...tracks);
    if (!this.current) await this.next(false); else { this.changed(); this.fill(); }
  }
  async next(finished) {
    if (this.dead) return;
    this.votes.clear();
    if (finished && this.current) {
      if (this.settings.loop === 'track') this.queue.unshift(this.current);
      else if (this.settings.loop === 'queue') this.queue.push(this.current);
    }
    if (!this.queue.length && this.settings.autoplay) await this.fill();
    this.current = this.queue.shift() || null;
    if (!this.current) { clearTimeout(this.idleTimer); this.idleTimer = setTimeout(() => this.destroy(), 120_000); this.changed(); return; }
    clearTimeout(this.idleTimer);
    this.history.push(this.current.info); if (this.history.length > 40) this.history.shift();
    await this.player.playTrack({ track: { encoded: this.current.encoded } });
    this.changed();
    this.fill();
  }
  // Autoplay: keep a few suggested songs queued, based on what this session has played.
  fill() {
    if (!this.settings.autoplay || this.dead) return this.fillP || Promise.resolve();
    if (this.fillP) return this.fillP;
    if (this.queue.length >= 3) return Promise.resolve();
    this.fillP = (async () => {
      try {
        const found = await suggest(this, 5);
        for (const t of found) t.auto = true;
        if (this.settings.autoplay) this.queue.push(...found);
      } catch (e) { console.error('autoplay', e.message); }
      this.fillP = null; this.changed();
    })();
    return this.fillP;
  }
  setAutoplay(on) {
    this.settings.autoplay = on; store.save();
    if (!on) this.queue = this.queue.filter((t) => !t.auto); else this.fill();
    this.changed();
  }
  skip() { return this.player.stopTrack(); }
  pause(p) { return this.player.setPaused(p).then(() => this.changed()); }
  async setVolume(v) { this.settings.volume = v; store.save(); await this.player.setGlobalVolume(v); this.changed(); }
  shuffle() {
    const q = this.queue.filter((t) => !t.auto);
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    this.queue = [...q, ...this.queue.filter((t) => t.auto)]; this.changed();
  }
  setLoop(mode) { this.settings.loop = mode; store.save(); this.changed(); }
  async applyFilters() { store.save(); await this.player.setFilters(compose(this.settings)); this.changed(); }
  stop() { this.queue = []; this.settings.loop = 'off'; return this.destroy(); }
  async destroy() {
    if (this.dead) return;
    this.dead = true; clearTimeout(this.idleTimer);
    this.helper.rooms.delete(this.guildId);
    try { await this.helper.shoukaku.leaveVoiceChannel(this.guildId); } catch {}
    this.onDestroy?.(this);
  }
}
