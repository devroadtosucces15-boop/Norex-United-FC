// Notification Center (owner only). Lets the owner change what selected notifications say, whether and how they go out, and when.
//   GET  /api/admin/notif             owner: every registered notification with its default wording and current settings
//   POST /api/admin/notif             owner: { key, enabled?, route?, locked?, title?, body?, timing? } save one; { key, reset: true } back to default
//   POST /api/admin/notif/test        owner: { key } sends that notification, with sample values, to the owner only
// Settings live in one JSON blob in D1 meta (`notif_center`), so no migration. A notification with no saved settings behaves exactly
// as before. notify() calls applyNotifConfig() for every call that names an `nkey`; the literal wording at the call site is the default.
import { can } from './roles.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const ROUTES = ['default', 'dm', 'site', 'off']; // dm = bell + Discord DM · site = bell only · off = not sent
const KEY = 'notif_center';

// Phase 1: events, reminders, awards. vars = the {placeholders} the wording may use. timing = numeric knobs the code reads.
export const REGISTRY = [
  { key: 'event.start30', group: 'Events', label: '“Starting soon” alert to everyone who said yes', title: 'Starting in {mins} minutes · {event}', body: 'You said you are in – get ready.', vars: ['mins', 'event'], timing: { mins: { label: 'Minutes before the session', def: 30, min: 5, max: 120 } } },
  { key: 'event.nudge', group: 'Events', label: '24h / 2h nudge to members who have not answered', title: '{head} – can you make it?', body: '{yes} said yes so far. Answer ✅ ❔ ❌ in the Squad Hub or on the Discord post.', vars: ['head', 'yes'] },
  { key: 'event.timechange', group: 'Events', label: 'Session time changed', title: 'Time changed: {event} – now {when}', body: '', vars: ['event', 'when'] },
  { key: 'event.cancelled', group: 'Events', label: 'Session cancelled', title: 'Cancelled: {event} – {when}', body: '{reason}', vars: ['event', 'when', 'reason'] },
  { key: 'award.won', group: 'Awards', label: 'You won a weekly award', title: 'You won {awards} – week {week}', body: '', vars: ['awards', 'week'] },
  { key: 'award.hotw', group: 'Awards', label: 'Your clip is Highlight of the week', title: 'Your clip is the Highlight of week {week}! 🏆', body: '{votes} from the squad.', vars: ['week', 'votes'] },
  { key: 'remind.waiting', group: 'Reminders', label: 'Feedback is waiting for a reaction', title: '{n} pieces of feedback are waiting for you', body: 'A teammate took the time to write it – open it and tap a reaction so they know it landed.', vars: ['n'],
    timing: { from: { label: 'Earliest hour to send (UTC)', def: 9, min: 0, max: 23 }, to: { label: 'Latest hour to send (UTC)', def: 21, min: 1, max: 24 } } },
  { key: 'remind.nudge', group: 'Reminders', label: 'After-match “send a teammate praise” nudge', title: 'Got a minute after the match?', body: 'Send a teammate praise or a tip – you can keep it anonymous. It makes the whole squad better.', vars: [] },
];
const BY_KEY = new Map(REGISTRY.map((r) => [r.key, r]));
const clean = (s, max) => String(s ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').trim().slice(0, max);

let cache = null; // { at, cfg } – a few seconds, so a burst of notifications reads D1 once
export async function getNotifConfig(env) {
  if (cache && Date.now() - cache.at < 15e3 && cache.env === env) return cache.cfg;
  let cfg = {}, ok = true;
  try {
    const row = await env.DB.prepare('SELECT value FROM meta WHERE key = ?').bind(KEY).first();
    const p = row?.value ? JSON.parse(row.value) : {};
    cfg = p && typeof p === 'object' ? p : {};
  } catch { cfg = {}; ok = false; }
  if (ok) cache = { at: Date.now(), cfg, env }; // a failed read is not remembered
  return cfg;
}

export const render = (tpl, vars = {}) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));

// A timing knob, clamped to the registry's range; the default when the owner has not set it.
export async function notifTiming(env, key, name) {
  const spec = BY_KEY.get(key)?.timing?.[name];
  if (!spec) return null;
  const v = Number((await getNotifConfig(env))[key]?.timing?.[name]);
  return Number.isFinite(v) ? Math.min(spec.max, Math.max(spec.min, Math.round(v))) : spec.def;
}

