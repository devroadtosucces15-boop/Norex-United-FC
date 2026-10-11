// Tactics › Builds › Pro builds (B2): the live Pro Builds board. Reading is public: GET /api/probuilds (every posted build with
// votes, comments count and "Club recommended") and GET /api/probuilds/get?id= (the full description and the comments).
// Sort Hot / Top / New, filter by mode, archetype, position, rules version, MAX only and search; open a build here (#b=<id>, the
// live deep link) or try it in the sandbox. Builds are share codes decoded with the same maths and game rules as the Builder tab
// (window.NorexBuilds from builder.js).
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
<footer><a class="bx-lnk" href="#b=${x.id}" data-openb="${x.id}">💬 <span class="num">${x.comments}</span></a>${x.clip ? `<a class="bx-lnk" href="${N.esc(x.clip)}" target="_blank" rel="noopener nofollow ugc">▶ Clip</a>` : ''}<span class="grow"></span><button type="button" class="btn ghost sm" data-try="${x.id}" title="Open a copy in the Builder">🧪 Try</button><span data-cardw="${x.id}"></span></footer></div></article>`;
  };
  const archOpts = () => (g.archetypeGroups || []).map((grp) => `<optgroup label="${N.esc(grp.name)}">${(g.archetypes || []).filter((a) => a.group === grp.id).map((a) => `<option value="${N.esc(a.id)}"${S.arch === a.id ? ' selected' : ''}>${N.esc(a.name)}</option>`).join('')}</optgroup>`).join('');
  const boardHtml = () => {
    const l = shown(), rec = S.list.filter((x) => x.featured && (S.mode === 'all' || x.mode === S.mode));
    return `<div class="panel bx-ptop"><div class="chips" role="group" aria-label="Sort">${[['hot', '🔥 Hot'], ['top', '🏆 Top'], ['new', '🆕 New']].map(([k, t]) => `<button type="button" class="chip${S.sort === k ? ' on' : ''}" data-sort="${k}" aria-pressed="${S.sort === k}">${t}</button>`).join('')}</div>
<label class="bx-q"><span aria-hidden="true">🔎</span><input type="search" data-q placeholder="Search builds, tags, members" value="${N.esc(S.q)}" aria-label="Search builds"></label><span data-postw></span></div>
<div class="bx-filt"><div class="chips" role="group" aria-label="Mode">${[['all', '✨ All'], ['league', '🏟️ League'], ['rush', '⚡ Rush']].map(([k, t]) => `<button type="button" class="chip${S.mode === k ? ' on' : ''}" data-mode="${k}" aria-pressed="${S.mode === k}">${t}</button>`).join('')}</div>
<select data-f="arch" aria-label="Archetype"><option value="">🧬 All archetypes</option>${archOpts()}</select><select data-f="pos" aria-label="Position"><option value="">📍 All positions</option>${POS.map((p) => `<option${S.pos === p ? ' selected' : ''}>${p}</option>`).join('')}</select>
<select data-f="patch" aria-label="Game rules version"><option value="">🩹 Any rules</option><option value="current"${S.patch === 'current' ? ' selected' : ''}>✓ Current rules</option><option value="old"${S.patch === 'old' ? ' selected' : ''}>⚠ Older rules</option></select>
<label class="bx-chk"><input type="checkbox" data-f="max"${S.max ? ' checked' : ''}> 🔝 MAX only</label><span class="muted small bx-count"><b class="num">${l.length}</b> of ${S.list.length}</span></div>
${rec.length ? `<section class="bx-rec"><h3>⭐ Club recommended</h3><div class="bx-shelf">${rec.map((x) => { const i = N.info(g, x); return `<a class="panel bx-mini" href="#b=${x.id}" data-openb="${x.id}">${i ? N.ovr(i.ev) : '<span class="bx-ovr"><b>?</b></span>'}<span><small class="gold-t">⭐ ${N.esc(x.featured)}</small><b>${N.esc(x.title)}</b><small class="muted">${i ? `${N.ICON[i.arch.group] || ''} ${N.esc(i.arch.name)} · ${i.max ? 'MAX' : 'L' + x.level}` : ''}${x.position ? ` · ${N.esc(x.position)}` : ''}</small></span></a>`; }).join('')}</div></section>` : ''}
${l.length ? `<div class="bx-cards rv-g">${l.map(card).join('')}</div>` : `<div class="panel sq-empty"><span>${S.list.length ? '🔍' : '🧬'}</span><div><b>${S.list.length ? 'No builds match' : 'No builds posted yet'}</b><p class="muted small">${S.list.length ? 'Try fewer filters.' : 'Be the first: make your build in the Builder and press 📣 Post.'}</p>${S.list.length ? '<button type="button" class="btn ghost" data-clear>Clear filters</button>' : '<button type="button" class="btn ghost" data-bxt-go="b">🧪 Open the Builder</button>'}</div></div>`}`;
  };
  const paint = () => { const q = d.activeElement?.matches?.('[data-q]'), pos = q ? d.activeElement.selectionStart : 0; el.innerHTML = boardHtml(); N.hooks.board?.(el); if (q) { const i = $('[data-q]', el); i.focus(); i.setSelectionRange(pos, pos); } };

  // ---------- one build: description, top attributes, comments ----------
  const attrs = (ev) => [...ev.rows].sort((a, b) => b.value - a.value || b.sig - a.sig).slice(0, 8).map((r) => `<div class="bx-tattr${r.sig ? ' sig' : ''}"><span>${r.sig ? '★ ' : ''}${N.esc(r.name)}</span><i style="--w:${Math.round((r.value / ev.top) * 100)}%"></i><b class="num">${r.value}</b></div>`).join('');
  const detailHtml = () => {
    const x = open, i = N.info(g, x);
    return `<button type="button" class="btn ghost sm bx-back" data-back>← All builds</button><article class="panel bx-det" data-id="${x.id}"><div class="bx-dh">${vote(x)}<div class="bx-dt"><h3>${N.esc(x.title)}</h3><div class="bx-meta">${av(x.by, 28)}<small class="muted">posted ${N.ago(x.at)}${x.updated > x.at + 6e4 ? ` · edited ${N.ago(x.updated)}` : ''}</small></div><div class="bx-labels">${N.labels(g, x, { ps: 6 })}</div></div>${i ? N.ovr(i.ev, true) : ''}</div>
