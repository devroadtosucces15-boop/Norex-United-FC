// Interactivity for the static pages. Everything is progressive enhancement: pages work without it.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const BASE = document.body.dataset.base || '';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Feature flags (P0.7): config.json → features, levels off | owner | managers | members | public.
// Parts marked [data-flag="name"] only show for roles the flag unlocks. Hiding is cosmetic – the Worker enforces.
const FLAGS = (() => { try { return JSON.parse(document.body.dataset.features || '{}'); } catch { return {}; } })();
const FLAG_MIN = { public: 0, members: 1, managers: 3, owner: 4 };
const RANK = { guest: 0, member: 1, claimed: 2, manager: 3, owner: 4 };
const flagOn = (name, role = 'guest') => FLAGS[name] in FLAG_MIN && (RANK[role] ?? 0) >= FLAG_MIN[FLAGS[name]];
const applyFlags = (role) => $$('[data-flag]').forEach((el) => { el.hidden = !flagOn(el.dataset.flag, role); });
applyFlags('guest');
let viewerRole = 'guest'; // set by the members block after login
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
// Stat drill-downs (P1.1): ?f=won opens that tab; switching tabs updates the URL so it can be shared.
$$('[data-drill]').forEach((g) => {
  const want = new URLSearchParams(location.search).get('f');
  $(`button[data-tab="f-${CSS.escape(want || '')}"]`, g)?.click();
  g.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (b) history.replaceState(null, '', `?f=${b.dataset.tab.slice(2)}${location.hash}`);
  });
});

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
UI.refreshTimes();

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
  const toast = (msg, bad) => UI.toast(msg, bad ? 'bad' : 'ok');
  // Role badge (tiers from bot/roles.js). Sessions from before roles existed only carry `adm`.
  const ROLE = { owner: ['👑 Owner', 'owner'], manager: ['🛡️ Manager', 'home'], claimed: ['✅ Verified player', 'ok'], member: ['NOREX member', ''] };
  const roleTag = (r) => { const [l, c] = ROLE[r] || ROLE.member; return `<span class="tag ${c}">${l}</span>`; };
  const baseRole = session && (session.role ?? (session.adm ? 'manager' : 'member'));
  const ago = UI.time;
  if (session) { applyFlags(baseRole); viewerRole = baseRole; }
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
<a href="${hub}#availability">📅 Availability</a><a href="${hub}#votes">⭐ MOTM votes</a>${flagOn('rushLog', baseRole) ? `<a href="${hub}#rush">⚡ Log Rush result</a>` : ''}${session.adm ? `<a href="${hub}#manager">🛡️ Manager portal</a>` : ''}
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
  const S = { tab: 'me', me: null, players: [], clubs: [], pub: {}, avail: null, votes: null, rush: null, admin: null, adminTab: 'claims', sel: new Set() };
  const TABS = [['me', '👤 My NOREX'], ['availability', '📅 Availability'], ['votes', '⭐ MOTM votes'], ...(flagOn('rushLog', baseRole) ? [['rush', '⚡ Rush']] : []), ...(session.adm ? [['manager', '🛡️ Manager']] : [])];

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
      if ((tab === 'rush' || tab === 'manager') && flagOn('rushLog', baseRole)) S.rush = await call('/api/rush/queue');
      if (tab === 'manager') S.admin = await call('/api/admin/overview');
      if (tab === S.tab) draw();
    } catch (e) { toast(e.message, true); }
  }
  const draw = () => { panel.innerHTML = ({ me: viewMe, availability: viewAvail, votes: viewVotes, rush: viewRush, manager: viewManager }[S.tab])(); bind(); };

  // ----- My NOREX -----
  function viewMe() {
    if (!S.me) return UI.skeleton('profile');
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
    if (!S.avail) return UI.skeleton('cards', 4);
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
    if (!S.votes) return UI.skeleton('cards', 3);
    return `<p class="muted small">Pick one player per match. Tap another name to change your vote, or tap your pick again to remove it.</p><div class="votes">${S.votes.matches.map((m) => {
      const max = Math.max(1, ...Object.values(m.tally));
      return `<div class="card vote"><div class="vote-head">${pill(m.res)} <b>${m.gf}–${m.ga} vs ${esc(m.opp)}</b><small class="muted">${m.total} vote${m.total === 1 ? '' : 's'}</small></div>
<ul>${[...m.players].sort((a, b) => (m.tally[b.k] || 0) - (m.tally[a.k] || 0) || b.r - a.r).map((p) => `<li class="${m.mine === p.k ? 'mine' : ''}" style="--w:${((m.tally[p.k] || 0) / max) * 100}%"><button type="button" data-m="${m.id}" data-p="${esc(p.k)}">${m.mine === p.k ? '✔ ' : ''}${esc(p.n)} <small>${Number(p.r).toFixed(1)}</small></button><b>${m.tally[p.k] || 0}</b></li>`).join('')}</ul></div>`;
    }).join('') || UI.empty({ icon: '⚽', title: 'No recent matches', text: 'Votes open after our next league or playoff game.' })}</div>`;
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

  // ----- Rush logging (P0.4): members submit, managers confirm -----
  const RSTAT = { pending: ['⏳ Waiting for a manager', ''], confirmed: ['✅ Confirmed', 'home'], rejected: ['⛔ Rejected', ''], removed: ['🗑 Removed', ''] };
  const rushTitle = (m) => `${pill(m.res)} <b>${m.gf}–${m.ga} vs ${esc(m.opp)}</b> <small class="muted">${esc(fmtDay(m.date))}</small>`;
  const rushPlayers = (m) => `<ul class="rush-ps">${m.players.map((p) => `<li><b>${esc(p.n)}</b>${p.k ? '' : ' <small class="muted">guest</small>'}${p.pos ? ` <span class="tag">${esc(p.pos)}</span>` : ''} ${p.g ? `⚽${p.g > 1 ? `×${p.g}` : ''} ` : ''}${p.a ? `🎯${p.a > 1 ? `×${p.a}` : ''} ` : ''}${p.r ? `<small>${Number(p.r).toFixed(1)}</small>` : ''}${p.motm ? ' ⭐' : ''}</li>`).join('')}</ul>
${m.shot || m.note ? `<p class="small muted">${m.note ? esc(m.note) : ''}${m.shot && m.note ? ' · ' : ''}${m.shot ? `<a href="${esc(m.shot)}" target="_blank" rel="noopener nofollow ugc">📷 Screenshot</a>` : ''}</p>` : ''}`;
  const rushRow = (i, pre = {}) => {
    const squad = S.players.filter((p) => p.home).sort((a, b) => a.n.localeCompare(b.n));
    return `<div class="rush-row" data-row="${i}"><select data-f="k" aria-label="Player ${i + 1}"><option value="">${i ? '– empty –' : 'Choose player…'}</option>${squad.map((p) => `<option value="${esc(p.k)}"${pre.k === p.k ? ' selected' : ''}>${esc(p.n)}</option>`).join('')}<option value="__guest">Guest (not in squad)…</option></select>
<input data-f="n" placeholder="Guest name" maxlength="40" hidden aria-label="Guest name">
<select data-f="pos" aria-label="Position"><option value="">Pos</option>${POS.map((x) => `<option${pre.pos === x ? ' selected' : ''}>${x}</option>`).join('')}</select>
<label>G<input data-f="g" type="number" min="0" max="40" value="0" inputmode="numeric"></label><label>A<input data-f="a" type="number" min="0" max="40" value="0" inputmode="numeric"></label>
<label>Rating<input data-f="r" type="number" min="1" max="10" step="0.1" placeholder="–" inputmode="decimal"></label><label class="motm" data-tip="Man of the match"><input type="radio" name="rush-motm" data-f="motm">⭐</label></div>`;
  };
  function viewRush() {
    if (!S.rush) return UI.skeleton('cards', 2);
    const claim = S.me?.claim?.status === 'approved' ? S.me.claim.player : '';
    const myPos = S.me?.profile?.positions?.[0] || '';
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const mine = S.rush.mine;
    const waiting = S.rush.pending?.length || 0;
    return `<div class="grid2 rush-hub"><form class="card rush-form" id="rush-form" novalidate><h3>⚡ Log a Rush result</h3>
<p class="muted small">EA doesn't share Rush matches, so we log them ourselves. ${S.rush.canConfirm ? 'As a manager, your result counts straight away.' : 'A manager checks it, then it shows on the Matches, player and Stats pages.'}</p>
<div class="rush-top"><label class="fld">Date<input type="date" id="rf-date" value="${today}" max="${today}" required></label>
<label class="fld">Opponent<input id="rf-opp" list="rf-clubs" maxlength="60" placeholder="Club name" autocomplete="off" required></label><datalist id="rf-clubs">${S.clubs.map((c) => `<option value="${esc(c.n)}">`).join('')}</datalist></div>
<div class="rush-score"><label>NOREX<input type="number" id="rf-gf" min="0" max="40" inputmode="numeric" required></label><i>–</i><label>Them<input type="number" id="rf-ga" min="0" max="40" inputmode="numeric" required></label></div>
<label class="fld">Our players <small>(up to 5 · goals, assists, rating optional)</small></label><div class="rush-rows">${[0, 1, 2, 3, 4].map((i) => rushRow(i, i ? {} : { k: claim, pos: myPos })).join('')}</div>
<label class="fld">Screenshot link <small>(optional)</small><input type="url" id="rf-shot" maxlength="300" placeholder="https://…"></label>
<label class="fld">Note <small>(optional)</small><input id="rf-note" maxlength="200" placeholder="Anything worth remembering"></label>
<button class="btn" type="submit" id="rf-send">${S.rush.canConfirm ? '✅ Save result' : '📨 Send for confirmation'}</button></form>
<div class="card"><h3>My Rush results</h3>${S.rush.canConfirm && waiting ? `<p><button class="btn ghost sm" type="button" data-go-rush>🛡️ ${waiting} waiting for confirmation →</button></p>` : ''}
${mine.length ? `<div class="rush-list">${mine.map((m) => `<div class="rush-item st-${m.status}"><div class="vote-head">${rushTitle(m)}</div>${rushPlayers(m)}
<div class="row"><span class="tag ${RSTAT[m.status][1]}">${RSTAT[m.status][0]}</span><small class="muted">${m.decidedBy && m.status !== 'pending' ? `${esc(m.decidedBy)} · ${ago(m.decidedAt)}` : `sent ${ago(m.at)}`}</small>${m.status === 'pending' ? `<button class="btn ghost sm" type="button" data-rush="withdraw" data-id="${m.id}">Withdraw</button>` : ''}</div></div>`).join('')}</div>`
    : UI.empty({ icon: '⚡', title: 'Nothing logged yet', text: 'Played Rush tonight? Log the result and it counts once a manager confirms it.' })}
<p class="small"><a href="${BASE}matches/index.html#rush">See all Rush results →</a></p></div></div>`;
  }
  function readRushForm() {
    const v = (id) => $(id).value.trim();
    const players = $$('.rush-row').map((row) => {
      const f = (k) => $(`[data-f="${k}"]`, row);
      const k = f('k').value;
      if (!k) return null;
      return { ...(k === '__guest' ? { n: f('n').value.trim() } : { k }), pos: f('pos').value, g: +f('g').value || 0, a: +f('a').value || 0, r: f('r').value === '' ? null : +f('r').value, motm: f('motm').checked };
    }).filter(Boolean);
    return { date: v('#rf-date'), opponent: v('#rf-opp'), gf: v('#rf-gf') === '' ? null : +v('#rf-gf'), ga: v('#rf-ga') === '' ? null : +v('#rf-ga'), shot: v('#rf-shot'), note: v('#rf-note'), players };
  }
  async function sendRush(body) {
    const btn = $('#rf-send');
    btn.disabled = true;
    try {
      const r = await call('/api/rush', body);
      S.rush = r;
      draw();
      toast(r.status === 'confirmed' ? 'Rush result saved' : 'Sent – a manager will confirm it');
    } catch (e) {
      btn.disabled = false;
      if (/already logged/.test(e.message) && (await UI.confirm({ title: 'Already logged?', text: `${e.message}`, ok: 'Log it anyway' }))) return sendRush({ ...body, force: true });
      toast(e.message, true);
    }
  }
  async function decideRush(id, action) {
    const all = [...S.rush.mine, ...(S.rush.pending || []), ...(S.rush.recent || [])];
    const m = all.find((x) => x.id === id);
    if (!m) return;
    if (action !== 'confirm' && !(await UI.confirm({ title: { reject: 'Reject this result?', remove: 'Remove this result?', withdraw: 'Withdraw your result?' }[action], text: `${m.gf}–${m.ga} vs ${m.opp} (${fmtDay(m.date)}).${action === 'remove' ? ' It stops counting on the Matches, player and Stats pages.' : ''}`, ok: { reject: 'Reject', remove: 'Remove', withdraw: 'Withdraw' }[action], danger: true }))) return;
    const prev = S.rush;
    // optimistic: move it out of the queue
    S.rush = { ...prev, mine: action === 'withdraw' ? prev.mine.filter((x) => x.id !== id) : prev.mine, pending: (prev.pending || []).filter((x) => x.id !== id),
      recent: action === 'withdraw' ? prev.recent : [{ ...m, status: { confirm: 'confirmed', reject: 'rejected', remove: 'removed' }[action], decidedBy: session.n, decidedAt: Date.now() }, ...(prev.recent || []).filter((x) => x.id !== id)] };
    draw();
    try {
      S.rush = await call('/api/rush/decide', { id, action });
      if (S.admin) S.admin.activity.unshift({ at: Date.now(), u: session.u, n: session.n, a: session.a, type: `rush-${{ confirm: 'confirmed', reject: 'rejected', remove: 'removed', withdraw: 'withdraw' }[action]}`, detail: `${m.gf}–${m.ga} vs ${m.opp} · ${m.date}` });
      draw();
      toast({ confirm: 'Confirmed – it counts now', reject: 'Rejected', remove: 'Removed', withdraw: 'Withdrawn' }[action]);
    } catch (e) { S.rush = prev; draw(); toast(e.message, true); }
  }

  // ----- Manager portal -----
  const ACT = { login: '🔑', claim: '🪪', 'claim-cancel': '↩', 'claim-approved': '✅', 'claim-rejected': '⛔', 'claim-unlinked': '🔓', profile: '✏️', availability: '📅', vote: '⭐', 'vote-remove': '☆', 'rush-submit': '⚡', 'rush-logged': '⚡', 'rush-confirmed': '✅', 'rush-rejected': '⛔', 'rush-removed': '🗑', 'rush-withdraw': '↩' };
  const ACT_TXT = { login: 'logged in', claim: 'claimed', 'claim-cancel': 'cancelled their claim', 'claim-approved': 'approved claim', 'claim-rejected': 'rejected claim', 'claim-unlinked': 'unlinked', profile: 'updated profile', availability: 'set availability', vote: 'voted MOTM', 'vote-remove': 'removed MOTM vote', 'rush-submit': 'sent a Rush result', 'rush-logged': 'logged a Rush result', 'rush-confirmed': 'confirmed Rush result', 'rush-rejected': 'rejected Rush result', 'rush-removed': 'removed Rush result', 'rush-withdraw': 'withdrew a Rush result' };
  const FLAG_ICON = { off: '⛔', owner: '👑', managers: '🛡️', members: '👥', public: '🌍' };
  const FLAG_WHO = { off: 'Nobody', owner: 'Owner only', managers: 'Managers + owner', members: 'Every logged-in member', public: 'Everyone, no login needed' };
  function viewManager() {
    if (!S.admin) return UI.skeleton('rows', 5);
    const A = S.admin;
    const claims = Object.entries(A.claims).map(([user, c]) => ({ user, ...c }));
    const pending = claims.filter((c) => c.status === 'pending');
    const decided = claims.filter((c) => c.status !== 'pending').sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0));
    const users = Object.entries(A.users).sort(([, a], [, b]) => b.last - a.last);
    // Member chip with hover card: claimed player + role from the admin overview.
    const mem = (id, u, sub, size = 26) => { const c = A.claims[id]; const pl = c?.status === 'approved' ? c : null; return UI.member({ id, n: u.n, a: u.a, sub: sub ?? (pl ? `🪪 ${pl.playerName}` : ''), player: pl?.player }, { size }); };
    const rq = S.rush?.pending || [];
    const sub = [['claims', `Claims${pending.length ? ` (${pending.length})` : ''}`], ...(flagOn('rushLog', baseRole) ? [['rush', `⚡ Rush${rq.length ? ` (${rq.length})` : ''}`]] : []), ['members', `Members (${users.length})`], ['week', 'Squad week'], ['votes', 'Votes'], ['activity', 'Activity'], ...(A.flags ? [['flags', '🚩 Flags']] : [])];
    if (!sub.some(([k]) => k === S.adminTab)) S.adminTab = 'claims';
    const body = {
      claims: () => `<h3>Waiting for approval</h3>${pending.length ? `<div class="claim-list">${pending.map((c) => `<div class="claim-row card"><img src="${esc(c.a)}" alt=""><div><b>${esc(c.n)}</b> wants <a href="${BASE}players/${encodeURIComponent(c.player)}.html">${esc(c.playerName)}</a><small class="muted">${ago(c.at)}</small></div><div class="row"><button class="btn sm" data-claim="approve" data-u="${c.user}" type="button">Approve</button><button class="btn ghost sm" data-claim="reject" data-u="${c.user}" type="button">Reject</button></div></div>`).join('')}</div>` : UI.empty({ icon: '🎉', title: 'Nothing waiting', text: 'New player claims show up here for approval.' })}
<h3 style="margin-top:24px">History</h3>${decided.length ? `<div class="tbl"><table><thead><tr><th>Member</th><th>Player</th><th>Status</th><th>By</th><th>When</th><th></th></tr></thead><tbody>${decided.map((c) => `<tr><td>${mem(c.user, c)}</td><td><a href="${BASE}players/${encodeURIComponent(c.player)}.html">${esc(c.playerName)}</a></td><td><span class="tag${c.status === 'approved' ? ' home' : ''}">${esc(c.status)}</span></td><td>${esc(c.decidedBy || '–')}</td><td>${c.decidedAt ? ago(c.decidedAt) : '–'}</td><td>${c.status === 'approved' ? `<button class="btn ghost sm" data-claim="unlink" data-u="${c.user}" type="button">Unlink</button>` : `<button class="btn ghost sm" data-claim="approve" data-u="${c.user}" type="button">Approve</button>`}</td></tr>`).join('')}</tbody></table></div>` : UI.empty({ icon: '🗂️', title: 'No decisions yet' })}`,
      rush: () => `<h3>Waiting for confirmation</h3>${rq.length ? `<div class="rush-list">${rq.map((m) => `<div class="rush-item card"><div class="vote-head">${rushTitle(m)}</div>${rushPlayers(m)}
<div class="row">${UI.member({ id: m.by.id, n: m.by.n, a: m.by.a, sub: `logged ${UI.ago(m.at)}` }, { size: 24 })}<span class="grow"></span><button class="btn sm" type="button" data-rush="confirm" data-id="${m.id}">✅ Confirm</button><button class="btn ghost sm" type="button" data-rush="reject" data-id="${m.id}">Reject</button></div></div>`).join('')}</div>`
    : UI.empty({ icon: '🎉', title: 'Nothing waiting', text: 'Rush results sent by members show up here for a quick check.' })}
<h3 style="margin-top:24px">Last 30 days</h3>${S.rush?.recent?.length ? `<div class="tbl"><table><thead><tr><th>Match</th><th>Logged by</th><th>Status</th><th>By</th><th>When</th><th></th></tr></thead><tbody>${S.rush.recent.map((m) => `<tr><td>${pill(m.res)} ${m.gf}–${m.ga} vs ${esc(m.opp)} <small class="muted">${esc(m.date)}</small></td><td>${esc(m.by.n || '–')}</td><td><span class="tag ${RSTAT[m.status][1]}">${esc(m.status)}</span></td><td>${esc(m.decidedBy || '–')}</td><td>${m.decidedAt ? ago(m.decidedAt) : '–'}</td><td>${m.status === 'confirmed' ? `<button class="btn ghost sm" type="button" data-rush="remove" data-id="${m.id}">Remove</button>` : m.status === 'rejected' ? `<button class="btn ghost sm" type="button" data-rush="confirm" data-id="${m.id}">Confirm</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : UI.empty({ icon: '🗂️', title: 'No decisions yet' })}`,
      members: () => `<div class="tbl"><table><thead><tr><th>Member</th><th>Role</th><th>Player</th><th>Positions</th><th>Platform</th><th>This week</th><th class="n">Logins</th><th>Last seen</th></tr></thead><tbody>${users.map(([id, u]) => {
        const c = A.claims[id], pf = A.profiles[id] || {};
        return `<tr><td>${mem(id, u, u.tag ? `@${u.tag}` : '')}</td><td>${roleTag(u.role === 'member' || !u.role ? (u.admin ? 'manager' : c?.status === 'approved' ? 'claimed' : 'member') : u.role)}</td><td>${c ? `${esc(c.playerName)} <small class="muted">(${esc(c.status)})</small>` : '–'}</td><td>${esc((pf.positions || []).join(' / ') || '–')}</td><td>${esc(pf.platform || '–')}</td><td class="wk">${A.availability.map((d) => `<span data-tip="${esc(fmtDay(d.date))}">${ICON[d.byUser[id]?.s] || '·'}</span>`).join('')}</td><td class="n">${u.logins || 1}</td><td>${ago(u.last)}</td></tr>`;
      }).join('')}</tbody></table></div>`,
      week: () => `<div class="tbl"><table class="grid-week"><thead><tr><th>Member</th>${A.availability.map((d) => `<th>${esc(fmtDay(d.date))}</th>`).join('')}</tr></thead><tbody>${users.map(([id, u]) => `<tr><td>${mem(id, u)}</td>${A.availability.map((d) => `<td class="c s-${d.byUser[id]?.s || 'none'}">${ICON[d.byUser[id]?.s] || ''}</td>`).join('')}</tr>`).join('')}
<tr class="tot"><td><b>Available</b></td>${A.availability.map((d) => { const v = Object.values(d.byUser); return `<td class="c"><b>${v.filter((x) => x.s === 'yes').length}</b><small> +${v.filter((x) => x.s === 'maybe').length}?</small></td>`; }).join('')}</tr></tbody></table></div>`,
      votes: () => `<div class="votes">${A.votes.map((m) => `<div class="card vote"><div class="vote-head">${pill(m.res)} <b>${m.gf}–${m.ga} vs ${esc(m.opp)}</b><small class="muted">${m.voters.length} votes</small></div>${m.voters.length ? `<ul class="voters">${m.voters.map((v) => `<li><img class="av" src="${esc(v.a)}" alt=""> ${esc(v.n)} → <b>${esc(v.pn || '?')}</b></li>`).join('')}</ul>` : '<p class="muted">No votes yet.</p>'}</div>`).join('')}</div>`,
      activity: () => `<div class="row" style="margin-bottom:12px"><select id="act-filter"><option value="">Everyone</option>${users.map(([id, u]) => `<option value="${id}"${S.actFilter === id ? ' selected' : ''}>${esc(u.n)}</option>`).join('')}</select></div>
<ul class="feed">${A.activity.filter((a) => !S.actFilter || a.u === S.actFilter).map((a) => `<li><span class="ic">${ACT[a.type] || '•'}</span><div>${mem(a.u, a, '', 22)} ${ACT_TXT[a.type] || esc(a.type)}${a.detail ? ` <span class="muted">${esc(a.detail)}</span>` : ''}</div><small class="muted">${ago(a.at)}</small></li>`).join('') || `<li>${UI.empty({ icon: '📜', title: 'No activity yet', text: S.actFilter ? 'This member has not done anything yet.' : '' })}</li>`}</ul>`,
      // Owner only: read-only view of the live flags (the Worker's copy). Change them in config.json → features.
      flags: () => `<h3>🚩 Feature flags</h3><p class="muted small">New features start as <b>Owner</b> (only you see them) and get switched on at the QA checkpoints. Levels: off · owner · managers · members · public.</p>
${Object.keys(A.flags).length ? `<div class="tbl"><table><thead><tr><th>Feature</th><th>Level</th><th>Who sees it</th><th>Site copy</th></tr></thead><tbody>${Object.entries(A.flags).map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${UI.pill(v, { emoji: FLAG_ICON[v], tone: v === 'public' ? 'win' : v === 'off' ? 'loss' : v === 'owner' ? 'gold' : 'draw' })}</td><td>${esc(FLAG_WHO[v] || '–')}</td><td>${FLAGS[k] === v ? '✅' : `<span class="tag" data-tip="The site updates on its next build">${esc(FLAGS[k] || 'missing')}</span>`}</td></tr>`).join('')}</tbody></table></div>` : UI.empty({ icon: '🚩', title: 'No flags yet' })}`,
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
      S.admin.activity.unshift({ at: Date.now(), u: session.u, n: session.n, a: session.a, type: `claim-${c.status}`, detail: `${c.n} → ${c.playerName}` });
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
      if (d.rush) decideRush(+d.id, d.rush);
      if (d.goRush !== undefined) { e.preventDefault(); S.adminTab = 'rush'; go('manager'); }
      if (d.sub) { S.adminTab = d.sub; draw(); }
      if (d.refresh !== undefined) { S.admin = null; draw(); load('manager'); }
      if (d.claim) {
        const c = S.admin.claims[d.u];
        if (d.claim !== 'approve' && !(await UI.confirm({ title: d.claim === 'unlink' ? 'Unlink player?' : 'Reject claim?', text: `${c.n} → ${c.playerName}. ${d.claim === 'unlink' ? 'They lose the verified badge until a manager approves again.' : 'They can send a new claim afterwards.'}`, ok: d.claim === 'unlink' ? 'Unlink' : 'Reject', danger: true }))) return;
        decide(d.u, d.claim);
      }
    };
    panel.onchange = (e) => {
      if (e.target.id === 'act-filter') { S.actFilter = e.target.value; draw(); }
      if (e.target.dataset.f === 'k') { const g = $('[data-f="n"]', e.target.parentElement); g.hidden = e.target.value !== '__guest'; if (!g.hidden) g.focus(); }
    };
    const rf = $('#rush-form', panel);
    if (rf) rf.onsubmit = (e) => { e.preventDefault(); sendRush(readRushForm()); };
  }

  // ----- start -----
  (async () => {
    try {
      const [me, [players, clubs], pub] = await Promise.all([call('/api/me'), api(), fetch(`${MAPI}/api/public`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ claims: {} }))]);
      S.me = me; S.players = players; S.clubs = clubs; S.pub = pub.claims || {};
      $('#role-tag').innerHTML = roleTag(me.user.role);
      ls.set('norex_me', JSON.stringify({ player: me.claim?.status === 'approved' ? me.claim.player : null }));
      go(location.hash.slice(1) || 'me', false);
    } catch (e) { panel.innerHTML = `<div class="card"><p>⚠️ ${esc(e.message)}</p></div>`; }
  })();
})();

