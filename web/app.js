// Interactivity for the static pages. Everything is progressive enhancement: pages work without it.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const BASE = document.body.dataset.base || '';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let apiCache;
const api = () => (apiCache ??= Promise.all(['players', 'clubs'].map((f) => fetch(`${BASE}api/${f}.json`).then((r) => r.json()))));

// ---------- mobile menu ----------
const menuBtn = $('.menu-btn');
menuBtn?.addEventListener('click', () => {
  const open = $('nav').classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});

// ---------- reveal on scroll + animated counters ----------
function countUp(el) {
  const to = parseFloat(el.dataset.to), dec = +el.dataset.dec || 0, suf = el.dataset.suffix || '';
  if (isNaN(to)) return;
  const t0 = performance.now(), dur = 1100;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = (to * e).toFixed(dec) + suf;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    $$('.count', e.target).forEach(countUp);
    io.unobserve(e.target);
  }
}, { threshold: 0.12 }) : null;
$$('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

// ---------- tooltips ----------
const tip = $('.tip');
function showTip(el, x, y) {
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const w = tip.offsetWidth / 2;
  tip.style.left = Math.min(innerWidth - w - 8, Math.max(w + 8, x)) + 'px';
  tip.style.top = Math.max(tip.offsetHeight + 16, y) + 'px';
}
document.addEventListener('pointermove', (e) => {
  const el = e.target.closest?.('[data-tip]');
  if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
});
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest?.('[data-tip]');
  if (el && e.pointerType === 'touch') showTip(el, e.clientX, e.clientY);
});
addEventListener('scroll', () => (tip.hidden = true), { passive: true });

// ---------- sortable tables + filters ----------
$$('table.sortable').forEach((table) => {
  $$('th', table).forEach((th, col) => {
    th.addEventListener('click', () => {
      const asc = th.getAttribute('aria-sort') === 'descending';
      $$('th', table).forEach((h) => h.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
      const body = table.tBodies[0];
      const val = (tr) => {
        const td = tr.children[col];
        const v = td?.dataset.v ?? td?.textContent.trim() ?? '';
        const n = parseFloat(String(v).replace(/[%,+]/g, ''));
        return isNaN(n) || !/^[-+]?[\d.]/.test(v) ? String(v).toLowerCase() : n;
      };
      [...body.rows].sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); }).forEach((r) => body.appendChild(r));
    });
  });
});
$$('input[data-filter]').forEach((input) => {
  const rows = [...document.getElementById(input.dataset.filter).tBodies[0].rows];
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    rows.forEach((r) => (r.hidden = q && !r.textContent.toLowerCase().includes(q)));
  });
});
$$('input[data-cardfilter]').forEach((input) => {
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    $$(input.dataset.cardfilter).forEach((c) => (c.hidden = q && !c.textContent.toLowerCase().includes(q)));
  });
});

// ---------- chip groups: position filter, view toggle, tier filter, tabs ----------
function chipGroup(group, onPick) {
  group.addEventListener('click', (e) => {
    const b = e.target.closest('button.chip');
    if (!b) return;
    $$('button.chip', group).forEach((x) => x.classList.toggle('on', x === b));
    onPick(b);
  });
}
$$('[data-posfilter]').forEach((g) => chipGroup(g, (b) => {
  const pos = b.dataset.pos;
  $$('.card-grid .fut, #squad tbody tr').forEach((el) => (el.hidden = pos !== 'All' && el.dataset.pos !== pos));
}));
$$('[data-view]').forEach((g) => chipGroup(g, (b) => {
  $$('.view').forEach((v) => (v.hidden = !v.classList.contains(`view-${b.dataset.v}`)));
}));
$$('[data-tierfilter]').forEach((g) => chipGroup(g, (b) => {
  $$('.club-card').forEach((c) => (c.hidden = b.dataset.tier !== 'all' && c.dataset.tier !== b.dataset.tier));
}));
$$('[data-tabs]').forEach((g) => chipGroup(g, (b) => {
  $$('.tab-panel', g.parentElement).forEach((p) => {
    p.hidden = p.id !== b.dataset.tab;
    if (!p.hidden) { p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); }
  });
}));
$$('.tab-panel:not([hidden])').forEach((p) => p.classList.add('in'));

