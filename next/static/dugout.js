// Staff › Dugout (Phase C1): the next match night's line-up on one screen, on the live routes.
//   ① who answered (RSVPs) → ② drag or tap them onto the pitch (auto-saves a draft, one button posts it) → ③ ready check,
//   ④ short positions with a one-tap nudge, ⑤ ✨ suggested line-up from who said yes (flag lineupRec).
// Routes: GET /api/events (events + formations), POST /api/events/lineup, /api/events/nudge, /api/events/recommend.
// Live: socket on /api/events/<id>/lineup/ws – another manager's save or a new answer re-reads the schedule.
// Plays for tonight, the squad-week heatmap, trials and claims arrive with C2/C3.
(() => {
  const d = document, root = d.getElementById('dgLive'); if (!root) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A?.token) return;   // no live API (local preview): the offline planner on this page stays
  const $ = (s, r = root) => r.querySelector(s), $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const flagOn = (f) => (A.features || []).includes(f);
  const call = (path, body) => (body ? A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) : A.call(path));
  const toast = (m, err) => M?.toast ? M.toast(m, err ? { kind: 'err' } : { kind: 'ok' }) : console.log(m);
  const POS_OF = (slot) => ({ LCB: 'CB', RCB: 'CB', LCM: 'CM', RCM: 'CM', LDM: 'CDM', RDM: 'CDM', LAM: 'CAM', RAM: 'CAM', LS: 'ST', RS: 'ST' })[slot] ?? slot;
  const ICON = { yes: '✅', maybe: '❔', no: '❌' };
  const short = (n) => String(n ?? '').slice(0, 13);
  const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 90 ? 'just now' : s < 5400 ? Math.round(s / 60) + ' min ago' : s < 129600 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };

  const D = { ev: null, at: 0, evId: null, formation: null, slots: {}, pick: null, saving: '', dirty: false, live: false, tipped: '' };
  let saveTimer = null, live = null;
  const nextEvent = () => (D.ev?.events || []).filter((e) => e.status === 'scheduled' && e.end > Date.now()).sort((a, b) => a.start - b.start)[0] || null;
  const people = (e) => {
    const m = new Map();
    for (const r of e.rsvps) m.set(r.id, { id: r.id, n: r.n, a: r.a, s: r.s, pos: r.pos || [] });
    for (const c of e.checkins || []) if (!m.has(c.id)) m.set(c.id, { id: c.id, n: c.n, a: c.a, s: null, on: true, pos: [] });
    for (const [id, u] of Object.entries(e.lineupPeople || {})) if (!m.has(id)) m.set(id, { id, n: u.n, a: u.a, s: null, pos: [] });
    return m;
  };
  function adopt(e) {
    D.evId = e?.id ?? null;
    D.formation = e?.formation && D.ev.formations[e.formation] ? e.formation : '4-3-3';
    D.slots = {};
    for (const [id, slot] of Object.entries(e?.lineup || {})) if (D.ev.formations[D.formation]?.some((x) => x[0] === slot)) D.slots[slot] = id;
    D.pick = null;
  }
  const skeleton = () => `<div class="dg-skel"><i></i><i></i><i></i></div>`;
  const empty = (icon, title, text) => `<div class="panel sq-empty"><span>${icon}</span><div><b>${esc(title)}</b><p class="muted small">${esc(text)}</p></div></div>`;
  const av = (p) => p.a ? `<img class="dg-av" src="${esc(p.a)}" alt="" loading="lazy">` : `<span class="dg-av dg-ini">${esc((p.n || '?')[0].toUpperCase())}</span>`;

  // ---------- ① answers ----------
  function available(e, who) {
    const placed = new Set(Object.values(D.slots)), order = { yes: 0, maybe: 1, null: 2, no: 3 };
    const list = [...who.values()].sort((a, b) => (order[a.s] ?? 2) - (order[b.s] ?? 2) || a.n.localeCompare(b.n));
    return `<div class="dg-h"><h3>📅 Who’s in</h3><span class="dg-tag">${list.filter((p) => p.s === 'yes').length} in · ${list.filter((p) => p.s === 'maybe').length} maybe · ${list.filter((p) => !p.s && !p.on).length} waiting</span></div>
${list.length ? `<div class="dg-avail">${list.map((p) => `<button type="button" class="dg-p s-${esc(p.s || 'none')}${placed.has(p.id) ? ' placed' : ''}${D.pick === p.id ? ' sel' : ''}" draggable="${p.s === 'no' ? 'false' : 'true'}" data-p="${esc(p.id)}"${p.s === 'no' ? ' disabled' : ''}>${av(p)}<span><b>${esc(p.n)}</b><small>${placed.has(p.id) ? 'on the pitch' : p.s === 'maybe' ? 'maybe' : p.s === 'no' ? 'can’t make it' : p.s ? 'available' : p.on ? 'checked in' : 'no answer yet'}</small></span><i>${p.s ? ICON[p.s] : p.on ? '🟢' : '⏳'}</i><em>${esc(p.pos[0] || '')}</em></button>`).join('')}</div>` : empty('📭', 'No answers yet', 'Players show up here as they tap “I’m in” in the Locker.')}`;
  }
  // ---------- ② pitch ----------
  function pitch(e, who) {
    const f = D.ev.formations[D.formation] || [], filled = f.filter(([s]) => D.slots[s]).length;
    return `<div class="dg-h"><h3>🧩 ${esc(D.formation)}</h3><label class="dg-form">Shape <select data-dg="formation" aria-label="Formation">${Object.keys(D.ev.formations).map((k) => `<option${k === D.formation ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></label><span class="dg-tag">${filled}/${f.length} · ${esc(D.saving || (e.lineupAt ? 'published' : 'draft'))}</span></div>
<div class="dg-pitch-wrap"><div class="dg-pitch"><span class="dg-mark" aria-hidden="true"></span>${f.map(([slot, x, y]) => {
      const p = who.get(D.slots[slot]), warn = p && p.s !== 'yes' && !p.on;
      return `<button type="button" class="dg-slot${p ? ' on' : ''}${warn ? ' warn' : ''}${!p && D.pick ? ' glow' : ''}" style="left:${x}%;top:${y}%" data-slot="${esc(slot)}" aria-label="${esc(POS_OF(slot))}${p ? ': ' + esc(p.n) : ' – empty'}">${p ? av(p) : `<span class="dg-dot">${esc(POS_OF(slot))}</span>`}<small>${p ? esc(short(p.n)) : 'drop here'}</small></button>`;
    }).join('')}</div></div>
<p class="muted small dg-help">${D.pick ? `Now tap a spot for <b>${esc(who.get(D.pick)?.n)}</b>.` : 'Drag a name onto a spot, or tap a name and then a spot. Tap a filled spot to send them back. Changes save as a draft.'}</p>`;
  }
  // ---------- ③ ready check + ④ short positions ----------
  function ready(e, who) {
    const f = D.ev.formations[D.formation] || [], ids = f.map(([s]) => D.slots[s]).filter(Boolean), placed = ids.map((id) => who.get(id)).filter(Boolean);
    const maybes = placed.filter((p) => p.s === 'maybe'), waiting = placed.filter((p) => !p.s && !p.on), nos = placed.filter((p) => p.s === 'no');
    const subs = [...who.values()].filter((p) => p.s === 'yes' && !ids.includes(p.id)), gk = D.slots.GK ? who.get(D.slots.GK) : null;
    const line = (ok, t) => `<li class="${ok === true ? 'ok' : ok === false ? 'bad' : 'warn'}">${ok === true ? '✅' : ok === false ? '❌' : '⚠️'} ${t}</li>`;
    // short = positions the shape needs that fewer "yes" players list than slots; one tap nudges members who play there and haven't answered
    const need = {}; for (const [s] of f) need[POS_OF(s)] = (need[POS_OF(s)] || 0) + 1;
    const yes = [...who.values()].filter((p) => p.s === 'yes');
    const shortOn = Object.entries(need).filter(([pos, n]) => yes.filter((p) => p.pos.includes(pos)).length < n).map(([pos]) => pos);
    return `<div class="dg-h"><h3>🚦 Ready check</h3></div><ul class="dg-ready">
${line(ids.length === f.length ? true : ids.length ? null : false, `${ids.length} of ${f.length} spots filled`)}
${maybes.length ? line(null, `${maybes.length} maybe (${maybes.map((p) => esc(p.n)).join(', ')})`) : ''}
${waiting.length ? line(null, `${waiting.length} picked but no answer yet`) : ''}
${nos.length ? line(false, `${nos.length} picked but can’t make it (${nos.map((p) => esc(p.n)).join(', ')})`) : ''}
${line(gk ? true : null, gk ? `Keeper: ${esc(gk.n)}` : 'Keeper: AI')}
${line(subs.length ? true : null, subs.length ? `${subs.length} sub${subs.length > 1 ? 's' : ''} ready (${subs.slice(0, 3).map((p) => esc(p.n)).join(', ')}${subs.length > 3 ? '…' : ''})` : 'No sub if someone drops')}
${e.lineupAt ? line(true, `Published ${esc(ago(e.lineupAt))}`) : line(null, 'Not published yet')}</ul>
<div class="dg-h" style="margin-top:16px"><h3>📣 Short on…</h3></div>
${shortOn.length ? `<div class="dg-short">${shortOn.map((pos) => `<button type="button" class="chip" data-nudge="${esc(pos)}">${esc(pos)} · nudge</button>`).join('')}</div><p class="muted tiny">Sends an alert to members who play that position and haven’t answered.</p>` : '<p class="muted small">Every position in this shape has someone who said yes. 👌</p>'}`;
  }
  // ---------- paint ----------
  function paint() {
    if (!root.isConnected) return;
    if (!D.ev) { root.innerHTML = skeleton(); return; }
    const e = nextEvent();
    if (e && e.id !== D.evId) adopt(e);
    const who = e ? people(e) : new Map();
    const when = e ? new Date(e.start).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    root.innerHTML = `<div class="dg"><div class="dg-head"><h3>${e ? `${esc(e.title || (e.type === 'league' ? 'League match' : 'Match night'))} · ${esc(when)}` : 'The Dugout'}</h3>
<div class="dg-acts">${e && D.live ? '<span class="dg-live" title="Updates by itself when another manager edits or players answer">🟢 Live</span>' : ''}${e && flagOn('lineupRec') ? '<button type="button" class="chip" data-dg="suggest">✨ Suggest line-up</button>' : ''}${e ? `<button type="button" class="chip" data-dg="clear">Clear</button><button type="button" class="btn" data-dg="publish">📣 Post line-up${e.lineupAt ? ' again' : ''}</button>` : ''}</div></div>
${e ? `<div class="dg-top"><section class="panel dg-sec dg-av">${available(e, who)}</section><section class="panel dg-sec dg-pi">${pitch(e, who)}</section><section class="panel dg-sec dg-rd">${ready(e, who)}</section></div>`
      : empty('🗓️', 'No match night coming up', 'Schedule one in the live Hub and the line-up builder opens here.')}</div>`;
  }
  // ---------- actions ----------
  function reshape(next) {   // switching shape keeps the players: each goes to a free spot with the same position, the rest fill what's left
    const from = D.ev.formations[D.formation] || [], free = [...(D.ev.formations[next] || [])], slots = {}, rest = [];
    for (const [slot] of from) { const id = D.slots[slot]; if (!id) continue; const i = free.findIndex(([s]) => POS_OF(s) === POS_OF(slot)); if (i >= 0) slots[free.splice(i, 1)[0][0]] = id; else rest.push(id); }
    for (const id of rest) { const i = free.findIndex(([s]) => s !== 'GK'); if (i >= 0) slots[free.splice(i, 1)[0][0]] = id; }
    D.formation = next; D.slots = slots;
  }
  function place(slot) {
    const cur = D.slots[slot];
    if (D.pick) { for (const k of Object.keys(D.slots)) if (D.slots[k] === D.pick) delete D.slots[k]; D.slots[slot] = D.pick; D.pick = null; }
    else if (cur) delete D.slots[slot]; else return;
    queueSave(); paint();
  }
  function queueSave() { D.saving = 'saving…'; D.dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(() => save(false), 900); }
  async function save(publish) {
    clearTimeout(saveTimer);
    const e = nextEvent(); if (!e) return;
    const lineup = Object.fromEntries(Object.entries(D.slots).map(([slot, id]) => [id, slot]));
    if (publish && !Object.keys(lineup).length) return toast('Place at least one player before posting', true);
    if (publish && !confirm(`Post the line-up?\n\n${Object.keys(lineup).length} players get an alert${e.lineupAt ? ' (again)' : ''} and it goes to Discord.`)) return;
    try {
      const r = await call('/api/events/lineup', { id: e.id, formation: D.formation, lineup, publish });
      D.ev = { ...D.ev, ...r }; D.dirty = false;
      D.saving = publish ? '' : e.lineupAt ? 'saved · post again to tell players' : 'draft saved ✓';
      paint();
      if (publish) toast(`Line-up posted · ${r.notified ?? 0} players told${r.discord?.ok ? ' · on Discord' : ''}`);
      if (r.discord && !r.discord.ok) toast(`Discord: ${r.discord.error}`, true);
    } catch (er) { D.saving = 'not saved'; paint(); toast(er.message, true); }
  }
  async function suggest() {
    const e = nextEvent(); if (!e) return;
    try {
      const r = await call('/api/events/recommend', { id: e.id, formation: D.formation });
      if (!Object.keys(r.lineup || {}).length) return toast('Nobody has said yes yet – nothing to suggest', true);
      D.formation = r.formation; D.slots = Object.fromEntries(Object.entries(r.lineup).map(([id, slot]) => [slot, id])); D.pick = null; D.tipped = Object.values(r.reasons || {}).slice(0, 3).join(' · ');
      queueSave(); paint(); toast('✨ Suggested from who said yes – review it before posting');
    } catch (er) { toast(er.message, true); }
  }
  async function nudge(pos) {
    const e = nextEvent(); if (!e) return;
    try { const r = await call('/api/events/nudge', { id: e.id, position: pos }); D.ev = { ...D.ev, ...r }; paint(); toast(`📣 ${r.notified} nudged for ${pos}`); } catch (er) { toast(er.message, true); }
  }
  function bind() {
    root.onclick = (ev) => {
      const t = ev.target.closest('[data-p],[data-slot],[data-dg],[data-nudge]'); if (!t) return;
      const k = t.dataset;
      if (k.p) { D.pick = D.pick === k.p ? null : k.p; paint(); }
      else if (k.slot) place(k.slot);
      else if (k.nudge) nudge(k.nudge);
      else if (k.dg === 'publish') save(true);
      else if (k.dg === 'suggest') suggest();
      else if (k.dg === 'clear') { D.slots = {}; D.pick = null; queueSave(); paint(); }
    };
    root.onchange = (ev) => { if (ev.target.matches('[data-dg="formation"]')) { reshape(ev.target.value); D.pick = null; queueSave(); paint(); } };
    root.ondragstart = (ev) => { const p = ev.target.closest?.('[data-p]'); if (p) { D.pick = p.dataset.p; ev.dataTransfer.setData('text/plain', D.pick); root.classList.add('dragging'); } };
    root.ondragend = () => { root.classList.remove('dragging'); D.pick = null; };
    root.ondragover = (ev) => { if (ev.target.closest?.('[data-slot]')) ev.preventDefault(); };
    root.ondrop = (ev) => { const sl = ev.target.closest?.('[data-slot]'); if (!sl) return; ev.preventDefault(); D.pick = ev.dataTransfer.getData('text/plain') || D.pick; place(sl.dataset.slot); };
  }
  async function load(force) {
    if (!force && D.ev && Date.now() - D.at < 20000) return;
    D.at = Date.now();
    D.ev = await call('/api/events');
    const e = nextEvent();
    if (!e || e.id !== D.evId || (!D.dirty && !D.pick)) adopt(e);   // never throw away an unsaved drag
    listen(e); paint();
  }
  function listen(e) {
    if (live?.id === e?.id) return;
    live?.close(); live = null; D.live = false;
    if (!e || !window.WebSocket) return;
    let sock = null, ping = null, retry = null, closed = false, wait = null, opened = false;
    const close = () => { closed = true; clearInterval(ping); clearTimeout(retry); clearTimeout(wait); try { sock?.close(); } catch { /* already closed */ } };
    const connect = () => {
      try { sock = new WebSocket(`${API.replace(/^http/, 'ws')}/api/events/${e.id}/lineup/ws?t=${encodeURIComponent(A.token)}`); } catch { return; }
      sock.onopen = () => { opened = true; D.live = true; paint(); ping = setInterval(() => { if (sock.readyState === 1) sock.send('ping'); }, 30000); };
      sock.onmessage = (m) => { if (m.data === 'pong') return; if (!root.isConnected) return close(); clearTimeout(wait); wait = setTimeout(() => load(true).catch(() => {}), 400); };
      sock.onclose = () => { clearInterval(ping); if (D.live) { D.live = false; paint(); } if (opened && !closed && root.isConnected) retry = setTimeout(connect, 8000); };
    };
    connect(); live = { id: e.id, close };
  }
  (async () => {
    await A.ready?.catch?.(() => {});
    if (!['manager', 'owner'].includes(A.role)) return;
    d.getElementById('dgLocal')?.setAttribute('hidden', ''); d.getElementById('dgF')?.closest('.chips')?.setAttribute('hidden', ''); root.hidden = false;
    bind(); paint();
    load().catch((er) => { if (!D.ev) root.innerHTML = empty('🧢', 'Could not open the Dugout', er.message); });
  })();
})();
