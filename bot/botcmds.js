// Discord commands and buttons that need the member database (roadmap P3.3 RSVP buttons, P7.4 more bot commands).
//   ✅ ❔ ❌ buttons on event posts (custom_id norex:ev:<id>:<status>) → the same answers as the Squad Hub
//   /schedule      next events, with the answer buttons for the first one       (flag `events`)
//   /availability  who's in for the next event and which positions are missing (flag `events`)
//   /lineup        the published lineup for the next event                      (flag `events`)
//   /rush log      quick Rush result → pending for a manager (same checks as the Hub form; flag `rushLog`)
//   /me            my verified player's card
//   /leaderboard   League (EA) or Rush (confirmed logs) top 10
//   /profile       a member's profile – player, positions, platforms (✓ = verified by Discord, P2.4)  (flag `profiles`)
//   /awards        this week's ballot + last week's winners                                            (flag `awards`)
// Replies that are about "me" are ephemeral (flags 64) – only the person who asked sees them.
import { can, flagOn } from './roles.js';
import { answerEvents, EVENT_TYPES, eventMessage } from './events.js';
import { submitRush } from './members.js';
import { state as awardsState } from './awards.js';

export const MEMBER_COMMANDS = new Set(['schedule', 'availability', 'lineup', 'rush', 'me', 'leaderboard', 'profile', 'awards']);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const parse = (s, fb) => { try { return JSON.parse(s) ?? fb; } catch { return fb; } };
const say = (content, extra = {}) => ({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] }, ...extra } });
const RED = 0xc8352c;
const label = (e) => e.title || EVENT_TYPES[e.type]?.[1] || 'Event';
const ts = (ms, f = 'F') => `<t:${Math.floor(ms / 1000)}:${f}>`;
const flag = (c) => (/^[A-Z]{2}$/.test(c ?? '') ? String.fromCodePoint(...[...c].map((x) => 0x1f1a5 + x.charCodeAt(0))) : '');

// The Discord user behind an interaction as a member ("me" in the member API): id, display name, avatar URL, role.
function memberOf(i, who, env) {
  const u = i.member?.user ?? i.user ?? {};
  const avatar = i.member?.avatar && env.DISCORD_GUILD_ID ? `https://cdn.discordapp.com/guilds/${env.DISCORD_GUILD_ID}/users/${u.id}/avatars/${i.member.avatar}.png?size=128`
    : u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : null;
  return { u: u.id, n: String(i.member?.nick || u.global_name || u.username || 'Member').slice(0, 40), a: avatar, role: who.role };
}
const nextEvents = (env, n = 5) => all(env, "SELECT * FROM events WHERE status = 'scheduled' AND start + duration * 60000 > ? ORDER BY start LIMIT ?", Date.now(), n);
const rsvpsOf = (env, id) => all(env, 'SELECT r.status, r.name, r.user_id, p.positions, p.rush_positions FROM event_rsvps r LEFT JOIN profiles p ON p.user_id = r.user_id WHERE r.event_id = ? ORDER BY r.at', id);

// ---------- P3.3 answer buttons ----------
export async function eventButton(i, env, who) {
  if (!env.DB) return say('⚠️ The member database is not connected.');
  if (!flagOn(env, who, 'events') || !flagOn(env, who, 'discordRsvp')) return say('🔒 Answering on Discord is not switched on for you yet – use the Squad Hub.');
  if (!can(who, 'events.rsvp')) return say('🔒 Members of the NOREX server only.');
  const [, , id, status] = i.data.custom_id.split(':');
  if (!['yes', 'maybe', 'no'].includes(status)) return say('⚠️ Unknown answer.');
  const me = memberOf(i, who, env);
  const rows = await answerEvents(env, me, [Number(id)], status);
  if (!rows.length) return say('⌛ This event is over or was cancelled.');
  const e = await one(env, 'SELECT * FROM events WHERE id = ?', Number(id));
  const n = (await one(env, "SELECT COUNT(*) AS n FROM event_rsvps WHERE event_id = ? AND status = 'yes'", e.id)).n;
  await env.DB.prepare('INSERT INTO activity (at, user_id, name, avatar, type, detail) VALUES (?, ?, ?, ?, ?, ?)').bind(Date.now(), me.u, me.n, me.a, 'event-rsvp', `${status} · ${label(e)} · Discord`).run();
  return say(`${{ yes: '✅ You’re in', maybe: '❔ Marked as maybe', no: '❌ Marked as can’t make it' }[status]} for **${label(e)}** · ${ts(e.start)} (${ts(e.start, 'R')}). ${n} said yes so far – change it any time with the buttons or in the Squad Hub.`);
}