// ---------- 3D tilt on player cards ----------
document.addEventListener('pointermove', (e) => {
  const card = e.target.closest?.('.fut');
  $$('.fut.tilting').forEach((c) => c !== card && reset(c));
  if (!card || e.pointerType !== 'mouse') return;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  card.classList.add('tilting');
  card.style.setProperty('--ry', `${(x - 0.5) * 18}deg`);
  card.style.setProperty('--rx', `${(0.5 - y) * 18}deg`);
  card.style.setProperty('--mx', `${x * 100}%`);
  card.style.setProperty('--my', `${y * 100}%`);
});
function reset(c) { c.classList.remove('tilting'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }

// ---------- relative times ----------
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
$$('time.ago').forEach((t) => {
  const mins = Math.round((new Date(t.dateTime) - Date.now()) / 60000);
  t.textContent = Math.abs(mins) < 60 ? rtf.format(mins, 'minute') : Math.abs(mins) < 1440 ? rtf.format(Math.round(mins / 60), 'hour') : rtf.format(Math.round(mins / 1440), 'day');
});

// ---------- search palette ( / or Ctrl+K ) ----------
const pal = $('.palette'), palIn = $('.pal-box input'), palList = $('.pal-box ul');
let sel = 0, results = [];
async function openPalette() {
  pal.hidden = false; palIn.value = ''; palIn.focus();
  renderPal();
}
function closePalette() { pal.hidden = true; }
async function renderPal() {
  const [pl, cl] = await api();
  const q = palIn.value.trim().toLowerCase();
  const items = [
    ...pl.map((p) => ({ label: p.n, sub: `${p.pos} · ${p.c.slice(0, 2).join(', ')}`, href: `${BASE}players/${encodeURIComponent(p.k)}.html`, home: p.home, score: p.home ? 2 : 0 })),
    ...cl.map((c) => ({ label: c.n, sub: `Club · ${c.t}`, href: c.t === 'home' ? `${BASE}index.html` : `${BASE}clubs/${c.id}.html`, score: c.t === 'home' ? 3 : 1 })),
  ];
  results = (q ? items.filter((i) => i.label.toLowerCase().includes(q)).sort((a, b) => (a.label.toLowerCase().startsWith(q) ? -1 : 0) - (b.label.toLowerCase().startsWith(q) ? -1 : 0) || b.score - a.score) : items.filter((i) => i.home || i.score === 3)).slice(0, 12);
  sel = 0;
  palList.innerHTML = results.map((r, i) => `<li class="${i ? '' : 'sel'}"><a href="${r.href}">${esc(r.label)}<small>${esc(r.sub)}</small></a></li>`).join('') || '<li class="muted" style="padding:10px">No matches</li>';
}
$('.search-btn')?.addEventListener('click', openPalette);
pal?.addEventListener('click', (e) => e.target === pal && closePalette());
palIn?.addEventListener('input', renderPal);
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName);
  if ((e.key === '/' && !typing) || (e.key === 'k' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); openPalette(); return; }
  if (pal.hidden) return;
  if (e.key === 'Escape') closePalette();
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
    $$('li', palList).forEach((li, i) => li.classList.toggle('sel', i === sel));
  }
  if (e.key === 'Enter' && results[sel]) location.href = results[sel].href;
});

