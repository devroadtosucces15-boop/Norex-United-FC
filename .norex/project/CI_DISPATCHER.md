# Deterministic CI Dispatcher

## Principle
AI reasons. Deterministic tools execute repeatable validation.

## Existing first-class Norex United target
Command: node tests/run.mjs
Observed behavior: syntax checks JavaScript, builds the site, runs feature tests with fresh in-memory D1/KV test state. Supports targeted test names and --no-build.
CI: .github/workflows/test.yml.

Do not rebuild this harness inside Dev OS.

## Dispatcher responsibilities
- select validation from task impact/DoD
- execute locally when permitted
- stream/capture stdout/stderr and exit code
- redact sensitive output
- compress results for AI interpretation
- persist evidence reference
- escalate failing evidence to active worker
- optionally request broader CI only when shared impact requires it

## Strategy
Targeted first -> shared regression -> full suite when justified.

## Result envelope
run_id, task_id, command_id, environment, commit/checkpoint, started/finished, exit_code, status, summary, failure excerpts, full-log artifact ref, evidence ref.

## Safety
Commands come from approved project validation registry/task policy, not arbitrary untrusted generated text by default.

## GitHub CI
Remote CI complements local execution. Do not consume remote resources unnecessarily when local deterministic validation is sufficient; use required branch/protection/deployment checks where applicable.

## Controlled Shadow implementation

The local service currently dispatches fixed `shadow-check` and `shadow-tests`
commands from `.norex/dev-os/local-services.mjs`. These validate the new Dev OS
slice only. `node tests/run.mjs` remains the full-project harness and is not exposed
by this registry because its build writes outside the authorized `.norex/` scope.
No full-project or remote-CI pass is claimed by a Shadow test result. Runtime
evidence: `.norex/evidence/2026-10-03-local-services.md`.
