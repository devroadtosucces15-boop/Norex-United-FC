// Turns data/ into a static website in site/. No dependencies, no framework.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA, readJson, loadConfig, loadOverrides, num } from './lib.mjs';
import { lineChart, goalBars, donut, radar, spark, pitchMap } from './charts.mjs';
import { buildUpdates } from './updates-page.mjs';
import { buildBuilder } from './builder-page.mjs';
import { buildProBuilds } from './probuilds-page.mjs';
import { buildDocs } from './docs-page.mjs';
import { buildFeed } from './feed-page.mjs';
import { buildHub } from './hub-page.mjs';
import { buildMessages } from './messages-page.mjs';
import { buildTactics } from './tactics-page.mjs';
import { advancedSection, buildHallOfFame, buildLeaders, leagueMatches } from './leaders-page.mjs';
import { buildRankings } from './rankings.mjs';
import { buildBurners, burnersFeed, loadBurners } from './burners-page.mjs';

const OUT = process.env.NOREX_OUT || path.join(ROOT, 'site');
const config = loadConfig();
const homeId = String(config.homeClubId);
const brand = config.brand ?? {};
const state = readJson(path.join(DATA, 'state.json'), { clubs: {} });
const overrides = await loadOverrides(config); // P5.6 – "hide me" requests approved by managers
const hidden = new Set([...(config.hiddenPlayers || []), ...overrides.hiddenPlayers].map((h) => String(h).toLowerCase()));
const builtAt = new Date().toISOString();
const SITE = config.siteUrl?.replace(/\/?$/, '/') ?? '';
const DISCORD = config.discord?.applyLink || '';
const RECRUIT = config.recruitment ?? {};
const MEMBER_API = config.members?.api || '';
// Feature flags (P0.7): the site hides [data-flag] parts the viewer's role doesn't unlock; the Worker enforces.
const FEATURES = JSON.stringify(config.features ?? {});
const DISCORD_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.5 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18a19.9 19.9 0 0 0 6 3l1.3-2a13 13 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4-2 1 1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.6-3.6-13.6ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></svg>';
// Club channels (P1.3): footer icons + home "Watch" section; the live bar/embed is drawn by app.js from /api/live.
const STREAMS = config.streams ?? {};
const YT_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>';
const TWITCH_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M2.9 0 1.3 4.2v16.9h5.8V24h3.2l3.1-2.9h4.7l6.3-6.2V0H2.9Zm18.4 13.8-3.7 3.6h-5.8L8.6 20.3v-2.9H3.8V2.1h17.5v11.7ZM17.6 6.3v6.2h-2.1V6.3h2.1Zm-5.8 0v6.2H9.7V6.3h2.1Z"/></svg>';
const CHANNELS = [['twitch', 'Twitch', TWITCH_SVG, 'Live match nights, Rush sessions and trials'], ['youtube', 'YouTube', YT_SVG, 'Highlights, goals of the week and full streams']].filter(([k]) => STREAMS[k]);
const CREST_CDN = 'https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l';

