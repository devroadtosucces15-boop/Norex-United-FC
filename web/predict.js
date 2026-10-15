// Predictions game on the client (roadmap P3.8) – Squad Hub → 🔮 Predict.
//   Open nights: pick our score for the first match of the night (changeable until kick-off). Locked nights: everyone's picks.
//   Results: the real score, my points and an animated reveal (score flips, points count up, confetti for an exact score).
//   Boards: this month, the season, all-time.
// ctx = { call, toast, me: { u, n, a } }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BASE = document.body.dataset.base || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!$('link[href$="predict.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/predict.css` }));
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICON = { league: '🏆', playoffs: '🥇', friendly: '🤝', rush: '⚡' };
  const when = (ms) => new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const until = (ms) => { const m = Math.max(0, Math.round((ms - Date.now()) / 60e3)); return m < 90 ? `${m} min` : m < 2880 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} days`; };
  let autoShown = false;
  const PTS = { 3: ['🎯', 'Exact'], 2: ['✅', 'Result + GD'], 1: ['👍', 'Result'], 0: ['❌', 'Miss'] };

  function confetti(host, n = 70) {
    if (reduced()) return;
    const box = document.createElement('div');
    box.className = 'pr-confetti';
    const colours = ['#c8352c', '#e8c16a', '#ffffff', '#22c55e', '#60a5fa'];
    box.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 0.8 + 0.9).toFixed(2)}s;--r:${Math.round(Math.random() * 720 - 360)}deg;--c:${colours[i % colours.length]}"></i>`).join('');
    host.appendChild(box);
    setTimeout(() => box.remove(), 2400);
  }
  // The reveal: my pick on the left, the real score flips in on the right, then the points count up.
  function reveal(r) {
    ls.set(`norex_pred_${r.id}`, '1');
    const mine = r.mine, pts = mine?.points ?? 0;
    return UI.modal({
      title: `${r.title} · the result`, icon: '🔮',
      body: `<div class="pr-stage"><div class="pr-duel"><div class="pr-card mine"><small>Your pick</small><b>${mine ? `${mine.gf}–${mine.ga}` : '–'}</b></div><span class="pr-vs">vs</span>
<div class="pr-card real"><div class="pr-flip"><div class="pr-back">?</div><div class="pr-front"><small>Result${r.result.opp ? ` vs ${esc(r.result.opp)}` : ''}</small><b>${r.result.gf}–${r.result.ga}</b></div></div></div></div>
<p class="pr-points" aria-live="polite"><span data-count>0</span> <small>point${pts === 1 ? '' : 's'}</small></p><p class="pr-verdict">${mine ? `${PTS[pts][0]} ${PTS[pts][1]}` : 'You didn’t predict this one'}</p></div>`,
      onOpen: (d) => {
        const stage = $('.pr-stage', d), card = $('.pr-card.real', d), count = $('[data-count]', d);
        const go = () => {
          card.classList.add('open');
          setTimeout(() => {
            let n = 0;
            const tick = () => { count.textContent = n; if (n++ < pts) setTimeout(tick, 260); else { d.querySelector('.pr-points').classList.add('done'); if (pts === 3) confetti(stage, 90); else if (pts) confetti(stage, 30); } };
            tick();
          }, reduced() ? 0 : 700);
        };
        setTimeout(go, reduced() ? 0 : 500);
      },
    });
  }

  function tab(el, ctx) {
    let S = null, board = 'month';
    const draft = new Map();
    const scoreBox = (e) => {
      const d = draft.get(e.id) ?? (e.mine ? { gf: e.mine.gf, ga: e.mine.ga } : { gf: 1, ga: 0 });
      draft.set(e.id, d);
      const step = (side) => `<div class="pr-step"><button type="button" data-step="${e.id}:${side}:-1" aria-label="${side === 'gf' ? 'NOREX' : 'Opponent'} minus one">−</button><output>${d[side]}</output><button type="button" data-step="${e.id}:${side}:1" aria-label="${side === 'gf' ? 'NOREX' : 'Opponent'} plus one">+</button></div>`;
      const same = e.mine && e.mine.gf === d.gf && e.mine.ga === d.ga;
      return `<div class="pr-box" data-box="${e.id}"><div class="pr-score"><div><small>NOREX</small>${step('gf')}</div><span class="pr-dash">–</span><div><small>Them</small>${step('ga')}</div></div>
<div class="row"><button type="button" class="btn sm" data-save="${e.id}"${same ? ' disabled' : ''}>${e.mine ? (same ? '✓ Saved' : '💾 Change my pick') : '🔮 Lock in my pick'}</button>${e.mine ? `<button type="button" class="btn sm ghost" data-clear="${e.id}">Take it back</button>` : ''}</div></div>`;
    };
    const picks = (list, { pts = false } = {}) => `<ul class="pr-picks">${list.map((p) => `<li class="${p.id === ctx.me.u ? 'me' : ''}">${UI.member({ id: p.id, n: p.n, a: p.a }, { size: 22 })}<b>${p.gf}–${p.ga}</b>${pts && p.points != null ? `<em class="p${p.points}">+${p.points}</em>` : ''}</li>`).join('')}</ul>`;
    const boardHtml = () => {
      const rows = S.boards[board] ?? [];
      return rows.length ? `<ol class="pr-board">${rows.map((r, i) => `<li class="${r.id === ctx.me.u ? 'me' : ''}"><span class="pr-rank">${i + 1}</span>${UI.member({ id: r.id, n: r.n, a: r.a }, { size: 24 })}<small class="muted">${r.exact} exact · ${r.played} played</small><b>${r.pts}</b></li>`).join('')}</ol>`
        : UI.empty({ icon: '🔮', title: 'No points yet', text: 'Points land here once a predicted night has been played.' });
    };
    const paint = () => {
      el.innerHTML = `<div class="pr-head"><div><h3>🔮 Predictions</h3><p class="muted small">Predict our score for the <b>first match</b> of each match night – changeable until kick-off. ${S.rules.map(([n, l]) => `<span class="nx-pill">${n} pt${n > 1 ? 's' : ''} · ${esc(l)}</span>`).join(' ')}</p></div></div>
<section class="pr-sec"><h3>Open</h3>${S.open.length ? `<div class="pr-cards">${S.open.map((e) => `<article class="card pr-ev"><header><span class="pr-ic">${ICON[e.type] ?? '📅'}</span><div><b>${esc(e.title)}</b><small>${esc(when(e.start))} · locks in ${until(e.start)}</small></div></header>${scoreBox(e)}<small class="muted">${e.count} member${e.count === 1 ? '' : 's'} predicted${e.mine ? ' · you’re in' : ''}</small></article>`).join('')}</div>`
        : UI.empty({ icon: '📅', title: 'No match nights to predict', text: 'League, playoff, friendly and Rush nights from the schedule show up here up to 3 weeks ahead.' })}</section>
${S.locked.length ? `<section class="pr-sec"><h3>🔒 Kicked off</h3><div class="pr-cards">${S.locked.map((e) => `<article class="card pr-ev"><header><span class="pr-ic">${ICON[e.type] ?? '📅'}</span><div><b>${esc(e.title)}</b><small>${esc(when(e.start))} · waiting for the result</small></div></header>${picks(e.picks)}</article>`).join('')}</div></section>` : ''}
<section class="pr-sec"><h3>Results</h3>${S.recent.length ? `<div class="pr-cards">${S.recent.map((e) => `<article class="card pr-ev pr-res"><header><span class="pr-ic">${ICON[e.type] ?? '📅'}</span><div><b>${esc(e.title)}</b><small>${esc(when(e.start))}</small></div>
${e.result.status === 'void' ? '<span class="nx-pill">Void – no match found</span>' : `<span class="pr-final">${e.result.gf}–${e.result.ga}</span>`}</header>
${e.result.status === 'scored' ? `${e.result.opp ? `<small class="muted">vs ${esc(e.result.opp)}</small>` : ''}${e.mine ? `<p class="pr-mine">Your pick <b>${e.mine.gf}–${e.mine.ga}</b> <em class="p${e.mine.points}">${PTS[e.mine.points][0]} +${e.mine.points}</em></p>` : ''}
<button type="button" class="btn sm ghost" data-reveal="${e.id}">🎬 ${ls.get(`norex_pred_${e.id}`) ? 'Watch the reveal again' : 'Reveal'}</button><details><summary class="small">Everyone’s picks (${e.picks.length})</summary>${picks(e.picks, { pts: true })}</details>` : ''}</article>`).join('')}</div>`
        : UI.empty({ icon: '🏁', title: 'No results yet', text: 'Once a predicted night is played, the score and your points appear here.' })}</section>
<section class="pr-sec card"><h3>🏅 Prediction table</h3>${UI.tabsHtml([['month', 'This month'], ['season', `Season ${esc(S.boards.seasonLabel)}`], ['all', 'All-time']], board, 'pr-boards')}<div class="pr-board-box">${boardHtml()}</div></section>`;
      UI.tabs($('.pr-boards', el), (k) => { board = k; $('.pr-board-box', el).innerHTML = boardHtml(); });
    };
    const load = async () => {
      try {
        S = await ctx.call('/api/predict');
        paint();
        const fresh = S.recent.find((e) => e.result.status === 'scored' && e.mine && !ls.get(`norex_pred_${e.id}`));
        // The Hub can draw a tab twice while it loads – only one reveal pops up by itself per page.
        if (fresh && Date.now() - fresh.result.at < 7 * 864e5 && !autoShown && !document.querySelector('dialog[open]')) { autoShown = true; reveal(fresh); }
      } catch (e) { el.innerHTML = UI.empty({ icon: '📡', title: 'Predictions are unavailable', text: e.message }); }
    };
    el.innerHTML = UI.skeleton('rows', 4);
    el.onclick = async (e) => {
      const st = e.target.closest('[data-step]');
      if (st) {
        const [id, side, by] = st.dataset.step.split(':');
        const d = draft.get(Number(id));
        d[side] = Math.max(0, Math.min(20, d[side] + Number(by)));
        st.closest('.pr-box').outerHTML = scoreBox(S.open.find((x) => x.id === Number(id)));
        $(`[data-step="${id}:${side}:${by}"]`, el)?.focus();
        return;
      }
      const sv = e.target.closest('[data-save]'), cl = e.target.closest('[data-clear]');
      if (sv || cl) {
        const id = Number((sv ?? cl).dataset.save ?? (sv ?? cl).dataset.clear), d = draft.get(id);
        try {
          S = await ctx.call('/api/predict', cl ? { event: id, gf: null } : { event: id, gf: d.gf, ga: d.ga });
          if (cl) draft.delete(id);
          ctx.toast(cl ? 'Prediction taken back' : `Locked in: ${d.gf}–${d.ga}`);
          paint();
        } catch (er) { ctx.toast(er.message, true); }
        return;
      }
      const rv = e.target.closest('[data-reveal]');
      if (rv) reveal(S.recent.find((x) => x.id === Number(rv.dataset.reveal)));
    };
    load();
  }

  window.NXPredict = { tab, reveal };
})();
