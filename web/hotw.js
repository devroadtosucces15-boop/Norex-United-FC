// Highlight of the week (roadmap P6.2) – home page strip. window.NXHotw.home(el) shows the latest winning clip
// (GET /api/hotw/public, behind the `hotw` flag) with the player embedded. Voting lives in the feed (web/feed.js).
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '';
  const MAPI = document.body.dataset.api || '';
  const css = (f) => { if (!$(`link[href$="${f}"]`)) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/${f}` })); };
  const script = (f, g) => new Promise((ok, no) => (window[g] ? ok() : document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/${f}`, onload: ok, onerror: no }))));

  // Clip link → embedded player (web/docs-md.js knows YouTube / Twitch / Streamable); anything else → a link card.
  function player(url) {
    if (!url) return '';
    const v = window.NXMd?.video(url, location.hostname);
    if (v) return `<div class="md-video hotw-video"><iframe src="${esc(v.src)}" title="${v.kind} video" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    return `<a class="hotw-link" href="${esc(url)}" target="_blank" rel="noopener nofollow">▶ Watch the clip <small>${esc(url.replace(/^https:\/\/(www\.)?/, '').slice(0, 48))}</small></a>`;
  }
  const words = (text, url) => String(text ?? '').replace(url ?? '\u0000', '').replace(/https:\/\/\S+/g, '').replace(/[*_`#>]/g, '').trim();

  async function home(el) {
    try {
      const s = (() => { try { return localStorage.getItem('norex_session'); } catch { return null; } })();
      const r = await fetch(`${MAPI}/api/hotw/public`, { cache: 'no-store', headers: s ? { Authorization: `Bearer ${s}` } : {} });
      if (!r.ok) return;
      const w = (await r.json()).last;
      if (!w) return;
      css('docs.css'); css('social.css');
      await script('docs-md.js', 'NXMd').catch(() => {});
      const said = words(w.text, w.video);
      el.innerHTML = `<section class="hotw-home card">
<div class="hotw-ribbon"><span aria-hidden="true">🎬</span><b>Highlight of the week</b><small>Week ${w.weekNo} · voted by the squad</small></div>
<div class="hotw-body${w.video ? "" : " solo"}">${player(w.video)}
<div class="hotw-side">${UI.member({ id: w.by.id, n: w.by.n, a: w.by.a, sub: '🏆 Winner' }, { size: 44, card: false })}
${said ? `<blockquote>${esc(said.slice(0, 220))}</blockquote>` : ''}
<p class="hotw-votes"><b>${w.votes}</b> vote${w.votes === 1 ? '' : 's'} · ${w.entries} clip${w.entries === 1 ? '' : 's'} in the running</p></div></div></section>`;
      el.hidden = false;
    } catch {}
  }

  window.NXHotw = { home };
})();
