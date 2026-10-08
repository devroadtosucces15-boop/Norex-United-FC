// PWA install + offline (web/sw.js, web/pwa.js, manifest + head tags from scripts/build.mjs)
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const site = ROOT + 'site/';
const man = JSON.parse(fs.readFileSync(site + 'manifest.webmanifest', 'utf8'));
t('manifest is standalone with a relative scope and start_url', man.display === 'standalone' && man.scope === './' && man.start_url.startsWith('./index.html'));
t('manifest has 192, 512 and maskable icons that exist on disk', ['192x192', '512x512'].every((s) => man.icons.some((i) => i.sizes === s)) && man.icons.some((i) => i.purpose === 'maskable') && man.icons.every((i) => fs.existsSync(site + i.src)));
t('manifest shortcuts point at real pages', man.shortcuts.every((s) => fs.existsSync(site + s.url.replace('./', ''))));
t('offline fallback page is built', /YOU'RE OFFLINE/.test(fs.readFileSync(site + 'offline.html', 'utf8')));

for (const [f, base] of [['index.html', ''], ['hub/index.html', '../']]) {
  if (!fs.existsSync(site + f)) continue;
  const h = fs.readFileSync(site + f, 'utf8');
  t(`${f}: manifest, apple icon and pwa.js use the right base`, h.includes(`href="${base}manifest.webmanifest"`) && h.includes(`href="${base}assets/icons/apple-touch-icon.png"`) && h.includes(`src="${base}assets/pwa.js"`));
  t(`${f}: iOS standalone meta + viewport-fit`, h.includes('apple-mobile-web-app-capable') && h.includes('viewport-fit=cover'));
}

const sw = fs.readFileSync(ROOT + 'web/sw.js', 'utf8');
t('service worker keeps the push + notificationclick handlers', sw.includes("addEventListener('push'") && sw.includes("addEventListener('notificationclick'"));
t('service worker only touches GET and never caches other origins except fonts', sw.includes("req.method !== 'GET'") && sw.includes('fonts.gstatic.com') && !sw.includes('workers.dev'));
t('service worker precache entries all exist in the build', [...sw.matchAll(/'((?:assets\/)?[\w./-]+\.(?:html|css|js|png))'/g)].map((m) => m[1]).filter((u) => !u.startsWith('nx-')).every((u) => fs.existsSync(site + u)));
const idx = fs.readFileSync(site + 'index.html', 'utf8');
t('phone tab bar has a flag-gated Hub tab in the middle (hub was hidden on phones)', /<nav class="tabbar"[^>]*>(<a [^>]*class="tab[^"]*"[^>]*>.*?<\/a>){2}<a href="hub\/index.html" class="tab hub-tab" data-flag="hub" hidden/.test(idx.replace(/\n/g, '')));
t('Me moved to a top-bar profile button wired to the sheet', idx.includes('class="me-top"') && fs.readFileSync(ROOT + 'web/app.js', 'utf8').includes("$('.me-top')"));
t('hub transition: overlay on tap, arrival wipe flag set in every page head', fs.readFileSync(ROOT + 'web/app.js', 'utf8').includes("setItem('nxhub'") && idx.includes("getItem('nxhub')") && fs.readFileSync(ROOT + 'web/style.css', 'utf8').includes('html.nx-hubin::after'));
const css = fs.readFileSync(ROOT + 'web/style.css', 'utf8');
t('nothing scrolls sideways: html and body clip overflow-x', /html,body\{overflow-x:clip/.test(css));
t('status bar is translucent so the header paints under it, with a safe-area top inset', idx.includes('black-translucent') && /\.top\{padding-top:env\(safe-area-inset-top\)\}/.test(css));
const pj = fs.readFileSync(ROOT + 'web/pwa.js', 'utf8');
t('installed app blocks pinch zoom gestures', pj.includes('gesturestart') && pj.includes("preventDefault"));
done();
