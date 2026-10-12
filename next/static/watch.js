// Watch + embeds. (1) Live bar on every page and the live player on Watch: the Worker's /api/live (flag liveBanner) says if NOREX is on Twitch/YouTube.
// (2) Video links in posts and docs become a poster with a ▶ button; they only load when tapped, play for about 10 s, then blur behind a "keep watching" prompt.
(() => {
  const d = document, API = window.NOREX_API, A = () => window.NorexAuth;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const CLIP_MS = 10000;
  // play about 10 s, then blur behind a prompt; one tap and it keeps playing for good
  function clip(frame, ms = CLIP_MS) {
    if (!frame || frame._clip) return; frame._clip = setTimeout(() => {
      if (!frame.isConnected || frame.querySelector('.wt-resume')) return;
      const b = Object.assign(d.createElement('button'), { type: 'button', className: 'wt-resume', innerHTML: '<span aria-hidden="true">▶</span> Tap to keep watching<small>Paused to save your data</small>' });
      b.addEventListener('click', () => { frame.classList.remove('wt-blur'); b.remove(); });
      frame.classList.add('wt-blur'); frame.append(b);
    }, ms);
  }
  const playSrc = (src) => src.replace('autoplay=false', 'autoplay=true') + (/autoplay=/.test(src) ? '' : (src.includes('?') ? '&' : '?') + 'autoplay=1');
  const ytId = (src) => src.match(/embed\/([\w-]{11})/)?.[1] || '';
  // ---------- posters for video links ----------
  function poster(box) {
    if (box.dataset.wt) return; box.dataset.wt = 1;
    const fr = box.querySelector('iframe'); if (!fr) return;
    const src = fr.getAttribute('src') || '', kind = fr.getAttribute('title') || 'Video', yt = ytId(src);
    box.classList.add('wt-box'); fr.remove();
    box.insertAdjacentHTML('beforeend', `<button type="button" class="wt-play" aria-label="Play ${esc(kind)}">${yt ? `<img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy">` : ''}<span class="wt-k">${/twitch/i.test(kind) ? '🟣 Twitch' : '🔴 YouTube'}</span><span class="wt-go" aria-hidden="true">▶</span><small>Tap to play a short preview</small></button>`);
    box.querySelector('.wt-play').addEventListener('click', () => {
      box.querySelector('.wt-play').remove();
      box.insertAdjacentHTML('afterbegin', `<iframe src="${esc(playSrc(src))}" title="${esc(kind)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`);
      clip(box);
    });
  }
  const scan = (root) => root.querySelectorAll?.('.md-video:not([data-wt])').forEach(poster);
  scan(d); new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && (n.matches?.('.md-video') ? poster(n) : scan(n))))).observe(d.body, { childList: true, subtree: true });
  // ---------- live bar + live player ----------
  if (!API) return;
  let shown = '', bar = null;
  const stage = () => d.querySelector('[data-watch-live]');
  const draw = (v) => {
    const on = v?.live && (v.platform === 'twitch' ? /^\w{3,25}$/.test(v.channel || '') : /^[\w-]{11}$/.test(v.videoId || ''));
    d.body.classList.toggle('is-live', !!on);
    const st = stage(), key = on ? `${v.platform}:${v.channel || v.videoId}` : '';
    if (!on) { bar?.remove(); bar = null; shown = ''; if (st) { st.innerHTML = '<div class="panel wt-off"><b>📺 Not live right now</b><p class="muted small">When NOREX goes live on Twitch or YouTube the player appears here by itself, and a red bar shows on every page.</p></div>'; } return; }
    const where = v.platform === 'twitch' ? 'Twitch' : 'YouTube';
    if (!bar) { bar = d.createElement('div'); bar.className = 'wt-bar'; bar.setAttribute('role', 'status'); d.querySelector('.bar')?.after(bar); }
    bar.innerHTML = `<div class="wrap"><span class="wt-dot" aria-hidden="true"></span><b>LIVE</b><span class="wt-t">NOREX is live on ${where}${v.title ? ` – ${esc(v.title)}` : ''}</span><a class="btn sm" href="watch.html">▶ Watch</a></div>`;
    if (st && key !== shown) {
      shown = key;
      const src = v.platform === 'twitch' ? `https://player.twitch.tv/?channel=${encodeURIComponent(v.channel)}&parent=${encodeURIComponent(location.hostname)}&muted=true` : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.videoId)}?autoplay=1&mute=1`;
      st.innerHTML = `<div class="wt-box wt-live"><iframe src="${esc(src)}" title="NOREX live on ${where}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div><p class="small" style="margin-top:8px"><a href="${esc(v.url)}" target="_blank" rel="noopener">Open on ${where} ↗</a></p>`;
      clip(st.querySelector('.wt-box'));
    }
  };
  const poll = () => fetch(`${API}/api/live`, { cache: 'no-store', headers: A()?.token ? { Authorization: 'Bearer ' + A().token } : {} }).then((r) => (r.ok ? r.json() : null)).then(draw).catch(() => {});
  poll(); setInterval(() => d.visibilityState === 'visible' && poll(), 120000);
  window.NorexWatch = { clip, poll };
})();