// ---------- helpers ----------
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'x';
const hex = (d, fallback) => (d === undefined || d === null || d === '' ? fallback : '#' + Number(d).toString(16).padStart(6, '0'));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const readDir = (dir) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(dir, f))).filter(Boolean) : [];
const POS = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' };
const posAbbr = (p) => POS[String(p).toLowerCase()] ?? (p ? String(p).slice(0, 3).toUpperCase() : '—');
// EA's proPos codes (FIFA position ids) give the exact position, e.g. 25 = ST.
const PRO_POS = ['GK', 'SW', 'RWB', 'RB', 'RCB', 'CB', 'LCB', 'LB', 'LWB', 'RDM', 'CDM', 'LDM', 'RM', 'RCM', 'CM', 'LCM', 'LM', 'RAM', 'CAM', 'LAM', 'RF', 'CF', 'LF', 'RW', 'RS', 'ST', 'LS', 'LW'];
const TIDY = { RCB: 'CB', LCB: 'CB', RDM: 'CDM', LDM: 'CDM', RCM: 'CM', LCM: 'CM', RAM: 'CAM', LAM: 'CAM', RS: 'ST', LS: 'ST', RF: 'CF', LF: 'CF', SW: 'CB' };
const posOf = (st) => {
  const code = PRO_POS[num(st?.proPos)];
  return st?.proPos !== undefined && st?.proPos !== '' && code ? TIDY[code] ?? code : st?.favoritePosition ? posAbbr(st.favoritePosition) : '';
};
const groupOf = (label) => (label === 'GK' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(label) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM', 'MID'].includes(label) ? 'MID' : label ? 'FWD' : '');
// P11.12 player taglines: a short flavour-text title from real season stats – same "pure data" approach as
// the P11.9 aura (deterministic, free, no AI model), so it works everywhere the card does. Needs 3+ games.
function tagline(pl) {
  const s = pl.main, gp = num(s?.gamesPlayed);
  if (!s || gp < 3) return null;
  const grp = pl.group, g = num(s.goals), a = num(s.assists), r = num(s.ratingAve), m = num(s.manOfTheMatch), pss = num(s.passSuccessRate), tkl = num(s.tackleSuccessRate), w = num(s.winRate);
  const gpg = g / gp, apg = a / gp, motmRate = m / gp;
  const T = [
    [grp === 'GK' && r >= 7.8, '🧤 Last Line'],
    [grp === 'GK' && motmRate >= 0.25, '🧤 Big-Game Keeper'],
    [grp !== 'GK' && gpg >= 1, '⚽ Goal Machine'],
    [grp !== 'GK' && apg >= 0.7, '🪄 Playmaker'],
    [grp !== 'GK' && gpg >= 0.5, '🎯 Clinical Finisher'],
    [motmRate >= 0.3, '🏅 Big-Game Player'],
    [grp === 'DEF' && tkl >= 72, '🧱 The Wall'],
    [grp !== 'GK' && tkl >= 78, '🛡️ Tackle Machine'],
    [(grp === 'MID' || grp === 'DEF') && pss >= 88, '🎼 Metronome'],
    [r >= 8, '⭐ Talisman'],
    [gp >= 50, '📅 Ever-Present'],
    [w >= 70 && gp >= 10, '🍀 Lucky Charm'],
  ];
  const hit = T.find(([c]) => c);
  return hit ? hit[1] : { GK: '🧤 The Keeper', DEF: '🛡️ Steady Defender', MID: '⚙️ Engine Room', FWD: '🔥 Live Wire' }[grp] ?? '⚽ Squad Player';
}
const ratingClass = (r) => (r >= 9 ? 'r-elite' : r >= 8 ? 'r-great' : r >= 7 ? 'r-good' : r >= 6 ? 'r-mid' : 'r-low');
const dateStr = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);
const niceDate = (ts) => new Date(ts * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const chipDate = (ts) => new Date(ts * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
// One flap per digit: a 0-9 strip app.js translates into place (stadium-scoreboard reveal, board 05).
const flapDigit = (d) => `<span class="flap" data-d="${d}"><span class="flap-strip">${'0123456789'.split('').map((x) => `<b>${x}</b>`).join('')}</span></span>`;
const flapDigits = (n) => [...String(n)].map(flapDigit).join('');

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

// ---------- load ----------
const clubs = new Map(readDir(path.join(DATA, 'clubs')).map((c) => [String(c.id), c]));
const allMatches = readDir(path.join(DATA, 'matches')).sort((a, b) => b.timestamp - a.timestamp);
// P1.8: club friendlies are a mode of their own – never mixed into League/playoff totals, players or boards.
const matches = allMatches.filter((m) => m.matchType !== 'friendlyMatch');
const friendlies = allMatches.filter((m) => m.matchType === 'friendlyMatch' && m.clubs[homeId]);
const typeLabel = (m) => ({ playoffMatch: 'Playoff', friendlyMatch: 'Friendly' })[m.matchType] ?? 'League';
// P1.8: dribbles + second assists (EA event codes 174/115) only exist in matches archived after the fetcher kept them.
const hasEv = (m) => Object.values(m.players || {}).some((l) => Object.values(l).some((p) => p.dribbles !== undefined));
const evNum = (v) => (v === undefined ? null : num(v));
const evFirst = Math.min(...allMatches.filter(hasEv).map((m) => m.timestamp));
const EV_SINCE = Number.isFinite(evFirst) ? new Date(evFirst * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : null;
function matchClubName(id) {
  for (const m of allMatches) if (m.clubs[id]?.name) return m.clubs[id].name;
  return null;
}
const clubName = (id) => clubs.get(String(id))?.info?.name ?? state.clubs[id]?.name ?? matchClubName(id) ?? `Club ${id}`;
const clubKit = (id) => clubs.get(String(id))?.info?.customKit ?? allMatches.find((m) => m.clubs[id]?.kit)?.clubs[id].kit ?? null;
const result = (c) => (c?.wins === '1' ? 'W' : c?.losses === '1' ? 'L' : 'D');
const oppOf = (m, id) => Object.keys(m.clubs).find((k) => k !== id);
const homeMatches = matches.filter((m) => m.clubs[homeId]);

// ---------- crests ----------
function badgeSvg(id) {
  const kit = clubKit(id) ?? {};
  const a = hex(kit.kitColor1, '#333'), b = hex(kit.kitColor2, '#999');
  const initials = esc(clubName(id).replace(/\b(FC|CF|AFC|SC|AC)\b/gi, '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || '?');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M20 2 36 8v12c0 9-7 15-16 18C11 35 4 29 4 20V8z" fill="${a}" stroke="${b}" stroke-width="2.5"/><text x="20" y="24" text-anchor="middle" font-size="${initials.length > 2 ? 9 : 11}" font-weight="800" fill="#fff" font-family="sans-serif">${initials}</text></svg>`;
}
const badgeUri = (id) => 'data:image/svg+xml,' + encodeURIComponent(badgeSvg(id));
function crestSrc(id, base) {
  if (String(id) === homeId) return `${base}assets/crest.png`;
  const asset = clubKit(id)?.crestAssetId;
  return asset ? `${CREST_CDN}${asset}.png` : badgeUri(id);
}
// Absolute crest URL for share previews (og:image) – EA crest, else our own (never a data: URI).
const ogCrest = (id) => { const asset = String(id) !== homeId && clubKit(id)?.crestAssetId; return asset ? `${CREST_CDN}${num(asset)}.png` : `${SITE}assets/crest.png`; };
const crest = (id, size, base, cls = '') =>
  `<img class="crest ${cls}" src="${esc(crestSrc(id, base))}" width="${size}" height="${size}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${esc(badgeUri(id)).replace(/'/g, '%27')}'">`;

// ---------- players ----------
const players = new Map();
const nameToKey = new Map();
function player(key) {
  if (!players.has(key)) {
    players.set(key, { key, id: /^\d+$/.test(key) ? key : null, names: new Set(), name: null, clubStats: {}, career: null, apps: [], fapps: [] });
  }
  return players.get(key);
}
for (const m of [...matches].reverse()) {
  for (const [clubId, list] of Object.entries(m.players || {})) {
    const oppId = oppOf(m, clubId);
    for (const [pid, p] of Object.entries(list)) {
      const pl = player(pid);
      pl.names.add(p.playername);
      pl.name = p.playername;
      nameToKey.set(p.playername.toLowerCase(), pid);
      pl.apps.push(appOf(m, clubId, oppId, p));
    }
  }
}
function appOf(m, clubId, oppId, p) {
  return {
    matchId: m.matchId, ts: m.timestamp, clubId, oppId, res: result(m.clubs[clubId]),
    gf: num(m.clubs[clubId]?.goals), ga: num(m.clubs[oppId]?.goals),
    goals: num(p.goals), assists: num(p.assists), rating: num(p.rating), mom: num(p.mom), pos: p.pos,
    shots: num(p.shots), passes: num(p.passesmade), passAtt: num(p.passattempts),
    tackles: num(p.tacklesmade), tackleAtt: num(p.tackleattempts), saves: num(p.saves), red: num(p.redcards),
    dribbles: evNum(p.dribbles), sa: evNum(p.secondassists),
  };
}
for (const [clubId, c] of clubs) {
  for (const mbr of c.members || []) {
    const lower = mbr.name.toLowerCase();
    const key = nameToKey.get(lower) ?? `n-${slug(mbr.name)}`;
    nameToKey.set(lower, key);
    const pl = player(key);
    pl.names.add(mbr.name);
    pl.name ??= mbr.name;
    pl.clubStats[clubId] = mbr;
  }
  for (const car of c.career || []) {
    const key = nameToKey.get(car.name.toLowerCase());
    if (!key) continue;
    const pl = player(key);
    if (!pl.career || num(car.gamesPlayed) > num(pl.career.gamesPlayed)) pl.career = car;
  }
}
// Friendlies (P1.8) go into their own log for players we already know – they never create players or League stats.
for (const m of [...friendlies].reverse()) {
  const oppId = oppOf(m, homeId);
  for (const [pid, p] of Object.entries(m.players?.[homeId] || {})) {
    const key = players.has(pid) ? pid : nameToKey.get(String(p.playername).toLowerCase());
    if (key) players.get(key).fapps.push(appOf(m, homeId, oppId, p));
  }
}
for (const pl of players.values()) {
  pl.fapps.sort((a, b) => b.ts - a.ts);
  pl.hidden = hidden.has(String(pl.id ?? '').toLowerCase()) || [...pl.names].some((n) => hidden.has(n.toLowerCase()));
  pl.apps.sort((a, b) => b.ts - a.ts);
  pl.clubIds = [...new Set([...Object.keys(pl.clubStats), ...pl.apps.map((a) => a.clubId)])];
  pl.isHome = !!pl.clubStats[homeId];
  const s = Object.entries(pl.clubStats).sort(([, a], [, b]) => num(b.gamesPlayed) - num(a.gamesPlayed));
  pl.main = pl.isHome ? pl.clubStats[homeId] : s[0]?.[1] ?? null;
  pl.mainClub = pl.isHome ? homeId : s[0]?.[0] ?? pl.apps[0]?.clubId ?? null;
  pl.ovr = Math.max(0, ...Object.values(pl.clubStats).map((x) => num(x.proOverall)));
  pl.position = pl.main?.favoritePosition || pl.career?.favoritePosition || pl.apps[0]?.pos || '';
  pl.pos = posOf(pl.main) || posAbbr(pl.position);
  pl.group = groupOf(pl.pos);
  pl.tag = tagline(pl);
  // Stats rebuilt from archived matches, for guests/ex-members EA no longer lists.
  const apps = pl.apps.filter((x) => x.clubId === (pl.mainClub ?? x.clubId));
  const ag = apps.length;
  pl.arch = ag ? {
    gp: ag, g: sum(apps, (x) => x.goals), a: sum(apps, (x) => x.assists), r: Math.round(avg(apps.map((x) => x.rating)) * 10) / 10, m: sum(apps, (x) => x.mom),
    p: pct(sum(apps, (x) => x.passes), sum(apps, (x) => x.passAtt)), t: pct(sum(apps, (x) => x.tackles), sum(apps, (x) => x.tackleAtt)), w: pct(apps.filter((x) => x.res === 'W').length, ag),
  } : null;
  pl.playedForHome = pl.apps.some((x) => x.clubId === homeId);
}
const visiblePlayers = [...players.values()].filter((p) => !p.hidden);

// Percentile radar: how a player compares to everyone tracked with 3+ games.
const RADAR = [
  { label: 'Scoring', f: (s) => num(s.goals) / num(s.gamesPlayed), show: (v) => v.toFixed(2) + ' g/gm' },
  { label: 'Creating', f: (s) => num(s.assists) / num(s.gamesPlayed), show: (v) => v.toFixed(2) + ' a/gm' },
  { label: 'Passing', f: (s) => num(s.passSuccessRate), show: (v) => v + '%' },
  { label: 'Defending', f: (s) => num(s.tacklesMade) / num(s.gamesPlayed), show: (v) => v.toFixed(1) + ' tkl/gm' },
  { label: 'Rating', f: (s) => num(s.ratingAve), show: (v) => v.toFixed(1) },
  { label: 'Winning', f: (s) => num(s.winRate), show: (v) => v + '%' },
];
const pool = visiblePlayers.filter((p) => p.main && num(p.main.gamesPlayed) >= 3);
const sortedPool = RADAR.map((ax) => pool.map((p) => ax.f(p.main)).sort((a, b) => a - b));
const percentile = (i, v) => {
  const arr = sortedPool[i];
  if (!arr.length) return 0;
  let below = 0;
  for (const x of arr) if (x < v) below++;
  return Math.round((below / arr.length) * 100);
};
for (const pl of visiblePlayers) {
  const ok = pl.main && num(pl.main.gamesPlayed);
  pl.radar = ok ? RADAR.map((ax, i) => percentile(i, ax.f(pl.main))) : null;
  pl.radarRaw = ok ? RADAR.map((ax) => ax.show(ax.f(pl.main))) : null;
}

const pUrl = (pl, base) => `${base}players/${esc(pl.key)}.html`;
const pLink = (key, base, fallbackName) => {
  const pl = players.get(key);
  if (!pl || pl.hidden) return fallbackName && !pl ? esc(fallbackName) : '<span class="muted">Hidden player</span>';
  return `<a href="${pUrl(pl, base)}">${esc(pl.name ?? fallbackName)}</a>`;
};
const pLinkByName = (name, base) => pLink(nameToKey.get(name.toLowerCase()), base, name);
const clubHref = (id, base) => (id === homeId ? `${base}index.html` : clubs.has(String(id)) ? `${base}clubs/${id}.html` : null);
const clubLink = (id, base) => (clubHref(id, base) ? `<a href="${clubHref(id, base)}">${esc(clubName(id))}</a>` : esc(clubName(id)));

// ---------- components ----------
const tier = (ovr) => (ovr >= 88 ? 'icon' : ovr >= 80 ? 'gold' : ovr >= 70 ? 'silver' : ovr > 0 ? 'bronze' : 'plain');
// P11.9 seasonal aura: card glow shifts with real recent form (last 3 league games) – no AI model, pure data.
// `apps` is stored newest-first (see the players.json `tr` field below, which reverses it to get oldest→newest).
const AURA_HOT = 7.6, AURA_COLD = 6.0;
function aura(pl) {
  const recent = (pl.apps ?? []).slice(0, 3).map((x) => x.rating).filter((r) => r > 0);
  if (recent.length < 2) return null;
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return avg >= AURA_HOT ? 'hot' : avg <= AURA_COLD ? 'cold' : null;
}
const SILHOUETTE = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="33" r="19"/><path d="M10 100c2-25 19-37 40-37s38 12 40 37z"/></svg>`;
const STARS = '<span class="stars" aria-hidden="true">★★★★★</span>';

function futCard(pl, base, { big = false } = {}) {
  const s = pl.main ?? {};
  const gp = num(s.gamesPlayed);
  const stats = [
    ['GLS', s.goals ?? '–'], ['AST', s.assists ?? '–'], ['RAT', s.ratingAve ?? '–'],
    ['PAS', s.passSuccessRate !== undefined ? s.passSuccessRate + '%' : '–'], ['TKL', s.tackleSuccessRate !== undefined ? s.tackleSuccessRate + '%' : '–'], ['GP', gp || '–'],
  ];
  const au = aura(pl);
  return `<a class="fut tier-${tier(pl.ovr)}${au ? ` aura-${au}` : ''}${big ? ' big' : ''}" href="${pUrl(pl, base)}" data-pos="${pl.group}">
<span class="fut-shine"></span>
${au ? `<span class="fut-aura" aria-label="${au === 'hot' ? 'On a hot streak' : 'In a cold spell'}">${au === 'hot' ? '🔥' : '🧊'}</span>` : ''}
<span class="fut-top"><b class="fut-ovr">${pl.ovr || '–'}</b><span class="fut-pos">${esc(pl.pos || '—')}</span>${pl.mainClub ? crest(pl.mainClub, 28, base, 'fut-crest') : ''}</span>
<span class="fut-face">${SILHOUETTE}</span>
<span class="fut-name">${esc(pl.name)}</span>
${pl.tag ? `<span class="fut-tag">${esc(pl.tag)}</span>` : ''}
<span class="fut-stats">${stats.map(([k, v]) => `<span><b>${esc(v)}</b>${k}</span>`).join('')}</span>
</a>`;
}

const counter = (label, value, { suffix = '', dec = 0, text, href } = {}) =>
  `<${href ? `a class="stat link" href="${href}"` : 'div class="stat"'}><span>${label}</span><b${text === undefined ? ` class="count" data-to="${num(value)}" data-dec="${dec}" data-suffix="${suffix}"` : ''}>${text ?? `${esc(dec ? num(value).toFixed(dec) : value ?? 0)}${suffix}`}</b>${href ? '<i class="stat-go" aria-hidden="true">→</i>' : ''}</${href ? 'a' : 'div'}>`;
// Friendly empty state (same look as UI.empty in web/ui.js).
const emptyState = (icon, title, text = '', action = '') =>
  `<div class="nx-empty"><span class="nx-empty-ic" aria-hidden="true">${icon}</span><b>${esc(title)}</b>${text ? `<p>${text}</p>` : ''}${action}</div>`;
const resPill = (r) => `<span class="res ${r}">${r}</span>`;
const ratingPill = (r) => `<span class="rp ${ratingClass(r)}">${r ? r.toFixed(1) : '–'}</span>`;
const td = (v, n = false, sort) => `<td${n ? ' class="n"' : ''}${sort !== undefined ? ` data-v="${esc(sort)}"` : ''}>${v}</td>`;
const dateCell = (ts) => td(`<time datetime="${new Date(ts * 1000).toISOString()}">${dateStr(ts)}</time>`, false, ts);
const table = (id, head, rows, opts = {}) => `
${opts.filter ? `<input class="filter" type="search" placeholder="${esc(opts.filter)}" data-filter="${id}" aria-label="${esc(opts.filter)}">` : ''}
<div class="tbl"><table id="${id}" class="sortable"><thead><tr>${head.map((h) => `<th${h.startsWith('#') ? ' class="n"' : ''}>${esc(h.replace(/^#/, ''))}</th>`).join('')}</tr></thead>
<tbody>${rows.length ? rows.join('') : `<tr><td colspan="${head.length}" class="muted t-empty">📭 Nothing yet – the archive grows with every match, check back after the next one.</td></tr>`}</tbody></table></div>`;
const section = (title, body, { sub = '', id = '', cls = '' } = {}) =>
  `<section class="block reveal ${cls}"${id ? ` id="${id}"` : ''}><h2 class="banner-h">${title}${sub ? ` <small>${sub}</small>` : ''}</h2>${body}</section>`;
const card = (title, body, cls = '') => `<div class="card ${cls}">${title ? `<h3>${title}</h3>` : ''}${body}</div>`;
const pageHead = (title, sub, base, showCrest = true) =>
  `<section class="page-head reveal">${showCrest ? `<img src="${base}assets/crest.png" height="84" alt="">` : ''}<div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div></section>`;

// League ⇄ Rush switch (roadmap P0.4). League comes from EA data built here; Rush is logged by members and
// drawn by app.js from the member API (`data-rush` says which view). Without the member API it's League only.
// P1.8: an optional third tab, Friendly (club friendlies, built here like League) – only where `friendly` is given.
const MODES = [['league', '🏆 League'], ['rush', '⚡ Rush'], ['friendly', '🤝 Friendly']];
const modes = (league, rush, label = '', friendly = null) => (MEMBER_API ? `<div class="modes" data-modes>
<div class="mode-bar reveal"><div class="nx-tabs mode-switch" role="tablist" aria-label="${friendly == null ? 'League or Rush' : 'League, Rush or Friendly'}">${MODES.filter(([k]) => k !== 'friendly' || friendly != null).map(([k, l], i) => `<button type="button" role="tab" data-key="${k}" aria-selected="${!i}" tabindex="${i ? -1 : 0}">${l}</button>`).join('')}</div>${label ? `<small class="muted">${label}</small>` : ''}</div>
<div data-mode="league">${league}</div><div data-mode="rush" data-rush="${esc(rush)}" hidden></div>${friendly != null ? `<div data-mode="friendly" hidden>${friendly}</div>` : ''}</div>` : league);

// P1.8: match calendar filter – month chips + a day picker that narrow every [data-day] item inside #scope (app.js).
function calendar(scope, ms) {
  if (ms.length < 2) return '';
  const months = [...new Set(ms.map((m) => dateStr(m.timestamp).slice(0, 7)))].sort().reverse();
  const days = ms.map((m) => dateStr(m.timestamp)).sort();
  const mName = (ym) => new Date(ym + '-15T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `<div class="calbar" data-cal="${scope}"><span class="cal-ic" aria-hidden="true">📅</span><div class="chipset" role="group" aria-label="Month">${['all', ...months].map((k, i) => `<button class="chip${i ? '' : ' on'}" type="button" data-month="${k}" aria-pressed="${!i}">${k === 'all' ? 'All' : mName(k)}</button>`).join('')}</div>
<label class="cal-day"><span>Day</span><input type="date" min="${days[0]}" max="${days.at(-1)}" aria-label="Pick a match day"></label><small class="cal-count muted" aria-live="polite"></small></div>`;
}

function barList(rows, { fmt = (v) => v, base }) {
  const max = Math.max(...rows.map((r) => r.v), 0.0001);
  return `<ol class="barlist">${rows.map((r, i) => `<li style="--w:${Math.max(4, (r.v / max) * 100)}%"><span class="bl-rank">${i + 1}</span><span class="bl-name">${r.pl ? pLink(r.pl.key, base) : esc(r.name)}</span><b>${fmt(r.v)}</b></li>`).join('') || '<li class="muted bl-empty">📭 Nothing to rank yet – fills in as matches are archived.</li>'}</ol>`;
}

function formStrip(ms, id, base) {
  return ms.slice(0, 10).reverse().map((m) => `<a href="${base}matches/${m.matchId}.html" data-tip="${esc(`${m.clubs[id].goals}–${m.clubs[oppOf(m, id)].goals} vs ${clubName(oppOf(m, id))}`)}">${resPill(result(m.clubs[id]))}</a>`).join('');
}

function fixture(m, id, base, anchor) {
  const o = oppOf(m, id), us = m.clubs[id], them = m.clubs[o];
  const scorers = Object.values(m.players?.[id] || {}).filter((p) => num(p.goals) > 0).map((p) => `${esc(p.playername)}${num(p.goals) > 1 ? ` ×${p.goals}` : ''}`).join(', ');
  return `<a class="fixture ${result(us)}"${anchor ? ` id="${anchor}"` : ''} href="${base}matches/${m.matchId}.html" data-day="${dateStr(m.timestamp)}" data-id="${m.matchId}">
<span class="fx-date">${niceDate(m.timestamp)}</span>${resPill(result(us))}
<span class="fx-team">${crest(id, 28, base)}<span>${esc(clubName(id))}</span></span>
<span class="fx-score">${esc(us.goals)}<i>–</i>${esc(them.goals)}</span>
<span class="fx-team away"><span>${esc(clubName(o))}</span>${crest(o, 28, base)}</span>
<span class="fx-extra">${scorers ? `⚽ ${scorers}` : ''}</span></a>`;
}

// Crest the result-graphic canvas may draw: ours from the site, EA crests through the Worker's CORS proxy (P1.6).
function posterCrest(id, base) {
  if (String(id) === homeId) return `${base}assets/crest.png`;
  const asset = clubKit(id)?.crestAssetId;
  return asset ? (MEMBER_API ? `${MEMBER_API}/crest/${num(asset)}.png` : '') : badgeUri(id);
}
// Matchday poster (also drawn to a PNG by app.js).
function poster(m, base, { link = true } = {}) {
  const [h, a] = Object.keys(m.clubs).sort((x, y) => (x === homeId ? -1 : y === homeId ? 1 : 0));
  const scorers = (id) => Object.values(m.players?.[id] || {}).filter((p) => num(p.goals) > 0).map((p) => `${p.playername}${num(p.goals) > 1 ? ` ×${p.goals}` : ''}`);
  const all = Object.values(m.players || {}).flatMap((l) => Object.values(l));
  const motm = all.find((p) => p.mom === '1') ?? [...all].sort((x, y) => num(y.rating) - num(x.rating))[0];
  const res = result(m.clubs[h]);
  return `<div class="poster res-${res}" id="poster-${m.matchId}" data-home="${esc(clubName(h))}" data-away="${esc(clubName(a))}" data-score="${esc(m.clubs[h].goals)}-${esc(m.clubs[a].goals)}" data-date="${esc(niceDate(m.timestamp))}" data-scorers="${esc(scorers(h).join(', '))}" data-ascorers="${esc(scorers(a).join(', '))}" data-motm="${esc(motm ? `${motm.playername} (${num(motm.rating).toFixed(1)})` : '')}" data-crest="${esc(posterCrest(h, base))}" data-acrest="${esc(posterCrest(a, base))}" data-res="${res}" data-type="${typeLabel(m)}">
<div class="po-label"><span>${typeLabel(m)} · ${niceDate(m.timestamp)}</span><span class="po-res">${res === 'W' ? 'Victory' : res === 'L' ? 'Defeat' : 'Draw'}</span></div>
<div class="po-main">
<div class="po-team">${crest(h, 110, base, 'po-crest')}<b>${clubLink(h, base)}</b><small>${scorers(h).map((s) => `⚽ ${esc(s)}`).join('<br>')}</small></div>
<div class="po-score">${link ? `<a href="${base}matches/${m.matchId}.html">` : ''}${esc(m.clubs[h].goals)}<i>:</i>${esc(m.clubs[a].goals)}${link ? '</a>' : ''}</div>
<div class="po-team">${crest(a, 110, base, 'po-crest')}<b>${clubLink(a, base)}</b><small>${scorers(a).map((s) => `⚽ ${esc(s)}`).join('<br>')}</small></div>
</div>
${motm ? `<div class="po-motm">⭐ Man of the match <b>${pLinkByName(motm.playername, base)}</b> ${ratingPill(num(motm.rating))}</div>` : ''}
</div>`;
}

// Match reel cover-flow (redesign board 05, part 1). Session chips replace the old separate "Last
// session" + "recent results" pairing: each chip is a match night (from sessionsFor, restricted to nights
// covered by the reel's own matches), tapping one jumps the reel to that night's last match. The flat
// `.card-rail.reel` of real fixture() cards always renders (works with JS off/reduced motion – tapping a
// chip still jumps it via a plain #anchor, no JS needed); app.js's "match reel cover-flow" block upgrades
// it into a draggable 3D coverflow – a translateX+rotateY variant of the squad carousel's ring (board 04
// part 2, same drag/coast/snap mechanics) – and adds the split-flap score reveal + download button to
// whichever card is centred. No "next match" chip: there's no public next-fixture data yet (see BE11).
function matchReel(ms, sessions, id, base) {
  if (!ms.length) return '';
  const recent = ms.slice(0, 10); // newest → oldest
  const cards = [...recent].reverse(); // oldest → newest, left → right (drag forward = newer)
  const recentIds = new Set(recent.map((m) => m.matchId));
  const chips = chunkChips(sessions, cards, recentIds);
  const data = cards.map((m) => {
    const us = num(m.clubs[id].goals), them = num(m.clubs[oppOf(m, id)].goals);
    // Rename the poster's id so it doesn't collide with the "Latest result" card above, which renders
    // the same match's poster() when ms[0] is within the reel's own window, and swap its plain score
    // text for split-flap digits (app.js reveals them, staggered, once this card reaches the middle).
    const html = poster(m, base, { link: false })
      .replace(`id="poster-${m.matchId}"`, `id="rc-poster-${m.matchId}"`)
      .replace(`>${us}<i>:</i>${them}<`, `>${flapDigits(us)}<i>:</i>${flapDigits(them)}<`)
      + `<button class="btn dl-poster reel-dl" type="button" data-for="rc-poster-${m.matchId}">⬇ Download result graphic</button>`;
    return { id: m.matchId, href: `${base}matches/${m.matchId}.html`, html };
  });
  return `${section('Match reel', `
<div class="reel-chips" data-reel-chips>${chips.map((c) => `<a href="#rc-${c.matchId}" class="rchip" data-idx="${c.idx}">${esc(c.day)}${c.rec ? ` · ${esc(c.rec)}` : ''}</a>`).join('')}</div>
<div class="card-rail reel" data-reel-flat>${cards.map((m) => fixture(m, id, base, `rc-${m.matchId}`)).join('')}</div>
<div class="reel-stage" data-reel-stage hidden tabindex="0"></div>
<div class="reel-nav"><button type="button" class="rn-prev" aria-label="Previous match">◀</button><span class="reel-hint muted small">Drag the reel · tap a card for the full match</span><button type="button" class="rn-next" aria-label="Next match">▶</button><a class="btn ghost small" href="${base}matches/index.html">🗓 Calendar</a></div>
<script type="application/json" data-reel-data>${JSON.stringify(data)}</script>
`, { sub: 'tap a chip to jump to a match night' })}${ms.length > 10 ? `<p><a class="btn" href="${base}matches/index.html">All ${ms.length} matches →</a></p>` : ''}`;
}
// Sessions that touch the reel's own matches, each chip pointing at its last match's card index.
function chunkChips(sessions, cards, recentIds) {
  return sessions
    .filter((s) => s.ms.some((m) => recentIds.has(m.matchId)))
    .map((s) => {
      const last = [...s.ms].reverse().find((m) => recentIds.has(m.matchId));
      const idx = cards.findIndex((m) => m.matchId === last.matchId);
      return { idx, matchId: last.matchId, day: chipDate(s.start), rec: s.ms.length > 1 ? `${s.w}W ${s.l}L` : '' };
    })
    .filter((c) => c.idx >= 0)
    .reverse(); // sessionsFor() returns newest-first; flip to match the reel's oldest → newest order
}

// ---------- sessions (play nights) ----------
function sessionsFor(ms, id) {
  const out = [];
  for (const m of [...ms].sort((a, b) => a.timestamp - b.timestamp)) {
    const last = out.at(-1);
    if (last && m.timestamp - last.end <= 3 * 3600) { last.ms.push(m); last.end = m.timestamp; } else out.push({ start: m.timestamp, end: m.timestamp, ms: [m] });
  }
  for (const s of out) {
    const r = s.ms.map((m) => result(m.clubs[id]));
    s.w = r.filter((x) => x === 'W').length; s.d = r.filter((x) => x === 'D').length; s.l = r.filter((x) => x === 'L').length;
    s.gf = sum(s.ms, (m) => num(m.clubs[id].goals)); s.ga = sum(s.ms, (m) => num(m.clubs[oppOf(m, id)].goals));
    const n = s.ms.length, ppg = (3 * s.w + s.d) / n, gd = Math.max(-3, Math.min(3, (s.gf - s.ga) / n));
    const score = (ppg / 3) * 75 + ((gd + 3) / 6) * 25;
    s.grade = score >= 88 ? 'A+' : score >= 78 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F';
    const perf = new Map();
    for (const m of s.ms) for (const [pid, p] of Object.entries(m.players?.[id] || {})) {
      const e = perf.get(pid) ?? { pid, name: p.playername, r: [], g: 0, a: 0 };
      e.r.push(num(p.rating)); e.g += num(p.goals); e.a += num(p.assists); perf.set(pid, e);
    }
    s.players = [...perf.values()].map((e) => ({ ...e, avg: avg(e.r) })).sort((a, b) => b.avg - a.avg);
    s.mvp = s.players[0];
  }
  return out.reverse();
}
function sessionCard(s, base, id) {
  return `<div class="session grade-${s.grade.replace('+', 'p')}">
<div class="se-head"><span class="se-grade">${s.grade}</span><div><b>${niceDate(s.start)}</b><small>${s.ms.length} match${s.ms.length > 1 ? 'es' : ''} · ${s.w}W ${s.d}D ${s.l}L · ${s.gf}–${s.ga}</small></div></div>
<div class="form">${s.ms.map((m) => `<a href="${base}matches/${m.matchId}.html" data-tip="${esc(`${m.clubs[id].goals}–${m.clubs[oppOf(m, id)].goals} vs ${clubName(oppOf(m, id))}`)}">${resPill(result(m.clubs[id]))}</a>`).join('')}</div>
${s.mvp ? `<div class="se-mvp">🏅 Session MVP <b>${pLink(s.mvp.pid, base, s.mvp.name)}</b> ${ratingPill(s.mvp.avg)} <small>${s.mvp.g}G ${s.mvp.a}A</small></div>` : ''}
<ul class="se-players">${s.players.slice(0, 7).map((p) => `<li>${pLink(p.pid, base, p.name)}<span>${p.g ? `${p.g}G ` : ''}${p.a ? `${p.a}A` : ''}</span>${ratingPill(p.avg)}</li>`).join('')}</ul>
</div>`;
}

// ---------- layout ----------
const homeKit = clubs.get(homeId)?.info?.customKit ?? {};
const RED = brand.red ?? hex(homeKit.kitColor2, '#c8352c');
const INK = brand.ink ?? hex(homeKit.kitColor1, '#0b0f16');
// Grouped navigation (redesign board 01): 4 named groups replace the old flat link row, so every page –
// including what used to live only in the footer – is one click away. `id` matches a page()'s `active`.
// `flag` (optional) hides the link until FEATURES unlocks it for the viewer's role, same as the old NAV.
const NAV_GROUPS = [
  { id: 'club', icon: '🛡️', label: 'Club', links: [
    { id: 'home', href: 'index.html', icon: '🏠', label: 'Club home', desc: 'Crest, form, next match' },
    { id: 'squad', href: 'squad.html', icon: '👥', label: 'Squad', desc: 'Every player, cards' },
    { id: 'fame', href: 'halloffame.html', icon: '🏛️', label: 'Hall of Fame', desc: 'Legends and records' },
    ...(MEMBER_API ? [{ id: 'feed', href: 'feed.html', icon: '📰', label: 'Club feed', desc: 'Latest posts', flag: 'feed' }] : []),
    ...(MEMBER_API ? [{ id: 'docs', href: 'docs.html', icon: '📜', label: 'Club docs', desc: 'Rules and announcements', flag: 'docs' }] : []),
    ...(MEMBER_API ? [{ id: 'playstyle', href: 'playstyle.html', icon: '🧭', label: 'Play Style', desc: 'How we play', flag: 'playStyle' }] : []),
    ...(MEMBER_API ? [{ id: 'messages', href: 'messages.html', icon: '💬', label: 'Messages', desc: 'Team chat', flag: 'messages' }] : []),
    { id: 'about', href: 'about.html', icon: 'ℹ️', label: 'About', desc: 'Our story' },
  ] },
  { id: 'matches', icon: '⚽', label: 'Matches', links: [
    { id: 'matches', href: 'matches/index.html', icon: '🏁', label: 'Match nights & results', desc: 'Sessions, every game, League ⇄ Rush' },
    { id: 'clubs', href: 'clubs/index.html', icon: '🏟️', label: 'Opponents', desc: 'Every club we have faced' },
    { id: 'burners', href: 'burners.html', icon: '🔥', label: 'Burner clubs', desc: 'Throwaway clubs we track', flag: 'burners' },
  ] },
  { id: 'stats', icon: '📊', label: 'Stats', links: [
    { id: 'stats', href: 'stats.html', icon: '📈', label: 'Club stats', desc: 'Totals, splits, DNA' },
    { id: 'leaders', href: 'leaders.html', icon: '🥇', label: 'Leaders', desc: 'Top scorers, assists, MOTM, world leaderboard' },
    { id: 'players', href: 'players/index.html', icon: '🧑‍🤝‍🧑', label: 'Players', desc: 'Every profile, searchable' },
    { id: 'compare', href: 'compare.html', icon: '⚖️', label: 'Compare', desc: 'Any two players, radar' },
  ] },
  { id: 'tactics', icon: '🧠', label: 'Tactics', links: [
    { id: 'builder', href: 'builder.html', icon: '🧩', label: 'Builder', desc: 'Plan your pro', flag: 'builder' },
    { id: 'probuilds', href: 'probuilds.html', icon: '⭐', label: 'Pro Builds', desc: 'Squad builds that work', flag: 'proBuilds' },
    ...(MEMBER_API ? [{ id: 'tactics-studio', href: 'tactics.html', icon: '🧠', label: 'Tactics Studio', desc: 'Club playbook and drills', flag: 'tactics' }] : []),
    { id: 'updates', href: 'updates.html', icon: '📰', label: 'Game updates', desc: 'Patch notes, level cap' },
  ] },
];
const NAV_BY_ID = new Map(NAV_GROUPS.flatMap((g) => g.links.map((l) => [l.id, g.id])));

// Mega menu: every group's links render together (mockup board 01) – opening any group button shows the
// same panel, with that group's column highlighted; the page's own group stays marked with `.lk.hov`.
function megaCol(g, base, active) {
  return `<div class="col" data-group="${g.id}"><h4><span>${g.icon}</span>${esc(g.label)}</h4>${g.links.map((l) => `<a class="lk${l.id === active ? ' hov' : ''}" href="${base}${l.href}"${l.id === active ? ' aria-current="page"' : ''}${l.flag ? ` data-flag="${esc(l.flag)}" hidden` : ''}><div class="ic">${l.icon}</div><div><b>${esc(l.label)}</b><small>${esc(l.desc)}</small></div></a>`).join('')}</div>`;
}
function grpNav(base, active, activeGroup) {
  const watch = CHANNELS.length ? `<div class="osw small feat-label">Watch NOREX</div><div class="watch">${CHANNELS.map(([k, label, svg]) => `<a class="${k}" href="${esc(STREAMS[k])}" target="_blank" rel="noopener">${svg} ${label}</a>`).join('')}</div>` : '';
  const feat = `<div class="feat"><div class="osw small feat-label">Right now</div><div class="nm"><div class="t">${RECRUIT.open ? '👑' : '🛡️'}</div><div><b class="osw">${RECRUIT.open ? 'Applications open' : 'Squad set'}</b><small class="muted">${esc(config.siteTitle)}</small></div></div>${watch}${RECRUIT.open ? `<a class="btn small feat-apply" href="${base}apply.html">👑 Apply for a trial</a>` : ''}</div>`;
  return `<nav class="grpnav" aria-label="Main"><div class="grpbtns">${NAV_GROUPS.map((g) => `<button type="button" class="grp${g.id === activeGroup ? ' on' : ''}" data-group="${g.id}" aria-haspopup="true" aria-expanded="false"><span class="e">${g.icon}</span>${esc(g.label)}</button>`).join('')}</div>
<div class="mega" hidden>${NAV_GROUPS.map((g) => megaCol(g, base, active)).join('')}${feat}</div>
<button class="search-btn" type="button" aria-label="Search players and clubs"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="m16 16 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><kbd>/</kbd></button>${RECRUIT.open ? `<a class="discord-btn" href="${base}apply.html">${DISCORD_SVG}<span>Apply</span></a>` : ''}${MEMBER_API ? `<a class="hubw-key" data-flag="hub" hidden href="${base}hub/index.html">🔑<span>Enter the Hub</span></a><span class="auth-slot"></span>` : ''}</nav>`;
}
// Sticky sub-tabs: siblings within the current page's group, one tap away on every page in that section.
function subTabs(base, active, activeGroup) {
  const g = NAV_GROUPS.find((x) => x.id === activeGroup);
  if (!g) return '';
  return `<div class="subtabs"><div class="wrap subtabs-in"><span class="crumb"><span class="e">${g.icon}</span>${esc(g.label)}</span>${g.links.map((l) => `<a href="${base}${l.href}"${l.id === active ? ' aria-current="page"' : ''}${l.flag ? ` data-flag="${esc(l.flag)}" hidden` : ''}>${esc(l.label)}</a>`).join('')}</div></div>`;
}
// Mobile bottom tab bar (thumb reach) + a sheet that lists a group's pages, filled by app.js from #nav-data.
function tabBar(base, activeGroup) {
  return `<nav class="tabbar" aria-label="Sections">${NAV_GROUPS.map((g) => `<a href="${base}${g.links[0].href}" class="tab${g.id === activeGroup ? ' on' : ''}" data-group="${g.id}"><span>${g.icon}</span>${esc(g.label)}</a>`).join('')}<button type="button" class="tab me-tab" data-group="me"><span>👤</span>Me</button></nav>
<div class="sheet" hidden><div class="sheet-grab"></div><div class="sheet-body"></div></div>`;
}
// Gold Hub bar (redesign board 10): replaces the normal club nav on /hub/ pages so members always know
// they've walked into the separate members-only world, not just another tab of the public site.
const hubBar = (base) => `<header class="hubw-bar"><div class="wrap hubw-bar-in">
<a class="hubw-brand" href="index.html"><img src="${base}assets/crest.png" height="38" alt=""><span><b>NOREX HUB</b><small>MEMBERS</small></span></a>
<div class="hubw-right"><span class="hubw-online" data-hubw-online hidden>🟢 <b>0</b> in the clubhouse</span><a class="hubw-back" href="${base}index.html">← Back to the site</a></div>
</div></header>`;

function page({ title, base, active, body, description, image, hub }) {
  const activeGroup = NAV_BY_ID.get(active) ?? '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description ?? `${config.siteTitle} – Pro Clubs stats, results and player cards, updated automatically.`)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description ?? `${config.siteTitle} – Pro Clubs stats, results and player cards.`)}"><meta property="og:site_name" content="${esc(config.siteTitle)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(image ?? `${SITE}assets/crest.png`)}"><meta name="twitter:card" content="summary"><meta name="theme-color" content="${INK}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/style.css"><style>:root{--red:${RED};--ink:${INK};--accent:${RED}}</style>
<link rel="icon" href="${base}assets/favicon.png">
<script>try{if(sessionStorage.getItem('nxnav'))document.documentElement.classList.add('nx-covered')}catch(e){}</script>
</head><body data-base="${base}"${MEMBER_API ? ` data-api="${esc(MEMBER_API)}"` : ''} data-features="${esc(FEATURES)}" data-group="${activeGroup}" data-active="${esc(active ?? '')}"${hub ? ' class="hubw-body"' : ''}>
<div class="bg" aria-hidden="true"></div>
<div class="pxwipe" aria-hidden="true"><span class="pxwipe-ribbon"></span><img class="pxwipe-crest" src="${base}assets/crest.png" alt=""></div>
<script type="application/json" id="nav-data">${JSON.stringify(NAV_GROUPS.map((g) => ({ id: g.id, icon: g.icon, label: g.label, links: g.links.map((l) => ({ id: l.id, href: l.href, icon: l.icon, label: l.label, desc: l.desc, flag: l.flag })) })))}</script>
${hub ? hubBar(base) : `<header class="top"><div class="wrap bar">
<a class="brand" href="${base}index.html"><img src="${base}assets/crest.png" height="44" alt=""><span><b>NOREX</b><small>UNITED</small></span></a>
${grpNav(base, active, activeGroup)}</div></header>
${activeGroup ? subTabs(base, active, activeGroup) : ''}`}
${CHANNELS.length && MEMBER_API && !hub ? '<div class="live-bar" hidden></div>' : ''}<main class="wrap">${body}</main>
<footer class="foot"><div class="wrap foot-in"><img src="${base}assets/crest.png" height="70" alt="">
<div><b>${esc(config.siteTitle)}</b>${brand.founded ? ` · Est. ${esc(brand.founded)}` : ''}${brand.motto ? `<br><i>${esc(brand.motto)}</i>` : ''}<small>Data from EA SPORTS FC Pro Clubs, updated automatically · last update <time class="ago" datetime="${builtAt}">${builtAt.slice(0, 16).replace('T', ' ')} UTC</time> · Not affiliated with EA.</small></div></div></footer>
<div class="palette" hidden><div class="pal-box"><input type="search" placeholder="Search players, clubs, pages…" aria-label="Search"><ul></ul><p class="muted small">↑↓ to move · Enter to open · Esc to close</p></div></div>
<div class="tip" hidden></div>
${hub ? '' : tabBar(base, activeGroup)}
<script src="${base}assets/ui.js" defer></script><script src="${base}assets/app.js" defer></script></body></html>`;
}

// ---------- club page ----------
function clubBody(id, base, isHome) {
  const c = clubs.get(id);
  const o = { ...(c?.overall ?? {}), ...(c?.leaderboard ?? {}) };
  const ms = matches.filter((m) => m.clubs[id]);
  const members = (c?.members ?? []).map((mb) => players.get(nameToKey.get(mb.name.toLowerCase()))).filter((p) => p && !p.hidden);
  const gp = num(o.gamesPlayed);
  const t = state.clubs[id]?.tier;
  const recent = ms.slice(0, 20).reverse();
  const sessions = sessionsFor(ms, id);
  const stats = members.map((p) => p.clubStats[id]).filter(Boolean);

  const teamRatings = recent.map((m) => {
    const r = avg(Object.values(m.players?.[id] || {}).map((p) => num(p.rating)));
    return { value: Math.round(r * 10) / 10, label: `${dateStr(m.timestamp)} vs ${clubName(oppOf(m, id))}` };
  });
  const top = (f, n = 5) => members.filter((p) => p.clubStats[id]).map((pl) => ({ pl, v: f(pl.clubStats[id]) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, n);
  const passAvg = avg(stats.map((s) => num(s.passSuccessRate)).filter(Boolean));
  const reds = sum(stats, (s) => num(s.redCards));
  const dna = [
    ['Attack', Math.min(100, (num(o.goals) / (gp || 1)) * 25), `${(num(o.goals) / (gp || 1)).toFixed(1)} goals per game`],
    ['Defence', Math.max(0, 100 - (num(o.goalsAgainst) / (gp || 1)) * 30), `${(num(o.goalsAgainst) / (gp || 1)).toFixed(1)} conceded per game`],
    ['Passing', passAvg, `${Math.round(passAvg)}% average pass accuracy`],
    ['Winning', pct(num(o.wins), gp), `${pct(num(o.wins), gp)}% win rate`],
    ['Discipline', Math.max(0, 100 - reds * 10), `${reds} red cards`],
  ];
  const mvp = top((s) => (num(s.gamesPlayed) >= 3 ? num(s.ratingAve) : 0), 1)[0];
  const scorer = top((s) => num(s.goals), 1)[0];

  const heroKicker = `<p class="kicker">${isHome ? `${brand.founded ? `Est. ${esc(brand.founded)} · ` : ''}Official club hub` : esc(t ?? 'Club')}${state.clubs[id]?.linkedPlayers ? ` · shares ${state.clubs[id].linkedPlayers.map((n) => pLinkByName(n, base)).join(', ')}` : ''}</p>`;
  const heroChips = `<div class="chips">${o.currentDivision ? `<span class="chip strong">Division ${esc(o.currentDivision)}</span>` : ''}${o.skillRating ? `<span class="chip">Skill rating ${esc(o.skillRating)}</span>` : ''}${num(o.promotions) ? `<span class="chip">⬆ ${esc(o.promotions)} promotions</span>` : ''}${c?.info?.customKit?.stadName ? `<span class="chip">🏟 ${esc(c.info.customKit.stadName)}</span>` : ''}${num(o.wstreak) > 1 ? `<span class="chip hot">🔥 ${esc(o.wstreak)} win streak</span>` : ''}</div>`;
  const heroForm = ms.length ? `<div class="form big"><span class="form-label">Form</span>${formStrip(ms, id, base)}</div>` : '';
  const heroSpots = isHome && (mvp || scorer) ? `<div class="hero-spot">${mvp ? `<a class="spot" href="${pUrl(mvp.pl, base)}"><small>Top rated</small><b>${esc(mvp.pl.name)}</b>${ratingPill(mvp.v)}</a>` : ''}${scorer ? `<a class="spot" href="${pUrl(scorer.pl, base)}"><small>Top scorer</small><b>${esc(scorer.pl.name)}</b><span class="rp r-great">${scorer.v} ⚽</span></a>` : ''}</div>` : '';
  // Ending section (redesign board 04, part 1): the trial/Discord/stream links that used to live in the
  // nav's "feat" panel and the Watch section, gathered into one closing invitation at the foot of the home page.
  const endingLinks = [
    RECRUIT.open ? `<a class="btn big" href="${base}apply.html">👑 Apply for a trial</a>` : '',
    DISCORD ? `<a class="btn discord big" href="${esc(DISCORD)}" target="_blank" rel="noopener">${DISCORD_SVG}<span>Join our Discord</span></a>` : '',
    ...CHANNELS.map(([k, label, svg]) => `<a class="btn ghost big" href="${esc(STREAMS[k])}" target="_blank" rel="noopener">${svg}<span>${label}</span></a>`),
  ].filter(Boolean).join('');

  return `
${isHome ? `
<section class="hero club-hero stadium-hero reveal" data-hero>
<div class="sh-sky" style="--depth:2"></div>
<div class="sh-pitch" style="--depth:5"></div>
<div class="sh-plane sh-text" style="--depth:0">
${heroKicker}
<h1>${esc(clubName(id))}</h1>
${STARS}
${heroChips}
${heroForm}
${RECRUIT.open ? `<p><a class="btn" href="${base}apply.html">👑 Apply for a trial</a></p>` : ''}
</div>
<div class="sh-plane sh-coin-wrap" style="--depth:10">
<div class="sh-coin" tabindex="0" role="button" data-coin aria-label="Drag to spin the club crest, or press Enter to flip it and see trial info">
<div class="sh-face sh-front">${crest(id, 260, base, 'big-crest')}</div>
<div class="sh-face sh-back"><b>${RECRUIT.open ? '✅ Applications open' : 'Applications closed'}</b><span>Division ${esc(o.currentDivision ?? '–')} · ${members.length} in the squad</span>${RECRUIT.open ? `<a class="btn small" href="${base}apply.html">Apply for a trial</a>` : ''}</div>
</div>
</div>
${heroSpots ? `<div class="sh-plane sh-spots" style="--depth:16">${heroSpots}</div>` : ''}
${brand.motto ? `<div class="sh-plane sh-fg" style="--depth:28"><p class="ribbon-banner"><span>${esc(brand.motto)}</span></p></div>` : ''}
<button class="sh-motion" type="button" data-motion-toggle aria-pressed="true"><span data-motion-label>Motion: on</span></button>
</section>
${MEMBER_API ? '<div data-hotw hidden></div><div data-feed-public hidden></div><div data-news data-flag="docs" hidden></div>' : ''}
${section('This week', `<div class="grid3">
${MEMBER_API ? '<div data-next-event hidden></div>' : ''}
${card('Latest result', ms.length ? poster(ms[0], base) + `<button class="btn dl-poster" type="button" data-for="poster-${ms[0].matchId}">⬇ Download result graphic</button>` : emptyState('🗂️', 'No matches yet', 'Results land here once the first match is archived.'), 'flush')}
${CHANNELS.length ? `<div id="watch">${card('📺 Watch NOREX', `<div class="live-embed" hidden></div><div class="watch-grid">${CHANNELS.map(([k, label, svg, sub]) => `<a class="watch-card ${k}" href="${esc(STREAMS[k])}" target="_blank" rel="noopener"><span class="wc-ic">${svg}</span><span><b>${label}</b><small>${sub}</small></span><span class="wc-go">Follow →</span></a>`).join('')}</div>`)}</div>` : ''}
</div>`, { sub: 'next up, last time out, and where to watch' })}
${section('Season at a glance', `<div class="stats stats-8">${[['Played', gp, 'played'], ['Won', o.wins, 'won'], ['Drawn', o.ties, 'drawn'], ['Lost', o.losses, 'lost'], ['Win rate', pct(num(o.wins), gp), 'winrate', '%'], ['Goals', o.goals, 'goals'], ['Conceded', o.goalsAgainst, 'conceded'], ['Goal diff', num(o.goals) - num(o.goalsAgainst), 'played']]
    .map(([label, v, f, suffix = '']) => counter(label, v, { suffix, href: ms.length ? drillHref(id, base, f) : undefined })).join('')}</div>${ms.length ? `<p class="small muted drill-hint">👆 Tap a number to see the matches behind it.</p>` : ''}`)}
${ms.length ? '<div data-nx-insight="club" hidden></div><div data-nx-insight="match.latest" hidden></div><div data-nx-insight="matches.last5" hidden></div>' : '<div data-nx-insight="club" hidden></div>'}
${tacticsTeaser(members, base)}
${squadCarousel(members, base)}
${matchReel(ms, sessions, id, base)}
${leadersPodium(members, id, base)}
${section('How we play', `<div class="grid2">${card('Team DNA', `<ul class="dna">${dna.map(([k, v, tip]) => `<li data-tip="${esc(tip)}"><span>${k}</span><div class="meter"><i style="--w:${Math.round(v)}%"></i></div><b>${Math.round(v)}</b></li>`).join('')}</ul>`)}${card('Goals per match', !recent.length ? emptyState('⚽', 'No goals to chart yet', 'Fills in after the first archived match.') : goalBars(recent.map((m) => ({ for: num(m.clubs[id].goals), against: num(m.clubs[oppOf(m, id)].goals), res: result(m.clubs[id]), tip: `${dateStr(m.timestamp)} · ${m.clubs[id].goals}–${m.clubs[oppOf(m, id)].goals} vs ${clubName(oppOf(m, id))}` }))))}</div>${MEMBER_API ? `<p><a class="btn ghost" href="${base}playstyle.html">🧭 Full Play Style →</a></p>` : ''}`, { sub: 'how NOREX plays, in the numbers' })}
${MEMBER_API ? '<div data-flag="hallOfFame" hidden><div class="block" data-hof-teaser hidden></div></div>' : ''}
<section class="block reveal ending-cta" id="join"><img class="ending-crest" src="${base}assets/crest.png" height="120" alt="">
<h2 class="banner-h ending-h">${esc(brand.motto || 'One club. One crown.')}</h2>
<p class="muted ending-sub">${esc(config.siteTitle)} is always looking for committed players who want to compete. Come find out what we're about.</p>
<div class="ending-links">${endingLinks}</div></section>
${MEMBER_API ? `<link rel="stylesheet" href="${base}assets/honours.css"><script src="${base}assets/honours.js" defer></script>` : ''}` : `
<section class="hero club-hero reveal">
<div class="hero-crest">${crest(id, 180, base, 'big-crest')}</div>
<div class="hero-text">
${heroKicker}
<h1>${esc(clubName(id))}</h1>
${heroChips}
${heroForm}
</div>
</section>
<section class="stats reveal">
${[['Played', gp, 'played'], ['Won', o.wins, 'won'], ['Drawn', o.ties, 'drawn'], ['Lost', o.losses, 'lost'], ['Win rate', pct(num(o.wins), gp), 'winrate', '%'], ['Goals', o.goals, 'goals'], ['Conceded', o.goalsAgainst, 'conceded'], ['Goal diff', num(o.goals) - num(o.goalsAgainst), 'played']]
    .map(([label, v, f, suffix = '']) => counter(label, v, { suffix, href: ms.length ? drillHref(id, base, f) : undefined })).join('')}
${ms.length ? counter('Clean sheets', ms.filter((m) => !num(m.clubs[oppOf(m, id)].goals)).length, { href: drillHref(id, base, 'cleansheets') }) : ''}
</section>
${homeMatches.some((m) => oppOf(m, homeId) === String(id)) ? `<div data-nx-insight="h2h.${esc(id)}" hidden></div>` : ''}
${ms.length ? `<p class="small muted drill-hint">👆 Tap a number to see the matches behind it.</p>` : ''}
${ms.length ? `<div class="grid2 reveal">${card('Latest result', poster(ms[0], base) + `<button class="btn dl-poster" type="button" data-for="poster-${ms[0].matchId}">⬇ Download result graphic</button>`, 'flush')}${sessions[0] ? card('Last session', sessionCard(sessions[0], base, id)) : ''}</div>` : ''}
${section('Performance', `<div class="grid-charts">
${card('Goals per match', !recent.length ? emptyState('⚽', 'No goals to chart yet', 'Fills in after the first archived match.') : goalBars(recent.map((m) => ({ for: num(m.clubs[id].goals), against: num(m.clubs[oppOf(m, id)].goals), res: result(m.clubs[id]), tip: `${dateStr(m.timestamp)} · ${m.clubs[id].goals}–${m.clubs[oppOf(m, id)].goals} vs ${clubName(oppOf(m, id))}` }))))}
${card('Season split', `<div class="donut-wrap">${donut([{ label: 'Won', value: num(o.wins), color: 'var(--win)' }, { label: 'Drawn', value: num(o.ties), color: 'var(--draw)' }, { label: 'Lost', value: num(o.losses), color: 'var(--loss)' }], { center: `${pct(num(o.wins), gp)}%`, sub: 'win rate' })}
<ul class="legend"><li><i style="background:var(--win)"></i>Won <b>${esc(o.wins ?? 0)}</b></li><li><i style="background:var(--draw)"></i>Drawn <b>${esc(o.ties ?? 0)}</b></li><li><i style="background:var(--loss)"></i>Lost <b>${esc(o.losses ?? 0)}</b></li></ul></div>`)}
${card('Team DNA', `<ul class="dna">${dna.map(([k, v, tip]) => `<li data-tip="${esc(tip)}"><span>${k}</span><div class="meter"><i style="--w:${Math.round(v)}%"></i></div><b>${Math.round(v)}</b></li>`).join('')}</ul>`)}
${card('Average team rating', teamRatings.length > 1 ? lineChart(teamRatings, { min: 5, max: 10, ref: 7, id: `tr${id}` }) : emptyState('📈', 'Trend needs two matches', 'The rating line appears once two matches are archived.'))}
</div>`)}
${members.length ? section('The squad', `<div class="card-rail">${[...members].sort((a, b) => num(b.clubStats[id]?.gamesPlayed) - num(a.clubStats[id]?.gamesPlayed)).slice(0, 14).map((p) => futCard(p, base)).join('')}</div>`, { sub: `${members.length} players` }) : ''}
${members.length ? section('Club leaders', `<div class="grid4">
${card('Top scorers', barList(top((s) => num(s.goals)), { base }))}${card('Assists', barList(top((s) => num(s.assists)), { base }))}
${card('Avg rating', barList(top((s) => (num(s.gamesPlayed) >= 2 ? num(s.ratingAve) : 0)), { base, fmt: (v) => v.toFixed(1) }))}${card('Man of the match', barList(top((s) => num(s.manOfTheMatch)), { base }))}
</div>`) : ''}
${section('Recent results', `<div class="fixtures">${ms.slice(0, 10).map((m) => fixture(m, id, base)).join('') || emptyState('🗂️', 'No matches archived yet', 'EA only shares the last five games, so the archive starts on the first update after a club is tracked. Results land here automatically.')}</div>`)}
${members.length ? section('Squad table', squadTable(members, id, base, `squad-${id}`)) : ''}`}`;
}

function squadTable(members, id, base, tid) {
  return table(tid, ['Player', 'Pos', '#OVR', '#GP', '#Goals', '#Assists', '#Rating', '#MOTM', '#Win %', '#Pass %', '#Tackle %', '#Clean sh.', '#Red'],
    members.filter((p) => p.clubStats[id]).sort((a, b) => num(b.clubStats[id].gamesPlayed) - num(a.clubStats[id].gamesPlayed)).map((p) => {
      const mb = p.clubStats[id];
      return `<tr data-pos="${groupOf(posOf(mb))}">${td(pLink(p.key, base))}${td(posOf(mb) || '—')}${td(esc(mb.proOverall ?? '–'), true)}${td(mb.gamesPlayed, true)}${td(mb.goals, true)}${td(mb.assists, true)}${td(ratingPill(num(mb.ratingAve)), true, mb.ratingAve)}${td(mb.manOfTheMatch, true)}${td(mb.winRate + '%', true, mb.winRate)}${td(mb.passSuccessRate + '%', true, mb.passSuccessRate)}${td(mb.tackleSuccessRate + '%', true, mb.tackleSuccessRate)}${td(num(mb.cleanSheetsDef) + num(mb.cleanSheetsGK), true)}${td(mb.redCards, true)}</tr>`;
    }), { filter: 'Filter players…' });
}

// ---------- stat drill-downs (P1.1) ----------
// Every stat card on a club page links to <club>-results?f=<filter>; one static page per club holds every
// filter as a tab panel (app.js opens the one named in ?f= and keeps the URL in sync).
const DRILL = [
  ['played', '📋 Played'], ['won', '✅ Won'], ['drawn', '🤝 Drawn'], ['lost', '❌ Lost'],
  ['goals', '⚽ Goals'], ['conceded', '🥅 Conceded'], ['cleansheets', '🧤 Clean sheets'], ['winrate', '📈 Win rate'],
];
const drillPath = (id) => (id === homeId ? 'results.html' : `clubs/${id}-results.html`);
const drillHref = (id, base, f) => `${base}${drillPath(id)}?f=${f}`;

function drillBody(id, base) {
  const ms = matches.filter((m) => m.clubs[id]);
  const M = ms.map((m) => {
    const o = oppOf(m, id), us = Object.values(m.players?.[id] || {}), them = Object.values(m.players?.[o] || {});
    const gf = num(m.clubs[id].goals), ga = num(m.clubs[o].goals);
    const motm = us.find((p) => p.mom === '1') ?? them.find((p) => p.mom === '1');
    return {
      m, o, gf, ga, res: result(m.clubs[id]), margin: gf - ga, us, them,
      scorers: us.filter((p) => num(p.goals) > 0), motm, motmOurs: !!motm && us.includes(motm),
      rating: avg(us.map((p) => num(p.rating))), shots: sum(us, (p) => num(p.shots)), oShots: sum(them, (p) => num(p.shots)),
      pass: pct(sum(us, (p) => num(p.passesmade)), sum(us, (p) => num(p.passattempts))),
      tackle: pct(sum(us, (p) => num(p.tacklesmade)), sum(us, (p) => num(p.tackleattempts))),
    };
  });
  const by = (r) => M.filter((x) => x.res === r);
  const scoreLink = (x) => `<a href="${base}matches/${x.m.matchId}.html">${x.gf}–${x.ga}</a>`;
  const scorerTxt = (x) => x.scorers.map((p) => `${pLinkByName(p.playername, base)}${num(p.goals) > 1 ? ` ×${num(p.goals)}` : ''}`).join(', ') || '<span class="muted">–</span>';
  const matchTable = (tid, rows, empty) => rows.length
    ? table(tid, ['Date', 'Res', 'Opponent', 'Score', '#Margin', 'Scorers', 'MOTM', '#Team rating'], rows.map((x) =>
      `<tr data-day="${dateStr(x.m.timestamp)}" data-id="${x.m.matchId}">${dateCell(x.m.timestamp)}${td(resPill(x.res))}${td(`${crest(x.o, 22, base)} ${clubLink(x.o, base)}`, false, clubName(x.o).toLowerCase())}${td(scoreLink(x), false, x.gf * 100 - x.ga)}${td((x.margin > 0 ? '+' : '') + x.margin, true, x.margin)}${td(scorerTxt(x))}${td(x.motm ? `${pLinkByName(x.motm.playername, base)}${x.motmOurs ? '' : ' <small class="muted">opp</small>'}` : '–')}${td(ratingPill(x.rating), true, x.rating.toFixed(2))}</tr>`), { filter: 'Search opponents or scorers…' })
    : emptyState(...empty);
  const strip = (title, rows) => rows.length ? `<h3 class="drill-sub">${title}</h3><div class="fixtures drill-strip">${rows.map((x) => fixture(x.m, id, base)).join('')}</div>` : '';
  const leaders = (f, n = 10) => {
    const T = new Map();
    for (const x of M) for (const p of x.us) {
      const k = nameToKey.get(p.playername.toLowerCase());
      const e = T.get(k ?? p.playername) ?? { pl: k ? players.get(k) : null, name: p.playername, v: 0 };
      e.v += f(p, x); T.set(k ?? p.playername, e);
    }
    return [...T.values()].filter((e) => e.v > 0 && !e.pl?.hidden).sort((a, b) => b.v - a.v).slice(0, n);
  };
  const bars = (rows) => goalBars(rows.slice(0, 20).reverse().map((x) => ({ for: x.gf, against: x.ga, res: x.res, tip: `${dateStr(x.m.timestamp)} · ${x.gf}–${x.ga} vs ${clubName(x.o)}` })));
  const W = by('W'), D = by('D'), L = by('L'), CS = M.filter((x) => x.ga === 0);
  const tot = (rows, f) => sum(rows, f);
  const perGame = (rows, f) => (rows.length ? tot(rows, f) / rows.length : 0);

  // "What went wrong": our numbers in defeats against our overall average.
  const wrong = [
    ['Goals scored', (x) => x.gf, 1, true], ['Goals conceded', (x) => x.ga, 1, false], ['Shots', (x) => x.shots, 1, true],
    ['Opponent shots', (x) => x.oShots, 1, false], ['Pass accuracy', (x) => x.pass, 0, true, '%'], ['Tackle success', (x) => x.tackle, 0, true, '%'], ['Team rating', (x) => x.rating, 1, true],
  ].map(([label, f, dec, upGood, suf = '']) => {
    const inL = perGame(L, f), all = perGame(M, f), diff = inL - all, bad = upGood ? diff < 0 : diff > 0;
    return `<li><span>${label}</span><b>${inL.toFixed(dec)}${suf}</b><small class="muted">avg ${all.toFixed(dec)}${suf}</small><em class="${Math.abs(diff) < (dec ? 0.05 : 0.5) ? '' : bad ? 'worse' : 'better'}">${diff > 0 ? '▲' : diff < 0 ? '▼' : '•'} ${Math.abs(diff).toFixed(dec)}${suf}</em></li>`;
  }).join('');

  let run = 0;
  const cumulative = [...M].reverse().map((x, i, arr) => { run += x.res === 'W' ? 1 : 0; return { value: Math.round((run / (i + 1)) * 100), label: '', tip: `${dateStr(x.m.timestamp)} · ${x.res} ${x.gf}–${x.ga} vs ${clubName(x.o)} · ${Math.round((run / (i + 1)) * 100)}% after ${i + 1}` }; });
  const oppScorers = new Map();
  for (const x of M) for (const p of x.them) if (num(p.goals)) {
    const e = oppScorers.get(p.playername) ?? { name: p.playername, club: x.o, v: 0 };
    e.v += num(p.goals); oppScorers.set(p.playername, e);
  }
  const defLeaders = leaders((p, x) => (x.ga === 0 && ['goalkeeper', 'defender'].includes(String(p.pos).toLowerCase()) ? 1 : 0));
  const keeperSaves = leaders((p) => (String(p.pos).toLowerCase() === 'goalkeeper' ? num(p.saves) : 0));

  const P = {
    played: `<section class="stats">${counter('Archived', M.length)}${counter('Record', 0, { text: `${W.length}-${D.length}-${L.length}` })}${counter('Goals per game', perGame(M, (x) => x.gf), { dec: 2 })}${counter('Conceded per game', perGame(M, (x) => x.ga), { dec: 2 })}</section>
${card('Last 20 matches', bars(M))}${matchTable('dr-played', M, ['📭', 'No matches yet', 'Matches show up here after the next update.'])}`,
    won: `${strip('💥 Biggest wins', [...W].sort((a, b) => b.margin - a.margin || b.gf - a.gf).slice(0, 3))}
${matchTable('dr-won', W, ['🏆', 'No wins archived yet', 'The first win lands here automatically.'])}`,
    drawn: matchTable('dr-drawn', D, ['🤝', 'No draws archived', 'Every game so far had a winner.']),
    lost: L.length ? `${strip('🧊 Heaviest defeats', [...L].sort((a, b) => a.margin - b.margin).slice(0, 3))}
<div class="grid2">${card('🔍 What went wrong', `<ul class="wrong">${wrong}</ul><p class="muted small">Per game in ${L.length} defeat${L.length > 1 ? 's' : ''} vs the average over all ${M.length} archived matches. ▲▼ in red = worse than usual.</p>`)}
${card('Who beat us most', barList(Object.values(Object.fromEntries(L.map((x) => [x.o, { name: clubName(x.o), v: L.filter((y) => y.o === x.o).length }]))).sort((a, b) => b.v - a.v).slice(0, 5), { base }))}</div>
${matchTable('dr-lost', L)}` : emptyState('😎', 'No defeats archived', 'Unbeaten in every archived match – long may it last.'),
    goals: `<section class="stats">${counter('Goals', tot(M, (x) => x.gf))}${counter('Per game', perGame(M, (x) => x.gf), { dec: 2 })}${counter('Scored in', pct(M.filter((x) => x.gf).length, M.length), { suffix: '%' })}${counter('Hat-tricks', sum(M, (x) => x.us.filter((p) => num(p.goals) >= 3).length))}</section>
<div class="grid2">${card('⚽ Scorers', barList(leaders((p) => num(p.goals)), { base }))}${card('🎯 Assists', barList(leaders((p) => num(p.assists)), { base }))}</div>
${card('Goals per match', bars(M))}
${matchTable('dr-goals', [...M].filter((x) => x.gf).sort((a, b) => b.gf - a.gf || b.m.timestamp - a.m.timestamp), ['⚽', 'No goals yet', 'Goals show up here once they are archived.'])}`,
    conceded: `<section class="stats">${counter('Conceded', tot(M, (x) => x.ga))}${counter('Per game', perGame(M, (x) => x.ga), { dec: 2 })}${counter('Clean sheets', CS.length)}${counter('Opp. shots/game', perGame(M, (x) => x.oShots), { dec: 1 })}</section>
<div class="grid2">${card('Opponents who scored most', barList([...oppScorers.values()].sort((a, b) => b.v - a.v).slice(0, 8).map((e) => ({ ...e, name: `${e.name} (${clubName(e.club)})` })), { base }))}${card('Goals per match', bars(M))}</div>
${matchTable('dr-conceded', [...M].filter((x) => x.ga).sort((a, b) => b.ga - a.ga || b.m.timestamp - a.m.timestamp), ['🧱', 'Nothing conceded', 'Not a single goal against in the archive.'])}`,
    cleansheets: `<div class="grid2">${card('🧤 Keepers & defenders', barList(defLeaders, { base }) + '<p class="muted small">Clean sheets played at GK or in defence.</p>')}${card('🧤 Keeper saves', barList(keeperSaves, { base }))}</div>
${matchTable('dr-cs', CS, ['🧤', 'No clean sheets yet', 'Keep one and it shows up here.'])}`,
    winrate: `<div class="grid2">${card('Season split', `<div class="donut-wrap">${donut([{ label: 'Won', value: W.length, color: 'var(--win)' }, { label: 'Drawn', value: D.length, color: 'var(--draw)' }, { label: 'Lost', value: L.length, color: 'var(--loss)' }], { center: `${pct(W.length, M.length)}%`, sub: 'win rate' })}
<ul class="legend"><li><i style="background:var(--win)"></i>Won <b>${W.length}</b></li><li><i style="background:var(--draw)"></i>Drawn <b>${D.length}</b></li><li><i style="background:var(--loss)"></i>Lost <b>${L.length}</b></li></ul></div>`)}
${card('Win rate over time', cumulative.length > 1 ? lineChart(cumulative, { min: 0, max: 100, ref: 50, id: `wr${id}` }) : emptyState('📈', 'Needs a few more matches'))}</div>
${card('Win rate by opponent', barList([...new Set(M.map((x) => x.o))].map((o) => { const r = M.filter((x) => x.o === o); return { name: `${clubName(o)} (${r.length})`, v: pct(r.filter((x) => x.res === 'W').length, r.length) }; }).filter((e) => e.v > 0).sort((a, b) => b.v - a.v).slice(0, 10), { base, fmt: (v) => v + '%' }))}`,
  };
  const counts = { played: M.length, won: W.length, drawn: D.length, lost: L.length, goals: tot(M, (x) => x.gf), conceded: tot(M, (x) => x.ga), cleansheets: CS.length, winrate: `${pct(W.length, M.length)}%` };
  const league = `${id === homeId ? calendar(`cal-${id}`, ms) : ''}<div id="cal-${id}"><div class="tabs chipset drill-tabs" data-tabs data-drill>${DRILL.map(([k, l], i) => `<button class="chip${i ? '' : ' on'}" type="button" data-tab="f-${k}">${l} <small>${counts[k]}</small></button>`).join('')}</div>
${DRILL.map(([k], i) => `<div class="tab-panel drill-panel" id="f-${k}"${i ? ' hidden' : ''}>${P[k]}</div>`).join('')}</div>`;
  const eaGp = num(clubs.get(id)?.overall?.gamesPlayed);
  return `<section class="page-head reveal drill-head">${crest(id, 84, base)}<div><p class="kicker"><a href="${clubHref(id, base) ?? '#'}">← ${esc(clubName(id))}</a></p><h1>Match drill-down</h1>
<p class="muted">Every stat card, match by match. Built from ${M.length} archived match${M.length === 1 ? '' : 'es'}${eaGp > M.length ? ` (EA's club totals count ${eaGp} – EA only shares the last few, so older ones aren't here)` : ''}.</p></div></section>
<div class="reveal">${id === homeId ? modes(league, 'results', 'League & playoffs from EA · Rush logged by members · friendlies apart', friendlyBody(base)) : league}</div>`;
}

// P1.8: the Friendly tab of the results + matches pages – record, scorers and every friendly (with the calendar).
function friendlyBody(base) {
  if (!friendlies.length) return emptyState('🤝', 'No friendlies yet', 'Club friendlies are saved here from now on – they never count towards League stats, leaderboards or awards.');
  const R = friendlies.map((m) => result(m.clubs[homeId]));
  const gf = sum(friendlies, (m) => num(m.clubs[homeId].goals)), ga = sum(friendlies, (m) => num(m.clubs[oppOf(m, homeId)].goals));
  const T = new Map();
  for (const m of friendlies) for (const [pid, p] of Object.entries(m.players?.[homeId] || {})) {
    const k = players.has(pid) ? pid : nameToKey.get(String(p.playername).toLowerCase());
    if (k && players.get(k)?.hidden) continue;
    const e = T.get(k ?? p.playername) ?? { pl: k ? players.get(k) : null, name: p.playername, g: 0, a: 0 };
    e.g += num(p.goals); e.a += num(p.assists); T.set(k ?? p.playername, e);
  }
  const top = (f) => [...T.values()].map((e) => ({ ...e, v: f(e) })).filter((e) => e.v > 0).sort((a, b) => b.v - a.v).slice(0, 8);
  return `<section class="stats">${counter('Friendlies', friendlies.length)}${counter('Record', 0, { text: `${R.filter((r) => r === 'W').length}-${R.filter((r) => r === 'D').length}-${R.filter((r) => r === 'L').length}` })}${counter('Goals', gf)}${counter('Conceded', ga)}</section>
<div class="grid2">${card('⚽ Scorers', barList(top((e) => e.g), { base }))}${card('🎯 Assists', barList(top((e) => e.a), { base }))}</div>
${calendar('cal-fr', friendlies)}<div class="fixtures" id="cal-fr">${friendlies.map((m) => fixture(m, homeId, base)).join('')}</div>
<p class="muted small">🤝 Club friendlies from EA – kept apart from League & playoff numbers.</p>`;
}

// ---------- player page ----------
function playerBody(pl, base) {
  const a = pl.apps;
  const tot = (f) => sum(a, (x) => x[f]);
  const w = a.filter((x) => x.res === 'W').length, d = a.filter((x) => x.res === 'D').length, l = a.filter((x) => x.res === 'L').length;
  const car = pl.career;
  const trend = [...a].reverse().map((x) => ({ value: x.rating, label: '', tip: `${dateStr(x.ts)} · ${x.res} ${x.gf}–${x.ga} vs ${clubName(x.oppId)} · ${x.rating.toFixed(1)}${x.goals ? ` · ${x.goals}G` : ''}${x.assists ? ` ${x.assists}A` : ''}` }));
  const best = [...a].sort((x, y) => y.rating - x.rating)[0];
  const otherNames = [...pl.names].filter((n) => n !== pl.name);
  const s = pl.main ?? {};
  return `
<section class="hero player-hero reveal">
<div class="hero-card">${futCard(pl, base, { big: true })}</div>
<div class="hero-text">
<p class="kicker">${pl.isHome ? `${esc(config.siteTitle)} player` : 'Player profile'}</p>
<h1>${esc(pl.name)}</h1>
<div class="member-badge" data-player="${esc(pl.key)}"></div>
${pl.isHome ? `<div data-nx-insight="player.${esc(pl.key)}" hidden></div><div data-nx-insight="note.${esc(pl.key)}" hidden></div>` : ''}
<div class="chips"><span class="chip strong">${esc(pl.pos || '—')}</span>${pl.tag ? `<span class="chip">${esc(pl.tag)}</span>` : ''}${pl.ovr ? `<span class="chip">OVR ${pl.ovr}</span>` : ''}${s.proHeight ? `<span class="chip">${esc(s.proHeight)} cm</span>` : ''}${otherNames.length ? `<span class="chip">aka ${otherNames.map(esc).join(', ')}</span>` : ''}</div>
<div class="club-chips">${pl.clubIds.map((c) => `<a class="club-chip" href="${clubHref(c, base) ?? '#'}">${crest(c, 22, base)}${esc(clubName(c))}</a>`).join('')}</div>
${a.length ? `<div class="form big"><span class="form-label">Form</span>${a.slice(0, 10).reverse().map((x) => `<a href="${base}matches/${x.matchId}.html" data-tip="${esc(`${x.gf}–${x.ga} vs ${clubName(x.oppId)} · ${x.rating.toFixed(1)}`)}">${resPill(x.res)}</a>`).join('')}</div>` : ''}
<p><a class="btn" href="${base}compare.html?a=${encodeURIComponent(pl.key)}">⚖ Compare with…</a></p>
</div></section>
${(pl.isHome || pl.playedForHome) ? modes(league(), `player:${pl.key}`, '', pl.fapps.length ? friendly() : null) : league()}`;
  function friendly() {
    const f = pl.fapps, ft = (k) => sum(f, (x) => x[k]);
    return section('Friendlies', `<section class="stats">${counter('Apps', f.length)}${counter('Record', 0, { text: `${f.filter((x) => x.res === 'W').length}-${f.filter((x) => x.res === 'D').length}-${f.filter((x) => x.res === 'L').length}` })}${counter('Goals', ft('goals'))}${counter('Assists', ft('assists'))}${counter('Avg rating', avg(f.map((x) => x.rating)), { dec: 1 })}${counter('MOTM', ft('mom'))}</section>
${logTable('flog', f, base)}<p class="muted small">🤝 Club friendlies – never counted in League stats.</p>`, { sub: `${f.length} archived` });
  }
  function league() {
    return `${car ? section('Career', `<section class="stats">${counter('Games', car.gamesPlayed)}${counter('Goals', car.goals)}${counter('Assists', car.assists)}${counter('Avg rating', car.ratingAve, { dec: 1 })}${counter('MOTM', car.manOfTheMatch)}${counter('G+A per game', num(car.gamesPlayed) ? (num(car.goals) + num(car.assists)) / num(car.gamesPlayed) : 0, { dec: 2 })}</section>`, { sub: 'every club, from EA' }) : ''}
<div class="grid2 reveal">
${pl.radar ? card('Player profile', `${radar(RADAR.map((ax, i) => ({ label: ax.label, raw: [pl.radarRaw[i]] })), [{ values: pl.radar, color: 'var(--red)', name: pl.name }])}<p class="muted small">Percentile vs ${pool.length} tracked players with 3+ games${pl.isHome ? ' (NOREX stats)' : ''}. Hover a point for the real number.</p>`) : ''}
${card('Match ratings', trend.length ? lineChart(trend, { min: 4, max: 10, ref: 7, id: 'pt' }) + (best ? `<p class="small">Best: ${ratingPill(best.rating)} vs ${esc(clubName(best.oppId))} (${dateStr(best.ts)})</p>` : '') : emptyState('📈', 'No match ratings yet', 'Ratings appear here once this player features in an archived match.'))}
${a.length ? card('Position map', `${pitchMap(pitchGroups(a))}<p class="muted small">🗺️ Estimated – EA's match data has no pitch coordinates. Bubble size = share of games in that role, shade = involvement while playing it.</p>`) : ''}
</div>
${Object.keys(pl.clubStats).length ? section('By club', table('byclub', ['Club', 'Pos', '#OVR', '#GP', '#Goals', '#Assists', '#Rating', '#MOTM', '#Win %', '#Pass %', '#Tackle %'], Object.entries(pl.clubStats).map(([cid, cs]) =>
    `<tr>${td(`${crest(cid, 22, base)} ${clubLink(cid, base)}`)}${td(posOf(cs) || '—')}${td(esc(cs.proOverall ?? '–'), true)}${td(cs.gamesPlayed, true)}${td(cs.goals, true)}${td(cs.assists, true)}${td(ratingPill(num(cs.ratingAve)), true, cs.ratingAve)}${td(cs.manOfTheMatch, true)}${td(cs.winRate + '%', true, cs.winRate)}${td(cs.passSuccessRate + '%', true, cs.passSuccessRate)}${td(cs.tackleSuccessRate + '%', true, cs.tackleSuccessRate)}</tr>`))) : ''}
${a.length ? section('Match log', `<section class="stats">${counter('Apps', a.length)}${counter('Record', 0, { text: `${w}-${d}-${l}` })}${counter('Goals', tot('goals'))}${counter('Assists', tot('assists'))}${counter('Avg rating', avg(a.map((x) => x.rating)), { dec: 1 })}${counter('MOTM', tot('mom'))}${counter('Pass %', pct(tot('passes'), tot('passAtt')), { suffix: '%' })}${counter('Tackle %', pct(tot('tackles'), tot('tackleAtt')), { suffix: '%' })}${evStats(a)}</section>
${logTable('log', a, base)}${evNote(a)}`, { sub: `${a.length} archived` }) : ''}`;
  }
}
// P1.8: dribbles + second assists – totals and per 90 over the apps that have them, with a "since" note.
function evStats(a) {
  const e = a.filter((x) => x.dribbles != null);
  if (!e.length) return '';
  const drb = sum(e, (x) => x.dribbles);
  return `${counter('Dribbles', drb)}${counter('Dribbles/game', drb / e.length, { dec: 1 })}${counter('2nd assists', sum(e, (x) => x.sa))}`;
}
const evNote = (a) => (a.some((x) => x.dribbles != null) ? `<p class="muted small">🏃 Dribbles and 2nd assists (the pass before the assist) come from EA's match events – only in games archived since ${esc(EV_SINCE)}.</p>` : '');
// P7.3: EA exposes no pitch coordinates, so this is a role/involvement map, not a real heat map – bubble size = share
// of games played in that role, shade = involvement while playing it (each role's own defining stat).
const PITCH_ZONES = { GK: { x: 50, y: 90, label: 'GK', stat: 'saves', cap: 4 }, DEF: { x: 50, y: 70, label: 'DEF', stat: 'tackles', cap: 4 }, MID: { x: 50, y: 48, label: 'MID', stat: 'passes', cap: 25 }, FWD: { x: 50, y: 22, label: 'FWD', stat: 'g+a+shots', cap: 6 } };
function pitchGroups(a) {
  const byGroup = {};
  for (const x of a) {
    const g = POS[String(x.pos).toLowerCase()];
    if (!g) continue;
    (byGroup[g] ??= []).push(x);
  }
  const total = a.length;
  return Object.entries(byGroup).map(([g, apps]) => {
    const z = PITCH_ZONES[g];
    const value = g === 'FWD' ? sum(apps, (x) => x.goals * 3 + x.assists * 2 + x.shots) : sum(apps, (x) => x[z.stat]) || 0;
    const perGame = value / apps.length;
    const share = apps.length / total;
    return { label: z.label, x: z.x, y: z.y, r: 12 + Math.sqrt(share) * 44, intensity: Math.min(1, perGame / z.cap), tip: `${z.label} · ${apps.length} of ${total} games (${Math.round(share * 100)}%) · ${r1(perGame)} ${z.stat}/game` };
  });
}
const r1 = (n) => Math.round(n * 10) / 10;
function logTable(id, a, base) {
  const ev = a.some((x) => x.dribbles != null);
  const evd = (v) => td(v == null ? '<span class="muted">–</span>' : v, true, v ?? -1);
  return table(id, ['Date', 'Res', 'Score', 'For', 'Against', 'Pos', '#Rating', '#G', '#A', ...(ev ? ['#2nd A'] : []), '#Shots', '#Pass', '#Tkl', ...(ev ? ['#Drb'] : []), '#Saves'], a.map((x) =>
    `<tr>${dateCell(x.ts)}${td(resPill(x.res))}${td(`<a href="${base}matches/${x.matchId}.html">${x.gf}–${x.ga}</a>`)}${td(`${crest(x.clubId, 18, base)} ${clubLink(x.clubId, base)}`)}${td(`${crest(x.oppId, 18, base)} ${clubLink(x.oppId, base)}`)}${td(posAbbr(x.pos))}${td(ratingPill(x.rating) + (x.mom ? ' ⭐' : ''), true, x.rating)}${td(x.goals, true)}${td(x.assists, true)}${ev ? evd(x.sa) : ''}${td(x.shots, true)}${td(`${x.passes}/${x.passAtt}`, true, x.passes)}${td(`${x.tackles}/${x.tackleAtt}`, true, x.tackles)}${ev ? evd(x.dribbles) : ''}${td(x.saves, true)}</tr>`));
}

// ---------- match page ----------
function matchBody(m, base) {
  const mi = homeMatches.slice(0, 3).findIndex((x) => x.matchId === m.matchId); // BE9 covers the newest three results (MATCH_CARDS)
  const opp = m.clubs[homeId] ? oppOf(m, homeId) : null; // BE9 head-to-head: only the home club's own matches have a record vs this opponent (every one is in api/h2h.json, built from the same list)
  const insightSlot = (mi < 0 ? '' : `<div data-nx-insight="${mi ? `match.${esc(m.matchId)}` : 'match.latest'}" hidden></div>`) + (opp ? `<div data-nx-insight="h2h.${esc(opp)}" hidden></div>` : '');
  const [h, aw] = Object.keys(m.clubs).sort((a, b) => (a === homeId ? -1 : b === homeId ? 1 : 0));
  const list = (cid) => Object.entries(m.players?.[cid] || {}).map(([pid, p]) => ({ pid, ...p }));
  const team = (cid) => {
    const l = list(cid);
    return {
      goals: num(m.clubs[cid].goals), shots: sum(l, (p) => num(p.shots)), passes: sum(l, (p) => num(p.passesmade)),
      passPct: pct(sum(l, (p) => num(p.passesmade)), sum(l, (p) => num(p.passattempts))), tackles: sum(l, (p) => num(p.tacklesmade)),
      tacklePct: pct(sum(l, (p) => num(p.tacklesmade)), sum(l, (p) => num(p.tackleattempts))), saves: sum(l, (p) => num(p.saves)),
      rating: avg(l.map((p) => num(p.rating))), red: sum(l, (p) => num(p.redcards)), players: l.length,
      dribbles: sum(l, (p) => num(p.dribbles)), sa: sum(l, (p) => num(p.secondassists)),
    };
  };
  const T = [team(h), team(aw)];
  const ev = hasEv(m);
  const rows = [['Goals', 'goals'], ['Shots', 'shots'], ['Passes', 'passes'], ['Pass accuracy', 'passPct', '%'], ...(ev ? [['Dribbles', 'dribbles'], ['2nd assists', 'sa']] : []), ['Tackles', 'tackles'], ['Tackle success', 'tacklePct', '%'], ['Saves', 'saves'], ['Avg rating', 'rating', '', 1], ['Red cards', 'red'], ['Human players', 'players']];
  const cmp = rows.map(([label, k, suf = '', dec = 0]) => {
    const x = T[0][k], y = T[1][k], tot = x + y || 1;
    return `<li><b class="${x > y ? 'lead' : ''}">${dec ? x.toFixed(dec) : x}${suf}</b><span>${label}</span><b class="${y > x ? 'lead' : ''}">${dec ? y.toFixed(dec) : y}${suf}</b><div class="duel"><i class="l" style="--w:${(x / tot) * 100}%"></i><i class="r" style="--w:${(y / tot) * 100}%"></i></div></li>`;
  }).join('');

  // Pitch: home attacks right, away attacks left.
  const LINES = { goalkeeper: 0, defender: 1, midfielder: 2, forward: 3 };
  const X = [[6, 17, 29, 41], [94, 83, 71, 59]];
  const dots = [h, aw].flatMap((cid, side) => {
    const groups = [[], [], [], []];
    for (const p of list(cid)) groups[LINES[p.pos] ?? 2].push(p);
    return groups.flatMap((g, line) => g.map((p, i) => ({ p, side, x: X[side][line], y: ((i + 1) * 100) / (g.length + 1) })));
  });
  const pitch = `<div class="pitch"><div class="pitch-lines"><i class="half"></i><i class="circle"></i><i class="box l"></i><i class="box r"></i></div>
${dots.map(({ p, side, x, y }) => { const pl = players.get(p.pid); return `<a class="pp side${side}" style="left:${x}%;top:${y}%" ${pl && !pl.hidden ? `href="${pUrl(pl, base)}"` : ''} data-tip="${esc(`${p.playername} · ${posAbbr(p.pos)} · ${num(p.rating).toFixed(1)}${num(p.goals) ? ` · ${p.goals}G` : ''}${num(p.assists) ? ` · ${p.assists}A` : ''}`)}"><b class="${ratingClass(num(p.rating))}">${num(p.rating).toFixed(1)}</b><span>${esc(p.playername)}</span>${p.mom === '1' ? '<em>⭐</em>' : ''}${num(p.goals) ? `<u>${'⚽'.repeat(Math.min(num(p.goals), 3))}</u>` : ''}</a>`; }).join('')}</div>
<div class="pitch-key"><span>${crest(h, 18, base)} ${esc(clubName(h))} →</span><span>← ${esc(clubName(aw))} ${crest(aw, 18, base)}</span></div>`;

  const evd = (v) => td(v === undefined ? '<span class="muted">–</span>' : esc(v), true, v === undefined ? -1 : num(v));
  const side = (cid) => section(`${crest(cid, 30, base)} ${clubLink(cid, base)}`, table(`m-${cid}`, ['Player', 'Pos', '#Rating', '#G', '#A', ...(ev ? ['#2nd A'] : []), '#Shots', '#Pass', ...(ev ? ['#Drb'] : []), '#Tkl', '#Saves', 'MOTM'], list(cid).sort((x, y) => num(y.rating) - num(x.rating)).map((p) =>
    `<tr>${td(pLink(p.pid, base, p.playername))}${td(posAbbr(p.pos))}${td(ratingPill(num(p.rating)), true, num(p.rating))}${td(p.goals, true)}${td(p.assists, true)}${ev ? evd(p.secondassists) : ''}${td(p.shots, true)}${td(`${p.passesmade}/${p.passattempts}`, true, p.passesmade)}${ev ? evd(p.dribbles) : ''}${td(`${p.tacklesmade}/${p.tackleattempts}`, true, p.tacklesmade)}${td(p.saves, true)}${td(p.mom === '1' ? '⭐' : '')}</tr>`)));

  return `${m.matchType === 'friendlyMatch' ? '<p class="kicker reveal">🤝 Club friendly – not counted in League stats</p>' : ''}<div class="reveal">${poster(m, base, { link: false })}<button class="btn dl-poster" type="button" data-for="poster-${m.matchId}">⬇ Download result graphic</button></div>
${insightSlot}<div class="grid2 reveal">${card('Match stats', `<div class="cmp-head"><span>${crest(h, 26, base)}</span><span>${crest(aw, 26, base)}</span></div><ul class="compare-bars">${cmp}</ul>`)}${card('Line-ups & ratings', pitch)}</div>
${side(h)}${side(aw)}${ev ? '<p class="muted small">🏃 Drb = dribbles completed, 2nd A = the pass before the assist (from EA\'s match events).</p>' : ''}`;
}

// ---------- tactics table (redesign board 03) ----------
// Signature move: the real squad, in a real formation, on a pitch app.js turns into an orbitable 3D
// scene – tower height = the stat you pick, camera presets, tap a player for their card. This function
// only picks the XI and lays out the flat, always-works markup (same `.pitch`/`.pp` dots as the match
// line-up); app.js reads the embedded JSON to build the 3D upgrade on top when motion/viewport allow it.
// Starting XI = most games played per line, 4-4-2 shape (caps below) – whoever doesn't make the cut is
// still in the card grid/table underneath, nothing is hidden, just not everyone fits on one pitch.
function tacticsTable(squad, base) {
  const CAP = { GK: 1, DEF: 4, MID: 4, FWD: 2 };
  const XPOS = { GK: 8, DEF: 27, MID: 56, FWD: 83 };
  const byGroup = {};
  for (const p of squad) { if (!p.group) continue; (byGroup[p.group] ??= []).push(p); }
  const picks = [];
  for (const g of ['GK', 'DEF', 'MID', 'FWD']) {
    const arr = (byGroup[g] || []).sort((a, b) => num(b.main?.gamesPlayed) - num(a.main?.gamesPlayed)).slice(0, CAP[g] || 0);
    arr.forEach((p, i) => picks.push({ p, group: g, x: XPOS[g], y: ((i + 1) * 100) / (arr.length + 1) }));
  }
  if (picks.length < 3) return ''; // too small a roster to bother – card grid below still shows everyone
  const statOf = (p, k) => ({ g: num(p.main?.goals), a: num(p.main?.assists), r: num(p.main?.ratingAve), m: num(p.main?.manOfTheMatch) }[k]);
  const dots = picks.map(({ p, x, y }) =>
    `<a class="pp side0" style="left:${x}%;top:${y}%" href="${pUrl(p, base)}" data-key="${esc(p.key)}" data-tip="${esc(`${p.name} · ${p.pos} · OVR ${p.ovr || '–'}`)}"><b class="${ratingClass(num(p.main?.ratingAve))}">${p.ovr || '–'}</b><span>${esc(p.name)}</span></a>`).join('');
  const data = picks.map(({ p, x, y, group }) => ({ key: p.key, name: p.name, pos: p.pos, group, ovr: p.ovr || 0, x, y, g: statOf(p, 'g'), a: statOf(p, 'a'), r: statOf(p, 'r'), m: statOf(p, 'm') }));
  const cards = picks.map(({ p }) => `<div class="tt-card" data-tt-card="${esc(p.key)}" hidden>${futCard(p, base, { big: true })}</div>`).join('');
  return `<section class="block reveal tt" data-tactics>
<h2 class="banner-h">The Tactics Table <small>Starting XI by games played · tap a player</small></h2>
<div class="tt-wrap">
<div class="tt-board">
<div class="pitch tt-ground" data-tt-flat><div class="pitch-lines"><i class="half"></i><i class="circle"></i><i class="box l"></i><i class="box r"></i></div>${dots}</div>
<div class="tt-stage" data-tt-stage hidden></div>
<div class="tt-hint muted small" data-tt-hint hidden>🖐 Drag to orbit · pinch or ± to zoom · tap a player</div>
</div>
<div class="tt-side">
<div class="tt-controls">
<div class="osw small feat-label">Tower height shows</div>
<div class="chipset" data-tt-stat><button class="chip on" type="button" data-stat="g">⚽ Goals</button><button class="chip" type="button" data-stat="a">🅰️ Assists</button><button class="chip" type="button" data-stat="r">⭐ Rating</button><button class="chip" type="button" data-stat="m">🏅 MOTM</button></div>
<div class="osw small feat-label" data-tt-camlabel hidden>Camera</div>
<div class="chipset" data-tt-cam hidden><button class="chip on" type="button" data-cam="broadcast">📺 Broadcast</button><button class="chip" type="button" data-cam="top">🗺️ Top down</button><button class="chip" type="button" data-cam="goal">🥅 Behind goal</button></div>
<div class="chipset" data-tt-zoom hidden><button class="chip" type="button" data-zoom="out" aria-label="Zoom out">−</button><button class="chip" type="button" data-zoom="in" aria-label="Zoom in">+</button><button class="chip" type="button" data-tt-reset>↺ Reset view</button></div>
</div>
<div class="tt-cardslot" data-tt-cardslot>${cards}<p class="muted small tt-hint-empty" data-tt-empty>Tap any player above to see their card.</p></div>
</div>
</div>
<p class="muted small">Real squad, real formation, from EA's own numbers – no invented heat maps. Works without 3D too: reduced motion or a smaller screen keeps the board flat with the same numbers.</p>
<script type="application/json" data-tt-data>${JSON.stringify(data)}</script>
</section>`;
}

// Compact home-page teaser for the tactics table (board 04, part 1). Deliberately static – app.js's
// tactics-table upgrade looks up `[data-tactics]` as a singleton, so a second orbitable copy on the home
// page would fight the real one on squad.html. Same XI-picking logic, same `.pitch`/`.pp` dots, no 3D.
function tacticsTeaser(squad, base) {
  const CAP = { GK: 1, DEF: 4, MID: 4, FWD: 2 };
  const XPOS = { GK: 8, DEF: 27, MID: 56, FWD: 83 };
  const byGroup = {};
  for (const p of squad) { if (!p.group) continue; (byGroup[p.group] ??= []).push(p); }
  const picks = [];
  for (const g of ['GK', 'DEF', 'MID', 'FWD']) {
    const arr = (byGroup[g] || []).sort((a, b) => num(b.main?.gamesPlayed) - num(a.main?.gamesPlayed)).slice(0, CAP[g] || 0);
    arr.forEach((p, i) => picks.push({ p, x: XPOS[g], y: ((i + 1) * 100) / (arr.length + 1) }));
  }
  if (picks.length < 3) return '';
  const dots = picks.map(({ p, x, y }) =>
    `<a class="pp side0" style="left:${x}%;top:${y}%" href="${pUrl(p, base)}" data-tip="${esc(`${p.name} · ${p.pos} · OVR ${p.ovr || '–'}`)}"><b class="${ratingClass(num(p.main?.ratingAve))}">${p.ovr || '–'}</b><span>${esc(p.name)}</span></a>`).join('');
  return section('The Tactics Table', card('', `<div class="pitch tt-teaser-pitch"><div class="pitch-lines"><i class="half"></i><i class="circle"></i><i class="box l"></i><i class="box r"></i></div>${dots}</div><p><a class="btn" href="${base}squad.html">🧠 Full squad & Tactics Table →</a></p>`, 'tt-teaser'), { sub: 'starting XI by games played' });
}

// Full squad 3D card carousel (redesign board 04, part 2). Flat `.card-grid` of real futCard()s always
// renders (works with JS off, reduced motion, small screens); app.js's "squad carousel" block upgrades it
// into a draggable ring – the hero coin's drag-to-spin-and-settle idea (board 02), ported to a full circle
// – with the front card enlarged and flippable to show season stats + last-10 ratings.
function squadCarousel(squad, base) {
  if (squad.length < 3) return '';
  const GROUPS = ['All', 'GK', 'DEF', 'MID', 'FWD'].filter((g) => g === 'All' || squad.some((p) => p.group === g));
  const data = squad.map((p) => {
    const s = p.main ?? {};
    const last10 = [...p.apps].reverse().slice(-10).map((x) => num(x.rating)).filter(Boolean);
    return {
      group: p.group || '',
      front: futCard(p, base),
      back: `<div class="carousel-back"><b>${esc(p.name)}</b>
<div class="rsq-row">${last10.length ? last10.map((r) => `<i class="rsq ${ratingClass(r)}" data-tip="${r.toFixed(1)}"></i>`).join('') : '<span class="muted small">No ratings yet</span>'}</div>
<p class="small muted">${last10.length ? `Last ${last10.length} ratings · ` : ''}${num(s.goals)} G · ${num(s.assists)} A · ${num(s.manOfTheMatch)} MOTM</p>
<a class="btn small" href="${pUrl(p, base)}">Full profile →</a></div>`,
    };
  });
  return `<section class="block reveal" data-carousel>
<h2 class="banner-h">Full Squad <small>drag to spin · tap a card to flip</small></h2>
<div class="chipset carousel-filter" data-carousel-filter>${GROUPS.map((g, i) => `<button class="chip${i ? '' : ' on'}" type="button" data-pos="${g}">${g}</button>`).join('')}</div>
<div class="card-grid carousel-flat" data-carousel-flat>${squad.map((p) => futCard(p, base)).join('')}</div>
<div class="carousel-stage" data-carousel-stage hidden tabindex="0"></div>
<script type="application/json" data-carousel-data>${JSON.stringify(data)}</script>
</section>`;
}

// Leaders podium (redesign board 04, part 2). Flat ranked lists (barList, reusing the existing
// `[data-tabs]`/`.tab-panel` chip switcher already used by the stats-centre leaderboards) always work;
// app.js's "leaders podium" block grows a 3D-tilted top-3 podium on top when motion is allowed – the
// hero's mouse-tracked tilt pattern (board 02), ported here as a hover tilt instead of a parallax one.
function leadersPodium(members, id, base) {
  const STATS = [
    ['g', '⚽ Goals', (s) => num(s.goals)],
    ['a', '🅰️ Assists', (s) => num(s.assists)],
    ['r', '⭐ Rating', (s) => (num(s.gamesPlayed) >= 3 ? num(s.ratingAve) : 0), (v) => v.toFixed(1)],
    ['m', '🏅 MOTM', (s) => num(s.manOfTheMatch)],
  ];
  const panels = STATS.map(([k, label, f, fmt]) => {
    const top = members.filter((p) => p.clubStats[id]).map((pl) => ({ pl, v: f(pl.clubStats[id]) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
    return top.length ? { k, label, top, fmt: fmt ?? ((v) => v) } : null;
  }).filter(Boolean);
  if (!panels.length) return '';
  const data = panels.map(({ k, top, fmt }) => ({ key: k, top3: top.slice(0, 3).map(({ pl, v }) => ({ name: pl.name, href: pUrl(pl, base), v: fmt(v) })) }));
  return `<section class="block reveal" data-podium>
<h2 class="banner-h">Leaders Podium <small>top performers this season</small></h2>
<div class="tabs chipset podium-tabs" data-tabs>${panels.map(({ k, label }, i) => `<button class="chip${i ? '' : ' on'}" type="button" data-tab="pod-${k}">${label}</button>`).join('')}</div>
${panels.map(({ k, top }, i) => `<div class="tab-panel" id="pod-${k}"${i ? ' hidden' : ''}>${barList(top, { base, fmt: panels[i].fmt })}</div>`).join('')}
<div class="podium-wrap" data-podium-stage hidden><div class="podium-3d"></div></div>
<p><a class="btn ghost" href="${base}stats.html">🏆 Full leaders →</a></p>
<script type="application/json" data-podium-data>${JSON.stringify(data)}</script>
</section>`;
}

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'web'), path.join(OUT, 'assets'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'web', 'sw.js'), path.join(OUT, 'sw.js')); // BE0 push receiver: must sit at the site root

write('index.html', page({ title: `${config.siteTitle} – Official Pro Clubs hub`, base: '', active: 'home', body: clubBody(homeId, '', true) }));

const homeSquad = visiblePlayers.filter((p) => p.isHome).sort((a, b) => num(b.main.gamesPlayed) - num(a.main.gamesPlayed));
write('squad.html', page({ title: `Squad – ${config.siteTitle}`, base: '', active: 'squad', body: `
${pageHead('The Squad', `${homeSquad.length} players · card stats are NOREX totals, OVR from EA`, '')}
${tacticsTable(homeSquad, '')}
<div class="toolbar"><div class="chipset" data-posfilter>${['All', 'GK', 'DEF', 'MID', 'FWD'].map((p, i) => `<button class="chip${i ? '' : ' on'}" type="button" data-pos="${p}">${p}</button>`).join('')}</div>
<div class="chipset" data-view><button class="chip on" type="button" data-v="cards">Cards</button><button class="chip" type="button" data-v="table">Table</button></div></div>
<div class="view view-cards"><div class="card-grid">${homeSquad.map((p) => futCard(p, '')).join('')}</div></div>
<div class="view view-table" hidden>${squadTable(homeSquad, homeId, '', 'squad')}</div>` }));

for (const id of clubs.keys()) {
  if (id === homeId) continue;
  write(`clubs/${id}.html`, page({ title: `${clubName(id)} – ${config.siteTitle}`, base: '../', active: 'clubs', body: clubBody(id, '../', false), image: crestSrc(id, '') }));
}
write('results.html', page({ title: `Results drill-down – ${config.siteTitle}`, base: '', active: 'home', description: `Every ${config.siteTitle} win, draw, defeat, goal and clean sheet, match by match.`, body: drillBody(homeId, '') }));
for (const id of clubs.keys()) {
  if (id === homeId || !matches.some((m) => m.clubs[id])) continue;
  write(drillPath(id), page({ title: `${clubName(id)} results – ${config.siteTitle}`, base: '../', active: 'clubs', body: drillBody(id, '../'), image: crestSrc(id, '') }));
}
write(`clubs/${homeId}.html`, `<!doctype html><meta http-equiv="refresh" content="0;url=../index.html">`);
const tierOrder = { home: 0, manual: 1, linked: 2, discovered: 3 };
const clubList = [...clubs.values()].sort((a, b) => (tierOrder[state.clubs[a.id]?.tier] ?? 4) - (tierOrder[state.clubs[b.id]?.tier] ?? 4) || num(b.overall?.skillRating) - num(a.overall?.skillRating));
write('clubs/index.html', page({ title: `Clubs – ${config.siteTitle}`, base: '../', active: 'clubs', body: `
${pageHead('Clubs', 'Found automatically. Every opponent is tracked, and any club where one of our players also plays is <b>linked</b> and fully archived. A background crawler keeps scanning for more.', '../', false)}
<div class="toolbar"><div class="chipset" data-tierfilter>${['all', 'home', 'linked', 'manual', 'discovered'].map((t, i) => `<button class="chip${i ? '' : ' on'}" type="button" data-tier="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><input class="filter" type="search" placeholder="Search clubs…" data-cardfilter=".club-card"></div>
<div class="club-grid">${clubList.map((c) => { const o = { ...(c.overall ?? {}), ...(c.leaderboard ?? {}) }; const tr = state.clubs[c.id]?.tier ?? 'archived'; return `<a class="club-card tier-${esc(tr)}" data-tier="${esc(tr)}" href="${clubHref(c.id, '../')}"><span class="fut-shine"></span>${crest(c.id, 72, '../')}<b>${esc(clubName(c.id))}</b><span class="tag">${esc(tr)}</span><small>${esc(o.wins ?? 0)}W · ${esc(o.ties ?? 0)}D · ${esc(o.losses ?? 0)}L</small><small class="muted">SR ${esc(o.skillRating ?? '–')}${o.currentDivision ? ` · Div ${esc(o.currentDivision)}` : ''}</small></a>`; }).join('')}</div>` }));

for (const m of allMatches) {
  const [a, b] = Object.keys(m.clubs);
  // Share preview: the opponent's crest (ours for linked-club games) + score line, scorers and MOTM.
  const [h, aw] = m.clubs[homeId] ? [homeId, oppOf(m, homeId)] : [a, b];
  const all = Object.values(m.players || {}).flatMap((l) => Object.values(l));
  const motm = all.find((p) => p.mom === '1');
  const goals = Object.values(m.players?.[h] || {}).filter((p) => num(p.goals)).map((p) => `${p.playername}${num(p.goals) > 1 ? ` ×${num(p.goals)}` : ''}`);
  const verdict = { W: 'Win', L: 'Defeat', D: 'Draw' }[result(m.clubs[h])];
  write(`matches/${m.matchId}.html`, page({ title: `${clubName(h)} ${m.clubs[h].goals}–${m.clubs[aw].goals} ${clubName(aw)}`, base: '../', active: 'matches', body: matchBody(m, '../'),
    description: `${verdict} · ${typeLabel(m)} · ${niceDate(m.timestamp)}${goals.length ? ` · ⚽ ${goals.join(', ')}` : ''}${motm ? ` · ⭐ MOTM ${motm.playername} (${num(motm.rating).toFixed(1)})` : ''}`,
    image: ogCrest(h === homeId ? aw : h) }));
}
const sessions = sessionsFor(homeMatches, homeId);
write('matches/index.html', page({ title: `Matches – ${config.siteTitle}`, base: '../', active: 'matches', body: `
${pageHead('Matches', 'Every match since the site started archiving (EA itself only keeps the last 5). Play nights are grouped into sessions and graded on results and goal difference.', '../')}
${homeMatches.length ? '<div data-nx-insight="matches.last5" hidden></div>' : ''}
${modes(`${section('Sessions', `<div class="session-grid">${sessions.map((s) => sessionCard(s, '../', homeId)).join('') || emptyState('🗓️', 'No sessions yet', 'Every play night becomes a graded session card here.')}</div>`)}
${section('All results', `${calendar('cal-all', homeMatches)}<div class="fixtures" id="cal-all">${homeMatches.map((m) => fixture(m, homeId, '../')).join('') || emptyState('🗂️', 'No results yet', 'Every league and playoff match is saved here from the next update on.')}</div>`)}
${matches.some((m) => !m.clubs[homeId]) ? section('Linked club matches', `<div class="fixtures">${matches.filter((m) => !m.clubs[homeId]).map((m) => fixture(m, Object.keys(m.clubs)[0], '../')).join('')}</div>`) : ''}`, 'matches', 'League & playoffs from EA · Rush logged by members · friendlies apart', section('Friendlies', friendlyBody('../')))}` }));

// Stats centre
const homeC = clubs.get(homeId);
const hm = homeSquad.map((pl) => ({ pl, s: pl.clubStats[homeId] }));
const min3 = (s, v) => (num(s.gamesPlayed) >= 3 ? v : 0);
const boards = [
  ['Goals', (s) => num(s.goals)], ['Assists', (s) => num(s.assists)], ['G+A', (s) => num(s.goals) + num(s.assists)],
  ['Rating', (s) => min3(s, num(s.ratingAve)), (v) => v.toFixed(1)], ['MOTM', (s) => num(s.manOfTheMatch)],
  ['Games', (s) => num(s.gamesPlayed)], ['Goals/game', (s) => min3(s, num(s.goals) / num(s.gamesPlayed)), (v) => v.toFixed(2)],
  ['Pass %', (s) => min3(s, num(s.passSuccessRate)), (v) => v + '%'], ['Tackle %', (s) => min3(s, num(s.tackleSuccessRate)), (v) => v + '%'],
  ['Clean sheets', (s) => num(s.cleanSheetsDef) + num(s.cleanSheetsGK)], ['Win %', (s) => min3(s, num(s.winRate)), (v) => v + '%'],
];
const allApps = homeMatches.flatMap((m) => Object.entries(m.players?.[homeId] || {}).map(([pid, p]) => ({ m, pid, p }))).filter((x) => !players.get(x.pid)?.hidden);
const recBest = (f) => [...allApps].sort((a, b) => f(b.p) - f(a.p))[0];
const margin = (m) => num(m.clubs[homeId].goals) - num(m.clubs[oppOf(m, homeId)].goals);
const bigWin = [...homeMatches].sort((a, b) => margin(b) - margin(a))[0];
const bigLoss = [...homeMatches].sort((a, b) => margin(a) - margin(b))[0];
let streak = 0, bestStreak = 0;
for (const m of [...homeMatches].reverse()) { streak = result(m.clubs[homeId]) === 'W' ? streak + 1 : 0; bestStreak = Math.max(bestStreak, streak); }
const record = (icon, title, value, sub, href) => `<a class="record"${href ? ` href="${href}"` : ''}><span class="fut-shine"></span><span class="rec-icon">${icon}</span><small>${title}</small><b>${value}</b><span>${sub}</span></a>`;
const hatTricks = allApps.filter((x) => num(x.p.goals) >= 3);
const scoreOf = (m) => `${m.clubs[homeId].goals}–${m.clubs[oppOf(m, homeId)].goals}`;
const recs = homeMatches.length ? [
  bigWin && margin(bigWin) > 0 && record('💥', 'Biggest win', scoreOf(bigWin), `vs ${esc(clubName(oppOf(bigWin, homeId)))}`, `matches/${bigWin.matchId}.html`),
  bigLoss && margin(bigLoss) < 0 && record('🧊', 'Heaviest defeat', scoreOf(bigLoss), `vs ${esc(clubName(oppOf(bigLoss, homeId)))}`, `matches/${bigLoss.matchId}.html`),
  ...[['🌟', 'Highest match rating', 'rating', (v) => num(v).toFixed(1)], ['⚽', 'Most goals in a match', 'goals'], ['🎯', 'Most assists in a match', 'assists'], ['🧤', 'Most saves in a match', 'saves'], ['🅿️', 'Most passes in a match', 'passesmade']]
    .map(([icon, title, f, fmt = (v) => v]) => { const r = recBest((p) => num(p[f])); return r && num(r.p[f]) ? record(icon, title, fmt(r.p[f]), esc(r.p.playername), `matches/${r.m.matchId}.html`) : null; }),
  record('🔥', 'Longest win streak', Math.max(bestStreak, num(homeC?.overall?.wstreak)), 'matches in a row'),
  record('🎩', 'Hat-tricks', hatTricks.length, hatTricks.slice(0, 3).map((x) => esc(x.p.playername)).join(', ') || 'none yet'),
].filter(Boolean) : [];
const h2h = new Map();
for (const m of homeMatches) {
  const o = oppOf(m, homeId);
  const e = h2h.get(o) ?? { o, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, last: m };
  e.p++; e[result(m.clubs[homeId]).toLowerCase()]++; e.gf += num(m.clubs[homeId].goals); e.ga += num(m.clubs[o].goals);
  h2h.set(o, e);
}
// Leaderboards, hall of fame + advanced metrics (P4.5 / P4.6 / P1.2) – lives in leaders-page.mjs.
// P1.8: EA's global top 100 by skill rating (data/world.json, fetched once a day) + where NOREX stands.
function worldHtml() {
  const w = readJson(path.join(DATA, 'world.json'), null);
  if (!w?.clubs?.length) return emptyState('🌍', 'World table not loaded yet', 'EA’s global top 100 is fetched once a day – it appears after the next update.');
  const sr = num(homeC?.overall?.skillRating), cut = w.clubs.at(-1).sr, me = w.clubs.find((c) => c.id === homeId);
  const logo = (c) => (clubs.has(c.id) ? crest(c.id, 22, '') : c.crest ? `<img class="crest" src="${CREST_CDN}${num(c.crest)}.png" width="22" height="22" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '');
  const name = (c) => (clubHref(c.id, '') ? `<a href="${clubHref(c.id, '')}">${esc(c.name)}</a>` : esc(c.name));
  return `<section class="stats world-stats">${me ? counter('World rank', me.rank, { text: `#${me.rank}` }) : ''}${counter(`${esc(config.siteTitle)} SR`, sr)}${counter('#1 skill rating', w.clubs[0].sr)}${counter('#100 cut-off', cut)}${me ? '' : counter('SR to the top 100', Math.max(0, cut - sr + 1))}</section>
<p class="world-verdict">${me ? `🌍 <b>${esc(config.siteTitle)}</b> is <b>#${me.rank}</b> in the world – ${me.sr - cut} SR above the cut-off.` : `🎯 <b>${Math.max(0, cut - sr + 1)} SR</b> to break into the world top 100 (we're on ${sr}, #100 has ${cut}).`}</p>
${table('world-top', ['#Rank', 'Club', '#SR', '#GP', 'W-D-L', '#Win %', '#Goals/gm', '#Clean sh.', '#Div'], w.clubs.map((c) =>
    `<tr${c.id === homeId ? ' class="world-me"' : ''}>${td(c.rank, true)}${td(`${logo(c)} ${name(c)}`, false, c.name.toLowerCase())}${td(`<b>${c.sr}</b>`, true, c.sr)}${td(c.gp, true)}${td(`${c.w}-${c.d}-${c.l}`, false, c.w)}${td(pct(c.w, c.gp) + '%', true, pct(c.w, c.gp))}${td(c.gp ? (c.gf / c.gp).toFixed(2) : '–', true, c.gp ? c.gf / c.gp : 0)}${td(c.cs, true)}${td(c.div ?? '–', true, c.div ?? 99)}</tr>`), { filter: 'Search clubs…' })}
${worldCompareHtml(w, me, sr)}
<p class="muted small">All-time skill rating from EA, updated ${esc(new Date(w.fetchedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }))}. Every platform of this generation in one table.</p>`;
}

// P9.2: pick any club in the world top 100 and compare it with NOREX on the same numbers. The club list is
// embedded as JSON; app.js's "world compare" block draws the bars, so there's no extra request.
function worldCompareHtml(w, me, sr) {
  const pickable = (c) => ({ id: c.id, name: c.name, rank: c.rank, sr: c.sr, gp: c.gp, w: c.w, d: c.d, l: c.l, gf: c.gf, ga: c.ga, cs: c.cs, div: c.div ?? null });
  const home = me ? { ...pickable(me), name: config.siteTitle } : { id: homeId, name: config.siteTitle, rank: null, sr, gp: null, w: null, d: null, l: null, gf: null, ga: null, cs: null, div: null };
  const defaultId = me && me.rank > 1 ? w.clubs.find((c) => c.rank === me.rank - 1)?.id : w.clubs[1]?.id ?? w.clubs[0].id;
  const data = JSON.stringify({ home, clubs: w.clubs.map(pickable) }).replace(/</g, '\\u003c');
  const options = w.clubs.map((c) => `<option value="${esc(c.id)}"${c.id === defaultId ? ' selected' : ''}>#${c.rank} ${esc(c.name)}</option>`).join('');
  return `<div class="card world-cmp" data-worldcmp>
<h3>⚔️ Compare with any world top 100 club</h3>
<label class="world-cmp-pick small muted">Club <select data-worldcmp-pick>${options}</select></label>
<div class="world-cmp-out" data-worldcmp-out></div>
<script type="application/json" data-worldcmp-data>${data}</script>
</div>`;
}
const LH = { write, page, pageHead, section, modes, esc, emptyState, pLink, clubName, config, brand, MEMBER_API, STARS, leaderboard: homeC?.leaderboard, world: worldHtml(), evSince: EV_SINCE };
const lm = leagueMatches({ homeMatches, homeId, isHidden: (pid) => !!players.get(pid)?.hidden, oppOf, result });
buildLeaders(LH, lm);
buildHallOfFame(LH, lm, { recs });
write('stats.html', page({ title: `Stats – ${config.siteTitle}`, base: '', active: 'stats', body: `
${pageHead('Stats centre', "League leaderboards use EA's club totals; records and head-to-heads come from the match archive. Rush numbers come from results logged by members and confirmed by a manager.", '')}
${modes(`${section('Leaderboards', `<div class="tabs chipset" data-tabs>${boards.map(([k], i) => `<button class="chip${i ? '' : ' on'}" type="button" data-tab="lb${i}">${k}</button>`).join('')}</div>
${boards.map(([, f, fmt], i) => `<div class="tab-panel card" id="lb${i}"${i ? ' hidden' : ''}>${barList(hm.map(({ pl, s }) => ({ pl, v: f(s) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 10), { base: '', fmt: fmt ?? ((v) => v) })}</div>`).join('')}`)}
${recs.length ? section('Club records', `<div class="records">${recs.join('')}</div>`, { sub: 'from the archive' }) : ''}
${section('Head to head', table('h2h', ['Opponent', '#P', '#W', '#D', '#L', '#GF', '#GA', '#GD', 'Last'], [...h2h.values()].sort((a, b) => b.p - a.p).map((e) =>
    `<tr data-h2h="${esc(e.o)}" tabindex="0" title="Click for the head-to-head insight">${td(`${crest(e.o, 22, '')} ${clubLink(e.o, '')}`)}${td(e.p, true)}${td(e.w, true)}${td(e.d, true)}${td(e.l, true)}${td(e.gf, true)}${td(e.ga, true)}${td((e.gf - e.ga > 0 ? '+' : '') + (e.gf - e.ga), true, e.gf - e.ga)}${td(`<a href="matches/${e.last.matchId}.html">${resPill(result(e.last.clubs[homeId]))} ${scoreOf(e.last)}</a>`)}</tr>`), { filter: 'Search opponents…' }) + '<div data-nx-h2h-insight hidden></div>')}`, 'leaders')}
${advancedSection(LH, lm)}
<p class="muted small">🏆 Monthly tables, Player of the Month and Best XI: <a href="leaders.html">Leaderboards</a> · 🏛️ <a href="halloffame.html">Hall of Fame</a></p>` }));

write('compare.html', page({ title: `Compare – ${config.siteTitle}`, base: '', active: 'compare', body: `
${pageHead('Head to head', "Pick any two players, from NOREX or anyone we've faced. Radar values are percentiles against every tracked player with 3+ games.", '')}
<div class="cmp-pick card"><label>Player A<input list="cmp-list" id="cmp-a" placeholder="Type a gamertag…" autocomplete="off"></label><span class="vs">VS</span><label>Player B<input list="cmp-list" id="cmp-b" placeholder="Type a gamertag…" autocomplete="off"></label><datalist id="cmp-list"></datalist></div>
<div id="cmp-out" class="cmp-out"><p class="muted">Loading players…</p></div>
<div class="nx-insight-slot" data-nx-cmp-insight hidden></div>` }));

for (const pl of visiblePlayers) {
  const st = pl.main && num(pl.main.gamesPlayed) ? { gp: num(pl.main.gamesPlayed), g: num(pl.main.goals), a: num(pl.main.assists), r: num(pl.main.ratingAve) } : pl.arch && { gp: pl.arch.gp, g: pl.arch.g, a: pl.arch.a, r: pl.arch.r };
  write(`players/${pl.key}.html`, page({ title: `${pl.name} – ${config.siteTitle}`, base: '../', active: 'players', body: playerBody(pl, '../'),
    description: `${pl.pos || 'Player'}${pl.ovr ? ` · OVR ${pl.ovr}` : ''}${pl.mainClub ? ` · ${clubName(pl.mainClub)}` : ''}${st ? ` · ${st.gp} games, ${st.g} goals, ${st.a} assists, avg rating ${st.r.toFixed(1)}` : ''}`,
    image: pl.mainClub ? ogCrest(pl.mainClub) : undefined }));
}
const pRows = [...visiblePlayers]
  .sort((a, b) => (b.isHome - a.isHome) || num(b.career?.gamesPlayed) - num(a.career?.gamesPlayed))
  .map((pl) => `<tr>${td(`${pl.mainClub ? crest(pl.mainClub, 20, '../') : ''} <a href="${pl.key}.html">${esc(pl.name)}</a>${pl.isHome ? ' <span class="tag home">NOREX</span>' : ''}`, false, pl.name.toLowerCase())}${td(pl.clubIds.map((c) => esc(clubName(c))).join(', '))}${td(esc(pl.pos || '—'))}${td(pl.ovr || '–', true, pl.ovr)}${td(esc(pl.career?.gamesPlayed ?? '–'), true, num(pl.career?.gamesPlayed))}${td(esc(pl.career?.goals ?? '–'), true, num(pl.career?.goals))}${td(esc(pl.career?.assists ?? '–'), true, num(pl.career?.assists))}${td(pl.career ? ratingPill(num(pl.career.ratingAve)) : '–', true, num(pl.career?.ratingAve))}${td(spark([...pl.apps].reverse().slice(-10).map((x) => x.rating), { color: 'var(--red)' }))}</tr>`);
write('players/index.html', page({ title: `Players – ${config.siteTitle}`, base: '../', active: 'players', body: `
${pageHead(`Players <small>${visiblePlayers.length}</small>`, "Everyone in a tracked club or seen in an archived match. Career numbers are EA's totals across every club.", '../', false)}
${table('players', ['Player', 'Clubs', 'Pos', '#OVR', '#Career GP', '#Goals', '#Assists', '#Rating', 'Form'], pRows, { filter: 'Search players or clubs…' })}` }));

// Squad Hub (members only – rendered by app.js after Discord login)
if (MEMBER_API) write('members.html', page({ title: `Squad Hub – ${config.siteTitle}`, base: '', active: '', body: `
${pageHead('Squad Hub', 'Members only. Log in with Discord – you must be in the NOREX server.', '')}
<div id="hub" class="hub"><p class="muted">Loading…</p></div>` }));
// Member profile page (P2.1) – member.html?u=<discord id>, drawn by assets/profile.js
if (MEMBER_API) write('member.html', page({ title: `Member – ${config.siteTitle}`, base: '', active: '', description: `A NOREX UNITED squad member's profile.`, body: `
<div id="member-page" class="member-page"><p class="muted">Loading…</p></div>` }));

// Trials / application page
const need = RECRUIT.positions ?? [];
const haveCount = (label) => homeSquad.filter((p) => p.pos === label).length;
write('apply.html', page({ title: `Apply – ${config.siteTitle}`, base: '', active: '', description: `Apply for a trial with ${config.siteTitle}.`, body: `
<section class="hero apply-hero reveal"><div class="hero-crest"><img class="crest big-crest" src="assets/crest.png" alt=""></div><div class="hero-text">
<p class="kicker">Recruitment</p><h1>Earn the crown</h1>${STARS}
<p class="motto">${esc(RECRUIT.headline ?? 'Trials are by application only')}</p>
<div class="chips"><span class="chip ${RECRUIT.open ? 'strong' : ''}">${RECRUIT.open ? 'Applications open' : 'Applications closed'}</span><span class="chip">Division ${esc(clubs.get(homeId)?.leaderboard?.currentDivision ?? '–')}</span><span class="chip">${homeSquad.length} in the squad</span></div>
</div></section>
<div class="grid2 reveal">
${card('What we look for', `<ul class="checks">${(RECRUIT.requirements ?? []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`)}
${card('Positions', `<div class="pos-grid">${need.map((p) => `<div class="pos-tile"><b>${esc(p)}</b><small>${haveCount(p)} in squad</small></div>`).join('')}</div>`)}
</div>
${section('How to apply', `<ol class="steps">
<li><b>Check your stats.</b> Find yourself on the <a href="players/index.html">Players page</a> if you've played us – we look at ratings, not just goals.</li>
<li><b>Apply on Discord.</b> ${DISCORD ? 'The button below opens our server’s application form: EA ID, position and availability.' : 'Ask one of the managers listed on this page.'}<span data-flag="trials" hidden> Or use the quick form on this page – no Discord server invite needed to send it.</span></li>
<li><b>Get approved.</b> A manager reviews every application. Only managers can invite you to the server and to a trial session.</li>
</ol>
${RECRUIT.open && DISCORD ? `<p><a class="btn discord big" href="${esc(DISCORD)}" target="_blank" rel="noopener">${DISCORD_SVG} Apply on Discord</a></p><p class="muted small">You'll need a Discord account. Nobody joins the server without a manager's approval.</p>` : ''}`)}
${MEMBER_API ? `<div data-trials-page>
<div data-flag="trials" hidden>${RECRUIT.open ? section('Quick application', '<div id="trial-form"></div>', { sub: 'EA ID, positions, platform, clips – a manager replies on Discord', id: 'apply-form' }) : ''}
${section('Talk to a manager', '<div id="trial-contacts"></div>', { sub: 'Only managers can invite you – the owner and managers below', id: 'managers' })}</div></div>` : ''}` }));

const linked = Object.values(state.clubs).filter((c) => c.tier === 'linked' || c.tier === 'manual');
const askManager = DISCORD
  ? `<a class="btn discord" href="${esc(DISCORD)}" target="_blank" rel="noopener">${DISCORD_SVG} Ask a manager on Discord</a>`
  : 'Ask a club manager.';
write('about.html', page({ title: `About – ${config.siteTitle}`, base: '', active: '', body: `${pageHead('About this site', '', '')}
<div class="prose card">
${RECRUIT.open ? `<p class="about-links"><a class="btn" href="apply.html">👑 Apply to join</a></p>` : ''}
<p>This site updates itself about every 10 minutes from EA SPORTS FC's public Pro Clubs data. Nobody enters results by hand.</p>
<h2>What it tracks</h2>
<ul><li><b>${esc(config.siteTitle)}</b>: every match, box score, squad and career stat.</li>
<li><b>Linked clubs</b> (${linked.length}): other clubs our players also play for, found automatically by scanning squads.</li>
<li><b>Opponents</b>: every club we play gets a page with its squad and record.</li>
<li><b>Players</b>: a card and profile for anyone who appears in any of the above.</li></ul>
<h2 id="requests">Play for another club? Don't want to be listed?</h2>
<p>If a club of yours isn't showing up yet, we can add it – its matches get archived from then on. And if you'd rather not appear on this site, we hide your gamertag from every page on the next update.</p>
<div id="request-forms" data-flag="requests" hidden></div>
<p>${askManager}</p>
<p class="muted">Tracking ${clubs.size} clubs · ${visiblePlayers.length} players · ${matches.length} archived matches · ${Object.keys(state.scanned ?? {}).length} clubs scanned.</p>
</div>` }));

// FC 27 updates log + game data (P1.7 / PB.1) – lives in updates-page.mjs.
buildUpdates({ write, page, pageHead, section, esc, emptyState, config });
// Archetype builder sandbox (PB.2) – builder-page.mjs, client in web/builder.js.
buildBuilder({ write, page, pageHead, esc, emptyState, config });
// Pro Builds board (PB.3) – probuilds-page.mjs, client in web/probuilds.js + web/buildcard.js.
buildProBuilds({ write, page, pageHead, esc, emptyState, config });
// Club docs (P5.2) + Play Style (P5.1) – docs-page.mjs, client in web/docs.js + web/docs-md.js.
if (MEMBER_API) buildDocs({ write, page, pageHead, esc, emptyState, config });
// Club feed (P6.1) – feed-page.mjs, client in web/feed.js (+ web/docs-md.js for links and embeds).
if (MEMBER_API) buildFeed({ write, page, pageHead, emptyState, config });
if (MEMBER_API) buildHub({ write, page, pageHead, emptyState, config });
if (MEMBER_API) buildMessages({ write, page, pageHead, emptyState, config });
if (MEMBER_API) buildTactics({ write, page, pageHead, emptyState, config });
// Burner-club tracker: data/burners/ (kept apart from the NOREX archive) → burners.html + the bot's compact feed.
const burnerList = loadBurners(DATA, readJson);
const burnerHomeNames = new Set((clubs.get(homeId)?.members ?? []).map((m) => String(m.name).toLowerCase()).filter((n) => n && !hidden.has(n)));
buildBurners({ write, page, pageHead, section, emptyState, esc, table, td, counter, ratingPill, resPill, config, homeNames: burnerHomeNames, playerLink: (n) => pLinkByName(n, '') }, burnerList);
write('api/burners.json', JSON.stringify(burnersFeed(burnerList)));

// JSON API for search, the compare tool and the Discord bot.
write('api/players.json', JSON.stringify(visiblePlayers.map((pl) => ({
  k: pl.key, n: pl.name, home: pl.isHome || pl.playedForHome, pos: pl.pos || '—', ovr: pl.ovr, tag: pl.tag,
  c: pl.clubIds.map((c) => clubName(c)), cid: pl.mainClub, crest: pl.mainClub ? crestSrc(pl.mainClub, SITE) : null,
  ...(pl.main && num(pl.main.gamesPlayed)
    ? { s: { gp: num(pl.main.gamesPlayed), g: num(pl.main.goals), a: num(pl.main.assists), r: num(pl.main.ratingAve), m: num(pl.main.manOfTheMatch), p: num(pl.main.passSuccessRate), t: num(pl.main.tackleSuccessRate), w: num(pl.main.winRate) }, src: 'club' }
    : pl.arch ? { s: pl.arch, src: 'archive' } : { s: null, src: null }),
  sc: pl.mainClub ? clubName(pl.mainClub) : null,
  car: pl.career ? { gp: num(pl.career.gamesPlayed), g: num(pl.career.goals), a: num(pl.career.assists), r: num(pl.career.ratingAve), m: num(pl.career.manOfTheMatch) } : null,
  rad: pl.radar, raw: pl.radarRaw, tr: [...pl.apps].reverse().slice(-15).map((x) => x.rating),
}))));
// Personal match log for the Squad Hub dashboard (P2.6) and achievements (P2.3 / P4.3): our players' League
// matches for NOREX, oldest → newest, compact rows (see cols). grp = position group from EA's app position.
// dri/sa = dribbles / second assists (P1.8), null for games archived before they were kept.
const SQUAD_COLS = ['ts', 'res', 'g', 'a', 'r', 'motm', 'shots', 'pass', 'passAtt', 'tkl', 'tklAtt', 'saves', 'gf', 'ga', 'grp', 'dri', 'sa'];
const GRP = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD', attacker: 'FWD' };
write('api/squad.json', JSON.stringify({
  cols: SQUAD_COLS,
  players: Object.fromEntries(visiblePlayers.filter((pl) => pl.isHome || pl.playedForHome).map((pl) => [pl.key, pl.apps.filter((x) => x.clubId === homeId).slice(0, 300).reverse()
    .map((x) => [x.ts, x.res, x.goals, x.assists, x.rating, x.mom ? 1 : 0, x.shots, x.passes, x.passAtt, x.tackles, x.tackleAtt, x.saves, x.gf, x.ga, GRP[x.pos] ?? '', x.dribbles, x.sa])]).filter(([, l]) => l.length)),
}));
write('api/clubs.json', JSON.stringify([...clubs.values()].map((c) => ({ id: c.id, n: clubName(c.id), t: state.clubs[c.id]?.tier ?? 'archived', ...(clubKit(c.id)?.crestAssetId ? { cr: crestSrc(c.id, SITE) } : {}) }))));
// P9.2: global rankings – EA's world top 100 with Norex's rank, the cut-off and per-club rates (scripts/rankings.mjs)
write('api/rankings.json', JSON.stringify(buildRankings(readJson(path.join(DATA, 'world.json'), null), homeId, num(homeC?.overall?.skillRating) || null)));
// P11.16 /history: League-only head-to-head record per opponent, same numbers as the Stats Centre's own
// "Head to head" table – exposed here so the Discord command doesn't need to scrape the HTML.
write('api/h2h.json', JSON.stringify([...h2h.values()].map((e) => ({
  o: e.o, n: clubName(e.o), p: e.p, w: e.w, d: e.d, l: e.l, gf: e.gf, ga: e.ga,
  lastId: e.last.matchId, lastRes: result(e.last.clubs[homeId]), lastScore: scoreOf(e.last),
})).sort((a, b) => b.p - a.p)));
const ho = { ...(homeC?.overall ?? {}), ...(homeC?.leaderboard ?? {}) };
write('api/club.json', JSON.stringify({
  name: clubName(homeId), url: SITE, crest: `${SITE}assets/crest.png`, color: RED, division: ho.currentDivision, skill: ho.skillRating,
  gp: num(ho.gamesPlayed), w: num(ho.wins), d: num(ho.ties), l: num(ho.losses), gf: num(ho.goals), ga: num(ho.goalsAgainst), streak: num(ho.wstreak),
  form: homeMatches.slice(0, 10).map((m) => result(m.clubs[homeId])),
  matches: homeMatches.slice(0, 25).map((m) => {
    const o = oppOf(m, homeId);
    const l = Object.values(m.players?.[homeId] || {});
    return { id: m.matchId, ts: m.timestamp, opp: clubName(o), oppCrest: crestSrc(o, SITE), gf: num(m.clubs[homeId].goals), ga: num(m.clubs[o].goals), res: result(m.clubs[homeId]),
      scorers: l.filter((p) => num(p.goals)).map((p) => ({ n: p.playername, g: num(p.goals) })), motm: l.find((p) => p.mom === '1')?.playername ?? null, url: `${SITE}matches/${m.matchId}.html`,
      ps: Object.entries(m.players?.[homeId] || {}).filter(([pid]) => !players.get(pid)?.hidden)
      // ps: per-player line for the bot's "Show my match" card (P7.2) – rating, goals, assists, passes, tackles, shots, saves.
      .map(([pid, p]) => ({ k: pid, n: p.playername, r: num(p.rating), g: num(p.goals), a: num(p.assists), pm: num(p.passesmade), pa: num(p.passattempts),
        tm: num(p.tacklesmade), ta: num(p.tackleattempts), sh: num(p.shots), sv: num(p.saves), pos: p.pos ?? '', mom: p.mom === '1' ? 1 : 0 })) };
  }),
  radarAxes: RADAR.map((a) => a.label),
  apply: RECRUIT.open ? `${SITE}apply.html` : null,
}));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Built ${clubs.size} clubs, ${visiblePlayers.length} players, ${matches.length} matches → site/`);
