// Resumable club-ID crawl (roadmap P9.1): fetch.mjs walks EA's sequential club-ID range in small slices,
// one slice per 10-minute run, so the whole range gets indexed over many runs without a single Actions job
// ever needing to cover it. The checkpoint and the found clubs' lightweight rows (id, name, crest – full
// detail is fetched on demand elsewhere) live here in D1, since fetch.mjs (GitHub Actions) has no D1 access.
//   GET  /api/crawl   keyed (X-Norex-Key, same shared-secret pattern as /api/overrides) – { cursor, indexed }
//   POST /api/crawl   { cursor, found: [{id,name,crest}] } – saves the slice, advances the cursor
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();

export async function crawlKey(secret) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:norex-crawl`));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function crawlRoute(request, env) {
  if (!env.DISCORD_CLIENT_SECRET || request.headers.get('X-Norex-Key') !== await crawlKey(env.DISCORD_CLIENT_SECRET)) return fail('Forbidden', 403);
  if (request.method === 'GET') {
    const [cursor, total] = await Promise.all([
      one(env, "SELECT value FROM meta WHERE key = 'crawl_cursor'"),
      one(env, 'SELECT COUNT(*) AS n FROM club_index'),
    ]);
    return json({ cursor: Number(cursor?.value) || 1, indexed: total?.n ?? 0 });
  }
  if (request.method !== 'POST') return fail('Not found', 404);
  const body = await request.json().catch(() => ({}));
  const cursor = Number(body.cursor);
  if (!Number.isInteger(cursor) || cursor < 1) return fail('Bad cursor');
  const found = (Array.isArray(body.found) ? body.found : []).filter((c) => c && /^\d{1,12}$/.test(String(c.id)) && c.name).slice(0, 200);
  const at = Date.now();
  const writes = found.map((c) => env.DB.prepare(`INSERT INTO club_index (id, name, crest, checked_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET name = excluded.name, crest = excluded.crest, checked_at = excluded.checked_at`)
    .bind(String(c.id), String(c.name).slice(0, 80), c.crest ? String(c.crest).slice(0, 20) : null, at));
  writes.push(env.DB.prepare("INSERT INTO meta (key, value) VALUES ('crawl_cursor', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(String(cursor)));
  await env.DB.batch(writes);
  return json({ ok: true, saved: found.length });
}
