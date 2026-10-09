// Owner issue tool: a 🐞 button on every page (flag `issueTool`, owner only). Switch it on, pick a tool (pin / arrow / circle / box /
// pen), mark the problem, type or dictate what's wrong, Save – then keep browsing, the session carries over every page and sub-tab.
// Each note records the page, the element you pointed at, the role you were using (and previewing as) and the device/OS/browser.
//   NXReport.init({ call, role, viewAs, user })   mounted by app.js
//   NXReport.parseUA(ua, platform, touch)         pure helper (tested)
(() => {
  const BASE = document.body?.dataset.base || '';
  const KEY = 'nx_issue_session', QUEUE = 'nx_issue_queue';
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const round = (n) => Math.round(n * 10) / 10;

  // ---------- device / OS ----------
  function parseUA(ua = '', platform = '', touch = 0) {
    let os = 'Unknown', osVersion = '', device = '', m;
    const ver = (re) => { const x = re.exec(ua); return x ? x.slice(1).filter(Boolean).join('.') : ''; };
    if (/iPhone|iPod/.test(ua)) { os = 'iOS'; device = 'iPhone'; osVersion = ver(/OS (\d+)[_.](\d+)(?:[_.](\d+))?/); }
    else if (/iPad/.test(ua) || (platform === 'MacIntel' && touch > 1)) { os = 'iPadOS'; device = 'iPad'; osVersion = ver(/OS (\d+)[_.](\d+)(?:[_.](\d+))?/); }
    else if (/Android/.test(ua)) {
      os = 'Android'; osVersion = ver(/Android (\d+(?:\.\d+)*)/);
      device = ((m = /;\s*([^;)]+?)\s+Build/.exec(ua)) && m[1]) || ((m = /Android[^;]*;\s*([^;)]+)\)/.exec(ua)) && m[1]) || 'Android device';
    } else if (/Windows NT/.test(ua)) { os = 'Windows'; osVersion = ver(/Windows NT ([\d.]+)/); device = 'Desktop'; }
    else if (/Mac OS X/.test(ua)) { os = 'macOS'; osVersion = ver(/Mac OS X (\d+)[_.](\d+)/); device = 'Desktop'; }
    else if (/CrOS/.test(ua)) { os = 'ChromeOS'; device = 'Chromebook'; }
    else if (/Linux/.test(ua)) { os = 'Linux'; device = 'Desktop'; }
    let browser = 'Unknown', browserVersion = '';
    const b = (name, re) => { browser = name; browserVersion = ver(re); };
    if (/EdgiOS|EdgA|Edg\//.test(ua)) b('Edge', /(?:EdgiOS|EdgA|Edg)\/([\d.]+)/);
    else if (/OPR\/|OPiOS/.test(ua)) b('Opera', /(?:OPR|OPiOS)\/([\d.]+)/);
    else if (/FxiOS|Firefox\//.test(ua)) b('Firefox', /(?:FxiOS|Firefox)\/([\d.]+)/);
    else if (/CriOS|Chrome\//.test(ua)) b('Chrome', /(?:CriOS|Chrome)\/([\d.]+)/);
    else if (/Safari\//.test(ua)) b('Safari', /Version\/([\d.]+)/);
    return { os, osVersion, device, browser, browserVersion };
  }

  function safeArea() {
    try {
      const el = Object.assign(document.createElement('div'), { style: 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' });
      document.body.appendChild(el);
      const c = getComputedStyle(el), r = { top: parseFloat(c.paddingTop) || 0, right: parseFloat(c.paddingRight) || 0, bottom: parseFloat(c.paddingBottom) || 0, left: parseFloat(c.paddingLeft) || 0 };
      el.remove();
      return r;
    } catch { return null; }
  }

  let highEntropy = null; // Chromium only: real model + OS version
  async function loadHigh() {
    try { highEntropy = await navigator.userAgentData?.getHighEntropyValues(['model', 'platformVersion', 'fullVersionList']); } catch { highEntropy = null; }
  }

  function deviceInfo() {
    const ua = navigator.userAgent, p = parseUA(ua, navigator.platform, navigator.maxTouchPoints);
    const mq = (q) => { try { return matchMedia(q).matches; } catch { return false; } };
    if (highEntropy?.model) p.device = highEntropy.model;
    if (highEntropy?.platformVersion && p.os === 'Android') p.osVersion = highEntropy.platformVersion;
    const conn = navigator.connection;
    return {
      ...p, ua, platform: navigator.platform,
      viewport: { w: innerWidth, h: innerHeight }, screen: { w: screen.width, h: screen.height }, dpr: devicePixelRatio,
      orientation: screen.orientation?.type || (innerWidth > innerHeight ? 'landscape' : 'portrait'),
      standalone: mq('(display-mode: standalone)') || navigator.standalone === true,
      touch: navigator.maxTouchPoints, colorScheme: mq('(prefers-color-scheme: dark)') ? 'dark' : 'light', reducedMotion: mq('(prefers-reduced-motion: reduce)'),
      lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, online: navigator.onLine,
      connection: conn ? { type: conn.effectiveType, down: conn.downlink, saveData: conn.saveData } : null,
      memoryGB: navigator.deviceMemory ?? null, cores: navigator.hardwareConcurrency ?? null, safeArea: safeArea(),
      swControlled: !!navigator.serviceWorker?.controller, builtAt: document.querySelector('.foot time')?.getAttribute('datetime') || null,
    };
  }

  // ---------- element description ----------
  const ownEl = (el) => !el || el.closest?.('[data-nxr]');
  function cssPath(el) {
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && e !== document.body && parts.length < 5; e = e.parentElement) {
      if (e.id) { parts.unshift(`${e.tagName.toLowerCase()}#${e.id}`); break; }
      const cls = [...e.classList].filter((c) => !/^(on|open|in|hov|nx-)/.test(c)).slice(0, 2).map((c) => `.${c}`).join('');
      const sibs = e.parentElement ? [...e.parentElement.children].filter((x) => x.tagName === e.tagName) : [];
      parts.unshift(`${e.tagName.toLowerCase()}${cls}${sibs.length > 1 ? `:nth-of-type(${sibs.indexOf(e) + 1})` : ''}`);
    }
    return parts.join(' > ');
  }
  function describe(el) {
    if (ownEl(el) || el === document.documentElement || el === document.body) return null;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return {
      selector: cssPath(el), tag: el.tagName.toLowerCase(), id: el.id || null, classes: [...el.classList].slice(0, 8),
      text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 90),
      href: el.closest('a')?.getAttribute('href') || null,
      rect: { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) },
      style: { position: cs.position, display: cs.display, overflow: cs.overflow, zIndex: cs.zIndex, fontSize: cs.fontSize, color: cs.color, background: cs.backgroundColor, opacity: cs.opacity },
      scrollsSideways: el.scrollWidth > el.clientWidth + 1,
      inside: [...Array(4)].reduce((a) => { const p = a.at(-1)?.parentElement; return p && p !== document.body ? [...a, p] : a; }, [el]).slice(1).map((p) => `${p.tagName.toLowerCase()}${p.classList[0] ? `.${p.classList[0]}` : ''}`),
    };
  }
  const activeTabs = () => [...document.querySelectorAll('.chipset .chip.on, .subtabs .on, .tabbar .tab.on, .rail-item.on, [aria-selected="true"], [role=tab].on')]
    .map((e) => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean).slice(0, 4);
  const pageKey = () => location.pathname + location.search;

  // ---------- state ----------
  let ctx = null, S = null, tool = 'browse', open = false, cur = null, cv = null, g = null, bar = null, sheet = null, svg = null, fab = null;
  const loadState = () => {
    S = store.get(KEY, null);
    if (!S || Date.now() - (S.last || 0) > 6 * 36e5) S = { id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, n: 0, items: [], last: Date.now() };
  };
  const save = () => { S.last = Date.now(); store.set(KEY, S); };

  // ---------- upload (queue survives reloads / flaky signal) ----------
  async function flush() {
    const q = store.get(QUEUE, []);
    if (!q.length || !ctx) return;
    const rest = [];
    for (const job of q) { try { await ctx.call('/api/issues', job); } catch { rest.push(job); } }
    store.set(QUEUE, rest);
    paintFab();
  }
  const enqueue = (item) => { store.set(QUEUE, [...store.get(QUEUE, []), { session: S.id, item }]); flush(); };

  // ---------- UI ----------
  const TOOLS = [['browse', '✋', 'Browse'], ['pin', '📍', 'Pin'], ['arrow', '➡️', 'Arrow'], ['circle', '⭕', 'Circle'], ['box', '▭', 'Box'], ['pen', '✏️', 'Pen']];
  function mount() {
    if (!document.querySelector('link[href$="report.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/report.css` }));
    fab = Object.assign(document.createElement('button'), { type: 'button', className: 'nxr-fab', title: 'Issue tool', innerHTML: '🐞<b hidden></b>' });
    fab.dataset.nxr = '';
    fab.addEventListener('click', () => toggle());
    document.body.appendChild(fab);
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'nxr-pins'); svg.dataset.nxr = '';
    document.body.appendChild(svg);
    paintFab();
  }
  function paintFab() {
    if (!fab) return;
    const b = fab.querySelector('b'), unsent = store.get(QUEUE, []).length;
    b.hidden = !S.items.length; b.textContent = S.items.length;
    fab.classList.toggle('on', open); fab.classList.toggle('unsent', unsent > 0);
    fab.title = `Issue tool · ${S.items.length} note${S.items.length === 1 ? '' : 's'} this session${unsent ? ` · ${unsent} waiting to upload` : ''}`;
  }
  function toggle(force) {
    open = force ?? !open;
    document.documentElement.classList.toggle('nxr-open', open);
    if (open) { buildBar(); drawPins(); setTool('browse'); } else { bar?.remove(); bar = null; cancel(); svg.innerHTML = ''; }
    paintFab();
  }
  function buildBar() {
    bar?.remove();
    bar = Object.assign(document.createElement('div'), { className: 'nxr-bar' });
    bar.dataset.nxr = '';
    bar.innerHTML = `${TOOLS.map(([k, ic, l]) => `<button type="button" data-t="${k}" title="${l}"><span>${ic}</span><small>${l}</small></button>`).join('')}
<button type="button" data-t="__done" title="Close the tool"><span>✕</span><small>Close</small></button>`;
    bar.addEventListener('click', (e) => {
      const t = e.target.closest('button')?.dataset.t;
      if (!t) return;
      if (t === '__done') return toggle(false);
      setTool(t);
    });
    document.body.appendChild(bar);
  }
  function setTool(t) {
    tool = t; cancel();
    bar?.querySelectorAll('button[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    if (t === 'browse') { cv?.remove(); cv = null; return; }
    if (!cv) {
      cv = Object.assign(document.createElement('canvas'), { className: 'nxr-cv' }); cv.dataset.nxr = '';
      document.body.appendChild(cv); sizeCanvas();
      cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', cancel);
    }
  }
  function sizeCanvas() {
    if (!cv) return;
    const d = devicePixelRatio || 1;
    cv.width = innerWidth * d; cv.height = innerHeight * d; cv.style.width = `${innerWidth}px`; cv.style.height = `${innerHeight}px`;
    g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener('resize', () => { sizeCanvas(); drawPins(); });

  // ---------- drawing ----------
  let drag = null;
  function down(e) { e.preventDefault(); cv.setPointerCapture?.(e.pointerId); drag = { x0: e.clientX, y0: e.clientY, pts: [[e.clientX, e.clientY]] }; }
  function move(e) {
    if (!drag) return;
    drag.x1 = e.clientX; drag.y1 = e.clientY;
    if (tool === 'pen') drag.pts.push([e.clientX, e.clientY]);
    g.clearRect(0, 0, innerWidth, innerHeight);
    paintShape(g, shape(tool, drag), true);
  }
  function up(e) {
    if (!drag) return;
    drag.x1 = e.clientX; drag.y1 = e.clientY;
    const moved = Math.hypot(drag.x1 - drag.x0, drag.y1 - drag.y0);
    const s = shape(tool, drag);
    drag = null;
    if (tool !== 'pin' && moved < 8) { g.clearRect(0, 0, innerWidth, innerHeight); return; } // a tap with a shape tool is not a shape
    const cx = tool === 'pin' ? s.pts[0][0] : (s.bbox.x + s.bbox.w / 2), cy = tool === 'pin' ? s.pts[0][1] : (s.bbox.y + s.bbox.h / 2);
    cv.style.pointerEvents = 'none';
    const el = document.elementFromPoint(cx, cy);
    cv.style.pointerEvents = '';
    cur = { shape: s, target: describe(el), scroll: { x: round(scrollX), y: round(scrollY), docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth } };
    openSheet();
  }
  function shape(type, d) {
    if (type === 'pin') return { type, pts: [[d.x0, d.y0]], bbox: { x: d.x0, y: d.y0, w: 0, h: 0 } };
    if (type === 'pen') {
      const step = Math.max(1, Math.ceil(d.pts.length / 160));
      const pts = d.pts.filter((_, i) => i % step === 0);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return { type, pts, bbox: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } };
    }
    const x1 = d.x1 ?? d.x0, y1 = d.y1 ?? d.y0;
    return { type, pts: [[d.x0, d.y0], [x1, y1]], bbox: { x: Math.min(d.x0, x1), y: Math.min(d.y0, y1), w: Math.abs(x1 - d.x0), h: Math.abs(y1 - d.y0) } };
  }
  const INK = '#ff3b30';
  function paintShape(c, s, live) {
    c.save(); c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
    const [a, b] = s.pts;
    if (s.type === 'pin') { c.beginPath(); c.arc(a[0], a[1], 9, 0, 7); c.fill(); }
    else if (s.type === 'box') c.strokeRect(s.bbox.x, s.bbox.y, s.bbox.w, s.bbox.h);
    else if (s.type === 'circle') { c.beginPath(); c.ellipse(s.bbox.x + s.bbox.w / 2, s.bbox.y + s.bbox.h / 2, Math.max(1, s.bbox.w / 2), Math.max(1, s.bbox.h / 2), 0, 0, 7); c.stroke(); }
    else if (s.type === 'arrow' && b) {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), h = 14;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] - h * Math.cos(ang - 0.45), b[1] - h * Math.sin(ang - 0.45)); c.lineTo(b[0] - h * Math.cos(ang + 0.45), b[1] - h * Math.sin(ang + 0.45)); c.closePath(); c.fill();
    } else if (s.type === 'pen') { c.beginPath(); s.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
    c.restore();
  }
  function cancel() { drag = null; cur = null; g?.clearRect(0, 0, innerWidth, innerHeight); sheet?.remove(); sheet = null; }

  // ---------- note sheet ----------
  const SEV = [['broken', '🔴', 'Broken'], ['wrong', '🟠', 'Wrong'], ['polish', '🟡', 'Polish'], ['idea', '💡', 'Idea']];
  function openSheet() {
    sheet?.remove();
    const n = S.n + 1, SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    sheet = Object.assign(document.createElement('form'), { className: 'nxr-sheet' }); sheet.dataset.nxr = '';
    sheet.innerHTML = `<div class="nxr-head"><b>#${n}</b> <span>${esc(document.title.replace(/ – .*$/, ''))}</span>${activeTabs().length ? `<small>${esc(activeTabs().join(' · '))}</small>` : ''}</div>
<div class="nxr-sev">${SEV.map(([k, ic, l], i) => `<label><input type="radio" name="sev" value="${k}"${k === 'wrong' ? ' checked' : ''}><span>${ic} ${l}</span></label>`).join('')}</div>
<textarea name="note" rows="3" placeholder="What's wrong here? (tap the 🎤 on your keyboard to dictate)"></textarea>
<div class="nxr-row">${SR ? '<button type="button" class="nxr-mic">🎤 Dictate</button>' : ''}<span class="nxr-sp"></span><button type="button" class="nxr-x">Cancel</button><button type="submit" class="nxr-ok">Save #${n}</button></div>`;
    document.body.appendChild(sheet);
    const ta = sheet.querySelector('textarea');
    sheet.querySelector('.nxr-x').addEventListener('click', cancel);
    sheet.addEventListener('submit', (e) => { e.preventDefault(); commit(ta.value.trim(), sheet.querySelector('input[name=sev]:checked').value); });
    const mic = sheet.querySelector('.nxr-mic');
    if (mic) mic.addEventListener('click', () => {
      if (mic.rec) { mic.rec.stop(); return; }
      const rec = new SR(); rec.lang = navigator.language || 'en-GB'; rec.interimResults = true; rec.continuous = true;
      const base = ta.value ? `${ta.value} ` : '';
      rec.onresult = (ev) => { ta.value = base + [...ev.results].map((r) => r[0].transcript).join(' '); };
      rec.onend = () => { mic.rec = null; mic.classList.remove('live'); mic.textContent = '🎤 Dictate'; };
      rec.onerror = () => rec.onend();
      mic.rec = rec; mic.classList.add('live'); mic.textContent = '⏹ Stop'; rec.start();
    });
    setTimeout(() => ta.focus({ preventScroll: true }), 50);
  }

  function commit(note, severity) {
    if (!cur) return;
    const item = {
      n: ++S.n, t: Date.now(), page: pageKey(), hash: location.hash, url: location.href, title: document.title, tabs: activeTabs(), severity, note,
      shape: cur.shape, target: cur.target, scroll: cur.scroll, device: deviceInfo(),
      role: { real: ctx.role, viewAs: ctx.viewAs || null, user: ctx.user?.n || null },
    };
    S.items.push(item); save(); enqueue(item);
    cancel(); drawPins(); setTool('browse'); paintFab();
    ctx.toast?.(`📌 Saved #${item.n}`);
  }

  // ---------- saved pins (re-drawn on the page they belong to, in document coordinates) ----------
  function drawPins() {
    if (!svg) return;
    const w = document.documentElement.scrollWidth, h = document.documentElement.scrollHeight;
    svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    if (!open) { svg.innerHTML = ''; return; }
    svg.innerHTML = S.items.filter((it) => it.page === pageKey()).map((it) => {
      const sx = it.scroll?.x || 0, sy = it.scroll?.y || 0, p = it.shape.pts.map(([x, y]) => [x + sx, y + sy]), [a, b] = p;
      const bb = { x: it.shape.bbox.x + sx, y: it.shape.bbox.y + sy, w: it.shape.bbox.w, h: it.shape.bbox.h };
      const stroke = 'fill="none" stroke="#ff3b30" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
      const body = it.shape.type === 'box' ? `<rect x="${bb.x}" y="${bb.y}" width="${bb.w}" height="${bb.h}" ${stroke}/>`
        : it.shape.type === 'circle' ? `<ellipse cx="${bb.x + bb.w / 2}" cy="${bb.y + bb.h / 2}" rx="${bb.w / 2}" ry="${bb.h / 2}" ${stroke}/>`
        : it.shape.type === 'arrow' && b ? `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${stroke}/>`
        : it.shape.type === 'pen' ? `<polyline points="${p.map((q) => q.join(',')).join(' ')}" ${stroke}/>` : '';
      return `<g>${body}<circle cx="${a[0]}" cy="${a[1]}" r="12" fill="#ff3b30"/><text x="${a[0]}" y="${a[1] + 4.5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Inter,sans-serif">${it.n}</text><title>${esc(it.note)}</title></g>`;
    }).join('');
  }

  async function init(c) {
    if (ctx) return;
    ctx = c; loadState(); save();
    await loadHigh();
    mount(); flush();
    addEventListener('online', flush);
    addEventListener('pagehide', save);
  }

  window.NXReport = { init, parseUA };
})();
