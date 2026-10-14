// /host – a League or Rush session, or a friendly, scheduled and posted in one command (managers). It reuses the Squad
// Hub's own event save (events.js) – same checks, bell notifications, reminders, live sign-up post with ✅ ❔ ❌ buttons
// and faces – so a /host event is exactly a Hub event. The time is read in the host's own time zone and shown to
// everyone else in theirs (Discord timestamps).
//   when: "tonight 9pm", "tomorrow 20:30", "fri 8:30pm", "oct 14 9pm", "2026-10-14 21:00", "in 2h"
import { validZone, zonedToUtc, eventsRoute } from './events.js';
import { parseDuration, getToolSettings } from './servertools.js';
import { reply, notice } from './ui.js';

// Time-zone suggestions for the autocomplete (any valid IANA zone is accepted when typed in full).
export const ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
  'America/Toronto', 'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago', 'America/Caracas', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
  'America/Puerto_Rico', 'Europe/London', 'Europe/Dublin', 'Europe/Lisbon', 'Europe/Madrid', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Rome',
  'Europe/Stockholm', 'Europe/Athens', 'Europe/Istanbul', 'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata',
  'Asia/Manila', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'UTC'];
export const zoneChoices = (q) => {
  const s = String(q ?? '').toLowerCase().replace(/\s+/g, '_');
  return ZONES.filter((z) => z.toLowerCase().includes(s)).slice(0, 25).map((z) => ({ name: z.replace(/_/g, ' '), value: z }));
};

const DAY = 864e5;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n) => String(n).padStart(2, '0');
// Wall-clock date/time/weekday of an instant in a zone.
function local(ms, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'long', hourCycle: 'h23' })
    .formatToParts(ms).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, wd: WEEKDAYS.indexOf(p.weekday.toLowerCase()) };
}
const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const HELP = 'Try `tonight 9pm`, `tomorrow 20:30`, `fri 8:30pm`, `oct 14 9pm` or `in 2h`.';

