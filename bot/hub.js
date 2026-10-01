// Hub (roadmap BE8, board 10) – a shared clubhouse space. The front end (board 10's 3D room, players'-tunnel
// entrance) is next-session scoping work; this is the backend it'll call.
//   GET  /api/hub              members: site-wide "online now" count (reuses P6.4 presence) + can-wave
//   POST /api/hub/wave { to }  members: 👋 another member – delivered live if they're in the Hub room
//                              right now (bot/hubroom.js), else queued as a bell/DM notification (BE0's
//                              JOBS queue when bound, else written inline – same fallback shape as BE9)
// Live "who's in the Hub right now" is the HUB_ROOM Durable Object itself (bot/hubroom.js) – the client
// talks to it directly over the WebSocket upgrade wired in members.js, same pattern as P6.3b chat rooms.
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';
import { onlineCount } from './social.js';

const WAVES_PER_DAY = 20;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();

// A member's HUB_ROOM socket(s), if any – delivers the wave live and tells the caller whether it landed.
async function liveWave(env, to, from) {
  if (!env.HUB_ROOM) return false;
  try {
    const room = env.HUB_ROOM.get(env.HUB_ROOM.idFromName('hub'));
    const res = await room.fetch('https://room/wave', { method: 'POST', body: JSON.stringify({ to, from }) });
    return !!(await res.json()).delivered;
  } catch (e) { console.log('hub wave push failed', e.message); return false; }
}

// Queued as a bell/DM so a wave still reaches someone who isn't in the Hub right now.
export async function handleHubWaveJob(env, to, from) {
  await safely(notify(env, [to], { type: 'wave', title: `${from.n} waved at you 👋`, link: 'hub.html' }));
}

// WebSocket upgrade – called from members.js with the session already unsealed from `?t=` (browsers can't
// send headers on a socket), same shape as P6.3b's chatSocket. One shared room for the whole club.
export async function hubSocket(request, env, me) {
  if (request.headers.get('Upgrade') !== 'websocket') return fail('Expected a WebSocket.', 426);
  if (!env.HUB_ROOM) return fail('The Hub is not set up yet.', 503);
  if (!me || !flagOn(env, me, 'hub') || !can(me, 'hubroom.view')) return fail('Not available yet.', 404);
  const q = new URLSearchParams({ u: me.u, n: me.n || 'Member', a: me.a || '' });
  const room = env.HUB_ROOM.get(env.HUB_ROOM.idFromName('hub'));
  return room.fetch(new Request(`https://room/ws?${q}`, { headers: request.headers }));
}

export async function hubRoute(p, method, body, me, env, log) {
  if (p !== '/api/hub' && p !== '/api/hub/wave') return null;
  if (!flagOn(env, me, 'hub')) return fail('Not available yet.', 404);
  if (!can(me, 'hubroom.view')) return fail('Members only.', 403);

  if (p === '/api/hub' && method === 'GET') return json({ online: await onlineCount(env), canWave: can(me, 'hubroom.wave') });

  if (p === '/api/hub/wave' && method === 'POST') {
    if (!can(me, 'hubroom.wave')) return fail('Members only.', 403);
    const to = String(body?.to ?? '').trim();
    if (!to || to === me.u) return fail('Pick a teammate to wave at.', 400);
    const target = await one(env, 'SELECT id, name FROM users WHERE id = ?', to);
    if (!target) return fail('That member was not found.', 404);
    const sent = (await one(env, 'SELECT COUNT(*) AS n FROM activity WHERE user_id = ? AND type = ? AND at > ?', me.u, 'hub-wave', Date.now() - 86400e3))?.n ?? 0;
    if (sent >= WAVES_PER_DAY) return fail(`That's enough waving for today – try again tomorrow.`, 429);
    const from = { id: me.u, n: me.n };
    const delivered = await liveWave(env, to, from);
    if (!delivered) {
      if (env.JOBS) { try { await env.JOBS.send({ type: 'hubWave', to, from }); } catch (e) { console.log('hub: queue send failed, waving inline', e.message); await handleHubWaveJob(env, to, from); } }
      else await handleHubWaveJob(env, to, from);
    }
    await log(env, me, 'hub-wave', target.name);
    return json({ delivered });
  }
  return fail('Not found.', 404);
}
