// Club › News: the public side of the feed and the docs. Guests see the posts members marked public (GET /api/feed/public, flag feed) –
// the Worker answers 404 until the owner switches that flag to public, and then the panel says so plainly. Club docs themselves stay
// squad-only on the server (GET /api/docs returns nothing to guests), so signed-in members get their pinned docs listed here and everyone else gets the links.
(() => {
  const d = document, $ = (s, r = d) => r.querySelector(s), API = window.NOREX_API, A = window.NorexAuth, M = window.NorexMotion;
  const feed = $('[data-news-feed]'), docs = $('[data-news-docs]'); if (!feed) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const md = (s) => (window.NXMd ? NXMd.html(s, { host: location.hostname }) : `<p>${esc(s)}</p>`);
  const TAG = { chat: ['💬', 'Chat'], highlight: ['🎬', 'Highlight'], league: ['🏟️', 'League'], rush: ['⚡', 'Rush'] };
  const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 3600 ? Math.max(1, Math.round(s / 60)) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : s < 604800 ? Math.round(s / 86400) + ' d ago' : new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
  const empty = (icon, t, p, extra = '') => `<div class="panel nw-empty"><span class="em" aria-hidden="true">${icon}</span><div><b>${t}</b><p class="muted small" style="margin:4px 0 0">${p}</p>${extra}</div></div>`;
  const join = '<a class="btn ghost" href="join.html" style="margin-top:10px">Join the club</a>';
  const login = A?.loginUrl ? `<a class="btn ghost" data-login href="${esc(A.loginUrl())}" style="margin-top:10px">Sign in with Discord</a>` : '';

  if (!API) { feed.innerHTML = empty('📰', 'The live feed shows on the public site', 'This design build is not connected to the club server.'); }
  else fetch(API + '/api/feed/public', { cache: 'no-store', headers: A?.token ? { Authorization: 'Bearer ' + A.token } : {} })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((r) => {
      const posts = r.posts || [];
      if (!posts.length) { feed.innerHTML = empty('📰', 'Nothing shared publicly yet', 'Members can mark a post public from the club feed. When they do, it shows up here for everyone.', A?.token ? '' : login); return; }
      feed.innerHTML = `<div class="nw-posts" data-stagger>${posts.map((p) => {
        const m = (p.media || [])[0], t = TAG[p.tag] || TAG.chat, yt = (/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/.exec(p.text || '') || [])[1];
        const pic = m ? (m.kind === 'image' ? `<img class="nw-pic" src="${esc(API)}/media/${esc(m.key)}" alt="" loading="lazy">` : `<video class="nw-pic" src="${esc(API)}/media/${esc(m.key)}#t=0.1" muted playsinline preload="metadata" controls></video>`) : yt ? `<img class="nw-pic" src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy">` : '';
        return `<article class="panel nw-post">${pic}<div class="nw-pb"><div class="nw-ph"><span class="pill">${t[0]} ${t[1]}</span><b class="fit">${esc(p.by?.n || 'Member')}</b><small class="muted">${ago(p.at)}</small></div><p>${esc(p.text) || '<span class="muted">(photo or clip)</span>'}</p>${p.nReacts || p.nComments ? `<small class="muted">${p.nReacts ? '❤️ ' + p.nReacts : ''}${p.nComments ? ' 💬 ' + p.nComments : ''}</small>` : ''}</div></article>`;
      }).join('')}</div><p class="muted small" style="margin-top:12px">${A?.token ? 'The full feed is in the <a href="hub-clubhouse.html">Clubhouse</a>.' : 'Want the whole feed? Sign in or join the club.'}</p>`;
      M?.reveal?.(feed);
    })
    .catch((code) => { feed.innerHTML = code === 404 ? empty('🔒', 'The club feed is for members for now', A?.role === 'owner' ? 'Posts members mark public show here once the Club feed switch in the Boardroom is set to Public.' : 'Members see every post in the Clubhouse. Join the club or sign in to take part.', A?.token ? '<a class="btn ghost" href="hub-clubhouse.html" style="margin-top:10px">Open the Clubhouse</a>' : login + ' ' + join) : empty('📡', 'Could not reach the club server', 'Try again in a minute.'); });

  // signed-in members: their pinned club docs, straight from /api/docs (the server decides who may read)
  if (API && A?.token && docs) fetch(API + '/api/docs', { cache: 'no-store', headers: { Authorization: 'Bearer ' + A.token } }).then((r) => (r.ok ? r.json() : Promise.reject())).then((r) => {
    const items = (r.items || []).filter((x) => x.pinned).slice(0, 4); if (!items.length) return;
    docs.innerHTML = `<h3 style="margin:22px 0 10px">📌 Pinned for the squad</h3><div class="grid g2">${items.map((x) => `<details class="panel nw-d"><summary><b>${esc(x.title)}</b></summary><div class="md">${md(x.body)}</div><a class="muted small" href="hub-handbook.html">Open in the handbook →</a></details>`).join('')}</div>`;
    docs.hidden = false;
  }).catch(() => {});
})();
