// Watch list page (flag watchlist), Discoveries feed page and Hub widget (flag discoveries). Built against the real routes:
//   GET  /api/watchlist?topic=&limit=          → [{ id, title, channel, url, thumb, topic, tags, published, useful, mine }]
//   POST /api/watchlist/<id>/useful            → { id, useful, mine }   (a toggle)
//   GET  /api/discoveries                      → [{ id, title, body, link, image, by:{id,name}, approvedBy, at, useful, mine }]
//   POST /api/discoveries/useful  { id }       → { id, useful, mine }   (a toggle)
// "Useful" is optimistic: the count and button change at once, the server's answer replaces them, a failure rolls them back.
(() => {
  const d = document, B = window.NorexBot, U = B?.U;
  const wl = d.querySelector('[data-watchlist]'), dc = d.querySelector('[data-discoveries]'), hw = d.querySelector('[data-disc-widget]'), ms = d.querySelector('[data-mystreams]');
  if (!B || (!wl && !dc && !hw && !ms)) return;
  const { esc } = U;
  const empty = (icon, title, text, extra = '') => `<div class="panel sq-empty"><span>${icon}</span><div><b>${title}</b><p class="muted small">${text}</p>${extra}</div></div>`;
  const failBox = (what, e) => empty('📡', `Could not load ${what}`, esc(e?.message || 'The club server did not answer.'), '<button type="button" class="btn ghost" data-retry>↻ Try again</button>');
  const skel = (n, h) => Array.from({ length: n }, () => `<div class="panel"><span class="sk" style="height:${h}px;display:block"></span></div>`).join('');

  // the Useful toggle, shared by both pages and the widget
  const useBtn = (x) => `<button type="button" class="btn ghost nxv-use${x.mine ? ' on' : ''}" aria-pressed="${!!x.mine}" data-use="${esc(x.id)}"><span aria-hidden="true">👍</span> Useful <b class="num">${+x.useful || 0}</b></button>`;
  const paint = (btn, x) => { btn.classList.toggle('on', !!x.mine); btn.setAttribute('aria-pressed', !!x.mine); btn.querySelector('b').textContent = Math.max(0, +x.useful || 0); };
  const toggle = async (btn, x, path, body) => {
    if (btn.dataset.busy) return; btn.dataset.busy = '1';
    const was = !!x.mine; x.mine = !was; x.useful = Math.max(0, (+x.useful || 0) + (was ? -1 : 1)); paint(btn, x); window.NorexMotion?.pulse?.(btn);
    try { const r = await B.post(path, body); x.mine = !!r.mine; x.useful = +r.useful || 0; }
    catch (e) { x.mine = was; x.useful = Math.max(0, (+x.useful || 0) + (was ? 1 : -1)); B.toast(e?.message || 'Could not save that'); }
    delete btn.dataset.busy; paint(btn, x);
  };

  // ---------- Watch list ----------
  if (wl) {
    const TOPICS = [['all', '✨', 'All'], ['builds', '🛠️', 'Builds'], ['tactics', '🧠', 'Tactics'], ['tips', '💡', 'Tips'], ['meta', '📈', 'Meta'], ['news', '📰', 'News']];
    const grid = d.querySelector('#wl-grid'), chips = d.querySelector('#wl-topics'), cache = new Map(); let topic = new URLSearchParams(location.search).get('topic') || 'all', seq = 0;
    if (!TOPICS.some(([k]) => k === topic)) topic = 'all';
    chips.innerHTML = TOPICS.map(([k, e, l]) => `<button type="button" class="chip${k === topic ? ' on' : ''}" aria-pressed="${k === topic}" data-topic="${k}">${e} ${l}</button>`).join('');
    const card = (v) => { const th = U.safeUrl(v.thumb), url = U.safeUrl(v.url);
      return `<article class="panel nxv reveal in" data-vid="${esc(v.id)}"><a class="nxv-th" href="${esc(url)}" target="_blank" rel="noopener nofollow" tabindex="-1" aria-hidden="true">${th ? `<img src="${esc(th)}" alt="" loading="lazy" decoding="async" width="480" height="270">` : ''}<span class="nxv-play">▶</span></a>
<div class="nxv-b"><span class="nxv-tp">${esc(v.topic)}</span><h3 class="nxv-h"><a href="${esc(url)}" target="_blank" rel="noopener nofollow">${esc(v.title)}</a></h3>
<p class="muted small">${esc(v.channel || '')} · ${esc(U.ago(v.published))}</p>${(v.tags || []).length ? `<div class="chips nxv-tags">${v.tags.slice(0, 4).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
<div class="nxv-f">${useBtn(v)}<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener nofollow">Watch ↗</a></div></div></article>`; };
    const show = (list) => {
      const vids = list.filter((v) => U.safeUrl(v.url));
      grid.innerHTML = vids.length ? vids.map(card).join('') : empty('🎬', 'No videos here yet', topic === 'all' ? 'New videos from the creators we follow land here within the hour.' : 'Nothing sorted into this topic yet. Try another one.');
      grid.setAttribute('aria-busy', 'false'); window.NorexMotion?.stagger?.(grid);
    };
    const get = async () => {
      const my = ++seq; grid.setAttribute('aria-busy', 'true');
      if (cache.has(topic)) return show(cache.get(topic));
      grid.innerHTML = skel(6, 240);
      try { const list = await B.call(`/api/watchlist?${topic === 'all' ? '' : 'topic=' + topic + '&'}limit=48`); if (my !== seq) return; cache.set(topic, Array.isArray(list) ? list : []); show(cache.get(topic)); }
      catch (e) { if (my === seq) { grid.innerHTML = failBox('the watch list', e); grid.setAttribute('aria-busy', 'false'); } }
    };
    chips.addEventListener('click', (e) => { const b = e.target.closest('[data-topic]'); if (!b || b.dataset.topic === topic) return; topic = b.dataset.topic;
      chips.querySelectorAll('[data-topic]').forEach((c) => { c.classList.toggle('on', c === b); c.setAttribute('aria-pressed', c === b); });
      history.replaceState(null, '', topic === 'all' ? location.pathname : `?topic=${topic}`); get(); });
    grid.addEventListener('click', (e) => {
      if (e.target.closest('[data-retry]')) return get();
      const b = e.target.closest('[data-use]'); if (!b) return;
      const v = (cache.get(topic) || []).find((x) => x.id === b.dataset.use); if (!v) return;
      toggle(b, v, `/api/watchlist/${encodeURIComponent(v.id)}/useful`);
      // the same video can sit in another cached topic: keep them in step
      for (const [k, l] of cache) if (k !== topic) { const o = l.find((x) => x.id === v.id); if (o) cache.delete(k); }
    });
    B.flag('watchlist').then((on) => { wl.querySelector('[data-wl-on]').hidden = !on; wl.querySelector('[data-wl-off]').hidden = on; if (on) get(); });
  }

  // ---------- Discoveries ----------
  const day = (t) => { try { return new Date(t * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
  const para = (s) => String(s || '').split(/\n{2,}/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  const dCard = (x, compact) => { const link = U.safeUrl(x.link), img = U.safeUrl(x.image);
    return `<article class="panel nxd reveal in${compact ? ' sm' : ''}" data-did="${esc(x.id)}">
<header class="nxd-h"><img data-uid="${esc(x.by?.id || '')}" src="${esc(U.defaultAvatar(x.by?.id))}" alt="" width="36" height="36" loading="lazy" decoding="async"><span><b>${esc(x.by?.name || 'A teammate')}</b><small class="muted">shared ${esc(day(x.at))}</small></span><span class="nxd-ok" title="A manager approved this">✓ Checked</span></header>
<h3 class="nxd-t">${esc(x.title)}</h3>${compact ? '' : `<div class="nxd-body">${para(x.body)}</div>${img ? `<img class="nxd-img" src="${esc(img)}" alt="" loading="lazy" decoding="async">` : ''}`}
<footer class="nxd-f">${useBtn(x)}${link ? `<a class="btn ghost" href="${esc(link)}" target="_blank" rel="noopener nofollow">Open ${esc(U.host(link))} ↗</a>` : ''}</footer></article>`; };
  const mountDisc = (host, list, onRetry) => {
    host.addEventListener('click', (e) => {
      if (e.target.closest('[data-retry]')) return onRetry();
      const b = e.target.closest('[data-use]'); if (!b) return; const x = list().find((q) => String(q.id) === b.dataset.use); if (x) toggle(b, x, '/api/discoveries/useful', { id: x.id });
    });
  };

  if (dc) {
    const feed = d.querySelector('#dc-feed'); let items = [];
    const get = async () => { feed.setAttribute('aria-busy', 'true'); feed.innerHTML = skel(3, 160);
      try { const l = await B.call('/api/discoveries'); items = Array.isArray(l) ? l : [];
        feed.innerHTML = items.length ? items.map((x) => dCard(x)).join('') : empty('🔎', 'Nothing shared yet', 'Found a trick, a video or a patch detail? Post it in Discord with <b>/share</b>. Once a manager checks it, it shows up here.'); }
      catch (e) { feed.innerHTML = failBox('discoveries', e); } feed.setAttribute('aria-busy', 'false'); };
    mountDisc(feed, () => items, get);
    B.flag('discoveries').then((on) => { dc.querySelector('[data-dc-on]').hidden = !on; dc.querySelector('[data-dc-off]').hidden = on; if (on) get(); });
  }

  // ---------- Hub widget: the three newest ----------
  if (hw) {
    const row = hw.querySelector('[data-disc-row]'); let items = [];
    mountDisc(row, () => items, () => {});
    B.flag('discoveries').then(async (on) => { if (!on) return;
      try { const l = await B.call('/api/discoveries'); items = (Array.isArray(l) ? l : []).slice(0, 3); } catch { return; }
      if (!items.length) return;
      row.innerHTML = items.map((x) => dCard(x, true)).join(''); hw.hidden = false; });
  }
  // ---------- My Locker: "My streams" – my linked Twitch / YouTube / Kick and whether I am live (flag memberLive) ----------
  //   profile channels come from the My profile form (mylocker.js fires `nx:profile`), live state from GET /api/live/members
  if (ms) {
    const row = ms.querySelector('[data-ms-row]'), me = window.NorexAuth?.session?.u; let prof = null, live = [], timer = 0, on = false, checked = false;
    const draw = () => {
      if (!on || !prof) return;
      const have = ['twitch', 'youtube', 'kick'].map((p) => [p, prof[p], U.channelUrl(p, prof[p])]).filter(([, , u]) => u);
      ms.hidden = false;
      if (!have.length) { row.innerHTML = empty('📺', 'No channels linked yet', 'Add your Twitch, YouTube or Kick in My profile and the bot will tell the club when you go live.', '<a class="btn ghost" href="#lk-me" data-ms-add>Add my channels</a>'); return; }
      const mine = live.filter((x) => String(x.user) === String(me));
      row.innerHTML = have.map(([p, v, url]) => { const [label, cls, ico] = B.PL[p], l = mine.find((x) => x.platform === p), name = U[p](v).v;
        return `<article class="panel nxs${l ? ' live' : ''}"><div class="nxs-h"><span class="nxl-pl ${cls}">${ico}${label}</span>${l ? '<span class="nxs-on"><i class="nxl-dot" aria-hidden="true"></i>Live now</span>' : `<span class="nxs-off">${checked ? 'Offline' : 'Checking…'}</span>`}</div>
<a class="nxs-n" href="${esc(url)}" target="_blank" rel="noopener nofollow">${esc(name)} ↗</a>
<p class="small ${l ? '' : 'muted'}">${l ? `${esc(l.title || 'On air')} · <span data-since="${+l.since || ''}">${l.since ? 'Live ' + esc(U.onAir(l.since)) : 'just now'}</span>` : checked ? 'Not streaming right now. The club is told the moment you start.' : 'Checking whether you are on air…'}</p></article>`; }).join('');
    };
    const poll = async () => { if (!on || (d.hidden && checked)) return; try { const l = await B.call('/api/live/members'); live = (Array.isArray(l) ? l : []).filter((x) => x && U.safeUrl(x.url)); checked = true; } catch { checked = true; } draw(); };
    d.addEventListener('nx:profile', (e) => { prof = e.detail || {}; draw(); poll(); });
    B.flag('memberLive').then((f) => { on = f; if (!f) return; draw(); poll(); timer = setInterval(poll, 60e3); d.addEventListener('visibilitychange', poll); });
  }
})();
