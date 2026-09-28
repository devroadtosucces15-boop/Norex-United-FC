// P7.2 Personal results in Discord. Result messages carry a "Show my match" select menu (pick a player) and a
// "My match" button (uses the member's approved claim). Either answers with an ephemeral card: rating, goals,
// assists, passes, tackles vs the player's average, plus their rating-dot history.
//
// Custom IDs: norex:mm:<matchId> (select, value = player key) · norex:mme:<matchId> (button).
// Pure functions + one handler – scripts/fetch.mjs imports matchComponents() for the auto-posted results.
// Only bot-sent messages can carry these (Discord ignores interactive components on plain webhooks).

export const RES_COLOR = { W: 0x22c55e, D: 0xeab308, L: 0xef4444 };
const RES_WORD = { W: '✅ Win', D: '➖ Draw', L: '❌ Defeat' };
const dot = (r) => (r >= 8 ? '🟢' : r >= 7 ? '🟡' : r >= 6 ? '🟠' : '🔴');
const r1 = (v) => (+v || 0).toFixed(1);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

// players: [{ k, n, r, g, a }] of our side in that match. matchUrl: the site's match page (link button).
export function matchComponents(matchId, players, matchUrl) {
  const list = [...players].sort((a, b) => (+b.r || 0) - (+a.r || 0)).slice(0, 25);
  const rows = [];
  if (list.length) rows.push({ type: 1, components: [{
    type: 3, custom_id: `norex:mm:${matchId}`.slice(0, 100), placeholder: '📊 Show my match – pick your player', min_values: 1, max_values: 1,
    options: list.map((p) => ({
      label: String(p.n || p.k).slice(0, 100), value: String(p.k).slice(0, 100), emoji: { name: dot(+p.r || 0) },
      description: `Rating ${r1(p.r)}${p.g ? ` · ⚽ ${p.g}` : ''}${p.a ? ` · 🎯 ${p.a}` : ''}`.slice(0, 100),
    })),
  }] });
  const buttons = [{ type: 2, style: 1, custom_id: `norex:mme:${matchId}`.slice(0, 100), label: 'My match', emoji: { name: '🙋' } }];
  if (matchUrl) buttons.push({ type: 2, style: 5, url: matchUrl, label: 'Match page', emoji: { name: '📋' } });
  rows.push({ type: 1, components: buttons });
  return rows;
}

// One line "this match vs usual": ▲ / ▼ / = against the average.
function vs(val, avg, dec = 1, unit = '') {
  if (avg == null || !Number.isFinite(+avg)) return '';
  const d = +val - +avg;
  const arrow = Math.abs(d) < (dec ? 0.05 : 0.5) ? '＝' : d > 0 ? '▲' : '▼';
  return ` · avg ${(+avg).toFixed(dec)}${unit} ${arrow}`;
}

// The ephemeral card for one player in one match. m = club.json match, p = players.json entry (may be missing).
export function personalEmbed(m, line, p, club, site, { mine = false } = {}) {
  const s = p?.s && p.s.gp ? p.s : null;
  const perGame = (v) => (s ? (+v || 0) / s.gp : null);
  const passPct = pct(line.pm, line.pa), tacklePct = pct(line.tm, line.ta);
  const fields = [
    { name: `${dot(line.r)} Rating`, value: `**${r1(line.r)}**${vs(line.r, s?.r)}${line.mom ? '\n⭐ **Man of the match**' : ''}`, inline: true },
    { name: '⚽ Goals · 🎯 Assists', value: `**${line.g ?? 0}** · **${line.a ?? 0}**${s ? `\navg ${perGame(s.g).toFixed(2)} · ${perGame(s.a).toFixed(2)} per game` : ''}`, inline: true },
  ];
  if (line.pa != null) fields.push({ name: '🅿️ Passes', value: `**${line.pm}/${line.pa}**${passPct != null ? ` (${passPct}%)` : ''}${passPct != null ? vs(passPct, s?.p, 0, '%') : ''}`, inline: true });
  if (line.ta != null) fields.push({ name: '🛡️ Tackles', value: `**${line.tm}/${line.ta}**${tacklePct != null ? ` (${tacklePct}%)` : ''}${tacklePct != null ? vs(tacklePct, s?.t, 0, '%') : ''}`, inline: true });
  if (line.sh) fields.push({ name: '🥅 Shots', value: `**${line.sh}**${line.g ? ` · ${pct(line.g, line.sh)}% scored` : ''}`, inline: true });
  if (line.sv) fields.push({ name: '🧤 Saves', value: `**${line.sv}**`, inline: true });
  const tr = (p?.tr ?? []).slice(-10);
  if (tr.length) {
    const best = Math.max(...tr);
    fields.push({ name: `📈 Last ${tr.length} ratings (oldest → newest)`, value: `${tr.map(dot).join('')}\n${tr.map(r1).join(' · ')}\nBest **${r1(best)}**${s ? ` · season avg **${r1(s.r)}**` : ''}` });
  }
  return {
    author: mine ? { name: '✅ Your verified player' } : undefined,
    title: `${line.n} · ${club.name} ${m.gf}–${m.ga} ${m.opp}`.slice(0, 256),
    url: `${site}players/${encodeURIComponent(line.k)}.html`,
    color: RES_COLOR[m.res],
    thumbnail: m.oppCrest ? { url: m.oppCrest } : undefined,
    description: `${RES_WORD[m.res] ?? ''}${line.pos ? ` · ${line.pos[0].toUpperCase()}${line.pos.slice(1)}` : ''} · <t:${m.ts}:R> · [match page](${m.url})`,
    fields,
    footer: { text: '🟢 8+  🟡 7+  🟠 6+  🔴 under 6 · only you can see this', icon_url: club.crest },
  };
}

const eph = (data) => ({ type: 4, data: { flags: 64, allowed_mentions: { parse: [] }, ...data } });

// Component interaction handler. deps: { load(file), claimOf(userId) → player key | null, allowed(i) → bool }.
export async function matchInteraction(i, site, deps) {
  const [, kind, matchId] = String(i.data?.custom_id ?? '').split(':');
  if (!deps.allowed(i)) return eph({ content: '🔒 **Show my match** is being tested by the club staff – coming soon!' });
  const club = await deps.load('club');
  const m = club.matches.find((x) => x.id === matchId);
  if (!m) return eph({ content: `🗂️ That match isn't on the site yet (it lands a few minutes after the final whistle) or is too old for a quick card – ${site}matches/${encodeURIComponent(matchId)}.html` });
  let key, mine = false;
  const uid = i.member?.user?.id ?? i.user?.id;
  const claimed = uid ? await deps.claimOf(uid) : null;
  if (kind === 'mm') {
    key = String(i.data.values?.[0] ?? '');
    mine = !!claimed && claimed === key;
  } else if (kind === 'mme') {
    if (!claimed) return eph({ content: `🙋 You haven't linked your player yet. Claim it in the Squad Hub (${site}members.html#me) – until then, pick your name in the **📊 Show my match** menu.` });
    key = claimed;
    mine = true;
  } else return eph({ content: 'Unknown button.' });
  const line = (m.ps ?? []).find((x) => x.k === key);
  const players = await deps.load('players');
  const p = players.find((x) => x.k === key);
  if (!line) return eph({ content: `📋 **${p?.n ?? 'That player'}** didn't play in this match.${p?.tr?.length ? ` Last rating: ${dot(p.tr.at(-1))} **${r1(p.tr.at(-1))}**.` : ''}` });
  return eph({ embeds: [personalEmbed(m, line, p, club, site, { mine })] });
}
