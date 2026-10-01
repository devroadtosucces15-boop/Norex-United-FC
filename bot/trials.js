// Recruitment (roadmap P1.4, P1.5, P5.5) and private manager notes (P5.7).
//   GET  /api/contacts        public – manager cards for the Trials page, built from users with the manager role
//   POST /api/trials/apply    public – mini application form → trial card (rate-limited per IP)
//   GET/POST /api/scout       members – recommend a player → routed to managers as a "recommended" card
//   /api/trials, /api/trials/* managers – trial cards: applied → trialling → signed / released
//   /api/notes, /api/notes/*  managers – timestamped notes per member, player or trial
// Flags: trials (contacts, form, portal), scouting, managerNotes. Permissions: bot/roles.js.
import { can, flagOn } from './roles.js';
import { notify, notifyManagers, safely } from './notify.js';

const DAY = 86400e3;
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
const PLATFORMS = ['PS5', 'Xbox', 'PC'];
// BE4: the Dugout squad board wants an explicit funnel (applied → booked → played → signed | rejected) –
// added `booked`/`played` as finer steps inside the existing `trialling` stage rather than renaming anything
// (old cards sitting in `trialling` still read fine; `trial_events` already logs every status change, so no
// separate `trial_stage_history` table is needed – it would just duplicate that log).
export const TRIAL_STATUSES = ['recommended', 'applied', 'booked', 'trialling', 'played', 'signed', 'released', 'declined'];
const OPEN = ['recommended', 'applied', 'booked', 'trialling', 'played'];
// Sort order for the Dugout funnel view (STAGE_ORDER.indexOf unknown = -1, sorts first – fine, those are rare).
export const STAGE_ORDER = TRIAL_STATUSES;
const NOTE_KINDS = ['member', 'player', 'trial'];
const NOTE_TAGS = ['strength', 'issue', 'trial', 'general'];
const FORM_PER_IP = 3; // public applications per IP per day
const FORM_PER_DAY = 40; // public applications per day in total
const SCOUT_DAILY = 5; // recommendations per member per day
const NOTE_DAILY = 200; // notes per manager per day

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;
const https = (u) => { try { const x = new URL(String(u)); return x.protocol === 'https:' ? x.href.slice(0, 300) : null; } catch { return null; } };

// ---------- P1.4 manager contacts ----------
// Everyone who logged in with the manager role (or as owner) in the last 120 days. Owner (Founder) first.
export async function getContacts(env) {
  const rows = await all(env, `SELECT u.id, u.name, u.avatar, u.tag, u.role, u.last_at, p.platform, p.positions FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id WHERE u.role IN ('manager', 'owner') AND u.last_at > ? ORDER BY u.last_at DESC`, Date.now() - 120 * DAY);
  const out = rows.map((r) => ({ id: r.id, n: r.name, a: opt(r.avatar), tag: opt(r.tag), role: r.role, platform: r.platform || undefined, positions: r.positions ? JSON.parse(r.positions) : [] }));
  return { contacts: [...out.filter((c) => c.role === 'owner'), ...out.filter((c) => c.role !== 'owner')] };
}

// ---------- shared: reading an applicant / recommendation ----------
async function readPlayer(body, loadSite, { needContact }) {
  const ea = clean(body.ea, 40);
  if (ea.length < 2) return { error: 'Enter the EA ID / gamertag.' };
  const platform = PLATFORMS.includes(body.platform) ? body.platform : '';
  if (!platform) return { error: 'Pick a platform.' };
  const positions = [...new Set((Array.isArray(body.positions) ? body.positions : []).filter((x) => POSITIONS.includes(x)))].slice(0, 3);
  if (!positions.length) return { error: 'Pick at least one position.' };
  const clipsIn = clean(body.clips, 300);
  const clips = clipsIn ? https(clipsIn) : null;
  if (clipsIn && !clips) return { error: 'The clips link must start with https://' };
  const discord = clean(body.discord, 40).replace(/^@/, '');
  if (needContact && !/^[\w.]{2,32}$/.test(discord)) return { error: 'Enter your Discord username so a manager can reach you.' };
  const note = clean(body.note, 500);
  const players = await loadSite('players').catch(() => []);
  const pl = players.find((x) => x.n.toLowerCase() === ea.toLowerCase());
  return { t: { ea, platform, positions, clips, discord: discord || null, note: note || null, player: pl?.k ?? null } };
}

