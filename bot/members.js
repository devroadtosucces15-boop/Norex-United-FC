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
import { ROLE_LABEL, atLeast, can, discordRole, featuresFor, flagOn, flags, permsFor, sessionRole } from './roles.js';

const enc = new TextEncoder();
const DAY = 86400;
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
const PLATFORMS = ['PS5', 'Xbox', 'PC'];
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
  h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
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

const userOut = (r) => ({ n: r.name, a: r.avatar, tag: r.tag, admin: !!r.admin, role: r.role, first: r.first_at, last: r.last_at, logins: r.logins });
const profileOut = (r) => r && { bio: r.bio, positions: JSON.parse(r.positions || '[]'), platform: r.platform, updated: r.updated };
const claimOut = (r, history = []) => ({
  player: r.player, playerName: r.player_name, status: r.status, at: r.at, n: r.name, a: r.avatar,
  decidedBy: opt(r.decided_by), decidedAt: opt(r.decided_at), history,
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
  return Object.fromEntries(rows.map((r) => [r.user_id, claimOut(r, (byUser[r.user_id] ?? []).slice(-20))]));
}

async function log(env, me, type, detail) {
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
    if (url.pathname === '/auth/callback') return callback(url, env);
    if (url.pathname === '/api/public') return cors(env, json(await getPublic(env)));
    if (url.pathname === '/api/rush' && request.method === 'GET') return cors(env, json(await getRushPublic(env)));
    const me = await unseal(env, (request.headers.get('Authorization') || '').replace(/^Bearer /, ''));
    if (url.pathname === '/api/live' && request.method === 'GET') { // P1.3 – public once the flag is 'public'
      if (me) me.role = await currentRole(env, me);
      if (!flagOn(env, me, 'liveBanner')) return cors(env, fail('Not available yet.', 404));
      return cors(env, json(await getLive(env)));
    }
    if (!me) return cors(env, fail('Please log in again.', 401));
    me.role = await currentRole(env, me);
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    return cors(env, await route(url.pathname, request.method, body, me, env, loadSite));
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
    client_id: env.DISCORD_APP_ID, response_type: 'code', scope: 'identify guilds.members.read',
    redirect_uri: `${url.origin}/auth/callback`, state, prompt: 'none',
  });
  return Response.redirect(`https://discord.com/oauth2/authorize?${q}`, 302);
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
  await run(env, `INSERT INTO users (id, name, avatar, tag, admin, role, first_at, last_at, logins) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT (id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, tag = excluded.tag, admin = excluded.admin,
      role = excluded.role, last_at = excluded.last_at, logins = users.logins + 1`, user.id, name, avatar, user.username, admin ? 1 : 0, role, now, now);
  const me = { u: user.id, n: name, a: avatar };
  await log(env, me, 'login', admin ? `as ${role}` : '');
  const session = await seal(env, { ...me, role, adm: admin, exp: Math.floor(Date.now() / 1000) + (admin ? 7 : 30) * DAY });
  return back(`norex_session=${session}`);
}

// Role from the session (Discord roles at login) + `claimed` if the member's claim is approved right now.
async function currentRole(env, me) {
  const role = sessionRole(env, me);
  if (role !== 'member') return role;
  return (await one(env, 'SELECT status FROM claims WHERE user_id = ?', me.u))?.status === 'approved' ? 'claimed' : role;
}

