// Burner-club tracker – the bot side (the data side is scripts/fetch.mjs → data/burners/, the page is
// scripts/burners-page.mjs → site/burners.html).
//
//   /burner search <club>  managers: ask EA for clubs matching a name (or an ID), pick one from a menu → tracked
//   /burner track  <club>  managers: track straight away by exact name or ID (falls back to the menu if unsure)
//   /burner list           managers: tracked clubs with their record so far
//   /burner remove         managers: menu to stop tracking one
//   GET /api/burners/tracked   keyed (X-Norex-Key, same shared-secret pattern as /api/overrides + /api/crawl)
//                              – the clubs fetch.mjs should follow: [{ id, name, crest, channel, at }]
//
// Tracking only writes a row; the next site update (≈10 min, or right away – we kick one off) collects the club's
// squad, history and matches, and every game it plays after that gets a stats report in the channel the club was
// tracked from. Gated by the `burners` flag + the `burners.manage` permission (managers).
import { can, flagOn } from './roles.js';
import { eaGet } from './clublookup.js';
import { MAX_BURNERS } from './burnerstats.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const reply = (content, extra = {}) => json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] }, ...extra } });
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const RED = 0xc8352c;

export async function burnersKey(secret) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:norex-burners`));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function burnersRoute(request, env) {
  if (!env.DISCORD_CLIENT_SECRET || request.headers.get('X-Norex-Key') !== await burnersKey(env.DISCORD_CLIENT_SECRET)) return json({ error: 'Forbidden' }, 403);
  if (request.method !== 'GET' || !env.DB) return json({ error: 'Not found' }, 404);
  const rows = await all(env, 'SELECT club_id, name, crest, channel_id, added_at FROM burner_clubs WHERE active = 1 ORDER BY added_at LIMIT ?', MAX_BURNERS);
  return json({ burners: rows.map((r) => ({ id: r.club_id, name: r.name, crest: r.crest, channel: r.channel_id, at: r.added_at })) });
}

// ---------- EA search ----------
// A name goes to EA's all-time leaderboard search (finds clubs the moment they've played a game); an ID to clubs/info.
// → [{ id, name, crest, gp, w, d, l, gf, ga, div }]
export async function searchClubs(q) {
  q = String(q ?? '').trim().slice(0, 40);
  if (/^\d{1,12}$/.test(q)) {
    const c = (await eaGet('clubs/info', { clubIds: q }))?.[q];
    return c?.name ? [{ id: q, name: c.name, crest: c.customKit?.crestAssetId ?? null }] : [];
  }
  const hits = await eaGet('allTimeLeaderboard/search', { clubName: q });
  const n = (v) => Number(v) || 0;
  return (Array.isArray(hits) ? hits : [])
    .map((h) => ({
      id: String(h.clubId ?? ''), name: h.clubInfo?.name ?? h.name ?? '', crest: h.clubInfo?.customKit?.crestAssetId ?? null,
      gp: n(h.gamesPlayed), w: n(h.wins), d: n(h.ties), l: n(h.losses), gf: n(h.goals), ga: n(h.goalsAgainst), div: n(h.bestDivision) || null,
    }))
    .filter((c) => /^\d{1,12}$/.test(c.id) && c.name)
    .sort((a, b) => (b.name.toLowerCase() === q.toLowerCase()) - (a.name.toLowerCase() === q.toLowerCase()) || b.gp - a.gp)
    .slice(0, 10);
}

// ---------- tracking ----------
export async function trackClub(env, club, user, channelId) {
  const active = (await one(env, 'SELECT COUNT(*) AS n FROM burner_clubs WHERE active = 1')).n;
  const was = await one(env, 'SELECT active FROM burner_clubs WHERE club_id = ?', club.id);
  if (!was?.active && active >= MAX_BURNERS) return { error: `You're already tracking ${MAX_BURNERS} burner clubs – remove one first with /burner remove.` };
  await env.DB.prepare(`INSERT INTO burner_clubs (club_id, name, crest, channel_id, added_by, added_by_name, added_at, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT (club_id) DO UPDATE SET name = excluded.name, crest = excluded.crest, channel_id = excluded.channel_id, active = 1, removed_at = NULL,
      added_by = excluded.added_by, added_by_name = excluded.added_by_name, added_at = excluded.added_at`)
    .bind(club.id, String(club.name).slice(0, 80), club.crest ? String(club.crest).slice(0, 20) : null, channelId ? String(channelId) : null, user.id, user.name, Date.now()).run();
  return { ok: true, already: !!was?.active };
}

