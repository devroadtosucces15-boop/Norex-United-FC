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

## Portable bundle + integrity slice — 2026-10-04

The Dev OS now writes an exclusive (`wx`), mode-0600 JSON recovery envelope containing the non-secret runtime export plus a SHA-256 integrity digest. Restore verifies format/version/algorithm and digest before passing state to the transactional restore engine. Tampered bundles are rejected. This primitive is not yet exposed as an unrestricted browser write endpoint.

## Runtime export schema v2 — 2026-10-03

Runtime export schema v2 now includes bounded `execution_output` rows. Restore accepts both v1 and v2 bundles: v1 restores without execution output, while v2 restores it after executions so foreign-key integrity is preserved. The outer recovery-envelope format remains v1 because its envelope structure and SHA-256 verification semantics did not change.

## Canonical integrity serialization — 2026-10-04

Recovery-envelope integrity hashing now recursively sorts object keys before JSON serialization. This removes insertion-order dependence from the SHA-256 state digest while preserving array order and existing envelope/version semantics.
