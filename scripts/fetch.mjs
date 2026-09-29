// Pulls data from EA's Pro Clubs API into data/ and discovers new clubs automatically.
//
// Tiers:
//   home       – your club, fetched every run, full match history kept
//   manual     – clubs added via config.extraClubIds or a "Track another club" request approved by a manager (P5.6)
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
import { DATA, readJson, writeJson, loadConfig, loadOverrides, loadBotSettings, num, sleep, eventCounts } from './lib.mjs';
import { matchComponents } from '../bot/matchcard.js';

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
      players[clubId][pid] = { ...keep, ...eventCounts(match_event_aggregate_0) };
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
    // Club friendlies (P1.8) only for the home club – a third mode on the site, never mixed into League totals.
    for (const matchType of id === homeId ? ['leagueMatch', 'playoffMatch', 'friendlyMatch'] : ['leagueMatch', 'playoffMatch']) {
      const matches = (await api('clubs/matches', { clubIds: id, matchType })) || [];
      for (const m of matches) {
        Object.keys(m.clubs || {}).forEach((o) => o !== id && opponents.add(o));
        for (const [clubId, cm] of Object.entries(m.clubs || {})) {
          if (cm.details?.name && state.clubs[clubId]) state.clubs[clubId].name ??= cm.details.name;
        }
        const file = path.join(DATA, 'matches', `${m.matchId}.json`);
        if (fs.existsSync(file)) continue;
        writeJson(file, slimMatch(m, matchType));
        if (matchType === 'friendlyMatch') continue; // no Discord post, no link/discovery from friendlies
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

// P1.8 – EA's global top 100 by skill rating, once a day → data/world.json (Leaderboards page).
async function fetchWorld() {
  const file = path.join(DATA, 'world.json');
  if (readJson(file, {}).fetchedAt?.slice(0, 10) === now.slice(0, 10)) return;
  const list = await api('allTimeLeaderboard', {}).catch((e) => (console.warn(`World top 100: ${e.message}`), null));
  if (!Array.isArray(list) || !list.length) return;
  writeJson(file, {
    fetchedAt: now,
    clubs: list.slice(0, 100).map((c) => ({
      rank: num(c.rank), id: String(c.clubId), name: c.clubName ?? c.clubInfo?.name ?? '', crest: c.clubInfo?.customKit?.crestAssetId ?? null,
      sr: num(c.skillRating), gp: num(c.gamesPlayed), w: num(c.wins), d: num(c.ties), l: num(c.losses), gf: num(c.goals), ga: num(c.goalsAgainst),
      cs: num(c.cleanSheets), div: num(c.currentDivision) || null, rep: num(c.reputationtier),
    })),
  });
  console.log(`World top 100 saved (#100 = SR ${num(list.at(-1)?.skillRating)})`);
}

let overrideHidden = []; // P5.6 "hide me" requests – kept out of the Discord post like on the site

// New home results → Discord. With the bot token and the discordMatch flag on for members/public, each result is
// posted by the bot into the webhook's channel with the P7.2 "Show my match" menu (plain webhooks can't carry
// interactive components); if that fails, or otherwise, it goes through the webhook as before.
async function postToDiscord() {
  const hook = process.env.DISCORD_WEBHOOK;
  if (!hook || !newHomeMatches.length) return;
  const settings = await loadBotSettings(config); // P7.5 – result channel override, ping role, emoji, on/off
  if (!settings.autoPosts.results) return;
  const site = config.siteUrl?.replace(/\/?$/, '/') ?? '';
  const crestCdn = 'https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l';
  const hide = new Set([...(config.hiddenPlayers || []), ...overrideHidden].map((h) => String(h).toLowerCase()));
  const items = newHomeMatches
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-10)
    .map((m) => {
      const us = m.clubs[homeId];
      const oppId = Object.keys(m.clubs).find((k) => k !== homeId);
      const opp = m.clubs[oppId];
      const res = us.wins === '1' ? 'W' : us.losses === '1' ? 'L' : 'D';
      const ourIds = Object.entries(m.players?.[homeId] || {}).filter(([pid, p]) => !hide.has(pid.toLowerCase()) && !hide.has(String(p.playername).toLowerCase()));
      const ours = ourIds.map(([, p]) => p);
      const list = (f) => ours.filter((p) => num(p[f]) > 0).map((p) => `${p.playername}${num(p[f]) > 1 ? ` ×${p[f]}` : ''}`).join('\n');
      const motm = Object.values(m.players || {}).flatMap((l) => Object.values(l)).find((p) => p.mom === '1');
      const best = [...ours].sort((a, b) => num(b.rating) - num(a.rating))[0];
      const oppCrest = opp.details?.customKit?.crestAssetId;
      const url = site ? `${site}matches/${m.matchId}.html` : undefined;
      const components = matchComponents(m.matchId, ourIds.map(([k, p]) => ({ k, n: p.playername, r: num(p.rating), g: num(p.goals), a: num(p.assists) })), url);
      return { components, embed: {
        title: `${settings.emoji ? `${settings.emoji} ` : ''}${us.details?.name ?? 'NOREX'} ${us.goals}–${opp.goals} ${opp.details?.name ?? oppId}`,
        url,
        color: { W: 0x22c55e, D: 0xeab308, L: 0xef4444 }[res],
        description: res === 'W' ? '✅ **Victory**' : res === 'L' ? '❌ **Defeat**' : '➖ **Draw**',
        thumbnail: { url: res === 'L' && oppCrest ? `${crestCdn}${oppCrest}.png` : `${site}assets/crest.png` },
        fields: [
          list('goals') && { name: '⚽ Goals', value: list('goals'), inline: true },
          list('assists') && { name: '🎯 Assists', value: list('assists'), inline: true },
          motm && { name: '⭐ Man of the match', value: `${motm.playername} (${num(motm.rating).toFixed(1)})`, inline: true },
          best && { name: '📈 Our top rated', value: `${best.playername} (${num(best.rating).toFixed(1)})`, inline: true },
        ].filter(Boolean),
        timestamp: new Date(m.timestamp * 1000).toISOString(),
        footer: { text: m.matchType === 'playoffMatch' ? 'Playoff match' : 'League match' },
      } };
    });
  let rest = items;
  const token = process.env.DISCORD_BOT_TOKEN;
  const pingContent = settings.pingRole ? `<@&${settings.pingRole}>` : undefined;
  const allowedMentions = settings.pingRole ? { roles: [settings.pingRole] } : { parse: [] };
  if (token && ['members', 'public'].includes(config.features?.discordMatch)) {
    // P7.5: a configured result channel overrides the webhook's own channel (still needs the bot token to redirect).
    const channel = settings.resultChannel || await fetch(hook).then((r) => (r.ok ? r.json() : null)).then((w) => w?.channel_id).catch(() => null);
    while (channel && rest.length) {
      const { embed, components } = rest[0];
      const r = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, {
        method: 'POST', headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: pingContent, embeds: [embed], components, allowed_mentions: allowedMentions }),
      }).catch((e) => ({ ok: false, status: e.message }));
      if (!r.ok) { console.warn(`Bot post failed (${r.status}) – the bot needs View Channel + Send Messages + Embed Links there. Using the webhook.`); break; }
      rest = rest.slice(1);
    }
  }
  if (!rest.length) return;
  await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'NOREX UNITED', avatar_url: site ? `${site}assets/crest.png` : undefined, content: pingContent, embeds: rest.map((x) => x.embed), allowed_mentions: allowedMentions }),
  }).catch((e) => console.warn('Discord post failed:', e.message));
}

