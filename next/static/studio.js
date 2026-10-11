// Tactics › Playbook › ✏️ Studio (B1, managers – owner flag `nxStudio` first). The live Studio's editor (web/tactics.js studioView)
// on the Playbook's own SVG board (NorexBoard in playbook.js): pieces, every chalk tool, keyframes with a preview, the quiz editor,
// save a new version (POST /api/plays/:id), publish + send to players (POST /api/plays/:id/publish · /assign). The server validates
// and trims every save (bot/plays.js cleanDoc). Unsaved edits are kept under the live Studio's own draft key (norex_tx_draft_<id>),
// so a draft started on either site can be restored on the other. Also the live Studio's extras: co-editing with other managers
// (GET /api/plays/:id/ws + POST /op, last write wins per piece / chalk stroke / keyframe), recordings (tab-capture video and
// voice-over, POST /api/plays/:id/media?kind=, hide), version history + restore, Share to Discord (the play or a recording, with a
// dry-run preview of the post, drawn here from the same fields bot/plays.js playEmbed sends) and archive.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const A = window.NorexAuth, M = window.NorexMotion;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const post = (path, body) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const toast = (m, kind = 'ok', icon) => M?.toast(m, { kind, ...(icon ? { icon } : {}) });
  const COLORS = [['#c8352c', 'Crest red'], ['#ffffff', 'White'], ['#efcf7a', 'Gold'], ['#3aa0ff', 'Blue'], ['#3ddc84', 'Green'], ['#ff9f1c', 'Orange'], ['#b388ff', 'Purple'], ['#111111', 'Black']];
  const WIDTHS = [[3, 'Thin'], [6, 'Medium'], [10, 'Thick']];
  // chalk tools: [id, icon, label, hint] – the live Studio's set, same ids (they are the document's `kind`)
  const DRAW = [['free', '✏️', 'Pen', 'Draw freehand'], ['line', '╱', 'Line', 'Drag a straight line'], ['dash', '┄', 'Dashed', 'Drag a dashed line'], ['arrow', '➜', 'Arrow', 'Drag an arrow'],
    ['run', '⇢', 'Run', 'Dashed arrow: a player’s run'], ['darrow', '↔', 'Two-way', 'Arrow with a head at both ends'], ['curve', '↷', 'Curve', 'A pass or run that bends'], ['circle', '◯', 'Circle', 'Drag from the centre out'],
    ['rect', '▭', 'Zone', 'Drag a box over an area'], ['dot', '●', 'Dot', 'Tap to drop a marker'], ['text', '🔤', 'Text', 'Type the words below, then tap the board'], ['erase', '🧽', 'Eraser', 'Drag over chalk to rub it out']];
  const PIECES = [['us', '🔴', 'Us', 'N'], ['opp', '⚪', 'Opponent', 'O'], ['ball', '⚽', 'Ball', ''], ['cone', '🔶', 'Cone', ''], ['joker', '🟡', 'Joker', 'J']];
  const CAT = { 'set-piece': ['🎯', 'Set piece'], formation: ['🧩', 'Formation'], drill: ['🏃', 'Drill'] };
  const LIMIT = { pieces: 60, drawings: 150, steps: 60, quiz: 20 };
  const uid = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '').slice(0, 8);
  const norm = (x) => ({ pieces: Array.isArray(x?.pieces) ? x.pieces : [], steps: Array.isArray(x?.steps) ? x.steps : [], drawings: Array.isArray(x?.drawings) ? x.drawings : [], quiz: Array.isArray(x?.quiz) ? x.quiz : [] });
  const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  let S = null; // the open editor
  const B = () => window.NorexBoard;
  const sig = () => JSON.stringify(S.doc);
  const dirty = () => !!S && (sig() !== S.saved || S.title !== S.play.title || S.cat !== S.play.category);
  const draftKey = () => `norex_tx_draft_${S.id}`;
  const keepDraft = () => { if (!S) return; sig() !== S.saved ? ls.set(draftKey(), { base: S.play.version, at: Date.now(), doc: S.doc }) : ls.set(draftKey(), null); };
  const snap = () => { S.undo.push(sig()); if (S.undo.length > 60) S.undo.shift(); S.redo = []; };
  const step = (from, to) => { if (!from.length) return; to.push(sig()); S.doc = norm(JSON.parse(from.pop())); if (S.sel && !S.doc.pieces.some((p) => p.id === S.sel)) S.sel = null; changed(); };
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

  const myId = () => String(A.session?.u ?? '');
  const sub = (btn, job, burst = false) => (M && btn ? M.submit(btn, job, { burst }) : job());
  // two taps for anything that can't be undone here: the first arms it for 4 s
  const arm = (k, repaint) => { if (S.confirm === k) { S.confirm = null; return true; } S.confirm = k; repaint(); setTimeout(() => { if (S?.confirm === k) { S.confirm = null; repaint(); } }, 4000); return false; };
  const liveHtml = () => { const L = S.live, now = Date.now(), peers = [...S.peers.values()].filter((x) => now - x.at < 120e3).map((x) => x.n);
    return L.on ? `<b class="on" title="Other managers editing this play see your changes as you make them">● Live</b>${peers.length ? ` · ✏️ ${esc(peers.slice(0, 3).join(', '))}${peers.length > 3 ? ` +${peers.length - 3}` : ''}` : ''}`
      : L.down ? '<b title="Live editing is off: your edits are only seen once you save">○ Solo</b>' : '<b>◌ Connecting…</b>'; };
  const paintLive = () => { const x = S && $('[data-stlive]', S.el); if (x) x.innerHTML = liveHtml(); };

  // ================= render =================
  const toolBtn = (id, ic, label, hint) => `<button type="button" class="st-t${S.tool === id ? ' on' : ''}" data-sttool="${id}" aria-pressed="${S.tool === id}" title="${esc(hint || label)}"><span aria-hidden="true">${ic}</span>${esc(label)}</button>`;
  const headHtml = () => { const p = S.play, [ci] = CAT[S.cat] || ['📋'];
    return `<a class="pb-back" href="#" data-stback>← ${dirty() ? 'Close the Studio' : 'Back to the play'}</a>
<div class="panel st-head"><span class="pb-ci big" aria-hidden="true">${ci}</span><div class="st-meta"><div class="eyebrow">✏️ Studio · v${p.version}${p.published ? ' · <span class="pb-st got">🟢 Published</span>' : ' · <span class="pill s">DRAFT</span>'} · <span class="st-live" data-stlive>${liveHtml()}</span></div>
<input class="st-title" data-stfield="title" value="${esc(S.title)}" maxlength="80" aria-label="Play title" placeholder="Play title"><select class="st-cat" data-stfield="cat" aria-label="Category">${Object.entries(CAT).map(([k, [i, l]]) => `<option value="${k}"${k === S.cat ? ' selected' : ''}>${i} ${l}</option>`).join('')}</select></div>
<div class="st-acts"><span class="st-dirty" data-stdirty aria-live="polite">${dirty() ? '● Unsaved changes' : '✓ All saved'}</span><button type="button" class="btn ghost" data-stundo${S.undo.length ? '' : ' disabled'} title="Undo (Ctrl+Z)">↶ Undo</button><button type="button" class="btn ghost" data-stredo${S.redo.length ? '' : ' disabled'} title="Redo (Ctrl+Y)">↷ Redo</button><button type="button" class="btn ${p.published ? 'gold' : 'ghost'}" data-stsave title="Save a new version (Ctrl+S)">💾 Save</button>${p.published ? '' : '<button type="button" class="btn gold" data-stpub>🚀 Save &amp; publish</button>'}</div>
${S.draft ? `<div class="st-restore"><span>♻️ Unsaved edits from ${esc(ago(S.draft.at))} were found${S.draft.base !== p.version ? ' (the play has a newer version since: saving them replaces it)' : ''}.</span><button type="button" class="btn gold" data-strestore>Restore them</button><button type="button" class="btn ghost" data-stdrop>Discard</button></div>` : ''}</div>`; };
  const toolsHtml = () => `<div class="st-tools" role="toolbar" aria-label="Studio tools">
<div class="st-g"><small>Pieces</small><div class="st-row">${toolBtn('move', '✋', 'Move', 'Drag pieces. Tap one to select it')}${PIECES.map(([t, ic, l]) => toolBtn('add:' + t, ic, '＋ ' + l, `Tap the board to place a ${l.toLowerCase()}`)).join('')}</div></div>
<div class="st-g"><small>Chalk</small><div class="st-row">${DRAW.map(([id, ic, l, h]) => toolBtn(id, ic, l, h)).join('')}</div></div>
<div class="st-g"><small>Style</small><div class="st-row"><span class="st-sw">${COLORS.map(([c, n]) => `<button type="button" class="st-c${S.color === c ? ' on' : ''}" style="--c:${c}" data-stcolor="${c}" aria-label="${n}" aria-pressed="${S.color === c}"></button>`).join('')}</span>${WIDTHS.map(([w, l]) => `<button type="button" class="st-t${S.w === w ? ' on' : ''}" data-stw="${w}" aria-pressed="${S.w === w}"><i class="st-wl" style="--w:${w / 2 + 1}px"></i>${l}</button>`).join('')}<button type="button" class="st-t${S.fill ? ' on' : ''}" data-stfill aria-pressed="${S.fill}" title="Fill circles and zones">◼ Fill</button><button type="button" class="st-t" data-stbend title="Which way curves bend">${S.bend === 1 ? '↰ Bend left' : '↱ Bend right'}</button></div></div></div>`;
  const ctxHtml = () => { const sel = S.sel && S.doc.pieces.find((p) => p.id === S.sel), hint = (DRAW.find((t) => t[0] === S.tool) || [])[3] || (S.tool === 'move' ? 'Drag pieces around. Tap one to select it.' : `Tap the board to place it. ${S.doc.pieces.length}/${LIMIT.pieces} pieces.`);
    return `<div class="st-ctx"><span class="small muted st-hint">💡 ${esc(hint)}</span>${S.tool === 'text' ? `<input class="st-txt" data-stfield="text" value="${esc(S.text)}" maxlength="40" placeholder="Words to chalk" aria-label="Text to place">` : ''}
${sel ? `<span class="st-sel"><b>${sel.team === 'ball' ? '⚽ Ball' : sel.team === 'cone' ? '🔶 Cone' : 'Selected'}</b>${['us', 'opp', 'joker'].includes(sel.team) ? `<input data-stfield="label" value="${esc(sel.label || '')}" maxlength="5" aria-label="Piece label" placeholder="Label">` : ''}<button type="button" class="btn ghost" data-stdup>⧉ Copy</button><button type="button" class="btn ghost st-del" data-strm>🗑 Remove</button></span>` : ''}
<span class="st-end">${S.doc.drawings.length ? `<button type="button" class="btn ghost${S.confirm === 'chalk' ? ' st-del' : ''}" data-stclear>${S.confirm === 'chalk' ? 'Tap again to clear' : '🧽 Clear chalk'}</button>` : ''}<button type="button" class="btn ghost" data-stvert aria-pressed="${B().vert}">${B().vert ? '↔ Wide' : '↕ Tall'}</button></span></div>`; };
  const kfHtml = () => { const st = S.doc.steps, next = st.length ? Math.min(60, Math.max(...st.map((x) => x.at)) / 1000 + 2) : 0;
    return `<div class="panel" id="st-kf"><div class="eyebrow">⏱️ Keyframes · ${st.length}</div><p class="small muted" style="margin:6px 0 10px">Set the pieces, capture, move them, capture again. The play slides between keyframes.</p>
${st.length ? `<div class="pb-kfs">${st.map((x, i) => `<div class="st-kf"><button type="button" class="pb-kf" data-stkf="${i}" title="Put the pieces where they are at ${(x.at / 1000).toFixed(1)} s"><b>Move ${i + 1}</b><small class="num">${(x.at / 1000).toFixed(1)} s</small></button><button type="button" class="st-x" data-stkfdel="${i}" aria-label="Delete keyframe at ${(x.at / 1000).toFixed(1)} s">×</button></div>`).join('')}</div>` : '<p class="small muted">None yet: this saves as a still board.</p>'}
<div class="st-kfadd"><label class="small">At <input type="number" data-stfield="kft" min="0" max="60" step="0.5" value="${S.kft ?? next}" aria-label="Keyframe time in seconds"> s</label><button type="button" class="btn gold" data-stkfadd${st.length >= LIMIT.steps ? ' disabled' : ''}>📸 Capture</button>${st.length ? `<button type="button" class="btn ghost" data-stprev aria-pressed="${!!S.anim}">${S.anim ? '⏹ Stop' : '▶ Preview'}</button>` : ''}</div></div>`; };
  const quizHtml = () => { const q = S.doc.quiz;
    return `<div class="panel" id="st-quiz"><div class="eyebrow">🧠 Quiz · ${q.length}</div><p class="small muted" style="margin:6px 0 10px">Tick the right answer for each question. Players who get every one right have the play ticked as learned.</p>
${q.map((x, i) => `<div class="st-q" data-stq="${i}"><div class="st-qh"><span class="num">${i + 1}</span><input data-stqf="q" value="${esc(x.q)}" maxlength="200" placeholder="Question" aria-label="Question ${i + 1}"><button type="button" class="st-x" data-stqdel aria-label="Delete question ${i + 1}">×</button></div>
<div class="st-qo">${x.options.map((o, j) => `<label class="st-opt${x.answer === j ? ' ok' : ''}"><input type="radio" name="stq${i}" data-stqa="${j}"${x.answer === j ? ' checked' : ''} aria-label="Option ${j + 1} is the right answer"><input data-stqo="${j}" value="${esc(o)}" maxlength="80" placeholder="Option ${j + 1}" aria-label="Option ${j + 1}">${x.options.length > 2 ? `<button type="button" class="st-x" data-stqodel="${j}" aria-label="Remove option ${j + 1}">×</button>` : ''}</label>`).join('')}</div>
${x.options.length < 6 ? '<button type="button" class="btn ghost st-sm" data-stqoadd>＋ Option</button>' : ''}</div>`).join('')}
${q.length < LIMIT.quiz ? '<button type="button" class="btn ghost" data-stqadd>＋ Add a question</button>' : ''}</div>`; };
  const pubHtml = () => { const p = S.play, done = new Map((p.assigned || []).map((a) => [String(a.user_id), a])), users = S.users;
    const list = users ? Object.entries(users).filter(([id]) => id !== 'undefined').sort((a, b) => (done.has(a[0]) - done.has(b[0])) || String(a[1].n || '').localeCompare(String(b[1].n || ''))) : [];
    const n = [...S.pick].filter((u) => !done.has(u)).length;
    return `<div class="panel" id="st-pub"><div class="eyebrow">${p.published ? '📨 Send to players' : '🚀 Publish + send'}</div><p class="small muted" style="margin:6px 0 10px">${p.published ? 'Members can already study it. Pick players to add it to their “To learn” list: each gets an alert.' : 'Publishing shows it to every member. Pick players to assign it to: each gets an alert.'}</p>
${users === null ? '<p class="small muted">Loading the squad…</p>' : users === false ? '<p class="small muted">Could not load the squad list. You can still publish.</p>' : `<div class="st-pk"><button type="button" class="chip" data-stpkall>All</button><button type="button" class="chip" data-stpknone>None</button><small class="muted num">${done.size} already have it</small></div>
<ul class="st-ppl">${list.map(([id, u]) => { const a = done.get(id), c = S.claims?.[id]; return `<li><label class="${a ? 'has' : ''}"><input type="checkbox" data-stpk="${esc(id)}"${a || S.pick.has(id) ? ' checked' : ''}${a ? ' disabled' : ''}>${u.a ? `<img src="${esc(u.a)}" alt="" loading="lazy">` : '<i class="st-av">👤</i>'}<span><b>${esc(u.n || 'Member')}</b><small class="muted">${a ? (a.learned ? '✅ learned' : '📌 assigned') : c?.status === 'approved' ? esc(c.playerName || '') : 'no linked player'}</small></span></label></li>`; }).join('')}</ul>`}
<div class="st-pa">${p.published ? `<button type="button" class="btn gold" data-stsend${n ? '' : ' disabled'}>📨 Send to ${n} player${n === 1 ? '' : 's'}</button><button type="button" class="btn ghost${S.confirm === 'unpub' ? ' st-del' : ''}" data-stunpub>${S.confirm === 'unpub' ? 'Tap again: hide it from members' : '🙈 Unpublish'}</button>` : `<button type="button" class="btn gold" data-stpub>🚀 Save, publish${n ? ` + send to ${n}` : ''}</button>`}</div></div>`; };
  const boardHtml = () => B().svg(S.doc, { edit: true, sel: S.sel, title: S.title });
  const countsHtml = () => `<span>👥 <b class="num">${S.doc.pieces.length}</b>/${LIMIT.pieces} pieces</span><span>🖍️ <b class="num">${S.doc.drawings.length}</b>/${LIMIT.drawings} chalk</span><span>⏱️ <b class="num">${S.doc.steps.length}</b> keyframes</span><span>🧠 <b class="num">${S.doc.quiz.length}</b> questions</span>`;
  const html = () => `${headHtml()}<div class="pb-view st-view"><div class="panel pb-stage st-stage">${toolsHtml()}<div data-stctx>${ctxHtml()}</div><div class="pb-board st-board${B().vert ? ' vert' : ''}" id="st-board">${boardHtml()}</div><div class="st-counts tiny muted" data-stcounts>${countsHtml()}</div></div>
<aside class="pb-side">${kfHtml()}${quizHtml()}${pubHtml()}${mediaHtml()}${shareHtml()}${verHtml()}${archHtml()}</aside></div>`;

  // ---- the extra side panels: recordings, Share to Discord (+ preview), versions, archive ----
  const mb = (b) => (b < 1e6 ? `${Math.max(1, Math.round(b / 1e3))} KB` : `${(b / 1e6).toFixed(b < 1e7 ? 1 : 0)} MB`);
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const REC = { video: ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'], voice: ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'] };
  const REC_MAX = { video: 60e6, voice: 10e6 }, REC_SECS = { video: 120, voice: 300 }, REC_COUNT = 6, ATTACH_MAX = 25e6; // bot/playmedia.js caps
  const canRec = (k) => !!window.MediaRecorder && !!(k === 'video' ? navigator.mediaDevices?.getDisplayMedia : navigator.mediaDevices?.getUserMedia);
  const mediaHtml = () => { const m = S.media, r = S.rec, up = S.upload, full = (m || []).length >= REC_COUNT, pub = S.play.published;
    const row = (x) => { const v = x.kind === 'video', hk = 'hide:' + x.id;
      return `<li><span class="pb-mi" aria-hidden="true">${v ? '🎬' : '🎙️'}</span><div><b>${v ? 'Video walkthrough' : 'Voice-over'}</b><small class="muted">${esc(new Date(x.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))} · ${mb(x.size)}</small></div>
<span class="st-ma"><button type="button" class="btn ghost" data-stwatch="${esc(x.id)}">${v ? '▶ Watch' : '🔊 Listen'}</button>${pub ? `<button type="button" class="btn ghost" data-stshare="${esc(x.id)}">📣 Discord</button>` : ''}<button type="button" class="btn ghost${S.confirm === hk ? ' st-del' : ''}" data-sthide="${esc(x.id)}">${S.confirm === hk ? 'Tap again: hide it' : '🙈 Hide'}</button></span></li>`; };
    const bar = r ? `<div class="st-rec" role="status"><i class="st-recdot" aria-hidden="true"></i><b>${r.kind === 'video' ? 'Recording the board' : 'Recording a voice-over'}</b><span class="num" data-strect>${clock(Math.floor((Date.now() - r.t0) / 1000))}</span><small class="muted">max ${clock(REC_SECS[r.kind])}</small><button type="button" class="btn st-del" data-strecstop>■ Stop</button></div>`
      : up ? `<p class="small st-up" role="status">⏫ Uploading the ${up.kind === 'video' ? 'video' : 'voice-over'} (${mb(up.size)})…</p>`
      : full ? `<p class="small muted">A play holds ${REC_COUNT} recordings. Hide one to record another.</p>`
      : `<div class="st-pa">${canRec('video') ? '<button type="button" class="btn gold" data-strec="video">🎥 Record the board</button>' : ''}${canRec('voice') ? '<button type="button" class="btn ghost" data-strec="voice">🎙️ Record a voice-over</button>' : ''}</div>
${S.doc.steps.length ? `<label class="st-chk small"><input type="checkbox" data-strecplay${S.recPlay ? ' checked' : ''}> ▶ Play the keyframes while recording</label>` : ''}
<p class="tiny muted">${canRec('video') ? 'For a video, pick <b>this tab</b> when the browser asks. ' : 'Video recording needs a computer browser (Chrome, Edge or Firefox). '}Videos up to ${clock(REC_SECS.video)}, voice-overs up to ${clock(REC_SECS.voice)}.</p>`;
    return `<div class="panel" id="st-media"><div class="eyebrow">🎬 Recordings${m?.length ? ` · ${m.length}` : ''}</div><p class="small muted" style="margin:6px 0 10px">Film the board or talk it through. Members watch them on the play.</p>
${m === null ? '<p class="small muted">Loading…</p>' : m.length ? `<ul class="pb-md st-md">${m.map(row).join('')}</ul>` : '<p class="small muted">None yet.</p>'}<div class="pb-player" id="st-player"></div>${bar}</div>`; };
  const ICON = { 'set-piece': '⚽', formation: '🧩', drill: '🏃' }; // bot/plays.js CAT_ICON: the post's title icon
  const s1 = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const fileOf = (x) => `${S.play.title.replace(/[^\w-]+/g, '-').slice(0, 40) || 'play'}.${x.type?.includes('mp4') ? (x.kind === 'video' ? 'mp4' : 'm4a') : 'webm'}`;
  // what Discord will show – the same title, description, buttons and ping as bot/plays.js playEmbed / bot/playmedia.js shareMedia
  const dcPrev = (sh) => { const p = S.play, doc = norm(p.doc), t = sh.t, x = sh.mode === 'play' ? null : (S.media || []).find((y) => y.id === sh.mode);
    const role = sh.role && t.roles.find((y) => y.id === sh.role), ping = role ? (role.name === '@everyone' ? '@everyone' : '@' + role.name.replace(/^@/, '')) : '';
    const big = x && x.size > ATTACH_MAX, bits = [s1(doc.pieces.length, 'piece'), doc.steps.length ? s1(doc.steps.length, 'keyframe') : '', doc.quiz.length ? `${doc.quiz.length}-question quiz` : ''].filter(Boolean);
    const title = x ? `${x.kind === 'video' ? '🎬 Video' : '🎙 Voice-over'} · ${p.title}` : `${ICON[p.category] || '📋'} ${p.title}`;
    const desc = x ? (big ? `Too big to attach (${Math.round(x.size / 1e6)} MB) – watch it in the Studio.` : '') : bits.join(' · ') || 'A new play in the Tactics Studio.';
    return `<div class="dc-prev" aria-label="Preview of the Discord post"><div class="dc-who"><img src="crest.png" alt=""><b>NOREX UNITED</b><span class="dc-bot">APP</span><small>Today</small></div>
${ping ? `<p class="dc-ping">${esc(ping)}</p>` : ''}<div class="dc-emb"><b class="dc-t">${esc(title.slice(0, 250))}</b>${desc ? `<p>${esc(desc)}</p>` : ''}<small>NOREX UNITED · Tactics Studio${x ? '' : ' • Today'}</small></div>
${x && !big ? `<div class="dc-att">📎 ${esc(fileOf(x))} <small>${mb(x.size)}</small></div>` : ''}<div class="dc-btns">${x ? '' : '<span class="dc-b ok">✅ Learned it</span>'}<span class="dc-b">▶ Open in Studio ↗</span></div></div>`; };
  const shareHtml = () => { const p = S.play, sh = S.share, t = sh?.t;
    const body = !p.published ? '<p class="small muted" style="margin:6px 0 0">Publish the play first. Then post it to a channel with a ✅ Learned it button (the same tick as the site).</p>'
      : !sh ? `<p class="small muted" style="margin:6px 0 10px">Posts a card with ✅ Learned it and ▶ Open in Studio buttons.${p.discord ? ' Already shared once: this posts it again.' : ''}</p><button type="button" class="btn gold" data-stshare="play">📣 Share the play</button>${S.media?.length ? '<p class="tiny muted" style="margin:8px 0 0">To post a recording, use 📣 Discord on it above.</p>' : ''}`
      : t === null ? '<p class="small muted" style="margin:6px 0 0">Loading channels…</p>'
      : !t.ready ? `<p class="small" style="margin:6px 0 10px">⚠️ ${esc(t.error || 'Discord is not connected.')}</p><button type="button" class="btn ghost" data-stdcx>Close</button>`
      : `<p class="small muted" style="margin:6px 0 10px">${sh.mode === 'play' ? `Posts the saved version (v${p.version}).${dirty() ? ' <b>Your unsaved edits are not in it: save first.</b>' : ''}` : 'Up to 25 MB the file is attached so the squad can watch in Discord; bigger ones post a card linking to the Studio.'}</p>
<div class="st-dc"><label class="small">Channel<select data-stdc="channel">${t.channels.map((c) => `<option value="${esc(c.id)}"${c.id === sh.channel ? ' selected' : ''}>${c.news ? '📢' : '#'} ${esc(c.name)}</option>`).join('')}</select></label>
<label class="small">Ping<select data-stdc="role"><option value="">Nobody</option>${t.roles.map((r) => `<option value="${esc(r.id)}"${r.id === sh.role ? ' selected' : ''}>${esc(r.name.startsWith('@') ? r.name : '@' + r.name)}</option>`).join('')}</select></label></div>
<div class="eyebrow tiny" style="margin:12px 0 6px">👀 Preview · nothing is sent yet</div>${dcPrev(sh)}<div class="st-pa" style="margin-top:12px"><button type="button" class="btn gold" data-stdcgo${sh.channel ? '' : ' disabled'}>📣 Post it</button><button type="button" class="btn ghost" data-stdcx>Cancel</button></div>`;
    return `<div class="panel" id="st-share"><div class="eyebrow">📣 Share to Discord${sh && sh.mode !== 'play' ? ' · recording' : ''}</div>${body}</div>`; };
  const who = (u) => (String(u) === myId() ? 'you' : S.users?.[u]?.n || 'a manager');
  const verHtml = () => { const vs = S.play.versions || [], cur = S.play.version;
    return `<div class="panel" id="st-ver"><div class="eyebrow">🕘 Versions · ${vs.length}</div><p class="small muted" style="margin:6px 0 10px">Every save is kept (the last 20). Restoring copies an old one as a new version, so nothing is lost.</p>
${vs.length ? `<ul class="st-vers">${vs.map((v) => { const k = 'v' + v.version; return `<li${v.version === cur ? ' class="cur"' : ''}><b class="num">v${v.version}</b><small class="muted">${esc(ago(v.at))} · ${esc(who(v.by))}</small>${v.version === cur ? '<span class="pill">Current</span>' : `<button type="button" class="btn ghost st-sm${S.confirm === k ? ' st-del' : ''}" data-stver="${v.version}">${S.confirm === k ? (dirty() ? 'Tap again: replaces unsaved edits' : 'Tap again to restore') : '↩ Restore'}</button>`}</li>`; }).join('')}</ul>` : '<p class="small muted">No saved versions yet.</p>'}</div>`; };
  const archHtml = () => `<div class="panel" id="st-arch"><div class="eyebrow">🗄️ Archive</div><p class="small muted" style="margin:6px 0 10px">Takes the play off the Playbook for everyone. Its versions and recordings are kept: nothing is deleted.</p><button type="button" class="btn ghost st-del" data-starch>${S.confirm === 'arch' ? 'Tap again: archive it' : '🗄️ Archive this play'}</button></div>`;

  // partial repaints keep focus in the field being typed in
  const swap = (id, h) => { const o = $('#' + id, S.el); if (o) o.outerHTML = h; };
  const paintHead = () => { const h = $('.st-head', S.el); if (h) { const w = d.createElement('div'); w.innerHTML = headHtml(); S.el.querySelector('[data-stback]').replaceWith(w.firstElementChild); h.replaceWith(w.lastElementChild); } };
  const paintDirty = () => { const x = $('[data-stdirty]', S.el); if (x) x.textContent = dirty() ? '● Unsaved changes' : '✓ All saved'; const u = $('[data-stundo]', S.el), r = $('[data-stredo]', S.el); if (u) u.disabled = !S.undo.length; if (r) r.disabled = !S.redo.length; const bk = $('[data-stback]', S.el); if (bk) bk.textContent = `← ${dirty() ? 'Close the Studio' : 'Back to the play'}`; };
  const paintBoard = () => { const b = $('#st-board', S.el); if (b) { b.classList.toggle('vert', B().vert); b.innerHTML = boardHtml(); } const c = $('[data-stcounts]', S.el); if (c) c.innerHTML = countsHtml(); };
  const paintCtx = () => { const c = $('[data-stctx]', S.el); if (c) c.innerHTML = ctxHtml(); };
  const paintTools = () => { const t = $('.st-tools', S.el); if (t) t.outerHTML = toolsHtml(); paintCtx(); };
  const paint = () => { S.el.innerHTML = html(); };
  // after any edit to the document: board, counts, side panels that show it, dirty marker, the saved draft
  function changed({ kf = true, quiz = false } = {}) { paintBoard(); paintCtx(); if (kf) swap('st-kf', kfHtml()); if (quiz) swap('st-quiz', quizHtml()); paintDirty(); keepDraft(); sync(); }

  // ================= board gestures =================
  const svgOf = () => $('#st-board svg', S.el);
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / l2)) : 0; return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy)); };
  function hit(dw, pt) { // the live Studio's eraser hit test
    const R = 22 + (dw.w || 6), P = dw.points, k = dw.kind || 'free';
    if (k === 'dot') return Math.hypot(pt.x - P[0][0], pt.y - P[0][1]) < R + 10;
    if (k === 'text') return Math.abs(pt.x - P[0][0]) < 20 + (dw.text || '').length * 14 && Math.abs(pt.y - P[0][1]) < 30;
    if (k === 'circle') { const r = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), dd = Math.hypot(pt.x - P[0][0], pt.y - P[0][1]); return dw.fill ? dd <= r + R / 2 : Math.abs(dd - r) < R; }
    if (k === 'rect') { const x0 = Math.min(P[0][0], P[1][0]), x1 = Math.max(P[0][0], P[1][0]), y0 = Math.min(P[0][1], P[1][1]), y1 = Math.max(P[0][1], P[1][1]), inBox = (m) => pt.x >= x0 - m && pt.x <= x1 + m && pt.y >= y0 - m && pt.y <= y1 + m;
      return dw.fill ? inBox(R / 2) : inBox(R) && !(pt.x > x0 + R && pt.x < x1 - R && pt.y > y0 + R && pt.y < y1 - R); }
    if (k === 'curve') { const [a, b] = P, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, bend = (dw.bend === -1 ? -1 : 1) * 0.28 * len, c = [(a[0] + b[0]) / 2 - (dy / len) * bend, (a[1] + b[1]) / 2 + (dx / len) * bend]; return segDist(pt, a, c) < R || segDist(pt, c, b) < R; }
    for (let i = 0; i < P.length - 1; i++) if (segDist(pt, P[i], P[i + 1]) < R) return true;
    return false;
  }
  const track = (e, onMove, onUp) => { const svg = svgOf(); try { svg.setPointerCapture(e.pointerId); } catch {}
    const mv = (ev) => { if (ev.pointerId === e.pointerId) onMove(ev); }, up = (ev) => { if (ev.pointerId !== e.pointerId) return; svg.removeEventListener('pointermove', mv); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); S.gesture = false; onUp(ev); if (S?.live.pending) remoteRepaint(); };
    S.gesture = true; svg.addEventListener('pointermove', mv); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up); };
  const place = (g, p) => { const [x, y] = B().sp(p.x, p.y); g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`); };
  function down(e) {
    if (!S || S.gesture || e.button > 0) return; const svg = svgOf(); if (!svg || !svg.contains(e.target)) return;
    e.preventDefault(); stopAnim(); const pt = B().toPlay(svg, e), tool = S.tool;
    if (tool === 'move') {
      const g = e.target.closest('[data-pc]'), p = g && S.doc.pieces.find((x) => x.id === g.dataset.pc);
      if (!p) { if (S.sel) { S.sel = null; paintBoard(); paintCtx(); } return; }
      const before = sig(), sx = e.clientX, sy = e.clientY, off = { x: p.x - pt.x, y: p.y - pt.y }; let moved = false, sent = 0;
      track(e, (ev) => { const q = B().toPlay(svg, ev); if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return; moved = true; p.x = Math.max(0, Math.min(1000, q.x + off.x)); p.y = Math.max(0, Math.min(640, q.y + off.y)); place(g, p); if (S.live.on && performance.now() - sent > 150) { sent = performance.now(); sendOp(pieceOp(p), 'p:' + p.id); } },
        () => { if (moved) { S.undo.push(before); S.redo = []; S.sel = p.id; changed({ kf: false }); } else { S.sel = S.sel === p.id ? null : p.id; paintBoard(); paintCtx(); } });
      return; }
    if (tool.startsWith('add:')) {
      if (S.doc.pieces.length >= LIMIT.pieces) return toast(`Up to ${LIMIT.pieces} pieces on one board`, 'err');
      const [team, , , lab] = PIECES.find((x) => 'add:' + x[0] === tool); snap();
      const p = { id: uid(), team, x: pt.x, y: pt.y, ...(lab ? { label: lab } : {}) }; S.doc.pieces.push(p); S.sel = p.id; changed({ kf: false }); return; }
    const base = { id: uid(), color: S.color, ...(S.w !== 6 ? { w: S.w } : {}) };
    const commit = (dw) => { snap(); S.doc.drawings.push(dw); if (S.doc.drawings.length > LIMIT.drawings) { S.doc.drawings.shift(); toast(`Chalk is capped at ${LIMIT.drawings}: the oldest line was rubbed out`, '', '🧽'); } changed({ kf: false }); };
    if (tool === 'dot') return commit({ ...base, kind: 'dot', points: [[pt.x, pt.y]] });
    if (tool === 'text') { const t = S.text.trim(); if (!t) { toast('Type the words first, then tap the board', 'err'); $('.st-txt', S.el)?.focus(); return; } return commit({ ...base, kind: 'text', points: [[pt.x, pt.y]], text: t }); }
    if (tool === 'erase') { let snapped = false; const rub = (q) => { for (let i = S.doc.drawings.length - 1; i >= 0; i--) if (hit(S.doc.drawings[i], q)) { if (!snapped) { snap(); snapped = true; } S.doc.drawings.splice(i, 1); const c = $('.pb-chalk', svg); if (c) c.innerHTML = S.doc.drawings.map(B().shape).join(''); return; } };
      rub(pt); track(e, (ev) => rub(B().toPlay(svg, ev)), () => { if (snapped) changed({ kf: false }); }); return; }
    const prev = $('[data-prev]', svg), pts = [[pt.x, pt.y]]; let end = null;
    const shape = (b) => ({ ...base, kind: tool, points: [pts[0], b], ...(S.fill && (tool === 'circle' || tool === 'rect') ? { fill: true } : {}), ...(tool === 'curve' && S.bend === -1 ? { bend: -1 } : {}) });
    track(e, (ev) => { const q = B().toPlay(svg, ev);
      if (tool === 'free') { const l = pts[pts.length - 1]; if (pts.length < 60 && Math.hypot(q.x - l[0], q.y - l[1]) > 7) pts.push([q.x, q.y]); prev.innerHTML = B().shape({ ...base, points: pts }); }
      else { end = [q.x, q.y]; prev.innerHTML = B().shape(shape(end)); } },
    () => { prev.innerHTML = '';
      if (tool === 'free') { if (pts.length >= 2) commit({ ...base, points: pts }); }
      else if (end && Math.hypot(end[0] - pts[0][0], end[1] - pts[0][1]) > 14) commit(shape(end)); });
  }

  // ================= keyframe preview =================
  function stopAnim() { if (!S?.anim) return; cancelAnimationFrame(S.anim.raf); S.anim = null; paintBoard(); const b = $('[data-stprev]', S.el); if (b) { b.textContent = '▶ Preview'; b.setAttribute('aria-pressed', 'false'); } }
  function preview(btn) { if (S.anim) return stopAnim(); const fr = B().framesOf(S.doc), dur = fr.length ? fr[fr.length - 1].at : 0; if (!dur) return;
    S.sel = null; paintBoard(); btn.textContent = '⏹ Stop'; btn.setAttribute('aria-pressed', 'true');
    if (M?.off()) { const pos = fr[fr.length - 1].pieces; $$('[data-pc]', svgOf()).forEach((g) => pos[g.dataset.pc] && place(g, pos[g.dataset.pc])); S.anim = { raf: 0 }; return; }
    const t0 = performance.now(); S.anim = { raf: 0 };
    const tick = (now) => { if (!S?.anim) return; const t = Math.min(dur, now - t0), pos = B().posAt(t, fr); $$('[data-pc]', svgOf()).forEach((g) => pos[g.dataset.pc] && place(g, pos[g.dataset.pc])); if (t < dur) S.anim.raf = requestAnimationFrame(tick); else setTimeout(stopAnim, 700); };
    S.anim.raf = requestAnimationFrame(tick); }

  // ================= live co-editing (room studio:<id>, the live Studio's protocol) =================
  // A local edit goes up as small ops (POST /api/plays/:id/op); the Worker stamps who sent it and when and relays it to every
  // manager on GET /api/plays/:id/ws. Last write wins per piece, chalk stroke and keyframe (web/tactics.js): a local change stamps
  // its key with this device's clock, a remote one with the server's; ties go to the larger member id. Ops only go up while the
  // socket is open (nobody else could hear them otherwise). Saving is still the only thing that makes a version.
  const API = window.NOREX_API || '';
  const wins = (key, at, by) => { const cur = S.lww.get(key); return !cur || at > cur.at || (at === cur.at && String(by) > String(cur.by)); };
  const stamp = (key, at, by) => S.lww.set(key, { at, by });
  const pieceOp = (p) => ({ k: 'piece', id: p.id, team: p.team, x: p.x, y: p.y, ...(p.label ? { label: p.label } : {}) });
  function sendOp(op, key) { if (key) stamp(key, Date.now(), myId()); if (!S.live.on) return; const id = S.id;
    post(`/api/plays/${id}/op`, { op }).catch((x) => { if (S?.id === id && (x.status === 503 || /not set up/i.test(x.message))) { S.live.down = true; S.live.on = false; paintLive(); } }); }
  // what changed since the last sync → ops (pieces, chalk, keyframes; the quiz is only shared by saving, as on the live Studio)
  function sync() { if (!S) return; const a = S.synced, b = S.doc; S.synced = structuredClone(b);
    const pa = new Map(a.pieces.map((x) => [x.id, x])), pb = new Map(b.pieces.map((x) => [x.id, x]));
    for (const [id, p] of pb) { const o = pa.get(id); if (!o || o.x !== p.x || o.y !== p.y || o.team !== p.team || o.label !== p.label) sendOp(pieceOp(p), 'p:' + id); }
    for (const id of pa.keys()) if (!pb.has(id)) sendOp({ k: 'pieceDel', id }, 'p:' + id);
    const da = new Map(a.drawings.map((x) => [x.id, x])), db = new Map(b.drawings.map((x) => [x.id, x]));
    if (!db.size && da.size > 1) sendOp({ k: 'chalkClear' }, 'chalk'); else for (const id of da.keys()) if (!db.has(id)) sendOp({ k: 'strokeDel', sid: id }, 's:' + id);
    for (const [id, dw] of db) if (JSON.stringify(da.get(id)) !== JSON.stringify(dw)) sendOp({ k: 'stroke', sid: id, d: dw }, 's:' + id);
    const ka = new Map(a.steps.map((x) => [x.at, x])), kb = new Map(b.steps.map((x) => [x.at, x]));
    for (const [at, st] of kb) if (JSON.stringify(ka.get(at)?.pieces) !== JSON.stringify(st.pieces)) sendOp({ k: 'key', at, pieces: st.pieces }, 'k:' + at);
    for (const at of ka.keys()) if (!kb.has(at)) sendOp({ k: 'keyDel', at }, 'k:' + at);
  }
  // one remote op on a document (applied to the board and to the last-synced copy, so it is never echoed back)
  function applyOp(x, op, at) {
    if (op.k === 'chalkClear') { x.drawings = x.drawings.filter((dw) => (S.lww.get('s:' + dw.id)?.at ?? 0) > at); return; }
    if (op.k === 'piece') { const cur = x.pieces.find((p) => p.id === op.id); if (cur) { Object.assign(cur, { team: op.team, x: op.x, y: op.y }); op.label ? (cur.label = op.label) : delete cur.label; } else if (x.pieces.length < LIMIT.pieces) x.pieces.push(pieceOp(op)); return; }
    if (op.k === 'pieceDel') { x.pieces = x.pieces.filter((p) => p.id !== op.id); x.steps.forEach((s) => delete s.pieces[op.id]); return; }
    if (op.k === 'stroke') { const dw = { ...op.d, id: op.sid }, i = x.drawings.findIndex((y) => y.id === op.sid); if (i > -1) x.drawings[i] = dw; else { x.drawings.push(dw); if (x.drawings.length > LIMIT.drawings) x.drawings.shift(); } return; }
    if (op.k === 'strokeDel') { x.drawings = x.drawings.filter((y) => y.id !== op.sid); return; }
    if (op.k === 'key') { const st = { at: op.at, pieces: structuredClone(op.pieces) }, i = x.steps.findIndex((s) => s.at === op.at); if (i > -1) x.steps[i] = st; else x.steps.push(st); x.steps.sort((a, b) => a.at - b.at); return; }
    if (op.k === 'keyDel') x.steps = x.steps.filter((s) => s.at !== op.at);
  }
  function remote(msg) {
    if (!S || msg?.t !== 'studio' || Number(msg.id) !== S.id || !msg.op) return;
    const { op, by, n, at } = msg; if (String(by) === myId()) return; // our own echo
    S.peers.set(String(by), { n: String(n || 'A manager').slice(0, 40), at: Date.now() });
    if (op.k === 'saved') { toast(`${n || 'Another manager'} saved version ${op.version}`, 'ok', '💾'); refetch(); return paintLive(); }
    if (op.k === 'chalkClear') { if (!wins('chalk', at, by)) return; stamp('chalk', at, by); }
    else { const key = op.k.startsWith('piece') ? 'p:' + op.id : op.k.startsWith('stroke') ? 's:' + op.sid : op.k.startsWith('key') ? 'k:' + op.at : '';
      if (!key || !wins(key, at, by) || (op.k.startsWith('stroke') && (S.lww.get('chalk')?.at ?? 0) > at)) return; stamp(key, at, by); }
    applyOp(S.doc, op, at); applyOp(S.synced, op, at);
    if (S.sel && !S.doc.pieces.some((p) => p.id === S.sel)) S.sel = null;
    remoteRepaint();
  }
  // a remote change never redraws under a drag or a field being typed in: it waits for the gesture to end
  function remoteRepaint() { if (!S) return; if (S.gesture) { S.live.pending = true; return; } S.live.pending = false; const ae = d.activeElement;
    paintBoard(); if (!$('[data-stctx]', S.el)?.contains(ae)) paintCtx(); if (!$('#st-kf', S.el)?.contains(ae)) swap('st-kf', kfHtml()); paintDirty(); keepDraft(); paintLive(); }
  // another manager saved: pick up the new version number, history and saved copy (the board already has their edits)
  async function refetch() { const id = S.id; try { const p = await A.call(`/api/plays/${id}`); if (S?.id !== id) return; S.play = p; S.saved = JSON.stringify(norm(p.doc)); paintHead(); paintDirty(); swap('st-ver', verHtml()); swap('st-share', shareHtml()); } catch {} }
  function openLive() { const L = S.live, id = S.id;
    if (!A.token || !API || !window.WebSocket) { L.down = true; return; }
    let sock = null, ping = 0, retry = 0, tries = 0;
    const connect = () => { if (L.closed) return;
      try { sock = new WebSocket(`${API.replace(/^http/, 'ws')}/api/plays/${id}/ws?t=${encodeURIComponent(A.token)}`); } catch { L.down = true; return paintLive(); }
      sock.onopen = () => { tries = 0; L.on = true; L.down = false; paintLive(); clearInterval(ping); ping = setInterval(() => { if (sock.readyState === 1) sock.send('ping'); }, 30000); };
      sock.onmessage = (m) => { if (m.data === 'pong' || S?.live !== L) return; try { remote(JSON.parse(m.data)); } catch { /* not ours */ } };
      sock.onclose = () => { clearInterval(ping); const was = L.on; L.on = false; if (L.closed) return; if (was || tries < 2) { tries++; retry = setTimeout(connect, 8000); } else L.down = true; paintLive(); };
    };
    connect(); L.stop = () => { L.closed = true; L.on = false; clearInterval(ping); clearTimeout(retry); try { sock?.close(); } catch { /* closed */ } };
  }

  // ================= recordings (bot/playmedia.js): tab-capture video and voice-over, uploaded raw =================
  async function loadMedia() { const id = S.id; let m = []; try { m = (await A.call(`/api/plays/${id}/media`)).media || []; } catch { /* panel says none */ } if (S?.id !== id) return; S.media = m; swap('st-media', mediaHtml()); }
  const blobOf = async (mid) => { const r = await fetch(`${API}/api/plays/${S.id}/media/${encodeURIComponent(mid)}`, { headers: { Authorization: 'Bearer ' + A.token }, cache: 'no-store' }); if (!r.ok) throw new Error('Could not load that recording.'); return r.blob(); };
  async function watch(btn) { const x = (S.media || []).find((y) => y.id === btn.dataset.stwatch); if (!x) return;
    try { const b = await sub(btn, () => blobOf(x.id)), box = $('#st-player', S.el); if (!box) return; if (S.mediaUrl) URL.revokeObjectURL(S.mediaUrl); S.mediaUrl = URL.createObjectURL(b);
      box.innerHTML = x.kind === 'video' ? `<video controls playsinline autoplay src="${S.mediaUrl}"></video>` : `<audio controls autoplay src="${S.mediaUrl}"></audio>`; }
    catch (er) { toast(er.message, 'err'); } }
  async function hide(btn) { const mid = btn.dataset.sthide; if (!arm('hide:' + mid, () => swap('st-media', mediaHtml()))) return;
    try { await sub(btn, () => post(`/api/plays/${S.id}/media/${mid}/delete`, {})); S.media = S.media.filter((x) => x.id !== mid); if (S.share?.mode === mid) { S.share = null; swap('st-share', shareHtml()); }
      toast('Hidden from members. The file is kept', 'ok', '🙈'); swap('st-media', mediaHtml()); }
    catch (er) { toast(er.message || 'Could not hide it', 'err'); } }
  async function recStart(kind) {
    if (S.rec || S.upload || !canRec(kind)) return; const id = S.id;
    let stream; try { stream = kind === 'video' ? await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' }) : await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (er) { return toast(er.name === 'NotAllowedError' ? 'Recording was cancelled or blocked' : er.message || 'Could not start recording', 'err'); }
    if (S?.id !== id || S.rec) { stream.getTracks().forEach((t) => t.stop()); return; }
    const mime = REC[kind].find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
    let rec; try { rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), ...(kind === 'video' ? { videoBitsPerSecond: 2.5e6 } : { audioBitsPerSecond: 64e3 }) }); }
    catch (er) { stream.getTracks().forEach((t) => t.stop()); return toast(er.message || 'This browser cannot record that', 'err'); }
    const R = S.rec = { kind, rec, stream, chunks: [], t0: Date.now(), id };
    rec.ondataavailable = (e) => { if (e.data.size) R.chunks.push(e.data); };
    rec.onstop = () => recDone(R);
    stream.getTracks().forEach((t) => t.addEventListener('ended', () => recStop(R)));
    rec.start(1000);
    R.tick = setInterval(() => { const s = Math.floor((Date.now() - R.t0) / 1000), x = S?.rec === R && $('[data-strect]', S.el); if (x) x.textContent = clock(s); if (s >= REC_SECS[kind]) recStop(R); }, 500);
    swap('st-media', mediaHtml());
    if (S.recPlay && S.doc.steps.length) setTimeout(() => { const b = S?.rec === R && $('[data-stprev]', S.el); if (b && !S.anim) preview(b); }, kind === 'video' ? 900 : 300);
  }
  function recStop(R = S?.rec) { if (R && R.rec.state !== 'inactive') R.rec.stop(); }
  // the upload goes on even if the Studio was closed meanwhile (it is tied to the play, not the open editor)
  async function recDone(R) {
    clearInterval(R.tick); R.stream.getTracks().forEach((t) => t.stop());
    const here = () => S?.id === R.id, type = (R.rec.mimeType || R.chunks[0]?.type || REC[R.kind][1]).split(';')[0], blob = new Blob(R.chunks, { type });
    if (S?.rec === R) S.rec = null;
    if (!blob.size) { toast('Nothing was recorded', 'err'); if (here()) swap('st-media', mediaHtml()); return; }
    if (blob.size > REC_MAX[R.kind]) { const a = d.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `play-${R.id}.${type.includes('mp4') ? (R.kind === 'video' ? 'mp4' : 'm4a') : 'webm'}`; d.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(`Too big to upload (${mb(blob.size)}, the limit is ${mb(REC_MAX[R.kind])}). It was saved to this device instead`, 'err'); if (here()) swap('st-media', mediaHtml()); return; }
    if (here()) { S.upload = { kind: R.kind, size: blob.size }; swap('st-media', mediaHtml()); }
    try { const r = await fetch(`${API}/api/plays/${R.id}/media?kind=${R.kind}`, { method: 'POST', headers: { Authorization: 'Bearer ' + A.token, 'Content-Type': type }, body: blob });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `The upload failed (${r.status})`);
      toast(`${R.kind === 'video' ? 'Video' : 'Voice-over'} saved: members can watch it on the play`, 'ok', R.kind === 'video' ? '🎬' : '🎙️'); if (here() && S.media && j.media) S.media.push(j.media); }
    catch (er) { toast(er.message, 'err'); }
    if (here()) { S.upload = null; swap('st-media', mediaHtml()); swap('st-share', shareHtml()); }
  }

  // ================= Share to Discord (the play, or one recording) =================
  let targets = null; // channels + roles, fetched once per page
  async function shareOpen(mode) { stopAnim(); S.share = { mode, t: null, channel: '', role: '' }; swap('st-share', shareHtml()); $('#st-share', S.el)?.scrollIntoView?.({ block: 'nearest', behavior: M?.off() ? 'auto' : 'smooth' });
    try { targets ??= await A.call('/api/plays/discord'); } catch (er) { targets = null; if (S?.share) S.share.t = { ready: false, error: er.message }; return S && swap('st-share', shareHtml()); }
    if (!S?.share) return; const t = targets; S.share.t = t; if (t.ready) S.share.channel = t.channels.some((c) => c.id === t.last) ? t.last : t.channels[0]?.id || ''; swap('st-share', shareHtml()); }
  async function shareGo(btn) { const sh = S.share; if (!sh?.channel) return toast('Pick a channel', 'err'); const body = { channel: sh.channel, role: sh.role || '' };
    try { if (sh.mode === 'play') { const r = await sub(btn, () => post(`/api/plays/${S.id}/discord`, body), true); if (r.ok === false) throw new Error(r.error || 'Discord refused the post'); S.play = r; toast('Posted to Discord with a ✅ Learned it button', 'ok', '📣'); }
      else { const r = await sub(btn, () => post(`/api/plays/${S.id}/media/${sh.mode}/discord`, body), true); toast(r.attached ? 'Sent to Discord with the file attached' : 'Too big to attach: posted a card linking to the Studio', 'ok', '📣'); }
      S.share = null; swap('st-share', shareHtml()); }
    catch (er) { toast(er.message || 'Could not post it', 'err'); } }

  // ================= versions + archive =================
  async function restore(btn) { const v = +btn.dataset.stver; if (!arm('v' + v, () => swap('st-ver', verHtml()))) return; stopAnim();
    try { const p = await sub(btn, () => post(`/api/plays/${S.id}/restore`, { version: v })); snap(); S.play = p; S.doc = norm(structuredClone(p.doc)); S.doc.drawings.forEach((x) => { if (!x.id) x.id = uid(); });
      S.saved = sig(); S.title = p.title; S.cat = p.category; S.sel = null; S.draft = null; ls.set(draftKey(), null);
      paintHead(); swap('st-quiz', quizHtml()); swap('st-pub', pubHtml()); swap('st-ver', verHtml()); swap('st-share', shareHtml()); changed();
      toast(`Version ${v} is back, saved as version ${p.version}`, 'ok', '↩️'); }
    catch (er) { toast(er.message || 'Could not restore it', 'err'); } }
  async function archive(btn) { if (!arm('arch', () => swap('st-arch', archHtml()))) return;
    try { await sub(btn, () => post(`/api/plays/${S.id}/delete`, {})); const { id, onArchive } = S, key = draftKey(); S.saved = sig(); S.title = S.play.title; S.cat = S.play.category; close(false); ls.set(key, null);
      toast('Archived: off the Playbook, history kept', 'ok', '🗄️'); onArchive?.(id); }
    catch (er) { toast(er.message || 'Could not archive it', 'err'); } }

  // ================= save / publish / assign =================
  function quizProblem() { for (const [i, x] of S.doc.quiz.entries()) { if (!x.q.trim()) return `Question ${i + 1} has no text. Fill it in or delete it.`; const e = x.options.findIndex((o) => !String(o).trim()); if (e > -1) return `Question ${i + 1}: option ${e + 1} is empty. Fill it in or remove it.`; } return ''; }
  async function save(btn, { publish = false } = {}) {
    if (S.saving) return; const bad = quizProblem(); if (bad) { toast(bad, 'err'); return; }
    if (!S.title.trim()) { toast('Give the play a title', 'err'); $('.st-title', S.el)?.focus(); return; }
    S.saving = true; stopAnim();
    const ids = [...S.pick].filter((u) => !(S.play.assigned || []).some((a) => String(a.user_id) === u));
    const job = async () => { const sent = S.doc; let p = S.play;
      if (dirty() || publish === false) p = await post(`/api/plays/${S.id}`, { doc: sent, title: S.title.trim(), category: S.cat });
      const got = norm(p.doc), lost = (sent.pieces.length - got.pieces.length) + (sent.drawings.length - got.drawings.length) + (sent.quiz.length - got.quiz.length);
      if (publish) p = await post(`/api/plays/${S.id}/publish`, { published: true, userIds: ids });
      return { p, got, lost }; };
    try { const { p, got, lost } = await (M ? M.submit(btn, job, { burst: publish }) : job());
      S.play = p; S.doc = got; S.saved = sig(); S.title = p.title; S.cat = p.category; S.draft = null; ls.set(draftKey(), null); if (publish) S.pick.clear();
      toast(publish ? `Published${ids.length ? ` and sent to ${ids.length} player${ids.length === 1 ? '' : 's'}` : ''}` : `Saved as version ${p.version}`, 'ok', publish ? '🚀' : '💾');
      if (lost > 0) toast(`${lost} item${lost === 1 ? ' was' : 's were'} left out by the server (off the pitch or not filled in)`, 'err');
      paintHead(); paintBoard(); paintCtx(); swap('st-kf', kfHtml()); swap('st-quiz', quizHtml()); swap('st-pub', pubHtml()); swap('st-media', mediaHtml()); swap('st-share', shareHtml()); swap('st-ver', verHtml()); sync(); }
    catch (er) { toast(er.message || 'Could not save', 'err'); }
    finally { if (S) S.saving = false; }
  }
  async function send(btn) { const ids = [...S.pick].filter((u) => !(S.play.assigned || []).some((a) => String(a.user_id) === u)); if (!ids.length) return;
    try { S.play = await (M ? M.submit(btn, () => post(`/api/plays/${S.id}/assign`, { userIds: ids }), { burst: true }) : post(`/api/plays/${S.id}/assign`, { userIds: ids })); S.pick.clear();
      toast(`📋 Sent to ${ids.length} player${ids.length === 1 ? '' : 's'}: it is on their To learn list`, 'ok', '📨'); swap('st-pub', pubHtml()); }
    catch (er) { toast(er.message || 'Could not send it', 'err'); } }
  async function unpublish(btn) { if (S.confirm !== 'unpub') { S.confirm = 'unpub'; swap('st-pub', pubHtml()); setTimeout(() => { if (S?.confirm === 'unpub') { S.confirm = null; swap('st-pub', pubHtml()); } }, 4000); return; }
    S.confirm = null; try { S.play = await (M ? M.submit(btn, () => post(`/api/plays/${S.id}/publish`, { published: false }), { burst: false }) : post(`/api/plays/${S.id}/publish`, { published: false })); toast('Hidden from members. It is a draft again', 'ok', '🙈'); S.share = null; paintHead(); swap('st-pub', pubHtml()); swap('st-media', mediaHtml()); swap('st-share', shareHtml()); }
    catch (er) { toast(er.message || 'Could not unpublish', 'err'); } }
  async function loadSquad() { try { const r = await A.call('/api/admin/overview'); if (!S) return; S.users = r.users || {}; S.claims = r.claims || {}; } catch { if (S) S.users = false; } if (S) swap('st-pub', pubHtml()); }

  // ================= events =================
  function click(e) {
    if (!S) return; const t = e.target, c = (s) => t.closest(s);
    if (c('[data-stback]')) { e.preventDefault(); if (dirty() && S.confirm !== 'leave') { S.confirm = 'leave'; const b = c('[data-stback]'); b.textContent = '← Tap again to close (unsaved edits stay as a draft)'; setTimeout(() => { if (S?.confirm === 'leave') { S.confirm = null; paintDirty(); } }, 4000); return; } close(true); return; }
    let b;
    if ((b = c('[data-sttool]'))) { S.tool = b.dataset.sttool; if (S.tool !== 'move') S.sel = null; stopAnim(); paintTools(); paintBoard(); if (S.tool === 'text') $('.st-txt', S.el)?.focus(); return; }
    if ((b = c('[data-stcolor]'))) { S.color = b.dataset.stcolor; if (S.tool === 'move' || S.tool.startsWith('add:') || S.tool === 'erase') S.tool = 'free'; paintTools(); return; }
    if ((b = c('[data-stw]'))) { S.w = +b.dataset.stw; paintTools(); return; }
    if (c('[data-stfill]')) { S.fill = !S.fill; paintTools(); return; }
    if (c('[data-stbend]')) { S.bend = -S.bend; paintTools(); return; }
    if (c('[data-stundo]')) return step(S.undo, S.redo);
    if (c('[data-stredo]')) return step(S.redo, S.undo);
    if ((b = c('[data-stsave]'))) return save(b);
    if ((b = c('[data-stpub]'))) return save(b, { publish: true });
    if (c('[data-stvert]')) { B().vert = !B().vert; stopAnim(); paintBoard(); paintCtx(); return; }
    if (c('[data-stclear]')) { if (S.confirm !== 'chalk') { S.confirm = 'chalk'; paintCtx(); setTimeout(() => { if (S?.confirm === 'chalk') { S.confirm = null; paintCtx(); } }, 4000); return; } S.confirm = null; snap(); S.doc.drawings = []; changed({ kf: false }); return; }
    if (c('[data-strm]')) { snap(); S.doc.pieces = S.doc.pieces.filter((p) => p.id !== S.sel); S.doc.steps.forEach((s) => delete s.pieces[S.sel]); S.sel = null; changed(); return; }
    if (c('[data-stdup]')) { const p = S.doc.pieces.find((x) => x.id === S.sel); if (!p) return; if (S.doc.pieces.length >= LIMIT.pieces) return toast(`Up to ${LIMIT.pieces} pieces`, 'err'); snap(); const n = { ...p, id: uid(), x: Math.min(1000, p.x + 40), y: Math.min(640, p.y + 30) }; S.doc.pieces.push(n); S.sel = n.id; changed({ kf: false }); return; }
    if (c('[data-strestore]')) { snap(); S.doc = norm(S.draft.doc); S.draft = null; paintHead(); changed({ quiz: true }); toast('Your unsaved edits are back', 'ok', '♻️'); return; }
    if (c('[data-stdrop]')) { S.draft = null; ls.set(draftKey(), null); paintHead(); return; }
    if ((b = c('[data-stkfadd]'))) { const at = Math.round(Math.max(0, Math.min(60, Number(S.kft ?? ($('[data-stfield="kft"]', S.el)?.value || 0)))) * 2) * 500;
      snap(); const pos = Object.fromEntries(S.doc.pieces.map((p) => [p.id, { x: p.x, y: p.y }])), i = S.doc.steps.findIndex((s) => s.at === at);
      if (i > -1) S.doc.steps[i] = { at, pieces: pos }; else S.doc.steps.push({ at, pieces: pos }); S.doc.steps.sort((a, b2) => a.at - b2.at); S.kft = null;
      changed(); toast(i > -1 ? `Keyframe at ${(at / 1000).toFixed(1)} s replaced` : `Captured at ${(at / 1000).toFixed(1)} s`, 'ok', '📸'); return; }
    if ((b = c('[data-stkfdel]'))) { snap(); S.doc.steps.splice(+b.dataset.stkfdel, 1); changed(); return; }
    if ((b = c('[data-stkf]'))) { const fr = B().framesOf(S.doc), s = S.doc.steps[+b.dataset.stkf], f = fr.find((x) => x.at === s.at); if (!f) return; snap(); S.doc.pieces.forEach((p) => { const q = f.pieces[p.id]; if (q) { p.x = q.x; p.y = q.y; } }); S.kft = s.at / 1000; changed(); return; }
    if ((b = c('[data-stprev]'))) return preview(b);
    if (c('[data-stqadd]')) { snap(); S.doc.quiz.push({ q: '', options: ['', ''], answer: 0 }); changed({ kf: false, quiz: true }); $$('#st-quiz [data-stqf]', S.el).pop()?.focus(); return; }
    const qi = c('[data-stq]') ? +c('[data-stq]').dataset.stq : -1, qq = S.doc.quiz[qi];
    if (qq && c('[data-stqdel]')) { snap(); S.doc.quiz.splice(qi, 1); changed({ kf: false, quiz: true }); return; }
    if (qq && c('[data-stqoadd]')) { snap(); qq.options.push(''); changed({ kf: false, quiz: true }); $$(`[data-stq="${qi}"] [data-stqo]`, S.el).pop()?.focus(); return; }
    if (qq && (b = c('[data-stqodel]'))) { const j = +b.dataset.stqodel; snap(); qq.options.splice(j, 1); if (qq.answer >= qq.options.length) qq.answer = 0; else if (qq.answer > j) qq.answer--; changed({ kf: false, quiz: true }); return; }
    if (c('[data-stpkall]')) { const has = new Set((S.play.assigned || []).map((a) => String(a.user_id))); Object.keys(S.users || {}).forEach((u) => !has.has(u) && S.pick.add(u)); swap('st-pub', pubHtml()); return; }
    if (c('[data-stpknone]')) { S.pick.clear(); swap('st-pub', pubHtml()); return; }
    if ((b = c('[data-stsend]'))) return send(b);
    if ((b = c('[data-stunpub]'))) return unpublish(b);
    if ((b = c('[data-strec]'))) return recStart(b.dataset.strec);
    if (c('[data-strecstop]')) return recStop();
    if ((b = c('[data-stwatch]'))) return watch(b);
    if ((b = c('[data-sthide]'))) return hide(b);
    if ((b = c('[data-stshare]'))) return shareOpen(b.dataset.stshare);
    if ((b = c('[data-stdcgo]'))) return shareGo(b);
    if (c('[data-stdcx]')) { S.share = null; swap('st-share', shareHtml()); return; }
    if ((b = c('[data-stver]'))) return restore(b);
    if ((b = c('[data-starch]'))) return archive(b);
  }
  function input(e) {
    if (!S) return; const t = e.target, f = t.dataset.stfield;
    if (f === 'title') { S.title = t.value; paintDirty(); return; }
    if (f === 'text') { S.text = t.value; return; }
    if (f === 'kft') { S.kft = t.value === '' ? null : +t.value; return; }
    if (f === 'label') { const p = S.doc.pieces.find((x) => x.id === S.sel); if (!p) return; if (!S.typing) { snap(); S.typing = true; } const v = t.value.trim(); if (v) p.label = v; else delete p.label; paintBoard(); paintDirty(); keepDraft(); sync(); return; }
    const qd = t.closest('[data-stq]'); if (!qd) return; const q = S.doc.quiz[+qd.dataset.stq]; if (!q) return;
    if (!S.typing) { snap(); S.typing = true; }
    if (t.matches('[data-stqf]')) q.q = t.value; else if (t.matches('[data-stqo]')) q.options[+t.dataset.stqo] = t.value; paintDirty(); keepDraft();
  }
  function change(e) {
    if (!S) return; const t = e.target;
    S.typing = false; // one undo step per field edit
    if (t.dataset.stfield === 'cat') { S.cat = t.value; paintDirty(); const ci = $('.st-head .pb-ci', S.el); if (ci) ci.textContent = (CAT[S.cat] || ['📋'])[0]; return; }
    if (t.matches('[data-stqa]')) { const qd = t.closest('[data-stq]'), q = S.doc.quiz[+qd.dataset.stq]; snap(); q.answer = +t.dataset.stqa; changed({ kf: false, quiz: true }); return; }
    if (t.matches('[data-stpk]')) { t.checked ? S.pick.add(t.dataset.stpk) : S.pick.delete(t.dataset.stpk); swap('st-pub', pubHtml()); return; }
    if (t.matches('[data-strecplay]')) { S.recPlay = t.checked; ls.set('nx.st.recplay', t.checked ? 1 : 0); return; }
    if (t.dataset.stdc && S.share) { S.share[t.dataset.stdc] = t.value; swap('st-share', shareHtml()); $(`[data-stdc="${t.dataset.stdc}"]`, S.el)?.focus(); return; }
    if (t.dataset.stfield === 'label') sync();
  }
  function key(e) {
    if (!S) return; const typing = /INPUT|TEXTAREA|SELECT/.test(d.activeElement?.tagName || ''), mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save($('[data-stsave]', S.el)); return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? step(S.redo, S.undo) : step(S.undo, S.redo); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); step(S.redo, S.undo); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); $('[data-strm]', S.el)?.click(); return; }
    if (e.key === 'Escape') { if (S.sel) { S.sel = null; paintBoard(); paintCtx(); } else if (S.tool !== 'move') { S.tool = 'move'; paintTools(); } }
  }
  const unload = (e) => { if (dirty()) { keepDraft(); e.preventDefault(); e.returnValue = ''; } };

  function close(back) { if (!S) return; stopAnim(); keepDraft(); S.live.stop?.(); recStop(); if (S.mediaUrl) URL.revokeObjectURL(S.mediaUrl); const { el, onClose, play } = S;
    el.removeEventListener('click', click); el.removeEventListener('input', input); el.removeEventListener('change', change); el.removeEventListener('pointerdown', down);
    d.removeEventListener('keydown', key); removeEventListener('beforeunload', unload); S = null; if (back) onClose?.(play); }

  window.NorexStudio = {
    active: () => S?.id || 0,
    close: () => close(false),
    // o: { el, play (GET /api/plays/:id as a manager), onClose(play), onArchive(id) }
    open(o) {
      if (S) close(false);
      const doc = norm(structuredClone(o.play.doc || {})); doc.drawings.forEach((x) => { if (!x.id) x.id = uid(); });
      S = { el: o.el, onClose: o.onClose, onArchive: o.onArchive, id: o.play.id, play: o.play, doc, saved: '', title: o.play.title, cat: o.play.category, undo: [], redo: [], tool: 'move', color: COLORS[0][0], w: 6, fill: false, bend: 1, sel: null, text: '', kft: null, pick: new Set(), users: null, claims: null, draft: null, confirm: null, anim: null,
        live: { on: false, down: false, pending: false, closed: false }, lww: new Map(), peers: new Map(), synced: structuredClone(doc), media: null, rec: null, upload: null, share: null, recPlay: ls.get('nx.st.recplay') !== 0, mediaUrl: '' };
      S.saved = sig();
      const dr = ls.get(draftKey()); if (dr?.doc && JSON.stringify(norm(dr.doc)) !== S.saved) S.draft = dr;
      o.el.removeAttribute('aria-busy'); const me = S; M ? M.land(o.el, html(), () => { if (S !== me) return; if (S.users !== null) swap('st-pub', pubHtml()); if (S.media !== null) swap('st-media', mediaHtml()); paintLive(); }) : paint(); // the squad list, recordings and socket can beat the page landing
      o.el.addEventListener('click', click); o.el.addEventListener('input', input); o.el.addEventListener('change', change); o.el.addEventListener('pointerdown', down);
      d.addEventListener('keydown', key); addEventListener('beforeunload', unload);
      loadSquad(); loadMedia(); openLive();
    },
  };
})();
