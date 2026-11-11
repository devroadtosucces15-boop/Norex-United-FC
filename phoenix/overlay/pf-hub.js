// PHOENIX hub entrance: "The Vault". Takes over the click on the middle key (capture phase) and plays a longer, richer sequence, then hands
// over to hub.html?arrived=1 exactly like the stock entrance (same card rect, same view-transition name). When the visitor is a guest, the entrance
// is off, motion is reduced, or anything is missing, it does nothing and the stock hub.js entrance / page transition runs unchanged.
//   1 press     the key button recoils, an ember shockwave, the screen falls into a dark ember vignette, cinema bars close in
//   2 key       lifts on an arc with golden after-images, spins up to the centre; a bloom and god-rays open behind it
//   3 vault     a gilded double-door vault with the crest engraved across it rises out of the light (flash on arrival)
//   4 unlock    the key slides into the combination dial, the dial spins and snaps, the bolts retract, the room thuds
//   5 open      doors swing wide, light pours out, the camera dollies through while the member card hangs inside
//   6 card      the card lifts off its hook, swings and settles into the hub position, an ember puff and a shine; then the page takes over
// Only transform and opacity are animated (no filters, no clip-path), so it stays on the compositor.
(() => {
  try {
    const d = document, H = d.documentElement, $ = (s, r = d) => r.querySelector(s);
    const ls = { get(k, f = null) { try { return localStorage.getItem(k) ?? f; } catch { return f; } } };
    const E = { out: 'cubic-bezier(.16,1,.3,1)', io: 'cubic-bezier(.65,0,.35,1)', soft: 'cubic-bezier(.33,0,.15,1)', door: 'cubic-bezier(.22,.9,.2,1)' };
    let busy = false, anims = [], timers = [], ov = null, btnEl = null, finish = null;
    const play = (el, kf, o) => { const a = el.animate(kf, { fill: 'forwards', ...o }); anims.push(a); return a.finished.catch(() => {}); };
    const wait = (ms) => new Promise((ok) => { timers.push(setTimeout(ok, ms)); });
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const cleanup = () => {
      anims.forEach((a) => { try { a.cancel(); } catch {} }); anims = []; timers.forEach(clearTimeout); timers = [];
      ov?.remove(); ov = null; if (btnEl) { btnEl.style.visibility = ''; btnEl.classList.remove('pressing'); } busy = false; H.classList.remove('hubfx-on');
    };
    addEventListener('pagehide', cleanup); addEventListener('pageshow', (e) => { if (e.persisted) cleanup(); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && busy && finish) finish(); });

    const keyIcon = () => (window.PhoenixKeyIcon ? window.PhoenixKeyIcon() : '<svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="#efcf7a"/></svg>');
    function build(p, lw, lh) {
      const o = d.createElement('div'); o.id = 'hubfx'; o.className = 'hx'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Entering the Hub');
      const rivets = '<span class="rivets"></span>';
      const ticks = Array.from({ length: 12 }, (_, i) => `<b style="--r:${i * 30}deg"></b>`).join('');
      o.innerHTML = `<div class="fx-veil"></div><div class="hx-bloom"></div><div class="hx-rays"></div>
        <div class="hx-bar t"></div><div class="hx-bar b"></div>
        <div class="fx-cam"><div class="fx-locker hx-vault" style="width:${lw}px;height:${lh}px">
          <div class="fx-inner"><div class="fx-cone"></div><div class="hx-glow"></div><div class="fx-hook"></div><div class="fx-slot"></div><span class="fx-plate">${p ? p.n : 'NOREX'}</span></div>
          <div class="fx-door l">${rivets}<i class="hx-leaf"></i><u class="hx-sheen"></u></div>
          <div class="fx-door r">${rivets}<i class="hx-leaf"></i><u class="hx-sheen"></u></div>
          <div class="hx-bolt t"></div><div class="hx-bolt m"></div><div class="hx-bolt u"></div>
          <div class="hx-dial"><div class="hx-ring">${ticks}</div><div class="hx-pulse"></div><div class="hx-core"></div></div>
        </div></div>
        <div class="hx-flash"></div><div class="fx-key">${keyIcon()}</div><button type="button" class="fx-skip">Skip ⏭</button>`;
      d.body.appendChild(o);
      return o;
    }

    async function run(btn, me, mode) {
      busy = true; btnEl = btn; btn.classList.add('pressing'); H.classList.add('hubfx-on');
      const recent = Date.now() - +ls.get('norex.hubSeen', 0) < 12 * 3600e3, short = mode === 'short' || (mode === 'auto' && recent), S = short ? .55 : 1;
      const href = btn.getAttribute('href') || 'hub.html', target = href.includes('?') ? href : href + '?arrived=1';
      const prep = Promise.allSettled([fetch(href, { credentials: 'same-origin' }), window.NorexArt?.ready]);
      const lw = Math.min(innerWidth * .68, 400, innerHeight * .5), lh = Math.min(lw * 1.5, innerHeight * .72);
      const o = build(me.player, lw, lh); ov = o;
      let fin = false;
      finish = () => { if (fin) return; fin = true; try { localStorage.setItem('norex.hubSeen', Date.now()); } catch {} const k = $('.fx-flycard .fx-card', o); if (k) k.style.viewTransitionName = 'hubcard'; location.assign(target); };
      $('.fx-skip', o).addEventListener('click', () => finish()); o.addEventListener('click', (ev) => { if (ev.target.classList.contains('fx-veil')) finish(); });
      timers.push(setTimeout(finish, short ? 7000 : 14000)); // never strand the visitor on the overlay
      try {
        const key = $('.fx-key', o), veil = $('.fx-veil', o), bloom = $('.hx-bloom', o), rays = $('.hx-rays', o), cam = $('.fx-cam', o), vault = $('.hx-vault', o);
        const doorL = $('.fx-door.l', o), doorR = $('.fx-door.r', o), dial = $('.hx-dial', o), ring = $('.hx-ring', o), pulse = $('.hx-pulse', o), cone = $('.fx-cone', o), glow = $('.hx-glow', o), flash = $('.hx-flash', o);
        const bolts = [...o.querySelectorAll('.hx-bolt')], bars = [$('.hx-bar.t', o), $('.hx-bar.b', o)];
        const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const ks = Math.max(r.height * 1.1, 34); Object.assign(key.style, { left: cx - ks / 2 + 'px', top: cy - ks / 2 + 'px', width: ks + 'px', height: ks + 'px' });
        const cxm = innerWidth / 2, cym = innerHeight * .4, sc = Math.min(innerWidth * .3, 170) / ks;

        // 1. press: recoil, ember shockwave, vignette, cinema bars
        window.PhoenixFire?.(cx, cy);
        btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(.86)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 420 * S + 80, easing: E.out });
        btn.style.visibility = 'hidden'; key.style.opacity = 1;
        play(veil, [{ opacity: 0 }, { opacity: 1 }], { duration: 650 * S, easing: 'ease-out' });
        play(bars[0], [{ transform: 'translateY(-101%)' }, { transform: 'none' }], { duration: 700 * S, easing: E.out });
        play(bars[1], [{ transform: 'translateY(101%)' }, { transform: 'none' }], { duration: 700 * S, easing: E.out });

        // 2. the key: arc, spin, after-images; bloom + god-rays open behind it
        const dx = cxm - cx, dy = cym - cy, KD = 1150 * S;
        const path = (op) => [
          { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: op, offset: 0 },
          { transform: 'translate(0,9px) scale(.86) rotate(-8deg)', opacity: op, offset: .15 },
          { transform: `translate(${dx * .18}px,${dy * .2 - 80}px) scale(${sc * .4}) rotate(150deg)`, opacity: op, offset: .5 },
          { transform: `translate(${dx * .72}px,${dy * .78 - 24}px) scale(${sc * .85}) rotate(260deg)`, opacity: op, offset: .8 },
          { transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(340deg)`, opacity: op, offset: 1 }];
        for (let i = 1; i <= 3; i++) { // golden after-images
          const g = key.cloneNode(true); g.className = 'fx-key hx-ghost'; g.style.opacity = 0; key.after(g);
          play(g, path(.34 - i * .08).map((k, j, a) => (j === a.length - 1 ? { ...k, opacity: 0 } : k)), { duration: KD, delay: i * 65 * S, easing: E.io });
        }
        play(bloom, [{ opacity: 0, transform: 'scale(.04)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1100 * S, delay: 380 * S, easing: E.out });
        play(rays, [{ opacity: 0, transform: 'scale(1.12)' }, { opacity: .85, transform: 'scale(1)' }], { duration: 1300 * S, delay: 420 * S, easing: E.out });
        const flight = play(key, path(1), { duration: KD, easing: E.io });
        const L = vault.getBoundingClientRect(); // measured before it moves
        await flight;

        // 3. the vault rises out of the light
        play(flash, [{ opacity: 0 }, { opacity: .9, offset: .25 }, { opacity: 0 }], { duration: 640 * S, easing: 'ease-out' });
        play(vault, [{ opacity: 0, transform: 'scale(.82) translateY(46px)' }, { opacity: 1, transform: 'scale(1) translateY(0)' }], { duration: 1050 * S, easing: E.out });
        [doorL, doorR].forEach((dr, i) => play($('.hx-sheen', dr), [{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 1200 * S, delay: 260 * S + i * 120, easing: E.soft }));
        const lockX = L.left + L.width / 2, lockY = L.top + L.height / 2, dS = (L.width * .17) / ks;
        // build the card now (it hangs behind the doors) so the real artwork and kit number are ready
        const slot = $('.fx-slot', o); slot.innerHTML = window.NorexCards.cardHTML(me.player, { s: 1, link: false }).replace('class="pc pc-card', 'class="pc pc-card fx-card').replace(' tilt', '');
        const card = $('.fx-card', o); card.style.setProperty('--s', slot.clientWidth / 240);
        const cardReady = Promise.race([Promise.allSettled([window.NorexArt?.apply(slot), prep]), wait(3000)]);

        // 4. unlock: the key slides into the dial, the dial spins and snaps, bolts draw back, the room thuds
        await play(key, [{ transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(340deg)`, opacity: 1 }, { transform: `translate(${lockX - cx}px,${lockY - cy}px) scale(${dS}) rotate(450deg)`, opacity: 1, offset: .8 }, { transform: `translate(${lockX - cx}px,${lockY - cy}px) scale(${dS * .9}) rotate(450deg)`, opacity: 0 }], { duration: 780 * S, delay: 280 * S, easing: E.io });
        play(pulse, [{ opacity: .8, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.3)' }], { duration: 800 * S, easing: E.out });
        await play(ring, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(330deg)', offset: .72 }, { transform: 'rotate(296deg)' }], { duration: 1050 * S, easing: E.soft });
        play(bolts[0], [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 260 * S, easing: E.out });
        play(bolts[1], [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 260 * S, delay: 60 * S, easing: E.out });
        play(bolts[2], [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 260 * S, delay: 120 * S, easing: E.out });
        await wait(300 * S);
        play(cam, [{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,4px)' }, { transform: 'translate(5px,-3px)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(0,0)' }], { duration: 340 });
        play(dial, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.35)' }], { duration: 520 * S, easing: E.out });
        window.PhoenixFire?.(lockX, lockY, true);
        await cardReady;

        // 5. doors swing wide, light pours out, the camera dollies through
        play(cone, [{ opacity: 0 }, { opacity: 1 }], { duration: 900 * S });
        play(glow, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1200 * S, easing: E.out });
        play(rays, [{ opacity: .85 }, { opacity: 1 }], { duration: 1000 * S });
        const DD = 1500 * S;
        const open = Promise.all([
          play(doorL, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-118deg)', offset: .8 }, { transform: 'rotateY(-108deg)' }], { duration: DD, easing: E.door }),
          play(doorR, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(118deg)', offset: .8 }, { transform: 'rotateY(108deg)' }], { duration: DD, delay: 90 * S, easing: E.door })]);
        const R0 = card.getBoundingClientRect(), T = window.NorexHub.hubCardRect();
        const zoom = Math.min(3.2, Math.max(1.6, (T.w * 1.02) / R0.width));
        const camShift = { x: innerWidth / 2 - (R0.left + R0.width / 2), y: innerHeight / 2 - (R0.top + R0.height / 2) };
        await wait(520 * S);
        const dolly = play(cam, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${camShift.x * zoom * .5}px,${camShift.y * zoom * .5}px) scale(${zoom * .5 + .5})`, offset: .55 }, { transform: `translate(${camShift.x}px,${camShift.y}px) scale(${zoom})` }], { duration: 1500 * S, easing: E.io });
        await Promise.all([open, dolly]);

        // 6. the card lifts off its hook, swings, settles in the hub position
        const R = card.getBoundingClientRect();
        const fl = d.createElement('div'); fl.className = 'fx-flycard'; Object.assign(fl.style, { left: R.left + 'px', top: R.top + 'px', width: R.width + 'px', height: R.height + 'px' });
        const flc = card.cloneNode(true); flc.className = 'pc pc-card fx-card'; flc.style.cssText = `--s:${R.width / 240};width:100%;height:100%`; fl.appendChild(flc); o.appendChild(fl); card.style.visibility = 'hidden';
        await window.NorexArt?.apply(fl);
        const k = T.w / R.width, ddx = T.left - R.left + R.width * (k - 1) / 2, ddy = T.top - R.top;
        const sw = (a, t, z) => ({ transform: `translate(${ddx * t}px,${ddy * t}px) scale(${1 + (k - 1) * t + (z || 0)}) rotate(${a}deg)` });
        const SD = 2000 * S;
        play(vault, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.06)' }], { duration: SD * .8, easing: 'ease-in', delay: SD * .15 });
        play(cam, [{ opacity: 1 }, { opacity: 0 }], { duration: SD * .8, delay: SD * .2, easing: 'ease-in' });
        bars.forEach((b, i) => play(b, [{ transform: 'none' }, { transform: `translateY(${i ? 101 : -101}%)` }], { duration: SD * .5, easing: 'ease-in' }));
        play(bloom, [{ opacity: 1 }, { opacity: 0 }], { duration: SD * .9, easing: 'ease-in' }); play(rays, [{ opacity: 1 }, { opacity: 0 }], { duration: SD * .8, easing: 'ease-in' });
        at(SD * .62, () => window.PhoenixFire?.(T.left + T.w / 2, T.top + T.h * .55, true));
        fl.style.transformOrigin = '50% 0';
        await play(fl, [sw(0, 0), sw(16, .14, .01), sw(-12, .4, .035), sw(7.5, .66, .04), sw(-3.8, .86, .016), sw(1.7, .96, -.004), sw(0, 1, 0)], { duration: SD, easing: 'cubic-bezier(.4,.1,.3,1)' });
        const gl = $('.gloss i', fl); if (gl) await play(gl, [{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 800 * S, easing: E.out });
        finish();
      } catch (err) { finish(); }
    }

    addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[data-hub]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      const mode = ls.get('norex.entrance', 'skip'), me = window.NorexMe ? window.NorexMe() : { as: 'guest', player: null };
      if (mode === 'skip' || me.as === 'guest' || !me.player || innerWidth < 300 || window.NorexMotion?.reduced?.() || !window.NorexCards || !window.NorexHub?.hubCardRect) return; // stock entrance handles these
      e.preventDefault(); e.stopImmediatePropagation(); if (!busy) run(a, me, mode);
    }, true);
    window.PhoenixHub = { enter: (a) => { const me = window.NorexMe(); return run(a, me, ls.get('norex.entrance', 'full')); } };
    if (/[?&]autoenter\b/.test(location.search)) addEventListener('load', () => setTimeout(() => { const a = $('.tabbar a[data-hub]') || $('a[data-hub]'); if (a) a.click(); }, 500));
  } catch (e) { console.warn('pf-hub', e); }
})();
