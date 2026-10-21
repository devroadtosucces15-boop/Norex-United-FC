// 👑 Owner button (BOT-SITE #6, flag ownerFab, owner only): one gold button on every page with the owner's own crest and a badge for what is
// waiting. It opens the owner tools in one sheet:
//   GET /api/manager/queue  → { claims, cards, rush, requests, ideas, at }  (only the queues this person may decide; same numbers as Discord's /panel)
//   GET /api/docs           → { held }  (true until POST /api/docs/release, which lives in Staff › Content, never here)
// Links go to the Staff rooms, "Preview as" uses the same switch as the header, the issue reporter button is the 🐞 tool when issueTool is on.
(() => {
  const d = document, w = window, A = w.NorexAuth, API = w.NOREX_API;
  const QUEUE = [['claims', '🪪', 'Player claims', 'staff-desk.html'], ['cards', '🎨', 'Card artwork', 'staff-artwork.html'], ['rush', '⚡', 'Rush results', 'staff-desk.html'], ['requests', '📥', 'Requests', 'staff-desk.html'], ['ideas', '💡', 'Ideas', 'staff-content.html']];
  const LINKS = [['staff-boardroom.html', '👑', 'Boardroom', 'Club health, recruitment and feature switches'], ['staff-boardroom.html', '🎚️', 'Feature flags', 'Open or close a feature for members'], ['staff-boardroom.html', '🩺', 'Health', 'Site, bot and crawl status'], ['staff-content.html', '📣', 'Announcements', 'Post a club announcement or edit the docs']];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // pure: the numbers the badge and the sheet show (unknown keys and non-numbers are ignored)
  const tally = (q) => { const rows = QUEUE.filter(([k]) => Number.isFinite(+q?.[k])).map(([k, i, l, h]) => ({ k, icon: i, label: l, href: h, n: Math.max(0, Math.floor(+q[k])) })); return { rows, total: rows.reduce((a, r) => a + r.n, 0) }; };
  // pure: the item that has waited longest. The Worker may send `oldest: { kind, at, title? }` next to the counts (kind = a queue key, at = ms);
  // anything else, or a kind with nothing waiting, gives null and the line simply is not shown.
  const waited = (ms) => { const m = Math.floor(Math.max(0, ms) / 6e4), h = Math.floor(m / 60), dd = Math.floor(h / 24); return m < 2 ? 'just now' : h < 1 ? `${m} min` : dd < 1 ? `${h} h` : `${dd} d`; };
  const oldest = (q, now = Date.now()) => {
    const o = q && q.oldest, row = o && tally(q).rows.find((r) => r.k === o.kind), at = o && +o.at;
    if (!row || !row.n || !(at > 0) || at > now + 6e4) return null;
    return { k: row.k, icon: row.icon, label: row.label, href: row.href, title: String(o.title || '').slice(0, 80), age: waited(now - at), late: now - at > 48 * 36e5 };
  };
  const PANEL_CMD = '/panel', DISCORD = 'https://discord.com/channels/1371311947894489299';
  w.NorexOwnerFab = { tally, oldest, waited, PANEL_CMD, DISCORD };
  if (!A || !API || !A.token || A.role !== 'owner') return;
  const CREST = '<svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true" focusable="false"><defs><linearGradient id="ofg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2bd"/><stop offset=".5" stop-color="#efcf7a"/><stop offset="1" stop-color="#b8852a"/></linearGradient></defs><path d="M24 3 41 9v14c0 11-7 18-17 22C14 41 7 34 7 23V9z" fill="url(#ofg)" stroke="#6b4a10" stroke-width="1.4"/><path d="M14 27 13 16l6 5 5-9 5 9 6-5-1 11z" fill="#1a1405"/><rect x="14" y="29" width="20" height="3" rx="1.5" fill="#1a1405"/></svg>';
  const go = () => Promise.resolve(A.ready).then(() => {
    if (!(A.features || []).includes('ownerFab') || d.querySelector('.of-fab')) return;
    const call = (p) => A.call(p);
    let q = null, held = null, sheet = null, last = null;
    const fab = d.createElement('button'); fab.type = 'button'; fab.className = 'of-fab'; fab.setAttribute('aria-haspopup', 'dialog'); fab.setAttribute('aria-label', 'Owner tools');
    fab.innerHTML = `<span class="of-ring"><span class="of-face">${CREST}</span></span><b class="of-badge" hidden></b>`;
    d.body.append(fab);
    const badge = () => { const n = tally(q).total, b = fab.querySelector('.of-badge'); b.hidden = !n; b.textContent = n > 99 ? '99+' : n; fab.setAttribute('aria-label', n ? `Owner tools, ${n} waiting for you` : 'Owner tools'); };
    const load = async () => {
      const [a, b] = await Promise.all([call('/api/manager/queue').catch(() => null), call('/api/docs').catch(() => null)]);
      if (a) q = a; if (b) held = b.held === true; badge(); if (sheet) body();
    };
    const viewAs = () => A.viewAs || '';
    const body = () => {
      const t = tally(q), old = oldest(q), el = sheet.querySelector('.of-body'), rep = d.querySelector('.nxr-fab');
      el.innerHTML = `<section><h4>Waiting for you</h4>${q === null ? '<p class="muted small">Could not load the queue.</p>' : t.total ? `<ul class="of-list">${t.rows.filter((r) => r.n).map((r) => `<li><a class="of-row" href="${esc(r.href)}"><span aria-hidden="true">${r.icon}</span><b>${esc(r.label)}</b><em class="num">${r.n}</em></a></li>`).join('')}</ul>` : '<p class="muted small">All clear. Nothing is waiting for a decision. 🎉</p>'}</section>
${old ? `<section><a class="of-row of-old${old.late ? ' late' : ''}" href="${esc(old.href)}"><span aria-hidden="true">⏳</span><span class="of-t"><small class="muted">Waiting longest</small><b>${old.icon} ${esc(old.title || old.label)}</b></span><em class="num">${esc(old.age)}</em></a></section>` : ''}
<section><button type="button" class="of-row of-pn" data-panel><span aria-hidden="true">💬</span><span class="of-t"><b>Open Discord /panel</b><small class="muted">Copies /panel, then paste it in any channel</small></span></button></section>
${held ? `<section><h4>Club docs</h4><a class="of-row of-gold" href="staff-content.html"><span aria-hidden="true">🚀</span><b>Club docs are on hold</b><em>Release ›</em></a><p class="muted tiny">The release button is in Content › Club docs. Nothing reaches members until you press it.</p></section>` : ''}
<section><h4>Staff rooms</h4><ul class="of-list">${LINKS.map(([h, i, l, s]) => `<li><a class="of-row" href="${h}"><span aria-hidden="true">${i}</span><span class="of-t"><b>${l}</b><small class="muted">${s}</small></span></a></li>`).join('')}</ul></section>
<section><h4>Preview as</h4><div class="of-seg" role="group" aria-label="Preview the site as">${[['', 'Owner'], ['member', 'Member'], ['guest', 'Guest']].map(([v, l]) => `<button type="button" class="chip${viewAs() === v ? ' on' : ''}" aria-pressed="${viewAs() === v}" data-as="${v}">${l}</button>`).join('')}</div><p class="muted tiny">Display only. The server still treats you as the owner. Switches back by itself after a while.</p></section>
${rep ? '<section><h4>Report an issue</h4><button type="button" class="chip" data-report>🐞 Mark something on this page</button></section>' : ''}`;
    };
    const close = () => { if (!sheet) return; const s = sheet; sheet = null; s.classList.add('out'); setTimeout(() => s.remove(), 220); fab.setAttribute('aria-expanded', 'false'); (last || fab).focus?.(); d.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const open = () => {
      if (sheet) return close(); last = d.activeElement; fab.setAttribute('aria-expanded', 'true');
      sheet = d.createElement('div'); sheet.className = 'mx-sheet of-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Owner tools');
      sheet.innerHTML = `<div class="mx-sheet-body"><div class="of-h"><span class="of-stamp">${CREST}</span><div><h3>Owner tools</h3><p class="muted small">${esc(A.name || 'Owner')}</p></div><button type="button" class="of-x" data-x aria-label="Close">✕</button></div><div class="of-body"></div></div>`;
      d.body.append(sheet); body(); load(); d.addEventListener('keydown', onKey); sheet.querySelector('[data-x]').focus();
      sheet.addEventListener('click', (e) => {
        if (e.target === sheet || e.target.closest('[data-x]')) return close();
        const a = e.target.closest('[data-as]'); if (a) { try { const v = a.dataset.as; if (v) { localStorage.setItem('norex.viewas', v); localStorage.setItem('norex.viewas.t', String(Date.now())); } else { localStorage.removeItem('norex.viewas'); localStorage.removeItem('norex.viewas.t'); } } catch {} return location.reload(); }
        if (e.target.closest('[data-panel]')) { // one tap: /panel is on the clipboard and Discord opens; the manager approvals appear where you paste it
          const N = w.NorexOwnerFab, say = (m, kind) => w.NorexMotion?.toast?.(m, { kind, icon: '💬' });
          (navigator.clipboard ? navigator.clipboard.writeText(N.PANEL_CMD) : Promise.reject()).then(() => say('Copied /panel. Paste it in any Discord channel and press Enter.', 'ok'), () => say('Type /panel in any Discord channel.', 'warn'));
          w.open(N.DISCORD, '_blank', 'noopener'); return;
        }
        if (e.target.closest('[data-report]')) { close(); setTimeout(() => d.querySelector('.nxr-fab')?.click(), 260); }
      });
    };
    fab.addEventListener('click', open);
    load(); setInterval(() => { if (!d.hidden) load(); }, 60e3); d.addEventListener('visibilitychange', () => { if (!d.hidden) load(); });
  });
  go();
})();
