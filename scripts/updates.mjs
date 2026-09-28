// FC updates & patch-notes log (roadmap P1.7). Checks EA's official FC 27 news index, fetches new Pitch Notes /
// update posts, splits them into sections and stores a short summary per section in data/updates/<slug>.json.
// We keep summaries + a link, never EA's full text. Clubs sections are scanned for build-relevant keywords; a
// level-cap sentence becomes a pending game-rules change that a manager confirms in the portal (PB.1).
//   node scripts/updates.mjs           check if the last check is older than CHECK_HOURS
//   node scripts/updates.mjs --force   check now
// A failed check never breaks the site update (update.yml runs it with continue-on-error).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA, readJson, writeJson, loadConfig } from './lib.mjs';

const EA = 'https://www.ea.com';
const INDEX = `${EA}/games/ea-sports-fc/fc-27/news`;
const DIR = path.join(DATA, 'updates');
const STATE = path.join(DIR, 'index.json');
const CHECK_HOURS = 6;
const MAX_PER_RUN = 20; // polite to EA; the rest follows on the next check
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'en-GB,en;q=0.9',
};
// Posts worth logging: Pitch Notes, title updates, patches, feedback updates.
const WANT = /pitch-notes|update|patch/;

// ---------- parsing (exported for tests) ----------
const ENT = { nbsp: ' ', amp: '&', quot: '"', lt: '<', gt: '>', apos: "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…', trade: '™', reg: '®' };
export const text = (html) => String(html)
  .replace(/<[^>]+>/g, '')
  .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m))
  .replace(/[\u200b-\u200d\u2060\ufeff]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Next.js pages carry their data as JSON; find every news card {slug, title, publishingDate}. The index only
// shows the newest cards, so links to other news posts (feature tiles, "related" lists) are returned too.
const nextData = (html) => { const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); try { return m ? JSON.parse(m[1]) : null; } catch { return null; } };
export function parseIndex(html) {
  const out = new Map();
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    if (typeof o.slug === 'string' && typeof o.title === 'string' && o.publishingDate) {
      if (!out.has(o.slug)) out.set(o.slug, { slug: o.slug, title: o.title, published: o.publishingDate, summary: o.summary ?? '' });
    }
    Object.values(o).forEach(walk);
  };
  walk(nextData(html));
  for (const [, slug] of html.matchAll(/\/games\/ea-sports-fc\/fc-27\/news\/([a-z0-9-]+)/g)) if (!out.has(slug)) out.set(slug, { slug });
  return [...out.values()];
}

// Section → area of the game. Deep-dive posts default to their topic ("The Grounds & Clubs Deep Dive" → clubs).
const CATS = [
  ['clubs', /grounds|clubs|pro clubs|\brush\b|archetype|master(y|ies)|\bamps?\b|mentor|kickabout|drop.?in/i],
  ['fut', /ultimate team|\bfut\b|ones to watch|gallery|evolution|sbc|rivals|champions/i],
  ['career', /career|manager live/i],
  ['gameplay', /gameplay|attacking|defending|goalkeep|dribbl|pass\b|passing|shooting|physical|set.?piece|tactic|corner|press|challenge|accele|player lock|player roles/i],
];
export const catOf = (s, fallback = 'general') => CATS.find(([, re]) => re.test(s))?.[0] ?? fallback;

// Keywords that matter for Pro builds (norex-game-data playbook).
export const KEYWORDS = [
  ['levelCap', 'Level cap', /\b(level cap|max(?:imum)? level|cap(?:ped)? at level|up to level \d|level limit)\b/i],
  ['level', 'Levels', /\blevel\s+[4-9]\d\b/i],
  ['axp', 'AXP', /\bAXP\b/],
  ['skillPoints', 'Skill points', /\b(skill|archetype) points?\b/i],
  ['archetype', 'Archetypes', /\barchetypes?\b/i],
  ['playstyle', 'PlayStyles', /\bplaystyles?\+?/i],
  ['amps', 'Amps', /\bamps?\b/i],
  ['mastery', 'Masteries', /\bmaster(y|ies)\b/i],
  ['rush', 'Rush', /\brush\b/i],
];
const NOT_CAP = /consumable|boost|\bitem\b|season pass|gallery|reward/i;
const sentences = (s) => s.split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/);
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
// A number next to the cap wording, e.g. "the level cap rises to 50" → 50.
export function capValue(sentence) {
  const m = sentence.match(/(?:level cap|max(?:imum)? level|cap(?:ped)? at level|up to level|level limit)\D{0,40}?(\d{2,3})\b/i)
    ?? sentence.match(/\b(\d{2,3})\b[^.]{0,30}(?:level cap|max(?:imum)? level)/i);
  const v = m && +m[1];
  return v >= 10 && v <= 200 ? v : null;
}

