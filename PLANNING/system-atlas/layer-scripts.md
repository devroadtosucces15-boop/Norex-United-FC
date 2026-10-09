# scripts module dependencies

Source-level imports; isolated files appear without arrows.

```mermaid
flowchart LR
  n0["scripts/build-atlas-explorer.py"]
  n1["scripts/build-atlas-history.py"]
  n2["scripts/build-atlas-local.py"]
  n3["scripts/build-atlas-private-view.py"]
  n4["scripts/build-system-atlas.py"]
  n5["scripts/build.mjs"]
  n6["scripts/builder-page.mjs"]
  n7["scripts/burners-page.mjs"]
  n8["scripts/charts.mjs"]
  n9["scripts/docs-page.mjs"]
  n10["scripts/ea-relay.mjs"]
  n11["scripts/feed-page.mjs"]
  n12["scripts/fetch.mjs"]
  n13["scripts/hub-page.mjs"]
  n14["scripts/leaders-page.mjs"]
  n15["scripts/lib.mjs"]
  n16["scripts/messages-page.mjs"]
  n17["scripts/probuilds-page.mjs"]
  n18["scripts/rankings.mjs"]
  n19["scripts/serve-atlas-private.py"]
  n20["scripts/serve.mjs"]
  n21["scripts/tactics-page.mjs"]
  n22["scripts/test-atlas-local.py"]
  n23["scripts/updates-page.mjs"]
  n24["scripts/updates.mjs"]
  n5 --> n6
  n5 --> n7
  n5 --> n8
  n5 --> n9
  n5 --> n11
  n5 --> n13
  n5 --> n14
  n5 --> n15
  n5 --> n16
  n5 --> n17
  n5 --> n18
  n5 --> n21
  n5 --> n23
  n12 --> n15
  n20 --> n15
  n23 --> n15
  n24 --> n15
```
