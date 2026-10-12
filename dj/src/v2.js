// NOREX bot design system, as Discord layout blocks: one container per message with the stripe colour, a small grey label,
// a bold title, a grey detail line, an optional picture top right, body blocks split by thin dividers, a grey footer line
// and grey buttons last (green only approves, red only deletes, links go last).
import {
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ThumbnailBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AttachmentBuilder
} from 'discord.js';

export const COLOR = { red: 0xc8352c, gold: 0xefcf7a, green: 0x4be08a, loss: 0xff7d72, steel: 0x6c7890 };
export const CREST = new URL('../assets/crest.png', import.meta.url).pathname;
const td = (t) => new TextDisplayBuilder().setContent(t);

export const btn = (id, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
export const linkBtn = (url, label) => new ButtonBuilder().setURL(url).setLabel(label).setStyle(ButtonStyle.Link);

/**
 * panel({ color, eyebrow, title, detail, picture, body: [string|string[]], footer, buttons: [ButtonBuilder], ephemeral })
 * body entries are separated by dividers; an array entry is joined into one block.
 */
export function panel({ color = 'red', eyebrow, title, detail, picture = true, body = [], footer, buttons = [], ephemeral = false }) {
  const c = new ContainerBuilder().setAccentColor(COLOR[color] ?? color);
  const head = [td(`-# ${eyebrow ? `NOREX UNITED · ${eyebrow}` : 'NOREX UNITED'}`), td(`## ${title}`), ...(detail ? [td(`-# ${detail}`)] : [])];
  if (picture) c.addSectionComponents(new SectionBuilder().addTextDisplayComponents(...head).setThumbnailAccessory(new ThumbnailBuilder().setURL('attachment://crest.png')));
  else c.addTextDisplayComponents(...head);
  for (const b of body) {
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    c.addTextDisplayComponents(td(Array.isArray(b) ? b.join('\n') : b));
  }
  if (footer) { c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)); c.addTextDisplayComponents(td(`-# ${footer}`)); }
  if (buttons.length) c.addActionRowComponents(new ActionRowBuilder().addComponents(...buttons.slice(0, 5)));
  return {
    components: [c],
    files: picture ? [new AttachmentBuilder(CREST, { name: 'crest.png' })] : [],
    flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0)
  };
}

// Private replies stay small: steel, one bold line and one line saying how to fix it.
export const small = (title, fix) => panel({ color: 'steel', title, detail: fix, picture: false, ephemeral: true });
