// Tactics Studio / Playbook client (BE1). No framework: follows the same session/API/UI patterns as messages.js.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const API = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const session = () => { try { const t = localStorage.getItem('norex_session'); const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))); return p.exp > Date.now() / 1000 ? { token: t, ...p } : null; } catch { return null; } };
  const call = async (path, body) => {
    const s = session();
    const r = await fetch(API + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { ...(s ? { Authorization: `Bearer ${s.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  const loginUrl = () => `${API}/auth/login?return=${encodeURIComponent(location.href)}`;
  const toast = (m, bad) => UI.toast(m, bad ? 'bad' : 'ok');
  const STARTER_DOC = { pieces: [], steps: [], drawings: [], quiz: [] };
  const COLORS = ['#c8352c', '#ffffff', '#d4af37', '#3aa0ff'];
  let root, me, plays = [], active = null, detail = null, studio = null;
  const manager = () => ['manager', 'owner'].includes(me?.role);

  // ---------- share to Discord (BE1 follow-up) ----------
  let dcTargets = null;
  const discordTargets = () => (dcTargets ??= call('/api/plays/discord').catch((e) => ({ ready: false, error: e.message })));
  const dcPickers = (t) => (t.ready ? `<div class="tx-dc-row"><label>Channel<select name="channel">${t.channels.map((c) => `<option value="${esc(c.id)}"${c.id === t.last ? ' selected' : ''}>${c.news ? '📢' : '#'} ${esc(c.name)}</option>`).join('')}</select></label>
<label>Ping<select name="role"><option value="">Nobody</option>${t.roles.map((r) => `<option value="${esc(r.id)}">${esc(r.name.startsWith('@') ? r.name : `@${r.name}`)}</option>`).join('')}</select></label></div>` : `<p class="muted small">⚠️ ${esc(t.error)}</p>`);
  async function shareToDiscord() {
    const p = detail, t = await discordTargets();
    let f = {};
    const v = await UI.modal({
      title: `Share to Discord · ${p.title}`, icon: '📣',
      body: `${p.discord ? '<p class="muted small">Already shared – this posts it again.</p>' : ''}${dcPickers(t)}<p class="muted small">Posts a card with "✅ Learned it" and "▶ Open in Studio" buttons.</p>`,
      actions: t.ready ? [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '📣 Share', value: 'ok' }] : undefined,
      onOpen: (d) => { const rd = () => { f = { channel: $('[name=channel]', d)?.value, role: $('[name=role]', d)?.value }; }; rd(); d.addEventListener('change', rd); },
    });
    if (v !== 'ok') return;
    try { detail = await call(`/api/plays/${active}/discord`, f); toast('Shared to Discord 📣'); detailView(); } catch (x) { toast(x.message, true); }
  }

  function card(p) {
    const state = p.mine?.learned ? '<span class="tag tx-done">✓ Learned</span>' : p.mine?.assigned ? '<span class="tag">Assigned</span>' : '';
    const draft = !p.published ? '<span class="tag">Draft</span>' : '';
    return `<button class="tx-card" type="button" data-open="${p.id}"><span class="tx-ic">${p.category === 'formation' ? '📐' : p.category === 'drill' ? '🏃' : '🎯'}</span><span><b>${esc(p.title)}</b><small>${esc(p.category)} · v${p.version}</small></span><span class="tx-tags">${state}${draft}</span><i>→</i></button>`;
  }
  function listView() {
    const create = manager() ? `<form class="tx-new card" data-new><h3>New play</h3><div class="tx-form"><input name="title" maxlength="80" required placeholder="Play title" aria-label="Play title"><select name="category" aria-label="Category"><option value="set-piece">Set piece</option><option value="formation">Formation</option><option value="drill">Drill</option></select><button class="btn sm" type="submit">Create draft</button></div></form>` : '';
    root.innerHTML = `<div class="tx-head"><div><p class="kicker">PLAYBOOK</p><h2>Club tactics</h2><p class="muted">Published plays are available to the squad. Managers can stage and publish new versions.</p></div><span class="tx-count">${plays.filter((p) => p.published).length} live</span></div>${create}<div class="tx-list">${plays.length ? plays.map(card).join('') : UI.empty({ icon: '📋', title: 'No plays yet', text: manager() ? 'Create the first playbook entry above.' : 'Managers have not published a play yet.' })}</div>`;
  }
  const piece = (p) => `<span class="tx-piece ${p.team}${studio?.selectedPieceId === p.id ? ' sel' : ''}" data-piece-id="${p.id}" style="left:${Math.max(0, Math.min(100, p.x / 10))}%;top:${Math.max(0, Math.min(100, p.y / 6.4))}%">${p.team === 'ball' ? '●' : esc(p.label || (p.team === 'us' ? 'N' : 'O'))}</span>`;
  const drawLine = (d) => `<polyline points="${(d.points || []).map((pt) => pt.join(',')).join(' ')}" fill="none" stroke="${/^#[0-9a-f]{6}$/i.test(d.color ?? '') ? d.color : '#c8352c'}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  function pitch(doc, editable) {
    const toolClass = editable ? ` tool-${studio.tool}` : '';
    return `<div class="tx-pitch${editable ? ' tx-edit' + toolClass : ''}" ${editable ? 'data-studio-pitch' : 'data-view-pitch'} aria-label="Tactics board"><svg class="tx-draw" viewBox="0 0 1000 640" preserveAspectRatio="none">${(doc.drawings || []).map(drawLine).join('')}</svg>${(doc.pieces || []).map(piece).join('')}<span class="tx-half"></span><span class="tx-circle"></span></div>`;
  }
  function quizEditRow(q, i) {
    return `<div class="tx-qedit" data-q="${i}"><input class="tx-qtext" type="text" value="${esc(q.q)}" data-qfield="q" placeholder="Question text" maxlength="200" aria-label="Question ${i + 1} text"><div class="tx-qopts">${q.options.map((o, j) => `<div class="tx-qopt"><input type="radio" name="qa${i}" ${q.answer === j ? 'checked' : ''} data-qanswer="${j}" aria-label="Correct answer"><input type="text" value="${esc(o)}" data-qopt="${j}" maxlength="80" placeholder="Option ${j + 1}" aria-label="Option ${j + 1}">${q.options.length > 2 ? `<button type="button" class="tx-qdel" data-del-opt="${j}" aria-label="Remove option">×</button>` : ''}</div>`).join('')}</div><div class="tx-qrow-actions">${q.options.length < 6 ? '<button type="button" class="btn sm ghost" data-add-opt>+ Option</button>' : ''}<button type="button" class="btn sm danger" data-del-q>Delete question</button></div></div>`;
  }
  function studioView(p) {
    const d = studio.doc;
    const tool = (name, label) => `<button class="btn sm ghost${studio.tool === name ? ' active' : ''}" type="button" data-tool="${name}">${label}</button>`;
    return `<div class="tx-title"><div><p class="kicker">${esc(p.category)}</p><h2>Studio: ${esc(p.title)}</h2><p class="muted">Arrange pieces, chalk the board, capture keyframes, then save a new version.</p></div><div class="tx-actions"><button class="btn sm ghost" type="button" data-cancel-edit>Cancel</button><button class="btn sm" type="button" data-save-doc>Save new version</button></div></div>
<div class="tx-toolbar"><div class="tx-tools">${tool('move', '🖱 Move')}${tool('add-us', '+ Us')}${tool('add-opp', '+ Opponent')}${tool('add-ball', '+ Ball')}${tool('chalk', '✏️ Chalk')}${studio.selectedPieceId ? '<button class="btn sm danger" type="button" data-remove-piece>Remove selected</button>' : ''}${d.drawings.length ? '<button class="btn sm ghost" type="button" data-clear-chalk>Clear chalk</button>' : ''}<button class="btn sm ghost" type="button" data-json-edit>Edit as JSON</button></div>${studio.tool === 'chalk' ? `<div class="tx-colors">${COLORS.map((c) => `<button class="tx-swatch${studio.drawColor === c ? ' on' : ''}" type="button" style="background:${c}" data-color="${c}" aria-label="Chalk colour ${c}"></button>`).join('')}</div>` : ''}</div>
${pitch(d, true)}
<div class="tx-keyframes"><b>Keyframes</b><div class="tx-kf-list">${d.steps.length ? d.steps.map((s, i) => `<button class="tx-kf" type="button" data-kf="${i}">⏱ ${(s.at / 1000).toFixed(1)}s<i class="tx-kf-del" data-del-kf="${i}">×</i></button>`).join('') : '<span class="muted">None yet — arrange pieces, then add one.</span>'}</div><button class="btn sm ghost" type="button" data-add-kf>+ Add keyframe at current positions</button></div>
<div class="tx-quizedit"><b>Quiz</b>${d.quiz.map(quizEditRow).join('')}${d.quiz.length < 20 ? '<button class="btn sm ghost" type="button" data-add-q>+ Add question</button>' : ''}</div>`;
  }
  function detailView() {
    const p = detail;
    if (studio) { root.innerHTML = `<button class="linkish tx-back" type="button" data-back>← All plays</button>${studioView(p)}`; return; }
    const q = p.doc?.quiz || [], steps = p.doc?.steps || [];
    const manage = manager() ? `<div class="tx-manage card"><h3>Manager controls</h3><div class="tx-actions"><button class="btn sm" data-publish="${p.published ? '0' : '1'}">${p.published ? 'Unpublish' : 'Publish'}</button><button class="btn sm ghost" data-edit>Open studio</button><button class="btn sm ghost" data-restore>Version history</button>${p.published ? `<button class="btn sm ghost" data-discord>📣 ${p.discord ? 'Share again' : 'Share to Discord'}</button>` : ''}<button class="btn sm danger" data-archive>Archive</button></div><small class="muted">Server-side validation remains authoritative for every save and quiz.</small></div>` : '';
    const quiz = q.length ? `<form class="tx-quiz card" data-quiz><h3>Knowledge check</h3>${q.map((x, i) => `<fieldset><legend>${i + 1}. ${esc(x.q)}</legend>${x.options.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}" required> <span>${esc(o)}</span></label>`).join('')}</fieldset>`).join('')}<button class="btn" type="submit">Check answers</button></form>` : '';
    root.innerHTML = `<button class="linkish tx-back" type="button" data-back>← All plays</button><div class="tx-title"><div><p class="kicker">${esc(p.category)}</p><h2>${esc(p.title)}</h2><p class="muted">Version ${p.version}${p.mine?.assigned ? ' · assigned to you' : ''}</p></div>${p.mine?.learned ? '<span class="tag tx-done">✓ Learned</span>' : p.published ? '<button class="btn sm ghost" data-learn>Mark learned</button>' : '<span class="tag">Draft</span>'}</div>${pitch(p.doc || {})}<div class="tx-steps">${steps.length ? `<button class="btn sm ghost" type="button" data-play>▶ Play (${steps.length} keyframe${steps.length === 1 ? '' : 's'})</button>` : '<span class="muted">No keyframes in this version yet.</span>'}</div>${quiz}${manage}`;
  }
  async function load(openId) {
    root.innerHTML = UI.skeleton('rows', 5);
    const d = await call('/api/plays'); plays = d.plays || [];
    const id = openId || +(location.hash.match(/^#play(\d+)$/)?.[1] || 0);
    if (id) return open(id);
    active = null; detail = null; listView();
  }
  async function open(id) {
    active = +id; detail = await call(`/api/plays/${active}`); studio = null;
    history.replaceState(null, '', `#play${active}`); detailView();
  }
  function pitchPoint(e, pitchEl) {
    const r = pitchEl.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1000, (e.clientX - r.left) / r.width * 1000)), y: Math.max(0, Math.min(640, (e.clientY - r.top) / r.height * 640)) };
  }
  function startDrag(e, pitchEl, pieceEl) {
    const id = pieceEl.dataset.pieceId, p = studio.doc.pieces.find((x) => x.id === id);
    if (!p) return;
    const startX = e.clientX, startY = e.clientY;
    let moved = false;
    const onMove = (ev) => {
      const pt = pitchPoint(ev, pitchEl);
      p.x = pt.x; p.y = pt.y;
      pieceEl.style.left = `${pt.x / 10}%`; pieceEl.style.top = `${pt.y / 6.4}%`;
      if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) moved = true;
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
      if (!moved) studio.selectedPieceId = studio.selectedPieceId === id ? null : id;
      detailView();
    };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
  }
  function startChalk(pitchEl, pt) {
    const svg = pitchEl.querySelector('.tx-draw');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('fill', 'none'); poly.setAttribute('stroke', studio.drawColor); poly.setAttribute('stroke-width', '6'); poly.setAttribute('stroke-linecap', 'round'); poly.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(poly);
    const points = [[pt.x, pt.y]];
    const update = () => poly.setAttribute('points', points.map((p) => p.join(',')).join(' '));
    update();
    const onMove = (ev) => { if (points.length >= 60) return; const p = pitchPoint(ev, pitchEl); points.push([p.x, p.y]); update(); };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
      if (points.length >= 2) { studio.doc.drawings.push({ points, color: studio.drawColor }); if (studio.doc.drawings.length > 40) studio.doc.drawings.shift(); }
      detailView();
    };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
  }
  async function addKeyframe() {
    let secs = studio.doc.steps.length ? Math.max(...studio.doc.steps.map((s) => s.at)) / 1000 + 2 : 0;
    const v = await UI.modal({ title: 'Add keyframe', icon: '⏱', body: `<label class="tx-kflabel">Time (seconds)<input type="number" min="0" max="60" step="0.5" value="${secs}" class="tx-kftime" aria-label="Keyframe time in seconds"></label>`, actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: 'Add keyframe', value: 'add' }], onOpen: (d) => d.addEventListener('input', (e) => { if (e.target.matches('.tx-kftime')) secs = +e.target.value; }) });
    if (v !== 'add') return;
    const at = Math.round(Math.max(0, Math.min(60, secs)) * 1000);
    const snapshot = Object.fromEntries(studio.doc.pieces.map((p) => [p.id, { x: p.x, y: p.y }]));
    const i = studio.doc.steps.findIndex((s) => s.at === at);
    if (i >= 0) studio.doc.steps[i] = { at, pieces: snapshot }; else studio.doc.steps.push({ at, pieces: snapshot });
    studio.doc.steps.sort((a, b) => a.at - b.at);
    detailView();
  }
  async function editJson() {
    let raw = JSON.stringify(studio.doc, null, 2);
    const v = await UI.modal({ title: 'Edit as JSON (advanced)', icon: '🧠', body: `<p class="muted small">For power edits. Validated and trimmed by the Worker on save.</p><textarea class="tx-json" rows="16" aria-label="Play document">${esc(raw)}</textarea>`, actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: 'Apply', value: 'apply' }], onOpen: (d) => d.addEventListener('input', (e) => { if (e.target.matches('.tx-json')) raw = e.target.value; }) });
    if (v !== 'apply') return;
    try { studio.doc = JSON.parse(raw); detailView(); } catch { toast('Invalid JSON.', true); }
  }
  async function versions() {
    const vs = detail.versions || [];
    const body = vs.length ? `<div class="tx-versions">${vs.map((v) => `<button type="button" class="tx-ver" data-v="${v.version}"><b>v${v.version}</b><small>${new Date(v.at).toLocaleString()}</small></button>`).join('')}</div>` : '<p class="muted">No older versions.</p>';
    const chosen = await UI.modal({ title: 'Version history', icon: '↩️', body, actions: [{ label: 'Close', value: null, kind: 'ghost' }], onOpen: (d, close) => d.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) close(b.dataset.v); }) });
    if (!chosen) return;
    try { detail = await call(`/api/plays/${active}/restore`, { version: +chosen }); toast(`Restored v${chosen} as a new version.`); detailView(); } catch (e) { toast(e.message, true); }
  }
  function playback() {
    const pitchEl = root.querySelector('[data-view-pitch]'); if (!pitchEl) return;
    const doc = detail.doc || {};
    const base = Object.fromEntries((doc.pieces || []).map((p) => [p.id, { x: p.x, y: p.y }]));
    const steps = [...(doc.steps || [])].sort((a, b) => a.at - b.at);
    const frames = steps.length && steps[0].at > 0 ? [{ at: 0, pieces: base }, ...steps] : (steps.length ? steps : [{ at: 0, pieces: base }]);
    const els = {};
    pitchEl.querySelectorAll('[data-piece-id]').forEach((el) => { els[el.dataset.pieceId] = el; el.style.transition = 'left .8s linear, top .8s linear'; });
    frames.forEach((f, i) => {
      setTimeout(() => {
        const dur = i === 0 ? 0 : Math.max(0.2, (f.at - frames[i - 1].at) / 1000);
        Object.values(els).forEach((el) => { el.style.transitionDuration = `${dur}s`; });
        for (const [id, pos] of Object.entries(f.pieces)) { const el = els[id]; if (el) { el.style.left = `${pos.x / 10}%`; el.style.top = `${pos.y / 6.4}%`; } }
      }, f.at);
    });
  }
  function wire() {
    root.addEventListener('pointerdown', (e) => {
      if (!studio) return;
      const pitchEl = e.target.closest('[data-studio-pitch]'); if (!pitchEl) return;
      const pt = pitchPoint(e, pitchEl);
      if (studio.tool === 'chalk') { startChalk(pitchEl, pt); return; }
      const pieceEl = e.target.closest('[data-piece-id]');
      if (pieceEl && studio.tool === 'move') { startDrag(e, pitchEl, pieceEl); return; }
      if (studio.tool.startsWith('add-') && !pieceEl) {
        const team = studio.tool.slice(4);
        if (studio.doc.pieces.length < 40) studio.doc.pieces.push({ id: crypto.randomUUID().slice(0, 8), team, x: pt.x, y: pt.y, label: team === 'us' ? 'N' : team === 'opp' ? 'O' : undefined });
        detailView();
      }
    });
    root.addEventListener('input', (e) => {
      if (!studio) return;
      const qd = e.target.closest('[data-q]'); if (!qd) return;
      const i = +qd.dataset.q;
      if (e.target.matches('[data-qfield="q"]')) studio.doc.quiz[i].q = e.target.value;
      else if (e.target.matches('[data-qopt]')) studio.doc.quiz[i].options[+e.target.dataset.qopt] = e.target.value;
    });
    root.addEventListener('change', (e) => {
      if (!studio) return;
      const qd = e.target.closest('[data-q]'); if (!qd) return;
      if (e.target.matches('[data-qanswer]')) studio.doc.quiz[+qd.dataset.q].answer = +e.target.dataset.qanswer;
    });
    root.addEventListener('click', async (e) => {
      if (studio) {
        if (e.target.closest('[data-cancel-edit]')) { studio = null; detailView(); return; }
        if (e.target.closest('[data-save-doc]')) { try { detail = await call(`/api/plays/${active}`, { doc: studio.doc }); studio = null; toast('New version saved.'); detailView(); } catch (x) { toast(x.message || 'Could not save.', true); } return; }
        const tool = e.target.closest('[data-tool]'); if (tool) { studio.tool = tool.dataset.tool; detailView(); return; }
        const col = e.target.closest('[data-color]'); if (col) { studio.drawColor = col.dataset.color; detailView(); return; }
        if (e.target.closest('[data-remove-piece]')) { const id = studio.selectedPieceId; studio.doc.pieces = studio.doc.pieces.filter((p) => p.id !== id); studio.doc.steps.forEach((s) => { delete s.pieces[id]; }); studio.selectedPieceId = null; detailView(); return; }
        if (e.target.closest('[data-clear-chalk]')) { studio.doc.drawings = []; detailView(); return; }
        if (e.target.closest('[data-json-edit]')) { editJson(); return; }
        if (e.target.closest('[data-add-kf]')) { addKeyframe(); return; }
        const delKf = e.target.closest('[data-del-kf]'); if (delKf) { studio.doc.steps.splice(+delKf.dataset.delKf, 1); detailView(); return; }
        const kf = e.target.closest('[data-kf]'); if (kf) { const s = studio.doc.steps[+kf.dataset.kf]; for (const [id, pos] of Object.entries(s.pieces)) { const pc = studio.doc.pieces.find((x) => x.id === id); if (pc) { pc.x = pos.x; pc.y = pos.y; } } detailView(); return; }
        if (e.target.closest('[data-add-q]')) { if (studio.doc.quiz.length < 20) studio.doc.quiz.push({ q: '', options: ['', ''], answer: 0 }); detailView(); return; }
        const delQ = e.target.closest('[data-del-q]'); if (delQ) { studio.doc.quiz.splice(+delQ.closest('[data-q]').dataset.q, 1); detailView(); return; }
        const addOpt = e.target.closest('[data-add-opt]'); if (addOpt) { const q = studio.doc.quiz[+addOpt.closest('[data-q]').dataset.q]; if (q.options.length < 6) q.options.push(''); detailView(); return; }
        const delOpt = e.target.closest('[data-del-opt]'); if (delOpt) { const qd = delOpt.closest('[data-q]'); const q = studio.doc.quiz[+qd.dataset.q]; const j = +delOpt.dataset.delOpt; if (q.options.length > 2) { q.options.splice(j, 1); if (q.answer >= q.options.length) q.answer = 0; else if (q.answer > j) q.answer--; } detailView(); return; }
        const back = e.target.closest('[data-back]'); if (back) { studio = null; history.replaceState(null, '', location.pathname); await load(); } return;
      }
      const o = e.target.closest('[data-open]'); if (o) { try { await open(o.dataset.open); } catch (x) { toast(x.message, true); } return; }
      if (e.target.closest('[data-back]')) { history.replaceState(null, '', location.pathname); await load(); return; }
      if (e.target.closest('[data-play]')) { playback(); return; }
      if (e.target.closest('[data-learn]')) { try { await call(`/api/plays/${active}/learned`, { learned: true }); detail.mine.learned = true; toast('Marked learned.'); detailView(); } catch (x) { toast(x.message, true); } return; }
      const pub = e.target.closest('[data-publish]'); if (pub) { try { detail = await call(`/api/plays/${active}/publish`, { published: pub.dataset.publish === '1' }); toast(detail.published ? 'Play published.' : 'Play unpublished.'); detailView(); } catch (x) { toast(x.message, true); } return; }
      if (e.target.closest('[data-edit]')) { studio = { doc: structuredClone(detail.doc || STARTER_DOC), tool: 'move', drawColor: COLORS[0], selectedPieceId: null }; detailView(); return; }
      if (e.target.closest('[data-restore]')) { versions(); return; }
      if (e.target.closest('[data-discord]')) { shareToDiscord(); return; }
      if (e.target.closest('[data-archive]')) { if (!(await UI.confirm({ title: 'Archive this play?', text: 'History is kept; members will no longer see it.', ok: 'Archive', danger: true }))) return; try { await call(`/api/plays/${active}/delete`, {}); toast('Play archived.'); history.replaceState(null, '', location.pathname); await load(); } catch (x) { toast(x.message, true); } }
    });
    root.addEventListener('submit', async (e) => {
      if (e.target.matches('[data-new]')) { e.preventDefault(); const f = new FormData(e.target); try { const p = await call('/api/plays', { title: f.get('title'), category: f.get('category') }); toast('Draft created.'); await load(p.id); } catch (x) { toast(x.message, true); } return; }
      if (e.target.matches('[data-quiz]')) { e.preventDefault(); const fd = new FormData(e.target), answers = (detail.doc.quiz || []).map((_, i) => +(fd.get(`q${i}`) ?? -1)); try { const r = await call(`/api/plays/${active}/quiz`, { answers }); const perfect = r.score === r.total; toast(`${r.score}/${r.total}${perfect ? ' — learned ✓' : ''}`, !perfect); if (perfect) detail.mine.learned = true; detailView(); } catch (x) { toast(x.message, true); } }
    });
  }
  async function init() {
    root = $('[data-tactics]'); if (!root) return;
    me = session();
    if (!me) { root.innerHTML = UI.empty({ icon: '🔒', title: 'Log in to open the playbook', action: `<a class="btn sm" href="${loginUrl()}">Log in with Discord</a>` }); return; }
    wire();
    try { await load(); } catch (e) { root.innerHTML = UI.empty({ icon: '⚠️', title: 'Could not load the playbook', text: e.message }); }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
