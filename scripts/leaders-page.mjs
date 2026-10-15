// Leaderboards (roadmap P4.5), hall of fame (P4.6) and the advanced-metrics block of the stats page (P1.2).
// Called from build.mjs with its page helpers. The numbers come from web/metrics.js – the same engine the
// browser uses for the Rush tabs – fed with archived League/playoff matches.
//   site/leaders.html     monthly + season leaderboards, Player of the Month, Best XI, advanced table; squad boards (flag `leaders`)
//   site/halloffame.html  award winners by month, club records, legends + moments (flag `hallOfFame`), club history timeline
import '../web/metrics.js';

const M = globalThis.NXMetrics;
const num = (v) => Number(v) || 0;

// Archived NOREX matches → the metrics engine's shape (hidden players left out).
export function leagueMatches({ homeMatches, homeId, isHidden, oppOf, result }) {
  return homeMatches.map((m) => {
    const opp = oppOf(m, homeId);
    return {
      id: m.matchId, ts: m.timestamp, opp, gf: num(m.clubs[homeId].goals), ga: num(m.clubs[opp]?.goals), res: result(m.clubs[homeId]),
      players: Object.entries(m.players?.[homeId] || {}).filter(([pid]) => !isHidden(pid)).map(([pid, p]) => ({
        k: pid, n: p.playername, g: num(p.goals), a: num(p.assists), r: num(p.rating), motm: num(p.mom) > 0, shots: num(p.shots), secs: num(p.secondsPlayed), grp: M.groupOf(p.pos),
        // P1.8 – dribbles / second assists, only in games archived since they're kept (else left out → "–").
        ...(p.dribbles !== undefined ? { dr: num(p.dribbles), sa: num(p.secondassists) } : {}),
      })),
    };
  });
}

const ctxFor = (h, base, id) => ({ esc: h.esc, id, link: (p) => h.pLink(p.k, base, p.n), empty: h.emptyState('📭', 'Nothing to rank yet', 'Fills in as matches are archived.'),
  note: h.evSince ? `Dribbles and 2nd assists only count games archived since ${h.esc(h.evSince)}.` : '' });
const METRICS_JS = (base) => `<link rel="stylesheet" href="${base}assets/honours.css"><script src="${base}assets/metrics.js" defer></script>`;
const HONOURS = (base) => `<script src="${base}assets/honours.js" defer></script>`;

// P1.2 – stats page block (League from the archive, Rush drawn by app.js with the same engine).
export function advancedSection(h, lm) {
  return h.section('Advanced metrics', h.modes(M.advancedHtml(ctxFor(h, '', 'adv'), lm), 'advanced', 'League & playoffs from the archive · Rush logged by members'),
    { sub: 'form, consistency, clutch, per-90', id: 'advanced' }) + METRICS_JS('');
}

// P4.5 – leaderboards page.
export function buildLeaders(h, lm) {
  const { write, page, pageHead, section, modes, config, MEMBER_API } = h;
  const body = `${pageHead('🏆 Leaderboards', 'Monthly and season tables for goals, assists, rating and MOTM – with the Player of the Month and a Best XI for every month, plus where we stand in the world. League numbers come from archived EA matches; Rush from results logged by members.', '')}
<div data-nx-insight="leaders.goals" hidden></div><div data-nx-insight="leaders.rating" hidden></div>
${modes(section('Month by month', M.leadersHtml(ctxFor(h, '', 'lg'), lm, { seasonLabel: 'Season' }), { sub: `${lm.length} archived games`, id: 'months' }), 'months', 'Pick a month, or the whole season')}
${section('🌍 World top 100', h.world, { sub: 'EA all-time skill rating · updated daily', id: 'world' })}
${MEMBER_API ? `<div data-flag="leaders" hidden>${section('Squad boards', '<div data-leaders-members></div>', { sub: 'attendance, MOTM votes, awards, predictions – members only', id: 'squad-boards' })}</div>` : ''}
<p class="muted small">🏛️ Past winners, records and club legends live in the <a href="halloffame.html">Hall of Fame</a>.</p>
${METRICS_JS('')}${MEMBER_API ? HONOURS('') : ''}`;
  write('leaders.html', page({ title: `Leaderboards – ${config.siteTitle}`, base: '', active: 'leaders', body,
    description: `${config.siteTitle} monthly and season leaderboards: goals, assists, ratings, MOTM, Player of the Month and Best XI.` }));
}

