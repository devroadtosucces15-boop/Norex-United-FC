// Tactics › Builds › Pro builds (B2): the live Pro Builds board. Reading is public: GET /api/probuilds (every posted build with
// votes, comments count and "Club recommended") and GET /api/probuilds/get?id= (the full description and the comments).
// Sort Hot / Top / New, filter by mode, archetype, position, rules version, MAX only and search; open a build here (#b=<id>, the
// live deep link) or try it in the sandbox. Builds are share codes decoded with the same maths and game rules as the Builder tab
// (window.NorexBuilds from builder.js).
// Writes (members, the live routes): vote (POST /api/probuilds/vote, optimistic), comment and delete a comment, ⭐ use as my build
// (/api/mybuild: someone else's build is copied into mine first), 🍴 fork (/api/builds/fork); managers ⭐ feature as Club recommended,
// the author takes a post down and a manager removes one (/api/probuilds/unpost, two taps). Posting starts in the Builder (📣 Post).
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const el = $('#bxpro'); if (!el) return;
  const A = window.NorexAuth, MO = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A) return;
  const POS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
  const pref = (() => { try { return JSON.parse(localStorage.getItem('norex_pb_view') || '{}'); } catch { return {}; } })();
  const S = { list: [], sort: pref.sort || 'hot', mode: pref.mode || 'all', arch: '', pos: '', patch: '', max: false, q: '', canPost: false, canFeature: false, canModerate: false };
  let N = null, g = null, loaded = false, open = null, comments = []; // open = the build in the detail view
  const keep = () => { try { localStorage.setItem('norex_pb_view', JSON.stringify({ sort: S.sort, mode: S.mode })); } catch {} };
  const hot = (x) => (x.score + x.comments * 0.5 + 1) / Math.pow((Date.now() - x.at) / 36e5 + 2, 1.3);
  const av = (u, size = 22) => `<span class="bx-by">${u.a ? `<img src="${N.esc(u.a)}" alt="" width="${size}" height="${size}" loading="lazy" referrerpolicy="no-referrer">` : `<i style="width:${size}px;height:${size}px">${N.esc((u.n || '?')[0].toUpperCase())}</i>`}<b>${N.esc(u.n || 'Member')}</b></span>`;
  const shown = () => {
    const q = S.q.trim().toLowerCase();
    return S.list.filter((x) => (S.mode === 'all' || x.mode === S.mode) && (!S.arch || x.arch === S.arch) && (!S.pos || x.position === S.pos)
      && (!S.patch || (S.patch === 'current') === (!x.version || x.version === g.version)) && (!S.max || N.info(g, x)?.max)
      && (!q || [x.title, x.desc, x.by.n, x.position, N.archName(x.arch, g), ...(x.tags || [])].join(' ').toLowerCase().includes(q)))
      .sort({ hot: (a, b) => hot(b) - hot(a), top: (a, b) => b.score - a.score || b.up - a.up || b.at - a.at, new: (a, b) => b.at - a.at }[S.sort]);
  };
  const vote = (x) => `<div class="bx-vote" aria-label="Score ${x.score}"><button type="button" data-vote="1" class="${x.myVote > 0 ? 'on' : ''}" aria-label="Upvote ${N.esc(x.title)}" aria-pressed="${x.myVote > 0}"${x.mine ? ' disabled title="Your build"' : ''}>▲</button><b class="num ${x.score > 0 ? 'pos' : x.score < 0 ? 'neg' : ''}">${x.score}</b><button type="button" data-vote="-1" class="${x.myVote < 0 ? 'on' : ''}" aria-label="Downvote ${N.esc(x.title)}" aria-pressed="${x.myVote < 0}"${x.mine ? ' disabled title="Your build"' : ''}>▼</button></div>`;
  const card = (x, i = 0) => {
    const inf = N.info(g, x);
    return `<article class="panel bx-card${x.featured ? ' feat' : ''}" data-id="${x.id}" style="--i:${Math.min(i, 10)}">${vote(x)}<div class="bx-cb">${x.featured ? `<span class="bx-feat">⭐ Club recommended · ${N.esc(x.featured)}</span>` : ''}
<h3><a href="#b=${x.id}" data-openb="${x.id}">${N.esc(x.title)}</a></h3><div class="bx-meta">${av(x.by)}<small class="muted">${N.ago(x.at)}</small></div>
<div class="bx-labels">${N.labels(g, x, { ps: 2 })}</div>${inf ? `<div class="bx-cst">${N.ovr(inf.ev)}${N.face(inf.ev)}</div>` : ''}
${x.desc ? `<p class="bx-desc">${N.esc(x.desc)}${x.more ? '…' : ''}</p>` : ''}
<footer><a class="bx-lnk" href="#b=${x.id}" data-openb="${x.id}">💬 <span class="num">${x.comments}</span></a>${x.clip ? `<a class="bx-lnk" href="${N.esc(x.clip)}" target="_blank" rel="noopener nofollow ugc">▶ Clip</a>` : ''}<span class="grow"></span><button type="button" class="btn ghost sm" data-try="${x.id}" title="Open a copy in the Builder">🧪 Try</button><button type="button" class="btn ghost sm" data-use="${x.id}" title="Use as my build" aria-label="Use ${N.esc(x.title)} as my build">⭐</button></footer></div></article>`;
  };
  const archOpts = () => (g.archetypeGroups || []).map((grp) => `<optgroup label="${N.esc(grp.name)}">${(g.archetypes || []).filter((a) => a.group === grp.id).map((a) => `<option value="${N.esc(a.id)}"${S.arch === a.id ? ' selected' : ''}>${N.esc(a.name)}</option>`).join('')}</optgroup>`).join('');
  const boardHtml = () => {
    const l = shown(), rec = S.list.filter((x) => x.featured && (S.mode === 'all' || x.mode === S.mode));
    return `<div class="panel bx-ptop"><div class="chips" role="group" aria-label="Sort">${[['hot', '🔥 Hot'], ['top', '🏆 Top'], ['new', '🆕 New']].map(([k, t]) => `<button type="button" class="chip${S.sort === k ? ' on' : ''}" data-sort="${k}" aria-pressed="${S.sort === k}">${t}</button>`).join('')}</div>
<label class="bx-q"><span aria-hidden="true">🔎</span><input type="search" data-q placeholder="Search builds, tags, members" value="${N.esc(S.q)}" aria-label="Search builds"></label><button type="button" class="btn sm" data-bxt-go="b" title="Make the build in the Builder, then press 📣 Post">📣 Post a build</button></div>
<div class="bx-filt"><div class="chips" role="group" aria-label="Mode">${[['all', '✨ All'], ['league', '🏟️ League'], ['rush', '⚡ Rush']].map(([k, t]) => `<button type="button" class="chip${S.mode === k ? ' on' : ''}" data-mode="${k}" aria-pressed="${S.mode === k}">${t}</button>`).join('')}</div>
<select data-f="arch" aria-label="Archetype"><option value="">🧬 All archetypes</option>${archOpts()}</select><select data-f="pos" aria-label="Position"><option value="">📍 All positions</option>${POS.map((p) => `<option${S.pos === p ? ' selected' : ''}>${p}</option>`).join('')}</select>
<select data-f="patch" aria-label="Game rules version"><option value="">🩹 Any rules</option><option value="current"${S.patch === 'current' ? ' selected' : ''}>✓ Current rules</option><option value="old"${S.patch === 'old' ? ' selected' : ''}>⚠ Older rules</option></select>
<label class="bx-chk"><input type="checkbox" data-f="max"${S.max ? ' checked' : ''}> 🔝 MAX only</label><span class="muted small bx-count"><b class="num">${l.length}</b> of ${S.list.length}</span></div>
${rec.length ? `<section class="bx-rec"><h3>⭐ Club recommended</h3><div class="bx-shelf">${rec.map((x) => { const i = N.info(g, x); return `<a class="panel bx-mini" href="#b=${x.id}" data-openb="${x.id}">${i ? N.ovr(i.ev) : '<span class="bx-ovr"><b>?</b></span>'}<span><small class="gold-t">⭐ ${N.esc(x.featured)}</small><b>${N.esc(x.title)}</b><small class="muted">${i ? `${N.ICON[i.arch.group] || ''} ${N.esc(i.arch.name)} · ${i.max ? 'MAX' : 'L' + x.level}` : ''}${x.position ? ` · ${N.esc(x.position)}` : ''}</small></span></a>`; }).join('')}</div></section>` : ''}
${l.length ? `<div class="bx-cards rv-g">${l.map(card).join('')}</div>` : `<div class="panel sq-empty"><span>${S.list.length ? '🔍' : '🧬'}</span><div><b>${S.list.length ? 'No builds match' : 'No builds posted yet'}</b><p class="muted small">${S.list.length ? 'Try fewer filters.' : 'Be the first: make your build in the Builder and press 📣 Post.'}</p>${S.list.length ? '<button type="button" class="btn ghost" data-clear>Clear filters</button>' : '<button type="button" class="btn ghost" data-bxt-go="b">🧪 Open the Builder</button>'}</div></div>`}`;
  };
  const paint = () => { const q = d.activeElement?.matches?.('[data-q]'), pos = q ? d.activeElement.selectionStart : 0; el.innerHTML = boardHtml(); if (q) { const i = $('[data-q]', el); i.focus(); i.setSelectionRange(pos, pos); } };

  // ---------- one build: description, top attributes, comments ----------
  const attrs = (ev) => [...ev.rows].sort((a, b) => b.value - a.value || b.sig - a.sig).slice(0, 8).map((r) => `<div class="bx-tattr${r.sig ? ' sig' : ''}"><span>${r.sig ? '★ ' : ''}${N.esc(r.name)}</span><i style="--w:${Math.round((r.value / ev.top) * 100)}%"></i><b class="num">${r.value}</b></div>`).join('');
  const detailHtml = () => {
    const x = open, i = N.info(g, x);
    return `<button type="button" class="btn ghost sm bx-back" data-back>← All builds</button><article class="panel bx-det" data-id="${x.id}"><div class="bx-dh">${vote(x)}<div class="bx-dt"><h3>${N.esc(x.title)}</h3><div class="bx-meta">${av(x.by, 28)}<small class="muted">posted ${N.ago(x.at)}${x.updated > x.at + 6e4 ? ` · edited ${N.ago(x.updated)}` : ''}</small></div><div class="bx-labels">${N.labels(g, x, { ps: 6 })}</div></div>${i ? N.ovr(i.ev, true) : ''}</div>
${x.featured ? `<p class="bx-feat">⭐ Club recommended · ${N.esc(x.featured)}</p>` : ''}
<div class="bx-dg">${i ? `<div>${N.face(i.ev)}<div class="bx-tattrs">${attrs(i.ev)}</div>${i.ev.fit.length ? `<p class="muted small">📍 Best fit*: ${i.ev.fit.slice(0, 3).map(([p, v]) => `<b>${N.esc(p)}</b> ${v}`).join(' · ')}</p>` : ''}</div>` : '<p class="muted">This build can’t be read with the current game rules.</p>'}
<div>${x.desc ? `<p class="bx-ddesc">${N.esc(x.desc)}</p>` : '<p class="muted">No description.</p>'}${x.clip ? `<a class="btn ghost sm" href="${N.esc(x.clip)}" target="_blank" rel="noopener nofollow ugc">▶ Watch the clip</a>` : ''}</div></div>
<div class="bx-acts"><button type="button" class="btn sm" data-try="${x.id}">🧪 Try in the Builder</button><button type="button" class="btn ghost sm" data-copy>🔗 Copy link</button><button type="button" class="btn ghost sm" data-use="${x.id}">⭐ Use as my build</button>${N.signed && !x.mine ? `<button type="button" class="btn ghost sm" data-fork="${x.id}">🍴 Fork</button>` : ''}${x.mine ? `<button type="button" class="btn ghost sm" data-edit="${x.id}">✏️ Edit in the Builder</button>` : ''}${S.canFeature ? (x.featured ? '<button type="button" class="btn ghost sm" data-feat="off">☆ Unfeature</button>' : '<button type="button" class="btn ghost sm" data-feat="on">⭐ Feature</button>') : ''}${x.mine ? '<button type="button" class="btn ghost sm" data-unpost>📤 Take down</button>' : S.canModerate ? '<button type="button" class="btn ghost sm" data-unpost>🗑️ Remove post</button>' : ''}</div>
<h3 class="bx-ch">💬 Comments <small class="num muted">${comments.length}</small></h3><ul class="bx-coms">${comments.map((c) => `<li data-cid="${c.id}">${av(c.by, 24)}<small class="muted">${N.ago(c.at)}</small><p>${N.esc(c.text)}</p>${c.canDelete ? `<button type="button" class="bx-x" data-delc="${c.id}" aria-label="Delete comment" title="Delete">🗑️</button>` : ''}</li>`).join('') || '<li class="muted small">No comments yet. Tried it? Say how it played.</li>'}</ul>${N.signed ? '<form class="bx-cform" data-cform><textarea name="text" maxlength="500" rows="2" required placeholder="Tried it? How did it play?" aria-label="Comment"></textarea><button class="btn sm" type="submit">💬 Comment</button></form>' : `<a class="btn gold sm" data-login href="${N.esc(A.loginUrl())}">🔐 Sign in to comment</a>`}</article>`;
  };
  const paintDetail = () => { el.innerHTML = detailHtml(); };
  async function showDetail(id, { scroll = true } = {}) {
    const base = S.list.find((x) => x.id === id);
    history.replaceState(null, '', `#b=${id}`);
    open = base || { id, title: 'Pro build', by: {}, score: 0, up: 0, down: 0, comments: 0, tags: [], at: Date.now(), updated: Date.now() }; comments = [];
    MO?.skeleton(el, 5); if (scroll) el.scrollIntoView({ behavior: MO?.reduced?.() ? 'auto' : 'smooth', block: 'start' });
    try { const r = await A.call(`/api/probuilds/get?id=${id}`); open = r.build; comments = r.comments || []; if (base) Object.assign(base, r.build, { desc: base.desc, more: base.more }); }
    catch (e) { el.removeAttribute('aria-busy'); el.innerHTML = `<button type="button" class="btn ghost sm bx-back" data-back>← All builds</button><div class="panel sq-empty"><span>🔍</span><div><b>That build isn’t on the board</b><p class="muted small">${N.esc(e.message)}</p></div></div>`; return; }
    MO ? MO.land(el, detailHtml()) : paintDetail();
  }
  const back = () => { open = null; history.replaceState(null, '', '#pro'); MO ? MO.land(el, boardHtml()) : paint(); };

  // ================= ✍️ writes (members): vote, comment, use as my build, fork; managers feature; author or manager takes it down =================
  const post = (path, body) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const busy = (btn, work) => (MO && btn ? MO.submit(btn, work, { burst: false }) : work());
  const err = (e) => MO?.toast(e.message, { kind: 'err' });
  const find = (id) => (open?.id === id ? open : S.list.find((x) => x.id === id));
  const repaint = (x) => { const c = S.list.find((y) => y.id === x.id); if (c && c !== x) Object.assign(c, { up: x.up, down: x.down, score: x.score, myVote: x.myVote, comments: x.comments, featured: x.featured });
    if (open) { const v = $('.bx-det .bx-vote', el); if (v && open.id === x.id) v.outerHTML = vote(open); } else { const card0 = $(`.bx-card[data-id="${x.id}"]`, el); if (card0) card0.outerHTML = card(c || x); } };
  async function doVote(id, v) {
    if (N.signIn('vote')) return;
    const x = find(id); if (!x || x.mine) return;
    const prev = { up: x.up, down: x.down, score: x.score, myVote: x.myVote }, nv = x.myVote === v ? 0 : v;
    if (x.myVote > 0) x.up--; else if (x.myVote < 0) x.down--; // optimistic
    if (nv > 0) x.up++; else if (nv < 0) x.down++;
    Object.assign(x, { myVote: nv, score: x.up - x.down }); repaint(x);
    try { Object.assign(x, await post('/api/probuilds/vote', { id, v: nv })); repaint(x); } catch (e) { Object.assign(x, prev); repaint(x); err(e); }
  }
  function useAsMine(id) {
    if (N.signIn('pick your build')) return;
    const x = find(id); if (!x) return;
    N.sheet('⭐ Use as my build', `<form class="bx-sh-b" data-uf><p class="muted small" style="margin:0">Shows on your profile, your hover card and your player page.${x.mine ? '' : ' You get your own copy in My builds, so it stays yours.'}</p><div class="bx-f"><span>This is my…</span>${N.modeRadios('bxum', x.mode, true)}</div><label class="bx-f"><span>Position</span>${N.posSelect(x.position)}</label><div class="bx-acts"><button type="submit" class="btn gold">⭐ Use this build</button></div></form>`, (box, close) => {
      $('[data-uf]', box).addEventListener('submit', async (e) => {
        e.preventDefault(); const v = { mode: $('input[name=bxum]:checked', box)?.value || 'league', position: $('[data-pos]', box).value };
        try { await busy(e.submitter, () => post('/api/mybuild', { id: x.id, ...v })); close(); MO?.toast(`Now your ${N.MODE[v.mode][1]} build`, { kind: 'ok', icon: '⭐' }); } catch (e2) { err(e2); }
      });
    });
  }
  async function forkIt(btn) {
    try { const r = await busy(btn, () => post('/api/builds/fork', { id: open.id })); const s = (r.builds || []).find((y) => y.id === r.saved); if (s) N.open(s); MO?.toast('Forked into My builds: change it however you like', { kind: 'ok', icon: '🍴' }); } catch (e) { err(e); }
  }
  function feature(btn) {
    if (btn.dataset.feat === 'off') return busy(btn, () => post('/api/probuilds/feature', { id: open.id, label: null })).then((r) => { open = r.build; comments = r.comments || comments; repaint(open); paintDetail(); MO?.toast('No longer Club recommended', { kind: 'ok', icon: '☆' }); }).catch(err);
    const label = `${open.position ?? ''} · ${open.mode === 'rush' ? 'Rush' : 'League'}`;
    N.sheet('⭐ Club recommended', `<form class="bx-sh-b" data-ff><label class="bx-f"><span>Label on the shelf</span><input name="label" maxlength="30" value="${N.esc(label)}" autofocus></label><div class="bx-acts"><button type="submit" class="btn gold">⭐ Feature it</button></div></form>`, (box, close) => {
      $('[data-ff]', box).addEventListener('submit', async (e) => {
        e.preventDefault();
        try { const r = await busy(e.submitter, () => post('/api/probuilds/feature', { id: open.id, label: e.target.label.value.trim() || label })); open = r.build; comments = r.comments || comments; const c = S.list.find((y) => y.id === open.id); if (c) c.featured = open.featured; close(); paintDetail(); MO?.toast('Featured as Club recommended', { kind: 'ok', icon: '⭐' }); } catch (e2) { err(e2); }
      });
    });
  }
  async function unpost(btn) {
    if (!N.sure(btn, open.mine ? 'Take it down? Tap again' : 'Remove the post? Tap again')) return;
    try { await busy(btn, () => post('/api/probuilds/unpost', { id: open.id })); S.list = S.list.filter((y) => y.id !== open.id); MO?.toast(open.mine ? 'Taken down. It stays in My builds.' : 'Post removed', { kind: 'ok', icon: '📤' }); back(); } catch (e) { err(e); }
  }
  async function delComment(btn) {
    if (!N.sure(btn, 'Delete?')) return;
    try { const r = await busy(btn, () => post('/api/probuilds/comment/delete', { comment: +btn.dataset.delc })); if (r.build) { open = r.build; comments = r.comments || []; } else comments = comments.filter((c) => c.id !== +btn.dataset.delc); repaint(open); paintDetail(); } catch (e) { err(e); }
  }
  el.addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-cform]')) return; e.preventDefault();
    const text = e.target.text.value.trim(); if (text.length < 2) return MO?.toast('Write a little more', { kind: 'err' });
    try { const r = await busy(e.submitter || $('button', e.target), () => post('/api/probuilds/comment', { id: open.id, text })); open = r.build; comments = r.comments || []; repaint(open); paintDetail(); MO?.toast('Comment posted', { kind: 'ok', icon: '💬' }); $('.bx-coms li:last-child', el)?.scrollIntoView({ block: 'nearest' }); }
    catch (e2) { err(e2); }
  });

  async function load(force) {
    if (loaded && !force) return; loaded = true;
    MO?.skeleton(el, 6);
    try { await N.game; const r = await A.call('/api/probuilds'); Object.assign(S, { list: r.builds || [], canPost: !!r.canPost, canFeature: !!r.canFeature, canModerate: !!r.canModerate }); }
    catch (e) { loaded = false; el.removeAttribute('aria-busy'); el.innerHTML = `<div class="panel sq-empty"><span>📡</span><div><b>Could not load Pro builds</b><p class="muted small">${N.esc(e.message || 'The club server did not answer.')}</p><button type="button" class="btn ghost" data-pretry>↻ Try again</button></div></div>`; return; }
    const m = location.hash.match(/^#b=(\d+)$/);
    if (m) return showDetail(+m[1], { scroll: false });
    MO ? MO.land(el, boardHtml()) : paint();
  }

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button, a'); if (!t) return;
    if ('pretry' in t.dataset) return load(true);
    if (t.dataset.openb) { e.preventDefault(); return showDetail(+t.dataset.openb); }
    if ('back' in t.dataset) return back();
    if (t.dataset.sort) { S.sort = t.dataset.sort; keep(); return paint(); }
    if (t.dataset.mode) { S.mode = t.dataset.mode; keep(); return paint(); }
    if ('clear' in t.dataset) { Object.assign(S, { arch: '', pos: '', patch: '', max: false, q: '', mode: 'all' }); return paint(); }
    if (t.dataset.try) { const x = open?.id === +t.dataset.try ? open : S.list.find((y) => y.id === +t.dataset.try); if (x) N.open({ code: x.code, version: x.version }); return; }
    if ('copy' in t.dataset) { const u = location.href.split('#')[0].replace(/\?.*$/, '') + `#b=${open.id}`; navigator.clipboard?.writeText(u).then(() => MO?.toast('Link copied', { kind: 'ok', icon: '🔗' }), () => prompt('Copy this link:', u)); return; }
    if (t.dataset.vote) return doVote(+t.closest('[data-id]').dataset.id, +t.dataset.vote);
    if (t.dataset.use) return useAsMine(+t.dataset.use);
    if (t.dataset.fork) return forkIt(t);
    if (t.dataset.edit) return N.open({ ...open, mine: true, posted: true });
    if (t.dataset.feat) return feature(t);
    if ('unpost' in t.dataset) return unpost(t);
    if (t.dataset.delc) return delComment(t);
  });
  el.addEventListener('input', (e) => { if (e.target.matches('[data-q]')) { S.q = e.target.value; paint(); } });
  el.addEventListener('change', (e) => { const f = e.target.dataset.f; if (!f) return; S[f] = f === 'max' ? e.target.checked : e.target.value; paint(); });

  const start = () => { N = window.NorexBuilds; g = N.g; N.pro = { S, load, paint, paintDetail, showDetail, back, get open() { return open; } }; if (!$('[data-bxp="p"]').hidden) load(); };
  window.NorexBuilds ? start() : addEventListener('norex:builds', start, { once: true });
})();
