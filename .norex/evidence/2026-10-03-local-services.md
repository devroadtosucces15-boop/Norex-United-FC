# Local-service slice evidence — 2026-10-03

Owner: Codex. Scope: ND-013, ND-020, ND-021, ND-022. Environment: LOCAL Linux.
Starting commit: 47a0b94. Branch: foundation/norex-dev-shadow.

## Verified baseline

- Checkout was clean on the requested foundation branch.
- `/mnt/DEV_WORK` was mounted from `/dev/sdc1`, label DEV_WORK, UUID
  `270f1795-e1d3-4e87-85c8-c0bc729f2a07`.
- Repository: `/mnt/DEV_WORK/Projects/Norex/Norex-United-FC`.
- Node v24.19.0, npm 12.0.2; the original `npm run check` passed.
- Existing server responded on 127.0.0.1:4177; its working directory matched this
  checkout. Original `/api/state` returned “Not found”: this proved the static
  runtime, not operational services. The supplied conversation's user report of
  opening the shell is additional user evidence, not proof of service execution.

## Implemented and validated

- Dependency-free Node local API, scoped Git status and staged/unstaged diffs,
  Shadow file inventory and text inspection, three fixed execution choices.
- `npm --prefix .norex/dev-os run check`: PASS, four JavaScript files checked.
- `npm --prefix .norex/dev-os test`: PASS, six tests, zero failures.
- Regression assertions cover traversal, secret-path exclusion, hidden paths,
  symlinks, binary/oversized reads, Git scope, literal Git pathspecs, staged versus
  unstaged output, unknown/extra command arguments, concurrent execution, code
  changes since startup, branch gating, nonzero exit, timeout, output cap,
  sanitized environment, Host/Origin/Fetch-Metadata/header checks and approval.
- Existing static server was replaced with the new server on the same loopback
  address. No production service was started or modified.
- In-app browser keyboard smoke checks: DIFF listed only Shadow paths; package
  inspection showed the real package manifest; unstaged package patch was shown
  separately from staged output. TESTS ran both targets and displayed PASS/exit 0.
- Runtime UI syntax request: 594a4139-a5b6-48ba-8e13-1fef4aa43edf,
  2026-10-03T21:27:03.918Z to 21:27:04.094Z, PASS.
- Runtime UI regression request: f2a93419-c15f-41b4-9dc0-d2925740da26,
  2026-10-03T21:27:10.040Z to 21:27:10.796Z, six passed, zero failed.
- TERMINAL ran Node version, request 7d41ff7f-c7c8-42f2-8971-d4ed2f1c7669,
  2026-10-03T21:27:20.906Z to 21:27:20.929Z, PASS, v24.19.0.
- PREVIEW visibly remained GATED. Provider calls and paid APIs were not used.
- Narrow layout and desktop full-page layout visually inspected. Initial pointer
  automation in the in-app browser had no effect; keyboard activation worked.
  Pointer/device QA is not claimed complete. This is a targeted smoke check,
  not a full cross-device accessibility or visual certification.

## Status interpretation

ND-021 moves from VALIDATION to MIKE_REVIEW based on verified runtime, targeted
visual evidence, and live service controls. Product-owner acceptance remains open.
ND-013 and ND-022 stay IN_PROGRESS: the controlled read/execute slice is validated,
while broader write/PTY/browser capabilities are not delivered. ND-020 stays
IN_PROGRESS: Shadow dispatch works; full project dispatch is gated.

## Deliberate remaining gates and limits

- Git writes, main merge, arbitrary terminal input, PTY/interactive sessions,
  provider adapters, browser automation, persistent run history and remote CI.
- Full `node tests/run.mjs` is not exposed or claimed to pass: it builds outside
  `.norex/`, conflicting with this task's isolation scope. Existing harness remains
  authoritative for broader project validation after a scoped execution design.
- File/output redaction is defense in depth, not a secret detection guarantee.
  Credentials must never be placed in readable Shadow source/documents.
- Commands run trusted reviewed checkout code with the user's OS permissions.
  This service is an allowlisted single-user controller, not an OS sandbox for
  hostile code or a multi-user authenticated service. See LOCAL_SERVICES.md.
