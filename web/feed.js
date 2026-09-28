// Social feed on the client (roadmap P6.1) – Squad Hub → 📰 Feed, and public posts on the home page.
//   NXFeed.tab(el, ctx)      composer (text, link, picture / clip upload with progress), filters, posts with embeds, club
//                            reactions, comments (one level of replies), copy link / share to Discord, pin / public / remove;
//                            owner: storage panel (used of the free 10 GB, biggest files, what the guard deletes next)
//   NXFeed.publicStrip(el)   up to 3 posts managers marked public
// ctx = { call, toast, me: { u, n, a } }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BASE = document.body.dataset.base || '', MAPI = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!$('link[href$="feed.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/feed.css` }));
  const MB = 1024 ** 2, GB = 1024 ** 3;
  const size = (b) => (b >= GB ? `${(b / GB).toFixed(2)} GB` : b >= MB ? `${(b / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const mediaSrc = (key) => `${MAPI}/media/${key}`;
  const MODES = { general: ['💬', 'General'], league: ['🏆', 'League'], rush: ['⚡', 'Rush'] };
  const FILTERS = [['all', 'All'], ['highlights', '🎬 Highlights'], ['league', '🏆 League'], ['rush', '⚡ Rush'], ['mine', '👤 My posts']];
  const token = () => { try { return localStorage.getItem('norex_session'); } catch { return null; } };
  const linkify = (t) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener nofollow ugc">${u.length > 60 ? `${u.slice(0, 57)}…` : u}</a>`).replace(/\n/g, '<br>');
  const who = (b) => `${UI.member({ id: b.id, n: b.n, a: b.a, sub: b.tag ? `@${b.tag}` : undefined }, { size: 34 })}`;

  // ---------- embeds (click to load – nothing from YouTube / Twitch loads until someone asks for it) ----------
  function embedHtml(e) {
    if (!e) return '';
    const host = encodeURIComponent(location.hostname || 'localhost');
    const frames = {
      youtube: [`https://www.youtube-nocookie.com/embed/${encodeURIComponent(e.id)}?autoplay=1`, 'YouTube', `https://i.ytimg.com/vi/${encodeURIComponent(e.id)}/hqdefault.jpg`],
      'twitch-clip': [`https://clips.twitch.tv/embed?clip=${encodeURIComponent(e.id)}&parent=${host}&autoplay=true`, 'Twitch clip'],
      'twitch-video': [`https://player.twitch.tv/?video=${encodeURIComponent(e.id)}&parent=${host}`, 'Twitch video'],
      twitch: [`https://player.twitch.tv/?channel=${encodeURIComponent(e.id)}&parent=${host}&muted=true`, `twitch.tv/${e.id}`],
      streamable: [`https://streamable.com/e/${encodeURIComponent(e.id)}?autoplay=1`, 'Streamable'],
    }[e.kind];
    if (frames) return `<button type="button" class="fd-embed" data-frame="${esc(frames[0])}" aria-label="Play ${esc(frames[1])}"${frames[2] ? ` style="background-image:url('${esc(frames[2])}')"` : ''}><span class="fd-play">▶</span><small>${esc(frames[1])} · tap to play</small></button>`;
    if (e.kind === 'x') return `<a class="fd-card" href="${esc(e.url)}" target="_blank" rel="noopener nofollow ugc"><b>𝕏</b><span>View post${e.user ? ` by @${esc(e.user)}` : ''} on X</span></a>`;
    return `<a class="fd-card" href="${esc(e.url)}" target="_blank" rel="noopener nofollow ugc"><b>🔗</b><span>${esc(e.host)}<small>${esc(e.url.length > 70 ? `${e.url.slice(0, 67)}…` : e.url)}</small></span></a>`;
  }
  const mediaHtml = (m) => (!m ? '' : m.expired ? '<div class="fd-expired">🎞️ This clip has expired – media is kept while there’s room in the club’s storage.</div>'
    : m.type === 'video' ? `<video class="fd-media" src="${esc(mediaSrc(m.key))}" controls preload="metadata" playsinline></video>`
      : `<img class="fd-media" src="${esc(mediaSrc(m.key))}" alt="Picture in the post" loading="lazy" data-lightbox>`);

  function postHtml(p, S) {
    const counts = S.emoji.map((e) => `<button type="button" class="fd-react${p.my.includes(e) ? ' on' : ''}" data-react="${esc(e)}" aria-pressed="${p.my.includes(e)}" aria-label="React ${esc(e)}">${e}${p.reactions[e] ? `<em>${p.reactions[e]}</em>` : ''}</button>`).join('');
    const top = p.comments.filter((c) => !c.parent);
    const comment = (c, reply = false) => `<li class="fd-c${reply ? ' reply' : ''}" data-c="${c.id}">${UI.avatar(c.by.a, c.by.n, 24)}<div><b>${esc(c.by.n)}</b>${c.by.tag ? ` <small class="muted">@${esc(c.by.tag)}</small>` : ''} <small class="muted">${UI.time(c.at)}</small><p>${linkify(c.text)}</p>
<span class="fd-c-acts">${reply ? '' : `<button type="button" data-reply="${c.id}">Reply</button>`}${c.mine || S.canModerate ? `<button type="button" data-cdel="${c.id}">Remove</button>` : ''}</span></div></li>`;
    return `<article class="card fd-post${p.pinned ? ' pinned' : ''}" id="feed-${p.id}" data-post="${p.id}">
<header>${who(p.by)}<span class="grow"></span>${p.pinned ? '<span class="nx-pill t-gold">📌 Pinned</span>' : ''}${p.public ? '<span class="nx-pill">🌍 Public</span>' : ''}<span class="nx-pill">${MODES[p.mode]?.[0] ?? ''} ${MODES[p.mode]?.[1] ?? ''}</span><small class="muted">${UI.time(p.at)}</small></header>
${p.text ? `<p class="fd-text">${linkify(p.text)}</p>` : ''}${mediaHtml(p.media)}${embedHtml(p.embed)}
<div class="fd-bar">${counts}<span class="grow"></span><button type="button" class="fd-act" data-copy aria-label="Copy link">🔗</button>${S.canModerate ? `<button type="button" class="fd-act" data-share aria-label="Share to Discord">📣</button><button type="button" class="fd-act" data-pin aria-pressed="${p.pinned}" aria-label="${p.pinned ? 'Unpin' : 'Pin'}">📌</button><button type="button" class="fd-act" data-public aria-pressed="${p.public}" aria-label="${p.public ? 'Take off the home page' : 'Show on the public home page'}">🌍</button>` : ''}${p.canRemove ? '<button type="button" class="fd-act" data-del aria-label="Remove post">🗑</button>' : ''}</div>
<details class="fd-comments"${p.comments.length && p.comments.length < 4 ? ' open' : ''}><summary>💬 ${p.comments.length ? `${p.comments.length} comment${p.comments.length === 1 ? '' : 's'}` : 'Comment'}</summary>
<ul>${top.map((c) => comment(c) + p.comments.filter((r) => r.parent === c.id).map((r) => comment(r, true)).join('')).join('')}</ul>
<form class="fd-cform" data-cform><input name="text" maxlength="500" placeholder="Write a comment…" aria-label="Write a comment" autocomplete="off"><input type="hidden" name="parent"><button class="btn sm" type="submit">Send</button></form></details></article>`;
  }

  // Upload straight to the Worker (raw body) with a progress bar – fetch has no upload progress, XHR does.
  const upload = (file, onProgress) => new Promise((ok, no) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${MAPI}/api/feed/upload`);
    x.setRequestHeader('Authorization', `Bearer ${token()}`);
    x.setRequestHeader('Content-Type', file.type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch {} if (x.status >= 200 && x.status < 300) ok(d); else no(new Error(d.error || `Upload failed (${x.status})`)); };
    x.onerror = () => no(new Error('Upload failed – check your connection.'));
    x.send(file);
  });

  function tab(el, ctx) {
    let S = null, filter = 'all', media = null, busy = false, storageOpen = false;
    const want = /^#feed-(\d+)$/.exec(location.hash)?.[1];
    const composer = () => `<form class="card fd-new" data-new><div class="fd-new-top">${UI.avatar(ctx.me.a, ctx.me.n, 36)}<textarea name="text" rows="2" maxlength="1000" placeholder="Share a goal, a clip, a thought… links to YouTube, Twitch, X and Streamable turn into players"></textarea></div>
<div class="fd-attach" hidden></div>
<div class="fd-new-bar"><label class="btn sm ghost fd-file">📎 Picture / clip<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" hidden></label>
<select name="mode" aria-label="What is it about">${Object.entries(MODES).map(([k, [ic, l]]) => `<option value="${k}">${ic} ${l}</option>`).join('')}</select><span class="grow"></span><button class="btn" type="submit">Post</button></div>
<small class="muted">Pictures up to ${S.limits.image / MB} MB, clips up to ${S.limits.video / MB} MB · ${S.limits.uploadsPerDay} uploads a day</small></form>`;
    const paint = () => {
      el.innerHTML = `${composer()}<div class="chipset fd-filters">${FILTERS.map(([k, l]) => `<button type="button" class="chip${filter === k ? ' on' : ''}" data-filter="${k}">${l}</button>`).join('')}${S.canStorage ? '<button type="button" class="chip" data-storage>🗄️ Storage</button>' : ''}</div>
<div class="fd-storage" hidden></div><div class="fd-list">${S.posts.length ? S.posts.map((p) => postHtml(p, S)).join('') : UI.empty({ icon: '📰', title: filter === 'mine' ? 'You haven’t posted yet' : 'Nothing here yet', text: 'Be the first – drop a clip from last night.' })}</div>
${S.more ? '<div class="row"><button type="button" class="btn ghost" data-more>Load more</button></div>' : ''}`;
      if (storageOpen) showStorage();
    };
    const load = async (keepScroll = false) => {
      try {
        S = await ctx.call(`/api/feed?filter=${filter}`);
        const y = scrollY; paint(); if (keepScroll) scrollTo(0, y);
        if (want) { const t = $(`#feed-${want}`, el); if (t) { t.scrollIntoView({ block: 'center' }); t.classList.add('flash'); } }
      } catch (e) { el.innerHTML = UI.empty({ icon: '📡', title: 'The feed is unavailable', text: e.message }); }
    };
    const replace = (p) => { const i = S.posts.findIndex((x) => x.id === p.id); if (i >= 0) S.posts[i] = p; const node = $(`[data-post="${p.id}"]`, el); if (node) { const open = $('.fd-comments', node)?.open; node.outerHTML = postHtml(p, S); if (open) $(`[data-post="${p.id}"] .fd-comments`, el).open = true; } };
    async function showStorage() {
      const box = $('.fd-storage', el);
      box.hidden = false;
      box.innerHTML = UI.skeleton('rows', 2);
      try {
        const d = await ctx.call('/api/feed/storage');
        const pct = (d.used / d.free) * 100;
        const list = (l) => `<ol>${l.map((m) => `<li>${m.type === 'video' ? '🎬' : '🖼️'} ${size(m.size)} · ${esc(m.by ?? '?')} · ${UI.time(m.at)}${m.post ? ` · <a href="#feed-${m.post}">post</a>` : ' · not posted'}</li>`).join('') || '<li class="muted">None</li>'}</ol>`;
        box.innerHTML = `<section class="card"><h3>🗄️ Media storage <small class="muted">owner only</small></h3>${d.bound ? '' : '<p class="fd-warn">⚠️ The R2 bucket isn’t bound yet – uploads are off until the next bot deploy.</p>'}
<div class="fd-meter" role="img" aria-label="${size(d.used)} of ${size(d.free)} used"><i style="width:${Math.min(100, pct)}%" class="${d.used > d.guardAt ? 'hot' : d.used > d.guardTo ? 'warm' : ''}"></i><b style="left:${(d.guardTo / d.free) * 100}%" title="Guard deletes down to here"></b><b style="left:${(d.guardAt / d.free) * 100}%" title="Guard starts here"></b></div>
<p class="small">${size(d.used)} of the free ${size(d.free)} · ${d.files} files. Above ${size(d.guardAt)} the oldest files are deleted until we’re under ${size(d.guardTo)}; uploads stop at ${size(d.refuseAt)}; files go after 365 days.</p>
<div class="fd-2"><div><h4>Biggest files</h4>${list(d.biggest)}</div><div><h4>Deleted first if space runs out</h4>${list(d.next)}</div></div></section>`;
      } catch (e) { box.innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
    }
    el.innerHTML = UI.skeleton('rows', 4);
    el.addEventListener('change', async (e) => {
      const f = e.target.closest('.fd-file input');
      if (!f?.files?.[0]) return;
      const file = f.files[0], att = $('.fd-attach', el);
      const kind = file.type.startsWith('video/') ? 'video' : 'image';
      if (file.size > S.limits[kind]) { ctx.toast(`${kind === 'video' ? 'Clips' : 'Pictures'} up to ${S.limits[kind] / MB} MB`, true); f.value = ''; return; }
      att.hidden = false;
      att.innerHTML = `<div class="fd-up"><span>${kind === 'video' ? '🎬' : '🖼️'} ${esc(file.name)} · ${size(file.size)}</span><span class="fd-prog"><i style="width:0%"></i></span><button type="button" class="sq-mini" data-unattach aria-label="Remove">✕</button></div>`;
      busy = true; media = null;
      try {
        const r = await upload(file, (x) => { const i = $('.fd-prog i', att); if (i) i.style.width = `${Math.round(x * 100)}%`; });
        media = r.key;
        att.querySelector('.fd-up span').insertAdjacentHTML('beforeend', ' · ✓ ready');
      } catch (er) { ctx.toast(er.message, true); att.hidden = true; att.innerHTML = ''; }
      busy = false; f.value = '';
    });
    el.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      if (form.matches('[data-new]')) {
        if (busy) return ctx.toast('Wait for the upload to finish', true);
        const btn = $('button[type=submit]', form); btn.disabled = true;
        try {
          S = { ...S, ...(await ctx.call('/api/feed/post', { text: form.text.value, mode: form.mode.value, media })) };
          media = null; filter = 'all'; ctx.toast('Posted'); paint();
        } catch (er) { ctx.toast(er.message, true); btn.disabled = false; }
        return;
      }
      if (form.matches('[data-cform]')) {
        const id = Number(form.closest('[data-post]').dataset.post);
        if (!form.text.value.trim()) return;
        try { replace(await ctx.call('/api/feed/comment', { id, text: form.text.value, parent: Number(form.parent.value) || undefined })); } catch (er) { ctx.toast(er.message, true); }
      }
    });
    el.addEventListener('click', async (e) => {
      const t = e.target;
      const f = t.closest('[data-filter]');
      if (f) { filter = f.dataset.filter; return load(); }
      if (t.closest('[data-storage]')) { storageOpen = !storageOpen; if (storageOpen) showStorage(); else $('.fd-storage', el).hidden = true; return; }
      if (t.closest('[data-unattach]')) { media = null; const a = $('.fd-attach', el); a.hidden = true; a.innerHTML = ''; return; }
      if (t.closest('[data-more]')) {
        try { const d = await ctx.call(`/api/feed?filter=${filter}&before=${S.more}`); S.posts.push(...d.posts); S.more = d.more; const y = scrollY; paint(); scrollTo(0, y); } catch (er) { ctx.toast(er.message, true); }
        return;
      }
      const fr = t.closest('[data-frame]');
      if (fr) { fr.outerHTML = `<div class="fd-frame"><iframe src="${esc(fr.dataset.frame)}" title="Embedded clip" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`; return; }
      const img = t.closest('img[data-lightbox]');
      if (img) { UI.lightbox([{ src: img.src, alt: img.alt }]); return; }
      const post = t.closest('[data-post]');
      if (!post) return;
      const id = Number(post.dataset.post), p = S.posts.find((x) => x.id === id);
      const act = async (path, body) => { try { const r = await ctx.call(path, { id, ...body }); if (r?.id === id) replace(r); return r; } catch (er) { ctx.toast(er.message, true); return null; } };
      const rb = t.closest('[data-react]');
      if (rb) return act('/api/feed/react', { emoji: rb.dataset.react });
      if (t.closest('[data-reply]')) { const form = $('[data-cform]', post); form.parent.value = t.closest('[data-reply]').dataset.reply; form.text.placeholder = 'Write a reply…'; form.text.focus(); return; }
      const cd = t.closest('[data-cdel]');
      if (cd) { if (await UI.confirm({ title: 'Remove this comment?', danger: true, ok: 'Remove' })) act('/api/feed/comment/delete', { comment: Number(cd.dataset.cdel) }); return; }
      if (t.closest('[data-copy]')) { try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}#feed-${id}`); ctx.toast('Link copied'); } catch { ctx.toast('Could not copy', true); } return; }
      if (t.closest('[data-pin]')) return act('/api/feed/pin', { on: !p.pinned });
      if (t.closest('[data-public]')) return act('/api/feed/public', { on: !p.public });
      if (t.closest('[data-del]')) {
        if (!(await UI.confirm({ title: 'Remove this post?', text: p.mine ? 'It goes for everyone, with its picture or clip.' : 'It goes for everyone – the author is not told.', danger: true, ok: 'Remove' }))) return;
        if (await act('/api/feed/delete')) { S.posts = S.posts.filter((x) => x.id !== id); post.remove(); ctx.toast('Post removed'); }
        return;
      }
      if (t.closest('[data-share]')) {
        let targets;
        try { targets = await ctx.call('/api/events/discord'); } catch (er) { return ctx.toast(er.message, true); }
        if (!targets.ready) return ctx.toast(targets.error || 'Discord isn’t connected yet', true);
        let pick = null;
        const ok = await UI.modal({ title: 'Share to Discord', icon: '📣', body: `<label class="fld">Channel <select id="fd-ch">${(targets.channels ?? []).map((c) => `<option value="${esc(c.id)}">#${esc(c.name)}</option>`).join('')}</select></label>`,
          actions: [{ label: 'Cancel', value: null, kind: 'ghost' }, { label: '📣 Share', value: 'go' }], onOpen: (d) => { const s = $('#fd-ch', d); pick = s.value; s.onchange = () => { pick = s.value; }; } });
        if (ok === 'go' && pick && await act('/api/feed/share', { channel: pick })) ctx.toast('Shared to Discord');
      }
    });
    load();
  }

  async function publicStrip(el) {
    try {
      const r = await fetch(`${MAPI}/api/feed/public`);
      if (!r.ok) return;
      const { posts } = await r.json();
      if (!posts.length) return;
      el.hidden = false;
      el.innerHTML = `<section class="fd-public"><h2>📰 From the squad</h2><div class="fd-public-list">${posts.map((p) => `<article class="card fd-post"><header>${UI.avatar(p.by.a, p.by.n, 30)}<b>${esc(p.by.n)}</b><span class="grow"></span><small class="muted">${UI.time(p.at)}</small></header>${p.text ? `<p class="fd-text">${linkify(p.text)}</p>` : ''}${mediaHtml(p.media)}${embedHtml(p.embed)}
<footer class="small muted">${Object.entries(p.reactions).map(([e, n]) => `${e} ${n}`).join(' · ')}${p.comments ? ` · 💬 ${p.comments}` : ''}</footer></article>`).join('')}</div></section>`;
      el.addEventListener('click', (e) => { const fr = e.target.closest('[data-frame]'); if (fr) fr.outerHTML = `<div class="fd-frame"><iframe src="${esc(fr.dataset.frame)}" title="Embedded clip" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`; });
    } catch {}
  }

  window.NXFeed = { tab, publicStrip, embedHtml };
})();
