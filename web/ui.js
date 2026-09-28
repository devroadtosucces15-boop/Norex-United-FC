// Shared member UI kit (window.UI): avatar chips, hover cards, modal/confirm, tabs, toasts, empty states,
// skeletons, lightbox, pills and relative time. Loaded before app.js; every piece returns HTML strings or
// promises so views stay template-literal based.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '';
  const coarse = matchMedia('(hover: none)').matches;

  // ---------- relative time ----------
  const toMs = (t) => (typeof t === 'number' ? t : new Date(t).getTime());
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  // Compact: "just now", "5m ago", "3h ago", "2d ago", then a date.
  function ago(t) {
    const m = Math.round((Date.now() - toMs(t)) / 60000);
    if (isNaN(m)) return '–';
    if (m < 0) return m > -60 ? `in ${-m}m` : m > -1440 ? `in ${Math.round(-m / 60)}h` : `in ${Math.round(-m / 1440)}d`;
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.round(m / 60)}h ago`;
    if (m < 43200) return `${Math.round(m / 1440)}d ago`;
    return new Date(toMs(t)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  // Long form for <time class="ago">: "5 minutes ago", "yesterday".
  function agoLong(t) {
    const mins = Math.round((toMs(t) - Date.now()) / 60000);
    return Math.abs(mins) < 60 ? rtf.format(mins, 'minute') : Math.abs(mins) < 1440 ? rtf.format(Math.round(mins / 60), 'hour') : rtf.format(Math.round(mins / 1440), 'day');
  }
  const time = (t, compact = true) => { const d = new Date(toMs(t)); return isNaN(d) ? '–' : `<time class="ago${compact ? ' short' : ''}" datetime="${d.toISOString()}" title="${esc(d.toLocaleString())}">${compact ? ago(d) : agoLong(d)}</time>`; };
  function refreshTimes(root = document) {
    $$('time.ago', root).forEach((el) => { if (el.dateTime) el.textContent = el.classList.contains('short') ? ago(el.dateTime) : agoLong(el.dateTime); });
  }
  setInterval(refreshTimes, 60000);

  // ---------- avatars, member chips, pills ----------
  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => [...w][0] || '').join('').toUpperCase() || '?';
  const hue = (s) => [...String(s || '')].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 360, 7);
  function avatar(src, name, size = 28) {
    const fb = `<span class="nx-av ini" style="--s:${size}px;--h:${hue(name)}" aria-hidden="true">${esc(initials(name))}</span>`;
    return src ? `<img class="nx-av" src="${esc(src)}" alt="" width="${size}" height="${size}" style="--s:${size}px" loading="lazy" data-ini="${esc(initials(name))}" data-h="${hue(name)}">` : fb;
  }
  // Broken Discord avatar → initials bubble.
  addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('nx-av')) return;
    const s = document.createElement('span');
    s.className = 'nx-av ini'; s.setAttribute('aria-hidden', 'true');
    s.style.cssText = `--s:${img.style.getPropertyValue('--s')};--h:${img.dataset.h}`;
    s.textContent = img.dataset.ini || '?';
    img.replaceWith(s);
  }, true);
  // u = { id, n (name), a (avatar url), sub (small text), href, player (EA name, for the hover card link) }
  function member(u, { size = 26, sub = true, card = true } = {}) {
    const tag = u.href ? 'a' : 'span';
    const hc = card && u.id ? ` data-hc="${esc(u.id)}" data-hc-name="${esc(u.n)}" data-hc-av="${esc(u.a || '')}"${u.sub ? ` data-hc-sub="${esc(u.sub)}"` : ''}${u.player ? ` data-hc-player="${esc(u.player)}"` : ''} tabindex="0"` : '';
    return `<${tag} class="nx-member"${u.href ? ` href="${esc(u.href)}"` : ''}${hc}>${avatar(u.a, u.n, size)}<span><b>${esc(u.n)}</b>${sub && u.sub ? `<small>${esc(u.sub)}</small>` : ''}</span></${tag}>`;
  }
  // tone: red | gold | win | draw | loss | discord | '' (neutral)
  const pill = (label, { emoji, tone = '', tip } = {}) => `<span class="nx-pill${tone ? ` t-${tone}` : ''}"${tip ? ` data-tip="${esc(tip)}"` : ''}>${emoji ? `<i aria-hidden="true">${emoji}</i>` : ''}${esc(label)}</span>`;
  const pills = (list) => `<span class="nx-pills">${list.map((p) => (typeof p === 'string' ? pill(p) : pill(p.label, p))).join('')}</span>`;

  // ---------- empty states + skeletons ----------
  const empty = ({ icon = '📭', title = 'Nothing here yet', text = '', action = '' } = {}) =>
    `<div class="nx-empty"><span class="nx-empty-ic" aria-hidden="true">${icon}</span><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
  const bone = (w = '100%', h = 12, r = 6) => `<i class="nx-bone" style="width:${w};height:${h}px;border-radius:${r}px"></i>`;
  function skeleton(kind = 'rows', n = 3) {
    const rep = (f) => Array.from({ length: n }, (_, i) => f(i)).join('');
    const body = {
      text: () => rep((i) => bone(`${90 - (i % 3) * 18}%`)),
      rows: () => rep(() => `<div class="nx-sk-row">${bone('32px', 32, 16)}<div>${bone('45%')}${bone('25%', 10)}</div></div>`),
      cards: () => `<div class="nx-sk-cards">${rep(() => `<div class="card">${bone('60%', 16)}${bone('100%', 10)}${bone('80%', 10)}${bone('100%', 34, 8)}</div>`)}</div>`,
      profile: () => `<div class="nx-sk-row big">${bone('72px', 72, 36)}<div>${bone('40%', 20)}${bone('25%')}</div></div>${bone('100%', 80, 12)}`,
    }[kind] || (() => '');
    return `<div class="nx-skel" aria-busy="true" aria-label="Loading">${body()}</div>`;
  }

  // ---------- toasts (stacked, optional action e.g. Undo) ----------
  const TOAST_IC = { ok: '✅', bad: '⚠️', info: '📣' };
  function toast(msg, type = 'ok', { action, ms = 3800 } = {}) {
    // Inside an open modal the toast must live in the dialog's top layer to stay visible.
    const host = $('dialog[open]') || document.body;
    let box = $(':scope > .nx-toasts', host);
    if (!box) { box = document.createElement('div'); box.className = 'nx-toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); host.appendChild(box); }
    const t = document.createElement('div');
    t.className = `nx-toast ${type}`;
    t.innerHTML = `<i aria-hidden="true">${TOAST_IC[type] || ''}</i><span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}<button type="button" class="x" aria-label="Dismiss">×</button>`;
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 200); };
    t.querySelector('.x').onclick = close;
    if (action) t.querySelector('button:not(.x)').onclick = () => { close(); action.fn(); };
    box.appendChild(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(close, action ? ms + 2500 : ms);
    return close;
  }

  // ---------- modal + confirm (native <dialog>: focus trap, Esc, top layer) ----------
  // actions: [{ label, value, kind: '' | 'ghost' | 'danger' }] – resolves with the clicked value, null when dismissed.
  function modal({ title = '', icon = '', body = '', actions = [{ label: 'Close', value: null, kind: 'ghost' }], wide = false, onOpen } = {}) {
    const d = document.createElement('dialog');
    d.className = `nx-modal${wide ? ' wide' : ''}`;
    d.innerHTML = `<div class="nx-modal-box"><header>${icon ? `<span aria-hidden="true">${icon}</span>` : ''}<h2>${esc(title)}</h2><button type="button" class="x" aria-label="Close">×</button></header>
<div class="nx-modal-body">${body}</div>${actions.length ? `<footer>${actions.map((a, i) => `<button type="button" class="btn sm${a.kind ? ` ${a.kind}` : ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</footer>` : ''}</div>`;
    document.body.appendChild(d);
    let result = null, resolve;
    const done = new Promise((res) => { resolve = res; });
    // Resolve straight away on our own buttons; the native 'close' event covers Esc.
    const finish = () => { if (!d.isConnected) return; d.remove(); resolve(result); };
    d.addEventListener('close', finish);
    const close = (v = null) => { result = v; d.close(); finish(); };
    d.addEventListener('click', (e) => {
      if (e.target === d || e.target.closest('.x')) return close();
      const b = e.target.closest('footer [data-i]');
      if (b) close(actions[+b.dataset.i].value);
    });
    d.showModal();
    // Danger dialogs focus the safe choice so Enter never deletes by accident.
    ($('[autofocus]', d) || $(`footer .btn:${$('footer .btn.danger', d) ? 'first' : 'last'}-child`, d) || $('.x', d))?.focus();
    onOpen?.(d, close);
    done.close = close; done.el = d;
    return done;
  }
  const confirm = ({ title = 'Are you sure?', text = '', ok = 'Yes', cancel = 'Cancel', danger = false, icon = danger ? '⚠️' : '❔' } = {}) =>
    modal({ title, icon, body: text ? `<p>${esc(text)}</p>` : '', actions: [{ label: cancel, value: false, kind: 'ghost' }, { label: ok, value: true, kind: danger ? 'danger' : '' }] }).then(Boolean);

  // ---------- tabs (ARIA tablist, arrow keys) ----------
  // items: [[key, label, count?]] → HTML; then UI.tabs(el, onChange) wires it up.
  const tabsHtml = (items, active, cls = '') => `<div class="nx-tabs ${cls}" role="tablist">${items.map(([k, l, n]) => `<button type="button" role="tab" data-key="${esc(k)}" aria-selected="${k === active}" tabindex="${k === active ? 0 : -1}">${l}${n != null ? `<em>${esc(n)}</em>` : ''}</button>`).join('')}</div>`;
  function tabs(el, onChange) {
    const btns = () => $$('[role=tab]', el);
    const pick = (b, focus) => {
      btns().forEach((x) => { const on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
      if (focus) b.focus();
      onChange?.(b.dataset.key);
    };
    el.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b && b.getAttribute('aria-selected') !== 'true') pick(b); });
    el.addEventListener('keydown', (e) => {
      const list = btns(), i = list.indexOf(document.activeElement);
      if (i < 0) return;
      const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: list.length - 1 }[e.key];
      if (j == null) return;
      e.preventDefault();
      pick(list[(j + list.length) % list.length], true);
    });
    return { set: (k) => { const b = btns().find((x) => x.dataset.key === k); if (b) pick(b); } };
  }

  // ---------- hover card shell ----------
  // Any element with data-hc="<discord id>" gets a card on hover / keyboard focus / first tap on touch.
  // Features plug in richer content with UI.hoverCard.use(async (id, el) => html) (P2.1).
  let provider = null, hcEl = null, hcFor = null, showT, hideT;
  const cache = new Map();
  const basicCard = (el) => {
    const d = el.dataset;
    return `<div class="nx-hc-top">${avatar(d.hcAv, d.hcName, 56)}<div><b>${esc(d.hcName)}</b>${d.hcSub ? `<small>${esc(d.hcSub)}</small>` : ''}</div></div>${d.hcPlayer ? `<a class="btn sm ghost" href="${BASE}players/${encodeURIComponent(d.hcPlayer)}.html">🪪 View player page</a>` : ''}`;
  };
  function place(el) {
    const r = el.getBoundingClientRect(), w = hcEl.offsetWidth, h = hcEl.offsetHeight;
    const left = Math.max(8, Math.min(r.left, innerWidth - w - 8));
    const below = r.bottom + 8 + h < innerHeight || r.top < h + 16;
    hcEl.style.left = `${left + scrollX}px`;
    hcEl.style.top = `${(below ? r.bottom + 8 : r.top - h - 8) + scrollY}px`;
    hcEl.classList.toggle('up', !below);
  }
  async function showCard(el) {
    clearTimeout(hideT);
    if (!hcEl) {
      hcEl = document.createElement('div'); hcEl.className = 'nx-hc'; hcEl.setAttribute('role', 'tooltip'); hcEl.id = 'nx-hc';
      hcEl.addEventListener('mouseenter', () => clearTimeout(hideT));
      hcEl.addEventListener('mouseleave', () => hideCard());
      document.body.appendChild(hcEl);
    }
    hcFor = el;
    el.setAttribute('aria-describedby', 'nx-hc');
    const id = el.dataset.hc;
    hcEl.innerHTML = cache.get(id) || basicCard(el) + (provider ? skeleton('text', 2) : '');
    hcEl.hidden = false; place(el);
    requestAnimationFrame(() => hcEl.classList.add('on'));
    if (provider && !cache.has(id)) {
      try { const html = await provider(id, el); if (html) { cache.set(id, html); if (hcFor === el) { hcEl.innerHTML = html; place(el); } } } catch { if (hcFor === el) { hcEl.innerHTML = basicCard(el); place(el); } }
    }
  }
  function hideCard(now) {
    clearTimeout(showT);
    const go = () => { if (!hcEl) return; hcEl.classList.remove('on'); hcEl.hidden = true; hcFor?.removeAttribute('aria-describedby'); hcFor = null; };
    if (now) go(); else hideT = setTimeout(go, 160);
  }
  if (!coarse) {
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest?.('[data-hc]');
      if (!el || el === hcFor) return;
      clearTimeout(showT); showT = setTimeout(() => showCard(el), 280);
    });
    document.addEventListener('mouseout', (e) => { const el = e.target.closest?.('[data-hc]'); if (el && !el.contains(e.relatedTarget)) { clearTimeout(showT); hideCard(); } });
  }
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-hc]'); if (el) showCard(el); else if (hcEl && !hcEl.contains(e.target)) hideCard(true); });
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-hc]');
    // Touch: first tap opens the card, second tap follows the link.
    if (el && coarse && hcFor !== el) { e.preventDefault(); showCard(el); return; }
    if (hcEl && !hcEl.contains(e.target) && !el) hideCard(true);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideCard(true); });
  addEventListener('scroll', () => { if (hcFor) place(hcFor); }, { passive: true });
  const hoverCard = { use: (fn) => { provider = fn; cache.clear(); }, forget: (id) => (id ? cache.delete(id) : cache.clear()), show: showCard, hide: () => hideCard(true) };

  // ---------- image lightbox ----------
  // items: [{ src, alt, caption }]. Auto: <a href="big.jpg" data-lightbox="group"> or <img data-lightbox>.
  function lightbox(items, start = 0) {
    let i = start;
    const d = document.createElement('dialog');
    d.className = 'nx-lb';
    d.innerHTML = `<button type="button" class="x" aria-label="Close">×</button>${items.length > 1 ? '<button type="button" class="nav prev" aria-label="Previous">‹</button><button type="button" class="nav next" aria-label="Next">›</button>' : ''}<figure><img alt=""><figcaption></figcaption></figure>`;
    const img = $('img', d), cap = $('figcaption', d);
    const show = () => { const it = items[i]; img.src = it.src; img.alt = it.alt || ''; cap.textContent = `${it.caption || ''}${items.length > 1 ? `  ·  ${i + 1} / ${items.length}` : ''}`.trim().replace(/^·\s*/, ''); };
    const step = (n) => { i = (i + n + items.length) % items.length; show(); };
    d.addEventListener('click', (e) => {
      if (e.target.closest('.prev')) return step(-1);
      if (e.target.closest('.next')) return step(1);
      if (e.target === d || e.target.closest('.x') || e.target.tagName === 'FIGURE') { d.close(); d.remove(); }
    });
    d.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
    let x0 = null;
    d.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    d.addEventListener('touchend', (e) => { if (x0 == null || items.length < 2) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); x0 = null; });
    d.addEventListener('close', () => d.remove());
    document.body.appendChild(d);
    show(); d.showModal();
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-lightbox]');
    if (!el || e.defaultPrevented) return;
    e.preventDefault();
    const g = el.dataset.lightbox;
    const all = g ? $$(`[data-lightbox="${CSS.escape(g)}"]`) : [el];
    const items = all.map((x) => ({ src: x.dataset.src || x.getAttribute('href') || x.currentSrc || x.src, alt: x.getAttribute('alt') || $('img', x)?.alt || '', caption: x.dataset.caption || x.title || '' }));
    lightbox(items, Math.max(0, all.indexOf(el)));
  });

  window.UI = { esc, ago, agoLong, time, refreshTimes, avatar, member, pill, pills, empty, skeleton, toast, modal, confirm, tabsHtml, tabs, hoverCard, lightbox };
})();
