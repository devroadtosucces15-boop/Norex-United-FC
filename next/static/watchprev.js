// Watch previews: muted, looping, few-second clips of the latest YouTube shorts/videos and Twitch clips/recordings (like the hover preview on the
// platforms). A tile only loads its player while it is scrolled into view (max 3 at once), the clip loops inside a short window so it never ends on a
// black frame, and a tap opens the full player in a window. Ids come from data/media.json (scripts/media.mjs), already inlined in the page.
(() => {
  const d = document, tiles = [...d.querySelectorAll('.wtp')]; if (!tiles.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
  const HOST = location.hostname || 'localhost', MAX = 3, LEN = 8;
  const hms = (s) => `${Math.floor(s / 3600)}h${Math.floor(s % 3600 / 60)}m${Math.floor(s % 60)}s`;
  const win = (t) => { const secs = +t.dataset.secs || 0, short = t.dataset.kind === 'short'; const start = short ? 0 : t.dataset.kind === 'vod' ? Math.max(0, Math.floor(secs * .3)) : t.dataset.kind === 'clip' ? 0 : 15; return { start, end: start + (t.dataset.kind === 'clip' && secs && secs < 15 ? secs : LEN) }; };
  const src = (t, full) => {
    const id = encodeURIComponent(t.dataset.id), { start, end } = win(t);
    if (t.dataset.p === 'yt') return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&origin=${encodeURIComponent(location.origin)}` + (full ? '' : `&mute=1&controls=0&disablekb=1&fs=0&enablejsapi=1&start=${start}&end=${end}&loop=1&playlist=${id}`);
    if (t.dataset.kind === 'clip') return `https://clips.twitch.tv/embed?clip=${id}&parent=${HOST}&autoplay=true&muted=${full ? 'false' : 'true'}`;
    return `https://player.twitch.tv/?video=v${id}&parent=${HOST}&autoplay=true&muted=${full ? 'false' : 'true'}&time=${full ? '0s' : hms(start)}`;
  };
  const live = new Set();
  function start(t) {
    if (reduce || t._f || t.dataset.bad) return;
    if (live.size >= MAX) stop(live.values().next().value);
    const f = d.createElement('iframe'); f.title = ''; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.loading = 'lazy'; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.referrerPolicy = 'strict-origin-when-cross-origin'; f.src = src(t, false);
    f.addEventListener('load', () => { f.classList.add('in'); if (t.dataset.p === 'yt') try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch {} });
    t.prepend(f); t._f = f; t.classList.add('playing'); live.add(t);
    // Twitch embeds have no loop switch: restart the player before the clip can end on a still frame
    if (t.dataset.p === 'tw') t._tm = setInterval(() => { if (t._f) t._f.src = src(t, false); }, (t.dataset.kind === 'clip' ? Math.min(+t.dataset.secs || 12, 12) + 1 : LEN + 4) * 1000);
  }
  function stop(t) { if (!t?._f) return; clearInterval(t._tm); t._f.remove(); t._f = null; t.classList.remove('playing'); live.delete(t); }
  // YouTube: seek back to the start of the window at its end (the loop params alone can restart from 0:00)
  addEventListener('message', (e) => {
    if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
    let m; try { m = JSON.parse(e.data); } catch { return; }
    const t = [...live].find((x) => x._f?.contentWindow === e.source); if (!t) return;
    if (m.event === 'onError') { t.dataset.bad = 1; stop(t); return; }
    const info = m.info || {}, { start: s, end } = win(t);
    if (m.event === 'infoDelivery' && (info.playerState === 0 || (typeof info.currentTime === 'number' && info.currentTime >= end - .3))) {
      e.source.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [s, true] }), '*'); e.source.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    }
  });
  const io = new IntersectionObserver((es) => es.forEach((en) => (en.isIntersecting && en.intersectionRatio >= .55 ? start(en.target) : stop(en.target))), { threshold: [0, .55, .9] });
  tiles.forEach((t) => io.observe(t));
  d.addEventListener('visibilitychange', () => { if (d.hidden) [...live].forEach(stop); });
  // tap → full player window
  let modal = null, back = null;
  function close() { if (!modal) return; modal.remove(); modal = null; d.body.classList.remove('wtp-lock'); d.removeEventListener('keydown', onKey); back?.focus(); tiles.forEach((t) => { io.unobserve(t); io.observe(t); }); }
  const onKey = (e) => e.key === 'Escape' && close();
  d.addEventListener('click', (e) => {
    const t = e.target.closest('.wtp'); if (!t) return; e.preventDefault(); back = t; [...live].forEach(stop);
    const open = t.dataset.p === 'yt' ? `https://www.youtube.com/watch?v=${t.dataset.id}` : t.dataset.kind === 'clip' ? `https://www.twitch.tv/norexunitedfc/clip/${t.dataset.id}` : `https://www.twitch.tv/videos/${t.dataset.id}`;
    modal = d.createElement('div'); modal.className = 'wtp-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', t.dataset.title || 'Video');
    modal.innerHTML = `<div class="wtp-m"><button type="button" class="wtp-x" aria-label="Close">✕</button><div class="wtp-v ${t.dataset.kind === 'short' ? 'v' : ''}"><iframe src="${src(t, true)}" title="${(t.dataset.title || 'Video').replace(/"/g, '&quot;')}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p><b></b> <a href="${open}" target="_blank" rel="noopener">Open on ${t.dataset.p === 'yt' ? 'YouTube' : 'Twitch'} ↗</a></p></div>`;
    modal.querySelector('b').textContent = t.dataset.title || '';
    modal.addEventListener('click', (ev) => { if (ev.target === modal || ev.target.closest('.wtp-x')) close(); });
    d.body.append(modal); d.body.classList.add('wtp-lock'); d.addEventListener('keydown', onKey); modal.querySelector('.wtp-x').focus();
  });
})();
