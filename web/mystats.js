// Personal stats dashboard (roadmap P2.6) – Squad Hub tab "📊 My stats". Loaded on demand by app.js.
// League: our archived EA matches (site api/squad.json). Rush: confirmed results (/api/rush). Achievements + streaks
// (P2.3 / P4.3) come from /api/achievements when the badges flag is on.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = UI.esc;
  const BASE = document.body.dataset.base || '';
  if (!$('link[href$="mystats.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/mystats.css` }));

  const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const sum = (xs) => xs.reduce((s, x) => s + x, 0);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  const rc = (r) => (r >= 9 ? 'r-elite' : r >= 8 ? 'r-great' : r >= 7 ? 'r-good' : r >= 6 ? 'r-mid' : 'r-low');
  const rp = (r) => `<span class="rp ${r ? rc(r) : ''}">${r ? Number(r).toFixed(1) : '–'}</span>`;
  const res = (r) => `<span class="res ${r}">${r}</span>`;
  const day = (ts) => new Date(ts * 1000).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const card = (title, body, cls = '') => `<section class="card ms-card ${cls}"><h3>${title}</h3>${body}</section>`;
  const MODE_KEY = 'norex_mode';

  // ---------- data → one shape for both modes: { ts, res, g, a, r, motm, shots?, pass?, passAtt?, tkl?, tklAtt?, gf, ga } ----------
  function leagueData(squad) {
    const c = Object.fromEntries(squad.cols.map((k, i) => [k, i]));
    const row = (x) => ({ ts: x[c.ts], res: x[c.res], g: x[c.g], a: x[c.a], r: x[c.r], motm: !!x[c.motm], shots: x[c.shots], pass: x[c.pass], passAtt: x[c.passAtt], tkl: x[c.tkl], tklAtt: x[c.tklAtt], gf: x[c.gf], ga: x[c.ga], grp: x[c.grp] });
    return Object.fromEntries(Object.entries(squad.players).map(([k, l]) => [k, l.map(row)]));
  }
  function rushData(matches) {
    const by = {};
    for (const m of [...matches].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)) {
      const ts = Date.parse(m.date + 'T20:00:00Z') / 1000 + (m.id % 1000); // same-day order
      for (const p of m.players) if (p.k) (by[p.k] ??= []).push({ ts, res: m.res, g: p.g, a: p.a, r: p.r ?? 0, motm: p.motm, gf: m.gf, ga: m.ga, day: m.date });
    }
    return by;
  }

  // Totals + rates for one player's matches.
  function totals(ms) {
    const n = ms.length, rs = ms.map((m) => m.r).filter(Boolean);
    const has = (k) => ms.some((m) => m[k] != null);
    const t = {
      apps: n, g: sum(ms.map((m) => m.g)), a: sum(ms.map((m) => m.a)), motm: ms.filter((m) => m.motm).length,
      W: ms.filter((m) => m.res === 'W').length, D: ms.filter((m) => m.res === 'D').length, L: ms.filter((m) => m.res === 'L').length,
      r: rs.length ? r2(avg(rs)) : 0, ga: sum(ms.map((m) => m.ga)),
    };
    t.win = pct(t.W, n); t.gpg = n ? r2(t.g / n) : 0; t.apg = n ? r2(t.a / n) : 0; t.gapg = n ? r2((t.g + t.a) / n) : 0; t.cpg = n ? r2(t.ga / n) : 0;
    if (has('shots')) {
      const s = (k) => sum(ms.map((m) => m[k] || 0));
      Object.assign(t, { shots: s('shots'), spg: n ? r2(s('shots') / n) : 0, conv: pct(t.g, s('shots')), passPct: pct(s('pass'), s('passAtt')), ppg: n ? r1(s('pass') / n) : 0, miss: n ? r1((s('passAtt') - s('pass')) / n) : 0, tkpg: n ? r2(s('tkl') / n) : 0, tkPct: pct(s('tkl'), s('tklAtt')) });
    }
    return t;
  }
  function streaks(ms) {
    const run = (ok) => { let cur = 0, best = 0, bestEnd = null; ms.forEach((m) => { cur = ok(m) ? cur + 1 : 0; if (cur > best) { best = cur; bestEnd = m.ts; } }); return { cur, best, bestEnd }; };
    return { unb: run((m) => m.res !== 'L'), win: run((m) => m.res === 'W'), score: run((m) => m.g > 0), inv: run((m) => m.g + m.a > 0) };
  }
  // Consecutive matches less than 4 hours apart = one session (a match night).
  function sessions(ms) {
    const out = [];
    for (const m of ms) {
      const last = out[out.length - 1];
      const same = last && (m.day ? last.day === m.day : m.ts - last.end < 4 * 3600); // Rush results only carry a date
      if (same) { last.ms.push(m); last.end = m.ts; } else out.push({ start: m.ts, end: m.ts, day: m.day, ms: [m] });
    }
    return out.reverse();
  }
  // Rank of `v` among `vals` → 0..100 (higher is better unless low = true).
  const pctRank = (v, vals, low = false) => {
    if (vals.length < 2) return 50;
    const below = vals.filter((x) => (low ? x > v : x < v)).length, same = vals.filter((x) => x === v).length - 1;
    return Math.round(((below + same / 2) / (vals.length - 1)) * 100);
  };

  // ---------- views ----------
  const delta = (mine, squad, dec = 2, low = false) => {
    if (!squad) return '';
    const d = mine - squad, good = low ? d < 0 : d > 0;
    if (Math.abs(d) < 10 ** -dec / 2) return '<small class="ms-d eq">= squad</small>';
    return `<small class="ms-d ${good ? 'up' : 'down'}" title="Squad average ${squad}">${d > 0 ? '▲' : '▼'} ${Math.abs(r2(d))} vs squad</small>`;
  };
  const kpi = (icon, label, v, extra = '') => `<div class="ms-kpi"><span>${icon} ${label}</span><b>${v}</b>${extra}</div>`;

  function ratingChart(ms, squadR) {
    const pts = ms.filter((m) => m.r).slice(-20);
    if (pts.length < 2) return UI.empty({ icon: '📈', title: 'Needs a couple more matches', text: 'Your rating line appears after 2 rated games.' });
    const w = 640, h = 200, pad = { l: 30, r: 10, t: 12, b: 22 };
    const lo = Math.floor(Math.min(...pts.map((p) => p.r), squadR || 10) - 0.5), hi = Math.ceil(Math.max(...pts.map((p) => p.r), squadR || 0) + 0.3);
    const x = (i) => pad.l + (i * (w - pad.l - pad.r)) / (pts.length - 1);
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${r1(x(i))},${r1(y(p.r))}`).join('');
    return `<svg class="chart line ms-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Match rating over time">
<defs><linearGradient id="ms-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--red)" stop-opacity=".4"/><stop offset="1" stop-color="var(--red)" stop-opacity="0"/></linearGradient></defs>
${[lo, (lo + hi) / 2, hi].map((t) => `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${r1(y(t))}" y2="${r1(y(t))}"/><text class="axis" x="${pad.l - 6}" y="${r1(y(t)) + 4}" text-anchor="end">${r1(t)}</text>`).join('')}
${squadR ? `<line class="ref" x1="${pad.l}" x2="${w - pad.r}" y1="${r1(y(squadR))}" y2="${r1(y(squadR))}"/><text class="axis" x="${w - pad.r}" y="${r1(y(squadR)) - 5}" text-anchor="end">squad ${squadR}</text>` : ''}
<path class="area" d="${d}L${r1(x(pts.length - 1))},${h - pad.b}L${pad.l},${h - pad.b}Z" fill="url(#ms-g)"/>
<path class="stroke draw" d="${d}" stroke="var(--red)" pathLength="1"/>
${pts.map((p, i) => `<circle class="dot" cx="${r1(x(i))}" cy="${r1(y(p.r))}" r="4" fill="${p.res === 'W' ? 'var(--win)' : p.res === 'L' ? 'var(--loss)' : 'var(--draw)'}" data-tip="${esc(`${day(p.ts)} · ${p.res} ${p.gf}–${p.ga} · ${p.r.toFixed(1)}${p.g ? ` · ⚽${p.g}` : ''}${p.a ? ` · 🅰️${p.a}` : ''}`)}"/>`).join('')}
</svg>`;
  }

  // Four team-play scores out of 100 (League – needs EA's shots/passes/tackles), ranked against the squad.
  function teamPlay(me, squadT) {
    const pool = squadT.filter((t) => t.apps >= 3 && t.shots != null);
    if (me.shots == null || !pool.length) return '';
    const col = (k) => pool.map((t) => t[k]);
    const score = (parts) => Math.round(avg(parts.map(([k, low]) => pctRank(me[k], col(k), low))));
    const S = [
      ['⚔️', 'Attack', score([['gapg'], ['conv'], ['spg']]), 'Goals + assists, shots and conversion per game'],
      ['🛡️', 'Defending', score([['tkpg'], ['tkPct'], ['cpg', true]]), 'Tackles, tackle success and goals conceded per game'],
      ['🎛️', 'Control', score([['passPct'], ['ppg']]), 'Pass accuracy and passes per game'],
      ['🔒', 'Ball security', score([['passPct'], ['miss', true]]), 'Pass accuracy and misplaced passes per game (dribbles & possession lost need more EA data)'],
    ];
    return `<div class="ms-scores">${S.map(([ic, l, v, tip], i) => `<div class="ms-score" data-tip="${esc(tip)}" style="--v:${v};--i:${i}"><div class="ms-ring"><b>${v}</b></div><span>${ic} ${l}</span></div>`).join('')}</div>
<p class="small muted">Out of 100 – ranked against squad-mates with 3+ games. Hover for what counts.</p>`;
  }

  function vsSquad(me, sq, league) {
    const rows = [['⚽ Goals / game', 'gpg'], ['🅰️ Assists / game', 'apg'], ['⭐ Avg rating', 'r'], ['🏆 Win %', 'win', '%'], ...(league && me.shots != null ? [['🎯 Shots / game', 'spg'], ['🎛️ Pass %', 'passPct', '%'], ['🛡️ Tackles / game', 'tkpg'], ['🧤 Tackle %', 'tkPct', '%']] : [])];
    return `<ul class="ms-vs">${rows.map(([l, k, suf = '']) => {
      const a = me[k] ?? 0, b = sq[k] ?? 0, top = Math.max(a, b) || 1;
      return `<li><span>${l}</span><div class="ms-bars"><i class="me" style="width:${Math.round((a / top) * 100)}%"><em>${a}${suf}</em></i><i class="sq" style="width:${Math.round((b / top) * 100)}%"><em>${b}${suf}</em></i></div></li>`;
    }).join('')}</ul><p class="small muted"><span class="ms-key me"></span> me <span class="ms-key sq"></span> squad average (players with 3+ games)</p>`;
  }

  function bests(ms, st) {
    const top = (k) => ms.reduce((b, m) => (m[k] > (b?.[k] ?? 0) ? m : b), null);
    const g = top('g'), a = top('a'), r = top('r');
    const item = (ic, l, v, when) => `<li><span class="ms-bi">${ic}</span><div><b>${v}</b><small>${l}${when ? ` · ${when}` : ''}</small></div></li>`;
    return `<ul class="ms-bests">${[
      g?.g ? item('⚽', 'Most goals in a game', g.g, day(g.ts)) : '',
      a?.a ? item('🅰️', 'Most assists in a game', a.a, day(a.ts)) : '',
      r?.r ? item('⭐', 'Best rating', r.r.toFixed(1), day(r.ts)) : '',
      st.unb.best ? item('🛡️', 'Longest unbeaten run', `${st.unb.best} games`, st.unb.bestEnd ? `to ${day(st.unb.bestEnd)}` : '') : '',
      st.win.best ? item('📈', 'Longest winning run', `${st.win.best} games`) : '',
      st.score.best ? item('🔥', 'Scored in a row', `${st.score.best} games`) : '',
    ].join('') || '<li class="muted">No bests yet – play a few games!</li>'}</ul>`;
  }

  function sessionsView(ms) {
    const ss = sessions(ms).slice(0, 8);
    if (!ss.length) return UI.empty({ icon: '🌙', title: 'No sessions yet' });
    const most = Math.max(1, ...ss.map((s) => sum(s.ms.map((m) => m.g + m.a))));
    return `<ul class="ms-sessions">${ss.map((s) => {
      const t = totals(s.ms);
      return `<li><div><b>${esc(s.day ? new Date(s.day + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : day(s.start))}</b><small>${t.apps} game${t.apps > 1 ? 's' : ''} · ${t.W}W ${t.D}D ${t.L}L</small></div>
<div class="ms-sbar"><i class="g" style="width:${(t.g / most) * 100}%"></i><i class="a" style="width:${(t.a / most) * 100}%"></i></div><span class="ms-sga">⚽ ${t.g} · 🅰️ ${t.a}</span>${rp(t.r)}</li>`;
    }).join('')}</ul>`;
  }

  // ---------- main ----------
  async function tab(el, ctx) {
    el.innerHTML = UI.skeleton('cards', 4);
    const claim = ctx.claim;
    const badgesOn = ctx.flagOn('badges');
    const loadBadges = () => (window.NXBadges ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/badges.js`, onload: ok, onerror: no }))));
    const [squad, rush, ach, players] = await Promise.all([
      fetch(`${BASE}api/squad.json`, { cache: 'no-cache' }).then((r) => r.json()).catch(() => ({ cols: [], players: {} })),
      ctx.flagOn('rushLog') ? ctx.call('/api/rush').catch(() => ({ matches: [] })) : { matches: [] },
      badgesOn ? loadBadges().then(() => ctx.call('/api/achievements')).catch(() => null) : null,
      ctx.players().catch(() => []),
    ]);
    const data = { league: leagueData(squad), rush: rushData(rush.matches || []) };
    let mode = (() => { try { return localStorage.getItem(MODE_KEY) === 'rush' ? 'rush' : 'league'; } catch { return 'league'; } })();
    const k = claim?.status === 'approved' ? claim.player : null;
    const pl = k && players.find((p) => p.k === k);

    const draw = () => {
      const league = mode === 'league';
      const all = data[mode];
      const ms = (k && all[k]) || [];
      const squadT = Object.values(all).map(totals);
      const pool = squadT.filter((t) => t.apps >= 3);
      const sq = Object.fromEntries(['gpg', 'apg', 'r', 'win', 'spg', 'passPct', 'tkpg', 'tkPct'].map((x) => [x, r2(avg(pool.map((t) => t[x] ?? 0)))]));
      const t = totals(ms), st = streaks(ms);
      const f = ach?.facts ?? {};
      const head = `${UI.tabsHtml([['league', '🏟️ League'], ['rush', '⚡ Rush']], mode, 'ms-modes')}`;
      if (!k) {
        return `${head}${UI.empty({ icon: '🪪', title: 'Claim your player first', text: 'Your personal dashboard is built from your in-game stats. Link your gamertag in My NOREX – a manager approves it.', action: '<a class="btn sm" href="#me">👤 Go to My NOREX</a>' })}${achBlock()}`;
      }
      if (!ms.length) {
        return `${head}<div class="card">${UI.empty({ icon: league ? '🏟️' : '⚡', title: league ? 'No League games archived yet' : 'No confirmed Rush games yet', text: league ? 'The site keeps every League match from now on – play one and check back.' : 'Log a Rush result in the ⚡ Rush tab; it counts once a manager confirms it.' })}</div>${achBlock()}`;
      }
      const form = ms.slice(-10);
      const last5 = ms.filter((m) => m.r).slice(-5);
      const formIdx = last5.length ? r1(last5.reduce((s, m, i) => s + m.r * (i + 1), 0) / last5.reduce((s, _, i) => s + i + 1, 0)) : 0;
      return `${head}
<section class="card ms-hero"><div><small>${league ? '🏟️ League' : '⚡ Rush'} · ${esc(pl?.n ?? claim.playerName)}</small><h2>My stats</h2>
<p class="muted small">${league ? `From ${t.apps} archived League game${t.apps > 1 ? 's' : ''} for NOREX${pl?.car?.gp > t.apps ? ` · EA career: ${pl.car.gp} games, ${pl.car.g} goals, ${pl.car.a} assists` : ''}.` : `From ${t.apps} confirmed Rush game${t.apps > 1 ? 's' : ''}.`}</p></div>
${pl?.ovr ? `<a class="ms-ovr" href="${BASE}players/${encodeURIComponent(k)}.html" data-tip="Open my player page"><b>${pl.ovr}</b><small>${esc(pl.pos)}</small></a>` : ''}</section>
<div class="ms-kpis">
${kpi('🎽', 'Games', t.apps, `<small class="ms-d eq">${t.W}W ${t.D}D ${t.L}L</small>`)}
${kpi('⚽', 'Goals', t.g, `<small class="ms-d">${t.gpg}/game</small>${delta(t.gpg, sq.gpg)}`)}
${kpi('🅰️', 'Assists', t.a, `<small class="ms-d">${t.apg}/game</small>${delta(t.apg, sq.apg)}`)}
${kpi('⭐', 'Avg rating', t.r ? t.r.toFixed(2) : '–', delta(t.r, sq.r))}
${kpi('🏅', 'MOTM', t.motm)}
${kpi('🏆', 'Win %', `${t.win}%`, delta(t.win, sq.win, 0))}
</div>
<div class="ms-grid">
${card('📈 Form', `<div class="ms-form">${form.map((m) => `<span data-tip="${esc(`${day(m.ts)} · ${m.gf}–${m.ga}${m.g ? ` · ⚽${m.g}` : ''}${m.a ? ` · 🅰️${m.a}` : ''}${m.r ? ` · ${Number(m.r).toFixed(1)}` : ''}`)}">${res(m.res)}</span>`).join('')}</div>
<div class="ms-streaks">
<div><b>${formIdx || '–'}</b><small>Form index <i data-tip="Last 5 ratings, newest counts most">ⓘ</i></small></div>
<div class="${st.unb.cur >= 3 ? 'hot' : ''}"><b>${st.unb.cur}</b><small>🛡️ Unbeaten now</small></div>
<div class="${st.score.cur >= 2 ? 'hot' : ''}"><b>${st.score.cur}</b><small>🔥 Scoring run</small></div>
${badgesOn && f.weekNow != null ? `<div class="${f.weekNow >= 2 ? 'hot' : ''}"><b>${f.weekNow}</b><small>📅 Weeks “I’m in”</small></div>` : ''}
</div>`)}
${card('⚖️ Me vs squad average', vsSquad(t, sq, league))}
${card('⭐ Rating over time', ratingChart(ms, sq.r), 'wide')}
${league ? card('🧩 Team-play scores', `${teamPlay(t, squadT) || '<p class="muted">Needs a few more games from you and the squad.</p>'}<p class="small muted">🪄 Dribbles &amp; second assists join once the extra EA data ships (matches archived after that update).</p>`, 'wide') : ''}
${card('🥇 Personal bests', bests(ms, st))}
${card('🏆 My awards', `<ul class="ms-bests">${[
    `<li><span class="ms-bi">🏅</span><div><b>${pl?.car?.m ?? t.motm}</b><small>Man of the Match (EA${league ? ', all time' : ''})</small></div></li>`,
    badgesOn ? `<li><span class="ms-bi">👢</span><div><b>${f.bootMonths ?? 0}</b><small>Golden Boot months</small></div></li>` : '',
  ].join('')}</ul><p class="small muted">Weekly awards &amp; Player of the Month join here once voting opens.</p>`)}
${card('🌙 Goals by session', sessionsView(ms), 'wide')}
</div>${achBlock()}`;
    };
    // Achievements progress + points board (P2.3 / P4.3)
    const achBlock = () => (ach && window.NXBadges ? `<div class="ms-grid">
${card('🎯 Next achievements', `${NXBadges.achHead(ach)}${(() => { const next = NXBadges.nextUp(ach.list); return next.length ? `<div class="ach-grid">${next.map(NXBadges.tile).join('')}</div>` : '<p class="muted">Play, vote and say “I’m in” to start unlocking.</p>'; })()}<a class="btn sm ghost" href="${BASE}member.html?u=${encodeURIComponent(ctx.me.u)}">See all on my profile →</a>`, 'wide')}
${card('🏆 Achievement points', '<div data-ms-board></div>', 'wide')}</div>` : '');

    const paint = () => {
      el.innerHTML = draw();
      requestAnimationFrame(() => el.classList.add('in'));
      const tabs = $('.ms-modes', el);
      if (tabs) UI.tabs(tabs, (key) => { if (key === mode) return; mode = key; try { localStorage.setItem(MODE_KEY, mode); } catch {} el.classList.remove('in'); paint(); });
      const b = $('[data-ms-board]', el);
      if (b) NXBadges.board(b, ctx);
    };
    paint();
  }

  window.NXMyStats = { tab, totals, streaks, sessions, pctRank };
})();
