// Public feed strip (roadmap P6.1c) – home page. window.NXFeedPublic.home(el) shows the latest posts a member
// marked public (GET /api/feed/public, behind the `feed` flag). Read-only: log in to react, comment or see more.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const MAPI = document.body.dataset.api || '';
  const BASE = document.body.dataset.base || '';
  const TAGS = { chat: '💬', highlight: '🎬', league: '🏟️', rush: '⚡' };
  const css = (f) => { if (!$(`link[href$="${f}"]`)) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/${f}` })); };

  async function home(el) {
    try {
      const s = (() => { try { return localStorage.getItem('norex_session'); } catch { return null; } })();
      const r = await fetch(`${MAPI}/api/feed/public`, { cache: 'no-store', headers: s ? { Authorization: `Bearer ${s}` } : {} });
      if (!r.ok) return;
      const posts = (await r.json()).posts;
      if (!posts?.length) return;
      css('social.css');
      const item = (p) => {
        const m = p.media[0];
        const pic = m && m.kind === 'image' ? `<img class="fdp-thumb" src="${esc(MAPI)}/media/${esc(m.key)}" alt="" loading="lazy">` : m ? '<div class="fdp-thumb fdp-vid" aria-hidden="true">🎬</div>' : '';
        return `<li class="fdp-item">${pic}<div class="fdp-body"><span class="fdp-tag">${TAGS[p.tag] ?? '💬'} ${esc(p.by.n)}</span><p>${esc(p.text) || '(photo/clip)'}</p></div></li>`;
      };
      el.innerHTML = `<section class="feed-home card">
<div class="feed-home-ribbon"><span aria-hidden="true">📰</span><b>From the club feed</b><small>Log in to see everything and join in</small></div>
<ul class="fdp-list">${posts.map(item).join('')}</ul></section>`;
      el.hidden = false;
    } catch {}
  }

  window.NXFeedPublic = { home };
})();
