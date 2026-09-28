// Member scout report (roadmap PB.5, part a) – analysis + a rule-based narrative (free, deterministic, explainable).
// Pure engine (also imported by the tests): NXScout.report(k, games, { tracked, names, mode })
//   games   = { playerKey: [row] } with rows { ts, res, g, a, r, motm, grp, pass, passAtt, tkl, tklAtt, shots, saves, ga, dri, match }
//   tracked = players.json – League only: percentiles among every tracked player in the same position group
// → { enough, games, grp, metrics, strengths, improve, patterns, insights, flags, team, suggestions, summary, narrative }
// NXScout.fromSquad(squad) / NXScout.fromRush(rush) turn api/squad.json and /api/rush into that shape.
// NXScout.section(el, { k, full, name }) draws it: League / Rush tabs; full report for the member + managers, short version otherwise.
(() => {
  const GROUP = (p) => (p === 'GK' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(p) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM', 'MID'].includes(p) ? 'MID' : p && p !== '—' ? 'FWD' : null);
  const WORD = { GK: 'goalkeeper', DEF: 'defender', MID: 'midfielder', FWD: 'forward' };
  const SESSION_GAP = 3 * 3600;
  const avg = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : null);
  const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
  const lc = (t) => (/^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1)); // 'MOTM rate' stays
  const sd = (l) => { const m = avg(l); return l.length > 1 ? Math.sqrt(avg(l.map((x) => (x - m) ** 2))) : 0; };

  // ---------- data adapters ----------
  function fromSquad(squad) {
    const c = Object.fromEntries((squad?.cols ?? []).map((x, i) => [x, i]));
    return Object.fromEntries(Object.entries(squad?.players ?? {}).map(([k, rows]) => [k, rows.map((r) => ({
      ts: r[c.ts], res: r[c.res], g: r[c.g] ?? 0, a: r[c.a] ?? 0, r: r[c.r] > 0 ? r[c.r] : null, motm: r[c.motm] ? 1 : 0, grp: r[c.grp] || null,
      pass: r[c.pass], passAtt: r[c.passAtt], tkl: r[c.tkl], tklAtt: r[c.tklAtt], shots: r[c.shots], saves: r[c.saves], ga: r[c.ga], dri: r[c.dri] ?? null, match: r[c.ts],
    }))]));
  }
  function fromRush(rush) {
    const out = {};
    for (const m of rush?.matches ?? []) {
      const ts = Date.parse(`${m.date}T12:00:00Z`) / 1000 + (m.id % 1000); // one date, several games – keep them apart and in order
      for (const p of m.players ?? []) if (p.k) (out[p.k] ??= []).push({ ts, res: m.res, g: p.g ?? 0, a: p.a ?? 0, r: p.r ?? null, motm: p.motm ? 1 : 0, grp: GROUP(p.pos), pos: p.pos, ga: m.ga, match: `r${m.id}` });
    }
    for (const l of Object.values(out)) l.sort((a, b) => a.ts - b.ts);
    return out;
  }

  // ---------- metrics ----------
  // [key, label, format, higher is better, groups it matters for, needs]
  const METRICS = [
    ['rating', 'Match rating', (v) => v.toFixed(2), true, ['GK', 'DEF', 'MID', 'FWD']],
    ['gpg', 'Goals per game', (v) => v.toFixed(2), true, ['MID', 'FWD']],
    ['apg', 'Assists per game', (v) => v.toFixed(2), true, ['DEF', 'MID', 'FWD']],
    ['shots', 'Shots per game', (v) => v.toFixed(1), true, ['FWD']],
    ['conv', 'Shot conversion', (v) => `${Math.round(v)}%`, true, ['FWD']],
    ['passPct', 'Pass accuracy', (v) => `${Math.round(v)}%`, true, ['GK', 'DEF', 'MID', 'FWD']],
    ['passes', 'Passes per game', (v) => v.toFixed(1), true, ['DEF', 'MID']],
    ['tklPct', 'Tackle success', (v) => `${Math.round(v)}%`, true, ['DEF', 'MID']],
    ['tkl', 'Tackles per game', (v) => v.toFixed(1), true, ['DEF', 'MID']],
    ['saves', 'Saves per game', (v) => v.toFixed(1), true, ['GK']],
    ['conceded', 'Conceded per game', (v) => v.toFixed(2), false, ['GK', 'DEF']],
    ['win', 'Win rate', (v) => `${Math.round(v)}%`, true, ['GK', 'DEF', 'MID', 'FWD']],
    ['motm', 'MOTM rate', (v) => `${Math.round(v)}%`, true, ['GK', 'DEF', 'MID', 'FWD']],
  ];
  const META = Object.fromEntries(METRICS.map(([k, label, fmt, up, groups]) => [k, { k, label, fmt, up, groups }]));
  function metricsOf(rows) {
    const n = rows.length;
    if (!n) return {};
    const sum = (f) => rows.reduce((s, r) => s + (r[f] ?? 0), 0);
    const has = (f) => rows.some((r) => r[f] != null);
    const rs = rows.map((r) => r.r).filter((x) => x != null);
    const m = { gpg: sum('g') / n, apg: sum('a') / n, win: (rows.filter((r) => r.res === 'W').length / n) * 100, motm: (sum('motm') / n) * 100 };
    if (rs.length) m.rating = avg(rs);
    if (has('shots')) { m.shots = sum('shots') / n; if (sum('shots')) m.conv = (sum('g') / sum('shots')) * 100; }
    if (has('passAtt') && sum('passAtt')) { m.passPct = (sum('pass') / sum('passAtt')) * 100; m.passes = sum('pass') / n; }
    if (has('tklAtt') && sum('tklAtt')) m.tklPct = (sum('tkl') / sum('tklAtt')) * 100;
    if (has('tkl')) m.tkl = sum('tkl') / n;
    if (has('saves')) m.saves = sum('saves') / n;
    if (has('ga')) m.conceded = sum('ga') / n;
    return m;
  }
  const mainGroup = (rows) => { const c = {}; for (const r of rows) if (r.grp) c[r.grp] = (c[r.grp] ?? 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; };
  // Share of the others below this value (+ half of ties), 0–100; flipped when lower is better.
  function pctile(v, others, up = true) {
    if (v == null || others.length < 3) return null;
    const below = others.filter((o) => (up ? o < v : o > v)).length, same = others.filter((o) => o === v).length;
    return Math.round(((below + same / 2) / others.length) * 100);
  }
  // players.json season stats → the metrics we can compare with every tracked player.
  const trackedMetrics = (p) => (p.s?.gp >= 10 ? { gpg: p.s.g / p.s.gp, apg: p.s.a / p.s.gp, rating: p.s.r || null, passPct: p.s.p || null, tklPct: p.s.t || null, win: p.s.w ?? null, motm: (p.s.m / p.s.gp) * 100 } : null);

  function sessionsOf(rows) {
    const out = [];
    for (const r of rows) { const last = out[out.length - 1]; if (last && r.ts - last[last.length - 1].ts < SESSION_GAP) last.push(r); else out.push([r]); }
    return out;
  }
  const falling = (vals, n = 3) => vals.length > n && vals.slice(-n - 1).every((v, i, l) => i === 0 || (v != null && l[i - 1] != null && v < l[i - 1]));

  function report(k, games, { tracked = [], names = {}, mode = 'league' } = {}) {
    const rows = [...(games[k] ?? [])].sort((a, b) => a.ts - b.ts);
    const n = rows.length;
    const name = names[k] ?? 'This player';
    if (n < 3) return { k, mode, enough: false, games: n, need: 3 };
    const grp = mainGroup(rows) ?? GROUP(tracked.find((p) => p.k === k)?.pos) ?? 'MID';
    const mine = metricsOf(rows);
    // Squad comparison: teammates with 3+ games, same position group when there are enough of them.
    const squad = Object.entries(games).filter(([x, l]) => x !== k && l.length >= 3).map(([x, l]) => ({ k: x, grp: mainGroup(l), m: metricsOf(l) }));
    const sameGrp = squad.filter((s) => s.grp === grp);
    const peers = sameGrp.length >= 3 ? sameGrp : squad;
    const trk = mode === 'league' ? tracked.filter((p) => !p.home && GROUP(p.pos) === grp).map(trackedMetrics).filter(Boolean) : [];
    const metrics = METRICS.filter(([key]) => mine[key] != null && (key !== 'saves' || grp === 'GK')).map(([key]) => {
      const meta = META[key];
      const sq = peers.map((s) => s.m[key]).filter((v) => v != null);
      const tr = trk.map((t) => t[key]).filter((v) => v != null);
      return { k: key, label: meta.label, value: r2(mine[key]), text: meta.fmt(mine[key]), up: meta.up, key: meta.groups.includes(grp),
        squadAvg: sq.length ? r2(avg(sq)) : null, pctSquad: pctile(mine[key], sq, meta.up), pctTracked: pctile(mine[key], tr, meta.up) };
    });
    const by = Object.fromEntries(metrics.map((m) => [m.k, m]));
    const peerWord = `${sameGrp.length >= 3 ? `squad ${WORD[grp]}s` : 'the squad'}`;

    // strengths: high percentiles on metrics that matter for the position
    const strengths = metrics.filter((m) => m.key || (m.pctTracked ?? m.pctSquad) >= 90).map((m) => {
      if (m.pctTracked != null && m.pctTracked >= 75) return { k: m.k, pct: m.pctTracked, text: `Top ${Math.max(1, 100 - m.pctTracked)} % for ${m.label.toLowerCase()} among tracked ${WORD[grp]}s (${m.text})` };
      if (m.pctSquad != null && m.pctSquad >= 75) return { k: m.k, pct: m.pctSquad, text: `${m.pctSquad >= 95 ? 'Best' : 'Among the best'} in ${peerWord} for ${m.label.toLowerCase()} (${m.text})` };
      return null;
    }).filter(Boolean).sort((a, b) => b.pct - a.pct).slice(0, 4);
    // areas to improve: position metrics below the squad's level, biggest gap first, with a target
    const OUTCOME = ['win', 'motm']; // results, not something to train
    const improve = metrics.filter((m) => m.key && !OUTCOME.includes(m.k) && m.squadAvg != null && (m.up ? m.value < m.squadAvg : m.value > m.squadAvg) && (m.pctSquad ?? 50) < 45)
      .map((m) => ({ k: m.k, gap: Math.abs(m.value - m.squadAvg) / Math.max(0.01, Math.abs(m.squadAvg)), target: m.squadAvg,
        text: `${m.label}: ${m.text} vs ${META[m.k].fmt(m.squadAvg)} for ${peerWord} – aim for ${META[m.k].fmt(m.squadAvg)}` }))
      .sort((a, b) => b.gap - a.gap).slice(0, 3);

    // patterns
    const patterns = [];
    const sessions = sessionsOf(rows);
    const sRating = sessions.map((s) => avg(s.map((r) => r.r).filter((x) => x != null)));
    if (sessions.length >= 4) {
      const last = avg(sRating.slice(-3).filter((x) => x != null)), before = avg(sRating.slice(0, -3).filter((x) => x != null));
      if (last != null && before != null && Math.abs(last - before) >= 0.3) patterns.push({ icon: last > before ? '📈' : '📉', text: `Form ${last > before ? 'is up' : 'has dipped'}: ${last.toFixed(1)} over the last 3 sessions vs ${before.toFixed(1)} before` });
    }
    const rIn = (f) => avg(rows.filter(f).map((r) => r.r).filter((x) => x != null));
    const inW = rIn((r) => r.res === 'W'), inL = rIn((r) => r.res === 'L');
    if (inW != null && inL != null && rows.filter((r) => r.res === 'L').length >= 2) {
      patterns.push(inW - inL >= 0.6 ? { icon: '🎭', text: `Level follows the result: ${inW.toFixed(1)} in wins, ${inL.toFixed(1)} in losses` } : { icon: '🧱', text: `Holds the level in defeats too: ${inL.toFixed(1)} in losses vs ${inW.toFixed(1)} in wins` });
    }
    const early = [], late = [];
    for (const s of sessions) s.forEach((r, i) => r.r != null && (i < 2 ? early : late).push(r.r));
    if (early.length >= 3 && late.length >= 3 && Math.abs(avg(early) - avg(late)) >= 0.3) patterns.push({ icon: avg(early) > avg(late) ? '🌅' : '🌙', text: `${avg(early) > avg(late) ? 'Sharper early' : 'Warms up'} in a session: ${avg(early).toFixed(1)} in the first two games vs ${avg(late).toFixed(1)} after` });
    const byGrp = {};
    for (const r of rows) if (r.grp && r.r != null) (byGrp[r.grp] ??= []).push(r.r);
    const grpRank = Object.entries(byGrp).filter(([, l]) => l.length >= 2).map(([g, l]) => [g, avg(l), l.length]).sort((a, b) => b[1] - a[1]);
    if (grpRank.length >= 2) patterns.push({ icon: '📍', text: `Rates highest as a ${WORD[grpRank[0][0]]} (${grpRank[0][1].toFixed(1)} in ${grpRank[0][2]} games) – ${grpRank.slice(1).map(([g, v]) => `${WORD[g]} ${v.toFixed(1)}`).join(', ')}` });
    const spread = sd(rows.map((r) => r.r).filter((x) => x != null));
    if (spread) patterns.push(spread < 0.55 ? { icon: '🎯', text: `Very consistent – ratings rarely move far from ${mine.rating.toFixed(1)}` } : spread > 1 ? { icon: '🎢', text: `Up and down – ratings swing about ±${spread.toFixed(1)} around ${mine.rating.toFixed(1)}` } : { icon: '⚖️', text: `Steady – ratings usually within ±${spread.toFixed(1)} of ${mine.rating.toFixed(1)}` });
    // partners: teammates in the same games
    const myGames = new Map(rows.map((r) => [r.match, r]));
    const partners = Object.entries(games).filter(([x]) => x !== k).map(([x, l]) => {
      const shared = l.filter((r) => myGames.has(r.match)).map((r) => myGames.get(r.match));
      return { k: x, n: names[x] ?? x, games: shared.length, wins: shared.filter((r) => r.res === 'W').length, r: avg(shared.map((r) => r.r).filter((v) => v != null)) };
    }).filter((p) => p.games >= 3).sort((a, b) => b.wins / b.games - a.wins / a.games || (b.r ?? 0) - (a.r ?? 0) || b.games - a.games);
    if (partners[0]) patterns.push({ icon: '🤝', text: `Plays best with ${partners[0].n}: W ${partners[0].wins} of ${partners[0].games} together${partners[0].r != null ? `, ${partners[0].r.toFixed(1)} average` : ''}` });

    // insights & callouts
    const insights = [];
    let scoring = 0;
    for (let i = n - 1; i >= 0 && rows[i].g > 0; i--) scoring++;
    if (scoring >= 2) insights.push({ icon: '🔥', text: `Scored in the last ${scoring} games` });
    let unbeaten = 0;
    for (let i = n - 1; i >= 0 && rows[i].res !== 'L'; i--) unbeaten++;
    if (unbeaten >= 4) insights.push({ icon: '🛡️', text: `Unbeaten in the last ${unbeaten} games` });
    const t = tracked.find((p) => p.k === k)?.s;
    const totals = mode === 'league' && t ? { games: t.gp, goals: t.g, assists: t.a } : { games: n, goals: rows.reduce((s, r) => s + r.g, 0), assists: rows.reduce((s, r) => s + r.a, 0) };
    const STEPS = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
    for (const [key, word] of [['games', 'appearances'], ['goals', 'goals'], ['assists', 'assists']]) {
      const next = STEPS.find((s) => s > totals[key]);
      if (next && next - totals[key] <= Math.max(2, Math.ceil(next * 0.1))) { const d = next - totals[key]; insights.push({ icon: '🏁', text: `${d} ${d === 1 ? { games: 'game', goals: 'goal', assists: 'assist' }[key] : key} off ${next} ${word}` }); }
    }
    const recent = avg(rows.slice(-5).map((r) => r.r).filter((x) => x != null));
    if (recent != null && mine.rating != null && n >= 8 && Math.abs(recent - mine.rating) >= 0.4) insights.push({ icon: recent > mine.rating ? '🚀' : '🧊', text: `Last 5 games: ${recent.toFixed(1)} vs ${mine.rating.toFixed(1)} overall` });
    const best = rows.reduce((b, r) => (r.r != null && r.r > (b?.r ?? 0) ? r : b), null);
    if (best) insights.push({ icon: '⭐', text: `Best game: ${best.r.toFixed(1)}${best.g ? ` with ${best.g} goal${best.g > 1 ? 's' : ''}` : ''}` });

    // red flags
    const flags = [];
    const sPass = sessions.map((s) => { const a = s.reduce((x, r) => x + (r.passAtt ?? 0), 0); return a ? (s.reduce((x, r) => x + (r.pass ?? 0), 0) / a) * 100 : null; });
    if (falling(sPass)) flags.push({ icon: '🚩', text: 'Pass accuracy has dropped 3 sessions running' });
    if (falling(sRating)) flags.push({ icon: '🚩', text: 'Rating has dropped 3 sessions running' });
    if (grp === 'DEF' && by.tklPct?.pctTracked != null && by.tklPct.pctTracked < 20) flags.push({ icon: '🚩', text: `Tackle success (${by.tklPct.text}) is in the bottom 20 % of tracked defenders` });

    // team-play scores (0–100): percentiles, tracked where we have them
    const p = (key) => (by[key] ? by[key].pctTracked ?? by[key].pctSquad : null);
    const mix = (...l) => { const v = l.filter((x) => x != null); return v.length ? Math.round(avg(v)) : null; };
    const team = { attack: mix(p('gpg'), p('shots'), p('apg'), p('conv')), defending: mix(p('tklPct'), p('tkl'), p('conceded')), control: mix(p('passPct'), p('passes')), security: mix(p('passPct'), p('win')) };

    // suggestions
    const suggestions = [];
    if (grpRank.length >= 2 && grpRank[0][0] !== grp && grpRank[0][1] - (avg(byGrp[grp] ?? []) ?? 0) >= 0.3) suggestions.push({ icon: '🔄', text: `Try more games as a ${WORD[grpRank[0][0]]} – you rate ${(grpRank[0][1] - avg(byGrp[grp])).toFixed(1)} higher there` });
    if (partners[0]) suggestions.push({ icon: '🤝', text: `Line up with ${partners[0].n} when you can` });
    if (improve[0]) suggestions.push({ icon: '🎯', text: `Focus for the next sessions: ${lc(improve[0].text.split(':')[0])} up to ${META[improve[0].k].fmt(improve[0].target)}` });

    // narrative
    const intro = `${name} is a ${WORD[grp]} with ${n} ${mode === 'rush' ? 'Rush' : 'League'} games in the log – ${Math.round(mine.win)}% wins${mine.rating != null ? `, ${mine.rating.toFixed(1)} average rating` : ''}.`;
    const strong = strengths.length ? `Biggest strength: ${lc(strengths[0].text)}${strengths[1] ? `, and ${lc(strengths[1].text)}` : ''}.` : 'No stat stands out from the pack yet – more games will sharpen the picture.';
    const pattern = patterns[0] ? `${patterns[0].text}.` : '';
    const next = improve[0] ? `Next step – ${lc(improve[0].text)}.` : 'No clear weak spot against the squad right now.';
    const summary = `${intro} ${strengths[0] ? `${strengths[0].text}.` : ''}`.trim();
    return { k, mode, enough: true, games: n, sessions: sessions.length, grp, metrics, strengths, improve, patterns, insights, flags, team, suggestions, partners: partners.slice(0, 3), summary, narrative: [intro, strong, pattern, next].filter(Boolean) };
  }

  // ---------- UI ----------
  function section(el, { k, full = false, name = '' } = {}) {
    const BASE = document.body.dataset.base || '', MAPI = document.body.dataset.api || '';
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    if (!document.querySelector('link[href$="scout.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/scout.css` }));
    const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    el.innerHTML = `<section class="card sc"><div class="sc-head"><h3>🔎 Scout report <small class="muted">${full ? 'full report' : 'short version'}</small></h3><div class="nx-tabs sc-modes" role="tablist"><button type="button" role="tab" data-key="league" aria-selected="true">🏆 League</button><button type="button" role="tab" data-key="rush" aria-selected="false" tabindex="-1">⚡ Rush</button></div></div><div class="sc-body">${window.UI ? UI.skeleton('rows', 4) : ''}</div></section>`;
    const body = el.querySelector('.sc-body');
    const data = Promise.all([get(`${BASE}api/squad.json`), get(`${BASE}api/players.json`)]);
    let rush = null;
    const bar = (pct) => `<span class="sc-bar" style="--p:${pct}%"><i></i></span><b>${pct}</b>`;
    const list = (items, cls = '') => `<ul class="sc-list ${cls}">${items.map((x) => `<li><span>${x.icon ?? '•'}</span>${esc(x.text)}</li>`).join('')}</ul>`;
    const dial = (label, v) => `<div class="sc-dial" style="--v:${v ?? 0}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.9"/><circle class="v" cx="18" cy="18" r="15.9" pathLength="100"/></svg><b>${v ?? '–'}</b><small>${label}</small></div>`;
    const draw = (R) => {
      if (!R.enough) { body.innerHTML = `<p class="muted">Not enough ${R.mode === 'rush' ? 'logged Rush' : 'League'} games yet – the report starts after ${R.need} (${R.games} so far).</p>`; return; }
      const dials = `<div class="sc-dials">${[['Attack', R.team.attack], ['Defending', R.team.defending], ['Control', R.team.control], ['Ball security', R.team.security]].filter(([, v]) => v != null).map(([l, v]) => dial(l, v)).join('')}</div>`;
      const strengths = R.strengths.length ? list(R.strengths.map((s) => ({ icon: '💪', text: s.text })), 'good') : '<p class="muted small">Nothing stands out from the pack yet.</p>';
      if (!full) { body.innerHTML = `<p class="sc-sum">${esc(R.summary)}</p>${dials}${R.strengths.length ? `<h4>Core strengths</h4>${list(R.strengths.slice(0, 3).map((s) => ({ icon: '💪', text: s.text })), 'good')}` : ''}`; return; }
      const rows = R.metrics.filter((m) => m.pctTracked != null || m.pctSquad != null);
      body.innerHTML = `<div class="sc-story">${R.narrative.map((p) => `<p>${esc(p)}</p>`).join('')}</div>${dials}
<div class="sc-grid"><div><h4>💪 Core strengths</h4>${strengths}</div><div><h4>🎯 Areas to improve</h4>${R.improve.length ? list(R.improve.map((s) => ({ icon: '↗️', text: s.text })), 'warn') : '<p class="muted small">No clear gap against the squad right now.</p>'}</div>
<div><h4>🧠 Patterns</h4>${R.patterns.length ? list(R.patterns) : '<p class="muted small">Patterns show after a few sessions.</p>'}</div><div><h4>💡 Suggestions</h4>${R.suggestions.length ? list(R.suggestions) : '<p class="muted small">Keep playing – suggestions come with more games.</p>'}</div>
<div><h4>✨ Insights</h4>${R.insights.length ? list(R.insights) : '<p class="muted small">No callouts yet.</p>'}</div>${R.flags.length ? `<div><h4>🚩 Red flags</h4>${list(R.flags, 'bad')}</div>` : ''}</div>
${rows.length ? `<h4>📊 Percentiles <small class="muted">${R.mode === 'league' ? 'vs tracked players in the same position group (squad where not tracked)' : 'vs the Rush squad'}</small></h4><table class="sc-pct"><tbody>${rows.map((m) => `<tr class="${m.key ? '' : 'minor'}"><th>${esc(m.label)}</th><td>${esc(m.text)}</td><td>${bar(m.pctTracked ?? m.pctSquad)}</td></tr>`).join('')}</tbody></table>` : ''}
<p class="muted small">Rule-based from the match log – refreshed with every data update. Radar, trend and position map come next.</p>`;
    };
    const show = async (mode) => {
      body.innerHTML = window.UI ? UI.skeleton('rows', 4) : '';
      const [squad, players] = await data;
      const names = Object.fromEntries((players ?? []).map((p) => [p.k, p.n]));
      if (name) names[k] = name;
      if (mode === 'rush') {
        rush = rush ?? (MAPI ? await get(`${MAPI}/api/rush`) : null);
        draw(report(k, fromRush(rush), { names, mode: 'rush' }));
      } else draw(report(k, fromSquad(squad), { tracked: players ?? [], names, mode: 'league' }));
    };
    el.querySelector('.sc-modes').onclick = (e) => {
      const b = e.target.closest('[data-key]');
      if (!b) return;
      el.querySelectorAll('.sc-modes [data-key]').forEach((x) => { x.setAttribute('aria-selected', String(x === b)); x.tabIndex = x === b ? 0 : -1; });
      show(b.dataset.key);
    };
    show('league');
  }

  globalThis.NXScout = { report, fromSquad, fromRush, metricsOf, pctile, section, GROUP };
})();
