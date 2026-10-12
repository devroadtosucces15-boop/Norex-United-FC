// /playlist: build, import, edit, export and play personal playlists (yours or another member's public one).
import { AttachmentBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import * as pl from './playlists.js';
import { resolve } from './resolve.js';
import { panel, small } from './v2.js';
import { fmt } from './ui.js';

const info = (t) => ({ title: t.info.title, author: t.info.author, length: t.info.length, uri: t.info.uri, sourceName: t.info.sourceName });
const mm = (ms) => (ms ? fmt(ms) : '');
const whose = (i) => i.options.getUser('user') || i.user;
const note = (title, detail, color = 'steel') => panel({ color, eyebrow: 'Playlists', title, detail, picture: false, ephemeral: true });

export async function autocomplete(i) {
  const target = i.options.get('user')?.value || i.user.id;
  const f = String(i.options.getFocused() || '').toLowerCase();
  const rows = pl.lists(target, target !== i.user.id).filter((p) => p.name.toLowerCase().includes(f)).slice(0, 25);
  return i.respond(rows.map((p) => ({ name: `${p.public ? '' : '🔒 '}${p.name} · ${p.n}`.slice(0, 100), value: p.name })));
}

function mine(i, name) { // a playlist the user may change
  const p = pl.get(i.user.id, name);
  return p;
}
function readable(i, name) { // a playlist the user may read (own, or someone's public one)
  const owner = whose(i); const p = pl.get(owner.id, name);
  if (!p) return { error: note('No playlist with that name', `Check /playlist list${owner.id === i.user.id ? '' : ` for ${owner.displayName}`}.`) };
  if (owner.id !== i.user.id && !p.public) return { error: note('That playlist is private', 'Ask its owner to make it public.') };
  return { p, owner };
}

export async function run(i, ctx) {
  const sub = i.options.getSubcommand();
  const me = i.user.id;

  if (sub === 'create') {
    try { pl.create(me, i.options.getString('name')); }
    catch (e) { return i.reply(note(e.message === 'EXISTS' ? 'You already have that playlist' : e.message === 'LIMIT' ? `You have ${pl.LIMITS.playlists} playlists already` : 'Give it a name', 'Pick another name or delete one with /playlist delete.')); }
    return i.reply(panel({ color: 'green', eyebrow: 'Playlists', title: 'Playlist created', detail: i.options.getString('name'), picture: false, ephemeral: true, body: ['Add songs with `/playlist add`, paste many with `/playlist bulk`, or bring a whole list with `/playlist import`.'] }));
  }

  if (sub === 'list') {
    const owner = whose(i); const rows = pl.lists(owner.id, owner.id !== me);
    return i.reply(panel({
      color: 'red', eyebrow: 'Playlists', title: owner.id === me ? 'Your playlists' : `${owner.displayName}'s playlists`, detail: `${rows.length} list${rows.length === 1 ? '' : 's'}`, picture: false, ephemeral: true,
      body: [rows.length ? rows.map((p) => `${p.public ? '🔓' : '🔒'} **${p.name}** · ${p.n} song${p.n === 1 ? '' : 's'}`).join('\n') : 'Nothing here yet. Start with `/playlist create`.']
    }));
  }

  if (sub === 'view') {
    const r = readable(i, i.options.getString('name')); if (r.error) return i.reply(r.error);
    const rows = pl.items(r.p.id); const page = Math.max(1, i.options.getInteger('page') || 1); const per = 15;
    const slice = rows.slice((page - 1) * per, page * per);
    return i.reply(panel({
      color: 'red', eyebrow: 'Playlists', title: r.p.name, detail: `by ${r.owner.displayName} · ${rows.length} songs · page ${page}/${Math.max(1, Math.ceil(rows.length / per))}`, picture: false, ephemeral: true,
      body: [slice.length ? slice.map((x, n) => `\`${String((page - 1) * per + n + 1).padStart(2)}\` ${x.author ? `${x.author} · ` : ''}**${x.title}** ${mm(x.length)}`).join('\n') : 'Empty. Add songs with `/playlist add`.'],
      footer: 'Play it with /playlist play'
    }));
  }

  if (sub === 'add') {
    const p = mine(i, i.options.getString('name')); if (!p) return i.reply(note('No playlist with that name', 'Create it first with /playlist create.'));
    const song = i.options.getString('song');
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    let songs;
    if (song) {
      const r = await resolve(ctx.node(), song).catch((e) => ({ failed: e.message }));
      if (r?.noMatch) return i.editReply(fresh(note('No exact match found', 'Try the YouTube or SoundCloud link for that song.')));
      if (!r || r.failed) return i.editReply(fresh(note('Could not find that', 'Check the name or link and try again.')));
      songs = r.tracks.slice(0, pl.LIMITS.importAtOnce).map(info);
    } else {
      const cur = ctx.roomOf(i)?.current;
      if (!cur) return i.editReply(fresh(note('Nothing is playing', 'Name a song or link, or start music first.')));
      songs = [info(cur)];
    }
    const n = pl.add(p.id, songs);
    return i.editReply(fresh(panel({ color: 'green', eyebrow: 'Playlists', title: n ? `Added ${n} song${n === 1 ? '' : 's'}` : 'Already in the playlist', detail: `${p.name} · ${pl.count(p.id)} songs`, picture: false, ephemeral: true })));
  }

  if (sub === 'bulk') {
    const name = i.options.getString('name');
    return i.showModal(new ModalBuilder().setCustomId(`pl:bulk:${name}`).setTitle(`Add songs to ${name}`.slice(0, 45))
      .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('lines').setLabel('One song or link per line').setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Daft Punk - One More Time\nhttps://open.spotify.com/track/…\nhttps://youtu.be/…').setMaxLength(4000).setRequired(true))));
  }

  if (sub === 'import') {
    const link = i.options.getString('link'); let name = i.options.getString('name');
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    const r = await resolve(ctx.node(), link).catch((e) => ({ failed: e.message }));
    if (!r || r.failed || r.noMatch) return i.editReply(fresh(note('Could not read that link', 'Playlist links from YouTube, SoundCloud and Spotify work. Spotify may refuse some lists: then paste the songs with /playlist bulk.')));
    name = (name || r.title || 'Imported').slice(0, 40);
    let pid; try { pid = pl.ensure(me, name); } catch { return i.editReply(fresh(note(`You have ${pl.LIMITS.playlists} playlists already`, 'Delete one with /playlist delete first.'))); }
    const n = pl.add(pid, r.tracks.slice(0, pl.LIMITS.importAtOnce).map(info));
    return i.editReply(fresh(panel({ color: 'green', eyebrow: 'Playlists', title: `Imported ${n} song${n === 1 ? '' : 's'}`, detail: `${name} · ${pl.count(pid)} songs`, picture: false, ephemeral: true, body: ['Songs are matched to your preferred source (YouTube, then Spotify, then SoundCloud) when they play.'] })));
  }

  if (sub === 'remove') {
    const p = mine(i, i.options.getString('name')); if (!p) return i.reply(note('No playlist with that name', 'Check /playlist list.'));
    return i.reply(pl.removeAt(p.id, i.options.getInteger('position')) ? note('Removed', `${p.name} · ${pl.count(p.id)} songs left`, 'green') : note('No song at that position', 'Use /playlist view to see the numbers.'));
  }

  if (sub === 'export') {
    const r = readable(i, i.options.getString('name')); if (r.error) return i.reply(r.error);
    const text = pl.exportText(r.p, pl.items(r.p.id));
    return i.reply({ content: `**${r.p.name}** · ${pl.count(r.p.id)} songs. Paste the lines into \`/playlist bulk\` on any playlist to import them.`, files: [new AttachmentBuilder(Buffer.from(text), { name: `${r.p.name.replace(/[^\w.-]+/g, '_')}.txt` })], flags: MessageFlags.Ephemeral });
  }

  if (sub === 'rename' || sub === 'delete' || sub === 'visibility') {
    const p = mine(i, i.options.getString('name')); if (!p) return i.reply(note('No playlist with that name', 'Check /playlist list.'));
    if (sub === 'rename') { try { pl.rename(p.id, i.options.getString('new_name')); } catch { return i.reply(note('You already have a playlist with that name', 'Pick another.')); } return i.reply(note('Renamed', i.options.getString('new_name'), 'green')); }
    if (sub === 'delete') { pl.destroy(p.id); return i.reply(note('Playlist deleted', p.name, 'green')); }
    const on = i.options.getBoolean('public'); pl.setPublic(p.id, on);
    return i.reply(note(on ? 'Playlist is public' : 'Playlist is private', on ? 'Other members can see and play it.' : 'Only you can see and play it.', 'green'));
  }

  if (sub === 'play') {
    const r = readable(i, i.options.getString('name')); if (r.error) return i.reply(r.error);
    let rows = pl.items(r.p.id);
    if (!rows.length) return i.reply(note('That playlist is empty', 'Add songs with /playlist add.'));
    if (i.options.getBoolean('shuffle')) rows = rows.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    await i.deferReply();
    const room = await ctx.ensureRoom(i);
    if (room.error) return i.editReply(fresh(note(room.error, 'Join a voice channel, or ask a manager to run /setup here.')));
    await room.room.add(rows.map((x) => ({ info: { title: x.title, author: x.author, length: x.length, uri: x.uri, sourceName: 'stored' }, encoded: null, deferred: x })));
    return i.editReply(fresh(panel({
      color: 'red', eyebrow: 'Playlists', title: `Playing ${r.p.name}`, detail: `${r.owner.displayName}'s playlist · ${rows.length} songs${i.options.getBoolean('shuffle') ? ' · shuffled' : ''}`, picture: false,
      body: [`Queued in ${room.room.helper.name}. Each song is matched to the best source when its turn comes.`]
    })));
  }
}

const fresh = (m) => ({ components: m.components, files: m.files, flags: MessageFlags.IsComponentsV2 });

// Bulk add: every line is a song name or a link; several lines can be long, so the reply is deferred.
export async function bulkSubmit(i, ctx) {
  const name = i.customId.slice('pl:bulk:'.length);
  let pid; try { pid = pl.ensure(i.user.id, name); } catch { return i.reply(note(`You have ${pl.LIMITS.playlists} playlists already`, 'Delete one first.')); }
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const lines = i.fields.getTextInputValue('lines').split(/\r?\n/).map((s) => s.replace(/\s*\|\s*https?:\/\/\S+$/, (m) => m).trim()).filter((s) => s && !s.startsWith('#')).slice(0, pl.LIMITS.bulkLines);
  const missed = []; let songs = [];
  for (const line of lines) {
    const link = line.match(/https?:\/\/\S+/)?.[0];
    const r = await resolve(ctx.node(), link || line).catch(() => null);
    if (!r || r.failed || r.noMatch) { missed.push(line); continue; }
    songs.push(...r.tracks.slice(0, pl.LIMITS.importAtOnce).map(info));
  }
  const n = pl.add(pid, songs);
  return i.editReply(fresh(panel({
    color: missed.length ? 'steel' : 'green', eyebrow: 'Playlists', title: `Added ${n} song${n === 1 ? '' : 's'} to ${name}`, detail: `${pl.count(pid)} songs in total`, picture: false, ephemeral: true,
    body: missed.length ? [`**Not found** (${missed.length}):`, missed.slice(0, 8).map((m) => `• ${m.slice(0, 70)}`).join('\n')] : []
  })));
}
