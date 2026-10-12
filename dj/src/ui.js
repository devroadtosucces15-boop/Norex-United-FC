// v1 look: NOREX red stripe, grey buttons, steel replies for errors. (Components V2 panel from bot/ui.js comes next.)
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
export const RED = 0xc8352c, GREEN = 0x3fa56b, STEEL = 0x6b7785;
export const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const err = (m) => ({ embeds: [new EmbedBuilder().setColor(STEEL).setDescription(m)], ephemeral: true });
export const ok = (m) => ({ embeds: [new EmbedBuilder().setColor(RED).setDescription(m)] });

export function nowPlaying(room) {
  const t = room.current?.info;
  const e = new EmbedBuilder().setColor(RED).setAuthor({ name: `NOW PLAYING · ${room.helper.name}` });
  if (!t) return { embeds: [e.setDescription('Nothing playing.')], components: [] };
  e.setTitle(t.title).setURL(t.uri || null).setDescription(`${t.author} · ${t.isStream ? 'LIVE' : fmt(t.length)}`)
    .setFooter({ text: `Queue ${room.queue.length} · Vol ${room.volume}% · Filter ${room.filter} · Loop ${room.loop}` });
  if (t.artworkUrl) e.setThumbnail(t.artworkUrl);
  const b = (id, label) => new ButtonBuilder().setCustomId(`dj:${id}`).setLabel(label).setStyle(ButtonStyle.Secondary);
  return { embeds: [e], components: [new ActionRowBuilder().addComponents(b('pause', '⏯'), b('skip', '⏭'), b('shuffle', '🔀'), b('loop', '🔁'))] };
}
