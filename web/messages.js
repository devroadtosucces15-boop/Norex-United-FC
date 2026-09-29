// Messaging on the client (roadmap P6.3) – messages.html [data-messages].
// Chat list + thread. P6.3b: the open chat gets a WebSocket to its Durable Object room (new messages, typing,
// removals pushed live); polling every 6s stays as the fallback while the socket is down. Links are clickable,
// direct image links preview inline, and "🔎 Search" looks through the text of every chat you're in.
// Group chats can be renamed/re-emoji'd and have members added/removed mid-life (P6.3c).
// Owners/founders can flip "👁 All chats" to read (not post into) every DM and group chat – disclosed here.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const MAPI = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const session = () => { try { const t = localStorage.getItem('norex_session'); const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))); return p.exp > Date.now() / 1000 ? { token: t, ...p } : null; } catch { return null; } };
  const call = async (path, body) => {
    const s = session();
    const r = await fetch(MAPI + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { ...(s ? { Authorization: `Bearer ${s.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  const toast = (m, bad) => UI.toast(m, bad ? 'bad' : 'ok');
  const loginUrl = () => `${MAPI}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
  const GROUP_EMOJI = ['💬', '⚽', '🔥', '🎮', '🏆', '🤝', '📣', '⚡'];

  let el, me = null, chats = [], canReadAll = false, canModerate = false, viewingAll = false;
  let active = null, thread = null, msgs = [], lastId = 0, poll = 0;
  let ws = null, wsFor = 0, wsRetry = 0, wsPing = 0, typingSent = 0, typingTimer = 0, ticks = 0, searchQ = '', searchHits = null;
  const typers = new Map(); // userId -> { n, until }

  // Links become safe anchors; direct image links (https only) also preview under the text.
  const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;
  function fmt(text) {
    const imgs = [];
    const html = esc(text).replace(URL_RE, (u) => {
      const raw = u.replace(/&amp;/g, '&');
      if (/^https:\/\/[^?#]+\.(png|jpe?g|gif|webp)([?#].*)?$/i.test(raw) && imgs.length < 3) imgs.push(u);
      return `<a href="${u}" target="_blank" rel="noopener nofollow ugc">${u.length > 60 ? `${u.slice(0, 57)}…` : u}</a>`;
    }).replace(/\n/g, '<br>');
    return `<p>${html}</p>${imgs.map((u) => `<a class="mc-img" href="${u}" target="_blank" rel="noopener nofollow ugc"><img src="${u}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`).join('')}`;
  }

  const chatEmoji = (c) => c.kind === 'group' ? esc(c.emoji || '💬') : '';
  function avatarOf(c, size) {
    return c.kind === 'dm' ? UI.avatar(c.avatar, c.name, size) : `<span class="mc-gav" style="--s:${size}px" aria-hidden="true">${chatEmoji(c)}</span>`;
  }

  // ---------- list ----------
  function chatRow(c) {
    return `<li class="mc-row${c.id === active ? ' on' : ''}${c.unread ? ' unread' : ''}">
<button type="button" class="mc-row-btn" data-act="open" data-id="${c.id}">${avatarOf(c, 40)}
<span class="mc-row-main"><b>${esc(c.name)}</b><small>${c.last ? `${c.last.mine ? 'You: ' : ''}${esc(c.last.text)}` : 'No messages yet'}</small></span>
<span class="mc-row-meta">${c.last ? UI.time(c.last.at) : ''}${c.unread ? `<i class="mc-badge">${c.unread > 9 ? '9+' : c.unread}</i>` : ''}</span></button></li>`;
  }
  function listPane() {
    const rows = chats.length ? chats.map(chatRow).join('') : `<li class="mc-empty">${UI.empty({ icon: '💬', title: viewingAll ? 'No chats yet' : 'No messages yet', text: viewingAll ? '' : 'Start a DM or a group chat with the squad.' })}</li>`;
    return `<aside class="mc-list${active ? ' side' : ''}"><div class="mc-list-head"><button type="button" class="btn sm" data-act="new-dm">✉️ New message</button><button type="button" class="btn sm ghost" data-act="new-group">👥 New group</button>
${canReadAll ? `<label class="mc-readall" data-tip="Owners/founders can read every chat, for moderation"><input type="checkbox" ${viewingAll ? 'checked' : ''} data-act="viewall"> 👁 All chats</label>` : ''}</div>
<input class="mc-find" type="search" placeholder="🔎 Search messages…" aria-label="Search messages" value="${esc(searchQ)}" ${viewingAll ? 'hidden' : ''}>
<ul class="mc-chats">${searchHits ? searchList() : rows}</ul></aside>`;
  }
  function searchList() {
    if (!searchHits.length) return `<li class="mc-empty muted small">No messages match “${esc(searchQ)}”.</li>`;
    return searchHits.map((m) => `<li class="mc-row"><button type="button" class="mc-row-btn" data-act="open" data-id="${m.chatId}">${m.chatEmoji ? `<span class="mc-gav" style="--s:40px" aria-hidden="true">${esc(m.chatEmoji)}</span>` : UI.avatar(m.by.a, m.by.n, 40)}
<span class="mc-row-main"><b>${esc(m.chatName)}</b><small>${m.by.id === me ? 'You' : esc(m.by.n)}: ${esc(m.text.length > 90 ? `${m.text.slice(0, 89)}…` : m.text)}</small></span>
<span class="mc-row-meta">${UI.time(m.at)}</span></button></li>`).join('');
  }

  // ---------- thread ----------
  function bubble(m) {
    const mine = m.by.id === me;
    const showName = !mine && thread?.kind === 'group';
    return `<div class="mc-msg${mine ? ' mine' : ''}" data-id="${m.id}">${!mine ? UI.avatar(m.by.a, m.by.n, 26) : ''}
<div class="mc-bub"><div class="mc-bub-in">${showName ? `<b class="mc-who">${esc(m.by.n)}</b>` : ''}${fmt(m.text)}</div>
<div class="mc-bub-meta">${UI.time(m.at)}${m.reported ? ' · 🚩 reported' : ''}${!mine && !viewingAll ? `<button type="button" class="linkish" data-act="report" data-id="${m.id}">Report</button>` : ''}</div></div></div>`;
  }
  function threadPane() {
    if (!active) return `<section class="mc-thread mc-empty-thread">${UI.empty({ icon: '💬', title: 'Pick a chat', text: 'Choose a conversation on the left, or start a new one.' })}</section>`;
    if (!thread) return `<section class="mc-thread">${UI.skeleton('rows', 4)}</section>`;
    const canPost = !viewingAll && !thread.readonly;
    return `<section class="mc-thread" data-id="${active}">
<header class="mc-t-head"><button type="button" class="mc-back" data-act="back" aria-label="Back to chats">←</button>${avatarOf(thread, 34)}<div class="mc-t-title"><b>${esc(thread.name)}</b><small>${thread.kind === 'group' ? `${thread.members.length} member${thread.members.length === 1 ? '' : 's'} · ` : ''}<span class="mc-live${ws?.readyState === 1 && wsFor === active ? ' on' : ''}" data-live>${ws?.readyState === 1 && wsFor === active ? 'Live' : 'Syncing'}</span></small></div>
<span class="mc-more-wrap"><button type="button" class="mc-more" data-act="menu" aria-label="Chat options" aria-expanded="false">⋯</button><span class="mc-menu" hidden>${thread.kind === 'group' && thread.mine ? '<button type="button" data-act="settings">⚙️ Group settings</button><button type="button" data-act="leave">🚪 Leave group</button>' : '<span class="mc-menu-empty">No options</span>'}</span></span></header>
${viewingAll ? '<div class="mc-banner">👁 Viewing as owner – read-only, not counted as a reply.</div>' : ''}
<div class="mc-msgs" data-msgs>${msgs.length ? msgs.map(bubble).join('') : `<p class="muted small mc-first">${thread.kind === 'dm' ? 'Say hello 👋' : 'Nobody has said anything yet.'}</p>`}</div>
<div class="mc-typing" data-typing aria-live="polite"></div>
${canPost ? `<form class="mc-compose" id="mc-compose"><textarea name="text" rows="1" maxlength="2000" placeholder="Message…" aria-label="Message" data-mention></textarea><button class="btn sm" type="submit">Send</button></form>` : ''}
</section>`;
  }

  function draw() {
    // Keep a half-typed message (and the search box) across redraws – polls and pushes repaint the whole pane.
    const ta = $('#mc-compose textarea', el), draft = ta?.value ?? '', hadFocus = document.activeElement === ta;
    const findFocus = document.activeElement?.classList?.contains('mc-find');
    el.innerHTML = `<div class="mc-shell${active ? ' mc-open' : ''}">${listPane()}${threadPane()}</div>`;
    const msgsEl = $('[data-msgs]', el);
    if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
    const ta2 = $('#mc-compose textarea', el);
    if (ta2 && draft) ta2.value = draft;
    if (ta2 && hadFocus) ta2.focus();
    if (findFocus) { const f = $('.mc-find', el); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
    paintTyping();
    UI.refreshTimes(el);
  }

  // ---------- live room (P6.3b) ----------
  function paintTyping() {
    const box = $('[data-typing]', el);
    if (!box) return;
    const now = Date.now();
    for (const [u, t] of typers) if (t.until < now) typers.delete(u);
    const names = [...typers.values()].map((t) => t.n);
    box.innerHTML = names.length ? `<span class="mc-dots" aria-hidden="true"><i></i><i></i><i></i></span> ${esc(names.slice(0, 2).join(' & '))}${names.length > 2 ? ' + others' : ''} ${names.length === 1 ? 'is' : 'are'} typing…` : '';
  }
  function paintLive() {
    const l = $('[data-live]', el);
    if (!l) return;
    const on = ws?.readyState === 1 && wsFor === active;
    l.classList.toggle('on', on); l.textContent = on ? 'Live' : 'Syncing';
  }
  function disconnect() {
    clearTimeout(wsRetry); clearInterval(wsPing); typers.clear();
    if (ws) { ws.onclose = null; try { ws.close(1000); } catch { /* already closed */ } }
    ws = null; wsFor = 0;
  }
  function connect(id) {
    disconnect();
    const s = session();
    if (!s || !MAPI || !window.WebSocket) return;
    let sock;
    try { sock = new WebSocket(`${MAPI.replace(/^http/, 'ws')}/api/chats/${id}/ws?t=${encodeURIComponent(s.token)}`); } catch { return; }
    ws = sock; wsFor = id;
    sock.onopen = () => { paintLive(); wsPing = setInterval(() => { if (sock.readyState === 1) sock.send('ping'); }, 30000); };
    sock.onmessage = (e) => { if (e.data !== 'pong') { try { onPush(JSON.parse(e.data)); } catch { /* ignore junk */ } } };
    sock.onclose = () => {
      clearInterval(wsPing);
      if (ws !== sock) return;
      ws = null; paintLive();
      if (active === id && !document.hidden) wsRetry = setTimeout(() => { if (active === id) connect(id); }, 8000); // polling covers the gap
    };
  }
  function onPush(ev) {
    if (ev.t === 'typing' && ev.u !== me) { typers.set(ev.u, { n: ev.n, until: Date.now() + 5000 }); paintTyping(); setTimeout(paintTyping, 5200); return; }
    if (ev.t === 'msg' && ev.message?.chatId === active) {
      typers.delete(ev.message.by.id);
      if (!msgs.some((m) => m.id === ev.message.id)) { msgs.push(ev.message); lastId = Math.max(lastId, ev.message.id); draw(); }
      if (!thread?.readonly && !viewingAll && !document.hidden) call(`/api/chats/${active}/read`).catch(() => {});
      loadChats().catch(() => {});
      return;
    }
    if (ev.t === 'removed') { const n = msgs.length; msgs = msgs.filter((m) => m.id !== ev.id); if (msgs.length !== n) draw(); return; }
    if (ev.t === 'chat') loadChats().then(() => { const c = chats.find((x) => x.id === active); if (c && thread) { thread = { ...c, readonly: thread.readonly }; draw(); } }).catch(() => {});
  }
  function sendTyping() {
    if (ws?.readyState !== 1 || Date.now() - typingSent < 3000) return;
    typingSent = Date.now();
    ws.send(JSON.stringify({ t: 'typing' }));
  }
  async function runSearch(q) {
    searchQ = q;
    if (q.length < 2) { searchHits = null; draw(); return; }
    try { const d = await call(`/api/chats/search?q=${encodeURIComponent(q)}`); if (searchQ === q) { searchHits = d.results; draw(); } }
    catch (e) { toast(e.message, true); }
  }

  // ---------- data ----------
  async function loadChats() {
    const d = await call(`/api/chats${viewingAll ? '?all=1' : ''}`);
    chats = d.chats; canReadAll = d.canReadAll; canModerate = d.canModerate;
    draw();
  }
  async function openChat(id, pushHash = true) {
    active = id; thread = null; msgs = []; lastId = 0;
    draw();
    if (pushHash) history.replaceState(null, '', `#c${id}`);
    try {
      const d = await call(`/api/chats/${id}/messages`);
      msgs = d.messages; lastId = msgs.length ? msgs[msgs.length - 1].id : 0;
      const c = chats.find((x) => x.id === id);
      thread = { ...c, readonly: d.readonly };
      if (c) { c.unread = 0; }
      draw();
      if (!d.readonly) call(`/api/chats/${id}/read`).catch(() => {});
      if (active === id) connect(id);
    } catch (e) { toast(e.message, true); active = null; draw(); }
  }
  async function pollNow() {
    if (document.hidden) return;
    const live = ws?.readyState === 1 && wsFor === active;
    ticks++;
    if (live && ticks % 5) return; // socket up: only refresh the chat list (other chats' unread) every ~30s
    try { await loadChats(); } catch { /* transient */ }
    if (!active || viewingAll || live) return;
    try {
      const d = await call(`/api/chats/${active}/messages`);
      const fresh = d.messages.filter((m) => m.id > lastId);
      if (fresh.length) { msgs = [...msgs, ...fresh]; lastId = fresh[fresh.length - 1].id; draw(); if (!d.readonly) call(`/api/chats/${active}/read`).catch(() => {}); }
    } catch { /* transient */ }
  }

  // ---------- new chat / group ----------
  async function pickPerson(root, onPick) {
    const input = $('.mc-search', root), list = $('.mc-picklist', root);
    let t = 0;
    const search = async (q) => {
      try {
        const { people } = await call(`/api/chats/people?q=${encodeURIComponent(q)}`);
        list.innerHTML = people.length ? people.map((p) => `<li role="option"><button type="button" class="mc-pick-btn" data-id="${p.id}" data-n="${esc(p.n)}" data-a="${esc(p.a || '')}">${UI.avatar(p.a, p.n, 28)}<span><b>${esc(p.n)}</b>${p.tag ? `<small>@${esc(p.tag)}</small>` : ''}</span></button></li>`).join('') : '<li class="muted small">No matches</li>';
      } catch (e) { toast(e.message, true); }
    };
    search('');
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => search(input.value.trim()), 150); });
    list.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) onPick({ id: b.dataset.id, n: b.dataset.n, a: b.dataset.a }); });
  }
  async function newDM() {
    const picked = await UI.modal({
      title: 'New message', icon: '✉️', actions: [{ label: 'Cancel', value: null, kind: 'ghost' }],
      body: '<input class="mc-search" type="search" placeholder="Search a member…" aria-label="Search member" autofocus><ul class="mc-picklist" role="listbox"></ul>',
      onOpen: (dlg, close) => pickPerson(dlg, (p) => close(p.id)),
    });
    if (!picked) return;
    try { const { chat } = await call('/api/chats', { kind: 'dm', user: picked }); await loadChats(); await openChat(chat.id); }
    catch (e) { toast(e.message, true); }
  }
  async function newGroup() {
    const picked = [];
    let created = null;
    await UI.modal({
      title: 'New group chat', icon: '👥', wide: true, actions: [{ label: 'Cancel', value: null, kind: 'ghost' }],
      body: `<input class="mc-gname" type="text" maxlength="40" placeholder="Group name" aria-label="Group name">
<div class="mc-emoji" role="radiogroup" aria-label="Icon">${GROUP_EMOJI.map((e, i) => `<label><input type="radio" name="ge" value="${e}"${i === 0 ? ' checked' : ''}><span>${e}</span></label>`).join('')}</div>
<input class="mc-search" type="search" placeholder="Add members…" aria-label="Add members"><ul class="mc-picklist" role="listbox"></ul>
<div class="mc-picked" data-picked></div>
<button type="button" class="btn sm mc-create" data-act="create-group">Create group</button>`,
      onOpen: (dlg, close) => {
        const paintPicked = () => { $('[data-picked]', dlg).innerHTML = picked.map((p) => `<span class="chip">${esc(p.n)}<button type="button" data-rm="${p.id}" aria-label="Remove ${esc(p.n)}">×</button></span>`).join(''); };
        pickPerson(dlg, (p) => { if (!picked.some((x) => x.id === p.id)) { picked.push(p); paintPicked(); } });
        // The create button lives in the body (not the footer), so the modal's own backdrop/footer handler ignores it.
        dlg.addEventListener('click', async (e) => {
          const rm = e.target.closest('[data-rm]');
          if (rm) { const i = picked.findIndex((p) => p.id === rm.dataset.rm); if (i > -1) picked.splice(i, 1); paintPicked(); return; }
          if (!e.target.closest('[data-act=create-group]')) return;
          const name = $('.mc-gname', dlg).value.trim();
          const emoji = $('input[name=ge]:checked', dlg)?.value || '💬';
          if (!name) return toast('Give the group a name.', true);
          if (!picked.length) return toast('Add at least one member.', true);
          try { created = (await call('/api/chats', { kind: 'group', name, emoji, members: picked.map((p) => p.id) })).chat; close(true); }
          catch (er) { toast(er.message, true); }
        });
      },
    });
    if (created) { await loadChats(); await openChat(created.id); }
  }

  // ---------- group settings (P6.3c) ----------
  function membersList(c) {
    return c.members.map((m) => `<li class="chip" data-uid="${m.id}">${esc(m.n)}${m.id === me ? ' (you)' : `<button type="button" data-rm-member="${m.id}" aria-label="Remove ${esc(m.n)}">×</button>`}</li>`).join('');
  }
  async function groupSettings() {
    const c = thread;
    if (!c || c.kind !== 'group') return;
    await UI.modal({
      title: 'Group settings', icon: '⚙️', wide: true, actions: [{ label: 'Close', value: null, kind: 'ghost' }],
      body: `<input class="mc-gname" type="text" maxlength="40" placeholder="Group name" value="${esc(c.name)}" aria-label="Group name">
<div class="mc-emoji" role="radiogroup" aria-label="Icon">${GROUP_EMOJI.map((e) => `<label><input type="radio" name="ge" value="${e}"${e === (c.emoji || '💬') ? ' checked' : ''}><span>${e}</span></label>`).join('')}</div>
<button type="button" class="btn sm mc-create" data-act="save-settings">Save name/icon</button>
<h4>Members</h4><ul class="mc-picked" data-members>${membersList(c)}</ul>
<input class="mc-search" type="search" placeholder="Add members…" aria-label="Add members"><ul class="mc-picklist" role="listbox"></ul>`,
      onOpen: (dlg, close) => {
        const applyChat = (chat) => { thread = { ...thread, ...chat }; active = chat.id; $('[data-members]', dlg).innerHTML = membersList(thread); draw(); loadChats(); };
        pickPerson(dlg, async (p) => {
          try { const { chat } = await call(`/api/chats/${active}/members`, { add: [p.id] }); toast(`Added ${p.n}.`); applyChat(chat); }
          catch (er) { toast(er.message, true); }
        });
        dlg.addEventListener('click', async (e) => {
          if (e.target.closest('[data-act=save-settings]')) {
            const name = $('.mc-gname', dlg).value.trim();
            const emoji = $('input[name=ge]:checked', dlg)?.value;
            if (!name) return toast('Give the group a name.', true);
            try { const { chat } = await call(`/api/chats/${active}/settings`, { name, emoji }); toast('Saved.'); applyChat(chat); }
            catch (er) { toast(er.message, true); }
            return;
          }
          const rm = e.target.closest('[data-rm-member]');
          if (rm) {
            if (!(await UI.confirm({ title: 'Remove this member?', text: 'They can be added back later.', ok: 'Remove', danger: true }))) return;
            try { const { chat } = await call(`/api/chats/${active}/members/${rm.dataset.rmMember}`, {}); toast('Removed.'); applyChat(chat); }
            catch (er) { toast(er.message, true); }
          }
        });
      },
    });
    draw();
  }

  // ---------- events ----------
  function wire() {
    el.addEventListener('click', async (e) => {
      const open = e.target.closest('[data-act=open]');
      if (open) { openChat(+open.dataset.id); return; }
      if (e.target.closest('[data-act=back]')) { disconnect(); active = null; thread = null; history.replaceState(null, '', location.pathname + location.search); draw(); return; }
      if (e.target.closest('[data-act=new-dm]')) { newDM(); return; }
      if (e.target.closest('[data-act=new-group]')) { newGroup(); return; }
      if (e.target.closest('[data-act=settings]')) { groupSettings(); return; }
      const menuBtn = e.target.closest('[data-act=menu]');
      if (menuBtn) { const m = menuBtn.nextElementSibling; const open2 = m.hidden; $$('.mc-menu', el).forEach((x) => x.hidden = true); m.hidden = !open2; menuBtn.setAttribute('aria-expanded', String(!open2)); return; }
      if (e.target.closest('[data-act=leave]')) {
        if (!(await UI.confirm({ title: 'Leave this group?', text: 'You can be added back by another member.', ok: 'Leave', danger: true }))) return;
        try { await call(`/api/chats/${active}/leave`, {}); toast('Left the group.'); active = null; thread = null; await loadChats(); } catch (er) { toast(er.message, true); }
        return;
      }
      const rep = e.target.closest('[data-act=report]');
      if (rep) {
        let reason = '';
        const v = await UI.modal({
          title: 'Report this message', icon: '🚩', body: '<form onsubmit="return false"><textarea name="reason" rows="3" maxlength="200" placeholder="What’s wrong with it? (optional)" aria-label="Reason"></textarea></form>',
          actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '🚩 Report', value: 'ok', kind: 'danger' }],
          onOpen: (d) => d.addEventListener('input', () => { reason = $('form', d).reason.value; }),
        });
        if (v !== 'ok') return;
        try { await call(`/api/chats/${active}/messages/${rep.dataset.id}/report`, { reason }); toast('Reported – the managers will take a look'); openChat(active, false); } catch (er) { toast(er.message, true); }
        return;
      }
      if (!e.target.closest('.mc-menu')) $$('.mc-menu', el).forEach((x) => x.hidden = true);
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-act=viewall]')) { disconnect(); viewingAll = e.target.checked; searchQ = ''; searchHits = null; active = null; thread = null; loadChats(); }
    });
    el.addEventListener('submit', async (e) => {
      if (e.target.id !== 'mc-compose') return;
      e.preventDefault();
      const ta = $('textarea', e.target), text = ta.value.trim();
      if (!text || !active) return;
      ta.disabled = true;
      try {
        const { message } = await call(`/api/chats/${active}/messages`, { text });
        ta.value = '';
        if (!msgs.some((m) => m.id === message.id)) msgs.push(message);
        lastId = Math.max(lastId, message.id); draw();
        loadChats();
      } catch (er) { toast(er.message, true); } finally { ta.disabled = false; ta.focus?.(); }
    });
    el.addEventListener('input', (e) => {
      if (e.target.matches('#mc-compose textarea')) sendTyping();
      if (e.target.matches('.mc-find')) { clearTimeout(typingTimer); const q = e.target.value.trim(); typingTimer = setTimeout(() => runSearch(q), 250); }
    });
    el.addEventListener('keydown', (e) => {
      if (e.target.matches('#mc-compose textarea') && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#mc-compose').requestSubmit(); }
    });
  }

  async function init() {
    el = $('[data-messages]');
    if (!el) return;
    const s = session();
    if (!s) { el.innerHTML = `<div class="mc-empty">${UI.empty({ icon: '🔒', title: 'Log in to see your messages', action: `<a class="btn sm" href="${loginUrl()}">Log in with Discord</a>` })}</div>`; return; }
    me = s.u;
    el.innerHTML = `<div class="mc-shell">${UI.skeleton('rows', 5)}</div>`;
    wire();
    try {
      await loadChats();
      NXSocial.autocomplete(el, call);
      const h = location.hash.match(/^#c(\d+)$/);
      if (h) openChat(+h[1], false);
    } catch (e) { el.innerHTML = `<div class="mc-empty">${UI.empty({ icon: '⚠️', title: 'Could not load messages', text: e.message })}</div>`; }
    poll = setInterval(pollNow, 6000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { pollNow(); if (active && !viewingAll && ws?.readyState !== 1) connect(active); } });
  }
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('pagehide', () => { clearInterval(poll); disconnect(); });
})();
