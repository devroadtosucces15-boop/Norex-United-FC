# Credential and Permission Broker

Phase-I security contract.

## Secret rule
Raw secrets never enter model context, Git, project files, chat history, normal logs, plain SQLite, or agent-visible environment dumps.

Use opaque handles such as credential://cloudflare/deployment.

## Resolution
Agent requests an allowed action + credential handle. Secure execution layer resolves the secret internally, performs the action, returns sanitized evidence.

## Permission scopes
ALLOW_ONCE
ALLOW_SESSION
ALLOW_ALWAYS_SPECIFIC_ACTION
DENY

Production/destructive/security-critical actions may require mandatory approval regardless of prior convenience grants.

## Risk
R0 documentation/metadata
R1 isolated/reversible
R2 shared component/service
R3 API/schema/auth/infrastructure
R4 production/security/destructive

## Approval UI requirement
Show exact provider/resource/action/environment/risk and explicitly state that the credential will not be exposed to the agent.

## Forbidden
Reveal/print secret; send secret to model; write secret to repository; persist raw secret in runtime DB/log; silently broaden a credential's scope.

## Implemented permission-decision slice — 2026-10-03

`.norex/dev-os/permission-broker.mjs` now validates opaque `credential://...` handles and evaluates action permission independently from secret resolution. R0 non-sensitive metadata may proceed without a credential; credential-bearing or higher-risk actions require a matching explicit grant. DENY is terminal. R4, PRODUCTION, destructive and security-critical actions always return APPROVAL_REQUIRED even when a persistent grant is presented.

This slice deliberately does **not** resolve credentials or read a keychain. It cannot reveal a secret because it only accepts opaque handles. Durable grant lookup/session consumption and secure OS-vault resolution remain required before ND-014 can be DONE.