async function insertTrial(env, t, source, status, by, ipHash = null) {
  const at = Date.now();
  const r = await run(env, `INSERT INTO trials (source, ea_id, discord, platform, positions, clips, note, status, player, by_id, by_name, by_avatar, ip_hash, at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, source, t.ea, t.discord, t.platform, JSON.stringify(t.positions), t.clips, t.note, status, t.player,
  by?.u ?? null, by?.n ?? null, by?.a ?? null, ipHash, at, at);
  const id = r.meta.last_row_id;
  await run(env, 'INSERT INTO trial_events (trial_id, kind, status, detail, by_name, at) VALUES (?, ?, ?, ?, ?, ?)', id, 'status', status, source, by?.n ?? t.ea, at);
  return id;
}
const openDupe = (env, ea) => one(env, `SELECT id, status FROM trials WHERE lower(ea_id) = lower(?) AND status IN (${marks(OPEN.length)})`, ea, ...OPEN);

async function ipHash(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.DISCORD_CLIENT_SECRET}:trial:${ip}`));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- P1.5 public mini-form ----------
export async function applyRoute(request, env, me, loadSite, log) {
  if (!flagOn(env, me, 'trials')) return fail('Not available yet.', 404);
  const body = await request.json().catch(() => ({}));
  if (body.website) return json({ ok: true }); // honeypot: bots fill every field
  const { t, error } = await readPlayer(body, loadSite, { needContact: true });
  if (error) return fail(error);
  const ip = await ipHash(env, request);
  const since = Date.now() - DAY;
  const [mine, total] = await Promise.all([
    one(env, 'SELECT COUNT(*) AS n FROM trials WHERE ip_hash = ? AND at > ?', ip, since),
    one(env, "SELECT COUNT(*) AS n FROM trials WHERE source = 'form' AND at > ?", since),
  ]);
  if (mine.n >= FORM_PER_IP || total.n >= FORM_PER_DAY) return fail('Too many applications today – please try again tomorrow or apply on Discord.', 429);
  if (await openDupe(env, t.ea)) return fail('We already have an open application for this EA ID. A manager will be in touch on Discord.', 409);
  await insertTrial(env, t, 'form', 'applied', null, ip);
  await log(env, { u: null, n: t.ea, a: null }, 'trial-apply', `${t.positions.join('/')} · ${t.platform}`);
  await safely(notifyManagers(env, { icon: '👑', title: `New trial application: ${t.ea} (${t.positions.join('/')} · ${t.platform})`, body: t.discord ? `Discord: ${t.discord}` : null, link: 'members.html#manager' }));
  return json({ ok: true });
}

