// Service worker: Web Push receiver (roadmap BE0) + PWA offline/caching. Served at the site root so its scope covers every
// page. Push payloads are shown as sent (encrypted end to end, see bot/webpush.js). Caching is same-origin GET only –
// member/API traffic goes to the Worker on another origin and is never touched here.
const V = 'nx-v1';
const PAGES = V + '-pages';
const MEDIA = V + '-media';
const PRECACHE = ['offline.html', 'index.html', 'assets/style.css', 'assets/ui.js', 'assets/app.js', 'assets/crest.png', 'assets/favicon.png'];
const MAX = { [PAGES]: 60, [MEDIA]: 120 };

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(PAGES);
    await Promise.allSettled(PRECACHE.map((u) => c.add(new URL(u, self.registration.scope))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (!k.startsWith(V)) await caches.delete(k);
  await self.clients.claim();
})()));

const trim = async (name) => {
  const c = await caches.open(name), keys = await c.keys();
  for (let i = 0; i < keys.length - MAX[name]; i++) await c.delete(keys[i]);
};
const put = async (name, req, res) => {
  if (!res || !(res.ok || res.type === 'opaque')) return;
  const c = await caches.open(name);
  await c.put(req, res.clone());
  trim(name);
};
// network first, fall back to whatever we last saw
const networkFirst = async (req, fallback) => {
  try {
    const res = await fetch(req);
    put(PAGES, req, res);
    return res;
  } catch {
    return (await caches.match(req)) || (fallback ? caches.match(new URL(fallback, self.registration.scope)) : Response.error());
  }
};
// show the cached copy instantly, refresh it in the background
const staleWhileRevalidate = async (req) => {
  const hit = await caches.match(req);
  const fresh = fetch(req).then((res) => { put(MEDIA, req, res); return res; }).catch(() => null);
  return hit || (await fresh) || Response.error();
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') return e.respondWith(networkFirst(req, 'offline.html'));
    if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)) return e.respondWith(staleWhileRevalidate(req));
    return e.respondWith(networkFirst(req));
  }
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') e.respondWith(staleWhileRevalidate(req));
});

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
