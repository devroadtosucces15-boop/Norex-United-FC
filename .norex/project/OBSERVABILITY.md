# Usage and Observability v1

Track task/execution/provider/capability, route reason, billing mode, allowance when exposed, elapsed time, retries/fallbacks, deterministic validation, result and Mike correction/override.

Never log raw prompts containing secrets or raw credentials. Prefer structured metadata + redacted artifact references.

UI should answer:
- what is working now?
- which provider/capability is active?
- why was it selected?
- what did it cost / what allowance was consumed?
- what failed or fell back?
- what evidence was produced?

$0.00 means measured/authorized incremental metered cost, not an unsupported claim that all underlying subscriptions are free.

## Implemented local slice — 2026-10-03

Durable local executions now capture task/execution identity, operation, provider (`local`), billing mode (`LOCAL_OFFLINE`), timestamps, status, exit code/summary and normalized CI events in the SQLite runtime store. `/api/state` exposes aggregate runtime counts/schema version only; it does not expose raw event payloads or credentials. This provides a minimal health/pulse surface while detailed usage, provider allowance/cost telemetry, retries/fallbacks and correction analytics remain gated.

## Runtime durability hardening — 2026-10-04

The canonical SQLite database is explicitly chmod 0600 after open; WAL/SHM companions are hardened to 0600 when present. Executable server startup now handles SIGINT/SIGTERM with bounded graceful HTTP shutdown followed by runtime-store close, reducing stale runtime state and unflushed lifecycle risk.
