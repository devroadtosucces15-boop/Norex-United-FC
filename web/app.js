// Interactivity for the static pages. Everything is progressive enhancement: pages work without it.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const BASE = document.body.dataset.base || '';
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
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
// For page scripts that draw after load (builder, Pro Builds): who's looking and which flags are on for them.
window.NXViewer = { get role() { return viewerRole; }, flagOn: (name) => flagOn(name, viewerRole) };
let apiCache;
const api = () => (apiCache ??= Promise.all(['players', 'clubs'].map((f) => fetch(`${BASE}api/${f}.json`).then((r) => r.json()))));

// ---------- grouped mega menu (redesign board 01) ----------
// One shared .mega panel: any .grp button opens/closes it; whichever button was used gets the highlighted
// column (`.focus`), defaulting to the page's own group so the current section is always marked.
(() => {
  const nav = $('.grpnav');
  if (!nav) return;
  const mega = $('.mega', nav), btns = $$('.grp', nav);
  const cols = $$('.col', mega);
  const setFocus = (id) => cols.forEach((c) => c.classList.toggle('focus', c.dataset.group === id));
  setFocus(document.body.dataset.group || '');
  const openMega = (id) => {
    mega.hidden = false;
    btns.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.group === id)));
    setFocus(id);
  };
  const closeMega = () => {
    mega.hidden = true;
    btns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    setFocus(document.body.dataset.group || '');
  };
  const canHover = () => matchMedia('(hover:hover)').matches;
  btns.forEach((b) => {
    b.addEventListener('click', () => (mega.hidden || b.getAttribute('aria-expanded') !== 'true' ? openMega(b.dataset.group) : closeMega()));
    b.addEventListener('mouseenter', () => canHover() && openMega(b.dataset.group));
  });
  nav.addEventListener('mouseleave', () => canHover() && closeMega());
  document.addEventListener('click', (e) => { if (!mega.hidden && !nav.contains(e.target)) closeMega(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mega.hidden) closeMega(); });
})();

// ---------- mobile: bottom tab bar + slide-up sheet (hamburger goes away below 860px) ----------
(() => {
  const bar = $('.tabbar');
  if (!bar) return;
  const sheet = $('.sheet'), backdrop = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'sheet-backdrop' }));
  backdrop.hidden = true;
  const groups = (() => { try { return JSON.parse($('#nav-data')?.textContent || '[]'); } catch { return []; } })();
  const active = document.body.dataset.active || '', activeGroup = document.body.dataset.group || '';
  const linkHtml = (l) => `<a class="lk${l.id === active ? ' hov' : ''}" href="${BASE}${l.href}"${l.flag ? ` data-flag="${l.flag}" hidden` : ''}><div class="ic">${l.icon}</div><div><b>${esc(l.label)}</b><small>${esc(l.desc)}</small></div></a>`;
  const body = $('.sheet-body', sheet);
  const openSheet = () => { sheet.hidden = false; backdrop.hidden = false; requestAnimationFrame(() => { sheet.classList.add('open'); backdrop.classList.add('open'); }); };
  const closeSheet = () => {
    sheet.classList.remove('open'); backdrop.classList.remove('open');
    setTimeout(() => {
      sheet.hidden = true; backdrop.hidden = true;
      // the "Me" tab moves the real .auth-slot node in (to keep its live login/logout listeners) – put it back.
      if (authHome) { const slot = $('.auth-slot'); if (slot) authHome.after(slot); authHome.remove(); authHome = null; }
    }, 250);
  };
  let authHome = null;
  backdrop.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet(); });
  $$('.tab[data-group]', bar).forEach((tab) => {
    if (tab.dataset.group === 'me') return; // wired separately below – it moves the live auth slot in, not a copy
    tab.addEventListener('click', (e) => {
      if (tab.dataset.group !== activeGroup) return; // different section: let the link navigate normally
      e.preventDefault();
      const g = groups.find((x) => x.id === tab.dataset.group);
      if (!g) return;
      body.innerHTML = `<h4><span>${g.icon}</span>${esc(g.label)}</h4>${g.links.map(linkHtml).join('')}`;
      applyFlags(viewerRole);
      openSheet();
    });
  });
  const meTab = $('.tab.me-tab', bar);
  meTab?.addEventListener('click', () => {
    const slot = $('.auth-slot');
    body.innerHTML = '<h4><span>👤</span>Me</h4>';
    if (slot) { authHome = document.createComment('auth-slot-home'); slot.after(authHome); body.appendChild(slot); const menu = $('.acct-menu', slot); if (menu) menu.hidden = false; }
    else body.insertAdjacentHTML('beforeend', '<p class="muted">Loading…</p>');
    openSheet();
  });
  // phones: "Me" moved to a profile button in the top bar – it opens the same sheet
  $('.me-top')?.addEventListener('click', () => meTab?.click());
  // Hub: the raised centre button – gold circle grows out of it, the key turns, then we navigate (the hub page wipes it away again)
  const hubTab = $('.tab.hub-tab', bar);
  hubTab?.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); e.stopPropagation();
    if (reducedMotion()) { location.href = hubTab.href; return; }
    const r = $('span', hubTab).getBoundingClientRect();
    const ov = Object.assign(document.createElement('div'), { className: 'nx-hubgo', innerHTML: '<div><div class="nx-hubgo-key">🔑</div><b>ENTERING THE HUB</b></div>' });
    ov.style.setProperty('--hx', `${Math.round(r.left + r.width / 2)}px`);
    ov.style.setProperty('--hy', `${Math.round(r.top + r.height / 2)}px`);
    document.body.appendChild(ov);
    navigator.vibrate?.(12);
    try { sessionStorage.setItem('nxhub', '1'); } catch { /* private mode */ }
    setTimeout(() => { location.href = hubTab.href; }, 640);
  });
  addEventListener('pageshow', (e) => { if (e.persisted) $('.nx-hubgo')?.remove(); });
})();

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
// Red pill slides between chips, panel content slides over (redesign board 05 part 2).
$$('[data-tabs]').forEach((g) => {
  const pill = document.createElement('span');
  pill.className = 'chip-pill';
  pill.setAttribute('aria-hidden', 'true');
  g.prepend(pill);
  g.classList.add('has-pill');
  const movePill = (btn, animate) => {
    if (!btn) return;
    pill.style.transition = animate && !reducedMotion() ? '' : 'none';
    pill.style.width = `${btn.offsetWidth}px`;
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
  };
  movePill($('button.chip.on', g), false);
  addEventListener('resize', () => movePill($('button.chip.on', g), false));
  chipGroup(g, (b) => {
    movePill(b, true);
    const panels = $$('.tab-panel', g.parentElement);
    const oldIdx = panels.findIndex((p) => !p.hidden);
    const newIdx = panels.findIndex((p) => p.id === b.dataset.tab);
    const dir = newIdx > oldIdx ? 'r' : 'l';
    panels.forEach((p, i) => {
      p.classList.remove('in', 'enter-r', 'enter-l');
      p.hidden = i !== newIdx;
      if (i === newIdx) {
        p.classList.add(`enter-${dir}`);
        void p.offsetWidth;
        requestAnimationFrame(() => { p.classList.remove('enter-r', 'enter-l'); p.classList.add('in'); });
      }
    });
  });
});
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

// ---------- 3D tilt + shine on hover cards (board 05 part 2 generalizes the .fut tilt to more card types) ----------
const TILT_SEL = '.fut, .record, .club-card';
document.addEventListener('pointermove', (e) => {
  const card = e.target.closest?.(TILT_SEL);
  $$('.tilting', document).forEach((c) => c !== card && reset(c));
  if (!card || e.pointerType !== 'mouse' || reducedMotion()) return;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  card.classList.add('tilting');
  card.style.setProperty('--ry', `${(x - 0.5) * 18}deg`);
  card.style.setProperty('--rx', `${(0.5 - y) * 18}deg`);
  card.style.setProperty('--mx', `${x * 100}%`);
  card.style.setProperty('--my', `${y * 100}%`);
});
function reset(c) { c.classList.remove('tilting'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }

// ---------- ribbon-wipe page transitions (redesign board 05 part 2) ----------
// One family, used everywhere: any plain click on a same-origin, same-tab link plays a ribbon sweep + crest
// stamp while the browser navigates (navigation itself is never delayed for the animation's sake), and the
// inline script in <head> flips html.nx-covered on before the next page's first paint so there's no flash of
// unwiped content – this then plays the reveal wipe once that page has settled in.
(() => {
  const html = document.documentElement;
  const NAV_KEY = 'nxnav';
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const raw = a.getAttribute('href');
    if (!raw || raw.startsWith('#') || a.hasAttribute('download')) return;
    if (a.target && a.target !== '_self') return;
    let url;
    try { url = new URL(a.href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;
    e.preventDefault();
    try { sessionStorage.setItem(NAV_KEY, '1'); } catch {}
    html.classList.add('nx-leaving');
    location.href = a.href;
  });
  function reveal() {
    let flagged = false;
    try { flagged = sessionStorage.getItem(NAV_KEY); sessionStorage.removeItem(NAV_KEY); } catch {}
    html.classList.remove('nx-leaving');
    if (!flagged) { html.classList.remove('nx-covered'); return; }
    html.classList.add('nx-covered');
    // A plain setTimeout (not rAF) flushes the covered paint even in a background/inactive tab, so a page
    // that finishes loading before the user switches to it still reveals correctly once they do.
    setTimeout(() => {
      html.classList.remove('nx-covered');
      html.classList.add('nx-revealing');
      setTimeout(() => html.classList.remove('nx-revealing'), 500);
    }, 30);
  }
  // pageshow (not DOMContentLoaded) also fires on bfcache restores (e.g. the back button), which need the
  // same clean-up so a page never gets stuck mid-transition.
  addEventListener('pageshow', reveal);
})();

// ---------- home hero: layered stadium parallax + spinnable crest coin (redesign board 02) ----------
(() => {
  const hero = $('[data-hero]');
  if (!hero) return;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionKey = 'norex_hero_motion';
  let motionOn = (() => { try { return localStorage.getItem(motionKey) !== 'off'; } catch { return true; } })();
  const toggle = $('[data-motion-toggle]', hero);
  const label = $('[data-motion-label]', hero);
  function applyMotionState() {
    const on = motionOn && !reduced();
    toggle?.setAttribute('aria-pressed', String(on));
    if (label) label.textContent = `Motion: ${on ? 'on' : 'off'}`;
    if (!on) { hero.style.removeProperty('--px'); hero.style.removeProperty('--py'); }
  }
  applyMotionState();
  toggle?.addEventListener('click', () => {
    motionOn = !motionOn;
    try { localStorage.setItem(motionKey, motionOn ? 'on' : 'off'); } catch {}
    applyMotionState();
  });
  hero.addEventListener('pointermove', (e) => {
    if (!motionOn || reduced() || e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--px', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
    hero.style.setProperty('--py', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
  });
  hero.addEventListener('pointerleave', () => { hero.style.setProperty('--px', 0); hero.style.setProperty('--py', 0); });

  // drag-to-spin crest coin: drag rotates freely, release settles on the nearest face; a plain
  // click (no drag) or Enter/Space flips it; arrow keys nudge it a fixed amount.
  const coin = $('[data-coin]', hero);
  if (!coin) return;
  let spin = 0, dragStart = null, dragSpinStart = 0, moved = false;
  const setSpin = (v, animate) => { coin.classList.toggle('dragging', !animate); coin.style.setProperty('--spin', `${v}deg`); };
  const settle = () => { spin = Math.round(spin / 180) * 180; setSpin(spin, true); };
  coin.addEventListener('pointerdown', (e) => {
    dragStart = e.clientX; dragSpinStart = spin; moved = false;
    coin.setPointerCapture(e.pointerId);
  });
  coin.addEventListener('pointermove', (e) => {
    if (dragStart == null) return;
    const dx = e.clientX - dragStart;
    if (Math.abs(dx) > 4) moved = true;
    spin = dragSpinStart + dx * 0.6;
    setSpin(spin, false);
  });
  coin.addEventListener('pointerup', () => {
    if (dragStart == null) return;
    dragStart = null;
    if (!moved) spin += 180; // plain click/tap flips it
    settle();
  });
  coin.addEventListener('pointercancel', () => { dragStart = null; settle(); });
  coin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spin += 180; settle(); }
    else if (e.key === 'ArrowLeft') { spin -= 30; settle(); }
    else if (e.key === 'ArrowRight') { spin += 30; settle(); }
  });
})();

