import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const FORMAT = 'norex-recovery-bundle';
const VERSION = 1;
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  return value;
}
const canonical = value => JSON.stringify(canonicalize(value));
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');

export async function writeRecoveryBundle(store, path) {
  const state = store.exportState();
  const envelope = { format: FORMAT, version: VERSION, algorithm: 'sha256', digest: digest(state), state };
  await writeFile(path, canonical(envelope) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  return { path, format: FORMAT, version: VERSION, algorithm: 'sha256', digest: envelope.digest };
}

export async function readRecoveryBundle(path) {
  const envelope = JSON.parse(await readFile(path, 'utf8'));
  if (!envelope || envelope.format !== FORMAT || envelope.version !== VERSION || envelope.algorithm !== 'sha256' || typeof envelope.digest !== 'string' || !envelope.state) throw new Error('Unsupported recovery bundle');
  if (digest(envelope.state) !== envelope.digest) throw new Error('Recovery bundle integrity check failed');
  return envelope.state;
}

export async function restoreRecoveryBundle(store, path) {
  return store.restoreState(await readRecoveryBundle(path));
}
