// Mickey Ball Bot – Cloudflare Worker. Discord talks to it over HTTP (no always-on process). EA blocks Workers, so anything that
// needs EA is handed to a GitHub Actions job (mickey-relay.yml) which posts EA's raw answer back to /relay. Stats commands read D1.
import { makeStore, d1Executor } from '../core/store.js';
import { normalizeMatch, searchHits, crestUrl } from '../core/ea.js';
import { render, clubPicker } from '../core/views.js';
import * as S from '../core/stats.js';
import { Embed, row, select } from '../core/embed.js';
import { theme } from '../core/theme.js';

const API = 'https://discord.com/api/v10';
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
const note = (t) => ({ embeds: [new Embed().setColor(theme.green).setDescription(t).setFooter({ text: theme.name }).toJSON()], components: [] });
const EPH = 64;
const STAT_COMMANDS = new Set(['club', 'last', 'results', 'player', 'compare', 'leaderboard', 'history', 'insight', 'help']);

// ---- Discord request signature (Ed25519) --------------------------------------------------------
const hex = (s) => Uint8Array.from(s.match(/.{2}/g).map((b) => parseInt(b, 16)));
async function verified(req, body, pub) {
  const sig = req.headers.get('x-signature-ed25519'), ts = req.headers.get('x-signature-timestamp');
  if (!sig || !ts) return false;
  try {
    const key = await crypto.subtle.importKey('raw', hex(pub), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, hex(sig), new TextEncoder().encode(ts + body));
  } catch { return false; }
}

// ---- Discord REST ---------------------------------------------------------------------------------
const editOriginal = (env, token, data) => fetch(`${API}/webhooks/${env.DISCORD_APP_ID}/${token}/messages/@original`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, allowed_mentions: { parse: [] } }) });
const postChannel = (env, channel, data) => fetch(`${API}/channels/${channel}/messages`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bot ${env.DISCORD_TOKEN}` }, body: JSON.stringify({ ...data, allowed_mentions: { parse: [] } }) });

// ---- GitHub Actions dispatch ----------------------------------------------------------------------
async function dispatch(env, inputs) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/mickey-relay.yml/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'mickey-ball-bot', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'main', inputs }) }).catch(() => null);
  return !!res?.ok;
}

// Defers the Discord reply, parks it in D1, and asks Actions. The interaction token never leaves D1.
async function askEA(env, ctx, st, i, { kind, q, game = 1, opponents = false }) {
  const ref = crypto.randomUUID().slice(0, 12);
  await st.prunePending();
  await st.addPending({ ref, token: i.token, guild: i.guild_id, channel: i.channel_id, user: (i.member?.user ?? i.user)?.id, kind, game, opponents });
  ctx.waitUntil((async () => {
    const ok = await dispatch(env, { ref, kind, q: String(q).slice(0, 60), game: String(game) });
    if (!ok) { await st.delPending(ref); await editOriginal(env, i.token, note('⚠️ Could not reach the data relay. Try again in a minute.')); }
  })());
}

const clubOf = (row) => ({ id: row.club_id, name: row.name, crest: row.crest });
async function statsClub(st, i) {
  const rows = await st.trackedFor(i.guild_id);
  const v = opt(i, 'club');
  const r = v ? rows.find((x) => x.club_id === v || x.name.toLowerCase() === String(v).toLowerCase()) : rows[0];
  return r ? { id: r.club_id, name: r.name, crest: r.crest ? crestUrl(r.crest) : null } : null;
}
const opt = (i, name) => {
  const walk = (os) => (os ?? []).flatMap((o) => (o.options ? walk(o.options) : [o]));
  return walk(i.data.options).find((o) => o.name === name)?.value;
};
const subcommand = (i) => i.data.options?.[0]?.name;

async function onCommand(env, ctx, st, i) {
  const name = i.data.name;
  if (name === 'help') return json({ type: 4, data: { embeds: [S.helpEmbed().toJSON()], flags: EPH } });

  if (STAT_COMMANDS.has(name)) {
    const club = await statsClub(st, i);
    if (!club) return json({ type: 4, data: note('No tracked club yet. Use `/match track club:<name>` first.') });
    const emb = async (e) => json({ type: 4, data: { embeds: [(await e).toJSON()] } });
    switch (name) {
      case 'club': return emb(S.clubEmbed(st, club));
      case 'results': return emb(S.resultsEmbed(st, club, opt(i, 'count') ?? 5));
      case 'player': return emb(S.playerEmbed(st, club, opt(i, 'gamertag')));
      case 'compare': return emb(S.compareEmbed(st, club, opt(i, 'player1'), opt(i, 'player2')));
      case 'leaderboard': return emb(S.leaderboardEmbed(st, club, opt(i, 'stat') ?? 'rating'));
      case 'history': return emb(S.historyEmbed(st, club, opt(i, 'opponent')));
      case 'insight': return emb(S.insightEmbed(st, club, opt(i, 'type') ?? 'form'));
      case 'last': await askEA(env, ctx, st, i, { kind: 'stats', q: club.id, game: 1 }); return json({ type: 5 });
    }
  }

  const sub = subcommand(i);
  if (sub === 'list') {
    const rows = await st.trackedFor(i.guild_id);
    return json({ type: 4, data: { ...note(rows.length ? rows.map((r) => `• **${r.name}** \`${r.club_id}\` → <#${r.channel_id}>`).join('\n') : 'No clubs tracked yet. Use `/match track`.'), flags: EPH } });
  }
  if (sub === 'untrack') {
    const q = String(opt(i, 'club') ?? '').toLowerCase();
    const r = (await st.trackedFor(i.guild_id)).find((x) => x.club_id === q || x.name.toLowerCase() === q);
    const done = r && (await st.untrack(i.guild_id, r.club_id));
    return json({ type: 4, data: { ...note(done ? `Stopped tracking **${r.name}**. Stored history is kept.` : 'That club is not tracked here.'), flags: EPH } });
  }
  // search / stats / track need EA
  await askEA(env, ctx, st, i, { kind: sub, q: opt(i, 'club'), game: opt(i, 'game') ?? 1, opponents: !!opt(i, 'opponents') });
  return json({ type: 5 });
}

