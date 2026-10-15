// Tiny JSON file store (docker volume ./data). A "binding" = one text channel wired to one voice channel by /setup.
// It remembers the player panel message and the settings (volume, loop, autoplay, effects) for that room.
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.env.DATA_DIR || '/app/data', 'rooms.json');
export const defaultSettings = () => ({ volume: 80, loop: 'off', autoplay: false, effects: {} });

class Store {
  constructor() { this.bindings = new Map(); this.timer = null; }
  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      for (const b of raw.bindings || []) this.bindings.set(b.textId, { ...b, settings: { ...defaultSettings(), ...b.settings }, room: null });
    } catch { /* first run */ }
  }
  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      try {
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
        const list = [...this.bindings.values()].filter((b) => !b.temp).map(({ guildId, textId, voiceId, panelId, settings }) => ({ guildId, textId, voiceId, panelId, settings }));
        fs.writeFileSync(FILE, JSON.stringify({ bindings: list }, null, 2));
      } catch (e) { console.error('store save', e.message); }
    }, 300);
  }
  byText(id) { const b = this.bindings.get(id); return b && !b.temp ? b : null; }
  byPanel(id) { for (const b of this.bindings.values()) if (b.panelId === id) return b; return null; }
  bind({ guildId, textId, voiceId }) {
    const b = this.bindings.get(textId) || { guildId, textId, panelId: null, settings: defaultSettings(), room: null };
    Object.assign(b, { guildId, voiceId, temp: false });
    this.bindings.set(textId, b); this.save(); return b;
  }
  byVoice(guildId, voiceId) { for (const b of this.bindings.values()) if (b.guildId === guildId && b.voiceId === voiceId) return b; return null; }
  // Unbound channels: a throwaway binding keyed by voice channel, never saved.
  temp({ guildId, textId, voiceId }) {
    const b = { guildId, textId, voiceId, panelId: null, settings: defaultSettings(), room: null, temp: true, key: `v${voiceId}` };
    this.bindings.set(b.key, b); return b;
  }
  drop(b) { this.bindings.delete(b.key || b.textId); this.save(); }
  forText(textId) { return [...this.bindings.values()].filter((b) => b.textId === textId); }
}
export const store = new Store();
