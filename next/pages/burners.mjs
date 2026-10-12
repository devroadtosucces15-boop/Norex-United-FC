// Burner clubs: temporary clubs members start for casual league games so the club's own stats stay clean.
// They are NOT opponents and never enter League totals, records, awards or player pages (data/burners is read here only).
// Structured for the "include burner numbers in Norex's numbers" option: every club is a [data-burner] card and the same
// numbers are embedded as JSON (#bn-data) for a later picker to read.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { burnerStats, TYPE_LABEL } from '../../bot/burnerstats.js';
import { shell, esc, sbt, oppCrest } from '../lib/ui.mjs';
import { fmtDate } from '../lib/data.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const POS = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' };
export const burnerClubs = () => (J(path.join(root, 'data/burners/index.json'), { ids: [] }).ids ?? [])
  .map((id) => J(path.join(root, `data/burners/${id}.json`), null)).filter(Boolean)
  .map((b) => ({ ...b, stats: burnerStats(b.matches ?? []) })).sort((a, b) => (b.stats.lastTs ?? 0) - (a.stats.lastTs ?? 0));

const day = (ts) => (ts ? fmtDate(ts, { day: 'numeric', month: 'short' }) : '–');
const formRow = (arr) => `<span class="bn-form">${arr.slice().reverse().map((r) => `<b class="${r.toLowerCase()}">${r}</b>`).join('') || '<small class="muted">no games yet</small>'}</span>`;
const gd = (n) => (n > 0 ? '+' + n : String(n));

function combined(list) {
  const t = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }; const who = new Map();
  for (const b of list) { for (const k of Object.keys(t)) t[k] += b.stats[k] || 0;
    for (const p of b.stats.players) { const e = who.get(p.n.toLowerCase()) ?? { n: p.n, gp: 0, g: 0, a: 0 }; e.gp += p.gp; e.g += p.g; e.a += p.a; who.set(p.n.toLowerCase(), e); } }
  const ps = [...who.values()]; return { ...t, winPct: t.gp ? Math.round(t.w / t.gp * 100) : 0, scorer: ps.sort((a, b) => b.g - a.g)[0], assister: ps.sort((a, b) => b.a - a.a)[0], people: ps.length };
}

export function burnersPage() {
  const list = burnerClubs(), T = combined(list);
  const card = (b) => { const s = b.stats, top = s.players.slice().sort((a, c) => c.g - a.g).filter((p) => p.g).slice(0, 3);
    const games = (b.matches ?? []).slice().sort((a, c) => c.ts - a.ts).slice(0, 5).map((m) => `<li class="${m.res}"><span class="d">${day(m.ts)}</span><span class="o">${oppCrest(m.opp?.crest, m.opp?.name ?? '', 22)} ${esc(m.opp?.name ?? 'Club ' + m.opp?.id)}</span><span class="m">${esc(TYPE_LABEL[m.type] ?? 'League')}</span><b>${m.gf}–${m.ga}</b><i>${m.res}</i></li>`).join('');
    const squad = s.players.slice(0, 8).map((p) => `<span class="chip" title="${p.gp} games">${esc(p.n)}${p.g ? ` · ⚽${p.g}` : ''}${p.a ? ` · 🅰️${p.a}` : ''}</span>`).join('');
    return `<article class="panel bn-card reveal" data-burner="${esc(b.id)}" id="c${esc(b.id)}"><div class="bn-top">${oppCrest(b.crest, b.name, 54)}<div><h3>${esc(b.name)}</h3><small class="muted">${s.gp ? `last game ${day(s.lastTs)}` : 'waiting for a first game'} · tracked since ${day(Date.parse(b.trackedAt) / 1000)}</small></div>${formRow(s.form)}</div>
<div class="bn-rec"><span><b>${s.gp}</b>Played</span><span class="w"><b>${s.w}</b>Won</span><span><b>${s.d}</b>Drawn</span><span class="l"><b>${s.l}</b>Lost</span><span><b>${gd(s.gd)}</b>GD</span></div>
${top.length ? `<p class="bn-line">⚽ <b>Scorers</b> ${top.map((p) => `${esc(p.n)} ${p.g}`).join(' · ')}</p>` : ''}
${squad ? `<div class="chips bn-squad">${squad}</div>` : ''}
${games ? `<ul class="bn-games">${games}</ul>` : ''}
<p class="muted tiny">EA only lists a club's last 5 games per mode, so the record covers games since we started tracking.</p></article>`; };
  const data = { burners: list.map((b) => ({ id: b.id, name: b.name, rec: { gp: b.stats.gp, w: b.stats.w, d: b.stats.d, l: b.stats.l, gf: b.stats.gf, ga: b.stats.ga } })) };
  const body = `<div class="wrap"><section class="sec" style="margin-top:34px"><header><div><div class="eyebrow">Kept apart from the club stats</div><h2>Burner clubs</h2></div><a class="btn ghost" href="opponents.html">Opponents</a></header>
<div class="panel reveal bn-intro"><div class="bn-fire">🔥</div><p>Burner clubs are temporary clubs our members start when there are few of us and we just want to play some league games, without a bad night touching the real club's numbers. They are <b>not opponents</b> and <b>never count</b> in NOREX UNITED's League totals, records, awards or player pages.</p></div>
${list.length ? `<div class="panel reveal bn-all" id="bn-all"><h3>All burners combined</h3><div class="bn-rec big"><span><b>${T.gp}</b>Played</span><span class="w"><b>${T.w}</b>Won</span><span><b>${T.d}</b>Drawn</span><span class="l"><b>${T.l}</b>Lost</span><span><b>${T.gf}–${T.ga}</b>Goals</span><span><b>${T.winPct}%</b>Win rate</span></div><p class="muted small">${list.length} burner club${list.length === 1 ? '' : 's'} · ${T.people} players seen${T.scorer?.g ? ` · top scorer <b>${esc(T.scorer.n)}</b> (${T.scorer.g})` : ''}${T.assister?.a ? ` · most assists <b>${esc(T.assister.n)}</b> (${T.assister.a})` : ''}</p></div>
<div class="grid g2 bn-grid" data-stagger>${list.map(card).join('')}</div>
<div id="bn-include" data-slot="include-in-norex" hidden></div>
<script type="application/json" id="bn-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
  : `<div class="panel reveal" style="text-align:center;padding:40px"><div style="font-size:42px">🔥</div><h3>No burner clubs tracked yet</h3><p class="muted">When a member starts one, a manager adds it with /burner search in Discord and it shows up here.</p></div>`}
