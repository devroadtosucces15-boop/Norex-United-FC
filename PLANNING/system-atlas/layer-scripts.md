# scripts module dependencies

Source-level imports; isolated files appear without arrows.

```mermaid
flowchart LR
  n0["scripts/build-atlas-explorer.py"]
  n1["scripts/build-system-atlas.py"]
  n2["scripts/build.mjs"]
  n3["scripts/builder-page.mjs"]
  n4["scripts/burners-page.mjs"]
  n5["scripts/charts.mjs"]
  n6["scripts/docs-page.mjs"]
  n7["scripts/ea-relay.mjs"]
  n8["scripts/feed-page.mjs"]
  n9["scripts/fetch.mjs"]
  n10["scripts/hub-page.mjs"]
  n11["scripts/leaders-page.mjs"]
  n12["scripts/lib.mjs"]
  n13["scripts/messages-page.mjs"]
  n14["scripts/probuilds-page.mjs"]
  n15["scripts/rankings.mjs"]
  n16["scripts/serve.mjs"]
  n17["scripts/tactics-page.mjs"]
  n18["scripts/updates-page.mjs"]
  n19["scripts/updates.mjs"]
  n2 --> n3
  n2 --> n4
  n2 --> n5
  n2 --> n6
  n2 --> n8
  n2 --> n10
  n2 --> n11
  n2 --> n12
  n2 --> n13
  n2 --> n14
  n2 --> n15
  n2 --> n17
  n2 --> n18
  n9 --> n12
  n16 --> n12
  n18 --> n12
  n19 --> n12
```
