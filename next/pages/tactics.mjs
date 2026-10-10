import { players, updates, game, shapes, matches, usualXI, ARCH } from '../lib/data.mjs';
import { shell, esc, sample } from '../lib/ui.mjs';
import { formations, roles } from './stats.mjs';

const xi = usualXI();
const xiKeys = Object.fromEntries(Object.entries(xi).map(([s, p]) => [s, p?.k]));
export const pfin = () => `<div class="chips pfin"><span class="muted small">Pitch finish</span>${[['grass', 'Striped grass'], ['night', 'Floodlit night'], ['blue', 'Blueprint'], ['chalk', 'Chalkboard']].map(([k, l]) => `<button class="chip" data-pf="${k}">${l}</button>`).join('')}</div>`;
const full = shapes.reduce((a, s) => a + s[1], 0);

// ---------- real numbers for the tactics pages (all from the match archive) ----------
// What we actually fielded: EA fills empty slots with AI, so each league game is 11v11 but the humans form a smaller shape.
export const fielded = (() => {
  const by = new Map();
  for (const m of matches) {
    const c = { GK: 0, DEF: 0, MID: 0, FWD: 0 }; m.lines.forEach((l) => c[l.line]++);
    const k = `${m.lines.length}|${c.GK}|${c.DEF}-${c.MID}-${c.FWD}`;
    const r = by.get(k) ?? { humans: m.lines.length, gk: c.GK > 0, shape: `${c.DEF}-${c.MID}-${c.FWD}`, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    r.p++; r[m.res.toLowerCase()]++; r.gf += m.gf; r.ga += m.ga; by.set(k, r);
  }
  return [...by.values()].sort((a, b) => b.p - a.p || b.humans - a.humans);
})();
const rec = (rows) => rows.reduce((a, r) => ({ p: a.p + r.p, w: a.w + r.w, d: a.d + r.d, l: a.l + r.l, gf: a.gf + r.gf, ga: a.ga + r.ga }), { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
export const fieldedSplit = { full: rec(fielded.filter((r) => r.humans === 11)), short: rec(fielded.filter((r) => r.humans < 11)), humanGK: rec(fielded.filter((r) => r.gk)), aiGK: rec(fielded.filter((r) => !r.gk)) };
// How each line performs (per archived appearance), and who plays there most.
export const lineStats = ['GK', 'DEF', 'MID', 'FWD'].map((line) => {
  const L = matches.flatMap((m) => m.lines.filter((l) => l.line === line).map((l) => ({ ...l, res: m.res })));
  const s = (k) => L.reduce((a, l) => a + l[k], 0), rated = L.filter((l) => l.rating > 0);
  const who = {}; L.forEach((l) => (who[l.n] = (who[l.n] || 0) + 1));
  return { line, apps: L.length, games: matches.filter((m) => m.lines.some((l) => l.line === line)).length, goals: s('goals'), assists: s('assists'), saves: s('saves'), tm: s('tm'),
    rating: rated.length ? +(rated.reduce((a, l) => a + l.rating, 0) / rated.length).toFixed(2) : null,
    pass: s('pa') ? Math.round(s('pm') / s('pa') * 100) : null, tackle: s('ta') ? Math.round(s('tm') / s('ta') * 100) : null,
    who: Object.entries(who).sort((a, b) => b[1] - a[1]).slice(0, 4) };
});
// archetype usage: appearances, players and average rating per archetype
export const archUse = (() => { const m = new Map(); for (const x of matches) for (const l of x.lines) { if (!l.arch) continue; const r = m.get(l.arch) ?? { apps: 0, who: new Set(), rs: 0, rn: 0 }; r.apps++; r.who.add(l.n); if (l.rating > 0) { r.rs += l.rating; r.rn++; } m.set(l.arch, r); } for (const r of m.values()) r.rating = r.rn ? (r.rs / r.rn).toFixed(1) : '–'; return m; })();
const archMax = Math.max(1, ...[...archUse.values()].map((r) => r.apps));
const LN = { GK: ['🧤', 'Goalkeepers'], DEF: ['🛡️', 'Defenders'], MID: ['⚙️', 'Midfielders'], FWD: ['🎯', 'Forwards'] };
const pct = (r) => (r.p ? Math.round(r.w / r.p * 100) : 0);
const wdlBar = (r) => `<span class="wdl" aria-hidden="true"><i class="w" style="--f:${r.w}"></i><i class="d" style="--f:${r.d}"></i><i class="l" style="--f:${r.l}"></i></span>`;
export function fieldedPanel() {
  const top = fielded.slice(0, 7), rest = rec(fielded.slice(7)), S = fieldedSplit;
  return `<div class="panel reveal tx-fielded" data-rv="flip"><h3 class="rv-c">📋 Line-ups we actually fielded</h3>
  <p class="muted small rv-c">Every league game is 11 against 11, but EA fills empty spots with AI players. This is the shape of the <b>humans</b> in each of our ${matches.length} archived games, so you can see how often we play short and what it costs.</p>
  <div class="txf-kpi rv-g"><div><b data-count="${pct(S.full)}" data-suffix="%">${pct(S.full)}%</b><span>win rate with a full 11 (${S.full.w}-${S.full.d}-${S.full.l} in ${S.full.p})</span></div><div><b data-count="${pct(S.short)}" data-suffix="%">${pct(S.short)}%</b><span>win rate playing short (${S.short.w}-${S.short.d}-${S.short.l} in ${S.short.p})</span></div><div><b data-count="${pct(S.humanGK)}" data-suffix="%">${pct(S.humanGK)}%</b><span>with a human keeper (${S.humanGK.p} games)</span></div><div><b data-count="${pct(S.aiGK)}" data-suffix="%">${pct(S.aiGK)}%</b><span>with an AI keeper (${S.aiGK.p} games)</span></div></div>
  <div class="tscroll"><table class="txf"><thead><tr><th>Humans</th><th>Outfield shape</th><th>Keeper</th><th class="r">Games</th><th>W-D-L</th><th class="r">Goals</th><th class="r">Win %</th></tr></thead><tbody class="rv-g">${top.map((r) => `<tr><td><b class="num">${r.humans}</b>${r.humans < 11 ? ` <small class="muted">+${11 - r.humans} AI</small>` : ''}</td><td class="osw">${r.shape}</td><td>${r.gk ? '🧤 Human' : '🤖 AI'}</td><td class="r num">${r.p}</td><td>${wdlBar(r)} <small class="num">${r.w}-${r.d}-${r.l}</small></td><td class="r num">${r.gf}:${r.ga}</td><td class="r num">${pct(r)}%</td></tr>`).join('')}${rest.p ? `<tr class="muted"><td colspan="3">${fielded.length - 7} other line-ups</td><td class="r num">${rest.p}</td><td>${wdlBar(rest)} <small class="num">${rest.w}-${rest.d}-${rest.l}</small></td><td class="r num">${rest.gf}:${rest.ga}</td><td class="r num">${pct(rest)}%</td></tr>` : ''}</tbody></table></div>
  <p class="muted tiny">Lines come from the position EA records for each player in each match (keeper, defender, midfielder, forward). EA keeps the last few games per mode, so the archive starts when the site started collecting.</p></div>`;
}
export function linePanel() {
  return `<div class="panel reveal tx-lines"><h3 class="rv-c">📊 How each line actually plays</h3><p class="muted small rv-c">Per appearance across the archive. Use it to pick roles: a line that loses the ball a lot needs safer roles, and a line that creates goals can take more risk.</p>
  <div class="grid g4 rv-g">${lineStats.map((s) => `<div class="txl"><div class="txl-h"><span>${LN[s.line][0]}</span><b>${LN[s.line][1]}</b><small class="muted">${s.apps} apps · ${s.games} games</small></div>
   <dl><div><dt>Avg rating</dt><dd class="num">${s.rating ?? '–'}</dd></div><div><dt>Goals</dt><dd class="num">${s.goals}</dd></div><div><dt>Assists</dt><dd class="num">${s.assists}</dd></div><div><dt>${s.line === 'GK' ? 'Saves' : 'Tackles won'}</dt><dd class="num">${s.line === 'GK' ? s.saves : s.tm}</dd></div><div><dt>Pass %</dt><dd class="num">${s.pass ?? '–'}${s.pass != null ? '%' : ''}</dd></div><div><dt>Tackle %</dt><dd class="num">${s.tackle ?? '–'}${s.tackle != null ? '%' : ''}</dd></div></dl>
   <div class="txl-who">${s.who.map(([n, c]) => `<span class="pill">${esc(n)} <b class="num">${c}</b></span>`).join('')}</div></div>`).join('')}</div></div>`;
}

const RUSH_ROLES = [['🎯', 'Striker', 'Highest player. Finishes chances and presses their last defender so they cannot build calmly.'], ['🔁', 'Offensive box-to-box', 'Joins every attack and is the first to press when the ball is lost.'], ['🧱', 'Defensive box-to-box', 'Screens the defender, wins second balls and recycles possession.'], ['🛡️', 'Stay-back defender', 'Never crosses halfway. Last line in front of the AI keeper; covers when the box-to-box players go forward.']];
// set pieces: no EA data exists for them, so this panel only says where the club writes them down (members-only Handbook)
const setPiecePanel = (mode) => `<div class="panel reveal tx-sp" style="margin-top:22px"><h3 class="rv-c">🎯 Set pieces${mode === 'rush' ? ' and restarts' : ''}</h3><p class="muted small rv-c">EA does not record corners, free kicks or penalties, so there are no numbers here. The managers write our routines in the Handbook (members only). What each routine should cover:</p>
<ul class="txsp rv-g">${(mode === 'rush' ? [['🚀', 'Attacking restarts', 'our routine and who goes where'], ['🧱', 'Defending restarts', 'who marks whom'], ['🥅', 'Penalties', 'who takes them'], ['⏱️', 'Kick-offs', 'first pass and runs']] : [['🚩', 'Attacking corners', 'routine and who attacks the near post'], ['🧱', 'Defending corners', 'zonal or man-marking'], ['🎯', 'Free kicks and penalties', 'who takes them'], ['↩️', 'Throw-ins and kick-offs', 'the first pass and runs']]).map(([i, a, b]) => `<li><span>${i}</span><b>${a}</b><small class="muted">${b}</small></li>`).join('')}</ul>
<a class="btn ghost" href="hub-handbook.html#${mode}-setpieces" style="margin-top:12px">📘 Open the Handbook</a></div>`;

// ---------- TACTICS TABLE ----------
export function tactics() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow" id="eb">The usual XI · from the club archive</div><h2>Tactics table</h2></div>
   <div class="chips" id="mode"><button class="chip on" data-mode="league">🏆 League · 11v11</button><button class="chip" data-mode="rush">⚡ Rush · 5v5</button></div></header>
  <div id="league">
   <div class="chips" id="tabs"><button class="chip on" data-tab="xi">Our XI</button><button class="chip" data-tab="forms">All formations <span id="fc"></span></button><button class="chip" data-tab="roles">Roles per position</button></div>
   <div data-pane="xi" class="txpane">${pfin()}<div class="chips"><span class="muted small">Camera</span><button class="chip on" data-cam="3d">3D broadcast</button><button class="chip" data-cam="flat">Flat tactical</button><span style="flex:1"></span><span class="muted small">Tap a player for their card</span></div>
    <div id="xiPitch" style="margin-top:24px"></div><div id="pop" class="reveal in" style="display:grid;place-items:center;margin-top:10px"></div>
    <p class="muted small">In ${shapes[0]?.[1] ?? 0} of ${full} full 11-player league games we lined up <b>3-5-2</b>. Lines are real (from the archive). Slot names (LCB, LDM, CAM, LM…) come from the club's League Tactics document; <b>which player stands in which slot is illustrative</b>, because EA does not publish slots.</p>
    <div style="margin-top:26px">${fieldedPanel()}</div>${setPiecePanel('league')}</div>
   <div data-pane="forms" class="txpane" hidden><p class="muted txpurpose">🧩 Every shape FC 27 offers, so managers can plan a Plan B. ${fielded[0] ? `In the archive our humans most often stood in a <b>${fielded[0].shape}</b> (${fielded[0].p} games)` : ''}; the club formation is <b>3-5-2</b>. Tap a shape to see its slots and pick a role and focus for each.</p><div class="split"><div><div class="chips" id="back"><button class="chip on" data-b="0">All</button><button class="chip" data-b="3">3 at the back</button><button class="chip" data-b="4">4 at the back</button><button class="chip" data-b="5">5 at the back</button></div><div class="wall" id="wall"></div><p class="muted small" id="fnote" style="margin-top:12px"></p></div>
    <aside class="panel detail"><h3 id="dN" style="font-size:30px;margin:0"></h3><div class="muted small" id="dS"></div><div id="dPitch" style="margin:20px 0 8px"></div><div id="dSlots" class="slots"></div><div class="chips"><button class="chip gold" id="setClub">Set as our club formation</button><button class="chip" id="lobby"></button></div><p class="muted small" id="dMsg"></p></aside></div></div>
   <div data-pane="roles" class="txpane" hidden>${linePanel()}<p class="muted" id="rn" style="max-width:780px;margin-top:22px"></p><div class="rgrid" id="rg"></div></div>
  </div>
  <div id="rush" hidden><p class="muted" style="max-width:760px">Rush is 5v5: four of you plus an AI goalkeeper, on a smaller pitch with the penalty area, goal area and centre circle in different proportions to League. Formations and role names come from the club's own diagrams. EA does not publish Rush match data, so there are no stat towers here; managers assign players to roles.</p>
   <div class="grid g2" style="margin-top:18px"><div class="panel reveal"><h3 style="text-align:center">🛡️ Defensive 3-1</h3><p class="muted small" style="text-align:center">Three stay back, one up top. Use it to protect a lead or against a fast front two.</p><div id="r31" data-shape="3-1"></div></div><div class="panel reveal" style="--i:1"><h3 style="text-align:center">⚔️ Offensive 2-2</h3><p class="muted small" style="text-align:center">Two hold, two go. Use it when chasing a goal or against a side that sits deep.</p><div id="r22" data-shape="2-2"></div></div></div>
   <div class="reveal" style="margin-top:22px"><div class="grid g4 rv-g">${RUSH_ROLES.map(([ic, n, t]) => `<div class="panel txr"><div class="txr-ic">${ic}</div><h3>${n}</h3><p class="muted small">${t}</p></div>`).join('')}</div></div>
   <div class="panel reveal" id="rushlog" style="margin-top:22px"><h3>⚡ Rush results the managers confirmed</h3><p class="muted small" id="rushlogTxt">Rush games are logged by members on Match Night and confirmed by a manager, because EA does not publish Rush data.</p><div id="rushlogBody"></div></div>
   ${setPiecePanel('rush')}</div></section></div>`;
  return shell({ group: 'tactics', page: 'tactics.html', title: 'Tactics table', body, extraHead: '<script src="pitch.js" defer></script><link rel="stylesheet" href="tactics.css">', data: { formations: formations.formations, formationNote: formations.note, roles, xi: xiKeys } });
}

// ---------- PLAY STYLE (the club's own League Tactics document) ----------
export function playstyle() {
  const R = [
    ['ST ×2', 'Finisher', 'Be ready for the ball in behind. Quick tiki-taka in the box, pinged pass when it fits. Goal contributions.', 'Low Driven · First Touch · Quick Step · Pinged Pass · Tiki Taka · Press Proven'],
    ['CAM', 'Maestro · Creator · Magician', 'Edge-of-box option for the strikers and a central option for the CDMs. Link midfield and attack. Recycle to the CDMs if forward is off.', 'Tiki Taka · Pinged Pass · Incisive · Long Pass · Technical · Quick Step · Relentless'],
    ['LM / RM', 'Finisher (physical)', 'Think defensive box-to-box. Back five out of possession, front four in possession. Stay wide in build-up. Win aerials, have pace and stamina. Look inside to the CDMs and CAM before forcing it wide. 6\' max.', 'Relentless · Aerial Fortress · Rapid · Quick Step · Pinged Pass · Incisive · Low Driven'],
    ['CDM ×2', 'Maestro · Recycler', 'Control tempo and cut passing lanes. Cover for the LCB/RCB if pulled wide. Look for strikers in behind with the long ball.', 'Tiki Taka · Pinged Pass · Long Pass · Intercept · Anticipate · Press Proven · Incisive'],
    ['CB ×3', 'Boss · Progressor', 'Defend centrally, do not chase wingers who are no threat. Tiki-taka between CBs, progress to the CDMs. Under pressure cross to the wingers (LCB→RM, RCB→LM).', 'Aerial Fortress · Bruiser · Block · Intercept · Pinged Pass · Long Pass'],
    ['GK', 'Shot Stopper · Sweeper Keeper', 'Play it quickly to an open CB first, wide to the wingers second, very useful when they have proper builds.', '—'],
  ];
  const LINE = { 'ST ×2': 'FWD', CAM: 'MID', 'LM / RM': 'MID', 'CDM ×2': 'MID', 'CB ×3': 'DEF', GK: 'GK' }, ls = Object.fromEntries(lineStats.map((x) => [x.line, x]));
  const strip = (pos) => { const x = ls[LINE[pos]]; if (!x?.apps) return ''; return `<div class="ps-strip"><span title="Average match rating of the ${x.line} line">⭐ <b class="num">${x.rating ?? '–'}</b></span><span title="Pass completion">🎯 <b class="num">${x.pass ?? '–'}%</b></span><span title="${x.line === 'GK' ? 'Saves' : 'Goals + assists'}">${x.line === 'GK' ? '🧤' : '⚽'} <b class="num">${x.line === 'GK' ? x.saves : x.goals + x.assists}</b></span><small class="muted">${x.line} line · ${x.apps} apps</small></div>`; };
  const S352 = fielded.filter((r) => r.shape === '3-5-2'), r352 = S352.reduce((a, r) => ({ p: a.p + r.p, w: a.w + r.w, d: a.d + r.d, l: a.l + r.l }), { p: 0, w: 0, d: 0, l: 0 });
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">League · 11v11 · carried over from last year's document</div><h2>Play style</h2></div></header>
  <div class="panel reveal" style="margin-bottom:20px;border-color:rgba(200,53,44,.4)"><h3 style="font-size:26px">We play a <span class="gold-t">3-5-2</span></h3>${r352.p ? `<div class="txf-kpi" style="margin:4px 0 14px"><div><b data-count="${r352.p}">${r352.p}</b><span>games where our humans stood in a 3-5-2</span></div><div><b class="num">${r352.w}-${r352.d}-${r352.l}</b><span>record in those games</span></div><div><b data-count="${Math.round(r352.w / r352.p * 100)}" data-suffix="%">${Math.round(r352.w / r352.p * 100)}%</b><span>win rate</span></div></div>` : ''}<p class="muted" style="max-width:820px">The wingers form a back five in defence and a front four in attack. We want quick, efficient passing across the pitch, with the wingers as the long-ball option. In attack: tiki-taka and pinged passes in the box. In defence: a back five, cutting passing lanes, with the CAM and strikers pressing the opponent's CDMs and CBs.</p></div>
  <div class="grid g3" data-stagger>${R.map(([p, a, t, ps]) => `<div class="panel"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3 style="margin:0;font-size:26px" class="gold-t">${p}</h3><span class="pill s">${a}</span></div><p class="muted small" style="margin:10px 0">${t}</p><div class="tiny" style="color:var(--g2);letter-spacing:.06em">KEY PLAYSTYLES</div><div class="small">${ps}</div>${strip(p)}</div>`).join('')}</div>
  <p class="muted tiny" style="margin-top:8px">The strip under each role is the real line it belongs to (forwards, midfield, defence, keeper), averaged over every archived appearance.</p>
  <p class="muted small" style="margin-top:14px">All of these archetypes exist in FC 27. Playstyle names (Pinged Pass, Tiki Taka and so on) are not in our FC 27 data file yet, so managers should re-check them against the game. Each role also has an EA role and focus per slot: see <a href="tactics.html#roles" style="color:var(--g2)">Roles per position</a>.</p>
  <div class="panel reveal" style="margin-top:20px"><h3>Rush · 5v5</h3><p class="muted">Rush has its own two formations (Defensive 3-1 and Offensive 2-2) and its own roles: Striker, Offensive and Defensive box-to-box, Stay-back defender. The goalkeeper is an AI. See them on the <a href="tactics.html#rush" style="color:var(--g2)">Tactics table</a>.</p></div></section></div>`;
  return shell({ group: 'tactics', page: 'playstyle.html', title: 'Play style', body });
}

// ---------- STUDIO (chalkboard on the true pitch) ----------
export function studio() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Chalkboard · drag the players</div><h2>Tactics studio</h2></div>
  <div class="chips" id="smode"><button class="chip on" data-mode="league">🏆 League</button><button class="chip" data-mode="rush">⚡ Rush</button></div></header>
  ${pfin()}<div class="chips"><span class="muted small" id="sfl">Formation</span><select id="sform" aria-label="Formation" class="chip" style="padding:8px 12px"></select><span class="muted tiny">All ${formations.formations.length} FC27 shapes</span></div><div class="chips"><span class="muted small">Keyframes</span><span id="kfs"></span><button class="chip" id="kfAdd">＋ Capture</button><button class="chip gold" id="kfPlay">▶ Play</button><button class="chip" id="kfReset">↺ Reset</button></div>
  <div class="reveal"><ol class="txsteps rv-g"><li><b>1 · Set up</b><small class="muted">Pick League or Rush and a formation. Our usual XI fills the League slots.</small></li><li><b>2 · Capture</b><small class="muted">Drag players to the start, press ＋ Capture, move them, capture again.</small></li><li><b>3 · Play</b><small class="muted">Press ▶ Play to watch the run. Use it to explain a corner or a press on Match Night.</small></li></ol></div>
  <div id="board" style="margin-top:22px"></div>
  <p class="muted small">Drag any marker: it stays inside the lines. Capture a keyframe, move the players, capture again, then press play to see the movement. ${sample('SAMPLE BOARD')} Plays are saved in this browser only in the preview.</p></section></div>`;
  return shell({ group: 'tactics', page: 'studio.html', title: 'Studio', body, extraHead: '<script src="pitch.js" defer></script><link rel="stylesheet" href="tactics.css">', data: { formations: formations.formations, xi: xiKeys } });
}

// ---------- BUILDS (Builder + Pro builds) ----------
export function builds() {
  const groups = game.archetypeGroups ?? [];
  const top = [...archUse].sort((a, b) => b[1].apps - a[1].apps).slice(0, 3);
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">FC 27 · ${(game.archetypes ?? []).length} archetypes</div><h2>Builds</h2></div><div class="chips" id="bt"><button class="chip on" data-t="b">Builder</button><button class="chip" data-t="p">Pro builds</button></div></header>
  <div id="pb"><p class="muted" style="max-width:760px">Every archetype is unlocked from the start, and levelling one unlocks Masteries. Attribute values EA has not published are left empty rather than guessed: managers enter them from the in-game screens.</p>
  ${top.length ? `<div class="panel reveal" style="margin-top:16px"><h3 class="rv-c">🧬 What our players actually build</h3><p class="muted small rv-c">From the archetype EA records for every player in every archived match.</p><div class="txf-kpi rv-g">${top.map(([n, u]) => `<div><b class="num">${u.apps}</b><span><b>${esc(n)}</b><br>${u.who.size} player${u.who.size === 1 ? '' : 's'} · ⭐ ${u.rating}</span></div>`).join('')}</div></div>` : ''}
  ${groups.map((g) => `<h3 style="margin:22px 0 10px">${esc(g.name)}</h3><div class="grid g4" data-stagger>${(game.archetypes ?? []).filter((a) => a.group === g.id).map((a) => `<div class="panel"><div class="osw gold-t" style="font-size:24px">${esc(a.name)}</div><div class="muted small">${esc(g.name.replace(/s$/, ''))} archetype</div>${(() => { const u = archUse.get(a.name); return u ? `<div class="bld-use"><b class="num">${u.apps}</b> apps · ${u.who.size} player${u.who.size === 1 ? '' : 's'}<i style="--w:${Math.round(u.apps / archMax * 100)}%"></i></div>` : '<div class="bld-use muted">Not used in the archive yet</div>'; })()}<div class="pill" style="margin-top:10px">${Object.keys(a.base || {}).length ? 'Base values entered' : 'Values not entered yet'}</div></div>`).join('')}</div>`).join('')}</div>
  <div id="pp" hidden><div class="panel" style="text-align:center;padding:40px"><div style="font-size:40px">🧩</div><h3>Pro builds</h3><p class="muted">Pro builds appear here once the managers publish them from the Hub. Nothing is shown rather than made up.</p></div></div></section></div>`;
  return shell({ group: 'tactics', page: 'builds.html', title: 'Builds', body });
}

// ---------- GAME UPDATES ----------
export function updatesPage() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">EA SPORTS FC 27 · Clubs</div><h2>Game updates</h2></div></header><div style="position:relative;padding-left:26px;border-left:2px solid var(--line2);display:grid;gap:16px">${updates.map((u, i) => `<a class="panel reveal" style="--i:${Math.min(i, 8)}" href="${esc(u.url)}" target="_blank" rel="noopener"><span style="position:absolute;left:-35px;top:24px;width:14px;height:14px;border-radius:50%;background:var(--red);box-shadow:0 0 14px var(--red)"></span><div class="muted tiny">${new Date(u.published).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${u.clubs === true || u.clubs === 'True' ? ' · <span class="pill s">CLUBS</span>' : ''}</div><h3 style="margin:4px 0">${esc(u.title.replace(/^EA SPORTS FC™ 27 \| /, ''))}</h3><p class="muted small">${esc(u.summary || '')}</p></a>`).join('')}</div></section></div>`;
  return shell({ group: 'tactics', page: 'updates.html', title: 'Game updates', body });
}

export default function (P) { P('tactics.html', tactics()); P('playstyle.html', playstyle()); P('studio.html', studio()); P('builds.html', builds()); P('updates.html', updatesPage()); }
