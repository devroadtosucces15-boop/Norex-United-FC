// Match operations on the client (roadmap P3.1 scheduling, P3.2 availability 2.0, P3.7 match night).
//   NXEvents.schedule(el, ctx)   Squad Hub → 🗓️ Schedule: calendar strip + events by day in the viewer's time zone,
//                                ✅ ❔ ❌ per event (tick several for bulk), "use my usual play times", managers create / edit /
//                                cancel; during a night: "I'm on" check-in, who's on, position trial, quick lineup;
//                                afterwards the session report (grades, results, trials) – managers share it
//   NXEvents.next(el)            home page strip: the next public event (no login needed)
//   NXEvents.weekTable(events)   manager portal → Squad week: events as columns (used by app.js)
// ctx = { call, toast, me: { u, n, a } }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BASE = document.body.dataset.base || '';
  const MAPI = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!$('link[href$="events.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/events.css` }));
  const TYPES = { league: ['🏆', 'League night'], rush: ['⚡', 'Rush session'], playoffs: ['🥇', 'Playoffs'], friendly: ['🤝', 'Friendly'], trial: ['🧭', 'Trial session'], training: ['🎯', 'Training'] };
  const ICON = { yes: '✅', maybe: '❔', no: '❌' };
  const NEED_POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
  const MY_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
  const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmtDay = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  const fmtTime = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const fmtWhen = (ms) => new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const label = (e) => e.title || TYPES[e.type][1];
  const until = (ms) => { const m = Math.round((ms - Date.now()) / 60000); return m < 60 ? `in ${Math.max(1, m)} min` : m < 1440 ? `in ${Math.round(m / 60)} h` : `in ${Math.round(m / 1440)} day${Math.round(m / 1440) > 1 ? 's' : ''}`; };
  // Wall clock of `ms` in `tz` → { date: 'YYYY-MM-DD', time: 'HH:MM' } (for the editor).
  const wall = (ms, tz) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  };
  const phase = (e) => (e.status !== 'scheduled' ? 'cancelled' : Date.now() > e.end + 2 * 3600e3 ? 'past' : Date.now() > e.start - 3600e3 ? 'live' : 'soon');

  // Positions still missing: needs vs the first-choice positions of everyone who said yes.
  function coverage(e) {
    const yes = e.rsvps.filter((r) => r.s === 'yes');
    const out = Object.entries(e.needs).filter(([k]) => k !== 'players').map(([k, n]) => {
      const have = yes.filter((r) => r.pos?.[0] === k).length;
      const could = yes.filter((r) => r.pos?.includes(k)).length;
      return { k, n, have, could, short: have < n };
    });
    if (e.needs.players) out.unshift({ k: 'players', n: e.needs.players, have: yes.length, could: yes.length, short: yes.length < e.needs.players });
    return out;
  }

  // ================= Squad Hub tab =================
  function schedule(el, ctx) {
    let S = null, sel = new Set(), poll = null, day = null, showPast = false;
    const load = async () => { S = await ctx.call('/api/events'); paint(); };
    const mine = (e) => e.rsvps.find((r) => r.id === ctx.me.u)?.s;
    const faces = (list, cls = '') => list.map((r) => `<img class="${cls}" src="${esc(r.a || '')}" alt="" data-tip="${esc(r.n)}${r.pos?.length ? ` · ${esc(r.pos.slice(0, 3).join('/'))}` : ''}">`).join('');

    function card(e) {
      const ph = phase(e), my = mine(e), by = (s) => e.rsvps.filter((r) => r.s === s);
      const cov = coverage(e), live = ph === 'live' && S.matchNight;
      const tzNote = e.tz !== MY_TZ ? ` <small class="muted" data-tip="Scheduled for ${esc(e.tz.replace(/_/g, ' '))} – shown in your time">🌍 ${esc(new Date(e.start).toLocaleTimeString(undefined, { timeZone: e.tz, hour: '2-digit', minute: '2-digit' }))} ${esc(e.tz.split('/').pop().replace(/_/g, ' '))}</small>` : '';
      const me = e.checkins.find((c) => c.id === ctx.me.u);
      return `<article class="card ev ev-${e.type} ph-${ph}${sel.has(e.id) ? ' sel' : ''}${my ? ` my-${my}` : ''}" id="ev-${e.id}" data-id="${e.id}">
<header>${ph === 'soon' || ph === 'live' ? `<input type="checkbox" class="ev-sel" data-sel aria-label="Select for bulk answer"${sel.has(e.id) ? ' checked' : ''}>` : ''}<span class="ev-ic" aria-hidden="true">${TYPES[e.type][0]}</span>
<div class="ev-t"><b>${esc(label(e))}</b><small>${fmtTime(e.start)} – ${fmtTime(e.end)}${tzNote}${ph === 'soon' ? ` · ${until(e.start)}` : ''}</small></div>
${ph === 'live' ? UI.pill(Date.now() < e.start ? 'Starting soon' : Date.now() < e.end ? 'Live now' : 'Just finished', { emoji: '🔴', tone: 'red' }) : ph === 'cancelled' ? UI.pill('Cancelled', { emoji: '🚫', tone: 'loss' }) : ''}
${e.usual !== undefined && !my && ph !== 'past' ? UI.pill(e.usual ? 'You’re usually on' : 'Outside your usual times', { emoji: e.usual ? '🟢' : '🌙', tone: e.usual ? 'win' : '', tip: 'From the play times on your profile' }) : ''}</header>
${e.cancelReason ? `<p class="muted small">🚫 ${esc(e.cancelReason)}</p>` : ''}${e.notes ? `<p class="ev-notes">${esc(e.notes).replace(/\n/g, '<br>')}</p>` : ''}
${cov.length && ph !== 'cancelled' ? `<div class="ev-needs">${cov.map((c) => `<span class="ev-need${c.short ? ' short' : ''}" data-tip="${c.k === 'players' ? `${c.have} said yes` : `${c.have} first-choice ${c.k} said yes${c.could > c.have ? ` · ${c.could} can play it` : ''}`}">${c.k === 'players' ? '👥' : esc(c.k)} <b>${c.have}/${c.n}</b></span>`).join('')}</div>` : ''}
<div class="ev-who"><span class="count-row"><span>✅ ${by('yes').length}</span><span>❔ ${by('maybe').length}</span><span>❌ ${by('no').length}</span></span><span class="faces">${faces(by('yes'))}${faces(by('maybe'), 'maybe')}</span></div>
${live ? liveBox(e, me) : ''}
<footer>${ph === 'soon' || ph === 'live' ? `<div class="pick" role="group" aria-label="Can you make it?">${['yes', 'maybe', 'no'].map((s) => `<button type="button" class="${my === s ? 'on' : ''}" data-rsvp="${s}" aria-pressed="${my === s}" aria-label="${s}">${ICON[s]}</button>`).join('')}</div>` : ''}
<span class="grow"></span>${ph === 'past' && S.matchNight ? `<button type="button" class="btn sm${e.reportAt ? ' ghost' : ''}" data-report>📋 Session report</button>` : ''}
${S.canManage && ph !== 'past' && ph !== 'cancelled' ? `<button type="button" class="btn sm ghost" data-edit>✏️</button><button type="button" class="btn sm ghost" data-cancel aria-label="Cancel event">🚫</button>` : ''}</footer></article>`;
    }
    function liveBox(e, me) {
      const lineup = e.lineup || {};
      return `<div class="ev-live"><div class="row"><button type="button" class="btn sm${me ? ' on' : ''}" data-checkin>${me ? '🟢 You’re on' : '🟢 I’m on'}</button>
<label class="ev-trial">🧪 Trying a position tonight? <select data-trial><option value="">No</option>${NEED_POS.map((p) => `<option${me?.trial === p ? ' selected' : ''}>${p}</option>`).join('')}</select></label>${S.canManage ? '<span class="grow"></span><button type="button" class="btn sm ghost" data-lineup>🧩 Quick lineup</button>' : ''}</div>
<h4>Who’s on <em>${e.checkins.length}</em></h4>${e.checkins.length ? `<ul class="ev-on">${e.checkins.map((c) => `<li>${UI.member({ id: c.id, n: c.n, a: c.a, sub: [lineup[c.id] && `🧩 ${lineup[c.id]}`, c.trial && `🧪 trying ${c.trial}`].filter(Boolean).join(' · ') }, { size: 26 })}</li>`).join('')}</ul>` : '<p class="muted small">Nobody has checked in yet.</p>'}</div>`;
    }
    function paint() {
      const now = Date.now();
      const upcoming = S.events.filter((e) => phase(e) !== 'past'), past = S.events.filter((e) => phase(e) === 'past').reverse();
      const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
      const byDay = new Map();
      for (const e of upcoming) { const k = dayKey(e.start); (byDay.get(k) ?? byDay.set(k, []).get(k)).push(e); }
      const usual = upcoming.filter((e) => e.usual && !mine(e) && phase(e) === 'soon');
      const n = sel.size;
      el.innerHTML = `<div class="ev-top"><div><h3>🗓️ Schedule</h3><p class="muted small">Times are in your time zone (${esc(MY_TZ.replace(/_/g, ' '))}).</p></div><span class="grow"></span>
${usual.length ? `<button type="button" class="btn sm ghost" data-usual>✨ Yes to ${usual.length} in my usual times</button>` : ''}${S.canManage ? '<button type="button" class="btn sm" data-new>➕ New event</button>' : ''}</div>
<div class="ev-cal" role="list">${days.map((d) => { const k = dayKey(d.getTime()), list = byDay.get(k) ?? []; return `<button type="button" role="listitem" class="ev-day${list.length ? ' has' : ''}${day === k ? ' on' : ''}${k === dayKey(now) ? ' today' : ''}" data-day="${k}"${list.length ? '' : ' disabled'}><small>${d.toLocaleDateString(undefined, { weekday: 'short' })}</small><b>${d.getDate()}</b><span>${list.slice(0, 3).map((e) => `<i class="dot ${mine(e) ? `my-${mine(e)}` : ''}" title="${esc(label(e))}">${TYPES[e.type][0]}</i>`).join('')}</span></button>`; }).join('')}</div>
<div class="bulk card${n ? ' on' : ''}"><span>${n ? `<b>${n}</b> event${n > 1 ? 's' : ''} selected` : 'Tip: tick several events, then answer them all at once'}</span><div class="bulk-btns">${['yes', 'maybe', 'no'].map((s) => `<button type="button" class="btn sm${n ? '' : ' ghost'}" data-bulk="${s}"${n ? '' : ' disabled'}>${ICON[s]} ${s}</button>`).join('')}<button type="button" class="btn ghost sm" data-bulk="clear"${n ? '' : ' disabled'}>Clear</button></div></div>
${upcoming.length ? [...byDay].map(([k, list]) => `<section class="ev-group" id="d-${k}"><h4>${fmtDay(list[0].start)}${k === dayKey(now) ? ' <em>today</em>' : ''}</h4>${list.map(card).join('')}</section>`).join('')
    : UI.empty({ icon: '🗓️', title: 'Nothing scheduled yet', text: S.canManage ? 'Add the first match night with ➕ New event.' : 'Managers post match nights here – you answer ✅ ❔ ❌.' })}
${past.length ? `<details class="ev-past"${showPast ? ' open' : ''}><summary>🕘 Recent <em>${past.length}</em></summary>${past.map(card).join('')}</details>` : ''}`;
      clearInterval(poll);
      if (S.matchNight && upcoming.some((e) => phase(e) === 'live')) poll = setInterval(() => { if (document.visibilityState === 'visible' && el.isConnected) load().catch(() => {}); else if (!el.isConnected) clearInterval(poll); }, 30000);
    }

    async function answer(ids, status) {
      const prev = JSON.parse(JSON.stringify(S));
      for (const e of S.events) if (ids.includes(e.id)) { e.rsvps = e.rsvps.filter((r) => r.id !== ctx.me.u); if (status !== 'clear') e.rsvps.push({ id: ctx.me.u, n: ctx.me.n, a: ctx.me.a, s: status, pos: [] }); }
      paint(); // optimistic
      try { S = await ctx.call('/api/events/rsvp', { ids, status }); paint(); } catch (er) { S = prev; paint(); ctx.toast(er.message, true); }
    }
    async function editor(ev) {
      const w = ev ? wall(ev.start, ev.tz) : (() => { const d = new Date(Date.now() + 86400e3); return { date: dayKey(d.getTime()), time: '20:00' }; })();
      let f = { type: ev?.type ?? 'league', title: ev?.title ?? '', date: w.date, time: w.time, tz: ev?.tz ?? MY_TZ, duration: ev?.duration ?? 120, notes: ev?.notes ?? '', needs: { ...(ev?.needs ?? {}) }, public: ev?.public ?? false, repeat: 0, notify: true };
      const zones = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return [MY_TZ, 'UTC']; } })();
      const targets = !ev && S.canManage ? await ctx.call('/api/events/discord').catch(() => null) : null;
      for (;;) {
        const v = await UI.modal({
          title: ev ? `Edit · ${label(ev)}` : 'New event', icon: '🗓️', wide: true,
          body: `<form class="ev-form" onsubmit="return false">
<div class="ev-types chipset">${Object.entries(TYPES).map(([k, [ic, l]]) => `<label class="chip"><input type="radio" name="type" value="${k}"${f.type === k ? ' checked' : ''}> ${ic} ${l}</label>`).join('')}</div>
<label>Title <small class="muted">(optional – defaults to the type)</small><input name="title" maxlength="80" value="${esc(f.title)}"></label>
<div class="ev-grid"><label>Date<input type="date" name="date" value="${esc(f.date)}" required></label><label>Start<input type="time" name="time" value="${esc(f.time)}" required></label>
<label>Length<select name="duration">${[60, 90, 120, 150, 180, 240, 300].map((m) => `<option value="${m}"${+f.duration === m ? ' selected' : ''}>${m / 60} h</option>`).join('')}</select></label>
<label>Time zone<input name="tz" list="ev-zones" value="${esc(f.tz)}"><datalist id="ev-zones">${zones.map((z) => `<option value="${esc(z)}">`).join('')}</datalist></label></div>
<fieldset class="ev-needs-in"><legend>Positions / numbers needed <small class="muted">(optional)</small></legend><label class="ev-n">👥 Players<input type="number" name="n-players" min="0" max="30" value="${f.needs.players ?? ''}"></label>${NEED_POS.map((p) => `<label class="ev-n">${p}<input type="number" name="n-${p}" min="0" max="11" value="${f.needs[p] ?? ''}"></label>`).join('')}</fieldset>
<label>Notes<textarea name="notes" rows="3" maxlength="1000" placeholder="Lobby host, kit, who's streaming…">${esc(f.notes)}</textarea></label>
<label class="dx-check"><input type="checkbox" name="public"${f.public ? ' checked' : ''}> <span>🌍 Show as “next match night” on the public home page</span></label>
${ev ? '' : `<label>Repeat weekly<select name="repeat">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((r) => `<option value="${r}"${+f.repeat === r ? ' selected' : ''}>${r ? `${r + 1} weeks in total` : 'Just once'}</option>`).join('')}</select></label>
<label class="dx-check"><input type="checkbox" name="notify"${f.notify ? ' checked' : ''}> <span>🔔 Tell members <small class="muted">(bell + Discord DM, per their settings)</small></span></label>
${targets?.ready ? `<label class="dx-check"><input type="checkbox" name="discordOn"${f.discordOn ? ' checked' : ''}> <span>💬 Post it to Discord</span></label><div class="ev-dc"${f.discordOn ? '' : ' hidden'}><label>Channel<select name="channel">${targets.channels.map((c) => `<option value="${esc(c.id)}"${c.id === (f.channel ?? targets.last) ? ' selected' : ''}>${c.news ? '📢' : '#'} ${esc(c.name)}</option>`).join('')}</select></label><label>Ping<select name="role"><option value="">Nobody</option>${targets.roles.map((r) => `<option value="${esc(r.id)}"${r.id === f.role ? ' selected' : ''}>${esc(r.name.startsWith('@') ? r.name : `@${r.name}`)}</option>`).join('')}</select></label></div>` : ''}`}</form>`,
          actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: ev ? '💾 Save' : '🗓️ Schedule', value: 'ok' }],
          onOpen: (d) => {
            const read = () => {
              const fm = $('form', d), val = (n) => fm.elements.namedItem(n);
              f = { ...f, type: $('input[name=type]:checked', d)?.value ?? f.type, title: val('title').value, date: val('date').value, time: val('time').value, tz: val('tz').value.trim(), duration: +val('duration').value, notes: val('notes').value, public: val('public').checked,
                needs: Object.fromEntries(['players', ...NEED_POS].map((p) => [p, +val(`n-${p}`).value || 0]).filter(([, x]) => x > 0)) };
              if (!ev) Object.assign(f, { repeat: +val('repeat').value, notify: val('notify').checked, discordOn: !!val('discordOn')?.checked, channel: val('channel')?.value, role: val('role')?.value });
              const dc = $('.ev-dc', d);
              if (dc) dc.hidden = !f.discordOn;
            };
            d.addEventListener('input', read); d.addEventListener('change', read);
          },
        });
        if (v !== 'ok') return;
        try {
          const r = await ctx.call('/api/events', { id: ev?.id, ...f, discord: f.discordOn ? { channel: f.channel, role: f.role } : undefined });
          S = r; paint();
          ctx.toast(ev ? `Saved${r.notified ? ` · ${r.notified} told about the new time` : ''}` : `Scheduled${r.created > 1 ? ` ${r.created} dates` : ''}${r.notified ? ` · ${r.notified} notified` : ''}`);
          if (r.discord && !r.discord.ok) ctx.toast(`Discord: ${r.discord.error}`, true);
          return;
        } catch (er) { ctx.toast(er.message, true); }
      }
    }
    async function lineupModal(e) {
      let lineup = { ...(e.lineup || {}) };
      const people = [...e.checkins, ...e.rsvps.filter((r) => r.s === 'yes' && !e.checkins.some((c) => c.id === r.id))];
      const v = await UI.modal({
        title: `Quick lineup · ${label(e)}`, icon: '🧩',
        body: people.length ? `<p class="muted small">Checked-in players first. Everyone sees it on the event.</p><div class="ev-lineup">${people.map((p) => `<label>${UI.member({ id: p.id, n: p.n, a: p.a, sub: p.trial ? `🧪 trying ${p.trial}` : e.checkins.some((c) => c.id === p.id) ? '🟢 on' : 'said yes' }, { size: 24, card: false })}<select data-u="${esc(p.id)}"><option value="">–</option>${NEED_POS.map((x) => `<option${lineup[p.id] === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>`).join('')}</div>` : UI.empty({ icon: '🧩', title: 'Nobody to place yet', text: 'Players appear here once they check in or say yes.' }),
        actions: people.length ? [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: 'Save lineup', value: 'ok' }] : undefined,
        onOpen: (d) => d.addEventListener('change', (ev) => { const s = ev.target.closest('[data-u]'); if (s) { if (s.value) lineup[s.dataset.u] = s.value; else delete lineup[s.dataset.u]; } }),
      });
      if (v !== 'ok') return;
      try { S = await ctx.call('/api/events/lineup', { id: e.id, lineup }); paint(); ctx.toast('Lineup saved'); } catch (er) { ctx.toast(er.message, true); }
    }
    async function report(e) {
      let r;
      try { r = await ctx.call(`/api/events/report?id=${e.id}`); } catch (er) { return ctx.toast(er.message, true); }
      const t = r.team, gradeCls = (g) => `g-${String(g ?? 'x').replace('+', 'p')}`;
      const targets = S.canManage ? await ctx.call('/api/events/discord').catch(() => null) : null;
      let share = { channel: targets?.last, role: '' };
      const v = await UI.modal({
        title: `Session report · ${label(e)}`, icon: '📋', wide: true,
        body: `<div class="rp-head"><span class="rp-grade ${gradeCls(t.grade)}">${esc(t.grade ?? '–')}</span><div><b>${fmtDay(e.start)}</b><small>${t.games ? `${t.w}W ${t.d}D ${t.l}L · ${t.gf}–${t.ga}` : 'No results logged for this night yet – League comes from EA, Rush from confirmed logs.'}</small>${r.mvp ? `<small>⭐ Player of the night: <b>${esc(r.mvp.n)}</b> · ${r.mvp.avg}</small>` : ''}</div></div>
${r.results.length ? `<ul class="rp-results">${r.results.map((m) => `<li><span class="res ${m.res}">${m.res}</span> ${m.mode === 'rush' ? '⚡' : '🏆'} <b>${m.gf}–${m.ga}</b> vs ${m.url ? `<a href="${esc(m.url)}">${esc(m.opp)}</a>` : esc(m.opp)}</li>`).join('')}</ul>` : ''}
${r.players.length ? `<div class="tbl"><table class="rp-table"><thead><tr><th>Player</th><th class="n">GP</th><th class="n">G</th><th class="n">A</th><th class="n">Avg</th><th>Grade</th><th>Position trial</th></tr></thead><tbody>${r.players.map((p) => `<tr><td>${p.user ? UI.member({ id: p.user.id, n: p.n, a: p.user.a }, { size: 22 }) : esc(p.n)}${p.motm ? ' ⭐' : ''}</td><td class="n">${p.games}</td><td class="n">${p.g}</td><td class="n">${p.a}</td><td class="n">${p.avg ?? '–'}</td><td><span class="rp-g ${gradeCls(p.grade)}">${esc(p.grade ?? '–')}</span></td><td>${p.trial ? `🧪 ${esc(p.trial.pos)}${p.trial.diff != null ? ` <b class="${p.trial.diff >= 0 ? 'up' : 'down'}">${p.trial.diff >= 0 ? '▲ +' : '▼ '}${p.trial.diff}</b> <small class="muted">vs usual ${p.trial.season}</small>` : ''}` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
<p class="muted small">👥 ${r.attendance.came} checked in · ${r.attendance.saidYes} said yes${r.attendance.noShow.length ? ` · no-shows: ${r.attendance.noShow.map((x) => esc(x.n)).join(', ')}` : ''}${r.attendance.walkIns.length ? ` · walk-ins: ${r.attendance.walkIns.map((x) => esc(x.n)).join(', ')}` : ''}</p>
<p class="muted small">Grades: team = 75 % points per game + 25 % goal difference (like the site’s session cards) · players by average rating (8.5+ A+, 8 A, 7.3 B, 6.7 C, 6 D).</p>
${S.canManage ? `<div class="rp-share"><b>📣 Share it</b> <small class="muted">– everyone who came or said yes gets a notification${targets?.ready ? '; optionally post it to Discord' : ''}.</small>${targets?.ready ? `<div class="ev-grid"><label>Channel<select name="channel"><option value="">Don’t post to Discord</option>${targets.channels.map((c) => `<option value="${esc(c.id)}"${c.id === share.channel ? ' selected' : ''}>${c.news ? '📢' : '#'} ${esc(c.name)}</option>`).join('')}</select></label><label>Ping<select name="role"><option value="">Nobody</option>${targets.roles.map((x) => `<option value="${esc(x.id)}">${esc(x.name.startsWith('@') ? x.name : `@${x.name}`)}</option>`).join('')}</select></label></div>` : ''}${e.reportAt ? `<small class="muted">Shared ${UI.ago(e.reportAt)} already.</small>` : ''}</div>` : ''}`,
        actions: S.canManage ? [{ label: 'Close', value: null, kind: 'ghost' }, { label: '📣 Share report', value: 'share' }] : undefined,
        onOpen: (d) => d.addEventListener('change', () => { share = { channel: $('[name=channel]', d)?.value, role: $('[name=role]', d)?.value }; }),
      });
      if (v !== 'share') return;
      try {
        const res = await ctx.call('/api/events/report/post', { id: e.id, ...share });
        S = res; paint();
        ctx.toast(`Report shared · ${res.notified} notified${res.discord?.ok ? ' · posted to Discord' : ''}`);
        if (res.discord && !res.discord.ok) ctx.toast(`Discord: ${res.discord.error}`, true);
      } catch (er) { ctx.toast(er.message, true); }
    }

    el.addEventListener('change', async (e) => {
      const card = e.target.closest('[data-id]'), ev = card && S.events.find((x) => x.id === +card.dataset.id);
      if (e.target.matches('[data-sel]')) { e.target.checked ? sel.add(ev.id) : sel.delete(ev.id); paint(); }
      if (e.target.matches('[data-trial]') && ev) {
        try { S = await ctx.call('/api/events/checkin', { id: ev.id, on: true, trial: e.target.value || null }); paint(); ctx.toast(e.target.value ? `Trying ${e.target.value} tonight – you’re checked in` : 'Back to your usual position'); } catch (er) { ctx.toast(er.message, true); }
      }
    });
    el.addEventListener('toggle', (e) => { if (e.target.matches('.ev-past')) showPast = e.target.open; }, true);
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b)) return;
      const card = b.closest('[data-id]'), ev = card && S.events.find((x) => x.id === +card.dataset.id), d = b.dataset;
      if (d.new !== undefined) return editor();
      if (d.day) { day = d.day; paint(); $(`#d-${d.day}`, el)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (d.bulk) { const ids = [...sel]; sel = new Set(); answer(ids, d.bulk); return ctx.toast(`${ids.length} event${ids.length > 1 ? 's' : ''} updated`); }
      if (d.usual !== undefined) { const ids = S.events.filter((x) => x.usual && !mine(x) && phase(x) === 'soon').map((x) => x.id); answer(ids, 'yes'); return ctx.toast(`✅ Yes to ${ids.length} – change any of them below`); }
      if (!ev) return;
      if (d.rsvp) answer([ev.id], mine(ev) === d.rsvp ? 'clear' : d.rsvp);
      if (d.edit !== undefined) editor(ev);
      if (d.cancel !== undefined) {
        let reason = '';
        const ok = await UI.modal({ title: `Cancel ${label(ev)}?`, icon: '🚫', body: `<p>${esc(fmtWhen(ev.start))}. Everyone who said yes or maybe gets told.</p><label class="ev-reason">Reason <small class="muted">(optional)</small><input maxlength="200"></label>`, actions: [{ label: 'Keep it', value: false, kind: 'ghost' }, { label: 'Cancel event', value: true, kind: 'danger' }], onOpen: (dl) => dl.addEventListener('input', (x) => { reason = x.target.value; }) });
        if (!ok) return;
        try { const r = await ctx.call('/api/events/cancel', { id: ev.id, reason }); S = r; paint(); ctx.toast(`Cancelled${r.notified ? ` · ${r.notified} told` : ''}`); } catch (er) { ctx.toast(er.message, true); }
      }
      if (d.checkin !== undefined) {
        const on = !ev.checkins.some((c) => c.id === ctx.me.u);
        try { S = await ctx.call('/api/events/checkin', { id: ev.id, on }); paint(); ctx.toast(on ? '🟢 You’re checked in' : 'Checked out'); } catch (er) { ctx.toast(er.message, true); }
      }
      if (d.lineup !== undefined) lineupModal(ev);
      if (d.report !== undefined) report(ev);
    });
    el.innerHTML = UI.skeleton('cards', 3);
    load().then(() => { const t = location.hash.match(/^#schedule-(\d+)$/); if (t) $(`#ev-${t[1]}`, el)?.scrollIntoView({ block: 'center' }); })
      .catch((er) => { el.innerHTML = UI.empty({ icon: '📡', title: 'Could not load the schedule', text: er.message }); });
  }

  // ================= home page strip =================
  async function next(el) {
    try {
      const s = (() => { try { return localStorage.getItem('norex_session'); } catch { return null; } })();
      const r = await fetch(`${MAPI}/api/events/public`, { cache: 'no-store', headers: s ? { Authorization: `Bearer ${s}` } : {} });
      if (!r.ok) return;
      const e = (await r.json()).events?.[0];
      if (!e) return;
      const live = Date.now() > e.start && Date.now() < e.start + e.duration * 60000;
      el.innerHTML = `<a class="ev-next${live ? ' live' : ''}" href="${BASE}members.html#schedule"><span class="ev-next-ic" aria-hidden="true">${TYPES[e.type]?.[0] ?? '🗓️'}</span><span><small>${live ? '🔴 Live now' : 'Next match night'}</small><b>${esc(e.title || TYPES[e.type]?.[1] || 'Match night')}</b><em>${esc(fmtWhen(e.start))} your time${live ? '' : ` · ${until(e.start)}`}</em></span><i aria-hidden="true">→</i></a>`;
      el.hidden = false;
    } catch {}
  }

  // ================= manager portal: squad week by event =================
  function weekTable(events, users, mem) {
    if (!events?.length) return '';
    return `<h3>🗓️ This week’s events</h3><div class="tbl"><table class="grid-week"><thead><tr><th>Member</th>${events.map((e) => `<th data-tip="${esc(label(e))}">${TYPES[e.type][0]} ${esc(new Date(e.start).toLocaleDateString(undefined, { weekday: 'short' }))} ${fmtTime(e.start)}</th>`).join('')}</tr></thead><tbody>
${users.map(([id, u]) => `<tr><td>${mem(id, u)}</td>${events.map((e) => { const s = e.rsvps.find((r) => r.id === id)?.s; return `<td class="c s-${s || 'none'}">${ICON[s] || ''}</td>`; }).join('')}</tr>`).join('')}
<tr class="tot"><td><b>Available</b></td>${events.map((e) => `<td class="c"><b>${e.rsvps.filter((r) => r.s === 'yes').length}</b><small> +${e.rsvps.filter((r) => r.s === 'maybe').length}?</small>${coverage(e).some((c) => c.short) ? '<small class="ev-short" data-tip="Positions or numbers still missing"> ⚠️</small>' : ''}</td>`).join('')}</tr></tbody></table></div><h3 style="margin-top:22px">📅 Days</h3>`;
  }

  window.NXEvents = { schedule, next, weekTable, coverage };
})();