// ---------- trial cards (managers) ----------
const trialOut = (r, events, notes) => ({
  id: r.id, source: r.source, ea: r.ea_id, discord: opt(r.discord), platform: opt(r.platform), positions: JSON.parse(r.positions || '[]'),
  clips: opt(r.clips), note: opt(r.note), status: r.status, player: opt(r.player),
  by: r.by_id ? { id: r.by_id, n: r.by_name, a: opt(r.by_avatar) } : undefined, at: r.at, updated: r.updated_at,
  events: events.map((e) => ({ kind: e.kind, status: opt(e.status), date: opt(e.date), result: opt(e.result), rating: opt(e.rating), detail: opt(e.detail), by: opt(e.by_name), at: e.at })),
  notes,
});
export async function trialsState(env, me) {
  const rows = await all(env, `SELECT * FROM trials WHERE status IN (${marks(OPEN.length)}) OR updated_at > ? ORDER BY updated_at DESC LIMIT 300`, ...OPEN, Date.now() - 180 * DAY);
  if (!rows.length) return { trials: [], canNotes: canNotes(env, me) };
  const ids = rows.map((r) => r.id);
  const [ev, ns] = await Promise.all([
    all(env, `SELECT * FROM trial_events WHERE trial_id IN (${marks(ids.length)}) ORDER BY id`, ...ids),
    canNotes(env, me) ? all(env, `SELECT * FROM notes WHERE kind = 'trial' AND subject IN (${marks(ids.length)}) ORDER BY id`, ...ids.map(String)) : [],
  ]);
  const evBy = {}, nBy = {};
  for (const e of ev) (evBy[e.trial_id] ??= []).push(e);
  for (const n of ns) (nBy[n.subject] ??= []).push(noteOut(n, me));
  return { trials: rows.map((r) => trialOut(r, evBy[r.id] ?? [], nBy[r.id] ?? [])), canNotes: canNotes(env, me) };
}

async function trialsRoute(p, method, body, me, env, loadSite, log) {
  if (!can(me, 'trials.manage')) return fail('Managers only.', 403);
  if (p === '/api/trials' && method === 'GET') return json(await trialsState(env, me));

  if (p === '/api/trials/add' && method === 'POST') {
    const { t, error } = await readPlayer(body, loadSite, { needContact: false });
    if (error) return fail(error);
    if (await openDupe(env, t.ea) && !body.force) return fail(`${t.ea} already has an open trial card.`, 409);
    const source = body.source === 'discord' ? 'discord' : 'manual';
    const status = ['applied', 'trialling'].includes(body.status) ? body.status : 'applied';
    await insertTrial(env, t, source, status, me);
    await log(env, me, 'trial-add', `${t.ea} · ${status}`);
    return json(await trialsState(env, me));
  }

  if (p === '/api/trials/update' && method === 'POST') {
    const r = await one(env, 'SELECT * FROM trials WHERE id = ?', Number(body.id) || 0);
    if (!r) return fail('Trial card not found', 404);
    const at = Date.now();
    const stmts = [];
    const add = (sql, ...args) => stmts.push(env.DB.prepare(sql).bind(...args));
    const logs = [];
    let tell = null; // P7.1 notification sent after the write
    if (body.status !== undefined) {
      if (!TRIAL_STATUSES.includes(body.status) || body.status === 'recommended') return fail('Unknown status');
      if (body.status === r.status) return fail(`Already ${r.status}.`, 409);
      add('UPDATE trials SET status = ?, updated_at = ? WHERE id = ?', body.status, at, r.id);
      add('INSERT INTO trial_events (trial_id, kind, status, detail, by_name, at) VALUES (?, ?, ?, ?, ?, ?)', r.id, 'status', body.status, clean(body.reason, 200) || null, me.n, at);
      logs.push(['trial-status', `${r.ea_id} → ${body.status}`]);
      // P7.1 – the member who recommended this player hears how their tip is going
      if (r.source === 'scout' && r.by_id && r.by_id !== me.u) {
        const word = { applied: 'is on the trial list', trialling: 'is now on trial ⚽', signed: 'signed for NOREX ✍️', released: 'was released after the trial', declined: 'was declined' }[body.status];
        tell = () => safely(notify(env, [r.by_id], { type: 'trial', title: `Your tip ${r.ea_id} ${word}`, body: `Thanks for scouting! Updated by ${me.n}.`, link: 'members.html#scout' }));
      }
    }
    if (body.player !== undefined) {
      let key = null;
      if (body.player) {
        const players = await loadSite('players');
        key = players.find((x) => x.k === String(body.player))?.k;
        if (!key) return fail('Player not found on the site.');
      }
      add('UPDATE trials SET player = ?, updated_at = ? WHERE id = ?', key, at, r.id);
      logs.push(['trial-link', `${r.ea_id} → ${key ? 'player page linked' : 'unlinked'}`]);
    }
    if (body.session) {
      const s = body.session;
      const date = String(s.date ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > new Date(at + 14 * 3600e3).toISOString().slice(0, 10)) return fail('Pick the date of the trial session.');
      const result = clean(s.result, 80);
      let rating = null;
      if (s.rating !== undefined && s.rating !== null && s.rating !== '') {
        rating = Math.round(Number(s.rating) * 10) / 10;
        if (!(rating >= 1 && rating <= 10)) return fail('Rating must be between 1 and 10.');
      }
      const detail = clean(s.detail, 300);
      if (!result && rating === null && !detail) return fail('Add a result, rating or comment for the session.');
      add('INSERT INTO trial_events (trial_id, kind, date, result, rating, detail, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', r.id, 'session', date, result || null, rating, detail || null, me.n, at);
      add('UPDATE trials SET updated_at = ? WHERE id = ?', at, r.id);
      logs.push(['trial-session', `${r.ea_id} · ${date}${rating ? ` · ${rating}` : ''}`]);
    }
    if (!stmts.length) return fail('Nothing to change');
    await env.DB.batch(stmts);
    for (const [type, detail] of logs) await log(env, me, type, detail);
    await tell?.();
    return json(await trialsState(env, me));
  }
  return fail('Not found', 404);
}

