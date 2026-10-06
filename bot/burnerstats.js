// Burner-club tracker – pure helpers shared by the fetcher (scripts/fetch.mjs), the site build
// (scripts/burners-page.mjs), the Worker (/burner) and the tests. No imports, no I/O.
//
// A burner club is tracked by its EA club ID (names change, IDs don't). Everything about it lives in
// data/burners/<id>.json – deliberately apart from data/matches + data/clubs, so a burner can never leak
// into NOREX's own League totals, player pages or boards.

const num = (v) => Number(v) || 0;
const r1 = (v) => (+v || 0).toFixed(1);
export const MAX_MATCHES = 150; // per burner – plenty for a throwaway club, keeps the committed file small
export const MAX_BURNERS = 20; // tracked at once (≈ 7 EA requests each per 10-minute run)
export const TYPE_LABEL = { leagueMatch: 'League', playoffMatch: 'Playoff', friendlyMatch: 'Friendly' };
const RES_COLOR = { W: 0x22c55e, D: 0xeab308, L: 0xef4444 };
const RES_WORD = { W: '✅ Win', D: '➖ Draw', L: '❌ Defeat' };
export const CREST_CDN = 'https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l';

// One EA match → the compact record we keep (only the burner's own players; the opponent is a summary).
export function slimBurnerMatch(m, id, matchType) {
  id = String(id);
  const mine = m?.clubs?.[id];
  if (!mine) return null;
  const oppId = Object.keys(m.clubs).find((k) => k !== id);
  const opp = m.clubs[oppId];
  return {
    id: String(m.matchId), ts: num(m.timestamp), type: matchType,
    res: mine.wins === '1' ? 'W' : mine.losses === '1' ? 'L' : 'D',
    gf: num(mine.goals), ga: num(opp?.goals ?? mine.goalsAgainst),
    opp: { id: String(oppId ?? ''), name: opp?.details?.name ?? opp?.name ?? null, crest: opp?.details?.customKit?.crestAssetId ?? null },
    players: Object.entries(m.players?.[id] || {}).map(([pid, p]) => ({
      id: String(pid), n: p.playername ?? '?', pos: p.pos ?? '', r: num(p.rating), g: num(p.goals), a: num(p.assists), sh: num(p.shots),
      pa: num(p.passattempts), pm: num(p.passesmade), ta: num(p.tackleattempts), tm: num(p.tacklesmade), sv: num(p.saves),
      mom: num(p.mom) > 0 ? 1 : 0, rc: num(p.redcards), s: num(p.secondsPlayed),
    })),
  };
}

// Merge newly fetched matches into the stored list (by match ID), newest first, capped.
export function mergeMatches(existing = [], incoming = [], cap = MAX_MATCHES) {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const m of incoming) if (m && !byId.has(m.id)) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => b.ts - a.ts).slice(0, cap);
}

const rec = () => ({ gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, cs: 0 });
function addTo(r, m) {
  r.gp++; r[m.res.toLowerCase()]++; r.gf += m.gf; r.ga += m.ga; if (m.ga === 0) r.cs++;
}

// Record, form, per-mode split and a squad table from the stored matches.
export function burnerStats(matches = []) {
  const ms = [...matches].sort((a, b) => b.ts - a.ts);
  const total = rec();
  const byType = {};
  const squad = new Map();
  for (const m of ms) {
    addTo(total, m);
    addTo((byType[m.type] ??= rec()), m);
    for (const p of m.players) {
      const e = squad.get(p.id) ?? { id: p.id, n: p.n, gp: 0, g: 0, a: 0, rSum: 0, rN: 0, motm: 0, sh: 0, pa: 0, pm: 0, ta: 0, tm: 0, sv: 0, rc: 0, secs: 0, pos: {}, last: m.ts };
      e.gp++; e.g += p.g; e.a += p.a; e.motm += p.mom; e.sh += p.sh; e.pa += p.pa; e.pm += p.pm; e.ta += p.ta; e.tm += p.tm; e.sv += p.sv; e.rc += p.rc; e.secs += p.s;
      if (p.r) { e.rSum += p.r; e.rN++; }
      if (p.pos) e.pos[p.pos] = (e.pos[p.pos] ?? 0) + 1;
      squad.set(p.id, e);
    }
  }
  const players = [...squad.values()].map((e) => ({
    id: e.id, n: e.n, gp: e.gp, g: e.g, a: e.a, motm: e.motm, sh: e.sh, sv: e.sv, rc: e.rc, last: e.last,
    rating: e.rN ? e.rSum / e.rN : 0,
    passPct: e.pa ? Math.round((e.pm / e.pa) * 100) : null,
    tacklePct: e.ta ? Math.round((e.tm / e.ta) * 100) : null,
    pos: Object.entries(e.pos).sort((x, y) => y[1] - x[1])[0]?.[0] ?? '',
  })).sort((a, b) => b.gp - a.gp || b.rating - a.rating);
  let streak = { res: '', n: 0 };
  for (const m of ms) {
    if (!streak.res) streak = { res: m.res, n: 1 };
    else if (m.res === streak.res) streak.n++;
    else break;
  }
  return {
    ...total, winPct: total.gp ? Math.round((total.w / total.gp) * 100) : 0,
    gd: total.gf - total.ga, form: ms.slice(0, 10).map((m) => m.res), streak, byType, players, lastTs: ms[0]?.ts ?? null,
  };
}

