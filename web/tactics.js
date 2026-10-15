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
  const COLORS = ['#c8352c', '#ffffff', '#d4af37', '#3aa0ff', '#3ddc84', '#ff9f1c', '#b388ff', '#111111'];
  const WIDTHS = [[3, 'Thin'], [6, 'Medium'], [10, 'Thick']];
  // chalk tools: [id, icon, label, hint]
  const DRAW_TOOLS = [['free', '✏️', 'Pen', 'Draw freehand'], ['line', '╱', 'Line', 'Drag a straight line'], ['dash', '┄', 'Dashed', 'Drag a dashed line'], ['arrow', '➜', 'Arrow', 'Drag an arrow'], ['run', '⇢', 'Run', 'Dashed arrow – a player’s run'], ['darrow', '↔', 'Two-way', 'Arrow with a head at both ends'], ['curve', '↷', 'Curve', 'Curved arrow – a pass or run that bends'], ['circle', '◯', 'Circle', 'Drag from the middle outwards'], ['rect', '▭', 'Zone', 'Drag a rectangle'], ['dot', '●', 'Dot', 'Tap to drop a dot'], ['text', 'T', 'Text', 'Tap to write a label'], ['erase', '🧽', 'Eraser', 'Tap or drag over chalk to remove it']];
  const PIECE_TOOLS = [['add-us', '+ Us'], ['add-opp', '+ Opponent'], ['add-ball', '+ Ball'], ['add-cone', '+ Cone'], ['add-joker', '+ Joker']];
  const DRAW_IDS = new Set(DRAW_TOOLS.map((t) => t[0]));
  const TEAM_LABEL = { us: 'N', opp: 'O', joker: 'J' };
  let root, me, plays = [], active = null, detail = null, studio = null;
  const manager = () => ['manager', 'owner'].includes(me?.role);

  // ---------- live co-editing (BE1) ----------
  // Managers editing one play together. Each change is one small op, relayed by the Worker to room studio:<id>
  // (the Worker stamps who sent it). Pieces, chalk strokes and keyframes are last-write-wins per key: a local change
  // stamps its key with this device's clock, a remote one with the server's time, and ties go to the larger member id.
  // Saving is still the only thing that makes a version: the next Save posts this whole document.
  let live = null, liveOn = false, liveDown = false, pendingRender = false, lww = new Map();
  const wins = (key, at, by) => { const cur = lww.get(key); return !cur || at > cur.at || (at === cur.at && String(by) > String(cur.by)); };
  const stamp = (key, at, by) => lww.set(key, { at, by });
  // A remote change never redraws over a drag, a chalk stroke or a field someone is typing in; it waits.
  const busy = () => !!studio?.gesture || (!!root && root.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
  function refresh() { if (!studio) return; if (busy()) { pendingRender = true; return; } pendingRender = false; detailView(); }
  const paintLive = () => { const el = root?.querySelector('[data-live]'); if (el) { el.textContent = liveOn ? '● Live' : '○ Offline'; el.classList.toggle('on', liveOn); } };
  function sendOp(op, key) {
    if (key) stamp(key, Date.now(), me.u);
    if (!studio || liveDown) return;
    call(`/api/plays/${active}/op`, { op }).catch((x) => { if (/not set up/i.test(x.message)) liveDown = true; });
  }
  const sendPiece = (p) => sendOp({ k: 'piece', id: p.id, team: p.team, x: p.x, y: p.y, label: p.label }, `p:${p.id}`);
  function upsertPiece(op) {
    const d = studio.doc, cur = d.pieces.find((x) => x.id === op.id);
    if (cur) Object.assign(cur, { team: op.team, x: op.x, y: op.y, label: op.label }); // in place: a drag may hold this object
    else if (d.pieces.length < 60) d.pieces.push({ id: op.id, team: op.team, x: op.x, y: op.y, label: op.label });
  }
  function applyRemote(msg) {
    if (!studio || !msg?.op) return;
    const { op, by, n, at } = msg, d = studio.doc;
    if (op.k === 'saved') { if (detail) detail.version = Math.max(detail.version || 0, op.version); if (by !== me.u) toast(`${n || 'Someone'} saved v${op.version}`); return refresh(); }
    if (op.k === 'chalkClear') { if (!wins('chalk', at, by)) return; stamp('chalk', at, by); d.drawings = d.drawings.filter((x) => (lww.get(`s:${x.id}`)?.at ?? 0) > at); return refresh(); }
    const key = op.k.startsWith('piece') ? `p:${op.id}` : op.k.startsWith('stroke') ? `s:${op.sid}` : op.k.startsWith('key') ? `k:${op.at}` : null;
    if (!key || !wins(key, at, by)) return;
    if (op.k.startsWith('stroke') && (lww.get('chalk')?.at ?? 0) > at) return; // drawn before a clear
    stamp(key, at, by);
    if (op.k === 'piece') upsertPiece(op);
    else if (op.k === 'pieceDel') { d.pieces = d.pieces.filter((x) => x.id !== op.id); d.steps.forEach((st) => { delete st.pieces[op.id]; }); if (studio.selectedPieceId === op.id) studio.selectedPieceId = null; }
    else if (op.k === 'stroke') { const dr = op.d ? { ...op.d, id: op.sid } : { id: op.sid, points: op.points, color: op.color }; const i = d.drawings.findIndex((x) => x.id === op.sid); if (i >= 0) d.drawings[i] = dr; else { d.drawings.push(dr); if (d.drawings.length > 150) d.drawings.shift(); } }
    else if (op.k === 'strokeDel') d.drawings = d.drawings.filter((x) => x.id !== op.sid);
    else if (op.k === 'key') { const st = { at: op.at, pieces: op.pieces }; const i = d.steps.findIndex((x) => x.at === op.at); if (i >= 0) d.steps[i] = st; else d.steps.push(st); d.steps.sort((a, b) => a.at - b.at); }
    else if (op.k === 'keyDel') d.steps = d.steps.filter((x) => x.at !== op.at);
    refresh();
  }
  // Socket to the play's room (same shape as the Dugout's). Returns a closer; the editor still works without it.
  function openStudioLive(id, onOp, onState) {
    const tok = session()?.token;
    if (!tok || !window.WebSocket) return null;
    let sock = null, ping = null, retry = null, closed = false, opened = false;
    const base = (API || location.origin).replace(/^http/, 'ws');
    const connect = () => {
      try { sock = new WebSocket(`${base}/api/plays/${id}/ws?t=${encodeURIComponent(tok)}`); } catch { return; }
      sock.onopen = () => { opened = true; onState(true); ping = setInterval(() => { if (sock.readyState === 1) sock.send('ping'); }, 30000); };
      sock.onmessage = (m) => { if (m.data !== 'pong') { try { onOp(JSON.parse(m.data)); } catch { /* ignore junk */ } } };
      sock.onclose = () => { clearInterval(ping); if (!closed) onState(false); if (opened && !closed) retry = setTimeout(connect, 8000); };
    };
    connect();
    return () => { closed = true; clearInterval(ping); clearTimeout(retry); try { sock?.close(); } catch { /* already closed */ } };
  }
  // ---------- studio state: dirty tracking, local draft, undo/redo, save/publish ----------
  const sig = () => JSON.stringify(studio.doc);
  const dirty = () => !!studio && sig() !== studio.saved;
  const draftKey = () => `norex_tx_draft_${active}`;
  function persistDraft() { try { if (dirty()) localStorage.setItem(draftKey(), JSON.stringify({ base: detail?.version, at: Date.now(), doc: studio.doc })); else localStorage.removeItem(draftKey()); } catch {} }
  const normalizeDoc = (d) => ({ pieces: Array.isArray(d?.pieces) ? d.pieces : [], steps: Array.isArray(d?.steps) ? d.steps : [], drawings: Array.isArray(d?.drawings) ? d.drawings : [], quiz: Array.isArray(d?.quiz) ? d.quiz : [] });
  function snap() { studio.undo.push(sig()); if (studio.undo.length > 60) studio.undo.shift(); studio.redo = []; }
  // After an undo/redo the live room has to hear what changed, or the other manager keeps the old stroke.
  function syncDiff(a, b) {
    const pa = new Map(a.pieces.map((x) => [x.id, x])), pb = new Map(b.pieces.map((x) => [x.id, x]));
    for (const [id, pc] of pb) { const o = pa.get(id); if (!o || o.x !== pc.x || o.y !== pc.y || o.team !== pc.team || o.label !== pc.label) sendPiece(pc); }
    for (const id of pa.keys()) if (!pb.has(id)) sendOp({ k: 'pieceDel', id }, `p:${id}`);
    const da = new Map(a.drawings.map((x) => [x.id, x])), db = new Map(b.drawings.map((x) => [x.id, x]));
    for (const [id, d] of db) if (!da.has(id) || JSON.stringify(da.get(id)) !== JSON.stringify(d)) sendOp({ k: 'stroke', sid: id, d }, `s:${id}`);
    for (const id of da.keys()) if (!db.has(id)) sendOp({ k: 'strokeDel', sid: id }, `s:${id}`);
  }
  function stepHistory(from, to) { if (!from.length) return; to.push(sig()); const old = studio.doc; studio.doc = normalizeDoc(JSON.parse(from.pop())); studio.selectedPieceId = null; syncDiff(old, studio.doc); detailView(); }
  const undo = () => stepHistory(studio.undo, studio.redo);
  const redo = () => stepHistory(studio.redo, studio.undo);
  async function askText(title, value, max = 40) {
    let val = value;
    const v = await UI.modal({ title, icon: '🔤', body: `<input class="tx-asktext" type="text" maxlength="${max}" value="${esc(value)}" aria-label="${esc(title)}">`, actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: 'OK', value: 'ok' }],
      onOpen: (d, close) => { const i = $('.tx-asktext', d); i.focus(); i.select(); i.addEventListener('input', () => { val = i.value; }); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); val = i.value; close('ok'); } }); } });
    return v === 'ok' ? val.trim() : null;
  }
  async function confirmLeave() {
    if (!dirty()) return true;
    return UI.confirm({ title: 'Leave without saving?', text: 'You have changes that are not saved. They stay as a draft on this device and come back next time you open the studio, but nobody else sees them until you save.', ok: 'Leave', cancel: 'Keep editing' });
  }
  async function startStudio() {
    let doc = normalizeDoc(structuredClone(detail.doc || STARTER_DOC));
    let draft = null; try { draft = JSON.parse(localStorage.getItem(`norex_tx_draft_${active}`) || 'null'); } catch {}
    const saved = JSON.stringify(doc);
    if (draft?.doc && JSON.stringify(normalizeDoc(draft.doc)) !== saved) {
      const yes = await UI.confirm({ title: 'Restore your unsaved edits?', text: `Found changes from ${new Date(draft.at).toLocaleString()} that were never saved${draft.base !== detail.version ? ' (the play has a newer version since – saving will replace it)' : ''}.`, ok: 'Restore', cancel: 'Start fresh' });
      if (yes) doc = normalizeDoc(draft.doc); else { try { localStorage.removeItem(`norex_tx_draft_${active}`); } catch {} }
    }
    doc.drawings.forEach((dr) => { if (!dr.id) dr.id = crypto.randomUUID().slice(0, 8); });
    studio = { doc, saved, undo: [], redo: [], tool: 'move', drawColor: COLORS[0], drawWidth: 6, fill: false, bend: 1, vertical, full: false, selectedPieceId: null, gesture: false };
    lww = new Map(); liveOn = false; liveDown = false;
    live = openStudioLive(active, applyRemote, (on) => { liveOn = on; paintLive(); });
    detailView();
  }
  function leaveStudio() { live?.(); live = null; studio = null; liveOn = false; document.body.classList.remove('tx-full-open'); }
  // Save a new version (stays in the studio). `publish` also makes the play live and closes the studio.
  async function saveDoc({ publish = false } = {}) {
    if (!studio || studio.saving) return;
    studio.saving = true;
    try {
      const sent = studio.doc;
      detail = await call(`/api/plays/${active}`, { doc: sent });
      const got = normalizeDoc(detail.doc);
      const lost = (sent.pieces.length - got.pieces.length) + (sent.drawings.length - got.drawings.length);
      studio.doc = got; studio.saved = sig(); studio.selectedPieceId = null;
      if (publish && !detail.published) detail = await call(`/api/plays/${active}/publish`, { published: true });
      try { localStorage.removeItem(draftKey()); } catch {}
      toast(publish ? 'Saved and published 🚀' : `Saved as v${detail.version}.`);
      if (lost > 0) toast(`${lost} item${lost === 1 ? ' was' : 's were'} left out (off the pitch or invalid).`, true);
      if (publish) leaveStudio();
      detailView();
    } catch (x) { toast(x.message || 'Could not save.', true); }
    finally { if (studio) studio.saving = false; }
  }

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
  // Orientation: the document is always 1000 (length) × 640 (width). Horizontal draws it as-is; the vertical field turns it a quarter
  // so the length runs up the screen (goal at the top) – the same document, just seen portrait and bigger for drawing.
  let vertical = false;
  try { vertical = localStorage.getItem('norex_tx_vert') === '1'; } catch {}
  const isV = () => (studio ? studio.vertical : vertical);
  const toPct = (x, y, v = isV()) => (v ? { l: (640 - y) / 6.4, t: x / 10 } : { l: x / 10, t: y / 6.4 });
  const sp = (pt, v = isV()) => (v ? [640 - pt[1], pt[0]] : [pt[0], pt[1]]);
  const clampPct = (n) => Math.max(0, Math.min(100, n));
  const piece = (p) => { const q = toPct(p.x, p.y); return `<span class="tx-piece ${p.team}${studio?.selectedPieceId === p.id ? ' sel' : ''}" data-piece-id="${p.id}" style="left:${clampPct(q.l)}%;top:${clampPct(q.t)}%">${p.team === 'ball' ? '●' : p.team === 'cone' ? '' : esc(p.label || TEAM_LABEL[p.team] || '')}</span>`; };
  const colorOf = (c) => (/^#[0-9a-f]{6}$/i.test(c ?? '') ? c : '#c8352c');
  const f1 = (n) => Number(n).toFixed(1);
  // One chalk item → SVG in screen space (so circles stay round and text stays upright in either orientation).
  function shapeSvg(d, v = isV()) {
    const col = colorOf(d.color), w = d.w || 6, kind = d.kind || 'free';
    const P = (d.points || []).map((pt) => sp(pt, v));
    if (!P.length) return '';
    const dash = kind === 'dash' || kind === 'run' ? ` stroke-dasharray="${w * 2.4} ${w * 1.8}"` : '';
    const stroke = `stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash}`;
    const line = `fill="none" ${stroke}`;
    const area = d.fill ? `fill="${col}" fill-opacity=".28" ${stroke}` : line;
    const head = (from, to) => { const ang = Math.atan2(to[1] - from[1], to[0] - from[0]), L = 20 + w * 2.4, o = 0.42; return `<polygon points="${f1(to[0])},${f1(to[1])} ${f1(to[0] - L * Math.cos(ang - o))},${f1(to[1] - L * Math.sin(ang - o))} ${f1(to[0] - L * Math.cos(ang + o))},${f1(to[1] - L * Math.sin(ang + o))}" fill="${col}" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`; };
    const [a, b] = P;
    if (kind === 'free') return `<polyline points="${P.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' ')}" ${line}/>`;
    if (kind === 'dot') return `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${7 + w * 1.4}" fill="${col}" stroke="#0b0f16" stroke-width="2"/>`;
    if (kind === 'text') return `<text x="${f1(a[0])}" y="${f1(a[1])}" text-anchor="middle" dominant-baseline="middle" fill="${col}" stroke="#0b0f16" stroke-width="6" paint-order="stroke" font-family="Inter,sans-serif" font-weight="800" font-size="${28 + w * 1.5}">${esc(d.text || '')}</text>`;
    if (!b) return '';
    if (kind === 'circle') return `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${f1(Math.hypot(b[0] - a[0], b[1] - a[1]))}" ${area}/>`;
    if (kind === 'rect') return `<rect x="${f1(Math.min(a[0], b[0]))}" y="${f1(Math.min(a[1], b[1]))}" width="${f1(Math.abs(b[0] - a[0]))}" height="${f1(Math.abs(b[1] - a[1]))}" rx="8" ${area}/>`;
    if (kind === 'curve') {
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, bend = (d.bend === -1 ? -1 : 1) * 0.28 * len;
      const c = [(a[0] + b[0]) / 2 - (dy / len) * bend, (a[1] + b[1]) / 2 + (dx / len) * bend];
      return `<path d="M${f1(a[0])},${f1(a[1])} Q${f1(c[0])},${f1(c[1])} ${f1(b[0])},${f1(b[1])}" ${line}/>${head(c, b)}`;
    }
    // line, dash, arrow, run, darrow
    const both = kind === 'darrow', one = kind === 'arrow' || kind === 'run';
    return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" ${line}/>${one || both ? head(a, b) : ''}${both ? head(b, a) : ''}`;
  }
  const drawLine = (d) => shapeSvg(d);
  const pitchMarks = '<span class="tx-half"></span><span class="tx-circle"></span><span class="tx-box a"></span><span class="tx-box b"></span><span class="tx-six a"></span><span class="tx-six b"></span>';
  function pitch(doc, editable) {
    const v = isV();
    const toolClass = editable ? ` tool-${studio.tool}` : '';
    const board = `<div class="tx-pitch${v ? ' vert' : ''}${editable ? ' tx-edit' + toolClass : ''}" ${editable ? 'data-studio-pitch' : 'data-view-pitch'} aria-label="Tactics board"><svg class="tx-draw" viewBox="${v ? '0 0 640 1000' : '0 0 1000 640'}" preserveAspectRatio="none">${(doc.drawings || []).map(drawLine).join('')}<g data-preview></g></svg>${(doc.pieces || []).map(piece).join('')}${pitchMarks}</div>`;
    const bar = `<button class="btn sm ghost" type="button" data-vert aria-pressed="${v}">${v ? '↔ Horizontal field' : '↕ Vertical field'}</button>`;
    return editable ? board : `<div class="tx-stage${is3d() && !v ? ' tx-3d' : ''}" data-stage style="--spin:${spin}deg">${board}</div><div class="tx-view-bar">${v ? '' : `<button class="btn sm ghost" type="button" data-3d aria-pressed="${is3d()}">${is3d() ? '▭ Flat view' : '🧊 3D view'}</button>`}${bar}${is3d() && !v ? '<small class="muted">Drag the board to turn it.</small>' : ''}</div>`;
  }
  // 3D board (C8): CSS-only tilt + spin, pieces stand up facing the viewer. Viewing only – editing stays flat so drags map 1:1.
  const is3d = () => { try { return localStorage.getItem('norex_tx3d') === '1'; } catch { return false; } };
  function set3d(on) { try { localStorage.setItem('norex_tx3d', on ? '1' : '0'); } catch {} detailView(); }
  let spin = 0;
  function quizEditRow(q, i) {
    return `<div class="tx-qedit" data-q="${i}"><input class="tx-qtext" type="text" value="${esc(q.q)}" data-qfield="q" placeholder="Question text" maxlength="200" aria-label="Question ${i + 1} text"><div class="tx-qopts">${q.options.map((o, j) => `<div class="tx-qopt"><input type="radio" name="qa${i}" ${q.answer === j ? 'checked' : ''} data-qanswer="${j}" aria-label="Correct answer"><input type="text" value="${esc(o)}" data-qopt="${j}" maxlength="80" placeholder="Option ${j + 1}" aria-label="Option ${j + 1}">${q.options.length > 2 ? `<button type="button" class="tx-qdel" data-del-opt="${j}" aria-label="Remove option">×</button>` : ''}</div>`).join('')}</div><div class="tx-qrow-actions">${q.options.length < 6 ? '<button type="button" class="btn sm ghost" data-add-opt>+ Option</button>' : ''}<button type="button" class="btn sm danger" data-del-q>Delete question</button></div></div>`;
  }
  function studioView(p) {
    const st = studio, d = st.doc;
    const tb = (id, label, hint = '') => `<button class="btn sm ghost${st.tool === id ? ' active' : ''}" type="button" data-tool="${id}" title="${esc(hint)}">${label}</button>`;
    const selPiece = st.selectedPieceId && d.pieces.find((x) => x.id === st.selectedPieceId);
    const hint = (DRAW_TOOLS.find((t) => t[0] === st.tool) || [])[3] || (st.tool === 'move' ? 'Drag pieces. Tap one to select it.' : 'Tap the field to place it.');
    const isDirty = dirty();
    const actions = `<span class="tx-live${liveOn ? ' on' : ''}" data-live aria-live="polite">${liveOn ? '● Live' : '○ Offline'}</span><button class="btn sm ghost" type="button" data-big>${st.full ? '✕ Close big view' : '⤢ Big vertical field'}</button><button class="btn sm ghost" type="button" data-cancel-edit>Close</button><button class="btn sm${p.published ? '' : ' ghost'}" type="button" data-save-doc>💾 Save${isDirty ? ' •' : ''}</button>${p.published ? '' : '<button class="btn sm" type="button" data-save-publish>🚀 Save &amp; publish</button>'}`;
    const style = `<div class="tx-grp"><small>Style</small><div class="tx-style"><div class="tx-colors">${COLORS.map((c) => `<button class="tx-swatch${st.drawColor === c ? ' on' : ''}" type="button" style="background:${c}" data-color="${c}" aria-label="Colour ${c}"></button>`).join('')}</div><div class="tx-tools">${WIDTHS.map(([w, l]) => `<button class="btn sm ghost${st.drawWidth === w ? ' active' : ''}" type="button" data-width="${w}">${l}</button>`).join('')}<button class="btn sm ghost${st.fill ? ' active' : ''}" type="button" data-fill title="Fill circles and zones">◼ Fill</button><button class="btn sm ghost" type="button" data-bend title="Which way curved arrows bend">${st.bend === 1 ? '↰ Bend left' : '↱ Bend right'}</button></div></div></div>`;
    const edit = `<div class="tx-grp"><small>Edit</small><div class="tx-tools"><button class="btn sm ghost" type="button" data-undo${st.undo.length ? '' : ' disabled'}>↶ Undo</button><button class="btn sm ghost" type="button" data-redo${st.redo.length ? '' : ' disabled'}>↷ Redo</button>${selPiece ? '<button class="btn sm ghost" type="button" data-rename>🏷 Rename</button><button class="btn sm ghost" type="button" data-dup>⧉ Duplicate</button><button class="btn sm danger" type="button" data-remove-piece>Remove selected</button>' : ''}${d.drawings.length ? '<button class="btn sm ghost" type="button" data-clear-chalk>Clear chalk</button>' : ''}<button class="btn sm ghost" type="button" data-vert aria-pressed="${st.vertical}">${st.vertical ? '↔ Horizontal' : '↕ Vertical'}</button><button class="btn sm ghost" type="button" data-json-edit>JSON</button></div></div>`;
    const colors = COLORS.map((c) => `<button class="tx-swatch${st.drawColor === c ? ' on' : ''}" type="button" style="background:${c}" data-color="${c}" aria-label="Colour ${c}"></button>`).join('');
    const widths = WIDTHS.map(([w, l]) => `<button class="btn sm ghost${st.drawWidth === w ? ' active' : ''}" type="button" data-width="${w}">${l}</button>`).join('');
    // big view: two compact scrolling rows (tools, then style + edit) so the field gets the height
    const toolbar = st.full ? `<div class="tx-toolbar tx-rows"><div class="tx-row">${DRAW_TOOLS.map(([id, ic, l, h]) => tb(id, `${ic} ${l}`, h)).join('')}${tb('move', '🖱 Move', 'Drag pieces. Tap one to select it.')}${PIECE_TOOLS.map(([id, l]) => tb(id, l)).join('')}</div><div class="tx-row"><div class="tx-colors">${colors}</div>${widths}<button class="btn sm ghost${st.fill ? ' active' : ''}" type="button" data-fill>◼ Fill</button><button class="btn sm ghost" type="button" data-bend>${st.bend === 1 ? '↰ Bend left' : '↱ Bend right'}</button><button class="btn sm ghost" type="button" data-undo${st.undo.length ? '' : ' disabled'}>↶ Undo</button><button class="btn sm ghost" type="button" data-redo${st.redo.length ? '' : ' disabled'}>↷ Redo</button>${selPiece ? '<button class="btn sm ghost" type="button" data-rename>🏷 Rename</button><button class="btn sm ghost" type="button" data-dup>⧉ Duplicate</button><button class="btn sm danger" type="button" data-remove-piece>Remove</button>' : ''}${d.drawings.length ? '<button class="btn sm ghost" type="button" data-clear-chalk>Clear chalk</button>' : ''}<button class="btn sm ghost" type="button" data-vert>${st.vertical ? '↔ Horizontal' : '↕ Vertical'}</button></div></div><p class="tx-hint muted small">${esc(hint)}</p>` : `<div class="tx-toolbar"><div class="tx-grp"><small>Pieces</small><div class="tx-tools">${tb('move', '🖱 Move', 'Drag pieces. Tap one to select it.')}${PIECE_TOOLS.map(([id, l]) => tb(id, l)).join('')}</div></div><div class="tx-grp"><small>Chalk</small><div class="tx-tools">${DRAW_TOOLS.map(([id, ic, l, h]) => tb(id, `${ic} ${l}`, h)).join('')}</div></div>${style}${edit}</div><p class="tx-hint muted small">${esc(hint)}</p>`;
    const lower = st.full ? '' : `<div class="tx-keyframes"><b>Keyframes</b><div class="tx-kf-list">${d.steps.length ? d.steps.map((x, i) => `<button class="tx-kf" type="button" data-kf="${i}">⏱ ${(x.at / 1000).toFixed(1)}s<i class="tx-kf-del" data-del-kf="${i}">×</i></button>`).join('') : '<span class="muted">None yet — arrange pieces, then add one.</span>'}</div><button class="btn sm ghost" type="button" data-add-kf>+ Add keyframe at current positions</button></div>
<div class="tx-quizedit"><b>Quiz</b>${d.quiz.map(quizEditRow).join('')}${d.quiz.length < 20 ? '<button class="btn sm ghost" type="button" data-add-q>+ Add question</button>' : ''}</div>`;
    const intro = st.full ? '' : `<p class="muted">Place pieces, chalk the board, capture keyframes, then save${p.published ? ' – members see each saved version straight away' : ' and publish'}.</p>`;
    return `<div class="tx-studio${st.full ? ' full' : ''}"><div class="tx-title"><div><p class="kicker">${esc(p.category)}</p><h2>Studio: ${esc(p.title)}</h2>${intro}</div><div class="tx-actions">${actions}</div></div>${toolbar}${pitch(d, true)}${st.full ? '<div class="tx-actions tx-fullbar"><button class="btn sm ghost" type="button" data-add-kf>+ Keyframe</button></div>' : ''}${lower}</div>`;
  }
  function detailView() {
    const p = detail;
    if (studio) { persistDraft(); root.innerHTML = `${studio.full ? '' : '<button class="linkish tx-back" type="button" data-back>← All plays</button>'}${studioView(p)}`; document.body.classList.toggle('tx-full-open', !!studio.full); return; }
    const q = p.doc?.quiz || [], steps = p.doc?.steps || [];
    const manage = manager() ? `<div class="tx-manage card"><h3>Manager controls</h3><div class="tx-actions"><button class="btn sm" data-publish="${p.published ? '0' : '1'}">${p.published ? 'Unpublish' : 'Publish'}</button><button class="btn sm ghost" data-edit>Open studio</button><button class="btn sm ghost" data-restore>Version history</button>${p.published ? `<button class="btn sm ghost" data-discord>📣 ${p.discord ? 'Share again' : 'Share to Discord'}</button>` : ''}<button class="btn sm danger" data-archive>Archive</button></div><small class="muted">Server-side validation remains authoritative for every save and quiz.</small></div>` : '';
    const quiz = q.length ? `<form class="tx-quiz card" data-quiz><h3>Knowledge check</h3>${q.map((x, i) => `<fieldset><legend>${i + 1}. ${esc(x.q)}</legend>${x.options.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}" required> <span>${esc(o)}</span></label>`).join('')}</fieldset>`).join('')}<button class="btn" type="submit">Check answers</button></form>` : '';
    root.innerHTML = `<button class="linkish tx-back" type="button" data-back>← All plays</button><div class="tx-title"><div><p class="kicker">${esc(p.category)}</p><h2>${esc(p.title)}</h2><p class="muted">Version ${p.version}${p.mine?.assigned ? ' · assigned to you' : ''}</p></div>${p.mine?.learned ? '<span class="tag tx-done">✓ Learned</span>' : p.published ? '<button class="btn sm ghost" data-learn>Mark learned</button>' : '<span class="tag">Draft</span>'}</div>${pitch(p.doc || {})}<div class="tx-steps">${steps.length ? `<button class="btn sm ghost" type="button" data-play>▶ Play (${steps.length} keyframe${steps.length === 1 ? '' : 's'})</button>` : '<span class="muted">No keyframes in this version yet.</span>'}</div>${quiz}${manage}<div class="tx-media card" data-media-card></div>`;
    loadMedia();
  }
  // ---- recordings (BE1): tab-capture video + voice-over, uploaded raw to R2 by managers, played back by members ----
  let rec = null;
  const RECORDABLE = { video: 'video/webm', voice: 'audio/webm' };
  const recordControls = () => rec
    ? `<div class="tx-rec"><span class="tx-rec-dot"></span> Recording ${rec.kind === 'video' ? 'the board' : 'voice-over'}… <button class="btn sm danger" type="button" data-rec-stop>■ Stop</button></div>`
    : `<div class="tx-actions"><button class="btn sm ghost" type="button" data-rec-start="video">🎥 Record video (pick this tab)</button><button class="btn sm ghost" type="button" data-rec-start="voice">🎙 Record voice-over</button></div>`;
  async function loadMedia() {
    const box = root.querySelector('[data-media-card]'); if (!box) return;
    let media = [];
    try { media = (await call(`/api/plays/${active}/media`)).media || []; } catch { box.remove(); return; }
    const row = (m) => `<div class="tx-media-row"><span>${m.kind === 'video' ? '🎬 Video' : '🎙 Voice-over'}</span><small class="muted">${new Date(m.at).toLocaleDateString()} · ${(m.size / 1e6).toFixed(1)} MB</small><button class="btn sm ghost" type="button" data-watch="${m.id}" data-kind="${m.kind}">${m.kind === 'video' ? '▶ Watch' : '🔊 Listen'}</button><button class="btn sm ghost" type="button" data-dl-media="${m.id}" data-kind="${m.kind}" title="Save the file${m.kind === 'video' ? ' – e.g. to upload to YouTube' : ''}">⬇ Save</button>${manager() ? `${detail?.published ? `<button class="btn sm ghost" type="button" data-media-discord="${m.id}">📣 Discord</button>` : ''}<button class="btn sm danger" type="button" data-hide-media="${m.id}">Hide</button>` : ''}</div>`;
    box.innerHTML = `<h3>Recordings</h3>${media.length ? media.map(row).join('') : '<p class="muted">No video or voice-over yet.</p>'}<div class="tx-media-player"></div>${manager() ? recordControls() : ''}`;
  }
  async function mediaBlob(mid) {
    const r = await fetch(`${API}/api/plays/${active}/media/${mid}`, { headers: { Authorization: `Bearer ${session()?.token}` }, cache: 'no-store' });
    if (!r.ok) throw new Error('Could not load that recording.');
    return r.blob();
  }
  async function saveMedia(mid, kind) {
    const blob = await mediaBlob(mid);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(detail.title || 'play').replace(/[^\w-]+/g, '-').slice(0, 40)}.${blob.type.includes('mp4') ? (kind === 'video' ? 'mp4' : 'm4a') : 'webm'}`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function shareMedia(mid) {
    const t = await discordTargets();
    let f = {};
    const v = await UI.modal({
      title: `Send to Discord · ${detail.title}`, icon: '📣',
      body: `${dcPickers(t)}<p class="muted small">Videos up to 25 MB are attached so the squad can watch in Discord; bigger ones post a card linking to the Studio. For YouTube, use ⬇ Save and upload the file there.</p>`,
      actions: t.ready ? [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '📣 Send', value: 'ok' }] : undefined,
      onOpen: (d) => { const rd = () => { f = { channel: $('[name=channel]', d)?.value, role: $('[name=role]', d)?.value }; }; rd(); d.addEventListener('change', rd); },
    });
    if (v !== 'ok') return;
    toast('Sending…');
    try { const r = await call(`/api/plays/${active}/media/${mid}/discord`, f); toast(r.attached ? 'Sent to Discord 📣' : 'Too big to attach – posted a link card 📣'); } catch (x) { toast(x.message, true); }
  }
  async function watch(mid, kind) {
    const player = root.querySelector('.tx-media-player'); if (!player) return;
    const url = URL.createObjectURL(await mediaBlob(mid));
    player.innerHTML = kind === 'video' ? `<video controls playsinline src="${url}"></video>` : `<audio controls src="${url}"></audio>`;
  }
  async function startRec(kind) {
    if (rec) return;
    try {
      const stream = kind === 'video'
        ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false, preferCurrentTab: true })
        : await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const mime = MediaRecorder.isTypeSupported(RECORDABLE[kind]) ? RECORDABLE[kind] : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => finishRec(kind, chunks);
      stream.getTracks().forEach((tr) => tr.addEventListener('ended', stopRec));
      rec = { kind, recorder, stream };
      recorder.start(1000);
      loadMedia();
    } catch (x) { toast(x.name === 'NotAllowedError' ? 'Recording was cancelled or blocked.' : x.message, true); }
  }
  function stopRec() { if (rec && rec.recorder.state !== 'inactive') rec.recorder.stop(); }
  async function finishRec(kind, chunks) {
    const cur = rec; rec = null;
    cur.stream.getTracks().forEach((tr) => tr.stop());
    const blob = new Blob(chunks, { type: RECORDABLE[kind] });
    if (!blob.size) { toast('Nothing was recorded.', true); return loadMedia(); }
    toast('Uploading…');
    try {
      const s = session();
      const r = await fetch(`${API}/api/plays/${active}/media?kind=${kind}`, { method: 'POST', headers: { Authorization: `Bearer ${s?.token}`, 'Content-Type': blob.type }, body: blob });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
      toast(`${kind === 'video' ? 'Video' : 'Voice-over'} saved.`);
    } catch (x) { toast(x.message, true); }
    loadMedia();
  }
  async function load(openId) {
    root.innerHTML = UI.skeleton('rows', 5);
    const d = await call('/api/plays'); plays = d.plays || [];
    const id = openId || +(location.hash.match(/^#play(\d+)$/)?.[1] || 0);
    if (id) return open(id);
    active = null; detail = null; listView();
  }
  async function open(id) {
    leaveStudio(); active = +id; detail = await call(`/api/plays/${active}`);
    history.replaceState(null, '', `#play${active}`); detailView();
  }
  function pitchPoint(e, el) {
    const r = el.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    return isV() ? { x: fy * 1000, y: (1 - fx) * 640 } : { x: fx * 1000, y: fy * 640 };
  }
  function startDrag(e, pitchEl, pieceEl) {
    const id = pieceEl.dataset.pieceId, p = studio.doc.pieces.find((x) => x.id === id);
    if (!p) return;
    const startX = e.clientX, startY = e.clientY, before = sig();
    let moved = false, lastSent = 0;
    studio.gesture = true;
    const onMove = (ev) => {
      const pt = pitchPoint(ev, pitchEl);
      p.x = pt.x; p.y = pt.y;
      const q = toPct(pt.x, pt.y);
      pieceEl.style.left = `${q.l}%`; pieceEl.style.top = `${q.t}%`;
      if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) moved = true;
      if (moved && Date.now() - lastSent > 120) { lastSent = Date.now(); sendPiece(p); }
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
      studio.gesture = false;
      if (!moved) studio.selectedPieceId = studio.selectedPieceId === id ? null : id;
      else { studio.undo.push(before); studio.redo = []; sendPiece(p); }
      detailView();
    };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
  }
  // ---- chalk: freehand, lines, arrows, curves, circles, zones, dots, text, eraser ----
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; const t = l2 ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / l2)) : 0; return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy)); };
  function hitDrawing(d, pt) {
    const R = 22 + (d.w || 6), P = d.points, k = d.kind || 'free';
    if (k === 'dot') return Math.hypot(pt.x - P[0][0], pt.y - P[0][1]) < R + 10;
    if (k === 'text') return Math.abs(pt.x - P[0][0]) < 20 + (d.text || '').length * 14 && Math.abs(pt.y - P[0][1]) < 30;
    if (k === 'circle') { const r = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), dd = Math.hypot(pt.x - P[0][0], pt.y - P[0][1]); return d.fill ? dd <= r + R / 2 : Math.abs(dd - r) < R; }
    if (k === 'rect') {
      const x0 = Math.min(P[0][0], P[1][0]), x1 = Math.max(P[0][0], P[1][0]), y0 = Math.min(P[0][1], P[1][1]), y1 = Math.max(P[0][1], P[1][1]);
      const inBox = (m) => pt.x >= x0 - m && pt.x <= x1 + m && pt.y >= y0 - m && pt.y <= y1 + m;
      return d.fill ? inBox(R / 2) : inBox(R) && !(pt.x > x0 + R && pt.x < x1 - R && pt.y > y0 + R && pt.y < y1 - R);
    }
    if (k === 'curve') { const [a, b] = P, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, bend = (d.bend === -1 ? -1 : 1) * 0.28 * len; const c = [(a[0] + b[0]) / 2 - (dy / len) * bend, (a[1] + b[1]) / 2 + (dx / len) * bend]; return segDist(pt, a, c) < R || segDist(pt, c, b) < R; }
    for (let i = 0; i < P.length - 1; i++) if (segDist(pt, P[i], P[i + 1]) < R) return true;
    return false;
  }
  function startErase(pitchEl, pt0) {
    const st = studio; st.gesture = true;
    let snapped = false;
    const svg = pitchEl.querySelector('.tx-draw');
    const erase = (pt) => {
      for (let i = st.doc.drawings.length - 1; i >= 0; i--) {
        if (!hitDrawing(st.doc.drawings[i], pt)) continue;
        if (!snapped) { snap(); snapped = true; }
        const [gone] = st.doc.drawings.splice(i, 1);
        sendOp({ k: 'strokeDel', sid: gone.id }, `s:${gone.id}`);
        svg.innerHTML = `${st.doc.drawings.map(drawLine).join('')}<g data-preview></g>`;
        return;
      }
    };
    erase(pt0);
    const onMove = (ev) => erase(pitchPoint(ev, pitchEl));
    const onUp = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); st.gesture = false; detailView(); };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
  }
  function startDraw(pitchEl, pt0) {
    const st = studio, kind = st.tool;
    const prev = pitchEl.querySelector('[data-preview]');
    const base = () => ({ id: crypto.randomUUID().slice(0, 8), color: st.drawColor, ...(st.drawWidth !== 6 ? { w: st.drawWidth } : {}) });
    const commit = (dr) => {
      snap();
      st.doc.drawings.push(dr);
      if (st.doc.drawings.length > 150) { const old = st.doc.drawings.shift(); sendOp({ k: 'strokeDel', sid: old.id }, `s:${old.id}`); }
      sendOp({ k: 'stroke', sid: dr.id, d: dr }, `s:${dr.id}`);
      detailView();
    };
    if (kind === 'erase') return startErase(pitchEl, pt0);
    if (kind === 'dot') return commit({ ...base(), kind: 'dot', points: [[pt0.x, pt0.y]] });
    if (kind === 'text') { askText('Label text', '').then((txt) => { if (txt) commit({ ...base(), kind: 'text', points: [[pt0.x, pt0.y]], text: txt }); }); return; }
    st.gesture = true;
    const points = [[pt0.x, pt0.y]];
    let end = null;
    const shape = (e2) => ({ ...base(), kind, points: [points[0], e2], ...(st.fill && (kind === 'circle' || kind === 'rect') ? { fill: true } : {}), ...(kind === 'curve' && st.bend === -1 ? { bend: -1 } : {}) });
    const onMove = (ev) => {
      const p = pitchPoint(ev, pitchEl);
      if (kind === 'free') { const l = points[points.length - 1]; if (points.length < 60 && Math.hypot(p.x - l[0], p.y - l[1]) > 7) points.push([p.x, p.y]); prev.innerHTML = shapeSvg({ ...base(), points }); }
      else { end = [p.x, p.y]; prev.innerHTML = shapeSvg(shape(end)); }
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
      st.gesture = false; prev.innerHTML = '';
      if (kind === 'free') { if (points.length >= 2) { const { id, color, w } = base(); commit({ id, color, ...(w ? { w } : {}), points }); } else detailView(); }
      else if (end && Math.hypot(end[0] - points[0][0], end[1] - points[0][1]) > 14) commit(shape(end));
      else detailView();
    };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
  }
  async function addKeyframe() {
    let secs = studio.doc.steps.length ? Math.max(...studio.doc.steps.map((s) => s.at)) / 1000 + 2 : 0;
    const v = await UI.modal({ title: 'Add keyframe', icon: '⏱', body: `<label class="tx-kflabel">Time (seconds)<input type="number" min="0" max="60" step="0.5" value="${secs}" class="tx-kftime" aria-label="Keyframe time in seconds"></label>`, actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: 'Add keyframe', value: 'add' }], onOpen: (d) => d.addEventListener('input', (e) => { if (e.target.matches('.tx-kftime')) secs = +e.target.value; }) });
    if (v !== 'add') return;
    const at = Math.round(Math.max(0, Math.min(60, secs)) * 1000);
    snap();
    const snapshot = Object.fromEntries(studio.doc.pieces.map((p) => [p.id, { x: p.x, y: p.y }]));
    const i = studio.doc.steps.findIndex((s) => s.at === at);
    if (i >= 0) studio.doc.steps[i] = { at, pieces: snapshot }; else studio.doc.steps.push({ at, pieces: snapshot });
    studio.doc.steps.sort((a, b) => a.at - b.at);
    sendOp({ k: 'key', at, pieces: snapshot }, `k:${at}`);
    detailView();
  }
  async function editJson() {
    let raw = JSON.stringify(studio.doc, null, 2);
    const v = await UI.modal({ title: 'Edit as JSON (advanced)', icon: '🧠', body: `<p class="muted small">For power edits. Validated and trimmed by the Worker on save.</p><textarea class="tx-json" rows="16" aria-label="Play document">${esc(raw)}</textarea>`, actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: 'Apply', value: 'apply' }], onOpen: (d) => d.addEventListener('input', (e) => { if (e.target.matches('.tx-json')) raw = e.target.value; }) });
    if (v !== 'apply') return;
    try { const nd = normalizeDoc(JSON.parse(raw)); snap(); studio.doc = nd; detailView(); } catch { toast('Invalid JSON.', true); }
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
        for (const [id, pos] of Object.entries(f.pieces)) { const el = els[id]; if (el) { const q = toPct(pos.x, pos.y); el.style.left = `${q.l}%`; el.style.top = `${q.t}%`; } }
      }, f.at);
    });
  }
  function removeSelected() {
    const id = studio.selectedPieceId; if (!id) return;
    snap();
    studio.doc.pieces = studio.doc.pieces.filter((p) => p.id !== id);
    studio.doc.steps.forEach((st) => { delete st.pieces[id]; });
    studio.selectedPieceId = null; sendOp({ k: 'pieceDel', id }, `p:${id}`); detailView();
  }
  function wire() {
    root.addEventListener('pointerdown', (e) => {
      const st = e.target.closest('.tx-3d[data-stage]'); if (!st || studio) return;
      let x = e.clientX; st.setPointerCapture?.(e.pointerId);
      const move = (ev) => { spin = Math.max(-60, Math.min(60, spin + (ev.clientX - x) * 0.3)); x = ev.clientX; st.style.setProperty('--spin', `${spin}deg`); };
      const up = () => { st.removeEventListener('pointermove', move); st.removeEventListener('pointerup', up); st.removeEventListener('pointercancel', up); };
      st.addEventListener('pointermove', move); st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    });
    root.addEventListener('focusout', () => setTimeout(() => { if (pendingRender && !busy()) refresh(); }, 0));
    root.addEventListener('pointerdown', (e) => {
      if (!studio) return;
      const pitchEl = e.target.closest('[data-studio-pitch]'); if (!pitchEl) return;
      const pt = pitchPoint(e, pitchEl);
      if (DRAW_IDS.has(studio.tool)) { e.preventDefault(); startDraw(pitchEl, pt); return; }
      const pieceEl = e.target.closest('[data-piece-id]');
      if (pieceEl && studio.tool === 'move') { startDrag(e, pitchEl, pieceEl); return; }
      if (studio.tool.startsWith('add-') && !pieceEl) {
        const team = studio.tool.slice(4);
        if (studio.doc.pieces.length < 60) { snap(); const np = { id: crypto.randomUUID().slice(0, 8), team, x: pt.x, y: pt.y, label: TEAM_LABEL[team] }; studio.doc.pieces.push(np); sendPiece(np); }
        detailView();
      }
    });
    // keyboard: Ctrl/⌘+Z undo, Shift+Ctrl/⌘+Z redo, Delete removes the selected piece, Esc closes the big view
    document.addEventListener('keydown', (e) => {
      if (!studio || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && studio.selectedPieceId) { e.preventDefault(); removeSelected(); }
      else if (e.key === 'Escape' && studio.full) { studio.full = false; detailView(); }
    });
    addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
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
        if (e.target.closest('[data-cancel-edit]')) { if (await confirmLeave()) { leaveStudio(); detailView(); } return; }
        if (e.target.closest('[data-save-publish]')) { saveDoc({ publish: true }); return; }
        if (e.target.closest('[data-save-doc]')) { saveDoc(); return; }
        const tool = e.target.closest('[data-tool]'); if (tool) { studio.tool = tool.dataset.tool; detailView(); return; }
        const col = e.target.closest('[data-color]'); if (col) { studio.drawColor = col.dataset.color; detailView(); return; }
        const wd = e.target.closest('[data-width]'); if (wd) { studio.drawWidth = +wd.dataset.width; detailView(); return; }
        if (e.target.closest('[data-fill]')) { studio.fill = !studio.fill; detailView(); return; }
        if (e.target.closest('[data-bend]')) { studio.bend = studio.bend === 1 ? -1 : 1; detailView(); return; }
        if (e.target.closest('[data-undo]')) { undo(); return; }
        if (e.target.closest('[data-redo]')) { redo(); return; }
        if (e.target.closest('[data-vert]')) { studio.vertical = !studio.vertical; vertical = studio.vertical; try { localStorage.setItem('norex_tx_vert', vertical ? '1' : '0'); } catch {} detailView(); return; }
        if (e.target.closest('[data-big]')) { studio.full = !studio.full; if (studio.full) { studio.vertical = true; vertical = true; try { localStorage.setItem('norex_tx_vert', '1'); } catch {} } detailView(); return; }
        if (e.target.closest('[data-rename]')) { const pc = studio.doc.pieces.find((x) => x.id === studio.selectedPieceId); if (pc) { const t = await askText('Piece label', pc.label || '', 20); if (t !== null) { snap(); pc.label = t || undefined; sendPiece(pc); detailView(); } } return; }
        if (e.target.closest('[data-dup]')) { const pc = studio.doc.pieces.find((x) => x.id === studio.selectedPieceId); if (pc && studio.doc.pieces.length < 60) { snap(); const np = { ...pc, id: crypto.randomUUID().slice(0, 8), x: Math.min(1000, pc.x + 30), y: Math.min(640, pc.y + 30) }; studio.doc.pieces.push(np); studio.selectedPieceId = np.id; sendPiece(np); detailView(); } return; }
        if (e.target.closest('[data-remove-piece]')) { removeSelected(); return; }
        if (e.target.closest('[data-clear-chalk]')) { snap(); studio.doc.drawings = []; sendOp({ k: 'chalkClear' }, 'chalk'); detailView(); return; }
        if (e.target.closest('[data-json-edit]')) { editJson(); return; }
        if (e.target.closest('[data-add-kf]')) { addKeyframe(); return; }
        const delKf = e.target.closest('[data-del-kf]'); if (delKf) { snap(); const di = +delKf.dataset.delKf, at = studio.doc.steps[di]?.at; studio.doc.steps.splice(di, 1); if (at !== undefined) sendOp({ k: 'keyDel', at }, `k:${at}`); detailView(); return; }
        const kf = e.target.closest('[data-kf]'); if (kf) { const s = studio.doc.steps[+kf.dataset.kf]; for (const [id, pos] of Object.entries(s.pieces)) { const pc = studio.doc.pieces.find((x) => x.id === id); if (pc) { pc.x = pos.x; pc.y = pos.y; sendPiece(pc); } } detailView(); return; }
        if (e.target.closest('[data-add-q]')) { if (studio.doc.quiz.length < 20) studio.doc.quiz.push({ q: '', options: ['', ''], answer: 0 }); detailView(); return; }
        const delQ = e.target.closest('[data-del-q]'); if (delQ) { studio.doc.quiz.splice(+delQ.closest('[data-q]').dataset.q, 1); detailView(); return; }
        const addOpt = e.target.closest('[data-add-opt]'); if (addOpt) { const q = studio.doc.quiz[+addOpt.closest('[data-q]').dataset.q]; if (q.options.length < 6) q.options.push(''); detailView(); return; }
        const delOpt = e.target.closest('[data-del-opt]'); if (delOpt) { const qd = delOpt.closest('[data-q]'); const q = studio.doc.quiz[+qd.dataset.q]; const j = +delOpt.dataset.delOpt; if (q.options.length > 2) { q.options.splice(j, 1); if (q.answer >= q.options.length) q.answer = 0; else if (q.answer > j) q.answer--; } detailView(); return; }
        const back = e.target.closest('[data-back]'); if (back && (await confirmLeave())) { leaveStudio(); history.replaceState(null, '', location.pathname); await load(); } return;
      }
      const o = e.target.closest('[data-open]'); if (o) { try { await open(o.dataset.open); } catch (x) { toast(x.message, true); } return; }
      if (e.target.closest('[data-back]')) { history.replaceState(null, '', location.pathname); await load(); return; }
      if (e.target.closest('[data-play]')) { playback(); return; }
      const rs = e.target.closest('[data-rec-start]'); if (rs) { startRec(rs.dataset.recStart); return; }
      if (e.target.closest('[data-rec-stop]')) { stopRec(); return; }
      const wt = e.target.closest('[data-watch]'); if (wt) { try { await watch(wt.dataset.watch, wt.dataset.kind); } catch (x) { toast(x.message, true); } return; }
      const dl = e.target.closest('[data-dl-media]'); if (dl) { try { await saveMedia(dl.dataset.dlMedia, dl.dataset.kind); } catch (x) { toast(x.message, true); } return; }
      const md = e.target.closest('[data-media-discord]'); if (md) { shareMedia(md.dataset.mediaDiscord); return; }
      const t3 = e.target.closest('[data-3d]'); if (t3) { set3d(!is3d()); return; }
      if (e.target.closest('[data-vert]')) { vertical = !vertical; try { localStorage.setItem('norex_tx_vert', vertical ? '1' : '0'); } catch {} detailView(); return; }
      const hd = e.target.closest('[data-hide-media]'); if (hd) { if (!(await UI.confirm({ title: 'Hide this recording?', text: 'It disappears for members; the file is kept.', ok: 'Hide', danger: true }))) return; try { await call(`/api/plays/${active}/media/${hd.dataset.hideMedia}/delete`, {}); toast('Recording hidden.'); loadMedia(); } catch (x) { toast(x.message, true); } return; }
      if (e.target.closest('[data-learn]')) { try { await call(`/api/plays/${active}/learned`, { learned: true }); detail.mine.learned = true; toast('Marked learned.'); detailView(); } catch (x) { toast(x.message, true); } return; }
      const pub = e.target.closest('[data-publish]'); if (pub) { if (pub.dataset.publish === '1' && !((detail.doc?.pieces?.length) || (detail.doc?.drawings?.length)) && !(await UI.confirm({ title: 'Publish an empty play?', text: 'This saved version has no pieces or chalk. If you were working in the studio, open it and use Save & publish there.', ok: 'Publish anyway' }))) return; try { detail = await call(`/api/plays/${active}/publish`, { published: pub.dataset.publish === '1' }); toast(detail.published ? 'Play published.' : 'Play unpublished.'); detailView(); } catch (x) { toast(x.message, true); } return; }
      if (e.target.closest('[data-edit]')) { startStudio(); return; }
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
