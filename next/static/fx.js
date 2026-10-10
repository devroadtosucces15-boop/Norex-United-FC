// NOREX fx: menus that follow you (orb / island / rail), page transitions (curtain, iris, shutter, card zoom, pitch lines, doors) and micro-interactions.
(() => {
  const d = document, H = d.documentElement, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const N = window.NOREX || {}, NAV = N.nav || [];
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches, still = /[?&]still/.test(location.search);
  const ls = { get: (k, f) => { try { return localStorage.getItem(k) ?? f; } catch { return f; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} }, del: (k) => { try { sessionStorage.removeItem(k); } catch {} } };
  const calm = RM || still || ls.get('norex.fx') === 'off';
  const ico = (n) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(window.NOREX_ICONS || {})[n] || ''}</svg>`;

  // ================= menus that follow you =================
  const mode = () => ls.get('norex.nav', 'orb');
  function buildNav() {
    if (!NAV.length || $('#fxnav')) return;
    const w = d.createElement('div'); w.id = 'fxnav';
    const cur = NAV.find((g) => g.k === N.group);
    w.innerHTML = `<div class="fx-orb"><button class="ob" type="button" aria-label="Menu" aria-expanded="false"><img src="crest.png" alt=""></button><div class="fan">${NAV.map((g, k) => `<a href="${g.href}" style="--k:${k}" class="${g.k === N.group ? 'on' : ''}">${g.l}</a>`).join('')}<a href="hub.html" data-hub class="hubk" style="--k:${NAV.length}">Hub</a></div></div>
<div class="fx-isl"><button class="ib" type="button" aria-expanded="false"><span class="cur">${cur ? cur.l : 'NOREX'} · ${N.title || ''}</span><i class="bar"><u></u></i></button><div class="il"><div class="r1">${NAV.map((g) => `<a href="${g.href}" class="${g.k === N.group ? 'on' : ''}">${g.l}</a>`).join('')}<a href="hub.html" data-hub class="hubk">Hub</a></div>${cur ? `<div class="r2">${cur.subs.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</div>` : ''}</div></div>
<div class="fx-rail"></div>`;
    d.body.appendChild(w);
    const orb = $('.fx-orb', w), isl = $('.fx-isl', w), rail = $('.fx-rail', w);
    $('.ob', orb).onclick = () => { const o = orb.classList.toggle('open'); $('.ob', orb).setAttribute('aria-expanded', o); };
    $('.ib', isl).onclick = () => isl.classList.add('open');
    d.addEventListener('click', (e) => { if (!orb.contains(e.target)) orb.classList.remove('open'); if (!isl.contains(e.target)) isl.classList.remove('open'); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') { orb.classList.remove('open'); isl.classList.remove('open'); } });
    // rail dots from the page's own sections
    const secs = $$('main .sec').filter((s) => $('h2,.ribbon', s));
    if (secs.length >= 3) { rail.innerHTML = secs.map((s, i) => { const t = ($('h2,.ribbon', s).textContent || '').trim().slice(0, 22); s.id = s.id || 'sec' + i; return `<a href="#${s.id}" data-s="${s.id}"><i></i><span>${t}</span></a>`; }).join('') + '<u></u>'; } else rail.dataset.empty = '1';
    const bar = $('.bar'), sub = $('.sub');
    const upd = () => {
      if (innerWidth <= 820) { H.classList.remove('fx-away'); return; }
      const y = scrollY, past = y > 280; H.classList.toggle('fx-away', past);
      const h = d.documentElement.scrollHeight - innerHeight, p = h > 0 ? Math.min(1, y / h) : 0;
      $('.bar u', isl).style.width = p * 100 + '%'; const ru = $('u', rail); if (ru) ru.style.background = `linear-gradient(#efcf7a ${p * 100}%,rgba(255,255,255,.14) ${p * 100}%)`;
      let c = null; secs.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * .4) c = s; }); $$('a', rail).forEach((a) => a.classList.toggle('on', c && a.dataset.s === c.id));
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    H.dataset.nav = mode();
  }

  // ================= page transitions =================
  const E = 'cubic-bezier(.7,0,.2,1)';
  const crest = '<img src="crest.png" alt="" style="width:110px;filter:drop-shadow(0 0 24px rgba(239,207,122,.8))">';
  let tov = null, busy = false;
  const ov = () => tov || (tov = (() => { const e = d.createElement('div'); e.id = 'fxov'; e.setAttribute('aria-hidden', 'true'); d.body.appendChild(e); return e; })());
  const mk = (css, html = '') => { const e = d.createElement('div'); Object.assign(e.style, { position: 'absolute' }, css); e.innerHTML = html; ov().appendChild(e); return e; };
  const run = (el, kf, o) => { try { return el.animate(kf, { fill: 'forwards', easing: E, ...o }).finished.catch(() => {}); } catch { return Promise.resolve(); } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // each effect: cover(x,y,src) -> covers the screen; reveal(x,y) -> uncovers. State between pages is carried in sessionStorage.
  const FX = {
    curtain: {
      cover: () => { const c = mk({ inset: 0, background: 'linear-gradient(90deg,#8d231c,#c8352c 82%,#efcf7a 96%,#fff)', boxShadow: '0 0 60px rgba(0,0,0,.6)', display: 'grid', placeItems: 'center' }, crest); return run(c, [{ transform: 'translateX(-101%)' }, { transform: 'none' }], { duration: 480 }); },
      still: () => mk({ inset: 0, background: 'linear-gradient(90deg,#8d231c,#c8352c 82%,#efcf7a 96%,#fff)', display: 'grid', placeItems: 'center' }, crest),
      reveal: (c) => run(c, [{ transform: 'none' }, { transform: 'translateX(101%)' }], { duration: 560 }),
    },
    iris: {
      cover: (x, y) => { const R = Math.hypot(innerWidth, innerHeight), c = mk({ inset: 0, background: '#0b0f16', display: 'grid', placeItems: 'center' }, crest); return run(c, [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)` }], { duration: 520 }); },
      still: () => mk({ inset: 0, background: '#0b0f16', display: 'grid', placeItems: 'center' }, crest),
      reveal: (c, x, y) => { const R = Math.hypot(innerWidth, innerHeight); return run(c, [{ clipPath: `circle(${R}px at 50% 50%)` }, { clipPath: 'circle(0px at 50% 50%)' }], { duration: 600 }); },
    },
    shutter: {
      mkb: () => Array.from({ length: 10 }, (_, i) => mk({ left: i * 10 + '%', width: '10.2%', top: 0, bottom: 0, background: i % 2 ? '#c8352c' : '#12192a', borderRight: '1px solid rgba(239,207,122,.5)' })),
      cover() { const bs = this.mkb(); return Promise.all(bs.map((b, i) => run(b, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 340, delay: i * 30 }))); },
      still() { return this.mkb(); },
      reveal(bs) { return Promise.all(bs.map((b, i) => run(b, [{ transform: 'scaleY(1)', transformOrigin: 'bottom' }, { transform: 'scaleY(0)', transformOrigin: 'bottom' }], { duration: 360, delay: (9 - i) * 30 }))); },
    },
    zoom: {
      cover: (x, y, r) => { const c = mk({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '24px', background: 'linear-gradient(135deg,#efcf7a,#c8352c)', display: 'grid', placeItems: 'center', overflow: 'hidden' }, crest); return run(c, [{ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '24px' }, { left: 0, top: 0, width: innerWidth + 'px', height: innerHeight + 'px', borderRadius: '0px' }], { duration: 520 }); },
      still: () => mk({ inset: 0, background: 'linear-gradient(135deg,#efcf7a,#c8352c)', display: 'grid', placeItems: 'center' }, crest),
      reveal: (c) => run(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 560, easing: 'ease' }),
    },
    lines: {
      pit: () => `<svg viewBox="0 0 105 68" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%"><g fill="none" stroke="#fff" stroke-width=".4"><rect x="2" y="2" width="101" height="64" class="ln"/><line x1="52.5" y1="2" x2="52.5" y2="66" class="ln"/><circle cx="52.5" cy="34" r="9.15" class="ln"/><rect x="2" y="13.8" width="16.5" height="40.3" class="ln"/><rect x="86.5" y="13.8" width="16.5" height="40.3" class="ln"/><rect x="2" y="24.8" width="5.5" height="18.3" class="ln"/><rect x="97.5" y="24.8" width="5.5" height="18.3" class="ln"/></g></svg>`,
      cover() { const c = mk({ inset: 0, background: '#0a1a12' }, this.pit()); $$('.ln', c).forEach((l, i) => { l.setAttribute('pathLength', 1); l.style.strokeDasharray = 1; run(l, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520, delay: i * 40, easing: 'ease-out' }); }); return run(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 }).then(() => sleep(400)); },
      still() { const c = mk({ inset: 0, background: '#0a1a12' }, this.pit()); $$('.ln', c).forEach((l) => { l.setAttribute('pathLength', 1); l.style.strokeDasharray = 1; l.style.strokeDashoffset = 0; }); return c; },
      reveal: (c) => run(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 560, easing: 'ease' }),
    },
    doors: {
      mkd(side) { return mk({ top: 0, bottom: 0, [side]: 0, width: '50%', background: `linear-gradient(${side === 'left' ? '90deg' : '270deg'},#a77a22,#efcf7a 70%,#fff1c2)`, boxShadow: 'inset 0 0 40px rgba(0,0,0,.45)', [side === 'left' ? 'borderRight' : 'borderLeft']: '3px solid #6b4d12' }, `<i style="position:absolute;${side === 'left' ? 'right' : 'left'}:14px;top:50%;width:10px;height:90px;border-radius:6px;background:#6b4d12"></i>`); },
      cover() { const L = this.mkd('left'), R = this.mkd('right'); return Promise.all([run(L, [{ transform: 'translateX(-100%)' }, { transform: 'none' }], { duration: 440 }), run(R, [{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: 440 })]); },
      still() { return [this.mkd('left'), this.mkd('right')]; },
      reveal([L, R]) { return Promise.all([run(L, [{ transform: 'none' }, { transform: 'translateX(-100%)' }], { duration: 640 }), run(R, [{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: 640 })]); },
    },
  };
  const covers = { curtain: 'linear-gradient(90deg,#8d231c,#c8352c 82%,#efcf7a)', iris: '#0b0f16', shutter: 'linear-gradient(90deg,#12192a,#c8352c)', zoom: 'linear-gradient(135deg,#efcf7a,#c8352c)', lines: '#0a1a12', doors: 'linear-gradient(90deg,#a77a22,#efcf7a 50%,#a77a22)' };
  // pick an effect for a link
  function pick(a) {
    const h = a.getAttribute('href') || '';
    if (a.matches('.pc-card,.pc-row,.pd,.tw,.md') || /^player-/.test(h) || /^match-/.test(h)) return 'zoom';
    const g = (u) => (/^(index|squad|halloffame|join|scouting|player-)/.test(u) ? 'club' : /^(fixtures|results|opponents|match-)/.test(u) ? 'matches' : /^(stats|leaders|players)/.test(u) ? 'stats' : /^(tactics|playstyle|studio|builds|updates)/.test(u) ? 'tactics' : /^(hub|staff)/.test(u) ? 'hub' : '');
    const dest = g(h.split('#')[0].split('?')[0] || 'index.html');
    if (dest === 'hub') return 'doors'; if (dest === 'tactics') return 'lines'; if (dest === 'matches') return 'shutter'; if (dest === 'stats') return 'curtain';
    return 'iris';
  }
  const internal = (a) => { if (!a || a.target || a.hasAttribute('download') || a.dataset.hub !== undefined) return false; const h = a.getAttribute('href'); if (!h || h[0] === '#' || /^(mailto:|tel:|javascript:)/.test(h)) return false; try { const u = new URL(a.href, location.href); return u.origin === location.origin && u.pathname !== location.pathname && /\.html$|\/$/.test(u.pathname); } catch { return false; } };
  async function go(a, e) {
    if (busy) return; busy = true; const kind = pick(a), href = a.href, x = e.clientX || innerWidth / 2, y = e.clientY || innerHeight / 2, r = a.getBoundingClientRect();
    ss.set('norex.t', JSON.stringify({ kind, from: location.pathname })); H.classList.add('fx-busy');
    const guard = setTimeout(() => location.assign(href), 1600);
    try { await FX[kind].cover(x, y, { left: r.left, top: r.top, width: r.width, height: r.height }); } catch { /* fall through to a plain navigation */ }
    clearTimeout(guard); location.assign(href);
  }
  d.addEventListener('click', (e) => {
    if (calm || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a'); if (!internal(a)) return; e.preventDefault(); go(a, e);
  });
  // arrival: the page is already hidden behind a matching cover (set by the inline head script); uncover it
  async function arrive() {
    let t = null; try { t = JSON.parse(ss.get('norex.t') || 'null'); } catch {} ss.del('norex.t');
    if (!t || !FX[t.kind] || calm) { H.removeAttribute('data-tin'); return; }
    const fx = FX[t.kind]; let st; try { st = fx.still(); } catch { H.removeAttribute('data-tin'); return; }
    H.removeAttribute('data-tin');
    try { await Promise.race([fx.reveal(st, innerWidth / 2, innerHeight / 2), sleep(1400)]); } catch {}
    if (tov) tov.innerHTML = '';
  }
  addEventListener('pageshow', (e) => { if (e.persisted) { busy = false; H.classList.remove('fx-busy'); if (tov) tov.innerHTML = ''; H.removeAttribute('data-tin'); } });
  setTimeout(() => H.removeAttribute('data-tin'), 3000);

  // ================= micro-interactions =================
  const SELI = 'a.btn,button.btn,.chip,.keybtn,.pick,.tabbar a,.fan a,.il a,.sub a';
  d.addEventListener('pointerdown', (e) => {
    if (calm) return; const t = e.target.closest(SELI); if (!t) return;
    const r = t.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, i = d.createElement('span'); i.className = 'fx-rip'; Object.assign(i.style, { width: s + 'px', height: s + 'px', left: e.clientX - r.left - s / 2 + 'px', top: e.clientY - r.top - s / 2 + 'px' });
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative'; t.style.overflow = t.style.overflow || 'hidden'; t.appendChild(i); setTimeout(() => i.remove(), 800);
  });
  function burst(x, y, n = 12) { const cols = ['#efcf7a', '#c8352c', '#fff', '#ff8a7a']; for (let i = 0; i < n; i++) { const p = d.createElement('i'), a = Math.random() * 6.28, dist = 30 + Math.random() * 70, sz = 3 + Math.random() * 6; Object.assign(p.style, { position: 'fixed', left: x + 'px', top: y + 'px', width: sz + 'px', height: sz + 'px', borderRadius: Math.random() > .5 ? '50%' : '2px', background: cols[i % 4], boxShadow: '0 0 8px currentColor', pointerEvents: 'none', zIndex: 9998 }); d.body.appendChild(p); try { p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist + 26}px) rotate(${Math.random() * 360}deg) scale(0)`, opacity: 0 }], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.1,.8,.3,1)' }); } catch {} setTimeout(() => p.remove(), 950); } }
  d.addEventListener('click', (e) => { if (calm) return; if (e.target.closest('.btn,.chip,.keybtn,.pick,.pc-card,.fan a,.ob,.ib,.flip,.dk,.cmpbtn')) burst(e.clientX, e.clientY, e.target.closest('.btn.gold,.keybtn,.chip.gold') ? 18 : 10); });
  // spotlight follows the cursor over panels, tiles and cards
  d.addEventListener('pointermove', (e) => { const t = e.target.closest('.panel,.sbt,.tile,.wx .tr,.fw'); if (!t || e.pointerType !== 'mouse') return; const r = t.getBoundingClientRect(); t.style.setProperty('--mx', e.clientX - r.left + 'px'); t.style.setProperty('--my', e.clientY - r.top + 'px'); }, { passive: true });
  // magnetic buttons
  d.addEventListener('pointermove', (e) => { if (calm || e.pointerType !== 'mouse') return; const b = e.target.closest('.btn,.keybtn'); if (!b) return; const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; b._m = 1; }, { passive: true });
  d.addEventListener('pointerout', (e) => { const b = e.target.closest && e.target.closest('.btn,.keybtn'); if (b && b._m && !b.contains(e.relatedTarget)) { b.style.transform = ''; b._m = 0; } });
  // text scramble on names in leaderboards
  d.addEventListener('pointerover', (e) => { if (calm) return; const t = e.target.closest('.wx .tr .nm b,.pc-row b,.wx .md em,.wx .pd .who b'); if (!t || t._s || e.pointerType !== 'mouse') return; const txt = t.dataset.t || (t.dataset.t = t.textContent), ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'; t._s = 1; const t0 = performance.now(); const f = (n) => { const k = (n - t0) / 520; t.textContent = [...txt].map((c, i) => (i / txt.length < k || c === ' ' ? c : ch[Math.floor(Math.random() * ch.length)])).join(''); if (k < 1) requestAnimationFrame(f); else { t.textContent = txt; t._s = 0; } }; f(t0); });

  const start = () => { buildNav(); arrive(); };
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', start) : start();
  window.NorexFx = { burst, go: (href, kind) => go({ href, getBoundingClientRect: () => ({ left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 }), getAttribute: () => href, matches: () => false }, { clientX: innerWidth / 2, clientY: innerHeight / 2 }) };
})();
