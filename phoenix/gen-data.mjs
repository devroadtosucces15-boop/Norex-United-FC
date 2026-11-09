// Phoenix Fire MOCK data generator. Everything here is made up: club, members, opponents, results.
// usage: node gen-data.mjs   (writes config.json + data/ next to this file)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = process.argv[2] ? path.resolve(process.argv[2]) : path.dirname(fileURLToPath(import.meta.url));
const real = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let seed = 20261109; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)); const pick = (a) => a[Math.floor(rnd() * a.length)];
const CLUB = 90210;
const W = (f, o) => { fs.mkdirSync(path.dirname(path.join(here, f)), { recursive: true }); fs.writeFileSync(path.join(here, f), typeof o === 'string' ? o : JSON.stringify(o)); };

// ---------- config (copy of the real shape, club-specific bits swapped) ----------
const rc = JSON.parse(fs.readFileSync(path.join(real, 'config.json'), 'utf8'));
const cfg = { ...rc, siteTitle: 'PHOENIX FIRE', siteUrl: 'https://example.invalid/phoenix-fire/', homeClubId: CLUB,
  discord: { applyLink: '#', note: 'Mock invite' }, brand: { red: '#e8651a', ink: '#0a0705', founded: '2019', motto: 'Rise. Burn. Repeat.' },
  members: { api: process.env.PF_API || null }, streams: { youtube: '', twitch: '' } };
W('config.json', cfg);

// ---------- the squad (all invented) ----------
// [tag, line, proPos, ovr, height, archetype ids it tends to play]
const SQUAD = [
  ['SolarGlove', 'goalkeeper', 0, 84, 190, [1]], ['AshenWall', 'goalkeeper', 0, 79, 188, [2]],
  ['CinderRock', 'defender', 5, 83, 188, [4]], ['IronTalon', 'defender', 5, 82, 186, [4]], ['Kestrel_D', 'defender', 5, 80, 183, [3]],
  ['BlazeGuard', 'defender', 5, 78, 180, [7]], ['Ignis77', 'defender', 5, 77, 182, [3]], ['EmberVale', 'defender', 5, 76, 178, [7]], ['Sunforge', 'defender', 5, 74, 185, [4]],
  ['PyraMind', 'midfielder', 14, 85, 178, [8]], ['Helios_10', 'midfielder', 14, 84, 176, [9]], ['Vesper_X', 'midfielder', 14, 81, 180, [5]],
  ['GoldenLoom', 'midfielder', 14, 79, 177, [5]], ['Rekindle', 'midfielder', 14, 78, 174, [3]], ['NovaCrest', 'midfielder', 14, 77, 179, [10]], ['AshMender', 'midfielder', 14, 73, 181, [7]],
  ['Zephyr_Fx', 'forward', 25, 86, 181, [12]], ['FlareKing', 'forward', 25, 84, 183, [12]], ['TalonStrike', 'forward', 25, 82, 185, [13]],
  ['Scorch9', 'forward', 25, 80, 176, [11]], ['Wildfire_J', 'forward', 25, 78, 179, [10]], ['EmberFox', 'forward', 25, 75, 175, [11]],
];
const OPP = ['Frostbite FC', 'Night Owls', 'Iron Harbor', 'Coastline United', 'Red Mesa Rovers', 'Silent Wolves', 'Velvet Thunder', 'Northgate Elite', 'Lunar Drift', 'Copperhead FC', 'Bluefin Athletic', 'Static Noise', 'Rustbelt Kings', 'Glass Cannons'];
const OPP_TAGS = ['xDriftx', 'Vortex_82', 'LilMoose', 'GhostPeppr', 'tr1ckshot', 'OnyxFalls', 'BigWillie', 'ZeroPing', 'Marlin_K', 'Dusty_Rd', 'ChillBill', 'ArcticSun', 'N0tYou', 'Hazel_Nut', 'QuickScope', 'TurboTed', 'PapaBear', 'Lemonade', 'StaticX', 'Crimson9', 'DeepFreeze', 'Pixel_Joe', 'OldSchool', 'Rampage', 'MoonBase', 'Foxtrot'];
const LINES = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' };

// formation 3-5-2 usual XI + a few flex nights
const SLOTS = { goalkeeper: 1, defender: 3, midfielder: 5, forward: 2 };
const by = (line) => SQUAD.filter((s) => s[1] === line);

