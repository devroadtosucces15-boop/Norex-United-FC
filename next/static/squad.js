// Hub › Squad Room: five live panels from the member API, each loading on its own (skeleton → land, empty and error states
// with a retry). Three writes: Rush teammate picks, the weekly award vote and a score prediction. Team up ranks with the live site's own NXRecs (recs.js, copied at build). The server decides what each member
// may see: scouting shows a member only their own tips; staff also get the pipeline counts, never applicants' details.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s);
  const mounts = { team: $('#sqteam'), awards: $('#sqawards'), predict: $('#sqpredict'), squads: $('#sqsquads'), scout: $('#sqscout') };
  if (!mounts.team) return;
  const A = window.NorexAuth, M = window.NorexMotion;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const put = (el, html, then) => (M ? M.land(el, html, then) : (el.innerHTML = html, then && then(el)));
  const fit = (el) => setTimeout(() => window.NorexFit?.(el), 60);
  const when = (t) => { try { return new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const day = (t) => { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch { return ''; } };
  const until = (t) => { const m = Math.max(0, Math.round((t - Date.now()) / 60e3)); return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`; };
  const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const ini = (n) => String(n || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  const av = (a, n, s = 34) => a ? `<img class="sq-av" src="${esc(a)}" alt="" width="${s}" height="${s}" loading="lazy" data-ini="${esc(ini(n))}" style="--s:${s}px;--h:${hue(n)}">` : `<span class="sq-av ini" style="--s:${s}px;--h:${hue(n)}" aria-hidden="true">${esc(ini(n))}</span>`;
  // broken Discord avatar → initials bubble
  addEventListener('error', (e) => { const i = e.target; if (!(i instanceof HTMLImageElement) || !i.classList.contains('sq-av')) return; const s = d.createElement('span'); s.className = 'sq-av ini'; s.style.cssText = i.style.cssText; s.textContent = i.dataset.ini || '?'; i.replaceWith(s); }, true);
  const empty = (icon, title, text = '', extra = '') => `<div class="panel sq-empty"><span>${icon}</span><div><b>${title}</b>${text ? `<p class="muted small">${text}</p>` : ''}${extra}</div></div>`;
  const failBox = (k, what, e) => e?.status === 404 && /not available/i.test(e.message)
    ? empty('🌙', `${what} is not switched on yet`, 'The managers turn this on for the squad when it is ready.')
    : empty('📡', `Could not load ${what}`, esc(e?.message || 'The club server did not answer.'), `<button type="button" class="btn ghost" data-sqretry="${k}">↻ Try again</button>`);
  const players = Object.fromEntries((window.NOREX?.players ?? []).map((p) => [p.k, p]));

  if (!window.NOREX_API || !A?.token) { Object.values(mounts).forEach((el) => (el.innerHTML = '<p class="muted small">This loads here for signed-in members.</p>')); return; }
  const staff = A.as === 'owner';
  // The page's only writes: Rush teammate picks, the weekly award vote and a score prediction. Each returns the fresh state.
  const post = (path, body) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const busy = (btn, work) => (M ? M.submit(btn, work) : work());
  const oops = (e) => M?.toast(e.message || 'Could not save that', { kind: 'err' });

  // ---------- 🎯 Team up (/api/recs?mode=league|rush) ----------
  const T = { mode: (() => { try { return localStorage.getItem('norex_mode') === 'rush' ? 'rush' : 'league'; } catch { return 'league'; } })(), only: true, all: false, squad: undefined, d: null, list: [] };
  const teamHtml = () => {
    const { d: r, list } = T, top = Math.max(1, ...list.map((p) => p.score));
    const pool = list.filter((p) => !T.only || p.around), shown = T.all ? pool : pool.slice(0, 10);
    return `<div class="sq-bar"><div class="chips" role="tablist" aria-label="Mode">${[['league', '🏆 League'], ['rush', '⚡ Rush']].map(([k, l]) => `<button type="button" role="tab" class="chip${k === T.mode ? ' on' : ''}" aria-selected="${k === T.mode}" data-tm="${k}">${l}</button>`).join('')}</div>
<label class="sq-only"><input type="checkbox" data-only${T.only ? ' checked' : ''}> Only people who look around today</label></div>
${r.tonight ? `<p class="sq-tonight">📅 <b>${esc(r.tonight.title || (T.mode === 'rush' ? 'Rush session' : 'Match night'))}</b> · ${when(r.tonight.start)} · answers and check-ins count</p>` : ''}
${r.me.pos?.length ? '' : '<p class="muted small sq-hint">💡 Add your positions in My profile on the live Hub and the list starts weighing who fits next to you.</p>'}
${shown.length ? `<ol class="sq-list">${shown.map((p, i) => `<li class="sq-p"><span class="sq-rank num">${i + 1}</span>${av(p.a, p.n)}<div class="sq-main"><b class="fit">${esc(p.n)}</b><small class="muted">${esc((p.pos ?? []).join(' / ') || 'No positions set')}${p.playerName ? ` · ${esc(p.playerName)}` : ''}</small>
<div class="sq-why">${p.why.map((w) => `<span class="sq-chip ${w.tone}">${w.icon} ${esc(w.text)}</span>`).join('') || '<span class="muted small">Not much to go on yet</span>'}</div></div>
<div class="sq-side"><span class="sq-bar-m" aria-hidden="true"><i style="width:${Math.max(4, (Math.max(0, p.score) / top) * 100)}%"></i></span><a class="btn ghost sm" href="https://discord.com/users/${encodeURIComponent(p.id)}" target="_blank" rel="noopener">💬 Invite</a></div></li>`).join('')}</ol>
${pool.length > 10 ? `<button type="button" class="btn ghost" data-tall>${T.all ? 'Show the top 10' : `Show all ${pool.length}`}</button>` : ''}`
      : empty('🌙', 'Nobody looks around yet', 'Untick the filter to see everyone, or check back once people answer tonight’s event.')}
<p class="muted tiny" style="margin-top:10px">${list.length} member${list.length === 1 ? '' : 's'} ranked. Your own Rush picks count; other members’ picks stay private.</p>`;
  };
  const loadTeam = async (land = true) => {
    const el = mounts.team; if (land) M?.skeleton(el, 5);
    try {
      const sqP = T.mode === 'league' && T.squad === undefined ? fetch('../api/squad.json').then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(T.squad);
      const [r, sq] = await Promise.all([A.call(`/api/recs?mode=${T.mode}`), sqP]);
      if (T.mode === 'league') T.squad = sq;
      const R = window.NXRecs, together = T.mode === 'rush' ? r.together : R ? R.pairs(T.squad, r.me.player) : {};
      T.d = r; T.list = R ? R.rank(r.me, r.people, { now: Date.now(), together }) : r.people.map((p) => ({ ...p, score: 0, why: [], around: true }));
      if (!T.list.some((p) => p.around)) T.only = false;
      put(el, teamHtml(), fit);
    } catch (e) { el.removeAttribute('aria-busy'); el.innerHTML = failBox('team', 'Team up', e); }
  };
  mounts.team.addEventListener('click', (e) => {
    const m = e.target.closest('[data-tm]'); if (m && m.dataset.tm !== T.mode) { T.mode = m.dataset.tm; T.all = false; try { localStorage.setItem('norex_mode', T.mode); } catch {} loadTeam(); return; }
    if (e.target.closest('[data-tall]')) { T.all = !T.all; mounts.team.innerHTML = teamHtml(); fit(mounts.team); }
  });
  mounts.team.addEventListener('change', (e) => { if (e.target.matches('[data-only]')) { T.only = e.target.checked; mounts.team.innerHTML = teamHtml(); fit(mounts.team); } });

  // ---------- 🏆 Awards (/api/awards) ----------
  let W = null, wOpen = null;
  const name = (k) => W?.nominees?.find((n) => n.k === k)?.n || players[k]?.n || k;
  const pickBox = () => {
    const c = W.categories.find((x) => x.id === wOpen); if (!c) return '';
    const fits = W.nominees.filter((n) => c.grp === 'any' || !c.grp || n.grp === c.grp), list = fits.length ? fits : W.nominees, pick = W.my[c.id];
    return `<div class="sq-pickbox mx-pop" role="group" aria-label="${esc(c.name)} nominees"><div class="sq-pbh"><b>${esc(c.icon || '🏆')} ${esc(c.name)}</b><small class="muted">Tap a player. You can change your vote until the ballot closes.</small><button type="button" class="sq-x" data-cat="${c.id}" aria-label="Close">✕</button></div>
<div class="sq-noms">${list.map((n) => { const self = n.k === A.player; return `<button type="button" class="sq-nom${n.k === pick ? ' on' : ''}" data-vote="${esc(n.k)}"${self ? ' disabled title="No voting for yourself"' : ''}><b class="fit">${esc(n.n)}</b><small class="muted">${esc(n.pos || '')}${n.played ? ' · <span class="sq-dot">●</span> played this week' : ''}${self ? ' · you' : ''}</small></button>`; }).join('')}</div>
${pick ? '<button type="button" class="btn ghost sm" data-unvote>↩ Take my vote back</button>' : ''}</div>`;
  };
  const awardsHtml = () => {
    const open = !W.closed && Date.now() < W.closes, voted = W.categories.filter((c) => W.my[c.id]).length;
    return `<div class="sq-head"><div><b class="sq-big">${open ? `Voting closes in ${until(W.closes)}` : 'Voting is closed this week'}</b><small class="muted">${esc(W.week)} · ${W.voters} member${W.voters === 1 ? ' has' : 's have'} voted${open ? ` · you voted in ${voted} of ${W.categories.length}` : ' · the next ballot opens Monday'}</small></div>${open ? `<span class="sq-ring" style="--p:${W.categories.length ? Math.round((voted / W.categories.length) * 100) : 0}" aria-label="${voted} of ${W.categories.length} voted"><b class="num">${voted}/${W.categories.length}</b></span>` : ''}</div>
<div class="sq-cats">${W.categories.map((c) => { const pick = W.my[c.id], tag = open ? 'button' : 'div'; return `<${tag}${open ? ` type="button" data-cat="${c.id}" aria-expanded="${wOpen === c.id}"` : ''} class="sq-cat${pick ? ' done' : ''}${wOpen === c.id ? ' on' : ''}"><span class="sq-ci">${esc(c.icon || '🏆')}</span><div><b class="fit">${esc(c.name)}</b><small class="muted">${pick ? `Your vote: <b class="gold-t">${esc(name(pick))}</b>` : open ? 'Not voted yet' : 'No vote'}${c.grp && c.grp !== 'any' ? ` · ${esc(c.grp)}` : ''}</small></div>${pick ? '<span class="sq-tick" aria-hidden="true">✓</span>' : open ? '<span class="sq-go" aria-hidden="true">Vote ›</span>' : ''}</${tag}>`; }).join('') || '<p class="muted small">No vote categories this week.</p>'}</div>
${open && wOpen != null ? pickBox() : ''}
<div class="sq-stats"><div class="tiny muted" style="letter-spacing:.08em">DECIDED BY THE NUMBERS</div>${W.stats.map((s) => `<span class="pill s" title="${esc(s.how)}">${esc(s.icon)} ${esc(s.name)}</span>`).join('')}</div>
${W.last?.winners?.length ? `<h3 class="sq-sub">Last week · ${esc(W.last.week)}</h3><div class="sq-wins">${W.last.winners.filter((w) => w.k).map((w) => `<div class="sq-win${w.stat ? ' stat' : ''}"><span>${esc(w.icon)}</span><small class="muted fit">${esc(w.name)}</small><b class="fit">${esc(w.n || name(w.k))}</b>${w.value != null && w.value !== '' ? `<small class="num muted">${esc(w.value)}</small>` : ''}</div>`).join('')}</div>` : '<p class="muted small" style="margin-top:12px">No winners yet. The first results land here after Sunday’s close.</p>'}`;
  };
  mounts.awards.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-cat]');
    if (c) { const id = Number(c.dataset.cat); wOpen = wOpen === id ? null : id; mounts.awards.innerHTML = awardsHtml(); fit(mounts.awards); return; }
    const v = e.target.closest('[data-vote],[data-unvote]'); if (!v || wOpen == null || v.disabled) return;
    const cat = wOpen, player = v.dataset.vote ?? null;
    if (player && W.my[cat] === player) return;
    try {
      W = await busy(v, () => post('/api/awards/vote', { category: cat, player }));
      wOpen = null; mounts.awards.innerHTML = awardsHtml(); fit(mounts.awards);
      const card = mounts.awards.querySelector(`[data-cat="${cat}"]`); card?.classList.add('mx-pop'); M?.pulse(card?.querySelector('.sq-tick'));
      M?.toast(player ? `Vote saved: ${name(player)}` : 'Vote taken back', { kind: 'ok' });
    } catch (er) { oops(er); }
  });
  const loadAwards = () => { const el = mounts.awards; M?.skeleton(el, 4); A.call('/api/awards').then((r) => { W = r; put(el, awardsHtml(), fit); }).catch((e) => { el.removeAttribute('aria-busy'); el.innerHTML = failBox('awards', 'the awards', e); }); };

  // ---------- 🔮 Predictions (/api/predict) ----------
  let P = null, board = 'month';
  const draft = {}; // event id → { gf, ga } being set on the steppers
  const score = (x) => (x ? `<b class="num">${x.gf}–${x.ga}</b>` : '<span class="muted">No pick</span>');
  const ptsPill = (n) => (n == null ? '' : `<span class="pill ${n === 3 ? 'w' : n ? 's' : ''}">${n === 3 ? '🎯 ' : ''}${n} pt${n === 1 ? '' : 's'}</span>`);
  const modePill = (m) => `<span class="pill">${m === 'rush' ? '⚡ Rush' : '🏆 League'}</span>`;
  const stepper = (n) => {
    const v = draft[n.id] ??= { gf: n.mine?.gf ?? 0, ga: n.mine?.ga ?? 0 }, same = n.mine && n.mine.gf === v.gf && n.mine.ga === v.ga;
    const side = (k, l) => `<div class="sq-st"><small class="muted">${l}</small><div><button type="button" data-st="${n.id}:${k}:-1" aria-label="${l} minus one"${v[k] <= 0 ? ' disabled' : ''}>−</button><b class="num" data-sv="${n.id}:${k}">${v[k]}</b><button type="button" data-st="${n.id}:${k}:1" aria-label="${l} plus one"${v[k] >= 20 ? ' disabled' : ''}>+</button></div></div>`;
    return `<div class="sq-stepw" data-sw="${n.id}"><div class="sq-step">${side('gf', 'NOREX')}<span class="sq-dash">–</span>${side('ga', 'Them')}</div><div class="sq-acts"><button type="button" class="btn sm" data-psave="${n.id}"${same ? ' disabled' : ''}>${n.mine ? '💾 Update pick' : '🔮 Save pick'}</button>${n.mine ? `<button type="button" class="btn ghost sm" data-pdel="${n.id}">↩ Take back</button>` : ''}</div></div>`;
  };
  const predictHtml = () => {
    const rows = P.boards[board] ?? [];
    return `${P.open.length ? `<div class="sq-nights">${P.open.map((n) => `<div class="sq-night"><div class="sq-nt">${modePill(n.mode)}<small class="muted">Kick-off in ${until(n.start)}</small></div><b class="fit">${esc(n.title || 'Match night')}</b><small class="muted">${when(n.start)}</small><div class="sq-pick">${n.mine ? `Your pick ${score(n.mine)}` : '<span class="muted">You have not picked yet</span>'}</div>${stepper(n)}<small class="muted">${n.count} member${n.count === 1 ? '' : 's'} picked</small></div>`).join('')}</div>`
      : empty('🗓️', 'No match night to predict', 'Predictions open when the managers schedule a League or Rush night in the next three weeks.')}
${P.locked.length ? `<h3 class="sq-sub">🔒 Locked · waiting for the result</h3>${P.locked.map((n) => `<div class="sq-row"><div><b>${esc(n.title || 'Match night')}</b><small class="muted"> · ${day(n.start)}</small></div><div class="sq-picks">${n.picks.map((p) => `<span class="sq-chip meh" title="${esc(p.n)}">${esc(p.n)} ${p.gf}–${p.ga}</span>`).join('')}</div></div>`).join('')}` : ''}
${P.recent.length ? `<h3 class="sq-sub">Recent nights</h3>${P.recent.slice(0, 4).map((n) => `<div class="sq-row"><div><b>${esc(n.title || 'Match night')}</b><small class="muted"> · ${day(n.start)}</small></div><div class="sq-res">${n.result.status === 'void' ? '<span class="muted small">Void, no match played</span>' : `<span class="num sq-sc">${n.result.gf}–${n.result.ga}</span>${n.result.opp ? `<small class="muted fit">vs ${esc(n.result.opp)}</small>` : ''}`}<span class="muted small">You ${score(n.mine)}</span>${ptsPill(n.mine?.points)}</div></div>`).join('')}` : ''}
<h3 class="sq-sub">Table</h3><div class="chips" role="tablist" aria-label="Period">${[['month', 'This month'], ['season', `Season ${esc(P.boards.seasonLabel || '')}`], ['all', 'All time']].map(([k, l]) => `<button type="button" role="tab" class="chip${k === board ? ' on' : ''}" aria-selected="${k === board}" data-pb="${k}">${l}</button>`).join('')}</div>
${rows.length ? `<ol class="sq-table">${rows.slice(0, 8).map((r, i) => `<li${r.id === A.session?.u ? ' class="me"' : ''}><span class="num sq-rank">${i + 1}</span>${av(r.a, r.n, 26)}<b class="fit">${esc(r.n)}</b><small class="muted">${r.exact} exact · ${r.played} night${r.played === 1 ? '' : 's'}</small><b class="num gold-t">${r.pts}</b></li>`).join('')}</ol>` : '<p class="muted small" style="margin-top:10px">No points scored in this period yet.</p>'}`;
  };
  const loadPredict = () => { const el = mounts.predict; M?.skeleton(el, 4); A.call('/api/predict').then((r) => { P = r; put(el, predictHtml(), fit); }).catch((e) => { el.removeAttribute('aria-busy'); el.innerHTML = failBox('predict', 'predictions', e); }); };
  const repaint = () => { mounts.predict.innerHTML = predictHtml(); fit(mounts.predict); };
  mounts.predict.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pb]'); if (b) { if (b.dataset.pb !== board) { board = b.dataset.pb; repaint(); } return; }
    const st = e.target.closest('[data-st]');
    if (st) { const [id, k, by] = st.dataset.st.split(':'), v = draft[id]; v[k] = Math.max(0, Math.min(20, v[k] + Number(by)));
      const n = P.open.find((x) => String(x.id) === id), box = st.closest('.sq-stepw'); box.outerHTML = stepper(n);
      const nb = mounts.predict.querySelector(`[data-sw="${id}"]`); M?.pulse(nb.querySelector(`[data-sv="${id}:${k}"]`)); (nb.querySelector(`[data-st="${id}:${k}:${by}"]:not([disabled])`) || nb.querySelector('[data-psave]'))?.focus(); return; }
    const sv = e.target.closest('[data-psave],[data-pdel]'); if (!sv) return;
    const id = Number(sv.dataset.psave ?? sv.dataset.pdel), del = sv.hasAttribute('data-pdel'), v = draft[id];
    try {
      P = await busy(sv, () => post('/api/predict', del ? { event: id, gf: null } : { event: id, gf: v.gf, ga: v.ga }));
      if (del) delete draft[id];
      repaint(); M?.toast(del ? 'Prediction taken back' : `Pick saved: NOREX ${v.gf}–${v.ga}`, { kind: 'ok' });
    } catch (er) { oops(er); }
  });

  // ---------- 🤝 Rush squads (/api/squads) ----------
  let S = null, edit = null; // edit = the picks list being changed (ids, best first)
  const editor = (who, nm, me) => {
    const rest = S.candidates.filter((c) => c.id !== me && !edit.includes(c.id));
    return `<div class="sq-prefs edit"><div class="sq-pbh"><b>Your teammate picks</b><small class="muted">${edit.length} of 10 · best first. Only you and the managers see this list.</small></div>
${edit.length ? `<ol>${edit.map((id, i) => `<li>${av(who[id]?.a, nm(id), 22)}<span class="fit">${esc(nm(id))}</span><span class="sq-ord"><button type="button" data-pm="${i}:-1" aria-label="Move ${esc(nm(id))} up"${i ? '' : ' disabled'}>↑</button><button type="button" data-pm="${i}:1" aria-label="Move ${esc(nm(id))} down"${i < edit.length - 1 ? '' : ' disabled'}>↓</button><button type="button" data-px="${i}" aria-label="Remove ${esc(nm(id))}">✕</button></span></li>`).join('')}</ol>` : '<p class="muted small">Tap players below to add them.</p>'}
${rest.length ? `<div class="sq-cands">${rest.map((c) => `<button type="button" class="chip" data-padd="${esc(c.id)}"${edit.length >= 10 ? ' disabled' : ''}>＋ ${esc(c.n)} <small class="muted">${esc((c.pos || []).join('/'))}</small></button>`).join('')}</div>` : ''}
<div class="sq-acts"><button type="button" class="btn gold sm" data-psv>💾 Save picks</button><button type="button" class="btn ghost sm" data-pcancel>Cancel</button></div></div>`;
  };
  const squadsHtml = () => {
    const who = Object.fromEntries(S.candidates.map((c) => [c.id, c])), nm = (id) => who[id]?.n || 'Former member', pub = S.published, me = A.session?.u;
    const mine = S.me.unlocked
      ? edit ? editor(who, nm, me) : `<div class="sq-prefs"><div class="sq-pbh"><b>Your teammate picks</b><button type="button" class="btn ghost sm" data-pedit>✏️ ${S.me.prefs.length ? 'Change' : 'Pick teammates'}</button></div>${S.me.prefs.length ? `<ol>${S.me.prefs.map((id) => `<li>${av(who[id]?.a, nm(id), 22)}<span class="fit">${esc(nm(id))}</span></li>`).join('')}</ol>` : '<p class="muted small">You have not picked anyone yet. Up to ten teammates, best first.</p>'}</div>`
      : `<div class="sq-prefs locked"><b>🔒 Teammate picks</b><p class="muted small">${S.me.reason === 'positions' ? 'Set your Rush positions (1st to 3rd) in My profile on the live Hub, then pick who you play best with.' : 'Link your Discord to your club player first. Rush squads are for verified players.'}</p></div>`;
    return `${pub ? `<div class="sq-head"><div><b class="sq-big fit">${esc(pub.title)}</b><small class="muted">Published ${day(pub.publishedAt || pub.at)}${pub.by ? ` by ${esc(pub.by)}` : ''} · ${pub.squads.length} squad${pub.squads.length === 1 ? '' : 's'}</small></div></div>
<div class="sq-squads">${pub.squads.map((s, i) => `<div class="sq-squad${s.ids.includes(me) ? ' mine' : ''}"><div class="sq-sqh"><b>Squad ${i + 1}</b>${s.ids.includes(me) ? '<span class="pill s">You</span>' : ''}<span class="sq-chem"><i style="width:${Math.max(0, Math.min(100, s.chemistry))}%"></i></span><small class="num">${s.chemistry}/100</small></div>${s.ids.map((id) => `<div class="sq-mem${id === me ? ' me' : ''}"><span class="sq-role">${esc(s.roles?.[id] === 'FLEX' ? 'FLX' : s.roles?.[id] || '–')}</span>${av(who[id]?.a, nm(id), 24)}<span class="fit">${esc(nm(id))}</span></div>`).join('')}<div class="sq-mem ai"><span class="sq-role">GK</span><span class="muted small">AI keeper</span></div>${s.missing?.length ? `<small class="muted">Missing: ${esc(s.missing.join(', '))}</small>` : ''}</div>`).join('')}</div>
${pub.bench?.length ? `<p class="muted small" style="margin-top:10px">🪑 Bench: ${pub.bench.map((id) => esc(nm(id))).join(', ')}</p>` : ''}` : empty('🤝', 'No squads published yet', 'When the managers publish Rush squads, yours shows here with your role and chemistry.')}
<div class="sq-foot">${mine}<p class="muted small">${S.candidates.length} verified player${S.candidates.length === 1 ? '' : 's'} with Rush positions can be picked.</p></div>`;
  };
  mounts.squads.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    const redraw = () => { mounts.squads.innerHTML = squadsHtml(); fit(mounts.squads); };
    if (t.hasAttribute('data-pedit')) { edit = [...S.me.prefs]; redraw(); return; }
    if (t.hasAttribute('data-pcancel')) { edit = null; redraw(); return; }
    if (t.dataset.padd) { if (edit.length < 10) edit.push(t.dataset.padd); redraw(); return; }
    if (t.dataset.px != null) { edit.splice(Number(t.dataset.px), 1); redraw(); return; }
    if (t.dataset.pm) { const [i, by] = t.dataset.pm.split(':').map(Number), j = i + by; [edit[i], edit[j]] = [edit[j], edit[i]]; redraw(); mounts.squads.querySelector(`[data-pm="${j}:${by}"]`)?.focus(); return; }
    if (t.hasAttribute('data-psv')) {
      try { S = await busy(t, () => post('/api/squads/prefs', { ids: edit })); edit = null; redraw(); M?.pulse(mounts.squads.querySelector('.sq-prefs')); M?.toast('Teammate picks saved', { kind: 'ok' }); } catch (er) { oops(er); }
    }
  });
  const loadSquads = () => { const el = mounts.squads; M?.skeleton(el, 4); A.call('/api/squads').then((r) => { S = r; put(el, squadsHtml(), fit); }).catch((e) => { el.removeAttribute('aria-busy'); el.innerHTML = failBox('squads', 'Rush squads', e); }); };

  // ---------- 🔭 Scouting (/api/scout, staff also /api/trials counts) ----------
  const STAGE = { recommended: ['🔭', 'Tip received'], applied: ['📝', 'Applied'], booked: ['📅', 'Trial booked'], trialling: ['🎮', 'Trialling'], played: ['✅', 'Trial played'], signed: ['✍️', 'Signed'], released: ['👋', 'Released'], declined: ['✖️', 'Declined'] };
  const FUNNEL = ['recommended', 'applied', 'booked', 'trialling', 'played', 'signed'];
  const scoutHtml = (mine, trials) => {
    const counts = trials && FUNNEL.map((k) => [k, trials.filter((t) => t.status === k).length]), max = counts ? Math.max(1, ...counts.map((c) => c[1])) : 1;
    return `${mine.length ? `<div class="sq-tips">${mine.map((t) => `<div class="sq-tip"><div><b class="fit">${esc(t.ea)}</b><small class="muted">${esc([t.platform, (t.positions || []).join('/')].filter(Boolean).join(' · '))} · ${day(t.at)}</small>${t.note ? `<p class="small">“${esc(t.note)}”</p>` : ''}</div><span class="pill ${t.status === 'signed' ? 'w' : ['released', 'declined'].includes(t.status) ? 'l' : 's'}">${STAGE[t.status]?.[0] ?? '•'} ${esc(STAGE[t.status]?.[1] ?? t.status)}</span></div>`).join('')}</div>`
      : empty('🔭', 'No tips from you yet', 'Know a player who would fit NOREX? Recommend them in the live Hub and follow their trial here.')}
<p class="muted tiny" style="margin-top:8px">Your tips stay between you and the managers.</p>
${counts ? `<h3 class="sq-sub">🛡️ Staff · trials pipeline</h3><div class="sq-funnel">${counts.map(([k, n]) => `<div><span>${STAGE[k][0]}</span><small class="muted">${STAGE[k][1]}</small><i style="--w:${(n / max) * 100}%"></i><b class="num">${n}</b></div>`).join('')}</div><p class="muted tiny">Counts only. Names and contact details stay in the Dugout.</p>` : ''}`;
  };
  const loadScout = () => {
    const el = mounts.scout; M?.skeleton(el, 3);
    Promise.all([A.call('/api/scout'), staff ? A.call('/api/trials').then((r) => r.trials).catch(() => null) : null])
      .then(([r, t]) => put(el, scoutHtml(r.recs || [], t), fit)).catch((e) => { el.removeAttribute('aria-busy'); el.innerHTML = failBox('scout', 'your scouting tips', e); });
  };

  const LOAD = { team: loadTeam, awards: loadAwards, predict: loadPredict, squads: loadSquads, scout: loadScout };
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-sqretry]'); if (b) LOAD[b.dataset.sqretry]?.(); });
  (A.ready || Promise.resolve()).then(() => Object.values(LOAD).forEach((f) => f()));
})();
