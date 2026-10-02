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
