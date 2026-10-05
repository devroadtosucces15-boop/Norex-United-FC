# ND-016 / ND-017 provider readiness evidence

Date: 2026-10-04
Status: IN_PROGRESS

Added a shared executable readiness gate for Claude and Codex. It does not execute either CLI/API. READY requires installed presence, VERIFIED authentication, AVAILABLE allowance, verified included/free billing, an exact routed provider/billing match and ALLOWED security permission. Unknown billing or authentication remains gated.

Validation: `npm run check` passed and `node --test services.test.mjs` passed 33/33. Synthetic deterministic tests cover READY and auth/billing/permission rejection. Current real provider probes remain deliberately UNKNOWN for auth/allowance/billing, so no provider call or spend occurred.

## Local authentication observation — 2026-10-04

Non-generative CLI status commands were run locally. Claude reports `loggedIn: false` / auth method `none`. Codex reports `Logged in using ChatGPT`. A pure classifier now normalizes that Codex status to VERIFIED auth with `SUBSCRIPTION_EXISTING_ACCESS`, while deliberately retaining allowance as UNKNOWN; Claude is normalized to NOT_AUTHENTICATED with UNKNOWN billing/allowance. No model inference, API request, token read or provider usage occurred. Because Codex allowance remains UNKNOWN and Claude is not authenticated, actual provider dispatch remains gated.

## Codex executable subscription smoke — 2026-10-04

After owner approval to cross the provider gate, Codex was invoked once through its authenticated ChatGPT path using `--ephemeral`, `--sandbox read-only`, `--ignore-user-config`, no tool use, and a fixed sentinel response. Codex v0.160.0 / OpenAI provider returned exactly `NOREX_READY`, exit 0, using 1,948 tokens. This verifies executable subscription access and allowance availability at the observation time without repository mutation or metered API-key use. It does not imply unlimited future allowance. Claude remains unauthenticated and was not invoked.

## Codex read-only dispatch adapter — 2026-10-04

A bounded executable Codex adapter now requires a READY provider plan bound specifically to Codex `SUBSCRIPTION_EXISTING_ACCESS`, the exact trusted CLI path, a non-empty <=16 KiB prompt, and runs only ephemeral/read-only/no-user-config Codex execution with a 120-second timeout and 128 KiB output ceiling. Deterministic tests inject the process runner and prove the exact safety flags plus fail-closed behavior without consuming provider allowance. This adapter is not yet exposed as an unrestricted browser endpoint.
