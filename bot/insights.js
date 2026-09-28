// Club Intelligence – server analysis job. Reads the Discord server (members, channels, roles, recent chat) and
// the club's own data (site logins, claims, requests, trials, Rush results, votes, availability, results) and turns
// it into scores, a month-by-month history of how the club has been run, trends and plain-English recommendations.
//
//   /insights (managers, flag `insights`)  fresh report, private reply (reuses one from the last 10 minutes)
//   weekly (cron, Mondays from 09:00 UTC)   collected in small steps over several cron runs, then DMed to the owner
//
// Discord needs DISCORD_BOT_TOKEN plus, in the Discord Developer Portal, **Server Members Intent** (member list)
// and the bot's View Channels + Read Message History permissions (chat activity). Message text is never read –
// only who posted and when. Anything the bot can't see is skipped and explained in the report.
// D1 meta: `insights` (latest report), `insights_hist` (weekly key numbers for trends), `insights_job`, `insights_week`.

const API = 'https://discord.com/api/v10';
const DAY = 86400e3;
const RED = 0xc8352c;
const HIST_KEEP = 26; // weeks of trend history
const CMD_CHANNELS = 30; // channel reads in one /insights (free Workers: 50 outgoing calls per request)
const CRON_CHANNELS = 6; // channel reads per cron run (the cron also checks streams, sends DMs, …)
const REUSE = 10 * 60e3; // /insights reuses a report this fresh
const TEXT = [0, 5]; // text + announcement channels
const snowTs = (id) => (id ? Number(BigInt(id) >> 22n) + 1420070400000 : null);
const month = (ms) => new Date(ms).toISOString().slice(0, 7);
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const clamp = (x) => Math.max(0, Math.min(1, x));
const ids = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

const rows = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results).catch(() => []);
const getMeta = async (env, key) => { try { return JSON.parse(await env.DB.prepare('SELECT value FROM meta WHERE key = ?').bind(key).first('value')); } catch { return null; } };
const setMeta = (env, key, v) => env.DB.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind(key, JSON.stringify(v)).run();

async function dget(env, path) {
  const r = await fetch(API + path, { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } });
  if (r.ok) return r.json();
  const e = await r.json().catch(() => ({}));
  throw new Error(r.status === 403 || e.code === 50001 || e.code === 50013 ? 'no-access' : `discord-${r.status}`);
}

// ---------- collecting ----------
// Step 1 (4 calls): server, channels, roles, members. Returns a job whose `queue` holds the channels to read next.
async function startJob(env, now) {
  const g = env.DISCORD_GUILD_ID;
  const [guild, channels, roles] = await Promise.all([dget(env, `/guilds/${g}?with_counts=true`), dget(env, `/guilds/${g}/channels`), dget(env, `/guilds/${g}/roles`)]);
  let members = null;
  try { members = await dget(env, `/guilds/${g}/members?limit=1000`); } catch (e) { if (e.message !== 'no-access') throw e; }
  const staff = new Set([env.ADMIN_ROLE_ID, env.OWNER_ROLE_ID].filter(Boolean));
  const chans = channels.map((c) => ({ id: c.id, name: c.name, type: c.type, last: snowTs(c.last_message_id) }));
  const count = {};
  const m = members && { humans: 0, bots: 0, joins7: 0, joins30: 0, noRole: 0, byMonth: {}, ids: [], staff: [] };
  for (const x of members ?? []) {
    for (const r of x.roles) count[r] = (count[r] ?? 0) + 1;
    if (x.user?.bot) { m.bots++; continue; }
    const j = Date.parse(x.joined_at);
    m.humans++;
    m.ids.push(x.user.id);
    m.byMonth[month(j)] = (m.byMonth[month(j)] ?? 0) + 1;
    if (j > now - 7 * DAY) m.joins7++;
    if (j > now - 30 * DAY) m.joins30++;
    if (!x.roles.length) m.noRole++;
    if (x.roles.some((r) => staff.has(r)) || ids(env.ADMIN_IDS).includes(x.user.id)) m.staff.push(x.user.id);
  }
  const base = {
    name: guild.name, total: guild.approximate_member_count ?? m?.humans ?? 0, online: guild.approximate_presence_count ?? null,
    boosts: guild.premium_subscription_count ?? 0, verification: guild.verification_level ?? 0, rules: !!guild.rules_channel_id,
    channels: chans, members: m,
    roles: roles.filter((r) => r.id !== g && !r.managed).map((r) => ({ id: r.id, name: r.name, n: members ? count[r.id] ?? 0 : null })),
  };
  // Only channels with a post in the last 30 days are worth reading; the rest are "silent" from last_message_id alone.
  const queue = chans.filter((c) => TEXT.includes(c.type) && c.last > now - 30 * DAY).sort((a, b) => b.last - a.last).map((c) => c.id);
  return { at: now, base, queue, reads: [], p7: [], p30: [] };
}

