// Owner issue tool: a 🐞 button on every page (flag `issueTool`, owner only). Switch it on, pick a tool (pin / arrow / circle / box /
// pen), mark the problem, type or dictate what's wrong, Save – then keep browsing, the session carries over every page and sub-tab.
// Each note records the page, the element you pointed at, the role you were using (and previewing as) and the device/OS/browser.
//   NXReport.init({ call, role, viewAs, user, recorder?, libBase? })   mounted by app.js / next session.js
// With `recorder` (flag issueRecorder, desktop browsers that have getDisplayMedia) a second toolbar row adds the screen recorder and live
// drawing tools (point, highlight, pen, arrow, box, circle, erase, move, undo): web/annotate.js draws them on the page itself, and
// web/record-host.html (a small pop-up that survives page changes) records the screen + voice-over. See web/record.js for the design.
//   NXReport.parseUA(ua, platform, touch)         pure helper (tested)
(() => {
  const BASE = document.body?.dataset.base || '';
  const KEY = 'nx_issue_session', QUEUE = 'nx_issue_queue';
  const REC = { channel: 'nx-rec', active: 'nx_rec_active', marks: 'nx_rec_marks:' };
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
    fab = Object.assign(document.createElement('button'), { type: 'button', className: 'nxr-fab', title: 'Issue tool', innerHTML: '🐞<b hidden></b><em></em>' });
    fab.dataset.nxr = '';
    fab.addEventListener('click', () => toggle());
    if (ctx.recorder) liveMount();
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
    fab.classList.toggle('on', open); fab.classList.toggle('unsent', unsent > 0); fab.classList.toggle('rec', recLive());
    const em = fab.querySelector('em'); if (em) em.textContent = recLive() ? `${L.rec.state === 'paused' ? '⏸' : '●'} ${fmt(liveMs())}` : '';
    fab.title = `Issue tool · ${S.items.length} note${S.items.length === 1 ? '' : 's'} this session${unsent ? ` · ${unsent} waiting to upload` : ''}`;
  }
  function toggle(force) {
    open = force ?? !open;
    document.documentElement.classList.toggle('nxr-open', open);
    if (open) { buildBar(); drawPins(); setTool('browse'); } else { bar?.remove(); bar = null; cancel(); svg.innerHTML = ''; if (L.tool) liveTool(null); }
    liveDraw();
    paintFab();
  }
  function buildBar() {
    if (ctx.recorder && L.cv) return liveBar(); // one toolbar: the recorder build replaces the pin toolbar
    bar?.remove();
    bar = Object.assign(document.createElement('div'), { className: 'nxr-bar' });
    bar.dataset.nxr = '';
    bar.innerHTML = `${TOOLS.map(([k, ic, l]) => `<button type="button" data-t="${k}" title="${l}"><span>${ic}</span><small>${l}</small></button>`).join('')}
${ctx.rawUpload ? '<button type="button" data-t="__list" title="Your reports – mark them fixed"><span>📋</span><small>Reports</small></button>' : ''}<button type="button" data-t="__done" title="Close the tool"><span>✕</span><small>Close</small></button>`;
    bar.addEventListener('click', (e) => {
      const t = e.target.closest('button')?.dataset.t;
      if (!t) return;
      if (t === '__done') return toggle(false);
      if (t === '__list') return openList();
      setTool(t);
    });
    document.body.appendChild(bar);
  }
  function setTool(t) {
    tool = t; cancel();
    if (t !== 'browse') liveTool(null);
    bar?.querySelectorAll('button[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    if (ctx.recorder && L.cv) liveBar();
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
    g.clearRect(0, 0, innerWidth, innerHeight); drawPins(); // the open mark lives in page coordinates, so a keyboard/scroll shift can't move it off what was marked
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
  function cancel() {
    stopDictation(true);
    const at = sheet && cur?.scroll;
    sheet?.querySelector('textarea')?.blur();
    drag = null; cur = null; g?.clearRect(0, 0, innerWidth, innerHeight); sheet?.remove(); sheet = null; drawPins();
    if (at) holdScroll(at); // closing the keyboard must not leave the page somewhere else
  }
  // While a note is open the page stays where it was marked (the keyboard opening/closing scrolls it otherwise).
  let holdAt = null, holdUntil = 0;
  const holdScroll = (at, ms = 600) => { holdAt = at; holdUntil = ms ? Date.now() + ms : Infinity; pin(); };
  const pin = () => { if (holdAt && (Math.abs(scrollY - holdAt.y) > 1 || Math.abs(scrollX - holdAt.x) > 1)) scrollTo({ left: holdAt.x, top: holdAt.y, behavior: 'instant' }); };
  addEventListener('scroll', () => {
    if (!holdAt) return;
    if (Date.now() > holdUntil) { holdAt = null; return; }
    pin();
  }, { passive: true });

  // ---------- dictation ----------
  // One recogniser at a time, owned here (not by the sheet), so closing/saving a note always switches the mic off. Short sessions that
  // restart themselves instead of `continuous` mode, which repeats or stalls on Android Chrome.
  let dict = null;
  function stopDictation(discard) { const d = dict; dict = null; d?.end(discard); }
  function startDictation(SR, ta, mic) {
    let sr = null, on = true, fails = 0, base = '';
    const paint = () => { mic.classList.toggle('live', on); mic.textContent = on ? '⏹ Stop' : '🎤 Dictate'; };
    const run = () => {
      base = ta.value.trim() ? `${ta.value.trim()} ` : '';
      sr = new SR(); sr.lang = navigator.language || 'en-GB'; sr.interimResults = true; sr.continuous = false;
      sr.onresult = (ev) => { fails = 0; ta.value = base + [...ev.results].map((r) => r[0].transcript).join(' ').trim(); };
      sr.onerror = (ev) => { if (ev.error !== 'no-speech' && ev.error !== 'aborted') fails++; if (/not-allowed|service-not-allowed|audio-capture/.test(ev.error)) on = false; };
      sr.onend = () => { sr = null; if (on && dict === me && fails < 3 && ta.isConnected) { try { run(); return; } catch { /* fall through */ } } if (dict === me) dict = null; on = false; paint(); };
      sr.start();
    };
    const me = { end(discard) { on = false; paint(); try { discard ? sr?.abort() : sr?.stop(); } catch { /* already ended */ } } };
    dict = me; paint();
    try { run(); } catch { dict = null; on = false; paint(); }
  }
  addEventListener('pagehide', () => stopDictation(true));

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
    sheet.querySelector('.nxr-x').addEventListener('click', () => setTool('browse')); // leaving the tool too, or its canvas keeps covering the page
    sheet.addEventListener('submit', (e) => { e.preventDefault(); commit(ta.value.trim(), sheet.querySelector('input[name=sev]:checked').value); });
    const mic = sheet.querySelector('.nxr-mic');
    if (mic) {
      mic.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus (and the keyboard) where it is – no page jump
      mic.addEventListener('click', () => { if (dict) stopDictation(false); else startDictation(SR, ta, mic); });
    }
    holdScroll(cur.scroll, 0);
    setTimeout(() => ta.focus({ preventScroll: true }), 50);
  }

  // Layout diagnostics (#40: iOS installed app, bottom bar rises mid-screen and scroll stops). Measured at the moment of saving; diagnostic only.
  function layoutDiag() {
    const r1 = (n) => Math.round(n * 10) / 10, vv = window.visualViewport;
    const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(), cs = getComputedStyle(el); return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height), bottom: r1(b.bottom), pos: cs.position, bottomCss: cs.bottom, transform: cs.transform === 'none' ? null : cs.transform.slice(0, 80) }; };
    const label = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`;
    const fixed = []; try { for (const el of document.body.querySelectorAll('*')) { if (fixed.length >= 30) break; if (el.closest('[class*="nxr-"]')) continue; const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.position === 'sticky') { const b = el.getBoundingClientRect(); fixed.push({ el: label(el), pos: cs.position, x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height), z: cs.zIndex, hidden: cs.display === 'none' || cs.visibility === 'hidden' }); } } } catch {}
    const de = document.documentElement, bd = document.body;
    return {
      vv: vv ? { offsetTop: r1(vv.offsetTop), offsetLeft: r1(vv.offsetLeft), w: r1(vv.width), h: r1(vv.height), scale: r1(vv.scale), pageTop: r1(vv.pageTop) } : null,
      innerH: innerHeight, innerW: innerWidth, outerH: outerHeight, clientH: de.clientHeight, scrollY: r1(scrollY), scrollH: de.scrollHeight, maxScroll: de.scrollHeight - de.clientHeight,
      htmlOverflow: getComputedStyle(de).overflow, bodyOverflow: getComputedStyle(bd).overflow, bodyPos: getComputedStyle(bd).position, bodyH: r1(bd.getBoundingClientRect().height),
      tabbar: rect(document.querySelector('.tabbar')), header: rect(document.querySelector('.bar, header.top')), fixed,
    };
  }

  function commit(note, severity) {
    if (!cur) return;
    const item = {
      n: ++S.n, t: Date.now(), page: pageKey(), hash: location.hash, url: location.href, title: document.title, tabs: activeTabs(), severity, note,
      shape: cur.shape, target: cur.target, scroll: cur.scroll, device: deviceInfo(), diag: layoutDiag(),
      role: { real: ctx.role, viewAs: ctx.viewAs || null, user: ctx.user?.n || null },
    };
    stopDictation(false);
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
    svg.innerHTML = [...S.items.filter((it) => it.shape && it.page === pageKey()), ...(cur ? [{ ...cur, n: S.n + 1 }] : [])].map((it) => {
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

  // ---------- reports list: mark fixed → deleted automatically a day later (bot/issues.js issueSweep) ----------
  let panel = null;
  async function openList() {
    if (panel) { panel.remove(); panel = null; return; }
    panel = Object.assign(document.createElement('div'), { className: 'nxr-sheet nxr-list' }); panel.dataset.nxr = '';
    document.body.appendChild(panel);
    const api = (path, opt = {}) => fetch(ctx.rawUpload.base + path, { ...opt, headers: { Authorization: `Bearer ${ctx.rawUpload.token}`, 'Content-Type': 'application/json' }, cache: 'no-store' }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Error ${r.status}`); return j; });
    const paint = async () => {
      let items;
      try { items = (await api('/api/issues')).items; } catch (e) { panel.textContent = `Could not load: ${e.message}`; return; }
      const left = (t) => { const h = Math.max(0, Math.round((t - Date.now()) / 36e5)); return h ? `deleted in ${h}h` : 'deleted soon'; };
      panel.innerHTML = `<div class="nxr-head"><b>Reports</b><span>Fixed ones are deleted after a day – reopen to keep.</span></div>${items.length ? items.map((x) => `<div class="nxr-item${x.status === 'open' ? '' : ' done'}"><span><b>#${x.n}</b> ${esc(x.note || x.page).slice(0, 110)}${x.video ? ' 🎥' : ''}<small>${esc(x.page)}${x.deleteAt ? ` · ${left(x.deleteAt)}` : ''}</small></span><button type="button" data-id="${esc(x.id)}" data-s="${x.status === 'open' ? 'fixed' : 'open'}">${x.status === 'open' ? '✓ Fixed' : '↺ Reopen'}</button></div>`).join('') : '<p>No reports yet.</p>'}<div class="nxr-row"><span class="nxr-sp"></span><button type="button" class="nxr-x">Close</button></div>`;
    };
    panel.addEventListener('click', async (e) => {
      if (e.target.closest('.nxr-x')) { panel.remove(); panel = null; return; }
      const b = e.target.closest('button[data-id]');
      if (!b) return;
      b.disabled = true;
      try { await api('/api/issues/status', { method: 'POST', body: JSON.stringify({ id: b.dataset.id, status: b.dataset.s }) }); } catch (er) { ctx.toast?.(er.message); }
      paint();
    });
    paint();
  }

  // ---------- live drawing + screen recorder (flag issueRecorder) ----------
  // Marks are in document coordinates, drawn on a fixed canvas over the page and never opened as notes. They are real page elements, so any
  // screen / window / tab capture of this page contains them; erase, move, undo and clear all work while recording. State of the recorder
  // pop-up arrives over a BroadcastChannel (L.rec); commands (pause / stop / moment) go back the same way.
  const L = { tucked: store.get('nx_rec_tucked', false), pending: null, clock: 0, tool: null, color: 0, fade: false, s: null, cv: null, g: null, bar2: null, trail: [], drag: null, sel: null, raf: 0, ch: null, rec: { state: 'idle', ms: 0, bytes: 0, mic: true }, seen: new Set(), at: 0 };
  const LTOOLS = [['point', '☝️', 'Point'], ['highlight', '🖍️', 'Highlight'], ['pen', '✏️', 'Pen'], ['arrow', '➡️', 'Arrow'], ['box', '▭', 'Box'], ['circle', '⭕', 'Circle'], ['erase', '🧽', 'Erase'], ['move', '✥', 'Move']];
  const recLive = () => L.rec.state === 'recording' || L.rec.state === 'paused' || L.rec.state === 'stopping';
  const fmt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const hostSend = (m) => { try { L.ch?.postMessage({ from: 'page', ...m }); } catch { /* channel closed */ } };
  const pageEvent = () => hostSend({ k: 'event', ev: { k: 'page', url: pageKey() + location.hash, title: document.title.replace(/ – .*$/, '') } });
  const marksKey = () => REC.marks + pageKey();
  const persistMarks = () => { if (L.s.marks.length) store.set(marksKey(), L.s.marks); else try { localStorage.removeItem(marksKey()); } catch { /* private mode */ } };
  const clearMarks = () => { try { Object.keys(localStorage).filter((k) => k.startsWith(REC.marks)).forEach((k) => localStorage.removeItem(k)); } catch { /* private mode */ } };

  function liveMount() {
    if (L.cv || !window.NXAnnotate) return;
    L.s = NXAnnotate.store(); L.s.load(store.get(marksKey(), []));
    L.cv = Object.assign(document.createElement('canvas'), { className: 'nxr-live' }); L.cv.dataset.nxr = '';
    document.body.appendChild(L.cv); liveSize();
    for (const [ev, fn] of [['pointerdown', lDown], ['pointermove', lMove], ['pointerup', lUp], ['pointercancel', lUp]]) L.cv.addEventListener(ev, fn);
    addEventListener('scroll', () => liveDraw(), { passive: true });
    addEventListener('resize', () => { liveSize(); liveDraw(); });
    addEventListener('keydown', lKey);
    try { L.ch = new BroadcastChannel(REC.channel); } catch { L.ch = null; }
    L.ch?.addEventListener('message', (ev) => lMsg(ev.data));
    // is a recording already running (we just navigated)? tell it where we are
    const act = store.get(REC.active, null);
    if (act && Date.now() - act.ts < 6000) { L.rec = { ...L.rec, state: act.state, id: act.id }; pageEvent(); }
    hostSend({ k: 'cmd', cmd: 'ping' });
    addEventListener('hashchange', () => recLive() && pageEvent());
    addEventListener('pagehide', persistMarks);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && askResend());
    paintFab(); liveDraw();
  }
  function liveSize() {
    if (!L.cv) return;
    const d = devicePixelRatio || 1;
    L.cv.width = innerWidth * d; L.cv.height = innerHeight * d; L.cv.style.width = `${innerWidth}px`; L.cv.style.height = `${innerHeight}px`;
    L.g = L.cv.getContext('2d'); L.g.setTransform(d, 0, 0, d, 0, 0);
  }

  function lMsg(m) {
    if (m?.from !== 'host') return;
    if (m.k === 'state') {
      const was = L.rec.state;
      L.rec = { state: m.state, ms: m.ms, bytes: m.bytes, mic: m.mic, id: m.id, unsaved: m.unsaved }; L.at = Date.now();
      if (was === 'idle' && recLive()) pageEvent();
      if (recLive() && !L.clock) L.clock = setInterval(tickClock, 500);
      if ((m.state === 'done' || m.state === 'idle') && L.tool && was !== m.state) liveTool(null); else liveBar();
      paintFab(); askResend();
    } else if (m.k === 'uploaded') {
      const it = S.items.find((x) => x.recording?.rid === m.id);
      if (it && !it.recording.uploaded) { it.recording.uploaded = true; it.recording.key = m.key; save(); enqueue(it); ctx.toast?.(`🎥 Video for #${it.n} uploaded`); }
    } else if (m.k === 'finished') {
      // the take is over: show it in the issue panel (video + text + category). Only the tab being looked at takes it; the others ask again when they come to the front.
      if (document.visibilityState !== 'visible' || L.seen.has(m.id) || L.pending?.id === m.id) return;
      L.pending = { id: m.id, item: m.item, url: URL.createObjectURL(m.blob) };
      if (!open) toggle(true);
      liveBar(); openRecordingSheet();
    }
  }
  // a tab that missed the 'finished' message (hidden, or loaded after it) asks the recorder window to send it again
  function askResend() {
    if (L.rec.state === 'done' && L.rec.unsaved && !L.pending && !L.seen.has(L.rec.id) && document.visibilityState === 'visible') hostSend({ k: 'cmd', cmd: 'resend' });
  }
  const liveMs = () => L.rec.ms + (L.rec.state === 'recording' ? Date.now() - L.at : 0);
  function tickClock() {
    if (!recLive()) { clearInterval(L.clock); L.clock = 0; paintFab(); return; }
    document.querySelectorAll('.nxr-clock').forEach((c) => { c.textContent = `${L.rec.state === 'paused' ? '⏸' : '●'} ${fmt(liveMs())}`; });
    paintFab();
  }
  // where the pop-up may upload the video (it has no session of its own); null when this site build can't
  const upTarget = () => (ctx.rawUpload ? { url: `${ctx.rawUpload.base}/api/issues/recording`, token: ctx.rawUpload.token, session: S.id } : null);
  function commitRecording(rec, rid) {
    L.seen.add(rid);
    const item = { ...rec, n: ++S.n, url: location.href, tabs: activeTabs(), device: deviceInfo(), role: { real: ctx.role, viewAs: ctx.viewAs || null, user: ctx.user?.n || null } };
    item.recording = { ...item.recording, rid };
    S.items.push(item); save(); enqueue(item); clearMarks(); L.s.load([]); liveDraw(); paintFab();
    ctx.toast?.(`📌 Saved #${item.n} with the recording`);
    return item.n;
  }

  // ----- the bar (the only toolbar when the recorder is on) -----
  function liveBar() {
    bar?.remove(); bar = null;
    if (!ctx.recorder || !L.cv || !open) return;
    const r = L.rec, live = recLive();
    const b = (attr, ic, label, extra = '') => `<button type="button" ${attr} title="${label}"${extra}><span>${ic}</span><small>${label}</small></button>`;
    bar = Object.assign(document.createElement('div'), { className: `nxr-bar nxr-bar2${L.tucked ? ' nxr-pill' : ''}` }); bar.dataset.nxr = '';
    if (L.tucked) { // out of the way so the whole screen can be shown; the timer and stop stay
      bar.innerHTML = `${b('data-l="__show"', '🐞', 'Show tools')}${live ? `<span class="nxr-clock">${r.state === 'paused' ? '⏸' : '●'} ${fmt(liveMs())}</span>${b('data-l="__pause"', r.state === 'paused' ? '▶' : '⏸', r.state === 'paused' ? 'Resume' : 'Pause')}${b('data-l="__stop"', '⏹', 'End', ' class="red"')}` : ''}`;
    } else {
      bar.innerHTML = [
        live ? `${b('data-l="__pause"', r.state === 'paused' ? '▶' : '⏸', r.state === 'paused' ? 'Resume' : 'Pause')}${b('data-l="__stop"', '⏹', 'End', ' class="red"')}${b('data-l="__discard"', '✕', 'Cancel')}${b('data-l="__moment"', '🚩', 'Moment')}<span class="nxr-clock">${r.state === 'paused' ? '⏸' : '●'} ${fmt(liveMs())}</span>`
          : b('data-l="__rec"', '🎥', r.state === 'starting' ? 'Starting…' : 'Record', r.state === 'starting' ? ' disabled' : ''),
        L.pending ? b('data-l="__finish"', '📎', 'Finish report', ' class="red"') : '',
        '<i class="nxr-div"></i>',
        b('data-l="__note"', '📍', 'Note', tool === 'pin' ? ' class="on"' : ''),
        LTOOLS.map(([k, ic, l]) => b(`data-l="${k}"`, ic, l, L.tool === k ? ' class="on"' : '')).join(''),
        '<i class="nxr-div"></i>',
        b('data-l="__undo"', '↶', 'Undo', L.s.canUndo ? '' : ' disabled'), b('data-l="__redo"', '↷', 'Redo', L.s.canRedo ? '' : ' disabled'), b('data-l="__clear"', '🗑️', 'Clear', L.s.marks.length ? '' : ' disabled'),
        '<i class="nxr-div"></i>',
        NXAnnotate.COLORS.map((c, i) => `<button type="button" data-l="__color${i}" class="nxr-sw${L.color === i ? ' on' : ''}" style="--c:${c}" title="Colour"></button>`).join(''),
        `<button type="button" data-l="__fade" class="${L.fade ? 'on' : ''}" title="Auto-fade: marks you draw disappear by themselves after 5 seconds"><span>⏳</span><small>${L.fade ? 'Fade 5s ✓' : 'Auto-fade'}</small></button>`,
        '<i class="nxr-div"></i>',
        ctx.rawUpload ? b('data-l="__list"', '📋', 'Reports') : '',
        b('data-l="__hide"', '⌃', 'Hide'), b('data-l="__close"', '✕', 'Close'),
      ].join('');
    }
    bar.addEventListener('click', (e) => {
      const k = e.target.closest('button')?.dataset.l;
      if (!k) return;
      if (k === '__rec') return openRecorder();
      if (k === '__pause') return hostSend({ k: 'cmd', cmd: 'pause' });
      if (k === '__stop') return hostSend({ k: 'cmd', cmd: 'stop' });
      if (k === '__discard') return hostSend({ k: 'cmd', cmd: 'discard' });
      if (k === '__moment') { hostSend({ k: 'cmd', cmd: 'moment' }); return ctx.toast?.('🚩 Moment marked'); }
      if (k === '__finish') return openRecordingSheet();
      if (k === '__note') return setTool(tool === 'pin' ? 'browse' : 'pin');
      if (k === '__undo') { L.s.undo(); return lChanged(); }
      if (k === '__redo') { L.s.redo(); return lChanged(); }
      if (k === '__clear') { L.s.clear(); hostSend({ k: 'event', ev: { k: 'mark', op: 'clear' } }); return lChanged(); }
      if (k === '__fade') { L.fade = !L.fade; return liveBar(); }
      if (k === '__list') return openList();
      if (k === '__hide') return tuck(true);
      if (k === '__show') return tuck(false);
      if (k === '__close') return toggle(false);
      if (k.startsWith('__color')) { L.color = +k.slice(7); return liveBar(); }
      liveTool(L.tool === k ? null : k);
    });
    document.body.appendChild(bar);
  }
  function tuck(on) { L.tucked = on; if (on) liveTool(null); store.set('nx_rec_tucked', on); liveBar(); }
  function openRecorder() {
    if (recLive() || L.rec.state === 'starting') return ctx.toast?.('The recorder is already running – it is the small window.');
    if (!navigator.mediaDevices?.getDisplayMedia) return ctx.toast?.('This browser cannot record the screen – use the pin tools.');
    // Open-or-find by name WITHOUT navigating: if the recorder window already exists it is only brought forward, never reloaded
    // (reloading it would end a recording that is in progress).
    const w = window.open('', 'nx-recorder', 'popup=yes,width=420,height=560');
    if (!w) return ctx.toast?.('Pop-up blocked – allow pop-ups for this site, then tap Record again.');
    let fresh = false;
    try { fresh = w.location.href === 'about:blank'; } catch { fresh = false; }
    if (fresh) w.location.href = `${ctx.libBase || ''}record-host.html?s=${encodeURIComponent(S.id)}`; else w.focus();
  }

  // ----- finish a recording: the video, text and category go into the same panel as any other note -----
  function openRecordingSheet() {
    const p = L.pending;
    if (!p) return;
    cancel();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition, r = p.item.recording;
    sheet = Object.assign(document.createElement('form'), { className: 'nxr-sheet' }); sheet.dataset.nxr = '';
    sheet.innerHTML = `<div class="nxr-head"><b>🎥</b> <span>Recording · ${fmt(r.ms)} · ${NXRecPages(r)} page(s) · ${(r.bytes / 1e6).toFixed(1)} MB</span></div>
<video class="nxr-vid" src="${p.url}" controls playsinline></video>
<div class="nxr-sev">${SEV.map(([k, ic, l]) => `<label><input type="radio" name="sev" value="${k}"${k === 'wrong' ? ' checked' : ''}><span>${ic} ${l}</span></label>`).join('')}</div>
<textarea name="note" rows="3" placeholder="Add a note if needed (what should we look at?)"></textarea>
<div class="nxr-row">${SR ? '<button type="button" class="nxr-mic">🎤 Dictate</button>' : ''}<span class="nxr-sp"></span><button type="button" class="nxr-x">Later</button><button type="button" class="nxr-del">Discard</button><button type="submit" class="nxr-ok">Save &amp; send</button></div>`;
    document.body.appendChild(sheet);
    const ta = sheet.querySelector('textarea'), done = () => { stopDictation(true); sheet?.remove(); sheet = null; liveBar(); };
    sheet.querySelector('.nxr-x').addEventListener('click', done); // keep it: the 📎 Finish report button on the bar brings it back
    sheet.querySelector('.nxr-del').addEventListener('click', () => { hostSend({ k: 'cmd', cmd: 'forget' }); URL.revokeObjectURL(p.url); L.pending = null; L.seen.add(p.id); done(); });
    sheet.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = ta.value.trim(), sev = sheet.querySelector('input[name=sev]:checked').value;
      stopDictation(false);
      const item = { ...p.item, severity: sev, note: `${text}${text ? '\n\n' : ''}${p.item.note}`.slice(0, 1900) };
      const n = commitRecording(item, p.id);
      hostSend({ k: 'ack', id: p.id, n, up: upTarget() });
      URL.revokeObjectURL(p.url); L.pending = null;
      done();
    });
    const mic = sheet.querySelector('.nxr-mic');
    if (mic) { mic.addEventListener('mousedown', (e) => e.preventDefault()); mic.addEventListener('click', () => { if (dict) stopDictation(false); else startDictation(SR, ta, mic); }); }
  }
  const NXRecPages = (r) => new Set((r.events || []).filter((e) => e.k === 'page').map((e) => e.url)).size || 1;
  function liveTool(t) {
    L.tool = t; L.sel = null; L.drag = null;
    if (t) { if (tool !== 'browse') setTool('browse'); L.trail = []; }
    L.cv?.classList.toggle('on', !!t); L.cv && (L.cv.dataset.tool = t || '');
    liveBar(); liveDraw();
  }
  function lChanged() { persistMarks(); liveBar(); liveDraw(); }

  // ----- pointer -----
  const lPt = (e) => [e.clientX + scrollX, e.clientY + scrollY];
  function lDown(e) {
    if (!L.tool) return;
    e.preventDefault(); L.cv.setPointerCapture?.(e.pointerId);
    const [x, y] = lPt(e);
    if (L.tool === 'erase') { L.drag = { erase: true }; return lErase(x, y); }
    if (L.tool === 'move') {
      const m = L.s.topAt(x, y, 10); L.sel = m?.id || null;
      L.drag = m ? { move: m, x0: x, y0: y, cur: m } : null; return liveDraw();
    }
    if (L.tool === 'point') { L.drag = { point: true }; L.trail.push({ x: e.clientX, y: e.clientY, t: Date.now() }); return liveDraw(); }
    L.drag = { type: L.tool, pts: [[x, y]] };
  }
  function lMove(e) {
    const [x, y] = lPt(e);
    if (L.tool === 'point') { L.trail.push({ x: e.clientX, y: e.clientY, t: Date.now() }); if (L.trail.length > 80) L.trail.shift(); return liveDraw(); } // trails even without a button down
    const d = L.drag;
    if (!d) return;
    if (d.erase) return lErase(x, y);
    if (d.move) { d.cur = NXAnnotate.shift(d.move, x - d.x0, y - d.y0); return liveDraw(); }
    if (d.type === 'pen' || d.type === 'highlight') d.pts.push([x, y]); else d.pts = [d.pts[0], [x, y]];
    liveDraw();
  }
  function lUp() {
    const d = L.drag; L.drag = null;
    if (!d || d.erase || d.point) return;
    if (d.move) { if (d.cur !== d.move) { L.s.replace(d.cur); hostSend({ k: 'event', ev: { k: 'mark', op: 'move' } }); } return lChanged(); }
    const long = d.pts.length > 1 && Math.hypot(d.pts.at(-1)[0] - d.pts[0][0], d.pts.at(-1)[1] - d.pts[0][1]) > 6 || d.pts.length > 4;
    if (!long && d.type !== 'pen' && d.type !== 'highlight') return liveDraw(); // a tap with a shape tool is not a shape
    const pts = d.type === 'pen' || d.type === 'highlight' ? NXAnnotate.simplify(d.pts) : d.pts;
    L.s.add(NXAnnotate.make(d.type, pts, { color: NXAnnotate.COLORS[L.color], fadeAfter: L.fade ? 5000 : 0 }));
    hostSend({ k: 'event', ev: { k: 'mark', op: 'add', type: d.type } });
    lChanged();
  }
  function lErase(x, y) { const m = L.s.topAt(x, y, 10); if (m) { L.s.remove(m.id); hostSend({ k: 'event', ev: { k: 'mark', op: 'erase' } }); lChanged(); } }
  function lKey(e) {
    if (!L.cv || !(open || recLive())) return;
    const typing = e.target.closest?.('input,textarea,select,[contenteditable=true]');
    if (e.key === 'Escape' && (L.tool || tool !== 'browse')) { if (L.tool) liveTool(null); else setTool('browse'); return; }
    if (typing) return;
    if (e.altKey && e.key.toLowerCase() === 'h') { e.preventDefault(); tuck(!L.tucked); return; }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && L.s.marks.length + (L.s.canUndo ? 1 : 0)) { e.preventDefault(); (e.shiftKey ? L.s.redo() : L.s.undo()); lChanged(); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); L.s.redo(); lChanged(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && L.sel) { e.preventDefault(); L.s.remove(L.sel); L.sel = null; lChanged(); }
  }

  // ----- paint -----
  function liveDraw() {
    if (!L.g) return;
    const g = L.g, now = Date.now();
    g.clearRect(0, 0, innerWidth, innerHeight);
    if (!(open || recLive() || L.s.marks.length)) return;
    if (L.s.sweep(now)) { persistMarks(); liveBar(); }
    L.trail = L.trail.filter((p) => now - p.t < 700);
    const moving = L.drag?.move;
    for (const m of L.s.marks) if (!moving || m.id !== moving.id) NXAnnotate.paint(g, m, scrollX, scrollY, now);
    if (moving) NXAnnotate.paint(g, L.drag.cur, scrollX, scrollY, now);
    const d = L.drag;
    if (d?.type) NXAnnotate.paint(g, NXAnnotate.make(d.type, d.pts, { color: NXAnnotate.COLORS[L.color] }), scrollX, scrollY, now);
    const sel = L.sel && (moving && moving.id === L.sel ? L.drag.cur : L.s.marks.find((m) => m.id === L.sel));
    if (sel) { const b = NXAnnotate.bbox(sel); g.save(); g.setLineDash([6, 4]); g.strokeStyle = '#0a84ff'; g.lineWidth = 1.5; g.strokeRect(b.x - scrollX - 6, b.y - scrollY - 6, b.w + 12, b.h + 12); g.restore(); }
    NXAnnotate.paintTrail(g, L.trail, now);
    cancelAnimationFrame(L.raf);
    if (L.trail.length || L.s.marks.some((m) => m.exp)) L.raf = requestAnimationFrame(liveDraw);
  }

  async function init(c) {
    if (ctx) return;
    ctx = c; loadState(); save();
    await loadHigh();
    // the recorder needs a desktop browser that can share a screen; phones keep the pin + dictate report
    ctx.recorder = !!c.recorder && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== 'undefined';
    if (ctx.recorder && !window.NXAnnotate) {
      await new Promise((ok) => document.head.append(Object.assign(document.createElement('script'), { src: `${ctx.libBase || ''}annotate.js`, onload: ok, onerror: () => { ctx.recorder = false; ok(); } })));
    }
    mount(); flush();
    addEventListener('online', flush);
    addEventListener('pagehide', save);
  }

  window.NXReport = { init, parseUA };
})();
