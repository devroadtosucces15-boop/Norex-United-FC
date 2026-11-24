// Embed builders for the stats commands. Everything reads from the local database of tracked matches.
import { Embed } from './embed.js';
import { theme, ratingDot, EMBLEM } from './theme.js';

const e = (club, title, color = theme.green) => new Embed().setColor(color).setTitle(title.slice(0, 256)).setThumbnail(club?.crest ?? null).setFooter({ text: `${theme.name} · ${theme.tagline}` });
const code = (lines) => '```\n' + lines.join('\n') + '\n```';
const pad = (s, w) => String(s).slice(0, w).padEnd(w);
const rpad = (s, w) => String(s).slice(0, w).padStart(w);
const r1 = (v) => (+v || 0).toFixed(1);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const DOT = { W: '🟢', D: '🟡', L: '🔴' };
const empty = (club) => e(club, club.name).setDescription('No matches stored yet. Run `/match track` or `/match stats` first.');

export function streaks(rows) { // rows newest first
  let cur = 0, kind = rows[0]?.res, best = { W: 0, D: 0, L: 0 }, run = 0, prev = null;
  for (const r of [...rows].reverse()) { run = r.res === prev ? run + 1 : 1; prev = r.res; best[r.res] = Math.max(best[r.res], run); }
  for (const r of rows) { if (r.res === kind) cur++; else break; }
  return { cur, kind, best };
}

export async function clubEmbed(st, club) {
  const t = await st.clubTotals(club.id);
  if (!t?.gp) return empty(club);
  const rows = await st.allResults(club.id), s = streaks(rows);
  const form = rows.slice(0, 10).map((r) => DOT[r.res]).join('');
  const pts = t.w * 3 + t.d;
  return e(club, `${club.name} · club record`).addFields(
    { name: 'Record', value: `**${t.gp}** played\n**${t.w}**W · **${t.d}**D · **${t.l}**L\nWin rate **${pct(t.w, t.gp)}**`, inline: true },
    { name: 'Goals', value: `For **${t.gf}**\nAgainst **${t.ga}**\nDiff **${t.gf - t.ga >= 0 ? '+' : ''}${t.gf - t.ga}**`, inline: true },
    { name: 'Per game', value: `Scored **${(t.gf / t.gp).toFixed(2)}**\nConceded **${(t.ga / t.gp).toFixed(2)}**\nPoints **${pts}**`, inline: true },
    { name: 'Form (newest first)', value: form },
    { name: 'Streak', value: `${s.cur} ${{ W: 'win', D: 'draw', L: 'loss' }[s.kind]}${s.cur === 1 ? '' : 's'} running · best run ${s.best.W}W / ${s.best.L}L` },
  );
}

export async function resultsEmbed(st, club, count = 5) {
  const rows = await st.recentResults(club.id, count);
  if (!rows.length) return empty(club);
  return e(club, `${club.name} · last ${rows.length}`).setDescription(rows.map((r) => `${DOT[r.res]} **${r.gf}–${r.ga}** vs ${r.opp_name} · <t:${r.ts}:R>`).join('\n'));
}

export async function playerEmbed(st, club, name) {
  const p = await st.playerCard(club.id, name);
  if (!p) return e(club, 'Player not found').setDescription(`No stored games for **${name}** at ${club.name}.`);
  const f = p.form;
  return e(club, `${p.player}${p.pos ? ` · ${p.pos}` : ''}`).setDescription(`${club.name} · **${p.gp}** game${p.gp === 1 ? '' : 's'}`).addFields(
    { name: `${ratingDot(p.avg)} Rating`, value: `Avg **${p.avg.toFixed(2)}**\nBest **${r1(p.best)}**${p.mom ? `\n${EMBLEM.mom} MOTM **${p.mom}**` : ''}`, inline: true },
    { name: `${EMBLEM.goal} Attack`, value: `Goals **${p.g}** (${(p.g / p.gp).toFixed(2)}/g)\nAssists **${p.a}** (${(p.a / p.gp).toFixed(2)}/g)\nShots **${p.sh}**`, inline: true },
    { name: `${EMBLEM.pass} Craft & defence`, value: `Passes **${pct(p.pm, p.pa)}**\nTackles **${pct(p.tm, p.ta)}**${p.sv ? `\nSaves **${p.sv}**` : ''}`, inline: true },
    ...(f.length ? [{ name: `📈 Last ${f.length} ratings`, value: `${f.map(ratingDot).join('')}\n${f.map(r1).join(' · ')}` }] : []),
  );
}

