# ND-020 Isolated Project Validation

Status: IN_PROGRESS / HARNESS_VALIDATED / PROJECT_REGRESSION_RED

The dispatcher now includes `project-tests-isolated`, which copies the repository to an OS temporary directory while excluding `.git`, `site`, and `node_modules`, then runs the canonical `node tests/run.mjs` harness in that disposable copy. The canonical build therefore writes only inside the temp sandbox; the Shadow checkout and production paths are not mutated by validation.

A direct isolated rehearsal on 2026-10-04 completed the build and broad test suite but returned exit 1 with two existing project-level failing assertions:
- `events`: `report: team grade + totals (every League match in the window + the Rush result)`
- `extradata`: `older matches keep their old columns`

These failures are recorded, not hidden or reclassified as passing. Fixing production/member-facing tests is outside the `.norex/**` Shadow modification boundary. The dispatcher is allowed to report RED evidence; ND-020 remains IN_PROGRESS.

The earlier `--no-build` experiment was rejected because this checkout has no prebuilt `site/api/club.json`; many tests correctly failed due to missing generated site artifacts. It was replaced immediately by the isolated full-build adapter.

Provider calls: 0. Metered API cost: $0.00.
