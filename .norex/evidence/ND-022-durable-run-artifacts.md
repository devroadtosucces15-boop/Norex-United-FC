# ND-022 Durable Run Artifact References

Status: IN_PROGRESS_VALIDATED_SLICE

Local deterministic executions now create durable SQLite artifact records tied to session, task and execution identity. Artifact kinds distinguish TESTS, TERMINAL and workflow runs; references use the local `execution://<id>` namespace. Each creation emits an `ArtifactCreated` event. A read-only `/api/artifacts` surface and the TESTS/TERMINAL UI expose recent durable references.

This slice deliberately persists metadata/references, not raw terminal output. Durable bounded output/log blobs, preview/browser artifacts and artifact retention policy remain pending.

Validation: top-level Shadow suite 20/20 PASS after updating event-count expectations. Metered API calls: 0. Incremental API cost: $0.00.

## 2026-10-04 bounded output follow-up

Deterministic execution output can now be persisted separately from artifact metadata, capped at 32 KiB per execution and passed through the runtime secret-like-data guard. Truncation is explicit. A same-origin read-only endpoint resolves output by execution id. Output is deliberately excluded from recovery export v1 until a versioned schema migration is defined.
