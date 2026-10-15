// Discord commands and buttons that need the member database (roadmap P3.3 RSVP buttons, P7.4 more bot commands).
//   ✅ ❔ ❌ buttons on event posts (custom_id norex:ev:<id>:<status>) → the same answers as the Squad Hub
//   ✅ Learned it button on a shared play (custom_id norex:play:<id>:learned, BE1) → the same state as the
//   Tactics Studio's own "Mark learned" button
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
import { answerEvents, EVENT_TYPES, eventPost } from './events.js';
import { currentRole, log, submitRush, voteView, votesByMatch } from './members.js';
import { state as awardsState } from './awards.js';
import { CATEGORIES } from './points.js';
import { feedbackRoute, KINDS as FEEDBACK_KINDS } from './feedback.js';
import { knowledgeRoute } from './docs.js';
import { notifyRouteAll } from './notify.js';
import { trialsState } from './trials.js';
import { markLearned } from './plays.js';
import { message, panel, reply, notice, header, text, sep, facts, side, thumb, label as heading, footer, buttons } from './ui.js';
import { it } from './icons.js';
import { faceOf, playerFaces } from './faces.js';
import { hostCommand } from './host.js';

// P11.16: quick one-line wrappers around features that already exist – reuse the same route
// functions the Squad Hub calls, rather than duplicating their validation/limits here.
export const MEMBER_COMMANDS = new Set(['schedule', 'availability', 'lineup', 'rush', 'me', 'leaderboard', 'profile', 'awards', 'points', 'nextevent', 'feedback', 'suggest', 'announce', 'trial', 'motm', 'history', 'host']);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const parse = (s, fb) => { try { return JSON.parse(s) ?? fb; } catch { return fb; } };
// Short replies in the design system's compact style (bot/ui.js): private unless { flags: 0 }.
const say = (content, extra = {}) => reply(message({ accent: 'steel', ephemeral: (extra.flags ?? 64) === 64, blocks: [text(content)] }));
const done = (title, body) => reply(notice(title, body, { accent: 'win' })); // private "it worked"
const brand = (s) => `NOREX UNITED · ${s}`;
const label = (e) => e.title || EVENT_TYPES[e.type]?.[1] || 'Event';
const ts = (ms, f = 'F') => `<t:${Math.floor(ms / 1000)}:${f}>`;
const flag = (c) => (/^[A-Z]{2}$/.test(c ?? '') ? String.fromCodePoint(...[...c].map((x) => 0x1f1a5 + x.charCodeAt(0))) : '');

// The Discord user behind an interaction as a member ("me" in the member API): id, display name, avatar URL,
// role – elevated to 'claimed' when they have an approved player claim, same as a web session (P11.16: some
// wrapped routes, e.g. feedback.send, gate on 'claimed' and Discord's own roles never reach that tier).
export async function memberOf(i, who, env) {
  const u = i.member?.user ?? i.user ?? {};
  const avatar = i.member?.avatar && env.DISCORD_GUILD_ID ? `https://cdn.discordapp.com/guilds/${env.DISCORD_GUILD_ID}/users/${u.id}/avatars/${i.member.avatar}.png?size=128`
    : u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : null;
  const me = { u: u.id, n: String(i.member?.nick || u.global_name || u.username || 'Member').slice(0, 40), a: avatar, role: who.role };
  me.role = await currentRole(env, me);
  return me;
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
  const me = await memberOf(i, who, env);
  const rows = await answerEvents(env, me, [Number(id)], status);
  if (!rows.length) return say('⌛ This event is over or was cancelled.');
  const e = await one(env, 'SELECT * FROM events WHERE id = ?', Number(id));
  const n = (await one(env, "SELECT COUNT(*) AS n FROM event_rsvps WHERE event_id = ? AND status = 'yes'", e.id)).n;
  await env.DB.prepare('INSERT INTO activity (at, user_id, name, avatar, type, detail) VALUES (?, ?, ?, ?, ?, ?)').bind(Date.now(), me.u, me.n, me.a, 'event-rsvp', `${status} · ${label(e)} · Discord`).run();
  return say(`${{ yes: '✅ You’re in', maybe: '❔ Marked as maybe', no: '❌ Marked as can’t make it' }[status]} for **${label(e)}** · ${ts(e.start)} (${ts(e.start, 'R')}). ${n} said yes so far – change it any time with the buttons or in the Squad Hub.`);
}

