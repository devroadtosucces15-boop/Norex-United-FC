// Burner-club tracker – the bot side (the data side is scripts/fetch.mjs → data/burners/, the page is
// scripts/burners-page.mjs → site/burners.html).
//
//   /burner search [club]  managers: ask EA for clubs matching a name (or an ID), pick one from a menu → tracked
//   /burner recent         managers: clubs our own players are also in (linked by gamertag) in a pick menu – no typing;
//                          /burner search with no name lists the clubs NOREX has faced instead
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
import { MAX_BURNERS, TYPE_LABEL } from './burnerstats.js';
import { message, header, text, footer, buttons, privateNote } from './ui.js';

const HOME_CLUB = '80869'; // NOREX UNITED FC – overridable with the HOME_CLUB_ID var

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const reply = (content, extra = {}) => (Object.keys(extra).length ? json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] }, ...extra } }) : json(privateNote(content)));
const all = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const RED = 0xc8352c;
// Everything the deferred burner replies edit in is a design-system panel (the layout is declared when the reply is deferred,
// and an edit carries only the components). Private, staff-only → steel.
const IS_V2 = 1 << 15;
const DEFER = () => json({ type: 5, data: { flags: IS_V2 | 64 } });
const panel = (blocks) => message({ ephemeral: true, accent: 'steel', blocks });
const plain = (content) => panel([text(content)]);
// A deferred reply that never gets edited leaves Discord on "thinking…" forever, so every lookup is capped and always answers.
const within = (p, ms = 8000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms / 1000}s – try again in a moment`)), ms))]);
const PATCH_TIMEOUT = 6000;
const edit = (m) => ({ flags: IS_V2, components: m.components, allowed_mentions: { parse: [] } });
const BEAR = (eyebrow, title, lines, foot, menu) => panel([header({ eyebrow: `Staff · ${eyebrow}`, title, size: 3 }), text(lines), footer(foot), menu]);

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

// ---------- club lookup: the site's own data first, EA live only as a fallback ----------
// EA blocks the Worker's network (the same lookup works from GitHub Actions and from a laptop), so searches read what the
// site already knows – every club NOREX has played (api/opponents.json, with the latest result against each) plus the
// discovered-clubs index (api/clubs.json) – both rebuilt every ~10 minutes. EA is tried live only when that has nothing.
const crestOf = (u) => /l(\d+)\.png/.exec(String(u ?? ''))?.[1] ?? null;
async function siteClubs(loadSite) {
  const get = (f) => (loadSite ? Promise.resolve().then(() => loadSite(f)).catch(() => null) : null);
  const [opp, idx] = await Promise.all([get('opponents'), get('clubs')]);
  const clubs = new Map();
  for (const c of Array.isArray(idx) ? idx : []) if (c?.id && c.n) clubs.set(String(c.id), { id: String(c.id), name: c.n, crest: crestOf(c.cr), fromSite: true });
  for (const o of Array.isArray(opp) ? opp : []) if (o?.id && o.n) clubs.set(String(o.id), { id: String(o.id), name: o.n, crest: o.cr ?? clubs.get(String(o.id))?.crest ?? null, fromSite: true });
  return { clubs, opp: Array.isArray(opp) ? opp : [] };
}

// Clubs our own players are also in (the crawl links a club when one of NOREX's gamertags is on its roster) → api/linked.json
// [{ id, n, cr, p: [gamertags] }], most shared players first.
export async function linkedClubs(loadSite) {
  const list = loadSite ? await Promise.resolve().then(() => loadSite('linked')).catch(() => null) : null;
  return (Array.isArray(list) ? list : []).filter((c) => c?.id && c.n && c.p?.length)
    .map((c) => ({ id: String(c.id), name: c.n, crest: c.cr ?? null, players: c.p.map(String) }));
}

// ---------- EA search ----------
// A name goes to EA's all-time leaderboard search (finds clubs the moment they've played a game); an ID to clubs/info.
// → [{ id, name, crest, gp, w, d, l, gf, ga, div }]
export async function searchClubs(q, loadSite) {
  q = String(q ?? '').trim().slice(0, 40);
  const { clubs } = await siteClubs(loadSite);
  if (/^\d{1,12}$/.test(q)) {
    if (clubs.has(q)) return [clubs.get(q)];
    const c = (await eaGet('clubs/info', { clubIds: q }))?.[q];
    if (c?.name) return [{ id: q, name: c.name, crest: c.customKit?.crestAssetId ?? null }];
    // Neither source knows it: track it by ID anyway – the next site update asks EA from Actions and fills in the real name.
    return [{ id: q, name: `Club ${q}`, crest: null, unverified: true }];
  }
  const lq = q.toLowerCase();
  const seen = clubs.size ? [...clubs.values()].filter((c) => c.name.toLowerCase().includes(lq)) : [];
  if (seen.length) return seen.sort((a, b) => (b.name.toLowerCase() === lq) - (a.name.toLowerCase() === lq) || a.name.length - b.name.length).slice(0, 10);
  return shapeHits(await eaGet('allTimeLeaderboard/search', { clubName: q }), q);
}

// EA's all-time leaderboard hits → [{ id, name, crest, gp, w, d, l, gf, ga, div }], exact name first then busiest.
export function shapeHits(hits, q) {
  const lq = String(q ?? '').trim().toLowerCase();
  const n = (v) => Number(v) || 0;
  return (Array.isArray(hits) ? hits : [])
    .map((h) => ({
      id: String(h.clubId ?? ''), name: h.clubInfo?.name ?? h.name ?? '', crest: h.clubInfo?.customKit?.crestAssetId ?? null,
      gp: n(h.gamesPlayed), w: n(h.wins), d: n(h.ties), l: n(h.losses), gf: n(h.goals), ga: n(h.goalsAgainst), div: n(h.bestDivision) || null,
    }))
    .filter((c) => /^\d{1,12}$/.test(c.id) && c.name)
    .sort((a, b) => (b.name.toLowerCase() === lq) - (a.name.toLowerCase() === lq) || b.gp - a.gp)
    .slice(0, 10);
}

// Who NOREX played lately (EA only keeps each club's last 5 per mode) → newest first, one row per opponent,
// with the score and mode of that game. These are the likeliest burners: clubs that just met us.
// → [{ id, name, crest, ts, type, res, gf, ga }]
export async function recentOpponents(home = HOME_CLUB, loadSite) {
  const { opp } = await siteClubs(loadSite);
  if (opp.length) return opp.slice(0, 25).map((o) => ({ id: o.id, name: o.n, crest: o.cr ?? null, ts: o.ts, type: o.type, res: o.res, gf: o.gf, ga: o.ga }));
  const seen = new Map();
  const lists = await Promise.all(Object.keys(TYPE_LABEL).map((type) => eaGet('clubs/matches', { clubIds: home, matchType: type }).then((l) => [type, l])));
  for (const [type, list] of lists) {
    for (const m of Array.isArray(list) ? list : []) {
      const oppId = Object.keys(m.clubs ?? {}).find((k) => k !== String(home));
      const mine = m.clubs?.[home], opp = m.clubs?.[oppId];
      if (!oppId || !mine || !/^\d{1,12}$/.test(oppId)) continue;
      const ts = Number(m.timestamp) || 0;
      if (seen.get(oppId)?.ts >= ts) continue;
      seen.set(oppId, {
        id: oppId, name: opp?.details?.name ?? opp?.name ?? `Club ${oppId}`, crest: opp?.details?.customKit?.crestAssetId ?? null, ts, type,
        res: mine.wins === '1' ? 'W' : mine.losses === '1' ? 'L' : 'D', gf: Number(mine.goals) || 0, ga: Number(opp?.goals ?? mine.goalsAgainst) || 0,
      });
    }
  }
  return [...seen.values()].sort((a, b) => b.ts - a.ts).slice(0, 25);
}

// ---------- EA relay: a name search the site data can't answer goes through a GitHub Actions job ----------
// EA blocks the Worker's network but lets Actions through, so the Worker parks the waiting Discord reply in D1 (ea_relay),
// dispatches .github/workflows/ea-relay.yml with only the club name, and scripts/ea-relay.mjs posts EA's raw answer back to
// POST /api/burners/relay – which edits the reply. About a minute end to end; the interaction token never leaves D1.
const MAX_WAITING = 6;
export async function relayAsk(env, q, i) {
  if (!env.GH_DISPATCH_TOKEN || !env.GITHUB_REPO || !env.DB || !i?.token) return false;
  await env.DB.prepare('DELETE FROM ea_relay WHERE created_at < ?').bind(Date.now() - 20 * 60_000).run();
  if ((await one(env, 'SELECT COUNT(*) AS n FROM ea_relay')).n >= MAX_WAITING) return false;
  const ref = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await env.DB.prepare('INSERT INTO ea_relay (ref, kind, q, token, app_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(ref, 'search', q, i.token, String(env.DISCORD_APP_ID), Date.now()).run();
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/ea-relay.yml/dispatches`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'norex-bot' },
    body: JSON.stringify({ ref: 'main', inputs: { ref, kind: 'search', q } }),
  }).catch(() => null);
  if (!res?.ok) { await env.DB.prepare('DELETE FROM ea_relay WHERE ref = ?').bind(ref).run(); return false; }
  return true;
}

