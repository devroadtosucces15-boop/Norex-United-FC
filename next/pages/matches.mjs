import { clubStats as C, players, matches, opponents, fmtDate, teamTotals } from '../lib/data.mjs';
import * as W from '../lib/widgets.mjs';
import { oppCrest, ownCrest, tagChips, matchTags, shell, esc, chip, card, pillRes, sbt, sample, slug, lineLabel } from '../lib/ui.mjs';

const TYPE = { leagueMatch: 'League', playoffMatch: 'Playoff', friendlyMatch: 'Friendly' };
const pmap = new Map(players.map((p) => [p.n, p]));
const ini = (s) => s.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
const badge = (s, big) => `<span class="osw" style="${big ? 'width:64px;height:64px;font-size:22px' : 'width:38px;height:38px;font-size:14px'};border-radius:50%;background:var(--p3);border:1px solid var(--line2);display:inline-grid;place-items:center">${esc(ini(s))}</span>`;

// ---------- FIXTURES ----------
export function fixtures() {
  // calendar of match nights from the real archive (grouped by calendar day)
  const days = new Map(); matches.forEach((m) => { const k = new Date(m.t * 1000).toISOString().slice(0, 10); (days.get(k) ?? days.set(k, []).get(k)).push(m); });
  const keys = [...days.keys()].sort(); const months = [...new Set(keys.map((k) => k.slice(0, 7)))];
  const cal = months.map((mo) => { const [y, mm] = mo.split('-').map(Number); const first = new Date(Date.UTC(y, mm - 1, 1)), n = new Date(Date.UTC(y, mm, 0)).getUTCDate(), off = (first.getUTCDay() + 6) % 7; let cells = '';
    for (let i = 0; i < off; i++) cells += '<i></i>';
    for (let dd = 1; dd <= n; dd++) { const k = `${mo}-${String(dd).padStart(2, '0')}`, ms = days.get(k); const w = ms?.filter((x) => x.res === 'W').length ?? 0, l = ms?.filter((x) => x.res === 'L').length ?? 0;
      cells += ms ? `<a class="day played" href="match-${ms[0].id}.html" title="${ms.map((x) => `${esc(x.opp)} ${x.gf}-${x.ga}`).join(' · ')}"><b>${dd}</b><span class="${l ? 'l' : w ? 'w' : 'd'}">${ms.length}</span></a>` : `<i class="day"><b>${dd}</b></i>`; }
    return `<div class="panel reveal"><h3>${new Date(Date.UTC(y, mm - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h3><div class="cal"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>${cells}</div></div>`; }).join('');
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">Match nights</div><h2>Fixtures</h2></div><p>Every night we played, from the club archive. Upcoming nights appear here once the managers schedule them in the Hub.</p></header>
  <div class="panel reveal" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;border-color:rgba(239,207,122,.35)"><div style="font-size:38px">🗓️</div><div style="flex:1;min-width:220px"><h3 style="margin:0">Next match night</h3><p class="muted">No match night is scheduled right now.</p></div><a class="btn gold" data-hub href="hub-matchnight.html">🔑 RSVP in the Hub</a></div>
  <div class="grid g2" style="margin-top:20px" data-stagger>${cal}</div>
  <p class="muted small" style="margin-top:12px"><span class="pill w">●</span> won · <span class="pill d">●</span> drawn · <span class="pill l">●</span> a loss that night. Tap a day to open the match.</p></section></div>`;
  return shell({ group: 'matches', page: 'fixtures.html', title: 'Fixtures', body, extraHead: '<style>.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center}.cal>span{font:600 11px Inter;color:var(--mute);letter-spacing:.1em}.day{display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:1;border-radius:12px;background:var(--p1);border:1px solid var(--line);font-size:12px;color:var(--mute);position:relative}.day b{font:600 13px Inter}.day.played{background:linear-gradient(180deg,#1c2536,#131a27);color:#fff;border-color:var(--line2);transition:.3s cubic-bezier(.2,.9,.2,1)}.day.played:hover{transform:translateY(-3px) scale(1.06);border-color:var(--g2);box-shadow:0 10px 22px rgba(0,0,0,.5)}.day span{font:700 10px Oswald;border-radius:6px;padding:0 6px}.day span.w{background:#12331f;color:#4be08a}.day span.l{background:#3a1613;color:#ff7d72}.day span.d{background:#332b12;color:var(--g2)}</style>' });
}

// ---------- RESULTS ----------
// who scored / assisted, per side (EA sends totals per player, never minutes, so none are shown)
const evSide = (L = [], side) => { const g = L.filter((l) => l.goals).sort((a, b) => b.goals - a.goals).slice(0, 4), a = L.filter((l) => l.assists).sort((x, y) => y.assists - x.assists).slice(0, 3);
  const f = (l, k) => `<b>${esc(l.n)}</b>${l[k] > 1 ? `<em>×${l[k]}</em>` : ''}`;
  return `<span class="ev ${side}">${g.map((l) => `<span class="eg">⚽ ${f(l, 'goals')}</span>`).join('')}${a.map((l) => `<span class="ea">🅰️ ${f(l, 'assists')}</span>`).join('')}</span>`; };
const evRow = (m) => (m.gf + m.ga ? `<span class="evs">${evSide(m.lines, 'l')}${evSide(m.olines, 'r')}</span>` : '');
export function results() {
  const list = matches.map((m, i) => `<a class="rrow reveal" style="--i:${Math.min(i, 10)}" href="match-${m.id}.html" data-res="${m.res}" data-day="${Math.floor(m.t / 86400)}" data-gf="${m.gf}" data-ga="${m.ga}" data-opp="${esc(m.opp)}" data-type="${m.type}"><span class="rd">${fmtDate(m.t)}</span><span class="rt">${ownCrest(30)} ${esc(C.name.replace(' FC', ''))}</span><span class="rs num ${m.res}">${m.gf}<i>:</i>${m.ga}</span><span class="rt r">${esc(m.opp)} ${oppCrest(m.crest, m.opp, 30)}</span><span class="rp">${pillRes(m.res)}<small class="muted">${TYPE[m.type] ?? m.type}</small><span class="mtags">${tagChips(m, 3)}</span></span>${evRow(m)}</a>`).join('');
  // sessions: games played in one sitting (a gap of 4 hours or more starts a new one)
  const SES = []; for (const m of matches.slice().sort((a, b) => a.t - b.t)) { const cur = SES[SES.length - 1]; if (cur && m.t - cur.at[cur.at.length - 1].t < 4 * 3600) cur.at.push(m); else SES.push({ at: [m] }); }
  const sessHtml = SES.slice().reverse().map((x, i) => { const ms = x.at, w = ms.filter((m) => m.res === 'W').length, d = ms.filter((m) => m.res === 'D').length, l = ms.filter((m) => m.res === 'L').length, gf = ms.reduce((a, m) => a + m.gf, 0), ga = ms.reduce((a, m) => a + m.ga, 0);
    const tot = new Map(); for (const m of ms) for (const ln of m.lines) { if (!ln.rating) continue; const t = tot.get(ln.n) || { n: ln.n, r: 0, c: 0, g: 0 }; t.r += ln.rating; t.c++; t.g += ln.goals || 0; tot.set(ln.n, t); }
    const best = [...tot.values()].filter((t) => t.c >= Math.min(2, ms.length)).sort((a, b) => b.r / b.c - a.r / a.c)[0]; const avg = [...tot.values()].reduce((a, t) => a + t.r, 0) / Math.max(1, [...tot.values()].reduce((a, t) => a + t.c, 0));
    const res = w > l ? 'W' : l > w ? 'L' : 'D';
    return `<div class="sess ${res} reveal" style="--i:${Math.min(i, 8)}"><div class="sh"><b>${fmtDate(ms[0].t)}</b><span>${ms.length} game${ms.length === 1 ? '' : 's'}</span></div><div class="sr"><span class="w">${w}W</span><span class="d">${d}D</span><span class="l">${l}L</span><strong>${gf}–${ga}</strong></div><div class="sm">${best ? `<span>⭐ Session MVP <b>${esc(best.n)}</b> ${(best.r / best.c).toFixed(1)}</span>` : ''}<span>📈 Avg rating <b>${avg ? avg.toFixed(1) : '–'}</b></span></div><div class="sd">${ms.slice().reverse().map((m) => `<a class="${m.res}" href="match-${m.id}.html" data-res="${m.res}" data-day="${Math.floor(m.t / 86400)}" title="${esc(m.opp)} ${m.gf}-${m.ga}">${m.gf}-${m.ga}</a>`).join('')}</div></div>`; }).join('');
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">${matches.length} archived games</div><h2>Results</h2></div><div class="chips" id="rf"><button class="chip on" data-f="">All</button><button class="chip" data-f="W">Wins</button><button class="chip" data-f="D">Draws</button><button class="chip" data-f="L">Losses</button></div></header>
  <div class="sb" style="margin-bottom:20px">${sbt(C.w, 'Won', 'gold')}${sbt(C.d, 'Drawn')}${sbt(C.l, 'Lost', 'red')}${sbt(C.gf, 'Scored')}${sbt(C.ga, 'Conceded')}</div>
  <section class="sec" style="margin-bottom:22px"><header><div><span class="ribbon">Game calendar</span></div><p>Every day we played, shaded by how many games and how they went.</p></header><div class="panel reveal">${W.calendar()}</div></section>
  <div class="panel reveal" style="margin-bottom:22px"><h3>Season reel</h3><p class="muted small">Drag along the line, tap a game.</p>${W.timeline(matches.slice(0, 14))}</div>
  <div class="chips" id="rv" style="margin-bottom:14px"><span class="muted small">View</span><button class="chip on" data-v="rows">Broadcast rows</button><button class="chip" data-v="led">Ledger</button><button class="chip" data-v="ses">Sessions</button></div>
  <div class="rfs" id="rfs" role="status" aria-live="polite" hidden></div><div class="rfsum" id="rfsumTop" hidden></div><div class="rlist" id="rl">${list}</div><div class="rfe" id="rfe" hidden><span aria-hidden="true">🔍</span><b>No games match</b><p class="muted small">Nothing in the archive fits that filter.</p><button class="chip on" type="button" id="rfclear">Show all games</button></div><div id="rled" hidden>${W.ledger(matches)}</div><div id="rses" class="sesl" hidden>${sessHtml}</div><script>document.getElementById('rv').addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;[].forEach.call(this.querySelectorAll('.chip'),function(x){x.classList.toggle('on',x===b)});var v=b.dataset.v;document.getElementById('rl').hidden=v!=='rows';document.getElementById('rled').hidden=v!=='led';document.getElementById('rses').hidden=v!=='ses';if(window.NorexWidgets)NorexWidgets.init();});</script><p class="muted small" style="margin-top:14px">League, playoff and friendly games come from EA. Rush games are logged by members and confirmed by managers, so they are not in this archive.</p></section></div>`;
  return shell({ group: 'matches', page: 'results.html', title: 'Results', body, extraHead: '<style>.rlist{display:grid;gap:10px}.rrow{display:grid;grid-template-columns:70px 1fr 120px 1fr 120px;gap:14px;align-items:center;padding:14px 20px;border-radius:16px;background:linear-gradient(90deg,var(--p2),var(--p1));border:1px solid var(--line);transition:.3s cubic-bezier(.2,.9,.2,1);position:relative;overflow:hidden}.rrow:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--line2)}.rrow[data-res=W]:before{background:#22b35e}.rrow[data-res=L]:before{background:var(--red)}.rrow[data-res=D]:before{background:var(--g3)}.evs{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;padding-top:10px;margin-top:2px;border-top:1px dashed var(--line)}.ev{display:flex;flex-wrap:wrap;gap:5px;align-content:flex-start}.ev.r{justify-content:flex-end}.ev span{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;background:var(--p3);font:500 12px Inter;color:var(--soft);white-space:nowrap;max-width:100%}.ev b{font-weight:600;color:var(--tx,#eef2f9);overflow:hidden;text-overflow:ellipsis}.ev em{font:700 11px Oswald;font-style:normal;color:var(--g2)}.ev .ea{background:transparent;border:1px solid var(--line)}.rrow:hover{transform:translateX(5px);border-color:rgba(239,207,122,.4)}.rd{color:var(--soft);font-size:13px}.rt{font:600 17px Oswald;text-transform:uppercase;letter-spacing:.04em}.rt.r{text-align:right}.rs{font-size:32px;text-align:center}.rs i{font-style:normal;color:var(--mute);margin:0 4px}.rp{display:flex;flex-direction:column;align-items:flex-end;gap:2px}@media(max-width:820px){.rrow{grid-template-columns:1fr auto;grid-template-areas:"d p" "t s" "o s" "e e";gap:4px 12px;padding:14px}.rd{grid-area:d}.rp{grid-area:p;flex-direction:row;align-items:center;gap:8px}.rt:nth-of-type(2){grid-area:t}.rt.r{grid-area:o;text-align:left;color:var(--soft);font-size:14px}.rs{grid-area:s;font-size:38px}.evs{grid-area:e;grid-template-columns:1fr;gap:6px;margin-top:6px}.ev.r{justify-content:flex-start}}</style>' });
}

