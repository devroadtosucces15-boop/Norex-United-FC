# Local Service Contracts — Git / Filesystem / Terminal

Phase-I contracts plus the controlled executable slice documented below.

## Git Service
Capabilities: status, branches, log with DATA_AUTOMATION filtering, diff, stage/commit, safe branch creation, compare, checkpoint identification.
Default safety: no force push/history rewrite/destructive reset without explicit approval. Foundation -> main merge prohibited during Shadow Phase.

## Filesystem Service
Capabilities: scoped read/search/write, artifact generation, project-root boundary enforcement, ignore/sensitive-path policy.
Writes require task-authorized paths. Raw credential stores are never model-readable.

## Terminal/PTTY Service
Capabilities: spawn scoped commands, stream stdout/stderr, cancellation, working-directory/environment policy, exit status, deterministic validation dispatch.
Separate command proposal from privileged execution. Redact secrets from logs.

## Common result envelope
request_id, task_id, service, operation, status, started_at, finished_at, exit/result summary, artifact/evidence refs, redactions, approval refs.

## Principle
Agents request capabilities. Norex services execute them under policy. Provider adapters do not receive unrestricted machine authority.

## Implemented local slice — 2026-10-03

Owner: Codex. Evidence: `.norex/evidence/2026-10-03-local-services.md`.
The contracts above remain the longer-term target; this executable slice is narrower.

Start with `cd .norex/dev-os && npm run check && npm test && npm start`, then open
`http://127.0.0.1:4177`. Node >=22 and Linux `/usr/bin/git` are required. No install,
external dependency, account, API key, provider SDK or paid API is required.

| Surface / endpoint | Current behavior |
| --- | --- |
| DIFF / GET `/api/git/status` | Branch plus readable `.norex/` changes, including untracked paths |
| DIFF / GET `/api/git/diff?path=…` | Separate staged and unstaged patches for one literal scoped path |
| DIFF / GET `/api/files`, `/api/file?path=…` | Bounded Shadow inventory and read-only text inspection |
| TESTS / POST `/api/run` | `shadow-check` and `shadow-tests` fixed target IDs |
| TERMINAL / POST `/api/run` | Same checks plus `node-version`; explicit Approve & run locally action |
| GET `/api/state` | Branch, scope, command registry, busy state and capability gates |

POST bodies accept exactly `{ "command_id": "shadow-check", "approved": true }`.
Arguments, working directories, executable paths and environment overrides cannot
be supplied by callers. Commands use `spawn` without a shell. Only the named
foundation branch may execute commands. One execution runs at a time; each child
has a 30-second deadline and 128 KiB combined output cap; process groups are killed
on limits and cleaned up on completion. Git inspection has a 15-second deadline.
Only fixed PATH/HOME/locale/timezone/CI/Git settings are passed to child processes;
credentials and Node preload options are not inherited. Changed executable source
requires a reviewed server restart. The code snapshot is an accidental-edit guard,
not an adversarial filesystem race defense.

The server binds only to 127.0.0.1 and accepts its exact Host. API requests require a
custom header, same-origin Fetch Metadata when supplied, and no cross-origin
Origin. Execution additionally requires same-origin JSON and explicit approval.
No CORS grant is emitted. This blocks browser drive-by requests and DNS rebinding;
it is not authentication against other local processes running as the same user.
Static assets are allowlisted; server source is not directly served. The UI renders
all file/command output as text, with CSP and no external resources.

Filesystem policy allows a small text extension set under `.norex/`, excludes
hidden/sensitive-named paths, rejects symlinks and traversal, and limits file sizes
and inventory traversal. Git uses literal pathspecs and disables external diff,
text conversion, filesystem monitors and hooks. Common key/secret formats are
redacted from returned text. This does not make arbitrary secret-containing files
safe to expose: the repository's no-raw-credentials policy still applies.

Execution responses include request ID, task ID, operation, branch, timestamps,
status, exit code and bounded output. UI run history lasts until reload; durable
logs/evidence storage, streaming, cancellation and PTY support are deferred. Test
fixtures use disposable OS temporary directories and remove them after execution;
they do not change this checkout's main branch or production files.

Do not add the full site build/test command to this registry without inspecting
its filesystem/network effects and defining the permitted execution scope. The
existing root `tests/run.mjs` remains the project harness; this slice adds regression
coverage only for the new Shadow service. The service executes reviewed trusted
local code, not untrusted scripts in a kernel-enforced sandbox.
