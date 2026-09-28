// Weekly awards (roadmap P4.1) – merges the MOTM vote idea with Player of the Month.
//   GET  /api/awards                 members: this week's ballot (categories, nominees, my votes, closes at), last week's winners
//   POST /api/awards/vote            members: { category, player } (player null = take my vote back) – changeable until close
//   GET  /api/awards/board           members: recent weeks, all-time wins per award, Player of the Month history
//   GET  /api/awards/player?k=       anyone (flag): a player's trophy cabinet – public player pages + profiles
//   POST /api/awards/category(/remove)  managers: add / retire fun categories ("Most Non-Sleeper")
//   POST /api/awards/settings        managers: Discord channel for the announcement
//   POST /api/awards/close           managers: close this week now (normally the cron closes it Sunday 24:00 UTC)
// closeDue(env) runs on the 10-minute cron: closes finished weeks (vote winners + stat awards from the match log),
// rolls finished months into Player of the Month, tells the winners, posts the results to Discord.
import { can, flagOn } from './roles.js';
import { notify, notifyMembers, safely } from './notify.js';
import { postEmbed } from './docs.js';

const DAY = 86400e3, WEEK = 7 * DAY;
export const STAT_AWARDS = {
  boot: ['👟', 'Golden Boot', 'most goals'], playmaker: ['🎩', 'Playmaker', 'most assists + second assists'],
  ironman: ['🦾', 'Iron Man', 'most appearances'], rising: ['🌱', 'Rising Star', 'best rating among newer players (2+ games)'],
  potm: ['👑', 'Player of the Month', 'most weekly awards in the month'],
};
const GROUPS = ['GK', 'DEF', 'MID', 'FWD', 'any'];
const RED = 0xc8352c;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const marks = (n) => Array(n).fill('?').join(',');
const opt = (v) => v ?? undefined;

