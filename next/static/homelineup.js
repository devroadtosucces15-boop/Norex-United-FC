// Home page: the line-up a manager chose to show publicly (Staff › Dugout › Post line-up › "Show on the Norex home page").
// Reads the public events route; shows nothing when no line-up is posted.
(() => {
  const sec = document.querySelector('[data-home-lineup]'), API = window.NOREX_API;
  if (!sec || !API) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  fetch(`${API}/api/events/public`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    const e = (j?.events || []).find((x) => x.lineup?.players?.length);
    if (!e) return;
    const when = new Date(e.start).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    sec.querySelector('[data-hl-body]').innerHTML = `<h3 style="margin:0 0 2px">${esc(e.title || 'Match night')} · ${esc(when)}</h3><p class="muted small" style="margin:0">${esc(e.lineup.formation || '')} · ${e.lineup.players.length} players</p><ul class="hl-pitch">${e.lineup.players.map((p) => `<li><code>${esc(p.pos)}</code> ${esc(p.n)}</li>`).join('')}</ul>`;
    sec.hidden = false;
  }).catch(() => {});
})();
