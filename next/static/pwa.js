// NOREX app feel: installed (home-screen) behaviour, zoom/scroll drift correction, keyboard handling, install hint,
// Discord in-app browser hint and optional gyroscope tilt. No dependencies; every part degrades to plain web behaviour.
(() => {
  const d = document, H = d.documentElement, vv = window.visualViewport;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const discord = /Discord/i.test(navigator.userAgent);
  H.classList.toggle('standalone', standalone); H.classList.toggle('ios', ios); H.classList.toggle('in-discord', discord);

  // ---------- zoom + scroll drift: the view must never stay zoomed or jumped after typing/submitting ----------
  const meta = d.querySelector('meta[name=viewport]'), base = meta?.getAttribute('content') || '';
  const resetZoom = () => { if (!meta) return; meta.setAttribute('content', base + ',maximum-scale=1.0'); requestAnimationFrame(() => meta.setAttribute('content', base)); };
  let saved = null, typing = false;
  d.addEventListener('focusin', (e) => { if (!e.target.matches?.('input,textarea,select,[contenteditable]')) return; if (!typing) saved = scrollY; typing = true; H.classList.add('typing'); });
  d.addEventListener('focusout', () => setTimeout(() => {
    if (d.activeElement?.matches?.('input,textarea,select,[contenteditable]')) return;
    typing = false; H.classList.remove('typing', 'kb-open');
    if (vv && vv.scale > 1.01) resetZoom();
    // iOS sometimes leaves the page shoved up after the keyboard closes: put it back where the member was
    if (saved != null && Math.abs(scrollY - saved) > 40 && !d.querySelector('.mx-sheet')) scrollTo({ top: saved, behavior: 'instant' });
    if (vv && vv.offsetTop > 0) scrollTo({ top: scrollY, behavior: 'instant' });
    saved = null;
  }, 120));
  // after a submit the field loses focus so the keyboard closes and the view settles
  d.addEventListener('submit', () => setTimeout(() => d.activeElement?.blur?.(), 0), true);
  d.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches?.('input:not([type=checkbox]):not([type=radio])') && !e.target.form) setTimeout(() => e.target.blur(), 0); });
  if (vv) {
    let t = 0; const onVV = () => { cancelAnimationFrame(t); t = requestAnimationFrame(() => {
      const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop); H.style.setProperty('--kb', kb + 'px'); H.classList.toggle('kb-open', typing && kb > 120);
      // keep the active field in sight above the keyboard
      const a = d.activeElement; if (typing && a?.getBoundingClientRect) { const r = a.getBoundingClientRect(); if (r.bottom > vv.height - 12 || r.top < 0) a.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      // pinch or focus zoom that never came back: correct it once nothing is being typed
      if (!typing && vv.scale > 1.01) resetZoom();
    }); };
    vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV);
  }
  // block double-tap zoom and pinch in the installed app (the browser keeps them for normal tabs' accessibility)
  if (standalone) { d.addEventListener('gesturestart', (e) => e.preventDefault()); d.addEventListener('dblclick', (e) => { if (!e.target.closest('input,textarea')) e.preventDefault(); }, { passive: false }); }
  addEventListener('pageshow', () => { if (vv && vv.scale > 1.01) resetZoom(); });

  // ---------- install hint (Android prompt or iOS steps) and Discord in-app browser hint ----------
  let deferred = null; addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; maybeHint(); });
  addEventListener('appinstalled', () => { ls.set('norex.install', 'done'); d.getElementById('nx-inst')?.remove(); });
  const views = +(ls.get('norex.views') || 0) + 1; ls.set('norex.views', views);
  function maybeHint() {
    if (standalone || discord || d.getElementById('nx-inst')) return;
    const snooze = +(ls.get('norex.install') || 0); if (ls.get('norex.install') === 'done' || Date.now() < snooze || views < 2) return;
    if (!deferred && !(ios && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent))) return;
    const b = d.createElement('div'); b.id = 'nx-inst'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Install the NOREX app');
    b.innerHTML = `<img src="crest.png" alt="" width="40" height="40"><div><b>📲 Get the NOREX app</b><span>${deferred ? 'One tap, opens full screen, no app store.' : 'Tap <b>Share</b> <span aria-hidden="true">⎋</span> then <b>Add to Home Screen</b>.'}</span></div>${deferred ? '<button type="button" class="btn gold" data-i>Install</button>' : ''}<button type="button" class="x" aria-label="Not now">✕</button>`;
    d.body.appendChild(b);
    b.querySelector('[data-i]')?.addEventListener('click', async () => { deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; b.remove(); if (r?.outcome === 'accepted') ls.set('norex.install', 'done'); });
    b.querySelector('.x').addEventListener('click', () => { ls.set('norex.install', Date.now() + 14 * 864e5); b.classList.add('out'); setTimeout(() => b.remove(), 300); });
  }
  setTimeout(maybeHint, 2500);
  if (discord) addEventListener('DOMContentLoaded', () => d.querySelectorAll('[data-discord-hint]').forEach((el) => { el.hidden = false; }));

  // ---------- gyroscope tilt (optional, explicit opt-in; iOS asks permission on the toggle tap) ----------
  const canGyro = 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches;
  let on = false, gx = 0, gy = 0, tx = 0, ty = 0, raf = 0, base0 = null;
  const full = () => !window.NorexMotion || NorexMotion.mode === 'full';
  const onOri = (e) => { if (e.beta == null) return; const ang = (screen.orientation?.angle ?? window.orientation ?? 0) % 360;
    let b = e.beta, g = e.gamma; if (ang === 90) [b, g] = [-g, b]; else if (ang === 270 || ang === -90) [b, g] = [g, -b];
    if (!base0) base0 = { b, g };                       // the way the phone is held when tilt starts counts as "flat"
    tx = Math.max(-10, Math.min(10, (g - base0.g) * .45)); ty = Math.max(-10, Math.min(10, (b - base0.b) * -.45)); if (!raf) raf = requestAnimationFrame(step); };
  function step() { raf = 0; gx += (tx - gx) * .12; gy += (ty - gy) * .12;             // low-pass filter: smooth, no jitter
    H.style.setProperty('--gx', gx.toFixed(2)); H.style.setProperty('--gy', gy.toFixed(2)); if (Math.abs(tx - gx) + Math.abs(ty - gy) > .02) raf = requestAnimationFrame(step); }
  const start = () => { if (on || !full() || d.hidden) return; on = true; base0 = null; H.classList.add('gyro-on'); addEventListener('deviceorientation', onOri); };
  const stop = () => { if (!on) return; on = false; removeEventListener('deviceorientation', onOri); H.classList.remove('gyro-on'); H.style.removeProperty('--gx'); H.style.removeProperty('--gy'); };
  const wanted = () => ls.get('norex.gyro') === 'on';
  async function enable() {
    try { if (typeof DeviceOrientationEvent.requestPermission === 'function') { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw new Error('denied'); } ls.set('norex.gyro', 'on'); start(); return true; }
    catch { window.NorexMotion?.toast('Tilt needs motion access. You can allow it in your browser settings.', { kind: 'err' }); return false; }
  }
  // Android needs no prompt: resume if the member turned it on before. iOS keeps the permission per visit, so it waits for a tap.
  if (canGyro && wanted() && typeof DeviceOrientationEvent.requestPermission !== 'function') start();
  d.addEventListener('visibilitychange', () => (d.hidden ? stop() : wanted() && typeof DeviceOrientationEvent.requestPermission !== 'function' && start()));
  addEventListener('norex:motion', () => (full() ? wanted() && start() : stop()));
  addEventListener('norex:settings', (e) => { const box = e.detail; if (!box || !canGyro) return;
    box.innerHTML = `<button type="button" class="mx-opt" role="switch" aria-checked="${on}" style="margin-top:10px"><span class="e">📱</span><span><b>Enable tilt effects</b><small>Cards, crest and trophies move as you tilt your phone</small></span></button>`;
    const sw = box.firstChild; sw.addEventListener('click', async () => { if (on) { ls.set('norex.gyro', null); stop(); } else await enable(); sw.setAttribute('aria-checked', on); }); });
  window.NorexApp = { standalone, ios, discord, resetZoom, gyro: { enable, stop, get on() { return on; } } };
})();