// ================= League ⇄ Rush (P0.4) =================
// Any `[data-modes]` block (built by modes() in build.mjs) gets a switch; the choice is remembered and shared by
// every switch on the page. Rush views are drawn from confirmed results in the member API (`/api/rush`).
if (MAPI && $('[data-modes]')) (() => {
  const KEY = 'norex_mode';
  const saved = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  let mode = /^#rush-\d+$/.test(location.hash) || saved === 'rush' ? 'rush' : 'league';
  let data;
  const load = () => (data ??= Promise.all([fetch(`${MAPI}/api/rush`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Error ${r.status}`)))), api()])
    .then(([d, [players]]) => ({ matches: d.matches || [], known: new Set(players.map((p) => p.k)) })));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const rc = (r) => (r >= 9 ? 'r-elite' : r >= 8 ? 'r-great' : r >= 7 ? 'r-good' : r >= 6 ? 'r-mid' : 'r-low');
  const rp = (r) => `<span class="rp ${r ? rc(r) : ''}">${r ? Number(r).toFixed(1) : '–'}</span>`;
  const res = (r) => `<span class="res ${r}">${r}</span>`;
  const day = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const stat = (label, v, dec = 0, suf = '') => `<div class="stat"><span>${label}</span><b class="count" data-to="${v}" data-dec="${dec}" data-suffix="${suf}">${Number(v).toFixed(dec)}${suf}</b></div>`;
  const statText = (label, t) => `<div class="stat"><span>${label}</span><b>${t}</b></div>`;
  const sec = (title, body, sub = '') => `<section class="block"><h2 class="banner-h">${title}${sub ? ` <small>${sub}</small>` : ''}</h2>${body}</section>`;
  const logUrl = `${BASE}members.html#rush`;
  const empty = (title, text) => UI.empty({ icon: '⚡', title, text, action: `<a class="btn sm" href="${logUrl}">⚡ Log a Rush result</a>` });
  const who = (p, known) => (p.k && known.has(p.k) ? `<a href="${BASE}players/${encodeURIComponent(p.k)}.html">${esc(p.n)}</a>` : `${esc(p.n)}${p.k ? '' : ' <small class="muted">guest</small>'}`);
  const oppHtml = (m) => (m.oppId ? `<a href="${BASE}clubs/${encodeURIComponent(m.oppId)}.html">${esc(m.opp)}</a>` : esc(m.opp));

  // Per-player totals over the given matches (squad players only – guests have no key).
  function totals(matches) {
    const P = new Map();
    for (const m of matches) for (const p of m.players) {
      if (!p.k) continue;
      const e = P.get(p.k) ?? { k: p.k, n: p.n, apps: 0, W: 0, D: 0, L: 0, g: 0, a: 0, rs: [], motm: 0 };
      e.apps++; e[m.res]++; e.g += p.g; e.a += p.a; e.motm += p.motm ? 1 : 0; if (p.r) e.rs.push(p.r); e.n = p.n;
      P.set(p.k, e);
    }
    return [...P.values()].map((e) => ({ ...e, r: avg(e.rs) }));
  }
  const record = (ms) => ({ p: ms.length, W: ms.filter((m) => m.res === 'W').length, D: ms.filter((m) => m.res === 'D').length, L: ms.filter((m) => m.res === 'L').length, gf: ms.reduce((s, m) => s + m.gf, 0), ga: ms.reduce((s, m) => s + m.ga, 0) });

  const fixture = (m, known, open) => `<details class="rfx ${m.res}" id="rush-${m.id}"${open ? ' open' : ''}><summary>
<span class="fx-date">${day(m.date)}</span>${res(m.res)}<span class="fx-team"><img class="crest" src="${BASE}assets/crest.png" width="28" height="28" alt=""><span>NOREX</span></span>
<span class="fx-score">${m.gf}<i>–</i>${m.ga}</span><span class="fx-team away"><span>${esc(m.opp)}</span><span class="rush-badge" aria-hidden="true">⚡</span></span>
<span class="fx-extra">${m.players.filter((p) => p.g).map((p) => `⚽ ${esc(p.n)}${p.g > 1 ? ` ×${p.g}` : ''}`).join(', ')}</span></summary>
<div class="rfx-body"><div class="tbl"><table><thead><tr><th>Player</th><th>Pos</th><th class="n">Rating</th><th class="n">G</th><th class="n">A</th><th>MOTM</th></tr></thead><tbody>${m.players.map((p) => `<tr><td>${who(p, known)}</td><td>${esc(p.pos || '–')}</td><td class="n">${rp(p.r)}</td><td class="n">${p.g}</td><td class="n">${p.a}</td><td>${p.motm ? '⭐' : ''}</td></tr>`).join('')}</tbody></table></div>
<p class="small muted">vs ${oppHtml(m)}${m.note ? ` · ${esc(m.note)}` : ''}${m.shot ? ` · <a href="${esc(m.shot)}" target="_blank" rel="noopener nofollow ugc">📷 Screenshot</a>` : ''}</p></div></details>`;

  const views = {
    matches({ matches, known }) {
      if (!matches.length) return empty('No Rush results yet', 'Members log Rush matches in the Squad Hub and a manager confirms them. They show up here straight away.');
      const R = record(matches);
      const open = location.hash.slice(1);
      return `<section class="stats">${stat('Played', R.p)}${stat('Won', R.W)}${stat('Drawn', R.D)}${stat('Lost', R.L)}${stat('Win rate', pct(R.W, R.p), 0, '%')}${stat('Goals', R.gf)}${stat('Conceded', R.ga)}${stat('Goal diff', R.gf - R.ga)}</section>
<div class="form big"><span class="form-label">Form</span>${matches.slice(0, 10).reverse().map((m) => `<a href="#rush-${m.id}" data-tip="${esc(`${m.gf}–${m.ga} vs ${m.opp}`)}">${res(m.res)}</a>`).join('')}</div>
${sec('Rush results', `<div class="fixtures">${matches.map((m) => fixture(m, known, open === `rush-${m.id}`)).join('')}</div>`, `${matches.length} confirmed`)}
<p><a class="btn ghost" href="${logUrl}">⚡ Log a Rush result</a></p>`;
    },
    player({ matches, known }, key) {
      const ms = matches.filter((m) => m.players.some((p) => p.k === key));
      if (!ms.length) return empty('No Rush games logged yet', 'Rush results with this player appear here once a manager confirms them.');
      const e = totals(ms).find((x) => x.k === key);
      const row = (m) => { const p = m.players.find((x) => x.k === key); return `<tr><td>${m.date}</td><td>${res(m.res)}</td><td><a href="${BASE}matches/index.html#rush-${m.id}">${m.gf}–${m.ga}</a></td><td>${oppHtml(m)}</td><td>${esc(p.pos || '–')}</td><td class="n">${rp(p.r)}${p.motm ? ' ⭐' : ''}</td><td class="n">${p.g}</td><td class="n">${p.a}</td></tr>`; };
      return `${sec('Rush', `<section class="stats">${stat('Apps', e.apps)}${statText('Record', `${e.W}-${e.D}-${e.L}`)}${stat('Goals', e.g)}${stat('Assists', e.a)}${stat('Avg rating', e.r, 1)}${stat('MOTM', e.motm)}${stat('G+A per game', (e.g + e.a) / e.apps, 2)}${stat('Win rate', pct(e.W, e.apps), 0, '%')}</section>`, 'logged by members')}
${sec('Rush match log', `<div class="tbl"><table><thead><tr><th>Date</th><th>Res</th><th>Score</th><th>Against</th><th>Pos</th><th class="n">Rating</th><th class="n">G</th><th class="n">A</th></tr></thead><tbody>${ms.map(row).join('')}</tbody></table></div>`, `${ms.length} games`)}`;
    },
    // Stat drill-down (P1.1) for Rush: same filters as the League page, from confirmed results.
    results({ matches, known }) {
      if (!matches.length) return empty('No Rush results yet', 'Once Rush results are confirmed, every stat drills down here too.');
      const F = [['played', '📋 Played', () => true], ['won', '✅ Won', (m) => m.res === 'W'], ['drawn', '🤝 Drawn', (m) => m.res === 'D'], ['lost', '❌ Lost', (m) => m.res === 'L'],
        ['goals', '⚽ Goals', (m) => m.gf > 0], ['conceded', '🥅 Conceded', (m) => m.ga > 0], ['cleansheets', '🧤 Clean sheets', (m) => m.ga === 0], ['winrate', '📈 Win rate', () => true]];
      const want = new URLSearchParams(location.search).get('f');
      const cur = F.some(([k]) => k === want) ? want : 'played';
      const R = record(matches);
      const T = totals(matches);
      const board = (f, title) => { const rows = T.map((e) => ({ e, v: f(e) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 8); const max = Math.max(1, ...rows.map((x) => x.v));
        return `<div class="card"><h3>${title}</h3><ol class="barlist">${rows.map(({ e, v }, i) => `<li style="--w:${Math.max(4, (v / max) * 100)}%"><span class="bl-rank">${i + 1}</span><span class="bl-name">${who(e, known)}</span><b>${v}</b></li>`).join('') || '<li class="muted">No data yet</li>'}</ol></div>`; };
      const extra = { goals: `<div class="grid2">${board((e) => e.g, '⚽ Rush scorers')}${board((e) => e.a, '🎯 Rush assists')}</div>`,
        winrate: `<section class="stats">${stat('Played', R.p)}${stat('Win rate', pct(R.W, R.p), 0, '%')}${statText('Record', `${R.W}-${R.D}-${R.L}`)}${stat('Goal diff', R.gf - R.ga)}</section>` };
      return `${UI.tabsHtml(F.map(([k, l]) => [k, l]), cur, 'rush-drill')}${F.map(([k, , f]) => { const ms = matches.filter(f);
        return `<div class="rush-drill-panel" data-f="${k}"${k === cur ? '' : ' hidden'}>${extra[k] ?? ''}${ms.length ? `<div class="fixtures">${ms.map((m) => fixture(m, known)).join('')}</div>` : UI.empty({ icon: '📭', title: 'Nothing here yet', text: 'No confirmed Rush games match this filter.' })}</div>`; }).join('')}`;
    },
    leaders({ matches, known }) {
      if (!matches.length) return empty('No Rush stats yet', 'Leaderboards, records and head-to-heads fill in as Rush results are confirmed.');
      const T = totals(matches);
      const min3 = (e, v) => (e.apps >= 3 ? v : 0);
      const boards = [['Goals', (e) => e.g], ['Assists', (e) => e.a], ['G+A', (e) => e.g + e.a], ['Rating', (e) => min3(e, e.r), (v) => v.toFixed(1)], ['MOTM', (e) => e.motm],
        ['Games', (e) => e.apps], ['Goals/game', (e) => min3(e, e.g / e.apps), (v) => v.toFixed(2)], ['Win %', (e) => min3(e, pct(e.W, e.apps)), (v) => v + '%']];
      const bars = (f, fmt = (v) => v) => {
        const rows = T.map((e) => ({ e, v: f(e) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 10);
        const max = Math.max(0.0001, ...rows.map((x) => x.v));
        return `<ol class="barlist">${rows.map(({ e, v }, i) => `<li style="--w:${Math.max(4, (v / max) * 100)}%"><span class="bl-rank">${i + 1}</span><span class="bl-name">${who(e, known)}</span><b>${fmt(v)}</b></li>`).join('') || '<li class="muted">Needs 3+ Rush games</li>'}</ol>`;
      };
      const apps = matches.flatMap((m) => m.players.map((p) => ({ m, p })));
      const best = (f) => [...apps].sort((a, b) => f(b.p) - f(a.p))[0];
      const margin = (m) => m.gf - m.ga;
      const byMargin = [...matches].sort((a, b) => margin(b) - margin(a));
      let run = 0, bestRun = 0;
      for (const m of [...matches].reverse()) { run = m.res === 'W' ? run + 1 : 0; bestRun = Math.max(bestRun, run); }
      const rec = (icon, title, value, sub, m) => `<a class="record"${m ? ` href="${BASE}matches/index.html#rush-${m.id}"` : ''}><span class="rec-icon">${icon}</span><small>${title}</small><b>${value}</b><span>${sub}</span></a>`;
      const hat = apps.filter((x) => x.p.g >= 3);
      const recs = [
        margin(byMargin[0]) > 0 && rec('💥', 'Biggest win', `${byMargin[0].gf}–${byMargin[0].ga}`, `vs ${esc(byMargin[0].opp)}`, byMargin[0]),
        margin(byMargin.at(-1)) < 0 && rec('🧊', 'Heaviest defeat', `${byMargin.at(-1).gf}–${byMargin.at(-1).ga}`, `vs ${esc(byMargin.at(-1).opp)}`, byMargin.at(-1)),
        ...[['⚽', 'Most goals in a match', 'g'], ['🎯', 'Most assists in a match', 'a'], ['🌟', 'Highest match rating', 'r', (v) => v.toFixed(1)]].map(([icon, title, f, fmt = (v) => v]) => {
          const b = best((p) => p[f] || 0); return b && b.p[f] ? rec(icon, title, fmt(b.p[f]), esc(b.p.n), b.m) : '';
        }),
        rec('🔥', 'Longest win streak', bestRun, 'Rush wins in a row'),
        rec('🎩', 'Hat-tricks', hat.length, hat.slice(0, 3).map((x) => esc(x.p.n)).join(', ') || 'none yet'),
      ].filter(Boolean);
      const H = new Map();
      for (const m of matches) {
        const k = m.opp.toLowerCase();
        const e = H.get(k) ?? { m, ms: [] };
        e.ms.push(m); H.set(k, e);
      }
      const h2h = [...H.values()].map((e) => ({ ...e, R: record(e.ms) })).sort((a, b) => b.R.p - a.R.p);
      const tabs = UI.tabsHtml(boards.map(([k], i) => [String(i), k]), '0', 'rush-boards');
      return `${sec('Rush leaderboards', `${tabs}${boards.map(([, f, fmt], i) => `<div class="card rush-board" data-board="${i}"${i ? ' hidden' : ''}>${bars(f, fmt)}</div>`).join('')}`)}
${sec('Rush records', `<div class="records">${recs.join('')}</div>`, `${matches.length} confirmed games`)}
${sec('Rush head to head', `<div class="tbl"><table><thead><tr><th>Opponent</th><th class="n">P</th><th class="n">W</th><th class="n">D</th><th class="n">L</th><th class="n">GF</th><th class="n">GA</th><th class="n">GD</th><th>Last</th></tr></thead><tbody>${h2h.map(({ m, R, ms }) => `<tr><td>${oppHtml(m)}</td><td class="n">${R.p}</td><td class="n">${R.W}</td><td class="n">${R.D}</td><td class="n">${R.L}</td><td class="n">${R.gf}</td><td class="n">${R.ga}</td><td class="n">${R.gf - R.ga > 0 ? '+' : ''}${R.gf - R.ga}</td><td><a href="${BASE}matches/index.html#rush-${ms[0].id}">${res(ms[0].res)} ${ms[0].gf}–${ms[0].ga}</a></td></tr>`).join('')}</tbody></table></div>`)}`;
    },
  };

  async function drawRush(el) {
    if (el.dataset.drawn) return;
    el.dataset.drawn = '1';
    el.innerHTML = UI.skeleton('rows', 4);
    try {
      const d = await load();
      const [kind, arg] = el.dataset.rush.split(':');
      el.innerHTML = `<div class="rush-view">${views[kind](d, arg)}</div>`;
      $$('.count', el).forEach(countUp);
      const bt = $('.rush-boards', el);
      if (bt) UI.tabs(bt, (k) => $$('.rush-board', el).forEach((b) => (b.hidden = b.dataset.board !== k)));
      const dt = $('.rush-drill', el);
      if (dt) UI.tabs(dt, (k) => { $$('.rush-drill-panel', el).forEach((p) => (p.hidden = p.dataset.f !== k)); history.replaceState(null, '', `?f=${k}${location.hash}`); });
      const target = /^#rush-\d+$/.test(location.hash) && $(location.hash, el);
      if (target) { target.open = true; target.scrollIntoView({ block: 'center' }); }
    } catch (e) {
      delete el.dataset.drawn; data = null;
      el.innerHTML = UI.empty({ icon: '📡', title: 'Rush results are unavailable right now', text: 'Check your connection and switch tabs to try again.' });
    }
  }
  function set(m, save) {
    mode = m;
    if (save) { try { localStorage.setItem(KEY, m); } catch {} }
    for (const b of $$('[data-modes]')) {
      $$('.mode-switch [role=tab]', b).forEach((t) => { const on = t.dataset.key === m; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      $$(':scope > [data-mode]', b).forEach((p) => (p.hidden = p.dataset.mode !== m));
      if (m === 'rush') $$(':scope > [data-rush]', b).forEach(drawRush);
      else $$(':scope > [data-mode=league] .reveal:not(.in)', b).forEach((x) => x.classList.add('in'));
    }
  }
  $$('[data-modes] .mode-switch').forEach((el) => UI.tabs(el, (k) => set(k, true)));
  addEventListener('hashchange', () => { if (/^#rush-\d+$/.test(location.hash)) { const d = $(location.hash); if (d) d.open = true; else set('rush'); } });
  set(mode);
})();

// ================= Live stream bar + home embed (P1.3) =================
// The Worker cron checks Twitch/YouTube every 10 min; we poll /api/live and show a pulsing bar site-wide and the
// stream on the home page. Guarded by the `liveBanner` flag (the Worker answers 404 when it's off for the viewer).
const liveBar = $('.live-bar');
if (MAPI && liveBar && flagOn('liveBanner', viewerRole)) (() => {
  const token = (() => { try { return localStorage.getItem('norex_session'); } catch { return null; } })();
  const embed = $('.live-embed');
  let shown = '';
  const draw = (d) => {
    const on = d?.live && (d.platform === 'twitch' ? /^\w{3,25}$/.test(d.channel || '') : /^[\w-]{11}$/.test(d.videoId || ''));
    const key = on ? `${d.platform}:${d.channel || d.videoId}` : '';
    liveBar.hidden = !on;
    document.body.classList.toggle('is-live', !!on);
    if (!on) { if (embed) { embed.hidden = true; embed.innerHTML = ''; } shown = ''; return; }
    const where = d.platform === 'twitch' ? 'Twitch' : 'YouTube';
    liveBar.innerHTML = `<div class="wrap live-in"><span class="live-dot" aria-hidden="true"></span><b>LIVE</b><span class="live-title">NOREX is live on ${where}${d.title ? ` – ${esc(d.title)}` : ''}</span><a class="btn sm" href="${embed ? '#watch' : esc(d.url)}"${embed ? '' : ' target="_blank" rel="noopener"'}>▶ Watch</a></div>`;
    if (embed && key !== shown) {
      shown = key;
      const src = d.platform === 'twitch'
        ? `https://player.twitch.tv/?channel=${encodeURIComponent(d.channel)}&parent=${encodeURIComponent(location.hostname)}&muted=true`
        : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(d.videoId)}?autoplay=1&mute=1`;
      embed.innerHTML = `<div class="live-frame"><iframe src="${src}" title="NOREX live on ${where}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div><p class="small"><a href="${esc(d.url)}" target="_blank" rel="noopener">Open on ${where} ↗</a></p>`;
      embed.hidden = false;
    }
  };
  const poll = () => fetch(`${MAPI}/api/live`, { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => (r.ok ? r.json() : null)).then(draw).catch(() => {});
  poll();
  setInterval(() => document.visibilityState === 'visible' && poll(), 120000);
})();
