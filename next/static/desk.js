// Staff › Desk (Phase C3): the manager portal's work queues on the live routes.
//   Claims  – GET /api/admin/overview (claims), POST /api/admin/claims {user, action: approve|reject|unlink}
//   Rush    – GET /api/rush/queue, POST /api/rush/decide {id, action: confirm|reject|remove}
//   Trials  – GET /api/trials, POST /api/trials/update {id, status|player}, /api/trials/add
//   Notes   – GET /api/notes, POST /api/notes {kind, subject, text, tag}, /api/notes/delete
//   Members – users from GET /api/admin/overview, GET /api/admin/member/:id (activity log), POST /api/admin/warn {user, reason}, /api/admin/mute {user, hours}
//   Requests – GET /api/admin/requests, POST /api/admin/requests/decide {id, action: approve|reject|undo, reason, clubId} (flag requests)
(() => {
  const d = document, root = d.getElementById('dkLive'); if (!root) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const call = (path, body) => (body ? A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) : A.call(path));
  const toast = (m, err) => M?.toast ? M.toast(m, err ? { kind: 'err' } : { kind: 'ok' }) : console.log(m);
  const flagOn = (f) => (A.features || []).includes(f);
  const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 90 ? 'just now' : s < 5400 ? Math.round(s / 60) + ' min ago' : s < 129600 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
  const FUNNEL = [['applied', '📨 Applied'], ['booked', '📅 Booked'], ['trialling', '⚽ On trial'], ['played', '🏁 Played'], ['signed', '✍️ Signed']];
  const NEXT = { recommended: 'applied', applied: 'booked', booked: 'trialling', trialling: 'played', played: 'signed' };
  const TAGS = [['general', '📝 General'], ['strength', '💪 Strength'], ['issue', '⚠️ Issue'], ['trial', '🧭 Trial']];
  const S = { tab: 'claims', users: null, reqs: null, mq: '', mf: 'all', openUser: null, logs: {}, warnFor: null, muteFor: null, rq: null, claims: null, rush: null, trials: null, notes: null, canNotes: false, openTrial: null, err: {} };
  const empty = (icon, title, text) => `<div class="panel sq-empty"><span>${icon}</span><div><b>${esc(title)}</b><p class="muted small">${esc(text || '')}</p></div></div>`;
  const av = (u) => u?.a ? `<img class="dg-av" src="${esc(u.a)}" alt="" loading="lazy">` : `<span class="dg-av dg-ini">${esc((u?.n || '?')[0].toUpperCase())}</span>`;

  const pendingClaims = () => Object.entries(S.claims || {}).filter(([, c]) => c.status === 'pending').sort((a, b) => a[1].at - b[1].at);
  const counts = () => ({ claims: pendingClaims().length, rush: S.rush?.pending?.length ?? 0, trials: (S.trials || []).filter((t) => ['recommended', 'applied'].includes(t.status)).length, notes: S.notes?.length ?? 0, requests: (S.reqs || []).filter((r) => r.status === 'pending').length });

  function claims() {
    if (!S.claims) return S.err.claims ? empty('⚠️', 'Could not load claims', S.err.claims) : '<div class="dg-skel"><i></i></div>';
    const p = pendingClaims(), recent = Object.entries(S.claims).filter(([, c]) => c.status !== 'pending' && c.decidedAt).sort((a, b) => b[1].decidedAt - a[1].decidedAt).slice(0, 8);
    const pl = (k) => (window.NOREX?.players || []).find((x) => x.k === k);
    return `${p.length ? `<div class="dk-grid">${p.map(([u, c]) => { const x = pl(c.player), checks = [[!c.taken, c.taken ? `${c.taken} already owns this player` : 'Nobody else owns this player'], [!!x, x ? `Found in the club: ${x.gp ?? '?'} games, rated ${x.rating ? Number(x.rating).toFixed(1) : '–'}` : 'Not on the club list yet']];
      return `<article class="panel dk-card"><div class="dk-who">${av(c)}<div><b>${esc(c.n)}</b><small>Discord · asked ${esc(ago(c.at))}</small></div></div><p class="small">claims <b class="dk-gt">${esc(c.playerName)}</b></p><ul class="dg-ready">${checks.map(([ok, t]) => `<li class="${ok ? 'ok' : 'bad'}">${ok ? '✔' : '✖'} ${esc(t)}</li>`).join('')}</ul><div class="dk-btns"><button class="chip danger" data-claim="reject" data-u="${esc(u)}">✗ Reject</button><button class="btn" data-claim="approve" data-u="${esc(u)}"${c.taken ? ' disabled' : ''}>✓ Approve</button></div></article>`; }).join('')}</div>` : empty('🎉', 'No claims waiting', 'New player claims land here.')}
${recent.length ? `<h4 class="dk-h">Recently decided</h4><ul class="dk-log">${recent.map(([u, c]) => `<li><span>${c.status === 'approved' ? '✅' : c.status === 'rejected' ? '❌' : '↩️'} <b>${esc(c.n)}</b> → ${esc(c.playerName)}</span><small>${esc(c.status)} by ${esc(c.decidedBy || '?')} · ${esc(ago(c.decidedAt))}</small>${c.status === 'approved' ? `<button class="chip" data-claim="unlink" data-u="${esc(u)}">Unlink</button>` : ''}</li>`).join('')}</ul>` : ''}`;
  }
  function rush() {
    if (!S.rush) return S.err.rush ? empty('⚠️', 'Could not load Rush results', S.err.rush) : '<div class="dg-skel"><i></i></div>';
    const R = S.rush, card = (m, pending) => `<article class="panel dk-card"><div class="dk-score ${m.res}"><b>${m.gf}–${m.ga}</b><span>vs ${esc(m.opp)} · ${esc(m.date)}</span></div><p class="muted small">Logged by ${esc(m.by?.n)} ${esc(ago(m.at))}${m.note ? ` · “${esc(m.note)}”` : ''}</p>
<ul class="dk-pl">${(m.players || []).map((p) => `<li><b>${esc(p.n)}</b> <em>${esc(p.pos || '')}</em> ${p.g ? `⚽${p.g}` : ''}${p.a ? ` 🅰️${p.a}` : ''}${p.r ? ` ⭐${p.r}` : ''}${p.motm ? ' 🏅' : ''}</li>`).join('')}</ul>
${m.shot ? `<a class="small" href="${esc(m.shot)}" target="_blank" rel="noopener">📷 Screenshot</a>` : ''}
${pending ? `<div class="dk-btns"><button class="chip danger" data-rush="reject" data-id="${m.id}">✗ Reject</button><button class="btn" data-rush="confirm" data-id="${m.id}">✓ Confirm</button></div>` : `<div class="dk-btns"><small class="muted">${esc(m.status)} by ${esc(m.decidedBy || '?')}</small>${m.status === 'confirmed' ? `<button class="chip" data-rush="remove" data-id="${m.id}">Remove</button>` : `<button class="chip" data-rush="confirm" data-id="${m.id}">Confirm after all</button>`}</div>`}</article>`;
    return `${R.pending.length ? `<div class="dk-grid">${R.pending.map((m) => card(m, true)).join('')}</div>` : empty('🎉', 'No Rush results waiting', 'Results members log in Match Night appear here to be confirmed.')}
${R.recent.length ? `<h4 class="dk-h">Last 30 days</h4><div class="dk-grid">${R.recent.slice(0, 6).map((m) => card(m, false)).join('')}</div>` : ''}`;
  }
  function trials() {
    if (!flagOn('trials')) return empty('🧭', 'Trials are switched off', 'The trials flag is off for your account.');
    if (!S.trials) return S.err.trials ? empty('⚠️', 'Could not load trials', S.err.trials) : '<div class="dg-skel"><i></i></div>';
    const by = (st) => S.trials.filter((t) => st === 'applied' ? ['recommended', 'applied'].includes(t.status) : t.status === st);
    return `<div class="dk-funnel">${FUNNEL.map(([st, lab]) => `<section class="dk-col"><h4>${lab} <span>${by(st).length}</span></h4>${by(st).map((t) => `<article class="panel dk-trial${S.openTrial === t.id ? ' open' : ''}"><div class="dk-tt"><b>${esc(t.ea)}</b><small>${esc((t.positions || []).join('/'))} · ${esc(t.platform || '')}${t.status === 'recommended' ? ' · tip' : ''}</small></div>${t.note ? `<p class="muted tiny">${esc(String(t.note).slice(0, 120))}</p>` : ''}
<div class="dk-btns">${NEXT[t.status] ? `<button class="chip" data-tr="${NEXT[t.status]}" data-id="${t.id}">→ ${esc(FUNNEL.find(([k]) => k === NEXT[t.status])?.[1] || NEXT[t.status])}</button>` : ''}${['signed', 'released', 'declined'].includes(t.status) ? '' : `<button class="chip danger" data-tr="declined" data-id="${t.id}">Decline</button>`}<button class="chip" data-open="${t.id}">📝 ${(t.notes || []).length}</button></div>
${S.openTrial === t.id ? `<div class="dk-notes">${(t.notes || []).map((n) => `<p><b>${esc(n.by.n)}</b> ${esc(ago(n.at))}<br>${esc(n.text)}</p>`).join('') || '<p class="muted tiny">No notes yet.</p>'}<form data-note-form data-kind="trial" data-subject="${t.id}"><input name="text" maxlength="1000" placeholder="Add a note…" required><button class="chip" type="submit">Add</button></form></div>` : ''}</article>`).join('') || '<p class="muted tiny">–</p>'}</section>`).join('')}</div>
${by('signed').length + S.trials.filter((t) => ['released', 'declined'].includes(t.status)).length ? '' : ''}`;
  }
  function notes() {
    if (!S.notes) return S.err.notes ? empty('⚠️', 'Could not load notes', S.err.notes) : '<div class="dg-skel"><i></i></div>';
    const players = window.NOREX?.players || [];
    return `<form class="panel dk-nf" data-note-form data-kind="player"><h4 class="dk-h" style="margin:0">Add a private note about a player</h4><div class="dk-row"><select name="subject" aria-label="Player">${players.map((p) => `<option value="${esc(p.k)}">${esc(p.n)}</option>`).join('')}</select><select name="tag" aria-label="Tag">${TAGS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div><textarea name="text" maxlength="1000" rows="2" placeholder="Only managers and the owner can read this" required></textarea><button class="btn" type="submit">Save note</button></form>
${S.notes.length ? `<ul class="dk-log dk-notelist">${S.notes.map((n) => `<li><span><b>${esc(n.kind === 'player' ? (players.find((p) => p.k === n.subject)?.n || n.subject) : n.kind === 'trial' ? `Trial #${n.subject}` : n.subject)}</b> · ${esc(TAGS.find(([k]) => k === n.tag)?.[1] || n.tag)}<br>${esc(n.text)}</span><small>${esc(n.by.n)} · ${esc(ago(n.at))}</small>${n.mine ? `<button class="chip" data-delnote="${n.id}">Delete</button>` : ''}</li>`).join('')}</ul>` : empty('📝', 'No notes yet', 'Notes are private to managers and the owner.')}`;
  }

  const ROLE = { owner: ['👑 Owner', 'gold'], manager: ['🧢 Manager', 'red'], member: ['Member', ''] };
  const rtag = (r) => { const [l, c] = ROLE[r] || ROLE.member; return `<span class="dm-tag ${c}">${l}</span>`; };
  const ACT = { login: '🔑 logged in', claim: '🪪 claimed a player', 'claim-cancel': '↩ cancelled a claim', 'claim-approved': '✅ claim approved', 'claim-rejected': '⛔ claim rejected', 'claim-unlinked': '🔓 unlinked', profile: '✏️ updated their profile', availability: '📅 set availability', vote: '⭐ voted MOTM', 'vote-remove': '☆ removed a MOTM vote', 'rush-submit': '⚡ sent a Rush result', 'rush-logged': '⚡ logged a Rush result', 'rush-confirmed': '✅ Rush result confirmed', 'rush-rejected': '⛔ Rush result rejected', 'rush-removed': '🗑 Rush result removed', 'rush-withdraw': '↩ withdrew a Rush result' };
  const claimOf = (id) => { const c = S.claims?.[id]; return c && c.status === 'approved' ? c.playerName : ''; };
  const FILTERS = [['all', 'Everyone'], ['staff', '🧢 Staff'], ['muted', '🔇 Muted'], ['warned', '⚠️ Warned'], ['new', '🆕 New (14 d)'], ['quiet', '😴 Quiet (30 d)']];
  const DAYMS = 86400e3;
  const userRows = () => {
    const q = S.mq.trim().toLowerCase(), now = Date.now();
    return Object.entries(S.users || {}).filter(([id, u]) => {
      if (q && !`${u.n} ${claimOf(id)} ${u.tag || ''}`.toLowerCase().includes(q)) return false;
      return { all: true, staff: u.role === 'manager' || u.role === 'owner', muted: !!u.mutedUntil, warned: !!(u.warnings || []).length, new: now - u.first < 14 * DAYMS, quiet: now - u.last > 30 * DAYMS }[S.mf];
    }).sort((a, b) => b[1].last - a[1].last);
  };
  function userDetail(id, u) {
    const L = S.logs[id], sec = (icon, label, items) => items?.length ? `<h5>${icon} ${label}</h5><ul class="dm-ul">${items.join('')}</ul>` : '';
    const li = (t, when) => `<li><span>${t}</span><small>${esc(when)}</small></li>`;
    let log = '';
    if (L === 'load') log = '<div class="dg-skel"><i></i></div>';
    else if (L && L.err) log = `<p class="muted small">⚠️ ${esc(L.err)}</p>`;
    else if (L) log = [sec('📜', 'Activity', (L.activity || []).slice(0, 25).map((a) => li(esc(ACT[a.type] || a.type) + (a.detail ? ` <em>${esc(a.detail)}</em>` : ''), ago(a.at)))),
      sec('🪪', 'Claim history', (L.claim?.history || []).map((h) => li(`${esc(h.action)} <em>${esc(h.player)}</em>`, `${ago(h.at)} · ${h.by || '–'}`))),
      sec('🔀', 'Role changes', (L.roleHistory || []).map((h) => li(`${rtag(h.from)} → ${rtag(h.to)}`, ago(h.at)))),
      sec('🗳️', 'MOTM votes', (L.votes || []).slice(0, 10).map((v) => li(`voted <b>${esc(v.player)}</b>`, ago(v.at)))),
      sec('🌟', 'Star ratings given', (L.ratings || []).slice(0, 10).map((r) => li(`${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)} → ${esc(r.player)}`, `${r.week} · ${ago(r.at)}`))),
      sec('📅', 'Availability', (L.availability || []).slice(0, 10).map((a) => li(`${esc(a.date)}: ${esc(a.status)}`, ago(a.at)))),
      sec('📰', 'Posts', (L.posts || []).slice(0, 10).map((p) => li(`${p.removed ? '<i>(removed)</i> ' : ''}${esc((p.body || '').slice(0, 140))}`, `${p.tag} · ${ago(p.at)}`))),
      sec('💬', 'Messages', (L.messages || []).slice(0, 10).map((m) => li(`${m.kind === 'dm' ? 'DM' : `group “${esc(m.chatName || '')}”`}${m.reported ? ' 🚩 reported' : ''}${m.text != null ? `: ${esc(m.text.slice(0, 140))}` : ' <em>(content hidden)</em>'}`, ago(m.at)))),
      sec('📜', 'Acknowledged rules', (L.acknowledgements || []).map((a) => li(`Rules v${esc(a.version)}`, ago(a.at))))].join('') || '<p class="muted small">Nothing on record yet.</p>';
    const warn = S.warnFor === id ? `<form class="dm-form" data-warn-form data-u="${esc(id)}"><input name="reason" maxlength="200" placeholder="Why are you warning them? (they are told)" required aria-label="Reason"><button class="btn" type="submit">Send warning</button><button class="chip" type="button" data-warn-cancel>Cancel</button></form>` : '';
    const mute = S.muteFor === id ? `<div class="dm-form"><span class="muted small">They can still read, just not post, comment or message:</span>${[[1, '1 hour'], [24, '24 hours'], [168, '7 days']].map(([h, n]) => `<button class="chip" data-mute="${h}" data-u="${esc(id)}">${n}</button>`).join('')}<button class="chip" type="button" data-mute-cancel>Cancel</button></div>` : '';
    return `<div class="dm-detail">
<div class="dm-facts"><span>First seen <b>${esc(ago(u.first))}</b></span><span>Last seen <b>${esc(ago(u.last))}</b></span><span>Logins <b>${u.logins ?? 0}</b></span><span>Points <b>${u.points ?? 0}</b></span>${u.profanityStrikes ? `<span>Language strikes <b>${u.profanityStrikes}</b></span>` : ''}</div>
${u.mutedUntil ? `<p class="small">🔇 Muted until <b>${esc(new Date(u.mutedUntil).toLocaleString())}</b></p>` : ''}
${(u.warnings || []).length ? `<h5>⚠️ Warnings</h5><ul class="dm-ul">${u.warnings.map((w) => li(esc(w.reason), `${ago(w.at)} · ${w.by}`)).join('')}</ul>` : ''}
<div class="dk-btns" style="justify-content:flex-start"><button class="chip" data-warn="${esc(id)}">⚠️ Warn</button>${u.mutedUntil ? `<button class="chip" data-unmute="${esc(id)}">🔊 Unmute</button>` : `<button class="chip" data-mutepick="${esc(id)}">🔇 Mute…</button>`}<button class="chip" data-log="${esc(id)}">📜 ${L && L !== 'load' ? 'Reload log' : 'Activity log'}</button></div>
${warn}${mute}${log}</div>`;
  }
  function members() {
    if (!S.users) return S.err.claims ? empty('⚠️', 'Could not load members', S.err.claims) : '<div class="dg-skel"><i></i></div>';
    return `<div class="dm-bar"><input type="search" data-mq value="${esc(S.mq)}" placeholder="Search name or player…" aria-label="Search members"><div class="chips">${FILTERS.map(([k, n]) => `<button class="chip${S.mf === k ? ' on' : ''}" data-mf="${k}">${n}</button>`).join('')}</div></div><div id="dmList">${memberList()}</div>`;
  }
  function memberList() {
    const rows = userRows();
    if (!rows.length) return empty('🔍', 'Nobody matches', 'Try another filter or search.');
    return `<p class="muted small" style="margin:0 0 10px">${rows.length} of ${Object.keys(S.users).length} members, most recently seen first</p><ul class="dm-list">${rows.slice(0, 80).map(([id, u]) => `<li class="panel dm-row${S.openUser === id ? ' open' : ''}"><button class="dm-head" data-user="${esc(id)}" aria-expanded="${S.openUser === id}">${av(u)}<span class="dm-name"><b>${esc(u.n)}</b><small>${esc(claimOf(id) ? `plays as ${claimOf(id)} · ` : '')}seen ${esc(ago(u.last))}</small></span><span class="dm-badges">${rtag(u.role)}${u.mutedUntil ? '<span title="Muted">🔇</span>' : ''}${(u.warnings || []).length ? `<span title="Warnings">⚠️${u.warnings.length}</span>` : ''}</span></button>${S.openUser === id ? userDetail(id, u) : ''}</li>`).join('')}</ul>${rows.length > 80 ? '<p class="muted small">Showing the first 80 – search to narrow it down.</p>' : ''}`;
  }
  const RQS = { pending: ['⏳', 'Waiting'], approved: ['✅', 'Approved'], rejected: ['❌', 'Rejected'], undone: ['↩️', 'Undone'] };
  function requests() {
    if (!flagOn('requests')) return empty('📨', 'Requests are switched off', 'The requests flag is off for your account.');
    if (!S.reqs) return S.err.reqs ? empty('⚠️', 'Could not load requests', S.err.reqs) : '<div class="dg-skel"><i></i></div>';
    const card = (r) => { const ask = S.rq?.id === r.id ? S.rq.action : null;
      return `<article class="panel dk-card"><div class="dk-who"><span class="dg-av dg-ini">${r.kind === 'club' ? '🏟️' : '🙈'}</span><div><b>${esc(r.subject)}</b><small>${r.kind === 'club' ? `Track this club${r.clubId ? ` · EA club ID ${esc(r.clubId)}` : ' · ID not known yet'}` : 'Hide this player everywhere'} · ${esc(ago(r.at))}</small></div></div>
${r.note ? `<p class="small">“${esc(r.note)}”</p>` : ''}<p class="muted small">${r.by ? `From <b>${esc(r.by.n)}</b>` : `🌐 Visitor · Discord <b>${esc(r.contact || '?')}</b> – check it is really them`}</p>
${r.status === 'pending' ? (ask === 'reject' ? `<form class="dm-form" data-rq-form data-id="${r.id}" data-action="reject"><input name="reason" maxlength="200" placeholder="Note for them (optional)"><button class="btn danger" type="submit">Reject</button><button class="chip" type="button" data-rq-cancel>Cancel</button></form>` : `<div class="dk-btns">${r.kind === 'club' && !r.clubId ? `<input class="dm-cid" data-cid="${r.id}" inputmode="numeric" maxlength="12" placeholder="EA club ID (optional)" aria-label="EA club ID">` : ''}<button class="chip danger" data-rq="reject" data-id="${r.id}">✗ Reject</button><button class="btn" data-rq="approve" data-id="${r.id}">✓ Approve</button></div>`)
      : `<div class="dk-btns"><small class="muted">${RQS[r.status]?.[1] || esc(r.status)} by ${esc(r.decidedBy || '?')} ${esc(ago(r.decidedAt))}${r.reason ? ` · “${esc(r.reason)}”` : ''}</small>${r.status === 'approved' ? (ask === 'undo' ? `<button class="chip danger" data-rq-do="undo" data-id="${r.id}">Tap again to undo</button>` : `<button class="chip" data-rq="undo" data-id="${r.id}">↩️ Undo</button>`) : ''}</div>`}</article>`; };
    const pend = S.reqs.filter((r) => r.status === 'pending'), rest = S.reqs.filter((r) => r.status !== 'pending');
    return `<p class="muted small">Approved requests reach the site on the next update (a rebuild starts right away). “Hide” takes a player off every page; “Track” archives a club's matches.</p>${pend.length ? `<div class="dk-grid">${pend.map(card).join('')}</div>` : empty('📭', 'No open requests', 'Members and visitors ask from the Join page.')}${rest.length ? `<h4 class="dk-h">Decided</h4><div class="dk-grid">${rest.slice(0, 12).map(card).join('')}</div>` : ''}`;
  }
  function paint() {
    if (!root.isConnected) return;
    const c = counts(), tabs = [['claims', '🪪 Claims'], ['members', '👥 Members'], ['requests', '📨 Requests'], ['rush', '⚡ Rush results'], ['trials', '🧭 Trials'], ['notes', '📝 Notes']];
    root.innerHTML = `<div class="chips dk-tabs">${tabs.map(([k, n]) => `<button class="chip${S.tab === k ? ' on' : ''}" data-tab="${k}">${n}${c[k] ? ` <span class="dk-n">${c[k]}</span>` : ''}</button>`).join('')}</div><div class="dk-pane">${{ claims, members, requests, rush, trials, notes }[S.tab]()}</div>`;
  }
  const act = async (fn) => { try { await fn(); } catch (er) { toast(er.message, true); } };
  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('button'); if (!t) return; const k = t.dataset;
    if (k.tab) { S.tab = k.tab; paint(); }
    else if (k.claim) act(async () => { if (k.claim === 'unlink' && !confirm('Unlink this player from their Discord account?')) return; const r = await call('/api/admin/claims', { user: k.u, action: k.claim }); S.claims = r.claims; paint(); toast({ approve: '✅ Approved', reject: 'Rejected', unlink: 'Unlinked' }[k.claim]); });
    else if (k.mf) { S.mf = k.mf; paint(); }
    else if (k.user) { S.openUser = S.openUser === k.user ? null : k.user; S.warnFor = S.muteFor = null; paint(); }
    else if (k.log) act(async () => { S.logs[k.log] = 'load'; paint(); try { S.logs[k.log] = await call(`/api/admin/member/${encodeURIComponent(k.log)}`); } catch (er) { S.logs[k.log] = { err: er.message }; } paint(); });
    else if (k.warn) { S.warnFor = k.warn; S.muteFor = null; paint(); d.querySelector('[data-warn-form] input')?.focus(); }
    else if (k.warnCancel !== undefined) { S.warnFor = null; paint(); }
    else if (k.mutepick) { S.muteFor = k.mutepick; S.warnFor = null; paint(); }
    else if (k.muteCancel !== undefined) { S.muteFor = null; paint(); }
    else if (k.mute) act(async () => { await call('/api/admin/mute', { user: k.u, hours: Number(k.mute) }); S.muteFor = null; await reloadUsers(); toast('🔇 Muted'); });
    else if (k.unmute) act(async () => { await call('/api/admin/mute', { user: k.unmute, hours: 0 }); await reloadUsers(); toast('🔊 Unmuted'); });
    else if (k.rq) { if (k.rq === 'approve') act(async () => { const cid = root.querySelector(`[data-cid="${k.id}"]`)?.value.trim(); S.reqs = (await call('/api/admin/requests/decide', { id: Number(k.id), action: 'approve', clubId: cid || undefined })).requests; paint(); toast('✅ Approved – the site updates in a few minutes'); }); else { S.rq = { id: Number(k.id), action: k.rq }; paint(); } }
    else if (k.rqDo) act(async () => { S.reqs = (await call('/api/admin/requests/decide', { id: Number(k.id), action: 'undo' })).requests; S.rq = null; paint(); toast('↩️ Undone'); });
    else if (k.rqCancel !== undefined) { S.rq = null; paint(); }
    else if (k.rush) act(async () => { const r = await call('/api/rush/decide', { id: Number(k.id), action: k.rush }); S.rush = r; paint(); toast({ confirm: '✅ Confirmed – it is on the public Rush table', reject: 'Rejected', remove: 'Removed' }[k.rush]); });
    else if (k.tr) act(async () => { const r = await call('/api/trials/update', { id: Number(k.id), status: k.tr }); S.trials = r.trials; paint(); toast(`Moved to ${k.tr}`); });
    else if (k.open) { S.openTrial = S.openTrial === Number(k.open) ? null : Number(k.open); paint(); }
    else if (k.delnote) act(async () => { if (!confirm('Delete this note?')) return; const r = await call('/api/notes/delete', { id: Number(k.delnote), all: true }); S.notes = r.notes; paint(); toast('Note deleted'); });
  });
  root.addEventListener('submit', (ev) => {
    const wf = ev.target.closest('[data-warn-form]');
    if (wf) { ev.preventDefault(); const reason = new FormData(wf).get('reason').trim(); if (!reason) return toast('Give a reason', true); return act(async () => { await call('/api/admin/warn', { user: wf.dataset.u, reason }); S.warnFor = null; await reloadUsers(); toast('⚠️ Warning sent'); }); }
    const rf = ev.target.closest('[data-rq-form]');
    if (rf) { ev.preventDefault(); return act(async () => { S.reqs = (await call('/api/admin/requests/decide', { id: Number(rf.dataset.id), action: 'reject', reason: new FormData(rf).get('reason').trim() })).requests; S.rq = null; paint(); toast('Rejected'); }); }
    const f = ev.target.closest('[data-note-form]'); if (!f) return; ev.preventDefault();
    act(async () => { const fd = new FormData(f), kind = f.dataset.kind, subject = f.dataset.subject || fd.get('subject'); const r = await call('/api/notes', { kind, subject, text: fd.get('text'), tag: fd.get('tag') || undefined, all: true }); S.notes = r.notes; if (kind === 'trial') S.trials = (await call('/api/trials')).trials; paint(); toast('Note saved'); });
  });
  root.addEventListener('input', (ev) => { if (ev.target.matches('[data-mq]')) { S.mq = ev.target.value; const l = d.getElementById('dmList'); if (l) l.innerHTML = memberList(); } });
  const reloadUsers = async () => { const ov = await call('/api/admin/overview'); S.users = ov.users; S.claims = ov.claims; paint(); };
  const load = async () => {
    const guard = (key, p) => p.catch((er) => { S.err[key] = er.message; return null; });
    const [ov, rq, tr, nt, rs] = await Promise.all([guard('claims', call('/api/admin/overview')), guard('rush', call('/api/rush/queue')), flagOn('trials') ? guard('trials', call('/api/trials')) : Promise.resolve(null), guard('notes', call('/api/notes')), flagOn('requests') ? guard('reqs', call('/api/admin/requests')) : Promise.resolve(null)]);
    S.claims = ov?.claims ?? (S.err.claims ? null : {}); S.users = ov?.users ?? null; S.reqs = rs?.requests ?? null; S.rush = rq; S.trials = tr?.trials ?? null; S.notes = nt?.notes ?? null; S.canNotes = !!tr?.canNotes; paint();
  };
  (async () => {
    await A.ready?.catch?.(() => {});
    if (!['manager', 'owner'].includes(A.role)) return;
    d.getElementById('dkLocal')?.setAttribute('hidden', ''); root.hidden = false; paint();
    load();
  })();
})();
