// Community star ratings on the client (roadmap P4.2).
//   NXRatings.tab(el, ctx)     Squad Hub → 🌟 Ratings: this week's list (rate teammates 1–5★, optional), the squad star board
//   NXRatings.badge(s)         rating line for hover cards / profiles from /api/member → stars ({ rolling, allTime, raters, trend })
//   NXRatings.spark(values)    small trend line (SVG) – gaps where a week had too few ratings
// ctx = { call, toast, me: { u, n, a } }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const BASE = document.body.dataset.base || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!$('link[href$="ratings.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/ratings.css` }));
  const wk = (key) => `Week ${Number(String(key).split('-W')[1])}`;
  const left = (ms) => { const h = Math.max(0, Math.round((ms - Date.now()) / 3600e3)); return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`; };
  const pHref = (k) => `${BASE}players/${encodeURIComponent(k)}.html`;

  // ★★★★☆ with a partly filled last star (value 0–5)
  const starsShow = (v) => `<span class="rt-show" role="img" aria-label="${v} out of 5 stars" style="--v:${(Math.max(0, Math.min(5, v)) / 5) * 100}%"><i>★★★★★</i><b>★★★★★</b></span>`;
  function spark(values, { w = 92, h = 24 } = {}) {
    const pts = values.map((v, i) => [v, i]).filter(([v]) => v != null);
    if (pts.length < 2) return '';
    const x = (i) => (i / Math.max(1, values.length - 1)) * (w - 4) + 2, y = (v) => h - 2 - ((v - 1) / 4) * (h - 4);
    let d = '', prev = -2;
    for (const [v, i] of pts) { d += `${i === prev + 1 ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; prev = i; }
    const [lv, li] = pts[pts.length - 1];
    const up = lv >= pts[0][0];
    return `<svg class="rt-spark ${up ? 'up' : 'down'}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Weekly star trend, ${up ? 'rising' : 'falling'}"><path d="${d.trim()}"/><circle cx="${x(li).toFixed(1)}" cy="${y(lv).toFixed(1)}" r="2.4"/></svg>`;
  }
  function badge(s, { big = false } = {}) {
    if (!s) return '';
    if (s.rolling == null && s.allTime == null) return `<span class="rt-badge none" data-tip="A rating shows once ${s.min ?? 3} teammates rated">☆ Not enough ratings yet</span>`;
    const main = s.rolling ?? s.allTime;
    return `<span class="rt-badge${big ? ' big' : ''}">${starsShow(main)}<b>${main.toFixed(1)}</b><small>${s.rolling != null ? `last 8 weeks · ${s.raters} rater${s.raters === 1 ? '' : 's'}` : 'all-time'}${s.rolling != null && s.allTime != null ? ` · all-time ${s.allTime.toFixed(1)}` : ''}</small>${spark(s.trend ?? [])}</span>`;
  }

  function tab(el, ctx) {
    let S = null, q = '', busy = false;
    const paint = () => {
      const list = S.players.filter((p) => !q || p.n.toLowerCase().includes(q));
      const rated = Object.keys(S.my).length;
      const row = (p) => {
        const mine = S.my[p.k] ?? 0, self = p.k === S.self;
        return `<li class="rt-row${mine ? ' on' : ''}"><div class="rt-who"><a href="${pHref(p.k)}">${esc(p.n)}</a><small>${esc(p.pos || '')}${p.played ? ' · <span class="rt-played">played this week</span>' : ''}</small></div>
${self ? '<span class="muted small">That’s you</span>' : `<span class="rt-pick" role="radiogroup" aria-label="Stars for ${esc(p.n)}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${mine === n}" aria-label="${n} star${n > 1 ? 's' : ''}" class="${n <= mine ? 'on' : ''}" data-k="${esc(p.k)}" data-s="${n}">★</button>`).join('')}${mine ? `<button type="button" class="rt-x" data-k="${esc(p.k)}" data-s="0" aria-label="Take my rating back">✕</button>` : ''}</span>`}</li>`;
      };
      el.innerHTML = `<div class="rt-head"><div><h3>🌟 Star ratings · ${wk(S.week)}</h3><p class="muted small">Rate the teammates you played with – as many or as few as you like, 1–5★. Changeable until Sunday night (closes in ${left(S.closes)}).
<b>Nobody sees who gave which stars</b>${S.canSeeRaters ? ' except managers' : ' (only managers can)'}, and a rating only shows once ${S.min} teammates rated.</p></div><span class="nx-pill">⭐ ${rated} rated this week</span></div>
<div class="rt-grid"><section class="card"><h3>This week</h3><input type="search" class="rt-q" placeholder="Find a player…" value="${esc(q)}" aria-label="Find a player"><ul class="rt-list">${list.map(row).join('') || '<li class="muted">No players match.</li>'}</ul></section>
<section class="card"><h3>🏅 Squad star board <small class="muted">last 8 weeks</small></h3>${S.board.length ? `<ol class="rt-board">${S.board.map((b, i) => `<li><span class="rt-rank">${i + 1}</span><div class="rt-who"><a href="${pHref(b.k)}">${esc(b.n)}</a><small>${b.raters} raters</small></div>${starsShow(b.rolling)}<b>${b.rolling.toFixed(2)}</b>${spark(b.trend)}${S.canSeeRaters ? `<button type="button" class="sq-mini" data-raters="${esc(b.k)}" data-n="${esc(b.n)}" data-tip="Who rated (managers)">👁</button>` : ''}</li>`).join('')}</ol>` : UI.empty({ icon: '🌟', title: 'No ratings on the board yet', text: `A player joins the board once ${S.min} teammates rated them.` })}</section></div>`;
    };
    const load = async () => { try { S = await ctx.call('/api/ratings'); paint(); } catch (e) { el.innerHTML = UI.empty({ icon: '📡', title: 'Star ratings are unavailable', text: e.message }); } };
    el.innerHTML = UI.skeleton('rows', 5);
    el.oninput = (e) => { if (e.target.matches('.rt-q')) { q = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; paint(); const i = $('.rt-q', el); i.focus(); i.setSelectionRange(pos, pos); } };
    el.onclick = async (e) => {
      const b = e.target.closest('[data-s]');
      if (b && !busy) {
        busy = true;
        try { S = await ctx.call('/api/ratings/rate', { player: b.dataset.k, stars: Number(b.dataset.s) }); paint(); } catch (er) { ctx.toast(er.message, true); }
        busy = false;
        return;
      }
      const r = e.target.closest('[data-raters]');
      if (r) {
        try {
          const d = await ctx.call(`/api/ratings/player?k=${encodeURIComponent(r.dataset.raters)}`);
          UI.modal({ title: `Who rated ${r.dataset.n}`, icon: '👁', body: `<p class="muted small">Managers only – members never see this.</p>${badge(d, { big: true })}<ul class="rt-raters">${(d.raterList ?? []).map((x) => `<li>${UI.member({ id: x.id, n: x.n ?? 'Member' }, { size: 22 })}<span>${'★'.repeat(x.stars)}</span><small class="muted">${esc(wk(x.week))}</small></li>`).join('') || '<li class="muted">Nobody yet.</li>'}</ul>` });
        } catch (er) { ctx.toast(er.message, true); }
      }
    };
    load();
  }

  window.NXRatings = { tab, badge, spark, starsShow };
})();
