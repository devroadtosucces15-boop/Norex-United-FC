// Runs inside GitHub Actions (EA lets Actions through, but blocks Cloudflare Workers).
// Modes: search | stats | track (answer a waiting Discord reply) and poll (scheduled, feeds tracked clubs' new matches).
// Input comes from env so nothing user-typed reaches a shell.
import { searchHits } from '../core/ea.js';

const { RELAY_REF: ref, RELAY_KIND: kind = 'poll', RELAY_Q: q = '', RELAY_GAME: game = '1', MICKEY_WORKER_URL, RELAY_KEY } = process.env;
if (!MICKEY_WORKER_URL || !RELAY_KEY) { console.error('relay: MICKEY_WORKER_URL and RELAY_KEY are required'); process.exit(1); }
const worker = MICKEY_WORKER_URL.replace(/\/$/, '');

const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36', Accept: 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9', Referer: 'https://www.ea.com/', Origin: 'https://www.ea.com' };
async function ea(endpoint, params) {
  const r = await fetch(`https://proclubs.ea.com/api/fc/${endpoint}?${new URLSearchParams({ platform: 'common-gen5', ...params })}`, { headers: H, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`EA answered ${r.status}`);
  return r.json();
}
async function post(path, body) {
  const r = await fetch(`${worker}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Key': RELAY_KEY }, body: JSON.stringify(body) });
  console.log(`worker ${path} → ${r.status}`);
  if (!r.ok) process.exit(1);
  return r;
}

async function matchesFor(id, count) {
  const seen = new Map();
  for (const matchType of ['leagueMatch', 'playoffMatch', 'gameType5']) {
    try { for (const m of await ea('clubs/matches', { clubIds: id, matchType, maxResultCount: String(count) })) seen.set(String(m.matchId), m); }
    catch (e) { if (matchType === 'leagueMatch') throw e; }
  }
  return [...seen.values()];
}

async function resolve(query) {
  const s = String(query).trim().slice(0, 60);
  if (/^\d{1,12}$/.test(s)) {
    const c = (await ea('clubs/info', { clubIds: s }))?.[s];
    return { club: c?.name ? { id: s, name: c.name, crest: c.customKit?.crestAssetId ?? null } : null, hits: [] };
  }
  let hits = [];
  for (const ep of ['allTimeLeaderboard/search', 'clubs/search']) {
    try { const r = await ea(ep, { clubName: s }); if (Array.isArray(r) && r.length) { hits = searchHits(r); break; } } catch (e) { if (ep === 'clubs/search') throw e; }
  }
  const exact = hits.find((h) => h.name.toLowerCase() === s.toLowerCase());
  return { club: exact ?? (hits.length === 1 ? hits[0] : null), hits };
}

try {
  if (kind === 'poll') {
    const { clubs = [] } = await (await fetch(`${worker}/tracked`, { headers: { 'X-Key': RELAY_KEY } })).json();
    console.log(`poll: ${clubs.length} tracked club(s)`);
    const out = [];
    for (const id of clubs) { try { out.push({ id, matches: await matchesFor(id, 5) }); } catch (e) { console.error(`poll ${id}: ${e.message}`); } }
    if (out.length) await post('/ingest', { clubs: out });
  } else {
    if (!ref || !q) throw new Error('missing ref or q');
    try {
      const { club, hits } = await resolve(q);
      console.log(`relay ${ref}: ${kind} "${q}" → ${club ? `club ${club.id}` : `${hits.length} hit(s)`}`);
      await post('/relay', club ? { ref, club, matches: await matchesFor(club.id, kind === 'track' ? 10 : Math.max(5, Number(game) || 1)) } : { ref, q, hits });
    } catch (e) { await post('/relay', { ref, error: e.message }); }
  }
} catch (e) { console.error(e.message); process.exit(1); }
