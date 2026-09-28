// Community badges (roadmap P2.3) and achievements & streaks (P2.3 / P4.3) – one engine for both items.
//   GET  /api/badges?u=               a member's community badges (grouped, givers) + the catalog
//   POST /api/badges                  { to, kind, text? } give · { to, kind, undo: true } take your own back
//   POST /api/badges/remove           { id } the member themself or a manager removes one (kept with removed_at)
//   GET  /api/achievements?u=         all achievements with progress + streak facts; own unseen unlocks in `fresh`
//   POST /api/achievements/seen       the unlock toast was shown
//   GET  /api/achievements/board      points leaderboard (rarity tiers → points)
// Achievements are computed from the League match log (site/api/squad.json, built from the EA archive), EA career
// totals (players.json), confirmed Rush results and member events in D1. Once reached they are stored and never lost.
import { can, flagOn } from './roles.js';
import { notify, safely } from './notify.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const opt = (v) => v ?? undefined;
const DAY = 864e5;
const GIVE_PER_DAY = 15;

// ---------- community badges ----------
export const BADGES = [
  ['wall', '🧱', 'The Wall'], ['sniper', '🎯', 'Sniper'], ['maestro', '🧠', 'Maestro'], ['engine', '🔋', 'Engine'],
  ['speed', '🚀', 'Speed demon'], ['skiller', '🪄', 'Skiller'], ['safe', '🧤', 'Safe hands'], ['leader', '📣', 'Leader'],
  ['clutch', '🧊', 'Ice cold'], ['teammate', '🤝', 'Great teammate'], ['banter', '😂', 'Banter king'], ['nightowl', '🦉', 'Night owl'],
  ['reliable', '⏰', 'Always there'], ['coach', '🎓', 'Coach on the pitch'], ['custom', '✏️', 'Custom'],
].map(([id, icon, name]) => ({ id, icon, name }));
const BADGE = Object.fromEntries(BADGES.map((b) => [b.id, b]));

export async function badgesOf(env, toId, me) {
  const rows = await all(env, 'SELECT id, from_id, from_name, from_avatar, kind, text, at FROM badges WHERE to_id = ? AND removed_at IS NULL ORDER BY at', toId);
  const canRemove = !!me && (me.u === toId || can(me, 'badges.remove'));
  const groups = new Map();
  for (const r of rows) {
    const key = r.kind === 'custom' ? `custom:${String(r.text).toLowerCase()}` : r.kind;
    const b = BADGE[r.kind] ?? BADGE.custom;
    const g = groups.get(key) ?? { kind: r.kind, icon: b.icon, name: r.kind === 'custom' ? r.text : b.name, n: 0, givers: [], last: 0 };
    g.n++; g.last = Math.max(g.last, r.at);
    g.givers.push({ id: r.from_id, n: r.from_name, a: opt(r.from_avatar), ...(canRemove ? { rid: r.id } : {}) });
    if (me && r.from_id === me.u) g.mine = true;
    groups.set(key, g);
  }
  return { badges: [...groups.values()].sort((a, b) => b.n - a.n || b.last - a.last), canRemove };
}

