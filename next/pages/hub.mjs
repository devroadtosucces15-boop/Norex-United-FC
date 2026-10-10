import { cfg, features, players, usualXI, clubStats as C } from '../lib/data.mjs';
import * as W from '../lib/widgets.mjs';
import { shell, esc, sample, sbt, chip } from '../lib/ui.mjs';
import { formations } from './stats.mjs';

const ROOMS = [['hub.html', '🎽', 'My Locker', 'Your card, artwork, stats, trophies and alerts'], ['hub-matchnight.html', '🗓️', 'Match Night', 'RSVP, availability, MOTM votes, ratings, Rush log'], ['hub-squad.html', '🤝', 'Squad Room', 'Team up, Rush squads, ideas and feedback'], ['hub-clubhouse.html', '💬', 'Clubhouse', 'Messages, feed and mentions'], ['hub-handbook.html', '📜', 'Handbook', 'Club rules, docs and how the site works']];
const hubShell = (page, title, body, extra = {}) => shell({ group: 'hub', page, title, body, bodyClass: 'hub-page', ...extra });

// ---------- MY LOCKER (landing, the end of the cinematic entrance) ----------
export function locker() {
  const body = `<div data-for="guest" class="wrap" style="padding-top:60px"><div class="panel" style="max-width:560px;margin:0 auto;text-align:center;padding:50px 30px"><img src="crest.png" alt="" style="width:90px;margin:0 auto 10px"><h2>The Hub is for members</h2><p class="muted" style="margin:10px 0 18px">${process.env.NEXT_PREVIEW ? 'Sign in with Discord to open your locker.' : 'Sign in with Discord to open your locker. In this design build use the “Preview as” switcher at the bottom of the screen.'}</p>${process.env.NEXT_PREVIEW ? '<a class="btn gold" data-login href="#">Sign in with Discord</a> ' : ''}<a class="btn ghost" href="join.html">Not a member yet? Join</a></div></div>
  <div data-for="member owner" hidden>
   <div id="cardslot"></div>
   <div id="noclaim" hidden class="wrap"><div class="panel" style="max-width:620px;margin:40px auto;text-align:center"><h3>Link your player to get your card</h3><p class="muted" style="margin:8px 0 14px">You are signed in, but your Discord is not linked to a club player yet. Link it in the live Hub, then come back and your locker opens with your own card.</p><a class="btn gold" href="../members.html">Open the live Hub</a></div></div>
   <section class="lockstage" id="lockstage"><div class="side l"><div class="panel reveal" id="nextpanel"><div class="eyebrow">Next match night</div><h3 style="margin:6px 0">None scheduled</h3><p class="muted small">You'll be alerted here the moment the managers schedule one.</p><a class="btn ghost" href="hub-matchnight.html" style="margin-top:6px">Match Night</a></div>
     <div class="panel reveal" style="--i:1" id="alertpanel"><div class="eyebrow">Alerts</div><p class="muted small" style="margin-top:6px">${sample()} No new alerts. Approvals, RSVPs and mentions appear here.</p></div></div>
    <div class="side r"><div class="panel reveal" id="mystats"></div><div class="panel reveal" style="--i:1" id="artpanel"></div></div></section>
   <div class="wrap"><section class="sec" style="margin-top:20px"><header><div><span class="ribbon">Your shape</span></div><p>How your game compares with the squad. Each axis is scaled to the best player.</p></header><div class="grid g2"><div class="panel reveal" id="myviz"></div><div class="panel reveal" style="--i:1"><h3>Your tier</h3>${W.tiers()}<h3 style="margin-top:16px">Trophy cabinet</h3>${W.cabinet()}</div></div></section></div>
   <div class="wrap"><section class="sec" style="margin-top:20px"><header><div><span class="ribbon">The Hub</span></div><p>Five rooms, one key. Staff tools sit with them for managers and the owner.</p></header>
    <div class="grid g3" data-stagger>${ROOMS.map(([h, i, t, d]) => `<a class="panel room" href="${h}"><div style="font-size:30px">${i}</div><h3 style="margin:6px 0 2px">${t}</h3><p class="muted small">${d}</p></a>`).join('')}<a class="panel room" data-for="owner" hidden href="staff.html" style="border-color:rgba(239,207,122,.5)"><div style="font-size:30px">🛡️</div><h3 style="margin:6px 0 2px" class="gold-t">Staff</h3><p class="muted small">Dugout, Boardroom and the Artwork studio</p></a></div></section></div>
  </div>`;
  return hubShell('hub.html', 'My Locker', body, { extraHead: '<link rel="stylesheet" href="tactics.css">', data: { full: players } });
}

