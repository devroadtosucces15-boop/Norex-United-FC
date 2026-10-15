// Stats › Players › Compare, version 2 (flag compareView; local design build: "Preview as Owner").
// Up to three players side by side with their real portraits (the approved Card Studio artwork, full figure with the kit number),
// a search box to add or swap players without going back to the directory, who-leads-what, a radar and every stat as a bar.
// pages.js owns the selection (tray, #compare= link) and calls render() here when this view is on; otherwise the first version draws.
(() => {
  const d = document, N = window.NOREX || {}, A = () => window.NorexAuth;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KEYS = [['ovr', 'Overall'], ['gp', 'Games'], ['goals', 'Goals'], ['assists', 'Assists'], ['rating', 'Avg rating', 1], ['mom', 'MOTM'], ['win', 'Win rate', 0, '%'], ['pass', 'Pass accuracy', 0, '%'], ['tackles', 'Tackles'], ['cs', 'Clean sheets'], ['cgoals', 'Career goals'], ['cassists', 'Career assists']];
  const AXN = [['Goals / game', (p) => p.goals / Math.max(1, p.gp)], ['Assists / game', (p) => p.assists / Math.max(1, p.gp)], ['Rating', (p) => p.rating], ['Passing', (p) => p.pass], ['Tackling', (p) => p.tackleRate], ['Win rate', (p) => p.win]];
  const keysOf = () => { const m = location.hash.match(/compare=([^&?]+)/); return m ? decodeURIComponent(m[1]).split(',').filter(Boolean) : window.NorexCmp.get(); };
  const setKeys = (ks) => { ks = ks.slice(0, 3); window.NorexCmp.set(ks); history.replaceState(null, '', ks.length ? '#compare=' + ks.map(encodeURIComponent).join(',') : location.pathname); window.NorexCmp.sync(); };
  let open = false, q = '';

  const on = () => { const a = A(); return window.NOREX_API ? !!(a && a.token && (a.features || []).includes('compareView')) : a ? a.as === 'owner' : (window.NorexAs === 'owner'); };

  function figure(p) {
    const inits = String(p.n).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
    return `<a class="pc pc-hero cp-fig" href="player-${encodeURIComponent(p.k)}.html" data-k="${esc(p.k)}" aria-label="${esc(p.n)}, open the player page"><span class="bignum">${p.ovr ?? ''}</span><div class="art"><svg class="fb" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><path class="sil" d="M50 14c-9 0-16 8-16 18 0 8 4 14 9 17-14 3-27 12-30 27v8h74v-8c-3-15-16-24-30-27 5-3 9-9 9-17 0-10-7-18-16-18z"/><text class="num" x="50" y="97" text-anchor="middle">${esc(inits)}</text></svg><img class="cut" alt="" decoding="async"><span class="kit"></span></div><span class="floor"></span></a>`;
  }
  const fmt = (k, v) => (k === 'rating' ? (+v || 0).toFixed(1) : v == null ? '—' : v) + (KEYS.find((x) => x[0] === k)[3] || '');

  function render(root, ps) {
    if (!ps.length && !open) { root.hidden = true; return; }
    root.hidden = false; root.classList.add('cp');
    const have = new Set(ps.map((p) => p.k)), duel = ps.length > 1;
    const best = Object.fromEntries(KEYS.map(([k]) => [k, Math.max(0, ...ps.map((p) => +p[k] || 0))]));
    const lead = new Map(ps.map((p) => [p.k, 0]));
    if (duel) for (const [k] of KEYS) { const top = ps.filter((p) => (+p[k] || 0) === best[k]); if (best[k] > 0 && top.length === 1) lead.set(top[0].k, lead.get(top[0].k) + 1); }
    const total = KEYS.filter(([k]) => best[k] > 0).length, ranked = [...ps].sort((a, b) => lead.get(b.k) - lead.get(a.k));
    const verdict = !duel ? '' : lead.get(ranked[0].k) === lead.get(ranked[1].k) ? `⚖️ Too close to call: ${ranked.filter((p) => lead.get(p.k) === lead.get(ranked[0].k)).map((p) => esc(p.n)).join(' and ')} each lead in ${lead.get(ranked[0].k)} of ${total} stats.` : `🏆 <b>${esc(ranked[0].n)}</b> leads in ${lead.get(ranked[0].k)} of ${total} stats.`;
    const pool = (N.full || []).filter((p) => p.gp >= 8), mxs = AXN.map(([, f]) => Math.max(1e-9, ...pool.map(f)));
    const radarJ = esc(JSON.stringify({ axes: AXN.map((a) => a[0]), series: ps.map((p) => ({ n: p.n, v: AXN.map(([, f], i) => +((f(p) || 0) / mxs[i]).toFixed(3)) })) }));
    const hits = q ? (N.full || []).filter((p) => !have.has(p.k) && p.n.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
    const cols = `style="--n:${Math.max(1, ps.length)}"`;
    root.innerHTML = `<div class="cp-top"><h3>⚖️ Compare</h3><div class="cp-tools">${ps.length ? '<button type="button" class="chip" data-cp-share>🔗 Share</button>' : ''}<button type="button" class="chip" data-cp-clear>${ps.length ? 'Clear' : 'Close'}</button></div></div>
<div class="cp-pick"><label class="cp-find"><span aria-hidden="true">🔎</span><input type="search" data-cp-q placeholder="${ps.length >= 3 ? 'Three is the limit — remove one first' : 'Add a player'}" value="${esc(q)}" autocomplete="off" aria-label="Search players to add" ${ps.length >= 3 ? 'disabled' : ''}></label>
${hits.length ? `<ul class="cp-hits">${hits.map((p) => `<li><button type="button" data-cp-add="${esc(p.k)}"><b>${esc(p.n)}</b><small>${esc(p.line)}${p.ovr ? ' · OVR ' + p.ovr : ''} · ${p.gp} games</small><span aria-hidden="true">＋</span></button></li>`).join('')}</ul>` : q && ps.length < 3 ? '<p class="cp-none muted small">No player by that name.</p>' : ''}</div>
${ps.length ? `<div class="cp-faces" ${cols}>${ps.map((p) => `<div class="cp-face">${figure(p)}<b class="fit cp-name">${esc(p.n)}</b><small class="muted cp-sub">${esc(p.line)}${p.arch ? ' · ' + esc(p.arch) : ''}</small>${duel && lead.get(p.k) ? `<span class="cp-lead">${lead.get(p.k)} lead${lead.get(p.k) === 1 ? '' : 's'}</span>` : ''}<button type="button" class="cp-rm" data-cp-rm="${esc(p.k)}" aria-label="Remove ${esc(p.n)} from the comparison">✕ Remove</button></div>`).join('')}</div>
${verdict ? `<p class="cp-verdict">${verdict}</p>` : ''}
${ps.length > 1 ? `<div class="wx cp-radar"><div class="radar" data-w="radar" data-j="${radarJ}"></div></div>` : ''}
<div class="cp-rows">${KEYS.map(([k, l]) => `<div class="cp-row"><div class="cp-l">${l}</div><div class="cp-cells" ${cols}>${ps.map((p) => { const v = +p[k] || 0, top = duel && v === best[k] && v > 0 && ps.filter((x) => (+x[k] || 0) === v).length === 1; return `<div class="cp-cell${top ? ' top' : ''}"><b class="num">${fmt(k, p[k])}</b><span class="cp-bar"><i style="--w:${best[k] ? (v / best[k]) * 100 : 0}%"></i></span></div>`; }).join('')}</div></div>`).join('')}</div>` : '<p class="muted small cp-empty">Search for up to three players. You can also tap Compare on a row in the list below.</p>'}`;
    window.NorexMotion?.tilt?.(); window.NorexArt?.apply(root); window.NorexWidgets?.init(root); window.NorexFit?.(root);
  }

  // one set of handlers for the panel (root is re-rendered, so delegate from it)
  d.addEventListener('click', (e) => {
    const root = d.getElementById('cmpRoot'); if (!root || !root.contains(e.target) || !on()) return;
    const add = e.target.closest('[data-cp-add]'), rm = e.target.closest('[data-cp-rm]');
    if (add) { q = ''; setKeys([...keysOf(), add.dataset.cpAdd]); }
    else if (rm) setKeys(keysOf().filter((k) => k !== rm.dataset.cpRm));
    else if (e.target.closest('[data-cp-clear]')) { open = false; q = ''; setKeys([]); }
    else if (e.target.closest('[data-cp-share]')) {
      const url = location.origin + location.pathname + '#compare=' + keysOf().map(encodeURIComponent).join(',');
      if (navigator.share && matchMedia('(pointer:coarse)').matches) navigator.share({ title: 'NOREX UNITED compare', url }).catch(() => {});
      else (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => window.NorexMotion?.toast('Link copied', { kind: 'ok' }), () => window.NorexMotion?.toast(url));
    }
  });
  d.addEventListener('input', (e) => {
    if (!e.target.matches('[data-cp-q]')) return; q = e.target.value; const pos = e.target.selectionStart;
    dispatchEvent(new Event('norex-cmp')); const i = d.querySelector('[data-cp-q]'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch {} }
  });

  // entry button next to the directory filters (the panel itself stays hidden until something is chosen)
  function entry() {
    if (!on() || d.getElementById('cpOpen')) return; const host = d.getElementById('pl'); if (!host) return;
    const b = d.createElement('button'); b.type = 'button'; b.id = 'cpOpen'; b.className = 'chip'; b.textContent = '⚖️ Compare';
    b.onclick = () => { open = true; dispatchEvent(new Event('norex-cmp')); d.getElementById('cmpRoot')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); setTimeout(() => d.querySelector('[data-cp-q]')?.focus({ preventScroll: true }), 350); };
    host.parentNode.insertBefore(b, host);
  }

  window.NorexCompareV2 = { on, render, entry };
  // pages.js drew the first version before this file loaded (and before sign-in finished): draw again with the right one
  const go = () => { entry(); dispatchEvent(new Event('norex-cmp')); };
  if (window.NOREX_API && A()?.ready) A().ready.then(go); else go();
})();
