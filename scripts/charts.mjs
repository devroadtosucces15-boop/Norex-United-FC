// Server-rendered SVG charts. Every mark carries data-tip for the hover tooltip in app.js,
// and CSS classes that animate them in when they scroll into view.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const r1 = (n) => Math.round(n * 10) / 10;

// Line (optionally area) chart. points: [{label, value, tip?}]
export function lineChart(points, { w = 640, h = 220, min, max, color = 'var(--accent)', area = true, ref, fmt = (v) => v, id = 'lc' } = {}) {
  if (points.length < 2) return empty(w, h, 'Needs a couple more matches');
  const pad = { l: 34, r: 12, t: 14, b: 24 };
  const vals = points.map((p) => p.value);
  const lo = min ?? Math.floor(Math.min(...vals) - 0.5);
  const hi = max ?? Math.ceil(Math.max(...vals) + 0.5);
  const x = (i) => pad.l + (i * (w - pad.l - pad.r)) / (points.length - 1);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${r1(x(i))},${r1(y(p.value))}`).join('');
  const ticks = [lo, (lo + hi) / 2, hi];
  return `<svg class="chart line" viewBox="0 0 ${w} ${h}" role="img" aria-label="Line chart">
<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".45"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
${ticks.map((t) => `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${r1(y(t))}" y2="${r1(y(t))}"/><text class="axis" x="${pad.l - 6}" y="${r1(y(t)) + 4}" text-anchor="end">${fmt(r1(t))}</text>`).join('')}
${ref !== undefined ? `<line class="ref" x1="${pad.l}" x2="${w - pad.r}" y1="${r1(y(ref))}" y2="${r1(y(ref))}"/>` : ''}
${area ? `<path class="area" d="${d}L${r1(x(points.length - 1))},${h - pad.b}L${pad.l},${h - pad.b}Z" fill="url(#${id}-g)"/>` : ''}
<path class="stroke draw" d="${d}" stroke="${color}" pathLength="1"/>
${points.map((p, i) => `<circle class="dot" cx="${r1(x(i))}" cy="${r1(y(p.value))}" r="4" fill="${color}" data-tip="${esc(p.tip ?? `${p.label}: ${fmt(p.value)}`)}"/>`).join('')}
${points.length <= 16 ? points.map((p, i) => `<text class="axis" x="${r1(x(i))}" y="${h - 6}" text-anchor="middle">${esc(p.short ?? '')}</text>`).join('') : ''}
</svg>`;
}

// Mirrored bars: goals for (up) vs against (down) per match. items: [{for, against, tip, res}]
export function goalBars(items, { w = 640, h = 220 } = {}) {
  if (!items.length) return empty(w, h, 'No matches archived yet');
  const pad = { l: 12, r: 12, t: 12, b: 12 };
  const mid = h / 2;
  const top = Math.max(3, ...items.map((i) => Math.max(i.for, i.against)));
  const bw = (w - pad.l - pad.r) / items.length;
  const sc = (v) => (v / top) * (mid - pad.t - 4);
  return `<svg class="chart bars" viewBox="0 0 ${w} ${h}" role="img" aria-label="Goals for and against per match">
<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${mid}" y2="${mid}"/>
${items.map((it, i) => {
    const x = pad.l + i * bw + bw * 0.18, bwi = bw * 0.64;
    return `<g data-tip="${esc(it.tip)}"><rect class="bar up ${it.res}" x="${r1(x)}" y="${r1(mid - sc(it.for) - 1)}" width="${r1(bwi)}" height="${r1(Math.max(sc(it.for), 2))}" rx="3" style="--i:${i}"/>
<rect class="bar down" x="${r1(x)}" y="${mid + 1}" width="${r1(bwi)}" height="${r1(Math.max(sc(it.against), 2))}" rx="3" style="--i:${i}"/>
${bw > 22 ? `<text class="axis" x="${r1(x + bwi / 2)}" y="${r1(mid - sc(it.for) - 5)}" text-anchor="middle">${it.for}</text>` : ''}</g>`;
  }).join('')}
<text class="axis" x="${pad.l}" y="${pad.t + 2}">Scored ↑</text><text class="axis" x="${pad.l}" y="${h - 2}">Conceded ↓</text>
</svg>`;
}

// Donut. parts: [{label, value, color}]
export function donut(parts, { size = 180, thick = 26, center = '', sub = '' } = {}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const rad = (size - thick) / 2, c = 2 * Math.PI * rad;
  let off = 0;
  return `<svg class="chart donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(parts.map((p) => `${p.label} ${p.value}`).join(', '))}">
<circle cx="${size / 2}" cy="${size / 2}" r="${rad}" fill="none" class="track" stroke-width="${thick}"/>
${parts.map((p) => {
    const len = (p.value / total) * c;
    const seg = `<circle class="seg" cx="${size / 2}" cy="${size / 2}" r="${rad}" fill="none" stroke="${p.color}" stroke-width="${thick}" stroke-dasharray="${r1(Math.max(len - 2, 0))} ${r1(c)}" stroke-dashoffset="${r1(-off)}" transform="rotate(-90 ${size / 2} ${size / 2})" data-tip="${esc(`${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`)}"/>`;
    off += len;
    return seg;
  }).join('')}
<text x="50%" y="48%" text-anchor="middle" class="donut-big">${esc(center)}</text><text x="50%" y="62%" text-anchor="middle" class="axis">${esc(sub)}</text>
</svg>`;
}

// Radar. axes: [{label}], sets: [{values:[0..100], color, name}]
export function radar(axes, sets, { size = 300 } = {}) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 44, n = axes.length;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)];
  };
  const ring = (v) => axes.map((_, i) => pt(i, v).map(r1).join(',')).join(' ');
  return `<svg class="chart radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="Radar chart">
${[25, 50, 75, 100].map((v) => `<polygon class="grid" points="${ring(v)}" fill="none"/>`).join('')}
${axes.map((a, i) => { const [x, y] = pt(i, 100); const [lx, ly] = pt(i, 122); return `<line class="grid" x1="${cx}" y1="${cy}" x2="${r1(x)}" y2="${r1(y)}"/><text class="axis rl" x="${r1(lx)}" y="${r1(ly) + 4}" text-anchor="middle">${esc(a.label)}</text>`; }).join('')}
${sets.map((s, si) => `<polygon class="shape" style="--d:${si}" points="${s.values.map((v, i) => pt(i, Math.max(v, 3)).map(r1).join(',')).join(' ')}" fill="${s.color}" fill-opacity=".28" stroke="${s.color}" stroke-width="2.5"/>
${s.values.map((v, i) => { const [x, y] = pt(i, Math.max(v, 3)); return `<circle cx="${r1(x)}" cy="${r1(y)}" r="3.5" fill="${s.color}" data-tip="${esc(`${s.name ? s.name + ' – ' : ''}${axes[i].label}: ${axes[i].raw?.[si] ?? ''} (top ${100 - Math.round(v)}%)`)}"/>`; }).join('')}`).join('')}
</svg>`;
}

// Tiny inline sparkline for tables/cards.
export function spark(values, { w = 90, h = 26, color = 'var(--accent)' } = {}) {
  if (values.length < 2) return '';
  const lo = Math.min(...values), hi = Math.max(...values);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${r1((i * w) / (values.length - 1))},${r1(h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6))}`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

// Estimated position map (P7.3 – EA gives no pitch coordinates, so this is role + involvement, not a real heat map).
// zones: [{label, x, y, r, intensity (0..1), tip}]
export function pitchMap(zones, { w = 260, h = 380 } = {}) {
  if (!zones.length) return empty(w, h, 'No matches yet');
  const x = (pct) => (pct / 100) * w, y = (pct) => (pct / 100) * h;
  return `<svg class="chart posmap" viewBox="0 0 ${w} ${h}" role="img" aria-label="Estimated position map">
<rect class="pm-turf" x="1" y="1" width="${w - 2}" height="${h - 2}" rx="6"/>
<g class="pm-lines" fill="none">
<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="4"/>
<line x1="6" x2="${w - 6}" y1="${r1(h / 2)}" y2="${r1(h / 2)}"/>
<circle cx="${r1(w / 2)}" cy="${r1(h / 2)}" r="${r1(w * 0.16)}"/>
<rect x="${r1(w * 0.24)}" y="6" width="${r1(w * 0.52)}" height="${r1(h * 0.16)}"/>
<rect x="${r1(w * 0.24)}" y="${r1(h - 6 - h * 0.16)}" width="${r1(w * 0.52)}" height="${r1(h * 0.16)}"/>
</g>
${zones.map((z) => `<circle class="pm-zone" cx="${r1(x(z.x))}" cy="${r1(y(z.y))}" r="${r1(z.r)}" fill-opacity="${r1(0.15 + z.intensity * 0.65)}" data-tip="${esc(z.tip)}"/>
<text class="pm-label" x="${r1(x(z.x))}" y="${r1(y(z.y) + 4)}" text-anchor="middle">${esc(z.label)}</text>`).join('')}
</svg>`;
}

function empty(w, h, msg) {
  return `<svg class="chart" viewBox="0 0 ${w} ${h}"><text x="50%" y="50%" text-anchor="middle" class="axis">${esc(msg)}</text></svg>`;
}
