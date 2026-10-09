# scripts module dependencies

Source-level imports; isolated files appear without arrows.

```mermaid
flowchart LR
  n0["scripts/build-atlas-explorer.py"]
  n1["scripts/build-atlas-local.py"]
  n2["scripts/build-atlas-private-view.py"]
  n3["scripts/build-system-atlas.py"]
  n4["scripts/build.mjs"]
  n5["scripts/builder-page.mjs"]
  n6["scripts/burners-page.mjs"]
  n7["scripts/charts.mjs"]
  n8["scripts/docs-page.mjs"]
  n9["scripts/ea-relay.mjs"]
  n10["scripts/feed-page.mjs"]
  n11["scripts/fetch.mjs"]
  n12["scripts/hub-page.mjs"]
  n13["scripts/leaders-page.mjs"]
  n14["scripts/lib.mjs"]
  n15["scripts/messages-page.mjs"]
  n16["scripts/probuilds-page.mjs"]
  n17["scripts/rankings.mjs"]
  n18["scripts/serve-atlas-private.py"]
  n19["scripts/serve.mjs"]
  n20["scripts/tactics-page.mjs"]
  n21["scripts/updates-page.mjs"]
  n22["scripts/updates.mjs"]
  n4 --> n5
  n4 --> n6
  n4 --> n7
  n4 --> n8
  n4 --> n10
  n4 --> n12
  n4 --> n13
  n4 --> n14
  n4 --> n15
  n4 --> n16
  n4 --> n17
  n4 --> n20
  n4 --> n21
  n11 --> n14
  n19 --> n14
  n21 --> n14
  n22 --> n14
```
