// Tactics › Builds (B2). One page, four panes: 🛠️ Builder (the sandbox), 🏆 Pro builds (the club board), 📂 My builds, 🧬 Archetypes (static).
// Game rules: GET /api/game (newest published dataset, public) or the seed shipped as game.json; the maths is the live web/build-math.js
// (copied at build, window.NXBuildMath), so a build reads the same here as on the live builder. A build travels as the live share code
// (#a=<archetype>&l=<level>&p=…&v=<dataset version>), which is also what /api/builds stores.
// Reads: GET /api/probuilds (+ /get?id=, public), GET /api/builds (+ /get?id=, /impact), GET /api/game/changes?from= (older rules).
// Writes (members): POST /api/builds (save new / update mine), /api/builds/delete, /api/builds/fork, /api/probuilds/post + /unpost (share to the board).
// Share links need no login. Deep links: #a=… (a build), #b=<id> (a posted build), #build<id> (a saved build), #pro, #mine, #arch.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const root = $('#bx'), X = window.NXBuildMath; if (!root || !X) return;
  const A = window.NorexAuth, MO = window.NorexMotion, API = window.NOREX_API || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const signed = () => !!(API && A?.token);
  const toast = (m, kind = 'ok', icon) => MO?.toast(m, { kind, ...(icon ? { icon } : {}) });
  const get = (p) => A.call(p);
  const send = (p, body) => A.call(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
  const ICON = { GK: '🧤', DEF: '🛡️', MID: '🎯', FWD: '⚡' };
  const GICON = { pace: '💨', shooting: '🎯', passing: '🅿️', dribbling: '🪄', defending: '🛡️', physical: '💪', goalkeeping: '🧤' };
  const POS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
  const LINE = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'FWD', RW: 'FWD', CF: 'FWD', ST: 'FWD' };
  const MODES = { league: ['🏟️', 'League'], rush: ['⚡', 'Rush'] };
  const XT = [['playstyles', '💫', 'PlayStyles'], ['specializations', '🎓', 'Specialization'], ['facilities', '🏟️', 'Facilities'], ['body', '📏', 'Body']];
  const PENDING = 'nx.bx.pending'; // the build on screen survives the Discord login round trip (the callback drops the hash)
  const bxb = $('#bxb'), bxp = $('#bxp'), bxm = $('#bxm');

  let g = null, b = null, hist = [], cur = null, xt = 'playstyles', openAttr = null, mig = null, titleDraft = null, postOpen = false, postDraft = null, busy = false;
  let mine = null, mineErr = null, impact = new Map(), board = null, boardErr = null, detail = null, detailId = null, pane = 'b';
  const F = { sort: 'hot', mode: 'all', line: '', q: '' };

  // ---------- helpers on the dataset ----------
  const archOf = (id) => (g.archetypes || []).find((a) => a.id === id);
  const archName = (id) => archOf(id)?.name ?? id;
  const nameIn = (list, id) => (list || []).find((x) => x.id === id)?.name ?? id;
  const cap = () => X.capOf(g);
  const capWord = () => (g.levelCap?.verified ? 'official' : 'unverified');
  const code = (x = b) => X.encode(g, x);
  const fromCode = (c) => { const x = X.decode(g, c); return x && { arch: x.arch, level: x.level, spent: x.spent, ps: x.ps, plus: x.plus, sp: x.sp, fa: x.fa, h: x.h, w: x.w, v: x.version }; };
  const plain = (x) => ({ arch: x.arch, level: x.level, spent: { ...x.spent }, ps: x.ps, plus: x.plus, sp: x.sp, fa: x.fa, h: x.h, w: x.w });
  const outdated = (x) => !!(x.version && x.version !== g.version);
  const linkFor = (hash) => location.origin + location.pathname + '#' + hash;
  const dirty = () => !!(cur?.mine && cur.base !== code());
  const push = () => { hist.push(JSON.stringify(b)); if (hist.length > 100) hist.shift(); };
  const setHash = () => { if (pane === 'b') history.replaceState(null, '', '#' + code()); };
  const curOf = (x) => ({ id: x.id, title: x.title, mine: !!x.mine, by: x.by?.n, posted: !!x.posted, position: x.position, mode: x.mode, version: x.version, base: null });
  const twoTap = (btn, label) => { if (btn.dataset.armed) return true; const old = btn.innerHTML; btn.dataset.armed = '1'; btn.classList.add('armed'); btn.innerHTML = label; setTimeout(() => { if (btn.isConnected && btn.dataset.armed) { delete btn.dataset.armed; btn.classList.remove('armed'); btn.innerHTML = old; } }, 3500); return false; };
  const keepScroll = (fn) => { const y = scrollY; fn(); scrollTo({ top: y, behavior: 'instant' }); };
  async function share(hash, title) {
    const url = linkFor(hash);
    try { if (navigator.share && matchMedia('(pointer:coarse)').matches) { await navigator.share({ title, url }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('Link copied. Anyone can open this build, no login needed.', 'ok', '🔗'); } catch { prompt('Copy this link:', url); }
  }
  const login = (then) => {
    if (!API || !A) { toast('Saving needs the club server. This preview copy has none.', 'err'); return; }
    try { sessionStorage.setItem(PENDING, JSON.stringify({ code: code(), cur, then, title: titleDraft })); } catch {}
    location.href = A.loginUrl();
  };
  const gate = (what) => `<div class="panel sq-empty"><span>🔐</span><div><b>Sign in to ${what}</b><p class="muted small">Building and share links are open to everyone. Saving needs a NOREX Discord login. The build on screen comes with you.</p>${API ? '<button type="button" class="btn gold" data-bxlogin>Sign in with Discord</button>' : '<p class="tiny muted">Not available in this preview copy.</p>'}</div></div>`;
  const failBox = (what, e, retry) => `<div class="panel sq-empty"><span>📡</span><div><b>Could not load ${what}</b><p class="muted small">${esc(e?.message || 'The club server did not answer.')}</p><button type="button" class="btn ghost sm" data-bxretry="${retry}">↻ Try again</button></div></div>`;

  // ---------- tabs + deep links ----------
  const HASH = { p: '#pro', m: '#mine', a: '#arch' };
  function show(k) {
    pane = k;
    $$('#bt .chip').forEach((c) => { const on = c.dataset.t === k; c.classList.toggle('on', on); c.setAttribute('aria-selected', on); });
    $$('[data-pane]', root).forEach((p) => { p.hidden = p.dataset.pane !== k; });
    if (k === 'p') paintBoard(); else if (k === 'm') paintMine();
  }
  $('#bt')?.addEventListener('click', (e) => {
    const c = e.target.closest('.chip[data-t]'); if (!c || !g) return;
    if (c.dataset.t === 'p') detailId = null;
    show(c.dataset.t);
    history.replaceState(null, '', c.dataset.t === 'b' ? '#' + code() : HASH[c.dataset.t]);
  });
  function route() {
    const h = location.hash;
    let m;
    if ((m = h.match(/^#b=(\d+)$/))) { show('p'); openDetail(+m[1]); return; }
    if (h === '#pro') { detailId = null; show('p'); return; }
    if (h === '#mine') { show('m'); return; }
    if (h === '#arch') { show('a'); return; }
    if ((m = h.match(/^#build(\d+)$/))) { show('b'); if (signed()) get(`/api/builds/get?id=${m[1]}`).then((r) => openBuild(r.build)).catch((e) => toast(e.message, 'err')); return; }
    if (/[#&]a=/.test(h)) {
      const x = fromCode(h);
      if (x) { if (b) push(); b = plain(x); cur = null; titleDraft = null; postOpen = false; x.v && x.v !== g.version ? older(x.v) : (mig = null); }
      show('b'); draw(); setHash(); scrollTo({ top: root.getBoundingClientRect().top + scrollY - 120, behavior: 'smooth' });
      return;
    }
    show('b'); draw();
  }
  addEventListener('hashchange', () => g && route());

  // ---------- 🛠️ BUILDER ----------
  const older = (from) => {
    mig = { from, diff: undefined };
    const want = mig;
    (API ? fetch(`${API}/api/game/changes?from=${encodeURIComponent(from)}`, { cache: 'no-store' }).then((r) => r.json()) : Promise.resolve(null))
      .catch(() => null).then((x) => { if (mig === want) { mig.diff = x; if (pane === 'b') draw(); } });
  };
  function openBuild(x) {
    const nb = fromCode(x.code);
    if (!nb) { toast('That build can’t be read with today’s game rules.', 'err'); return; }
    if (b) push();
    b = plain(nb); cur = curOf(x); cur.base = code(); titleDraft = null; postOpen = false; postDraft = null;
    outdated(x) ? older(x.version) : (mig = null);
    show('b'); setHash(); draw();
    scrollTo({ top: root.getBoundingClientRect().top + scrollY - 120, behavior: 'smooth' });
  }

  const migHtml = (ev) => {
    if (!mig) return '';
    const items = mig.diff?.items || [];
    const list = mig.diff === undefined ? '<p class="muted small">Checking what changed…</p>'
      : items.length ? `<ul class="bx-mig-l">${items.slice(0, 6).map((x) => `<li><span aria-hidden="true">${esc(x.icon)}</span>${esc(x.text)}</li>`).join('')}${items.length > 6 ? `<li class="muted">+ ${items.length - 6} more</li>` : ''}</ul>`
      : `<p class="muted small">${mig.diff?.unknown ? 'That version is not in the history any more, so the build is shown with today’s rules.' : 'No details for this change. The build is shown with today’s rules.'}</p>`;
    return `<div class="panel bx-mig" role="status"><div class="bx-mig-h"><b>⚠️ Made on older game rules</b><span class="muted small"><code>${esc(mig.from)}</code> → now <code>${esc(g.version)}</code> · max level ${ev.cap}</span><button type="button" class="bx-x" data-bxmigx aria-label="Hide">×</button></div>${list}
<div class="bx-row-acts"><button type="button" class="btn sm" data-bxup>⬆ Upgrade to MAX · L${ev.cap}</button><span class="tiny muted">${cur?.mine ? 'Saves straight away. Undo brings the old one back on screen.' : 'Keeps your points. New points are left to spend.'}</span></div></div>`;
  };

  const bar = (r, top) => { const p = (v) => Math.max(0, Math.min(100, (v / top) * 100)).toFixed(1); return `<span class="bx-bar" aria-hidden="true"><i class="b" style="width:${p(r.base)}%"></i>${r.add ? `<i class="a" style="left:${p(r.base)}%;width:${p(Math.min(r.add, r.top - r.base))}%"></i>` : ''}${r.bonus ? `<i class="m" style="left:${p(r.base + r.add)}%;width:${p(r.bonus)}%"></i>` : ''}${r.top < top ? `<i class="cap" style="left:${p(r.top)}%"></i>` : ''}</span>`; };
  function grpHtml(ev, grp) {
    const rows = ev.rows.filter((r) => r.group === grp.id);
    const avg = Math.round(rows.reduce((s, r) => s + r.value, 0) / (rows.length || 1));
    const key = (ev.arch.group === 'GK') === (grp.id === 'goalkeeping') || grp.id === 'physical' || (ev.arch.group === 'GK' && grp.id === 'pace');
    return `<section class="panel bx-grp${key ? '' : ' dim'}"><header><span>${GICON[grp.id] ?? '•'} ${esc(grp.name)}</span><b class="num">${avg}</b></header>${rows.map((r) => {
      const c = X.canAdd(g, ev, r.name), open = openAttr === r.name;
      return `<div class="bx-row${r.sig ? ' sig' : ''}${r.add ? ' up' : ''}" data-attr="${esc(r.name)}"><button type="button" class="bx-nm" data-bxq aria-expanded="${open}" title="Tap for Min / −5 / +5 / Max">${r.sig ? '<i aria-label="Signature attribute">★</i> ' : ''}${esc(r.name)}</button>
<button type="button" class="bx-pm" data-d="-1" aria-label="Lower ${esc(r.name)}"${r.add ? '' : ' disabled'}>−</button><b class="bx-v num">${r.value}${r.add ? `<small class="a">+${r.add}</small>` : ''}${r.bonus ? `<small class="m" title="Mastery bonus">+${r.bonus}</small>` : ''}${r.mod ? `<small class="${r.mod > 0 ? 'a' : 'neg'}" title="${esc(r.modFrom.map(([f, v]) => `${f} ${v > 0 ? '+' : ''}${v}`).join(' · '))}">${r.mod > 0 ? '+' : ''}${r.mod}</small>` : ''}</b><button type="button" class="bx-pm" data-d="1" aria-label="Raise ${esc(r.name)}"${c == null ? ' disabled' : ''} title="${c == null ? (r.value >= r.top ? `At this archetype’s ceiling (${r.top})` : 'Not enough points left') : `Costs ${c} point${c === 1 ? '' : 's'}`}">+</button>${bar(r, ev.top)}
${open ? `<div class="bx-quick"><button type="button" data-qq="min"${r.add ? '' : ' disabled'}>⏮ Min <small>${r.base}</small></button><button type="button" data-qq="-5"${r.add ? '' : ' disabled'}>−5</button><button type="button" data-qq="+5"${c == null ? ' disabled' : ''}>+5</button><button type="button" data-qq="max"${c == null ? ' disabled' : ''}>Max <small>${r.top}</small> ⏭</button><span class="tiny muted">${r.cost ? `${r.cost} pts in` : 'nothing spent yet'}</span></div>` : ''}</div>`;
    }).join('')}</section>`;
  }
  function xtHtml(ev) {
    const c = ev.choices, sl = ev.slots;
    const fx = (bonus) => Object.entries(bonus || {}).map(([k, v]) => `<span class="${v > 0 ? 'a' : 'neg'}">${v > 0 ? '+' : ''}${v} ${esc(k)}</span>`).join('');
    const none = (what) => `<p class="muted small">No ${what} in game data <code>${esc(g.version)}</code> yet. Managers add them from the in-game screens and they show up here straight away.</p>`;
    let body;
    if (xt === 'playstyles') {
      const list = g.playstyles || [];
      body = !list.length ? none('PlayStyles') : `<p class="muted small">Up to <b>${sl.playstyles}</b> PlayStyles and <b>${sl.plus}</b> PlayStyle+. Tap once to pick, again to make it +, again to remove. <b class="num">${c.ps.length}/${sl.playstyles}</b> · <b class="num">${c.plus.length}/${sl.plus}</b>+</p>
<div class="bx-opts">${list.map((p) => { const on = c.ps.includes(p.id), pl = c.plus.includes(p.id), sig = ev.arch.signaturePlaystyle === p.id; return `<button type="button" class="bx-opt${on ? ' on' : ''}${pl ? ' plus' : ''}" data-ps="${esc(p.id)}" aria-pressed="${on || pl}"${p.desc ? ` title="${esc(p.desc)}"` : ''}><span aria-hidden="true">${esc(p.icon || '💫')}</span><b>${esc(p.name)}${pl ? ' <i>+</i>' : ''}</b>${sig ? '<small class="g">★ signature</small>' : p.plus === false ? '<small class="muted">no +</small>' : ''}</button>`; }).join('')}</div>`;
    } else if (xt === 'specializations') {
      const list = X.specsFor(g, b.arch);
      body = !list.length ? none(`Specializations for ${esc(ev.arch.name)}`) : `<p class="muted small">One Specialization per build.</p><div class="bx-opts wide">${list.map((s) => `<button type="button" class="bx-opt wide${c.sp === s.id ? ' on' : ''}" data-sp="${esc(s.id)}" aria-pressed="${c.sp === s.id}"><span aria-hidden="true">🎓</span><b>${esc(s.name)}</b>${s.desc ? `<small class="muted">${esc(s.desc)}</small>` : ''}<span class="bx-fx">${fx(s.bonus)}</span></button>`).join('')}</div>`;
    } else if (xt === 'facilities') {
      const list = g.facilities || [];
      body = !list.length ? none('Facilities') : `<p class="muted small">Up to <b>${sl.facilities}</b> Facilities · <b class="num">${c.fa.length}/${sl.facilities}</b></p><div class="bx-opts wide">${list.map((f) => `<button type="button" class="bx-opt wide${c.fa.includes(f.id) ? ' on' : ''}" data-fa="${esc(f.id)}" aria-pressed="${c.fa.includes(f.id)}"><span aria-hidden="true">🏟️</span><b>${esc(f.name)}</b>${f.desc ? `<small class="muted">${esc(f.desc)}</small>` : ''}<span class="bx-fx">${fx(f.bonus)}</span></button>`).join('')}</div>`;
    } else {
      const H = X.rangeOf(g, 'height'), W = X.rangeOf(g, 'weight'), mods = X.modsOf(g, b);
      const from = (src) => { const l = Object.entries(mods).flatMap(([k, v]) => v.filter(([f]) => f === src).map(([, n]) => [k, n])); return l.length ? `<span class="bx-fx">${fx(Object.fromEntries(l))}</span>` : '<span class="tiny muted">No change at this value</span>'; };
      body = `<div class="bx-body"><label><span>📏 Height <b class="num" data-bv="h">${c.h}</b> cm</span><input type="range" min="${H.min}" max="${H.max}" value="${c.h}" data-body="h" aria-label="Height in cm">${from('Height')}</label>
<label><span>⚖️ Weight <b class="num" data-bv="w">${c.w}</b> kg</span><input type="range" min="${W.min}" max="${W.max}" value="${c.w}" data-body="w" aria-label="Weight in kg">${from('Weight')}</label></div>${!g.body?.heightMods?.length && !g.body?.weightMods?.length ? '<p class="tiny muted">Height and weight tables are not entered yet, so body size does not change attributes here.</p>' : ''}`;
    }
    const n = { playstyles: c.ps.length + c.plus.length, specializations: c.sp ? 1 : 0, facilities: c.fa.length, body: 0 };
    return `<div class="panel bx-xt"><div class="chips" role="tablist" aria-label="Extras">${XT.map(([k, i, l]) => `<button type="button" role="tab" class="chip${k === xt ? ' on' : ''}" aria-selected="${k === xt}" data-xt="${k}">${i} ${l}${n[k] ? ` <small class="num">${n[k]}</small>` : ''}</button>`).join('')}</div><div class="bx-xp">${body}</div></div>`;
  }
  function postHtml(ev) {
    const p = postDraft ?? { position: cur?.position || ev.fit[0]?.[0] || 'ST', mode: cur?.mode || 'league', description: '', clip: '', tags: '' };
    return `<form class="bx-post" data-bxpost><div class="eyebrow">📣 ${cur?.posted && cur.mine ? 'Update your post' : 'Post to Pro Builds'}</div>
<div class="bx-2"><label><span>Position</span><select name="position">${POS.map((x) => `<option${x === p.position ? ' selected' : ''}>${x}</option>`).join('')}</select></label><fieldset><legend>Mode</legend>${Object.entries(MODES).map(([k, [i, l]]) => `<label class="chip bx-radio"><input type="radio" name="mode" value="${k}"${p.mode === k ? ' checked' : ''}> ${i} ${l}</label>`).join('')}</fieldset></div>
<label><span>How to play it</span><textarea name="description" maxlength="1000" rows="3" placeholder="Role, runs, which PlayStyles carry it…">${esc(p.description)}</textarea></label>
<div class="bx-2"><label><span>Clip link <small class="muted">optional · YouTube, Twitch, Medal…</small></span><input name="clip" type="url" maxlength="300" value="${esc(p.clip)}" placeholder="https://youtu.be/…"></label><label><span>Tags <small class="muted">up to 5, commas</small></span><input name="tags" maxlength="120" value="${esc(p.tags)}" placeholder="pace, finesse, rush"></label></div>
<p class="tiny muted">Archetype, level, game rules version and PlayStyles are labelled for you. ${cur?.mine ? 'Posting also saves what is on screen to this build.' : 'It is saved to My builds too.'}</p>
<div class="bx-row-acts"><button type="submit" class="btn gold sm"${busy ? ' disabled' : ''}>📣 ${cur?.posted && cur.mine ? 'Update post' : 'Post it'}</button><button type="button" class="btn ghost sm" data-bxpostx>Cancel</button></div></form>`;
  }
  function sideHtml(ev) {
    const grp = (g.archetypeGroups || []).find((x) => x.id === ev.arch.group);
    const left = ev.total ? Math.max(0, ev.left / ev.total) : 0, C = 2 * Math.PI * 30;
    const title = titleDraft ?? (cur?.mine ? cur.title : `${ev.arch.name} L${ev.level}`);
    const state = cur ? (cur.mine ? (dirty() ? '<span class="bx-dirty">● Unsaved changes</span>' : '<span class="bx-ok">✓ Saved</span>') : `<span class="muted tiny">by ${esc(cur.by || 'a member')}</span>`) : '';
    const masteries = (g.masteries || []).filter((m) => m.archetype === ev.arch.id);
    const sigPs = ev.arch.signaturePlaystyle && nameIn(g.playstyles, ev.arch.signaturePlaystyle);
    return `<aside class="panel bx-side">
${cur ? `<div class="bx-cur"><span aria-hidden="true">${cur.mine ? '📂' : '👀'}</span><div><small class="muted">${cur.mine ? 'My build' : cur.posted ? 'Pro build' : 'A member’s build'}${cur.posted && cur.mine ? ' · 📣 posted' : ''}</small><b>${esc(cur.title)}</b>${state}</div>${cur.mine ? '' : `<button type="button" class="btn sm" data-bxfork="${cur.id}"${busy ? ' disabled' : ''}>🍴 Copy</button>`}<button type="button" class="bx-x" data-bxclose aria-label="Close this build" title="Start fresh (keeps what is on screen)">×</button></div>` : ''}
<div class="bx-arch"><span class="bx-ic" aria-hidden="true">${ICON[ev.arch.group] ?? '⚽'}</span><div><small class="muted">${esc(grp?.name ?? '')}${ev.arch.positions?.length ? ` · ${ev.arch.positions.map(esc).join(' ')}` : ''}</small><h3>${esc(ev.arch.name)}</h3>${sigPs ? `<small class="g">★ ${esc(sigPs)}</small>` : ''}</div><div class="bx-ovr" title="Estimated overall"><b class="num">${ev.ovr}</b><small>OVR*</small></div></div>
<div class="bx-lvl"><div class="bx-ring${ev.level === ev.cap ? ' max' : ''}" aria-hidden="true"><svg viewBox="0 0 72 72"><circle class="t" cx="36" cy="36" r="30"/><circle class="f" cx="36" cy="36" r="30" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - ev.level / ev.cap)).toFixed(1)}"/></svg><b class="num" data-bxl>${ev.level}</b></div>
<label><span>Level <b class="num" data-bxl>${ev.level}</b> of ${ev.cap}${ev.level === ev.cap ? ' <span class="pill s">MAX</span>' : ''}</span><input type="range" min="1" max="${ev.cap}" value="${ev.level}" data-level aria-label="Level"></label><button type="button" class="btn sm${ev.level === ev.cap ? ' ghost' : ''}" data-bxmax>MAX</button></div>
<div class="bx-ap${ev.left === 0 && ev.total ? ' full' : ''}"><div><small class="muted">Archetype points left</small><b class="num" data-bxap>${ev.left}</b><span class="muted" data-bxapt>/ ${ev.total}</span></div><span class="bx-apbar"><i style="width:${(left * 100).toFixed(1)}%"></i></span></div>
<div class="bx-face">${ev.face.map(([k, v]) => `<div><small>${k}</small><b class="num ${v >= 80 ? 'hi' : v >= 65 ? 'mid' : ''}">${v}</b></div>`).join('')}</div>
<div class="bx-fit"><small class="muted">📍 Best positions*</small>${ev.fit.slice(0, 3).map(([p, v], i) => `<div class="${i ? '' : 'best'}"><b>${esc(p)}</b><span class="bx-bar"><i class="a" style="left:0;width:${Math.min(100, (v / ev.top) * 100).toFixed(1)}%"></i></span><em class="num">${v}</em></div>`).join('')}</div>
<div class="bx-row-acts"><button type="button" class="btn ghost sm" data-bxundo${hist.length ? '' : ' disabled'}>↶ Undo</button><button type="button" class="btn ghost sm" data-bxreset${ev.used ? '' : ' disabled'}>⟲ Reset</button><button type="button" class="btn ghost sm" data-bxshare>🔗 Share</button></div>
<div class="bx-save"><label><span class="tiny muted">Name</span><input data-bxtitle maxlength="60" value="${esc(title)}" aria-label="Build name"></label>
${signed() ? `<div class="bx-row-acts"><button type="button" class="btn gold sm" data-bxsave${busy ? ' disabled' : ''}>💾 ${cur?.mine ? 'Save' : 'Save to My builds'}</button>${cur?.mine ? `<button type="button" class="btn ghost sm" data-bxsavenew${busy ? ' disabled' : ''}>＋ Save as new</button>` : ''}<button type="button" class="btn ghost sm" data-bxpostgo aria-expanded="${postOpen}">📣 ${cur?.posted && cur.mine ? 'Update post' : 'Post'}</button></div>${cur?.posted && cur.mine ? `<button type="button" class="bx-link" data-bxunpost="${cur.id}">Take the post down</button>` : ''}`
    : `<button type="button" class="btn gold sm" data-bxlogin>🔐 Sign in to save</button>`}
${postOpen && signed() ? postHtml(ev) : ''}</div>
<p class="tiny muted">* Face stats are group averages and OVR is an estimate: EA does not publish its formula. Game rules <code>${esc(g.version)}</code>, max level ${ev.cap} (${capWord()}).</p>
${masteries.length ? `<div class="bx-mast"><b>🏅 Masteries</b>${masteries.map((m) => `<span class="${ev.level >= m.level ? 'on' : ''}">L${m.level}: ${Object.entries(m.bonus).map(([k, v]) => `+${v} ${esc(k)}`).join(', ')}</span>`).join('')}</div>` : ''}
</aside>`;
  }
  function builderHtml() {
    const ev = X.evaluate(g, b), st = ev.status;
    return `${migHtml(ev)}${st.preview ? `<div class="panel bx-note"><b>🧪 Placeholder numbers</b> <span class="muted small">${[!st.base && 'base attributes', !st.ap && 'points per level', !st.costs && 'point costs'].filter(Boolean).join(', ')} for this archetype are not entered from the game yet, so the builder uses placeholders.</span></div>` : ''}
<div class="panel bx-pick">${(g.archetypeGroups || []).map((grp) => `<div class="bx-pg"><small class="muted">${ICON[grp.id] ?? ''} ${esc(grp.name)}</small><div class="chips">${(g.archetypes || []).filter((a) => a.group === grp.id).map((a) => `<button type="button" class="chip${a.id === ev.arch.id ? ' on' : ''}" data-arch="${esc(a.id)}" aria-pressed="${a.id === ev.arch.id}">${esc(a.name)}</button>`).join('')}</div></div>`).join('')}</div>
<div class="bx-main">${sideHtml(ev)}<div class="bx-left"><div class="bx-grps">${(g.attributeGroups || []).map((grp) => grpHtml(ev, grp)).join('')}</div>${xtHtml(ev)}</div></div>`;
  }
  const draw = () => {
    if (!g || !b) return;
    bxb.removeAttribute('aria-busy');
    keepScroll(() => { bxb.innerHTML = builderHtml(); });
    const on = $('.bx-pick .chip.on', bxb), rail = on?.closest('.bx-pick'); // phone: the picker is one swipeable row, keep the picked one in view (moving the rail, not the page)
    if (rail && rail.scrollWidth > rail.clientWidth) rail.scrollLeft += on.getBoundingClientRect().left - rail.getBoundingClientRect().left - (rail.clientWidth - on.offsetWidth) / 2;
  };

  function step(name, dir, times) {
    push();
    for (let i = 0; i < times; i++) {
      const ev = X.evaluate(g, b), n = b.spent[name] || 0;
      if (dir > 0 && X.canAdd(g, ev, name) == null) break;
      if (dir < 0 && !n) break;
      b.spent[name] = n + dir; if (!b.spent[name]) delete b.spent[name];
    }
    if (hist.at(-1) === JSON.stringify(b)) hist.pop();
    setHash(); draw();
  }
  async function save(asNew) {
    if (!signed()) return login('save');
    const ev = X.evaluate(g, b), title = (titleDraft ?? '').trim() || (cur?.mine && !asNew ? cur.title : `${ev.arch.name} L${ev.level}`);
    const upd = !asNew && cur?.mine && cur.id;
    busy = true; draw();
    try {
      const r = await send('/api/builds', { ...(upd ? { id: cur.id } : {}), title, code: code() });
      mine = r; const s = r.builds.find((x) => x.id === r.saved);
      if (s) { cur = curOf(s); cur.base = code(); }
      titleDraft = null; mig = null; toast(`Saved “${s?.title ?? title}” to My builds`, 'ok', '💾');
    } catch (e) { toast(e.message, 'err'); }
    busy = false; draw();
  }
  async function fork(id) {
    if (!signed()) return login();
    busy = true; draw();
    try {
      const r = await send('/api/builds/fork', { id }); mine = r;
      const s = r.builds.find((x) => x.id === r.saved);
      busy = false; if (s) openBuild(s);
      toast('Copied into My builds. Change it however you like.', 'ok', '🍴');
    } catch (e) { busy = false; draw(); toast(e.message, 'err'); }
  }
  async function upgradeHere() {
    push(); b = X.fit(g, { ...b, level: cap() }); mig = null; setHash();
    const ev = X.evaluate(g, b);
    if (cur?.mine && cur.id && signed()) {
      try { mine = await send('/api/builds', { id: cur.id, title: cur.title, code: code() }); cur.base = code(); cur.version = g.version; toast(`“${cur.title}” is on ${g.version} at MAX${ev.left ? ` · ${ev.left} points to spend` : ''}`, 'ok', '⬆'); } catch (e) { toast(e.message, 'err'); }
    } else toast(`Upgraded to MAX on ${g.version}${ev.left ? `. ${ev.left} points to spend` : ''}. Save to keep it.`, 'ok', '⬆');
    draw();
  }
  async function postIt(form) {
    const fd = new FormData(form);
    postDraft = { position: fd.get('position'), mode: fd.get('mode') || 'league', description: fd.get('description') || '', clip: String(fd.get('clip') || '').trim(), tags: fd.get('tags') || '' };
    const ev = X.evaluate(g, b), own = cur?.mine && cur.id;
    const title = (titleDraft ?? '').trim() || (own ? cur.title : `${ev.arch.name} L${ev.level}`);
    busy = true; draw();
    try {
      const r = await send('/api/probuilds/post', { ...(own ? { id: cur.id } : {}), code: code(), title, ...postDraft, tags: postDraft.tags.split(',') });
      cur = curOf({ ...r.build, mine: true, posted: true }); cur.base = code();
      postDraft = null; postOpen = false; titleDraft = null; mine = null; board = null;
      toast('Posted to Pro Builds. Open the 🏆 tab to see it.', 'ok', '📣');
    } catch (e) { toast(e.message, 'err'); }
    busy = false; draw();
  }
  async function unpost(id, btn) {
    if (!twoTap(btn, 'Tap again to take it down')) return;
    busy = true;
    try { await send('/api/probuilds/unpost', { id }); if (cur?.id === id) cur.posted = false; board = null; mine = null; toast('Taken off the Pro Builds board. It stays in My builds.', 'ok', '📣'); } catch (e) { toast(e.message, 'err'); }
    busy = false; draw();
  }

  bxb.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    const row = t.closest('[data-attr]');
    if ('bxq' in t.dataset) { openAttr = openAttr === row.dataset.attr ? null : row.dataset.attr; draw(); return; }
    if (t.dataset.qq) { const q = t.dataset.qq; step(row.dataset.attr, q === 'min' || q === '-5' ? -1 : 1, q === 'min' || q === 'max' ? 500 : 5); return; }
    if (t.dataset.d) { step(row.dataset.attr, +t.dataset.d, e.shiftKey ? 5 : 1); return; }
    if (t.dataset.arch) { if (t.dataset.arch === b.arch) return; push(); b = { ...b, arch: t.dataset.arch, spent: {}, sp: null }; openAttr = null; setHash(); draw(); return; }
    if (t.dataset.xt) { xt = t.dataset.xt; draw(); return; }
    if (t.dataset.ps) {
      const id = t.dataset.ps, p = (g.playstyles || []).find((x) => x.id === id), c = X.choices(g, b), sl = X.slotsOf(g);
      push();
      if (c.plus.includes(id)) b = { ...b, ps: c.ps, plus: c.plus.filter((x) => x !== id) };
      else if (c.ps.includes(id)) { const ps = c.ps.filter((x) => x !== id); b = p?.plus !== false && c.plus.length < sl.plus ? { ...b, ps, plus: [...c.plus, id] } : { ...b, ps, plus: c.plus }; }
      else if (c.ps.length < sl.playstyles) b = { ...b, ps: [...c.ps, id], plus: c.plus };
      else { hist.pop(); toast(`All ${sl.playstyles} PlayStyle slots are full. Remove one first.`, 'err'); return; }
      setHash(); draw(); return;
    }
    if (t.dataset.sp) { push(); b = { ...b, sp: b.sp === t.dataset.sp ? null : t.dataset.sp }; setHash(); draw(); return; }
    if (t.dataset.fa) {
      const c = X.choices(g, b), sl = X.slotsOf(g), id = t.dataset.fa;
      if (!c.fa.includes(id) && c.fa.length >= sl.facilities) { toast(`All ${sl.facilities} Facility slots are full. Remove one first.`, 'err'); return; }
      push(); b = { ...b, fa: c.fa.includes(id) ? c.fa.filter((x) => x !== id) : [...c.fa, id] }; setHash(); draw(); return;
    }
    if ('bxmax' in t.dataset) { push(); b.level = cap(); setHash(); draw(); }
    else if ('bxundo' in t.dataset && hist.length) { b = JSON.parse(hist.pop()); setHash(); draw(); }
    else if ('bxreset' in t.dataset) { push(); b.spent = {}; setHash(); draw(); toast('Points reset. Undo brings them back.', 'ok', '⟲'); }
    else if ('bxshare' in t.dataset) { setHash(); share(code(), cur?.title || `${archName(b.arch)} L${b.level}`); }
    else if ('bxsave' in t.dataset) save(false);
    else if ('bxsavenew' in t.dataset) save(true);
    else if ('bxpostgo' in t.dataset) { postOpen = !postOpen; draw(); if (postOpen) $('[data-bxpost] select', bxb)?.focus(); }
    else if ('bxpostx' in t.dataset) { postOpen = false; draw(); }
    else if (t.dataset.bxunpost) unpost(+t.dataset.bxunpost, t);
    else if (t.dataset.bxfork) fork(+t.dataset.bxfork);
    else if ('bxclose' in t.dataset) { if (dirty() && !twoTap(t, '✕?')) return; cur = null; titleDraft = null; postOpen = false; draw(); }
    else if ('bxup' in t.dataset) upgradeHere();
    else if ('bxmigx' in t.dataset) { mig = null; draw(); }
    else if ('bxlogin' in t.dataset) login('save');
  });
  bxb.addEventListener('submit', (e) => { if (e.target.matches('[data-bxpost]')) { e.preventDefault(); if (!busy) postIt(e.target); } });
  let dragging = false; // one undo step per slider drag
  bxb.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches('[data-bxtitle]')) { titleDraft = el.value; return; }
    if (el.closest('[data-bxpost]')) { const fd = new FormData(el.form); postDraft = { position: fd.get('position'), mode: fd.get('mode') || 'league', description: fd.get('description') || '', clip: fd.get('clip') || '', tags: fd.get('tags') || '' }; return; }
    if (el.matches('[data-level], [data-body]') && !dragging) { push(); dragging = true; }
    if (el.matches('[data-body]')) { b = { ...b, [el.dataset.body]: +el.value }; $(`[data-bv="${el.dataset.body}"]`, bxb).textContent = el.value; setHash(); return; }
    if (!el.matches('[data-level]')) return;
    const next = X.fit(g, { ...b, level: +el.value }), lost = Object.keys(b.spent).some((k) => (next.spent[k] || 0) !== b.spent[k]);
    b = next; setHash();
    const ev = X.evaluate(g, b); // numbers only while dragging, full redraw on release keeps the slider under the finger
    $$('[data-bxl]', bxb).forEach((x) => { x.textContent = ev.level; });
    $('[data-bxap]', bxb).textContent = ev.left; $('[data-bxapt]', bxb).textContent = `/ ${ev.total}`;
    if (lost) toast('Lower level: points were taken back from the dearest attributes.', 'ok', '↘');
  });
  bxb.addEventListener('change', (e) => { if (e.target.matches('[data-level], [data-body]')) { dragging = false; draw(); } });
  bxb.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-bxtitle]') && signed()) { e.preventDefault(); save(false); } });
  addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- a build's read-only sheet (Pro build detail + My builds peek): archetype, attributes, points ----------
  function sheet(c, opts = {}) {
    const x = fromCode(c);
    if (!x) return '<p class="muted small">This build can’t be read with today’s game rules.</p>';
    const ev = X.evaluate(g, plain(x)), ch = ev.choices;
    const ps = [...ch.plus.map((id) => `${nameIn(g.playstyles, id)}+`), ...ch.ps.map((id) => nameIn(g.playstyles, id))];
    const trained = ev.rows.filter((r) => r.add), spent = ev.rows.reduce((s, r) => s + r.cost, 0);
    return `<div class="bx-sheet"><div class="bx-sh-top"><div class="bx-arch"><span class="bx-ic" aria-hidden="true">${ICON[ev.arch.group] ?? '⚽'}</span><div><small class="muted">${esc((g.archetypeGroups || []).find((q) => q.id === ev.arch.group)?.name ?? '')}</small><h3>${esc(ev.arch.name)}</h3><small>Level ${ev.level}${ev.level === ev.cap ? ' <span class="pill s">MAX</span>' : ` of ${ev.cap}`}</small></div><div class="bx-ovr"><b class="num">${ev.ovr}</b><small>OVR*</small></div></div>
<div class="bx-face">${ev.face.map(([k, v]) => `<div><small>${k}</small><b class="num ${v >= 80 ? 'hi' : v >= 65 ? 'mid' : ''}">${v}</b></div>`).join('')}</div></div>
<p class="small bx-pts">🪙 <b class="num">${spent}</b> of <b class="num">${ev.total}</b> archetype points spent on <b class="num">${trained.length}</b> attribute${trained.length === 1 ? '' : 's'}${ev.left ? ` · ${ev.left} left` : ''} · 📍 ${ev.fit.slice(0, 3).map(([p, v]) => `${esc(p)} ${v}`).join(' · ')}</p>
${ps.length || ch.sp || ch.fa.length ? `<div class="bx-tags">${ps.map((p) => `<span>💫 ${esc(p)}</span>`).join('')}${ch.sp ? `<span>🎓 ${esc(nameIn(g.specializations, ch.sp))}</span>` : ''}${ch.fa.map((f) => `<span>🏟️ ${esc(nameIn(g.facilities, f))}</span>`).join('')}<span>📏 ${ch.h} cm · ${ch.w} kg</span></div>` : `<div class="bx-tags"><span>📏 ${ch.h} cm · ${ch.w} kg</span></div>`}
<div class="bx-shg">${(g.attributeGroups || []).map((grp) => { const rows = ev.rows.filter((r) => r.group === grp.id); if (opts.compact && !rows.some((r) => r.add)) return ''; return `<div><b class="tiny">${GICON[grp.id] ?? ''} ${esc(grp.name)}</b><ul>${rows.filter((r) => !opts.compact || r.add || r.sig).map((r) => `<li class="${r.add ? 'up' : ''}"><span>${r.sig ? '<i class="g">★</i> ' : ''}${esc(r.name)}</span><b class="num">${r.value}</b>${r.add ? `<small title="${r.cost} archetype points">+${r.add}</small>` : '<small></small>'}</li>`).join('')}</ul></div>`; }).join('')}</div></div>`;
  }

  // ---------- 🏆 PRO BUILDS (the club board, public to read) ----------
  async function loadBoard(force) {
    if (!API) { bxp.innerHTML = '<div class="panel sq-empty"><span>🏆</span><div><b>Pro builds load from the club server</b><p class="muted small">This preview copy has no server. The published preview shows the real board.</p></div></div>'; return; }
    if (board && !force) return;
    bxp.innerHTML = '<div class="panel"><div class="sk-wrap"><span class="sk"></span><span class="sk s2"></span><span class="sk s3"></span></div></div>';
    try { const r = await get('/api/probuilds'); board = r.builds || []; boardErr = null; } catch (e) { boardErr = e; }
  }
  const hot = (x) => (x.score + x.comments * 0.5 + 1) / Math.pow((Date.now() - x.at) / 36e5 + 2, 1.3);
  const cardHtml = (x, i) => { const a = archOf(x.arch), [mi, ml] = MODES[x.mode] || ['', ''];
    return `<li style="--i:${Math.min(i, 10)}"><a class="bx-card${x.featured ? ' feat' : ''}" href="#b=${x.id}"><span class="bx-ic" aria-hidden="true">${ICON[a?.group] ?? '⚽'}</span><div class="bx-ct"><b>${esc(x.title)}</b><small class="muted">${esc(archName(x.arch))} · L${x.level}${x.level >= cap() ? ' MAX' : ''}${outdated(x) ? ' · <span class="bx-old">older rules</span>' : ''}</small></div>
<div class="bx-cs"><span class="pill">${esc(x.position || '–')}</span><span class="tiny">${mi} ${ml}</span></div>${x.featured ? `<div class="bx-feat">⭐ Club recommended · ${esc(x.featured)}</div>` : ''}${x.desc ? `<p class="small muted bx-desc">${esc(x.desc)}${x.more ? '…' : ''}</p>` : ''}
<div class="bx-cf"><span class="bx-by">${x.by?.a ? `<img src="${esc(x.by.a)}" alt="" loading="lazy">` : '<i aria-hidden="true">👤</i>'}${esc(x.by?.n || 'Member')}</span><span class="tiny muted">▲ <b class="num">${x.score}</b> · 💬 <b class="num">${x.comments}</b> · ${esc(ago(x.at))}</span></div></a></li>`; };
  async function paintBoard(force) {
    if (detailId) return paintDetail();
    await loadBoard(force);
    if (!API || pane !== 'p' || detailId) return;
    if (boardErr) { bxp.innerHTML = failBox('Pro builds', boardErr, 'board'); return; }
    const q = F.q.toLowerCase();
    const list = board.filter((x) => (F.mode === 'all' || x.mode === F.mode) && (!F.line || LINE[x.position] === F.line) && (!q || `${x.title} ${archName(x.arch)} ${x.by?.n} ${(x.tags || []).join(' ')}`.toLowerCase().includes(q)))
      .sort({ hot: (a, c) => hot(c) - hot(a), top: (a, c) => c.score - a.score || c.at - a.at, new: (a, c) => c.at - a.at }[F.sort]);
    const feat = board.filter((x) => x.featured);
    const chip = (k, v, l, on) => `<button type="button" class="chip${on ? ' on' : ''}" aria-pressed="${on}" data-f${k}="${v}">${l}</button>`;
    const html = `<div class="bx-bar2"><div class="chips" role="group" aria-label="Sort">${[['hot', '🔥 Hot'], ['top', '🏆 Top'], ['new', '🆕 New']].map(([k, l]) => chip('sort', k, l, F.sort === k)).join('')}</div>
<div class="chips" role="group" aria-label="Mode">${[['all', 'All modes'], ['league', '🏟️ League'], ['rush', '⚡ Rush']].map(([k, l]) => chip('mode', k, l, F.mode === k)).join('')}</div>
<div class="chips" role="group" aria-label="Line">${[['', 'Any line'], ['GK', '🧤 GK'], ['DEF', '🛡️ DEF'], ['MID', '🎯 MID'], ['FWD', '⚡ FWD']].map(([k, l]) => chip('line', k, l, F.line === k)).join('')}</div>
<label class="pb-q"><span aria-hidden="true">🔎</span><input type="search" data-bxq2 placeholder="Find a build" value="${esc(F.q)}" aria-label="Find a build by name, archetype, author or tag"></label></div>
${feat.length && !q && F.sort === 'hot' ? `<div class="panel bx-shelf"><div class="eyebrow">⭐ Club recommended</div><ul class="bx-grid">${feat.slice(0, 3).map(cardHtml).join('')}</ul></div>` : ''}
${list.length ? `<p class="tiny muted">${list.length} build${list.length === 1 ? '' : 's'} on the board</p><ul class="bx-grid">${list.map(cardHtml).join('')}</ul>`
    : `<div class="panel sq-empty"><span>${board.length ? '🔍' : '📭'}</span><div><b>${board.length ? 'No builds match' : 'No pro builds posted yet'}</b><p class="muted small">${board.length ? 'Try another filter or clear the search.' : 'Make one in the 🛠️ Builder and press 📣 Post.'}</p></div></div>`}`;
    keepScroll(() => { bxp.innerHTML = html; });
  }
  async function openDetail(id) {
    detailId = id; detail = null;
    if (!API) return loadBoard();
    bxp.innerHTML = '<div class="panel"><div class="sk-wrap"><span class="sk"></span><span class="sk s2"></span><span class="sk s3"></span></div></div>';
    try { detail = await get(`/api/probuilds/get?id=${id}`); } catch (e) { detail = { err: e }; }
    if (detailId === id) paintDetail();
  }
  function paintDetail() {
    if (!detail) return;
    if (detail.err) { bxp.innerHTML = `<a class="bx-back" href="#pro">← All pro builds</a>${failBox('this build', detail.err, 'detail')}`; return; }
    const x = detail.build, [mi, ml] = MODES[x.mode] || ['', ''];
    bxp.innerHTML = `<a class="bx-back" href="#pro">← All pro builds</a><article class="panel bx-det"><header class="bx-dh"><div><div class="eyebrow">${mi} ${ml} · ${esc(x.position || '–')}${x.featured ? ` · ⭐ ${esc(x.featured)}` : ''}</div><h3>${esc(x.title)}</h3>
<p class="small muted"><span class="bx-by">${x.by?.a ? `<img src="${esc(x.by.a)}" alt="">` : '👤 '}${esc(x.by?.n || 'Member')}</span> · posted ${esc(ago(x.at))} · ▲ <b class="num">${x.up}</b> ▼ <b class="num">${x.down}</b> · rules <code>${esc(x.version || '–')}</code>${outdated(x) ? ' <span class="bx-old">older rules</span>' : ''}</p></div></header>
${x.desc ? `<p class="bx-dd">${esc(x.desc)}</p>` : ''}${x.tags?.length || x.clip ? `<div class="bx-tags">${(x.tags || []).map((t) => `<span>#${esc(t)}</span>`).join('')}${x.clip ? `<a href="${esc(x.clip)}" target="_blank" rel="noopener noreferrer">🎬 Watch the clip</a>` : ''}</div>` : ''}
${sheet(x.code)}
<div class="bx-row-acts"><button type="button" class="btn gold sm" data-bxopen>🛠️ ${x.mine ? 'Edit in the Builder' : 'Try it in the Builder'}</button>${signed() && !x.mine ? `<button type="button" class="btn ghost sm" data-bxfork2="${x.id}">🍴 Copy to My builds</button>` : ''}<button type="button" class="btn ghost sm" data-bxshare2>🔗 Share</button><a class="btn ghost sm" href="../probuilds.html#b=${x.id}">💬 Vote &amp; comment</a></div></article>
<section class="panel bx-com"><div class="eyebrow">💬 Comments · ${detail.comments.length}</div>${detail.comments.length ? `<ul>${detail.comments.map((c) => `<li><span class="bx-by">${c.by?.a ? `<img src="${esc(c.by.a)}" alt="">` : '👤 '}<b>${esc(c.by?.n || 'Member')}</b></span><small class="muted">${esc(ago(c.at))}</small><p>${esc(c.text)}</p></li>`).join('')}</ul>` : '<p class="muted small">No comments yet.</p>'}<p class="tiny muted">Voting and comments stay on the live board for now.</p></section>`;
  }
  bxp.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.fsort != null) F.sort = t.dataset.fsort; else if (t.dataset.fmode != null) F.mode = t.dataset.fmode; else if (t.dataset.fline != null) F.line = t.dataset.fline;
    else if (t.dataset.bxretry) return t.dataset.bxretry === 'detail' ? openDetail(detailId) : paintBoard(true);
    else if ('bxopen' in t.dataset) return openBuild({ ...detail.build, posted: true });
    else if (t.dataset.bxfork2) return fork(+t.dataset.bxfork2);
    else if ('bxshare2' in t.dataset) return share(`b=${detail.build.id}`, detail.build.title);
    else return;
    try { sessionStorage.setItem('nx.bx.f', JSON.stringify(F)); } catch {}
    paintBoard();
  });
  bxp.addEventListener('input', (e) => { if (e.target.matches('[data-bxq2]')) { F.q = e.target.value; const at = e.target.selectionStart; paintBoard().then(() => { const i = $('[data-bxq2]', bxp); if (i) { i.focus(); i.setSelectionRange(at, at); } }); } });
  try { Object.assign(F, JSON.parse(sessionStorage.getItem('nx.bx.f') || '{}'), { q: '' }); } catch {}

  // ---------- 📂 MY BUILDS ----------
  let peek = null;
  async function paintMine(force) {
    if (!signed()) { bxm.innerHTML = gate('see your builds'); return; }
    if (!mine || force) {
      bxm.innerHTML = '<div class="panel"><div class="sk-wrap"><span class="sk"></span><span class="sk s2"></span><span class="sk s3"></span></div></div>';
      try { mine = await get('/api/builds'); mineErr = null; get('/api/builds/impact').then((r) => { impact = new Map((r.builds ?? []).map((x) => [x.id, x])); if (pane === 'm') paintMine(); }).catch(() => {}); } catch (e) { mineErr = e; }
    }
    if (pane !== 'm') return;
    if (mineErr) { bxm.innerHTML = failBox('your builds', mineErr, 'mine'); return; }
    const list = mine.builds || [], picks = mine.picks || {}, old = list.filter(outdated);
    const html = `<div class="bx-mtop"><div class="panel bx-msum"><div class="tp-ring" style="--f:${(list.length / (mine.max || 50)).toFixed(3)}" role="img" aria-label="${list.length} of ${mine.max} builds saved"><b class="num">${list.length}</b><small>of ${mine.max}</small></div><div><div class="eyebrow">📂 My builds</div><h3>${list.length ? `${list.length} saved build${list.length === 1 ? '' : 's'}` : 'Nothing saved yet'}</h3><p class="small muted">${Object.entries(MODES).map(([k, [i, l]]) => { const p = list.find((x) => x.id === picks[k]); return `${i} ${l} build: <b>${p ? esc(p.title) : 'not picked'}</b>`; }).join(' · ')}</p></div></div>
${old.length ? `<div class="panel bx-mig"><b>⚠️ ${old.length} build${old.length === 1 ? ' is' : 's are'} on older game rules</b><p class="small muted">Now <code>${esc(g.version)}</code>, max level ${cap()}. Upgrading keeps your points and moves the level to MAX.</p><button type="button" class="btn sm" data-bxupall>⬆ Upgrade ${old.length === 1 ? 'it' : `all ${old.length}`}</button></div>` : '<div class="panel bx-tip"><div class="eyebrow">💡 Tip</div><p class="small muted">Open a build to change it in the 🛠️ Builder, then press 💾 Save. 🔗 Share sends a link anyone can open.</p></div>'}</div>
${list.length ? `<ul class="bx-mlist">${list.map((x, i) => { const imp = impact.get(x.id);
      return `<li style="--i:${Math.min(i, 10)}" class="panel${cur?.id === x.id ? ' on' : ''}"><div class="bx-mh"><span class="bx-ic" aria-hidden="true">${ICON[archOf(x.arch)?.group] ?? '⚽'}</span><div class="bx-ct"><b>${esc(x.title)}</b><small class="muted">${esc(archName(x.arch))} · L${x.level}${x.level >= cap() && !outdated(x) ? ' MAX' : ''} · ${esc(ago(x.updated))}${x.forkedFrom ? ' · 🍴 copy' : ''}</small>
<span class="bx-badges">${x.posted ? '<span class="pill">📣 Posted</span>' : ''}${Object.entries(MODES).filter(([k]) => picks[k] === x.id).map(([, [ic, l]]) => `<span class="pill s">${ic} My ${l} build</span>`).join('')}${outdated(x) ? `<span class="bx-old" title="${esc(imp?.changes?.map((c) => c.text).join(' · ') || `Made on ${x.version}`)}">⚠ ${imp?.breaking ? esc(imp.changes[0]?.text ?? 'needs attention') : 'older rules'}</span>` : ''}</span></div></div>
<div class="bx-row-acts"><button type="button" class="btn sm" data-bxedit="${x.id}">🛠️ Edit</button><button type="button" class="btn ghost sm" data-bxpeek="${x.id}" aria-expanded="${peek === x.id}">👁 ${peek === x.id ? 'Hide' : 'Details'}</button><button type="button" class="btn ghost sm" data-bxsh="${x.id}">🔗 Share</button>${outdated(x) ? `<button type="button" class="btn ghost sm" data-bxup1="${x.id}">⬆ Upgrade</button>` : ''}<button type="button" class="btn ghost sm bx-del" data-bxdel="${x.id}" aria-label="Delete ${esc(x.title)}">🗑️</button></div>
${peek === x.id ? sheet(x.code, { compact: true }) : ''}</li>`; }).join('')}</ul>`
    : `<div class="panel sq-empty"><span>📂</span><div><b>No saved builds yet</b><p class="muted small">Make a build in the 🛠️ Builder and press 💾 Save. It lands here.</p><button type="button" class="btn ghost sm" data-bxgo>🛠️ Open the Builder</button></div></div>`}`;
    keepScroll(() => { bxm.innerHTML = html; });
  }
  const upgradeSaved = async (x) => { const nb = fromCode(x.code); if (!nb) throw new Error(`“${x.title}” can’t be read with today’s game rules`); const nx = X.fit(g, { ...plain(nb), level: cap() }); mine = await send('/api/builds', { id: x.id, title: x.title, code: code(nx) }); if (cur?.id === x.id) { push(); b = nx; cur.base = code(); cur.version = g.version; mig = null; } };
  bxm.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    if ('bxlogin' in t.dataset) return login();
    if (t.dataset.bxretry) return paintMine(true);
    if ('bxgo' in t.dataset) { show('b'); setHash(); return; }
    if ('bxupall' in t.dataset) {
      t.disabled = true; let ok = 0;
      for (const x of (mine.builds || []).filter(outdated)) { try { await upgradeSaved(x); ok++; } catch (err) { toast(err.message, 'err'); } }
      if (ok) toast(`${ok} build${ok === 1 ? '' : 's'} upgraded to MAX on ${g.version}`, 'ok', '⬆');
      return paintMine();
    }
    const id = +(t.dataset.bxedit || t.dataset.bxpeek || t.dataset.bxsh || t.dataset.bxup1 || t.dataset.bxdel), x = (mine?.builds || []).find((s) => s.id === id); if (!x) return;
    if (t.dataset.bxedit) { if (dirty() && cur.id !== x.id && !twoTap(t, 'Unsaved build open · tap again')) return; openBuild(x); }
    else if (t.dataset.bxpeek) { peek = peek === id ? null : id; paintMine(); }
    else if (t.dataset.bxsh) share(x.code, x.title);
    else if (t.dataset.bxup1) { t.disabled = true; try { await upgradeSaved(x); toast(`“${x.title}” upgraded to MAX (L${cap()})`, 'ok', '⬆'); } catch (err) { toast(err.message, 'err'); } paintMine(); }
    else if (t.dataset.bxdel) {
      if (!twoTap(t, 'Tap again to delete')) return;
      const keep = mine; mine = { ...mine, builds: mine.builds.filter((s) => s.id !== id) }; paintMine(); // optimistic
      try { mine = await send('/api/builds/delete', { id }); if (cur?.id === id) { cur = null; titleDraft = null; } board = null; toast(`Deleted “${x.title}”. Share links you sent still work.`, 'ok', '🗑️'); } catch (err) { mine = keep; toast(err.message, 'err'); }
      paintMine();
    }
  });

  // ---------- start ----------
  const archPane = root.querySelector('[data-pane="a"]');
  archPane?.addEventListener('click', (e) => { const a = e.target.closest('[data-bxtry]'); if (a && !g) e.preventDefault(); });
  (API ? fetch(`${API}/api/game`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject())) : Promise.reject()).catch(() => fetch('game.json').then((r) => r.json()))
    .then((data) => {
      g = data;
      if (!(g.archetypes || []).length) { bxb.innerHTML = '<p class="muted">No archetypes in the game data yet.</p>'; return; }
      let pending = null;
      try { pending = JSON.parse(sessionStorage.getItem(PENDING) || 'null'); sessionStorage.removeItem(PENDING); } catch {}
      const start = (pending?.code && fromCode(pending.code)) || null;
      b = start ? plain(start) : { arch: g.archetypes[0].id, level: cap(), spent: {} };
      if (pending) { cur = pending.cur || null; titleDraft = pending.title ?? null; history.replaceState(null, '', '#' + code()); if (signed() && pending.then) setTimeout(() => toast('Signed in. Your build is back: press 💾 Save to keep it.', 'ok', '🔐'), 400); show('b'); draw(); return; }
      route();
    })
    .catch(() => { bxb.removeAttribute('aria-busy'); bxb.innerHTML = failBox('the game rules', null, 'game'); bxb.addEventListener('click', (e) => { if (e.target.closest('[data-bxretry="game"]')) location.reload(); }, { once: true }); });
})();
