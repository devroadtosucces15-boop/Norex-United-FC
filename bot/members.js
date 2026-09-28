// Member area: "Log in with Discord" for people in the NOREX Discord server, plus a small API
// the static site calls for member features. Data lives in Cloudflare KV (free tier).
//
// Env: DISCORD_APP_ID, DISCORD_CLIENT_SECRET (secret), DISCORD_GUILD_ID, ADMIN_IDS (comma list),
//      MEMBER_ROLE_ID (optional – require a role, not just server membership), SITE_URL, NOREX_KV (KV binding)

const enc = new TextEncoder();
const DAY = 86400;
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
const PLATFORMS = ['PS5', 'Xbox', 'PC'];

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
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);

export async function handleMembers(request, env, ctx, loadSite) {
  const url = new URL(request.url);
  if (!env.DISCORD_CLIENT_SECRET || !env.DISCORD_GUILD_ID || !env.NOREX_KV) {
    return cors(env, fail('Member login is not set up yet.', 503));
  }
  if (request.method === 'OPTIONS') return cors(env, new Response(null, { status: 204 }));

  if (url.pathname === '/auth/login') return login(url, env);
  if (url.pathname === '/auth/callback') return callback(url, env);

  try {
    if (url.pathname === '/api/public') return cors(env, json(await publicData(env)));
    const me = await unseal(env, (request.headers.get('Authorization') || '').replace(/^Bearer /, ''));
    if (!me) return cors(env, fail('Please log in again.', 401));
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    const res = await route(url, request.method, body, me, env, ctx, loadSite);
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
  const admin = String(env.ADMIN_IDS || '').split(',').map((s) => s.trim()).includes(user.id);
  await env.NOREX_KV.put(`user:${user.id}`, JSON.stringify({ n: name, a: avatar }));
  const session = await seal(env, { u: user.id, n: name, a: avatar, adm: admin, exp: Math.floor(Date.now() / 1000) + 30 * DAY });
  return back(`norex_session=${session}`);
}

// ---------- API ----------
async function route(url, method, body, me, env, ctx, loadSite) {
  const KV = env.NOREX_KV;
  const p = url.pathname;

  if (p === '/api/me' && method === 'GET') {
    const [claim, profile] = await Promise.all([KV.get(`claim:${me.u}`, 'json'), KV.get(`profile:${me.u}`, 'json')]);
    return json({ user: { id: me.u, name: me.n, avatar: me.a, admin: !!me.adm }, claim, profile });
  }

  if (p === '/api/claim' && method === 'POST') {
    const players = await loadSite('players');
    const pl = players.find((x) => x.k === body.player && x.home);
    if (!pl) return fail('Pick a player from the NOREX squad.');
    const owner = await KV.get(`owner:${pl.k}`);
    if (owner && owner !== me.u) return fail('That player has already been claimed. Ask an admin if this is wrong.', 409);
    const claim = { player: pl.k, playerName: pl.n, status: owner === me.u ? 'approved' : 'pending', at: Date.now() };
    await KV.put(`claim:${me.u}`, JSON.stringify(claim), { metadata: { ...claim, n: me.n, a: me.a } });
    return json({ claim });
  }

  if (p === '/api/profile' && method === 'POST') {
    const profile = {
      bio: clean(body.bio, 280),
      positions: (Array.isArray(body.positions) ? body.positions : []).filter((x) => POSITIONS.includes(x)).slice(0, 3),
      platform: PLATFORMS.includes(body.platform) ? body.platform : '',
    };
    await KV.put(`profile:${me.u}`, JSON.stringify(profile));
    ctx.waitUntil(rebuildPublic(env));
    return json({ profile });
  }

  if (p === '/api/availability') {
    if (method === 'POST') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !['yes', 'maybe', 'no', 'clear'].includes(body.status)) return fail('Bad availability');
      const key = `avail:${body.date}:${me.u}`;
      if (body.status === 'clear') await KV.delete(key);
      else await KV.put(key, body.status, { expirationTtl: 10 * DAY, metadata: { s: body.status, n: me.n, a: me.a } });
    }
    const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * DAY * 1000).toISOString().slice(0, 10));
    const lists = await Promise.all(days.map((d) => KV.list({ prefix: `avail:${d}:` })));
    return json({ days: days.map((d, i) => ({ date: d, people: lists[i].keys.map((k) => ({ id: k.name.split(':')[2], ...k.metadata })) })) });
  }

  if (p === '/api/vote') {
    const club = await loadSite('club');
    const recent = club.matches.slice(0, 3);
    if (method === 'POST') {
      const m = recent.find((x) => x.id === body.match);
      if (!m) return fail('Voting is only open for the latest matches.');
      if (!(m.ps || []).some((x) => x.k === body.player)) return fail('Pick someone who played in that match.');
      await KV.put(`vote:${m.id}:${me.u}`, body.player, { expirationTtl: 60 * DAY, metadata: { p: body.player } });
    }
    const out = [];
    for (const m of recent) {
      const { keys } = await KV.list({ prefix: `vote:${m.id}:` });
      const tally = {};
      let mine = null;
      for (const k of keys) {
        tally[k.metadata.p] = (tally[k.metadata.p] || 0) + 1;
        if (k.name.endsWith(`:${me.u}`)) mine = k.metadata.p;
      }
      out.push({ id: m.id, opp: m.opp, gf: m.gf, ga: m.ga, res: m.res, ts: m.ts, players: m.ps || [], tally, mine, total: keys.length });
    }
    return json({ matches: out });
  }

  if (p === '/api/admin/claims') {
    if (!me.adm) return fail('Admins only.', 403);
    if (method === 'POST') {
      const claim = await KV.get(`claim:${body.user}`, 'json');
      if (!claim) return fail('Claim not found', 404);
      const user = (await KV.get(`user:${body.user}`, 'json')) || {};
      if (body.action === 'approve') {
        const prev = await KV.get(`owner:${claim.player}`);
        if (prev && prev !== body.user) return fail('Someone else already owns that player – reject theirs first.', 409);
        const { keys } = await KV.list({ prefix: 'owner:' });
        for (const k of keys) if ((await KV.get(k.name)) === body.user && k.name !== `owner:${claim.player}`) await KV.delete(k.name);
        await KV.put(`owner:${claim.player}`, body.user);
        claim.status = 'approved';
      } else {
        if ((await KV.get(`owner:${claim.player}`)) === body.user) await KV.delete(`owner:${claim.player}`);
        claim.status = 'rejected';
      }
      await KV.put(`claim:${body.user}`, JSON.stringify(claim), { metadata: { ...claim, n: user.n, a: user.a } });
      await rebuildPublic(env);
    }
    const { keys } = await KV.list({ prefix: 'claim:' });
    return json({ claims: keys.map((k) => ({ user: k.name.slice(6), ...k.metadata })).sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1)) });
  }

  return fail('Not found', 404);
}

// ---------- public data (verified badges on player pages) ----------
async function publicData(env) {
  return (await env.NOREX_KV.get('public', 'json')) || (await rebuildPublic(env));
}
async function rebuildPublic(env) {
  const KV = env.NOREX_KV;
  const { keys } = await KV.list({ prefix: 'owner:' });
  const claims = {};
  for (const k of keys) {
    const uid = await KV.get(k.name);
    const [user, profile] = await Promise.all([KV.get(`user:${uid}`, 'json'), KV.get(`profile:${uid}`, 'json')]);
    claims[k.name.slice(6)] = { name: user?.n, avatar: user?.a, ...(profile || {}) };
  }
  const data = { claims, updated: Date.now() };
  await KV.put('public', JSON.stringify(data));
  return data;
}
