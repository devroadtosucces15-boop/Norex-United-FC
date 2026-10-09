// Tactics Studio + Playbook (redesign BE1, board 06) – set-pieces, formations and drills as a document
// (pieces on the pitch, keyframe steps, chalk drawings, a quiz), versioned in R2, assigned to members to
// learn. Flag `tactics`.
//   GET  /api/plays              members: published plays (title, category, my learned/quiz state);
//                                managers also see drafts and who's assigned
//   GET  /api/plays/:id          members: the current document + my state (published only, or assigned);
//                                managers: any play, + its version history
//   POST /api/plays              managers: { title, category } → create (empty starter document)
//   POST /api/plays/:id          managers: { doc, title?, category? } → save a new version
//   POST /api/plays/:id/publish  managers: { published, userIds? } → set published + assign (notifies new assignees)
//   POST /api/plays/:id/assign   managers: { userIds } → add assignees to an already-published play (notifies new ones)
//   POST /api/plays/:id/delete   managers: archive (keeps history – nothing is hard-deleted)
//   POST /api/plays/:id/restore  managers: { version } → make an older version the current one (as a new version)
//   POST /api/plays/:id/learned  members: { learned } → tick a play as learned myself
//   POST /api/plays/:id/quiz     members: { answers } → scored against the document's quiz (never trusts the client's score)
//   GET  /api/plays/discord      managers: channels + roles to post to (shared with P5.3/BE3's own pickers)
//   POST /api/plays/:id/discord  managers: { channel, role? } → share a published play as a card with
//                                "✅ Learned it" (writes the same learned state as the site) and
//                                "▶ Open in Studio" buttons (bot/worker.js → playButton in botcmds.js)
//   GET  /api/plays/:id/ws       managers: live co-editing socket on room studio:<id> (bot/clubroom.js)
//   POST /api/plays/:id/op       managers: { op } → one live change (piece move, chalk stroke, keyframe) relayed
//                                to the room. Not stored – the next save (a new version) is still the only source of truth.
// Video is in playmedia.js. The document lives in the MEDIA bucket (BE0) under a `play/` prefix.
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';
import { discordTargets, postEmbed } from './docs.js';
import { broadcastRoom } from './clubroom.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;

const CATEGORIES = ['set-piece', 'formation', 'drill'];
const KEEP_VERSIONS = 20;
const MAX_DOC_BYTES = 250_000;
const PITCH = { x: 1000, y: 640 };
const STARTER_DOC = { pieces: [], steps: [], drawings: [], quiz: [] };
const TEAMS = ['us', 'opp', 'ball', 'cone', 'joker'];
// Drawing kinds the Studio can chalk: freehand + straight/dashed lines, arrows (single, double, curved, run = dashed),
// circle/zone/dot shapes and text labels. `pts` = how many points each kind needs (free: 2–60).
const SHAPES = { free: [2, 60], line: [2, 2], dash: [2, 2], arrow: [2, 2], darrow: [2, 2], run: [2, 2], curve: [2, 2], circle: [2, 2], rect: [2, 2], dot: [1, 1], text: [1, 1] };
const WIDTHS = [3, 6, 10];
const MAX_DRAWINGS = 150;

