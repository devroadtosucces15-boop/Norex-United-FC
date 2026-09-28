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


// ================= Members: Discord login, Squad Hub, manager portal, verified badges =================
const MAPI = document.body.dataset.api;
if (MAPI) (() => {
  const KEY = 'norex_session';
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('norex_session')) ls.set(KEY, hash.get('norex_session'));
  const err = hash.get('norex_error');
  if (hash.has('norex_session') || err) history.replaceState(null, '', location.pathname + location.search);
  // Session payload is base64url UTF-8 JSON – decode bytes properly so names with any characters show correctly.
  const decode = (t) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
  const session = (() => { try { const t = ls.get(KEY); const p = decode(t); return p.exp > Date.now() / 1000 ? { token: t, ...p } : null; } catch { return null; } })();
  if (!session) ls.set(KEY, null);
  const logout = () => { ls.set(KEY, null); ls.set('norex_me', null); location.href = `${BASE}index.html`; };
  const loginUrl = () => `${MAPI}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
  const call = async (path, body) => {
    const r = await fetch(MAPI + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${session?.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { ls.set(KEY, null); location.reload(); }
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  function toast(msg, bad) {
    $$('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = `toast${bad ? ' bad' : ''}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
  // Role badge (tiers from bot/roles.js). Sessions from before roles existed only carry `adm`.
  const ROLE = { owner: ['👑 Owner', 'owner'], manager: ['🛡️ Manager', 'home'], claimed: ['✅ Verified player', 'ok'], member: ['NOREX member', ''] };
  const roleTag = (r) => { const [l, c] = ROLE[r] || ROLE.member; return `<span class="tag ${c}">${l}</span>`; };
  const baseRole = session && (session.role ?? (session.adm ? 'manager' : 'member'));
  const ago = (ms) => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
  if (err) toast(err === 'not_member' ? 'Members only – you need to be in the NOREX Discord server.' : err === 'cancelled' ? 'Login cancelled.' : 'Discord login failed – try again.', true);

  // ---------- header: login button or account menu ----------
  const slot = $('.auth-slot');
  if (slot && !session) slot.innerHTML = `<a class="login-btn" href="${loginUrl()}">Member login</a>`;
  if (slot && session) {
    const cached = (() => { try { return JSON.parse(ls.get('norex_me') || 'null'); } catch { return null; } })();
    const hub = `${BASE}members.html`;
    const myRole = baseRole === 'member' && cached?.player ? 'claimed' : baseRole;
    slot.innerHTML = `<div class="acct"><button class="me-btn" type="button" aria-haspopup="true" aria-expanded="false"><img src="${esc(session.a)}" alt=""><span>${esc(session.n)}</span><i>▾</i></button>
<div class="acct-menu" hidden><div class="acct-head"><img src="${esc(session.a)}" alt=""><div><b>${esc(session.n)}</b><small>${ROLE[myRole][0]}</small></div></div>
<a href="${hub}#me">👤 My profile</a>${cached?.player ? `<a href="${BASE}players/${encodeURIComponent(cached.player)}.html">🪪 My player page</a>` : ''}
<a href="${hub}#availability">📅 Availability</a><a href="${hub}#votes">⭐ MOTM votes</a>${session.adm ? `<a href="${hub}#manager">🛡️ Manager portal</a>` : ''}
<button type="button" class="acct-out">↩ Log out</button></div></div>`;
    const btn = $('.me-btn', slot), menu = $('.acct-menu', slot);
    btn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', !menu.hidden); };
    document.addEventListener('click', (e) => { if (!slot.contains(e.target)) menu.hidden = true; });
    $('.acct-out', slot).onclick = logout;
  }

  // ---------- verified badges (public) ----------
  (async () => {
    let data;
    try { data = JSON.parse(sessionStorage.getItem('norex_public') || 'null'); } catch {}
    if (!data || Date.now() - data.t > 120000) {
      try { data = { t: Date.now(), ...(await (await fetch(`${MAPI}/api/public`, { cache: 'no-store' })).json()) }; sessionStorage.setItem('norex_public', JSON.stringify(data)); } catch { return; }
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

  // ---------- Squad Hub ----------
  const hubEl = $('#hub');
  if (!hubEl) return;
  if (!session) {
    hubEl.innerHTML = `<div class="card hub-login"><img src="${BASE}assets/crest.png" height="110" alt=""><div><h2>Members only</h2><p class="muted">Log in with your Discord account. Only members of the NOREX server get in.</p><a class="btn discord big" href="${loginUrl()}">Log in with Discord</a></div></div>`;
    return;
  }
  const POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
  const ICON = { yes: '✅', maybe: '❔', no: '❌' };
  const fmtDay = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const pill = (r) => `<span class="res ${r}">${r}</span>`;
  const S = { tab: 'me', me: null, players: [], pub: {}, avail: null, votes: null, admin: null, adminTab: 'claims', sel: new Set() };
  const TABS = [['me', '👤 My NOREX'], ['availability', '📅 Availability'], ['votes', '⭐ MOTM votes'], ...(session.adm ? [['manager', '🛡️ Manager']] : [])];

  hubEl.innerHTML = `<div class="hub-head card"><img src="${esc(session.a)}" alt=""><div><small class="muted">Logged in as</small><h2>${esc(session.n)}</h2><span id="role-tag">${roleTag(baseRole)}</span></div><button class="btn ghost" id="logout" type="button">Log out</button></div>
<div class="chipset hub-tabs">${TABS.map(([k, l]) => `<button class="chip" type="button" data-tab="${k}">${l}</button>`).join('')}</div>
<div id="panel"></div>`;
  $('#logout').onclick = logout;
  $('.hub-tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); };
  addEventListener('hashchange', () => go(location.hash.slice(1), false));
  const panel = $('#panel');

  function go(tab, push = true) {
    if (!TABS.some(([k]) => k === tab)) tab = 'me';
    S.tab = tab;
    if (push) history.replaceState(null, '', `#${tab}`);
    $$('.hub-tabs .chip').forEach((c) => c.classList.toggle('on', c.dataset.tab === tab));
    draw();
    load(tab);
  }
  async function load(tab) {
    try {
      if (tab === 'availability') S.avail = await call('/api/availability');
      if (tab === 'votes') S.votes = await call('/api/vote');
      if (tab === 'manager') S.admin = await call('/api/admin/overview');
      if (tab === S.tab) draw();
    } catch (e) { toast(e.message, true); }
  }
  const draw = () => { panel.innerHTML = ({ me: viewMe, availability: viewAvail, votes: viewVotes, manager: viewManager }[S.tab])(); bind(); };

  // ----- My NOREX -----
  function viewMe() {
    if (!S.me) return '<p class="muted">Loading…</p>';
    const claim = S.me.claim, prof = S.me.profile || {};
    const taken = S.pub;
    const squad = S.players.filter((p) => p.home).sort((a, b) => a.n.localeCompare(b.n));
    const myPl = claim && S.players.find((p) => p.k === claim.player);
    return `<div class="grid2"><div class="card"><h3>My player</h3>${
      claim?.status === 'approved' ? `<div class="claim-ok">✅ Verified as <a href="${BASE}players/${encodeURIComponent(claim.player)}.html"><b>${esc(claim.playerName)}</b></a>${myPl?.s ? `<small>${myPl.pos} · ${myPl.s.gp} games · ${myPl.s.g}G ${myPl.s.a}A · ${Number(myPl.s.r).toFixed(1)} avg</small>` : ''}</div>`
      : claim?.status === 'pending' ? `<div class="claim-wait">⏳ Claim for <b>${esc(claim.playerName)}</b> is waiting for a manager.</div><button class="btn ghost sm" data-act="claim-cancel" type="button">Cancel claim</button>`
      : `${claim && ['rejected', 'unlinked'].includes(claim.status) ? `<p class="muted">Your claim for ${esc(claim.playerName)} was ${claim.status}${claim.decidedBy ? ` by ${esc(claim.decidedBy)}` : ''}. Pick again or ask a manager.</p>` : '<p class="muted">Link your Discord to your in-game player. A manager approves it, then your player page shows a ✓ Verified badge.</p>'}
      <div class="row"><select id="claim-pick"><option value="">Choose your gamertag…</option>${squad.map((p) => `<option value="${esc(p.k)}"${taken[p.k] ? ' disabled' : ''}>${esc(p.n)}${taken[p.k] ? ' (claimed)' : ''}</option>`).join('')}</select><button class="btn" data-act="claim" type="button">Claim</button></div>`}</div>
<div class="card"><h3>My profile</h3>
<label class="fld">Bio <textarea id="pf-bio" maxlength="280" rows="3" placeholder="Playstyle, favourite position, anything…">${esc(prof.bio || '')}</textarea></label>
<label class="fld">Positions (up to 3)</label><div class="chipset" id="pf-pos">${POS.map((p) => `<button type="button" class="chip${prof.positions?.includes(p) ? ' on' : ''}" data-p="${p}">${p}</button>`).join('')}</div>
<label class="fld">Platform <select id="pf-plat"><option value="">–</option>${['PS5', 'Xbox', 'PC'].map((x) => `<option${prof.platform === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
<button class="btn" data-act="profile" type="button">Save profile</button>${prof.updated ? `<small class="muted"> Saved ${ago(prof.updated)}</small>` : ''}</div></div>`;
  }

  // ----- Availability (multi-day select + bulk) -----
  function viewAvail() {
    if (!S.avail) return '<p class="muted">Loading…</p>';
    const n = S.sel.size;
    return `<div class="bulk card${n ? ' on' : ''}"><span>${n ? `<b>${n}</b> day${n > 1 ? 's' : ''} selected` : 'Tip: tick several days, then set them all at once'}</span>
<div class="bulk-btns">${['yes', 'maybe', 'no'].map((s) => `<button type="button" class="btn sm${n ? '' : ' ghost'}" data-bulk="${s}"${n ? '' : ' disabled'}>${ICON[s]} ${s}</button>`).join('')}<button type="button" class="btn ghost sm" data-bulk="clear"${n ? '' : ' disabled'}>Clear</button>
<button type="button" class="btn ghost sm" data-selall>${n === 7 ? 'Unselect all' : 'Select all week'}</button></div></div>
<div class="avail">${S.avail.days.map((day) => {
      const mine = day.people.find((p) => p.id === session.u)?.s;
      const by = (s) => day.people.filter((p) => p.s === s);
      return `<div class="day card${S.sel.has(day.date) ? ' sel' : ''}${mine ? ` my-${mine}` : ''}"><label class="day-top"><input type="checkbox" data-sel="${day.date}"${S.sel.has(day.date) ? ' checked' : ''}><b>${fmtDay(day.date)}</b></label>
<div class="count-row"><span>✅ ${by('yes').length}</span><span>❔ ${by('maybe').length}</span><span>❌ ${by('no').length}</span></div>
<div class="faces">${by('yes').map((p) => `<img src="${esc(p.a)}" alt="" data-tip="${esc(p.n)}">`).join('')}${by('maybe').map((p) => `<img class="maybe" src="${esc(p.a)}" alt="" data-tip="${esc(p.n)} (maybe)">`).join('')}</div>
<div class="pick">${['yes', 'maybe', 'no'].map((s) => `<button type="button" class="${mine === s ? 'on' : ''}" data-day="${day.date}" data-s="${s}" aria-label="${s}">${ICON[s]}</button>`).join('')}</div></div>`;
    }).join('')}</div>`;
  }
  async function setAvail(dates, status) {
    const prev = JSON.parse(JSON.stringify(S.avail));
    for (const day of S.avail.days) if (dates.includes(day.date)) {
      day.people = day.people.filter((p) => p.id !== session.u);
      if (status !== 'clear') day.people.push({ id: session.u, s: status, n: session.n, a: session.a });
    }
    draw();
    try { S.avail = await call('/api/availability', { dates, status }); draw(); } catch (e) { S.avail = prev; draw(); toast(e.message, true); }
  }

  // ----- Votes (change or remove any time) -----
  function viewVotes() {
    if (!S.votes) return '<p class="muted">Loading…</p>';
    return `<p class="muted small">Pick one player per match. Tap another name to change your vote, or tap your pick again to remove it.</p><div class="votes">${S.votes.matches.map((m) => {
      const max = Math.max(1, ...Object.values(m.tally));
      return `<div class="card vote"><div class="vote-head">${pill(m.res)} <b>${m.gf}–${m.ga} vs ${esc(m.opp)}</b><small class="muted">${m.total} vote${m.total === 1 ? '' : 's'}</small></div>
<ul>${[...m.players].sort((a, b) => (m.tally[b.k] || 0) - (m.tally[a.k] || 0) || b.r - a.r).map((p) => `<li class="${m.mine === p.k ? 'mine' : ''}" style="--w:${((m.tally[p.k] || 0) / max) * 100}%"><button type="button" data-m="${m.id}" data-p="${esc(p.k)}">${m.mine === p.k ? '✔ ' : ''}${esc(p.n)} <small>${Number(p.r).toFixed(1)}</small></button><b>${m.tally[p.k] || 0}</b></li>`).join('')}</ul></div>`;
    }).join('') || '<p class="muted">No recent matches.</p>'}</div>`;
  }
  async function vote(matchId, player) {
    const prev = JSON.parse(JSON.stringify(S.votes));
    const m = S.votes.matches.find((x) => x.id === matchId);
    if (m.mine) { m.tally[m.mine]--; m.total--; }
    const removing = m.mine === player;
    m.mine = removing ? null : player;
    if (!removing) { m.tally[player] = (m.tally[player] || 0) + 1; m.total++; }
    draw();
    try { S.votes = await call('/api/vote', { match: matchId, player: removing ? null : player }); draw(); toast(removing ? 'Vote removed' : 'Vote saved'); } catch (e) { S.votes = prev; draw(); toast(e.message, true); }
  }

  // ----- Manager portal -----
  const ACT = { login: '🔑', claim: '🪪', 'claim-cancel': '↩', 'claim-approved': '✅', 'claim-rejected': '⛔', 'claim-unlinked': '🔓', profile: '✏️', availability: '📅', vote: '⭐', 'vote-remove': '☆' };
  const ACT_TXT = { login: 'logged in', claim: 'claimed', 'claim-cancel': 'cancelled their claim', 'claim-approved': 'approved claim', 'claim-rejected': 'rejected claim', 'claim-unlinked': 'unlinked', profile: 'updated profile', availability: 'set availability', vote: 'voted MOTM', 'vote-remove': 'removed MOTM vote' };
  function viewManager() {
    if (!S.admin) return '<p class="muted">Loading…</p>';
    const A = S.admin;
    const claims = Object.entries(A.claims).map(([user, c]) => ({ user, ...c }));
    const pending = claims.filter((c) => c.status === 'pending');
    const decided = claims.filter((c) => c.status !== 'pending').sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0));
    const users = Object.entries(A.users).sort(([, a], [, b]) => b.last - a.last);
    const sub = [['claims', `Claims${pending.length ? ` (${pending.length})` : ''}`], ['members', `Members (${users.length})`], ['week', 'Squad week'], ['votes', 'Votes'], ['activity', 'Activity']];
    const body = {
      claims: () => `<h3>Waiting for approval</h3>${pending.length ? `<div class="claim-list">${pending.map((c) => `<div class="claim-row card"><img src="${esc(c.a)}" alt=""><div><b>${esc(c.n)}</b> wants <a href="${BASE}players/${encodeURIComponent(c.player)}.html">${esc(c.playerName)}</a><small class="muted">${ago(c.at)}</small></div><div class="row"><button class="btn sm" data-claim="approve" data-u="${c.user}" type="button">Approve</button><button class="btn ghost sm" data-claim="reject" data-u="${c.user}" type="button">Reject</button></div></div>`).join('')}</div>` : '<p class="muted">Nothing waiting. 🎉</p>'}
<h3 style="margin-top:24px">History</h3>${decided.length ? `<div class="tbl"><table><thead><tr><th>Member</th><th>Player</th><th>Status</th><th>By</th><th>When</th><th></th></tr></thead><tbody>${decided.map((c) => `<tr><td><img class="av" src="${esc(c.a)}" alt=""> ${esc(c.n)}</td><td><a href="${BASE}players/${encodeURIComponent(c.player)}.html">${esc(c.playerName)}</a></td><td><span class="tag${c.status === 'approved' ? ' home' : ''}">${esc(c.status)}</span></td><td>${esc(c.decidedBy || '–')}</td><td>${c.decidedAt ? ago(c.decidedAt) : '–'}</td><td>${c.status === 'approved' ? `<button class="btn ghost sm" data-claim="unlink" data-u="${c.user}" type="button">Unlink</button>` : `<button class="btn ghost sm" data-claim="approve" data-u="${c.user}" type="button">Approve</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No decisions yet.</p>'}`,
      members: () => `<div class="tbl"><table><thead><tr><th>Member</th><th>Role</th><th>Player</th><th>Positions</th><th>Platform</th><th>This week</th><th class="n">Logins</th><th>Last seen</th></tr></thead><tbody>${users.map(([id, u]) => {
        const c = A.claims[id], pf = A.profiles[id] || {};
        return `<tr><td><img class="av" src="${esc(u.a)}" alt=""> ${esc(u.n)} <small class="muted">@${esc(u.tag || '')}</small></td><td>${roleTag(u.role === 'member' || !u.role ? (u.admin ? 'manager' : c?.status === 'approved' ? 'claimed' : 'member') : u.role)}</td><td>${c ? `${esc(c.playerName)} <small class="muted">(${esc(c.status)})</small>` : '–'}</td><td>${esc((pf.positions || []).join(' / ') || '–')}</td><td>${esc(pf.platform || '–')}</td><td class="wk">${A.availability.map((d) => `<span data-tip="${esc(fmtDay(d.date))}">${ICON[d.byUser[id]?.s] || '·'}</span>`).join('')}</td><td class="n">${u.logins || 1}</td><td>${ago(u.last)}</td></tr>`;
      }).join('')}</tbody></table></div>`,
      week: () => `<div class="tbl"><table class="grid-week"><thead><tr><th>Member</th>${A.availability.map((d) => `<th>${esc(fmtDay(d.date))}</th>`).join('')}</tr></thead><tbody>${users.map(([id, u]) => `<tr><td><img class="av" src="${esc(u.a)}" alt=""> ${esc(u.n)}</td>${A.availability.map((d) => `<td class="c s-${d.byUser[id]?.s || 'none'}">${ICON[d.byUser[id]?.s] || ''}</td>`).join('')}</tr>`).join('')}
<tr class="tot"><td><b>Available</b></td>${A.availability.map((d) => { const v = Object.values(d.byUser); return `<td class="c"><b>${v.filter((x) => x.s === 'yes').length}</b><small> +${v.filter((x) => x.s === 'maybe').length}?</small></td>`; }).join('')}</tr></tbody></table></div>`,
      votes: () => `<div class="votes">${A.votes.map((m) => `<div class="card vote"><div class="vote-head">${pill(m.res)} <b>${m.gf}–${m.ga} vs ${esc(m.opp)}</b><small class="muted">${m.voters.length} votes</small></div>${m.voters.length ? `<ul class="voters">${m.voters.map((v) => `<li><img class="av" src="${esc(v.a)}" alt=""> ${esc(v.n)} → <b>${esc(v.pn || '?')}</b></li>`).join('')}</ul>` : '<p class="muted">No votes yet.</p>'}</div>`).join('')}</div>`,
      activity: () => `<div class="row" style="margin-bottom:12px"><select id="act-filter"><option value="">Everyone</option>${users.map(([id, u]) => `<option value="${id}"${S.actFilter === id ? ' selected' : ''}>${esc(u.n)}</option>`).join('')}</select></div>
<ul class="feed">${A.activity.filter((a) => !S.actFilter || a.u === S.actFilter).map((a) => `<li><span class="ic">${ACT[a.type] || '•'}</span><img class="av" src="${esc(a.a)}" alt=""><div><b>${esc(a.n)}</b> ${ACT_TXT[a.type] || esc(a.type)}${a.detail ? ` <span class="muted">${esc(a.detail)}</span>` : ''}</div><small class="muted">${ago(a.at)}</small></li>`).join('') || '<li class="muted">No activity yet.</li>'}</ul>`,
    };
    return `<div class="chipset sub-tabs">${sub.map(([k, l]) => `<button class="chip${S.adminTab === k ? ' on' : ''}" type="button" data-sub="${k}">${l}</button>`).join('')}<button class="chip" type="button" data-refresh>↻ Refresh</button></div><div class="card mgr">${body[S.adminTab]()}</div>`;
  }
  async function decide(user, action) {
    const prev = JSON.parse(JSON.stringify(S.admin.claims));
    const c = S.admin.claims[user];
    c.status = action === 'approve' ? 'approved' : action === 'unlink' ? 'unlinked' : 'rejected';
    c.decidedBy = session.n; c.decidedAt = Date.now();
    draw();
    try {
      const r = await call('/api/admin/claims', { user, action });
      S.admin.claims = r.claims;
      S.admin.activity.unshift({ at: Date.now(), n: session.n, a: session.a, type: `claim-${c.status}`, detail: `${c.n} → ${c.playerName}` });
      sessionStorage.removeItem('norex_public');
      draw();
      toast(`${c.playerName}: ${c.status}`);
    } catch (e) { S.admin.claims = prev; draw(); toast(e.message, true); }
  }

  // ----- event wiring for whatever panel is showing -----
  function bind() {
    panel.onclick = async (e) => {
      const t = e.target.closest('button, input');
      if (!t) return;
      const d = t.dataset;
      if (d.act === 'claim') {
        const v = $('#claim-pick').value;
        if (!v) return toast('Pick your gamertag first', true);
        try { S.me.claim = (await call('/api/claim', { player: v })).claim; draw(); toast('Claim sent – a manager will approve it.'); } catch (er) { toast(er.message, true); }
      }
      if (d.act === 'claim-cancel') { try { S.me.claim = (await call('/api/claim', { cancel: true })).claim; draw(); toast('Claim cancelled'); } catch (er) { toast(er.message, true); } }
      if (d.p && t.closest('#pf-pos')) {
        if (!t.classList.contains('on') && $$('#pf-pos .chip.on').length >= 3) return toast('Up to 3 positions', true);
        t.classList.toggle('on');
      }
      if (d.act === 'profile') {
        try {
          S.me.profile = (await call('/api/profile', { bio: $('#pf-bio').value, platform: $('#pf-plat').value, positions: $$('#pf-pos .chip.on').map((b) => b.dataset.p) })).profile;
          sessionStorage.removeItem('norex_public');
          draw(); toast('Profile saved');
        } catch (er) { toast(er.message, true); }
      }
      if (d.sel !== undefined) { t.checked ? S.sel.add(d.sel) : S.sel.delete(d.sel); draw(); }
      if (d.selall !== undefined) { S.sel = S.sel.size === 7 ? new Set() : new Set(S.avail.days.map((x) => x.date)); draw(); }
      if (d.day) { const mine = S.avail.days.find((x) => x.date === d.day).people.find((p) => p.id === session.u)?.s; setAvail([d.day], mine === d.s ? 'clear' : d.s); }
      if (d.bulk) { const dates = [...S.sel]; S.sel = new Set(); setAvail(dates, d.bulk); toast(`${dates.length} day${dates.length > 1 ? 's' : ''} updated`); }
      if (d.m) vote(d.m, d.p);
      if (d.sub) { S.adminTab = d.sub; draw(); }
      if (d.refresh !== undefined) { S.admin = null; draw(); load('manager'); }
      if (d.claim) decide(d.u, d.claim);
    };
    panel.onchange = (e) => { if (e.target.id === 'act-filter') { S.actFilter = e.target.value; draw(); } };
  }

  // ----- start -----
  (async () => {
    try {
      const [me, [players], pub] = await Promise.all([call('/api/me'), api(), fetch(`${MAPI}/api/public`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ claims: {} }))]);
      S.me = me; S.players = players; S.pub = pub.claims || {};
      $('#role-tag').innerHTML = roleTag(me.user.role);
      ls.set('norex_me', JSON.stringify({ player: me.claim?.status === 'approved' ? me.claim.player : null }));
      go(location.hash.slice(1) || 'me', false);
    } catch (e) { panel.innerHTML = `<div class="card"><p>⚠️ ${esc(e.message)}</p></div>`; }
  })();
})();
