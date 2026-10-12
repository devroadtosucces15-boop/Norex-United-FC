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
panel.init(main.client);

await Promise.all(helpers.map((h) => h.login()));
await Promise.all(helpers.map((h) => (h.client.isReady() ? 1 : h.ready())));
await new REST().setToken(env.MAIN_TOKEN).put(Routes.applicationGuildCommands(env.MAIN_APP_ID, env.GUILD_ID), { body: DEFS });
for (const b of store.bindings.values()) panel.refresh(b, 1500);
startReportWatch(main.client);
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