// ---------- tactics table: orbitable CSS-3D pitch (redesign board 03) ----------
// The flat `.pitch`/`.pp` markup from build.mjs always works (no-JS, reduced motion, small screens).
// When motion/viewport allow it, this upgrades it into a CSS-3D scene: no WebGL, no library – a tilted,
// spinnable "table" (rotateZ = orbit, rotateX = tilt) with towers standing up via the classic
// rotateX(-90deg) "billboard" trick, and player pins counter-rotated so their labels stay readable.
(() => {
  const root = $('[data-tactics]');
  if (!root) return;
  let data = [];
  try { data = JSON.parse($('[data-tt-data]', root)?.textContent || '[]'); } catch {}
  if (!data.length) return;

  const flat = $('[data-tt-flat]', root), stage = $('[data-tt-stage]', root), hint = $('[data-tt-hint]', root);
  const statBtns = $$('[data-tt-stat] .chip', root);
  const camWrap = $('[data-tt-cam]', root), camLabel = $('[data-tt-camlabel]', root), camBtns = $$('[data-tt-cam] .chip', root);
  const zoomWrap = $('[data-tt-zoom]', root);
  const cardslot = $('[data-tt-cardslot]', root);
  // rx tilts the flat pitch back and away from the viewer: 0 = full flat top-down rectangle, ~90 = edge-on/low.
  const CAM = { broadcast: { rx: 58, rz: -16, sc: 1 }, top: { rx: 4, rz: 0, sc: .85 }, goal: { rx: 78, rz: 66, sc: 1.15 } };
  const STAT_MAX = { g: Math.max(1, ...data.map((p) => p.g)), a: Math.max(1, ...data.map((p) => p.a)), r: Math.max(1, ...data.map((p) => p.r)), m: Math.max(1, ...data.map((p) => p.m)) };
  let stat = 'g', camName = 'broadcast', built = false;
  const towers = new Map();

  function heightPx(p) { return 18 + (p[stat] / STAT_MAX[stat]) * 120; }
  function updateHeights() { for (const [key, el] of towers) el.style.setProperty('--h', `${heightPx(data.find((p) => p.key === key))}px`); }

  function selectPlayer(key) {
    $$('.tt-card', cardslot).forEach((c) => { c.hidden = c.dataset.ttCard !== key; });
    $$('.pp', flat).forEach((a) => a.classList.toggle('on', a.dataset.key === key));
    for (const [k, el] of towers) $('.tt-pin', el)?.classList.toggle('on', k === key);
  }

  flat.addEventListener('click', (e) => {
    const a = e.target.closest('.pp[data-key]');
    if (!a) return;
    e.preventDefault();
    selectPlayer(a.dataset.key);
  });

  function build3D() {
    const world = document.createElement('div');
    world.className = 'tt-world';
    world.innerHTML = '<div class="tt-ground3d"><div class="pitch-lines"><i class="half"></i><i class="circle"></i><i class="box l"></i><i class="box r"></i></div></div>';
    for (const p of data) {
      const tower = document.createElement('div');
      tower.className = 'tt-tower';
      tower.style.left = `${p.x}%`; tower.style.top = `${p.y}%`;
      tower.style.setProperty('--h', `${heightPx(p)}px`);
      const pin = document.createElement('button');
      pin.type = 'button'; pin.className = 'tt-pin'; pin.dataset.key = p.key;
      pin.innerHTML = `<b>${esc(p.ovr || '–')}</b><span>${esc(p.name)}</span>`;
      pin.addEventListener('click', () => selectPlayer(p.key));
      tower.append(Object.assign(document.createElement('i'), { className: 'tt-bar' }), pin);
      world.append(tower);
      towers.set(p.key, tower);
    }
    stage.append(world);

    // drag to orbit (skip when the pointer started on a player pin – that's a tap, not a drag)
    let dragging = null;
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.tt-pin')) return;
      dragging = { x: e.clientX, y: e.clientY, rz: parseFloat(getComputedStyle(stage).getPropertyValue('--tt-rz')) || CAM[camName].rz, rx: parseFloat(getComputedStyle(stage).getPropertyValue('--tt-rx')) || CAM[camName].rx };
      stage.classList.add('dragging');
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      stage.style.setProperty('--tt-rz', `${dragging.rz + (e.clientX - dragging.x) * 0.3}deg`);
      stage.style.setProperty('--tt-rx', `${Math.min(90, Math.max(0, dragging.rx - (e.clientY - dragging.y) * 0.3))}deg`);
      camBtns.forEach((b) => b.classList.remove('on'));
    });
    const endDrag = () => { dragging = null; stage.classList.remove('dragging'); };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // wheel + pinch to zoom
    const zoom = (delta) => { const sc = Math.min(1.6, Math.max(0.6, (parseFloat(getComputedStyle(stage).getPropertyValue('--tt-sc')) || CAM[camName].sc) + delta)); stage.style.setProperty('--tt-sc', sc); };
    stage.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 0.08 : -0.08); }, { passive: false });
    const touches = new Map();
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') touches.set(e.pointerId, e); });
    let pinchDist = null;
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return;
      touches.set(e.pointerId, e);
      if (touches.size !== 2) return;
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinchDist != null) zoom((d - pinchDist) * 0.003);
      pinchDist = d;
    });
    const clearTouch = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinchDist = null; };
    stage.addEventListener('pointerup', clearTouch);
    stage.addEventListener('pointercancel', clearTouch);

    // arrow keys turn the camera (works whether focus is on a pin, the stage, or elsewhere in the widget)
    root.addEventListener('keydown', (e) => {
      if (!stage.hidden && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        camBtns.forEach((b) => b.classList.remove('on'));
        if (e.key === 'ArrowLeft') stage.style.setProperty('--tt-rz', `${(parseFloat(getComputedStyle(stage).getPropertyValue('--tt-rz')) || 0) - 8}deg`);
        if (e.key === 'ArrowRight') stage.style.setProperty('--tt-rz', `${(parseFloat(getComputedStyle(stage).getPropertyValue('--tt-rz')) || 0) + 8}deg`);
        if (e.key === 'ArrowUp') stage.style.setProperty('--tt-rx', `${Math.max(0, (parseFloat(getComputedStyle(stage).getPropertyValue('--tt-rx')) || 55) - 8)}deg`);
        if (e.key === 'ArrowDown') stage.style.setProperty('--tt-rx', `${Math.min(90, (parseFloat(getComputedStyle(stage).getPropertyValue('--tt-rx')) || 55) + 8)}deg`);
      }
    });
  }

  function applyCam(name) {
    camName = name;
    stage.style.setProperty('--tt-rx', `${CAM[name].rx}deg`);
    stage.style.setProperty('--tt-rz', `${CAM[name].rz}deg`);
    stage.style.setProperty('--tt-sc', CAM[name].sc);
    camBtns.forEach((b) => b.classList.toggle('on', b.dataset.cam === name));
  }

  statBtns.forEach((b) => b.addEventListener('click', () => {
    statBtns.forEach((x) => x.classList.toggle('on', x === b));
    stat = b.dataset.stat;
    if (built) updateHeights();
  }));
  camBtns.forEach((b) => b.addEventListener('click', () => applyCam(b.dataset.cam)));
  $('[data-zoom=in]', zoomWrap)?.addEventListener('click', () => stage.style.setProperty('--tt-sc', Math.min(1.6, (parseFloat(getComputedStyle(stage).getPropertyValue('--tt-sc')) || 1) + 0.15)));
  $('[data-zoom=out]', zoomWrap)?.addEventListener('click', () => stage.style.setProperty('--tt-sc', Math.max(0.6, (parseFloat(getComputedStyle(stage).getPropertyValue('--tt-sc')) || 1) - 0.15)));
  $('[data-tt-reset]', root)?.addEventListener('click', () => applyCam(camName));

  const canUse3D = () => !matchMedia('(prefers-reduced-motion: reduce)').matches && innerWidth >= 760;
  function updateMode() {
    const on = canUse3D();
    flat.hidden = on; stage.hidden = !on; hint.hidden = !on;
    camWrap.hidden = !on; camLabel.hidden = !on; zoomWrap.hidden = !on;
    if (on && !built) { build3D(); applyCam('broadcast'); built = true; }
  }
  updateMode();
  let resizeT;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(updateMode, 200); });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', updateMode);
})();

// ---------- squad 3D card carousel (redesign board 04, part 2) ----------
// The flat `.card-grid` from build.mjs always works (no-JS, reduced motion). This upgrades it into a
// draggable ring – the hero coin's drag-to-spin-and-settle code (board 02) ported to a full circle instead
// of a two-sided flip – with the front card enlarged and flippable for season stats + last-10 ratings.
(() => {
  const root = $('[data-carousel]');
  if (!root) return;
  let all = [];
  try { all = JSON.parse($('[data-carousel-data]', root)?.textContent || '[]'); } catch {}
  if (!all.length) return;

  const flat = $('[data-carousel-flat]', root), stage = $('[data-carousel-stage]', root);
  const filterWrap = $('[data-carousel-filter]', root);
  let ring, cards = [], visible = [], rot = 0, front = 0, built = false, group = 'All', dragStart = null, dragRotStart = 0, moved = false, countEl;

  function visibleData() { return group === 'All' ? all : all.filter((p) => p.group === group); }
  function inRect(r, x, y) { return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }

  function applyRot(animate) {
    ring.classList.toggle('dragging', !animate);
    ring.style.setProperty('--car-rot', `${rot}deg`);
  }

  function updateFront() {
    const n = visible.length;
    if (!n) return;
    const step = 360 / n;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const angle = ((rot + i * step) % 360 + 360) % 360;
      const dist = Math.min(angle, 360 - angle);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    front = best;
    let vi = -1;
    cards.forEach((c) => { if (c.hidden) return; vi++; c.classList.toggle('front', vi === best); });
    if (countEl) countEl.textContent = `Drag to spin · ${best + 1} of ${n}`;
  }

  function step(dir) {
    const n = visible.length || 1;
    rot -= dir * (360 / n);
    applyRot(true);
    updateFront();
  }

  function layout() {
    visible = visibleData();
    const n = visible.length;
    stage.style.setProperty('--car-step', `${360 / Math.max(n, 1)}deg`);
    stage.style.setProperty('--car-radius', '260px'); // fixed depth: a shallow ring so the perspective(1400) scale stays sane regardless of squad size
    let vi = -1;
    cards.forEach((c) => {
      const on = c.dataset.group === '' || group === 'All' || c.dataset.group === group;
      c.hidden = !on;
      if (on) c.style.setProperty('--i', ++vi);
    });
    rot = 0;
    applyRot(true);
    updateFront();
  }

  function build() {
    ring = document.createElement('div');
    ring.className = 'carousel-ring';
    cards = all.map((p) => {
      const c = document.createElement('div');
      c.className = 'carousel-card';
      c.dataset.group = p.group;
      c.innerHTML = `<div class="carousel-flip"><div class="carousel-front">${p.front}</div><div class="carousel-back">${p.back}</div></div>`;
      ring.append(c);
      return c;
    });
    stage.append(ring);

    const nav = document.createElement('div');
    nav.className = 'carousel-nav';
    nav.innerHTML = `<button type="button" aria-label="Previous card">◀</button><span class="carousel-hint"></span><button type="button" aria-label="Next card">▶</button>`;
    const [prevBtn, , nextBtn] = nav.children;
    countEl = nav.children[1];
    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
    stage.after(nav);

    // Deeply-nested 3D transforms (ring > card > flip > front/back) don't always hit-test at their
    // projected screen position across browsers/GPUs – clicks and pointerdowns can resolve to the flat
    // `stage` container regardless of which card is visually under the pointer. So every interaction is
    // driven from here using getBoundingClientRect() math (which DOES report the correct projected box)
    // rather than trusting e.target inside the 3D scene.
    stage.addEventListener('pointerdown', (e) => {
      dragStart = e.clientX; dragRotStart = rot; moved = false;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (dragStart == null) return;
      const dx = e.clientX - dragStart;
      if (Math.abs(dx) > 4) moved = true;
      rot = dragRotStart + dx * 0.4;
      applyRot(false);
      updateFront();
    });
    const endDrag = () => { if (dragStart == null) return; dragStart = null; const n = visible.length || 1; const st = 360 / n; rot = Math.round(rot / st) * st; applyRot(true); updateFront(); };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    stage.addEventListener('click', (e) => {
      if (moved) return;
      const fc = cards.find((c) => c.classList.contains('front'));
      if (!fc || !inRect(fc.getBoundingClientRect(), e.clientX, e.clientY)) return;
      if (!fc.classList.contains('flipped')) { fc.classList.add('flipped'); return; }
      const link = $('.carousel-back a', fc);
      if (link && inRect(link.getBoundingClientRect(), e.clientX, e.clientY)) location.href = link.href;
      else fc.classList.remove('flipped');
    });

    layout();
  }

  filterWrap?.addEventListener('click', (e) => {
    const b = e.target.closest('button.chip');
    if (!b) return;
    $$('button.chip', filterWrap).forEach((x) => x.classList.toggle('on', x === b));
    group = b.dataset.pos;
    $$('.fut', flat).forEach((el) => (el.hidden = group !== 'All' && el.dataset.pos !== group));
    if (built) layout();
  });

  const canUse3D = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function updateMode() {
    const on = canUse3D();
    flat.hidden = on; stage.hidden = !on;
    if (on && !built) { build(); built = true; }
  }
  updateMode();
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', updateMode);
})();

// ---------- match reel cover-flow (redesign board 05, part 1) ----------
// The flat `.card-rail.reel` from build.mjs (real fixture() cards; the session chips are plain #anchor
// links into it) always works – no-JS and reduced-motion both get it. This upgrades it into a draggable
// 3D coverflow: a translateX+rotateY variant of the squad carousel's ring above, same
// drag/snap/getBoundingClientRect-hit-testing mechanics (ring>card>flip nesting broke e.target hit-
// testing there; this scene has one 3D layer, but the same outer-stage-math approach still applies),
// with the centred card enlarged and its score flipping in digit-by-digit (the flap spans build.mjs
// wrote into that card's poster()).
(() => {
  const root = $('[data-reel-flat]')?.closest('.block');
  if (!root) return;
  let matches = [];
  try { matches = JSON.parse($('[data-reel-data]', root)?.textContent || '[]'); } catch {}
  if (!matches.length) return;

  const flat = $('[data-reel-flat]', root), stage = $('[data-reel-stage]', root);
  const chipsWrap = $('[data-reel-chips]', root), nav = $('.reel-nav', root);
  const prevBtn = $('.rn-prev', root), nextBtn = $('.rn-next', root), hintEl = $('.reel-hint', root);
  const STEP = 150, ANGLE = 34, MAXV = 3.2;
  let cards = [], pos = matches.length - 1, front = -1, built = false;
  let dragStart = null, dragPosStart = 0, moved = false, lastT = 0, lastX = 0, vel = 0;

  function inRect(r, x, y) { return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }

  function place(animate) {
    stage.classList.toggle('dragging', !animate);
    cards.forEach((c, i) => {
      const off = Math.max(-MAXV, Math.min(MAXV, i - pos));
      c.style.zIndex = String(100 - Math.round(Math.abs(off) * 10));
      c.style.transform = `translate(-50%,-50%) translateX(${off * STEP}px) rotateY(${off * -ANGLE}deg) scale(${(1 / (1 + Math.abs(off) * 0.28)).toFixed(3)})`;
    });
  }

  function unreveal(card) {
    delete card.dataset.revealed;
    $$('.flap-strip', card).forEach((s) => { s.style.transition = 'none'; s.style.transform = 'translateY(0)'; });
  }
  function reveal(card) {
    if (!card || card.dataset.revealed) return;
    card.dataset.revealed = 'true';
    const flaps = $$('.flap', card);
    flaps.forEach((f) => { const s = $('.flap-strip', f); s.style.transition = 'none'; s.style.transform = 'translateY(0)'; });
    requestAnimationFrame(() => flaps.forEach((f, i) => {
      const s = $('.flap-strip', f);
      setTimeout(() => { s.style.transition = ''; s.style.transform = `translateY(-${f.dataset.d}em)`; }, i * 70);
    }));
  }

  function updateFront(animate) {
    place(animate);
    const i = Math.round(pos);
    cards.forEach((c, ci) => c.classList.toggle('front', ci === i));
    if (i === front) return;
    if (front >= 0 && cards[front]) unreveal(cards[front]);
    front = i;
    reveal(cards[front]);
    if (hintEl) hintEl.textContent = `Drag the reel · match ${front + 1} of ${cards.length}`;
    $$('.rchip', chipsWrap).forEach((ch) => ch.classList.toggle('on', Number(ch.dataset.idx) === front));
  }

  function goTo(i) { pos = Math.max(0, Math.min(cards.length - 1, i)); updateFront(true); }

  function build() {
    matches.forEach((m) => {
      const c = document.createElement('div');
      c.className = 'reel-card';
      c.dataset.href = m.href;
      c.innerHTML = m.html;
      stage.append(c);
      cards.push(c);
    });
    place(false);
    updateFront(false);

    stage.addEventListener('pointerdown', (e) => {
      dragStart = e.clientX; dragPosStart = pos; moved = false; lastT = performance.now(); lastX = e.clientX; vel = 0;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (dragStart == null) return;
      const dx = e.clientX - dragStart;
      if (Math.abs(dx) > 4) moved = true;
      const now = performance.now(), dt = now - lastT;
      if (dt > 0) vel = (e.clientX - lastX) / dt;
      lastT = now; lastX = e.clientX;
      pos = Math.max(-0.6, Math.min(cards.length - 1 + 0.6, dragPosStart - dx / STEP));
      place(false);
    });
    const endDrag = () => {
      if (dragStart == null) return;
      dragStart = null;
      goTo(Math.round(pos - vel * 90 / STEP)); // a flick keeps coasting a little further before it snaps
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.round(pos) - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.round(pos) + 1); }
    });
    // Deeply-nested 3D transforms don't always hit-test at their projected screen position (see the squad
    // carousel above) – drive the front card's link and its download button from getBoundingClientRect()
    // math on the outer stage rather than trusting e.target.
    stage.addEventListener('click', (e) => {
      if (moved) return;
      const card = cards[Math.round(pos)];
      if (!card || !inRect(card.getBoundingClientRect(), e.clientX, e.clientY)) return;
      const dl = $('.dl-poster', card);
      if (dl && inRect(dl.getBoundingClientRect(), e.clientX, e.clientY)) { dl.click(); return; }
      if (card.dataset.href) location.href = card.dataset.href;
    });
  }

  prevBtn?.addEventListener('click', () => goTo(Math.round(pos) - 1));
  nextBtn?.addEventListener('click', () => goTo(Math.round(pos) + 1));
  chipsWrap?.addEventListener('click', (e) => {
    if (!canUse3D()) return; // plain #anchor jump handles it when the flat rail is showing
    const a = e.target.closest('.rchip');
    if (!a) return;
    e.preventDefault();
    goTo(Number(a.dataset.idx));
  });

  const canUse3D = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function updateMode() {
    const on = canUse3D();
    flat.hidden = on; stage.hidden = !on; if (nav) nav.hidden = !on;
    if (on && !built) { build(); built = true; }
  }
  updateMode();
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', updateMode);
})();

