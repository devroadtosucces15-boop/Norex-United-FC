# ND-019 Capability Broker Runtime Slice

Status: IN_PROGRESS_VALIDATED_SLICE
Branch: foundation/norex-dev-shadow
Provider calls: 0
Incremental metered API cost: $0.00

## Validated

- Deterministic capabilities route local-first.
- Candidate routes require availability and security permission.
- SUBSCRIPTION_EXISTING_ACCESS requires verified=true.
- UNKNOWN_BILLING is blocked.
- METERED_API requires explicit owner approval state in the internal broker.
- Local HTTP routing cannot self-assert metered approval.
- Explicit provider override is honored only when the route remains policy eligible.
- Capability Broker source is included in the trusted executable snapshot guard.

## Remaining before DONE

Provider availability/auth/allowance probes, durable approval integration, historical telemetry ranking, provider dispatch/fallback and normalized provider health remain unimplemented.

## Validation

`npm run check`: PASS
`node --test services.test.mjs`: PASS (14/14)
