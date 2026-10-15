// Live drawing marks for the owner's screen recorder (loaded by web/report.js). Pure maths + canvas painting, no DOM, so it is unit-tested
// in tests/recorder.test.mjs. Marks live in DOCUMENT coordinates (so scrolling carries them) and are painted with the scroll offset removed.
//   NXAnnotate.make(type, pts, opts)      a new mark   { id, type, color, w, pts, exp? }
//   NXAnnotate.paint(ctx, mark, ox, oy, now)   draw one mark (ox/oy = scroll offset)
//   NXAnnotate.hit(mark, x, y, tol)       is this point on the mark (eraser / mover)
//   NXAnnotate.shift(mark, dx, dy)        a moved copy
//   NXAnnotate.simplify(pts, min)         thin a pen stroke
//   NXAnnotate.paintTrail(ctx, trail, now)  the fading laser pointer
//   NXAnnotate.store(max)                 marks + undo/redo history
(() => {
  const COLORS = ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#ffffff'];
  const WIDTH = { pen: 4, arrow: 4, box: 4, circle: 4, highlight: 24 };
  const FADE_MS = 1000; // a fading mark dims over its last second
  const TRAIL_MS = 700;
  let uid = 0;

  const make = (type, pts, { color = COLORS[0], fadeAfter = 0, now = Date.now() } = {}) => ({
    id: `m${now.toString(36)}${(uid++).toString(36)}`, type, color, w: WIDTH[type] || 4, pts: pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]),
    ...(fadeAfter ? { exp: now + fadeAfter } : {}),
  });

  const bbox = (m) => {
    const xs = m.pts.map((p) => p[0]), ys = m.pts.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  };

  const alphaOf = (m, now) => (m.exp ? Math.max(0, Math.min(1, (m.exp - now) / FADE_MS)) : 1);

  function paint(c, m, ox = 0, oy = 0, now = Date.now()) {
    const a = alphaOf(m, now);
    if (a <= 0) return;
    c.save();
    c.translate(-ox, -oy);
    c.globalAlpha = a * (m.type === 'highlight' ? 0.38 : 1);
    c.strokeStyle = c.fillStyle = m.color; c.lineWidth = m.w; c.lineCap = m.type === 'highlight' ? 'butt' : 'round'; c.lineJoin = 'round';
    const [p, q] = m.pts, b = bbox(m);
    if (m.type === 'box') c.strokeRect(b.x, b.y, b.w, b.h);
    else if (m.type === 'circle') { c.beginPath(); c.ellipse(b.x + b.w / 2, b.y + b.h / 2, Math.max(1, b.w / 2), Math.max(1, b.h / 2), 0, 0, Math.PI * 2); c.stroke(); }
    else if (m.type === 'arrow' && q) {
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), h = 8 + m.w * 2;
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke();
      c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] - h * Math.cos(ang - 0.45), q[1] - h * Math.sin(ang - 0.45)); c.lineTo(q[0] - h * Math.cos(ang + 0.45), q[1] - h * Math.sin(ang + 0.45)); c.closePath(); c.fill();
    } else { // pen / highlight: a single polyline (one-point strokes become a dot)
      c.beginPath(); m.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      if (m.pts.length === 1) c.lineTo(m.pts[0][0] + 0.01, m.pts[0][1]);
      c.stroke();
    }
    c.restore();
  }

  // laser pointer: points are viewport coords, each fades over TRAIL_MS
  function paintTrail(c, trail, now = Date.now()) {
    for (let i = 0; i < trail.length; i++) {
      const age = now - trail[i].t;
      if (age > TRAIL_MS) continue;
      const k = 1 - age / TRAIL_MS;
      c.save(); c.globalAlpha = k * 0.9; c.fillStyle = '#ff3b30'; c.shadowColor = '#ff3b30'; c.shadowBlur = 14;
      c.beginPath(); c.arc(trail[i].x, trail[i].y, 4 + 7 * k, 0, Math.PI * 2); c.fill(); c.restore();
    }
  }

  const segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  function hit(m, x, y, tol = 8) {
    const reach = tol + m.w / 2, b = bbox(m);
    if (m.type === 'box') {
      return x >= b.x - reach && x <= b.x + b.w + reach && y >= b.y - reach && y <= b.y + b.h + reach && !(x > b.x + reach && x < b.x + b.w - reach && y > b.y + reach && y < b.y + b.h - reach);
    }
    if (m.type === 'circle') {
      const rx = Math.max(1, b.w / 2), ry = Math.max(1, b.h / 2), nx = (x - (b.x + b.w / 2)) / rx, ny = (y - (b.y + b.h / 2)) / ry;
      const r = Math.hypot(nx, ny), band = reach / Math.min(rx, ry);
      return Math.abs(r - 1) <= band;
    }
    for (let i = 0; i < m.pts.length; i++) {
      const a = m.pts[i], z = m.pts[i + 1] || a;
      if (segDist(x, y, a[0], a[1], z[0], z[1]) <= reach) return true;
    }
    return false;
  }

  const shift = (m, dx, dy) => ({ ...m, pts: m.pts.map(([x, y]) => [x + dx, y + dy]) });

  // keep a pen stroke light: drop points closer than `min` px to the previous kept one (the last point is always kept)
  function simplify(pts, min = 2) {
    if (pts.length < 3) return pts.slice();
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) if (Math.hypot(pts[i][0] - out.at(-1)[0], pts[i][1] - out.at(-1)[1]) >= min) out.push(pts[i]);
    out.push(pts.at(-1));
    return out;
  }

  // marks + undo/redo. Every change snapshots the list (marks themselves are never mutated, only replaced), so history is cheap.
  function store(max = 200, depth = 100) {
    let marks = [], past = [], future = [];
    const push = () => { past.push(marks); if (past.length > depth) past.shift(); future = []; };
    const api = {
      get marks() { return marks; },
      add(m) { push(); marks = [...marks, m].slice(-max); return m; },
      remove(id) { if (!marks.some((m) => m.id === id)) return false; push(); marks = marks.filter((m) => m.id !== id); return true; },
      replace(m) { if (!marks.some((x) => x.id === m.id)) return false; push(); marks = marks.map((x) => (x.id === m.id ? m : x)); return true; },
      clear() { if (!marks.length) return false; push(); marks = []; return true; },
      undo() { if (!past.length) return false; future.push(marks); marks = past.pop(); return true; },
      redo() { if (!future.length) return false; past.push(marks); marks = future.pop(); return true; },
      // fading marks that ran out disappear without touching the undo history
      sweep(now = Date.now()) { const keep = marks.filter((m) => !m.exp || m.exp > now); if (keep.length === marks.length) return false; marks = keep; return true; },
      topAt(x, y, tol) { for (let i = marks.length - 1; i >= 0; i--) if (hit(marks[i], x, y, tol)) return marks[i]; return null; },
      load(list) { marks = Array.isArray(list) ? list.filter((m) => m && m.type && Array.isArray(m.pts)).slice(-max) : []; past = []; future = []; },
      get canUndo() { return past.length > 0; },
      get canRedo() { return future.length > 0; },
    };
    return api;
  }

  window.NXAnnotate = { COLORS, make, paint, paintTrail, hit, shift, bbox, simplify, store, alphaOf };
})();
