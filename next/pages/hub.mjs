import { cfg, features, players, usualXI, clubStats as C, matches, updates } from '../lib/data.mjs';
import * as W from '../lib/widgets.mjs';
import { shell, esc, sample, sbt, chip } from '../lib/ui.mjs';
import { formations } from './stats.mjs';
import { playstyleBlock } from './tactics.mjs';

const ROOMS = [['hub.html', '🎽', 'My Locker', 'Your card, artwork, stats, trophies and alerts'], ['hub-matchnight.html', '🗓️', 'Match Night', 'RSVP, availability, MOTM votes, ratings, Rush log'], ['hub-squad.html', '🤝', 'Squad Room', 'Team up, awards, predictions, Rush squads and scouting'], ['hub-clubhouse.html', '💬', 'Clubhouse', 'Club feed, ideas board, chat room and who is on Discord'], ['hub-handbook.html', '📜', 'Handbook', 'Club rules, docs and how the site works']];
const hubShell = (page, title, body, extra = {}) => shell({ group: 'hub', page, title, body, bodyClass: 'hub-page', ...extra });


// ---------- guest gate: what is behind the door, one clear way in (shared by the landing and every room) ----------
const gate = (here = 'hub.html') => `<div data-for="guest" class="wrap gatewrap"><section class="gate reveal">
 <div class="gate-crest" data-gyro><img src="crest.png" alt="" width="104" height="104"><span class="gate-key" aria-hidden="true">🔑</span></div>
 <h2 class="gate-t">The Hub is for members</h2>
 <p class="gate-s">${process.env.NEXT_PREVIEW ? 'Sign in with the Discord account you use in the club server. Your locker, RSVPs, votes and alerts open straight away.' : 'Sign in with Discord to open your locker. In this design build use the “Preview as” switcher at the bottom of the screen.'}</p>
 <div class="gate-stats"><span><b>${players.length}</b> players</span><span><b>${matches.length}</b> games on record</span><span><b>${ROOMS.length}</b> rooms</span></div>
 <div class="gate-btns">${process.env.NEXT_PREVIEW ? '<a class="btn gold big" data-login href="#">🎮 Sign in with Discord</a>' : ''}<a class="btn ghost big" href="join.html">✍️ Not a member yet? Join</a></div>
 <p class="gate-dc" data-discord-hint hidden>📱 Opened inside Discord? Tap <b>•••</b> then <b>Open in browser</b> so you stay signed in.</p>
 <div class="gate-rooms rv-g">${ROOMS.map(([h, i, t, d]) => `<div class="gate-room${h === here ? ' here' : ''}"><span class="gr-i">${i}</span><b>${t}</b><small>${d}</small><span class="gr-lock" aria-label="Locked">🔒</span></div>`).join('')}</div>
</section></div>`;