// Returns the notification to send, or null when the owner switched it off. Without saved settings n comes back unchanged.
export async function applyNotifConfig(env, n) {
  const c = (await getNotifConfig(env))[n.nkey];
  if (!c) return n;
  if (c.enabled === false || c.route === 'off') return null;
  const out = { ...n };
  if (c.title) out.title = render(c.title, n.vars);
  if (c.body != null && c.body !== '') out.body = render(c.body, n.vars);
  if (c.route === 'dm' || c.route === 'site') out.route = c.route;
  if (c.locked) out.locked = true;
  return out;
}

const view = (cfg) => REGISTRY.map((r) => ({ ...r, timing: r.timing, saved: cfg[r.key] ?? null }));
const sample = (r) => Object.fromEntries(r.vars.map((v) => [v, { mins: 30, event: 'Friday Pro Clubs night', head: 'Friday Pro Clubs night in 2 h', yes: '7', when: 'Fri 20:00', reason: 'Not enough players', awards: '⭐ MOTM', week: '42', votes: '5 votes', n: '2' }[v] ?? 'sample']));

export async function notifCenterRoute(p, method, body, me, env, log, notify) {
  if (!p.startsWith('/api/admin/notif')) return null;
  if (!can(me, 'settings.bot')) return fail('Owner only.', 403);
  if (p === '/api/admin/notif' && method === 'GET') return json({ items: view(await getNotifConfig(env)), routes: ROUTES });
  if (method !== 'POST') return fail('Not found', 404);
  const r = BY_KEY.get(String(body?.key));
  if (!r) return fail('Unknown notification.');
  if (p === '/api/admin/notif/test') {
    // Only ever the owner: the recipient is the signed-in user, never taken from the request.
    const cfg = (await getNotifConfig(env))[r.key];
    const vars = sample(r);
    const out = await notify(env, [me.u], { type: 'test', icon: '🔔', title: `[Test] ${render(cfg?.title || r.title, vars)}`.slice(0, 140), body: render(cfg?.body || r.body, vars) || null, link: 'members.html#alerts' });
    return json({ ok: true, sentTo: 'you', sent: out });
  }
  if (p !== '/api/admin/notif') return fail('Not found', 404);
  const cur = { ...(await getNotifConfig(env)) };
  if (body.reset) delete cur[r.key];
  else {
    const prev = cur[r.key] ?? {}, next = { ...prev };
    if ('enabled' in body) next.enabled = !!body.enabled;
    if ('route' in body) { if (!ROUTES.includes(body.route)) return fail('Bad route.'); next.route = body.route === 'default' ? undefined : body.route; }
    if ('locked' in body) next.locked = !!body.locked;
    if ('title' in body) {
      next.title = clean(body.title, 140) || undefined;
      // Identical titles within 15 minutes are treated as a repeat, so a title must keep one of the default's placeholders.
      const need = [...r.title.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (next.title && need.length && !need.some((v) => next.title.includes(`{${v}}`))) return fail(`Keep at least one of ${need.map((v) => `{${v}}`).join(' ')} in the title so different ones are not mistaken for repeats.`);
    }
    if ('body' in body) next.body = clean(body.body, 1500) || undefined;
    if (body.timing && typeof body.timing === 'object' && r.timing) {
      next.timing = { ...(prev.timing ?? {}) };
      for (const [k, spec] of Object.entries(r.timing)) if (k in body.timing) {
        const v = Math.round(Number(body.timing[k]));
        if (!Number.isFinite(v) || v < spec.min || v > spec.max) return fail(`${spec.label}: ${spec.min}–${spec.max}.`);
        next.timing[k] = v;
      }
    }
    const w = next.timing;
    if (r.key === 'remind.waiting' && w && (w.from ?? 9) >= (w.to ?? 21)) return fail('The earliest hour must be before the latest hour.');
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    if (Object.keys(next).length) cur[r.key] = next; else delete cur[r.key];
  }
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(KEY, JSON.stringify(cur)).run();
  cache = null;
  await log?.(env, me, 'notif-center', `${body.reset ? 'Reset' : 'Updated'} ${r.key}`);
  return json({ items: view(cur), routes: ROUTES });
}
