(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BASE = document.body.dataset.base || '';
  const MAPI = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!$('link[href$="cardstudio.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/cardstudio.css` }));
  const mediaUrl = (key) => `${MAPI}/media/${key}`;
  const loadComposer = () => window.NXCardComposer ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/cardcomposer.js`, onload: ok, onerror: no })));

  const tile = (t, kind, picked) => `<button type="button" class="cs-tile${picked ? ' on' : ''}${t.locked ? ' locked' : ''}${t.active === false ? ' off' : ''}" data-id="${t.id}" data-kind="${kind}" ${t.locked ? 'aria-disabled="true"' : ''}>
<span class="cs-thumb"><img src="${esc(mediaUrl(t.key))}" alt="" loading="lazy">${t.locked ? '<span class="cs-lock" aria-hidden="true">🔒</span>' : ''}</span>
<span class="cs-name">${esc(t.name)}</span>
<span class="cs-meta">${t.tier === 'premium' ? (t.locked ? `⭐ ${t.pointCost} pts` : '⭐ Unlocked') : 'Free'}${t.active === false ? ' · hidden' : ''}</span>
${t.locked ? '<span class="cs-redeem" title="Redeeming with points is coming soon">Redeem soon</span>' : ''}</button>`;

  const gallery = (title, icon, list, kind, picked, empty) => `<section class="cs-sec"><h4>${icon} ${title}</h4>${list.length ? `<div class="cs-grid">${list.map((t) => tile(t, kind, picked === t.id)).join('')}</div>` : `<p class="muted">${empty}</p>`}</section>`;

  const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
  const STATUS = { pending: ['⏳', 'Waiting for a manager'], approved: ['✅', 'Approved – your card is in the queue'], rejected: ['❌', 'Not approved'], generating: ['🎨', 'Your card is being made'], done: ['🏁', 'Ready'], failed: ['⚠️', 'It did not work after 3 tries – a manager has been told'], review: ['🔎', 'Artwork awaiting manager quality review'] };
  // Photos are private: fetched with the login token and shown from a blob URL.
  const photoUrls = [];
  const loadPhotos = (el, ctx) => $$('[data-photo],[data-result],[data-portrait]', el).forEach(async (img) => {
    const card = img.dataset.result !== undefined || img.dataset.portrait !== undefined;
    const portrait = img.dataset.portrait !== undefined;
    try {
      const r = await fetch(`${ctx.api}/api/cards/${card ? 'result' : 'photo'}/${card ? (portrait ? img.dataset.portrait : img.dataset.result) : img.dataset.photo}${portrait ? '?kind=portrait' : ''}`, { headers: { Authorization: `Bearer ${ctx.token}` } });
      if (!r.ok) throw new Error();
      const u = URL.createObjectURL(await r.blob());
      photoUrls.push(u);
      img.src = u;
      const save = card ? img.nextElementSibling : null;
      if (card && save) { save.href = u; save.hidden = false; }
    } catch { img.replaceWith(Object.assign(document.createElement('span'), { className: 'cs-nophoto', textContent: card ? 'Card removed' : 'Photo removed' })); }
  });
  // Phone photos can be 10 MB+; send a 1600px JPEG instead (falls back to the original file).
  async function shrink(file) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
      return blob && blob.size < file.size ? blob : file;
    } catch { return file; }
  }

  const requestHtml = (mine, month) => {
    const r = mine.request;
    const [icon, label] = r ? STATUS[r.status] || ['•', r.status] : [];
    const status = r ? `<div class="cs-status ${r.status}"><span class="cs-ico">${icon}</span><div><b>${esc(label)}</b><br><span class="muted">${esc(r.bg || '—')} + ${esc(r.pose || '—')} · ${esc(r.month)}${r.note ? ` · “${esc(r.note)}”` : ''}</span></div>${['pending', 'approved', 'generating', 'failed'].includes(r.status) ? `<img class="cs-photo" data-photo="${r.id}" alt="Your photo">` : ''}${r.status === 'pending' ? '<button type="button" class="btn ghost small" id="cs-cancel">Cancel</button>' : ''}</div>` : '';
    const card = r?.status === 'done' && (r.hasResult || r.hasPortrait) ? `<div class="cs-done">${r.hasResult ? `<img class="cs-card" data-result="${r.id}" alt="Cinematic avatar"><a class="btn small" data-save-card download="norex-avatar-${esc(r.month)}.png" hidden>⬇ Save avatar</a>` : ''}${r.hasPortrait ? `<img class="cs-card" data-portrait="${r.id}" alt="Website portrait"><a class="btn small" data-save-card download="norex-portrait-${esc(r.month)}.png" hidden>⬇ Save portrait</a><form class="cs-form" id="cs-kit"><label>Kit number (optional)<input name="kitNumber" type="number" min="0" max="99" step="1" value="${esc(r.kitNumber)}" placeholder="0–99"></label><button class="btn small" type="submit">Save kit number</button></form><canvas class="cs-card cs-live-card" data-card-preview="${r.id}" aria-label="Player card with live statistics"></canvas><button type="button" class="btn small" data-export-live="${r.id}">⬇ Export player card</button><p class="muted small">Card statistics reflect the latest loaded club data; refresh to update.</p>` : ''}</div>` : '';
    const open = !r || r.status === 'rejected';
    return `<section class="cs-sec cs-req"><h4>📸 Request my card</h4>
<p class="muted">One request per month (${esc(month)}). Upload a photo and choose your outputs. Background and pose templates are only required for a cinematic avatar. A manager will approve the request.</p>
${status}${card}
${open ? `<form id="cs-request" class="cs-form"><label class="cs-file"><input type="file" name="photo" accept="image/png,image/jpeg,image/webp" required><span>📷 Choose photo</span></label>
<label>Kit number (optional)<input name="kitNumber" type="number" min="0" max="99" step="1" placeholder="0–99"></label><img class="cs-photo" id="cs-preview" alt="" hidden><p class="muted small">No templates yet? Uncheck Cinematic avatar to request the standard website portrait immediately.</p><label><input type="checkbox" name="avatar" checked> Cinematic avatar</label><label><input type="checkbox" name="portrait" checked> Website portrait</label><button class="btn" type="submit" disabled>📨 Send request</button></form>${r?.status === 'rejected' ? '<p class="muted">Your last photo was not approved – sending a new one does not use up your month.</p>' : ''}` : ''}</section>`;
  };

  const queueHtml = (list) => {
    const pending = list.filter((x) => x.status === 'pending'), reviews = list.filter((x) => x.status === 'review'), done = list.filter((x) => !['pending', 'review'].includes(x.status));
    return `<section class="cs-sec"><h4>📥 Card requests${pending.length ? ` <span class="cs-count">${pending.length}</span>` : ''}</h4>
${reviews.length ? `<h5>🔎 Generated artwork awaiting review</h5><ul class="cs-queue">${reviews.map(x => `<li class="cs-qrow" data-req="${x.id}"><div class="cs-review-images">${x.hasResult ? `<img class="cs-card" data-result="${x.id}" alt="Cinematic avatar awaiting review">` : ''}${x.hasPortrait ? `<img class="cs-card" data-portrait="${x.id}" alt="Website portrait awaiting review">` : ''}</div><div class="cs-qinfo"><b>${esc(x.user)}</b><span class="muted">Inspect likeness, framing, kit colors and background before publishing</span></div><div class="cs-qact"><button type="button" class="btn small" data-review="publish">✅ Publish</button><button type="button" class="btn ghost small" data-review="regenerate">🔁 Regenerate</button></div></li>`).join('')}</ul>` : ''}
${pending.length ? `<ul class="cs-queue">${pending.map((x) => `<li class="cs-qrow" data-req="${x.id}"><img class="cs-photo" data-photo="${x.id}" alt="Photo from ${esc(x.user)}">
<div class="cs-qinfo"><b>${esc(x.user)}</b><span class="muted">${esc(x.bg || '—')} + ${esc(x.pose || '—')} · ${ago(x.createdAt)}</span>
<input data-note maxlength="200" placeholder="Reason (needed to reject)" aria-label="Reason"></div>
<div class="cs-qact"><button type="button" class="btn small" data-decide="approve">✅ Approve</button><button type="button" class="btn ghost small" data-decide="reject">❌ Reject</button></div></li>`).join('')}</ul>` : '<p class="muted">Nothing waiting. 🎉</p>'}
${done.length ? `<h5>Recently decided</h5><ul class="cs-recent">${done.map((x) => `<li>${STATUS[x.status]?.[0] || '•'} <b>${esc(x.user)}</b> – ${esc(x.status)}${x.decider ? ` by ${esc(x.decider)}` : ''}${x.note ? ` · “${esc(x.note)}”` : ''}${x.status === 'failed' ? ` <button type="button" class="btn ghost small" data-retry="${x.id}">🔁 Retry</button>` : ''}</li>`).join('')}</ul>` : ''}</section>`;
  };

  const adminHtml = (d) => {
    const row = (t) => `<li class="cs-row" data-row="${t.id}">
<img src="${esc(mediaUrl(t.key))}" alt="">
<div class="cs-fields"><input data-f="name" value="${esc(t.name)}" maxlength="40" aria-label="Name">
<select data-f="tier" aria-label="Tier"><option value="free"${t.tier === 'free' ? ' selected' : ''}>Free</option><option value="premium"${t.tier === 'premium' ? ' selected' : ''}>Premium</option></select>
<input data-f="point_cost" type="number" min="1" value="${t.pointCost || ''}" placeholder="pts" aria-label="Point cost">
${t.kind === 'pose' ? `<input data-f="prompt" value="${esc(t.prompt)}" maxlength="200" aria-label="Prompt fragment">` : ''}</div>
<label class="cs-on"><input type="checkbox" data-f="active"${t.active ? ' checked' : ''}> Active</label>
<button type="button" class="btn small" data-save="${t.id}">Save</button></li>`;
    const premium = [...d.backgrounds, ...d.poses].filter((t) => t.tier === 'premium');
    return `<section class="cs-sec cs-admin"><h4>🛠️ Manage templates</h4>
<form id="cs-upload" class="cs-form">
<select name="kind" aria-label="Kind"><option value="bg">Background (${d.size}×${d.size} PNG)</option><option value="pose">Pose (reference image)</option></select>
<input name="name" placeholder="Name" maxlength="40" required>
<select name="tier"><option value="free">Free</option><option value="premium">Premium</option></select>
<input name="cost" type="number" min="1" placeholder="Point cost" hidden>
<input name="prompt" placeholder='Pose prompt, e.g. "arms crossed"' maxlength="200" hidden>
<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required>
<button class="btn" type="submit">⬆ Upload</button></form>
<h5>Backgrounds</h5><ul class="cs-list">${d.backgrounds.map(row).join('') || '<li class="muted">None yet.</li>'}</ul>
<h5>Poses</h5><ul class="cs-list">${d.poses.map(row).join('') || '<li class="muted">None yet.</li>'}</ul>
<h5>🎁 Grant a premium template</h5>
${premium.length ? `<form id="cs-grant" class="cs-form"><select name="user" required>${d.people.map((u) => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</select>
<select name="template" required>${premium.map((t) => `<option value="${t.id}">${esc(t.name)} (${t.kind === 'bg' ? 'background' : 'pose'})</option>`).join('')}</select>
<button class="btn" type="submit" data-act="grant">Grant</button><button class="btn ghost" type="submit" data-act="revoke">Revoke</button></form>` : '<p class="muted">Add a premium template first.</p>'}</section>`;
  };

  function tab(el, ctx) {
    const sel = { bg: null, pose: null };
    let photo = null, poll = 0, polls = 0;
    const load = async () => {
      let d, mine, queue = [];
      try { [d, mine] = await Promise.all([ctx.call('/api/cards/templates'), ctx.call('/api/cards/request')]); if (d.manage) queue = (await ctx.call('/api/cards/requests')).requests; } catch (e) { el.innerHTML = `<div class="card"><p>⚠️ ${esc(e.message)}</p></div>`; return; }
      for (const k of ['bg', 'pose']) if (sel[k] && !(k === 'bg' ? d.backgrounds : d.poses).some((t) => t.id === sel[k] && !t.locked && t.active !== false)) sel[k] = null;
      el.innerHTML = `<div class="card cs-wrap"><h3>🪪 Card Studio</h3>
<p class="muted">Pick a background and a pose for your club card. Premium looks show 🔒 until they are unlocked for you.</p>
${gallery('Background', '🌫️', d.backgrounds.filter((t) => t.active !== false), 'bg', sel.bg, 'No backgrounds yet.')}
${gallery('Pose', '💪', d.poses.filter((t) => t.active !== false), 'pose', sel.pose, 'No poses yet.')}
<p class="cs-pick muted" id="cs-pick"></p>
${requestHtml(mine, mine.month)}</div>
${d.manage ? `<div class="card cs-wrap">${queueHtml(queue)}</div><div class="card cs-wrap">${adminHtml(d)}</div>` : ''}`;
      const kitForm = $('#cs-kit', el);
      if (kitForm) kitForm.onsubmit = async e => {
        e.preventDefault(); const btn=kitForm.querySelector('button'); btn.disabled=true;
        try {
          await ctx.call('/api/cards/kit-number', { id:mine.request.id, kitNumber:kitForm.kitNumber.value === '' ? null : Number(kitForm.kitNumber.value) });
          await window.NXPlayerPortraits?.refresh(); ctx.toast('Kit number saved'); load();
        } catch(e) {ctx.toast(e.message,true); btn.disabled=false;}
      };
      loadPhotos(el, ctx);
      if (mine.request?.hasPortrait) {
        loadComposer().then(async () => {
          const portrait = $(`[data-portrait="${mine.request.id}"]`, el);
          const canvas = $(`[data-card-preview="${mine.request.id}"]`, el);
          if (!portrait || !canvas) return;
          if (!portrait.complete || !portrait.naturalWidth) await new Promise(resolve => { portrait.addEventListener('load', resolve, {once:true}); portrait.addEventListener('error', resolve, {once:true}); });
          if (!portrait.naturalWidth) return;
          const player = NXCardComposer.getPlayer(ctx);
          await NXCardComposer.draw(canvas, portrait.src, player, `${BASE}assets/crest.png`, { kitNumber: mine.request.kitNumber });
          const exportBtn = $(`[data-export-live="${mine.request.id}"]`, el);
          if (exportBtn) exportBtn.onclick = () => canvas.toBlob(blob => { if (!blob) return; const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = 'norex-player-card.png'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 30000); }, 'image/png');
        }).catch(err => ctx.toast('Card preview unavailable: ' + err.message, true));
      }
      const pick = () => {
        const name = (list, id) => list.find((t) => t.id === id)?.name;
        $('#cs-pick', el).textContent = sel.bg || sel.pose ? `Selected: ${name(d.backgrounds, sel.bg) || '—'} + ${name(d.poses, sel.pose) || '—'}` : '';
      };
      const rform = $('#cs-request', el);
      const sync = () => { if (rform) rform.querySelector('button').disabled = !(photo && (rform.avatar.checked || rform.portrait.checked) && (!rform.avatar.checked || (sel.bg && sel.pose))); };
      if (rform) rform.avatar.onchange = rform.portrait.onchange = sync;
      pick();
      sync();
      $$('.cs-tile', el).forEach((b) => {
        b.onclick = () => {
          if (b.classList.contains('locked')) { ctx.toast('That one is locked for now – ask a manager or redeem it once points open.', true); return; }
          if (b.classList.contains('off')) return;
          const k = b.dataset.kind, id = Number(b.dataset.id);
          sel[k] = sel[k] === id ? null : id;
          $$(`.cs-tile[data-kind="${k}"]`, el).forEach((x) => x.classList.toggle('on', Number(x.dataset.id) === sel[k]));
          pick();
          sync();
        };
      });
      const cancel = $('#cs-cancel', el);
      if (cancel) cancel.onclick = async () => { try { await ctx.call('/api/cards/request/cancel', {}); ctx.toast('Request cancelled'); load(); } catch (err) { ctx.toast(err.message, true); } };
      if (rform) {
        const prev = $('#cs-preview', el);
        if (photo) { prev.src = URL.createObjectURL(photo); prev.hidden = false; }
        rform.photo.onchange = async () => {
          const f = rform.photo.files[0];
          photo = f ? await shrink(f) : null;
          prev.hidden = !photo;
          if (photo) prev.src = URL.createObjectURL(photo);
          sync();
        };
        rform.onsubmit = async (e) => {
          e.preventDefault();
          if (!(photo && (rform.avatar.checked || rform.portrait.checked) && (!rform.avatar.checked || (sel.bg && sel.pose)))) return;
          const btn = rform.querySelector('button');
          btn.disabled = true;
          try {
            const r = await fetch(`${ctx.api}/api/cards/request?bg=${sel.bg}&pose=${sel.pose}&avatar=${rform.avatar.checked ? 1 : 0}&portrait=${rform.portrait.checked ? 1 : 0}&kitNumber=${encodeURIComponent(rform.kitNumber.value)}`, { method: 'POST', headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': photo.type || 'image/jpeg' }, body: photo });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
            photo = null;
            ctx.toast('Request sent – a manager will review it');
            load();
          } catch (err) { ctx.toast(err.message, true); btn.disabled = false; }
        };
      }
      $$('[data-decide]', el).forEach((b) => {
        b.onclick = async () => {
          const row = b.closest('[data-req]');
          const note = row.querySelector('[data-note]').value;
          if (b.dataset.decide === 'reject' && !note.trim()) { ctx.toast('Add a short reason so they know what to fix.', true); row.querySelector('[data-note]').focus(); return; }
          $$('button', row).forEach((x) => { x.disabled = true; });
          try { await ctx.call('/api/cards/requests/decide', { id: Number(row.dataset.req), decision: b.dataset.decide, note }); ctx.toast(b.dataset.decide === 'approve' ? 'Approved' : 'Rejected'); load(); } catch (err) { ctx.toast(err.message, true); $$('button', row).forEach((x) => { x.disabled = false; }); }
        };
      });
      $$('[data-review]', el).forEach((b) => { b.onclick = async () => { const id = Number(b.closest('[data-req]').dataset.req); b.disabled = true; try { await ctx.call('/api/cards/requests/review', { id, decision: b.dataset.review }); ctx.toast(b.dataset.review === 'publish' ? 'Published' : 'Regeneration queued'); window.NXPlayerPortraits?.refresh(); load(); } catch (e) { ctx.toast(e.message, true); b.disabled = false; } }; });
      $$('[data-retry]', el).forEach((b) => {
        b.onclick = async () => { b.disabled = true; try { await ctx.call('/api/cards/requests/retry', { id: Number(b.dataset.retry) }); ctx.toast('Retrying'); load(); } catch (err) { ctx.toast(err.message, true); b.disabled = false; } };
      });
      clearTimeout(poll);
      if (['approved', 'generating'].includes(mine.request?.status) && ++polls <= 30) poll = setTimeout(() => { if (el.isConnected) load(); }, 20000);
      if (!d.manage) return;
      const form = $('#cs-upload', el);
      const syncForm = () => {
        form.cost.hidden = form.tier.value !== 'premium';
        form.prompt.hidden = form.kind.value !== 'pose';
        form.cost.required = !form.cost.hidden;
        form.prompt.required = !form.prompt.hidden;
      };
      form.kind.onchange = form.tier.onchange = syncForm;
      syncForm();
      form.onsubmit = async (e) => {
        e.preventDefault();
        const f = form.file.files[0];
        if (!f) return;
        const q = new URLSearchParams({ kind: form.kind.value, name: form.name.value, tier: form.tier.value });
        if (!form.cost.hidden) q.set('cost', form.cost.value);
        if (!form.prompt.hidden) q.set('prompt', form.prompt.value);
        const btn = form.querySelector('button');
        btn.disabled = true;
        try {
          const r = await fetch(`${ctx.api}/api/cards/templates/upload?${q}`, { method: 'POST', headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': f.type }, body: f });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
          ctx.toast('Template uploaded');
          load();
        } catch (err) { ctx.toast(err.message, true); btn.disabled = false; }
      };
      $$('[data-save]', el).forEach((b) => {
        b.onclick = async () => {
          const row = $(`[data-row="${b.dataset.save}"]`, el);
          const get = (f) => row.querySelector(`[data-f="${f}"]`);
          const body = { id: Number(b.dataset.save), name: get('name').value, tier: get('tier').value, point_cost: Number(get('point_cost').value) || 0, active: get('active').checked };
          if (get('prompt')) body.prompt = get('prompt').value;
          try { await ctx.call('/api/cards/templates/update', body); ctx.toast('Saved'); load(); } catch (err) { ctx.toast(err.message, true); }
        };
      });
      const grant = $('#cs-grant', el);
      if (grant) {
        grant.onsubmit = async (e) => {
          e.preventDefault();
          const act = e.submitter?.dataset.act || 'grant';
          try { await ctx.call(`/api/cards/${act}`, { user: grant.user.value, template: Number(grant.template.value) }); ctx.toast(act === 'grant' ? 'Unlocked for that member' : 'Unlock removed'); } catch (err) { ctx.toast(err.message, true); }
        };
      }
    };
    el.innerHTML = '<div class="card"><p class="muted">Loading Card Studio…</p></div>';
    load();
  }

  window.NXCardStudio = { tab };
})();