// The Actions job's answer: { ref, hits } (hits null = EA did not answer) → edits the waiting Discord reply.
export async function burnersRelay(request, env) {
  if (!env.DISCORD_CLIENT_SECRET || request.headers.get('X-Norex-Key') !== await burnersKey(env.DISCORD_CLIENT_SECRET)) return json({ error: 'Forbidden' }, 403);
  if (request.method !== 'POST' || !env.DB) return json({ error: 'Not found' }, 404);
  const { ref, hits } = await request.json().catch(() => ({}));
  const row = await one(env, 'SELECT * FROM ea_relay WHERE ref = ?', String(ref ?? ''));
  if (!row) return json({ error: 'Unknown or expired request' }, 404);
  await env.DB.prepare('DELETE FROM ea_relay WHERE ref = ?').bind(row.ref).run();
  const body = hits == null ? plain('⚠️ EA did not answer – try again in a minute.') : await pickerBody(env, shapeHits(hits, row.q), row.q);
  const res = await fetch(`https://discord.com/api/v10/webhooks/${row.app_id}/${row.token}/messages/@original`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(PATCH_TIMEOUT), body: JSON.stringify(edit(body)),
  });
  return json({ ok: res.ok });
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
const record = (c) => (c.gp ? `${c.w}W ${c.d}D ${c.l}L · ${c.gf}–${c.ga}${c.div ? ` · best div ${c.div}` : ''}` : c.unverified ? 'ID not seen yet – tracked by ID' : c.fromSite ? 'a club NOREX has played' : 'no games yet');

