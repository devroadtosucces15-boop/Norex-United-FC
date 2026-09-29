// Club feed page (roadmap P6.1). Called from build.mjs with its page helpers.
//   site/feed.html  posts, reactions and comments – drawn by web/feed.js from the Worker (/api/feed), behind the `feed` flag.
// Viewers the flag doesn't unlock see a "members only" card instead.
export function buildFeed({ write, page, pageHead, emptyState, config }) {
  write('feed.html', page({
    title: `Club feed – ${config.siteTitle}`, base: '', active: 'feed',
    description: `${config.siteTitle} squad feed – clips, results and banter from the members.`,
    body: `${pageHead('📰 Club feed', 'Clips, results, Rush invites and banter from the squad. React with the club emoji, comment and reply.', '')}
<div data-flag="feed" hidden><div class="fd" data-feed></div></div>
<div class="fd-soon">${emptyState('📰', 'The club feed is for members', 'Squad posts, clips and comments live here – log in with Discord to join in. Rolling out to everyone soon.')}</div>
<link rel="stylesheet" href="assets/docs.css"><link rel="stylesheet" href="assets/feed.css"><script src="assets/docs-md.js" defer></script><script src="assets/social.js" defer></script><script src="assets/feed.js" defer></script>`,
  }));
}
