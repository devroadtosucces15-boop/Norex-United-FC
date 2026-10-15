// Video thumbnails everywhere a post shows video (home strip, feed, docs):
//  · YouTube / Twitch / Streamable embeds become a thumbnail with a play button – the heavy player only loads when tapped
//  · uploaded clips show their first frame, play muted for ~3 seconds when scrolled into view, then rest on that frame
(() => {
  const PREVIEW_MS = 3000;
  const ytThumb = (src) => { const m = /youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/.exec(src); return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null; };

  function facade(f) {
    f.dataset.lite = '1';
    const src = f.getAttribute('src'), kind = (f.title || 'video').replace(/ video$/i, ''), th = ytThumb(src);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `vlite${th ? '' : ' nothumb'} k-${kind.toLowerCase()}`;
    b.setAttribute('aria-label', `Play ${kind} video`);
    if (th) b.style.backgroundImage = `url("${th}")`;
    b.innerHTML = `<span class="vlite-play" aria-hidden="true">▶</span><small>${kind}</small>`;
    b.addEventListener('click', () => {
      const i = f.cloneNode();
      i.setAttribute('src', th ? `${src}${src.includes('?') ? '&' : '?'}autoplay=1` : src);
      i.dataset.lite = '1';
      b.replaceWith(i);
    });
    f.replaceWith(b);
  }

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (!e.isIntersecting || v.dataset.previewed) continue;
      v.dataset.previewed = '1';
      io.unobserve(v);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) continue;
      v.dataset.auto = '1';
      v.play().then(() => setTimeout(() => { if (v.dataset.auto) { v.pause(); delete v.dataset.auto; } }, PREVIEW_MS)).catch(() => { delete v.dataset.auto; });
    }
  }, { threshold: 0.6 }) : null;

  function clip(v) {
    v.dataset.prev = '1';
    v.muted = true; v.playsInline = true; v.preload = 'metadata';
    const src = v.getAttribute('src') || '';
    if (src && !src.includes('#t=')) v.setAttribute('src', `${src}#t=0.1`); // iOS paints a frame only when asked for one
    // a person pressing play after the preview gets sound
    v.addEventListener('play', () => { if (!v.dataset.auto) v.muted = false; });
    v.addEventListener('pointerdown', () => { delete v.dataset.auto; });
    io?.observe(v);
  }

  function upgrade() {
    document.querySelectorAll('.md-video iframe:not([data-lite])').forEach(facade);
    document.querySelectorAll('video.fd-vid:not([data-prev]), video.fdp-vid:not([data-prev])').forEach(clip);
  }
  upgrade();
  new MutationObserver(upgrade).observe(document.body, { childList: true, subtree: true });
})();
