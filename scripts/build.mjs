// Turns data/ into a static website in site/. No dependencies, no framework.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA, readJson, loadConfig, num } from './lib.mjs';
import { lineChart, goalBars, donut, radar, spark } from './charts.mjs';

const OUT = path.join(ROOT, 'site');
const config = loadConfig();
const homeId = String(config.homeClubId);
const brand = config.brand ?? {};
const state = readJson(path.join(DATA, 'state.json'), { clubs: {} });
const hidden = new Set((config.hiddenPlayers || []).map((h) => String(h).toLowerCase()));
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
const ratingClass = (r) => (r >= 9 ? 'r-elite' : r >= 8 ? 'r-great' : r >= 7 ? 'r-good' : r >= 6 ? 'r-mid' : 'r-low');
const dateStr = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);
const niceDate = (ts) => new Date(ts * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

// ---------- load ----------
const clubs = new Map(readDir(path.join(DATA, 'clubs')).map((c) => [String(c.id), c]));
const matches = readDir(path.join(DATA, 'matches')).sort((a, b) => b.timestamp - a.timestamp);
function matchClubName(id) {
  for (const m of matches) if (m.clubs[id]?.name) return m.clubs[id].name;
  return null;
}
const clubName = (id) => clubs.get(String(id))?.info?.name ?? state.clubs[id]?.name ?? matchClubName(id) ?? `Club ${id}`;
const clubKit = (id) => clubs.get(String(id))?.info?.customKit ?? matches.find((m) => m.clubs[id]?.kit)?.clubs[id].kit ?? null;
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
    players.set(key, { key, id: /^\d+$/.test(key) ? key : null, names: new Set(), name: null, clubStats: {}, career: null, apps: [] });
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
      pl.apps.push({
        matchId: m.matchId, ts: m.timestamp, clubId, oppId, res: result(m.clubs[clubId]),
        gf: num(m.clubs[clubId]?.goals), ga: num(m.clubs[oppId]?.goals),
        goals: num(p.goals), assists: num(p.assists), rating: num(p.rating), mom: num(p.mom), pos: p.pos,
        shots: num(p.shots), passes: num(p.passesmade), passAtt: num(p.passattempts),
        tackles: num(p.tacklesmade), tackleAtt: num(p.tackleattempts), saves: num(p.saves), red: num(p.redcards),
      });
    }
  }
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
for (const pl of players.values()) {
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
const SILHOUETTE = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="33" r="19"/><path d="M10 100c2-25 19-37 40-37s38 12 40 37z"/></svg>`;
const STARS = '<span class="stars" aria-hidden="true">★★★★★</span>';

function futCard(pl, base, { big = false } = {}) {
  const s = pl.main ?? {};
  const gp = num(s.gamesPlayed);
  const stats = [
    ['GLS', s.goals ?? '–'], ['AST', s.assists ?? '–'], ['RAT', s.ratingAve ?? '–'],
    ['PAS', s.passSuccessRate !== undefined ? s.passSuccessRate + '%' : '–'], ['TKL', s.tackleSuccessRate !== undefined ? s.tackleSuccessRate + '%' : '–'], ['GP', gp || '–'],
  ];
  return `<a class="fut tier-${tier(pl.ovr)}${big ? ' big' : ''}" href="${pUrl(pl, base)}" data-pos="${pl.group}">
<span class="fut-shine"></span>
<span class="fut-top"><b class="fut-ovr">${pl.ovr || '–'}</b><span class="fut-pos">${esc(pl.pos || '—')}</span>${pl.mainClub ? crest(pl.mainClub, 28, base, 'fut-crest') : ''}</span>
<span class="fut-face">${SILHOUETTE}</span>
<span class="fut-name">${esc(pl.name)}</span>
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
const MODES = [['league', '🏆 League'], ['rush', '⚡ Rush']];
const modes = (league, rush, label = '') => (MEMBER_API ? `<div class="modes" data-modes>
<div class="mode-bar reveal"><div class="nx-tabs mode-switch" role="tablist" aria-label="League or Rush">${MODES.map(([k, l], i) => `<button type="button" role="tab" data-key="${k}" aria-selected="${!i}" tabindex="${i ? -1 : 0}">${l}</button>`).join('')}</div>${label ? `<small class="muted">${label}</small>` : ''}</div>
<div data-mode="league">${league}</div><div data-mode="rush" data-rush="${esc(rush)}" hidden></div></div>` : league);

function barList(rows, { fmt = (v) => v, base }) {
  const max = Math.max(...rows.map((r) => r.v), 0.0001);
  return `<ol class="barlist">${rows.map((r, i) => `<li style="--w:${Math.max(4, (r.v / max) * 100)}%"><span class="bl-rank">${i + 1}</span><span class="bl-name">${r.pl ? pLink(r.pl.key, base) : esc(r.name)}</span><b>${fmt(r.v)}</b></li>`).join('') || '<li class="muted bl-empty">📭 Nothing to rank yet – fills in as matches are archived.</li>'}</ol>`;
}

function formStrip(ms, id, base) {
  return ms.slice(0, 10).reverse().map((m) => `<a href="${base}matches/${m.matchId}.html" data-tip="${esc(`${m.clubs[id].goals}–${m.clubs[oppOf(m, id)].goals} vs ${clubName(oppOf(m, id))}`)}">${resPill(result(m.clubs[id]))}</a>`).join('');
}

function fixture(m, id, base) {
  const o = oppOf(m, id), us = m.clubs[id], them = m.clubs[o];
  const scorers = Object.values(m.players?.[id] || {}).filter((p) => num(p.goals) > 0).map((p) => `${esc(p.playername)}${num(p.goals) > 1 ? ` ×${p.goals}` : ''}`).join(', ');
  return `<a class="fixture ${result(us)}" href="${base}matches/${m.matchId}.html">
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
  return `<div class="poster res-${res}" id="poster-${m.matchId}" data-home="${esc(clubName(h))}" data-away="${esc(clubName(a))}" data-score="${esc(m.clubs[h].goals)}-${esc(m.clubs[a].goals)}" data-date="${esc(niceDate(m.timestamp))}" data-scorers="${esc(scorers(h).join(', '))}" data-ascorers="${esc(scorers(a).join(', '))}" data-motm="${esc(motm ? `${motm.playername} (${num(motm.rating).toFixed(1)})` : '')}" data-crest="${esc(posterCrest(h, base))}" data-acrest="${esc(posterCrest(a, base))}" data-res="${res}" data-type="${m.matchType === 'playoffMatch' ? 'Playoff' : 'League'}">
<div class="po-label"><span>${m.matchType === 'playoffMatch' ? 'Playoff' : 'League'} · ${niceDate(m.timestamp)}</span><span class="po-res">${res === 'W' ? 'Victory' : res === 'L' ? 'Defeat' : 'Draw'}</span></div>
<div class="po-main">
<div class="po-team">${crest(h, 110, base, 'po-crest')}<b>${clubLink(h, base)}</b><small>${scorers(h).map((s) => `⚽ ${esc(s)}`).join('<br>')}</small></div>
<div class="po-score">${link ? `<a href="${base}matches/${m.matchId}.html">` : ''}${esc(m.clubs[h].goals)}<i>:</i>${esc(m.clubs[a].goals)}${link ? '</a>' : ''}</div>
<div class="po-team">${crest(a, 110, base, 'po-crest')}<b>${clubLink(a, base)}</b><small>${scorers(a).map((s) => `⚽ ${esc(s)}`).join('<br>')}</small></div>
</div>
${motm ? `<div class="po-motm">⭐ Man of the match <b>${pLinkByName(motm.playername, base)}</b> ${ratingPill(num(motm.rating))}</div>` : ''}
</div>`;
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
const NAV = [
  ['home', 'index.html', 'Club'], ['squad', 'squad.html', 'Squad'], ['matches', 'matches/index.html', 'Matches'],
  ['stats', 'stats.html', 'Stats'], ['compare', 'compare.html', 'Compare'], ['players', 'players/index.html', 'Players'],
  ['clubs', 'clubs/index.html', 'Clubs'],
];

function page({ title, base, active, body, description, image }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description ?? `${config.siteTitle} – Pro Clubs stats, results and player cards, updated automatically.`)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description ?? `${config.siteTitle} – Pro Clubs stats, results and player cards.`)}"><meta property="og:site_name" content="${esc(config.siteTitle)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(image ?? `${SITE}assets/crest.png`)}"><meta name="twitter:card" content="summary"><meta name="theme-color" content="${INK}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/style.css"><style>:root{--red:${RED};--ink:${INK};--accent:${RED}}</style>
<link rel="icon" href="${base}assets/favicon.png">
</head><body data-base="${base}"${MEMBER_API ? ` data-api="${esc(MEMBER_API)}"` : ''} data-features="${esc(FEATURES)}">
<div class="bg" aria-hidden="true"></div>
<header class="top"><div class="wrap bar">
<a class="brand" href="${base}index.html"><img src="${base}assets/crest.png" height="44" alt=""><span><b>NOREX</b><small>UNITED</small></span></a>
<button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false"><i></i><i></i><i></i></button>
<nav>${NAV.map(([k, href, label]) => `<a href="${base}${href}"${k === active ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
<button class="search-btn" type="button" aria-label="Search players and clubs"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="m16 16 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><kbd>/</kbd></button>${RECRUIT.open ? `<a class="discord-btn" href="${base}apply.html">${DISCORD_SVG}<span>Apply</span></a>` : ''}${MEMBER_API ? '<span class="auth-slot"></span>' : ''}</nav></div></header>
${CHANNELS.length && MEMBER_API ? '<div class="live-bar" hidden></div>' : ''}<main class="wrap">${body}</main>
<footer class="foot"><div class="wrap foot-in"><img src="${base}assets/crest.png" height="70" alt="">
<div><b>${esc(config.siteTitle)}</b>${brand.founded ? ` · Est. ${esc(brand.founded)}` : ''}${brand.motto ? `<br><i>${esc(brand.motto)}</i>` : ''}<div class="foot-links">${RECRUIT.open ? `<a href="${base}apply.html">${DISCORD_SVG} Apply to join</a>` : ''}${CHANNELS.map(([k, label, svg]) => `<a class="foot-${k}" href="${esc(STREAMS[k])}" target="_blank" rel="noopener">${svg} ${label}</a>`).join('')}</div><small>Data from EA SPORTS FC Pro Clubs, updated automatically · last update <time class="ago" datetime="${builtAt}">${builtAt.slice(0, 16).replace('T', ' ')} UTC</time> · <a href="${base}about.html">About</a> · Not affiliated with EA.</small></div></div></footer>
<div class="palette" hidden><div class="pal-box"><input type="search" placeholder="Search players and clubs…" aria-label="Search"><ul></ul><p class="muted small">↑↓ to move · Enter to open · Esc to close</p></div></div>
<div class="tip" hidden></div>
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

  return `
<section class="hero club-hero reveal">
<div class="hero-crest">${crest(id, isHome ? 260 : 180, base, 'big-crest')}</div>
<div class="hero-text">
<p class="kicker">${isHome ? `${brand.founded ? `Est. ${esc(brand.founded)} · ` : ''}Official club hub` : esc(t ?? 'Club')}${state.clubs[id]?.linkedPlayers ? ` · shares ${state.clubs[id].linkedPlayers.map((n) => pLinkByName(n, base)).join(', ')}` : ''}</p>
<h1>${esc(clubName(id))}</h1>
${isHome ? `${STARS}${brand.motto ? `<p class="motto">${esc(brand.motto)}</p>` : ''}` : ''}
<div class="chips">${o.currentDivision ? `<span class="chip strong">Division ${esc(o.currentDivision)}</span>` : ''}${o.skillRating ? `<span class="chip">Skill rating ${esc(o.skillRating)}</span>` : ''}${num(o.promotions) ? `<span class="chip">⬆ ${esc(o.promotions)} promotions</span>` : ''}${c?.info?.customKit?.stadName ? `<span class="chip">🏟 ${esc(c.info.customKit.stadName)}</span>` : ''}${num(o.wstreak) > 1 ? `<span class="chip hot">🔥 ${esc(o.wstreak)} win streak</span>` : ''}</div>
${ms.length ? `<div class="form big"><span class="form-label">Form</span>${formStrip(ms, id, base)}</div>` : ''}
${isHome && RECRUIT.open ? `<p><a class="btn" href="${base}apply.html">👑 Apply for a trial</a></p>` : ''}
</div>
${isHome && (mvp || scorer) ? `<div class="hero-spot">${mvp ? `<a class="spot" href="${pUrl(mvp.pl, base)}"><small>Top rated</small><b>${esc(mvp.pl.name)}</b>${ratingPill(mvp.v)}</a>` : ''}${scorer ? `<a class="spot" href="${pUrl(scorer.pl, base)}"><small>Top scorer</small><b>${esc(scorer.pl.name)}</b><span class="rp r-great">${scorer.v} ⚽</span></a>` : ''}</div>` : ''}
</section>
<section class="stats reveal">
${[['Played', gp, 'played'], ['Won', o.wins, 'won'], ['Drawn', o.ties, 'drawn'], ['Lost', o.losses, 'lost'], ['Win rate', pct(num(o.wins), gp), 'winrate', '%'], ['Goals', o.goals, 'goals'], ['Conceded', o.goalsAgainst, 'conceded'], ['Goal diff', num(o.goals) - num(o.goalsAgainst), 'played']]
    .map(([label, v, f, suffix = '']) => counter(label, v, { suffix, href: ms.length ? drillHref(id, base, f) : undefined })).join('')}
${ms.length ? counter('Clean sheets', ms.filter((m) => !num(m.clubs[oppOf(m, id)].goals)).length, { href: drillHref(id, base, 'cleansheets') }) : ''}
</section>
${ms.length ? `<p class="small muted drill-hint">👆 Tap a number to see the matches behind it.</p>` : ''}
${ms.length ? `<div class="grid2 reveal">${card('Latest result', poster(ms[0], base) + `<button class="btn dl-poster" type="button" data-for="poster-${ms[0].matchId}">⬇ Download result graphic</button>`, 'flush')}${sessions[0] ? card('Last session', sessionCard(sessions[0], base, id)) : ''}</div>` : ''}
${section('Performance', `<div class="grid-charts">
${card('Goals per match', !recent.length ? emptyState('⚽', 'No goals to chart yet', 'Fills in after the first archived match.') : goalBars(recent.map((m) => ({ for: num(m.clubs[id].goals), against: num(m.clubs[oppOf(m, id)].goals), res: result(m.clubs[id]), tip: `${dateStr(m.timestamp)} · ${m.clubs[id].goals}–${m.clubs[oppOf(m, id)].goals} vs ${clubName(oppOf(m, id))}` }))))}
${card('Season split', `<div class="donut-wrap">${donut([{ label: 'Won', value: num(o.wins), color: 'var(--win)' }, { label: 'Drawn', value: num(o.ties), color: 'var(--draw)' }, { label: 'Lost', value: num(o.losses), color: 'var(--loss)' }], { center: `${pct(num(o.wins), gp)}%`, sub: 'win rate' })}
<ul class="legend"><li><i style="background:var(--win)"></i>Won <b>${esc(o.wins ?? 0)}</b></li><li><i style="background:var(--draw)"></i>Drawn <b>${esc(o.ties ?? 0)}</b></li><li><i style="background:var(--loss)"></i>Lost <b>${esc(o.losses ?? 0)}</b></li></ul></div>`)}
${card('Team DNA', `<ul class="dna">${dna.map(([k, v, tip]) => `<li data-tip="${esc(tip)}"><span>${k}</span><div class="meter"><i style="--w:${Math.round(v)}%"></i></div><b>${Math.round(v)}</b></li>`).join('')}</ul>`)}
${card('Average team rating', teamRatings.length > 1 ? lineChart(teamRatings, { min: 5, max: 10, ref: 7, id: `tr${id}` }) : emptyState('📈', 'Trend needs two matches', 'The rating line appears once two matches are archived.'))}
</div>`)}
${members.length ? section('The squad', `<div class="card-rail">${[...members].sort((a, b) => num(b.clubStats[id]?.gamesPlayed) - num(a.clubStats[id]?.gamesPlayed)).slice(0, 14).map((p) => futCard(p, base)).join('')}</div>${isHome ? `<p><a class="btn" href="${base}squad.html">Full squad →</a></p>` : ''}`, { sub: `${members.length} players` }) : ''}
${members.length ? section('Club leaders', `<div class="grid4">
${card('Top scorers', barList(top((s) => num(s.goals)), { base }))}${card('Assists', barList(top((s) => num(s.assists)), { base }))}
${card('Avg rating', barList(top((s) => (num(s.gamesPlayed) >= 2 ? num(s.ratingAve) : 0)), { base, fmt: (v) => v.toFixed(1) }))}${card('Man of the match', barList(top((s) => num(s.manOfTheMatch)), { base }))}
</div>`) : ''}
${isHome && CHANNELS.length ? section('📺 Watch NOREX', `<div class="live-embed" hidden></div><div class="watch-grid">${CHANNELS.map(([k, label, svg, sub]) => `<a class="watch-card ${k}" href="${esc(STREAMS[k])}" target="_blank" rel="noopener"><span class="wc-ic">${svg}</span><span><b>${label}</b><small>${sub}</small></span><span class="wc-go">Follow →</span></a>`).join('')}</div>`, { sub: 'streams & highlights', id: 'watch' }) : ''}
${section('Recent results', `<div class="fixtures">${ms.slice(0, 10).map((m) => fixture(m, id, base)).join('') || emptyState('🗂️', 'No matches archived yet', 'EA only shares the last five games, so the archive starts on the first update after a club is tracked. Results land here automatically.')}</div>${isHome && ms.length > 10 ? `<p><a class="btn" href="${base}matches/index.html">All ${ms.length} matches →</a></p>` : ''}`)}
${!isHome && members.length ? section('Squad table', squadTable(members, id, base, `squad-${id}`)) : ''}`;
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
      `<tr>${dateCell(x.m.timestamp)}${td(resPill(x.res))}${td(`${crest(x.o, 22, base)} ${clubLink(x.o, base)}`, false, clubName(x.o).toLowerCase())}${td(scoreLink(x), false, x.gf * 100 - x.ga)}${td((x.margin > 0 ? '+' : '') + x.margin, true, x.margin)}${td(scorerTxt(x))}${td(x.motm ? `${pLinkByName(x.motm.playername, base)}${x.motmOurs ? '' : ' <small class="muted">opp</small>'}` : '–')}${td(ratingPill(x.rating), true, x.rating.toFixed(2))}</tr>`), { filter: 'Search opponents or scorers…' })
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
  const league = `<div class="tabs chipset drill-tabs" data-tabs data-drill>${DRILL.map(([k, l], i) => `<button class="chip${i ? '' : ' on'}" type="button" data-tab="f-${k}">${l} <small>${counts[k]}</small></button>`).join('')}</div>
${DRILL.map(([k], i) => `<div class="tab-panel drill-panel" id="f-${k}"${i ? ' hidden' : ''}>${P[k]}</div>`).join('')}`;
  const eaGp = num(clubs.get(id)?.overall?.gamesPlayed);
  return `<section class="page-head reveal drill-head">${crest(id, 84, base)}<div><p class="kicker"><a href="${clubHref(id, base) ?? '#'}">← ${esc(clubName(id))}</a></p><h1>Match drill-down</h1>
<p class="muted">Every stat card, match by match. Built from ${M.length} archived match${M.length === 1 ? '' : 'es'}${eaGp > M.length ? ` (EA's club totals count ${eaGp} – EA only shares the last few, so older ones aren't here)` : ''}.</p></div></section>
<div class="reveal">${id === homeId ? modes(league, 'results', 'League & playoffs from EA · Rush logged by members') : league}</div>`;
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
<div class="chips"><span class="chip strong">${esc(pl.pos || '—')}</span>${pl.ovr ? `<span class="chip">OVR ${pl.ovr}</span>` : ''}${s.proHeight ? `<span class="chip">${esc(s.proHeight)} cm</span>` : ''}${otherNames.length ? `<span class="chip">aka ${otherNames.map(esc).join(', ')}</span>` : ''}</div>
<div class="club-chips">${pl.clubIds.map((c) => `<a class="club-chip" href="${clubHref(c, base) ?? '#'}">${crest(c, 22, base)}${esc(clubName(c))}</a>`).join('')}</div>
${a.length ? `<div class="form big"><span class="form-label">Form</span>${a.slice(0, 10).reverse().map((x) => `<a href="${base}matches/${x.matchId}.html" data-tip="${esc(`${x.gf}–${x.ga} vs ${clubName(x.oppId)} · ${x.rating.toFixed(1)}`)}">${resPill(x.res)}</a>`).join('')}</div>` : ''}
<p><a class="btn" href="${base}compare.html?a=${encodeURIComponent(pl.key)}">⚖ Compare with…</a></p>
</div></section>
${(pl.isHome || pl.playedForHome) ? modes(league(), `player:${pl.key}`) : league()}`;
  function league() {
    return `${car ? section('Career', `<section class="stats">${counter('Games', car.gamesPlayed)}${counter('Goals', car.goals)}${counter('Assists', car.assists)}${counter('Avg rating', car.ratingAve, { dec: 1 })}${counter('MOTM', car.manOfTheMatch)}${counter('G+A per game', num(car.gamesPlayed) ? (num(car.goals) + num(car.assists)) / num(car.gamesPlayed) : 0, { dec: 2 })}</section>`, { sub: 'every club, from EA' }) : ''}
<div class="grid2 reveal">
${pl.radar ? card('Player profile', `${radar(RADAR.map((ax, i) => ({ label: ax.label, raw: [pl.radarRaw[i]] })), [{ values: pl.radar, color: 'var(--red)', name: pl.name }])}<p class="muted small">Percentile vs ${pool.length} tracked players with 3+ games${pl.isHome ? ' (NOREX stats)' : ''}. Hover a point for the real number.</p>`) : ''}
${card('Match ratings', trend.length ? lineChart(trend, { min: 4, max: 10, ref: 7, id: 'pt' }) + (best ? `<p class="small">Best: ${ratingPill(best.rating)} vs ${esc(clubName(best.oppId))} (${dateStr(best.ts)})</p>` : '') : emptyState('📈', 'No match ratings yet', 'Ratings appear here once this player features in an archived match.'))}
</div>
${Object.keys(pl.clubStats).length ? section('By club', table('byclub', ['Club', 'Pos', '#OVR', '#GP', '#Goals', '#Assists', '#Rating', '#MOTM', '#Win %', '#Pass %', '#Tackle %'], Object.entries(pl.clubStats).map(([cid, cs]) =>
    `<tr>${td(`${crest(cid, 22, base)} ${clubLink(cid, base)}`)}${td(posOf(cs) || '—')}${td(esc(cs.proOverall ?? '–'), true)}${td(cs.gamesPlayed, true)}${td(cs.goals, true)}${td(cs.assists, true)}${td(ratingPill(num(cs.ratingAve)), true, cs.ratingAve)}${td(cs.manOfTheMatch, true)}${td(cs.winRate + '%', true, cs.winRate)}${td(cs.passSuccessRate + '%', true, cs.passSuccessRate)}${td(cs.tackleSuccessRate + '%', true, cs.tackleSuccessRate)}</tr>`))) : ''}
${a.length ? section('Match log', `<section class="stats">${counter('Apps', a.length)}${counter('Record', 0, { text: `${w}-${d}-${l}` })}${counter('Goals', tot('goals'))}${counter('Assists', tot('assists'))}${counter('Avg rating', avg(a.map((x) => x.rating)), { dec: 1 })}${counter('MOTM', tot('mom'))}${counter('Pass %', pct(tot('passes'), tot('passAtt')), { suffix: '%' })}${counter('Tackle %', pct(tot('tackles'), tot('tackleAtt')), { suffix: '%' })}</section>
${table('log', ['Date', 'Res', 'Score', 'For', 'Against', 'Pos', '#Rating', '#G', '#A', '#Shots', '#Pass', '#Tkl', '#Saves'], a.map((x) =>
    `<tr>${dateCell(x.ts)}${td(resPill(x.res))}${td(`<a href="${base}matches/${x.matchId}.html">${x.gf}–${x.ga}</a>`)}${td(`${crest(x.clubId, 18, base)} ${clubLink(x.clubId, base)}`)}${td(`${crest(x.oppId, 18, base)} ${clubLink(x.oppId, base)}`)}${td(posAbbr(x.pos))}${td(ratingPill(x.rating) + (x.mom ? ' ⭐' : ''), true, x.rating)}${td(x.goals, true)}${td(x.assists, true)}${td(x.shots, true)}${td(`${x.passes}/${x.passAtt}`, true, x.passes)}${td(`${x.tackles}/${x.tackleAtt}`, true, x.tackles)}${td(x.saves, true)}</tr>`))}`, { sub: `${a.length} archived` }) : ''}`;
  }
}

// ---------- match page ----------
function matchBody(m, base) {
  const [h, aw] = Object.keys(m.clubs).sort((a, b) => (a === homeId ? -1 : b === homeId ? 1 : 0));
  const list = (cid) => Object.entries(m.players?.[cid] || {}).map(([pid, p]) => ({ pid, ...p }));
  const team = (cid) => {
    const l = list(cid);
    return {
      goals: num(m.clubs[cid].goals), shots: sum(l, (p) => num(p.shots)), passes: sum(l, (p) => num(p.passesmade)),
      passPct: pct(sum(l, (p) => num(p.passesmade)), sum(l, (p) => num(p.passattempts))), tackles: sum(l, (p) => num(p.tacklesmade)),
      tacklePct: pct(sum(l, (p) => num(p.tacklesmade)), sum(l, (p) => num(p.tackleattempts))), saves: sum(l, (p) => num(p.saves)),
      rating: avg(l.map((p) => num(p.rating))), red: sum(l, (p) => num(p.redcards)), players: l.length,
    };
  };
  const T = [team(h), team(aw)];
  const rows = [['Goals', 'goals'], ['Shots', 'shots'], ['Passes', 'passes'], ['Pass accuracy', 'passPct', '%'], ['Tackles', 'tackles'], ['Tackle success', 'tacklePct', '%'], ['Saves', 'saves'], ['Avg rating', 'rating', '', 1], ['Red cards', 'red'], ['Human players', 'players']];
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

  const side = (cid) => section(`${crest(cid, 30, base)} ${clubLink(cid, base)}`, table(`m-${cid}`, ['Player', 'Pos', '#Rating', '#G', '#A', '#Shots', '#Pass', '#Tkl', '#Saves', 'MOTM'], list(cid).sort((x, y) => num(y.rating) - num(x.rating)).map((p) =>
    `<tr>${td(pLink(p.pid, base, p.playername))}${td(posAbbr(p.pos))}${td(ratingPill(num(p.rating)), true, num(p.rating))}${td(p.goals, true)}${td(p.assists, true)}${td(p.shots, true)}${td(`${p.passesmade}/${p.passattempts}`, true, p.passesmade)}${td(`${p.tacklesmade}/${p.tackleattempts}`, true, p.tacklesmade)}${td(p.saves, true)}${td(p.mom === '1' ? '⭐' : '')}</tr>`)));

  return `<div class="reveal">${poster(m, base, { link: false })}<button class="btn dl-poster" type="button" data-for="poster-${m.matchId}">⬇ Download result graphic</button></div>
<div class="grid2 reveal">${card('Match stats', `<div class="cmp-head"><span>${crest(h, 26, base)}</span><span>${crest(aw, 26, base)}</span></div><ul class="compare-bars">${cmp}</ul>`)}${card('Line-ups & ratings', pitch)}</div>
${side(h)}${side(aw)}`;
}

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'web'), path.join(OUT, 'assets'), { recursive: true });

write('index.html', page({ title: `${config.siteTitle} – Official Pro Clubs hub`, base: '', active: 'home', body: clubBody(homeId, '', true) }));

const homeSquad = visiblePlayers.filter((p) => p.isHome).sort((a, b) => num(b.main.gamesPlayed) - num(a.main.gamesPlayed));
write('squad.html', page({ title: `Squad – ${config.siteTitle}`, base: '', active: 'squad', body: `
${pageHead('The Squad', `${homeSquad.length} players · card stats are NOREX totals, OVR from EA`, '')}
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
<div class="club-grid">${clubList.map((c) => { const o = { ...(c.overall ?? {}), ...(c.leaderboard ?? {}) }; const tr = state.clubs[c.id]?.tier ?? 'archived'; return `<a class="club-card tier-${esc(tr)}" data-tier="${esc(tr)}" href="${clubHref(c.id, '../')}">${crest(c.id, 72, '../')}<b>${esc(clubName(c.id))}</b><span class="tag">${esc(tr)}</span><small>${esc(o.wins ?? 0)}W · ${esc(o.ties ?? 0)}D · ${esc(o.losses ?? 0)}L</small><small class="muted">SR ${esc(o.skillRating ?? '–')}${o.currentDivision ? ` · Div ${esc(o.currentDivision)}` : ''}</small></a>`; }).join('')}</div>` }));

for (const m of matches) {
  const [a, b] = Object.keys(m.clubs);
  // Share preview: the opponent's crest (ours for linked-club games) + score line, scorers and MOTM.
  const [h, aw] = m.clubs[homeId] ? [homeId, oppOf(m, homeId)] : [a, b];
  const all = Object.values(m.players || {}).flatMap((l) => Object.values(l));
  const motm = all.find((p) => p.mom === '1');
  const goals = Object.values(m.players?.[h] || {}).filter((p) => num(p.goals)).map((p) => `${p.playername}${num(p.goals) > 1 ? ` ×${num(p.goals)}` : ''}`);
  const verdict = { W: 'Win', L: 'Defeat', D: 'Draw' }[result(m.clubs[h])];
  write(`matches/${m.matchId}.html`, page({ title: `${clubName(h)} ${m.clubs[h].goals}–${m.clubs[aw].goals} ${clubName(aw)}`, base: '../', active: 'matches', body: matchBody(m, '../'),
    description: `${verdict} · ${m.matchType === 'playoffMatch' ? 'Playoff' : 'League'} · ${niceDate(m.timestamp)}${goals.length ? ` · ⚽ ${goals.join(', ')}` : ''}${motm ? ` · ⭐ MOTM ${motm.playername} (${num(motm.rating).toFixed(1)})` : ''}`,
    image: ogCrest(h === homeId ? aw : h) }));
}
const sessions = sessionsFor(homeMatches, homeId);
write('matches/index.html', page({ title: `Matches – ${config.siteTitle}`, base: '../', active: 'matches', body: `
${pageHead('Matches', 'Every match since the site started archiving (EA itself only keeps the last 5). Play nights are grouped into sessions and graded on results and goal difference.', '../')}
${modes(`${section('Sessions', `<div class="session-grid">${sessions.map((s) => sessionCard(s, '../', homeId)).join('') || emptyState('🗓️', 'No sessions yet', 'Every play night becomes a graded session card here.')}</div>`)}
${section('All results', `<div class="fixtures">${homeMatches.map((m) => fixture(m, homeId, '../')).join('') || emptyState('🗂️', 'No results yet', 'Every league and playoff match is saved here from the next update on.')}</div>`)}
${matches.some((m) => !m.clubs[homeId]) ? section('Linked club matches', `<div class="fixtures">${matches.filter((m) => !m.clubs[homeId]).map((m) => fixture(m, Object.keys(m.clubs)[0], '../')).join('')}</div>`) : ''}`, 'matches', 'League & playoffs from EA · Rush logged by members')}` }));

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
const record = (icon, title, value, sub, href) => `<a class="record"${href ? ` href="${href}"` : ''}><span class="rec-icon">${icon}</span><small>${title}</small><b>${value}</b><span>${sub}</span></a>`;
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
write('stats.html', page({ title: `Stats – ${config.siteTitle}`, base: '', active: 'stats', body: `
${pageHead('Stats centre', "League leaderboards use EA's club totals; records and head-to-heads come from the match archive. Rush numbers come from results logged by members and confirmed by a manager.", '')}
${modes(`${section('Leaderboards', `<div class="tabs chipset" data-tabs>${boards.map(([k], i) => `<button class="chip${i ? '' : ' on'}" type="button" data-tab="lb${i}">${k}</button>`).join('')}</div>
${boards.map(([, f, fmt], i) => `<div class="tab-panel card" id="lb${i}"${i ? ' hidden' : ''}>${barList(hm.map(({ pl, s }) => ({ pl, v: f(s) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 10), { base: '', fmt: fmt ?? ((v) => v) })}</div>`).join('')}`)}
${recs.length ? section('Club records', `<div class="records">${recs.join('')}</div>`, { sub: 'from the archive' }) : ''}
${section('Head to head', table('h2h', ['Opponent', '#P', '#W', '#D', '#L', '#GF', '#GA', '#GD', 'Last'], [...h2h.values()].sort((a, b) => b.p - a.p).map((e) =>
    `<tr>${td(`${crest(e.o, 22, '')} ${clubLink(e.o, '')}`)}${td(e.p, true)}${td(e.w, true)}${td(e.d, true)}${td(e.l, true)}${td(e.gf, true)}${td(e.ga, true)}${td((e.gf - e.ga > 0 ? '+' : '') + (e.gf - e.ga), true, e.gf - e.ga)}${td(`<a href="matches/${e.last.matchId}.html">${resPill(result(e.last.clubs[homeId]))} ${scoreOf(e.last)}</a>`)}</tr>`), { filter: 'Search opponents…' }))}`, 'leaders')}` }));

write('compare.html', page({ title: `Compare – ${config.siteTitle}`, base: '', active: 'compare', body: `
${pageHead('Head to head', "Pick any two players, from NOREX or anyone we've faced. Radar values are percentiles against every tracked player with 3+ games.", '')}
<div class="cmp-pick card"><label>Player A<input list="cmp-list" id="cmp-a" placeholder="Type a gamertag…" autocomplete="off"></label><span class="vs">VS</span><label>Player B<input list="cmp-list" id="cmp-b" placeholder="Type a gamertag…" autocomplete="off"></label><datalist id="cmp-list"></datalist></div>
<div id="cmp-out" class="cmp-out"><p class="muted">Loading players…</p></div>` }));

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
<li><b>Apply on Discord.</b> ${DISCORD ? 'The button below opens our server’s application form: EA ID, position and availability.' : 'Our application link is shared by club members – ask one of the squad.'}</li>
<li><b>Get approved.</b> A club admin reviews every application. If it's a fit you'll be invited to a trial session.</li>
</ol>
${RECRUIT.open && DISCORD ? `<p><a class="btn discord big" href="${esc(DISCORD)}" target="_blank" rel="noopener">${DISCORD_SVG} Apply on Discord</a></p><p class="muted small">You'll need a Discord account. Nobody joins the server without admin approval.</p>` : ''}`)}` }));

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
<h2>Play for another club?</h2>
<p>If a club of yours isn't showing up yet, tell a manager its name and we'll add it. Its matches get archived from then on.</p>
<p>${askManager}</p>
<h2>Don't want to be listed?</h2>
<p>Send a manager your gamertag and you'll be hidden from every page on the next update.</p>
<p>${askManager}</p>
<p class="muted">Tracking ${clubs.size} clubs · ${visiblePlayers.length} players · ${matches.length} archived matches · ${Object.keys(state.scanned ?? {}).length} clubs scanned.</p>
</div>` }));

// JSON API for search, the compare tool and the Discord bot.
write('api/players.json', JSON.stringify(visiblePlayers.map((pl) => ({
  k: pl.key, n: pl.name, home: pl.isHome || pl.playedForHome, pos: pl.pos || '—', ovr: pl.ovr,
  c: pl.clubIds.map((c) => clubName(c)), cid: pl.mainClub, crest: pl.mainClub ? crestSrc(pl.mainClub, SITE) : null,
  ...(pl.main && num(pl.main.gamesPlayed)
    ? { s: { gp: num(pl.main.gamesPlayed), g: num(pl.main.goals), a: num(pl.main.assists), r: num(pl.main.ratingAve), m: num(pl.main.manOfTheMatch), p: num(pl.main.passSuccessRate), t: num(pl.main.tackleSuccessRate), w: num(pl.main.winRate) }, src: 'club' }
    : pl.arch ? { s: pl.arch, src: 'archive' } : { s: null, src: null }),
  sc: pl.mainClub ? clubName(pl.mainClub) : null,
  car: pl.career ? { gp: num(pl.career.gamesPlayed), g: num(pl.career.goals), a: num(pl.career.assists), r: num(pl.career.ratingAve), m: num(pl.career.manOfTheMatch) } : null,
  rad: pl.radar, raw: pl.radarRaw, tr: [...pl.apps].reverse().slice(-15).map((x) => x.rating),
}))));
write('api/clubs.json', JSON.stringify([...clubs.values()].map((c) => ({ id: c.id, n: clubName(c.id), t: state.clubs[c.id]?.tier ?? 'archived', ...(clubKit(c.id)?.crestAssetId ? { cr: crestSrc(c.id, SITE) } : {}) }))));
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
      ps: Object.entries(m.players?.[homeId] || {}).filter(([pid]) => !players.get(pid)?.hidden).map(([pid, p]) => ({ k: pid, n: p.playername, r: num(p.rating) })) };
  }),
  radarAxes: RADAR.map((a) => a.label),
  apply: RECRUIT.open ? `${SITE}apply.html` : null,
}));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Built ${clubs.size} clubs, ${visiblePlayers.length} players, ${matches.length} matches → site/`);