// ---------- matches ----------
const END = Math.floor(new Date('2026-11-08T23:00:00Z') / 1000);
const N = 64; const stat = new Map(SQUAD.map((s) => [s[0], { gp: 0, goals: 0, assists: 0, mom: 0, rs: 0, tm: 0, ta: 0, pm: 0, pa: 0, shots: 0, cs: 0, red: 0, saves: 0, w: 0 }]));
const AV = new Map(SQUAD.map((x, i) => [x[0], [1.6, .9, 1.5, 1.4, 1.2, 1, .8, .6, .4, 1.6, 1.4, 1.1, .9, .7, .5, .35, 1.6, 1.3, 1, .75, .5, .3][i]]));
const matches = []; const oppRecord = new Map();
const oppIds = OPP.map((_, i) => String(1100000 + i * 7919));
const pidOf = new Map(SQUAD.map((s, i) => [s[0], String(700000000 + i * 31337)]));
for (let i = 0; i < N; i++) {
  const t = END - i * 86400 * 0.95 - ri(0, 20000); const oi = ri(0, OPP.length - 1); const strong = rnd();
  // Phoenix is a top-division side: ~68% wins
  const r = rnd(); const res = r < 0.68 ? 'W' : r < 0.82 ? 'D' : 'L';
  let gf, ga; if (res === 'W') { ga = pick([0, 0, 1, 1, 2]); gf = ga + ri(1, 4); } else if (res === 'D') { gf = ga = pick([0, 1, 1, 2, 2, 3]); } else { gf = pick([0, 1, 1, 2]); ga = gf + ri(1, 3); }
  // lineup: 1 GK, 3 DEF, 5 MID, 2 FWD, rotating rarely
  const lineup = []; for (const [line, k] of Object.entries(SLOTS)) { const pool = [...by(line)]; for (let n = 0; n < k; n++) { const tot = pool.reduce((x, y) => x + AV.get(y[0]), 0); let v = rnd() * tot, pk = pool[0]; for (const y of pool) { v -= AV.get(y[0]); if (v <= 0) { pk = y; break; } } lineup.push(pk); pool.splice(pool.indexOf(pk), 1); } }
  // distribute goals/assists among attackers & mids
  const g = {}, a = {}; const scorers = lineup.filter((s) => s[1] !== 'goalkeeper');
  const wts = (s) => (s[1] === 'forward' ? 5 : s[1] === 'midfielder' ? 2 : 0.25) * (s[3] / 80); const draw = () => { const tot = scorers.reduce((x, s) => x + wts(s), 0); let v = rnd() * tot; for (const s of scorers) { v -= wts(s); if (v <= 0) return s; } return scorers[0]; };
  for (let k = 0; k < gf; k++) { const s = draw(); g[s[0]] = (g[s[0]] || 0) + 1; if (rnd() < 0.8) { const b = draw(); if (b !== s) a[b[0]] = (a[b[0]] || 0) + 1; } }
  const best = lineup.map((s) => [s, (g[s[0]] || 0) * 2 + (a[s[0]] || 0) + (res === 'W' ? 1 : 0) + rnd()]).sort((x, y) => y[1] - x[1])[0][0][0];
  const toP = (s, isMine) => { const line = s[1]; const sec = ri(5300, 5540); const gl = isMine ? (g[s[0]] || 0) : 0, as = isMine ? (a[s[0]] || 0) : 0; const pa = line === 'goalkeeper' ? ri(10, 22) : ri(25, 70), pm = Math.round(pa * (0.7 + rnd() * 0.25)); const ta = line === 'defender' ? ri(8, 18) : line === 'midfielder' ? ri(4, 11) : ri(0, 5), tm = Math.round(ta * (0.4 + rnd() * 0.4)); const shots = line === 'forward' ? ri(2, 6) : line === 'midfielder' ? ri(0, 3) : 0; const saves = line === 'goalkeeper' ? ri(1, 7) : 0;
    const rating = Math.min(10, Math.max(4.5, 6.4 + gl * 0.9 + as * 0.5 + (res === 'W' ? 0.5 : res === 'L' ? -0.4 : 0) + (rnd() - 0.4) * 1.1 + (s[0] === best ? 0.5 : 0) + (line === 'goalkeeper' && ga === 0 ? 0.7 : 0))); const csd = ga === 0 ? 1 : 0;
    return { archetypeid: String(s[5][0]), assists: String(as), cleansheetsany: String(csd), cleansheetsdef: String(csd && line === 'defender' ? 1 : 0), cleansheetsgk: String(csd && line === 'goalkeeper' ? 1 : 0), goals: String(gl), mom: String(isMine && s[0] === best ? 1 : 0), namespace: '1', passattempts: String(pa), passesmade: String(pm), pos: line, rating: rating.toFixed(2), redcards: String(rnd() < 0.008 ? 1 : 0), saves: String(saves), secondsPlayed: String(sec), shots: String(shots), tackleattempts: String(ta), tacklesmade: String(tm), playername: s[0], secondassists: '0', dribbles: String(ri(0, 14)), userResult: res === 'W' ? '1' : res === 'L' ? '2' : '3' };
  };
  const mine = {}; lineup.forEach((s) => { const p = toP(s, true); mine[pidOf.get(s[0])] = p;
    const st = stat.get(s[0]); st.gp++; st.goals += +p.goals; st.assists += +p.assists; st.mom += +p.mom; st.rs += +p.rating; st.tm += +p.tacklesmade; st.ta += +p.tackleattempts; st.pm += +p.passesmade; st.pa += +p.passattempts; st.shots += +p.shots; st.saves += +p.saves; st.red += +p.redcards; if (ga === 0 && (s[1] === 'defender' || s[1] === 'goalkeeper')) st.cs++; if (res === 'W') st.w++; });
  // opponent XI
  const olines = ['goalkeeper', ...Array(4).fill('defender'), ...Array(4).fill('midfielder'), ...Array(2).fill('forward')].slice(0, 11); const names = [...OPP_TAGS].sort(() => rnd() - 0.5).slice(0, 11); const opl = {};
  olines.forEach((line, k) => { const og = k >= 9 ? Math.round(ga / 2 + (k === 9 ? 0.4 : -0.4)) : 0; opl[String(2000000 + i * 20 + k)] = { archetypeid: String(ri(1, 13)), assists: '0', goals: String(Math.max(0, og)), mom: '0', namespace: '1', passattempts: String(ri(15, 60)), passesmade: String(ri(10, 50)), pos: line, rating: (5.5 + rnd() * 2.4).toFixed(2), redcards: '0', saves: line === 'goalkeeper' ? String(ri(0, 6)) : '0', secondsPlayed: String(ri(5300, 5540)), shots: String(ri(0, 4)), tackleattempts: String(ri(0, 10)), tacklesmade: String(ri(0, 6)), playername: names[k], secondassists: '0', dribbles: String(ri(0, 9)) }; });
  const mk = (name, goals, against, w, d, l) => ({ goals: String(goals), goalsAgainst: String(against), name, wins: String(w), ties: String(d), losses: String(l), kit: {} });
  const m = { matchId: String(100030000000000 + i * 977), timestamp: t, matchType: i % 11 === 10 ? 'playoffMatch' : 'leagueMatch', clubs: { [CLUB]: mk('PHOENIX FIRE', gf, ga, +(res === 'W'), +(res === 'D'), +(res === 'L')), [oppIds[oi]]: mk(OPP[oi], ga, gf, +(res === 'L'), +(res === 'D'), +(res === 'W')) }, players: { [CLUB]: mine, [oppIds[oi]]: opl } };
  matches.push(m); W(`data/matches/${m.matchId}.json`, m);
  const o = oppRecord.get(oi) ?? { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }; o.p++; o[res.toLowerCase()]++; o.gf += ga; o.ga += gf; oppRecord.set(oi, o);
}
const w = matches.filter((m) => +m.clubs[CLUB].goals > +m.clubs[CLUB].goalsAgainst).length, d = matches.filter((m) => m.clubs[CLUB].goals === m.clubs[CLUB].goalsAgainst).length, l = N - w - d;
const GF = matches.reduce((x, m) => x + +m.clubs[CLUB].goals, 0), GA = matches.reduce((x, m) => x + +m.clubs[CLUB].goalsAgainst, 0);