// ---------- API ----------
async function route(p, method, body, me, env, loadSite) {
  if (!can(me, 'hub.use')) return fail('Members only.', 403);
  if (p === '/api/me' && method === 'GET') {
    const [claim, profile] = await Promise.all([getClaim(env, me.u), one(env, 'SELECT * FROM profiles WHERE user_id = ?', me.u)]);
    const user = { id: me.u, name: me.n, avatar: me.a, admin: can(me, 'portal.view'), role: me.role, roleLabel: ROLE_LABEL[me.role], perms: permsFor(me.role), features: featuresFor(env, me) };
    return json({ user, claim, profile: profileOut(profile) ?? null });
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
      await run(env, `INSERT INTO claims (user_id, player, player_name, status, at, name, avatar, decided_by, decided_at) VALUES (?, ?, ?, 'pending', ?, ?, ?, NULL, NULL)
        ON CONFLICT (user_id) DO UPDATE SET player = excluded.player, player_name = excluded.player_name, status = 'pending', at = excluded.at,
          name = excluded.name, avatar = excluded.avatar, decided_by = NULL, decided_at = NULL`, me.u, pl.k, pl.n, Date.now(), me.n, me.a);
    }
    await log(env, me, 'claim', pl.n);
    return json({ claim: await getClaim(env, me.u) });
  }

  if (p === '/api/profile' && method === 'POST') {
    if (!can(me, 'profile.edit')) return fail('Members only.', 403);
    const profile = {
      bio: clean(body.bio, 280),
      positions: (Array.isArray(body.positions) ? body.positions : []).filter((x) => POSITIONS.includes(x)).slice(0, 3),
      platform: PLATFORMS.includes(body.platform) ? body.platform : '',
      updated: Date.now(),
    };
    await run(env, `INSERT INTO profiles (user_id, bio, positions, platform, updated) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET bio = excluded.bio, positions = excluded.positions, platform = excluded.platform, updated = excluded.updated`,
    me.u, profile.bio, JSON.stringify(profile.positions), profile.platform, profile.updated);
    await log(env, me, 'profile', [profile.positions.join('/'), profile.platform].filter(Boolean).join(' · '));
    if ((await one(env, 'SELECT status FROM claims WHERE user_id = ?', me.u))?.status === 'approved') await rebuildPublic(env);
    return json({ profile });
  }

  if (p === '/api/availability') {
    const dates = days7();
    if (method === 'POST') {
      if (!can(me, 'availability.set')) return fail('Members only.', 403);
      const pick = (Array.isArray(body.dates) ? body.dates : [body.date]).filter((d) => dates.includes(d));
      const status = body.status;
      if (!pick.length || !(STATUSES.includes(status) || status === 'clear')) return fail('Bad availability');
      const old = new Date(Date.now() - 10 * DAY * 1000).toISOString().slice(0, 10);
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
      }
    }
    const docs = await votesByMatch(env, recent);
    return json({ matches: recent.map((m, i) => voteView(m, docs[i], me)) });
  }

  if (p.startsWith('/api/rush')) {
    if (!flagOn(env, me, 'rushLog')) return fail('Not available yet.', 404);
    return rushRoute(p, method, body, me, env, loadSite);
  }

  if (p.startsWith('/api/admin/')) {
    if (!can(me, 'portal.view')) return fail('Managers only.', 403);
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
        ...(can(me, 'settings.bot') ? { flags: flags(env) } : {}),
      });
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
async function votesByMatch(env, matches) {
  if (!matches.length) return [];
  const ids = matches.map((m) => String(m.id));
  const rows = await all(env, `SELECT * FROM votes WHERE match_id IN (${marks(ids.length)}) ORDER BY at`, ...ids);
  const out = ids.map(() => ({}));
  for (const r of rows) out[ids.indexOf(r.match_id)][r.user_id] = { p: r.player, n: r.name, a: r.avatar, at: r.at };
  return out;
}

function voteView(m, doc, me) {
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
  const rows = await all(env, `SELECT c.player, c.name, c.avatar, p.bio, p.positions, p.platform FROM claims c
    LEFT JOIN profiles p ON p.user_id = c.user_id WHERE c.status = 'approved'`);
  const claims = Object.fromEntries(rows.map((r) => [r.player, {
    name: r.name, avatar: r.avatar, bio: opt(r.bio), positions: r.positions ? JSON.parse(r.positions) : undefined, platform: opt(r.platform),
  }]));
  const doc = { claims, updated: Date.now() };
  if (env.NOREX_KV) await env.NOREX_KV.put('public', JSON.stringify(doc));
  return doc;
}
