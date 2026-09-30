// P11.5 – Discord side only this pass. The interactive web card page (an SVG composite of the AI background +
// the member's real photo, with a "download PNG" button reusing the existing client-side poster-PNG technique
// in web/app.js) is a follow-up: it needs scripts/build.mjs + web/app.js + web/style.css, which another
// session was actively editing when this was built – see PLANNING/ROADMAP.md P11.5.
//
// /avatarcard <image>: generates a club-style background with the text-to-image model, stores it plus the
// member's uploaded photo in R2 (same `i/<hex>.<ext>` key scheme + /media/<key> route as the feed, P6.1b) and
// replies with both images. Discord has no API for a bot to set another member's avatar – they download and
// set it themselves (User Settings → Edit Profile) until the real card page ships.
const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const MAX_BYTES = 8e6; // 8 MB – plenty for an avatar photo
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const BG_PROMPT = 'esports team card background, ink black and crest red, bold graphic ribbon banner, empty space in the centre for a player portrait, no text, no people';

const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

async function putImage(env, bytes, ext, contentType) {
  const key = `i/${hex(16)}.${ext}`;
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType } });
  return key;
}

async function generateBackground(env) {
  const out = await env.AI.run(IMAGE_MODEL, { prompt: BG_PROMPT });
  if (typeof out?.image !== 'string') throw new Error('The AI background could not be generated right now – try again shortly.');
  const bytes = Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
  if (bytes.length < 500) throw new Error('The AI background came back empty – try again shortly.');
  return bytes;
}

// attachment: Discord's resolved attachment object { content_type, size, url }.
export async function makeAvatarCard(env, uid, attachment) {
  if (!env.MEDIA) throw new Error('Media storage is not connected.');
  if (!env.AI) throw new Error('The AI binding is not connected.');
  const ext = EXT[attachment?.content_type];
  if (!ext) throw new Error('Upload a PNG, JPG or WEBP image.');
  if ((attachment.size ?? 0) > MAX_BYTES) throw new Error('That image is too big – 8 MB max.');
  const photoRes = await fetch(attachment.url);
  if (!photoRes.ok) throw new Error('Could not download that attachment from Discord.');
  const photoBytes = new Uint8Array(await photoRes.arrayBuffer());
  const [photoKey, bgKey] = await Promise.all([
    putImage(env, photoBytes, ext, attachment.content_type),
    generateBackground(env).then((bytes) => putImage(env, bytes, 'png', 'image/png')),
  ]);
  await env.DB.prepare(`INSERT INTO avatar_cards (user_id, photo_key, bg_key, at) VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id) DO UPDATE SET photo_key = excluded.photo_key, bg_key = excluded.bg_key, at = excluded.at`).bind(uid, photoKey, bgKey, Date.now()).run();
  return { photoKey, bgKey };
}

export const myAvatarCard = (env, uid) => env.DB.prepare('SELECT photo_key, bg_key, at FROM avatar_cards WHERE user_id = ?').bind(uid).first();
