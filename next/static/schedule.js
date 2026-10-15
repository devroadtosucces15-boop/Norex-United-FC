// Staff › Schedule (Phase C2): create / edit / duplicate / cancel match nights, quick templates, staff check-in, session reports.
// Live routes: GET /api/events (+ /report?id=, /discord), POST /api/events (create or edit), /cancel, /checkin, /report/post.
(() => {
  const d = document, root = d.getElementById('scLive'); if (!root) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const call = (path, body) => (body ? A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) : A.call(path));
  const toast = (m, err) => M?.toast ? M.toast(m, err ? { kind: 'err' } : { kind: 'ok' }) : console.log(m);
  const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
  const PRESETS = [['🏆', 'League night', { type: 'league', time: '20:00', duration: 150, needs: { players: 11 } }], ['⚡', 'Rush session', { type: 'rush', time: '21:00', duration: 90, needs: { players: 5 } }], ['🤝', 'Friendly', { type: 'friendly', time: '20:30', duration: 90, needs: { players: 11 } }], ['🎯', 'Training', { type: 'training', time: '19:30', duration: 60, needs: {} }], ['🧭', 'Trial session', { type: 'trial', time: '20:00', duration: 90, needs: {} }]];
  const S = { ev: null, form: null, report: {}, targets: null, openRep: null, tab: 'soon' };
  const fmtWhen = (ms) => new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const label = (e) => e.title || S.ev.types[e.type]?.[1] || 'Match night';
  const iso = (ms, tz) => { try { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }; } catch { const x = new Date(ms).toISOString(); return { date: x.slice(0, 10), time: x.slice(11, 16) }; } };
  const nextDate = (days = 1) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  const live = (e) => Date.now() > e.start - 3600e3 && Date.now() < e.end + 7200e3;
  const counts = (e) => ({ yes: e.rsvps.filter((r) => r.s === 'yes').length, maybe: e.rsvps.filter((r) => r.s === 'maybe').length, no: e.rsvps.filter((r) => r.s === 'no').length });
  const mine = (e) => e.checkins.some((c) => c.id === A.session?.u);

  const blank = (p = {}) => ({ id: null, type: 'league', title: '', date: nextDate(2), time: '20:00', duration: 120, tz: TZ, players: 11, public: false, remind: 'dm', notes: '', ...p });
  const fromEvent = (e, dup) => { const w = iso(e.start, e.tz); return { id: dup ? null : e.id, type: e.type, title: e.title || '', date: dup ? iso(e.start + 7 * 864e5, e.tz).date : w.date, time: w.time, duration: e.duration, tz: e.tz, players: e.needs?.players ?? '', public: !!e.public, remind: e.remind || 'dm', notes: e.notes || '' }; };

  function formHtml() {
    const f = S.form; if (!f) return '';
    return `<form class="panel sc-form" data-form><div class="sc-fh"><h3>${f.id ? 'Edit match night' : 'New match night'}</h3><button type="button" class="chip" data-sc="close">✕ Close</button></div>
${f.id ? '' : `<div class="sc-presets" aria-label="Quick templates">${PRESETS.map(([i, n], k) => `<button type="button" class="chip" data-preset="${k}">${i} ${n}</button>`).join('')}</div>`}
<div class="sc-grid">
<label>Kind<select name="type">${Object.entries(S.ev.types).map(([k, v]) => `<option value="${k}"${k === f.type ? ' selected' : ''}>${v[0]} ${esc(v[1])}</option>`).join('')}</select></label>
<label>Title <small class="muted">(optional)</small><input name="title" maxlength="80" value="${esc(f.title)}" placeholder="e.g. Derby night"></label>
<label>Date<input type="date" name="date" value="${esc(f.date)}" required></label>
<label>Start<input type="time" name="time" value="${esc(f.time)}" required></label>
<label>Length (min)<input type="number" name="duration" min="15" max="600" step="15" value="${esc(f.duration)}"></label>
<label>Time zone<input name="tz" value="${esc(f.tz)}" placeholder="Europe/London"></label>
<label>Players needed<input type="number" name="players" min="1" max="30" value="${esc(f.players)}"></label>
<label>Reminders<select name="remind">${[['dm', 'DM people who haven’t answered'], ['mention', '@mention in the channel'], ['off', 'None']].map(([k, n]) => `<option value="${k}"${k === f.remind ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
</div>
<label class="sc-wide">Notes <small class="muted">(shown to players)</small><textarea name="notes" maxlength="1000" rows="2">${esc(f.notes)}</textarea></label>
<label class="sc-check"><input type="checkbox" name="public"${f.public ? ' checked' : ''}> Show on the public site (next fixtures)</label>
<div class="sc-acts"><button class="btn" type="submit">${f.id ? '💾 Save changes' : '➕ Create match night'}</button><span class="muted small" data-msg></span></div></form>`;
  }
  function card(e, past) {
    const c = counts(e), cancelled = e.status !== 'scheduled', t = S.ev.types[e.type] || ['📅', e.type];
    const needs = e.needs?.players ? `${c.yes}/${e.needs.players} in` : `${c.yes} in`;
    return `<article class="panel sc-ev${cancelled ? ' off' : ''}" data-id="${e.id}"><div class="sc-top"><span class="sc-t">${t[0]}</span><div><b>${esc(label(e))}</b><small>${esc(fmtWhen(e.start))} · ${e.duration} min</small></div>
<span class="sc-c"><i>✅ ${c.yes}</i><i>❔ ${c.maybe}</i><i>❌ ${c.no}</i></span></div>
<p class="muted small sc-meta">${cancelled ? `🚫 Cancelled${e.cancelReason ? ` · ${esc(e.cancelReason)}` : ''}` : `${needs}${e.lineupAt ? ' · line-up posted' : e.formation ? ' · draft line-up' : ''}${e.checkins.length ? ` · ${e.checkins.length} checked in` : ''}${e.public ? ' · public' : ''}`}</p>
<div class="sc-btns">${cancelled ? `<button class="chip" data-dup="${e.id}">⎘ Duplicate</button>` : past ? `<button class="chip" data-rep="${e.id}">📋 ${e.reportAt ? 'Report (sent)' : 'Session report'}</button><button class="chip" data-dup="${e.id}">⎘ Duplicate</button>`
      : `<a class="chip" href="staff-dugout.html">🧢 Dugout</a><button class="chip" data-edit="${e.id}">✎ Edit</button><button class="chip" data-dup="${e.id}">⎘ Duplicate</button>${live(e) ? `<button class="chip${mine(e) ? ' on' : ''}" data-ck="${e.id}">${mine(e) ? '🟢 Checked in' : '📍 Check in'}</button>` : ''}<button class="chip danger" data-cancel="${e.id}">🚫 Cancel</button>`}</div>${S.openRep === e.id ? reportHtml(e) : ''}</article>`;
  }
  function reportHtml(e) {
    const r = S.report[e.id]; if (!r) return `<div class="sc-rep"><div class="dg-skel"><i></i></div></div>`;
    if (r.error) return `<div class="sc-rep"><p class="muted small">${esc(r.error)}</p></div>`;
    const t = r.team, T = S.targets;
    return `<div class="sc-rep"><div class="sc-grade"><b>${esc(t.grade ?? '–')}</b><span>${t.games ? `${t.w}W ${t.d}D ${t.l}L · ${t.gf}–${t.ga}` : 'No games found in this window yet'}</span></div>
${r.mvp ? `<p class="small">⭐ MVP <b>${esc(r.mvp.n)}</b> ${r.mvp.avg != null ? Number(r.mvp.avg).toFixed(1) : ''}</p>` : ''}
<p class="muted small">Came ${r.attendance.came} of ${r.attendance.saidYes} who said yes${r.attendance.noShow.length ? ` · missed: ${r.attendance.noShow.map((x) => esc(x.n)).join(', ')}` : ''}${r.attendance.walkIns.length ? ` · walk-ins: ${r.attendance.walkIns.map((x) => esc(x.n)).join(', ')}` : ''}</p>
<div class="sc-post">${T?.ready ? `<select data-ch aria-label="Discord channel"><option value="">Players only (no Discord)</option>${T.channels.map((c) => `<option value="${c.id}"${c.id === T.last ? ' selected' : ''}>#${esc(c.name)}</option>`).join('')}</select>` : '<span class="muted small">Discord not connected – players still get an alert.</span>'}<button class="btn" data-post="${e.id}">📣 Send report${e.reportAt ? ' again' : ''}</button></div></div>`;
  }
  function paint() {
    if (!root.isConnected) return;
    if (!S.ev) { root.innerHTML = '<div class="dg-skel"><i></i><i></i></div>'; return; }
    const now = Date.now(), all = S.ev.events.slice().sort((a, b) => a.start - b.start);
    const soon = all.filter((e) => e.status === 'scheduled' && e.end + 2 * 3600e3 >= now), past = all.filter((e) => e.status === 'scheduled' && e.end + 2 * 3600e3 < now).reverse(), off = all.filter((e) => e.status !== 'scheduled').reverse();
    const list = S.tab === 'soon' ? soon : S.tab === 'past' ? past : off;
    root.innerHTML = `<div class="sc"><div class="sc-head"><div class="chips" data-tabs>${[['soon', `Upcoming ${soon.length}`], ['past', `Played ${past.length}`], ['off', `Cancelled ${off.length}`]].map(([k, n]) => `<button class="chip${S.tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div><button class="btn" data-sc="new">➕ New match night</button></div>
${formHtml()}<div class="sc-list">${list.length ? list.map((e) => card(e, S.tab === 'past')).join('') : `<div class="panel sq-empty"><span>🗓️</span><div><b>${S.tab === 'soon' ? 'Nothing scheduled' : 'Nothing here'}</b><p class="muted small">${S.tab === 'soon' ? 'Create a match night – everyone gets the answer buttons in the Locker and on Discord.' : ''}</p></div></div>`}</div></div>`;
  }
  async function reload() { S.ev = await call('/api/events'); paint(); }
  async function submit(form) {
    const fd = new FormData(form), b = Object.fromEntries(fd.entries()), msg = form.querySelector('[data-msg]');
    const body = { id: S.form.id || undefined, type: b.type, title: b.title, date: b.date, time: b.time, duration: Number(b.duration) || 120, tz: b.tz || TZ, needs: b.players ? { players: Number(b.players) } : {}, remind: b.remind, notes: b.notes, public: fd.has('public') };
    try { msg.textContent = 'Saving…'; const r = await call('/api/events', body); S.form = null; await reload(); toast(body.id ? 'Match night updated' : 'Match night created'); if (r.notified) toast(`${r.notified} players told`); }
    catch (er) { msg.textContent = er.message; toast(er.message, true); }
  }
  async function act(fn) { try { await fn(); } catch (er) { toast(er.message, true); } }
  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('button,a'); if (!t) return; const k = t.dataset, byId = (id) => S.ev.events.find((e) => e.id === Number(id));
    if (k.tab) { S.tab = k.tab; S.openRep = null; paint(); }
    else if (k.sc === 'new') { S.form = blank(); paint(); root.querySelector('[data-form]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    else if (k.sc === 'close') { S.form = null; paint(); }
    else if (k.preset !== undefined) { const [, n, p] = PRESETS[+k.preset]; const f = new FormData(root.querySelector('[data-form]')); S.form = { ...S.form, title: f.get('title') || '', date: f.get('date'), notes: f.get('notes') || '', type: p.type, time: p.time, duration: p.duration, players: p.needs.players ?? '' }; paint(); }
    else if (k.edit) { S.form = fromEvent(byId(k.edit)); paint(); root.querySelector('[data-form]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    else if (k.dup) { S.form = fromEvent(byId(k.dup), true); S.tab = 'soon'; paint(); toast('Copied to next week – adjust and create'); }
    else if (k.cancel) act(async () => { const e = byId(k.cancel); const reason = prompt(`Cancel ${label(e)} (${fmtWhen(e.start)})?\nEveryone who said yes or maybe gets told.\n\nReason (optional):`); if (reason === null) return; const r = await call('/api/events/cancel', { id: e.id, reason }); S.ev = { ...S.ev, ...r }; paint(); toast(`Cancelled · ${r.notified ?? 0} players told`); });
    else if (k.ck) act(async () => { const e = byId(k.ck); const r = await call('/api/events/checkin', { id: e.id, on: !mine(e) }); S.ev = { ...S.ev, ...r }; paint(); toast(mine(byId(k.ck)) ? '🟢 Checked in' : 'Checked out'); });
    else if (k.rep) act(async () => { const id = Number(k.rep); S.openRep = S.openRep === id ? null : id; paint(); if (S.openRep && !S.report[id]) { if (S.targets === null) S.targets = await call('/api/events/discord').catch(() => ({ ready: false })); S.report[id] = await call(`/api/events/report?id=${id}`).catch((er) => ({ error: er.message })); paint(); } });
    else if (k.post) act(async () => { const e = byId(k.post), ch = root.querySelector('[data-ch]')?.value || ''; if (!confirm(`Send the session report for ${label(e)}${ch ? ' to Discord and' : ' to'} the players who took part?`)) return; const r = await call('/api/events/report/post', { id: e.id, channel: ch || undefined }); S.ev = { ...S.ev, ...r }; paint(); toast(`Report sent · ${r.notified ?? 0} players told${r.discord?.ok ? ' · on Discord' : ''}`); if (r.discord && !r.discord.ok) toast(`Discord: ${r.discord.error}`, true); });
  });
  root.addEventListener('submit', (ev) => { ev.preventDefault(); if (ev.target.matches('[data-form]')) submit(ev.target); });
  (async () => {
    await A.ready?.catch?.(() => {});
    if (!['manager', 'owner'].includes(A.role)) return;
    d.getElementById('scLocal')?.setAttribute('hidden', ''); root.hidden = false; paint();
    reload().catch((er) => { root.innerHTML = `<div class="panel sq-empty"><span>🗓️</span><div><b>Could not open the schedule</b><p class="muted small">${esc(er.message)}</p></div></div>`; });
  })();
})();
