# ND-016 / ND-017 provider readiness evidence

Date: 2026-10-04
Status: IN_PROGRESS

Added a shared executable readiness gate for Claude and Codex. It does not execute either CLI/API. READY requires installed presence, VERIFIED authentication, AVAILABLE allowance, verified included/free billing, an exact routed provider/billing match and ALLOWED security permission. Unknown billing or authentication remains gated.

Validation: `npm run check` passed and `node --test services.test.mjs` passed 33/33. Synthetic deterministic tests cover READY and auth/billing/permission rejection. Current real provider probes remain deliberately UNKNOWN for auth/allowance/billing, so no provider call or spend occurred.

## Local authentication observation — 2026-10-04

Non-generative CLI status commands were run locally. Claude reports `loggedIn: false` / auth method `none`. Codex reports `Logged in using ChatGPT`. A pure classifier now normalizes that Codex status to VERIFIED auth with `SUBSCRIPTION_EXISTING_ACCESS`, while deliberately retaining allowance as UNKNOWN; Claude is normalized to NOT_AUTHENTICATED with UNKNOWN billing/allowance. No model inference, API request, token read or provider usage occurred. Because Codex allowance remains UNKNOWN and Claude is not authenticated, actual provider dispatch remains gated.
