# Local Persistence Contract

## Root
Default runtime root: ~/.norex/

## SQLite runtime database
Candidate entities:
- sessions
- events
- tasks/runtime leases
- executions
- artifacts
- evidence index
- usage
- provider health/capabilities
- approvals
- references
- local configuration metadata

SQLite is runtime state, not the sole canonical source for accepted project truth.

## Filesystem
Suggested:
~/.norex/norex.db
~/.norex/projects/
~/.norex/artifacts/
~/.norex/references/
~/.norex/logs/
~/.norex/cache/
~/.norex/browser/

## Secrets
Raw credentials do not belong in SQLite. Store secrets in OS keychain/secure vault and persist only opaque handles/references.

## Durability
Use migrations, transactions, foreign keys, WAL where appropriate, backup/export, corruption recovery, and schema versioning when implementation begins.

## Privacy
Local project/runtime material stays local unless the Context Compiler selects it for an authorized external execution. The UI should be capable of showing what context will be sent.

## Portability
Provide export/restore of non-secret runtime state later, but never make local runtime export a prerequisite for reconstructing canonical project decisions.

## Implemented runtime slice — 2026-10-03

`.norex/dev-os/runtime-store.mjs` now provides a dependency-free SQLite v1 runtime store using Node's built-in `node:sqlite`. The executable Dev OS startup opens `~/.norex/norex.db`, enables foreign keys and WAL, and creates versioned tables for sessions, tasks/runtime leases, executions, events, approvals, artifacts and evidence index.

The local HTTP execution path records deterministic command/workflow executions and normalized CI events when a runtime store is attached. ND-025 approval/evidence metadata is indexed without storing evidence contents in SQLite. Runtime payloads reject common secret-like material; this is a defense-in-depth guard and does not replace the Credential Broker.

Tests use disposable SQLite databases outside the repository and verify close/reopen durability, event ordering, normalized task/execution state, approval/evidence indexes, secret-like payload rejection and HTTP execution event recording. Provider adapters, credential resolution, export/restore, artifact file storage and full observability remain separate gated work.