export async function compareEmbed(st, club, a, b) {
  const pa = await st.playerCard(club.id, a), pb = await st.playerCard(club.id, b);
  if (!pa || !pb) return e(club, 'Compare').setDescription(`No stored games for ${!pa ? `**${a}**` : `**${b}**`}.`);
  const row = (k, x, y) => `${pad(k, 9)} ${rpad(x, 8)} ${rpad(y, 8)}`;
  const per = (v, p) => (v / p.gp).toFixed(2);
  return e(club, `${pa.player} vs ${pb.player}`).setDescription(code([
    row('', pa.player.slice(0, 8), pb.player.slice(0, 8)),
    row('Games', pa.gp, pb.gp), row('Rating', pa.avg.toFixed(2), pb.avg.toFixed(2)),
    row('Goals/g', per(pa.g, pa), per(pb.g, pb)), row('Assists/g', per(pa.a, pa), per(pb.a, pb)),
    row('Pass %', pct(pa.pm, pa.pa), pct(pb.pm, pb.pa)), row('Tackle %', pct(pa.tm, pa.ta), pct(pb.tm, pb.ta)),
    row('MOTM', pa.mom, pb.mom),
  ]));
}

export async function leaderboardEmbed(st, club, stat) {
  const { label, rows } = await st.leaderboard(club.id, stat);
  if (!rows.length) return empty(club);
  const medal = ['🥇', '🥈', '🥉'];
  return e(club, `${club.name} · ${label} leaders`, theme.gold).setDescription(rows.map((r, i) => `${medal[i] ?? `\`${i + 1}.\``} **${r.player}** · ${r.shown} _(${r.gp} g)_`).join('\n'));
}

export async function historyEmbed(st, club, q) {
  const rows = await st.headToHead(club.id, q);
  if (!rows.length) return e(club, 'Head to head').setDescription(`${club.name} has no stored games against “${q}”.`);
  const w = rows.filter((r) => r.res === 'W').length, d = rows.filter((r) => r.res === 'D').length, l = rows.length - w - d;
  const gf = rows.reduce((t, r) => t + r.gf, 0), ga = rows.reduce((t, r) => t + r.ga, 0);
  return e(club, `${club.name} vs ${rows[0].opp_name}`).setDescription(`**${rows.length}** played · **${w}**W **${d}**D **${l}**L · goals **${gf}**–**${ga}**\n\n`
    + rows.slice(0, 8).map((r) => `${DOT[r.res]} **${r.gf}–${r.ga}** vs ${r.opp_name} · <t:${r.ts}:d>`).join('\n'));
}

export async function insightEmbed(st, club, kind = 'form') {
  const rows = await st.allResults(club.id);
  if (!rows.length) return empty(club);
  if (kind === 'last5') {
    const l = rows.slice(0, 5), w = l.filter((r) => r.res === 'W').length, gf = l.reduce((t, r) => t + r.gf, 0), ga = l.reduce((t, r) => t + r.ga, 0);
    return e(club, `${club.name} · last ${l.length}`).setDescription(`${l.map((r) => DOT[r.res]).join('')}\n**${w}** wins · scored **${gf}** · conceded **${ga}**\n${w >= 4 ? '🔥 Flying.' : w >= 3 ? '📈 Solid run.' : w >= 2 ? '⚖️ Mixed.' : '📉 Needs a reset.'}`);
  }
  if (kind === 'streaks') {
    const s = streaks(rows);
    return e(club, `${club.name} · streaks`).setDescription(`Current: **${s.cur}** ${{ W: 'win', D: 'draw', L: 'loss' }[s.kind]}${s.cur === 1 ? '' : 's'}\nBest win run **${s.best.W}** · worst losing run **${s.best.L}**\nClean sheets **${rows.filter((r) => r.ga === 0).length}** · games scoring 3+ **${rows.filter((r) => r.gf >= 3).length}**`);
  }
  const l = rows.slice(0, 10), pts = l.reduce((t, r) => t + (r.res === 'W' ? 3 : r.res === 'D' ? 1 : 0), 0);
  return e(club, `${club.name} · form`).setDescription(`${l.map((r) => DOT[r.res]).join('')}\n**${pts}** points from the last **${l.length}** (${(pts / l.length).toFixed(2)} per game)`);
}

export function helpEmbed() {
  return new Embed().setColor(theme.green).setTitle(`${theme.name} · commands`).setFooter({ text: theme.tagline }).setDescription([
    '**Find & post**',
    '`/match search` find a club or its opponents · `/match stats` post a match (Box Score · Club Stats · Players)',
    '`/match track` start tracking + auto-post · `/match untrack` · `/match list`',
    '**Stats (from tracked matches)**',
    '`/club` record, form, streak · `/results` recent scores · `/last` latest match',
    '`/player` player card · `/compare` two players · `/leaderboard` top players',
    '`/history` record vs an opponent · `/insight` form, last 5, streaks',
    '_Leave `club` empty to use this server\'s tracked club._',
  ].join('\n'));
}
