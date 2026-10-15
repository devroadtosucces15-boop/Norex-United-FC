// About page (what the site is and tracks, how it updates, privacy) and the Scout page: a profile for players who are not in our squad.
// Scout reads the public api/players.json in the browser (one page for ~2,400 players instead of one file each); #k=<EA id or gamertag>.
import { shell, esc } from '../lib/ui.mjs';
import { cfg, matches, players, opponents } from '../lib/data.mjs';

const title = cfg.siteTitle ?? 'NOREX UNITED FC';
export function about() {
  const R = cfg.recruitment ?? {};
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">Who we are</div><h2>About <span class="gold-t">${esc(title)}</span></h2></div></header>
<div class="grid g2 ab-grid" data-stagger>
 <div class="panel reveal ab-card"><div class="ab-i">🛡️</div><h3>The club</h3><p>${esc(title)} is an EA SPORTS FC Pro Clubs side competing in the first division. This site is our home: results, squad cards, stats, tactics and the members' hub, all in one place.</p></div>
 <div class="panel reveal ab-card"><div class="ab-i">🤖</div><h3>Nobody types results in</h3><p>The site updates itself about every 10 minutes from EA's public Pro Clubs data. Every match, box score and career stat is read straight from EA, so the numbers are the real ones.</p></div>
 <div class="panel reveal ab-card"><div class="ab-i">📊</div><h3>What it tracks</h3><ul class="ab-ul"><li><b>${matches.length}</b> archived matches</li><li><b>${players.length}</b> squad players with cards</li><li><b>${opponents.length}</b> opponent clubs with records</li><li>Linked clubs our players also play for</li></ul></div>
 <div class="panel reveal ab-card"><div class="ab-i">🔥</div><h3>Burner clubs</h3><p>Casual "B team" clubs members start for fun. They live on their own page and never count in our League totals, records or awards. <a href="burners.html">See the burners</a>.</p></div>
 <div class="panel reveal ab-card"><div class="ab-i">🔒</div><h3>Your name on the site</h3><p>Every player on the site comes from EA's public data. If you would rather not appear, or you play for another club that is not showing yet, ask a manager in Discord or use the requests in <a href="hub.html">your locker</a> and it is sorted on the next update.</p></div>
 <div class="panel reveal ab-card"><div class="ab-i">👑</div><h3>Join us</h3><p>${esc(R.headline ?? 'We are always looking for committed players who want to compete.')}</p><p><a class="btn gold" href="join.html">Apply to join</a></p></div>
</div>
<p class="muted small" style="margin-top:22px">Looking for the old layout? It is still available at <a href="classic/index.html">the classic site</a>.</p></section></div>`;
  return shell({ group: 'club', page: 'about.html', title: 'About', body, extraHead: `<style>.ab-grid{gap:22px}.ab-card h3{margin:6px 0 8px}.ab-card p{margin:0 0 10px;color:var(--soft)}.ab-i{font-size:30px}.ab-ul{margin:0;padding-left:18px;color:var(--soft);display:grid;gap:4px}.ab-ul b{color:#fff}</style>` });
}

export function scout() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px" id="sc-root"><div class="panel" style="text-align:center;padding:40px"><div style="font-size:38px">🔎</div><h3>Looking up player…</h3><p class="muted">Pick a player from <a href="players.html">the directory</a>.</p></div></section></div><script src="scout.js" defer></script>`;
  return shell({ group: 'stats', page: 'scout.html', title: 'Player profile', body, extraHead: `<style>.sc-hero{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:22px}.sc-ovr{font:700 54px Oswald;color:var(--g2)}.sc-hero h2{margin:0}.sc-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}@media(min-width:700px){.sc-st{grid-template-columns:repeat(6,1fr)}}.sc-st div{display:flex;flex-direction:column;align-items:center;padding:12px 2px;border-radius:12px;background:var(--p3);border:1px solid var(--line);font:600 10px Inter;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}.sc-st b{font:600 24px Oswald;color:#fff;letter-spacing:0}.sc-rad{display:grid;gap:8px;margin-top:18px}.sc-rad div{display:grid;grid-template-columns:110px 1fr 40px;gap:10px;align-items:center;font-size:13px;color:var(--soft)}.sc-rad i{display:block;height:8px;border-radius:5px;background:linear-gradient(90deg,#c8352c,#efcf7a)}</style>` });
}
export default function (P) { P('about.html', about()); P('scout.html', scout()); }
