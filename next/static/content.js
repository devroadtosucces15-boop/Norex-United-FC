// Staff › Content (swap-over: the rest of the classic manager portal, on the same live routes).
//   Docs        – GET|POST /api/docs, POST /api/docs/remove, GET /api/docs/history?id=, POST /api/docs/restore, GET /api/docs/acks, POST /api/docs/remind,
//                 POST /api/docs/release (owner, once: lifts the release hold – shown only while GET /api/docs says held:true)
//   Ideas       – GET /api/suggestions, POST /api/suggestions/decide {id, status, reply}, POST /api/suggestions/remove {id}
//   Squad week  – GET /api/admin/squadweek  (7 days of availability + RSVPs, "can we field 9?")
//   Storage     – GET /api/feed/storage, POST /api/feed/media/delete {key}   (owner only)
(() => {
  const d = document, root = d.getElementById('ctLive'); if (!root) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const call = (path, body) => (body ? A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) : A.call(path));
  const toast = (m, err) => M?.toast ? M.toast(m, err ? { kind: 'err' } : { kind: 'ok' }) : console.log(m);
  const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 90 ? 'just now' : s < 5400 ? Math.round(s / 60) + ' min ago' : s < 129600 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
  const mb = (b) => (b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');
  const empty = (icon, title, text) => `<div class="panel sq-empty"><span>${icon}</span><div><b>${esc(title)}</b><p class="muted small">${esc(text || '')}</p></div></div>`;
  const skel = '<div class="dg-skel"><i></i></div>';
  const AREAS = [['announce', '📣', 'Announcements'], ['requirements', '✅', 'Requirements'], ['rules', '📜', 'Rules'], ['faq', '❓', 'FAQ'], ['glossary', '📖', 'Glossary']];
  const AREA_ONE = { announce: 'Announcement', requirements: 'Requirement', rules: 'Rule', faq: 'FAQ', glossary: 'Glossary term' };
  const STATUS = [['open', '💭 Open'], ['planned', '🗓️ Planned'], ['done', '✅ Done'], ['declined', '🚫 Not for now']];
  const isOwner = () => A.role === 'owner';
  const TABS = () => [['docs', '📄 Club docs'], ['ideas', '💡 Ideas'], ['week', '📅 Squad week'], ...(isOwner() ? [['store', '🗄️ Storage']] : [])];
  const S = { tab: 'docs', docs: null, form: null, hist: null, acks: null, ideas: null, filter: 'all', week: null, store: null, ask: null, busy: false, err: {} };
  // two taps for anything destructive: the first arms the button (it says so), the second does it
  const two = (key, label, cls = 'chip danger', attrs = '') => `<button class="${cls}" type="button" ${attrs} data-two="${esc(key)}">${S.ask === key ? 'Sure? Tap again' : label}</button>`;
  const plain = (s) => String(s ?? '').replace(/[#*_`>\[\]()!]/g, '').replace(/\s+/g, ' ').trim();

  // ---------- Club docs ----------
  const blank = (area = 'announce') => ({ id: null, area, title: '', body: '', pinned: false, ack: false, notify: false });
  function docs() {
    const D = S.docs; if (S.err.docs) return empty('⚠️', 'Could not load the club docs', S.err.docs); if (!D) return skel;
    if (S.form) return docForm();
    if (S.hist) return history();
    if (S.acks) return ackView();
    const v = D.rules?.version;
    const head = releaseCard(D) + `<div class="chips dk-row"><button class="chip on" type="button" data-doc="new">＋ New item</button>${v ? `<button class="chip" type="button" data-doc="acks">✋ Who accepted the rules (v${v})</button>` : ''}<span class="muted small" style="margin-left:auto">${D.items.length} item${D.items.length === 1 ? '' : 's'}</span></div>`;
    const groups = AREAS.map(([k, ico, name]) => {
      const rows = D.items.filter((x) => x.area === k); if (!rows.length) return '';
      return `<h3 class="ct-h">${ico} ${name} <em>${rows.length}</em></h3><div class="ct-list">${rows.map((x) => `<article class="panel ct-item" id="d-${x.id}"><div class="ct-top"><b>${x.pinned ? '📌 ' : ''}${esc(x.title)}</b><span class="muted tiny">v${x.version} · ${esc(x.by || '')}${x.editedAt ? ` · edited ${ago(x.editedAt)}${x.editedBy ? ' by ' + esc(x.editedBy) : ''}` : ` · ${ago(x.at)}`}${x.discord ? ' · 💬 posted to Discord' : ''}</span></div>
<p class="muted small ct-ex">${esc(plain(x.body).slice(0, 220)) || '(no text)'}</p>
<div class="chips dk-row"><button class="chip" type="button" data-doc="edit" data-id="${x.id}">✏️ Edit</button><button class="chip" type="button" data-doc="hist" data-id="${x.id}">🕘 History</button>${two('docrm:' + x.id, '🗑 Remove', 'chip danger', `data-doc="rm" data-id="${x.id}"`)}</div></article>`).join('')}</div>`;
    }).join('');
    return head + (groups || empty('📄', 'No club docs yet', 'Add an announcement, the rules, requirements, an FAQ entry or a glossary term.'));
  }
  // The owner's go-live switch. Until it is pressed nothing reaches members (no pin, no notification, no Discord post), so the card says what will happen.
  function releaseCard(D) {
    if (!isOwner() || D.held !== true) return '';
    return `<section class="panel ct-release" aria-label="Release the club docs"><div><b>🚀 Club docs are on hold</b><p class="muted small">Members see nothing yet. Releasing pins the founder’s message, bumps the rules version and asks every member to accept it. It can only be done once.</p>
<ul class="muted small ct-rl"><li>Founder letter cut the way you want it?</li><li>Remember the one-week clock for members to accept.</li><li>Announce it in Discord first, so nobody is surprised by the notification.</li></ul></div>
<div class="chips dk-row">${two('release', '🚀 Release club docs', 'btn', 'data-doc="release"')}</div></section>`;
  }
  function docForm() {
    const f = S.form, editing = !!f.id;
    return `<form class="panel ct-form" data-doc-form><div class="ct-fh"><h3>${editing ? 'Edit' : 'New'} ${esc(AREA_ONE[f.area] || 'item')}</h3><button type="button" class="chip" data-doc="cancel">✕ Cancel</button></div>
<label class="ct-l">Section<select name="area"${editing ? ' disabled' : ''}>${AREAS.map(([k, , n]) => `<option value="${k}"${k === f.area ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
<label class="ct-l">Title<input name="title" maxlength="120" required value="${esc(f.title)}" placeholder="At least 3 characters"></label>
<label class="ct-l">Text <span class="muted tiny">headings with #, **bold**, - lists, [links](https://…)</span><textarea name="body" rows="10" maxlength="8000" placeholder="${f.area === 'announce' ? 'Optional for announcements' : 'Write it here'}">${esc(f.body)}</textarea></label>
<div class="chips dk-row"><label class="chip ct-ck"><input type="checkbox" name="pinned"${f.pinned ? ' checked' : ''}> 📌 Pin to the top</label>${f.area === 'rules' ? `<label class="chip ct-ck"><input type="checkbox" name="ack"${f.ack ? ' checked' : ''}> ✋ Ask everyone to accept the change</label>` : ''}${f.area === 'announce' ? `<label class="chip ct-ck"><input type="checkbox" name="notify"${f.notify ? ' checked' : ''}> 🔔 Notify members</label>` : ''}</div>
<div class="chips dk-row"><button class="btn" type="submit"${S.busy ? ' disabled' : ''}>${S.busy ? 'Saving…' : editing ? 'Save changes' : 'Publish'}</button></div></form>`;
  }
  function history() {
    const H = S.hist; if (H === 'loading') return skel; if (H.error) return empty('⚠️', 'Could not load the history', H.error);
    return `<div class="chips dk-row"><button class="chip" type="button" data-doc="back">← Back</button><b>🕘 ${esc(H.doc.title)}</b></div><ol class="ct-hist">${H.versions.map((x) => `<li class="panel"><div class="ct-top"><b>v${x.version}${x.current ? ' · current' : ''}</b><span class="muted tiny">${esc(x.by || '')} · ${ago(x.at)}</span></div><b class="small">${esc(x.title)}</b><p class="muted small ct-ex">${esc(plain(x.body).slice(0, 400))}</p>${x.current ? '' : two(`restore:${x.version}`, '↩️ Restore this version', 'chip', `data-doc="restore" data-v="${x.version}"`)}</li>`).join('')}</ol>`;
  }
  function ackView() {
    const a = S.acks; if (a === 'loading') return skel; if (a.error) return empty('⚠️', 'Could not load who accepted', a.error);
    const row = (u, sub) => `<li><b>${esc(u.n)}</b> <span class="muted tiny">${esc(sub)}</span></li>`;
    return `<div class="chips dk-row"><button class="chip" type="button" data-doc="back">← Back</button><b>✋ Rules v${a.version}</b>${a.missing.length ? `<button class="chip on" type="button" data-doc="remind">🔔 Remind ${a.missing.length}</button>` : ''}</div>
<div class="grid g2"><div class="panel"><h4>✋ Still to accept <em>${a.missing.length}</em></h4>${a.missing.length ? `<ul class="ct-ul">${a.missing.map((u) => row(u, `last seen ${ago(u.last)}`)).join('')}</ul>` : '<p class="muted small">Everyone active has accepted. 🎉</p>'}</div>
<div class="panel"><h4>✅ Accepted <em>${a.acked.length}</em></h4>${a.acked.length ? `<ul class="ct-ul">${a.acked.map((u) => row(u, ago(u.at))).join('')}</ul>` : '<p class="muted small">Nobody yet.</p>'}</div></div>`;
  }
  const readForm = (f) => ({ id: S.form.id, area: S.form.id ? S.form.area : f.area.value, title: f.title.value.trim(), body: f.body.value, pinned: !!f.pinned?.checked, ack: !!f.ack?.checked, notify: !!f.notify?.checked });

  // ---------- Ideas ----------
  function ideas() {
    const I = S.ideas; if (S.err.ideas) return empty('⚠️', 'Could not load the ideas', S.err.ideas); if (!I) return skel;
    const rows = I.items.filter((x) => S.filter === 'all' || x.status === S.filter);
    const cnt = (k) => (k === 'all' ? I.items.length : I.items.filter((x) => x.status === k).length);
    return `<div class="chips dk-row">${[['all', 'All'], ...STATUS].map(([k, n]) => `<button class="chip${S.filter === k ? ' on' : ''}" type="button" data-if="${k}">${n} <span class="dk-n">${cnt(k)}</span></button>`).join('')}</div>
${rows.length ? `<div class="ct-list">${rows.map((x) => `<form class="panel ct-item" data-idea="${x.id}"><div class="ct-top"><b>${esc(x.title)}</b><span class="muted tiny">▲ ${x.up} · ${x.by ? esc(x.by.n) : 'Anonymous'}${x.anon ? ' (hidden from members)' : ''} · ${ago(x.at)}</span></div>${x.body ? `<p class="muted small">${esc(x.body)}</p>` : ''}
<div class="chips dk-row"><select name="status" aria-label="Status">${STATUS.map(([k, n]) => `<option value="${k}"${k === x.status ? ' selected' : ''}>${n}</option>`).join('')}</select><input name="reply" maxlength="500" value="${esc(x.reply || '')}" placeholder="Reply to the author (optional)" aria-label="Reply" style="flex:1;min-width:180px"><button class="btn sm" type="submit">Save</button>${two('idearm:' + x.id, '🗑 Remove', 'chip danger', `data-idea-rm="${x.id}"`)}</div>${x.repliedBy ? `<p class="muted tiny">Last answered by ${esc(x.repliedBy)} ${x.repliedAt ? ago(x.repliedAt) : ''}</p>` : ''}</form>`).join('')}</div>` : empty('💡', 'Nothing here', 'No ideas with that status.')}`;
  }

  // ---------- Squad week ----------
  const dayName = (iso) => { const t = new Date(iso + 'T12:00:00'); return Number.isNaN(+t) ? iso : t.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };
  function week() {
    const W = S.week; if (S.err.week) return empty('⚠️', 'Could not load the squad week', S.err.week); if (!W) return skel;
    return `<p class="muted small">Who said yes or maybe for each of the next 7 days (availability and match-night RSVPs together). Nine players or more means the day can be fielded.</p>
<div class="ct-week">${W.days.map((x) => `<article class="panel ct-day${x.canField9 ? ' ok' : ''}"><div class="ct-top"><b>${esc(dayName(x.date))}</b><span class="pill ${x.canField9 ? 'w' : ''}">${x.canField9 ? '✅ can field 9' : `${x.yes.length}/9`}</span></div>
<p class="small"><b>✅ ${x.yes.length}</b> ${x.yes.length ? esc(x.yes.map((p) => p.n).join(', ')) : '<span class="muted">nobody yet</span>'}</p>${x.maybe.length ? `<p class="small muted"><b>🤔 ${x.maybe.length}</b> ${esc(x.maybe.map((p) => p.n).join(', '))}</p>` : ''}</article>`).join('')}</div>`;
  }

  // ---------- Storage (owner) ----------
  function store() {
    const T = S.store; if (S.err.store) return empty('⚠️', 'Could not load storage', S.err.store); if (!T) return skel;
    if (!T.on) return empty('🗄️', 'Media storage is not switched on', 'Photos and clips need the storage bucket to be connected to the Worker.');
    const L = T.limits || {}, pct = L.free ? Math.min(100, Math.round((T.used / L.free) * 100)) : 0;
    const file = (r, danger) => `<li><span class="ct-fn">${r.kind === 'video' ? '🎬' : '🖼️'} ${esc(r.name || r.key.slice(-10))}</span><span class="muted tiny">${mb(r.size)} · ${esc(r.by)} · ${ago(r.at)}${r.post ? ` · post #${r.post}` : ''}</span>${two('media:' + r.key, '🗑 Delete', 'chip danger', `data-media="${esc(r.key)}"`)}</li>`;
    return `<div class="panel"><div class="ct-top"><b>🗄️ ${mb(T.used)} used</b><span class="muted tiny">${L.free ? `of ${mb(L.free)} free tier · ${pct}%` : ''}</span></div><div class="ct-meter" role="img" aria-label="${pct}% of the free storage used"><i style="width:${pct}%"></i></div>
<p class="muted small">${Object.entries(T.byKind || {}).map(([k, v]) => `${k === 'video' ? '🎬' : '🖼️'} ${v.n} ${k}${v.n === 1 ? '' : 's'} · ${mb(v.bytes)}`).join('  ·  ') || 'No files yet.'}${T.expired30 ? `  ·  ${T.expired30} expired in the last 30 days` : ''}${T.guard ? `  ·  guard: ${esc(T.guard)}` : ''}</p></div>
<div class="grid g2"><div class="panel"><h4>📦 Biggest files</h4>${T.biggest?.length ? `<ul class="ct-ul">${T.biggest.map(file).join('')}</ul>` : '<p class="muted small">None.</p>'}</div><div class="panel"><h4>⏳ Next to expire</h4>${T.next?.length ? `<ul class="ct-ul">${T.next.map(file).join('')}</ul>` : '<p class="muted small">None.</p>'}</div></div>`;
  }

  // ---------- shell ----------
  function paint() {
    if (!root.isConnected) return;
    const focus = d.activeElement?.name ? { n: d.activeElement.name } : null;
    root.innerHTML = `<div class="chips dk-tabs">${TABS().map(([k, n]) => `<button class="chip${S.tab === k ? ' on' : ''}" type="button" data-tab="${k}">${n}</button>`).join('')}</div><div class="ct-body">${{ docs, ideas, week, store }[S.tab]()}</div>`;
    if (focus) root.querySelector(`[name="${focus.n}"]`)?.focus({ preventScroll: true });
  }
  const guard = async (k, fn) => { try { const r = await fn(); S.err[k] = null; return r; } catch (e) { S.err[k] = e.message; return null; } };
  const need = async (tab) => {
    if (tab === 'docs' && !S.docs) S.docs = await guard('docs', () => call('/api/docs'));
    if (tab === 'ideas' && !S.ideas) S.ideas = await guard('ideas', () => call('/api/suggestions'));
    if (tab === 'week' && !S.week) S.week = await guard('week', () => call('/api/admin/squadweek'));
    if (tab === 'store' && !S.store) S.store = await guard('store', () => call('/api/feed/storage'));
    if (S.tab === tab) paint();
  };
  const act = async (fn) => { try { await fn(); } catch (e) { S.busy = false; paint(); toast(e.message, true); } };
  const item = (id) => S.docs?.items.find((x) => x.id === Number(id));

  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('button'); if (!t) return; const k = t.dataset;
    if (k.two !== undefined && S.ask !== k.two) { S.ask = k.two; paint(); setTimeout(() => { if (S.ask === k.two) { S.ask = null; paint(); } }, 4000); return; }
    S.ask = null;
    if (k.tab) { S.tab = k.tab; paint(); need(k.tab); }
    else if (k.if) { S.filter = k.if; paint(); }
    else if (k.doc === 'new') { S.form = blank(); paint(); root.querySelector('[name=title]')?.focus(); }
    else if (k.doc === 'edit') { const x = item(k.id); if (!x) return; S.form = { id: x.id, area: x.area, title: x.title, body: x.body, pinned: x.pinned, ack: false, notify: false }; paint(); root.querySelector('[name=title]')?.focus(); }
    else if (k.doc === 'cancel' || k.doc === 'back') { S.form = null; S.hist = null; S.acks = null; paint(); }
    else if (k.doc === 'hist') act(async () => { S.hist = 'loading'; paint(); S.hist = await call(`/api/docs/history?id=${encodeURIComponent(k.id)}`).catch((e) => ({ error: e.message })); S.histId = Number(k.id); paint(); });
    else if (k.doc === 'restore') act(async () => { S.docs = await call('/api/docs/restore', { id: S.histId, version: Number(k.v) }); S.hist = null; paint(); toast(`Restored version ${k.v} – saved as a new version`); });
    else if (k.doc === 'release') act(async () => { t.disabled = true; S.docs = await call('/api/docs/release', {}); paint(); toast(`🚀 Club docs released · rules version ${S.docs.rules?.version ?? ''}`.trim()); });
    else if (k.doc === 'rm') act(async () => { S.docs = await call('/api/docs/remove', { id: Number(k.id) }); paint(); toast('Removed – its history is kept'); });
    else if (k.doc === 'acks') act(async () => { S.acks = 'loading'; paint(); S.acks = await call('/api/docs/acks').catch((e) => ({ error: e.message })); paint(); });
    else if (k.doc === 'remind') act(async () => { const r = await call('/api/docs/remind', {}); S.acks = r; paint(); toast(r.sent ? `Reminder sent to ${r.sent}` : 'Nobody could be reminded (their notifications may be off)'); });
    else if (k.ideaRm) act(async () => { S.ideas = await call('/api/suggestions/remove', { id: Number(k.ideaRm) }); paint(); toast('Idea removed'); });
    else if (k.media) act(async () => { S.store = await call('/api/feed/media/delete', { key: k.media }); paint(); toast('File deleted'); });
  });
  root.addEventListener('submit', (ev) => {
    ev.preventDefault(); const f = ev.target;
    if (f.matches('[data-doc-form]')) act(async () => {
      const v = readForm(f); S.form = { ...S.form, ...v }; S.busy = true; paint();
      const r = await call('/api/docs', { id: v.id || undefined, area: v.area, title: v.title, body: v.body, pinned: v.pinned, ack: v.ack, notify: v.notify });
      S.docs = r; S.form = null; S.busy = false; paint(); toast(v.id ? 'Saved' : 'Published' + (r.notified ? ` · ${r.notified} notified` : ''));
    });
    else if (f.matches('[data-idea]')) act(async () => { S.ideas = await call('/api/suggestions/decide', { id: Number(f.dataset.idea), status: f.status.value, reply: f.reply.value.trim() }); paint(); toast('Saved – the author is told'); });
  });
  // the options depend on the section (rules: ask everyone to accept · announcements: notify) – repaint when it changes, keeping what was typed
  root.addEventListener('change', (ev) => {
    const f = ev.target.closest?.('[data-doc-form]'); if (!f || ev.target.name !== 'area' || S.form?.id) return;
    S.form = { ...S.form, ...readForm(f), area: f.area.value, ack: false, notify: false }; paint();
  });
  (async () => {
    await A.ready?.catch?.(() => {});
    if (!['manager', 'owner'].includes(A.role)) return;
    d.getElementById('ctLocal')?.setAttribute('hidden', ''); root.hidden = false; paint();
    need('docs');
  })();
})();
