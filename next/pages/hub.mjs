import { cfg, features, players, usualXI, clubStats as C, matches, updates } from '../lib/data.mjs';
import * as W from '../lib/widgets.mjs';
import { shell, esc, sample, sbt, chip, liveStrip } from '../lib/ui.mjs';
import { formations } from './stats.mjs';
import { playstyleBlock } from './tactics.mjs';

const ROOMS = [['hub.html', '🎽', 'My Locker', 'Your card, artwork, stats, trophies and alerts'], ['hub-matchnight.html', '🗓️', 'Match Night', 'RSVP, availability, MOTM votes, ratings, Rush log'], ['hub-squad.html', '🤝', 'Squad Room', 'Team up, awards, predictions, Rush squads and scouting'], ['hub-clubhouse.html', '💬', 'Clubhouse', 'Club feed, ideas board, chat room and who is on Discord'], ['hub-handbook.html', '📜', 'Handbook', 'Club rules, docs and how the site works']];
const ROOMCLS = { 'hub.html': 'locker', 'hub-matchnight.html': 'night', 'hub-squad.html': 'squadr', 'hub-clubhouse.html': 'clubh', 'hub-handbook.html': 'handb', 'hub-watchlist.html': 'clubh', 'hub-discoveries.html': 'clubh', 'hub-music.html': 'clubh' };
const HUBX = '<link rel="stylesheet" href="hubx.css"><script src="hubx.js" defer></script>';
const hubShell = (page, title, body, extra = {}) => shell({ group: 'hub', page, title, body, ...extra, bodyClass: `hub-page room-${ROOMCLS[page] || 'staff'}`, extraHead: HUBX + (extra.extraHead || '') });


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
  const body = `<div class="wrap"><div class="lockplate" aria-hidden="true"><span class="lp-rv"></span><span class="lp-in"><i>🎽</i><b>My Locker</b><small>your card · your numbers · your medals</small></span><span class="lp-rv"></span></div></div>${gate('hub.html')}
  <div data-for="member owner" hidden>
   <div id="cardslot"></div>
   <div id="noclaim" hidden class="wrap"><div class="panel" style="max-width:620px;margin:40px auto;text-align:center"><h3>Link your player to get your card</h3><p class="muted" style="margin:8px 0 14px">You are signed in, but your Discord is not linked to a club player yet. Link it in the live Hub, then come back and your locker opens with your own card.</p><a class="btn gold" href="../members.html">Open the live Hub</a></div></div>
   <section class="lockstage" id="lockstage"><div class="side l"><div class="panel reveal" id="nextpanel"><div class="eyebrow">🗓️ Next match night</div><h3 style="margin:6px 0">None scheduled</h3><p class="muted small">You'll be alerted here the moment the managers schedule one.</p><a class="btn ghost" href="hub-matchnight.html" style="margin-top:6px">Match Night</a></div>
     <div class="panel reveal" style="--i:1" id="alertpanel"><div class="eyebrow"><span class="lk-bell" aria-hidden="true">🔔</span> Alerts</div><p class="muted small" style="margin-top:6px">${sample()} No new alerts. Approvals, RSVPs and mentions appear here.</p></div>
     <div class="panel reveal" style="--i:2" id="medalpanel" hidden></div></div>
    <div class="side r"><div class="panel reveal" id="mystats"></div><div class="panel reveal" style="--i:1" id="formpanel" hidden></div>
     <nav class="panel reveal lk-quick" style="--i:2" aria-label="Rooms"><div class="eyebrow">🚪 Rooms</div><div class="lk-q">${ROOMS.filter(([h]) => h !== 'hub.html').map(([h, i, t]) => `<a href="${h}"><span>${i}</span>${t}</a>`).join('')}</div></nav>
     <div class="panel reveal" style="--i:3" id="artpanel"></div></div></section>
   <div class="wrap">${liveStrip}</div>
   <nav class="wrap lk-jump" aria-label="In your locker"><a href="#lk-me">🪪 My profile</a><a href="#lk-mystats">📊 My stats</a><a href="#lk-medals">🏅 Medals</a><a href="#lk-cards">🎨 Card Studio</a><a href="#lk-alerts">🔔 Alerts</a><a href="#lk-alertset">⚙️ Settings</a></nav>
   <div class="wrap"><section class="sec sq-sec" id="lk-me" style="margin-top:20px"><header><div><span class="ribbon">🪪 My profile</span></div><p>What teammates see on your card, hover card and in Team up. Only what you change is saved.</p></header><div id="lkme" class="sq-mount"></div></section>
   <section class="sec sq-sec" id="lk-streams" data-mystreams hidden><header><div><span class="ribbon">📺 My streams</span></div><p>The channels on your profile, and whether you are on air right now.</p></header><div class="nxs-row" data-ms-row></div></section>
   <section class="sec sq-sec" id="lk-mystats"><header><div><span class="ribbon">📊 My stats</span></div><p>Your League season and your all-time numbers, ranked against everyone with eight or more games.</p></header><div id="lkstats" class="sq-mount"></div></section>
   <section class="sec sq-sec" id="lk-medals"><header><div><span class="ribbon">🏅 Badges and achievements</span></div><p>Achievements unlock from your games, votes and RSVPs. Badges are shout-outs from teammates.</p></header><div id="lkmedals" class="sq-mount"></div></section>
   <section class="sec sq-sec" id="lk-cards"><header><div><span class="ribbon">🎨 Card Studio</span></div><p>Send one photo a month. A manager checks it, the club style draws it, and your face lands on every player card.</p></header><div id="lkcards" class="sq-mount"></div></section></div>
   <div class="wrap lk-al2"><section class="sec sq-sec" id="lk-alerts" style="margin-top:20px"><header><div><span class="ribbon">🔔 Alerts inbox</span></div><p>Everything the club sent you, newest first. Open one to jump straight to it.</p></header><div id="lkinbox" class="sq-mount"></div></section>
   <section class="sec sq-sec" id="lk-alertset"><header><div><span class="ribbon">⚙️ Alert settings</span></div><p>Pick how each kind of alert reaches you: a Discord DM, only here, or not at all.</p></header><div id="lkprefs" class="sq-mount"></div></section></div>
   <div class="wrap"><section class="sec" data-disc-widget hidden style="margin-top:20px"><header><div><span class="ribbon">Discoveries</span></div><a class="btn ghost" href="hub-discoveries.html">See them all</a></header><div class="nxd-row" data-disc-row></div></section></div>
   <div class="wrap"><section class="sec" style="margin-top:20px"><header><div><span class="ribbon">Your shape</span></div><p>How your game compares with the squad. Each axis is scaled to the best player.</p></header><div class="grid g2"><div class="panel reveal" id="myviz"></div><div class="panel reveal" style="--i:1"><h3>Your tier</h3>${W.tiers()}<h3 style="margin-top:16px">Trophy cabinet</h3>${W.cabinet()}</div></div></section></div>
   <div class="wrap"><section class="sec" style="margin-top:20px"><header><div><span class="ribbon">The Hub</span></div><p>Five rooms, one key. Staff tools sit with them for managers and the owner.</p></header>
    <div class="grid g3" data-stagger>${ROOMS.map(([h, i, t, d]) => `<a class="panel room" href="${h}"><div style="font-size:30px">${i}</div><h3 style="margin:6px 0 2px">${t}</h3><p class="muted small">${d}</p></a>`).join('')}<a class="panel room" data-flag="watchlist" hidden href="hub-watchlist.html"><div style="font-size:30px">🎬</div><h3 style="margin:6px 0 2px">Watch list</h3><p class="muted small">Pro Clubs videos sorted by topic</p></a><a class="panel room" data-flag="discoveries" hidden href="hub-discoveries.html"><div style="font-size:30px">🔎</div><h3 style="margin:6px 0 2px">Discoveries</h3><p class="muted small">Tips teammates found, checked by the managers</p></a><a class="panel room" data-flag="music" hidden href="hub-music.html"><div style="font-size:30px">🎧</div><h3 style="margin:6px 0 2px">Music</h3><p class="muted small">Norex DJ: what is playing in the voice rooms</p></a><a class="panel room" data-for="owner" hidden href="staff.html" style="border-color:rgba(239,207,122,.5)"><div style="font-size:30px">🛡️</div><h3 style="margin:6px 0 2px" class="gold-t">Staff</h3><p class="muted small">Dugout, Boardroom and the Artwork studio</p></a></div></section></div>
  </div>`;
  return hubShell('hub.html', 'My Locker', body, { extraHead: '<link rel="stylesheet" href="tactics.css"><script src="alerts.js" defer></script><script src="mylocker.js" defer></script><script src="botpages.js" defer></script><script src="tonight.js" defer></script><script src="cardstudio.js" defer></script>', data: { full: players } });
}