// ---------- MY LOCKER (landing, the end of the cinematic entrance) ----------
export function locker() {
  const body = `${gate('hub.html')}
  <div data-for="member owner" hidden>
   <div id="cardslot"></div>
   <div id="noclaim" hidden class="wrap"><div class="panel" style="max-width:620px;margin:40px auto;text-align:center"><h3>Link your player to get your card</h3><p class="muted" style="margin:8px 0 14px">You are signed in, but your Discord is not linked to a club player yet. Link it in the live Hub, then come back and your locker opens with your own card.</p><a class="btn gold" href="../members.html">Open the live Hub</a></div></div>
   <section class="lockstage" id="lockstage"><div class="side l"><div class="panel reveal" id="nextpanel"><div class="eyebrow">🗓️ Next match night</div><h3 style="margin:6px 0">None scheduled</h3><p class="muted small">You'll be alerted here the moment the managers schedule one.</p><a class="btn ghost" href="hub-matchnight.html" style="margin-top:6px">Match Night</a></div>
     <div class="panel reveal" style="--i:1" id="alertpanel"><div class="eyebrow"><span class="lk-bell" aria-hidden="true">🔔</span> Alerts</div><p class="muted small" style="margin-top:6px">${sample()} No new alerts. Approvals, RSVPs and mentions appear here.</p></div>
     <div class="panel reveal" style="--i:2" id="medalpanel" hidden></div></div>
    <div class="side r"><div class="panel reveal" id="mystats"></div><div class="panel reveal" style="--i:1" id="formpanel" hidden></div>
     <nav class="panel reveal lk-quick" style="--i:2" aria-label="Rooms"><div class="eyebrow">🚪 Rooms</div><div class="lk-q">${ROOMS.filter(([h]) => h !== 'hub.html').map(([h, i, t]) => `<a href="${h}"><span>${i}</span>${t}</a>`).join('')}</div></nav>
     <div class="panel reveal" style="--i:3" id="artpanel"></div></div></section>
   <nav class="wrap lk-jump" aria-label="In your locker"><a href="#lk-me">🪪 My profile</a><a href="#lk-mystats">📊 My stats</a><a href="#lk-medals">🏅 Medals</a><a href="#lk-cards">🎨 Card Studio</a><a href="#lk-alerts">🔔 Alerts</a><a href="#lk-alertset">⚙️ Settings</a></nav>
   <div class="wrap"><section class="sec sq-sec" id="lk-me" style="margin-top:20px"><header><div><span class="ribbon">🪪 My profile</span></div><p>What teammates see on your card, hover card and in Team up. Only what you change is saved.</p></header><div id="lkme" class="sq-mount"></div></section>
   <section class="sec sq-sec" id="lk-mystats"><header><div><span class="ribbon">📊 My stats</span></div><p>Your League season and your all-time numbers, ranked against everyone with eight or more games.</p></header><div id="lkstats" class="sq-mount"></div></section>
   <section class="sec sq-sec" id="lk-medals"><header><div><span class="ribbon">🏅 Badges and achievements</span></div><p>Achievements unlock from your games, votes and RSVPs. Badges are shout-outs from teammates.</p></header><div id="lkmedals" class="sq-mount"></div></section>
   <section class="sec sq-sec" id="lk-cards"><header><div><span class="ribbon">🎨 Card Studio</span></div><p>Send one photo a month. A manager checks it, the club style draws it, and your face lands on every player card.</p></header><div id="lkcards" class="sq-mount"></div></section></div>
   <div class="wrap lk-al2"><section class="sec sq-sec" id="lk-alerts" style="margin-top:20px"><header><div><span class="ribbon">🔔 Alerts inbox</span></div><p>Everything the club sent you, newest first. Open one to jump straight to it.</p></header><div id="lkinbox" class="sq-mount"></div></section>
   <section class="sec sq-sec" id="lk-alertset"><header><div><span class="ribbon">⚙️ Alert settings</span></div><p>Pick how each kind of alert reaches you: a Discord DM, only here, or not at all.</p></header><div id="lkprefs" class="sq-mount"></div></section></div>
   <div class="wrap"><section class="sec" style="margin-top:20px"><header><div><span class="ribbon">Your shape</span></div><p>How your game compares with the squad. Each axis is scaled to the best player.</p></header><div class="grid g2"><div class="panel reveal" id="myviz"></div><div class="panel reveal" style="--i:1"><h3>Your tier</h3>${W.tiers()}<h3 style="margin-top:16px">Trophy cabinet</h3>${W.cabinet()}</div></div></section></div>
   <div class="wrap"><section class="sec" style="margin-top:20px"><header><div><span class="ribbon">The Hub</span></div><p>Five rooms, one key. Staff tools sit with them for managers and the owner.</p></header>
    <div class="grid g3" data-stagger>${ROOMS.map(([h, i, t, d]) => `<a class="panel room" href="${h}"><div style="font-size:30px">${i}</div><h3 style="margin:6px 0 2px">${t}</h3><p class="muted small">${d}</p></a>`).join('')}<a class="panel room" data-for="owner" hidden href="staff.html" style="border-color:rgba(239,207,122,.5)"><div style="font-size:30px">🛡️</div><h3 style="margin:6px 0 2px" class="gold-t">Staff</h3><p class="muted small">Dugout, Boardroom and the Artwork studio</p></a></div></section></div>
  </div>`;
  return hubShell('hub.html', 'My Locker', body, { extraHead: '<link rel="stylesheet" href="tactics.css"><script src="alerts.js" defer></script><script src="mylocker.js" defer></script><script src="tonight.js" defer></script><script src="cardstudio.js" defer></script>', data: { full: players } });
}

