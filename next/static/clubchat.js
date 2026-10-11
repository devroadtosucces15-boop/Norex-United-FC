// Hub › Clubhouse › Chat room: DMs and group chats (/api/chats). The open chat holds a socket to its live room
// (/api/chats/<id>/ws?t=<session> – a browser can't send headers on a socket) for new messages, removals and typing;
// while the socket is down it checks for new messages every few seconds instead. Sends are optimistic: a message
// that can't reach the server waits in a retry queue (kept on this device) and goes out in order when the link is back.
// Also here: 🎮 On Discord – who is online in the club server and who is in voice, from Discord's public widget feed.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const ini = (n) => String(n || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  const av = (a, n, s = 34) => a ? `<img class="sq-av" src="${esc(a)}" alt="" width="${s}" height="${s}" loading="lazy" data-ini="${esc(ini(n))}" style="--s:${s}px;--h:${hue(n)}">` : `<span class="sq-av ini" style="--s:${s}px;--h:${hue(n)}" aria-hidden="true">${esc(ini(n))}</span>`;
  const clock = (t) => { try { return new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const when = (t) => { const m = Math.round((Date.now() - t) / 60e3); if (m < 1) return 'now'; if (m < 60) return `${m}m`; if (m < 1440) return `${Math.floor(m / 60)}h`; try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch { return ''; } };
  const day = (t) => { const a = new Date(t), b = new Date(); const k = (x) => x.toDateString(); if (k(a) === k(b)) return 'Today'; b.setDate(b.getDate() - 1); if (k(a) === k(b)) return 'Yesterday'; try { return a.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }); } catch { return ''; } };
  const linkify = (s) => esc(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
  const ls = { get: (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  // ================= 💬 chat room =================
  const box = $('#chchat');
  if (box && API && A?.token) chatRoom();
  else if (box) box.innerHTML = '<p class="muted small">The chat room opens here for signed-in members.</p>';

  function chatRoom() {
    const me = String(A.session?.u ?? ''), QK = 'nx.chatq';
    const post = (path, body = {}) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const S = { chats: [], active: 0, thread: null, msgs: [], more: false, pending: [], typers: new Map(), live: 'off', pick: null, fresh: new Set() };
    let ws = null, wsFor = 0, wsRetry = 0, wsPing = 0, typingSent = 0, poll = 0, listTick = 0, flushT = 0, flushWait = 2000, flushing = false;
    // the retry queue survives a reload: { chatId: [{ tmp, text, at }] }
    const saveQ = () => { const q = {}; for (const p of S.pending) if (p.state !== 'failed') (q[p.chat] ??= []).push({ tmp: p.tmp, text: p.text, at: p.at }); ls.set(QK, q); };
    for (const [c, list] of Object.entries(ls.get(QK) || {})) for (const p of list || []) S.pending.push({ ...p, chat: +c, state: 'queued' });

    box.innerHTML = `<div class="cc" data-cc><aside class="cc-side" aria-label="Your chats"><div class="cc-sh"><b>Chats</b><button type="button" class="btn gold cc-new" data-new>✏️ New</button></div><div class="cc-list" data-list><div class="sk-wrap"><span class="sk"></span><span class="sk s2"></span><span class="sk s3"></span></div></div></aside>
<section class="cc-main" data-main aria-live="off"><div class="cc-blank"><span>💬</span><b>Pick a chat</b><p class="muted small">Or start a new one with ✏️ New.</p></div></section></div>`;
    const list = $('[data-list]', box), main = $('[data-main]', box), root = $('[data-cc]', box);
    const offline = () => navigator.onLine === false;

    // ---------- chat list ----------
    const unreadAll = () => S.chats.reduce((n, c) => n + (c.unread || 0), 0);
    const chatIcon = (c) => c.kind === 'group' ? `<span class="cc-gi" aria-hidden="true">${esc(c.emoji || '💬')}</span>` : av(c.avatar, c.name, 38);
    const drawList = () => {
      if (!S.chats.length) { list.innerHTML = '<div class="cc-none"><span>👋</span><p class="small">No chats yet.</p><p class="muted tiny">Tap ✏️ New to message a teammate or start a group.</p></div>'; return; }
      list.innerHTML = S.chats.map((c) => { const q = S.pending.filter((p) => p.chat === c.id).length; return `<button type="button" class="cc-item${c.id === S.active ? ' on' : ''}${c.unread ? ' un' : ''}" data-chat="${c.id}">${chatIcon(c)}<span class="cc-it"><b>${esc(c.name)}</b><small class="muted">${q ? `⏳ ${q} waiting to send` : c.last ? `${c.last.mine ? 'You: ' : ''}${esc(c.last.text)}` : c.kind === 'group' ? `${c.members.length} members` : 'Say hello 👋'}</small></span><span class="cc-im">${c.last ? `<small class="muted tiny">${when(c.last.at)}</small>` : ''}${c.unread ? `<span class="cc-badge num">${c.unread > 99 ? '99+' : c.unread}</span>` : ''}</span></button>`; }).join('');
    };
    const loadChats = async () => {
      try { const r = await A.call('/api/chats'); S.chats = r.chats || []; drawList(); return true; }
      catch (e) { if (!S.chats.length) list.innerHTML = e?.status === 404 ? '<div class="cc-none"><span>🌙</span><p class="small">The chat room is not switched on yet.</p></div>' : `<div class="cc-none"><span>📡</span><p class="small">Could not load your chats.</p><button type="button" class="btn ghost" data-relist>↻ Try again</button></div>`; return false; }
    };

    // ---------- open thread ----------
    const status = () => {
      const q = S.pending.filter((p) => p.chat === S.active && p.state === 'queued').length;
      if (offline()) return `<div class="cc-banner off" role="status">📡 <span>You are offline. ${q ? `${q} message${q === 1 ? '' : 's'} will send when you are back.` : 'New messages show up when you are back.'}</span></div>`;
      if (q) return `<div class="cc-banner wait" role="status">⏳ <span>${q} message${q === 1 ? '' : 's'} waiting to send.</span><button type="button" data-flush>Retry now</button></div>`;
      if (S.live === 'poll') return '<div class="cc-banner poll" role="status">🔄 <span>Live link is down. Checking for new messages every few seconds.</span></div>';
      return '';
    };
    const liveDot = () => offline() ? '<span class="cc-live off">● Offline</span>' : S.live === 'on' ? '<span class="cc-live on">● Live</span>' : S.live === 'poll' ? '<span class="cc-live poll">● Checking</span>' : '<span class="cc-live">● Connecting</span>';
    const paintStatus = () => { const b = $('[data-banner]', main); if (b) b.innerHTML = status(); const l = $('[data-livedot]', main); if (l) l.innerHTML = liveDot(); };
    const bubble = (m, prev) => {
      const mine = m.by.id === me, group = S.thread?.kind === 'group', join = prev && prev.by.id === m.by.id && m.at - prev.at < 5 * 60e3 && day(prev.at) === day(m.at);
      const st = m.state ? `<span class="cc-st ${m.state}">${m.state === 'sending' ? '◌ Sending' : m.state === 'queued' ? '⏳ Waiting to send' : `⚠️ ${esc(m.err || 'Not sent')}`}</span>${m.state === 'failed' ? `<span class="cc-fx"><button type="button" data-resend="${m.tmp}">↻ Retry</button><button type="button" data-drop="${m.tmp}">✕ Delete</button></span>` : ''}` : '';
      return `${!prev || day(prev.at) !== day(m.at) ? `<div class="cc-day"><span>${day(m.at)}</span></div>` : ''}<div class="cc-m${mine ? ' me' : ''}${join ? ' join' : ''}${m.state ? ' p ' + m.state : ''}${S.fresh.has(m.id ?? m.tmp) ? ' cc-in' : ''}" data-mid="${m.id ?? ''}">${!mine && !join ? av(m.by.a, m.by.n, 30) : '<span class="cc-gap"></span>'}<div class="cc-b">${!mine && group && !join ? `<b class="cc-who">${esc(m.by.n)}</b>` : ''}<p>${linkify(m.text)}</p><small>${clock(m.at)}${st}</small></div></div>`;
    };
    const drawMsgs = (stick) => {
      const sc = $('[data-msgs]', main); if (!sc) return;
      const near = stick || sc.scrollHeight - sc.scrollTop - sc.clientHeight < 120;
      const mine = S.pending.filter((p) => p.chat === S.active).map((p) => ({ tmp: p.tmp, text: p.text, at: p.at, by: { id: me, n: A.name, a: A.avatar }, state: p.state, err: p.err }));
      const all = [...S.msgs, ...mine];
      sc.innerHTML = `${S.more ? '<button type="button" class="cc-older" data-older>Load earlier messages</button>' : ''}${all.length ? all.map((m, i) => bubble(m, all[i - 1])).join('') : `<div class="cc-blank sm"><span>${S.thread?.kind === 'group' ? esc(S.thread.emoji || '💬') : '👋'}</span><p class="muted small">No messages yet. Say hello.</p></div>`}`;
      S.fresh.clear();
      if (near) sc.scrollTop = sc.scrollHeight;
    };
    const paintTyping = () => {
      const t = $('[data-typing]', main); if (!t) return; const now = Date.now();
      for (const [u, v] of S.typers) if (v.until < now) S.typers.delete(u);
      const names = [...S.typers.values()].map((v) => v.n);
      t.innerHTML = names.length ? `<span class="cc-dots" aria-hidden="true"><i></i><i></i><i></i></span> ${esc(names.slice(0, 2).join(' & '))}${names.length > 2 ? ' + others' : ''} ${names.length === 1 ? 'is' : 'are'} typing…` : '';
    };
    const openChat = async (id) => {
      const c = S.chats.find((x) => x.id === id); if (!c) return;
      S.active = id; S.thread = c; S.msgs = []; S.more = false; S.typers.clear(); S.pick = null;
      root.classList.add('open'); drawList();
      const sub = c.kind === 'group' ? `${c.members.length} members · ${esc(c.members.slice(0, 4).map((m) => m.n).join(', '))}${c.members.length > 4 ? '…' : ''}` : 'Direct message';
      main.innerHTML = `<header class="cc-th"><button type="button" class="cc-back" data-back aria-label="Back to chats">←</button>${chatIcon(c)}<div><b>${esc(c.name)}</b><small class="muted">${sub}</small></div><span data-livedot>${liveDot()}</span></header>
<div data-banner>${status()}</div><div class="cc-msgs" data-msgs tabindex="0" aria-label="Messages"><div class="sk-wrap"><span class="sk"></span><span class="sk s2"></span><span class="sk s3"></span></div></div>
<div class="cc-typing" data-typing aria-live="polite"></div>
<form class="cc-cf" data-send><textarea rows="1" maxlength="2000" placeholder="Message ${esc(c.name)}…" aria-label="Message"></textarea><button type="submit" class="btn" aria-label="Send">➤</button></form>`;
      if (matchMedia('(min-width: 760px)').matches) $('[data-send] textarea', main)?.focus();
      try { history.replaceState(null, '', `#c${id}`); } catch {}
      try {
        const r = await A.call(`/api/chats/${id}/messages`); if (S.active !== id) return;
        S.msgs = r.messages || []; S.more = !!r.more; drawMsgs(true);
        if (r.readonly) { const f = $('[data-send]', main); f.outerHTML = '<p class="muted small cc-ro">👁️ You can read this chat but not post in it.</p>'; }
        if (c.unread) { c.unread = 0; drawList(); post(`/api/chats/${id}/read`).catch(() => {}); }
      } catch (e) { const sc = $('[data-msgs]', main); if (sc) sc.innerHTML = `<div class="cc-blank sm"><span>📡</span><p class="small">${esc(e.message || 'Could not load messages')}</p><button type="button" class="btn ghost" data-reopen>↻ Try again</button></div>`; }
      connect(id); flush();
    };
    const closeChat = () => { root.classList.remove('open'); disconnect(); S.active = 0; S.thread = null; drawList(); main.innerHTML = '<div class="cc-blank"><span>💬</span><b>Pick a chat</b><p class="muted small">Or start a new one with ✏️ New.</p></div>'; try { history.replaceState(null, '', location.pathname + location.search + '#ch-chat'); } catch {} };

    // ---------- the live socket, with polling while it is down ----------
    function disconnect() { clearTimeout(wsRetry); clearInterval(wsPing); stopPoll(); if (ws) { ws.onclose = null; try { ws.close(1000); } catch {} } ws = null; wsFor = 0; S.live = 'off'; }
    function connect(id) {
      disconnect(); if (!window.WebSocket || offline()) { startPoll(); return; }
      let sock; try { sock = new WebSocket(`${API.replace(/^http/, 'ws')}/api/chats/${id}/ws?t=${encodeURIComponent(A.token)}`); } catch { startPoll(); return; }
      ws = sock; wsFor = id; S.live = 'connecting'; paintStatus();
      const giveUp = setTimeout(() => { if (sock.readyState !== 1 && ws === sock) startPoll(); }, 4000); // mock server / blocked socket: fall back quickly
      sock.onopen = () => { clearTimeout(giveUp); stopPoll(); S.live = 'on'; paintStatus(); wsPing = setInterval(() => { if (sock.readyState === 1) sock.send('ping'); }, 30000); catchUp(); flush(); };
      sock.onmessage = (e) => { if (e.data !== 'pong') { try { onPush(JSON.parse(e.data)); } catch {} } };
      sock.onclose = (e) => {
        clearTimeout(giveUp); clearInterval(wsPing); if (ws !== sock) return; ws = null;
        if (e.code === 4403) { M?.toast('You were removed from this chat', { kind: 'err' }); loadChats(); closeChat(); return; }
        startPoll(); if (S.active === id && !d.hidden) wsRetry = setTimeout(() => { if (S.active === id && !ws) connect(id); }, 8000);
      };
    }
    function startPoll() { if (poll) return; S.live = 'poll'; paintStatus(); poll = setInterval(() => { if (!d.hidden && !offline()) catchUp(); }, 5000); }
    function stopPoll() { clearInterval(poll); poll = 0; }
    async function catchUp() {
      const id = S.active; if (!id) return;
      try { const r = await A.call(`/api/chats/${id}/messages`); if (S.active !== id) return; merge(r.messages || []); } catch {}
    }
    function merge(list) {
      const have = new Set(S.msgs.map((m) => m.id)), add = list.filter((m) => !have.has(m.id));
      if (!add.length) return;
      add.forEach((m) => { S.fresh.add(m.id); S.typers.delete(m.by.id); }); S.msgs = [...S.msgs, ...add].sort((a, b) => a.id - b.id);
      drawMsgs(); paintTyping();
      if (add.some((m) => m.by.id !== me)) { if (!d.hidden) post(`/api/chats/${S.active}/read`).catch(() => {}); M?.haptic(); }
      const c = S.chats.find((x) => x.id === S.active), last = S.msgs[S.msgs.length - 1]; if (c && last) { c.last = { text: last.text.slice(0, 90), at: last.at, mine: last.by.id === me }; S.chats.sort((a, b) => (b.last?.at ?? b.at) - (a.last?.at ?? a.at)); drawList(); }
    }
    function onPush(ev) {
      if (ev.t === 'typing' && ev.u !== me) { S.typers.set(ev.u, { n: ev.n, until: Date.now() + 5000 }); paintTyping(); setTimeout(paintTyping, 5200); return; }
      if (ev.t === 'msg' && ev.message) { if (ev.message.chatId === S.active) merge([ev.message]); else loadChats(); return; }
      if (ev.t === 'removed') { const n = S.msgs.length; S.msgs = S.msgs.filter((m) => m.id !== ev.id); if (n !== S.msgs.length) drawMsgs(); return; }
      if (ev.t === 'chat') loadChats();
    }
    const sendTyping = () => { if (ws?.readyState !== 1 || Date.now() - typingSent < 3000) return; typingSent = Date.now(); try { ws.send(JSON.stringify({ t: 'typing' })); } catch {} };

    // ---------- sending + the retry queue ----------
    async function deliver(p) {
      p.state = 'sending'; if (p.chat === S.active) drawMsgs();
      try {
        const r = await post(`/api/chats/${p.chat}/messages`, { text: p.text });
        S.pending = S.pending.filter((x) => x !== p); saveQ();
        if (p.chat === S.active) { if (!S.msgs.some((m) => m.id === r.message.id)) S.msgs.push(r.message); drawMsgs(true); }
        const c = S.chats.find((x) => x.id === p.chat); if (c) { c.last = { text: p.text.slice(0, 90), at: r.message.at, mine: true }; S.chats.sort((a, b) => (b.last?.at ?? b.at) - (a.last?.at ?? a.at)); }
        drawList(); flushWait = 2000; return true;
      } catch (e) {
        const net = !e.status || e.status >= 500; // no answer or a server hiccup: keep it and try again; a refusal (429 slow down, 403 muted) needs the member
        p.state = net ? 'queued' : 'failed'; p.err = net ? '' : e.message; saveQ();
        if (p.chat === S.active) { drawMsgs(); paintStatus(); }
        drawList(); if (!net) M?.toast(e.message || 'Message not sent', { kind: 'err' });
        return false;
      }
    }
    async function flush() {
      clearTimeout(flushT); if (flushing || offline()) return; flushing = true;
      try { let p; while ((p = S.pending.find((x) => x.state === 'queued'))) { if (!(await deliver(p))) break; } } // one at a time, oldest first, picks up messages typed meanwhile
      finally { flushing = false; }
      paintStatus();
      if (S.pending.some((x) => x.state === 'queued')) { flushT = setTimeout(flush, flushWait); flushWait = Math.min(flushWait * 2, 30000); }
    }
    function send(text) {
      const p = { tmp: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`, chat: S.active, text, at: Date.now(), state: 'queued' };
      S.pending.push(p); S.fresh.add(p.tmp); saveQ(); drawMsgs(true); paintStatus();
      flushWait = 2000; flush();
    }

    // ---------- new chat picker (DM or group) ----------
    const EMO = ['💬', '⚽', '🔥', '🎮', '🏆', '🤝', '📣', '⚡'];
    const drawPick = () => {
      const P = S.pick;
      main.innerHTML = `<header class="cc-th"><button type="button" class="cc-back" data-back aria-label="Back to chats">←</button><span class="cc-gi" aria-hidden="true">✏️</span><div><b>New chat</b><small class="muted">${P.group ? 'Pick up to 15 teammates and name the group' : 'Pick a teammate to message'}</small></div></header>
<div class="cc-pick"><div class="chips" role="radiogroup" aria-label="Chat type"><button type="button" role="radio" class="chip${P.group ? '' : ' on'}" aria-checked="${!P.group}" data-kind="dm">🙋 Direct message</button><button type="button" role="radio" class="chip${P.group ? ' on' : ''}" aria-checked="${P.group}" data-kind="group">👥 Group</button></div>
${P.group ? `<div class="cc-gn"><div class="cc-emo" role="radiogroup" aria-label="Group icon">${EMO.map((e) => `<button type="button" role="radio" aria-checked="${e === P.emoji}" class="${e === P.emoji ? 'on' : ''}" data-emo="${e}">${e}</button>`).join('')}</div><input data-gname maxlength="40" placeholder="Group name, e.g. Rush crew" value="${esc(P.name)}" aria-label="Group name"></div>
${P.sel.length ? `<div class="chips cc-sel">${P.sel.map((p) => `<button type="button" class="chip on" data-unsel="${esc(p.id)}">${esc(p.n)} ✕</button>`).join('')}</div>` : ''}` : ''}
<input type="search" data-q placeholder="🔎 Search teammates by name" value="${esc(P.q)}" aria-label="Search teammates" autocomplete="off">
<div class="cc-people" data-people>${P.people ? P.people.length ? P.people.map((p) => `<button type="button" class="cc-person${P.sel.some((s) => s.id === p.id) ? ' on' : ''}" data-person="${esc(p.id)}">${av(p.a, p.n, 32)}<span><b>${esc(p.n)}</b>${p.tag ? `<small class="muted">@${esc(p.tag)}</small>` : ''}</span><span class="cc-pk" aria-hidden="true">${P.group ? (P.sel.some((s) => s.id === p.id) ? '✅' : '＋') : '💬'}</span></button>`).join('') : '<p class="muted small">Nobody matches that name.</p>' : '<div class="sk-wrap"><span class="sk"></span><span class="sk s2"></span></div>'}</div>
${P.group ? `<button type="button" class="btn gold" data-mkgroup${P.sel.length && P.name.trim() ? '' : ' disabled'}>👥 Start the group${P.sel.length ? ` (${P.sel.length + 1})` : ''}</button>` : ''}</div>`;
    };
    let qT = 0;
    const people = async () => { const q = S.pick.q; try { const r = await A.call(`/api/chats/people?q=${encodeURIComponent(q)}`); if (S.pick && S.pick.q === q) { S.pick.people = r.people || []; const el = $('[data-people]', main); if (el) { drawPick(); const s = $('[data-q]', main); s.focus(); s.setSelectionRange(s.value.length, s.value.length); } } } catch (e) { M?.toast(e.message || 'Could not search', { kind: 'err' }); } };
    const startPick = () => { disconnect(); S.active = 0; S.thread = null; S.pick = { group: false, q: '', people: null, sel: [], name: '', emoji: '💬' }; root.classList.add('open'); drawList(); drawPick(); people(); };
    const opened = async (r, label) => { await loadChats(); if (!S.chats.some((c) => c.id === r.chat.id)) S.chats.unshift(r.chat); drawList(); M?.toast(label, { kind: 'ok', icon: '💬' }); openChat(r.chat.id); };

    // ---------- events ----------
    box.addEventListener('click', async (e) => {
      const t = e.target;
      const c = t.closest('[data-chat]'); if (c) { openChat(+c.dataset.chat); return; }
      if (t.closest('[data-new]')) { startPick(); return; }
      if (t.closest('[data-back]')) { S.pick = null; closeChat(); return; }
      if (t.closest('[data-relist]')) { loadChats(); return; }
      if (t.closest('[data-reopen]')) { openChat(S.active); return; }
      if (t.closest('[data-flush]')) { flushWait = 2000; flush(); return; }
      const rs = t.closest('[data-resend]'); if (rs) { const p = S.pending.find((x) => x.tmp === rs.dataset.resend); if (p) { p.state = 'queued'; p.err = ''; saveQ(); flush(); } return; }
      const dr = t.closest('[data-drop]'); if (dr) { S.pending = S.pending.filter((x) => x.tmp !== dr.dataset.drop); saveQ(); drawMsgs(); drawList(); return; }
      const ol = t.closest('[data-older]');
      if (ol) { ol.disabled = true; ol.textContent = 'Loading…'; const id = S.active, sc = $('[data-msgs]', main), h = sc.scrollHeight;
        try { const r = await A.call(`/api/chats/${id}/messages?before=${S.msgs[0]?.id || 0}`); if (S.active !== id) return; S.msgs = [...(r.messages || []), ...S.msgs]; S.more = !!r.more; drawMsgs(); sc.scrollTop = sc.scrollHeight - h; } catch (er) { M?.toast(er.message || 'Could not load earlier messages', { kind: 'err' }); ol.disabled = false; ol.textContent = 'Load earlier messages'; }
        return; }
      if (!S.pick) return;
      const k = t.closest('[data-kind]'); if (k) { S.pick.group = k.dataset.kind === 'group'; drawPick(); return; }
      const em = t.closest('[data-emo]'); if (em) { S.pick.emoji = em.dataset.emo; drawPick(); return; }
      const un = t.closest('[data-unsel]'); if (un) { S.pick.sel = S.pick.sel.filter((p) => p.id !== un.dataset.unsel); drawPick(); return; }
      const pe = t.closest('[data-person]');
      if (pe) {
        const p = S.pick.people.find((x) => x.id === pe.dataset.person); if (!p) return;
        if (S.pick.group) { const on = S.pick.sel.some((s) => s.id === p.id); if (on) S.pick.sel = S.pick.sel.filter((s) => s.id !== p.id); else if (S.pick.sel.length < 15) S.pick.sel.push(p); else M?.toast('Groups top out at 16 members', { kind: 'err' }); drawPick(); return; }
        pe.disabled = true; try { const r = await post('/api/chats', { kind: 'dm', user: p.id }); S.pick = null; opened(r, `Chat with ${p.n} open`); } catch (er) { pe.disabled = false; M?.toast(er.message || 'Could not open that chat', { kind: 'err' }); }
        return;
      }
      const mk = t.closest('[data-mkgroup]');
      if (mk && !mk.disabled) { const P = S.pick; try { const r = await (M ? M.submit(mk, () => post('/api/chats', { kind: 'group', name: P.name.trim(), emoji: P.emoji, members: P.sel.map((s) => s.id) })) : post('/api/chats', { kind: 'group', name: P.name.trim(), emoji: P.emoji, members: P.sel.map((s) => s.id) })); S.pick = null; opened(r, `${P.emoji} ${P.name.trim()} is ready`); } catch (er) { M?.toast(er.message || 'Could not start the group', { kind: 'err' }); } }
    });
    box.addEventListener('input', (e) => {
      const t = e.target;
      if (t.matches('[data-send] textarea')) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 160) + 'px'; if (t.value) sendTyping(); return; }
      if (t.matches('[data-q]')) { S.pick.q = t.value.trim(); clearTimeout(qT); qT = setTimeout(people, 250); return; }
      if (t.matches('[data-gname]')) { S.pick.name = t.value; const b = $('[data-mkgroup]', main); if (b) b.disabled = !(S.pick.sel.length && S.pick.name.trim()); }
    });
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.matches('[data-send] textarea')) { e.preventDefault(); e.target.form.requestSubmit(); } if (e.key === 'Escape' && root.classList.contains('open') && !matchMedia('(min-width: 760px)').matches) { S.pick = null; closeChat(); } });
    box.addEventListener('submit', (e) => {
      e.preventDefault(); const ta = $('textarea', e.target), text = ta.value.trim(); if (!text || !S.active) return;
      ta.value = ''; ta.style.height = ''; ta.focus(); send(text);
    });
    addEventListener('online', () => { paintStatus(); M?.toast('Back online', { kind: 'ok', icon: '📶' }); flushWait = 2000; flush(); if (S.active && !ws) connect(S.active); });
    addEventListener('offline', () => { paintStatus(); if (S.active) startPoll(); });
    d.addEventListener('visibilitychange', () => { if (d.hidden || !S.active) return; catchUp(); if (!ws) connect(S.active); flush(); });
    const tick = () => { if (!d.hidden && !offline()) loadChats(); };

    (A.ready || Promise.resolve()).then(async () => {
      await loadChats();
      listTick = setInterval(tick, 30000);
      const h = location.hash.match(/^#c(\d+)$/); if (h && S.chats.some((c) => c.id === +h[1])) { openChat(+h[1]); box.closest('section')?.scrollIntoView({ block: 'start' }); }
      if (S.pending.length) flush();
    });
    window.NXChat = { state: S, flush, unread: unreadAll }; // QA hook (read the queue, force a retry)
  }

  // ================= 🎮 On Discord (public widget feed) =================
  const dc = $('#chdiscord');
  if (dc && A?.token) discordLive(dc);
  function discordLive(el) {
    const G = el.dataset.guild, url = `https://discord.com/api/guilds/${G}/widget.json`;
    const ST = { online: ['Online', 'on'], idle: ['Away', 'idle'], dnd: ['Busy', 'dnd'] };
    const bot = (m) => /bot$/i.test(m.username) || /\.gg\b|\/help/i.test(m.game?.name || '');
    const face = (m, s = 36) => `<span class="dl-f ${ST[m.status]?.[1] || 'on'}" title="${esc(m.username)} · ${ST[m.status]?.[0] || 'Online'}">${m.avatar_url ? `<img src="${esc(m.avatar_url)}" alt="" width="${s}" height="${s}" loading="lazy" referrerpolicy="no-referrer">` : `<span class="sq-av ini" style="--s:${s}px;--h:${hue(m.username)}">${esc(ini(m.username))}</span>`}</span>`;
    let timer = 0, first = true;
    const paint = (w) => {
      const people = (w.members || []).filter((m) => !bot(m)), bots = (w.members || []).length - people.length;
      const vcs = (w.channels || []).sort((a, b) => a.position - b.position).map((c) => ({ ...c, in: people.filter((m) => m.channel_id === c.id) }));
      const order = { online: 0, idle: 1, dnd: 2 }, list = [...people].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || a.username.localeCompare(b.username));
      const n = people.length, inVc = vcs.reduce((k, c) => k + c.in.length, 0);
      return `<div class="panel dl"><div class="dl-top"><span class="dl-pulse" aria-hidden="true"></span><div><b class="dl-n"><span class="num" data-dln>${n}</span> online now</b><small class="muted">${inVc ? `🎙️ ${inVc} in voice` : '🎙️ Nobody in voice yet'}${bots ? ` · ${bots} bot${bots === 1 ? '' : 's'} hidden` : ''}</small></div></div>
${n ? `<div class="dl-stack" aria-hidden="true">${list.slice(0, 8).map((m) => face(m, 38)).join('')}${n > 8 ? `<span class="dl-more">+${n - 8}</span>` : ''}</div>` : ''}
${vcs.map((c) => `<div class="dl-vc${c.in.length ? ' busy' : ''}"><div class="dl-vch"><b>${esc(c.name)}</b><small class="muted">${c.in.length ? `${c.in.length} talking` : 'Empty'}</small></div>${c.in.length ? `<ul class="dl-vcm">${c.in.map((m) => `<li>${face(m, 26)}<span>${esc(m.username)}</span>${m.self_mute || m.mute ? '<span title="Muted">🔇</span>' : ''}${m.self_deaf || m.deaf ? '<span title="Deafened">🎧</span>' : ''}</li>`).join('')}</ul>` : ''}<a class="btn ghost dl-join" href="https://discord.com/channels/${G}/${esc(c.id)}" target="_blank" rel="noopener">🎙️ Hop in</a></div>`).join('')}
${n ? `<ul class="dl-list">${list.map((m) => `<li>${face(m, 28)}<span class="dl-nm"><b>${esc(m.username)}</b><small class="muted">${m.game?.name ? `🎮 ${esc(m.game.name)}` : ST[m.status]?.[0] || 'Online'}</small></span></li>`).join('')}</ul>` : '<p class="muted small">Nobody is online right now. Evenings are busiest.</p>'}
<div class="sq-acts"><a class="btn" href="https://discord.com/channels/${G}" target="_blank" rel="noopener">💬 Open the club server</a></div>
<p class="muted tiny dl-foot">From Discord's public server widget · updates every minute · shows people who are online and allow it.</p></div>`;
    };
    const load = async () => {
      if (first) M?.skeleton(el, 4);
      try {
        const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status === 403 ? 'The server widget is switched off in Discord.' : `Discord answered ${r.status}`);
        const w = await r.json(), html = paint(w);
        if (first && M) M.land(el, html); else { const prev = $('[data-dln]', el)?.textContent; el.innerHTML = html; if (prev && prev !== $('[data-dln]', el)?.textContent) M?.pulse($('.dl-n', el)); }
        first = false;
      } catch (e) {
        el.removeAttribute('aria-busy');
        if (first) el.innerHTML = `<div class="panel sq-empty"><span>🎮</span><div><b>Could not reach Discord</b><p class="muted small">${esc(e.message || 'No answer.')} The server is still there.</p><div class="sq-acts"><a class="btn" href="https://discord.com/channels/${G}" target="_blank" rel="noopener">💬 Open the club server</a><button type="button" class="btn ghost" data-dlretry>↻ Try again</button></div></div></div>`;
      }
    };
    el.addEventListener('click', (e) => { if (e.target.closest('[data-dlretry]')) { first = true; load(); } });
    const run = () => { clearInterval(timer); timer = setInterval(() => { if (!d.hidden) load(); }, 60000); };
    d.addEventListener('visibilitychange', () => { if (!d.hidden && !first) load(); });
    load(); run();
  }
})();