// ---------- P7.4 commands ----------
// helpers from worker.js: load(file) → site JSON, playerEmbed(p) → the /player card, top(stat) → the /top reply
export async function memberCommand(i, env, who, site, h) {
  const name = i.data.name, opts = Object.fromEntries(flatOptions(i.data.options).map((o) => [o.name, o.value]));
  if (!env.DB) return say('⚠️ The member database is not connected.');
  const me = memberOf(i, who, env);
  const events = ['schedule', 'availability', 'lineup'].includes(name);
  if (events && !flagOn(env, who, 'events')) return say('🔒 The schedule is not switched on yet.');

  if (name === 'schedule') {
    const list = await nextEvents(env, 6);
    if (!list.length) return say('🗓️ Nothing scheduled yet – managers add match nights in the Squad Hub.', { flags: 0 });
    const counts = await all(env, `SELECT event_id, status, COUNT(*) AS n FROM event_rsvps WHERE event_id IN (${list.map(() => '?').join(',')}) GROUP BY event_id, status`, ...list.map((e) => e.id));
    const c = (id, st) => counts.find((x) => x.event_id === id && x.status === st)?.n ?? 0;
    const first = eventMessage(env, list[0], await rsvpsOf(env, list[0].id), 'Next up · ');
    const rest = list.slice(1).map((e) => `${EVENT_TYPES[e.type][0]} **${label(e)}** · ${ts(e.start)} (${ts(e.start, 'R')}) · ✅ ${c(e.id, 'yes')} ❔ ${c(e.id, 'maybe')}`);
    return { type: 4, data: { embeds: [first.embeds[0], ...(rest.length ? [{ title: '🗓️ After that', color: RED, description: rest.join('\n'), url: `${site}members.html#schedule` }] : [])], components: first.components, allowed_mentions: { parse: [] } } };
  }
  if (name === 'availability' || name === 'lineup') {
    // /lineup: the next event with a published lineup (falls back to the very next event to say "not yet").
    const e = (name === 'lineup' ? await one(env, "SELECT * FROM events WHERE status = 'scheduled' AND lineup_at IS NOT NULL AND start + duration * 60000 > ? ORDER BY start LIMIT 1", Date.now()) : null) ?? (await nextEvents(env, 1))[0];
    if (!e) return say('🗓️ Nothing scheduled yet.', { flags: 0 });
    const rsvps = await rsvpsOf(env, e.id);
    if (name === 'availability') {
      const by = (st) => rsvps.filter((r) => r.status === st).map((r) => r.name);
      const msg = eventMessage(env, e, rsvps);
      return { type: 4, data: { embeds: [{ ...msg.embeds[0], fields: [
        { name: `✅ In (${by('yes').length})`, value: by('yes').join(', ').slice(0, 1000) || '–' },
        { name: `❔ Maybe (${by('maybe').length})`, value: by('maybe').join(', ').slice(0, 1000) || '–', inline: true },
        { name: `❌ Out (${by('no').length})`, value: by('no').join(', ').slice(0, 1000) || '–', inline: true },
        ...msg.embeds[0].fields.filter((f) => f.name.startsWith('🧩')),
      ] }], components: msg.components, allowed_mentions: { parse: [] } } };
    }
    const lineup = parse(e.lineup, {});
    const ids = Object.keys(lineup);
    if (!ids.length || !e.lineup_at) return say(`🧩 No lineup published yet for **${label(e)}** (${ts(e.start, 'R')}).`, { flags: 0 });
    const names = new Map([...rsvps.map((r) => [r.user_id, r.name]), ...(await all(env, `SELECT id, name FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)).map((u) => [u.id, u.name])]);
    const rows = ids.map((id) => [lineup[id], names.get(id) ?? 'Member']).sort((a, b) => SLOT_ORDER(a[0]) - SLOT_ORDER(b[0]));
    return { type: 4, data: { embeds: [{ title: `🧩 ${label(e)} · ${e.formation ?? 'Lineup'}`, url: `${site}members.html#schedule-${e.id}`, color: RED, description: `${ts(e.start)} (${ts(e.start, 'R')})\n\n${rows.map(([pos, n]) => `\`${pos.padEnd(4)}\` ${n}`).join('\n')}` }], allowed_mentions: { parse: [] } } };
  }
  if (name === 'rush') {
    if (!flagOn(env, who, 'rushLog')) return say('🔒 Rush logging is not switched on for you yet.');
    const claim = await one(env, "SELECT player, player_name FROM claims WHERE user_id = ? AND status = 'approved'", me.u);
    if (!claim) return say(`🪪 Claim your player in the Squad Hub first (${site}members.html) – then /rush log fills you in automatically.`);
    const today = new Date().toISOString().slice(0, 10);
    const res = await submitRush(env, me, {
      date: opts.date || today, opponent: opts.opponent, gf: opts.for, ga: opts.against,
      players: [{ k: claim.player, g: opts.goals ?? 0, a: opts.assists ?? 0 }],
    }, h.load);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return say(`⚠️ ${d.error ?? 'Could not log that result.'}`);
    return say(`⚡ Logged **${opts.for}–${opts.against} vs ${opts.opponent}**${d.status === 'confirmed' ? ' – confirmed (you’re a manager).' : ' – a manager confirms it, then it counts everywhere.'} Add teammates, ratings or a screenshot in the Squad Hub: ${site}members.html#rush`);
  }
  if (name === 'me') {
    const claim = await one(env, "SELECT player FROM claims WHERE user_id = ? AND status = 'approved'", me.u);
    if (!claim) return say(`🪪 You haven’t got a verified player yet – claim yours in the Squad Hub: ${site}members.html`);
    const p = (await h.load('players')).find((x) => x.k === claim.player);
    if (!p) return say('🙈 Your player is hidden from the site or not in the latest data yet.');
    const card = h.playerEmbed(p);
    return { type: 4, data: { embeds: [{ ...card, footer: { text: 'Only you can see this · full dashboard: Squad Hub → 📊 My stats' } }], flags: 64 } };
  }
  if (name === 'leaderboard') {
    const stat = opts.stat ?? 'goals';
    if ((opts.mode ?? 'league') === 'league') return h.top(stat);
    const rows = await all(env, `SELECT p.player, MAX(p.name) AS n, COUNT(*) AS gp, SUM(p.goals) AS g, SUM(p.assists) AS a, SUM(p.motm) AS m, AVG(p.rating) AS r
      FROM rush_players p JOIN rush_matches m ON m.id = p.match_id WHERE m.status = 'confirmed' AND p.player != '' GROUP BY p.player`);
    const F = { goals: ['Top scorers', (x) => x.g], assists: ['Most assists', (x) => x.a], ga: ['Goals + assists', (x) => x.g + x.a], rating: ['Best average rating (3+ games)', (x) => (x.gp >= 3 && x.r ? x.r : 0), 1], motm: ['Most MOTM', (x) => x.m], games: ['Most Rush games', (x) => x.gp] };
    const [title, f, dec = 0] = F[stat] ?? F.goals;
    const list = rows.map((x) => [x, f(x)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const medal = ['🥇', '🥈', '🥉'];
    return { type: 4, data: { embeds: [{ title: `⚡ Rush – ${title}`, url: `${site}stats.html`, color: RED,
      description: list.map(([x, v], k) => `${medal[k] ?? `\`${k + 1}.\``} [${x.n}](${site}players/${encodeURIComponent(x.player)}.html) — **${v.toFixed(dec)}**`).join('\n') || 'No confirmed Rush results yet.',
      footer: { text: 'From Rush results logged by members and confirmed by a manager' } }] } };
  }
  if (name === 'profile') {
    if (!flagOn(env, who, 'profiles')) return say('🔒 Member profiles are not switched on for you yet.');
    const id = String(opts.member ?? me.u);
    const [u, prof, claim] = await Promise.all([
      one(env, 'SELECT * FROM users WHERE id = ?', id), one(env, 'SELECT * FROM profiles WHERE user_id = ?', id),
      one(env, "SELECT player, player_name FROM claims WHERE user_id = ? AND status = 'approved'", id),
    ]);
    if (!u) return say('🤷 That member hasn’t logged in to the site yet, so there’s no profile.');
    const ids = parse(prof?.ids, {}), verified = parse(prof?.verified, {});
    const PLAT = [['psn', 'PSN'], ['xbox', 'Xbox'], ['steam', 'Steam'], ['ea', 'EA ID']];
    const plats = PLAT.map(([k, l]) => { const v = verified[k]?.name ?? ids[k]; return v ? `${l}: **${v}**${verified[k] ? ' ✓' : ''}` : ''; }).filter(Boolean);
    const pos = (s) => parse(s, []).join(' / ');
    return { type: 4, data: { embeds: [{
      title: `${u.name}${prof?.country ? ` ${flag(prof.country)}` : ''}`, url: `${site}member.html?u=${encodeURIComponent(id)}`, color: RED, thumbnail: u.avatar ? { url: u.avatar } : undefined,
      description: [claim ? `🪪 Plays as **[${claim.player_name}](${site}players/${encodeURIComponent(claim.player)}.html)** ✅` : '🪪 No verified player yet', prof?.bio ? `> ${String(prof.bio).slice(0, 300)}` : ''].filter(Boolean).join('\n'),
      fields: [
        pos(prof?.positions) && { name: '🏆 League positions', value: pos(prof.positions), inline: true },
        pos(prof?.rush_positions) && { name: '⚡ Rush positions', value: pos(prof.rush_positions), inline: true },
        plats.length && { name: '🎮 Platforms', value: `${plats.join('\n')}${Object.keys(verified).length ? '\n✓ = verified through Discord' : ''}` },
      ].filter(Boolean),
      footer: { text: 'NOREX UNITED · full profile on the site' },
    }], allowed_mentions: { parse: [] } } };
  }
  if (name === 'awards') {
    if (!flagOn(env, who, 'awards')) return say('🔒 Weekly awards are not switched on yet.');
    if (!can(who, 'awards.vote')) return say('🔒 Members of the NOREX server only.');
    const st = await awardsState(env, me, h.load);
    const ballot = st.categories.length ? st.categories.map((c) => `${c.icon} **${c.name}**`).join('\n') : 'No categories yet – a manager adds them in the Squad Hub.';
    const auto = st.stats.map((s) => `${s.icon} **${s.name}** – ${s.how}`).join('\n');
    const last = st.last?.winners.length ? st.last.winners.map((w) => `${w.icon} **${w.name}** — ${w.n ? `[${w.n}](${site}players/${encodeURIComponent(w.k)}.html)` : '–'}`).join('\n') : 'No winners yet.';
    return { type: 4, data: { embeds: [{
      title: `🏆 Weekly awards · ${st.week}`, url: `${site}members.html#awards`, color: RED,
      description: st.closed ? 'This week’s voting has closed.' : `Voting closes ${ts(st.closes)} (${ts(st.closes, 'R')}) – cast your votes in the Squad Hub.`,
      fields: [
        { name: '🗳️ Vote now', value: ballot.slice(0, 1024) },
        { name: '📊 Decided automatically', value: auto.slice(0, 1024) },
        { name: `🏅 Last week’s winners${st.last ? ` (${st.last.week})` : ''}`, value: last.slice(0, 1024) },
      ],
      footer: { text: 'NOREX UNITED · vote in the Squad Hub' },
    }], allowed_mentions: { parse: [] } } };
  }
  return say('Unknown command.');
}
const ORDER = ['GK', 'LWB', 'LB', 'CB', 'LCB', 'RCB', 'RB', 'RWB', 'CDM', 'LDM', 'RDM', 'LM', 'CM', 'LCM', 'RCM', 'RM', 'CAM', 'LAM', 'RAM', 'LW', 'RW', 'CF', 'ST', 'LS', 'RS'];
const SLOT_ORDER = (slot) => { const i = ORDER.indexOf(String(slot).replace(/\d+$/, '')); return i < 0 ? 99 : i; };
function flatOptions(opts = []) { return opts.flatMap((o) => (o.options ? flatOptions(o.options) : [o])); }
