import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const FORMAT = 'norex-recovery-bundle';
const VERSION = 2;
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  return value;
}
const canonical = value => JSON.stringify(canonicalize(value));
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');

export async function writeRecoveryBundle(store, path, { repository = null } = {}) {
  const state = store.exportState();
  const repo = repository ? { root: resolve(repository.root), branch: repository.branch, commit: repository.commit } : null;
  const payload = { state, repository: repo };
  const envelope = { format: FORMAT, version: VERSION, algorithm: 'sha256', digest: digest(payload), ...payload };
  await writeFile(path, canonical(envelope) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  return { path, format: FORMAT, version: VERSION, algorithm: 'sha256', digest: envelope.digest };
}

export async function readRecoveryBundle(path) {
  const envelope = JSON.parse(await readFile(path, 'utf8'));
  if (!envelope || envelope.format !== FORMAT || ![1, VERSION].includes(envelope.version) || envelope.algorithm !== 'sha256' || typeof envelope.digest !== 'string' || !envelope.state) throw new Error('Unsupported recovery bundle');
  const payload = envelope.version === 1 ? envelope.state : { state: envelope.state, repository: envelope.repository ?? null };
  if (digest(payload) !== envelope.digest) throw new Error('Recovery bundle integrity check failed');
  return envelope.version === 1 ? envelope.state : payload;
}

export async function restoreRecoveryBundle(store, path, { repository = null } = {}) {
  const bundle = await readRecoveryBundle(path);
  const state = bundle.state ?? bundle;
  if (bundle.repository) {
    if (!repository) throw new Error('Repository identity is required for this recovery bundle');
    if (resolve(repository.root) !== bundle.repository.root || repository.branch !== bundle.repository.branch || repository.commit !== bundle.repository.commit) throw new Error('Recovery bundle repository identity mismatch');
  }
  return store.restoreState(state);
}
