// Gentle reminders (feedback E3). Only two, both about praise & feedback (bot/feedback.js):
//   1. feedback you received and have not reacted to – after 24 h, then at most every 3 days while it stays unanswered
//   2. an occasional "the feature exists, use it for the good of the squad" nudge – at most every 14 days, after a match
// Event reminders (30 min before, to everyone who said yes) live in bot/events.js.
// Runs from the 10-minute cron behind the owner flag `reminders`. Not nagging: one reminder per member per 20 h, 09:00–21:00 UTC,
// members seen in the last 45 days. Type `remind` defaults to site + Discord DM (+ Web Push for DM-tier members).
import { flagOn } from './roles.js';
import { notify } from './notify.js';
import { notifTiming } from './notifcenter.js';

const HOUR = 3600e3, DAY = 24 * HOUR;
const ACTIVE = 45 * DAY;
const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results ?? []);
const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();

// Members who may get a reminder right now: flag on for their role, active lately, none sent in the last 20 hours.
async function eligible(env, now) {
  const rows = await all(env, `SELECT u.id, u.role FROM users u WHERE u.last_at > ?
    AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.type = 'remind' AND n.at > ?)`, now - ACTIVE, now - 20 * HOUR);
  return new Map(rows.filter((r) => flagOn(env, { role: r.role }, 'reminders')).map((r) => [String(r.id), r]));
}
const send = (env, ids, n) => (ids.length ? notify(env, ids, { type: 'remind', ...n }) : 0);

export async function remindersCron(env, loadSite, now = Date.now()) {
  const out = { waiting: 0, nudge: 0 };
  if (!env.DB || !flagOn(env, { role: 'owner' }, 'reminders')) return out;
  const hour = new Date(now).getUTCHours();
  if (hour < await notifTiming(env, 'remind.waiting', 'from') || hour >= await notifTiming(env, 'remind.waiting', 'to')) return out; // sending window, owner-set (default 09–21 UTC)
  const pool = await eligible(env, now);
  if (!pool.size) return out;

  // 1) feedback waiting for a reaction
  const rows = await all(env, `SELECT to_id, COUNT(*) AS n FROM feedback WHERE hidden = 0 AND reaction IS NULL AND at < ? AND at > ? GROUP BY to_id`, now - DAY, now - 14 * DAY);
  const waiting = rows.filter((r) => pool.has(String(r.to_id)));
  if (waiting.length) {
    const recent = new Set((await all(env, "SELECT user_id FROM notifications WHERE type = 'remind' AND ref = 'remind:waiting' AND at > ?", now - 3 * DAY)).map((r) => String(r.user_id)));
    for (const r of waiting.filter((w) => !recent.has(String(w.to_id)))) {
      pool.delete(String(r.to_id));
      out.waiting += await send(env, [r.to_id], { nkey: 'remind.waiting', vars: { n: r.n }, icon: '💌', title: r.n > 1 ? `${r.n} pieces of feedback are waiting for you` : 'Feedback is waiting for you', body: 'A teammate took the time to write it – open it and tap a reaction so they know it landed.', link: 'members.html#feedback', ref: 'remind:waiting' });
    }
  }

  // 2) the occasional "this exists" nudge, once per fortnight, in the day or two after a match
  const m = ((await loadSite('club').catch(() => null))?.matches || [])[0];
  const age = m?.ts ? now - Number(m.ts) * 1000 : -1;
  if (pool.size && age >= 2 * HOUR && age <= 48 * HOUR) {
    const last = Number((await one(env, "SELECT value FROM meta WHERE key = 'remind:feedback-nudge'"))?.value ?? 0);
    if (now - last >= 14 * DAY) {
      await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('remind:feedback-nudge', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(String(now)).run();
      const players = new Set((await all(env, "SELECT user_id FROM claims WHERE status = 'approved'")).map((r) => String(r.user_id)));
      out.nudge = await send(env, [...pool.keys()].filter((id) => players.has(id)), { nkey: 'remind.nudge', icon: '👏', title: 'Got a minute after the match?', body: 'Send a teammate praise or a tip – you can keep it anonymous. It makes the whole squad better.', link: 'members.html#feedback', ref: 'remind:nudge' });
    }
  }
  return out;
}