const inPitch = (p) => Number.isFinite(p?.x) && Number.isFinite(p?.y) && p.x >= 0 && p.x <= PITCH.x && p.y >= 0 && p.y <= PITCH.y;
const okColor = (c) => (/^#[0-9a-f]{6}$/i.test(c ?? '') ? c : '#c8352c');
// One chalk item → a safe shape, or null. Old documents (no `kind`) are freehand strokes.
function cleanDrawing(d) {
  const kind = SHAPES[d?.kind] ? d.kind : 'free';
  const [lo, hi] = SHAPES[kind];
  const points = (Array.isArray(d?.points) ? d.points : []).slice(0, hi).filter((pt) => Array.isArray(pt) && inPitch({ x: pt[0], y: pt[1] })).map((pt) => [pt[0], pt[1]]);
  if (points.length < lo) return null;
  const text = kind === 'text' ? clean(d.text, 40) : '';
  if (kind === 'text' && !text) return null;
  return { id: clean(d.id, 24) || crypto.randomUUID().slice(0, 8), ...(kind === 'free' ? {} : { kind }), points, color: okColor(d.color), ...(WIDTHS.includes(d.w) && d.w !== 6 ? { w: d.w } : {}), ...(d.fill && (kind === 'circle' || kind === 'rect') ? { fill: true } : {}), ...(kind === 'curve' && d.bend === -1 ? { bend: -1 } : {}), ...(text ? { text } : {}) };
}
// Validates and trims a client-submitted document to safe shapes/limits – never trusts it as-is.
function cleanDoc(doc) {
  if (!doc || typeof doc !== 'object') return null;
  const pieces = (Array.isArray(doc.pieces) ? doc.pieces : []).slice(0, 60)
    .filter((p) => TEAMS.includes(p?.team) && inPitch(p))
    .map((p) => ({ id: clean(p.id, 24) || crypto.randomUUID().slice(0, 8), team: p.team, x: p.x, y: p.y, label: p.label ? clean(p.label, 20) : undefined }));
  const pieceIds = new Set(pieces.map((p) => p.id));
  const steps = (Array.isArray(doc.steps) ? doc.steps : []).slice(0, 60)
    .filter((s) => Number.isFinite(s?.at) && s.at >= 0 && s.at <= 60_000 && s.pieces && typeof s.pieces === 'object')
    .map((s) => ({ at: s.at, pieces: Object.fromEntries(Object.entries(s.pieces).filter(([id, pos]) => pieceIds.has(id) && inPitch(pos)).map(([id, pos]) => [id, { x: pos.x, y: pos.y }])) }));
  const drawings = (Array.isArray(doc.drawings) ? doc.drawings : []).slice(0, MAX_DRAWINGS).map(cleanDrawing).filter(Boolean);
  const quiz = (Array.isArray(doc.quiz) ? doc.quiz : []).slice(0, 20)
    .filter((q) => clean(q?.q, 200) && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 6 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)
    .map((q) => ({ q: clean(q.q, 200), options: q.options.slice(0, 6).map((o) => clean(o, 80)), answer: q.answer }));
  const out = { pieces, steps, drawings, quiz };
  return new TextEncoder().encode(JSON.stringify(out)).length <= MAX_DOC_BYTES ? out : null;
}

async function getDoc(env, key) {
  if (!env.MEDIA || !key) return STARTER_DOC;
  const obj = await env.MEDIA.get(key);
  if (!obj?.body) return STARTER_DOC;
  try { return JSON.parse(Buffer.concat(await Array.fromAsync(obj.body)).toString('utf8')); } catch { return STARTER_DOC; }
}
async function putDoc(env, key, doc) {
  await env.MEDIA.put(key, JSON.stringify(doc), { httpMetadata: { contentType: 'application/json' } });
}
// Keeps only the newest KEEP_VERSIONS – drops older R2 objects + rows so the playbook can't grow unbounded.
async function trimVersions(env, playId) {
  const old = await all(env, 'SELECT version, key FROM play_versions WHERE play_id = ? ORDER BY version DESC LIMIT -1 OFFSET ?', playId, KEEP_VERSIONS);
  if (!old.length) return;
  if (env.MEDIA) await env.MEDIA.delete(old.map((r) => r.key));
  await run(env, `DELETE FROM play_versions WHERE play_id = ? AND version IN (${marks(old.length)})`, playId, ...old.map((r) => r.version));
}

const playOut = (r) => ({ id: r.id, title: r.title, category: r.category, published: !!r.published, version: r.version, updatedAt: r.updated_at, createdAt: r.created_at, discord: r.discord_msg ? { channel: r.discord_channel } : undefined });
async function myState(env, playId, uid) {
  const [a, q] = await Promise.all([
    one(env, 'SELECT learned, learned_at FROM play_assign WHERE play_id = ? AND user_id = ?', playId, uid),
    one(env, 'SELECT score, total, at FROM play_quiz_attempts WHERE play_id = ? AND user_id = ?', playId, uid),
  ]);
  return { assigned: !!a, learned: !!a?.learned, learnedAt: opt(a?.learned_at), quiz: q ? { score: q.score, total: q.total, at: q.at } : null };
}

async function list(env, me) {
  const manager = can(me, 'plays.manage');
  const rows = await all(env, `SELECT * FROM plays WHERE archived = 0 ${manager ? '' : 'AND published = 1'} ORDER BY updated_at DESC LIMIT 200`);
  const assignCounts = manager && rows.length
    ? Object.fromEntries((await all(env, `SELECT play_id, COUNT(*) AS n, SUM(learned) AS learned FROM play_assign WHERE play_id IN (${marks(rows.length)}) GROUP BY play_id`, ...rows.map((r) => r.id)))
        .map((r) => [r.play_id, { assigned: r.n, learned: r.learned || 0 }]))
    : {};
  return json({ plays: await Promise.all(rows.map(async (r) => ({ ...playOut(r), mine: await myState(env, r.id, me.u), assignCounts: manager ? (assignCounts[r.id] ?? { assigned: 0, learned: 0 }) : undefined }))) });
}

async function getOne(env, me, id) {
  const r = await one(env, 'SELECT * FROM plays WHERE id = ? AND archived = 0', id);
  if (!r) return fail('Play not found.', 404);
  const manager = can(me, 'plays.manage');
  if (!r.published && !manager) return fail('Play not found.', 404);
  const [doc, versions, mine] = await Promise.all([
    getDoc(env, r.doc_key),
    manager ? all(env, 'SELECT version, created_by, created_at FROM play_versions WHERE play_id = ? ORDER BY version DESC', id) : [],
    myState(env, id, me.u),
  ]);
  const out = { ...playOut(r), doc: { ...doc, quiz: manager ? doc.quiz : doc.quiz.map((q) => ({ q: q.q, options: q.options })) }, mine };
  if (manager) { out.versions = versions.map((v) => ({ version: v.version, by: v.created_by, at: v.created_at })); out.assigned = (await all(env, 'SELECT user_id, learned, learned_at FROM play_assign WHERE play_id = ?', id)); }
  return json(out);
}

async function create(env, me, body) {
  const title = clean(body.title, 80);
  const category = CATEGORIES.includes(body.category) ? body.category : 'set-piece';
  if (!title) return fail('Give the play a title.');
  const now = Date.now();
  const ins = await run(env, 'INSERT INTO plays (title, category, created_by, created_at, updated_at, updated_by, version) VALUES (?, ?, ?, ?, ?, ?, 1)', title, category, me.u, now, now, me.u);
  const id = ins.meta.last_row_id;
  const key = `play/${id}/v1.json`;
  await putDoc(env, key, STARTER_DOC);
  await run(env, 'UPDATE plays SET doc_key = ? WHERE id = ?', key, id);
  await run(env, 'INSERT INTO play_versions (play_id, version, key, created_by, created_at) VALUES (?, 1, ?, ?, ?)', id, key, me.u, now);
  return getOne(env, me, id);
}

async function save(env, me, id, body) {
  const r = await one(env, 'SELECT * FROM plays WHERE id = ? AND archived = 0', id);
  if (!r) return fail('Play not found.', 404);
  const doc = cleanDoc(body.doc);
  if (!doc) return fail('That document is too large or not shaped right.');
  const title = body.title !== undefined ? clean(body.title, 80) : r.title;
  const category = body.category !== undefined ? (CATEGORIES.includes(body.category) ? body.category : r.category) : r.category;
  if (!title) return fail('Give the play a title.');
  const version = r.version + 1;
  const key = `play/${id}/v${version}.json`;
  await putDoc(env, key, doc);
  const now = Date.now();
  await run(env, 'UPDATE plays SET title = ?, category = ?, version = ?, doc_key = ?, updated_at = ?, updated_by = ? WHERE id = ?', title, category, version, key, now, me.u, id);
  await run(env, 'INSERT INTO play_versions (play_id, version, key, created_by, created_at) VALUES (?, ?, ?, ?, ?)', id, version, key, me.u, now);
  await trimVersions(env, id);
  // Tell anyone editing this play live that a new version exists (the server says it, so a client can't fake it).
  await broadcastRoom(env, `studio:${id}`, { t: 'studio', id, op: { k: 'saved', version }, by: me.u, n: me.n || 'Manager', at: now });
  return getOne(env, me, id);
}

// ---------- BE1 live co-editing ----------
// Managers only. Each change is relayed through the ClubRoom DO 'studio:<id>', which is broadcast-only: sockets can't
// send, so every op goes through this POST route. The route stamps `by`/`n` from the session (never from the body, so a
// client can't send as another member) and `at` from the server, which the clients use for last-write-wins per piece,
// stroke or keyframe. Nothing is written to D1/R2 here.
const OP_MAX_BYTES = 4_000;
const okTeam = (t) => TEAMS.includes(t);
// Only these shapes are relayed; anything else (or any out-of-pitch coordinate) is refused, never passed through.
function cleanOp(op) {
  if (!op || typeof op !== 'object') return null;
  if (op.k === 'piece') {
    const id = clean(op.id, 24);
    if (!id || !okTeam(op.team) || !inPitch(op)) return null;
    return { k: 'piece', id, team: op.team, x: op.x, y: op.y, label: op.label ? clean(op.label, 20) : undefined };
  }
  if (op.k === 'pieceDel') { const id = clean(op.id, 24); return id ? { k: 'pieceDel', id } : null; }
  if (op.k === 'stroke') {
    const d = cleanDrawing({ ...op.d, id: op.sid, points: op.d?.points ?? op.points, color: op.d?.color ?? op.color });
    return clean(op.sid, 24) && d ? { k: 'stroke', sid: clean(op.sid, 24), d } : null;
  }
  if (op.k === 'strokeDel') { const sid = clean(op.sid, 24); return sid ? { k: 'strokeDel', sid } : null; }
  if (op.k === 'chalkClear') return { k: 'chalkClear' };
  if (op.k === 'key') {
    if (!Number.isFinite(op.at) || op.at < 0 || op.at > 60_000 || !op.pieces || typeof op.pieces !== 'object') return null;
    const pieces = {};
    for (const [rawId, pos] of Object.entries(op.pieces).slice(0, 60)) {
      const id = clean(rawId, 24);
      if (id && inPitch(pos)) pieces[id] = { x: pos.x, y: pos.y };
    }
    return { k: 'key', at: Math.round(op.at), pieces };
  }
  if (op.k === 'keyDel') return Number.isFinite(op.at) ? { k: 'keyDel', at: Math.round(op.at) } : null;
  return null;
}

async function studioOp(env, me, id, body) {
  const r = await one(env, 'SELECT id FROM plays WHERE id = ? AND archived = 0', id);
  if (!r) return fail('Play not found.', 404);
  if (!env.CLUB_ROOM) return fail('Live updates are not set up yet.', 503);
  if (JSON.stringify(body?.op ?? null).length > OP_MAX_BYTES) return fail('That change is too large.', 413);
  const op = cleanOp(body?.op);
  if (!op) return fail('Unknown change.');
  const sent = await broadcastRoom(env, `studio:${id}`, { t: 'studio', id, op, by: me.u, n: (me.n || 'Manager').slice(0, 40), at: Date.now() });
  return json({ ok: sent });
}

// Live socket for the studio: same ?t= shape as the Dugout socket. Managers only, since only managers can save.
export async function studioSocket(request, env, me, id) {
  if (request.headers.get('Upgrade') !== 'websocket') return fail('Expected a WebSocket.', 426);
  if (!me || !flagOn(env, me, 'tactics')) return fail('Not available yet.', 404);
  if (!can(me, 'plays.manage')) return fail('Managers only.', 403);
  if (!env.CLUB_ROOM) return fail('Live updates are not set up yet.', 503);
  if (!/^\d{1,9}$/.test(String(id)) || Number(id) < 1) return fail('Not found', 404);
  if (!(await one(env, 'SELECT id FROM plays WHERE id = ? AND archived = 0', Number(id)))) return fail('Play not found.', 404);
  const q = new URLSearchParams({ u: me.u, n: (me.n || 'Manager').slice(0, 40) });
  const room = env.CLUB_ROOM.get(env.CLUB_ROOM.idFromName(`studio:${id}`));
  return room.fetch(new Request(`https://room/ws?${q}`, { headers: request.headers }));
}

async function restore(env, me, id, body) {
  const version = Number(body.version);
  const v = await one(env, 'SELECT key FROM play_versions WHERE play_id = ? AND version = ?', id, version);
  if (!v) return fail('That version is gone.', 404);
  const doc = await getDoc(env, v.key);
  return save(env, me, id, { doc });
}

async function assignTo(env, me, id, userIds) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : []).map(String))].slice(0, 100);
  if (!ids.length) return [];
  const existing = new Set((await all(env, `SELECT user_id FROM play_assign WHERE play_id = ? AND user_id IN (${marks(ids.length)})`, id, ...ids)).map((r) => r.user_id));
  const fresh = ids.filter((u) => !existing.has(u));
  const now = Date.now();
  for (const uid of fresh) await run(env, 'INSERT INTO play_assign (play_id, user_id, assigned_by, assigned_at) VALUES (?, ?, ?, ?)', id, uid, me.u, now);
  if (fresh.length) {
    const title = (await one(env, 'SELECT title FROM plays WHERE id = ?', id))?.title ?? 'a play';
    await safely(notify(env, fresh, { type: 'play', icon: '📋', title: `New play to learn: ${title}`, link: `tactics.html#play${id}` }));
  }
  return fresh;
}

