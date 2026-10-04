# ND-022 Durable Run Artifact References

Status: IN_PROGRESS_VALIDATED_SLICE

Local deterministic executions now create durable SQLite artifact records tied to session, task and execution identity. Artifact kinds distinguish TESTS, TERMINAL and workflow runs; references use the local `execution://<id>` namespace. Each creation emits an `ArtifactCreated` event. A read-only `/api/artifacts` surface and the TESTS/TERMINAL UI expose recent durable references.

This slice deliberately persists metadata/references, not raw terminal output. Durable bounded output/log blobs, preview/browser artifacts and artifact retention policy remain pending.

Validation: top-level Shadow suite 20/20 PASS after updating event-count expectations. Metered API calls: 0. Incremental API cost: $0.00.
