// Schema-drift probe: EA's endpoints are undocumented and change without notice. Each response is compared with the
// keys we depend on; missing keys are reported once per endpoint per run (never throws, never blocks the fetch).
export const PLATFORMS = ['common-gen5', 'nx']; // common-gen4 is rejected by EA for FC 27

// Shapes are checked on the first item (list), the first member, or the object itself.
const EXPECT = {
  'clubs/info': ['name', 'clubId', 'customKit'],
  'clubs/overallStats': ['clubId', 'gamesPlayed', 'wins', 'losses', 'ties', 'goals', 'goalsAgainst', 'skillRating', 'lastOpponent0'],
  'members/stats': ['name', 'gamesPlayed', 'goals', 'assists', 'ratingAve', 'passesMade', 'tacklesMade', 'proOverall', 'favoritePosition'],
  'members/career/stats': ['name', 'gamesPlayed', 'goals', 'assists', 'ratingAve'],
  'clubs/matches': ['matchId', 'timestamp', 'clubs', 'players'],
  'allTimeLeaderboard/search': ['clubId', 'points', 'currentDivision', 'bestDivision'],
  'currentSeasonLeaderboard/search': ['clubId', 'points', 'currentDivision'],
};

function sample(endpoint, body) {
  if (endpoint === 'clubs/info') return body && typeof body === 'object' ? Object.values(body)[0] : null;
  if (endpoint.startsWith('members/')) return body?.members?.[0] ?? null;
  return Array.isArray(body) ? body[0] : body;
}

// → list of missing keys ([] when the shape matches or there is nothing to compare).
export function missingKeys(endpoint, body) {
  const want = EXPECT[endpoint];
  const s = sample(endpoint, body);
  if (!want || !s || typeof s !== 'object') return [];
  return want.filter((k) => !(k in s));
}

export function platformProblem(platform) {
  return PLATFORMS.includes(platform) ? null : `platform "${platform}" is not one of ${PLATFORMS.join(', ')} (EA rejects common-gen4 for FC 27)`;
}
