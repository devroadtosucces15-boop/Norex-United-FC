// Hub › Handbook: the live club docs (/api/docs) and Play Style (/api/playstyle), read-only, plus the one member write:
// acknowledging the current club rules (POST /api/docs/ack). Squad only; the server decides what each member may see.
// Text is the live site's markdown-lite (docs-md.js). Panels load as skeletons and land; errors toast and offer a retry.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const docsEl = $('#hbdocs'), psEl = $('#hbps'); if (!docsEl || !psEl) return;
  const A = window.NorexAuth, M = window.NorexMotion;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const md = (s) => (window.NXMd ? NXMd.html(s, { host: location.hostname }) : `<p>${esc(s)}</p>`);
  const day = (t) => { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
  const put = (el, html, then) => (M ? M.land(el, html, then) : (el.innerHTML = html, then && then(el)));
  const failBox = (what, e) => `<div class="panel hb-empty"><span>📡</span><div><b>Could not load ${what}</b><p class="muted small">${esc(e?.message || 'The club server did not answer.')}</p><button type="button" class="btn ghost" data-hbretry>↻ Try again</button></div></div>`;
  if (!window.NOREX_API || !A?.token) { [docsEl, psEl].forEach((el) => (el.innerHTML = '<p class="muted small">The live docs load here for signed-in members.</p>')); return; }

  // ---------- club docs ----------
  const AREAS = [['announce', '📣', 'Announcements', 'News from the managers, newest first.'], ['requirements', '✅', 'Requirements', 'What we expect from everyone in the squad.'], ['rules', '📜', 'Rules', 'The club rules. Members acknowledge each new version.'], ['faq', '❓', 'FAQ', 'Questions new and old members ask.'], ['glossary', '📖', 'Glossary', 'Game terms and the numbers on this site, explained.']];
  let D = null;
  const ackBar = (R) => !R || !R.version ? '' : R.acked
    ? `<div class="hb-ack ok"><span class="hb-tick">✓</span><div><b>You have acknowledged the rules</b><small class="muted">Version ${R.version}${R.ackedAt ? ` · ${day(R.ackedAt)}` : ''}</small></div></div>`
    : `<div class="hb-ack"><span>📜</span><div><b>The club rules changed (version ${R.version})</b><small class="muted">Read them below, then confirm. Managers can see who has.</small></div><button type="button" class="btn gold" data-hback>✍️ I have read the rules</button></div>`;
  const item = (x) => `<article class="hb-item${x.pinned ? ' pin' : ''}" id="doc-${x.id}"><h4>${x.pinned ? '📌 ' : ''}${esc(x.title)}</h4><div class="md">${md(x.body)}</div><small class="muted">${esc(x.editedBy || x.by || '')}${x.editedAt || x.at ? ` · ${day(x.editedAt || x.at)}` : ''}${x.version > 1 ? ` · v${x.version}` : ''}</small></article>`;
  const docsHtml = () => {
    const by = Object.fromEntries(AREAS.map(([k]) => [k, (D.items || []).filter((x) => x.area === k)]));
    return ackBar(D.rules) + `<div class="hb-accs">${AREAS.map(([k, ic, l, sub], i) => `<details class="hb-acc" id="hb-${k}"${(k === 'rules' && D.rules?.version && !D.rules.acked) || (i === 0 && by[k].length) ? ' open' : ''}><summary><span class="hb-ic">${ic}</span><span><b>${l}</b><small class="muted">${sub}</small></span><span class="pill">${by[k].length}</span></summary><div class="hb-body">${by[k].length ? by[k].map(item).join('') : '<p class="muted small">Nothing written here yet.</p>'}</div></details>`).join('')}</div>`;
  };
  const loadDocs = () => { M?.skeleton(docsEl, 5); A.call('/api/docs').then((r) => { D = r; put(docsEl, docsHtml(), openHash); }).catch((e) => { docsEl.removeAttribute('aria-busy'); docsEl.innerHTML = failBox('the club docs', e); M?.toast(e.message || 'Could not load the docs', { kind: 'err' }); }); };
  docsEl.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-hback]'); if (!b) return;
    b.disabled = true;
    try {
      const r = await (M ? M.submit(b, () => A.call('/api/docs/ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })) : A.call('/api/docs/ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
      D = r; const bar = $('.hb-ack', docsEl); if (bar) { bar.outerHTML = ackBar(D.rules); const nb = $('.hb-ack', docsEl); nb.classList.add('mx-pop'); M?.pulse($('.hb-tick', nb)); }
      M?.toast('Thanks, rules acknowledged', { kind: 'ok' });
    } catch (er) { b.disabled = false; M?.toast(er.message || 'Could not save that', { kind: 'err' }); }
  });

  // ---------- play style (League ⇄ Rush) ----------
  const PS = [['philosophy', '🧭', 'Philosophy', ['What NOREX football looks like, in one line', 'In possession: how we build, where we attack', 'Out of possession: when we press, when we drop', 'The non-negotiables everyone sticks to'], ['What NOREX Rush looks like, in one line', 'How the small pitch changes our game', 'Risk vs control: when to go for it', 'The non-negotiables everyone sticks to']],
    ['formations', '📐', 'Formations', ['Our main formation and why', 'Plan B when chasing a game', 'Plan C when protecting a lead', 'Who covers which zone'], ['Our usual shape and why', 'Shape when we lose the ball', 'Shape when we need a goal', 'Who covers which zone']],
    ['positions', '🧍', 'Position by position', ['GK: distribution, sweeping, organising', 'Centre-backs and full-backs: line height, overlaps, marking', 'Midfield: who holds, who goes', 'Wingers and attackers: runs, pressing, finishing'], ['Each role in our Rush setup and its job', 'Who holds, who roams', 'Pressing triggers per role', 'Comms: who calls what']],
    ['setpieces', '🎯', 'Set pieces', ['Attacking corners: routine and who goes where', 'Defending corners: zonal or man-marking', 'Free kicks and penalties: who takes them', 'Throw-ins and kick-offs'], ['Attacking restarts: our routine', 'Defending restarts', 'Penalties: who takes them', 'Kick-offs']],
    ['tactics', '🧠', 'Tactics and instructions', ['Team tactics we use (and when we switch)', 'Player instructions by position', 'In-game adjustments at half-time', 'Comms calls we all use'], ['How we set up tactically', 'Player instructions by role', 'Adjustments between games', 'Comms calls we all use']]];
  let P = null, mode = /^#rush/.test(location.hash) ? 'rush' : 'league';
  const psHtml = () => {
    const row = (k) => (P.sections || []).find((x) => x.mode === mode && x.section === k), done = PS.filter(([k]) => row(k)).length;
    return `<div class="chips hb-modes" role="tablist">${[['league', '🏆 League'], ['rush', '⚡ Rush']].map(([k, l]) => `<button type="button" role="tab" class="chip${k === mode ? ' on' : ''}" aria-selected="${k === mode}" data-psm="${k}">${l}</button>`).join('')}<span class="muted small">${done} of ${PS.length} parts written</span></div>
<div class="hb-accs">${PS.map(([k, ic, l, lg, rs]) => { const r = row(k); return `<details class="hb-acc${r ? '' : ' ph'}" id="${mode}-${k}"><summary><span class="hb-ic">${ic}</span><span><b>${esc(r?.title || l)}</b><small class="muted">${r ? `Updated ${day(r.editedAt || r.at)}${r.editedBy || r.by ? ` by ${esc(r.editedBy || r.by)}` : ''}` : 'Not written yet'}</small></span>${r ? '' : '<span class="pill s">🚧 To write</span>'}</summary><div class="hb-body">${r ? `<div class="md">${md(r.body)}</div>` : `<p class="muted small">What goes here:</p><ul class="hb-outline">${(mode === 'rush' ? rs : lg).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`}</div></details>`; }).join('')}</div>`;
  };
  const loadPs = () => { M?.skeleton(psEl, 5); A.call('/api/playstyle').then((r) => { P = r; put(psEl, psHtml(), openHash); }).catch((e) => { psEl.removeAttribute('aria-busy'); psEl.innerHTML = failBox('the play style', e); }); };
  psEl.addEventListener('click', (e) => { const b = e.target.closest('[data-psm]'); if (!b || b.dataset.psm === mode) return; mode = b.dataset.psm; history.replaceState(null, '', '#' + mode); put(psEl, psHtml()); });

  // deep links: #rules, #league-setpieces, #rush-setpieces … open that part and bring it into view
  function openHash() {
    const h = location.hash.slice(1); if (!h) return;
    const m = /^(league|rush)-/.exec(h); if (m && P && m[1] !== mode) { mode = m[1]; psEl.innerHTML = psHtml(); }
    const el = d.getElementById(h) || d.getElementById('hb-' + h); if (!el || el.tagName !== 'DETAILS') return;
    el.open = true; el.classList.add('flash'); setTimeout(() => el.scrollIntoView({ block: 'start', behavior: M?.mode === 'full' ? 'smooth' : 'auto' }), 120);
  }
  addEventListener('hashchange', openHash);
  d.addEventListener('click', (e) => { if (!e.target.closest('[data-hbretry]')) return; const box = e.target.closest('#hbdocs,#hbps'); box === docsEl ? loadDocs() : loadPs(); });
  (A.ready || Promise.resolve()).then(() => { loadDocs(); loadPs(); });
})();
