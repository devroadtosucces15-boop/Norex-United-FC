import { players, updates, game, shapes, matches, usualXI, ARCH } from '../lib/data.mjs';
import { shell, esc, sample } from '../lib/ui.mjs';
import { formations, roles } from './stats.mjs';

const xi = usualXI();
const xiKeys = Object.fromEntries(Object.entries(xi).map(([s, p]) => [s, p?.k]));
export const pfin = () => `<div class="chips pfin"><span class="muted small">Pitch finish</span>${[['grass', 'Striped grass'], ['night', 'Floodlit night'], ['blue', 'Blueprint'], ['chalk', 'Chalkboard']].map(([k, l]) => `<button class="chip" data-pf="${k}">${l}</button>`).join('')}</div>`;
const full = shapes.reduce((a, s) => a + s[1], 0);

// ---------- TACTICS TABLE ----------
export function tactics() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow" id="eb">The usual XI · from the club archive</div><h2>Tactics table</h2></div>
   <div class="chips" id="mode"><button class="chip on" data-mode="league">🏆 League · 11v11</button><button class="chip" data-mode="rush">⚡ Rush · 5v5</button></div></header>
  <div id="league">
   <div class="chips" id="tabs"><button class="chip on" data-tab="xi">Our XI</button><button class="chip" data-tab="forms">All formations <span id="fc"></span></button><button class="chip" data-tab="roles">Roles per position</button></div>
   <div data-pane="xi">${pfin()}<div class="chips"><span class="muted small">Camera</span><button class="chip on" data-cam="3d">3D broadcast</button><button class="chip" data-cam="flat">Flat tactical</button><span style="flex:1"></span><span class="muted small">Tap a player for their card</span></div>
    <div id="xiPitch" style="margin-top:24px"></div><div id="pop" class="reveal in" style="display:grid;place-items:center;margin-top:10px"></div>
    <p class="muted small">In ${shapes[0]?.[1] ?? 0} of ${full} full 11-player league games we lined up <b>3-5-2</b>. Lines are real (from the archive). Slot names (LCB, LDM, CAM, LM…) come from the club's League Tactics document; <b>which player stands in which slot is illustrative</b>, because EA does not publish slots.</p></div>
   <div data-pane="forms" hidden><div class="split"><div><div class="chips" id="back"><button class="chip on" data-b="0">All</button><button class="chip" data-b="3">3 at the back</button><button class="chip" data-b="4">4 at the back</button><button class="chip" data-b="5">5 at the back</button></div><div class="wall" id="wall"></div><p class="muted small" id="fnote" style="margin-top:12px"></p></div>
    <aside class="panel detail"><h3 id="dN" style="font-size:30px;margin:0"></h3><div class="muted small" id="dS"></div><div id="dPitch" style="margin:20px 0 8px"></div><div id="dSlots" class="slots"></div><div class="chips"><button class="chip gold" id="setClub">Set as our club formation</button><button class="chip" id="lobby"></button></div><p class="muted small" id="dMsg"></p></aside></div></div>
   <div data-pane="roles" hidden><p class="muted" id="rn" style="max-width:780px"></p><div class="rgrid" id="rg"></div></div>
  </div>
  <div id="rush" hidden><p class="muted" style="max-width:760px">Rush is 5v5: four of you plus an AI goalkeeper, on a smaller pitch with the penalty area, goal area and centre circle in different proportions to League. Formations and role names come from the club's own diagrams. EA does not publish Rush match data, so there are no stat towers here; managers assign players to roles.</p>
   <div class="grid g2" style="margin-top:18px"><div class="panel"><h3 style="text-align:center">Defensive 3-1</h3><div id="r31" data-shape="3-1"></div></div><div class="panel"><h3 style="text-align:center">Offensive 2-2</h3><div id="r22" data-shape="2-2"></div></div></div></div></section></div>`;
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
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">League · 11v11 · carried over from last year's document</div><h2>Play style</h2></div></header>
  <div class="panel reveal" style="margin-bottom:20px;border-color:rgba(200,53,44,.4)"><h3 style="font-size:26px">We play a <span class="gold-t">3-5-2</span></h3><p class="muted" style="max-width:820px">The wingers form a back five in defence and a front four in attack. We want quick, efficient passing across the pitch, with the wingers as the long-ball option. In attack: tiki-taka and pinged passes in the box. In defence: a back five, cutting passing lanes, with the CAM and strikers pressing the opponent's CDMs and CBs.</p></div>
  <div class="grid g3" data-stagger>${R.map(([p, a, t, ps]) => `<div class="panel"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3 style="margin:0;font-size:26px" class="gold-t">${p}</h3><span class="pill s">${a}</span></div><p class="muted small" style="margin:10px 0">${t}</p><div class="tiny" style="color:var(--g2);letter-spacing:.06em">KEY PLAYSTYLES</div><div class="small">${ps}</div></div>`).join('')}</div>
  <p class="muted small" style="margin-top:14px">All of these archetypes exist in FC 27. Playstyle names (Pinged Pass, Tiki Taka and so on) are not in our FC 27 data file yet, so managers should re-check them against the game. Each role also has an EA role and focus per slot: see <a href="tactics.html#roles" style="color:var(--g2)">Roles per position</a>.</p>
  <div class="panel reveal" style="margin-top:20px"><h3>Rush · 5v5</h3><p class="muted">Rush has its own two formations (Defensive 3-1 and Offensive 2-2) and its own roles: Striker, Offensive and Defensive box-to-box, Stay-back defender. The goalkeeper is an AI. See them on the <a href="tactics.html#rush" style="color:var(--g2)">Tactics table</a>.</p></div></section></div>`;
  return shell({ group: 'tactics', page: 'playstyle.html', title: 'Play style', body });
}