// ---------- WATCH LIST and DISCOVERIES (bot features, each behind its own owner flag) ----------
const flagOff = (what, attr) => `<div ${attr} class="panel nx-off" hidden style="text-align:center"><h3>${what} isn’t open yet</h3><p class="muted">The managers are still testing it. It will show up here, and in the Hub, the moment it opens.</p><a class="btn ghost" href="hub.html" style="margin-top:10px">Back to My Locker</a></div>`;
export function watchlist() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Watch list</h2></div><p>Pro Clubs videos from the creators the managers follow, sorted by topic. Tap Useful on the ones that helped you.</p></header></section></div>${gate('hub-watchlist.html')}
  <div class="wrap" data-for="member owner" hidden data-watchlist>${flagOff('The Watch list', 'data-wl-off')}
   <div data-wl-on hidden><div class="chips" id="wl-topics" role="group" aria-label="Filter by topic"></div><div class="nxv-grid" id="wl-grid" aria-live="polite" aria-busy="true"></div></div></div>`;
  return hubShell('hub-watchlist.html', 'Watch list', body, { extraHead: '<script src="botpages.js" defer></script>' });
}
export function music() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Norex DJ</div><h2>Music</h2></div><p>What is playing in the club’s voice rooms right now. Add a song, skip, pause or turn it down from here.</p></header></section></div>${gate('hub-music.html')}
  <div class="wrap" data-for="member owner" hidden data-music>${flagOff('Music', 'data-mu-off')}
   <div data-mu-on hidden><div class="nxm-bar chips"><span class="muted small" data-mu-state aria-live="polite"></span><button type="button" class="chip" data-mu-sample>🧪 Preview with sample rooms</button></div><div class="nxm-rooms" id="mu-rooms" aria-live="polite" aria-busy="true"></div></div></div>`;
  return hubShell('hub-music.html', 'Music', body, { extraHead: '<link rel="stylesheet" href="music.css"><script src="music.js" defer></script>' });
}
export function discoveries() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Discoveries</h2></div><p>Tricks, videos and patch details teammates found. Post yours in Discord with /share. A manager checks it, then it lands here.</p></header></section></div>${gate('hub-discoveries.html')}
  <div class="wrap" data-for="member owner" hidden data-discoveries>${flagOff('Discoveries', 'data-dc-off')}
   <div data-dc-on hidden><div id="dc-feed" aria-live="polite" aria-busy="true"></div></div></div>`;
  return hubShell('hub-discoveries.html', 'Discoveries', body, { extraHead: '<script src="botpages.js" defer></script>' });
}

// ---------- MATCH NIGHT ----------
export function matchNight() {
  // Rebuilt for #50: one hero, a week strip, a swipeable vote, a rating deck. matchnight.js draws every panel from the member routes.
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Match night</h2></div><p>Answer once, tap your days, vote and rate in a few swipes.</p></header></section></div>${gate('hub-matchnight.html')}
  <div class="wrap mn" data-for="member owner" hidden>
   <div class="panel mn-hero reveal" id="mnhero"></div>
   <nav class="chips mn-jump" aria-label="Match night sections"><a class="chip" href="#mn-week">📅 My week</a><a class="chip" href="#mn-motm">⭐ Man of the match</a><a class="chip" href="#mn-rate">✨ Ratings</a><a class="chip" href="#mn-plays">📋 Plays</a><a class="chip" href="#mn-rush">⚡ Rush log</a></nav>
   <section class="sec mn-sec" id="mn-week"><header><div><span class="ribbon">📅 My week</span></div><p>Which days can you play? The managers plan the squad from this.</p></header><div id="mnweek"></div></section>
   <section class="sec mn-sec" id="mn-motm"><header><div><span class="ribbon">⭐ Man of the match</span></div><p>One match at a time. Swipe the players and tap your pick.</p></header><div id="mnmotm"></div></section>
   <section class="sec mn-sec" id="mn-rate"><header><div><span class="ribbon">✨ Rate your teammates</span></div><p>One player at a time. Averages feed the leaderboards.</p></header><div id="mnrate"></div></section>
   <section class="sec sq-sec" id="mn-plays" style="margin-top:22px"><header><div><span class="ribbon">📋 Tonight’s plays</span></div><p>What the managers want the squad to know for the next match night. Study each one, then tick it off.</p></header><div id="mnplays" class="sq-mount"></div></section>
   <section class="sec mn-sec" id="mn-rush"><div id="mnrush"></div></section>
  </div>`;
  return hubShell('hub-matchnight.html', 'Match Night', body, { extraHead: '<script src="tonight.js" defer></script><script src="matchnight.js" defer></script>' });
}
export function squadRoom() {
  // Read from the live member API by squad.js (Team up, awards, predictions, Rush squads, scouting). Each panel loads on its own.
  const SECS = [['sq-team', '🎯', 'Team up', 'Who to play with tonight, ranked from who is around, play times, positions and your results together.', 'sqteam'],
    ['sq-awards', '👏', 'Squad kudos', 'Shout-outs from the squad, every week. Give your kudos, see who earned them last week. The ballot closes Sunday at midnight (UTC). Legends live in the Hall of Fame; this is the weekly thank-you.', 'sqawards'],
    ['sq-predict', '🔮', 'Predictions', 'Call our score before kick-off. Exact score 3 points, right result and goal difference 2, right result 1.', 'sqpredict'],
    ['sq-squads', '🤝', 'Rush squads', 'Four humans and an AI keeper. Managers publish the squads; your teammate picks help them choose.', 'sqsquads'],
    ['sq-scout', '🔭', 'Scouting', 'Players you recommended to the managers and where each one is now.', 'sqscout']];
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Squad room</h2></div><p>Who to play with, the weekly vote, score predictions, Rush squads and your scouting tips. All live from the club server.</p></header>
  <div data-for="member owner" hidden><nav class="chips sq-jump" aria-label="Squad room sections">${SECS.map(([id, i, t]) => `<a class="chip" href="#${id}">${i} ${t}</a>`).join('')}</nav>
  ${SECS.map(([id, i, t, d, mount], n) => `<section class="sec sq-sec${id === 'sq-awards' ? ' kudos' : ''}" id="${id}"><header><div><span class="ribbon">${i} ${t}</span></div><p>${d}</p></header><div id="${mount}" class="sq-mount"></div></section>`).join('')}</div></section></div>${gate('hub-squad.html')}`;
  return hubShell('hub-squad.html', 'Squad Room', body, { extraHead: '<script src="recs.js" defer></script><script src="squad.js" defer></script>' });
}
export function clubhouse() {
  // Live from the member API: the club feed (/api/feed) and ideas board (/api/suggestions) in clubhouse.js, the chat room
  // (/api/chats + the chat socket) in clubchat.js, and who is on the club Discord right now (Discord's public widget feed).
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Clubhouse</h2></div><p>The club feed, the ideas board and the chat room, live from the club server, plus who is on Discord right now.</p></header>
  <div data-for="member owner" hidden><nav class="chips sq-jump" aria-label="Clubhouse sections"><a class="chip" href="#ch-feed">📰 Club feed</a><a class="chip" href="#ch-ideas">💡 Ideas</a><a class="chip" href="#ch-chat">💬 Chat room</a><a class="chip" href="#ch-feedback" data-fb-chip hidden>💌 Praise &amp; feedback</a><a class="chip" href="#ch-discord">🎮 On Discord</a></nav>
  <section class="sec sq-sec" id="ch-feed"><header><div><span class="ribbon">📰 Club feed</span></div><p>Goals, results, Rush invites and clips from the squad. Pinned posts first.</p></header><div id="chfeed" class="sq-mount"></div></section>
  <section class="sec sq-sec" id="ch-ideas"><header><div><span class="ribbon">💡 Ideas</span></div><p>Suggestions for the club, voted up by members and answered by the managers.</p></header><div id="chideas" class="sq-mount"></div></section>
  <div class="ch-live"><section class="sec sq-sec" id="ch-chat"><header><div><span class="ribbon">💬 Chat room</span></div><p>Your DMs and group chats. New messages land live.</p></header><div id="chchat" class="sq-mount"></div></section>
  <section class="sec sq-sec" id="ch-feedback" hidden><header><div><span class="ribbon">💌 Praise &amp; feedback</span></div><p>Tell a teammate what they do well, anonymously if you like. Your inbox, reactions and what you sent live here.</p></header><div id="chfeedback" class="sq-mount"></div></section>
  <section class="sec sq-sec" id="ch-discord"><header><div><span class="ribbon">🎮 On Discord</span></div><p>Who is online in the club server and who is in voice.</p></header><div id="chdiscord" class="sq-mount" data-guild="1371311947894489299"></div></section></div></div>
  </section></div>${gate('hub-clubhouse.html')}`;
  return hubShell('hub-clubhouse.html', 'Clubhouse', body, { extraHead: '<script src="docs-md.js" defer></script><script src="clubhouse.js" defer></script><script src="clubchat.js" defer></script><script src="feedbackroom.js" defer></script>' });
}
// The rules as an animated clipboard (#52). Server-rendered with the club's six rules; handbook.js swaps in the live rules from /api/docs
// and runs the tick-off ritual (pen, check, next rule) plus the acknowledge.
const clipboard = (rules) => `<section class="hb-sec" id="hb-rules"><div class="clip" id="hbclip" data-static="1" aria-label="The club rules">
 <span class="clip-metal" aria-hidden="true"><i></i></span>
 <div class="clip-sheet"><header class="clip-h"><b>NOREX UNITED FC</b><span>Club rules</span><small class="clip-prog" id="clipprog" aria-live="polite"></small></header>
  <ol class="clip-l" id="cliplist">${rules.map(([n, t, d]) => `<li class="clip-r" data-rid="s${n}"><span class="clip-n" aria-hidden="true">${n}</span><div><b>${t}</b><p>${d}</p></div><button type="button" class="clip-ck" data-ck="s${n}" aria-label="I have read rule ${n}: ${t}"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 21l8 8 16-19" pathLength="1"/></svg></button></li>`).join('')}</ol>
  <footer class="clip-f" id="clipfoot"><p class="muted small">Tick each rule as you read it. Managers can see who has acknowledged the current rules.</p></footer></div>
