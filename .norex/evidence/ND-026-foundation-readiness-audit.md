# ND-026 Foundation Readiness Audit

Final status: VALIDATED_WITH_REMEDIATION_BACKLOG
Branch: foundation/norex-dev-shadow
Scope: .norex/** only
Provider calls: 0
Incremental metered API cost: $0.00

## Audit objective

Determine whether the Shadow Foundation is coherent, recoverable, policy-bounded and sufficiently validated to continue implementation without treating contract-only capabilities as executable.

## Evidence reviewed

- Authority, product, security, cost, credential and QA constitutions.
- Master Roadmap, work protocol, task/event model, capability broker, local persistence, CI dispatcher, observability, browser and recovery contracts.
- Claude, OpenAI/Codex and MCP adapter contracts.
- Task/discovery/experiment/evidence schemas.
- Dev OS control plane, local services, HTTP boundary and deterministic tests.
- ND-025 end-to-end Shadow rehearsal evidence.

## Findings

### PASS — isolation and authority

Shadow work remains isolated under `.norex/**`; main/production dependency direction is unchanged. Authority, security and cost policies consistently reserve owner decisions, metered/unknown billing and destructive/high-risk actions for explicit approval.

### PASS — deterministic vertical slice

ND-025 demonstrated intent recognition, explicit approval, fixed capability execution, real scoped Git diff, deterministic Shadow validation and evidence recording with zero provider calls. The local service enforces the Shadow branch, bounded output/time, fixed commands, literal Git pathspecs, symlink/path controls and same-origin HTTP restrictions.

### REMEDIATED — planning endpoint regression coverage

The audit found that `/api/plan` had unit coverage through `planIntent` but no dedicated HTTP regression test for its same-origin, request-shape and body-size boundary. Added deterministic coverage in `services.test.mjs`. Shadow service suite now passes 10/10.

### OPEN — executable foundation gaps

These are implementation backlog, not contradictions in the foundation contracts:

- ND-013: scoped write/edit services, streaming/cancellation and PTY are not implemented.
- ND-014: credential/permission broker is contract-only; secure runtime resolution and durable approval semantics are not implemented.
- ND-015: on-demand browser lifecycle is contract-only.
- ND-016/017/018: Claude, OpenAI/Codex and MCP adapters are contract-only and remain billing/auth gated.
- ND-019: Capability Broker routing contract exists; executable routing/availability/cost enforcement is not implemented.
- ND-020: deterministic Shadow dispatch works; the broader project harness remains intentionally outside the current `.norex/**` execution scope.
- ND-021: shell remains at MIKE_REVIEW for product-owner acceptance and broader device QA.
- ND-022: durable artifacts, preview/browser and richer terminal behavior remain incomplete.
- ND-023: observability contract exists; durable runtime telemetry is not implemented.
- ND-024: recovery/export contract exists; runtime export/restore is not implemented.
- ND-012: local persistence is a completed contract, not a claim that SQLite runtime persistence already exists.

## Readiness decision

The Shadow Foundation is **ready to continue implementation**, but it is **not migration-ready and not a completed Dev OS**. Contract-only capabilities must remain labeled GATED/REVIEW until executable evidence exists. No migration or merge gate is approved by this audit.

Priority after ND-026 should be the executable core needed to make later capabilities durable and policy-enforced: task/run persistence and event/evidence lifecycle, then Capability Broker and Credential/Permission Broker runtime enforcement, followed by safe write/terminal/observability/recovery surfaces.

## Validation

- `npm run check`: PASS
- `node --test services.test.mjs`: PASS (10/10)
- `git diff --check`: required before commit
- Shadow-only changed-file check: required before commit
