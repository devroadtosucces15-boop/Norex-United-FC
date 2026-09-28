// Recruitment on the client (roadmap P1.4, P1.5, P5.5, P5.7). Loaded by the Trials page and, on first use, by the
// Squad Hub (Scout tab) and the manager portal (Trials + Notes tabs). app.js mounts it and passes ctx:
//   { call, toast, role, perms, me: {u, n, a}, admin (portal overview), players (site api/players.json) }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '';
  if (!$('link[href$="trials.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/trials.css` }));
  const ago = (t) => UI.time(t);
  const POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
  const PLAT = ['PS5', 'Xbox', 'PC'];
  const ST = {
    recommended: ['🔭', 'Recommended', 'gold'], applied: ['📝', 'Applied', ''], trialling: ['⚽', 'Trialling', 'red'],
    signed: ['✍️', 'Signed', 'win'], released: ['👋', 'Released', 'loss'], declined: ['⛔', 'Declined', 'loss'],
  };
  const stPill = (s) => UI.pill(ST[s]?.[1] ?? s, { emoji: ST[s]?.[0], tone: ST[s]?.[2] });
  const SRC = { form: '🌐 Site form', discord: '💬 Discord', scout: '🔭 Scouted', manual: '✋ Added by manager' };
  const TAG = { strength: ['💪', 'Strength', 'win'], issue: ['⚠️', 'Issue', 'loss'], trial: ['⚽', 'Trial', 'red'], general: ['📝', 'Note', ''] };
  const tagPill = (t) => UI.pill(TAG[t]?.[1] ?? t, { emoji: TAG[t]?.[0], tone: TAG[t]?.[2] });
  const posChips = (sel = [], name = 'pos') => `<div class="chipset tr-pos" data-chips="${name}">${POS.map((p) => `<button type="button" class="chip${sel.includes(p) ? ' on' : ''}" data-p="${p}">${p}</button>`).join('')}</div>`;
  const platSel = (v = '') => `<select name="platform" required><option value="">Choose…</option>${PLAT.map((p) => `<option${v === p ? ' selected' : ''}>${p}</option>`).join('')}</select>`;
  const chipsOf = (el, name = 'pos') => $$(`[data-chips="${name}"] .chip.on`, el).map((b) => b.dataset.p);
  // Positions: tap to toggle, max 3.
  const wireChips = (el, toast) => el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-chips] .chip');
    if (!b) return;
    if (!b.classList.contains('on') && $$('.chip.on', b.parentElement).length >= 3) return toast('Up to 3 positions', true);
    b.classList.toggle('on');
  });
  const today = () => new Date().toISOString().slice(0, 10);
  const clipLink = (u) => (u ? `<a class="tr-clip" href="${esc(u)}" target="_blank" rel="noopener nofollow">🎬 Clips ↗</a>` : '');
  const playerLink = (k, ps) => { const p = k && ps?.find((x) => x.k === k); return k ? `<a href="${BASE}players/${encodeURIComponent(k)}.html">🪪 ${esc(p?.n ?? 'Player page')}</a>` : ''; };

  // ================= Trials page (public): manager contacts + mini application form =================
  async function apply(root, ctx) {
    const contactsEl = $('#trial-contacts', root), formEl = $('#trial-form', root);
    if (contactsEl) {
      contactsEl.innerHTML = UI.skeleton('rows', 2);
      try {
        const { contacts } = await ctx.call('/api/contacts');
        contactsEl.innerHTML = contacts.length ? `<div class="tr-contacts">${contacts.map(contactCard).join('')}</div>`
          : UI.empty({ icon: '🛡️', title: 'Managers coming soon', text: 'Manager cards appear here once they log in on the site. Until then, apply on Discord.' });
      } catch { contactsEl.innerHTML = UI.empty({ icon: '🛡️', title: 'Could not load the managers', text: 'Apply on Discord instead – a manager will pick it up.' }); }
      contactsEl.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-copy]');
        if (!b) return;
        try { await navigator.clipboard.writeText(b.dataset.copy); ctx.toast(`Copied @${b.dataset.copy}`); } catch { ctx.toast('Copy failed – select the name instead', true); }
      });
    }
    if (formEl) {
      formEl.innerHTML = applyForm();
      wireChips(formEl, ctx.toast);
      $('form', formEl).onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target, btn = $('button[type=submit]', f);
        const body = { ea: f.ea.value, discord: f.discord.value, platform: f.platform.value, positions: chipsOf(f), clips: f.clips.value, note: f.note.value, website: f.website.value };
        if (!body.positions.length) return ctx.toast('Pick at least one position', true);
        btn.disabled = true;
        try {
          await ctx.call('/api/trials/apply', body);
          formEl.innerHTML = `<div class="tr-done card"><span class="tr-done-ic">👑</span><div><h3>Application sent</h3><p>Thanks, <b>${esc(body.ea)}</b>. A manager will look at it and contact <b>@${esc(body.discord.replace(/^@/, ''))}</b> on Discord. Make sure you can receive messages from server members.</p></div></div>`;
        } catch (er) { ctx.toast(er.message, true); btn.disabled = false; }
      };
    }
  }
  const contactCard = (c) => `<div class="tr-contact card${c.role === 'owner' ? ' is-owner' : ''}">
<div class="tr-c-av">${UI.avatar(c.a, c.n, 64)}${c.role === 'owner' ? '<span class="tr-crown" aria-hidden="true">👑</span>' : ''}</div>
<div class="tr-c-body"><b>${esc(c.n)}</b><span class="tag ${c.role === 'owner' ? 'owner' : 'home'}">${c.role === 'owner' ? '👑 Owner' : '🛡️ Manager'}</span>
${c.tag ? `<button type="button" class="tr-tag" data-copy="${esc(c.tag)}" data-tip="Copy Discord username">@${esc(c.tag)} <i aria-hidden="true">⧉</i></button>` : ''}
<div class="nx-pills">${c.platform ? UI.pill(c.platform, { emoji: '🎮' }) : ''}${(c.positions || []).map((p) => UI.pill(p)).join('')}</div>
<a class="btn discord sm" href="https://discord.com/users/${esc(c.id)}" target="_blank" rel="noopener">Message on Discord</a></div></div>`;
  const applyForm = () => `<form class="tr-form card" novalidate>
<div class="tr-grid">
<label class="fld">EA ID / gamertag<input name="ea" maxlength="40" required autocomplete="off" placeholder="Your in-game name"></label>
<label class="fld">Discord username<input name="discord" maxlength="33" required autocomplete="off" placeholder="e.g. norexfan"></label>
<label class="fld">Platform ${platSel()}</label>
<label class="fld">Clips link <small>(optional)</small><input name="clips" type="url" maxlength="300" placeholder="https://youtube.com/…"></label>
</div>
<label class="fld">Positions (up to 3)</label>${posChips()}
<label class="fld" style="margin-top:12px">Anything else? <small>(optional)</small><textarea name="note" rows="3" maxlength="500" placeholder="Availability, other clubs, what you bring…"></textarea></label>
<label class="tr-hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
<div class="row"><button class="btn" type="submit">👑 Send application</button><small class="muted">Managers reply on Discord. Only managers can invite you to the server and to trials.</small></div></form>`;

  // ================= Squad Hub: 🔭 Scout (P5.5) =================
  const SC = { recs: null };
  async function scout(el, ctx) {
    const draw = () => {
      el.innerHTML = `<div class="grid2"><form class="card tr-form" data-scout novalidate><h3>🔭 Recommend a player</h3>
<p class="muted small">Seen someone who'd fit NOREX? Send them to the managers – they can turn it into a trial with one click.</p>
<div class="tr-grid"><label class="fld">EA ID / gamertag<input name="ea" maxlength="40" required autocomplete="off"></label><label class="fld">Platform ${platSel()}</label></div>
<label class="fld">Positions (up to 3)</label>${posChips()}
<label class="fld" style="margin-top:12px">Why would they fit?<textarea name="note" rows="3" maxlength="500" required placeholder="What you saw: pace, passing, attitude, Rush games…"></textarea></label>
<label class="fld">Clips link <small>(optional)</small><input name="clips" type="url" maxlength="300" placeholder="https://…"></label>
<button class="btn" type="submit">📨 Send to managers</button></form>
<div class="card"><h3>My recommendations</h3>${!SC.recs ? UI.skeleton('rows', 3) : SC.recs.length ? `<ul class="tr-recs">${SC.recs.map((r) => `<li><div><b>${esc(r.ea)}</b> <small class="muted">${esc(r.positions.join(' / '))} · ${esc(r.platform || '')}</small><small class="muted">${ago(r.at)}${r.updated > r.at ? ` · updated ${ago(r.updated)}` : ''}</small></div>${stPill(r.status)}</li>`).join('')}</ul>`
    : UI.empty({ icon: '🔭', title: 'No tips yet', text: 'Your recommendations and what the managers decided show up here.' })}</div></div>`;
      wireForm();
    };
    const wireForm = () => {
      $('[data-scout]', el).onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        const body = { ea: f.ea.value, platform: f.platform.value, positions: chipsOf(f), note: f.note.value, clips: f.clips.value };
        if (!body.positions.length) return ctx.toast('Pick at least one position', true);
        const prev = SC.recs;
        SC.recs = [{ ea: body.ea, positions: body.positions, platform: body.platform, status: 'recommended', at: Date.now(), updated: Date.now() }, ...(prev || [])];
        draw();
        try { SC.recs = (await ctx.call('/api/scout', body)).recs; draw(); ctx.toast(`${body.ea} sent to the managers 🔭`); } catch (er) {
          SC.recs = prev; draw(); ctx.toast(er.message, true);
          const f2 = $('[data-scout]', el); f2.ea.value = body.ea; f2.platform.value = body.platform; f2.note.value = body.note; f2.clips.value = body.clips;
          body.positions.forEach((p) => $(`[data-p="${p}"]`, f2)?.classList.add('on'));
        }
      };
    };
    wireChips(el, ctx.toast);
    draw();
    try { SC.recs = (await ctx.call('/api/scout')).recs; if (el.isConnected) draw(); } catch (e) { ctx.toast(e.message, true); }
  }

  // ================= Manager portal: 🧭 Trials (P1.5) =================
  const T = { data: null, filter: 'open', q: '' };
  const OPEN = ['recommended', 'applied', 'trialling'];
  const NEXT = { recommended: ['applied', 'trialling', 'declined'], applied: ['trialling', 'signed', 'declined'], trialling: ['signed', 'released'], signed: ['released'], released: ['applied'], declined: ['applied'] };
  const NEXT_LABEL = { applied: '📝 Make trial card', trialling: '⚽ Start trial', signed: '✍️ Sign', released: '👋 Release', declined: '⛔ Decline' };
  const lastSession = (t) => t.events.filter((e) => e.kind === 'session').at(-1);
  function trialCard(t, ctx) {
    const s = lastSession(t);
    return `<article class="tr-card card st-${t.status}" data-open="${t.id}" tabindex="0">
<header><b>${esc(t.ea)}</b>${stPill(t.status)}</header>
<div class="nx-pills">${t.platform ? UI.pill(t.platform, { emoji: '🎮' }) : ''}${t.positions.map((p) => UI.pill(p)).join('')}</div>
<p class="tr-meta">${SRC[t.source] || esc(t.source)}${t.by ? ` · ${esc(t.by.n)}` : ''} · ${ago(t.at)}</p>
${t.note ? `<p class="tr-note">${esc(t.note.length > 140 ? t.note.slice(0, 140) + '…' : t.note)}</p>` : ''}
<footer>${t.discord ? `<span>💬 @${esc(t.discord)}</span>` : ''}${playerLink(t.player, ctx.players)}${clipLink(t.clips)}${s ? `<span data-tip="Last trial session">⚽ ${s.rating ? `<b>${esc(s.rating)}</b>` : esc(s.result || 'session')}</span>` : ''}${t.notes.length ? `<span>📝 ${t.notes.length}</span>` : ''}</footer></article>`;
  }
  function portalView(ctx) {
    if (!T.data) return UI.skeleton('rows', 4);
    const all = T.data.trials;
    const count = (s) => all.filter((t) => t.status === s).length;
    const recs = all.filter((t) => t.status === 'recommended');
    const words = T.q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = all.filter((t) => t.status !== 'recommended' && (T.filter === 'open' ? OPEN.includes(t.status) : T.filter === 'all' || t.status === T.filter))
      .filter((t) => words.every((w) => `${t.ea} ${t.discord || ''} ${t.positions.join(' ')} ${t.platform || ''}`.toLowerCase().includes(w)));
    return `<div class="tr-stats">${['recommended', 'applied', 'trialling', 'signed', 'released'].map((s) => `<button type="button" class="tr-stat st-${s}${T.filter === s ? ' on' : ''}" data-f="${s}"><i>${ST[s][0]}</i><b>${count(s)}</b><span>${ST[s][1]}</span></button>`).join('')}</div>
${recs.length ? `<h3>🔭 Recommended by members (${recs.length})</h3><div class="tr-reclist">${recs.map((t) => `<div class="card tr-rec"><div class="row"><b>${esc(t.ea)}</b><div class="nx-pills">${t.platform ? UI.pill(t.platform, { emoji: '🎮' }) : ''}${t.positions.map((p) => UI.pill(p)).join('')}</div><span class="grow"></span>${t.by ? UI.member({ id: t.by.id, n: t.by.n, a: t.by.a, sub: `recommended ${UI.ago(t.at)}` }, { size: 24 }) : ''}</div>
${t.note ? `<q>${esc(t.note)}</q>` : ''}<div class="row">${clipLink(t.clips)}${playerLink(t.player, ctx.players)}<span class="grow"></span><button class="btn sm" type="button" data-st="applied" data-id="${t.id}">📝 Make trial card</button><button class="btn ghost sm" type="button" data-st="trialling" data-id="${t.id}">⚽ Start trial</button><button class="btn ghost sm" type="button" data-st="declined" data-id="${t.id}">Decline</button></div></div>`).join('')}</div>` : ''}
<div class="tr-bar"><div class="chipset">${[['open', 'Open'], ['applied', '📝 Applied'], ['trialling', '⚽ Trialling'], ['signed', '✍️ Signed'], ['released', '👋 Released'], ['declined', '⛔ Declined'], ['all', 'All']].map(([k, l]) => `<button type="button" class="chip${T.filter === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
<input class="tr-search" type="search" placeholder="Search EA ID, Discord, position…" value="${esc(T.q)}" data-q><button class="btn sm" type="button" data-add>➕ Add applicant</button></div>
${list.length ? `<div class="tr-cards">${list.map((t) => trialCard(t, ctx)).join('')}</div>` : UI.empty({ icon: '🧭', title: all.length ? 'Nothing here' : 'No applicants yet', text: all.length ? 'Try another filter.' : 'Applications from the Trials page, Discord and member tips land here.' })}`;
  }
  async function setStatus(ctx, id, status, reason) {
    const prev = T.data;
    T.data = { ...prev, trials: prev.trials.map((t) => (t.id === id ? { ...t, status, updated: Date.now(), events: [...t.events, { kind: 'status', status, by: ctx.me.n, at: Date.now() }] } : t)) };
    ctx.redraw();
    try { T.data = await ctx.call('/api/trials/update', { id, status, reason }); ctx.redraw(); ctx.toast(`${prev.trials.find((t) => t.id === id)?.ea}: ${ST[status][1]}`); } catch (e) { T.data = prev; ctx.redraw(); ctx.toast(e.message, true); }
  }
  async function portal(el, ctx) {
    const redraw = () => {
      const q = $('[data-q]', el), pos = q === document.activeElement ? q.selectionStart : null;
      el.innerHTML = portalView(ctx);
      if (pos !== null) { const n = $('[data-q]', el); n.focus(); n.setSelectionRange(pos, pos); }
      T.modal?.();
    };
    ctx = { ...ctx, redraw };
    el.onclick = async (e) => {
      const b = e.target.closest('[data-f], [data-st], [data-add], [data-open]');
      if (!b || e.target.closest('a')) return;
      if (b.dataset.f) { T.filter = T.filter === b.dataset.f && b.classList.contains('tr-stat') ? 'open' : b.dataset.f; redraw(); }
      if (b.dataset.st) setStatus(ctx, +b.dataset.id, b.dataset.st);
      if (b.dataset.add !== undefined) addModal(ctx);
      if (b.dataset.open) cardModal(ctx, +b.dataset.open);
    };
    el.onkeydown = (e) => { if (e.key === 'Enter' && e.target.dataset.open) cardModal(ctx, +e.target.dataset.open); };
    el.oninput = (e) => { if (e.target.dataset.q !== undefined) { T.q = e.target.value; redraw(); } };
    redraw();
    try { T.data = await ctx.call('/api/trials'); if (el.isConnected) redraw(); } catch (e) { el.innerHTML = UI.empty({ icon: '⚠️', title: 'Could not load trials', text: e.message }); }
  }
  function addModal(ctx) {
    UI.modal({ title: 'Add applicant', icon: '➕', wide: true, actions: [], body: `<form class="tr-form" data-addf novalidate>
<div class="tr-grid"><label class="fld">EA ID / gamertag<input name="ea" maxlength="40" required autocomplete="off"></label><label class="fld">Discord username<input name="discord" maxlength="33" autocomplete="off"></label>
<label class="fld">Platform ${platSel()}</label><label class="fld">Clips link<input name="clips" type="url" maxlength="300" placeholder="https://…"></label>
<label class="fld">Came from<select name="source"><option value="discord">💬 Discord "Apply to Join"</option><option value="manual">✋ Other</option></select></label>
<label class="fld">Status<select name="status"><option value="applied">📝 Applied</option><option value="trialling">⚽ Trialling now</option></select></label></div>
<label class="fld">Positions (up to 3)</label>${posChips()}
<label class="fld" style="margin-top:12px">Their message<textarea name="note" rows="3" maxlength="500"></textarea></label>
<div class="row"><button class="btn" type="submit">➕ Add trial card</button></div></form>`,
    onOpen: (d, close) => {
      wireChips(d, ctx.toast);
      $('[data-addf]', d).onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        const body = { ea: f.ea.value, discord: f.discord.value, platform: f.platform.value, clips: f.clips.value, source: f.source.value, status: f.status.value, positions: chipsOf(f), note: f.note.value };
        try { T.data = await ctx.call('/api/trials/add', body); close(); ctx.redraw(); ctx.toast(`${body.ea} added`); } catch (er) {
          if (er.message.includes('already has an open') && await UI.confirm({ title: 'Add anyway?', text: er.message, ok: 'Add a second card' })) {
            try { T.data = await ctx.call('/api/trials/add', { ...body, force: true }); close(); ctx.redraw(); } catch (e2) { ctx.toast(e2.message, true); }
          } else ctx.toast(er.message, true);
        }
      };
    } });
  }
  function cardModal(ctx, id) {
    const t0 = T.data.trials.find((t) => t.id === id);
    if (!t0) return;
    let dlg;
    const body = () => {
      const t = T.data.trials.find((x) => x.id === id);
      const sessions = t.events.filter((e) => e.kind === 'session');
      const hist = t.events.filter((e) => e.kind === 'status');
      const pl = t.player && ctx.players.find((p) => p.k === t.player);
      return `<div class="tr-detail">
<div class="tr-d-head"><div class="nx-pills">${stPill(t.status)}${t.platform ? UI.pill(t.platform, { emoji: '🎮' }) : ''}${t.positions.map((p) => UI.pill(p)).join('')}</div>
<p class="tr-meta">${SRC[t.source] || ''}${t.by ? ` · ${esc(t.by.n)}` : ''} · ${ago(t.at)}${t.discord ? ` · 💬 <b>@${esc(t.discord)}</b>` : ''} ${clipLink(t.clips)}</p>
${t.note ? `<q>${esc(t.note)}</q>` : ''}
<div class="row">${(NEXT[t.status] || []).map((s) => `<button class="btn sm${s === 'declined' || s === 'released' ? ' ghost' : ''}" type="button" data-to="${s}">${NEXT_LABEL[s]}</button>`).join('')}</div></div>
<section><h4>🪪 Player page</h4><div class="row">${pl ? `<a href="${BASE}players/${encodeURIComponent(pl.k)}.html"><b>${esc(pl.n)}</b></a>${pl.s ? `<small class="muted">${esc(pl.pos || '')} · ${pl.s.gp} games · ${Number(pl.s.r).toFixed(1)} avg</small>` : ''}<button class="btn ghost sm" type="button" data-unlink>Unlink</button>`
    : `<input list="tr-players" data-plink placeholder="Played us? Type their gamertag…" autocomplete="off"><datalist id="tr-players">${ctx.players.slice(0, 3000).map((p) => `<option value="${esc(p.n)}">`).join('')}</datalist><button class="btn ghost sm" type="button" data-link>Link</button>`}</div></section>
<section><h4>⚽ Trial sessions</h4>${sessions.length ? `<ul class="tr-sessions">${sessions.map((s) => `<li><time>${esc(s.date)}</time>${s.result ? `<b>${esc(s.result)}</b>` : ''}${s.rating ? `<span class="rp ${s.rating >= 8 ? 'r-great' : s.rating >= 7 ? 'r-good' : s.rating >= 6 ? 'r-mid' : 'r-low'}">${esc(s.rating)}</span>` : ''}${s.detail ? `<span class="muted">${esc(s.detail)}</span>` : ''}<small class="muted">${esc(s.by || '')}</small></li>`).join('')}</ul>` : '<p class="muted small">No sessions logged yet.</p>'}
<form class="tr-sess" data-sess><input type="date" name="date" value="${today()}" max="${today()}" required><input name="result" maxlength="80" placeholder="Result, e.g. W 3–1 vs Rivals"><input name="rating" type="number" min="1" max="10" step="0.1" placeholder="Rating"><input name="detail" maxlength="300" placeholder="How did it go?"><button class="btn sm" type="submit">＋ Log session</button></form></section>
${T.data.canNotes ? `<section><h4>📝 Manager notes <small class="muted">(managers only)</small></h4>${notesList(t.notes, ctx)}<form class="tr-noteform" data-note><textarea name="text" rows="2" maxlength="1000" placeholder="Private note about this trial…" required></textarea><button class="btn sm" type="submit">Add note</button></form></section>` : ''}
<section><h4>🗂 Decision history</h4><ol class="tr-hist">${hist.map((h) => `<li>${stPill(h.status)}<span>${esc(h.by || '')}</span>${h.detail && !SRC[h.detail] ? `<span class="muted">“${esc(h.detail)}”</span>` : ''}<small class="muted">${ago(h.at)}</small></li>`).join('')}</ol></section></div>`;
    };
    const update = async (payload, msg) => {
      try { T.data = await ctx.call('/api/trials/update', { id, ...payload }); ctx.redraw(); if (msg) ctx.toast(msg); } catch (e) { ctx.toast(e.message, true); }
    };
    const p = UI.modal({ title: t0.ea, icon: '🧭', wide: true, actions: [], body: body(), onOpen: (d) => {
      dlg = d;
      d.addEventListener('click', async (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.to) {
          const s = b.dataset.to;
          if (['declined', 'released', 'signed'].includes(s)) {
            let reason = '';
            const r = await UI.modal({ title: `${NEXT_LABEL[s].replace(/^\S+\s/, '')} ${t0.ea}?`, icon: ST[s][0], body: '<label class="fld">Reason (optional, shown in the history)<input class="tr-reason" maxlength="200"></label>', actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: NEXT_LABEL[s], value: 'ok', kind: s === 'signed' ? '' : 'danger' }], onOpen: (d2) => { d2.addEventListener('input', (ev) => { reason = ev.target.value; }); } });
            if (r !== 'ok') return;
            return setStatus(ctx, id, s, reason);
          }
          return setStatus(ctx, id, s);
        }
        if (b.dataset.link !== undefined) {
          const name = $('[data-plink]', d).value.trim().toLowerCase();
          const pl = ctx.players.find((x) => x.n.toLowerCase() === name);
          if (!pl) return ctx.toast('No player with that gamertag on the site', true);
          update({ player: pl.k }, `Linked to ${pl.n}`);
        }
        if (b.dataset.unlink !== undefined) update({ player: '' }, 'Player page unlinked');
        if (b.dataset.del) delNote(ctx, +b.dataset.del, (notes) => { T.data.trials.find((x) => x.id === id).notes = notes; ctx.redraw(); });
      });
      d.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        if (f.dataset.sess !== undefined) update({ session: { date: f.date.value, result: f.result.value, rating: f.rating.value, detail: f.detail.value } }, 'Session logged');
        if (f.dataset.note !== undefined) {
          try {
            const r = await ctx.call('/api/notes', { kind: 'trial', subject: String(id), tag: 'trial', text: f.text.value });
            T.data.trials.find((x) => x.id === id).notes = r.notes.slice().reverse(); ctx.redraw(); ctx.toast('Note saved');
          } catch (er) { ctx.toast(er.message, true); }
        }
      });
    } });
    // Re-render the open card whenever the list redraws (after any change).
    T.modal = () => { if (dlg?.isConnected && T.data.trials.some((x) => x.id === id)) { const b = $('.nx-modal-body', dlg); const st = b.scrollTop; b.innerHTML = body(); b.scrollTop = st; } };
    p.then(() => { T.modal = null; });
  }

  // ================= Manager notes (P5.7) =================
  const noteLine = (n, ctx) => `<li class="tr-n tag-${esc(n.tag)}"><div class="tr-n-head">${tagPill(n.tag)}${n.subjectHtml || ''}<span class="grow"></span>${UI.member({ id: n.by.id, n: n.by.n, a: n.by.a }, { size: 20, card: false })}<small class="muted">${ago(n.at)}</small>${n.mine || ctx.role === 'owner' ? `<button type="button" class="tr-x" data-del="${n.id}" aria-label="Delete note">🗑</button>` : ''}</div><p>${esc(n.text)}</p></li>`;
  const notesList = (notes, ctx) => (notes.length ? `<ul class="tr-notes">${notes.map((n) => noteLine(n, ctx)).join('')}</ul>` : '<p class="muted small">No notes yet.</p>');
  async function delNote(ctx, id, done, all = false) {
    if (!(await UI.confirm({ title: 'Delete note?', text: 'It is removed for every manager.', ok: 'Delete', danger: true }))) return;
    try { const r = await ctx.call('/api/notes/delete', { id, all }); done(r.notes); ctx.toast('Note deleted'); } catch (e) { ctx.toast(e.message, true); }
  }
  const noteForm = (withTags = true) => `<form class="tr-noteform" data-note>${withTags ? `<div class="chipset" data-tagpick>${Object.entries(TAG).filter(([k]) => k !== 'trial').map(([k, [i, l]], x) => `<button type="button" class="chip${x === 0 ? ' on' : ''}" data-tag="${k}">${i} ${l}</button>`).join('')}</div>` : ''}<textarea name="text" rows="3" maxlength="1000" placeholder="Private note – only managers can see it" required></textarea><button class="btn sm" type="submit">Add note</button></form>`;
  const pickTag = (root) => $('[data-tagpick] .chip.on', root)?.dataset.tag || 'general';
  const wireTagPick = (root) => root.addEventListener('click', (e) => { const b = e.target.closest('[data-tagpick] .chip'); if (!b) return; $$('.chip', b.parentElement).forEach((c) => c.classList.toggle('on', c === b)); });

  // Modal from the Members table: notes about one member (and their claimed player).
  async function notesModal(ctx, { kind, subject, title }) {
    let notes = null, dlg;
    const body = () => `${notes ? notesList(notes, ctx) : UI.skeleton('rows', 2)}${noteForm()}`;
    const paint = () => { if (dlg?.isConnected) $('.nx-modal-body', dlg).innerHTML = body(); };
    UI.modal({ title, icon: '📝', wide: true, actions: [], body: body(), onOpen: (d) => {
      dlg = d; wireTagPick(d);
      d.addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (b) delNote(ctx, +b.dataset.del, (n) => { notes = n; paint(); }); });
      d.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { notes = (await ctx.call('/api/notes', { kind, subject, tag: pickTag(d), text: e.target.text.value })).notes; paint(); ctx.toast('Note saved'); } catch (er) { ctx.toast(er.message, true); }
      });
    } });
    try { notes = (await ctx.call(`/api/notes?kind=${kind}&subject=${encodeURIComponent(subject)}`)).notes; paint(); } catch (e) { ctx.toast(e.message, true); }
  }

  // Portal tab: every note, filter by subject type / tag, search, add a note about anyone.
  const N = { notes: null, kind: '', tag: '', q: '', trials: null };
  async function notesTab(el, ctx) {
    const users = Object.entries(ctx.admin?.users || {}).sort(([, a], [, b]) => a.n.localeCompare(b.n));
    const squad = ctx.players.filter((p) => p.home).sort((a, b) => a.n.localeCompare(b.n));
    const subj = (n) => {
      if (n.kind === 'member') { const u = ctx.admin?.users?.[n.subject]; return `<span class="tr-subj">👤 ${esc(u?.n ?? n.subject)}</span>`; }
      if (n.kind === 'player') { const p = ctx.players.find((x) => x.k === n.subject); return `<a class="tr-subj" href="${BASE}players/${encodeURIComponent(n.subject)}.html">🪪 ${esc(p?.n ?? n.subject)}</a>`; }
      const t = N.trials?.find((x) => String(x.id) === n.subject); return `<span class="tr-subj">🧭 ${esc(t?.ea ?? `Trial #${n.subject}`)}</span>`;
    };
    const draw = () => {
      const words = N.q.toLowerCase().split(/\s+/).filter(Boolean);
      const list = (N.notes || []).map((n) => ({ ...n, subjectHtml: subj(n) }))
        .filter((n) => (!N.kind || n.kind === N.kind) && (!N.tag || n.tag === N.tag) && words.every((w) => `${n.text} ${n.subjectHtml} ${n.by.n}`.toLowerCase().includes(w)));
      el.innerHTML = `<div class="tr-notes-top"><form class="card tr-noteform" data-note><h3>📝 New note</h3>
<div class="row"><select name="kind" data-kind><option value="member">👤 Member</option><option value="player">🪪 Squad player</option>${N.trials?.length ? '<option value="trial">🧭 Trial card</option>' : ''}</select>
<select name="subject" data-subject></select></div>
<div class="chipset" data-tagpick>${Object.entries(TAG).map(([k, [i, l]], x) => `<button type="button" class="chip${x === 0 ? ' on' : ''}" data-tag="${k}">${i} ${l}</button>`).join('')}</div>
<textarea name="text" rows="3" maxlength="1000" placeholder="Strengths, issues, trial notes… only managers can see this" required></textarea><button class="btn sm" type="submit">Add note</button></form></div>
<div class="tr-bar"><div class="chipset">${[['', 'All'], ['member', '👤 Members'], ['player', '🪪 Players'], ['trial', '🧭 Trials']].map(([k, l]) => `<button type="button" class="chip${N.kind === k ? ' on' : ''}" data-kf="${k}">${l}</button>`).join('')}</div>
<div class="chipset">${Object.entries(TAG).map(([k, [i]]) => `<button type="button" class="chip${N.tag === k ? ' on' : ''}" data-tf="${k}" data-tip="${TAG[k][1]}">${i}</button>`).join('')}</div>
<input class="tr-search" type="search" placeholder="Search notes…" value="${esc(N.q)}" data-nq></div>
${!N.notes ? UI.skeleton('rows', 3) : list.length ? `<ul class="tr-notes">${list.map((n) => noteLine(n, ctx)).join('')}</ul>` : UI.empty({ icon: '📝', title: N.notes.length ? 'No matching notes' : 'No notes yet', text: 'Private notes about members, players and trialists – timestamped, managers only.' })}`;
      fillSubjects();
    };
    const fillSubjects = () => {
      const k = $('[data-kind]', el), s = $('[data-subject]', el);
      if (!k || !s) return;
      const opts = k.value === 'member' ? users.map(([id, u]) => [id, u.n]) : k.value === 'player' ? squad.map((p) => [p.k, p.n]) : (N.trials || []).map((t) => [String(t.id), `${t.ea} (${ST[t.status][1]})`]);
      s.innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
    };
    wireTagPick(el);
    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.kf !== undefined) { N.kind = b.dataset.kf; draw(); }
      if (b.dataset.tf) { N.tag = N.tag === b.dataset.tf ? '' : b.dataset.tf; draw(); }
      if (b.dataset.del) delNote(ctx, +b.dataset.del, (n) => { N.notes = n; draw(); }, true);
    };
    el.onchange = (e) => { if (e.target.dataset.kind !== undefined) fillSubjects(); };
    el.oninput = (e) => { if (e.target.dataset.nq !== undefined) { N.q = e.target.value; const pos = e.target.selectionStart; draw(); const n = $('[data-nq]', el); n.focus(); n.setSelectionRange(pos, pos); } };
    el.onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      try { N.notes = (await ctx.call('/api/notes', { kind: f.kind.value, subject: f.subject.value, tag: pickTag(f), text: f.text.value, all: true })).notes; draw(); ctx.toast('Note saved'); } catch (er) { ctx.toast(er.message, true); }
    };
    draw();
    try {
      const [n, t] = await Promise.all([ctx.call('/api/notes'), ctx.flagTrials ? ctx.call('/api/trials').catch(() => null) : null]);
      N.notes = n.notes; N.trials = t?.trials ?? null;
      if (el.isConnected) draw();
    } catch (e) { ctx.toast(e.message, true); }
  }

  window.NXTrials = { apply, scout, portal, notesTab, notesModal, counts: () => T.data?.trials };
})();