const noMatch = (q) => `🔍 EA has no club matching **${q}** yet. Names only match clubs NOREX has played – for any other club paste its **club ID** (\`/burner track 1234567\`), or try again after their first game.`;

// Search results → an embed + a pick menu (clubs already tracked are ticked).
async function pickerBody(env, results, q) {
  const have = new Set((await all(env, 'SELECT club_id FROM burner_clubs WHERE active = 1')).map((r) => r.club_id));
  if (!results.length) return plain(noMatch(q));
  return BEAR('Burner clubs', `🔍 ${results.length} club${results.length === 1 ? '' : 's'} matching “${q}”`,
    results.map((c) => `${have.has(c.id) ? '✅' : '🔥'} **${c.name}** · \`${c.id}\` · ${record(c)}`).join('\n'),
    'Pick the right one below – ✅ = already tracked',
    { type: 1, components: [{
      type: 3, custom_id: 'norex:bn:pick', placeholder: '🔥 Pick the club to track', min_values: 1, max_values: 1,
      options: results.map((c) => ({ label: c.name.slice(0, 100), value: c.id, description: `${c.id} · ${record(c)}`.slice(0, 100), emoji: { name: have.has(c.id) ? '✅' : '🔥' } })),
    }] });
}

// Recent opponents → an embed + the same pick menu (norex:bn:pick), already-tracked clubs ticked.
async function recentBody(env, opps) {
  if (!opps.length) return plain('🔍 EA returned no recent NOREX games right now – try again in a minute, or look a club up with `/burner search <name>`.');
  const have = new Set((await all(env, 'SELECT club_id FROM burner_clubs WHERE active = 1')).map((r) => r.club_id));
  const ago = (ts) => { const h = Math.max(0, Math.round((Date.now() / 1000 - ts) / 3600)); return h < 1 ? 'just now' : h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`; };
  const WORD = { W: 'won', D: 'drew', L: 'lost' };
  const line = (c) => `${WORD[c.res]} ${c.gf}–${c.ga} · ${TYPE_LABEL[c.type] ?? 'League'} · ${ago(c.ts)}`;
  return BEAR('Burner clubs', `🕘 ${opps.length} club${opps.length === 1 ? '' : 's'} NOREX played lately`,
    opps.map((c) => `${have.has(c.id) ? '✅' : '🔥'} **${c.name}** · \`${c.id}\` · we ${line(c)}`).join('\n').slice(0, 3500),
    'Pick the burner below – ✅ = already tracked',
    { type: 1, components: [{
      type: 3, custom_id: 'norex:bn:pick', placeholder: '🔥 Pick the burner to track', min_values: 1, max_values: 1,
      options: opps.map((c) => ({ label: c.name.slice(0, 100), value: c.id, description: `${c.id} · we ${line(c)}`.slice(0, 100), emoji: { name: have.has(c.id) ? '✅' : '🔥' } })),
    }] });
}

