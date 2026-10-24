// EA's per-player event counters (match_event_aggregate_0..3: "215:21,216:5,…") decoded into named stats.
// The id table is community observation, not EA documentation: credit to the "EA FC Pro Clubs API research" project
// (~51,000 FC 27 player-match rows), as published by the fc-clubs-api docs (1erkandogan.github.io/fc27-clubs-api/match-events/).
// Only the "confirmed" table is decoded; partial/exploratory ids stay raw in `evraw` so they can be decoded later.
export const EVENT_STATS = [
  // passing
  ['passesCompleted', 215], ['passesFailed', 216],
  ['passesCompletedForward', 30], ['passesCompletedBackward', 32], ['passesCompletedSideways', 34],
  ['passesCompletedShort', 24], ['passesCompletedMedium', 26], ['passesCompletedLong', 28], ['passesCompletedCross', 36],
  ['passesFailedForward', 31], ['passesFailedBackward', 33], ['passesFailedSideways', 35],
  ['passesFailedShort', 25], ['passesFailedMedium', 27], ['passesFailedLong', 29], ['passesFailedCross', 37],
  ['firstTimePasses', 143], ['switchesOfPlay', 144], ['flairPasses', 147], ['throughPasses', 152], ['offsidePasses', 153],
  // shooting and goals
  ['shotsOnTarget', 217], ['shotsOffTarget', 218],
  ['shotsOnTargetInsideBox', 13], ['shotsOnTargetOutsideBox', 18], ['shotsOffTargetInsideBox', 14], ['shotsOffTargetOutsideBox', 19],
  ['shotsSaved', 202], ['goalsFirstTime', 128], ['goalsWeakFoot', 131], ['goalsOffPost', 136],
  ['secondAssists', 115], ['throughBallAssists', 118],
  // dribbling
  ['dribblesCompleted', 174], ['dribblesCarried', 97], ['dribblesSkillMoveBeat', 38],
  // defending and goalkeeping
  ['tacklesWon', 0], ['tacklesLost', 1], ['standingTacklesWon', 229], ['slidingTacklesWon', 230],
  ['cleanTackles', 164], ['dangerousTackles', 163], ['interceptions', 6], ['opponentsDispossessed', 158], ['crossesBlocked', 156],
  ['aerialDuelsWonAttacking', 265], ['aerialDuelsWonDefending', 266], ['goodDirectionSaves', 267],
  // possession
  ['possessionLostDefensiveThird', 105], ['possessionLostMiddleThird', 106], ['possessionLostAttackingThird', 107],
  ['possessionWonDefensiveThird', 108], ['possessionWonMiddleThird', 109], ['possessionWonAttackingThird', 110],
  // discipline and set pieces
  ['foulsConcededDefensiveThird', 3], ['foulsWon', 4], ['yellowCardsImmediate', 95], ['yellowCardsDelayed', 213],
  ['penaltiesConceded', 94], ['cornersConceded', 10], ['cornersTaken', 145],
  // positioning and match feedback
  ['inPosition', 111], ['outOfPosition', 219],
  ['outOfPositionSeverity1', 99], ['outOfPositionSeverity2', 100], ['outOfPositionSeverity3', 101],
  ['outOfPositionSeverity4', 102], ['outOfPositionSeverity5', 103],
  ['feedbackUseTheBall', 212], ['feedbackPickYourPass', 207], ['feedbackNoGoodOption', 175], ['feedbackGoodOptionTaken', 176],
  ['feedbackBestOptionTaken', 177], ['feedbackShouldHavePassedElsewhere', 182], ['feedbackChoseToPass', 183],
];

// Stats that are sums or remainders of the ids above (EA's direction/length events don't always cover every pass).
const max0 = (n) => Math.max(0, n);

// "0:2,109:3" → { 0: 2, 109: 3 }; duplicate ids (same id in two buckets) are summed.
export function parseAggregate(agg, into = {}) {
  if (typeof agg !== 'string' || !agg) return into;
  for (const pair of agg.split(',')) {
    const [id, n] = pair.split(':');
    const v = Number(n);
    if (id !== '' && Number.isFinite(v)) into[id] = (into[id] || 0) + v;
  }
  return into;
}

// All four buckets of one player row → one raw "id:count" string with zero entries dropped ("" if none).
export function rawEvents(p) {
  const counts = {};
  for (let i = 0; i < 4; i++) parseAggregate(p?.[`match_event_aggregate_${i}`], counts);
  return Object.entries(counts).filter(([, v]) => v).map(([id, v]) => `${id}:${v}`).join(',');
}

// raw string (or parsed counts) → named stats, every confirmed stat present (0 when absent) plus derived totals.
export function decodeEvents(raw) {
  const c = typeof raw === 'string' ? parseAggregate(raw) : raw || {};
  const g = (id) => c[id] || 0;
  const out = {};
  for (const [name, id] of EVENT_STATS) out[name] = g(id);
  out.shots = out.shotsOnTarget + out.shotsOffTarget;
  out.dribblesBeat = max0(g(112) - g(38));
  out.foulsConceded = g(2) + g(3);
  out.yellowCards = out.yellowCardsImmediate + out.yellowCardsDelayed;
  out.passesCompletedDirectionUnknown = max0(out.passesCompleted - (out.passesCompletedForward + out.passesCompletedBackward + out.passesCompletedSideways));
  out.passesCompletedLengthUnknown = max0(out.passesCompleted - (out.passesCompletedShort + out.passesCompletedMedium + out.passesCompletedLong + out.passesCompletedCross));
  out.passesFailedDirectionUnknown = max0(out.passesFailed - (out.passesFailedForward + out.passesFailedBackward + out.passesFailedSideways));
  out.passesFailedLengthUnknown = max0(out.passesFailed - (out.passesFailedShort + out.passesFailedMedium + out.passesFailedLong + out.passesFailedCross));
  return out;
}
