// Burner clubs page (site/burners.html) + the bot's compact feed (site/api/burners.json).
// Reads data/burners/*.json (written by fetch.mjs, see bot/burnerstats.js) – deliberately nothing from the NOREX
// archive, so a burner can never leak into League totals. Gated by the `burners` flag (cosmetic; the data is public EA data).
import path from 'node:path';
import { burnerStats, TYPE_LABEL, CREST_CDN } from '../bot/burnerstats.js';

const num = (v) => Number(v) || 0;
const POS = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' };

export function loadBurners(DATA, readJson) {
  const dir = path.join(DATA, 'burners');
  const ids = readJson(path.join(dir, 'index.json'), { ids: [] }).ids ?? [];
  return ids.map((id) => readJson(path.join(dir, `${id}.json`), null)).filter(Boolean)
    .map((b) => ({ ...b, stats: burnerStats(b.matches) }))
    .sort((a, b) => (b.stats.lastTs ?? 0) - (a.stats.lastTs ?? 0));
}

// Compact feed for the /burner list command and anything else that wants the numbers.
export const burnersFeed = (list) => ({
  updated: new Date().toISOString(),
  clubs: list.map((b) => ({ id: b.id, name: b.name, crest: b.crest, gp: b.stats.gp, w: b.stats.w, d: b.stats.d, l: b.stats.l, gf: b.stats.gf, ga: b.stats.ga, form: b.stats.form, last: b.stats.lastTs })),
});

