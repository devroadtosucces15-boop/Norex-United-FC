// NOREX UNITED Discord bot – runs on Cloudflare Workers (free, always on, no PC needed).
// Discord sends slash-command "interactions" here over HTTPS; we answer from the site's JSON API.
//
// It also runs a timer (see wrangler.toml) that asks GitHub to run the site update every
// 10 minutes, because GitHub's own schedule is often delayed.
//
// Env (set by .github/workflows/bot.yml):
//   GH_DISPATCH_TOKEN  – GitHub token allowed to run this repo's Actions (secret)
//   DISCORD_BOT_TOKEN  – bot token: DMs (P7.1), Verified role sync (P2.5), Club Intelligence server reads (secret)
//   DISCORD_PUBLIC_KEY, SITE_URL, GITHUB_REPO – public values in wrangler.toml

import { handleMembers } from './members.js';
import { updateLive } from './live.js';
import { notifyCron } from './notify.js';
import { eventReminders } from './events.js';
import { closeDue } from './awards.js';
import { hotwDue } from './hotw.js';
import { scoreDue } from './predict.js';
import { eventButton, memberCommand, MEMBER_COMMANDS } from './botcmds.js';
import { insightsCron, insightsNow, reportEmbeds } from './insights.js';
import { matchComponents, matchInteraction } from './matchcard.js';
import { ROLE_HELP, syncAll } from './discordroles.js';
import { can, discordRole, flagOn } from './roles.js';
import { mediaCron, serveMedia } from './media.js';

const RES_COLOR = { W: 0x22c55e, D: 0xeab308, L: 0xef4444 };
const RES_EMOJI = { W: '🟩', D: '🟨', L: '🟥' };

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(updateLive(env).catch((e) => console.log('live check failed', e.message))); // P1.3 live banner
    ctx.waitUntil(eventReminders(env).then(() => closeDue(env)).then(() => hotwDue(env)).then(() => scoreDue(env)).then(() => notifyCron(env)).catch((e) => console.log('notify cron failed', e.message))); // P3.3 event reminders, P4.1 awards, P6.2 highlight of the week, P3.8 predictions, then P7.1 DMs + reminders
    ctx.waitUntil(mediaCron(env).catch((e) => console.log('media guard failed', e.message))); // P6.1b R2 storage guard (hourly)
    const site = (env.SITE_URL || '').replace(/\/?$/, '/');
    if (flagOn(env, { role: 'owner' }, 'insights')) ctx.waitUntil(insightsCron(env, (file) => load(site, file, ctx)).catch((e) => console.log('insights cron failed', e.message))); // weekly Club Intelligence DM
    if (!env.GH_DISPATCH_TOKEN || !env.GITHUB_REPO) return;
    const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/update.yml/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'norex-bot',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (!res.ok) console.log('GitHub dispatch failed', res.status, await res.text());
  },

  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/crest/')) return crestProxy(path, ctx);
    if (path.startsWith('/media/')) return serveMedia(request, env, path.slice(7)); // P6.1b feed photos/clips (R2)
    if (path.startsWith('/auth/') || path.startsWith('/api/')) {
      const site = (env.SITE_URL || '').replace(/\/?$/, '/');
      return handleMembers(request, env, ctx, (file) => load(site, file, ctx));
    }
    if (request.method === 'GET') return new Response('NOREX UNITED bot is running ⚽');
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = await request.text();
    if (!(await verify(request, body, env.DISCORD_PUBLIC_KEY))) return new Response('Bad signature', { status: 401 });
    const i = JSON.parse(body);

    if (i.type === 1) return json({ type: 1 }); // PING
    const site = (env.SITE_URL || '').replace(/\/?$/, '/');
    if (i.type === 4) return json({ type: 8, data: { choices: await autocomplete(i, site, ctx) } });
    const who = discordUser(env, i);
    if (i.type === 3 && /^norex:mme?:/.test(i.data?.custom_id ?? '')) { // P7.2 "Show my match" menu + "My match" button
      try {
        return json(await matchInteraction(i, site, {
          load: (f) => load(site, f, ctx),
          claimOf: (uid) => (env.DB ? env.DB.prepare("SELECT player FROM claims WHERE user_id = ? AND status = 'approved'").bind(uid).first('player') : null),
          allowed: () => flagOn(env, who, 'discordMatch'),
        }));
      } catch (e) {
        return json({ type: 4, data: { content: `⚠️ ${e.message}`, flags: 64 } });
      }
    }
    if (i.type === 2 && i.data.name === 'syncroles') return syncRolesCommand(i, env, ctx, site, who);
    if (i.type === 3 && /^norex:ev:\d+:\w+$/.test(i.data?.custom_id ?? '')) { // P3.3 ✅ ❔ ❌ on event posts
      try { return json(await eventButton(i, env, who)); } catch (e) { return json({ type: 4, data: { content: `⚠️ ${e.message}`, flags: 64 } }); }
    }
    if (i.type === 2 && MEMBER_COMMANDS.has(i.data.name)) { // P7.4 commands that read the member database
      try {
        const loadSite = (f) => load(site, f, ctx);
        const club = await loadSite('club');
        const footer = { text: `${club.name} · updates every 15 min`, icon_url: club.crest };
        return json(await memberCommand(i, env, who, site, {
          load: loadSite, playerEmbed: (p) => playerEmbed(p, club, site, footer),
          top: async (stat) => ({ type: 4, data: await command({ name: 'top', options: [{ name: 'stat', value: stat }] }, site, ctx) }),
        }));
      } catch (e) {
        return json({ type: 4, data: { content: `⚠️ ${e.message}`, flags: 64 } });
      }
    }
    if (i.type === 2 && i.data.name === 'insights') return insightsCommand(i, env, ctx, site, who);
    if (i.type === 2) {
      try {
        const data = await command(i.data, site, ctx);
        // P7.2: /last gets the same "Show my match" controls as the auto-posted result.
        if (i.data.name === 'last' && data.embeds && flagOn(env, who, 'discordMatch')) {
          const m = (await load(site, 'club', ctx)).matches[0];
          if (m?.ps?.length) data.components = matchComponents(m.id, m.ps, m.url);
        }
        return json({ type: 4, data });
      } catch (e) {
        return json({ type: 4, data: { content: `⚠️ ${e.message}`, flags: 64 } });
      }
    }
    return new Response('Unhandled', { status: 400 });
  },
};

