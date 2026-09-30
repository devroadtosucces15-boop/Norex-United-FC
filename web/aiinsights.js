// AI player insights (roadmap P11.14) – short AI-written read on a player's stats, mounted in the same
// `.member-badge[data-player]` slot as the scout report/awards cabinet, so it shows on player cards, profile
// pages, compare and the portal without each surface wiring it separately. Data comes from the Worker
// (GET /api/insights/player?k=), which reuses NXScout's stats engine and asks Workers AI for the wording –
// see bot/aiinsights.js. Nothing to compute here: this file only fetches and draws.
(() => {
  const STYLE_ICON = { poacher: '🎯', playmaker: '🧠', 'ball-winner': '🛡️', wall: '🧱', 'all-rounder': '⚙️' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function section(el, { k } = {}) {
    const BASE = document.body.dataset.base || '', MAPI = document.body.dataset.api || '';
    el.innerHTML = `<section class="card ai-ins"><h4>🤖 AI read</h4><div class="ai-ins-body">${window.UI ? UI.skeleton('rows', 2) : ''}</div></section>`;
    const body = el.querySelector('.ai-ins-body');
    fetch(`${MAPI}/api/insights/player?k=${encodeURIComponent(k)}`).then((r) => (r.ok ? r.json() : null)).then((R) => {
      if (!R?.enough) { el.remove(); return; }
      body.innerHTML = `${R.style ? `<span class="chip strong ai-ins-style">${STYLE_ICON[R.style] ?? '⚙️'} ${esc(R.style.replace('-', ' '))}</span>` : ''}
<p class="ai-ins-sum">${esc(R.summary)}</p>
${R.bestPosition ? `<p><b>📍 Best fit</b> ${esc(R.bestPosition)}</p>` : ''}
${R.pattern ? `<p><b>🧠 Tendency</b> ${esc(R.pattern)}</p>` : ''}
${R.recommendation ? `<p><b>💡 Recommendation</b> ${esc(R.recommendation)}</p>` : ''}
<p class="muted small">AI-generated from the real match log – refreshed as new games come in.</p>`;
    }).catch(() => el.remove());
  }

  globalThis.NXAI = { section };
})();
