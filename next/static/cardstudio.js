// Card Studio: My Locker (member) + Staff › Artwork (managers and the owner). Only the live routes in bot/cardstudio.js:
// member: GET /api/cards/templates + /api/cards/request, POST /api/cards/request (the photo is the raw body, one a month),
// /api/cards/request/cancel, /api/cards/kit-number. Private pictures (/api/cards/photo|result/<id>) are fetched with the session
// token and shown from blob URLs. Staff: /api/cards/requests (+ decide, review, retry), template upload/update, premium grant/revoke.
// Owner: /api/cards/owner/requests (+ revoke) and photos for any player. The Discord /avatarcard card (GET /api/avatarcard) sits
// beside it. Preview = the /next/ player card through NorexArt.fitInto; PNG export = the live site's cardcomposer.js (copied at build).
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const meEl = $('#lkcards'), stEl = $('#csstaff'); if (!meEl && !stEl) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API, N = window.NOREX || {};
  if (!API || !A?.token) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const post = (path, body) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const raw = (path, blob) => A.call(path, { method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
  const put = (el, html, then) => (M ? M.land(el, html, then) : ((el.innerHTML = html), then?.(el)));
  const ok = (msg, icon = '✅') => M?.toast(msg, { kind: 'ok', icon });
  const oops = (e) => M?.toast(e.message || 'That did not work', { kind: 'err' });
  const go = (btn, work) => (M && btn ? M.submit(btn, work) : work());
  const flagOn = (f) => (A.features || []).includes(f);
  const media = (k) => `${API}/media/${k}`;
  const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
  const monthName = (m) => { try { return new Date(m + '-01T12:00:00Z').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); } catch { return m; } };
  const nextFirst = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 1).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }); };
  const players = N.full || N.players || [];
  const playerOf = (k) => k ? players.find((p) => p.id === k || p.k === k) || null : null;
  const fail = (el, what, e) => { el.removeAttribute('aria-busy'); el.innerHTML = `<div class="panel sq-empty"><span>📡</span><div><b>Could not load ${what}</b><p class="muted small">${esc(e?.message || 'The club server did not answer.')}</p><button type="button" class="btn ghost" data-csretry>↻ Try again</button></div></div>`; };
  const sure = (b, label) => { if (b.dataset.sure === '1') return true; b.dataset.sure = '1'; const t = b.textContent; b.textContent = label || 'Sure? Tap again'; setTimeout(() => { if (b.isConnected && b.dataset.sure === '1') { b.dataset.sure = ''; b.textContent = t; } }, 3500); return false; };

  // ---------- statuses (server view: pending → approved → generating → review → done; rejected = resubmit; failed after 3 tries) ----------
  const STATUS = { pending: ['⏳', 'Waiting for a manager', 's', 'PENDING'], approved: ['✅', 'Approved · in the queue to be drawn', 'w', 'APPROVED'], generating: ['🎨', 'Your card is being drawn', 'w', 'DRAWING'],
    review: ['🔎', 'Drawn · a manager is checking it', 's', 'CHECKING'], done: ['🏁', 'Your card is ready', 'w', 'READY'], rejected: ['🔁', 'Send a new photo', 'd', 'RESUBMIT'], failed: ['⚠️', 'Could not be drawn after 3 tries', 'l', 'FAILED'] };
  const STEPS = [['pending', '📨', 'Photo sent'], ['approved', '✅', 'Manager OK'], ['generating', '🎨', 'Drawing'], ['review', '🔎', 'Final check'], ['done', '🏁', 'Ready']];
  const pill = (s) => `<span class="pill ${STATUS[s]?.[2] || ''}">${STATUS[s]?.[3] || esc(String(s).toUpperCase())}</span>`;
  const stepper = (s) => { const at = s === 'failed' ? 2 : STEPS.findIndex(([k]) => k === s);
    return `<ol class="cs-steps" aria-label="Request progress">${STEPS.map(([k, i, l], n) => `<li class="${n < at || s === 'done' ? 'done' : n === at ? (s === 'failed' ? 'bad' : 'now') : ''}"${n === at ? ' aria-current="step"' : ''}><span>${n < at || s === 'done' ? '✓' : s === 'failed' && n === at ? '!' : i}</span><small>${l}</small></li>`).join('')}</ol>`; };

  // ---------- private pictures: fetched once per load with the token, shown from blob URLs ----------
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  let blobs = new Map();
  const resetPics = () => { blobs.forEach((p) => p.then((x) => URL.revokeObjectURL(x.u)).catch(() => {})); blobs = new Map(); };
  const blobOf = (path) => { if (!blobs.has(path)) blobs.set(path, fetch(API + path, { headers: { Authorization: 'Bearer ' + A.token }, cache: 'no-store' })
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); }).then((b) => ({ u: URL.createObjectURL(b), type: b.type })).catch((e) => { blobs.delete(path); throw e; })); return blobs.get(path); };
  const picPath = (kind, id) => kind === 'photo' ? `/api/cards/photo/${id}` : `/api/cards/result/${id}${kind === 'portrait' ? '?kind=portrait' : ''}`;
  const fig = (kind, id, cap, name) => `<figure class="cs-fig ${kind}"><span class="cs-ph"><img data-pv="${kind}" data-id="${id}" alt="${esc(cap)}"></span><figcaption>${esc(cap)}</figcaption>${name ? `<a class="btn ghost" data-save href="#" download="${esc(name)}" hidden>⬇ Save</a>` : ''}</figure>`;
  const fillPics = (root) => Promise.all($$('[data-pv]', root).map(async (img) => {
    try { const { u, type } = await blobOf(picPath(img.dataset.pv, img.dataset.id)); img.src = u; img.closest('.cs-ph')?.classList.add('in');
      img.closest('figure')?.querySelectorAll('[data-save]').forEach((a) => { a.href = u; a.hidden = false; if (img.dataset.pv === 'photo') a.download = `norex-upload-${img.dataset.id}.${EXT[type] || 'jpg'}`; }); }
    catch { img.closest('.cs-ph')?.replaceWith(Object.assign(d.createElement('span'), { className: 'cs-gone', textContent: img.dataset.pv === 'photo' ? '📷 Photo removed' : '🖼️ Artwork removed' })); }
  }));
  // phone photos can be 10 MB+: send a 1600 px JPEG instead (keeps the original when that is smaller), like the live studio
  async function shrink(file) {
    try { const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = d.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9)); return blob && blob.size < file.size ? blob : file; } catch { return file; }
  }
  const imageOk = (f) => f && ['image/png', 'image/jpeg', 'image/webp'].includes(f.type);

  // ---------- the player card preview + PNG export ----------
  const myPlayer = () => playerOf(A.player) || { k: '', n: A.name || 'You', ovr: null, line: '', goals: 0, assists: 0, rating: 0, pass: null, tackleRate: null, gp: 0 };
  // keepArt: leave data-k on, so the published portrait (NorexArt map) shows; otherwise a blob is fitted in by hand
  const cardBox = (keepArt) => { const html = window.NorexCards ? NorexCards.cardHTML(myPlayer(), { link: false, s: 1 }) : ''; return keepArt ? html : html.replace(/ data-k="[^"]*"/, ''); };
  const loadComposer = () => (window.NXCardComposer ? Promise.resolve() : new Promise((res, no) => d.head.appendChild(Object.assign(d.createElement('script'), { src: 'cardcomposer.js', onload: res, onerror: () => no(new Error('The card maker did not load')) }))));
  async function exportCard(btn, url, kit) {
    await go(btn, async () => { await loadComposer(); const p = myPlayer(), c = d.createElement('canvas');
      await NXCardComposer.draw(c, url, { ovr: p.ovr, pos: p.line, n: p.n, s: { g: p.goals, a: p.assists, r: p.rating, p: p.pass, t: p.tackleRate, gp: p.gp } }, 'crest.png', { kitNumber: kit === '' ? null : kit });
      const blob = await new Promise((res) => c.toBlob(res, 'image/png')); if (!blob) throw new Error('Could not build the picture');
      const u = URL.createObjectURL(blob), a = Object.assign(d.createElement('a'), { href: u, download: 'norex-player-card.png' }); d.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); });
    ok('Player card saved', '⬇');
  }
  const kitInput = (v, id) => `<div class="cs-kit" role="group" aria-label="Kit number"><button type="button" class="btn ghost" data-kit="-1" aria-label="One lower">−</button><input id="${id}" class="num" inputmode="numeric" maxlength="2" value="${esc(v ?? '')}" placeholder="–" aria-label="Kit number, 0 to 99, optional"><button type="button" class="btn ghost" data-kit="1" aria-label="One higher">＋</button></div>`;
  const kitVal = (inp) => { const v = String(inp?.value ?? '').replace(/\D/g, '').slice(0, 2); return v === '' ? '' : String(Math.min(99, +v)); };
  const stepKit = (inp, by) => { const v = kitVal(inp); inp.value = v === '' ? (by > 0 ? '0' : '99') : String((+v + by + 100) % 100); inp.dispatchEvent(new Event('input', { bubbles: true })); };

  // ================= 🪪 MEMBER: my card =================
  let T = null, R = null, AV = null, waiting = 0, sel = { bg: null, pose: null }, photo = null, photoUrl = '', outs = { avatar: true, portrait: true }, kit = '', poll = 0, polls = 0;
  const tile = (t, kind) => `<button type="button" class="cs-tile${sel[kind] === t.id ? ' on' : ''}${t.locked ? ' locked' : ''}" data-tid="${t.id}" data-kind="${kind}" aria-pressed="${sel[kind] === t.id}"${t.locked ? ' aria-disabled="true"' : ''}>
<span class="cs-th"><img src="${esc(media(t.key))}" alt="" loading="lazy">${t.locked ? '<i aria-hidden="true">🔒</i>' : ''}</span><b>${esc(t.name)}</b><small>${t.tier === 'premium' ? (t.locked ? `⭐ ${t.pointCost} pts` : '⭐ Unlocked') : 'Free'}</small></button>`;
  const gallery = (title, list, kind, empty) => `<div class="cs-gal"><h5>${title}</h5>${list.length ? `<div class="cs-tiles">${list.map((t) => tile(t, kind)).join('')}</div>` : `<p class="muted small">${empty}</p>`}</div>`;
  const why = () => !photo ? 'Choose a photo first' : !outs.avatar && !outs.portrait ? 'Pick at least one thing to make' : outs.avatar && !(sel.bg && sel.pose) ? `Pick a ${sel.bg ? 'pose' : sel.pose ? 'background' : 'background and a pose'} for the cinematic avatar` : '';
  const statusHtml = () => { const r = R?.request, s = r?.status, [ic, label] = s ? STATUS[s] || ['•', s] : ['🪪', 'No request yet'];
    const thisMonth = r && r.month === R.month, open = !r || s === 'rejected' || !thisMonth;
    const outsLine = r ? [r.avatarEnabled !== false && '🎬 Cinematic avatar', r.portraitEnabled && '🪪 Website portrait'].filter(Boolean).join(' + ') : '';
    return `<div class="panel cs-stat${s ? ' s-' + s : ''}"><div class="cs-sh"><div class="eyebrow">📆 ${esc(monthName(r?.month || R.month))}</div>${s ? pill(s) : ''}</div>
<div class="cs-sl"><span class="cs-si" aria-hidden="true">${ic}</span><div><h3>${esc(label)}</h3><p class="muted small">${r ? `${esc(outsLine)}${r.avatarEnabled !== false && (r.bg || r.pose) ? ` · ${esc(r.bg || '–')} + ${esc(r.pose || '–')}` : ''}${r.kitNumber != null ? ` · 👕 #${r.kitNumber}` : ''} · sent ${esc(ago(r.createdAt))}` : 'One request a month. A manager checks the photo before anything is drawn.'}</p></div></div>
${s && s !== 'rejected' ? stepper(s) : ''}
${r?.note ? `<p class="cs-note${s === 'rejected' ? ' bad' : ''}">💬 “${esc(r.note)}”</p>` : ''}
${s === 'rejected' ? '<p class="small">Fix what the manager asked and send a new photo below. It does not use up your month.</p>' : ''}
${s === 'failed' ? '<p class="small">A manager has been told and can try again. You do not need to send anything.</p>' : ''}
${s === 'approved' || s === 'generating' ? '<p class="small muted">⏱️ Usually a few minutes. This page checks again by itself.</p>' : ''}
${!open && s === 'done' ? `<p class="small muted">Your next request opens on ${esc(nextFirst())}.</p>` : ''}
${r && ['pending', 'approved', 'generating', 'failed'].includes(s) && r.hasPhoto ? `<div class="cs-mine">${fig('photo', r.id, 'The photo you sent')}</div>` : ''}
<div class="sq-acts">${s === 'pending' ? '<button type="button" class="btn ghost" data-cscancel>✖ Cancel request</button>' : ''}${waiting ? `<a class="btn ghost" href="staff-artwork.html">📥 ${waiting} waiting for staff ›</a>` : ''}</div></div>`; };
  const sentPhoto = () => { const r = R?.request; return !photo && r?.hasPhoto && ['pending', 'approved', 'generating'].includes(r.status) ? r.id : null; };
  const previewHtml = () => { const r = R?.request, ready = r?.status === 'done' && r.hasPortrait, rough = photo || sentPhoto();
    return `<div class="panel cs-prev"><div class="eyebrow">👀 ${ready ? 'Your player card' : rough ? 'Rough preview' : 'Your card today'}</div><div class="cs-card" id="cs-card">${cardBox(!ready && !rough)}</div>
<p class="tiny muted">${ready ? 'Live numbers from the club data. Change the kit number and the shirt follows.' : rough ? 'Your photo on the card. The finished portrait is drawn in the club style.' : 'Approved portraits show on every card on the site.'}</p>
${ready ? `<label class="pf-l">👕 Kit number <small class="muted">0–99, empty for none</small>${kitInput(r.kitNumber, 'cs-kitdone')}</label><div class="sq-acts"><button type="button" class="btn ghost" data-kitsave hidden>💾 Save number</button><button type="button" class="btn gold" data-export>⬇ Export player card</button></div>` : ''}</div>`; };
  const artHtml = () => { const r = R?.request; if (!(r?.status === 'done' && (r.hasResult || r.hasPortrait))) return '';
    return `<div class="panel cs-art"><div class="eyebrow">🖼️ Your artwork · ${esc(monthName(r.month))}</div><div class="cs-figs">${r.hasResult ? fig('avatar', r.id, 'Cinematic avatar', `norex-avatar-${r.month}.png`) : ''}${r.hasPortrait ? fig('portrait', r.id, 'Website portrait', `norex-portrait-${r.month}.png`) : ''}</div>
<p class="tiny muted">Use the avatar as your Discord picture: Discord › Settings › Profiles › Change avatar. Discord does not let bots set it for you.</p></div>`; };
  const formHtml = () => { const bgs = T.backgrounds.filter((t) => t.active !== false), poses = T.poses.filter((t) => t.active !== false), w = why();
    return `<form class="panel cs-form" id="cs-form" novalidate><div class="eyebrow">📸 Request my card · ${esc(monthName(R.month))}</div>
<div class="cs-fg"><div class="cs-step"><h5><i>1</i> Your photo</h5><label class="cs-drop${photo ? ' has' : ''}" id="cs-drop"><input type="file" id="cs-file" accept="image/png,image/jpeg,image/webp"><img id="cs-pimg" alt="Your photo"${photoUrl ? ` src="${esc(photoUrl)}"` : ' hidden'}><span class="cs-dt">${photo ? '🔁 Change photo' : '📷 Choose or drop a photo'}</span></label>
<ul class="cs-tips tiny muted"><li>🙂 Face the camera, head and shoulders</li><li>💡 Good light, plain background</li><li>📁 PNG, JPG or WEBP up to 8 MB</li></ul></div>
<div class="cs-step"><h5><i>2</i> What to make</h5><div class="cs-outs">${[['avatar', '🎬', 'Cinematic avatar', 'A club-style scene with your pose. Great as a Discord picture.'], ['portrait', '🪪', 'Website portrait', 'Your face on every player card on the site.']].map(([k, i, t, s]) => `<button type="button" class="cs-out${outs[k] ? ' on' : ''}" role="switch" aria-checked="${outs[k]}" data-out="${k}"><span aria-hidden="true">${i}</span><b>${t}</b><small>${s}</small></button>`).join('')}</div>
<label class="pf-l">👕 Kit number <small class="muted">optional</small>${kitInput(kit, 'cs-kitn')}</label></div></div>
<div class="cs-looks"${outs.avatar ? '' : ' hidden'}><h5 class="cs-lh"><i>3</i> Pick a look <small class="muted">${T.backgrounds.some((t) => t.locked) || T.poses.some((t) => t.locked) ? '🔒 premium looks open when a manager unlocks them for you' : ''}</small></h5>${gallery('🌫️ Background', bgs, 'bg', 'No backgrounds yet. Turn off the cinematic avatar to ask for just the portrait.')}${gallery('💪 Pose', poses, 'pose', 'No poses yet.')}</div>
<div class="cs-send"><p class="small" id="cs-why" aria-live="polite">${w ? `👉 ${esc(w)}` : `✅ Ready: ${[outs.avatar && 'cinematic avatar', outs.portrait && 'website portrait'].filter(Boolean).join(' + ')}${kit !== '' ? ` · #${esc(kit)}` : ''}`}</p><button type="submit" class="btn gold" id="cs-go"${w ? ' disabled' : ''}>📨 Send to a manager</button></div></form>`; };
  const avHtml = () => ""; // the old Discord /avatarcard panel is retired: Card Studio replaces it (FEEDBACK-1 #21)
  const avHtmlOld = () => !flagOn('avatarCard') ? '' : AV ? `<div class="panel cs-av"><div class="eyebrow">🎮 Your card from Discord</div><div class="cs-avc" style="background-image:url('${esc(media(AV.bgKey))}')"><img class="cs-avp" src="${esc(media(AV.photoKey))}" alt="" crossorigin="anonymous"><img class="cs-avk" src="crest.png" alt=""><b>${esc(A.name || 'NOREX')}</b><i aria-hidden="true">★★★★★</i></div>
<div class="sq-acts"><button type="button" class="btn ghost" data-avdl>⬇ Download PNG</button></div><p class="tiny muted">Made ${esc(ago(AV.at))} with <code>/avatarcard</code> in Discord. Run it again for a new one.</p></div>`
    : `<div class="panel cs-av sq-empty"><span>🎮</span><div><b>Your card from Discord</b><p class="muted small">Type <code>/avatarcard</code> in the club Discord and attach a photo. The bot draws a club background for it and the card shows up here to download.</p></div></div>`;
  const meHtml = () => { const r = R?.request, open = !r || r.status === 'rejected' || r.month !== R.month;
    if (!flagOn('cardStudio')) return `<div class="cs-top">${avHtml() || '<div class="panel sq-empty"><span>🎨</span><div><b>Card Studio is not switched on for you yet</b><p class="muted small">It opens here as soon as the club turns it on.</p></div></div>'}</div>`;
    return `<div class="cs-top">${statusHtml()}${previewHtml()}</div>${artHtml()}${open ? formHtml() : ''}${avHtml() ? `<div class="cs-low">${avHtml()}</div>` : ''}`; };
  // after a paint: private pictures, the card preview, the polling while a card is being drawn
  const afterMe = async () => { fillPics(meEl); const r = R?.request, box = $('#cs-card .pc', meEl);
    clearTimeout(poll); if (['approved', 'generating'].includes(r?.status) && ++polls <= 30) poll = setTimeout(() => { if (meEl.isConnected) loadMe(true); }, 20000);
    if (!box) return;
    try { if (r?.status === 'done' && r.hasPortrait) { const { u } = await blobOf(picPath('portrait', r.id)); await window.NorexArt?.fitInto(box, u, r.kitNumber ?? ''); }
      else if (photoUrl) await window.NorexArt?.fitInto(box, photoUrl, kit);
      else if (sentPhoto()) { const { u } = await blobOf(picPath('photo', r.id)); await window.NorexArt?.fitInto(box, u, r.kitNumber ?? ''); } else window.NorexArt?.apply(box.parentNode); } catch {} };
  const paintMe = (land) => (land ? put(meEl, meHtml(), afterMe) : ((meEl.innerHTML = meHtml()), afterMe()));
  const syncForm = () => { const w = why(), b = $('#cs-go', meEl), p = $('#cs-why', meEl); if (!b) return; b.disabled = !!w;
    p.textContent = w ? `👉 ${w}` : `✅ Ready: ${[outs.avatar && 'cinematic avatar', outs.portrait && 'website portrait'].filter(Boolean).join(' + ')}${kit !== '' ? ` · #${kit}` : ''}`; };
  async function loadMe(quiet) {
    if (!quiet) M?.skeleton(meEl, 4);
    await (A.ready || Promise.resolve()); resetPics();
    try { const on = flagOn('cardStudio');
      const [t, r, av] = await Promise.all([on ? A.call('/api/cards/templates') : null, on ? A.call('/api/cards/request') : null, flagOn('avatarCard') ? A.call('/api/avatarcard').then((x) => x.card).catch(() => null) : null]);
      T = t; R = r; AV = av; waiting = 0;
      if (T?.manage) A.call('/api/cards/requests').then((q) => { const n = q.requests.filter((x) => x.status === 'pending' || x.status === 'review').length; if (n !== waiting) { waiting = n; const a = $('.cs-stat .sq-acts', meEl); if (a && n) { a.insertAdjacentHTML('beforeend', `<a class="btn ghost" href="staff-artwork.html">📥 ${n} waiting for staff ›</a>`); } } }).catch(() => {});
      for (const k of ['bg', 'pose']) if (sel[k] && !(T?.[k === 'bg' ? 'backgrounds' : 'poses'] || []).some((x) => x.id === sel[k] && !x.locked)) sel[k] = null;
      paintMe(!quiet);
    } catch (e) { fail(meEl, 'Card Studio', e); }
  }
  if (meEl) {
    const setPhoto = async (f) => { if (!f) return; if (!imageOk(f)) { M?.toast('Use a PNG, JPG or WEBP photo', { kind: 'err' }); return; }
      if (f.size > 25e6) { M?.toast('That photo is too big. Pick a smaller one', { kind: 'err' }); return; }
      photo = await shrink(f); if (photo.size > 8e6) { photo = null; M?.toast('That photo is still over 8 MB after shrinking', { kind: 'err' }); return; }
      if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = URL.createObjectURL(photo);
      const img = $('#cs-pimg', meEl); img.src = photoUrl; img.hidden = false; $('#cs-drop', meEl).classList.add('has'); $('.cs-dt', meEl).textContent = '🔁 Change photo';
      const box = $('#cs-card .pc', meEl); if (box) { $('#cs-card', meEl).innerHTML = cardBox(false); window.NorexArt?.fitInto($('#cs-card .pc', meEl), photoUrl, kit).catch(() => {}); $('.cs-prev .eyebrow', meEl).textContent = '👀 Rough preview'; }
      M?.pulse($('#cs-drop', meEl)); syncForm(); };
    meEl.addEventListener('change', (e) => { if (e.target.id === 'cs-file') setPhoto(e.target.files[0]); });
    meEl.addEventListener('dragover', (e) => { const z = e.target.closest('#cs-drop'); if (z) { e.preventDefault(); z.classList.add('over'); } });
    meEl.addEventListener('dragleave', (e) => e.target.closest('#cs-drop')?.classList.remove('over'));
    meEl.addEventListener('drop', (e) => { const z = e.target.closest('#cs-drop'); if (!z) return; e.preventDefault(); z.classList.remove('over'); setPhoto(e.dataTransfer.files[0]); });
    meEl.addEventListener('input', (e) => { const t = e.target; if (t.id !== 'cs-kitn' && t.id !== 'cs-kitdone') return; const v = kitVal(t); if (t.value !== v) t.value = v;
      const box = $('#cs-card .pc', meEl), k = box?.querySelector('.kit'); if (k) { k.textContent = v; box.classList.toggle('has-kit', v !== ''); }
      if (t.id === 'cs-kitn') { kit = v; syncForm(); } else { const sv = $('[data-kitsave]', meEl); if (sv) sv.hidden = v === String(R.request.kitNumber ?? ''); } });
    meEl.addEventListener('submit', async (e) => { if (e.target.id !== 'cs-form') return; e.preventDefault(); if (why()) return;
      const q = new URLSearchParams({ bg: sel.bg ?? '', pose: sel.pose ?? '', avatar: outs.avatar ? '1' : '0', portrait: outs.portrait ? '1' : '0', kitNumber: kit });
      try { R = await go($('#cs-go', meEl), () => raw('/api/cards/request?' + q, photo)); photo = null; if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = ''; kit = ''; polls = 0;
        ok('Sent. A manager will check your photo', '📨'); setTimeout(() => paintMe(true), M?.off() ? 0 : 450); } catch (er) { oops(er); } });
    meEl.addEventListener('click', async (e) => { const t = e.target;
      const ti = t.closest('[data-tid]');
      if (ti) { if (ti.classList.contains('locked')) { M?.toast('Locked for now. A manager can unlock premium looks for you', { icon: '🔒' }); M?.pulse(ti); return; }
        const k = ti.dataset.kind, id = +ti.dataset.tid; sel[k] = sel[k] === id ? null : id;
        $$(`[data-kind="${k}"]`, meEl).forEach((x) => { const on = +x.dataset.tid === sel[k]; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); syncForm(); return; }
      const o = t.closest('[data-out]');
      if (o) { const k = o.dataset.out; outs[k] = !outs[k]; o.classList.toggle('on', outs[k]); o.setAttribute('aria-checked', outs[k]); const lk = $('.cs-looks', meEl); if (lk) lk.hidden = !outs.avatar; syncForm(); return; }
      const kb = t.closest('[data-kit]'); if (kb) { stepKit(kb.parentElement.querySelector('input'), +kb.dataset.kit); return; }
      const ks = t.closest('[data-kitsave]');
      if (ks) { const v = kitVal($('#cs-kitdone', meEl));
        try { await go(ks, () => post('/api/cards/kit-number', { id: R.request.id, kitNumber: v === '' ? null : +v })); R.request.kitNumber = v === '' ? null : +v; ks.hidden = true; window.NorexArt?.refresh(); ok(v === '' ? 'Kit number removed' : `Kit number #${v} saved`, '👕'); } catch (er) { oops(er); } return; }
      const ex = t.closest('[data-export]');
      if (ex) { try { const { u } = await blobOf(picPath('portrait', R.request.id)); await exportCard(ex, u, kitVal($('#cs-kitdone', meEl))); } catch (er) { oops(er); } return; }
      const cc = t.closest('[data-cscancel]');
      if (cc) { if (!sure(cc, 'Cancel it? Tap again')) return; try { R = await go(cc, () => post('/api/cards/request/cancel', {})); ok('Request cancelled. You can send a new one', '✖'); paintMe(true); } catch (er) { oops(er); } return; }
      const dl = t.closest('[data-avdl]'); if (dl) { try { await go(dl, () => avDownload(AV, A.name || 'NOREX')); } catch { M?.toast('Could not build the download. Try again', { kind: 'err' }); } }
    });
  }
  // the Discord card as one PNG (the live site's layout: background, round photo with a red ring, crest, name, five stars)
  async function avDownload(card, name) {
    const W = 1080, H = 1350, c = d.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), red = '#c8352c'; await d.fonts?.ready;
    const img = (src, cors = true) => new Promise((res) => { const i = new Image(); if (cors) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    const [bg, ph, cr] = await Promise.all([img(media(card.bgKey)), img(media(card.photoKey)), img('crest.png', false)]);
    const cover = (im, w, h) => { const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s; return [(w - iw) / 2, (h - ih) / 2, iw, ih]; };
    g.fillStyle = '#0b0f16'; g.fillRect(0, 0, W, H); if (bg) g.drawImage(bg, ...cover(bg, W, H));
    const gr = g.createLinearGradient(0, H * .55, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const S = 640, cx = W / 2, cy = H * .42;
    if (ph) { g.save(); g.beginPath(); g.arc(cx, cy, S / 2, 0, Math.PI * 2); g.clip(); const [x, y, w, h] = cover(ph, S, S); g.drawImage(ph, cx - S / 2 + x, cy - S / 2 + y, w, h); g.restore(); g.beginPath(); g.arc(cx, cy, S / 2, 0, Math.PI * 2); g.lineWidth = 10; g.strokeStyle = red; g.stroke(); }
    if (cr) { const h = 92, w = cr.naturalWidth / cr.naturalHeight * h; g.drawImage(cr, W / 2 - w / 2, 56, w, h); }
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '700 54px Oswald, Impact, sans-serif'; g.fillText(String(name).toUpperCase().slice(0, 24), W / 2, cy + S / 2 + 80);
    g.fillStyle = '#f5d061'; g.font = '600 30px Oswald, Impact, sans-serif'; g.fillText('★  ★  ★  ★  ★', W / 2, cy + S / 2 + 128); g.fillStyle = red; g.fillRect(0, H - 14, W, 14);
    const blob = await new Promise((res) => { try { c.toBlob(res, 'image/png'); } catch { res(null); } }); if (!blob) throw new Error('blocked');
    const u = URL.createObjectURL(blob), a = Object.assign(d.createElement('a'), { href: u, download: `${name}-norex-card.png`.replace(/[^\w.-]+/g, '_') }); d.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000);
  }

  // ================= 🛡️ STAFF: review queue, player artwork (owner), looks =================
  let ST = null, Q = [], OW = [], tab = 'review', grantUser = '';
  const nameOf = (x) => playerOf(x.targetPlayer || x.player)?.n || x.user || 'Member';
  const outsOf = (x) => [x.avatarEnabled !== false && '🎬 avatar', x.portraitEnabled && '🪪 portrait'].filter(Boolean).join(' + ');
  const reviewHtml = () => { const rev = Q.filter((x) => x.status === 'review'), pend = Q.filter((x) => x.status === 'pending'), rest = Q.filter((x) => !['pending', 'review'].includes(x.status));
    return `${rev.length ? `<h4 class="al-day">🔎 Drawn, waiting for your check <span class="cs-n num">${rev.length}</span></h4><ul class="cs-q">${rev.map((x) => `<li class="panel cs-qr" data-rq="${x.id}"><div class="cs-figs sm">${x.hasResult ? fig('avatar', x.id, 'Cinematic avatar') : ''}${x.hasPortrait ? fig('portrait', x.id, 'Website portrait') : ''}</div>
<div class="cs-qi"><b>${esc(nameOf(x))}</b><small class="muted">${esc(outsOf(x))}${x.kitNumber != null ? ` · #${x.kitNumber}` : ''} · ${esc(monthName(x.month))}</small><p class="tiny muted">Check the face, framing, kit colours and background before it goes on the site.</p></div>
<div class="cs-qa"><button type="button" class="btn gold" data-rv="publish">✅ Publish</button><button type="button" class="btn ghost" data-rv="regenerate">🔁 Draw again</button></div></li>`).join('')}</ul>` : ''}
<h4 class="al-day">📥 Photos waiting <span class="cs-n num">${pend.length}</span></h4>${pend.length ? `<ul class="cs-q">${pend.map((x) => `<li class="panel cs-qr" data-rq="${x.id}">${x.hasPhoto ? fig('photo', x.id, `Photo from ${nameOf(x)}`) : '<span class="cs-gone">📷 No photo</span>'}
<div class="cs-qi"><b>${esc(nameOf(x))}</b><small class="muted">${esc(outsOf(x))}${x.avatarEnabled !== false ? ` · ${esc(x.bg || '–')} + ${esc(x.pose || '–')}` : ''}${x.kitNumber != null ? ` · #${x.kitNumber}` : ''} · ${esc(ago(x.createdAt))}</small><label class="pf-l"><span class="sr">Reason</span><input data-note maxlength="200" placeholder="Reason (needed to send it back)"></label></div>
<div class="cs-qa"><button type="button" class="btn gold" data-dc="approve">✅ Approve</button><button type="button" class="btn ghost" data-dc="reject">🔁 Ask for a new photo</button></div></li>`).join('')}</ul>` : '<div class="panel sq-empty"><span>🎉</span><div><b>Nothing waiting</b><p class="muted small">New photos land here and you get an alert.</p></div></div>'}
${rest.length ? `<h4 class="al-day">🕘 Last 14 days</h4><ul class="cs-rec">${rest.map((x) => `<li>${pill(x.status)}<b>${esc(nameOf(x))}</b><small class="muted">${x.decider ? `by ${esc(x.decider)}` : ''}${x.decidedAt ? ` · ${esc(ago(x.decidedAt))}` : ''}${x.note ? ` · “${esc(x.note)}”` : ''}</small>${x.status === 'failed' ? `<button type="button" class="al-mk" data-retry="${x.id}">🔁 Try again</button>` : ''}</li>`).join('')}</ul>` : ''}`; };
  const ownerHtml = () => `<form class="panel cs-of" id="cs-of"><div class="eyebrow">👑 Photo for any player</div><p class="tiny muted">The website portrait only. It still goes through the final check before it shows on the site.</p>
<div class="cs-ofg"><label class="pf-l">Player<select name="player" required><option value="">Choose a player</option>${[...players].sort((a, b) => String(a.n).localeCompare(String(b.n))).map((p) => `<option value="${esc(p.id)}">${esc(p.n)}</option>`).join('')}</select></label>
<label class="pf-l">Photo<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required></label><label class="pf-l">👕 Kit number${kitInput('', 'cs-okit')}</label><button class="btn gold" type="submit">📨 Send for the check</button></div></form>
<h4 class="al-day">🗂️ Uploads and artwork <span class="cs-n num">${OW.length}</span></h4>${OW.length ? `<ul class="cs-ow">${OW.map((x) => `<li class="panel cs-or" data-or="${x.id}"><div class="cs-sh"><b>${esc(nameOf(x))}</b>${pill(x.status)}</div><small class="muted">${esc(monthName(x.month))}${x.note ? ` · ${esc(x.note)}` : ''}</small>
<div class="cs-figs sm">${x.hasPhoto ? fig('photo', x.id, 'Uploaded photo', 'x') : '<span class="cs-gone">📷 Source photo gone</span>'}${x.hasPortrait ? fig('portrait', x.id, 'Portrait', `norex-portrait-${x.id}.png`) : ''}${x.hasResult ? fig('avatar', x.id, 'Avatar', `norex-avatar-${x.id}.png`) : ''}</div>
<div class="cs-orf">${kitInput(x.kitNumber, 'cs-ok' + x.id)}<button type="button" class="btn ghost" data-okit="${x.id}">💾 Number</button>${x.status !== 'rejected' ? `<button type="button" class="btn ghost" data-orv="${x.id}">↩ Revoke · allow resubmit</button>` : '<span class="pill d">RESUBMIT OPEN</span>'}</div></li>`).join('')}</ul>` : '<div class="panel sq-empty"><span>🗂️</span><div><b>No uploads yet</b></div></div>'}`;
  const looksHtml = () => { const all = [...ST.backgrounds, ...ST.poses], prem = all.filter((t) => t.tier === 'premium');
    const row = (t) => `<li class="panel cs-lr${t.active ? '' : ' off'}" data-lr="${t.id}"><span class="cs-th"><img src="${esc(media(t.key))}" alt="" loading="lazy"></span><div class="cs-lf"><input data-f="name" value="${esc(t.name)}" maxlength="40" aria-label="Name">
<div class="seg cs-tier" role="radiogroup" aria-label="Tier">${['free', 'premium'].map((v) => `<button type="button" role="radio" aria-checked="${t.tier === v}" class="${t.tier === v ? 'on' : ''}" data-tier="${v}">${v === 'free' ? 'Free' : '⭐ Premium'}</button>`).join('')}</div>
<input data-f="point_cost" type="number" min="1" max="100000" value="${t.pointCost || ''}" placeholder="pts" aria-label="Point cost"${t.tier === 'premium' ? '' : ' hidden'}>${t.kind === 'pose' ? `<input data-f="prompt" value="${esc(t.prompt)}" maxlength="200" aria-label="Pose description" placeholder="e.g. arms crossed">` : ''}</div>
<div class="cs-la"><button type="button" class="cs-sw${t.active ? ' on' : ''}" role="switch" aria-checked="${!!t.active}" data-act aria-label="Shown to members"><i></i></button><small>${t.active ? 'Shown' : 'Hidden'}</small><button type="button" class="btn ghost" data-lsave hidden>💾 Save</button></div></li>`;
    return `<form class="panel cs-up" id="cs-up"><div class="eyebrow">⬆ Add a look</div><div class="cs-ofg"><div class="seg" role="radiogroup" aria-label="Kind">${[['bg', '🌫️ Background'], ['pose', '💪 Pose']].map(([v, l], i) => `<button type="button" role="radio" aria-checked="${!i}" class="${i ? '' : 'on'}" data-ukind="${v}">${l}</button>`).join('')}</div>
<label class="pf-l">Name<input name="name" maxlength="40" required placeholder="e.g. Crimson ribbon"></label><label class="pf-l">Tier<select name="tier"><option value="free">Free</option><option value="premium">⭐ Premium</option></select></label>
<label class="pf-l" data-ucost hidden>Point cost<input name="cost" type="number" min="1" max="100000" placeholder="e.g. 500"></label><label class="pf-l" data-uprompt hidden>Pose description<input name="prompt" maxlength="200" placeholder='e.g. "arms crossed, smiling"'></label>
<label class="pf-l">Image <small class="muted" data-uhint>${ST.size}×${ST.size} PNG</small><input name="file" type="file" accept="image/png,image/jpeg,image/webp" required></label><button class="btn gold" type="submit">⬆ Upload</button></div></form>
<h4 class="al-day">🌫️ Backgrounds <span class="cs-n num">${ST.backgrounds.length}</span></h4><ul class="cs-ls">${ST.backgrounds.map(row).join('') || '<li class="muted small">None yet.</li>'}</ul>
<h4 class="al-day">💪 Poses <span class="cs-n num">${ST.poses.length}</span></h4><ul class="cs-ls">${ST.poses.map(row).join('') || '<li class="muted small">None yet.</li>'}</ul>
<h4 class="al-day">🎁 Unlock a premium look for someone</h4>${prem.length ? `<form class="panel cs-gr" id="cs-gr"><div class="cs-ofg"><label class="pf-l">Member<select name="user" required>${(ST.people || []).map((u) => `<option value="${esc(u.id)}"${u.id === grantUser ? ' selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
<label class="pf-l">Look<select name="template" required>${prem.map((t) => `<option value="${t.id}">${esc(t.name)} · ${t.kind === 'bg' ? 'background' : 'pose'} · ${t.pointCost} pts</option>`).join('')}</select></label><div class="sq-acts"><button class="btn gold" type="submit" data-gact="grant">🎁 Unlock</button><button class="btn ghost" type="submit" data-gact="revoke">↩ Take back</button></div></div></form>` : '<p class="muted small">Make a look premium first.</p>'}`; };
  const staffHtml = () => { if (!ST.manage) return '<div class="panel sq-empty"><span>🛡️</span><div><b>Managers only</b><p class="muted small">Your own card lives in My Locker › Card Studio.</p><a class="btn ghost" href="hub.html#lk-cards">🎨 My Card Studio</a></div></div>';
    const n = Q.filter((x) => ['pending', 'review'].includes(x.status)).length, TABS = [['review', '📥', 'Review', n], ...(ST.owner ? [['owner', '👑', 'Player artwork', OW.length]] : []), ['looks', '🎨', 'Looks', ST.backgrounds.length + ST.poses.length]];
    if (!TABS.some(([k]) => k === tab)) tab = 'review';
    return `<div class="sq-bar"><div class="chips" role="tablist" aria-label="Card Studio staff">${TABS.map(([k, i, l, c]) => `<button type="button" role="tab" class="chip${k === tab ? ' on' : ''}" aria-selected="${k === tab}" data-stab="${k}">${i} ${l} <small class="muted num">${c}</small></button>`).join('')}</div><a class="btn ghost" href="hub.html#lk-cards">🎨 My own card ›</a></div>
<div id="cs-pane">${tab === 'review' ? reviewHtml() : tab === 'owner' ? ownerHtml() : looksHtml()}</div>`; };
  const paintStaff = (land) => (land ? put(stEl, staffHtml(), () => fillPics(stEl)) : ((stEl.innerHTML = staffHtml()), fillPics(stEl)));
  async function loadStaff(quiet) {
    if (!quiet) M?.skeleton(stEl, 5);
    await (A.ready || Promise.resolve());
    if (!flagOn('cardStudio')) { put(stEl, '<div class="panel sq-empty"><span>🎨</span><div><b>Card Studio is switched off</b><p class="muted small">Turn on the cardStudio feature to review photos here.</p></div></div>'); return; }
    resetPics();
    try { ST = await A.call('/api/cards/templates'); [Q, OW] = await Promise.all([ST.manage ? A.call('/api/cards/requests').then((x) => x.requests) : [], ST.owner ? A.call('/api/cards/owner/requests').then((x) => x.requests) : []]);
      paintStaff(!quiet); } catch (e) { fail(stEl, 'the review queue', e); }
  }
  const refreshStaff = () => { window.NorexArt?.refresh(); return loadStaff(true); };
  if (stEl) {
    stEl.addEventListener('click', async (e) => { const t = e.target;
      const tb = t.closest('[data-stab]'); if (tb) { if (tb.dataset.stab !== tab) { tab = tb.dataset.stab; paintStaff(false); M?.pulse($('#cs-pane', stEl)); } return; }
      const kb = t.closest('[data-kit]'); if (kb) { stepKit(kb.parentElement.querySelector('input'), +kb.dataset.kit); return; }
      const dc = t.closest('[data-dc]');
      if (dc) { const li = dc.closest('[data-rq]'), note = $('[data-note]', li).value.trim();
        if (dc.dataset.dc === 'reject' && !note) { M?.toast('Add a short reason so they know what to fix', { kind: 'err' }); $('[data-note]', li).focus(); return; }
        try { await go(dc, () => post('/api/cards/requests/decide', { id: +li.dataset.rq, decision: dc.dataset.dc, note })); ok(dc.dataset.dc === 'approve' ? 'Approved. It goes in the drawing queue' : 'Sent back with your reason', dc.dataset.dc === 'approve' ? '✅' : '🔁');
          const box = li.parentElement; M ? M.flip(box, () => li.remove()) : li.remove(); setTimeout(refreshStaff, 500); } catch (er) { oops(er); } return; }
      const rv = t.closest('[data-rv]');
      if (rv) { const li = rv.closest('[data-rq]'); try { await go(rv, () => post('/api/cards/requests/review', { id: +li.dataset.rq, decision: rv.dataset.rv })); ok(rv.dataset.rv === 'publish' ? 'Published. It shows on the site now' : 'Queued to be drawn again', rv.dataset.rv === 'publish' ? '🏁' : '🔁'); setTimeout(refreshStaff, 500); } catch (er) { oops(er); } return; }
      const rt = t.closest('[data-retry]'); if (rt) { try { await go(rt, () => post('/api/cards/requests/retry', { id: +rt.dataset.retry })); ok('Trying again', '🔁'); setTimeout(refreshStaff, 500); } catch (er) { oops(er); } return; }
      const okb = t.closest('[data-okit]');
      if (okb) { const v = kitVal($('#cs-ok' + okb.dataset.okit, stEl)); try { await go(okb, () => post('/api/cards/kit-number', { id: +okb.dataset.okit, kitNumber: v === '' ? null : +v })); window.NorexArt?.refresh(); ok(v === '' ? 'Kit number removed' : `Kit number #${v} saved`, '👕'); } catch (er) { oops(er); } return; }
      const orv = t.closest('[data-orv]');
      if (orv) { if (!sure(orv, 'Revoke? Tap again')) return; try { await go(orv, () => post('/api/cards/owner/revoke', { id: +orv.dataset.orv })); ok('Revoked. They can send a new photo', '↩'); setTimeout(refreshStaff, 500); } catch (er) { oops(er); } return; }
      const uk = t.closest('[data-ukind]');
      if (uk) { const f = $('#cs-up', stEl); $$('[data-ukind]', f).forEach((b) => { b.classList.toggle('on', b === uk); b.setAttribute('aria-checked', b === uk); }); $('[data-uprompt]', f).hidden = uk.dataset.ukind !== 'pose'; $('[data-uhint]', f).textContent = uk.dataset.ukind === 'bg' ? `${ST.size}×${ST.size} PNG` : 'PNG, JPG or WEBP, 5 MB max'; return; }
      const tr = t.closest('[data-tier]');
      if (tr) { const li = tr.closest('[data-lr]'); $$('[data-tier]', li).forEach((b) => { b.classList.toggle('on', b === tr); b.setAttribute('aria-checked', b === tr); }); $('[data-f=point_cost]', li).hidden = tr.dataset.tier !== 'premium'; $('[data-lsave]', li).hidden = false; return; }
      const ac = t.closest('[data-act]');
      if (ac) { const on = !ac.classList.contains('on'), li = ac.closest('[data-lr]'); ac.classList.toggle('on', on); ac.setAttribute('aria-checked', on); ac.nextElementSibling.textContent = on ? 'Shown' : 'Hidden'; li.classList.toggle('off', !on); $('[data-lsave]', li).hidden = false; return; }
      const ls = t.closest('[data-lsave]');
      if (ls) { const li = ls.closest('[data-lr]'), g = (f) => $(`[data-f="${f}"]`, li), body = { id: +li.dataset.lr, name: g('name').value, tier: $('[data-tier].on', li).dataset.tier, point_cost: +g('point_cost').value || 0, active: $('[data-act]', li).classList.contains('on') };
        if (g('prompt')) body.prompt = g('prompt').value;
        try { await go(ls, () => post('/api/cards/templates/update', body)); ls.hidden = true; ok(`${body.name} saved`, '💾'); } catch (er) { oops(er); } return; }
    });
    stEl.addEventListener('input', (e) => { const t = e.target; if (/^cs-o/.test(t.id || '')) { const v = kitVal(t); if (t.value !== v) t.value = v; } const li = t.closest('[data-lr]'); if (li) $('[data-lsave]', li).hidden = false; });
    stEl.addEventListener('change', (e) => { const f = e.target.closest('#cs-up'); if (f && e.target.name === 'tier') $('[data-ucost]', f).hidden = e.target.value !== 'premium'; if (e.target.closest('#cs-gr') && e.target.name === 'user') grantUser = e.target.value; });
    stEl.addEventListener('submit', async (e) => { e.preventDefault(); const f = e.target, btn = e.submitter || $('button[type=submit]', f);
      if (f.id === 'cs-of') { const file = f.photo.files[0]; if (!f.player.value) { M?.toast('Choose a player first', { kind: 'err' }); return; } if (!imageOk(file)) { M?.toast('Use a PNG, JPG or WEBP photo', { kind: 'err' }); return; }
        const q = new URLSearchParams({ targetPlayer: f.player.value, avatar: '0', portrait: '1', kitNumber: kitVal($('#cs-okit', f)) });
        try { const p = await shrink(file); await go(btn, () => raw('/api/cards/request?' + q, p)); ok('Sent for the check. It is in Review now', '📨'); setTimeout(refreshStaff, 500); } catch (er) { oops(er); } return; }
      if (f.id === 'cs-up') { const file = f.file.files[0], kind = $('[data-ukind].on', f).dataset.ukind; if (!file) { M?.toast('Choose an image first', { kind: 'err' }); return; }
        if (kind === 'bg' && file.type !== 'image/png') { M?.toast('Backgrounds must be PNG files', { kind: 'err' }); return; }
        const q = new URLSearchParams({ kind, name: f.name.value.trim(), tier: f.tier.value }); if (f.tier.value === 'premium') q.set('cost', f.cost.value); if (kind === 'pose') q.set('prompt', f.prompt.value.trim());
        try { await go(btn, () => raw('/api/cards/templates/upload?' + q, file)); ok(`${f.name.value.trim()} added`, '⬆'); setTimeout(refreshStaff, 500); } catch (er) { oops(er); } return; }
      if (f.id === 'cs-gr') { const act = btn?.dataset.gact || 'grant'; grantUser = f.user.value;
        try { await go(btn, () => post(`/api/cards/${act}`, { user: f.user.value, template: +f.template.value })); ok(act === 'grant' ? 'Unlocked for them' : 'Unlock taken back', act === 'grant' ? '🎁' : '↩'); } catch (er) { oops(er); } }
    });
  }

  d.addEventListener('click', (e) => { if (e.target.closest('[data-csretry]')) { if (meEl?.contains(e.target)) loadMe(); else loadStaff(); } });
  if (meEl) loadMe(); if (stEl) loadStaff();
})();
