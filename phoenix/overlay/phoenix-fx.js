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
    d.querySelectorAll('.tabbar .key .kk svg, .tabbar .key > svg:not(.kl)').forEach((s) => { s.outerHTML = icon(false); });
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

(() => {
  try {
    const d = document, bar = d.querySelector('.tabbar'); if (!bar) return;
    const TAB = {
      club: '<path fill="url(#pft)" fill-rule="evenodd" d="M16 2l11 4v9c0 7-4.500 12-11 15C9.500 27 5 22 5 15V6zM16 8.500c-1.300 1.700-2.100 3.900-1.700 6.300-.7-.2-1.200-.9-1.400-2-.9.900-1.600 2-1.600 3.700a4.700 4.700 0 0 0 9.400 0c0-3.700-2.800-5.300-4.700-8z"/><path class="pflame" fill="#fff3cf" d="M16 8.500c-1.300 1.700-2.100 3.900-1.700 6.300-.7-.2-1.200-.9-1.400-2-.9.900-1.600 2-1.600 3.700a4.700 4.700 0 0 0 9.400 0c0-3.700-2.800-5.300-4.700-8z"/>',
      matches: '<g class="pball"><path fill="url(#pft)" fill-rule="evenodd" d="M16 2a14 14 0 1 1 0 28 14 14 0 0 1 0-28zm0 2.200a11.800 11.800 0 1 0 0 23.600 11.800 11.800 0 0 0 0-23.600z"/><path fill="url(#pft)" d="M16 10.8L20.9 14.4L19.1 20.2L12.9 20.2L11.1 14.4zM16 6.700L11.800 3.700A13 13 0 0 1 20.200 3.700zM24.800 13.100L26.400 8.200A13 13 0 0 1 29 16.200zM21.500 23.500L26.600 23.500A13 13 0 0 1 19.800 28.400zM10.500 23.500L12.200 28.400A13 13 0 0 1 5.400 23.500zM7.200 13.100L3 16.200A13 13 0 0 1 5.600 8.200z"/><path fill="none" stroke="url(#pft)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 10.800L16 6.700M20.900 14.400L24.800 13.100M19.100 20.200L21.500 23.500M12.900 20.200L10.500 23.500M11.100 14.400L7.200 13.100"/></g>',
      stats: '<path class="pb" fill="url(#pft)" d="M4 20.500a1.500 1.500 0 0 1 1.500-1.500h3a1.500 1.500 0 0 1 1.500 1.500V29H4z"/><path class="pb pb2" fill="url(#pft)" d="M13 15.500a1.500 1.500 0 0 1 1.500-1.500h3a1.500 1.500 0 0 1 1.500 1.500V29h-6z"/><path class="pb pb3" fill="url(#pft)" d="M22 10.500A1.500 1.500 0 0 1 23.500 9h3a1.500 1.500 0 0 1 1.500 1.500V29h-6z"/><path class="pd" pathLength="1" fill="none" stroke="url(#pft)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4.500 13.500l7-5 4 2.500 8-7.500M19.500 3.200h4.200v4.200"/>',
      tactics: '<path fill="url(#pft)" fill-rule="evenodd" d="M6 3h20a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm0 2.200a.8.8 0 0 0-.8.800v20c0 .440.360.800.800.800h20a.8.8 0 0 0 .8-.8V6a.8.8 0 0 0-.8-.8z"/><path fill="none" stroke="url(#pft)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 8.500h5M8 12h3"/><circle class="ppop" cx="10.500" cy="21.500" r="3" fill="none" stroke="url(#pft)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><path class="pd" pathLength="1" fill="none" stroke="url(#pft)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13.500 19c1.500-3.500 3.500-5.500 7-6.500"/><path class="ppop ppop2" fill="none" stroke="url(#pft)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 8l5 5M24 8l-5 5"/>',
    };
    const DEFS = '<defs><linearGradient id="pft" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="30" y2="30"><stop offset="0" stop-color="#fff3cf"/><stop offset=".5" style="stop-color:var(--pf2,#f3c95c)"/><stop offset="1" style="stop-color:var(--pf3,#e8741a)"/></linearGradient></defs>';
    const sync = () => {
      for (const a of bar.querySelectorAll('a[data-g]')) {
        const s = a.querySelector('.tbi'), k = a.dataset.g, on = a.classList.contains('on'); if (!s || !TAB[k]) continue;
        if (on && !s.classList.contains('pfl')) { s.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true">${DEFS.replace(/pft/g, 'pft-' + k)}${TAB[k].replace(/#pft/g, '#pft-' + k)}</svg>`; s.classList.add('pfl'); }
        else if (!on && s.classList.contains('pfl')) { s.textContent = ''; s.classList.remove('pfl'); }
      }
    };
    sync(); new MutationObserver(sync).observe(bar, { attributes: true, attributeFilter: ['class'], subtree: true });
  } catch {}
})();