// "fri 8:30pm" in `tz` → { date: 'YYYY-MM-DD', time: 'HH:MM' } (wall clock in tz), or { error }.
export function parseWhen(input, tz, now = Date.now()) {
  let s = String(input ?? '').toLowerCase().replace(/[,@]/g, ' ').replace(/\bat\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return { error: `When does it start? ${HELP}` };
  const rel = s.match(/^in (.+)$/);
  if (rel) {
    const ms = parseDuration(rel[1]);
    if (!ms) return { error: `I couldn’t read “${input}”. ${HELP}` };
    const at = local(now + ms, tz);
    return { date: at.date, time: at.time };
  }
  const today = local(now, tz);
  // the time: 9pm · 9:30pm · 21:00 · 21.00 · noon / midnight
  let time = null;
  s = s.replace(/\b(noon|midday|midnight)\b/, (w) => { time = w === 'midnight' ? '00:00' : '12:00'; return ' '; })
    .replace(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a|p)\b|\b(\d{1,2})[:.](\d{2})\b/, (_, h1, m1, ap, h2, m2) => {
      let h = Number(h1 ?? h2), m = Number(m1 ?? m2 ?? 0);
      if (ap) { if (h < 1 || h > 12) return _; h = (h % 12) + (ap[0] === 'p' ? 12 : 0); }
      if (h > 23 || m > 59) return _;
      time = `${pad(h)}:${pad(m)}`;
      return ' ';
    }).trim();
  if (!time && /\btonight\b/.test(s)) { // "tonight 9" → 21:00
    s = s.replace(/\b(\d{1,2})\b/, (_, h) => { if (+h >= 1 && +h <= 11) time = `${pad(+h + 12)}:00`; return ' '; }).trim();
  }
  if (!time) return { error: `What time? ${HELP}` };
  // the day
  let date = null, flexible = false;
  const words = s.replace(/\b(next|this|on)\b/g, ' ').replace(/\s+/g, ' ').trim();
  let m;
  if (!words || /^(today|tonight|tdy)$/.test(words)) { date = today.date; flexible = !words; }
  else if (/^(tomorrow|tmr|tmrw|tom)$/.test(words)) date = addDays(today.date, 1);
  else if ((m = words.match(/^(\d{4})-(\d{2})-(\d{2})$/))) date = words;
  else if ((m = words.match(/^([a-z]{3})[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?$/) ?? words.match(/^(\d{1,2})(?:st|nd|rd|th)? ([a-z]{3})[a-z]*\.?$/))) {
    const [mon, d] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
    const mi = MONTHS.indexOf(mon);
    if (mi < 0 || +d < 1 || +d > 31) return { error: `I couldn’t read the date in “${input}”. ${HELP}` };
    let y = Number(today.date.slice(0, 4));
    if (`${y}-${pad(mi + 1)}-${pad(+d)}` < today.date) y++; // "jan 3" in December means next year
    date = `${y}-${pad(mi + 1)}-${pad(+d)}`;
  } else {
    const wd = WEEKDAYS.findIndex((w) => words === w || words === w.slice(0, 3) || (words.length >= 3 && w.startsWith(words)));
    if (wd < 0) return { error: `I couldn’t read the day in “${input}”. ${HELP}` };
    date = addDays(today.date, (wd - today.wd + 7) % 7);
    flexible = true; // "fri" on a Friday after the time has passed → next Friday
  }
  if (isNaN(Date.parse(`${date}T00:00:00Z`))) return { error: `That date doesn’t exist. ${HELP}` };
  if (zonedToUtc(date, time, tz) <= now) {
    if (flexible) date = addDays(date, words && !/^(today|tonight|tdy)$/.test(words) ? 7 : 1);
    else return { error: 'That time has already passed – pick a time in the future.' };
  }
  return { date, time };
}

const TYPES = { 'league:session': ['league', null], 'rush:session': ['rush', null], 'league:friendly': ['friendly', 'League friendly'], 'rush:friendly': ['friendly', 'Rush friendly'] };
export function hostBody(o, tz, when) {
  const [type, title] = TYPES[`${o.mode}:${o.kind}`] ?? TYPES['league:session'];
  const rush = o.mode === 'rush';
  return {
    type, title: title && (o.opponent ? `${title} vs ${String(o.opponent).trim()}` : title),
    date: when.date, time: when.time, tz,
    duration: o.length ?? (rush ? 90 : 120),
    needs: { players: o.players ?? (rush ? 5 : 11) },
    notes: o.notes ?? '', notify: true, repeat: o.weekly ? 3 : 0,
  };
}

// Called from botcmds.js with the member (`me`) already resolved. Returns the interaction response.
export async function hostCommand(i, env, me, o, { log, loadSite }) {
  const say = (title, body, accent) => reply(notice(title, body, accent ? { accent } : {}));
  const prof = await env.DB.prepare('SELECT tz FROM profiles WHERE user_id = ?').bind(me.u).first().catch(() => null);
  const tz = String(o.timezone || prof?.tz || '').trim();
  if (!tz) return say('Which time zone are you in?', 'Add `timezone:` (start typing your city), or set it once in your Squad Hub profile and I’ll remember it.');
  if (!validZone(tz)) return say(`I don’t know the time zone “${tz}”`, 'Start typing a city in `timezone:` and pick one from the list.');
  const when = parseWhen(o.when, tz);
  if (when.error) return say('I couldn’t read that time', when.error);
  const body = hostBody(o, tz, when);
  if (!o.silent) {
    const pings = (await getToolSettings(env)).pingRoles ?? {};
    const role = o.ping ?? (o.mode === 'rush' ? pings.rush : pings.match);
    body.discord = { channel: o.channel || i.channel_id, role: role || '' };
  } else body.discord = { channel: o.channel || i.channel_id, role: '' };
  const res = await eventsRoute('/api/events', 'POST', body, me, env, log, loadSite, new URL('https://bot.invalid/'));
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return say('Couldn’t schedule that', d.error ?? 'Something went wrong – try again or use the Squad Hub.');
  const at = Math.floor(zonedToUtc(when.date, when.time, tz) / 1000);
  const where = d.discord?.ok ? `Posted in <#${body.discord.channel}> with sign-up buttons.` : `⚠️ Not posted: ${d.discord?.error ?? 'you can post it from the Squad Hub.'}`;
  return say(`✅ Scheduled for <t:${at}:F>`, [`<t:${at}:R> · everyone sees it in their own time zone (you set it in ${tz.replace(/_/g, ' ')}).`, where,
    d.created > 1 ? `Repeats weekly: ${d.created} dates.` : null, d.notified ? `${d.notified} members told in the Squad Hub.` : null].filter(Boolean).join('\n'), 'win');
}
