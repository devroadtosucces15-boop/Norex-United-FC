// NOREX safety net for the installed app (iPhone and Android): nothing the site does may force a close-and-reopen.
// Loads first. Provides (1) a calm "Reset view" that clears view-only state and reloads, (2) watchdogs that free the page when an
// overlay, scroll lock or keyboard flag gets stuck, (3) a safe mode when scripts keep failing, (4) a time limit on "view as".
// Sign-in is never touched. No dependencies.
(() => {
  const d = document, H = d.documentElement;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };
  const VIEW_KEYS = ['norex.viewas', 'norex.viewas.t', 'norex.motion', 'norex.fx', 'norex.entrance', 'norex.gyro', 'norex_tx_vert', 'norex.stack', 'norex.orbit'];
  const VIEW_MS = 3 * 36e5;

  // ---- "view as" never outlives the visit it was set for ----
  try {
    if (ls.get('norex.viewas')) { const t = +ls.get('norex.viewas.t') || 0; if (!t) ls.set('norex.viewas.t', String(Date.now())); else if (Date.now() - t > VIEW_MS) { ls.set('norex.viewas', null); ls.set('norex.viewas.t', null); } }
    else if (ls.get('norex.viewas.t')) ls.set('norex.viewas.t', null);
  } catch {}

  // ---- free the page: remove overlays, locks and flags that only make sense while something is actually open ----
  const openDialog = () => !!d.querySelector('.mx-sheet:not(.out),.br-modal,.wtp-modal,[role=dialog][aria-modal=true]:not([hidden]),.hdr-pal:not([hidden]),#awardfx');
  function unstick(why) {
    try {
      H.classList.remove('fx-busy'); H.removeAttribute('data-tin'); d.getElementById('fxov')?.replaceChildren();
      if (!d.querySelector('.hdr-pal:not([hidden])')) H.classList.remove('hdr-lock');
      if (!openDialog()) { d.body?.classList.remove('wtp-lock'); if (H.style.overflow === 'hidden') H.style.overflow = ''; if (d.body?.style.overflow === 'hidden') d.body.style.overflow = ''; }
      const a = d.activeElement; if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !a?.isContentEditable) H.classList.remove('kb-open', 'typing');
      H.style.removeProperty('--tbfix');
    } catch {}
  }
  let wd = 0; const later = (why) => { clearTimeout(wd); wd = setTimeout(() => unstick(why), 900); };
  addEventListener('pageshow', () => unstick('pageshow'));
  d.addEventListener('visibilitychange', () => { if (!d.hidden) later('visible'); });
  d.addEventListener('focusout', () => later('focusout'), true);
  addEventListener('orientationchange', () => later('rotate'));
  // a page that refuses to scroll because of a leftover lock
  let tries = 0; d.addEventListener('touchstart', () => { if (tries > 6) return; if (getComputedStyle(H).overflow === 'hidden' && !openDialog()) { tries++; unstick('locked'); } }, { passive: true });
  // the cinematic cover can never sit on top of the page for more than a few seconds
  setTimeout(() => { if (H.hasAttribute('data-tin') || H.classList.contains('fx-busy')) unstick('cover'); }, 4000);

  // ---- reset: clears view-only choices and cached shells, keeps the sign-in, reloads clean ----
  async function reset() {
    try { VIEW_KEYS.forEach((k) => ls.set(k, null)); Object.keys(sessionStorage).filter((k) => /^(norex\.(t|vt)|nx\.reloaded)$/.test(k)).forEach((k) => ss.set(k, null)); } catch {}
    try { if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k))); } catch {}
    try { if (navigator.serviceWorker) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister())); } catch {}
    try { const u = new URL(location.href); u.searchParams.delete('reset'); u.searchParams.delete('nx'); location.replace(u.pathname + u.search + u.hash); } catch { location.reload(); }
  }
  d.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-reset-view]'); if (t) { e.preventDefault(); t.disabled = true; t.textContent = '🔄 Resetting…'; reset(); } });
  if (/[?&]reset\b/.test(location.search)) reset();

  // ---- safe mode: if scripts keep failing, switch every effect off and offer the reset (never loops, never blocks the page) ----
  const seen = new Set(); let t0 = 0, safeOn = false;
  function safeMode() {
    if (safeOn) return; safeOn = true; H.classList.add('nx-safe'); H.dataset.motion = 'off';
    const go = () => {
      if (d.getElementById('nx-safe-bar')) return;
      const bar = d.createElement('div'); bar.id = 'nx-safe-bar'; bar.setAttribute('role', 'status');
      bar.innerHTML = '<span>Something did not load properly. Effects are off for now.</span><button type="button" data-reset-view>Reset view</button><button type="button" class="x" aria-label="Dismiss">✕</button>';
      bar.querySelector('.x').onclick = () => bar.remove(); d.body.appendChild(bar);
    };
    d.body ? go() : d.addEventListener('DOMContentLoaded', go);
  }
  const note = (key) => { const now = Date.now(); if (now - t0 > 15000) { seen.clear(); t0 = now; } seen.add(String(key).slice(0, 120)); if (seen.size >= 4) safeMode(); };
  addEventListener('error', (e) => { if (e.target && e.target !== window && /^(SCRIPT|LINK)$/.test(e.target.tagName)) note('res:' + (e.target.src || e.target.href)); else if (e.message && !/ResizeObserver|Script error/i.test(e.message)) note((e.filename || '') + e.lineno + e.message); }, true);
  addEventListener('unhandledrejection', (e) => note('rej:' + (e.reason && (e.reason.message || e.reason))));

  // ---- risky effects: run them inside a guard so one failure becomes a calm fallback, not a dead page ----
  window.NorexSafe = {
    reset, unstick,
    guard(name, fn, fallback) { try { const r = fn(); if (r && typeof r.catch === 'function') r.catch((err) => { try { console.warn('[norex]', name, err); fallback && fallback(err); } catch {} }); return r; } catch (err) { try { console.warn('[norex]', name, err); fallback && fallback(err); } catch {} } },
    get on() { return safeOn; },
  };

  // ---- the Motion & effects sheet gets a reset at the bottom ----
  addEventListener('norex:settings', (e) => { const box = e.detail; if (!box) return; setTimeout(() => { if (box.querySelector('[data-reset-view]')) return;
    const b = d.createElement('button'); b.type = 'button'; b.className = 'mx-opt'; b.setAttribute('data-reset-view', ''); b.style.marginTop = '10px';
    b.innerHTML = '<span class="e">🔄</span><span><b>Reset view</b><small>Something stuck or looking odd? Clears view choices and reloads. You stay signed in.</small></span>'; box.appendChild(b); }, 0); });
})();