// ---------- club file ----------
const members = SQUAD.map((s) => { const st = stat.get(s[0]); const gp = st.gp; const wr = gp ? Math.round(st.w / gp * 100) : 0;
  const prev = {}; for (let k = 0; k <= 10; k++) prev['prevGoals' + (k || '')] = String(ri(0, s[1] === 'forward' ? 2 : 1));
  return { name: s[0], gamesPlayed: String(gp), winRate: String(wr), goals: String(st.goals), assists: String(st.assists), cleanSheetsDef: String(s[1] === 'defender' ? st.cs : 0), cleanSheetsGK: String(s[1] === 'goalkeeper' ? st.cs : 0), shotSuccessRate: String(ri(38, 62)), passesMade: String(st.pm), passSuccessRate: String(st.pa ? Math.round(st.pm / st.pa * 100) : 0), ratingAve: gp ? (st.rs / gp).toFixed(1) : '0.0', tacklesMade: String(st.tm), tackleSuccessRate: String(st.ta ? Math.round(st.tm / st.ta * 100) : 0), proName: '', proPos: String(s[2]), proStyle: '0', proHeight: String(s[4]), proNationality: '0', proOverall: String(s[3]), proOverallStr: String(s[3]), manOfTheMatch: String(st.mom), redCards: String(st.red), ...prev, favoritePosition: s[1] }; });
