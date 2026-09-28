// Archetype builder sandbox (roadmap PB.2, sub-step a): archetype picker, level 1…cap with MAX, AP spending with
// live bars, over-cap guards, undo/reset, ★ signature attributes, face stats + OVR estimate, share link.
// Game data comes from NXGame.load() (newest published version), the maths from build-math.js.
(() => {
  const root = document.querySelector('[data-builder]');
  if (!root) return;
  const $ = (s, el = root) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const M = window.NXBuildMath;
  const ICON = { GK: '🧤', DEF: '🛡️', MID: '🎯', FWD: '⚡' };
  const GICON = { pace: '💨', shooting: '🎯', passing: '🅿️', dribbling: '🪄', defending: '🛡️', physical: '💪', goalkeeping: '🧤' };
  let g, b, hist = [];
  const toast = (m, t) => (window.UI ? UI.toast(m, t) : null);

  const push = () => { hist.push(JSON.stringify(b)); if (hist.length > 100) hist.shift(); };
  const setHash = () => history.replaceState(null, '', `#${M.encode(g, b)}`);

  function view() {
    const ev = M.evaluate(g, b);
    const st = ev.status;
    const groups = g.archetypeGroups || [];
    const pct = (v) => Math.max(0, Math.min(100, (v / ev.top) * 100));
    const rowsBy = (id) => ev.rows.filter((r) => r.group === id);
    const relevant = (grpId) => (ev.arch.group === 'GK') === (grpId === 'goalkeeping') || grpId === 'physical' || (ev.arch.group === 'GK' && grpId === 'pace');
    const card = (grp) => {
      const rows = rowsBy(grp.id);
      const avg = Math.round(rows.reduce((s, r) => s + r.value, 0) / (rows.length || 1));
      return `<section class="bd-grp${relevant(grp.id) ? '' : ' dim'}"><header><span>${GICON[grp.id] ?? '•'} ${esc(grp.name)}</span><b>${avg}</b></header>
${rows.map((r) => {
    const c = M.canAdd(g, ev, r.name);
    return `<div class="bd-row${r.sig ? ' sig' : ''}${r.add ? ' up' : ''}" data-attr="${esc(r.name)}">
<span class="bd-name">${r.sig ? '<i title="Signature attribute">★</i> ' : ''}${esc(r.name)}</span>
<span class="bd-bar" aria-hidden="true"><i class="b" style="width:${pct(r.base)}%"></i><i class="a" style="left:${pct(r.base)}%;width:${pct(r.add)}%"></i>${r.bonus ? `<i class="m" style="left:${pct(r.base + r.add)}%;width:${pct(r.bonus)}%"></i>` : ''}</span>
<button type="button" class="bd-pm" data-d="-1" aria-label="Lower ${esc(r.name)}"${r.add ? '' : ' disabled'}>−</button>
<b class="bd-val">${r.value}${r.add ? `<small>+${r.add}</small>` : ''}${r.bonus ? `<small class="gold" title="Mastery bonus">+${r.bonus}</small>` : ''}</b>
<button type="button" class="bd-pm" data-d="1" aria-label="Raise ${esc(r.name)}"${c == null ? ' disabled' : ''} title="${c == null ? (r.value >= ev.top ? 'At the maximum' : 'Not enough AP') : `Costs ${c} AP`}">+</button></div>`;
  }).join('')}</section>`;
    };
    const leftPct = ev.total ? Math.max(0, (ev.left / ev.total) * 100) : 0;
    return `${st.preview ? `<div class="bd-note card"><b>🧪 Preview numbers</b> <span class="muted small">${[!st.base && 'archetype base attributes', !st.ap && 'AP per level', !st.costs && 'AP costs'].filter(Boolean).join(', ')} ${st.base && st.ap ? 'is' : 'are'} not entered from the in-game screens yet, so the builder uses placeholder values. Level cap, Masteries and archetypes come from game data <code>${esc(g.version)}</code>.</span></div>` : ''}
<div class="bd-picker card">${groups.map((grp) => `<div class="bd-pgrp"><small>${ICON[grp.id] ?? ''} ${esc(grp.name)}</small><div class="chipset">${(g.archetypes || []).filter((a) => a.group === grp.id).map((a) => `<button type="button" class="chip${a.id === ev.arch.id ? ' on' : ''}" data-arch="${esc(a.id)}">${esc(a.name)}</button>`).join('')}</div></div>`).join('')}</div>
<div class="bd-main">
<div class="bd-grid">${(g.attributeGroups || []).map(card).join('')}</div>
<aside class="bd-side card">
<div class="bd-arch"><span class="bd-ic">${ICON[ev.arch.group] ?? '⚽'}</span><div><small>${esc(groups.find((x) => x.id === ev.arch.group)?.name ?? '')}</small><h2>${esc(ev.arch.name)}</h2></div><div class="bd-ovr" title="Estimated overall"><b>${ev.ovr}</b><small>OVR*</small></div></div>
<label class="bd-lvl"><span>Level <b>${ev.level}</b> / <span>${ev.cap}</span>${ev.level === ev.cap ? ' <span class="tag home">MAX</span>' : ''}</span>
<span class="row"><input type="range" min="1" max="${ev.cap}" value="${ev.level}" data-level aria-label="Level"><button type="button" class="btn sm${ev.level === ev.cap ? ' ghost' : ''}" data-max>MAX</button></span></label>
<div class="bd-ap${ev.left === 0 && ev.total ? ' full' : ''}"><div><small>Archetype points left</small><b>${ev.left}</b><span class="muted">/ ${ev.total}</span></div><span class="bd-apbar"><i style="width:${leftPct}%"></i></span></div>
<div class="bd-face">${ev.face.map(([k, v]) => `<div><small>${k}</small><b class="${v >= 80 ? 'hi' : v >= 65 ? 'mid' : ''}">${v}</b></div>`).join('')}</div>
<div class="bd-acts"><button type="button" class="btn ghost sm" data-undo${hist.length ? '' : ' disabled'}>↶ Undo</button><button type="button" class="btn ghost sm" data-reset${ev.used ? '' : ' disabled'}>⟲ Reset</button><button type="button" class="btn sm" data-share>🔗 Share link</button></div>
<p class="muted small">* Face stats are group averages and OVR is a weighted estimate – EA doesn't publish its formula. Shift-click +/− moves 5 points.</p>
${(g.masteries || []).some((m) => m.archetype === ev.arch.id) ? `<div class="bd-mast"><b>🏅 Masteries</b>${(g.masteries || []).filter((m) => m.archetype === ev.arch.id).map((m) => `<span class="${ev.level >= m.level ? 'on' : ''}">L${m.level}: ${Object.entries(m.bonus).map(([k, v]) => `+${v} ${esc(k)}`).join(', ')}</span>`).join('')}</div>` : ''}
</aside></div>`;
  }

  function draw() {
    const y = scrollY;
    $('[data-bd-body]').innerHTML = view();
    scrollTo(0, y);
  }

  function step(name, d, times) {
    push();
    for (let i = 0; i < times; i++) {
      const ev = M.evaluate(g, b);
      const cur = b.spent[name] || 0;
      if (d > 0 && M.canAdd(g, ev, name) == null) break;
      if (d < 0 && !cur) break;
      b.spent[name] = cur + d;
      if (!b.spent[name]) delete b.spent[name];
    }
    if (hist.at(-1) === JSON.stringify(b)) hist.pop();
    setHash(); draw();
  }

  root.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.dataset.arch) {
      if (t.dataset.arch === b.arch) return;
      push(); b = { ...b, arch: t.dataset.arch, spent: {} }; setHash(); draw();
    } else if (t.dataset.d) step(t.closest('[data-attr]').dataset.attr, +t.dataset.d, e.shiftKey ? 5 : 1);
    else if ('max' in t.dataset) { push(); b.level = M.capOf(g); setHash(); draw(); }
    else if ('undo' in t.dataset && hist.length) { b = JSON.parse(hist.pop()); setHash(); draw(); }
    else if ('reset' in t.dataset) { push(); b.spent = {}; setHash(); draw(); toast('Points reset – Undo brings them back'); }
    else if ('share' in t.dataset) {
      setHash();
      try { await navigator.clipboard.writeText(location.href); toast('🔗 Link copied – anyone can open this build'); } catch { prompt('Copy this link:', location.href); }
    }
  });
  root.addEventListener('input', (e) => {
    if (!e.target.matches('[data-level]')) return;
    const lvl = +e.target.value;
    const next = M.fit(g, { ...b, level: lvl });
    const lost = Object.keys(b.spent).some((k) => (next.spent[k] || 0) !== b.spent[k]);
    b = next; setHash();
    // Update only the side numbers while dragging; full redraw on release keeps the slider under the finger.
    const ev = M.evaluate(g, b);
    $('.bd-lvl b').textContent = ev.level;
    $('.bd-ap b').textContent = ev.left;
    $('.bd-ap .muted').textContent = `/ ${ev.total}`;
    if (lost) draw();
  });
  root.addEventListener('change', (e) => { if (e.target.matches('[data-level]')) { push(); draw(); } });

  (window.NXGame ? NXGame.load() : fetch(`${document.body.dataset.base || ''}api/game.json`).then((r) => r.json())).then((data) => {
    g = data;
    const first = (g.archetypes || [])[0];
    if (!first) { $('[data-bd-body]').innerHTML = '<p class="muted">No archetypes in the game data yet.</p>'; return; }
    const shared = location.hash.length > 1 ? M.decode(g, location.hash) : null;
    b = shared ? { arch: shared.arch, level: shared.level, spent: shared.spent } : { arch: first.id, level: M.capOf(g), spent: {} };
    if (shared?.version && shared.version !== g.version) toast(`Built on ${shared.version} – shown with the current rules (${g.version})`);
    draw();
  }).catch(() => { $('[data-bd-body]').innerHTML = '<p class="muted">Couldn’t load the game data – try again in a moment.</p>'; });
})();
