const risks = new Set(['R0','R1','R2','R3','R4']);
const grants = new Set(['ALLOW_ONCE','ALLOW_SESSION','ALLOW_ALWAYS_SPECIFIC_ACTION','DENY']);
const handlePattern = /^credential:\/\/[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)+$/i;

export function validateCredentialHandle(handle) {
  return typeof handle === 'string' && handle.length <= 200 && handlePattern.test(handle);
}

export function permissionDecision({ provider, resource, action, environment = 'LOCAL', risk, credential_handle = null, grant = null, exact_grant_match = false, destructive = false, security_critical = false } = {}) {
  if (![provider, resource, action].every(value => typeof value === 'string' && value.length > 0 && value.length <= 200)) throw new Error('provider, resource and action are required');
  if (!risks.has(risk)) throw new Error('invalid risk');
  if (credential_handle !== null && !validateCredentialHandle(credential_handle)) throw new Error('credential must be an opaque credential:// handle');
  if (grant !== null && !grants.has(grant)) throw new Error('invalid grant');
  if (grant === 'DENY') return { status: 'DENIED', provider, resource, action, environment, risk, credential_handle, reason: 'explicit-deny' };
  const mandatory = risk === 'R4' || environment === 'PRODUCTION' || destructive || security_critical;
  if (mandatory) return { status: 'APPROVAL_REQUIRED', provider, resource, action, environment, risk, credential_handle, reason: 'mandatory-high-risk-approval' };
  if (grant && exact_grant_match) return { status: 'ALLOWED', provider, resource, action, environment, risk, credential_handle, grant, reason: 'matching-explicit-grant' };
  if (risk === 'R0' && credential_handle === null) return { status: 'ALLOWED', provider, resource, action, environment, risk, credential_handle, reason: 'non-sensitive-metadata' };
  return { status: 'APPROVAL_REQUIRED', provider, resource, action, environment, risk, credential_handle, reason: credential_handle ? 'credential-action-needs-grant' : 'action-needs-grant' };
}
