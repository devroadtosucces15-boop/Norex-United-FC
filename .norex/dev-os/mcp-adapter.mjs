const BILLING = new Set(['LOCAL_OFFLINE', 'SUBSCRIPTION_EXISTING_ACCESS', 'VERIFIED_FREE']);
const NAME = /^[a-z0-9][a-z0-9._-]{0,127}$/i;

export function normalizeMcpTool({ server, tool, capability, billing_mode, security_permitted = false } = {}) {
  if (![server, tool, capability].every(value => typeof value === 'string' && NAME.test(value))) throw new Error('MCP descriptor rejected');
  if (typeof billing_mode !== 'string') throw new Error('MCP billing mode required');
  return Object.freeze({ server, tool, capability, billing_mode, security_permitted: security_permitted === true });
}

export function planMcpInvocation({ descriptor, route, permission } = {}) {
  if (!descriptor || !route || !permission) throw new Error('MCP policy inputs required');
  if (route.status !== 'ROUTED' || route.capability !== descriptor.capability) return { status: 'GATED', reason: 'capability-route-not-authorized' };
  if (route.provider !== descriptor.server) return { status: 'GATED', reason: 'provider-route-mismatch' };
  if (!BILLING.has(descriptor.billing_mode) || route.billing_mode !== descriptor.billing_mode) return { status: 'GATED', reason: 'billing-not-verified' };
  if (!descriptor.security_permitted || permission.status !== 'ALLOWED') return { status: 'GATED', reason: 'security-permission-required' };
  return { status: 'READY', transport: 'MCP', server: descriptor.server, tool: descriptor.tool, capability: descriptor.capability, billing_mode: descriptor.billing_mode };
}
