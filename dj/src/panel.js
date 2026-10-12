// The player panel: one embed + controls per text channel, posted by the main bot. Edited in place on changes and
// re-posted at the bottom (debounced) when other messages arrive, so it stays visible.
import { store } from './store.js';
import { panelPayload } from './ui.js';

let client;
export const init = (c) => { client = c; };
const chan = (b) => client.channels.fetch(b.textId).catch(() => null);

export function refresh(b, delay = 700) {
  clearTimeout(b._rt); b._rt = setTimeout(() => doRefresh(b), delay);
}
async function doRefresh(b) {
  const ch = await chan(b);
  if (!ch?.isTextBased()) return;
  const payload = panelPayload(b);
  if (b.panelId) {
    const ok = await ch.messages.edit(b.panelId, payload).then(() => true, () => false);
    if (ok) return;
    b.panelId = null;
  }
  const m = await ch.send(payload).catch((e) => { console.error('panel send', e.message); });
  if (m) { b.panelId = m.id; store.save(); }
}
export function bump(b) {
  clearTimeout(b._bt); b._bt = setTimeout(() => doBump(b), 4000);
}
async function doBump(b) {
  const ch = await chan(b);
  if (!ch?.isTextBased()) return;
  if (b.panelId && ch.lastMessageId === b.panelId) return doRefresh(b);
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
