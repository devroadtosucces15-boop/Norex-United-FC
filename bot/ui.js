// NOREX bot design system – one layout for every message the bots send (see the "NOREX Bot Design System" preview).
// Built on Discord's Components V2: a message is one panel (container) with a colour stripe, a header (small label, title,
// detail line, optional picture on the right), body blocks split by dividers, drawn cards (scripts/cards.mjs) for anything
// Discord can't lay out, a small footer line and the buttons last. With V2 a message has no `content`/`embeds` – all text
// lives in text blocks.
//   reply(message({ accent: 'win', blocks: [header({...}), cards(url), text('…'), footer('…'), buttons([...])] }))
import { it } from './icons.js';
export const IS_V2 = 1 << 15;
export const EPHEMERAL = 1 << 6;

// Stripe colours – what kind of message it is, before anyone reads a word.
export const ACCENT = {
  red: 0xc8352c, // default: club, stats, commands, music
  gold: 0xefcf7a, // honours: awards, MOTM, approved discoveries, birthdays
  win: 0x4be08a, // wins, went live, approved, done
  loss: 0xff7d72, // losses, jail, warnings
  steel: 0x6c7890, // staff only, private replies, logs, errors
};
export const resultAccent = (res) => ({ W: 'win', D: 'gold', L: 'loss' }[res] ?? 'red');
export const RESULT_ICON = { get W() { return it('win'); }, get D() { return it('draw'); }, get L() { return it('loss'); } };
export const BRAND = 'NOREX UNITED';

const clip = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));

// ---------- blocks ----------
export const text = (content) => (content ? { type: 10, content: clip(content, 3900) } : null);
export const sep = ({ big = false, line = true } = {}) => ({ type: 14, divider: line, spacing: big ? 2 : 1 });
export const footer = (s) => (s ? text(`-# ${s}`) : null);
export const label = (s) => text(`-# **${String(s).toUpperCase()}**`);
// Header: small grey label · bold title · grey detail line, with an optional picture on the right (crest, avatar, card).
export function header({ eyebrow = BRAND, title, sub, thumb, size = 2 }) {
  const t = text([`-# ${String(eyebrow).toUpperCase()}`, `${'#'.repeat(size)} ${title}`, sub && `-# ${sub}`].filter(Boolean).join('\n'));
  return thumb ? { type: 9, components: [t], accessory: { type: 11, media: { url: thumb } } } : t;
}
// A section with a button (or picture) on the right of the text.
export const side = (content, accessory) => (accessory ? { type: 9, components: [text(content)], accessory } : text(content)); // no picture → plain row
// A small picture for the right-hand side of a row (a face, a crest).
export const thumb = (url) => (url ? { type: 11, media: { url } } : null);
// Drawn cards (or any pictures). Null when there's nothing to show, so callers can fall back to text.
export function cards(...imgs) {
  const items = imgs.flat().filter(Boolean).map((i) => (typeof i === 'string' ? { media: { url: i } } : { media: { url: i.url }, description: i.alt ? clip(i.alt, 1000) : undefined }));
  return items.length ? { type: 12, items: items.slice(0, 10) } : null;
}
// "Label  value" lines – Discord can't do columns, so short facts sit one per line, label in bold.
export const facts = (pairs) => text(pairs.filter(([, v]) => v != null && v !== '').map(([k, v]) => `**${k}** ${v}`).join('\n'));

// ---------- buttons ----------
// Grey for normal actions, green only approves, red only rejects or deletes, link buttons (site) always last.
const STYLE = { grey: 2, ok: 3, no: 4, brand: 1 };
export function button({ label: l, id, url, style = 'grey', emoji, disabled }) {
  const b = url ? { type: 2, style: 5, url, label: clip(l, 80) } : { type: 2, style: STYLE[style] ?? 2, custom_id: id, label: l ? clip(l, 80) : undefined };
  if (emoji) b.emoji = { name: emoji };
  if (disabled) b.disabled = true;
  return b;
}
export function buttons(list) {
  const all = list.filter(Boolean).map((b) => (b.type === 2 ? b : button(b)));
  const sorted = [...all.filter((b) => b.style !== 5), ...all.filter((b) => b.style === 5)];
  const rows = [];
  for (let k = 0; k < sorted.length && rows.length < 2; k += 5) rows.push({ type: 1, components: sorted.slice(k, k + 5) });
  return rows;
}

