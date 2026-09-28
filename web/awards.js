// Weekly awards on the client (roadmap P4.1).
//   NXAwards.tab(el, ctx)       Squad Hub → 🏆 Awards: this week's ballot, stat awards, last week's reveal, boards, manager tools
//   NXAwards.reveal(last)       the animated reveal: face-down cards flip one by one under a spotlight, confetti for each winner
//   NXAwards.cabinet(el, k)     trophy cabinet for a player (public player pages, member profiles)
// ctx = { call, toast, me: { u, n, a } }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BASE = document.body.dataset.base || '';
  const MAPI = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!$('link[href$="awards.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/awards.css` }));
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const wk = (key) => `Week ${Number(String(key).split('-W')[1])}`;
  const left = (ms) => { const h = Math.max(0, Math.round((ms - Date.now()) / 3600e3)); return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`; };
  const GRP = { GK: '🧤 Keepers', DEF: '🛡️ Defenders', MID: '🎯 Midfielders', FWD: '⚽ Forwards', any: '👥 Anyone' };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- confetti (CSS pieces, cleaned up after) ----------
  function confetti(host, n = 60) {
    if (reduced()) return;
    const box = document.createElement('div');
    box.className = 'aw-confetti';
    const colours = ['#c8352c', '#e8c16a', '#ffffff', '#22c55e', '#60a5fa'];
    box.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 0.8 + 0.9).toFixed(2)}s;--r:${Math.round(Math.random() * 720 - 360)}deg;--c:${colours[i % colours.length]};--delay:${(Math.random() * 0.25).toFixed(2)}s"></i>`).join('');
    host.appendChild(box);
    setTimeout(() => box.remove(), 2600);
  }

  // ---------- the reveal ----------
  async function reveal(last) {
    const byAward = new Map();
    for (const w of last.winners) (byAward.get(String(w.award)) ?? byAward.set(String(w.award), { ...w, names: [] }).get(String(w.award))).names.push(w.n);
    const cards = [...byAward.values()].filter((a) => a.k);
    if (!cards.length) return UI.modal({ title: `${wk(last.week)} awards`, icon: '🏆', body: UI.empty({ icon: '🏆', title: 'No winners that week', text: 'Nobody voted and nobody played – vote for this week in the ballot.' }) });
    ls.set(`norex_reveal_${last.week}`, '1');
    let i = 0, timer;
    const v = UI.modal({
      title: `${wk(last.week)} · the awards`, icon: '🏆', wide: true,
      body: `<div class="aw-stage"><div class="aw-spot" aria-hidden="true"></div><div class="aw-cards">${cards.map((c, n) => `<div class="aw-card" data-i="${n}" tabindex="0" aria-label="${esc(c.name)}"><div class="aw-flip"><div class="aw-back"><span>${esc(c.icon)}</span><b>${esc(c.name)}</b><small>Tap to reveal</small></div>
<div class="aw-front"><span class="aw-ic">${esc(c.icon)}</span><small>${esc(c.name)}</small><b>${c.names.map(esc).join(' &amp; ')}</b>${c.stat ? `<em>${esc(String(c.value))}</em>` : `<em>${c.value} vote${c.value === 1 ? '' : 's'}</em>`}</div></div></div>`).join('')}</div>
<p class="muted small aw-hint">${reduced() ? 'Tap each card to reveal it.' : 'Revealing… tap a card to skip ahead.'}</p></div>`,
      actions: [{ label: 'Close', value: null, kind: 'ghost' }],
      onOpen: (d) => {
        const stage = $('.aw-stage', d);
        const flip = (card) => {
          if (!card || card.classList.contains('open')) return;
          card.classList.add('open');
          $('.aw-spot', d).style.setProperty('--x', `${card.offsetLeft + card.offsetWidth / 2}px`);
          confetti(stage, 40);
        };
        const next = () => { flip($$('.aw-card', d)[i++]); if (i < cards.length) timer = setTimeout(next, 1100); else setTimeout(() => confetti(stage, 90), 400); };
        d.addEventListener('click', (e) => flip(e.target.closest('.aw-card')));
        d.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.aw-card')) flip(e.target); });
        if (!reduced()) timer = setTimeout(next, 600);
        d.addEventListener('close', () => clearTimeout(timer));
      },
    });
    return v;
  }

  // ---------- trophy cabinet ----------
  async function cabinet(el, k, call) {
    try {
      const t = call ? await call(`/api/awards/player?k=${encodeURIComponent(k)}`) : await (await fetch(`${MAPI}/api/awards/player?k=${encodeURIComponent(k)}`, { cache: 'no-store', headers: (() => { const s = ls.get('norex_session'); return s ? { Authorization: `Bearer ${s}` } : {}; })() })).json();
      if (!t.total) return;
      el.insertAdjacentHTML('beforeend', `<div class="aw-cabinet"><b>🏆 Trophy cabinet <em>${t.total}</em></b><div>${t.counts.map((c) => `<span class="aw-trophy" data-tip="${esc(c.name)}"><i>${esc(c.icon)}</i>${esc(c.name)}${c.n > 1 ? ` <em>×${c.n}</em>` : ''}</span>`).join('')}</div></div>`);
    } catch {}
  }

  // ---------- Squad Hub tab ----------
  function tab(el, ctx) {
    let S = null, B = null, view = 'ballot';
    const load = async () => { S = await ctx.call('/api/awards'); paint(); maybeReveal(); };
    const maybeReveal = () => { if (S.last?.winners?.some((w) => w.k) && !ls.get(`norex_reveal_${S.last.week}`)) reveal(S.last); };
    const nomsFor = (c) => S.nominees.filter((p) => c.grp === 'any' || p.grp === c.grp || (c.grp === 'FWD' && p.grp === 'any'));
    function ballot() {
      return `<div class="aw-cats">${S.categories.map((c) => {
        const mine = S.my[c.id], list = nomsFor(c), pick = S.nominees.find((p) => p.k === mine);
        return `<section class="card aw-cat${mine ? ' voted' : ''}" data-cat="${c.id}"><header><span class="aw-ic">${esc(c.icon)}</span><div><h3>${esc(c.name)}</h3><small class="muted">${esc(GRP[c.grp] || GRP.any)}</small></div>${!c.builtin && S.canManage ? `<button type="button" class="linkish" data-retire="${c.id}">retire</button>` : ''}</header>
${pick ? `<p class="aw-mine">✅ Your vote: <b>${esc(pick.n)}</b> <button type="button" class="linkish" data-clear="${c.id}">change / clear</button></p>` : ''}
<div class="aw-noms${pick ? ' dim' : ''}">${list.length ? list.slice(0, 40).map((p) => `<button type="button" class="aw-nom${mine === p.k ? ' on' : ''}" data-vote="${esc(p.k)}" aria-pressed="${mine === p.k}">${esc(p.n)}<small>${esc(p.pos)}${p.played ? ' · ⚽ played' : ''}</small></button>`).join('') : '<p class="muted small">No squad players in this group yet.</p>'}</div></section>`;
      }).join('')}</div>
<section class="aw-stats"><h3>📊 Decided by the stats</h3><div>${S.stats.map((s) => `<span class="aw-stat"><i>${esc(s.icon)}</i><b>${esc(s.name)}</b><small>${esc(s.how)}</small></span>`).join('')}</div><p class="muted small">Weekly winners roll up into 👑 Player of the Month. Weeks close Sunday 24:00 UTC.</p></section>`;
    }
    function boards() {
      if (!B) return UI.skeleton('rows', 4);
      const who = (w) => `<a href="${BASE}players/${encodeURIComponent(w.k)}.html">${esc(w.n)}</a>`;
      return `${B.potm.length ? `<section class="card aw-potm"><h3>👑 Player of the Month</h3><ul>${B.potm.map((w) => `<li><small>${esc(String(w.period).slice(1))}</small> ${who(w)}</li>`).join('')}</ul></section>` : ''}
<div class="aw-boards">${B.awards.map((a) => `<section class="card"><h3>${esc(a.icon)} ${esc(a.name)}</h3><ol>${a.top.map((t) => `<li>${who(t)} <em>${t.wins}×</em></li>`).join('')}</ol></section>`).join('') || UI.empty({ icon: '🏆', title: 'No winners yet', text: 'The first week closes Sunday night.' })}</div>
${B.weeks.length ? `<h3 class="aw-h">🗓️ Recent weeks</h3><div class="aw-weeks">${B.weeks.map((w) => `<details class="card"><summary><b>${wk(w.week)}</b> <small class="muted">${w.winners.filter((x) => x.k).length} winners</small></summary><ul>${w.winners.filter((x) => x.k).map((x) => `<li>${esc(x.icon)} ${esc(x.name)} – ${who(x)}</li>`).join('')}</ul></details>`).join('')}</div>` : ''}`;
    }
    function tools() {
      if (!S.canManage) return '';
      return `<details class="card aw-tools"><summary>🛡️ Manager tools</summary>
<form class="aw-add" data-add><label>New fun award<input name="name" maxlength="40" placeholder="Most Non-Sleeper" required></label><label>Icon<input name="icon" maxlength="4" placeholder="😴"></label>
<label>Nominees<select name="grp">${Object.entries(GRP).map(([k, l]) => `<option value="${k}"${k === 'any' ? ' selected' : ''}>${l}</option>`).join('')}</select></label><button class="btn sm" type="submit">➕ Add</button></form>
<div class="row"><label class="aw-ch">Discord channel for the results <select data-channel><option value="">Don’t post</option></select></label><span class="grow"></span><button type="button" class="btn sm ghost" data-close>🔒 Close this week now</button></div></details>`;
    }
    function paint() {
      const voted = Object.keys(S.my).length;
      el.innerHTML = `<div class="aw-head"><div><h3>🏆 ${wk(S.week)} awards</h3><p class="muted small">${S.closed ? '🔒 Voting closed for this week – results are out.' : `Voting closes Sunday 24:00 UTC · in ${left(S.closes)} · ${S.voters} member${S.voters === 1 ? '' : 's'} voted · you: ${voted}/${S.categories.length}`}</p></div><span class="grow"></span>
${S.last?.winners?.some((w) => w.k) ? `<button type="button" class="btn sm" data-reveal>🎬 ${wk(S.last.week)} reveal</button>` : ''}</div>
<div class="chipset aw-views">${[['ballot', '🗳️ Ballot'], ['boards', '📜 Winners & boards']].map(([k, l]) => `<button type="button" class="chip${view === k ? ' on' : ''}" data-view="${k}">${l}</button>`).join('')}</div>
${view === 'ballot' ? ballot() : boards()}${tools()}`;
      const sel = $('[data-channel]', el);
      if (sel) ctx.call('/api/events/discord').then((t) => { if (t.ready) sel.innerHTML = `<option value="">Don’t post</option>${t.channels.map((c) => `<option value="${esc(c.id)}"${c.id === S.channel ? ' selected' : ''}>${c.news ? '📢' : '#'} ${esc(c.name)}</option>`).join('')}`; }).catch(() => {});
    }
    async function act(path, body, msg) {
      try { S = await ctx.call(path, body); paint(); if (msg) ctx.toast(msg); } catch (e) { ctx.toast(e.message, true); }
    }
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b)) return;
      const d = b.dataset, cat = b.closest('[data-cat]')?.dataset.cat;
      if (d.view) { view = d.view; paint(); if (view === 'boards' && !B) { try { B = await ctx.call('/api/awards/board'); } catch (er) { B = { weeks: [], awards: [], potm: [] }; ctx.toast(er.message, true); } paint(); } }
      if (d.reveal !== undefined) reveal(S.last);
      if (d.vote && cat) {
        const prev = S.my[cat];
        S.my[cat] = d.vote; paint(); // optimistic
        try { S = await ctx.call('/api/awards/vote', { category: +cat, player: d.vote }); paint(); ctx.toast('Vote saved – change it any time before Sunday night'); } catch (er) { if (prev) S.my[cat] = prev; else delete S.my[cat]; paint(); ctx.toast(er.message, true); }
      }
      if (d.clear) act('/api/awards/vote', { category: +d.clear, player: null }, 'Vote taken back');
      if (d.retire && await UI.confirm({ title: 'Retire this award?', text: 'It disappears from the ballot. Past winners keep their trophy.', ok: 'Retire', danger: true })) act('/api/awards/category/remove', { id: +d.retire }, 'Award retired');
      if (d.close !== undefined && await UI.confirm({ title: 'Close this week now?', text: 'Votes are counted, winners told and the reveal goes live. Nobody can vote again until Monday.', ok: 'Close & reveal', danger: true })) act('/api/awards/close', {}, 'Week closed – winners are out');
    });
    el.addEventListener('submit', (e) => {
      if (!e.target.matches('[data-add]')) return;
      e.preventDefault();
      const f = e.target.elements;
      act('/api/awards/category', { name: f.namedItem('name').value, icon: f.namedItem('icon').value, grp: f.namedItem('grp').value }, 'Award added to this week’s ballot');
    });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-channel]')) act('/api/awards/settings', { channel: e.target.value }, e.target.value ? 'Results will be posted there' : 'No Discord post'); });
    el.innerHTML = UI.skeleton('cards', 3);
    load().catch((er) => { el.innerHTML = UI.empty({ icon: '📡', title: 'Could not load the awards', text: er.message }); });
  }

  window.NXAwards = { tab, reveal, cabinet };
})();
