// Archetype builder sandbox (roadmap PB.2): (a) archetype picker, level 1…cap with MAX, AP spending with live bars,
// over-cap guards, undo/reset, ★ signature attributes, face stats + OVR estimate, share link; (b) PlayStyles,
// Specializations, Facilities and Body tabs (height/weight modifiers as +/− badges), position fit, League/Rush notes.
// Game data comes from NXGame.load() (newest published version), the maths from build-math.js.
(() => {
  const root = document.querySelector('[data-builder]');
  if (!root) return;
  const $ = (s, el = root) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const M = window.NXBuildMath;
  const ICON = { GK: '🧤', DEF: '🛡️', MID: '🎯', FWD: '⚡' };
  const GICON = { pace: '💨', shooting: '🎯', passing: '🅿️', dribbling: '🪄', defending: '🛡️', physical: '💪', goalkeeping: '🧤' };
  let g, b, hist = [], tab = 'playstyles';
  const TABS = [['playstyles', '💫 PlayStyles'], ['specializations', '🎓 Specializations'], ['facilities', '🏟️ Facilities'], ['body', '📏 Body']];
  const none = (what) => `<div class="bd-empty"><span>🗂️</span><div><b>No ${what} in the game data yet</b><p class="muted small">Managers add them from the in-game screens (portal → 🎮 Game rules → changed values). They show up here straight away.</p></div></div>`;
  const toast = (m, t) => (window.UI ? UI.toast(m, t) : null);

  const push = () => { hist.push(JSON.stringify(b)); if (hist.length > 100) hist.shift(); };
  const setHash = () => history.replaceState(null, '', `#${M.encode(g, b)}`);

  function pane(ev) {
    const c = ev.choices, sl = ev.slots;
    const fx = (bonus) => Object.entries(bonus || {}).map(([k, v]) => `<span class="${v > 0 ? 'pos' : 'neg'}">${v > 0 ? '+' : ''}${v} ${esc(k)}</span>`).join('');
    if (tab === 'playstyles') {
      const list = g.playstyles || [];
      if (!list.length) return none('PlayStyles');
      return `<p class="muted small">Pick up to <b>${sl.playstyles}</b> PlayStyles and <b>${sl.plus}</b> PlayStyle+ (click again to upgrade to + or remove). ${c.ps.length}/${sl.playstyles} · ${c.plus.length}/${sl.plus}+</p>
<div class="bd-opts">${list.map((p) => { const on = c.ps.includes(p.id), pl = c.plus.includes(p.id); return `<button type="button" class="bd-opt${on ? ' on' : ''}${pl ? ' plus' : ''}" data-ps="${esc(p.id)}"${p.desc ? ` title="${esc(p.desc)}"` : ''}><span>${esc(p.icon || '💫')}</span><b>${esc(p.name)}${pl ? ' <i>+</i>' : ''}</b>${p.plus ? '' : '<small class="muted">no +</small>'}</button>`; }).join('')}</div>`;
    }
    if (tab === 'specializations') {
      const list = M.specsFor(g, b.arch);
      if (!list.length) return none(`Specializations for ${esc(ev.arch.name)}`);
      return `<p class="muted small">One Specialization per build – its bonus shows as a badge on the attribute.</p><div class="bd-opts">${list.map((s) => `<button type="button" class="bd-opt wide${c.sp === s.id ? ' on' : ''}" data-sp="${esc(s.id)}"><span>🎓</span><b>${esc(s.name)}</b>${s.desc ? `<small class="muted">${esc(s.desc)}</small>` : ''}<span class="bd-fx">${fx(s.bonus)}</span></button>`).join('')}</div>`;
    }
    if (tab === 'facilities') {
      const list = g.facilities || [];
      if (!list.length) return none('Facilities');
      return `<p class="muted small">Up to <b>${sl.facilities}</b> Facilities. ${c.fa.length}/${sl.facilities}</p><div class="bd-opts">${list.map((f) => `<button type="button" class="bd-opt wide${c.fa.includes(f.id) ? ' on' : ''}" data-fa="${esc(f.id)}"><span>🏟️</span><b>${esc(f.name)}</b>${f.desc ? `<small class="muted">${esc(f.desc)}</small>` : ''}<span class="bd-fx">${fx(f.bonus)}</span></button>`).join('')}</div>`;
    }
    const H = M.rangeOf(g, 'height'), Wt = M.rangeOf(g, 'weight');
    const mods = M.modsOf(g, b);
    const from = (src) => Object.entries(mods).flatMap(([k, l]) => l.filter(([f]) => f === src).map(([, v]) => [k, v]));
    const badge = (src) => { const l = from(src); return l.length ? `<span class="bd-fx">${fx(Object.fromEntries(l))}</span>` : '<span class="muted small">No modifier at this value</span>'; };
    const noTables = !g.body?.heightMods?.length && !g.body?.weightMods?.length;
    return `<div class="bd-body">
<label><span>📏 Height <b data-bv="h">${c.h}</b> cm</span><input type="range" min="${H.min}" max="${H.max}" value="${c.h}" data-body="h" aria-label="Height">${badge('Height')}</label>
<label><span>⚖️ Weight <b data-bv="w">${c.w}</b> kg</span><input type="range" min="${Wt.min}" max="${Wt.max}" value="${c.w}" data-body="w" aria-label="Weight">${badge('Weight')}</label>
${noTables ? '<p class="muted small">🧪 Height/weight modifier tables aren’t entered yet, so body size doesn’t change attributes here. Managers add <code>body.heightMods</code> / <code>weightMods</code> in Game rules.</p>' : ''}</div>`;
  }

  // Rule-based notes: where this build fits in League (11v11) and what matters more in Rush (small-sided).
  function notes(ev) {
    const f = Object.fromEntries(ev.face);
    const val = (n) => ev.rows.find((r) => r.name === n)?.value ?? 0;
    const [best] = ev.fit;
    const out = [['🏟️', `<b>League:</b> best fit <b>${esc(best?.[0] ?? '–')}</b>${ev.fit[1] ? `, also ${ev.fit.slice(1).map(([p]) => esc(p)).join(' / ')}` : ''}.`]];
    if (ev.arch.group === 'GK') out.push(['⚡', '<b>Rush:</b> keeper builds are tuned for League – check the current Rush rules for goalkeepers.']);
    else {
      const pace = f.PAC ?? 0, sta = val('Stamina');
      out.push(['⚡', `<b>Rush:</b> small pitch, lots of running – PAC <b>${pace}</b>, Stamina <b>${sta}</b>. ${pace >= 75 && sta >= 70 ? 'Good fit. ✅' : pace < 65 ? 'Consider more Pace. 💨' : sta < 65 ? 'Consider more Stamina. 🔋' : 'Solid.'}`]);
    }
    return out;
  }

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
<b class="bd-val">${r.value}${r.add ? `<small>+${r.add}</small>` : ''}${r.bonus ? `<small class="gold" title="Mastery bonus">+${r.bonus}</small>` : ''}${r.mod ? `<small class="${r.mod > 0 ? 'pos' : 'neg'}" title="${esc(r.modFrom.map(([f, v]) => `${f} ${v > 0 ? '+' : ''}${v}`).join(' · '))}">${r.mod > 0 ? '+' : ''}${r.mod}</small>` : ''}</b>
<button type="button" class="bd-pm" data-d="1" aria-label="Raise ${esc(r.name)}"${c == null ? ' disabled' : ''} title="${c == null ? (r.value >= ev.top ? 'At the maximum' : 'Not enough AP') : `Costs ${c} AP`}">+</button></div>`;
  }).join('')}</section>`;
    };
    const leftPct = ev.total ? Math.max(0, (ev.left / ev.total) * 100) : 0;
    return `${st.preview ? `<div class="bd-note card"><b>🧪 Preview numbers</b> <span class="muted small">${[!st.base && 'archetype base attributes', !st.ap && 'AP per level', !st.costs && 'AP costs'].filter(Boolean).join(', ')} ${st.base && st.ap ? 'is' : 'are'} not entered from the in-game screens yet, so the builder uses placeholder values. Level cap, Masteries and archetypes come from game data <code>${esc(g.version)}</code>.</span></div>` : ''}
<div class="bd-picker card">${groups.map((grp) => `<div class="bd-pgrp"><small>${ICON[grp.id] ?? ''} ${esc(grp.name)}</small><div class="chipset">${(g.archetypes || []).filter((a) => a.group === grp.id).map((a) => `<button type="button" class="chip${a.id === ev.arch.id ? ' on' : ''}" data-arch="${esc(a.id)}">${esc(a.name)}</button>`).join('')}</div></div>`).join('')}</div>
<div class="bd-main">
<div class="bd-left"><div class="bd-grid">${(g.attributeGroups || []).map(card).join('')}</div>
<div class="bd-tabs card"><div class="nx-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${l}${k === 'playstyles' ? `<em>${ev.choices.ps.length + ev.choices.plus.length}</em>` : k === 'facilities' ? `<em>${ev.choices.fa.length}</em>` : ''}</button>`).join('')}</div>
<div class="bd-pane">${pane(ev)}</div></div></div>
<aside class="bd-side card">
<div class="bd-arch"><span class="bd-ic">${ICON[ev.arch.group] ?? '⚽'}</span><div><small>${esc(groups.find((x) => x.id === ev.arch.group)?.name ?? '')}</small><h2>${esc(ev.arch.name)}</h2></div><div class="bd-ovr" title="Estimated overall"><b>${ev.ovr}</b><small>OVR*</small></div></div>
<label class="bd-lvl"><span>Level <b>${ev.level}</b> / <span>${ev.cap}</span>${ev.level === ev.cap ? ' <span class="tag home">MAX</span>' : ''}</span>
<span class="row"><input type="range" min="1" max="${ev.cap}" value="${ev.level}" data-level aria-label="Level"><button type="button" class="btn sm${ev.level === ev.cap ? ' ghost' : ''}" data-max>MAX</button></span></label>
<div class="bd-ap${ev.left === 0 && ev.total ? ' full' : ''}"><div><small>Archetype points left</small><b>${ev.left}</b><span class="muted">/ ${ev.total}</span></div><span class="bd-apbar"><i style="width:${leftPct}%"></i></span></div>
<div class="bd-face">${ev.face.map(([k, v]) => `<div><small>${k}</small><b class="${v >= 80 ? 'hi' : v >= 65 ? 'mid' : ''}">${v}</b></div>`).join('')}</div>
<div class="bd-fit"><small>📍 Position fit*</small>${ev.fit.map(([pos, v], i) => `<div class="${i ? '' : 'best'}"><b>${esc(pos)}</b><span class="bd-bar"><i class="a" style="width:${pct(v)}%"></i></span><em>${v}</em></div>`).join('')}</div>
<div class="bd-modes">${notes(ev).map(([ic, t]) => `<p><span>${ic}</span><span>${t}</span></p>`).join('')}</div>
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
    if (t.dataset.tab) { tab = t.dataset.tab; draw(); return; }
    if (t.dataset.ps) {
      const id = t.dataset.ps, p = (g.playstyles || []).find((x) => x.id === id), c = M.choices(g, b), sl = M.slotsOf(g);
      push();
      if (c.plus.includes(id)) b = { ...b, plus: c.plus.filter((x) => x !== id) };
      else if (c.ps.includes(id)) {
        const ps = c.ps.filter((x) => x !== id);
        b = p?.plus && c.plus.length < sl.plus ? { ...b, ps, plus: [...c.plus, id] } : { ...b, ps };
      } else if (c.ps.length < sl.playstyles) b = { ...b, ps: [...c.ps, id] };
      else { hist.pop(); toast(`All ${sl.playstyles} PlayStyle slots are full – remove one first`, 'error'); return; }
      setHash(); draw(); return;
    }
    if (t.dataset.sp) { push(); b = { ...b, sp: b.sp === t.dataset.sp ? null : t.dataset.sp }; setHash(); draw(); return; }
    if (t.dataset.fa) {
      const c = M.choices(g, b), sl = M.slotsOf(g), id = t.dataset.fa;
      if (!c.fa.includes(id) && c.fa.length >= sl.facilities) { toast(`All ${sl.facilities} Facility slots are full – remove one first`, 'error'); return; }
      push(); b = { ...b, fa: c.fa.includes(id) ? c.fa.filter((x) => x !== id) : [...c.fa, id] }; setHash(); draw(); return;
    }
    if (t.dataset.arch) {
      if (t.dataset.arch === b.arch) return;
      push(); b = { ...b, arch: t.dataset.arch, spent: {}, sp: null }; setHash(); draw();
    } else if (t.dataset.d) step(t.closest('[data-attr]').dataset.attr, +t.dataset.d, e.shiftKey ? 5 : 1);
    else if ('max' in t.dataset) { push(); b.level = M.capOf(g); setHash(); draw(); }
    else if ('undo' in t.dataset && hist.length) { b = JSON.parse(hist.pop()); setHash(); draw(); }
    else if ('reset' in t.dataset) { push(); b.spent = {}; setHash(); draw(); toast('Points reset – Undo brings them back'); }
    else if ('share' in t.dataset) {
      setHash();
      try { await navigator.clipboard.writeText(location.href); toast('🔗 Link copied – anyone can open this build'); } catch { prompt('Copy this link:', location.href); }
    }
  });
  let dragging = false; // one undo step per slider drag, snapshot taken before the first move
  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-level], [data-body]') && !dragging) { push(); dragging = true; }
    if (e.target.matches('[data-body]')) {
      const k = e.target.dataset.body;
      b = { ...b, [k]: +e.target.value };
      $(`[data-bv="${k}"]`).textContent = e.target.value;
      setHash(); return;
    }
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
  root.addEventListener('change', (e) => { if (e.target.matches('[data-level], [data-body]')) { dragging = false; draw(); } });

  (window.NXGame ? NXGame.load() : fetch(`${document.body.dataset.base || ''}api/game.json`).then((r) => r.json())).then((data) => {
    g = data;
    const first = (g.archetypes || [])[0];
    if (!first) { $('[data-bd-body]').innerHTML = '<p class="muted">No archetypes in the game data yet.</p>'; return; }
    const shared = location.hash.length > 1 ? M.decode(g, location.hash) : null;
    b = shared ? { arch: shared.arch, level: shared.level, spent: shared.spent, ps: shared.ps, plus: shared.plus, sp: shared.sp, fa: shared.fa, h: shared.h, w: shared.w } : { arch: first.id, level: M.capOf(g), spent: {} };
    if (shared?.version && shared.version !== g.version) toast(`Built on ${shared.version} – shown with the current rules (${g.version})`);
    draw();
  }).catch(() => { $('[data-bd-body]').innerHTML = '<p class="muted">Couldn’t load the game data – try again in a moment.</p>'; });
})();
