// Header tools (feedback #56): 🔍 search palette (/ or Ctrl+K), Discord avatar chip with the live online count and its dropdown,
// "Preview as" for the owner (#53). Reuses the Worker routes of the old site: GET/POST /api/presence (flag presence), GET /api/hub (flag hub).
// The dropdown and the palette are mounted on <body> (the header's backdrop-filter would trap position:fixed inside it).
(() => {
  const d = document, A = window.NorexAuth, N = window.NOREX || {}, API = window.NOREX_API;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  const wrap = () => d.querySelector('.bar .wrap');
  const slug = (s) => encodeURIComponent(String(s));
  let box = null, pal = null, panel = null, pill = null, bell = null, chat = null, state = { online: 0, people: [], recent: [], ok: false }, timer = 0;

  // ---------- search palette ----------
  const SETTINGS = [
    ['Motion & effects', 'Settings · animations, glow, tilt, haptics', '🎬', { act: 'motion' }, 'motion effects animation calm full glow tilt parallax haptics settings'],
    ['Alert settings', 'Settings · choose how each alert reaches you', '⚙️', { href: 'hub.html#lk-alertset' }, 'alert notification settings discord dm push site off'],
    ['Alerts inbox', 'My Locker · everything the club sent you', '🔔', { href: 'hub.html#lk-alerts' }, 'alerts inbox notifications bell unread'],
    ['Clubhouse feed', 'Clubhouse · goals, results and posts', '📰', { href: 'hub-clubhouse.html#ch-feed' }, 'feed club news posts'],
    ['Direct messages & chat', 'Clubhouse · chat room and DMs', '💬', { href: 'hub-clubhouse.html#ch-chat' }, 'chat messages dm direct inbox'],
    ['Ideas & suggestions', 'Clubhouse · suggest something', '💡', { href: 'hub-clubhouse.html#ch-ideas' }, 'ideas suggestions feedback']];
  const items = () => {
    const seen = new Set();
    const menus = (N.nav || []).map((g) => ({ sec: 'Menus', label: g.l, sub: 'Menu · ' + (g.subs || []).slice(0, 3).map((x) => x[1]).join(', '), href: g.href || (g.subs?.[0]?.[0]) || 'index.html', emo: '🧭', score: 1 }));
    const pages = (N.nav || []).flatMap((g) => (g.subs || []).map(([h, l, ds]) => ({ sec: 'Pages', label: l, sub: `${g.l} · ${ds || ''}`, href: h, emo: '📄', score: 1 }))).filter((i) => !seen.has(i.href) && seen.add(i.href));
    const people = (N.players || []).map((p) => ({ sec: 'Players', label: p.n, sub: `${p.line || ''} · ${p.ovr ? 'OVR ' + p.ovr : 'unrated'}`, href: `player-${slug(p.k)}.html`, emo: '👤', score: 2 }));
    const sets = SETTINGS.filter((x) => A?.session || !/alert|chat|feed|messages|ideas/i.test(x[0] + x[1])).map(([label, sub, emo, t, kw]) => ({ sec: 'Settings', label, sub, emo, href: t.href || '#', act: t.act, kw, score: 1 }));
    return [...people, ...pages, ...menus, ...sets];
  };
  const ORDER = ['Players', 'Pages', 'Menus', 'Settings'];
  let sel = 0, results = [];
  const drawPal = () => {
    const q = pal.querySelector('input').value.trim().toLowerCase();
    const hit = (i) => (i.label + ' ' + i.sub + ' ' + (i.kw || '')).toLowerCase().includes(q);
    const all = items();
    const list = q ? all.filter(hit).sort((a, b) => (b.label.toLowerCase().startsWith(q) - a.label.toLowerCase().startsWith(q)) || b.score - a.score).slice(0, 40) : [...all.filter((i) => i.sec === 'Pages').slice(0, 6), ...all.filter((i) => i.sec === 'Settings').slice(0, 3)];
    results = ORDER.flatMap((sec) => list.filter((i) => i.sec === sec).slice(0, q ? 8 : 9));
    sel = 0;
    let n = 0, last = '';
    pal.querySelector('ul').innerHTML = results.map((r) => { const h = r.sec !== last ? `<li class="phd" aria-hidden="true">${esc(r.sec)}</li>` : ''; last = r.sec; return `${h}<li><a href="${esc(r.href)}"${r.act ? ` data-act="${r.act}"` : ''} class="${n++ ? '' : 'sel'}"><span class="pe" aria-hidden="true">${r.emo}</span><span><b>${esc(r.label)}</b><small>${esc(r.sub)}</small></span></a></li>`; }).join('') || '<li class="pnone">No matches – try a player, page or setting.</li>';
  };
  const go = (r) => { if (r.act === 'motion') { closePal(); window.NorexMotion?.settings?.(); } else location.href = r.href; };
  const openPal = () => {
    if (!pal) {
      pal = d.createElement('div'); pal.className = 'hdr-pal'; pal.hidden = true; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-label', 'Search');
      pal.innerHTML = '<div class="pbox"><div class="pin"><span aria-hidden="true">🔍</span><input type="search" placeholder="Search players, pages and settings" aria-label="Search players, pages and settings" autocomplete="off" enterkeyhint="go"><button type="button" class="pclose" aria-label="Close search">✕</button></div><ul></ul></div>';
      d.body.appendChild(pal);
      pal.addEventListener('click', (e) => { if (e.target === pal || e.target.closest('.pclose')) closePal(); const a = e.target.closest('a[data-act]'); if (a) { e.preventDefault(); go(results.find((r) => r.act === a.dataset.act)); } });
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
    if (e.key === 'Enter' && results[sel]) { e.preventDefault(); go(results[sel]); }
  });

  // ---------- account chip + dropdown ----------
  const viewAs = () => { try { return localStorage.getItem('norex.viewas') || ''; } catch { return ''; } };
  const setViewAs = (v) => { try { if (v) { localStorage.setItem('norex.viewas', v); localStorage.setItem('norex.viewas.t', String(Date.now())); } else { localStorage.removeItem('norex.viewas'); localStorage.removeItem('norex.viewas.t'); } } catch {} location.reload(); };
  const realOwner = () => !!(A && A.session && A.realAs === 'owner');
  const since = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60e3)); return m < 60 ? `${m} min ago` : '1 h ago'; };
  const person = (u, sub) => `<li><span class="pav">${u.a ? `<img src="${esc(u.a)}" alt="" width="28" height="28" loading="lazy">` : esc((u.n || '?')[0].toUpperCase())}</span><span class="pn">${esc(u.n || 'Member')}</span><small>${esc(sub)}</small></li>`;
  const paintPanel = () => {
    if (pill && state.ok) { pill.hidden = false; pill.querySelector('b').textContent = String(state.online); pill.setAttribute('aria-label', `${state.online} online now`); }
    if (!panel) return;
    const on = state.people, va = viewAs();
    panel.innerHTML = `<div class="ph"><span class="pav big">${A.avatar ? `<img src="${esc(A.avatar)}" alt="" width="44" height="44">` : esc((A.name || 'M')[0].toUpperCase())}</span><div><b>${esc(A.name || 'Member')}</b><small>${esc(A.roleLabel || (A.role === 'owner' ? 'Founder' : A.role === 'manager' ? 'Manager' : 'Member'))} · Discord</small></div></div>
${state.ok ? `<div class="ps"><h4>🟢 ${state.online} online now</h4>${on.length ? `<ul class="pl">${on.slice(0, 8).map((u) => person(u, u.id === A.session?.u ? 'you' : 'now')).join('')}</ul>${on.length > 8 ? `<p class="pm">+ ${on.length - 8} more</p>` : ''}` : `<p class="pm">Nobody else is on right now.</p>`}
${state.recent.length ? `<h4>🕐 Earlier this hour</h4><ul class="pl">${state.recent.slice(0, 4).map((u) => person(u, since(u.at))).join('')}</ul>` : ''}
</div>` : ''}
<div class="pa"><a href="hub.html"><span aria-hidden="true">🔑</span>My Locker</a><button type="button" data-motion-settings><span aria-hidden="true">🎬</span>Motion &amp; effects</button>
${realOwner() ? `<div class="pv" role="group" aria-label="Preview as"><span>👁️ Preview as</span><button type="button" data-va="" class="${va ? '' : 'on'}">Owner</button><button type="button" data-va="member" class="${va === 'member' ? 'on' : ''}">Member</button><button type="button" data-va="guest" class="${va === 'guest' ? 'on' : ''}">Guest</button></div>` : ''}
<button type="button" data-out class="pout"><span aria-hidden="true">🚪</span>Sign out</button></div>`;
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
      d.addEventListener('click', (e) => { if (panel && !panel.hidden && !panel.contains(e.target) && !box.contains(e.target)) closeMenu(); });
    }
    if (!panel.hidden) return closeMenu();
    closePal(); paintPanel(); const bb = box.getBoundingClientRect(); panel.style.top = Math.round(bb.bottom + 8) + 'px'; panel.style.maxHeight = `calc(100dvh - ${Math.round(bb.bottom + 8)}px - 12px)`; panel.hidden = false; box.querySelector('.ac').setAttribute('aria-expanded', 'true');
  };
  const apply = (p) => {
    state = { ok: true, online: (p.online || []).length, people: p.online || [], recent: p.recent || [] };
    paintPanel();
  };
  const poll = () => {
    if (!A?.session || d.hidden) return;
    A.call('/api/presence').then(apply).catch(() => A.call('/api/hub').then((h) => { state = { ...state, ok: true, online: h.online | 0, people: [], recent: [] }; paintPanel(); }).catch(() => {}));
  };

  // ---------- 🔔 bell, 💬 clubhouse button, in-app banners ----------
  const dot = (el, n) => { const i = el?.querySelector('.hdr-n'); if (!i) return; i.hidden = !n; i.textContent = n > 99 ? '99+' : String(n || ''); };
  const SEEN = 'norex.nseen', seenId = () => { try { return +sessionStorage.getItem(SEEN) || 0; } catch { return 0; } };
  const setSeen = (v) => { try { sessionStorage.setItem(SEEN, String(v)); } catch {} };
  const room = (l) => (/^feed\.html/.test(l || '') ? 'hub-clubhouse.html#ch-feed' : /^messages\.html/.test(l || '') ? 'hub-clubhouse.html#ch-chat' : /^https:/.test(l || '') ? l : 'hub.html#lk-alerts');
  const banner = (n) => {
    if (d.querySelector(`.nx-note[data-id="${n.id}"]`) || d.querySelectorAll('.nx-note').length >= 2) return;
    const b = d.createElement('div'); b.className = 'nx-note'; b.dataset.id = n.id; b.setAttribute('role', 'status');
    b.innerHTML = `<span class="ni" aria-hidden="true">${esc(n.icon || '🔔')}</span><a href="${esc(room(n.link))}"><b>${esc(n.title)}</b>${n.body ? `<span>${esc(String(n.body).slice(0, 90))}</span>` : ''}</a><button type="button" class="x" aria-label="Dismiss">✕</button>`;
    const out = () => { b.classList.add('out'); setTimeout(() => b.remove(), 300); };
    b.querySelector('.x').onclick = out; setTimeout(out, 9000); d.body.appendChild(b);
  };
  const pollAlerts = () => {
    if (!A?.session || d.hidden) return;
    A.call('/api/notify/count').then((c) => {
      bell.hidden = false; dot(bell, c.unread | 0);
      if (!(c.unread > 0)) return;
      A.call('/api/notify').then((r) => {
        const fresh = (r.items || []).filter((n) => !n.read && !n.readAt && n.id > seenId() && Date.now() - n.at < 15 * 60e3).sort((a, b) => a.id - b.id);
        const top = Math.max(seenId(), ...(r.items || []).map((n) => n.id || 0));
        if (!/\/hub\.html$/.test(location.pathname)) fresh.slice(-2).forEach(banner);
        setSeen(top);
      }).catch(() => {});
    }).catch(() => {});
    A.call('/api/chats').then((r) => { chat.hidden = false; dot(chat, (r.chats || []).reduce((n, c) => n + (c.unread || 0), 0)); }).catch(() => {});
  };

  // ---------- mount ----------
  const mount = () => {
    const w = wrap(); if (!w || d.getElementById('hdrR')) return;
    box = d.createElement('div'); box.id = 'hdrR'; box.className = 'hdr-r';
    box.innerHTML = '<button type="button" class="hdr-s" aria-label="Search players, pages and settings" title="Search ( / )"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg><kbd class="hdr-k" aria-hidden="true">/</kbd></button>';
    if (A?.session) {
      const ac = d.createElement('button'); ac.type = 'button'; ac.className = 'ac'; ac.setAttribute('aria-haspopup', 'dialog'); ac.setAttribute('aria-expanded', 'false'); ac.setAttribute('aria-label', `Account: ${A.name || 'Member'}`);
      ac.innerHTML = `<span class="pav">${A.avatar ? `<img src="${esc(A.avatar)}" alt="" width="34" height="34">` : esc((A.name || 'M')[0].toUpperCase())}</span><span class="acn">${esc(A.name || 'Member')}</span>`;
      pill = d.createElement('button'); pill.type = 'button'; pill.className = 'hdr-on'; pill.hidden = true; pill.title = 'Who is online'; pill.innerHTML = '<i aria-hidden="true"></i><b>0</b>'; pill.onclick = toggleMenu;
      bell = d.createElement('a'); bell.className = 'hdr-i hdr-bell'; bell.href = 'hub.html#lk-alerts'; bell.hidden = true; bell.setAttribute('aria-label', 'Alerts'); bell.title = 'Alerts'; bell.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg><i class="hdr-n" hidden></i>';
      chat = d.createElement('a'); chat.className = 'hdr-i hdr-chat'; chat.href = 'hub-clubhouse.html#ch-chat'; chat.hidden = true; chat.setAttribute('aria-label', 'Clubhouse feed and messages'); chat.title = 'Clubhouse feed & messages'; chat.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z"/></svg><i class="hdr-n" hidden></i>';
      box.append(pill, bell, chat); ac.onclick = toggleMenu; box.appendChild(ac);
      if (viewAs() && realOwner()) { const ribbon = d.createElement('div'); ribbon.className = 'hdr-va'; ribbon.innerHTML = '👁️ Viewing the site as a <b>' + (viewAs() === 'guest' ? 'guest' : 'member') + '</b> <button type="button">Back to owner</button>'; ribbon.querySelector('button').onclick = () => setViewAs(''); d.body.insertBefore(ribbon, d.body.firstChild); }
      poll(); pollAlerts(); timer = setInterval(poll, 120e3); setInterval(pollAlerts, 60e3); d.addEventListener('visibilitychange', () => { if (!d.hidden) { poll(); pollAlerts(); } });
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
