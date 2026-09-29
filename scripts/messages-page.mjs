// Messaging page (roadmap P6.3a). site/messages.html – chat list + thread, drawn by web/messages.js from
// the Worker (/api/chats*), behind the `messages` flag. Viewers the flag doesn't unlock see a "members only" card.
export function buildMessages({ write, page, pageHead, emptyState, config }) {
  write('messages.html', page({
    title: `Messages – ${config.siteTitle}`, base: '', active: 'messages',
    description: `${config.siteTitle} member messaging – DMs and group chats.`,
    body: `${pageHead('💬 Messages', 'DMs and group chats with the squad. Owners can read every chat for moderation – see the notice in the header.', '')}
<div data-flag="messages" hidden><div class="mc" data-messages></div></div>
<div class="mc-soon">${emptyState('💬', 'Messaging is for members', 'DMs and group chats with the squad live here – log in with Discord to join in. Rolling out to everyone soon.')}</div>
<link rel="stylesheet" href="assets/messages.css"><script src="assets/social.js" defer></script><script src="assets/messages.js" defer></script>`,
  }));
}
