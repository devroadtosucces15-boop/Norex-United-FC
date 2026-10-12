// ⚙️ Edit-in-place gear (feedback #18): managers and the owner get one floating gear on every page (flag editGear, owner).
// It opens a sheet with what can be changed for THIS page, using the same live routes the Staff rooms use:
//   News  – GET /api/feed?f=all, POST /api/feed/setpublic {id, public}, POST /api/feed/pin {id, pinned}
//   Join  – GET /api/trials, POST /api/trials/update {id, status}   (declining is a two-tap)
//   Fixtures – GET /api/events, POST /api/events/cancel {id}   (two-tap)
//   Squad – GET /api/squads (drafts + live), POST /api/squads/save {…, publish}, /api/squads/delete {id}
//   Hall of Fame – GET /api/hof, POST /api/hof/remove {id}   (two-tap)
// Every other page gets shortcuts to the matching Staff room. Nothing here is a second copy of a Staff tool – the server decides who may do what.
(() => {
  const d = document, API = window.NOREX_API, A = window.NorexAuth, M = window.NorexMotion, page = (window.NOREX && window.NOREX.page) || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const call = async (path, body) => {
    const r = await fetch(API + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { Authorization: 'Bearer ' + A.token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'That did not work (' + r.status + ').'); return j;
  };
  const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 3600 ? Math.max(1, Math.round(s / 60)) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
  const ROOMS = [['staff-desk.html', '🗂️', 'Desk'], ['staff-tools.html', '🛠️', 'Tools'], ['staff-schedule.html', '🗓️', 'Schedule'], ['staff-dugout.html', '🧢', 'Dugout'], ['staff-boardroom.html', '👑', 'Boardroom'], ['staff-artwork.html', '🎨', 'Artwork'], ['staff-insights.html', '🧭', 'Insights']];
  // which Staff room is closest to the page you are on (shown first)
  const NEAR = { 'fixtures.html': 'staff-schedule.html', 'schedule.html': 'staff-schedule.html', 'squad.html': 'staff-artwork.html', 'players.html': 'staff-artwork.html', 'halloffame.html': 'staff-boardroom.html', 'opponents.html': 'staff-insights.html', 'tactics.html': 'staff-dugout.html', 'join.html': 'staff-desk.html' };

  const EDITORS = {
    'news.html': {
      title: 'Public feed', icon: '📰', hint: 'Choose which club posts strangers can read on this page. Pinned posts stay on top (up to 3).',
      async load() { const r = await call('/api/feed?f=all'); return (r.posts || []).slice(0, 14); },
      row(p) {
        return `<li class="gr-row" data-id="${p.id}"><div class="gr-main"><b class="fit">${esc(p.by?.n || 'Member')}</b><small class="muted">${ago(p.at)}${p.pinned ? ' · 📌 pinned' : ''}</small><p>${esc(String(p.text || '(photo or clip)').slice(0, 140))}</p></div>
<div class="gr-acts"><button type="button" class="gr-sw${p.public ? ' on' : ''}" data-act="public" aria-pressed="${!!p.public}">🌍 ${p.public ? 'Public' : 'Private'}</button><button type="button" class="gr-sw${p.pinned ? ' on' : ''}" data-act="pin" aria-pressed="${!!p.pinned}">📌 ${p.pinned ? 'Pinned' : 'Pin'}</button></div></li>`;
      },
      async act(btn, p) {
        if (btn.dataset.act === 'public') return (await call('/api/feed/setpublic', { id: p.id, public: !p.public })).post;
        return (await call('/api/feed/pin', { id: p.id, pinned: !p.pinned })).post;
      },
      empty: 'No posts yet. Members post from the Clubhouse.',
    },
    'join.html': {
      title: 'Applications', icon: '📋', hint: 'People who applied or were recommended. Book a trial or decline here; the full pipeline is on the Desk.',
      async load() { const r = await call('/api/trials'); return (r.trials || []).filter((t) => t.status === 'applied' || t.status === 'recommended').slice(0, 12); },
      row(t) {
        return `<li class="gr-row" data-id="${t.id}"><div class="gr-main"><b class="fit">${esc(t.ea)}</b><small class="muted">${esc((t.positions || []).join(' / '))}${t.platform ? ' · ' + esc(t.platform) : ''} · ${ago(t.at)}${t.status === 'recommended' ? ' · 💡 tip' : ''}</small>${t.discord ? `<p class="muted">Discord: ${esc(t.discord)}</p>` : ''}</div>
<div class="gr-acts"><button type="button" class="gr-sw" data-act="booked">📅 Book trial</button><button type="button" class="gr-sw warn" data-act="declined">✖ Decline</button></div></li>`;
      },
      async act(btn, t) { await call('/api/trials/update', { id: t.id, status: btn.dataset.act }); return null; }, // null = row leaves the list
      confirm: { declined: 'Tap again to decline' },
      empty: 'No applications waiting. 🎉',
    },
    'fixtures.html': {
      title: 'Upcoming fixtures', icon: '🗓️', hint: 'Cancel a match night that will not happen. Members are told straight away. New nights are made in the Schedule room.',
      async load() { const r = await call('/api/events'); return (r.events || []).filter((e) => e.status === 'scheduled' && e.end > Date.now()).slice(0, 12); },
      row(e) {
        const when = new Date(e.start).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), yes = (e.rsvps || []).filter((x) => x.status === 'yes').length;
        return `<li class="gr-row" data-id="${e.id}"><div class="gr-main"><b class="fit">${esc(e.title || e.type || 'Match night')}</b><small class="muted">${esc(when)} · ${yes} in${e.public ? ' · 🌍 public' : ''}</small></div>
<div class="gr-acts"><button type="button" class="gr-sw warn" data-act="cancel">🚫 Cancel</button></div></li>`;
      },
      async act(btn, e) { await call('/api/events/cancel', { id: e.id }); return null; },
      confirm: { cancel: 'Tap again to cancel' },
      empty: 'No upcoming fixtures.',
    },
    'squad.html': {
      title: 'Rush squads', icon: '🛡️', hint: 'Draft squad sets wait here. Publish one to show it to members, or throw it away. Building squads is in the Artwork/Dugout rooms.',
      async load() { const r = await call('/api/squads'); return [...(r.drafts || []), ...(r.published ? [r.published] : [])].slice(0, 8); },
      row(q) {
        const live = q.status === 'published';
        return `<li class="gr-row" data-id="${q.id}"><div class="gr-main"><b class="fit">${esc(q.title)}</b><small class="muted">${live ? '✅ live' : '📝 draft'} · ${(q.squads || []).length} squads · ${esc(q.by || '')} · ${ago(q.at)}</small></div>
<div class="gr-acts">${live ? '' : '<button type="button" class="gr-sw" data-act="publish">📣 Publish</button>'}<button type="button" class="gr-sw warn" data-act="delete">🗑️ Delete</button></div></li>`;
      },
      async act(btn, q) {
        if (btn.dataset.act === 'delete') { await call('/api/squads/delete', { id: q.id }); return null; }
        await call('/api/squads/save', { id: q.id, title: q.title, event: q.event, squads: (q.squads || []).map((s) => ({ ids: s.ids, locked: !!s.locked })), bench: q.bench || [], publish: true });
        return { ...q, status: 'published' };
      },
      confirm: { delete: 'Tap again to delete' },
      empty: 'No squad sets saved yet.',
    },
    'halloffame.html': {
      title: 'Hall of Fame', icon: '🏛️', hint: 'Take an entry down. Inducting legends and adding moments is in the Boardroom.',
      async load() { const r = await call('/api/hof'); return [...(r.legends || []), ...(r.moments || [])].slice(0, 20); },
      row(h) {
        return `<li class="gr-row" data-id="${h.id}"><div class="gr-main"><b class="fit">${h.kind === 'legend' ? '⭐' : '📜'} ${esc(h.n)}</b><small class="muted">${esc(h.title || (h.kind === 'legend' ? 'Legend' : 'Club moment'))}${h.date ? ' · ' + esc(h.date) : ''}</small></div>
<div class="gr-acts"><button type="button" class="gr-sw warn" data-act="remove">✖ Remove</button></div></li>`;
      },
      async act(btn, h) { await call('/api/hof/remove', { id: h.id }); return null; },
      confirm: { remove: 'Tap again to remove' },
      empty: 'Nothing inducted yet.',
    },
  };

  let sheet = null, dirty = false, fab = null;
  const close = () => { if (!sheet) return; const s = sheet; sheet = null; s.classList.add('out'); setTimeout(() => s.remove(), 230); fab?.focus(); if (dirty) { dirty = false; location.reload(); } };

  async function open() {
    if (sheet) return;
    const ed = EDITORS[page], near = NEAR[page];
    const rooms = [...ROOMS].sort((a, b) => (b[0] === near) - (a[0] === near));
    sheet = d.createElement('div'); sheet.className = 'mx-sheet gr-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Edit this page');
    sheet.innerHTML = `<div class="mx-sheet-body"><div class="gr-h"><h3>⚙️ Edit this page</h3><button type="button" class="gr-x" data-gr-close aria-label="Close">✕</button></div>
${ed ? `<section class="gr-sec"><h4>${ed.icon} ${ed.title}</h4><p class="muted small">${ed.hint}</p>${API ? '<ul class="gr-list" data-gr-list><li class="gr-note muted">Loading…</li></ul>' : '<p class="gr-note muted">The live club server is not connected in this design build. On the live site this lists the real items.</p>'}</section>` : `<section class="gr-sec"><p class="muted small">Nothing on this page is edited in place yet. Use the Staff rooms below.</p></section>`}
<section class="gr-sec"><h4>Staff rooms</h4><div class="gr-rooms">${rooms.map(([h, i, t]) => `<a class="gr-room${h === near ? ' near' : ''}" href="${h}"><span aria-hidden="true">${i}</span>${t}</a>`).join('')}</div></section></div>`;
    d.body.appendChild(sheet);
    sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('[data-gr-close]')) close(); });
    sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    sheet.querySelector('[data-gr-close]').focus();
    if (!ed || !API) return;
    const list = sheet.querySelector('[data-gr-list]'); let items = [];
    const paint = () => { list.innerHTML = items.length ? items.map((x) => ed.row(x)).join('') : `<li class="gr-note muted">${ed.empty}</li>`; };
    try { items = await ed.load(); paint(); } catch (er) { list.innerHTML = `<li class="gr-note err">${esc(/404|Not available/.test(er.message) ? 'This is switched off on the server right now (see the Boardroom switches).' : er.message)}</li>`; return; }
    let armed = null;
    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const row = btn.closest('.gr-row'), i = items.findIndex((x) => String(x.id) === row.dataset.id); if (i < 0) return;
      const ask = ed.confirm && ed.confirm[btn.dataset.act];
      if (ask && armed !== btn) { if (armed) armed.textContent = armed.dataset.t; armed = btn; btn.dataset.t = btn.textContent; btn.textContent = ask; btn.classList.add('armed'); setTimeout(() => { if (armed === btn) { btn.textContent = btn.dataset.t; btn.classList.remove('armed'); armed = null; } }, 3500); return; }
      armed = null; row.classList.add('busy'); btn.disabled = true;
      try { const next = await ed.act(btn, items[i]); dirty = true; if (next) items[i] = next; else items.splice(i, 1); paint(); M?.toast('Saved', { kind: 'ok' }); }
      catch (er) { row.classList.remove('busy'); btn.disabled = false; M?.toast(er.message, { kind: 'err' }); }
    });
  }

  function mount() {
    fab = d.createElement('button'); fab.type = 'button'; fab.className = 'gr-fab'; fab.setAttribute('aria-label', 'Edit this page'); fab.title = 'Edit this page'; fab.innerHTML = '<span aria-hidden="true">⚙️</span>';
    fab.onclick = open; d.body.appendChild(fab);
  }

  // who gets it: the real signed-in owner/manager with the editGear flag; in a local design build the “Preview as Owner” role
  if (API) A?.ready?.then(() => { if (A.token && (A.role === 'owner' || A.role === 'manager') && (A.features || []).includes('editGear')) mount(); });
  else if (window.NorexAs === 'owner') mount();
})();