</div></section>`;
export function handbook() {
  const RULES = [['1', 'Channel acknowledgement', 'Mandatory channel acknowledgement and compliance. If it is in the channel, you have read it.'], ['2', 'Never quit', 'No quitting games intentionally. Finish what we started.'], ['3', 'One playstyle', 'Follow the club playstyle and organise roles before kick-off.'], ['4', 'Team first', 'Zero tolerance for selfish play.'], ['5', 'Every voice', 'Open space for opinions and ideas.'], ['6', 'Evaluate and enjoy', 'Use the evaluation surveys regularly, and have fun.']];
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Members</div><h2>Handbook</h2></div></header>
  <div data-for="member owner" hidden>${clipboard(RULES)}
  <nav class="chips hb-jump" aria-label="Handbook sections"><a class="chip" href="#hb-rules">📋 Club rules</a><a class="chip" href="#hb-docs">📜 Club docs</a><a class="chip" href="#hb-voice">💡 Suggestions &amp; feedback</a><a class="chip" href="#hb-ps">🧠 Play style</a><a class="chip" href="#hb-up">📰 Game updates</a><a class="chip" href="#hb-site">🧭 How the site works</a></nav>
  <section class="sec hb-sec" id="hb-voice"><header><div><span class="ribbon">💡 Suggestions &amp; feedback</span></div><p>Ideas to improve the club, and honest feedback. These live with the documents because they keep the club in order.</p></header><div class="grid g3" data-stagger><a class="panel room" href="hub-clubhouse.html#ch-ideas"><div style="font-size:30px">💡</div><h3 style="margin:6px 0 2px">Suggestion box</h3><p class="muted small">Post an idea, vote up the ones you like. Managers answer each one.</p></a><a class="panel room" href="hub-clubhouse.html#ch-feedback"><div style="font-size:30px">🕶️</div><h3 style="margin:6px 0 2px">Anonymous feedback</h3><p class="muted small">Something you would rather not say with your name on it? Use the ideas board and tick anonymous, or leave praise and feedback in the Clubhouse feedback room.</p></a><a class="panel room" href="join.html"><div style="font-size:30px">🙋</div><h3 style="margin:6px 0 2px">Report a problem</h3><p class="muted small">Use the 🐞 button on any page. It sends the page you are on to the managers.</p></a></div></section>
  <section class="sec hb-sec" id="hb-docs"><header><div><span class="ribbon">Club docs</span></div><p>Announcements, requirements, rules, FAQ and glossary, written by the managers. Squad only.</p></header><div id="hbdocs"></div></section>
  <section class="sec hb-sec" id="hb-ps"><header><div><span class="ribbon">Play style</span></div><p>How we play League and Rush, part by part. Set-piece routines live here too.</p></header><details class="hb-acc ps-acc" id="hb-ourshape" open><summary><span class="hb-ic">📐</span><span><b>Our 3-5-2, role by role</b><small class="muted">The club's League document with the real numbers of each line</small></span></summary><div class="hb-body">${playstyleBlock()}</div></details><h3 class="hb-sub">The managers' notes</h3><div id="hbps"></div></section>
  <section class="sec hb-sec" id="hb-up"><header><div><span class="ribbon">Game updates</span></div><p>The latest EA patch notes that touch Clubs.</p></header><div class="grid g3" data-stagger>${updates.slice(0, 3).map((u) => `<a class="panel hb-up" href="${esc(u.url)}" target="_blank" rel="noopener"><div class="muted tiny">${new Date(u.published).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${u.clubs === true || u.clubs === 'True' ? ' · <span class="pill s">CLUBS</span>' : ''}</div><h3 class="fit">${esc(u.title.replace(/^EA SPORTS FC™ 27 \| /, ''))}</h3><p class="muted small">${esc(String(u.summary || '').slice(0, 160))}${String(u.summary || '').length > 160 ? '…' : ''}</p></a>`).join('')}</div><a class="btn ghost" href="updates.html" style="margin-top:14px">📰 All ${updates.length} updates</a></section>
  <section class="sec hb-sec" id="hb-site"><header><div><span class="ribbon">How the site works</span></div></header><div class="grid g3" data-stagger><div class="panel"><h3>🌍 Public</h3><p class="muted small">Club, Matches, Stats and Tactics are open to everyone and update from EA about every ten minutes.</p></div><div class="panel"><h3>🔑 The Hub</h3><p class="muted small">The gold key opens the Hub for club members: your locker, Match Night, the Squad Room, the Clubhouse and this Handbook.</p></div><div class="panel"><h3>🛡️ Staff</h3><p class="muted small">Managers and the owner also see the Dugout and Boardroom, where match nights, docs and approvals are run.</p></div></div></section></div>
  </section></div>${gate('hub-handbook.html')}`;
  return hubShell('hub-handbook.html', 'Handbook', body, { extraHead: '<script src="docs-md.js" defer></script><script src="clipboard.js" defer></script><script src="handbook.js" defer></script>' });
}