// P4.6 – hall of fame page.
export function buildHallOfFame(h, lm, { recs }) {
  const { write, page, pageHead, section, esc, config, MEMBER_API, clubName, brand, leaderboard, emptyState, STARS } = h;
  const ctx = ctxFor(h, '', 'hof');
  const thisMonth = new Date().toISOString().slice(0, 7);
  // Award winners per finished month (the current month shows as "in progress").
  const months = M.periods(lm);
  const award = (per) => {
    const rows = M.table(per.matches);
    const need = M.minApps(per.matches);
    const top = (f) => rows.filter((p) => f(p) > 0).sort((a, b) => f(b) - f(a))[0];
    const boot = top((p) => p.g), maker = top((p) => p.a), star = top((p) => (p.apps >= need ? p.r : 0));
    const potm = M.potm(rows, need);
    const live = per.key === thisMonth;
    const line = (icon, label, p, v) => (p ? `<li><span>${icon} ${label}</span>${ctx.link(p)} <small class="muted">${v}</small></li>` : '');
    return `<article class="hof-month${live ? ' live' : ''}"><header><b>${esc(per.label)}</b>${live ? '<span class="tag ok">in progress</span>' : ''}<small class="muted">${per.matches.length} games</small></header>
${potm ? `<div class="hof-potm"><span aria-hidden="true">🏆</span><div><small>Player of the Month</small><b>${ctx.link(potm)}</b></div></div>` : ''}
<ul class="hof-awards">${line('👟', 'Golden Boot', boot, `${boot?.g} goals`)}${line('🎯', 'Playmaker', maker, `${maker?.a} assists`)}${line('🌟', 'Top rated', star, star ? star.r.toFixed(1) : '')}</ul></article>`;
  };
  // Club history timeline from the archive (+ moments managers add, merged in by web/honours.js).
  const asc = [...lm].sort((a, b) => a.ts - b.ts);
  const day = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);
  const nice = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const score = (m) => `${m.gf}–${m.ga} vs ${esc(clubName(m.opp))}`;
  const ev = [];
  if (asc[0]) ev.push({ d: day(asc[0].ts), icon: '📼', title: 'Archive starts', text: `First match saved by the site: ${score(asc[0])}`, href: `matches/${asc[0].id}.html` });
  let wins = 0;
  for (const m of asc) {
    if (m.res === 'W' && [1, 10, 25, 50, 100, 250, 500].includes(++wins)) ev.push({ d: day(m.ts), icon: wins === 1 ? '✅' : '🎖️', title: wins === 1 ? 'First recorded win' : `${wins}th recorded win`, text: score(m), href: `matches/${m.id}.html` });
    for (const p of m.players) if (p.g >= 3) ev.push({ d: day(m.ts), icon: '🎩', title: `Hat-trick – ${esc(p.n)}`, text: `${p.g} goals, ${score(m)}`, href: `matches/${m.id}.html` });
  }
  const big = [...asc].sort((a, b) => b.gf - b.ga - (a.gf - a.ga))[0];
  if (big && big.gf > big.ga) ev.push({ d: day(big.ts), icon: '💥', title: 'Biggest win on record', text: score(big), href: `matches/${big.id}.html` });
  ev.sort((a, b) => b.d.localeCompare(a.d));
  const founded = brand.founded ? `<li class="hof-ev founded" data-date="${esc(brand.founded)}-01-01"><time>${esc(brand.founded)}</time><span class="hof-ic">👑</span><div><b>${esc(config.siteTitle)} founded</b><p>${brand.motto ? `<i>${esc(brand.motto)}</i>` : ''}</p></div></li>` : '';
  const lb = leaderboard ?? {};
  const body = `<section class="hero hof-hero reveal"><div class="hero-crest"><img class="crest big-crest" src="assets/crest.png" alt=""></div><div class="hero-text">
<p class="kicker">Hall of Fame</p><h1>Legends of the crest</h1>${STARS}
<p class="motto">Award winners, records and the moments that made ${esc(config.siteTitle)}.</p>
<div class="chips">${lb.currentDivision ? `<span class="chip strong">Division ${esc(lb.currentDivision)}</span>` : ''}${lb.bestDivision ? `<span class="chip">Best: Division ${esc(lb.bestDivision)}</span>` : ''}<span class="chip">${lm.length} archived games</span>${brand.founded ? `<span class="chip">Est. ${esc(brand.founded)}</span>` : ''}</div></div></section>
${MEMBER_API ? `<div data-flag="hallOfFame" hidden>${section('Club legends', '<div data-hof-legends></div>', { sub: 'inducted by the managers', id: 'legends' })}</div>` : ''}
${section('Award winners', months.length ? `<div class="hof-months">${months.map(award).join('')}</div>` : emptyState('🏆', 'No winners yet', 'Every month crowns a Player of the Month, a Golden Boot and a Playmaker.'), { sub: 'every month from the archive', id: 'awards' })}
${recs.length ? section('Club records', `<div class="records">${recs.join('')}</div><div data-nx-insight="club.records" hidden></div>`, { sub: 'from the archive', id: 'records' }) : ''}
${section('Club history', `<ol class="hof-timeline" data-hof-timeline>${ev.map((e) => `<li class="hof-ev" data-date="${e.d}"><time datetime="${e.d}">${nice(e.d)}</time><span class="hof-ic">${e.icon}</span><div><b>${e.href ? `<a href="${e.href}">${e.title}</a>` : e.title}</b><p>${e.text}</p></div></li>`).join('')}${founded}</ol>`, { sub: 'milestones from the archive', id: 'history' })}
<p class="muted small">Monthly tables and the Best XI are on the <a href="leaders.html">Leaderboards</a> page.</p>
${METRICS_JS('')}${MEMBER_API ? HONOURS('') : ''}`;
  write('halloffame.html', page({ title: `Hall of Fame – ${config.siteTitle}`, base: '', active: 'fame', body,
    description: `${config.siteTitle} Hall of Fame: Players of the Month, Golden Boots, club records, legends and history.` }));
}