</section></div>`;
  return shell({ group: 'stats', page: 'burners.html', title: 'Burner clubs', body, extraHead: CSS });
}
const CSS = `<style>.bn-intro{display:flex;gap:16px;align-items:center;margin-bottom:22px;border-color:rgba(200,53,44,.4)}.bn-fire{font-size:38px}.bn-intro p{margin:0}.bn-all{margin-bottom:22px}.bn-rec{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.bn-rec.big{grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.bn-rec span{display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 2px;border-radius:12px;background:var(--p3);border:1px solid var(--line);font:600 10px Inter;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}.bn-rec b{font:600 22px Oswald;letter-spacing:0;color:#fff}.bn-rec .w b{color:#4be08a}.bn-rec .l b{color:#ff7d72}@media(min-width:700px){.bn-rec.big{grid-template-columns:repeat(6,1fr)}}.bn-grid{gap:22px}.bn-card{display:flex;flex-direction:column;align-items:stretch;gap:14px}.bn-top{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.bn-top h3{margin:0}.bn-top>div{flex:1;min-width:140px}.bn-form{display:inline-flex;gap:4px}.bn-form b{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;font:700 12px Oswald}.bn-form .w{background:#12331f;color:#4be08a}.bn-form .d{background:#332b12;color:var(--g2)}.bn-form .l{background:#3a1613;color:#ff7d72}.bn-line{margin:0;color:var(--soft)}.bn-squad{display:flex;flex-wrap:wrap;gap:6px}.bn-squad .chip{width:auto;flex:0 0 auto}.bn-games{width:100%;list-style:none;margin:0;padding:0;display:grid;gap:6px}.bn-games li{display:grid;grid-template-columns:48px 1fr auto 48px 22px;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;background:var(--p3);border-left:3px solid var(--line2);font-size:13px}.bn-games li.W{border-left-color:#22b35e}.bn-games li.L{border-left-color:var(--red)}.bn-games li.D{border-left-color:var(--g3)}.bn-games .d{color:var(--mute);font-size:12px}.bn-games .o{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bn-games .m{color:var(--mute);font-size:11px}.bn-games b{font:700 15px Oswald;text-align:center}.bn-games i{font:700 11px Oswald;font-style:normal;color:var(--mute)}@media(max-width:560px){.bn-games li{grid-template-columns:42px 1fr 44px 18px}.bn-games .m{display:none}.bn-intro{flex-direction:column;align-items:flex-start}}</style>`;
export default function (P) { P('burners.html', burnersPage()); }
