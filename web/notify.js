// Notification centre (roadmap P7.1) and club & privacy requests (P5.6) on the client. app.js loads it and mounts:
//   bell(ctx)               🔔 in the header on every page: unread count, dropdown list, "must acknowledge" banner
//   tab(el, ctx)            Squad Hub → 🔔 Alerts: full list, per-type settings (DM / site / off), test DM, announcements
//   requestForms(el, ctx)   About page: "Track another club" (members) + "Hide me from the site" (anyone)
//   requestsPortal(el, ctx) manager portal → 📨 Requests: approve / reject / undo
// ctx = { call, toast, session (or null), loginUrl, clubs() → site api/clubs.json }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '';
  if (!$('link[href$="notify.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/notify.css` }));
  const ago = (t) => UI.time(t);
  const href = (l) => (!l ? '' : /^https:/.test(l) ? l : BASE + l);
  const text = (s) => esc(s).replace(/\n/g, '<br>');
  const MODES = [['dm', '💬 Site + DM'], ['site', '🔔 Site only'], ['off', '🔕 Off']];
  const N = { state: null, count: null, listeners: new Set() };
  const emit = () => N.listeners.forEach((f) => f());

  // ================= bell (every page) =================
  function bell(ctx) {
    const bar = $('header.top .bar');
    if (!bar || $('.bell', bar)) return;
    bar.insertAdjacentHTML('beforeend', `<div class="bell-wrap"><button class="bell" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded="false"><span aria-hidden="true">🔔</span><b class="bell-n" hidden></b></button>
<div class="bell-panel" hidden role="dialog" aria-label="Notifications"></div></div>`);
    const btn = $('.bell', bar), badge = $('.bell-n', bar), panel = $('.bell-panel', bar), wrap = $('.bell-wrap', bar);
    let banner = null;

    const paint = () => {
      const c = N.count;
      if (!c) return;
      badge.hidden = !c.unread;
      badge.textContent = c.unread > 99 ? '99+' : c.unread;
      btn.classList.toggle('has', c.unread > 0);
      btn.setAttribute('aria-label', `Notifications${c.unread ? ` (${c.unread} unread)` : ''}`);
      // Announcements that must be acknowledged stay on every page until "Got it".
      if (c.ack && !banner) {
        banner = Object.assign(document.createElement('div'), { className: 'ack-bar' });
        $('header.top').after(banner);
      }
      if (banner && !c.ack) { banner.remove(); banner = null; }
      if (banner) banner.innerHTML = `<div class="wrap ack-in"><span class="ack-ic" aria-hidden="true">${esc(c.ack.icon || '📣')}</span><span class="ack-t"><small>Please read &amp; acknowledge</small><b>${esc(c.ack.title)}</b></span><button type="button" class="btn sm ghost" data-ack-read>Read</button><button type="button" class="btn sm" data-ack-ok>✓ Got it</button></div>`;
      if (panel.hidden === false && N.state) drawPanel();
    };
    N.listeners.add(paint);

    const refresh = async () => {
      try { N.count = await ctx.call('/api/notify/count'); paint(); } catch {}
    };
    const load = async () => {
      N.state = await ctx.call('/api/notify');
      N.count = { unread: N.state.unread, ack: N.state.ack };
      emit();
    };

    const item = (n) => `<li class="nf${n.read ? '' : ' unread'}${n.ack === 'due' ? ' due' : ''}" data-id="${n.id}"${n.link ? ` data-link="${esc(n.link)}"` : ''} tabindex="0">
<span class="nf-ic" aria-hidden="true">${esc(n.icon || '🔔')}</span><span class="nf-t"><b>${esc(n.title)}</b>${n.body ? `<small>${esc(n.body.split('\n')[0]).slice(0, 140)}</small>` : ''}<em>${ago(n.at)}${n.ack === 'due' ? ' · <u>acknowledge</u>' : ''}</em></span></li>`;
    function drawPanel() {
      const s = N.state;
      const list = s.items.slice(0, 15);
      panel.innerHTML = `<header><b>Notifications</b>${s.unread ? `<button type="button" class="linkish" data-all>Mark all read</button>` : ''}</header>
${list.length ? `<ul class="nf-list">${list.map(item).join('')}</ul>` : UI.empty({ icon: '🔕', title: 'All quiet', text: 'Claim decisions, trial news, Rush results and club announcements show up here.' })}
<footer><a href="${BASE}members.html#alerts">See all</a><a href="${BASE}members.html#alerts-settings">⚙️ Settings</a></footer>`;
    }
    const open = async () => {
      panel.hidden = false; btn.setAttribute('aria-expanded', 'true');
      if (!N.state) panel.innerHTML = UI.skeleton('rows', 3);
      try { await load(); drawPanel(); } catch (e) { panel.innerHTML = `<p class="muted small">⚠️ ${esc(e.message)}</p>`; }
    };
    const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.onclick = (e) => { e.stopPropagation(); panel.hidden ? open() : close(); };
    document.addEventListener('click', (e) => { if (!panel.hidden && !wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    panel.addEventListener('click', async (e) => {
      if (e.target.closest('[data-all]')) return markRead(ctx, { all: true });
      const li = e.target.closest('.nf');
      if (!li) return;
      const n = N.state.items.find((x) => x.id === +li.dataset.id);
      if (n.ack === 'due') return readAck(ctx, n);
      if (!n.read) await markRead(ctx, { ids: [n.id] });
      if (n.link) { if (/^https:/.test(n.link)) window.open(n.link, '_blank', 'noopener'); else location.href = href(n.link); }
      else if (n.body) UI.modal({ title: n.title, icon: n.icon, body: `<p>${text(n.body)}</p><p class="muted small">${ago(n.at)}</p>` });
    });
    panel.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.nf')) e.target.click(); });
    document.addEventListener('click', async (e) => {
      if (!banner?.contains(e.target)) return;
      const id = N.count?.ack?.id;
      if (e.target.closest('[data-ack-ok]')) return ack(ctx, id);
      if (e.target.closest('[data-ack-read]')) { if (!N.state) await load(); readAck(ctx, N.state.items.find((x) => x.id === id) ?? { id, title: N.count.ack.title, icon: N.count.ack.icon }); }
    });

    refresh();
    // Cheap poll (one small D1 read) every 2 minutes while the tab is visible, and when it comes back.
    setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 120000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
    N.refresh = async () => { await load(); };
  }

  async function markRead(ctx, what) {
    if (N.state) { // optimistic
      for (const n of N.state.items) if (what.all || what.ids.includes(n.id)) n.read = true;
      N.state.unread = N.state.items.filter((n) => !n.read).length;
      N.count = { ...N.count, unread: N.state.unread };
      emit();
    }
    try { N.state = await ctx.call('/api/notify/read', what); N.count = { unread: N.state.unread, ack: N.state.ack }; emit(); } catch (e) { ctx.toast(e.message, true); }
  }
  async function ack(ctx, id) {
    try {
      N.state = await ctx.call('/api/notify/ack', { id });
      N.count = { unread: N.state.unread, ack: N.state.ack };
      emit(); ctx.toast('Thanks – acknowledged ✓');
    } catch (e) { ctx.toast(e.message, true); }
  }
  async function readAck(ctx, n) {
    const ok = await UI.modal({
      title: n.title, icon: n.icon || '📣',
      body: `${n.body ? `<p>${text(n.body)}</p>` : ''}${n.link ? `<p><a href="${esc(href(n.link))}"${/^https:/.test(n.link) ? ' target="_blank" rel="noopener"' : ''}>Open the link ↗</a></p>` : ''}<p class="muted small">Sent ${ago(n.at)} · managers can see who has acknowledged.</p>`,
      actions: [{ label: 'Later', value: false, kind: 'ghost' }, { label: '✓ Got it', value: true }],
    });
    if (ok) ack(ctx, n.id);
  }

  // ================= Squad Hub → 🔔 Alerts =================
  async function tab(el, ctx) {
    let filter = 'all';
    const draw = () => {
      const s = N.state;
      if (!s) return;
      const types = Object.fromEntries(s.types.map((t) => [t.k, t]));
      const shown = s.items.filter((n) => filter === 'all' || (filter === 'unread' ? !n.read : n.type === filter));
      const used = [...new Set(s.items.map((n) => n.type))].filter((k) => types[k]);
      el.innerHTML = `<div class="nt-grid">
<section class="card nt-list"><div class="nt-head"><h3>🔔 Notifications</h3>${s.unread ? `<button class="btn sm ghost" type="button" data-all>✓ Mark all read</button>` : ''}</div>
<div class="chipset">${[['all', 'All'], ['unread', `Unread${s.unread ? ` (${s.unread})` : ''}`], ...used.map((k) => [k, `${types[k].icon} ${types[k].label.split(' (')[0]}`])].map(([k, l]) => `<button class="chip${filter === k ? ' on' : ''}" type="button" data-filter="${k}">${esc(l)}</button>`).join('')}</div>
${shown.length ? `<ul class="nt-items">${shown.map((n) => `<li class="nf${n.read ? '' : ' unread'}${n.ack === 'due' ? ' due' : ''}" data-id="${n.id}">
<span class="nf-ic" aria-hidden="true">${esc(n.icon || '🔔')}</span><div class="nf-t"><b>${esc(n.title)}</b>${n.body ? `<p>${text(n.body)}</p>` : ''}<em>${ago(n.at)}${n.dm === 'sent' ? ' · 💬 sent as DM' : n.dm === 'failed' ? ' · ⚠️ DM not delivered' : n.dm === 'queued' ? ' · 💬 DM on its way' : ''}</em></div>
<div class="nf-do">${n.ack === 'due' ? `<button class="btn sm" type="button" data-ack="${n.id}">✓ Got it</button>` : n.ack === 'done' ? UI.pill('Acknowledged', { emoji: '✓', tone: 'win' }) : ''}${n.link ? `<a class="btn sm ghost" href="${esc(href(n.link))}" data-open="${n.id}"${/^https:/.test(n.link) ? ' target="_blank" rel="noopener"' : ''}>Open →</a>` : ''}${!n.read && n.ack !== 'due' ? `<button class="linkish" type="button" data-read="${n.id}">Mark read</button>` : ''}</div></li>`).join('')}</ul>`
    : UI.empty({ icon: '🔕', title: filter === 'unread' ? 'You’re all caught up' : 'Nothing yet', text: 'Claim decisions, scouting news, Rush results, requests and announcements land here.' })}
</section>
<aside class="nt-side">
<section class="card" id="alerts-settings"><h3>⚙️ How should we tell you?</h3>
<p class="muted small">💬 <b>Site + DM</b> also sends a Discord DM from the NOREX bot · 🔔 <b>Site only</b> shows it here · 🔕 <b>Off</b> mutes it.</p>
${!s.dmReady ? '<p class="nt-warn">💬 Discord DMs switch on as soon as the bot token is connected – until then everything shows on the site.</p>' : s.dmBlocked ? '<p class="nt-warn">⚠️ Discord refused our last DM. In Discord: right-click the NOREX server → <b>Privacy Settings</b> → turn on <b>Direct Messages</b>, then send a test.</p>' : ''}
<div class="nt-prefs">${s.types.map((t) => `<div class="nt-pref"><span><i aria-hidden="true">${esc(t.icon)}</i>${esc(t.label)}</span><div class="seg" role="radiogroup" aria-label="${esc(t.label)}">${MODES.filter(([m]) => m !== 'off' || t.mute).map(([m, l]) => `<button type="button" role="radio" aria-checked="${t.mode === m}" class="${t.mode === m ? 'on' : ''}" data-pref="${t.k}" data-mode="${m}">${l}</button>`).join('')}</div></div>`).join('')}</div>
<button class="btn sm ghost" type="button" data-test>🧪 Send me a test</button></section>
${s.canAnnounce ? `<section class="card nt-announce"><h3>📣 Send an announcement</h3><p class="muted small">Goes to every member's 🔔 (and Discord DM if they chose it). Tick <b>must acknowledge</b> for rules – it stays on their screen and re-sends a DM daily (up to 3×) until they tap “Got it”.</p>
<form id="announce-form"><label>Title<input name="title" maxlength="120" required placeholder="New match-night rules"></label>
<label>Message<textarea name="body" maxlength="1500" rows="4" placeholder="What everyone needs to know…"></textarea></label>
<label>Link <small class="muted">(optional – a page of this site or https://…)</small><input name="link" maxlength="300" placeholder="about.html or https://…"></label>
<label>Send to<select name="audience"><option value="members">Every member</option><option value="managers">Managers only</option></select></label>
<label class="check"><input type="checkbox" name="ack"> Must acknowledge (rules)</label>
<button class="btn" type="submit">📣 Send</button></form></section>` : ''}
</aside></div>`;
      if (location.hash === '#alerts-settings') $('#alerts-settings', el)?.scrollIntoView({ block: 'start' });
    };
    const load = async () => { N.state = await ctx.call('/api/notify'); N.count = { unread: N.state.unread, ack: N.state.ack }; emit(); };
    N.listeners.add(draw);
    el.innerHTML = UI.skeleton('rows', 4);
    try { await load(); } catch (e) { el.innerHTML = `<div class="card"><p>⚠️ ${esc(e.message)}</p></div>`; return; }

    el.onclick = async (e) => {
      const t = e.target.closest('button, a');
      if (!t) return;
      const d = t.dataset;
      if (d.filter) { filter = d.filter; draw(); }
      if (d.all !== undefined) markRead(ctx, { all: true });
      if (d.read) markRead(ctx, { ids: [+d.read] });
      if (d.open) { const n = N.state.items.find((x) => x.id === +d.open); if (n && !n.read) markRead(ctx, { ids: [n.id] }); }
      if (d.ack) ack(ctx, +d.ack);
      if (d.pref) {
        const tp = N.state.types.find((x) => x.k === d.pref), old = tp.mode;
        tp.mode = d.mode; draw(); // optimistic
        try { N.state = await ctx.call('/api/notify/prefs', { prefs: { [d.pref]: d.mode } }); emit(); ctx.toast('Saved'); } catch (er) { tp.mode = old; draw(); ctx.toast(er.message, true); }
      }
      if (d.test !== undefined) {
        t.disabled = true;
        try {
          const r = await ctx.call('/api/notify/test', {});
          N.state = r; emit();
          ctx.toast(r.test?.sent ? 'Test sent – check your Discord DMs 💬' : r.test?.failed ? 'Discord refused the DM – see the tip above' : 'Test added to your notifications 🔔', !!r.test?.failed);
        } catch (er) { ctx.toast(er.message, true); t.disabled = false; }
      }
    };
    el.onsubmit = async (e) => {
      if (e.target.id !== 'announce-form') return;
      e.preventDefault();
      const f = e.target, v = Object.fromEntries(new FormData(f));
      const ok = await UI.confirm({ title: 'Send announcement?', icon: '📣', text: `“${v.title}” goes to ${v.audience === 'managers' ? 'all managers' : 'every member'}${v.ack ? ' and must be acknowledged' : ''}.`, ok: 'Send' });
      if (!ok) return;
      try {
        const r = await ctx.call('/api/notify/announce', { title: v.title, body: v.body, link: v.link, audience: v.audience, ack: !!v.ack });
        N.state = r; emit(); f.reset();
        ctx.toast(`Sent to ${r.sent} member${r.sent === 1 ? '' : 's'} 📣`);
      } catch (er) { ctx.toast(er.message, true); }
    };
    draw();
  }

  // ================= P5.6 requests =================
  const RS = { pending: ['⏳', 'Waiting for a manager', 'gold'], approved: ['✅', 'Approved', 'win'], rejected: ['❌', 'Not approved', 'loss'], undone: ['↩️', 'Undone', ''] };
  const rsPill = (s) => UI.pill(RS[s]?.[1] ?? s, { emoji: RS[s]?.[0], tone: RS[s]?.[2] });
  const KIND = { club: ['🏟️', 'Track club'], hide: ['🙈', 'Hide player'] };

  // About page: two forms. "Track another club" needs a login; "Hide me" works for anyone.
  async function requestForms(el, ctx) {
    const clubs = await ctx.clubs().catch(() => []);
    const known = clubs.filter((c) => !['home', 'linked', 'manual'].includes(c.t));
    let mine = [];
    const drawMine = () => {
      const box = $('#req-mine', el);
      if (box) box.innerHTML = mine.length ? `<h3>📨 My requests</h3><ul class="req-mine">${mine.map((r) => `<li><span>${KIND[r.kind][0]} <b>${esc(r.subject)}</b> <small class="muted">${ago(r.at)}</small></span>${rsPill(r.status)}${r.reason ? `<small class="muted">“${esc(r.reason)}”</small>` : ''}</li>`).join('')}</ul>` : '';
    };
    el.innerHTML = `<div class="req-grid">
<form class="card req-card" id="req-club"><h3>🏟️ Track another club</h3><p class="muted small">Play for another club too? Name it and a manager adds it – every match gets archived from then on.</p>
${ctx.session ? `<label>Club name<input name="subject" list="req-clubs" maxlength="60" required placeholder="Start typing…" autocomplete="off"></label><datalist id="req-clubs">${known.map((c) => `<option value="${esc(c.n)}">`).join('')}</datalist>
<label>Why? <small class="muted">(optional)</small><input name="note" maxlength="400" placeholder="I play there on weekends"></label><button class="btn" type="submit">Send request</button>`
    : `<a class="btn discord" href="${esc(ctx.loginUrl())}">Log in with Discord to ask</a>`}</form>
<form class="card req-card" id="req-hide"><h3>🙈 Hide me from the site</h3><p class="muted small">Don't want your gamertag listed? A manager checks it's really you, then you disappear from every page on the next update.</p>
<label>Your EA gamertag<input name="subject" maxlength="60" required placeholder="As it shows in the game"></label>
${ctx.session ? '' : '<label>Your Discord username<input name="contact" maxlength="40" required placeholder="so a manager can confirm it’s you"></label>'}
<label>Anything else? <small class="muted">(optional)</small><input name="note" maxlength="400"></label>
<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<button class="btn ghost" type="submit">Ask to be hidden</button></form></div><div id="req-mine"></div>`;
    if (ctx.session) { try { mine = (await ctx.call('/api/requests')).requests; drawMine(); } catch {} }
    el.onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, v = Object.fromEntries(new FormData(f)), btn = $('button[type=submit]', f);
      const kind = f.id === 'req-club' ? 'club' : 'hide';
      if (kind === 'hide' && !(await UI.confirm({ title: 'Hide this gamertag?', icon: '🙈', text: `“${v.subject}” will be removed from player lists, match pages and leaderboards once a manager confirms it's you.`, ok: 'Send request' }))) return;
      btn.disabled = true;
      try {
        if (kind === 'club') {
          const c = clubs.find((x) => x.n.toLowerCase() === v.subject.trim().toLowerCase());
          mine = (await ctx.call('/api/requests', { kind, subject: v.subject, clubId: c?.id, note: v.note })).requests;
        } else {
          await ctx.call('/api/requests/public', { subject: v.subject, contact: v.contact, note: v.note, website: v.website });
          if (ctx.session) mine = (await ctx.call('/api/requests')).requests;
        }
        f.reset(); drawMine();
        ctx.toast(kind === 'club' ? 'Request sent – a manager will add it 🏟️' : 'Request sent – a manager will confirm it on Discord 🙈');
      } catch (er) { ctx.toast(er.message, true); }
      btn.disabled = false;
    };
  }

  // Manager portal → 📨 Requests.
  async function requestsPortal(el, ctx) {
    let list = [];
    const card = (r) => `<li class="card req-item ${r.status}" data-id="${r.id}"><div class="req-top"><span class="req-kind">${KIND[r.kind][0]} ${KIND[r.kind][1]}</span>${rsPill(r.status)}<small class="muted">${ago(r.at)}</small></div>
<b class="req-subj">${esc(r.subject)}</b>${r.kind === 'club' ? `<small class="muted">${r.clubId ? `EA club ID ${esc(r.clubId)}` : 'ID unknown – looked up by name on the next update, or enter it below'}</small>` : ''}
${r.note ? `<p>“${esc(r.note)}”</p>` : ''}
<p class="small muted">${r.by ? `From ${UI.member ? UI.member({ id: r.by.id, n: r.by.n, a: r.by.a }) : esc(r.by.n)}` : `🌐 Visitor · Discord <b>${esc(r.contact || '?')}</b> – check it's really them before approving`}</p>
${r.status === 'pending' ? `<div class="req-do">${r.kind === 'club' && !r.clubId ? '<input class="req-cid" inputmode="numeric" placeholder="EA club ID (optional)" maxlength="12">' : ''}<button class="btn sm" type="button" data-do="approve">✓ Approve</button><button class="btn sm ghost" type="button" data-do="reject">✕ Reject</button></div>`
    : `<p class="small muted">${esc(RS[r.status]?.[1] ?? r.status)} by ${esc(r.decidedBy ?? '?')} ${ago(r.decidedAt)}${r.reason ? ` · “${esc(r.reason)}”` : ''}</p>${r.status === 'approved' ? `<div class="req-do"><button class="btn sm ghost" type="button" data-do="undo">↩️ Undo</button></div>` : ''}`}</li>`;
    const draw = () => {
      const pend = list.filter((r) => r.status === 'pending'), rest = list.filter((r) => r.status !== 'pending');
      el.innerHTML = `<h3>📨 Club &amp; privacy requests</h3><p class="muted small">Approved requests reach the site on the next update (a rebuild starts right away). “Hide” takes the player off every page; “Track” archives the club's matches.</p>
${pend.length ? `<ul class="req-list">${pend.map(card).join('')}</ul>` : UI.empty({ icon: '📭', title: 'No open requests', text: 'Members ask from the About page.' })}
${rest.length ? `<h3>Decided</h3><ul class="req-list">${rest.map(card).join('')}</ul>` : ''}`;
    };
    el.innerHTML = UI.skeleton('rows', 3);
    try { list = (await ctx.call('/api/admin/requests')).requests; } catch (e) { el.innerHTML = `<p>⚠️ ${esc(e.message)}</p>`; return; }
    draw();
    el.onclick = async (e) => {
      const b = e.target.closest('[data-do]');
      if (!b) return;
      const li = b.closest('[data-id]'), r = list.find((x) => x.id === +li.dataset.id), action = b.dataset.do;
      let reason = '';
      if (action !== 'approve') {
        const ok = await UI.modal({
          title: action === 'undo' ? `Undo: ${r.subject}?` : `Reject: ${r.subject}?`, icon: action === 'undo' ? '↩️' : '✕',
          body: `<p>${action === 'undo' ? (r.kind === 'hide' ? 'The player shows on the site again.' : 'The club stops being archived in full.') : 'The member is told it was not approved.'}</p><label>Note for them <small class="muted">(optional)</small><input class="req-reason" maxlength="200" style="width:100%"></label>`,
          actions: [{ label: 'Cancel', value: false, kind: 'ghost' }, { label: action === 'undo' ? 'Undo' : 'Reject', value: true, kind: 'danger' }],
          onOpen: (d) => { d.addEventListener('input', (ev) => { if (ev.target.matches('.req-reason')) reason = ev.target.value; }); },
        });
        if (!ok) return;
      }
      try {
        list = (await ctx.call('/api/admin/requests/decide', { id: r.id, action, reason, clubId: $('.req-cid', li)?.value.trim() || undefined })).requests;
        draw(); ctx.toast({ approve: 'Approved – the site updates in a few minutes ✓', reject: 'Rejected', undo: 'Undone' }[action]);
      } catch (er) { ctx.toast(er.message, true); }
    };
  }

  window.NXNotify = { bell, tab, requestForms, requestsPortal, refresh: () => N.refresh?.() };
})();
