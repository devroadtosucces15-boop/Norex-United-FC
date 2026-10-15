// Hub › Handbook › the club rules as a clipboard (#52). Each rule is ticked off in turn: tap the box, a pen draws the check,
// the next rule slides in. When the last one is ticked the current rules version is acknowledged (POST /api/docs/ack, done by
// handbook.js through NorexClip.onDone). Ticks are remembered per member and per rule version, so after an edit only the new or
// changed rules ask for a tick again. Without the live API (design build) it works on the six static rules and stores locally.
(() => {
  const d = document, root = d.getElementById('hbclip'); if (!root) return;
  const $ = (s, r = root) => r.querySelector(s);
  const M = window.NorexMotion, A = window.NorexAuth;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KEY = 'norex.rules.' + (A?.session?.u || 'local');
  const store = { get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }, set(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || d.documentElement.dataset.motion === 'off';
  let ticks = store.get(), meta = { version: 0, acked: false, ackedAt: 0 }, live = false;
  const list = $('#cliplist'), foot = $('#clipfoot'), prog = $('#clipprog');
  const rows = () => [...list.querySelectorAll('.clip-r')];
  const id = (r) => r.dataset.rid;

  function paint() {
    const rs = rows(); let act = null;
    rs.forEach((r) => { const done = !!ticks[id(r)] || meta.acked; r.classList.toggle('done', done); r.classList.remove('active', 'wait'); if (!done) { if (!act) { act = r; r.classList.add('active'); } else r.classList.add('wait'); } r.querySelector('.clip-ck').disabled = !(r === act); r.querySelector('.clip-ck').setAttribute('aria-pressed', String(done)); });
    const n = rs.filter((r) => r.classList.contains('done')).length;
    prog.textContent = rs.length ? (n === rs.length ? 'all ticked' : `${n} of ${rs.length}`) : '';
    root.classList.toggle('all', !!rs.length && n === rs.length);
    foot.innerHTML = rs.length && n === rs.length
      ? `<div class="clip-stamp" role="status"><b>Acknowledged</b><small>${meta.version ? 'Version ' + meta.version : 'Club rules'}${meta.ackedAt ? ' · ' + new Date(meta.ackedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</small></div>`
      : `<p class="muted small">${act ? 'Read the rule, then tick the box. The next one appears.' : ''} Managers can see who has acknowledged the current rules.</p>`;
  }

  async function tick(btn) {
    const r = btn.closest('.clip-r'); if (!r || !r.classList.contains('active') || r.classList.contains('inking')) return;
    r.classList.add('inking'); btn.disabled = true;
    await new Promise((ok) => setTimeout(ok, reduced() ? 60 : 720));      // the pen draws the check
    ticks[id(r)] = 1; store.set(ticks); r.classList.remove('inking'); M?.haptic?.();
    const before = rows().filter((x) => !x.classList.contains('done')).length;
    paint();
    const nx = rows().find((x) => x.classList.contains('active'));
    if (nx) { nx.classList.add('slide'); setTimeout(() => nx.classList.remove('slide'), 600); if (innerWidth < 900) nx.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }
    else if (before === 1) { root.classList.add('sealed'); setTimeout(() => root.classList.remove('sealed'), 1600); window.NorexClip.onDone?.(); }
  }
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-ck]'); if (b) tick(b); });

  // handbook.js hands over the live rules (area "rules" of /api/docs) and the member's acknowledge state
  window.NorexClip = {
    onDone: null,
    sync(R, items, md) {
      live = true; meta = { version: R?.version || 0, acked: !!R?.acked && !!items?.length, ackedAt: R?.ackedAt || 0 };
      if (items?.length) { root.dataset.static = ''; list.innerHTML = items.map((x, i) => `<li class="clip-r" data-rid="d${x.id}v${x.version || 1}"><span class="clip-n" aria-hidden="true">${i + 1}</span><div><b>${esc(x.title)}</b><div class="clip-md">${md ? md(x.body) : esc(x.body)}</div></div><button type="button" class="clip-ck" data-ck="d${x.id}" aria-label="I have read rule ${i + 1}: ${esc(x.title)}"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 21l8 8 16-19" pathLength="1"/></svg></button></li>`).join(''); }
      paint();
    },
    markAcked(R) { meta = { version: R?.version || meta.version, acked: true, ackedAt: R?.ackedAt || Date.now() }; paint(); },
  };
  paint();
})();
