# Cost-Aware Capability Broker

## Goal
Choose an execution route based on capability, quality, complexity, availability, historical performance, allowance, monetary cost, security permission and provider-specific strengths.

## Route pipeline
1. derive required capabilities from task
2. remove security/policy-ineligible routes
3. remove billing-blocked routes
4. check provider availability/auth/allowance
5. rank viable routes by fit, expected quality, cost and resource conservation
6. select worker
7. dispatch compiled context
8. observe normalized events
9. escalate/fallback if needed

## Billing order
LOCAL_OFFLINE / deterministic local
VERIFIED included/subscription access
VERIFIED_FREE
METERED_API — locked
UNKNOWN_BILLING — locked

This is not a simplistic cheapest-model router. A lower-cost worker that is unlikely to complete a high-risk task correctly may have higher total cost.

## Deterministic separation
Build/lint/typecheck/tests/database checks/security scans route to deterministic execution unless AI reasoning is specifically required to interpret or repair a failure.

## Overrides
Mike may explicitly select a provider. Override still cannot bypass mandatory security/destructive controls; metered cost requires explicit approval.

## Fallback
Fallback must preserve task/checkpoint/evidence. Do not restart from raw conversation if canonical state can resume work.

## Future telemetry
Track task class, provider, completion/failure, retries, elapsed time, allowance/cost, validation outcome and Mike corrections. Use this to improve routing without allowing telemetry to override explicit authority.
