// Rush squad builder (roadmap P3.5). The generator itself (web/squadgen.js) runs in the manager's browser – a Worker request
// has too little CPU for the search – and is imported here to re-score whatever gets saved, so chemistry can't be faked.
//   GET  /api/squads            members: my preferences (if unlocked), who can be picked, the latest published squads;
//                               managers also: everyone's preferences, drafts, upcoming Rush events with their ✅ lists
//   POST /api/squads/prefs      unlocked members (approved claim + Rush positions): { ids } – up to 10 teammates, best first
//   POST /api/squads/save       managers: { id?, title, event?, squads: [{ ids, locked }], bench, publish?, channel?, role? }
//   POST /api/squads/delete     managers: { id }
import '../web/squadgen.js';
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';
import { postEmbed } from './docs.js';

const G = globalThis.NXSquadGen;
const MAX_PREFS = 10, SIZE = 5;
const RED = 0xc8352c;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const parse = (s, fb) => { try { return JSON.parse(s) ?? fb; } catch { return fb; } };
const opt = (v) => v ?? undefined;

// Who can be in a Rush squad: an approved player claim + Rush positions on the profile.
async function candidates(env) {
  const rows = await all(env, `SELECT u.id, u.name, u.avatar, c.player, c.player_name, p.rush_positions FROM users u
    JOIN claims c ON c.user_id = u.id AND c.status = 'approved' JOIN profiles p ON p.user_id = u.id ORDER BY u.name`);
  return rows.map((r) => ({ id: r.id, n: r.name, a: opt(r.avatar), player: r.player, playerName: r.player_name, pos: parse(r.rush_positions, []) })).filter((c) => c.pos.length);
}
async function allPrefs(env) { return Object.fromEntries((await all(env, 'SELECT user_id, ranks FROM rush_prefs')).map((r) => [r.user_id, parse(r.ranks, [])])); }
const setOut = (r) => r && { id: r.id, title: r.title, event: opt(r.event_id), status: r.status, by: opt(r.by_name), at: r.at, publishedAt: opt(r.published_at), ...parse(r.data, { squads: [], bench: [] }) };

async function state(env, me) {
  const [cands, mine, published] = await Promise.all([candidates(env), one(env, 'SELECT ranks FROM rush_prefs WHERE user_id = ?', me.u), one(env, "SELECT * FROM rush_squads WHERE status = 'published' ORDER BY published_at DESC LIMIT 1")]);
  const self = cands.find((c) => c.id === me.u);
  const claim = self ? null : await one(env, "SELECT 1 FROM claims WHERE user_id = ? AND status = 'approved'", me.u);
  const manager = can(me, 'squads.manage');
  const out = {
    me: { unlocked: !!self, reason: self ? undefined : claim ? 'positions' : 'claim', prefs: parse(mine?.ranks, []) },
    candidates: cands, published: setOut(published), canManage: manager,
  };
  if (manager) {
    const events = await all(env, "SELECT id, title, start FROM events WHERE type = 'rush' AND status = 'scheduled' AND start + duration * 60000 > ? ORDER BY start LIMIT 10", Date.now());
    const yes = events.length ? await all(env, `SELECT event_id, user_id FROM event_rsvps WHERE status = 'yes' AND event_id IN (${events.map(() => '?').join(',')})`, ...events.map((e) => e.id)) : [];
    Object.assign(out, {
      prefsAll: await allPrefs(env),
      drafts: (await all(env, "SELECT * FROM rush_squads WHERE status = 'draft' ORDER BY at DESC LIMIT 5")).map(setOut),
      events: events.map((e) => ({ id: e.id, title: e.title ?? 'Rush session', start: e.start, yes: yes.filter((y) => y.event_id === e.id).map((y) => y.user_id) })),
    });
  }
  return out;
}

