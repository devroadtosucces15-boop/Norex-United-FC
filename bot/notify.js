// Notification centre (roadmap P7.1) and club & privacy requests (P5.6).
//   notify(env, userIds, n) / notifyManagers(env, n)  – other modules call these when something happens
//   GET  /api/notify            my latest notifications + settings        (members, flag `notifications`)
//   GET  /api/notify/count      unread count + the oldest unacknowledged announcement (polled by every page)
//   POST /api/notify/read       { ids } or { all: true }
//   POST /api/notify/ack        { id } – acknowledge an announcement / rule
//   POST /api/notify/prefs      { prefs: { type: 'dm' | 'site' | 'off' } }
//   POST /api/notify/test       send myself a test notification (+ DM)
//   POST /api/notify/announce   managers: announcement to every member (optionally "must acknowledge")
//   GET/POST /api/requests      members: my requests / "Track another club" or "Hide me"   (flag `requests`)
//   POST /api/requests/public   anyone: "Hide me from the site" (rate-limited per IP)
//   GET  /api/admin/requests, POST /api/admin/requests/decide   managers: approve / reject / undo
//   GET/POST /api/overrides     the site build (X-Norex-Key): approved hidden players + clubs to track
// Discord DMs: rows are queued (dm = 'queued') and sent right after the request (ctx.waitUntil) or by the cron.
// Needs the Worker secret DISCORD_BOT_TOKEN; without it DMs are skipped and notifications stay on the site.
import { can, flagOn } from './roles.js';

const DAY = 86400e3;
const KEEP = 200; // notifications kept per member
const REMIND_MAX = 3; // DM reminders for an unacknowledged announcement (one per day)
const REQ_DAILY = 5; // requests per member per day
const REQ_PER_IP = 3; // public "hide me" requests per IP per day
const RED = 0xc8352c;

