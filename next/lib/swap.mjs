// Swap-over files (PLANNING/NEXT-SWAPOVER.md step 1): everything the old site shipped at its root that must exist once /next/ becomes the main
// site – the api/*.json the Worker and the web libs read, the service worker (push + offline), offline.html, 404.html, robots.txt, sitemap.xml.
// Only written by `--public` builds; preview builds live under the old site's /next/ and use its root files.
import fs from 'node:fs'; import path from 'node:path';
import { cfg, clubStats } from './data.mjs';
import { esc } from './ui.mjs';

const SITE = (cfg.siteUrl || '').replace(/\/?$/, '/');
const INK = '#080b11';

// api/*.json comes from the classic build (scripts/build.mjs): same files, same shapes, so bot/*.js and scripts/fetch.mjs keep working untouched.
export function copyApi(out, root, classicArg) {
  const cands = [classicArg, path.join(root, 'site', 'classic'), path.join(root, 'site')].filter(Boolean).map((p) => path.resolve(p));
  const src = cands.map((c) => path.join(c, 'api')).find((a) => fs.existsSync(path.join(a, 'players.json')));
  if (!src) throw new Error(`--public needs the classic build's api/ folder (looked in: ${cands.join(', ')}). Run scripts/build.mjs first or pass --classic <dir>.`);
  const dst = path.join(out, 'api'); fs.mkdirSync(dst, { recursive: true });
  const names = fs.readdirSync(src).filter((f) => f.endsWith('.json'));
  for (const f of names) fs.copyFileSync(path.join(src, f), path.join(dst, f));
  return names;
}

// Same job as web/sw.js (Web Push receiver + offline cache), new precache list. V must differ from the old 'nx-v1' so installed phones drop the old caches.
export const swSource = () => `// Service worker: Web Push receiver + offline cache. Served at the site root so its scope covers every page. Same-origin GET only –
// member/API traffic goes to the Worker on another origin and is never touched here.
const V = 'nx-v2';
const PAGES = V + '-pages';
const MEDIA = V + '-media';
const PRECACHE = ['offline.html', 'index.html', 'style.css', 'app.js', 'crest-sm.png'];
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
const networkFirst = async (req, fallback) => {
  try {
    const res = await fetch(req);
    put(PAGES, req, res);
    return res;
  } catch {
    return (await caches.match(req)) || (fallback ? caches.match(new URL(fallback, self.registration.scope)) : Response.error());
  }
};
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
    if (/\\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)) return e.respondWith(staleWhileRevalidate(req));
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
    icon: 'crest-sm.png',
    badge: 'crest-sm.png',
    data: { link: d.link || 'hub.html' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.link || 'hub.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    return open ? open.focus().then(() => open.navigate(url)) : self.clients.openWindow(url);
  }));
});
`;

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">';
const lone = (title, head, body, base = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${base ? `<base href="${esc(base)}">` : ''}<meta name="robots" content="noindex"><meta name="theme-color" content="${INK}"><title>${esc(title)} · ${esc(cfg.siteTitle)}</title>${FONTS}
<style>html,body{margin:0;min-height:100%;background:${INK};color:#fff;font-family:Inter,system-ui,sans-serif}body{display:grid;place-items:center;text-align:center;padding:24px;min-height:100vh;background:radial-gradient(900px 500px at 50% -10%,rgba(200,53,44,.28),transparent 60%),${INK}}img{height:96px;width:auto}h1{font-family:Oswald,Impact,sans-serif;letter-spacing:.05em;margin:.5em 0 .2em;font-size:clamp(34px,8vw,56px)}h1 b{color:#c8352c}p{color:#aab3c2;max-width:420px;margin:0 auto 20px;line-height:1.5}.row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}a.b,button{font:700 13px Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;color:#fff;background:#c8352c;border:0;border-radius:999px;padding:12px 22px;cursor:pointer}a.b.g{background:transparent;border:1px solid rgba(255,255,255,.28)}:focus-visible{outline:2px solid #efcf7a;outline-offset:3px}</style>${head}</head><body>${body}</body></html>`;

export const offlineHtml = () => lone('Offline', '', `<main><img src="crest-sm.png" alt=""><h1>YOU'RE <b>OFFLINE</b></h1><p>No signal right now. Pages you've already opened still work – the rest comes back as soon as you're connected.</p><div class="row"><button type="button" onclick="location.reload()">Try again</button> <a class="b g" href="index.html">Club home</a></div></main>`);

// GitHub Pages serves 404.html for any missing path at any depth, so every link and asset is absolute through <base>.
export const notFoundHtml = () => lone('Page not found', '', `<main><img src="crest-sm.png" alt=""><h1>OFFSIDE – <b>404</b></h1><p>That page isn't in the squad. It may have moved when the site was redesigned.</p><div class="row"><a class="b" href="index.html">Club home</a> <a class="b g" href="results.html">Results</a> <a class="b g" href="hub.html">The Hub</a></div></main>`, SITE);

export const robotsTxt = () => `User-agent: *\nAllow: /\nDisallow: /hub\nDisallow: /staff\n${SITE ? `\nSitemap: ${SITE}sitemap.xml\n` : ''}`;

// Public pages only: the Hub, staff pages and design proposal pages are member-gated or not for search.
export const indexable = (f) => /\.html$/.test(f) && !/^(hub|staff|lookbook|canvas|playstyle|offline|404)/.test(f);
export function sitemapXml(pages) {
  const last = clubStats.fetched ? new Date(clubStats.fetched).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const urls = pages.filter(indexable).sort().map((f) => `<url><loc>${SITE}${f === 'index.html' ? '' : esc(f)}</loc><lastmod>${last}</lastmod></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function emitSwap({ out, root, classic, pages }) {
  const api = copyApi(out, root, classic);
  fs.writeFileSync(path.join(out, 'sw.js'), swSource());
  fs.writeFileSync(path.join(out, 'offline.html'), offlineHtml());
  fs.writeFileSync(path.join(out, '404.html'), notFoundHtml());
  fs.writeFileSync(path.join(out, 'robots.txt'), robotsTxt());
  fs.writeFileSync(path.join(out, 'sitemap.xml'), sitemapXml(pages));
  return api;
}
