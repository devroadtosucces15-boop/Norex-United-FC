import { permissionDecision } from './permission-broker.mjs';

const SCOPE = 'permission-action';

export function permissionWithDurableGrant({ store, session_id, provider, resource, action, environment = 'LOCAL', risk, credential_handle = null, destructive = false, security_critical = false } = {}) {
  if (!store || typeof store.findApproval !== 'function') throw new Error('runtime approval store is required');
  const approvalAction = `permission:${provider}:${resource}:${action}:${environment}:${credential_handle ?? 'none'}`;
  const deny = store.findApproval({ session_id, action: approvalAction, scope: SCOPE, risk, decision: 'DENY' });
  if (deny) return { ...permissionDecision({ provider, resource, action, environment, risk, credential_handle, grant: 'DENY', exact_grant_match: true, destructive, security_critical }), approval_id: deny.id };
  const approval = store.findApproval({ session_id, action: approvalAction, scope: SCOPE, risk, decision: 'APPROVED' });
  const decision = permissionDecision({ provider, resource, action, environment, risk, credential_handle, grant: approval ? 'ALLOW_SESSION' : null, exact_grant_match: Boolean(approval), destructive, security_critical });
  return { ...decision, approval_id: approval?.id ?? null };
}

export function permissionApprovalAction({ provider, resource, action, environment = 'LOCAL', credential_handle = null }) {
  return `permission:${provider}:${resource}:${action}:${environment}:${credential_handle ?? 'none'}`;
}
