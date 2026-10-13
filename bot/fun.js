// Fun for members – small things that make the server feel like a club. Everything is a slash command or a button on the
// message it posted, all in the design system (bot/ui.js), behind the `fun` feature flag (owner first).
//   /jail @member [reason] [minutes]   lock a mate up for a daft offence – mugshot-style panel, "Post bail", "Rap sheet"
//   /wheel options:"Jez, Kruger, Davey" [question]   spin a wheel – "Spin again", "Remove <winner> and spin"
// Jail counts feed the member profile (GET /api/member → fun.jail, see bot/members.js).
import { can, flagOn } from './roles.js';
import { message, notice, reply, header, text, facts, footer, sep, buttons } from './ui.js';

export const FUN_COMMANDS = new Set(['jail', 'wheel']);
export const FUN_BUTTON = /^norex:fun:/;
const MIN = 60e3, DAY = 864e5;
const JAIL_PER_DAY = 5; // sentences one member can hand out per day
const MAX_WHEEL = 12, MIN_WHEEL = 2;
export const CHARGES = [
  'ball-hogging in the 89th minute and refusing to pass to an open striker',
  'sliding in for a tackle on their own goalkeeper',
  'celebrating before the ball had crossed the line',
  'blaming lag for a miss from two yards',
  'leaving the pitch for a snack mid-match',
  'pressing the wrong button on a free kick, again',
  'calling for a long ball and then not making the run',
  'rage-quitting at 1–0 up',
  'playing striker like a sweeper',
  'being late to match night with the kettle on',
  'sending a 4-star skiller on a solo run into three defenders',
  'stealing the penalty off the nominated taker',
];

// Test hook: lets tests choose the "random" result.
export const rng = { pick: (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n };

const ordinal = (n) => `${n}${[, 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10] || 'th'}`;
const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const ts = (ms, f = 'R') => `<t:${Math.floor(ms / 1000)}:${f}>`;
const say = (title, body) => reply(notice(title, body));
const monthStart = (now) => { const d = new Date(now); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); };

// The panel edit that goes with a button press (type 7): same layout, components only.
const upd = (m) => ({ type: 7, data: { components: m.components, allowed_mentions: { parse: [] } } });

function opts(i) {
  const o = {};
  for (const x of i.data?.options ?? []) o[x.name] = x.value;
  return o;
}
const userName = (i, id) => {
  const u = i.data?.resolved?.users?.[id], m = i.data?.resolved?.members?.[id];
  return clean(m?.nick || u?.global_name || u?.username || 'a member', 40);
};

// ---------- /jail ----------
function jailPanel(row, count, { bail = null } = {}) {
  const num = `NRX-${String(row.id).padStart(4, '0')}`;
  const out = row.at + row.minutes * MIN;
  return message({ accent: bail ? 'win' : 'loss', blocks: [
    header({ eyebrow: 'NOREX UNITED · Jail', title: `⛓️ ${row.name}`, sub: `Norex County Jail · ${num}`, size: 2 }),
    text(`Charged with ${row.reason}.`),
    facts([bail ? ['Released', `on bail from ${bail} ${ts(row.bail_at ?? Date.now())}`] : ['Sentence', `${row.minutes} min · out ${ts(out)}`]]),
    sep(),
    footer(`Locked up by <@${row.by_id}> · ${ordinal(count)} offence this month · just for fun`),
    buttons([bail ? null : { label: 'Post bail', id: `norex:fun:bail:${row.id}`, emoji: '💸' }, { label: 'Rap sheet', id: `norex:fun:sheet:${row.user_id}`, emoji: '📜' }]),
  ] });
}

