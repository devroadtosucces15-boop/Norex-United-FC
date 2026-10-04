# Full Norex Project Progress Model

Purpose: provide a reproducible granular denominator for progress check-ins without pretending that an implementation commit equals validation, rollout, or migration adoption.

## Counting rule

Each independently evidenced item contributes one point per applicable dimension. A point is complete only when its source evidence supports that dimension. Partial/unknown dimensions remain open. New discovered work is added to the denominator rather than hidden.

### Frontend lane
For each reconciled FE board item count: implementation + validation. Current denominator: 6 items x 2 = 12 points.

### Backend lane
For each reconciled BE item count: implementation + rollout/production-validation. Current denominator: 13 items x 2 = 26 points.

### Shadow Foundation lane
Use the granular ND implementation checklist maintained by check-ins. The roadmap status alone is not the percentage: validated sub-items inside IN_PROGRESS/REVIEW tasks count, and remaining gated sub-items stay open.

### Adoption lane
Migration gates are decomposed into the explicit readiness domains already named by the adoption contract:
- M0 Project Brain: inventory; architecture/current-state context; design system; reconciled roadmap/pending work.
- M1 Task/context orchestration: task model; event model; handoff/context compiler; durable task/event persistence.
- M2 Agents/resources: capability registry; capability routing; Claude adapter; OpenAI/Codex adapter; MCP interoperability.
- M3 CI/browser/credentials: deterministic CI; on-demand browser; credential/permission enforcement; observability; recovery/export.
- M4 Full Dev OS adoption: migration simulation; current-main reconciliation into isolated integration; regression validation after reconciliation; owner adoption approval.

M0-M4 are gates. Their sub-items may accumulate evidence, but a gate is not approved merely because its percentage reaches 100%; owner/security/migration gates remain explicit.

## Current evidence interpretation

FE implementation is verified for all six reconciled items. Validation is PARTIAL for FE-BOARD-01 and FE-BOARD-04A and NEEDS_RECONCILIATION for the other four, so no FE validation point is currently treated as complete.

BE implementation is verified for all thirteen reconciled items. Rollout labels describe exposure state, not proof of production validation; therefore rollout/production-validation points remain open until explicit evidence is reconciled.

Shadow percentage is tracked from validated implementation slices, currently approximately 91.2%. This is intentionally more granular than DONE-only roadmap status.

Adoption evidence overlaps underlying engineering evidence, but adoption is a separate readiness dimension: M0-M3 can gain sub-item completion as their prerequisites become executable/validated; M4 remains explicitly owner-gated.

## Reporting

Every engineering check-in should report both:
- Shadow Foundation progress — granular ND implementation progress.
- Full Norex project progress — FE + BE + Shadow + adoption dimensions under this model.

The full-project percentage must be recomputed when the denominator changes. It is an engineering progress indicator, not a claim of production readiness.
