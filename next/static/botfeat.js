// Bot features on the site (PLANNING/BOT-SITE.md #1–#7). Every piece sits behind its own owner flag, read from the signed-in
// member's feature list (GET /api/me → NorexAuth.features), so nothing shows or even fetches until the flag is opened:
//   memberLive  → "Live now" strip on Home and the Hub (GET /api/live/members + the club's own GET /api/live)
//   watchlist   → "Related videos" blocks (GET /api/watchlist?related=) and the Watch list page (botpages.js)
//   facesSite   → faces everywhere: GET /api/faces?ids= swaps any avatar for a Card Studio card, else the Discord picture
// Elements can opt in with data-flag="name" (hidden until the flag is on) or data-flag-off="name" (shown while it is off).
(() => {
  const d = document, w = window;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------- pure helpers (also used by tests/next.test.mjs) ----------
  const U = {
    esc,
    // the same fallback picture the Worker uses (bot/faces.js defaultAvatar)
    defaultAvatar: (id) => { let n = 0; try { n = /^\d+$/.test(String(id)) ? Number((BigInt(id) >> 22n) % 6n) : 0; } catch {} return `https://cdn.discordapp.com/embed/avatars/${n}.png`; },
    safeUrl: (u) => { try { const x = new URL(String(u)); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } },
    // picture URLs: https, or http on localhost for the local mock (its /media/ links carry the mock's own address)
    imgUrl: (u) => { try { const x = new URL(String(u)); return x.protocol === 'https:' || (x.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(x.hostname)) ? x.href : ''; } catch { return ''; } },
    host: (u) => { try { return new URL(String(u)).hostname.replace(/^www\./, ''); } catch { return ''; } },
    // "42 min", "1 h 05" – how long a stream has been on (since = unix seconds)
    onAir: (since, now = Date.now()) => { const m = Math.max(0, Math.floor((now / 1000 - since) / 60)); return m < 1 ? 'just started' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; },
    ago: (ts, now = Date.now()) => { const s = Math.max(0, now / 1000 - ts), m = s / 60, h = m / 60, dd = h / 24;
      return m < 2 ? 'just now' : h < 1 ? `${Math.floor(m)} min ago` : dd < 1 ? `${Math.floor(h)} h ago` : dd < 14 ? `${Math.floor(dd)} d ago` : dd < 60 ? `${Math.floor(dd / 7)} wk ago` : `${Math.floor(dd / 30)} mo ago`; },
    // Field rules mirror bot/profiles.js (twitch, kick, youtube, birthday) so a mistake is caught before the request. → { v } or { err }
    twitch: (s) => { const v = String(s ?? '').trim().replace(/^https?:\/\/(www\.|m\.)?twitch\.tv\//i, '').replace(/[/?#].*$/, '').replace(/^@/, ''); return !v ? { v: '' } : /^[A-Za-z0-9_]{3,25}$/.test(v) ? { v } : { err: 'Twitch: enter your channel name or twitch.tv link.' }; },
    kick: (s) => { const v = String(s ?? '').trim().replace(/^https?:\/\/(www\.)?kick\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, ''); return !v ? { v: '' } : /^[A-Za-z0-9_]{3,25}$/.test(v) ? { v } : { err: 'Kick: enter your channel name or kick.com link.' }; },
    youtube: (s) => { let v = String(s ?? '').trim(); if (!v) return { v: '' };
      if (/^https?:\/\//i.test(v)) { let u; try { u = new URL(v); } catch { return { err: 'YouTube: enter your @handle or channel link.' }; }
        if (!/^(www\.|m\.)?youtube\.com$/i.test(u.hostname)) return { err: 'YouTube: the link must be on youtube.com.' };
        try { v = decodeURIComponent(u.pathname); } catch { v = u.pathname; } v = v.replace(/^\/|\/$/g, '').split('/').slice(0, 2).join('/');
      } else if (!v.startsWith('@')) v = '@' + v;
      return /^@[\w.-]{3,30}$/.test(v) || /^channel\/UC[\w-]{22}$/.test(v) ? { v } : { err: 'YouTube: enter your @handle or channel link.' }; },
    // MM-DD, no year; "7/14" and "07-14" both fine
    birthday: (s) => { const x = String(s ?? '').trim(); if (!x) return { v: '' }; const m = x.match(/^(\d{1,2})[-/](\d{1,2})$/);
      if (!m) return { err: 'Birthday: month and day, like 07-14.' };
      const mo = +m[1], dd = +m[2], max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
      return !max || dd < 1 || dd > max ? { err: 'Birthday: that date doesn’t exist.' } : { v: `${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}` }; },
    // "07-14" → "14 Jul" (never a year or an age)
    fmtBirthday: (v) => { const m = String(v ?? '').match(/^(\d{2})-(\d{2})$/); return m && +m[1] >= 1 && +m[1] <= 12 ? `${+m[2]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[1] - 1]}` : ''; },
    // a saved channel → its public page (values are re-checked with the same rules as the profile form); '' when it is not valid
    channelUrl: (platform, raw) => { const f = U[platform]; const c = f ? f(raw) : { err: 1 }; if (c.err || !c.v) return ''; return platform === 'twitch' ? `https://www.twitch.tv/${c.v}` : platform === 'kick' ? `https://kick.com/${c.v}` : `https://www.youtube.com/${c.v}`; },
  };
  w.NorexBotUtil = U;

  const API = w.NOREX_API, A = () => w.NorexAuth;
  if (!API || !A()) return;
  const M = () => w.NorexMotion;
  const toast = (m, kind = 'err') => M()?.toast?.(m, { kind });
  const call = (path, opt) => A().call(path, opt);
  const post = (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  const ready = () => A().ready || Promise.resolve();
  // flag('watchlist') → Promise<boolean>; guests and unopened flags are simply false
  const flag = (name) => ready().then(() => !!A().token && (A().features || []).includes(name));

  // ---------- faces everywhere: Card Studio card → Discord picture → default (one batched request per page, cached) ----------
  const FC = new Map(), tried = new Set(); let inflight = Promise.resolve();
  const load = (ids) => {
    const want = [...new Set(ids.map(String))].filter((x) => /^\d{1,25}$/.test(x) && !FC.has(x) && !tried.has(x));
    want.forEach((x) => tried.add(x));
    for (let i = 0; i < want.length; i += 100) {
      const part = want.slice(i, i + 100);
      inflight = inflight.then(() => call(`/api/faces?ids=${part.join(',')}`).then((r) => { for (const [k, v] of Object.entries(r || {})) if (typeof v === 'string' && U.imgUrl(v)) FC.set(k, v); }).catch(() => {}));
    }
    return inflight.then(() => FC);
  };
  const uidOf = (img) => img.dataset.uid || (/cdn\.discordapp\.com\/avatars\/(\d{1,25})\//.exec(img.getAttribute('src') || '') || [])[1] || '';
  const swap = (img, url) => {
    if (!url || img.dataset.face || img.src === url) return;
    img.dataset.face0 = img.getAttribute('src') || ''; img.dataset.face = /\/media\//.test(url) ? 'card' : 'pic';
    img.addEventListener('error', () => { const o = img.dataset.face0; img.dataset.face = 'failed'; if (o) img.src = o; }, { once: true }); // a card that will not load: back to the first picture, and do not try again
    img.src = url;
  };
  let facesOn = null, facesState = null;
  const scan = (root = d) => {
    facesOn ??= flag('facesSite');
    return facesOn.then((on) => {
      facesState = on;
      if (!on) return;
      const imgs = [...root.querySelectorAll('img[data-uid], img[src*="cdn.discordapp.com/avatars/"]')].filter((i) => !i.dataset.face && uidOf(i));
      if (!imgs.length) return;
      return load(imgs.map(uidOf)).then((m) => imgs.forEach((i) => swap(i, m.get(uidOf(i)))));
    });
  };
  let tick = 0;
  new MutationObserver(() => { if (facesState === false) return; clearTimeout(tick); tick = setTimeout(() => scan(), 120); }).observe(d.body, { childList: true, subtree: true });

  // ---------- flag-gated elements ----------
  const gates = () => ready().then(() => {
    const on = (A().features || []).includes.bind(A().features || []);
    d.querySelectorAll('[data-flag]').forEach((el) => { el.hidden = !(A().token && on(el.dataset.flag)); });
    d.querySelectorAll('[data-flag-off]').forEach((el) => { el.hidden = !!(A().token && on(el.dataset.flagOff)); });
  });

  // ---------- 🔴 Live now strip (Home + Hub) ----------
  const PL = { // platform → [label, class, icon]
    twitch: ['Twitch', 'tw', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>'],
    youtube: ['YouTube', 'yt', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z"/></svg>'],
    kick: ['Kick', 'ki', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 2h5v6h2.5L14 4.5V2h6v6l-4 4 4 4v6h-6v-2.5L10.5 16H8v6H3z"/></svg>'],
  };
  const liveItem = (x) => {
    const [pl, cls, ico] = PL[x.platform] || ['Live', 'tw', ''], url = x.club ? 'watch.html' : U.safeUrl(x.url);
    if (!url) return '';
    const face = x.club ? '<img src="crest-sm.png" alt="" width="48" height="48">' : `<img data-uid="${esc(x.user)}" src="${esc(U.defaultAvatar(x.user))}" alt="" width="48" height="48" decoding="async">`;
    return `<a class="nxl-i panel" role="listitem" href="${esc(url)}"${x.club ? '' : ' target="_blank" rel="noopener nofollow"'} aria-label="${esc(`${x.name} is live on ${pl}${x.title ? ': ' + x.title : ''}. Opens the stream`)}">
<span class="nxl-av">${face}<i class="nxl-dot" aria-hidden="true"></i></span>
<span class="nxl-t"><b>${esc(x.name)}</b><span class="nxl-ttl">${esc(x.title || (x.club ? 'The club stream' : 'On air now'))}</span>
<span class="nxl-m"><span class="nxl-pl ${cls}">${ico}${pl}</span><span class="nxl-s" data-since="${x.since || ''}">${x.since ? 'Live ' + esc(U.onAir(x.since)) : 'Live now'}</span></span></span></a>`;
  };
  // One poll feeds everything that shows who is on air: the strips (Home, Hub) and the "N live" chip in the header. Both stay off until memberLive is open.
  //   NorexBot.live = { items, n } and every change fires `nx:live` on the document.
  const strips = [...d.querySelectorAll('[data-live-strip]')];
  let items = [], timer = 0;
  const publish = () => { w.NorexBot.live = { items, n: items.length }; d.dispatchEvent(new CustomEvent('nx:live', { detail: w.NorexBot.live })); };
  const draw = () => {
    strips.forEach((s) => {
      s.hidden = !items.length; if (!items.length) return;
      const row = s.querySelector('[data-live-row]'), n = s.querySelector('[data-live-n]');
      if (n) n.textContent = `${items.length} streaming`;
      row.innerHTML = items.map(liveItem).join('');
      load(items.filter((x) => !x.club).map((x) => x.user)).then((m) => row.querySelectorAll('img[data-uid]').forEach((i) => swap(i, m.get(i.dataset.uid)))); // always the best face here
    });
    publish();
  };
  const poll = async () => {
    if (d.hidden) return;
    const [mem, club] = await Promise.all([call('/api/live/members').catch(() => []), call('/api/live').catch(() => null)]);
    items = [];
    if (club?.live) items.push({ club: true, name: 'NOREX UNITED', platform: club.platform, title: club.title || '', since: club.since || 0 });
    for (const x of Array.isArray(mem) ? mem : []) if (x && x.user && U.safeUrl(x.url)) items.push(x);
    draw();
  };
  const go = () => { poll(); clearInterval(timer); timer = setInterval(poll, 60e3); };
  flag('memberLive').then((on) => { if (!on) return; go(); d.addEventListener('visibilitychange', () => { if (!d.hidden) go(); }); setInterval(() => d.querySelectorAll('[data-since]').forEach((el) => { if (el.dataset.since) el.textContent = 'Live ' + U.onAir(+el.dataset.since); }), 30e3); });

  // ---------- 🎬 Related videos (builds, tactics …): <section data-related="builds" data-related-limit="3"> ----------
  const thumbOf = (v) => U.safeUrl(v.thumb);
  const relCard = (v) => `<a class="nxv-r panel" href="${esc(U.safeUrl(v.url))}" target="_blank" rel="noopener nofollow"><span class="nxv-th">${thumbOf(v) ? `<img src="${esc(thumbOf(v))}" alt="" loading="lazy" decoding="async" width="320" height="180">` : ''}<span class="nxv-play" aria-hidden="true">▶</span></span><span class="nxv-b"><b>${esc(v.title)}</b><small class="muted">${esc(v.channel || '')} · ${esc(U.ago(v.published))}</small></span></a>`;
  // <section data-related="builds" data-related-pos> follows the position on screen: builds.js fires `nx:position` and the block
  // re-fetches /api/watchlist?related=<POS> (cached per key, newest answer wins, the old row stays until the new one is in).
  const RC = new Map(); let curPos = String(w.NorexPos || '');
  const fetchRel = (key, lim) => { const k = key + '|' + lim; if (!RC.has(k)) RC.set(k, call(`/api/watchlist?related=${encodeURIComponent(key)}&limit=${lim}`).then((l) => (Array.isArray(l) ? l : []).filter((v) => U.safeUrl(v.url))).catch(() => { RC.delete(k); return []; })); return RC.get(k); };
  const paintRel = (sec, vids, pos) => {
    if (!vids.length) { sec.hidden = true; sec.innerHTML = ''; return; }
    sec.innerHTML = `<header><div><span class="ribbon">Related videos</span>${pos ? `<span class="chip on nxv-pos" aria-label="Position ${esc(pos)}">${esc(pos)}</span>` : ''}</div><a class="btn ghost" href="hub-watchlist.html">Open the Watch list</a></header><div class="nxv-rel">${vids.map(relCard).join('')}</div>`;
    sec.hidden = false;
  };
  const relSections = [...d.querySelectorAll('[data-related]')];
  const loadRel = async (sec, pos) => {
    const lim = Math.min(6, Math.max(1, +sec.dataset.relatedLimit || 3)), seq = (sec._seq = (sec._seq || 0) + 1);
    let vids = pos ? await fetchRel(pos, lim) : [], used = pos;
    if (!vids.length) { vids = await fetchRel(sec.dataset.related, lim); used = ''; } // nothing for this position: the page's topic instead
    if (seq === sec._seq) paintRel(sec, vids, used);
  };
  relSections.forEach((sec) => flag('watchlist').then((on) => { if (!on) return; sec._on = true; loadRel(sec, 'relatedPos' in sec.dataset ? curPos : ''); }));
  d.addEventListener('nx:position', (e) => { curPos = String(e.detail?.pos || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); relSections.forEach((sec) => { if (sec._on && 'relatedPos' in sec.dataset) loadRel(sec, curPos); }); });

  w.NorexBot = { live: { items: [], n: 0 }, U, flag, call, post, toast, faces: { load, scan }, gates, PL };
  gates(); scan();
})();
