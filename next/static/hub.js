// The Hub entrance: key press -> key lifts and turns -> gold light -> gold locker -> doors open -> camera moves in -> the member's card swings on its hook and settles.
// Built on the Web Animations API so every step can be cancelled cleanly. The sequence always ends by navigating to a fully usable hub page.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s);
  const ls = { get(k, f = null) { try { return localStorage.getItem(k) ?? f; } catch { return f; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const EASE = { out: 'cubic-bezier(.2,.9,.2,1)', io: 'cubic-bezier(.65,0,.35,1)', spring: 'cubic-bezier(.34,1.56,.64,1)', in: 'cubic-bezier(.5,0,.9,.4)' };
  let running = false, anims = [], overlay = null, timers = [], btnEl = null, done = null;

  // One formula for where the card rests on the hub page, used by the entrance and by hub.html so they always match.
  function hubCardRect() {
    const hh = innerWidth <= 820 ? 58 : 68, bottom = innerWidth <= 820 ? 96 : 40, avail = innerHeight - hh - bottom;
    const s = Math.max(.72, Math.min(1.35, avail / 372)); const w = 240 * s, h = 336 * s; // 240 x 336 at s = 1
    return { s, w, h, left: (innerWidth - w) / 2, top: hh + Math.max(14, (avail - h) / 2) };
  }
  window.NorexHub = { hubCardRect };

  const play = (el, kf, o) => { const a = el.animate(kf, { fill: 'forwards', ...o }); anims.push(a); return a.finished.catch(() => {}); };
  const wait = (ms) => new Promise((ok) => { const t = setTimeout(ok, ms); timers.push(t); });
  function cleanup() {
    anims.forEach((a) => { try { a.cancel(); } catch {} }); anims = []; timers.forEach(clearTimeout); timers = [];
    overlay?.remove(); overlay = null; if (btnEl) { btnEl.style.visibility = ''; btnEl.classList.remove('pressing'); } running = false; d.documentElement.classList.remove('hubfx-on');
  }
  addEventListener('pagehide', cleanup); addEventListener('pageshow', (e) => { if (e.persisted) cleanup(); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && running) done && done(); });

  const KEY = `<svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="kg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".45" stop-color="#efcf7a"/><stop offset="1" stop-color="#a97b22"/></linearGradient></defs><g fill="url(#kg)" stroke="#fff3c4" stroke-width="1.5"><circle cx="38" cy="38" r="22"/><circle cx="38" cy="38" r="9" fill="#2a1d06" stroke="none"/><rect x="52" y="34" width="56" height="9" rx="3"/><rect x="88" y="43" width="9" height="16" rx="2"/><rect x="100" y="43" width="8" height="12" rx="2"/></g></svg>`;
  function build(p, mine) {
    const o = d.createElement('div'); o.id = 'hubfx'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Entering the Hub');
    const lw = Math.min(innerWidth * .66, 380, innerHeight * .5), lh = Math.min(lw * 1.5, innerHeight * .72);
    o.innerHTML = `<div class="fx-veil"></div><div class="fx-light"></div>
      <div class="fx-cam"><div class="fx-locker" style="width:${lw}px;height:${lh}px">
        <div class="fx-inner"><div class="fx-cone"></div><div class="fx-hook"></div><div class="fx-slot"></div><span class="fx-plate">${p ? p.n : 'NOREX'}</span></div>
        <div class="fx-door l"><i class="vent"></i><i class="vent"></i><i class="vent"></i><b class="handle"></b><span class="rivets"></span></div>
        <div class="fx-door r"><i class="vent"></i><i class="vent"></i><i class="vent"></i><b class="handle"></b><span class="rivets"></span><em class="lock"></em></div>
        <div class="fx-cap"></div></div></div>
      <div class="fx-key">${KEY}</div><button type="button" class="fx-skip">Skip ⏭</button>`;
    d.body.appendChild(o);
    return { o, lw, lh };
  }
  async function enter(btn, e) {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0)) return;       // let "open in new tab" work
    const href = btn.getAttribute('href') || 'hub.html';
    const me = window.NorexMe ? window.NorexMe() : { as: 'guest', player: null };
    if (running) { e.preventDefault?.(); return; }                                    // no duplicate sequences
    const mode = ls.get('norex.entrance', 'auto');                                  // auto | full | short | skip
    const reduced = window.NorexMotion?.reduced();
    const last = +ls.get('norex.hubSeen', 0), recent = Date.now() - last < 12 * 3600e3;
    if (mode === 'skip' || me.as === 'guest' || !me.player || innerWidth < 300) return;   // plain navigation, hub shows the sign-in state
    e.preventDefault?.(); running = true; btnEl = btn; btn.classList.add('pressing');
    d.documentElement.classList.add('hubfx-on');
    const short = mode === 'short' || (mode === 'auto' && recent);
    const target = href.includes('?') ? href : href + '?arrived=1';
    // 1. prepare everything the destination needs BEFORE the show starts: page, artwork, fonts
    const prep = Promise.allSettled([fetch(href, { credentials: 'same-origin' }), window.NorexArt?.ready]);
    const { o, lw, lh } = build(me.player, me); overlay = o;
    let finished = false;
    done = () => { if (finished) return; finished = true; ls.set('norex.hubSeen', Date.now()); const k = $('.fx-flycard .fx-card', o); if (k) k.style.viewTransitionName = 'hubcard'; location.assign(target); };
    $('.fx-skip', o).addEventListener('click', () => done()); o.addEventListener('click', (ev) => { if (ev.target.classList.contains('fx-veil')) done(); });
    const guard = setTimeout(done, (short ? 4500 : 11000)); timers.push(guard);       // never leave the user on an overlay
    try {
      await Promise.race([prep, wait(900)]);
      if (reduced) { await play($('.fx-light', o), [{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }, { opacity: 1, clipPath: 'circle(140% at 50% 50%)' }], { duration: 320, easing: EASE.out }); return done(); }
      const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const key = $('.fx-key', o), light = $('.fx-light', o), veil = $('.fx-veil', o), cam = $('.fx-cam', o), locker = $('.fx-locker', o), doorL = $('.fx-door.l', o), doorR = $('.fx-door.r', o), inner = $('.fx-inner', o), cone = $('.fx-cone', o);
      const ks = Math.max(r.height * 1.1, 34); Object.assign(key.style, { left: cx - ks / 2 + 'px', top: cy - ks / 2 + 'px', width: ks + 'px', height: ks + 'px' });
      // 2. glow and a physical recoil on the button; the key lifts off it
      btn.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(.88)', filter: 'brightness(1.5)' }, { transform: 'scale(1.07)', filter: 'brightness(1.3)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: short ? 260 : 460, easing: EASE.out });
      btn.style.visibility = 'hidden'; key.style.opacity = 1;
      play(veil, [{ opacity: 0 }, { opacity: .88 }], { duration: short ? 240 : 420, easing: 'ease-out' });
      const KD = short ? 520 : 1000, cxm = innerWidth / 2, cym = innerHeight * .42, big = Math.min(innerWidth * .34, 190), sc = big / ks;
      // key: dips with the press, lifts, spins, travels to centre and grows; light spreads from it
      const lightFrom = `circle(0px at ${cx}px ${cy}px)`;
      light.style.background = 'radial-gradient(circle at ' + cx + 'px ' + cy + 'px, #fff7d6 0, #f6dc92 14%, #d4a63f 34%, rgba(160,110,20,.85) 52%, rgba(40,26,6,.0) 75%)';
      await play(key, [{ transform: 'translate(0,0) scale(1) rotate(0deg)', filter: 'drop-shadow(0 0 6px #f6dc92)', offset: 0 }, { transform: 'translate(0,6px) scale(.9) rotate(0deg)', filter: 'drop-shadow(0 0 12px #f6dc92)', offset: .14 },
        { transform: `translate(${(cxm - cx) * .25}px,${-40 + (cym - cy) * .25}px) scale(${sc * .5}) rotate(120deg)`, filter: 'drop-shadow(0 0 28px #fff1c2)', offset: .55 }, { transform: `translate(${cxm - cx}px,${cym - cy}px) scale(${sc}) rotate(360deg)`, filter: 'drop-shadow(0 0 60px #fff6cf)', offset: 1 }], { duration: KD, easing: EASE.io });
      await play(light, [{ opacity: 1, clipPath: lightFrom }, { opacity: 1, clipPath: `circle(${Math.hypot(innerWidth, innerHeight)}px at ${cx}px ${cy}px)` }], { duration: short ? 380 : 700, easing: EASE.out });
      // 3. the light settles into a gold locker, centred; the key turns into its lock
      locker.style.setProperty('--lw', lw + 'px'); const L = locker.getBoundingClientRect();
      play(light, [{ opacity: 1 }, { opacity: .0 }], { duration: short ? 500 : 900, easing: 'ease-in-out', delay: 80 });
      play(locker, [{ opacity: 0, transform: 'scale(.82) translateY(30px)', filter: 'brightness(2.4) blur(6px)' }, { opacity: 1, transform: 'scale(1) translateY(0)', filter: 'brightness(1) blur(0)' }], { duration: short ? 520 : 900, easing: EASE.out });
      const lockX = L.left + L.width * .92, lockY = L.top + L.height * .52;
      await play(key, [{ transform: `translate(${cxm - cx}px,${cym - cy}px) scale(${sc}) rotate(360deg)` }, { transform: `translate(${lockX - cx}px,${lockY - cy}px) scale(${ks > 0 ? (L.width * .13) / ks : .4}) rotate(450deg)`, opacity: 1 }, { transform: `translate(${lockX - cx}px,${lockY - cy}px) scale(${(L.width * .13) / ks}) rotate(540deg)`, opacity: 0 }], { duration: short ? 420 : 800, easing: EASE.io });
      // 4. doors swing outward, the interior lights up
      cone.animate([{ opacity: 0 }, { opacity: 1 }], { duration: short ? 400 : 900, fill: 'forwards', delay: short ? 80 : 200 });
      const dd = short ? 620 : 1150;
      await Promise.all([play(doorL, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-114deg)', offset: .78 }, { transform: 'rotateY(-104deg)' }], { duration: dd, easing: EASE.out }), play(doorR, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(114deg)', offset: .78 }, { transform: 'rotateY(104deg)' }], { duration: dd, easing: EASE.out, delay: 90 })]);
      // 5. the card is already hanging inside; build it now so the real artwork + kit number are ready, then move the camera in
      const slot = $('.fx-slot', o); slot.innerHTML = window.NorexCards.cardHTML(me.player, { s: 1, link: false }).replace('class="pc pc-card', 'class="pc pc-card fx-card').replace(' tilt', '');
      const card = $('.fx-card', o); card.style.setProperty('--s', slot.clientWidth / 240); await window.NorexArt?.apply(slot);
      const cardRect0 = () => card.getBoundingClientRect(); const R0 = cardRect0();
      const zoom = Math.min(3.2, Math.max(1.6, (hubCardRect().w * 1.02) / R0.width));
      const camShift = { x: innerWidth / 2 - (R0.left + R0.width / 2), y: innerHeight / 2 - (R0.top + R0.height / 2) };
      await play(cam, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${camShift.x * zoom * .5}px,${camShift.y * zoom * .5}px) scale(${zoom * .5 + .5})`, offset: .6 }, { transform: `translate(${camShift.x * 1}px,${camShift.y * 1}px) scale(${zoom})` }], { duration: short ? 700 : 1300, easing: EASE.io });
      // 6. lift the card off its hook into the screen layer at its exact on-screen rect, then swing, overshoot and settle in the hub position
      const R = card.getBoundingClientRect(), T = hubCardRect();
      const fl = d.createElement('div'); fl.className = 'fx-flycard'; Object.assign(fl.style, { left: R.left + 'px', top: R.top + 'px', width: R.width + 'px', height: R.height + 'px' });
      const flc = card.cloneNode(true); flc.className = 'pc pc-card fx-card'; flc.style.cssText = `--s:${R.width / 240};width:100%;height:100%`; fl.appendChild(flc); o.appendChild(fl); card.style.visibility = 'hidden';
      await window.NorexArt?.apply(fl);
      const k = T.w / R.width, dx = T.left - R.left + R.width * (k - 1) / 2, dy = T.top - R.top;
      const sw = (a, t, o) => ({ transform: `translate(${dx * t}px,${dy * t}px) scale(${1 + (k - 1) * t + (o || 0)}) rotate(${a}deg)` });
      const SD = short ? 900 : 1900;
      play($('.fx-locker', o), [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.06)' }], { duration: SD * .8, easing: 'ease-in', delay: SD * .15 }); play(cam, [{ opacity: 1 }, { opacity: 0 }], { duration: SD * .8, delay: SD * .2, easing: 'ease-in' });
      fl.style.transformOrigin = '50% 0';
      await play(fl, [sw(0, 0), sw(15, .14), sw(-11, .4, .03), sw(7, .66, .035), sw(-3.5, .86, .015), sw(1.6, .96, -.004), sw(0, 1, 0)], { duration: SD, easing: 'cubic-bezier(.4,.1,.3,1)' });
      // 7. a traveling metallic shine, then hand over to the real hub page (same card, same place)
      const gl = $('.gloss i', fl); if (gl) await play(gl, [{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: short ? 450 : 800, easing: EASE.out });
      done();
    } catch (err) { done(); }
  }
  d.addEventListener('click', (e) => { const a = e.target.closest('a[data-hub]'); if (a) enter(a, e); });
  window.NorexHub.enter = enter;
  if (/[?&]autoenter\b/.test(location.search)) addEventListener('load', () => setTimeout(() => { const a = $('a[data-hub]'); if (a) enter(a, {}); }, 400));
})();