async function jail(i, env, who, now) {
  const o = opts(i), target = String(o.member ?? '');
  const me = i.member?.user?.id ?? i.user?.id;
  if (!/^\d{1,25}$/.test(target)) return say('Pick a member to lock up', 'Use the member option of /jail.');
  if (target === me) return say('You can’t lock yourself up', 'Ask a mate to do it.');
  if (i.data?.resolved?.users?.[target]?.bot) return say('Bots have a good lawyer', 'Pick a person.');
  const sent = (await env.DB.prepare('SELECT COUNT(*) AS n FROM fun_jail WHERE by_id = ? AND at > ?').bind(me, now - DAY).first())?.n ?? 0;
  if (sent >= JAIL_PER_DAY) return say('The cells are full for today', `You can hand out ${JAIL_PER_DAY} sentences a day – try again tomorrow.`);
  const minutes = Math.min(120, Math.max(1, Math.floor(Number(o.minutes) || 30)));
  const reason = clean(o.reason, 140) || CHARGES[rng.pick(CHARGES.length)];
  const name = userName(i, target), byName = clean(i.member?.nick || i.member?.user?.global_name || i.member?.user?.username || 'a member', 40);
  const res = await env.DB.prepare('INSERT INTO fun_jail (user_id, name, by_id, by_name, reason, minutes, at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(target, name, me, byName, reason, minutes, now).run();
  const row = { id: res.meta?.last_row_id, user_id: target, name, by_id: me, by_name: byName, reason, minutes, at: now };
  const count = (await env.DB.prepare('SELECT COUNT(*) AS n FROM fun_jail WHERE user_id = ? AND at >= ?').bind(target, monthStart(now)).first())?.n ?? 1;
  return reply({ ...jailPanel(row, count), allowed_mentions: { parse: [] } });
}

async function bail(i, env, who, id, now) {
  const row = await env.DB.prepare('SELECT * FROM fun_jail WHERE id = ?').bind(id).first();
  if (!row) return say('That sentence is gone', 'It was cleared from the books.');
  const me = i.member?.user?.id ?? i.user?.id;
  if (row.bail_at) return say('Already out', 'Someone has already posted bail.');
  if (me !== row.user_id && !can(who, 'fun.manage')) return say('Only the prisoner or a manager can post bail', 'Ask them nicely.');
  const byName = clean(i.member?.nick || i.member?.user?.global_name || i.member?.user?.username || 'a mate', 40);
  await env.DB.prepare('UPDATE fun_jail SET bail_by = ?, bail_at = ? WHERE id = ?').bind(me, now, id).run();
  const count = (await env.DB.prepare('SELECT COUNT(*) AS n FROM fun_jail WHERE user_id = ? AND at >= ?').bind(row.user_id, monthStart(row.at)).first())?.n ?? 1;
  return upd(jailPanel({ ...row, bail_at: now }, count, { bail: byName }));
}

async function rapSheet(env, userId) {
  const rows = (await env.DB.prepare('SELECT * FROM fun_jail WHERE user_id = ? ORDER BY at DESC LIMIT 8').bind(userId).all()).results ?? [];
  if (!rows.length) return reply(notice('Clean record', 'Not a single offence. Suspicious.'));
  const total = (await env.DB.prepare('SELECT COUNT(*) AS n FROM fun_jail WHERE user_id = ?').bind(userId).first())?.n ?? rows.length;
  return reply(message({ ephemeral: true, accent: 'steel', blocks: [
    header({ eyebrow: 'NOREX UNITED · Jail', title: `📜 Rap sheet · ${rows[0].name}`, sub: `${total} offence${total === 1 ? '' : 's'} on file`, size: 3 }),
    text(rows.map((r) => `\`NRX-${String(r.id).padStart(4, '0')}\` ${ts(r.at, 'd')} · ${r.minutes} min · ${r.reason}${r.bail_at ? ' · 💸 bailed' : ''}`).join('\n')),
  ] }));
}

// ---------- /wheel ----------
export const parseOptions = (s) => [...new Set(String(s ?? '').split(/[,;\n]+/).map((x) => clean(x, 40)).filter(Boolean))].slice(0, MAX_WHEEL);

function wheelPanel(row, options, winnerIdx) {
  const win = options[winnerIdx];
  return message({ accent: 'gold', blocks: [
    header({ eyebrow: 'NOREX UNITED · Spin the wheel', title: row.question ? `🎡 ${row.question}` : '🎡 The wheel has spoken', size: 3 }),
    text(`## ${win}`),
    sep(),
    text(options.map((o, k) => (k === winnerIdx ? `▸ **${o}**` : `▫ ${o}`)).join('\n')),
    footer(`${options.length} options · spun by <@${row.by_id}>`),
    buttons([{ label: 'Spin again', id: `norex:fun:spin:${row.id}`, emoji: '🔄' }, options.length > MIN_WHEEL && { label: `Remove ${win.slice(0, 30)} and spin`, id: `norex:fun:rmspin:${row.id}:${winnerIdx}`, emoji: '✂️' }]),
  ] });
}

async function wheel(i, env, who, now) {
  const o = opts(i);
  const options = parseOptions(o.options);
  if (options.length < MIN_WHEEL) return say('The wheel needs at least two options', 'Separate them with commas: /wheel options:Jez, Kruger, Davey');
  const me = i.member?.user?.id ?? i.user?.id;
  const question = clean(o.question, 100);
  const res = await env.DB.prepare('INSERT INTO fun_wheels (question, options, by_id, at) VALUES (?, ?, ?, ?)').bind(question, JSON.stringify(options), me, now).run();
  const row = { id: res.meta?.last_row_id, question, by_id: me };
  return reply({ ...wheelPanel(row, options, rng.pick(options.length)), allowed_mentions: { parse: [] } });
}

async function spin(env, id, removeIdx) {
  const row = await env.DB.prepare('SELECT * FROM fun_wheels WHERE id = ?').bind(id).first();
  if (!row) return say('That wheel is gone', 'Start a new one with /wheel.');
  let options = JSON.parse(row.options);
  if (removeIdx != null) {
    if (options.length <= MIN_WHEEL) return say('Two is the minimum', 'Spin again instead.');
    options = options.filter((_, k) => k !== removeIdx);
    await env.DB.prepare('UPDATE fun_wheels SET options = ? WHERE id = ?').bind(JSON.stringify(options), id).run();
  }
  return upd(wheelPanel(row, options, rng.pick(options.length)));
}

// ---------- entry points ----------
export async function funCommand(i, env, ctx, who, now = Date.now()) {
  if (!flagOn(env, who, 'fun')) return say('This isn’t switched on yet', 'Fun commands are being tested.');
  if (!env.DB) return say('The member database isn’t connected');
  try {
    return i.data.name === 'jail' ? await jail(i, env, who, now) : await wheel(i, env, who, now);
  } catch (e) {
    return say('Something went wrong', String(e.message ?? e).slice(0, 200));
  }
}

export async function funButton(i, env, who, now = Date.now()) {
  if (!flagOn(env, who, 'fun')) return say('This isn’t switched on yet');
  if (!env.DB) return say('The member database isn’t connected');
  const [, , kind, a, b] = String(i.data?.custom_id ?? '').split(':');
  try {
    if (kind === 'bail') return await bail(i, env, who, Number(a), now);
    if (kind === 'sheet') return await rapSheet(env, a);
    if (kind === 'spin') return await spin(env, Number(a), null);
    if (kind === 'rmspin') return await spin(env, Number(a), Number(b));
  } catch (e) {
    return say('Something went wrong', String(e.message ?? e).slice(0, 200));
  }
  return say('Unknown button');
}

// How many sentences a member has – for the profile (bot/members.js).
export async function jailCount(env, userId) {
  try { return (await env.DB.prepare('SELECT COUNT(*) AS n FROM fun_jail WHERE user_id = ?').bind(String(userId)).first())?.n ?? 0; } catch { return 0; }
}
