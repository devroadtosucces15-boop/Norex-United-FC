// Member area: "Log in with Discord" for people in the NOREX Discord server, plus a small API
// the static site calls for member features. Data lives in Cloudflare KV (free tier).
//
// Env: DISCORD_APP_ID, DISCORD_CLIENT_SECRET (secret), DISCORD_GUILD_ID, ADMIN_IDS (comma list – owners),
//      ADMIN_ROLE_ID (managers' role – gets the admin portal), OWNER_ROLE_ID (Founder role – owner tier), MEMBER_ROLE_ID (optional – require a role, not just
//      server membership), SITE_URL, DB (D1 binding – member data), NOREX_KV (KV binding – `public` cache only)
//
// Member data lives in D1 (tables in bot/migrations). KV keeps only the `public` (player-page badges) and `rush`
// (confirmed Rush results) caches read by the public pages.
// Data saved by the first (KV-only) version is copied into D1 once, on the first request after the switch.
// Who may do what: bot/roles.js (can(user, action)).

import { getLive } from './live.js';
import { gameChanges, gameRoute, latestGame } from './game.js';
import { applyRoute, getContacts, recruitRoute } from './trials.js';
import { getHof, honoursRoute } from './honours.js';
import { buildsRoute } from './builds.js';
import { deliverDMs, notify, notifyManagers, notifyRouteAll, publicRequestRoute, safely, takeKick } from './notify.js';
import { safeEndpoint } from './webpush.js';
import { probuildsPublic, probuildsRoute } from './probuilds.js';
import { badgesRoute } from './badges.js';
import { docsList, knowledgeRoute } from './docs.js';
import { eventsRoute, lineupSocket, localDate, publicEvents, weekEvents, reportPosterRoute } from './events.js';
import { lockerRoute } from './locker.js';
import { hubRoute, hubSocket } from './hub.js';
import { lockerSocket } from './locker.js';
import { intelRoute } from './insights.js';
import { awardsRoute, trophies } from './awards.js';
import { playerInsights } from './aiinsights.js';
import { statInsightsRoute, statAskRoute, statFeedbackRoute, statCompareRoute } from './statinsights.js';
import { squadsRoute } from './squads.js';
import { ratingsRoute } from './ratings.js';
import { feedbackRoute } from './feedback.js';
import { predictRoute } from './predict.js';
import { recsRoute } from './recs.js';
import { feedPublic, feedRoute } from './feed.js';
import { hotwPublic, hotwRoute } from './hotw.js';
import { socialRoute, touch } from './social.js';
import { chatRoute, chatSocket } from './chat.js';
import { mediaUploadRoute } from './media.js';
import { playsRoute, studioSocket } from './plays.js';
import { playMediaRoute, playMediaUpload } from './playmedia.js';
import { memberCard, profileOut, profileSummary, saveProfile } from './profiles.js';
import { syncMember } from './discordroles.js';
import { botSettingsPublicRoute, botSettingsRoute } from './settings.js';
import { crawlRoute } from './crawl.js';
import { clubLookup } from './clublookup.js';
import { awardPoints, pointsRoute } from './points.js';
import { myAvatarCard } from './avatarcard.js';
import { FLAG_LEVELS, ROLES, ROLE_LABEL, atLeast, can, committedFlags, discordRole, featuresFor, flagOn, flags, loadFlagOverrides, permsFor, sessionRole, viewAsRole, withFlagOverrides } from './roles.js';
import { healthRoute } from './health.js';

const enc = new TextEncoder();
const DAY = 86400;
const STATUSES = ['yes', 'maybe', 'no'];
const RUSH_POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const RUSH_DAILY = 10; // submissions per member per day

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

async function hmac(env, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(`${env.DISCORD_CLIENT_SECRET}:norex-session`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
async function seal(env, obj) {
  const body = b64url(enc.encode(JSON.stringify(obj)));
  return `${body}.${await hmac(env, body)}`;
}
async function unseal(env, token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig || (await hmac(env, body)) !== sig) return null;
  const obj = JSON.parse(unb64url(body));
  return obj.exp > Date.now() / 1000 ? obj : null;
}

const siteOrigin = (env) => new URL(env.SITE_URL).origin;
function cors(env, res) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', siteOrigin(env));
  h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-View-As'); // X-View-As: BE5 preview-as-role
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Cache-Control', 'no-store');
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const days7 = () => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * DAY * 1000).toISOString().slice(0, 10));

// ---------- storage ----------
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined; // NULL columns → key left out of the JSON, like the old documents

const parseWarnings = (s) => { try { return JSON.parse(s || '[]'); } catch { return []; } };
const userOut = (r) => ({ n: r.name, a: r.avatar, tag: r.tag, admin: !!r.admin, role: r.role, first: r.first_at, last: r.last_at, logins: r.logins,
  mutedUntil: r.muted_until > Date.now() ? r.muted_until : undefined, warnings: parseWarnings(r.warnings), // P8.3
  points: r.points ?? 0, profanityStrikes: r.profanity_strikes ?? 0 }); // P11.3 / P11.4
const claimOut = (r, history = [], taken) => ({
  player: r.player, playerName: r.player_name, status: r.status, at: r.at, n: r.name, a: r.avatar,
  decidedBy: opt(r.decided_by), decidedAt: opt(r.decided_at), history,
  taken: opt(taken), // BE4 – pre-computed check: this player already has a different approved claim
});
const histOut = (h) => ({ action: h.action, player: h.player, by: h.by_name, at: h.at });

async function getClaim(env, uid) {
  const r = await one(env, 'SELECT * FROM claims WHERE user_id = ?', uid);
  if (!r) return null;
  const h = await all(env, 'SELECT * FROM claim_history WHERE user_id = ? ORDER BY id DESC LIMIT 20', uid);
  return claimOut(r, h.reverse().map(histOut));
}
async function getClaims(env) {
  const [rows, hist] = await Promise.all([
    all(env, 'SELECT * FROM claims ORDER BY at'),
    all(env, 'SELECT * FROM claim_history ORDER BY id'),
  ]);
  const byUser = {};
  for (const h of hist) (byUser[h.user_id] ??= []).push(histOut(h));
  const approvedBy = new Map(rows.filter((r) => r.status === 'approved').map((r) => [r.player, r.name])); // BE4: already claimed?
  return Object.fromEntries(rows.map((r) => [r.user_id, claimOut(r, (byUser[r.user_id] ?? []).slice(-20), r.status === 'pending' && approvedBy.has(r.player) ? approvedBy.get(r.player) : undefined)]));
}

// P8.2 – manager portal drill-down: everything one member has done, in one call.
// Message text is metadata-only for managers (chat name + when, never the words) unless the
// message was reported (managers see reported text) or the caller is owner (sees everything, per P0.6).
async function memberActivity(env, me, uid) {
  const seeAllMsg = can(me, 'messages.all');
  const seeReported = can(me, 'messages.reported');
  const [claim, votes, ratings, avail, posts, acks, activity, msgRows, roleHistory] = await Promise.all([
    getClaim(env, uid),
    all(env, 'SELECT * FROM votes WHERE user_id = ? ORDER BY at DESC LIMIT 50', uid),
    all(env, 'SELECT * FROM star_ratings WHERE user_id = ? ORDER BY at DESC LIMIT 50', uid),
    all(env, 'SELECT * FROM availability WHERE user_id = ? ORDER BY at DESC LIMIT 100', uid),
    all(env, 'SELECT id, body, tag, at, removed FROM posts WHERE user_id = ? ORDER BY at DESC LIMIT 50', uid),
    all(env, 'SELECT * FROM doc_acks WHERE user_id = ? ORDER BY at DESC', uid),
    all(env, 'SELECT * FROM activity WHERE user_id = ? ORDER BY id DESC LIMIT 200', uid),
    all(env, `SELECT cm.id, cm.chat_id, cm.text, cm.at, cm.reported_at, c.kind, c.name FROM chat_messages cm
               JOIN chats c ON c.id = cm.chat_id WHERE cm.user_id = ? AND cm.removed = 0 ORDER BY cm.at DESC LIMIT 100`, uid),
    all(env, 'SELECT from_role, to_role, at FROM role_history WHERE user_id = ? ORDER BY at DESC LIMIT 50', uid), // P8.3
  ]);
  return {
    claim,
    votes: votes.map((v) => ({ matchId: v.match_id, player: v.player, at: v.at })),
    ratings: ratings.map((r) => ({ week: r.week, player: r.player, stars: r.stars, at: r.at })),
    availability: avail.map((a) => ({ date: a.date, status: a.status, at: a.at })),
    posts: posts.map((p) => ({ id: p.id, body: p.body, tag: p.tag, at: p.at, removed: !!p.removed })),
    acknowledgements: acks.map((a) => ({ version: a.version, at: a.at })),
    activity: activity.map((a) => ({ at: a.at, type: a.type, detail: a.detail })),
    roleHistory: roleHistory.map((r) => ({ from: r.from_role, to: r.to_role, at: r.at })), // P8.3
    // metadata only – text included only when policy allows (owner, or a reported message a manager may see)
    messages: msgRows.map((m) => ({
      chatId: m.chat_id, kind: m.kind, chatName: opt(m.name), at: m.at, reported: !!m.reported_at,
      ...(seeAllMsg || (m.reported_at && seeReported) ? { text: m.text } : {}),
    })),
  };
}

