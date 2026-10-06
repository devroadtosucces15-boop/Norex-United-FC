// BE9 Insights engine (board 12, flag `statInsights`) – a registry of per-stat fact packs (club form,
// the latest match, every home-squad player's season, the four leaderboards) → an LLM writer → a
// number checker that rejects any figure the model writes that isn't actually in the fact pack.
// Persisted in D1 (`stat_insights`), keyed by a fingerprint of the facts, so an unchanged stat
// never triggers a re-write.
//
// Do not confuse this with `bot/insights.js` (Club Intelligence, board 13, flag `insights` – server/
// site health scores for managers) or `bot/aiinsights.js` (P11.14, flag `aiInsights` – a single
// Workers-AI narrative per player card, cached in KV, no persistence/number-checker/follow-up).
//
//   GET  /api/insights?keys=club,match.latest,player.<k>   tier-gated per row (public/member/private)
//   POST /api/insights/ask      { key, question }          member+, 10/day, answered only from the
//                                 same fact pack the stored insight was written from
//   POST /api/insights/feedback { key, vote: 1|-1 }        member+
//   POST /api/insights/compare  { a, b }                   member+, on demand: head-to-head for two home players
//   key note.<playerKey> (private tier) – a coach's note for one home player, in the registry like player.<k>;
//                                 readable only by that player (approved claim) and managers/owner
//
// refreshStatInsights(env, loadSite) (cron, see worker.js) walks the registry every run; a changed
// fingerprint goes to the JOBS queue (BE0) when it's bound, else writes inline – same graceful
// degrade as the rest of BE0's platform pieces. Uses the Workers AI binding (`AI`, bot/wrangler.toml);
// without it the writer just logs and skips, so the feature never fails the cron or a request.
import { atLeast, can } from './roles.js';
import { TEXT_MODEL } from './aispike.js';

const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const WRITER_MODEL = (env) => env.STAT_INSIGHTS_MODEL || TEXT_MODEL; // Workers AI text model (free allowance on the account) – fact-bounded copy, the number checker catches anything it invents

const WRITER_SYSTEM = 'You write short, upbeat analyst copy for NOREX UNITED FC, an amateur EA FC Pro Clubs team. '
  + 'Club voice: confident, plain-English, a little cheeky, never corporate. No hashtags, no emoji, no markdown. '
  + "Never invent a number, name or event that is not in the facts you're given – if you're unsure, say something "
  + 'qualitative instead of guessing a figure. Reply with ONLY a JSON object, nothing else.';
const ASK_SYSTEM = 'You answer a club member\'s follow-up question about NOREX UNITED FC using ONLY the facts given. '
  + "If the facts don't cover the question, say so plainly instead of guessing. Plain-English, no markdown. "
  + 'Reply with ONLY a JSON object, nothing else.';

