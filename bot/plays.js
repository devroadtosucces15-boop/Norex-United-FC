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
// Video (Cloudflare Stream) and live co-editing (a ClubRoom-style Durable Object) are still open – see
// PLANNING/REDESIGN.md BE0/BE1. The document lives in the MEDIA bucket (BE0) under a `play/` prefix.
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';

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

const inPitch = (p) => Number.isFinite(p?.x) && Number.isFinite(p?.y) && p.x >= 0 && p.x <= PITCH.x && p.y >= 0 && p.y <= PITCH.y;
// Validates and trims a client-submitted document to safe shapes/limits – never trusts it as-is.
function cleanDoc(doc) {
  if (!doc || typeof doc !== 'object') return null;
  const pieces = (Array.isArray(doc.pieces) ? doc.pieces : []).slice(0, 40)
    .filter((p) => ['us', 'opp', 'ball'].includes(p?.team) && inPitch(p))
    .map((p) => ({ id: clean(p.id, 24) || crypto.randomUUID().slice(0, 8), team: p.team, x: p.x, y: p.y, label: p.label ? clean(p.label, 20) : undefined }));
  const pieceIds = new Set(pieces.map((p) => p.id));
  const steps = (Array.isArray(doc.steps) ? doc.steps : []).slice(0, 60)
    .filter((s) => Number.isFinite(s?.at) && s.at >= 0 && s.at <= 60_000 && s.pieces && typeof s.pieces === 'object')
    .map((s) => ({ at: s.at, pieces: Object.fromEntries(Object.entries(s.pieces).filter(([id, pos]) => pieceIds.has(id) && inPitch(pos)).map(([id, pos]) => [id, { x: pos.x, y: pos.y }])) }));
  const drawings = (Array.isArray(doc.drawings) ? doc.drawings : []).slice(0, 40)
    .filter((d) => Array.isArray(d?.points) && d.points.length >= 2)
    .map((d) => ({ points: d.points.slice(0, 60).filter((pt) => Array.isArray(pt) && inPitch({ x: pt[0], y: pt[1] })).map((pt) => [pt[0], pt[1]]), color: /^#[0-9a-f]{6}$/i.test(d.color ?? '') ? d.color : '#c8352c' }));
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

const playOut = (r) => ({ id: r.id, title: r.title, category: r.category, published: !!r.published, version: r.version, updatedAt: r.updated_at, createdAt: r.created_at });
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
  return getOne(env, me, id);
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

async function markLearned(env, me, id, body) {
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

export async function playsRoute(p, method, body, me, env, log) {
  if (!p.startsWith('/api/plays')) return null;
  if (!flagOn(env, me, 'tactics')) return fail('Not available yet.', 404);
  if (!can(me, 'plays.view')) return fail('Members only.', 403);

  if (p === '/api/plays') {
    if (method === 'GET') return list(env, me);
    if (method === 'POST') { if (!can(me, 'plays.manage')) return fail('Managers only.', 403); return create(env, me, body); }
    return fail('Not found', 404);
  }
  const m = /^\/api\/plays\/(\d+)(?:\/(publish|assign|delete|restore|learned|quiz))?$/.exec(p);
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
  return fail('Not found', 404);
}
