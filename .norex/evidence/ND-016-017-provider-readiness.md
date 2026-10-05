# ND-016 / ND-017 provider readiness evidence

Date: 2026-10-04
Status: IN_PROGRESS

Added a shared executable readiness gate for Claude and Codex. It does not execute either CLI/API. READY requires installed presence, VERIFIED authentication, AVAILABLE allowance, verified included/free billing, an exact routed provider/billing match and ALLOWED security permission. Unknown billing or authentication remains gated.

Validation: `npm run check` passed and `node --test services.test.mjs` passed 33/33. Synthetic deterministic tests cover READY and auth/billing/permission rejection. Current real provider probes remain deliberately UNKNOWN for auth/allowance/billing, so no provider call or spend occurred.
