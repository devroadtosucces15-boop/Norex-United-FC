import { access } from 'node:fs/promises';

const PROVIDERS = Object.freeze({
  claude: ['/home/mrsuccess/.npm-global/bin/claude'],
  codex: ['/home/mrsuccess/.local/bin/codex']
});

export async function probeProviderPresence(provider) {
  const paths = PROVIDERS[provider];
  if (!paths) return { provider, installed: false, auth: 'UNKNOWN', allowance: 'UNKNOWN', billing: 'UNKNOWN_BILLING' };
  for (const executable of paths) {
    try { await access(executable); return { provider, installed: true, executable, auth: 'UNKNOWN', allowance: 'UNKNOWN', billing: 'UNKNOWN_BILLING' }; } catch {}
  }
  return { provider, installed: false, auth: 'UNKNOWN', allowance: 'UNKNOWN', billing: 'UNKNOWN_BILLING' };
}

export async function probeKnownProviders() {
  return Promise.all(Object.keys(PROVIDERS).map(probeProviderPresence));
}
