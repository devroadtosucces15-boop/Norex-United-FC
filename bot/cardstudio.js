import { can, flagOn } from './roles.js';
import { hex } from './media.js';
import { notify, notifyManagers, safely } from './notify.js';

export const CARD_MODEL = '@cf/black-forest-labs/flux-2-klein-9b';
export const MAX_ATTEMPTS = 3;
const RETRY_AFTER = 2 * 60e3; // a failed try waits this long before the next one
const STALE_AFTER = 10 * 60e3; // a "generating" row older than this was abandoned by a dead Worker run
const REF_MAX = 500; // FLUX.2 wants reference images under 512×512

export const CARD_SIZE = 1024;
export const TEMPLATE_MAX = 5e6;
export const COST_MAX = 100000;
export const PHOTO_MAX = 8e6;
const KINDS = ['bg', 'pose'];
const TIERS = ['free', 'premium'];
const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export function pngSize(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || sig.some((b, i) => bytes[i] !== b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { w: view.getUint32(16), h: view.getUint32(20) };
}

export async function canUseTemplate(env, userId, template) {
  if (!template || !template.active) return false;
  if (template.tier === 'free') return true;
  const row = await one(env, 'SELECT 1 AS ok FROM card_unlocks WHERE user_id = ? AND template_id = ?', userId, template.id);
  return !!row;
}

const gate = (me, env) => (me && flagOn(env, me, 'cardStudio') && can(me, 'cards.use') ? null : fail('Not available yet.', 404));

export async function cardTemplateUpload(request, me, env, url, log) {
  const blocked = gate(me, env);
  if (blocked) return blocked;
  if (!can(me, 'cards.templates')) return fail('Managers only.', 403);
  if (!env.MEDIA) return fail('Media storage is not connected.', 503);
  const kind = url.searchParams.get('kind');
  if (!KINDS.includes(kind)) return fail('Pick background or pose.');
  const name = clean(url.searchParams.get('name'), 40);
  if (!name) return fail('Give the template a name.');
  const tier = TIERS.includes(url.searchParams.get('tier')) ? url.searchParams.get('tier') : 'free';
  const cost = tier === 'premium' ? Math.floor(Number(url.searchParams.get('cost'))) : 0;
  if (tier === 'premium' && !(cost >= 1 && cost <= COST_MAX)) return fail(`Premium templates need a point cost between 1 and ${COST_MAX}.`);
  const prompt = clean(url.searchParams.get('prompt'), 200);
  if (kind === 'pose' && !prompt) return fail('Poses need a prompt fragment, e.g. "flexing both arms".');
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const ext = IMAGE_TYPES[type];
  if (!ext) return fail('Upload a PNG, JPG or WEBP image.');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return fail('That file is empty.');
  if (bytes.length > TEMPLATE_MAX) return fail('That image is too big – 5 MB max.');
  if (kind === 'bg') {
    if (ext !== 'png') return fail('Backgrounds must be PNG files.');
    const size = pngSize(bytes);
    if (!size) return fail('That is not a valid PNG.');
    if (size.w !== CARD_SIZE || size.h !== CARD_SIZE) return fail(`Backgrounds must be exactly ${CARD_SIZE}×${CARD_SIZE} px – this one is ${size.w}×${size.h}.`);
  }
  const key = `card/${hex(16)}.${ext}`;
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type } });
  const res = await run(env, 'INSERT INTO card_templates (kind, name, tier, point_cost, active, asset_key, prompt, created_by, created_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)', kind, name, tier, cost, key, prompt, me.u, Date.now());
  await log(env, me, 'card-template-add', `${kind}: ${name}`);
  return json({ id: res.meta?.last_row_id ?? null, key });
}

