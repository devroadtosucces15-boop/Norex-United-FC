# Local Persistence Contract

## Root
Default runtime root: ~/.norex/

## SQLite runtime database
Candidate entities:
- sessions
- events
- tasks/runtime leases
- executions
- artifacts
- evidence index
- usage
- provider health/capabilities
- approvals
- references
- local configuration metadata

SQLite is runtime state, not the sole canonical source for accepted project truth.

## Filesystem
Suggested:
~/.norex/norex.db
~/.norex/projects/
~/.norex/artifacts/
~/.norex/references/
~/.norex/logs/
~/.norex/cache/
~/.norex/browser/

## Secrets
Raw credentials do not belong in SQLite. Store secrets in OS keychain/secure vault and persist only opaque handles/references.

## Durability
Use migrations, transactions, foreign keys, WAL where appropriate, backup/export, corruption recovery, and schema versioning when implementation begins.

## Privacy
Local project/runtime material stays local unless the Context Compiler selects it for an authorized external execution. The UI should be capable of showing what context will be sent.

## Portability
Provide export/restore of non-secret runtime state later, but never make local runtime export a prerequisite for reconstructing canonical project decisions.
