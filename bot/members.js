// Member area: "Log in with Discord" for people in the NOREX Discord server, plus a small API
// the static site calls for member features. Data lives in Cloudflare KV (free tier).
//
// Env: DISCORD_APP_ID, DISCORD_CLIENT_SECRET (secret), DISCORD_GUILD_ID, ADMIN_IDS (comma list),
//      ADMIN_ROLE_ID (managers' role – gets the admin portal), MEMBER_ROLE_ID (optional – require a role, not just
//      server membership), SITE_URL, NOREX_KV (KV binding)
//
// KV lists are only eventually consistent, so everything that must update instantly is stored as a single
// document read by key: `users`, `claims`, `activity`, `avail:<date>`, `votes:<matchId>`, `profile:<uid>`.

const enc = new TextEncoder();
const DAY = 86400;
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
const PLATFORMS = ['PS5', 'Xbox', 'PC'];
const STATUSES = ['yes', 'maybe', 'no'];

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

// ---------- tiny document store ----------
const get = async (env, key, fallback) => (await env.NOREX_KV.get(key, 'json')) ?? fallback;
const put = (env, key, val, opts) => env.NOREX_KV.put(key, JSON.stringify(val), opts).then(() => val);
// One-time move of claims saved by the first version (one key per claim) into the `claims` document.
async function getClaims(env) {
  const doc = await env.NOREX_KV.get('claims', 'json');
  if (doc) return doc;
  const out = {};
  const { keys } = await env.NOREX_KV.list({ prefix: 'claim:' });
  for (const k of keys) {
    const c = await env.NOREX_KV.get(k.name, 'json');
    if (c) out[k.name.slice(6)] = { ...c, n: k.metadata?.n, a: k.metadata?.a, history: [] };
  }
  return put(env, 'claims', out);
}

async function log(env, me, type, detail) {
  const a = await get(env, 'activity', []);
  a.unshift({ at: Date.now(), u: me.u, n: me.n, a: me.a, type, detail });
  await put(env, 'activity', a.slice(0, 400));
}

