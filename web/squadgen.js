// Rush squad generator (roadmap P3.5) – pure functions, no DOM / I/O. Runs in the manager's browser (the Worker's CPU
// budget is too small for the search) and is imported by bot/squads.js to re-score what gets saved, and by the tests.
// Player: { id, n, pos: ['CB', 'CM', 'ST'] } (Rush 1st/2nd/3rd choice). prefs: { id: [teammate ids, best first] } (≤ 10).
//
// Chemistry of a squad = mutual preferences + position fit:
//   pair score  = w(a→b) + w(b→a) (+0.5 when both picked each other), w = (10 − rank) / 10 → 1.0 … 0.1
//   role fit    = each player plays one of their positions: 1st choice 1, 2nd 0.6, 3rd 0.3, anything else 0
//   shape       = a squad needs at least one DEF, one MID and one FWD (GK optional) – each missing group costs
// generate() deals the pool into squads of `size`, then swaps players between squads (and the bench) while the total
// improves – deterministic, so the same pool and preferences always give the same squads. Locked squads are kept as they are.
(() => {
  const GROUP = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'FWD', RW: 'FWD', ST: 'FWD' };
  const NEED = ['DEF', 'MID', 'FWD'];
  const FIT = [1, 0.6, 0.3];

  const weight = (prefs, a, b) => { const i = (prefs[a] ?? []).indexOf(b); return i < 0 ? 0 : (10 - i) / 10; };
  const pairScore = (prefs, a, b) => { const x = weight(prefs, a, b), y = weight(prefs, b, a); return x + y + (x && y ? 0.5 : 0); };

  // Best role for everyone in a squad: tries each player's 3 positions (or "flex" = out of position) and keeps the combination
  // with the best fit that covers DEF / MID / FWD. → { roles: { id: 'CB' | 'FLEX' }, fit, missing: ['FWD'] }
  const roleCache = new Map();
  function assignRoles(players) {
    const key = players.map((p) => `${p.id}:${(p.pos ?? []).join('/')}`).sort().join('|');
    const hit = roleCache.get(key);
    if (hit) return hit;
    const res = assignRolesRaw(players);
    if (roleCache.size > 5000) roleCache.clear();
    roleCache.set(key, res);
    return res;
  }
  function assignRolesRaw(players) {
  const opts = players.map((p) => [...(p.pos ?? []).slice(0, 3).map((pos, i) => [pos, FIT[i]]), ['FLEX', 0]]);
  let best = null;
  const walk = (i, picked, fit) => {
    if (i === players.length) {
      const groups = new Set(picked.map((pos) => GROUP[pos]).filter(Boolean));
      const missing = players.length >= 3 ? NEED.filter((g) => !groups.has(g)) : [];
      const score = fit - missing.length * 2;
      if (!best || score > best.score) best = { score, fit, missing, picked: [...picked] };
      return;
    }
    for (const [pos, f] of opts[i]) {
      if (pos === 'GK' && picked.includes('GK')) continue; // one keeper per squad
      picked.push(pos); walk(i + 1, picked, fit + f); picked.pop();
    }
  };
  walk(0, [], 0);
  return { roles: Object.fromEntries(players.map((p, i) => [p.id, best.picked[i]])), fit: best.fit, missing: best.missing };
  }

  // Raw score (for the optimiser) and a 0–100 chemistry (for people) for one squad.
  function squadScore(players, prefs) {
  let pairs = 0;
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) pairs += pairScore(prefs, players[i].id, players[j].id);
  const { roles, fit, missing } = assignRoles(players);
  const nPairs = (players.length * (players.length - 1)) / 2 || 1;
  const chemistry = Math.max(0, Math.min(100, Math.round(100 * (0.6 * (pairs / (nPairs * 2.5)) + 0.4 * (fit / (players.length || 1))) - 15 * missing.length)));
  return { raw: pairs + 2 * fit - 4 * missing.length, chemistry, roles, missing, pairs: Math.round(pairs * 10) / 10 };
  }

  // pool: players · prefs · { size = 5, locked: [[ids…], …] } → { squads: [{ ids, roles, chemistry, missing, locked }], bench: [ids] }
  function generate(pool, prefs, { size = 5, locked = [] } = {}) {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const lockedIds = new Set(locked.flat());
  const free = pool.filter((p) => !lockedIds.has(p.id));
  // How wanted someone is (picked by others) – the least wanted go to the bench when the numbers don't divide.
  const wanted = (id) => Object.entries(prefs).reduce((s, [by, list]) => s + (by !== id && byId.has(by) ? weight(prefs, by, id) : 0), 0);
  const order = [...free].sort((a, b) => wanted(b.id) - wanted(a.id) || String(a.id).localeCompare(String(b.id)));
  const k = Math.floor(order.length / size);
  const groups = Array.from({ length: k }, () => []);
  order.slice(0, k * size).forEach((p, i) => { const r = Math.floor(i / k), c = i % k; groups[r % 2 ? k - 1 - c : c].push(p); }); // snake deal
  const bench = order.slice(k * size);
  const score = (g) => squadScore(g, prefs).raw;
  // Swap players between squads (and with the bench) while the total improves.
  const all = [...groups, bench];
  for (let pass = 0; pass < 60; pass++) {
    let improved = false;
    for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
      for (let i = 0; i < all[a].length; i++) for (let j = 0; j < all[b].length; j++) {
        const A = all[a], B = all[b];
        const before = (a < k ? score(A) : 0) + (b < k ? score(B) : 0);
        [A[i], B[j]] = [B[j], A[i]];
        const after = (a < k ? score(A) : 0) + (b < k ? score(B) : 0);
        if (after > before + 1e-9) improved = true; else [A[i], B[j]] = [B[j], A[i]];
      }
    }
    if (!improved) break;
  }
  const out = (g, isLocked) => { const s = squadScore(g, prefs); return { ids: g.map((p) => p.id), roles: s.roles, chemistry: s.chemistry, missing: s.missing, pairs: s.pairs, locked: isLocked }; };
  return {
    squads: [...locked.map((ids) => out(ids.map((id) => byId.get(id)).filter(Boolean), true)), ...groups.map((g) => out(g, false))],
    bench: bench.map((p) => p.id),
  };
  }

  globalThis.NXSquadGen = { GROUP, weight, pairScore, assignRoles, squadScore, generate };
})();