// ---------- MATCH NIGHT ----------
export function matchNight() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Match night</h2></div></header>
  </section></div>${gate('hub-matchnight.html')}<div class="wrap"><section class="sec">
  <div data-for="member owner" hidden><div class="grid g2"><div class="panel reveal" id="rsvppanel"><h3>RSVP</h3><p class="muted small">${sample()} No match night is scheduled. When one is, you answer here and managers see who is in.</p><div class="chips" id="rsvp" style="margin-top:12px"><button class="chip" data-v="y">✅ I'm in</button><button class="chip" data-v="m">❔ Maybe</button><button class="chip" data-v="n">❌ Can't</button></div><p class="muted small" id="rs" style="margin-top:8px"></p></div>
  <div class="panel reveal" id="availpanel" style="--i:1;display:none"><h3>Availability this week</h3><p class="muted small">Tell the managers which days you can play.</p><div id="availbox" style="margin-top:10px"></div></div>
  <div class="panel reveal" style="--i:1" id="motmpanel"><h3>MOTM vote</h3><p class="muted small">${sample()} Voting opens after the final whistle. The winner's card gets the gold treatment on the Hall of Fame.</p></div>
  <div class="panel reveal" style="--i:2" id="rushpanel"><h3>Rush log</h3><p class="muted small">Rush is not in EA's data. Log your Rush result here and a manager confirms it.</p><a class="btn ghost" href="#" onclick="return false">Log a Rush game</a></div>
  <div class="panel reveal" style="--i:3" id="ratepanel"><h3>Ratings</h3><p class="muted small">Rate your teammates after the game. Averages feed the leaderboards.</p></div></div>
  <section class="sec sq-sec" id="mn-plays" style="margin-top:22px"><header><div><span class="ribbon">📋 Tonight’s plays</span></div><p>What the managers want the squad to know for the next match night. Study each one, then tick it off.</p></header><div id="mnplays" class="sq-mount"></div></section></div></section></div>`;
  return hubShell('hub-matchnight.html', 'Match Night', body, { extraHead: '<script src="tonight.js" defer></script>' });
}
export function squadRoom() {
  // Read from the live member API by squad.js (Team up, awards, predictions, Rush squads, scouting). Each panel loads on its own.
  const SECS = [['sq-team', '🎯', 'Team up', 'Who to play with tonight, ranked from who is around, play times, positions and your results together.', 'sqteam'],
    ['sq-awards', '🏆', 'Awards', 'This week’s vote and last week’s winners. The ballot closes Sunday at midnight (UTC).', 'sqawards'],
    ['sq-predict', '🔮', 'Predictions', 'Call our score before kick-off. Exact score 3 points, right result and goal difference 2, right result 1.', 'sqpredict'],
    ['sq-squads', '🤝', 'Rush squads', 'Four humans and an AI keeper. Managers publish the squads; your teammate picks help them choose.', 'sqsquads'],
    ['sq-scout', '🔭', 'Scouting', 'Players you recommended to the managers and where each one is now.', 'sqscout']];
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Squad room</h2></div><p>Who to play with, the weekly vote, score predictions, Rush squads and your scouting tips. All live from the club server.</p></header>
  <div data-for="member owner" hidden><nav class="chips sq-jump" aria-label="Squad room sections">${SECS.map(([id, i, t]) => `<a class="chip" href="#${id}">${i} ${t}</a>`).join('')}</nav>
  ${SECS.map(([id, i, t, d, mount], n) => `<section class="sec sq-sec" id="${id}"><header><div><span class="ribbon">${i} ${t}</span></div><p>${d}</p></header><div id="${mount}" class="sq-mount"></div></section>`).join('')}</div></section></div>${gate('hub-squad.html')}`;
  return hubShell('hub-squad.html', 'Squad Room', body, { extraHead: '<script src="recs.js" defer></script><script src="squad.js" defer></script>' });
}
export function clubhouse() {
  // Live from the member API: the club feed (/api/feed) and ideas board (/api/suggestions) in clubhouse.js, the chat room
  // (/api/chats + the chat socket) in clubchat.js, and who is on the club Discord right now (Discord's public widget feed).
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Clubhouse</h2></div><p>The club feed, the ideas board and the chat room, live from the club server, plus who is on Discord right now.</p></header>
  <div data-for="member owner" hidden><nav class="chips sq-jump" aria-label="Clubhouse sections"><a class="chip" href="#ch-feed">📰 Club feed</a><a class="chip" href="#ch-ideas">💡 Ideas</a><a class="chip" href="#ch-chat">💬 Chat room</a><a class="chip" href="#ch-discord">🎮 On Discord</a></nav>
  <section class="sec sq-sec" id="ch-feed"><header><div><span class="ribbon">📰 Club feed</span></div><p>Goals, results, Rush invites and clips from the squad. Pinned posts first.</p></header><div id="chfeed" class="sq-mount"></div></section>
  <section class="sec sq-sec" id="ch-ideas"><header><div><span class="ribbon">💡 Ideas</span></div><p>Suggestions for the club, voted up by members and answered by the managers.</p></header><div id="chideas" class="sq-mount"></div></section>
  <div class="ch-live"><section class="sec sq-sec" id="ch-chat"><header><div><span class="ribbon">💬 Chat room</span></div><p>Your DMs and group chats. New messages land live.</p></header><div id="chchat" class="sq-mount"></div></section>
  <section class="sec sq-sec" id="ch-discord"><header><div><span class="ribbon">🎮 On Discord</span></div><p>Who is online in the club server and who is in voice.</p></header><div id="chdiscord" class="sq-mount" data-guild="1371311947894489299"></div></section></div></div>
  </section></div>${gate('hub-clubhouse.html')}`;
  return hubShell('hub-clubhouse.html', 'Clubhouse', body, { extraHead: '<script src="docs-md.js" defer></script><script src="clubhouse.js" defer></script><script src="clubchat.js" defer></script>' });
}
export function handbook() {
  const RULES = [['1', 'Channel acknowledgement', 'Mandatory channel acknowledgement and compliance. If it is in the channel, you have read it.'], ['2', 'Never quit', 'No quitting games intentionally. Finish what we started.'], ['3', 'One playstyle', 'Follow the club playstyle and organise roles before kick-off.'], ['4', 'Team first', 'Zero tolerance for selfish play.'], ['5', 'Every voice', 'Open space for opinions and ideas.'], ['6', 'Evaluate and enjoy', 'Use the evaluation surveys regularly, and have fun.']];
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Handbook</h2></div></header>
  <div data-for="member owner" hidden><div class="panel reveal" style="margin-bottom:18px"><h3 style="font-size:28px" class="gold-t">The six club rules</h3><div class="grid g3" data-stagger style="margin-top:14px">${RULES.map(([n, t, d]) => `<div class="panel flat"><div class="num gold-t" style="font-size:40px">${n}</div><h3 style="font-size:17px">${t}</h3><p class="muted small">${d}</p></div>`).join('')}</div></div>
  <nav class="chips hb-jump" aria-label="Handbook sections"><a class="chip" href="#hb-docs">📜 Club docs</a><a class="chip" href="#hb-ps">🧠 Play style</a><a class="chip" href="#hb-up">📰 Game updates</a><a class="chip" href="#hb-site">🧭 How the site works</a></nav>
  <section class="sec hb-sec" id="hb-docs"><header><div><span class="ribbon">Club docs</span></div><p>Announcements, requirements, rules, FAQ and glossary, written by the managers. Squad only.</p></header><div id="hbdocs"></div></section>
  <section class="sec hb-sec" id="hb-ps"><header><div><span class="ribbon">Play style</span></div><p>How we play League and Rush, part by part. Set-piece routines live here too.</p></header><details class="hb-acc ps-acc" id="hb-ourshape" open><summary><span class="hb-ic">📐</span><span><b>Our 3-5-2, role by role</b><small class="muted">The club's League document with the real numbers of each line</small></span></summary><div class="hb-body">${playstyleBlock()}</div></details><h3 class="hb-sub">The managers' notes</h3><div id="hbps"></div></section>
  <section class="sec hb-sec" id="hb-up"><header><div><span class="ribbon">Game updates</span></div><p>The latest EA patch notes that touch Clubs.</p></header><div class="grid g3" data-stagger>${updates.slice(0, 3).map((u) => `<a class="panel hb-up" href="${esc(u.url)}" target="_blank" rel="noopener"><div class="muted tiny">${new Date(u.published).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${u.clubs === true || u.clubs === 'True' ? ' · <span class="pill s">CLUBS</span>' : ''}</div><h3 class="fit">${esc(u.title.replace(/^EA SPORTS FC™ 27 \| /, ''))}</h3><p class="muted small">${esc(String(u.summary || '').slice(0, 160))}${String(u.summary || '').length > 160 ? '…' : ''}</p></a>`).join('')}</div><a class="btn ghost" href="updates.html" style="margin-top:14px">📰 All ${updates.length} updates</a></section>
  <section class="sec hb-sec" id="hb-site"><header><div><span class="ribbon">How the site works</span></div></header><div class="grid g3" data-stagger><div class="panel"><h3>🌍 Public</h3><p class="muted small">Club, Matches, Stats and Tactics are open to everyone and update from EA about every ten minutes.</p></div><div class="panel"><h3>🔑 The Hub</h3><p class="muted small">The gold key opens the Hub for club members: your locker, Match Night, the Squad Room, the Clubhouse and this Handbook.</p></div><div class="panel"><h3>🛡️ Staff</h3><p class="muted small">Managers and the owner also see the Dugout and Boardroom, where match nights, docs and approvals are run.</p></div></div></section></div>
  </section></div>${gate('hub-handbook.html')}`;
  return hubShell('hub-handbook.html', 'Handbook', body, { extraHead: '<script src="docs-md.js" defer></script><script src="handbook.js" defer></script>' });
}

// ---------- STAFF ----------
const staffGate = `<div data-for="guest member" class="panel" style="text-align:center;padding:40px"><h3>Staff only</h3><p class="muted">${process.env.NEXT_PREVIEW ? 'Managers and the owner see the staff tools here after signing in.' : 'Switch “Preview as” to Owner to see the staff tools.'}</p></div>`;
export function staff() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Owner and managers</div><h2>Staff</h2></div></header>${staffGate}<div data-for="owner" hidden class="grid g3">${[['staff-schedule.html', '🗓️', 'Schedule', 'Create, edit and cancel match nights, check in, send session reports'], ['staff-dugout.html', '🧢', 'Dugout', 'Build the lineup for match night on the real pitch'], ['staff-boardroom.html', '👑', 'Boardroom', 'Club health, recruitment and feature switches'], ['staff-artwork.html', '🎨', 'Artwork studio', 'Submit, inspect, download, approve or revoke player artwork']].map(([h, i, t, d]) => `<a class="panel room" href="${h}"><div style="font-size:30px">${i}</div><h3 style="margin:6px 0 2px">${t}</h3><p class="muted small">${d}</p></a>`).join('')}</div></section></div>`;
  return hubShell('staff.html', 'Staff', body);
}
export function dugout() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · match night</div><h2>Dugout</h2></div><div class="chips"><select id="dgF" aria-label="Formation" style="background:var(--p3);color:#fff;border:1px solid var(--line2);border-radius:999px;padding:8px 14px;font:600 13px Inter"></select><button class="chip" id="dgFill">Fill with usual XI</button><button class="chip" id="dgClear">Clear</button></div></header>${staffGate}
  <div data-for="owner" hidden><div id="dgLive" hidden></div><div id="dgLocal"><div class="split"><div><div id="dgPitch"></div></div><aside class="panel detail"><h3>Squad</h3><p class="muted small">Tap a marker on the pitch, then a player here to put them in that slot. Each player can hold one slot.</p><div id="dgList" style="display:grid;gap:6px;max-height:520px;overflow:auto"></div><p class="muted small" id="dgMsg" style="margin-top:8px"></p></aside></div></div></div></section></div>`;
  return hubShell('staff-dugout.html', 'Dugout', body, { extraHead: '<script src="pitch.js" defer></script><link rel="stylesheet" href="tactics.css"><script src="dugout.js" defer></script>', data: { formations: formations.formations, xi: Object.fromEntries(Object.entries(usualXI()).map(([s, p]) => [s, p?.k])) } });
}
export function schedule() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · match nights</div><h2>Schedule</h2></div></header>${staffGate}
  <div data-for="owner" hidden><div id="scLive" hidden></div><div id="scLocal" class="panel sq-empty"><span>🗓️</span><div><b>Sign in to the live Hub</b><p class="muted small">Creating match nights, cancelling, check-in and session reports work on the live club data, so they open when you are signed in as a manager or the owner.</p></div></div></div></section></div>`;
  return hubShell('staff-schedule.html', 'Schedule', body, { extraHead: '<script src="schedule.js" defer></script>' });
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
  <div id="csstaff" class="sq-mount"></div><div id="artlocal">
  <div class="panel" style="margin-bottom:18px"><h3>Submit artwork for any player</h3><div class="chips"><select id="aP" aria-label="Player" style="background:var(--p3);color:#fff;border:1px solid var(--line2);border-radius:10px;padding:10px">${players.map((p) => `<option value="${esc(p.k)}">${esc(p.n)}</option>`).join('')}</select><input id="aK" maxlength="2" placeholder="Kit #" aria-label="Kit number" style="width:80px;padding:10px;border-radius:10px;background:var(--p3);border:1px solid var(--line2);color:#fff"><input id="aF" type="file" accept="image/png" aria-label="PNG file" style="color:var(--soft)"><label class="chip"><input id="aOK" type="checkbox" style="margin-right:6px"> approve right away</label><button class="btn" id="aGo">Upload PNG</button></div><p class="muted small" id="aM" style="margin-top:8px">Transparent PNG, at least 400 px. Non-PNG files and files without transparency are refused.</p></div>
  <div id="aList" class="grid g3"></div></div></div></section></div>`;
  return hubShell('staff-artwork.html', 'Artwork studio', body, { extraHead: '<script src="cardstudio.js" defer></script>', data: { full: players } });
}

export default function (P) {
  P('hub.html', locker()); P('hub-matchnight.html', matchNight()); P('hub-squad.html', squadRoom()); P('hub-clubhouse.html', clubhouse()); P('hub-handbook.html', handbook());
  P('staff.html', staff()); P('staff-dugout.html', dugout()); P('staff-schedule.html', schedule()); P('staff-boardroom.html', boardroom()); P('staff-artwork.html', artwork());
}
