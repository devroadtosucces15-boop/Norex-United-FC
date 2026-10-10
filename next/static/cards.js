// Player artwork resolver. One source of truth (/api/art): every card, chip, marker, row and hero that shows a player picks it up here.
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let map = {}; const loaded = new Map();
  const url = (k, v) => (map[k] && map[k].url) || `art/${encodeURIComponent(k)}.png?v=${v || 0}`;
  function preload(k, v) { const u = url(k, v); if (!loaded.has(u)) loaded.set(u, new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(u); i.onerror = no; i.src = u; })); return loaded.get(u); }
  async function apply(root = document) {
    for (const el of $$('.pc[data-k]', root)) {
      const k = el.dataset.k, a = map[k]; const cut = el.querySelector('.cut'); if (!cut) continue;
      if (!a) { el.classList.remove('has-art', 'has-kit'); continue; }
      try { const u = await preload(k, a.v); if (cut.getAttribute('src') !== u) cut.src = u; el.classList.add('has-art'); const kit = el.querySelector('.kit');
        if (kit && a.kit) { kit.textContent = a.kit; el.classList.add('has-kit'); if (a.numY) el.style.setProperty('--numY', a.numY + '%'); } else el.classList.remove('has-kit'); } catch { el.classList.remove('has-art'); }
    }
  }
  // preview/live: approved portraits come from the real Card Studio API; the local mock server is used only when no API is configured
  async function realMap() { const api = window.NOREX_API; const r = await fetch(`${api}/api/cards/portraits`, { cache: 'no-store' }); if (!r.ok) throw new Error('portraits'); const d = (await r.json()).portraits || {}, out = {}; for (const p of (window.NOREX?.players || [])) { const a = d[p.k] || d[p.n]; if (a) out[p.k] = { v: a.id, kit: a.kitNumber, url: `${api}/api/cards/portraits?id=${a.id}` }; } return out; }
  async function refresh() { try { if (window.NOREX_API) map = await realMap(); else { const r = await fetch('api/art', { cache: 'no-store' }); map = r.ok ? await r.json() : {}; } } catch { map = {}; } window.NorexArt.map = map; await apply(); }
  window.NorexArt = { map, refresh, apply, ready: null };
  window.NorexArt.ready = refresh();
  try { const bc = new BroadcastChannel('norex-art'); bc.onmessage = refresh; window.NorexArt.notify = () => bc.postMessage(1); } catch { window.NorexArt.notify = () => {}; }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach((n) => { if (n.nodeType === 1) apply(n.matches?.('.pc') ? n.parentNode : n); }); }).observe(document.body, { childList: true, subtree: true });
  // ---- compare tray (carry selected players into the comparison view) ----
  const KEY = 'norex.cmp'; const get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }, set = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  function tray() { let t = document.getElementById('cmptray'); const sel = get(); if (!sel.length) { t?.remove(); return; }
    if (!t) { t = document.createElement('div'); t.id = 'cmptray'; t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:84px;z-index:80;background:rgba(17,23,34,.96);border:1px solid rgba(239,207,122,.5);border-radius:18px;padding:10px 14px;display:flex;gap:12px;align-items:center;box-shadow:0 18px 40px rgba(0,0,0,.6);font:600 13px Inter'; document.body.appendChild(t); }
    t.innerHTML = `<span class="muted">Compare</span>${sel.map((k) => `<span class="chip on" data-rm="${k.replace(/"/g, '&quot;')}">${k} ✕</span>`).join('')}<a class="btn gold" href="players.html#compare=${sel.map(encodeURIComponent).join(',')}" style="padding:8px 14px">Compare ${sel.length}</a>`; }
  document.addEventListener('click', (e) => { const b = e.target.closest('.cmpbtn'); if (b) { e.preventDefault(); e.stopPropagation(); const k = b.dataset.k; let s = get(); s = s.includes(k) ? s.filter((x) => x !== k) : [...s, k].slice(-3); set(s); sync(); }
    const r = e.target.closest('[data-rm]'); if (r) { set(get().filter((x) => x !== r.dataset.rm)); sync(); } });
  function sync() { const s = get(); $$('.cmpbtn').forEach((b) => { const on = s.includes(b.dataset.k); b.classList.toggle('on', on); b.closest('.cmp')?.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); tray(); dispatchEvent(new Event('norex-cmp')); }
  window.NorexCmp = { get, set, sync }; sync();
  // ---- client-side mirror of the server card markup (used by pitch popovers and the Hub entrance) ----
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const inits = (n) => n.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
  window.NorexCards = { cardHTML(p, { s = 1, dark = false, link = true, id = '' } = {}) {
    const art = `<div class="art"><svg class="fb" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><path class="sil" d="M50 14c-9 0-16 8-16 18 0 8 4 14 9 17-14 3-27 12-30 27v8h74v-8c-3-15-16-24-30-27 5-3 9-9 9-17 0-10-7-18-16-18z"/><text class="num" x="50" y="97" text-anchor="middle">${esc(inits(p.n))}</text></svg><img class="cut" alt="" decoding="async"><span class="kit"></span></div>`;
    const st = [[p.goals, 'GLS'], [p.assists, 'AST'], [p.rating ? (+p.rating).toFixed(1) : '—', 'RAT']].map(([v, l]) => `<div><b class="num">${v}</b><span>${l}</span></div>`).join('');
    const inner = `<span class="shell"></span>${art}<span class="ovr">${p.ovr ?? '—'}</span><span class="pos">${esc(p.line)}</span><span class="crestm"><img src="crest.png" alt=""></span><span class="name">${esc(p.n)}</span><span class="stats">${st}</span><span class="glare"></span><span class="gloss"><i></i></span>`;
    const at = `class="pc pc-card${dark ? ' dark' : ''} tilt" ${id ? `id="${id}"` : ''} style="--s:${s}" data-k="${esc(p.k)}"`;
    return link ? `<a ${at} href="player-${encodeURIComponent(p.k)}.html">${inner}</a>` : `<div ${at}>${inner}</div>`; } };
  window.NorexMe = () => { try { const q = new URLSearchParams(location.search); if (q.get('as')) localStorage.setItem('norex.as', q.get('as')); if (q.get('me')) localStorage.setItem('norex.me', q.get('me')); } catch {} let as = 'guest', me = ''; try { as = localStorage.getItem('norex.as') || 'guest'; me = localStorage.getItem('norex.me') || ''; } catch {} const p = (window.NOREX.players || []).find((x) => x.k === me) || null; return { as, me, player: as === 'guest' ? null : p }; };
})();