// Notification types → settings rows. mode: dm = site + Discord DM · site = site only · off = muted.
// Later roadmap items add their own row here (messages, reactions, events, awards, feedback …).
export const TYPES = {
  announce: { icon: '📣', label: 'Announcements & rules', def: 'dm', mute: false },
  claim: { icon: '🪪', label: 'Player claim decisions', def: 'dm' },
  trial: { icon: '🔭', label: 'My scouting tips', def: 'dm' },
  rush: { icon: '⚡', label: 'My Rush results', def: 'site' },
  badge: { icon: '🎖️', label: 'Badges & achievements I get', def: 'site' },
  request: { icon: '📨', label: 'My club & privacy requests', def: 'dm' },
  idea: { icon: '💡', label: 'Replies to my suggestions', def: 'site' },
  event: { icon: '📅', label: 'New events, changes and session reports', def: 'dm' },
  award: { icon: '🏆', label: 'Weekly awards – results and my wins', def: 'site' },
  feedback: { icon: '💌', label: 'Anonymous feedback from teammates', def: 'dm' },
  predict: { icon: '🔮', label: 'My prediction points', def: 'site' },
  game: { icon: '🎮', label: 'Game updates – new max level & rules', def: 'site' },
  feed: { icon: '💬', label: 'Comments, replies and reactions on my feed posts', def: 'site' },
  storage: { icon: '💾', label: 'Media storage clean-ups (feed photos & clips)', def: 'dm', role: 'owner' },
  queue: { icon: '🛡️', label: 'Manager to-dos (new claims, trials, Rush results, requests)', def: 'site', role: 'manager' },
  test: { icon: '🔔', label: 'Test notifications', def: 'dm', hidden: true },
};
const MODES = ['dm', 'site', 'off'];

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const cleanText = (s, max) => String(s ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;
// Site-relative link ("members.html#alerts", "players/123.html") or an https URL.
const safeLink = (l) => {
  const s = String(l ?? '').trim().slice(0, 300);
  if (!s) return null;
  if (/^[a-z0-9_\-./]+\.html([?#][\w\-=&%.#]*)?$/i.test(s) && !s.includes('..') && !s.startsWith('/')) return s;
  try { const u = new URL(s); return u.protocol === 'https:' ? u.href : null; } catch { return null; }
};
const parsePrefs = (s) => { try { const p = JSON.parse(s || '{}'); return p && typeof p === 'object' ? p : {}; } catch { return {}; } };
const modeOf = (prefs, type) => {
  const t = TYPES[type] ?? TYPES.test;
  const m = MODES.includes(prefs[type]) ? prefs[type] : t.def;
  return m === 'off' && t.mute === false ? 'site' : m;
};

// ---------- sending ----------
let kick = false; // a DM was queued during this request → handleMembers sends it right after responding
export const takeKick = () => { const k = kick; kick = false; return k; };

// n = { type, title, body?, link?, icon?, ack?, ref? }. Recipients who can't see the feature yet (flag) are skipped,
// so nothing piles up or gets DMed while `notifications` is still owner-only.
// ref names what the notification is about (e.g. 'rules:3' – P5.2), so acknowledging either side acknowledges both.
export async function notify(env, ids, n) {
  ids = [...new Set((ids ?? []).filter(Boolean).map(String))].slice(0, 1000);
  if (!ids.length || !env.DB) return 0;
  const rows = await all(env, `SELECT u.id, u.role, p.prefs FROM users u LEFT JOIN notify_prefs p ON p.user_id = u.id WHERE u.id IN (${marks(ids.length)})`, ...ids);
  const at = Date.now();
  const stmts = [];
  for (const r of rows) {
    if (!flagOn(env, { role: r.role }, 'notifications')) continue;
    const mode = modeOf(parsePrefs(r.prefs), n.type);
    if (mode === 'off') continue;
    const dm = mode === 'dm' ? 'queued' : null;
    if (dm) kick = true;
    stmts.push(env.DB.prepare('INSERT INTO notifications (user_id, type, icon, title, body, link, ack, at, dm, ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(r.id, n.type, n.icon ?? TYPES[n.type]?.icon ?? '🔔', clean(n.title, 140), n.body ? cleanText(n.body, 1500) : null, safeLink(n.link), n.ack ? 1 : 0, at, dm, n.ref ?? null));
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  return stmts.length;
}
// Everyone who logged in within 180 days (or only managers + owner) – announcements, rules (P7.1 / P5.2).
export async function notifyMembers(env, n, audience = 'all') {
  const to = audience === 'managers' ? "role IN ('manager', 'owner')" : '1 = 1';
  const users = await all(env, `SELECT id FROM users WHERE ${to} AND last_at > ?`, Date.now() - 180 * DAY);
  return notify(env, users.map((u) => u.id), n);
}
// Everyone with the manager role (or owner) who logged in within 120 days, except the person who acted.
export async function notifyManagers(env, n, exceptId = null) {
  const rows = await all(env, "SELECT id FROM users WHERE role IN ('manager', 'owner') AND last_at > ?", Date.now() - 120 * DAY);
  return notify(env, rows.map((r) => r.id).filter((id) => id !== exceptId), { type: 'queue', ...n });
}
// Never let a notification failure break the action that caused it.
export const safely = (p) => Promise.resolve(p).catch((e) => console.log('notify failed', e.message));

const discord = (env, path, body) => fetch(`https://discord.com/api/v10${path}`, {
  method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const siteUrl = (env, link) => (!link ? env.SITE_URL : /^https:/.test(link) ? link : `${String(env.SITE_URL).replace(/\/?$/, '/')}${link}`);

// Sends queued DMs (oldest first). Stops on Discord rate limits; the next run picks up the rest.
export async function deliverDMs(env, limit = 25) {
  const q = await all(env, `SELECT n.*, p.dm_channel FROM notifications n LEFT JOIN notify_prefs p ON p.user_id = n.user_id
    WHERE n.dm = 'queued' ORDER BY n.id LIMIT ?`, limit);
  if (!q.length) return { sent: 0, failed: 0 };
  const mark = (id, dm) => run(env, 'UPDATE notifications SET dm = ?, dm_at = ? WHERE id = ?', dm, Date.now(), id);
  if (!env.DISCORD_BOT_TOKEN) {
    await run(env, `UPDATE notifications SET dm = 'skipped', dm_at = ? WHERE id IN (${marks(q.length)})`, Date.now(), ...q.map((r) => r.id));
    return { sent: 0, failed: 0, skipped: q.length };
  }
  const channels = {};
  let sent = 0, failed = 0;
  for (const n of q) {
    let ch = channels[n.user_id] ?? n.dm_channel;
    if (!ch) {
      const r = await discord(env, '/users/@me/channels', { recipient_id: n.user_id });
      if (r.status === 429) break;
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.id) { await mark(n.id, 'failed'); failed++; continue; }
      ch = d.id;
      await run(env, `INSERT INTO notify_prefs (user_id, dm_channel, updated) VALUES (?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE SET dm_channel = excluded.dm_channel`, n.user_id, ch, Date.now());
    }
    channels[n.user_id] = ch;
    const url = siteUrl(env, n.link);
    const r = await discord(env, `/channels/${ch}/messages`, {
      embeds: [{
        title: `${n.icon ?? '🔔'} ${n.reminders ? 'Reminder: ' : ''}${n.title}`.slice(0, 250),
        description: [n.body, n.ack ? '**Please open the site and tap “Got it” to acknowledge.**' : ''].filter(Boolean).join('\n\n').slice(0, 3900) || undefined,
        url, color: RED, timestamp: new Date(n.at).toISOString(),
        footer: { text: 'NOREX UNITED · change DM settings: Squad Hub → 🔔 Alerts' },
      }],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Open on the site', url }] }],
      allowed_mentions: { parse: [] },
    });
    if (r.status === 429) break;
    if (r.ok) { await mark(n.id, 'sent'); sent++; continue; }
    await mark(n.id, 'failed'); failed++;
    // 50007 = the member doesn't accept DMs; a stale channel id is dropped so the next DM opens a new one.
    await run(env, 'UPDATE notify_prefs SET dm_failed_at = ?, dm_channel = CASE WHEN ? = 404 THEN NULL ELSE dm_channel END WHERE user_id = ?', Date.now(), r.status, n.user_id);
  }
  return { sent, failed };
}

// Cron (every 10 min): re-DM unacknowledged announcements once a day (max 3), send queued DMs, prune.
export async function notifyCron(env) {
  if (!env.DB) return;
  const due = await all(env, `SELECT n.id, n.user_id, p.prefs FROM notifications n LEFT JOIN notify_prefs p ON p.user_id = n.user_id
    WHERE n.ack = 1 AND n.ack_at IS NULL AND n.reminders < ? AND COALESCE(n.dm_at, n.at) < ? LIMIT 100`, REMIND_MAX, Date.now() - DAY);
  const again = due.filter((r) => modeOf(parsePrefs(r.prefs), 'announce') === 'dm').map((r) => r.id);
  if (again.length) await run(env, `UPDATE notifications SET dm = 'queued', reminders = reminders + 1 WHERE id IN (${marks(again.length)})`, ...again);
  const res = await deliverDMs(env);
  if (new Date().getUTCMinutes() < 10) { // hourly housekeeping: read + older than 90 days, and over KEEP per member
    await run(env, 'DELETE FROM notifications WHERE read_at IS NOT NULL AND (ack = 0 OR ack_at IS NOT NULL) AND at < ?', Date.now() - 90 * DAY);
    await run(env, `DELETE FROM notifications WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id DESC) AS rn FROM notifications) WHERE rn > ?)`, KEEP);
  }
  return { reminded: again.length, ...res };
}

// ---------- member API ----------
const itemOut = (r) => ({
  id: r.id, type: r.type, icon: opt(r.icon), title: r.title, body: opt(r.body), link: opt(r.link), at: r.at,
  read: !!r.read_at, ack: r.ack ? (r.ack_at ? 'done' : 'due') : undefined, dm: opt(r.dm),
});
async function counts(env, me) {
  const [u, a] = await Promise.all([
    one(env, 'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', me.u),
    one(env, 'SELECT id, icon, title FROM notifications WHERE user_id = ? AND ack = 1 AND ack_at IS NULL ORDER BY id LIMIT 1', me.u),
  ]);
  return { unread: u.n, ack: a ? { id: a.id, icon: opt(a.icon), title: a.title } : null };
}
async function state(env, me) {
  const [rows, p, c] = await Promise.all([
    all(env, 'SELECT * FROM notifications WHERE user_id = ? ORDER BY (ack = 1 AND ack_at IS NULL) DESC, id DESC LIMIT 60', me.u),
    one(env, 'SELECT prefs, dm_failed_at FROM notify_prefs WHERE user_id = ?', me.u),
    counts(env, me),
  ]);
  const prefs = parsePrefs(p?.prefs);
  const types = Object.entries(TYPES).filter(([, t]) => !t.hidden && (!t.role || can(me, 'portal.view')))
    .map(([k, t]) => ({ k, icon: t.icon, label: t.label, mode: modeOf(prefs, k), mute: t.mute !== false }));
  return { items: rows.map(itemOut), ...c, types, dmBlocked: !!p?.dm_failed_at && Date.now() - p.dm_failed_at < 14 * DAY, dmReady: !!env.DISCORD_BOT_TOKEN, canAnnounce: can(me, 'notify.announce') };
}

async function notifyRoute(p, method, body, me, env, log) {
  if (!can(me, 'notify.use')) return fail('Members only.', 403);
  if (p === '/api/notify/count' && method === 'GET') return json(await counts(env, me));
  if (p === '/api/notify' && method === 'GET') return json(await state(env, me));
  if (method !== 'POST') return fail('Not found', 404);

  if (p === '/api/notify/read') {
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Number.isInteger).slice(0, 100);
    if (body.all) await run(env, 'UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', Date.now(), me.u);
    else if (ids.length) await run(env, `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL AND id IN (${marks(ids.length)})`, Date.now(), me.u, ...ids);
    else return fail('Nothing to mark');
    return json(await state(env, me));
  }
  if (p === '/api/notify/ack') {
    const id = Number(body.id) || 0;
    const r = await run(env, 'UPDATE notifications SET ack_at = ?, read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ? AND ack = 1 AND ack_at IS NULL', Date.now(), Date.now(), id, me.u);
    if (!r.meta?.changes) return fail('Already acknowledged.', 409);
    // P5.2: "Got it" on a rules notification counts as acknowledging that rules version (docs.js reads doc_acks).
    const rules = /^rules:(\d+)$/.exec((await one(env, 'SELECT ref FROM notifications WHERE id = ?', id))?.ref ?? '');
    if (rules) await run(env, 'INSERT OR IGNORE INTO doc_acks (user_id, version, name, avatar, at) VALUES (?, ?, ?, ?, ?)', me.u, Number(rules[1]), me.n, me.a ?? null, Date.now());
    await log(env, me, 'notify-ack', '');
    return json(await state(env, me));
  }
  if (p === '/api/notify/prefs') {
    const cur = parsePrefs((await one(env, 'SELECT prefs FROM notify_prefs WHERE user_id = ?', me.u))?.prefs);
    for (const [k, v] of Object.entries(body.prefs ?? {})) {
      if (!TYPES[k] || TYPES[k].hidden || !MODES.includes(v)) return fail('Unknown setting');
      if (v === 'off' && TYPES[k].mute === false) return fail(`${TYPES[k].label} can't be muted – pick “Site only” instead.`);
      cur[k] = v;
    }
    await run(env, `INSERT INTO notify_prefs (user_id, prefs, updated) VALUES (?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET prefs = excluded.prefs, updated = excluded.updated`, me.u, JSON.stringify(cur), Date.now());
    return json(await state(env, me));
  }
  if (p === '/api/notify/test') {
    const recent = await one(env, "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND type = 'test' AND at > ?", me.u, Date.now() - 3600e3);
    if (recent.n >= 3) return fail('That’s 3 tests this hour – try again later.', 429);
    await run(env, 'UPDATE notify_prefs SET dm_failed_at = NULL WHERE user_id = ?', me.u);
    await notify(env, [me.u], { type: 'test', title: 'Test notification', body: 'If you can read this in Discord, DMs from the NOREX bot work. ⚽', link: 'members.html#alerts' });
    const res = await deliverDMs(env, 5);
    return json({ ...await state(env, me), test: res });
  }
  if (p === '/api/notify/announce') {
    if (!can(me, 'notify.announce')) return fail('Managers only.', 403);
    const title = clean(body.title, 120), text = cleanText(body.body, 1500);
    if (title.length < 3) return fail('Give the announcement a title.');
    const link = body.link ? safeLink(body.link) : null;
    if (body.link && !link) return fail('The link must start with https:// or be a page of this site.');
    const today = await one(env, "SELECT COUNT(DISTINCT at) AS n FROM notifications WHERE type = 'announce' AND at > ?", Date.now() - DAY);
    if (today.n >= 10) return fail('That’s 10 announcements today – try again tomorrow.', 429);
    const sent = await notifyMembers(env, { type: 'announce', title, body: text || null, link, ack: !!body.ack }, body.audience);
    await log(env, me, 'announce', `${title}${body.ack ? ' · must acknowledge' : ''} · ${sent} members`);
    return json({ ...await state(env, me), sent });
  }
  return fail('Not found', 404);
}

// ---------- P5.6 club & privacy requests ----------
const REQ_KINDS = ['club', 'hide'];
const reqOut = (r, full) => ({
  id: r.id, kind: r.kind, status: r.status, subject: r.subject, clubId: opt(r.club_id), note: opt(r.note), at: r.at,
  decidedBy: opt(r.decided_by), decidedAt: opt(r.decided_at), reason: opt(r.reason),
  ...(full ? { contact: opt(r.contact), by: r.by_id ? { id: r.by_id, n: r.by_name, a: opt(r.by_avatar) } : null, guest: !r.by_id } : {}),
});
async function ipHash(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.DISCORD_CLIENT_SECRET}:request:${ip}`));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Checks shared by the member form and the public "hide me" form → { r } or { error, status }.
async function readRequest(env, body, loadSite) {
  const kind = REQ_KINDS.includes(body.kind) ? body.kind : null;
  if (!kind) return { error: 'Pick what you need.' };
  const subject = clean(body.subject, 60);
  if (subject.length < 2) return { error: kind === 'club' ? 'Enter the club name.' : 'Enter your EA gamertag.' };
  let clubId = null;
  if (kind === 'club') {
    clubId = /^\d{1,12}$/.test(String(body.clubId ?? '')) ? String(body.clubId) : null;
    const clubs = await loadSite('clubs').catch(() => []);
    const known = clubs.find((c) => (clubId && String(c.id) === clubId) || c.n?.toLowerCase() === subject.toLowerCase());
    if (known && ['home', 'linked', 'manual'].includes(known.t)) return { error: `${known.n} is already tracked – every match is archived.`, status: 409 };
    if (known) clubId = String(known.id);
  }
  const dupe = await one(env, "SELECT status FROM requests WHERE kind = ? AND lower(subject) = lower(?) AND status IN ('pending', 'approved')", kind, subject);
  if (dupe) return { error: dupe.status === 'pending' ? 'That request is already waiting for a manager.' : kind === 'hide' ? 'That gamertag is already hidden.' : 'That club is already on the list.', status: 409 };
  return { r: { kind, subject, clubId, note: cleanText(body.note, 400) || null } };
}
const KIND_TXT = { club: ['🏟️', 'Track club'], hide: ['🙈', 'Hide player'] };
async function insertRequest(env, r, by, contact, ip) {
  await run(env, `INSERT INTO requests (kind, subject, club_id, note, contact, by_id, by_name, by_avatar, ip_hash, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.kind, r.subject, r.clubId, r.note, contact, by?.u ?? null, by?.n ?? null, by?.a ?? null, ip, Date.now());
  const [icon, label] = KIND_TXT[r.kind];
  await safely(notifyManagers(env, { icon, title: `New request: ${label} – ${r.subject}`, body: `${by ? `From ${by.n}` : `From a visitor${contact ? ` (Discord: ${contact})` : ''}`}${r.note ? `\n“${r.note}”` : ''}`, link: 'members.html#manager' }, by?.u));
}
const mine = async (env, me) => ({ requests: (await all(env, 'SELECT * FROM requests WHERE by_id = ? ORDER BY id DESC LIMIT 30', me.u)).map((r) => reqOut(r)) });
const adminList = async (env) => ({
  requests: (await all(env, "SELECT * FROM requests WHERE status = 'pending' OR decided_at > ? ORDER BY status = 'pending' DESC, id DESC LIMIT 150", Date.now() - 180 * DAY)).map((r) => reqOut(r, true)),
});
// Rebuild the site now instead of waiting for the next 10-minute run.
async function dispatchSite(env) {
  if (!env.GH_DISPATCH_TOKEN || !env.GITHUB_REPO) return;
  await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/update.yml/dispatches`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'norex-bot' }, body: JSON.stringify({ ref: 'main' }),
  }).catch(() => {});
}

// Public: POST /api/requests/public ("hide me" – works without login) and the build's GET/POST /api/overrides.
export async function publicRequestRoute(request, env, me, loadSite, log) {
  const url = new URL(request.url);
  if (url.pathname === '/api/overrides') return overridesRoute(request, env);
  if (!flagOn(env, me, 'requests')) return fail('Not available yet.', 404);
  if (request.method !== 'POST') return fail('Not found', 404);
  const body = await request.json().catch(() => ({}));
  if (body.website) return json({ ok: true }); // honeypot
  const ip = await ipHash(env, request);
  const n = await one(env, 'SELECT COUNT(*) AS n FROM requests WHERE ip_hash = ? AND at > ?', ip, Date.now() - DAY);
  if (n.n >= REQ_PER_IP) return fail('Too many requests today – ask a manager on Discord instead.', 429);
  const contact = clean(body.contact, 40).replace(/^@/, '');
  if (!me && !/^[\w.]{2,32}$/.test(contact)) return fail('Enter your Discord username so a manager can check it’s really you.');
  const { r, error, status } = await readRequest(env, { ...body, kind: 'hide' }, loadSite);
  if (error) return fail(error, status);
  await insertRequest(env, r, me, contact || null, ip);
  await log(env, me ?? { u: null, n: r.subject, a: null }, 'request', `hide · ${r.subject}`);
  return json({ ok: true });
}

export async function requestRoute(p, method, body, me, env, loadSite, log) {
  if (p === '/api/requests') {
    if (!flagOn(env, me, 'requests')) return fail('Not available yet.', 404);
    if (method === 'GET') return json(await mine(env, me));
    if (!can(me, body.kind === 'hide' ? 'requests.hide' : 'requests.club')) return fail('Members only.', 403);
    const today = await one(env, 'SELECT COUNT(*) AS n FROM requests WHERE by_id = ? AND at > ?', me.u, Date.now() - DAY);
    if (today.n >= REQ_DAILY) return fail(`That’s ${REQ_DAILY} requests today – try again tomorrow.`, 429);
    const { r, error, status } = await readRequest(env, body, loadSite);
    if (error) return fail(error, status);
    await insertRequest(env, r, me, null, null);
    await log(env, me, 'request', `${r.kind} · ${r.subject}`);
    return json(await mine(env, me));
  }
  if (p === '/api/admin/requests' || p === '/api/admin/requests/decide') {
    if (!flagOn(env, me, 'requests')) return fail('Not available yet.', 404);
    if (!can(me, 'requests.decide')) return fail('Managers only.', 403);
    if (method === 'GET') return json(await adminList(env));
    const r = await one(env, 'SELECT * FROM requests WHERE id = ?', Number(body.id) || 0);
    if (!r) return fail('Request not found', 404);
    const next = { approve: 'approved', reject: 'rejected', undo: 'undone' }[body.action];
    if (!next) return fail('Unknown action');
    if (next === 'undone' ? r.status !== 'approved' : r.status !== 'pending') return fail(`This request is already ${r.status}.`, 409);
    let clubId = r.club_id;
    if (next === 'approved' && r.kind === 'club' && body.clubId !== undefined && body.clubId !== '') {
      if (!/^\d{1,12}$/.test(String(body.clubId))) return fail('The EA club ID is a number (from the club’s page on this site or EA’s club search).');
      clubId = String(body.clubId);
    }
    const reason = clean(body.reason, 200) || null;
    await run(env, 'UPDATE requests SET status = ?, club_id = ?, decided_by = ?, decided_at = ?, reason = ? WHERE id = ?', next, clubId, me.n, Date.now(), reason, r.id);
    await log(env, me, `request-${next}`, `${r.kind} · ${r.subject}`);
    if (next !== 'rejected') await dispatchSite(env);
    if (r.by_id && r.by_id !== me.u) {
      const what = r.kind === 'club' ? `Track ${r.subject}` : `Hide ${r.subject}`;
      const title = { approved: `✅ Approved: ${what}`, rejected: `❌ Not approved: ${what}`, undone: `↩️ Undone: ${what}` }[next];
      const text = next === 'approved' ? (r.kind === 'club' ? 'Its matches get archived from the next site update (about 10 minutes).' : 'You disappear from every page on the next site update (about 10 minutes).') : '';
      await safely(notify(env, [r.by_id], { type: 'request', title, body: [text, reason && `Manager’s note: ${reason}`].filter(Boolean).join('\n'), link: 'about.html#requests' }));
    }
    return json(await adminList(env));
  }
  return null;
}

// The site build asks for approved overrides with a key derived from DISCORD_CLIENT_SECRET (both sides have it).
export async function overridesKey(secret) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:norex-overrides`));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function overridesRoute(request, env) {
  if (!env.DISCORD_CLIENT_SECRET || request.headers.get('X-Norex-Key') !== await overridesKey(env.DISCORD_CLIENT_SECRET)) return fail('Forbidden', 403);
  if (request.method === 'POST') { // fetch.mjs found the EA club ID for a club approved by name
    const body = await request.json().catch(() => ({}));
    for (const x of (Array.isArray(body.resolved) ? body.resolved : []).slice(0, 20)) {
      if (Number.isInteger(x?.req) && /^\d{1,12}$/.test(String(x.clubId))) await run(env, "UPDATE requests SET club_id = ? WHERE id = ? AND kind = 'club' AND club_id IS NULL", String(x.clubId), x.req);
    }
  }
  const rows = await all(env, "SELECT id, kind, subject, club_id FROM requests WHERE status = 'approved'");
  return json({
    hiddenPlayers: rows.filter((r) => r.kind === 'hide').map((r) => r.subject),
    clubs: rows.filter((r) => r.kind === 'club').map((r) => ({ req: r.id, id: opt(r.club_id), name: r.subject })),
  });
}

export async function notifyRouteAll(p, method, body, me, env, loadSite, log) {
  if (p === '/api/notify' || p.startsWith('/api/notify/')) {
    if (!flagOn(env, me, 'notifications')) return fail('Not available yet.', 404);
    return notifyRoute(p, method, body, me, env, log);
  }
  return requestRoute(p, method, body, me, env, loadSite, log);
}