// ---------- weeks (ISO, UTC) ----------
export function weekOf(ms) {
  const d = new Date(ms), day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  const thursday = new Date(monday + 3 * DAY), y = thursday.getUTCFullYear();
  const n = Math.floor((thursday - Date.UTC(y, 0, 1)) / WEEK) + 1;
  return { key: `${y}-W${String(n).padStart(2, '0')}`, start: monday, end: monday + WEEK, month: new Date(monday + WEEK - 1).toISOString().slice(0, 7) };
}
const GROUP_OF = (pos) => (pos === 'GK' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(pos) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM', 'MID'].includes(pos) ? 'MID' : pos && pos !== '—' ? 'FWD' : 'any');
const siteJson = (env, file) => fetch(`${String(env.SITE_URL).replace(/\/?$/, '/')}api/${file}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);

// Nominees: the NOREX squad (home players), those who played for us this week first.
async function nominees(env, loadSite, week) {
  const [players, squad] = await Promise.all([loadSite('players').catch(() => []), loadSite('squad').catch(() => null)]);
  const played = new Set(Object.entries(squad?.players ?? {}).filter(([, rows]) => rows.some((r) => r[0] * 1000 >= week.start && r[0] * 1000 < week.end)).map(([k]) => k));
  return players.filter((p) => p.home).map((p) => ({ k: p.k, n: p.n, pos: p.pos, grp: GROUP_OF(p.pos), played: played.has(p.k) }))
    .sort((a, b) => b.played - a.played || a.n.localeCompare(b.n));
}
const categories = (env, activeOnly = true) => all(env, `SELECT * FROM award_categories${activeOnly ? ' WHERE active = 1' : ''} ORDER BY sort, id`);
const catOut = (c) => ({ id: c.id, name: c.name, icon: c.icon, grp: c.grp, builtin: !!c.builtin });
const awardName = (cats, a) => (STAT_AWARDS[a] ? { icon: STAT_AWARDS[a][0], name: STAT_AWARDS[a][1], stat: true } : (() => { const c = cats.find((x) => String(x.id) === String(a)); return c ? { icon: c.icon, name: c.name } : { icon: '🏆', name: 'Award' }; })());
const winnersOut = (rows, cats) => rows.map((w) => ({ period: w.period, award: w.award, ...awardName(cats, w.award), k: w.player, n: w.name, value: w.value }));

async function state(env, me, loadSite) {
  await closeDue(env, loadSite).catch((e) => console.log('awards close failed', e.message)); // in case the cron hasn't yet
  const week = weekOf(Date.now());
  const [cats, mine, voters, lastWeek, closedNow] = await Promise.all([
    categories(env), all(env, 'SELECT category_id, player FROM award_votes WHERE week = ? AND user_id = ?', week.key, me.u),
    one(env, 'SELECT COUNT(DISTINCT user_id) AS n FROM award_votes WHERE week = ?', week.key),
    one(env, 'SELECT * FROM award_weeks WHERE week <= ? ORDER BY week DESC LIMIT 1', week.key),
    one(env, 'SELECT closed_at FROM award_weeks WHERE week = ?', week.key),
  ]);
  const allCats = await categories(env, false);
  const last = lastWeek ? winnersOut(await all(env, 'SELECT * FROM award_winners WHERE period = ? ORDER BY award', lastWeek.week), allCats) : [];
  return {
    week: week.key, start: week.start, closes: week.end, closed: !!closedNow,
    categories: cats.map(catOut), stats: Object.entries(STAT_AWARDS).filter(([k]) => k !== 'potm').map(([k, [icon, name, how]]) => ({ k, icon, name, how })),
    nominees: await nominees(env, loadSite, week), my: Object.fromEntries(mine.map((v) => [v.category_id, v.player])), voters: voters.n,
    last: lastWeek ? { week: lastWeek.week, closedAt: lastWeek.closed_at, winners: last } : null,
    canManage: can(me, 'awards.manage'), channel: opt((await one(env, "SELECT value FROM meta WHERE key = 'awards_channel'"))?.value),
  };
}

// ---------- closing a week ----------
export async function closeWeek(env, week, loadSite) {
  if (await one(env, 'SELECT 1 FROM award_weeks WHERE week = ?', week.key)) return null;
  const [cats, votes, squad, players] = await Promise.all([
    categories(env, false), all(env, 'SELECT category_id, player, COUNT(*) AS n FROM award_votes WHERE week = ? GROUP BY category_id, player', week.key),
    loadSite('squad').catch(() => null), loadSite('players').catch(() => []),
  ]);
  const nameOf = new Map(players.map((p) => [p.k, p.n]));
  const rows = [];
  for (const c of cats) {
    const vs = votes.filter((v) => v.category_id === c.id), top = Math.max(0, ...vs.map((v) => v.n));
    if (top) for (const v of vs.filter((x) => x.n === top)) rows.push([String(c.id), v.player, top]);
  }
  // Stat awards from the match log (api/squad.json: cols ts,res,g,a,r,motm,…,dri,sa – see build.mjs SQUAD_COLS).
  const col = Object.fromEntries((squad?.cols ?? []).map((c, i) => [c, i]));
  const lines = Object.entries(squad?.players ?? {}).map(([k, list]) => {
    const wk = list.filter((r) => r[col.ts] * 1000 >= week.start && r[col.ts] * 1000 < week.end);
    const rs = wk.map((r) => r[col.r]).filter((x) => x > 0);
    return { k, gp: wk.length, g: wk.reduce((s, r) => s + (r[col.g] ?? 0), 0), ga: wk.reduce((s, r) => s + (r[col.a] ?? 0) + (r[col.sa] ?? 0), 0), r: rs.length ? rs.reduce((s, x) => s + x, 0) / rs.length : 0, first: Math.min(...list.map((r) => r[col.ts] * 1000)) };
  }).filter((x) => x.gp);
  const best = (key, val, ok = () => true) => { const c = lines.filter(ok); const top = Math.max(0, ...c.map(val)); if (top > 0) for (const x of c.filter((y) => val(y) === top)) rows.push([key, x.k, Math.round(top * 100) / 100]); };
  best('boot', (x) => x.g); best('playmaker', (x) => x.ga); best('ironman', (x) => x.gp);
  best('rising', (x) => Math.round(x.r * 10) / 10, (x) => x.gp >= 2 && week.end - x.first < 60 * DAY);
  const at = Date.now();
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO award_weeks (week, month, closed_at) VALUES (?, ?, ?)').bind(week.key, week.month, at),
    ...rows.map(([award, k, value]) => env.DB.prepare('INSERT OR IGNORE INTO award_winners (period, award, player, name, value, at) VALUES (?, ?, ?, ?, ?, ?)').bind(week.key, award, k, nameOf.get(k) ?? k, value, at)),
  ]);
  return { week: week.key, winners: rows.length };
}
// Player of the Month: most awards over the month's closed weeks (a vote win counts 1, a stat award ½; ties → most votes).
async function rollMonths(env) {
  const current = weekOf(Date.now()).month;
  const months = await all(env, "SELECT DISTINCT month FROM award_weeks WHERE month < ? AND ('M' || month) NOT IN (SELECT DISTINCT period FROM award_winners WHERE award = 'potm')", current);
  for (const { month } of months) {
    const rows = await all(env, `SELECT w.player, MAX(w.name) AS name, SUM(CASE WHEN w.award GLOB '[0-9]*' THEN 1 ELSE 0.5 END) AS pts, SUM(CASE WHEN w.award GLOB '[0-9]*' THEN w.value ELSE 0 END) AS votes
      FROM award_winners w JOIN award_weeks k ON k.week = w.period WHERE k.month = ? GROUP BY w.player`, month);
    const top = Math.max(0, ...rows.map((r) => r.pts));
    const best = rows.filter((r) => r.pts === top), most = Math.max(0, ...best.map((r) => r.votes));
    const crowned = top ? best.filter((r) => r.votes === most) : [];
    // A month with no winners still gets a marker row so it isn't re-checked every run.
    const list = crowned.length ? crowned.map((r) => [r.player, r.name, r.pts]) : [['', '', 0]];
    await env.DB.batch(list.map(([k, n, v]) => env.DB.prepare("INSERT OR IGNORE INTO award_winners (period, award, player, name, value, at) VALUES (?, 'potm', ?, ?, ?, ?)").bind(`M${month}`, k, n, v, Date.now())));
  }
  return months.length;
}
// Cron + lazy: close every finished week that has votes or matches, then roll up months and announce.
export async function closeDue(env, loadSite = (f) => siteJson(env, f)) {
  if (!env.DB) return { closed: 0 };
  const now = weekOf(Date.now());
  const last = weekOf(Date.now() - WEEK);
  const candidates = [...new Set([last.key, ...(await all(env, 'SELECT DISTINCT week FROM award_votes WHERE week < ?', now.key)).map((r) => r.week)])];
  let closed = 0;
  for (const key of candidates) {
    const [y, w] = key.split('-W').map(Number);
    const jan4 = Date.UTC(y, 0, 4), week = weekOf(jan4 + (w - 1) * WEEK);
    if (week.end > Date.now()) continue;
    if (await closeWeek(env, week, loadSite)) closed++;
  }
  if (closed) await rollMonths(env);
  if (closed) await safely(announce(env, loadSite));
  return { closed };
}
// Tell the winners (members with an approved claim on the player), everyone else gets "the awards are in".
async function announce(env, loadSite) {
  const rows = await all(env, 'SELECT * FROM award_weeks WHERE posted_at IS NULL ORDER BY week');
  if (!rows.length) return;
  const cats = await categories(env, false);
  for (const wk of rows) {
    await run(env, 'UPDATE award_weeks SET posted_at = ? WHERE week = ?', Date.now(), wk.week);
    const winners = winnersOut(await all(env, "SELECT * FROM award_winners WHERE period = ? AND player != ''", wk.week), cats);
    if (!winners.length) continue;
    const claims = await all(env, `SELECT user_id, player FROM claims WHERE status = 'approved' AND player IN (${marks(winners.length)})`, ...winners.map((w) => w.k));
    for (const c of claims) {
      const mine = winners.filter((w) => w.k === c.player).map((w) => `${w.icon} ${w.name}`);
      await safely(notify(env, [c.user_id], { type: 'award', icon: '🏆', title: `You won ${mine.join(', ')} – week ${wk.week.split('-W')[1]}`, link: 'members.html#awards' }));
    }
    await safely(notifyMembers(env, { type: 'award', title: `🏆 The week ${wk.week.split('-W')[1]} awards are in – watch the reveal`, link: 'members.html#awards' }));
    const channel = (await one(env, "SELECT value FROM meta WHERE key = 'awards_channel'"))?.value;
    if (channel && env.DISCORD_BOT_TOKEN) {
      const site = String(env.SITE_URL || '').replace(/\/?$/, '/');
      const byAward = new Map();
      for (const w of winners) (byAward.get(w.award) ?? byAward.set(w.award, { ...w, names: [] }).get(w.award)).names.push(`[${w.n}](${site}players/${encodeURIComponent(w.k)}.html)`);
      const potm = winnersOut(await all(env, "SELECT * FROM award_winners WHERE period = ? AND award = 'potm' AND player != ''", `M${wk.month}`), cats);
      await postEmbed(env, channel, '', { embeds: [{
        title: `🏆 Weekly awards · week ${wk.week.split('-W')[1]}`, url: `${site}members.html#awards`, color: RED,
        description: [...byAward.values()].map((a) => `${a.icon} **${a.name}** — ${a.names.join(', ')}${a.stat ? '' : ` (${a.value} vote${a.value === 1 ? '' : 's'})`}`).join('\n').slice(0, 3900),
        ...(potm.length && wk.month < weekOf(Date.now()).month ? { fields: [{ name: `👑 Player of the Month · ${wk.month}`, value: potm.map((p) => p.n).join(', ') }] } : {}),
        footer: { text: 'NOREX UNITED · vote for this week in the Squad Hub' },
      }] });
    }
  }
}

