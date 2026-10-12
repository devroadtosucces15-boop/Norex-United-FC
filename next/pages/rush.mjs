// D6 Rush page: the club's confirmed Rush results (EA sends no Rush data, so these are the games members logged and managers confirmed).
// The page is a shell; static/rush.js reads the Worker's public GET /api/rush and draws everything, incl. the per-game result graphic.
import { shell } from '../lib/ui.mjs';

export function rush() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">5-a-side · 4 players + AI keeper</div><h2>Rush <span class="gold-t">results</span></h2></div>
   <div class="chips" id="rs-f" role="tablist" aria-label="Filter Rush games"><button type="button" class="chip on" data-f="">All</button><button type="button" class="chip" data-f="W">Wins</button><button type="button" class="chip" data-f="D">Draws</button><button type="button" class="chip" data-f="L">Losses</button></div></header>
   <p class="muted small" style="margin:-4px 0 16px">EA does not publish Rush games. These are logged by members from Match Night and shown here once a manager confirms them.</p>
   <div id="rs-kpi" class="rs-kpi" data-rs-load><div class="panel muted">Loading Rush results…</div></div></section>
  <section class="sec" id="rs-form-sec" hidden><header><div><span class="ribbon">Recent form</span></div></header><div id="rs-form" class="rs-form"></div></section>
  <section class="sec"><header><div><span class="ribbon">Every confirmed game</span></div></header><div id="rs-list" class="rs-list"></div></section>
  <div class="grid g2"><section class="sec"><header><div><span class="ribbon">Top scorers</span></div></header><div id="rs-pl" class="panel flat" style="overflow-x:auto"></div></section>
  <section class="sec"><header><div><span class="ribbon">By opponent</span></div></header><div id="rs-op" class="panel flat" style="overflow-x:auto"></div></section></div></div>`;
  return shell({ group: 'matches', page: 'rush.html', title: 'Rush results', body, extraHead: '<link rel="stylesheet" href="rush.css"><script src="rush.js" defer></script>' });
}

export default function (P) { P('rush.html', rush()); }
