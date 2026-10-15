// "Markdown-lite" for club docs, announcements and Play Style (roadmap P5.1 / P5.2). Pure – no DOM, so the tests
// load it in node. Everything is escaped first; only the patterns below turn back into HTML:
//   # / ## / ### heading   - or * bullet   1. numbered   > quote   --- line   **bold**  *italic*  `code`
//   [text](https://… or page.html)   bare https links   a line that is only an image URL → picture
//   a line that is only a YouTube / Twitch / Streamable link → embedded player
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const IMG = /^https:\/\/[^\s"'<>]+\.(png|jpe?g|gif|webp)(\?[^\s"'<>]*)?$/i;
  const SITE_LINK = /^[a-z0-9_\-./]+\.html(#[\w-]*)?$/i;

  // Video link → embed URL (null if it isn't one we trust). Twitch needs the page's host as `parent`.
  function video(url, host) {
    let u;
    try { u = new URL(url); } catch { return null; }
    if (u.protocol !== 'https:') return null;
    const h = u.hostname.replace(/^(www|m)\./, '');
    const id = (s) => (/^[\w-]{3,64}$/.test(s ?? '') ? s : null);
    const parts = u.pathname.split('/').filter(Boolean);
    let yt = null;
    if (h === 'youtu.be') yt = id(parts[0]);
    else if (h === 'youtube.com') yt = parts[0] === 'watch' ? id(u.searchParams.get('v')) : ['shorts', 'live', 'embed'].includes(parts[0]) ? id(parts[1]) : null;
    if (yt) return { src: `https://www.youtube-nocookie.com/embed/${yt}`, kind: 'YouTube' };
    const parent = encodeURIComponent(host || 'localhost');
    if (h === 'twitch.tv' && parts[0] === 'videos' && /^\d+$/.test(parts[1] ?? '')) return { src: `https://player.twitch.tv/?video=${parts[1]}&parent=${parent}&autoplay=false`, kind: 'Twitch' };
    const clip = h === 'clips.twitch.tv' ? id(parts[0]) : h === 'twitch.tv' && parts[1] === 'clip' ? id(parts[2]) : null;
    if (clip) return { src: `https://clips.twitch.tv/embed?clip=${clip}&parent=${parent}&autoplay=false`, kind: 'Twitch' };
    if (h === 'streamable.com' && id(parts[0]) && parts.length === 1) return { src: `https://streamable.com/e/${parts[0]}`, kind: 'Streamable' };
    return null;
  }

  // Inline formatting on one already-escaped line. Links are swapped for placeholders first so the
  // bold/italic/autolink passes never touch a URL.
  function inline(s) {
    const keep = [];
    const hold = (html) => `\u0000${keep.push(html) - 1}\u0000`;
    s = s.replace(/`([^`]+)`/g, (_, c) => hold(`<code>${c}</code>`));
    s = s.replace(/\[([^\]]{1,200})\]\(([^)\s]{1,500})\)/g, (m, text, href) => {
      const raw = href.replace(/&amp;/g, '&');
      if (/^https:\/\//i.test(raw)) return hold(`<a href="${href}" target="_blank" rel="noopener nofollow">${text}</a>`);
      if (SITE_LINK.test(raw) && !raw.includes('..')) return hold(`<a href="${href}">${text}</a>`);
      return m;
    });
    s = s.replace(/https:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/g, (u) => hold(`<a href="${u}" target="_blank" rel="noopener nofollow">${u.replace(/^https:\/\/(www\.)?/, '')}</a>`));
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^\w*])\*([^*\s][^*]*)\*(?!\w)/g, '$1<i>$2</i>').replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<i>$2</i>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
  }

  // opts: { host } – the page's hostname for Twitch embeds.
  function html(md, opts = {}) {
    const lines = String(md ?? '').replace(/\r/g, '').split('\n');
    const out = [];
    let para = [], list = null;
    const flush = () => {
      if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
      if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`);
      list = null;
    };
    let quote = [];
    const flushQuote = () => { if (quote.length) out.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`); quote = []; };
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const e = esc(line);
      let m;
      if (!line.startsWith('>')) flushQuote();
      if (!line) { flush(); continue; }
      if ((m = /^(#{1,3})\s+(.+)$/.exec(e))) { flush(); out.push(`<h${m[1].length + 2}>${inline(m[2])}</h${m[1].length + 2}>`); continue; }
      if (/^(-{3,}|\*{3,})$/.test(line)) { flush(); out.push('<hr>'); continue; }
      if (line.startsWith('>')) { flush(); quote.push(esc(line.replace(/^>\s?/, ''))); continue; }
      if ((m = /^[-*]\s+(.+)$/.exec(e)) || (m = /^\d{1,3}[.)]\s+(.+)$/.exec(e))) {
        const tag = /^\d/.test(line) ? 'ol' : 'ul';
        if (para.length || (list && list.tag !== tag)) flush();
        (list ??= { tag, items: [] }).items.push(m[1]);
        continue;
      }
      if (IMG.test(line)) { flush(); out.push(`<figure class="md-img"><a href="${e}" data-lightbox="docs"><img src="${e}" alt="" loading="lazy"></a></figure>`); continue; }
      const v = /^https:\/\/\S+$/.test(line) && video(line, opts.host);
      if (v) { flush(); out.push(`<div class="md-video"><iframe src="${esc(v.src)}" title="${v.kind} video" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`); continue; }
      if (list) flush();
      para.push(e);
    }
    flush(); flushQuote();
    return out.join('\n');
  }

  // First paragraph as plain text (cards, previews).
  // Plain text (the caller escapes it): headings, pictures and videos dropped, markers removed.
  const excerpt = (md, max = 160) => {
    const text = String(md ?? '').split('\n').map((l) => l.trim())
      .filter((l) => l && !IMG.test(l) && !/^(#|-{3,}|\*{3,})/.test(l) && !(/^https:\/\/\S+$/.test(l) && video(l)))
      .map((l) => l.replace(/^>\s?/, '').replace(/^[-*]\s+|^\d{1,3}[.)]\s+/, ''))
      .reduce((a, l) => (!a ? l : /[.!?:…]$/.test(a) ? `${a} ${l}` : `${a} · ${l}`), '')
      .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1').replace(/\*\*|`/g, '').replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, '$1$2');
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  };

  globalThis.NXMd = { html, excerpt, video, esc };
})();
