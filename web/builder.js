// Archetype builder sandbox (roadmap PB.2): (a) archetype picker, level 1…cap with MAX, AP spending with live bars,
// over-cap guards, undo/reset, ★ signature attributes, face stats + OVR estimate, share link; (b) PlayStyles,
// Specializations, Facilities and Body tabs (height/weight modifiers as +/− badges), position fit, League/Rush notes;
// (c) Save image (branded PNG card), Save to My builds (login, Worker /api/builds), Compare two builds, Fork.
// PB.3 / PB.4: 📣 Post to Pro Builds (/api/probuilds/post) and ⭐ Use as my build (/api/mybuild), behind the proBuilds flag.
// PB.6: a build made on older game rules shows "what changed" (NXGame.changes) + ⬆ Upgrade to new MAX; My builds can
// upgrade one or all outdated builds in one click; builder.html?upgrade=1 (the game-update notification) opens My builds.
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
  let cur = null; // the saved build that's open: { id, title, mine, by } – Save updates it when it's mine
  let saved = null; // my builds (loaded on first use)
  let picks = {}; // PB.4: { league: buildId, rush: buildId } – my builds shown on my profile
  let postDraft = null; // the Post form keeps what was typed if the server says no
  let mig = null; // PB.6: { from, diff } while the build on screen was made on an older game-rules version
  const pro = () => window.NXViewer?.flagOn('proBuilds');
  const POS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
  const MODES = [['league', '🏟️', 'League'], ['rush', '⚡', 'Rush']];
  const TABS = [['playstyles', '💫 PlayStyles'], ['specializations', '🎓 Specializations'], ['facilities', '🏟️ Facilities'], ['body', '📏 Body']];
  const none = (what) => `<div class="bd-empty"><span>🗂️</span><div><b>No ${what} in the game data yet</b><p class="muted small">Managers add them from the in-game screens (portal → 🎮 Game rules → changed values). They show up here straight away.</p></div></div>`;
  const toast = (m, t) => (window.UI ? UI.toast(m, t) : null);

  const push = () => { hist.push(JSON.stringify(b)); if (hist.length > 100) hist.shift(); };
  const setHash = () => history.replaceState(null, '', `#${M.encode(g, b)}`);

  // ---------- member API (saving needs a Discord login; the sandbox itself is public) ----------
  const MAPI = document.body.dataset.api || '';
  const BASE = document.body.dataset.base || '';
  const token = () => { try { const t = localStorage.getItem('norex_session'); const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))); return p.exp > Date.now() / 1000 ? t : null; } catch { return null; } };
  const call = async (path, body) => {
    const r = await fetch(MAPI + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  const PENDING = 'norex_builder_pending'; // the build survives the Discord login round trip (the callback drops our hash)
  const login = (then) => {
    try { sessionStorage.setItem(PENDING, JSON.stringify({ code: M.encode(g, b), cur, then })); } catch {}
    location.href = `${MAPI}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
  };
  const needLogin = async (what, then) => {
    if (token()) return false;
    if (!MAPI) { toast('Saving isn’t available on this copy of the site', 'error'); return true; }
    if (window.UI && await UI.confirm({ title: `Log in to ${what}`, icon: '🔐', text: 'Building and sharing is open to everyone. Saving builds needs a NOREX Discord login – your current build comes with you.', ok: 'Log in with Discord' })) login(then);
    return true;
  };
  const archName = (id) => (g.archetypes || []).find((a) => a.id === id)?.name ?? id;
  const outdated = (x) => x.version && x.version !== g.version;
  const decodeCode = (code) => { const d = M.decode(g, code); return d && { arch: d.arch, level: d.level, spent: d.spent, ps: d.ps, plus: d.plus, sp: d.sp, fa: d.fa, h: d.h, w: d.w }; };
  const open = (x) => {
    const d = decodeCode(x.code);
    if (!d) { toast('That build can’t be read with the current game data', 'error'); return; }
    push(); b = d; cur = { id: x.id, title: x.title, mine: x.mine, by: x.by?.n, position: x.position, mode: x.mode, posted: x.posted };
    setHash(); outdated(x) ? older(x.version) : (mig = null); draw();
  };
  // ---------- PB.6: older game rules → what changed + upgrade to the new MAX ----------
  const older = (from) => {
    mig = { from, diff: undefined };
    const want = mig;
    (window.NXGame?.changes ? NXGame.changes(from) : Promise.resolve(null)).then((d) => { if (mig === want) { mig.diff = d; draw(); } });
  };
  const upgraded = (code) => { const d = decodeCode(code); return d && M.fit(g, { ...d, level: M.capOf(g) }); };
  async function upgradeSaved(x) { // one click: the saved build moves to the live rules at the new MAX (a posted build keeps its votes)
    const nb = upgraded(x.code);
    if (!nb) throw new Error(`“${x.title}” can’t be read with the current game data`);
    const r = await call('/api/builds', { id: x.id, title: x.title, code: M.encode(g, nb) });
    saved = r.builds;
    return nb;
  }
  async function upgradeHere() {
    push(); b = M.fit(g, { ...b, level: M.capOf(g) }); mig = null; setHash();
    const ev = M.evaluate(g, b);
    if (cur?.mine && cur.id && token()) {
      try {
        const r = await call('/api/builds', { id: cur.id, title: cur.title, code: M.encode(g, b) });
        saved = r.builds; draw();
        toast(`⬆ “${cur.title}” is on ${g.version} at MAX (L${ev.level}) – saved${ev.left ? ` · ${ev.left} AP to spend` : ''}`, 'success');
      } catch (e) { draw(); toast(e.message, 'error'); }
    } else { draw(); toast(`⬆ Upgraded to MAX (L${ev.level}) on ${g.version}${ev.left ? ` – ${ev.left} AP to spend` : ''}. Save to keep it.`, 'success'); }
  }
  function migHtml(ev) {
    if (!mig) return '';
    const d = mig.diff, items = d?.items || [];
    const list = d === undefined ? '<p class="muted small">Checking what changed…</p>'
      : items.length ? `<ul class="bd-mig-list">${items.slice(0, 8).map((x) => `<li><span>${esc(x.icon)}</span>${esc(x.text)}</li>`).join('')}${items.length > 8 ? `<li class="muted">+ ${items.length - 8} more</li>` : ''}</ul>`
      : `<p class="muted small">${d?.unknown ? 'That version isn’t in the history any more – the build is shown with today’s rules.' : 'No details for this change – the build is shown with today’s rules.'}</p>`;
    const atMax = ev.level >= ev.cap;
    return `<div class="bd-mig card" role="status"><div class="bd-mig-h"><b>⚠️ Made on older game rules</b><span class="muted small">Version <code>${esc(mig.from)}</code> → now <code>${esc(g.version)}</code> · max level ${ev.cap}</span><button type="button" class="x" data-mig-close aria-label="Hide">×</button></div>
<small class="muted">🆕 What changed</small>${list}
<div class="row"><button type="button" class="btn sm" data-upgrade>⬆ ${atMax ? `Move to ${esc(g.version)}` : `Upgrade to new MAX · L${ev.cap}`}</button><span class="muted small">${cur?.mine ? 'Saves this build straight away – Undo brings the old one back on screen.' : 'Keeps your points; new AP is left to spend.'}</span></div></div>`;
  }
  const loadMine = async () => { const r = await call('/api/builds'); picks = r.picks || {}; return (saved = r.builds); };

  async function save() {
    if (await needLogin('save builds', 'save')) return;
    const update = cur?.mine && cur.id;
    const title = await new Promise((ok) => {
      const m = UI.modal({ title: update ? 'Save build' : 'Save to My builds', icon: '💾', body: `<label class="bd-field"><span>Name</span><input maxlength="60" value="${esc(cur?.title && cur.mine ? cur.title : `${archName(b.arch)} L${b.level}`)}" autofocus></label>${update ? '<p class="muted small">Saving updates this build. Use <b>Save as new</b> to keep both.</p>' : ''}`,
        actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, ...(update ? [{ label: 'Save as new', value: 'new', kind: 'ghost' }] : []), { label: '💾 Save', value: 'save' }],
        onOpen: (d, close) => d.querySelector('input').addEventListener('keydown', (e) => { if (e.key === 'Enter') close('save'); }) });
      m.then((v) => ok(v && { v, t: m.el.querySelector('input').value.trim() }));
    });
    if (!title) return;
    try {
      const r = await call('/api/builds', { ...(title.v === 'save' && update ? { id: cur.id } : {}), title: title.t, code: M.encode(g, b) });
      saved = r.builds;
      const s = saved.find((x) => x.id === r.saved);
      cur = s ? { id: s.id, title: s.title, mine: true } : cur;
      mig = null; draw(); toast(`💾 Saved “${s?.title ?? title.t}” to My builds`, 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function fork(id) {
    if (await needLogin('fork builds')) return;
    try {
      const r = await call('/api/builds/fork', { id });
      saved = r.builds;
      const s = saved.find((x) => x.id === r.saved);
      if (s) open(s);
      toast('🍴 Forked into My builds – change it however you like', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function myBuilds() {
    if (await needLogin('see your builds')) return;
    const m = UI.modal({ title: 'My builds', icon: '📂', wide: true, body: '<div data-mb>' + (UI.skeleton ? UI.skeleton('rows', 3) : '<p class="muted">Loading…</p>') + '</div>' });
    const box = m.el.querySelector('[data-mb]');
    const paint = () => {
      const old = saved.filter(outdated);
      box.innerHTML = saved.length ? `<p class="muted small">${saved.length} saved · open one to keep editing, or compare it with what’s on screen.</p>${old.length ? `<div class="bd-mig-all"><span>⚠️ <b>${old.length}</b> ${old.length === 1 ? 'build is' : 'builds are'} on older game rules – now <code>${esc(g.version)}</code>, max level ${M.capOf(g)}.</span><button type="button" class="btn sm" data-upall>⬆ Upgrade ${old.length === 1 ? 'it' : `all ${old.length}`} to MAX</button></div>` : ''}<ul class="bd-list">${saved.map((x) => `<li${cur?.id === x.id ? ' class="on"' : ''}><div><b>${esc(x.title)}</b><small class="muted">${esc(archName(x.arch))} · L${x.level}${x.forkedFrom ? ' · 🍴 fork' : ''}${x.posted ? ' · 📣 posted' : ''}${MODES.filter(([k]) => picks[k] === x.id).map(([, ic, l]) => ` · ${ic} my ${l} build`).join('')} · ${UI.ago ? UI.ago(x.updated) : new Date(x.updated).toLocaleDateString()}${outdated(x) ? ` · <span class="bd-old" title="Made on ${esc(x.version)}">⚠ older rules</span>` : ''}</small></div>
<span class="bd-li-acts">${outdated(x) ? `<button type="button" class="btn sm" data-up="${x.id}" title="Move to ${esc(g.version)} at MAX (L${M.capOf(g)})">⬆ Upgrade</button>` : ''}<button type="button" class="btn sm" data-open="${x.id}">Open</button><button type="button" class="btn ghost sm" data-cmp="${x.id}" title="Compare with the build on screen">⚖️</button><button type="button" class="btn ghost sm" data-copy="${x.id}" title="Duplicate (fork)">🍴</button><button type="button" class="btn ghost sm" data-del="${x.id}" title="Delete" aria-label="Delete ${esc(x.title)}">🗑️</button></span></li>`).join('')}</ul>`
        : (UI.empty ? UI.empty({ icon: '📂', title: 'No saved builds yet', text: 'Press 💾 Save on any build and it lands here.' }) : '<p class="muted">No saved builds yet.</p>');
    };
    try { await loadMine(); paint(); } catch (e) { box.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
    box.addEventListener('click', async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if ('upall' in t.dataset) {
        t.disabled = true;
        let ok = 0;
        for (const x of saved.filter(outdated)) {
          try { const nb = await upgradeSaved(x); ok++; if (cur?.id === x.id && mig) { push(); b = nb; mig = null; setHash(); draw(); } } catch (err) { toast(err.message, 'error'); }
        }
        paint(); if (ok) toast(`⬆ ${ok} build${ok === 1 ? '' : 's'} upgraded to MAX on ${g.version}`, 'success');
        return;
      }
      const x = saved.find((s) => s.id === +(t.dataset.open || t.dataset.cmp || t.dataset.copy || t.dataset.del || t.dataset.up));
      if (!x) return;
      if (t.dataset.up) {
        t.disabled = true;
        try { const nb = await upgradeSaved(x); if (cur?.id === x.id && mig) { push(); b = nb; mig = null; setHash(); draw(); } paint(); toast(`⬆ “${x.title}” upgraded to MAX (L${M.capOf(g)})`, 'success'); } catch (err) { t.disabled = false; toast(err.message, 'error'); }
        return;
      }
      if (t.dataset.open) { m.close(); open(x); }
      else if (t.dataset.cmp) { m.close(); compare(x); }
      else if (t.dataset.copy) { m.close(); fork(x.id); }
      else if (t.dataset.del) {
        if (!(await UI.confirm({ title: `Delete “${x.title}”?`, text: 'It disappears from My builds. Share links you sent still work.', ok: 'Delete', danger: true }))) return;
        const keep = saved; saved = saved.filter((s) => s.id !== x.id); paint(); // optimistic
        try { saved = (await call('/api/builds/delete', { id: x.id })).builds; if (cur?.id === x.id) { cur = null; draw(); } paint(); toast('Build deleted'); } catch (err) { saved = keep; paint(); toast(err.message, 'error'); }
      }
    });
  }

  // ---------- PB.3: post to Pro Builds · PB.4: use as my build ----------
  const modeRadios = (name, pick) => `<div class="chipset" role="radiogroup" aria-label="Mode">${MODES.map(([k, ic, l]) => `<label class="chip pb-radio"><input type="radio" name="${name}" value="${k}"${pick === k ? ' checked' : ''}> ${ic} ${l}</label>`).join('')}</div>`;
  const posSelect = (pick) => `<select data-pos>${POS.map((p) => `<option${p === pick ? ' selected' : ''}>${p}</option>`).join('')}</select>`;
  async function post() {
    if (await needLogin('post builds', 'post')) return;
    const ev = M.evaluate(g, b);
    const own = cur?.mine && cur.id;
    let d = postDraft ?? { title: own ? cur.title : `${ev.arch.name} L${ev.level}`, position: cur?.position || ev.fit[0]?.[0], mode: cur?.mode || 'league', description: '', clip: '', tags: '' };
    if (!postDraft && own && cur.posted) { // updating a post: start from what's on the board
      const x = await call(`/api/probuilds/get?id=${cur.id}`).then((r) => r.build).catch(() => null);
      if (x) d = { ...d, title: x.title, position: x.position || d.position, mode: x.mode || d.mode, description: x.desc || '', clip: x.clip || '', tags: (x.tags || []).join(', ') };
    }
    const v = await new Promise((ok) => {
      const m = UI.modal({ title: cur?.posted && own ? 'Update your post' : 'Post to Pro Builds', icon: '📣', wide: true, body: `<div class="pb-form">
<label class="pb-field"><span>Title</span><input data-t maxlength="60" value="${esc(d.title)}" autofocus></label>
<div class="pb-2"><label class="pb-field"><span>Position</span>${posSelect(d.position)}</label><div class="pb-field"><span>Mode</span>${modeRadios('pbm', d.mode)}</div></div>
<label class="pb-field"><span>How to play it</span><textarea data-d maxlength="1000" rows="4" placeholder="Role, runs, what to watch out for, which PlayStyles carry it…">${esc(d.description)}</textarea></label>
<div class="pb-2"><label class="pb-field"><span>Clip link <small>(optional – YouTube, Twitch, Medal …)</small></span><input data-clip type="url" maxlength="300" value="${esc(d.clip)}" placeholder="https://youtu.be/…"></label>
<label class="pb-field"><span>Tags <small>(up to 5, commas)</small></span><input data-tags maxlength="120" value="${esc(d.tags)}" placeholder="pace, finesse, rush"></label></div>
<p class="muted small">🏷️ Archetype, level/MAX, patch, body and PlayStyles are labelled automatically. ${own ? 'Posting also saves what’s on screen to this build.' : 'The build is saved to My builds too.'}</p></div>`,
      actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '📣 Post', value: 'ok' }] });
      m.then((r) => {
        const q = (s2) => m.el.querySelector(s2);
        postDraft = { title: q('[data-t]').value.trim(), position: q('[data-pos]').value, mode: q('input[name=pbm]:checked')?.value || 'league', description: q('[data-d]').value, clip: q('[data-clip]').value.trim(), tags: q('[data-tags]').value };
        ok(r && postDraft);
      });
    });
    if (!v) return;
    try {
      const r = await call('/api/probuilds/post', { ...(own ? { id: cur.id } : {}), code: M.encode(g, b), ...v, tags: v.tags.split(',') });
      postDraft = null; saved = null;
      cur = { id: r.build.id, title: r.build.title, mine: true, position: r.build.position, mode: r.build.mode, posted: true };
      draw();
      UI.toast('📣 Posted to Pro Builds', 'ok', { action: { label: 'View post', fn: () => { location.href = `${BASE}probuilds.html#b=${r.build.id}`; } } });
    } catch (e) { toast(e.message, 'bad'); }
  }
  async function myBuild() {
    if (await needLogin('pick your build', 'mybuild')) return;
    const ev = M.evaluate(g, b);
    const v = await new Promise((ok) => {
      const m = UI.modal({ title: 'Use as my build', icon: '⭐', body: `<p class="muted small">The build on screen shows on your profile, your hover card and your player page.${cur?.mine ? ' Your saved build is updated with what’s on screen.' : ' It’s saved to My builds.'}</p>
<div class="pb-form"><div class="pb-field"><span>This is my…</span>${modeRadios('pbmy', cur?.mode || 'league')}</div><label class="pb-field"><span>Position</span>${posSelect(cur?.position || ev.fit[0]?.[0])}</label></div>`,
        actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '⭐ Use this build', value: 'ok' }] });
      m.then((r) => ok(r && { mode: m.el.querySelector('input[name=pbmy]:checked')?.value || 'league', position: m.el.querySelector('[data-pos]').value }));
    });
    if (!v) return;
    try {
      const code = M.encode(g, b);
      let r;
      if (cur?.mine && cur.id) {
        await call('/api/builds', { id: cur.id, title: cur.title, code });
        r = await call('/api/mybuild', { id: cur.id, ...v });
      } else {
        r = await call('/api/mybuild', { code, title: cur?.title || `${ev.arch.name} L${ev.level}`, ...v });
        cur = { id: r.saved, title: r.picks[v.mode]?.title, mine: true, ...v };
      }
      picks = Object.fromEntries(MODES.map(([k]) => [k, r.picks[k]?.id]).filter(([, id]) => id));
      saved = null; draw();
      const me = (() => { try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(token().split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))).u; } catch { return null; } })();
      UI.toast(`⭐ Now your ${v.mode === 'rush' ? 'Rush' : 'League'} build`, 'ok', me && window.NXViewer?.flagOn('profiles') ? { action: { label: 'View profile', fn: () => { location.href = `${BASE}member.html?u=${encodeURIComponent(me)}`; } } } : {});
    } catch (e) { toast(e.message, 'bad'); }
  }

  // Side by side: the build on screen (A) against a saved build or a pasted share link (B).
  function compareHtml(A, B, la, lb, all) {
    const ea = M.evaluate(g, A), eb = M.evaluate(g, B);
    const d = (x, y) => (x === y ? '' : `<em class="${x > y ? 'pos' : 'neg'}">${x > y ? '▲' : '▼'}${Math.abs(x - y)}</em>`);
    const line = (k, x, y) => `<tr${x === y ? ' class="same"' : ''}><td class="${x > y ? 'win' : ''}">${x}${d(x, y)}</td><th>${esc(k)}</th><td class="${y > x ? 'win' : ''}">${y}${d(y, x)}</td></tr>`;
    const ps = (ev) => [...ev.choices.plus.map((id) => `${(g.playstyles || []).find((p) => p.id === id)?.name ?? id}+`), ...ev.choices.ps.map((id) => (g.playstyles || []).find((p) => p.id === id)?.name ?? id)].map(esc).join(', ') || '–';
    const rows = ea.rows.map((r, i) => [r.name, r.value, eb.rows[i]?.value ?? 0]).filter(([, x, y]) => all || x !== y);
    return `<table class="bd-cmp"><thead><tr><th>${esc(la)}<small>${esc(ea.arch.name)} · L${ea.level}</small></th><th></th><th>${esc(lb)}<small>${esc(eb.arch.name)} · L${eb.level}</small></th></tr></thead>
<tbody>${line('OVR*', ea.ovr, eb.ovr)}${ea.face.map(([k, v], i) => line(k, v, eb.face[i]?.[1] ?? 0)).join('')}${line('AP left', ea.left, eb.left)}
<tr class="sub"><td>${ps(ea)}</td><th>💫 PlayStyles</th><td>${ps(eb)}</td></tr><tr class="sub"><td>${ea.choices.h} cm · ${ea.choices.w} kg</td><th>📏 Body</th><td>${eb.choices.h} cm · ${eb.choices.w} kg</td></tr>
<tr class="grp"><th colspan="3">${all ? 'All attributes' : `Attributes that differ (${rows.length})`}</th></tr>${rows.map(([k, x, y]) => line(k, x, y)).join('') || '<tr><td colspan="3" class="muted">Same attributes.</td></tr>'}</tbody></table>`;
  }
  async function compare(pre) {
    if (!window.UI) return;
    let list = saved;
    if (!list && token()) list = await loadMine().catch(() => []);
    list ||= [];
    const opts = list.map((x) => `<option value="${x.id}"${pre?.id === x.id ? ' selected' : ''}>${esc(x.title)} – ${esc(archName(x.arch))} L${x.level}</option>`).join('');
    const m = UI.modal({ title: 'Compare builds', icon: '⚖️', wide: true, body: `<div class="bd-cmp-pick"><span><b>A</b> ${esc(cur?.title ?? 'Build on screen')}</span><span>vs <b>B</b></span>
<select data-cmp-b aria-label="Build B">${opts}<option value="link"${list.length ? '' : ' selected'}>Paste a share link…</option></select>
<input data-cmp-link placeholder="Paste a builder share link" aria-label="Share link"${list.length ? ' hidden' : ''}><label class="small"><input type="checkbox" data-cmp-all> all attributes</label></div>
${token() ? '' : `<p class="muted small">🔐 Log in to compare with your saved builds – share links work for everyone.</p>`}<div data-cmp-out></div>` });
    const el = m.el, sel = el.querySelector('[data-cmp-b]'), link = el.querySelector('[data-cmp-link]'), outEl = el.querySelector('[data-cmp-out]');
    const run = () => {
      link.hidden = sel.value !== 'link';
      const x = list.find((s) => String(s.id) === sel.value);
      const code = x ? x.code : (link.value.split('#')[1] || link.value).trim();
      const B = code && decodeCode(code);
      outEl.innerHTML = B ? compareHtml(b, B, cur?.title ?? 'On screen', x?.title ?? 'Shared build', el.querySelector('[data-cmp-all]').checked)
        : `<p class="muted">${code ? '⚠️ That link isn’t a builder link.' : 'Pick a saved build or paste a share link to compare.'}</p>`;
    };
    el.addEventListener('input', run); el.addEventListener('change', run);
    run();
  }

  // Branded PNG card of the build (1080×1350, club colours, crest, face stats, top attributes, PlayStyles).
  async function image() {
    const ev = M.evaluate(g, b), W = 1080, H = 1350;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const red = css.getPropertyValue('--red').trim() || '#c8352c', gold = css.getPropertyValue('--gold').trim() || '#f5d061';
    await document.fonts?.ready;
    const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1d0d0e'); bg.addColorStop(0.55, '#0b0f16'); bg.addColorStop(1, '#07090d');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = 0.05; x.fillStyle = '#fff';
    for (let i = -H; i < W; i += 60) { x.beginPath(); x.moveTo(i, H); x.lineTo(i + 6, H); x.lineTo(i + 6 + H * 0.47, 0); x.lineTo(i + H * 0.47, 0); x.fill(); }
    x.restore();
    x.fillStyle = red; x.fillRect(0, 0, W, 12); x.fillRect(0, H - 12, W, 12);
    const crest = new Image(); crest.src = `${BASE}assets/crest.png`; await crest.decode().catch(() => {});
    if (crest.naturalWidth) { const h = 170, w = (crest.naturalWidth / crest.naturalHeight) * h; x.drawImage(crest, 60, 50, w, h); }
    const T = (txt, px, py, font, col = '#fff', align = 'left') => { x.font = font; x.fillStyle = col; x.textAlign = align; x.fillText(txt, px, py); };
    T('NOREX UNITED · PRO BUILD', 200, 100, '600 34px Oswald, Impact, sans-serif', '#9aa3b2');
    T((cur?.title || ev.arch.name).toUpperCase().slice(0, 28), 200, 160, '700 58px Oswald, Impact, sans-serif');
    T('★★★★★', 200, 205, '400 28px sans-serif', gold);
    // OVR shield
    x.fillStyle = red; x.beginPath(); x.roundRect(W - 230, 50, 170, 190, 22); x.fill();
    T(String(ev.ovr), W - 145, 170, '700 104px Oswald, Impact, sans-serif', '#fff', 'center');
    T('OVR*', W - 145, 220, '600 28px Oswald, Impact, sans-serif', '#fff', 'center');
    // archetype + level
    const grp = (g.archetypeGroups || []).find((q) => q.id === ev.arch.group)?.name ?? '';
    T(`${ICON[ev.arch.group] ?? ''} ${ev.arch.name.toUpperCase()}`, 60, 310, '700 52px Oswald, Impact, sans-serif');
    T(`${grp.toUpperCase()} · LEVEL ${ev.level}${ev.level === ev.cap ? ' · MAX' : ` / ${ev.cap}`}`, 60, 360, '600 30px Oswald, Impact, sans-serif', ev.level === ev.cap ? gold : '#9aa3b2');
    // face stats
    ev.face.forEach(([k, v], i) => {
      const bx = 60 + i * 162, by = 400;
      x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.roundRect(bx, by, 148, 130, 16); x.fill();
      T(String(v), bx + 74, by + 78, '700 64px Oswald, Impact, sans-serif', v >= 80 ? '#4ade80' : v >= 65 ? gold : '#fff', 'center');
      T(k, bx + 74, by + 114, '600 26px Oswald, Impact, sans-serif', '#9aa3b2', 'center');
    });
    // top attributes with bars
    T('TOP ATTRIBUTES', 60, 595, '600 30px Oswald, Impact, sans-serif', red);
    const top = [...ev.rows].sort((p, q) => q.value - p.value || q.sig - p.sig).slice(0, 10);
    top.forEach((r, i) => {
      const col = i % 2, row = Math.floor(i / 2), bx = 60 + col * 490, by = 640 + row * 72;
      T(`${r.sig ? '★ ' : ''}${r.name}`, bx, by, '500 28px Inter, sans-serif', r.sig ? gold : '#e5e7eb');
      T(String(r.value), bx + 450, by, '700 32px Oswald, Impact, sans-serif', '#fff', 'right');
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(bx, by + 14, 450, 8);
      x.fillStyle = red; x.fillRect(bx, by + 14, 450 * Math.min(1, r.value / ev.top), 8);
    });
    // PlayStyles, specialization, body
    const name = (list, id) => (list || []).find((q) => q.id === id)?.name ?? id;
    const ps = [...ev.choices.plus.map((id) => `${name(g.playstyles, id)}+`), ...ev.choices.ps.map((id) => name(g.playstyles, id))];
    let y = 1030;
    const line = (label, val) => { if (!val) return; T(label, 60, y, '600 28px Oswald, Impact, sans-serif', '#9aa3b2'); T(val.slice(0, 60), 300, y, '500 28px Inter, sans-serif'); y += 52; };
    line('PLAYSTYLES', ps.join(' · '));
    line('SPECIALIZATION', ev.choices.sp && name(g.specializations, ev.choices.sp));
    line('BODY', `${ev.choices.h} cm · ${ev.choices.w} kg`);
    line('BEST FIT', ev.fit.slice(0, 3).map(([p, v]) => `${p} ${v}`).join(' · '));
    T(`Game rules ${g.version}${ev.status.preview ? ' · preview numbers' : ''} · * estimate`, 60, H - 50, '500 24px Inter, sans-serif', '#6b7280');
    T(location.host || 'NOREX UNITED', W - 60, H - 50, '600 26px Oswald, Impact, sans-serif', '#9aa3b2', 'right');
    const a = document.createElement('a');
    a.download = `norex-build-${(cur?.title || ev.arch.name)}-L${ev.level}.png`.replace(/[^\w.-]+/g, '_');
    a.href = c.toDataURL('image/png'); a.click();
    toast('🖼️ Build card saved');
  }

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
<button type="button" class="bd-pm" data-d="1" aria-label="Raise ${esc(r.name)}"${c == null ? ' disabled' : ''} title="${c == null ? (r.value >= r.top ? 'At the maximum' : 'Not enough AP') : `Costs ${c} AP`}">+</button></div>`;
  }).join('')}</section>`;
    };
    const leftPct = ev.total ? Math.max(0, (ev.left / ev.total) * 100) : 0;
    return `${migHtml(ev)}${st.preview ? `<div class="bd-note card"><b>🧪 Preview numbers</b> <span class="muted small">${[!st.base && 'archetype base attributes', !st.ap && 'AP per level', !st.costs && 'AP costs'].filter(Boolean).join(', ')} ${st.base && st.ap ? 'is' : 'are'} not entered from the in-game screens yet, so the builder uses placeholder values. Level cap, Masteries and archetypes come from game data <code>${esc(g.version)}</code>.</span></div>` : ''}
<div class="bd-picker card">${groups.map((grp) => `<div class="bd-pgrp"><small>${ICON[grp.id] ?? ''} ${esc(grp.name)}</small><div class="chipset">${(g.archetypes || []).filter((a) => a.group === grp.id).map((a) => `<button type="button" class="chip${a.id === ev.arch.id ? ' on' : ''}" data-arch="${esc(a.id)}">${esc(a.name)}</button>`).join('')}</div></div>`).join('')}</div>
<div class="bd-main">
<div class="bd-left"><div class="bd-grid">${(g.attributeGroups || []).map(card).join('')}</div>
<div class="bd-tabs card"><div class="nx-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${l}${k === 'playstyles' ? `<em>${ev.choices.ps.length + ev.choices.plus.length}</em>` : k === 'facilities' ? `<em>${ev.choices.fa.length}</em>` : ''}</button>`).join('')}</div>
<div class="bd-pane">${pane(ev)}</div></div></div>
<aside class="bd-side card">
${cur ? `<div class="bd-cur"><span>${cur.mine ? '📂' : '👀'}</span><div><small>${cur.mine ? 'My build' : `Build by ${esc(cur.by || 'a member')}`}</small><b>${esc(cur.title)}</b></div>${cur.mine ? '' : `<button type="button" class="btn sm" data-fork="${cur.id}">🍴 Fork</button>`}<button type="button" class="x" data-close aria-label="Close this build" title="Start a new build (keeps what's on screen)">×</button></div>` : ''}
<div class="bd-arch"><span class="bd-ic">${ICON[ev.arch.group] ?? '⚽'}</span><div><small>${esc(groups.find((x) => x.id === ev.arch.group)?.name ?? '')}</small><h2>${esc(ev.arch.name)}</h2></div><div class="bd-ovr" title="Estimated overall"><b>${ev.ovr}</b><small>OVR*</small></div></div>
<label class="bd-lvl"><span>Level <b>${ev.level}</b> / <span>${ev.cap}</span>${ev.level === ev.cap ? ' <span class="tag home">MAX</span>' : ''}</span>
<span class="row"><input type="range" min="1" max="${ev.cap}" value="${ev.level}" data-level aria-label="Level"><button type="button" class="btn sm${ev.level === ev.cap ? ' ghost' : ''}" data-max>MAX</button></span></label>
<div class="bd-ap${ev.left === 0 && ev.total ? ' full' : ''}"><div><small>Archetype points left</small><b>${ev.left}</b><span class="muted">/ ${ev.total}</span></div><span class="bd-apbar"><i style="width:${leftPct}%"></i></span></div>
<div class="bd-face">${ev.face.map(([k, v]) => `<div><small>${k}</small><b class="${v >= 80 ? 'hi' : v >= 65 ? 'mid' : ''}">${v}</b></div>`).join('')}</div>
<div class="bd-fit"><small>📍 Position fit*</small>${ev.fit.map(([pos, v], i) => `<div class="${i ? '' : 'best'}"><b>${esc(pos)}</b><span class="bd-bar"><i class="a" style="width:${pct(v)}%"></i></span><em>${v}</em></div>`).join('')}</div>
<div class="bd-modes">${notes(ev).map(([ic, t]) => `<p><span>${ic}</span><span>${t}</span></p>`).join('')}</div>
<div class="bd-acts"><button type="button" class="btn ghost sm" data-undo${hist.length ? '' : ' disabled'}>↶ Undo</button><button type="button" class="btn ghost sm" data-reset${ev.used ? '' : ' disabled'}>⟲ Reset</button><button type="button" class="btn sm" data-share>🔗 Share link</button></div>
<div class="bd-acts bd-save"><button type="button" class="btn sm" data-save>💾 ${cur?.mine ? 'Save' : 'Save build'}</button><button type="button" class="btn ghost sm" data-mine>📂 My builds</button><button type="button" class="btn ghost sm" data-compare>⚖️ Compare</button><button type="button" class="btn ghost sm" data-image>🖼️ Save image</button></div>
${pro() ? `<div class="bd-acts bd-pro"><button type="button" class="btn sm" data-post>📣 ${cur?.posted && cur.mine ? 'Update post' : 'Post to Pro Builds'}</button><button type="button" class="btn ghost sm" data-mybuild title="Show this build on your profile">⭐ Use as my build</button><a class="btn ghost sm" href="${BASE}probuilds.html">🏆 Pro Builds</a></div>` : ''}
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
    else if ('save' in t.dataset) save();
    else if ('mine' in t.dataset) myBuilds();
    else if ('compare' in t.dataset) compare();
    else if ('post' in t.dataset) post();
    else if ('mybuild' in t.dataset) myBuild();
    else if ('image' in t.dataset) image().catch(() => toast('Couldn’t draw the image – try again', 'error'));
    else if (t.dataset.fork) fork(+t.dataset.fork);
    else if ('close' in t.dataset) { cur = null; draw(); }
    else if ('upgrade' in t.dataset) upgradeHere();
    else if ('migClose' in t.dataset) { mig = null; draw(); }
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
    // Back from the Discord login: restore the build that was on screen (the callback replaced our hash).
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(PENDING) || 'null'); sessionStorage.removeItem(PENDING); } catch {}
    const hash = /[#&]a=/.test(location.hash) ? location.hash : pending?.code || '';
    const shared = hash ? M.decode(g, hash) : null;
    b = shared ? { arch: shared.arch, level: shared.level, spent: shared.spent, ps: shared.ps, plus: shared.plus, sp: shared.sp, fa: shared.fa, h: shared.h, w: shared.w } : { arch: first.id, level: M.capOf(g), spent: {} };
    cur = pending?.cur || null;
    if (shared?.version && shared.version !== g.version && !pending) older(shared.version);
    if (pending) setHash();
    draw();
    // builder.html?build=<id> opens a saved (own) or posted build – with a Fork button when it isn't yours.
    const want = new URLSearchParams(location.search).get('build');
    if (!want && token() && new URLSearchParams(location.search).has('upgrade')) myBuilds(); // from the game-update notification
    const focus = new URLSearchParams(location.search).get('focus'); // PB.5 scout report: "More <attribute>" → highlight that row
    const flash = () => { const r = focus && [...root.querySelectorAll('[data-attr]')].find((x) => x.dataset.attr === focus); if (r) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.add('bd-focus'); } };
    if (focus) setTimeout(flash, want && token() ? 900 : 200);
    if (want && token()) call(`/api/builds/get?id=${encodeURIComponent(want)}`).then((r) => open(r.build)).catch((e) => toast(e.message, 'error'));
    if (token() && pending?.then) setTimeout({ save, post, mybuild: myBuild }[pending.then] || (() => {}), 300); // after app.js stored the new session
  }).catch(() => { $('[data-bd-body]').innerHTML = '<p class="muted">Couldn’t load the game data – try again in a moment.</p>'; });
})();