// ---------- result graphic download ----------
$$('.dl-poster').forEach((btn) => btn.addEventListener('click', async () => {
  const p = document.getElementById(btn.dataset.for);
  if (!p) return;
  const d = p.dataset, W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const red = getComputedStyle(document.documentElement).getPropertyValue('--red').trim() || '#c8352c';
  await document.fonts?.ready;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1d0d0e'); bg.addColorStop(0.6, '#0b0f16'); bg.addColorStop(1, '#07090d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = 0.05; g.fillStyle = '#fff';
  for (let x = -H; x < W; x += 60) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 6, H); g.lineTo(x + 6 + H * 0.47, 0); g.lineTo(x + H * 0.47, 0); g.fill(); }
  g.restore();
  const band = g.createLinearGradient(0, 0, 0, H);
  band.addColorStop(0, d.res === 'L' ? 'rgba(120,120,130,.5)' : red); band.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = band; g.fillRect(W * 0.33, 0, W * 0.34, H);
  g.textAlign = 'center'; g.fillStyle = '#fff';
  g.font = '600 38px Oswald, Impact, sans-serif';
  g.fillText(`${d.type} · ${d.date}`.toUpperCase(), W / 2, 90);
  g.font = '700 64px Oswald, Impact, sans-serif';
  g.fillText(d.res === 'W' ? 'VICTORY' : d.res === 'L' ? 'DEFEAT' : 'DRAW', W / 2, 170);
  if (d.crest) {
    const img = new Image();
    img.src = d.crest;
    await img.decode().catch(() => {});
    if (img.naturalWidth) { const h = 420, w = (img.naturalWidth / img.naturalHeight) * h; g.drawImage(img, W / 2 - w / 2, 220, w, h); }
  }
  g.font = '700 260px Oswald, Impact, sans-serif';
  g.fillText(d.score.replace('-', ' : '), W / 2, 900);
  g.font = '600 46px Oswald, Impact, sans-serif';
  g.fillText(d.home.toUpperCase(), W / 2, 990);
  g.fillStyle = '#9aa3b2'; g.font = '500 32px Inter, sans-serif';
  g.fillText('vs', W / 2, 1040);
  g.fillStyle = '#fff'; g.font = '600 46px Oswald, Impact, sans-serif';
  g.fillText(d.away.toUpperCase(), W / 2, 1100);
  g.font = '500 30px Inter, sans-serif'; g.fillStyle = '#e5e7eb';
  if (d.scorers) g.fillText(`⚽ ${d.scorers}`.slice(0, 70), W / 2, 1180);
  if (d.motm) { g.fillStyle = '#f5d061'; g.fillText(`⭐ Man of the match: ${d.motm}`, W / 2, 1235); }
  g.fillStyle = red; g.fillRect(0, H - 14, W, 14);
  const a = document.createElement('a');
  a.download = `${d.home}-${d.score}-${d.away}.png`.replace(/[^\w.-]+/g, '_');
  a.href = c.toDataURL('image/png');
  a.click();
}));

