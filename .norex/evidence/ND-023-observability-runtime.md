# ND-023 Observability Runtime Slice

Status: IN_PROGRESS_VALIDATED_SLICE

Durable deterministic execution metadata and normalized CI events are recorded in local SQLite. `/api/state` exposes non-secret aggregate runtime health/counts. Provider calls remain zero and billing mode is LOCAL_OFFLINE for the implemented path.

Remaining: provider allowance/cost telemetry, retries/fallbacks, correction/override analytics, richer UI inspection and artifact/log references.

## 2026-10-04 durability follow-up

Runtime DB permissions are explicitly enforced at 0600 and covered by a regression assertion. Executable server startup now installs one-shot SIGINT/SIGTERM handlers, closes the HTTP server, closes SQLite, and uses a bounded 3-second forced-exit fallback.

## Session execution telemetry — 2026-10-04

Runtime state now exposes session-scoped execution telemetry derived from persisted executions: total execution count, exact accumulated `cost_microunits`, and deterministic groups by provider, billing mode, and status. The implemented local path reports `LOCAL_OFFLINE` with zero cost; no provider allowance or cost is inferred. `/api/state` returns this telemetry alongside aggregate runtime counts.

## UTF-8 bounded-output hardening — 2026-10-04

Browser capture and durable execution output now share a strict UTF-8 byte-prefix primitive. Truncation backs off only an incomplete trailing code point, so a legitimate U+FFFD replacement character is preserved rather than mistaken for truncation damage. Regression coverage verifies emoji boundaries, exact byte limits, and legitimate replacement characters.

## Persisted session pulse — 2026-10-04

`/api/state` now separates execution cost telemetry from a session observability pulse derived only from persisted runtime facts. The pulse reports execution failures plus recorded provider selections/failures, Mike/user overrides and approval outcomes, CI pass/fail events, artifacts and evidence counts. It does not infer retries, fallbacks, allowance or provider health that the current runtime does not yet record.

## UI runtime pulse — 2026-10-04

The Dev OS cost-guard rail now loads persisted `/api/state` telemetry and displays exact recorded metered cost plus execution, CI-pass/fail and artifact counts. Failure to load telemetry degrades to an explicit unavailable state rather than fabricated values.