// ---------- STUDIO (chalkboard on the true pitch) ----------
export function studio() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Chalkboard · drag the players</div><h2>Tactics studio</h2></div>
  <div class="chips" id="smode"><button class="chip on" data-mode="league">🏆 League</button><button class="chip" data-mode="rush">⚡ Rush</button></div></header>
  ${pfin()}<div class="chips"><span class="muted small" id="sfl">Formation</span><select id="sform" aria-label="Formation" class="chip" style="padding:8px 12px"></select><span class="muted tiny">All ${formations.formations.length} FC27 shapes</span></div><div class="chips"><span class="muted small">Keyframes</span><span id="kfs"></span><button class="chip" id="kfAdd">＋ Capture</button><button class="chip gold" id="kfPlay">▶ Play</button><button class="chip" id="kfReset">↺ Reset</button></div>
  <div id="board" style="margin-top:22px"></div>
  <p class="muted small">Drag any marker: it stays inside the lines. Capture a keyframe, move the players, capture again, then press play to see the movement. ${sample('SAMPLE BOARD')} Plays are saved in this browser only in the preview.</p></section></div>`;
  return shell({ group: 'tactics', page: 'studio.html', title: 'Studio', body, extraHead: '<script src="pitch.js" defer></script><link rel="stylesheet" href="tactics.css">', data: { formations: formations.formations, xi: xiKeys } });
}

// ---------- BUILDS (Builder + Pro builds) ----------
export function builds() {
  const groups = game.archetypeGroups ?? [];
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">FC 27 · ${(game.archetypes ?? []).length} archetypes</div><h2>Builds</h2></div><div class="chips" id="bt"><button class="chip on" data-t="b">Builder</button><button class="chip" data-t="p">Pro builds</button></div></header>
  <div id="pb"><p class="muted" style="max-width:760px">Every archetype is unlocked from the start, and levelling one unlocks Masteries. Attribute values EA has not published are left empty rather than guessed: managers enter them from the in-game screens.</p>
  ${groups.map((g) => `<h3 style="margin:22px 0 10px">${esc(g.name)}</h3><div class="grid g4" data-stagger>${(game.archetypes ?? []).filter((a) => a.group === g.id).map((a) => `<div class="panel"><div class="osw gold-t" style="font-size:24px">${esc(a.name)}</div><div class="muted small">${esc(g.name.replace(/s$/, ''))} archetype</div><div class="pill" style="margin-top:10px">${Object.keys(a.base || {}).length ? 'Base values entered' : 'Values not entered yet'}</div></div>`).join('')}</div>`).join('')}</div>
  <div id="pp" hidden><div class="panel" style="text-align:center;padding:40px"><div style="font-size:40px">🧩</div><h3>Pro builds</h3><p class="muted">Pro builds appear here once the managers publish them from the Hub. Nothing is shown rather than made up.</p></div></div></section></div>`;
  return shell({ group: 'tactics', page: 'builds.html', title: 'Builds', body });
}

// ---------- GAME UPDATES ----------
export function updatesPage() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">EA SPORTS FC 27 · Clubs</div><h2>Game updates</h2></div></header><div style="position:relative;padding-left:26px;border-left:2px solid var(--line2);display:grid;gap:16px">${updates.map((u, i) => `<a class="panel reveal" style="--i:${Math.min(i, 8)}" href="${esc(u.url)}" target="_blank" rel="noopener"><span style="position:absolute;left:-35px;top:24px;width:14px;height:14px;border-radius:50%;background:var(--red);box-shadow:0 0 14px var(--red)"></span><div class="muted tiny">${new Date(u.published).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${u.clubs === true || u.clubs === 'True' ? ' · <span class="pill s">CLUBS</span>' : ''}</div><h3 style="margin:4px 0">${esc(u.title.replace(/^EA SPORTS FC™ 27 \| /, ''))}</h3><p class="muted small">${esc(u.summary || '')}</p></a>`).join('')}</div></section></div>`;
  return shell({ group: 'tactics', page: 'updates.html', title: 'Game updates', body });
}

export default function (P) { P('tactics.html', tactics()); P('playstyle.html', playstyle()); P('studio.html', studio()); P('builds.html', builds()); P('updates.html', updatesPage()); }