// P5.6: clubs approved in the manager portal. Approved by name only → look the ID up once via EA's club search and
// report it back. Clubs no longer requested (undone) drop back to 'discovered' – only when the list loaded.
async function trackRequested() {
  const o = await loadOverrides(config);
  overrideHidden = o.hiddenPlayers;
  if (!o.ok) return;
  const resolved = [];
  for (const c of o.clubs) {
    let id = c.id;
    if (!id) {
      const hits = (await api('allTimeLeaderboard/search', { clubName: c.name }).catch(() => null)) || [];
      id = hits.find((h) => String(h.clubName ?? h.clubInfo?.name ?? h.name ?? '').toLowerCase() === c.name.toLowerCase())?.clubId;
      if (!id) { console.warn(`Requested club not found on EA: ${c.name}`); continue; }
      resolved.push({ req: c.req, clubId: String(id) });
    }
    if (String(id) !== homeId) track(id, 'manual', { depth: 0 });
    c.id = String(id);
  }
  if (resolved.length) await loadOverrides(config, { resolved });
  const wanted = new Set([...(config.extraClubIds || []).map(String), ...o.clubs.map((c) => c.id).filter(Boolean)]);
  for (const [id, c] of Object.entries(state.clubs)) if (c.tier === 'manual' && !wanted.has(id)) c.tier = 'discovered';
}

async function main() {
  track(homeId, 'home', { depth: 0 });
  for (const id of config.extraClubIds || []) track(id, 'manual', { depth: 0 });
  await trackRequested();

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

  await fetchWorld();
  await postToDiscord();
  writeJson(stateFile, state);
  // One heartbeat per day keeps GitHub from pausing the schedule on quiet weeks.
  writeJson(path.join(DATA, 'meta.json'), { lastSuccessfulDay: now.slice(0, 10), platform });

  const tiers = Object.values(state.clubs).reduce((a, c) => ((a[c.tier] = (a[c.tier] ?? 0) + 1), a), {});
  console.log(`Done: ${requests} requests, ${newHomeMatches.length} new home matches, clubs:`, tiers);
}

main().catch((e) => {
  console.error(e.message);
  if (blocked) console.error('EA returned 403 (blocked). Run the fetcher from another machine until the block lifts.');
  writeJson(stateFile, state);
  process.exit(1);
});