// ---------- STAFF ----------
const staffGate = `<div data-for="guest member" class="panel" style="text-align:center;padding:40px"><h3>Staff only</h3><p class="muted">${process.env.NEXT_PREVIEW ? 'Managers and the owner see the staff tools here after signing in.' : 'Switch “Preview as” to Owner to see the staff tools.'}</p></div>`;
export function staff() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Owner and managers</div><h2>Staff</h2></div></header>${staffGate}<div data-for="owner" hidden class="grid g3">${[['staff-schedule.html', '🗓️', 'Schedule', 'Create, edit and cancel match nights, check in, send session reports'], ['staff-desk.html', '🗂️', 'Desk', 'Approve claims, confirm Rush results, move trials along, private notes'], ['staff-tools.html', '🛠️', 'Tools', 'Submissions, reported content, game data, bot settings, awards'], ['staff-content.html', '📄', 'Content', 'Club docs and rules, ideas board, squad week, media storage'], ['staff-dugout.html', '🧢', 'Dugout', 'Build the lineup for match night on the real pitch'], ['staff-insights.html', '🧭', 'Insights', 'Club Intelligence, written club notes and the burner-club tracker'], ['staff-boardroom.html', '👑', 'Boardroom', 'Club health, recruitment and feature switches'], ['staff-artwork.html', '🎨', 'Artwork studio', 'Submit, inspect, download, approve or revoke player artwork']].map(([h, i, t, d]) => `<a class="panel room" href="${h}"><div style="font-size:30px">${i}</div><h3 style="margin:6px 0 2px">${t}</h3><p class="muted small">${d}</p></a>`).join('')}</div></section></div>`;
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
export function desk() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · work queues</div><h2>Desk</h2></div></header>${staffGate}
  <div data-for="owner" hidden><div id="dkLive" hidden></div><div id="dkLocal" class="panel sq-empty"><span>🗂️</span><div><b>Sign in to the live Hub</b><p class="muted small">Claims, Rush confirmations, trials and private notes work on the live club data, so they open when you are signed in as a manager or the owner.</p></div></div></div></section></div>`;
  return hubShell('staff-desk.html', 'Desk', body, { extraHead: '<script src="desk.js" defer></script>' });
}
export function tools() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · moderation and settings</div><h2>Tools</h2></div></header>${staffGate}
  <div data-for="owner" hidden><div id="tlLive" hidden></div><div id="tlLocal" class="panel sq-empty"><span>🛠️</span><div><b>Sign in to the live Hub</b><p class="muted small">Submissions, reported content, game data, bot settings and awards work on the live club data, so they open when you are signed in as a manager or the owner.</p></div></div></div></section></div>`;
  return hubShell('staff-tools.html', 'Tools', body, { extraHead: '<script src="tools.js" defer></script>' });
}
export function content() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · club docs and community</div><h2>Content</h2></div></header>${staffGate}
  <div data-for="owner" hidden><div id="ctLive" hidden></div><div id="ctLocal" class="panel sq-empty"><span>📄</span><div><b>Sign in to the live Hub</b><p class="muted small">Club docs and rules, the ideas board, the squad week and media storage work on the live club data, so they open when you are signed in as a manager or the owner.</p></div></div></div></section></div>`;
  return hubShell('staff-content.html', 'Content', body, { extraHead: '<link rel="stylesheet" href="content.css"><script src="content.js" defer></script>' });
}
export function insights() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · club health</div><h2>Insights</h2></div></header>${staffGate}
  <div data-for="owner" hidden><div id="ixLive" hidden></div><div id="ixLocal" class="panel sq-empty"><span>🧭</span><div><b>Sign in to the live Hub</b><p class="muted small">Club Intelligence, the written club notes and the burner tracker work on the live club data, so they open when you are signed in as a manager or the owner.</p></div></div></div></section></div>`;
  return hubShell('staff-insights.html', 'Insights', body, { extraHead: '<script src="intel.js" defer></script>' });
}
export function boardroom() {
  const flags = Object.entries(features);
  const stub = `<div class="sb">${sbt(C.sr, 'Skill rating', 'gold')}${sbt(C.div || 1, 'Division')}${sbt(players.length, 'Players')}${sbt(C.promotions, 'Promotions')}</div>
  <div class="grid g2" style="margin-top:20px"><div class="panel"><h3>Recruitment</h3><p class="muted small">${esc(cfg.recruitment?.headline ?? '')} · ${cfg.recruitment?.open ? 'open' : 'closed'}</p><div class="chips" style="margin-top:8px">${(cfg.recruitment?.positions ?? []).map((p) => `<span class="chip gold">${esc(p)}</span>`).join('')}</div></div>
  <div class="panel"><h3>Feature switches · ${flags.length}</h3><p class="muted small">Who can see each feature on the live site (from the club config). Sign in as the owner to change them.</p><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${flags.map(([k, v]) => `<span class="pill ${v === 'public' ? 'w' : v === 'owner' ? 's' : ''}">${esc(k)} · ${esc(v)}</span>`).join('')}</div></div></div>`;
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · owner</div><h2>Boardroom</h2></div></header>${staffGate}<div data-for="owner" hidden>
  <div id="brLive" hidden data-committed="${esc(JSON.stringify(features))}"></div><div id="brLocal">${stub}</div></div></section></div>`;
  return hubShell('staff-boardroom.html', 'Boardroom', body, { extraHead: '<script src="trophy.js" defer></script><script src="routing-ui.js" defer></script><script src="boardroom.js" defer></script>' });
}
export function artwork() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:30px"><header><div><div class="eyebrow">Staff · owner</div><h2>Artwork studio</h2></div></header>${staffGate}<div data-for="owner" hidden>
  <div id="csstaff" class="sq-mount"></div><div id="artlocal">
  <div class="panel" style="margin-bottom:18px"><h3>Submit artwork for any player</h3><div class="chips"><select id="aP" aria-label="Player" style="background:var(--p3);color:#fff;border:1px solid var(--line2);border-radius:10px;padding:10px">${players.map((p) => `<option value="${esc(p.k)}">${esc(p.n)}</option>`).join('')}</select><input id="aK" maxlength="2" placeholder="Kit #" aria-label="Kit number" style="width:80px;padding:10px;border-radius:10px;background:var(--p3);border:1px solid var(--line2);color:#fff"><input id="aF" type="file" accept="image/png" aria-label="PNG file" style="color:var(--soft)"><label class="chip"><input id="aOK" type="checkbox" style="margin-right:6px"> approve right away</label><button class="btn" id="aGo">Upload PNG</button></div><p class="muted small" id="aM" style="margin-top:8px">Transparent PNG, at least 400 px. Non-PNG files and files without transparency are refused.</p></div>
  <div id="aList" class="grid g3"></div></div></div></section></div>`;
  return hubShell('staff-artwork.html', 'Artwork studio', body, { extraHead: '<script src="cardstudio.js" defer></script>', data: { full: players } });
}

export default function (P) {
  P('hub.html', locker()); P('hub-matchnight.html', matchNight()); P('hub-squad.html', squadRoom()); P('hub-clubhouse.html', clubhouse()); P('hub-handbook.html', handbook()); P('hub-watchlist.html', watchlist()); P('hub-discoveries.html', discoveries()); P('hub-music.html', music());
  P('staff.html', staff()); P('staff-dugout.html', dugout()); P('staff-schedule.html', schedule()); P('staff-desk.html', desk()); P('staff-tools.html', tools()); P('staff-content.html', content()); P('staff-boardroom.html', boardroom()); P('staff-insights.html', insights()); P('staff-artwork.html', artwork());
}
