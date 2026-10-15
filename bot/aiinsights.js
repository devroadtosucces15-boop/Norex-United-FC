// AI player insights engine (roadmap P11.14) – per player, wired into the same `.member-badge[data-player]`
// slot used by awards/scout report, so it shows up on player cards, profiles, compare and the portal for free.
// Route lives in members.js: GET /api/insights/player?k=  anyone (flag aiInsights): strengths & improve,
// playing style tag, best position by stats, a pattern, one recommendation.
// Reuses PB.5's NXScout engine (web/scout.js) for the stats analysis itself – strengths/improve/patterns/
// position usage/team-play scores are the same numbers the scout report shows, just handed to Workers AI to
// turn into a short natural read instead of the rule-based narrative. If the AI call fails, is unavailable
// (mock server has no AI binding), or replies with junk, this falls back to NXScout's own narrative/suggestion
// text – the feature never renders empty. Cached in KV keyed by game count, so a page view never triggers a
// fresh AI call – only the next data refresh (more games logged) regenerates it.
import { TEXT_MODEL } from './aispike.js';
import '../web/scout.js';

const { report, fromSquad } = globalThis.NXScout;
const STYLES = ['poacher', 'playmaker', 'ball-winner', 'wall', 'all-rounder'];
const KV_PREFIX = 'aiinsights:';
const KV_TTL = 60 * 60 * 24 * 30; // 30 days – overwritten sooner whenever the game count changes

function styleTag(R) {
  if (R.grp === 'GK') return 'wall';
  const { attack: a = 0, control: c = 0, defending: d = 0 } = R.team;
  if (R.grp === 'FWD' && a >= c && a >= d) return 'poacher';
  if (c >= a && c >= d) return 'playmaker';
  if (d >= a && d >= c) return R.grp === 'DEF' ? 'wall' : 'ball-winner';
  return 'all-rounder';
}

// The group/position the player's own log rates highest in – not just their usual spot.
function bestPosition(R) {
  const groups = Object.entries(R.usage.groups).filter(([, t]) => t.n >= 2 && t.r != null).sort((a, b) => b[1].r - a[1].r);
  if (!groups.length) return null;
  const [grp, t] = groups[0];
  return { grp, rating: t.r, games: t.n, isMain: grp === R.grp };
}

function fallback(R, style, best) {
  return {
    style,
    summary: R.narrative.slice(1, 3).join(' ') || R.narrative[0] || 'Not enough of a pattern yet – more games will sharpen this.',
    bestPosition: best ? `${best.grp}${best.isMain ? ' (their usual spot)' : ' – rates higher there than their usual spot'}, ${best.rating.toFixed(1)} average over ${best.games} games` : null,
    pattern: R.patterns[0]?.text ?? null,
    recommendation: R.suggestions[0]?.text ?? 'Keep logging games – the read gets sharper with more data.',
  };
}

function prompt(R, style, best) {
  const facts = {
    group: R.grp, games: R.games, rating: R.metrics.find((m) => m.k === 'rating')?.text ?? null,
    strengths: R.strengths.slice(0, 3).map((s) => s.text),
    improve: R.improve.slice(0, 2).map((s) => s.text),
    patterns: R.patterns.slice(0, 3).map((p) => p.text),
    positionRatings: Object.entries(R.usage.groups).filter(([, t]) => t.n >= 2 && t.r != null).map(([g, t]) => ({ group: g, games: t.n, rating: t.r })),
    suggestedStyle: style,
    bestPositionByStats: best?.grp ?? null,
  };
  return `You are a football (soccer) analyst writing a short scouting note for an amateur Pro Clubs player, from their real match stats below. Be specific and plain-English, encouraging but honest, no markdown and no emoji.
Stats: ${JSON.stringify(facts)}
Reply with ONLY a JSON object and nothing else: {"style": one of ${JSON.stringify(STYLES)} (the closest tag – may differ from suggestedStyle if the stats fit another one better), "summary": "1-2 sentences: their biggest strength and one thing to work on", "bestPosition": "1 short sentence on the position their stats suit best and why", "pattern": "1 sentence on a tendency from the patterns given", "recommendation": "1 actionable sentence for the player"}`;
}

function parseAI(text) {
  try {
    const m = String(text ?? '').match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : text);
    if (!j || typeof j.summary !== 'string' || typeof j.recommendation !== 'string') return null;
    return {
      style: STYLES.includes(j.style) ? j.style : null,
      summary: j.summary.slice(0, 400),
      bestPosition: typeof j.bestPosition === 'string' ? j.bestPosition.slice(0, 200) : null,
      pattern: typeof j.pattern === 'string' ? j.pattern.slice(0, 200) : null,
      recommendation: j.recommendation.slice(0, 250),
    };
  } catch { return null; }
}

async function generate(env, R) {
  const style = styleTag(R);
  const best = bestPosition(R);
  const fb = fallback(R, style, best);
  if (!env.AI) return fb;
  try {
    const r = await env.AI.run(TEXT_MODEL, { messages: [{ role: 'user', content: prompt(R, style, best) }], max_tokens: 300 });
    const ai = parseAI(r?.response);
    if (!ai) return fb;
    return { style: ai.style ?? style, summary: ai.summary, bestPosition: ai.bestPosition ?? fb.bestPosition, pattern: ai.pattern ?? fb.pattern, recommendation: ai.recommendation ?? fb.recommendation };
  } catch { return fb; }
}

// Exported for tests: pure given an already-built report R (no KV, no AI env needed for the rule-based path).
export function insightsFor(R) {
  const style = styleTag(R);
  return { style, best: bestPosition(R), fallback: fallback(R, style, bestPosition(R)) };
}

export async function playerInsights(env, k, { squad, players, mode = 'league' } = {}) {
  const names = Object.fromEntries((players ?? []).map((p) => [p.k, p.n]));
  const R = report(k, fromSquad(squad), { tracked: players ?? [], names, mode });
  if (!R.enough) return { enough: false, games: R.games, need: R.need };
  const key = `${KV_PREFIX}${mode}:${k}:${R.games}`; // regenerates only once the game count changes
  if (env.NOREX_KV) {
    const cached = await env.NOREX_KV.get(key, 'json').catch(() => null);
    if (cached) return { enough: true, name: names[k] ?? k, grp: R.grp, games: R.games, ...cached };
  }
  const out = await generate(env, R);
  if (env.NOREX_KV) await env.NOREX_KV.put(key, JSON.stringify(out), { expirationTtl: KV_TTL }).catch(() => {});
  return { enough: true, name: names[k] ?? k, grp: R.grp, games: R.games, ...out };
}
