// Burner "what if": adds NOREX's own record + players to any ticked burners, client-side, display only (see burners-page.mjs).
(() => {
  const root = document.querySelector('[data-whatif]');
  if (!root) return;
  let data;
  try { data = JSON.parse(document.getElementById('bn-whatif-data').textContent); } catch { return; }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const out = root.querySelector('[data-wi-out]');
  const add = (a, b) => { for (const k of ['gp', 'w', 'd', 'l', 'gf', 'ga']) a[k] += b[k] || 0; return a; };
  const stat = (label, v) => `<div class="bn-wi-stat"><b>${v}</b><small>${label}</small></div>`;

  function paint() {
    const ids = [...root.querySelectorAll('[data-wi-pick] input:checked')].map((i) => i.value);
    const picked = data.burners.filter((b) => ids.includes(String(b.id)));
    if (!picked.length) { out.innerHTML = '<p class="muted">Tick a burner to add it to NOREX.</p>'; return; }
    const rec = picked.reduce((r, b) => add(r, b.rec), add({ gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }, data.norex.rec));
    const winPct = rec.gp ? Math.round((rec.w / rec.gp) * 100) : 0;
    const by = new Map();
    const take = (p, src) => {
      const k = p.n.toLowerCase();
      const e = by.get(k) ?? { n: p.n, gp: 0, g: 0, a: 0, motm: 0, rSum: 0, nx: 0, bn: 0 };
      e.gp += p.gp; e.g += p.g; e.a += p.a; e.motm += p.motm; e.rSum += (p.rating || 0) * p.gp; e[src] += p.gp;
      by.set(k, e);
    };
    data.norex.players.forEach((p) => take(p, 'nx'));
    picked.forEach((b) => b.players.forEach((p) => take(p, 'bn')));
    const rows = [...by.values()].filter((e) => e.gp).sort((a, b) => b.g + b.a - (a.g + a.a) || b.gp - a.gp).slice(0, 40);
    out.innerHTML = `<div class="bn-wi-stats">${stat('Played', rec.gp)}${stat('Won', rec.w)}${stat('Drawn', rec.d)}${stat('Lost', rec.l)}${stat('Goals', `${rec.gf}–${rec.ga}`)}${stat('Win rate', `${winPct}%`)}</div>
<div class="tbl"><table><thead><tr><th>Player</th><th>GP</th><th>NOREX + B team</th><th>⚽</th><th>🎯</th><th>MOTM</th><th>Rating</th></tr></thead><tbody>${rows.map((e) => `<tr><td><b>${esc(e.n)}</b></td><td>${e.gp}</td><td>${e.nx} + ${e.bn}</td><td>${e.g}</td><td>${e.a}</td><td>${e.motm}</td><td>${e.gp ? (e.rSum / e.gp).toFixed(1) : '–'}</td></tr>`).join('')}</tbody></table></div>`;
  }
  root.addEventListener('change', paint);
})();
