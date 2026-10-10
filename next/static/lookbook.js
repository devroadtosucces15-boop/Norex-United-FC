(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)], H = d.documentElement, LB = window.LB;
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const ls = { get: (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const still = /[?&]still/.test(location.search);
  const anim = (el, kf, o) => (RM || still) ? (el.animate(kf, { ...o, duration: 1 }), null) : el.animate(kf, o);
  const sleep = (ms) => new Promise((r) => setTimeout(r, (RM || still) ? 0 : ms));

  // ---- reveal on scroll ----
  $$('.opt,.lh,.intro').forEach((e, i) => e.classList.add('reveal-lb'));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08 });
  $$('.reveal-lb').forEach((e) => (still ? e.classList.add('in') : io.observe(e)));

  // ---- theme + pattern switchers ----
  $$('.sw').forEach((sw) => {
    const key = sw.dataset.set, saved = ls.get('lb.' + key);
    const set = (v) => { H.dataset[key] = v; $$('button', sw).forEach((b) => b.classList.toggle('on', b.dataset.v === v)); ls.set('lb.' + key, v); };
    if (saved && $(`button[data-v="${saved}"]`, sw)) set(saved);
    sw.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) set(b.dataset.v); });
  });

  // ---- picks ----
  let picks = ls.get('lb.picks', []);
  const names = {}; $$('.opt').forEach((o) => (names[o.dataset.id] = o.dataset.name));
  function paintPicks() {
    $$('.opt').forEach((o) => { const on = picks.includes(o.dataset.id); o.classList.toggle('on', on); const b = $('.pick', o); b.textContent = on ? '★ Picked' : '☆ I like this'; b.setAttribute('aria-pressed', on); });
    const t = `☆ ${picks.length} picked`; $('#pickcount').textContent = t; $('#traytxt').textContent = picks.length ? `★ ${picks.length} picked${picks.length > 5 ? ' (aim for 3–5)' : ''}` : t;
    $('#tray').classList.toggle('show', picks.length > 0);
    $('#picklist').innerHTML = picks.length ? `<ol>${picks.map((id) => `<li>${names[id]} <small>(#${id})</small> <a href="#${id}">view</a></li>`).join('')}</ol>` : '<p class="muted">Nothing starred yet.</p>';
  }
  d.addEventListener('click', (e) => { const b = e.target.closest('.pick'); if (!b) return; const id = b.closest('.opt').dataset.id; picks = picks.includes(id) ? picks.filter((x) => x !== id) : [...picks, id]; ls.set('lb.picks', picks); paintPicks(); });
  $('#clearp').onclick = () => { picks = []; ls.set('lb.picks', picks); paintPicks(); };
  $('#copyp').onclick = async () => { const txt = 'My Norex lookbook picks:\n' + picks.map((id, i) => `${i + 1}. ${names[id]} (${id})`).join('\n'); try { await navigator.clipboard.writeText(txt); $('#copied').textContent = 'Copied. Paste it into the chat.'; } catch { $('#copied').textContent = txt.replace(/\n/g, ' | '); } };
  paintPicks();

  // ---- navigation: collapse bar, three follow-you styles ----
  const secs = $$('.lsec'), bar = $('#lbbar');
  const orb = $('#orb'), isl = $('#island'), rail = $('#rail');
  H.dataset.nav = ls.get('lb.nav', 'orb');
  $$('[data-nav]').forEach((b) => b.addEventListener('click', () => { H.dataset.nav = b.dataset.nav; ls.set('lb.nav', b.dataset.nav); scrollBy({ top: 320 }); }));
  $('.ob', orb).onclick = () => { const o = orb.classList.toggle('open'); $('.ob', orb).setAttribute('aria-expanded', o); };
  $('.ib', isl).onclick = () => { isl.classList.add('open'); };
  d.addEventListener('click', (e) => { if (!orb.contains(e.target)) orb.classList.remove('open'); if (!isl.contains(e.target)) isl.classList.remove('open'); if (e.target.closest('.fan a,.il a')) { orb.classList.remove('open'); isl.classList.remove('open'); } });
  rail.addEventListener('touchstart', () => rail.classList.toggle('show'), { passive: true });
  function onScroll() {
    const y = scrollY, past = y > 260; bar.classList.toggle('gone', past); H.classList.toggle('show-nav', past);
    const h = d.documentElement.scrollHeight - innerHeight, p = Math.min(1, y / h);
    $('#ibar').style.width = (p * 100) + '%'; $('#rbar').style.background = `linear-gradient(#efcf7a ${p * 100}%,rgba(255,255,255,.12) ${p * 100}%)`;
    let cur = secs[0]; secs.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * .4) cur = s; });
    $('#icur').textContent = $('h2', cur).textContent; $$('a', rail).forEach((a) => a.classList.toggle('on', a.dataset.s === cur.id));
    coverflow();
  }
  addEventListener('scroll', onScroll, { passive: true });

  // ---- coverflow ----
  const cov = $('#cover');
  function coverflow() {
    if (!cov) return; const r = cov.getBoundingClientRect(), cx = r.left + r.width / 2;
    $$('.ci', cov).forEach((c) => { const b = c.getBoundingClientRect(), k = Math.max(-1, Math.min(1, (b.left + b.width / 2 - cx) / 320)); c.style.transform = `translateX(${-k * 70}px) rotateY(${-k * 52}deg) scale(${1 - Math.abs(k) * .22}) translateZ(${-Math.abs(k) * 90}px)`; c.style.opacity = 1 - Math.abs(k) * .45; c.style.zIndex = 10 - Math.round(Math.abs(k) * 9); });
  }
  cov && (cov.addEventListener('scroll', coverflow, { passive: true }), requestAnimationFrame(() => { cov.scrollLeft = (cov.scrollWidth - cov.clientWidth) / 2 - 120; coverflow(); }));
  addEventListener('resize', coverflow);

  // ---- timeline ----
  $$('#tl .dot').forEach((b) => b.addEventListener('click', () => { const m = LB.form[+b.dataset.i]; $$('#tl .dot').forEach((x) => x.classList.toggle('on', x === b)); const o = $('#tlo'); o.textContent = `${m.d} · ${m.gf}–${m.ga} vs ${m.opp} · ${m.res === 'W' ? 'Win' : m.res === 'L' ? 'Loss' : 'Draw'}`; o.classList.remove('pop'); void o.offsetWidth; o.classList.add('pop'); }));

  // ---- deck ----
  const deck = $('#deck'); let dks = $$('.dk', deck);
  function layDeck() { dks.forEach((c, i) => { c.style.zIndex = 20 - i; c.style.transform = `translateY(${i * 12}px) scale(${1 - i * .05}) rotateZ(${i % 2 ? 1.5 : -1.5}deg)`; c.style.opacity = i > 3 ? 0 : 1; }); }
  layDeck();
  deck.addEventListener('click', () => { const t = dks.shift(); t.style.transform = 'translateX(260px) rotateZ(22deg) translateY(-40px)'; t.style.opacity = 0; setTimeout(() => { dks.push(t); t.style.transition = 'none'; layDeck(); void t.offsetWidth; t.style.transition = ''; }, RM ? 0 : 450); layDeck(); });

  // ---- flip cards ----
  $$('.flip').forEach((f) => f.addEventListener('click', () => f.classList.toggle('on')));

  // ---- radar ----
  (() => {
    const R = LB.radar, el = $('#radar'), cx = 150, cy = 150, r = 105, n = R.axes.length, col = ['#efcf7a', '#c8352c', '#6ac7ff'];
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
    let s = `<svg viewBox="0 0 300 300">`;
    [.25, .5, .75, 1].forEach((g) => (s += `<polygon points="${R.axes.map((_, i) => pt(i, g).join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.16)"/>`));
    R.axes.forEach((a, i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.17); s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.12)"/><text x="${lx}" y="${ly}" fill="#c3cde2" font-size="9.5" font-family="Inter" text-anchor="middle" dominant-baseline="middle">${a}</text>`; });
    R.series.forEach((p, k) => (s += `<polygon class="rs" data-k="${k}" points="${p.v.map((v, i) => pt(i, v).join(',')).join(' ')}" fill="${col[k]}33" stroke="${col[k]}" stroke-width="2.2" style="transform-origin:150px 150px;animation:rg 1.2s ${k * .2}s both cubic-bezier(.2,.9,.2,1);transition:opacity .3s"/>`));
    el.innerHTML = s + `</svg><div class="leg">${R.series.map((p, k) => `<button data-k="${k}" style="border-color:${col[k]}">${p.n}</button>`).join('')}</div>`;
    const st = d.createElement('style'); st.textContent = '@keyframes rg{from{transform:scale(0);opacity:0}}'; d.head.appendChild(st);
    $$('.leg button', el).forEach((b) => { const hv = (on) => $$('.rs', el).forEach((p) => (p.style.opacity = on && p.dataset.k !== b.dataset.k ? .12 : 1)); b.onmouseenter = () => hv(1); b.onmouseleave = () => hv(0); b.onclick = () => hv(1); });
  })();

  // ---- form orbs + wave ----
  (() => {
    $('#formrow').innerHTML = LB.form.map((m, i) => `<span class="fo ${m.res}" style="animation-delay:${i * .08}s" title="${m.opp} ${m.gf}-${m.ga}">${m.res}</span>`).join('');
    const g = LB.form.map((m) => m.gf - m.ga), mx = Math.max(1, ...g.map(Math.abs)), w = 600, h = 120, xs = (i) => 20 + i * (w - 40) / (g.length - 1), ys = (v) => h / 2 - (v / mx) * 48;
    let p = `M${xs(0)} ${ys(g[0])}`; for (let i = 1; i < g.length; i++) { const x0 = xs(i - 1), x1 = xs(i), m = (x0 + x1) / 2; p += ` C${m} ${ys(g[i - 1])} ${m} ${ys(g[i])} ${x1} ${ys(g[i])}`; }
    $('#wave').innerHTML = `<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efcf7a" stop-opacity=".4"/><stop offset="1" stop-color="#efcf7a" stop-opacity="0"/></linearGradient></defs><line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" stroke="rgba(255,255,255,.2)" stroke-dasharray="4 4"/><path class="a" d="${p} L${xs(g.length - 1)} ${h} L${xs(0)} ${h}Z"/><path class="l" d="${p}" style="--len:1400"/>`;
  })();

  // ---- race ----
  (() => {
    const box = $('#race'); let cur = 'goals';
    function draw(k, first) { const rows = LB.race[k] || [], mx = Math.max(...rows.map((r) => r.v), 1); if (first) box.innerHTML = rows.map((r) => `<div class="rr"><span>${r.n}</span><div class="t"><i></i></div><b></b></div>`).join(''); $$('.rr', box).forEach((e, i) => { const r = rows[i]; if (!r) return; $('span', e).textContent = r.n; $('b', e).textContent = r.v; requestAnimationFrame(() => ($('i', e).style.width = (r.v / mx * 100) + '%')); }); }
    draw(cur, true);
    $('#racetabs').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('#racetabs .chip').forEach((x) => x.classList.toggle('on', x === b)); draw(b.dataset.k, false); });
  })();

  // ---- count-ups + flip digits (when visible) ----
  const cnts = $$('.cnt'); const cio = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; cio.unobserve(e.target); const to = +e.target.dataset.n, t0 = performance.now(); const tick = (t) => { const k = Math.min(1, (t - t0) / 1400); e.target.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && !RM && !still) requestAnimationFrame(tick); else e.target.textContent = to; }; tick(t0); }), { threshold: .5 });
  cnts.forEach((c) => cio.observe(c));
  (() => {
    const C = LB.club, items = [['Played', C.gp], ['Won', C.w], ['Goals', C.gf], ['Skill rating', C.sr]];
    const box = $('#flips'); box.innerHTML = items.map(([l, v]) => `<div class="fl"><div class="fd" data-v="${v}">${String(v).split('').map(() => `<div class="dg"><span><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></span></div>`).join('')}</div><u>${l}</u></div>`).join('');
    const fio = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; fio.disconnect(); $$('.fd', box).forEach((f, j) => String(f.dataset.v).split('').forEach((dg, i) => { const s = $$('.dg span', f)[i]; setTimeout(() => (s.style.transform = `translateY(${-(+dg) * 56}px)`), RM ? 0 : j * 150 + i * 200); })); }), { threshold: .5 });
    fio.observe(box);
  })();


  // ---- expandable rows ----
  $$('.xr > .tr').forEach((b) => b.addEventListener('click', () => b.parentElement.classList.toggle('on')));
  // ---- pitches ----
  if (window.NorexPitch) {
    const NP = window.NorexPitch, F = LB.formation, slots = NP.leagueSlots(F), assign = {}; LB.xi.forEach((p, i) => (assign[i] = p));
    const pop = $('#ppop');
    const pick = (i) => { const p = LB.xi[i]; if (!p) return; pop.innerHTML = `<div class="chips" style="justify-content:center"><span class="chip gold">${slots[i].s}</span><b>${p.n}</b><span class="muted small">${p.arch || p.line} · OVR ${p.ovr ?? '—'}</span></div>`; };
    NP.mount($('#p3d'), { mode: 'league', orient: 'h', slots, assign, three: true, onPick: pick });
    NP.mount($('#pflat'), { mode: 'league', orient: 'h', slots, assign, three: false, onPick: pick });
    NP.mount($('#pport'), { mode: 'league', orient: 'v', slots, assign, three: false });
    const rush = (s) => NP.mount($('#prush'), { mode: 'rush', orient: 'auto', slots: NP.RUSH[s], assign: {} });
    let rp = rush('3-1');
    $('#rushsw').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('#rushsw .chip').forEach((x) => x.classList.toggle('on', x === b)); rp.update({ slots: NP.RUSH[b.dataset.s] }); });
    // formation wall: mini diagrams
    const wall = $('#fwall');
    wall.innerHTML = LB.walls.map((f, i) => { const sl = NP.leagueSlots(f); return `<button class="fw" data-i="${i}"><svg viewBox="0 0 68 105">${sl.map((s) => `<circle cx="${(s.lat * 60 + 4).toFixed(1)}" cy="${(105 - (s.depth * 95 + 5)).toFixed(1)}" r="3.6"/>`).join('')}</svg>${f.id}</button>`; }).join('') + '<div class="fwinfo" style="grid-column:1/-1" id="fwinfo">Tap a shape</div>';
    wall.addEventListener('click', (e) => { const b = e.target.closest('.fw'); if (!b) return; $$('.fw', wall).forEach((x) => x.classList.toggle('on', x === b)); const f = LB.walls[+b.dataset.i]; $('#fwinfo').textContent = f.id + ' · ' + f.rows.map((r) => r.join(' ')).join(' / '); });
  }
  // ---- micro ----
  const burst = $('#burst');
  burst.addEventListener('click', (e) => { const r = burst.getBoundingClientRect(), cols = ['#efcf7a', '#c8352c', '#fff', '#ff8a7a']; for (let i = 0; i < 22; i++) { const p = d.createElement('i'), a = Math.random() * 6.28, dist = 40 + Math.random() * 90, sz = 4 + Math.random() * 7; Object.assign(p.style, { position: 'absolute', left: e.clientX - r.left + 'px', top: e.clientY - r.top + 'px', width: sz + 'px', height: sz + 'px', borderRadius: Math.random() > .5 ? '50%' : '2px', background: cols[i % 4], boxShadow: '0 0 8px currentColor', pointerEvents: 'none' }); burst.appendChild(p); anim(p, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist + 30}px) rotate(${Math.random() * 360}deg) scale(0)`, opacity: 0 }], { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.1,.8,.3,1)' }); setTimeout(() => p.remove(), 1200); } });
  $$('#mag .btn').forEach((b) => { b.addEventListener('mousemove', (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .35}px,${(e.clientY - r.top - r.height / 2) * .45}px)`; }); b.addEventListener('mouseleave', () => (b.style.transform = '')); });
  $$('.sp').forEach((s) => s.addEventListener('mousemove', (e) => { const r = s.getBoundingClientRect(); s.style.setProperty('--mx', e.clientX - r.left + 'px'); s.style.setProperty('--my', e.clientY - r.top + 'px'); }));
  $$('.rip').forEach((b) => b.addEventListener('click', (e) => { const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, i = d.createElement('span'); i.className = 'rp'; Object.assign(i.style, { width: s + 'px', height: s + 'px', left: e.clientX - r.left - s / 2 + 'px', top: e.clientY - r.top - s / 2 + 'px' }); b.appendChild(i); setTimeout(() => i.remove(), 800); }));
  const trail = $('#trail'); let last = 0;
  trail.addEventListener('mousemove', (e) => { const n = performance.now(); if (n - last < 16) return; last = n; const r = trail.getBoundingClientRect(), p = d.createElement('i'); Object.assign(p.style, { position: 'absolute', left: e.clientX - r.left + 'px', top: e.clientY - r.top + 'px', width: '16px', height: '16px', borderRadius: '50%', background: 'radial-gradient(circle,#efcf7a,rgba(200,53,44,.0) 70%)', pointerEvents: 'none' }); trail.appendChild(p); anim(p, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(3)', opacity: 0 }], { duration: 700 }); setTimeout(() => p.remove(), 750); });
  $$('.scrb').forEach((b) => b.addEventListener('mouseenter', () => { const t = b.dataset.t, ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_', t0 = performance.now(); if (b._r) cancelAnimationFrame(b._r); const f = (n) => { const k = (n - t0) / 600; b.textContent = [...t].map((c, i) => (i / t.length < k ? c : ch[Math.floor(Math.random() * ch.length)])).join(''); if (k < 1) b._r = requestAnimationFrame(f); else b.textContent = t; }; if (!RM) f(t0); }));
  // tilt (same feel as the main site)
  $$('.pc.tilt').forEach((c) => { c.addEventListener('mousemove', (e) => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = `perspective(700px) rotateY(${x * 22}deg) rotateX(${-y * 22}deg) scale(1.05)`; c.style.setProperty('--gx', (x + .5) * 100 + '%'); c.style.setProperty('--gy', (y + .5) * 100 + '%'); }); c.addEventListener('mouseleave', () => (c.style.transform = '')); });

  // ---- transitions (full screen, exactly like a page change) ----
  const tov = $('#tov'); let running = false;
  const crest = '<img src="crest.png" alt="" style="width:120px;filter:drop-shadow(0 0 24px rgba(239,207,122,.8))">';
  const mk = (css, html = '') => { const e = d.createElement('div'); e.className = 'tov-el'; Object.assign(e.style, css); e.innerHTML = html; tov.appendChild(e); return e; };
  const done = (a) => a ? a.finished.catch(() => {}) : Promise.resolve();
  const E = 'cubic-bezier(.7,0,.2,1)';
  const T = {
    async curtain() { const c = mk({ inset: 0, background: 'linear-gradient(90deg,#8d231c,#c8352c 80%,#efcf7a 96%,#fff 100%)', boxShadow: '0 0 60px rgba(0,0,0,.6)' }, `<div style="position:absolute;inset:0;display:grid;place-items:center">${crest}</div>`); await done(anim(c, [{ transform: 'translateX(-101%)' }, { transform: 'none' }], { duration: 650, easing: E, fill: 'forwards' })); await sleep(250); await done(anim(c, [{ transform: 'none' }, { transform: 'translateX(101%)' }], { duration: 650, easing: E, fill: 'forwards' })); },
    async iris(ev) { const x = ev.clientX, y = ev.clientY, c = mk({ inset: 0, background: '#0b0f16', display: 'grid', placeItems: 'center' }, crest), R = Math.hypot(innerWidth, innerHeight); await done(anim(c, [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)` }], { duration: 750, easing: E, fill: 'forwards' })); await sleep(250); await done(anim(c, [{ clipPath: `circle(${R}px at 50% 50%)` }, { clipPath: 'circle(0px at 50% 50%)' }], { duration: 700, easing: E, fill: 'forwards' })); },
    async shutter() { const n = 10, bs = Array.from({ length: n }, (_, i) => mk({ left: i * 100 / n + '%', width: 100 / n + .2 + '%', top: 0, bottom: 0, background: i % 2 ? '#c8352c' : '#12192a', borderRight: '1px solid rgba(239,207,122,.5)' })); await Promise.all(bs.map((b, i) => done(anim(b, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 450, delay: i * 50, easing: E, fill: 'forwards' })))); await sleep(200); await Promise.all(bs.map((b, i) => done(anim(b, [{ transform: 'scaleY(1)', transformOrigin: 'bottom' }, { transform: 'scaleY(0)', transformOrigin: 'bottom' }], { duration: 450, delay: (n - i) * 50, easing: E, fill: 'forwards' })))); },
    async zoom(ev) { const r = ev.currentTarget.getBoundingClientRect(), c = mk({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '999px', background: 'linear-gradient(135deg,#efcf7a,#c8352c)', display: 'grid', placeItems: 'center' }, crest); await done(anim(c, [{ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: '999px' }, { left: 0, top: 0, width: innerWidth + 'px', height: innerHeight + 'px', borderRadius: '0px' }], { duration: 700, easing: E, fill: 'forwards' })); await sleep(250); await done(anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' })); },
    async lines() { const c = mk({ inset: 0, background: '#0a1a12' }, `<svg viewBox="0 0 105 68" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%"><g fill="none" stroke="#fff" stroke-width=".4" pathLength="1"><rect x="2" y="2" width="101" height="64" class="ln"/><line x1="52.5" y1="2" x2="52.5" y2="66" class="ln"/><circle cx="52.5" cy="34" r="9.15" class="ln"/><rect x="2" y="13.8" width="16.5" height="40.3" class="ln"/><rect x="86.5" y="13.8" width="16.5" height="40.3" class="ln"/><rect x="2" y="24.8" width="5.5" height="18.3" class="ln"/><rect x="97.5" y="24.8" width="5.5" height="18.3" class="ln"/></g></svg>`); $$('.ln', c).forEach((l, i) => { l.setAttribute('pathLength', 1); l.style.strokeDasharray = 1; anim(l, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900, delay: i * 90, easing: 'ease-out', fill: 'forwards' }); }); await done(anim(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards' })); await sleep(1300); await done(anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 550, fill: 'forwards' })); },
    async doors() { const mkd = (side) => mk({ top: 0, bottom: 0, [side]: 0, width: '50%', background: 'linear-gradient(' + (side === 'left' ? '90deg' : '270deg') + ',#a77a22,#efcf7a 70%,#fff1c2)', boxShadow: 'inset 0 0 40px rgba(0,0,0,.45)', borderRight: side === 'left' ? '3px solid #6b4d12' : '', borderLeft: side === 'right' ? '3px solid #6b4d12' : '' }, `<i style="position:absolute;${side === 'left' ? 'right' : 'left'}:14px;top:50%;width:10px;height:90px;border-radius:6px;background:#6b4d12"></i>`); const L = mkd('left'), Rr = mkd('right'); await Promise.all([done(anim(L, [{ transform: 'translateX(-100%)' }, { transform: 'none' }], { duration: 600, easing: E, fill: 'forwards' })), done(anim(Rr, [{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: 600, easing: E, fill: 'forwards' }))]); await sleep(300); await Promise.all([done(anim(L, [{ transform: 'none' }, { transform: 'translateX(-100%)' }], { duration: 750, easing: E, fill: 'forwards' })), done(anim(Rr, [{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: 750, easing: E, fill: 'forwards' }))]); },
    async load() { const c = mk({ inset: 0, background: '#0b0f16', display: 'grid', placeItems: 'center', alignContent: 'center', gap: '22px' }, `<div style="text-align:center">${crest}<div style="width:220px;height:4px;border-radius:4px;background:rgba(255,255,255,.12);margin:22px auto 0;overflow:hidden"><i class="ldb" style="display:block;height:100%;width:100%;background:linear-gradient(90deg,#c8352c,#efcf7a);transform-origin:left"></i></div></div>`); anim($('img', c), [{ transform: 'scale(.9)', opacity: .6 }, { transform: 'scale(1.1)', opacity: 1 }, { transform: 'scale(.9)', opacity: .6 }], { duration: 900, iterations: 2 }); anim($('.ldb', c), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1600, easing: 'ease-in-out', fill: 'forwards' }); await sleep(1700); await done(anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' })); const secs2 = $$('.opt').filter((o) => o.getBoundingClientRect().top < innerHeight); secs2.forEach((o, i) => anim(o, [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: i * 90, easing: 'cubic-bezier(.2,.8,.2,1)' })); },
  };
  $$('.play').forEach((b) => b.addEventListener('click', async (e) => { if (running) return; running = true; tov.style.pointerEvents = 'auto'; try { await T[b.dataset.t](e); } finally { tov.innerHTML = ''; tov.style.pointerEvents = 'none'; running = false; } }));
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && running) { tov.innerHTML = ''; } });
  onScroll();
})();
