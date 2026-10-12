// 🧭 Floating navigator (feedback #18, flag staffNav, owner): managers and the owner get a round compass on every page.
// It lists the headings of the page you are on (jump + highlights where you are), plus Top / Staff rooms. Reads the page only – changes nothing.
(() => {
  const d = document, A = window.NorexAuth, API = window.NOREX_API, page = (window.NOREX && window.NOREX.page) || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ROOMS = [['staff-desk.html', '🗂️', 'Desk'], ['staff-tools.html', '🛠️', 'Tools'], ['staff-schedule.html', '🗓️', 'Schedule'], ['staff-dugout.html', '🧢', 'Dugout'], ['staff-boardroom.html', '👑', 'Boardroom'], ['staff-artwork.html', '🎨', 'Artwork'], ['staff-insights.html', '🔎', 'Insights']];
  let fab = null, panel = null, heads = [];
  const root = () => d.querySelector('main') || d.body;
  const collect = () => {
    const seen = new Set(); let n = 0;
    heads = [...root().querySelectorAll('h1,h2,h3')].filter((h) => h.offsetParent !== null && !h.closest('.gr-sheet,.nv-panel,dialog,[hidden]') && h.textContent.trim()).slice(0, 24).map((h) => {
      if (!h.id) { let id = 'nv-' + (h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || ++n); while (seen.has(id) || d.getElementById(id)) id += '-' + (++n); h.id = id; } seen.add(h.id);
      return { el: h, id: h.id, t: h.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) };
    });
  };
  const current = () => { let c = -1; heads.forEach((h, i) => { if (h.el.getBoundingClientRect().top < innerHeight * 0.35) c = i; }); return c; };
  const close = () => { if (!panel) return; const p = panel; panel = null; p.classList.add('out'); setTimeout(() => p.remove(), 200); fab.setAttribute('aria-expanded', 'false'); fab.focus(); };
  const open = () => {
    if (panel) return close();
    collect(); const cur = current();
    panel = d.createElement('div'); panel.className = 'nv-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Page navigator');
    panel.innerHTML = `<div class="nv-h"><b>🧭 On this page</b><button type="button" class="nv-x" data-nv-close aria-label="Close navigator">✕</button></div>
<ol class="nv-list">${heads.length ? heads.map((h, i) => `<li><a href="#${esc(h.id)}" data-i="${i}"${i === cur ? ' class="on" aria-current="location"' : ''}>${esc(h.t)}</a></li>`).join('') : '<li class="nv-none muted">No sections to jump to here.</li>'}</ol>
<div class="nv-acts"><button type="button" class="nv-b" data-nv-top>⬆️ Top</button><button type="button" class="nv-b" data-nv-end>⬇️ End</button></div>
<div class="nv-rooms">${ROOMS.map(([h, i, t]) => `<a href="${h}"${h === page ? ' aria-current="page"' : ''}><span aria-hidden="true">${i}</span>${t}</a>`).join('')}</div>`;
    d.body.appendChild(panel); fab.setAttribute('aria-expanded', 'true');
    const smooth = d.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-nv-close]')) return close();
      if (e.target.closest('[data-nv-top]')) { scrollTo({ top: 0, behavior: smooth }); return close(); }
      if (e.target.closest('[data-nv-end]')) { scrollTo({ top: d.documentElement.scrollHeight, behavior: smooth }); return close(); }
      const a = e.target.closest('a[data-i]'); if (a) { e.preventDefault(); heads[+a.dataset.i].el.scrollIntoView({ behavior: smooth, block: 'start' }); close(); }
    });
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    (panel.querySelector('a.on') || panel.querySelector('a,button')).focus();
  };
  const ring = () => { const h = d.documentElement.scrollHeight - innerHeight; fab.style.setProperty('--p', h > 0 ? Math.min(100, Math.round(scrollY / h * 100)) : 0); };
  function mount() {
    fab = d.createElement('button'); fab.type = 'button'; fab.className = 'nv-fab'; fab.setAttribute('aria-label', 'Page navigator'); fab.setAttribute('aria-haspopup', 'dialog'); fab.setAttribute('aria-expanded', 'false'); fab.title = 'Jump around this page';
    fab.innerHTML = '<span aria-hidden="true">🧭</span>'; fab.onclick = open; d.body.appendChild(fab);
    let t = 0; addEventListener('scroll', () => { if (!t) t = requestAnimationFrame(() => { t = 0; ring(); }); }, { passive: true }); ring();
    d.addEventListener('click', (e) => { if (panel && !panel.contains(e.target) && !fab.contains(e.target)) close(); });
  }
  if (API) A?.ready?.then(() => { if (A.token && (A.role === 'owner' || A.role === 'manager') && (A.features || []).includes('staffNav')) mount(); });
  else if (window.NorexAs === 'owner') mount();
})();
