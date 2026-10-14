// Who someone looks like in a Discord message (bot design system rule: "faces everywhere").
// One order, everywhere a person appears – sign-ups, profiles, logs, votes, awards:
//   1. their Card Studio card, once it's approved and shipped (status 'done' and published) – theirs, or one made for the
//      player they've claimed
//   2. their Discord picture (from a site login, or the member snapshot the leave/join check keeps)
//   3. Discord's default picture for their account
// Cards live in R2 and are served by this Worker at /media/<key>, so the Worker's own address is needed: PUBLIC_URL
// (wrangler.toml), or the origin of the request being answered.
const marks = (n) => Array(n).fill('?').join(',');
export const defaultAvatar = (id) => `https://cdn.discordapp.com/embed/avatars/${/^\d+$/.test(String(id)) ? Number((BigInt(id) >> 22n) % 6n) : 0}.png`;
const mediaBase = (env, origin) => String(env.PUBLIC_URL || origin || '').replace(/\/?$/, '');

// userIds → Map(id → picture URL). Three queries however many people there are.
export async function facesOf(env, userIds, { origin } = {}) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))].slice(0, 100);
  const out = new Map(ids.map((id) => [id, defaultAvatar(id)]));
  if (!ids.length || !env.DB) return out;
  const q = (sql) => env.DB.prepare(sql).bind(...ids).all().then((r) => r.results ?? []).catch(() => []);
  const [members, users, cards] = await Promise.all([
    q(`SELECT user_id AS id, avatar FROM guild_members WHERE user_id IN (${marks(ids.length)})`),
    q(`SELECT id, avatar FROM users WHERE id IN (${marks(ids.length)})`),
    // newest shipped card per person: made for them, or for the player they've claimed
    q(`SELECT COALESCE(c.user_id, r.user_id) AS id, r.result_key AS k, r.created_at AS at FROM card_requests r
       LEFT JOIN claims c ON c.player = r.target_player AND c.status = 'approved'
       WHERE r.status = 'done' AND r.published = 1 AND r.result_key IS NOT NULL AND COALESCE(c.user_id, r.user_id) IN (${marks(ids.length)})
       ORDER BY r.created_at DESC`),
  ]);
  for (const r of members) if (r.avatar) out.set(String(r.id), r.avatar);
  for (const r of users) if (r.avatar) out.set(String(r.id), r.avatar);
  const base = mediaBase(env, origin), carded = new Set();
  if (base) for (const r of cards) if (!carded.has(String(r.id))) { carded.add(String(r.id)); out.set(String(r.id), `${base}/media/${r.k}`); }
  return out;
}
export const faceOf = async (env, userId, o) => (await facesOf(env, [userId], o)).get(String(userId));

// A player (EA id from the site) → the face of the member who claimed them, or null if nobody has.
export async function playerFaces(env, playerKeys, o) {
  const keys = [...new Set(playerKeys.filter(Boolean).map(String))];
  if (!keys.length || !env.DB) return new Map();
  const claims = await env.DB.prepare(`SELECT player, user_id FROM claims WHERE status = 'approved' AND player IN (${marks(keys.length)})`).bind(...keys).all().then((r) => r.results ?? []).catch(() => []);
  const faces = await facesOf(env, claims.map((c) => c.user_id), o);
  return new Map(claims.map((c) => [String(c.player), faces.get(String(c.user_id))]));
}
