// Club docs hub (roadmap P5.2) and Play Style (P5.1) pages. Called from build.mjs with its page helpers.
//   site/docs.html       announcements, requirements, rules (+ acknowledgement), FAQ and glossary – drawn by web/docs.js
//                        from the Worker (/api/docs). The "numbers on this site" glossary below is static, from our code.
//   site/playstyle.html  League ⇄ Rush Play Style (/api/playstyle), members only.
// Both ship behind feature flags (`docs`, `playStyle`); viewers the flag doesn't unlock see a "coming soon" card.

// Our own metric definitions – keep in step with web/metrics.js, web/mystats.js and sessionsFor() in build.mjs.
const OURS = [
  ['Match rating colours', '9+ elite (gold) · 8+ great · 7+ good · 6+ average · under 6 poor. The Discord bot uses 🟢 8+ 🟡 7+ 🟠 6+ 🔴 under 6.'],
  ['Form index', 'Average of the last 5 match ratings, weighted 5 → 1 so the newest game counts most.'],
  ['Consistency', 'How much a player’s ratings swing (standard deviation), from 3+ games. Lower is steadier.'],
  ['Clutch', 'Goals scored in one-goal games and draws – the goals that decided something.'],
  ['Per 90', 'Any total divided by minutes played (EA’s seconds played) × 90, so subs and starters compare fairly.'],
  ['Shot conversion', 'Goals ÷ shots, as a percentage.'],
  ['Goal involvement', 'Share of the team’s goals a player scored or assisted in the games they played.'],
  ['Streaks', 'Scoring streak = games in a row with a goal. Unbeaten run = games in a row without a defeat.'],
  ['Player of the Month', 'Average rating + 0.6 × (goals + assists per game) + 1.5 × share of games as MOTM. Needs 2 games or a third of the month’s games.'],
  ['Best XI', 'A 1-4-3-3 of the best average ratings by position group for the period.'],
  ['Session grade', 'A play night = matches no more than 3 hours apart. Graded A+ to F: 75 % points per game, 25 % goal difference per game.'],
  ['Team-play scores', 'My stats: Attack, Defending, Control and Ball security out of 100 – where you rank against the squad (percentiles) on the stats behind each.'],
  ['Dribbles & second assists', 'Counted from EA’s match events. Only matches archived since we started keeping them have these numbers.'],
  ['Pro Builder OVR', 'An estimate from the attributes – EA doesn’t publish its formula.'],
];
const EA = [
  ['Skill rating (SR)', 'EA’s club rating. The World top 100 on the Leaderboards page is ranked by it.'],
  ['Division', 'The league division EA currently has the club in.'],
  ['MOTM', 'Man of the match as awarded in-game by EA. The squad’s own vote in the Squad Hub is the “MOTM vote”.'],
  ['League · Playoff · Friendly', 'Match types from EA. Friendlies are shown on their own and never count toward League totals.'],
  ['Rush', 'EA doesn’t share Rush matches, so members log them and a manager confirms each one before it counts.'],
  ['Pass % · Tackle %', 'Completed passes ÷ attempted passes, and tackles won ÷ tackles attempted.'],
];

export function buildDocs({ write, page, pageHead, esc, emptyState, config }) {
  const grid = (rows) => `<div class="gl-grid">${rows.map(([t, d]) => `<div><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join('')}</div>`;
  const scripts = '<link rel="stylesheet" href="assets/docs.css"><script src="assets/docs-md.js" defer></script><script src="assets/docs.js" defer></script>';
  write('docs.html', page({
    title: `Club docs – ${config.siteTitle}`, base: '', active: '',
    description: `${config.siteTitle} announcements, requirements, rules, FAQ and glossary.`,
    body: `${pageHead('📚 Club docs', 'Announcements, requirements, rules and FAQ – everything a NOREX player needs to know, kept up to date by the managers.', '')}
<div data-flag="docs" hidden><div class="dx" data-docs></div>
<div data-docs-glossary hidden><h3 class="gl-h">📊 The numbers on this site</h3>${grid(OURS)}<h3 class="gl-h">🎮 EA terms</h3>${grid(EA)}</div></div>
<div class="dx-soon">${emptyState('📚', 'Club docs are on the way', 'Announcements, rules and the FAQ land here soon.')}</div>
${scripts}`,
  }));
  write('playstyle.html', page({
    title: `Play Style – ${config.siteTitle}`, base: '', active: '',
    description: `How ${config.siteTitle} plays – League and Rush.`,
    body: `${pageHead('🧠 Play Style', 'How NOREX plays – philosophy, formations, every position, set pieces and tactics. League and Rush each have their own.', '')}
<div data-flag="playStyle" hidden><div class="ps" data-playstyle></div></div>
<div class="dx-soon">${emptyState('🧠', 'Play Style is being written', 'The managers are putting our way of playing into words.')}</div>
${scripts}`,
  }));
}
