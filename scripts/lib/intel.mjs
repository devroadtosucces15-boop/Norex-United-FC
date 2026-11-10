// Match intelligence: turns decoded EA event counters (scripts/lib/events.mjs) into totals, per-appearance averages and
// ready-made rates. Pure functions, no I/O, so the new site's data layer, the classic build and the bot can share them.
// Input is a list of `decodeEvents()` results, one per player appearance (rows without event data are skipped by the caller
// or passed as null/undefined and ignored here). Counters only exist for games archived since EA's events were kept.

const r = (n, d = 1) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null);
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null); // one decimal, null when undefined

// Sum every named counter across appearances. `apps` = how many rows carried event data.
export function sumEvents(evs) {
  const totals = {};
  let apps = 0;
  for (const ev of evs || []) {
    if (!ev) continue;
    apps++;
    for (const [k, v] of Object.entries(ev)) if (typeof v === 'number') totals[k] = (totals[k] || 0) + v;
  }
  return { apps, totals };
}

// Rates computed from summed totals. null = not enough data (never NaN or a fake 0%).
export function ratesOf(t) {
  const g = (k) => t[k] || 0;
  const passes = g('passesCompleted') + g('passesFailed');
  const tackles = g('tacklesWon') + g('tacklesLost');
  const won = g('possessionWonDefensiveThird') + g('possessionWonMiddleThird') + g('possessionWonAttackingThird');
  const lost = g('possessionLostDefensiveThird') + g('possessionLostMiddleThird') + g('possessionLostAttackingThird');
  const shots = g('shotsOnTarget') + g('shotsOffTarget');
  const posture = g('inPosition') + g('outOfPosition');
  return {
    passAccuracy: pct(g('passesCompleted'), passes),
    forwardPassShare: pct(g('passesCompletedForward'), g('passesCompleted')),
    longPassShare: pct(g('passesCompletedLong') + g('passesCompletedCross'), g('passesCompleted')),
    tackleWinRate: pct(g('tacklesWon'), tackles),
    shotAccuracy: pct(g('shotsOnTarget'), shots),
    insideBoxShare: pct(g('shotsOnTargetInsideBox') + g('shotsOffTargetInsideBox'), shots),
    possessionWon: won,
    possessionLost: lost,
    possessionNet: won - lost,
    possessionWinShare: pct(won, won + lost),
    positioning: pct(g('inPosition'), posture),
  };
}

// One summary object: how many appearances, sparse totals (zeros omitted to keep JSON small), per-appearance averages, rates.
export function summarize(evs) {
  const { apps, totals } = sumEvents(evs);
  if (!apps) return null;
  const sparse = {};
  const perApp = {};
  for (const [k, v] of Object.entries(totals)) {
    if (!v) continue;
    sparse[k] = v;
    perApp[k] = r(v / apps, 2);
  }
  return { apps, totals: sparse, perApp, rates: ratesOf(totals) };
}

// How much of a match list carries event data. `rows` = [{ id, t, hasEv }], any order.
export function coverage(rows) {
  const have = rows.filter((x) => x.hasEv).sort((a, b) => a.t - b.t);
  return { matches: rows.length, withEvents: have.length, since: have.length ? have[0].t : null };
}
