// Club feed on the client (roadmap P6.1) – feed.html [data-feed].
// Composer (tag + text, links auto-embed via web/docs-md.js), filters, posts with club reactions, comments with one level
// of replies, ⋯ menu (copy link, edit, pin, remove). Everything is optimistic: redraw first, then replace with the
// server's answer or roll back with a toast. Permalinks: feed.html#p<id>.
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

  function reacts(p) {
    const used = S.emoji.filter((e) => p.reacts[e]);
    return `<div class="fd-react">${used.map((e) => `<button type="button" class="fd-rx${p.mine.includes(e) ? ' on' : ''}" data-rx="${e}" aria-pressed="${p.mine.includes(e)}" data-tip="${esc((p.who[e] ?? []).join(', ') + (p.reacts[e] > (p.who[e] ?? []).length ? ` +${p.reacts[e] - p.who[e].length}` : ''))}"><span>${e}</span><b>${p.reacts[e]}</b></button>`).join('')}
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
  function post(p) {
    const [ic, label] = S.tags[p.tag] ?? S.tags.chat;
    const mine = p.by.id === me;
    const menu = [['copy', '🔗 Copy link'], mine && ['edit', '✏️ Edit'], S.canModerate && ['pin', p.pinned ? '📌 Unpin' : '📌 Pin to top'], (mine || S.canModerate) && ['remove', mine ? '🗑 Delete' : '🛡 Remove post']].filter(Boolean);
    return `<article class="fd-post t-${esc(p.tag)}${p.pinned ? ' pinned' : ''}" id="p${p.id}" data-id="${p.id}">
<header class="fd-head">${who(p.by)}<span class="fd-meta">${p.pinned ? '<span class="fd-pin">📌 Pinned</span>' : ''}<span class="fd-tag">${ic} ${esc(label)}</span><a href="#p${p.id}" class="fd-when">${UI.time(p.at)}${p.edited ? ' · edited' : ''}</a></span>
<span class="fd-more-wrap"><button type="button" class="fd-more" data-act="menu" aria-label="Post options" aria-expanded="false">⋯</button><span class="fd-menu" hidden>${menu.map(([k, l]) => `<button type="button" data-act="${k}">${l}</button>`).join('')}</span></span></header>
<div class="fd-body md">${body(p.text)}</div>
${reacts(p)}
<footer class="fd-foot"><button type="button" class="fd-cbtn" data-act="comments" aria-expanded="${open.has(p.id)}">💬 ${p.nComments ? plural(p.nComments, 'comment') : 'Comment'}</button></footer>
${comments(p)}</article>`;
  }
  function composer() {
    const s = session();
    return `<form class="fd-compose card" id="fd-compose">${UI.avatar(s?.a, s?.n, 42)}<div class="fd-cmp-main">
<textarea name="text" rows="3" maxlength="2000" required placeholder="Share a goal, a result, a Rush invite… paste a YouTube / Twitch / Streamable link to embed it" aria-label="New post"></textarea>
<div class="fd-cmp-row"><div class="fd-tags" role="radiogroup" aria-label="Tag">${Object.entries(S.tags).map(([k, [i, l]], n) => `<label><input type="radio" name="tag" value="${k}"${n === 0 ? ' checked' : ''}><span>${i} ${esc(l)}</span></label>`).join('')}</div>
<span class="grow"></span><small class="muted fd-left">${S.left} of ${S.perDay} left today</small><button class="btn" type="submit"${S.left ? '' : ' disabled'}>📣 Post</button></div></div></form>`;
  }
  function draw() {
    const list = S.posts;
    el.innerHTML = `${composer()}
<div class="fd-filters chips" role="tablist">${FILTERS.map(([k, i, l]) => `<button type="button" class="chip${k === f ? ' strong' : ''}" data-f="${k}" role="tab" aria-selected="${k === f}">${i} ${l}</button>`).join('')}</div>
<div class="fd-list">${list.length ? list.map(post).join('') : UI.empty({ icon: f === 'mine' ? '✍️' : '📰', title: f === 'mine' ? 'You haven’t posted yet' : 'Nothing here yet', text: f === 'all' ? 'Be the first – share a clip, a result or a Rush invite.' : 'Try another filter, or post one yourself.' })}</div>
${S.more ? '<p class="fd-morebox"><button type="button" class="btn ghost" data-act="more">Load older posts</button></p>' : ''}`;
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
    const m = /^#p(\d+)$/.exec(location.hash);
    if (!m || !S) return;
    if (!find(m[1])) {
      try { const d = await call(`/api/feed/post?id=${m[1]}`); S.posts.unshift(d.post); draw(); } catch (e) { toast(e.message, true); return; }
    }
    open.add(+m[1]); redraw(find(m[1]));
    $(`#p${m[1]}`, el)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    $(`#p${m[1]}`, el)?.classList.add('flash');
  }

  // ---------- actions ----------
  async function react(p, emoji) {
    const before = { reacts: { ...p.reacts }, mine: [...p.mine], who: p.who };
    const on = p.mine.includes(emoji);
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
    el.addEventListener('input', (e) => { if (e.target.matches('.fd-cform textarea')) { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; } });
    el.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fm = e.target;
      const btn = $('button[type=submit]', fm);
      if (fm.id === 'fd-compose') {
        const text = fm.text.value.trim();
        if (!text) return;
        btn.disabled = true;
        try {
          const { post: np } = await call('/api/feed/post', { text, tag: fm.tag.value });
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
