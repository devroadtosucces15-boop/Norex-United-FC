// NOREX widgets runtime: finds data-w hooks and brings the shared visuals to life. Respects reduced motion and ?still.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches, still = /[?&]still/.test(location.search), calm = RM || still;
  const J = (el) => { try { return JSON.parse(el.dataset.j); } catch { return null; } };
  const seen = new WeakSet(), once = (el) => (seen.has(el) ? false : (seen.add(el), true));
  const inView = (el, fn, th = .35) => { if (calm) return fn(); const o = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { o.disconnect(); fn(); } }), { threshold: th }); o.observe(el); };

  function coverflow(c) {
    const run = () => { const r = c.getBoundingClientRect(), cx = r.left + r.width / 2; $$('.ci', c).forEach((x) => { const b = x.getBoundingClientRect(), k = Math.max(-1, Math.min(1, (b.left + b.width / 2 - cx) / 320)); x.style.transform = `translateX(${-k * 70}px) rotateY(${-k * 52}deg) scale(${1 - Math.abs(k) * .22}) translateZ(${-Math.abs(k) * 90}px)`; x.style.opacity = 1 - Math.abs(k) * .45; x.style.zIndex = 10 - Math.round(Math.abs(k) * 9); }); };
    c.addEventListener('scroll', run, { passive: true }); addEventListener('resize', run);
    requestAnimationFrame(() => { c.scrollLeft = (c.scrollWidth - c.clientWidth) / 2 - 120; run(); });
    // drag to scroll with a mouse
    let down = 0, sx = 0, sl = 0, moved = 0; c.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = 1; moved = 0; sx = e.clientX; sl = c.scrollLeft; c.style.scrollSnapType = 'none'; });
    addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = 1; c.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = 0; c.style.scrollSnapType = ''; });
    c.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
  }
  function timeline(t) { $$('.dot', t).forEach((b) => b.addEventListener('click', () => { $$('.dot', t).forEach((x) => x.classList.toggle('on', x === b)); const o = $('#tlo') || t.nextElementSibling; o.textContent = b.dataset.t + ' · open'; o.href = b.dataset.h; o.classList.remove('pop'); void o.offsetWidth; o.classList.add('pop'); })); const last = $$('.dot', t).pop(); if (last) t.scrollLeft = t.scrollWidth; }
  function deck(dk) {
    let dks = $$('.dk', dk); const lay = () => dks.forEach((c, i) => { c.style.zIndex = 20 - i; c.style.transform = `translateY(${i * 12}px) scale(${1 - i * .05}) rotateZ(${i % 2 ? 1.5 : -1.5}deg)`; c.style.opacity = i > 3 ? 0 : 1; }); lay();
    dk.addEventListener('click', () => { const t = dks.shift(); t.style.transform = 'translateX(260px) rotateZ(22deg) translateY(-40px)'; t.style.opacity = 0; setTimeout(() => { dks.push(t); t.style.transition = 'none'; lay(); void t.offsetWidth; t.style.transition = ''; }, calm ? 0 : 450); lay(); });
  }
  function radar(el) {
    const R = J(el); if (!R) return; const cx = 150, cy = 150, r = 105, n = R.axes.length, col = ['#efcf7a', '#c8352c', '#6ac7ff'];
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
    let s = '<svg viewBox="0 0 300 300">'; [.25, .5, .75, 1].forEach((g) => (s += `<polygon points="${R.axes.map((_, i) => pt(i, g).join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.16)"/>`));
    R.axes.forEach((a, i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.17); s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.12)"/><text x="${lx}" y="${ly}" fill="#c3cde2" font-size="9.5" font-family="Inter" text-anchor="middle" dominant-baseline="middle">${a}</text>`; });
    R.series.forEach((p, k) => (s += `<polygon class="rs" data-k="${k}" points="${p.v.map((v, i) => pt(i, v).join(',')).join(' ')}" fill="${col[k % 3]}33" stroke="${col[k % 3]}" stroke-width="2.2" style="transform-origin:150px 150px;animation:rg 1.2s ${k * .2}s both cubic-bezier(.2,.9,.2,1);transition:opacity .3s"/>`));
    el.innerHTML = s + `</svg><div class="leg">${R.series.map((p, k) => `<button type="button" data-k="${k}" style="border-color:${col[k % 3]}">${p.n}</button>`).join('')}</div>`;
    $$('.leg button', el).forEach((b) => { const hv = (on) => $$('.rs', el).forEach((p) => (p.style.opacity = on && p.dataset.k !== b.dataset.k ? .12 : 1)); b.onmouseenter = () => hv(1); b.onmouseleave = () => hv(0); b.onclick = () => hv(1); });
  }
  function form(el) {
    const F = J(el); if (!F) return; $('.formrow', el).innerHTML = F.map((m, i) => `<a class="fo ${m.res}" href="match-${m.id}.html" style="animation-delay:${i * .08}s" title="${m.opp} ${m.gf}-${m.ga}">${m.res}</a>`).join('');
    const g = F.map((m) => m.gf - m.ga), mx = Math.max(1, ...g.map(Math.abs)), w = 600, h = 120, xs = (i) => 20 + i * (w - 40) / Math.max(1, g.length - 1), ys = (v) => h / 2 - (v / mx) * 48;
    let p = `M${xs(0)} ${ys(g[0])}`; for (let i = 1; i < g.length; i++) { const x0 = xs(i - 1), x1 = xs(i), m = (x0 + x1) / 2; p += ` C${m} ${ys(g[i - 1])} ${m} ${ys(g[i])} ${x1} ${ys(g[i])}`; }
    const id = 'wg' + Math.random().toString(36).slice(2, 6);
    $('.wave', el).innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efcf7a" stop-opacity=".4"/><stop offset="1" stop-color="#efcf7a" stop-opacity="0"/></linearGradient></defs><line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" stroke="rgba(255,255,255,.2)" stroke-dasharray="4 4"/><path class="a" fill="url(#${id})" d="${p} L${xs(g.length - 1)} ${h} L${xs(0)} ${h}Z"/><path class="l" d="${p}" style="--len:1400"/>`;
  }
  function race(box) {
    const R = J(box); if (!R) return; const tabs = box.previousElementSibling; let cur = 'goals';
    const draw = (k, first) => { const rows = R[k] || [], mx = Math.max(...rows.map((r) => r.v), 1); if (first) box.innerHTML = rows.map(() => '<div class="rr"><span></span><div class="t"><i></i></div><b></b></div>').join(''); $$('.rr', box).forEach((e, i) => { const r = rows[i]; if (!r) return; $('span', e).textContent = r.n; $('b', e).textContent = r.v; requestAnimationFrame(() => ($('i', e).style.width = (r.v / mx * 100) + '%')); }); };
    draw(cur, true);
    tabs && tabs.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', tabs).forEach((x) => x.classList.toggle('on', x === b)); draw(b.dataset.k, false); });
  }
  function digits(box) { inView(box, () => $$('.fd', box).forEach((f, j) => String(f.dataset.v).split('').forEach((dg, i) => { const s = $$('.dg span', f)[i]; setTimeout(() => (s.style.transform = `translateY(${-(+dg) * 56}px)`), calm ? 0 : j * 150 + i * 200); })), .5); }
  function count(e) { inView(e, () => { const to = +e.dataset.n, t0 = performance.now(); const tick = (t) => { const k = Math.min(1, (t - t0) / 1400); e.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && !calm) requestAnimationFrame(tick); else e.textContent = to; }; tick(t0); }, .5); }
  function init(root = d) {
    $$('[data-w=cover]', root).forEach((e) => once(e) && coverflow(e)); $$('[data-w=tl]', root).forEach((e) => once(e) && timeline(e)); $$('[data-w=deck]', root).forEach((e) => once(e) && deck(e));
    $$('[data-w=radar]', root).forEach((e) => once(e) && radar(e)); $$('[data-w=form]', root).forEach((e) => once(e) && form(e)); $$('[data-w=race]', root).forEach((e) => once(e) && race(e)); $$('[data-w=digits]', root).forEach((e) => once(e) && digits(e));
    $$('.wx .cnt', root).forEach((e) => once(e) && count(e));
    $$('.wx .flip', root).forEach((f) => once(f) && f.addEventListener('click', () => f.classList.toggle('on')));
    $$('.wx .xr > .tr', root).forEach((b) => once(b) && b.addEventListener('click', () => b.parentElement.classList.toggle('on')));
  }
  window.NorexWidgets = { init };
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', () => init()) : init();
})();
