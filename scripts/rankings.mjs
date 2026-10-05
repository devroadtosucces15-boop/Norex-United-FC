// Global rankings (roadmap P9.2): turns EA's world top 100 (data/world.json, fetched daily) into the
// site/api/rankings.json payload – the full table, Norex's own rank and the #100 cut-off, plus per-club
// rates so any club in the top 100 can be compared against Norex without another EA call.
const pct = (w, gp) => (gp ? Math.round((w / gp) * 1000) / 10 : 0);
const perGame = (n, gp) => (gp ? Math.round((n / gp) * 100) / 100 : 0);

export function buildRankings(world, homeId, homeSr = null) {
  const rows = (world?.clubs ?? []).map((c) => ({
    rank: c.rank,
    id: String(c.id),
    name: c.name,
    crest: c.crest ?? null,
    sr: c.sr,
    gp: c.gp,
    w: c.w,
    d: c.d,
    l: c.l,
    winPct: pct(c.w, c.gp),
    goalsPerGame: perGame(c.gf, c.gp),
    concededPerGame: perGame(c.ga, c.gp),
    cleanSheets: c.cs,
    div: c.div,
  }));
  const cut = rows.length ? rows[rows.length - 1].sr : null;
  const me = rows.find((r) => r.id === String(homeId)) ?? null;
  return {
    fetchedAt: world?.fetchedAt ?? null,
    size: rows.length,
    top: rows[0]?.sr ?? null,
    cut,
    me,
    // Outside the top 100: SR points still needed to reach the cut-off (0 when inside, or when Norex's SR is unknown).
    gapToCut: me || cut == null || homeSr == null ? 0 : Math.max(0, cut - homeSr + 1),
    rows,
  };
}
