// Member scout report (roadmap PB.5) – analysis + a rule-based narrative (free, deterministic, explainable).
// Part b adds the visuals (radar vs squad average, rating trend, position-usage pitch, form calendar) and the build check
// (NXScout.buildCheck: the member's League/Rush build vs how they actually play → role match + attribute tweaks linked to the builder).
// Pure engine (also imported by the tests): NXScout.report(k, games, { tracked, names, mode })
//   games   = { playerKey: [row] } with rows { ts, res, g, a, r, motm, grp, pass, passAtt, tkl, tklAtt, shots, saves, ga, dri, match }
//   tracked = players.json – League only: percentiles among every tracked player in the same position group
// → { enough, games, grp, metrics, strengths, improve, patterns, insights, flags, team, suggestions, summary, narrative,
//      radar, trend, usage, days }
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
  const SHORT = { rating: 'Rating', gpg: 'Goals', apg: 'Assists', shots: 'Shots', conv: 'Conversion', passPct: 'Pass %', passes: 'Passes', tklPct: 'Tackle %', tkl: 'Tackles', saves: 'Saves', conceded: 'Conceded' };
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
    // visuals: radar vs squad average (1 = squad level, lower-is-better flipped), rating per session, position usage, days played
    const radar = metrics.filter((m) => m.key && !OUTCOME.includes(m.k) && m.squadAvg > 0).slice(0, 7)
      .map((m) => ({ k: m.k, label: SHORT[m.k] ?? m.label, text: m.text, avg: META[m.k].fmt(m.squadAvg), rel: r2(Math.min(2, m.up ? m.value / m.squadAvg : m.squadAvg / Math.max(m.value, 0.001))) }));
    const tally = (l) => ({ n: l.length, w: l.filter((r) => r.res === 'W').length, d: l.filter((r) => r.res === 'D').length, l: l.filter((r) => r.res === 'L').length, r: ((x) => (x == null ? null : r2(x)))(avg(l.map((r) => r.r).filter((v) => v != null))) });
    const trend = sessions.slice(-20).map((s) => ({ ts: s[0].ts, ...tally(s) }));
    const usage = {}, byPos = {}, byDay = {};
    for (const r of rows) {
      if (r.grp) (usage[r.grp] ??= []).push(r);
      if (r.pos) (byPos[r.pos] ??= []).push(r);
      (byDay[new Date(r.ts * 1000).toISOString().slice(0, 10)] ??= []).push(r);
    }
    const tallied = (o) => Object.fromEntries(Object.entries(o).map(([key, l]) => [key, tally(l)]));
    return { k, mode, enough: true, games: n, sessions: sessions.length, grp, metrics, strengths, improve, patterns, insights, flags, team, suggestions, partners: partners.slice(0, 3), summary, narrative: [intro, strong, pattern, next].filter(Boolean),
      radar: radar.length >= 3 ? radar : [], trend, usage: { groups: tallied(usage), pos: tallied(byPos) }, days: tallied(byDay) };
  }

  // ---------- build check: the member's build (PB.4 pick) vs how they play ----------
  // x = { id, title, code, position, mode }, ev = NXBuildMath.evaluate() of it (rows, fit, arch, face).
  // Attributes that move each stat (only those in the game data are used) + why.
  const TWEAK = {
    passPct: [['Short Passing', 'Vision', 'Composure', 'Ball Control'], 'cleaner passes under pressure'],
    passes: [['Short Passing', 'Vision', 'Reactions'], 'more of the ball in build-up'],
    tklPct: [['Standing Tackle', 'Defensive Awareness', 'Sliding Tackle', 'Reactions'], 'win more of the duels you go into'],
    tkl: [['Defensive Awareness', 'Interceptions', 'Stamina', 'Aggression'], 'get to more duels'],
    conceded: { GK: [['GK Reflexes', 'GK Diving', 'GK Positioning', 'GK Handling'], 'stop more of the shots you face'], _: [['Defensive Awareness', 'Standing Tackle', 'Sprint Speed', 'Strength'], 'recover and close down faster'] },
    conv: [['Finishing', 'Composure', 'Positioning', 'Volleys'], 'turn more shots into goals'],
    shots: [['Positioning', 'Shot Power', 'Long Shots', 'Acceleration'], 'get more shots away'],
    gpg: [['Finishing', 'Positioning', 'Composure'], 'score more'],
    apg: [['Vision', 'Crossing', 'Short Passing', 'Curve'], 'create more for others'],
    saves: [['GK Reflexes', 'GK Diving', 'GK Positioning'], 'make more saves'],
  };
  function buildCheck(R, x, ev, { mode = R?.mode ?? 'league' } = {}) {
    if (!R?.enough || !x || !ev) return null;
    const role = [], tweaks = [];
    const val = (name) => ev.rows.find((r) => r.name === name)?.value;
    const bGrp = GROUP(x.position) ?? ev.arch?.group ?? null;
    const games = Object.values(R.usage?.groups ?? {}).reduce((sm, u) => sm + u.n, 0) || R.games;
    const share = (g) => Math.round(((R.usage?.groups?.[g]?.n ?? 0) / games) * 100);
    const label = `${x.position ? `${x.position} ` : ''}${ev.arch?.name ?? 'build'}`;
    const Mode = mode === 'rush' ? 'Rush' : 'League';
    if (bGrp && bGrp !== R.grp) role.push({ icon: '🧭', text: `Your ${Mode} build is a ${label} (${WORD[bGrp]}), but ${share(R.grp)}% of your ${Mode} games are as a ${WORD[R.grp]} – ${share(bGrp) ? `only ${share(bGrp)}% as a ${WORD[bGrp]}` : `none as a ${WORD[bGrp]}`}` });
    else if (bGrp) role.push({ icon: '✅', text: `Build matches how you play: ${label} for a ${WORD[bGrp]} – ${share(bGrp)}% of your ${Mode} games there` });
    const best = ev.fit?.[0], set = x.position && ev.fit?.find(([pos]) => pos === x.position);
    if (best && set && best[0] !== x.position && best[1] - set[1] >= 3) role.push({ icon: '📍', text: `The build fits ${best[0]} better than ${x.position} (${best[1]} vs ${set[1]} fit)` });
    for (const s of (R.strengths ?? []).slice(0, 2)) {
      const t = TWEAK[s.k] && (Array.isArray(TWEAK[s.k]) ? TWEAK[s.k] : TWEAK[s.k][R.grp] ?? TWEAK[s.k]._);
      const low = t && t[0].map((a) => [a, val(a)]).filter(([, v]) => v != null).sort((p, q) => p[1] - q[1])[0];
      if (low && low[1] < 70) role.push({ icon: '💪', text: `${SHORT[s.k] ?? s.k} is a strength even with ${low[0]} at ${low[1]} in the build – that’s your game, not the numbers` });
    }
    const used = new Set();
    for (const m of R.improve ?? []) {
      const t = TWEAK[m.k] && (Array.isArray(TWEAK[m.k]) ? TWEAK[m.k] : TWEAK[m.k][R.grp] ?? TWEAK[m.k]._);
      if (!t) continue;
      const pick = t[0].map((a) => [a, val(a)]).filter(([a, v]) => v != null && !used.has(a)).sort((p, q) => p[1] - q[1])[0];
      if (!pick) continue;
      used.add(pick[0]);
      const now = R.metrics.find((q) => q.k === m.k)?.text;
      tweaks.push({ attr: pick[0], value: pick[1], k: m.k, icon: '🔧', text: `More ${pick[0]} (${pick[1]} in the build) to ${t[1]} – ${META[m.k].label.toLowerCase()} is ${now} vs ${META[m.k].fmt(m.target)} for the squad` });
    }
    if (R.grp === 'DEF' && (R.improve ?? []).some((m) => m.k === 'tklPct' || m.k === 'conceded') && (val('Sprint Speed') ?? 99) < 70 && !used.has('Sprint Speed')) tweaks.push({ attr: 'Sprint Speed', value: val('Sprint Speed'), icon: '💨', text: `More Sprint Speed (${val('Sprint Speed')} now) – you lose duels on the turn as a ${x.position || 'defender'}` });
    return { role, tweaks: tweaks.slice(0, 4), label };
  }

  // ---------- UI ----------
  // ---------- visuals (SVG, theme tokens, data-tip tooltips from app.js) ----------
  const escH = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const DAYFMT = (ts) => new Date(ts * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  function radarSvg(axes) {
    const C = 120, RAD = 78, n = axes.length;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n, r = RAD * Math.min(1, v / 2); return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
    const poly = (vals) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');
    const rings = [0.5, 1, 1.5, 2].map((v) => `<polygon class="${v === 1 ? 'avg' : 'ring'}" points="${poly(axes.map(() => v))}"/>`).join('');
    const spokes = axes.map((_, i) => { const [x, y] = pt(i, 2); return `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
    const labels = axes.map((a, i) => { const [x, y] = pt(i, 2.36); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${Math.abs(x - C) < 8 ? 'middle' : x > C ? 'start' : 'end'}">${escH(a.label)}</text>`; }).join('');
    const dots = axes.map((a, i) => { const [x, y] = pt(i, a.rel); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" data-tip="${escH(`${a.label}: ${a.text} · squad ${a.avg}`)}"/>`; }).join('');
    return `<svg class="sc-radar" viewBox="-40 0 320 240" role="img" aria-label="Radar: this player vs the squad average">${rings}${spokes}<polygon class="me" points="${poly(axes.map((a) => a.rel))}"/>${dots}${labels}</svg>`;
  }
  function trendSvg(tr, overall) {
    const pts = tr.filter((x) => x.r != null);
    if (pts.length < 2) return '<p class="muted small">The trend shows after two sessions with ratings.</p>';
    const W = 600, H = 170, P = 26;
    const lo = Math.max(0, Math.floor(Math.min(...pts.map((x) => x.r), overall ?? 10) - 0.5)), hi = Math.min(10, Math.ceil(Math.max(...pts.map((x) => x.r), overall ?? 0) + 0.3));
    const X = (i) => P + (i * (W - 2 * P)) / (pts.length - 1), Y = (v) => H - P - ((v - lo) / (hi - lo || 1)) * (H - 2 * P);
    const line = pts.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x.r).toFixed(1)}`).join('');
    const grid = [lo, (lo + hi) / 2, hi].map((v) => `<line class="g" x1="${P}" x2="${W - P}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="${P - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${v.toFixed(1)}</text>`).join('');
    const avgLine = overall != null ? `<line class="avg" x1="${P}" x2="${W - P}" y1="${Y(overall).toFixed(1)}" y2="${Y(overall).toFixed(1)}"/>` : '';
    const dots = pts.map((x, i) => `<circle class="${x.w > x.l ? 'w' : x.l > x.w ? 'l' : 'd'}" cx="${X(i).toFixed(1)}" cy="${Y(x.r).toFixed(1)}" r="5" data-tip="${escH(`${DAYFMT(x.ts)} · ${x.n} game${x.n > 1 ? 's' : ''} · ${x.w}W ${x.d}D ${x.l}L · rating ${x.r.toFixed(1)}`)}"/>`).join('');
    return `<svg class="sc-trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average rating per session"><defs><linearGradient id="scg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--red)" stop-opacity=".35"/><stop offset="1" stop-color="var(--red)" stop-opacity="0"/></linearGradient></defs>${grid}${avgLine}<path class="area" d="${line}L${X(pts.length - 1).toFixed(1)},${H - P}L${P},${H - P}Z"/><path class="ln" d="${line}"/>${dots}</svg>`;
  }
  // Pitch, attacking to the right. League knows only the position group; Rush logs the exact position.
  const ZONE = { GK: [0, 44], DEF: [44, 124], MID: [124, 214], FWD: [214, 300] };
  const SPOT = { GK: [20, 95], CB: [78, 95], LB: [92, 30], RB: [92, 160], LWB: [120, 26], RWB: [120, 164], CDM: [140, 95], CM: [170, 95], LM: [182, 32], RM: [182, 158], CAM: [205, 95], LW: [238, 40], RW: [238, 150], CF: [245, 95], ST: [268, 95] };
  function pitchSvg(u, games) {
    const zones = Object.entries(ZONE).map(([g, [a, b]]) => { const x = u.groups[g]; const sh = x ? x.n / games : 0; return `<rect class="z" x="${a}" y="0" width="${b - a}" height="190" style="--o:${(0.08 + sh * 0.7).toFixed(2)}"${x ? ` data-tip="${escH(`${WORD[g]}: ${x.n} games · ${Math.round(sh * 100)}%${x.r != null ? ` · rating ${x.r.toFixed(1)}` : ''} · ${x.w}W ${x.d}D ${x.l}L`)}"` : ''}/>${x ? `<text class="zt" x="${(a + b) / 2}" y="${Object.keys(u.pos).length ? 182 : 100}" text-anchor="middle">${Math.round(sh * 100)}%</text>` : ''}`; }).join('');
    const lines = '<rect class="pl" x="1" y="1" width="298" height="188" rx="6"/><line class="pl" x1="150" y1="1" x2="150" y2="189"/><circle class="pl" cx="150" cy="95" r="24"/><rect class="pl" x="1" y="50" width="34" height="90"/><rect class="pl" x="265" y="50" width="34" height="90"/>';
    const top = Math.max(1, ...Object.values(u.pos).map((x) => x.n));
    const dots = Object.entries(u.pos).filter(([p]) => SPOT[p]).map(([p, x]) => { const [cx, cy] = SPOT[p]; return `<g class="spot" data-tip="${escH(`${p}: ${x.n} games${x.r != null ? ` · rating ${x.r.toFixed(1)}` : ''} · ${x.w}W ${x.d}D ${x.l}L`)}"><circle cx="${cx}" cy="${cy}" r="${(8 + (x.n / top) * 8).toFixed(1)}"/><text x="${cx}" y="${cy + 4}" text-anchor="middle">${p}</text></g>`; }).join('');
    return `<svg class="sc-pitch" viewBox="0 0 300 190" role="img" aria-label="Where they play">${zones}${lines}${dots}</svg>`;
  }
  // Form calendar: the 12 weeks up to the last game, one square per day (colour = result, stronger = more games).
  function calendarHtml(days) {
    const keys = Object.keys(days).sort();
    if (!keys.length) return '';
    const end = new Date(`${keys.at(-1)}T00:00:00Z`), start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 83);
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7)); // back to Monday – columns are weeks
    const cells = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10), x = days[key];
      const cls = x ? (x.w > x.l ? 'w' : x.l > x.w ? 'l' : 'd') : '';
      cells.push(`<i class="${cls}"${x ? ` style="--a:${Math.min(1, 0.45 + x.n * 0.14).toFixed(2)}" data-tip="${escH(`${new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${x.n} game${x.n > 1 ? 's' : ''} · ${x.w}W ${x.d}D ${x.l}L${x.r != null ? ` · ${x.r.toFixed(1)}` : ''}`)}"` : ''}></i>`);
    }
    const played = keys.filter((kk) => new Date(`${kk}T00:00:00Z`) >= start).length;
    return `<div class="sc-cal" role="img" aria-label="Days played in the last 12 weeks">${cells.join('')}</div><p class="muted small sc-legend"><span><i class="w"></i> won more</span><span><i class="d"></i> level</span><span><i class="l"></i> lost more</span> · ${played} match days up to ${new Date(`${keys.at(-1)}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>`;
  }
  function visualsHtml(R) {
    const games = Object.values(R.usage.groups).reduce((sm, u) => sm + u.n, 0);
    const rating = R.metrics.find((m) => m.k === 'rating')?.value ?? null;
    return `<div class="sc-vis">
${R.radar.length ? `<figure><h4>🕸️ Radar <small class="muted">vs ${R.mode === 'rush' ? 'Rush squad' : 'squad'} average (gold ring)</small></h4>${radarSvg(R.radar)}</figure>` : ''}
${games ? `<figure><h4>📍 Where they play <small class="muted">${Object.keys(R.usage.pos).length ? 'by position' : 'by position group (EA gives no exact position)'}</small></h4>${pitchSvg(R.usage, games)}</figure>` : ''}
<figure><h4>📈 Rating trend <small class="muted">per session · dashed = overall ${rating != null ? rating.toFixed(2) : ''}</small></h4>${trendSvg(R.trend, rating)}</figure>
<figure><h4>🗓️ Form calendar <small class="muted">last 12 weeks</small></h4>${calendarHtml(R.days)}</figure>
</div>`;
  }

  function section(el, { k, full = false, name = '', builds = null, mine = false } = {}) {
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
${visualsHtml(R)}
${builds ? '<div class="sc-build" data-sc-build></div>' : ''}
<p class="muted small">Rule-based from the match log – refreshed with every data update.</p>`;
      if (builds) paintBuild(el.querySelector('[data-sc-build]'), R);
    };
    // 🧬 Build check – the member's League/Rush build (PB.4) vs how they play; tweaks open the builder on that attribute.
    const loadCard = () => (window.NXBuildCard ? Promise.resolve() : new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: `${BASE}assets/buildcard.js`, onload: ok, onerror: no }))));
    async function paintBuild(box, R) {
      const x = builds[R.mode], Mode = R.mode === 'rush' ? 'Rush' : 'League';
      if (!x) { box.innerHTML = `<h4>🧬 Build check</h4><p class="muted small">No ${Mode} build picked yet${mine ? ` – open one in the <a href="${BASE}builder.html">Pro Builder</a> and press ⭐ Use as my build to get build tweaks here` : ''}.</p>`; return; }
      box.innerHTML = `<h4>🧬 Build check</h4>${window.UI ? UI.skeleton('rows', 2) : ''}`;
      try {
        await loadCard();
        const g = await NXBuildCard.ready();
        const info = NXBuildCard.info(g, x);
        const C = info && buildCheck(R, x, info.ev, { mode: R.mode });
        if (!C) { box.innerHTML = `<h4>🧬 Build check</h4><p class="muted small">Couldn’t read the ${Mode} build with the current game data.</p>`; return; }
        const href = (attr) => `${BASE}builder.html?${mine && x.id ? `build=${encodeURIComponent(x.id)}&` : ''}focus=${encodeURIComponent(attr)}${mine && x.id ? '' : `#${x.code}`}`;
        box.innerHTML = `<h4>🧬 Build check <small class="muted">${Mode} build “${esc(x.title)}” · ${esc(C.label)}${info.current ? '' : ' · ⚠ older game rules'}</small></h4>
<div class="sc-grid"><div>${list(C.role)}</div><div>${C.tweaks.length ? `<ul class="sc-list sc-tweaks">${C.tweaks.map((t) => `<li><span>${t.icon}</span><span>${esc(t.text)} <a class="sc-go" href="${esc(href(t.attr))}">Open in builder →</a></span></li>`).join('')}</ul>` : '<p class="muted small">👍 No build change needed for the gaps we see – keep sharpening the signature attributes.</p>'}</div></div>`;
      } catch { box.innerHTML = '<h4>🧬 Build check</h4><p class="muted small">Couldn’t load the game data for the build.</p>'; }
    }
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

  globalThis.NXScout = { report, fromSquad, fromRush, metricsOf, pctile, section, buildCheck, visualsHtml, GROUP };
})();