async function publish(env, me, id, body) {
  const r = await one(env, 'SELECT id FROM plays WHERE id = ? AND archived = 0', id);
  if (!r) return fail('Play not found.', 404);
  await run(env, 'UPDATE plays SET published = ? WHERE id = ?', body.published ? 1 : 0, id);
  if (body.published) await assignTo(env, me, id, body.userIds);
  return getOne(env, me, id);
}

export async function markLearned(env, me, id, body) {
  const r = await one(env, 'SELECT published FROM plays WHERE id = ? AND archived = 0', id);
  if (!r || !r.published) return fail('Play not found.', 404);
  const now = Date.now();
  const learned = body.learned ? 1 : 0;
  await run(env, `INSERT INTO play_assign (play_id, user_id, assigned_by, assigned_at, learned, learned_at) VALUES (?, ?, NULL, ?, ?, ?)
    ON CONFLICT (play_id, user_id) DO UPDATE SET learned = excluded.learned, learned_at = excluded.learned_at`, id, me.u, now, learned, learned ? now : null);
  return json({ ok: true, learned: !!learned });
}

async function quiz(env, me, id, body) {
  const r = await one(env, 'SELECT published, doc_key FROM plays WHERE id = ? AND archived = 0', id);
  if (!r || !r.published) return fail('Play not found.', 404);
  const doc = await getDoc(env, r.doc_key);
  if (!doc.quiz.length) return fail('This play has no quiz.');
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const score = doc.quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const total = doc.quiz.length;
  const now = Date.now();
  await run(env, `INSERT INTO play_quiz_attempts (play_id, user_id, score, total, at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (play_id, user_id) DO UPDATE SET score = excluded.score, total = excluded.total, at = excluded.at`, id, me.u, score, total, now);
  if (score === total) {
    await run(env, `INSERT INTO play_assign (play_id, user_id, assigned_by, assigned_at, learned, learned_at) VALUES (?, ?, NULL, ?, 1, ?)
      ON CONFLICT (play_id, user_id) DO UPDATE SET learned = 1, learned_at = excluded.learned_at`, id, me.u, now, now);
  }
  return json({ score, total });
}

