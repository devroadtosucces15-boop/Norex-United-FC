import { routeCapability } from './capability-broker.mjs';

export function routeWithDurableApproval({ store, session_id, capability, candidates = [], override = null }) {
  const candidate = override ? candidates.find(item => item && item.provider === override && item.billing_mode === 'METERED_API') : null;
  const action = candidate ? ['metered', candidate.provider, capability].join(':') : null;
  const approval = action ? store.findApproval({ session_id, action, scope: 'single-route', risk: 'R3' }) : null;
  return { ...routeCapability({ capability, candidates, override, mike_approved_metered: Boolean(approval) }), approval_id: approval?.id ?? null };
}
