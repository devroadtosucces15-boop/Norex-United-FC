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

