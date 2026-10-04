# ND-015 Local Browser Adapter

Status: IN_PROGRESS_VALIDATED_SLICE

Observed supported local executables include `/usr/bin/chromium` and `/usr/bin/google-chrome`. `.norex/dev-os/browser-service.mjs` implements a zero-package executable probe and localhost-only ephemeral headless DOM capture primitive. Tests prove installed-browser detection and rejection of external HTTPS navigation before launch.

Not enabled yet: UI/API browser execution, persistent profiles, credentials/authentication, arbitrary internet navigation, mutation, MFA/CAPTCHA automation, or production actions.

Metered API cost: $0.00.
