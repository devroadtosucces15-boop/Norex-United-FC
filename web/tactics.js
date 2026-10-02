// Tactics Studio / Playbook client (BE1). No framework: follows the same session/API/UI patterns as messages.js.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const API = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const session = () => { try { const t = localStorage.getItem('norex_session'); const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))); return p.exp > Date.now() / 1000 ? { token: t, ...p } : null; } catch { return null; } };
  const call = async (path, body) => {
    const s = session();
    const r = await fetch(API + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { ...(s ? { Authorization: `Bearer ${s.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  const loginUrl = () => `${API}/auth/login?return=${encodeURIComponent(location.href)}`;
  const toast = (m, bad) => UI.toast(m, bad ? 'bad' : 'ok');
  let root, me, plays = [], active = null, detail = null;
  const manager = () => ['manager', 'owner'].includes(me?.role);

  function card(p) {
    const state = p.mine?.learned ? '<span class="tag tx-done">✓ Learned</span>' : p.mine?.assigned ? '<span class="tag">Assigned</span>' : '';
    const draft = !p.published ? '<span class="tag">Draft</span>' : '';
    return `<button class="tx-card" type="button" data-open="${p.id}"><span class="tx-ic">${p.category === 'formation' ? '📐' : p.category === 'drill' ? '🏃' : '🎯'}</span><span><b>${esc(p.title)}</b><small>${esc(p.category)} · v${p.version}</small></span><span class="tx-tags">${state}${draft}</span><i>→</i></button>`;
  }
  function listView() {
    const create = manager() ? `<form class="tx-new card" data-new><h3>New play</h3><div class="tx-form"><input name="title" maxlength="80" required placeholder="Play title" aria-label="Play title"><select name="category" aria-label="Category"><option value="set-piece">Set piece</option><option value="formation">Formation</option><option value="drill">Drill</option></select><button class="btn sm" type="submit">Create draft</button></div></form>` : '';
    root.innerHTML = `<div class="tx-head"><div><p class="kicker">PLAYBOOK</p><h2>Club tactics</h2><p class="muted">Published plays are available to the squad. Managers can stage and publish new versions.</p></div><span class="tx-count">${plays.filter((p) => p.published).length} live</span></div>${create}<div class="tx-list">${plays.length ? plays.map(card).join('') : UI.empty({ icon: '📋', title: 'No plays yet', text: manager() ? 'Create the first playbook entry above.' : 'Managers have not published a play yet.' })}</div>`;
  }
  const piece = (p) => `<span class="tx-piece ${p.team}" style="left:${Math.max(0, Math.min(100, p.x / 10))}%;top:${Math.max(0, Math.min(100, p.y / 6.4))}%">${p.team === 'ball' ? '●' : esc(p.label || (p.team === 'us' ? 'N' : 'O'))}</span>`;
  function pitch(doc) {
    return `<div class="tx-pitch" aria-label="Tactics board">${(doc.pieces || []).map(piece).join('')}<span class="tx-half"></span><span class="tx-circle"></span></div>`;
  }
  function detailView() {
    const p = detail, q = p.doc?.quiz || [];
    const manage = manager() ? `<div class="tx-manage card"><h3>Manager controls</h3><div class="tx-actions"><button class="btn sm" data-publish="${p.published ? '0' : '1'}">${p.published ? 'Unpublish' : 'Publish'}</button><button class="btn sm ghost" data-edit>Edit document</button><button class="btn sm ghost" data-restore>Version history</button><button class="btn sm danger" data-archive>Archive</button></div><small class="muted">Server-side validation remains authoritative for every save and quiz.</small></div>` : '';
    const quiz = q.length ? `<form class="tx-quiz card" data-quiz><h3>Knowledge check</h3>${q.map((x, i) => `<fieldset><legend>${i + 1}. ${esc(x.q)}</legend>${x.options.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}" required> <span>${esc(o)}</span></label>`).join('')}</fieldset>` ).join('')}<button class="btn" type="submit">Check answers</button></form>` : '';
    root.innerHTML = `<button class="linkish tx-back" type="button" data-back>← All plays</button><div class="tx-title"><div><p class="kicker">${esc(p.category)}</p><h2>${esc(p.title)}</h2><p class="muted">Version ${p.version}${p.mine?.assigned ? ' · assigned to you' : ''}</p></div>${p.mine?.learned ? '<span class="tag tx-done">✓ Learned</span>' : p.published ? '<button class="btn sm ghost" data-learn>Mark learned</button>' : '<span class="tag">Draft</span>'}</div>${pitch(p.doc || {})}<div class="tx-steps">${(p.doc?.steps || []).length ? `<b>${p.doc.steps.length} movement step${p.doc.steps.length === 1 ? '' : 's'}</b><small class="muted">Use the board and coach notes for the current version.</small>` : '<span class="muted">No movement steps in this version yet.</span>'}</div>${quiz}${manage}`;
  }
  async function load(openId) {
    root.innerHTML = UI.skeleton('rows', 5);
    const d = await call('/api/plays'); plays = d.plays || [];
    const id = openId || +(location.hash.match(/^#play(\d+)$/)?.[1] || 0);
    if (id) return open(id);
    active = null; detail = null; listView();
  }
  async function open(id) {
    active = +id; detail = await call(`/api/plays/${active}`);
    history.replaceState(null, '', `#play${active}`); detailView();
  }
  async function editDoc() {
    let raw = JSON.stringify(detail.doc || { pieces: [], steps: [], drawings: [], quiz: [] }, null, 2);
    const v = await UI.modal({ title: 'Edit play document', icon: '🧠', body: `<p class="muted small">Advanced editor: JSON is validated and trimmed by the Worker before it is saved.</p><textarea class="tx-json" rows="16" aria-label="Play document">${esc(raw)}</textarea>`, actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: 'Save new version', value: 'save' }], onOpen: (d) => d.addEventListener('input', (e) => { if (e.target.matches('.tx-json')) raw = e.target.value; }) });
    if (v !== 'save') return;
    try { const doc = JSON.parse(raw); detail = await call(`/api/plays/${active}`, { doc }); toast('New version saved.'); detailView(); } catch (e) { toast(e.message || 'Invalid JSON.', true); }
  }
  async function versions() {
    const vs = detail.versions || [];
    const body = vs.length ? `<div class="tx-versions">${vs.map((v) => `<button type="button" class="tx-ver" data-v="${v.version}"><b>v${v.version}</b><small>${new Date(v.at).toLocaleString()}</small></button>`).join('')}</div>` : '<p class="muted">No older versions.</p>';
    const chosen = await UI.modal({ title: 'Version history', icon: '↩️', body, actions: [{ label: 'Close', value: null, kind: 'ghost' }], onOpen: (d, close) => d.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) close(b.dataset.v); }) });
    if (!chosen) return;
    try { detail = await call(`/api/plays/${active}/restore`, { version: +chosen }); toast(`Restored v${chosen} as a new version.`); detailView(); } catch (e) { toast(e.message, true); }
  }
  function wire() {
    root.addEventListener('click', async (e) => {
      const o = e.target.closest('[data-open]'); if (o) { try { await open(o.dataset.open); } catch (x) { toast(x.message, true); } return; }
      if (e.target.closest('[data-back]')) { history.replaceState(null, '', location.pathname); await load(); return; }
      if (e.target.closest('[data-learn]')) { try { await call(`/api/plays/${active}/learned`, { learned: true }); detail.mine.learned = true; toast('Marked learned.'); detailView(); } catch (x) { toast(x.message, true); } return; }
      const pub = e.target.closest('[data-publish]'); if (pub) { try { detail = await call(`/api/plays/${active}/publish`, { published: pub.dataset.publish === '1' }); toast(detail.published ? 'Play published.' : 'Play unpublished.'); detailView(); } catch (x) { toast(x.message, true); } return; }
      if (e.target.closest('[data-edit]')) { editDoc(); return; }
      if (e.target.closest('[data-restore]')) { versions(); return; }
      if (e.target.closest('[data-archive]')) { if (!(await UI.confirm({ title: 'Archive this play?', text: 'History is kept; members will no longer see it.', ok: 'Archive', danger: true }))) return; try { await call(`/api/plays/${active}/delete`, {}); toast('Play archived.'); history.replaceState(null, '', location.pathname); await load(); } catch (x) { toast(x.message, true); } }
    });
    root.addEventListener('submit', async (e) => {
      if (e.target.matches('[data-new]')) { e.preventDefault(); const f = new FormData(e.target); try { const p = await call('/api/plays', { title: f.get('title'), category: f.get('category') }); toast('Draft created.'); await load(p.id); } catch (x) { toast(x.message, true); } return; }
      if (e.target.matches('[data-quiz]')) { e.preventDefault(); const fd = new FormData(e.target), answers = (detail.doc.quiz || []).map((_, i) => +(fd.get(`q${i}`) ?? -1)); try { const r = await call(`/api/plays/${active}/quiz`, { answers }); const perfect = r.score === r.total; toast(`${r.score}/${r.total}${perfect ? ' — learned ✓' : ''}`, !perfect); if (perfect) detail.mine.learned = true; detailView(); } catch (x) { toast(x.message, true); } }
    });
  }
  async function init() {
    root = $('[data-tactics]'); if (!root) return;
    me = session();
    if (!me) { root.innerHTML = UI.empty({ icon: '🔒', title: 'Log in to open the playbook', action: `<a class="btn sm" href="${loginUrl()}">Log in with Discord</a>` }); return; }
    wire();
    try { await load(); } catch (e) { root.innerHTML = UI.empty({ icon: '⚠️', title: 'Could not load the playbook', text: e.message }); }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
