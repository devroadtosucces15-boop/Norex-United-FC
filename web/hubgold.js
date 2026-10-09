// Hub redesign (flag `hubGold`, owner) – gold clubhouse: a welcome hero, "My Locker" (one batched GET /api/locker),
// room cards grouped by purpose with live previews, and a locker-door entrance (once a day, skippable).
// hub.js hands over the rooms it already filtered by flag/role; this only lays them out. Nothing here is the
// source of truth – every card links to the page that already owns the feature.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = document.body.dataset.base || '';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GROUPS = [['me', '🎽', 'Me'], ['matchday', '🗓️', 'Matchday'], ['tactics', '🧠', 'Tactics'], ['club', '🏟️', 'Club'], ['staff', '🛡️', 'Staff']];
  const dayKey = () => `hub_tunnel_${new Date().toISOString().slice(0, 10)}`; // same key hub.js uses for its back-button fade

  // ---------- entrance: locker doors slide apart (~1.3 s, once a day, tap/Enter/Esc skips, off under reduced motion) ----------
  function intro(onDone) {
    let seen = false;
    try { seen = !!localStorage.getItem(dayKey()); } catch {}
    if (reduced() || seen) return onDone();
    const el = document.createElement('div');
    el.className = 'hubg-intro';
    el.dataset.step = '0';
    el.innerHTML = `<div class="hubg-glow"></div><img class="hubg-crest" src="${BASE}assets/crest.png" alt=""><div class="hubg-door l"><i></i><i></i><i></i></div><div class="hubg-door r"><i></i><i></i><i></i></div><div class="hubg-word">NOREX<br>HUB</div><button type="button" class="hubg-skip">Skip ⏭</button>`;
    document.body.appendChild(el);
    let done = false;
    const timers = [];
    const finish = () => {
      if (done) return; done = true;
      timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey);
      try { localStorage.setItem(dayKey(), '1'); } catch {}
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
      onDone();
    };
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') finish(); };
    document.addEventListener('keydown', onKey);
    el.addEventListener('click', finish);
    requestAnimationFrame(() => { el.dataset.step = '1'; });          // doors close up, crest lit
    timers.push(setTimeout(() => { el.dataset.step = '2'; }, 380));   // doors slide apart
    timers.push(setTimeout(() => { el.dataset.step = '3'; }, 850));   // title
    timers.push(setTimeout(finish, 1300));
  }

  // ---------- My Locker ----------
  const when = (ts) => { try { return new Date(ts).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const left = (ts) => { const h = Math.round((ts - Date.now()) / 3600e3); return h < 1 ? 'soon' : h < 48 ? `in ${h}h` : `in ${Math.round(h / 24)}d`; };
  const RSVP = { yes: '✅ You’re in', no: '❌ You’re out', maybe: '🤔 Maybe' };

  // The locker is one of the cards (first in "Me", two columns wide): a steel door hinged on the left swings open
  // after the entrance to show what's waiting on me. Tap the closed door to open it early.
  function lockerHtml(ctx, d, me) {
    const claim = me?.claim?.status === 'approved' ? me.claim.player : '';
    const nx = d?.next;
    const rows = [];
    if (nx) rows.push(`<a class="hubg-row" href="${BASE}members.html#schedule"><span>🗓️</span><div><b>${esc(nx.title || (nx.type === 'match' ? 'Match night' : nx.type || 'Session'))}</b><small>${esc(when(nx.start))} · ${left(nx.start)} · ${nx.inCount} in</small></div><em class="${nx.mine ? 'ok' : 'todo'}">${nx.mine ? RSVP[nx.mine] || esc(nx.mine) : 'Answer →'}</em></a>`);
    if (d?.vote && !d.vote.voted) rows.push(`<a class="hubg-row" href="${BASE}members.html#awards"><span>🗳️</span><div><b>Player of the week vote</b><small>Closes ${esc(when(d.vote.closes))}</small></div><em class="todo">Vote →</em></a>`);
    if (d?.unread) rows.push(`<a class="hubg-row" href="${BASE}members.html#alerts"><span>🔔</span><div><b>${d.unread} unread alert${d.unread === 1 ? '' : 's'}</b><small>Notice board</small></div><em class="todo">Read →</em></a>`);
    if (d?.playbook) rows.push(`<a class="hubg-row" href="${BASE}tactics.html"><span>📘</span><div><b>${d.playbook} play${d.playbook === 1 ? '' : 's'} to learn</b><small>Assigned in your Playbook</small></div><em class="todo">Open →</em></a>`);
    const medals = d?.medals?.top?.length ? `<div class="hubg-medals" title="${d.medals.count} of ${d.medals.total} unlocked">${d.medals.top.map((m, i) => `<span class="tier-${esc(m.tier)}" style="--i:${i}" title="${esc(m.name)}">${esc(m.icon)}</span>`).join('')}<small>${d.medals.count}/${d.medals.total}</small></div>` : '';
    return `<div class="hubg-inside"><div class="hubg-hook"><div class="hubg-av"${claim ? ` data-card-player="${esc(claim)}"` : ''}>${ctx.avatar ? `<img src="${esc(ctx.avatar)}" alt="">` : '🎽'}</div><div><b class="osw">${esc(ctx.name || 'Member')}</b><small>${claim ? `⚽ ${esc(claim)}` : 'No player claimed yet'}</small></div>${medals}</div>
<div class="hubg-rows">${rows.map((r, i) => r.replace('class="hubg-row"', `class="hubg-row" style="--i:${i}"`)).join('') || '<p class="muted small">All caught up – nothing waiting on you. 🎉</p>'}</div>
<a class="hubg-open" href="${BASE}members.html#locker">Open my full locker →</a></div>
<button type="button" class="hubg-door-card" aria-expanded="false" aria-label="Open or close my locker"><span class="hubg-vents"><i></i><i></i><i></i><i></i></span><span class="hubg-plate">MY LOCKER</span><span class="hubg-knob"></span></button>`;
  }

  // one-line previews on the room cards
  function previews(root, d) {
    const set = (id, txt) => { const el = root.querySelector(`[data-room="${id}"] small`); if (el && txt) el.textContent = txt; };
    if (d?.next) set('matchnight', `${when(d.next.start)} · ${d.next.inCount} in`);
    if (d?.unread) set('notice', `${d.unread} unread`);
    if (d?.medals?.count) set('trophy', `${d.medals.count} of ${d.medals.total} medals`);
    if (d?.playbook) set('tactics', `${d.playbook} to learn`);
  }

  function render(root, rooms, ctx, tileHtml) {
    const first = (ctx.name || '').split(/\s+/)[0];
    const sections = GROUPS.map(([id, ic, label]) => {
      const rs = rooms.filter((r) => r.group === id && r.id !== 'locker');
      return rs.length ? `<section class="hubg-sec"><h3><span>${ic}</span>${label}</h3><div class="hubg-grid">${id === 'me' ? '<div class="hubg-lockercard" data-room="locker" data-hubg-mine><p class="muted">Opening your locker…</p></div>' : ''}${rs.map(tileHtml).join('')}</div></section>` : '';
    }).join('');
    root.innerHTML = `<div class="hubg-hero"><img class="hubg-coin" src="${BASE}assets/crest.png" alt=""><div><h2 class="osw">Welcome back${first ? `, ${esc(first)}` : ''}</h2><p class="muted">Everything members need, in one place.</p></div></div>
<div class="hubg-rooms">${sections}</div>`;
    const mine = $('[data-hubg-mine]', root);
    Promise.all([ctx.call('/api/locker').catch(() => null), ctx.call('/api/me').catch(() => null)]).then(([d, me]) => {
      mine.innerHTML = lockerHtml(ctx, d, me);
      previews(root, d);
      const door = $('.hubg-door-card', mine);
      door.addEventListener('click', () => { const o = mine.classList.toggle('open'); door.setAttribute('aria-expanded', String(o)); });
      setTimeout(() => { mine.classList.add('open'); door.setAttribute('aria-expanded', 'true'); }, reduced() ? 0 : 450); // swing open once the entrance is done
    });
  }

  window.NXHubGold = { render, intro };
})();