// ---------- boards + trophy cabinet ----------
async function board(env) {
  const cats = await categories(env, false);
  const [recent, totals, potm] = await Promise.all([
    all(env, "SELECT * FROM award_winners WHERE period GLOB '[0-9]*-W*' AND period IN (SELECT week FROM award_weeks ORDER BY week DESC LIMIT 12) ORDER BY period DESC"),
    all(env, "SELECT award, player, MAX(name) AS name, COUNT(*) AS wins FROM award_winners WHERE player != '' GROUP BY award, player"),
    all(env, "SELECT * FROM award_winners WHERE award = 'potm' AND player != '' ORDER BY period DESC LIMIT 24"),
  ]);
  const weeks = [...new Set(recent.map((r) => r.period))].map((w) => ({ week: w, winners: winnersOut(recent.filter((r) => r.period === w), cats) }));
  const awards = [...new Set(totals.map((t) => t.award))].map((a) => ({ award: a, ...awardName(cats, a), top: totals.filter((t) => t.award === a).sort((x, y) => y.wins - x.wins).slice(0, 10).map((t) => ({ k: t.player, n: t.name, wins: t.wins })) }));
  const cabinet = new Map();
  for (const t of totals) { const c = cabinet.get(t.player) ?? { k: t.player, n: t.name, wins: 0 }; c.wins += t.wins; cabinet.set(t.player, c); }
  return { weeks, awards, potm: winnersOut(potm, cats), overall: [...cabinet.values()].sort((a, b) => b.wins - a.wins).slice(0, 10) };
}
export async function trophies(env, k) {
  const cats = await categories(env, false);
  const rows = await all(env, 'SELECT * FROM award_winners WHERE player = ? ORDER BY period DESC LIMIT 200', String(k ?? ''));
  const list = winnersOut(rows, cats);
  const count = new Map();
  for (const w of list) { const key = String(w.award); const c = count.get(key) ?? { award: key, icon: w.icon, name: w.name, n: 0 }; c.n++; count.set(key, c); }
  return { k: String(k ?? ''), total: list.length, counts: [...count.values()].sort((a, b) => b.n - a.n), recent: list.slice(0, 12) };
}

