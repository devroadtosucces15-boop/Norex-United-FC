// NOREX motion system: modes, staged scroll reveals, count-up, loading morphs, list glides, submit states, toasts, alerts, tilt, parallax.
// One file, no dependencies. Everything animates transform/opacity only and is tied to real state (in view, data landed, request done).
(() => {
  const d = document, H = d.documentElement, b = d.body;
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };
  const mqR = matchMedia('(prefers-reduced-motion: reduce)');
  const still = /[?&]still\b/.test(location.search);
  // ---- B1: a style (Full / Casual / Custom) plus one switch per effect. Kept as "full", "calm" or "custom:<effects that are off>" in
  // norex.mx: sessionStorage = this visit only, localStorage (+ the member's profile) once they say "remember". Full for everyone by
  // default; only the OS "Reduce motion" setting starts Casual. No more silent downgrades for weak phones or low battery.
  // Old norex.motion values carry over: full → Full, calm → Casual, off → Custom with everything off.
  const FX = ['reveals', 'tilt', 'gyro', 'glow', 'parallax', 'insights', 'bursts', 'haptics'];
  const CASUAL_OFF = ['tilt', 'gyro', 'glow', 'parallax', 'bursts', 'haptics'];
  const parse = (v) => { const [p, rest = ''] = String(v || 'full').split(':'); return { p: p === 'calm' || p === 'custom' ? p : 'full', off: new Set(p === 'custom' ? rest.split(',').filter((k) => FX.includes(k)) : p === 'calm' ? CASUAL_OFF : []) }; };
  const ser = (s) => (s.p === 'custom' ? 'custom:' + [...s.off].join(',') : s.p);
  const legacy = () => { const o = ls.get('norex.motion'), fx = ls.get('norex.fx') === 'off', io = ls.get('norex.insights') === 'off'; if (!o && !fx && !io) return null;
    const s = parse(o === 'off' ? 'custom:' + FX.join(',') : o === 'calm' || fx ? 'calm' : 'full'); if (io) { s.off.add('insights'); s.p = 'custom'; } return ser(s); };
  let pref = parse(still ? 'custom:' + FX.join(',') : ss.get('norex.mx') || ls.get('norex.mx') || legacy() || (mqR.matches ? 'calm' : 'full')), mode = 'full';
  const on = (k) => !pref.off.has(k);
  const apply = () => { mode = pref.p === 'calm' ? 'calm' : on('reveals') ? 'full' : 'off'; H.dataset.motion = mode;
    FX.forEach((k) => (on(k) ? H.removeAttribute('data-fx-' + k) : H.setAttribute('data-fx-' + k, 'off'))); H.classList.toggle('insights-off', !on('insights'));
    b.classList.toggle('lite', mode !== 'full'); b.classList.toggle('rm', mode === 'off'); if (still) b.classList.add('still'); };
  apply(); H.classList.add('mx');
  const changed = () => { apply(); dispatchEvent(new CustomEvent('norex:motion', { detail: mode })); };
  const M = window.NorexMotion = {
    get mode() { return mode; }, get preset() { return pref.p; }, get value() { return ser(pref); }, FX, on,
    // a style ('full' | 'calm' | 'custom') or one effect (set('tilt', false) → Custom). Applies now, for this visit; remember() keeps it.
    set(k, val) { if (FX.includes(k)) { const off = new Set(pref.off); val ? off.delete(k) : off.add(k); pref = { p: 'custom', off }; } else pref = k === 'custom' ? { p: 'custom', off: new Set(pref.off) } : parse(k);
      ss.set('norex.mx', ser(pref)); changed(); },
    remember() { const v = ser(pref); ls.set('norex.mx', v); ls.set('norex.motion', null); ls.set('norex.insights', null); const A = window.NorexAuth;
      return A?.token ? A.call('/api/me/prefs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ motion: v }) }).then(() => true, () => false) : Promise.resolve(false); },
    setMode(m) { M.set(m === 'off' ? 'custom:' + FX.join(',') : m); M.remember(); },   // old API (dev panel)
    reduced: () => mode !== 'full', get lite() { return mode !== 'full'; }, off: () => mode === 'off',
  };
  // signed in on a new device: the choice saved on their profile follows them (until they pick something here)
  if (!still && !ss.get('norex.mx') && !ls.get('norex.mx')) window.NorexAuth?.ready?.then(() => { const v = window.NorexAuth.prefs?.motion; if (v && !ss.get('norex.mx') && !ls.get('norex.mx')) { ls.set('norex.mx', v); pref = parse(v); changed(); } });

  // ================= scroll reveal =================
  // Blocks reveal when their top passes 88% of the screen (threshold 0, so tall blocks work too). Inside a block the
  // heading lands first, then each part; grids marked .rv-g deal their items in one by one. Finished blocks drop the
  // reveal classes so their own hover/tilt transitions are not slowed down.
  const HEAD = 'h1,h2,h3,.eyebrow,.ribbon,header';
  function stage(el) {
    if (el.dataset.rvs) return; el.dataset.rvs = 1;
    const kids = [...el.children].filter((c) => !c.matches('script,style,template,[hidden]'));
    if (kids.length >= 2 && kids.length <= 14 && !el.matches('[data-stagger],.rv-flat')) {
      let n = 0; kids.sort((a, c) => (c.matches(HEAD) ? 1 : 0) - (a.matches(HEAD) ? 1 : 0));
      kids.forEach((c) => { c.classList.add('rv-c'); c.style.setProperty('--ri', Math.min(n++, 8)); });
    }
    $$('.rv-g', el).forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--gi', Math.min(i, 12))));
  }
  const settle = (el) => setTimeout(() => { $$('.rv-g', el).forEach((g) => g.classList.add('in')); el.classList.remove('reveal', 'in'); $$(':scope>.rv-c', el).forEach((c) => c.classList.remove('rv-c')); el.dataset.rvd = 1; }, 2400);
  const show = (el) => { if (el.classList.contains('in')) return; el.classList.add('in'); io.unobserve(el); countIn(el); dispatchEvent(new CustomEvent('norex:revealed', { detail: el })); settle(el); };
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) show(e.target); }), { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  function watch(root = d) {
    $$('[data-stagger]', root).forEach((g) => [...g.children].forEach((c, i) => { if (c.dataset.rvd) return; c.classList.add('reveal'); c.style.setProperty('--i', Math.min(i, 12)); }));
    $$('.sec>header:not([data-rvd])', root).forEach((h) => { if (!h.classList.contains('reveal')) { h.classList.add('reveal'); h.dataset.rv = h.dataset.rv || 'ribbon'; } });
    $$('.rv-g:not(.reveal .rv-g)', root).forEach((g) => { [...g.children].forEach((c, i) => c.style.setProperty('--gi', Math.min(i, 12))); if (!g.classList.contains('in')) gio.observe(g); });
    $$('.reveal:not(.in)', root).forEach((el) => { stage(el); if (mode === 'off') show(el); else if (armed) io.observe(el); });
  }
  const gio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); gio.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  // safety net: fast flicks, anchor jumps and browsers that skip IO callbacks never leave a block hidden
  const sweep = () => $$('.reveal:not(.in)').forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * .95 && r.bottom > -innerHeight) show(el); });
  let st = 0; addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(sweep, 140); }, { passive: true });
  // after a page transition, wait until the cover lifts so the first reveals are actually seen
  let armed = !H.hasAttribute('data-tin');
  const arm = () => { if (armed) return; armed = true; watch(); };
  addEventListener('norex:arrived', arm); setTimeout(arm, 1600);
  M.watch = watch; M.show = show;
  watch(); setTimeout(sweep, 2600);

  // ================= numbers =================
  function count(el, to = parseFloat(el.dataset.count), dec) {
    if (isNaN(to)) return; const raw = String(el.dataset.count ?? to); dec = dec ?? (raw.split('.')[1] || '').length;
    const from = parseFloat(String(el.textContent).replace(/[^\d.-]/g, '')) || 0, suf = el.dataset.suffix || '';
    const done = () => { el.textContent = (dec ? to.toFixed(dec) : Math.round(to).toLocaleString()) + suf; };
    if (mode !== 'full' || from === to) return done();
    const t0 = performance.now(), dur = Math.min(1400, 700 + Math.abs(to - from) * 8);
    const f = (t) => { const k = Math.min(1, (t - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - k, 3)); el.textContent = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString()) + suf; if (k < 1) requestAnimationFrame(f); else done(); };
    requestAnimationFrame(f);
  }
  const counted = new WeakSet();
  function countIn(root) { $$('[data-count]', root).forEach((el) => { if (counted.has(el)) return; counted.add(el); el.textContent = '0'; count(el); }); }
  // counters outside any reveal block start when they scroll into view
  const co = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { co.unobserve(e.target); if (!counted.has(e.target)) { counted.add(e.target); count(e.target); } } }), { threshold: .4 });
  $$('[data-count]').forEach((el) => { if (!el.closest('.reveal')) co.observe(el); });
  M.count = count;

  // ================= loading: skeleton -> real content =================
  // M.land(el, html) swaps a skeleton for real content: skeleton fades, children rise in one by one, counters run, new reveals arm.
  M.skeleton = (el, rows = 3) => { el.setAttribute('aria-busy', 'true'); el.innerHTML = `<div class="sk-wrap">${Array.from({ length: rows }, (_, i) => `<span class="sk${i % 3 ? ' s' + (i % 3 + 1) : ''}"></span>`).join('')}</div>`; };
  M.land = (el, html, onPut) => new Promise((ok) => {
    const put = () => { if (html != null) el.innerHTML = html; el.removeAttribute('aria-busy'); onPut?.(el); [...el.children].forEach((c, i) => c.style.setProperty('--li', Math.min(i, 10)));
      el.classList.remove('mx-land'); void el.offsetWidth; el.classList.add('mx-land'); countIn(el); watch(el); M.tilt?.(); setTimeout(() => { el.classList.remove('mx-land'); ok(); }, 900); };
    const sk = el.querySelector(':scope>.sk-wrap'); if (sk && mode !== 'off') { sk.classList.add('mx-out'); setTimeout(put, 200); } else put();
  });

  // ================= lists: add / remove / reorder glide (FLIP) =================
  M.flip = (box, mutate) => {
    const kids = [...box.children], before = new Map(kids.map((k) => [k, k.getBoundingClientRect()]));
    mutate(); if (mode === 'off') return;
    const after = [...box.children];
    after.forEach((k) => { const a = before.get(k), r = k.getBoundingClientRect();
      if (!a) { k.animate([{ opacity: 0, transform: 'scale(.92) translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }); return; }
      const dx = a.left - r.left, dy = a.top - r.top; if (dx || dy) k.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }); });
    const host = box.getBoundingClientRect(); if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    kids.filter((k) => !k.isConnected).forEach((k) => { const a = before.get(k); Object.assign(k.style, { position: 'absolute', left: a.left - host.left + 'px', top: a.top - host.top + 'px', width: a.width + 'px', height: a.height + 'px', margin: 0, pointerEvents: 'none' }); box.appendChild(k);
      k.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.9)' }], { duration: 280, easing: 'cubic-bezier(.5,0,.75,0)' }).finished.then(() => k.remove()).catch(() => k.remove()); });
  };

  // ================= submit: button -> spinner -> check / shake =================
  M.submit = async (btn, work, { burst = true } = {}) => {
    btn.classList.remove('mx-ok', 'mx-err'); btn.classList.add('mx-busy'); btn.setAttribute('aria-busy', 'true');
    try { const r = await (typeof work === 'function' ? work() : work); btn.classList.remove('mx-busy'); btn.classList.add('mx-ok'); M.haptic(); if (burst && on('bursts') && window.NorexFx) { const q = btn.getBoundingClientRect(); NorexFx.burst(q.left + q.width / 2, q.top + q.height / 2, 16); } setTimeout(() => btn.classList.remove('mx-ok'), 1100); return r; }
    catch (e) { btn.classList.remove('mx-busy'); btn.classList.add('mx-err'); M.haptic([10, 40, 10]); setTimeout(() => btn.classList.remove('mx-err'), 600); throw e; }
    finally { btn.removeAttribute('aria-busy'); }
  };
  M.haptic = (p = 8) => { if (!on('haptics')) return; try { navigator.vibrate?.(p); } catch {} };

  // ================= toasts, alerts, live values =================
  M.toast = (msg, { kind = '', ms = 3800, icon = kind === 'err' ? '⚠️' : kind === 'ok' ? '✅' : '🔔' } = {}) => {
    let box = d.getElementById('mx-toasts'); if (!box) { box = d.createElement('div'); box.id = 'mx-toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); b.appendChild(box); }
    const t = d.createElement('div'); t.className = 'mx-toast ' + kind; t.innerHTML = `<span aria-hidden="true">${icon}</span><span></span>`; t.lastChild.textContent = msg; box.appendChild(t);
    const bye = () => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }; t.onclick = bye; setTimeout(bye, ms); return t;
  };
  const replay = (el, cls) => { if (!el || mode === 'off') return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); el.addEventListener('animationend', () => el.classList.remove(cls), { once: true }); };
  M.ring = (el) => replay(el, 'mx-ring'); M.pulse = (el) => replay(el, 'mx-pulse');
  M.bump = (el, text) => { if (!el || el.textContent === String(text)) return; el.textContent = text; replay(el, 'mx-bump'); };

  // ================= motion settings sheet =================
  // B1: three big style buttons on top, one switch per effect below. Choosing a style sets the switches; touching a switch makes it
  // Custom. Every change applies at once (this visit); a small bar then asks whether to remember it.
  const PRESETS = [['calm', '🌙', 'Casual', 'Calm and plain'], ['full', '✨', 'Full', 'Every effect on'], ['custom', '🎛️', 'Custom', 'Your own mix']];
  const EFFECTS = [['reveals', '🎞️', 'Reveals & transitions', 'Sections slide in, pages change with a transition'], ['tilt', '🃏', 'Card tilt', 'Cards lean as you hover, touch or scroll'],
    ['gyro', '📱', 'Phone tilt', 'Cards, crest and trophies move as you tilt your phone'], ['glow', '💡', 'Glow & shine', 'Light sweeps over cards and glass panels'],
    ['parallax', '🌌', 'Parallax', 'Background layers drift at their own speed'], ['insights', '🧠', 'Insights', 'Short notes about the club, matches and players (press I)'],
    ['bursts', '🎉', 'Celebration bursts', 'Confetti sparks on taps and saves'], ['haptics', '📳', 'Haptics', 'A small buzz on taps and saves (phones that support it)']];
  M.settings = () => {
    const G = window.NorexApp?.gyro, fx = EFFECTS.filter(([k]) => k !== 'gyro' || G?.can);
    const sh = d.createElement('div'); sh.className = 'mx-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', 'Motion and effects');
    sh.innerHTML = `<div class="mx-sheet-body"><h3 style="font:700 20px Oswald;letter-spacing:.04em;margin:0">🎬 Motion &amp; effects</h3><p class="muted small" style="margin:6px 0 0">Pick a style, or switch single effects on and off.</p>
<div class="mx-pre" role="radiogroup" aria-label="Motion style">${PRESETS.map(([v, e, t, s]) => `<button type="button" class="mx-pb" role="radio" data-p="${v}" aria-label="${t}: ${s}"><span class="e" aria-hidden="true">${e}</span><b>${t}</b><small>${s}</small></button>`).join('')}</div>
<div class="mx-fx" role="group" aria-label="Effects">${fx.map(([k, e, t, s]) => `<button type="button" class="mx-opt mx-sw" role="switch" data-fx="${k}" aria-label="${t}"><span class="e" aria-hidden="true">${e}</span><span><b>${t}</b><small data-s="${s}">${s}</small></span><i class="mx-tg" aria-hidden="true"></i></button>`).join('')}</div>
<div class="mx-ask" role="group" aria-label="Remember this choice?" hidden><span>Remember this choice?</span><button type="button" class="btn" data-rem="1">Yes</button><button type="button" class="btn ghost" data-rem="0">This visit only</button></div>
<div id="mx-extra"></div><button type="button" class="btn ghost" data-close style="margin-top:16px;width:100%">Done</button></div>`;
    const ask = sh.querySelector('.mx-ask');
    const sync = () => { $$('.mx-pb', sh).forEach((x) => x.setAttribute('aria-checked', x.dataset.p === pref.p));
      $$('.mx-sw', sh).forEach((x) => { const k = x.dataset.fx, sm = x.querySelector('small'); x.setAttribute('aria-checked', on(k));
        sm.textContent = k === 'gyro' && on(k) && G?.needsAsk ? 'Tap to allow motion access on this phone' : sm.dataset.s; }); };
    const touched = () => { sync(); ask.hidden = false; ask.classList.remove('done'); ask.firstChild.textContent = 'Remember this choice?'; $$('button', ask).forEach((x) => (x.hidden = false)); };
    // iOS only asks for motion access from a tap, so the tap that turns phone tilt on (or picks Full) also asks
    const gyroUp = async () => { if (!G || !on('gyro')) return; if (!(await G.enable())) { M.set('gyro', false); } sync(); };
    sync(); sync.t = setInterval(sync, 1000);   // phone tilt can start/stop behind the sheet (permission, tab switch)
    const close = () => { clearInterval(sync.t); sh.classList.add('out'); setTimeout(() => sh.remove(), 260); d.removeEventListener('keydown', esc); last?.focus?.(); };
    const esc = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'Tab') { const f = $$('button,a[href],input,select,textarea,[tabindex="0"]', sh).filter((x) => !x.disabled && x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (!sh.contains(d.activeElement)) { e.preventDefault(); a.focus(); } else if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); } } }; const last = d.activeElement;
    sh.addEventListener('click', (e) => { if (e.target === sh || e.target.closest('[data-close]')) return close();
      const p = e.target.closest('.mx-pb'), w = e.target.closest('.mx-sw'), r = e.target.closest('[data-rem]');
      if (p) { M.set(p.dataset.p); touched(); gyroUp(); }
      else if (w) { const k = w.dataset.fx; if (k === 'gyro' && on(k) && G?.needsAsk) return gyroUp(); M.set(k, !on(k)); touched(); if (k === 'gyro') gyroUp(); M.haptic(); }
      else if (r) { const keep = r.dataset.rem === '1'; $$('button', ask).forEach((x) => (x.hidden = true)); ask.classList.add('done');
        if (keep) { ask.firstChild.textContent = '✅ Saved on this device'; M.remember().then((ok) => { if (ok) ask.firstChild.textContent = '✅ Saved on this device and your profile'; }); }
        else ask.firstChild.textContent = '👍 Just for this visit'; } });
    d.addEventListener('keydown', esc); b.appendChild(sh); sh.querySelector('.mx-pb[aria-checked=true]')?.focus();
    dispatchEvent(new CustomEvent('norex:settings', { detail: sh.querySelector('#mx-extra') }));
  };
  d.addEventListener('click', (e) => { const t = e.target.closest('[data-motion-settings]'); if (t) { e.preventDefault(); M.settings(); } });

  // ================= tilt with moving reflection =================
  // Cards rest at an angle and lean with where they sit on screen (scroll / rail position), like the iPhone home screen.
  // Mouse hover and touch-hold take over instantly (fast, no easing lag); the glare + sheen follow the same angle.
  const isCard = (el) => el.classList.contains('pc-card') || el.classList.contains('pc-hero');
  const ambient = new Set(); let ambRaf = 0, tio = null;
  // cards in a swipe rail lean by where they sit (that is the rail effect); cards in a static grid share ONE angle per row, otherwise neighbours turn
  // different ways, converge under the 3D perspective and intersect ("tilt = broken tiles")
  const inRail = (el) => { if (el._rail === undefined) { el._rail = false; for (let a = el.parentElement; a && a !== d.body; a = a.parentElement) { if (/auto|scroll/.test(getComputedStyle(a).overflowX) && a.scrollWidth > a.clientWidth + 4) { el._rail = true; break; } } } return el._rail; };
  addEventListener('resize', () => ambient.forEach((el) => { el._rail = undefined; }));
  const lean = (el) => { if (el._wheel ??= !!el.closest('.cover,.spot')) return;   // zn3: wheels pose their own cards – a second lean on top made them wobble
    const r = el.getBoundingClientRect(), vw = innerWidth, vh = innerHeight; if (r.width < 8) return;
    const nx = inRail(el) ? Math.max(-1.4, Math.min(1.4, (r.left + r.width / 2 - vw / 2) / (vw / 2))) : 0, ny = Math.max(-1.4, Math.min(1.4, (r.top + r.height / 2 - vh / 2) / (vh / 2)));
    const sc = Math.min(1, r.width / 150);   // tiny cards lean less
    const ry = (-6 + nx * -11) * sc, rx = (3.5 + ny * 7) * sc;
    el.style.transform = `perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
    el.style.setProperty('--mx', (50 + nx * 38).toFixed(1) + '%'); el.style.setProperty('--my', (30 + ny * 30).toFixed(1) + '%'); el.style.setProperty('--go', '.55'); };
  // glass panels: no tilt, but the light slides across them as you scroll (glare follows position on screen)
  const glass = new Set(); let glio = null;
  const shine = (el) => { const r = el.getBoundingClientRect(), nx = (r.left + r.width / 2 - innerWidth / 2) / innerWidth, ny = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    el.style.setProperty('--mx', (50 + nx * 60 + ny * 25).toFixed(1) + '%'); el.style.setProperty('--my', (40 + ny * 70).toFixed(1) + '%'); };
  const watchGlass = (root = d) => { if (!('IntersectionObserver' in window)) return; glio ||= new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { glass.add(e.target); e.target.classList.add('amb'); } else glass.delete(e.target); }); ambAsk(); }, { rootMargin: '60px' });
    $$('.panel,.sbt,.kc,.tile', root).forEach((el) => { if (!el.dataset.g) { el.dataset.g = 1; glio.observe(el); } }); };
  const ambTick = () => { ambRaf = 0; if (!on('tilt') && !on('glow')) return; if (d.documentElement.classList.contains('gyro-on')) { ambient.forEach((el) => { if (!el.classList.contains('live') && (el.style.transform || el.style.getPropertyValue('--go'))) { el.style.transform = ''; el.style.removeProperty('--go'); } }); return; } /* phone tilt takes over: drop the inline lean so the shared --gx/--gy tilt applies */ if (on('tilt')) ambient.forEach((el) => { if (!el.classList.contains('live') && el.isConnected) lean(el); }); if (on('glow')) glass.forEach((el) => { if (el.isConnected) shine(el); }); };
  const ambAsk = () => { if (!ambRaf) ambRaf = requestAnimationFrame(ambTick); };
  const ambClear = () => ambient.forEach((el) => { if (!el.classList.contains('live')) { el.style.transform = ''; el.style.setProperty('--go', 0); } });
  addEventListener('scroll', ambAsk, { passive: true, capture: true }); addEventListener('resize', ambAsk);
  addEventListener('norex:motion', () => { if (!on('tilt')) ambClear(); ambAsk(); });
  function tilt(el) {
    const max = +(el.dataset.tilt || (isCard(el) ? 16 : 9)); let raf = 0, active = false;
    const gloss = el.querySelector('.gloss i'); let sw = null;
    if (isCard(el) && 'IntersectionObserver' in window) { tio ||= new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? ambient.add(e.target) : ambient.delete(e.target))); ambAsk(); }, { rootMargin: '120px' }); tio.observe(el); }
    const set = (cx, cy) => { const r = el.getBoundingClientRect(), x = (cx - r.left) / r.width, y = (cy - r.top) / r.height;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.style.transform = `perspective(700px) rotateX(${((.5 - y) * max * 2).toFixed(2)}deg) rotateY(${((x - .5) * max * 2).toFixed(2)}deg) scale(1.03) translateZ(0)`; el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%'); el.style.setProperty('--go', 1); }); };
    const rest = () => { active = false; cancelAnimationFrame(raf); el.classList.remove('live'); el.style.transform = ''; el.style.setProperty('--go', 0); if (isCard(el)) ambAsk(); };
    el.addEventListener('pointerenter', (e) => { if (!on('tilt')) return; active = true; el.classList.add('live'); if (gloss) { sw?.cancel(); sw = gloss.animate([{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 700, easing: 'cubic-bezier(.2,.9,.2,1)' }); } set(e.clientX, e.clientY); });
    el.addEventListener('pointermove', (e) => { if (active) set(e.clientX, e.clientY); });
    el.addEventListener('pointerleave', rest); el.addEventListener('pointercancel', rest); el.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') rest(); });
    d.addEventListener('visibilitychange', rest); addEventListener('pagehide', rest);
  }
  M.tilt = () => { $$('.tilt:not([data-t])').forEach((el) => { el.dataset.t = 1; tilt(el); }); watchGlass(); ambAsk(); }; M.tilt();

  // ================= layered parallax =================
  const par = $$('[data-par]'); if (par.length) { let tick = false; addEventListener('scroll', () => { if (tick || !on('parallax')) return; tick = true; requestAnimationFrame(() => { const y = scrollY; par.forEach((el) => { el.style.transform = `translate3d(0,${(y * +el.dataset.par).toFixed(1)}px,0)`; }); tick = false; }); }, { passive: true });
    addEventListener('norex:motion', () => { if (!on('parallax')) par.forEach((el) => (el.style.transform = '')); }); }

  // ================= shared-element morph: card -> profile =================
  d.addEventListener('click', (e) => { const a = e.target.closest('a.pc-card'); if (a) { $$('[style*="view-transition-name"]').forEach((x) => (x.style.viewTransitionName = '')); a.style.viewTransitionName = 'pcard'; } }, true);
  addEventListener('pageshow', (e) => { if (e.persisted) $$('[style*="view-transition-name"]').forEach((x) => (x.style.viewTransitionName = '')); });
  // E1: a keyboard user tabbing into a clipped scroll strip (form pills, calendar dots, rating chips) must see what has focus
  d.addEventListener('focusin', (e) => { const t = e.target; if (!t || !t.matches || !t.matches(':focus-visible') || !t.getBoundingClientRect) return; const r = t.getBoundingClientRect(); if (r.width && (r.right > innerWidth || r.left < 0)) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
  // C1: a quick "dark hallway" flash in the section colour when a bottom tab is tapped (and its tail on the next page). Transform/opacity only, ≤350 ms
  const HALL = { club: '#e0574d', matches: '#46c28a', stats: '#62a8ff', tactics: '#b08cff', hub: '#efcf7a' };
  const hall = (col, tail) => { if (mode !== 'full' || !on('glow') || !b.animate) return;
    const w = d.createElement('div'); w.className = 'hall'; w.style.setProperty('--hc', col); w.innerHTML = '<i class="hd"></i><i class="hb"></i>'; b.appendChild(w);
    const ms = tail ? 240 : 320, o = { duration: ms, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'both' };
    w.firstChild.animate(tail ? [{ opacity: .5 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: .5, offset: .4 }, { opacity: .4 }], o);
    w.lastChild.animate([{ transform: 'translate3d(-110%,0,0)', opacity: 0 }, { opacity: 1, offset: .3 }, { transform: 'translate3d(110%,0,0)', opacity: 0 }], o).onfinish = () => w.remove(); setTimeout(() => w.remove(), ms + 80); };
  d.addEventListener('pointerdown', (e) => { const a = e.target.closest && e.target.closest('.tabbar a'); if (!a) return; const k = a.dataset.g || (a.hasAttribute('data-hub') ? 'hub' : ''); if (!HALL[k]) return; ss.set('norex.hall', HALL[k] + '|' + Date.now()); hall(HALL[k]); });
  { const h = (ss.get('norex.hall') || '').split('|'); ss.set('norex.hall', null); if (h[0] && Date.now() - (+h[1] || 0) < 5000) hall(h[0], true); }
})();
