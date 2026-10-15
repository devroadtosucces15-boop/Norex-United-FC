// PWA glue: registers the service worker on every page, marks standalone mode and offers "Install app" –
// the native prompt on Android/desktop Chrome, a short Share → Add to Home Screen hint on iPhone/iPad.
(function () {
  const base = document.body.dataset.base || '';
  const root = document.documentElement;
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone()) {
    root.classList.add('nx-standalone');
    // iOS ignores user-scalable=no: block pinch / double-tap zoom in the installed app only (the browser keeps it for accessibility)
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault());
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register(new URL(base + 'sw.js', location.href)).catch(() => {}));
  }

  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const iosSafari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV|Discord/.test(ua);
  let deferred = null;
  let bar = null;

  const snoozed = () => Date.now() - Number(ls.get('nx_pwa_snooze') || 0) < 14 * 864e5;
  const close = (snooze) => { if (snooze) ls.set('nx_pwa_snooze', String(Date.now())); if (bar) { bar.remove(); bar = null; } };

  async function install() {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice.catch(() => ({}));
      deferred = null;
      close(outcome !== 'accepted');
      return;
    }
    if (iosSafari) showBar(true);
  }

  function showBar(force) {
    if (bar || standalone() || (!force && snoozed())) return;
    const how = iosSafari && !deferred
      ? 'Tap <b>Share</b> <span aria-hidden="true">⬆️</span> then <b>Add to Home Screen</b>.'
      : 'Add it to your home screen – opens full screen, loads faster, works offline.';
    bar = document.createElement('div');
    bar.className = 'nx-install';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Install the NOREX app');
    bar.innerHTML = `<img src="${base}assets/icons/icon-192.png" width="44" height="44" alt=""><div class="nx-install-t"><b>Install NOREX UNITED</b><span>${how}</span></div>`
      + (deferred ? '<button type="button" class="btn nx-install-go">Install</button>' : '')
      + '<button type="button" class="nx-install-x" aria-label="Not now">✕</button>';
    bar.querySelector('.nx-install-x').addEventListener('click', () => close(true));
    const go = bar.querySelector('.nx-install-go');
    if (go) go.addEventListener('click', install);
    document.body.appendChild(bar);
  }

  function footLink() {
    const host = document.querySelector('.foot-in > div');
    if (!host || host.querySelector('.nx-install-link') || standalone()) return;
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'nx-install-link';
    a.textContent = '📲 Install the app';
    a.addEventListener('click', (e) => { e.preventDefault(); install(); });
    host.appendChild(a);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    footLink();
    setTimeout(() => showBar(false), 6000);
  });
  window.addEventListener('appinstalled', () => { deferred = null; close(false); ls.set('nx_pwa_snooze', String(Date.now() + 365 * 864e5)); });

  if (iosSafari && !standalone()) {
    footLink();
    setTimeout(() => showBar(false), 8000);
  }

  window.NXInstall = { install, standalone };
})();
