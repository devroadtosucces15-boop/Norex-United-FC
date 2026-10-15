// Gentle reminders (feedback E3) – a nudge to pick a Rush squad, rate teammates and vote for Man of the match.
// Runs from the 10-minute cron behind the owner flag `reminders`. Built not to nag:
//   · each kind is sent at most once per match / event / week (meta key `remind:<kind>:<ref>`)
//   · a member gets at most one reminder per day, whatever the kind
//   · only between 09:00 and 21:00 UTC, only to members seen in the last 45 days
//   · type `remind` defaults to "site" (a banner + the bell); a member who sets it to "DM + site" also gets the pop-up
// Pop-ups ride on the existing Web Push opt-in (Hub › Alerts) through notify().
import { flagOn } from './roles.js';
import { notify } from './notify.js';
import { weekOf, } from './awards.js';
import { motmClosed } from './locker.js';

const HOUR = 3600e3, DAY = 24 * HOUR;
const ACTIVE = 45 * DAY;
const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results ?? []);
const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
const marks = (n) => Array(n).fill('?').join(',');
const claim = async (env, key, now) => { // true the first time only
  const r = await env.DB.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING").bind(key, String(now)).run();
  return (r.meta?.changes ?? 1) > 0;
};

// Members who may get a reminder right now: flag on for their role, active lately, none sent in the last 20 hours.
async function eligible(env, now) {
  const rows = await all(env, `SELECT u.id, u.role FROM users u WHERE u.last_at > ?
    AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.type = 'remind' AND n.at > ?)`, now - ACTIVE, now - 20 * HOUR);
  return new Map(rows.filter((r) => flagOn(env, { role: r.role }, 'reminders')).map((r) => [String(r.id), r]));
}
const send = (env, ids, n) => (ids.length ? notify(env, ids, { type: 'remind', ...n }) : 0);

export async function remindersCron(env, loadSite, now = Date.now()) {
  const out = { motm: 0, rate: 0, squad: 0 };
  if (!env.DB || !flagOn(env, { role: 'owner' }, 'reminders')) return out;
  const hour = new Date(now).getUTCHours();
  if (hour < 9 || hour >= 21) return out;
  let pool = await eligible(env, now);
  if (!pool.size) return out;
  const take = (ids) => { const got = ids.filter((id) => pool.has(String(id))); got.forEach((id) => pool.delete(String(id))); return got; }; // one reminder per member per run

  // 1) Man of the match – the latest match, 2–48 hours after the whistle, to members who have not voted (the vote closes after 72 h).
  const m = ((await loadSite('club').catch(() => null))?.matches || [])[0];
  const age = m ? now - (Number(m.ts) || 0) * 1000 : -1;
  if (m?.ts && age >= 2 * HOUR && age <= 48 * HOUR && !motmClosed(m, now) && await claim(env, `remind:motm:${m.id}`, now)) {
    const voted = new Set((await all(env, 'SELECT user_id FROM votes WHERE match_id = ?', String(m.id))).map((r) => String(r.user_id)));
    const to = take([...pool.keys()].filter((id) => !voted.has(id)));
    out.motm = await send(env, to, { icon: '⭐', title: `Man of the match vs ${String(m.opp ?? 'the opposition').slice(0, 40)}`, body: 'Voting takes ten seconds and closes in a day or two.', link: 'hub-matchnight.html#mn-motm', ref: `remind:motm:${m.id}` });
  }

  // 2) Rate your teammates – once a week, Sunday afternoon, to members who have not rated anyone this week.
  const week = weekOf(now);
  if (new Date(now).getUTCDay() === 0 && hour >= 12 && pool.size && await claim(env, `remind:rate:${week.key}`, now)) {
    const rated = new Set((await all(env, 'SELECT DISTINCT user_id FROM star_ratings WHERE week = ?', week.key)).map((r) => String(r.user_id)));
    const to = take([...pool.keys()].filter((id) => !rated.has(id)));
    out.rate = await send(env, to, { icon: '✨', title: 'Rate your teammates this week', body: 'Stars close when the week ends – a minute is all it takes.', link: 'hub-matchnight.html#mn-rate', ref: `remind:rate:${week.key}` });
  }

  // 3) Pick your squad – a Rush session in the next 3–26 hours: players who said yes but have not ranked teammates for the squad builder.
  if (pool.size) {
    const ev = await one(env, "SELECT id, title, start FROM events WHERE status = 'scheduled' AND type = 'rush' AND start BETWEEN ? AND ? ORDER BY start LIMIT 1", now + 3 * HOUR, now + 26 * HOUR);
    if (ev && await claim(env, `remind:squad:${ev.id}`, now)) {
      const yes = (await all(env, "SELECT user_id FROM event_rsvps WHERE event_id = ? AND status = 'yes'", ev.id)).map((r) => String(r.user_id));
      const have = new Set((await all(env, `SELECT user_id FROM rush_prefs WHERE user_id IN (${marks(yes.length || 1)})`, ...(yes.length ? yes : ['-']))).map((r) => String(r.user_id)));
      const to = take(yes.filter((id) => !have.has(id)));
      out.squad = await send(env, to, { icon: '🧩', title: 'Pick who you want in your squad', body: `${String(ev.title || 'Rush session').slice(0, 60)} is coming up – rank your teammates so the squads come out right.`, link: 'hub-squad.html', ref: `remind:squad:${ev.id}` });
    }
  }
  return out;
}
