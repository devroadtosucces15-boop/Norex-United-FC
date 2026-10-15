// "Who to play with tonight" (roadmap P3.6) – Squad Hub → 🎯 Team up. League and Rush versions.
// Pure ranking (also imported by the tests): NXRecs.rank(me, people, { now, together }) scores every member on
//   who's around tonight (check-in, event answer, today's availability), play times that overlap the next hours,
//   positions that complement mine, my own Rush teammate picks, and past results together (win rate as a pair).
// NXRecs.pairs(squad, myKey) works out League results together from api/squad.json (same match timestamp = same game).
// NXRecs.tab(el, ctx) draws the list.
(() => {
  const GROUP = (p) => (p === 'GK' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(p) ? 'MID' : p ? 'FWD' : null);
  const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const fmt = new Map();
  // Is someone usually on at this moment (their play-time grid is in their own time zone)? null = no play times.
  function onAt(p, ms) {
    if (!Array.isArray(p?.playTimes) || !p.tz) return null;
    let f = fmt.get(p.tz);
    try { if (!f) fmt.set(p.tz, (f = new Intl.DateTimeFormat('en-GB', { timeZone: p.tz, weekday: 'short', hour: '2-digit', hourCycle: 'h23' }))); } catch { return null; }
    const parts = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return !!((p.playTimes[WD[parts.weekday]] >> Number(parts.hour)) & 1);
  }
  function pairs(squad, myKey) {
    const col = Object.fromEntries((squad?.cols ?? []).map((c, i) => [c, i]));
    const mine = new Map((squad?.players?.[myKey] ?? []).map((r) => [r[col.ts], r[col.res]]));
    const out = {};
    if (!mine.size) return out;
    for (const [k, rows] of Object.entries(squad.players)) {
      if (k === myKey) continue;
      let games = 0, wins = 0, draws = 0;
      for (const r of rows) { const res = mine.get(r[col.ts]); if (res == null) continue; games++; if (res === 'W') wins++; else if (res === 'D') draws++; }
      if (games) out[k] = { games, wins, draws };
    }
    return out;
  }
  const HOURS = 6;
  function score(me, p, { now = Date.now(), together = {} } = {}) {
    let s = 0;
    const why = [];
    const add = (n, icon, text, tone = n >= 0 ? 'good' : 'bad') => { s += n; why.push({ icon, text, tone }); };
    // around tonight
    if (p.checkedIn) add(4, '🟢', 'Checked in tonight');
    else if (p.rsvp === 'yes') add(3, '✅', 'Coming tonight');
    else if (p.rsvp === 'maybe') add(1, '❔', 'Maybe tonight', 'meh');
    else if (p.rsvp === 'no') add(-4, '❌', 'Not tonight');
    if (!p.checkedIn && p.rsvp !== 'yes' && p.rsvp !== 'no') {
      if (p.avail === 'yes') add(2, '📅', 'In today');
      else if (p.avail === 'maybe') add(0.5, '📅', 'Maybe today', 'meh');
      else if (p.avail === 'no') add(-3, '📅', 'Out today');
    }
    // play times
    const theirsNow = onAt(p, now);
    if (theirsNow != null) {
      let both = 0;
      for (let h = 0; h < HOURS; h++) { const t = now + h * 3600e3; if (onAt(p, t) && onAt(me, t) !== false) both++; }
      if (theirsNow) add(1, '🕒', 'Usually on now');
      if (both) add(Math.min(3, both * 0.5), '⏱️', `Usually on together ${both} h${onAt(me, now) == null ? ' (from their times)' : ''}`);
    }
    // positions
    const myPos = me.pos?.[0], theirPos = p.pos?.[0];
    if (myPos && theirPos) {
      if (myPos === theirPos) add(-0.5, '🔁', `Also plays ${theirPos}`, 'meh');
      else if (GROUP(myPos) !== GROUP(theirPos)) add(1.5, '🧩', `${theirPos} complements your ${myPos}`);
      else add(0.5, '🧩', `${theirPos} next to your ${myPos}`, 'meh');
    }
    // my picks (Rush squad preferences – only my own list is used)
    if (p.myPick != null) add(3 * (10 - p.myPick) / 10, '🤝', `Your #${p.myPick + 1} teammate pick`);
    // results together
    const t = p.player && together[p.player];
    if (t && t.games >= 2) {
      const wr = (t.wins + t.draws / 2) / t.games;
      add((wr - 0.5) * 4 * Math.min(1, t.games / 5) + Math.min(t.games, 20) * 0.05, wr >= 0.5 ? '📈' : '📉', `W ${t.wins} of ${t.games} together (${Math.round((t.wins / t.games) * 100)}%)`, wr >= 0.5 ? 'good' : 'bad');
    } else if (t?.games === 1) add(0.05, '🎮', 'Played 1 game together', 'meh');
    return { score: Math.round(s * 100) / 100, why };
  }
  // → people sorted best first, each with { score, why, around }. Members who said they're out go last.
  function rank(me, people, opts = {}) {
    return people.map((p) => ({ ...p, ...score(me, p, opts), around: !!(p.checkedIn || p.rsvp === 'yes' || p.avail === 'yes' || onAt(p, opts.now ?? Date.now())) }))
      .sort((a, b) => b.score - a.score || (b.last ?? 0) - (a.last ?? 0));
  }

  // ---------- UI ----------
  function tab(el, ctx) {
    const $ = (s, root = el) => root.querySelector(s);
    const BASE = document.body.dataset.base || '';
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    if (!document.querySelector('link[href$="recs.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/recs.css` }));
    let mode = (() => { try { return localStorage.getItem('norex_mode') === 'rush' ? 'rush' : 'league'; } catch { return 'league'; } })();
    let only = true, squad = null;
    const load = async () => {
      el.innerHTML = UI.skeleton('rows', 5);
      try {
        const [d, sq] = await Promise.all([ctx.call(`/api/recs?mode=${mode}`), mode === 'league' && !squad ? fetch(`${BASE}api/squad.json`).then((r) => r.json()).catch(() => null) : Promise.resolve(squad)]);
        if (mode === 'league') squad = sq;
        const together = mode === 'rush' ? d.together : pairs(squad, d.me.player);
        paint(d, rank(d.me, d.people, { now: Date.now(), together }));
      } catch (e) { el.innerHTML = UI.empty({ icon: '📡', title: 'Recommendations are unavailable', text: e.message }); }
    };
    const paint = (d, list) => {
      const shown = list.filter((p) => !only || p.around).slice(0, 25);
      const top = Math.max(1, ...list.map((p) => p.score));
      el.innerHTML = `<div class="rc-head"><div><h3>🎯 Who to play with ${d.tonight ? 'tonight' : 'now'}</h3><p class="muted small">Ranked on who’s around, play times that overlap the next ${HOURS} hours, positions that fit yours, your own Rush teammate picks and how you’ve done together.${d.me.player ? '' : ' <b>Claim your player</b> to add results together.'}${d.me.pos?.length ? '' : ` <a href="${BASE}members.html#me">Add your ${mode === 'rush' ? 'Rush ' : ''}positions</a> for position fit.`}</p></div>
<div class="chipset rc-modes">${[['league', '🏆 League'], ['rush', '⚡ Rush']].map(([k, l]) => `<button type="button" class="chip${mode === k ? ' on' : ''}" data-mode="${k}">${l}</button>`).join('')}</div></div>
${d.tonight ? `<p class="rc-tonight">📅 <b>${esc(d.tonight.title || (mode === 'rush' ? 'Rush session' : 'Match night'))}</b> · ${new Date(d.tonight.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – answers and check-ins count</p>` : ''}
<label class="rc-only"><input type="checkbox" data-only${only ? ' checked' : ''}> Only people who look around today</label>
${shown.length ? `<ol class="rc-list">${shown.map((p, i) => `<li class="card rc-p"><span class="rc-rank">${i + 1}</span><div class="rc-main">${UI.member({ id: p.id, n: p.n, a: p.a, sub: (p.pos ?? []).join(' / ') || undefined, player: p.player }, { size: 34 })}
<div class="rc-why">${p.why.map((w) => `<span class="rc-chip ${w.tone}">${w.icon} ${esc(w.text)}</span>`).join('') || '<span class="muted small">Not much to go on yet</span>'}</div></div>
<div class="rc-side"><span class="rc-bar" aria-hidden="true"><i style="width:${Math.max(4, (Math.max(0, p.score) / top) * 100)}%"></i></span><a class="btn sm discord" href="https://discord.com/users/${encodeURIComponent(p.id)}" target="_blank" rel="noopener">💬 Invite</a></div></li>`).join('')}</ol>`
        : UI.empty({ icon: '🌙', title: 'Nobody looks around yet', text: 'Untick the filter to see everyone, or check back once people answer tonight’s event.' })}`;
      el.onchange = (e) => { if (e.target.matches('[data-only]')) { only = e.target.checked; paint(d, list); } };
    };
    el.onclick = (e) => {
      const m = e.target.closest('[data-mode]');
      if (m && m.dataset.mode !== mode) { mode = m.dataset.mode; try { localStorage.setItem('norex_mode', mode); } catch {} load(); }
    };
    load();
  }

  globalThis.NXRecs = { rank, score, pairs, onAt, GROUP, tab };
})();
