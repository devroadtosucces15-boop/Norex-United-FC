# MCP Interoperability Contract

MCP is an interoperability layer, not the Norex architecture.

## Uses
Expose/consume selected tools, resources and workflows through MCP when it improves portability or provider compatibility.

## Rules
- canonical task/event/evidence/decision semantics remain Norex-owned
- native/local services may exist without MCP
- MCP adapters map capability requests to/from Norex contracts
- MCP availability must not be required for repository understanding/recovery
- provider-specific MCP servers do not become canonical state stores
- security/cost/permission policy applies before tool invocation

## Design
Capability Broker -> capability interface -> native adapter OR MCP adapter OR CLI/API adapter.

This permits common-denominator interoperability while retaining provider/platform superpowers.

## Executable policy adapter — 2026-10-04

`.norex/dev-os/mcp-adapter.mjs` implements the first executable interoperability slice without contacting any MCP server. It validates provider-neutral server/tool/capability descriptors and will produce a `READY` invocation plan only when the Capability Broker route matches the exact capability/provider/billing mode, billing is locally/explicitly verified as non-metered, and the Permission Broker has already returned `ALLOWED`. Unknown/metered billing, provider mismatch and missing security permission remain `GATED`. Transport discovery, server authentication and actual tool invocation remain future gated work.
