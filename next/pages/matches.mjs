import { clubStats as C, players, matches, opponents, burners, fmtDate, teamTotals } from '../lib/data.mjs';
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
export function results() {
  const list = matches.map((m, i) => `<a class="rrow reveal" style="--i:${Math.min(i, 10)}" href="match-${m.id}.html" data-res="${m.res}" data-type="${m.type}"><span class="rd">${fmtDate(m.t)}</span><span class="rt">${ownCrest(30)} ${esc(C.name.replace(' FC', ''))}</span><span class="rs num ${m.res}">${m.gf}<i>:</i>${m.ga}</span><span class="rt r">${esc(m.opp)} ${oppCrest(m.crest, m.opp, 30)}</span><span class="rp">${pillRes(m.res)}<small class="muted">${TYPE[m.type] ?? m.type}</small><span class="mtags">${tagChips(m, 3)}</span></span></a>`).join('');
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">${matches.length} archived games</div><h2>Results</h2></div><div class="chips" id="rf"><button class="chip on" data-f="">All</button><button class="chip" data-f="W">Wins</button><button class="chip" data-f="D">Draws</button><button class="chip" data-f="L">Losses</button></div></header>
  <div class="sb" style="margin-bottom:20px">${sbt(C.w, 'Won', 'gold')}${sbt(C.d, 'Drawn')}${sbt(C.l, 'Lost', 'red')}${sbt(C.gf, 'Scored')}${sbt(C.ga, 'Conceded')}</div>
  <section class="sec" style="margin-bottom:22px"><header><div><span class="ribbon">Game calendar</span></div><p>Every day we played, shaded by how many games and how they went.</p></header><div class="panel reveal">${W.calendar()}</div></section>
  <section class="sec" style="margin-bottom:22px"><header><div><span class="ribbon">Match reel</span></div><p>Tap a night to jump to it.</p></header>${W.reel(matches.slice(0, 12))}</section>
  <div class="grid g2" style="margin-bottom:22px"><div class="panel reveal"><h3>Season reel</h3><p class="muted small">Drag along the line, tap a game.</p>${W.timeline(matches.slice(0, 14))}</div><div class="panel reveal" style="--i:1"><h3>Form · last 10</h3>${W.formWave(matches.slice(0, 10))}</div></div>
  <div class="chips" id="rv" style="margin-bottom:14px"><span class="muted small">View</span><button class="chip on" data-v="rows">Broadcast rows</button><button class="chip" data-v="led">Ledger</button></div>
  <div class="rlist" id="rl">${list}</div><div id="rled" hidden>${W.ledger(matches)}</div><script>document.getElementById('rv').addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;[].forEach.call(this.querySelectorAll('.chip'),function(x){x.classList.toggle('on',x===b)});var led=b.dataset.v==='led';document.getElementById('rl').hidden=led;document.getElementById('rled').hidden=!led;if(window.NorexWidgets)NorexWidgets.init();});</script><p class="muted small" style="margin-top:14px">League, playoff and friendly games come from EA. Rush games are logged by members and confirmed by managers, so they are not in this archive.</p></section></div>`;
  return shell({ group: 'matches', page: 'results.html', title: 'Results', body, extraHead: '<style>.rlist{display:grid;gap:10px}.rrow{display:grid;grid-template-columns:70px 1fr 120px 1fr 120px;gap:14px;align-items:center;padding:14px 20px;border-radius:16px;background:linear-gradient(90deg,var(--p2),var(--p1));border:1px solid var(--line);transition:.3s cubic-bezier(.2,.9,.2,1);position:relative;overflow:hidden}.rrow:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--line2)}.rrow[data-res=W]:before{background:#22b35e}.rrow[data-res=L]:before{background:var(--red)}.rrow[data-res=D]:before{background:var(--g3)}.rrow:hover{transform:translateX(5px);border-color:rgba(239,207,122,.4)}.rd{color:var(--soft);font-size:13px}.rt{font:600 17px Oswald;text-transform:uppercase;letter-spacing:.04em}.rt.r{text-align:right}.rs{font-size:32px;text-align:center}.rs i{font-style:normal;color:var(--mute);margin:0 4px}.rp{display:flex;flex-direction:column;align-items:flex-end;gap:2px}@media(max-width:820px){.rrow{grid-template-columns:1fr auto;grid-template-areas:"d p" "t s" "o s";gap:4px 12px;padding:14px}.rd{grid-area:d}.rp{grid-area:p;flex-direction:row;align-items:center;gap:8px}.rt:nth-of-type(2){grid-area:t}.rt.r{grid-area:o;text-align:left;color:var(--soft);font-size:14px}.rs{grid-area:s;font-size:38px}}</style>' });
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

// ---------- OPPONENTS (+ burner clubs) ----------
export function opps() {
  const tr = opponents.map((o) => `<tr><td>${oppCrest(o.crest, o.n, 38)}</td><td><b>${esc(o.n)}</b><div class="muted tiny">${o.div ? 'Division ' + o.div : ''}${o.sr ? ' · SR ' + o.sr : ''}</div></td><td class="num">${o.p}</td><td><span class="pill w">${o.w}</span> <span class="pill d">${o.d}</span> <span class="pill l">${o.l}</span></td><td>${W.h2h(o.id)}</td><td class="num">${o.gf}–${o.ga}</td><td class="muted">${fmtDate(o.last, { day: 'numeric', month: 'short' })}</td></tr>`).join('');
  const bur = burners.map((b) => `<div class="panel reveal"><div style="display:flex;gap:12px;align-items:center">${badge(b.n, true)}<div><h3 style="margin:0">${esc(b.n)}</h3><div class="muted small">Division ${b.div} · SR ${b.sr} · ${b.roster} players seen</div></div></div><div class="sb" style="margin-top:14px;grid-template-columns:repeat(4,1fr)">${sbt(b.gp, 'Played')}${sbt(b.w, 'Won', 'gold')}${sbt(b.l, 'Lost', 'red')}${sbt(b.gf - b.ga >= 0 ? '+' + (b.gf - b.ga) : b.gf - b.ga, 'GD')}</div><p class="muted tiny" style="margin-top:10px">Tracked since ${fmtDate(Date.parse(b.tracked) / 1000, { day: 'numeric', month: 'short' })}. Burner clubs are opponent tracking: they never count in our League totals.</p></div>`).join('');
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">Know your rivals</div><h2>Opponents</h2></div><div class="chips" id="ot"><button class="chip on" data-t="o">Rivals we have played</button><button class="chip" data-t="b">Burner clubs · ${burners.length}</button></div></header>
  <div id="po" class="panel flat reveal" style="overflow-x:auto"><table class="tb"><thead><tr><th></th><th>Club</th><th>P</th><th>W · D · L</th><th>Meetings</th><th>Goals</th><th>Last</th></tr></thead><tbody>${tr}</tbody></table></div>
  <div id="pb" hidden><p class="muted" style="margin-bottom:14px">Burner clubs are throwaway clubs the managers track as opponents. They are not scouting: scouting is recruitment and lives in Club.</p><div class="grid g2">${bur}</div></div></section></div>`;
  return shell({ group: 'matches', page: 'opponents.html', title: 'Opponents', body });
}

export default function (P) {
  P('fixtures.html', fixtures()); P('results.html', results()); P('opponents.html', opps());
  for (const m of matches) P(`match-${m.id}.html`, match(m));
}
