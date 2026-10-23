// Header tools (feedback #56): 🔍 search palette (/ or Ctrl+K), Discord avatar chip with the live online count and its dropdown,
// "Preview as" for the owner (#53). Reuses the Worker routes of the old site: GET/POST /api/presence (flag presence), GET /api/hub (flag hub).
// The dropdown and the palette are mounted on <body> (the header's backdrop-filter would trap position:fixed inside it).
(() => {
  const d = document, A = window.NorexAuth, N = window.NOREX || {}, API = window.NOREX_API;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  const wrap = () => d.querySelector('.bar .wrap');
  const slug = (s) => encodeURIComponent(String(s));
  let box = null, pal = null, panel = null, pill = null, live = null, bell = null, chat = null, state = { online: 0, people: [], recent: [], ok: false }, timer = 0;

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
    closeMenu(); closeDrop?.(); pal.hidden = false; pal.querySelector('input').value = ''; drawPal(); pal.querySelector('input').focus({ preventScroll: true });
    d.documentElement.classList.add('hdr-lock');
  };
  const closePal = () => { if (pal) pal.hidden = true; d.documentElement.classList.remove('hdr-lock'); };
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrop();
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

  // ---------- own drop-downs: 🟢 Active, 🔔 Alerts, 💬 Messages (each its own panel, never the account menu) ----------
  let dd = null, ddKind = '';
  const since2 = (t) => { const m = Math.max(1, Math.round((Date.now() - (t || 0)) / 60e3)); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };
  const avatar = (u) => `<span class="pav">${u.a ? `<img src="${esc(u.a)}" alt="" width="28" height="28" loading="lazy">` : esc((u.n || '?')[0].toUpperCase())}</span>`;
  const closeDrop = () => { if (!dd) return; dd.hidden = true; ddKind = ''; [pill, bell, chat].forEach((b) => b?.setAttribute('aria-expanded', 'false')); };
  const room2 = (id) => `hub-clubhouse.html#c${id}`;
  const slugOf = (n) => { const p = (N.players || []).find((x) => String(x.n || '').toLowerCase() === String(n || '').toLowerCase()); return p ? `player-${slug(p.k)}.html` : ''; };
  const openDm = async (u, btn) => { if (btn) btn.disabled = true; try { const r = await A.call('/api/chats', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'dm', user: u }) }); const id = (await r.json?.() ?? r).chat?.id; if (id) { location.href = room2(id); if (/hub-clubhouse/.test(location.pathname)) location.reload(); } } catch { location.href = 'hub-clubhouse.html#ch-chat'; } };
  const drawActive = (q = '') => {
    const f = (list) => list.filter((u) => !q || String(u.n || '').toLowerCase().includes(q.toLowerCase()));
    const row = (u, sub) => { const pr = slugOf(u.n); return `<li>${pr ? `<a class="pavl" href="${pr}" aria-label="${esc(u.n)}'s profile">${avatar(u)}</a>` : avatar(u)}<button type="button" class="pn dm" data-dm="${esc(u.id)}" title="Message ${esc(u.n || 'member')}">${esc(u.n || 'Member')}</button><small>${esc(sub)}</small></li>`; };
    const on = f(state.people), rec = f(state.recent);
    return `${on.length ? `<h4>🟢 ${on.length} online now</h4><ul class="pl">${on.map((u) => row(u, u.id === A.session?.u ? 'you' : 'now')).join('')}</ul>` : `<p class="pm">${q ? 'Nobody online matches.' : 'Nobody else is on right now.'}</p>`}${rec.length ? `<h4>🕐 Last active</h4><ul class="pl">${rec.map((u) => row(u, since2(u.at) + ' ago')).join('')}</ul>` : ''}`;
  };
  const fillDrop = async (kind) => {
    const body = dd.querySelector('.dd-b');
    if (kind === 'active') {
      body.innerHTML = `<div class="dd-s"><input type="search" placeholder="Search members" aria-label="Search members" autocomplete="off"></div><div class="dd-l">${drawActive()}</div><p class="pm dd-h">Tap a name to message them, a picture to see their profile.</p>`;
      const inp = body.querySelector('input'); inp.oninput = () => { body.querySelector('.dd-l').innerHTML = drawActive(inp.value.trim()); };
      return;
    }
    body.innerHTML = '<p class="pm">Loading…</p>';
    try {
      if (kind === 'alerts') {
        const r = await A.call('/api/notify'), items = (r.items || []).slice().sort((x, y) => (y.at || 0) - (x.at || 0)).slice(0, 12);
        body.innerHTML = `${items.length ? `<ul class="pl dd-n">${items.map((n) => `<li class="${n.read || n.readAt ? '' : 'un'}"><span class="ni" aria-hidden="true">${esc(n.icon || '🔔')}</span><a href="${esc(room(n.link))}"><b>${esc(n.title)}</b>${n.body ? `<small>${esc(String(n.body).slice(0, 90))}</small>` : ''}</a><small>${since2(n.at)}</small></li>`).join('')}</ul>` : '<p class="pm">No alerts yet.</p>'}<div class="dd-f"><button type="button" data-readall>Mark all read</button><a href="hub.html#lk-alerts">Open all alerts</a></div>`;
        body.querySelector('[data-readall]')?.addEventListener('click', () => A.call('/api/notify/read', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ all: true }) }).then(() => { dot(bell, 0); fillDrop('alerts'); }).catch(() => {}));
      } else {
        const r = await A.call('/api/chats'), cs = (r.chats || []).slice().sort((x, y) => (y.at || 0) - (x.at || 0)).slice(0, 12);
        body.innerHTML = `${cs.length ? `<ul class="pl dd-n">${cs.map((c) => `<li class="${c.unread ? 'un' : ''}"><a class="dd-row" href="${room2(c.id)}">${c.emoji ? `<span class="ni" aria-hidden="true">${esc(c.emoji)}</span>` : avatar({ a: c.avatar || c.other?.a, n: c.name })}<span><b>${esc(c.name)}</b><small>${esc(c.last ? (c.last.mine ? 'You: ' : '') + c.last.text : 'No messages yet')}</small></span>${c.unread ? `<i class="dd-u">${c.unread}</i>` : ''}</a></li>`).join('')}</ul>` : '<p class="pm">No chats yet.</p>'}<div class="dd-f"><a href="hub-clubhouse.html#ch-chat">Open Clubhouse chat</a></div>`;
      }
    } catch { body.innerHTML = '<p class="pm">Could not load that right now.</p>'; }
  };
  const toggleDrop = (kind, btn) => {
    if (!dd) {
      dd = d.createElement('div'); dd.className = 'hdr-menu hdr-dd'; dd.hidden = true; dd.setAttribute('role', 'dialog'); dd.innerHTML = '<div class="dd-h2"><b></b><button type="button" class="dd-x" aria-label="Close">✕</button></div><div class="dd-b"></div>'; d.body.appendChild(dd);
      dd.addEventListener('click', (e) => { if (e.target.closest('.dd-x')) return closeDrop(); const m = e.target.closest('[data-dm]'); if (m) openDm(m.dataset.dm, m); });
      d.addEventListener('click', (e) => { if (dd && !dd.hidden && !dd.contains(e.target) && ![pill, bell, chat].some((b) => b?.contains(e.target))) closeDrop(); });
    }
    if (!dd.hidden && ddKind === kind) return closeDrop();
    closeMenu(); closePal(); closeDrop(); ddKind = kind;
    dd.querySelector('.dd-h2 b').textContent = kind === 'active' ? '🟢 Active members' : kind === 'alerts' ? '🔔 Alerts' : '💬 Messages';
    dd.setAttribute('aria-label', dd.querySelector('.dd-h2 b').textContent);
    const bb = box.getBoundingClientRect(); dd.style.top = Math.round(bb.bottom + 8) + 'px'; dd.style.maxHeight = `calc(100dvh - ${Math.round(bb.bottom + 8)}px - 12px)`;
    dd.hidden = false; btn?.setAttribute('aria-expanded', 'true'); fillDrop(kind);
  };

  // ---------- 🔔 bell, 💬 clubhouse button, in-app banners ----------
  const dot = (el, n) => { const i = el?.querySelector('.hdr-n'); if (!i) return; i.hidden = !n; i.textContent = n > 99 ? '99+' : String(n || ''); };
  const SEEN = 'norex.nseen', seenId = () => { try { return +sessionStorage.getItem(SEEN) || 0; } catch { return 0; } };
  const setSeen = (v) => { try { sessionStorage.setItem(SEEN, String(v)); } catch {} };
  const room = (l) => (/^feed\.html/.test(l || '') ? 'hub-clubhouse.html#ch-feed' : /^messages\.html/.test(l || '') ? 'hub-clubhouse.html#ch-chat' : /^members\.html#feedback/.test(l || '') ? 'hub-clubhouse.html#ch-feedback' : /^https:/.test(l || '') ? l : 'hub.html#lk-alerts');
  const banner = (n) => {
    if (d.querySelector(`.nx-note[data-id="${n.id}"]`) || d.querySelectorAll('.nx-note').length >= 2) return;
    const b = d.createElement('div'); b.className = 'nx-note'; b.dataset.id = n.id; b.setAttribute('role', 'status');
    b.innerHTML = `<span class="ni" aria-hidden="true">${esc(n.icon || '🔔')}</span><a href="${esc(room(n.link))}"><b>${esc(n.title)}</b>${n.body ? `<span>${esc(String(n.body).slice(0, 90))}</span>` : ''}</a><button type="button" class="x" aria-label="Dismiss">✕</button>`;
    const out = () => { b.classList.add('out'); setTimeout(() => b.remove(), 300); };
    b.querySelector('.x').onclick = out; setTimeout(out, 9000); d.body.appendChild(b);
  };
  // D1 usage: one tab polls for all of them. The tab that holds the short lease in localStorage asks the Worker and tells the
  // others over a BroadcastChannel; a hidden tab neither polls nor keeps the lease, so a visible one takes over.
  const LEAD = 'norex.hdrlead', LAST = 'norex.hdrlast', LEASE_MS = 150e3, tabId = Math.random().toString(36).slice(2);
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('norex-hdr') : null;
  const who = () => String(A?.id ?? A?.name ?? '');
  let shown = 0, alertMs = 120e3, alertTimer = null; // the server sets the rhythm (plan: 120 s free, 60 s paid)
  const setAlertMs = (ms) => { if (ms === alertMs && alertTimer) return; alertMs = ms; clearInterval(alertTimer); alertTimer = setInterval(pollAlerts, alertMs); };
  const paintAlerts = (a) => {
    if (!a || !bell) return;
    bell.hidden = false; dot(bell, a.unread | 0);
    if (a.chats != null) { chat.hidden = false; dot(chat, a.chats | 0); }
    shown = a.unread | 0;
  };
  const lease = () => { try { return JSON.parse(localStorage.getItem(LEAD) || 'null'); } catch { return null; } };
  const lead = () => {
    try {
      const v = lease();
      if (v && v.id !== tabId && Date.now() - v.t < LEASE_MS) return false;
      localStorage.setItem(LEAD, JSON.stringify({ id: tabId, t: Date.now() }));
    } catch {}
    return true;
  };
  const release = () => { try { if (lease()?.id === tabId) localStorage.removeItem(LEAD); } catch {} }; // a hidden or closed tab hands over at once
  const last = () => { try { const v = JSON.parse(localStorage.getItem(LAST) || 'null'); return v && v.w === who() && Date.now() - v.at < 10 * 60e3 ? v : null; } catch { return null; } };
  const share = (a) => { try { localStorage.setItem(LAST, JSON.stringify(a)); } catch {} try { bc?.postMessage(a); } catch {} };
  // Banners for new notifications: each tab keeps its own "seen" marker, so a tab that learns of a rise in the unread count fetches them itself.
  const fetchBanners = () => A.call('/api/notify').then((r) => {
    const fresh = (r.items || []).filter((n) => !n.read && !n.readAt && n.id > seenId() && Date.now() - n.at < 15 * 60e3).sort((x, y) => x.id - y.id);
    const top = Math.max(seenId(), ...(r.items || []).map((n) => n.id || 0));
    if (!/\/hub\.html$/.test(location.pathname)) fresh.slice(-2).forEach(banner);
    setSeen(top);
  }).catch(() => {});
  const heard = (a) => {
    if (!a || a.w !== who()) return;
    const rose = (a.unread | 0) > shown && !d.hidden;
    paintAlerts(a);
    if (rose) fetchBanners();
  };
  if (bc) bc.onmessage = (e) => heard(e.data);
  d.addEventListener('visibilitychange', () => { if (d.hidden) release(); });
  addEventListener('pagehide', release);
  const pollAlerts = () => {
    if (!A?.session || d.hidden) return;
    if (!lead()) { heard(last()); return; }
    const prev = last() || {}, out = { w: who(), at: Date.now(), unread: prev.unread | 0, chats: prev.chats ?? null };
    let got = false;
    const count = A.call('/api/notify/count').then((c) => {
      out.unread = c.unread | 0; got = true; paintAlerts(out);
      if (c.pollSec) setAlertMs(Math.min(300, Math.max(30, c.pollSec | 0)) * 1000);
      return c.unread > 0 ? fetchBanners() : null;
    }).catch(() => {});
    const chats = A.call('/api/chats').then((r) => { out.chats = (r.chats || []).reduce((n, c) => n + (c.unread || 0), 0); got = true; paintAlerts(out); }).catch(() => {});
    Promise.all([count, chats]).then(() => { if (got) share(out); }); // a failed fetch keeps the last known number
  };

  // ---------- 🔴 "N live" chip (flag memberLive; botfeat.js polls and fires nx:live). Hidden when nobody is on air; links to the strip. ----------
  const paintLive = () => {
    if (!live) return;
    const n = Math.max(0, (window.NorexBot?.live?.n) | 0), on = n > 0 && !!A?.token && (A.features || []).includes('memberLive');
    live.hidden = !on; if (!on) return;
    live.querySelector('b').textContent = String(n); live.setAttribute('aria-label', `${n} live now. See who is streaming`); live.title = n === 1 ? '1 live now' : `${n} live now`;
    live.href = d.querySelector('[data-live-strip]') ? '#live' : 'index.html#live';
  };
  d.addEventListener('nx:live', paintLive);

  // ---------- mount ----------
  const mount = () => {
    const w = wrap(); if (!w || d.getElementById('hdrR')) return;
    box = d.createElement('div'); box.id = 'hdrR'; box.className = 'hdr-r';
    box.innerHTML = '<button type="button" class="hdr-s" aria-label="Search players, pages and settings" title="Search ( / )"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg><kbd class="hdr-k" aria-hidden="true">/</kbd></button>';
    if (A?.session) {
      const ac = d.createElement('button'); ac.type = 'button'; ac.className = 'ac'; ac.setAttribute('aria-haspopup', 'dialog'); ac.setAttribute('aria-expanded', 'false'); ac.setAttribute('aria-label', `Account: ${A.name || 'Member'}`);
      ac.innerHTML = `<span class="pav">${A.avatar ? `<img src="${esc(A.avatar)}" alt="" width="34" height="34">` : esc((A.name || 'M')[0].toUpperCase())}</span><span class="acn">${esc(A.name || 'Member')}</span>`;
      pill = d.createElement('button'); pill.type = 'button'; pill.className = 'hdr-on hdr-badge'; pill.hidden = true; pill.title = 'Who is active'; pill.setAttribute('aria-haspopup', 'dialog'); pill.setAttribute('aria-expanded', 'false'); pill.innerHTML = '<i aria-hidden="true"></i><b>0</b>'; pill.onclick = (e) => { e.stopPropagation(); toggleDrop('active', pill); };
      live = d.createElement('a'); live.className = 'hdr-lv'; live.hidden = true; live.href = 'index.html#live'; live.innerHTML = '<i aria-hidden="true"></i><b>0</b><span>live</span>';
      bell = d.createElement('a'); bell.className = 'hdr-i hdr-bell'; bell.href = 'hub.html#lk-alerts'; bell.hidden = true; bell.setAttribute('aria-label', 'Alerts'); bell.title = 'Alerts'; bell.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg><i class="hdr-n" hidden></i>';
      chat = d.createElement('a'); chat.className = 'hdr-i hdr-chat'; chat.href = 'hub-clubhouse.html#ch-chat'; chat.hidden = true; chat.setAttribute('aria-label', 'Clubhouse feed and messages'); chat.title = 'Clubhouse feed & messages'; chat.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z"/></svg><i class="hdr-n" hidden></i>';
      bell.onclick = (e) => { e.preventDefault(); toggleDrop('alerts', bell); }; chat.onclick = (e) => { e.preventDefault(); toggleDrop('chats', chat); }; bell.setAttribute('aria-haspopup', 'dialog'); chat.setAttribute('aria-haspopup', 'dialog');
      const av = d.createElement('div'); av.className = 'hdr-av'; ac.onclick = () => { closeDrop(); toggleMenu(); }; av.append(ac, pill); box.append(live, bell, chat, av); paintLive(); (A.ready || Promise.resolve()).then(paintLive);
      if (viewAs() && realOwner()) { const ribbon = d.createElement('div'); ribbon.className = 'hdr-va'; ribbon.innerHTML = '👁️ Viewing the site as a <b>' + (viewAs() === 'guest' ? 'guest' : 'member') + '</b> <button type="button">Back to owner</button>'; ribbon.querySelector('button').onclick = () => setViewAs(''); d.body.insertBefore(ribbon, d.body.firstChild); }
      poll(); pollAlerts(); timer = setInterval(poll, 120e3); setAlertMs(alertMs); d.addEventListener('visibilitychange', () => { if (!d.hidden) { poll(); pollAlerts(); } });
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
