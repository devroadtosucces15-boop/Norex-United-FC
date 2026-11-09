// Phoenix Fire: a few embers rising behind the hero. Skipped for calm/off motion, ?still, hidden tabs and off-screen heroes; ~24 dots, 30 fps.
(() => {
  try {
    const hero = document.querySelector('.hero'); if (!hero) return;
    const q = location.search.includes('still'); let calm = false;
    try { calm = localStorage.getItem('norex.motion') === 'calm' || localStorage.getItem('norex.fx') === 'off'; } catch {}
    if (q || calm || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas'); c.className = 'pf-embers'; c.setAttribute('aria-hidden', 'true'); hero.prepend(c);
    const x = c.getContext('2d'); let W = 0, H = 0, on = true, last = 0;
    const size = () => { const r = hero.getBoundingClientRect(); W = c.width = Math.max(1, Math.round(r.width)); H = c.height = Math.max(1, Math.round(r.height)); };
    size(); addEventListener('resize', size);
    const P = Array.from({ length: 24 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, v: .02 + Math.random() * .05, d: Math.random() * 6.28, a: .25 + Math.random() * .6 }));
    new IntersectionObserver((e) => { on = e[0].isIntersecting; if (on) requestAnimationFrame(tick); }).observe(hero);
    function tick(t) {
      if (!on || document.hidden) return; requestAnimationFrame(tick); if (t - last < 33) return; const dt = Math.min(.1, (t - last) / 1000); last = t;
      x.clearRect(0, 0, W, H);
      for (const p of P) {
        p.y -= p.v * dt; p.d += dt; if (p.y < -.05) { p.y = 1.05; p.x = Math.random(); }
        const px = (p.x + Math.sin(p.d) * .012) * W, py = p.y * H, g = x.createRadialGradient(px, py, 0, px, py, p.r * 4);
        g.addColorStop(0, `rgba(255,190,90,${p.a})`); g.addColorStop(1, 'rgba(232,84,26,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, p.r * 4, 0, 6.283); x.fill();
      }
    }
    requestAnimationFrame(tick);
  } catch {}
})();
