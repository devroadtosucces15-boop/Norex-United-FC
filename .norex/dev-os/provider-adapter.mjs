const PROVIDERS = new Set(['claude', 'codex']);
const INCLUDED = new Set(['SUBSCRIPTION_EXISTING_ACCESS', 'VERIFIED_FREE']);

export function planProviderDispatch({ provider, presence, route, permission } = {}) {
  if (!PROVIDERS.has(provider)) throw new Error('Provider adapter rejected');
  if (!presence || presence.provider !== provider || presence.installed !== true) return { status: 'GATED', provider, reason: 'provider-not-installed' };
  if (presence.auth !== 'VERIFIED') return { status: 'GATED', provider, reason: 'auth-not-verified' };
  if (presence.allowance !== 'AVAILABLE') return { status: 'GATED', provider, reason: 'allowance-not-verified' };
  if (!INCLUDED.has(presence.billing)) return { status: 'GATED', provider, reason: 'billing-not-verified-included' };
  if (!route || route.status !== 'ROUTED' || route.provider !== provider || route.billing_mode !== presence.billing) return { status: 'GATED', provider, reason: 'route-mismatch' };
  if (!permission || permission.status !== 'ALLOWED') return { status: 'GATED', provider, reason: 'security-permission-required' };
  return { status: 'READY', provider, billing_mode: presence.billing, executable: presence.executable, capability: route.capability };
}
