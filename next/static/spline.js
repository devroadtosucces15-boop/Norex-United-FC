// Spline scenes (opt-in, lazy). Put data-spline="<scene .splinecode URL>" on any element and, when the visitor has 3D on
// (footer "3D crest" button, shared preference) and motion is not reduced, the Spline viewer loads into it. Nothing loads otherwise.
// Optional: data-spline-fallback keeps the element's own content visible underneath until the scene is ready.
(() => {
  const els = [...document.querySelectorAll('[data-spline]')]; if (!els.length) return;
  const H = document.documentElement;
  const calm = H.dataset.motion === 'calm' || H.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let on = false; try { on = localStorage.getItem('norex.crest3d') === '1'; } catch (e) {}
  if (calm || !on) return;
  const s = document.createElement('script'); s.type = 'module'; s.src = 'https://unpkg.com/@splinetool/viewer@1.9.28/build/spline-viewer.js';
  s.onload = () => els.forEach((el) => { const v = document.createElement('spline-viewer'); v.setAttribute('url', el.dataset.spline); v.setAttribute('loading-anim-type', 'spinner-small-dark'); v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'; if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; el.appendChild(v); });
  document.head.appendChild(s);
})();