// ---------- MATCH NIGHT ----------
export function matchNight() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Match night</h2></div></header>
  <div data-for="guest" class="panel" style="text-align:center;padding:40px"><h3>Members only</h3><a class="btn gold" data-hub href="hub.html" style="margin-top:10px">🔑 Enter the Hub</a></div>
  <div data-for="member owner" hidden><div class="grid g2"><div class="panel reveal" id="rsvppanel"><h3>RSVP</h3><p class="muted small">${sample()} No match night is scheduled. When one is, you answer here and managers see who is in.</p><div class="chips" id="rsvp" style="margin-top:12px"><button class="chip" data-v="y">✅ I'm in</button><button class="chip" data-v="m">❔ Maybe</button><button class="chip" data-v="n">❌ Can't</button></div><p class="muted small" id="rs" style="margin-top:8px"></p></div>
  <div class="panel reveal" id="availpanel" style="--i:1;display:none"><h3>Availability this week</h3><p class="muted small">Tell the managers which days you can play.</p><div id="availbox" style="margin-top:10px"></div></div>
  <div class="panel reveal" style="--i:1"><h3>MOTM vote</h3><p class="muted small">${sample()} Voting opens after the final whistle. The winner's card gets the gold treatment on the Hall of Fame.</p></div>
  <div class="panel reveal" style="--i:2"><h3>Rush log</h3><p class="muted small">Rush is not in EA's data. Log your Rush result here and a manager confirms it.</p><a class="btn ghost" href="#" onclick="return false">Log a Rush game</a></div>
  <div class="panel reveal" style="--i:3"><h3>Ratings</h3><p class="muted small">Rate your teammates after the game. Averages feed the leaderboards.</p></div></div></div></section></div>`;
  return hubShell('hub-matchnight.html', 'Match Night', body);
}
export function squadRoom() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Squad room</h2></div></header><div data-for="member owner" hidden class="grid g2"><div class="panel"><h3>Team up</h3><p class="muted small">${sample()} Post what you're playing (League or Rush) and who you need.</p></div><div class="panel"><h3>Rush squads</h3><p class="muted small">Rush is 4 humans plus an AI keeper. Build a squad of four here.</p></div><div class="panel"><h3>Ideas</h3><p class="muted small">Suggest anything for the club. Managers reply.</p></div><div class="panel"><h3>Feedback</h3><p class="muted small">Regular evaluation surveys help us improve.</p></div></div><div data-for="guest" class="panel" style="text-align:center;padding:40px"><h3>Members only</h3></div></section></div>`;
  return hubShell('hub-squad.html', 'Squad Room', body);
}
export function clubhouse() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Clubhouse</h2></div></header><div data-for="member owner" hidden class="panel"><h3>Messages and feed</h3><p class="muted">${sample()} Club chat, announcements and mentions live here. In the real build this room is the same chat that runs in Discord.</p></div><div data-for="guest" class="panel" style="text-align:center;padding:40px"><h3>Members only</h3></div></section></div>`;
  return hubShell('hub-clubhouse.html', 'Clubhouse', body);
}
export function handbook() {
  const RULES = [['1', 'Channel acknowledgement', 'Mandatory channel acknowledgement and compliance. If it is in the channel, you have read it.'], ['2', 'Never quit', 'No quitting games intentionally. Finish what we started.'], ['3', 'One playstyle', 'Follow the club playstyle and organise roles before kick-off.'], ['4', 'Team first', 'Zero tolerance for selfish play.'], ['5', 'Every voice', 'Open space for opinions and ideas.'], ['6', 'Evaluate and enjoy', 'Use the evaluation surveys regularly, and have fun.']];
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Handbook</h2></div></header>
  <div data-for="member owner" hidden><div class="panel reveal" style="margin-bottom:18px"><h3 style="font-size:28px" class="gold-t">The six club rules</h3><div class="grid g3" data-stagger style="margin-top:14px">${RULES.map(([n, t, d]) => `<div class="panel flat"><div class="num gold-t" style="font-size:40px">${n}</div><h3 style="font-size:17px">${t}</h3><p class="muted small">${d}</p></div>`).join('')}</div></div>
  <div class="grid g2"><div class="panel"><h3>How the site works</h3><p class="muted small">Club, Matches, Stats and Tactics are public. The gold key opens the Hub: your locker, match night, squad room, clubhouse and this handbook.</p></div><div class="panel"><h3>Club docs</h3><p class="muted small">${sample()} Docs the managers publish (set-piece sheets, role guides) appear here.</p></div></div></div>
  <div data-for="guest" class="panel" style="text-align:center;padding:40px"><h3>Members only</h3></div></section></div>`;
  return hubShell('hub-handbook.html', 'Handbook', body);
}

