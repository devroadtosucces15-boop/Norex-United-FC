# Norex Product Vision / Constitution

## Purpose

Norex is an engineering system for building and operating the Norex ecosystem with high leverage while keeping complexity behind the interface.

The intended experience is:

**Tell Norex what you want -> watch the work happen -> inspect artifacts when you care -> intervene when necessary.**

Norex should feel simpler than the systems underneath it.

## System boundaries

### Norex Intelligence Core
Portable, versioned engineering intelligence: constitution, decisions, roadmap, tasks, discoveries, evidence, capabilities, context rules, and handoffs.

It is not one model, one provider, one application, or one computer.

### Norex Dev OS
Mike's private development/control environment and one client of the Intelligence Core.

It is local-first where practical, provider-independent, conversation-first, artifact-centric, and must not require paid base infrastructure to operate.

### Norex United Platform
The real member-facing product. It serves the club across Web/Desktop and Web/Mobile today and should anticipate future iOS/Android clients.

Norex United must never depend on Norex Dev OS at runtime.

The Dev OS's private/local-first constraints must never be incorrectly imposed on the public/member-facing platform.

## Constitutional principles

1. **Human authority**
   Mike is Product Owner and final product authority. Agents propose, investigate, implement, review, and validate; they do not silently redefine product direction.

2. **Persistent intelligence**
   Agents are replaceable. Knowledge is persistent. Capabilities are abstract. State belongs to the system. Decisions belong to Mike.

3. **No single-machine backbone**
   Replacing a laptop must not erase Norex's engineering memory. Canonical portable state belongs in versioned project artifacts; machine-local runtime state is reconstructable/non-canonical.

4. **Provider independence**
   Claude, OpenAI/Codex, local models, future models, MCP clients, and other tools are adapters/capabilities—not the architecture's owner.

5. **One shared truth**
   Agents must consume shared roadmaps, ADRs, task state, evidence, design rules, and promoted discoveries. Separate hidden roadmaps or model-specific product truth are prohibited.

6. **Evidence over assumption**
   Existing code, deterministic validation, runtime evidence, accepted decisions, and reproducible experiments outrank guesses. A commit proves implementation activity, not automatically validation or rollout.

7. **Deterministic work stays deterministic**
   Builds, linting, type checks, automated tests, database checks, and repeatable validation should be executed by local/CI tooling. AI interprets compressed results and handles reasoning-heavy work.

8. **Adopt before build**
   Search for trustworthy reusable primitives before inventing infrastructure. Evaluate fit, maintenance, license, security, dependencies, platform support, performance, adoption, documentation, lock-in, offline behavior, and replacement cost.

9. **Discovery without uncontrolled scope**
   Creative exploration is encouraged. Scope creep is not automatic. Discoveries are recorded with evidence and promoted through experiments/decisions before adoption.

10. **Design continuity**
    The existing Norex design language is the visual authority across member-facing products, Dev OS, admin/internal tooling, and future clients. Functional density may differ; visual identity may not.

11. **Surface awareness**
    Web/Desktop, Web/Mobile Browser, iOS, and Android are distinct surfaces. Shared services do not imply identical UX. Validate fixes first on the reported surface and regress shared dependencies when affected.

12. **Security by capability**
    Agents receive the minimum capability required. Raw credentials do not enter model context. Production/security/destructive operations require explicit policy and approval.

13. **Cost is a permission**
    Default incremental metered external AI/API budget is $0.00. Unknown billing is blocked. Existing included access, local capabilities, deterministic tools, and verified-free options are preferred.

14. **Recovery first**
    Work must be recoverable from canonical state: task -> branch/checkpoint -> implementation -> deterministic validation -> review -> commit -> roadmap/evidence update.

15. **Simple interface, powerful system**
    Norex Dev OS is not intended to become a dense IDE clone. Conversation is primary; preview, diff, terminal, browser, Git, tests, context, and approvals appear contextually as artifacts/layers.

## Shadow Foundation invariant

During Phase I, `.norex/` may read/reference the existing project, but the existing application must not import, require, execute, or depend on `.norex/`.

Deleting `.norex/` must not alter the Norex United build, runtime, tests, or deployment.

Existing development continues independently.

## Intelligence promotion

A useful discovery begins as evidence, not policy.

Expected path:

**DISCOVER -> RESEARCH -> VERIFY -> SECURITY/LICENSE -> ISOLATED PROTOTYPE -> BENCHMARK -> MIKE/POLICY DECISION -> ADOPT**

Not every discovery requires every stage, but production adoption must be proportionate to risk.

Accepted decisions are promoted to shared canonical artifacts so subsequent agents inherit the same direction.

## Product success criteria

Norex succeeds when:
- Mike can express intent without manually coordinating every implementation detail.
- models can be replaced without losing project understanding.
- context is relevant rather than indiscriminately large.
- repetitive validation consumes deterministic compute rather than scarce AI allowance.
- cost/billing surprises are prevented.
- work can recover cleanly after interruption or machine replacement.
- Norex United can keep shipping while the foundation evolves.
- member-facing experiences remain recognizably Norex across surfaces.
- important discoveries become reusable engineering intelligence rather than disappearing inside chats.

## Core statement

> Complexity belongs behind the interface, not in front of the user.
