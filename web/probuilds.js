// Pro Builds board (roadmap PB.3) + the portal's squad builds view (PB.4).
//   probuilds.html            [data-probuilds] → board: sort Hot / Top / New, filters (mode, archetype, position,
//                             patch, MAX only, search), "Club recommended" shelf, votes, detail with comments,
//                             Try in sandbox, Fork, Use as my build; managers feature / remove posts.
//   NXProBuilds.portal(el)    manager portal tab: everyone's League / Rush build grouped by position.
// Reading is public; everything else needs a Discord login (the Worker enforces it). Deep link: probuilds.html#b=<id>
(() => {
  const BASE = document.body.dataset.base || '';
  const MAPI = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const session = () => { try { const t = localStorage.getItem('norex_session'); const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))); return p.exp > Date.now() / 1000 ? { token: t, ...p } : null; } catch { return null; } };
  const call = async (path, body) => {
    const s = session();
    const r = await fetch(MAPI + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { ...(s ? { Authorization: `Bearer ${s.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  const toast = (m, bad, action) => UI.toast(m, bad ? 'bad' : 'ok', action ? { action } : {});
  const flag = (n) => window.NXViewer?.flagOn(n) ?? false;
  const loadCard = () => (window.NXBuildCard ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/buildcard.js`, onload: ok, onerror: no }))));
  const OPEN = 'norex_pb_open'; // deep link survives the Discord login round trip
  async function needLogin(what) {
    if (session()) return false;
    if (await UI.confirm({ title: `Log in to ${what}`, icon: '🔐', text: 'Reading Pro Builds is open to everyone. Voting, comments and posting need a NOREX Discord login.', ok: 'Log in with Discord' })) {
      try { sessionStorage.setItem(OPEN, location.hash); } catch {}
      location.href = `${MAPI}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
    }
    return true;
  }
  const POS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
  const LINE = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'FWD', RW: 'FWD', CF: 'FWD', ST: 'FWD' };
  const LINES = [['GK', '🧤 Goalkeepers'], ['DEF', '🛡️ Defenders'], ['MID', '🎯 Midfielders'], ['FWD', '⚡ Forwards'], ['', '❔ No position set']];
  const memberHref = (id) => (flag('profiles') && session() ? `${BASE}member.html?u=${encodeURIComponent(id)}` : undefined);

  // "Use as my build": League or Rush + position → /api/mybuild (someone else's build is copied into mine first).
  async function useAsMine(x) {
    if (await needLogin('pick your build')) return;
    const v = await new Promise((ok) => {
      const m = UI.modal({ title: 'Use as my build', icon: '⭐', body: `<p class="muted small">Shows on your profile, your hover card and your player page. ${x.mine ? '' : 'You get your own copy in My builds, so it stays yours.'}</p>
<div class="pb-form"><div class="chipset" role="radiogroup" aria-label="Mode">${Object.entries(NXBuildCard.MODE).map(([k, [ic, l]]) => `<label class="chip pb-radio"><input type="radio" name="pbm" value="${k}"${(x.mode || 'league') === k ? ' checked' : ''}> ${ic} My ${l} build</label>`).join('')}</div>
<label class="pb-field"><span>Position</span><select data-pos>${POS.map((p) => `<option${p === x.position ? ' selected' : ''}>${p}</option>`).join('')}</select></label></div>`,
      actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '⭐ Use this build', value: 'ok' }] });
      m.then((r) => ok(r && { mode: m.el.querySelector('input[name=pbm]:checked').value, position: m.el.querySelector('[data-pos]').value }));
    });
    if (!v) return;
    try {
      await call('/api/mybuild', { id: x.id, ...v });
      const me = session();
      toast(`⭐ Now your ${v.mode === 'rush' ? 'Rush' : 'League'} build`, false, flag('profiles') && me ? { label: 'View profile', fn: () => { location.href = `${BASE}member.html?u=${encodeURIComponent(me.u)}`; } } : null);
    } catch (e) { toast(e.message, true); }
  }

  // ================= board =================
  async function board(root) {
    const pref = (() => { try { return JSON.parse(localStorage.getItem('norex_pb_view') || '{}'); } catch { return {}; } })();
    const S = { list: [], sort: pref.sort || 'hot', mode: pref.mode || 'all', arch: '', pos: '', patch: '', max: false, q: '', g: null };
    root.innerHTML = UI.skeleton ? UI.skeleton('cards', 6) : '<p class="muted">Loading…</p>';
    try {
      await loadCard();
      const [g, d] = await Promise.all([NXBuildCard.ready(), call('/api/probuilds')]);
      Object.assign(S, d, { g, list: d.builds });
    } catch (e) {
      root.innerHTML = UI.empty({ icon: '📡', title: 'Couldn’t load Pro Builds', text: e.message, action: '<button class="btn sm" type="button" onclick="location.reload()">↻ Try again</button>' });
      return;
    }
    const g = S.g;
    const C = NXBuildCard;
    const keep = () => { try { localStorage.setItem('norex_pb_view', JSON.stringify({ sort: S.sort, mode: S.mode })); } catch {} };
    const hot = (x) => (x.score + x.comments * 0.5 + 1) / Math.pow((Date.now() - x.at) / 36e5 + 2, 1.3);
    const shown = () => {
      const q = S.q.trim().toLowerCase();
      const l = S.list.filter((x) => (S.mode === 'all' || x.mode === S.mode) && (!S.arch || x.arch === S.arch) && (!S.pos || x.position === S.pos)
        && (!S.patch || (S.patch === 'current') === (!x.version || x.version === g.version)) && (!S.max || C.info(g, x)?.max)
        && (!q || [x.title, x.desc, x.by.n, x.position, C.archName(x.arch, g), ...(x.tags || [])].join(' ').toLowerCase().includes(q)));
      const by = { hot: (a, b) => hot(b) - hot(a), top: (a, b) => b.score - a.score || b.up - a.up || b.at - a.at, new: (a, b) => b.at - a.at }[S.sort];
      return l.sort(by);
    };
    const vote = (x) => `<div class="pb-vote" aria-label="Score ${x.score}"><button type="button" data-vote="1" class="${x.myVote > 0 ? 'on' : ''}" aria-label="Upvote" aria-pressed="${x.myVote > 0}"${x.mine ? ' disabled title="Your build"' : ''}>▲</button><b class="${x.score > 0 ? 'pos' : x.score < 0 ? 'neg' : ''}">${x.score}</b><button type="button" data-vote="-1" class="${x.myVote < 0 ? 'on' : ''}" aria-label="Downvote" aria-pressed="${x.myVote < 0}"${x.mine ? ' disabled title="Your build"' : ''}>▼</button></div>`;
    const card = (x) => {
      const i = C.info(g, x);
      return `<article class="pb-card${x.featured ? ' feat' : ''}" data-id="${x.id}">${vote(x)}
<div class="pb-body">${x.featured ? `<span class="pb-feat">⭐ Club recommended · ${esc(x.featured)}</span>` : ''}
<h3><button type="button" class="pb-title" data-open>${esc(x.title)}</button></h3>
<div class="pb-by">${UI.member({ id: x.by.id, n: x.by.n, a: x.by.a, sub: UI.ago(x.at), href: memberHref(x.by.id) }, { size: 22 })}</div>
<div class="pb-labels">${C.labels(g, x, { ps: 2 })}</div>
${i ? `<div class="pb-stats"><span class="pb-ovr"><b>${i.ev.ovr}</b><small>OVR*</small></span>${C.face(i.ev)}</div>` : ''}
${x.desc ? `<p class="pb-desc">${esc(x.desc)}${x.more ? '…' : ''}</p>` : ''}
<footer><button type="button" class="pb-link" data-open>💬 ${x.comments}</button>${x.clip ? `<a class="pb-link" href="${esc(x.clip)}" target="_blank" rel="noopener nofollow ugc">▶ Clip</a>` : ''}<span class="grow"></span>
${flag('builder') ? `<a class="btn ghost sm" href="${esc(C.builderUrl(x))}" title="Open a copy in the Pro Builder">🧪 Try</a>` : ''}<button type="button" class="btn ghost sm" data-use title="Use as my build">⭐</button></footer></div></article>`;
    };
    const archOpts = () => (g.archetypeGroups || []).map((grp) => `<optgroup label="${esc(grp.name)}">${(g.archetypes || []).filter((a) => a.group === grp.id).map((a) => `<option value="${esc(a.id)}"${S.arch === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</optgroup>`).join('');
    function paint() {
      const l = shown();
      const rec = S.list.filter((x) => x.featured && (S.mode === 'all' || x.mode === S.mode));
      root.innerHTML = `<div class="pb-top card">
<div class="chipset pb-sort" role="group" aria-label="Sort">${[['hot', '🔥 Hot'], ['top', '🏆 Top'], ['new', '🆕 New']].map(([k, l2]) => `<button type="button" class="chip${S.sort === k ? ' on' : ''}" data-sort="${k}" aria-pressed="${S.sort === k}">${l2}</button>`).join('')}</div>
<input type="search" class="pb-q" data-q placeholder="🔎 Search builds, tags, members…" value="${esc(S.q)}" aria-label="Search builds">
${flag('builder') ? `<a class="btn sm" href="${BASE}builder.html" title="Make the build in the Pro Builder, then press 📣 Post">📣 Post a build</a>` : ''}</div>
<div class="pb-filters"><div class="chipset" role="group" aria-label="Mode">${[['all', 'All'], ['league', '🏟️ League'], ['rush', '⚡ Rush']].map(([k, l2]) => `<button type="button" class="chip${S.mode === k ? ' on' : ''}" data-mode="${k}" aria-pressed="${S.mode === k}">${l2}</button>`).join('')}</div>
<select data-f="arch" aria-label="Archetype"><option value="">🧬 All archetypes</option>${archOpts()}</select>
<select data-f="pos" aria-label="Position"><option value="">📍 All positions</option>${POS.map((p) => `<option${S.pos === p ? ' selected' : ''}>${p}</option>`).join('')}</select>
<select data-f="patch" aria-label="Patch"><option value="">🩹 Any patch</option><option value="current"${S.patch === 'current' ? ' selected' : ''}>✓ Current patch</option><option value="old"${S.patch === 'old' ? ' selected' : ''}>⚠ Older patches</option></select>
<label class="pb-check"><input type="checkbox" data-f="max"${S.max ? ' checked' : ''}> 🔝 MAX level only</label>
<span class="muted small pb-count">${l.length} of ${S.list.length}</span></div>
${rec.length ? `<section class="pb-rec"><h2 class="pb-h">⭐ Club recommended</h2><div class="pb-shelf">${rec.map((x) => C.mini(g, x, { head: `⭐ ${x.featured}`, foot: `<button type="button" class="pb-link" data-open data-id="${x.id}">Open →</button>` })).join('')}</div></section>` : ''}
${l.length ? `<div class="pb-grid">${l.map(card).join('')}</div>` : UI.empty(S.list.length ? { icon: '🔍', title: 'No builds match', text: 'Try fewer filters.', action: '<button type="button" class="btn sm" data-clear>Clear filters</button>' }
    : { icon: '🧬', title: 'No builds posted yet', text: 'Be the first: make your build in the Pro Builder and press 📣 Post.', action: flag('builder') ? `<a class="btn sm" href="${BASE}builder.html">🧪 Open the Pro Builder</a>` : '' })}`;
    }

    async function doVote(x, v) {
      if (await needLogin('vote')) return;
      const prev = { up: x.up, down: x.down, score: x.score, myVote: x.myVote };
      const nv = x.myVote === v ? 0 : v;
      // optimistic
      if (x.myVote > 0) x.up--; else if (x.myVote < 0) x.down--;
      if (nv > 0) x.up++; else if (nv < 0) x.down++;
      Object.assign(x, { myVote: nv, score: x.up - x.down });
      repaintCard(x);
      try { Object.assign(x, await call('/api/probuilds/vote', { id: x.id, v: nv })); repaintCard(x); } catch (e) { Object.assign(x, prev); repaintCard(x); toast(e.message, true); }
    }
    const repaintCard = (x) => { const el = root.querySelector(`.pb-card[data-id="${x.id}"]`); if (el) el.outerHTML = card(x); detailEl?.isConnected && detailBuild?.id === x.id && paintDetail(); };

    // ----- detail (modal) -----
    let detailEl = null, detailBuild = null, comments = [];
    const attrs = (ev) => [...ev.rows].sort((a, b) => b.value - a.value || b.sig - a.sig).slice(0, 8)
      .map((r) => `<div class="pb-attr${r.sig ? ' sig' : ''}"><span>${r.sig ? '★ ' : ''}${esc(r.name)}</span><i style="--w:${Math.round((r.value / ev.top) * 100)}%"></i><b>${r.value}</b></div>`).join('');
    function paintDetail() {
      const x = detailBuild, i = C.info(g, x);
      const me = session();
      const can = { mod: S.canModerate, feat: S.canFeature };
      detailEl.querySelector('[data-detail]').innerHTML = `<div class="pb-d">
<div class="pb-d-head">${vote(x)}<div class="grow"><div class="pb-labels">${C.labels(g, x, { ps: 6 })}</div>
<div class="pb-by">${UI.member({ id: x.by.id, n: x.by.n, a: x.by.a, sub: `posted ${UI.ago(x.at)}${x.updated > x.at + 6e4 ? ` · edited ${UI.ago(x.updated)}` : ''}`, href: memberHref(x.by.id) }, { size: 28 })}</div></div>
${i ? `<span class="pb-ovr big"><b>${i.ev.ovr}</b><small>OVR*</small></span>` : ''}</div>
${x.featured ? `<p class="pb-feat">⭐ Club recommended · ${esc(x.featured)}</p>` : ''}
<div class="pb-d-grid">${i ? `<div>${C.face(i.ev)}<div class="pb-attrs">${attrs(i.ev)}</div>${i.ev.fit.length ? `<p class="muted small">📍 Best fit*: ${i.ev.fit.slice(0, 3).map(([p, v]) => `<b>${esc(p)}</b> ${v}`).join(' · ')}</p>` : ''}</div>` : '<p class="muted">This build can’t be read with the current game data.</p>'}
<div>${x.desc ? `<p class="pb-d-desc">${esc(x.desc)}</p>` : '<p class="muted">No description.</p>'}${x.clip ? `<a class="btn ghost sm" href="${esc(x.clip)}" target="_blank" rel="noopener nofollow ugc">▶ Watch the clip</a>` : ''}</div></div>
<div class="pb-d-acts">${flag('builder') ? `<a class="btn sm" href="${esc(C.builderUrl(x))}">🧪 Try in sandbox</a>${me && !x.mine ? `<a class="btn ghost sm" href="${BASE}builder.html?build=${x.id}">🍴 Fork</a>` : ''}${x.mine ? `<a class="btn ghost sm" href="${BASE}builder.html?build=${x.id}">✏️ Edit in builder</a>` : ''}` : ''}
<button type="button" class="btn ghost sm" data-act="use">⭐ Use as my build</button><button type="button" class="btn ghost sm" data-act="copy">🔗 Copy link</button>
${can.feat ? (x.featured ? '<button type="button" class="btn ghost sm" data-act="unfeature">☆ Unfeature</button>' : '<button type="button" class="btn ghost sm" data-act="feature">⭐ Feature</button>') : ''}
${x.mine ? '<button type="button" class="btn ghost sm" data-act="unpost">📤 Take down</button>' : can.mod ? '<button type="button" class="btn danger sm" data-act="remove">🗑️ Remove post</button>' : ''}</div>
<h3 class="pb-h">💬 Comments <em>${comments.length}</em></h3>
<ul class="pb-comments">${comments.map((c) => `<li>${UI.member({ id: c.by.id, n: c.by.n, a: c.by.a, sub: UI.ago(c.at), href: memberHref(c.by.id) }, { size: 24 })}<p>${esc(c.text)}</p>${c.canDelete ? `<button type="button" class="x" data-del-c="${c.id}" aria-label="Delete comment" title="Delete">🗑️</button>` : ''}</li>`).join('') || '<li class="muted small">No comments yet – say what works (or doesn’t).</li>'}</ul>
${me ? `<form class="pb-cform" data-cform><textarea maxlength="500" rows="2" placeholder="Tried it? How did it play?" aria-label="Comment" required></textarea><button class="btn sm" type="submit">💬 Comment</button></form>` : `<button type="button" class="btn discord sm" data-act="login">🔐 Log in to comment</button>`}</div>`;
    }
    async function openDetail(id) {
      const base = S.list.find((x) => x.id === id);
      history.replaceState(null, '', `#b=${id}`);
      const m = UI.modal({ title: base?.title ?? 'Pro build', icon: '🧬', wide: true, body: `<div data-detail>${UI.skeleton ? UI.skeleton('rows', 4) : ''}</div>` });
      detailEl = m.el;
      m.then(() => { detailEl = null; history.replaceState(null, '', location.pathname + location.search); });
      try {
        const d = await call(`/api/probuilds/get?id=${id}`);
        detailBuild = base ? Object.assign(base, d.build) : d.build;
        comments = d.comments;
        detailEl.querySelector('h2').textContent = detailBuild.title;
        paintDetail();
      } catch (e) { detailEl.querySelector('[data-detail]').innerHTML = UI.empty({ icon: '🕳️', title: 'Build not found', text: e.message }); return; }
      detailEl.addEventListener('click', async (e) => {
        const t = e.target.closest('button');
        if (!t) return;
        const x = detailBuild;
        if (t.dataset.vote) return doVote(x, +t.dataset.vote);
        if (t.dataset.delC) {
          if (!(await UI.confirm({ title: 'Delete this comment?', ok: 'Delete', danger: true }))) return;
          try { const r = await call('/api/probuilds/comment/delete', { comment: +t.dataset.delC }); comments = r.comments; Object.assign(x, { comments: r.build.comments }); paintDetail(); repaintCard(x); } catch (er) { toast(er.message, true); }
          return;
        }
        const act = t.dataset.act;
        if (act === 'login') return needLogin('comment');
        if (act === 'use') return useAsMine(x);
        if (act === 'copy') { const u = `${location.origin}${location.pathname}#b=${x.id}`; try { await navigator.clipboard.writeText(u); toast('🔗 Link copied'); } catch { prompt('Copy this link:', u); } return; }
        if (act === 'feature' || act === 'unfeature') {
          let label = null;
          if (act === 'feature') {
            label = await new Promise((ok) => { const m = UI.modal({ title: 'Club recommended', icon: '⭐', body: `<label class="pb-field"><span>Label (position · mode)</span><input maxlength="30" value="${esc(`${x.position ?? ''} · ${x.mode === 'rush' ? 'Rush' : 'League'}`)}" autofocus></label>`, actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '⭐ Feature', value: 'ok' }] }); m.then((v) => ok(v && m.el.querySelector('input').value.trim())); });
            if (label == null) return;
          }
          try { const r = await call('/api/probuilds/feature', { id: x.id, label: act === 'feature' ? label : null }); Object.assign(x, r.build); comments = r.comments; paintDetail(); paint(); toast(x.featured ? '⭐ Featured as Club recommended' : 'No longer featured'); } catch (er) { toast(er.message, true); }
          return;
        }
        if (act === 'unpost' || act === 'remove') {
          if (!(await UI.confirm({ title: act === 'remove' ? `Remove “${x.title}”?` : 'Take your build down?', text: act === 'remove' ? `It leaves the board. ${x.by.n} keeps the build in My builds.` : 'It leaves the board but stays in My builds – you can post it again.', ok: act === 'remove' ? 'Remove' : 'Take down', danger: true }))) return;
          const keep = S.list; S.list = S.list.filter((b) => b.id !== x.id); m.close(); paint(); // optimistic
          try { await call('/api/probuilds/unpost', { id: x.id }); toast(act === 'remove' ? 'Post removed' : 'Taken down'); } catch (er) { S.list = keep; paint(); toast(er.message, true); }
        }
      });
      detailEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ta = e.target.querySelector('textarea'), btn = e.target.querySelector('button');
        const text = ta.value.trim();
        if (!text) return;
        btn.disabled = true;
        try { const r = await call('/api/probuilds/comment', { id: detailBuild.id, text }); comments = r.comments; Object.assign(detailBuild, { comments: r.build.comments }); paintDetail(); repaintCard(detailBuild); } catch (er) { toast(er.message, true); btn.disabled = false; }
      });
    }

    root.addEventListener('click', async (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const cardEl = t.closest('[data-id]');
      const x = cardEl && S.list.find((b) => b.id === +cardEl.dataset.id);
      if (t.dataset.sort) { S.sort = t.dataset.sort; keep(); paint(); }
      else if (t.dataset.mode) { S.mode = t.dataset.mode; keep(); paint(); }
      else if ('clear' in t.dataset) { Object.assign(S, { mode: 'all', arch: '', pos: '', patch: '', max: false, q: '' }); keep(); paint(); }
      else if (x && t.dataset.vote) doVote(x, +t.dataset.vote);
      else if (x && 'use' in t.dataset) useAsMine(x);
      else if (x && 'open' in t.dataset) openDetail(x.id);
    });
    root.addEventListener('change', (e) => {
      const f = e.target.dataset.f;
      if (!f) return;
      S[f] = f === 'max' ? e.target.checked : e.target.value;
      paint();
    });
    let qt;
    root.addEventListener('input', (e) => {
      if (!e.target.matches('[data-q]')) return;
      S.q = e.target.value;
      clearTimeout(qt);
      qt = setTimeout(() => { const pos = e.target.selectionStart; paint(); const q = root.querySelector('[data-q]'); q.focus(); q.setSelectionRange(pos, pos); }, 180);
    });
    paint();
    let deep = location.hash;
    try { deep ||= sessionStorage.getItem(OPEN) || ''; sessionStorage.removeItem(OPEN); } catch {}
    const want = +(new URLSearchParams(deep.replace(/^#/, '')).get('b'));
    if (want) openDetail(want);
  }

  // ================= portal: everyone's build by position (PB.4) =================
  async function portal(el) {
    el.innerHTML = UI.skeleton ? UI.skeleton('rows', 4) : '';
    let picks, g;
    try { await loadCard(); [{ picks }, g] = await Promise.all([call('/api/probuilds/squad'), NXBuildCard.ready()]); } catch (e) { el.innerHTML = UI.empty({ icon: '📡', title: 'Couldn’t load builds', text: e.message }); return; }
    let mode = 'league';
    const paint = () => {
      const list = picks.filter((p) => p.mode === mode);
      el.innerHTML = `<h3>🧬 Squad builds</h3><p class="muted small">The build each member marked as theirs (⭐ Use as my build) – ${picks.length} picks from ${new Set(picks.map((p) => p.user.id)).size} members.</p>
<div class="chipset">${Object.entries(NXBuildCard.MODE).map(([k, [ic, l]]) => `<button type="button" class="chip${mode === k ? ' on' : ''}" data-pm="${k}">${ic} ${l} <em>${picks.filter((p) => p.mode === k).length}</em></button>`).join('')}</div>
${list.length ? LINES.map(([line, label]) => {
    const rows = list.filter((p) => (LINE[p.build.position] || '') === line).sort((a, b) => POS.indexOf(a.build.position) - POS.indexOf(b.build.position));
    return rows.length ? `<h4 class="pb-h">${label} <em>${rows.length}</em></h4><div class="pb-squad">${rows.map((p) => `<div class="pb-squad-row">${UI.member({ id: p.user.id, n: p.user.n, a: p.user.a, sub: p.build.position || '–', href: memberHref(p.user.id) }, { size: 28 })}${NXBuildCard.mini(g, p.build, { href: NXBuildCard.builderUrl(p.build), head: `${NXBuildCard.MODE[p.mode][0]} ${p.build.position || ''} · picked ${UI.ago(p.build.at)}` })}</div>`).join('')}</div>` : '';
  }).join('') : UI.empty({ icon: '🧬', title: `No ${mode === 'rush' ? 'Rush' : 'League'} builds picked yet`, text: 'Members pick theirs with ⭐ Use as my build in the Pro Builder or on Pro Builds.' })}`;
    };
    el.onclick = (e) => { const b = e.target.closest('[data-pm]'); if (b) { mode = b.dataset.pm; paint(); } };
    paint();
  }

  window.NXProBuilds = { board, portal, useAsMine };
  const root = document.querySelector('[data-probuilds]');
  // Start after app.js has run (it sets window.NXViewer – who's looking, which flags are on).
  if (root) document.addEventListener('DOMContentLoaded', () => { if (!root.closest('[hidden]')) board(root); });
})();