// ---------- compare tool ----------
const cmpOut = $('#cmp-out');
if (cmpOut) (async () => {
  const [pl] = await api();
  const byName = new Map(pl.map((p) => [p.n.toLowerCase(), p]));
  const byKey = new Map(pl.map((p) => [p.k, p]));
  $('#cmp-list').innerHTML = pl.map((p) => `<option value="${esc(p.n)}">${esc(p.c[0] ?? '')}</option>`).join('');
  const params = new URLSearchParams(location.search);
  const home = pl.filter((p) => p.home && p.s).sort((a, b) => b.s.gp - a.s.gp);
  const A = byKey.get(params.get('a')) ?? home[0], B = byKey.get(params.get('b')) ?? home.find((p) => p !== A) ?? home[1];
  $('#cmp-a').value = A?.n ?? ''; $('#cmp-b').value = B?.n ?? '';
  const update = () => {
    const a = byName.get($('#cmp-a').value.trim().toLowerCase()), b = byName.get($('#cmp-b').value.trim().toLowerCase());
    if (!a || !b) return;
    history.replaceState(null, '', `?a=${encodeURIComponent(a.k)}&b=${encodeURIComponent(b.k)}`);
    render(a, b);
  };
  $('#cmp-a').addEventListener('change', update); $('#cmp-b').addEventListener('change', update);
  if (A && B) render(A, B); else cmpOut.innerHTML = '<p class="muted">Pick two players.</p>';

  function fut(p) {
    const s = p.s ?? {};
    const t = p.ovr >= 88 ? 'icon' : p.ovr >= 80 ? 'gold' : p.ovr >= 70 ? 'silver' : p.ovr > 0 ? 'bronze' : 'plain';
    return `<a class="fut big tier-${t}" href="players/${encodeURIComponent(p.k)}.html"><span class="fut-shine"></span><span class="fut-top"><b class="fut-ovr">${p.ovr || '–'}</b><span class="fut-pos">${p.pos}</span>${p.crest ? `<img class="crest fut-crest" src="${esc(p.crest)}" alt="">` : ''}</span>
<span class="fut-face"><svg viewBox="0 0 100 100"><circle cx="50" cy="33" r="19"/><path d="M10 100c2-25 19-37 40-37s38 12 40 37z"/></svg></span><span class="fut-name">${esc(p.n)}</span>
<span class="fut-stats">${[['GLS', s.g], ['AST', s.a], ['RAT', s.r], ['PAS', s.p != null ? s.p + '%' : '–'], ['TKL', s.t != null ? s.t + '%' : '–'], ['GP', s.gp]].map(([k, v]) => `<span><b>${v ?? '–'}</b>${k}</span>`).join('')}</span></a>`;
  }
  function radar(a, b) {
    const axes = ['Scoring', 'Creating', 'Passing', 'Defending', 'Rating', 'Winning'];
    const S = 320, cx = S / 2, cy = S / 2, R = S / 2 - 48;
    const pt = (i, v) => { const t = -Math.PI / 2 + (i * 2 * Math.PI) / 6; return [cx + Math.cos(t) * R * v / 100, cy + Math.sin(t) * R * v / 100]; };
    const ring = (v) => axes.map((_, i) => pt(i, v).join(',')).join(' ');
    const shape = (p, col) => p.rad ? `<polygon class="shape" points="${p.rad.map((v, i) => pt(i, Math.max(v, 3)).join(',')).join(' ')}" fill="${col}" fill-opacity=".25" stroke="${col}" stroke-width="2.5"/>${p.rad.map((v, i) => { const [x, y] = pt(i, Math.max(v, 3)); return `<circle cx="${x}" cy="${y}" r="4" fill="${col}" data-tip="${esc(`${p.n} – ${axes[i]}: ${p.raw?.[i] ?? ''} (top ${100 - v}%)`)}"/>`; }).join('')}` : '';
    return `<svg class="chart radar" viewBox="0 0 ${S} ${S}">${[25, 50, 75, 100].map((v) => `<polygon class="grid" points="${ring(v)}" fill="none"/>`).join('')}
${axes.map((l, i) => { const [x, y] = pt(i, 100), [lx, ly] = pt(i, 124); return `<line class="grid" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/><text class="axis rl" x="${lx}" y="${ly + 4}" text-anchor="middle">${l}</text>`; }).join('')}
${shape(a, 'var(--red)')}${shape(b, '#94a3b8')}</svg>`;
  }
  function bars(a, b) {
    const rows = [['Games', (p) => p.s?.gp], ['Goals', (p) => p.s?.g], ['Assists', (p) => p.s?.a], ['Avg rating', (p) => p.s?.r, 1], ['MOTM', (p) => p.s?.m], ['Pass %', (p) => p.s?.p], ['Tackle %', (p) => p.s?.t], ['Win %', (p) => p.s?.w], ['Career goals', (p) => p.car?.g], ['Career assists', (p) => p.car?.a]];
    return `<ul class="compare-bars">${rows.map(([l, f, dec]) => { const x = +f(a) || 0, y = +f(b) || 0, t = x + y || 1; return `<li><b class="${x > y ? 'lead' : ''}">${dec ? x.toFixed(1) : x}</b><span>${l}</span><b class="${y > x ? 'lead' : ''}">${dec ? y.toFixed(1) : y}</b><div class="duel"><i class="l" style="--w:${x / t * 100}%"></i><i class="r" style="--w:${y / t * 100}%"></i></div></li>`; }).join('')}</ul>`;
  }
  function render(a, b) {
    cmpOut.innerHTML = `${fut(a)}<div class="cmp-mid"><div class="card">${radar(a, b)}<p class="small muted" style="text-align:center"><span style="color:var(--red)">■</span> ${esc(a.n)} &nbsp; <span style="color:#94a3b8">■</span> ${esc(b.n)}</p></div><div class="card">${bars(a, b)}</div></div>${fut(b)}`;
    cmpOut.classList.remove('in'); void cmpOut.offsetWidth; cmpOut.classList.add('in');
  }
})();


