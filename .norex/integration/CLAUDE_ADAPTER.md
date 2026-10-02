# Claude Provider Adapter Contract

## Role
Claude is a replaceable Norex worker, not a system of record. Typical strengths: large implementation, frontend/backend work, test creation, continuous engineering.

## Input
Receive a Context Compiler package: task/objective, authority, selected source context, surfaces/impact, evidence/failures, allowed capabilities, billing/security mode, output contract.

## Output
Emit normalized Norex events/artifacts: progress, changed-file/diff references, discoveries, validation requests/results, failures, usage metadata where available, handoff state.

## Access modes
SUBSCRIPTION_EXISTING_ACCESS — allowed only when the actual integration path is verified as included/permitted.
VERIFIED_FREE — allowed.
METERED_API — locked until explicit Mike approval.
UNKNOWN_BILLING — locked.

A Claude subscription must never be assumed to include Anthropic API billing.

## Execution
Prefer native/provider-supported interfaces when available, wrapped behind this adapter. Provider-specific strengths may be exposed as optional capabilities without leaking into portable task/core schemas.

## Failure/fallback
Classify: unavailable, auth_required, allowance_exhausted, context_limit, provider_error, policy_blocked, billing_blocked.
Preserve task/event/checkpoint state and return control to Capability Broker for another permitted route.

## Security
No raw credential in prompt/context/event/log. Credential Broker resolves any authorized provider credential outside model context.