// ---------- Discord signature check (Ed25519) ----------
async function verify(req, body, publicKey) {
  const sig = req.headers.get('X-Signature-Ed25519');
  const ts = req.headers.get('X-Signature-Timestamp');
  if (!sig || !ts || !publicKey) return false;
  const hexToBytes = (h) => new Uint8Array(h.match(/.{2}/g).map((b) => parseInt(b, 16)));
  try {
    const key = await crypto.subtle.importKey('raw', hexToBytes(publicKey), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, hexToBytes(sig), new TextEncoder().encode(ts + body));
  } catch {
    return false;
  }
}

// The Discord user behind an interaction, as a permissions user (roles only – `claimed` is not needed here).
function discordUser(env, i) {
  const u = i.member?.user ?? i.user;
  return { u: u?.id, role: u?.id ? discordRole(env, u.id, i.member?.roles ?? []) : 'guest' };
}

// ---------- P2.5 /syncroles (managers): re-sync the ✅ Verified role for every decided claim ----------
// Deferred reply (type 5) – the Discord calls can take longer than the 3-second limit – then the result is patched in.
function syncRolesCommand(i, env, ctx, site, who) {
  if (!can(who, 'roles.sync') || !flagOn(env, who, 'roleSync')) return json({ type: 4, data: { content: '🔒 Managers only (and role sync is not switched on for you yet).', flags: 64 } });
  if (!env.DB) return json({ type: 4, data: { content: '⚠️ The member database is not connected.', flags: 64 } });
  ctx.waitUntil((async () => {
    let content;
    try {
      const r = await syncAll(env, (f) => load(site, f, ctx));
      content = r.error && !r.added && !r.removed
        ? `⚠️ Role sync failed.\n${ROLE_HELP[r.error] ?? r.error}`
        : [`🪪 **Role sync done** – ✅ Verified given to **${r.added}**, taken from **${r.removed}**${r.failed ? ` · ⚠️ ${r.failed} failed` : ''}.`,
          r.positions?.length ? `📍 Position roles used: ${r.positions.join(', ')}` : '📍 No GK / DEF / MID / FWD roles in the server – only ✅ Verified is used (create them to add positions).',
          r.left ? `⏭️ ${r.left} more to go – run **/syncroles** again.` : '',
          r.error ? ROLE_HELP[r.error] ?? r.error : ''].filter(Boolean).join('\n');
    } catch (e) {
      content = `⚠️ ${e.message}`;
    }
    await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${i.token}/messages/@original`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    }).catch((e) => console.log('syncroles reply failed', e.message));
  })());
  return json({ type: 5, data: { flags: 64 } });
}

// ---------- /insights (managers): Club Intelligence report – Discord server + club data → scores and advice ----------
function insightsCommand(i, env, ctx, site, who) {
  if (!can(who, 'insights.view') || !flagOn(env, who, 'insights')) return json({ type: 4, data: { content: '🔒 Managers only (and Club Intelligence is not switched on for you yet).', flags: 64 } });
  if (!env.DB) return json({ type: 4, data: { content: '⚠️ The member database is not connected.', flags: 64 } });
  ctx.waitUntil((async () => {
    let body;
    try {
      body = { embeds: reportEmbeds(await insightsNow(env, (f) => load(site, f, ctx)), site) };
    } catch (e) {
      body = { content: `⚠️ Could not build the report: ${e.message === 'no-access' ? "the bot can't see the server – check it is still in the server with **View Channels**." : e.message}` };
    }
    await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${i.token}/messages/@original`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, allowed_mentions: { parse: [] } }),
    }).catch((e) => console.log('insights reply failed', e.message));
  })());
  return json({ type: 5, data: { flags: 64 } });
}

