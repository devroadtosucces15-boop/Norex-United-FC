// NOREX motion system: reveal, count-up, tilt/shine, parallax, shared-element transitions. One file, no dependencies.
(() => {
  const d = document, b = d.body, mq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mq.matches, lite = reduced() || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
  if (lite) b.classList.add('lite'); if (reduced()) b.classList.add('rm');
  const still = /[?&]still\b/.test(location.search); if (still) { b.classList.add('rm', 'still'); }
  window.NorexMotion = { reduced: () => still || reduced(), lite: lite || still };
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  // ---- reveal on scroll, staggered inside groups ----
  d.querySelectorAll('[data-stagger]').forEach((g) => [...g.children].forEach((c, i) => { c.classList.add('reveal'); c.style.setProperty('--i', Math.min(i, 12)); }));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  const watch = () => $$('.reveal:not(.in)').forEach((el) => io.observe(el)); watch(); window.NorexMotion.watch = watch;
  if (still) $$('.reveal').forEach((el) => el.classList.add('in'));
  setTimeout(() => $$('.reveal:not(.in)').forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('in'); }), 1200);
  // ---- scoreboard count-up ----
  const co = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; co.unobserve(e.target); const el = e.target, end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    if (reduced() || still || isNaN(end)) return; const t0 = performance.now(), dur = 1100; const f = (t) => { const k = Math.min(1, (t - t0) / dur), v = end * (1 - Math.pow(1 - k, 3)); el.textContent = dec ? v.toFixed(dec) : Math.round(v); if (k < 1) requestAnimationFrame(f); else el.textContent = el.dataset.count; }; requestAnimationFrame(f); }), { threshold: .5 });
  $$('[data-count]').forEach((el) => co.observe(el));
  // ---- tilt with moving reflection. Mouse = hover, touch = drag. Always returns to a stable resting state ----
  function tilt(el) {
    const max = +(el.dataset.tilt || 11); let raf = 0, active = false;
    const gloss = el.querySelector('.gloss i'); let sweep = null;
    const set = (cx, cy) => { const r = el.getBoundingClientRect(), x = (cx - r.left) / r.width, y = (cy - r.top) / r.height;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.style.transform = `perspective(900px) rotateX(${((.5 - y) * max * 2).toFixed(2)}deg) rotateY(${((x - .5) * max * 2).toFixed(2)}deg) translateZ(0)`; el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%'); el.style.setProperty('--go', 1); }); };
    const rest = () => { active = false; cancelAnimationFrame(raf); el.classList.remove('live'); el.style.transform = ''; el.style.setProperty('--go', 0); };
    el.addEventListener('pointerenter', (e) => { if (lite) return; active = true; el.classList.add('live'); if (gloss && !reduced()) { sweep?.cancel(); sweep = gloss.animate([{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 900, easing: 'cubic-bezier(.2,.9,.2,1)' }); } set(e.clientX, e.clientY); });
    el.addEventListener('pointermove', (e) => { if (active) set(e.clientX, e.clientY); });
    el.addEventListener('pointerleave', rest); el.addEventListener('pointercancel', rest); el.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') rest(); });
    d.addEventListener('visibilitychange', rest); addEventListener('pagehide', rest);
  }
  const tiltScan = () => $$('.tilt:not([data-t])').forEach((el) => { el.dataset.t = 1; tilt(el); }); tiltScan(); window.NorexMotion.tilt = tiltScan;
  // ---- gentle layered parallax ----
  const par = $$('[data-par]'); if (par.length && !lite) { let tick = false; addEventListener('scroll', () => { if (tick) return; tick = true; requestAnimationFrame(() => { const y = scrollY; par.forEach((el) => { el.style.transform = `translate3d(0,${(y * +el.dataset.par).toFixed(1)}px,0)`; }); tick = false; }); }, { passive: true }); }
  // ---- shared-element morph: card -> profile (cross-document view transition) ----
  d.addEventListener('click', (e) => { const a = e.target.closest('a.pc-card'); if (a) { $$('[style*="view-transition-name"]').forEach((x) => x.style.viewTransitionName = ''); a.style.viewTransitionName = 'pcard'; } }, true);
  // ---- count-up targets that were rendered with plain text keep working without JS ----
  addEventListener('pageshow', (e) => { if (e.persisted) { $$('[style*="view-transition-name"]').forEach((x) => x.style.viewTransitionName = ''); } });
})();
