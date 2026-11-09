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

(() => {
  try {
    const d = document;
    const KEYP = '<path d="M16 1.6c2.6 3.6 6.6 5.8 6.6 10.9a6.6 6.6 0 0 1-13.2 0c0-2.3 1-3.9 2.3-5.1.2 1.6.9 2.5 1.9 2.8-.5-3.3.6-6.3 2.4-8.6zM16 9.8l.85 1.75 1.9.25-1.4 1.35.35 1.9L16 14.15l-1.7.9.35-1.9-1.4-1.35 1.9-.25z"/><path d="M14.6 18.6h2.8v10.600a1.400 1.400 0 0 1-2.800 0z"/><path d="M17.400 23.200h3.400a1 1 0 0 1 0 2.200h-3.400zM17.400 26.600h2.400a1 1 0 0 1 0 2.200h-2.400z"/><path d="M13.600 19.400C10 19.600 7.300 18 5.400 15.200c.3 4.300 3.300 7.400 8.200 7.600zM18.400 19.400c3.600.2 6.300-1.400 8.200-4.200-.3 4.300-3.300 7.400-8.200 7.600z"/>';
    const icon = (gold) => `<svg class="pfk" viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">${gold ? '<defs><linearGradient id="pfkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".45" stop-color="#f3c95c"/><stop offset="1" stop-color="#e8741a"/></linearGradient></defs>' : ''}<g fill="${gold ? 'url(#pfkg)' : 'currentColor'}" fill-rule="evenodd"${gold ? ' stroke="#fff3c4" stroke-width=".35"' : ''}>${KEYP}</g></svg>`;
    const calm = () => {
      try {
        const m = d.documentElement.dataset.motion || d.body.dataset.motion || localStorage.getItem('norex.motion') || '';
        return m === 'calm' || m === 'off' || localStorage.getItem('norex.fx') === 'off' || d.body.classList.contains('still') || location.search.includes('still') || matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch { return true; }
    };
    d.querySelectorAll('.tabbar .key svg').forEach((s) => { s.outerHTML = icon(false); });
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.id === 'hubfx') { const k = n.querySelector('.fx-key'); if (k) k.innerHTML = icon(true); } }).observe(d.body, { childList: true });

    let cv = null, x = null, raf = 0, last = 0, until = 0, P = [], rings = [], wings = null;
    const stop = () => { cancelAnimationFrame(raf); raf = 0; P = []; rings = []; wings = null; if (cv) { cv.remove(); cv = null; } };
    const ember = (px, py, vx, vy, r, m) => { if (P.length < 260) P.push({ x: px, y: py, vx, vy, r, l: 0, m }); };
    const feather = (ox, oy, s, a, L, al) => {
      const tx = ox + s * Math.sin(a) * L, ty = oy - Math.cos(a) * L, nx = Math.cos(a) * s * L * .17, ny = Math.sin(a) * L * .17, mx = (ox + tx) / 2, my = (oy + ty) / 2;
      const g = x.createLinearGradient(ox, oy, tx, ty); g.addColorStop(0, `rgba(255,243,207,${al})`); g.addColorStop(.5, `rgba(255,170,60,${al * .75})`); g.addColorStop(1, 'rgba(232,84,26,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(ox, oy); x.quadraticCurveTo(mx - nx, my - ny, tx, ty); x.quadraticCurveTo(mx + nx * 1.6, my + ny * 1.6, ox, oy); x.fill();
    };
    const tick = (t) => {
      if (!cv) return; const dt = Math.min(.05, (t - last) / 1000); last = t;
      x.clearRect(0, 0, innerWidth, innerHeight); x.globalCompositeOperation = 'lighter';
      if (wings) {
        wings.t += dt / .85; const w = wings.t;
        if (w >= 1) wings = null; else { const e = 1 - Math.pow(1 - w, 3), al = Math.pow(1 - w, 1.4) * .8, k = Math.min(1.25, innerWidth / 400); for (const s of [-1, 1]) for (let i = 0; i < 6; i++) feather(wings.x, wings.y, s, (.2 + i * .29) * e, (120 + i * 30) * e * k, al); }
      }
      rings = rings.filter((r) => { r.t += dt / .65; if (r.t >= 1) return false; if (r.t > 0) { x.strokeStyle = `rgba(255,214,130,${(1 - r.t) * .8})`; x.lineWidth = 3.5 * (1 - r.t); x.beginPath(); x.arc(r.x, r.y, 30 + r.t * 190, 0, 6.283); x.stroke(); } return true; });
      const key = d.querySelector('#hubfx .fx-key');
      if (key && +getComputedStyle(key).opacity > .05) { const r = key.getBoundingClientRect(), kx = r.left + r.width / 2, ky = r.top + r.height / 2; for (let i = 0; i < 3; i++) ember(kx + (Math.random() - .5) * r.width * .5, ky + (Math.random() - .5) * r.height * .5, (Math.random() - .5) * 70, 30 + Math.random() * 90, 1 + Math.random() * 2.2, .5 + Math.random() * .7); }
      const drag = Math.pow(.12, dt);
      P = P.filter((p) => {
        p.l += dt / p.m; if (p.l >= 1) return false; p.vx *= drag; p.vy = p.vy * drag - 46 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const a = 1 - p.l, g = Math.round(214 - 110 * p.l), b = Math.round(130 - 100 * p.l);
        x.fillStyle = `rgba(255,${g},${b},${a * .22})`; x.beginPath(); x.arc(p.x, p.y, p.r * 3.4, 0, 6.283); x.fill();
        x.fillStyle = `rgba(255,${g + 30},${b + 60},${a})`; x.beginPath(); x.arc(p.x, p.y, p.r * (1 - p.l * .5), 0, 6.283); x.fill(); return true;
      });
      if (t > until || (!P.length && !rings.length && !wings && !key)) return stop();
      raf = requestAnimationFrame(tick);
    };
    const fire = (px, py) => {
      if (!cv) { cv = d.createElement('canvas'); cv.className = 'pf-burst'; cv.setAttribute('aria-hidden', 'true'); d.body.appendChild(cv); x = cv.getContext('2d'); }
      const dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < 56; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.5, v = 140 + Math.random() * 460; ember(px, py, Math.cos(a) * v, Math.sin(a) * v, 1 + Math.random() * 2.6, .6 + Math.random() * .9); }
      rings.push({ x: px, y: py, t: 0 }, { x: px, y: py, t: -.2 }); wings = { x: px, y: py, t: 0 };
      last = performance.now(); until = last + 6000; if (!raf) raf = requestAnimationFrame(tick);
    };
    d.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[data-hub]'); if (!a || calm() || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      const r = a.getBoundingClientRect(); fire(r.left + r.width / 2, r.top + r.height / 2);
    });
    addEventListener('pageshow', (e) => { if (e.persisted) stop(); });
    addEventListener('pagehide', stop);
  } catch {}
})();
