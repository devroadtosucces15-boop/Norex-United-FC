// Locker Room (redesign board 07) – the Squad Hub's home tab: my card on a locker hook (tilt, tap to flip to my
// last 10 ratings, save as an image), tonight first (countdown, who's in, one-tap answer), MOTM vote by picking a
// card from a fanned hand, me vs the squad (radar + bars with the squad average as a line), medals + latest alerts.
// Reads one batched GET /api/locker (+ /api/vote for the hand of cards). app.js mounts it into #locker-panel and
// calls NXLocker.refresh() when the live socket pings. Flag `locker`.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SIL = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="33" r="19"/><path d="M10 100c2-25 19-37 40-37s38 12 40 37z"/></svg>';
  const tierOf = (ovr) => (ovr >= 88 ? 'icon' : ovr >= 80 ? 'gold' : ovr >= 70 ? 'silver' : ovr > 0 ? 'bronze' : 'plain');
  const TIER_COL = { 'tier-icon': ['#c8352c', '#1a0606', '#ffffff'], 'tier-gold': ['#f3d98b', '#a8802b', '#2a1d05'], 'tier-silver': ['#e3e8ee', '#8d97a5', '#141a22'], 'tier-bronze': ['#d69a6a', '#7a4524', '#1f0f05'], 'tier-plain': ['#2d3440', '#151a22', '#ffffff'] };
  const POS = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' };
  const RADAR = ['Scoring', 'Creating', 'Passing', 'Defending', 'Rating', 'Winning'];
  const rCls = (r) => (r >= 8 ? 'hi' : r >= 7 ? 'ok' : r >= 6 ? 'mid' : 'lo');
  const safeLink = (l) => (l && /^[\w\-./#?=&%]+$/.test(l) && !l.startsWith('//') ? l : '');

  let el = null, ctx = null, data = null, votes = null, voteAt = 0, tick = null, busy = false, flipped = false, wflip = {};

  const myPlayer = () => {
    const c = ctx.claim();
    return c?.status === 'approved' ? ctx.players().find((p) => p.k === c.player) || null : null;
  };
  const squad = () => ctx.players().filter((p) => p.home && p.s?.gp >= 3);

  // ---------- ① my card on a locker hook ----------
  function hook(pl) {
    const t = pl ? `tier-${tierOf(pl.ovr)}` : 'tier-plain';
    const s = pl?.s || {};
    const last = (pl?.tr || []).slice(-10);
    const avg = last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
    const front = pl ? `<span class="lk-top"><b class="lk-ovr">${pl.ovr || '–'}</b><span class="lk-pos">${esc(pl.pos || '—')}</span><img src="${ctx.base}assets/crest.png" alt="" height="34"></span>
<span class="lk-face">${SIL}</span><span class="lk-name">${esc(pl.n)}</span>
<span class="lk-stats"><span><b>${s.g ?? '–'}</b>GLS</span><span><b>${s.a ?? '–'}</b>AST</span><span><b>${s.r ? Number(s.r).toFixed(1) : '–'}</b>RAT</span></span>`
      : `<span class="lk-top"><b class="lk-ovr">?</b><span class="lk-pos">—</span></span><span class="lk-face">${SIL}</span><span class="lk-name">Your card</span><span class="lk-hint">Claim your player to hang it here</span>`;
    const back = `<span class="lk-back-h">Last ${last.length || 10} ratings</span>${last.length ? `<span class="lk-bars">${last.map((r) => `<i class="${rCls(r)}" style="--h:${Math.max(8, Math.min(100, (r - 4) * 16.6))}%" title="${r}"><em>${Number(r).toFixed(1)}</em></i>`).join('')}</span>
<span class="lk-back-avg">Average <b>${avg.toFixed(1)}</b></span>` : '<span class="lk-hint">No league ratings yet</span>'}<span class="lk-hint">Tap to flip back</span>`;
    return `<div class="lk-wall"><span class="lk-vents" aria-hidden="true"></span><span class="lk-peg" aria-hidden="true"></span>
<div class="lk-swing${reduced() ? '' : ' swing'}"><button class="lk-card ${t}${flipped ? ' flipped' : ''}" type="button" data-lk="flip" aria-pressed="${flipped}" aria-label="${pl ? `Your card, ${esc(pl.n)}. Tap to flip to your last 10 ratings` : 'Your card'}">
<span class="lk-flip"><span class="lk-side lk-front">${front}</span><span class="lk-side lk-back">${back}</span></span><span class="fut-shine"></span></button></div>
<span class="lk-bench" aria-hidden="true"></span></div>
<div class="lk-card-acts">${pl ? `<button class="btn ghost sm" type="button" data-lk="save">⬇ Save as image</button><a class="btn ghost sm" href="${ctx.base}players/${encodeURIComponent(pl.k)}.html">Full profile</a>`
      : `<button class="btn sm" type="button" data-lk="claim">🪪 Claim my player</button>`}</div>`;
  }

  // ---------- ② tonight first ----------
  function countdown(start) {
    const ms = start - Date.now();
    if (ms <= 0) return '<div class="lk-live">🔴 It’s on – kick-off time</div>';
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    return [[d, 'Day' + (d === 1 ? '' : 's')], [h, 'Hrs'], [m, 'Min']].map(([v, l]) => `<span class="lk-tile"><b>${String(v).padStart(l.startsWith('Day') ? 1 : 2, '0')}</b><small>${l}</small></span>`).join('');
  }
  function next() {
    const n = data.next;
    if (!n) return `<div class="lk-sec-h"><h3>🏆 Next match night</h3></div>${UI.empty({ icon: '🗓️', title: 'Nothing scheduled yet', text: 'When a manager sets the next match night, it shows up here with a countdown.' })}`;
    const when = new Date(n.start).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const title = n.title || (n.type === 'league' ? 'League match' : 'Match night');
    const extra = n.inCount - n.in.length;
    return `<div class="lk-sec-h"><h3>🏆 Next match night · ${esc(title)}</h3></div>
<p class="muted lk-when">${esc(when)} · your time</p>
<div class="lk-next-row"><div class="lk-count" data-start="${n.start}" aria-label="Countdown">${countdown(n.start)}</div>
<div class="lk-who"><small class="muted">Who’s in · ${n.inCount}</small><div class="lk-stack">${n.in.slice(0, 8).map((p) => `<span class="lk-av" title="${esc(p.n)}">${p.a ? `<img src="${esc(p.a)}" alt="">` : esc((p.n || '?')[0])}</span>`).join('')}${extra + Math.max(0, n.in.length - 8) > 0 ? `<span class="lk-av more">+${extra + Math.max(0, n.in.length - 8)}</span>` : ''}${n.inCount ? '' : '<span class="muted small">Be the first</span>'}</div></div></div>
<div class="lk-rsvp" role="group" aria-label="Your answer">${[['yes', '✅', 'I’m in'], ['maybe', '❔', 'Maybe'], ['no', '❌', 'Can’t']].map(([k, i, l]) => `<button type="button" class="lk-ans a-${k}${n.mine === k ? ' on' : ''}" data-rsvp="${k}" aria-pressed="${n.mine === k}">${i} ${l}</button>`).join('')}</div>
${(n.plays || []).length ? `<div class="lk-plays"><small class="muted">📋 Plays for tonight</small><div class="lk-play-row">${n.plays.map((p) => `<a class="lk-play${p.learned ? ' got' : p.assigned ? ' todo' : ''}" href="tactics.html#play${esc(p.id)}">${p.learned ? '✅' : p.assigned ? '📌' : '▶'} ${esc(p.title)}</a>`).join('')}</div></div>` : ''}
<p class="lk-links"><a href="#schedule-${esc(n.id)}">Open event →</a><a href="#availability">Full week →</a></p>`;
  }

  // ---------- ③ MOTM vote by picking a card ----------
  const closesIn = (t) => {
    const ms = t - Date.now(), h = Math.ceil(ms / 36e5);
    return ms <= 0 ? 'closed' : h >= 24 ? `closes in ${Math.floor(h / 24)}d ${h % 24}h` : `closes in ${h}h`;
  };
  // Vote closed: the winner's card sits face-down with a "?" – tap to flip it over (kept per match across repaints).
  function closedVote(m, st, chips) {
    const head = `<div class="lk-sec-h"><h3>⭐ MOTM · ${esc(m.gf)}–${esc(m.ga)} vs ${esc(m.opp)}</h3><span class="lk-tag">🔒 Voting closed</span></div>${chips}`;
    const w = st.winner;
    if (!w) return `${head}${UI.empty({ icon: '🗳️', title: 'No votes were cast', text: 'Voting for this match has closed without a winner.' })}`;
    const on = !!wflip[m.id];
    return `${head}<div class="lk-win"><button type="button" class="lk-wcard${on ? ' flipped' : ''}" data-wflip="${esc(m.id)}" aria-pressed="${on}" aria-label="${on ? `Man of the match: ${esc(w.n)}` : 'Tap to reveal the man of the match'}">
<span class="lk-flip"><span class="lk-side lk-front lk-wq"><b>?</b><small>Tap to reveal</small></span>
<span class="lk-side lk-back lk-wface"><span class="lk-vc-top"><b>${w.r != null ? Number(w.r).toFixed(1) : '⭐'}</b><small>${esc(POS[w.pos] || w.pos || '')}</small></span><span class="lk-face">${SIL}</span><span class="lk-vc-name">${esc(w.n)}</span><span class="lk-vc-n">👑 ${w.votes} vote${w.votes === 1 ? '' : 's'}${w.tie ? ' · tied' : ''}</span></span></span></button></div>
<p class="muted small lk-fan-help">${on ? `${esc(w.n)} is man of the match${w.tie ? ' (tied on votes – higher rating takes it)' : ''}.` : 'The club has decided – flip the card.'}</p>`;
  }
  function voteFan() {
    const ms = votes?.matches || [];
    const award = ctx.flagOn('awards') && data.vote ? `<a class="lk-award" href="#awards">${data.vote.voted ? '✅ Weekly awards: you’ve voted' : '🏆 Weekly awards are open'} · closes ${esc(new Date(data.vote.closes).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }))}</a>` : '';
    if (!votes) return `<div class="lk-sec-h"><h3>⭐ MOTM vote</h3></div>${UI.skeleton('cards', 1)}`;
    if (!ms.length) return `<div class="lk-sec-h"><h3>⭐ MOTM vote</h3></div>${UI.empty({ icon: '⚽', title: 'No recent matches', text: 'Votes open after our next league or playoff game.' })}${award}`;
    const m = ms[Math.min(voteAt, ms.length - 1)];
    const st = (data.motm || []).find((x) => String(x.id) === String(m.id));
    const chips = ms.length > 1 ? `<div class="chipset lk-matches">${ms.map((x, i) => `<button type="button" class="chip${i === Math.min(voteAt, ms.length - 1) ? ' on' : ''}" data-vm="${i}"><span class="res ${esc(x.res)}">${esc(x.res)}</span> vs ${esc(x.opp)}</button>`).join('')}</div>` : '';
    if (st?.closed) return closedVote(m, st, chips) + award;
    const ps = [...m.players].sort((a, b) => b.r - a.r).slice(0, 7);
    const top = Math.max(0, ...Object.values(m.tally));
    const mid = (ps.length - 1) / 2;
    const cards = ps.map((p, i) => {
      const o = i - mid, n = m.tally[p.k] || 0;
      const lead = top > 0 && n === top;
      return `<button type="button" class="lk-vc${m.mine === p.k ? ' mine' : ''}${lead ? ' lead' : ''}" data-vote="${esc(p.k)}" style="--rot:${(o * 7).toFixed(1)}deg;--dy:${(Math.abs(o) * Math.abs(o) * 4).toFixed(0)}px;--z:${20 - Math.round(Math.abs(o))}" aria-pressed="${m.mine === p.k}" aria-label="Vote for ${esc(p.n)}, rated ${Number(p.r).toFixed(1)}">
<span class="lk-vc-top"><b>${Number(p.r).toFixed(1)}</b><small>${esc(POS[p.pos] || p.pos || '')}</small></span><span class="lk-face">${SIL}</span><span class="lk-vc-name">${esc(p.n)}</span>
<span class="lk-vc-n">${n ? `${lead ? '👑 ' : ''}${n} vote${n === 1 ? '' : 's'}` : '&nbsp;'}</span>${m.mine === p.k ? '<span class="lk-ribbon">✓ Your vote</span>' : ''}</button>`;
    }).join('');
    return `<div class="lk-sec-h"><h3>⭐ MOTM vote · ${esc(m.gf)}–${esc(m.ga)} vs ${esc(m.opp)}</h3><span class="lk-tag">${m.total} vote${m.total === 1 ? '' : 's'}${st ? ` · ${closesIn(st.closes)}` : ''}</span></div>
${chips}
<div class="lk-fan" data-match="${esc(m.id)}">${cards}</div>
<p class="muted small lk-fan-help">Tap a card to vote · tap your pick again to take it back.</p>${award}`;
  }

  // ---------- ④ me vs the squad ----------
  function radar(mine, avg) {
    const W = 280, H = 230, cx = W / 2, cy = 118, R = 82;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
    const poly = (vals) => vals.map((v, i) => pt(i, Math.max(0.04, Math.min(1, v / 100))).map((x) => x.toFixed(1)).join(',')).join(' ');
    const ring = (f) => RADAR.map((_, i) => pt(i, f).map((x) => x.toFixed(1)).join(',')).join(' ');
    return `<svg class="lk-radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Radar: you against the squad average">
${[0.33, 0.66, 1].map((f) => `<polygon points="${ring(f)}" class="ring"/>`).join('')}
${RADAR.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="spoke"/>`; }).join('')}
<polygon points="${poly(mine)}" class="me"/><polygon points="${poly(avg)}" class="avg"/>
${RADAR.map((l, i) => { const [x, y] = pt(i, 1.2); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${Math.abs(x - cx) < 4 ? 'middle' : x > cx ? 'start' : 'end'}">${l.toUpperCase()}</text>`; }).join('')}</svg>`;
  }
  function vsSquad(pl) {
    const head = '<div class="lk-sec-h"><h3>📊 Me vs the squad</h3><span class="lk-tag">League season</span></div>';
    if (!pl || !pl.s?.gp) return head + UI.empty({ icon: '📊', title: pl ? 'No league games yet' : 'Claim your player first', text: pl ? 'Your numbers line up against the squad after your first league match.' : 'Once a manager approves your claim, your season sits here next to the squad average.' });
    const sq = squad().length ? squad() : [pl];
    const mean = (f) => sq.reduce((a, p) => a + f(p), 0) / sq.length;
    const avgRad = RADAR.map((_, i) => mean((p) => p.rad?.[i] || 0));
    const rows = [['Goals', (p) => p.s.g || 0, 0], ['Assists', (p) => p.s.a || 0, 0], ['Rating', (p) => Number(p.s.r) || 0, 1], ['MOTM', (p) => p.s.m || 0, 0]];
    const bars = rows.map(([l, f, dec]) => {
      const max = Math.max(f(pl), ...sq.map(f), 0.1), a = mean(f);
      return `<div class="lk-bar"><span>${l}</span><span class="lk-track"><i style="width:${((f(pl) / max) * 100).toFixed(1)}%"></i><em style="left:${((a / max) * 100).toFixed(1)}%" title="Squad average ${a.toFixed(1)}"></em></span><b>${dec ? f(pl).toFixed(1) : f(pl)}</b></div>`;
    }).join('');
    return `${head}<div class="lk-vs-body">${radar(pl.rad || [0, 0, 0, 0, 0, 0], avgRad)}<div class="lk-bars-col">${bars}<p class="muted small">Red = you · white line = squad average (${sq.length} players, 3+ games)</p></div></div>`;
  }

  // ---------- ⑤ medals + alerts ----------
  function medals() {
    const md = data.medals || { count: 0, total: 0, top: [] };
    const fresh = new Set((data.achievements || []).map((a) => a.id));
    const all = ctx.flagOn('myStats') ? '<a class="lk-more" href="#stats">All medals →</a>' : '';
    return `<div class="lk-sec-h"><h3>🏅 Achievements</h3><span class="lk-tag">${md.count} / ${md.total}</span></div>
${md.top.length ? `<div class="lk-medals">${md.top.map((a, i) => `<span class="lk-medal t-${esc(a.tier)}${fresh.has(a.id) || Date.now() - a.at < 3 * 864e5 ? ' fresh' : ''}" style="--d:${i * 90}ms" title="${esc(a.name)}"><span class="lk-coin">${esc(a.icon)}</span><b>${esc(a.name)}</b><small>${esc(a.tier)}</small></span>`).join('')}</div>${all}`
      : UI.empty({ icon: '🏅', title: 'No medals yet', text: 'Play a league match, vote for MOTM or fill in your profile to earn your first.' })}`;
  }
  function alerts() {
    const list = data.alerts || [];
    const time = (t) => (UI.time ? UI.time(t) : new Date(t).toLocaleDateString());
    return `<div class="lk-sec-h lk-alerts-h"><h3>🔔 Alerts${data.unread ? ` <span class="lk-badge">${data.unread}</span>` : ''}</h3><a class="lk-more" href="#alerts">All →</a></div>
${list.length ? `<ul class="lk-alerts">${list.map((a) => { const href = safeLink(a.link); return `<li class="${a.read ? '' : 'unread'}">${href ? `<a href="${esc(href.startsWith('#') ? href : ctx.base + href)}">` : '<span>'}<i>${esc(a.icon || '🔔')}</i><span>${esc(a.title)}</span><small>${esc(time(a.at))}</small>${href ? '</a>' : '</span>'}</li>`; }).join('')}</ul>`
      : '<p class="muted small">All quiet – nothing new for you.</p>'}`;
  }

  // ---------- paint + events ----------
  function paint() {
    if (!el?.isConnected) return;
    if (!data) { el.innerHTML = UI.skeleton('cards', 4); return; }
    const pl = myPlayer();
    el.innerHTML = `<div class="lk-room">
<div class="lk-head"><h2>My locker</h2><span class="muted small">${pl ? `${esc(pl.n)} · ${esc(pl.pos || '')}` : 'Claim your player to fill your locker'}</span></div>
<div class="lk-grid">
<section class="lk-sec lk-locker" aria-label="Your card">${hook(pl)}</section>
<section class="lk-sec card lk-next" aria-label="Next match night">${next()}</section>
<section class="lk-sec card lk-vote" aria-label="Man of the match vote">${voteFan()}</section>
<section class="lk-sec card lk-vs" aria-label="Me vs the squad">${vsSquad(pl)}</section>
${pl && ctx.mountNote && !noteNone ? '<section class="lk-sec lk-note" data-lk-note hidden aria-label="Coach\'s note"></section>' : ''}
<section class="lk-sec card lk-ach" aria-label="Achievements and alerts">${medals()}${alerts()}</section>
</div></div>`;
    coachNote(pl);
    ctx.badges?.({ playbook: data.playbook || 0, builds: data.builds || 0, alerts: data.unread || 0, votes: votes?.matches?.filter((m) => !m.mine && !(data.motm || []).find((x) => String(x.id) === String(m.id) && x.closed)).length ? 1 : 0, awards: data.vote && !data.vote.voted && ctx.flagOn('awards') ? 1 : 0 });
    clearInterval(tick);
    tick = setInterval(() => {
      if (!el?.isConnected) { clearInterval(tick); return; }
      const c = $('.lk-count', el);
      if (c) c.innerHTML = countdown(Number(c.dataset.start));
    }, 15000);
  }
  // ✨ Coach's note (BE9, private tier): mounted once and carried across repaints. The API only returns it for my own
  // claimed player (or to a manager), so with no row the slot goes away for good (noteNone) instead of re-asking every paint.
  let noteEl = null, noteBusy = false, noteNone = false;
  function coachNote(pl) {
    const slot = el.querySelector('[data-lk-note]');
    if (!slot || !pl || !ctx.mountNote) return;
    if (noteEl) { slot.replaceWith(noteEl); return; }
    if (noteBusy) return;
    noteBusy = true;
    ctx.mountNote(slot, `note.${pl.k}`).then(() => {
      if (slot.querySelector('.nx-ins-head')) { noteEl = slot; if (!slot.isConnected) el.querySelector('[data-lk-note]')?.replaceWith(slot); } else noteNone = true;
    }).catch(() => { noteNone = true; slot.remove(); }).finally(() => { noteBusy = false; });
  }
  function tilt(e) {
    const card = e.target.closest?.('.lk-card');
    if (!card || reduced()) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.setProperty('--ry', `${((x - 0.5) * 22).toFixed(1)}deg`);
    card.style.setProperty('--rx', `${((0.5 - y) * 16).toFixed(1)}deg`);
    card.style.setProperty('--mx', `${(x * 100).toFixed(0)}%`);
    card.style.setProperty('--my', `${(y * 100).toFixed(0)}%`);
  }
  function untilt(e) {
    const card = e.target.closest?.('.lk-card');
    if (card) { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); }
  }
  async function rsvp(status) {
    const n = data.next;
    if (!n || busy || n.mine === status) return;
    const prev = JSON.parse(JSON.stringify(n));
    const me = ctx.me;
    if (n.mine === 'yes') { n.in = n.in.filter((p) => p.id !== me.u); n.inCount--; }
    if (status === 'yes') { n.in.push({ id: me.u, n: me.n, a: me.a }); n.inCount++; }
    n.mine = status;
    busy = true; paint();
    try { await ctx.call('/api/events/rsvp', { ids: [n.id], status }); ctx.toast(status === 'yes' ? 'You’re in ✅' : status === 'maybe' ? 'Saved as maybe' : 'Saved – thanks for letting us know'); busy = false; refresh(); }
    catch (er) { data.next = prev; busy = false; paint(); ctx.toast(er.message, true); }
  }
  async function vote(k) {
    const m = votes?.matches?.[Math.min(voteAt, votes.matches.length - 1)];
    if (!m || busy) return;
    const prev = JSON.parse(JSON.stringify(votes));
    const removing = m.mine === k;
    if (m.mine) { m.tally[m.mine]--; m.total--; }
    m.mine = removing ? null : k;
    if (!removing) { m.tally[k] = (m.tally[k] || 0) + 1; m.total++; }
    busy = true; paint();
    try { votes = await ctx.call('/api/vote', { match: m.id, player: removing ? null : k }); ctx.toast(removing ? 'Vote removed' : 'Vote saved ⭐'); }
    catch (er) { votes = prev; ctx.toast(er.message, true); }
    busy = false; paint();
  }
  // Save my card as a PNG – drawn on a canvas (same-origin crest), no library.
  function saveCard() {
    const pl = myPlayer();
    if (!pl) return;
    const [c1, c2, tx] = TIER_COL[`tier-${tierOf(pl.ovr)}`];
    const W = 600, H = 860, cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d');
    g.fillStyle = '#0b0f16'; g.fillRect(0, 0, W, H);
    const shape = () => { g.beginPath(); [[0, .04], [.08, 0], [.92, 0], [1, .04], [1, .88], [.5, 1], [0, .88]].forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](40 + x * 520, 40 + y * 760)); g.closePath(); };
    const grad = g.createLinearGradient(40, 40, 560, 800); grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    shape(); g.fillStyle = grad; g.fill();
    g.save(); shape(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 3;
    for (let x = -800; x < 1200; x += 22) { g.beginPath(); g.moveTo(x, 900); g.lineTo(x + 420, 0); g.stroke(); }
    g.restore();
    g.fillStyle = tx; g.textBaseline = 'alphabetic';
    g.font = '700 110px Oswald, Impact, sans-serif'; g.fillText(String(pl.ovr || '–'), 80, 190);
    g.font = '600 40px Oswald, Impact, sans-serif'; g.fillText(String(pl.pos || ''), 86, 240);
    g.globalAlpha = 0.25; g.beginPath(); g.arc(300, 360, 80, 0, 7); g.fill(); g.beginPath(); g.ellipse(300, 560, 150, 110, 0, Math.PI, 0); g.fill(); g.globalAlpha = 1;
    g.textAlign = 'center'; g.font = '700 50px Oswald, Impact, sans-serif'; g.fillText(String(pl.n).toUpperCase().slice(0, 18), 300, 625);
    const s = pl.s || {};
    [['GLS', s.g ?? '–'], ['AST', s.a ?? '–'], ['RAT', s.r ? Number(s.r).toFixed(1) : '–']].forEach(([l, v], i) => {
      const x = 170 + i * 130;
      g.font = '700 46px Oswald, Impact, sans-serif'; g.fillText(String(v), x, 705);
      g.font = '500 22px Inter, sans-serif'; g.fillText(l, x, 735);
    });
    g.font = '600 20px Oswald, Impact, sans-serif'; g.fillStyle = '#c8352c'; g.fillText('NOREX UNITED FC', 300, 838);
    const out = () => cv.toBlob((b) => { if (!b) return; const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: `norex-${String(pl.n).replace(/[^\w-]+/g, '_')}.png` }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png');
    const img = new Image();
    img.onload = () => { const h = 84, w = (img.width / img.height) * h; g.drawImage(img, 520 - w, 96, w, h); out(); };
    img.onerror = out;
    img.src = `${ctx.base}assets/crest.png`;
  }
  function onClick(e) {
    const t = e.target.closest('[data-lk], [data-rsvp], [data-vote], [data-vm], [data-wflip]');
    if (!t) return;
    const d = t.dataset;
    if (d.lk === 'flip') { flipped = !flipped; t.classList.toggle('flipped', flipped); t.setAttribute('aria-pressed', flipped); }
    if (d.lk === 'save') saveCard();
    if (d.lk === 'claim') location.hash = 'me';
    if (d.rsvp) rsvp(d.rsvp);
    if (d.vote) vote(d.vote);
    if (d.wflip) { wflip[d.wflip] = !wflip[d.wflip]; paint(); }
    if (d.vm !== undefined) { voteAt = Number(d.vm); paint(); }
  }

  async function refresh() {
    if (!ctx) return;
    try {
      const [l, v] = await Promise.all([ctx.call('/api/locker'), ctx.call('/api/vote').catch(() => votes)]);
      if (busy) return;
      data = l; votes = v; paint();
    } catch (er) { if (!data && el?.isConnected) el.innerHTML = UI.empty({ icon: '🎽', title: 'Could not open your locker', text: er.message }); }
  }
  function tab(root, c) {
    el = root; ctx = c;
    el.onclick = onClick;
    el.onpointermove = tilt;
    el.onpointerleave = untilt;
    el.addEventListener('pointerout', (e) => { if (e.target.closest?.('.lk-card') && !e.relatedTarget?.closest?.('.lk-card')) untilt(e); });
    paint();
    refresh();
  }
  window.NXLocker = { tab, refresh };
})();