async function giveBadge(env, me, body, log) {
  const to = String(body.to ?? '').slice(0, 24);
  if (to === me.u) return fail("You can't give yourself a badge.");
  const target = await one(env, 'SELECT id, name FROM users WHERE id = ?', to);
  if (!target) return fail('Member not found', 404);
  const kind = String(body.kind ?? '');
  if (!BADGE[kind]) return fail('Pick a badge from the list.');
  const mine = await all(env, 'SELECT id, text, removed_at, removed_by FROM badges WHERE to_id = ? AND from_id = ? AND kind = ? ORDER BY id DESC', to, me.u, kind);
  if (body.undo) {
    const cur = mine.find((r) => !r.removed_at);
    if (!cur) return fail('You have not given that badge.', 404);
    await run(env, 'UPDATE badges SET removed_at = ?, removed_by = ? WHERE id = ?', Date.now(), me.u, cur.id);
    await log(env, me, 'badge-undo', `${BADGE[kind].name} · ${target.name}`);
    return json(await badgesOf(env, to, me));
  }
  if (!can(me, 'badges.give')) return fail('Members only.', 403);
  const text = kind === 'custom' ? clean(body.text, 24) : null;
  if (kind === 'custom' && text.length < 2) return fail('Write your badge (2–24 characters).');
  if (mine.some((r) => !r.removed_at)) return fail(kind === 'custom' ? 'You already gave them a custom badge – take it back first to change it.' : `You already gave ${target.name} this badge.`, 409);
  if (mine.some((r) => r.removed_by && r.removed_by !== me.u)) return fail('This badge was removed from their profile – you can’t give it again.', 403);
  const recent = (await one(env, 'SELECT COUNT(*) AS n FROM badges WHERE from_id = ? AND at > ?', me.u, Date.now() - DAY)).n;
  if (recent >= GIVE_PER_DAY) return fail(`That’s ${GIVE_PER_DAY} badges today – try again tomorrow.`, 429);
  await run(env, 'INSERT INTO badges (to_id, from_id, from_name, from_avatar, kind, text, at) VALUES (?, ?, ?, ?, ?, ?, ?)', to, me.u, me.n, me.a ?? null, kind, text, Date.now());
  const label = text ?? BADGE[kind].name;
  await log(env, me, 'badge', `${label} → ${target.name}`);
  await safely(notify(env, [to], { type: 'badge', icon: BADGE[kind].icon, title: `${me.n} gave you a badge: ${label}`, link: `member.html?u=${to}` }));
  return json(await badgesOf(env, to, me));
}

// ---------- achievements ----------
export const TIERS = { common: { pts: 10, label: 'Common' }, rare: { pts: 25, label: 'Rare' }, epic: { pts: 50, label: 'Epic' }, legendary: { pts: 100, label: 'Legendary' } };
const TIER_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
// [id, icon, name, how to get it, tier, fact, goal] – fact names are the keys built by factsFor().
export const ACHIEVEMENTS = [
  ['verified', '✅', 'Verified', 'Get your player claim approved', 'common', 'claimed', 1],
  ['profile', '🪪', 'All about me', 'Fill in bio, positions, country and play times', 'common', 'profileDone', 1],
  ['tagged', '🏷️', 'Tagged', 'Add 3 tags to your profile', 'common', 'tags', 3],
  ['debut', '👟', 'Debut', 'Play a League match', 'common', 'apps', 1],
  ['first-goal', '⚽', 'Off the mark', 'Score a League goal', 'common', 'goals', 1],
  ['first-assist', '🅰️', 'Provider', 'Make a League assist', 'common', 'assists', 1],
  ['brace', '✌️', 'Brace', 'Score 2 in one League match', 'common', 'bestGoals', 2],
  ['rush-debut', '⚡', 'Rush debut', 'Play a confirmed Rush match', 'common', 'rushApps', 1],
  ['voter', '🗳️', 'Voice of the squad', 'Cast 10 MOTM votes', 'common', 'votes', 10],
  ['in-10', '📅', 'Reliable', 'Say “I’m in” on 10 days', 'common', 'yesDays', 10],
  ['team-spirit', '🎁', 'Team spirit', 'Give badges to 5 teammates', 'common', 'gave', 5],
  ['motm-5', '⭐', 'Star man', '5 Man of the Match awards', 'rare', 'motm', 5],
  ['apps-50', '🎽', 'Regular', '50 appearances', 'rare', 'apps', 50],
  ['goals-25', '🎯', 'Marksman', '25 goals', 'rare', 'goals', 25],
  ['assists-25', '🧠', 'Playmaker', '25 assists', 'rare', 'assists', 25],
  ['unbeaten-5', '🛡️', 'Hard to beat', '5 League games unbeaten in a row', 'rare', 'unbeaten', 5],
  ['rating-9', '💎', 'Masterclass', 'A 9.0+ match rating', 'rare', 'bestRating', 9],
  ['week-4', '🔥', 'Every week', '“I’m in” 4 weeks in a row', 'rare', 'weekStreak', 4],
  ['loved', '🎖️', 'Fan favourite', 'Badges from 5 different teammates', 'rare', 'givers', 5],
  ['rush-10', '🏃', 'Rush regular', '10 confirmed Rush matches', 'rare', 'rushApps', 10],
  ['rush-hat', '🌪️', 'Rush hat-trick', 'Score 3 in one Rush match', 'rare', 'rushBestGoals', 3],
  ['hat-trick', '🎩', 'Hat-trick hero', 'Score 3 in one League match', 'epic', 'bestGoals', 3],
  ['apps-100', '💯', 'Centurion', '100 appearances', 'epic', 'apps', 100],
  ['goals-50', '🚀', 'Goal machine', '50 goals', 'epic', 'goals', 50],
  ['motm-15', '🌟', 'Talisman', '15 Man of the Match awards', 'epic', 'motm', 15],
  ['unbeaten-10', '🧱', 'Unbeatable', '10 League games unbeaten in a row', 'epic', 'unbeaten', 10],
  ['wins-5', '📈', 'On a roll', '5 League wins in a row', 'epic', 'winStreak', 5],
  ['golden-boot', '👢', 'Golden Boot', 'Top scorer of a month', 'epic', 'bootMonths', 1],
  ['week-12', '🗓️', 'Ever-present', '“I’m in” 12 weeks in a row', 'epic', 'weekStreak', 12],
  ['apps-250', '👑', 'Club legend', '250 appearances', 'legendary', 'apps', 250],
  ['goals-100', '🐐', 'Hundred club', '100 goals', 'legendary', 'goals', 100],
  ['motm-50', '🏆', 'Main character', '50 Man of the Match awards', 'legendary', 'motm', 50],
  ['wins-10', '☄️', 'Unstoppable', '10 League wins in a row', 'legendary', 'winStreak', 10],
].map(([id, icon, name, desc, tier, fact, goal]) => ({ id, icon, name, desc, tier, pts: TIERS[tier].pts, fact, goal }));
const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
export const pointsOf = (ids) => ids.reduce((s, id) => s + (ACH[id]?.pts ?? 0), 0);