// ---------- leaders podium (redesign board 04, part 2) ----------
// Flat ranked lists (barList, driven by the existing [data-tabs]/.tab-panel chip switcher) always work.
// This grows a 3D-tilted top-3 podium on top when motion is allowed – hovering tilts it toward the pointer
// (the hero's --px/--py tilt pattern, board 02), and switching tabs drops the old blocks and grows new
// ones from the ground.
(() => {
  const root = $('[data-podium]');
  if (!root) return;
  let data = [];
  try { data = JSON.parse($('[data-podium-data]', root)?.textContent || '[]'); } catch {}
  if (!data.length) return;
  const byKey = new Map(data.map((d) => [d.key, d]));
  const stage = $('[data-podium-stage]', root), stage3d = $('.podium-3d', stage);
  const tabsWrap = $('[data-tabs]', root);
  const ORDER = [1, 0, 2]; // visual left-to-right: 2nd, 1st, 3rd
  const RANK_CLS = { 0: 'pod-1', 1: 'pod-2', 2: 'pod-3' };
  const initials = (n) => (n || '?').trim()[0]?.toUpperCase() || '?';

  function render(key, animate) {
    const d = byKey.get(key);
    if (!d) return;
    const draw = () => {
      stage3d.innerHTML = ORDER.filter((i) => d.top3[i]).map((i) => {
        const p = d.top3[i];
        return `<a class="pod-block ${RANK_CLS[i]}" href="${p.href}"><span class="pod-tag"><span class="pod-av">${esc(initials(p.name))}</span><span class="pod-name">${esc(p.name)}</span><span class="pod-v">${esc(p.v)}</span></span><span class="pod-rank">${i + 1}</span></a>`;
      }).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => $$('.pod-block', stage3d).forEach((b) => b.classList.add('in'))));
    };
    if (animate && stage3d.children.length) {
      $$('.pod-block', stage3d).forEach((b) => b.classList.remove('in'));
      setTimeout(draw, 260);
    } else draw();
  }

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function updateMode() {
    const on = !reduced();
    stage.hidden = !on;
    if (on) render($('.chip.on', tabsWrap)?.dataset.tab.replace('pod-', '') || data[0].key, false);
  }
  updateMode();
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', updateMode);

  tabsWrap?.addEventListener('click', (e) => {
    const b = e.target.closest('button.chip');
    if (!b || reduced()) return;
    render(b.dataset.tab.replace('pod-', ''), true);
  });

  stage.addEventListener('pointermove', (e) => {
    if (reduced() || e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    stage.style.setProperty('--ppx', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
    stage.style.setProperty('--ppy', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
  });
  stage.addEventListener('pointerleave', () => { stage.style.setProperty('--ppx', 0); stage.style.setProperty('--ppy', 0); });
})();

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
const navPages = (() => { try { return JSON.parse($('#nav-data')?.textContent || '[]').flatMap((g) => g.links.map((l) => ({ label: l.label, sub: `${g.icon} ${g.label} · ${l.desc}`, href: `${BASE}${l.href}` }))); } catch { return []; } })();
async function renderPal() {
  const [pl, cl] = await api();
  const q = palIn.value.trim().toLowerCase();
  const items = [
    ...pl.map((p) => ({ label: p.n, sub: `${p.pos} · ${p.c.slice(0, 2).join(', ')}`, href: `${BASE}players/${encodeURIComponent(p.k)}.html`, home: p.home, score: p.home ? 2 : 0 })),
    ...cl.map((c) => ({ label: c.n, sub: `Club · ${c.t}`, href: c.t === 'home' ? `${BASE}index.html` : `${BASE}clubs/${c.id}.html`, score: c.t === 'home' ? 3 : 1 })),
    ...navPages.map((n) => ({ ...n, score: 1 })),
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
// Delegated (not a per-button listener bound at parse time) so buttons the match reel cover-flow builds
// later – see "match reel cover-flow" below – get the same handler without re-wiring anything.
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.dl-poster');
  if (!btn) return;
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
  // Both crests side by side (opponent crests come through the Worker's CORS proxy); one crest → centred.
  const loadImg = async (src) => {
    if (!src) return null;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await img.decode().catch(() => {});
    return img.naturalWidth ? img : null;
  };
  const [ch, ca] = await Promise.all([loadImg(d.crest), loadImg(d.acrest)]);
  const put = (img, cx, h, maxW) => { let w = (img.naturalWidth / img.naturalHeight) * h; if (w > maxW) { h *= maxW / w; w = maxW; } g.drawImage(img, cx - w / 2, 430 - h / 2, w, h); };
  if (ch && ca) {
    put(ch, W * 0.26, 380, 380); put(ca, W * 0.74, 320, 320);
    g.font = '700 54px Oswald, Impact, sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('VS', W / 2, 450); g.fillStyle = '#fff';
  } else if (ch || ca) put(ch || ca, W / 2, 420, 420);
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
});

// ---------- world compare (P9.2): NOREX vs any club in EA's world top 100 ----------
$$('[data-worldcmp]').forEach((box) => {
  const data = JSON.parse(box.querySelector('[data-worldcmp-data]').textContent);
  const pick = box.querySelector('[data-worldcmp-pick]'), out = box.querySelector('[data-worldcmp-out]');
  const per = (v, gp) => (gp ? v / gp : NaN);
  const fmt = (v, d = 0) => (v == null || Number.isNaN(v) ? '–' : d ? v.toFixed(d) : String(v));
  // [label, value, decimals, pct?] – a bar shows who leads on each line
  const lines = (c) => [
    ['SR', c.sr, 0], ['Games', c.gp, 0], ['Wins', c.w, 0],
    ['Win %', per(c.w, c.gp) * 100, 0, true], ['Goals / game', per(c.gf, c.gp), 2], ['Goals against / game', per(c.ga, c.gp), 2], ['Clean sheets', c.cs, 0],
  ];
  const render = () => {
    const b = data.clubs.find((c) => c.id === pick.value) ?? data.clubs[0], a = data.home;
    const la = lines(a), lb = lines(b);
    const head = (c) => `<b>${c.rank ? `#${c.rank} ` : ''}${esc(c.name)}</b>`;
    out.innerHTML = `<p class="world-cmp-head">${head(a)} <span class="muted">vs</span> ${head(b)}</p>
<ul class="compare-bars">${la.map(([l, x, dec, isPct], i) => {
      const y = lb[i][1], xv = +x || 0, yv = +y || 0, t = xv + yv || 1;
      const show = (v) => (isPct ? (Number.isNaN(v) ? '–' : `${Math.round(v)}%`) : fmt(v, dec));
      return `<li><b class="${xv > yv ? 'lead' : ''}">${show(x)}</b><span>${l}</span><b class="${yv > xv ? 'lead' : ''}">${show(y)}</b><div class="duel"><i class="l" style="--w:${xv / t * 100}%"></i><i class="r" style="--w:${yv / t * 100}%"></i></div></li>`;
    }).join('')}</ul>
<p class="small muted">Division: ${fmt(a.div)} vs ${fmt(b.div)} · W-D-L ${fmt(a.w)}-${fmt(a.d)}-${fmt(a.l)} vs ${fmt(b.w)}-${fmt(b.d)}-${fmt(b.l)}. Squad size isn't in EA's world table, so it isn't compared.</p>`;
  };
  pick.addEventListener('change', render);
  render();
});

// ---------- compare tool ----------
let cmpHook = null, cmpPair = null;
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
    render(a, b); cmpInsight(a, b);
  };
  $('#cmp-a').addEventListener('change', update); $('#cmp-b').addEventListener('change', update);
  if (A && B) { render(A, B); cmpInsight(A, B); } else cmpOut.innerHTML = '<p class="muted">Pick two players.</p>';

  // ✨ head-to-head insight (BE9 compare): the member block below (session, call, flags) installs cmpHook; whichever runs second picks up the pair
  function cmpInsight(a, b) { cmpPair = [a, b]; cmpHook?.(a, b); }

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
  // BE5 – Boardroom "preview as": a manager/owner can add ?previewAs=member (…claimed / guest) to any URL
  // to see the site (and the member API) as that lower role. Never lets them escalate. The Worker
  // enforces this for real for every API call via the same `x-view-as` header, the query param only
  // drives the client's own rendering (nav, flagOn() gates) to match.
  const VIEW_RANK = ['guest', 'member', 'claimed', 'manager', 'owner'];
  const realRole = session && (session.role ?? (session.adm ? 'manager' : 'member'));
  const previewAsRaw = new URLSearchParams(location.search).get('previewAs');
  const previewAs = previewAsRaw && realRole && VIEW_RANK.includes(previewAsRaw) && VIEW_RANK.indexOf(previewAsRaw) <= VIEW_RANK.indexOf(realRole) && VIEW_RANK.indexOf(realRole) >= VIEW_RANK.indexOf('manager') ? previewAsRaw : null;
  const call = async (path, body) => {
    const r = await fetch(MAPI + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${session?.token}`, ...(previewAs ? { 'x-view-as': previewAs } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { ls.set(KEY, null); location.reload(); }
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  const toast = (msg, bad) => UI.toast(msg, bad ? 'bad' : 'ok');
  const loadTrials = () => new Promise((ok, no) => (window.NXTrials ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/trials.js`, onload: ok, onerror: no }))));
  // Role badge (tiers from bot/roles.js). Sessions from before roles existed only carry `adm`.
  const ROLE = { owner: ['👑 Owner', 'owner'], manager: ['🛡️ Manager', 'home'], claimed: ['✅ Verified player', 'ok'], member: ['NOREX member', ''], guest: ['Guest', ''] };
  const roleTag = (r) => { const [l, c] = ROLE[r] || ROLE.member; return `<span class="tag ${c}">${l}</span>`; };
  const baseRole = previewAs || session && (session.role ?? (session.adm ? 'manager' : 'member'));
  const ago = UI.time;
  if (session) { applyFlags(baseRole); viewerRole = baseRole; }
  const previewUrl = (role) => { const u = new URL(location.href); role ? u.searchParams.set('previewAs', role) : u.searchParams.delete('previewAs'); return u.pathname + u.search + u.hash; };
  const exitPreviewUrl = () => previewUrl(null);
  if (previewAs) {
    const bar = document.createElement('div');
    bar.className = 'preview-bar';
    bar.innerHTML = `👁️ Previewing as <b>${esc(ROLE[previewAs]?.[0] || previewAs)}</b> <a href="${esc(exitPreviewUrl())}">Exit preview</a>`;
    document.body.prepend(bar);
  }
  if (err) toast(err === 'not_member' ? 'Members only – you need to be in the NOREX Discord server.' : err === 'cancelled' ? 'Login cancelled.' : 'Discord login failed – try again.', true);

  // ---------- Member profiles: hover cards everywhere + member.html (P2.1 / P2.2) ----------
  const profilesOn = !!session && flagOn('profiles', baseRole);
  const loadProfile = () => new Promise((ok, no) => (window.NXProfile ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/profile.js`, onload: ok, onerror: no }))));
  const profileCtx = (extra) => ({ call, toast, me: { u: session.u, n: session.n, a: session.a }, role: baseRole, players: () => api().then(([p]) => p), ...extra });
  if (profilesOn) UI.hoverCard.use((id) => loadProfile().then(() => NXProfile.card(id, profileCtx())));

  // ---------- header: login button or account menu ----------
  const slot = $('.auth-slot');
  if (slot && !session) slot.innerHTML = `<a class="login-btn" href="${loginUrl()}">Member login</a>`;
  if (slot && session) {
    const cached = (() => { try { return JSON.parse(ls.get('norex_me') || 'null'); } catch { return null; } })();
    const hub = `${BASE}members.html`;
    const myRole = baseRole === 'member' && cached?.player ? 'claimed' : baseRole;
    slot.innerHTML = `<div class="acct"><button class="me-btn" type="button" aria-haspopup="true" aria-expanded="false"><img src="${esc(session.a)}" alt=""><span>${esc(session.n)}</span><i>▾</i></button>
<div class="acct-menu" hidden><div class="acct-head"><img src="${esc(session.a)}" alt=""><div><b>${esc(session.n)}</b><small>${ROLE[myRole][0]}</small></div></div>
${flagOn('feed', baseRole) ? `<a href="${BASE}feed.html">📰 Club feed</a>` : ''}<a href="${hub}#me">👤 My profile</a>${flagOn('myStats', baseRole) ? `<a href="${hub}#stats">📊 My stats</a>` : ''}${profilesOn ? `<a href="${BASE}member.html?u=${encodeURIComponent(session.u)}">🪪 My public profile</a>` : ''}${cached?.player ? `<a href="${BASE}players/${encodeURIComponent(cached.player)}.html">🪪 My player page</a>` : ''}
${flagOn('notifications', baseRole) ? `<a href="${hub}#alerts">🔔 Notifications</a>` : ''}${flagOn('docs', baseRole) ? `<a href="${BASE}docs.html">📚 Club docs</a>` : ''}${flagOn('playStyle', baseRole) ? `<a href="${BASE}playstyle.html">🧠 Play Style</a>` : ''}${flagOn('suggestions', baseRole) ? `<a href="${hub}#ideas">💡 Ideas</a>` : ''}${flagOn('awards', baseRole) ? `<a href="${hub}#awards">🏆 Awards</a>` : ''}${flagOn('rushSquads', baseRole) ? `<a href="${hub}#squads">🤝 Rush squads</a>` : ''}${flagOn('starRatings', baseRole) ? `<a href="${hub}#ratings">🌟 Star ratings</a>` : ''}${flagOn('predictions', baseRole) ? `<a href="${hub}#predict">🔮 Predictions</a>` : ''}${flagOn('recommendations', baseRole) ? `<a href="${hub}#teamup">🎯 Who to play with</a>` : ''}${flagOn('feedback', baseRole) ? `<a href="${hub}#feedback">💌 Feedback</a>` : ''}${flagOn('events', baseRole) ? `<a href="${hub}#schedule">🗓️ Schedule</a>` : ''}<a href="${hub}#availability">📅 Availability</a><a href="${hub}#votes">⭐ MOTM votes</a>${flagOn('rushLog', baseRole) ? `<a href="${hub}#rush">⚡ Log Rush result</a>` : ''}${VIEW_RANK.indexOf(baseRole) >= VIEW_RANK.indexOf('manager') ? `<a href="${hub}#manager">🛡️ Manager portal</a>` : ''}
${VIEW_RANK.indexOf(realRole) >= VIEW_RANK.indexOf('manager') ? `<div class="acct-sep"></div><small class="acct-lbl">👁️ Preview as</small>${VIEW_RANK.filter((r) => VIEW_RANK.indexOf(r) <= VIEW_RANK.indexOf(realRole)).map((r) => `<a href="${esc(previewUrl(r === realRole ? null : r))}"${baseRole === r ? ' class="on"' : ''}>${ROLE[r][0]}</a>`).join('')}` : ''}
<button type="button" class="acct-out">↩ Log out</button></div></div>`;
    const btn = $('.me-btn', slot), menu = $('.acct-menu', slot);
    btn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', !menu.hidden); };
    document.addEventListener('click', (e) => { if (!menu.hidden && !slot.contains(e.target)) menu.hidden = true; });
    $('.acct-out', slot).onclick = logout;
  }

  // ---------- 🔔 notification centre (P7.1) + club & privacy requests (P5.6) – assets/notify.js ----------
  const notifyOn = !!session && flagOn('notifications', baseRole);
  const loadNotify = () => new Promise((ok, no) => (window.NXNotify ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/notify.js`, onload: ok, onerror: no }))));
  const notifyCtx = () => ({ call, toast, session, loginUrl, clubs: () => api().then(([, c]) => c) });
  if (notifyOn) loadNotify().then(() => NXNotify.bell(notifyCtx())).catch(() => {});
  const reqEl = $('#request-forms');
  if (reqEl && flagOn('requests', baseRole || 'guest')) loadNotify().then(() => NXNotify.requestForms(reqEl, notifyCtx())).catch(() => {});

  // ---------- 📚 club docs (P5.2): newest announcement on the home page · 💡 ideas tab (P5.4) – assets/docs.js ----------
  const loadDocs = () => new Promise((ok, no) => (window.NXDocs ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/docs.js`, onload: ok, onerror: no }))));
  const newsEl = $('[data-news]');
  if (newsEl && flagOn('docs', baseRole || 'guest')) loadDocs().then(() => NXDocs.news(newsEl)).catch(() => {});
  // ---------- 🗓️ schedule (P3.1–P3.7): next public event on the home page · hub tab – assets/events.js ----------
  const loadEvents = () => new Promise((ok, no) => (window.NXEvents ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/events.js`, onload: ok, onerror: no }))));
  // ---------- 🏆 weekly awards (P4.1): hub tab + trophy cabinets on player pages – assets/awards.js ----------
  const loadAwards = () => new Promise((ok, no) => (window.NXAwards ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/awards.js`, onload: ok, onerror: no }))));
  if (flagOn('awards', baseRole || 'guest')) $$('.member-badge[data-player]').forEach((el) => loadAwards().then(() => NXAwards.cabinet(el, el.dataset.player)).catch(() => {}));
  // ---------- 🔎 scout report (PB.5): short version on public player pages – assets/scout.js ----------
  if (flagOn('scoutReport', baseRole || 'guest')) $$('.member-badge[data-player]').forEach((el) => {
    const box = document.createElement('div');
    el.after(box);
    (window.NXScout ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/scout.js`, onload: ok, onerror: no })))).then(() => NXScout.section(box, { k: el.dataset.player })).catch(() => box.remove());
  });
  // ---------- 🤖 AI player insights (P11.14): same slot as the scout report – player cards, profiles, compare, portal – assets/aiinsights.js ----------
  if (flagOn('aiInsights', baseRole || 'guest')) $$('.member-badge[data-player]').forEach((el) => {
    const box = document.createElement('div');
    el.after(box);
    (window.NXAI ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/aiinsights.js`, onload: ok, onerror: no })))).then(() => NXAI.section(box, { k: el.dataset.player })).catch(() => box.remove());
  });
  // ---------- ✨ Insight widget (board 12, BE9): home page club form + latest match, home-squad player profiles – assets/insights.js ----------
  // `note.<k>` slots (the private coach's note) only ask the API for a signed-in viewer; the row comes back only for that player's claimant + managers, else the widget removes its slot
  // ✨ chips on the stat tiles (home "Season at a glance", a home player's Career) → one insight panel under the grid
  if (flagOn('statInsights', baseRole || 'guest') && flagOn('insightWidget', baseRole || 'guest')) $$('[data-ins-tile]').forEach((g) => {
    (window.NXInsight ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/insights.js`, onload: ok, onerror: no })))).then(() => NXInsight.tiles(g, g.dataset.insTile, { call, toast, session, baseRole })).catch(() => {});
  });
  if (flagOn('statInsights', baseRole || 'guest') && flagOn('insightWidget', baseRole || 'guest')) $$('[data-nx-insight]').forEach((el) => {
    if (el.dataset.nxInsight.startsWith('note.') && !session) { el.remove(); return; }
    (window.NXInsight ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/insights.js`, onload: ok, onerror: no })))).then(() => NXInsight.mount(el, el.dataset.nxInsight, { call, toast, session, baseRole })).catch(() => el.remove());
  });
  // ✨ head-to-head insight on the stats page "Head to head" table (BE9 h2h): click/Enter a row to mount `h2h.<opponent>` in the panel under the table
  const h2hPanel = $('[data-nx-h2h-insight]');
  if (h2hPanel && flagOn('statInsights', baseRole || 'guest') && flagOn('insightWidget', baseRole || 'guest')) {
    const pick = (tr) => {
      $$('#h2h tr.h2h-on').forEach((r) => r.classList.remove('h2h-on'));
      tr.classList.add('h2h-on');
      const slot = document.createElement('div');
      h2hPanel.replaceChildren(slot); h2hPanel.hidden = false;
      (window.NXInsight ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/insights.js`, onload: ok, onerror: no })))).then(() => NXInsight.mount(slot, `h2h.${tr.dataset.h2h}`, { call, toast, session, baseRole, empty: 'No head-to-head insight for this opponent yet.' })).catch(() => { h2hPanel.hidden = true; });
    };
    $('#h2h')?.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-h2h]'); if (tr && !e.target.closest('a')) pick(tr); });
    $('#h2h')?.addEventListener('keydown', (e) => { const tr = e.target.closest?.('tr[data-h2h]'); if (tr && e.key === 'Enter') pick(tr); });
  }
  // ✨ head-to-head insight (BE9 compare, compare.html) – members only, written on first view of a pair, cached until the stats change
  cmpHook = (a, b) => {
    const slot = $('[data-nx-cmp-insight]');
    if (!slot || !(flagOn('statInsights', baseRole || 'guest') && flagOn('insightWidget', baseRole || 'guest'))) return;
    if (!session || a.k === b.k || !a.home || !b.home) { slot.hidden = true; slot.innerHTML = ''; return; }
    slot.hidden = false; slot.innerHTML = '';
    (window.NXInsight ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/insights.js`, onload: ok, onerror: no })))).then(() => {
      NXInsight.mount(slot, '', { call, toast, session, baseRole, compare: { a: a.k, b: b.k } });
    }).catch(() => { slot.hidden = true; });
  };
  if (cmpPair) cmpHook(...cmpPair);
  const nextEl = $('[data-next-event]');
  if (nextEl && flagOn('events', baseRole || 'guest')) loadEvents().then(() => NXEvents.next(nextEl)).catch(() => {});
  // ---------- 🎬 highlight of the week on the home page (P6.2) · 🟢 who's online (P6.4) – assets/hotw.js, assets/presence.js ----------
  const loadAsset = (file, global) => new Promise((ok, no) => (window[global] ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/${file}`, onload: ok, onerror: no }))));
  const hotwEl = $('[data-hotw]');
  if (hotwEl && flagOn('hotw', baseRole || 'guest')) loadAsset('hotw.js', 'NXHotw').then(() => NXHotw.home(hotwEl)).catch(() => {});
  // ---------- 📰 public feed posts on the home page (P6.1c) – assets/feed-public.js ----------
  const feedPubEl = $('[data-feed-public]');
  if (feedPubEl && flagOn('feed', baseRole || 'guest')) loadAsset('feed-public.js', 'NXFeedPublic').then(() => NXFeedPublic.home(feedPubEl)).catch(() => {});
  if (session && flagOn('presence', baseRole)) loadAsset('presence.js', 'NXPresence').then(() => NXPresence.start({ call, toast })).catch(() => {});
  // ---------- 🔑 the Hub clubhouse (board 10, BE8) – gold entrance tunnel + 3D room map – assets/hub.js ----------
  const hubworldEl = $('[data-hubworld]');
  if (hubworldEl && session && flagOn('hub', baseRole)) loadAsset('hub.js', 'NXHub').then(() => NXHub.init(hubworldEl, { call, toast, role: baseRole, flagOn: (n) => flagOn(n, baseRole), mountLive: flagOn('hubLive', baseRole) ? (slot) => loadAsset('hublive.js', 'NXHubLive').then(() => NXHubLive.mount(slot, { call, toast, api: MAPI, token: session.token, me: session.u, name: session.n, avatar: session.a, canWave: true })) : null, mountInsight: flagOn('statInsights', baseRole) && flagOn('insightWidget', baseRole) ? (slot, key) => loadAsset('insights.js', 'NXInsight').then(() => NXInsight.mount(slot, key, { call, toast, session, baseRole })) : null })).catch(() => {});

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
      el.innerHTML = `<div class="verified"><img src="${esc(c.avatar)}" alt=""${c.id && profilesOn ? ` data-hc="${esc(c.id)}" data-hc-name="${esc(c.name ?? '')}" data-hc-av="${esc(c.avatar)}" tabindex="0"` : ''}><div><b>✓ Verified NOREX member</b><span>${c.id && profilesOn ? `<a href="${BASE}member.html?u=${encodeURIComponent(c.id)}">${esc(c.name ?? '')}</a>` : esc(c.name ?? '')}${c.country && /^[A-Z]{2}$/.test(c.country) ? ` ${String.fromCodePoint(...[...c.country].map((x) => 0x1f1a5 + x.charCodeAt(0)))}` : ''}${c.platform ? ` · ${esc(c.platform)}` : ''}${c.positions?.length ? ` · ${c.positions.map(esc).join(' / ')}` : ''}</span>${c.bio ? `<p>${esc(c.bio)}</p>` : ''}</div></div>`;
    });
    if (flagOn('proBuilds', viewerRole)) $$('.member-badge[data-player]').forEach(async (el) => { // PB.4 – mini build cards
      const c = claims[el.dataset.player];
      if (!c?.id) return;
      try {
        const { picks } = await (await fetch(`${MAPI}/api/probuilds/player?u=${encodeURIComponent(c.id)}`, { cache: 'no-store', headers: session ? { Authorization: `Bearer ${session.token}` } : {} })).json();
        if (!picks?.league && !picks?.rush) return;
        if (!window.NXBuildCard) await new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/buildcard.js`, onload: ok, onerror: no })));
        const g = await NXBuildCard.ready();
        el.insertAdjacentHTML('beforeend', `<div class="pb-minis pb-player">${[['league', '🏟️ League build'], ['rush', '⚡ Rush build']].filter(([k]) => picks[k]).map(([k, l]) => NXBuildCard.mini(g, picks[k], { href: flagOn('builder', viewerRole) ? NXBuildCard.builderUrl(picks[k]) : undefined, head: `${l}${picks[k].position ? ` · ${picks[k].position}` : ''}` })).join('')}</div>`);
      } catch {}
    });
    $$('a.fut').forEach((a) => {
      const k = decodeURIComponent((a.getAttribute('href') || '').split('/').pop().replace('.html', ''));
      if (claims[k]) a.classList.add('is-verified');
    });
  })();

  const memberPage = $('#member-page');
  if (memberPage) {
    if (!session) memberPage.innerHTML = UI.empty({ icon: '🔒', title: 'Members only', text: 'Log in with Discord to see squad profiles.', action: `<a class="btn discord" href="${loginUrl()}">Log in with Discord</a>` });
    else if (!profilesOn) memberPage.innerHTML = UI.empty({ icon: '🚧', title: 'Coming soon', text: 'Member profiles are still being built.' });
    else loadProfile().then(() => NXProfile.page(memberPage, profileCtx())).catch(() => toast('Could not load the profile – try again', true));
  }

  // ---------- Trials page: manager contacts + application form (P1.4 / P1.5) ----------
  const trialsPage = $('[data-trials-page]');
  if (trialsPage && flagOn('trials', baseRole || 'guest')) loadTrials().then(() => NXTrials.apply(trialsPage, { call, toast })).catch(() => {});

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
  const S = { tab: 'me', me: null, players: [], clubs: [], pub: {}, avail: null, locker: null, votes: null, rush: null, admin: null, adminTab: 'claims', sel: new Set(),
    subm: { type: 'feedback', q: '', rows: null }, reports: null }; // P8.1 / P8.3
  // Board 07: with the Locker Room on, the hub opens on the locker and the tab chips become a grouped side rail
  // (Me · Match nights · Squad · Tactics · Staff · Settings – same idea as the site menu); on phones it folds into a list.
  const lockerOn = flagOn('locker', baseRole) && flagOn('lockerRoom', baseRole); // board 07 redesign (flag lockerRoom)
  const lockerBasic = flagOn('locker', baseRole) && !lockerOn; // BE2 simple Locker Room tab for everyone else
  const HOME = lockerOn ? 'locker' : 'me';
  if (flagOn('dugout', baseRole)) S.adminTab = 'dugout'; // board 08: the manager portal opens on the Dugout
  const TABS = [...(lockerOn ? [['locker', '🎽 My locker']] : []), ['me', lockerOn ? '🪪 My profile' : '👤 My NOREX'], ...(lockerBasic ? [['locker', '🎽 Locker Room']] : []), ...(flagOn('events', baseRole) ? [['schedule', '🗓️ Schedule']] : []), ['availability', '📅 Availability'], ['votes', '⭐ MOTM votes'], ...(flagOn('myStats', baseRole) ? [['stats', '📊 My stats']] : []), ...(flagOn('rushLog', baseRole) ? [['rush', '⚡ Rush']] : []), ...(flagOn('scouting', baseRole) ? [['scout', '🔭 Scout']] : []), ...(flagOn('suggestions', baseRole) ? [['ideas', '💡 Ideas']] : []), ...(flagOn('awards', baseRole) ? [['awards', '🏆 Awards']] : []), ...(flagOn('rushSquads', baseRole) ? [['squads', '🤝 Squads']] : []), ...(flagOn('starRatings', baseRole) ? [['ratings', '🌟 Ratings']] : []), ...(flagOn('predictions', baseRole) ? [['predict', '🔮 Predict']] : []), ...(flagOn('recommendations', baseRole) ? [['teamup', '🎯 Team up']] : []), ...(flagOn('feedback', baseRole) ? [['feedback', '💌 Feedback']] : []), ...(flagOn('avatarCard', baseRole) ? [['card', '🎨 AI Card']] : []), ...(notifyOn ? [['alerts', '🔔 Alerts']] : []), ...(session.adm && (RANK[baseRole] ?? 0) >= RANK.manager ? [['manager', '🛡️ Manager']] : [])];

  const RAIL = [['Me', ['locker', 'me', 'stats', 'card', 'alerts']], ['Match nights', ['schedule', 'availability', 'votes', 'rush', 'predict', 'ratings']],
    ['Squad', ['squads', 'teamup', 'scout', 'awards', 'ideas', 'feedback']], ['Staff', ['manager']]];
  const tabLabel = Object.fromEntries(TABS);
  const railItem = (k) => tabLabel[k] ? `<button class="rail-i" type="button" data-tab="${k}"><span>${tabLabel[k]}</span><b class="rail-b" data-badge="${k}" hidden></b></button>` : '';
  hubEl.innerHTML = lockerOn ? `<div class="hub-shell"><nav class="hub-rail card" aria-label="Locker menu">
<div class="rail-me"><img src="${esc(session.a)}" alt=""><div><b>${esc(session.n)}</b><span id="role-tag">${roleTag(baseRole)}</span></div></div>
<button class="rail-toggle" type="button" aria-expanded="false">☰ <span id="rail-cur">Menu</span></button>
<div class="rail-groups">${RAIL.map(([g, ks]) => { const items = ks.map(railItem).join(''); return items ? `<div class="rail-g"><small>${g}</small>${items}</div>` : ''; }).join('')}
<div class="rail-g"><small>Tactics</small><a class="rail-i" href="${BASE}tactics.html"><span>🧠 Playbook &amp; tactics</span><b class="rail-b" data-badge="playbook" hidden></b></a>${flagOn('builder', baseRole) ? `<a class="rail-i" href="${BASE}builder.html"><span>🧬 My builds</span><b class="rail-b" data-badge="builds" hidden></b></a>` : ''}</div>
<div class="rail-g"><small>Settings</small><button class="rail-i" id="logout" type="button"><span>🚪 Log out</span></button></div></div></nav>
<div id="panel"></div></div>` : `<div class="hub-head card"><img src="${esc(session.a)}" alt=""><div><small class="muted">Logged in as</small><h2>${esc(session.n)}</h2><span id="role-tag">${roleTag(baseRole)}</span></div><button class="btn ghost" id="logout" type="button">Log out</button></div>
<div class="chipset hub-tabs">${TABS.map(([k, l]) => `<button class="chip" type="button" data-tab="${k}">${l}</button>`).join('')}</div>
<div id="panel"></div>`;
  $('#logout').onclick = logout;
  const tabsEl = $('.hub-tabs') || $('.hub-rail');
  tabsEl.onclick = (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) { go(b.dataset.tab); tabsEl.classList.remove('open'); $('.rail-toggle')?.setAttribute('aria-expanded', 'false'); }
    if (e.target.closest('.rail-toggle')) $('.rail-toggle').setAttribute('aria-expanded', tabsEl.classList.toggle('open'));
  };
  // Locker → rail badges (unread alerts, MOTM vote waiting, weekly awards open).
  const railBadges = (n) => { for (const [k, v] of Object.entries(n)) { const b = $(`[data-badge="${k}"]`, hubEl); if (b) { b.textContent = v; b.hidden = !v; } } };
  addEventListener('hashchange', () => go(location.hash.slice(1), false));
  const panel = $('#panel');

  function go(tab, push = true) {
    if (tab === 'alerts-settings') { tab = 'alerts'; push = false; } // bell → ⚙️ Settings
    if (/^schedule-\d+$/.test(tab)) { tab = 'schedule'; push = false; } // link to one event
    if (!TABS.some(([k]) => k === tab)) tab = HOME;
    S.tab = tab;
    if (tab !== 'locker') lockerLive(false);
    if (push) history.replaceState(null, '', `#${tab}`);
    $$('[data-tab]', tabsEl).forEach((c) => c.classList.toggle('on', c.dataset.tab === tab));
    const cur = $('#rail-cur'); if (cur) cur.textContent = tabLabel[tab] || 'Menu';
    draw();
    load(tab);
  }
  async function load(tab) {
    try {
      if (tab === 'availability') S.avail = await call('/api/availability');
      if (tab === 'locker' && lockerOn) { lockerLive(true); return; } // assets/locker.js loads its own data
      if (tab === 'locker') { S.locker = await call('/api/locker'); lockerLive(true); }
      if (tab === 'votes') S.votes = await call('/api/vote');
      if ((tab === 'rush' || tab === 'manager') && flagOn('rushLog', baseRole)) S.rush = await call('/api/rush/queue');
      if (tab === 'manager') {
        S.admin = await call('/api/admin/overview');
        S.squadweek = await call('/api/admin/squadweek').catch(() => null);
        if (S.admin.events?.length) await loadEvents().catch(() => {});
        if (S.adminTab === 'submissions') await loadSubmissions();
        if (S.adminTab === 'reports') await loadReports();
        if (S.adminTab === 'health') await loadHealth();
      }
      if (tab === S.tab) draw();
    } catch (e) { toast(e.message, true); }
  }
  // P8.1 – manager portal "full visibility": search + filter across submission types.
  async function loadSubmissions(type = S.subm.type, q = S.subm.q) {
    S.subm = { type, q, rows: null };
    draw();
    try { S.subm = { type, q, rows: (await call(`/api/admin/submissions?type=${type}&q=${encodeURIComponent(q)}`)).rows }; } catch (e) { toast(e.message, true); S.subm.rows = []; }
    if (S.adminTab === 'submissions') draw();
  }
  function exportCSV(rows, name) {
    const cols = ['at', 'author', 'subject', 'kind', 'body'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(c === 'at' ? new Date(r.at).toISOString() : r[c])).join(','))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `norex-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  // P8.3 – unified reported-content queue: posts, feedback, messages currently flagged for review.
  async function loadReports() {
    S.reports = null;
    draw();
    try { S.reports = (await call('/api/admin/reports')).items; } catch (e) { toast(e.message, true); S.reports = []; }
    if (S.adminTab === 'reports') draw();
  }
  // BE6 – Cloudflare Worker analytics + GitHub Actions status.
  async function loadHealth() {
    S.health = undefined;
    draw();
    try { S.health = await call('/api/admin/health'); } catch (e) { toast(e.message, true); S.health = null; }
    if (S.adminTab === 'health') draw();
  }
  const draw = () => { panel.innerHTML = ({ me: viewMe, locker: lockerOn ? () => '<div id="locker-panel"></div>' : viewLocker, availability: viewAvail,votes: viewVotes, rush: viewRush, stats: () => '<div id="stats-panel"></div>', scout: () => '<div id="scout-panel"></div>', alerts: () => '<div id="alerts-panel"></div>', ideas: () => '<div id="ideas-panel"></div>', schedule: () => '<div id="schedule-panel"></div>', awards: () => '<div id="awards-panel"></div>', squads: () => '<div id="squads-panel"></div>', ratings: () => '<div id="ratings-panel"></div>', predict: () => '<div id="predict-panel"></div>', teamup: () => '<div id="teamup-panel"></div>', feedback: () => '<div id="feedback-panel"></div>', card: () => '<div id="card-panel"></div>', manager: viewManager }[S.tab])(); bind(); };

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
${profilesOn ? '<div class="card" id="profile-editor" style="grid-column:1/-1"></div></div>' : `<div class="card"><h3>My profile</h3>
<label class="fld">Bio <textarea id="pf-bio" maxlength="280" rows="3" placeholder="Playstyle, favourite position, anything…">${esc(prof.bio || '')}</textarea></label>
<label class="fld">Positions (up to 3)</label><div class="chipset" id="pf-pos">${POS.map((p) => `<button type="button" class="chip${prof.positions?.includes(p) ? ' on' : ''}" data-p="${p}">${p}</button>`).join('')}</div>
<label class="fld">Platform <select id="pf-plat"><option value="">–</option>${['PS5', 'Xbox', 'PC'].map((x) => `<option${prof.platform === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
<button class="btn" data-act="profile" type="button">Save profile</button>${prof.updated ? `<small class="muted"> Saved ${ago(prof.updated)}</small>` : ''}</div></div>`}`;
  }

  // ----- Availability (multi-day select + bulk) -----
  // BE2 Locker Room – live refresh: a socket on /api/locker/ws gets a ping whenever something it shows changes
  // (RSVP, vote, a notification for me). The ping carries no data, so the page just re-reads /api/locker.
  // While the socket is down, a 60 s timer keeps the tab fresh instead.
  let lockerWs = null, lockerWsPing = null, lockerWsRetry = null, lockerTimer = null, lockerReload = null;
  const lockerRefresh = () => {
    clearTimeout(lockerReload);
    lockerReload = setTimeout(() => {
      if (S.tab !== 'locker') return;
      if (lockerOn) window.NXLocker?.refresh();
      else call('/api/locker').then((d) => { S.locker = d; if (S.tab === 'locker') draw(); }).catch(() => {});
    }, 150);
  };
  function lockerLive(on) {
    clearTimeout(lockerWsRetry); clearInterval(lockerWsPing); clearInterval(lockerTimer);
    if (lockerWs) { lockerWs.onclose = null; try { lockerWs.close(1000); } catch { /* already closed */ } lockerWs = null; }
    if (!on || !session || !MAPI || !window.WebSocket) return;
    lockerTimer = setInterval(() => { if (S.tab === 'locker' && document.visibilityState === 'visible' && !(lockerWs?.readyState === 1)) lockerRefresh(); }, 60000);
    let sock;
    try { sock = new WebSocket(`${MAPI.replace(/^http/, 'ws')}/api/locker/ws?t=${encodeURIComponent(session.token)}`); } catch { return; }
    lockerWs = sock;
    sock.onopen = () => { lockerWsPing = setInterval(() => { if (sock.readyState === 1) sock.send('ping'); }, 30000); };
    sock.onmessage = (e) => { if (e.data !== 'pong') lockerRefresh(); };
    sock.onclose = () => {
      clearInterval(lockerWsPing);
      if (lockerWs !== sock) return;
      lockerWs = null;
      if (S.tab === 'locker') lockerWsRetry = setTimeout(() => { if (S.tab === 'locker') lockerLive(true); }, 8000);
    };
  }
  // BE2 Locker Room – one /api/locker call: next match + RSVP + who's in, weekly award vote, unread alerts, new achievements.
  function viewLocker() {
    if (!S.locker) return UI.skeleton('cards', 3);
    const L = S.locker, n = L.next;
    const when = (t) => new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const answer = { yes: '✅ You\'re in', maybe: '🤔 Maybe', no: '❌ Can\'t make it' }[n?.mine] || '⏳ Not answered yet';
    const next = n ? `<div class="card locker-card"><small class="muted">Next up</small><h3>${esc(n.title || (n.type === 'league' ? 'League match' : 'Match night'))}</h3>
<p>🗓️ ${esc(when(n.start))}</p><p><b>${esc(answer)}</b> · ${n.inCount} in</p>
<div class="locker-in">${n.in.map((p) => `<span class="locker-av" title="${esc(p.n)}">${p.a ? `<img src="${esc(p.a)}" alt="">` : esc((p.n || '?')[0])}</span>`).join('')}${n.inCount > n.in.length ? `<span class="muted">+${n.inCount - n.in.length}</span>` : ''}</div>
<a class="btn sm" href="#schedule-${esc(n.id)}">Open event</a></div>` : '<div class="card locker-card"><p class="muted">Nothing scheduled yet.</p></div>';
    const vote = flagOn('awards', baseRole) ? `<div class="card locker-card"><small class="muted">Weekly awards</small><h3>${L.vote.voted ? '✅ You\'ve voted this week' : '🏆 Vote is open'}</h3>
<p class="muted">Closes ${esc(when(L.vote.closes))}</p><a class="btn sm" href="#awards">${L.vote.voted ? 'See awards' : 'Cast your vote'}</a></div>` : '';
    const alerts = notifyOn ? `<a class="card locker-card" href="#alerts"><small class="muted">Notifications</small><h3>🔔 ${L.unread ? `${L.unread} unread` : 'All caught up'}</h3></a>` : '';
    const ach = L.achievements.length ? `<div class="card locker-card"><small class="muted">New achievements</small><div class="locker-ach">${L.achievements.map((a) => `<span class="pill ${esc(a.tier)}">${esc(a.icon)} ${esc(a.name)}</span>`).join('')}</div></div>` : '';
    return `<div class="locker-grid">${next}${vote}${alerts}${ach}</div>`;
  }
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
  const FLAG_LEVELS = ['off', 'owner', 'managers', 'members', 'public']; // must match bot/roles.js FLAG_LEVELS
  const FLAG_ICON = { off: '⛔', owner: '👑', managers: '🛡️', members: '👥', public: '🌍' };
  const FLAG_WHO = { off: 'Nobody', owner: 'Owner only', managers: 'Managers + owner', members: 'Every logged-in member', public: 'Everyone, no login needed' };
  // BE4 Dugout: per day, can we field 9 from everyone who said yes (availability + event RSVPs).
  function dugoutSquad() {
    const days = S.squadweek?.days;
    if (!days) return '';
    return `<h3>Can we field 9?</h3><div class="dw-strip">${days.map((x) => `<div class="dw-day ${x.canField9 ? 'ok' : 'short'}"><b>${esc(fmtDay(x.date))}</b><span>${x.canField9 ? '✅ Full side' : `⚠️ ${x.yes.length}/9 yes`}</span><small class="muted">${x.yes.length} yes · ${x.maybe.length} maybe</small></div>`).join('')}</div>`;
  }
  function viewManager() {
    if (!S.admin) return UI.skeleton('rows', 5);
    const A = S.admin;
    const claims = Object.entries(A.claims).map(([user, c]) => ({ user, ...c }));
    const pending = claims.filter((c) => c.status === 'pending');
    const decided = claims.filter((c) => c.status !== 'pending').sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0));
    const users = Object.entries(A.users).sort(([, a], [, b]) => b.last - a.last);
    // Member chip with hover card: claimed player + role from the admin overview.
    const mem = (id, u, sub, size = 26) => { const c = A.claims[id]; const pl = c?.status === 'approved' ? c : null; return UI.member({ id, n: u.n, a: u.a, sub: sub ?? (pl ? `🪪 ${pl.playerName}` : ''), player: pl?.player, href: profilesOn ? `${BASE}member.html?u=${encodeURIComponent(id)}` : undefined }, { size }); };
    const rq = S.rush?.pending || [];
    const notesOn = flagOn('managerNotes', baseRole);
    const canSubm = S.me?.user?.perms?.includes('submissions.view'), canReports = S.me?.user?.perms?.includes('reports.view');
    const canHealth = S.me?.user?.perms?.includes('health.view');
    const boardroom = flagOn('boardroom', baseRole) && A.canEditFlags; // D6: the Boardroom already has Flags, Health and Requests – hide the old tabs for whoever gets it
    const sub = [...(flagOn('dugout', baseRole) ? [['dugout', '🧢 Dugout']] : []), ...(boardroom ? [['boardroom', '👑 Boardroom']] : []), ...(flagOn('insights', baseRole) && S.me?.user?.perms?.includes('insights.view') ? [['intel', '🧭 Intelligence']] : []), ['claims', `Claims${pending.length ? ` (${pending.length})` : ''}`], ...(flagOn('rushLog', baseRole) ? [['rush', `⚡ Rush${rq.length ? ` (${rq.length})` : ''}`]] : []), ['members', `Members (${users.length})`], ['week', 'Squad week'], ['votes', 'Votes'], ['activity', 'Activity'], ...(canSubm ? [['submissions', '📋 Submissions']] : []), ...(canReports ? [['reports', `🚩 Reports${S.reports?.length ? ` (${S.reports.length})` : ''}`]] : []), ...(flagOn('trials', baseRole) ? [['trials', '🧭 Trials']] : []), ...(notesOn ? [['notes', '📝 Notes']] : []), ...(flagOn('requests', baseRole) && !boardroom ? [['requests', '📨 Requests']] : []), ...(flagOn('gameRules', baseRole) && S.me?.user?.perms?.includes('game.edit') ? [['game', '🎮 Game rules']] : []), ...(flagOn('proBuilds', baseRole) && S.me?.user?.perms?.includes('builds.squad') ? [['builds', '🧬 Builds']] : []), ...(A.flags ? [['bot', '🤖 Bot settings'], ...(boardroom ? [] : [['flags', '🚩 Flags']])] : []), ...(canHealth && !boardroom ? [['health', '📈 Health']] : [])];
    if (!sub.some(([k]) => k === S.adminTab)) S.adminTab = sub[0][0]; // board 08: the Dugout first when its flag is on
    const body = {
      dugout: () => '<div id="dugout-panel"></div>',
      boardroom: () => '<div id="boardroom-panel"></div>', // board 09 – assets/boardroom.js
      intel: () => '<div id="intel-panel"></div>', // board 13 – assets/intel.js
      claims: () => `<h3>Waiting for approval</h3>${pending.length ? `<div class="claim-list">${pending.map((c) => `<div class="claim-row card"><img src="${esc(c.a)}" alt=""><div><b>${esc(c.n)}</b> wants <a href="${BASE}players/${encodeURIComponent(c.player)}.html">${esc(c.playerName)}</a>${c.taken ? ' <span class="tag">⚠️ already claimed by someone else</span>' : ''}<small class="muted">${ago(c.at)}</small></div><div class="row"><button class="btn sm" data-claim="approve" data-u="${c.user}" type="button">Approve</button><button class="btn ghost sm" data-claim="reject" data-u="${c.user}" type="button">Reject</button></div></div>`).join('')}</div>` : UI.empty({ icon: '🎉', title: 'Nothing waiting', text: 'New player claims show up here for approval.' })}
<h3 style="margin-top:24px">History</h3>${decided.length ? `<div class="tbl"><table><thead><tr><th>Member</th><th>Player</th><th>Status</th><th>By</th><th>When</th><th></th></tr></thead><tbody>${decided.map((c) => `<tr><td>${mem(c.user, c)}</td><td><a href="${BASE}players/${encodeURIComponent(c.player)}.html">${esc(c.playerName)}</a></td><td><span class="tag${c.status === 'approved' ? ' home' : ''}">${esc(c.status)}</span></td><td>${esc(c.decidedBy || '–')}</td><td>${c.decidedAt ? ago(c.decidedAt) : '–'}</td><td>${c.status === 'approved' ? `<button class="btn ghost sm" data-claim="unlink" data-u="${c.user}" type="button">Unlink</button>` : `<button class="btn ghost sm" data-claim="approve" data-u="${c.user}" type="button">Approve</button>`}</td></tr>`).join('')}</tbody></table></div>` : UI.empty({ icon: '🗂️', title: 'No decisions yet' })}`,
      rush: () => `<h3>Waiting for confirmation</h3>${rq.length ? `<div class="rush-list">${rq.map((m) => `<div class="rush-item card"><div class="vote-head">${rushTitle(m)}</div>${rushPlayers(m)}
<div class="row">${UI.member({ id: m.by.id, n: m.by.n, a: m.by.a, sub: `logged ${UI.ago(m.at)}` }, { size: 24 })}<span class="grow"></span><button class="btn sm" type="button" data-rush="confirm" data-id="${m.id}">✅ Confirm</button><button class="btn ghost sm" type="button" data-rush="reject" data-id="${m.id}">Reject</button></div></div>`).join('')}</div>`
    : UI.empty({ icon: '🎉', title: 'Nothing waiting', text: 'Rush results sent by members show up here for a quick check.' })}
<h3 style="margin-top:24px">Last 30 days</h3>${S.rush?.recent?.length ? `<div class="tbl"><table><thead><tr><th>Match</th><th>Logged by</th><th>Status</th><th>By</th><th>When</th><th></th></tr></thead><tbody>${S.rush.recent.map((m) => `<tr><td>${pill(m.res)} ${m.gf}–${m.ga} vs ${esc(m.opp)} <small class="muted">${esc(m.date)}</small></td><td>${esc(m.by.n || '–')}</td><td><span class="tag ${RSTAT[m.status][1]}">${esc(m.status)}</span></td><td>${esc(m.decidedBy || '–')}</td><td>${m.decidedAt ? ago(m.decidedAt) : '–'}</td><td>${m.status === 'confirmed' ? `<button class="btn ghost sm" type="button" data-rush="remove" data-id="${m.id}">Remove</button>` : m.status === 'rejected' ? `<button class="btn ghost sm" type="button" data-rush="confirm" data-id="${m.id}">Confirm</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : UI.empty({ icon: '🗂️', title: 'No decisions yet' })}`,
      members: () => `<div class="tbl"><table><thead><tr><th>Member</th><th>Role</th><th>Player</th><th>Positions</th><th>Platform</th><th>This week</th><th class="n">Logins</th><th>Last seen</th>${notesOn ? '<th>Notes</th>' : ''}<th></th></tr></thead><tbody>${users.map(([id, u]) => {
        const c = A.claims[id], pf = A.profiles[id] || {};
        return `<tr><td>${mem(id, u, u.tag ? `@${u.tag}` : '')}</td><td>${roleTag(u.role === 'member' || !u.role ? (u.admin ? 'manager' : c?.status === 'approved' ? 'claimed' : 'member') : u.role)}</td><td>${c ? `${esc(c.playerName)} <small class="muted">(${esc(c.status)})</small>` : '–'}</td><td>${esc((pf.positions || []).join(' / ') || '–')}</td><td>${esc(pf.platform || '–')}</td><td class="wk">${A.availability.map((d) => `<span data-tip="${esc(fmtDay(d.date))}">${ICON[d.byUser[id]?.s] || '·'}</span>`).join('')}</td><td class="n">${u.logins || 1}</td><td>${ago(u.last)}</td>${notesOn ? `<td><button class="tr-note-btn" type="button" data-notes="${esc(id)}" data-tip="Private manager notes">📝</button></td>` : ''}<td><button class="tr-note-btn" type="button" data-drill="${esc(id)}" data-tip="Open profile or activity log">🔎</button></td></tr>`;
      }).join('')}</tbody></table></div>`,
      week: () => `${dugoutSquad()}${window.NXEvents && A.events ? NXEvents.weekTable(A.events, users, mem) : ''}<div class="tbl"><table class="grid-week"><thead><tr><th>Member</th>${A.availability.map((d) => `<th>${esc(fmtDay(d.date))}</th>`).join('')}</tr></thead><tbody>${users.map(([id, u]) => `<tr><td>${mem(id, u)}</td>${A.availability.map((d) => `<td class="c s-${d.byUser[id]?.s || 'none'}">${ICON[d.byUser[id]?.s] || ''}</td>`).join('')}</tr>`).join('')}
<tr class="tot"><td><b>Available</b></td>${A.availability.map((d) => { const v = Object.values(d.byUser); return `<td class="c"><b>${v.filter((x) => x.s === 'yes').length}</b><small> +${v.filter((x) => x.s === 'maybe').length}?</small></td>`; }).join('')}</tr></tbody></table></div>`,
      votes: () => `<div class="votes">${A.votes.map((m) => `<div class="card vote"><div class="vote-head">${pill(m.res)} <b>${m.gf}–${m.ga} vs ${esc(m.opp)}</b><small class="muted">${m.voters.length} votes</small></div>${m.voters.length ? `<ul class="voters">${m.voters.map((v) => `<li><img class="av" src="${esc(v.a)}" alt=""> ${esc(v.n)} → <b>${esc(v.pn || '?')}</b></li>`).join('')}</ul>` : '<p class="muted">No votes yet.</p>'}</div>`).join('')}</div>`,
      activity: () => `<div class="row" style="margin-bottom:12px"><select id="act-filter"><option value="">Everyone</option>${users.map(([id, u]) => `<option value="${id}"${S.actFilter === id ? ' selected' : ''}>${esc(u.n)}</option>`).join('')}</select></div>
<ul class="feed">${A.activity.filter((a) => !S.actFilter || a.u === S.actFilter).map((a) => `<li><span class="ic">${ACT[a.type] || '•'}</span><div>${mem(a.u, a, '', 22)} ${ACT_TXT[a.type] || esc(a.type)}${a.detail ? ` <span class="muted">${esc(a.detail)}</span>` : ''}</div><small class="muted">${ago(a.at)}</small></li>`).join('') || `<li>${UI.empty({ icon: '📜', title: 'No activity yet', text: S.actFilter ? 'This member has not done anything yet.' : '' })}</li>`}</ul>`,
      submissions: () => { // P8.1 – full visibility: feedback, ratings, award votes, predictions, suggestions, builds
        const SUBM_LABEL = { feedback: '💌 Feedback', ratings: '🌟 Ratings', awardVotes: '🏆 Award votes', predictions: '🔮 Predictions', suggestions: '💡 Suggestions', builds: '🧬 Builds' };
        const rows = S.subm.rows;
        return `<div class="row" style="margin-bottom:12px;flex-wrap:wrap;gap:8px"><select id="subm-type">${Object.entries(SUBM_LABEL).map(([k, l]) => `<option value="${k}"${S.subm.type === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
<input id="subm-q" placeholder="Search author, text…" value="${esc(S.subm.q)}" style="flex:1;min-width:160px"><button class="btn ghost sm" type="button" id="subm-search">Search</button>
<button class="btn ghost sm" type="button" id="subm-csv"${rows?.length ? '' : ' disabled'}>⬇️ Export CSV</button></div>
${rows === null ? UI.skeleton('rows', 5) : rows.length ? `<div class="tbl"><table><thead><tr><th>When</th><th>Author</th><th>Subject</th><th>Detail</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${ago(r.at)}</td><td>${esc(r.author ?? '–')}</td><td>${esc(r.subject ?? '–')}</td><td>${r.kind ? `<span class="tag">${esc(r.kind)}</span> ` : ''}${esc((r.body || '').slice(0, 160))}${r.reported ? ` ${UI.pill('reported', { emoji: '🚩', tone: 'loss' })}` : ''}</td></tr>`).join('')}</tbody></table></div>` : UI.empty({ icon: '📭', title: 'Nothing here yet' })}`;
      },
      reports: () => { // P8.3 – unified reported-content review queue
        const items = S.reports;
        const src = { post: ['📰 Post', 'feed.js'], feedback: ['💌 Feedback', 'feedback.js'], message: ['💬 Message', 'chat.js'] };
        return `<p class="muted small">Everything currently flagged by a member, across the feed, anonymous feedback and DMs/groups.</p>
${items === null ? UI.skeleton('rows', 4) : items.length ? `<div class="claim-list">${items.map((r) => `<div class="claim-row card"><div><span class="tag">${src[r.source]?.[0] ?? r.source}</span> <b>${esc(r.author ?? '–')}</b>${r.reason ? ` <span class="muted">“${esc(r.reason)}”</span>` : ''}<div class="muted small">${esc(r.excerpt || '')}</div><small class="muted">${ago(r.at)}</small></div><div class="row">${r.link ? `<a class="btn ghost sm" href="${esc(r.link)}">Open</a>` : ''}<button class="btn ghost sm" type="button" data-report-clear="${r.source}" data-id="${r.id}">✅ Clear</button><button class="btn ghost sm danger" type="button" data-report-remove="${r.source}" data-id="${r.id}">🗑 Remove</button></div></div>`).join('')}</div>` : UI.empty({ icon: '🎉', title: 'Nothing reported', text: 'Flagged posts, feedback and messages show up here.' })}`;
      },
      trials: () => '<div id="trials-admin"></div>', // P1.5 – drawn by assets/trials.js
      notes: () => '<div id="notes-admin"></div>', // P5.7
      requests: () => '<div id="requests-admin"></div>', // P5.6 – drawn by assets/notify.js
      game: () => `<div id="game-admin">${UI.skeleton('rows', 4)}</div>`, // PB.1 – drawn by assets/game.js
      bot: () => `<div id="bot-admin">${UI.skeleton('rows', 4)}</div>`, // P7.5 – drawn by assets/settings.js
      builds: () => `<div id="builds-admin">${UI.skeleton('rows', 4)}</div>`, // PB.4 – drawn by assets/probuilds.js
      // BE5 – live D1-backed flags. Owner can edit the level here and it's live on the next request, no
      // deploy; "Site copy" still shows config.json's committed level (what a fresh build/deploy ships).
      flags: () => `<h3>🚩 Feature flags</h3><p class="muted small">New features start as <b>Owner</b> (only you see them) and get switched on at the QA checkpoints. Levels: off · owner · managers · members · public.${A.canEditFlags ? ' Changes here are live immediately – no deploy needed.' : ''}</p>
${Object.keys(A.flags).length ? `<div class="tbl"><table><thead><tr><th>Feature</th><th>Level</th><th>Who sees it</th><th>Committed</th>${A.canEditFlags ? '<th></th>' : ''}</tr></thead><tbody>${Object.entries(A.flags).map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${A.canEditFlags ? `<select data-flag-set="${esc(k)}">${FLAG_LEVELS.map((l) => `<option value="${l}"${l === v ? ' selected' : ''}>${FLAG_ICON[l]} ${l}</option>`).join('')}</select>` : UI.pill(v, { emoji: FLAG_ICON[v], tone: v === 'public' ? 'win' : v === 'off' ? 'loss' : v === 'owner' ? 'gold' : 'draw' })}</td><td>${esc(FLAG_WHO[v] || '–')}</td><td>${FLAGS[k] === v ? '✅' : `<span class="tag" data-tip="Overridden live – a fresh deploy would ship ${esc(FLAGS[k] || 'missing')}">${esc(FLAGS[k] || 'missing')}</span>`}</td>${A.canEditFlags ? `<td>${FLAGS[k] !== v ? `<button class="btn ghost sm" type="button" data-flag-reset="${esc(k)}" data-tip="Back to the committed level">↺</button>` : ''}</td>` : ''}</tr>`).join('')}</tbody></table></div>` : UI.empty({ icon: '🚩', title: 'No flags yet' })}`,
      // BE6 – Cloudflare Worker analytics (24h) + GitHub Actions run status, owner only.
      health: () => {
        const h = S.health;
        if (h === undefined) return UI.skeleton('rows', 4);
        if (h === null) return UI.empty({ icon: '📈', title: 'Could not load health data', text: 'Try refreshing.' });
        const a = h.analytics, runs = h.actions?.runs || [];
        const RUN_ICON = { success: '✅', failure: '⛔', cancelled: '◽', in_progress: '⏳', queued: '⏳' };
        return `<h3>☁️ Cloudflare Worker · last 24h</h3>${a?.ready ? `<div class="grid4"><div class="stat"><span>Requests</span><b>${a.requests.toLocaleString()}</b></div><div class="stat"><span>Errors</span><b>${a.errors.toLocaleString()}</b></div><div class="stat"><span>CPU p50</span><b>${a.cpuP50}ms</b></div><div class="stat"><span>CPU p99</span><b>${a.cpuP99}ms</b></div></div>`
          : `<p class="muted small">⚠️ ${esc(a?.error || 'Not available yet.')}${a?.error?.includes('token') ? ' Add a Cloudflare Analytics token – see the chat for click-by-click steps.' : ''}</p>`}
<h3 style="margin-top:20px">⚙️ GitHub Actions</h3>${runs.length ? `<div class="tbl"><table><thead><tr><th>Workflow</th><th>Branch</th><th>Status</th><th>When</th><th></th></tr></thead><tbody>${runs.map((r) => `<tr><td>${esc(r.name)}</td><td><code>${esc(r.branch)}</code></td><td>${RUN_ICON[r.conclusion || r.status] || '•'} ${esc(r.conclusion || r.status)}</td><td>${ago(r.at)}</td><td><a class="btn ghost sm" href="${esc(r.url)}" target="_blank" rel="noopener">Open</a></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted small">⚠️ ${esc(h.actions?.error || 'No runs found.')}</p>`}`;
      },
    };
    if (flagOn('dugout', baseRole)) { // D4: the manager sub-tabs as a grouped side rail (same buttons + data-sub, so every handler still works)
      const GROUPS = [['Match night', ['dugout', 'week', 'rush', 'votes']], ['People', ['claims', 'members', 'trials', 'notes', 'requests', 'submissions']],
        ['Club', ['boardroom', 'intel', 'activity', 'reports']], ['Game & tools', ['game', 'builds', 'bot', 'flags', 'health']]];
      const label = Object.fromEntries(sub), seen = new Set(GROUPS.flatMap(([, ks]) => ks));
      const groups = [...GROUPS, ['More', sub.map(([k]) => k).filter((k) => !seen.has(k))]];
      const item = (k) => label[k] ? `<button class="rail-i${S.adminTab === k ? ' on' : ''}" type="button" data-sub="${k}"${S.adminTab === k ? ' aria-current="page"' : ''}><span>${label[k]}</span></button>` : '';
      return `<div class="mgr-shell"><nav class="mgr-rail card" aria-label="Manager menu"><button class="rail-toggle mgr-toggle" type="button" aria-expanded="false">☰ <span>${label[S.adminTab] || 'Menu'}</span></button>
<div class="mgr-groups">${groups.map(([g, ks]) => { const items = ks.map(item).join(''); return items ? `<div class="rail-g"><small>${g}</small>${items}</div>` : ''; }).join('')}<div class="rail-g"><button class="rail-i" type="button" data-refresh><span>↻ Refresh</span></button></div></div></nav>
<div class="card mgr mgr-main">${body[S.adminTab]()}</div></div>`;
    }
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

  // P8.2 – "Open profile" or "View activity log" for one member.
  async function openDrill(id) {
    const u = S.admin.users[id];
    const canProfile = profilesOn;
    const canMod = S.me?.user?.perms?.includes('moderation.manage');
    const choice = await UI.modal({
      title: u?.n || 'Member', icon: '🔎',
      body: `<p class="muted">What do you want to see?</p>${u?.mutedUntil ? `<p class="small">🔇 Muted until ${new Date(u.mutedUntil).toLocaleString()}</p>` : ''}${u?.warnings?.length ? `<p class="small">⚠️ ${u.warnings.length} warning${u.warnings.length > 1 ? 's' : ''} on record</p>` : ''}`,
      actions: [
        ...(canProfile ? [{ label: 'Open profile', value: 'profile' }] : []),
        { label: 'View activity log', value: 'log' },
        ...(canMod ? [{ label: '⚠️ Warn', value: 'warn' }, { label: u?.mutedUntil ? '🔊 Unmute' : '🔇 Mute', value: 'mute' }] : []),
        { label: 'Cancel', value: null, kind: 'ghost' },
      ],
    });
    if (choice === 'profile') return void (location.href = `${BASE}member.html?u=${encodeURIComponent(id)}`);
    if (choice === 'warn') return void warnMember(id, u);
    if (choice === 'mute') return void muteMember(id, u);
    if (choice !== 'log') return;
    let d;
    try { d = await call(`/api/admin/member/${encodeURIComponent(id)}`); } catch (e) { return toast(e.message, true); }
    const row = (icon, label, items) => !items.length ? '' : `<h4>${icon} ${label}</h4><ul class="feed">${items}</ul>`;
    const body = `
${row('📜', 'Activity', d.activity.map((a) => `<li><span class="ic">${ACT[a.type] || '•'}</span><div>${ACT_TXT[a.type] || esc(a.type)}${a.detail ? ` <span class="muted">${esc(a.detail)}</span>` : ''}</div><small class="muted">${ago(a.at)}</small></li>`))}
${row('🪪', 'Claim history', (d.claim?.history || []).map((h) => `<li><div>${esc(h.action)} <span class="muted">${esc(h.player)}</span></div><small class="muted">${ago(h.at)} · ${esc(h.by || '–')}</small></li>`))}
${row('🔀', 'Role changes', (d.roleHistory || []).map((h) => `<li><div>${roleTag(h.from)} → ${roleTag(h.to)}</div><small class="muted">${ago(h.at)}</small></li>`))}
${row('⚠️', 'Warnings', (u?.warnings || []).map((w) => `<li><div>${esc(w.reason)}</div><small class="muted">${ago(w.at)} · ${esc(w.by)}</small></li>`))}
${row('🗳️', 'MOTM votes', d.votes.map((v) => `<li><div>voted <b>${esc(v.player)}</b></div><small class="muted">${ago(v.at)}</small></li>`))}
${row('🌟', 'Star ratings given', d.ratings.map((r) => `<li><div>${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)} → ${esc(r.player)}</div><small class="muted">${esc(r.week)} · ${ago(r.at)}</small></li>`))}
${row('📅', 'Availability', d.availability.map((a) => `<li><div>${esc(fmtDay(a.date))}: ${ICON[a.status] || a.status}</div><small class="muted">${ago(a.at)}</small></li>`))}
${row('📰', 'Posts', d.posts.map((p) => `<li><div>${p.removed ? '<i>(removed)</i> ' : ''}${esc((p.body || '').slice(0, 140))}</div><small class="muted">${esc(p.tag)} · ${ago(p.at)}</small></li>`))}
${row('💬', 'Messages', d.messages.map((m) => `<li><div>${m.kind === 'dm' ? 'DM' : `group “${esc(m.chatName || '')}”`}${m.reported ? ` ${UI.pill('reported', { emoji: '🚩', tone: 'loss' })}` : ''}${m.text != null ? `: ${esc(m.text.slice(0, 140))}` : ' <span class="muted">(content hidden)</span>'}</div><small class="muted">${ago(m.at)}</small></li>`))}
${row('📜', 'Acknowledged rules', d.acknowledgements.map((a) => `<li><div>Rules v${a.version}</div><small class="muted">${ago(a.at)}</small></li>`))}
${[d.activity, d.claim?.history, d.roleHistory, u?.warnings, d.votes, d.ratings, d.availability, d.posts, d.messages, d.acknowledgements].every((x) => !x || !x.length) ? UI.empty({ icon: '📭', title: 'Nothing on record yet' }) : ''}`;
    UI.modal({ title: `Activity log · ${u?.n ?? 'member'}`, icon: '📜', body, wide: true, actions: [{ label: 'Close', value: null, kind: 'ghost' }] });
  }
  // P8.3 – warn / mute a member from the portal.
  async function warnMember(id, u) {
    let text = '';
    const reason = await UI.modal({ title: `Warn ${u?.n ?? 'member'}`, icon: '⚠️', body: '<label class="fld">Reason<input id="warn-reason" maxlength="200" placeholder="What happened?"></label>', actions: [{ label: 'Send warning', value: 'ok' }, { label: 'Cancel', value: null, kind: 'ghost' }],
      onOpen: (el) => { const inp = $('#warn-reason', el); inp?.focus(); inp?.addEventListener('input', () => { text = inp.value.trim(); }); } });
    if (reason !== 'ok') return;
    if (!text) return toast('Give a reason', true);
    try { await call('/api/admin/warn', { user: id, reason: text }); S.admin = await call('/api/admin/overview'); draw(); toast('Warning sent'); } catch (e) { toast(e.message, true); }
  }
  async function muteMember(id, u) {
    if (u?.mutedUntil) {
      try { await call('/api/admin/mute', { user: id, hours: 0 }); S.admin = await call('/api/admin/overview'); draw(); toast('Unmuted'); } catch (e) { toast(e.message, true); }
      return;
    }
    const choice = await UI.modal({
      title: `Mute ${u?.n ?? 'member'}`, icon: '🔇', body: '<p class="muted small">They can still read everything – just can’t post, comment or message.</p>',
      actions: [{ label: '1 hour', value: 1 }, { label: '24 hours', value: 24 }, { label: '7 days', value: 168 }, { label: 'Cancel', value: null, kind: 'ghost' }],
    });
    if (!choice) return;
    try { await call('/api/admin/mute', { user: id, hours: choice }); S.admin = await call('/api/admin/overview'); draw(); toast('Muted'); } catch (e) { toast(e.message, true); }
  }

  // ----- event wiring for whatever panel is showing -----
  // Game rules editor (PB.1) lives in assets/game.js, loaded on first use.
  Object.assign(ACT, { 'game-publish': '🎮', 'game-dismiss': '🙈', 'build-save': '💾', 'build-update': '💾', 'build-delete': '🗑', 'build-fork': '🍴', 'probuild-post': '📣', 'probuild-unpost': '📤', 'probuild-remove': '🗑', 'probuild-feature': '⭐', 'probuild-comment': '💬', 'probuild-comment-remove': '🗑', mybuild: '🧬' });
  Object.assign(ACT_TXT, { 'build-save': 'saved a build', 'build-update': 'updated a build', 'build-delete': 'deleted a build', 'build-fork': 'forked a build', 'probuild-post': 'posted to Pro Builds', 'probuild-unpost': 'took a build down', 'probuild-remove': 'removed a Pro Builds post', 'probuild-feature': 'changed Club recommended', 'probuild-comment': 'commented on a build', 'probuild-comment-remove': 'removed a comment', mybuild: 'picked their build' });
  Object.assign(ACT_TXT, { 'game-publish': 'published game rules', 'game-dismiss': 'dismissed a patch-note cap mention' });
  const gameAdmin = (el) => new Promise((ok, no) => (window.NXGame ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/game.js`, onload: ok, onerror: no }))))
    .then(() => NXGame.portal(el, { call, toast })).catch(() => toast('Could not load the game rules editor', true));
  // Bot personalisation (P7.5) lives in assets/settings.js, loaded on first use.
  Object.assign(ACT, { 'bot-settings': '🤖' });
  Object.assign(ACT_TXT, { 'bot-settings': 'updated bot settings' });
  const botAdmin = (el) => new Promise((ok, no) => (window.NXBotSettings ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/settings.js`, onload: ok, onerror: no }))))
    .then(() => NXBotSettings.portal(el, { call, toast })).catch(() => toast('Could not load bot settings', true));
  // Trials funnel, scouting and manager notes (P1.5 / P5.5 / P5.7) live in assets/trials.js, loaded on first use.
  Object.assign(ACT, { 'trial-apply': '👑', 'trial-add': '➕', 'trial-status': '🧭', 'trial-link': '🪪', 'trial-session': '⚽', scout: '🔭', note: '📝', 'note-delete': '🗑' });
  Object.assign(ACT_TXT, { 'trial-apply': 'applied on the Trials page', 'trial-add': 'added a trial card', 'trial-status': 'moved a trial', 'trial-link': 'linked a trial to a player', 'trial-session': 'logged a trial session', scout: 'recommended a player', note: 'wrote a private note', 'note-delete': 'deleted a note' });
  Object.assign(ACT, { 'squads-prefs': '🤝', 'squads-save': '💾', 'squads-publish': '📣', 'squads-delete': '🗑' });
  Object.assign(ACT_TXT, { 'squads-prefs': 'picked Rush teammates', 'squads-save': 'saved Rush squads', 'squads-publish': 'published Rush squads', 'squads-delete': 'deleted Rush squads' });
  Object.assign(ACT, { 'star-rate': '🌟', predict: '🔮', 'feedback-send': '💌', 'feedback-report': '🚩', 'feedback-hide': '🙈', 'feedback-unhide': '👁' });
  Object.assign(ACT_TXT, { 'star-rate': 'rated a teammate', predict: 'predicted a score', 'feedback-send': 'sent anonymous feedback', 'feedback-report': 'reported feedback', 'feedback-hide': 'hid a feedback message', 'feedback-unhide': 'restored a feedback message' });
  Object.assign(ACT, { 'award-vote': '🏆', 'award-category': '🏅', 'award-category-remove': '🗑', 'award-close': '🔒' });
  Object.assign(ACT_TXT, { 'award-vote': 'voted in the weekly awards', 'award-category': 'added an award', 'award-category-remove': 'retired an award', 'award-close': 'closed the weekly awards' });
  Object.assign(ACT, { 'event-new': '🗓️', 'event-edit': '✏️', 'event-cancel': '🚫', 'event-rsvp': '✅', 'event-checkin': '🟢', 'event-lineup': '🧩', 'event-lineup-suggest': '✨', 'event-report': '📋' });
  Object.assign(ACT_TXT, { 'event-new': 'scheduled an event', 'event-edit': 'edited an event', 'event-cancel': 'cancelled an event', 'event-rsvp': 'answered an event', 'event-checkin': 'checked in', 'event-lineup': 'set a lineup', 'event-lineup-suggest': 'asked for a lineup suggestion', 'event-report': 'shared a session report' });
  Object.assign(ACT, { 'doc-new': '📚', 'doc-edit': '✏️', 'doc-remove': '🗑', 'doc-restore': '↩', 'doc-discord': '💬', 'rules-ack': '📜', 'rules-remind': '🔔', 'playstyle-edit': '🧠', suggest: '💡', 'suggest-status': '🛡️', 'suggest-remove': '🗑' });
  Object.assign(ACT_TXT, { 'doc-new': 'added to the club docs', 'doc-edit': 'edited the club docs', 'doc-remove': 'removed a doc', 'doc-restore': 'restored an older version', 'doc-discord': 'posted to Discord', 'rules-ack': 'acknowledged the rules', 'rules-remind': 'sent a rules reminder', 'playstyle-edit': 'edited the Play Style', suggest: 'sent an idea', 'suggest-status': 'answered an idea', 'suggest-remove': 'removed an idea' });
  Object.assign(ACT, { 'hotw-vote': '🎬', 'hotw-unvote': '↩', 'presence-hide': '🙈', 'presence-show': '🟢' });
  Object.assign(ACT_TXT, { 'hotw-vote': 'voted for the highlight of the week', 'hotw-unvote': 'took back a highlight vote', 'presence-hide': 'switched to appear offline', 'presence-show': 'is visible online again' });
  Object.assign(ACT, { announce: '📣', 'notify-ack': '✓', request: '📨', 'request-approved': '✅', 'request-rejected': '⛔', 'request-undone': '↩' });
  Object.assign(ACT_TXT, { announce: 'sent an announcement', 'notify-ack': 'acknowledged an announcement', request: 'sent a request', 'request-approved': 'approved a request', 'request-rejected': 'rejected a request', 'request-undone': 'undid a request' });
  Object.assign(ACT, { 'post-report': '🚩', 'post-unreport': '✅', 'message-remove': '🗑', 'message-unreport': '✅', warn: '⚠️', mute: '🔇', unmute: '🔊', 'role-change': '🔀' }); // P8.3
  Object.assign(ACT_TXT, { 'post-report': 'reported a feed post', 'post-unreport': 'cleared a report', 'message-remove': 'removed a message', 'message-unreport': 'cleared a message report', warn: 'warned a member', mute: 'muted a member', unmute: 'unmuted a member', 'role-change': 'changed role' });
  Object.assign(ACT, { 'flag-change': '🚩' }); // BE5
  Object.assign(ACT_TXT, { 'flag-change': 'changed a feature flag' });
  const trialsCtx = () => ({ call, toast, role: S.me?.user?.role ?? baseRole, perms: S.me?.user?.perms ?? [], me: { u: session.u, n: session.n, a: session.a }, admin: S.admin, players: Array.isArray(S.players) ? S.players : [], flagTrials: flagOn('trials', baseRole),
    mountNote: flagOn('statInsights', S.me?.user?.role ?? baseRole) && flagOn('insightWidget', S.me?.user?.role ?? baseRole) ? (slot, key, opts) => (window.NXInsight ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/insights.js`, onload: ok, onerror: no })))).then(() => NXInsight.mount(slot, key, { call, toast, session, baseRole, ...opts })) : null });
  const withTrials = (fn) => loadTrials().then(() => fn(window.NXTrials, trialsCtx())).catch(() => toast('Could not load this part – try again', true));
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
      const mgrToggle = e.target.closest?.('.mgr-toggle');
      if (mgrToggle) mgrToggle.setAttribute('aria-expanded', String(mgrToggle.closest('.mgr-rail').classList.toggle('open')));
      if (d.sub) {
        S.adminTab = d.sub; draw();
        if (d.sub === 'submissions' && S.subm.rows === null) loadSubmissions();
        if (d.sub === 'reports' && S.reports === null) loadReports();
        if (d.sub === 'health' && S.health === undefined) loadHealth();
      }
      if (d.flagReset) {
        try { S.admin.flags = (await call('/api/admin/flags/reset', { name: d.flagReset })).flags; draw(); toast(`${d.flagReset}: back to committed`); } catch (er) { toast(er.message, true); }
      }
      if (t.id === 'subm-search') loadSubmissions(S.subm.type, $('#subm-q').value.trim());
      if (t.id === 'subm-csv' && S.subm.rows?.length) exportCSV(S.subm.rows, S.subm.type);
      if (d.reportClear || d.reportRemove) {
        const source = d.reportClear ?? d.reportRemove, id = d.id;
        const remove = !!d.reportRemove;
        if (remove && !(await UI.confirm({ title: 'Remove this content?', text: 'It disappears from the site. This can’t be undone.', ok: 'Remove', danger: true }))) return;
        try {
          if (source === 'post') await call(remove ? '/api/feed/delete' : '/api/feed/unreport', { id: Number(id) });
          else if (source === 'feedback') await call('/api/feedback/hide', { id: Number(id), hidden: remove });
          else await call(`/api/chats/reports/${id}`, { action: remove ? 'remove' : 'clear' });
          S.reports = S.reports.filter((r) => !(r.source === source && String(r.id) === String(id)));
          draw();
          toast(remove ? 'Removed' : 'Report cleared');
        } catch (er) { toast(er.message, true); }
      }
      if (d.notes) { const u = S.admin.users[d.notes]; withTrials((T, ctx) => T.notesModal(ctx, { kind: 'member', subject: d.notes, title: `Notes · ${u?.n ?? 'member'}`, player: S.admin.claims?.[d.notes]?.status === 'approved' ? S.admin.claims[d.notes].player : '' })); }
      if (d.drill) openDrill(d.drill);
      if (d.refresh !== undefined) { S.admin = null; draw(); load('manager'); }
      if (d.claim) {
        const c = S.admin.claims[d.u];
        if (d.claim !== 'approve' && !(await UI.confirm({ title: d.claim === 'unlink' ? 'Unlink player?' : 'Reject claim?', text: `${c.n} → ${c.playerName}. ${d.claim === 'unlink' ? 'They lose the verified badge until a manager approves again.' : 'They can send a new claim afterwards.'}`, ok: d.claim === 'unlink' ? 'Unlink' : 'Reject', danger: true }))) return;
        decide(d.u, d.claim);
      }
    };
    panel.onchange = async (e) => {
      if (e.target.id === 'act-filter') { S.actFilter = e.target.value; draw(); }
      if (e.target.id === 'subm-type') loadSubmissions(e.target.value, S.subm.q);
      if (e.target.dataset.f === 'k') { const g = $('[data-f="n"]', e.target.parentElement); g.hidden = e.target.value !== '__guest'; if (!g.hidden) g.focus(); }
      if (e.target.dataset.flagSet) {
        const name = e.target.dataset.flagSet, level = e.target.value;
        try { S.admin.flags = (await call('/api/admin/flags', { name, level })).flags; draw(); toast(`${name} → ${level}`); } catch (er) { toast(er.message, true); draw(); }
      }
    };
    const pe = $('#profile-editor', panel);
    if (pe) loadProfile().then(() => NXProfile.editor(pe, profileCtx({ onSaved: (p) => { S.me.profile = p; } }), S.me.profile)).catch(() => toast('Could not load the profile editor', true));
    const ga = $('#game-admin', panel);
    if (ga) gameAdmin(ga);
    const bta = $('#bot-admin', panel);
    if (bta) botAdmin(bta);
    const ba = $('#builds-admin', panel); // PB.4 squad builds by position
    if (ba) (window.NXProBuilds ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/probuilds.js`, onload: ok, onerror: no })))).then(() => NXProBuilds.portal(ba)).catch(() => toast('Could not load the builds – try again', true));
    for (const [id, fn] of [['#trials-admin', 'portal'], ['#notes-admin', 'notesTab'], ['#scout-panel', 'scout']]) { const el = $(id, panel); if (el) withTrials((T, ctx) => T[fn](el, ctx)); }
    const sp = $('#stats-panel', panel); // P2.6 personal dashboard – assets/mystats.js
    if (sp) (window.NXMyStats ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/mystats.js`, onload: ok, onerror: no }))))
      .then(() => NXMyStats.tab(sp, { call, toast, me: { u: session.u, n: session.n, a: session.a }, claim: S.me?.claim, players: () => api().then(([p]) => p), flagOn: (f) => flagOn(f, S.me?.user?.role ?? baseRole) }))
      .catch(() => toast('Could not load your stats – try again', true));
    const dg = $('#dugout-panel', panel); // board 08 Dugout – assets/dugout.js
    if (dg) (window.NXDugout ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/dugout.js`, onload: ok, onerror: no }))))
      .then(() => NXDugout.mount(dg, { call, toast, UI, base: BASE, me: { u: session.u, n: session.n, a: session.a }, admin: () => S.admin, squadweek: () => S.squadweek, players: () => S.players, decide, canAnnounce: !!S.me?.user?.perms?.includes('notify.announce'), flagOn: (f) => flagOn(f, S.me?.user?.role ?? baseRole),
        mountNote: flagOn('statInsights', S.me?.user?.role ?? baseRole) && flagOn('insightWidget', S.me?.user?.role ?? baseRole) ? (slot, key, opts) => loadAsset('insights.js', 'NXInsight').then(() => NXInsight.mount(slot, key, { call, toast, session, baseRole, ...opts })) : null }))
      .catch(() => toast('Could not load the Dugout – try again', true));
    const br = $('#boardroom-panel', panel); // board 09 Boardroom – assets/boardroom.js
    if (br) (window.NXBoardroom ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/boardroom.js`, onload: ok, onerror: no }))))
      .then(() => NXBoardroom.mount(br, { call, toast, UI, base: BASE, admin: () => S.admin, players: () => S.players, committed: () => FLAGS, viewAs: () => S.me?.user?.viewAsOptions || [],
        canAnnounce: !!S.me?.user?.perms?.includes('notify.announce'), flagOn: (f) => flagOn(f, S.me?.user?.role ?? baseRole), onFlags: (f) => { S.admin.flags = f; },
        actIcon: (t) => ACT[t] || '•', actText: (t) => ACT_TXT[t] || t, requests: (el) => loadNotify().then(() => NXNotify.requestsPortal(el, notifyCtx())).catch(() => {}) }))
      .catch(() => toast('Could not load the Boardroom – try again', true));
    const ix = $('#intel-panel', panel); // board 13 Club Intelligence – assets/intel.js
    if (ix) (window.NXIntel ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/intel.js`, onload: ok, onerror: no }))))
      .then(() => NXIntel.mount(ix, { call, toast, UI }))
      .catch(() => toast('Could not load Club Intelligence – try again', true));
    const lk = $('#locker-panel', panel); // board 07 Locker Room – assets/locker.js
    if (lk) (window.NXLocker ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/locker.js`, onload: ok, onerror: no }))))
      .then(() => NXLocker.tab(lk, { call, toast, base: BASE, me: { u: session.u, n: session.n, a: session.a }, claim: () => S.me?.claim, players: () => S.players, flagOn: (f) => flagOn(f, S.me?.user?.role ?? baseRole), badges: railBadges,
        mountNote: flagOn('statInsights', S.me?.user?.role ?? baseRole) && flagOn('insightWidget', S.me?.user?.role ?? baseRole) ? (slot, key) => (window.NXInsight ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/insights.js`, onload: ok, onerror: no })))).then(() => NXInsight.mount(slot, key, { call, toast, session, baseRole })) : null }))
      .catch(() => toast('Could not load your locker – try again', true));
    const ap = $('#alerts-panel', panel), ra = $('#requests-admin', panel);
    if (ap) loadNotify().then(() => NXNotify.tab(ap, notifyCtx())).catch(() => toast('Could not load notifications – try again', true));
    if (ra) loadNotify().then(() => NXNotify.requestsPortal(ra, notifyCtx())).catch(() => toast('Could not load requests – try again', true));
    const sc = $('#schedule-panel', panel); // P3.1–P3.7 schedule, RSVPs, match night – assets/events.js
    if (sc) loadEvents().then(() => NXEvents.schedule(sc, { call, toast, me: { u: session.u, n: session.n, a: session.a } })).catch(() => toast('Could not load the schedule – try again', true));
    const sq = $('#squads-panel', panel); // P3.5 Rush squad builder – assets/squads.js (+ squadgen.js for managers)
    if (sq) (window.NXSquads ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/squads.js`, onload: ok, onerror: no }))))
      .then(() => NXSquads.tab(sq, { call, toast, me: { u: session.u, n: session.n, a: session.a } })).catch(() => toast('Could not load Rush squads – try again', true));
    const aw = $('#awards-panel', panel); // P4.1 weekly awards – assets/awards.js
    if (aw) loadAwards().then(() => NXAwards.tab(aw, { call, toast, me: { u: session.u, n: session.n, a: session.a } })).catch(() => toast('Could not load the awards – try again', true));
    // Wave 10: P4.2 star ratings · P3.8 predictions · P3.6 who to play with · P4.4 anonymous feedback
    for (const [id, file, glob, label] of [['#ratings-panel', 'ratings.js', 'NXRatings', 'star ratings'], ['#predict-panel', 'predict.js', 'NXPredict', 'predictions'], ['#teamup-panel', 'recs.js', 'NXRecs', 'recommendations'], ['#feedback-panel', 'feedback.js', 'NXFeedback', 'feedback'], ['#card-panel', 'avatarcard.js', 'NXAvatarCard', 'AI card']]) {
      const el = $(id, panel);
      if (el) (window[glob] ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/${file}`, onload: ok, onerror: no }))))
        .then(() => window[glob].tab(el, { call, toast, me: { u: session.u, n: session.n, a: session.a } })).catch(() => toast(`Could not load the ${label} – try again`, true));
    }
    const ip = $('#ideas-panel', panel); // P5.4 suggestion box – assets/docs.js
    if (ip) loadDocs().then(() => NXDocs.ideas(ip, { call, toast, me: { u: session.u, n: session.n, a: session.a } })).catch(() => toast('Could not load the ideas – try again', true));
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
      go(location.hash.slice(1) || HOME, false);
      if (flagOn('badges', me.user.role)) (window.NXBadges ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/badges.js`, onload: ok, onerror: no })))) // P4.3 unlock toast
        .then(() => NXBadges.checkUnlocks({ call })).catch(() => {});
    } catch (e) { panel.innerHTML = `<div class="card"><p>⚠️ ${esc(e.message)}</p></div>`; }
  })();
})();

// ================= League ⇄ Rush (P0.4) =================
// Any `[data-modes]` block (built by modes() in build.mjs) gets a switch; the choice is remembered and shared by
// every switch on the page. Rush views are drawn from confirmed results in the member API (`/api/rush`).
if (MAPI && $('[data-modes]')) (() => {
  const KEY = 'norex_mode';
  const saved = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  let mode = /^#rush-\d+$/.test(location.hash) || saved === 'rush' ? 'rush' : saved === 'friendly' ? 'friendly' : 'league';
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

  // Rush → the shared metrics engine (web/metrics.js, loaded on the pages that use these views – P1.2 / P4.5).
  const mx = (matches) => matches.map((m) => ({ id: m.id, ts: Date.parse(m.date + 'T12:00:00Z') / 1000, gf: m.gf, ga: m.ga, res: m.res, players: m.players.map((p) => ({ k: p.k, n: p.n, g: p.g, a: p.a, r: p.r, motm: p.motm, pos: p.pos })) }));
  const mxCtx = (known, id) => ({ esc, id, link: (p) => who(p, known), empty: empty('No Rush stats yet', 'Leaderboards fill in as Rush results are confirmed.'), note: 'Rush has no minutes or shots, so rates are per game.' });
  const views = {
    months: ({ matches, known }) => NXMetrics.leadersHtml(mxCtx(known, 'rush'), mx(matches), { minutes: false, seasonLabel: 'All Rush' }),
    advanced: ({ matches, known }) => NXMetrics.advancedHtml(mxCtx(known, 'rush-adv'), mx(matches), { minutes: false }),
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
      window.NXMetrics?.wire(el);
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
      // Friendly (P1.8) only exists on some blocks – the others fall back to League.
      const k = $(`:scope > [data-mode="${m}"]`, b) ? m : 'league';
      $$('.mode-switch [role=tab]', b).forEach((t) => { const on = t.dataset.key === k; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      $$(':scope > [data-mode]', b).forEach((p) => (p.hidden = p.dataset.mode !== k));
      if (k === 'rush') $$(':scope > [data-rush]', b).forEach(drawRush);
      else $$(`:scope > [data-mode=${k}] .reveal:not(.in)`, b).forEach((x) => x.classList.add('in'));
    }
  }
  $$('[data-modes] .mode-switch').forEach((el) => UI.tabs(el, (k) => set(k, true)));
  addEventListener('hashchange', () => { if (/^#rush-\d+$/.test(location.hash)) { const d = $(location.hash); if (d) d.open = true; else set('rush'); } });
  set(mode);
})();

// ================= Match calendar filter (P1.8) =================
// `.calbar[data-cal=<id>]` (calendar() in build.mjs): month chips or a day narrow every [data-day] item inside #id.
// Uses a class, not `hidden`, so it stacks with the table search filter.
for (const bar of $$('[data-cal]')) {
  const scope = document.getElementById(bar.dataset.cal);
  if (!scope) continue;
  const day = $('input[type=date]', bar), out = $('.cal-count', bar), chips = $$('[data-month]', bar);
  let month = 'all';
  const apply = () => {
    const d = day.value, ids = new Set();
    for (const el of $$('[data-day]', scope)) {
      const on = d ? el.dataset.day === d : month === 'all' || el.dataset.day.startsWith(month);
      el.classList.toggle('cal-out', !on);
      if (on) ids.add(el.dataset.id);
    }
    out.textContent = d || month !== 'all' ? (ids.size ? `${ids.size} match${ids.size === 1 ? '' : 'es'}` : 'No matches that day – pick another') : '';
  };
  const pick = (k) => chips.forEach((c) => { c.classList.toggle('on', c.dataset.month === k); c.setAttribute('aria-pressed', c.dataset.month === k); });
  chips.forEach((c) => c.addEventListener('click', () => { month = c.dataset.month; day.value = ''; pick(month); apply(); }));
  day.addEventListener('change', () => { month = day.value ? day.value.slice(0, 7) : 'all'; pick(chips.some((c) => c.dataset.month === month) ? month : 'all'); apply(); });
}

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
