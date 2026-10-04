import { access } from 'node:fs/promises';

const PROVIDERS = Object.freeze({
  claude: ['/home/mrsuccess/.npm-global/bin/claude'],
  codex: ['/home/mrsuccess/.local/bin/codex']
});

const unknown = (provider, extra = {}) => ({ provider, installed: false, auth: 'UNKNOWN', allowance: 'UNKNOWN', billing: 'UNKNOWN_BILLING', ...extra });

export async function probeProviderPresence(provider, { paths = PROVIDERS, accessFn = access } = {}) {
  const candidates = paths[provider];
  if (!candidates) return unknown(provider);
  for (const executable of candidates) {
    try { await accessFn(executable); return unknown(provider, { installed: true, executable }); } catch {}
  }
  return unknown(provider);
}

export async function probeKnownProviders(options = {}) {
  const paths = options.paths ?? PROVIDERS;
  return Promise.all(Object.keys(paths).map(provider => probeProviderPresence(provider, { ...options, paths })));
}
