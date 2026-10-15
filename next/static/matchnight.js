// Hub › Match Night (#50): one hero card instead of the same card per date and per player.
//   RSVP     – the next match night as a hero (countdown, who is in) with one three-way switch
//   Week     – seven day tiles, one tap cycles in → maybe → out → clear (no row of buttons per date)
//   MOTM     – one match at a time, swipeable player tiles, one tap votes
//   Ratings  – one teammate at a time, big stars, the deck advances itself
//   Rush log – folded away until you need it
// Same member routes as before (/api/events, /api/availability, /api/vote, /api/ratings, /api/rush); the server rules are unchanged.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const hero = $('#mnhero'); if (!hero) return;
  const A = window.NorexAuth, M = window.NorexMotion;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const live = !!(window.NOREX_API && A && A.token);
  const me = () => A?.session?.u;
  const post = (path, body) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const mount = { week: $('#mnweek'), motm: $('#mnmotm'), rate: $('#mnrate'), rush: $('#mnrush') };
  const toast = (t, k = 'ok') => M?.toast?.(t, { kind: k });
  const whenTxt = (ms) => new Date(ms).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const evName = (e) => e.title || (e.type ? e.type[0].toUpperCase() + e.type.slice(1) : 'Match night');
  const fail = (el, what, retry) => { el.innerHTML = `<div class="panel mn-empty"><span>📡</span><div><b>Could not load ${what}</b><p class="muted small">The club server did not answer.</p><button type="button" class="btn ghost" data-mnretry>↻ Try again</button></div></div>`; $('[data-mnretry]', el).onclick = retry; };
  const skel = (el, n = 2) => { if (M?.skeleton) M.skeleton(el, n); };

  // ---------- RSVP hero ----------
  const SW = [['yes', '✅', "I'm in"], ['maybe', '❔', 'Maybe'], ['no', '❌', "Can't"]];
  let EV = null, tick = null;
  const count = (e, s) => (e.rsvps || []).filter((r) => r.s === s).length;
  const mine = (e) => (e.rsvps || []).find((r) => r.id === me())?.s || '';
  const switchHtml = (e, cur) => `<div class="mn-sw" role="radiogroup" aria-label="Your answer" data-pos="${Math.max(0, SW.findIndex((x) => x[0] === cur))}"${cur ? '' : ' data-none'}><i class="mn-thumb" aria-hidden="true"></i>${SW.map(([v, ic, l]) => `<button type="button" role="radio" aria-checked="${cur === v}" class="${cur === v ? 'on ' : ''}s-${v}" data-ev="${e.id}" data-v="${v}"><span>${ic}</span><b>${l}</b></button>`).join('')}</div>`;
  const left = (ms) => { const s = Math.max(0, Math.round((ms - Date.now()) / 1000)), dd = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return dd ? `${dd}d ${h}h` : h ? `${h}h ${m}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`; };
  const heroHtml = () => {
    const now = Date.now(), list = (EV || []).filter((e) => e.status === 'scheduled' && e.end > now).slice(0, 6);
    if (!list.length) return `<div class="mn-none"><span class="mn-bigi" aria-hidden="true">🗓️</span><div><b>No match night scheduled</b><p class="muted small">When the managers schedule one you answer right here, and you get an alert.</p></div></div>`;
    const e = list[0], cur = mine(e), yes = count(e, 'yes'), mb = count(e, 'maybe'), who = (e.rsvps || []).filter((r) => r.s === 'yes').slice(0, 7);
    return `<div class="mn-top"><div><div class="eyebrow">🗓️ Next up</div><h3 class="mn-t fit">${esc(evName(e))}</h3><p class="mn-when">${esc(whenTxt(e.start))}</p></div><div class="mn-cd" role="timer" aria-live="off"><small>${e.start > now ? 'kick-off in' : 'under way'}</small><b class="num" id="mncd">${e.start > now ? left(e.start) : 'LIVE'}</b></div></div>
<div class="mn-who"><div class="mn-av">${who.map((r) => r.a ? `<img${r.id ? ` data-uid="${esc(r.id)}"` : ''} src="${esc(r.a)}" alt="" title="${esc(r.n || '')}">` : `<span title="${esc(r.n || '')}">${esc((r.n || '?')[0])}</span>`).join('')}</div><span><b class="num">${yes}</b> in${mb ? ` · <b class="num">${mb}</b> maybe` : ''}${(e.plays || []).length ? ` · <a class="tp-pill" href="#mn-plays">📋 ${e.plays.length} play${e.plays.length === 1 ? '' : 's'}</a>` : ''}</span></div>
${switchHtml(e, cur)}<p class="muted small mn-msg" id="mnmsg">${cur ? 'Saved. Tap your answer again to clear it.' : 'Tap one. You can change it any time before kick-off.'}</p>
${list.length > 1 ? `<div class="mn-more"><div class="tiny muted">ALSO COMING UP</div>${list.slice(1).map((x) => `<div class="mn-row"><span><b>${esc(evName(x))}</b><small class="muted"> ${esc(new Date(x.start).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</small></span><button type="button" class="mn-cyc s-${mine(x) || 'none'}" data-evc="${x.id}" aria-label="${esc(evName(x))}: ${mine(x) || 'not answered'}. Tap to change">${{ yes: '✅', maybe: '❔', no: '❌' }[mine(x)] || '＋'}</button></div>`).join('')}</div>` : ''}`;
  };
  const drawHero = () => { hero.innerHTML = heroHtml(); clearInterval(tick); const c = $('#mncd'); const e = (EV || []).find((x) => x.status === 'scheduled' && x.end > Date.now()); if (c && e && e.start > Date.now()) tick = setInterval(() => { if (!c.isConnected) return clearInterval(tick); c.textContent = e.start > Date.now() ? left(e.start) : 'LIVE'; }, 1000); };
  const rsvp = async (btn, id, v) => {
    const e = EV.find((x) => x.id === id); const cur = mine(e); btn.disabled = true;
    const job = () => post('/api/events/rsvp', { id, status: cur === v ? 'clear' : v });
    try { const L = await (M?.submit ? M.submit(btn, job) : job()); EV = L.events || EV; toast(cur === v ? 'Answer cleared' : 'Saved. The managers can see your answer.'); drawHero(); }
    catch { btn.disabled = false; toast('Could not save that. Try again.', 'err'); }
  };
  hero.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ev]'); if (b && live) return rsvp(b, +b.dataset.ev, b.dataset.v);
    const c = ev.target.closest('[data-evc]'); if (c && live) { const e = EV.find((x) => x.id === +c.dataset.evc), cur = mine(e), nx = { '': 'yes', yes: 'maybe', maybe: 'no', no: 'clear' }[cur] || 'yes'; c.disabled = true;
      post('/api/events/rsvp', { id: e.id, status: nx }).then((L) => { EV = L.events || EV; drawHero(); }).catch(() => { c.disabled = false; toast('Could not save that. Try again.', 'err'); }); }
  });

  // ---------- week strip ----------
  let AV = null;
  const AS = { '': ['＋', 'not answered'], yes: ['✅', 'in'], maybe: ['❔', 'maybe'], no: ['❌', 'out'] };
  const weekHtml = () => `<div class="mn-days" role="list">${(AV.days || []).map((x) => { const dt = new Date(x.date + 'T12:00:00'), mine = (x.people || []).find((p) => p.id === me())?.s || '', yes = (x.people || []).filter((p) => p.s === 'yes').length, today = x.date === new Date().toISOString().slice(0, 10);
    return `<button type="button" role="listitem" class="mn-day s-${mine || 'none'}${today ? ' today' : ''}" data-day="${esc(x.date)}" aria-label="${esc(dt.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))}: ${AS[mine][1]}, ${yes} in. Tap to change"><small>${esc(dt.toLocaleDateString(undefined, { weekday: 'short' }))}</small><b class="num">${dt.getDate()}</b><span class="mn-ds" aria-hidden="true">${AS[mine][0]}</span><em>${yes} in</em></button>`; }).join('')}</div><p class="muted small mn-hint">Tap a day to cycle <b>✅ in</b> → <b>❔ maybe</b> → <b>❌ out</b> → cleared. The managers see the totals.</p>`;
  mount.week?.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-day]'); if (!b || !live) return; const day = AV.days.find((x) => x.date === b.dataset.day), cur = (day.people || []).find((p) => p.id === me())?.s || '', nx = { '': 'yes', yes: 'maybe', maybe: 'no', no: 'clear' }[cur];
    b.disabled = true; b.classList.add('pop'); post('/api/availability', { date: b.dataset.day, status: nx }).then((r) => { AV = r; mount.week.innerHTML = weekHtml(); }).catch(() => { b.disabled = false; toast('Could not save that. Try again.', 'err'); });
  });

  // ---------- MOTM ----------
  let VT = null, vi = 0;
  const motmHtml = () => {
    const ms = VT.matches || []; if (!ms.length) return `<div class="panel mn-empty"><span>⭐</span><div><b>Voting opens after the final whistle</b><p class="muted small">You get 72 hours. The winner's card gets the gold treatment in the Hall of Fame.</p></div></div>`;
    vi = Math.min(vi, ms.length - 1); const m = ms[vi], top = Math.max(1, ...Object.values(m.tally || {}).map(Number));
    return `<div class="chips mn-tabs" role="tablist" aria-label="Match">${ms.map((x, i) => `<button type="button" role="tab" class="chip${i === vi ? ' on' : ''}" aria-selected="${i === vi}" data-mi="${i}">vs ${esc(x.opp)} <small class="num">${x.gf}–${x.ga}</small></button>`).join('')}</div>
<div class="mn-score"><span class="muted small">Who was your man of the match against</span><b class="mn-opp fit">${esc(m.opp)}</b><span class="mn-sc num">${m.gf}<i>–</i>${m.ga}</span><small class="muted">${m.total} vote${m.total === 1 ? '' : 's'} so far</small></div>
<div class="mn-rail" tabindex="0" aria-label="Players, swipe sideways">${(m.players || []).map((x) => { const n = m.tally?.[x.k] || 0; return `<button type="button" class="mn-pl${m.mine === x.k ? ' on' : ''}" data-m="${esc(m.id)}" data-p="${esc(x.k)}" aria-pressed="${m.mine === x.k}"><span class="mn-pi" aria-hidden="true">${esc((x.n || '?')[0])}</span><b class="fit">${esc(x.n)}</b><span class="mn-bar" style="--w:${(n / top).toFixed(3)}"></span><small class="num">${n ? n + ' vote' + (n === 1 ? '' : 's') : 'no votes'}</small>${m.mine === x.k ? '<em>✓ your pick</em>' : ''}</button>`; }).join('')}</div>`;
  };
  mount.motm?.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-mi]'); if (t) { vi = +t.dataset.mi; mount.motm.innerHTML = motmHtml(); return; }
    const b = ev.target.closest('[data-m]'); if (!b || !live) return; b.disabled = true;
    post('/api/vote', { match: isNaN(+b.dataset.m) ? b.dataset.m : +b.dataset.m, player: b.dataset.p }).then((r) => { VT = r; mount.motm.innerHTML = motmHtml(); const on = $('.mn-pl.on', mount.motm); on?.classList.add('mx-pop'); M?.pulse?.(on); on?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }).catch(() => { b.disabled = false; toast('Could not save that vote. It may have closed.', 'err'); });
  });

  // ---------- ratings deck ----------
  let RT = null, ri = 0;
  const pool = () => (RT.players || []).filter((x) => x.k !== RT.self);
  const rateHtml = () => {
    const ps = pool(); if (!ps.length) return `<div class="panel mn-empty"><span>✨</span><div><b>Nobody to rate yet</b><p class="muted small">Teammates show up here once they have played.</p></div></div>`;
    const done = ps.filter((x) => RT.my?.[x.k]).length; ri = (ri + ps.length) % ps.length; const p = ps[ri], cur = RT.my?.[p.k] || 0;
    return `<div class="mn-rh"><b class="num">${done}<small>/${ps.length}</small></b><span class="muted small">rated this week</span>${ps.length <= 12 ? `<div class="mn-dots" role="tablist" aria-label="Teammates">${ps.map((x, i) => `<button type="button" class="${i === ri ? 'on ' : ''}${RT.my?.[x.k] ? 'did' : ''}" data-ri="${i}" aria-label="${esc(x.n)}${RT.my?.[x.k] ? ', rated' : ''}"></button>`).join('')}</div>` : `<span class="mn-prog" aria-hidden="true"><i style="--w:${(done / ps.length).toFixed(3)}"></i></span>`}</div>
<div class="mn-deck"><button type="button" class="mn-nav" data-rn="-1" aria-label="Previous teammate">‹</button><div class="mn-rc" id="mnrc"><span class="mn-pi big" aria-hidden="true">${esc((p.n || '?')[0])}</span><b class="fit">${esc(p.n)}</b><small class="muted">${p.played ? '● played this week' : 'did not play this week'}</small>
<div class="mn-stars" role="radiogroup" aria-label="Rating for ${esc(p.n)}">${[1, 2, 3, 4, 5].map((s) => `<button type="button" role="radio" aria-checked="${cur === s}" class="${cur >= s ? 'on' : ''}" data-k="${esc(p.k)}" data-s="${s}" aria-label="${s} star${s === 1 ? '' : 's'}">★</button>`).join('')}</div><small class="muted">${cur ? `You gave ${cur}. Tap the same star to clear.` : 'Tap a star, the next teammate comes up.'}</small></div><button type="button" class="mn-nav" data-rn="1" aria-label="Next teammate">›</button></div>`;
  };
  const rstep = (n, dir) => { ri += n; const c = $('#mnrc', mount.rate); const go = () => { mount.rate.innerHTML = rateHtml(); const nc = $('#mnrc', mount.rate); nc?.animate?.([{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); };
    if (c?.animate && M && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) c.animate([{ opacity: 1 }, { opacity: 0, transform: `translateX(${-dir * 28}px)` }], { duration: 140 }).finished.then(go).catch(go); else go(); };
  mount.rate?.addEventListener('click', (ev) => {
    const nv = ev.target.closest('[data-rn]'); if (nv) return rstep(+nv.dataset.rn, +nv.dataset.rn);
    const dt = ev.target.closest('[data-ri]'); if (dt) { const to = +dt.dataset.ri; return rstep(to - ri, to > ri ? 1 : -1); }
    const s = ev.target.closest('[data-s]'); if (!s || !live) return; const was = RT.my?.[s.dataset.k] || 0, v = +s.dataset.s;
    post('/api/ratings/rate', { player: s.dataset.k, stars: was === v ? 0 : v }).then((r) => { RT = r; M?.pulse?.(s); if (was === v) { mount.rate.innerHTML = rateHtml(); } else setTimeout(() => rstep(1, 1), 320); }).catch(() => toast('Could not save that rating.', 'err'));
  });

  // ---------- Rush log ----------
  const rushHtml = (Q) => {
    const mineL = (Q && Q.mine) || [], today = new Date().toISOString().slice(0, 10), squad = (window.NOREX?.players || []).filter((x) => x.k);
    return `<details class="mn-rush"><summary><span class="mn-bigi" aria-hidden="true">⚡</span><span><b>Log a Rush game</b><small class="muted">Rush is not in EA's data, so a manager confirms what you log</small></span><i aria-hidden="true">＋</i></summary>
<form id="rushform" class="mn-form"><div class="mn-fr"><label>Date<input type="date" name="date" value="${today}" max="${today}" required></label><label>Opponent<input name="opponent" placeholder="Opponent club" maxlength="60" required></label></div>
<div class="mn-fr"><label>Our goals<input type="number" name="gf" min="0" max="40" value="0"></label><label>Their goals<input type="number" name="ga" min="0" max="40" value="0"></label></div>
<p class="muted small">Who played (up to 5), with their goals and assists</p>${[0, 1, 2, 3, 4].map((i) => `<div class="mn-fp"><select name="p${i}" aria-label="Player ${i + 1}"><option value="">${i ? '— none —' : '— choose —'}</option>${squad.map((x) => `<option value="${esc(x.k)}">${esc(x.n)}</option>`).join('')}</select><input type="number" name="g${i}" min="0" max="40" value="0" aria-label="Goals" title="Goals"><input type="number" name="a${i}" min="0" max="40" value="0" aria-label="Assists" title="Assists"></div>`).join('')}
<div class="chips" style="margin-top:12px"><button class="btn gold" type="submit">Submit result</button></div><p class="muted small" id="rushmsg" role="status"></p></form>
${mineL.length ? `<p class="tiny muted" style="margin-top:12px">YOUR RECENT RESULTS</p>${mineL.slice(0, 5).map((r) => `<p class="small">${esc(r.date)} · <b class="num">${r.gf}–${r.ga}</b> vs ${esc(r.opp)} <span class="muted">· ${esc(r.status)}</span></p>`).join('')}` : ''}</details>`;
  };
  const drawRush = (Q) => { const open = $('.mn-rush', mount.rush)?.open; mount.rush.innerHTML = rushHtml(Q); if (open) $('.mn-rush', mount.rush).open = true;
    const f = $('#rushform', mount.rush); f.onsubmit = (e) => { e.preventDefault(); if (!live) return; const fd = new FormData(f), ps = [0, 1, 2, 3, 4].map((i) => fd.get('p' + i) ? { k: fd.get('p' + i), g: +fd.get('g' + i) || 0, a: +fd.get('a' + i) || 0 } : null).filter(Boolean), btn = $('[type=submit]', f); btn.disabled = true;
      post('/api/rush', { date: fd.get('date'), opponent: fd.get('opponent'), gf: +fd.get('gf'), ga: +fd.get('ga'), players: ps }).then((q) => { toast('Result sent for confirmation'); drawRush(q); }).catch((er) => { btn.disabled = false; $('#rushmsg', f).textContent = er.message || 'Could not save that result.'; }); }; };

  // ---------- load ----------
  const run = (el, what, p, ok) => { skel(el, 2); p().then(ok).catch(() => fail(el, what, () => run(el, what, p, ok))); };
  if (!live) { // local design build: show the layout with clearly marked sample content
    const t = Date.now() + 2 * 86400e3;
    EV = [{ id: 1, status: 'scheduled', title: 'League night', start: t, end: t + 7200e3, rsvps: [{ id: 'a', s: 'yes', n: 'Sample' }, { id: 'b', s: 'maybe', n: 'Sample' }], plays: [] }]; drawHero();
    AV = { days: Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() + i * 86400e3).toISOString().slice(0, 10), people: [] })) }; mount.week.innerHTML = weekHtml();
    VT = { matches: [] }; mount.motm.innerHTML = motmHtml(); RT = { players: [], my: {} }; mount.rate.innerHTML = rateHtml(); drawRush(null);
    hero.insertAdjacentHTML('afterbegin', '<span class="pill s mn-sample">SAMPLE</span>'); return;
  }
  skel(hero, 3);
  const loadHero = () => A.call('/api/events').then((L) => { EV = L.events || []; drawHero(); }).catch(() => fail(hero, 'match nights', loadHero));
  loadHero();
  run(mount.week, 'availability', () => A.call('/api/availability'), (r) => { AV = r; mount.week.innerHTML = weekHtml(); });
  run(mount.motm, 'the vote', () => A.call('/api/vote'), (r) => { VT = r; mount.motm.innerHTML = motmHtml(); });
  run(mount.rate, 'ratings', () => A.call('/api/ratings'), (r) => { RT = r; mount.rate.innerHTML = rateHtml(); });
  drawRush(null); A.call('/api/rush/queue').then(drawRush).catch(() => {});
})();
