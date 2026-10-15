# ND-027 Durable Runtime State v1

Final status: VALIDATED
Branch: foundation/norex-dev-shadow
Scope: .norex/** code changes; runtime default: ~/.norex/norex.db
Provider calls: 0
Incremental metered API cost: $0.00

## Implemented

- Added built-in SQLite runtime store with schema version 1.
- Added sessions, tasks/runtime leases, executions, append-only events, approvals, artifacts and evidence-index tables.
- Enabled foreign keys and WAL.
- Added normalized execution/event recording to the local HTTP deterministic execution path.
- Added ND-025 approval and evidence indexing when durable runtime is active.
- Added secret-like runtime payload rejection as defense in depth.
- Added restart durability and HTTP persistence regression coverage.
- Added runtime store source to the trusted executable snapshot guard.

## Boundaries

SQLite is runtime state, not canonical accepted project truth. Raw credentials remain forbidden. Credential resolution, provider adapters, artifact file storage, export/restore and complete telemetry are not claimed by this task.

## Validation

- `npm run check`: PASS
- `node --test services.test.mjs`: PASS (12/12)
- Provider calls: 0
- Production/main changes: 0
