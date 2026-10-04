# Recovery / Export / Restore v1

## Canonical recovery
Clone repository -> read .norex authority/roadmap/ADRs/tasks/evidence contracts -> restore permitted credentials -> rebuild local runtime -> resume task from checkpoint.

## Runtime export
Future Dev OS export bundle may contain non-secret SQLite/runtime metadata, event/session history, local references and artifact indexes. Secrets are excluded; credential handles may be exported only as unresolved identifiers.

## Restore
Validate schema/version, import non-secret runtime state, rebind credentials through secure broker, verify repository/commit identity, mark stale executions interrupted, then recompile active task context.

## Disaster principle
Loss of ~/.norex must be inconvenient, not catastrophic. Accepted product/engineering truth must remain recoverable from portable canonical state.

## Implemented runtime slice — 2026-10-03

The SQLite runtime store now supports a versioned non-secret in-memory export bundle and restore into an empty runtime database. Restore validates format/schema version, runs transactionally under foreign keys, preserves session/task/event/evidence/approval identity, and converts executions that were IN_PROGRESS at export into INTERRUPTED with a restore-time finish timestamp. Secret-like bundle material is rejected before import.

This is the recovery engine primitive, not yet a user-facing backup feature. Writing/reading portable bundle files, integrity manifests, UI controls, credential rebinding and cross-version migrations remain gated.
