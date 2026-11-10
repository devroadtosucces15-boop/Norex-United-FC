// Studio 3D pitch (Three.js): a live mirror of the chalkboard. Standees follow the draggable markers, keyframe playback included.
// Opt-in (button "🧊 3D pitch"), loads Three.js only then, ~30 fps, pauses off screen / hidden tab, pixel ratio capped at 1.5.
(() => {
  const board = document.getElementById('board'), bar = document.getElementById('kfReset')?.parentNode; if (!board || !bar) return;
  const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'chip', id: 'p3dBtn', textContent: '🧊 3D pitch' }); btn.setAttribute('aria-pressed', 'false'); bar.appendChild(btn);
  const wrap = Object.assign(document.createElement('div'), { id: 'p3d', hidden: true }); wrap.style.cssText = 'position:relative;margin-top:18px;height:min(62vw,420px);min-height:260px;border-radius:16px;overflow:hidden;border:1px solid rgba(239,207,122,.35);background:radial-gradient(120% 90% at 50% 0,#16233a,#0a0f18)';
  wrap.innerHTML = '<span style="position:absolute;left:12px;top:10px;z-index:2;font:600 11px Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9aa6bb;pointer-events:none">Live 3D · drag to turn</span><div class="p3-msg" style="position:absolute;inset:auto 0 10px 0;text-align:center;font-size:12px;color:#9aa6bb;pointer-events:none"></div>';
  board.after(wrap);
  const ls = { get: () => { try { return localStorage.getItem('norex.pitch3d') === '1'; } catch (e) { return false; } }, set: (v) => { try { localStorage.setItem('norex.pitch3d', v ? '1' : '0'); } catch (e) {} } };
  const msg = (t) => { wrap.querySelector('.p3-msg').textContent = t || ''; };
  const load = () => window.THREE ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor-three.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  let R = null;
  const stop = () => { if (!R) return; R.dead = true; cancelAnimationFrame(R.raf); R.io.disconnect(); R.mo.disconnect(); R.dispose(); R.cv.remove(); R = null; wrap.hidden = true; btn.setAttribute('aria-pressed', 'false'); };
  const label = (T, text, color) => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d'); g.font = '700 44px Inter, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(8,11,17,.72)'; const w = Math.min(244, g.measureText(text).width + 30); g.beginPath(); g.roundRect?.(128 - w / 2, 18, w, 60, 14); g.roundRect ? g.fill() : g.fillRect(128 - w / 2, 18, w, 60); g.fillStyle = color; g.fillText(text, 128, 63); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(1.9, 0.71, 1); return s; };
  let T;
  const pitchTex = (w, h, vertical) => { // pitch art drawn once into a canvas: mow stripes + the white lines (105 × 68 m)
    const c = document.createElement('canvas'), k = 1024, cw = vertical ? Math.round(k * w / h) : k, ch = vertical ? k : Math.round(k * h / w); c.width = cw; c.height = ch; const g = c.getContext('2d');
    for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? '#2f7d3a' : '#348a41'; vertical ? g.fillRect(0, ch / 14 * i, cw, ch / 14 + 1) : g.fillRect(cw / 14 * i, 0, cw / 14 + 1, ch); }
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 5; const m = 14, L = vertical ? ch : cw, Wd = vertical ? cw : ch; const px = (a, b) => (vertical ? [b, a] : [a, b]);
    const rect = (a, b, ww, hh) => { const [x, y] = px(a, b), [w2, h2] = px(ww, hh); g.strokeRect(x, y, w2, h2); };
    rect(m, m, L - 2 * m, Wd - 2 * m); { const [x1, y1] = px(L / 2, m), [x2, y2] = px(L / 2, Wd - m); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    { const [x, y] = px(L / 2, Wd / 2); g.beginPath(); g.arc(x, y, Wd * 0.135, 0, 7); g.stroke(); }
    const pa = L * 0.157, pw = Wd * 0.593; rect(m, (Wd - pw) / 2, pa, pw); rect(L - m - pa, (Wd - pw) / 2, pa, pw);
    const ga = L * 0.052, gw = Wd * 0.269; rect(m, (Wd - gw) / 2, ga, gw); rect(L - m - ga, (Wd - gw) / 2, ga, gw);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const start = async () => {
    if (R) return; btn.disabled = true; wrap.hidden = false; msg('Loading 3D…');
    try { await load(); } catch (e) { btn.disabled = false; wrap.hidden = true; return; }
    T = window.THREE; let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch (e) { btn.disabled = false; msg('This device does not support 3D.'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); const cv = renderer.domElement; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:pan-y;cursor:grab'; wrap.prepend(cv); msg('');
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(38, 1, 0.1, 200);
    scene.add(new T.AmbientLight(0xffffff, 0.9)); const sun = new T.DirectionalLight(0xffffff, 0.7); sun.position.set(4, 10, 6); scene.add(sun);
    const grp = new T.Group(); scene.add(grp); const disp = [], geoms = [];
    let key = '', pitch = null, stands = [];
    const build = (box) => { // rebuilt whenever the pitch shape / formation changes
      while (grp.children.length) { const o = grp.children.pop(); o.traverse?.((n) => { n.material?.map?.dispose?.(); n.material?.dispose?.(); }); }
      stands = []; const r = box.getBoundingClientRect(), vertical = box.dataset.orient === 'v', mk = [...box.querySelectorAll('.pc-marker')];
      const PW = 10, PH = PW * r.height / r.width; const tex = pitchTex(vertical ? 68 : 105, vertical ? 105 : 68, vertical);
      pitch = new T.Mesh(new T.PlaneGeometry(PW, PH), new T.MeshLambertMaterial({ map: tex })); pitch.rotation.x = -Math.PI / 2; grp.add(pitch);
      mk.forEach((el) => { const col = (el.style.getPropertyValue('--mc') || '#efcf7a').trim(), s = new T.Group(); const body = new T.Mesh(new T.CylinderGeometry(0.2, 0.26, 0.75, 14), new T.MeshLambertMaterial({ color: col })); body.position.y = 0.38; const head = new T.Mesh(new T.SphereGeometry(0.2, 14, 12), new T.MeshLambertMaterial({ color: 0xf2d3b3 })); head.position.y = 0.98; const base = new T.Mesh(new T.RingGeometry(0.28, 0.4, 24), new T.MeshBasicMaterial({ color: col, side: T.DoubleSide, transparent: true, opacity: 0.8 })); base.rotation.x = -Math.PI / 2; base.position.y = 0.02;
        const nm = el.querySelector('.lab')?.firstChild?.textContent || el.dataset.slot, lb = label(T, (el.dataset.slot || '') + (el.dataset.k ? ' · ' + nm.split(' ').slice(-1)[0] : ''), col); lb.position.y = 1.65; s.add(body, head, base, lb); grp.add(s); stands.push({ el, s, x: null, z: null }); });
      R.PW = PW; R.PH = PH; R.box = box; R.vertical = vertical;
    };
    const st = { yaw: 0, pitch: 0.95, dy: 0, dp: 0 }; let drag = null;
    const down = (e) => { drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, p: st.pitch }; cv.style.cursor = 'grabbing'; cv.setPointerCapture?.(e.pointerId); };
    const move = (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; st.yaw = drag.yaw - dx * 0.008; if (e.pointerType !== 'touch') st.pitch = Math.max(0.35, Math.min(1.35, drag.p + dy * 0.006)); };
    const up = () => { drag = null; cv.style.cursor = 'grab'; };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    const size = () => { const w = wrap.clientWidth, h = wrap.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }; addEventListener('resize', size);
    const calm = document.documentElement.dataset.motion === 'calm' || document.documentElement.dataset.motion === 'off';
    let vis = true; const io = new IntersectionObserver((e) => { vis = e[0].isIntersecting; if (vis && R && !R.raf) tick(); }); io.observe(wrap);
    const mo = new MutationObserver(() => { key = ''; }); mo.observe(board, { childList: true, subtree: true });
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); ls.set(false); });
    let last = 0;
    const tick = (t = 0) => {
      if (!R || R.dead) return; R.raf = 0; if (!vis || document.hidden) return; R.raf = requestAnimationFrame(tick); if (t - last < 33) return; last = t;
      const box = board.querySelector('.pitchbox'); if (!box) return;
      const k = box.dataset.orient + box.querySelectorAll('.pc-marker').length + box.clientWidth; if (k !== key) { key = k; build(box); size(); }
      stands.forEach((o) => { const x = (parseFloat(o.el.style.left) / 100 - 0.5) * R.PW, z = (parseFloat(o.el.style.top) / 100 - 0.5) * R.PH; if (o.x == null) { o.x = x; o.z = z; } o.x += (x - o.x) * 0.25; o.z += (z - o.z) * 0.25; o.s.position.set(o.x, 0, o.z); });
      const idle = calm || drag ? 0 : Math.sin(t / 3500) * 0.18; const d = Math.max(R.PW * 0.95, R.PH * 1.1) * (R.vertical ? 1.5 : 1.1);
      cam.position.set(Math.sin(st.yaw + idle) * Math.cos(st.pitch) * d, Math.sin(st.pitch) * d, Math.cos(st.yaw + idle) * Math.cos(st.pitch) * d); cam.lookAt(0, 0, 0);
      renderer.render(scene, cam);
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden && R && !R.raf) tick(); });
    R = { dead: false, raf: 0, io, mo, cv, PW: 10, PH: 6.5, dispose: () => { removeEventListener('resize', size); while (grp.children.length) { const o = grp.children.pop(); o.traverse?.((n) => { n.geometry?.dispose?.(); n.material?.map?.dispose?.(); n.material?.dispose?.(); }); } renderer.dispose(); renderer.forceContextLoss?.(); } };
    size(); btn.disabled = false; btn.setAttribute('aria-pressed', 'true'); tick();
  };
  btn.addEventListener('click', () => { if (R) { stop(); ls.set(false); } else { ls.set(true); start(); } });
  if (ls.get()) { const wait = setInterval(() => { if (board.querySelector('.pitchbox')) { clearInterval(wait); start(); } }, 300); setTimeout(() => clearInterval(wait), 8000); }
})();
