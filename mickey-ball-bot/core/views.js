import { Embed, row, button } from './embed.js';
import { theme, EMBLEM, resultColor, resultWord, ratingDot } from './theme.js';
import { crestUrl } from './ea.js';

export const VIEWS = ['box', 'club', 'players'];
const LABEL = { box: ['Box Score', '📋'], club: ['Club Stats', '📊'], players: ['Players', '⭐'] };

const pad = (s, w) => String(s).slice(0, w).padEnd(w);
const rpad = (s, w) => String(s).slice(0, w).padStart(w);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const r1 = (v) => (+v || 0).toFixed(1);
const code = (lines) => '```\n' + lines.join('\n') + '\n```';

function frame(m, view) {
  const e = new Embed()
    .setColor(resultColor(m.res))
    .setThumbnail(m.home.crest)
    .setTimestamp(m.ts ? m.ts * 1000 : 0)
    .setFooter({ text: `${theme.name} · ${theme.tagline}` });
  e.setTitle(`${m.home.name}  ${m.home.goals} – ${m.away.goals}  ${m.away.name}`.slice(0, 256));
  e.setAuthor({ name: `${resultWord(m.res)} · ${LABEL[view][0]}` });
  return e;
}

const playerRows = (list) => list.map((p) =>
  `${pad(p.pos.slice(0, 3).toUpperCase(), 3)} ${pad(p.name, 12)} ${rpad(r1(p.rating), 4)} ${rpad(p.goals, 2)} ${rpad(p.assists, 2)}${p.mom ? ' ★' : ''}`);

// 1) Box score: the scoreboard plus both line-ups.
export function boxScore(m) {
  const head = 'POS NAME          RTG  G  A';
  const e = frame(m, 'box');
  e.addFields(
    { name: `🟩 ${m.home.name}`, value: code([head, ...playerRows(m.home.players)]) || '—' },
    { name: `⬛ ${m.away.name}`, value: code([head, ...playerRows(m.away.players)]) || '—' },
  );
  return e;
}

// 2) Club stats: side-by-side team numbers, plus the tracked record when we have one.
export async function clubStats(st, m) {
  const h = m.home.totals, a = m.away.totals;
  const rows = [
    ['Goals', m.home.goals, m.away.goals],
    ['Shots', h.shots, a.shots],
    ['Pass %', pct(h.passesMade, h.passAtt), pct(a.passesMade, a.passAtt)],
    ['Passes', `${h.passesMade}/${h.passAtt}`, `${a.passesMade}/${a.passAtt}`],
    ['Tackle %', pct(h.tacklesMade, h.tackleAtt), pct(a.tacklesMade, a.tackleAtt)],
    ['Saves', h.saves, a.saves],
    ['Assists', h.assists, a.assists],
    ['Avg rating', r1(h.avgRating), r1(a.avgRating)],
  ];
  const e = frame(m, 'club');
  e.setDescription(code([`${pad('', 11)} ${rpad(m.home.name.slice(0, 10), 10)} ${rpad(m.away.name.slice(0, 10), 10)}`,
    ...rows.map(([k, x, y]) => `${pad(k, 11)} ${rpad(x, 10)} ${rpad(y, 10)}`)]));
  const t = await st.clubTotals(m.home.id);
  if (t?.gp) {
    e.addFields({ name: '📈 Tracked record', value: `**${t.gp}** played · **${t.w}**W **${t.d}**D **${t.l}**L · GF **${t.gf}** GA **${t.ga}**` });
  } else {
    e.addFields({ name: '📈 Tracked record', value: 'Not tracked yet. Use `/match track` to start building season stats.' });
  }
  return e;
}

// 3) Players: standout performers this match and the tracked averages.
export async function playerStats(st, m) {
  const e = frame(m, 'players');
  const top = m.home.players.slice(0, 5).map((p) =>
    `${ratingDot(p.rating)} **${p.name}** \`${r1(p.rating)}\`${p.mom ? ` ${EMBLEM.mom}` : ''}${p.goals ? ` ${EMBLEM.goal}×${p.goals}` : ''}${p.assists ? ` ${EMBLEM.assist}×${p.assists}` : ''}`);
  e.setDescription(top.join('\n') || 'No player data for this match.');
  const season = await st.playerTotals(m.home.id, 8);
  if (season.length) {
    e.addFields({ name: '📈 Tracked averages', value: code([`${pad('NAME', 12)} GP  AVG   G  A`, ...season.map((p) => `${pad(p.player, 12)} ${rpad(p.gp, 2)} ${rpad(p.avg.toFixed(2), 5)} ${rpad(p.g, 2)} ${rpad(p.a, 2)}`)]) });
  }
  return e;
}


export async function render(st, m, view = 'box') {
  const id = (x) => `ml:${x}:${m.home.id}:${m.id}`;
  const e = view === 'club' ? await clubStats(st, m) : view === 'players' ? await playerStats(st, m) : boxScore(m);
  return { embeds: [e.toJSON()], components: [row(...VIEWS.map((x) => button({ id: id(x), label: LABEL[x][0], emoji: LABEL[x][1], style: x === view ? 3 : 2, disabled: x === view })))] };
}

export function clubPicker(clubs, query) {
  return new Embed().setColor(theme.green).setTitle(`Clubs matching “${query}”`).setFooter({ text: theme.name })
    .setDescription(clubs.map((c, i) => `**${i + 1}.** ${c.name} · \`${c.id}\``).join('\n') || 'No clubs found.')
    .setThumbnail(crestUrl(clubs[0]?.crest)).toJSON();
}
