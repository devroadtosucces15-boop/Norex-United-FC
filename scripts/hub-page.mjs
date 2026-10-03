// Hub member surface (BE8). The Worker owns auth/permissions; the client joins the shared HUB_ROOM socket.
export function buildHub({ write, page, pageHead, emptyState, config }) {
  write('hub.html', page({
    title: `Hub – ${config.siteTitle}`, base: '', active: 'hub-room',
    description: `${config.siteTitle} clubhouse – see who's around and wave to teammates.`,
    body: `${pageHead('🏠 Club Hub', 'A lightweight live clubhouse for the squad. See who is here and wave to teammates.', '')}
<div data-flag="hub" hidden><div class="clubhub" data-club-hub></div></div>
<div class="clubhub-soon">${emptyState('🏠', 'The Hub is being staged', 'The clubhouse is available to the roles currently enabled for this feature.')}</div>
<link rel="stylesheet" href="assets/hub.css"><script src="assets/hub.js" defer></script>`,
  }));
}
