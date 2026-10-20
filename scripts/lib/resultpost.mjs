// The auto-posted result of a new home match (design system: score card on top, goals/assists/MOTM, field view of ratings, buttons).
// Used by scripts/post-results.mjs, which runs after the site build and the Discord cards so the pictures exist; scripts/fetch.mjs
// calls it straight away only when posts aren't deferred (no cards then – the same layout without the pictures).
import fs from 'node:fs';
import path from 'node:path';
import { loadBotSettings, num } from '../lib.mjs';
import { matchComponents } from '../../bot/matchcard.js';
import { message, header, facts, footer, resultAccent, cards, label } from '../../bot/ui.js';
import { it } from '../../bot/icons.js';

// New home results → Discord. With the bot token and the discordMatch flag on for members/public, each result is
// posted by the bot into the webhook's channel with the P7.2 "Show my match" menu (plain webhooks can't carry
// interactive components); if that fails, or otherwise, it goes through the webhook as before.
// matches: raw EA matches (newest last). drawn: { dir, manifest } of site/cards + site/api/cards.json, or null.
export async function postResults(matches, { config, homeId, hidden = [], drawn = null }) {
  const hook = process.env.DISCORD_WEBHOOK;
  if (!hook || !matches.length) return;
  const settings = await loadBotSettings(config); // P7.5 – result channel override, ping role, emoji, on/off
  if (!settings.autoPosts.results) return;
  const site = config.siteUrl?.replace(/\/?$/, '/') ?? '';
  const crestCdn = 'https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l';
  const hide = new Set([...(config.hiddenPlayers || []), ...hidden].map((h) => String(h).toLowerCase()));
  const items = matches
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-10)
    .map((m) => {
      const us = m.clubs[homeId];
      const oppId = Object.keys(m.clubs).find((k) => k !== homeId);
      const opp = m.clubs[oppId];
      const res = us.wins === '1' ? 'W' : us.losses === '1' ? 'L' : 'D';
      const ourIds = Object.entries(m.players?.[homeId] || {}).filter(([pid, p]) => !hide.has(pid.toLowerCase()) && !hide.has(String(p.playername).toLowerCase()));
      const ours = ourIds.map(([, p]) => p);
      const list = (f) => ours.filter((p) => num(p[f]) > 0).map((p) => `${p.playername}${num(p[f]) > 1 ? ` ×${p[f]}` : ''}`).join('\n');
      const motm = Object.values(m.players || {}).flatMap((l) => Object.values(l)).find((p) => p.mom === '1');
      const best = [...ours].sort((a, b) => num(b.rating) - num(a.rating))[0];
      const oppCrest = opp.details?.customKit?.crestAssetId;
      const url = site ? `${site}matches/${m.matchId}.html` : undefined;
      const components = matchComponents(m.matchId, ourIds.map(([k, p]) => ({ k, n: p.playername, r: num(p.rating), g: num(p.goals), a: num(p.assists) })), url);
      const clubName = us.details?.name ?? 'NOREX';
      // Drawn pictures are attached to the post itself (attachment://), so nothing has to be deployed before Discord can show them.
      const files = [];
      const pic = (kind, alt) => {
        const file = drawn?.manifest?.match?.[m.matchId]?.[kind];
        if (!file || !fs.existsSync(path.join(drawn.dir, file))) return null;
        files.push({ name: `${kind}-${m.matchId}.png`, path: path.join(drawn.dir, file) });
        return { url: `attachment://${kind}-${m.matchId}.png`, alt };
      };
      const scoreImg = pic('score', `${us.details?.name ?? 'NOREX'} ${us.goals}–${opp.goals} ${opp.details?.name ?? oppId}`);
      const fieldImg = pic('field', 'Our players on the pitch with their match ratings');
      const panel = (ping, mentions) => message({ accent: resultAccent(res), ping, mentions, blocks: [
        header({
          eyebrow: `${clubName} · Match centre · ${m.matchType === 'playoffMatch' ? 'Playoff' : 'League'}`,
          title: `${settings.emoji ? `${settings.emoji} ` : ''}${clubName} ${us.goals}–${opp.goals} ${opp.details?.name ?? oppId}`,
          sub: `<t:${m.timestamp}:f> · ${{ W: 'Win', D: 'Draw', L: 'Defeat' }[res]}`,
          thumb: res === 'L' && oppCrest ? `${crestCdn}${oppCrest}.png` : site ? `${site}assets/crest.png` : undefined,
        }),
        cards(scoreImg),
        facts([[`${it('goal')} Goals`, list('goals').replace(/\n/g, ', ')], [`${it('assist')} Assists`, list('assists').replace(/\n/g, ', ')], [`${it('motm')} Man of the match`, motm ? `${motm.playername} (${num(motm.rating).toFixed(1)})` : ''], ['📈 Top rated', best ? `${best.playername} (${num(best.rating).toFixed(1)})` : '']]),
        fieldImg ? label('Field view · ratings') : null,
        cards(fieldImg),
        footer(fieldImg ? 'Gold = man of the match · green 7+ · orange 6–6.9 · red under 6 · pick your name below to see your own match' : 'Pick your name below to see your own match'),
        ...components,
      ] });
      return { components, files, panel, embed: {
        title: `${settings.emoji ? `${settings.emoji} ` : ''}${us.details?.name ?? 'NOREX'} ${us.goals}–${opp.goals} ${opp.details?.name ?? oppId}`,
        url,
        color: { W: 0x22c55e, D: 0xeab308, L: 0xef4444 }[res],
        description: res === 'W' ? '✅ **Victory**' : res === 'L' ? '❌ **Defeat**' : '➖ **Draw**',
        thumbnail: { url: res === 'L' && oppCrest ? `${crestCdn}${oppCrest}.png` : `${site}assets/crest.png` },
        fields: [
          list('goals') && { name: '⚽ Goals', value: list('goals'), inline: true },
          list('assists') && { name: '🎯 Assists', value: list('assists'), inline: true },
          motm && { name: '⭐ Man of the match', value: `${motm.playername} (${num(motm.rating).toFixed(1)})`, inline: true },
          best && { name: '📈 Our top rated', value: `${best.playername} (${num(best.rating).toFixed(1)})`, inline: true },
        ].filter(Boolean),
        timestamp: new Date(m.timestamp * 1000).toISOString(),
        footer: { text: m.matchType === 'playoffMatch' ? 'Playoff match' : 'League match' },
      } };
    });
  let rest = items;
  const token = process.env.DISCORD_BOT_TOKEN;
  // A "role" equal to the server's own ID is @everyone: <@&id> renders as "@@everyone" and pings nobody, so say it the way Discord expects.
  const everyone = !!settings.pingRole && settings.pingRole === settings.guildId;
  const pingContent = everyone ? '@everyone' : settings.pingRole ? `<@&${settings.pingRole}>` : undefined;
  const allowedMentions = everyone ? { parse: ['everyone'] } : settings.pingRole ? { roles: [settings.pingRole] } : { parse: [] };
  // One post of one result card into one channel (pictures ride along as attachments).
  const send = (channel, { panel, files }, content, allowed) => {
    const payload = panel(content, allowed);
    let body, headers = { Authorization: `Bot ${token}` };
    if (files.length) {
      body = new FormData();
      body.set('payload_json', JSON.stringify(payload));
      files.forEach((f, k) => body.set(`files[${k}]`, new Blob([fs.readFileSync(f.path)], { type: 'image/png' }), f.name));
    } else { body = JSON.stringify(payload); headers['Content-Type'] = 'application/json'; }
    return fetch(`https://discord.com/api/v10/channels/${channel}/messages`, { method: 'POST', headers, body }).catch((e) => ({ ok: false, status: e.message }));
  };
  const botOn = token && ['members', 'public'].includes(settings.flags?.discordMatch ?? config.features?.discordMatch); // live Boardroom switch first, committed config as the fallback
  const webhookChannel = () => fetch(hook).then((r) => (r.ok ? r.json() : null)).then((w) => w?.channel_id).catch(() => null);
  // The owner's routing rules (Boardroom → Control Center → Match result posted): where each result goes and whom it tags.
  // Rules exist = only those targets; every rule switched off = nothing is posted. No rules = the old behaviour below.
  const rr = settings.resultRoutes;
  if (rr?.managed) {
    if (!rr.targets.length) return;
    if (botOn) {
      const fallback = settings.resultChannel || await webhookChannel();
      for (const t of rr.targets) {
        const channel = t.channel || fallback;
        const content = t.method === 'everyone' ? '@everyone' : t.role ? `<@&${t.role}>` : undefined;
        const allowed = t.method === 'everyone' ? { parse: ['everyone'] } : t.role ? { roles: [t.role] } : { parse: [] };
        for (const item of rest) {
          const r = channel ? await send(channel, item, content, allowed) : { ok: false, status: 'no channel' };
          if (!r.ok) { console.warn(`Routed result post failed (${r.status}) in ${channel || 'no channel'} – the bot needs View Channel + Send Messages + Embed Links there.`); break; }
        }
      }
      return;
    }
  }
  if (botOn) {
    // P7.5: a configured result channel overrides the webhook's own channel (still needs the bot token to redirect).
    const channel = settings.resultChannel || await webhookChannel();
    while (channel && rest.length) {
      const r = await send(channel, rest[0], pingContent, allowedMentions);
      if (!r.ok) { console.warn(`Bot post failed (${r.status}) – the bot needs View Channel + Send Messages + Embed Links there. Using the webhook.`); break; }
      rest = rest.slice(1);
    }
  }
  if (!rest.length) return;
  await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'NOREX UNITED', avatar_url: site ? `${site}assets/crest.png` : undefined, content: pingContent, embeds: rest.map((x) => x.embed), allowed_mentions: allowedMentions }),
  }).catch((e) => console.warn('Discord post failed:', e.message));
}