// ---------- STAFF ----------
const staffGate = `<div data-for="guest member" class="panel" style="text-align:center;padding:40px"><h3>Staff only</h3><p class="muted">${process.env.NEXT_PREVIEW ? 'Managers and the owner see the staff tools here after signing in.' : 'Switch “Preview as” to Owner to see the staff tools.'}</p></div>`;
export function staff() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Owner and managers</div><h2>Staff</h2></div></header>${staffGate}<div data-for="owner" hidden class="grid g3">${[['staff-dugout.html', '🧢', 'Dugout', 'Build the lineup for match night on the real pitch'], ['staff-boardroom.html', '👑', 'Boardroom', 'Club health, recruitment and feature switches'], ['staff-artwork.html', '🎨', 'Artwork studio', 'Submit, inspect, download, approve or revoke player artwork']].map(([h, i, t, d]) => `<a class="panel room" href="${h}"><div style="font-size:30px">${i}</div><h3 style="margin:6px 0 2px">${t}</h3><p class="muted small">${d}</p></a>`).join('')}</div></section></div>`;
  return hubShell('staff.html', 'Staff', body);
}
export function dugout() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · match night</div><h2>Dugout</h2></div><div class="chips"><select id="dgF" aria-label="Formation" style="background:var(--p3);color:#fff;border:1px solid var(--line2);border-radius:999px;padding:8px 14px;font:600 13px Inter"></select><button class="chip" id="dgFill">Fill with usual XI</button><button class="chip" id="dgClear">Clear</button></div></header>${staffGate}
  <div data-for="owner" hidden><div class="split"><div><div id="dgPitch"></div></div><aside class="panel detail"><h3>Squad</h3><p class="muted small">Tap a marker on the pitch, then a player here to put them in that slot. Each player can hold one slot.</p><div id="dgList" style="display:grid;gap:6px;max-height:520px;overflow:auto"></div><p class="muted small" id="dgMsg" style="margin-top:8px"></p></aside></div></div></section></div>`;
  return hubShell('staff-dugout.html', 'Dugout', body, { extraHead: '<script src="pitch.js" defer></script><link rel="stylesheet" href="tactics.css">', data: { formations: formations.formations, xi: Object.fromEntries(Object.entries(usualXI()).map(([s, p]) => [s, p?.k])) } });
}
export function boardroom() {
  const flags = Object.entries(features);
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · owner</div><h2>Boardroom</h2></div></header>${staffGate}<div data-for="owner" hidden>
  <div class="sb">${sbt(C.sr, 'Skill rating', 'gold')}${sbt(C.div || 1, 'Division')}${sbt(players.length, 'Players')}${sbt(C.promotions, 'Promotions')}</div>
  <div class="grid g2" style="margin-top:20px"><div class="panel"><h3>Recruitment</h3><p class="muted small">${esc(cfg.recruitment?.headline ?? '')} · ${cfg.recruitment?.open ? 'open' : 'closed'}</p><div class="chips" style="margin-top:8px">${(cfg.recruitment?.positions ?? []).map((p) => `<span class="chip gold">${esc(p)}</span>`).join('')}</div></div>
  <div class="panel"><h3>Feature switches · ${flags.length}</h3><p class="muted small">Who can see each feature on the live site (from the club config).</p><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${flags.map(([k, v]) => `<span class="pill ${v === 'public' ? 'w' : v === 'owner' ? 's' : ''}">${esc(k)} · ${esc(v)}</span>`).join('')}</div></div></div></div></section></div>`;
  return hubShell('staff-boardroom.html', 'Boardroom', body);
}
export function artwork() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · owner</div><h2>Artwork studio</h2></div></header>${staffGate}<div data-for="owner" hidden>
  <div class="panel" style="margin-bottom:18px"><h3>Submit artwork for any player</h3><div class="chips"><select id="aP" aria-label="Player" style="background:var(--p3);color:#fff;border:1px solid var(--line2);border-radius:10px;padding:10px">${players.map((p) => `<option value="${esc(p.k)}">${esc(p.n)}</option>`).join('')}</select><input id="aK" maxlength="2" placeholder="Kit #" aria-label="Kit number" style="width:80px;padding:10px;border-radius:10px;background:var(--p3);border:1px solid var(--line2);color:#fff"><input id="aF" type="file" accept="image/png" aria-label="PNG file" style="color:var(--soft)"><label class="chip"><input id="aOK" type="checkbox" style="margin-right:6px"> approve right away</label><button class="btn" id="aGo">Upload PNG</button></div><p class="muted small" id="aM" style="margin-top:8px">Transparent PNG, at least 400 px. Non-PNG files and files without transparency are refused.</p></div>
  <div id="aList" class="grid g3"></div></div></section></div>`;
  return hubShell('staff-artwork.html', 'Artwork studio', body);
}

export default function (P) {
  P('hub.html', locker()); P('hub-matchnight.html', matchNight()); P('hub-squad.html', squadRoom()); P('hub-clubhouse.html', clubhouse()); P('hub-handbook.html', handbook());
  P('staff.html', staff()); P('staff-dugout.html', dugout()); P('staff-boardroom.html', boardroom()); P('staff-artwork.html', artwork());
}
