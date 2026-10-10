// Player artwork resolver. One source of truth (/api/art): every card, chip, marker, row and hero that shows a player picks it up here.
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let map = {}; const loaded = new Map();
  const url = (k, v) => (map[k] && map[k].url) || `art/${encodeURIComponent(k)}.png?v=${v || 0}`;
  // ---- one image-fit system for every placement ----
  // Each approved portrait (transparent cut-out) is measured once: where the head starts, the subject's width/centre and the
  // image aspect. Circles (chips, pitch discs, rows, podium) zoom to the same head-and-shoulders band; cards and the hero keep the
  // full bottom-anchored figure and put the kit number on the shirt. All numbers become CSS variables, so resizing never breaks it.
  const DEF = { top: .05, bot: 1, cx: .5, w: .8, ar: 1.33 };
  function measure(img) {
    try { const W = 48, ar = img.naturalHeight / img.naturalWidth || DEF.ar, H = Math.round(W * ar), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
      const px = g.getImageData(0, 0, W, H).data; let t = H, b = 0, l = W, r = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 40) { if (y < t) t = y; if (y > b) b = y; if (x < l) l = x; if (x > r) r = x; }
      if (b <= t) return { ...DEF, ar };
      // head centre: average x of opaque pixels in the top 12% of the figure (shoulders would pull it sideways)
      let sx = 0, n = 0; const hb = t + Math.max(2, (b - t) * .12); for (let y = t; y < hb; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 40) { sx += x; n++; }
      return { top: t / H, bot: (b + 1) / H, cx: n ? sx / n / W : (l + r) / 2 / W, w: (r - l + 1) / W, ar };
    } catch { return null; }   // cross-origin without CORS: fall back to defaults
  }
  const fitVars = (m) => { m = m || DEF; const fig = (m.bot - m.top) * m.ar, S = Math.min(3.2, Math.max(1.1, .95 / (fig * .46)));
    return { '--fs': S.toFixed(3), '--fx': ((.5 - S * m.cx) * 100).toFixed(2), '--fy': ((.07 - S * m.top * m.ar) * 100).toFixed(2), '--numY': ((m.top + (m.bot - m.top) * .7) * 100).toFixed(1) + '%' }; };
  // Studio images may arrive on a near-white studio background: remove only light, border-connected pixels (same rule as the
  // live site's card composer), crop to the subject and hand every placement the same clean cut-out.
  async function clean(img) {
    try { const sc = Math.min(1, 900 / img.naturalHeight), w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0, w, h);
      const fr = c.getImageData(0, 0, w, h), a = fr.data, seen = new Uint8Array(w * h), q = [];
      const light = (i) => { const k = i * 4; return a[k + 3] > 200 && a[k] > 224 && a[k + 1] > 224 && a[k + 2] > 224 && Math.max(a[k], a[k + 1], a[k + 2]) - Math.min(a[k], a[k + 1], a[k + 2]) < 24; };
      const add = (i) => { if (!seen[i] && light(i)) { seen[i] = 1; q.push(i); } };
      for (let x = 0; x < w; x++) { add(x); add((h - 1) * w + x); } for (let y = 0; y < h; y++) { add(y * w); add(y * w + w - 1); }
      for (let n = 0; n < q.length; n++) { const i = q[n], x = i % w, y = (i / w) | 0; if (x > 0) add(i - 1); if (x < w - 1) add(i + 1); if (y > 0) add(i - w); if (y < h - 1) add(i + w); }
      if (q.length >= w * h * .025 && q.length <= w * h * .85) { for (const i of q) a[i * 4 + 3] = 0; c.putImageData(fr, 0, 0); }
      let l = w, t = h, r = 0, b = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 24) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
      if (r <= l || b <= t) return null;
      const out = document.createElement('canvas'); out.width = r - l + 1; out.height = b - t + 1; out.getContext('2d').drawImage(cv, l, t, out.width, out.height, 0, 0, out.width, out.height);
      const blob = await new Promise((ok) => out.toBlob(ok, 'image/png')); if (!blob) return null;
      const u = URL.createObjectURL(blob), im = new Image(); im.src = u; await im.decode(); return { u, m: measure(im) };
    } catch { return null; }
  }
  function preload(k, v) { const u = url(k, v); if (!loaded.has(u)) loaded.set(u, new Promise((ok, no) => {
    const load = (cors) => { const i = new Image(); i.decoding = 'async'; if (cors) i.crossOrigin = 'anonymous'; i.onload = async () => ok((cors && await clean(i)) || { u, m: cors ? measure(i) : null }); i.onerror = () => (cors ? load(false) : no()); i.src = u; }; load(true); })); return loaded.get(u); }
  async function apply(root = document) {
    for (const el of $$('.pc[data-k]', root)) {
      const k = el.dataset.k, a = map[k]; const cut = el.querySelector('.cut'); if (!cut) continue;
      if (!a) { el.classList.remove('has-art', 'has-kit'); continue; }
      try { const { u, m } = await preload(k, a.v); if (cut.getAttribute('src') !== u) cut.src = u;
        const vars = fitVars(m); for (const [n, val] of Object.entries(vars)) el.style.setProperty(n, val); el.classList.add('has-art'); const kit = el.querySelector('.kit');
        if (kit && a.kit) { kit.textContent = a.kit; el.classList.add('has-kit'); } else el.classList.remove('has-kit'); } catch { el.classList.remove('has-art'); }
    }
  }
  // ---- text that must never overflow: names and values shrink to fit (down to 62%), then end in "…" with the full text on hover ----
  const fitText = (root = document) => { for (const el of $$('.pc .name,[data-fit],.fit', root)) { if (!el.isConnected || !el.clientWidth) continue;
    if (!el.dataset.fs0) el.dataset.fs0 = parseFloat(getComputedStyle(el).fontSize); const f0 = +el.dataset.fs0; el.style.fontSize = '';
    if (el.scrollWidth > el.clientWidth + 1) { el.style.fontSize = Math.max(f0 * .62, f0 * el.clientWidth / el.scrollWidth - .3) + 'px'; }
    if (el.scrollWidth > el.clientWidth + 1 && !el.title) el.title = el.textContent.trim(); } };
  window.NorexFit = fitText;
  let fitT = 0; const refit = () => { clearTimeout(fitT); fitT = setTimeout(() => fitText(), 120); };
  addEventListener('resize', refit); document.fonts?.ready.then(() => fitText()); addEventListener('norex:revealed', refit); setTimeout(fitText, 400);
  // preview/live: approved portraits come from the real Card Studio API; the local mock server is used only when no API is configured
  async function realMap() { const api = window.NOREX_API; const r = await fetch(`${api}/api/cards/portraits`, { cache: 'no-store' }); if (!r.ok) throw new Error('portraits'); const d = (await r.json()).portraits || {}, out = {}; for (const p of (window.NOREX?.players || [])) { const a = d[p.id] || d[p.k] || d[p.n]; if (a) out[p.k] = { v: a.id, kit: a.kitNumber, url: `${api}/api/cards/portraits?id=${a.id}` }; } return out; }
  async function refresh() { try { if (window.NOREX_API) map = await realMap(); else { const r = await fetch('api/art', { cache: 'no-store' }); map = r.ok ? await r.json() : {}; } } catch { map = {}; } window.NorexArt.map = map; await apply(); }
  window.NorexArt = { map, refresh, apply, ready: null };
  window.NorexArt.ready = refresh();
  try { const bc = new BroadcastChannel('norex-art'); bc.onmessage = refresh; window.NorexArt.notify = () => bc.postMessage(1); } catch { window.NorexArt.notify = () => {}; }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  new MutationObserver((ms) => { let any = false; for (const m of ms) m.addedNodes.forEach((n) => { if (n.nodeType === 1) { any = true; apply(n.matches?.('.pc') ? n.parentNode : n); } }); if (any) refit(); }).observe(document.body, { childList: true, subtree: true });
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
    const st = [[p.goals, 'GLS'], [p.assists, 'AST'], [p.rating ? (+p.rating).toFixed(1) : '—', 'RAT'], [p.pass != null ? p.pass + '%' : '—', 'PAS'], [p.tackleRate != null ? p.tackleRate + '%' : '—', 'TKL'], [p.gp ?? '—', 'GP']].map(([v, l]) => `<div><b class="num">${v}</b><span>${l}</span></div>`).join('');
    const inner = `<span class="shell"></span>${art}<span class="ovr">${p.ovr ?? '—'}</span><span class="pos">${esc(p.line)}</span><span class="crestm"><img src="crest.png" alt=""></span><span class="name">${esc(p.n)}</span>${p.arch ? `<span class="arch">${esc(p.arch)}</span>` : ''}<span class="stats">${st}</span><span class="glare"></span><span class="gloss"><i></i></span>`;
    const at = `class="pc pc-card t-${p.ovr >= 88 ? 'icon' : p.ovr >= 80 ? 'gold' : p.ovr >= 70 ? 'silver' : p.ovr > 0 ? 'bronze' : 'plain'}${dark ? ' dark' : ''} tilt" ${id ? `id="${id}"` : ''} style="--s:${s}" data-k="${esc(p.k)}"`;
    return link ? `<a ${at} href="player-${encodeURIComponent(p.k)}.html">${inner}</a>` : `<div ${at}>${inner}</div>`; } };
  window.NorexMe = () => { if (window.NorexAuth) { const A = window.NorexAuth, p = A.player ? (window.NOREX.players || []).find((x) => x.k === A.player) || null : null; return { as: A.as, me: A.player || '', player: A.as === 'guest' ? null : p }; } try { const q = new URLSearchParams(location.search); if (q.get('as')) localStorage.setItem('norex.as', q.get('as')); if (q.get('me')) localStorage.setItem('norex.me', q.get('me')); } catch {} let as = 'guest', me = ''; try { as = localStorage.getItem('norex.as') || 'guest'; me = localStorage.getItem('norex.me') || ''; } catch {} const p = (window.NOREX.players || []).find((x) => x.k === me) || null; return { as, me, player: as === 'guest' ? null : p }; };
})();
