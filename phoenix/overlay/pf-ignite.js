// PROPOSAL B · IGNITE: anime.js layered over the current Phoenix site. Signature move: a thread of ember that burns down the right edge
// as you scroll, with a glowing head; each section's ribbon throws sparks the moment the thread reaches it.
(() => {
  try {
    const A = window.anime; if (!A) return;
    const { animate, stagger, splitText, svg, utils, onScroll, spring } = A;
    const H = document.documentElement, d = document, NS = 'http://www.w3.org/2000/svg';
    let calm = false;
    try { calm = localStorage.getItem('norex.motion') === 'calm' || localStorage.getItem('norex.fx') === 'off' || H.dataset.motion === 'calm' || H.dataset.motion === 'off'; } catch {}
    if (calm || /[?&]still\b/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];

    

    // 1. HEADLINE: each letter flares in from white-hot and settles to ember
    const h1 = $('.hero h1');
    if (h1) {
      const sp = splitText(h1, { chars: { class: 'ig-c' } }); H.classList.add('ignite-on');
      animate(sp.chars, { opacity: [0, 1], y: ['.7em', 0], scale: [0.7, 1], filter: ['brightness(4) blur(8px)', 'brightness(1) blur(0px)'], delay: stagger(38, { start: 250 }), duration: 900, ease: 'outExpo' });
    }

    // 2. RESULT PILLS pop in on an elastic spring
    const pills = $$('.hero .ticker .fd');
    if (pills.length) animate(pills, { scale: [0, 1], rotate: [-25, 0], delay: stagger(110, { start: 900 }), ease: spring({ stiffness: 260, damping: 11 }) });

    // 3. HALO breathes with scroll through the hero (anime's own scroll observer)
    
    // 4. EMBER THREAD (signature): a wavy line down the right edge, drawn by page progress, glowing head riding the tip
    const svgEl = d.createElementNS(NS, 'svg'); svgEl.setAttribute('class', 'ig-thread'); svgEl.setAttribute('aria-hidden', 'true');
    svgEl.innerHTML = '<defs><linearGradient id="igg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3c95c"/><stop offset=".6" stop-color="#ff9a2e"/><stop offset="1" stop-color="#e8541a"/></linearGradient></defs><path class="track"/><path class="burn"/><circle class="ig-head" r="4.5"/>';
    d.body.appendChild(svgEl);
    const track = $('.track', svgEl), burn = $('.burn', svgEl), head = $('.ig-head', svgEl);
    let draw, move, prog = 0;
    const build = () => {
      const h = innerHeight; svgEl.setAttribute('viewBox', `0 0 28 ${h}`);
      let p = 'M14 0'; for (let y = 0; y < h; y += 90) p += ` C 26 ${y + 30}, 2 ${y + 60}, 14 ${y + 90}`;
      track.setAttribute('d', p); burn.setAttribute('d', p);
      if (draw) { draw.revert?.(); move?.revert?.(); }
      const dr = svg.createDrawable(burn);
      draw = animate(dr, { draw: ['0 0', '0 1'], duration: 1000, ease: 'linear', autoplay: false });
      const mp = svg.createMotionPath(burn);
      move = animate(head, { ...mp, duration: 1000, ease: 'linear', autoplay: false });
      apply();
    };
    const apply = () => { draw.seek(prog * 1000); move.seek(prog * 1000); };
    const onScrollP = () => { const max = H.scrollHeight - innerHeight; prog = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0; if (draw) apply(); };
    build(); onScrollP(); addEventListener('scroll', onScrollP, { passive: true }); addEventListener('resize', () => { build(); onScrollP(); });

    // 5. SPARKS: when a section header meets the middle of the screen its ribbon ignites and throws embers
    const spark = (x, y) => {
      const els = Array.from({ length: 12 }, () => { const s = d.createElement('i'); s.className = 'ig-spark'; s.style.transform = `translate(${x}px,${y}px)`; d.body.appendChild(s); return s; });
      animate(els, { translateX: () => x + utils.random(-90, 90), translateY: () => y + utils.random(-110, 20), scale: [1.4, 0], opacity: [1, 0], duration: () => utils.random(700, 1300), ease: 'outCubic', onComplete: () => els.forEach((e) => e.remove()) });
    };
    const lit = new WeakSet();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting || lit.has(e.target)) return; lit.add(e.target);
      const r = e.target.getBoundingClientRect(); e.target.classList.add('ig-lit'); spark(r.left + 24, r.top + r.height / 2);
      setTimeout(() => e.target.classList.remove('ig-lit'), 1400);
    }), { rootMargin: '0px 0px -45% 0px', threshold: 0.6 });
    $$('.sec > header .ribbon').forEach((r) => io.observe(r));
  } catch (e) { console.warn('ignite', e); }
})();
