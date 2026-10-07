// Tactics Studio recordings (redesign BE1, board 06): a recorded video of a play (tab capture in the studio)
// and voice-over narration. Flag `tactics`, same gate as plays.js.
//   POST /api/plays/:id/media?kind=video|voice   managers: raw body, Content-Type = MIME → { media }   (raw body, read before members.js parses JSON)
//   GET  /api/plays/:id/media                    members who can see the play: list (ready only)
//   GET  /api/plays/:id/media/:mid               members who can see the play: the file (Bearer auth; the page fetches it as a blob)
//   POST /api/plays/:id/media/:mid/delete        managers: hide one recording (row kept, nothing hard-deleted)
//   POST /api/plays/:id/media/:mid/discord       managers: { channel, role? } → post the recording as a Discord attachment (over 25 MB: a card linking to the Studio instead)
// Files are stored in the MEDIA bucket under `play/<id>/m/` – never in the feed's storage guard, so they can't be evicted.
import { can, flagOn } from './roles.js';
import { postEmbed } from './docs.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();

export const MEDIA_MAX = { video: 60e6, voice: 10e6 }; // bytes – a 60-second 720p tab capture is well under the video cap
export const MEDIA_PER_PLAY = 6;
export const DISCORD_ATTACH_MAX = 25e6; // bigger files can't be attached – the post links to the Studio instead
const TYPES = {
  'video/webm': ['video', 'webm'], 'video/mp4': ['video', 'mp4'],
  'audio/webm': ['voice', 'webm'], 'audio/mp4': ['voice', 'm4a'],
};
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const mb = (b) => `${Math.round(b / 1e6)} MB`;

// Same visibility rule as getOne() in plays.js: published (or assigned) and not archived; managers see every play.
async function canSee(env, me, id) {
  const r = await one(env, 'SELECT published, archived FROM plays WHERE id = ?', id);
  if (!r || r.archived) return null;
  if (can(me, 'plays.manage')) return r;
  if (!r.published) return null;
  return r;
}
const view = (r) => ({ id: r.id, kind: r.kind, type: r.type, size: r.size, at: r.created_at });

export async function playMediaUpload(request, me, env, url, id, log) {
  if (!flagOn(env, me, 'tactics')) return fail('Not available yet.', 404);
  if (!can(me, 'plays.manage')) return fail('Managers only.', 403);
  if (!env.MEDIA) return fail('Recordings need the R2 bucket, which isn’t switched on yet.', 503);
  if (!(await one(env, 'SELECT id FROM plays WHERE id = ? AND archived = 0', id))) return fail('Play not found.', 404);
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const t = TYPES[type];
  const kind = url.searchParams.get('kind');
  if (!t || t[0] !== kind) return fail('Video (WebM, MP4) or voice-over (WebM, M4A) only, matching the kind.', 415);
  const len = Number(request.headers.get('Content-Length')) || 0;
  if (!len || !request.body) return fail('That recording is empty.', 411);
  if (len > MEDIA_MAX[kind]) return fail(`${kind === 'video' ? 'Videos' : 'Voice-overs'} can be up to ${mb(MEDIA_MAX[kind])} – this one is ${mb(len)}.`, 413);
  const count = await one(env, 'SELECT COUNT(*) AS n FROM play_media WHERE play_id = ? AND deleted = 0', id);
  if (count.n >= MEDIA_PER_PLAY) return fail(`A play holds ${MEDIA_PER_PLAY} recordings – hide an old one first.`, 409);

  const mid = hex(16);
  const key = `play/${id}/m/${mid}.${t[1]}`;
  const now = Date.now();
  await run(env, 'INSERT INTO play_media (id, play_id, kind, key, type, size, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    mid, id, kind, key, type, len, 'pending', me.u, now);
  try {
    await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type, cacheControl: 'private, max-age=3600' }, customMetadata: { play: String(id) } });
  } catch {
    await run(env, "UPDATE play_media SET status = 'failed' WHERE id = ?", mid);
    return fail('The upload didn’t finish – try again.', 400);
  }
  await run(env, "UPDATE play_media SET status = 'ready' WHERE id = ?", mid);
  await log(env, me, 'play-media', `#${id} · ${kind} ${mb(len)}`);
  return json({ media: view({ id: mid, kind, type, size: len, created_at: now }) });
}

