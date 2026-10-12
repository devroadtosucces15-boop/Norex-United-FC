// Header tools (feedback #56): 🔍 search palette (/ or Ctrl+K), Discord avatar chip with the live online count and its dropdown,
// "Preview as" for the owner (#53). Reuses the Worker routes of the old site: GET/POST /api/presence (flag presence), GET /api/hub (flag hub).
// The dropdown and the palette are mounted on <body> (the header's backdrop-filter would trap position:fixed inside it).
(() => {
  const d = document, A = window.NorexAuth, N = window.NOREX || {}, API = window.NOREX_API;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  const wrap = () => d.querySelector('.bar .wrap');
  const slug = (s) => encodeURIComponent(String(s));
  let box = null, pal = null, panel = null, badge = null, state = { online: 0, people: [], recent: [], hidden: false, ok: false }, timer = 0;

  // ---------- search palette ----------
  const items = () => {
    const pages = (N.nav || []).flatMap((g) => (g.subs || []).map(([h, l, ds]) => ({ label: l, sub: `${g.l} · ${ds || ''}`, href: h, emo: '📄', score: 1 })));
    const people = (N.players || []).map((p) => ({ label: p.n, sub: `${p.line || ''} · ${p.ovr ? 'OVR ' + p.ovr : 'unrated'}`, href: `player-${slug(p.k)}.html`, emo: '👤', score: 2 }));
    return [...people, ...pages];
  };
  let sel = 0, results = [];
  const drawPal = () => {
    const q = pal.querySelector('input').value.trim().toLowerCase();
    const all = items();
    results = (q ? all.filter((i) => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)).sort((a, b) => (b.label.toLowerCase().startsWith(q) - a.label.toLowerCase().startsWith(q)) || b.score - a.score) : all.filter((i) => i.score === 1).slice(0, 12)).slice(0, 30);
    sel = 0;
    pal.querySelector('ul').innerHTML = results.map((r, i) => `<li><a href="${esc(r.href)}" class="${i ? '' : 'sel'}"><span class="pe" aria-hidden="true">${r.emo}</span><span><b>${esc(r.label)}</b><small>${esc(r.sub)}</small></span></a></li>`).join('') || '<li class="pnone">No matches – try a player or page name.</li>';
  };
  const openPal = () => {
    if (!pal) {
      pal = d.createElement('div'); pal.className = 'hdr-pal'; pal.hidden = true; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-label', 'Search');
      pal.innerHTML = '<div class="pbox"><div class="pin"><span aria-hidden="true">🔍</span><input type="search" placeholder="Search players and pages" aria-label="Search players and pages" autocomplete="off" enterkeyhint="go"><button type="button" class="pclose" aria-label="Close search">✕</button></div><ul></ul></div>';
      d.body.appendChild(pal);
      pal.addEventListener('click', (e) => { if (e.target === pal || e.target.closest('.pclose')) closePal(); });
      pal.querySelector('input').addEventListener('input', drawPal);
    }
    closeMenu(); pal.hidden = false; pal.querySelector('input').value = ''; drawPal(); pal.querySelector('input').focus({ preventScroll: true });
    d.documentElement.classList.add('hdr-lock');
  };
  const closePal = () => { if (pal) pal.hidden = true; d.documentElement.classList.remove('hdr-lock'); };
  d.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(d.activeElement?.tagName) || d.activeElement?.isContentEditable;
    if ((e.key === '/' && !typing) || (e.key === 'k' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); openPal(); return; }
    if (e.key === 'Escape') { if (pal && !pal.hidden) closePal(); closeMenu(); return; }
    if (!pal || pal.hidden || !results.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      [...pal.querySelectorAll('li a')].forEach((a, i) => { a.classList.toggle('sel', i === sel); if (i === sel) a.scrollIntoView({ block: 'nearest' }); });
    }
    if (e.key === 'Enter' && results[sel]) location.href = results[sel].href;
  });

  // ---------- account chip + dropdown ----------
  const viewAs = () => { try { return localStorage.getItem('norex.viewas') || ''; } catch { return ''; } };
  const setViewAs = (v) => { try { v ? localStorage.setItem('norex.viewas', v) : localStorage.removeItem('norex.viewas'); } catch {} location.reload(); };
  const realOwner = () => !!(A && A.session && A.realAs === 'owner');
  const since = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60e3)); return m < 60 ? `${m} min ago` : '1 h ago'; };
  const person = (u, sub) => `<li><span class="pav">${u.a ? `<img src="${esc(u.a)}" alt="" width="28" height="28" loading="lazy">` : esc((u.n || '?')[0].toUpperCase())}</span><span class="pn">${esc(u.n || 'Member')}</span><small>${esc(sub)}</small></li>`;
  const paintPanel = () => {
    if (!panel) return;
    const on = state.people, va = viewAs();
    panel.innerHTML = `<div class="ph"><span class="pav big">${A.avatar ? `<img src="${esc(A.avatar)}" alt="" width="44" height="44">` : esc((A.name || 'M')[0].toUpperCase())}</span><div><b>${esc(A.name || 'Member')}</b><small>${esc(A.roleLabel || (A.role === 'owner' ? 'Founder' : A.role === 'manager' ? 'Manager' : 'Member'))} · Discord</small></div></div>
${state.ok ? `<div class="ps"><h4>🟢 ${state.online} online now</h4>${on.length ? `<ul class="pl">${on.slice(0, 8).map((u) => person(u, u.id === A.session?.u ? 'you' : 'now')).join('')}</ul>${on.length > 8 ? `<p class="pm">+ ${on.length - 8} more</p>` : ''}` : `<p class="pm">${state.hidden ? 'You appear offline, nobody else is on right now.' : 'Nobody else is on right now.'}</p>`}
${state.recent.length ? `<h4>🕐 Earlier this hour</h4><ul class="pl">${state.recent.slice(0, 4).map((u) => person(u, since(u.at))).join('')}</ul>` : ''}
${state.canHide ? `<label class="phide"><input type="checkbox" data-hide${state.hidden ? ' checked' : ''}><span>🙈 Appear offline</span><small>you still see who is on</small></label>` : ''}</div>` : ''}
<div class="pa"><a href="hub.html"><span aria-hidden="true">🔑</span>My Locker</a><button type="button" data-motion-settings><span aria-hidden="true">🎬</span>Motion &amp; effects</button>
${realOwner() ? `<div class="pv" role="group" aria-label="Preview as"><span>👁️ Preview as</span><button type="button" data-va="" class="${va ? '' : 'on'}">Owner</button><button type="button" data-va="member" class="${va === 'member' ? 'on' : ''}">Member</button><button type="button" data-va="guest" class="${va === 'guest' ? 'on' : ''}">Guest</button></div>` : ''}
<button type="button" data-out class="pout"><span aria-hidden="true">🚪</span>Sign out</button></div>`;
    badge && state.ok && (badge.textContent = state.hidden ? '' : String(state.online), badge.hidden = state.hidden || state.online < 1);
  };
  const closeMenu = () => { if (!panel || panel.hidden) return; panel.hidden = true; box?.querySelector('.ac')?.setAttribute('aria-expanded', 'false'); };
  const toggleMenu = () => {
    if (!panel) {
      panel = d.createElement('div'); panel.className = 'hdr-menu'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Account');
      d.body.appendChild(panel);
      panel.addEventListener('click', (e) => {
        if (e.target.closest('[data-out]')) { e.preventDefault(); A.logout(); }
        const va = e.target.closest('[data-va]'); if (va) setViewAs(va.dataset.va);
        if (e.target.closest('[data-motion-settings]')) closeMenu();
      });
      panel.addEventListener('change', (e) => {
        if (!e.target.matches('[data-hide]')) return;
        A.call('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: e.target.checked }) }).then(apply).catch(() => { e.target.checked = !e.target.checked; });
      });
      d.addEventListener('click', (e) => { if (panel && !panel.hidden && !panel.contains(e.target) && !box.contains(e.target)) closeMenu(); });
    }
    if (!panel.hidden) return closeMenu();
    closePal(); paintPanel(); const bb = box.getBoundingClientRect(); panel.style.top = Math.round(bb.bottom + 8) + 'px'; panel.style.maxHeight = `calc(100dvh - ${Math.round(bb.bottom + 8)}px - 12px)`; panel.hidden = false; box.querySelector('.ac').setAttribute('aria-expanded', 'true');
  };
  const apply = (p) => {
    const me = A.session?.u;
    state = { ok: true, canHide: p.hidden != null, hidden: !!p.hidden, online: (p.online || []).length, people: p.online || [], recent: p.recent || [] };
    if (p.hidden != null && me) state.online = (p.online || []).length; // already excludes anyone who appears offline
    paintPanel();
  };
  const poll = () => {
    if (!A?.session || d.hidden) return;
    A.call('/api/presence').then(apply).catch(() => A.call('/api/hub').then((h) => { state = { ...state, ok: true, canHide: false, online: h.online | 0, people: [], recent: [] }; paintPanel(); }).catch(() => {}));
  };

  // ---------- mount ----------
  const mount = () => {
    const w = wrap(); if (!w || d.getElementById('hdrR')) return;
    box = d.createElement('div'); box.id = 'hdrR'; box.className = 'hdr-r';
    box.innerHTML = '<button type="button" class="hdr-s" aria-label="Search players and pages" title="Search ( / )"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg><kbd class="hdr-k" aria-hidden="true">/</kbd></button>';
    if (A?.session) {
      const ac = d.createElement('button'); ac.type = 'button'; ac.className = 'ac'; ac.setAttribute('aria-haspopup', 'dialog'); ac.setAttribute('aria-expanded', 'false'); ac.setAttribute('aria-label', `Account: ${A.name || 'Member'}`);
      ac.innerHTML = `<span class="pav">${A.avatar ? `<img src="${esc(A.avatar)}" alt="" width="34" height="34">` : esc((A.name || 'M')[0].toUpperCase())}</span><span class="acn">${esc(A.name || 'Member')}</span><i class="acb" hidden></i>`;
      badge = ac.querySelector('.acb'); ac.onclick = toggleMenu; box.appendChild(ac);
      if (viewAs() && realOwner()) { const ribbon = d.createElement('div'); ribbon.className = 'hdr-va'; ribbon.innerHTML = '👁️ Viewing the site as a <b>' + (viewAs() === 'guest' ? 'guest' : 'member') + '</b> <button type="button">Back to owner</button>'; ribbon.querySelector('button').onclick = () => setViewAs(''); d.body.insertBefore(ribbon, d.body.firstChild); }
      poll(); timer = setInterval(poll, 120e3); d.addEventListener('visibilitychange', () => { if (!d.hidden) poll(); });
    } else if (API) {
      const a = d.createElement('a'); a.className = 'btn ghost hdr-in'; a.href = A?.loginUrl ? A.loginUrl() : '#'; a.setAttribute('data-login', ''); a.textContent = 'Sign in'; box.appendChild(a);
    }
    w.insertBefore(box, w.querySelector('.keybtn'));
    box.querySelector('.hdr-s').onclick = openPal;
  };
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', mount) : mount();
})();

// ?nx=<css selector> or ?nx=~<heading text>: arrive on a page already scrolled to that section (used by the Boardroom's Go to / Show me). Waits for late-rendered blocks.
(() => {
  const d = document, q = new URLSearchParams(location.search).get('nx'); if (!q) return;
  const calm = matchMedia('(prefers-reduced-motion:reduce)').matches; let n = 0;
  const find = () => {
    let el = null;
    if (q[0] === '~') { const t = q.slice(1).toLowerCase(); el = [...d.querySelectorAll('h1,h2,h3,h4,.ribbon,.eyebrow,summary')].find((h) => !h.closest('[hidden]') && h.textContent.toLowerCase().includes(t)); } else { try { el = d.querySelector(q); } catch {} }
    if (el && !el.closest('[hidden]')) { const box = el.closest('section,.panel') || el; box.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); box.classList.add('nx-hit'); setTimeout(() => box.classList.add('fade'), 1200); setTimeout(() => box.classList.remove('nx-hit', 'fade'), 3800); return; }
    if (++n < 25) setTimeout(find, 250);
  };
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', () => setTimeout(find, 300)) : setTimeout(find, 300);
})();
