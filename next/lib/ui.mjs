import { cfg, clubStats, players } from './data.mjs';
import { ICON, ic } from './icons.mjs';
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const slug = (s) => encodeURIComponent(String(s));
export const MAP = [
  { k: 'club', l: 'Club', i: 'shield', href: 'index.html', subs: [['index.html', 'Home', 'Where the club stands'], ['squad.html', 'Squad', 'Every player card'], ['halloffame.html', 'Hall of Fame', 'Awards and records'], ['join.html', 'Join', 'Apply to play'], ['scouting.html', 'Scouting', 'Members only']] },
  { k: 'matches', l: 'Matches', i: 'pitch', href: 'results.html', subs: [['fixtures.html', 'Fixtures', 'Match nights'], ['results.html', 'Results', 'Every game, broadcast style'], ['opponents.html', 'Opponents', 'Rivals and burner clubs']] },
  { k: 'stats', l: 'Stats', i: 'chart', href: 'stats.html', subs: [['stats.html', 'Overview', 'Club numbers'], ['leaders.html', 'Leaders', 'Every table'], ['players.html', 'Players', 'Directory and Compare']] },
  { k: 'tactics', l: 'Tactics', i: 'brain', href: 'tactics.html', subs: [['tactics.html', 'Tactics table', 'Our XI and every formation'], ['playstyle.html', 'Play Style', 'How we play'], ['studio.html', 'Studio', 'Chalkboard and playbook'], ['builds.html', 'Builds', 'Builder and pro builds'], ['updates.html', 'Game updates', 'FC 27 patch notes']] },
];
const HUBSUB = [['hub.html', 'My Locker'], ['hub-matchnight.html', 'Match Night'], ['hub-squad.html', 'Squad Room'], ['hub-clubhouse.html', 'Clubhouse'], ['hub-handbook.html', 'Handbook'], ['staff.html', 'Staff']];
const PREVIEW = !!process.env.NEXT_PREVIEW;
export function shell(o) { return dress(shellRaw(o)); }
function shellRaw({ group = '', page = '', title, body, extraHead = '', bodyClass = '', data = {} }) {
  const nav = MAP.map((g) => `<div class="g"><a href="${g.href}" class="${g.k === group ? 'on' : ''}">${g.l}</a><div class="drop">${g.subs.map(([h, l, d]) => `<a href="${h}">${l}<small>${d}</small></a>`).join('')}</div></div>`).join('');
  const subList = group === 'hub' ? HUBSUB : MAP.find((g) => g.k === group)?.subs ?? [];
  const sub = subList.map(([h, l]) => `<a href="${h}" class="${h === page || (h === 'staff.html' && page.startsWith('staff')) ? 'on' : ''}">${l}</a>`).join('');
  const tabs = MAP.map((g, i) => (i === 2 ? `<a class="key" data-hub href="hub.html" aria-label="Enter the Hub">${ic('key', 26)}</a>` : '') + `<a href="${g.href}" class="${g.k === group ? 'on' : ''}"><span>${ic(g.i, 22)}</span>${g.l}</a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#080b11">${PREVIEW ? '<meta name="robots" content="noindex,nofollow">' : ''}<title>${esc(title)} · NOREX UNITED</title>
<link rel="icon" href="crest.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="widgets.css"><link rel="stylesheet" href="fx.css"><link rel="stylesheet" href="motion.css">${extraHead}<script>(function(){var H=document.documentElement,m="full";try{m=/[?&]still/.test(location.search)?"off":localStorage.getItem("norex.motion")||(matchMedia("(prefers-reduced-motion:reduce)").matches||localStorage.getItem("norex.fx")==="off"?"calm":"full")}catch(e){}H.setAttribute("data-motion",m);H.classList.add("mx");setTimeout(function(){if(!window.NorexMotion)H.classList.remove("mx")},4000);try{var t=JSON.parse(sessionStorage.getItem("norex.t")||"null");if(t&&t.kind&&m!=="off"&&Date.now()-(t.t||0)<8000)H.setAttribute("data-tin",t.kind)}catch(e){}})()</script></head>
<body class="${bodyClass}"><a class="skip" href="#main" style="position:absolute;left:-999px">Skip to content</a>
<header class="bar"><div class="wrap"><a class="lg" href="index.html"><img src="crest.png" alt="">NOREX <b>UNITED</b></a><nav class="nv" aria-label="Main">${nav}</nav><a class="keybtn sheen" data-hub href="hub.html"><span class="k">${ic('key', 18)}</span> Enter the Hub</a></div></header>
${sub ? `<div class="sub"><div class="wrap">${sub}</div></div>` : ''}
${PREVIEW ? '<div class="prevrib" role="note">PREVIEW · new design · live club data</div>' : ''}<main id="main">${body}</main><footer class="ft"><div class="wrap"><span class="ftl"><img src="crest.png" alt="" width="22" height="22"> NOREX UNITED FC · live EA data</span><button type="button" class="ftb" data-motion-settings>🎬 Motion &amp; effects</button></div></footer><nav class="tabbar" aria-label="Sections">${tabs}</nav>
<script>window.NOREX_API=${PREVIEW ? JSON.stringify(cfg.members?.api ?? null) : 'null'};window.NOREX_ICONS=${JSON.stringify(ICON)};window.NOREX=${JSON.stringify({ club: clubStats.name, group, page, title, nav: MAP.map((g) => ({ k: g.k, l: g.l, href: g.href, subs: g.subs })), players: players.map((p) => ({ k: p.k, n: p.n, ovr: p.ovr, line: p.line, goals: p.goals, assists: p.assists, rating: p.rating, arch: p.arch })), ...data })}</script><script src="session.js"></script><script src="motion.js"></script><script src="widgets.js"></script><script src="fx.js"></script><script src="cards.js"></script><script src="hub.js"></script><script src="app.js"></script><script src="pages.js"></script></body></html>`;
}
// ---------- player cards ----------
const SIL = '<svg class="fb" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><path class="sil" d="M50 14c-9 0-16 8-16 18 0 8 4 14 9 17-14 3-27 12-30 27v8h74v-8c-3-15-16-24-30-27 5-3 9-9 9-17 0-10-7-18-16-18z"/></svg>';
export const lineLabel = (p) => ({ GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' })[p.line] ?? '';
const inits = (n) => n.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
function art(p, kit = true) { return `<div class="art"><svg class="fb" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><path class="sil" d="M50 14c-9 0-16 8-16 18 0 8 4 14 9 17-14 3-27 12-30 27v8h74v-8c-3-15-16-24-30-27 5-3 9-9 9-17 0-10-7-18-16-18z"/><text class="num" x="50" y="97" text-anchor="middle">${esc(inits(p.n))}</text></svg><img class="cut" alt="" decoding="async" loading="lazy">${kit ? '<span class="kit"></span>' : ''}</div>`; }
export const cardTier = (o) => (o >= 88 ? 'icon' : o >= 80 ? 'gold' : o >= 70 ? 'silver' : o > 0 ? 'bronze' : 'plain');
const stat6 = (p) => [[p.goals, 'GLS'], [p.assists, 'AST'], [p.rating ? p.rating.toFixed(1) : '—', 'RAT'], [p.pass != null ? p.pass + '%' : '—', 'PAS'], [p.tackleRate != null ? p.tackleRate + '%' : '—', 'TKL'], [p.gp ?? '—', 'GP']].map(([v, l]) => `<div><b class="num">${v}</b><span>${l}</span></div>`).join('');
export function card(p, { s = 1, dark = false, link = true } = {}) {
  const inner = `<span class="shell"></span>${art(p)}<span class="ovr">${p.ovr ?? '—'}</span><span class="pos">${lineLabel(p)}</span><span class="crestm"><img src="crest.png" alt=""></span><span class="name">${esc(p.n)}</span>${p.arch ? `<span class="arch">${esc(p.arch)}</span>` : ''}<span class="stats">${stat6(p)}</span><span class="glare"></span><span class="gloss"><i></i></span>`;
  const attrs = `class="pc pc-card t-${cardTier(p.ovr)}${dark ? ' dark' : ''} tilt" style="--s:${s}" data-k="${esc(p.k)}" data-pos="${p.line}"`;
  return link ? `<a ${attrs} href="player-${slug(p.k)}.html" aria-label="${esc(p.n)}, rated ${p.ovr ?? 'unrated'}">${inner}</a>` : `<div ${attrs}>${inner}</div>`;
}
export function chip(p, s = 1) { return `<span class="pc pc-chip" style="--s:${s}" data-k="${esc(p.k)}"><span class="face">${art(p, false)}</span>${p.ovr ? `<span class="ovr">${p.ovr}</span>` : ''}</span>`; }
export function marker(p, { x, y, slot, ai = false, gk = false, s = 1, label }) {
  const nm = p ? esc(p.n.length > 13 ? p.n.slice(0, 12) + '…' : p.n) : (label ?? 'AI');
  return `<button type="button" class="pc pc-marker${ai ? ' ai' : ''}${gk ? ' gk' : ''}" style="left:${x}%;top:${y}%;--s:${s}" data-k="${p ? esc(p.k) : ''}" ${p ? '' : 'data-nopl'}><span class="face">${p ? art(p, false) : `<span style="display:grid;place-items:center;height:100%;font-size:22px">🧤</span>`}</span><span class="slot">${esc(slot)}</span><span class="lab">${nm}${p ? `<small>${esc(p.arch || lineLabel(p))}</small>` : '<small>AI keeper</small>'}</span></button>`;
}
export function row(p, i, val, label) { return `<a class="pc-row reveal" style="--i:${i}" href="player-${slug(p.k)}.html"><span class="rk">${i + 1}</span>${chip(p, .8)}<span><b>${esc(p.n)}</b><br><span class="muted tiny">${lineLabel(p)} · ${p.gp} games · ${label}</span></span><span class="v">${val}</span></a>`; }
export function hero(p) { return `<div class="pc pc-hero" data-k="${esc(p.k)}"><span class="bignum">${p.ovr ?? ''}</span>${art(p)}<span class="floor"></span></div>`; }
export const sbt = (v, l, cls = '', sub = '') => `<div class="sbt ${cls}"><b data-count="${v}">${v}</b><span>${l}</span>${sub ? `<em>${sub}</em>` : ''}</div>`;
export const pillRes = (r) => `<span class="pill ${r.toLowerCase()}">${r === 'W' ? 'WIN' : r === 'L' ? 'LOSS' : 'DRAW'}</span>`;
export const sample = (t = 'SAMPLE') => `<span class="sample">${t}</span>`;

// ---- icons + emoji everywhere: ribbons get a custom line icon, headings / labels / chips / nav get an emoji ----
const EMO = [[/^(played|games|matches)\b/i, '🎮'], [/^(won|wins?)$/i, '🏆'], [/^draw/i, '🤝'], [/^(lost|loss|losses)$/i, '💔'], [/goals? (scored|for)|^goals?$|^scored|golden boot|top scorers?|goal towers|^gls$/i, '⚽'], [/conceded|let in|against/i, '🧤'], [/assist|playmaker|^ast$/i, '🅰️'], [/skill rating|^rank/i, '💎'], [/goal diff/i, '⚖️'], [/rating|rated|^rat$/i, '⭐'], [/motm|man of the match/i, '🏅'], [/clean sheet|the wall/i, '🧤'], [/win rate|win %|^win$/i, '📈'], [/skill rating|^rank/i, '💎'], [/streak|current run|best win run/i, '🔥'], [/pass/i, '🎯'], [/tackle|^tkl$/i, '🛡️'], [/promotion/i, '⬆️'], [/division/i, '🏟️'], [/form/i, '📊'], [/season reel|match reel/i, '🎞️'], [/trophy|cabinet/i, '🏆'], [/legend/i, '👑'], [/hall of fame/i, '🏛️'], [/^home$/i, '🏠'], [/squad|team up/i, '👥'], [/^join|apply|recruit|trial/i, '✍️'], [/scout/i, '🔭'], [/fixture|calendar|schedule/i, '🗓️'], [/result/i, '📋'], [/opponent/i, '🆚'], [/leader/i, '🥇'], [/^players?$|^compare/i, '🧑‍🤝‍🧑'], [/tactics table|^table/i, '📐'], [/play style|how we play|playstyle/i, '🧠'], [/studio/i, '🎨'], [/build/i, '🛠️'], [/update|patch|title update/i, '📰'], [/locker/i, '🎽'], [/match night|rsvp/i, '🌙'], [/clubhouse/i, '🛋️'], [/handbook|rules/i, '📖'], [/staff|dugout/i, '🧢'], [/boardroom/i, '👑'], [/rush/i, '⚡'], [/alert|notif/i, '🔔'], [/medal|award/i, '🎖️'], [/best xi|spotlight|top performers/i, '✨'], [/scoreboard|every stat|at a glance|overview|club stats/i, '📊'], [/shape|radar/i, '🕸️'], [/tier/i, '🪙'], [/hub/i, '🔑'], [/available|availability/i, '✅'], [/vote/i, '🗳️'], [/rate|ratings/i, '⭐']];
const emo = (t) => { const s = t.replace(/&amp;/g, '&').trim(); for (const [r, e] of EMO) if (r.test(s)) return e; return ''; };
const hasEmoji = (t) => /^[^\x00-\x7F]/.test(t.trim());
const RIB = [[/glance|scoreboard|stat/i, 'chart'], [/reel|timeline/i, 'calendar'], [/trophy|cabinet|legend|tier/i, 'trophy'], [/award|medal|player of/i, 'medal'], [/tower|score|goal|performer|leaderboard|race/i, 'ball'], [/squad|meet|xi|player|spotlight|open/i, 'users'], [/shape|play|how|tactic/i, 'board'], [/hub|key/i, 'key'], [/recent|game|result/i, 'pitch'], [/flick|flip|card/i, 'spark']];
const ribIcon = (t) => (RIB.find(([r]) => r.test(t)) || [0, 'star'])[1];
function dress(h) {
  h = h.replace(/(<span class="ribbon">)([^<]+)(<\/span>)/g, (m, a, t, c) => `${a}<span class="ri">${ic(ribIcon(t), 15)}</span>${t}${c}`);
  h = h.replace(/<(h[23])([^>]*)>([^<]{2,60})</g, (m, tag, at, t) => { if (hasEmoji(t) || /^(\d|[A-Z]{1,3}\b ×)/.test(t.trim())) return m; const e = emo(t); return e ? `<${tag}${at}><span class="em" aria-hidden="true">${e}</span> ${t}<` : m; });
  h = h.replace(/(<a href="[^"]+"(?: class="[^"]*")?>)([A-Za-z][A-Za-z &\/-]{1,24})(<(?:\/a|small))/g, (m, a, t, c) => { const e = emo(t); return e && !a.includes('class="btn') ? `${a}<span class="em" aria-hidden="true">${e}</span> ${t}${c}` : m; });
  h = h.replace(/(<b data-count="[^"]*">[^<]*<\/b><span>)([^<]+)(<\/span>)/g, (m, a, t, c) => { const e = emo(t); return e ? `${a}${e} ${t}${c}` : m; });
  h = h.replace(/(<u>)([^<]{2,28})(<\/u>)/g, (m, a, t, c) => { const e = emo(t); return e && !hasEmoji(t) ? `${a}${e} ${t}${c}` : m; });
  h = h.replace(/(<button class="chip[^"]*"[^>]*>)([^<]{1,22})(<\/button>)/g, (m, a, t, c) => { if (hasEmoji(t)) return m; const POS = { GK: '🧤', DEF: '🛡️', MID: '⚙️', FWD: '🎯', All: '✨', Wins: '✅', Draws: '🤝', Losses: '❌', Goalkeepers: '🧤', Defenders: '🛡️', Midfielders: '⚙️', Forwards: '🎯', Games: '🎮', Assists: '🅰️', Goals: '⚽', Rating: '⭐', MOTM: '🏅', Tackles: '🛡️', 'Clean sheets': '🧤' }; const e = POS[t.trim()] || ''; return e ? `${a}${e} ${t}${c}` : m; });
  return h;
}

// ---- team emblems + match emoji tags ----
const CRESTCDN = 'https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l';
export const oppCrest = (crest, name = '', size = 28) => crest
  ? `<img class="ecrest" src="${CRESTCDN}${esc(crest)}.png" alt="" width="${size}" height="${size}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ecrest eb',textContent:'${esc((name[0] || '?').toUpperCase())}'}))">`
  : `<span class="ecrest eb" style="width:${size}px;height:${size}px">${esc((name[0] || '?').toUpperCase())}</span>`;
export const ownCrest = (size = 28) => `<img class="ecrest" src="crest.png" alt="" width="${size}" height="${size}">`;
export function matchTags(m) {
  const L = m.lines || [], t = [], margin = m.gf - m.ga;
  const hat = L.find((l) => l.goals >= 3); if (hat) t.push(['🎩', `Hat-trick · ${hat.n}`]);
  else if (L.some((l) => l.goals === 2)) t.push(['✌️', 'Brace']);
  if (m.ga === 0) t.push(['🧤', 'Clean sheet']);
  if (m.gf >= 5) t.push(['🔥', `${m.gf} goals scored`]);
  if (margin >= 4) t.push(['💥', 'Thrashing']);
  if (m.res === 'D' && m.gf >= 2) t.push(['🎭', 'Goal-fest draw']);
  if (m.res === 'W' && margin === 1) t.push(['😅', 'Narrow win']);
  if (m.res === 'L' && margin <= -3) t.push(['🥶', 'Heavy defeat']);
  if (L.some((l) => l.mom)) t.push(['🏅', 'Man of the match']);
  if (L.some((l) => l.rating >= 9)) t.push(['⭐', 'A 9+ performance']);
  if (m.type === 'playoffMatch') t.push(['🏟️', 'Playoff']);
  return t;
}
export const tagChips = (m, max = 3) => matchTags(m).slice(0, max).map(([e, l]) => `<span class="mtag" title="${esc(l)}">${e}</span>`).join('');