// ---------- P5.5 scouting (members) ----------
async function scoutRoute(p, method, body, me, env, loadSite, log) {
  if (!can(me, 'scout.recommend')) return fail('Members only.', 403);
  const mine = async () => ({ recs: (await all(env, "SELECT id, ea_id, platform, positions, clips, note, status, at, updated_at FROM trials WHERE by_id = ? AND source = 'scout' ORDER BY id DESC LIMIT 50", me.u))
    .map((r) => ({ id: r.id, ea: r.ea_id, platform: opt(r.platform), positions: JSON.parse(r.positions || '[]'), clips: opt(r.clips), note: opt(r.note), status: r.status, at: r.at, updated: r.updated_at })) });
  if (method === 'GET') return json(await mine());
  if (method !== 'POST') return fail('Not found', 404);
  const today = await one(env, "SELECT COUNT(*) AS n FROM trials WHERE by_id = ? AND source = 'scout' AND at > ?", me.u, Date.now() - DAY);
  if (today.n >= SCOUT_DAILY) return fail(`That's ${SCOUT_DAILY} recommendations today – thanks! Try again tomorrow.`, 429);
  const { t, error } = await readPlayer(body, loadSite, { needContact: false });
  if (error) return fail(error);
  if (!t.note || t.note.length < 5) return fail('Say why they would fit NOREX.');
  const dupe = await openDupe(env, t.ea);
  if (dupe) return fail(`${t.ea} is already on the managers' list (${dupe.status}).`, 409);
  await insertTrial(env, t, 'scout', 'recommended', me);
  await log(env, me, 'scout', `${t.ea} · ${t.positions.join('/')}`);
  await safely(notifyManagers(env, { icon: '🔭', title: `New scouting tip: ${t.ea} (${t.positions.join('/')})`, body: `Recommended by ${me.n}: “${t.note}”`, link: 'members.html#manager' }, me.u));
  return json(await mine());
}