// Runs over a list of results (oldest → newest): best + current streak where ok(x) holds.
function streak(list, ok) {
  let cur = 0, best = 0;
  for (const x of list) { cur = ok(x) ? cur + 1 : 0; best = Math.max(best, cur); }
  return { best, cur };
}
// Week number (Monday-based) of a YYYY-MM-DD date – consecutive weeks give consecutive numbers.
const weekOf = (d) => { const t = Date.parse(d + 'T00:00:00Z'); return Math.floor((t - ((new Date(t).getUTCDay() + 6) % 7) * DAY + 3 * DAY) / (7 * DAY)); };
export function weekStreak(dates, today = new Date().toISOString().slice(0, 10)) {
  const ws = [...new Set(dates.map(weekOf))].sort((a, b) => a - b);
  let best = 0, run_ = 0, prev = null;
  for (const w of ws) { run_ = prev !== null && w === prev + 1 ? run_ + 1 : 1; best = Math.max(best, run_); prev = w; }
  const now = weekOf(today);
  return { best, cur: prev !== null && prev >= now - 1 ? run_ : 0 };
}

// League facts from one player's match log (rows follow squad.json `cols`, oldest → newest).
export function leagueFacts(rows, cols) {
  const c = Object.fromEntries(cols.map((k, i) => [k, i]));
  const ms = rows.map((r) => ({ res: r[c.res], g: r[c.g], a: r[c.a], r: r[c.r], motm: r[c.motm] }));
  const unb = streak(ms, (m) => m.res !== 'L'), wins = streak(ms, (m) => m.res === 'W'), scoring = streak(ms, (m) => m.g > 0);
  return {
    apps: ms.length, goals: ms.reduce((s, m) => s + m.g, 0), assists: ms.reduce((s, m) => s + m.a, 0), motm: ms.filter((m) => m.motm).length,
    bestGoals: Math.max(0, ...ms.map((m) => m.g)), bestAssists: Math.max(0, ...ms.map((m) => m.a)), bestRating: Math.max(0, ...ms.map((m) => m.r || 0)),
    unbeaten: unb.best, unbeatenNow: unb.cur, winStreak: wins.best, winsNow: wins.cur, scoring: scoring.best, scoringNow: scoring.cur,
  };
}

