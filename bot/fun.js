// Fun for members – small things that make the server feel like a club. Everything is a slash command or a button on the
// message it posted, all in the design system (bot/ui.js), behind the `fun` feature flag (owner first).
//   /jail @member [reason] [minutes]   lock a mate up for a daft offence – mugshot-style panel, "Post bail", "Rap sheet"
//   /wheel options:"Jez, Kruger, Davey" [question]   spin a wheel – "Spin again", "Remove <winner> and spin"
//   /trivia [board]                    a football question with four answer buttons – 10 points for a right answer; `board` = the table
//   birthdays  the 10-min cron posts one 🎂 panel a day (after 08:00 UTC) for members whose profile has a birthday
// Jail counts feed the member profile (GET /api/member → fun.jail, see bot/members.js).
import { can, flagOn } from './roles.js';
import { message, notice, reply, header, text, facts, footer, sep, buttons } from './ui.js';

export const FUN_COMMANDS = new Set(['jail', 'wheel', 'trivia']);
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
    if (i.data.name === 'trivia') return await trivia(i, env, now);
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
    if (kind === 'tq') return await triviaAnswer(i, env, Number(a), Number(b), now);
  } catch (e) {
    return say('Something went wrong', String(e.message ?? e).slice(0, 200));
  }
  return say('Unknown button');
}

// How many sentences a member has – for the profile (bot/members.js).
export async function triviaPoints(env, userId) {
  try { return (await env.DB.prepare('SELECT points FROM fun_trivia_scores WHERE user_id = ?').bind(String(userId)).first())?.points ?? 0; } catch { return 0; }
}
export async function jailCount(env, userId) {
  try { return (await env.DB.prepare('SELECT COUNT(*) AS n FROM fun_jail WHERE user_id = ?').bind(String(userId)).first())?.n ?? 0; } catch { return 0; }
}

// ---------- /trivia ----------
// Stable football facts only (nothing that changes week to week). q, the right answer, three wrong ones, a line for afterwards.
export const TRIVIA = [
  ['Which country won the 2022 FIFA World Cup?', 'Argentina', ['France', 'Brazil', 'Croatia'], 'Argentina beat France on penalties after a 3–3 draw.'],
  ['Who is the all-time top scorer at the men’s World Cup?', 'Miroslav Klose', ['Ronaldo Nazário', 'Lionel Messi', 'Gerd Müller'], 'Klose scored 16 goals across four tournaments.'],
  ['In which year was the first World Cup held?', '1930', ['1934', '1950', '1924'], 'Uruguay hosted and won it.'],
  ['Which club has won the most European Cup / Champions League titles?', 'Real Madrid', ['AC Milan', 'Liverpool', 'Bayern Munich'], 'Real Madrid have won it more than any other club.'],
  ['How many Ballon d’Or awards has Lionel Messi won?', '8', ['6', '7', '9'], 'Eight, the most by any player.'],
  ['Which country hosted the 2018 World Cup?', 'Russia', ['Qatar', 'Brazil', 'Germany'], 'France won it in Moscow.'],
  ['Who scored the “Hand of God” goal?', 'Diego Maradona', ['Pelé', 'Zico', 'Romário'], 'Maradona, against England at the 1986 World Cup.'],
  ['Which stadium is nicknamed “The Theatre of Dreams”?', 'Old Trafford', ['Anfield', 'Camp Nou', 'San Siro'], 'Home of Manchester United.'],
  ['Which club plays at the Allianz Arena?', 'Bayern Munich', ['Borussia Dortmund', 'Schalke', 'Bayer Leverkusen'], 'Bayern have played there since 2005.'],
  ['Which nation has won the most men’s World Cups?', 'Brazil', ['Germany', 'Italy', 'Argentina'], 'Brazil have five.'],
  ['Who won the first Premier League season, 1992–93?', 'Manchester United', ['Blackburn Rovers', 'Aston Villa', 'Arsenal'], 'United’s first of many.'],
  ['How many players make up a full Pro Clubs team?', '11', ['9', '10', '7'], 'Eleven a side, like the real thing.'],
  ['Who is the Premier League’s all-time top scorer?', 'Alan Shearer', ['Wayne Rooney', 'Harry Kane', 'Andy Cole'], 'Shearer scored 260.'],
  ['Which club is nicknamed “The Old Lady”?', 'Juventus', ['Roma', 'Inter', 'Napoli'], 'La Vecchia Signora of Turin.'],
  ['Which club won the Premier League in 2015–16 as 5000–1 outsiders?', 'Leicester City', ['Tottenham', 'Southampton', 'West Ham'], 'Leicester, under Claudio Ranieri.'],
  ['Which national team is nicknamed “Les Bleus”?', 'France', ['Italy', 'Belgium', 'Netherlands'], 'Italy are the Azzurri, Belgium the Red Devils.'],
  ['Who scored the most goals in a calendar year?', 'Lionel Messi', ['Cristiano Ronaldo', 'Gerd Müller', 'Robert Lewandowski'], 'Messi scored 91 in 2012.'],
  ['In which country is the Maracanã stadium?', 'Brazil', ['Argentina', 'Uruguay', 'Portugal'], 'Rio de Janeiro.'],
  ['Who is the only goalkeeper to have won the Ballon d’Or?', 'Lev Yashin', ['Gianluigi Buffon', 'Manuel Neuer', 'Oliver Kahn'], 'Yashin won it in 1963.'],
  ['Which club did Zinedine Zidane leave to join Real Madrid in 2001?', 'Juventus', ['Barcelona', 'Inter', 'Marseille'], 'A then-record transfer.'],
  ['How many teams play at the 2026 World Cup?', '48', ['32', '40', '64'], 'The first World Cup with 48 teams.'],
  ['Who scored a hat-trick in the 1966 World Cup final?', 'Geoff Hurst', ['Bobby Charlton', 'Bobby Moore', 'Roger Hunt'], 'England beat West Germany 4–2.'],
  ['Which club is nicknamed “The Gunners”?', 'Arsenal', ['Tottenham', 'West Ham', 'Millwall'], 'From the Royal Arsenal armaments factory.'],
  ['Which country won Euro 2024?', 'Spain', ['England', 'France', 'Netherlands'], 'Spain beat England 2–1 in Berlin.'],
  ['Which country won Euro 2020, played in 2021?', 'Italy', ['England', 'Spain', 'Denmark'], 'Italy beat England on penalties at Wembley.'],
];
const TRIVIA_POINTS = 10, TRIVIA_OPEN = 15 * MIN, LETTERS = ['A', 'B', 'C', 'D'];
const shuffled = () => { const a = [0, 1, 2, 3]; for (let k = 3; k > 0; k--) { const j = rng.pick(k + 1); [a[k], a[j]] = [a[j], a[k]]; } return a; }; // answer slots → position

