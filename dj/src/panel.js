// The player panel: one embed + controls per text channel, posted by the main bot. Edited in place on changes and
// re-posted at the bottom (debounced) when other messages arrive, so it stays visible.
import { store } from './store.js';
import { panelPayload } from './ui.js';
import { nowPlayingPng } from './cards.js';
import { activeEffects } from './effects.js';

// The drawn "Now playing" banner is rendered fresh for every update, so the progress and equalizer move.
async function build(b) {
  const room = b.room; const t = room?.current?.info; let card = null;
  if (t) {
    try {
      card = nowPlayingPng({ title: t.title, pos: room.player?.position || 0, len: t.length || 0, paused: Boolean(room.player?.paused), live: Boolean(t.isStream),
        source: ({ youtube: 'YouTube', soundcloud: 'SoundCloud', spotify: 'Spotify', bandcamp: 'Bandcamp' })[t.sourceName] || 'Link', volume: b.settings.volume,
        effects: activeEffects(b.settings).length, listeners: room.memberIds?.().length ?? 0, loop: b.settings.loop });
    } catch (e) { console.error('card', e.message); }
  }
  return panelPayload(b, card);
}

let client;
export const init = (c) => { client = c; };
const chan = (b) => client.channels.fetch(b.textId).catch(() => null);

export function refresh(b, delay = 700) {
  clearTimeout(b._rt); b._rt = setTimeout(() => doRefresh(b), delay);
}
async function doRefresh(b) {
  const ch = await chan(b);
  if (!ch?.isTextBased()) return;
  const payload = await build(b);
  if (b.panelId) {
    const ok = await ch.messages.edit(b.panelId, { ...payload, attachments: [] }).then(() => true, () => false);
    if (ok) return;
    await ch.messages.delete(b.panelId).catch(() => {}); // an old-style panel cannot be edited into the new layout
    b.panelId = null;
  }
  const m = await ch.send(payload).catch((e) => { console.error('panel send', e.message); });
  if (m) { b.panelId = m.id; store.save(); }
}
export function bump(b) {
  clearTimeout(b._bt); b._bt = setTimeout(() => doBump(b), 4000);
}
export const bumpNow = (b) => doBump(b, true);
async function doBump(b, force = false) {
  const ch = await chan(b);
  if (!ch?.isTextBased()) return;
  if (!force && b.panelId && ch.lastMessageId === b.panelId) return doRefresh(b);
  if (b.panelId) await ch.messages.delete(b.panelId).catch(() => {});
  b.panelId = null;
  await doRefresh(b);
}
export async function remove(b) {
  clearTimeout(b._rt); clearTimeout(b._bt);
  const ch = await chan(b);
  if (b.panelId && ch) await ch.messages.delete(b.panelId).catch(() => {});
  b.panelId = null;
}
