// Phoenix Fire 3D crest: the supplied crest art as a flat image with layered thickness, tilted by pointer / scroll.
// Shared by the home hero (auto, lazy) and the About page's 3D toggle (crest3d.js). Three.js is only fetched when it is needed.
(() => {
  const loadThree = () => window.THREE ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor-three.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  // Single flat plane (no stacked copies) for the About-page 3D toggle.
  async function build(T, W = 2.2) {
    const tex = await new Promise((ok) => new T.TextureLoader().load('crest3d-tex.png', ok)); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const Hh = W * 935 / 887, geo = new T.PlaneGeometry(W, Hh), N = 0, grp = new T.Group(), mats = [];
    for (let i = N; i >= 0; i--) { const m = new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .5, side: T.DoubleSide, color: i ? new T.Color().setHSL(.1, .55, .1 + .02 * (N - i)) : 0xffffff }); mats.push(m); const p = new T.Mesh(geo, m); p.position.z = -i * .016 * (W / 2.6); grp.add(p); }
    return { group: grp, dispose: () => { geo.dispose(); mats.forEach((m) => m.dispose()); tex.dispose(); } };
  }
  window.PhoenixCrest3D = { loadThree, build };
  // ---- home hero: swap the flat crest for the live 3D one (pointer tilt, scroll spin, idle sway) ----
  return; // home hero keeps the flat crest with the site's own tilt, exactly like Norex
  const wrap = document.querySelector('.crestwrap'); if (!wrap) return;
  const H = document.documentElement; const calm = () => H.dataset.motion === 'calm' || H.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm() || /[?&]still/.test(location.search)) return;
  const go = async () => {
    try {
      await loadThree(); const T = window.THREE; const r = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); const cv = r.domElement; cv.className = 'pf3d'; wrap.appendChild(cv);
      const sc = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, .1, 50); cam.position.z = 6.4; const { group } = await build(T, 2.5); sc.add(group);
      const sz = () => { const w = wrap.clientWidth, h = wrap.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }; sz(); addEventListener('resize', sz);
      const st = { tx: 0, ty: 0, x: 0, y: 0, spin: 0 }; let vis = true, sy = scrollY;
      addEventListener('pointermove', (e) => { const b = wrap.getBoundingClientRect(); st.ty = Math.max(-1, Math.min(1, (e.clientX - b.left) / b.width - .5)) * .8; st.tx = Math.max(-1, Math.min(1, (e.clientY - b.top) / b.height - .5)) * .45; }, { passive: true });
      addEventListener('scroll', () => { st.spin += (scrollY - sy) * .003; sy = scrollY; }, { passive: true });
      new IntersectionObserver((e) => { vis = e[0].isIntersecting; if (vis) tick(); }).observe(wrap);
      let raf = 0, last = 0; const tick = (t = 0) => { if (raf) return; raf = requestAnimationFrame((tt) => { raf = 0; if (!vis || document.hidden) return; tick(); if (tt - last < 30) return; last = tt;
        st.spin *= .93; st.x += (st.tx - st.x) * .08; st.y += (st.ty - st.y) * .08; group.rotation.set(st.x + Math.sin(tt / 2600) * .04, st.y + Math.sin(tt / 2100) * .16 + st.spin, 0); r.render(sc, cam); }); };
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cv.remove(); wrap.classList.remove('is3d'); });
      wrap.classList.add('is3d'); tick();
    } catch (e) { /* the flat crest stays */ }
  };
  (window.requestIdleCallback || setTimeout)(go, { timeout: 1200 });
})();
