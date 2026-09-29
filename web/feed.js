// Club feed on the client (roadmap P6.1) – feed.html [data-feed].
// Composer (tag + text, links auto-embed via web/docs-md.js), filters, posts with club reactions, comments with one level
// of replies, ⋯ menu (copy link, edit, pin, remove). Everything is optimistic: redraw first, then replace with the
// server's answer or roll back with a toast. Permalinks: feed.html#p<id>.
// P6.1b: 📷 photos / 🎬 clips upload straight to the Worker (R2) with a progress bar while the post is written – photos are
// shrunk to 2048 px in the browser first. Owner: 💾 storage dashboard (feed.html#storage).
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const MAPI = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const session = () => { try { const t = localStorage.getItem('norex_session'); const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))); return p.exp > Date.now() / 1000 ? { token: t, ...p } : null; } catch { return null; } };
  const call = async (path, body) => {
    const s = session();
    const r = await fetch(MAPI + path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { ...(s ? { Authorization: `Bearer ${s.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
  };
  const toast = (m, bad) => UI.toast(m, bad ? 'bad' : 'ok');
  const loginUrl = () => `${MAPI}/auth/login?return=${encodeURIComponent(location.href.split('#')[0])}`;
  const host = location.hostname;
  const FILTERS = [['all', '📰', 'All'], ['highlight', '🎬', 'Highlights'], ['rush', '⚡', 'Rush'], ['league', '🏟️', 'League'], ['mine', '👤', 'My posts']];
  const X_POST = /^https:\/\/(www\.)?(x|twitter)\.com\/\w{1,15}\/status\/\d+/i;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  let el, S = null, f = 'all', open = new Set(), me = null;
  let att = []; // composer attachments: { id, name, kind, blob, preview, w, h, pct, key, err, xhr }
  const mb = (n) => (!n ? '0 MB' : n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : `${Math.max(0.1, n / 1e6).toFixed(n < 1e7 ? 1 : 0)} MB`);
  const mediaUrl = (m) => `${MAPI}/media/${m.key}`;

  // ---------- rendering ----------
  // Markdown-lite text; the first video link anywhere in the post embeds under it, X/Twitter posts get a link card.
  function body(text) {
    let h = NXMd.html(text, { host });
    const urls = String(text).match(/https:\/\/[^\s<>"']+/g) ?? [];
    if (!h.includes('md-video')) {
      const v = urls.map((u) => NXMd.video(u, host)).find(Boolean);
      if (v) h += `<div class="md-video"><iframe src="${esc(v.src)}" title="${v.kind} video" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    }
    const x = urls.find((u) => X_POST.test(u));
    if (x) h += `<a class="fd-card" href="${esc(x)}" target="_blank" rel="noopener nofollow"><b>𝕏</b><span>View the post on X<small>${esc(x.replace(/^https:\/\/(www\.)?/, '').slice(0, 60))}</small></span></a>`;
    return h;
  }
  const who = (u) => UI.member({ id: u.id, n: u.n, a: u.a, sub: `${u.tag ? `@${u.tag} · ` : ''}ID ${u.id}`, href: NXViewer.flagOn('profiles') ? `member.html?u=${encodeURIComponent(u.id)}` : undefined }, { size: 38 });
  const whoSmall = (u) => UI.member({ id: u.id, n: u.n, a: u.a, sub: u.tag ? `@${u.tag}` : '', href: NXViewer.flagOn('profiles') ? `member.html?u=${encodeURIComponent(u.id)}` : undefined }, { size: 22, sub: false });

  // "Name, Name +3" – the server sends up to 12 names per emoji.
  const tip = (p, e) => { const w = p.who[e] ?? []; return w.join(', ') + (p.reacts[e] > w.length ? ` +${p.reacts[e] - w.length}` : ''); };
  function reacts(p) {
    const used = S.emoji.filter((e) => p.reacts[e]);
    return `<div class="fd-react">${used.map((e) => `<button type="button" class="fd-rx${p.mine.includes(e) ? ' on' : ''}" data-rx="${e}" aria-pressed="${p.mine.includes(e)}" data-tip="${esc(tip(p, e))}"><span>${e}</span><b>${p.reacts[e]}</b></button>`).join('')}
<span class="fd-add-wrap"><button type="button" class="fd-add" data-act="pick" aria-label="Add a reaction" aria-expanded="false">😀<i>+</i></button><span class="fd-pick" hidden>${S.emoji.map((e) => `<button type="button" data-rx="${e}" aria-label="React ${e}">${e}</button>`).join('')}</span></span></div>`;
  }
  function comment(c, p) {
    if (c.removed) return `<li class="fd-c removed" data-cid="${c.id}"><p class="muted small">🗑 Comment removed</p>${replies(c, p)}</li>`;
    const mine = c.by.id === me;
    return `<li class="fd-c" data-cid="${c.id}"><div class="fd-c-body"><div class="fd-c-text">${whoSmall(c.by)}<p>${esc(c.text).replace(/\n/g, '<br>')}</p></div>
<div class="fd-c-meta">${UI.time(c.at)}<button type="button" class="linkish" data-act="reply" data-cid="${c.parent ?? c.id}" data-to="${esc(c.by.n)}">↩ Reply</button>${mine || S.canModerate ? `<button type="button" class="linkish" data-act="uncomment" data-cid="${c.id}">${mine ? 'Delete' : '🛡 Remove'}</button>` : ''}</div></div>${c.parent ? '' : replies(c, p)}</li>`;
  }
  const replies = (c, p) => { const r = p.comments.filter((x) => x.parent === c.id); return r.length ? `<ul class="fd-replies">${r.map((x) => comment(x, p)).join('')}</ul>` : ''; };
  function comments(p) {
    const top = p.comments.filter((c) => !c.parent);
    return `<div class="fd-comments"${open.has(p.id) ? '' : ' hidden'}><ul class="fd-clist">${top.map((c) => comment(c, p)).join('')}</ul>
<form class="fd-cform" data-post="${p.id}"><input type="hidden" name="parent"><div class="fd-replying" hidden></div><div class="fd-crow"><textarea name="text" rows="1" maxlength="500" placeholder="Write a comment…" aria-label="Comment"></textarea><button class="btn sm" type="submit">Send</button></div></form></div>`;
  }
  // Photos (1–4, grid + lightbox) or one clip; files the storage guard cleared show a placeholder.
  function gallery(p) {
    if (!p.media?.length) return '';
    const ratio = (m) => (m.w && m.h ? ` style="aspect-ratio:${m.w}/${m.h}"` : '');
    const items = p.media.map((m) => (m.gone
      ? `<div class="fd-gone"><span aria-hidden="true">${m.kind === 'video' ? '🎞️' : '🖼️'}</span><b>${m.kind === 'video' ? 'Clip' : 'Photo'} ${m.gone}</b><small>${m.gone === 'expired' ? 'Cleared to keep the club’s storage free' : 'Taken down'}</small></div>`
      : m.kind === 'video'
        ? `<video class="fd-vid" src="${esc(mediaUrl(m))}" controls preload="metadata" playsinline${ratio(m)}></video>`
        : `<a class="fd-img" href="${esc(mediaUrl(m))}" data-lightbox="p${p.id}" data-caption="${esc(p.by.n)}"><img src="${esc(mediaUrl(m))}" alt="Photo from ${esc(p.by.n)}" loading="lazy" decoding="async"${m.w && m.h ? ` width="${m.w}" height="${m.h}"` : ''}></a>`));
    return `<div class="fd-media n${Math.min(p.media.length, 4)}">${items.join('')}</div>`;
  }
  function post(p) {
    const [ic, label] = S.tags[p.tag] ?? S.tags.chat;
    const mine = p.by.id === me;
    const menu = [['copy', '🔗 Copy link'], mine && ['edit', '✏️ Edit'], S.canModerate && ['pin', p.pinned ? '📌 Unpin' : '📌 Pin to top'], (mine || S.canModerate) && ['remove', mine ? '🗑 Delete' : '🛡 Remove post']].filter(Boolean);
    return `<article class="fd-post t-${esc(p.tag)}${p.pinned ? ' pinned' : ''}" id="p${p.id}" data-id="${p.id}">
<header class="fd-head">${who(p.by)}<span class="fd-meta">${p.pinned ? '<span class="fd-pin">📌 Pinned</span>' : ''}<span class="fd-tag">${ic} ${esc(label)}</span><a href="#p${p.id}" class="fd-when">${UI.time(p.at)}${p.edited ? ' · edited' : ''}</a></span>
<span class="fd-more-wrap"><button type="button" class="fd-more" data-act="menu" aria-label="Post options" aria-expanded="false">⋯</button><span class="fd-menu" hidden>${menu.map(([k, l]) => `<button type="button" data-act="${k}">${l}</button>`).join('')}</span></span></header>
${p.text ? `<div class="fd-body md">${body(p.text)}</div>` : ''}${gallery(p)}
${reacts(p)}
<footer class="fd-foot"><button type="button" class="fd-cbtn" data-act="comments" aria-expanded="${open.has(p.id)}">💬 ${p.nComments ? plural(p.nComments, 'comment') : 'Comment'}</button></footer>
${comments(p)}</article>`;
  }
  function tray() {
    return att.map((a) => `<div class="fd-att-i${a.err ? ' err' : a.key ? ' ok' : ''}" data-att="${a.id}">${a.kind === 'video' ? `<video src="${esc(a.preview)}" muted playsinline preload="metadata"></video><i class="fd-att-k">🎬</i>` : `<img src="${esc(a.preview)}" alt="">`}
<button type="button" class="fd-att-x" data-act="unatt" aria-label="Remove ${esc(a.name)}">×</button>
${a.err ? `<small class="fd-att-e">${esc(a.err)}</small>` : a.key ? '<small class="fd-att-done">✓</small>' : `<span class="fd-att-bar"><span style="width:${a.pct ?? 0}%"></span></span>`}</div>`).join('');
  }
  const busy = () => att.some((a) => !a.key && !a.err);
  function paintTray() {
    const fm = $('#fd-compose', el);
    if (!fm) return;
    $('.fd-att', fm).innerHTML = tray();
    $('.fd-att', fm).hidden = !att.length;
    $('button[type=submit]', fm).disabled = !S.left || busy();
    const up = $('.fd-upbtn', fm);
    if (up) { const off = !S.uploads.left || att.length >= S.uploads.perPost || att.some((a) => a.kind === 'video'); up.classList.toggle('off', off); up.setAttribute('aria-disabled', off); $('input', up).disabled = off; up.title = S.uploads.left ? `${S.uploads.left} of ${S.uploads.perDay} uploads left today` : 'No uploads left today'; }
  }
  function composer() {
    const s = session();
    const u = S.uploads ?? {};
    return `<form class="fd-compose card" id="fd-compose">${UI.avatar(s?.a, s?.n, 42)}<div class="fd-cmp-main">
<textarea name="text" rows="3" maxlength="2000" placeholder="Share a goal, a result, a Rush invite… ${u.on ? 'add a photo or clip, or ' : ''}paste a YouTube / Twitch / Streamable link to embed it" aria-label="New post"></textarea>
<div class="fd-cmp-row"><div class="fd-tags" role="radiogroup" aria-label="Tag">${Object.entries(S.tags).map(([k, [i, l]], n) => `<label><input type="radio" name="tag" value="${k}"${n === 0 ? ' checked' : ''}><span>${i} ${esc(l)}</span></label>`).join('')}</div>
${u.on ? `<label class="btn ghost sm fd-upbtn" role="button" tabindex="0" title="Photos up to ${mb(u.image)} · clips up to ${mb(u.video)}">📷 Photo / 🎬 Clip<input type="file" class="fd-file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple hidden></label>` : ''}
<span class="grow"></span><small class="muted fd-left">${S.left} of ${S.perDay} left today</small><button class="btn" type="submit"${S.left ? '' : ' disabled'}>📣 Post</button></div>
<div class="fd-att" hidden></div></div></form>`;
  }
  function draw() {
    const list = S.posts;
    // Keep what's being written across redraws ("Load older", pin).
    const old = $('#fd-compose', el);
    const keep = old && { text: old.text.value, tag: old.tag.value };
    el.innerHTML = `${composer()}
<div class="fd-filters chips" role="tablist">${FILTERS.map(([k, i, l]) => `<button type="button" class="chip${k === f ? ' strong' : ''}" data-f="${k}" role="tab" aria-selected="${k === f}">${i} ${l}</button>`).join('')}${S.canStorage ? '<button type="button" class="chip fd-stchip" data-act="storage">💾 Storage</button>' : ''}</div>
<div class="fd-list">${list.length ? list.map(post).join('') : UI.empty({ icon: f === 'mine' ? '✍️' : '📰', title: f === 'mine' ? 'You haven’t posted yet' : 'Nothing here yet', text: f === 'all' ? 'Be the first – share a clip, a result or a Rush invite.' : 'Try another filter, or post one yourself.' })}</div>
${S.more ? '<p class="fd-morebox"><button type="button" class="btn ghost" data-act="more">Load older posts</button></p>' : ''}`;
    const fm = $('#fd-compose', el);
    if (keep && fm) { fm.text.value = keep.text; const r = $(`input[name=tag][value="${keep.tag}"]`, fm); if (r) r.checked = true; }
    paintTray();
  }
  const find = (id) => S.posts.find((p) => p.id === +id);
  const redraw = (p) => { const a = $(`#p${p.id}`, el); if (a) a.outerHTML = post(p); };
  const replace = (p) => { S.posts = S.posts.map((x) => (x.id === p.id ? p : x)); redraw(p); };

  // ---------- data ----------
  async function load() {
    const d = await call(`/api/feed?f=${f}`);
    S = { ...d, posts: d.posts };
    me = d.me;
    draw();
  }
  async function more() {
    const d = await call(`/api/feed?f=${f}&before=${S.next}`);
    S.posts.push(...d.posts.filter((p) => !find(p.id)));
    S.more = d.more; S.next = d.next;
    draw();
  }
  // #p<id>: scroll to it (fetching it on its own if it isn't on the first page) and flash it.
  async function jump() {
    if (location.hash === '#storage' && S?.canStorage) { storage(); return; }
    const m = /^#p(\d+)$/.exec(location.hash);
    if (!m || !S) return;
    if (!find(m[1])) {
      try { const d = await call(`/api/feed/post?id=${m[1]}`); S.posts.unshift(d.post); draw(); } catch (e) { toast(e.message, true); return; }
    }
    open.add(+m[1]); redraw(find(m[1]));
    $(`#p${m[1]}`, el)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    $(`#p${m[1]}`, el)?.classList.add('flash');
  }

  // ---------- uploads ----------
  // Photos are shrunk in the browser (longest side 2048 px, WebP/JPEG) – smaller uploads, more room in the free 10 GB.
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return { blob: file };
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
      if (k === 1 && file.size < 1.5e6) { bmp.close(); return { blob: file, w, h }; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(bmp, 0, 0, w, h);
      bmp.close();
      const as = (type) => new Promise((r) => c.toBlob(r, type, 0.85));
      let blob = await as('image/webp');
      if (!blob || blob.type !== 'image/webp') blob = file.type === 'image/png' ? await as('image/png') : await as('image/jpeg');
      return { blob: blob && blob.size < file.size ? blob : file, w, h };
    } catch { return { blob: file }; }
  }
  const videoSize = (url) => new Promise((r) => {
    const v = document.createElement('video');
    const t = setTimeout(() => r({}), 4000);
    v.preload = 'metadata'; v.muted = true;
    v.onloadedmetadata = () => { clearTimeout(t); r({ w: v.videoWidth, h: v.videoHeight }); };
    v.onerror = () => { clearTimeout(t); r({}); };
    v.src = url;
  });
  function send(a) {
    const x = new XMLHttpRequest();
    a.xhr = x;
    x.open('POST', `${MAPI}/api/feed/upload?name=${encodeURIComponent(a.name.slice(0, 80))}&w=${a.w || ''}&h=${a.h || ''}`);
    x.setRequestHeader('Authorization', `Bearer ${session()?.token}`);
    x.setRequestHeader('Content-Type', a.blob.type);
    x.upload.onprogress = (e) => { if (e.lengthComputable) { a.pct = Math.round((e.loaded / e.total) * 100); const b = $(`[data-att="${a.id}"] .fd-att-bar span`, el); if (b) b.style.width = `${a.pct}%`; } };
    x.onload = () => {
      let d = {};
      try { d = JSON.parse(x.responseText); } catch {}
      if (x.status === 200 && d.media) { a.key = d.media.key; S.uploads.left = d.left; } else { a.err = d.error || `Upload failed (${x.status})`; toast(a.err, true); }
      paintTray();
    };
    x.onerror = () => { a.err = 'Upload failed – check your connection.'; paintTray(); };
    x.send(a.blob);
  }
  let seq = 0;
  async function addFiles(files) {
    const u = S.uploads;
    for (const file of files) {
      const kind = file.type.startsWith('video/') ? 'video' : 'image';
      const why = !/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/.test(file.type) ? `${file.name}: photos (JPG, PNG, WebP, GIF) and clips (MP4, WebM, MOV) only.`
        : kind === 'video' && att.length ? 'A clip goes in a post on its own.'
          : att.some((a) => a.kind === 'video') ? 'This post already has a clip.'
            : att.length >= u.perPost ? `Up to ${u.perPost} photos per post.`
              : att.filter((a) => !a.err).length >= u.left ? `No uploads left today (${u.perDay} a day).`
                : kind === 'video' && file.size > u.video ? `${file.name} is ${mb(file.size)} – clips can be up to ${mb(u.video)}. Trim it or post a YouTube/Streamable link.` : '';
      if (why) { toast(why, true); continue; }
      const a = { id: ++seq, name: file.name, kind, pct: 0, preview: URL.createObjectURL(file) };
      att.push(a);
      paintTray();
      if (kind === 'image') {
        Object.assign(a, await shrink(file));
        if (a.blob.size > u.image) { a.err = `Too big after shrinking (${mb(a.blob.size)}; max ${mb(u.image)}).`; paintTray(); continue; }
      } else Object.assign(a, { blob: file }, await videoSize(a.preview));
      if (!att.includes(a)) continue; // removed while it was being prepared
      send(a);
    }
  }
  function dropAtt(id) {
    const a = att.find((x) => x.id === +id);
    if (!a) return;
    att = att.filter((x) => x !== a);
    a.xhr?.abort();
    URL.revokeObjectURL(a.preview);
    if (a.key) call('/api/feed/unupload', { key: a.key }).catch(() => {});
    paintTray();
  }
  const clearAtt = () => { att.forEach((a) => URL.revokeObjectURL(a.preview)); att = []; };

  // ---------- owner: media storage ----------
  function storageHtml(d) {
    const L = d.limits;
    const pc = (n) => `${Math.min(100, (n / L.free) * 100).toFixed(2)}%`;
    const lvl = d.used >= L.refuse ? 'bad' : d.used >= L.high ? 'warn' : '';
    const row = (x) => `<li><span class="fd-st-k">${x.kind === 'video' ? '🎬' : '📷'}</span><span class="fd-st-n"><b>${mb(x.size)}</b> · ${esc(x.by)}<small>${esc(x.name || '')} · ${UI.time(x.at)}${x.post ? ` · <a href="#p${x.post}" data-close>post #${x.post}</a>` : ''}</small></span><button type="button" class="btn ghost sm" data-del="${esc(x.key)}">🗑</button></li>`;
    const kinds = ['image', 'video'].map((k) => `${k === 'video' ? '🎬 Clips' : '📷 Photos'} <b>${d.byKind[k]?.n ?? 0}</b> · ${mb(d.byKind[k]?.bytes ?? 0)}`).join(' &nbsp;·&nbsp; ');
    return `${d.on ? '' : '<p class="fd-st-off">⚠️ Uploads are off – the R2 bucket isn’t connected to the bot yet. Run the <b>Deploy bot</b> workflow once the Cloudflare token has R2 access.</p>'}
<div class="fd-st-top"><b class="fd-st-used ${lvl}">${mb(d.used)}</b><span class="muted">of the free ${mb(L.free)} · ${kinds}</span></div>
<div class="fd-st-bar" role="img" aria-label="${mb(d.used)} of ${mb(L.free)} used"><span class="fill ${lvl}" style="width:${pc(d.used)}"></span>
<i style="left:${pc(L.low)}" data-tip="Clean-up goes down to ${mb(L.low)}"></i><i style="left:${pc(L.high)}" data-tip="Above ${mb(L.high)} the oldest files are deleted"></i><i class="stop" style="left:${pc(L.refuse)}" data-tip="Uploads pause at ${mb(L.refuse)}"></i></div>
<p class="muted small">🛡️ Every hour the guard deletes the <b>oldest</b> photos/clips once storage passes ${mb(L.high)}, down to ${mb(L.low)} – posts keep a “clip expired” note. Uploads pause at ${mb(L.refuse)}; files older than ${L.maxAgeDays} days go automatically. Limits: photos ${mb(L.image)}, clips ${mb(L.video)}, ${L.perDay} uploads per member a day.</p>
<p class="small">${d.guard ? `Last check ${UI.time(d.guard.at)}: bucket ${mb(d.guard.after)}` : 'The guard hasn’t run yet (it checks hourly).'}${d.guard?.lastClean ? ` · last clean-up ${UI.time(d.guard.lastClean.at)} removed ${d.guard.lastClean.n} file${d.guard.lastClean.n === 1 ? '' : 's'} (${mb(d.guard.lastClean.freed)})` : ''}${d.expired30 ? ` · ${d.expired30} expired in 30 days` : ''}</p>
<div class="fd-st-cols"><section><h3>🐘 Biggest files</h3><ul class="fd-st-list">${d.biggest.map(row).join('') || '<li class="muted">No files yet.</li>'}</ul></section>
<section><h3>⏳ Deleted first (oldest)</h3><ul class="fd-st-list">${d.next.map(row).join('') || '<li class="muted">No files yet.</li>'}</ul></section></div>`;
  }
  async function storage() {
    let d;
    try { d = await call('/api/feed/storage'); } catch (e) { toast(e.message, true); return; }
    UI.modal({
      title: 'Media storage', icon: '💾', wide: true, body: `<div class="fd-st">${storageHtml(d)}</div>`,
      onOpen: (dlg) => dlg.addEventListener('click', async (e) => {
        if (e.target.closest('[data-close]')) { dlg.close(); return; }
        const b = e.target.closest('[data-del]');
        if (!b || !(await UI.confirm({ title: 'Delete this file now?', text: 'It leaves storage for good; its post shows “removed” instead.', ok: 'Delete', danger: true }))) return;
        try { d = await call('/api/feed/media/delete', { key: b.dataset.del }); $('.fd-st', dlg).innerHTML = storageHtml(d); toast('File deleted'); load().catch(() => {}); } catch (er) { toast(er.message, true); }
      }),
    });
  }

  // ---------- actions ----------
  async function react(p, emoji) {
    const before = { reacts: { ...p.reacts }, mine: [...p.mine], who: p.who };
    const on = p.mine.includes(emoji);
    const myName = session()?.n ?? 'You';
    p.who = { ...p.who, [emoji]: on ? (p.who[emoji] ?? []).filter((n) => n !== myName) : [...(p.who[emoji] ?? []), myName] };
    p.mine = on ? p.mine.filter((e) => e !== emoji) : [...p.mine, emoji];
    p.reacts = { ...p.reacts, [emoji]: Math.max(0, (p.reacts[emoji] ?? 0) + (on ? -1 : 1)) };
    if (!p.reacts[emoji]) delete p.reacts[emoji];
    redraw(p);
    try { Object.assign(p, await call('/api/feed/react', { id: p.id, emoji })); redraw(p); } catch (e) { Object.assign(p, before); redraw(p); toast(e.message, true); }
  }
  async function act(a, p, btn) {
    if (a === 'copy') {
      const link = `${location.origin}${location.pathname}#p${p.id}`;
      try { await navigator.clipboard.writeText(link); toast('Link copied 🔗'); } catch { UI.modal({ title: 'Link to this post', icon: '🔗', body: `<input class="fd-link" readonly value="${esc(link)}" onfocus="this.select()">` }); }
    } else if (a === 'edit') {
      let text = p.text, tag = p.tag;
      const v = await UI.modal({
        title: 'Edit post', icon: '✏️', wide: true,
        body: `<form class="fd-edit" onsubmit="return false"><textarea name="text" rows="6" maxlength="2000" aria-label="Post text">${esc(p.text)}</textarea>
<div class="fd-tags">${Object.entries(S.tags).map(([k, [i, l]]) => `<label><input type="radio" name="tag" value="${k}"${k === p.tag ? ' checked' : ''}><span>${i} ${esc(l)}</span></label>`).join('')}</div></form>`,
        actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '💾 Save', value: 'ok' }],
        onOpen: (d) => d.addEventListener('input', () => { const fm = $('form', d); text = fm.text.value; tag = fm.tag.value; }),
      });
      if (v !== 'ok') return;
      try { replace((await call('/api/feed/edit', { id: p.id, text, tag })).post); toast('Saved'); } catch (e) { toast(e.message, true); }
    } else if (a === 'pin') {
      try { const r = (await call('/api/feed/pin', { id: p.id, pinned: !p.pinned })).post; toast(r.pinned ? 'Pinned to the top 📌' : 'Unpinned'); await load(); } catch (e) { toast(e.message, true); }
    } else if (a === 'remove') {
      const mine = p.by.id === me;
      if (!(await UI.confirm({ title: mine ? 'Delete this post?' : `Remove ${p.by.n}’s post?`, text: mine ? 'It disappears from the feed for everyone, with its comments and reactions.' : 'It disappears from the feed for everyone. The author gets a note that a manager removed it; the activity log keeps a record.', ok: mine ? 'Delete' : 'Remove', danger: true }))) return;
      const i = S.posts.indexOf(p);
      S.posts.splice(i, 1); draw();
      try { await call('/api/feed/delete', { id: p.id }); toast(mine ? 'Post deleted' : 'Post removed'); } catch (e) { S.posts.splice(i, 0, p); draw(); toast(e.message, true); }
    } else if (a === 'comments') {
      open.has(p.id) ? open.delete(p.id) : open.add(p.id);
      redraw(p);
      if (open.has(p.id)) $(`#p${p.id} .fd-cform textarea`, el)?.focus();
    } else if (a === 'reply') {
      open.add(p.id);
      const fm = $(`#p${p.id} .fd-cform`, el);
      fm.parent.value = btn.dataset.cid;
      const r = $('.fd-replying', fm);
      r.hidden = false;
      r.innerHTML = `↩ Replying to <b>${esc(btn.dataset.to)}</b> <button type="button" class="linkish" data-act="noreply">cancel</button>`;
      fm.text.focus();
    } else if (a === 'noreply') {
      const fm = btn.closest('form');
      fm.parent.value = ''; $('.fd-replying', fm).hidden = true;
    } else if (a === 'uncomment') {
      if (!(await UI.confirm({ title: 'Remove this comment?', ok: 'Remove', danger: true }))) return;
      try { replace((await call('/api/feed/uncomment', { id: +btn.dataset.cid })).post); } catch (e) { toast(e.message, true); }
    }
  }

  function wire() {
    el.addEventListener('click', async (e) => {
      const fb = e.target.closest('[data-f]');
      if (fb) { f = fb.dataset.f; el.querySelector('.fd-list').innerHTML = UI.skeleton('rows', 3); load().catch((er) => toast(er.message, true)); return; }
      const b = e.target.closest('[data-act], [data-rx]');
      // Close any open ⋯ menu / emoji picker that the click wasn't inside.
      $$('.fd-menu:not([hidden]), .fd-pick:not([hidden])', el).forEach((m) => { if (!m.parentElement.contains(e.target)) { m.hidden = true; m.previousElementSibling?.setAttribute('aria-expanded', 'false'); } });
      if (!b) return;
      if (b.dataset.act === 'more') { b.disabled = true; more().catch((er) => { b.disabled = false; toast(er.message, true); }); return; }
      if (b.dataset.act === 'storage') { storage(); return; }
      if (b.dataset.act === 'unatt') { dropAtt(b.closest('[data-att]').dataset.att); return; }
      const art = b.closest('.fd-post');
      const p = art && find(art.dataset.id);
      if (!p) return;
      if (b.dataset.rx) { b.closest('.fd-pick')?.setAttribute('hidden', ''); return react(p, b.dataset.rx); }
      if (b.dataset.act === 'menu' || b.dataset.act === 'pick') {
        const m = b.nextElementSibling;
        m.hidden = !m.hidden; b.setAttribute('aria-expanded', !m.hidden);
        return;
      }
      b.closest('.fd-menu')?.setAttribute('hidden', '');
      act(b.dataset.act, p, b);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $$('.fd-menu:not([hidden]), .fd-pick:not([hidden])', el).forEach((m) => { m.hidden = true; });
      // Enter sends a comment, Shift+Enter makes a new line.
      if (e.key === 'Enter' && !e.shiftKey && e.target.matches('.fd-cform textarea')) { e.preventDefault(); e.target.form.requestSubmit(); }
    });
    el.addEventListener('change', (e) => { if (e.target.matches('.fd-file')) { addFiles([...e.target.files]); e.target.value = ''; } });
    el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.fd-upbtn')) { e.preventDefault(); $('.fd-file', e.target).click(); } });
    // Drag photos/clips onto the composer, or paste a screenshot into it.
    el.addEventListener('dragover', (e) => { if (e.target.closest('#fd-compose') && S?.uploads?.on) { e.preventDefault(); e.target.closest('#fd-compose').classList.add('drop'); } });
    el.addEventListener('dragleave', (e) => e.target.closest('#fd-compose')?.classList.remove('drop'));
    el.addEventListener('drop', (e) => { const c = e.target.closest('#fd-compose'); if (!c || !S?.uploads?.on) return; e.preventDefault(); c.classList.remove('drop'); addFiles([...e.dataTransfer.files]); });
    el.addEventListener('paste', (e) => { if (!e.target.closest('#fd-compose') || !S?.uploads?.on) return; const fs = [...(e.clipboardData?.files ?? [])]; if (fs.length) { e.preventDefault(); addFiles(fs); } });
    el.addEventListener('input', (e) => { if (e.target.matches('.fd-cform textarea')) { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; } });
    el.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fm = e.target;
      const btn = $('button[type=submit]', fm);
      if (fm.id === 'fd-compose') {
        const text = fm.text.value.trim();
        const media = att.filter((a) => a.key).map((a) => a.key);
        if (busy()) { toast('Wait for the upload to finish.', true); return; }
        if (!text && !media.length) return;
        btn.disabled = true;
        try {
          const { post: np } = await call('/api/feed/post', { text, tag: fm.tag.value, media });
          fm.text.value = '';
          clearAtt();
          S.left = Math.max(0, S.left - 1);
          if (f === 'all' || f === 'mine' || f === np.tag) S.posts.splice(S.posts.filter((x) => x.pinned).length, 0, np);
          draw();
          $(`#p${np.id}`, el)?.classList.add('flash');
          toast('Posted 📣');
        } catch (er) { btn.disabled = false; toast(er.message, true); }
        return;
      }
      if (fm.matches('.fd-cform')) {
        const p = find(fm.dataset.post);
        const text = fm.text.value.trim();
        if (!p || !text) return;
        btn.disabled = true;
        try {
          open.add(p.id);
          replace((await call('/api/feed/comment', { id: p.id, parent: +fm.parent.value || undefined, text })).post);
          $(`#p${p.id} .fd-cform textarea`, el)?.focus();
        } catch (er) { btn.disabled = false; toast(er.message, true); }
      }
    });
    addEventListener('hashchange', jump);
  }

  function mount(root) {
    el = root;
    if (!session()) {
      el.innerHTML = UI.empty({ icon: '🔒', title: 'Members only', text: 'Log in with Discord to see and share posts from the squad.', action: `<a class="btn" href="${esc(loginUrl())}">Log in with Discord</a>` });
      return;
    }
    el.innerHTML = UI.skeleton('cards', 2);
    wire();
    load().then(jump).catch((e) => { el.innerHTML = UI.empty({ icon: '📡', title: 'Could not load the feed', text: e.message }); });
  }

  window.NXFeed = { mount };
  document.addEventListener('DOMContentLoaded', () => {
    const r = $('[data-feed]');
    if (r && !r.closest('[hidden]')) mount(r);
  });
})();