const json = (obj) => new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } });

// ---------- club crest proxy (P1.6) ----------
// EA's crest CDN sends no CORS header, so the site can't draw opponent crests onto the result-graphic canvas.
// /crest/<assetId>.png fetches only from that CDN and adds one; cached at the edge for a week.
const CREST_CDN = 'https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l';
async function crestProxy(path, ctx) {
  const id = path.match(/^\/crest\/(\d{1,12})\.png$/)?.[1];
  if (!id) return new Response('Not found', { status: 404 });
  const key = new Request(`https://crest.cache/${id}.png`);
  const hit = await caches.default.match(key);
  if (hit) return hit;
  const r = await fetch(`${CREST_CDN}${id}.png`, { cf: { cacheTtl: 604800 } });
  if (!r.ok || !(r.headers.get('Content-Type') || '').startsWith('image/')) return new Response('Not found', { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
  const res = new Response(r.body, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=604800', 'Access-Control-Allow-Origin': '*' } });
  ctx.waitUntil(caches.default.put(key, res.clone()));
  return res;
}

// ---------- data (cached for 5 minutes at Cloudflare's edge) ----------
async function load(site, file, ctx) {
  const url = `${site}api/${file}.json`;
  const cache = caches.default;
  let res = await cache.match(url);
  if (!res) {
    res = await fetch(url, { cf: { cacheTtl: 300 } });
    if (!res.ok) throw new Error('Could not reach the club site right now.');
    res = new Response(res.body, res);
    res.headers.set('Cache-Control', 'max-age=300');
    ctx.waitUntil(cache.put(url, res.clone()));
  }
  return res.json();
}

async function autocomplete(i, site, ctx) {
  const focused = flatOptions(i.data.options).find((o) => o.focused);
  const q = String(focused?.value ?? '').toLowerCase();
  const players = await load(site, 'players', ctx);
  return players
    .filter((p) => p.n.toLowerCase().includes(q))
    .sort((a, b) => (b.home - a.home) || (b.s?.gp ?? 0) - (a.s?.gp ?? 0))
    .slice(0, 25)
    .map((p) => ({ name: `${p.n}${p.home ? ' ⭐' : ''} · ${p.c[0] ?? ''}`.slice(0, 100), value: p.k }));
}

function flatOptions(opts = []) {
  return opts.flatMap((o) => (o.options ? flatOptions(o.options) : [o]));
}

function findPlayer(players, v) {
  const q = String(v).toLowerCase();
  return players.find((p) => p.k === v) ?? players.find((p) => p.n.toLowerCase() === q) ?? players.find((p) => p.n.toLowerCase().includes(q));
}

// ---------- commands ----------
async function command(data, site, ctx) {
  const opt = Object.fromEntries(flatOptions(data.options).map((o) => [o.name, o.value]));
  const club = await load(site, 'club', ctx);
  const footer = { text: `${club.name} · updates every 15 min`, icon_url: club.crest };

  switch (data.name) {
    case 'club': {
      const gd = club.gf - club.ga;
      return { embeds: [{
        title: club.name, url: club.url, color: parseInt(club.color.slice(1), 16), thumbnail: { url: club.crest },
        description: `**Division ${club.division ?? '–'}** · Skill rating **${club.skill ?? '–'}**${club.streak > 1 ? ` · 🔥 ${club.streak} win streak` : ''}`,
        fields: [
          { name: 'Record', value: `${club.w}W ${club.d}D ${club.l}L (${club.gp} played)`, inline: true },
          { name: 'Goals', value: `${club.gf} scored · ${club.ga} conceded (${gd >= 0 ? '+' : ''}${gd})`, inline: true },
          { name: 'Form (newest last)', value: [...club.form].reverse().map((r) => RES_EMOJI[r]).join('') || '–' },
        ],
        footer,
      }] };
    }
    case 'last': {
      const m = club.matches[0];
      if (!m) return { content: 'No matches archived yet.' };
      return { embeds: [matchEmbed(m, club, footer)] };
    }
    case 'results': {
      const n = Math.min(10, opt.count ?? 5);
      return { embeds: [{
        title: `Last ${n} results`, url: `${club.url}matches/index.html`, color: parseInt(club.color.slice(1), 16), thumbnail: { url: club.crest },
        description: club.matches.slice(0, n).map((m) => `${RES_EMOJI[m.res]} **${m.gf}–${m.ga}** vs [${m.opp}](${m.url})${m.scorers.length ? ` · ⚽ ${m.scorers.map((s) => s.n + (s.g > 1 ? ` ×${s.g}` : '')).join(', ')}` : ''}`).join('\n') || 'No matches yet.',
        footer,
      }] };
    }
    case 'player': {
      const players = await load(site, 'players', ctx);
      const p = findPlayer(players, opt.gamertag);
      if (!p) return { content: `No player called **${opt.gamertag}** found.`, flags: 64 };
      return { embeds: [playerEmbed(p, club, site, footer)] };
    }
    case 'compare': {
      const players = await load(site, 'players', ctx);
      const a = findPlayer(players, opt.player1), b = findPlayer(players, opt.player2);
      if (!a || !b) return { content: 'Could not find both players.', flags: 64 };
      const row = (label, x, y, dec = 0) => {
        const fx = (+x || 0).toFixed(dec), fy = (+y || 0).toFixed(dec);
        return `\`${label.padEnd(10)}\` ${+x > +y ? `**${fx}**` : fx}  —  ${+y > +x ? `**${fy}**` : fy}`;
      };
      return { embeds: [{
        title: `${a.n} vs ${b.n}`, url: `${site}compare.html?a=${encodeURIComponent(a.k)}&b=${encodeURIComponent(b.k)}`, color: parseInt(club.color.slice(1), 16),
        description: [row('OVR', a.ovr, b.ovr), row('Games', a.s?.gp, b.s?.gp), row('Goals', a.s?.g, b.s?.g), row('Assists', a.s?.a, b.s?.a), row('Rating', a.s?.r, b.s?.r, 1), row('MOTM', a.s?.m, b.s?.m), row('Pass %', a.s?.p, b.s?.p), row('Tackle %', a.s?.t, b.s?.t), row('Win %', a.s?.w, b.s?.w)].join('\n'),
        footer: { ...footer, text: 'Club stats (main club) · open the link for the radar chart' },
      }] };
    }
    case 'top': {
      const players = (await load(site, 'players', ctx)).filter((p) => p.home && p.s && p.src === 'club');
      const stat = opt.stat ?? 'goals';
      const F = { goals: ['Top scorers', (p) => p.s.g], assists: ['Most assists', (p) => p.s.a], rating: ['Best average rating (3+ games)', (p) => (p.s.gp >= 3 ? p.s.r : 0), 1], motm: ['Most MOTM awards', (p) => p.s.m], games: ['Most appearances', (p) => p.s.gp], ga: ['Goals + assists', (p) => p.s.g + p.s.a] };
      const [title, f, dec = 0] = F[stat] ?? F.goals;
      const list = players.map((p) => [p, f(p)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const medal = ['🥇', '🥈', '🥉'];
      return { embeds: [{
        title: `${club.name} – ${title}`, url: `${club.url}stats.html`, color: parseInt(club.color.slice(1), 16), thumbnail: { url: club.crest },
        description: list.map(([p, v], i) => `${medal[i] ?? `\`${i + 1}.\``} [${p.n}](${site}players/${encodeURIComponent(p.k)}.html) — **${v.toFixed(dec)}**`).join('\n') || 'No data yet.',
        footer,
      }] };
    }
    case 'site':
      return { embeds: [{
        title: `${club.name} – links`, url: club.url, color: parseInt(club.color.slice(1), 16), thumbnail: { url: club.crest },
        description: [`🌐 **Website:** ${club.url}`, club.apply && `👑 **Trials / apply:** ${club.apply}`].filter(Boolean).join('\n'),
        footer,
      }] };
    default:
      return { content: 'Unknown command.', flags: 64 };
  }
}

function matchEmbed(m, club, footer) {
  return {
    title: `${club.name} ${m.gf}–${m.ga} ${m.opp}`, url: m.url, color: RES_COLOR[m.res], thumbnail: { url: m.res === 'L' ? m.oppCrest : club.crest },
    description: `${m.res === 'W' ? '✅ **Victory**' : m.res === 'L' ? '❌ **Defeat**' : '➖ **Draw**'}`,
    fields: [
      m.scorers.length && { name: '⚽ Scorers', value: m.scorers.map((s) => `${s.n}${s.g > 1 ? ` ×${s.g}` : ''}`).join('\n'), inline: true },
      m.motm && { name: '⭐ Man of the match', value: m.motm, inline: true },
    ].filter(Boolean),
    timestamp: new Date(m.ts * 1000).toISOString(),
    footer,
  };
}

function playerEmbed(p, club, site, footer) {
  const s = p.s, c = p.car;
  const r1 = (v) => (+v || 0).toFixed(1);
  const dot = (r) => (r >= 8 ? '🟢' : r >= 7 ? '🟡' : r >= 6 ? '🟠' : '🔴');
  const recent = (p.tr ?? []).slice(-5).reverse();
  const stats = (x) => `${x.gp} games · **${x.g}** goals · **${x.a}** assists\n⭐ Avg rating **${r1(x.r)}** · MOTM **${x.m}**`;
  const fields = [];
  if (s && s.gp) {
    fields.push({
      name: p.src === 'archive' ? `📋 ${p.sc ?? 'Club'} (from archived matches)` : `📋 ${p.sc ?? 'Club'} this season`,
      value: `${stats(s)}\nPass **${s.p}%** · Tackle **${s.t}%** · Win **${s.w}%**`,
    });
  } else if (p.sc) {
    fields.push({ name: `📋 ${p.sc}`, value: 'No games for this club yet this season.' });
  }
  if (c && c.gp) fields.push({ name: '🌍 Career (every club)', value: stats(c) });
  if (recent.length) {
    const avg = recent.reduce((t, v) => t + v, 0) / recent.length;
    fields.push({
      name: `📈 Last ${recent.length} match ratings (newest first)`,
      value: `${recent.map((r) => `${dot(r)} **${r1(r)}**`).join('  ')}\nAverage **${r1(avg)}** · Best **${r1(Math.max(...recent))}**`,
    });
  }
  return {
    title: `${p.n}${p.ovr ? ` · ${p.ovr} OVR` : ''}`, url: `${site}players/${encodeURIComponent(p.k)}.html`,
    color: parseInt(club.color.slice(1), 16), thumbnail: p.crest ? { url: p.crest } : undefined,
    description: `**${p.pos}** · ${p.c.join(', ')}`,
    fields,
    footer: { ...footer, text: '🟢 8+  🟡 7+  🟠 6+  🔴 under 6 · full profile on the site' },
  };
}
export { ChatRoom } from './chatroom.js'; // P6.3b live chat rooms (Durable Object)
