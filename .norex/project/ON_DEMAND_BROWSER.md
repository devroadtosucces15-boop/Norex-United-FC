# On-Demand Browser Contract

Norex Dev is not a general-purpose browser.

Lifecycle:
open -> authenticate/session restore -> navigate -> inspect -> request approval if needed -> act -> verify -> capture evidence -> close.

Use browser interaction when a supported API/CLI is unavailable or human-visible web configuration is materially useful.

Prefer programmatic APIs/tokens for stable automation when security/cost/policy permits.

Persistent browser profiles may reduce repeated login but remain machine-local sensitive runtime state.

MFA and CAPTCHA are human checkpoints. Never bypass them.

Production mutations follow environment/risk/approval policy. The browser must not expose credentials to model context.

## Executable adapter slice — 2026-10-04

A zero-package local Chromium adapter now probes supported installed executables and enforces localhost-only navigation before process launch. The initial capture primitive is ephemeral/headless, disables common background network services, uses bounded stdout/stderr, and has a hard timeout. External URLs are rejected before Chromium starts. Persistent profiles, authentication, arbitrary navigation, mutation and production actions remain gated.