// Months (before the current one) where a player was the squad's top League scorer. Ties share it.
export function goldenBoots(squad, thisMonth = new Date().toISOString().slice(0, 7)) {
  const c = squad.cols.indexOf('ts'), g = squad.cols.indexOf('g');
  const by = new Map();
  for (const [k, rows] of Object.entries(squad.players ?? {})) for (const r of rows) {
    const m = new Date(r[c] * 1000).toISOString().slice(0, 7);
    if (m >= thisMonth) continue;
    const t = by.get(m) ?? new Map();
    t.set(k, (t.get(k) ?? 0) + r[g]);
    by.set(m, t);
  }
  const out = new Map();
  for (const t of by.values()) {
    const top = Math.max(...t.values());
    if (top > 0) for (const [k, n] of t) if (n === top) out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

// Every member's facts (one pass of grouped queries – cheap at squad size).
export async function allFacts(env, loadSite) {
  const [users, claims, votes, yes, gave, got, profiles, rush, squad, players] = await Promise.all([
    all(env, 'SELECT id, name, avatar FROM users'),
    all(env, "SELECT user_id, player, player_name FROM claims WHERE status = 'approved'"),
    all(env, 'SELECT user_id, COUNT(*) AS n FROM votes GROUP BY user_id'),
    all(env, "SELECT user_id, date FROM availability WHERE status = 'yes'"),
    all(env, 'SELECT from_id AS id, COUNT(DISTINCT to_id) AS n FROM badges WHERE removed_at IS NULL GROUP BY from_id'),
    all(env, 'SELECT to_id AS id, COUNT(DISTINCT from_id) AS n FROM badges WHERE removed_at IS NULL GROUP BY to_id'),
    all(env, 'SELECT user_id, bio, positions, tz, play_times, country, tags FROM profiles'),
    all(env, "SELECT rp.player, rp.goals, rp.assists, rp.motm, m.gf, m.ga, m.date, m.id FROM rush_players rp JOIN rush_matches m ON m.id = rp.match_id WHERE m.status = 'confirmed' AND rp.player != '' ORDER BY m.date, m.id"),
    loadSite('squad').catch(() => ({ cols: [], players: {} })),
    loadSite('players').catch(() => []),
  ]);
  const map = (rows, key = 'user_id', val = 'n') => new Map(rows.map((r) => [r[key], r[val]]));
  const claimOf = new Map(claims.map((r) => [r.user_id, r]));
  const voteN = map(votes), gaveN = map(gave, 'id'), gotN = map(got, 'id');
  const yesBy = new Map();
  for (const r of yes) { if (!yesBy.has(r.user_id)) yesBy.set(r.user_id, []); yesBy.get(r.user_id).push(r.date); }
  const profOf = new Map(profiles.map((r) => [r.user_id, r]));
  const rushBy = new Map();
  for (const r of rush) { if (!rushBy.has(r.player)) rushBy.set(r.player, []); rushBy.get(r.player).push(r); }
  const car = new Map(players.map((p) => [p.k, p.car]));
  const boots = goldenBoots(squad);
  const out = new Map();
  for (const u of users) {
    const cl = claimOf.get(u.id), k = cl?.player;
    const lf = leagueFacts(k ? squad.players?.[k] ?? [] : [], squad.cols ?? []);
    const cr = (k && car.get(k)) || {};
    const pr = profOf.get(u.id);
    const len = (s) => { try { return JSON.parse(s || '[]').length; } catch { return 0; } };
    const rs = rushBy.get(k) ?? [];
    const wk = weekStreak(yesBy.get(u.id) ?? []);
    out.set(u.id, {
      id: u.id, n: u.name, a: opt(u.avatar), player: opt(k), playerName: opt(cl?.player_name),
      ...lf,
      // EA career totals cover games from before our archive started – take whichever is higher.
      apps: Math.max(lf.apps, cr.gp || 0), goals: Math.max(lf.goals, cr.g || 0), assists: Math.max(lf.assists, cr.a || 0), motm: Math.max(lf.motm, cr.m || 0),
      claimed: cl ? 1 : 0, tags: len(pr?.tags), profileDone: pr && pr.bio && len(pr.positions) && pr.country && pr.tz && pr.play_times ? 1 : 0,
      votes: voteN.get(u.id) ?? 0, yesDays: yesBy.get(u.id)?.length ?? 0, weekStreak: wk.best, weekNow: wk.cur,
      gave: gaveN.get(u.id) ?? 0, givers: gotN.get(u.id) ?? 0,
      rushApps: rs.length, rushGoals: rs.reduce((s, r) => s + r.goals, 0), rushBestGoals: Math.max(0, ...rs.map((r) => r.goals)), rushMotm: rs.filter((r) => r.motm).length,
      bootMonths: k ? boots.get(k) ?? 0 : 0,
    });
  }
  return out;
}

export const evaluate = (f) => ACHIEVEMENTS.map((a) => ({ id: a.id, v: Math.min(f[a.fact] ?? 0, a.goal), done: (f[a.fact] ?? 0) >= a.goal }));

// Computes everyone, stores new unlocks, notifies members about unlocks after their first (quiet) batch.
export async function syncAchievements(env, loadSite) {
  const facts = await allFacts(env, loadSite);
  const stored = await all(env, 'SELECT user_id, id, at, seen FROM achievements');
  const have = new Map();
  for (const r of stored) { if (!have.has(r.user_id)) have.set(r.user_id, new Map()); have.get(r.user_id).set(r.id, r); }
  const now = Date.now(), stmts = [], news = [];
  for (const [uid, f] of facts) {
    const mine = have.get(uid) ?? new Map();
    const fresh = evaluate(f).filter((x) => x.done && !mine.has(x.id)).map((x) => x.id);
    if (!fresh.length) continue;
    for (const id of fresh) { stmts.push(env.DB.prepare('INSERT OR IGNORE INTO achievements (user_id, id, at, seen) VALUES (?, ?, ?, 0)').bind(uid, id, now)); mine.set(id, { id, at: now, seen: 0 }); }
    have.set(uid, mine);
    if (mine.size > fresh.length) news.push([uid, fresh]); // not their first batch → tell them
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  for (const [uid, ids] of news) {
    const a = ACH[ids[0]];
    await safely(notify(env, [uid], { type: 'badge', icon: a.icon, title: ids.length > 1 ? `${ids.length} achievements unlocked – ${a.name} and more` : `Achievement unlocked: ${a.name}`, body: ids.length > 1 ? null : a.desc, link: 'members.html#stats' }));
  }
  return { facts, have };
}

const FACT_KEYS = ['apps', 'goals', 'assists', 'motm', 'bestGoals', 'bestAssists', 'bestRating', 'unbeaten', 'unbeatenNow', 'winStreak', 'winsNow', 'scoring', 'scoringNow', 'votes', 'yesDays', 'weekStreak', 'weekNow', 'gave', 'givers', 'rushApps', 'rushGoals', 'rushBestGoals', 'rushMotm', 'bootMonths'];
function achievementsView(f, mine, isMe) {
  const got = mine ?? new Map();
  const list = evaluate(f).map((x) => { const a = ACH[x.id]; const s = got.get(x.id); return { ...a, v: x.v, done: !!s, at: s?.at, fresh: isMe && s && !s.seen ? true : undefined }; });
  const done = list.filter((x) => x.done);
  const tiers = Object.fromEntries(Object.keys(TIERS).map((t) => [t, done.filter((x) => x.tier === t).length]));
  return { pts: pointsOf(done.map((x) => x.id)), count: done.length, total: list.length, tiers, list, facts: Object.fromEntries(FACT_KEYS.map((k) => [k, f[k] ?? 0])) };
}

// Hover card / profile summary from the stored rows only (no recompute).
export async function achSummary(env, userId) {
  const rows = await all(env, 'SELECT id, at FROM achievements WHERE user_id = ?', userId);
  const ids = rows.map((r) => r.id).filter((id) => ACH[id]);
  const top = ids.map((id) => ACH[id]).sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]).slice(0, 4).map((a) => ({ icon: a.icon, name: a.name, tier: a.tier }));
  return { pts: pointsOf(ids), count: ids.length, total: ACHIEVEMENTS.length, top };
}

// ---------- routes (behind login; called from members.js route()) ----------
export async function badgesRoute(p, method, body, me, env, loadSite, log, url) {
  if (p === '/api/badges' || p === '/api/badges/remove') {
    if (!flagOn(env, me, 'badges')) return fail('Not available yet.', 404);
    if (method === 'GET' && p === '/api/badges') {
      const u = String(url?.searchParams.get('u') || me.u).slice(0, 24);
      return json({ ...(await badgesOf(env, u, me)), catalog: BADGES, canGive: can(me, 'badges.give') && u !== me.u });
    }
    if (method !== 'POST') return fail('Not found', 404);
    if (p === '/api/badges') return giveBadge(env, me, body, log);
    const row = await one(env, 'SELECT * FROM badges WHERE id = ? AND removed_at IS NULL', Number(body.id) || 0);
    if (!row) return fail('Badge not found', 404);
    if (row.to_id !== me.u && !can(me, 'badges.remove')) return fail('Only the member or a manager can remove a badge.', 403);
    await run(env, 'UPDATE badges SET removed_at = ?, removed_by = ? WHERE id = ?', Date.now(), me.u, row.id);
    await log(env, me, 'badge-remove', `${row.kind === 'custom' ? row.text : BADGE[row.kind]?.name ?? row.kind} from ${row.from_name}${row.to_id === me.u ? '' : ` (on ${row.to_id})`}`);
    return json(await badgesOf(env, row.to_id, me));
  }
  if (!p.startsWith('/api/achievements')) return null;
  if (!flagOn(env, me, 'badges')) return fail('Not available yet.', 404);
  if (p === '/api/achievements/seen' && method === 'POST') {
    await run(env, 'UPDATE achievements SET seen = 1 WHERE user_id = ? AND seen = 0', me.u);
    return json({ ok: true });
  }
  if (method !== 'GET') return fail('Not found', 404);
  if (p === '/api/achievements') {
    const u = String(url?.searchParams.get('u') || me.u).slice(0, 24);
    const { facts, have } = await syncAchievements(env, loadSite);
    const f = facts.get(u);
    if (!f) return fail('Member not found', 404);
    return json({ u, n: f.n, player: f.player, playerName: f.playerName, tierInfo: TIERS, ...achievementsView(f, have.get(u), u === me.u) });
  }
  if (p === '/api/achievements/board') {
    const { facts, have } = await syncAchievements(env, loadSite);
    const rows = [...facts.values()].map((f) => {
      const ids = [...(have.get(f.id)?.keys() ?? [])].filter((id) => ACH[id]);
      const top = ids.map((id) => ACH[id]).sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]).slice(0, 5).map((a) => a.icon);
      return { id: f.id, n: f.n, a: f.a, player: f.playerName, pts: pointsOf(ids), count: ids.length, top };
    }).filter((r) => r.pts > 0).sort((a, b) => b.pts - a.pts || b.count - a.count || a.n.localeCompare(b.n));
    return json({ board: rows, total: ACHIEVEMENTS.length, tierInfo: TIERS });
  }
  return fail('Not found', 404);
}