// ---------- messages ----------
export function panel({ accent = 'red', blocks }) {
  return { type: 17, accent_color: ACCENT[accent] ?? accent, components: blocks.flat().filter(Boolean) };
}
// A whole message: optional ping line above the panel (the only text allowed outside it), then the panel.
export function message({ accent, blocks, ping, mentions = { parse: [] }, ephemeral = false }) {
  return {
    flags: IS_V2 | (ephemeral ? EPHEMERAL : 0),
    components: [ping ? text(ping) : null, panel({ accent, blocks })].filter(Boolean),
    allowed_mentions: mentions,
  };
}
// Compact private reply – errors, confirmations, "only managers…": steel, one bold line, one line on what to do.
export function notice(title, body = '', { accent = 'steel', ephemeral = true, extra = [] } = {}) {
  return message({ accent, ephemeral, blocks: [text(`**${title}**${body ? `\n${body}` : ''}`), ...extra] });
}
export const reply = (data) => ({ type: 4, data });

// ---------- drawn cards (site/api/cards.json, made by scripts/cards.mjs) ----------
export function cardUrl(manifest, ...key) {
  let x = manifest;
  for (const k of key) x = x?.[k];
  return typeof x === 'string' && manifest?.base ? manifest.base + x : null;
}

// A fixed banner picture (jail, wheel, discovery, matchnight – drawn by scripts/cards.mjs). Needs no manifest lookup.
export const BANNER_V = 4; // = TEMPLATE_VERSION in scripts/cards.mjs
export const bannerUrl = (env, name) => (env?.SITE_URL ? `${String(env.SITE_URL).replace(/\/?$/, '/')}cards/banner-${name}.png?v=${BANNER_V}` : null);

// Every piece of text in a message, flattened – for tests and for logging.
export function plainText(msg) {
  const out = [];
  const walk = (c) => {
    if (!c || typeof c !== 'object') return;
    if (Array.isArray(c)) return c.forEach(walk);
    if (c.type === 10) out.push(c.content);
    if (c.label) out.push(c.label);
    walk(c.components); walk(c.accessory);
  };
  walk(msg?.components);
  if (msg?.content) out.unshift(msg.content);
  return out.join('\n');
}
export const isV2 = (msg) => !!(msg?.flags & IS_V2);
// The same message as a plain embed – only for editing posts made before the design system, which Discord may not let
// us switch over (the V2 flag can only be set when a message is created). Keeps their text and buttons working.
export function toLegacy(msg) {
  const panel = (msg?.components ?? []).find((c) => c.type === 17);
  const rows = [];
  const walk = (c) => { if (!c || typeof c !== 'object') return; if (Array.isArray(c)) return c.forEach(walk); if (c.type === 1) rows.push(c); else walk(c.components); };
  walk(panel?.components);
  return { content: '', embeds: [{ color: panel?.accent_color, description: plainText({ components: [panel] }).replace(/^-# /gm, '').replace(/^#{1,3} /gm, '**').slice(0, 4000) }], components: rows.slice(0, 5) };
}
// Every picture URL in a message (gallery items + right-hand thumbnails).
export function images(msg) {
  const out = [];
  const walk = (c) => {
    if (!c || typeof c !== 'object') return;
    if (Array.isArray(c)) return c.forEach(walk);
    if (c.type === 12) c.items.forEach((i) => out.push(i.media.url));
    if (c.type === 11) out.push(c.media.url);
    walk(c.components); walk(c.accessory);
  };
  walk(msg?.components);
  return out;
}