// ---------- fact packs ----------
async function clubFacts(loadSite) {
  const c = await loadSite('club');
  const games = c.gp ?? (c.w ?? 0) + (c.d ?? 0) + (c.l ?? 0);
  const winRatePct = games ? Math.round(((c.w ?? 0) / games) * 1000) / 10 : 0;
  return {
    title: 'NOREX UNITED – club form',
    facts: {
      gamesPlayed: games, wins: c.w ?? 0, draws: c.d ?? 0, losses: c.l ?? 0, winRatePct,
      goalsFor: c.gf ?? 0, goalsAgainst: c.ga ?? 0, goalDiff: (c.gf ?? 0) - (c.ga ?? 0),
      streak: c.streak ?? null, last5Results: (c.matches ?? []).slice(0, 5).map((m) => m.res).join(''),
    },
  };
}
// id 'latest' (or none) = the newest result; otherwise a match id from club.json's recent list.
async function matchFacts(loadSite, id = 'latest') {
  const c = await loadSite('club');
  const m = id === 'latest' ? c.matches?.[0] : c.matches?.find((x) => String(x.id) === String(id));
  if (!m) return null;
  const top = [...(m.ps ?? [])].sort((a, b) => (b.r ?? 0) - (a.r ?? 0))[0];
  return {
    title: `Match vs ${m.opp}`,
    facts: {
      opponent: m.opp, result: m.res, goalsFor: m.gf, goalsAgainst: m.ga,
      scorers: (m.scorers ?? []).map((s) => `${s.n} (${s.g})`), motm: m.motm ?? null,
      topRated: top ? `${top.n} (${top.r})` : null,
    },
  };
}
async function playerFacts(loadSite, k) {
  const p = (await loadSite('players')).find((x) => x.k === k && x.home);
  if (!p) return null;
  const s = p.s ?? {};
  return {
    title: `${p.n} – season`,
    facts: {
      position: p.pos, games: s.gp ?? 0, goals: s.g ?? 0, assists: s.a ?? 0, avgRating: s.r ?? null,
      motmCount: s.m ?? 0, passAccuracyPct: s.p ?? null, tacklesPerGame: s.t ?? null, winRatePct: s.w ?? null,
    },
  };
}
// BE9 coach's note – private tier. The player's own season (playerFacts) + where they sit in the squad + what
// managers have written down as that player's *strengths* (D1 `notes`, kind 'player', tag 'strength'). The other
// note tags (issue / trial / general) are managers-only working notes and never reach the writer – a paraphrase
// shown to the player would leak them. Without a D1 binding it degrades to the stats-only pack.
const NOTE_LIMIT = 5, NOTE_CHARS = 200;
async function noteFacts(env, loadSite, k) {
  const base = await playerFacts(loadSite, k);
  if (!base?.facts.games) return null; // no league games yet – nothing to write about (registryKeys skips them too)
  const home = (await loadSite('players')).filter((p) => p.home && (p.s?.gp ?? 0) > 0);
  const rankBy = (field) => {
    const mine = home.find((p) => p.k === k)?.s?.[field];
    return mine == null ? null : home.filter((p) => (p.s?.[field] ?? 0) > mine).length + 1;
  };
  const rows = env?.DB ? (await env.DB.prepare("SELECT text FROM notes WHERE kind = 'player' AND subject = ? AND tag = 'strength' ORDER BY id DESC LIMIT ?").bind(k, NOTE_LIMIT).all()).results ?? [] : [];
  const coachStrengths = rows.map((r) => String(r.text ?? '').trim().slice(0, NOTE_CHARS)).filter(Boolean);
  return {
    title: `${base.title.replace(/ – season$/, '')} – coach's note`,
    facts: { ...base.facts, squadSize: home.length, goalsRank: rankBy('g'), ratingRank: rankBy('r'), coachStrengths },
  };
}
// BE9 last-5: the five most recent league results as a run – record, goals, clean sheets, who scored, newest first.
async function last5Facts(loadSite) {
  const ms = ((await loadSite('club')).matches ?? []).slice(0, 5);
  if (!ms.length) return null;
  const count = (r) => ms.filter((m) => m.res === r).length;
  const scorers = new Map();
  for (const m of ms) for (const s of m.scorers ?? []) scorers.set(s.n, (scorers.get(s.n) ?? 0) + (s.g ?? 0));
  const topScorers = [...scorers].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, goals]) => ({ name, goals }));
  return {
    title: `Last ${ms.length} matches`,
    facts: {
      matches: ms.length, wins: count('W'), draws: count('D'), losses: count('L'),
      goalsFor: ms.reduce((n, m) => n + (m.gf ?? 0), 0), goalsAgainst: ms.reduce((n, m) => n + (m.ga ?? 0), 0),
      cleanSheets: ms.filter((m) => m.ga === 0).length, results: ms.map((m) => m.res).join(''),
      scores: ms.map((m) => `${m.opp} ${m.gf}-${m.ga}`), topScorers,
    },
  };
}
// BE9 head-to-head vs one opponent club (site `h2h.json`, keyed by EA club id `o`): the whole record NOREX has
// against them in the archive. Unknown opponent id → null.
async function h2hFacts(loadSite, o) {
  const e = ((await loadSite('h2h')) ?? []).find((x) => String(x.o) === o);
  if (!e) return null;
  return {
    title: `Head to head – ${e.n}`,
    facts: {
      opponent: e.n, played: e.p, wins: e.w, draws: e.d, losses: e.l, goalsFor: e.gf, goalsAgainst: e.ga, goalDiff: e.gf - e.ga,
      lastResult: e.lastRes, lastScore: e.lastScore,
    },
  };
}
// Same stat keys the site's own leaderboards (leaders.html) and compare tool (web/app.js's "compare
// tool" block) already read off each home player's `s` object – mirrored here rather than imported,
// since those are build-time/client helpers with no shared module to pull from.
const LEADER_STATS = { goals: 'g', assists: 'a', rating: 'r', motm: 'm' };
async function leadersFacts(loadSite, stat) {
  const field = LEADER_STATS[stat];
  if (!field) return null;
  const top = (await loadSite('players'))
    .filter((p) => p.home && (p.s?.[field] ?? 0) > 0)
    .sort((a, b) => (b.s?.[field] ?? 0) - (a.s?.[field] ?? 0))
    .slice(0, 5)
    .map((p) => ({ name: p.n, value: p.s?.[field] ?? 0 }));
  if (!top.length) return null;
  return { title: `Leaders – ${stat}`, facts: { stat, top } };
}
// Every key the registry currently covers. Board 12 wants every tile/column/chart/profile stat –
// this slice covers club form, the latest match, every home-squad player's season, and the four
// leaderboards (goals/assists/rating/MOTM), the last-5 run, the head-to-head vs the latest opponent, plus a private coach's note per home player (squad size, not squad²). Player-vs-player pairs are on-demand (statCompareRoute), not in this list.
export const MATCH_CARDS = 3; // result pages that carry an insight: the newest + the two before it
export async function registryKeys(loadSite) {
  const [players, club, h2h] = await Promise.all([loadSite('players'), loadSite('club'), loadSite('h2h').catch(() => null)]);
  const latestOpp = (h2h ?? []).find((e) => e.n === club?.matches?.[0]?.opp); // only the next-talked-about rival is pre-written – the rest of the opponent list isn't
  return ['club', 'match.latest', 'matches.last5', ...(latestOpp ? [`h2h.${latestOpp.o}`] : []), ...Object.keys(LEADER_STATS).map((s) => `leaders.${s}`),
    ...players.filter((p) => p.home).flatMap((p) => [`player.${p.k}`, ...((p.s?.gp ?? 0) > 0 ? [`note.${p.k}`] : [])])];
}
// BE9 compare – two home-squad players side by side. On demand only (POST /api/insights/compare), never
// in the cron registry: the pair count is squad² so nothing is pre-written. The key is `compare.<a>~<b>`
// with the keys sorted, so A-vs-B and B-vs-A share one stored row.
export const compareKey = (a, b) => { const [x, y] = [a, b].sort(); return `compare.${x}~${y}`; };
async function compareFacts(loadSite, a, b) {
  if (a === b) return null;
  const [pa, pb] = [await playerFacts(loadSite, a), await playerFacts(loadSite, b)];
  if (!pa || !pb) return null;
  const names = (await loadSite('players')).filter((p) => p.home && (p.k === a || p.k === b));
  const nameOf = (k) => names.find((p) => p.k === k)?.n ?? k;
  return { title: `${nameOf(a)} vs ${nameOf(b)}`, facts: { a: { name: nameOf(a), ...pa.facts }, b: { name: nameOf(b), ...pb.facts } } };
}
export async function factPackFor(key, loadSite, env) {
  if (key === 'club') return { tier: 'public', ...(await clubFacts(loadSite)) };
  const cm = /^compare\.(.+)~(.+)$/.exec(key);
  if (cm) { const f = await compareFacts(loadSite, cm[1], cm[2]); return f && { tier: 'member', ...f }; }
  const mm = /^match\.(latest|\d+)$/.exec(key);
  if (mm) { const f = await matchFacts(loadSite, mm[1]); return f && { tier: 'public', ...f }; }
  if (key === 'matches.last5') { const f = await last5Facts(loadSite); return f && { tier: 'public', ...f }; }
  const hm = /^h2h\.(.+)$/.exec(key);
  if (hm) { const f = await h2hFacts(loadSite, hm[1]); return f && { tier: 'public', ...f }; }
  const lm = /^leaders\.(.+)$/.exec(key);
  if (lm) { const f = await leadersFacts(loadSite, lm[1]); return f && { tier: 'public', ...f }; }
  const nm = /^note\.(.+)$/.exec(key);
  if (nm) { const f = await noteFacts(env, loadSite, nm[1]); return f && { tier: 'private', ...f }; }
  const pm = /^player\.(.+)$/.exec(key);
  if (pm) { const f = await playerFacts(loadSite, pm[1]); return f && { tier: 'member', ...f }; }
  return null;
}

