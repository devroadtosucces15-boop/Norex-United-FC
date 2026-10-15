// Pro Builds board page (roadmap PB.3). Called from build.mjs with its page helpers.
//   site/probuilds.html  public page; the board is drawn client-side by web/probuilds.js from the Worker
//                        (/api/probuilds) and decoded with the newest game rules (web/buildcard.js).
// Ships behind the `proBuilds` feature flag: viewers the flag doesn't unlock see a "coming soon" card instead.
export function buildProBuilds({ write, page, pageHead, esc, emptyState, config }) {
  write('probuilds.html', page({
    title: `Pro Builds – ${config.siteTitle}`, base: '', active: 'probuilds',
    description: 'Clubs Pro builds the NOREX squad actually plays – vote, comment and try them in the Pro Builder.',
    body: `${pageHead('🏆 Pro Builds', 'Builds the squad actually plays. Vote them up, tell the author how they played, try them in the sandbox – or make one your own.', '')}
<div data-flag="proBuilds" hidden><div class="pb" data-probuilds></div></div>
<div class="pb-soon">${emptyState('🏗️', 'Pro Builds is being built', 'Soon the squad’s best builds land here – voted, commented and one click from the Pro Builder.')}</div>
<p class="muted small">* OVR and face stats are estimates from the ${esc(config.siteTitle)} Pro Builder – EA doesn’t publish its formula. Not affiliated with EA.</p>
<link rel="stylesheet" href="assets/probuilds.css"><script src="assets/buildcard.js" defer></script><script src="assets/probuilds.js" defer></script>`,
  }));
}
