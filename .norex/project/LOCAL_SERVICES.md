# Local Service Contracts — Git / Filesystem / Terminal

Phase-I specification only.

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