// ---------- MATCH PAGE (broadcast) ----------
// ---------- MATCH FACTS: Field view (default) + Table view ----------
// Only numbers EA sends per match. EA gives each player one of four roles (GK/DEF/MID/FWD), not an exact spot, so players are spread
// evenly across their line. AI teammates are not recorded by EA and are only counted, never drawn.
const ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
const ROWY = { GK: 92.5, DEF: 80, MID: 68, FWD: 57.5 }, SOLOY = { GK: 89, DEF: 68, MID: 45, FWD: 21 };
const rcls = (r) => (r >= 8 ? 'hi' : r >= 7 ? 'mid' : r >= 6 ? 'lo' : 'bad');
const pct = (a, b) => (b ? Math.round(a / b * 100) : null);
function markers(L, side) {
  const by = { GK: [], DEF: [], MID: [], FWD: [] }; L.forEach((l) => by[l.line].push(l));
  return Object.entries(by).flatMap(([line, arr]) => arr.sort((a, b) => b.rating - a.rating).map((l, i) => {
    const x = ((i + 1) / (arr.length + 1)) * 100, y = side === 'us' ? ROWY[line] : 100 - ROWY[line], ys = side === 'us' ? SOLOY[line] : 100 - SOLOY[line], p = side === 'us' ? pmap.get(l.n) : null;
    const st = { n: l.n, line, arch: l.arch, r: l.rating, g: l.goals, a: l.assists, sa: l.sa, sh: l.shots, pm: l.pm, pa: l.pa, drb: l.drb, tm: l.tm, ta: l.ta, sv: l.saves, red: l.red, mom: l.mom, min: Math.round(l.secs / 60), k: p ? p.k : '' };
    const pips = `${l.goals ? `<i class="pg">⚽${l.goals > 1 ? l.goals : ''}</i>` : ''}${l.assists ? `<i class="pa">🅰️${l.assists > 1 ? l.assists : ''}</i>` : ''}${l.red ? '<i class="pr">🟥</i>' : ''}`;
    return `<button type="button" class="fm ${side} ${rcls(l.rating)}${l.mom ? ' mom' : ''}" style="left:${x.toFixed(1)}%;--yb:${y}%;--ys:${ys}%" data-yb="${y}" data-ys="${ys}" data-s="${esc(JSON.stringify(st))}" aria-label="${esc(`${l.n}, ${line}, rated ${l.rating.toFixed(1)}`)}">
<span class="fring">${p ? chip(p, .62) : `<span class="fini">${esc(ini(l.n) || '?')}</span>`}</span>${l.mom ? '<span class="fcrown" aria-hidden="true">👑</span>' : ''}<span class="frt">${l.rating ? l.rating.toFixed(1) : '–'}</span>${pips ? `<span class="fpips">${pips}</span>` : ''}<span class="fnm">${esc(l.n)}</span></button>`;
  })).join('');
}
const CMP = [['goals', '⚽ Goals'], ['shots', '🎯 Shots'], ['pm', '🔁 Passes'], ['pass', '📐 Pass accuracy', '%'], ['drb', '🏃 Dribbles'], ['sa', '🪄 Pre-assists'], ['tm', '🛡️ Tackles won'], ['tackle', '🧲 Tackle success', '%'], ['saves', '🧤 Saves'], ['rating', '⭐ Avg rating'], ['red', '🟥 Red cards'], ['humans', '🎮 Real players']];
function compare(a, b) {
  return `<div class="cmp rv-g">${CMP.map(([k, l, suf = '']) => { const x = a[k] ?? 0, y = b[k] ?? 0, t = (+x) + (+y) || 1, win = k === 'red' ? (x < y ? 'l' : x > y ? 'r' : '') : (x > y ? 'l' : x < y ? 'r' : '');
    return `<div class="crow ${win}"><b class="cv">${x ?? '–'}${x != null ? suf : ''}</b><span class="cl">${l}</span><b class="cv">${y ?? '–'}${y != null ? suf : ''}</b><span class="cbar l"><i style="--v:${(+x / t).toFixed(3)}"></i></span><span class="cbar r"><i style="--v:${(+y / t).toFixed(3)}"></i></span></div>`; }).join('')}</div>`;
}
function motmCard(l, p) {
  const st = [[l.goals, 'Goals'], [l.assists, 'Assists'], [l.shots, 'Shots'], [l.pa ? `${pct(l.pm, l.pa)}%` : '–', 'Passing'], [l.drb, 'Dribbles'], [l.ta ? `${l.tm}/${l.ta}` : '0', 'Tackles']];
  return `<div class="mcard"><div class="mc-top"><span class="mc-lab">🏅 Man of the match</span><b class="mc-r ${rcls(l.rating)}">${l.rating.toFixed(1)}</b></div>
<div class="mc-who">${p ? chip(p, 1.3) : `<span class="fini big">${esc(ini(l.n))}</span>`}<div><b class="mc-n fit" title="${esc(l.n)}">${esc(l.n)}</b><span class="muted small">${l.line}${l.arch ? ' · ' + esc(l.arch) : ''} · ${Math.round(l.secs / 60)}′</span></div></div>
<div class="mc-st">${st.map(([v, k]) => `<div><b class="num">${v}</b><span>${k}</span></div>`).join('')}</div><p class="muted tiny" style="margin:10px 0 0;text-align:center">This game only</p></div>`;
}
const head = ['Player', 'Pos', 'Rating', 'G', 'A', 'Pre-A', 'Shots', 'Passes', 'Drb', 'Tackles', 'Saves', ''];
function table(L, us) {
  return `<div class="tscroll"><table class="tb mt"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${[...L].sort((a, b) => b.rating - a.rating).map((l) => { const p = us ? pmap.get(l.n) : null;
    return `<tr><td class="tn">${p ? chip(p, .5) : `<span class="fini sm">${esc(ini(l.n))}</span>`}${p ? `<a href="player-${slug(p.k)}.html" class="fit" title="${esc(l.n)}">${esc(l.n)}</a>` : `<span class="fit" title="${esc(l.n)}">${esc(l.n)}</span>`}</td><td class="muted">${l.line}</td><td><b class="rt ${rcls(l.rating)}">${l.rating ? l.rating.toFixed(1) : '–'}</b></td><td>${l.goals || ''}</td><td>${l.assists || ''}</td><td>${l.sa || ''}</td><td>${l.shots || ''}</td><td>${l.pm}/${l.pa}</td><td>${l.drb || ''}</td><td>${l.tm}/${l.ta}</td><td>${l.saves || ''}</td><td>${l.mom ? '🏅' : ''}${l.red ? '🟥' : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
}
export function match(m) {
  const us = teamTotals(m.lines), them = teamTotals(m.olines || []);
  const motm = m.lines.find((l) => l.mom), mp = motm && pmap.get(motm.n);
  const omotm = (m.olines || []).find((l) => l.mom);
  const sc = (L) => L.filter((l) => l.goals).map((l) => `<li>⚽ ${esc(l.n)}${l.goals > 1 ? ` <em>×${l.goals}</em>` : ''}</li>`).join('');
  const ai = (L) => (L.length < 11 ? `<span class="fai">🤖 +${11 - L.length} AI</span>` : '');
  const poster = { opp: m.opp, crest: m.crest, gf: m.gf, ga: m.ga, res: m.res, date: fmtDate(m.t, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), type: TYPE[m.type] ?? 'Match',
    us: m.lines.filter((l) => l.goals).map((l) => [l.n, l.goals]), them: (m.olines || []).filter((l) => l.goals).map((l) => [l.n, l.goals]), motm: motm ? [motm.n, motm.rating] : null, tags: matchTags(m).slice(0, 3).map(([e, l]) => e + ' ' + l) };
  const body = `<div class="wrap"><a class="muted small" href="results.html" style="display:inline-block;margin:24px 0 0">← Results</a>
  <section class="panel mhero ${m.res} reveal" style="view-transition-name:mcard">
   <div class="eyebrow">${TYPE[m.type] ?? 'Match'} · ${fmtDate(m.t, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
   <div class="mh-grid"><div class="mh-t"><img src="crest.png" alt="" width="84" height="84"><div class="osw mh-n">${esc(C.name)}</div><ul class="mh-sc">${sc(m.lines)}</ul></div>
   <div class="mh-mid"><div class="num mh-score">${m.gf}<span>:</span>${m.ga}</div>${pillRes(m.res)}</div>
   <div class="mh-t">${oppCrest(m.crest, m.opp, 84)}<div class="osw mh-n">${esc(m.opp)}</div><ul class="mh-sc">${sc(m.olines || [])}</ul></div></div>
   <div class="mtags big" style="margin-top:16px;justify-content:center">${matchTags(m).map(([e, l]) => `<span class="mtag">${e} <small>${esc(l)}</small></span>`).join('')}</div>
   <div class="mh-act"><div class="seg" role="tablist" aria-label="Match view"><button type="button" role="tab" class="on" aria-selected="true" data-mv="field">🏟️ Field</button><button type="button" role="tab" aria-selected="false" data-mv="table">📋 Table</button></div><button type="button" class="btn ghost" id="mposter">⬇️ Result graphic</button></div>
   <script type="application/json" id="mposterdata">${JSON.stringify(poster).replace(/</g, '\\u003c')}</script></section>
  <div id="mv-field" class="mv">
   <div class="mfield-grid">
    <div class="panel reveal mpitch-panel"><div class="seg sm pteam" role="tablist" aria-label="Show team"><button type="button" role="tab" class="on" aria-selected="true" data-pt="both">⚔️ Both</button><button type="button" role="tab" aria-selected="false" data-pt="us">🔴 Us</button><button type="button" role="tab" aria-selected="false" data-pt="them">⚪ ${esc(m.opp)}</button></div><div class="mp-head mp-them"><span>${oppCrest(m.crest, m.opp, 22)} ${esc(m.opp)}</span>${ai(m.olines || [])}</div>
     <div class="mpitch" id="mfield"><svg class="mp-lines" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".35"><rect x="1" y="1" width="66" height="103" pathLength="1"/><line x1="1" y1="52.5" x2="67" y2="52.5" pathLength="1"/><circle cx="34" cy="52.5" r="9.15" pathLength="1"/><rect x="13.8" y="1" width="40.3" height="16.5" pathLength="1"/><rect x="13.8" y="87.5" width="40.3" height="16.5" pathLength="1"/><rect x="24.8" y="1" width="18.3" height="5.5" pathLength="1"/><rect x="24.8" y="98.5" width="18.3" height="5.5" pathLength="1"/></g></svg>
      ${markers(m.olines || [], 'them')}${markers(m.lines, 'us')}</div>
     <div class="mp-head mp-us"><span><img src="crest.png" alt="" width="22" height="22"> ${esc(C.name)}</span>${ai(m.lines)}</div>
     <p class="muted tiny mp-note">Tap a player for their numbers. Ring colour = rating (green 8+, gold 7+, grey 6+, red below).</p></div>
    <div class="mside">
     <div class="panel reveal"><h3>📊 Team comparison</h3><div class="cmp-h"><span><img src="crest.png" alt="" width="20" height="20"> Us</span><span>${esc(m.opp)} ${oppCrest(m.crest, m.opp, 20)}</span></div>${compare(us, them)}</div>
     <div data-insight="${matches[0] === m ? 'match.latest' : 'match.' + esc(m.id)}" hidden></div><div data-insight="h2h.${esc(m.oppId)}" hidden></div>
     ${motm ? `<div class="panel reveal">${motmCard(motm, mp)}</div>` : omotm ? `<div class="panel reveal"><p class="muted" style="margin:0">🏅 Man of the match went to <b>${esc(omotm.n)}</b> (${esc(m.opp)}), rated ${omotm.rating.toFixed(1)}.</p></div>` : ''}
    </div></div></div>
  <div id="mv-table" class="mv" hidden>
   <div class="panel flat reveal"><h3><img src="crest.png" alt="" width="22" height="22" style="vertical-align:-5px"> ${esc(C.name)}</h3>${table(m.lines, true)}</div>
   <div class="panel flat reveal" style="margin-top:22px"><h3>${oppCrest(m.crest, m.opp, 22)} ${esc(m.opp)}</h3>${table(m.olines || [], false)}</div></div>
  <p class="muted small" style="margin:14px 0 0">Every number comes from EA's match record. EA lists each player as GK, DEF, MID or FWD (not an exact spot) and does not publish possession or a goal timeline, so those are not shown. AI teammates are not recorded by EA.</p></div>`;
  return shell({ group: 'matches', page: 'results.html', title: `${C.name} ${m.gf}-${m.ga} ${m.opp}`, body });
}

const OTB_CSS = '<style>.otw{padding:6px 4px}.otb{width:100%;border-collapse:collapse;table-layout:auto}.otb th{font:600 11px Inter;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);text-align:center;padding:10px 8px;border-bottom:1px solid var(--line2);white-space:nowrap}.otb th:first-child{text-align:left}.otb td{padding:10px 8px;text-align:center;border-bottom:1px solid var(--line);vertical-align:middle;white-space:nowrap}.otb tbody tr:last-child td{border-bottom:0}.otb tbody tr:hover{background:rgba(255,255,255,.03)}.otb td.oc{text-align:left;white-space:normal;width:99%}.otb .opl{display:flex;align-items:center;gap:10px;min-width:0}.otb .opl span{display:grid;min-width:0}.otb .opl b{font:600 15px Oswald;text-transform:uppercase;letter-spacing:.03em;overflow:hidden;text-overflow:ellipsis}.otb .opl small{font:500 11px Inter;color:var(--mute)}.otb .num{font:600 15px Oswald}.otb .owl b{display:inline-block;min-width:26px;padding:3px 0;border-radius:7px;font:700 13px Oswald;text-align:center;margin:0 2px}.otb .owl .w{background:#12331f;color:#4be08a}.otb .owl .d{background:#332b12;color:var(--g2)}.otb .owl .l{background:#3a1613;color:#ff7d72}@media(max-width:700px){.otb .hm{display:none}.otb th,.otb td{padding:9px 5px}.otb .opl b{font-size:14px}.otb .owl b{min-width:22px;font-size:12px;margin:0 1px}.otb th{font-size:10px;letter-spacing:.06em}}</style>';
// ---------- OPPONENTS ----------
// Burner clubs are NOT opponents: they live on their own page (burners.html, Stats menu).
export function opps() {
  const tr = opponents.map((o) => `<tr><td class="oc"><a href="opp-${esc(o.id)}.html" class="opl" aria-label="Scouting report on ${esc(o.n)}">${oppCrest(o.crest, o.n, 34)}<span><b>${esc(o.n)}</b><small>${o.div ? 'Div ' + o.div : ''}${o.sr ? ' · SR ' + o.sr : ''}</small></span></a></td><td class="num">${o.p}</td><td class="owl"><b class="w">${o.w}</b><b class="d">${o.d}</b><b class="l">${o.l}</b></td><td class="num gl">${o.gf}–${o.ga}</td><td class="hm">${W.h2h(o.id)}</td><td class="muted hm">${fmtDate(o.last, { day: 'numeric', month: 'short' })}</td></tr>`).join('');
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">Know your rivals</div><h2>Opponents</h2></div><a class="btn ghost" href="burners.html">🔥 Burner clubs</a></header>
  <div class="panel flat reveal otw hscroll"><table class="otb"><thead><tr><th>Club</th><th>P</th><th>W · D · L</th><th>Goals</th><th class="hm">Meetings</th><th class="hm">Last</th></tr></thead><tbody>${tr}</tbody></table></div>
  <p class="muted small" style="margin-top:12px">Tap a club for its scouting report. Burner clubs (temporary clubs members start for casual league games) are not opponents and have their own page under Stats.</p></section></div>`;
  return shell({ group: 'matches', page: 'opponents.html', title: 'Opponents', body, extraHead: OTB_CSS });
}

// ---------- OPPONENT SCOUTING REPORT (D4) ----------
// Everything below is counted from the match records EA sends for the games we played against this club (their side's players are listed per game).
const OPP_CSS = '<style>.olist{display:grid;gap:8px}.om{display:grid;grid-template-columns:92px 1fr auto auto;gap:14px;align-items:center;padding:12px 16px;border-radius:14px;background:linear-gradient(90deg,var(--p2),var(--p1));border:1px solid var(--line);position:relative;overflow:hidden;transition:.25s}.om:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--line2)}.om[data-res=W]:before{background:#22b35e}.om[data-res=L]:before{background:var(--red)}.om[data-res=D]:before{background:var(--g3)}.om:hover{transform:translateX(4px);border-color:rgba(239,207,122,.4)}.omt{color:var(--soft);font-size:13px}.oms{font:600 24px Oswald}a.opl{color:inherit}a.opl:hover{color:var(--g2)}</style>';
export function oppPage(o) {
  const ms = matches.filter((m) => m.oppId === o.id); // newest first
  const agg = new Map();
  for (const m of ms) for (const l of m.olines || []) { const a = agg.get(l.n) ?? { n: l.n, g: 0, goals: 0, assists: 0, mom: 0, r: 0, rn: 0, lines: {} }; a.g++; a.goals += l.goals; a.assists += l.assists; a.mom += l.mom; if (l.rating > 0) { a.r += l.rating; a.rn++; } a.lines[l.line] = (a.lines[l.line] || 0) + 1; agg.set(l.n, a); }
  const them = [...agg.values()].map((a) => ({ ...a, avg: a.rn ? a.r / a.rn : null, line: Object.entries(a.lines).sort((x, y) => y[1] - x[1])[0][0] })).sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || b.g - a.g || (b.avg ?? 0) - (a.avg ?? 0));
  const shapeOf = (L) => { const c = { DEF: 0, MID: 0, FWD: 0 }; L.forEach((l) => c[l.line] != null && c[l.line]++); return `${c.DEF}-${c.MID}-${c.FWD}`; };
  const shp = new Map(); ms.forEach((m) => { if ((m.olines || []).length === 11) { const k = shapeOf(m.olines); shp.set(k, (shp.get(k) || 0) + 1); } });
  const shape = [...shp].sort((a, b) => b[1] - a[1])[0];
  const avg = (L) => { const r = L.filter((l) => l.rating > 0); return r.length ? r.reduce((a, l) => a + l.rating, 0) / r.length : null; };
  const ourR = avg(ms.flatMap((m) => m.lines)), theirR = avg(ms.flatMap((m) => m.olines || []));
  const best = ms.reduce((a, m) => (!a || m.gf - m.ga > a.gf - a.ga ? m : a), null), worst = ms.reduce((a, m) => (!a || m.gf - m.ga < a.gf - a.ga ? m : a), null);
  const cs = ms.filter((m) => m.ga === 0).length;
  const ourStars = (() => { const t = new Map(); ms.forEach((m) => m.lines.forEach((l) => { const a = t.get(l.n) ?? { n: l.n, g: 0, goals: 0, assists: 0 }; a.g++; a.goals += l.goals; a.assists += l.assists; t.set(l.n, a); })); return [...t.values()].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))[0]; })();
  const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const facts = [
    shape && ['🧩', `Usual shape: ${shape[0]}`, `${shape[1]} of ${ms.length} meeting${ms.length === 1 ? '' : 's'} when EA listed all eleven players.`],
    them[0] && them[0].goals + them[0].assists > 0 && ['🎯', `Biggest threat: ${them[0].n}`, `${pl(them[0].goals, 'goal')} and ${pl(them[0].assists, 'assist')} against us in ${pl(them[0].g, 'game')}.`],
    ['🥅', `${o.gf} scored, ${o.ga} conceded`, `${(o.gf / o.p).toFixed(1)} a game for us, ${(o.ga / o.p).toFixed(1)} against.${cs ? ` Clean sheet in ${cs} of ${o.p}.` : ''}`],
    ourR && theirR && ['📈', `Rating: us ${ourR.toFixed(1)} · them ${theirR.toFixed(1)}`, ourR >= theirR ? 'Our players have rated higher in these games.' : 'Their players have rated higher in these games.'],
    ourStars && ourStars.goals + ourStars.assists > 0 && ['⭐', `Best against them: ${ourStars.n}`, `${pl(ourStars.goals, 'goal')} and ${pl(ourStars.assists, 'assist')} in ${pl(ourStars.g, 'game')}.`],
  ].filter(Boolean);
  const game = (m) => `<a class="om" href="match-${m.id}.html" data-res="${m.res}"><span class="muted small">${fmtDate(m.t)}</span><span class="omt">${m.type === 'playoffMatch' ? 'Playoff' : 'League'}</span><b class="oms">${m.gf}–${m.ga}</b>${pillRes(m.res)}</a>`;
  const prow = (a) => `<tr><td><b>${esc(a.n)}</b></td><td>${a.line}</td><td class="num">${a.g}</td><td class="num">${a.goals}</td><td class="num">${a.assists}</td><td class="num">${a.avg != null ? a.avg.toFixed(1) : '–'}</td><td class="num">${a.mom || ''}</td></tr>`;
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><a class="muted small" href="opponents.html">← All opponents</a>
  <header style="margin-top:10px"><div style="display:flex;gap:16px;align-items:center;min-width:0">${oppCrest(o.crest, o.n, 84)}<div style="min-width:0"><div class="eyebrow">Scouting report</div><h2 style="margin:0;overflow-wrap:anywhere">${esc(o.n)}</h2><div class="muted small">${[o.div ? 'Division ' + o.div : '', o.sr ? 'SR ' + o.sr : '', o.rank ? 'Rank #' + o.rank : ''].filter(Boolean).join(' · ') || 'No league standing in our data'}</div></div></div></header>
  <div class="sb" style="margin-top:18px;grid-template-columns:repeat(auto-fit,minmax(86px,1fr))">${sbt(o.p, 'Played')}${sbt(o.w, 'Won', 'gold')}${sbt(o.d, 'Drawn')}${sbt(o.l, 'Lost', 'red')}${sbt(o.gf, 'Scored')}${sbt(o.ga, 'Conceded', 'red')}</div>
  <p style="margin:10px 0 0" class="muted small">Form against them (oldest → newest) ${W.h2h(o.id)}${best ? ` · best result ${best.gf}–${best.ga}${worst && worst.gf < worst.ga ? `, heaviest loss ${worst.gf}–${worst.ga}` : ''}` : ''}</p></section>
  <section class="sec"><header><div><span class="ribbon">What we know</span></div><p>Counted from the ${pl(o.p, 'game')} we have played them, taken from our saved match archive.</p></header><div class="grid g2" data-stagger>${facts.map(([e, t, d]) => `<div class="panel" style="height:100%"><div style="display:flex;gap:12px"><span style="font-size:26px" aria-hidden="true">${e}</span><div><b>${esc(t)}</b><p class="muted small" style="margin:4px 0 0">${esc(d)}</p></div></div></div>`).join('')}</div>
   <div data-insight="h2h.${esc(o.id)}" hidden></div></section>
  <section class="sec"><header><div><span class="ribbon">Players we have faced</span></div><p>Only humans EA records; AI teammates are not listed. Sorted by goals plus assists.</p></header>${them.length ? `<div class="panel flat" style="overflow-x:auto"><table class="tb"><thead><tr><th>Player</th><th>Line</th><th>GP</th><th>G</th><th>A</th><th>Avg rating</th><th>MOM</th></tr></thead><tbody>${them.map(prow).join('')}</tbody></table></div>` : '<p class="muted">EA did not list their players for these games.</p>'}</section>
  <section class="sec"><header><div><span class="ribbon">Every meeting</span></div></header><div class="olist">${ms.map(game).join('')}</div></section></div>`;
  return shell({ group: 'matches', page: 'opponents.html', title: `Scouting report · ${o.n}`, body, extraHead: OPP_CSS });
}

export default function (P) {
  P('fixtures.html', fixtures()); P('results.html', results()); P('opponents.html', opps());
  for (const m of matches) P(`match-${m.id}.html`, match(m));
  for (const o of opponents) P(`opp-${o.id}.html`, oppPage(o));
}