// ---------- BE1 "✅ Learned it" button on a shared play ----------
export async function playButton(i, env, who) {
  if (!env.DB) return say('⚠️ The member database is not connected.');
  if (!flagOn(env, who, 'tactics')) return say('🔒 The Tactics Studio is not switched on yet.');
  if (!can(who, 'plays.view')) return say('🔒 Members of the NOREX server only.');
  const [, , id] = i.data.custom_id.split(':');
  const me = await memberOf(i, who, env);
  const res = await markLearned(env, me, Number(id), { learned: true });
  const data = await res.json();
  if (res.status !== 200) return say(`⚠️ ${data.error}`);
  await env.DB.prepare('INSERT INTO activity (at, user_id, name, avatar, type, detail) VALUES (?, ?, ?, ?, ?, ?)').bind(Date.now(), me.u, me.n, me.a, 'play-learned', 'via Discord').run();
  return say('✅ Marked as learned – nice work! Open the Tactics Studio any time to revisit it.');
}

// ---------- P7.4 commands ----------
// helpers from worker.js: load(file) → site JSON, playerMessage(p) → the /player card (design system), top(stat) → the /top reply
export async function memberCommand(i, env, who, site, h) {
  const name = i.data.name, opts = Object.fromEntries(flatOptions(i.data.options).map((o) => [o.name, o.value]));
  if (!env.DB) return say('⚠️ The member database is not connected.');
  const me = await memberOf(i, who, env);
  const events = ['schedule', 'availability', 'lineup', 'host'].includes(name);
  if (events && !flagOn(env, who, 'events')) return say('🔒 The schedule is not switched on yet.');

  if (name === 'host') {
    if (!can(who, 'events.manage')) return say('🔒 Only managers can host sessions – ask one, or suggest a time in the chat.');
    return hostCommand(i, env, me, opts, { log, loadSite: h.load });
  }
  if (name === 'schedule') {
    const list = await nextEvents(env, 6);
    if (!list.length) return say('🗓️ Nothing scheduled yet – managers add match nights in the Squad Hub.', { flags: 0 });
    const counts = await all(env, `SELECT event_id, status, COUNT(*) AS n FROM event_rsvps WHERE event_id IN (${list.map(() => '?').join(',')}) GROUP BY event_id, status`, ...list.map((e) => e.id));
    const c = (id, st) => counts.find((x) => x.event_id === id && x.status === st)?.n ?? 0;
    const first = await eventPost(env, list[0], await rsvpsOf(env, list[0].id), 'Next up · ');
    const rest = list.slice(1).map((e) => `${EVENT_TYPES[e.type][0]} **${label(e)}** · ${ts(e.start)} (${ts(e.start, 'R')}) · ✅ ${c(e.id, 'yes')} ❔ ${c(e.id, 'maybe')}`);
    // the next event's full panel, then a second panel listing what comes after it
    if (rest.length) first.components.push(panel({ blocks: [heading('After that'), text(rest.join('\n')), buttons([{ label: 'Full schedule', url: `${site}members.html#schedule` }])] }));
    return reply(first);
  }
  if (name === 'availability' || name === 'lineup') {
    // /lineup: the next event with a published lineup (falls back to the very next event to say "not yet").
    const e = (name === 'lineup' ? await one(env, "SELECT * FROM events WHERE status = 'scheduled' AND lineup_at IS NOT NULL AND start + duration * 60000 > ? ORDER BY start LIMIT 1", Date.now()) : null) ?? (await nextEvents(env, 1))[0];
    if (!e) return say('🗓️ Nothing scheduled yet.', { flags: 0 });
    const rsvps = await rsvpsOf(env, e.id);
    if (name === 'availability') return reply(await eventPost(env, e, rsvps, '', { who: true }));
    const lineup = parse(e.lineup, {});
    const ids = Object.keys(lineup);
    if (!ids.length || !e.lineup_at) return say(`🧩 No lineup published yet for **${label(e)}** (${ts(e.start, 'R')}).`, { flags: 0 });
    const names = new Map([...rsvps.map((r) => [r.user_id, r.name]), ...(await all(env, `SELECT id, name FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)).map((u) => [u.id, u.name])]);
    const rows = ids.map((id) => [lineup[id], names.get(id) ?? 'Member']).sort((a, b) => SLOT_ORDER(a[0]) - SLOT_ORDER(b[0]));
    return reply(message({ blocks: [
      header({ eyebrow: brand('Lineup'), title: `🧩 ${label(e)} · ${e.formation ?? 'Lineup'}`, sub: `${ts(e.start)} · ${ts(e.start, 'R')}` }),
      text(`\`\`\`\n${rows.map(([pos, n]) => `${String(pos).padEnd(5)}${n}`).join('\n')}\n\`\`\``),
      footer(`${rows.length} players · positions in formation order`),
      buttons([{ label: 'Open in the Squad Hub', url: `${site}members.html#schedule-${e.id}` }]),
    ] }));
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
    return say(`⚡ **Logged ${opts.for}–${opts.against} vs ${opts.opponent}**\n${d.status === 'confirmed' ? 'Confirmed (you’re a manager).' : 'A manager confirms it, then it counts everywhere.'} Add teammates, ratings or a screenshot in the Squad Hub: ${site}members.html#rush`);
  }
  if (name === 'me') {
    const claim = await one(env, "SELECT player FROM claims WHERE user_id = ? AND status = 'approved'", me.u);
    if (!claim) return say(`🪪 You haven’t got a verified player yet – claim yours in the Squad Hub: ${site}members.html`);
    const p = (await h.load('players')).find((x) => x.k === claim.player);
    if (!p) return say('🙈 Your player is hidden from the site or not in the latest data yet.');
    const msg = await h.playerMessage(p, { eyebrow: 'My player card' });
    return { type: 4, data: { ...msg, flags: msg.flags | 64 } }; // only you see it
  }
  if (name === 'leaderboard') {
    const stat = opts.stat ?? 'goals';
    if ((opts.mode ?? 'league') === 'league') return h.top(stat);
    const rows = await all(env, `SELECT p.player, MAX(p.name) AS n, COUNT(*) AS gp, SUM(p.goals) AS g, SUM(p.assists) AS a, SUM(p.motm) AS m, AVG(p.rating) AS r
      FROM rush_players p JOIN rush_matches m ON m.id = p.match_id WHERE m.status = 'confirmed' AND p.player != '' GROUP BY p.player`);
    const F = { goals: ['Top scorers', (x) => x.g], assists: ['Most assists', (x) => x.a], ga: ['Goals + assists', (x) => x.g + x.a], rating: ['Best average rating (3+ games)', (x) => (x.gp >= 3 && x.r ? x.r : 0), 1], motm: ['Most MOTM', (x) => x.m], games: ['Most Rush games', (x) => x.gp] };
    const [title, f, dec = 0] = F[stat] ?? F.goals;
    const list = rows.map((x) => [x, f(x)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const medal = [it('first'), it('second'), it('third')];
    return reply(message({ blocks: [
      header({ eyebrow: brand('Rush leaderboard'), title: `⚡ ${title}`, sub: list[0] ? `${list[0][0].n} leads with ${list[0][1].toFixed(dec)}` : 'No confirmed Rush results yet' }),
      list.length ? text(list.map(([x, v], k) => `${medal[k] ?? `\`${k + 1}.\``} [${x.n}](${site}players/${encodeURIComponent(x.player)}.html) — **${v.toFixed(dec)}**`).join('\n')) : null,
      footer('From Rush results logged by members and confirmed by a manager'),
      buttons([{ label: 'All leaderboards', url: `${site}stats.html` }]),
    ] }));
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
    return reply(message({ blocks: [
      header({ eyebrow: brand('Member profile'), title: `${u.name}${prof?.country ? ` ${flag(prof.country)}` : ''}`, sub: claim ? `Plays as ${claim.player_name} ✅` : 'No verified player yet', thumb: await faceOf(env, id) }),
      prof?.bio ? text(`> ${String(prof.bio).slice(0, 300).replace(/\n/g, '\n> ')}`) : null,
      facts([['🏆 League', pos(prof?.positions)], ['⚡ Rush', pos(prof?.rush_positions)], ['🎮 Platforms', plats.length ? plats.join(' · ') : null]]),
      footer(Object.keys(verified).length ? '✓ = platform verified through Discord' : 'Full profile on the site'),
      buttons([claim && { label: 'Player stats', url: `${site}players/${encodeURIComponent(claim.player)}.html` }, { label: 'Full profile', url: `${site}member.html?u=${encodeURIComponent(id)}` }]),
    ] }));
  }
  if (name === 'awards') {
    if (!flagOn(env, who, 'awards')) return say('🔒 Weekly awards are not switched on yet.');
    if (!can(who, 'awards.vote')) return say('🔒 Members of the NOREX server only.');
    const st = await awardsState(env, me, h.load);
    const ballot = st.categories.length ? st.categories.map((c) => `${c.icon} **${c.name}**`).join('\n') : 'No categories yet – a manager adds them in the Squad Hub.';
    const auto = st.stats.map((s) => `${s.icon} **${s.name}** – ${s.how}`).join('\n');
    const last = st.last?.winners.length ? st.last.winners.map((w) => `${w.icon} **${w.name}** — ${w.n ? `[${w.n}](${site}players/${encodeURIComponent(w.k)}.html)` : '–'}`).join('\n') : 'No winners yet.';
    return reply(message({ accent: 'gold', blocks: [
      header({ eyebrow: brand('Weekly awards'), title: `🏆 Weekly awards · ${st.week}`, sub: st.closed ? 'Voting has closed for this week' : `Voting closes ${ts(st.closes)} · ${ts(st.closes, 'R')}` }),
      heading('Vote now'), text(ballot),
      heading('Decided automatically'), text(auto || '–'),
      sep(),
      heading(`Last week’s winners${st.last ? ` · ${st.last.week}` : ''}`),
      ...(await (async () => { // each winner on a row with their face, when the player has been claimed
        const ws = st.last?.winners ?? [], faces = await playerFaces(env, ws.map((w) => w.k));
        return ws.length && faces.size ? ws.slice(0, 6).map((w) => (faces.get(String(w.k)) ? side(`${w.icon} **${w.name}**\n${w.n}`, thumb(faces.get(String(w.k)))) : text(`${w.icon} **${w.name}** — ${w.n || '–'}`))) : [text(last)];
      })()),
      buttons([{ label: 'Vote in the Squad Hub', url: `${site}members.html#awards` }]),
    ] }));
  }
  if (name === 'points') {
    if (!flagOn(env, who, 'points')) return say('🔒 The point system is not switched on for you yet.');
    const u = await one(env, 'SELECT points FROM users WHERE id = ?', me.u);
    const rows = await all(env, 'SELECT category, SUM(delta) AS pts FROM points_log WHERE user_id = ? GROUP BY category', me.u);
    const by = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    for (const r of rows) by[r.category] = r.pts;
    const rank = 1 + (await one(env, 'SELECT COUNT(*) AS n FROM users WHERE points > ?', u?.points ?? 0))?.n;
    const ICON = { match: '🎮', attendance: '🗓️', community: '💬', behaviour: '🤝' };
    const LABEL = { match: 'Match performance', attendance: 'Attendance', community: 'Community', behaviour: 'Behaviour' };
    return reply(message({ ephemeral: true, accent: 'gold', blocks: [
      header({ eyebrow: brand('My points'), title: `⭐ ${u?.points ?? 0} points`, sub: `#${rank} on the club leaderboard`, thumb: await faceOf(env, me.u) }),
      facts(CATEGORIES.map((c) => [`${ICON[c]} ${LABEL[c]}`, `${by[c] ?? 0}`])),
      footer('Only you can see this'),
      buttons([{ label: 'Full breakdown', url: `${site}members.html#points` }]),
    ] }));
  }
  if (name === 'nextevent') {
    if (!flagOn(env, who, 'events')) return say('🔒 The schedule is not switched on yet.');
    const [e] = await nextEvents(env, 1);
    if (!e) return say('🗓️ Nothing scheduled yet.', { flags: 0 });
    return reply(await eventPost(env, e, await rsvpsOf(env, e.id), 'Next up · '));
  }
  if (name === 'feedback') {
    if (!flagOn(env, who, 'feedback')) return say('🔒 Feedback is not switched on yet.');
    const res = await feedbackRoute('/api/feedback/send', 'POST', { to: String(opts.to), kind: opts.kind, text: opts.text }, me, env, log);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return say(`⚠️ ${d.error ?? 'Could not send that.'}`);
    return done(`${FEEDBACK_KINDS[opts.kind][0]} Sent anonymously`, `${d.left} left today. They’ll never see who sent it.`);
  }
  if (name === 'suggest') {
    if (!flagOn(env, who, 'suggestions')) return say('🔒 The suggestion box is not switched on yet.');
    const res = await knowledgeRoute('/api/suggestions', 'POST', { title: opts.title, body: opts.body, anon: !!opts.anon }, me, env, log);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return say(`⚠️ ${d.error ?? 'Could not add that.'}`);
    return done(`💡 Added to the board: ${opts.title}`, `Vote it up in the Squad Hub: ${site}members.html#suggestions`);
  }
  if (name === 'announce') {
    if (!can(who, 'notify.announce')) return say('🔒 Managers only.');
    const res = await notifyRouteAll('/api/notify/announce', 'POST', { title: opts.title, body: opts.text, ack: !!opts.ack, audience: opts.audience ?? 'all' }, me, env, h.load, log);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return say(`⚠️ ${d.error ?? 'Could not send that.'}`);
    return done(`📣 Sent: ${opts.title}`, `Delivered to ${d.sent} member${d.sent === 1 ? '' : 's'} (Squad Hub bell + Discord DM).`);
  }
  if (name === 'trial') {
    if (!can(who, 'trials.manage')) return say('🔒 Managers only.');
    const { trials } = await trialsState(env, me);
    const q = String(opts.gamertag ?? '').toLowerCase();
    const rows = (q ? trials.filter((t) => t.ea.toLowerCase().includes(q)) : trials).slice(0, 15);
    if (!rows.length) return say(q ? `🤷 No trial cards match "${opts.gamertag}".` : '📋 No open trial cards right now.');
    const ICON = { recommended: '💡', applied: '📨', trialling: '⚽', signed: '✍️', released: '👋', declined: '❌' };
    return reply(message({ ephemeral: true, accent: 'steel', blocks: [
      header({ eyebrow: 'Staff · Trials', title: `📋 Trial cards (${rows.length})`, sub: q ? `Matching “${opts.gamertag}”` : 'Open cards, newest first' }),
      text(rows.map((t) => `${ICON[t.status] ?? '•'} **${t.ea}** — ${t.status}${t.positions.length ? ` · ${t.positions.join('/')}` : ''}`).join('\n')),
      buttons([{ label: 'Decide in the Squad Hub', url: `${site}members.html#trials` }]),
    ] }));
  }
  if (name === 'motm') {
    const club = await h.load('club');
    const m = club.matches[0];
    if (!m) return say('🤷 No matches yet.', { flags: 0 });
    const [doc] = await votesByMatch(env, [m]);
    const v = voteView(m, doc, me);
    const ranked = Object.entries(v.tally).sort((a, b) => b[1] - a[1]);
    const nameOf = (k) => v.players.find((p) => p.k === k)?.n ?? k;
    const board = ranked.length ? ranked.map(([k, n], i) => `${[it('first'), it('second'), it('third')][i] ?? `${i + 1}.`} **${nameOf(k)}** — ${n} vote${n === 1 ? '' : 's'}`).join('\n') : 'No votes yet.';
    return reply(message({ accent: 'gold', blocks: [
      header({ eyebrow: brand('Man of the match vote'), title: `🌟 MOTM · vs ${m.opp}`, sub: `${m.gf}–${m.ga} · ${ranked.reduce((t, [, n]) => t + n, 0)} votes so far`, thumb: m.oppCrest || null }),
      ...(await (async () => { // the top 3 on rows with their faces, the rest as a list
        const faces = await playerFaces(env, ranked.slice(0, 3).map(([k]) => k));
        if (!ranked.length || !faces.size) return [text(board)];
        const rows = ranked.slice(0, 3).map(([k, n], i) => side(`${[it('first'), it('second'), it('third')][i]} **${nameOf(k)}**\n${n} vote${n === 1 ? '' : 's'}`, thumb(faces.get(String(k)))));
        return [...rows, ranked.length > 3 ? text(ranked.slice(3).map(([k, n], i) => `${i + 4}. **${nameOf(k)}** — ${n}`).join('\n')) : null];
      })()),
      buttons([{ label: 'Vote in the Squad Hub', url: `${site}members.html#vote` }, { label: 'Match report', url: m.url }]),
    ] }));
  }
  if (name === 'history') {
    // Full League archive (not just the last 25 in api/club.json) – same numbers as the Stats Centre's own
    // "Head to head" table (scripts/build.mjs), so /history and the site never disagree.
    const q = String(opts.opponent ?? '').toLowerCase();
    const e = (await h.load('h2h')).find((x) => x.n.toLowerCase().includes(q));
    if (!e) return say(`🤷 No matches found against "${opts.opponent}".`, { flags: 0 });
    const gd = e.gf - e.ga;
    return reply(message({ accent: e.w > e.l ? 'win' : e.l > e.w ? 'loss' : 'gold', blocks: [
      header({ eyebrow: brand('Head to head'), title: `⚔️ NOREX vs ${e.n}`, sub: `${e.p} game${e.p === 1 ? '' : 's'} · ${e.w}W ${e.d}D ${e.l}L` }),
      facts([['Goals', `${e.gf}–${e.ga} (${gd >= 0 ? '+' : ''}${gd})`], ['Win rate', `${Math.round(100 * e.w / Math.max(1, e.p))}%`], ['Last meeting', `${e.lastRes} ${e.lastScore}`]]),
      buttons([{ label: 'Head to head on the site', url: `${site}stats.html#h2h` }]),
    ] }));
  }
  return say('Unknown command.');
}
const ORDER = ['GK', 'LWB', 'LB', 'CB', 'LCB', 'RCB', 'RB', 'RWB', 'CDM', 'LDM', 'RDM', 'LM', 'CM', 'LCM', 'RCM', 'RM', 'CAM', 'LAM', 'RAM', 'LW', 'RW', 'CF', 'ST', 'LS', 'RS'];
const SLOT_ORDER = (slot) => { const i = ORDER.indexOf(String(slot).replace(/\d+$/, '')); return i < 0 ? 99 : i; };
function flatOptions(opts = []) { return opts.flatMap((o) => (o.options ? flatOptions(o.options) : [o])); }
