# Security Policy
Never place raw secrets in Git, source, model context/prompts, chat history, logs, plain SQLite, or agent-visible env files.

Use secure credential handles such as `credential://provider/resource`; execution resolves values without exposing them to agents. Prefer OS keychain/secure vault.

Environments: LOCAL, DEV, STAGING, PRODUCTION.
Risk: R0 docs/metadata; R1 isolated; R2 shared component/service; R3 API/schema/auth/infra; R4 production/security/destructive. High-risk/destructive actions require explicit approval.
