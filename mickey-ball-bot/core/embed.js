// Minimal Discord embed / component builders that produce plain JSON (no discord.js, so they run in a Worker).
export class Embed {
  constructor() { this.d = {}; }
  setColor(c) { this.d.color = c; return this; }
  setTitle(t) { this.d.title = String(t).slice(0, 256); return this; }
  setDescription(t) { this.d.description = String(t).slice(0, 4096); return this; }
  setThumbnail(url) { if (url) this.d.thumbnail = { url }; return this; }
  setFooter({ text }) { this.d.footer = { text }; return this; }
  setAuthor({ name }) { this.d.author = { name }; return this; }
  setTimestamp(ms) { if (ms) this.d.timestamp = new Date(ms).toISOString(); return this; }
  addFields(...f) { (this.d.fields ??= []).push(...f.flat().map((x) => ({ ...x, value: String(x.value).slice(0, 1024) }))); return this; }
  toJSON() { return this.d; }
}
export const row = (...components) => ({ type: 1, components });
export const button = ({ id, label, emoji, style = 2, disabled = false }) => ({ type: 2, style, custom_id: id, label, emoji: { name: emoji }, disabled });
export const select = ({ id, placeholder, options }) => ({ type: 3, custom_id: id, placeholder, min_values: 1, max_values: 1, options });