const career = SQUAD.map((s, i) => { const st = stat.get(s[0]); const mult = 1.6 + rnd() * 1.4; return { name: s[0], proPos: String(s[2]), gamesPlayed: String(Math.round(st.gp * mult)), goals: String(Math.round(st.goals * mult)), assists: String(Math.round(st.assists * mult)), manOfTheMatch: String(Math.round(st.mom * mult)), ratingAve: st.gp ? (st.rs / st.gp).toFixed(1) : '0.0', prevGoals: '0', favoritePosition: s[1] }; });
const last = matches.slice(0, 10), lm = (m) => (+m.clubs[CLUB].goals > +m.clubs[CLUB].goalsAgainst ? 1 : m.clubs[CLUB].goals === m.clubs[CLUB].goalsAgainst ? 3 : 2);
let ws = 0; for (const m of matches) { if (lm(m) === 1) ws++; else break; } let ub = 0; for (const m of matches) { if (lm(m) !== 2) ub++; else break; }
const overall = { clubId: String(CLUB), bestDivision: null, gamesPlayed: String(N), gamesPlayedPlayoff: '6', goals: String(GF), goalsAgainst: String(GA), promotions: '3', relegations: '0', losses: String(l), ties: String(d), wins: String(w), wstreak: String(ws), unbeatenstreak: String(ub), skillRating: '1886', reputationtier: '1', leagueAppearances: String(N) };
const posCount = { goalkeeper: 2, defender: 7, midfielder: 7, forward: 6 };
W(`data/clubs/${CLUB}.json`, { id: CLUB, tier: 'home', fetchedAt: new Date('2026-11-09T08:00:00Z').toISOString(), info: { name: 'PHOENIX FIRE', clubId: CLUB, regionId: 4543827, teamId: 100001, customKit: { stadName: 'Tier 1 Stadium' } }, overall, members, positionCount: posCount, career, leaderboard: { currentDivision: '2', bestDivision: '2', points: '61' } });

// ---------- world (rivals table) ----------
const wc = OPP.map((n, i) => { const o = oppRecord.get(i); return { id: oppIds[i], name: n, crest: '', sr: ri(1500, 2300), gp: ri(30, 90), w: ri(10, 60), d: ri(2, 12), l: ri(2, 25), gf: ri(80, 400), ga: ri(40, 200), cs: ri(5, 40), div: ri(1, 4), rep: 1 }; });
wc.push({ id: String(CLUB), name: 'PHOENIX FIRE', crest: '', sr: 1886, gp: N, w, d, l, gf: GF, ga: GA, cs: 20, div: 2, rep: 1 });
for (let i = 0; i < 30; i++) wc.push({ id: String(3000000 + i), name: pick(['Atlas', 'Granite', 'Comet', 'Harbor', 'Summit', 'Mirage', 'Cobalt', 'Saffron']) + ' ' + pick(['FC', 'United', 'Athletic', 'Rovers', 'City']) + ' ' + (i + 1), crest: '', sr: ri(900, 2600), gp: ri(20, 120), w: ri(5, 80), d: ri(0, 15), l: ri(0, 40), gf: ri(50, 500), ga: ri(20, 300), cs: ri(0, 50), div: ri(1, 6), rep: 1 });
wc.sort((a, b) => b.sr - a.sr).forEach((c, i) => (c.rank = i + 1));
W('data/world.json', { fetchedAt: new Date().toISOString(), clubs: wc });
W('data/media.json', { youtube: [], twitch: [] }); W('data/burners/index.json', { ids: [] });
// EA game news is generic, not club data: reuse as is
for (const d of ['updates', 'game']) fs.cpSync(path.join(real, 'data', d), path.join(here, 'data', d), { recursive: true });
console.log(`phoenix mock: ${SQUAD.length} members, ${N} matches, ${w}W ${d}D ${l}L, GF ${GF} GA ${GA}`);
