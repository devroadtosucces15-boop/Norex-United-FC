# ND-014 Permission Broker Runtime Slice

Status: IN_PROGRESS_VALIDATED_SLICE
Branch: foundation/norex-dev-shadow
Provider calls: 0

Validated: opaque credential handles; ALLOW_ONCE/ALLOW_SESSION/ALLOW_ALWAYS_SPECIFIC_ACTION/DENY vocabulary; exact-grant requirement; mandatory R4/PRODUCTION/destructive/security-critical reapproval; trusted executable snapshot coverage.

Not claimed: OS keychain/vault secret resolution, durable grant lookup/consumption, credential-provider integration, MFA/CAPTCHA handling.

Validation: `npm run check` PASS; `node --test services.test.mjs` PASS (15/15).

## Durable exact-action grants — 2026-10-04

A runtime permission service now bridges the permission-decision core to durable approvals without resolving secrets. Approval identity binds session + provider + resource + action + environment + opaque credential handle, with a fixed `permission-action` scope and exact risk match. Unrelated actions cannot reuse a grant, and mandatory production/high-risk rules still return APPROVAL_REQUIRED even when an otherwise matching durable approval exists.
