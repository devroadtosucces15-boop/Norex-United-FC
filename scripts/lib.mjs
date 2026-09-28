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
