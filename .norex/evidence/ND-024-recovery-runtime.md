# ND-024 Recovery Runtime Slice

Status: IN_PROGRESS_VALIDATED_SLICE

Validated versioned SQLite runtime export/restore, empty-target enforcement, transactional restore, schema rejection, secret-like material rejection, and conversion of active executions to INTERRUPTED after restore.

Remaining: portable bundle file IO, integrity manifest, UI flow, credential rebinding and cross-version migrations.

Validation: `npm run check` PASS; `node --test services.test.mjs` PASS (16/16).

## 2026-10-04 portable bundle follow-up

Added `.norex/dev-os/recovery-bundle.mjs`: exclusive mode-0600 bundle output, SHA-256 integrity manifest, verified read and transactional restore handoff. Test coverage proves duplicate-write rejection, successful restore and tamper rejection.

During validation, pre-existing async test assertions in the new filesystem tests were found to omit `await`, which could race fixture cleanup. They were corrected; the top-level suite is now 21/21 PASS with no async-after-test warning.

## Runtime schema v2 follow-up

Promoted runtime export to schema v2 and added bounded execution-output export/restore. Backward compatibility with schema v1 is retained. Regression validation confirms recoverable output survives export/restore and active executions are still converted to INTERRUPTED.

## Canonical integrity serialization — 2026-10-04

Recovery SHA-256 integrity now canonicalizes object keys recursively before serialization, so equivalent runtime state produces the same digest independent of object insertion order. Arrays retain order. Regression coverage verifies an envelope with reordered top-level keys still validates while state tampering remains rejected.

## Repository identity binding — 2026-10-04

Recovery envelope v2 can bind the runtime bundle to an exact repository root, Shadow branch, and commit. The repository identity is covered by the canonical SHA-256 digest. Restore of a bound bundle requires the caller to provide an exact matching repository identity; missing or mismatched identity is rejected before runtime state import. Unbound legacy envelope v1 remains readable for backward compatibility. Credential rebinding and user-facing recovery flow remain gated.

## Approval-gated recovery export API — 2026-10-04

The local Dev OS now exposes a same-origin JSON recovery export action that requires explicit approval. It creates a mode-0600 temporary v2 bundle, binds it to the exact repository root/branch/commit, reads it back through the integrity verifier, returns only non-secret verification metadata, and removes the temporary bundle before responding. It does not expose an arbitrary filesystem path or restore mutation through HTTP. Deterministic coverage verifies denial without approval plus exact repository identity and SHA-256 verification on approval.