async function save(body, me, env, log) {
  const cands = new Map((await candidates(env)).map((c) => [c.id, c]));
  const prefs = await allPrefs(env);
  const seen = new Set();
  const take = (ids) => {
    const list = (Array.isArray(ids) ? ids : []).map(String);
    for (const id of list) { if (!cands.has(id)) throw new Error('Someone in the squads can’t play Rush squads (needs a verified player + Rush positions).'); if (seen.has(id)) throw new Error('A player is in two places.'); seen.add(id); }
    return list;
  };
  let squads, bench;
  try {
    squads = (Array.isArray(body.squads) ? body.squads : []).slice(0, 12).map((s) => ({ ids: take(s.ids), locked: !!s.locked }));
    bench = take(body.bench);
  } catch (e) { return fail(e.message); }
  if (!squads.length || squads.some((s) => !s.ids.length || s.ids.length > SIZE)) return fail(`Each squad needs 1–${SIZE} players.`);
  const data = { squads: squads.map((s) => { const sc = G.squadScore(s.ids.map((id) => cands.get(id)), prefs); return { ids: s.ids, roles: sc.roles, chemistry: sc.chemistry, missing: sc.missing, pairs: sc.pairs, locked: s.locked }; }), bench };
  const title = clean(body.title, 60) || `Rush squads · ${new Date().toISOString().slice(0, 10)}`;
  const event = body.event ? Number(body.event) || null : null;
  const publish = !!body.publish;
  let id = Number(body.id) || 0;
  if (id && !(await one(env, 'SELECT 1 FROM rush_squads WHERE id = ?', id))) return fail('Those squads no longer exist.', 404);
  if (id) await run(env, `UPDATE rush_squads SET title = ?, event_id = ?, data = ?, by_name = ?, at = ?${publish ? ", status = 'published', published_at = ?" : ''} WHERE id = ?`, title, event, JSON.stringify(data), me.n, Date.now(), ...(publish ? [Date.now()] : []), id);
  else id = (await run(env, 'INSERT INTO rush_squads (title, event_id, data, status, by_name, at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)', title, event, JSON.stringify(data), publish ? 'published' : 'draft', me.n, Date.now(), publish ? Date.now() : null)).meta.last_row_id;
  await log(env, me, publish ? 'squads-publish' : 'squads-save', `${title} · ${data.squads.length} squads`);
  const out = { id };
  if (publish) {
    let told = 0;
    for (const [i, s] of data.squads.entries()) for (const uid of s.ids) {
      const mates = s.ids.filter((x) => x !== uid).map((x) => cands.get(x).n).join(', ');
      told += (await safely(notify(env, [uid], { type: 'event', icon: '🤝', title: `Rush: you’re in Squad ${i + 1} as ${s.roles[uid] === 'FLEX' ? 'flex' : s.roles[uid]}`, body: `With ${mates} · chemistry ${s.chemistry}/100 – ${title}`, link: 'members.html#squads' }))) ?? 0;
    }
    out.notified = told;
    if (body.channel && can(me, 'announce.discord')) {
      const site = String(env.SITE_URL || '').replace(/\/?$/, '/');
      out.discord = await postEmbed(env, body.channel, body.role, { embeds: [{
        title: `🤝 ${title}`.slice(0, 250), url: `${site}members.html#squads`, color: RED,
        fields: data.squads.map((s, i) => ({ name: `Squad ${i + 1} · chemistry ${s.chemistry}/100`, value: s.ids.map((x) => `\`${String(s.roles[x] === 'FLEX' ? 'FLX' : s.roles[x]).padEnd(3)}\` ${cands.get(x).n}`).join('\n'), inline: true })).slice(0, 24),
        footer: { text: `${data.bench.length ? `Bench: ${data.bench.map((x) => cands.get(x).n).join(', ')} · ` : ''}NOREX UNITED · Rush squads` },
      }] });
    }
  }
  return json({ ...out, ...(await state(env, me)) });
}

export async function squadsRoute(p, method, body, me, env, log) {
  if (p !== '/api/squads' && !p.startsWith('/api/squads/')) return null;
  if (!flagOn(env, me, 'rushSquads')) return fail('Not available yet.', 404);
  if (!can(me, 'events.view')) return fail('Members only.', 403);
  if (p === '/api/squads' && method === 'GET') return json(await state(env, me));
  if (method !== 'POST') return fail('Not found', 404);
  if (p === '/api/squads/prefs') {
    if (!can(me, 'lineup.unlock')) return fail('Claim your player first – Rush squads are for verified players.', 403);
    const cands = new Map((await candidates(env)).map((c) => [c.id, c]));
    if (!cands.has(me.u)) return fail('Set your Rush positions (1st–3rd) in My profile first.', 409);
    const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))];
    if (ids.length > MAX_PREFS) return fail(`Pick up to ${MAX_PREFS} teammates.`);
    if (ids.includes(me.u)) return fail('You’re in your own squad already 😉');
    if (ids.some((id) => !cands.has(id))) return fail('Pick teammates from the list.');
    await run(env, 'INSERT INTO rush_prefs (user_id, ranks, updated) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET ranks = excluded.ranks, updated = excluded.updated', me.u, JSON.stringify(ids), Date.now());
    await log(env, me, 'squads-prefs', `${ids.length} teammates`);
    return json(await state(env, me));
  }
  if (!can(me, 'squads.manage')) return fail('Managers only.', 403);
  if (p === '/api/squads/save') return save(body, me, env, log);
  if (p === '/api/squads/delete') {
    await run(env, 'DELETE FROM rush_squads WHERE id = ?', Number(body.id) || 0);
    await log(env, me, 'squads-delete', String(body.id));
    return json(await state(env, me));
  }
  return fail('Not found', 404);
}