// ---------- member card requests: one per month, photo + background + pose, manager approves ----------
let kick = false; // a request was just approved → handleMembers starts generating right after responding
export const takeCardKick = () => { const k = kick; kick = false; return k; };
export const monthKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 7);
const startsWith = (b, sig, at = 0) => sig.every((x, i) => b[at + i] === x);
export function photoType(b) {
  if (b.length < 12) return null;
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return ['image/png', 'png'];
  if (startsWith(b, [0xff, 0xd8, 0xff])) return ['image/jpeg', 'jpg'];
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return ['image/webp', 'webp'];
  return null;
}
const dropPhoto = (env, key) => (key && env.MEDIA ? env.MEDIA.delete(key).catch(() => {}) : null);

const reqView = (r, extra = {}) => ({
  id: r.id, month: r.month, status: r.status === 'done' && r.published === 0 ? 'review' : r.status, note: r.note, bg: r.bg_name ?? null, pose: r.pose_name ?? null,
  createdAt: r.created_at, decidedAt: r.decided_at, hasResult: !!r.result_key, hasPortrait: !!r.portrait_key, avatarEnabled: r.avatar_enabled !== 0, portraitEnabled: r.portrait_enabled === 1, attempts: r.attempts, ...extra,
});
const REQ_SQL = `SELECT r.*, b.name AS bg_name, p.name AS pose_name FROM card_requests r
  LEFT JOIN card_templates b ON b.id = r.bg_id LEFT JOIN card_templates p ON p.id = r.pose_id`;

// POST /api/cards/request?bg=<id>&pose=<id> – the body is the raw photo. Photos live under cardphoto/ (never /media),
// so only the member and managers can ever see them; they are deleted on reject/cancel.
export async function cardRequestUpload(request, me, env, url, log) {
  const blocked = gate(me, env);
  if (blocked) return blocked;
  if (!env.MEDIA) return fail('Media storage is not connected.', 503);
  const avatarEnabled = url.searchParams.get('avatar') !== '0';
  const portraitEnabled = url.searchParams.get('portrait') === '1';
  if (!avatarEnabled && !portraitEnabled) return fail('Choose at least one output.');
  const month = monthKey();
  const existing = await one(env, 'SELECT id, status FROM card_requests WHERE user_id = ? AND month = ?', me.u, month);
  if (existing && existing.status !== 'rejected') return fail('You already sent a card request this month – the next one opens on the 1st.', 409);
  const bg = await one(env, "SELECT * FROM card_templates WHERE id = ? AND kind = 'bg'", Number(url.searchParams.get('bg')));
  const pose = await one(env, "SELECT * FROM card_templates WHERE id = ? AND kind = 'pose'", Number(url.searchParams.get('pose')));
  if (avatarEnabled && !bg) return fail('Pick a background for your cinematic avatar.');
  if (avatarEnabled && !pose) return fail('Pick a pose for your cinematic avatar.');
  if (bg && !(await canUseTemplate(env, me.u, bg))) return fail('That background is locked for you.', 403);
  if (pose && !(await canUseTemplate(env, me.u, pose))) return fail('That pose is locked for you.', 403);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return fail('Choose a photo first.');
  if (bytes.length > PHOTO_MAX) return fail('That photo is too big – 8 MB max.');
  const type = photoType(bytes);
  if (!type) return fail('Upload a PNG, JPG or WEBP photo.');
  const key = `cardphoto/${hex(16)}.${type[1]}`;
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type[0] } });
  try {
    if (existing) await run(env, "DELETE FROM card_requests WHERE id = ? AND status = 'rejected'", existing.id);
    await run(env, 'INSERT INTO card_requests (user_id, month, bg_id, pose_id, photo_key, status, created_at, avatar_enabled, portrait_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', me.u, month, bg?.id ?? 0, pose?.id ?? 0, key, 'pending', Date.now(), avatarEnabled ? 1 : 0, portraitEnabled ? 1 : 0);
  } catch {
    await dropPhoto(env, key);
    return fail('You already sent a card request this month – the next one opens on the 1st.', 409);
  }
  await log(env, me, 'card-request', avatarEnabled ? `${bg.name} + ${pose.name}` : 'Standardized portrait');
  await safely(notifyManagers(env, { icon: '🪪', title: 'New card request', body: avatarEnabled ? `${me.n || 'A member'} asked for a ${bg.name} / ${pose.name} card.` : `${me.n || 'A member'} asked for a standardized website portrait.`, link: 'members.html#cards', ref: `card:${me.u}:${month}` }, me.u));
  return json(await mine(env, me));
}

