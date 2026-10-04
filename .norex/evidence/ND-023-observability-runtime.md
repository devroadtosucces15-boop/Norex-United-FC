# ND-023 Observability Runtime Slice

Status: IN_PROGRESS_VALIDATED_SLICE

Durable deterministic execution metadata and normalized CI events are recorded in local SQLite. `/api/state` exposes non-secret aggregate runtime health/counts. Provider calls remain zero and billing mode is LOCAL_OFFLINE for the implemented path.

Remaining: provider allowance/cost telemetry, retries/fallbacks, correction/override analytics, richer UI inspection and artifact/log references.

## 2026-10-04 durability follow-up

Runtime DB permissions are explicitly enforced at 0600 and covered by a regression assertion. Executable server startup now installs one-shot SIGINT/SIGTERM handlers, closes the HTTP server, closes SQLite, and uses a bounded 3-second forced-exit fallback.