export async function playMediaRoute(p, method, me, env, body, log) {
  const m = /^\/api\/plays\/(\d+)\/media(?:\/([0-9a-f]{32})(\/delete|\/discord)?)?$/.exec(p);
  if (!m) return null;
  if (!flagOn(env, me, 'tactics')) return fail('Not available yet.', 404);
  if (!can(me, 'plays.view')) return fail('Members only.', 403);
  const id = Number(m[1]);
  const mid = m[2];
  const del = m[3];
  if (!(await canSee(env, me, id))) return fail('Play not found.', 404);

  if (!mid) {
    if (method !== 'GET') return fail('Not found', 404);
    const rows = await all(env, "SELECT * FROM play_media WHERE play_id = ? AND deleted = 0 AND status = 'ready' ORDER BY created_at", id);
    return json({ media: rows.map(view) });
  }
  if (del === '/discord') {
    if (method !== 'POST') return fail('Not found', 404);
    if (!can(me, 'announce.discord')) return fail('Managers only.', 403);
    return shareMedia(env, me, id, mid, body ?? {}, log);
  }
  if (del) {
    if (method !== 'POST') return fail('Not found', 404);
    if (!can(me, 'plays.manage')) return fail('Managers only.', 403);
    await run(env, 'UPDATE play_media SET deleted = 1 WHERE id = ? AND play_id = ?', mid, id);
    return json({ ok: true });
  }
  if (method !== 'GET') return fail('Not found', 404);
  const row = await one(env, "SELECT * FROM play_media WHERE id = ? AND play_id = ? AND deleted = 0 AND status = 'ready'", mid, id);
  if (!row) return fail('Recording not found.', 404);
  const obj = await env.MEDIA.get(row.key);
  if (!obj) return fail('Recording not found.', 404);
  return new Response(obj.body, { headers: { 'Content-Type': row.type, 'Content-Length': String(row.size), 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}

// Posts one recording to a Discord channel (optionally pinging a role). Small files go up as a real attachment so the
// squad can watch in Discord; big ones get a card linking to the Studio. Never throws.
async function shareMedia(env, me, id, mid, body, log) {
  const row = await one(env, "SELECT m.*, p.title, p.published FROM play_media m JOIN plays p ON p.id = m.play_id WHERE m.id = ? AND m.play_id = ? AND m.deleted = 0 AND m.status = 'ready'", mid, id);
  if (!row) return fail('Recording not found.', 404);
  if (!row.published) return fail('Publish the play before sharing its recording.', 400);
  const channel = String(body.channel ?? ''), role = String(body.role ?? '');
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/');
  const link = `${site}tactics.html#play${id}`;
  const label = row.kind === 'video' ? '🎬 Video' : '🎙 Voice-over';
  const embed = { title: `${label} · ${row.title}`.slice(0, 250), url: link, color: 0xc8352c, footer: { text: 'NOREX UNITED · Tactics Studio' } };
  const open = { type: 1, components: [{ type: 2, style: 5, label: '▶ Open in Studio', url: link }] };
  if (row.size > DISCORD_ATTACH_MAX) {
    const res = await postEmbed(env, channel, role, { embeds: [{ ...embed, description: `Too big to attach (${mb(row.size)}) – watch it in the Studio.` }], components: [open] });
    if (!res.ok) return fail(res.error);
    await log(env, me, 'play-media-discord', `#${id} · ${row.kind} link`);
    return json({ ok: true, attached: false });
  }
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return fail('Connect the Discord bot first.');
  if (!/^\d{5,25}$/.test(channel)) return fail('Pick a channel.');
  if (role && !/^\d{1,25}$/.test(role)) return fail('Pick a role to ping, or none.');
  const obj = await env.MEDIA.get(row.key);
  if (!obj) return fail('Recording not found.', 404);
  const everyone = role && role === env.DISCORD_GUILD_ID;
  const ext = row.key.split('.').pop();
  const fd = new FormData();
  fd.set('payload_json', JSON.stringify({
    content: role ? (everyone ? '@everyone' : `<@&${role}>`) : undefined,
    embeds: [embed], components: [open],
    allowed_mentions: role ? (everyone ? { parse: ['everyone'] } : { roles: [role] }) : { parse: [] },
    attachments: [{ id: 0, filename: `${row.title.replace(/[^\w-]+/g, '-').slice(0, 40) || 'play'}.${ext}` }],
  }));
  fd.set('files[0]', new Blob([await new Response(obj.body).arrayBuffer()], { type: row.type }), `${row.title.replace(/[^\w-]+/g, '-').slice(0, 40) || 'play'}.${ext}`);
  let r;
  try { r = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, { method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` }, body: fd }); } catch (e) { return fail(e.message); }
  if (!r.ok) {
    const res = await r.json().catch(() => ({}));
    return fail(r.status === 413 || res.code === 40005 ? 'Discord says the file is too big for this server – share the link card instead.' : `Discord refused the post (${r.status}${res.message ? `: ${res.message}` : ''}).`);
  }
  await log(env, me, 'play-media-discord', `#${id} · ${row.kind} ${mb(row.size)}`);
  return json({ ok: true, attached: true });
}