// Kick the "Update site" workflow so the first collection doesn't wait for the next cron tick.
async function dispatchUpdate(env) {
  if (!env.GH_DISPATCH_TOKEN || !env.GITHUB_REPO) return;
  await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/update.yml/dispatches`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'norex-bot' }, body: JSON.stringify({ ref: 'main' }),
  }).catch(() => {});
}

const trackedMsg = (club, site, already) => `${already ? '✅ Already tracking' : '🔥 Now tracking'} **${club.name}** (club ${club.id}).\n`
  + 'The first collection – squad, history, every match EA still shows – runs in the next couple of minutes, and from then on every game they play gets a stats report **in this channel**.\n'
  + `📋 ${site}burners.html#c${club.id}`;

const who = (i) => { const u = i.member?.user ?? i.user ?? {}; return { id: String(u.id ?? ''), name: String(i.member?.nick || u.global_name || u.username || 'Manager').slice(0, 40) }; };
const record = (c) => (c.gp ? `${c.w}W ${c.d}D ${c.l}L · ${c.gf}–${c.ga}${c.div ? ` · best div ${c.div}` : ''}` : 'no games yet');

// Search results → an embed + a pick menu (clubs already tracked are ticked).
async function pickerBody(env, results, q) {
  const have = new Set((await all(env, 'SELECT club_id FROM burner_clubs WHERE active = 1')).map((r) => r.club_id));
  if (!results.length) return { content: `🔍 EA has no club matching **${q}** yet. A club shows up as soon as it has played one game – try again after their first match, or use their club ID.` };
  return {
    embeds: [{
      title: `🔍 ${results.length} club${results.length === 1 ? '' : 's'} matching “${q}”`, color: RED,
      description: results.map((c) => `${have.has(c.id) ? '✅' : '🔥'} **${c.name}** · \`${c.id}\` · ${record(c)}`).join('\n'),
      footer: { text: 'Pick the right one below – ✅ = already tracked' },
    }],
    components: [{ type: 1, components: [{
      type: 3, custom_id: 'norex:bn:pick', placeholder: '🔥 Pick the club to track', min_values: 1, max_values: 1,
      options: results.map((c) => ({ label: c.name.slice(0, 100), value: c.id, description: `${c.id} · ${record(c)}`.slice(0, 100), emoji: { name: have.has(c.id) ? '✅' : '🔥' } })),
    }] }],
  };
}

const removeMenu = (rows) => ({ type: 1, components: [{
  type: 3, custom_id: 'norex:bn:rm', placeholder: '🗑️ Stop tracking…', min_values: 1, max_values: 1,
  options: rows.map((r) => ({ label: r.name.slice(0, 100), value: r.club_id, description: `club ${r.club_id}`, emoji: { name: '🗑️' } })),
}] });

// ---------- slash command ----------
export function burnerCommand(i, env, ctx, user, site, loadSite) {
  if (!can(user, 'burners.manage') || !flagOn(env, user, 'burners')) return reply('🔒 Managers only (and the burner tracker is not switched on for you yet).');
  if (!env.DB) return reply('⚠️ The member database is not connected.');
  const sub = i.data.options?.[0];
  const q = String(sub?.options?.find((o) => o.name === 'club')?.value ?? '').trim();
  const me = who(i);

  if (sub?.name === 'list' || sub?.name === 'remove') {
    return (async () => {
      const rows = await all(env, 'SELECT club_id, name FROM burner_clubs WHERE active = 1 ORDER BY added_at');
      if (!rows.length) return reply('🔥 No burner clubs tracked yet. Use `/burner search` with the club’s name when someone makes a new one.');
      if (sub.name === 'remove') return reply('Which club should I stop tracking? (Its history stays on file.)', { components: [removeMenu(rows)] });
      const stats = new Map((await loadSite('burners').catch(() => ({ clubs: [] }))).clubs.map((c) => [c.id, c]));
      const lines = rows.map((r) => {
        const s = stats.get(r.club_id);
        return `🔥 **${r.name}** · \`${r.club_id}\` · ${s ? `${s.w}W ${s.d}D ${s.l}L · ${s.gf}–${s.ga}${s.form?.length ? ` · ${s.form.slice(0, 5).join('')}` : ''}` : '⏳ first collection pending'}`;
      });
      return reply('', { embeds: [{ title: `🔥 Burner clubs (${rows.length}/${MAX_BURNERS})`, color: RED, description: lines.join('\n'), url: `${site}burners.html`, footer: { text: 'Full stats on the Burner clubs page · /burner remove to stop tracking' } }] });
    })();
  }
  if (!['search', 'track'].includes(sub?.name) || q.length < 2) return reply('⚠️ Give me a club name (or club ID) to look up.');

  // EA can take longer than Discord's 3 seconds → deferred, then the answer is patched in.
  ctx.waitUntil((async () => {
    let body;
    try {
      const results = await searchClubs(q);
      const exact = results.filter((c) => c.id === q || c.name.toLowerCase() === q.toLowerCase());
      if (sub.name === 'track' && exact.length === 1) {
        const r = await trackClub(env, exact[0], me, i.channel_id);
        body = r.error ? { content: `⚠️ ${r.error}` } : { content: trackedMsg(exact[0], site, r.already) };
        if (r.ok) await dispatchUpdate(env);
      } else {
        body = await pickerBody(env, results, q);
      }
    } catch (e) {
      body = { content: `⚠️ Could not reach EA: ${e.message}` };
    }
    await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${i.token}/messages/@original`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allowed_mentions: { parse: [] }, ...body }),
    }).catch((e) => console.log('burner reply failed', e.message));
  })());
  return json({ type: 5, data: { flags: 64 } });
}

// ---------- the pick menus (custom_id norex:bn:pick | norex:bn:rm) ----------
export async function burnerPick(i, env, ctx, user) {
  if (!can(user, 'burners.manage') || !flagOn(env, user, 'burners')) return reply('🔒 Managers only.');
  const id = String(i.data?.values?.[0] ?? '');
  if (!/^\d{1,12}$/.test(id)) return reply('⚠️ Unknown club.');
  const update = (content) => json({ type: 7, data: { content, embeds: [], components: [], allowed_mentions: { parse: [] } } });
  const site = (env.SITE_URL || '').replace(/\/?$/, '/');
  if (i.data.custom_id === 'norex:bn:rm') {
    const row = await one(env, 'SELECT name FROM burner_clubs WHERE club_id = ? AND active = 1', id);
    if (!row) return update('⚠️ That club is not being tracked.');
    await env.DB.prepare('UPDATE burner_clubs SET active = 0, removed_at = ? WHERE club_id = ?').bind(Date.now(), id).run();
    return update(`🗑️ Stopped tracking **${row.name}**. Its history stays on the page until the next cleanup – /burner search brings it back.`);
  }
  const club = (await searchClubs(id))[0];
  if (!club) return update('⚠️ EA could not find that club right now – try again in a moment.');
  const r = await trackClub(env, club, who(i), i.channel_id);
  if (r.error) return update(`⚠️ ${r.error}`);
  ctx.waitUntil(dispatchUpdate(env));
  return update(trackedMsg(club, site, r.already));
}
