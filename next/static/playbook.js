// Tactics › Playbook (B1, read-only first). The live routes in bot/plays.js: GET /api/plays (published plays + my learned/quiz state;
// managers also see drafts and assigned/learned counts) and GET /api/plays/:id (the current document: pieces, keyframe steps, chalk
// drawings, quiz questions without answers). The board is drawn as one SVG in either orientation with the live Studio's chalk shapes;
// playback interpolates the keyframes (play/pause, scrub, speed, jump to a key moment). Deep links use the live hash, #play<id>.
// Writes: ✅ Learned it (NorexTonight.learn – the same route and state as Match Night), the knowledge check (POST /api/plays/:id/quiz,
// scored by the server, a perfect score ticks the play) and recordings (GET /api/plays/:id/media, played from a Bearer-fetched blob).
// Managers with the owner flag `nxStudio` edit in the /next/ Studio (studio.js, #edit<id>); everyone else's edit link opens the live one.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const el = $('#pbook'); if (!el) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const put = (html, then) => (M ? M.land(el, html, then) : ((el.innerHTML = html), then?.(el)));
  const flagOn = (f) => (A.features || []).includes(f);
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
  const live = (id) => `../tactics.html${id ? '#play' + encodeURIComponent(id) : ''}`;
  const CAT = { 'set-piece': ['🎯', 'Set piece', 'Set pieces'], formation: ['🧩', 'Formation', 'Formations'], drill: ['🏃', 'Drill', 'Drills'] };
  const TEAM = { us: ['Us', '🔴'], opp: ['Opponent', '⚪'], ball: ['Ball', '⚽'], cone: ['Cone', '🔶'], joker: ['Joker', '🟡'] };
  const fail = (e) => { el.removeAttribute('aria-busy'); el.innerHTML = `<div class="panel sq-empty"><span>📡</span><div><b>Could not load the Playbook</b><p class="muted small">${esc(e?.message || 'The club server did not answer.')}</p><button type="button" class="btn ghost" data-pbretry>↻ Try again</button></div></div>`; };
  const studioOn = () => manager && flagOn('nxStudio') && !!window.NorexStudio;
  const state = (m) => m?.learned ? ['got', '✅', 'Learned'] : m?.assigned ? ['todo', '📌', 'To learn'] : ['opt', '▶', 'Optional'];

  // ================= 📚 LIST =================
  let plays = [], manager = false, cat = 'all', mineOnly = false, q = '';
  const listHtml = () => { const shown = plays.filter((p) => (cat === 'all' || p.category === cat) && (!mineOnly || (p.mine?.assigned && !p.mine?.learned)) && (!q || p.title.toLowerCase().includes(q)));
    const asg = plays.filter((p) => p.mine?.assigned), got = asg.filter((p) => p.mine?.learned).length, todo = asg.length - got, f = asg.length ? got / asg.length : 0;
    return `<div class="pb-top"><div class="panel pb-sum"><div class="tp-ring" style="--f:${f.toFixed(3)}" role="img" aria-label="${got} of ${asg.length} assigned plays learned"><b class="num">${got}/${asg.length}</b><small>learned</small></div>
<div><div class="eyebrow">📚 Club playbook</div><h3><b class="num" data-count="${plays.length}">${plays.length}</b> play${plays.length === 1 ? '' : 's'}</h3><p class="small muted">${asg.length ? (todo ? `📌 ${todo} assigned to you still to learn` : '🎉 Everything assigned to you is learned') : 'Nothing assigned to you right now. Browse and study any play.'}</p></div></div>
<div class="panel pb-how"><div class="eyebrow">🎬 How it works</div><ul class="pb-steps"><li><span>1</span>Open a play and press ▶ to watch the movement</li><li><span>2</span>Scrub or tap a key moment to pause on it</li><li><span>3</span>Tick ✅ Learned it or ace the quiz before kick-off</li></ul></div></div>
<div class="sq-bar pb-bar"><div class="chips" role="tablist" aria-label="Category">${[['all', '📚', 'All'], ...Object.entries(CAT).map(([k, [i, , l]]) => [k, i, l])].map(([k, i, l]) => `<button type="button" role="tab" class="chip${k === cat ? ' on' : ''}" aria-selected="${k === cat}" data-pbcat="${k}">${i} ${l} <small class="muted num">${k === 'all' ? plays.length : plays.filter((p) => p.category === k).length}</small></button>`).join('')}<button type="button" class="chip${mineOnly ? ' on' : ''}" aria-pressed="${mineOnly}" data-pbmine>📌 To learn <small class="muted num">${todo}</small></button></div>
<label class="pb-q"><span aria-hidden="true">🔎</span><input type="search" id="pb-q" placeholder="Find a play" value="${esc(q)}" aria-label="Find a play by name"></label></div>
${shown.length ? `<ul class="pb-grid rv-g">${shown.map((p, i) => { const [k, ic, lab] = state(p.mine), [ci, cl] = CAT[p.category] || ['📋', 'Play'], ac = p.assignCounts;
      return `<li style="--i:${Math.min(i, 10)}"><a class="pb-card c-${esc(p.category)}${p.published ? '' : ' draft'}" href="#play${p.id}"><span class="pb-ci" aria-hidden="true">${ci}</span><div class="pb-ct"><b>${esc(p.title)}</b><small class="muted">${cl} · v${p.version} · ${esc(ago(p.updatedAt))}</small></div>
<div class="pb-cs">${p.published ? `<span class="pb-st ${k}">${ic} ${lab}</span>` : '<span class="pill s">DRAFT</span>'}${p.mine?.quiz ? `<span class="pb-qz" title="Your quiz score">🧠 ${p.mine.quiz.score}/${p.mine.quiz.total}</span>` : ''}</div>
${manager && ac ? (ac.assigned ? `<div class="pb-ac" title="${ac.learned} of ${ac.assigned} assigned have learned it"><i style="--w:${(ac.learned / ac.assigned).toFixed(3)}"></i><small class="muted">👥 ${ac.learned}/${ac.assigned} learned</small></div>` : '<div class="pb-ac"><small class="muted">👥 Not assigned to anyone yet</small></div>') : ''}</a></li>`; }).join('')}</ul>`
    : `<div class="panel sq-empty"><span>${plays.length ? '🔍' : '📭'}</span><div><b>${plays.length ? 'No plays match' : 'No plays published yet'}</b><p class="muted small">${plays.length ? 'Try another category or clear the search.' : 'Managers draw set pieces, shapes and drills in the Studio. They show up here once published.'}</p></div></div>`}
${manager ? (studioOn() ? `<form class="panel pb-new" data-pbnew><div class="eyebrow">✏️ New play</div><div class="pb-newrow"><input name="title" maxlength="80" required placeholder="Name it, e.g. Far-post corner" aria-label="Play title"><select name="category" aria-label="Category">${Object.entries(CAT).map(([k, [i, l]]) => `<option value="${k}">${i} ${l}</option>`).join('')}</select><button class="btn gold" type="submit">＋ Create and open the Studio</button></div><p class="tiny muted">It starts as a draft only managers can see. Publish it from the Studio when it is ready.</p></form>`
      : `<p class="tiny muted pb-mgr">🛠️ You manage plays: drafts show here too. Create and edit them in the <a href="${live()}" target="_blank" rel="noopener">live Studio</a> for now.</p>`) : ''}`; };
  const paintList = (land) => { stop(); land ? put(listHtml()) : (el.innerHTML = listHtml()); };

  // ================= 🎬 VIEWER =================
  const W = 1000, H = 640;
  let P = null, vert = false, frames = [], dur = 0, t = 0, playing = false, speed = 1, raf = 0, last = 0;
  try { const s = localStorage.getItem('norex_tx_vert'); vert = s == null ? matchMedia('(max-width:700px)').matches : s === '1'; } catch {}
  const sp = (x, y) => (vert ? [y, W - x] : [x, y]); // (studio.js reads the same orientation through NorexBoard) // tall view: turned so we attack up the screen, our left stays on the left
  const f1 = (n) => Number(n).toFixed(1);
  const colorOf = (c) => (/^#[0-9a-f]{6}$/i.test(c ?? '') ? c : '#c8352c');
  // one chalk item → SVG (the live Studio's shapes, so a play looks the same on both sites)
  function shape(dw) {
    const col = colorOf(dw.color), w = dw.w || 6, kind = dw.kind || 'free', Pt = (dw.points || []).map((p) => sp(p[0], p[1])); if (!Pt.length) return '';
    const dash = kind === 'dash' || kind === 'run' ? ` stroke-dasharray="${w * 2.4} ${w * 1.8}"` : '';
    const stroke = `stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash}`, line = `fill="none" ${stroke}`, area = dw.fill ? `fill="${col}" fill-opacity=".28" ${stroke}` : line;
    const head = (a, b) => { const g = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 20 + w * 2.4, o = 0.42; return `<polygon points="${f1(b[0])},${f1(b[1])} ${f1(b[0] - L * Math.cos(g - o))},${f1(b[1] - L * Math.sin(g - o))} ${f1(b[0] - L * Math.cos(g + o))},${f1(b[1] - L * Math.sin(g + o))}" fill="${col}" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`; };
    const [a, b] = Pt;
    if (kind === 'free') return `<polyline points="${Pt.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')}" ${line}/>`;
    if (kind === 'dot') return `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${7 + w * 1.4}" fill="${col}" stroke="#0b0f16" stroke-width="2"/>`;
    if (kind === 'text') return `<text x="${f1(a[0])}" y="${f1(a[1])}" text-anchor="middle" dominant-baseline="middle" fill="${col}" stroke="#0b0f16" stroke-width="6" paint-order="stroke" font-family="Inter,sans-serif" font-weight="800" font-size="${28 + w * 1.5}">${esc(dw.text || '')}</text>`;
    if (!b) return '';
    if (kind === 'circle') return `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${f1(Math.hypot(b[0] - a[0], b[1] - a[1]))}" ${area}/>`;
    if (kind === 'rect') return `<rect x="${f1(Math.min(a[0], b[0]))}" y="${f1(Math.min(a[1], b[1]))}" width="${f1(Math.abs(b[0] - a[0]))}" height="${f1(Math.abs(b[1] - a[1]))}" rx="8" ${area}/>`;
    if (kind === 'curve') { const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, bend = (dw.bend === -1 ? -1 : 1) * 0.28 * len, c = [(a[0] + b[0]) / 2 - (dy / len) * bend, (a[1] + b[1]) / 2 + (dx / len) * bend];
      return `<path d="M${f1(a[0])},${f1(a[1])} Q${f1(c[0])},${f1(c[1])} ${f1(b[0])},${f1(b[1])}" ${line}/>${head(c, b)}`; }
    const both = kind === 'darrow', one = kind === 'arrow' || kind === 'run';
    return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" ${line}/>${one || both ? head(a, b) : ''}${both ? head(b, a) : ''}`;
  }
  // the pitch markings, drawn in play coordinates and mapped like everything else
  const marks = () => { const L = (x1, y1, x2, y2) => { const [a, b] = sp(x1, y1), [c, e] = sp(x2, y2); return `<line x1="${a}" y1="${b}" x2="${c}" y2="${e}"/>`; };
    const R = (x, y, w, h) => { const [a, b] = sp(x, y), [c, e] = sp(x + w, y + h); return `<rect x="${Math.min(a, c)}" y="${Math.min(b, e)}" width="${Math.abs(c - a)}" height="${Math.abs(e - b)}"/>`; };
    const [cx, cy] = sp(500, 320), [s1x, s1y] = sp(115, 320), [s2x, s2y] = sp(885, 320);
    return `<g class="pb-lines">${R(14, 14, 972, 612)}${L(500, 14, 500, 626)}<circle cx="${cx}" cy="${cy}" r="88"/><circle cx="${cx}" cy="${cy}" r="5" class="dot"/>${R(14, 150, 160, 340)}${R(826, 150, 160, 340)}${R(14, 240, 56, 160)}${R(930, 240, 56, 160)}<circle cx="${s1x}" cy="${s1y}" r="5" class="dot"/><circle cx="${s2x}" cy="${s2y}" r="5" class="dot"/>${R(2, 280, 12, 80)}${R(986, 280, 12, 80)}</g>`; };
  const stripes = () => Array.from({ length: 10 }, (_, i) => { const [a, b] = sp(i * 100, 0), [c, e] = sp(i * 100 + 100, H); return i % 2 ? '' : `<rect class="pb-stripe" x="${Math.min(a, c)}" y="${Math.min(b, e)}" width="${Math.abs(c - a)}" height="${Math.abs(e - b)}"/>`; }).join('');
  const pieceSvg = (p, sel) => { const [x, y] = sp(p.x, p.y), lab = p.label || '', on = sel === p.id ? ' sel' : '';
    if (p.team === 'ball') return `<g class="pb-pc ball${on}" data-pc="${esc(p.id)}" transform="translate(${f1(x)},${f1(y)})"><circle r="10"/><path d="M-4,-3 L0,-6 L4,-3 L3,2 L-3,2Z"/></g>`;
    if (p.team === 'cone') return `<g class="pb-pc cone${on}" data-pc="${esc(p.id)}" transform="translate(${f1(x)},${f1(y)})"><polygon points="0,-15 13,11 -13,11"/></g>`;
    return `<g class="pb-pc ${esc(p.team)}${on}" data-pc="${esc(p.id)}" transform="translate(${f1(x)},${f1(y)})"><circle r="21"/>${lab ? `<text dy="1" font-size="${lab.length > 3 ? 12 : 15}">${esc(lab.slice(0, 5))}</text>` : ''}</g>`; };
  // edit = the Studio's board: a preview layer for chalk being drawn, the selected piece ringed, touch goes to the editor
  const boardSvg = (doc = P.doc || {}, o = {}) => `<svg class="pb-svg${o.edit ? ' edit' : ''}" viewBox="0 0 ${vert ? H : W} ${vert ? W : H}" role="img" aria-label="${esc(o.title ?? P?.title ?? 'Play')}: tactics board with ${(doc.pieces || []).length} pieces">
<rect class="pb-turf" x="0" y="0" width="${vert ? H : W}" height="${vert ? W : H}" rx="18"/>${stripes()}${marks()}<g class="pb-chalk">${(doc.drawings || []).map(shape).join('')}</g>${o.edit ? '<g class="pb-prev" data-prev></g>' : ''}<g class="pb-pcs">${(doc.pieces || []).map((p) => pieceSvg(p, o.sel)).join('')}</g></svg>`;
  // keyframes → full position maps (a piece missing from a step keeps its last place), with the start positions at 0 s
  const framesOf = (doc) => { const base = Object.fromEntries((doc.pieces || []).map((p) => [p.id, { x: p.x, y: p.y }]));
    const steps = [...(doc.steps || [])].sort((a, b) => a.at - b.at), list = steps.length && steps[0].at === 0 ? [] : [{ at: 0, pieces: base }];
    let cur = base; for (const s of steps) { cur = { ...cur, ...s.pieces }; list.push({ at: s.at, pieces: cur }); }
    return list; };
  const buildFrames = () => { frames = framesOf(P.doc || {}); dur = frames.length ? frames[frames.length - 1].at : 0; };
  const posAt = (time, fr = frames) => { if (!fr.length) return {}; let i = 0; while (i < fr.length - 1 && fr[i + 1].at <= time) i++;
    const a = fr[i], b = fr[i + 1]; if (!b) return a.pieces; const k = Math.min(1, (time - a.at) / Math.max(1, b.at - a.at)), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    return Object.fromEntries(Object.entries(a.pieces).map(([id, p]) => { const q = b.pieces[id] || p; return [id, { x: p.x + (q.x - p.x) * e, y: p.y + (q.y - p.y) * e }]; })); };
  const at = (time) => { t = Math.max(0, Math.min(dur, time)); const pos = posAt(t);
    $$('[data-pc]', el).forEach((g) => { const p = pos[g.dataset.pc]; if (p) { const [x, y] = sp(p.x, p.y); g.setAttribute('transform', `translate(${f1(x)},${f1(y)})`); } });
    const r = $('#pb-scrub', el); if (r) { r.value = String(Math.round(t)); r.style.setProperty('--f', dur ? (t / dur).toFixed(4) : 0); }
    const tm = $('#pb-time', el); if (tm) tm.textContent = `${(t / 1000).toFixed(1)} / ${(dur / 1000).toFixed(1)} s`;
    $$('[data-kf]', el).forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.kf - t) < 60 || (+b.dataset.kf <= t && +(b.dataset.next ?? Infinity) > t))); };
  const tick = (now) => { if (!playing) return; t += (now - last) * speed; last = now; if (t >= dur) { at(dur); pause(); return; } at(t); raf = requestAnimationFrame(tick); };
  const play = () => { if (!dur) return; if (t >= dur) t = 0; if (M?.off()) { at(dur); return; } playing = true; last = performance.now(); raf = requestAnimationFrame(tick); syncBtn(); };
  const pause = () => { playing = false; cancelAnimationFrame(raf); syncBtn(); };
  const stop = () => { playing = false; cancelAnimationFrame(raf); };
  const syncBtn = () => { const b = $('[data-pbplay]', el); if (b) { b.innerHTML = playing ? '⏸ Pause' : t >= dur && dur ? '↺ Replay' : '▶ Play'; b.setAttribute('aria-pressed', playing); } };
  const viewHtml = () => { const p = P, doc = p.doc || {}, [k, ic, lab] = state(p.mine), [ci, cl] = CAT[p.category] || ['📋', 'Play'], quiz = doc.quiz || [], teams = [...new Set((doc.pieces || []).map((x) => x.team))];
    const kf = frames.map((f, i) => `<button type="button" class="pb-kf" data-kf="${f.at}"${frames[i + 1] ? ` data-next="${frames[i + 1].at}"` : ''}><b>${i ? `Move ${i}` : 'Start'}</b><small class="num">${(f.at / 1000).toFixed(1)} s</small></button>`).join('');
    return `<a class="pb-back" href="#" data-pbback>← All plays</a>
<div class="pb-head"><span class="pb-ci big" aria-hidden="true">${ci}</span><div><div class="eyebrow">${cl}${p.published ? '' : ' · <span class="pill s">DRAFT</span>'}</div><h2>${esc(p.title)}</h2><p class="small muted">Version ${p.version} · updated ${esc(ago(p.updatedAt))}${p.mine?.assigned ? ' · assigned to you' : ''}</p></div><span class="pb-st big ${k}">${ic} ${lab}</span></div>
<div class="pb-view"><div class="panel pb-stage"><div class="pb-board${vert ? ' vert' : ''}" id="pb-board">${boardSvg()}</div>
<div class="pb-ctl">${dur ? `<button type="button" class="btn gold" data-pbplay aria-pressed="false">▶ Play</button><input type="range" id="pb-scrub" min="0" max="${Math.round(dur)}" step="10" value="0" aria-label="Scrub through the play"><span class="num tiny muted" id="pb-time"></span>
<div class="seg pb-spd" role="radiogroup" aria-label="Speed">${[[0.5, '½×'], [1, '1×'], [2, '2×']].map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === speed}" class="${v === speed ? 'on' : ''}" data-spd="${v}">${l}</button>`).join('')}</div>` : '<span class="muted small">🖼️ A still board: this version has no movement.</span>'}
<button type="button" class="btn ghost pb-or" data-pbvert aria-pressed="${vert}">${vert ? '↔ Wide' : '↕ Tall'}</button></div></div>
<aside class="pb-side">${dur ? `<div class="panel"><div class="eyebrow">⏱️ Key moments</div><div class="pb-kfs">${kf}</div></div>` : ''}
<div class="panel"><div class="eyebrow">🧭 On the board</div><ul class="pb-leg">${teams.map((tm) => `<li><i class="pb-dot ${esc(tm)}"></i>${TEAM[tm]?.[0] || esc(tm)} <small class="muted num">${(doc.pieces || []).filter((x) => x.team === tm).length}</small></li>`).join('')}${(doc.drawings || []).length ? `<li><i class="pb-dot chalk"></i>Chalk <small class="muted num">${doc.drawings.length}</small></li>` : ''}</ul></div>
${progHtml(p)}${quizHtml(p)}${mediaHtml()}
${manager ? `<div class="panel"><div class="eyebrow">🛠️ Manager</div>${p.assigned ? `<p class="small" style="margin:8px 0">👥 ${p.assigned.filter((x) => x.learned).length} of ${p.assigned.length} assigned have learned it</p>` : ''}${studioOn() ? `<a class="btn gold" href="#edit${p.id}">✏️ Open in the Studio</a><p class="tiny muted" style="margin:8px 0 0">Edit, add a quiz, publish and send it to players.</p>` : `<a class="btn ghost" href="${live(p.id)}" target="_blank" rel="noopener">✏️ Edit in the live Studio ›</a>`}</div>` : ''}</aside></div>`; };
  const paintView = (land) => { stop(); t = 0; const then = () => { at(0); syncBtn(); if (media !== null) paintMedia(); }; /* recordings may arrive before the view lands */ land ? put(viewHtml(), then) : ((el.innerHTML = viewHtml()), then()); };

  // ---- ✅ progress: the same "Learned it" as Match Night (tonight.js owns the write) ----
  const progHtml = (p) => `<div class="panel" id="pb-prog"><div class="eyebrow">✅ Your progress</div><p class="small" style="margin:8px 0">${p.mine?.learned ? `Learned${p.mine.learnedAt ? ' ' + esc(ago(p.mine.learnedAt)) : ''}. Nice.` : p.mine?.assigned ? 'Assigned to you. Watch it twice, then tick it off.' : 'Optional. Study it if it suits your position.'}</p>
${p.published ? `<button type="button" class="btn ${p.mine?.learned ? 'ghost' : 'gold'}" data-pblearn aria-pressed="${!!p.mine?.learned}">${p.mine?.learned ? '↺ Not yet' : '✅ Learned it'}</button><p class="tiny muted" style="margin:8px 0 0">The same tick as Match Night and the Discord button.</p>` : '<p class="tiny muted" style="margin:0">A draft can be ticked off once it is published.</p>'}</div>`;
  const syncList = () => { const it = plays.find((x) => x.id === P.id); if (it) it.mine = { ...P.mine }; };
  const paintSide = () => { for (const [id, html] of [['pb-prog', progHtml(P)], ['pb-quiz', quizHtml(P)]]) { const old = $('#' + id, el); if (old && html) { old.outerHTML = html; M?.pulse($('#' + id, el)); } } const [k, ic, lab] = state(P.mine), st = $('.pb-head .pb-st', el); if (st) { st.className = `pb-st big ${k}`; st.textContent = `${ic} ${lab}`; } };

  // ---- 🧠 knowledge check: answers go to the server, which scores them against the saved quiz ----
  let quizOpen = false;
  const quizHtml = (p) => { const quiz = p.doc?.quiz || []; if (!quiz.length) return ''; const r = p.mine?.quiz, perfect = r && r.score === r.total;
    const res = r ? `<div class="pb-qres${perfect ? ' ok' : ''}"><div class="tp-ring" style="--f:${(r.score / Math.max(1, r.total)).toFixed(3)}" role="img" aria-label="Score ${r.score} of ${r.total}"><b class="num">${r.score}/${r.total}</b><small>score</small></div><div><b>${perfect ? '🎉 Full marks' : r.score ? '👍 Nearly there' : '🔁 Have another go'}</b><p class="small muted">${perfect ? 'Every answer right, so the play is ticked as learned.' : 'The club does not show which ones were wrong. Watch the play again, then retry.'}${r.at ? ` · ${esc(ago(r.at))}` : ''}</p></div></div>` : '';
    const form = `<form class="pb-qf" data-pbquiz>${quiz.map((x, i) => `<fieldset><legend><span class="num">${i + 1}</span>${esc(x.q)}</legend>${x.options.map((o, j) => `<label class="pb-qo"><input type="radio" name="q${i}" value="${j}" required><span>${esc(o)}</span></label>`).join('')}</fieldset>`).join('')}
<div class="pb-qact"><button class="btn gold" type="submit"${p.published ? '' : ' disabled'}>🧠 Check my answers</button>${r ? '<button class="btn ghost" type="button" data-pbqclose>Cancel</button>' : ''}</div><p class="tiny muted">${p.published ? 'Scored by the club server. Get every answer right and the play is ticked as learned.' : 'Publish the play first: drafts cannot be answered.'}</p></form>`;
    return `<div class="panel pb-qp" id="pb-quiz"><div class="eyebrow">🧠 Knowledge check · ${quiz.length} question${quiz.length === 1 ? '' : 's'}</div>${res}${!r || quizOpen ? form : `<button type="button" class="btn ${perfect ? 'ghost' : 'gold'}" data-pbretake>${perfect ? '↻ Take it again' : '🔁 Try again'}</button>`}</div>`; };

  // ---- 🎬 recordings: the Studio's tab-capture videos and voice-overs, fetched with the session (they are members-only) ----
  let media = null, mediaFor = 0, mediaUrl = '';
  const mb = (b) => `${(b / 1e6).toFixed(b < 1e7 ? 1 : 0)} MB`;
  const mediaHtml = () => { if (media === null) return `<div class="panel" id="pb-media"><div class="eyebrow">🎬 Recordings</div><p class="small muted" style="margin:8px 0 0">Loading…</p></div>`;
    if (!media.length) return manager ? `<div class="panel" id="pb-media"><div class="eyebrow">🎬 Recordings</div><p class="small muted" style="margin:8px 0 0">No video or voice-over yet. Record one in the <a href="${live(P.id)}" target="_blank" rel="noopener">live Studio</a>: it shows here for every member.</p></div>` : '<div id="pb-media" hidden></div>';
    return `<div class="panel" id="pb-media"><div class="eyebrow">🎬 Recordings · ${media.length}</div><ul class="pb-md">${media.map((m) => `<li><span class="pb-mi" aria-hidden="true">${m.kind === 'video' ? '🎬' : '🎙️'}</span><div><b>${m.kind === 'video' ? 'Video walkthrough' : 'Voice-over'}</b><small class="muted">${esc(new Date(m.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))} · ${mb(m.size)}</small></div><button type="button" class="btn ghost" data-pbwatch="${esc(m.id)}">${m.kind === 'video' ? '▶ Watch' : '🔊 Listen'}</button><button type="button" class="btn ghost pb-mdl" data-pbsave="${esc(m.id)}" aria-label="Save the ${m.kind === 'video' ? 'video' : 'voice-over'} file" title="Save the file">⬇</button></li>`).join('')}</ul><div class="pb-player" id="pb-player"></div></div>`; };
  const paintMedia = () => { const old = $('#pb-media', el); if (old) old.outerHTML = mediaHtml(); };
  async function loadMedia(id) { media = null; mediaFor = id; if (mediaUrl) { URL.revokeObjectURL(mediaUrl); mediaUrl = ''; }
    try { const r = await A.call(`/api/plays/${id}/media`); if (mediaFor !== id) return; media = r.media || []; } catch { if (mediaFor !== id) return; media = []; }
    paintMedia(); }
  async function blobOf(mid) { const r = await fetch(`${API}/api/plays/${P.id}/media/${encodeURIComponent(mid)}`, { headers: { Authorization: 'Bearer ' + A.token }, cache: 'no-store' }); if (!r.ok) throw new Error('Could not load that recording.'); return r.blob(); }
  async function watch(btn) { const m = media.find((x) => x.id === btn.dataset.pbwatch), box = $('#pb-player', el); if (!m || !box) return;
    try { const b = await (M ? M.submit(btn, () => blobOf(m.id), { burst: false }) : blobOf(m.id)); if (mediaUrl) URL.revokeObjectURL(mediaUrl); mediaUrl = URL.createObjectURL(b);
      box.innerHTML = m.kind === 'video' ? `<video controls playsinline autoplay src="${mediaUrl}"></video>` : `<audio controls autoplay src="${mediaUrl}"></audio>`; pause(); }
    catch (e) { M?.toast(e.message, { kind: 'err' }); } }
  async function saveFile(btn) { const m = media.find((x) => x.id === btn.dataset.pbsave); if (!m) return;
    try { const b = await (M ? M.submit(btn, () => blobOf(m.id), { burst: false }) : blobOf(m.id)), a = d.createElement('a'); a.href = URL.createObjectURL(b);
      a.download = `${(P.title || 'play').replace(/[^\w-]+/g, '-').slice(0, 40)}.${b.type.includes('mp4') ? (m.kind === 'video' ? 'mp4' : 'm4a') : 'webm'}`; d.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    catch (e) { M?.toast(e.message, { kind: 'err' }); } }

  // ================= routing + events =================
  const idOf = () => +(location.hash.match(/^#play(\d+)$/)?.[1] || 0);
  async function route(land = true) {
    const ed = +(location.hash.match(/^#edit(\d+)$/)?.[1] || 0);
    if (window.NorexStudio?.active() && window.NorexStudio.active() !== ed) window.NorexStudio.close();
    if (ed) { if (!studioOn()) { history.replaceState(null, '', '#play' + ed); return route(land); } M?.skeleton(el, 5);
      try { const p = await A.call(`/api/plays/${ed}`); stop(); window.NorexStudio.open({ el, play: p, onClose: (np) => { if (np) { P = np; const it = plays.find((x) => x.id === np.id); if (it) Object.assign(it, { title: np.title, category: np.category, version: np.version, published: np.published, updatedAt: np.updatedAt }); } location.hash = '#play' + ed; } }); el.scrollIntoView?.({ block: 'start' }); }
      catch (e) { M?.toast(e.message, { kind: 'err' }); location.hash = ''; }
      return; }
    const id = idOf(); if (!id) { P = null; paintList(land); return; }
    M?.skeleton(el, 4);
    try { P = await A.call(`/api/plays/${id}`); quizOpen = false; buildFrames(); paintView(true); loadMedia(id); el.scrollIntoView?.({ block: 'start' }); }
    catch (e) { P = null; M?.toast(e.status === 404 ? 'That play is not published or was removed' : e.message, { kind: 'err' }); history.replaceState(null, '', location.pathname + location.search); paintList(true); }
  }
  async function load() {
    M?.skeleton(el, 5); await (A.ready || Promise.resolve());
    if (!flagOn('tactics')) { put('<div class="panel sq-empty"><span>📚</span><div><b>The Playbook is not switched on for you yet</b><p class="muted small">It opens here as soon as the club turns it on.</p></div></div>'); return; }
    try { const r = await A.call('/api/plays'); plays = r.plays || []; manager = plays.some((p) => p.assignCounts); route(true); } catch (e) { fail(e); }
  }
  addEventListener('hashchange', () => route(true));
  el.addEventListener('click', (e) => { const t2 = e.target;
    if (t2.closest('[data-pbretry]')) { load(); return; }
    if (window.NorexStudio?.active()) return; // the Studio has its own handlers on this mount
    const lb = t2.closest('[data-pblearn]'); if (lb && P) { const want = !P.mine?.learned;
      (window.NorexTonight ? window.NorexTonight.learn(P.id, want, lb, P.title) : Promise.reject(new Error('Reload the page and try again')))
        .then(() => { P.mine = { ...(P.mine || {}), learned: want, learnedAt: want ? Date.now() : undefined, assigned: P.mine?.assigned || want }; syncList(); setTimeout(paintSide, M?.off() ? 0 : 450); })
        .catch((er) => M?.toast(er.message || 'Could not save that', { kind: 'err' })); return; }
    if (t2.closest('[data-pbretake]')) { quizOpen = true; paintSide(); $('#pb-quiz input', el)?.focus(); return; }
    if (t2.closest('[data-pbqclose]')) { quizOpen = false; paintSide(); return; }
    const wb = t2.closest('[data-pbwatch]'); if (wb) { watch(wb); return; }
    const sb = t2.closest('[data-pbsave]'); if (sb) { saveFile(sb); return; }
    if (t2.closest('[data-pbback]')) { e.preventDefault(); history.pushState(null, '', location.pathname + location.search); route(true); return; }
    const c = t2.closest('[data-pbcat]'); if (c) { cat = c.dataset.pbcat; paintList(false); M?.pulse($('.pb-grid', el)); return; }
    if (t2.closest('[data-pbmine]')) { mineOnly = !mineOnly; paintList(false); return; }
    if (t2.closest('[data-pbplay]')) { playing ? pause() : play(); return; }
    const k = t2.closest('[data-kf]'); if (k) { pause(); at(+k.dataset.kf); syncBtn(); return; }
    const s = t2.closest('[data-spd]'); if (s) { speed = +s.dataset.spd; $$('[data-spd]', el).forEach((b) => { b.classList.toggle('on', b === s); b.setAttribute('aria-checked', b === s); }); return; }
    if (t2.closest('[data-pbvert]')) { vert = !vert; try { localStorage.setItem('norex_tx_vert', vert ? '1' : '0'); } catch {} const keep = t, was = playing; stop(); $('#pb-board', el).classList.toggle('vert', vert); $('#pb-board', el).innerHTML = boardSvg();
      const b = $('[data-pbvert]', el); b.textContent = vert ? '↔ Wide' : '↕ Tall'; b.setAttribute('aria-pressed', vert); at(keep); if (was) play(); return; }
  });
  el.addEventListener('submit', async (e) => {
    if (window.NorexStudio?.active()) return;
    const f = e.target; e.preventDefault();
    if (f.matches('[data-pbquiz]') && P) { const fd = new FormData(f), answers = (P.doc.quiz || []).map((_, i) => +(fd.get('q' + i) ?? -1)), btn = f.querySelector('[type=submit]');
      const job = () => A.call(`/api/plays/${P.id}/quiz`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) });
      try { const r = await (M ? M.submit(btn, job, { burst: false }) : job()), perfect = r.score === r.total;
        P.mine = { ...(P.mine || {}), quiz: { score: r.score, total: r.total, at: Date.now() }, ...(perfect ? { learned: true, learnedAt: Date.now(), assigned: true } : {}) };
        if (perfect) window.NorexTonight?.note(P.id, true); quizOpen = false; syncList();
        M?.toast(perfect ? `Full marks: ${P.title} is learned` : `${r.score} of ${r.total} right. Watch it again and retry`, { kind: perfect ? 'ok' : '', icon: perfect ? '🎉' : '🧠' });
        setTimeout(paintSide, M?.off() ? 0 : 450); }
      catch (er) { M?.toast(er.message || 'Could not check the answers', { kind: 'err' }); } return; }
    if (f.matches('[data-pbnew]')) { const fd = new FormData(f), btn = f.querySelector('[type=submit]'), body = { title: String(fd.get('title') || '').trim(), category: fd.get('category') };
      if (!body.title) return; const job = () => A.call('/api/plays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      try { const np = await (M ? M.submit(btn, job, { burst: false }) : job()); plays.unshift({ ...np, mine: np.mine, assignCounts: { assigned: 0, learned: 0 } }); location.hash = '#edit' + np.id; }
      catch (er) { M?.toast(er.message || 'Could not create the play', { kind: 'err' }); } }
  });
  el.addEventListener('input', (e) => { if (e.target.id === 'pb-scrub') { pause(); at(+e.target.value); syncBtn(); } if (e.target.id === 'pb-q') { q = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; paintList(false); const i = $('#pb-q', el); i.focus(); i.setSelectionRange(pos, pos); } });
  d.addEventListener('keydown', (e) => { if (!P || window.NorexStudio?.active() || /INPUT|TEXTAREA|SELECT/.test(d.activeElement?.tagName || '')) return; if (e.key === ' ' && dur) { e.preventDefault(); playing ? pause() : play(); } if (e.key === 'Escape') $('[data-pbback]', el)?.click(); });
  // the Studio draws on this same board (same chalk, pieces, pitch and wide/tall setting)
  window.NorexBoard = { W, H, shape, framesOf, posAt, svg: (doc, o) => boardSvg(doc, o), sp: (x, y) => sp(x, y),
    get vert() { return vert; }, set vert(v) { vert = !!v; try { localStorage.setItem('norex_tx_vert', vert ? '1' : '0'); } catch {} },
    // screen → play coordinates (0–1000 × 0–640), whatever the orientation or letterboxing
    toPlay(svg, e) { const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      const [x, y] = vert ? [W - q.y, q.x] : [q.x, q.y]; return { x: Math.round(Math.max(0, Math.min(W, x))), y: Math.round(Math.max(0, Math.min(H, y))) }; } };
  load();
})();
