// On-demand club lookup (roadmap P9.4): searching for a club the crawl (P9.1) hasn't indexed yet fetches it
// from EA live, then saves a row to club_index so the next search finds it without EA.
//   GET /api/clubs/lookup?q=<club id or name>  (public) – { results: [{id,name,crest,live}], live: bool }
// At most one EA call per request, so a search can't fan out into many requests against EA.
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const EA = 'https://proclubs.ea.com/api/fc/';
const PLATFORM = 'common-gen5';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.ea.com/',
  Origin: 'https://www.ea.com',
};

export async function eaGet(endpoint, params) {
  try {
    const res = await fetch(`${EA}${endpoint}?${new URLSearchParams({ platform: PLATFORM, ...params })}`, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function saveRows(env, rows) {
  if (!rows.length) return;
  const at = Date.now();
  await env.DB.batch(rows.map((c) => env.DB.prepare(`INSERT INTO club_index (id, name, crest, checked_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET name = excluded.name, crest = excluded.crest, checked_at = excluded.checked_at`)
    .bind(String(c.id), String(c.name).slice(0, 80), c.crest ? String(c.crest).slice(0, 20) : null, at)));
}

const shape = (r) => ({ id: String(r.id), name: r.name, crest: r.crest ?? null });

export async function clubLookup(env, rawQ) {
  const q = String(rawQ ?? '').trim().slice(0, 40);
  if (q.length < 2) return json({ error: 'Type at least 2 characters.' }, 400);
  const isId = /^\d{1,12}$/.test(q);
  const local = isId
    ? await env.DB.prepare('SELECT id, name, crest FROM club_index WHERE id = ?').bind(q).all()
    : await env.DB.prepare('SELECT id, name, crest FROM club_index WHERE name LIKE ? ORDER BY name LIMIT 10').bind(`%${q.replace(/[%_]/g, '')}%`).all();
  if (local.results?.length) return json({ results: local.results.map((r) => ({ ...shape(r), live: false })), live: false });

  // Not indexed yet: one live EA call. An ID goes to clubs/info; a name goes to the all-time leaderboard search.
  if (isId) {
    const info = await eaGet('clubs/info', { clubIds: q });
    const c = info?.[q];
    if (!c?.name) return json({ results: [], live: true });
    const row = { id: q, name: c.name, crest: c.customKit?.crestAssetId ?? null };
    await saveRows(env, [row]);
    return json({ results: [{ ...shape(row), live: true }], live: true });
  }
  const hits = (await eaGet('allTimeLeaderboard/search', { clubName: q })) ?? [];
  const rows = (Array.isArray(hits) ? hits : [])
    .map((h) => ({ id: String(h.clubId ?? ''), name: h.clubInfo?.name ?? h.name ?? '', crest: h.clubInfo?.customKit?.crestAssetId ?? null }))
    .filter((c) => /^\d{1,12}$/.test(c.id) && c.name)
    .slice(0, 10);
  await saveRows(env, rows);
  return json({ results: rows.map((r) => ({ ...shape(r), live: true })), live: true });
}
