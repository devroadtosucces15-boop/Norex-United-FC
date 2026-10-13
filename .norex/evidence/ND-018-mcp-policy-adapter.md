# ND-018 MCP policy adapter evidence

Date: 2026-10-04
Status: IN_PROGRESS

Implemented a provider-neutral MCP descriptor/invocation policy adapter in `.norex/dev-os/mcp-adapter.mjs`. It performs no network/provider calls and cannot spend money. Invocation readiness requires an exact routed capability/provider/billing match, a verified non-metered billing class, and an already-ALLOWED security permission decision.

Validation: `npm run check` passed and `node --test services.test.mjs` passed 32/32 after adding deterministic cases for allowed local routing, provider mismatch, unknown billing, missing permission and malformed descriptors. The adapter is included in the trusted-code snapshot and fixture validation surface.

Remaining gates: MCP transport/client implementation, server discovery/authentication, credential resolution and real tool invocation.
