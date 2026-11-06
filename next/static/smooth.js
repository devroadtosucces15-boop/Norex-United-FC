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
  const studioPage = (window.NOREX && NOREX.page) === 'studio.html';
  if (studioPage) { H.classList.add('sm-intro'); setTimeout(() => H.classList.remove('sm-intro'), 3000); } // failsafe: never leave the Studio hidden
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
    // Opening animation: the Studio page itself and the editor that opens inside the Playbook
    const intro = (root, parts) => { const q = (sel) => gsap.utils.toArray(sel, root); const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => H.classList.remove('sm-intro') });
      parts(tl, q); return tl; };
    window.NorexOpenFX = (el) => { if (!el || !window.gsap) return;
      intro(el, (tl, q) => { tl.fromTo(el, { opacity: 0, y: 26, scale: 0.985, transformPerspective: 900, rotateX: 4 }, { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.7, clearProps: 'transform,opacity' }); }); };
    if (studioPage) {
      intro(document, (tl, q) => {
        tl.set('.sec > header, .sec > .chips, .txsteps li, #board', { opacity: 0 })
          .call(() => H.classList.remove('sm-intro'))
          .fromTo('.sec > header .eyebrow', { y: 18, opacity: 0, letterSpacing: '.35em' }, { y: 0, opacity: 1, letterSpacing: '', duration: 0.6, clearProps: 'all' })
          .fromTo('.sec > header h2', { y: 40, opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { y: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', duration: 0.7, clearProps: 'all' }, '<0.08')
          .to('.sec > header', { opacity: 1, duration: 0.01 }, '<')
          .fromTo('.sec > .chips', { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.45, clearProps: 'all' }, '-=0.35')
          .fromTo('.txsteps li', { y: 22, opacity: 0, rotateX: -18, transformPerspective: 700 }, { y: 0, opacity: 1, rotateX: 0, stagger: 0.09, duration: 0.55, clearProps: 'all' }, '-=0.25')
          .fromTo('#board', { y: 50, opacity: 0, scale: 0.95, rotateX: 7, transformPerspective: 1100, transformOrigin: '50% 100%' }, { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 0.9, ease: 'expo.out', clearProps: 'all' }, '-=0.3');
      });
    }
  };
  const boot = () => js('vendor-gsap.min.js').then(() => js('vendor-scrolltrigger.min.js')).then(effects).catch(() => {});
  const go = () => (window.requestIdleCallback ? requestIdleCallback(boot, { timeout: 2500 }) : setTimeout(boot, 800));
  if (studioPage) boot(); // the Studio's opening animation needs GSAP right away
  else document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
})();
