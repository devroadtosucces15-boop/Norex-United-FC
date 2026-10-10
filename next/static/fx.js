// NOREX fx: menus that follow you (orb / island / rail), page transitions (curtain, iris, shutter, card zoom, pitch lines, doors) and micro-interactions.
(() => {
  const d = document, H = d.documentElement, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const N = window.NOREX || {}, NAV = N.nav || [];
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches, still = /[?&]still/.test(location.search);
  const ls = { get: (k, f) => { try { return localStorage.getItem(k) ?? f; } catch { return f; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} }, del: (k) => { try { sessionStorage.removeItem(k); } catch {} } };
  const calm = () => (window.NorexMotion ? NorexMotion.mode !== 'full' : RM || still);
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

  // ================= page transitions: one per main section =================
  // Club + every sub-menu move: ribbon wipe + crest stamp · Matches: floodlights · Stats: data sweep · Tactics: pitch lines · Hub: locker doors.
  // Three phases. COVER (on click, ~0.35s, transform/opacity only, built two frames before it moves so the first frame is smooth).
  // HOLD (the new page is painted under a matching static cover by the head script). REVEAL (waits until fonts, the canvas
  // and the images on screen are decoded, then the cover fades and the page settles into place). Calm = short fade, Off = none.
  const E = 'cubic-bezier(.2,.8,.2,1)', EIO = 'cubic-bezier(.65,0,.35,1)';
  const mmode = () => (window.NorexMotion ? NorexMotion.mode : (RM || still ? 'calm' : 'full'));
  const crestHTML = '<img class="fxc" src="crest.png" alt="" style="position:absolute;left:50%;top:50%;width:min(120px,26vw);translate:-50% -50%;filter:drop-shadow(0 0 26px rgba(239,207,122,.75))">';
  let tov = null, busy = false;
  const ov = () => tov || (tov = (() => { const e = d.createElement('div'); e.id = 'fxov'; e.setAttribute('aria-hidden', 'true'); d.body.appendChild(e); return e; })());
  const mk = (css, html = '', parent = ov()) => { const e = d.createElement('div'); Object.assign(e.style, { position: 'absolute', willChange: 'transform,opacity' }, css); e.innerHTML = html; parent.appendChild(e); return e; };
  const run = (el, kf, o) => { try { return el.animate(kf, { fill: 'forwards', easing: E, ...o }).finished.catch(() => {}); } catch { return Promise.resolve(); } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); });
  const PITCH = '<svg viewBox="0 0 68 105" preserveAspectRatio="xMidYMid meet" style="position:absolute;inset:6%;width:88%;height:88%"><g fill="none" stroke="#fff" stroke-width=".5" stroke-linecap="round"><rect x="2" y="2" width="64" height="101" class="ln"/><line x1="2" y1="52.5" x2="66" y2="52.5" class="ln"/><circle cx="34" cy="52.5" r="9.15" class="ln"/><rect x="13.8" y="2" width="40.3" height="16.5" class="ln"/><rect x="13.8" y="86.5" width="40.3" height="16.5" class="ln"/><rect x="24.8" y="2" width="18.3" height="5.5" class="ln"/><rect x="24.8" y="97.5" width="18.3" height="5.5" class="ln"/><circle cx="34" cy="52.5" r=".8" class="ln"/></g></svg>';
  const BARS = 8;
  // each scene: build(final) -> parts; cover(parts) animates in from nothing; reveal(parts) animates out. build(true) = already covering.
  const FX = {
    ribbon: {
      build(full) { const band = mk({ left: '-15%', right: '-15%', top: 0, bottom: 0, background: 'linear-gradient(100deg,#7e1d17 0%,#c8352c 55%,#d9473d 80%,#efcf7a 92%,#fff3c9 100%)', transform: full ? 'skewX(-10deg)' : 'translateX(-125%) skewX(-10deg)', boxShadow: '0 0 80px rgba(0,0,0,.6)' });
        const c = mk({ inset: 0, opacity: full ? 1 : 0, transform: full ? 'none' : 'scale(1.5)' }, crestHTML); return { band, c }; },
      cover: ({ band, c }) => Promise.all([run(band, [{ transform: 'translateX(-125%) skewX(-10deg)' }, { transform: 'skewX(-10deg)' }], { duration: 380 }), run(c, [{ opacity: 0, transform: 'scale(1.5)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 170, easing: 'cubic-bezier(.34,1.56,.64,1)' })]),
      reveal: ({ band, c }) => Promise.all([run(c, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.86) translateY(-12px)' }], { duration: 240 }), run(band, [{ opacity: 1, transform: 'skewX(-10deg)' }, { opacity: 0, transform: 'skewX(-10deg) scale(1.04)' }], { duration: 460, delay: 80, easing: EIO })]),
    },
    flood: {
      build(full) { const base = mk({ inset: 0, background: 'radial-gradient(120% 80% at 50% 0%,#18233a 0%,#070a10 60%)', opacity: full ? 1 : 0 });
        const beam = (side) => mk({ top: '-20%', [side]: '-25%', width: '90%', height: '140%', background: `conic-gradient(from ${side === 'left' ? 140 : 190}deg at ${side === 'left' ? '20% 0%' : '80% 0%'},transparent 0deg,rgba(255,250,225,.42) 14deg,rgba(255,250,225,.08) 30deg,transparent 40deg)`, opacity: full ? 1 : 0, transformOrigin: side === 'left' ? '20% 0%' : '80% 0%', transform: full ? 'none' : 'scaleY(.4)' }, '', base);
        const L = beam('left'), R = beam('right'); const c = mk({ inset: 0, opacity: full ? 1 : 0 }, crestHTML, base); return { base, L, R, c }; },
      cover: ({ base, L, R, c }) => run(base, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 }).then(() => Promise.all([L, R].map((b, i) => run(b, [{ opacity: 0, transform: 'scaleY(.4)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: i * 70 })).concat(run(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 90 })))),
      reveal: ({ base, L, R, c }) => Promise.all([run(L, [{ filter: 'brightness(1)' }, { filter: 'brightness(2.2)', opacity: 0 }], { duration: 420 }), run(R, [{ filter: 'brightness(1)' }, { filter: 'brightness(2.2)', opacity: 0 }], { duration: 420 }), run(c, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.1)' }], { duration: 260 }), run(base, [{ opacity: 1 }, { opacity: 0 }], { duration: 460, delay: 120, easing: EIO })]),
    },
    sweep: {
      build(full) { const box = mk({ inset: 0 }); const bars = Array.from({ length: BARS }, (_, i) => mk({ left: (i * 100 / BARS) + '%', width: (100 / BARS + .3) + '%', top: 0, bottom: 0, background: i % 2 ? 'linear-gradient(180deg,#efcf7a,#a97b22)' : 'linear-gradient(180deg,#d9473d,#7e1d17)', transformOrigin: '50% 100%', transform: full ? 'none' : 'scaleY(0)' }, '', box));
        const c = mk({ inset: 0, opacity: full ? 1 : 0 }, crestHTML, box); return { box, bars, c }; },
      cover: ({ bars, c }) => Promise.all(bars.map((b, i) => run(b, [{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: 300, delay: [3, 1, 5, 0, 6, 2, 7, 4][i] * 22 })).concat(run(c, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: 200 }))),
      reveal: ({ box, bars, c }) => Promise.all([run(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }), ...bars.map((b, i) => run(b, [{ transform: 'none', opacity: 1 }, { transform: 'scaleY(0)', opacity: .4 }], { duration: 420, delay: 60 + i * 26, easing: EIO })).map((p) => p)]).then(() => box.remove()),
    },
    pitch: {
      build(full) { const base = mk({ inset: 0, background: 'repeating-linear-gradient(180deg,#0f3a24 0 9%,#0c3220 9% 18%)', opacity: full ? 1 : 0 }, PITCH);
        $$('.ln', base).forEach((l) => { l.setAttribute('pathLength', 1); l.style.strokeDasharray = 1; l.style.strokeDashoffset = full ? 0 : 1; }); const c = mk({ inset: 0, opacity: full ? 1 : 0 }, crestHTML, base); return { base, c }; },
      cover: ({ base, c }) => run(base, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 }).then(() => Promise.all($$('.ln', base).map((l, i) => run(l, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 300, delay: i * 12, easing: 'ease-out' })).concat(run(c, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 140 })))),
      reveal: ({ base, c }) => Promise.all([run(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 220 }), run(base, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.08)' }], { duration: 520, delay: 60, easing: EIO })]),
    },
    locker: {
      build(full) { const stage = mk({ inset: 0, perspective: '1600px', background: full ? '#0b0f16' : 'transparent' });
        const door = (side) => mk({ top: 0, bottom: 0, [side]: 0, width: '50.4%', transformOrigin: side === 'left' ? '0% 50%' : '100% 50%', transform: full ? 'none' : `rotateY(${side === 'left' ? -96 : 96}deg)`, background: `linear-gradient(${side === 'left' ? 90 : 270}deg,#8a6216,#c99a3a 40%,#efcf7a 85%,#f7e3a6)`, boxShadow: 'inset 0 0 60px rgba(0,0,0,.35)', backfaceVisibility: 'hidden' },
          `<i style="position:absolute;${side === 'left' ? 'right' : 'left'}:7%;top:46%;width:10px;height:72px;border-radius:6px;background:#5a3f0d;box-shadow:0 2px 0 rgba(255,255,255,.3)"></i>${[18, 26, 34].map((t) => `<i style="position:absolute;left:18%;right:18%;top:${t}%;height:6px;border-radius:3px;background:rgba(70,48,10,.55)"></i>`).join('')}`, stage);
        const L = door('left'), R = door('right'); const c = mk({ inset: 0, opacity: full ? 1 : 0 }, crestHTML, stage); return { stage, L, R, c }; },
      cover: ({ L, R, c }) => Promise.all([run(L, [{ transform: 'rotateY(-96deg)' }, { transform: 'none' }], { duration: 380 }), run(R, [{ transform: 'rotateY(96deg)' }, { transform: 'none' }], { duration: 380 }), run(c, [{ opacity: 0, transform: 'rotate(-90deg) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 220, easing: 'cubic-bezier(.34,1.56,.64,1)' })]),
      reveal: ({ stage, L, R, c }) => { stage.style.background = 'transparent'; return Promise.all([run(c, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'rotate(90deg) scale(.8)' }], { duration: 240 }), run(L, [{ transform: 'none', opacity: 1 }, { transform: 'rotateY(-100deg)', opacity: 0 }], { duration: 620, delay: 120, easing: EIO }), run(R, [{ transform: 'none', opacity: 1 }, { transform: 'rotateY(100deg)', opacity: 0 }], { duration: 620, delay: 120, easing: EIO })]); },
    },
    fade: {
      build(full) { const base = mk({ inset: 0, background: '#0b0f16', opacity: full ? 1 : 0 }, crestHTML); return { base }; },
      cover: ({ base }) => run(base, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 }),
      reveal: ({ base }) => run(base, [{ opacity: 1 }, { opacity: 0 }], { duration: 260 }),
    },
  };
  const SECTION = (u) => (/^(index|squad|halloffame|join|scouting|player-)/.test(u) || !u ? 'club' : /^(fixtures|results|opponents|match-)/.test(u) ? 'matches' : /^(stats|leaders|players)/.test(u) ? 'stats' : /^(tactics|playstyle|studio|builds|updates)/.test(u) ? 'tactics' : /^(hub|staff)/.test(u) ? 'hub' : 'club');
  const KIND = { club: 'ribbon', matches: 'flood', stats: 'sweep', tactics: 'pitch', hub: 'locker' };
  const here = () => SECTION(location.pathname.split('/').pop());
  function pick(a) { if (mmode() !== 'full') return 'fade'; const dest = SECTION((a.getAttribute('href') || '').split('#')[0].split('?')[0]); return dest === here() ? 'ribbon' : KIND[dest]; }
  const cinematic = () => ['full', 'short'].includes(ls.get('norex.entrance', 'skip'));
  const internal = (a) => { if (!a || a.target || a.hasAttribute('download') || (a.dataset.hub !== undefined && cinematic())) return false; const h = a.getAttribute('href'); if (!h || h[0] === '#' || /^(mailto:|tel:|javascript:)/.test(h)) return false; try { const u = new URL(a.href, location.href); return u.origin === location.origin && u.pathname !== location.pathname && /\.html$|\/$/.test(u.pathname); } catch { return false; } };
  async function go(a) {
    if (busy) return; busy = true; const kind = pick(a), href = a.href;
    ss.set('norex.t', JSON.stringify({ kind, t: Date.now() })); H.classList.add('fx-busy');
    const guard = setTimeout(() => location.assign(href), 1400);
    try { const fx = FX[kind], parts = fx.build(false); await frames(2); await fx.cover(parts); } catch {}
    clearTimeout(guard); location.assign(href);
  }
  d.addEventListener('click', (e) => {
    if (mmode() === 'off' || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a'); if (!internal(a)) return;
    // shared-element morph: a player card grows into its profile, a result card into its match page (native View Transitions where supported)
    const vt = a.matches('.pc-card[href^="player-"],.pc-hero') ? 'pcard' : a.matches('.rcard,.rrow') ? 'mcard' : '';
    if (vt && 'onpageswap' in window && mmode() === 'full' && !a.closest('[data-no-vt]')) { a.style.viewTransitionName = vt; ss.set('norex.vt', vt); return; }
    e.preventDefault(); go(a);
  });
  // "fully rendered": fonts ready, and every image in the first screen decoded (capped so a slow image never traps the user)
  const painted = () => Promise.race([Promise.all([d.fonts?.ready, ...[...d.images].filter((i) => { const r = i.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.width; }).slice(0, 12).map((i) => (i.complete ? i.decode?.().catch(() => {}) : new Promise((ok) => { i.onload = i.onerror = ok; })))]), sleep(1100)]);
  async function arrive() {
    let t = null; try { t = JSON.parse(ss.get('norex.t') || 'null'); } catch {} ss.del('norex.t');
    const done = () => { H.removeAttribute('data-tin'); dispatchEvent(new Event('norex:arrived')); };
    if (!t || !FX[t.kind] || mmode() === 'off' || Date.now() - (t.t || 0) > 8000) return done();
    const fx = FX[t.kind]; let parts; try { parts = fx.build(true); } catch { return done(); }
    await painted(); await frames(2);                       // DOM cover (incl. its crest) is decoded under the CSS cover
    H.removeAttribute('data-tin');
    const main = d.getElementById('main');
    if (main && mmode() === 'full') run(main, [{ opacity: .4, transform: 'translate3d(0,18px,0) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 620, easing: E, fill: 'none' });
    dispatchEvent(new Event('norex:arrived'));
    try { await Promise.race([fx.reveal(parts), sleep(1300)]); } catch {}
    if (tov) tov.innerHTML = '';
  }
  addEventListener('pageshow', (e) => { if (e.persisted) { busy = false; H.classList.remove('fx-busy'); if (tov) tov.innerHTML = ''; H.removeAttribute('data-tin'); } });
  setTimeout(() => H.removeAttribute('data-tin'), 3000);

  // ================= micro-interactions =================
  const SELI = 'a.btn,button.btn,.chip,.keybtn,.pick,.tabbar a,.fan a,.il a,.sub a';
  d.addEventListener('pointerdown', (e) => {
    if (calm()) return; const t = e.target.closest(SELI); if (!t) return;
    const r = t.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, i = d.createElement('span'); i.className = 'fx-rip'; Object.assign(i.style, { width: s + 'px', height: s + 'px', left: e.clientX - r.left - s / 2 + 'px', top: e.clientY - r.top - s / 2 + 'px' });
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative'; t.style.overflow = t.style.overflow || 'hidden'; t.appendChild(i); setTimeout(() => i.remove(), 800);
  });
  function burst(x, y, n = 12) { const cols = ['#efcf7a', '#c8352c', '#fff', '#ff8a7a']; for (let i = 0; i < n; i++) { const p = d.createElement('i'), a = Math.random() * 6.28, dist = 30 + Math.random() * 70, sz = 3 + Math.random() * 6; Object.assign(p.style, { position: 'fixed', left: x + 'px', top: y + 'px', width: sz + 'px', height: sz + 'px', borderRadius: Math.random() > .5 ? '50%' : '2px', background: cols[i % 4], boxShadow: '0 0 8px currentColor', pointerEvents: 'none', zIndex: 9998 }); d.body.appendChild(p); try { p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist + 26}px) rotate(${Math.random() * 360}deg) scale(0)`, opacity: 0 }], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.1,.8,.3,1)' }); } catch {} setTimeout(() => p.remove(), 950); } }
  d.addEventListener('click', (e) => { if (calm()) return; if (e.target.closest('.btn,.chip,.keybtn,.pick,.pc-card,.fan a,.ob,.ib,.flip,.dk,.cmpbtn')) burst(e.clientX, e.clientY, e.target.closest('.btn.gold,.keybtn,.chip.gold') ? 18 : 10); });
  // spotlight follows the cursor over panels, tiles and cards
  d.addEventListener('pointermove', (e) => { const t = e.target.closest('.panel,.sbt,.tile,.wx .tr,.fw'); if (!t || e.pointerType !== 'mouse') return; const r = t.getBoundingClientRect(); t.style.setProperty('--mx', e.clientX - r.left + 'px'); t.style.setProperty('--my', e.clientY - r.top + 'px'); }, { passive: true });
  // magnetic buttons
  d.addEventListener('pointermove', (e) => { if (calm() || e.pointerType !== 'mouse') return; const b = e.target.closest('.btn,.keybtn'); if (!b) return; const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; b._m = 1; }, { passive: true });
  d.addEventListener('pointerout', (e) => { const b = e.target.closest && e.target.closest('.btn,.keybtn'); if (b && b._m && !b.contains(e.relatedTarget)) { b.style.transform = ''; b._m = 0; } });
  // text scramble on names in leaderboards
  d.addEventListener('pointerover', (e) => { if (calm()) return; const t = e.target.closest('.wx .tr .nm b,.pc-row b,.wx .md em,.wx .pd .who b'); if (!t || t._s || e.pointerType !== 'mouse') return; const txt = t.dataset.t || (t.dataset.t = t.textContent), ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'; t._s = 1; const t0 = performance.now(); const f = (n) => { const k = (n - t0) / 520; t.textContent = [...txt].map((c, i) => (i / txt.length < k || c === ' ' ? c : ch[Math.floor(Math.random() * ch.length)])).join(''); if (k < 1) requestAnimationFrame(f); else { t.textContent = txt; t._s = 0; } }; f(t0); });

  const start = () => { buildNav(); arrive(); };
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', start) : start();
  window.NorexFx = { burst, go: (href) => go({ href: new URL(href, location.href).href, getAttribute: () => href }) };
// native cross-document transition: only animate when a shared-element click set the flag
addEventListener('pageswap', (e) => { if (!e.viewTransition) return; if (!ss.get('norex.vt')) e.viewTransition.skipTransition(); });
addEventListener('pagereveal', (e) => { if (!e.viewTransition) return; if (!ss.get('norex.vt')) { e.viewTransition.skipTransition(); return; } ss.del('norex.vt'); });
})();
