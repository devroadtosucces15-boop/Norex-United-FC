// Pulls data from EA's Pro Clubs API into data/ and discovers new clubs automatically.
//
// Tiers:
//   home       – your club, fetched every run, full match history kept
//   manual     – clubs added via config.extraClubIds or the "Add a club" issue form
//   linked     – clubs one of your members also plays for (found automatically)
//   discovered – clubs found by crawling opponents; only squad + career stats kept
//
// Clubs that played a home/linked club (depth 1) stay tracked. Deeper clubs are
// scanned once for your members and then dropped (remembered in state.scanned),
// so the crawl keeps rolling outward without the archive growing forever.
//
// home/manual/linked clubs are fetched every run and every match is archived.
// discovered clubs are refreshed in rotating batches; they exist to find your
// members' other clubs and to fill in stats for players you meet.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson, loadConfig, num, sleep } from './lib.mjs';

const API = 'https://proclubs.ea.com/api/fc/';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.ea.com/',
  Origin: 'https://www.ea.com',
};
const FULL_TIERS = new Set(['home', 'manual', 'linked']);

const config = loadConfig();
const platform = config.platform;
const homeId = String(config.homeClubId);
const stateFile = path.join(DATA, 'state.json');
const state = readJson(stateFile, { clubs: {} });
state.scanned ??= {};
const now = new Date().toISOString();
let requests = 0;
let blocked = 0;

