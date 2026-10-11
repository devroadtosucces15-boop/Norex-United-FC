// Tactics › Builds (B2): the live Pro Builder sandbox on the versioned game-rules dataset. The maths is the live web/build-math.js
// (copied at build, NXBuildMath); the rules come from the club server's GET /api/game (newest published version: level cap,
// archetypes, AP per level, cost tiers, PlayStyles …), else the game.json seed the build ships. Share links are the live format
// (#a=<archetype>&l=<level>&p=…&v=<version>), so a live link opens here and back. A build made on older rules shows what changed
// (public GET /api/game/changes?from=) and moves to the new MAX in one click.
// My builds (members): GET /api/builds (+ /api/builds/impact for the "needs attention" badges), opened by ?build=<id> or the list.
// Writes (members): 💾 save or update (POST /api/builds), save as new, 🍴 fork, 🗑️ delete (two taps), ⬆ upgrade one or all older builds
// to the new MAX, 📣 post or update a post (POST /api/probuilds/post) and ⭐ use as my League/Rush build (POST /api/mybuild).
// This file also owns the page's three tabs (Builder · Pro builds · My builds) and window.NorexBuilds, which probuilds.js uses
// for the shared game data, labels and "open in the sandbox".
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const root = $('#bxb'); if (!root) return;
  const A = window.NorexAuth, MO = window.NorexMotion, API = window.NOREX_API, B = window.NXBuildMath;
  const signed = !!(API && A?.token);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const toast = (m, kind = 'ok', icon) => MO?.toast(m, { kind, ...(icon ? { icon } : {}) });
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
  const ICON = { GK: '🧤', DEF: '🛡️', MID: '🎯', FWD: '⚡' };
  const GICON = { pace: '💨', shooting: '🎯', passing: '🅿️', dribbling: '🪄', defending: '🛡️', physical: '💪', goalkeeping: '🧤' };
  const MODE = { league: ['🏟️', 'League'], rush: ['⚡', 'Rush'] };
  const TABS = [['playstyles', '💫 PlayStyles'], ['specializations', '🎓 Specializations'], ['facilities', '🏟️ Facilities'], ['body', '📏 Body']];

  // ---------- game data: the live versioned rules first, the shipped seed second ----------
  const game = (API ? fetch(API + '/api/game', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))) : Promise.reject())
    .catch(() => fetch('game.json').then((r) => r.json()));
  const changes = (from) => (API ? fetch(`${API}/api/game/changes?from=${encodeURIComponent(from)}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null));

  // ---------- shared build helpers (the live buildcard.js, for this page) ----------
  const archName = (id, g) => g?.archetypes?.find((a) => a.id === id)?.name ?? String(id || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const memo = new Map();
  function info(g, x) {
    const key = `${g.version}|${x.code}`; if (memo.has(key)) return memo.get(key);
    const dd = B && B.decode(g, x.code), ev = dd && B.evaluate(g, dd);
    const o = ev && { ev, arch: ev.arch, cap: ev.cap, max: (x.level ?? ev.level) >= ev.cap, current: !x.version || x.version === g.version,
      ps: [...ev.choices.plus.map((id) => `${g.playstyles?.find((p) => p.id === id)?.name ?? id}+`), ...ev.choices.ps.map((id) => g.playstyles?.find((p) => p.id === id)?.name ?? id)],
      body: dd.h || dd.w ? `${ev.choices.h} cm · ${ev.choices.w} kg` : '' };
    memo.set(key, o); return o;
  }
  const pill = (label, emoji, tone, tip) => `<span class="bx-pill${tone ? ' t-' + tone : ''}"${tip ? ` title="${esc(tip)}"` : ''}>${emoji ? `<i aria-hidden="true">${emoji}</i>` : ''}${esc(label)}</span>`;
  function labels(g, x, { tags = true, ps = 3 } = {}) {
    const i = info(g, x), out = [];
    if (i) out.push(pill(i.arch.name, ICON[i.arch.group] || '🧬', 'red'));
    out.push(i?.max ? pill('MAX', '🔝', 'gold', `Level ${x.level}: today’s max`) : pill(`L${x.level}`, '📈', '', i ? `Level ${x.level} of ${i.cap}` : ''));
    out.push(i && !i.current ? pill('Older rules', '⚠️', 'old', `Made on ${x.version}, now ${g.version}`) : pill('Current rules', '✓', 'ok', `Game rules ${g.version}`));
    if (x.position) out.push(pill(x.position, '📍'));
    if (MODE[x.mode]) out.push(pill(MODE[x.mode][1], MODE[x.mode][0]));
    if (i?.body) out.push(pill(i.body, '📏'));
    if (i && ps) out.push(...i.ps.slice(0, ps).map((n) => pill(n, '💫')));
    if (tags) out.push(...(x.tags || []).map((t) => `<span class="bx-tag">#${esc(t)}</span>`));
    return out.join('');
  }
  const face = (ev) => `<span class="bx-face">${ev.face.map(([k, v]) => `<span><small>${k}</small><b class="${v >= 80 ? 'hi' : v >= 65 ? 'mid' : ''}">${v}</b></span>`).join('')}</span>`;
  const ovr = (ev, big) => `<span class="bx-ovr${big ? ' big' : ''}" title="Estimated overall"><b class="num">${ev.ovr}</b><small>OVR*</small></span>`;

  // a small sheet (the motion settings sheet's look) for compare and the forms
  function sheet(title, html, onMount) {
    const sh = d.createElement('div'); sh.className = 'mx-sheet bx-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', title.replace(/^\W+\s*/, ''));
    sh.innerHTML = `<div class="mx-sheet-body"><div class="bx-sh-h"><h3>${esc(title)}</h3><button type="button" class="bx-x" data-close aria-label="Close">×</button></div><div class="bx-sh-b">${html}</div></div>`;
    const last = d.activeElement, keys = (e) => { if (e.key === 'Escape') close(); };
    const close = () => { sh.classList.add('out'); d.removeEventListener('keydown', keys); setTimeout(() => sh.remove(), 260); last?.focus?.(); };
    sh.addEventListener('click', (e) => { if (e.target === sh || e.target.closest('[data-close]')) close(); });
    d.addEventListener('keydown', keys); d.body.appendChild(sh); onMount?.(sh.querySelector('.bx-sh-b'), close);
    (sh.querySelector('[autofocus]') || sh.querySelector('.bx-x')).focus();
    return { el: sh, close };
  }

  // ---------- tabs: Builder · Pro builds · My builds (deep links #pro, #b=<id>, #mine; a build code is the builder) ----------
  const panes = { b: $('[data-bxp="b"]'), p: $('[data-bxp="p"]'), m: $('[data-bxp="m"]') };
  let tabNow = 'b';
  const tabHooks = {};
  function tab(k, { hash = true } = {}) {
    tabNow = k;
    $$('[data-bxt]').forEach((x) => { const on = x.dataset.bxt === k; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
    Object.entries(panes).forEach(([pk, el]) => { if (el) el.hidden = pk !== k; });
    if (hash) history.replaceState(null, '', k === 'b' ? (g && b ? '#' + B.encode(g, b) : location.pathname + location.search) : k === 'p' ? '#pro' : '#mine');
    tabHooks[k]?.();
  }
  $('#bxt')?.addEventListener('click', (e) => { const t = e.target.closest('[data-bxt]'); if (t && t.dataset.bxt !== tabNow) tab(t.dataset.bxt); });

  // ---------- sandbox state ----------
  let g = null, b = null, hist = [], pane = 'playstyles', openAttr = null;
  let cur = null; // the saved build on screen: { id, title, mine, by, position, mode, posted }
  let mig = null; // { from, diff } while the build on screen was made on older game rules
  let saved = null, picks = {}, impact = new Map();
  const push = () => { hist.push(JSON.stringify(b)); if (hist.length > 100) hist.shift(); };
  const setHash = () => { if (tabNow === 'b') history.replaceState(null, '', location.pathname + location.search + '#' + B.encode(g, b)); };
  const shareUrl = () => location.href.split('#')[0].replace(/\?.*$/, '') + '#' + B.encode(g, b);
  const outdated = (x) => x.version && x.version !== g.version;
  const decodeCode = (code) => { const x = B.decode(g, code); return x && { arch: x.arch, level: x.level, spent: x.spent, ps: x.ps, plus: x.plus, sp: x.sp, fa: x.fa, h: x.h, w: x.w }; };
  const older = (from) => { mig = { from, diff: undefined }; const want = mig; changes(from).then((x) => { if (mig === want) { mig.diff = x; draw(); } }); };
  function open(x, { quiet } = {}) { // a saved / posted build → the sandbox
    const nb = decodeCode(x.code);
    if (!nb) { toast('That build can’t be read with the current game rules', 'err'); return false; }
    push(); b = nb; cur = x.id ? { id: x.id, title: x.title, mine: !!x.mine, by: x.by?.n, position: x.position, mode: x.mode, posted: !!x.posted } : null;
    outdated(x) ? older(x.version) : (mig = null);
    tab('b'); draw(); if (!quiet) root.scrollIntoView({ behavior: MO?.reduced?.() ? 'auto' : 'smooth', block: 'start' });
    return true;
  }

  // ---------- the sandbox view ----------
  const none = (what) => `<div class="bx-none"><span>🗂️</span><div><b>No ${what} in the game rules yet</b><p class="muted small">Managers add them from the in-game screens when they publish a new version. They show up here straight away.</p></div></div>`;
  function paneHtml(ev) {
    const c = ev.choices, sl = ev.slots, fx = (bonus) => Object.entries(bonus || {}).map(([k, v]) => `<span class="${v > 0 ? 'pos' : 'neg'}">${v > 0 ? '+' : ''}${v} ${esc(k)}</span>`).join('');
    if (pane === 'playstyles') {
      const list = g.playstyles || []; if (!list.length) return none('PlayStyles');
      return `<p class="muted small">Pick up to <b>${sl.playstyles}</b> PlayStyles and <b>${sl.plus}</b> PlayStyle+. Tap again to upgrade to + or remove. <b class="num">${c.ps.length}/${sl.playstyles}</b> · <b class="num">${c.plus.length}/${sl.plus}+</b></p>
<div class="bx-opts">${list.map((p) => { const on = c.ps.includes(p.id), pl = c.plus.includes(p.id); return `<button type="button" class="bx-opt${on ? ' on' : ''}${pl ? ' plus' : ''}" data-ps="${esc(p.id)}" aria-pressed="${on || pl}"${p.desc ? ` title="${esc(p.desc)}"` : ''}><span aria-hidden="true">${esc(p.icon || '💫')}</span><b>${esc(p.name)}${pl ? ' <i>+</i>' : ''}</b>${p.plus === false ? '<small class="muted">no +</small>' : ''}</button>`; }).join('')}</div>`;
    }
    if (pane === 'specializations') {
      const list = B.specsFor(g, b.arch); if (!list.length) return none(`Specializations for ${esc(ev.arch.name)}`);
      return `<p class="muted small">One Specialization per build.</p><div class="bx-opts wide">${list.map((s) => `<button type="button" class="bx-opt wide${c.sp === s.id ? ' on' : ''}" data-sp="${esc(s.id)}" aria-pressed="${c.sp === s.id}"><span aria-hidden="true">🎓</span><b>${esc(s.name)}</b>${s.desc ? `<small class="muted">${esc(s.desc)}</small>` : ''}<span class="bx-fx">${fx(s.bonus)}</span></button>`).join('')}</div>`;
    }
    if (pane === 'facilities') {
      const list = g.facilities || []; if (!list.length) return none('Facilities');
      return `<p class="muted small">Up to <b>${sl.facilities}</b> Facilities. <b class="num">${c.fa.length}/${sl.facilities}</b></p><div class="bx-opts wide">${list.map((f) => `<button type="button" class="bx-opt wide${c.fa.includes(f.id) ? ' on' : ''}" data-fa="${esc(f.id)}" aria-pressed="${c.fa.includes(f.id)}"><span aria-hidden="true">🏟️</span><b>${esc(f.name)}</b>${f.desc ? `<small class="muted">${esc(f.desc)}</small>` : ''}<span class="bx-fx">${fx(f.bonus)}</span></button>`).join('')}</div>`;
    }
    const H = B.rangeOf(g, 'height'), Wt = B.rangeOf(g, 'weight'), mods = B.modsOf(g, b);
    const from = (src) => Object.entries(mods).flatMap(([k, l]) => l.filter(([f]) => f === src).map(([, v]) => [k, v]));
    const badge = (src) => { const l = from(src); return l.length ? `<span class="bx-fx">${fx(Object.fromEntries(l))}</span>` : '<span class="muted small">No modifier at this value</span>'; };
    const noTables = !g.body?.heightMods?.length && !g.body?.weightMods?.length;
    return `<div class="bx-body"><label><span>📏 Height <b data-bv="h" class="num">${c.h}</b> cm</span><input type="range" min="${H.min}" max="${H.max}" value="${c.h}" data-body="h" aria-label="Height">${badge('Height')}</label>
<label><span>⚖️ Weight <b data-bv="w" class="num">${c.w}</b> kg</span><input type="range" min="${Wt.min}" max="${Wt.max}" value="${c.w}" data-body="w" aria-label="Weight">${badge('Weight')}</label>
${noTables ? `<p class="muted small">🧪 Height and weight modifiers are not in game rules ${esc(g.version)} yet, so body size does not change attributes here.</p>` : ''}</div>`;
  }
  function notes(ev) {
    const f = Object.fromEntries(ev.face), val = (n) => ev.rows.find((r) => r.name === n)?.value ?? 0, [best] = ev.fit;
    const out = [['🏟️', `<b>League:</b> best fit <b>${esc(best?.[0] ?? '–')}</b>${ev.fit[1] ? `, also ${ev.fit.slice(1).map(([p]) => esc(p)).join(' / ')}` : ''}.`]];
    if (ev.arch.group === 'GK') out.push(['⚡', '<b>Rush:</b> the keeper is an AI in Rush, so this build is for League.']);
    else { const pace = f.PAC ?? 0, sta = val('Stamina'); out.push(['⚡', `<b>Rush:</b> small pitch, lots of running. PAC <b>${pace}</b>, Stamina <b>${sta}</b>. ${pace >= 75 && sta >= 70 ? 'Good fit ✅' : pace < 65 ? 'Consider more Pace 💨' : sta < 65 ? 'Consider more Stamina 🔋' : 'Solid.'}`]); }
    return out;
  }
  function migHtml(ev) {
    if (!mig) return '';
    const x = mig.diff, items = x?.items || [];
    const list = x === undefined ? '<p class="muted small">Checking what changed…</p>' : items.length ? `<ul class="bx-mig-l">${items.slice(0, 8).map((i) => `<li><span aria-hidden="true">${esc(i.icon)}</span>${esc(i.text)}</li>`).join('')}${items.length > 8 ? `<li class="muted">+ ${items.length - 8} more</li>` : ''}</ul>`
      : `<p class="muted small">${x?.unknown ? 'That version is not in the history any more.' : 'No details for this change.'} The build is shown with today’s rules.</p>`;
    return `<div class="panel bx-mig" role="status"><div class="bx-mig-h"><b>⚠️ Made on older game rules</b><span class="muted small">Version <code>${esc(mig.from)}</code> → now <code>${esc(g.version)}</code> · max level ${ev.cap}</span><button type="button" class="bx-x" data-migx aria-label="Hide">×</button></div>
<small class="muted">🆕 What changed</small>${list}<div class="bx-row"><button type="button" class="btn sm" data-upgrade>⬆ ${ev.level >= ev.cap ? `Move to ${esc(g.version)}` : `Upgrade to new MAX · L${ev.cap}`}</button><span class="muted small">Keeps your points; new AP is left to spend.</span></div></div>`;
  }
  function view() {
    const ev = B.evaluate(g, b), st = ev.status, groups = g.archetypeGroups || [];
    const pct = (v) => Math.max(0, Math.min(100, (v / ev.top) * 100));
    const relevant = (id) => (ev.arch.group === 'GK') === (id === 'goalkeeping') || id === 'physical' || (ev.arch.group === 'GK' && id === 'pace');
    const card = (grp) => {
      const rows = ev.rows.filter((r) => r.group === grp.id), avg = Math.round(rows.reduce((s, r) => s + r.value, 0) / (rows.length || 1));
      return `<section class="bx-grp${relevant(grp.id) ? '' : ' dim'}"><header><span>${GICON[grp.id] ?? '•'} ${esc(grp.name)}</span><b class="num">${avg}</b></header>${rows.map((r) => {
        const c = B.canAdd(g, ev, r.name);
        return `<div class="bx-attr${r.sig ? ' sig' : ''}${r.add ? ' up' : ''}" data-attr="${esc(r.name)}"><button type="button" class="bx-name" aria-expanded="${openAttr === r.name}" title="Min · −5 · +5 · Max">${r.sig ? '<i title="Signature attribute">★</i> ' : ''}${esc(r.name)}</button>
<span class="bx-bar" aria-hidden="true"><i class="b" style="width:${pct(r.base)}%"></i><i class="a" style="left:${pct(r.base)}%;width:${pct(r.add)}%"></i>${r.bonus ? `<i class="m" style="left:${pct(r.base + r.add)}%;width:${pct(r.bonus)}%"></i>` : ''}</span>
<button type="button" class="bx-pm" data-d="-1" aria-label="Lower ${esc(r.name)}"${r.add ? '' : ' disabled'}>−</button><b class="bx-val num">${r.value}${r.add ? `<small>+${r.add}</small>` : ''}${r.bonus ? `<small class="gold" title="Mastery bonus">+${r.bonus}</small>` : ''}${r.mod ? `<small class="${r.mod > 0 ? 'pos' : 'neg'}" title="${esc(r.modFrom.map(([f, v]) => `${f} ${v > 0 ? '+' : ''}${v}`).join(' · '))}">${r.mod > 0 ? '+' : ''}${r.mod}</small>` : ''}</b>
<button type="button" class="bx-pm" data-d="1" aria-label="Raise ${esc(r.name)}"${c == null ? ' disabled' : ''} title="${c == null ? (r.value >= r.top ? 'At the maximum' : 'Not enough AP') : `Costs ${c} AP`}">+</button>
${openAttr === r.name ? `<div class="bx-quick"><button type="button" data-q="min"${r.add ? '' : ' disabled'}>⏮ Min <small>${r.base}</small></button><button type="button" data-q="-5"${r.add ? '' : ' disabled'}>−5</button><button type="button" data-q="+5"${c == null ? ' disabled' : ''}>+5</button><button type="button" data-q="max"${c == null ? ' disabled' : ''}>Max <small>${r.top}</small> ⏭</button></div>` : ''}</div>`;
      }).join('')}</section>`;
    };
    const leftPct = ev.total ? Math.max(0, (ev.left / ev.total) * 100) : 0, C = 2 * Math.PI * 52, mast = (g.masteries || []).filter((m) => m.archetype === ev.arch.id);
    return `${migHtml(ev)}${st.preview ? `<div class="panel bx-note"><b>🧪 Placeholder numbers</b> <span class="muted small">${[!st.base && 'archetype base attributes', !st.ap && 'AP per level', !st.costs && 'AP costs'].filter(Boolean).join(', ')} are not in game rules <code>${esc(g.version)}</code> yet, so the builder fills them with placeholder values.</span></div>` : ''}
<div class="panel bx-pick" role="group" aria-label="Archetype">${groups.map((grp) => `<div class="bx-pg"><small>${ICON[grp.id] ?? ''} ${esc(grp.name)}</small><div class="bx-pc">${(g.archetypes || []).filter((a) => a.group === grp.id).map((a) => `<button type="button" class="chip${a.id === ev.arch.id ? ' on' : ''}" data-arch="${esc(a.id)}" aria-pressed="${a.id === ev.arch.id}">${esc(a.name)}</button>`).join('')}</div></div>`).join('')}</div>
<div class="bx-main"><div class="bx-left"><div class="bx-dock" aria-hidden="true">${ovr(ev)}<span><small class="muted">${esc(ev.arch.name)}</small><b>L<span class="num" data-lv>${ev.level}</span> / ${ev.cap}</b></span><span><small class="muted">AP left</small><b class="num" data-apl>${ev.left}</b></span><button type="button" class="btn ghost sm" data-undo tabindex="-1"${hist.length ? '' : ' disabled'}>↶</button></div><div class="bx-grid">${(g.attributeGroups || []).map(card).join('')}</div>
<div class="panel bx-tabsp"><div class="chips" role="tablist" aria-label="Build extras">${TABS.map(([k, l]) => `<button type="button" role="tab" class="chip${k === pane ? ' on' : ''}" data-pane="${k}" aria-selected="${k === pane}">${l}${k === 'playstyles' ? ` <small class="num">${ev.choices.ps.length + ev.choices.plus.length}</small>` : k === 'facilities' ? ` <small class="num">${ev.choices.fa.length}</small>` : ''}</button>`).join('')}</div><div class="bx-pane">${paneHtml(ev)}</div></div></div>
<aside class="panel bx-side">${cur ? `<div class="bx-cur"><span aria-hidden="true">${cur.mine ? '📂' : '👀'}</span><div><small class="muted">${cur.mine ? 'My build' : `Build by ${esc(cur.by || 'a member')}`}</small><b>${esc(cur.title)}</b></div>${cur.mine || !signed || !cur.id ? '' : `<button type="button" class="btn sm" data-fork="${cur.id}">🍴 Fork</button>`}<button type="button" class="bx-x" data-close-cur aria-label="Close this build" title="Start a new build (keeps what is on screen)">×</button></div>` : ''}
<div class="bx-arch"><span class="bx-ic" aria-hidden="true">${ICON[ev.arch.group] ?? '⚽'}</span><div><small class="muted">${esc(groups.find((x) => x.id === ev.arch.group)?.name ?? '')}</small><h3>${esc(ev.arch.name)}</h3></div>${ovr(ev, true)}</div>
<div class="bx-lvl"><div class="bx-ring${ev.level === ev.cap ? ' max' : ''}" aria-hidden="true"><svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - ev.level / ev.cap)).toFixed(1)}"/></svg><b class="num" data-lv>${ev.level}</b><small>of ${ev.cap}</small></div>
<label class="bx-lvr"><span>Level <b class="num" data-lv>${ev.level}</b> / ${ev.cap}${ev.level === ev.cap ? ' <span class="pill s">MAX</span>' : ''}</span><span class="bx-row"><input type="range" min="1" max="${ev.cap}" value="${ev.level}" data-level aria-label="Level"><button type="button" class="btn sm${ev.level === ev.cap ? ' ghost' : ''}" data-max>MAX</button></span></label></div>
<div class="bx-ap${ev.left === 0 && ev.total ? ' full' : ''}"><div><small class="muted">Archetype points left</small><b class="num" data-apl>${ev.left}</b><span class="muted" data-apt>/ ${ev.total}</span></div><span class="bx-apbar"><i style="width:${leftPct}%"></i></span></div>
${face(ev)}
<div class="bx-fit"><small class="muted">📍 Position fit*</small>${ev.fit.map(([pos, v], i) => `<div class="${i ? '' : 'best'}"><b>${esc(pos)}</b><span class="bx-bar"><i class="a" style="width:${pct(v)}%"></i></span><em class="num">${v}</em></div>`).join('')}</div>
<div class="bx-notes">${notes(ev).map(([ic, t]) => `<p><span aria-hidden="true">${ic}</span><span>${t}</span></p>`).join('')}</div>
${mast.length ? `<div class="bx-mast"><b>🏅 Masteries</b>${mast.map((m) => `<span class="${ev.level >= m.level ? 'on' : ''}">L${m.level}: ${Object.entries(m.bonus).map(([k, v]) => `+${v} ${esc(k)}`).join(', ')}</span>`).join('')}</div>` : ''}
<div class="bx-acts"><button type="button" class="btn ghost sm" data-undo${hist.length ? '' : ' disabled'}>↶ Undo</button><button type="button" class="btn ghost sm" data-reset${ev.used ? '' : ' disabled'}>⟲ Reset</button><button type="button" class="btn sm" data-share>🔗 Share link</button><button type="button" class="btn ghost sm" data-compare>⚖️ Compare</button><button type="button" class="btn ghost sm" data-image>🖼️ Save image</button></div>
${writeActs()}
<p class="muted tiny">* Face stats are group averages and OVR is a weighted estimate: EA does not publish its formula. Game rules <code>${esc(g.version)}</code>${g.levelCap?.verified ? ' ✓ official cap' : ' · cap not confirmed by EA yet'}. Shift-click +/− moves 5 points.</p></aside></div>`;
  }
  function draw() {
    if (!g || !b) return;
    const y = scrollY; root.innerHTML = view(); dock();
    const on = $('.bx-pick .chip.on', root), rail = on?.closest('.bx-pc');
    if (rail && rail.scrollWidth > rail.clientWidth) rail.scrollLeft = on.offsetLeft - rail.offsetLeft - (rail.clientWidth - on.offsetWidth) / 2;
    scrollTo({ top: y, behavior: 'instant' });
  }
  // phones: a docked strip (OVR · level · AP left · undo) while the attribute grid is on screen; the tab bar sits below it
  let dockOn = false;
  const dock = () => $('.bx-dock', root)?.classList.toggle('on', dockOn);
  new IntersectionObserver((es) => { dockOn = es[0].isIntersecting; dock(); }, { rootMargin: '-35% 0px -35% 0px' }).observe(root);
  function step(name, dir, times) {
    push();
    for (let i = 0; i < times; i++) { const ev = B.evaluate(g, b), n = b.spent[name] || 0; if (dir > 0 && B.canAdd(g, ev, name) == null) break; if (dir < 0 && !n) break; b.spent[name] = n + dir; if (!b.spent[name]) delete b.spent[name]; }
    if (hist.at(-1) === JSON.stringify(b)) hist.pop();
    setHash(); draw();
  }

  // ---------- compare: the build on screen (A) against a saved build or a pasted share link (B) ----------
  function compareHtml(X, Y, la, lb, all) {
    const ea = B.evaluate(g, X), eb = B.evaluate(g, Y);
    const dl = (x, y) => (x === y ? '' : `<em class="${x > y ? 'pos' : 'neg'}">${x > y ? '▲' : '▼'}${Math.abs(x - y)}</em>`);
    const line = (k, x, y) => `<tr${x === y ? ' class="same"' : ''}><td class="${x > y ? 'win' : ''}">${x}${dl(x, y)}</td><th>${esc(k)}</th><td class="${y > x ? 'win' : ''}">${y}${dl(y, x)}</td></tr>`;
    const ps = (ev) => [...ev.choices.plus.map((id) => `${(g.playstyles || []).find((p) => p.id === id)?.name ?? id}+`), ...ev.choices.ps.map((id) => (g.playstyles || []).find((p) => p.id === id)?.name ?? id)].map(esc).join(', ') || '–';
    const rows = ea.rows.map((r, i) => [r.name, r.value, eb.rows[i]?.value ?? 0]).filter(([, x, y]) => all || x !== y);
    return `<div class="tscroll"><table class="bx-cmp"><thead><tr><th>${esc(la)}<small>${esc(ea.arch.name)} · L${ea.level}</small></th><th></th><th>${esc(lb)}<small>${esc(eb.arch.name)} · L${eb.level}</small></th></tr></thead>
<tbody>${line('OVR*', ea.ovr, eb.ovr)}${ea.face.map(([k, v], i) => line(k, v, eb.face[i]?.[1] ?? 0)).join('')}${line('AP left', ea.left, eb.left)}
<tr class="sub"><td>${ps(ea)}</td><th>💫 PlayStyles</th><td>${ps(eb)}</td></tr><tr class="sub"><td>${ea.choices.h} cm · ${ea.choices.w} kg</td><th>📏 Body</th><td>${eb.choices.h} cm · ${eb.choices.w} kg</td></tr>
<tr class="grp"><th colspan="3">${all ? 'All attributes' : `Attributes that differ (${rows.length})`}</th></tr>${rows.map(([k, x, y]) => line(k, x, y)).join('') || '<tr><td colspan="3" class="muted">Same attributes.</td></tr>'}</tbody></table></div>`;
  }
  async function compare(pre) {
    let list = saved; if (!list && signed) list = await loadMine().catch(() => []); list ||= [];
    const opts = list.map((x) => `<option value="${x.id}"${pre?.id === x.id ? ' selected' : ''}>${esc(x.title)} · ${esc(archName(x.arch, g))} L${x.level}</option>`).join('');
    sheet('⚖️ Compare builds', `<div class="bx-cmpk"><span><b>A</b> ${esc(cur?.title ?? 'Build on screen')}</span><span class="muted">vs</span><select data-cb aria-label="Build B">${opts}<option value="link"${list.length && !pre?.code ? '' : ' selected'}>Paste a share link…</option></select>
<input data-cl placeholder="Paste a builder share link" aria-label="Share link" value="${esc(pre?.code && !pre.id ? pre.code : '')}"${list.length && !pre?.code ? ' hidden' : ''}><label class="small"><input type="checkbox" data-ca> all attributes</label></div>${signed ? '' : '<p class="muted small">🔐 Sign in to compare with your saved builds. Share links work for everyone.</p>'}<div data-co></div>`, (el) => {
      const sel = $('[data-cb]', el), link = $('[data-cl]', el), outEl = $('[data-co]', el);
      const run = () => { link.hidden = sel.value !== 'link'; const x = list.find((s) => String(s.id) === sel.value), code = x ? x.code : (link.value.split('#')[1] || link.value).trim(), Y = code && decodeCode(code);
        outEl.innerHTML = Y ? compareHtml(b, Y, cur?.title ?? 'On screen', x?.title ?? 'Shared build', $('[data-ca]', el).checked) : `<p class="muted">${code ? '⚠️ That is not a builder link.' : 'Pick a saved build or paste a share link.'}</p>`; };
      el.addEventListener('input', run); el.addEventListener('change', run); run();
    });
  }

  // ---------- 🖼️ the branded PNG card (1080×1350), the live builder's layout ----------
  async function image() {
    const ev = B.evaluate(g, b), W = 1080, H = 1350, cv = d.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d'), red = '#c8352c', gold = '#efcf7a';
    await d.fonts?.ready;
    const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1d0d0e'); bg.addColorStop(0.55, '#0b0f16'); bg.addColorStop(1, '#07090d'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.fillStyle = red; x.fillRect(0, 0, W, 12); x.fillRect(0, H - 12, W, 12);
    const crest = new Image(); crest.src = 'crest.png'; await crest.decode().catch(() => {});
    if (crest.naturalWidth) { const h = 170; x.drawImage(crest, 60, 50, (crest.naturalWidth / crest.naturalHeight) * h, h); }
    const T = (t, px, py, font, col = '#fff', al = 'left') => { x.font = font; x.fillStyle = col; x.textAlign = al; x.fillText(t, px, py); };
    T('NOREX UNITED · PRO BUILD', 240, 100, '600 34px Oswald, Impact, sans-serif', '#9aa3b2');
    T((cur?.title || ev.arch.name).toUpperCase().slice(0, 26), 240, 160, '700 58px Oswald, Impact, sans-serif');
    x.fillStyle = red; x.beginPath(); x.roundRect(W - 230, 50, 170, 190, 22); x.fill();
    T(String(ev.ovr), W - 145, 170, '700 104px Oswald, Impact, sans-serif', '#fff', 'center'); T('OVR*', W - 145, 220, '600 28px Oswald, Impact, sans-serif', '#fff', 'center');
    const grp = (g.archetypeGroups || []).find((q) => q.id === ev.arch.group)?.name ?? '';
    T(ev.arch.name.toUpperCase(), 60, 310, '700 52px Oswald, Impact, sans-serif');
    T(`${grp.toUpperCase()} · LEVEL ${ev.level}${ev.level === ev.cap ? ' · MAX' : ` / ${ev.cap}`}`, 60, 360, '600 30px Oswald, Impact, sans-serif', ev.level === ev.cap ? gold : '#9aa3b2');
    ev.face.forEach(([k, v], i) => { const bx = 60 + i * 162, by = 400; x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.roundRect(bx, by, 148, 130, 16); x.fill(); T(String(v), bx + 74, by + 78, '700 64px Oswald, Impact, sans-serif', v >= 80 ? '#4ade80' : v >= 65 ? gold : '#fff', 'center'); T(k, bx + 74, by + 114, '600 26px Oswald, Impact, sans-serif', '#9aa3b2', 'center'); });
    T('TOP ATTRIBUTES', 60, 595, '600 30px Oswald, Impact, sans-serif', red);
    [...ev.rows].sort((p, q) => q.value - p.value || q.sig - p.sig).slice(0, 10).forEach((r, i) => { const bx = 60 + (i % 2) * 490, by = 640 + Math.floor(i / 2) * 72;
      T(`${r.sig ? '★ ' : ''}${r.name}`, bx, by, '500 28px Inter, sans-serif', r.sig ? gold : '#e5e7eb'); T(String(r.value), bx + 450, by, '700 32px Oswald, Impact, sans-serif', '#fff', 'right');
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(bx, by + 14, 450, 8); x.fillStyle = red; x.fillRect(bx, by + 14, 450 * Math.min(1, r.value / ev.top), 8); });
    const nm = (list, id) => (list || []).find((q) => q.id === id)?.name ?? id;
    let y = 1030; const ln = (l, v) => { if (!v) return; T(l, 60, y, '600 28px Oswald, Impact, sans-serif', '#9aa3b2'); T(v.slice(0, 56), 300, y, '500 28px Inter, sans-serif'); y += 52; };
    ln('PLAYSTYLES', [...ev.choices.plus.map((id) => `${nm(g.playstyles, id)}+`), ...ev.choices.ps.map((id) => nm(g.playstyles, id))].join(' · '));
    ln('SPECIALIZATION', ev.choices.sp && nm(g.specializations, ev.choices.sp)); ln('BODY', `${ev.choices.h} cm · ${ev.choices.w} kg`); ln('BEST FIT', ev.fit.slice(0, 3).map(([p, v]) => `${p} ${v}`).join(' · '));
    T(`Game rules ${g.version}${ev.status.preview ? ' · placeholder numbers' : ''} · * estimate`, 60, H - 50, '500 24px Inter, sans-serif', '#6b7280');
    const a = d.createElement('a'); a.download = `norex-build-${cur?.title || ev.arch.name}-L${ev.level}.png`.replace(/[^\w.-]+/g, '_'); a.href = cv.toDataURL('image/png'); a.click();
    toast('Build card saved', 'ok', '🖼️');
  }

  // ---------- 📂 My builds (read) ----------
  const mineEl = $('#bxmine');
  let maxB = 50;
  async function loadMine() { const r = await A.call('/api/builds'); picks = r.picks || {}; maxB = r.max || maxB; return (saved = r.builds || []); }
  const mineRow = (x) => {
    const imp = impact.get(x.id), badge = outdated(x) ? (imp?.breaking ? ` · <span class="bx-old brk" title="${esc(imp.changes.map((c) => c.text).join(' · '))}">⚠ ${esc(imp.changes[0]?.text ?? 'needs attention')}</span>` : ` · <span class="bx-old" title="Made on ${esc(x.version)}">⚠ older rules</span>`) : '';
    const i = info(g, x);
    return `<li class="panel bx-mine${cur?.id === x.id ? ' on' : ''}" data-id="${x.id}">${i ? ovr(i.ev) : '<span class="bx-ovr"><b>?</b></span>'}<div class="bx-mine-t"><b>${esc(x.title)}</b><small class="muted">${esc(archName(x.arch, g))} · L${x.level}${x.forkedFrom ? ' · 🍴 fork' : ''}${x.posted ? ' · 📣 posted' : ''}${Object.entries(MODE).filter(([k]) => picks[k] === x.id).map(([, [ic, l]]) => ` · ${ic} my ${l} build`).join('')} · ${ago(x.updated)}${badge}</small></div>
<span class="bx-mine-a"><button type="button" class="btn sm" data-mopen="${x.id}">Open</button><button type="button" class="btn ghost sm" data-mcmp="${x.id}" title="Compare with the build on screen" aria-label="Compare ${esc(x.title)} with the build on screen">⚖️</button>${outdated(x) ? `<button type="button" class="btn sm" data-mup="${x.id}" title="Move to ${esc(g.version)} at MAX (L${B.capOf(g)})">⬆ Upgrade</button>` : ''}<button type="button" class="btn ghost sm" data-mcopy="${x.id}" title="Duplicate (fork)" aria-label="Duplicate ${esc(x.title)}">🍴</button><button type="button" class="btn ghost sm" data-mdel="${x.id}" aria-label="Delete ${esc(x.title)}">🗑️</button></span></li>`;
  };
  function paintMine() {
    if (!mineEl) return;
    if (!saved.length) { mineEl.innerHTML = `<div class="panel sq-empty"><span>📂</span><div><b>No saved builds yet</b><p class="muted small">Make a build in the Builder tab and press 💾 Save. It lands here.</p><button type="button" class="btn ghost" data-bxt-go="b">🧪 Open the Builder</button></div></div>`; return; }
    const old = saved.filter(outdated), brk = old.filter((x) => impact.get(x.id)?.breaking);
    mineEl.innerHTML = `<div class="sq-bar"><p class="muted small" style="margin:0"><b class="num">${saved.length}</b> of ${maxB} saved · open one to keep editing, or compare it with the build on screen.</p></div>
${old.length ? `<div class="panel bx-oldall"><span>${brk.length ? `⚠️ <b>${brk.length}</b> ${brk.length === 1 ? 'build needs' : 'builds need'} attention (archetype or points changed) · ` : '⚠️ '}<b>${old.length}</b> ${old.length === 1 ? 'build is' : 'builds are'} on older game rules. Now <code>${esc(g.version)}</code>, max level ${B.capOf(g)}.</span><button type="button" class="btn sm" data-mupall>⬆ Upgrade ${old.length === 1 ? 'it' : `all ${old.length}`} to MAX</button></div>` : ''}
<ul class="bx-mines">${saved.map(mineRow).join('')}</ul>`;
  }
  let mineLoaded = false;
  async function showMine(force) {
    if (!mineEl || !signed || (mineLoaded && !force)) return;
    mineLoaded = true; MO?.skeleton(mineEl, 4);
    try { await game; await loadMine(); } catch (e) { mineLoaded = false; mineEl.removeAttribute('aria-busy'); mineEl.innerHTML = `<div class="panel sq-empty"><span>📡</span><div><b>Could not load your builds</b><p class="muted small">${esc(e.message)}</p><button type="button" class="btn ghost" data-mretry>↻ Try again</button></div></div>`; return; }
    MO ? MO.land(mineEl, '', () => paintMine()) : paintMine();
    A.call('/api/builds/impact').then((r) => { impact = new Map((r.builds ?? []).map((x) => [x.id, x])); paintMine(); }).catch(() => {}); // best effort: the version badge works without it
  }
  tabHooks.m = () => showMine();
  tabHooks.p = () => window.NorexBuilds?.pro?.load(); // probuilds.js loads the board the first time its tab opens
  mineEl?.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if ('mretry' in t.dataset) return showMine(true);
    if ('mupall' in t.dataset) return upgradeAll(t);
    const x = saved?.find((s) => s.id === +(t.dataset.mopen || t.dataset.mcmp || t.dataset.mup || t.dataset.mcopy || t.dataset.mdel));
    if (!x) return;
    if (t.dataset.mopen) open(x);
    else if (t.dataset.mcmp) compare(x);
    else if (t.dataset.mup) busy(t, () => upgradeSaved(x)).then((nb) => { afterUpgrade(x, nb); paintMine(); toast(`“${x.title}” upgraded to MAX (L${B.capOf(g)})`, 'ok', '⬆'); }).catch((err) => toast(err.message, 'err'));
    else if (t.dataset.mcopy) fork(x.id, { stay: true });
    else if (t.dataset.mdel) {
      if (!sure(t, 'Delete? Tap again')) return;
      const keep = saved; saved = saved.filter((s) => s.id !== x.id); MO?.flip ? MO.flip($('.bx-mines', mineEl), () => $(`.bx-mine[data-id="${x.id}"]`, mineEl)?.remove()) : paintMine(); // optimistic
      post('/api/builds/delete', { id: x.id }).then((r) => { saved = r.builds; picks = r.picks || picks; if (cur?.id === x.id) { cur = null; draw(); } paintMine(); toast('Build deleted. Share links you sent still work.', 'ok', '🗑️'); })
        .catch((err) => { saved = keep; paintMine(); toast(err.message, 'err'); });
    }
  });
  d.addEventListener('click', (e) => { const t = e.target.closest('[data-bxt-go]'); if (t) tab(t.dataset.bxtGo); });

  // ---------- sandbox events ----------
  root.addEventListener('click', async (e) => {
    const nm = e.target.closest('.bx-name');
    if (nm) { const a = nm.closest('[data-attr]').dataset.attr; openAttr = openAttr === a ? null : a; draw(); $(`[data-attr="${CSS.escape(a)}"] .bx-name`, root)?.focus(); return; }
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.q) { const a = t.closest('[data-attr]').dataset.attr, q = t.dataset.q; step(a, q === 'min' || q === '-5' ? -1 : 1, q === 'min' || q === 'max' ? 500 : 5); return; }
    if (t.dataset.pane) { pane = t.dataset.pane; draw(); return; }
    if (t.dataset.ps) {
      const id = t.dataset.ps, p = (g.playstyles || []).find((x) => x.id === id), c = B.choices(g, b), sl = B.slotsOf(g); push();
      if (c.plus.includes(id)) b = { ...b, plus: c.plus.filter((x) => x !== id) };
      else if (c.ps.includes(id)) { const ps = c.ps.filter((x) => x !== id); b = p?.plus !== false && c.plus.length < sl.plus ? { ...b, ps, plus: [...c.plus, id] } : { ...b, ps }; }
      else if (c.ps.length < sl.playstyles) b = { ...b, ps: [...c.ps, id] };
      else { hist.pop(); toast(`All ${sl.playstyles} PlayStyle slots are full. Remove one first.`, 'err'); return; }
      setHash(); draw(); return;
    }
    if (t.dataset.sp) { push(); b = { ...b, sp: b.sp === t.dataset.sp ? null : t.dataset.sp }; setHash(); draw(); return; }
    if (t.dataset.fa) { const c = B.choices(g, b), sl = B.slotsOf(g), id = t.dataset.fa; if (!c.fa.includes(id) && c.fa.length >= sl.facilities) { toast(`All ${sl.facilities} Facility slots are full. Remove one first.`, 'err'); return; } push(); b = { ...b, fa: c.fa.includes(id) ? c.fa.filter((x) => x !== id) : [...c.fa, id] }; setHash(); draw(); return; }
    if (t.dataset.arch) { if (t.dataset.arch === b.arch) return; push(); b = { ...b, arch: t.dataset.arch, spent: {}, sp: null }; openAttr = null; setHash(); draw(); return; }
    if (t.dataset.d) return step(t.closest('[data-attr]').dataset.attr, +t.dataset.d, e.shiftKey ? 5 : 1);
    if ('max' in t.dataset) { push(); b.level = B.capOf(g); setHash(); draw(); }
    else if ('undo' in t.dataset && hist.length) { b = JSON.parse(hist.pop()); setHash(); draw(); }
    else if ('reset' in t.dataset) { push(); b.spent = {}; setHash(); draw(); toast('Points reset. Undo brings them back.', 'ok', '⟲'); }
    else if ('compare' in t.dataset) compare();
    else if ('image' in t.dataset) image().catch(() => toast('Could not draw the image. Try again.', 'err'));
    else if ('closeCur' in t.dataset) { cur = null; draw(); }
    else if ('migx' in t.dataset) { mig = null; draw(); }
    else if ('upgrade' in t.dataset) upgradeHere();
    else if ('share' in t.dataset) { setHash(); const u = shareUrl(); try { await navigator.clipboard.writeText(u); toast('Link copied: anyone can open this build', 'ok', '🔗'); } catch { prompt('Copy this link:', u); } }
    else if ('save' in t.dataset) save();
    else if ('post' in t.dataset) postBuild();
    else if ('mybuild' in t.dataset) myBuild();
    else if ('mine' in t.dataset) tab('m');
    else if (t.dataset.fork) fork(+t.dataset.fork);
  });
  async function upgradeHere() {
    push(); b = B.fit(g, { ...b, level: B.capOf(g) }); mig = null; setHash(); draw();
    const ev = B.evaluate(g, b), spend = ev.left ? `: ${ev.left} AP to spend` : '';
    if (!(cur?.mine && cur.id && signed)) return toast(`Upgraded to MAX (L${ev.level}) on ${g.version}${spend}. Save to keep it.`, 'ok', '⬆');
    try { saved = (await post('/api/builds', { id: cur.id, title: cur.title, code: B.encode(g, b) })).builds; toast(`“${cur.title}” is on ${g.version} at MAX (L${ev.level}) and saved${spend}`, 'ok', '⬆'); }
    catch (err) { toast(err.message, 'err'); }
  }
  let dragging = false; // one undo step per slider drag
  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-level], [data-body]') && !dragging) { push(); dragging = true; }
    if (e.target.matches('[data-body]')) { const k = e.target.dataset.body; b = { ...b, [k]: +e.target.value }; $(`[data-bv="${k}"]`, root).textContent = e.target.value; setHash(); return; }
    if (!e.target.matches('[data-level]')) return;
    const next = B.fit(g, { ...b, level: +e.target.value }), lost = Object.keys(b.spent).some((k) => (next.spent[k] || 0) !== b.spent[k]);
    b = next; setHash();
    const ev = B.evaluate(g, b); // only the numbers while dragging; the full redraw on release keeps the slider under the finger
    $$('[data-lv]', root).forEach((x) => (x.textContent = ev.level)); $('.bx-ring .fg', root)?.setAttribute('stroke-dashoffset', (2 * Math.PI * 52 * (1 - ev.level / ev.cap)).toFixed(1));
    $$('[data-apl]', root).forEach((x) => (x.textContent = ev.left)); $('[data-apt]', root).textContent = `/ ${ev.total}`;
    if (lost) draw();
  });
  root.addEventListener('change', (e) => { if (e.target.matches('[data-level], [data-body]')) { dragging = false; draw(); } });

  // ================= ✍️ writes (members): the live /api/builds, /api/probuilds/post and /api/mybuild routes =================
  // Saving keeps the build's share code, so it decodes with the same maths everywhere. Nothing here runs without a session;
  // a guest gets the sign-in link, and the build on screen comes back after the Discord round trip (PENDING above).
  const post = (path, body) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const busy = (btn, work) => (MO && btn ? MO.submit(btn, work, { burst: false }) : work());
  const sure = (btn, ask) => { if (btn.dataset.sure) return true; const was = btn.innerHTML; btn.dataset.sure = '1'; btn.classList.add('bx-sure'); btn.textContent = ask; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.sure; btn.classList.remove('bx-sure'); btn.innerHTML = was; } }, 3500); return false; };
  const POS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
  const posSelect = (pick) => `<select data-pos aria-label="Position">${POS.map((p) => `<option${p === pick ? ' selected' : ''}>${p}</option>`).join('')}</select>`;
  const modeRadios = (name, pick, my) => `<div class="chips" role="radiogroup" aria-label="Mode">${Object.entries(MODE).map(([k, [ic, l]]) => `<label class="chip bx-radio"><input type="radio" name="${name}" value="${k}"${(pick || 'league') === k ? ' checked' : ''}> ${ic} ${my ? `My ${l} build` : l}</label>`).join('')}</div>`;
  function signIn(what, then) { // guests: one sheet with the Discord sign-in (the build and the pending action survive it)
    if (signed) return false;
    if (!API) { toast('Saving needs the club server: open the live preview', 'err'); return true; }
    sheet(`🔐 Sign in to ${what}`, `<p class="muted">Building, sharing and reading Pro builds is open to everyone. ${what[0].toUpperCase() + what.slice(1)} needs your NOREX Discord login. The build on screen comes with you.</p><a class="btn gold" data-login href="${esc(A.loginUrl())}">Sign in with Discord</a>`, (el) => {
      $('[data-login]', el).addEventListener('click', () => { try { sessionStorage.setItem(PENDING, JSON.stringify({ code: B.encode(g, b), cur, tab: tabNow, then })); } catch {} });
    });
    return true;
  }
  function writeActs() {
    if (!API) return '';
    if (!signed) return `<div class="bx-acts"><a class="btn gold sm" data-login href="${esc(A?.loginUrl?.() || '#')}">🔐 Sign in to save and post</a></div>`;
    return `<div class="bx-acts"><button type="button" class="btn sm" data-save>💾 ${cur?.mine ? 'Save' : 'Save build'}</button><button type="button" class="btn ghost sm" data-mine>📂 My builds</button></div>
<div class="bx-acts"><button type="button" class="btn sm" data-post>📣 ${cur?.posted && cur.mine ? 'Update post' : 'Post to Pro builds'}</button><button type="button" class="btn ghost sm" data-mybuild title="Show this build on your profile">⭐ Use as my build</button></div>`;
  }
  const mineChanged = () => { if (mineLoaded) paintMine(); };
  async function save() {
    if (signIn('save builds', 'save')) return;
    const update = cur?.mine && cur.id;
    sheet(update ? '💾 Save build' : '💾 Save to My builds', `<form class="bx-sh-b" data-sf><label class="bx-f"><span>Name</span><input name="t" maxlength="60" required value="${esc(cur?.mine && cur.title ? cur.title : `${archName(b.arch, g)} L${b.level}`)}" autofocus></label>${update ? '<p class="muted small" style="margin:0">Save updates this build. <b>Save as new</b> keeps both.</p>' : ''}
<div class="bx-acts">${update ? '<button type="submit" class="btn ghost" data-as="new">Save as new</button>' : ''}<button type="submit" class="btn gold" data-as="save">💾 Save</button></div></form>`, (el, close) => {
      $('[data-sf]', el).addEventListener('submit', async (e) => {
        e.preventDefault(); const btn = e.submitter || $('[data-as="save"]', el), title = e.target.t.value.trim(), asNew = btn.dataset.as === 'new';
        try {
          const r = await busy(btn, () => post('/api/builds', { ...(update && !asNew ? { id: cur.id } : {}), title, code: B.encode(g, b) }));
          saved = r.builds; picks = r.picks || picks; const s = saved.find((x) => x.id === r.saved);
          cur = s ? { id: s.id, title: s.title, mine: true, position: s.position, mode: s.mode, posted: s.posted } : cur; mig = null;
          close(); draw(); mineChanged(); toast(`Saved “${s?.title ?? title}” to My builds`, 'ok', '💾');
        } catch (err) { toast(err.message, 'err'); }
      });
    });
  }
  async function fork(id, { stay } = {}) {
    if (signIn('fork builds')) return;
    try {
      const r = await post('/api/builds/fork', { id }); saved = r.builds; picks = r.picks || picks;
      const s = saved.find((x) => x.id === r.saved); mineChanged();
      if (s && !stay) open(s);
      toast(stay ? `Copied as “${s?.title ?? 'a new build'}”` : 'Forked into My builds: change it however you like', 'ok', '🍴');
    } catch (err) { toast(err.message, 'err'); }
  }
  const upgraded = (code) => { const x = decodeCode(code); return x && B.fit(g, { ...x, level: B.capOf(g) }); };
  async function upgradeSaved(x) { // the saved build moves to the live rules at the new MAX (a posted build keeps its votes)
    const nb = upgraded(x.code); if (!nb) throw new Error(`“${x.title}” can’t be read with the current game rules`);
    const r = await post('/api/builds', { id: x.id, title: x.title, code: B.encode(g, nb) }); saved = r.builds; return nb;
  }
  const afterUpgrade = (x, nb) => { if (cur?.id === x.id) { push(); b = nb; mig = null; setHash(); draw(); } };
  async function upgradeAll(btn) {
    let ok = 0; btn.disabled = true;
    for (const x of saved.filter(outdated)) { try { afterUpgrade(x, await upgradeSaved(x)); ok++; } catch (err) { toast(err.message, 'err'); } }
    paintMine(); if (ok) toast(`${ok} build${ok === 1 ? '' : 's'} upgraded to MAX on ${g.version}`, 'ok', '⬆');
  }
  let postDraft = null; // the post form keeps what was typed if the server says no
  async function postBuild() {
    if (signIn('post builds', 'post')) return;
    const ev = B.evaluate(g, b), own = cur?.mine && cur.id;
    let f = postDraft ?? { title: own ? cur.title : `${ev.arch.name} L${ev.level}`, position: cur?.position || ev.fit[0]?.[0], mode: cur?.mode || 'league', description: '', clip: '', tags: '' };
    if (!postDraft && own && cur.posted) { const x = await A.call(`/api/probuilds/get?id=${cur.id}`).then((r) => r.build).catch(() => null); if (x) f = { ...f, title: x.title, position: x.position || f.position, mode: x.mode || f.mode, description: x.desc || '', clip: x.clip || '', tags: (x.tags || []).join(', ') }; }
    sheet(own && cur.posted ? '📣 Update your post' : '📣 Post to Pro builds', `<form class="bx-sh-b" data-pf><label class="bx-f"><span>Title</span><input name="title" maxlength="60" required value="${esc(f.title)}" autofocus></label>
<div class="bx-f2"><label class="bx-f"><span>Position</span>${posSelect(f.position)}</label><div class="bx-f"><span>Mode</span>${modeRadios('bxpm', f.mode)}</div></div>
<label class="bx-f"><span>How to play it</span><textarea name="description" maxlength="1000" rows="4" placeholder="Role, runs, what to watch out for, which PlayStyles carry it">${esc(f.description)}</textarea></label>
<div class="bx-f2"><label class="bx-f"><span>Clip link <small class="muted">(optional: YouTube, Twitch, Medal …)</small></span><input name="clip" type="url" maxlength="300" value="${esc(f.clip)}" placeholder="https://youtu.be/…"></label><label class="bx-f"><span>Tags <small class="muted">(up to 5, commas)</small></span><input name="tags" maxlength="120" value="${esc(f.tags)}" placeholder="pace, finesse, rush"></label></div>
<p class="muted small" style="margin:0">🏷️ Archetype, level or MAX, game rules, body and PlayStyles are labelled automatically. ${own ? 'Posting also saves what is on screen to this build.' : 'The build is saved to My builds too.'}</p><div class="bx-acts"><button type="submit" class="btn gold">📣 Post</button></div></form>`, (el, close) => {
      const form = $('[data-pf]', el), read = () => ({ title: form.title.value.trim(), position: $('[data-pos]', form).value, mode: $('input[name=bxpm]:checked', form)?.value || 'league', description: form.description.value, clip: form.clip.value.trim(), tags: form.tags.value });
      form.addEventListener('input', () => { postDraft = read(); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); const v = read(); postDraft = v;
        try {
          const r = await busy(e.submitter, () => post('/api/probuilds/post', { ...(own ? { id: cur.id } : {}), code: B.encode(g, b), ...v, tags: v.tags.split(',') }));
          postDraft = null; saved = null; mineLoaded = false;
          cur = { id: r.build.id, title: r.build.title, mine: true, position: r.build.position, mode: r.build.mode, posted: true };
          close(); draw(); window.NorexBuilds?.pro?.load(true);
          toast('Posted to Pro builds: find it on the board', 'ok', '📣');
        } catch (err) { toast(err.message, 'err'); }
      });
    });
  }
  async function myBuild() {
    if (signIn('pick your build', 'mybuild')) return;
    const ev = B.evaluate(g, b);
    sheet('⭐ Use as my build', `<form class="bx-sh-b" data-mf><p class="muted small" style="margin:0">The build on screen shows on your profile, your hover card and your player page.${cur?.mine ? ' Your saved build is updated with what is on screen.' : ' It is saved to My builds.'}</p>
<div class="bx-f"><span>This is my…</span>${modeRadios('bxmy', cur?.mode, true)}</div><label class="bx-f"><span>Position</span>${posSelect(cur?.position || ev.fit[0]?.[0])}</label><div class="bx-acts"><button type="submit" class="btn gold">⭐ Use this build</button></div></form>`, (el, close) => {
      const form = $('[data-mf]', el);
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); const v = { mode: $('input[name=bxmy]:checked', form)?.value || 'league', position: $('[data-pos]', form).value }, code = B.encode(g, b);
        try {
          const r = await busy(e.submitter, async () => {
            if (cur?.mine && cur.id) { await post('/api/builds', { id: cur.id, title: cur.title, code }); return post('/api/mybuild', { id: cur.id, ...v }); }
            return post('/api/mybuild', { code, title: cur?.title || `${ev.arch.name} L${ev.level}`, ...v });
          });
          if (!(cur?.mine && cur.id)) cur = { id: r.saved, title: r.picks[v.mode]?.title, mine: true, ...v };
          picks = Object.fromEntries(Object.keys(MODE).map((k) => [k, r.picks[k]?.id]).filter(([, id]) => id)); saved = null; mineLoaded = false;
          close(); draw(); toast(`Now your ${MODE[v.mode][1]} build`, 'ok', '⭐');
        } catch (err) { toast(err.message, 'err'); }
      });
    });
  }

  // ---------- start ----------
  const PENDING = 'norex_builder_pending'; // the build survives the Discord sign-in round trip (the callback drops the hash)
  d.addEventListener('click', (e) => { if (e.target.closest('[data-login]') && g && b) { try { sessionStorage.setItem(PENDING, JSON.stringify({ code: B.encode(g, b), cur, tab: tabNow })); } catch {} } }, true);
  MO?.skeleton(root, 6);
  game.then((data) => {
    g = data;
    $$('[data-bxver]').forEach((x) => (x.textContent = g.version)); $$('[data-bxcap]').forEach((x) => (x.textContent = g.levelCap?.value ?? '–'));
    const first = (g.archetypes || [])[0];
    if (!B || !first) { root.removeAttribute('aria-busy'); root.innerHTML = '<div class="panel sq-empty"><span>🗂️</span><div><b>No archetypes in the game rules yet</b></div></div>'; return; }
    let pending = null; try { pending = JSON.parse(sessionStorage.getItem(PENDING) || 'null'); sessionStorage.removeItem(PENDING); } catch {}
    const h = location.hash, code = /[#&]a=/.test(h) ? h : pending?.code || '', shared = code ? B.decode(g, code) : null;
    b = shared ? { arch: shared.arch, level: shared.level, spent: shared.spent, ps: shared.ps, plus: shared.plus, sp: shared.sp, fa: shared.fa, h: shared.h, w: shared.w } : { arch: first.id, level: B.capOf(g), spent: {} };
    cur = pending?.cur || null;
    if (shared?.version && shared.version !== g.version && !pending) older(shared.version);
    window.NorexBuilds = { game, info, labels, face, ovr, archName, sheet, open, tab, MODE, ICON, esc, ago, signed, get g() { return g; }, post, sure, loadMine, signIn, posSelect, modeRadios };
    dispatchEvent(new CustomEvent('norex:builds'));
    root.removeAttribute('aria-busy'); MO ? MO.land(root, view(), dock) : draw();
    const start = h === '#pro' || /^#b=\d+$/.test(h) ? 'p' : h === '#mine' || pending?.tab === 'm' ? 'm' : pending?.tab === 'p' ? 'p' : 'b';
    if (start !== 'b') tab(start, { hash: start !== 'p' || h === '#pro' }); else if (pending) setHash();
    const want = new URLSearchParams(location.search).get('build'); // ?build=<id>: one of mine, or a posted one
    if (want && signed) A.call(`/api/builds/get?id=${encodeURIComponent(want)}`).then((r) => open(r.build)).catch((err) => toast(err.message, 'err'));
    else if (signed && new URLSearchParams(location.search).has('upgrade')) tab('m'); // from the game-update alert
    if (signed && pending?.then) setTimeout(() => ({ save, post: postBuild, mybuild: myBuild })[pending.then]?.(), 400); // after the sign-in: finish what was pressed
  }).catch(() => { root.removeAttribute('aria-busy'); root.innerHTML = '<div class="panel sq-empty"><span>📡</span><div><b>Could not load the game rules</b><p class="muted small">Try again in a moment.</p></div></div>'; });
})();
