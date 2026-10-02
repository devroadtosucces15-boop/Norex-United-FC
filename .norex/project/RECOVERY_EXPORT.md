# Recovery / Export / Restore v1

## Canonical recovery
Clone repository -> read .norex authority/roadmap/ADRs/tasks/evidence contracts -> restore permitted credentials -> rebuild local runtime -> resume task from checkpoint.

## Runtime export
Future Dev OS export bundle may contain non-secret SQLite/runtime metadata, event/session history, local references and artifact indexes. Secrets are excluded; credential handles may be exported only as unresolved identifiers.

## Restore
Validate schema/version, import non-secret runtime state, rebind credentials through secure broker, verify repository/commit identity, mark stale executions interrupted, then recompile active task context.

## Disaster principle
Loss of ~/.norex must be inconvenient, not catastrophic. Accepted product/engineering truth must remain recoverable from portable canonical state.
