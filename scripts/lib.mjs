// Shared helpers for the fetcher and the site builder. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = process.env.NOREX_DATA || path.join(ROOT, 'data'); // tests point this at a fixture copy

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// Only rewrites the file when the content actually changed, so git stays quiet.
export function writeJson(file, value) {
  const text = JSON.stringify(value, null, 1) + '\n';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  fs.writeFileSync(file, text);
  return true;
}

export const loadConfig = () => readJson(path.join(ROOT, 'config.json'));

export const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Club & privacy requests approved in the manager portal (P5.6) live in the Worker's D1, not in config.json.
// The build asks for them with a key derived from DISCORD_CLIENT_SECRET (a GitHub secret the Worker also has).
// → { ok, hiddenPlayers: [gamertag], clubs: [{ req, id?, name }] }; ok = false (empty lists) when unreachable.
export async function loadOverrides(config, body) {
  const api = config.members?.api, secret = process.env.DISCORD_CLIENT_SECRET;
  const none = { ok: false, hiddenPlayers: [], clubs: [] };
  if (!api || !secret) return none;
  try {
    const { createHash } = await import('node:crypto');
    const key = createHash('sha256').update(`${secret}:norex-overrides`).digest('hex');
    const res = await fetch(`${api}/api/overrides`, {
      method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(10000),
      headers: { 'X-Norex-Key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    return { ok: true, hiddenPlayers: d.hiddenPlayers ?? [], clubs: d.clubs ?? [] };
  } catch (e) {
    console.warn('Overrides not loaded:', e.message);
    return none;
  }
}

// P9.1 resumable club crawl: fetch.mjs has no D1 access, so its checkpoint and lightweight index rows live
// in the Worker's D1, read/written the same keyed way as loadOverrides() (a key derived from DISCORD_CLIENT_SECRET).
async function crawlAuthKey() {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(`${process.env.DISCORD_CLIENT_SECRET}:norex-crawl`).digest('hex');
}
export async function loadCrawlCursor(config) {
  const api = config.members?.api, secret = process.env.DISCORD_CLIENT_SECRET;
  if (!api || !secret) return null;
  try {
    const res = await fetch(`${api}/api/crawl`, { signal: AbortSignal.timeout(10000), headers: { 'X-Norex-Key': await crawlAuthKey() } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json(); // { cursor, indexed }
  } catch (e) {
    console.warn('Crawl checkpoint not loaded:', e.message);
    return null;
  }
}
export async function saveCrawlSlice(config, cursor, found) {
  const api = config.members?.api, secret = process.env.DISCORD_CLIENT_SECRET;
  if (!api || !secret) return false;
  try {
    const res = await fetch(`${api}/api/crawl`, {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { 'X-Norex-Key': await crawlAuthKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ cursor, found }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Crawl slice not saved:', e.message);
    return false;
  }
}

// Burner clubs picked with the bot's /burner command live in the Worker's D1 – read the same keyed way.
// → { ok, burners: [{ id, name, crest, channel, at }] } (ok = false when the Worker is unreachable).
export async function loadBurners(config) {
  const api = config.members?.api, secret = process.env.DISCORD_CLIENT_SECRET;
  if (!api || !secret) return { ok: false, burners: [] };
  try {
    const { createHash } = await import('node:crypto');
    const key = createHash('sha256').update(`${secret}:norex-burners`).digest('hex');
    const res = await fetch(`${api}/api/burners/tracked`, { signal: AbortSignal.timeout(10000), headers: { 'X-Norex-Key': key } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, burners: (await res.json()).burners ?? [] };
  } catch (e) {
    console.warn('Burner list not loaded:', e.message);
    return { ok: false, burners: [] };
  }
}

// Bot personalisation (P7.5) set in the manager portal, stored in the Worker's D1 – read the same way as
// loadOverrides() (a key derived from DISCORD_CLIENT_SECRET, a GitHub secret the Worker also has).
export async function loadBotSettings(config) {
  const api = config.members?.api, secret = process.env.DISCORD_CLIENT_SECRET;
  const none = { ok: false, resultChannel: '', pingRole: '', color: 'c8352c', emoji: '⚽', autoPosts: { results: true, reminders: true, awards: true } };
  if (!api || !secret) return none;
  try {
    const { createHash } = await import('node:crypto');
    const key = createHash('sha256').update(`${secret}:norex-bot-settings`).digest('hex');
    const res = await fetch(`${api}/api/bot/settings/public`, { signal: AbortSignal.timeout(10000), headers: { 'X-Norex-Key': key } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, ...(await res.json()) };
  } catch (e) {
    console.warn('Bot settings not loaded:', e.message);
    return none;
  }
}

// EA's per-player event counters ("111:21,174:5,…"). Only two codes are known (P1.8, from PLANNING/RESEARCH-fc-sites.md):
// 174 = dribbles completed, 115 = second assists. Everything else is dropped.
export const EVENTS = { 174: 'dribbles', 115: 'secondassists' };
export function eventCounts(agg) {
  if (typeof agg !== 'string' || !agg) return null;
  const out = Object.fromEntries(Object.values(EVENTS).map((k) => [k, '0']));
  for (const pair of agg.split(',')) {
    const [code, n] = pair.split(':');
    if (EVENTS[code]) out[EVENTS[code]] = String(num(n));
  }
  return out;
}
