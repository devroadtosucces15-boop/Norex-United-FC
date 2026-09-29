// In-memory stand-ins for everything the Worker talks to: D1 (node:sqlite + the real migrations),
// KV, the edge cache, Discord OAuth and the site's JSON files. Import it once per process –
// tests/run.mjs starts every *.test.mjs in its own process so state never leaks between files.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import worker from '../bot/worker.js';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const config = JSON.parse(fs.readFileSync(ROOT + 'config.json', 'utf8'));
export const siteJson = (file) => JSON.parse(fs.readFileSync(`${ROOT}site/api/${file}.json`, 'utf8'));

// D1 shim
export const sqlite = new DatabaseSync(':memory:');
const MIG = ROOT + 'bot/migrations/';
for (const f of fs.readdirSync(MIG).sort()) sqlite.exec(fs.readFileSync(MIG + f, 'utf8'));
const stmt = (sql, args = []) => ({
  bind: (...a) => stmt(sql, a),
  async first(col) { const r = sqlite.prepare(sql).get(...args); return r == null ? null : col ? r[col] : { ...r }; },
  async all() { return { results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })), success: true }; },
  async run() { const r = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
});
export const DB = {
  prepare: (sql) => stmt(sql),
  async batch(list) { sqlite.exec('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); sqlite.exec('COMMIT'); return out; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } },
  async exec(sql) { sqlite.exec(sql); },
};

// KV shim
const store = new Map();
export const KV = {
  async get(k, t) { const v = store.get(k)?.v; return v == null ? null : t === 'json' ? JSON.parse(v) : v; },
  async put(k, v, o = {}) { store.set(k, { v, m: o.metadata }); },
  async delete(k) { store.delete(k); },
  async list({ prefix }) { return { keys: [...store].filter(([k]) => k.startsWith(prefix)).map(([name, { m }]) => ({ name, metadata: m })) }; },
};

// R2 shim (feed photos/clips, P6.1b) – put() drains the stream, so a failing check in the Worker rejects like on R2.
export const r2objects = new Map();
export const R2 = {
  async put(key, value, o = {}) {
    const buf = value instanceof ReadableStream ? Buffer.concat(await Array.fromAsync(value)) : Buffer.from(value);
    r2objects.set(key, { buf, type: o.httpMetadata?.contentType, uploaded: new Date() });
  },
  async get(key, o = {}) {
    const x = r2objects.get(key);
    if (!x) return null;
    const m = /bytes=(\d*)-(\d*)/.exec(o.range?.get?.('range') ?? '');
    const offset = m ? (m[1] ? +m[1] : x.buf.length - +m[2]) : 0;
    const end = m && m[1] && m[2] ? +m[2] : x.buf.length - 1;
    const part = x.buf.subarray(offset, end + 1);
    return { key, size: x.buf.length, httpEtag: `"${key.length}"`, range: m ? { offset, length: part.length } : undefined,
      body: new Blob([part]).stream(), writeHttpMetadata: (h) => h.set('Content-Type', x.type) };
  },
  async delete(keys) { for (const k of [keys].flat()) r2objects.delete(k); },
  async list() { return { objects: [...r2objects].map(([key, x]) => ({ key, size: x.buf.length, uploaded: x.uploaded })), truncated: false }; },
};

// Fake Discord user for the login flow – tests change it (id 111 is in ADMIN_IDS = owner).
export const mockDiscord = { id: '111', username: 'boss', global_name: 'Зуб_Ноrex 👑', roles: [], inGuild: true, connections: [] };
export const SITE = 'http://localhost:4321/';
globalThis.caches = { default: { match: async () => null, put: async () => {} } };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  url = String(url);
  if (url.startsWith(SITE)) return new Response(fs.readFileSync(ROOT + 'site/' + url.slice(SITE.length)));
  if (url.includes('/oauth2/token')) return Response.json({ access_token: 't' });
  if (url.endsWith('/users/@me/connections')) return Response.json(mockDiscord.connections ?? []); // P2.4
  if (url.endsWith('/users/@me')) return Response.json({ id: mockDiscord.id, username: mockDiscord.username, global_name: mockDiscord.global_name, avatar: null });
  if (url.includes('/guilds/')) return mockDiscord.inGuild ? Response.json({ roles: mockDiscord.roles }) : new Response('{}', { status: 404 });
  if (url.startsWith('https://discord.com/') || url.startsWith('https://api.github.com/')) throw new Error(`unexpected network call in test: ${url}`);
  return realFetch(url);
};

export const env = {
  SITE_URL: SITE, DISCORD_APP_ID: '1', DISCORD_CLIENT_SECRET: 'shh', DISCORD_GUILD_ID: '9',
  ADMIN_IDS: '111', ADMIN_ROLE_ID: 'mgr', OWNER_ROLE_ID: 'founder', NOREX_KV: KV, DB, MEDIA: R2,
  FEATURES: JSON.stringify(config.features ?? {}),
};

// Legacy KV documents (pre-D1) – the Worker copies them into D1 on first request.
const A2 = 'https://cdn.discordapp.com/embed/avatars/2.png';
await KV.put('users', JSON.stringify({ 222: { n: 'Mike', a: A2, tag: 'mike', admin: false, first: Date.now() - 864e5, last: Date.now() - 36e5, logins: 3 } }));
await KV.put('claims', JSON.stringify({ 222: { player: '1007531598629', playerName: 'x_MrMike_x', status: 'pending', at: Date.now() - 6e5, n: 'Mike', a: A2, history: [] } }));
const today = new Date().toISOString().slice(0, 10);
await KV.put(`avail:${today}`, JSON.stringify({ 222: { s: 'yes', n: 'Mike', a: A2, at: Date.now() } }));
await KV.put('profile:222', JSON.stringify({ bio: 'Box-to-box <b>engine</b>', positions: ['CM', 'CDM'], platform: 'PS5', updated: Date.now() - 5e5 }));
const m0 = siteJson('club').matches[0];
if (m0?.ps?.[0]) await KV.put(`votes:${m0.id}`, JSON.stringify({ 222: { p: m0.ps[0].k, n: 'Mike', a: A2, at: Date.now() - 4e5 } }));
await KV.put(`avail:${today}:333`, 'maybe', { metadata: { s: 'maybe', n: 'Old', a: A2 } });
if (m0?.ps?.[1]) await KV.put(`vote:${m0.id}:333`, m0.ps[1].k, { metadata: { p: m0.ps[1].k } });
await KV.put('activity', JSON.stringify([{ at: Date.now() - 6e5, u: '222', n: 'Mike', a: A2, type: 'claim', detail: 'x_MrMike_x' }]));

// ---------- helpers ----------
export const W = (path, init = {}) => worker.fetch(new Request('http://localhost:8788' + path, init), env, { waitUntil() {} });

// Full OAuth round trip as a Discord user with the given server roles → session token (or the error).
export async function login(id, roles = [], name = 'User ' + id) {
  Object.assign(mockDiscord, { id, username: 'u' + id, global_name: name, roles });
  const r = await W('/auth/login?return=' + encodeURIComponent(SITE + 'x.html'));
  const st = new URL(r.headers.get('location')).searchParams.get('state');
  const cb = await W(`/auth/callback?code=x&state=${encodeURIComponent(st)}`);
  const hash = new URLSearchParams(cb.headers.get('location').split('#')[1]);
  return hash.get('norex_session') ?? { error: hash.get('norex_error') };
}

// Hand-made session (skips Discord) – signed with the mock secret.
const enc = new TextEncoder();
const b64 = (b) => Buffer.from(b).toString('base64url');
export async function seal(o) {
  const body = b64(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...o })));
  const key = await crypto.subtle.importKey('raw', enc.encode('shh:norex-session'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `${body}.${b64(await crypto.subtle.sign('HMAC', key, enc.encode(body)))}`;
}

// API call → { s: status, d: parsed JSON }
export async function call(tok, path, body) {
  const r = await W(path, { method: body ? 'POST' : 'GET', headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) };
}

export { worker };
