# Context Compiler v1

## Goal
Build the smallest sufficient execution context for a worker without making any provider the system of record.

## Inputs
- Mike's current request/override
- active task + status/risk/surfaces
- relevant session events
- authority/constitution
- accepted ADRs/specs
- design-system sections relevant to touched surfaces
- selected source files/ranges
- dependencies/API/schema contracts
- deterministic failures/evidence
- discoveries/experiments relevant to the task
- agent/capability instructions
- cost/security constraints

## Context budget
Every task may declare:
MUST READ — required for correctness/authority.
OPTIONAL — retrieve if useful.
DO NOT LOAD — irrelevant/noisy/sensitive.

## Retrieval priority
1. explicit user decision/current task
2. authority + directly applicable ADR/policy
3. files being changed and direct dependencies
4. failing validation/evidence
5. relevant design/domain context
6. linked discoveries/history
7. broader optional context

## Exclusions
- raw secrets
- unrelated chat history
- routine DATA_AUTOMATION commits unless data history matters
- generated/binary artifacts unless required
- duplicate summaries
- provider-private scratch reasoning

## Output package
- objective
- constraints/authority
- task state/lease
- surfaces/shared impact
- required files/selected excerpts
- relevant decisions/design rules
- latest validation/evidence
- known risks/discoveries
- requested capability
- allowed tools/actions
- billing/security mode
- expected output/handoff contract

## Recompilation triggers
Recompile on USER_OVERRIDE, task scope change, new blocking evidence, ADR/decision change, branch/checkpoint change, provider handoff, or security/cost permission change.

## Principle
Context quality is relevance, authority and freshness—not maximum token count.
