// Burners "what if": adds ticked burners to NOREX's record + players, in this browser only (display only, unofficial).
(() => {
  const root = document.getElementById('bn-include'), dataEl = document.getElementById('bn-data');
  if (!root || !dataEl) return;
  let data; try { data = JSON.parse(dataEl.textContent); } catch { return; }
  if (!data.norex) return;
  const KEY = 'norex.burnerWhatIf', on = document.getElementById('bn-wi-on'), pick = document.getElementById('bn-wi-pick'), out = document.getElementById('bn-wi-out');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let st = { on: false, ids: [] };
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') st = { on: !!v.on, ids: Array.isArray(v.ids) ? v.ids.map(String) : [] }; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  const add = (a, b) => { for (const k of ['gp', 'w', 'd', 'l', 'gf', 'ga']) a[k] += b[k] || 0; return a; };
  const stat = (l, v) => `<div><b>${v}</b>${l}</div>`;
  function paint() {
    on.checked = st.on; pick.hidden = !st.on;
    pick.querySelectorAll('input').forEach((i) => { i.checked = st.ids.includes(i.value); });
    if (!st.on) { out.innerHTML = ''; return; }
    const picked = data.burners.filter((b) => st.ids.includes(String(b.id)));
    if (!picked.length) { out.innerHTML = '<p class="muted">Tick one or more burners to add them to NOREX.</p>'; return; }
    const rec = picked.reduce((r, b) => add(r, b.rec), add({ gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }, data.norex.rec));
    const by = new Map();
    const take = (p, src) => { const k = p.n.toLowerCase(), e = by.get(k) ?? { n: p.n, gp: 0, g: 0, a: 0, m: 0, r: 0, nx: 0, bn: 0 };
      e.gp += p.gp || 0; e.g += p.g || 0; e.a += p.a || 0; e.m += p.motm || 0; e.r += (p.rating || 0) * (p.gp || 0); e[src] += p.gp || 0; by.set(k, e); };
    data.norex.players.forEach((p) => take(p, 'nx')); picked.forEach((b) => b.players.forEach((p) => take(p, 'bn')));
    const rows = [...by.values()].filter((e) => e.gp).sort((a, b) => b.g + b.a - (a.g + a.a) || b.gp - a.gp).slice(0, 30);
    out.innerHTML = `<span class="bn-wi-tag">Unofficial · what if</span><div class="bn-wi-st">${stat('Played', rec.gp)}${stat('Won', rec.w)}${stat('Drawn', rec.d)}${stat('Lost', rec.l)}${stat('Goals', rec.gf + '–' + rec.ga)}${stat('Win rate', (rec.gp ? Math.round(rec.w / rec.gp * 100) : 0) + '%')}</div>
<div class="bn-wi-tb"><table><thead><tr><th>Player</th><th>GP</th><th>NOREX + B</th><th>⚽</th><th>🅰️</th><th>MOTM</th><th>Rating</th></tr></thead><tbody>${rows.map((e) => `<tr><td><b>${esc(e.n)}</b></td><td>${e.gp}</td><td>${e.nx} + ${e.bn}</td><td>${e.g}</td><td>${e.a}</td><td>${e.m}</td><td>${e.gp && e.r ? (e.r / e.gp).toFixed(1) : '–'}</td></tr>`).join('')}</tbody></table></div>
<p class="muted tiny">NOREX = ${esc(data.norex.name)} official numbers. Not official, not saved anywhere but this browser.</p>`;
  }
  on.addEventListener('change', () => { st.on = on.checked; save(); paint(); });
  pick.addEventListener('change', (e) => { const i = e.target; if (!i.value) return; st.ids = st.ids.filter((x) => x !== i.value); if (i.checked) st.ids.push(i.value); save(); paint(); });
  paint();
})();