// Clubs our players are also in → an embed + the same pick menu (norex:bn:pick), already-tracked clubs ticked.
async function linkedBody(env, clubs) {
  const have = new Set((await all(env, 'SELECT club_id FROM burner_clubs WHERE active = 1')).map((r) => r.club_id));
  const who = (c) => `${c.players.slice(0, 3).join(', ')}${c.players.length > 3 ? ` +${c.players.length - 3}` : ''}`;
  const list = clubs.slice(0, 25);
  return BEAR('Burner clubs', `🔗 ${list.length} club${list.length === 1 ? '' : 's'} our players are also in`,
    list.map((c) => `${have.has(c.id) ? '✅' : '🔥'} **${c.name}** · \`${c.id}\` · ${who(c)}`).join('\n').slice(0, 3500),
    'Pick the burner below – ✅ = already tracked · /burner search with no name lists clubs we have faced',
    { type: 1, components: [{
      type: 3, custom_id: 'norex:bn:pick', placeholder: '🔥 Pick the burner to track', min_values: 1, max_values: 1,
      options: list.map((c) => ({ label: c.name.slice(0, 100), value: c.id, description: `${c.id} · ${who(c)}`.slice(0, 100), emoji: { name: have.has(c.id) ? '✅' : '🔥' } })),
    }] });
}

const removeMenu = (rows) => ({ type: 1, components: [{
  type: 3, custom_id: 'norex:bn:rm', placeholder: '🗑️ Stop tracking…', min_values: 1, max_values: 1,
  options: rows.map((r) => ({ label: r.name.slice(0, 100), value: r.club_id, description: `club ${r.club_id}`, emoji: { name: '🗑️' } })),
}] });