// ---------- routes ----------
export async function awardsRoute(p, method, body, me, env, loadSite, log, url) {
  if (p !== '/api/awards' && !p.startsWith('/api/awards/')) return null;
  if (!flagOn(env, me, 'awards')) return fail('Not available yet.', 404);
  if (p === '/api/awards/player' && method === 'GET') return json(await trophies(env, url?.searchParams.get('k')));
  if (!can(me, 'awards.vote')) return fail('Members only.', 403);
  if (p === '/api/awards' && method === 'GET') return json(await state(env, me, loadSite));
  if (p === '/api/awards/board' && method === 'GET') return json(await board(env));
  if (method !== 'POST') return fail('Not found', 404);
  const week = weekOf(Date.now());
  if (p === '/api/awards/vote') {
    if (await one(env, 'SELECT 1 FROM award_weeks WHERE week = ?', week.key)) return fail('This week’s voting is closed – the next ballot opens Monday.', 409);
    const cat = await one(env, 'SELECT * FROM award_categories WHERE id = ? AND active = 1', Number(body.category) || 0);
    if (!cat) return fail('Pick an award.');
    if (body.player == null || body.player === '') {
      await run(env, 'DELETE FROM award_votes WHERE week = ? AND category_id = ? AND user_id = ?', week.key, cat.id, me.u);
      return json(await state(env, me, loadSite));
    }
    const pl = (await loadSite('players')).find((x) => x.k === String(body.player) && x.home);
    if (!pl) return fail('Pick a NOREX player.');
    if ((await one(env, "SELECT player FROM claims WHERE user_id = ? AND status = 'approved'", me.u))?.player === pl.k) return fail('No voting for yourself 😉');
    await run(env, `INSERT INTO award_votes (week, category_id, user_id, player, at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (week, category_id, user_id) DO UPDATE SET player = excluded.player, at = excluded.at`, week.key, cat.id, me.u, pl.k, Date.now());
    await log(env, me, 'award-vote', `${cat.name} → ${pl.n}`);
    return json(await state(env, me, loadSite));
  }
  if (!can(me, 'awards.manage')) return fail('Managers only.', 403);
  if (p === '/api/awards/category') {
    const name = clean(body.name, 40);
    if (name.length < 3) return fail('Name the award (3+ characters).');
    if (!GROUPS.includes(body.grp ?? 'any')) return fail('Pick who can be nominated.');
    if ((await one(env, 'SELECT COUNT(*) AS n FROM award_categories WHERE active = 1 AND builtin = 0')).n >= 8) return fail('That’s 8 fun awards – retire one first.', 429);
    const icon = [...String(body.icon ?? '').trim()].slice(0, 2).join('') || '🏅';
    await run(env, 'INSERT INTO award_categories (name, icon, grp, sort, by_name, at) VALUES (?, ?, ?, 20, ?, ?)', name, icon, body.grp ?? 'any', me.n, Date.now());
    await log(env, me, 'award-category', name);
    return json(await state(env, me, loadSite));
  }
  if (p === '/api/awards/category/remove') {
    const r = await run(env, 'UPDATE award_categories SET active = 0 WHERE id = ? AND builtin = 0', Number(body.id) || 0);
    if (!r.meta?.changes) return fail('Built-in awards stay – only fun awards can be retired.', 409);
    await log(env, me, 'award-category-remove', String(body.id));
    return json(await state(env, me, loadSite));
  }
  if (p === '/api/awards/settings') {
    const ch = String(body.channel ?? '');
    if (ch && !/^\d{5,25}$/.test(ch)) return fail('Pick a channel.');
    await run(env, ch ? "INSERT INTO meta (key, value) VALUES ('awards_channel', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value" : "DELETE FROM meta WHERE key = 'awards_channel' AND ? = ''", ch);
    return json(await state(env, me, loadSite));
  }
  if (p === '/api/awards/close') {
    const r = await closeWeek(env, week, loadSite);
    if (!r) return fail('This week is already closed.', 409);
    await rollMonths(env);
    await safely(announce(env, loadSite));
    await log(env, me, 'award-close', `${week.key} · ${r.winners} winners`);
    return json(await state(env, me, loadSite));
  }
  return fail('Not found', 404);
}
