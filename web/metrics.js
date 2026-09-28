// Advanced metrics + period leaderboards (roadmap P1.2 / P4.5). One engine for League and Rush:
// build.mjs imports it in Node (League, from archived EA matches) and the browser uses it for Rush (from /api/rush).
// Input: matches as { id, ts, gf, ga, res, players: [{ k, n, g, a, r, motm, shots?, secs?, grp? }] } – our players only.
// Output: plain objects + HTML strings (no DOM), so the same markup comes out of both places.
(function (root) {
  const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthOf = (ts) => new Date(ts * 1000).toISOString().slice(0, 7);
  const monthName = (ym) => `${MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
  // Position group from EA's app position ('midfielder') or a Rush position code ('CDM').
  const GROUPS = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD', attacker: 'FWD', GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'FWD', RW: 'FWD', CF: 'FWD', ST: 'FWD' };
  const groupOf = (pos) => GROUPS[pos] ?? GROUPS[String(pos || '').toLowerCase()] ?? GROUPS[String(pos || '').toUpperCase()] ?? '';

  // Per-player table over the given matches (newest first or any order – sorted here).
  function table(matches) {
    const ms = [...matches].sort((a, b) => a.ts - b.ts);
    const P = new Map();
    for (const m of ms) for (const p of m.players) {
      if (!p.k) continue;
      const e = P.get(p.k) ?? { k: p.k, n: p.n, apps: 0, W: 0, D: 0, L: 0, g: 0, a: 0, motm: 0, shots: 0, secs: 0, rs: [], teamGoals: 0, clutch: 0, grps: {}, log: [] };
      e.apps++; e[m.res]++; e.g += p.g; e.a += p.a; e.motm += p.motm ? 1 : 0; e.shots += p.shots || 0; e.secs += p.secs || 0; e.n = p.n;
      if (p.r) e.rs.push(p.r);
      e.teamGoals += m.gf;
      if (Math.abs(m.gf - m.ga) <= 1) e.clutch += p.g; // goals in games decided by one goal or drawn
      const grp = p.grp || groupOf(p.pos);
      if (grp) e.grps[grp] = (e.grps[grp] || 0) + 1;
      e.log.push({ g: p.g, res: m.res, r: p.r });
      P.set(p.k, e);
    }
    return [...P.values()].map((e) => {
      const r = avg(e.rs);
      const mins = e.secs / 60;
      // Form index: last 5 ratings, newest weighted 5×, oldest 1×.
      const last = e.rs.slice(-5);
      const form = last.length ? last.reduce((s, x, i) => s + x * (i + 1), 0) / last.reduce((s, _, i) => s + i + 1, 0) : 0;
      const sd = e.rs.length >= 3 ? Math.sqrt(avg(e.rs.map((x) => (x - r) ** 2))) : null;
      let cur = 0, best = 0, unb = 0;
      for (const x of e.log) { cur = x.g > 0 ? cur + 1 : 0; best = Math.max(best, cur); }
      for (const x of [...e.log].reverse()) { if (x.res === 'L') break; unb++; }
      const grp = Object.entries(e.grps).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      return {
        k: e.k, n: e.n, apps: e.apps, W: e.W, D: e.D, L: e.L, g: e.g, a: e.a, ga: e.g + e.a, motm: e.motm, shots: e.shots, grp,
        r: r1(r), form: r1(form), sd: sd == null ? null : r2(sd), mins: Math.round(mins),
        g90: mins >= 90 ? r2((e.g / mins) * 90) : null, ga90: mins >= 90 ? r2(((e.g + e.a) / mins) * 90) : null,
        gpg: r2(e.g / e.apps), gapg: r2((e.g + e.a) / e.apps),
        conv: e.shots ? pct(e.g, e.shots) : null, inv: e.teamGoals ? pct(e.g + e.a, e.teamGoals) : null, clutch: e.clutch,
        streak: cur, bestStreak: best, unbeaten: unb, win: pct(e.W, e.apps),
      };
    });
  }

  // Enough games to count for averages in a period: 2, or a third of the period's matches.
  const minApps = (matches) => Math.max(2, Math.ceil(matches.length / 3));
  // Player of the month / season: rating + attacking output + MOTM share, only for regulars.
  const potmScore = (p) => p.r + 0.6 * p.gapg + 1.5 * (p.motm / p.apps);
  function potm(rows, need) {
    return rows.filter((p) => p.apps >= need && p.r).sort((a, b) => potmScore(b) - potmScore(a))[0] ?? null;
  }
  // Best XI (1-4-3-3) by average rating from regulars; a short group is simply left short.
  const XI = [['FWD', 3], ['MID', 3], ['DEF', 4], ['GK', 1]];
  function bestXI(rows, need) {
    const pool = rows.filter((p) => p.apps >= need && p.r && p.grp).sort((a, b) => b.r - a.r);
    return XI.map(([grp, n]) => [grp, pool.filter((p) => p.grp === grp).slice(0, n)]);
  }
  function periods(matches) {
    const by = new Map();
    for (const m of matches) { const k = monthOf(m.ts); if (!by.has(k)) by.set(k, []); by.get(k).push(m); }
    return [...by].sort((a, b) => b[0].localeCompare(a[0])).map(([k, ms]) => ({ key: k, label: monthName(k), matches: ms }));
  }

  // ---------- HTML ----------
  // ctx: { esc, link(p) → html for a player, id: unique prefix, note: small text under tables }
  const BOARDS = [
    ['goals', '⚽ Goals', (p) => p.g], ['assists', '🎯 Assists', (p) => p.a], ['ga', '🔥 G+A', (p) => p.ga],
    ['rating', '🌟 Avg rating', (p, need) => (p.apps >= need ? p.r : 0), (v) => v.toFixed(1)], ['motm', '🏅 MOTM', (p) => p.motm],
    ['apps', '📋 Appearances', (p) => p.apps], ['form', '📈 Form index', (p, need) => (p.apps >= need ? p.form : 0), (v) => v.toFixed(1)],
    ['ga90', '⏱️ G+A per 90', (p, need) => (p.apps >= need ? p.ga90 ?? p.gapg : 0), (v) => v.toFixed(2)],
  ];
  const bars = (ctx, rows, f, fmt = (v) => v) => {
    const list = rows.map((p) => ({ p, v: f(p) || 0 })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
    const max = Math.max(0.0001, ...list.map((x) => x.v));
    return `<ol class="barlist">${list.map(({ p, v }, i) => `<li style="--w:${Math.max(4, (v / max) * 100)}%"><span class="bl-rank">${i + 1}</span><span class="bl-name">${ctx.link(p)}</span><b>${fmt(v)}</b></li>`).join('') || '<li class="muted bl-empty">Nobody yet</li>'}</ol>`;
  };
  const rClass = (r) => (r >= 9 ? 'r-elite' : r >= 8 ? 'r-great' : r >= 7 ? 'r-good' : r >= 6 ? 'r-mid' : 'r-low');
  const rp = (r) => `<span class="rp ${r ? rClass(r) : ''}">${r ? r.toFixed(1) : '–'}</span>`;
  const dash = (v, suf = '') => (v == null ? '<span class="muted">–</span>' : v + suf);
  const cell = (v, sort, cls = 'n') => `<td class="${cls}" data-v="${sort ?? (v == null ? -1 : v)}">${v}</td>`;

  function spotlight(ctx, p, title, sub) {
    if (!p) return '';
    return `<div class="mx-spot"><span class="mx-spot-trophy" aria-hidden="true">🏆</span><div><small>${title}</small><b>${ctx.link(p)}</b>
<span>${p.apps} apps · ${p.g} G · ${p.a} A · ${rp(p.r)}${p.motm ? ` · ${p.motm}× MOTM` : ''}</span>${sub ? `<em>${sub}</em>` : ''}</div></div>`;
  }
  function xiHtml(ctx, xi) {
    const any = xi.some(([, ps]) => ps.length);
    if (!any) return '';
    return `<div class="mx-pitch" aria-label="Best XI">${xi.map(([grp, ps]) => `<div class="mx-line" data-grp="${grp}">${ps.map((p) => `<div class="mx-dot"><span class="rp ${rClass(p.r)}">${p.r.toFixed(1)}</span><b>${ctx.link(p)}</b><small>${grp}</small></div>`).join('') || `<div class="mx-dot empty"><small>${grp}</small><b>–</b></div>`}</div>`).join('')}</div>`;
  }
  function advTable(ctx, rows, need, { minutes = true } = {}) {
    const head = [['Player', ''], ['Apps', 'Games played'], ['G+A', 'Goals + assists'], [minutes ? 'G+A/90' : 'G+A/gm', minutes ? 'Goals + assists per 90 minutes' : 'Goals + assists per game'],
      ['Conv %', 'Goals per shot'], ['Inv %', 'Share of the team’s goals they scored or set up'], ['Form', 'Last 5 ratings, newest counts most'], ['Consist.', 'Rating spread (std-dev) – lower is steadier'],
      ['Clutch', 'Goals in games decided by one goal or drawn'], ['Streak', 'Current scoring streak (best)'], ['Unbeaten', 'Current run of apps without a defeat']];
    const sorted = [...rows].sort((a, b) => b.ga - a.ga || b.r - a.r);
    return `<div class="tbl"><table class="mx-table"><thead><tr>${head.map(([h, tip], i) => `<th${i ? ' class="n"' : ''}${tip ? ` title="${tip}"` : ''}>${h}</th>`).join('')}</tr></thead><tbody>${sorted.map((p) => `<tr${p.apps < need ? ' class="mx-few"' : ''}>
<td data-v="${ctx.esc(p.n.toLowerCase())}">${ctx.link(p)}</td>${cell(p.apps)}${cell(p.ga)}${cell(dash(minutes ? p.ga90 : p.gapg), minutes ? p.ga90 : p.gapg)}${cell(dash(p.conv, '%'), p.conv)}${cell(dash(p.inv, '%'), p.inv)}
${cell(p.apps >= need ? rp(p.form) : dash(null), p.apps >= need ? p.form : -1)}${cell(p.sd == null ? dash(null) : `±${p.sd.toFixed(2)}`, p.sd == null ? 99 : p.sd)}${cell(p.clutch)}${cell(`${p.streak}${p.bestStreak > p.streak ? ` <small class="muted">(${p.bestStreak})</small>` : ''}`, p.streak)}${cell(p.unbeaten)}</tr>`).join('')}</tbody></table></div>
<p class="small muted">Click a column to sort. Averages (form, consistency, per-90) need ${need}+ games; faded rows have fewer.${ctx.note ? ' ' + ctx.note : ''}</p>`;
  }
  const tabs = (items, active, cls) => `<div class="nx-tabs ${cls}" role="tablist">${items.map(([k, l, n]) => `<button type="button" role="tab" data-key="${k}" aria-selected="${k === active}" tabindex="${k === active ? 0 : -1}">${l}${n != null ? `<em>${n}</em>` : ''}</button>`).join('')}</div>`;

  // Full leaderboards: one tab per month (newest first) + the whole season.
  function leadersHtml(ctx, matches, { minutes = true, seasonLabel = 'Season' } = {}) {
    if (!matches.length) return ctx.empty;
    const ps = [...periods(matches), { key: 'season', label: seasonLabel, matches }];
    const panel = (per, i) => {
      const rows = table(per.matches);
      const need = minApps(per.matches);
      const R = { W: per.matches.filter((m) => m.res === 'W').length, gf: per.matches.reduce((s, m) => s + m.gf, 0) };
      const best = potm(rows, need);
      const season = per.key === 'season';
      return `<div class="mx-panel" data-p="${per.key}"${i ? ' hidden' : ''}>
<div class="mx-head">${spotlight(ctx, best, season ? 'Player of the season' : `Player of the month · ${per.label}`, `${per.matches.length} games · ${R.W} wins · ${R.gf} goals`)}</div>
<div class="mx-boards">${BOARDS.map(([k, title, f, fmt]) => `<div class="card mx-board"><h3>${title}</h3>${bars(ctx, rows, (p) => f(p, need), fmt)}</div>`).join('')}</div>
${xiHtml(ctx, bestXI(rows, need)) ? `<div class="card mx-xi"><h3>⭐ Best XI ${season ? 'of the season' : 'of the month'} <small class="muted">1-4-3-3 by average rating, ${need}+ games</small></h3>${xiHtml(ctx, bestXI(rows, need))}</div>` : ''}
<details class="card mx-adv"><summary><b>🧪 Advanced table</b> <small class="muted">per-90, conversion, involvement, form, consistency, clutch, streaks</small></summary>${advTable(ctx, rows, need, { minutes })}</details></div>`;
    };
    return `${tabs(ps.map((p) => [p.key, p.key === 'season' ? `🏆 ${p.label}` : p.label, p.matches.length]), ps[0].key, `mx-periods ${ctx.id}`)}${ps.map(panel).join('')}`;
  }

  // Advanced metrics block for the stats page: whole period, table + form / consistency / streak cards.
  function advancedHtml(ctx, matches, { minutes = true } = {}) {
    if (!matches.length) return ctx.empty;
    const rows = table(matches);
    const need = minApps(matches);
    const reg = rows.filter((p) => p.apps >= need);
    const card = (title, list, fmt, sub) => `<div class="card mx-board"><h3>${title}</h3>${bars(ctx, list, (p) => p.__v, fmt)}<p class="small muted">${sub}</p></div>`;
    const withV = (list, f) => list.map((p) => ({ ...p, __v: f(p) }));
    return `<div class="mx-boards">
${card('📈 In form', withV(reg, (p) => p.form), (v) => v.toFixed(1), 'Last 5 ratings, newest counts most')}
${card('🧱 Most consistent', withV(reg.filter((p) => p.sd != null), (p) => r2(10 - p.sd)), (v) => '±' + r2(10 - v).toFixed(2), 'Smallest spread of match ratings')}
${card('🎯 Clutch goals', withV(rows, (p) => p.clutch), (v) => v, 'Goals in one-goal games and draws')}
${card('🔥 On a scoring streak', withV(rows, (p) => p.streak), (v) => `${v} gm`, 'Games in a row with a goal, right now')}
${card('🧮 Goal involvement', withV(reg, (p) => p.inv), (v) => v + '%', 'Share of team goals scored or assisted')}
${card('🥅 Shot conversion', withV(reg.filter((p) => p.shots >= 3), (p) => p.conv), (v) => v + '%', 'Goals per shot, 3+ shots')}
</div>
<details class="card mx-adv"><summary><b>🧪 Full table</b> <small class="muted">${rows.length} players · ${matches.length} games</small></summary>${advTable(ctx, rows, need, { minutes })}</details>`;
  }

  // Browser wiring: period tabs + sortable advanced tables inside `el` (idempotent).
  function wire(el) {
    for (const t of el.querySelectorAll('.mx-periods:not([data-wired])')) {
      t.dataset.wired = '1';
      const scope = t.parentElement;
      const show = (k) => scope.querySelectorAll(':scope > .mx-panel').forEach((p) => { p.hidden = p.dataset.p !== k; if (!p.hidden) p.querySelectorAll('.barlist').forEach((b) => b.classList.add('in')); });
      if (root.UI) root.UI.tabs(t, show);
      scope.querySelectorAll(':scope > .mx-panel:not([hidden]) .barlist').forEach((b) => b.classList.add('in'));
    }
    for (const table of el.querySelectorAll('table.mx-table:not([data-wired])')) {
      table.dataset.wired = '1';
      table.querySelectorAll('th').forEach((th, col) => th.addEventListener('click', () => {
        const asc = th.getAttribute('aria-sort') === 'descending';
        table.querySelectorAll('th').forEach((h) => h.removeAttribute('aria-sort'));
        th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
        const val = (tr) => { const v = tr.children[col].dataset.v; const n = parseFloat(v); return isNaN(n) ? v : n; };
        [...table.tBodies[0].rows].sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); }).forEach((r) => table.tBodies[0].appendChild(r));
      }));
    }
  }

  const api = { table, periods, potm, potmScore, bestXI, minApps, monthOf, monthName, groupOf, leadersHtml, advancedHtml, spotlight, xiHtml, wire };
  root.NXMetrics = api;
  if (root.document) {
    const go = () => wire(root.document);
    // Deferred scripts run before DOMContentLoaded – wait for it so ui.js (loaded after this file) exists.
    if (root.document.readyState === 'complete') go(); else root.document.addEventListener('DOMContentLoaded', go);
  }
})(typeof window !== 'undefined' ? window : globalThis);
