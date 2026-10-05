// Web Push receiver (roadmap BE0). Served at the site root so its scope covers every page. It only shows what the
// Worker sent (encrypted end to end, see bot/webpush.js) and never caches anything.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'NOREX UNITED FC', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'NOREX UNITED FC', {
    body: d.body || '',
    tag: d.tag || 'norex',
    icon: 'assets/crest.png',
    badge: 'assets/crest.png',
    data: { link: d.link || 'members.html' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.link || 'members.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    return open ? open.focus().then(() => open.navigate(url)) : self.clients.openWindow(url);
  }));
});
