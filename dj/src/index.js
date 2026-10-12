import { Helper, Pool } from './pool.js';
import { Room } from './room.js';
import { resolve } from './resolve.js';
import { DEFS } from './commands.js';
import { REST, Routes } from 'discord.js';
import { err, ok, fmt, nowPlaying } from './ui.js';

const env = process.env;
const lavalink = { host: env.LAVALINK_HOST || 'lavalink:2333', password: env.LAVALINK_PASSWORD };
const managerRoles = (env.MANAGER_ROLE_IDS || '').split(',').filter(Boolean);
const tokens = [env.MAIN_TOKEN, ...(env.HELPER_TOKENS || '').split(',').map((s) => s.trim()).filter(Boolean)];
if (!tokens[0]) throw new Error('MAIN_TOKEN is required');

const helpers = tokens.map((t, i) => new Helper(i === 0 ? 'Norex DJ' : `DJ ${i}`, t, lavalink));
const main = helpers[0];
const pool = new Pool(helpers);

await Promise.all(helpers.map((h) => h.login()));
await Promise.all(helpers.map((h) => (h.client.isReady() ? 1 : h.ready())));
await new REST().setToken(env.MAIN_TOKEN).put(Routes.applicationGuildCommands(env.MAIN_APP_ID, env.GUILD_ID), { body: DEFS });
console.log(`Norex DJ ready: ${helpers.length} room(s)`);

const isManager = (m) => m.permissions.has('ManageGuild') || m.roles.cache.some((r) => managerRoles.includes(r.id));
const canControl = (room, m) => isManager(m) || room.owner === m.id;

main.client.on('interactionCreate', async (i) => {
  try {
    if (i.isButton() && i.customId.startsWith('dj:')) return button(i);
    if (!i.isChatInputCommand()) return;
    const vc = i.member.voice?.channel;
    const room = vc ? pool.roomFor(i.guildId, vc.id) : null;

    if (i.commandName === 'play') {
      if (!vc) return i.reply(err('Join a voice channel first.'));
      await i.deferReply();
      let r = room;
      if (!r) {
        const h = pool.freeHelper(i.guildId);
        if (!h) return i.editReply(err('All DJ rooms are busy right now.'));
        r = new Room({ helper: h, guildId: i.guildId, channelId: vc.id, textChannel: i.channel });
        r.owner = i.user.id;
        h.rooms.set(i.guildId, r);
        try { await r.join(); } catch (e) { h.rooms.delete(i.guildId); return i.editReply(err(`Could not join: ${e.message}`)); }
      }
      const node = r.helper.shoukaku.getIdealNode();
      const found = await resolve(node, i.options.getString('song'));
      if (!found) { if (!r.current) await r.destroy(); return i.editReply(err('Nothing found for that.')); }
      await r.add(found.tracks);
      return i.editReply(ok(found.playlist ? `Queued **${found.tracks.length}** tracks from **${found.title}** · ${r.helper.name}` : `Queued **${found.title}** · ${r.helper.name}`));
    }

    if (!room) return i.reply(err(vc ? 'Nothing is playing in your channel.' : 'Join the voice channel first.'));
    const ctl = () => canControl(room, i.member) || (i.reply(err('Only the person who started the music or a manager can do that. Use /voteskip.')), false);

    switch (i.commandName) {
      case 'nowplaying': return i.reply(nowPlaying(room));
      case 'queue': return i.reply(ok(room.queue.length ? room.queue.slice(0, 15).map((t, n) => `${n + 1}. ${t.info.title} (${fmt(t.info.length)})`).join('\n') + (room.queue.length > 15 ? `\n…and ${room.queue.length - 15} more` : '') : 'Queue is empty.'));
      case 'voteskip': {
        room.votes.add(i.user.id);
        const need = Math.ceil((vc.members.filter((m) => !m.user.bot).size) / 2);
        if (room.votes.size >= need) { await room.skip(); return i.reply(ok('Vote passed, skipping.')); }
        return i.reply(ok(`Skip votes ${room.votes.size}/${need}`));
      }
    }
    if (!ctl()) return;
    switch (i.commandName) {
      case 'skip': await room.skip(); return i.reply(ok('Skipped.'));
      case 'pause': { const p = !room.player.paused; await room.pause(p); return i.reply(ok(p ? 'Paused.' : 'Resumed.')); }
      case 'stop': await room.stop(); return i.reply(ok('Stopped.'));
      case 'volume': await room.setVolume(i.options.getInteger('percent')); return i.reply(ok(`Volume ${room.volume}%`));
      case 'shuffle': room.shuffle(); return i.reply(ok('Shuffled.'));
      case 'loop': room.loop = i.options.getString('mode'); return i.reply(ok(`Loop: ${room.loop}`));
      case 'remove': { const [t] = room.queue.splice(i.options.getInteger('position') - 1, 1); return i.reply(t ? ok(`Removed **${t.info.title}**`) : err('No song at that position.')); }
      case 'filter': await room.setFilter(i.options.getString('name')); return i.reply(ok(`Filter: **${room.filter}**`));
    }
  } catch (e) {
    console.error('interaction', e);
    const msg = err('Something went wrong.');
    (i.deferred || i.replied ? i.followUp(msg) : i.reply(msg)).catch(() => {});
  }
});

async function button(i) {
  const vc = i.member.voice?.channel;
  const room = vc && pool.roomFor(i.guildId, vc.id);
  if (!room) return i.reply(err('Join the music channel first.'));
  if (!canControl(room, i.member)) return i.reply(err('Only the person who started the music or a manager can do that.'));
  const a = i.customId.slice(3);
  if (a === 'pause') await room.pause(!room.player.paused);
  else if (a === 'skip') await room.skip();
  else if (a === 'shuffle') room.shuffle();
  else if (a === 'loop') room.loop = { off: 'track', track: 'queue', queue: 'off' }[room.loop];
  return i.update(nowPlaying(room));
}

process.on('unhandledRejection', (e) => console.error('unhandled', e));
