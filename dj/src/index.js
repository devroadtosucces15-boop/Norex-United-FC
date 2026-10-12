import { Helper, Pool } from './pool.js';
import { Room } from './room.js';
import { resolve, platformOf, normalizeLink } from './resolve.js';
import { DEFS } from './commands.js';
import { REST, Routes, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { err, ok, fmt, effectsLine } from './ui.js';
import { EFFECTS, EFFECT_NAMES, effectState } from './effects.js';
import { store } from './store.js';
import * as panel from './panel.js';
import { startReportWatch } from './watch.js';
import * as rooms from './bubbles.js';
import { panel as v2panel, small, btn } from './v2.js';
import { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

const env = process.env;
const lavalink = { host: env.LAVALINK_HOST || 'lavalink:2333', password: env.LAVALINK_PASSWORD };
const managerRoles = (env.MANAGER_ROLE_IDS || '').split(',').filter(Boolean);
const MAX_ROOMS = 5; // main app + 4 helpers
const tokens = [env.MAIN_TOKEN, ...(env.HELPER_TOKENS || '').split(',').map((s) => s.trim()).filter(Boolean)].slice(0, MAX_ROOMS);
if (!tokens[0]) throw new Error('MAIN_TOKEN is required');

const helpers = tokens.map((t, i) => new Helper(i === 0 ? 'Norex DJ' : `DJ ${i}`, t, lavalink, { messages: i === 0 }));
const main = helpers[0];
const pool = new Pool(helpers);
store.load();
rooms.load();
panel.init(main.client);
rooms.init(main.client);

await Promise.all(helpers.map((h) => h.login()));
await Promise.all(helpers.map((h) => (h.client.isReady() ? 1 : h.ready())));
await new REST().setToken(env.MAIN_TOKEN).put(Routes.applicationGuildCommands(env.MAIN_APP_ID, env.GUILD_ID), { body: DEFS });
for (const b of store.bindings.values()) panel.refresh(b, 1500);
startReportWatch(main.client);
rooms.reconcile();
main.client.on('voiceStateUpdate', (o, n) => rooms.onVoice(o, n).catch((e) => console.error('rooms voice', e.message)));
console.log(`Norex DJ ready: ${helpers.length} room(s), ${store.bindings.size} player channel(s)`);

const isManager = (m) => m.permissions.has('ManageGuild') || m.roles.cache.some((r) => managerRoles.includes(r.id));
const canControl = (room, m) => isManager(m) || m.voice?.channelId === room.channelId;
const NOPERM = 'Join the music voice channel first (or ask a manager).';

const onChange = (room) => panel.refresh(room.binding);
const notify = (room, text) => main.client.channels.fetch(room.binding.textId)
  .then((c) => c.send({ embeds: [new EmbedBuilder().setColor(0x6b7785).setDescription(text)] }))
  .then((m) => setTimeout(() => m.delete().catch(() => {}), 20_000)).catch(() => {});
function onDestroy(room) {
  const b = room.binding; b.room = null;
  if (b.temp) { panel.remove(b).then(() => store.drop(b)); } else panel.refresh(b, 200);
}

// Sticky panel: any new message in a player channel schedules a re-post of the panel at the bottom.
main.client.on('messageCreate', (m) => {
  if (m.author.id === main.client.user.id || !m.guildId) return;
  for (const b of store.forText(m.channelId)) if (b.panelId) panel.bump(b);
});

function bindingFor(i) {
  const b = store.byText(i.channelId);
  if (b) return b;
  const vc = i.member.voice?.channel;
  return vc ? store.byVoice(i.guildId, vc.id) : null;
}

async function ensureRoom(i) {
  let b = store.byText(i.channelId);
  if (!b) {
    const vc = i.member.voice?.channel;
    if (!vc) return { error: 'Join a voice channel first, or ask a manager to run `/setup` in this channel.' };
    b = store.byVoice(i.guildId, vc.id) || store.temp({ guildId: i.guildId, textId: i.channelId, voiceId: vc.id });
  }
  if (b.room) return { room: b.room, binding: b };
  const h = pool.freeHelper(i.guildId);
  if (!h) return { error: 'All DJ rooms are busy right now.' };
  const room = new Room({ helper: h, binding: b, onChange, onDestroy, notify });
  b.room = room; h.rooms.set(i.guildId, room);
  try { await room.join(); } catch (e) { b.room = null; h.rooms.delete(i.guildId); return { error: `Could not join the voice channel: ${e.message}` }; }
  return { room, binding: b };
}

main.client.on('interactionCreate', async (i) => {
  try {
    if ((i.isButton() || i.isModalSubmit()) && i.customId.startsWith('room:')) return roomComponent(i);
    if ((i.isButton() || i.isStringSelectMenu()) && i.customId.startsWith('dj:')) return component(i);
    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'play') {
      await i.deferReply();
      const r = await ensureRoom(i);
      if (r.error) return i.editReply(err(r.error));
      const q = i.options.getString('song');
      const found = await resolve(r.room.helper.shoukaku.getIdealNode(), q, i.options.getString('source') || 'auto').catch((e) => ({ failed: e.message }));
      if (found?.noMatch) {
        if (!r.room.current) await r.room.destroy();
        return i.editReply(err(`No exact match found for **${found.title}** on YouTube or SoundCloud, so I did not play anything. Try the YouTube or SoundCloud link instead.`));
      }
      if (!found || found.failed) {
        if (!r.room.current) await r.room.destroy();
        const link = normalizeLink(q);
        const hint = link && /spotify/i.test(link) && !env.SPOTIFY_CLIENT_ID ? ' Spotify links need Spotify credentials set up on the server.' : '';
        return i.editReply(err((found?.failed ? `Could not load that: ${found.failed}` : 'Nothing found for that.') + hint));
      }
      await r.room.add(found.tracks);
      const where = platformOf(normalizeLink(q) || '') ;
      const msg = found.fallback ? `YouTube blocked that link, so I played the exact same song from SoundCloud: **${found.title}**` : found.viaSpotify ? `Queued **${found.title}** (matched from Spotify on ${found.matchedOn === 'soundcloud' ? 'SoundCloud' : 'YouTube'})` : found.playlist ? `Queued **${found.tracks.length}** tracks from **${found.title}**` : `Queued **${found.title}**`;
      return i.editReply(ok(`${msg} · ${r.room.helper.name}${where !== 'link' ? ` · ${where}` : ''}`));
    }

    if (i.commandName === 'room') return roomCommand(i);

    if (i.commandName === 'setup') {
      if (!isManager(i.member)) return i.reply(err('Only managers can set up a player channel.'));
      const vc = i.options.getChannel('voice');
      const need = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.EmbedLinks;
      if (!i.channel.permissionsFor(i.guild.members.me).has(need)) return i.reply(err('I need View Channel, Send Messages and Embed Links in this text channel.'));
      const old = store.byText(i.channelId);
      if (old?.room && old.voiceId !== vc.id) await old.room.destroy();
      const b = store.bind({ guildId: i.guildId, textId: i.channelId, voiceId: vc.id });
      await i.reply(ok(`This channel is now the player for ${vc}. Songs from \`/play\` here play in that voice channel.`, true));
      return panel.refresh(b, 200);
    }
    if (i.commandName === 'unsetup') {
      if (!isManager(i.member)) return i.reply(err('Only managers can do that.'));
      const b = store.byText(i.channelId);
      if (!b) return i.reply(err('This channel is not a player channel.'));
      if (b.room) await b.room.destroy();
      await panel.remove(b); store.drop(b);
      return i.reply(ok('Player removed from this channel.', true));
    }

    const b = bindingFor(i);
    const room = b?.room;
    if (i.commandName === 'panel') {
      if (!b) return i.reply(err('Run `/setup` here first, or join a voice channel with music playing.'));
      await i.reply(ok('Panel re-posted.', true)); await panel.remove(b); return panel.refresh(b, 100);
    }
    if (i.commandName === 'effects' && i.options.getSubcommand() === 'list') {
      if (!b) return i.reply(err('Set up a player channel or join the music channel first.'));
      return i.reply(ok(EFFECT_NAMES.map((n) => { const e = effectState(b.settings, n); return `${e.on ? '🟢' : '⚫'} ${EFFECTS[n].emoji} **${EFFECTS[n].label}** — ${e.level}/10 · ${EFFECTS[n].blurb}`; }).join('\n'), true));
    }
    if (!room) return i.reply(err('Nothing is playing here. Use `/play`.'));
    if (i.commandName === 'queue') {
      return i.reply(ok(room.queue.length ? room.queue.slice(0, 15).map((t, n) => `${n + 1}. ${t.auto ? '🔮 ' : ''}${t.info.title} (${fmt(t.info.length)})`).join('\n') + (room.queue.length > 15 ? `\n…and ${room.queue.length - 15} more` : '') : 'Queue is empty.', true));
    }
    if (i.commandName === 'voteskip') {
      const vc = i.member.voice?.channel;
      if (vc?.id !== room.channelId) return i.reply(err(NOPERM));
      room.votes.add(i.user.id);
      const need = Math.ceil(vc.members.filter((m) => !m.user.bot).size / 2);
      if (room.votes.size >= need) { await room.skip(); return i.reply(ok('Vote passed, skipping.')); }
      return i.reply(ok(`Skip votes ${room.votes.size}/${need}`, true));
    }
    if (!canControl(room, i.member)) return i.reply(err(NOPERM));
    switch (i.commandName) {
      case 'skip': await room.skip(); return i.reply(ok('Skipped.', true));
      case 'pause': { const p = !room.player.paused; await room.pause(p); return i.reply(ok(p ? 'Paused.' : 'Resumed.', true)); }
      case 'stop': await room.stop(); return i.reply(ok('Stopped.', true));
      case 'volume': await room.setVolume(i.options.getInteger('percent')); return i.reply(ok(`Volume ${room.settings.volume}%`, true));
      case 'shuffle': room.shuffle(); return i.reply(ok('Shuffled.', true));
      case 'loop': room.setLoop(i.options.getString('mode')); return i.reply(ok(`Loop: ${room.settings.loop === 'track' ? 'song' : room.settings.loop}`, true));
      case 'remove': { const [t] = room.queue.splice(i.options.getInteger('position') - 1, 1); room.changed(); return i.reply(t ? ok(`Removed **${t.info.title}**`, true) : err('No song at that position.')); }
      case 'autoplay': { const on = i.options.getBoolean('state'); room.setAutoplay(on); return i.reply(ok(on ? '🔮 Autoplay on — suggestions will queue up from this session.' : 'Autoplay off.', true)); }
      case 'effects': {
        const sub = i.options.getSubcommand(); const s = room.settings;
        if (sub === 'reset') { s.effects = {}; await room.applyFilters(); return i.reply(ok('All effects off.', true)); }
        const name = i.options.getString('name');
        const cur = effectState(s, name);
        s.effects = { ...s.effects, [name]: sub === 'level' ? { on: true, level: i.options.getInteger('amount') } : { ...cur, on: i.options.getBoolean('state') } };
        await room.applyFilters();
        const e = s.effects[name];
        return i.reply(ok(`${EFFECTS[name].emoji} **${EFFECTS[name].label}** ${e.on ? `on · level ${e.level}/10` : 'off'}\nActive: ${effectsLine(s)}`, true));
      }
    }
  } catch (e) {
    console.error('interaction', e);
    const msg = err('Something went wrong.');
    (i.deferred || i.replied ? i.followUp(msg) : i.reply(msg)).catch(() => {});
  }
});

const mayRun = (i, id) => isManager(i.member) || rooms.info(id)?.ownerId === i.user.id;
const fresh = (m) => ({ components: m.components, files: m.files, flags: MessageFlags.IsComponentsV2 });
async function roomCommand(i) {
  const sub = i.options.getSubcommand();
  if (sub === 'create') {
    const mine = Object.entries(rooms.all()).find(([, r]) => r.ownerId === i.user.id && r.guildId === i.guildId);
    if (mine) { const have = await i.guild.channels.fetch(mine[0]).catch(() => null); if (have) return i.reply(small('You already have a room', `Join ${mine[1].code} here: ${rooms.url(i.guildId, mine[0])}`)); }
    await i.deferReply();
    try {
      const vc = await rooms.create(i.guild, i.member, i.options.getString('name'));
      const r = rooms.info(vc.id);
      await i.editReply(fresh(rooms.dialog(vc, r)));
      const msg = await i.fetchReply();
      rooms.remember(vc.id, msg.channelId, msg.id);
      return;
    } catch (e) {
      if (e.message === 'FULL') return i.editReply(fresh(small(`All ${rooms.maxRooms} rooms are open`, 'Join one that is open, or wait for one to close.')));
      console.error('room create', e.message);
      return i.editReply(fresh(small('Could not open a room', 'Ask a manager to give Norex DJ Manage Channels, then try again.')));
    }
  }
  const here = i.member.voice?.channelId || i.channelId;
  if (!rooms.isBubble(here)) return i.reply(small('This is not a pop-up room', 'Use it from a room, or open one with /room create.'));
  if (sub === 'status') {
    await rooms.setStatus(here, i.options.getString('text') || '').catch(() => {});
    return i.reply(v2panel({ color: 'steel', title: 'Status updated', detail: i.options.getString('text') || 'Status cleared', picture: false, ephemeral: true }));
  }
  if (['lock', 'unlock', 'limit'].includes(sub)) {
    if (!mayRun(i, here)) return i.reply(small('Only the host or a manager can do that', 'Ask them, or open your own room with /room create.'));
    if (sub === 'limit') { const n = i.options.getInteger('people'); await rooms.setLimit(i.guild, here, n); return i.reply(v2panel({ color: 'steel', title: n ? `Limit set to ${n}` : 'Limit removed', picture: false, ephemeral: true })); }
    await rooms.setLocked(i.guild, here, sub === 'lock');
    return i.reply(v2panel({ color: 'steel', title: sub === 'lock' ? 'Room locked' : 'Room unlocked', detail: sub === 'lock' ? 'Only you and managers can join now' : 'Anyone can join again', picture: false, ephemeral: true }));
  }
  if (sub === 'close') {
    if (!isManager(i.member) && rooms.info(here).ownerId !== i.user.id) return i.reply(small('Only the host or a manager can close this room', 'Ask them, or leave and it closes when empty.'));
    await i.reply(v2panel({ color: 'steel', title: 'Closing the room', detail: 'Everything gets tidied up', picture: false, ephemeral: true }));
    return rooms.remove(here, 'closed');
  }
}
async function roomComponent(i) {
  const [, action, id] = i.customId.split(':');
  const r = rooms.info(id);
  if (!r) return i.reply(small('That room is gone', 'Open a new one with /room create.'));
  if (action === 'move') {
    if (r.locked && !mayRun(i, id)) return i.reply(small('This room is locked', 'Only the host and managers can join. Ask the host to unlock it.'));
    const vcNow = await i.guild.channels.fetch(id).catch(() => null);
    if (r.limit && vcNow && vcNow.members.size >= r.limit && !isManager(i.member)) return i.reply(small('This room is full', `The host set a limit of ${r.limit}. Try again in a bit.`));
    if (!i.member.voice?.channelId) return i.reply(small('Join any voice channel first', 'Then tap Join room again, or use Open room.'));
    await i.member.voice.setChannel(id).catch(() => null);
    return i.reply(v2panel({ color: 'green', eyebrow: 'Rooms', title: 'You are in', detail: `${r.code} · ${r.name}`, picture: false, ephemeral: true, body: ['Enjoy the room. Type `/play` in its chat for music.'] }));
  }
  if (action === 'status') {
    return i.showModal(new ModalBuilder().setCustomId(`room:statusmodal:${id}`).setTitle('Room status')
      .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('text').setLabel('What is the room about?').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false))));
  }
  if (action === 'statusmodal') {
    await rooms.setStatus(id, i.fields.getTextInputValue('text')).catch(() => {});
    return i.reply(v2panel({ color: 'steel', title: 'Status updated', detail: i.fields.getTextInputValue('text') || 'Status cleared', picture: false, ephemeral: true }));
  }
  if (action === 'lock') {
    if (!mayRun(i, id)) return i.reply(small('Only the host or a manager can do that', 'Ask them to lock or unlock the room.'));
    await i.deferUpdate();
    return rooms.setLocked(i.guild, id, !r.locked);
  }
  if (action === 'close') {
    if (!isManager(i.member) && r.ownerId !== i.user.id) return i.reply(small('Only the host or a manager can close this room', 'Ask them, or leave and it closes when empty.'));
    await i.deferUpdate();
    return rooms.remove(id, 'closed');
  }
}

