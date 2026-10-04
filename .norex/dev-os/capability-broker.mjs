const deterministic = new Set(['build','lint','typecheck','unit_tests','integration_tests','e2e_tests','database_checks','security_scans','deterministic_execution']);
const allowedModes = new Set(['LOCAL_OFFLINE','SUBSCRIPTION_EXISTING_ACCESS','VERIFIED_FREE','METERED_API','UNKNOWN_BILLING']);

export function routeCapability({ capability, candidates = [], override = null, mike_approved_metered = false } = {}) {
  if (typeof capability !== 'string' || !capability || capability.length > 100) throw new Error('capability is required');
  if (!Array.isArray(candidates) || candidates.length > 20) throw new Error('candidates must be a bounded array');
  if (deterministic.has(capability)) return { status: 'ROUTED', capability, provider: 'local_ci', billing_mode: 'LOCAL_OFFLINE', reason: 'deterministic-local-first', cost_permission: 'ALLOWED' };
  const normalized = candidates.map(candidate => {
    if (!candidate || typeof candidate.provider !== 'string' || !allowedModes.has(candidate.billing_mode)) throw new Error('invalid candidate');
    const billingAllowed = candidate.billing_mode === 'LOCAL_OFFLINE' || candidate.billing_mode === 'VERIFIED_FREE' ||
      (candidate.billing_mode === 'SUBSCRIPTION_EXISTING_ACCESS' && candidate.verified === true) ||
      (candidate.billing_mode === 'METERED_API' && mike_approved_metered === true);
    const health = ['healthy','degraded','unknown'].includes(candidate.health) ? candidate.health : 'unknown';
    const quality = Number.isFinite(candidate.quality_score) ? Math.max(0, Math.min(100, candidate.quality_score)) : 50;
    const reliability = Number.isFinite(candidate.reliability_score) ? Math.max(0, Math.min(100, candidate.reliability_score)) : 50;
    const allowance = Number.isFinite(candidate.allowance_score) ? Math.max(0, Math.min(100, candidate.allowance_score)) : 50;
    const healthPenalty = health === 'healthy' ? 0 : health === 'degraded' ? 25 : 10;
    const priority = (candidate.rank ?? 999) * 1000 + healthPenalty * 10 - quality - reliability - allowance;
    return { ...candidate, health, priority, eligible: candidate.available === true && candidate.security_permitted === true && billingAllowed };
  });
  const requested = override ? normalized.find(candidate => candidate.provider === override) : null;
  if (override && !requested) return { status: 'GATED', capability, provider: override, reason: 'override-route-unavailable', cost_permission: 'BLOCKED' };
  if (requested && requested.eligible) return { status: 'ROUTED', capability, provider: requested.provider, billing_mode: requested.billing_mode, reason: 'mike-override', cost_permission: 'ALLOWED' };
  if (requested && !requested.eligible) return { status: 'GATED', capability, provider: requested.provider, billing_mode: requested.billing_mode, reason: requested.billing_mode === 'METERED_API' && !mike_approved_metered ? 'metered-approval-required' : 'override-route-ineligible', cost_permission: 'BLOCKED' };
  const eligible = normalized.filter(candidate => candidate.eligible).sort((a,b) => a.priority - b.priority || a.provider.localeCompare(b.provider));
  if (eligible.length) { const selected = eligible[0]; return { status: 'ROUTED', capability, provider: selected.provider, billing_mode: selected.billing_mode, reason: 'highest-ranked-permitted-route', cost_permission: 'ALLOWED' }; }
  const metered = normalized.find(candidate => candidate.available === true && candidate.security_permitted === true && candidate.billing_mode === 'METERED_API');
  if (metered && !mike_approved_metered) return { status: 'GATED', capability, provider: metered.provider, billing_mode: metered.billing_mode, reason: 'metered-approval-required', cost_permission: 'BLOCKED' };
  return { status: 'GATED', capability, provider: null, reason: 'no-permitted-route', cost_permission: 'BLOCKED' };
}