async function onComponent(env, ctx, st, i) {
  const [, a, b, c] = i.data.custom_id.split(':');
  if (a === 'pick') { // select menu: ml:pick:<kind>:<game>  value = club id
    await askEA(env, ctx, st, i, { kind: b === 'search' ? 'stats' : b, q: i.data.values[0], game: Number(c) || 1 });
    return json({ type: 7, data: note('⏳ Fetching that club from EA…') });
  }
  // button: ml:<view>:<clubId>:<matchId>
  const m = await st.storedMatch(b, c);
  return m ? json({ type: 7, data: await render(st, m, a) }) : json({ type: 4, data: { ...note('That match is no longer stored.'), flags: EPH } });
}

async function onAutocomplete(st, i) {
  const f = (function walk(os) { for (const o of os ?? []) { if (o.focused) return o; const r = walk(o.options); if (r) return r; } })(i.data.options);
  const q = String(f?.value ?? '');
  let out = [];
  if (f?.name === 'club') out = (await st.trackedFor(i.guild_id)).filter((r) => r.name.toLowerCase().includes(q.toLowerCase())).map((r) => ({ name: r.name, value: r.club_id }));
  else {
    const club = await statsClub(st, i);
    if (club && ['gamertag', 'player1', 'player2'].includes(f?.name)) out = (await st.playerNames(club.id, q)).map((r) => ({ name: `${r.player} (${r.gp} g)`, value: r.player }));
    if (club && f?.name === 'opponent') out = (await st.opponentNames(club.id, q)).map((r) => ({ name: `${r.opp_name} (${r.n})`, value: r.opp_name }));
  }
  return json({ type: 8, data: { choices: out.slice(0, 25).map((c) => ({ name: String(c.name).slice(0, 100), value: String(c.value).slice(0, 100) })) } });
}

