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

export function classifyProviderAuthStatus(provider, output = '') {
  const text = String(output).trim();
  if (provider === 'codex' && /^Logged in using ChatGPT$/m.test(text)) return { auth: 'VERIFIED', allowance: 'UNKNOWN', billing: 'SUBSCRIPTION_EXISTING_ACCESS', auth_method: 'CHATGPT' };
  if (provider === 'claude') {
    try { const value = JSON.parse(text); if (value?.loggedIn === true) return { auth: 'VERIFIED', allowance: 'UNKNOWN', billing: 'UNKNOWN_BILLING', auth_method: value.authMethod || 'UNKNOWN' }; if (value?.loggedIn === false) return { auth: 'NOT_AUTHENTICATED', allowance: 'UNKNOWN', billing: 'UNKNOWN_BILLING', auth_method: 'none' }; } catch {}
  }
  return { auth: 'UNKNOWN', allowance: 'UNKNOWN', billing: 'UNKNOWN_BILLING', auth_method: 'UNKNOWN' };
}