// Step 2..n: read the newest 100 messages of up to `limit` channels (1 call each). Only authors + times are kept.
async function readChannels(env, job, limit) {
  const t7 = job.at - 7 * DAY, t30 = job.at - 30 * DAY;
  const p7 = new Set(job.p7), p30 = new Set(job.p30);
  const staff = new Set(job.base.members?.staff ?? []);
  for (const id of job.queue.splice(0, limit)) {
    const name = job.base.channels.find((c) => c.id === id)?.name;
    try {
      const msgs = await dget(env, `/channels/${id}/messages?limit=100`);
      let n7 = 0, n30 = 0, staff7 = 0;
      for (const x of msgs) {
        if (x.author?.bot) continue;
        const ts = Date.parse(x.timestamp);
        if (ts >= t30) { n30++; p30.add(x.author.id); }
        if (ts >= t7) { n7++; p7.add(x.author.id); if (staff.has(x.author.id)) staff7++; }
      }
      job.reads.push({ id, name, n7, n30, staff7, full: msgs.length === 100 && Date.parse(msgs.at(-1).timestamp) > t7 });
    } catch (e) {
      job.reads.push({ id, name, err: e.message });
    }
  }
  job.p7 = [...p7];
  job.p30 = [...p30];
  return job;
}

// Everything the club's own database says. Tables from later roadmap items may be missing → empty lists.
async function dbFacts(env, now) {
  const since = now - 180 * DAY;
  const [users, claims, requests, trials, rush, avail, votes, dmOff, events] = await Promise.all([
    rows(env, 'SELECT id, role, first_at, last_at FROM users'),
    rows(env, 'SELECT user_id, player, status, at, decided_by, decided_at FROM claims'),
    rows(env, 'SELECT status, at, decided_by, decided_at FROM requests WHERE at > ?', since),
    rows(env, 'SELECT status, at, updated_at FROM trials'),
    rows(env, 'SELECT status, at, decided_by, decided_at FROM rush_matches WHERE at > ?', since),
    rows(env, 'SELECT date, user_id FROM availability WHERE date >= ?', new Date(now - 7 * DAY).toISOString().slice(0, 10)),
    rows(env, 'SELECT match_id, user_id FROM votes WHERE at > ?', now - 30 * DAY),
    rows(env, 'SELECT user_id FROM notify_prefs WHERE dm_failed_at IS NOT NULL'),
    rows(env, 'SELECT start, status FROM events WHERE start > ?', now - 90 * DAY),
  ]);
  return { users, claims, requests, trials, rush, avail, votes, dmOff: dmOff.length, events };
}

// ---------- analysis (pure – tested directly) ----------
const hours = (list) => { const d = list.filter((x) => x.decided_at && x.at).map((x) => (x.decided_at - x.at) / 36e5); return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null; };
const grade = (s) => (s >= 80 ? '🟢' : s >= 60 ? '🟡' : s >= 40 ? '🟠' : '🔴');
const score = (parts) => { const w = parts.reduce((t, [, x]) => t + x, 0); return Math.round((100 * parts.reduce((t, [v, x]) => t + clamp(v) * x, 0)) / w); };