export function parseArticle(html, meta = {}) {
  const start = html.search(/<h1[\s>]/);
  const end = html.indexOf('<footer', start);
  const body = html.slice(start < 0 ? 0 : start, end < 0 ? undefined : end).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
  const own = parseIndex(html).find((a) => a.slug === meta.slug && a.published) ?? {};
  const title = meta.title || own.title || text(body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
  const date = body.match(/<p[^>]*>\s*([A-Z][a-z]+ \d{1,2}, \d{4})\s*<\/p>/)?.[1];
  const published = meta.published || own.published || (date ? new Date(date + ' 12:00 UTC').toISOString() : null);
  const topic = catOf(title, 'general');
  const sections = [];
  let cur = { title: 'Overview', subs: [], parts: [] };
  let toc = false;
  for (const m of body.matchAll(/<(h[1-4]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const tag = m[1], t = text(m[2]);
    if (!t || tag === 'h1') continue;
    if (/^table of contents/i.test(t)) { toc = true; continue; }
    if (tag === 'h2') { toc = false; if (cur.parts.length || cur.subs.length) sections.push(cur); cur = { title: t, subs: [], parts: [] }; continue; }
    if (toc) { if (tag !== 'li') toc = false; else continue; }
    if (tag === 'h3' || tag === 'h4') cur.subs.push(t);
    else if (!/^(-\s*)?the ea sports fc/i.test(t) && !/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(t)) cur.parts.push(t);
  }
  if (cur.parts.length || cur.subs.length) sections.push(cur);

  const hits = [];
  const out = sections.map((s, i) => {
    const full = s.parts.join(' ');
    const cat = catOf(`${s.title} ${s.subs.join(' ')}`, topic);
    const keys = [];
    for (const [kind, label, re] of KEYWORDS) {
      // The cap is searched everywhere; the other keywords only in Clubs sections.
      if (kind !== 'levelCap' && cat !== 'clubs') continue;
      // Consumables and boosts have their own "level caps" – those aren't the player's max level.
      const sent = sentences(full).find((x) => re.test(x) && !(kind === 'levelCap' && NOT_CAP.test(x)));
      if (!sent) continue;
      keys.push(kind);
      hits.push({ id: `${meta.slug ?? 'x'}#${i}-${kind}`, kind, label, section: s.title, quote: clip(sent, 280), ...(kind === 'levelCap' ? { value: capValue(sent) } : {}) });
    }
    return { id: `s${i}`, title: s.title, cat, subs: s.subs.slice(0, 12), summary: clip(sentences(full).slice(0, 2).join(' '), 260), keys };
  });
  return { title, published, summary: meta.summary || own.summary || '', links: parseIndex(html).map((a) => a.slug), topic, sections: out, hits, clubs: out.some((s) => s.cat === 'clubs') };
}

// ---------- fetching ----------
async function get(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
}

async function postToDiscord(entries) {
  const hook = process.env.DISCORD_WEBHOOK;
  if (!hook || !entries.length) return;
  const site = loadConfig().siteUrl?.replace(/\/?$/, '/') ?? '';
  const embeds = entries.slice(0, 10).map((e) => ({
    title: `📢 ${e.title}`.slice(0, 256),
    url: site ? `${site}updates.html#${e.slug}` : e.url,
    color: e.clubs ? 0xc8352c : 0x64748b,
    description: [e.clubs ? '⚽ **Clubs changes inside**' : 'No Clubs section in this one.', e.summary && clip(e.summary, 300)].filter(Boolean).join('\n\n'),
    fields: [
      e.hits.some((h) => h.kind === 'levelCap') && { name: '🔝 Level cap mentioned', value: clip(e.hits.find((h) => h.kind === 'levelCap').quote, 1000) + '\n*A manager can confirm it in the portal.*' },
      { name: '🔗 Original', value: `[Read on EA.com](${e.url})` },
    ].filter(Boolean),
    timestamp: new Date(e.published).toISOString(),
    footer: { text: 'New FC update' },
  }));
  await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'NOREX UNITED', avatar_url: site ? `${site}assets/crest.png` : undefined, embeds }),
  }).catch((e) => console.warn('Discord post failed:', e.message));
}

async function main() {
  const force = process.argv.includes('--force');
  const state = readJson(STATE, null);
  const first = !state; // first run seeds the archive quietly (no Discord post)
  if (!force && state?.checked && Date.now() - Date.parse(state.checked) < CHECK_HOURS * 3600e3) {
    console.log(`Updates: checked ${state.checked}, next check after ${CHECK_HOURS} h`);
    return;
  }
  const have = new Set(fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f !== 'index.json').map((f) => f.replace(/\.json$/, '')) : []);
  // Start from the index, then follow links found in each new post (older deep dives are only linked there).
  const queue = parseIndex(await get(INDEX)).filter((a) => WANT.test(a.slug) && !have.has(a.slug));
  const seen = new Set(queue.map((a) => a.slug));
  const fresh = [];
  while (queue.length && fresh.length < MAX_PER_RUN) {
    const a = queue.shift();
    const url = `${INDEX}/${a.slug}`;
    try {
      const art = parseArticle(await get(url), a);
      if (!art.published) throw new Error('no publish date found');
      const entry = { slug: a.slug, title: art.title, url, published: art.published, summary: clip(art.summary, 300), clubs: art.clubs, sections: art.sections, hits: art.hits, fetched: new Date().toISOString() };
      writeJson(path.join(DIR, `${a.slug}.json`), entry);
      fresh.push(entry);
      console.log(`+ ${a.slug} (${art.sections.length} sections, ${art.hits.length} hits)`);
      for (const slug of art.links) if (WANT.test(slug) && !have.has(slug) && !seen.has(slug)) { seen.add(slug); queue.push({ slug }); }
    } catch (e) {
      console.warn(`${a.slug}: ${e.message}`);
    }
  }
  // Hour precision: the state file (and git) changes at most every CHECK_HOURS when nothing new appears.
  writeJson(STATE, { checked: new Date().toISOString().slice(0, 13) + ':00:00Z', source: INDEX, count: have.size + fresh.length });
  if (!first) await postToDiscord(fresh);
  console.log(`Updates: ${have.size + fresh.length} update posts archived, ${fresh.length} new`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error('Updates check failed:', e.message); process.exit(1); });
