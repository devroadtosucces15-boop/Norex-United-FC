# Task, Session, Event and Handoff Model

## Session ownership
A session belongs to Norex, not to a model. Models are temporary workers activated for capabilities.

One visible chronological event stream may contain Mike input, orchestration, multiple agent executions, deterministic CI, commits, reviews, approvals and handoffs.

## Core entities
SESSION — user-visible work conversation/context.
TASK — durable unit of intended work.
EXECUTION — one agent/tool attempt against a task.
EVENT — append-only fact about work progression.
ARTIFACT — preview/diff/test/browser/terminal/reference output.
EVIDENCE — proof/observation used for validation.
DISCOVERY — persistent engineering intelligence.
DECISION/ADR — accepted durable choice.
HANDOFF — explicit continuation state between workers.

## Event types v1
- MikeMessage
- UserOverride
- OrchestratorAnalysis
- TaskCreated
- TaskStatusChanged
- AgentSelected
- AgentStarted
- AgentProgress
- AgentPaused
- AgentCompleted
- AgentFailed
- CommitCreated
- CIRunStarted
- CIPassed
- CIFailed
- ArtifactCreated
- EvidenceRecorded
- DiscoveryRecorded
- ReviewStarted
- ReviewCompleted
- ApprovalRequested
- MikeApproved
- MikeRejected
- HandoffCreated
- RecoveryCheckpoint

Events should carry timestamp, session/task identity, actor, payload reference, and causation/correlation IDs where applicable.

## Task lifecycle
BACKLOG -> READY -> IN_PROGRESS -> REVIEW -> VALIDATION -> MIKE_REVIEW -> DONE
Side states: BLOCKED, DEFERRED, SUPERSEDED, CANCELLED.

DONE requires task-specific evidence.

## Task lease
While active, task state records:
- active_model
- started_at
- handoff_state
- branch/checkpoint

A lease is coordination state, not permanent ownership. Another provider can resume from canonical state.

## User override
Mike may interrupt active work. Record USER_OVERRIDE at high priority, recompile relevant context, and reconcile current execution safely. Never discard completed evidence/changes silently.

## Manual routing
User-directed routing such as @codex, @claude, @chatgpt, or @all overrides normal broker preference when permitted by security/cost policy.

## Context compilation boundary
Do not forward the entire session indiscriminately. Each execution receives a compiled package from task objective, relevant conversation/events, source files, ADRs, design system, evidence/failures, and agent instructions.

## Handoff
A handoff must make continuation possible without hidden chat state. Record objective, completed/remaining work, branch/checkpoint, decisions, discoveries, changed files, validation, failures/risks, required context and approvals.

## Recovery sequence
task -> branch/checkpoint -> implementation -> deterministic validation -> review -> commit -> roadmap/evidence update.

After interruption, reconstruct from durable state and event/evidence records rather than trusting a model's memory.
