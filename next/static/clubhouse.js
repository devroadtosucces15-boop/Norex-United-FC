// Hub › Clubhouse: the club feed (/api/feed – filters, paging, post, react, comment and reply) and the ideas board
// (/api/suggestions – suggest, vote). Post text is the live site's markdown-lite (docs-md.js); photos and clips come from
// the Worker's /media/ route (uploading them stays in the live Hub). Each panel loads as a skeleton and lands; every
// write goes through the submit button state and reports errors in a toast.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s);
  const feedEl = $('#chfeed'), ideasEl = $('#chideas'); if (!feedEl || !ideasEl) return;
  const A = window.NorexAuth, M = window.NorexMotion, API = window.NOREX_API;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const md = (s) => (window.NXMd ? NXMd.html(s, { host: location.hostname }) : `<p>${esc(s)}</p>`);
  const put = (el, html, then) => (M ? M.land(el, html, then) : (el.innerHTML = html, then && then(el)));
  const fit = (el) => setTimeout(() => window.NorexFit?.(el), 60);
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60e3); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; if (m < 1440) return `${Math.floor(m / 60)} h ago`; if (m < 10080) return `${Math.floor(m / 1440)} d ago`; try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch { return ''; } };
  const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const ini = (n) => String(n || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  const av = (a, n, s = 38) => a ? `<img class="sq-av" src="${esc(a)}" alt="" width="${s}" height="${s}" loading="lazy" data-ini="${esc(ini(n))}" style="--s:${s}px;--h:${hue(n)}">` : `<span class="sq-av ini" style="--s:${s}px;--h:${hue(n)}" aria-hidden="true">${esc(ini(n))}</span>`;
  addEventListener('error', (e) => { const i = e.target; if (!(i instanceof HTMLImageElement) || !i.classList.contains('sq-av')) return; const s = d.createElement('span'); s.className = 'sq-av ini'; s.style.cssText = i.style.cssText; s.textContent = i.dataset.ini || '?'; i.replaceWith(s); }, true);
  const empty = (icon, title, text = '', extra = '') => `<div class="panel sq-empty"><span>${icon}</span><div><b>${title}</b>${text ? `<p class="muted small">${text}</p>` : ''}${extra}</div></div>`;
  const failBox = (k, what, e) => e?.status === 404 && /not available/i.test(e.message)
    ? empty('🌙', `${what} is not switched on yet`, 'The managers turn this on for the squad when it is ready.')
    : empty('📡', `Could not load ${what}`, esc(e?.message || 'The club server did not answer.'), `<button type="button" class="btn ghost" data-chretry="${k}">↻ Try again</button>`);
  if (!API || !A?.token) { [feedEl, ideasEl].forEach((el) => (el.innerHTML = '<p class="muted small">This loads here for signed-in members.</p>')); return; }
  const post = (path, body) => A.call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const busy = (btn, work) => (M ? M.submit(btn, work) : work());
  const oops = (e) => M?.toast(e.message || 'Could not save that', { kind: 'err' });
  const count = (ta) => { const c = ta.parentElement.querySelector('[data-left]'); if (c) { const n = ta.maxLength - ta.value.length; c.textContent = n < 200 ? `${n} left` : ''; } };

  // ---------- 📰 club feed ----------
  const FILTERS = [['all', '🌍 Everything'], ['highlight', '🎬 Highlights'], ['league', '🏟️ League'], ['rush', '⚡ Rush'], ['mine', '🙋 Mine']];
  const F = { f: 'all', posts: [], more: false, next: 0, tags: {}, emoji: [], left: null, perDay: 10, tag: 'chat', open: new Set(), reply: {} };
  const media = (list) => {
    const live = list.filter((m) => !m.gone), gone = list.length - live.length; if (!list.length) return '';
    return `<div class="ch-media n${Math.min(live.length, 4)}">${live.map((m) => m.kind === 'video'
      ? `<video src="${esc(`${API}/media/${m.key}`)}" controls preload="metadata" playsinline></video>`
      : `<img src="${esc(`${API}/media/${m.key}`)}" alt="" loading="lazy"${m.w && m.h ? ` width="${m.w}" height="${m.h}"` : ''}>`).join('')}</div>${gone ? `<p class="muted tiny">${gone} photo or clip no longer available</p>` : ''}`;
  };
  // reactions: every club emoji someone used is a toggle; ＋ opens the rest
  const foot = (p) => {
    const used = Object.entries(p.reacts || {}).filter(([, n]) => n), mine = p.mine || [], rest = F.emoji.filter((e) => !used.some(([u]) => u === e));
    return `${used.map(([e, n]) => `<button type="button" class="ch-rx${mine.includes(e) ? ' mine' : ''}" data-rx="${e}" aria-pressed="${mine.includes(e)}" title="${esc((p.who?.[e] || []).join(', '))}">${e} <b class="num">${n}</b></button>`).join('')}
${rest.length ? `<span class="ch-rxadd"><button type="button" class="ch-rx ghost" data-rxmore aria-expanded="false" aria-label="Add a reaction">😀＋</button><span class="ch-rxpick" hidden>${rest.map((e) => `<button type="button" data-rx="${e}" aria-label="React ${e}">${e}</button>`).join('')}</span></span>` : ''}
<button type="button" class="ch-nc" data-cm aria-expanded="${F.open.has(p.id)}">💬 <b class="num">${p.nComments || 0}</b> ${F.open.has(p.id) ? 'Hide' : p.nComments === 1 ? 'Comment' : p.nComments ? 'Comments' : 'Comment'}</button>`;
  };
  const cmt = (c, p, reply = false) => c.removed ? `<div class="ch-c gone"><span class="muted tiny">Comment removed</span></div>`
    : `<div class="ch-c${reply ? ' re' : ''}${c.by.id === A.session?.u ? ' own' : ''}" data-cid="${c.id}">${av(c.by.a, c.by.n, reply ? 20 : 24)}<div><b>${esc(c.by.n)}</b> <span class="muted tiny">${ago(c.at)}</span><div class="md small">${md(c.text)}</div><button type="button" class="ch-rp" data-rp="${c.id}" data-rpn="${esc(c.by.n)}">↩️ Reply</button></div></div>`;
  const thread = (p) => {
    const cs = p.comments || [], tops = cs.filter((c) => !c.parent), r = F.reply[p.id];
    return `<div class="ch-thread">${tops.length ? tops.map((c) => cmt(c, p) + cs.filter((x) => x.parent === c.id).map((x) => cmt(x, p, true)).join('')).join('') : '<p class="muted tiny">No comments yet. Start it off.</p>'}
<form class="ch-cf" data-cf>${r ? `<div class="ch-rpto">↩️ Replying to <b>${esc(r.n)}</b> <button type="button" data-rpx aria-label="Cancel reply">✕</button></div>` : ''}<div class="ch-cfr"><textarea name="t" rows="1" maxlength="500" placeholder="${r ? `Reply to ${esc(r.n)}…` : 'Write a comment…'}" aria-label="Comment"></textarea><button type="submit" class="btn" aria-label="Send comment">Send</button></div><small class="muted tiny" data-left></small></form></div>`;
  };
  const card = (p) => {
    const tag = F.tags[p.tag] ?? ['💬', 'Chat'], open = F.open.has(p.id), top = (p.comments || []).filter((c) => !c.removed && !c.parent).slice(-2);
    return `<article class="ch-post${p.pinned ? ' pin' : ''}" id="p${p.id}" data-pid="${p.id}"><header class="ch-ph">${av(p.by.a, p.by.n)}<div><b class="fit">${esc(p.by.n)}</b><small class="muted">${p.by.tag ? `@${esc(p.by.tag)} · ` : ''}${ago(p.at)}${p.edited ? ' · edited' : ''}</small></div><span class="pill">${tag[0]} ${esc(tag[1])}</span>${p.pinned ? '<span class="pill s">📌 Pinned</span>' : ''}</header>
${p.text ? `<div class="md ch-body">${md(p.text)}</div>` : ''}${media(p.media || [])}
<footer class="ch-pf">${foot(p)}</footer>
${open ? thread(p) : top.length ? `<div class="ch-cm">${top.map((c) => `<div class="ch-c">${av(c.by.a, c.by.n, 22)}<div><b>${esc(c.by.n)}</b> <span class="muted tiny">${ago(c.at)}</span><div class="md small">${md(c.text)}</div></div></div>`).join('')}${p.nComments > top.length ? `<button type="button" class="ch-more" data-cm>See all ${p.nComments} comments</button>` : ''}</div>` : ''}</article>`;
  };
  const composer = () => `<form class="panel ch-new" data-newpost><div class="ch-newh">${av(A.avatar, A.name || 'You', 34)}<textarea name="t" rows="2" maxlength="2000" placeholder="Share a goal, a result or a Rush invite…" aria-label="New post"></textarea></div>
<div class="ch-newf"><div class="chips" role="radiogroup" aria-label="Tag">${Object.entries(F.tags).map(([k, [i, l]]) => `<button type="button" role="radio" class="chip${k === F.tag ? ' on' : ''}" aria-checked="${k === F.tag}" data-tag="${k}">${i} ${esc(l)}</button>`).join('')}</div>
<span class="ch-newgo"><small class="muted tiny" data-left></small>${F.left != null ? `<small class="muted tiny">${F.left} of ${F.perDay} posts left today</small>` : ''}<button type="submit" class="btn"${F.left === 0 ? ' disabled' : ''}>📣 Post</button></span></div>
<p class="muted tiny ch-tip">**bold**, links and YouTube or Twitch clips work. Photos and clips upload in the live Hub for now. Ctrl + Enter posts.</p></form>`;
  const feedHtml = () => `${composer()}<div class="chips ch-filters" role="tablist" aria-label="Filter">${FILTERS.map(([k, l]) => `<button type="button" role="tab" class="chip${k === F.f ? ' on' : ''}" aria-selected="${k === F.f}" data-ff="${k}">${l}</button>`).join('')}</div>
${F.posts.length ? `<div class="ch-posts">${F.posts.map(card).join('')}</div>${F.more ? '<button type="button" class="btn ghost" data-fmore>Load older posts</button>' : '<p class="muted tiny" style="margin-top:10px">That is everything.</p>'}`
    : `<div class="ch-posts">${empty('📰', F.f === 'mine' ? 'You have not posted yet' : 'Nothing posted here yet', 'Be the first: post a goal, a result or a Rush invite above.')}</div>`}`;
  const loadFeed = async (more = false) => {
    if (!more) M?.skeleton(feedEl, 5);
    try {
      const r = await A.call(`/api/feed?f=${F.f}${more && F.next ? `&before=${F.next}` : ''}`);
      F.tags = r.tags || F.tags; F.emoji = r.emoji || F.emoji; F.left = r.left ?? F.left; F.perDay = r.perDay || F.perDay;
      F.posts = more ? [...F.posts, ...r.posts] : r.posts; F.more = !!r.more; F.next = r.next || 0;
      if (more) { const keep = scrollY; feedEl.innerHTML = feedHtml(); scrollTo(0, keep); fit(feedEl); } else put(feedEl, feedHtml(), fit);
    } catch (e) { feedEl.removeAttribute('aria-busy'); if (more) M?.toast(e.message || 'Could not load more posts', { kind: 'err' }); else feedEl.innerHTML = failBox('feed', 'the club feed', e); }
  };
  // swap one post in place (keeps scroll and the other posts' drafts)
  const swap = (p, focus) => {
    const i = F.posts.findIndex((x) => x.id === p.id); if (i < 0) return; F.posts[i] = p;
    const old = $(`#p${p.id}`, feedEl); if (!old) return;
    const seen = new Set([...old.querySelectorAll('[data-cid]')].map((x) => x.dataset.cid));
    old.outerHTML = card(p); const el = $(`#p${p.id}`, feedEl); fit(el);
    el.querySelectorAll('[data-cid]').forEach((x) => { if (!seen.has(x.dataset.cid) && seen.size) x.classList.add('ch-in'); });
    if (focus) el.querySelector('[data-cf] textarea')?.focus();
  };
  feedEl.addEventListener('click', async (e) => {
    const t = e.target;
    const f = t.closest('[data-ff]'); if (f && f.dataset.ff !== F.f) { F.f = f.dataset.ff; loadFeed(); return; }
    const m = t.closest('[data-fmore]'); if (m) { m.disabled = true; m.textContent = 'Loading…'; loadFeed(true); return; }
    const tg = t.closest('[data-tag]'); if (tg) { F.tag = tg.dataset.tag; tg.parentElement.querySelectorAll('[data-tag]').forEach((b) => { b.classList.toggle('on', b === tg); b.setAttribute('aria-checked', b === tg); }); return; }
    const art = t.closest('[data-pid]'); if (!art) return;
    const p = F.posts.find((x) => x.id === +art.dataset.pid); if (!p) return;
    const more = t.closest('[data-rxmore]');
    if (more) { const pick = more.nextElementSibling, open = pick.hidden; pick.hidden = !open; more.setAttribute('aria-expanded', open); if (open) { pick.style.left = ''; pick.style.right = ''; if (pick.getBoundingClientRect().right > innerWidth - 8) { pick.style.left = 'auto'; pick.style.right = '0'; } } return; }
    const rx = t.closest('[data-rx]');
    if (rx) {
      const e2 = rx.dataset.rx; rx.disabled = true;
      try { const r = await post('/api/feed/react', { id: p.id, emoji: e2 }); Object.assign(p, { reacts: r.reacts, who: r.who, mine: r.mine }); const pf = art.querySelector('.ch-pf'); pf.innerHTML = foot(p); M?.pulse(pf.querySelector(`[data-rx="${e2}"]`)); M?.haptic(); }
      catch (er) { oops(er); rx.disabled = false; }
      return;
    }
    if (t.closest('[data-cm]')) { F.open.has(p.id) ? F.open.delete(p.id) : F.open.add(p.id); delete F.reply[p.id]; swap(p, F.open.has(p.id)); return; }
    const rp = t.closest('[data-rp]'); if (rp) { F.reply[p.id] = { id: +rp.dataset.rp, n: rp.dataset.rpn }; swap(p, true); return; }
    if (t.closest('[data-rpx]')) { delete F.reply[p.id]; swap(p, true); }
  });
  feedEl.addEventListener('input', (e) => { if (e.target.matches('textarea')) { count(e.target); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 240) + 'px'; } });
  feedEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.matches('textarea')) { e.preventDefault(); e.target.form?.requestSubmit(); } });
  feedEl.addEventListener('submit', async (e) => {
    e.preventDefault(); const form = e.target, ta = form.querySelector('textarea'), btn = form.querySelector('[type=submit]'), text = ta.value.trim();
    if (!text) { ta.focus(); M?.toast(form.matches('[data-newpost]') ? 'Write something first' : 'Write a comment first', { kind: 'err' }); return; }
    if (form.matches('[data-newpost]')) {
      try {
        const r = await busy(btn, () => post('/api/feed/post', { text, tag: F.tag }));
        ta.value = ''; ta.style.height = ''; count(ta); if (F.left != null) F.left = Math.max(0, F.left - 1);
        const box = $('.ch-posts', feedEl), pins = F.posts.filter((x) => x.pinned).length;
        if (F.f === 'all' || F.f === 'mine' || F.f === r.post.tag) {
          F.posts.splice(pins, 0, r.post);
          const add = () => { box.querySelector('.sq-empty')?.remove(); const w = d.createElement('div'); w.innerHTML = card(r.post); const el = w.firstElementChild; box.insertBefore(el, box.children[pins] || null); el.classList.add('ch-in'); fit(el); };
          M ? M.flip(box, add) : add();
        }
        const left = form.querySelector('.ch-newgo small:nth-of-type(2)'); if (left && F.left != null) left.textContent = `${F.left} of ${F.perDay} posts left today`;
        M?.toast('Posted to the club feed', { kind: 'ok', icon: '📣' });
      } catch (er) { oops(er); }
      return;
    }
    const art = form.closest('[data-pid]'), p = F.posts.find((x) => x.id === +art.dataset.pid); if (!p) return;
    try {
      const r = await busy(btn, () => post('/api/feed/comment', { id: p.id, text, ...(F.reply[p.id] ? { parent: F.reply[p.id].id } : {}) }));
      delete F.reply[p.id]; swap(r.post, true); M?.toast('Comment posted', { kind: 'ok', icon: '💬' });
    } catch (er) { oops(er); }
  });
  d.addEventListener('click', (e) => { if (!e.target.closest('.ch-rxadd')) feedEl.querySelectorAll('.ch-rxpick:not([hidden])').forEach((p) => { p.hidden = true; p.previousElementSibling.setAttribute('aria-expanded', 'false'); }); });

  // ---------- 💡 ideas board ----------
  const STATUS = [['open', '🗳️', 'Open'], ['planned', '🛠️', 'Planned'], ['done', '✅', 'Done'], ['declined', '✖️', 'Declined']];
  let I = null, st = 'open', form = false;
  const idea = (x) => `<article class="ch-idea${x.own ? ' own' : ''}" data-iid="${x.id}"><button type="button" class="ch-up${x.voted ? ' on' : ''}" data-vote="${x.id}"${x.own || x.status !== 'open' ? ' disabled' : ''} aria-pressed="${!!x.voted}" aria-label="${x.up} votes${x.voted ? ', including yours. Take your vote back' : '. Vote this up'}" title="${x.own ? 'Your idea – others vote on it' : x.status !== 'open' ? 'Voting is closed for this idea' : x.voted ? 'Take your vote back' : 'Vote this up'}"><span aria-hidden="true">▲</span><b class="num">${x.up}</b></button>
<div class="ch-ib"><b>${esc(x.title)}</b>${x.body ? `<p class="small">${esc(x.body)}</p>` : ''}<small class="muted">${x.by ? esc(x.by.n) : 'Anonymous'}${x.own ? ' (you)' : ''}${x.own && x.anon ? ' · anonymous to members' : ''} · ${ago(x.at)}</small>
${x.reply ? `<div class="ch-reply"><span>🧢</span><div><small class="muted">${esc(x.repliedBy || 'Managers')}${x.repliedAt ? ` · ${ago(x.repliedAt)}` : ''}</small><p class="small">${esc(x.reply)}</p></div></div>` : ''}</div></article>`;
  const suggestForm = () => `<form class="panel ch-sug" data-sug><label class="ch-l">💡 Your idea in a few words<input name="it" maxlength="100" required minlength="4" placeholder="e.g. Weekly Rush cup on Sundays" autocomplete="off"></label>
<label class="ch-l">Details <span class="muted tiny">(optional)</span><textarea name="ib" rows="3" maxlength="1000" placeholder="Why it would help the club, how it could work…"></textarea></label><small class="muted tiny" data-left></small>
<label class="sq-only"><input type="checkbox" name="ia"> Post anonymously (the managers can still see it is you)</label>
<div class="sq-acts"><button type="submit" class="btn gold">💡 Add to the board</button><button type="button" class="btn ghost" data-sugx>Cancel</button></div></form>`;
  const ideasHtml = () => {
    const by = Object.fromEntries(STATUS.map(([k]) => [k, I.items.filter((x) => x.status === k)])), list = [...by[st]].sort((a, b) => b.up - a.up || b.at - a.at);
    return `<div class="sq-bar"><div class="chips ch-filters" role="tablist" aria-label="Status">${STATUS.map(([k, i, l]) => `<button type="button" role="tab" class="chip${k === st ? ' on' : ''}" aria-selected="${k === st}" data-is="${k}">${i} ${l} <small class="muted">${by[k].length}</small></button>`).join('')}</div>${I.canSend !== false && !form ? '<button type="button" class="btn gold" data-sugopen>💡 Suggest an idea</button>' : ''}</div>
${form ? suggestForm() : ''}
${list.length ? `<div class="ch-ideas">${list.map(idea).join('')}</div>`
      : empty(STATUS.find(([k]) => k === st)[1], `No ${STATUS.find(([k]) => k === st)[2].toLowerCase()} ideas`, st === 'open' ? 'Have one? Suggest it and members can vote it up.' : '')}
<p class="muted small" style="margin-top:12px">${I.items.length} idea${I.items.length === 1 ? '' : 's'} on the board. One vote per idea; tap ▲ again to take it back.</p>`;
  };
  const paintIdeas = () => { ideasEl.innerHTML = ideasHtml(); fit(ideasEl); };
  const loadIdeas = () => { M?.skeleton(ideasEl, 4); A.call('/api/suggestions').then((r) => { I = r; if (!I.items.some((x) => x.status === 'open') && I.items.length) st = (STATUS.find(([k]) => I.items.some((x) => x.status === k)) || STATUS[0])[0]; put(ideasEl, ideasHtml(), fit); }).catch((e) => { ideasEl.removeAttribute('aria-busy'); ideasEl.innerHTML = failBox('ideas', 'the ideas board', e); }); };
  ideasEl.addEventListener('click', async (e) => {
    const t = e.target;
    const b = t.closest('[data-is]'); if (b) { if (b.dataset.is !== st) { st = b.dataset.is; paintIdeas(); } return; }
    if (t.closest('[data-sugopen]')) { form = true; paintIdeas(); $('[data-sug] input', ideasEl)?.focus(); return; }
    if (t.closest('[data-sugx]')) { form = false; paintIdeas(); return; }
    const v = t.closest('[data-vote]');
    if (v && !v.disabled) {
      const x = I.items.find((i) => i.id === +v.dataset.vote); if (!x) return;
      v.disabled = true;
      try {
        const r = await post('/api/suggestions/vote', { id: x.id, on: !x.voted }); I = r;
        const box = $('.ch-ideas', ideasEl), now = I.items.find((i) => i.id === x.id);
        const redo = () => { const by = [...I.items.filter((i) => i.status === st)].sort((a, c) => c.up - a.up || c.at - a.at); const keep = new Map([...box.children].map((c) => [c.dataset.iid, c])); by.forEach((i) => { const old = keep.get(String(i.id)); if (i.id === x.id || !old) { const w = d.createElement('div'); w.innerHTML = idea(i); const el = w.firstElementChild; old ? old.replaceWith(el) : null; box.appendChild(el); } else box.appendChild(old); }); };
        M ? M.flip(box, redo) : redo();
        M?.pulse($(`[data-vote="${x.id}"]`, ideasEl)); M?.haptic();
        M?.toast(now?.voted ? `Voted for “${x.title}”` : 'Vote taken back', { kind: 'ok', icon: now?.voted ? '▲' : '↩️' });
      } catch (er) { oops(er); v.disabled = false; }
    }
  });
  ideasEl.addEventListener('input', (e) => { if (e.target.matches('textarea')) count(e.target); });
  ideasEl.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target, btn = f.querySelector('[type=submit]'), title = f.elements.it.value.trim();
    if (title.length < 4) { f.elements.it.focus(); M?.toast('Sum the idea up in a few words (4+ characters)', { kind: 'err' }); return; }
    try {
      const before = new Set(I.items.map((x) => x.id));
      I = await busy(btn, () => post('/api/suggestions', { title, body: f.elements.ib.value.trim(), anon: f.elements.ia.checked }));
      form = false; st = 'open'; paintIdeas();
      const fresh = I.items.find((x) => !before.has(x.id)); if (fresh) { const el = $(`[data-iid="${fresh.id}"]`, ideasEl); el?.classList.add('ch-in'); el?.scrollIntoView({ block: 'nearest', behavior: M?.reduced() ? 'auto' : 'smooth' }); }
      M?.toast('Idea added. Members can vote it up now', { kind: 'ok', icon: '💡' });
    } catch (er) { oops(er); }
  });

  d.addEventListener('click', (e) => { const b = e.target.closest('[data-chretry]'); if (b) (b.dataset.chretry === 'feed' ? loadFeed : loadIdeas)(); });
  (A.ready || Promise.resolve()).then(() => { loadFeed(); loadIdeas(); });
})();
