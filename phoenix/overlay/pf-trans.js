// PHOENIX page transitions: the "Gilded Sweep". Loaded in <head> BEFORE fx.js; phoenix/build.mjs patches one line into fx.js so it calls
// window.PhoenixFX(ctx) and uses the kind map this returns. If the patch or this file is missing, the stock transitions run unchanged.
// Every menu, sub-menu, bottom-tab and in-page link already goes through fx.js's go(); this only replaces what each section looks like.
//   cover  (on click)  : three bands sweep in from the section's own side: a gold leading edge, a thin section-colour band, then the
//                        dark marble. The crest lifts out of a drawn ring and the section name rises letter by letter.
//   hold   (new page)  : the head script paints the matching static cover (phoenix.css html[data-tin^=pf]) so nothing flashes.
//   reveal (arrival)   : the marble retreats the same way, gold and colour trailing behind it, the crest dissolves upward.
// Only transform, opacity and clip-path are animated (compositor friendly).
window.PhoenixFX = (c) => {
  try {
    const { FX, mk, run, frames } = c;
    const SEC = {
      club: { dir: 'r', acc: '255,154,46', name: 'CLUB' },
      matches: { dir: 'u', acc: '70,194,138', name: 'MATCHES' },
      stats: { dir: 'l', acc: '98,168,255', name: 'STATS' },
      tactics: { dir: 'd', acc: '176,140,255', name: 'TACTICS' },
    };
    const SLANT = 18, GOLD = 'linear-gradient(100deg,#8d6212,#cf9a2a 30%,#fff3cf 50%,#f3c95c 70%,#8d6212)';
    const MARBLE = (acc) => `radial-gradient(90% 70% at 50% 38%,rgba(${acc},.2),transparent 62%),radial-gradient(70% 50% at 15% 105%,rgba(255,150,40,.12),transparent 60%),linear-gradient(180deg,#0e0a06,#050302)`;
    const EASE = 'cubic-bezier(.7,0,.2,1)', EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';
    // polygon whose slanted edge sits at X (percent along the travel axis); dir picks which side the sweep starts from
    const map = (dir, p) => (dir === 'r' ? p : dir === 'l' ? [100 - p[0], p[1]] : dir === 'd' ? [p[1], p[0]] : [p[1], 100 - p[0]]);
    const poly = (dir, pts) => 'polygon(' + pts.map((p) => map(dir, p).map((v) => v + '%').join(' ')).join(',') + ')';
    const covering = (dir, X) => poly(dir, [[0, 0], [X, 0], [X - SLANT, 100], [0, 100]]);   // area behind the edge
    const remaining = (dir, X) => poly(dir, [[X, 0], [100, 0], [100, 100], [X - SLANT, 100]]); // area still ahead of the edge
    const END = 100 + SLANT;
    const RING = '<svg viewBox="0 0 200 200" style="position:absolute;left:50%;top:50%;width:min(210px,46vw);translate:-50% -50%;overflow:visible"><defs><linearGradient id="pfrg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3cf"/><stop offset=".5" stop-color="#f3c95c"/><stop offset="1" stop-color="#e8741a"/></linearGradient></defs><circle class="pfring" cx="100" cy="100" r="92" fill="none" stroke="url(#pfrg)" stroke-width="1.6" stroke-linecap="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;transform:rotate(-90deg);transform-origin:50% 50%;filter:drop-shadow(0 0 6px rgba(255,170,60,.7))"/></svg>';
    const crest = '<img class="fxc" src="crest-sm.png" alt="" style="position:absolute;left:50%;top:50%;width:min(120px,26vw);translate:-50% -50%;filter:drop-shadow(0 0 26px rgba(239,207,122,.75))">';
    const label = (t) => `<div class="pflab" style="position:absolute;left:0;right:0;top:calc(50% + min(96px,21vw));text-align:center;font:600 13px/1 Oswald,Inter,sans-serif;letter-spacing:.5em;color:#f3c95c;text-shadow:0 0 14px rgba(255,150,40,.6);padding-left:.5em">${[...t].map((ch) => `<span style="display:inline-block;opacity:0">${ch}</span>`).join('')}</div>`;

    for (const [sec, o] of Object.entries(SEC)) {
      FX['pf' + sec] = {
        build(full) {
          const root = mk({ inset: 0, overflow: 'hidden' });
          const layer = (bg, extra = {}) => mk({ inset: 0, background: bg, clipPath: full ? covering(o.dir, END) : covering(o.dir, 0), ...extra }, '', root);
          const gold = layer(GOLD), band = layer(`linear-gradient(100deg,rgba(${o.acc},.0),rgba(${o.acc},.95) 45%,rgba(${o.acc},.0))`), dark = layer(MARBLE(o.acc));
          const mark = mk({ inset: 0, opacity: full ? 1 : 0 }, RING + crest + label(o.name), root);
          if (full) { // arriving: the static cover under us only has the crest, so the ring and the name start hidden
            const ring = mark.querySelector('.pfring'); ring.style.strokeDashoffset = 1; mark.querySelectorAll('.pflab span').forEach((s) => { s.style.opacity = 0; });
          }
          return { root, gold, band, dark, mark, o, full };
        },
        async cover(p) {
          const { gold, band, dark, mark, o } = p, to = (el, X, delay, dur) => run(el, [{ clipPath: covering(o.dir, 0) }, { clipPath: covering(o.dir, X) }], { duration: dur, delay, easing: EASE });
          const ring = mark.querySelector('.pfring'), letters = [...mark.querySelectorAll('.pflab span')], img = mark.querySelector('.fxc');
          // gold leads, the section colour follows a beat behind, the marble closes the page
          const sweep = Promise.all([to(gold, END, 0, 520), to(band, END, 45, 520), to(dark, END, 95, 470)]);
          run(mark, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 230 });
          run(img, [{ transform: 'scale(.72) translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 250, easing: 'cubic-bezier(.34,1.4,.64,1)' });
          run(ring, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520, delay: 260, easing: EASE_OUT });
          letters.forEach((s, i) => run(s, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 330 + i * 36, easing: EASE_OUT }));
          await sweep;
        },
        async reveal(p) {
          const { gold, band, dark, mark, o } = p, to = (el, delay, dur) => run(el, [{ clipPath: remaining(o.dir, 0) }, { clipPath: remaining(o.dir, END) }], { duration: dur, delay, easing: EASE });
          run(mark, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-18px) scale(1.06)' }], { duration: 340, easing: EASE_OUT });
          await Promise.all([to(dark, 60, 640), to(band, 120, 640), to(gold, 175, 640)]);
        },
      };
    }
    return { club: 'pfclub', matches: 'pfmatches', stats: 'pfstats', tactics: 'pftactics', hub: 'locker' };
  } catch (e) { console.warn('PhoenixFX', e); return null; }
};