// ---------- staff site API (C5) – the same tracker as /burner, for the /next/ Insights room ----------
//   GET  /api/burners                   managers: tracked clubs with record + form (from the collected data)
//   GET  /api/burners/search?q=         managers: club lookup (site data first); no q → clubs our players are also in, then recent opponents
//   POST /api/burners/track  {id,name,crest?}   start tracking (kicks a site update)
//   POST /api/burners/remove {id}                stop tracking (history stays on file)
// Burners are the B team: nothing here touches League totals, awards or the Hall of Fame.
export async function burnersAdminRoute(p, method, body, me, env, loadSite, log, url) {
  if (!p.startsWith('/api/burners')) return null;
  const fail = (m, s = 400) => json({ error: m }, s);
  if (!flagOn(env, me, 'burners')) return fail('Not available yet.', 404);
  if (!can(me, 'burners.manage')) return fail('Managers only.', 403);
  if (!env.DB) return fail('The member database is not connected.', 503);
  const user = { id: String(me.u ?? me.id ?? ''), name: String(me.n ?? 'Manager').slice(0, 40) };
  if (p === '/api/burners' && method === 'GET') {
    const rows = await all(env, 'SELECT club_id, name, crest, added_by_name, added_at FROM burner_clubs WHERE active = 1 ORDER BY added_at');
    const stats = new Map(((await Promise.resolve().then(() => loadSite('burners')).catch(() => null))?.clubs ?? []).map((c) => [String(c.id), c]));
    return json({ max: MAX_BURNERS, clubs: rows.map((r) => { const s = stats.get(r.club_id); return { id: r.club_id, name: r.name, crest: r.crest, by: r.added_by_name, at: r.added_at, stats: s ? { gp: s.gp ?? (s.w + s.d + s.l), w: s.w, d: s.d, l: s.l, gf: s.gf, ga: s.ga, form: (s.form ?? []).slice(0, 5) } : null }; }) });
  }
  if (p === '/api/burners/search' && method === 'GET') {
    const q = String(url?.searchParams?.get('q') ?? '').trim().slice(0, 40);
    const have = new Set((await all(env, 'SELECT club_id FROM burner_clubs WHERE active = 1')).map((r) => r.club_id));
    const mark = (c) => ({ id: c.id, name: c.name, crest: c.crest ?? null, note: c.note ?? record(c), tracked: have.has(c.id) });
    if (!q) {
      const linked = (await linkedClubs(loadSite)).map((c) => mark({ ...c, note: `also played by ${c.players.slice(0, 3).join(', ')}${c.players.length > 3 ? ` +${c.players.length - 3}` : ''}` }));
      const recent = (await recentOpponents(env.HOME_CLUB_ID || HOME_CLUB, loadSite).catch(() => [])).map((c) => mark({ ...c, note: `we ${({ W: 'won', D: 'drew', L: 'lost' })[c.res] ?? 'played'} ${c.gf}–${c.ga}` }));
      return json({ linked: linked.slice(0, 25), recent: recent.slice(0, 25) });
    }
    if (q.length < 2) return fail('Type at least 2 letters or paste a club ID.');
    try { return json({ results: (await searchClubs(q, loadSite)).map(mark) }); } catch (e) { return fail(`Could not reach EA: ${e.message}`, 502); }
  }
  if (p === '/api/burners/track' && method === 'POST') {
    const id = String(body?.id ?? '');
    if (!/^\d{1,12}$/.test(id)) return fail('That is not a club ID.');
    const name = String(body?.name ?? '').trim() || `Club ${id}`;
    const r = await trackClub(env, { id, name, crest: body?.crest ? String(body.crest) : null }, user, null);
    if (r.error) return fail(r.error, 409);
    if (!r.already) { await dispatchUpdate(env); await log?.(env, me, 'burner-track', `${name} (${id})`); }
    return json({ ok: true, already: !!r.already });
  }
  if (p === '/api/burners/remove' && method === 'POST') {
    const id = String(body?.id ?? '');
    const row = await one(env, 'SELECT name FROM burner_clubs WHERE club_id = ? AND active = 1', id);
    if (!row) return fail('That club is not being tracked.', 404);
    await env.DB.prepare('UPDATE burner_clubs SET active = 0, removed_at = ? WHERE club_id = ?').bind(Date.now(), id).run();
    await log?.(env, me, 'burner-remove', `${row.name} (${id})`);
    return json({ ok: true });
  }
  return fail('Not found', 404);
}

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
      if (sub.name === 'remove') return json({ type: 4, data: panel([text('Which club should I stop tracking? (Its history stays on file.)'), removeMenu(rows)]) });
      const stats = new Map((await loadSite('burners').catch(() => ({ clubs: [] }))).clubs.map((c) => [c.id, c]));
      const lines = rows.map((r) => {
        const s = stats.get(r.club_id);
        return `🔥 **${r.name}** · \`${r.club_id}\` · ${s ? `${s.w}W ${s.d}D ${s.l}L · ${s.gf}–${s.ga}${s.form?.length ? ` · ${s.form.slice(0, 5).join('')}` : ''}` : '⏳ first collection pending'}`;
      });
      return json({ type: 4, data: panel([header({ eyebrow: 'Staff · Burner clubs', title: `🔥 Burner clubs (${rows.length}/${MAX_BURNERS})`, size: 3 }), text(lines.join('\n')), footer('Full stats on the Burner clubs page · /burner remove to stop tracking'), buttons([{ label: 'Burner clubs page', url: `${site}burners.html` }])]) });
    })();
  }
  // `recent`, or `search` with no name: dropdown of the clubs NOREX just played.
  if (sub?.name === 'recent' || (sub?.name === 'search' && !q)) {
    ctx.waitUntil((async () => {
      const body = await within((async () => {
        if (sub.name === 'recent') { const linked = await linkedClubs(loadSite); if (linked.length) return linkedBody(env, linked); }
        return recentBody(env, await recentOpponents(env.HOME_CLUB_ID || HOME_CLUB, loadSite));
      })()).catch((e) => plain(`⚠️ Could not load the club list: ${e.message}`));
      await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${i.token}/messages/@original`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(PATCH_TIMEOUT), body: JSON.stringify(edit(body)),
      }).then(async (r) => { if (!r.ok) console.log('burner reply rejected', r.status, (await r.text()).slice(0, 400)); }).catch((e) => console.log('burner reply failed', e.message));
    })());
    return DEFER();
  }
  if (!['search', 'track'].includes(sub?.name) || q.length < 2) return reply('⚠️ Give me a club name (or club ID) to look up.');

  // EA can take longer than Discord's 3 seconds → deferred, then the answer is patched in.
  ctx.waitUntil((async () => {
    let body;
    try {
      const results = await within(searchClubs(q, loadSite));
      if (!results.length && !/^\d{1,12}$/.test(q) && await within(relayAsk(env, q, i))) {
        await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${i.token}/messages/@original`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(PATCH_TIMEOUT), body: JSON.stringify(edit(plain(`🔎 Asking EA for **${q}** through GitHub – this takes about a minute, the answer replaces this message.`))),
        }).catch(() => {});
        return;
      }
      const exact = results.filter((c) => c.id === q || c.name.toLowerCase() === q.toLowerCase());
      if (sub.name === 'track' && exact.length === 1) {
        const r = await trackClub(env, exact[0], me, i.channel_id);
        body = plain(r.error ? `⚠️ ${r.error}` : trackedMsg(exact[0], site, r.already));
        if (r.ok) await dispatchUpdate(env);
      } else {
        body = await pickerBody(env, results, q);
      }
    } catch (e) {
      body = plain(`⚠️ Could not reach EA: ${e.message}`);
    }
    await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${i.token}/messages/@original`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(PATCH_TIMEOUT), body: JSON.stringify(edit(body)),
    }).then(async (r) => { if (!r.ok) console.log('burner reply rejected', r.status, (await r.text()).slice(0, 400)); }).catch((e) => console.log('burner reply failed', e.message));
  })());
  return DEFER();
}

// ---------- the pick menus (custom_id norex:bn:pick | norex:bn:rm) ----------
export async function burnerPick(i, env, ctx, user, loadSite) {
  if (!can(user, 'burners.manage') || !flagOn(env, user, 'burners')) return reply('🔒 Managers only.');
  const id = String(i.data?.values?.[0] ?? '');
  if (!/^\d{1,12}$/.test(id)) return reply('⚠️ Unknown club.');
  const update = (content) => json({ type: 7, data: edit(plain(content)) });
  const site = (env.SITE_URL || '').replace(/\/?$/, '/');
  if (i.data.custom_id === 'norex:bn:rm') {
    const row = await one(env, 'SELECT name FROM burner_clubs WHERE club_id = ? AND active = 1', id);
    if (!row) return update('⚠️ That club is not being tracked.');
    await env.DB.prepare('UPDATE burner_clubs SET active = 0, removed_at = ? WHERE club_id = ?').bind(Date.now(), id).run();
    return update(`🗑️ Stopped tracking **${row.name}**. Its history stays on the page until the next cleanup – /burner search brings it back.`);
  }
  const club = (await searchClubs(id, loadSite))[0];
  if (!club) return update('⚠️ I could not find that club right now – try again in a moment.');
  const r = await trackClub(env, club, who(i), i.channel_id);
  if (r.error) return update(`⚠️ ${r.error}`);
  ctx.waitUntil(dispatchUpdate(env));
  return update(trackedMsg(club, site, r.already));
}
