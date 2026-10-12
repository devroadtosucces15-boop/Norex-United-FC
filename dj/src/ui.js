// NOREX look: crest-red stripe embeds, steel for errors. The panel is the main surface.
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ThumbnailBuilder, MessageFlags, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';
import { COLOR, CREST } from './v2.js';
import { EFFECTS, EFFECT_NAMES, effectState, activeEffects } from './effects.js';

export const RED = 0xc8352c, GREEN = 0x3fa56b, STEEL = 0x6b7785;
export const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const err = (m) => ({ embeds: [new EmbedBuilder().setColor(STEEL).setDescription(m)], ephemeral: true });
export const ok = (m, ephemeral = false) => ({ embeds: [new EmbedBuilder().setColor(RED).setDescription(m)], ephemeral });

const LOOP = { off: '➡️ Off', track: '🔂 Song', queue: '🔁 Queue' };
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export const effectsLine = (settings) => {
  const on = activeEffects(settings);
  return on.length ? on.map((n) => `${EFFECTS[n].emoji} ${EFFECTS[n].label} \`${effectState(settings, n).level}/10\``).join(' · ') : 'None';
};


// ---- The player panel, built to the NOREX bot design system (stripe, label, title, detail, picture top right, divided body, footer, buttons).
const td = (t) => new TextDisplayBuilder().setContent(t);
const sep = (divider = true) => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
const SRC = { youtube: 'YouTube', soundcloud: 'SoundCloud', spotify: 'Spotify', bandcamp: 'Bandcamp', http: 'Link' };
const bar = (pos, len, n = 16) => {
  if (!len) return '`LIVE` 🔴';
  const at = Math.min(n - 1, Math.max(0, Math.floor((pos / len) * n)));
  return `\`${fmt(pos)}\` ${'▬'.repeat(at)}🔘${'▬'.repeat(n - 1 - at)} \`${fmt(len)}\``;
};
const btn = (id, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(`dj:${id}`).setLabel(label).setStyle(style);

export function panelPayload(b, card = null) {
  const room = b.room; const s = b.settings; const cur = room?.current; const t = cur?.info;
  const attach = [new AttachmentBuilder(CREST, { name: 'crest.png' })];
  const flags = MessageFlags.IsComponentsV2;
  const setLine = `🔊 ${s.volume}%  ·  ${LOOP[s.loop]}  ·  🔮 Autoplay ${s.autoplay ? 'on' : 'off'}`;

  if (!room || !t) {
    const c = new ContainerBuilder().setAccentColor(COLOR.steel);
    c.addSectionComponents(new SectionBuilder()
      .addTextDisplayComponents(td('-# NOREX UNITED · Music'), td('## Nothing playing'), td(`-# Plays in <#${b.voiceId}>`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL('attachment://crest.png')));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(td(['**Start the music**', '`/play` a song name or a link from YouTube, Spotify or SoundCloud', '`/playlist play` one of your playlists or a friend\'s'].join('\n')));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(td([setLine, `✨ ${effectsLine(s)}`].join('\n')));
    c.addSeparatorComponents(sep(false));
    c.addTextDisplayComponents(td('-# Effects with /effects · volume with /volume · keep songs coming with /autoplay'));
    return { components: [c], files: attach, flags };
  }

  const paused = Boolean(room.player?.paused);
  const c = new ContainerBuilder().setAccentColor(paused ? COLOR.steel : COLOR.red);
  const src = SRC[t.sourceName] || 'Link';
  const from = cur.from ? ` · from ${cur.from}` : '';
  const art = t.artworkUrl ? new ThumbnailBuilder().setURL(t.artworkUrl) : new ThumbnailBuilder().setURL('attachment://crest.png');
  c.addSectionComponents(new SectionBuilder()
    .addTextDisplayComponents(
      td(`-# NOREX UNITED · ${paused ? '⏸ Paused' : '🔴 Now playing'} · ${room.binding.temp ? 'Room' : 'Player'}`),
      td(`## ${clip(t.title, 120)}`),
      td(`-# ${t.author || 'Unknown artist'}${from} · ${src}`))
    .setThumbnailAccessory(art));
  c.addSeparatorComponents(sep());
  if (card) c.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL('attachment://nowplaying.png').setDescription(`Now playing: ${t.title}`)));
  else c.addTextDisplayComponents(td(t.isStream ? '`LIVE` 🔴 live stream' : bar(room.player?.position || 0, t.length)));
  c.addSeparatorComponents(sep());
  const listeners = room.memberIds?.().length ?? 0;
  c.addTextDisplayComponents(td([
    `**Volume** ${s.volume}%   **Loop** ${LOOP[s.loop]}   **Listeners** ${listeners}`,
    `**Autoplay** ${s.autoplay ? '🔮 on' : 'off'}   **Effects** ${effectsLine(s)}`
  ].join('\n')));
  const next = room.queue.slice(0, 5).map((q, n) => `${n + 1}. ${q.auto ? '🔮 ' : ''}**${clip(q.info.title, 55)}** · ${clip(q.info.author || '', 28)}`).join('\n');
  c.addSeparatorComponents(sep());
  c.addTextDisplayComponents(td(`**Up next**${room.queue.length > 5 ? `  -# +${room.queue.length - 5} more` : ''}\n${next || (s.autoplay ? '🔮 Finding songs you will like…' : 'Queue is empty. Add songs with /play')}`));
  c.addSeparatorComponents(sep());
  c.addActionRowComponents(new ActionRowBuilder().addComponents(
    btn('pause', paused ? '▶ Play' : '⏸ Pause'), btn('skip', '⏭ Skip'), btn('shuffle', '🔀'), btn('loop', LOOP[s.loop].slice(0, 2)), btn('stop', '⏹ Stop', ButtonStyle.Danger)));
  c.addActionRowComponents(new ActionRowBuilder().addComponents(
    btn('vdown', '🔉 −10'), btn('vup', '🔊 +10'), btn('auto', '🔮', s.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary), btn('like', '❤'), btn('dislike', '👎')));
  c.addActionRowComponents(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('dj:fx').setPlaceholder('🎚 Effects: pick any to turn on').setMinValues(0).setMaxValues(EFFECT_NAMES.length)
    .addOptions(EFFECT_NAMES.map((n) => ({ label: EFFECTS[n].label, value: n, emoji: EFFECTS[n].emoji, description: `${EFFECTS[n].blurb} · level ${effectState(s, n).level}`, default: Boolean(s.effects?.[n]?.on) })))));
  c.addSeparatorComponents(sep(false));
  c.addTextDisplayComponents(td(`-# ${room.helper.name} · playing in <#${room.channelId}> · 🔮 = suggested for the room · levels with /effects level`));
  if (card) attach.push(new AttachmentBuilder(card, { name: 'nowplaying.png' }));
  return { components: [c], files: attach, flags };
}
