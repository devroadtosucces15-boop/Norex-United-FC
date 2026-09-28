// Turns data/ into a static website in site/. No dependencies, no framework.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA, readJson, loadConfig, num } from './lib.mjs';

const OUT = path.join(ROOT, 'site');
const config = loadConfig();
const homeId = String(config.homeClubId);
const state = readJson(path.join(DATA, 'state.json'), { clubs: {} });
const meta = readJson(path.join(DATA, 'meta.json'), {});
const hidden = new Set((config.hiddenPlayers || []).map((h) => String(h).toLowerCase()));
const builtAt = new Date().toISOString();

// ---------- helpers ----------
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'x';
const hex = (d, fallback) => (d === undefined || d === null || d === '' ? fallback : '#' + Number(d).toString(16).padStart(6, '0'));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const fmt1 = (n) => (n ? n.toFixed(1) : '–');
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '–');
const isHidden = (p) => hidden.has(String(p.id ?? '').toLowerCase()) || [...p.names].some((n) => hidden.has(n.toLowerCase()));
const readDir = (dir) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(dir, f))).filter(Boolean) : [];

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

// ---------- load ----------
const clubs = new Map(readDir(path.join(DATA, 'clubs')).map((c) => [String(c.id), c]));
const matches = readDir(path.join(DATA, 'matches')).sort((a, b) => b.timestamp - a.timestamp);
const clubName = (id) => clubs.get(String(id))?.info?.name ?? state.clubs[id]?.name ?? matchClubName(id) ?? `Club ${id}`;
function matchClubName(id) {
  for (const m of matches) if (m.clubs[id]?.name) return m.clubs[id].name;
  return null;
}
const clubKit = (id) => clubs.get(String(id))?.info?.customKit ?? matches.find((m) => m.clubs[id]?.kit)?.clubs[id].kit ?? null;
const result = (c) => (c.wins === '1' ? 'W' : c.losses === '1' ? 'L' : 'D');

// ---------- players ----------
const players = new Map(); // key -> player
const nameToKey = new Map(); // lower gamertag -> key
function player(key) {
  if (!players.has(key)) {
    players.set(key, { key, id: /^\d+$/.test(key) ? key : null, names: new Set(), name: null, clubStats: {}, career: null, apps: [] });
  }
  return players.get(key);
}

