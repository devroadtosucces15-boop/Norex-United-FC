# Portable Norex Intelligence Core

## Definition
The Intelligence Core is the portable, provider-neutral engineering brain of Norex. It is versioned project state plus schemas/protocols that any authorized client can consume.

It is not ChatGPT, Claude, Codex, MCP, Dev OS, GitHub, or Mike's current computer.

## Portable canonical state
Version in Git:
- constitution/product vision
- authority/security/cost/design/QA policies
- Master Roadmap
- ADRs/specifications
- task schemas/state intended for collaboration
- discoveries/experiments
- capability definitions
- context rules
- evidence references
- handoff contracts
- migration/adoption state

## Machine-local non-canonical runtime
Expected under ~/.norex/:
- secure credential handles/keychain references
- local SQLite runtime database
- sessions/event cache
- usage counters/cache
- browser profiles
- PTY/terminal runtime
- logs/cache
- temporary artifacts
- local provider detection/auth state

Loss of machine-local state must not destroy accepted project decisions or the ability to reconstruct work.

## Interfaces
Core semantics should be consumable through:
- native Dev OS modules
- CLI
- MCP
- provider adapters
- CI/GitHub workflows
- future clients

Common denominator + provider superpowers. Do not reduce the core to the limitations of one interoperability protocol.

## Portability test
A clean machine with repository access and permitted credentials should be able to understand project authority, current roadmap, accepted decisions, task/evidence semantics and how to resume work without access to an old model conversation.

## Runtime independence
Norex United production never imports or requires the Intelligence Core. During Shadow Foundation, the core observes/references production; dependency direction never reverses.
