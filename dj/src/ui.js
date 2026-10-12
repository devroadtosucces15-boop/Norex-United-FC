// NOREX look: crest-red stripe embeds, steel for errors. The panel is the main surface.
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
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

export function panelPayload(b) {
  const room = b.room; const s = b.settings; const t = room?.current?.info;
  const e = new EmbedBuilder().setColor(RED).setAuthor({ name: `NOREX DJ${room ? ` · ${room.helper.name}` : ''}` });
  if (!room || !t) {
    e.setTitle('Nothing playing').setDescription(`Use \`/play\` to start music in <#${b.voiceId}>.\nEffects, volume and autoplay are set with \`/effects\`, \`/volume\` and \`/autoplay\`.`)
      .addFields({ name: '🎚 Settings', value: `🔊 ${s.volume}% · ${LOOP[s.loop]} · 🔮 Autoplay ${s.autoplay ? 'on' : 'off'}\n✨ ${effectsLine(s)}` });
    return { embeds: [e], components: [] };
  }
  e.setTitle(clip(t.title, 250)).setDescription(`**${t.author}** · ${t.isStream ? '🔴 LIVE' : fmt(t.length)}${room.player?.paused ? ' · ⏸ Paused' : ''}`);
  if (t.uri) e.setURL(t.uri);
  if (t.artworkUrl) e.setThumbnail(t.artworkUrl);
  const next = room.queue.slice(0, 5).map((q, n) => `${n + 1}. ${q.auto ? '🔮 ' : ''}${clip(q.info.title, 60)} — ${q.info.author}`).join('\n');
  e.addFields(
    { name: `⏭ Up next${room.queue.length > 5 ? ` (+${room.queue.length - 5} more)` : ''}`, value: next || (s.autoplay ? '🔮 Finding suggestions…' : 'Queue is empty'), inline: false },
    { name: '🎚 Settings', value: `🔊 ${s.volume}% · ${LOOP[s.loop]} · 🔮 Autoplay ${s.autoplay ? 'on' : 'off'}\n✨ ${effectsLine(s)}` }
  ).setFooter({ text: `Playing in #${room.voiceName || 'voice'} · 🔮 = suggested for you` });

  const btn = (id, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(`dj:${id}`).setLabel(label).setStyle(style);
  const rows = [
    new ActionRowBuilder().addComponents(
      btn('pause', room.player?.paused ? '▶ Play' : '⏸ Pause', ButtonStyle.Primary), btn('skip', '⏭ Skip'), btn('stop', '⏹ Stop', ButtonStyle.Danger),
      btn('shuffle', '🔀 Shuffle'), btn('loop', LOOP[s.loop].slice(0, 2) + ' Loop')),
    new ActionRowBuilder().addComponents(
      btn('vdown', '🔉 −10'), btn('vup', '🔊 +10'), btn('auto', `🔮 Autoplay ${s.autoplay ? 'on' : 'off'}`, s.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary), btn('fxreset', '↺ Reset effects')),
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('dj:fx').setPlaceholder('🎚 Effects — pick any to turn on').setMinValues(0).setMaxValues(EFFECT_NAMES.length)
      .addOptions(EFFECT_NAMES.map((n) => ({ label: EFFECTS[n].label, value: n, emoji: EFFECTS[n].emoji, description: `${EFFECTS[n].blurb} · level ${effectState(s, n).level}`, default: Boolean(s.effects?.[n]?.on) }))))
  ];
  return { embeds: [e], components: rows };
}
