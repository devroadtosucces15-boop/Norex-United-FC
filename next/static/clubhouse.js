// Hub › Clubhouse: the club feed (/api/feed, filters + paging) and the ideas board (/api/suggestions), read-only for now.
// Post text is the live site's markdown-lite (docs-md.js); photos and clips come from the Worker's /media/ route.
// Each panel loads as a skeleton and lands; errors offer a retry.
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

  // ---------- 📰 club feed ----------
  const FILTERS = [['all', '🌍 Everything'], ['highlight', '🎬 Highlights'], ['league', '🏟️ League'], ['rush', '⚡ Rush'], ['mine', '🙋 Mine']];
  const F = { f: 'all', posts: [], more: false, next: 0, tags: {} };
  const media = (list) => {
    const live = list.filter((m) => !m.gone), gone = list.length - live.length; if (!list.length) return '';
    return `<div class="ch-media n${Math.min(live.length, 4)}">${live.map((m) => m.kind === 'video'
      ? `<video src="${esc(`${API}/media/${m.key}`)}" controls preload="metadata" playsinline></video>`
      : `<img src="${esc(`${API}/media/${m.key}`)}" alt="" loading="lazy"${m.w && m.h ? ` width="${m.w}" height="${m.h}"` : ''}>`).join('')}</div>${gone ? `<p class="muted tiny">${gone} photo or clip no longer available</p>` : ''}`;
  };
  const post = (p) => {
    const tag = F.tags[p.tag] ?? ['💬', 'Chat'], reacts = Object.entries(p.reacts || {}).filter(([, n]) => n);
    const top = (p.comments || []).filter((c) => !c.removed && !c.parent).slice(-2);
    return `<article class="ch-post${p.pinned ? ' pin' : ''}" id="p${p.id}"><header class="ch-ph">${av(p.by.a, p.by.n)}<div><b class="fit">${esc(p.by.n)}</b><small class="muted">${p.by.tag ? `@${esc(p.by.tag)} · ` : ''}${ago(p.at)}${p.edited ? ' · edited' : ''}</small></div><span class="pill">${tag[0]} ${esc(tag[1])}</span>${p.pinned ? '<span class="pill s">📌 Pinned</span>' : ''}</header>
${p.text ? `<div class="md ch-body">${md(p.text)}</div>` : ''}${media(p.media || [])}
<footer class="ch-pf">${reacts.length ? reacts.map(([e, n]) => `<span class="ch-rx${(p.mine || []).includes(e) ? ' mine' : ''}" title="${esc((p.who?.[e] || []).join(', '))}">${e} <b class="num">${n}</b></span>`).join('') : '<span class="muted small">No reactions yet</span>'}<span class="ch-nc muted small">💬 ${p.nComments || 0}</span></footer>
${top.length ? `<div class="ch-cm">${top.map((c) => `<div class="ch-c">${av(c.by.a, c.by.n, 22)}<div><b>${esc(c.by.n)}</b> <span class="muted tiny">${ago(c.at)}</span><div class="md small">${md(c.text)}</div></div></div>`).join('')}${p.nComments > top.length ? `<p class="muted tiny">+ ${p.nComments - top.length} more in the live Hub</p>` : ''}</div>` : ''}</article>`;
  };
  const feedHtml = () => `<div class="chips ch-filters" role="tablist" aria-label="Filter">${FILTERS.map(([k, l]) => `<button type="button" role="tab" class="chip${k === F.f ? ' on' : ''}" aria-selected="${k === F.f}" data-ff="${k}">${l}</button>`).join('')}</div>
${F.posts.length ? `<div class="ch-posts">${F.posts.map(post).join('')}</div>${F.more ? '<button type="button" class="btn ghost" data-fmore>Load older posts</button>' : '<p class="muted tiny" style="margin-top:10px">That is everything.</p>'}`
    : empty('📰', F.f === 'mine' ? 'You have not posted yet' : 'Nothing posted here yet', 'Be the first: post a goal, a result or a Rush invite in the live Hub.')}
<p class="muted small" style="margin-top:12px">Posting, reactions and comments happen in the live Hub for now.</p>`;
  const loadFeed = async (more = false) => {
    if (!more) M?.skeleton(feedEl, 5);
    try {
      const r = await A.call(`/api/feed?f=${F.f}${more && F.next ? `&before=${F.next}` : ''}`);
      F.tags = r.tags || F.tags; F.posts = more ? [...F.posts, ...r.posts] : r.posts; F.more = !!r.more; F.next = r.next || 0;
      if (more) { const keep = scrollY; feedEl.innerHTML = feedHtml(); scrollTo(0, keep); fit(feedEl); } else put(feedEl, feedHtml(), fit);
    } catch (e) { feedEl.removeAttribute('aria-busy'); if (more) M?.toast(e.message || 'Could not load more posts', { kind: 'err' }); else feedEl.innerHTML = failBox('feed', 'the club feed', e); }
  };
  feedEl.addEventListener('click', (e) => {
    const f = e.target.closest('[data-ff]'); if (f && f.dataset.ff !== F.f) { F.f = f.dataset.ff; loadFeed(); return; }
    const m = e.target.closest('[data-fmore]'); if (m) { m.disabled = true; m.textContent = 'Loading…'; loadFeed(true); }
  });

  // ---------- 💡 ideas board ----------
  const STATUS = [['open', '🗳️', 'Open'], ['planned', '🛠️', 'Planned'], ['done', '✅', 'Done'], ['declined', '✖️', 'Declined']];
  let I = null, st = 'open';
  const ideasHtml = () => {
    const by = Object.fromEntries(STATUS.map(([k]) => [k, I.items.filter((x) => x.status === k)])), list = [...by[st]].sort((a, b) => b.up - a.up || b.at - a.at);
    return `<div class="chips ch-filters" role="tablist" aria-label="Status">${STATUS.map(([k, i, l]) => `<button type="button" role="tab" class="chip${k === st ? ' on' : ''}" aria-selected="${k === st}" data-is="${k}">${i} ${l} <small class="muted">${by[k].length}</small></button>`).join('')}</div>
${list.length ? `<div class="ch-ideas">${list.map((x) => `<article class="ch-idea${x.own ? ' own' : ''}"><div class="ch-up${x.voted ? ' on' : ''}" aria-label="${x.up} votes${x.voted ? ', including yours' : ''}"><span aria-hidden="true">▲</span><b class="num">${x.up}</b></div>
<div class="ch-ib"><b>${esc(x.title)}</b>${x.body ? `<p class="small">${esc(x.body)}</p>` : ''}<small class="muted">${x.by ? esc(x.by.n) : 'Anonymous'}${x.own ? ' (you)' : ''} · ${ago(x.at)}</small>
${x.reply ? `<div class="ch-reply"><span>🧢</span><div><small class="muted">${esc(x.repliedBy || 'Managers')}${x.repliedAt ? ` · ${ago(x.repliedAt)}` : ''}</small><p class="small">${esc(x.reply)}</p></div></div>` : ''}</div></article>`).join('')}</div>`
      : empty(STATUS.find(([k]) => k === st)[1], `No ${STATUS.find(([k]) => k === st)[2].toLowerCase()} ideas`, st === 'open' ? 'Have one? Suggest it in the live Hub and members can vote it up.' : '')}
<p class="muted small" style="margin-top:12px">${I.items.length} idea${I.items.length === 1 ? '' : 's'} on the board. Suggesting and voting happen in the live Hub for now.</p>`;
  };
  const loadIdeas = () => { M?.skeleton(ideasEl, 4); A.call('/api/suggestions').then((r) => { I = r; if (!I.items.some((x) => x.status === 'open') && I.items.length) st = (STATUS.find(([k]) => I.items.some((x) => x.status === k)) || STATUS[0])[0]; put(ideasEl, ideasHtml(), fit); }).catch((e) => { ideasEl.removeAttribute('aria-busy'); ideasEl.innerHTML = failBox('ideas', 'the ideas board', e); }); };
  ideasEl.addEventListener('click', (e) => { const b = e.target.closest('[data-is]'); if (!b || b.dataset.is === st) return; st = b.dataset.is; ideasEl.innerHTML = ideasHtml(); fit(ideasEl); });

  d.addEventListener('click', (e) => { const b = e.target.closest('[data-chretry]'); if (b) (b.dataset.chretry === 'feed' ? loadFeed : loadIdeas)(); });
  (A.ready || Promise.resolve()).then(() => { loadFeed(); loadIdeas(); });
})();
