// Real club data, read from the repo's data/ folder (read-only). Everything the pages show comes from here.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
// the repo root is the nearest parent holding config.json (works from next/ in the repo and through the PLANNING symlink)
const root = (() => { let p = here; for (let i = 0; i < 6; i++) { if (fs.existsSync(path.join(p, 'config.json')) && fs.existsSync(path.join(p, 'data'))) return p; p = path.dirname(p); } return path.join(here, '..', '..'); })();
const J = (p, d = null) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
export const cfg = J(path.join(root, 'config.json'), {});
export const CLUB = String(cfg.homeClubId ?? cfg.clubId ?? 80869);
const club = J(path.join(root, `data/clubs/${CLUB}.json`), {});
const world = J(path.join(root, 'data/world.json'), { clubs: [] });
const num = (x) => (x == null || x === '' ? 0 : +x || 0);
const LINE = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' };
export const ARCH = ['Shot Stopper', 'Sweeper Keeper', 'Progressor', 'Boss', 'Engine', 'Marauder', 'Recycler', 'Maestro', 'Creator', 'Spark', 'Magician', 'Finisher', 'Target'];

// ---- matches (club perspective) ----
const mdir = path.join(root, "data/matches"); export const matches = []; const arch = new Map();
for (const f of fs.readdirSync(mdir)) {
  const m = J(path.join(mdir, f)); const me = m?.clubs?.[CLUB]; if (!me) continue;
  const oppId = Object.keys(m.clubs).find((k) => k !== CLUB); const opp = m.clubs[oppId] ?? {};
  const gf = num(me.goals), ga = num(me.goalsAgainst);
  const lines = Object.values(m.players?.[CLUB] ?? {}).map((p) => ({ n: p.playername, line: LINE[p.pos] ?? 'MID', goals: num(p.goals), assists: num(p.assists), rating: num(p.rating), mom: num(p.mom), saves: num(p.saves), arch: ARCH[num(p.archetypeid) - 1] ?? '' }));
  for (const l of lines) { const a = arch.get(l.n) ?? {}; a[l.arch] = (a[l.arch] || 0) + 1; arch.set(l.n, a); }
  matches.push({ id: m.matchId ?? f.replace('.json', ''), t: num(m.timestamp), type: m.matchType, oppId, crest: opp.kit?.crestAssetId ? String(opp.kit.crestAssetId) : '', opp: opp.name ?? `Club ${oppId}`, gf, ga, res: gf > ga ? 'W' : gf < ga ? 'L' : 'D', lines });
}
matches.sort((a, b) => b.t - a.t);