function triviaPanel(q, id, order, { result = null } = {}) {
  const options = order.map((slot) => (slot === 0 ? q[1] : q[2][slot - 1])); // slot 0 = the right answer
  return message({ accent: result ? 'gold' : 'red', blocks: [
    header({ eyebrow: 'NOREX UNITED · Trivia', title: `🧠 ${q[0]}`, size: 3 }),
    text(options.map((o, k) => `**${LETTERS[k]}** · ${o}${result && order[k] === 0 ? ' ✅' : ''}`).join('\n')),
    footer(result ?? `Answer privately with a button · ${TRIVIA_POINTS} points for a right answer · one go each`),
    result ? null : buttons(options.map((_, k) => ({ label: LETTERS[k], id: `norex:fun:tq:${id}:${k}` }))),
  ] });
}

async function trivia(i, env, now) {
  const sub = i.data?.options?.[0]?.name ?? 'play';
  if (sub === 'board') {
    const rows = (await env.DB.prepare('SELECT * FROM fun_trivia_scores WHERE points > 0 ORDER BY points DESC, correct DESC LIMIT 10').all()).results ?? [];
    if (!rows.length) return say('No scores yet', 'Be the first: /trivia');
    const medal = ['🥇', '🥈', '🥉'];
    return reply({ ...message({ accent: 'gold', blocks: [
      header({ eyebrow: 'NOREX UNITED · Trivia', title: '🏆 Trivia table', sub: `${rows.length} player${rows.length === 1 ? '' : 's'} on the board`, size: 3 }),
      text(rows.map((r, k) => `${medal[k] ?? `\`${k + 1}.\``} **${r.name ?? 'A member'}** · ${r.points} pts · ${r.correct}/${r.played} right`).join('\n')),
    ] }), allowed_mentions: { parse: [] } });
  }
  const me = i.member?.user?.id ?? i.user?.id;
  const qIdx = rng.pick(TRIVIA.length), order = shuffled();
  const res = await env.DB.prepare('INSERT INTO fun_trivia_q (q_idx, order_json, by_id, at) VALUES (?, ?, ?, ?)').bind(qIdx, JSON.stringify(order), me, now).run();
  return reply(triviaPanel(TRIVIA[qIdx], res.meta?.last_row_id, order));
}

async function triviaAnswer(i, env, qId, k, now) {
  const row = await env.DB.prepare('SELECT * FROM fun_trivia_q WHERE id = ?').bind(qId).first();
  if (!row) return say('That question is gone', 'Start another with /trivia.');
  const me = i.member?.user?.id ?? i.user?.id;
  if (now - row.at > TRIVIA_OPEN) return say('Time’s up', 'That question has closed – start another with /trivia.');
  const order = JSON.parse(row.order_json), q = TRIVIA[row.q_idx];
  if (!(k >= 0 && k < 4)) return say('Unknown answer');
  const ok = order[k] === 0 ? 1 : 0;
  const name = clean(i.member?.nick || i.member?.user?.global_name || i.member?.user?.username || 'A member', 40);
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO fun_trivia_answers (q_id, user_id, pick, ok, at) VALUES (?, ?, ?, ?, ?)').bind(qId, me, k, ok, now).run();
  if (!ins.meta?.changes) return say('You’ve already answered', 'One go each per question.');
  await env.DB.prepare(`INSERT INTO fun_trivia_scores (user_id, name, points, correct, played) VALUES (?, ?, ?, ?, 1)
    ON CONFLICT (user_id) DO UPDATE SET name = excluded.name, points = points + excluded.points, correct = correct + excluded.correct, played = played + 1`)
    .bind(me, name, ok ? TRIVIA_POINTS : 0, ok).run();
  const total = (await env.DB.prepare('SELECT points FROM fun_trivia_scores WHERE user_id = ?').bind(me).first())?.points ?? 0;
  const right = LETTERS[order.indexOf(0)];
  return reply(notice(ok ? `✅ Right! +${TRIVIA_POINTS} points` : `❌ Not this time – it was ${right} · ${q[1]}`, `${q[3]} You have ${total} point${total === 1 ? '' : 's'}.`, { accent: ok ? 'win' : 'loss' }));
}

// ---------- birthdays ----------
// Profiles keep MM-DD only. In a non-leap year 29 Feb is celebrated on 1 March.
export function birthdaysOn(now) {
  const d = new Date(now), mo = d.getUTCMonth() + 1, day = d.getUTCDate();
  const leap = new Date(Date.UTC(d.getUTCFullYear(), 1, 29)).getUTCMonth() === 1;
  const key = (m, dd) => `${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return [key(mo, day), ...(mo === 3 && day === 1 && !leap ? ['02-29'] : [])];
}
export function birthdayPanel(rows) {
  return message({ accent: 'gold', blocks: [
    header({ eyebrow: 'NOREX UNITED · Birthdays', title: rows.length === 1 ? '🎂 Happy birthday!' : `🎂 ${rows.length} birthdays today`, size: 2 }),
    text(rows.map((r) => `🎉 <@${r.user_id}>`).join('\n')),
    footer('From everyone at the club – have a good one'),
  ] });
}
export async function birthdayCheck(env, post, now = Date.now()) {
  if (!env.DB || !env.DISCORD_BOT_TOKEN) return { posted: false };
  const d = new Date(now);
  if (d.getUTCHours() < 8) return { posted: false };
  const day = d.toISOString().slice(0, 10);
  if ((await env.DB.prepare("SELECT value FROM meta WHERE key = 'fun_birthday_day'").first('value')) === day) return { posted: false };
  const keys = birthdaysOn(now);
  const rows = (await env.DB.prepare(`SELECT p.user_id FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.birthday IN (${keys.map(() => '?').join(',')})`).bind(...keys).all()).results ?? [];
  const channel = (await env.DB.prepare("SELECT value FROM meta WHERE key = 'announce_channel'").first('value')) || '';
  // Mark the day first: a failed post is not retried every 10 minutes all day.
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('fun_birthday_day', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(day).run();
  if (!rows.length || !channel) return { posted: false };
  const r = await post(env, channel, '', birthdayPanel(rows));
  return { posted: !!r?.ok, count: rows.length };
}