// ---------- P8.1 – manager portal "full visibility": search + filter across the submission types ----------
const SUBMISSION_TYPES = ['feedback', 'ratings', 'awardVotes', 'predictions', 'suggestions', 'builds'];
async function submissions(env, type, q) {
  const like = q ? `%${q.replace(/[%_]/g, '\\$&')}%` : null;
  const esc = like ? " ESCAPE '\\'" : '';
  if (type === 'feedback') {
    const rows = await all(env, `SELECT * FROM feedback ${like ? `WHERE (from_name LIKE ?${esc} OR to_name LIKE ?${esc} OR body LIKE ?${esc})` : ''} ORDER BY at DESC LIMIT 300`, ...(like ? [like, like, like] : []));
    return rows.map((r) => ({ id: r.id, at: r.at, author: r.from_name, subject: r.to_name, kind: r.kind, body: r.body, hidden: !!r.hidden, reported: !!r.reported_at, report: opt(r.report) }));
  }
  if (type === 'ratings') {
    const rows = await all(env, `SELECT * FROM star_ratings ${like ? `WHERE (name LIKE ?${esc} OR player LIKE ?${esc})` : ''} ORDER BY at DESC LIMIT 300`, ...(like ? [like, like] : []));
    return rows.map((r) => ({ id: `${r.week}:${r.user_id}:${r.player}`, at: r.at, author: r.name, subject: r.player, body: `${r.stars}★ · week ${r.week}` }));
  }
  if (type === 'awardVotes') {
    const rows = await all(env, `SELECT v.week, v.player, v.at, u.name AS voter, c.name AS category FROM award_votes v
      LEFT JOIN users u ON u.id = v.user_id LEFT JOIN award_categories c ON c.id = v.category_id
      ${like ? `WHERE (u.name LIKE ?${esc} OR v.player LIKE ?${esc} OR c.name LIKE ?${esc})` : ''} ORDER BY v.at DESC LIMIT 300`, ...(like ? [like, like, like] : []));
    return rows.map((r) => ({ id: `${r.week}:${r.voter}:${r.category}`, at: r.at, author: opt(r.voter), subject: r.player, body: `${opt(r.category) ?? 'Award'} · week ${r.week}` }));
  }
  if (type === 'predictions') {
    const rows = await all(env, `SELECT * FROM predictions ${like ? `WHERE name LIKE ?${esc}` : ''} ORDER BY at DESC LIMIT 300`, ...(like ? [like] : []));
    return rows.map((r) => ({ id: `${r.event_id}:${r.user_id}`, at: r.at, author: r.name, subject: `Event #${r.event_id}`, body: `${r.gf}–${r.ga}${r.points != null ? ` · ${r.points}pt` : ''}` }));
  }
  if (type === 'suggestions') {
    const rows = await all(env, `SELECT * FROM suggestions WHERE removed_at IS NULL ${like ? `AND (by_name LIKE ?${esc} OR title LIKE ?${esc} OR body LIKE ?${esc})` : ''} ORDER BY at DESC LIMIT 300`, ...(like ? [like, like, like] : []));
    return rows.map((r) => ({ id: r.id, at: r.at, author: r.by_name, subject: r.title, body: r.body, kind: r.status, anon: !!r.anon }));
  }
  if (type === 'builds') {
    const rows = await all(env, `SELECT * FROM builds WHERE removed_at IS NULL ${like ? `AND (name LIKE ?${esc} OR title LIKE ?${esc})` : ''} ORDER BY at DESC LIMIT 300`, ...(like ? [like, like] : []));
    return rows.map((r) => ({ id: r.id, at: r.at, author: r.name, subject: r.title, body: `${r.arch} · lvl ${r.level}${r.posted_at ? ' · posted' : ''}` }));
  }
  return [];
}

// ---------- P8.3 – unified review queue: everything currently reported, across features ----------
async function reportsQueue(env) {
  const [posts, fb, msgs] = await Promise.all([
    all(env, `SELECT id, user_id, name, body, tag, reported_at, reported_by, reported_reason FROM posts WHERE reported_at IS NOT NULL AND removed = 0 ORDER BY reported_at DESC LIMIT 100`),
    all(env, `SELECT id, from_name, to_name, body, kind, reported_at, report FROM feedback WHERE reported_at IS NOT NULL AND hidden = 0 ORDER BY reported_at DESC LIMIT 100`),
    all(env, `SELECT m.id, m.chat_id, m.name, m.text, m.reported_at, m.reported_by, m.reported_reason, c.kind, c.name AS chat_name FROM chat_messages m
      JOIN chats c ON c.id = m.chat_id WHERE m.reported_at IS NOT NULL AND m.removed = 0 ORDER BY m.reported_at DESC LIMIT 100`),
  ]);
  return [
    ...posts.map((p) => ({ source: 'post', id: p.id, at: p.reported_at, author: p.name, reason: opt(p.reported_reason), excerpt: (p.body || '').slice(0, 140), link: `feed.html#p${p.id}` })),
    ...fb.map((f) => ({ source: 'feedback', id: f.id, at: f.reported_at, author: `${f.from_name} → ${f.to_name}`, reason: opt(f.report), excerpt: (f.body || '').slice(0, 140), link: 'members.html#feedback' })),
    ...msgs.map((m) => ({ source: 'message', id: m.id, at: m.reported_at, author: m.name, reason: opt(m.reported_reason), excerpt: (m.text || '').slice(0, 140), link: `messages.html#c${m.chat_id}` })),
  ].sort((a, b) => b.at - a.at);
}

export async function log(env, me, type, detail) {
  await env.DB.batch([
    env.DB.prepare('INSERT INTO activity (at, user_id, name, avatar, type, detail) VALUES (?, ?, ?, ?, ?, ?)').bind(Date.now(), me.u, me.n, me.a, type, detail),
    env.DB.prepare('DELETE FROM activity WHERE id <= (SELECT MAX(id) FROM activity) - 5000'),
  ]);
}

