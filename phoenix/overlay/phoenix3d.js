// Phoenix Fire 3D crest: a real relief mesh modelled in Blender from the cut-out badge (crest-mesh.bin) + the badge texture.
// Shared by the home hero (auto, lazy) and the About page's 3D toggle (crest3d.js). Three.js is only fetched when it is needed.
(() => {
  const loadThree = () => window.THREE ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor-three.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  let meshP = null;
  const loadMesh = () => meshP || (meshP = fetch('crest-mesh.bin').then((r) => r.arrayBuffer()).then((b) => { const n = new Uint32Array(b, 0, 2), vc = n[0], tc = n[1]; let o = 8;
    const pos = new Float32Array(b, o, vc * 3); o += vc * 12; const uv = new Float32Array(b, o, vc * 2); o += vc * 8; const idx = new Uint32Array(b, o, tc * 3); return { pos, uv, idx }; }));
  async function build(T, W = 2.2) {
    const { pos, uv, idx } = await loadMesh();
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(new T.BufferAttribute(idx, 1)); g.computeVertexNormals();
    const tex = await new Promise((ok) => new T.TextureLoader().load('crest3d-tex.png', ok)); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    const m = new T.MeshStandardMaterial({ map: tex, metalness: .42, roughness: .36, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .32, alphaTest: .5, side: T.DoubleSide });
    const mesh = new T.Mesh(g, m); mesh.scale.setScalar(W);
    const grp = new T.Group(); grp.add(mesh);
    const key = new T.DirectionalLight(0xfff0d0, 2.4); key.position.set(2.5, 3, 4); const rim = new T.PointLight(0xff7a18, 18, 12); rim.position.set(-3, -1, 2.5); const top = new T.PointLight(0xf3c95c, 9, 12); top.position.set(2, 3.5, 1.5);
    grp.add(key, rim, top, new T.AmbientLight(0xffe2b8, .85));
    return { group: grp, dispose: () => { g.dispose(); m.dispose(); tex.dispose(); } };
  }
  window.PhoenixCrest3D = { loadThree, build };
  // ---- home hero: swap the flat crest for the live 3D one (pointer tilt, scroll spin, idle sway) ----
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