// Who is in the club right now (members/stats) vs. who we've seen before → first/last seen + joins/leaves.
export function updateRoster(prev = {}, members = [], nowIso) {
  const roster = {};
  const joined = [], left = [];
  const present = new Set();
  for (const m of members) {
    const name = String(m?.name ?? '').trim();
    if (!name) continue;
    present.add(name);
    const was = prev[name];
    roster[name] = { first: was?.first ?? nowIso, last: nowIso, active: true, gp: num(m.gamesPlayed), pos: m.favoritePosition || null, ovr: num(m.proOverall) || null };
    if (!was?.active && Object.keys(prev).length) joined.push(name);
  }
  for (const [name, was] of Object.entries(prev)) {
    if (present.has(name)) continue;
    roster[name] = { ...was, active: false };
    if (was.active) left.push(name);
  }
  return { roster, joined, left };
}

// The "after the game" Discord embed for one new burner match.
export function reportEmbed(burner, m, stats, siteUrl = '') {
  const url = siteUrl ? `${siteUrl.replace(/\/?$/, '/')}burners.html#c${burner.id}` : undefined;
  const ps = m.players;
  const list = (f) => ps.filter((p) => p[f] > 0).map((p) => `${p.n}${p[f] > 1 ? ` ×${p[f]}` : ''}`).join('\n');
  const motm = ps.find((p) => p.mom);
  const best = [...ps].sort((a, b) => b.r - a.r)[0];
  const lineup = [...ps].sort((a, b) => b.r - a.r).slice(0, 11)
    .map((p) => `\`${r1(p.r)}\` ${p.n}${p.g ? ` ⚽${p.g > 1 ? p.g : ''}` : ''}${p.a ? ` 🎯${p.a > 1 ? p.a : ''}` : ''}`).join('\n');
  const crest = burner.crest ? `${CREST_CDN}${num(burner.crest)}.png` : undefined;
  return {
    title: `🔥 ${burner.name} ${m.gf}–${m.ga} ${m.opp.name ?? `Club ${m.opp.id}`}`,
    url, color: RES_COLOR[m.res], thumbnail: crest ? { url: crest } : undefined,
    description: `${RES_WORD[m.res]} · ${TYPE_LABEL[m.type] ?? 'League'} · burner club report`,
    fields: [
      list('g') && { name: '⚽ Goals', value: list('g').slice(0, 1000), inline: true },
      list('a') && { name: '🎯 Assists', value: list('a').slice(0, 1000), inline: true },
      motm && { name: '⭐ Man of the match', value: `${motm.n} (${r1(motm.r)})`, inline: true },
      best && !motm && { name: '📈 Top rated', value: `${best.n} (${r1(best.r)})`, inline: true },
      lineup && { name: `👥 Lineup (${ps.length})`, value: lineup.slice(0, 1000) },
      { name: '📊 Season so far', value: `${stats.w}W ${stats.d}D ${stats.l}L · ${stats.gf}–${stats.ga} · ${stats.winPct}% wins${stats.streak.n > 1 ? ` · ${stats.streak.n}${stats.streak.res} streak` : ''}` },
    ].filter(Boolean),
    timestamp: new Date(m.ts * 1000).toISOString(),
    footer: { text: `Burner tracker · club ${burner.id}` },
  };
}

// Burner squad members who share a gamertag with a NOREX member (case-insensitive). `homeNames` is a Set of
// lowercase NOREX gamertags (hidden players already removed by the caller). Looks at the squad we have seen in
// games plus the club's current roster, so a player who has joined but not played yet still shows up.
export function sharedWithNorex(burner, homeNames) {
  const stats = burner.stats ?? burnerStats(burner.matches);
  const out = new Map();
  for (const p of stats.players) {
    if (homeNames.has(p.n.toLowerCase())) out.set(p.n.toLowerCase(), { n: p.n, gp: p.gp, g: p.g, a: p.a, rating: p.rating, active: burner.roster?.[p.n]?.active !== false });
  }
  for (const [n, r] of Object.entries(burner.roster ?? {})) {
    if (homeNames.has(n.toLowerCase()) && !out.has(n.toLowerCase())) out.set(n.toLowerCase(), { n, gp: 0, g: 0, a: 0, rating: 0, active: r.active !== false });
  }
  return [...out.values()].sort((a, b) => b.gp - a.gp || a.n.localeCompare(b.n));
}