export function buildBurners(h, list) {
  const { write, page, pageHead, section, emptyState, esc, table, td, counter, ratingPill, resPill, config } = h;
  const crestImg = (b, size = 44) => `<img class="crest" src="${b.crest ? `${CREST_CDN}${num(b.crest)}.png` : `assets/crest-ea.png`}" width="${size}" height="${size}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
  const when = (ts) => (ts ? new Date(ts * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '–');
  const form = (arr) => `<div class="form">${arr.map(resPill).join('') || '<span class="muted small">no games yet</span>'}</div>`;
  const oppName = (m) => esc(m.opp.name ?? `Club ${m.opp.id}`);

  const card = (b) => {
    const s = b.stats;
    return `<a class="bn-card" href="#c${esc(b.id)}">
<div class="bn-card-top">${crestImg(b)}<div><b class="osw">${esc(b.name)}</b><small class="muted">club ${esc(b.id)} · ${s.gp ? `last game ${when(s.lastTs)}` : 'waiting for a first game'}</small></div></div>
<div class="bn-rec"><span><b>${s.w}</b>W</span><span><b>${s.d}</b>D</span><span><b>${s.l}</b>L</span><span><b>${s.gf}–${s.ga}</b>goals</span><span><b>${s.winPct}%</b>wins</span></div>
${form(s.form.slice().reverse())}</a>`;
  };

  const squadTable = (b) => table(`bn-squad-${b.id}`, ['Player', 'Pos', '#GP', '#Rating', '#Goals', '#Assists', '#MOTM', '#Pass %', '#Tackle %', 'Seen'],
    b.stats.players.map((p) => {
      const r = b.roster?.[p.n];
      return `<tr>${td(`<b>${esc(p.n)}</b>${r && r.active === false ? ' <span class="tag" data-tip="Not in the club any more">left</span>' : ''}`, false, p.n.toLowerCase())}${td(esc(POS[p.pos] ?? p.pos ?? ''), false)}${td(p.gp, true)}${td(ratingPill(p.rating), true, p.rating)}${td(p.g, true)}${td(p.a, true)}${td(p.motm, true)}${td(p.passPct ?? '–', true, p.passPct ?? -1)}${td(p.tacklePct ?? '–', true, p.tacklePct ?? -1)}${td(r?.first ? when(Date.parse(r.first) / 1000) : '–', false, r?.first ?? '')}</tr>`;
    }));

  const matchTable = (b) => table(`bn-matches-${b.id}`, ['Date', 'Mode', 'Opponent', '#Score', 'Result', 'Top rated'],
    b.matches.slice(0, 30).map((m) => {
      const best = [...m.players].sort((a, c) => c.r - a.r)[0];
      return `<tr>${td(`<time datetime="${new Date(m.ts * 1000).toISOString()}">${when(m.ts)}</time>`, false, m.ts)}${td(esc(TYPE_LABEL[m.type] ?? 'League'))}${td(oppName(m), false, oppName(m).toLowerCase())}${td(`<b>${m.gf}–${m.ga}</b>`, true, m.gf - m.ga)}${td(resPill(m.res), false, m.res)}${td(best ? `${esc(best.n)} ${ratingPill(best.r)}` : '–', false, best?.r ?? 0)}</tr>`;
    }));

  const modeRows = (b) => Object.entries(b.stats.byType).map(([t, r]) => `<li><b>${esc(TYPE_LABEL[t] ?? t)}</b> ${r.gp} played · ${r.w}W ${r.d}D ${r.l}L · ${r.gf}–${r.ga}</li>`).join('');

  const detail = (b) => {
    const s = b.stats, o = b.overall ?? {}, lb = b.leaderboard;
    const motm = s.players.slice().sort((a, c) => c.motm - a.motm)[0];
    const scorer = s.players.slice().sort((a, c) => c.g - a.g)[0];
    const inClub = (b.members ?? []).length;
    return section(`${crestImg(b, 34)} ${esc(b.name)}`, `
<section class="stats">${counter('Played', s.gp)}${counter('Wins', s.w)}${counter('Draws', s.d)}${counter('Losses', s.l)}${counter('Goals for', s.gf)}${counter('Goals against', s.ga)}${counter('Clean sheets', s.cs)}${counter('Win rate', s.winPct, { suffix: '%' })}</section>
<div class="bn-facts">${form(s.form.slice().reverse())}
<ul class="bn-list">
${s.streak.n > 1 ? `<li>🔥 <b>${s.streak.n}${esc(s.streak.res)}</b> streak right now</li>` : ''}
${scorer?.g ? `<li>⚽ Top scorer <b>${esc(scorer.n)}</b> (${scorer.g})</li>` : ''}
${motm?.motm ? `<li>⭐ Most MOTM <b>${esc(motm.n)}</b> (${motm.motm})</li>` : ''}
${inClub ? `<li>👥 <b>${inClub}</b> in the club right now</li>` : ''}
${o.skillRating ? `<li>📈 EA skill rating <b>${num(o.skillRating)}</b>${lb?.currentDivision ? ` · division ${num(lb.currentDivision)}` : ''}</li>` : ''}
${o.gamesPlayed ? `<li>🧾 EA season total: ${num(o.gamesPlayed)} played · ${num(o.wins)}W ${num(o.ties)}D ${num(o.losses)}L</li>` : ''}
${modeRows(b)}
</ul></div>
<h3 class="bn-h">👥 Squad (from tracked games)</h3>${squadTable(b)}
<h3 class="bn-h">🗓️ Games</h3>${matchTable(b)}
<p class="muted small">Tracked since ${esc(when(Date.parse(b.trackedAt) / 1000))} · ${b.matches.length} game${b.matches.length === 1 ? '' : 's'} on file (EA only shows each club's last 5 per mode, so earlier games before tracking can't be recovered) · updated ${esc(new Date(b.fetchedAt).toISOString().slice(0, 16).replace('T', ' '))} UTC</p>`, { id: `c${esc(b.id)}`, sub: `club ${esc(b.id)}` });
  };

  const body = `${pageHead('🔥 Burner clubs', 'Throwaway clubs we keep an eye on. A manager picks one with <b>/burner search</b> in Discord – we collect its squad and games, and the bot posts a stats report after every game it plays.', '')}
<div data-flag="burners" hidden>
${list.length ? `<section class="bn-grid reveal">${list.map(card).join('')}</section>${list.map(detail).join('')}`
    : emptyState('🔥', 'No burner clubs tracked yet', 'When someone makes a new one, run <b>/burner search</b> in Discord, pick the club, and it shows up here with every game.')}
</div>
<div class="bn-locked">${emptyState('🔒', 'Burner clubs are for managers', 'Log in with Discord if you are one – this page opens up for you.')}</div>
<link rel="stylesheet" href="assets/burners.css">`;
  write('burners.html', page({
    title: `Burner clubs – ${config.siteTitle}`, base: '', active: 'burners',
    description: `Burner clubs ${config.siteTitle} is tracking – squads, results and stats after every game.`, body,
  }));
}
