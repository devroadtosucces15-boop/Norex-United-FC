// Archetype builder sandbox page (roadmap PB.2). Called from build.mjs with its page helpers.
//   site/builder.html  public page; everything is rendered client-side from the newest game-rules version
//                      (NXGame.load() → Worker /api/game, else site/api/game.json) by web/builder.js.
// Ships behind the `builder` feature flag: viewers the flag doesn't unlock see a "coming soon" card instead.
export function buildBuilder({ write, page, pageHead, esc, emptyState, config }) {
  write('builder.html', page({
    title: `Pro Builder – ${config.siteTitle}`, base: '', active: 'builder',
    description: 'Plan your FC 27 Clubs Pro: pick an archetype, choose a level up to the current max, spend archetype points and share the build.',
    body: `${pageHead('🧬 Pro Builder', 'Pick an archetype, set your level up to today’s max, spend your archetype points – then share the build with the squad.', '')}
<div data-flag="builder" hidden><div class="bd" data-builder><div data-bd-body><div class="card muted">⏳ Loading game data…</div></div></div></div>
<div class="bd-soon">${emptyState('🧪', 'The Pro Builder is in the lab', 'We’re filling it with the FC 27 numbers from the in-game screens. It opens for everyone soon.')}</div>
<p class="muted small">Planning tool made by ${esc(config.siteTitle)} from EA’s published rules and in-game values. Not affiliated with EA.</p>
<link rel="stylesheet" href="assets/builder.css"><link rel="stylesheet" href="assets/probuilds.css"><script src="assets/game.js" defer></script><script src="assets/build-math.js" defer></script><script src="assets/builder.js" defer></script>`,
  }));
}