// ---------- fingerprint + number checker ----------
async function fingerprint(facts) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(facts)));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function extractNumbers(text) {
  return [...String(text ?? '').matchAll(/\d+(?:\.\d+)?/g)].map(Number);
}
function allowedNumbers(facts) {
  const out = new Set();
  const walk = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) { out.add(v); out.add(Math.round(v)); out.add(Math.round(v * 10) / 10); }
    else if (typeof v === 'string') extractNumbers(v).forEach((n) => out.add(n));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(facts);
  return out;
}
// Exported for tests: true only if every number in `text` is within 0.1 of some fact pack value.
export function numbersOk(text, allowed) {
  return extractNumbers(text).every((n) => [...allowed].some((a) => Math.abs(a - n) < 0.1));
}

// ---------- the writer (Workers AI binding – free tier, no API key) ----------
async function callModel(env, { system, prompt, facts, parse, label }) {
  if (!env.AI) { console.log(`statInsights: AI binding not set – skipping ${label}`); return null; }
  const allowed = allowedNumbers(facts);
  for (let attempt = 0; attempt < 2; attempt++) {
    let text;
    try {
      const r = await env.AI.run(WRITER_MODEL(env), {
        messages: [
          { role: 'system', content: attempt ? `${system} Your last reply used a number that was not in the given facts – this time use ONLY the exact figures given, or none at all.` : system },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
      });
      text = r?.response;
    } catch (e) { console.log(`statInsights: ${label} call failed`, e.message); return null; }
    const parsed = parse(text);
    if (parsed && Object.values(parsed).every((v) => numbersOk(v, allowed))) return parsed;
    console.log(`statInsights: ${label} rejected${parsed ? ' an invented number' : ' an unparsable reply'}, retrying`);
  }
  return null;
}
function parseWriter(text) {
  try {
    const j = JSON.parse(String(text ?? '').match(/\{[\s\S]*\}/)?.[0] ?? text);
    if (!j || typeof j.headline !== 'string' || typeof j.body !== 'string') return null;
    return { headline: j.headline.slice(0, 100), body: j.body.slice(0, 500), watch: typeof j.watch === 'string' ? j.watch.slice(0, 200) : '' };
  } catch { return null; }
}
function parseAsk(text) {
  try {
    const j = JSON.parse(String(text ?? '').match(/\{[\s\S]*\}/)?.[0] ?? text);
    return typeof j?.answer === 'string' ? { answer: j.answer.slice(0, 500) } : null;
  } catch { return null; }
}
const NOTE_SYSTEM = "You write a short private coach's note from the NOREX UNITED FC management to one of their players, an amateur "
  + 'EA FC Pro Clubs team. Speak to the player directly ("you"): warm, honest, motivating, plain-English, never harsh or corporate. '
  + 'Lead with what they do well – the coach strengths listed in the facts matter most – then one thing to push on. No hashtags, no emoji, no markdown. '
  + "Never invent a number, name or event that is not in the facts you're given – if you're unsure, say something "
  + 'qualitative instead of guessing a figure. Reply with ONLY a JSON object, nothing else.';
function writerPrompt(pack) {
  return `${pack.title}\nFacts (JSON – the ONLY numbers you may use): ${JSON.stringify(pack.facts)}\n`
    + 'Reply with exactly: {"headline": "<=70 chars, punchy", "body": "2-3 sentences expanding on the headline using only the facts above", '
    + '"watch": "<=140 chars, one thing to watch for next time, grounded in the facts or a qualitative read – no new numbers"}';
}
function askPrompt(facts, question) {
  return `Facts (JSON – the ONLY numbers you may use): ${JSON.stringify(facts)}\nQuestion: ${question}\n`
    + 'Reply with exactly: {"answer": "1-3 sentences, plain-English"}';
}

// Writes (or overwrites) the stored insight for `key` from a freshly-built fact pack. Returns true on success.
export async function writeInsight(env, key, pack) {
  const out = await callModel(env, { system: pack.tier === 'private' ? NOTE_SYSTEM : WRITER_SYSTEM, prompt: writerPrompt(pack), facts: pack.facts, parse: parseWriter, label: `writer:${key}` });
  if (!out) return false;
  const hash = await fingerprint(pack.facts);
  await env.DB.prepare(`INSERT INTO stat_insights (key, hash, headline, body, watch, sources, tier, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (key) DO UPDATE SET hash = excluded.hash, headline = excluded.headline, body = excluded.body,
      watch = excluded.watch, sources = excluded.sources, tier = excluded.tier, at = excluded.at`)
    .bind(key, hash, out.headline, out.body, out.watch, JSON.stringify(pack.facts), pack.tier, Date.now()).run();
  return true;
}

// Walks the registry; a key whose fact pack changed since the stored hash goes to the Queue (or runs
// inline if JOBS isn't bound – mock server / a token without Queues access). Cheap: no fact pack is
// built twice, and an unchanged stat never calls the writer.
export async function refreshStatInsights(env, loadSite) {
  if (!env.DB) return;
  for (const key of await registryKeys(loadSite)) {
    const pack = await factPackFor(key, loadSite, env);
    if (!pack) continue;
    const hash = await fingerprint(pack.facts);
    if ((await one(env, 'SELECT hash FROM stat_insights WHERE key = ?', key))?.hash === hash) continue;
    if (env.JOBS) {
      try { await env.JOBS.send({ type: 'statInsight', key }); continue; } catch (e) { console.log('statInsights: queue send failed, writing inline', e.message); }
    }
    await writeInsight(env, key, pack).catch((e) => console.log('statInsights: write failed', key, e.message));
  }
}
// Called from worker.js's queue() consumer – rebuilds the fact pack (the message only carries the key).
export async function handleStatInsightJob(env, loadSite, key) {
  const pack = await factPackFor(key, loadSite, env);
  if (pack) await writeInsight(env, key, pack);
}

// ---------- routes (wired in members.js) ----------
async function claimedPlayerOf(env, uid) {
  return uid ? (await one(env, "SELECT player FROM claims WHERE user_id = ? AND status = 'approved'", uid))?.player ?? null : null;
}
function visibleRow(row, role, claimedPlayer) {
  if (row.tier === 'public') return true;
  if (row.tier === 'member') return atLeast(role, 'member');
  if (!can({ role }, 'statInsights.note')) return false; // private tier – coach's note: only that player + managers
  if (atLeast(role, 'manager')) return true;
  const pm = /^(?:player|note)\.(.+)$/.exec(row.key);
  return !!pm && claimedPlayer === pm[1];
}
export async function statInsightsRoute(env, keys, me) {
  if (!keys.length) return { insights: [] };
  const placeholders = keys.map(() => '?').join(',');
  const rows = (await env.DB.prepare(`SELECT key, headline, body, watch, tier, at FROM stat_insights WHERE key IN (${placeholders})`).bind(...keys).all()).results ?? [];
  const claimedPlayer = rows.some((r) => r.tier === 'private') ? await claimedPlayerOf(env, me?.u) : null;
  const role = me?.role ?? 'guest';
  return { insights: rows.filter((r) => visibleRow(r, role, claimedPlayer)).map(({ key, headline, body, watch, at }) => ({ key, headline, body, watch, at })) };
}
export async function statAskRoute(env, me, body) {
  const key = String(body?.key ?? ''), question = String(body?.question ?? '').trim().slice(0, 300);
  if (!key || !question) return { error: 'Missing key or question.' };
  const row = await one(env, 'SELECT * FROM stat_insights WHERE key = ?', key);
  if (!row) return { error: 'No insight for that yet.' };
  const role = me.role ?? 'guest';
  const claimedPlayer = row.tier === 'private' ? await claimedPlayerOf(env, me.u) : null;
  if (!visibleRow(row, role, claimedPlayer)) return { error: 'Not available yet.' };
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const asked = (await one(env, 'SELECT COUNT(*) AS n FROM stat_insight_asks WHERE user_id = ? AND at > ?', me.u, since))?.n ?? 0;
  if (asked >= 10) return { error: 'Too many questions today – try again tomorrow.' };
  let facts = {};
  try { facts = JSON.parse(row.sources); } catch { /* unreachable: written by writeInsight itself */ }
  const out = await callModel(env, { system: ASK_SYSTEM, prompt: askPrompt(facts, question), facts, parse: parseAsk, label: `ask:${key}` });
  await env.DB.prepare('INSERT INTO stat_insight_asks (user_id, key, question, at) VALUES (?, ?, ?, ?)').bind(me.u, key, question, Date.now()).run();
  return out ? { answer: out.answer } : { error: "Couldn't answer that from what's known right now." };
}
// POST /api/insights/compare { a, b }: members only. A stored row whose fingerprint still matches is returned
// as-is (no writer call); otherwise the pair is written inline. Same number checker, same degrade: no key → error.
export async function statCompareRoute(env, loadSite, me, body) {
  if (!can(me, 'statInsights.compare')) return { error: 'Members only.' };
  const a = String(body?.a ?? ''), b = String(body?.b ?? '');
  if (!a || !b || a === b) return { error: 'Pick two different players.' };
  const key = compareKey(a, b);
  const pack = await factPackFor(key, loadSite);
  if (!pack) return { error: 'Both players need to be in the home squad.' };
  const hash = await fingerprint(pack.facts);
  let row = await one(env, 'SELECT key, headline, body, watch, at, hash FROM stat_insights WHERE key = ?', key);
  if (!row || row.hash !== hash) {
    if (!(await writeInsight(env, key, pack))) return { error: "Couldn't write that comparison right now." };
    row = await one(env, 'SELECT key, headline, body, watch, at, hash FROM stat_insights WHERE key = ?', key);
  }
  return { insight: { key, headline: row.headline, body: row.body, watch: row.watch, at: row.at } };
}
export async function statFeedbackRoute(env, me, body) {
  const key = String(body?.key ?? '');
  const vote = body?.vote === 1 || body?.vote === -1 ? body.vote : null;
  if (!key || vote === null) return { error: 'Missing key or vote (1 or -1).' };
  await env.DB.prepare(`INSERT INTO stat_insight_feedback (key, user_id, vote, at) VALUES (?, ?, ?, ?)
    ON CONFLICT (key, user_id) DO UPDATE SET vote = excluded.vote, at = excluded.at`).bind(key, me.u, vote, Date.now()).run();
  return { ok: true };
}

// ---------- weekly "Insight of the week" (Discord, reuses docs.js's postEmbed + announce_channel) ----------
const weekKey = (now) => { const d = new Date(now); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
export async function statInsightWeekly(env, postEmbed, now = Date.now()) {
  if (!env.DB) return;
  const d = new Date(now);
  if (d.getUTCDay() !== 1 || d.getUTCHours() < 10) return; // after BE10's 09:00 UTC Club Intelligence DM
  const wk = weekKey(now);
  if ((await one(env, "SELECT value FROM meta WHERE key = 'stat_insight_week'"))?.value === wk) return;
  const row = await one(env, "SELECT * FROM stat_insights WHERE key = 'club'");
  const channel = (await one(env, "SELECT value FROM meta WHERE key = 'announce_channel'"))?.value;
  if (row && channel) {
    await postEmbed(env, channel, '', { embeds: [{
      title: `✨ Insight of the week – ${row.headline}`, description: `${row.body}\n\n👀 ${row.watch}`.slice(0, 3900),
      color: 0xc8352c, footer: { text: 'NOREX UNITED · weekly insight' },
    }] });
  }
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('stat_insight_week', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(wk).run();
}

// ---------- /insight (Discord, flag `statInsights`): one stored insight as an embed, same tier gate as the site ----------
export const DISCORD_INSIGHT_KEYS = { club: 'club', match: 'match.latest', last5: 'matches.last5', goals: 'leaders.goals', assists: 'leaders.assists', rating: 'leaders.rating', motm: 'leaders.motm' };
export async function discordInsightEmbed(env, stat, role = 'guest') {
  const key = DISCORD_INSIGHT_KEYS[stat];
  if (!key) return { error: 'Pick one of the listed insights.' };
  if (!env.DB) return { error: 'Insights need the member database, which is not connected here.' };
  const row = await one(env, 'SELECT key, headline, body, watch, tier, at FROM stat_insights WHERE key = ?', key);
  if (!row) return { error: 'No insight for that yet – it appears after the next data refresh.' };
  if (!visibleRow(row, role, null)) return { error: '🔒 That insight is for members only – log in on the site to see it.' };
  return { embed: {
    title: `✨ ${row.headline}`, description: `${row.body}\n\n👀 ${row.watch}`.slice(0, 3900),
    color: 0xc8352c, footer: { text: 'NOREX UNITED · insight' }, timestamp: new Date(row.at).toISOString(),
  } };
}
