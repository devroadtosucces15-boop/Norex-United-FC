// NOREX pitch + formation renderer. Geometry is real (IFAB Law 1 for League, EA Rush dimensions for Rush) and every orientation is computed, never CSS-rotated:
// markings, markers, labels and the direction arrow are all transformed together from the same (depth, lateral) coordinates.
(() => {
  const SPEC = { league: { L: 105, W: 68 }, rush: { L: 63.7, W: 46.6 } };
  // depth: 0 = own goal line, 1 = opposition goal line. lat: 0 = our left, 1 = our right (looking towards the opposition goal).
  const LAT = { 1: [.5], 2: [.36, .64], 3: [.22, .5, .78], 4: [.12, .37, .63, .88], 5: [.1, .3, .5, .7, .9] };
  function leagueSlots(f) { const R = f.rows.length, out = [{ s: 'GK', depth: .055, lat: .5 }]; f.rows.forEach((row, k) => row.forEach((s, j) => out.push({ s, depth: R === 1 ? .5 : .2 + .64 * k / (R - 1), lat: LAT[row.length][j] }))); return out; }
  const RUSH = {
    '3-1': [{ s: 'ST', role: 'Striker', depth: .86, lat: .5 }, { s: 'B2B', role: 'Defensive box-to-box', depth: .48, lat: .21 }, { s: 'B2B', role: 'Defensive box-to-box', depth: .48, lat: .79 }, { s: 'SB', role: 'Stay-back defender', depth: .21, lat: .5 }, { s: 'GK', role: 'AI goalkeeper', depth: .05, lat: .5, ai: true }],
    '2-2': [{ s: 'ST', role: 'Striker', depth: .75, lat: .73 }, { s: 'B2B', role: 'Offensive box-to-box', depth: .59, lat: .21 }, { s: 'B2B', role: 'Defensive box-to-box', depth: .33, lat: .73 }, { s: 'SB', role: 'Stay-back defender', depth: .31, lat: .25 }, { s: 'GK', role: 'AI goalkeeper', depth: .05, lat: .5, ai: true }] };
  const ln = 'fill="none" stroke="#ffffffd0" stroke-width=".32"';
  const PAD = 2.2;
  // pitch drawn in its own (length x width) frame, then oriented by swapping axes for portrait
  function markings(mode) {
    const { L, W } = SPEC[mode]; let g = '';
    const n = mode === 'league' ? 14 : 10;
    for (let i = 0; i < n; i++) g += `<rect x="${i * L / n}" y="0" width="${L / n + .05}" height="${W}" fill="${i % 2 ? '#17603a' : '#14502e'}"/>`;
    g += `<rect x="0" y="0" width="${L}" height="${W}" ${ln}/><line x1="${L / 2}" y1="0" x2="${L / 2}" y2="${W}" ${ln}/>`;
    if (mode === 'league') {
      g += `<circle cx="${L / 2}" cy="${W / 2}" r="9.15" ${ln}/><circle cx="${L / 2}" cy="${W / 2}" r=".4" fill="#fff"/>`;
      for (const s of [0, 1]) {
        const x = s ? L : 0, d = s ? -1 : 1;
        g += `<rect x="${s ? L - 16.5 : 0}" y="13.84" width="16.5" height="40.32" ${ln}/><rect x="${s ? L - 5.5 : 0}" y="24.84" width="5.5" height="18.32" ${ln}/><circle cx="${x + d * 11}" cy="${W / 2}" r=".4" fill="#fff"/><path d="M${x + d * 16.5} ${W / 2 - 7.31} A9.15 9.15 0 0 ${s ? 0 : 1} ${x + d * 16.5} ${W / 2 + 7.31}" ${ln}/><rect x="${s ? L : -2}" y="${W / 2 - 3.66}" width="2" height="7.32" ${ln}/><path d="M${x} 1 A1 1 0 0 ${s ? 0 : 1} ${x + d} 0 M${x} ${W - 1} A1 1 0 0 ${s ? 1 : 0} ${x + d} ${W}" ${ln}/>`;
      }
    } else {
      g += `<circle cx="${L / 2}" cy="${W / 2}" r="${W * .135}" ${ln}/><circle cx="${L / 2}" cy="${W / 2}" r=".35" fill="#fff"/>`;
      for (const s of [0, 1]) {
        const bd = L * .134, bw = W * .45, gd = L * .058, gw = W * .26;
        g += `<rect x="${s ? L - bd : 0}" y="${(W - bw) / 2}" width="${bd}" height="${bw}" ${ln}/><rect x="${s ? L - gd : 0}" y="${(W - gw) / 2}" width="${gd}" height="${gw}" ${ln}/><rect x="${s ? L : -1.6}" y="${W / 2 - 3.2}" width="1.6" height="6.4" ${ln}/>`;
      }
    }
    return g;
  }
  function svg(mode, orient) {
    const { L, W } = SPEC[mode], m = markings(mode);
    return orient === 'h'
      ? `<svg class="pf" viewBox="${-PAD} ${-PAD / 2} ${L + 2 * PAD} ${W + PAD}" preserveAspectRatio="none" aria-hidden="true">${m}</svg>`
      : `<svg class="pf" viewBox="${-PAD / 2} ${-PAD} ${W + PAD} ${L + 2 * PAD}" preserveAspectRatio="none" aria-hidden="true"><g transform="translate(0,${L}) rotate(-90)">${m}</g></svg>`;
  }
  // % position inside the pitch box (the box ratio includes the same padding the svg viewBox uses, so markers stay on their spot)
  function at(mode, orient, depth, lat) {
    const { L, W } = SPEC[mode];
    if (orient === 'h') return { x: ((depth * L + PAD) / (L + 2 * PAD)) * 100, y: ((lat * W + PAD / 2) / (W + PAD)) * 100 };
    return { x: ((lat * W + PAD / 2) / (W + PAD)) * 100, y: (((1 - depth) * L + PAD) / (L + 2 * PAD)) * 100 };
  }
  function fromAt(mode, orient, x, y) {
    const { L, W } = SPEC[mode], clamp = (v) => Math.max(0, Math.min(1, v));
    if (orient === 'h') return { depth: clamp(((x / 100) * (L + 2 * PAD) - PAD) / L), lat: clamp(((y / 100) * (W + PAD) - PAD / 2) / W) };
    return { lat: clamp(((x / 100) * (W + PAD) - PAD / 2) / W), depth: clamp(1 - ((y / 100) * (L + 2 * PAD) - PAD) / L) };
  }
  function ratio(mode, orient) { const { L, W } = SPEC[mode]; return orient === 'h' ? (L + 2 * PAD) / (W + PAD) : (W + PAD) / (L + 2 * PAD); }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const SIL = '<svg class="fb" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><path class="sil" d="M50 14c-9 0-16 8-16 18 0 8 4 14 9 17-14 3-27 12-30 27v8h74v-8c-3-15-16-24-30-27 5-3 9-9 9-17 0-10-7-18-16-18z"/></svg>';
  const ringOf = (s) => (s === 'GK' ? '#4aa3ff' : /^(LCB|CB|RCB|SB|LB|RB|LWB|RWB)$/.test(s) ? '#e0493f' : /^(ST|LS|RS|LF|RF|LW|RW|CF)$/.test(s) ? '#fff1c2' : '#efcf7a');
  function markerHTML(m, p, pos, size, ai) {
    const nm = p ? (p.n.length > 12 ? p.n.slice(0, 11) + '…' : p.n) : (m.role || 'Open');
    const face = ai ? '<span style="display:grid;place-items:center;height:100%;font-size:calc(var(--s)*22px)">🧤</span>' : `<span class="art">${SIL}<img class="cut" alt="" decoding="async"></span>`;
    return `<button type="button" class="pc pc-marker${ai ? ' ai' : ''}${m.s === 'GK' ? ' gk' : ''}" style="left:${pos.x}%;top:${pos.y}%;--s:${size};--mc:${ringOf(m.s)}" ${p ? `data-k="${esc(p.k)}"` : ''} data-slot="${esc(m.s)}" aria-label="${esc(m.s)} ${esc(nm)}"><span class="face">${face}</span><span class="slot">${esc(m.s)}</span><span class="lab">${esc(nm)}${p ? `<small>${esc(p.arch || p.line)}</small>` : ''}</span></button>`;
  }
  // opts: mode, orient ('h' | 'v' | 'auto'), slots, assign {index -> player}, three (3D camera), onPick(slotIndex, el)
  function mount(root, o) {
    const state = { ...o };
    const maxW = { league: { h: 900, v: 340 }, rush: { h: 640, v: 300 } };
    function draw() {
      const mode = state.mode, orient = state.orient === 'auto' ? (root.clientWidth >= 640 ? 'h' : 'v') : state.orient;
      const mw = Math.min(root.clientWidth || 600, maxW[mode][orient]), r = ratio(mode, orient);
      const size = mode === 'league' ? (mw < 420 ? .78 : orient === 'h' ? 1.05 : .95) : (mw < 360 ? 1 : 1.2);
      const three = state.three && orient === 'h' && !(window.NorexMotion && window.NorexMotion.lite);
      const mk = state.slots.map((m, i) => markerHTML(m, state.assign && state.assign[i], at(mode, orient, m.depth, m.lat), size, m.ai)).join('');
      const dir = orient === 'h'
        ? `<span class="dir" style="left:50%;bottom:-26px;transform:translateX(-50%);white-space:nowrap">own goal ◂ attacking ▸ opposition goal</span>`
        : `<span class="dir" style="left:50%;top:-22px;transform:translateX(-50%);white-space:nowrap">▴ attacking</span><span class="dir" style="left:50%;bottom:-22px;transform:translateX(-50%);white-space:nowrap">own goal</span>`;
      root.innerHTML = `<div class="camera"><div class="pitchbox${three ? ' tilt3d' : ''}" style="width:${mw}px;aspect-ratio:${r}" data-orient="${orient}">${svg(mode, orient)}${mk}${three ? '' : dir}</div></div>${three ? '<div class="muted tiny" style="text-align:center;margin-top:-30px">own goal ◂ attacking ▸ opposition goal</div>' : ''}`;
      root.dataset.orient = orient; root.style.paddingBottom = '34px';
      if (window.NorexArt) window.NorexArt.apply(root);
      root.querySelectorAll('.pc-marker').forEach((el, i) => el.addEventListener('click', () => { if (state.onPick) state.onPick(i, el); }));
    }
    draw();
    let w = root.clientWidth;
    const ro = new ResizeObserver(() => { if (Math.abs(root.clientWidth - w) > 8) { w = root.clientWidth; draw(); } });
    ro.observe(root);
    return { update(p) { Object.assign(state, p); draw(); }, destroy() { ro.disconnect(); } };
  }
  window.NorexPitch = { mount, leagueSlots, RUSH, SPEC, at, fromAt };
})();