async function api(endpoint, params) {
  const qs = new URLSearchParams({ platform, ...params });
  const url = `${API}${endpoint}?${qs}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await sleep(config.requestDelayMs ?? 400);
    requests++;
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      }
      if (res.status === 403) blocked++;
      if (res.status === 404) return null;
      console.warn(`  ${endpoint} -> HTTP ${res.status} (attempt ${attempt})`);
    } catch (err) {
      console.warn(`  ${endpoint} -> ${err.message} (attempt ${attempt})`);
    }
    await sleep(1500 * attempt);
  }
  throw new Error(`Failed: ${endpoint}`);
}

function track(id, tier, extra = {}) {
  id = String(id);
  const c = state.clubs[id];
  if (!c && tier === 'discovered' && state.scanned[id]) return false;
  const rank = { home: 0, manual: 1, linked: 2, discovered: 3 };
  if (!c) {
    state.clubs[id] = { tier, firstSeen: now, lastFetched: null, fails: 0, ...extra };
    return true;
  }
  if (rank[tier] < rank[c.tier]) c.tier = tier;
  if (extra.depth !== undefined && (c.depth === undefined || extra.depth < c.depth)) c.depth = extra.depth;
  return false;
}

// Strip bulky/opaque fields so the archive stays small.
function slimMatch(m, matchType) {
  const players = {};
  for (const [clubId, list] of Object.entries(m.players || {})) {
    players[clubId] = {};
    for (const [pid, p] of Object.entries(list)) {
      const { match_event_aggregate_0, match_event_aggregate_1, match_event_aggregate_2,
        match_event_aggregate_3, vproattr, vprohackreason, ...keep } = p;
      players[clubId][pid] = keep;
    }
  }
  const clubs = {};
  for (const [clubId, c] of Object.entries(m.clubs || {})) {
    const { details, ...rest } = c;
    clubs[clubId] = { ...rest, name: details?.name ?? null, kit: details?.customKit ?? null };
  }
  return { matchId: m.matchId, timestamp: m.timestamp, matchType, clubs, players };
}

const homeRoster = new Set(); // lower-case gamertags of home members
const homePlayerIds = new Set();
const newHomeMatches = [];

async function fetchClub(id) {
  const c = state.clubs[id];
  const full = FULL_TIERS.has(c.tier);
  const [info, overall, members, career] = await Promise.all([
    api('clubs/info', { clubIds: id }),
    api('clubs/overallStats', { clubIds: id }),
    api('members/stats', { clubId: id }),
    api('members/career/stats', { clubId: id }),
  ]);
  const clubInfo = info?.[id] ?? null;
  const record = {
    id,
    tier: c.tier,
    fetchedAt: now,
    info: clubInfo,
    overall: Array.isArray(overall) ? overall[0] ?? null : null,
    members: members?.members ?? [],
    positionCount: members?.positionCount ?? null,
    career: career?.members ?? [],
  };
  if (clubInfo?.name) c.name = clubInfo.name;
  // Division/points only come from the leaderboard search, so look it up for full-tier clubs.
  if (full && clubInfo?.name) {
    const hits = (await api('allTimeLeaderboard/search', { clubName: clubInfo.name })) || [];
    const hit = hits.find((h) => String(h.clubId) === id);
    if (hit) record.leaderboard = { currentDivision: hit.currentDivision, bestDivision: hit.bestDivision, points: hit.points };
  }
  writeJson(path.join(DATA, 'clubs', `${id}.json`), record);

  const opponents = new Set();
  for (let i = 0; i < 10; i++) {
    const o = record.overall?.[`lastOpponent${i}`];
    if (o && o !== '-1' && o !== '0') opponents.add(String(o));
  }

  if (full) {
    for (const matchType of ['leagueMatch', 'playoffMatch']) {
      const matches = (await api('clubs/matches', { clubIds: id, matchType })) || [];
      for (const m of matches) {
        Object.keys(m.clubs || {}).forEach((o) => o !== id && opponents.add(o));
        for (const [clubId, cm] of Object.entries(m.clubs || {})) {
          if (cm.details?.name && state.clubs[clubId]) state.clubs[clubId].name ??= cm.details.name;
        }
        const file = path.join(DATA, 'matches', `${m.matchId}.json`);
        if (fs.existsSync(file)) continue;
        writeJson(file, slimMatch(m, matchType));
        if (id === homeId) newHomeMatches.push(m);
        if (id === homeId) Object.keys(m.players?.[id] || {}).forEach((pid) => homePlayerIds.add(pid));
        // A home player appearing for another club in an archived match links that club.
        for (const [clubId, list] of Object.entries(m.players || {})) {
          if (clubId === homeId) continue;
          if (Object.keys(list).some((pid) => homePlayerIds.has(pid))) track(clubId, 'linked');
        }
      }
    }
  }

  // Link clubs whose squads contain one of our members.
  if (id !== homeId && c.tier === 'discovered') {
    const shared = record.members.filter((m) => homeRoster.has(m.name.toLowerCase())).map((m) => m.name);
    if (shared.length) {
      c.tier = 'linked';
      c.linkedPlayers = shared;
      console.log(`  ★ linked: ${c.name} shares ${shared.join(', ')}`);
    }
  }

  // Discovery: opponents of clubs within the crawl radius get queued.
  const d = c.depth ?? 0;
  const limit = config.discovery?.maxTrackedClubs ?? 300;
  const followAll = config.discovery?.followOpponentsOf === 'all';
  if (config.discovery?.enabled && (FULL_TIERS.has(c.tier) || followAll)) {
    for (const o of opponents) {
      if (Object.keys(state.clubs).length >= limit && !state.clubs[o]) break;
      if (track(o, 'discovered', { depth: FULL_TIERS.has(c.tier) ? 1 : d + 1, discoveredVia: id })) {
        console.log(`  + discovered club ${o}`);
      }
    }
  }

  c.lastFetched = now;
  c.fails = 0;
  if (c.tier === 'discovered' && (c.depth ?? 1) >= 2) {
    delete state.clubs[id];
    state.scanned[id] = now.slice(0, 10);
    fs.rmSync(path.join(DATA, 'clubs', `${id}.json`), { force: true });
  }
  return record;
}

async function postToDiscord() {
  const hook = process.env.DISCORD_WEBHOOK;
  if (!hook || !newHomeMatches.length) return;
  const lines = newHomeMatches
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((m) => {
      const us = m.clubs[homeId];
      const oppId = Object.keys(m.clubs).find((k) => k !== homeId);
      const opp = m.clubs[oppId];
      const res = us.wins === '1' ? '✅ W' : us.losses === '1' ? '❌ L' : '➖ D';
      const scorers = Object.values(m.players?.[homeId] || {})
        .filter((p) => num(p.goals) > 0)
        .map((p) => `${p.playername}${num(p.goals) > 1 ? ` ×${p.goals}` : ''}`)
        .join(', ');
      return `${res} **${us.goals}–${opp.goals}** vs ${opp.details?.name ?? oppId}${scorers ? ` · ⚽ ${scorers}` : ''}`;
    });
  await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n').slice(0, 1900) }),
  }).catch((e) => console.warn('Discord post failed:', e.message));
}

async function main() {
  track(homeId, 'home', { depth: 0 });
  for (const id of config.extraClubIds || []) track(id, 'manual', { depth: 0 });

  // Home first, so the roster is known before other clubs are checked for links.
  const home = await fetchClub(homeId);
  home.members.forEach((m) => homeRoster.add(m.name.toLowerCase()));
  console.log(`Home: ${home.info?.name} – ${home.members.length} members`);

  // Rebuild known home player IDs from the archive.
  for (const f of fs.readdirSync(path.join(DATA, 'matches'))) {
    const m = readJson(path.join(DATA, 'matches', f));
    Object.keys(m?.players?.[homeId] || {}).forEach((pid) => homePlayerIds.add(pid));
  }

  const entries = Object.entries(state.clubs).filter(([id]) => id !== homeId);
  const always = entries.filter(([, c]) => FULL_TIERS.has(c.tier));
  const rotating = entries
    .filter(([, c]) => c.tier === 'discovered')
    .sort(([, a], [, b]) => (a.lastFetched ?? '').localeCompare(b.lastFetched ?? '') || (a.depth ?? 9) - (b.depth ?? 9))
    .slice(0, config.discovery?.discoveredPerRun ?? 25);

  for (const [id, c] of [...always, ...rotating]) {
    try {
      const r = await fetchClub(id);
      console.log(`${c.tier.padEnd(10)} ${r.info?.name ?? id}`);
    } catch (e) {
      c.fails = (c.fails ?? 0) + 1;
      console.warn(`${id}: ${e.message}`);
    }
  }

  await postToDiscord();
  writeJson(stateFile, state);
  // One heartbeat per day keeps GitHub from pausing the schedule on quiet weeks.
  writeJson(path.join(DATA, 'meta.json'), { lastSuccessfulDay: now.slice(0, 10), platform });

  const tiers = Object.values(state.clubs).reduce((a, c) => ((a[c.tier] = (a[c.tier] ?? 0) + 1), a), {});
  console.log(`Done: ${requests} requests, ${newHomeMatches.length} new home matches, clubs:`, tiers);
}

main().catch((e) => {
  console.error(e.message);
  if (blocked) console.error('EA returned 403 (blocked). See README → "If EA blocks GitHub".');
  writeJson(stateFile, state);
  process.exit(1);
});
