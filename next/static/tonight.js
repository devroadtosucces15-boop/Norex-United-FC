// Tonight's plays (B3): the plays a manager pinned to the next match night in the Dugout (up to four, published only),
// with my learned state, from /api/locker (`next.plays`). One model, two views: a compact row on the My Locker next-match
// card and the full list in Match Night. "Learned it" writes POST /api/plays/:id/learned (the same state as the live
// Playbook and the Discord button); every view on the page redraws from the one model.
(() => {
  const d = document, A = window.NorexAuth, M = window.NorexMotion;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const CAT = { 'set-piece': ['🎯', 'Set piece'], formation: ['🧩', 'Formation'], drill: ['🏃', 'Drill'] };
  const study = (id) => `../tactics.html#play${encodeURIComponent(id)}`; // the live Playbook until the Studio is ported (B1)
  let next = null; const views = new Set();
  const state = (p) => p.learned ? ['got', '✅', 'Learned'] : p.assigned ? ['todo', '📌', 'Assigned to you'] : ['opt', '▶', 'Optional'];
  const count = () => { const l = next?.plays || []; return { n: l.length, got: l.filter((p) => p.learned).length, todo: l.filter((p) => p.assigned && !p.learned).length }; };
  const name = (n) => n.title || (n.type ? n.type[0].toUpperCase() + n.type.slice(1) : 'Match night');
  const when = (t) => { try { return new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

  // compact: chips under the countdown on the locker card
  const row = () => { const l = next?.plays || []; if (!l.length) return ''; const c = count();
    return `<div class="tp-row"><small class="muted">📋 Plays for tonight · <b class="num">${c.got}</b>/${c.n} learned</small><div class="tp-chips">${l.map((p) => { const [k, i] = state(p); return `<a class="tp-chip ${k}" href="hub-matchnight.html#mn-plays" title="${esc(state(p)[2])}">${i} ${esc(p.title)}</a>`; }).join('')}</div></div>`; };
  // full: Match Night list with study + learned buttons
  const full = () => { if (!next) return `<div class="panel sq-empty"><span>🗓️</span><div><b>No match night scheduled</b><p class="muted small">When the managers schedule one and pin plays to it, they show up here to learn before kick-off.</p></div></div>`;
    const l = next.plays || [], c = count();
    if (!l.length) return `<div class="panel sq-empty"><span>📋</span><div><b>No plays pinned for ${esc(name(next))} yet</b><p class="muted small">${esc(when(next.start))}. The managers pin up to four set pieces, shapes or drills in the Dugout. You’ll get them here.</p></div></div>`;
    const f = c.n ? c.got / c.n : 0;
    return `<div class="tp-head panel"><div class="tp-ring" style="--f:${f.toFixed(3)}" role="img" aria-label="${c.got} of ${c.n} learned"><b class="num">${c.got}/${c.n}</b><small>learned</small></div><div><div class="eyebrow">📋 ${esc(name(next))}</div><p class="small" style="margin:4px 0 0">${esc(when(next.start))}</p><p class="small muted" style="margin:4px 0 0">${c.got === c.n ? '🎉 All learned. You are ready for kick-off.' : c.todo ? `📌 <b>${c.todo}</b> assigned to you still to learn.` : 'Study them before kick-off and tick each one off.'}</p></div></div>
<ul class="tp-list">${l.map((p, i) => { const [k, ic, lab] = state(p), [ci, cl] = CAT[p.category] || ['📋', 'Play'];
      return `<li class="tp-c ${k}" style="--i:${i}"><span class="tp-ci" aria-hidden="true">${ci}</span><div class="tp-t"><b>${esc(p.title)}</b><small class="muted">${cl} · <span class="tp-s">${ic} ${lab}</span></small></div><div class="tp-a"><a class="btn ghost" href="${study(p.id)}" target="_blank" rel="noopener">▶ Study it</a><button type="button" class="btn ${p.learned ? 'ghost' : 'gold'}" data-learn="${p.id}" aria-pressed="${!!p.learned}">${p.learned ? '↺ Not yet' : '✅ Learned it'}</button></div></li>`; }).join('')}</ul>
<p class="tiny muted" style="margin-top:10px">Ticks are shared with the live Playbook and the Discord “Learned it” button. Managers see who is ready in the Dugout.</p>`; };
  const paint = () => views.forEach(([el, kind]) => { el.innerHTML = kind === 'row' ? row() : full(); });

  d.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-learn]'); if (!b || !next) return;
    const p = next.plays.find((x) => x.id === +b.dataset.learn); if (!p) return;
    const want = !p.learned, job = () => A.call(`/api/plays/${p.id}/learned`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learned: want }) });
    try { await (M ? M.submit(b, job, { burst: want }) : job()); p.learned = want; if (want) p.assigned = true; setTimeout(paint, M?.off() ? 0 : 450);
      const c = count(); M?.toast(want ? (c.got === c.n ? 'All plays learned. Ready for kick-off' : `${p.title}: learned`) : `${p.title}: marked not learned`, { kind: 'ok', icon: want ? (c.got === c.n ? '🎉' : '✅') : '↺' }); }
    catch (er) { M?.toast(er.message || 'Could not save that', { kind: 'err' }); }
  });

  window.NorexTonight = {
    // the locker already loads /api/locker: hand it the `next` object and a mount for the compact row
    use(n, el) { next = n || null; if (el) { views.add([el, 'row']); el.innerHTML = row(); } },
    // Match Night: loads /api/locker itself
    mount(el) { views.add([el, 'full']); M?.skeleton(el, 3);
      return A.call('/api/locker').then((L) => { next = L.next || null; M ? M.land(el, full()) : (el.innerHTML = full()); })
        .catch((er) => { el.removeAttribute('aria-busy'); el.innerHTML = `<div class="panel sq-empty"><span>📡</span><div><b>Could not load tonight’s plays</b><p class="muted small">${esc(er?.message || 'The club server did not answer.')}</p></div></div>`; }); },
  };
  const mn = d.getElementById('mnplays');
  if (mn && window.NOREX_API && A?.token) (A.ready || Promise.resolve()).then(() => window.NorexTonight.mount(mn));
})();
