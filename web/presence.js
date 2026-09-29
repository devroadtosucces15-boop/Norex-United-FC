// Online presence (roadmap P6.4) – loaded by app.js on every page for logged-in members when the `presence` flag is on.
// "🟢 N online" pill in the header → panel with who's on now / earlier this hour + "Appear offline". Member chips
// (UI.member, data-hc) anywhere on the page get a green ring when that member is online, amber when seen this hour.
// Polls GET /api/presence every 2 minutes while the tab is visible – the poll itself keeps you online.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '';
  if (!$('link[href$="social.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/social.css` }));
  const POLL = 120e3;
  const P = { on: new Set(), recent: new Set(), d: null };
  let ctx, btn, panel, timer = 0, painting = 0;

  // ---------- dots on member chips ----------
  function decorate() {
    painting = 0;
    document.querySelectorAll('.nx-member[data-hc]').forEach((el) => {
      const id = el.dataset.hc;
      el.classList.toggle('is-online', P.on.has(id));
      el.classList.toggle('is-recent', !P.on.has(id) && P.recent.has(id));
    });
  }
  const later = () => { if (!painting) painting = setTimeout(decorate, 60); };

  // ---------- header pill + panel ----------
  const since = (t) => { const m = Math.max(1, Math.round((P.d.now - t) / 60e3)); return m < 60 ? `${m} min ago` : '1 h ago'; };
  const row = (u, sub) => `<li>${UI.member({ id: u.id, n: u.n, a: u.a, sub: u.tag ? `@${u.tag}` : '', href: window.NXViewer?.flagOn('profiles') ? `${BASE}member.html?u=${encodeURIComponent(u.id)}` : undefined }, { size: 28 })}<small>${sub}</small></li>`;
  function paintPanel() {
    const d = P.d;
    if (!d) return;
    panel.innerHTML = `<h4>🟢 Online now</h4>${d.online.length ? `<ul>${d.online.map((u) => row(u, u.id === d.me ? 'you' : 'now')).join('')}</ul>` : `<p class="muted small">${d.hidden ? 'You’re hidden – nobody else is on right now.' : 'Nobody else is on right now.'}</p>`}
${d.recent.length ? `<h4>🕐 Earlier this hour</h4><ul>${d.recent.map((u) => row(u, since(u.at))).join('')}</ul>` : ''}
<label class="pr-hide"><input type="checkbox" data-pr-hide${d.hidden ? ' checked' : ''}> 🙈 Appear offline <small class="muted">(you still see who’s on)</small></label>`;
    btn.classList.toggle('off', d.hidden);
    btn.innerHTML = `<i aria-hidden="true"></i>${d.online.length}<b>&nbsp;online</b>`;
    btn.setAttribute('aria-label', `${d.online.length} members online${d.hidden ? ' – you appear offline' : ''}`);
  }
  function apply(d) {
    P.d = d;
    P.on = new Set(d.online.map((u) => u.id));
    P.recent = new Set(d.recent.map((u) => u.id));
    paintPanel(); later();
    window.dispatchEvent(new CustomEvent('nx-presence', { detail: d }));
  }
  const poll = () => ctx.call('/api/presence').then(apply).catch(() => {});
  const schedule = () => { clearInterval(timer); timer = document.hidden ? 0 : setInterval(poll, POLL); };

  function start(c) {
    ctx = c;
    const bar = $('header.top .bar');
    if (!bar || $('.pr-wrap', bar)) return;
    bar.insertAdjacentHTML('beforeend', '<div class="pr-wrap"><button class="pr-btn" type="button" aria-haspopup="true" aria-expanded="false" data-tip="Who’s online"><i aria-hidden="true"></i>…</button><div class="pr-panel" hidden role="dialog" aria-label="Who’s online"></div></div>');
    btn = $('.pr-btn', bar); panel = $('.pr-panel', bar);
    btn.onclick = (e) => {
      e.stopPropagation(); panel.hidden = !panel.hidden; btn.setAttribute('aria-expanded', !panel.hidden);
      if (panel.hidden) return;
      // Open towards whichever side has room (the pill sits by the crest on phones, by the bell on desktop).
      const left = btn.getBoundingClientRect().left < Math.min(330, innerWidth - 24);
      panel.style.left = left ? '0' : ''; panel.style.right = left ? 'auto' : '';
      poll();
    };
    document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; btn.focus(); } });
    panel.addEventListener('change', async (e) => {
      if (!e.target.matches('[data-pr-hide]')) return;
      const hidden = e.target.checked;
      try { apply(await ctx.call('/api/presence', { hidden })); ctx.toast(hidden ? 'You now appear offline 🙈' : 'You’re visible again 🟢'); } catch (er) { e.target.checked = !hidden; ctx.toast(er.message, true); }
    });
    // Chips drawn later (feed, hub tabs, hover cards) get their dot too.
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', () => { schedule(); if (!document.hidden) poll(); });
    poll(); schedule();
  }

  window.NXPresence = { start, isOnline: (id) => P.on.has(String(id)), get state() { return P.d; } };
})();
