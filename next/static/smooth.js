// Site-wide smooth scroll: Lenis (inertial scrolling) on every page; GSAP + ScrollTrigger load after the page is idle for the scrubbed motion
// (progress bar, heading drift, crest/halo parallax, icon drift). Off for reduced-motion users, the calm/off motion modes and ?still.
// Pages that need native scrolling set <html data-nosmooth> or are listed in SMOOTH_OFF (lib/ui.mjs).
(() => {
  const H = document.documentElement;
  const calm = () => H.dataset.motion === 'calm' || H.dataset.motion === 'off' || /[?&]still/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (H.hasAttribute('data-nosmooth') || calm() || !window.Lenis) return;
  // nested scrollers (menus, chat lists, tables, sheets) keep their own native scrolling
  const nested = (n) => { for (let e = n; e && e !== document.body && e !== H; e = e.parentElement) { if (e.hasAttribute && e.hasAttribute('data-lenis-prevent')) return true; const o = getComputedStyle(e); if (/(auto|scroll)/.test(o.overflowY) && e.scrollHeight > e.clientHeight + 1) return true; if (/(auto|scroll)/.test(o.overflowX) && e.scrollWidth > e.clientWidth + 1) return true; } return false; };
  const lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, anchors: true, prevent: nested });
  window.NorexLenis = lenis;
  H.classList.add('sm-on');
  const bar = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'sm-bar' }));
  lenis.on('scroll', ({ progress }) => { bar.style.transform = `scaleX(${progress || 0})`; });
  // hand scrolling back to the browser while a menu, sheet or dialog has locked the page
  const locked = () => getComputedStyle(H).overflowY === 'hidden' || getComputedStyle(document.body).overflowY === 'hidden' || document.body.className.split(/\s+/).some((c) => /(^|-)lock$/.test(c));
  const sync = () => (locked() ? lenis.stop() : lenis.start());
  new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ['style', 'class'] });
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
  // GSAP is fetched once the page has settled, so it never competes with first paint
  const js = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const effects = () => {
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    const each = (sel, fn) => gsap.utils.toArray(sel).forEach(fn);
    each('.sec > header h2, .sec > header .eyebrow', (el) => gsap.fromTo(el, { y: 22 }, { y: 0, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 94%', end: 'top 62%', scrub: 0.5 } }));
    each('.crestwrap img, [data-parallax]', (el) => { const d = +el.dataset.parallax || 22; gsap.fromTo(el, { y: -d }, { y: d, ease: 'none', scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: 0.8 } }); });
    each('.ab-card .ab-i', (el) => gsap.fromTo(el, { y: 14 }, { y: -14, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } }));
    let t = 0; const refresh = () => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 250); };
    addEventListener('norex:revealed', refresh); addEventListener('resize', refresh);
    window.NorexGSAP = true;
  };
  const boot = () => js('vendor-gsap.min.js').then(() => js('vendor-scrolltrigger.min.js')).then(effects).catch(() => {});
  const go = () => (window.requestIdleCallback ? requestIdleCallback(boot, { timeout: 2500 }) : setTimeout(boot, 800));
  document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
})();