// ---------- one-time KV → D1 copy ----------
let migrated = null;
function migrateKV(env) {
  migrated ??= doMigrateKV(env).catch((e) => { migrated = null; throw e; });
  return migrated;
}
async function doMigrateKV(env) {
  if (await one(env, "SELECT value FROM meta WHERE key = 'kv_migrated'")) return;
  // Claim the job so parallel first requests don't copy twice.
  const got = await run(env, "INSERT OR IGNORE INTO meta (key, value) VALUES ('kv_migrated', 'running')");
  if (!got.meta?.changes) return;
  try {
    const kv = env.NOREX_KV;
    const doc = async (k, fb) => { try { return (kv ? await kv.get(k, 'json') : null) ?? fb; } catch { return fb; } };
    const stmts = [];
    const add = (sql, ...args) => stmts.push(env.DB.prepare(sql).bind(...args));

    const users = await doc('users', {});
    for (const [id, u] of Object.entries(users)) {
      add('INSERT OR IGNORE INTO users (id, name, avatar, tag, admin, role, first_at, last_at, logins) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        id, u.n ?? '', u.a ?? null, u.tag ?? null, u.admin ? 1 : 0, u.admin ? 'manager' : 'member', u.first ?? Date.now(), u.last ?? Date.now(), u.logins ?? 1);
    }
    let claims = await doc('claims', null);
    if (!claims && kv) { // very first version stored one key per claim
      claims = {};
      const { keys } = await kv.list({ prefix: 'claim:' });
      for (const k of keys) {
        const c = await kv.get(k.name, 'json');
        if (c) claims[k.name.slice(6)] = { ...c, n: k.metadata?.n, a: k.metadata?.a };
      }
    }
    for (const [uid, c] of Object.entries(claims ?? {})) {
      add('INSERT OR IGNORE INTO claims (user_id, player, player_name, status, at, name, avatar, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        uid, c.player, c.playerName ?? '', c.status ?? 'pending', c.at ?? Date.now(), c.n ?? null, c.a ?? null, c.decidedBy ?? null, c.decidedAt ?? null);
      for (const h of c.history ?? []) {
        add('INSERT INTO claim_history (user_id, action, player, by_name, at) VALUES (?, ?, ?, ?, ?)', uid, h.action, h.player ?? null, h.by ?? null, h.at ?? Date.now());
      }
    }
    for (const id of new Set([...Object.keys(users), ...Object.keys(claims ?? {})])) {
      const p = await doc(`profile:${id}`, null);
      if (p) add('INSERT OR IGNORE INTO profiles (user_id, bio, positions, platform, updated) VALUES (?, ?, ?, ?, ?)',
        id, p.bio ?? '', JSON.stringify(p.positions ?? []), p.platform ?? '', p.updated ?? Date.now());
    }
    for (const x of [...await doc('activity', [])].reverse()) { // oldest first so ids follow time
      add('INSERT INTO activity (at, user_id, name, avatar, type, detail) VALUES (?, ?, ?, ?, ?, ?)', x.at, x.u ?? null, x.n ?? null, x.a ?? null, x.type, x.detail ?? '');
    }
    if (kv) {
      // `avail:<date>` / `votes:<match>` = one document per day/match; the first version used one key per
      // person instead (`avail:<date>:<uid>` → plain status, `vote:<match>:<uid>` → player key, details in metadata).
      const perKey = async (name) => { try { return JSON.parse(await kv.get(name)); } catch { return null; } };
      const addAvail = (date, uid, v) => STATUSES.includes(v.s) && add('INSERT OR IGNORE INTO availability (date, user_id, status, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)',
        date, uid, v.s, v.n ?? users[uid]?.n ?? null, v.a ?? users[uid]?.a ?? null, v.at ?? Date.now());
      const addVote = (mid, uid, v) => v.p && add('INSERT OR IGNORE INTO votes (match_id, user_id, player, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)',
        mid, uid, v.p, v.n ?? users[uid]?.n ?? null, v.a ?? users[uid]?.a ?? null, v.at ?? Date.now());
      for (const { name, metadata } of (await kv.list({ prefix: 'avail:' })).keys) {
        const [, date, uid] = name.split(':');
        if (uid) addAvail(date, uid, { ...metadata, s: metadata?.s ?? (await kv.get(name)) });
        else for (const [u, v] of Object.entries((await perKey(name)) ?? {})) addAvail(date, u, v);
      }
      for (const { name } of (await kv.list({ prefix: 'votes:' })).keys) {
        for (const [u, v] of Object.entries((await perKey(name)) ?? {})) addVote(name.slice(6), u, v);
      }
      for (const { name, metadata } of (await kv.list({ prefix: 'vote:' })).keys) {
        const [, mid, uid] = name.split(':');
        if (uid) addVote(mid, uid, { p: metadata?.p ?? (await kv.get(name)) });
      }
    }
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    await run(env, "UPDATE meta SET value = ? WHERE key = 'kv_migrated'", `done ${new Date().toISOString()} · ${stmts.length} rows`);
  } catch (e) {
    await run(env, "DELETE FROM meta WHERE key = 'kv_migrated'"); // retry on the next request
    throw e;
  }
}

export async function handleMembers(request, env, ctx, loadSite) {
  const url = new URL(request.url);
  if (!env.DISCORD_CLIENT_SECRET || !env.DISCORD_GUILD_ID || !env.DB) {
    return cors(env, fail('Member login is not set up yet.', 503));
  }
  if (request.method === 'OPTIONS') return cors(env, new Response(null, { status: 204 }));

  if (url.pathname === '/auth/login') return login(url, env);

  try {
    await migrateKV(env);
    env = withFlagOverrides(env, await loadFlagOverrides(env)); // BE5 – live D1 flag edits win over the committed FEATURES var (a fresh env copy – never mutates the shared binding)
    if (url.pathname === '/auth/callback') return callback(url, env);
    if (url.pathname === '/api/public') return cors(env, json(await getPublic(env)));
    if (url.pathname === '/api/rush' && request.method === 'GET') return cors(env, json(await getRushPublic(env)));
    if (url.pathname === '/api/game' && request.method === 'GET') return cors(env, json(await latestGame(env, loadSite)));
    if (url.pathname === '/api/game/changes' && request.method === 'GET') { // PB.6 – public "what changed since version X"
      const d = await gameChanges(env, loadSite, url.searchParams.get('from'));
      return cors(env, d.error ? fail(d.error, d.status) : json(d));
    }
    const me = await unseal(env, (request.headers.get('Authorization') || '').replace(/^Bearer /, ''));
    const wsChat = url.pathname.match(/^\/api\/chats\/(\d+)\/ws$/); // P6.3b live chat – token in ?t= (no headers on a socket), no CORS wrap on a 101
    if (wsChat) {
      const who = await unseal(env, url.searchParams.get('t'));
      if (who) who.role = await currentRole(env, who);
      return chatSocket(request, env, who, Number(wsChat[1]));
    }
    const wsLineup = url.pathname.match(/^\/api\/events\/(\d{1,9})\/lineup\/ws$/); // BE3 live Dugout – managers only, same ?t= shape
    if (wsLineup) {
      const who = await unseal(env, url.searchParams.get('t'));
      if (who) who.role = await currentRole(env, who);
      return lineupSocket(request, env, who, wsLineup[1]);
    }
    const wsStudio = url.pathname.match(/^\/api\/plays\/(\d{1,9})\/ws$/); // BE1 live Tactics Studio – managers only, same ?t= shape
    if (wsStudio) {
      const who = await unseal(env, url.searchParams.get('t'));
      if (who) who.role = await currentRole(env, who);
      return studioSocket(request, env, who, wsStudio[1]);
    }
    if (url.pathname === '/api/hub/ws') { // BE8 – live "who's in the Hub" roster + waves, same ?t= shape as chat
      const who = await unseal(env, url.searchParams.get('t'));
      if (who) who.role = await currentRole(env, who);
      return hubSocket(request, env, who);
    }
    if (url.pathname === '/api/locker/ws') { // BE2 – live Locker Room refresh pings, same ?t= shape as the hub; session + flag checked in lockerSocket
      const who = await unseal(env, url.searchParams.get('t'));
      if (who) who.role = await currentRole(env, who);
      return lockerSocket(request, env, who);
    }
    if (url.pathname === '/api/live' && request.method === 'GET') { // P1.3 – public once the flag is 'public'
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'liveBanner')) return cors(env, fail('Not available yet.', 404));
      return cors(env, json(await getLive(env)));
    }
    if (url.pathname === '/api/contacts' || url.pathname === '/api/trials/apply') { // P1.4 / P1.5 – public, behind the trials flag
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'trials')) return cors(env, fail('Not available yet.', 404));
      if (request.method === 'POST' && url.pathname === '/api/trials/apply') {
        const res = await applyRoute(request, env, me, loadSite, log);
        if (takeKick()) ctx?.waitUntil?.(deliverDMs(env).catch(() => {}));
        return cors(env, res);
      }
      if (request.method === 'GET' && url.pathname === '/api/contacts') return cors(env, json(await getContacts(env)));
    }
    if (url.pathname === '/api/hof' && request.method === 'GET') { // P4.6 – public legends + moments, behind the hallOfFame flag
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'hallOfFame')) return cors(env, fail('Not available yet.', 404));
      return cors(env, json(await getHof(env, me)));
    }
    if (request.method === 'GET' && ['/api/probuilds', '/api/probuilds/get', '/api/probuilds/player'].includes(url.pathname)) { // PB.3 / PB.4 – public to read
      if (me) me.role = await currentRole(env, me, request);
      return cors(env, await probuildsPublic(url.pathname, env, me, url));
    }
    if (url.pathname === '/api/events/public' && request.method === 'GET') { // P3.1 – "next match night" strip on the home page
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'events')) return cors(env, fail('Not available yet.', 404));
      return cors(env, json(await publicEvents(env)));
    }
    if (url.pathname === '/api/awards/player' && request.method === 'GET') { // P4.1 – trophy cabinet on public player pages
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'awards')) return cors(env, fail('Not available yet.', 404));
      return cors(env, json(await trophies(env, url.searchParams.get('k'))));
    }
    if (url.pathname === '/api/hotw/public' && request.method === 'GET') { // P6.2 – highlight of the week on the home page, behind the hotw flag
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'hotw')) return cors(env, fail('Not available yet.', 404));
      return cors(env, json(await hotwPublic(env)));
    }
    if (url.pathname === '/api/insights/player' && request.method === 'GET') { // P11.14 – AI read on player cards/profiles/compare/portal
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'aiInsights')) return cors(env, fail('Not available yet.', 404));
      const k = url.searchParams.get('k');
      if (!k) return cors(env, fail('Missing player.'));
      const [squad, players] = await Promise.all([loadSite('squad'), loadSite('players')]);
      return cors(env, json(await playerInsights(env, k, { squad, players })));
    }
    if (url.pathname === '/api/insights' && request.method === 'GET') { // BE9 – per-stat fact-pack insights, tier-filtered (public/member/private)
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'statInsights')) return cors(env, fail('Not available yet.', 404));
      const keys = (url.searchParams.get('keys') || '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 20);
      const res = cors(env, json(await statInsightsRoute(env, keys, me)));
      res.headers.set('Cache-Control', 'public, max-age=120');
      return res;
    }
    if (url.pathname === '/api/feed/public' && request.method === 'GET') { // P6.1c – posts a member marked public, on the home page
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'feed')) return cors(env, fail('Not available yet.', 404));
      return cors(env, json(await feedPublic(env)));
    }
    if (url.pathname === '/api/docs' && request.method === 'GET') { // P5.2 – guests see items marked public, behind the docs flag
      if (me) me.role = await currentRole(env, me, request);
      if (!flagOn(env, me, 'docs')) return cors(env, fail('Not available yet.', 404));
      return cors(env, json(await docsList(env, me)));
    }
    if (url.pathname === '/api/overrides' || url.pathname === '/api/requests/public') { // P5.6 – build overrides + public "hide me"
      if (me) me.role = await currentRole(env, me, request);
      return cors(env, await publicRequestRoute(request, env, me, loadSite, log));
    }
    if (url.pathname === '/api/bot/settings/public') return cors(env, await botSettingsPublicRoute(request, env)); // P7.5 – fetch.mjs reads before posting
    if (url.pathname === '/api/crawl') return cors(env, await crawlRoute(request, env)); // P9.1 – fetch.mjs's resumable club-ID crawl checkpoint
    if (url.pathname === '/api/clubs/lookup' && request.method === 'GET') return cors(env, await clubLookup(env, url.searchParams.get('q'))); // P9.4 – find any club, indexing it live if needed
    if (!me) return cors(env, fail('Please log in again.', 401));
    me.role = await currentRole(env, me, request);
    const seen = touch(env, me); // P6.4 – "online now" (a no-op write unless a minute has passed)
    if (ctx?.waitUntil) ctx.waitUntil(seen); else await seen;
    if (url.pathname === '/api/feed/upload' && request.method === 'POST') return cors(env, await mediaUploadRoute(request, me, env, url)); // P6.1b – raw file body
    const pmu = /^\/api\/plays\/(\d+)\/media$/.exec(url.pathname);
    if (pmu && request.method === 'POST') return cors(env, await playMediaUpload(request, me, env, url, Number(pmu[1]), log)); // BE1 – Tactics Studio recording, raw body
    if (url.pathname === '/api/events/report/poster' && request.method === 'POST') return cors(env, await reportPosterRoute(request, me, env, url)); // BE11 – raw PNG body
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    const res = await route(url.pathname, request.method, body, me, env, loadSite, url);
    if (takeKick()) ctx?.waitUntil?.(deliverDMs(env).catch((e) => console.log('DM delivery failed', e.message))); // P7.1 – DMs right away
    return cors(env, res);
  } catch (e) {
    return cors(env, fail(e.message || 'Something went wrong', 500));
  }
}

