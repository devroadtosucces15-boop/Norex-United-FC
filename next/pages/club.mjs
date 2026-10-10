import { cfg, clubStats as C, players, matches, recent, records, leaders, shapes, updates, fmtDate } from '../lib/data.mjs';
import * as W from '../lib/widgets.mjs';
import { shell, esc, slug, card, hero, chip, row, sbt, pillRes, sample, lineLabel } from '../lib/ui.mjs';

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const top = (arr, k) => [...arr].sort((a, b) => b[k] - a[k])[0];
const L = { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards' };
const lineOfPlayer = (p) => p.line; // card line (favourite position from EA)

// ---------- HOME ----------
export function home() {
  const last = recent[0], form = recent.slice(0, 5).reverse();
  const sc = top(players, 'goals'), rt = leaders.rating[0], as = top(players, 'assists');
  const scorers = last ? last.lines.filter((l) => l.goals).map((l) => `${esc(l.n)}${l.goals > 1 ? ` ×${l.goals}` : ''}`).join(', ') : '';
  const body = `
<div class="wrap">
 <section class="hero">
  <div>
   <div class="eyebrow reveal">EA SPORTS FC 27 · DIVISION ${C.div || 1} · LEAGUE &amp; RUSH</div>
   <h1 class="reveal" style="--i:1">One club.<br><em>One crown.</em></h1>
   <p class="lead reveal" style="--i:2">${esc(C.name)} is always looking for committed players who want to compete. Every card, every match and every number below is the club's own record.</p>
   <div class="ticker reveal" style="--i:3" aria-label="Last five results, oldest first">${form.map((m) => `<i class="${m.res}" title="${esc(m.opp)} ${m.gf}-${m.ga}">${m.res}</i>`).join('')}<span class="muted small" style="align-self:center;margin-left:6px">last ${form.length} · ${C.streak} win streak</span></div>
   <div class="chips reveal" style="--i:4"><a class="btn" href="join.html">Apply for a trial</a><a class="btn ghost" href="results.html">Results</a><a class="btn ghost" href="tactics.html">Our tactics</a></div>
  </div>
  <div class="stage" aria-hidden="true">
   <div class="crestwrap tilt" data-tilt="8"><span class="halo"></span><img src="crest.png" alt=""></div>
   <div class="cardwrap" style="position:absolute;left:-2%;bottom:2%;transform:rotate(-8deg)" data-par="-.04">${card(sc, { s: .62, link: false })}</div>
   <div class="cardwrap" style="position:absolute;right:-2%;top:2%;transform:rotate(7deg)" data-par=".05">${card(rt, { s: .62, link: false, dark: true })}</div>
  </div>
 </section>

 <section class="sec" style="margin-top:8px"><header><div><span class="ribbon">Club at a glance</span></div><a class="btn ghost" href="stats.html">Full stats</a></header>${W.kpi()}
  <div class="grid g2" style="margin-top:18px"><div class="panel reveal"><h3>Form · last ${recent.length} games</h3>${W.formWave()}</div><div class="panel reveal" style="--i:1"><h3>Season reel</h3><p class="muted small">Drag along the line. Tap a game to open it.</p>${W.timeline()}</div></div></section>

 <section class="sec"><header><div><span class="ribbon">Match reel</span></div><p>Tap a night to jump to it. Drag the reel.</p></header>${W.reel()}</section>

 <section class="sec"><header><div><span class="ribbon">Top performers</span></div><a class="btn ghost" href="leaders.html">All leaders</a></header>
  <div class="cards c" data-stagger>
   <div class="cardwrap">${card(sc, { s: 1 })}<div class="meta">⚽ Top scorer · ${sc.goals} goals</div></div>
   <div class="cardwrap">${card(as, { s: 1, dark: true })}<div class="meta">🅰️ Most assists · ${as.assists}</div></div>
   <div class="cardwrap">${card(rt, { s: 1 })}<div class="meta">⭐ Best rating · ${rt.rating.toFixed(1)} over ${rt.gp} games</div></div>
  </div></section>

 <section class="sec"><header><div><span class="ribbon">Meet the squad</span></div><a class="btn ghost" href="squad.html">All ${players.length}</a></header>${W.coverflow()}<p class="hint">Swipe or drag sideways</p></section>

 <section class="sec"><header><div><span class="ribbon">Trophy cabinet</span></div><a class="btn ghost" href="halloffame.html">Hall of Fame</a></header><div class="grid" style="grid-template-columns:1.5fr 1fr;align-items:stretch"><div class="panel reveal" style="display:grid;align-content:center">${W.cabinet()}</div>${W.poster()}</div></section>

 <section class="sec"><header><div><span class="ribbon">How we play</span></div><a class="btn ghost" href="tactics.html">Tactics table</a></header>
  <div class="grid g2"><div class="panel reveal"><h3>The shape</h3><p class="muted">In ${shapes[0]?.[1] ?? 0} of ${shapes.reduce((a, s) => a + s[1], 0)} full 11-player league games we lined up <b class="gold-t">${shapes[0]?.[0]?.replace(/^1-/, '') ?? '3-5-2'}</b>: three at the back, wingers dropping into a back five, a front four in attack.</p><div class="chips" style="margin-top:12px"><a class="chip" href="tactics.html">🏆 League · 11v11</a><a class="chip" href="tactics.html#rush">⚡ Rush · 5v5</a></div></div>
  <div class="panel reveal" style="--i:1"><h3>Game updates</h3>${updates.slice(0, 3).map((u) => `<a href="updates.html" style="display:block;padding:8px 0;border-top:1px solid var(--line)"><b style="font-size:14px">${esc(u.title.replace(/^EA SPORTS FC™ 27 \| /, ''))}</b><div class="muted tiny">${new Date(u.published).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div></a>`).join('')}</div></div></section>

 <section class="sec"><div class="panel reveal" style="display:grid;grid-template-columns:auto 1fr auto;gap:24px;align-items:center;background:linear-gradient(120deg,#1b1210,#140f0f 60%,#1a1608);border-color:rgba(200,53,44,.4)">
  <img src="crest.png" alt="" style="width:86px"><div><h3 style="font-size:28px;margin-bottom:4px">${esc(cfg.recruitment?.headline ?? 'Trials are by application only')}</h3><p class="muted">${esc((cfg.recruitment?.requirements ?? []).join(' · '))}</p></div><a class="btn gold" href="join.html">Apply for a trial</a></div></section>
</div>`;
  return shell({ group: 'club', page: 'index.html', title: 'Home', body });
}

// ---------- SQUAD ----------
export function squad() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">${players.length} players</div><h2>The squad</h2></div>
  <div class="chips" id="lines"><button class="chip on" data-l="">All</button>${Object.entries(L).map(([k, v]) => `<button class="chip" data-l="${k}">${v}</button>`).join('')}</div></header>
  <div class="chips" id="sort" style="margin-bottom:22px"><span class="muted small">Sort</span><button class="chip on" data-s="gp">Games</button><button class="chip" data-s="ovr">Rating</button><button class="chip" data-s="goals">Goals</button><button class="chip" data-s="assists">Assists</button></div>
  <div class="cards" id="grid" data-stagger>${players.map((p) => `<div class="cardwrap" data-line="${p.line}" data-gp="${p.gp}" data-ovr="${p.ovr ?? 0}" data-goals="${p.goals}" data-assists="${p.assists}">${card(p)}<div class="cmp"><button class="cmpbtn" data-k="${esc(p.k)}" aria-label="Compare ${esc(p.n)}" aria-pressed="false">+</button></div><div class="meta">${esc(p.arch || lineLabel(p))} · ${p.gp} games</div></div>`).join('')}</div>
  <p class="muted small" style="margin-top:20px">Card rating and position are EA's. Players with approved AI Studio artwork show it here and everywhere else they appear; everyone else gets this fallback.</p></section>
  <section class="sec"><header><div><span class="ribbon">Spotlight</span></div><p>Another way to browse: spin through the best-rated cards.</p></header>${W.coverflow()}</section>
  <section class="sec"><header><div><span class="ribbon">Flick and flip</span></div><p>Tap the deck to flick a card away. Tap a card to see its season on the back.</p></header><div class="grid g2" style="align-items:center"><div class="panel reveal" style="padding-top:30px">${W.deck()}</div><div class="panel reveal" style="--i:1">${W.flipcards()}</div></div></section></div>`;
  return shell({ group: 'club', page: 'squad.html', title: 'Squad', body, bodyClass: 'pg-squad' });
}

// ---------- PLAYER PROFILE ----------
function spark(vals) { if (!vals.length) return ''; const w = 220, h = 46, mx = 10, mn = 5, pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * w},${h - ((v - mn) / (mx - mn)) * h}`).join(' '); return `<svg viewBox="-4 -4 ${w + 8} ${h + 8}" width="100%" height="56" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--g2)" stroke-width="2.4" stroke-linejoin="round"/>${vals.map((v, i) => `<circle cx="${(i / Math.max(1, vals.length - 1)) * w}" cy="${h - ((v - mn) / (mx - mn)) * h}" r="3" fill="#fff1c2"/>`).join('')}</svg>`; }
export function player(p) {
  const apps = matches.flatMap((m) => m.lines.filter((l) => l.n === p.n).map((l) => ({ ...l, m }))).sort((a, b) => b.m.t - a.m.t);
  const form = apps.slice(0, 10).reverse().map((a) => a.rating).filter(Boolean);
  const body = `<div class="wrap"><a class="muted small" href="squad.html" style="display:inline-block;margin:24px 0 0">← Squad</a>
  <section class="hero prof" style="padding-top:20px;min-height:0;grid-template-columns:.9fr 1.1fr">
   <div class="stage" style="min-height:0"><div class="tilt" data-tilt="7" style="view-transition-name:pcard;display:inline-block">${hero(p)}</div></div>
   <div><div class="eyebrow reveal">${esc(L[p.line] ?? '')}${p.arch ? ' · ' + esc(p.arch) : ''}</div><h1 class="reveal" style="--i:1;font-size:clamp(40px,6vw,72px)">${esc(p.n)}</h1>
    <div class="chips reveal" style="--i:2"><span class="chip gold">OVR ${p.ovr ?? '—'}</span>${p.h ? `<span class="chip">${p.h} cm</span>` : ''}<span class="chip">${p.gp} games this season</span><button class="chip cmpbtn" data-k="${esc(p.k)}" style="width:auto;height:auto;border-radius:999px;padding:7px 14px;font:600 13px Inter">＋ Compare</button></div>
    <div class="sb reveal" style="--i:3;margin-top:18px">${sbt(p.goals, 'Goals', 'gold')}${sbt(p.assists, 'Assists')}${sbt(p.rating ? p.rating.toFixed(1) : '—', 'Avg rating', 'gold')}${sbt(p.mom, 'MOTM')}</div>
    <p class="muted small" style="margin-top:12px">${p.arch ? `Archetype <b>${esc(p.arch)}</b> is read from EA's match data (inferred). ` : ''}Position on the card is EA's favourite position.</p></div>
  </section>
  <div class="grid g3" style="margin-top:30px">
   <div class="panel reveal"><h3>Season</h3><div class="bars">${[['Win rate', p.win], ['Pass accuracy', p.pass], ['Tackle success', p.tackleRate]].map(([l, v]) => `<div class="r"><span>${l}</span><div class="t"><i style="--w:${v}%"></i></div><b class="num">${v}%</b></div>`).join('')}</div><p class="muted small">Clean sheets ${p.cs} · tackles ${p.tackles} · red cards ${p.red}</p></div>
   <div class="panel reveal" style="--i:1"><h3>Career</h3><div class="sb" style="grid-template-columns:1fr 1fr">${sbt(p.cgp, 'Games')}${sbt(p.cgoals, 'Goals', 'gold')}${sbt(p.cassists, 'Assists')}${sbt(p.cmom, 'MOTM')}</div></div>
   <div class="panel reveal" style="--i:2"><h3>Form · last ${form.length} ratings</h3>${spark(form)}<div class="muted small">${form.map((v) => v.toFixed(1)).join(' · ') || 'No archived games'}</div></div>
  </div>
  <div class="grid g2" style="margin-top:22px"><div class="panel reveal"><h3>Shape of their game</h3>${W.radar([p, ...(leaders.rating[0] && leaders.rating[0].k !== p.k ? [leaders.rating[0]] : [])])}<p class="muted small" style="text-align:center">Compared with the club's best-rated player. Each axis is scaled to the best in the squad.</p></div>
   <div class="panel reveal" style="--i:1"><h3>Rank tier</h3><p class="muted small">From the card overall: Bronze under 75, Silver 75–79, Gold 80–84, Elite 85+.</p>${W.tiers(W.tierOf(p.ovr ?? 0))}<h3 style="margin-top:18px">Flip the card</h3>${W.flipcards([p])}</div></div>
  <section class="sec"><header><div><span class="ribbon">Recent games</span></div></header><div class="panel flat reveal" style="padding:6px 14px;overflow-x:auto"><table class="tb"><thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>Rating</th><th>G</th><th>A</th></tr></thead><tbody>${apps.slice(0, 8).map((a) => `<tr><td>${fmtDate(a.m.t)}</td><td><a href="match-${a.m.id}.html">${esc(a.m.opp)}</a></td><td>${a.m.gf}-${a.m.ga} ${pillRes(a.m.res)}</td><td class="num">${a.rating ? a.rating.toFixed(1) : '—'}${a.mom ? ' ⭐' : ''}</td><td>${a.goals}</td><td>${a.assists}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No archived games yet.</td></tr>'}</tbody></table></div></section></div>`;
  return shell({ group: 'club', page: 'squad.html', title: p.n, body });
}

// ---------- HALL OF FAME ----------
export function hall() {
  const r = records, t = (title, big, who, sub, icon, gold) => `<div class="panel reveal trophy" style="text-align:center;${gold ? 'border-color:rgba(239,207,122,.5);box-shadow:0 0 40px rgba(239,207,122,.12),0 18px 40px rgba(0,0,0,.35)' : ''}"><div style="font-size:34px">${icon}</div><div class="eyebrow" style="color:var(--g2)">${title}</div><div class="num gold-t" style="font-size:54px;line-height:1.1">${big}</div><div class="osw" style="font-size:18px">${who}</div><div class="muted small">${sub}</div></div>`;
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">Honours and records</div><h2>Hall of <span class="gold-t">Fame</span></h2></div></header>
  <div class="grid g3" data-stagger>${t('All-time scorer', r.careerScorer.cgoals, esc(r.careerScorer.n), `${r.careerScorer.cgp} career games`, '👑', true)}${t('All-time assists', r.careerAssist.cassists, esc(r.careerAssist.n), `${r.careerAssist.cgp} career games`, '🅰️')}${t('Most MOTM', r.careerMom.cmom, esc(r.careerMom.n), 'career man of the match', '🏅')}
  ${t('Biggest win', `${r.biggestWin.gf}–${r.biggestWin.ga}`, esc(r.biggestWin.opp), fmtDate(r.biggestWin.t, { day: 'numeric', month: 'long' }), '🔥')}${t('Best win run', W.bestRun(), `in the last ${matches.length} games`, `now ${W.runNow()[0]} ${W.runNow()[1]}`, '🏆', true)}${t('Promotions', C.promotions, 'to Division 1', `now ${C.pts} points`, '⬆️')}</div></section>
  <section class="sec"><header><div><span class="ribbon">Trophy cabinet</span></div></header><div class="panel reveal">${W.cabinet()}</div></section>
  <section class="sec"><header><div><span class="ribbon">Season awards</span></div><p>Today's leader in each category. Managers confirm the monthly winners in the Hub.</p></header><div class="panel reveal">${W.medals()}</div></section>
  <section class="sec"><header><div><span class="ribbon">Legends</span></div><p>Players who earned their place for good. Elected by the managers.</p></header>
   <div class="panel reveal legend" style="display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;border-color:rgba(239,207,122,.45)"><div class="pc pc-card" style="--s:.8"><span class="shell"></span><div class="art"><svg class="fb" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><path class="sil" d="M50 14c-9 0-16 8-16 18 0 8 4 14 9 17-14 3-27 12-30 27v8h74v-8c-3-15-16-24-30-27 5-3 9-9 9-17 0-10-7-18-16-18z"/><text class="num" x="50" y="97" text-anchor="middle">JC</text></svg></div><span class="ovr">★</span><span class="pos">LEGEND</span><span class="crestm"><img src="crest.png" alt=""></span><span class="name">J_CRUZ505</span><span class="stats"><div><b class="num">5</b><span>★</span></div><div><b class="num">1</b><span>WALL</span></div><div><b class="num">∞</b><span>CLUB</span></div></span><span class="club">NOREX UNITED FC</span></div>
   <div><h3 style="font-size:30px" class="gold-t">J_CRUZ505 · "The Wall"</h3><p class="muted">The club's first legend. The Hall of Fame carries the same gold card for every inductee once their artwork is approved.</p>${sample('LEGEND FROM THE LIVE SITE')}</div></div></section>
  <section class="sec"><header><div><span class="ribbon">Player of the month</span></div><p>The top performer right now. Once managers publish the official winner, this poster switches to them.</p></header><div style="max-width:420px">${W.poster()}</div></section>
  <section class="sec"><header><div><span class="ribbon">Rank tiers</span></div><p>Every card sits in a tier, from its overall.</p></header><div class="panel reveal">${W.tiers()}</div></section></div>`;
  return shell({ group: 'club', page: 'halloffame.html', title: 'Hall of Fame', body });
}

// ---------- JOIN ----------
export function join() {
  const pos = cfg.recruitment?.positions ?? [];
  const body = `<div class="wrap"><section class="hero" style="min-height:0;padding-bottom:10px"><div><div class="eyebrow reveal">Join the club</div><h1 class="reveal" style="--i:1;font-size:clamp(44px,7vw,84px)">Earn your <em>crest</em></h1><p class="lead reveal" style="--i:2">${esc(cfg.recruitment?.headline ?? 'Trials are by application only')}. We play League and Rush on ${esc(cfg.platform === 'common-gen5' ? 'PS5, Xbox Series and PC' : 'new gen')}.</p><div class="chips reveal" style="--i:3"><a class="btn gold" href="${esc(cfg.discord?.applyLink ?? '#')}">Apply on Discord</a><a class="btn ghost" href="squad.html">Meet the squad</a></div></div>
  <div class="stage"><div class="crestwrap tilt" data-tilt="7"><span class="halo"></span><img src="crest.png" alt=""></div></div></section>
  <div class="grid g2" style="margin-top:20px"><div class="panel reveal"><h3>What we look for</h3>${(cfg.recruitment?.requirements ?? []).map((r) => `<div style="display:flex;gap:12px;padding:10px 0;border-top:1px solid var(--line)"><span style="color:var(--g2)">✔</span><span>${esc(r)}</span></div>`).join('')}</div>
  <div class="panel reveal" style="--i:1"><h3>Positions we want</h3><div class="chips">${pos.map((p) => `<span class="chip gold">${esc(p)}</span>`).join('')}</div><p class="muted small" style="margin-top:12px">Every position in our 3-5-2 has a role in the club tactic, so we recruit for the role, not just the label.</p></div></div>
  <section class="sec"><header><div><span class="ribbon">How it works</span></div></header><div class="grid g4" data-stagger>${[['1', 'Apply', 'Join the Discord and press Apply to Join.'], ['2', 'Trial', 'Play with us on a match night.'], ['3', 'Decision', 'Managers review your trial.'], ['4', 'Your card', 'Join the Hub, submit your AI Studio artwork and get your own locker.']].map(([n, t, d]) => `<div class="panel"><div class="num gold-t" style="font-size:44px">${n}</div><h3>${t}</h3><p class="muted small">${d}</p></div>`).join('')}</div></section></div>`;
  return shell({ group: 'club', page: 'join.html', title: 'Join', body });
}

// ---------- SCOUTING (members only) ----------
export function scouting() {
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">Recruitment · members only</div><h2>Scouting</h2></div></header>
  <div data-for="guest" class="panel" style="text-align:center;padding:50px"><div style="font-size:44px">🔒</div><h3 style="font-size:28px">Members only</h3><p class="muted">Scouting is where members recommend players to the managers. Enter the Hub to unlock it.</p><a class="btn gold" data-hub href="hub.html" style="margin-top:12px">🔑 Enter the Hub</a></div>
  <div data-for="member owner" hidden><div class="grid g2"><form class="panel" onsubmit="event.preventDefault();this.querySelector('.ok').hidden=false"><h3>Recommend a player</h3>
   <label class="muted small">EA ID<input required style="width:100%;margin:4px 0 12px;padding:11px;border-radius:10px;background:var(--p3);border:1px solid var(--line2);color:#fff"></label>
   <label class="muted small">Position<select style="width:100%;margin:4px 0 12px;padding:11px;border-radius:10px;background:var(--p3);border:1px solid var(--line2);color:#fff">${(cfg.recruitment?.positions ?? []).map((p) => `<option>${esc(p)}</option>`).join('')}</select></label>
   <label class="muted small">Why do they fit?<textarea rows="3" style="width:100%;margin:4px 0 12px;padding:11px;border-radius:10px;background:var(--p3);border:1px solid var(--line2);color:#fff"></textarea></label><button class="btn">Send to the managers</button><p class="ok muted small" hidden style="margin-top:10px">${sample('PREVIEW')} Nothing is sent from this local preview.</p></form>
  <div class="panel"><h3>My recommendations</h3><p class="muted">${sample()} Sample rows: each moves through <b>Sent → Reviewing → Trial → Decision</b> and you are notified at each stage.</p>${['Sent', 'Reviewing', 'Trial'].map((s, i) => `<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid var(--line)"><span>Sample player ${i + 1}</span><span class="pill s">${s}</span></div>`).join('')}</div></div></div></section></div>`;
  return shell({ group: 'club', page: 'scouting.html', title: 'Scouting', body });
}

export default function (P) {
  P('index.html', home()); P('squad.html', squad()); P('halloffame.html', hall()); P('join.html', join()); P('scouting.html', scouting());
  for (const p of players) P(`player-${slug(p.k)}.html`, player(p));
}
