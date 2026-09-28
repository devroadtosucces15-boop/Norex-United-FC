// Shared helpers for the fetcher and the site builder. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(ROOT, 'data');

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
