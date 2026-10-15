// The Hub as its own gold clubhouse (redesign board 10, front end for BE8). The backend (bot/hub.js) already
// serves GET /api/hub (site-wide online count + canWave) and the live HUB_ROOM Durable Object; this page is
// the entry point board 10 was still missing: a members-only /hub/ page with its own gold identity, a
// players'-tunnel intro (once a day, skippable) and a 3D room map. Rooms deep-link into the features that
// already exist (Squad Hub tabs, Tactics Studio) rather than new per-room pages – that's a bigger lift left
// for whichever board (06/12/13) actually builds that room's content, same scope cut as the other boards in
// REDESIGN.md Part B.
export function buildHub({ write, page, pageHead, emptyState, config }) {
  write('hub/index.html', page({
    title: `The Hub – ${config.siteTitle}`, base: '../', active: 'hub', hub: true,
    description: `${config.siteTitle}'s members-only clubhouse.`,
    body: `${pageHead('The Hub', 'Your clubhouse. Walk into the Locker Room, Match Night Centre, Tactics Room and more.', '../', false)}
<div data-flag="hub" hidden><div class="hubw-coach" data-hubw-coach hidden></div><div class="hubw-live" data-hubw-live hidden></div><div id="hubworld" class="hubworld" data-hubworld><p class="muted">Loading the clubhouse…</p></div></div>
<div class="hubw-soon">${emptyState('🔑', 'The Hub is for members', 'Your own gold clubhouse, with its own rooms – log in with Discord and you’re in.')}</div>
<link rel="stylesheet" href="../assets/hub.css"><link rel="stylesheet" href="../assets/hubgold.css">`,
  }));
}
