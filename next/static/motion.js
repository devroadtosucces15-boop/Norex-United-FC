// NOREX motion system: modes, staged scroll reveals, count-up, loading morphs, list glides, submit states, toasts, alerts, tilt, parallax.
// One file, no dependencies. Everything animates transform/opacity only and is tied to real state (in view, data landed, request done).
(() => {
  const d = document, H = d.documentElement, b = d.body;
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const mqR = matchMedia('(prefers-reduced-motion: reduce)');
  const still = /[?&]still\b/.test(location.search);
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2 || !!navigator.connection?.saveData;
  // ---- mode: saved choice wins; otherwise reduced-motion or a weak/data-saving device starts calm ----
  const auto = () => (mqR.matches || weak ? 'calm' : 'full');
  let mode = still ? 'off' : (ls.get('norex.motion') || (ls.get('norex.fx') === 'off' ? 'calm' : auto()));
  const apply = () => { H.dataset.motion = mode; b.classList.toggle('lite', mode !== 'full' || weak); b.classList.toggle('rm', mode === 'off'); if (still) b.classList.add('still'); };
  apply(); H.classList.add('mx');
  if (!ls.get('norex.motion') && navigator.getBattery) navigator.getBattery().then((bt) => { if (bt.level < .2 && !bt.charging && mode === 'full') { mode = 'calm'; apply(); } }).catch(() => {});
  const M = window.NorexMotion = {
    get mode() { return mode; },
    setMode(m) { mode = m; ls.set('norex.motion', m); apply(); dispatchEvent(new CustomEvent('norex:motion', { detail: m })); },
    reduced: () => mode !== 'full', lite: weak || mode !== 'full', off: () => mode === 'off',
  };

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
  M.land = (el, html) => new Promise((ok) => {
    const put = () => { if (html != null) el.innerHTML = html; el.removeAttribute('aria-busy'); [...el.children].forEach((c, i) => c.style.setProperty('--li', Math.min(i, 10)));
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
    try { const r = await (typeof work === 'function' ? work() : work); btn.classList.remove('mx-busy'); btn.classList.add('mx-ok'); M.haptic(); if (burst && mode === 'full' && window.NorexFx) { const q = btn.getBoundingClientRect(); NorexFx.burst(q.left + q.width / 2, q.top + q.height / 2, 16); } setTimeout(() => btn.classList.remove('mx-ok'), 1100); return r; }
    catch (e) { btn.classList.remove('mx-busy'); btn.classList.add('mx-err'); M.haptic([10, 40, 10]); setTimeout(() => btn.classList.remove('mx-err'), 600); throw e; }
    finally { btn.removeAttribute('aria-busy'); }
  };
  M.haptic = (p = 8) => { if (mode !== 'full') return; try { navigator.vibrate?.(p); } catch {} };

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
  M.settings = () => {
    const opts = [['full', '✨', 'Full', 'Every reveal, tilt, glow and transition'], ['calm', '🌙', 'Calm', 'Soft fades only. Easier on the eyes and battery'], ['off', '⏸️', 'Off', 'No animation at all']];
    const sh = d.createElement('div'); sh.className = 'mx-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', 'Motion and effects');
    sh.innerHTML = `<div class="mx-sheet-body"><h3 style="font:700 20px Oswald;letter-spacing:.04em;margin:0">🎬 Motion &amp; effects</h3><p class="muted small" style="margin:6px 0 0">Saved on this device.</p><div class="mx-opts" role="radiogroup">${opts.map(([v, e, t, s]) => `<button type="button" class="mx-opt" role="radio" aria-checked="${v === mode}" data-v="${v}"><span class="e">${e}</span><span><b>${t}</b><small>${s}</small></span></button>`).join('')}</div><div id="mx-extra"></div><button type="button" class="btn ghost" data-close style="margin-top:16px;width:100%">Done</button></div>`;
    const close = () => { sh.classList.add('out'); setTimeout(() => sh.remove(), 260); d.removeEventListener('keydown', esc); last?.focus?.(); };
    const esc = (e) => { if (e.key === 'Escape') close(); }; const last = d.activeElement;
    sh.addEventListener('click', (e) => { if (e.target === sh || e.target.closest('[data-close]')) close(); const o = e.target.closest('.mx-opt'); if (o) { M.setMode(o.dataset.v); $$('.mx-opt', sh).forEach((x) => x.setAttribute('aria-checked', x === o)); } });
    d.addEventListener('keydown', esc); b.appendChild(sh); sh.querySelector('[aria-checked=true]')?.focus();
    dispatchEvent(new CustomEvent('norex:settings', { detail: sh.querySelector('#mx-extra') }));
  };
  d.addEventListener('click', (e) => { const t = e.target.closest('[data-motion-settings]'); if (t) { e.preventDefault(); M.settings(); } });

  // ================= tilt with moving reflection (mouse = hover, touch = drag) =================
  function tilt(el) {
    const max = +(el.dataset.tilt || 11); let raf = 0, active = false;
    const gloss = el.querySelector('.gloss i'); let sw = null;
    const set = (cx, cy) => { const r = el.getBoundingClientRect(), x = (cx - r.left) / r.width, y = (cy - r.top) / r.height;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.style.transform = `perspective(900px) rotateX(${((.5 - y) * max * 2).toFixed(2)}deg) rotateY(${((x - .5) * max * 2).toFixed(2)}deg) translateZ(0)`; el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%'); el.style.setProperty('--go', 1); }); };
    const rest = () => { active = false; cancelAnimationFrame(raf); el.classList.remove('live'); el.style.transform = ''; el.style.setProperty('--go', 0); };
    el.addEventListener('pointerenter', (e) => { if (mode !== 'full') return; active = true; el.classList.add('live'); if (gloss) { sw?.cancel(); sw = gloss.animate([{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 900, easing: 'cubic-bezier(.2,.9,.2,1)' }); } set(e.clientX, e.clientY); });
    el.addEventListener('pointermove', (e) => { if (active) set(e.clientX, e.clientY); });
    el.addEventListener('pointerleave', rest); el.addEventListener('pointercancel', rest); el.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') rest(); });
    d.addEventListener('visibilitychange', rest); addEventListener('pagehide', rest);
  }
  M.tilt = () => $$('.tilt:not([data-t])').forEach((el) => { el.dataset.t = 1; tilt(el); }); M.tilt();

  // ================= layered parallax =================
  const par = $$('[data-par]'); if (par.length) { let tick = false; addEventListener('scroll', () => { if (tick || mode !== 'full') return; tick = true; requestAnimationFrame(() => { const y = scrollY; par.forEach((el) => { el.style.transform = `translate3d(0,${(y * +el.dataset.par).toFixed(1)}px,0)`; }); tick = false; }); }, { passive: true });
    addEventListener('norex:motion', () => { if (mode !== 'full') par.forEach((el) => (el.style.transform = '')); }); }

  // ================= shared-element morph: card -> profile =================
  d.addEventListener('click', (e) => { const a = e.target.closest('a.pc-card'); if (a) { $$('[style*="view-transition-name"]').forEach((x) => (x.style.viewTransitionName = '')); a.style.viewTransitionName = 'pcard'; } }, true);
  addEventListener('pageshow', (e) => { if (e.persisted) $$('[style*="view-transition-name"]').forEach((x) => (x.style.viewTransitionName = '')); });
})();