// ================= Members: Discord login, Squad Hub, verified badges =================
const MAPI = document.body.dataset.api;
if (MAPI) (() => {
  const KEY = 'norex_session';
  const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} } };
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('norex_session')) store.set(hash.get('norex_session'));
  const err = hash.get('norex_error');
  if (hash.has('norex_session') || err) history.replaceState(null, '', location.pathname + location.search);
  const session = (() => { try { const t = store.get(); const p = JSON.parse(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))); return p.exp > Date.now() / 1000 ? { token: t, ...p } : null; } catch { return null; } })();
  if (!session) store.set(null);
  const loginUrl = () => `${MAPI}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
  const call = async (path, body) => {
    const r = await fetch(MAPI + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${session?.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { store.set(null); location.reload(); }
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  function toast(msg, bad) {
    const t = document.createElement('div');
    t.className = `toast${bad ? ' bad' : ''}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }
  if (err) toast(err === 'not_member' ? 'Members only – you need to be in the NOREX Discord server.' : err === 'cancelled' ? 'Login cancelled.' : 'Discord login failed – try again.', true);

  // Header
  const slot = $('.auth-slot');
  if (slot) slot.innerHTML = session
    ? `<a class="me-btn" href="${BASE}members.html"><img src="${esc(session.a)}" alt="">${esc(session.n)}</a>`
    : `<a class="login-btn" href="${loginUrl()}">Member login</a>`;

  // Verified badges (public)
  (async () => {
    let data;
    try { data = JSON.parse(sessionStorage.getItem('norex_public') || 'null'); } catch {}
    if (!data || Date.now() - data.t > 300000) {
      try { data = { t: Date.now(), ...(await (await fetch(`${MAPI}/api/public`)).json()) }; sessionStorage.setItem('norex_public', JSON.stringify(data)); } catch { return; }
    }
    const claims = data.claims || {};
    $$('.member-badge[data-player]').forEach((el) => {
      const c = claims[el.dataset.player];
      if (!c) return;
      el.innerHTML = `<div class="verified"><img src="${esc(c.avatar)}" alt=""><div><b>✓ Verified NOREX member</b><span>${esc(c.name ?? '')}${c.platform ? ` · ${esc(c.platform)}` : ''}${c.positions?.length ? ` · ${c.positions.map(esc).join(' / ')}` : ''}</span>${c.bio ? `<p>${esc(c.bio)}</p>` : ''}</div></div>`;
    });
    $$('a.fut').forEach((a) => {
      const k = decodeURIComponent((a.getAttribute('href') || '').split('/').pop().replace('.html', ''));
      if (claims[k]) a.classList.add('is-verified');
    });
  })();

  // Squad Hub
  const hub = $('#hub');
  if (!hub) return;
  if (!session) {
    hub.innerHTML = `<div class="card hub-login"><img src="${BASE}assets/crest.png" height="110" alt=""><div><h2>Members only</h2><p class="muted">Log in with your Discord account. Only members of the NOREX server get in.</p><a class="btn discord big" href="${loginUrl()}">Log in with Discord</a></div></div>`;
    return;
  }
  const POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
  const fmtDay = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  async function render() {
    const [me, [players], pub] = await Promise.all([call('/api/me'), api(), fetch(`${MAPI}/api/public`).then((r) => r.json()).catch(() => ({ claims: {} }))]);
    const squad = players.filter((p) => p.home).sort((a, b) => a.n.localeCompare(b.n));
    const claimedBy = pub.claims || {};
    const claim = me.claim, prof = me.profile || {};
    const myPlayer = claim && players.find((p) => p.k === claim.player);
    hub.innerHTML = `
<div class="hub-head card"><img src="${esc(me.user.avatar)}" alt=""><div><small class="muted">Logged in as</small><h2>${esc(me.user.name)}</h2>${me.user.admin ? '<span class="tag home">Admin</span>' : '<span class="tag">Member</span>'}</div><button class="btn ghost" id="logout" type="button">Log out</button></div>
<div class="grid2">
<div class="card"><h3>My player</h3>${
  claim?.status === 'approved' ? `<p>✅ You're verified as <a href="${BASE}players/${encodeURIComponent(claim.player)}.html"><b>${esc(claim.playerName)}</b></a>.</p>`
  : claim?.status === 'pending' ? `<p>⏳ Claim for <b>${esc(claim.playerName)}</b> is waiting for admin approval.</p>`
  : `${claim?.status === 'rejected' ? `<p class="muted">Your claim for ${esc(claim.playerName)} was not approved. Pick again or ask an admin.</p>` : '<p class="muted">Link your Discord to your in-game player. An admin approves it, then your player page shows a ✓ Verified badge.</p>'}
  <div class="row"><select id="claim-pick"><option value="">Choose your gamertag…</option>${squad.map((p) => `<option value="${esc(p.k)}"${claimedBy[p.k] ? ' disabled' : ''}>${esc(p.n)}${claimedBy[p.k] ? ' (claimed)' : ''}</option>`).join('')}</select><button class="btn" id="claim-go" type="button">Claim</button></div>`}
