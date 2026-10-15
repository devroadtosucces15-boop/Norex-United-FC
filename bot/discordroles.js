// P2.5 Discord role sync. An approved player claim gives the member the **Verified** role in the NOREX server
// (plus an optional position role: GK / DEF / MID / FWD); unlink or reject takes them away again.
//
// The Verified role is found by name ("Verified", any emoji around it) or created once by the bot; its ID is kept in
// D1 meta `verified_role`. Position roles are only used when they already exist in the server (never created).
// Needs DISCORD_BOT_TOKEN, the bot's **Manage Roles** permission and the bot's own role above those roles.
// The last result is kept in meta `rolesync` so a failure (missing permission) can be explained by /syncroles.

const API = 'https://discord.com/api/v10';
export const POSITION_ROLES = ['GK', 'DEF', 'MID', 'FWD'];
const GROUP = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF', DEF: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', MID: 'MID', LW: 'FWD', RW: 'FWD', CF: 'FWD', ST: 'FWD', FWD: 'FWD' };
export const positionGroup = (pos) => GROUP[String(pos || '').toUpperCase()] ?? null;
// "✅ Verified", "verified", "Verified ✔" → "verified"
const bare = (name) => String(name || '').toLowerCase().replace(/[^a-z]/g, '');

async function discord(env, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json', 'X-Audit-Log-Reason': 'NOREX player claim (site)' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.ok || res.status === 204) return res.status === 204 ? null : res.json().catch(() => null);
  const err = await res.json().catch(() => ({}));
  const e = new Error(err.code === 50013 ? 'missing-permission' : err.code === 10007 ? 'not-in-server' : `discord-${res.status}`);
  e.status = res.status;
  throw e;
}

const meta = (env, key) => env.DB.prepare('SELECT value FROM meta WHERE key = ?').bind(key).first('value');
const setMeta = (env, key, value) => env.DB.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind(key, value).run();

// Server roles once per sync run: { verified: id, positions: { GK: id, … } }.
async function resolveRoles(env) {
  const g = env.DISCORD_GUILD_ID;
  const roles = (await discord(env, 'GET', `/guilds/${g}/roles`)) ?? [];
  const byName = new Map(roles.map((r) => [bare(r.name), r.id]));
  let verified = env.VERIFIED_ROLE_ID || (await meta(env, 'verified_role'));
  if (!verified || !roles.some((r) => r.id === verified)) {
    verified = byName.get('verified');
    if (!verified) verified = (await discord(env, 'POST', `/guilds/${g}/roles`, { name: '✅ Verified', color: 0x22c55e, hoist: false, mentionable: false, permissions: '0' }))?.id;
    if (verified) await setMeta(env, 'verified_role', verified);
  }
  const positions = Object.fromEntries(POSITION_ROLES.map((p) => [p, byName.get(bare(p))]).filter(([, id]) => id));
  return { verified, positions };
}

async function record(env, ok, detail) {
  await setMeta(env, 'rolesync', JSON.stringify({ ok, detail, at: Date.now() })).catch(() => {});
}

// Give or take the roles for one member. approved = claim status is 'approved'; pos = the claimed player's position.
// Reads the member's current roles first and only changes what differs (1–3 Discord calls per member).
// Returns { ok, calls, error? } – never throws, so a claim decision always goes through even if Discord says no.
export async function syncMember(env, userId, approved, pos, roles) {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return { ok: false, calls: 0, error: 'no-token' };
  let calls = 0;
  const call = (...a) => (calls++, discord(env, ...a));
  try {
    if (!roles) { roles = await resolveRoles(env); calls += 1; }
    if (!roles.verified) throw new Error('no-role');
    const g = env.DISCORD_GUILD_ID;
    const has = new Set((await call('GET', `/guilds/${g}/members/${userId}`))?.roles ?? []);
    const grp = approved ? positionGroup(pos) : null;
    const want = new Set(approved ? [roles.verified, roles.positions[grp]].filter(Boolean) : []);
    // Only roles this feature manages: Verified always, position roles when the claim ends or a position is known.
    const managed = [roles.verified, ...(approved && !grp ? [] : Object.values(roles.positions))];
    for (const id of managed) {
      if (want.has(id) && !has.has(id)) await call('PUT', `/guilds/${g}/members/${userId}/roles/${id}`);
      else if (!want.has(id) && has.has(id)) await call('DELETE', `/guilds/${g}/members/${userId}/roles/${id}`);
    }
    await record(env, true, approved ? 'added' : 'removed');
    return { ok: true, calls };
  } catch (e) {
    if (e.message === 'not-in-server') return { ok: false, calls, error: e.message }; // left the server – nothing to fix
    console.log('role sync failed', e.message);
    await record(env, false, e.message);
    return { ok: false, calls, error: e.message };
  }
}

// Everyone with a decided claim: approved → roles on, rejected / unlinked → roles off. For /syncroles.
// Free Workers get 50 Discord/web calls per request, so it stops at ~40 and says how many are left.
export async function syncAll(env, loadSite) {
  const out = { ok: false, added: 0, removed: 0, failed: 0, left: 0, error: null };
  if (!env.DISCORD_BOT_TOKEN) return { ...out, error: 'no-token' };
  let roles;
  try { roles = await resolveRoles(env); } catch (e) { await record(env, false, e.message); return { ...out, error: e.message }; }
  const players = await loadSite('players').catch(() => []);
  const posOf = (k) => players.find((p) => p.k === k)?.pos;
  const rows = (await env.DB.prepare("SELECT user_id, player, status FROM claims WHERE status IN ('approved', 'rejected', 'unlinked') ORDER BY status = 'approved' DESC, decided_at DESC").all()).results;
  let budget = 42;
  for (const [n, r] of rows.entries()) {
    if (budget < 6) { out.left = rows.length - n; break; }
    const res = await syncMember(env, r.user_id, r.status === 'approved', posOf(r.player), roles);
    budget -= res.calls;
    if (res.ok) out[r.status === 'approved' ? 'added' : 'removed']++;
    else if (res.error !== 'not-in-server') { out.failed++; out.error = res.error; if (res.error === 'missing-permission') break; }
  }
  out.ok = !out.failed;
  out.positions = Object.keys(roles.positions);
  return out;
}

export const ROLE_HELP = {
  'missing-permission': "The bot isn't allowed to give that role. In Discord: **Server Settings → Roles** → drag the **bot's role above ✅ Verified** (and GK/DEF/MID/FWD), and make sure the bot's role has **Manage Roles** switched on.",
  'no-token': 'The bot token is not set up on the Worker yet (GitHub secret DISCORD_BOT_TOKEN).',
  'no-role': 'Could not find or create the ✅ Verified role.',
};
