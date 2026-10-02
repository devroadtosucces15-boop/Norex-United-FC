# OpenAI / Codex Provider Adapter Contract

## Role
OpenAI/Codex is a replaceable Norex worker. Typical strengths: targeted implementation, debugging, review, refactoring, focused code reasoning.

## Input/output
Use the same provider-neutral Context Compiler package and normalized event/artifact protocol as every worker.

## Access/billing
Existing subscription/included access may be used only through verified supported paths.
METERED_API and UNKNOWN_BILLING remain locked without explicit Mike approval.
Do not silently translate ChatGPT subscription access into assumptions about API credits.

## Routing
Conserve scarce provider allowance when an equivalent permitted route exists. Prefer Codex where its focused code/review strengths materially fit the task.

## Failure
Normalize auth, availability, allowance, context, provider, policy and billing failures; preserve checkpoint and allow broker fallback.

## Security
Credentials are resolved by the Credential Broker and never injected into model-visible context.