export function analyse({ job, db, club, players, prev = null, now = Date.now() }) {
  const b = job.base, m = b.members;
  const recs = [];
  const rec = (sev, area, text) => recs.push({ sev, area, text });
  const humans = m?.humans ?? b.total;

  // --- Discord server ---
  const text = b.channels.filter((c) => TEXT.includes(c.type));
  const age = (c) => (c.last ? (now - c.last) / DAY : Infinity);
  const active = text.filter((c) => age(c) <= 7), dead = text.filter((c) => age(c) > 30);
  const reads = job.reads.filter((r) => !r.err);
  const msgs7 = reads.reduce((t, r) => t + r.n7, 0), msgs30 = reads.reduce((t, r) => t + r.n30, 0);
  const staff7 = reads.reduce((t, r) => t + r.staff7, 0);
  const unused = m ? b.roles.filter((r) => r.n === 0) : [];
  const staffN = m?.staff.length ?? null;
  const posting = humans ? job.p7.length / humans : 0;
  const server = {
    humans, online: b.online, boosts: b.boosts, joins7: m?.joins7 ?? null, joins30: m?.joins30 ?? null, noRole: m?.noRole ?? null,
    text: text.length, voice: b.channels.filter((c) => c.type === 2 || c.type === 13).length, active: active.length, dead: dead.map((c) => c.name),
    roles: b.roles.length, unused: unused.map((r) => r.name), staff: staffN, msgs7, msgs30, posters7: job.p7.length, posters30: job.p30.length, staff7,
    top: [...reads].sort((x, y) => y.n7 - x.n7).filter((r) => r.n7).slice(0, 4).map((r) => ({ name: r.name, n: r.n7, full: r.full })),
    unread: job.reads.filter((r) => r.err).map((r) => r.name),
  };
  server.score = score([
    [text.length ? active.length / text.length : 0, 25],
    [posting / 0.3, 30], // 30% of members posting each week = healthy
    [m ? m.joins30 / 3 : 0.5, 20],
    [1 - ((dead.length + unused.length) / Math.max(1, text.length + b.roles.length)) * 2, 15],
    [b.verification >= 1 && b.rules ? 1 : 0.4, 10],
  ]);

  // --- site & members ---
  const inServer = m ? new Set(m.ids) : null;
  const siteUsers = inServer ? db.users.filter((u) => inServer.has(u.id)) : db.users;
  const active7 = db.users.filter((u) => u.last_at > now - 7 * DAY).length, active30 = db.users.filter((u) => u.last_at > now - 30 * DAY).length;
  const squad = players.filter((p) => p.home && p.s?.gp > 0);
  const claimedKeys = new Set(db.claims.filter((c) => c.status === 'approved').map((c) => c.player));
  const squadClaimed = squad.filter((p) => claimedKeys.has(p.k)).length;
  const today = new Date(now).toISOString().slice(0, 10);
  const availUsers = new Set(db.avail.filter((a) => a.date >= today).map((a) => a.user_id)).size;
  const matchVotes = {};
  for (const v of db.votes) matchVotes[v.match_id] = (matchVotes[v.match_id] ?? 0) + 1;
  const recent = (club.matches ?? []).slice(0, 3);
  const votesAvg = recent.length ? recent.reduce((t, x) => t + (matchVotes[x.id] ?? 0), 0) / recent.length : 0;
  const lineup = recent.length ? recent.reduce((t, x) => t + (x.ps?.length ?? 0), 0) / recent.length : 0;
  const site = {
    users: db.users.length, adoption: pct(siteUsers.length, humans), active7, active30,
    new30: db.users.filter((u) => u.first_at > now - 30 * DAY).length, squad: squad.length, squadClaimed, availUsers, votesAvg: Math.round(votesAvg * 10) / 10, dmOff: db.dmOff,
    missing: squad.filter((p) => !claimedKeys.has(p.k)).sort((x, y) => y.s.gp - x.s.gp).slice(0, 5).map((p) => p.n),
  };
  site.score = score([
    [site.adoption / 70, 30],
    [site.users ? active7 / site.users / 0.5 : 0, 25],
    [squad.length ? squadClaimed / squad.length / 0.8 : 0, 20],
    [active30 ? availUsers / active30 / 0.5 : 0, 15],
    [lineup ? votesAvg / lineup / 0.5 : 0.5, 10],
  ]);

  // --- management ---
  const pend = (list) => list.filter((x) => x.status === 'pending');
  const pc = pend(db.claims), pr = pend(db.requests), prush = pend(db.rush);
  const staleTrials = db.trials.filter((t) => ['applied', 'recommended'].includes(t.status) && t.updated_at < now - 7 * DAY);
  const oldest = Math.max(0, ...[...pc, ...pr, ...prush].map((x) => (now - x.at) / DAY));
  const decided = [...db.claims, ...db.requests, ...db.rush].filter((x) => x.decided_at > now - 90 * DAY);
  const resp = hours(decided);
  const by = {};
  for (const x of decided) if (x.decided_by) by[x.decided_by] = (by[x.decided_by] ?? 0) + 1;
  const topShare = decided.length ? Math.max(0, ...Object.values(by)) / decided.length : 0;
  const upcoming = db.events.filter((e) => e.status !== 'cancelled' && e.start > now && e.start < now + 7 * DAY).length;
  const backlog = pc.length + pr.length + prush.length + staleTrials.length;
  const admin = {
    claims: pc.length, requests: pr.length, rush: prush.length, trials: staleTrials.length, oldest: Math.round(oldest * 10) / 10, backlog,
    resp: resp == null ? null : Math.round(resp), decided: decided.length, deciders: Object.keys(by).length, topShare: pct(topShare, 1),
    eventsUsed: db.events.length > 0, upcoming, trialsOpen: db.trials.filter((t) => ['applied', 'trialling', 'recommended'].includes(t.status)).length,
    signed: db.trials.filter((t) => t.status === 'signed').length,
  };
  admin.score = score([
    [1 - backlog / 10, 35],
    [resp == null ? 0.7 : 1 - (resp - 24) / (6 * 24), 35],
    [1 - (oldest - 2) / 12, 15],
    [decided.length < 5 || (staffN ?? 2) < 2 ? 0.8 : topShare <= 0.7 ? 1 : 0.4, 15],
  ]);

  // --- team ---
  const winPct = pct(club.w, club.gp);
  const gdpg = club.gp ? (club.gf - club.ga) / club.gp : 0;
  const form = club.form ?? [];
  const goals = squad.reduce((t, p) => t + (p.s.g ?? 0), 0);
  const scorer = [...squad].sort((x, y) => y.s.g - x.s.g)[0];
  const regulars = squad.filter((p) => p.s.gp >= 3).length;
  const team = {
    gp: club.gp, w: club.w, d: club.d, l: club.l, winPct, gdpg: Math.round(gdpg * 100) / 100, form: form.join(''), streak: club.streak ?? 0,
    division: club.division ?? null, regulars, scorer: scorer ? { n: scorer.n, g: scorer.s.g, share: pct(scorer.s.g, goals) } : null,
  };
  team.score = score([
    [winPct / 70, 40], [(gdpg + 1) / 3, 20], [form.filter((r) => r === 'W').length / Math.max(1, form.length), 20],
    [regulars / 11, 10], [team.scorer ? 1 - (team.scorer.share - 40) / 40 : 0.5, 10],
  ]);

  // --- history: how the club has been run, month by month (last 6 months) ---
  const d0 = new Date(now);
  const history = [...Array(6)].map((_, i) => month(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() - 5 + i, 1))).map((mo) => {
    const dec = [...db.claims, ...db.requests, ...db.rush].filter((x) => x.decided_at && month(x.decided_at) === mo);
    const h = hours(dec);
    return {
      m: mo, joins: m ? m.byMonth[mo] ?? 0 : null, site: db.users.filter((u) => month(u.first_at) === mo).length, decided: dec.length, resp: h == null ? null : Math.round(h),
      rush: db.rush.filter((x) => month(x.at) === mo && x.status !== 'rejected').length, trials: db.trials.filter((t) => month(t.at) === mo).length,
    };
  });

  // --- recommendations: 1 urgent · 2 important · 3 nice to fix · 4 good news ---
  if (!m) rec(1, 'setup', "I can't see the member list. **Discord Developer Portal → your app → Bot → Privileged Gateway Intents → Server Members Intent → on**, then run /insights again.");
  if (server.unread.length) rec(2, 'setup', `I can't read ${server.unread.length} channel(s) (${server.unread.slice(0, 3).map((n) => '#' + n).join(', ')}). Give the bot **View Channel + Read Message History** there to include them.`);
  if (oldest > 7) rec(1, 'admin', `A request has waited **${Math.round(oldest)} days**. Clear the queue in the Manager portal (claims ${pc.length} · requests ${pr.length} · Rush results ${prush.length}).`);
  else if (backlog >= 3) rec(2, 'admin', `**${backlog}** items waiting for a manager (claims ${pc.length} · requests ${pr.length} · Rush ${prush.length} · old trial cards ${staleTrials.length}). Try to clear the portal once a day.`);
  if (resp != null && resp > 48) rec(2, 'admin', `Managers take **${Math.round(resp / 2.4) / 10} days** on average to decide. Aim for under 24 h – turn on Discord DMs for "Manager to-dos" in 🔔 settings.`);
  if (decided.length >= 5 && topShare > 0.8 && (staffN ?? 2) >= 2) rec(2, 'admin', `One manager made **${pct(topShare, 1)}%** of all decisions in 90 days. Share the load: pick a manager per area (claims, Rush, trials).`);
  if (staleTrials.length) rec(2, 'admin', `**${staleTrials.length}** trial / scouting card(s) untouched for 7+ days. Reply or mark them declined so applicants aren't left waiting.`);
  if (admin.eventsUsed && !upcoming) rec(2, 'admin', 'No match night scheduled in the next 7 days. Schedule one in the Squad Hub (🗓️ Schedule) so members can answer early.');
  if (staffN && humans / staffN > 20) rec(3, 'admin', `1 manager per **${Math.round(humans / staffN)}** members. Consider promoting a trusted regular.`);
  if (m && posting < 0.15) rec(2, 'server', `Only **${job.p7.length} of ${humans}** members posted this week. Start a weekly thread (MOTM debate, clip of the week) and @-mention the squad before games.`);
  if (m && m.noRole / Math.max(1, humans) > 0.2) rec(2, 'server', `**${m.noRole}** members have no role. Give new members a role (or set up **Server Settings → Onboarding**) so they see the right channels.`);
  if (m && m.joins30 === 0) rec(2, 'server', 'No new members in 30 days. Share the Apply to Join link on stream, in clips and on the Trials page.');
  if (dead.length) rec(3, 'server', `${dead.length} channel(s) silent for 30+ days: ${dead.slice(0, 4).map((c) => '#' + c.name).join(', ')}. Archive or merge them to keep chat in one place.`);
  if (unused.length >= 2) rec(3, 'server', `${unused.length} roles nobody has: ${unused.slice(0, 4).map((r) => r.name).join(', ')}. Delete or start using them.`);
  if (!b.verification) rec(3, 'server', 'Server verification is off. **Server Settings → Safety Setup → Verification level → Low** keeps spam accounts out.');
  if (!b.rules) rec(3, 'server', 'No rules channel is set. **Server Settings → Safety Setup** (or Community settings) → pick a **Rules channel**.');
  if (staffN && reads.length && !staff7) rec(3, 'server', "Managers haven't posted in chat this week. A quick weekly update from the staff keeps members engaged.");
  if (site.adoption < 50) rec(2, 'site', `Only **${site.adoption}%** of Discord members have logged in to the site. Pin the Squad Hub login link in #welcome and mention it after games.`);
  if (squad.length && squadClaimed / squad.length < 0.6) rec(2, 'site', `**${squad.length - squadClaimed} of ${squad.length}** squad players haven't claimed their EA player${site.missing.length ? ` (e.g. ${site.missing.slice(0, 3).join(', ')})` : ''}. Claimed players get badges, stats and the ✅ Verified role.`);
  if (active30 >= 3 && availUsers / active30 < 0.3) rec(3, 'site', `Only **${availUsers}** members set availability for the coming week. Remind the squad to tick their days in the Squad Hub.`);
  if (lineup && votesAvg / lineup < 0.3) rec(3, 'site', `MOTM votes are low (${site.votesAvg} per match). Post the vote link with each result.`);
  if (db.dmOff >= 2) rec(3, 'site', `**${db.dmOff}** members block DMs from the bot, so they miss alerts. Ask them to turn on **Server name → Privacy Settings → Direct Messages**.`);
  if (club.gp >= 5 && gdpg < 0) rec(2, 'team', `We concede more than we score (${team.gdpg} goal difference per game). Review defending shape and look at the tackle % leaders.`);
  if (form.length >= 5 && form.filter((r) => r === 'W').length <= 1) rec(2, 'team', 'One win or fewer in the last 5. Try a settled line-up and a short tactics chat before the next session.');
  if (team.scorer && team.scorer.share > 45 && goals >= 10) rec(3, 'team', `**${team.scorer.n}** scores ${team.scorer.share}% of our goals. Create chances for others so we're not predictable.`);
  if (regulars < 11 && club.gp >= 10) rec(3, 'team', `Only **${regulars}** players have 3+ games. Recruit to cover every position (Trials page).`);
  const good = [];
  if (resp != null && resp <= 24) good.push(`decisions within ${Math.max(1, Math.round(resp))} h`);
  if (m && posting >= 0.3) good.push('a busy chat');
  if (team.streak >= 3) good.push(`a ${team.streak}-game win streak`);
  if (site.adoption >= 70) good.push(`${site.adoption}% of members on the site`);
  if (good.length) rec(4, 'good', `Keep it up: ${good.join(', ')}.`);
  recs.sort((x, y) => x.sev - y.sev);

  const scores = { server: server.score, site: site.score, admin: admin.score, team: team.score };
  const overall = Math.round((scores.server + scores.site + scores.admin + scores.team) / 4);
  const key = { members: humans, posters7: job.p7.length, msgs7, active7, winPct, backlog, overall };
  return { at: now, guild: b.name, overall, scores, server, site, admin, team, history, recs, key, prev: prev ? { at: prev.at, ...prev.key, scores: prev.scores } : null };
}