// Matches first (oldest → newest) so the latest gamertag wins and IDs are known.
for (const m of [...matches].reverse()) {
  for (const [clubId, list] of Object.entries(m.players || {})) {
    const oppId = Object.keys(m.clubs).find((k) => k !== clubId);
    for (const [pid, p] of Object.entries(list)) {
      const pl = player(pid);
      pl.names.add(p.playername);
      pl.name = p.playername;
      nameToKey.set(p.playername.toLowerCase(), pid);
      pl.apps.push({
        matchId: m.matchId, ts: m.timestamp, clubId, oppId, res: result(m.clubs[clubId] ?? {}),
        score: `${m.clubs[clubId]?.goals ?? '?'}–${m.clubs[oppId]?.goals ?? '?'}`,
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
  pl.hidden = isHidden(pl);
  pl.apps.sort((a, b) => b.ts - a.ts);
  pl.clubIds = [...new Set([...Object.keys(pl.clubStats), ...pl.apps.map((a) => a.clubId)])];
  pl.isHome = pl.clubIds.includes(homeId);
  const s = Object.values(pl.clubStats);
  pl.bestOverall = Math.max(0, ...s.map((x) => num(x.proOverall)));
  pl.position = pl.career?.favoritePosition ?? s[0]?.favoritePosition ?? pl.apps[0]?.pos ?? '';
}
const visiblePlayers = [...players.values()].filter((p) => !p.hidden);
const pLink = (key, base, fallbackName) => {
  const pl = players.get(key);
  if (!pl || pl.hidden) return '<span class="muted">Hidden player</span>';
  return `<a href="${base}players/${esc(pl.key)}.html">${esc(pl.name ?? fallbackName)}</a>`;
};
const pLinkByName = (name, base) => pLink(nameToKey.get(name.toLowerCase()), base, name);

// ---------- layout ----------
const homeKit = clubs.get(homeId)?.info?.customKit ?? {};
const C1 = hex(homeKit.kitColor1, '#0b0d10');
const C2 = hex(homeKit.kitColor2, '#db0f12');

function badge(id, size = 40) {
  const kit = clubKit(id) ?? {};
  const a = hex(kit.kitColor1, '#333'), b = hex(kit.kitColor2, '#999');
  const initials = esc(clubName(id).replace(/\b(FC|CF|AFC|SC|AC)\b/gi, '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || '?');
  return `<svg class="badge" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 36 8v12c0 9-7 15-16 18C11 35 4 29 4 20V8z" fill="${a}" stroke="${b}" stroke-width="2.5"/><path d="M20 2v36C11 35 4 29 4 20V8z" fill="${b}" opacity=".35"/><text x="20" y="24" text-anchor="middle" font-size="${initials.length > 2 ? 9 : 11}" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">${initials}</text></svg>`;
}

function page({ title, base, active, body, description }) {
  const nav = [
    ['', 'index.html', 'Club'], ['matches', 'matches/index.html', 'Matches'],
    ['players', 'players/index.html', 'Players'], ['clubs', 'clubs/index.html', 'Clubs'], ['about', 'about.html', 'About'],
  ];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description ?? `${config.siteTitle} – Pro Clubs stats, results and players, updated automatically.`)}">
<link rel="stylesheet" href="${base}assets/style.css"><style>:root{--c1:${C1};--c2:${C2}}</style>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(badge(homeId, 32).replace('class="badge" ', 'xmlns="http://www.w3.org/2000/svg" '))}">
</head><body>
<header class="top"><div class="wrap bar"><a class="brand" href="${base}index.html">${badge(homeId, 30)}<span>${esc(config.siteTitle)}</span></a>
<nav>${nav.map(([k, href, label]) => `<a href="${base}${href}"${k === active ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></div></header>
<main class="wrap">${body}</main>
<footer class="wrap foot">Data from EA SPORTS FC Pro Clubs. Updated automatically · last data <time datetime="${esc(meta.lastSuccessfulDay ?? builtAt)}">${esc(meta.lastSuccessfulDay ?? builtAt.slice(0, 10))}</time> · built <time class="ago" datetime="${builtAt}">${builtAt.slice(0, 16).replace('T', ' ')} UTC</time>. Not affiliated with EA.</footer>
<script src="${base}assets/app.js" defer></script></body></html>`;
}

const table = (id, head, rows, opts = {}) => `
${opts.filter ? `<input class="filter" type="search" placeholder="${esc(opts.filter)}" data-filter="${id}" aria-label="${esc(opts.filter)}">` : ''}
<div class="tbl"><table id="${id}" class="sortable"><thead><tr>${head.map((h) => `<th${h.startsWith('#') ? ' class="n"' : ''}>${esc(h.replace(/^#/, ''))}</th>`).join('')}</tr></thead>
<tbody>${rows.length ? rows.join('') : `<tr><td colspan="${head.length}" class="muted">Nothing yet – check back after the next update.</td></tr>`}</tbody></table></div>`;
const td = (v, n = false, sort) => `<td${n ? ' class="n"' : ''}${sort !== undefined ? ` data-v="${esc(sort)}"` : ''}>${v}</td>`;
const dateCell = (ts) => td(`<time datetime="${new Date(ts * 1000).toISOString()}">${new Date(ts * 1000).toISOString().slice(0, 10)}</time>`, false, ts);
const resPill = (r) => `<span class="res ${r}">${r}</span>`;

// ---------- club page ----------
function clubMatches(id) {
  return matches.filter((m) => m.clubs[id]);
}
function matchRow(m, id, base) {
  const oppId = Object.keys(m.clubs).find((k) => k !== id);
  const us = m.clubs[id], them = m.clubs[oppId];
  return `<tr>${dateCell(m.timestamp)}${td(resPill(result(us)))}${td(`<a href="${base}matches/${m.matchId}.html">${esc(us.goals)} – ${esc(them.goals)}</a>`)}${td(`${badge(oppId, 20)} ${clubLink(oppId, base)}`)}${td(m.matchType === 'playoffMatch' ? 'Playoff' : 'League')}</tr>`;
}
function clubLink(id, base) {
  return clubs.has(String(id)) ? `<a href="${base}clubs/${id}.html">${esc(clubName(id))}</a>` : esc(clubName(id));
}

function clubBody(id, base, isHome) {
  const c = clubs.get(id);
  const o = { ...(c?.overall ?? {}), ...(c?.leaderboard ?? {}) };
  const ms = clubMatches(id);
  const form = ms.slice(0, 10).map((m) => resPill(result(m.clubs[id]))).join('');
  const members = (c?.members ?? []).map((mb) => ({ mb, pl: players.get(nameToKey.get(mb.name.toLowerCase())) })).filter((x) => !x.pl?.hidden);
  const leaders = (field, label, fmt = (v) => v) => {
    const top = [...members].sort((a, b) => num(b.mb[field]) - num(a.mb[field])).filter((x) => num(x.mb[field]) > 0).slice(0, 5);
    return `<div class="card"><h3>${label}</h3><ol class="lead">${top.map((x) => `<li>${pLinkByName(x.mb.name, base)}<b>${fmt(num(x.mb[field]))}</b></li>`).join('') || '<li class="muted">–</li>'}</ol></div>`;
  };
  const gp = num(o.gamesPlayed);
  const tier = state.clubs[id]?.tier;
  return `
<section class="hero">${badge(id, 88)}<div><h1>${esc(clubName(id))}</h1>
<p class="sub">${o.currentDivision ? `Division ${esc(o.currentDivision)} · ` : ''}Skill rating ${esc(o.skillRating ?? '–')}${c?.info?.customKit?.stadName ? ` · ${esc(c.info.customKit.stadName)}` : ''}${!isHome && tier ? ` · <span class="tag">${esc(tier)}</span>` : ''}${state.clubs[id]?.linkedPlayers ? ` · shares ${state.clubs[id].linkedPlayers.map((n) => pLinkByName(n, base)).join(', ')}` : ''}</p>
${form ? `<div class="form">${form}</div>` : ''}</div></section>
<section class="stats">
${[['Played', gp], ['Won', o.wins], ['Drawn', o.ties], ['Lost', o.losses], ['Win %', pct(num(o.wins), gp)], ['Goals', o.goals], ['Conceded', o.goalsAgainst], ['Promotions', o.promotions], ['Win streak', o.wstreak], ['Unbeaten', o.unbeatenstreak]]
    .map(([k, v]) => `<div class="stat"><span>${k}</span><b>${esc(v ?? '–')}</b></div>`).join('')}
</section>
${members.length ? `<section class="grid4">${leaders('goals', 'Top scorers')}${leaders('assists', 'Assists')}${leaders('ratingAve', 'Avg rating', (v) => v.toFixed(1))}${leaders('manOfTheMatch', 'Man of the match')}</section>` : ''}
<h2>Recent results</h2>
${table(`res-${id}`, ['Date', 'Res', 'Score', 'Opponent', 'Type'], ms.slice(0, isHome ? 10 : 20).map((m) => matchRow(m, id, base)))}
${isHome && ms.length > 10 ? `<p><a href="${base}matches/index.html">All ${ms.length} archived matches →</a></p>` : ''}
<h2>Squad <small class="muted">${members.length} players</small></h2>
${table(`squad-${id}`, ['Player', 'Pos', '#OVR', '#GP', '#Goals', '#Assists', '#Rating', '#MOTM', '#Win %', '#Pass %', '#Tackle %', '#Clean sheets', '#Red'],
    members.sort((a, b) => num(b.mb.gamesPlayed) - num(a.mb.gamesPlayed)).map(({ mb }) =>
      `<tr>${td(pLinkByName(mb.name, base))}${td(esc(mb.favoritePosition ?? ''))}${td(esc(mb.proOverall ?? '–'), true)}${td(mb.gamesPlayed, true)}${td(mb.goals, true)}${td(mb.assists, true)}${td(mb.ratingAve, true)}${td(mb.manOfTheMatch, true)}${td(mb.winRate + '%', true, mb.winRate)}${td(mb.passSuccessRate + '%', true, mb.passSuccessRate)}${td(mb.tackleSuccessRate + '%', true, mb.tackleSuccessRate)}${td(num(mb.cleanSheetsDef) + num(mb.cleanSheetsGK), true)}${td(mb.redCards, true)}</tr>`),
    { filter: 'Filter squad…' })}`;
}

// ---------- player page ----------
function playerBody(pl, base) {
  const a = pl.apps;
  const tot = (f) => a.reduce((s, x) => s + x[f], 0);
  const w = a.filter((x) => x.res === 'W').length, d = a.filter((x) => x.res === 'D').length, l = a.filter((x) => x.res === 'L').length;
  const car = pl.career;
  const clubRows = Object.entries(pl.clubStats).map(([cid, s]) =>
    `<tr>${td(`${badge(cid, 20)} ${clubLink(cid, base)}`)}${td(esc(s.favoritePosition ?? ''))}${td(esc(s.proOverall ?? '–'), true)}${td(s.gamesPlayed, true)}${td(s.goals, true)}${td(s.assists, true)}${td(s.ratingAve, true)}${td(s.manOfTheMatch, true)}${td(s.winRate + '%', true, s.winRate)}${td(s.passSuccessRate + '%', true, s.passSuccessRate)}</tr>`);
  const otherNames = [...pl.names].filter((n) => n !== pl.name);
  return `
<section class="hero"><div class="avatar">${esc((pl.name ?? '?')[0].toUpperCase())}</div><div><h1>${esc(pl.name)}</h1>
<p class="sub">${esc(pl.position || 'Player')}${pl.bestOverall ? ` · OVR ${pl.bestOverall}` : ''} · ${pl.clubIds.map((c) => clubLink(c, base)).join(', ') || 'no tracked club'}${otherNames.length ? ` · also known as ${otherNames.map(esc).join(', ')}` : ''}</p>
${a.length ? `<div class="form">${a.slice(0, 10).map((x) => resPill(x.res)).join('')}</div>` : ''}</div></section>
${car ? `<h2>Career <small class="muted">all clubs, from EA</small></h2><section class="stats">
${[['Games', car.gamesPlayed], ['Goals', car.goals], ['Assists', car.assists], ['Avg rating', car.ratingAve], ['MOTM', car.manOfTheMatch], ['Goals / game', num(car.gamesPlayed) ? (num(car.goals) / num(car.gamesPlayed)).toFixed(2) : '–']].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</section>` : ''}
${clubRows.length ? `<h2>By club</h2>${table('byclub', ['Club', 'Pos', '#OVR', '#GP', '#Goals', '#Assists', '#Rating', '#MOTM', '#Win %', '#Pass %'], clubRows)}` : ''}
${a.length ? `<h2>Archived matches <small class="muted">${a.length} tracked since the site started</small></h2>
<section class="stats">${[['Record', `${w}-${d}-${l}`], ['Goals', tot('goals')], ['Assists', tot('assists')], ['Avg rating', fmt1(avg(a.map((x) => x.rating)))], ['MOTM', tot('mom')], ['Shots', tot('shots')], ['Pass %', pct(tot('passes'), tot('passAtt'))], ['Tackle %', pct(tot('tackles'), tot('tackleAtt'))], ['Saves', tot('saves')]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</section>
${table('log', ['Date', 'Res', 'Score', 'For', 'Against', 'Pos', '#G', '#A', '#Rating', '#Shots', '#Pass', '#Tkl', '#Saves'], a.map((x) =>
    `<tr>${dateCell(x.ts)}${td(resPill(x.res))}${td(`<a href="${base}matches/${x.matchId}.html">${esc(x.score)}</a>`)}${td(clubLink(x.clubId, base))}${td(clubLink(x.oppId, base))}${td(esc(x.pos))}${td(x.goals, true)}${td(x.assists, true)}${td(x.rating.toFixed(1), true, x.rating)}${td(x.shots, true)}${td(`${x.passes}/${x.passAtt}`, true, x.passes)}${td(`${x.tackles}/${x.tackleAtt}`, true, x.tackles)}${td(x.saves, true)}</tr>`))}` : ''}`;
}

// ---------- match page ----------
function matchBody(m, base) {
  const ids = Object.keys(m.clubs).sort((a, b) => (a === homeId ? -1 : b === homeId ? 1 : 0));
  const [h, aw] = ids;
  const side = (cid) => {
    const list = Object.entries(m.players?.[cid] || {}).sort((x, y) => num(y[1].rating) - num(x[1].rating));
    return `<h2>${badge(cid, 24)} ${clubLink(cid, base)}</h2>${table(`m-${cid}`, ['Player', 'Pos', '#Rating', '#G', '#A', '#Shots', '#Pass', '#Tkl', '#Saves', 'MOTM'], list.map(([pid, p]) =>
      `<tr>${td(pLink(pid, base, p.playername))}${td(esc(p.pos))}${td(num(p.rating).toFixed(1), true, num(p.rating))}${td(p.goals, true)}${td(p.assists, true)}${td(p.shots, true)}${td(`${p.passesmade}/${p.passattempts}`, true, p.passesmade)}${td(`${p.tacklesmade}/${p.tackleattempts}`, true, p.tacklesmade)}${td(p.saves, true)}${td(p.mom === '1' ? '⭐' : '')}</tr>`))}`;
  };
  return `<section class="score">
<div class="team">${badge(h, 64)}<div>${clubLink(h, base)}</div></div>
<div class="big">${esc(m.clubs[h].goals)} – ${esc(m.clubs[aw].goals)}<small>${m.matchType === 'playoffMatch' ? 'Playoff' : 'League'} · <time datetime="${new Date(m.timestamp * 1000).toISOString()}">${new Date(m.timestamp * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC</time></small></div>
<div class="team">${badge(aw, 64)}<div>${clubLink(aw, base)}</div></div></section>
${side(h)}${side(aw)}`;
}

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'web'), path.join(OUT, 'assets'), { recursive: true });

write('index.html', page({ title: config.siteTitle, base: '', active: '', body: clubBody(homeId, '', true) }));

for (const id of clubs.keys()) {
  if (id === homeId) continue;
  write(`clubs/${id}.html`, page({ title: `${clubName(id)} – ${config.siteTitle}`, base: '../', active: 'clubs', body: clubBody(id, '../', false) }));
}
write(`clubs/${homeId}.html`, `<!doctype html><meta http-equiv="refresh" content="0;url=../index.html">`);

const tierOrder = { home: 0, manual: 1, linked: 2, discovered: 3 };
const clubList = [...clubs.values()].sort((a, b) => (tierOrder[state.clubs[a.id]?.tier] ?? 4) - (tierOrder[state.clubs[b.id]?.tier] ?? 4) || num(b.overall?.skillRating) - num(a.overall?.skillRating));
write('clubs/index.html', page({ title: `Clubs – ${config.siteTitle}`, base: '../', active: 'clubs', body: `<h1>Clubs</h1>
<p class="muted">Clubs are found automatically: every opponent is tracked, and any club where one of our players also plays is marked <span class="tag">linked</span> and fully archived. <span class="tag">discovered</span> clubs are opponents we keep an eye on; the crawler also scans further clubs in the background looking for our players.</p>
${table('clubs', ['Club', 'Type', '#Div', '#Skill', '#GP', '#W', '#D', '#L', '#Members'], clubList.map((c) => `<tr>${td(`${badge(c.id, 20)} ${clubLink(c.id, '../')}`)}${td(`<span class="tag">${esc(state.clubs[c.id]?.tier ?? 'archived')}</span>`, false, tierOrder[state.clubs[c.id]?.tier] ?? 4)}${td(esc(c.leaderboard?.currentDivision ?? '–'), true)}${td(esc(c.overall?.skillRating ?? '–'), true)}${td(esc(c.overall?.gamesPlayed ?? 0), true)}${td(esc(c.overall?.wins ?? 0), true)}${td(esc(c.overall?.ties ?? 0), true)}${td(esc(c.overall?.losses ?? 0), true)}${td(c.members?.length ?? 0, true)}</tr>`), { filter: 'Search clubs…' })}` }));

for (const m of matches) {
  const [a, b] = Object.keys(m.clubs);
  write(`matches/${m.matchId}.html`, page({ title: `${clubName(a)} ${m.clubs[a].goals}–${m.clubs[b].goals} ${clubName(b)}`, base: '../', active: 'matches', body: matchBody(m, '../') }));
}
write('matches/index.html', page({ title: `Matches – ${config.siteTitle}`, base: '../', active: 'matches', body: `<h1>Matches</h1>
<p class="muted">Every match played by ${esc(config.siteTitle)} and its linked clubs since this site started archiving. EA only keeps the last few matches, so this archive is the permanent record.</p>
${table('matches', ['Date', 'Res', 'Score', 'Opponent', 'Type'], clubMatches(homeId).map((m) => matchRow(m, homeId, '../')))}
${matches.some((m) => !m.clubs[homeId]) ? `<h2>Linked club matches</h2>${table('lmatches', ['Date', 'Home', 'Score', 'Away', 'Type'], matches.filter((m) => !m.clubs[homeId]).map((m) => { const [a, b] = Object.keys(m.clubs); return `<tr>${dateCell(m.timestamp)}${td(clubLink(a, '../'))}${td(`<a href="${m.matchId}.html">${m.clubs[a].goals} – ${m.clubs[b].goals}</a>`)}${td(clubLink(b, '../'))}${td(m.matchType === 'playoffMatch' ? 'Playoff' : 'League')}</tr>`; }))}` : ''}` }));

for (const pl of visiblePlayers) {
  write(`players/${pl.key}.html`, page({ title: `${pl.name} – ${config.siteTitle}`, base: '../', active: 'players', body: playerBody(pl, '../') }));
}
const pRows = visiblePlayers
  .sort((a, b) => (b.isHome - a.isHome) || num(b.career?.gamesPlayed) - num(a.career?.gamesPlayed))
  .map((pl) => `<tr>${td(`<a href="${pl.key}.html">${esc(pl.name)}</a>${pl.isHome ? ' <span class="tag home">NOREX</span>' : ''}`, false, pl.name.toLowerCase())}${td(pl.clubIds.map((c) => esc(clubName(c))).join(', '))}${td(esc(pl.position))}${td(pl.bestOverall || '–', true, pl.bestOverall)}${td(esc(pl.career?.gamesPlayed ?? '–'), true, num(pl.career?.gamesPlayed))}${td(esc(pl.career?.goals ?? '–'), true, num(pl.career?.goals))}${td(esc(pl.career?.assists ?? '–'), true, num(pl.career?.assists))}${td(esc(pl.career?.ratingAve ?? '–'), true, num(pl.career?.ratingAve))}${td(pl.apps.length, true)}</tr>`);
write('players/index.html', page({ title: `Players – ${config.siteTitle}`, base: '../', active: 'players', body: `<h1>Players <small class="muted">${visiblePlayers.length}</small></h1>
<p class="muted">Everyone in a tracked club or seen in an archived match. Career numbers are EA's totals across every club a player has played for.</p>
${table('players', ['Player', 'Clubs', 'Pos', '#OVR', '#Career GP', '#Goals', '#Assists', '#Rating', '#Archived apps'], pRows, { filter: 'Search players or clubs…' })}` }));

const linked = Object.entries(state.clubs).filter(([, c]) => c.tier === 'linked' || c.tier === 'manual');
write('about.html', page({ title: `About – ${config.siteTitle}`, base: '', active: 'about', body: `<h1>About this site</h1>
<div class="prose">
<p>This site updates itself around every 15 minutes from EA SPORTS FC's public Pro Clubs data. Nobody has to enter results by hand.</p>
<h2>What it tracks</h2>
<ul><li><b>${esc(config.siteTitle)}</b>: every match, box score, squad and career stat.</li>
<li><b>Linked clubs</b> (${linked.length}): other clubs our players also play for. These are found automatically by scanning opponents' squads, and their matches are archived too.</li>
<li><b>Opponents</b>: every club we play gets a page with its squad and record.</li>
<li><b>Players</b>: a profile for anyone who appears in any of the above, with EA career totals across all their clubs.</li></ul>
<h2>Play for another club?</h2>
<p>If one of your clubs isn't showing up, the crawler hasn't found it yet. Add it with the <b>“Add a club”</b> form on the site's GitHub page (Issues → New issue → Add a club). It's picked up automatically within minutes.</p>
<h2>Don't want to be listed?</h2>
<p>Ask a club admin to add your gamertag to <code>hiddenPlayers</code> in <code>config.json</code>, or open a “Hide me” issue. Your name and stats will be removed on the next update.</p>
<p class="muted">Tracking ${clubs.size} clubs · ${visiblePlayers.length} players · ${matches.length} archived matches · ${Object.keys(state.scanned ?? {}).length} clubs scanned.</p>
</div>` }));

fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Built ${clubs.size} clubs, ${visiblePlayers.length} players, ${matches.length} matches → site/`);
