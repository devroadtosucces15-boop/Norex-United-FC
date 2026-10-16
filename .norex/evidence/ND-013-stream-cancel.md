# ND-013 Streaming and Cancellation Slice

Status: IN_PROGRESS_VALIDATED_SLICE

Implemented redacted incremental runner output, AbortSignal process-group cancellation, active-run state, and same-origin `/api/cancel` request handling. Trusted source snapshot now includes the runtime, capability and permission broker modules.

Remaining: scoped write/edit service and full PTY stdin/resize/session lifecycle.

Validation: `npm run check` PASS; `node --test services.test.mjs` PASS (17/17). Provider calls: 0. Metered API cost: $0.00.

## Scoped write/edit follow-up

Validated existing-file Shadow text writes with exact expected-content preconditions and single-match edits. The service reuses the no-symlink, path, branch and size policy and rejects common raw token/key material. Creation of new files and arbitrary caller-exposed write HTTP routes are not enabled by this slice.

Validation after follow-up: 18/18 tests PASS.

## New-file creation follow-up

Validated exclusive (`wx`) creation of new Shadow text files inside already-existing, real, non-symlink parent directories. Creation inherits branch/path/size/secret policy and cannot overwrite existing files.

An initial regression run exposed a test fixture conflict with the sensitive-name policy and therefore caused ND-025 nested validation to fail as designed. The fixture was corrected immediately; targeted regression returned 3/3 PASS before the full validation below.

## PTY follow-up

Added a dependency-free Linux PTY primitive using the installed util-linux `script` binary with a fixed allowlisted Node REPL. Interactive stdin, bounded/redacted output, lifecycle read/close and session identity are validated. Native resize is explicitly returned as GATED because util-linux `script` does not expose safe resize control through this adapter; no fake resize success is reported.

Two PTY test iterations failed during implementation (first due to Node REPL invocation exiting, then due to asynchronous close timing); both were corrected immediately and the targeted PTY + ND-025 regressions returned 3/3 PASS. Full validation follows before commit.

Nested ND-025 validation initially became flaky because the PTY lifecycle test launched a nested pseudo-terminal while the workflow test itself was validating the suite. The PTY test is now skipped only under `NOREX_WORKFLOW_VALIDATION=1`, matching the existing recursion guard for ND-025 workflow tests; the normal top-level suite still executes and validates PTY behavior. Full top-level suite: 20/20 PASS.

## UI streaming/cancellation binding — 2026-10-04

TESTS/TERMINAL now poll the local state surface while an approved fixed command is active, render its accumulated redacted output incrementally, capture the active request ID, and expose a Cancel active run control that calls the existing same-origin cancellation endpoint. Controls reset after completion and the runtime pulse refreshes. This remains fixed-command execution; arbitrary shell input is not exposed.

## PTY UTF-8/output-limit hardening — 2026-10-04

The allowlisted PTY now applies the shared UTF-8 byte-bounded append helper at the 128 KiB output ceiling. Crossing the ceiling preserves a complete UTF-8 prefix, records `OUTPUT_LIMIT`, and terminates the detached PTY process group instead of silently continuing to execute while discarding output. The close handler preserves the terminal limit state. A deterministic multibyte regression validates both the byte ceiling and termination behavior. Native resize and unrestricted terminal input remain gated.

## PTY lifecycle bounds — 2026-10-04

Allowlisted PTY sessions now have a validated bounded lifetime (five-minute default, configurable only within a 1 ms–30 minute guard), a bounded active-session count (eight by default, max 32), terminal-session pruning before replacement, and explicit `TIMEOUT` process-group termination. Spawn errors are normalized to `SPAWN_FAILED` with bounded/redacted diagnostics. Regression coverage validates timeout, active-session refusal and safe replacement after a terminal state.

## Native PTY adapter — 2026-10-04

Mike approved continuing across the native PTY dependency gate. `node-pty@1.1.0` (MIT, Microsoft repository) was pinned in the Shadow-only Dev OS package after reviewing its install scripts. npm reported zero known vulnerabilities. The native module was rebuilt successfully for the local Node runtime and a smoke test exited 0 with `PTY_OK`.

A bounded native adapter now preserves the existing allowlisted `node-repl`, 128 KiB UTF-8/redacted output ceiling, timeout/session caps and input/dimension guards while adding real native terminal resize. Deterministic Shadow validation passes 35/35 including bounded native lifecycle and resize. The existing UI/runtime path is not silently switched yet; native adapter wiring and unrestricted input policy remain separate controlled work.