// ---------- Discord embeds ----------
const bar = (s) => '▰'.repeat(Math.round(s / 10)) + '▱'.repeat(10 - Math.round(s / 10));
const delta = (now, before) => (before == null || now == null || now === before ? '' : ` (${now > before ? '▲' : '▼'}${Math.abs(now - before)})`);
const SEV = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '✅' };
const AREA = { server: '💬', site: '🌐', admin: '🛡️', team: '⚽', setup: '🔧', good: '🌟' };
const cut = (s, n = 1024) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const fld = (name, value, inline = false) => ({ name, value: cut(value || '–'), inline });
const FORM = { W: '🟩', D: '🟨', L: '🟥' };

export function reportEmbeds(r, site) {
  const p = r.prev, s = r.server, si = r.site, a = r.admin, t = r.team;
  const footer = { text: `${r.guild ?? 'NOREX UNITED'} · Club Intelligence${p ? ` · ▲▼ vs ${new Date(p.at).toISOString().slice(0, 10)}` : ''}` };
  const line = (icon, label, k) => `${grade(r.scores[k])} ${icon} **${label}** \`${bar(r.scores[k])}\` **${r.scores[k]}**${delta(r.scores[k], p?.scores?.[k])}`;
  const pad = (v, n) => String(v).padStart(n);
  const hist = ['Month   Joins Site Done  Resp Rush Trial', ...r.history.map((h) => `${h.m} ${pad(h.joins ?? '–', 5)} ${pad(h.site, 4)} ${pad(h.decided, 4)} ${pad(h.resp == null ? '–' : h.resp + 'h', 5)} ${pad(h.rush, 4)} ${pad(h.trials, 5)}`)].join('\n');
  const embeds = [
    {
      title: `🧠 Club Intelligence – ${grade(r.overall)} ${r.overall}/100${delta(r.overall, p?.overall)}`, color: RED, url: site ? `${site}members.html#manager` : undefined,
      description: [line('💬', 'Discord server', 'server'), line('🌐', 'Site & members', 'site'), line('🛡️', 'Management', 'admin'), line('⚽', 'Team', 'team')].join('\n'),
      fields: [fld('🎯 What to do next', r.recs.slice(0, 8).map((x) => `${SEV[x.sev]} ${AREA[x.area]} ${x.text}`).join('\n') || '✅ Nothing urgent – the club is in good shape.')],
      footer, timestamp: new Date(r.at).toISOString(),
    },
    {
      title: '💬 Discord server', color: RED,
      fields: [
        fld('👥 Members', `**${s.humans}** people${s.online != null ? ` · 🟢 ${s.online} online` : ''}${delta(s.humans, p?.members)}\n${s.joins30 != null ? `➕ ${s.joins7} joined this week · ${s.joins30} in 30 days` : 'Member list hidden (Server Members Intent is off)'}${s.noRole ? `\n🏷️ ${s.noRole} without a role` : ''}${s.staff != null ? `\n🛡️ ${s.staff} staff` : ''}`, true),
        fld('🗨️ Chat (7 days)', `**${s.msgs7}** messages${delta(s.msgs7, p?.msgs7)} by **${s.posters7}** people${delta(s.posters7, p?.posters7)}\n30 days: ${s.msgs30} messages by ${s.posters30} people${s.top.length ? `\n🔥 ${s.top.map((c) => `#${c.name} ${c.n}${c.full ? '+' : ''}`).join(' · ')}` : ''}`, true),
        fld('🗂️ Channels & roles', `${s.text} text · ${s.voice} voice · **${s.active}** active this week${s.dead.length ? `\n💤 Silent 30+ days: ${s.dead.slice(0, 6).map((n) => '#' + n).join(', ')}` : ''}\n🎭 ${s.roles} roles${s.unused.length ? ` · unused: ${s.unused.slice(0, 5).join(', ')}` : ''}${s.boosts ? `\n💎 ${s.boosts} boosts` : ''}`),
      ],
    },
    {
      title: '🌐 Site & members', color: RED,
      fields: [
        fld('🔑 On the site', `**${si.users}** member${si.users === 1 ? '' : 's'} (${si.adoption}% of the server)\n📅 Active: ${si.active7} this week${delta(si.active7, p?.active7)} · ${si.active30} in 30 days\n🆕 ${si.new30} new in 30 days`, true),
        fld('🪪 Squad claimed', `**${si.squadClaimed}/${si.squad}** players with games${si.missing.length ? `\nNot yet: ${si.missing.join(', ')}` : ''}`, true),
        fld('🙋 Taking part', `📆 ${si.availUsers} set availability this week\n⭐ ${si.votesAvg} MOTM votes per match${si.dmOff ? `\n🔕 ${si.dmOff} block bot DMs` : ''}`, true),
      ],
    },
    {
      title: '🛡️ Management', color: RED,
      fields: [
        fld('📥 Waiting now', `🪪 ${a.claims} claims · 📨 ${a.requests} requests\n⚡ ${a.rush} Rush results · 🔭 ${a.trials} old trial cards${a.oldest ? `\n⏳ Oldest: ${a.oldest} days` : ''}`, true),
        fld('⏱️ Last 90 days', `${a.decided} decisions by ${a.deciders} manager(s)${a.resp != null ? `\n⚡ ${a.resp} h average to decide` : ''}${a.decided ? `\n👤 Busiest manager: ${a.topShare}%` : ''}`, true),
        fld('🔭 Recruitment', `${a.trialsOpen} open trial cards · ✍️ ${a.signed} signed${a.eventsUsed ? `\n🗓️ ${a.upcoming} event(s) in the next 7 days` : ''}`, true),
        fld('📜 How the club has been run', '```\n' + hist + '\n```'),
      ],
    },
    {
      title: '⚽ Team', color: RED,
      fields: [
        fld('📊 Record', `**${t.w}W ${t.d}D ${t.l}L** (${t.gp})${t.division ? ` · Div ${t.division}` : ''}\n🏆 ${t.winPct}% wins${delta(t.winPct, p?.winPct)} · ${t.gdpg >= 0 ? '+' : ''}${t.gdpg} GD per game`, true),
        fld('📈 Form (newest last)', `${[...t.form].reverse().map((x) => FORM[x] ?? '').join('') || '–'}${t.streak > 1 ? `\n🔥 ${t.streak} win streak` : ''}`, true),
        fld('👕 Squad', `${t.regulars} regulars (3+ games)${t.scorer ? `\n⚽ ${t.scorer.n}: ${t.scorer.g} goals (${t.scorer.share}%)` : ''}`, true),
      ],
    },
  ];
  // Discord allows 6000 characters over all embeds – drop fields from the end until it fits.
  while (JSON.stringify(embeds).length > 5800) {
    const last = embeds.at(-1);
    if (last.fields?.length > 1) last.fields.pop(); else embeds.pop();
  }
  return embeds;
}