async function archive(env, id) {
  const r = await one(env, 'SELECT id FROM plays WHERE id = ?', id);
  if (!r) return fail('Play not found.', 404);
  await run(env, 'UPDATE plays SET archived = 1 WHERE id = ?', id);
  return json({ ok: true });
}

const CAT_ICON = { 'set-piece': '⚽', formation: '🧩', drill: '🏃' };
// The share card – a summary (no quiz answers), a "✅ Learned it" button (writes the same state as the
// site, via botcmds.js's playButton) and a link straight into the studio. Shared by the real post and the
// front end's dry-run preview, so what a manager previews is what gets sent (same pattern as docs.js).
function playEmbed(env, r, doc) {
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/');
  const bits = [`${doc.pieces.length} piece${doc.pieces.length === 1 ? '' : 's'}`, doc.steps.length ? `${doc.steps.length} keyframe${doc.steps.length === 1 ? '' : 's'}` : null, doc.quiz.length ? `${doc.quiz.length}-question quiz` : null].filter(Boolean);
  return {
    embeds: [{
      title: `${CAT_ICON[r.category] ?? '📋'} ${r.title}`.slice(0, 250),
      description: bits.join(' · ') || 'A new play in the Tactics Studio.',
      url: `${site}tactics.html#play${r.id}`, color: 0xc8352c, timestamp: new Date(r.updated_at).toISOString(),
      footer: { text: 'NOREX UNITED · Tactics Studio' },
    }],
    components: [{ type: 1, components: [
      { type: 2, style: 3, label: '✅ Learned it', emoji: { name: '✅' }, custom_id: `norex:play:${r.id}:learned` },
      { type: 2, style: 5, label: '▶ Open in Studio', url: `${site}tactics.html#play${r.id}` },
    ] }],
  };
}
// Posts a published play as a rich embed with answer buttons. Never throws – returns { ok } or { ok: false, error }.
async function postPlay(env, me, id, target, log) {
  const r = await one(env, 'SELECT * FROM plays WHERE id = ? AND archived = 0', id);
  if (!r) return { ok: false, error: 'Play not found.' };
  if (!r.published) return { ok: false, error: 'Publish the play before sharing it.' };
  const channel = String(target.channel ?? ''), role = String(target.role ?? '');
  const doc = await getDoc(env, r.doc_key);
  const res = await postEmbed(env, channel, role, playEmbed(env, r, doc));
  if (!res.ok) return res;
  await run(env, 'UPDATE plays SET discord_channel = ?, discord_msg = ? WHERE id = ?', channel, res.id ?? null, id);
  await log(env, me, 'play-discord', `${r.title}${role ? ` · ping ${role === env.DISCORD_GUILD_ID ? '@everyone' : 'role'}` : ''}`);
  return { ok: true };
}

