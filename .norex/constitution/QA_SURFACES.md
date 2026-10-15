# Surface, Device, Impact and QA Taxonomy

## Product surfaces

SURFACE-WEB-DESKTOP — Norex United in a desktop-class web browser.
SURFACE-WEB-MOBILE — Norex United in a phone/tablet mobile browser.
SURFACE-IOS — future Norex United iOS application.
SURFACE-ANDROID — future Norex United Android application.
SURFACE-DEVOS — private Norex Dev OS.
SURFACE-DISCORD — Discord-facing commands/interactions/integrations.
SURFACE-BACKEND — shared Worker/API/jobs/persistence/infrastructure.

Do not use the word "mobile" as sufficient QA evidence when Web/Mobile, iOS, and Android could differ.

## Test identity

For UI/runtime evidence capture, record relevant dimensions:
- surface
- form factor
- OS
- browser or app build
- device/model when relevant
- viewport
- orientation
- environment
- route/screen
- authenticated role
- feature flags
- shared-service/API version or commit

Not every test needs every field. Include dimensions capable of changing the result.

## Form factors

DESKTOP
LAPTOP
TABLET
PHONE
OTHER

## Environments

LOCAL
DEV
STAGING
PRODUCTION

Production validation must avoid destructive test behavior.

## Web browser classes

Use exact browser/version when a defect is browser-specific. Otherwise record at least engine/class when material:
- Chromium
- WebKit/Safari
- Firefox/Gecko

A pass in desktop Chromium is not evidence that Safari mobile passed.

## Roles/exposure

Where relevant record:
PUBLIC
MEMBER
MANAGER
OWNER
PREVIEW_AS_ROLE
OTHER

A feature may be IMPLEMENTED and VALIDATED while remaining intentionally GATED to a role.

## Shared-impact map

For every material task identify affected targets:
- Shared Backend/API
- Database/schema/data
- Web/Desktop
- Web/Mobile Browser
- iOS
- Android
- Discord
- Dev OS
- Infrastructure/CI
- Security/auth
- Design system

Use NONE explicitly when a normally relevant target is intentionally unaffected.

## Validation scope rule

Validate the reported/changed surface first.

Then expand according to shared impact:
- isolated Web/Mobile CSS -> targeted mobile-browser validation; do not automatically run future native suites
- shared component -> validate every consuming web surface
- API/contract/auth/schema -> regression-check every dependent client/surface available
- database migration -> migration + compatibility + rollback/recovery considerations
- design token/shared primitive -> representative cross-feature visual/regression validation
- infrastructure -> deployment/health/recovery evidence proportional to risk

Avoid both under-testing and indiscriminate test-suite expansion.

## Evidence levels

STATIC — code/config/schema inspection.
DETERMINISTIC — automated test/build/lint/typecheck/repro script.
RUNTIME — observed behavior in a running environment.
VISUAL — screenshot/visual regression/manual visual evidence.
PRODUCTION — non-destructive verification against production.
USER — Mike/member confirmation.

A task's Definition of Done specifies required evidence; no single level universally replaces another.

## Defect identity template

Example:
Surface: SURFACE-WEB-MOBILE
Form factor: PHONE
OS: iOS
Browser: Safari <version>
Device: iPhone <model if material>
Viewport/orientation: <value>
Environment: PRODUCTION
Route: /events
Role: MEMBER
Observed: <behavior>
Expected: <behavior>
Shared impact: Web component only / API / etc.
Reproduction: <steps/evidence>

## Release evidence

Avoid: "mobile passed."

Prefer:
"Web/Mobile Browser — iOS Safari — phone portrait — /events — MEMBER — target interaction passed; shared events API tests passed."

Native release evidence should include app/build version when those clients exist.

## Accessibility

QA should include applicable:
- keyboard navigation
- visible focus
- screen-reader naming/semantics
- contrast
- touch target sizing
- reduced motion
- non-colour encoding
- zoom/text scaling
- safe-area behavior

## Performance

Record performance only when relevant to the task, using reproducible metrics/context rather than subjective "feels fast."

## Current deterministic baseline

The existing Norex United harness is `node tests/run.mjs`.
It performs syntax checking, site build, and feature tests. GitHub Actions runs it on meaningful main pushes/PRs while data-only updates are excluded.

Norex Dev should dispatch and interpret this baseline rather than duplicating it.