// ---------- OAuth ----------
async function login(url, env) {
  const ret = url.searchParams.get('return') || env.SITE_URL;
  if (!ret.startsWith(env.SITE_URL)) return new Response('Bad return URL', { status: 400 });
  const state = await seal(env, { r: ret, exp: Date.now() / 1000 + 600 });
  const q = new URLSearchParams({
    client_id: env.DISCORD_APP_ID, response_type: 'code', scope: 'identify guilds.members.read connections', // connections: P2.4 verified PSN / Xbox / Steam
    redirect_uri: `${url.origin}/auth/callback`, state, prompt: 'none',
  });
  return Response.redirect(`https://discord.com/oauth2/authorize?${q}`, 302);
}

// ---------- P2.4 platform accounts (Discord `connections` scope) ----------
// Discord tells us which PlayStation / Xbox / Steam / Epic accounts a member linked and whether the platform verified them.
// Kept in profiles.verified at every login; nothing is stored for accounts Discord doesn't mark verified.
const CONN = { playstation: 'psn', xbox: 'xbox', steam: 'steam', epicgames: 'epic' };
async function saveConnections(env, uid, auth) {
  const r = await fetch('https://discord.com/api/v10/users/@me/connections', { headers: auth });
  if (!r.ok) return; // older sessions without the scope → 401; keep what we had
  const list = await r.json();
  const verified = {};
  for (const c of Array.isArray(list) ? list : []) if (c.verified && CONN[c.type] && !verified[CONN[c.type]]) verified[CONN[c.type]] = { name: clean(c.name, 40), at: Date.now() };
  if (!Object.keys(verified).length) { await run(env, "UPDATE profiles SET verified = '{}' WHERE user_id = ?", uid); return; } // no empty profile rows
  await run(env, `INSERT INTO profiles (user_id, updated, verified) VALUES (?, ?, ?)
    ON CONFLICT (user_id) DO UPDATE SET verified = excluded.verified`, uid, Date.now(), JSON.stringify(verified));
}
const loadSiteFor = (env) => (file) => fetch(`${String(env.SITE_URL).replace(/\/?$/, '/')}api/${file}.json`).then((r) => r.json());
// On console the EA player name *is* the PSN ID / Xbox gamertag, so a verified account with the claimed player's name proves
// the claim – approve it without waiting for a manager. → the platform label, or null when nothing matched.
async function autoApprove(env, uid, loadSite) {
  const c = await one(env, "SELECT * FROM claims WHERE user_id = ? AND status = 'pending'", uid);
  if (!c) return null;
  let verified = {};
  try { verified = JSON.parse((await one(env, 'SELECT verified FROM profiles WHERE user_id = ?', uid))?.verified || '{}'); } catch {}
  const hit = ['psn', 'xbox'].find((k) => verified[k]?.name && verified[k].name.toLowerCase() === String(c.player_name).toLowerCase());
  if (!hit) return null;
  if (await one(env, "SELECT 1 FROM claims WHERE user_id != ? AND player = ? AND status = 'approved'", uid, c.player)) return null;
  const how = hit === 'psn' ? 'verified PSN' : 'verified Xbox';
  const at = Date.now();
  await env.DB.batch([
    env.DB.prepare("UPDATE claims SET status = 'approved', decided_by = ?, decided_at = ? WHERE user_id = ?").bind(`Auto (${how})`, at, uid),
    env.DB.prepare("INSERT INTO claim_history (user_id, action, player, by_name, at) VALUES (?, 'approved', ?, ?, ?)").bind(uid, c.player_name, `Auto (${how})`, at),
  ]);
  await log(env, { u: uid, n: c.name, a: c.avatar }, 'claim-approved', `${c.name} → ${c.player_name} · auto (${how})`);
  await rebuildPublic(env);
  if (flagOn(env, { role: 'manager' }, 'roleSync')) { // a system decision – synced like a manager's
    const pos = (await loadSite('players').catch(() => [])).find((x) => x.k === c.player)?.pos;
    await safely(syncMember(env, uid, true, pos));
  }
  await safely(notify(env, [uid], { type: 'claim', title: `✅ ${c.player_name} is yours – matched your ${how} account`, body: 'You now have the verified badge on your player page.', link: `players/${c.player}.html` }));
  await safely(notifyManagers(env, { icon: '🪪', title: `Claim auto-approved: ${c.name} → ${c.player_name}`, body: `Their Discord-verified ${hit === 'psn' ? 'PSN' : 'Xbox'} name matches the EA player name.`, link: 'members.html#manager' }));
  return how;
}