// ---------- running it ----------
async function finish(env, job, loadSite, now) {
  const [db, club, players, hist] = await Promise.all([dbFacts(env, now), loadSite('club'), loadSite('players'), getMeta(env, 'insights_hist')]);
  const list = Array.isArray(hist) ? hist : [];
  const prev = list.filter((h) => h.at < now - 3 * DAY).at(-1) ?? null; // compare with last week, not with a run an hour ago
  const report = analyse({ job, db, club, players, prev, now });
  await setMeta(env, 'insights', report);
  // One trend point per day at most, so repeated /insights runs don't crowd out the weekly history.
  if (!list.length || now - list.at(-1).at > DAY) await setMeta(env, 'insights_hist', [...list, { at: now, key: report.key, scores: report.scores }].slice(-HIST_KEEP));
  return report;
}

// Whole report in one go (the /insights command). Reuses a report from the last 10 minutes.
export async function insightsNow(env, loadSite, now = Date.now()) {
  if (!env.DISCORD_BOT_TOKEN) throw new Error('The bot token is not set up on the Worker yet (GitHub secret DISCORD_BOT_TOKEN).');
  const last = await getMeta(env, 'insights');
  if (last?.at > now - REUSE) return last;
  const job = await readChannels(env, await startJob(env, now), CMD_CHANNELS);
  return finish(env, job, loadSite, now); // channels past the limit (the quietest) are left out
}

