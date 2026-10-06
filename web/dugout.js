// Dugout (redesign board 08) – the manager portal's home: the next match night's line-up on one screen.
//   ① who's available (the event's RSVPs) → ② drag them onto the pitch (auto-saves a draft, one button publishes)
//   ③ plays + ready check · ④ squad week heatmap (can we field 9?) · ⑤ trials funnel you drag cards across
//   ⑥ claims as a card you swipe right to approve / left to reject, with the checks already done.
// Reuses existing routes only: /api/events (+ /lineup), /api/admin/squadweek, /api/trials (+ /update), /api/plays,
// /api/admin/claims (via ctx.decide). app.js mounts it as the Manager tab's 🧢 Dugout sub-tab. Flag `dugout`.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const POS_OF = (slot) => ({ LCB: 'CB', RCB: 'CB', LCM: 'CM', RCM: 'CM', LDM: 'CDM', RDM: 'CDM', LAM: 'CAM', RAM: 'CAM', LS: 'ST', RS: 'ST' })[slot] ?? slot;
  const ICON = { yes: '✅', maybe: '❔', no: '❌' };
  const FUNNEL = [['applied', '📨 Applied'], ['booked', '📅 Trial booked'], ['trialling', '⚽ On trial'], ['played', '🏁 Trial played'], ['signed', '✍️ Signed']];
  const short = (n) => String(n ?? '').slice(0, 14);

  let el = null, ctx = null;
  const D = { ev: null, trials: null, plays: null, at: 0, formation: null, slots: {}, pick: null, saving: '', claimAt: 0, evId: null };
  let saveTimer = null;

  const nextEvent = () => (D.ev?.events || []).filter((e) => e.status === 'scheduled' && e.end > Date.now()).sort((a, b) => a.start - b.start)[0] || null;
  const people = (e) => {
    const m = new Map();
    for (const r of e.rsvps) m.set(r.id, { id: r.id, n: r.n, a: r.a, s: r.s, pos: r.pos || [] });
    for (const c of e.checkins) if (!m.has(c.id)) m.set(c.id, { id: c.id, n: c.n, a: c.a, s: null, on: true, pos: [] });
    for (const [id, u] of Object.entries(e.lineupPeople || {})) if (!m.has(id)) m.set(id, { id, n: u.n, a: u.a, s: null, pos: [] });
    return m;
  };
  function adopt(e) {
    D.evId = e?.id ?? null;
    D.formation = e?.formation && D.ev.formations[e.formation] ? e.formation : e?.type === 'rush' ? '4-3-3' : '4-3-3';
    D.slots = {};
    for (const [id, slot] of Object.entries(e?.lineup || {})) if (D.ev.formations[D.formation]?.some((x) => x[0] === slot)) D.slots[slot] = id;
    D.pick = null;
  }

  // ---------- ① available + ② pitch ----------
  function available(e, who) {
    const placed = new Set(Object.values(D.slots));
    const order = { yes: 0, maybe: 1, null: 2, no: 3 };
    const list = [...who.values()].sort((a, b) => (order[a.s] ?? 2) - (order[b.s] ?? 2) || a.n.localeCompare(b.n));
    return `<div class="dg-sec-h"><h3>📅 Available</h3><span class="dg-tag">${list.filter((p) => p.s === 'yes').length} in · ${list.filter((p) => p.s === 'maybe').length} maybe</span></div>
${list.length ? `<div class="dg-avail">${list.map((p) => `<button type="button" class="dg-p s-${esc(p.s || 'none')}${placed.has(p.id) ? ' placed' : ''}${D.pick === p.id ? ' sel' : ''}" draggable="${p.s === 'no' ? 'false' : 'true'}" data-p="${esc(p.id)}"${p.s === 'no' ? ' disabled' : ''}>
<i>${p.s ? ICON[p.s] : p.on ? '🟢' : '⏳'}</i><span><b>${esc(p.n)}</b><small>${placed.has(p.id) ? 'on pitch' : p.s === 'maybe' ? 'maybe' : p.s === 'no' ? 'can’t make it' : p.s ? 'available' : 'no answer'}</small></span><em>${esc(p.pos[0] || '')}</em></button>`).join('')}</div>`
      : ctx.UI.empty({ icon: '📭', title: 'No answers yet', text: 'Players show up here as they tap “I’m in” in the Locker Room.' })}`;
  }
  function pitch(e, who) {
    const f = D.ev.formations[D.formation] || [];
    const filled = f.filter(([slot]) => D.slots[slot]).length;
    return `<div class="dg-sec-h"><h3>🧩 ${esc(D.formation)}</h3><label class="dg-form">Shape <select data-dg="formation">${Object.keys(D.ev.formations).map((k) => `<option${k === D.formation ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
<span class="dg-tag">${filled}/${f.length} · ${esc(D.saving || (e.lineupAt ? 'published' : 'drag from the list'))}</span></div>
<div class="dg-pitch-wrap"><div class="dg-pitch"><span class="dg-mark" aria-hidden="true"></span>${f.map(([slot, x, y]) => {
      const p = who.get(D.slots[slot]);
      const warn = p && p.s !== 'yes' && !p.on;
      return `<button type="button" class="dg-slot${p ? ' on' : ''}${warn ? ' warn' : ''}${!p && D.pick ? ' glow' : ''}" style="left:${x}%;top:${y}%" data-slot="${esc(slot)}" aria-label="${esc(POS_OF(slot))}${p ? `: ${esc(p.n)}` : ' – empty'}">
<span class="dg-dot">${p ? esc((p.n || '?')[0].toUpperCase()) : esc(POS_OF(slot))}</span>${p ? `<small>${esc(short(p.n))}</small>` : `<small class="dg-drop">${esc(POS_OF(slot))} · drop here</small>`}</button>`;
    }).join('')}</div></div>
<p class="muted small dg-help">${D.pick ? `Now tap a spot for <b>${esc(who.get(D.pick)?.n)}</b>.` : 'Drag a name onto a spot (or tap a name, then a spot). Tap a filled spot to send them back. Changes save as a draft.'}</p>`;
  }

  // ---------- ③ plays + ready check ----------
  function playsAndReady(e, who) {
    const plays = (D.plays || []).filter((p) => p.published).slice(0, 4);
    const playsHtml = ctx.flagOn('tactics') ? `<div class="dg-sec-h"><h3>🧠 Plays</h3><a class="dg-more" href="${ctx.base}tactics.html">Playbook →</a></div>
${D.plays === null ? ctx.UI.skeleton('rows', 2) : plays.length ? plays.map((p) => { const c = p.assignCounts || { assigned: 0, learned: 0 }; const all = c.assigned && c.learned >= c.assigned; return `<div class="dg-play${all ? ' done' : ''}"><b>${esc(p.title)}</b><small>${c.assigned ? `${c.learned} of ${c.assigned} marked “Learned”${all ? ' ✅' : ' · nudge the rest'}` : 'Not assigned yet'}</small></div>`; }).join('')
      : '<p class="muted small">No published plays yet.</p>'}` : '';
    const f = D.ev.formations[D.formation] || [];
    const ids = f.map(([slot]) => D.slots[slot]).filter(Boolean);
    const placedP = ids.map((id) => who.get(id)).filter(Boolean);
    const maybes = placedP.filter((p) => p.s === 'maybe'), unanswered = placedP.filter((p) => !p.s && !p.on), nos = placedP.filter((p) => p.s === 'no');
    const subs = [...who.values()].filter((p) => p.s === 'yes' && !ids.includes(p.id));
    const gk = D.slots.GK ? who.get(D.slots.GK) : null;
    const line = (ok, txt) => `<li class="${ok === true ? 'ok' : ok === false ? 'bad' : 'warn'}">${ok === true ? '✅' : ok === false ? '❌' : '⚠️'} ${txt}</li>`;
    return `${playsHtml}<div class="dg-sec-h dg-ready-h"><h3>🚦 Ready check</h3></div><ul class="dg-ready">
${line(ids.length === f.length ? true : ids.length ? null : false, `${ids.length} of ${f.length} spots filled`)}
${maybes.length ? line(null, `${maybes.length} maybe (${maybes.map((p) => esc(p.n)).join(', ')})`) : ''}
${unanswered.length ? line(null, `${unanswered.length} picked but no answer yet`) : ''}
${nos.length ? line(false, `${nos.length} picked but can’t make it (${nos.map((p) => esc(p.n)).join(', ')})`) : ''}
${line(gk ? true : null, gk ? `Keeper: ${esc(gk.n)}` : 'Keeper: AI')}
${line(subs.length ? true : null, subs.length ? `${subs.length} sub${subs.length > 1 ? 's' : ''} ready (${subs.slice(0, 3).map((p) => esc(p.n)).join(', ')}${subs.length > 3 ? '…' : ''})` : 'No sub if someone drops')}
${e.lineupAt ? line(true, `Published ${esc(ctx.UI.ago ? ctx.UI.ago(e.lineupAt) : '')}`) : line(null, 'Not published yet')}</ul>`;
  }

  // ---------- ④ squad week heatmap ----------
  function heatmap() {
    const days = ctx.squadweek()?.days;
    const head = '<div class="dg-sec-h"><h3>📆 Squad week</h3><span class="dg-tag">next 7 days</span></div>';
    if (!days) return head + ctx.UI.skeleton('rows', 3);
    const rows = new Map();
    days.forEach((d, i) => {
      for (const p of d.yes) (rows.get(p.id) || rows.set(p.id, { n: p.n, c: [] }).get(p.id)).c[i] = 'yes';
      for (const p of d.maybe) (rows.get(p.id) || rows.set(p.id, { n: p.n, c: [] }).get(p.id)).c[i] ??= 'maybe';
    });
    const list = [...rows.values()].sort((a, b) => b.c.filter((x) => x === 'yes').length - a.c.filter((x) => x === 'yes').length).slice(0, 18);
    const dn = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short' });
    return `${head}${list.length ? `<div class="dg-heat" style="--n:${days.length}"><span></span>${days.map((d) => `<b>${esc(dn(d.date))}</b>`).join('')}
${list.map((r) => `<span class="dg-hn">${esc(r.n)}</span>${days.map((_, i) => `<i class="${r.c[i] || ''}" title="${esc(r.n)} · ${r.c[i] || 'no answer'}"></i>`).join('')}`).join('')}
<span class="dg-hn"><b>Can field 9?</b></span>${days.map((d) => `<em class="${d.canField9 ? 'ok' : d.yes.length >= 7 ? 'close' : 'short'}" title="${d.yes.length} yes · ${d.maybe.length} maybe">${d.yes.length}</em>`).join('')}</div>
<p class="muted small">Green = in · amber = maybe · blank = no answer. Bottom row: how many said yes.</p>`
      : ctx.UI.empty({ icon: '📆', title: 'No answers this week yet', text: 'Fills in as players set their availability.' })}`;
  }

  // ---------- ⑤ trials funnel ----------
  function funnel() {
    const head = `<div class="dg-sec-h"><h3>🧭 Trials funnel</h3><span class="dg-tag">drag cards across</span></div>`;
    if (!ctx.flagOn('trials')) return '';
    if (D.trials === null) return head + ctx.UI.skeleton('rows', 2);
    const by = Object.fromEntries(FUNNEL.map(([k]) => [k, []]));
    for (const t of D.trials) { const k = t.status === 'recommended' ? 'applied' : t.status; if (by[k]) by[k].push(t); }
    return `${head}<div class="dg-funnel">${FUNNEL.map(([k, l], i) => `<div class="dg-col" data-col="${k}"><div class="dg-col-h"><b>${l}</b><em>${by[k].length}</em></div>
${by[k].slice(0, 8).map((t) => `<div class="dg-tc" draggable="true" data-trial="${t.id}"><b>${esc(t.ea)}</b><small>${esc(t.positions.join('/'))}${t.platform ? ` · ${esc(t.platform)}` : ''}</small>${i < FUNNEL.length - 1 ? `<button type="button" class="dg-next" data-move="${t.id}" data-to="${FUNNEL[i + 1][0]}" aria-label="Move ${esc(t.ea)} to ${esc(FUNNEL[i + 1][1])}">→</button>` : ''}</div>`).join('')}
${by[k].length > 8 ? `<small class="muted">+${by[k].length - 8} more</small>` : ''}</div>`).join('')}</div>
<p class="muted small">Each move updates the trial card (and tells the scout who tipped them). Full cards with notes: Trials tab.</p>`;
  }

  // ---------- ⑥ claims – swipe to decide ----------
  function claims() {
    const A = ctx.admin();
    const pending = Object.entries(A?.claims || {}).filter(([, c]) => c.status === 'pending').map(([user, c]) => ({ user, ...c }));
    const head = `<div class="dg-sec-h"><h3>✅ Claims · swipe to decide</h3><span class="dg-tag">${pending.length} waiting</span></div>`;
    if (!pending.length) return head + ctx.UI.empty({ icon: '🎉', title: 'No claims waiting', text: 'New player claims land here as a card.' });
    const c = pending[0];
    const pl = ctx.players().find((p) => p.k === c.player);
    const taken = c.taken || Object.entries(A.claims).some(([u, x]) => u !== c.user && x.player === c.player && x.status === 'approved');
    const checks = [[!!pl?.home, pl?.home ? 'in the squad list' : 'not in the squad list'], [(pl?.s?.gp || 0) > 0, `${pl?.s?.gp || 0} league games`], [!taken, taken ? 'already claimed by someone else' : 'nobody else owns it']];
    return `${head}<div class="dg-claims">${pending.length > 1 ? '<div class="dg-claim ghost" aria-hidden="true"></div>' : ''}
<div class="dg-claim" data-claim-card="${esc(c.user)}"><span class="dg-stamp ok">Approve</span><span class="dg-stamp no">Reject</span>
<small class="muted">Discord</small><b class="dg-cn">${esc(c.n)}</b><small class="muted">claims EA gamertag</small><b class="dg-gt">${esc(c.playerName)}</b>
<ul>${checks.map(([ok, t]) => `<li class="${ok ? 'ok' : 'bad'}">${ok ? '✔' : '✖'} ${esc(t)}</li>`).join('')}</ul></div></div>
<div class="dg-claim-btns"><button type="button" class="btn ghost sm dg-rej" data-decide="reject" data-u="${esc(c.user)}">✗ Reject</button><button type="button" class="btn sm dg-ok" data-decide="approve" data-u="${esc(c.user)}">✓ Approve</button></div>`;
  }

  // ---------- paint ----------
  function paint() {
    if (!el?.isConnected) return;
    if (!D.ev) { el.innerHTML = ctx.UI.skeleton('cards', 4); return; }
    const e = nextEvent();
    if (e && e.id !== D.evId) adopt(e);
    const who = e ? people(e) : new Map();
    const when = e ? new Date(e.start).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    el.innerHTML = `<div class="dg">
<div class="dg-head"><h2>${e ? `Line-up · ${esc(e.title || (e.type === 'league' ? 'League match' : 'Match night'))}, ${esc(when)}` : 'The Dugout'}</h2>
<div class="dg-acts">${ctx.canAnnounce ? '<a class="btn ghost sm" href="#alerts">📣 Announce</a>' : ''}<a class="btn ghost sm" href="#schedule">➕ Match night</a>${e ? `<button type="button" class="btn sm" data-dg="publish">📣 Post line-up${e.lineupAt ? ' again' : ''}</button>` : ''}</div></div>
${e ? `<div class="dg-top"><section class="card dg-sec dg-av">${available(e, who)}</section><section class="card dg-sec dg-pi">${pitch(e, who)}</section><section class="card dg-sec dg-rd">${playsAndReady(e, who)}</section></div>`
    : `<div class="card">${ctx.UI.empty({ icon: '🗓️', title: 'No match night coming up', text: 'Schedule one and the line-up builder opens here.', action: '<a class="btn sm" href="#schedule">➕ Schedule a match night</a>' })}</div>`}
<div class="dg-bottom"><section class="card dg-sec dg-wk">${heatmap()}</section>${ctx.flagOn('trials') ? `<section class="card dg-sec dg-tr">${funnel()}</section>` : ''}<section class="card dg-sec dg-cl">${claims()}</section></div></div>`;
  }

  // ---------- actions ----------
  // Switching shape keeps the players: each goes to a free spot with the same position, the rest fill what's left.
  function reshape(next) {
    const from = D.ev.formations[D.formation] || [], free = [...(D.ev.formations[next] || [])], slots = {}, rest = [];
    for (const [slot] of from) {
      const id = D.slots[slot];
      if (!id) continue;
      const i = free.findIndex(([s]) => POS_OF(s) === POS_OF(slot));
      if (i >= 0) slots[free.splice(i, 1)[0][0]] = id; else rest.push(id);
    }
    for (const id of rest) { const i = free.findIndex(([s]) => s !== 'GK'); if (i >= 0) slots[free.splice(i, 1)[0][0]] = id; }
    D.formation = next; D.slots = slots;
  }
  function place(slot) {
    const cur = D.slots[slot];
    if (D.pick) {
      for (const k of Object.keys(D.slots)) if (D.slots[k] === D.pick) delete D.slots[k];
      D.slots[slot] = D.pick; D.pick = null;
    } else if (cur) delete D.slots[slot];
    else return;
    queueSave();
    paint();
  }
  function queueSave() {
    D.saving = 'saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save(false), 900);
  }
  async function save(publish) {
    clearTimeout(saveTimer);
    const e = nextEvent();
    if (!e) return;
    const lineup = Object.fromEntries(Object.entries(D.slots).map(([slot, id]) => [id, slot]));
    if (publish && !Object.keys(lineup).length) return ctx.toast('Place at least one player before posting', true);
    if (publish && !(await ctx.UI.confirm({ title: 'Post the line-up?', text: `${Object.keys(lineup).length} players get an alert${e.lineupAt ? ' (again)' : ''} and it goes to Discord.`, ok: '📣 Post it' }))) return;
    try {
      const r = await ctx.call('/api/events/lineup', { id: e.id, formation: D.formation, lineup, publish });
      D.ev = { ...D.ev, ...r };
      D.saving = publish ? '' : e.lineupAt ? 'saved · post again to tell players' : 'draft saved ✓';
      paint();
      if (publish) ctx.toast(`Line-up posted · ${r.notified ?? 0} players told${r.discord?.ok ? ' · on Discord' : ''}`);
      if (r.discord && !r.discord.ok) ctx.toast(`Discord: ${r.discord.error}`, true);
    } catch (er) { D.saving = 'not saved'; paint(); ctx.toast(er.message, true); }
  }
  async function moveTrial(id, to) {
    const t = D.trials?.find((x) => x.id === Number(id));
    if (!t || t.status === to) return;
    const prev = t.status;
    t.status = to; paint();
    try { D.trials = (await ctx.call('/api/trials/update', { id: t.id, status: to })).trials; ctx.toast(`${t.ea} → ${FUNNEL.find(([k]) => k === to)?.[1] ?? to}`); }
    catch (er) { t.status = prev; ctx.toast(er.message, true); }
    paint();
  }
  async function decide(user, action) {
    const card = $(`[data-claim-card="${CSS.escape(user)}"]`, el);
    if (card && !matchMedia('(prefers-reduced-motion: reduce)').matches) { card.classList.add(action === 'approve' ? 'fly-r' : 'fly-l'); await new Promise((r) => setTimeout(r, 260)); }
    ctx.decide(user, action); // app.js: optimistic update + redraw of the Manager tab (which remounts this)
  }

  function bind() {
    el.onclick = (ev) => {
      const t = ev.target.closest('[data-p], [data-slot], [data-dg], [data-move], [data-decide]');
      if (!t) return;
      const d = t.dataset;
      if (d.p) { D.pick = D.pick === d.p ? null : d.p; paint(); }
      if (d.slot) place(d.slot);
      if (d.dg === 'publish') save(true);
      if (d.move) moveTrial(d.move, d.to);
      if (d.decide) decide(d.u, d.decide);
    };
    el.onchange = (ev) => { if (ev.target.matches('[data-dg="formation"]')) { reshape(ev.target.value); D.pick = null; queueSave(); paint(); } };
    el.ondragstart = (ev) => {
      const p = ev.target.closest?.('[data-p]'), tc = ev.target.closest?.('[data-trial]');
      if (p) { D.pick = p.dataset.p; ev.dataTransfer.setData('text/plain', `p:${D.pick}`); el.classList.add('dragging'); $$slots(true); }
      if (tc) { ev.dataTransfer.setData('text/plain', `t:${tc.dataset.trial}`); tc.classList.add('lift'); }
    };
    el.ondragend = (ev) => { el.classList.remove('dragging'); $$slots(false); if (ev.target.closest?.('[data-p]')) D.pick = null; }; // a drag that lands nowhere must not leave a hidden pick behind
    el.ondragover = (ev) => { if (ev.target.closest?.('[data-slot], [data-col]')) ev.preventDefault(); };
    el.ondrop = (ev) => {
      const v = ev.dataTransfer.getData('text/plain');
      const sl = ev.target.closest?.('[data-slot]'), col = ev.target.closest?.('[data-col]');
      if (sl && v.startsWith('p:')) { ev.preventDefault(); D.pick = v.slice(2); place(sl.dataset.slot); }
      if (col && v.startsWith('t:')) { ev.preventDefault(); moveTrial(v.slice(2), col.dataset.col); }
    };
    // Claim card: drag/swipe right → approve, left → reject (pointer events, so it works with touch too).
    let sx = null, card = null;
    el.onpointerdown = (ev) => { card = ev.target.closest?.('[data-claim-card]'); if (card) { sx = ev.clientX; card.setPointerCapture(ev.pointerId); card.classList.add('drag'); } };
    el.onpointermove = (ev) => {
      if (!card || sx === null) return;
      const dx = ev.clientX - sx;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      card.classList.toggle('to-ok', dx > 60); card.classList.toggle('to-no', dx < -60);
    };
    el.onpointerup = (ev) => {
      if (!card || sx === null) return;
      const dx = ev.clientX - sx, c = card;
      sx = null; card = null; c.classList.remove('drag');
      if (Math.abs(dx) > 110) decide(c.dataset.claimCard, dx > 0 ? 'approve' : 'reject');
      else { c.style.transform = ''; c.classList.remove('to-ok', 'to-no'); }
    };
    el.onpointercancel = () => { if (card) { card.style.transform = ''; card.classList.remove('drag', 'to-ok', 'to-no'); } sx = null; card = null; }; // the browser took the gesture (scroll)
  }
  const $$slots = (on) => el.querySelectorAll('.dg-slot:not(.on)').forEach((s) => s.classList.toggle('glow', on));

  async function load(force) {
    if (!force && D.ev && Date.now() - D.at < 20000) return;
    D.at = Date.now();
    const [ev, tr, pl] = await Promise.all([
      ctx.call('/api/events'),
      ctx.flagOn('trials') ? ctx.call('/api/trials').then((r) => r.trials).catch(() => []) : [],
      ctx.flagOn('tactics') ? ctx.call('/api/plays').then((r) => r.plays).catch(() => []) : [],
    ]);
    D.ev = ev; D.trials = tr; D.plays = pl;
    const e = nextEvent();
    if (!e || e.id !== D.evId || !D.saving) adopt(e); // never throw away an unsaved drag
    paint();
  }
  function mount(root, c) {
    el = root; ctx = c;
    bind();
    paint();
    load().catch((er) => { if (!D.ev) el.innerHTML = ctx.UI.empty({ icon: '🧢', title: 'Could not open the Dugout', text: er.message }); });
  }
  window.NXDugout = { mount, refresh: () => load(true) };
})();
