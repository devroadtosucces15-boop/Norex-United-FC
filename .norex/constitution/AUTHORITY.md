# Authority and Decision Governance

## Authority hierarchy

When instructions conflict, use this order:

1. Mike's explicit decisions
2. Norex Product Vision / Constitution
3. Accepted specifications and ADRs
4. Canonical Master Roadmap
5. Current task specification
6. Canonical Norex Design System
7. Engineering, security, QA, and cost policies
8. Agent/capability-specific skills
9. Agent judgment

An agent must not silently reverse a higher-authority decision.

## Mike's authority

Mike is Product Owner/Product Authority.

Explicit decisions include approvals, rejections, scope changes, product requirements, architecture decisions, cost approvals, intentional design deviations, rollout decisions, and production/destructive approvals.

When a new explicit decision conflicts with older canonical state, preserve the new decision and create/update the appropriate canonical artifact rather than leaving contradictory truths.

## Agent authority

Agents may autonomously:
- investigate
- search for evidence
- propose solutions
- perform R0/R1 work permitted by the active task
- implement within approved scope
- run deterministic validation
- document discoveries
- prepare reversible prototypes

Agents must escalate when:
- evidence materially conflicts with accepted direction
- a decision would reverse an ADR/constitutional rule
- cost would move from permitted to metered/unknown
- an action is production-destructive/security-sensitive
- an intentional design-system deviation is proposed
- required product intent is genuinely ambiguous

## No private truth

Model-specific instructions may optimize how an agent works but may not establish a conflicting product roadmap, architecture, design system, security policy, or accepted decision.

Material knowledge discovered in a session must be promoted into shared artifacts when it affects future work.

## Decision durability

Accepted architecture/product decisions should receive an ADR or equivalent canonical record when reversal would materially affect implementation.

A later agent may challenge an accepted decision with new evidence, but must not silently overwrite it. The challenge should identify:
- current decision
- new evidence
- affected systems
- migration/reversal cost
- recommendation
- required authority

## Evidence semantics

Use precise language:
- IMPLEMENTED: code exists.
- VALIDATED: required deterministic/manual evidence passed.
- ROLLED_OUT: intended users/surfaces can use it.
- GATED: implementation exists but exposure is intentionally restricted.
- DONE: task-specific Definition of Done is satisfied with evidence.

These states are not interchangeable.