// ---- players ----
const careerBy = new Map((club.career ?? []).map((c) => [c.name, c]));
export const players = (club.members ?? []).map((m) => {
  const c = careerBy.get(m.name) ?? {};
  const mine = matches.flatMap((x) => x.lines.filter((l) => l.n === m.name));
  const lc = {}; mine.forEach((l) => (lc[l.line] = (lc[l.line] || 0) + 1)); const dom = Object.entries(lc).sort((a, b) => b[1] - a[1])[0];
  const line = dom && dom[1] >= 3 ? dom[0] : (LINE[m.favoritePosition] ?? 'MID');
  const ar = Object.entries(arch.get(m.name) ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  return { k: m.name, n: m.name, line, ovr: num(m.proOverall) || null, h: num(m.proHeight) || null,
    gp: num(m.gamesPlayed), goals: num(m.goals), assists: num(m.assists), rating: num(m.ratingAve), mom: num(m.manOfTheMatch), win: num(m.winRate), cs: num(m.cleanSheetsDef) + num(m.cleanSheetsGK),
    pass: num(m.passSuccessRate), tackles: num(m.tacklesMade), tackleRate: num(m.tackleSuccessRate), red: num(m.redCards),
    cgp: num(c.gamesPlayed), cgoals: num(c.goals), cassists: num(c.assists), cmom: num(c.manOfTheMatch), crating: num(c.ratingAve),
    saves: mine.reduce((a, b) => a + b.saves, 0), arch: ar, archived: mine.length };
}).sort((a, b) => b.gp - a.gp);

// ---- club ----
const o = club.overall ?? {};
export const clubStats = { name: club.info?.name ?? cfg.siteTitle, sr: num(o.skillRating), div: num(club.leaderboard?.currentDivision), pts: num(club.leaderboard?.points), gp: num(o.gamesPlayed), w: num(o.wins), d: num(o.ties), l: num(o.losses), gf: num(o.goals), ga: num(o.goalsAgainst), streak: num(o.wstreak), unbeaten: num(o.unbeatenstreak), promotions: num(o.promotions), fetched: club.fetchedAt };
export const recent = matches.slice(0, 10);
// ---- opponents ----
const opps = new Map();
for (const m of matches) { const r = opps.get(m.oppId) ?? { id: m.oppId, crest: m.crest, n: m.opp, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, last: 0 }; r.p++; r[m.res.toLowerCase()]++; r.gf += m.gf; r.ga += m.ga; r.last = Math.max(r.last, m.t); opps.set(m.oppId, r); }
const wmap = new Map(world.clubs.map((c) => [String(c.id), c]));
export const opponents = [...opps.values()].map((r) => ({ ...r, sr: wmap.get(r.id)?.sr ?? null, rank: wmap.get(r.id)?.rank ?? null, div: wmap.get(r.id)?.div ?? null })).sort((a, b) => b.last - a.last);
export const burners = (J(path.join(root, 'data/burners/index.json'), { ids: [] }).ids ?? []).map((id) => { const b = J(path.join(root, `data/burners/${id}.json`)); if (!b) return null; const o = b.overall ?? {}; return { id, n: b.name, gp: num(o.gamesPlayed), w: num(o.wins), d: num(o.ties), l: num(o.losses), gf: num(o.goals), ga: num(o.goalsAgainst), sr: num(o.skillRating), div: num(b.leaderboard?.currentDivision), roster: (b.members ?? []).length, tracked: b.trackedAt, fetched: b.fetchedAt, recent: (b.matches ?? []).length }; }).filter(Boolean);
export const updates = (() => { const d = path.join(root, 'data/updates'); return fs.readdirSync(d).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => J(path.join(d, f))).filter(Boolean).sort((a, b) => String(b.published).localeCompare(String(a.published))); })();
export const features = cfg.features ?? {};
export const game = J(path.join(root, 'data/game/fc27-launch.json'), {});
export const shapes = (() => { const s = new Map(); for (const m of matches) { if (m.lines.length !== 11) continue; const c = { GK: 0, DEF: 0, MID: 0, FWD: 0 }; m.lines.forEach((l) => c[l.line]++); const k = `${c.GK}-${c.DEF}-${c.MID}-${c.FWD}`; s.set(k, (s.get(k) || 0) + 1); } return [...s].sort((a, b) => b[1] - a[1]); })();
// the usual XI by line (illustrative slots; EA does not publish slots)
export function usualXI() {
  const by = (line, k) => players.filter((p) => p.line === line || false).sort((a, b) => b.archived - a.archived).slice(0, k);
  const lineOf = (n) => { const c = {}; matches.forEach((m) => m.lines.filter((l) => l.n === n).forEach((l) => (c[l.line] = (c[l.line] || 0) + 1))); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]; };
  const pool = players.map((p) => ({ ...p, al: lineOf(p.n) })).filter((p) => p.al);
  const take = (line, k) => pool.filter((p) => p.al === line).sort((a, b) => b.archived - a.archived).slice(0, k);
  const gk = take('GK', 1), df = take('DEF', 3), md = take('MID', 5), fw = take('FWD', 2);
  const cam = [...md].sort((a, b) => b.assists - a.assists)[0], rest = md.filter((p) => p !== cam).sort((a, b) => b.goals - a.goals);
  return { GK: gk[0], LCB: df[0], CB: df[1], RCB: df[2], LM: rest[0], RM: rest[1], LDM: rest[2], RDM: rest[3], CAM: cam, LS: fw[0], RS: fw[1] };
}
// ---- derived records and leaders (all real) ----
export const leaders = {
  goals: [...players].sort((a, b) => b.goals - a.goals).slice(0, 10),
  assists: [...players].sort((a, b) => b.assists - a.assists).slice(0, 10),
  rating: players.filter((p) => p.gp >= 8).sort((a, b) => b.rating - a.rating).slice(0, 10),
  mom: [...players].sort((a, b) => b.mom - a.mom).slice(0, 10),
  cs: [...players].sort((a, b) => b.cs - a.cs).slice(0, 10),
  tackles: [...players].sort((a, b) => b.tackles - a.tackles).slice(0, 10),
};
export const records = (() => {
  const big = [...matches].sort((a, b) => (b.gf - b.ga) - (a.gf - a.ga))[0];
  const high = [...matches].sort((a, b) => b.gf - a.gf)[0];
  const top = (arr, f) => [...arr].sort((a, b) => f(b) - f(a))[0];
  return { biggestWin: big, mostGoals: high, careerScorer: top(players, (p) => p.cgoals), careerAssist: top(players, (p) => p.cassists), careerMom: top(players, (p) => p.cmom), mostGames: top(players, (p) => p.cgp) };
})();
export const fmtDate = (t, o = { day: 'numeric', month: 'short' }) => new Date(t * 1000).toLocaleDateString('en-GB', o);