export async function playsRoute(p, method, body, me, env, log) {
  if (!p.startsWith('/api/plays')) return null;
  if (!flagOn(env, me, 'tactics')) return fail('Not available yet.', 404);
  if (!can(me, 'plays.view')) return fail('Members only.', 403);

  if (p === '/api/plays') {
    if (method === 'GET') return list(env, me);
    if (method === 'POST') { if (!can(me, 'plays.manage')) return fail('Managers only.', 403); return create(env, me, body); }
    return fail('Not found', 404);
  }
  if (p === '/api/plays/discord') {
    if (!can(me, 'announce.discord')) return fail('Managers only.', 403);
    return json(await discordTargets(env));
  }
  const m = /^\/api\/plays\/(\d+)(?:\/(publish|assign|delete|restore|learned|quiz|discord|op))?$/.exec(p);
  if (!m) return fail('Not found', 404);
  const id = Number(m[1]);
  const action = m[2];
  if (!action) {
    if (method === 'GET') return getOne(env, me, id);
    if (method === 'POST') { if (!can(me, 'plays.manage')) return fail('Managers only.', 403); const r = await save(env, me, id, body); await log(env, me, 'play-save', `#${id}`); return r; }
    return fail('Not found', 404);
  }
  if (method !== 'POST') return fail('Not found', 404);
  if (action === 'learned') return markLearned(env, me, id, body);
  if (action === 'quiz') return quiz(env, me, id, body);
  if (!can(me, 'plays.manage')) return fail('Managers only.', 403);
  if (action === 'publish') { const r = await publish(env, me, id, body); await log(env, me, 'play-publish', `#${id} · ${body.published ? 'published' : 'unpublished'}`); return r; }
  if (action === 'assign') { await assignTo(env, me, id, body.userIds); await log(env, me, 'play-assign', `#${id} · ${(body.userIds ?? []).length} member(s)`); return getOne(env, me, id); }
  if (action === 'delete') { const r = await archive(env, id); await log(env, me, 'play-delete', `#${id}`); return r; }
  if (action === 'restore') { const r = await restore(env, me, id, body); await log(env, me, 'play-restore', `#${id} → v${body.version}`); return r; }
  if (action === 'op') return studioOp(env, me, id, body); // not logged: a drag would flood the audit log
  if (action === 'discord') {
    if (!can(me, 'announce.discord')) return fail('Managers only.', 403);
    const r = await postPlay(env, me, id, body, log);
    if (!r.ok) return json(r);
    return getOne(env, me, id);
  }
  return fail('Not found', 404);
}
