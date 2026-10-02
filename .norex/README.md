# Norex Shadow Foundation
Portable, provider-neutral engineering intelligence for Norex.

## Phase I invariant
Deleting `.norex/` must not alter the existing application's build, runtime, tests, or deployment.
Existing code may be referenced by this foundation; existing code must not depend on it during Shadow Foundation.

Versioned project knowledge belongs here. Machine-local credentials, sessions, browser profiles, caches, logs, and runtime databases do not belong in Git.
Provider integrations are adapters, never the canonical backbone.
