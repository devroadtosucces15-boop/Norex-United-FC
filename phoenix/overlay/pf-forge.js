// motion.dev layered over the current Phoenix site. Nothing is replaced; it composes with the existing
// reveal / GSAP / Lenis code by animating the independent CSS `translate`, `rotate` and `scale` properties only.
(() => {
  try {
    const M = window.Motion; if (!M) return;
    const { animate, scroll, inView, stagger, spring, hover } = M;
    const H = document.documentElement, d = document;
    let calm = false;
    try { calm = localStorage.getItem('norex.motion') === 'calm' || localStorage.getItem('norex.fx') === 'off' || H.dataset.motion === 'calm' || H.dataset.motion === 'off'; } catch {}
    if (calm || /[?&]still\b/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];


    // 1. HERO: independent planes (copy, crest stage, side cards, embers, halo) leave at different speeds, crest rises and tilts back
    const hero = $('.hero');
    if (hero) {
      const opt = { target: hero, offset: ['start start', 'end start'] }, lin = { ease: 'linear' };
      const copy = $('.hero > div:not(.stage)'), stage = $('.stage', hero), embers = $('.pf-embers', hero), halo = $('.halo', hero);
      // scale and rotate are written to the independent CSS properties from scroll progress (a plain callback), so they never touch
      // the `transform` that tilt and the existing GSAP parallax already own
      const set = (els, fn) => scroll((p) => els.forEach((e, i) => fn(e, p, i)), opt);
      if (copy) scroll(animate(copy, { translate: ['0px 0px', '0px -90px'], opacity: [1, 0.1] }, lin), opt);
      if (stage) { scroll(animate(stage, { translate: ['0px 0px', '0px -40px'] }, lin), opt); set([stage], (e, p) => { e.style.scale = 1 - p * 0.1; }); }
      const crests = $$('.crestwrap', hero); crests.forEach((c) => scroll(animate(c, { translate: ['0px 0px', '0px -70px'] }, lin), opt));
      set(crests, (e, p) => { e.style.rotate = `${-5 * p}deg`; e.style.scale = 1 + 0.08 * p; });
      const cards = $$('.cardwrap', hero); cards.forEach((c, i) => scroll(animate(c, { translate: ['0px 0px', `${i ? 40 : -40}px ${-190 - i * 90}px`] }, lin), opt));
      set(cards, (e, p, i) => { e.style.rotate = `${(i ? 9 : -9) * p}deg`; });
      if (embers) scroll(animate(embers, { translate: ['0px 0px', '0px -160px'] }, lin), opt);
      if (halo) { scroll(animate(halo, { opacity: [1, 0.35] }, lin), opt); set([halo], (e, p) => { e.style.scale = 1 + 0.7 * p; }); }
      const bloom = d.createElement('div'); bloom.className = 'fg-bloom'; d.body.prepend(bloom);
      scroll(animate(bloom, { opacity: [0, 1, 0] }, { ease: 'linear', times: [0, 0.35, 1] }), { target: hero, offset: ['start start', 'end start'] });

      // 2. HEADLINE: words rise out of blur on a spring, stagger left to right
      const h1 = null; // combined: headline is handled by ignite.js (letters)
      if (h1) {
        const wrap = (node) => {
          for (const n of [...node.childNodes]) {
            if (n.nodeType === 3) { const f = d.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach((t) => { if (!t) return; if (/^\s+$/.test(t)) f.append(' '); else { const s = d.createElement('span'); s.className = 'fw'; s.textContent = t; f.append(s); } }); n.replaceWith(f); }
            else if (n.nodeType === 1 && n.tagName !== 'BR') wrap(n);
          }
        };
        wrap(h1); H.classList.add('forge-on');
        animate($$('.fw', h1), { opacity: [0, 1], y: [46, 0], filter: ['blur(10px)', 'blur(0px)'] }, { delay: stagger(0.11, { startDelay: 0.25 }), type: spring, bounce: 0.28, duration: 0.9 });
      }
    }

    // 3. CARD ROWS: after the normal rise-in, cards fan out on a spring (rotate + scale only, so existing reveals are untouched)
    $$('.act5-row, .cards').forEach((row) => {
      const kids = [...row.children].slice(0, 8); if (kids.length < 2) return;
      inView(row, () => { animate(kids, { rotate: (i) => [`${(i - (kids.length - 1) / 2) * 7}deg`, '0deg'], scale: [0.88, 1] }, { delay: stagger(0.07), type: spring, bounce: 0.35, duration: 0.8 }); }, { amount: 0.35 });
    });

    // 4. MAGNETIC BUTTONS (fine pointers only): pulled toward the cursor, released on a spring
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
      $$('.btn').forEach((b) => {
        b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); animate(b, { translate: `${(e.clientX - r.left - r.width / 2) * 0.22}px ${(e.clientY - r.top - r.height / 2) * 0.3}px` }, { type: spring, stiffness: 320, damping: 18 }); });
        b.addEventListener('pointerleave', () => animate(b, { translate: '0px 0px' }, { type: spring, stiffness: 260, damping: 14 }));
      });
    }
  } catch (e) { console.warn('forge', e); }
})();