const weekKey = (now) => { const d = new Date(now); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

// Weekly report, a few Discord calls per cron run: Monday 09:00 UTC → start, then 6 channels per run, then DM the owner.
export async function insightsCron(env, loadSite, now = Date.now()) {
  if (!env.DB || !env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) return null;
  let job = await getMeta(env, 'insights_job');
  if (!job) {
    const d = new Date(now);
    if (d.getUTCDay() !== 1 || d.getUTCHours() < 9 || (await getMeta(env, 'insights_week')) === weekKey(now)) return null;
    await setMeta(env, 'insights_week', weekKey(now)); // claim the week first – a failing run must not retry every 10 minutes
    await setMeta(env, 'insights_job', await startJob(env, now));
    return 'started';
  }
  if (job.queue.length) {
    await setMeta(env, 'insights_job', await readChannels(env, job, CRON_CHANNELS));
    return 'reading';
  }
  await env.DB.prepare('DELETE FROM meta WHERE key = ?').bind('insights_job').run();
  await dmOwners(env, await finish(env, job, loadSite, now));
  return 'sent';
}

// DMs the report to the owners (ADMIN_IDS + Founder-role members who have logged in to the site).
async function dmOwners(env, report) {
  const owners = new Set([...ids(env.ADMIN_IDS), ...(await rows(env, "SELECT id FROM users WHERE role = 'owner'")).map((r) => r.id)]);
  const site = String(env.SITE_URL || '').replace(/\/?$/, '/');
  const post = (path, body) => fetch(API + path, { method: 'POST', headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  for (const id of [...owners].slice(0, 3)) {
    const ch = await post('/users/@me/channels', { recipient_id: id }).then((r) => r.json()).catch(() => null);
    if (!ch?.id) continue;
    await post(`/channels/${ch.id}/messages`, { content: '📬 **Your weekly Club Intelligence report** – run **/insights** in the server any time for a fresh one.', embeds: reportEmbeds(report, site), allowed_mentions: { parse: [] } })
      .catch((e) => console.log('insights DM failed', e.message));
  }
}