${myPlayer ? `<p class="small muted">${myPlayer.pos} · ${myPlayer.s ? `${myPlayer.s.gp} games · ${myPlayer.s.g}G ${myPlayer.s.a}A · ${myPlayer.s.r} avg` : ''}</p>` : ''}
</div>
<div class="card"><h3>My profile</h3>
<label class="fld">Bio <textarea id="pf-bio" maxlength="280" rows="3" placeholder="Playstyle, favourite position, anything…">${esc(prof.bio || '')}</textarea></label>
<label class="fld">Positions (up to 3)</label><div class="chipset" id="pf-pos">${POS.map((p) => `<button type="button" class="chip${prof.positions?.includes(p) ? ' on' : ''}" data-p="${p}">${p}</button>`).join('')}</div>
<label class="fld">Platform <select id="pf-plat"><option value="">–</option>${['PS5', 'Xbox', 'PC'].map((x) => `<option${prof.platform === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
<button class="btn" id="pf-save" type="button">Save profile</button></div>
</div>
<section class="block"><h2 class="banner-h">Availability <small>next 7 nights</small></h2><div id="avail" class="avail"><p class="muted">Loading…</p></div></section>
<section class="block"><h2 class="banner-h">Members' MOTM vote</h2><div id="votes" class="votes"><p class="muted">Loading…</p></div></section>
${me.user.admin ? '<section class="block"><h2 class="banner-h">Admin · player claims</h2><div id="admin"><p class="muted">Loading…</p></div></section>' : ''}`;

    $('#logout').onclick = () => { store.set(null); location.href = `${BASE}index.html`; };
    $('#claim-go')?.addEventListener('click', async () => {
      const v = $('#claim-pick').value;
      if (!v) return toast('Pick your gamertag first', true);
      try { await call('/api/claim', { player: v }); toast('Claim sent – an admin will approve it.'); render(); } catch (e) { toast(e.message, true); }
    });
    $('#pf-pos').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      if (!b.classList.contains('on') && $$('#pf-pos .chip.on').length >= 3) return toast('Up to 3 positions', true);
      b.classList.toggle('on');
    });
    $('#pf-save').onclick = async () => {
      try {
        await call('/api/profile', { bio: $('#pf-bio').value, platform: $('#pf-plat').value, positions: $$('#pf-pos .chip.on').map((b) => b.dataset.p) });
        sessionStorage.removeItem('norex_public');
        toast('Profile saved');
      } catch (e) { toast(e.message, true); }
    };
    renderAvail(await call('/api/availability'));
    renderVotes(await call('/api/vote'));
    if (me.user.admin) renderAdmin(await call('/api/admin/claims'));
  }

  function renderAvail(d) {
    const icon = { yes: '✅', maybe: '❔', no: '❌' };
    $('#avail').innerHTML = d.days.map((day) => {
      const mine = day.people.find((p) => p.id === session.u)?.s;
      const by = (s) => day.people.filter((p) => p.s === s);
      return `<div class="day card"><b>${fmtDay(day.date)}</b><div class="count-row"><span>✅ ${by('yes').length}</span><span>❔ ${by('maybe').length}</span></div>
<div class="faces">${by('yes').map((p) => `<img src="${esc(p.a)}" alt="" data-tip="${esc(p.n)}">`).join('')}${by('maybe').map((p) => `<img class="maybe" src="${esc(p.a)}" alt="" data-tip="${esc(p.n)} (maybe)">`).join('')}</div>
<div class="pick">${['yes', 'maybe', 'no'].map((s) => `<button type="button" class="${mine === s ? 'on' : ''}" data-date="${day.date}" data-s="${mine === s ? 'clear' : s}" aria-label="${s}">${icon[s]}</button>`).join('')}</div></div>`;
    }).join('');
    $$('#avail .pick button').forEach((b) => (b.onclick = async () => {
      try { renderAvail(await call('/api/availability', { date: b.dataset.date, status: b.dataset.s })); } catch (e) { toast(e.message, true); }
    }));
  }

  function renderVotes(d) {
    $('#votes').innerHTML = d.matches.map((m) => {
      const max = Math.max(1, ...Object.values(m.tally));
      return `<div class="card vote"><div class="vote-head">${resPillJs(m.res)} <b>${m.gf}–${m.ga} vs ${esc(m.opp)}</b><small class="muted">${m.total} vote${m.total === 1 ? '' : 's'}</small></div>
<ul>${m.players.sort((a, b) => (m.tally[b.k] || 0) - (m.tally[a.k] || 0) || b.r - a.r).map((p) => `<li class="${m.mine === p.k ? 'mine' : ''}" style="--w:${((m.tally[p.k] || 0) / max) * 100}%"><button type="button" data-m="${m.id}" data-p="${esc(p.k)}">${esc(p.n)} <small>${p.r.toFixed(1)}</small></button><b>${m.tally[p.k] || 0}</b></li>`).join('')}</ul></div>`;
    }).join('') || '<p class="muted">No recent matches.</p>';
    $$('#votes button').forEach((b) => (b.onclick = async () => {
      try { renderVotes(await call('/api/vote', { match: b.dataset.m, player: b.dataset.p })); toast('Vote saved'); } catch (e) { toast(e.message, true); }
    }));
  }
  const resPillJs = (r) => `<span class="res ${r}">${r}</span>`;

  function renderAdmin(d) {
    $('#admin').innerHTML = d.claims.length ? `<div class="tbl"><table><thead><tr><th>Member</th><th>Claims</th><th>Status</th><th></th></tr></thead><tbody>${d.claims.map((c) => `<tr><td><img class="av" src="${esc(c.a)}" alt=""> ${esc(c.n)}</td><td><a href="${BASE}players/${encodeURIComponent(c.player)}.html">${esc(c.playerName)}</a></td><td><span class="tag${c.status === 'approved' ? ' home' : ''}">${esc(c.status)}</span></td><td>${c.status !== 'approved' ? `<button class="btn sm" data-u="${c.user}" data-a="approve" type="button">Approve</button>` : ''} ${c.status !== 'rejected' ? `<button class="btn ghost sm" data-u="${c.user}" data-a="reject" type="button">${c.status === 'approved' ? 'Unlink' : 'Reject'}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No claims yet.</p>';
    $$('#admin button').forEach((b) => (b.onclick = async () => {
      try { renderAdmin(await call('/api/admin/claims', { user: b.dataset.u, action: b.dataset.a })); sessionStorage.removeItem('norex_public'); toast('Updated'); } catch (e) { toast(e.message, true); }
    }));
  }

  render().catch((e) => { hub.innerHTML = `<div class="card"><p>⚠️ ${esc(e.message)}</p></div>`; });
})();
