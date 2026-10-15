// Scout page: profile for any tracked player (including ones outside our squad), read from the public api/players.json.
(() => {
  const root = document.getElementById('sc-root'); if (!root) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const q = decodeURIComponent((location.hash.slice(1) || new URLSearchParams(location.search).get('k') || '').replace(/^k=/, '')).toLowerCase();
  const fail = (m) => { root.innerHTML = `<div class="panel" style="text-align:center;padding:40px"><div style="font-size:38px">🔎</div><h3>${m}</h3><p class="muted">Browse everyone in <a href="players.html">the directory</a>.</p></div>`; };
  if (!q) return fail('Pick a player first');
  fetch('api/players.json', { cache: 'no-cache' }).then((r) => r.json()).then((all) => {
    const p = all.find((x) => String(x.k).toLowerCase() === q || String(x.n).toLowerCase() === q);
    if (!p) return fail('We could not find that player');
    document.title = `${p.n} · NOREX UNITED FC`;
    const s = p.s || {}, car = p.car || {}, st = (l, v) => `<div><b>${v ?? '–'}</b>${l}</div>`;
    const names = ['Goals/game', 'Assists/game', 'Pass %', 'Tackles/game', 'Rating', 'Win %'], raw = p.raw || [];
    const rad = (p.rad || []).map((v, i) => `<div><span>${names[i] || ''}</span><span style="display:block;background:var(--line);border-radius:5px"><i style="width:${Math.max(4, Math.min(100, v))}%"></i></span><b>${raw[i] ?? v}</b></div>`).join('');
    root.innerHTML = `<div class="panel sc-hero">${p.crest ? `<img src="${esc(p.crest)}" alt="" width="64" height="64" style="object-fit:contain">` : ''}<div style="flex:1;min-width:180px"><div class="eyebrow">${esc(p.pos || '')}${p.sc ? ' · ' + esc(p.sc) : ''}</div><h2>${esc(p.n)}</h2>${p.tag ? `<span class="chip">${esc(p.tag)}</span>` : ''}</div>${p.ovr ? `<div class="sc-ovr">${p.ovr}<small class="muted" style="font:600 12px Inter"> OVR</small></div>` : ''}</div>
<div class="panel"><h3>This season</h3><div class="sc-st">${st('Played', s.gp)}${st('Goals', s.g)}${st('Assists', s.a)}${st('Rating', s.r)}${st('MOTM', s.m)}${st('Win %', s.w)}</div>
${car.gp ? `<h3 style="margin-top:18px">Career</h3><div class="sc-st">${st('Played', car.gp)}${st('Goals', car.g)}${st('Assists', car.a)}${st('Rating', car.r)}${st('MOTM', car.m)}</div>` : ''}
${rad ? `<div class="sc-rad">${rad}</div>` : ''}</div>
<p class="muted small" style="margin-top:16px">${p.home ? '' : 'Not in our squad. '}Numbers come from EA's public Pro Clubs data${p.sc ? ` for ${esc(p.sc)}` : ''}.</p>`;
  }).catch(() => fail('Could not load player data'));
})();
