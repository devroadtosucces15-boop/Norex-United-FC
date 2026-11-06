// Opt-in 3D crest on every page. The footer button "3D crest" turns it on (remembered). Three.js (636 KB) is fetched only then.
// The crest on the page (home hero, club hero, About) becomes a live 3D crest; pages without one get a crest above the footer.
// Light on the GPU: stacked flat layers, pixel ratio capped at 1.5, about 30 fps, drawing pauses off screen or in a hidden tab.
(() => {
  const H = document.documentElement, ft = document.querySelector('.ft .wrap'); if (!ft) return;
  const calm = () => H.dataset.motion === 'calm' || H.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get: () => { try { return localStorage.getItem('norex.crest3d') === '1'; } catch (e) { return false; } }, set: (v) => { try { localStorage.setItem('norex.crest3d', v ? '1' : '0'); } catch (e) {} } };
  const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'ftb', textContent: '🧊 3D crest' });
  btn.setAttribute('aria-pressed', 'false'); ft.appendChild(btn);
  let R = null, extra = null;
  const load = () => window.THREE ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor-three.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const target = () => {
    const t = document.querySelector('.c3') || document.querySelector('.crestwrap');
    if (t) return { host: t, img: t.querySelector('img') };
    extra = document.createElement('div'); extra.className = 'c3 c3-foot'; extra.innerHTML = '<img class="c3-img" src="crest-lg.png" alt="">';
    const f = document.querySelector('footer.ft'); f.parentNode.insertBefore(extra, f); return { host: extra, img: extra.firstChild };
  };
  const say = (m) => { btn.title = m; btn.setAttribute('aria-label', '3D crest. ' + m); };
  const stop = () => {
    if (!R) return; R.dead = true; cancelAnimationFrame(R.raf); R.io.disconnect(); R.dispose(); R.cv.remove(); R.host.classList.remove('c3-on'); if (extra) { extra.remove(); extra = null; } R = null; btn.setAttribute('aria-pressed', 'false');
  };
  const start = async () => {
    if (R) return;
    const { host, img } = target(); if (!img) return;
    btn.disabled = true;
    try { await load(); } catch (e) { btn.disabled = false; say('3D could not load.'); return; }
    const T = window.THREE; let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch (e) { btn.disabled = false; say('This device does not support 3D.'); if (extra) { extra.remove(); extra = null; } return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    const cv = renderer.domElement; cv.className = 'c3-cv'; if (getComputedStyle(host).position === 'static') host.classList.add('c3-host');
    host.appendChild(cv); host.classList.add('c3-on');
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(32, 1, 0.1, 50);
    const tex = new T.TextureLoader().load('crest-lg.png'); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    const W = 2.2, Hh = W * 1289 / 892, group = new T.Group(); scene.add(group);
    const geo = new T.PlaneGeometry(W, Hh), layers = 7; // faux thickness: dark layers behind a bright front face
    for (let i = layers; i >= 0; i--) { const front = i === 0, m = new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: T.DoubleSide, color: front ? 0xffffff : new T.Color().setHSL(0.1, 0.5, 0.12 + 0.02 * (layers - i)) }); const p = new T.Mesh(geo, m); p.position.z = -i * 0.018; group.add(p); }
    const n = 48, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([(Math.random() - .5) * 5, (Math.random() - .5) * 5.5, -0.5 - Math.random() * 2.2], i * 3);
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3));
    const pm = new T.PointsMaterial({ color: 0xefcf7a, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false }); const pts = new T.Points(pg, pm); scene.add(pts);
    const st = { tx: 0, ty: 0, x: 0, y: 0, spin: 0 };
    const size = () => { const w = host.clientWidth || 200, h = host.clientHeight || 280; renderer.setSize(w, h, false); cam.aspect = w / h; const t = Math.tan(cam.fov * Math.PI / 360); cam.position.z = Math.max(Hh * 1.12, W * 1.12 / cam.aspect) / (2 * t); cam.updateProjectionMatrix(); };
    const onMove = (e) => { const r = host.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; st.ty = ((p.clientX - r.left) / r.width - .5) * 0.9; st.tx = ((p.clientY - r.top) / r.height - .5) * 0.5; };
    const onLeave = () => { st.tx = 0; st.ty = 0; };
    let sy = scrollY; const onScroll = () => { st.spin += (scrollY - sy) * 0.004; sy = scrollY; };
    host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave); addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', size);
    let vis = true; const io = new IntersectionObserver((e) => { vis = e[0].isIntersecting; if (vis && R && !R.raf) tick(); }); io.observe(host);
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); store.set(false); say('3D paused: the graphics card ran out of memory.'); });
    let last = 0;
    const tick = (t = 0) => {
      if (!R || R.dead) return; R.raf = 0; if (!vis || document.hidden) return;
      R.raf = requestAnimationFrame(tick); if (t - last < 33) return; last = t;
      st.spin *= 0.92; st.x += (st.tx - st.x) * 0.08; st.y += (st.ty - st.y) * 0.08;
      group.rotation.set(st.x, st.y + Math.sin(t / 2200) * 0.12 + st.spin, 0); pts.rotation.y = -(st.y + st.spin) * 0.4 + t / 20000;
      renderer.render(scene, cam);
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden && R && !R.raf) tick(); });
    R = { dead: false, raf: 0, io, cv, host, dispose: () => { removeEventListener('scroll', onScroll); removeEventListener('resize', size); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave); geo.dispose(); pg.dispose(); pm.dispose(); tex.dispose(); group.children.forEach((m) => m.material.dispose()); renderer.dispose(); renderer.forceContextLoss?.(); } };
    size(); btn.disabled = false; btn.setAttribute('aria-pressed', 'true'); say('Move your pointer over the crest, or scroll. Press again to turn 3D off.'); tick();
  };
  btn.addEventListener('click', () => { if (R) { stop(); store.set(false); say('Turn the 3D crest on.'); } else { store.set(true); start(); } });
  if (calm()) { btn.disabled = true; say('3D is off while reduced motion is on.'); } else { say('Turn the 3D crest on.'); if (store.get()) start(); }
})();