// ---- relay: Actions → Worker ---------------------------------------------------------------------
async function onRelay(env, st, body) {
  const p = await st.getPending(body.ref);
  if (!p) return json({ ok: false, error: 'unknown ref' }, 404);
  await st.delPending(p.ref);
  const reply = (d) => editOriginal(env, p.token, d);
  if (body.error) { await reply(note(`⚠️ ${String(body.error).slice(0, 300)}`)); return json({ ok: true }); }
  const hits = searchHits(body.hits);
  if (!body.club) { // not resolved: nothing found, or several to pick from
    if (!hits.length) { await reply(note('No club found. Try the exact name or the club ID.')); return json({ ok: true }); }
    const menu = select({ id: `ml:pick:${p.kind}:${p.game}`, placeholder: 'Pick the club', options: hits.map((c) => ({ label: c.name.slice(0, 100), value: c.id, description: `ID ${c.id}` })) });
    await reply({ embeds: [clubPicker(hits, body.q ?? 'search')], components: [row(menu)] });
    return json({ ok: true });
  }
  const club = body.club; // { id, name, crest }
  const matches = (body.matches ?? []).map((m) => normalizeMatch(m, club.id)).sort((a, b) => b.ts - a.ts);
  if (p.kind === 'search') {
    if (p.opponents) {
      const seen = new Map();
      for (const m of matches) seen.set(m.away.id, { id: m.away.id, name: m.away.name, crest: m.away.crestId });
      await reply({ embeds: [clubPicker([...seen.values()], `${club.name} opponents`)] });
    } else await reply({ embeds: [clubPicker([club], club.name)] });
  } else if (p.kind === 'track') {
    let added = 0;
    for (const m of matches) if (await st.saveMatch(club.id, m)) added++;
    await st.track(p.guild_id, club, p.channel_id, p.user_id);
    await st.setLastTs(p.guild_id, club.id, Math.max(0, ...matches.map((m) => m.ts)));
    await reply(note(`Now tracking **${club.name}**. Imported **${added}** recent match(es); new ones post in <#${p.channel_id}>.`));
  } else { // stats
    const m = matches[(p.game || 1) - 1];
    if (!m) { await reply(note(`**${club.name}** has no recent matches.`)); return json({ ok: true }); }
    await st.saveMatch(club.id, m);
    await reply(await render(st, m, 'box'));
  }
  return json({ ok: true });
}

// ---- ingest: scheduled Actions poll → store + post new matches ----------------------------------
async function onIngest(env, st, body) {
  let posted = 0;
  for (const c of body.clubs ?? []) {
    const matches = (c.matches ?? []).map((m) => normalizeMatch(m, c.id)).sort((a, b) => a.ts - b.ts);
    for (const t of (await st.allTracked()).filter((x) => x.club_id === String(c.id))) {
      for (const m of matches.filter((x) => x.ts > t.last_match_ts)) {
        await st.saveMatch(c.id, m);
        if (t.channel_id && (await postChannel(env, t.channel_id, await render(st, m, 'box'))).ok) posted++;
        await st.setLastTs(t.guild_id, t.club_id, m.ts);
      }
    }
  }
  return json({ ok: true, posted });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), st = makeStore(d1Executor(env.DB));
    if (url.pathname === '/') return new Response('Mickey Ball Bot is running.');
    if (req.method !== 'POST' && url.pathname !== '/tracked') return new Response('Not found', { status: 404 });
    if (url.pathname === '/interactions') {
      const body = await req.text();
      if (!(await verified(req, body, env.DISCORD_PUBLIC_KEY))) return new Response('Bad signature', { status: 401 });
      const i = JSON.parse(body);
      try {
        if (i.type === 1) return json({ type: 1 });
        if (i.type === 2) return await onCommand(env, ctx, st, i);
        if (i.type === 3) return await onComponent(env, ctx, st, i);
        if (i.type === 4) return await onAutocomplete(st, i);
      } catch (e) { console.error(e); return json({ type: 4, data: { ...note(`⚠️ ${String(e.message ?? e).slice(0, 200)}`), flags: EPH } }); }
      return json({ error: 'unsupported' }, 400);
    }
    // Everything below is for the GitHub Actions job and needs the shared key.
    if (req.headers.get('x-key') !== env.RELAY_KEY || !env.RELAY_KEY) return new Response('Forbidden', { status: 403 });
    if (url.pathname === '/tracked') return json({ clubs: [...new Set((await st.allTracked()).map((t) => t.club_id))] });
    if (url.pathname === '/relay') return onRelay(env, st, await req.json());
    if (url.pathname === '/ingest') return onIngest(env, st, await req.json());
    return new Response('Not found', { status: 404 });
  },
};
