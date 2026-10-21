// The merged match picture (message 1 of a result): scoreboard, goals and assists per player, man of the match, the stats as paired
// rings, rating by line and the field view – ONE picture instead of the score card and the field view. This file builds what goes in it
// (scripts/cards.mjs matchPicture() draws it) and fetches the faces the Action cannot read from the database itself.
import { createHash } from 'node:crypto';

const n = (v) => +v || 0;
const GROUP = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' };
const sum = (a, f) => a.reduce((t, x) => t + n(x[f]), 0);
const pct = (a, b) => (b > 0 ? Math.round((100 * a) / b) : 0);
const mean = (a) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : 0);

// m: a raw EA match. hide: lower-cased names/keys left out of every list (players who asked not to be shown). Totals use everyone.
export function buildMatchPicture(m, homeId, { hide = new Set() } = {}) {
  const oppId = Object.keys(m.clubs ?? {}).find((k) => k !== homeId);
  const us = m.clubs?.[homeId], them = m.clubs?.[oppId];
  if (!us || !them) return null;
  const all = Object.entries(m.players?.[homeId] ?? {}).map(([k, p]) => ({ k, n: p.playername, pos: p.pos, r: n(p.rating), g: n(p.goals), a: n(p.assists), mom: p.mom === '1', raw: p }));
  if (!all.length) return null;
  const ours = all.filter((p) => !hide.has(String(p.k).toLowerCase()) && !hide.has(String(p.n).toLowerCase()));
  const theirs = Object.values(m.players?.[oppId] ?? {});
  const gf = n(us.goals), ga = n(us.goalsAgainst ?? them.goals), res = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  const raws = all.map((p) => p.raw);
  const tm = sum(raws, 'tacklesmade'), ta = sum(raws, 'tackleattempts'), otm = sum(theirs, 'tacklesmade'), ota = sum(theirs, 'tackleattempts');
  const pm = sum(raws, 'passesmade'), pa = sum(raws, 'passattempts'), opm = sum(theirs, 'passesmade'), opa = sum(theirs, 'passattempts');
  const avgUs = mean(all.map((p) => p.r)), avgOpp = mean(theirs.map((p) => n(p.rating)));
  const rows = [
    { k: 'Shots', a: sum(raws, 'shots'), b: sum(theirs, 'shots'), kind: 'share' },
    { k: 'Passes completed', a: pm, b: opm, kind: 'share' },
    { k: 'Pass accuracy', a: pct(pm, pa), b: pct(opm, opa), kind: 'pct', tol: 2 },
    { k: 'Tackles won', a: tm, b: otm, kind: 'share' },
    { k: 'Tackle success', a: pct(tm, ta), b: pct(otm, ota), kind: 'pct', tol: 2 },
    { k: 'Average rating', a: +avgUs.toFixed(1), b: +avgOpp.toFixed(1), kind: 'rate', tol: 0.1 },
  ];
  const lines = Object.entries(GROUP).map(([pos, t]) => { const ps = all.filter((p) => p.pos === pos); return ps.length ? { t, r: mean(ps.map((p) => p.r)) } : null; }).filter(Boolean);
  const contrib = ours.filter((p) => p.g || p.a).sort((a, b) => (b.g + b.a) - (a.g + a.a) || String(a.n).localeCompare(String(b.n)));
  const motm = ours.find((p) => p.mom) ?? null;
  return {
    id: String(m.matchId), ts: n(m.timestamp), mode: m.matchType === 'playoffMatch' ? 'Playoff' : 'League', res, gf, ga,
    opp: them.name ?? them.details?.name ?? 'Opponent',
    rows, lines, avg: mean(ours.map((p) => p.r)),
    contrib: contrib.map(({ k, n: name, g, a }) => ({ k, n: name, g, a })),
    motm: motm ? { k: motm.k, n: motm.n, r: motm.r } : null,
    players: ours.map(({ k, n: name, pos, r, g, a, mom }) => ({ k, n: name, pos, r, g, a, mom })),
  };
}

// Faces for the players in these pictures: the Worker's keyed route answers with picture URLs (Card Studio card, else Discord picture), and
// each one is fetched once and inlined as a data URI so Chrome never waits on a slow host. Players without one get a drawn avatar.
// Returns Map(EA player key → data URI). Never throws: with no Worker address, no secret, or an error, it is just empty.
export async function fetchPlayerFaces(config, keys) {
  const faces = new Map();
  const api = config?.members?.api, secret = process.env.DISCORD_CLIENT_SECRET;
  const want = [...new Set(keys.map(String))].slice(0, 40);
  if (!api || !secret || !want.length) return faces;
  try {
    const key = createHash('sha256').update(`${secret}:norex-bot-settings`).digest('hex');
    const res = await fetch(`${api}/api/bot/faces?players=${encodeURIComponent(want.join(','))}`, { signal: AbortSignal.timeout(10000), headers: { 'X-Norex-Key': key } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const urls = await res.json();
    await Promise.all(Object.entries(urls).map(async ([k, url]) => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (r.ok) faces.set(k, `data:${r.headers.get('content-type') || 'image/png'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`);
      } catch { /* that face stays a drawn avatar */ }
    }));
  } catch (e) { console.warn('Faces not loaded:', e.message); }
  return faces;
}
