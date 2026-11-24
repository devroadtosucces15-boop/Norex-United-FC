// EA data shaping only (no network): turns EA's raw match JSON into the shape the views use.
const CREST = 'https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l';
export const crestUrl = (id) => (id != null && id !== '' ? `${CREST}${id}.png` : null);
const n = (v) => Number(v) || 0;

export function normalizePlayer(p) {
  return { name: p.playername ?? p.name ?? 'Unknown', pos: p.pos ?? '', rating: n(p.rating), goals: n(p.goals), assists: n(p.assists),
    shots: n(p.shots), passesMade: n(p.passesmade), passAtt: n(p.passattempts), tacklesMade: n(p.tacklesmade), tackleAtt: n(p.tackleattempts),
    saves: n(p.saves), mom: p.mom === '1' || p.mom === 1 || p.mom === true, red: n(p.redcards) };
}

function side(raw, id, players) {
  const c = raw.clubs?.[id] ?? {};
  const list = Object.values(players ?? {}).map(normalizePlayer).sort((a, b) => b.rating - a.rating);
  const sum = (k) => list.reduce((t, p) => t + p[k], 0);
  return { id: String(id), name: c.details?.name ?? c.name ?? `Club ${id}`, crestId: c.details?.customKit?.crestAssetId ?? null,
    crest: crestUrl(c.details?.customKit?.crestAssetId), goals: n(c.goals ?? sum('goals')), players: list,
    totals: { shots: sum('shots'), passesMade: sum('passesMade'), passAtt: sum('passAtt'), tacklesMade: sum('tacklesMade'), tackleAtt: sum('tackleAtt'),
      saves: sum('saves'), assists: sum('assists'), red: sum('red'), avgRating: list.length ? list.reduce((t, p) => t + p.rating, 0) / list.length : 0 } };
}

// focus = the club asked about; it comes back as `home` so every view reads "us vs them".
export function normalizeMatch(raw, focusId) {
  const ids = Object.keys(raw.clubs ?? {});
  const focus = ids.includes(String(focusId)) ? String(focusId) : ids[0];
  const other = ids.find((i) => i !== focus);
  const home = side(raw, focus, raw.players?.[focus]), away = side(raw, other, raw.players?.[other]);
  return { id: String(raw.matchId), ts: n(raw.timestamp), home, away, res: home.goals > away.goals ? 'W' : home.goals < away.goals ? 'L' : 'D' };
}

export const searchHits = (hits) => (Array.isArray(hits) ? hits : [])
  .map((h) => ({ id: String(h.clubId ?? h.clubInfo?.clubId ?? ''), name: h.clubInfo?.name ?? h.name ?? '', crest: h.clubInfo?.customKit?.crestAssetId ?? null }))
  .filter((c) => /^\d+$/.test(c.id) && c.name).slice(0, 10);