async function mine(env, me) {
  const r = await one(env, `${REQ_SQL} WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 1`, me.u);
  return { month: monthKey(), request: r ? reqView(r) : null };
}

// GET /api/cards/photo/<id> – Bearer-authenticated: the requester or a manager.
export async function cardPhoto(request, me, env, id) {
  const blocked = gate(me, env);
  if (blocked) return blocked;
  const r = await one(env, 'SELECT user_id, photo_key FROM card_requests WHERE id = ?', Number(id));
  if (!r || !r.photo_key || !env.MEDIA) return new Response('Not found', { status: 404 });
  if (r.user_id !== me.u && !can(me, 'cards.templates')) return new Response('Not found', { status: 404 });
  const obj = await env.MEDIA.get(r.photo_key);
  if (!obj) return new Response('Photo removed', { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Content-Security-Policy', "default-src 'none'; sandbox");
  h.set('Cache-Control', 'private, no-store');
  return new Response(obj.body, { headers: h });
}

const view = (t, unlocked, manage) => ({
  id: t.id, kind: t.kind, name: t.name, tier: t.tier, pointCost: t.point_cost, key: t.asset_key,
  locked: t.tier === 'premium' && !unlocked, unlocked: t.tier === 'free' || unlocked,
  ...(manage ? { active: !!t.active, prompt: t.prompt } : {}),
});

export async function cardsRoute(p, method, body, me, env, log) {
  if (!p.startsWith('/api/cards/')) return null;
  const blocked = gate(me, env);
  if (blocked) return blocked;
  const manage = can(me, 'cards.templates');

  if (p === '/api/cards/templates' && method === 'GET') {
    const rows = await all(env, `SELECT * FROM card_templates ${manage ? '' : 'WHERE active = 1'} ORDER BY kind, id`);
    const owned = new Set((await all(env, 'SELECT template_id FROM card_unlocks WHERE user_id = ?', me.u)).map((r) => r.template_id));
    const templates = rows.map((t) => view(t, owned.has(t.id), manage));
    const people = manage ? await all(env, 'SELECT id, name FROM users ORDER BY name COLLATE NOCASE LIMIT 500') : undefined;
    return json({ size: CARD_SIZE, manage, people, backgrounds: templates.filter((t) => t.kind === 'bg'), poses: templates.filter((t) => t.kind === 'pose') });
  }

  if (p === '/api/cards/templates/update' && method === 'POST') {
    if (!manage) return fail('Managers only.', 403);
    const t = await one(env, 'SELECT * FROM card_templates WHERE id = ?', Number(body.id));
    if (!t) return fail('Template not found.', 404);
    const name = body.name === undefined ? t.name : clean(body.name, 40);
    if (!name) return fail('Give the template a name.');
    const tier = body.tier === undefined ? t.tier : body.tier;
    if (!TIERS.includes(tier)) return fail('Tier must be free or premium.');
    const cost = tier === 'free' ? 0 : Math.floor(Number(body.point_cost ?? t.point_cost));
    if (tier === 'premium' && !(cost >= 1 && cost <= COST_MAX)) return fail(`Premium templates need a point cost between 1 and ${COST_MAX}.`);
    const prompt = body.prompt === undefined ? t.prompt : clean(body.prompt, 200);
    if (t.kind === 'pose' && !prompt) return fail('Poses need a prompt fragment.');
    const active = body.active === undefined ? t.active : body.active ? 1 : 0;
    await run(env, 'UPDATE card_templates SET name = ?, tier = ?, point_cost = ?, prompt = ?, active = ? WHERE id = ?', name, tier, cost, prompt, active, t.id);
    await log(env, me, 'card-template-edit', `${t.kind}: ${name}`);
    return json({ ok: true });
  }

  if ((p === '/api/cards/grant' || p === '/api/cards/revoke') && method === 'POST') {
    if (!manage) return fail('Managers only.', 403);
    const t = await one(env, 'SELECT * FROM card_templates WHERE id = ?', Number(body.template));
    if (!t) return fail('Template not found.', 404);
    if (t.tier !== 'premium') return fail('Only premium templates need unlocking.');
    const target = await one(env, 'SELECT id, name FROM users WHERE id = ?', String(body.user ?? ''));
    if (!target) return fail('That member was not found.', 404);
    if (p === '/api/cards/grant') {
      await run(env, "INSERT INTO card_unlocks (user_id, template_id, source, at) VALUES (?, ?, 'grant', ?) ON CONFLICT (user_id, template_id) DO NOTHING", target.id, t.id, Date.now());
      await log(env, me, 'card-grant', `${t.name} → ${target.name}`);
    } else {
      await run(env, "DELETE FROM card_unlocks WHERE user_id = ? AND template_id = ? AND source = 'grant'", target.id, t.id);
      await log(env, me, 'card-revoke', `${t.name} ← ${target.name}`);
    }
    return json({ ok: true });
  }

  if (p === '/api/cards/request' && method === 'GET') return json(await mine(env, me));

  if (p === '/api/cards/request/cancel' && method === 'POST') {
    const r = await one(env, "SELECT id, photo_key FROM card_requests WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1", me.u);
    if (!r) return fail('You have no pending request.', 404);
    await run(env, "DELETE FROM card_requests WHERE id = ? AND status = 'pending'", r.id);
    await dropPhoto(env, r.photo_key);
    await log(env, me, 'card-request-cancel', `#${r.id}`);
    return json(await mine(env, me));
  }

  if (p === '/api/cards/requests' && method === 'GET') {
    if (!manage) return fail('Managers only.', 403);
    const rows = await all(env, `SELECT r.*, b.name AS bg_name, p.name AS pose_name, u.name AS user_name, d.name AS decider FROM card_requests r
      LEFT JOIN card_templates b ON b.id = r.bg_id LEFT JOIN card_templates p ON p.id = r.pose_id
      LEFT JOIN users u ON u.id = r.user_id LEFT JOIN users d ON d.id = r.decided_by
      WHERE r.status = 'pending' OR (r.status = 'done' AND r.published = 0) OR r.decided_at > ? ORDER BY (r.status = 'pending') DESC, COALESCE(r.decided_at, r.created_at) DESC LIMIT 100`, Date.now() - 14 * 864e5);
    return json({ requests: rows.map((r) => reqView(r, { user: r.user_name || 'Member', userId: r.user_id, decider: r.decider || null })) });
  }

  if (p === '/api/cards/requests/decide' && method === 'POST') {
    if (!manage) return fail('Managers only.', 403);
    const decision = body.decision;
    if (!['approve', 'reject'].includes(decision)) return fail('Approve or reject.');
    const r = await one(env, 'SELECT * FROM card_requests WHERE id = ?', Number(body.id));
    if (!r) return fail('Request not found.', 404);
    if (r.status !== 'pending') return fail('That request was already decided.', 409);
    const note = clean(body.note, 200);
    if (decision === 'reject' && !note) return fail('Add a short reason so the member knows what to fix.');
    const status = decision === 'approve' ? 'approved' : 'rejected';
    const res = await run(env, "UPDATE card_requests SET status = ?, note = ?, decided_by = ?, decided_at = ? WHERE id = ? AND status = 'pending'", status, note, me.u, Date.now(), r.id);
    if (!res.meta?.changes) return fail('That request was already decided.', 409);
    if (status === 'rejected') { await dropPhoto(env, r.photo_key); await run(env, "UPDATE card_requests SET photo_key = '' WHERE id = ?", r.id); }
    if (status === 'approved') kick = true;
    const who = await one(env, 'SELECT name FROM users WHERE id = ?', r.user_id);
    await log(env, me, `card-request-${status}`, `${who?.name ?? r.user_id} ${r.month}`);
    await safely(notify(env, [r.user_id], status === 'approved'
      ? { type: 'card', icon: '✅', title: 'Your card request was approved', body: 'A manager approved your photo. Your card is next in line.', link: 'members.html#cards', ref: `card:${r.user_id}:${r.month}` }
      : { type: 'card', icon: '❌', title: 'Your card request was not approved', body: `${note} You can send a new photo – it does not use up your month.`, link: 'members.html#cards', ref: `card:${r.user_id}:${r.month}` }));
    return json({ ok: true, status });
  }

  if (p === '/api/cards/requests/review' && method === 'POST') {
    if (!manage) return fail('Managers only.', 403);
    if (!['publish', 'regenerate'].includes(body.decision)) return fail('Publish or regenerate.');
    const r = await one(env, 'SELECT * FROM card_requests WHERE id = ?', Number(body.id));
    if (!r || r.status !== 'done' || r.published !== 0) return fail('Artwork is not awaiting review.', 409);
    if (body.decision === 'publish') {
      const updated = await run(env, "UPDATE card_requests SET published = 1, photo_key = '' WHERE id = ? AND status = 'done' AND published = 0", r.id);
      if (!updated.meta?.changes) return fail('Already reviewed.', 409);
      await dropPhoto(env, r.photo_key);
      // Private source photo is removed after publishing.
      await safely(notify(env, [r.user_id], { type: 'card', icon: '🏁', title: 'Your NOREX artwork is ready', body: 'Manager-approved artwork is ready to download.', link: 'members.html#cards', ref: `card:${r.user_id}:${r.month}` }));
    } else {
      const updated = await run(env, "UPDATE card_requests SET status = 'approved', published = 0, attempts = 0, started_at = NULL, result_key = NULL, portrait_key = NULL WHERE id = ? AND status = 'done' AND published = 0", r.id);
      if (!updated.meta?.changes) return fail('Already reviewed.', 409);
      await Promise.all([dropPhoto(env, r.result_key), dropPhoto(env, r.portrait_key)]);
      kick = true;
    }
    await log(env, me, 'card-artwork-' + body.decision, `#${r.id}`);
    return json({ ok: true });
  }

  if (p === '/api/cards/requests/retry' && method === 'POST') {
    if (!manage) return fail('Managers only.', 403);
    const res = await run(env, "UPDATE card_requests SET status = 'approved', attempts = 0, started_at = NULL WHERE id = ? AND status = 'failed'", Number(body.id));
    if (!res.meta?.changes) return fail('Only a failed request can be retried.', 409);
    kick = true;
    await log(env, me, 'card-retry', `#${Number(body.id)}`);
    return json({ ok: true });
  }

  return fail('Not found.', 404);
}

// ---------- generation: approved request → AI card in R2 ----------
// GET /api/cards/result/<id> – Bearer-authenticated: the requester or a manager. Cards live under cardresult/ (never /media).
export async function cardResult(request, me, env, id) {
  const blocked = gate(me, env);
  if (blocked) return blocked;
  const r = await one(env, 'SELECT user_id, result_key, portrait_key, status, published FROM card_requests WHERE id = ?', Number(id));
  if (!r) return new Response('Not found', { status: 404 });
  if ((r.status !== 'done' || r.published === 0) && !can(me, 'cards.templates')) return new Response('Not found', { status: 404 });
  const portrait = new URL(request.url).searchParams.get('kind') === 'portrait';
  const key = portrait ? r?.portrait_key : r?.result_key;
  if (!key || !env.MEDIA) return new Response('Not found', { status: 404 });
  if (r.user_id !== me.u && !can(me, 'cards.templates')) return new Response('Not found', { status: 404 });
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response('Card removed', { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Content-Security-Policy', "default-src 'none'; sandbox");
  h.set('Cache-Control', 'private, no-store');
  return new Response(obj.body, { headers: h });
}

export const cardPrompt = (poseFragment) =>
  'Image 0 is the card background: keep its colours, framing and empty centre exactly. '
  + `Image 1 is the player: keep their real face, hair and skin tone. Place the player from image 1 in the centre of image 0, ${poseFragment}. `
  + 'Esports football club player card, clean studio lighting, sharp, no text, no logos, no watermark.';

// FLUX.2 rejects references of 512×512 or more; shrink with the Images binding when it is bound.
async function reference(env, bytes, type) {
  if (!env.IMAGES?.input) return new Blob([bytes], { type });
  const out = await env.IMAGES.input(new Blob([bytes]).stream()).transform({ width: REF_MAX, height: REF_MAX, fit: 'scale-down' }).output({ format: 'image/png' });
  return new Blob([await out.response().arrayBuffer()], { type: 'image/png' });
}

async function render(env, bg, pose, photo, portrait = false) {
  if (!env.AI) throw new Error('The AI binding is not connected.');
  const form = new FormData();
  form.append('prompt', portrait ? 'Image 0 is the person. Preserve their facial identity, hairstyle, skin tone and expression. Create a consistent clean semi-cartoon football player bust portrait, head and chest only, straight-on camera, neutral relaxed pose, centered with generous margins, wearing a generic black red and white football jersey, no text, no numbers, no logos, no badges, no frame, no scenery. Solid contrasting light background suitable for automated cutout. Match a repeatable professional game-card illustration style.' : cardPrompt(pose.prompt));
  form.append('width', String(CARD_SIZE));
  form.append('height', String(CARD_SIZE));
  if (!portrait) form.append('input_image_0', await reference(env, bg.bytes, bg.type), 'background.png');
  form.append(portrait ? 'input_image_0' : 'input_image_1', await reference(env, photo.bytes, photo.type), 'player.png');
  const packed = new Response(form);
  const out = await env.AI.run(CARD_MODEL, { multipart: { body: packed.body, contentType: packed.headers.get('content-type') } });
  if (typeof out?.image !== 'string') throw new Error('The image model returned no picture.');
  const bytes = Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
  const type = photoType(bytes);
  if (bytes.length < 1000 || !type) throw new Error('The image model returned an unusable picture.');
  const dimensions = type[1] === 'png' ? pngSize(bytes) : null;
  if (dimensions && dimensions.w && dimensions.h && (dimensions.w !== CARD_SIZE || dimensions.h !== CARD_SIZE)) throw new Error('AI artwork must be exactly 1024 × 1024 pixels.');
  return { bytes, type };
}

async function readAsset(env, key) {
  const obj = key ? await env.MEDIA.get(key) : null;
  if (!obj) return null;
  const bytes = new Uint8Array(await new Response(obj.body).arrayBuffer());
  return { bytes, type: photoType(bytes)?.[0] || 'image/png' };
}

// Claims one request (approved, or "generating" for too long) and makes its card. Returns what happened.
async function generateOne(env, r, now) {
  const claimed = await run(env, `UPDATE card_requests SET status = 'generating', attempts = attempts + 1, started_at = ?
    WHERE id = ? AND attempts < ? AND ((status = 'approved' AND (started_at IS NULL OR started_at < ?)) OR (status = 'generating' AND started_at < ?))`,
  now, r.id, MAX_ATTEMPTS, now - RETRY_AFTER, now - STALE_AFTER);
  if (!claimed.meta?.changes) return 'skipped';
  const attempt = r.attempts + 1;
  let resultKey = null;
  let portraitKey = null;
  try {
    const [bgT, poseT] = await Promise.all([one(env, 'SELECT asset_key FROM card_templates WHERE id = ?', r.bg_id), one(env, 'SELECT prompt FROM card_templates WHERE id = ?', r.pose_id)]);
    const [bg, photo] = await Promise.all([readAsset(env, bgT?.asset_key), readAsset(env, r.photo_key)]);
    if (r.avatar_enabled !== 0 && (!bg || !poseT)) throw new Error('The chosen background or pose is gone.');
    if (!photo) throw new Error('The photo is gone.');
    if (r.avatar_enabled !== 0) {
      const card = await render(env, bg, poseT, photo);
      resultKey = `cardresult/${hex(16)}.${card.type[1]}`;
      await env.MEDIA.put(resultKey, card.bytes, { httpMetadata: { contentType: card.type[0] } });
    }
    if (r.portrait_enabled === 1) {
      const portrait = await render(env, bg, poseT, photo, true);
      portraitKey = `cardresult/${hex(16)}.${portrait.type[1]}`;
      await env.MEDIA.put(portraitKey, portrait.bytes, { httpMetadata: { contentType: portrait.type[0] } });
    }
    const res = await run(env, "UPDATE card_requests SET status = 'done', published = 0, result_key = ?, portrait_key = ?, started_at = NULL WHERE id = ? AND status = 'generating'", resultKey, portraitKey, r.id);
    if (!res.meta?.changes) { await dropPhoto(env, resultKey); await dropPhoto(env, portraitKey); return 'skipped'; }
    await safely(notifyManagers(env, { icon: '🎨', title: 'Card artwork awaiting review', body: `Request #${r.id} is ready for final approval.`, link: 'members.html#cards', ref: `cardreview:${r.id}` }));
    return 'done';
  } catch (e) {
    console.log('card generation failed', r.id, attempt, e.message);
    if (resultKey) await dropPhoto(env, resultKey);
    if (portraitKey) await dropPhoto(env, portraitKey);
    const final = attempt >= MAX_ATTEMPTS;
    await run(env, "UPDATE card_requests SET status = ?, started_at = ? WHERE id = ? AND status = 'generating'", final ? 'failed' : 'approved', now, r.id);
    if (final) {
      await safely(notify(env, [r.user_id], { type: 'card', icon: '⚠️', title: 'Your card could not be made', body: 'It did not work after 3 tries. A manager has been told and will retry.', link: 'members.html#cards', ref: `card:${r.user_id}:${r.month}` }));
      await safely(notifyManagers(env, { icon: '⚠️', title: 'A card failed to generate', body: `Card request #${r.id} (${r.month}) failed 3 times: ${clean(e.message, 120)}`, link: 'members.html#cards', ref: `cardfail:${r.id}` }));
    }
    return final ? 'failed' : 'retry';
  }
}

// Called from the cron and, right after an approval, from the request itself. Never throws.
export async function generateCards(env, { limit = 2, now = Date.now() } = {}) {
  if (!env.DB || !env.MEDIA) return [];
  await run(env, "UPDATE card_requests SET status = 'failed' WHERE status = 'generating' AND attempts >= ? AND started_at < ?", MAX_ATTEMPTS, now - STALE_AFTER); // died on the last try
  const rows = await all(env, `SELECT * FROM card_requests WHERE attempts < ? AND ((status = 'approved' AND (started_at IS NULL OR started_at < ?)) OR (status = 'generating' AND started_at < ?))
    ORDER BY decided_at LIMIT ?`, MAX_ATTEMPTS, now - RETRY_AFTER, now - STALE_AFTER, limit);
  const results = [];
  for (const r of rows) results.push(await generateOne(env, r, now));
  return results;
}
