// Pop-up rooms ("bubbles"): a member runs /room, the bot builds a voice channel from scratch (its built-in chat is the room's chat),
// tags it with a code, asks the member if they want to move in, greets people as they arrive, and deletes everything once it is empty.
import fs from 'node:fs';
import path from 'node:path';
import { ChannelType, PermissionFlagsBits as P, Routes } from 'discord.js';
import { panel, btn, linkBtn } from './v2.js';
import { ButtonStyle } from 'discord.js';
import { store } from './store.js';
import * as pnl from './panel.js';

const FILE = path.join(process.env.DATA_DIR || '/app/data', 'bubbles.json');
const CATEGORY = 'NOREX ROOMS';
const MAX_ROOMS = 5;
const MANAGERS = (process.env.MANAGER_ROLE_IDS || '').split(',').filter(Boolean);
const EMPTY_GRACE_MS = 45_000, NEVER_USED_MS = 3 * 60_000, GREET_TTL_MS = 120_000;

const db = { counter: 0, rooms: {} }; // rooms[vcId] = { guildId, ownerId, code, name }
const timers = new Map(), greeted = new Map(), ctlTimers = new Map(), bumpTimers = new Map();
let client;

export function load() { try { Object.assign(db, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch { /* first run */ } }
const save = () => { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch (e) { console.error('bubbles save', e.message); } };
export const all = () => db.rooms;
export const isBubble = (id) => Boolean(db.rooms[id]);
export const info = (id) => db.rooms[id] || null;
const humans = (ch) => ch.members.filter((m) => !m.user.bot).size;
export const url = (guildId, id) => `https://discord.com/channels/${guildId}/${id}`;

async function ensureCategory(guild) {
  const found = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === CATEGORY);
  return found || guild.channels.create({ name: CATEGORY, type: ChannelType.GuildCategory, reason: 'NOREX pop-up rooms' });
}

export async function create(guild, member, rawName) {
  if (Object.values(db.rooms).filter((r) => r.guildId === guild.id).length >= MAX_ROOMS) throw new Error('FULL');
  const cat = await ensureCategory(guild);
  const code = `NRX-${String(++db.counter).padStart(3, '0')}`;
  const base = (rawName || `${member.displayName}'s room`).replace(/[^\p{L}\p{N} '’._-]/gu, '').trim().slice(0, 60) || 'room';
  // No explicit view/join permissions: the room follows the NOREX ROOMS category, so you control who sees rooms in one place.
  const vc = await guild.channels.create({
    name: `🎧 ${base} · ${code}`, type: ChannelType.GuildVoice, parent: cat.id,
    bitrate: guild.maximumBitrate, rtcRegion: null, reason: `NOREX room ${code} for ${member.user.tag}`
  });
  if (P.SetVoiceChannelStatus) await vc.permissionOverwrites.edit(guild.roles.everyone, { SetVoiceChannelStatus: true }).catch(() => {});
  db.rooms[vc.id] = { guildId: guild.id, ownerId: member.id, hostName: member.displayName, code, name: base, locked: false, limit: 0, createdAt: Date.now() };
  save();
  store.bind({ guildId: guild.id, textId: vc.id, voiceId: vc.id }); // /play in the room's own chat plays into that voice channel
  arm(vc.id, NEVER_USED_MS); // nobody came in: tidy it up
  await ctlSync(vc.id, true);
  return vc;
}
export const openCount = (guildId) => Object.values(db.rooms).filter((r) => r.guildId === guildId).length;
export const maxRooms = MAX_ROOMS;

// Locked: only the host, managers and the founder can connect. Unlocked: back to whatever the category says.
export async function setLocked(guild, id, on) {
  const r = db.rooms[id]; const ch = await guild.channels.fetch(id).catch(() => null);
  if (!r || !ch) return false;
  await ch.permissionOverwrites.edit(guild.roles.everyone, { Connect: on ? false : null });
  for (const rid of MANAGERS) await ch.permissionOverwrites.edit(rid, on ? { Connect: true, ViewChannel: true } : { Connect: null }).catch(() => {});
  const host = await guild.members.fetch(r.ownerId).catch(() => null);
  if (host) await ch.permissionOverwrites.edit(host, on ? { Connect: true } : { Connect: null }).catch(() => {});
  r.locked = on; save(); await refreshAnnouncement(id); ctlRefresh(id, 200);
  return true;
}
export async function setLimit(guild, id, n) {
  const r = db.rooms[id]; const ch = await guild.channels.fetch(id).catch(() => null);
  if (!r || !ch) return false;
  r.limit = Math.max(0, Math.min(99, n | 0)); await ch.setUserLimit(r.limit); save(); await refreshAnnouncement(id); ctlRefresh(id, 200);
  return true;
}
export async function refreshAnnouncement(id) {
  const r = db.rooms[id]; if (!r?.msg) return;
  const c = await client.channels.fetch(r.msg.channelId).catch(() => null); const m = await c?.messages.fetch(r.msg.messageId).catch(() => null);
  const n = dialog({ id, guildId: r.guildId }, r);
  await m?.edit({ components: n.components, files: n.files, flags: n.flags }).catch(() => {});
}

export async function setStatus(id, text) {
  await client.rest.put(`${Routes.channel(id)}/voice-status`, { body: { status: String(text || '').slice(0, 500) } });
  if (db.rooms[id]) { db.rooms[id].status = String(text || '').slice(0, 100); save(); ctlRefresh(id); }
}

// ---- Room controls: a compact panel in the room's own chat that always sits at the bottom, like the player panel.
function controlsPayload(id) {
  const r = db.rooms[id]; const ch = client.channels.cache.get(id);
  const inside = ch ? ch.members.filter((m) => !m.user.bot).size : 0;
  return panel({
    color: r.locked ? 'steel' : 'red', eyebrow: 'Room controls', title: r.name, picture: false,
    detail: `${r.code} · host ${r.hostName}`,
    body: [[`${r.locked ? '🔒 **Locked** · only the host and managers can join' : '🔓 **Open** · anyone can join'}`, `👥 ${inside} in the room · ${r.limit ? `limit ${r.limit}` : 'no limit'}${r.status ? ` · ${r.status}` : ''}`]],
    footer: 'Lock, limit and close are for the host and managers · anyone can set the status',
    buttons: [btn(`room:lock:${id}`, r.locked ? 'Unlock' : 'Lock', ButtonStyle.Secondary, r.locked ? 'unlock' : 'lock'), btn(`room:limit:${id}:-1`, 'Limit', ButtonStyle.Secondary, 'minus'), btn(`room:limit:${id}:1`, 'Limit', ButtonStyle.Secondary, 'plus'), btn(`room:status:${id}`, 'Status', ButtonStyle.Secondary, 'pencil'), btn(`room:close:${id}`, 'Close', ButtonStyle.Danger, 'close')]
  });
}
const ctlQueue = new Map();
// One at a time per room, so two quick changes can never post two panels.
export function ctlSync(id, repost = false) {
  const run = (ctlQueue.get(id) || Promise.resolve()).then(() => ctlDo(id, repost)).catch((e) => console.error('controls', e.message));
  ctlQueue.set(id, run); return run;
}
const isCtl = (m, me) => m.author?.id === me && JSON.stringify(m.components || []).includes('room:close:');
async function ctlDo(id, repost) {
  const r = db.rooms[id]; if (!r) return;
  const ch = await client.channels.fetch(id).catch(() => null); if (!ch) return;
  const payload = controlsPayload(id);
  if (r.ctl && !repost) { const ok = await ch.messages.edit(r.ctl, payload).then(() => true, () => false); if (ok) return; }
  const m = await ch.send(payload).catch((e) => { console.error('controls send', e.message); return null; });
  if (!m) return;
  r.ctl = m.id; save();
  // Sweep every older controls block (also leftovers from before a restart) so only the newest stays.
  const recent = await ch.messages.fetch({ limit: 40 }).catch(() => null);
  for (const old of recent?.values() || []) if (old.id !== m.id && isCtl(old, client.user.id)) await old.delete().catch(() => {});
}
export function ctlRefresh(id, delay = 800) { clearTimeout(ctlTimers.get(id)); ctlTimers.set(id, setTimeout(() => ctlSync(id).catch(() => {}), delay)); }
// New message in the room chat: put the player panel and the controls back at the bottom, in that order.
export function bumpAll(id) {
  clearTimeout(bumpTimers.get(id));
  bumpTimers.set(id, setTimeout(async () => {
    const r = db.rooms[id]; const ch = await client.channels.fetch(id).catch(() => null); if (!r || !ch) return;
    if (r.ctl && ch.lastMessageId === r.ctl) return;
    const b = store.byText(id);
    if (b?.panelId) await pnl.bumpNow(b).catch(() => {});
    await ctlSync(id, true);
  }, 4000));
}
// After the player panel is first posted below the controls, move the controls back under it.
export function ctlEnsureLast(id) {
  setTimeout(async () => { const r = db.rooms[id]; const ch = await client.channels.fetch(id).catch(() => null); if (r && ch && r.ctl && ch.lastMessageId !== r.ctl) ctlSync(id, true).catch(() => {}); }, 2500);
}

function arm(id, ms) {
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => remove(id, 'empty'), ms));
}
const disarm = (id) => { clearTimeout(timers.get(id)); timers.delete(id); };

export async function remove(id, why = 'closed') {
  disarm(id); clearTimeout(ctlTimers.get(id)); clearTimeout(bumpTimers.get(id));
  const ch = await client.channels.fetch(id).catch(() => null);
  if (ch && why === 'empty' && humans(ch) > 0) return; // someone came back
  const b = store.byText(id);
  if (b) { if (b.room) await b.room.destroy().catch(() => {}); await pnl.remove(b).catch(() => {}); store.drop(b); }
  const r = db.rooms[id];
  if (r?.msg) { const c = await client.channels.fetch(r.msg.channelId).catch(() => null); const m = await c?.messages.fetch(r.msg.messageId).catch(() => null); const n = closedNote(r); await m?.edit({ components: n.components, files: [], attachments: [], flags: n.flags & ~0 }).catch(() => {}); }
  delete db.rooms[id]; greeted.delete(id); save();
  if (ch) await ch.delete(`NOREX room ${why}`).catch((e) => console.error('room delete', e.message));
}

// The announcement everyone in the channel sees: anyone can tap Join room (unless the host locked it).
export function dialog(vc, r) {
  const state = r.locked ? '🔒 **Locked** · only the host and managers can join' : '🔓 **Open** · anyone can join';
  return panel({
    color: r.locked ? 'steel' : 'red', eyebrow: 'Rooms', title: `${r.hostName} opened a room`, detail: `${r.code} · ${r.name}`,
    body: [
      [state + (r.limit ? ` · limit ${r.limit}` : ''), 'It has its own chat and closes by itself when everyone has left.'],
      ['**Want music?** In the room chat type `/play` and a song name or link. Anyone in the room can use `/effects`, `/autoplay` and `/volume`.']
    ],
    footer: 'Host tools: /room lock · /room limit · /room status',
    buttons: [btn(`room:move:${vc.id}`, 'Join room', ButtonStyle.Secondary, 'users'), btn(`room:status:${vc.id}`, 'Status', ButtonStyle.Secondary, 'pencil'), btn(`room:lock:${vc.id}`, r.locked ? 'Unlock' : 'Lock', ButtonStyle.Secondary, r.locked ? 'unlock' : 'lock'), btn(`room:close:${vc.id}`, 'Close', ButtonStyle.Danger, 'close'), linkBtn(url(vc.guildId, vc.id), 'Open room')]
  });
}
export const closedNote = (r) => panel({ color: 'steel', eyebrow: 'Rooms', title: 'Room closed', detail: `${r.code} · ${r.name}`, picture: false, body: ['Open a new one any time with `/room create`.'] });
export function remember(id, channelId, messageId) { if (db.rooms[id]) { db.rooms[id].msg = { channelId, messageId }; save(); } }

function greeting(member, vc, r) {
  return panel({
    color: 'red', eyebrow: 'Norex DJ · Welcome', title: `Welcome to ${r.name}`, detail: `${r.code} · hosted by <@${r.ownerId}>`, picture: false,
    body: [
      [`Hey <@${member.id}>, glad you're here.`, '**Want music?** Type `/play` here with a song name or a link from YouTube, Spotify or SoundCloud.'],
      ['`/effects` change the sound · `/autoplay` keep songs coming · `/volume` · `/room status` say what the room is about']
    ],
    footer: 'This message tidies itself away in a couple of minutes'
  });
}

export function init(c) { client = c; }

export async function onVoice(oldS, newS) {
  const left = oldS.channelId && oldS.channelId !== newS.channelId ? oldS.channel : null;
  const joined = newS.channelId && newS.channelId !== oldS.channelId ? newS.channel : null;
  if (left && isBubble(left.id)) { ctlRefresh(left.id); if (humans(left) === 0) arm(left.id, EMPTY_GRACE_MS); }
  if (joined && isBubble(joined.id)) ctlRefresh(joined.id);
  if (joined && isBubble(joined.id) && !newS.member.user.bot) {
    disarm(joined.id);
    const seen = greeted.get(joined.id) || new Set();
    if (seen.has(newS.id)) return;
    seen.add(newS.id); greeted.set(joined.id, seen);
    const r = info(joined.id);
    const m = await joined.send(greeting(newS.member, joined, r)).catch(() => null);
    if (m) setTimeout(() => m.delete().catch(() => {}), GREET_TTL_MS);
  }
}

// After a restart: forget rooms whose channel is gone, remove the empty ones.
export async function reconcile() {
  for (const id of Object.keys(db.rooms)) {
    const ch = await client.channels.fetch(id).catch(() => null);
    if (!ch) { const b = store.byText(id); if (b) store.drop(b); delete db.rooms[id]; continue; }
    if (humans(ch) === 0) arm(id, 20_000); else ctlSync(id, !db.rooms[id].ctl).catch(() => {});
  }
  save();
}
