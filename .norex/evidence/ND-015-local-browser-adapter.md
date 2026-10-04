# ND-015 Local Browser Adapter

Status: IN_PROGRESS_VALIDATED_SLICE

Observed supported local executables include `/usr/bin/chromium` and `/usr/bin/google-chrome`. `.norex/dev-os/browser-service.mjs` implements a zero-package executable probe and localhost-only ephemeral headless DOM capture primitive. Tests prove installed-browser detection and rejection of external HTTPS navigation before launch.

Not enabled yet: UI/API browser execution, persistent profiles, credentials/authentication, arbitrary internet navigation, mutation, MFA/CAPTCHA automation, or production actions.

Metered API cost: $0.00.

## Local PREVIEW integration

The same-origin `/api/preview` endpoint now requires an exact `{approved:true}` JSON request and invokes only the current Dev OS localhost origin. PREVIEW UI exposes an explicit approval button. A live smoke on an ephemeral Dev OS port returned `passed`, exit 0, and captured 3222 bytes of local DOM. No external navigation or persistent profile was enabled.

Validation note: one full-suite run showed the previously observed ND-025 nested-workflow timing flake. The exact failing test passed immediately in isolation and the subsequent complete suite passed 22/22, so no unrelated behavior was masked or changed.

The repeated ND-025 flake was diagnosed as the nested full Shadow suite occasionally exceeding its 30-second outer workflow timeout as the suite grew. The nested test-validation timeout is now 60 seconds while individual fixed command limits remain unchanged. This is a bounded deterministic fix, not a skip or pass override.

## Ephemeral profile hardening — 2026-10-04

Each local preview capture now creates a unique OS-temporary Chromium user-data directory, uses it as HOME/profile storage, and removes it recursively in a finally block after success, failure or timeout. Runtime state now reports `local-preview` rather than the stale generic `gated` label. Persistent profiles/auth remain gated.