// ---------- P5.7 manager notes ----------
const canNotes = (env, me) => can(me, 'notes.private') && flagOn(env, me, 'managerNotes');
const noteOut = (n, me) => ({ id: n.id, kind: n.kind, subject: n.subject, tag: n.tag, text: n.text, by: { id: n.by_id, n: n.by_name, a: opt(n.by_avatar) }, at: n.at, mine: n.by_id === me.u });
async function notesList(env, me, kind, subject) {
  const rows = kind
    ? await all(env, 'SELECT * FROM notes WHERE kind = ? AND subject = ? ORDER BY id DESC LIMIT 200', kind, subject)
    : await all(env, 'SELECT * FROM notes ORDER BY id DESC LIMIT 300');
  return { notes: rows.map((n) => noteOut(n, me)) };
}
async function notesRoute(p, method, body, me, env, loadSite, log, url) {
  if (!can(me, 'notes.private')) return fail('Managers only.', 403);
  if (p === '/api/notes' && method === 'GET') {
    const kind = url.searchParams.get('kind');
    if (kind && !NOTE_KINDS.includes(kind)) return fail('Unknown note subject');
    return json(await notesList(env, me, kind, clean(url.searchParams.get('subject'), 40)));
  }
  if (p === '/api/notes' && method === 'POST') {
    const kind = NOTE_KINDS.includes(body.kind) ? body.kind : null;
    const subject = clean(body.subject, 40);
    if (!kind || !subject) return fail('Pick who the note is about.');
    const text = String(body.text ?? '').replace(/\r/g, '').split('\n').map((l) => l.replace(/[\u0000-\u001f<>]/g, ' ').trimEnd()).join('\n').trim().slice(0, 1000);
    if (text.length < 2) return fail('Write the note first.');
    const exists = kind === 'member' ? await one(env, 'SELECT id FROM users WHERE id = ?', subject)
      : kind === 'trial' ? await one(env, 'SELECT id FROM trials WHERE id = ?', Number(subject) || 0)
        : (await loadSite('players')).find((x) => x.k === subject);
    if (!exists) return fail('Not found – pick a member, player or trial card.', 404);
    const today = await one(env, 'SELECT COUNT(*) AS n FROM notes WHERE by_id = ? AND at > ?', me.u, Date.now() - DAY);
    if (today.n >= NOTE_DAILY) return fail('Note limit for today reached.', 429);
    const tag = NOTE_TAGS.includes(body.tag) ? body.tag : kind === 'trial' ? 'trial' : 'general';
    await run(env, 'INSERT INTO notes (kind, subject, tag, text, by_id, by_name, by_avatar, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', kind, subject, tag, text, me.u, me.n, me.a, Date.now());
    if (kind === 'trial') await run(env, 'UPDATE trials SET updated_at = ? WHERE id = ?', Date.now(), Number(subject));
    await log(env, me, 'note', `${kind} note · ${tag}`); // never the note text – the activity feed is wider than notes
    return json(await notesList(env, me, body.all ? null : kind, subject));
  }
  if (p === '/api/notes/delete' && method === 'POST') {
    const n = await one(env, 'SELECT * FROM notes WHERE id = ?', Number(body.id) || 0);
    if (!n) return fail('Note not found', 404);
    if (n.by_id !== me.u && me.role !== 'owner') return fail('Only the author (or the owner) can delete a note.', 403);
    await run(env, 'DELETE FROM notes WHERE id = ?', n.id);
    await log(env, me, 'note-delete', `${n.kind} note`);
    return json(await notesList(env, me, body.all ? null : n.kind, n.subject));
  }
  return fail('Not found', 404);
}

// Logged-in routes – called from members.js route() for paths it doesn't own.
export async function recruitRoute(p, method, body, me, env, loadSite, log, url) {
  if (p === '/api/scout') {
    if (!flagOn(env, me, 'scouting')) return fail('Not available yet.', 404);
    return scoutRoute(p, method, body, me, env, loadSite, log);
  }
  if (p === '/api/trials' || p.startsWith('/api/trials/')) {
    if (!flagOn(env, me, 'trials')) return fail('Not available yet.', 404);
    return trialsRoute(p, method, body, me, env, loadSite, log);
  }
  if (p === '/api/notes' || p.startsWith('/api/notes/')) {
    if (!flagOn(env, me, 'managerNotes')) return fail('Not available yet.', 404);
    return notesRoute(p, method, body, me, env, loadSite, log, url);
  }
  return null;
}
