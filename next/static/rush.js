// Rush results page: reads the public GET /api/rush (confirmed games only), draws the record, form, list, scorers and opponents,
// and makes a 1080×1350 result graphic per game (canvas → PNG download), like the match page does for League games.
(() => {
  const d = document, API = window.NOREX_API, $ = (s, r = d) => r.querySelector(s);
  if (!$('#rs-list')) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (iso) => { const t = new Date(iso + 'T12:00:00'); return isNaN(t) ? esc(iso) : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  let M = [], filter = '';
  const kpi = (n, l) => `<div class="sbt"><b>${n}</b><span>${l}</span></div>`;
  function draw() {
    const w = M.filter((m) => m.res === 'W').length, dr = M.filter((m) => m.res === 'D').length, l = M.length - w - dr;
    const gf = M.reduce((a, m) => a + m.gf, 0), ga = M.reduce((a, m) => a + m.ga, 0);
    $('#rs-kpi').innerHTML = M.length ? kpi(M.length, 'Games') + kpi(`${w}-${dr}-${l}`, 'W · D · L') + kpi(Math.round(w / M.length * 100) + '%', 'Win rate') + kpi(`${gf}–${ga}`, 'Goals for–against') : '<div class="panel muted rs-empty">No Rush games confirmed yet. Log one from Match Night in the Hub after you play.</div>';
    $('#rs-form-sec').hidden = !M.length;
    $('#rs-form').innerHTML = M.slice(0, 10).reverse().map((m) => `<span class="rs-orb ${m.res}" title="${esc(m.opp)} ${m.gf}–${m.ga}">${m.res}</span>`).join('');
    const L = M.filter((m) => !filter || m.res === filter);
    $('#rs-list').innerHTML = L.map((m) => `<div class="rs-g" data-res="${m.res}"><span class="rd">${fmt(m.date)}</span><span class="ro">${esc(m.opp || 'Opponent')}<small>${(m.players || []).length ? esc((m.players || []).filter((p) => p.g).map((p) => p.n + (p.g > 1 ? ' ×' + p.g : '')).join(', ') || 'No scorers listed') : ''}</small></span><span class="rsc">${m.gf}–${m.ga}</span><span class="pill ${m.res.toLowerCase()}">${m.res === 'W' ? 'WIN' : m.res === 'D' ? 'DRAW' : 'LOSS'}</span><button type="button" class="btn ghost" data-poster="${m.id}">⬇ Graphic</button></div>`).join('') || (M.length ? '<p class="muted">No games match that filter.</p>' : '');
    const pl = new Map(); M.forEach((m) => (m.players || []).forEach((p) => { const a = pl.get(p.n) ?? { n: p.n, gp: 0, g: 0, a: 0, motm: 0 }; a.gp++; a.g += p.g || 0; a.a += p.a || 0; a.motm += p.motm ? 1 : 0; pl.set(p.n, a); }));
    const rows = [...pl.values()].sort((x, y) => y.g - x.g || y.a - x.a).slice(0, 10);
    $('#rs-pl').innerHTML = rows.length ? `<table class="tb"><thead><tr><th>Player</th><th>GP</th><th>G</th><th>A</th><th>MOTM</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${esc(r.n)}</b></td><td class="num">${r.gp}</td><td class="num">${r.g}</td><td class="num">${r.a}</td><td class="num">${r.motm || ''}</td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="padding:14px">Nothing yet.</p>';
    const op = new Map(); M.forEach((m) => { const k = (m.opp || 'Opponent').trim(); const a = op.get(k) ?? { n: k, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }; a.p++; a[m.res.toLowerCase()]++; a.gf += m.gf; a.ga += m.ga; op.set(k, a); });
    $('#rs-op').innerHTML = op.size ? `<table class="tb"><thead><tr><th>Opponent</th><th>P</th><th>W · D · L</th><th>Goals</th></tr></thead><tbody>${[...op.values()].sort((x, y) => y.p - x.p).slice(0, 12).map((r) => `<tr><td><b>${esc(r.n)}</b></td><td class="num">${r.p}</td><td><span class="pill w">${r.w}</span> <span class="pill d">${r.d}</span> <span class="pill l">${r.l}</span></td><td class="num">${r.gf}–${r.ga}</td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="padding:14px">Nothing yet.</p>';
  }
  async function poster(m) {
    const W = 1080, H = 1350, c = d.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    await d.fonts?.ready; const rc = { W: '#22b35e', D: '#d4a23c', L: '#d23a2f' }[m.res];
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#141b27'); bg.addColorStop(1, '#07090e'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W / 2, 400, 40, W / 2, 400, 620); glow.addColorStop(0, rc + '55'); glow.addColorStop(1, 'transparent'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c8352c'; g.fillRect(0, 0, W, 14); g.fillStyle = '#efcf7a'; g.fillRect(0, 14, W, 4);
    g.textAlign = 'center'; g.fillStyle = '#aab4c9'; g.font = '600 30px Oswald'; g.fillText(`RUSH · ${fmt(m.date).toUpperCase()}`, W / 2, 110);
    const rl = { W: 'VICTORY', D: 'DRAW', L: 'DEFEAT' }[m.res]; g.font = '700 34px Oswald'; const rw = g.measureText(rl).width + 60;
    g.fillStyle = rc; g.beginPath(); g.roundRect((W - rw) / 2, 140, rw, 58, 29); g.fill(); g.fillStyle = '#fff'; g.fillText(rl, W / 2, 182);
    const own = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = 'crest.png'; });
    if (own) g.drawImage(own, 120, 270, 220, 220);
    g.fillStyle = '#2a3344'; g.beginPath(); g.arc(W - 230, 380, 110, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 100px Oswald'; g.fillText((m.opp || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase(), W - 230, 415);
    g.fillStyle = '#fff'; g.font = '700 230px Oswald'; g.fillText(String(m.gf), W / 2 - 95, 465); g.fillText(String(m.ga), W / 2 + 95, 465); g.fillStyle = rc; g.font = '700 150px Oswald'; g.fillText(':', W / 2, 445);
    const fit = (t, max, size) => { let s = size; do { g.font = `700 ${s}px Oswald`; s -= 2; } while (g.measureText(t).width > max && s > 16); }; g.fillStyle = '#fff';
    fit('NOREX UNITED FC', 320, 40); g.fillText('NOREX UNITED FC', 230, 550); const on = (m.opp || 'Opponent').toUpperCase(); fit(on, 320, 40); g.fillText(on, W - 230, 550);
    const sc = (m.players || []).filter((p) => p.g); g.font = '500 30px Inter'; g.fillStyle = '#d6dce6'; sc.slice(0, 6).forEach((p, i) => g.fillText(`⚽ ${p.n}${p.g > 1 ? ' ×' + p.g : ''}`, W / 2, 640 + i * 46));
    const mo = (m.players || []).find((p) => p.motm); if (mo) { g.fillStyle = 'rgba(239,207,122,.12)'; g.beginPath(); g.roundRect(140, 960, W - 280, 120, 26); g.fill(); g.strokeStyle = 'rgba(239,207,122,.6)'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#efcf7a'; g.font = '600 26px Oswald'; g.fillText('MAN OF THE MATCH', W / 2, 1010); g.fillStyle = '#fff'; g.font = '700 44px Oswald'; g.fillText(mo.n, W / 2, 1060); }
    g.fillStyle = '#6f7a8c'; g.font = '500 24px Inter'; g.fillText('NOREX UNITED FC · EA FC Pro Clubs · Rush', W / 2, H - 60);
    const blob = await new Promise((ok, no) => { try { c.toBlob((b) => (b ? ok(b) : no(new Error('blob'))), 'image/png'); } catch (e) { no(e); } });
    const a = d.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `norex-rush-${m.gf}-${m.ga}-${(m.opp || 'opponent').replace(/\W+/g, '-').toLowerCase()}.png`; d.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 500);
  }
  $('#rs-list').addEventListener('click', (e) => { const b = e.target.closest('[data-poster]'); if (!b) return; const m = M.find((x) => String(x.id) === b.dataset.poster); if (!m) return;
    const run = poster(m); window.NorexMotion?.submit ? NorexMotion.submit(b, run).catch(() => NorexMotion.toast('Could not make the graphic. Try again.', { kind: 'err' })) : run.catch(() => {}); });
  $('#rs-f').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; d.querySelectorAll('#rs-f .chip').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
  if (!API) { $('#rs-kpi').innerHTML = '<div class="panel muted rs-empty">Rush results load from the club server on the live preview.</div>'; return; }
  fetch(API + '/api/rush', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((R) => { M = (R.matches || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1)); draw(); })
    .catch(() => { $('#rs-kpi').innerHTML = '<div class="panel muted rs-empty">Could not reach the club server just now. Try again in a minute.</div>'; });
})();