export async function handleMembers(request, env, ctx, loadSite) {
  const url = new URL(request.url);
  if (!env.DISCORD_CLIENT_SECRET || !env.DISCORD_GUILD_ID || !env.NOREX_KV) {
    return cors(env, fail('Member login is not set up yet.', 503));
  }
  if (request.method === 'OPTIONS') return cors(env, new Response(null, { status: 204 }));

  if (url.pathname === '/auth/login') return login(url, env);
  if (url.pathname === '/auth/callback') return callback(url, env);

  try {
    if (url.pathname === '/api/public') return cors(env, json(await get(env, 'public', { claims: {} })));
    const me = await unseal(env, (request.headers.get('Authorization') || '').replace(/^Bearer /, ''));
    if (!me) return cors(env, fail('Please log in again.', 401));
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
  const admin = String(env.ADMIN_IDS || '').split(',').map((s) => s.trim()).includes(user.id)
    || (!!env.ADMIN_ROLE_ID && !!member.roles?.includes(env.ADMIN_ROLE_ID));

  const users = await get(env, 'users', {});
  const prev = users[user.id] || {};
  users[user.id] = { n: name, a: avatar, tag: user.username, admin, first: prev.first || Date.now(), last: Date.now(), logins: (prev.logins || 0) + 1 };
  await put(env, 'users', users);
  const me = { u: user.id, n: name, a: avatar };
  await log(env, me, 'login', admin ? 'as manager' : '');
  const session = await seal(env, { ...me, adm: admin, exp: Math.floor(Date.now() / 1000) + (admin ? 7 : 30) * DAY });
  return back(`norex_session=${session}`);
}

// ---------- API ----------
async function route(p, method, body, me, env, loadSite) {
  if (p === '/api/me' && method === 'GET') {
    const [claims, profile] = await Promise.all([getClaims(env), get(env, `profile:${me.u}`, null)]);
    return json({ user: { id: me.u, name: me.n, avatar: me.a, admin: !!me.adm }, claim: claims[me.u] ?? null, profile });
  }

  if (p === '/api/claim' && method === 'POST') {
    const claims = await getClaims(env);
    if (body.cancel) {
      if (claims[me.u]?.status === 'pending') {
        delete claims[me.u];
        await put(env, 'claims', claims);
        await log(env, me, 'claim-cancel', '');
      }
      return json({ claim: null });
    }
    const players = await loadSite('players');
    const pl = players.find((x) => x.k === body.player && x.home);
    if (!pl) return fail('Pick a player from the NOREX squad.');
    const owner = Object.entries(claims).find(([uid, c]) => c.player === pl.k && c.status === 'approved' && uid !== me.u);
    if (owner) return fail('That player has already been claimed. Ask a manager if this is wrong.', 409);
    const mine = claims[me.u];
    claims[me.u] = mine?.status === 'approved' && mine.player === pl.k ? mine
      : { player: pl.k, playerName: pl.n, status: 'pending', at: Date.now(), n: me.n, a: me.a, history: mine?.history ?? [] };
    await put(env, 'claims', claims);
    await log(env, me, 'claim', pl.n);
    return json({ claim: claims[me.u] });
  }

  if (p === '/api/profile' && method === 'POST') {
    const profile = {
      bio: clean(body.bio, 280),
      positions: (Array.isArray(body.positions) ? body.positions : []).filter((x) => POSITIONS.includes(x)).slice(0, 3),
      platform: PLATFORMS.includes(body.platform) ? body.platform : '',
      updated: Date.now(),
    };
    await put(env, `profile:${me.u}`, profile);
    await log(env, me, 'profile', [profile.positions.join('/'), profile.platform].filter(Boolean).join(' · '));
    const claims = await getClaims(env);
    if (claims[me.u]?.status === 'approved') await rebuildPublic(env, claims);
    return json({ profile });
  }

  if (p === '/api/availability') {
    const dates = days7();
    const docs = await Promise.all(dates.map((d) => get(env, `avail:${d}`, {})));
    if (method === 'POST') {
      const pick = (Array.isArray(body.dates) ? body.dates : [body.date]).filter((d) => dates.includes(d));
      const status = body.status;
      if (!pick.length || !(STATUSES.includes(status) || status === 'clear')) return fail('Bad availability');
      for (const d of pick) {
        const i = dates.indexOf(d);
        if (status === 'clear') delete docs[i][me.u];
        else docs[i][me.u] = { s: status, n: me.n, a: me.a, at: Date.now() };
        await put(env, `avail:${d}`, docs[i], { expirationTtl: 10 * DAY });
      }
      await log(env, me, 'availability', `${status === 'clear' ? 'cleared' : status} · ${pick.map((d) => d.slice(5)).join(', ')}`);
    }
    return json({ days: dates.map((d, i) => ({ date: d, people: Object.entries(docs[i]).map(([id, v]) => ({ id, ...v })) })) });
  }

  if (p === '/api/vote') {
    const club = await loadSite('club');
    const recent = club.matches.slice(0, 3);
    const docs = await Promise.all(recent.map((m) => get(env, `votes:${m.id}`, {})));
    if (method === 'POST') {
      const i = recent.findIndex((x) => x.id === body.match);
      if (i < 0) return fail('Voting is only open for the latest matches.');
      const m = recent[i];
      if (body.player === null || docs[i][me.u]?.p === body.player) {
        delete docs[i][me.u];
        await log(env, me, 'vote-remove', `vs ${m.opp}`);
      } else {
        const pl = (m.ps || []).find((x) => x.k === body.player);
        if (!pl) return fail('Pick someone who played in that match.');
        docs[i][me.u] = { p: pl.k, n: me.n, a: me.a, at: Date.now() };
        await log(env, me, 'vote', `${pl.n} · vs ${m.opp}`);
      }
      await put(env, `votes:${m.id}`, docs[i], { expirationTtl: 90 * DAY });
    }
    return json({ matches: recent.map((m, i) => voteView(m, docs[i], me)) });
  }

  if (p.startsWith('/api/admin/')) {
    if (!me.adm) return fail('Managers only.', 403);
    if (p === '/api/admin/claims' && method === 'POST') {
      const claims = await getClaims(env);
      const c = claims[body.user];
      if (!c) return fail('Claim not found', 404);
      if (body.action === 'approve') {
        const other = Object.entries(claims).find(([uid, x]) => uid !== body.user && x.player === c.player && x.status === 'approved');
        if (other) return fail(`${other[1].n} already owns ${c.playerName} – unlink them first.`, 409);
        c.status = 'approved';
      } else if (body.action === 'reject' || body.action === 'unlink') {
        c.status = body.action === 'unlink' ? 'unlinked' : 'rejected';
      } else return fail('Unknown action');
      c.decidedBy = me.n;
      c.decidedAt = Date.now();
      c.history = [...(c.history ?? []), { action: c.status, player: c.playerName, by: me.n, at: c.decidedAt }].slice(-20);
      await put(env, 'claims', claims);
      await log(env, me, `claim-${c.status}`, `${c.n} → ${c.playerName}`);
      await rebuildPublic(env, claims);
      return json({ claims });
    }
    if (p === '/api/admin/overview' && method === 'GET') {
      const [users, claims, activity] = await Promise.all([get(env, 'users', {}), getClaims(env), get(env, 'activity', [])]);
      const ids = Object.keys(users);
      const profiles = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await get(env, `profile:${id}`, null)])));
      const dates = days7();
      const avail = await Promise.all(dates.map((d) => get(env, `avail:${d}`, {})));
      const club = await loadSite('club');
      const recent = club.matches.slice(0, 3);
      const votes = await Promise.all(recent.map((m) => get(env, `votes:${m.id}`, {})));
      return json({
        users, claims, profiles, activity: activity.slice(0, 200),
        availability: dates.map((d, i) => ({ date: d, byUser: avail[i] })),
        votes: recent.map((m, i) => ({ id: m.id, opp: m.opp, gf: m.gf, ga: m.ga, res: m.res, voters: Object.entries(votes[i]).map(([id, v]) => ({ id, ...v, pn: (m.ps || []).find((x) => x.k === v.p)?.n })) })),
      });
    }
  }

  return fail('Not found', 404);
}

function voteView(m, doc, me) {
  const tally = {};
  for (const v of Object.values(doc)) tally[v.p] = (tally[v.p] || 0) + 1;
  return { id: m.id, opp: m.opp, gf: m.gf, ga: m.ga, res: m.res, ts: m.ts, players: m.ps || [], tally, mine: doc[me.u]?.p ?? null, total: Object.keys(doc).length };
}

// ---------- public data (verified badges on player pages) ----------
async function rebuildPublic(env, claims) {
  const out = {};
  for (const [uid, c] of Object.entries(claims)) {
    if (c.status !== 'approved') continue;
    const profile = await get(env, `profile:${uid}`, {});
    out[c.player] = { name: c.n, avatar: c.a, bio: profile.bio, positions: profile.positions, platform: profile.platform };
  }
  return put(env, 'public', { claims: out, updated: Date.now() });
}
