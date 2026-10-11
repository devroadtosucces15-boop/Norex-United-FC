// Staff › Desk (Phase C3): the manager portal's work queues on the live routes.
//   Claims  – GET /api/admin/overview (claims), POST /api/admin/claims {user, action: approve|reject|unlink}
//   Rush    – GET /api/rush/queue, POST /api/rush/decide {id, action: confirm|reject|remove}
//   Trials  – GET /api/trials, POST /api/trials/update {id, status|player}, /api/trials/add
//   Notes   – GET /api/notes, POST /api/notes {kind, subject, text, tag}, /api/notes/delete
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
  const S = { tab: 'claims', claims: null, rush: null, trials: null, notes: null, canNotes: false, openTrial: null, err: {} };
  const empty = (icon, title, text) => `<div class="panel sq-empty"><span>${icon}</span><div><b>${esc(title)}</b><p class="muted small">${esc(text || '')}</p></div></div>`;
  const av = (u) => u?.a ? `<img class="dg-av" src="${esc(u.a)}" alt="" loading="lazy">` : `<span class="dg-av dg-ini">${esc((u?.n || '?')[0].toUpperCase())}</span>`;

  const pendingClaims = () => Object.entries(S.claims || {}).filter(([, c]) => c.status === 'pending').sort((a, b) => a[1].at - b[1].at);
  const counts = () => ({ claims: pendingClaims().length, rush: S.rush?.pending?.length ?? 0, trials: (S.trials || []).filter((t) => ['recommended', 'applied'].includes(t.status)).length, notes: S.notes?.length ?? 0 });

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
  function paint() {
    if (!root.isConnected) return;
    const c = counts(), tabs = [['claims', '🪪 Claims'], ['rush', '⚡ Rush results'], ['trials', '🧭 Trials'], ['notes', '📝 Notes']];
    root.innerHTML = `<div class="chips dk-tabs">${tabs.map(([k, n]) => `<button class="chip${S.tab === k ? ' on' : ''}" data-tab="${k}">${n}${c[k] ? ` <span class="dk-n">${c[k]}</span>` : ''}</button>`).join('')}</div><div class="dk-pane">${{ claims, rush, trials, notes }[S.tab]()}</div>`;
  }
  const act = async (fn) => { try { await fn(); } catch (er) { toast(er.message, true); } };
  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('button'); if (!t) return; const k = t.dataset;
    if (k.tab) { S.tab = k.tab; paint(); }
    else if (k.claim) act(async () => { if (k.claim === 'unlink' && !confirm('Unlink this player from their Discord account?')) return; const r = await call('/api/admin/claims', { user: k.u, action: k.claim }); S.claims = r.claims; paint(); toast({ approve: '✅ Approved', reject: 'Rejected', unlink: 'Unlinked' }[k.claim]); });
    else if (k.rush) act(async () => { const r = await call('/api/rush/decide', { id: Number(k.id), action: k.rush }); S.rush = r; paint(); toast({ confirm: '✅ Confirmed – it is on the public Rush table', reject: 'Rejected', remove: 'Removed' }[k.rush]); });
    else if (k.tr) act(async () => { const r = await call('/api/trials/update', { id: Number(k.id), status: k.tr }); S.trials = r.trials; paint(); toast(`Moved to ${k.tr}`); });
    else if (k.open) { S.openTrial = S.openTrial === Number(k.open) ? null : Number(k.open); paint(); }
    else if (k.delnote) act(async () => { if (!confirm('Delete this note?')) return; const r = await call('/api/notes/delete', { id: Number(k.delnote), all: true }); S.notes = r.notes; paint(); toast('Note deleted'); });
  });
  root.addEventListener('submit', (ev) => {
    const f = ev.target.closest('[data-note-form]'); if (!f) return; ev.preventDefault();
    act(async () => { const fd = new FormData(f), kind = f.dataset.kind, subject = f.dataset.subject || fd.get('subject'); const r = await call('/api/notes', { kind, subject, text: fd.get('text'), tag: fd.get('tag') || undefined, all: true }); S.notes = r.notes; if (kind === 'trial') S.trials = (await call('/api/trials')).trials; paint(); toast('Note saved'); });
  });
  const load = async () => {
    const guard = (key, p) => p.catch((er) => { S.err[key] = er.message; return null; });
    const [ov, rq, tr, nt] = await Promise.all([guard('claims', call('/api/admin/overview')), guard('rush', call('/api/rush/queue')), flagOn('trials') ? guard('trials', call('/api/trials')) : Promise.resolve(null), guard('notes', call('/api/notes'))]);
    S.claims = ov?.claims ?? (S.err.claims ? null : {}); S.rush = rq; S.trials = tr?.trials ?? null; S.notes = nt?.notes ?? null; S.canNotes = !!tr?.canNotes; paint();
  };
  (async () => {
    await A.ready?.catch?.(() => {});
    if (!['manager', 'owner'].includes(A.role)) return;
    d.getElementById('dkLocal')?.setAttribute('hidden', ''); root.hidden = false; paint();
    load();
  })();
})();
