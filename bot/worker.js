// NOREX UNITED Discord bot – runs on Cloudflare Workers (free, always on, no PC needed).
// Discord sends slash-command "interactions" here over HTTPS; we answer from the site's JSON API.
//
// It also runs a timer (see wrangler.toml) that asks GitHub to run the site update every
// 10 minutes, because GitHub's own schedule is often delayed.
//
// Env (set by .github/workflows/bot.yml):
//   GH_DISPATCH_TOKEN  – GitHub token allowed to run this repo's Actions (secret)
//   DISCORD_PUBLIC_KEY, SITE_URL, GITHUB_REPO – public values in wrangler.toml

const RES_COLOR = { W: 0x22c55e, D: 0xeab308, L: 0xef4444 };
const RES_EMOJI = { W: '🟩', D: '🟨', L: '🟥' };

export default {
  async scheduled(event, env, ctx) {
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
    if (request.method === 'GET') return new Response('NOREX UNITED bot is running ⚽');
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = await request.text();
    if (!(await verify(request, body, env.DISCORD_PUBLIC_KEY))) return new Response('Bad signature', { status: 401 });
    const i = JSON.parse(body);

    if (i.type === 1) return json({ type: 1 }); // PING
    const site = (env.SITE_URL || '').replace(/\/?$/, '/');
    if (i.type === 4) return json({ type: 8, data: { choices: await autocomplete(i, site, ctx) } });
    if (i.type === 2) {
      try {
        return json({ type: 4, data: await command(i.data, site, ctx) });
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

const json = (obj) => new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } });

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
      const players = (await load(site, 'players', ctx)).filter((p) => p.home && p.s);
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
      return { content: `🌐 ${club.url}` };
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
  const trend = p.tr?.length ? p.tr.slice(-10).map((r) => (r >= 8 ? '🟩' : r >= 7 ? '🟢' : r >= 6 ? '🟧' : '🟥')).join('') : null;
  return {
    title: `${p.n}${p.ovr ? ` · ${p.ovr} OVR` : ''}`, url: `${site}players/${encodeURIComponent(p.k)}.html`,
    color: parseInt(club.color.slice(1), 16), thumbnail: p.crest ? { url: p.crest } : undefined,
    description: `**${p.pos}** · ${p.c.join(', ')}`,
    fields: [
      s && { name: `Club stats (${p.c[0]})`, value: `${s.gp} games · **${s.g}** goals · **${s.a}** assists\nRating **${s.r}** · MOTM ${s.m} · Win ${s.w}%\nPass ${s.p}% · Tackle ${s.t}%`, inline: true },
      c && { name: 'Career (all clubs)', value: `${c.gp} games\n**${c.g}** goals · **${c.a}** assists\nRating **${c.r}** · MOTM ${c.m}`, inline: true },
      trend && { name: 'Recent match ratings', value: trend },
    ].filter(Boolean),
    footer,
  };
}