${x.featured ? `<p class="bx-feat">⭐ Club recommended · ${N.esc(x.featured)}</p>` : ''}
<div class="bx-dg">${i ? `<div>${N.face(i.ev)}<div class="bx-tattrs">${attrs(i.ev)}</div>${i.ev.fit.length ? `<p class="muted small">📍 Best fit*: ${i.ev.fit.slice(0, 3).map(([p, v]) => `<b>${N.esc(p)}</b> ${v}`).join(' · ')}</p>` : ''}</div>` : '<p class="muted">This build can’t be read with the current game rules.</p>'}
<div>${x.desc ? `<p class="bx-ddesc">${N.esc(x.desc)}</p>` : '<p class="muted">No description.</p>'}${x.clip ? `<a class="btn ghost sm" href="${N.esc(x.clip)}" target="_blank" rel="noopener nofollow ugc">▶ Watch the clip</a>` : ''}</div></div>
<div class="bx-acts"><button type="button" class="btn sm" data-try="${x.id}">🧪 Try in the Builder</button><button type="button" class="btn ghost sm" data-copy>🔗 Copy link</button><span data-detw></span></div>
<h3 class="bx-ch">💬 Comments <small class="num muted">${comments.length}</small></h3><ul class="bx-coms">${comments.map((c) => `<li data-cid="${c.id}">${av(c.by, 24)}<small class="muted">${N.ago(c.at)}</small><p>${N.esc(c.text)}</p><span data-comw="${c.id}"></span></li>`).join('') || '<li class="muted small">No comments yet. Tried it? Say how it played.</li>'}</ul><div data-cformw></div></article>`;
  };
  const paintDetail = () => { el.innerHTML = detailHtml(); N.hooks.detail?.(el, open, comments); };
  async function showDetail(id, { scroll = true } = {}) {
    const base = S.list.find((x) => x.id === id);
    history.replaceState(null, '', `#b=${id}`);
    open = base || { id, title: 'Pro build', by: {}, score: 0, up: 0, down: 0, comments: 0, tags: [], at: Date.now(), updated: Date.now() }; comments = [];
    MO?.skeleton(el, 5); if (scroll) el.scrollIntoView({ behavior: MO?.reduced?.() ? 'auto' : 'smooth', block: 'start' });
    try { const r = await A.call(`/api/probuilds/get?id=${id}`); open = r.build; comments = r.comments || []; if (base) Object.assign(base, r.build, { desc: base.desc, more: base.more }); }
    catch (e) { el.removeAttribute('aria-busy'); el.innerHTML = `<button type="button" class="btn ghost sm bx-back" data-back>← All builds</button><div class="panel sq-empty"><span>🔍</span><div><b>That build isn’t on the board</b><p class="muted small">${N.esc(e.message)}</p></div></div>`; return; }
    MO ? MO.land(el, detailHtml(), () => N.hooks.detail?.(el, open, comments)) : paintDetail();
  }
  const back = () => { open = null; history.replaceState(null, '', '#pro'); MO ? MO.land(el, boardHtml(), () => N.hooks.board?.(el)) : paint(); };

  async function load(force) {
    if (loaded && !force) return; loaded = true;
    MO?.skeleton(el, 6);
    try { await N.game; const r = await A.call('/api/probuilds'); Object.assign(S, { list: r.builds || [], canPost: !!r.canPost, canFeature: !!r.canFeature, canModerate: !!r.canModerate }); }
    catch (e) { loaded = false; el.removeAttribute('aria-busy'); el.innerHTML = `<div class="panel sq-empty"><span>📡</span><div><b>Could not load Pro builds</b><p class="muted small">${N.esc(e.message || 'The club server did not answer.')}</p><button type="button" class="btn ghost" data-pretry>↻ Try again</button></div></div>`; return; }
    const m = location.hash.match(/^#b=(\d+)$/);
    if (m) return showDetail(+m[1], { scroll: false });
    MO ? MO.land(el, boardHtml(), () => N.hooks.board?.(el)) : paint();
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
    N.hooks.proClick?.(t, e, { S, open, paint, paintDetail, showDetail, load, get comments() { return comments; }, set comments(v) { comments = v; }, setOpen: (x) => (open = x) });
  });
  el.addEventListener('input', (e) => { if (e.target.matches('[data-q]')) { S.q = e.target.value; paint(); } });
  el.addEventListener('change', (e) => { const f = e.target.dataset.f; if (!f) return; S[f] = f === 'max' ? e.target.checked : e.target.value; paint(); });

  const start = () => { N = window.NorexBuilds; g = N.g; N.pro = { S, load, paint, paintDetail, showDetail, back, get open() { return open; } }; if (!$('[data-bxp="p"]').hidden) load(); };
  window.NorexBuilds ? start() : addEventListener('norex:builds', start, { once: true });
})();