async function callback(url, env) {
  const state = await unseal(env, url.searchParams.get('state'));
  if (!state) return new Response('Login expired – please try again.', { status: 400 });
  const back = (hash) => Response.redirect(`${state.r.split('#')[0]}#${hash}`, 302);
  const code = url.searchParams.get('code');
  if (!code) return back('norex_error=cancelled');

  const tok = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.DISCORD_APP_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: `${url.origin}/auth/callback` }),
  }).then((r) => r.json());
  if (!tok.access_token) return back('norex_error=discord');
  const auth = { Authorization: `Bearer ${tok.access_token}` };
  const user = await fetch('https://discord.com/api/v10/users/@me', { headers: auth }).then((r) => r.json());
  const memberRes = await fetch(`https://discord.com/api/v10/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, { headers: auth });
  if (!memberRes.ok) return back('norex_error=not_member');
  const member = await memberRes.json();
  if (env.MEMBER_ROLE_ID && !member.roles?.includes(env.MEMBER_ROLE_ID)) return back('norex_error=not_member');

  const avatar = member.avatar
    ? `https://cdn.discordapp.com/guilds/${env.DISCORD_GUILD_ID}/users/${user.id}/avatars/${member.avatar}.png?size=128`
    : user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`;
  const name = clean(member.nick || user.global_name || user.username, 40);
  const role = discordRole(env, user.id, member.roles ?? []);
  const admin = atLeast(role, 'manager');

  const now = Date.now();
  const prevRole = (await one(env, 'SELECT role FROM users WHERE id = ?', user.id))?.role;
  await run(env, `INSERT INTO users (id, name, avatar, tag, admin, role, first_at, last_at, logins) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT (id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, tag = excluded.tag, admin = excluded.admin,
      role = excluded.role, last_at = excluded.last_at, logins = users.logins + 1`, user.id, name, avatar, user.username, admin ? 1 : 0, role, now, now);
  const me = { u: user.id, n: name, a: avatar };
  if (prevRole && prevRole !== role) { // P8.3 – role-change history (Discord role sync)
    await run(env, 'INSERT INTO role_history (user_id, from_role, to_role, at) VALUES (?, ?, ?, ?)', user.id, prevRole, role, now);
    await log(env, me, 'role-change', `${ROLE_LABEL[prevRole] ?? prevRole} → ${ROLE_LABEL[role] ?? role}`);
  }
  await log(env, me, 'login', admin ? `as ${role}` : '');
  await safely(saveConnections(env, user.id, auth).then(() => flagOn(env, { role }, 'platformLink') && autoApprove(env, user.id, loadSiteFor(env)))); // P2.4
  const session = await seal(env, { ...me, role, adm: admin, exp: Math.floor(Date.now() / 1000) + (admin ? 7 : 30) * DAY });
  return back(`norex_session=${session}`);
}

// Role from the session (Discord roles at login) + `claimed` if the member's claim is approved right now.
export async function currentRole(env, me, request) {
  const role = sessionRole(env, me);
  const real = role !== 'member' ? role : (await one(env, 'SELECT status FROM claims WHERE user_id = ?', me.u))?.status === 'approved' ? 'claimed' : role;
  // BE5 – a manager/owner request carrying x-view-as is answered as that lower role for this one request.
  const view = viewAsRole(real, request?.headers?.get('x-view-as'));
  if (view !== real) me.realRole = real;
  return view;
}

// ---------- API ----------
async function route(p, method, body, me, env, loadSite, url) {
  if (!can(me, 'hub.use')) return fail('Members only.', 403);
  if (p === '/api/me' && method === 'GET') {
    const [claim, profile] = await Promise.all([getClaim(env, me.u), one(env, 'SELECT * FROM profiles WHERE user_id = ?', me.u)]);
    // BE5 – when previewing as a lower role, `me.role` is already the preview role (see currentRole());
    // `me.realRole` is the manager/owner's actual tier, so the UI can show a "previewing as…" banner
    // and offer only the roles at or below it.
    const user = {
      id: me.u, name: me.n, avatar: me.a, admin: can(me, 'portal.view'), role: me.role, roleLabel: ROLE_LABEL[me.role], perms: permsFor(me.role), features: featuresFor(env, me),
      ...(me.realRole ? { realRole: me.realRole, realRoleLabel: ROLE_LABEL[me.realRole], viewAsOptions: ROLES.filter((r) => atLeast(me.realRole, r)) } : can(me, 'preview.viewAs') ? { viewAsOptions: ROLES.filter((r) => atLeast(me.role, r)) } : {}),
    };
    return json({ user, claim, profile: profileOut(profile) ?? null });
  }

  if (p === '/api/insights/ask' && method === 'POST') { // BE9 – follow-up question, answered only from the stored fact pack
    if (!flagOn(env, me, 'statInsights')) return fail('Not available yet.', 404);
    return json(await statAskRoute(env, me, body));
  }
  if (p === '/api/insights/compare' && method === 'POST') { // BE9 – head-to-head for two home players, written on demand
    if (!flagOn(env, me, 'statInsights')) return fail('Not available yet.', 404);
    return json(await statCompareRoute(env, loadSite, me, body));
  }
  if (p === '/api/insights/feedback' && method === 'POST') { // BE9 – 👍/👎 on a stat insight
    if (!flagOn(env, me, 'statInsights')) return fail('Not available yet.', 404);
    return json(await statFeedbackRoute(env, me, body));
  }

  if (p === '/api/claim' && method === 'POST') {
    if (!can(me, 'claim.request')) return fail('Members only.', 403);
    const mine = await one(env, 'SELECT * FROM claims WHERE user_id = ?', me.u);
    if (body.cancel) {
      if (mine?.status === 'pending') {
        await run(env, 'DELETE FROM claims WHERE user_id = ?', me.u);
        await log(env, me, 'claim-cancel', '');
      }
      return json({ claim: null });
    }
    const players = await loadSite('players');
    const pl = players.find((x) => x.k === body.player && x.home);
    if (!pl) return fail('Pick a player from the NOREX squad.');
    const owner = await one(env, "SELECT user_id FROM claims WHERE player = ? AND status = 'approved' AND user_id != ?", pl.k, me.u);
    if (owner) return fail('That player has already been claimed. Ask a manager if this is wrong.', 409);
    if (!(mine?.status === 'approved' && mine.player === pl.k)) {
      if (mine?.status === 'approved' && flagOn(env, me, 'roleSync')) await safely(syncMember(env, me.u, false)); // P2.5
      await run(env, `INSERT INTO claims (user_id, player, player_name, status, at, name, avatar, decided_by, decided_at) VALUES (?, ?, ?, 'pending', ?, ?, ?, NULL, NULL)
        ON CONFLICT (user_id) DO UPDATE SET player = excluded.player, player_name = excluded.player_name, status = 'pending', at = excluded.at,
          name = excluded.name, avatar = excluded.avatar, decided_by = NULL, decided_at = NULL`, me.u, pl.k, pl.n, Date.now(), me.n, me.a);
    }
    await log(env, me, 'claim', pl.n);
    const auto = flagOn(env, me, 'platformLink') ? await safely(autoApprove(env, me.u, loadSite)) : null; // P2.4
    if (!auto) await safely(notifyManagers(env, { icon: '🪪', title: `New player claim: ${me.n} → ${pl.n}`, link: 'members.html#manager' }, me.u));
    return json({ claim: await getClaim(env, me.u), ...(auto ? { auto } : {}) });
  }

  if (p === '/api/profile' && method === 'POST') {
    if (!can(me, 'profile.edit')) return fail('Members only.', 403);
    const { profile, error } = await saveProfile(env, me, body); // P2.2 – only the fields sent change
    if (error) return fail(error);
    await log(env, me, 'profile', profileSummary(profile));
    if ((await one(env, 'SELECT status FROM claims WHERE user_id = ?', me.u))?.status === 'approved') await rebuildPublic(env);
    return json({ profile });
  }

  if (p === '/api/member' && method === 'GET') { // P2.1 – hover cards + member profile pages
    if (!flagOn(env, me, 'profiles')) return fail('Not available yet.', 404);
    if (!can(me, 'profiles.view')) return fail('Members only.', 403);
    const card = await memberCard(env, me, String(url.searchParams.get('u') || me.u).slice(0, 24));
    return card ? json(card) : fail('Member not found', 404);
  }

  if (p === '/api/avatarcard' && method === 'GET') { // P11.5 – web half of the AI club card made by /avatarcard in Discord
    if (!flagOn(env, me, 'avatarCard')) return fail('Not available yet.', 404);
    const row = await myAvatarCard(env, me.u);
    return json({ card: row ? { photoKey: row.photo_key, bgKey: row.bg_key, at: row.at } : null });
  }

  if (p === '/api/availability') {
    const dates = days7();
    if (method === 'POST') {
      if (!can(me, 'availability.set')) return fail('Members only.', 403);
      const pick = (Array.isArray(body.dates) ? body.dates : [body.date]).filter((d) => dates.includes(d));
      const status = body.status;
      if (!pick.length || !(STATUSES.includes(status) || status === 'clear')) return fail('Bad availability');
      const old = new Date(Date.now() - 400 * DAY * 1000).toISOString().slice(0, 10); // a year+ of history – attendance streaks (P4.3), monthly boards
      await env.DB.batch([
        ...pick.map((d) => (status === 'clear'
          ? env.DB.prepare('DELETE FROM availability WHERE date = ? AND user_id = ?').bind(d, me.u)
          : env.DB.prepare(`INSERT INTO availability (date, user_id, status, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (date, user_id) DO UPDATE SET status = excluded.status, name = excluded.name, avatar = excluded.avatar, at = excluded.at`)
            .bind(d, me.u, status, me.n, me.a, Date.now()))),
        env.DB.prepare('DELETE FROM availability WHERE date < ?').bind(old),
      ]);
      await log(env, me, 'availability', `${status === 'clear' ? 'cleared' : status} · ${pick.map((d) => d.slice(5)).join(', ')}`);
    }
    const by = await availByDate(env, dates);
    return json({ days: dates.map((d) => ({ date: d, people: Object.entries(by[d]).map(([id, v]) => ({ id, ...v })) })) });
  }

  if (p === '/api/vote') {
    const club = await loadSite('club');
    const recent = club.matches.slice(0, 3);
    if (method === 'POST') {
      if (!can(me, 'vote.motm')) return fail('Members only.', 403);
      const m = recent.find((x) => x.id === body.match);
      if (!m) return fail('Voting is only open for the latest matches.');
      const cur = await one(env, 'SELECT player FROM votes WHERE match_id = ? AND user_id = ?', String(m.id), me.u);
      if (body.player === null || cur?.player === body.player) {
        await run(env, 'DELETE FROM votes WHERE match_id = ? AND user_id = ?', String(m.id), me.u);
        await log(env, me, 'vote-remove', `vs ${m.opp}`);
      } else {
        const pl = (m.ps || []).find((x) => x.k === body.player);
        if (!pl) return fail('Pick someone who played in that match.');
        await run(env, `INSERT INTO votes (match_id, user_id, player, name, avatar, at) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (match_id, user_id) DO UPDATE SET player = excluded.player, name = excluded.name, avatar = excluded.avatar, at = excluded.at`,
        String(m.id), me.u, pl.k, me.n, me.a, Date.now());
        await log(env, me, 'vote', `${pl.n} · vs ${m.opp}`);
        if (!cur) await awardPoints(env, me.u, 'community', 2, `MOTM vote · vs ${m.opp}`); // P11.3 – only on a first vote, not switching picks
      }
    }
    const docs = await votesByMatch(env, recent);
    return json({ matches: recent.map((m, i) => voteView(m, docs[i], me)) });
  }

  if (p.startsWith('/api/rush')) {
    if (!flagOn(env, me, 'rushLog')) return fail('Not available yet.', 404);
    return rushRoute(p, method, body, me, env, loadSite);
  }

  if (p.startsWith('/api/game/')) {
    if (!flagOn(env, me, 'gameRules')) return fail('Not available yet.', 404);
    return gameRoute(p, method, body, me, env, loadSite, log);
  }

  const rec = await recruitRoute(p, method, body, me, env, loadSite, log, url); // P1.5 trials · P5.5 scouting · P5.7 notes
  if (rec) return rec;
  const hon = await honoursRoute(p, method, body, me, env, loadSite, log, url); // P4.5 squad boards · P4.6 hall of fame
  if (hon) return hon;
  const bld = await buildsRoute(p, method, body, me, env, log, url, loadSite); // PB.2 saved builds, fork · BE12 impact
  if (bld) return bld;
  const ntf = await notifyRouteAll(p, method, body, me, env, loadSite, log); // P7.1 notifications · P5.6 requests
  if (ntf) return ntf;
  // BE0 Web Push: this browser asks for pushes (or stops). Only the push service's own https endpoint is stored.
  if (p === '/api/push/subscribe' && method === 'POST') {
    if (!can(me, 'notify.use') || !flagOn(env, me, 'push')) return fail('Members only.', 403);
    const s = body.subscription ?? {};
    const endpoint = safeEndpoint(s.endpoint);
    const p256dh = String(s.keys?.p256dh ?? ''), auth = String(s.keys?.auth ?? '');
    if (!endpoint || !/^[A-Za-z0-9_-]{80,100}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,32}$/.test(auth)) return fail('That browser’s push details don’t look right – try again.');
    await run(env, `INSERT INTO push_subs (endpoint, user_id, p256dh, auth, at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, at = excluded.at`, endpoint, me.u, p256dh, auth, Date.now());
    return json({ ok: true });
  }
  if (p === '/api/push/unsubscribe' && method === 'POST') {
    if (!can(me, 'notify.use') || !flagOn(env, me, 'push')) return fail('Members only.', 403);
    await run(env, 'DELETE FROM push_subs WHERE user_id = ? AND endpoint = ?', me.u, String(body.endpoint ?? ''));
    return json({ ok: true });
  }
  const pro = await probuildsRoute(p, method, body, me, env, log); // PB.3 Pro Builds board · PB.4 my build
  if (pro) return pro;
  const bdg = await badgesRoute(p, method, body, me, env, loadSite, log, url); // P2.3 badges · P2.3/P4.3 achievements
  if (bdg) return bdg;
  const kno = await knowledgeRoute(p, method, body, me, env, log, url); // P5.1 play style · P5.2/P5.3 docs · P5.4 suggestions
  if (kno) return kno;
  const evt = await eventsRoute(p, method, body, me, env, log, loadSite, url); // P3.1 events · P3.2 RSVPs · P3.7 match night
  if (evt) return evt;
  const lkr = await lockerRoute(p, method, me, env); // BE2 Locker Room: next event + vote + unread + achievements, one call
  if (lkr) return lkr;
  const hub = await hubRoute(p, method, body, me, env, log); // BE8 Hub: online count + waves (live roster is the HUB_ROOM socket)
  if (hub) return hub;
  const pmr = await playMediaRoute(p, method, me, env); // BE1 recordings: list + file (before playsRoute, which 404s unknown sub-paths)
  if (pmr) return pmr;
  const ply = await playsRoute(p, method, body, me, env, log); // BE1 Tactics Studio: plays, versions, assignment, quiz
  if (ply) return ply;
  const itl = await intelRoute(p, method, body, me, env, loadSite, log); // BE10 Club Intelligence: report + act/remind on a recommendation
  if (itl) return itl;
  const awd = await awardsRoute(p, method, body, me, env, loadSite, log, url); // P4.1 weekly awards
  if (awd) return awd;
  const sqd = await squadsRoute(p, method, body, me, env, log); // P3.5 Rush squad builder
  if (sqd) return sqd;
  const rat = await ratingsRoute(p, method, body, me, env, loadSite, log, url); // P4.2 star ratings
  if (rat) return rat;
  const fbk = await feedbackRoute(p, method, body, me, env, log); // P4.4 anonymous feedback
  if (fbk) return fbk;
  const prd = await predictRoute(p, method, body, me, env, loadSite, log); // P3.8 predictions
  if (prd) return prd;
  const rec2 = await recsRoute(p, method, body, me, env, url); // P3.6 who to play with
  if (rec2) return rec2;
  const fed = await feedRoute(p, method, body, me, env, log, url); // P6.1 social feed
  if (fed) return fed;
  const soc = await socialRoute(p, method, body, me, env, log, url); // P6.4 presence · P6.5 mentions + comment reactions
  if (soc) return soc;
  const hw = await hotwRoute(p, method, body, me, env, log); // P6.2 highlight of the week
  if (hw) return hw;
  const cht = await chatRoute(p, method, body, me, env, log, url); // P6.3a messaging: DMs + group chats
  if (cht) return cht;
  const bst = await botSettingsRoute(p, method, body, me, env, log); // P7.5 bot personalisation
  if (bst) return bst;
  const pts = await pointsRoute(p, method, body, me, env); // P11.3 point system
  if (pts) return pts;

  if (p.startsWith('/api/admin/')) {
    if (!can(me, 'portal.view')) return fail('Managers only.', 403);
    if (p.startsWith('/api/admin/member/') && method === 'GET') { // P8.2 – drill-down: everything one member has done
      if (!can(me, 'activity.view')) return fail('Managers only.', 403);
      const uid = p.slice('/api/admin/member/'.length);
      const u = await one(env, 'SELECT * FROM users WHERE id = ?', uid);
      if (!u) return fail('Member not found', 404);
      return json({ user: userOut(u), ...(await memberActivity(env, me, uid)) });
    }
    if (p === '/api/admin/submissions' && method === 'GET') { // P8.1 – full visibility across submission types
      if (!can(me, 'submissions.view')) return fail('Managers only.', 403);
      const type = String(url?.searchParams.get('type') ?? '');
      if (!SUBMISSION_TYPES.includes(type)) return fail(`type must be one of: ${SUBMISSION_TYPES.join(', ')}`);
      return json({ type, rows: await submissions(env, type, clean(url?.searchParams.get("q") ?? "", 100)) });
    }
    if (p === '/api/admin/reports' && method === 'GET') { // P8.3 – unified reported-content queue
      if (!can(me, 'reports.view')) return fail('Managers only.', 403);
      return json({ items: await reportsQueue(env) });
    }
    if (p === '/api/admin/warn' && method === 'POST') { // P8.3
      if (!can(me, 'moderation.manage')) return fail('Managers only.', 403);
      const uid = String(body.user ?? '');
      const reason = clean(body.reason, 200);
      if (!reason) return fail('Give a reason.');
      const u = await one(env, 'SELECT warnings, name FROM users WHERE id = ?', uid);
      if (!u) return fail('Member not found', 404);
      const warnings = [...parseWarnings(u.warnings), { at: Date.now(), by: me.n, reason }];
      await run(env, 'UPDATE users SET warnings = ? WHERE id = ?', JSON.stringify(warnings), uid);
      await log(env, me, 'warn', `${u.name}: ${reason}`);
      await safely(notify(env, [uid], { type: 'moderation', icon: '⚠️', title: 'You received a warning from the managers', body: reason, link: 'members.html#me' }));
      return json({ ok: true, warnings });
    }
    if (p === '/api/admin/mute' && method === 'POST') { // P8.3
      if (!can(me, 'moderation.manage')) return fail('Managers only.', 403);
      const uid = String(body.user ?? '');
      const hours = Math.max(0, Number(body.hours) || 0);
      const u = await one(env, 'SELECT name FROM users WHERE id = ?', uid);
      if (!u) return fail('Member not found', 404);
      const until = hours ? Date.now() + hours * 3600e3 : null;
      await run(env, 'UPDATE users SET muted_until = ? WHERE id = ?', until, uid);
      await log(env, me, until ? 'mute' : 'unmute', until ? `${u.name} · ${hours}h` : u.name);
      if (until) await safely(notify(env, [uid], { type: 'moderation', icon: '🔇', title: 'You’ve been muted by the managers', body: `You can't post, comment or message until ${new Date(until).toLocaleString()}.`, link: 'members.html#me' }));
      return json({ ok: true, mutedUntil: until ?? undefined });
    }
    if (p === '/api/admin/claims' && method === 'POST') {
      if (!can(me, 'claims.decide')) return fail('Managers only.', 403);
      const c = await one(env, 'SELECT * FROM claims WHERE user_id = ?', String(body.user ?? ''));
      if (!c) return fail('Claim not found', 404);
      let status;
      if (body.action === 'approve') {
        const other = await one(env, "SELECT name FROM claims WHERE user_id != ? AND player = ? AND status = 'approved'", c.user_id, c.player);
        if (other) return fail(`${other.name} already owns ${c.player_name} – unlink them first.`, 409);
        status = 'approved';
      } else if (body.action === 'reject' || body.action === 'unlink') {
        status = body.action === 'unlink' ? 'unlinked' : 'rejected';
      } else return fail('Unknown action');
      const at = Date.now();
      await env.DB.batch([
        env.DB.prepare('UPDATE claims SET status = ?, decided_by = ?, decided_at = ? WHERE user_id = ?').bind(status, me.n, at, c.user_id),
        env.DB.prepare('INSERT INTO claim_history (user_id, action, player, by_name, at) VALUES (?, ?, ?, ?, ?)').bind(c.user_id, status, c.player_name, me.n, at),
      ]);
      await log(env, me, `claim-${status}`, `${c.name} → ${c.player_name}`);
      await rebuildPublic(env);
      if (flagOn(env, me, 'roleSync')) { // P2.5 – ✅ Verified (+ position) role in Discord
        const pos = status === 'approved' ? (await loadSite('players').catch(() => [])).find((x) => x.k === c.player)?.pos : null;
        await safely(syncMember(env, c.user_id, status === 'approved', pos));
      }
      if (c.user_id !== me.u) {
        const title = { approved: `✅ Your claim for ${c.player_name} was approved`, rejected: `❌ Your claim for ${c.player_name} was not approved`, unlinked: `↩️ You were unlinked from ${c.player_name}` }[status];
        const text = status === 'approved' ? 'You now have the verified badge on your player page.' : 'Ask a manager on Discord if this looks wrong – you can send a new claim from the Squad Hub.';
        await safely(notify(env, [c.user_id], { type: 'claim', title, body: text, link: status === 'approved' ? `players/${c.player}.html` : 'members.html#me' }));
      }
      return json({ claims: await getClaims(env) });
    }
    if (p === '/api/admin/overview' && method === 'GET') {
      const dates = days7();
      const club = await loadSite('club');
      const recent = club.matches.slice(0, 3);
      const [userRows, claims, profileRows, activity, avail, votes] = await Promise.all([
        all(env, 'SELECT * FROM users ORDER BY first_at'),
        getClaims(env),
        all(env, 'SELECT * FROM profiles'),
        all(env, 'SELECT * FROM activity ORDER BY id DESC LIMIT 200'),
        availByDate(env, dates),
        votesByMatch(env, recent),
      ]);
      const profileMap = Object.fromEntries(profileRows.map((r) => [r.user_id, profileOut(r)]));
      return json({
        users: Object.fromEntries(userRows.map((r) => [r.id, userOut(r)])),
        claims,
        profiles: Object.fromEntries(userRows.map((r) => [r.id, profileMap[r.id] ?? null])),
        activity: activity.map((x) => ({ at: x.at, u: x.user_id, n: x.name, a: x.avatar, type: x.type, detail: x.detail })),
        availability: dates.map((d) => ({ date: d, byUser: avail[d] })),
        votes: recent.map((m, i) => ({ id: m.id, opp: m.opp, gf: m.gf, ga: m.ga, res: m.res, voters: Object.entries(votes[i]).map(([id, v]) => ({ id, ...v, pn: (m.ps || []).find((x) => x.k === v.p)?.n })) })),
        ...(can(me, 'settings.bot') ? { flags: flags(env), canEditFlags: can(me, 'flags.manage') } : {}), // BE5 – flags is now live (D1 overrides), canEditFlags gates the portal's edit controls
        ...(flagOn(env, me, 'events') ? { events: await weekEvents(env, me) } : {}), // P3.2 – squad week by event
      });
    }
    if (p === '/api/admin/squadweek' && method === 'GET') { // BE4 – Dugout: 7 days of availability + event RSVPs merged, "can we field 9?" per day
      const dates = days7();
      const [avail, events] = await Promise.all([availByDate(env, dates), flagOn(env, me, 'events') ? weekEvents(env, me) : []]);
      const days = dates.map((d) => {
        const yes = new Map(), maybe = new Map();
        for (const [uid, v] of Object.entries(avail[d] ?? {})) {
          if (v.s === 'yes') yes.set(uid, { n: v.n, a: v.a });
          else if (v.s === 'maybe') maybe.set(uid, { n: v.n, a: v.a });
        }
        for (const e of events) {
          if (e.status !== 'scheduled' || localDate(e.start, e.tz) !== d) continue;
          for (const r of e.rsvps) {
            if (r.s === 'yes') yes.set(r.id, { n: r.n, a: r.a });
            else if (r.s === 'maybe' && !yes.has(r.id)) maybe.set(r.id, { n: r.n, a: r.a });
          }
        }
        for (const id of yes.keys()) maybe.delete(id);
        return { date: d, yes: [...yes].map(([id, p]) => ({ id, ...p })), maybe: [...maybe].map(([id, p]) => ({ id, ...p })), canField9: yes.size >= 9 };
      });
      return json({ days });
    }
    if (p === '/api/admin/flags' && method === 'POST') { // BE5 – Boardroom: live-edit one flag's level
      if (!can(me, 'flags.manage')) return fail('Owner only.', 403);
      const name = String(body.name || '').trim();
      const level = String(body.level || '');
      if (!(name in committedFlags(env))) return fail('Unknown flag.', 404);
      if (!FLAG_LEVELS.includes(level)) return fail('Bad level.', 400);
      await run(env, `INSERT INTO flag_overrides (name, level, by_name, at) VALUES (?, ?, ?, ?)
        ON CONFLICT (name) DO UPDATE SET level = excluded.level, by_name = excluded.by_name, at = excluded.at`, name, level, me.n, Date.now());
      await log(env, me, 'flag-change', `${name} → ${level}`);
      return json({ flags: { ...flags(env), [name]: level } });
    }
    if (p === '/api/admin/flags/reset' && method === 'POST') { // BE5 – drop the override, back to config.json's committed level
      if (!can(me, 'flags.manage')) return fail('Owner only.', 403);
      const name = String(body.name || '').trim();
      const committed = committedFlags(env);
      if (!(name in committed)) return fail('Unknown flag.', 404);
      await run(env, 'DELETE FROM flag_overrides WHERE name = ?', name);
      await log(env, me, 'flag-change', `${name} → reset to committed`);
      return json({ flags: { ...flags(env), [name]: committed[name] } });
    }
    if (p === '/api/admin/health' && method === 'GET') { // BE6 – Boardroom: Cloudflare Analytics + GitHub Actions status
      const res = await healthRoute(me, env);
      return res.ok ? json(res) : fail(res.error, 403);
    }
  }

  return fail('Not found', 404);
}

// { date: { uid: {s, n, a, at} } } for the given dates
async function availByDate(env, dates) {
  const rows = await all(env, `SELECT * FROM availability WHERE date IN (${marks(dates.length)}) ORDER BY at`, ...dates);
  const out = Object.fromEntries(dates.map((d) => [d, {}]));
  for (const r of rows) out[r.date][r.user_id] = { s: r.status, n: r.name, a: r.avatar, at: r.at };
  return out;
}
// [ { uid: {p, n, a, at} } ] in the order of `matches`
export async function votesByMatch(env, matches) {
  if (!matches.length) return [];
  const ids = matches.map((m) => String(m.id));
  const rows = await all(env, `SELECT * FROM votes WHERE match_id IN (${marks(ids.length)}) ORDER BY at`, ...ids);
  const out = ids.map(() => ({}));
  for (const r of rows) out[ids.indexOf(r.match_id)][r.user_id] = { p: r.player, n: r.name, a: r.avatar, at: r.at };
  return out;
}

export function voteView(m, doc, me) {
  const tally = {};
  for (const v of Object.values(doc)) tally[v.p] = (tally[v.p] || 0) + 1;
  return { id: m.id, opp: m.opp, gf: m.gf, ga: m.ga, res: m.res, ts: m.ts, players: m.ps || [], tally, mine: doc[me.u]?.p ?? null, total: Object.keys(doc).length };
}

// ---------- Rush results (P0.4): members log, managers confirm ----------
const rushOut = (r, ps) => ({
  id: r.id, date: r.date, opp: r.opponent, oppId: opt(r.opp_club_id), gf: r.gf, ga: r.ga, res: r.gf > r.ga ? 'W' : r.gf < r.ga ? 'L' : 'D',
  shot: opt(r.shot), note: opt(r.note), status: r.status, by: { id: r.by_id, n: r.by_name, a: r.by_avatar }, at: r.at,
  decidedBy: opt(r.decided_by), decidedAt: opt(r.decided_at),
  players: ps.map((x) => ({ k: x.player || undefined, n: x.name, pos: x.pos, g: x.goals, a: x.assists, r: x.rating ?? undefined, motm: !!x.motm })),
});
async function rushMatches(env, where, ...args) {
  const rows = await all(env, `SELECT * FROM rush_matches WHERE ${where} ORDER BY date DESC, id DESC LIMIT 500`, ...args);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const ps = await all(env, `SELECT * FROM rush_players WHERE match_id IN (${marks(ids.length)}) ORDER BY slot`, ...ids);
  const by = {};
  for (const x of ps) (by[x.match_id] ??= []).push(x);
  return rows.map((r) => rushOut(r, by[r.id] ?? []));
}
// Confirmed matches, cached as one KV document (read by the Matches, player and Stats pages).
async function getRushPublic(env) {
  const cached = env.NOREX_KV && (await env.NOREX_KV.get('rush', 'json'));
  return cached ?? rebuildRush(env);
}
async function rebuildRush(env) {
  const matches = (await rushMatches(env, "status = 'confirmed'")).map(({ status, by, at, decidedBy, decidedAt, ...m }) => m);
  const doc = { matches, updated: Date.now() };
  if (env.NOREX_KV) await env.NOREX_KV.put('rush', JSON.stringify(doc));
  return doc;
}
async function rushQueue(env, me) {
  const [mine, pending, recent] = await Promise.all([
    rushMatches(env, 'by_id = ? AND at > ?', me.u, Date.now() - 60 * DAY * 1000),
    can(me, 'rush.confirm') ? rushMatches(env, "status = 'pending'") : [],
    can(me, 'rush.confirm') ? rushMatches(env, "status != 'pending' AND decided_at > ?", Date.now() - 30 * DAY * 1000) : [],
  ]);
  return { mine, pending, recent, canConfirm: can(me, 'rush.confirm') };
}
const int = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

// Validates a submitted match → { m, ps } or { error }.
async function readRush(body, loadSite) {
  const today = new Date(Date.now() + 14 * 3600e3).toISOString().slice(0, 10); // allow any timezone's "today"
  const oldest = new Date(Date.now() - 365 * DAY * 1000).toISOString().slice(0, 10);
  const date = String(body.date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || date < oldest) return { error: 'Pick the date the match was played (within the last year).' };
  const opponent = clean(body.opponent, 60);
  if (opponent.length < 2) return { error: 'Enter the opponent club.' };
  const gf = int(body.gf, 0, 40), ga = int(body.ga, 0, 40);
  if (gf === null || ga === null) return { error: 'Enter the final score.' };
  let shot = clean(body.shot, 300);
  if (shot) { try { const u = new URL(shot); if (u.protocol !== 'https:') throw 0; shot = u.href; } catch { return { error: 'The screenshot link must start with https://' }; } }
  const [players, clubs] = await Promise.all([loadSite('players'), loadSite('clubs').catch(() => [])]);
  const squad = new Map(players.filter((x) => x.home).map((x) => [x.k, x]));
  const list = (Array.isArray(body.players) ? body.players : []).slice(0, 5);
  const ps = [];
  for (const x of list) {
    const pl = x?.k ? squad.get(String(x.k)) : null;
    if (x?.k && !pl) return { error: 'One of the players is not in the NOREX squad.' };
    const name = pl ? pl.n : clean(x?.n, 40);
    if (!name) continue;
    if (pl && ps.some((y) => y.player === pl.k)) return { error: `${pl.n} is listed twice.` };
    const goals = int(x.g ?? 0, 0, 40), assists = int(x.a ?? 0, 0, 40);
    if (goals === null || assists === null) return { error: `Check ${name}'s goals and assists.` };
    let rating = null;
    if (x.r !== undefined && x.r !== null && x.r !== '') {
      rating = Math.round(Number(x.r) * 10) / 10;
      if (!(rating >= 1 && rating <= 10)) return { error: `${name}'s rating must be between 1 and 10.` };
    }
    ps.push({ player: pl?.k ?? '', name, pos: RUSH_POS.includes(x.pos) ? x.pos : '', goals, assists, rating, motm: x.motm ? 1 : 0 });
  }
  if (!ps.length) return { error: 'Add at least one NOREX player.' };
  if (ps.filter((x) => x.motm).length > 1) return { error: 'Only one man of the match.' };
  if (ps.reduce((s, x) => s + x.goals, 0) > gf) return { error: `Player goals add up to more than our ${gf}.` };
  if (ps.reduce((s, x) => s + x.assists, 0) > gf) return { error: `Assists add up to more than our ${gf} goals.` };
  const club = clubs.find((c) => c.n.toLowerCase() === opponent.toLowerCase());
  return { m: { date, opponent: club?.n ?? opponent, oppId: club ? String(club.id) : null, gf, ga, shot: shot || null, note: clean(body.note, 200) || null }, ps };
}

// P7.4 /rush log – the Discord command goes through exactly the same checks as the Squad Hub form.
export const submitRush = (env, me, body, loadSite) => rushRoute('/api/rush', 'POST', body, me, env, loadSite);
async function rushRoute(p, method, body, me, env, loadSite) {
  if (p === '/api/rush/queue' && method === 'GET') return json(await rushQueue(env, me));

  if (p === '/api/rush' && method === 'POST') {
    if (!can(me, 'rush.submit')) return fail('Members only.', 403);
    const today = (await one(env, 'SELECT COUNT(*) AS n FROM rush_matches WHERE by_id = ? AND at > ?', me.u, Date.now() - DAY * 1000)).n;
    if (today >= RUSH_DAILY) return fail(`That's ${RUSH_DAILY} Rush results today – try again tomorrow.`, 429);
    const { m, ps, error } = await readRush(body, loadSite);
    if (error) return fail(error);
    const dupe = await one(env, "SELECT id FROM rush_matches WHERE date = ? AND lower(opponent) = lower(?) AND gf = ? AND ga = ? AND status IN ('pending', 'confirmed')", m.date, m.opponent, m.gf, m.ga);
    if (dupe && !body.force) return fail('This result is already logged (same day, opponent and score). Log it again only if it was a separate match.', 409);
    // Managers' own results count straight away unless they ask for a review.
    const confirm = can(me, 'rush.confirm') && body.review !== true;
    const at = Date.now();
    const r = await run(env, `INSERT INTO rush_matches (date, opponent, opp_club_id, gf, ga, shot, note, status, by_id, by_name, by_avatar, at, decided_by, decided_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, m.date, m.opponent, m.oppId, m.gf, m.ga, m.shot, m.note,
    confirm ? 'confirmed' : 'pending', me.u, me.n, me.a, at, confirm ? me.n : null, confirm ? at : null);
    const id = r.meta.last_row_id;
    await env.DB.batch(ps.map((x, i) => env.DB.prepare('INSERT INTO rush_players (match_id, slot, player, name, pos, goals, assists, rating, motm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, i, x.player, x.name, x.pos, x.goals, x.assists, x.rating, x.motm)));
    await log(env, me, confirm ? 'rush-logged' : 'rush-submit', `${m.gf}–${m.ga} vs ${m.opponent} · ${m.date}`);
    if (confirm) await rebuildRush(env);
    else await safely(notifyManagers(env, { icon: '⚡', title: `Rush result to confirm: ${m.gf}–${m.ga} vs ${m.opponent}`, body: `Logged by ${me.n} · ${m.date}`, link: 'members.html#manager' }, me.u));
    return json({ id, status: confirm ? 'confirmed' : 'pending', ...await rushQueue(env, me) });
  }

  if (p === '/api/rush/decide' && method === 'POST') {
    const r = await one(env, 'SELECT * FROM rush_matches WHERE id = ?', Number(body.id) || 0);
    if (!r) return fail('Rush result not found', 404);
    const label = `${r.gf}–${r.ga} vs ${r.opponent} · ${r.date}`;
    if (body.action === 'withdraw') { // the submitter takes back their own pending result
      if (r.by_id !== me.u || r.status !== 'pending') return fail('Only your own pending results can be withdrawn.', 403);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM rush_players WHERE match_id = ?').bind(r.id),
        env.DB.prepare('DELETE FROM rush_matches WHERE id = ?').bind(r.id),
      ]);
      await log(env, me, 'rush-withdraw', label);
      return json(await rushQueue(env, me));
    }
    if (!can(me, 'rush.confirm')) return fail('Managers only.', 403);
    const next = { confirm: 'confirmed', reject: 'rejected', remove: 'removed' }[body.action];
    if (!next) return fail('Unknown action');
    if (next === 'removed' ? r.status !== 'confirmed' : r.status !== 'pending' && !(r.status === 'rejected' && next === 'confirmed')) {
      return fail(`This result is already ${r.status}.`, 409);
    }
    await run(env, 'UPDATE rush_matches SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?', next, me.n, Date.now(), r.id);
    await log(env, me, `rush-${next}`, `${label}${r.by_id !== me.u ? ` (by ${r.by_name})` : ''}`);
    if (next === 'confirmed' || r.status === 'confirmed') await rebuildRush(env);
    if (r.by_id !== me.u) {
      const title = { confirmed: `✅ Rush result confirmed: ${r.gf}–${r.ga} vs ${r.opponent}`, rejected: `❌ Rush result not confirmed: ${r.gf}–${r.ga} vs ${r.opponent}`, removed: `🗑 Rush result removed: ${r.gf}–${r.ga} vs ${r.opponent}` }[next];
      await safely(notify(env, [r.by_id], { type: 'rush', title, body: `${r.date} · by ${me.n}`, link: 'members.html#rush' }));
    }
    return json(await rushQueue(env, me));
  }
  return fail('Not found', 404);
}

// ---------- public data (verified badges on player pages) ----------
// Cached as one KV document (read on every player page); rebuilt from D1 when a claim or claimed profile changes.
async function getPublic(env) {
  const cached = env.NOREX_KV && (await env.NOREX_KV.get('public', 'json'));
  return cached ?? rebuildPublic(env);
}
async function rebuildPublic(env) {
  const rows = await all(env, `SELECT c.user_id, c.player, c.name, c.avatar, p.bio, p.positions, p.platform, p.country FROM claims c
    LEFT JOIN profiles p ON p.user_id = c.user_id WHERE c.status = 'approved'`);
  const claims = Object.fromEntries(rows.map((r) => [r.player, {
    id: r.user_id, name: r.name, avatar: r.avatar, bio: opt(r.bio), positions: r.positions ? JSON.parse(r.positions) : undefined, platform: opt(r.platform),
    country: r.country || undefined,
  }]));
  const doc = { claims, updated: Date.now() };
  if (env.NOREX_KV) await env.NOREX_KV.put('public', JSON.stringify(doc));
  return doc;
}