async function component(i) {
  const b = store.byPanel(i.message.id) || bindingFor(i);
  const room = b?.room;
  if (!room) return i.reply(err('Nothing is playing. Use `/play`.'));
  if (!canControl(room, i.member)) return i.reply(err(NOPERM));
  const s = room.settings; const a = i.customId.slice(3);
  if (a === 'pause') await room.pause(!room.player.paused);
  else if (a === 'skip') await room.skip();
  else if (a === 'stop') { await i.deferUpdate(); return room.stop(); }
  else if (a === 'shuffle') room.shuffle();
  else if (a === 'loop') room.setLoop({ off: 'track', track: 'queue', queue: 'off' }[s.loop]);
  else if (a === 'vdown') await room.setVolume(Math.max(1, s.volume - 10));
  else if (a === 'vup') await room.setVolume(Math.min(150, s.volume + 10));
  else if (a === 'auto') room.setAutoplay(!s.autoplay);
  else if (a === 'fxreset') { s.effects = {}; await room.applyFilters(); }
  else if (a === 'fx') {
    const picked = new Set(i.values);
    s.effects = Object.fromEntries(EFFECT_NAMES.map((n) => [n, { ...effectState(s, n), on: picked.has(n) }]));
    await room.applyFilters();
  }
  return i.deferUpdate();
}

process.on('unhandledRejection', (e) => console.error('unhandled', e));
