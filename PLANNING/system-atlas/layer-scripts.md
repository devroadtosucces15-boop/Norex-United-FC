# scripts module dependencies

Source-level imports; isolated files appear without arrows.

```mermaid
flowchart LR
  n0["scripts/build-system-atlas.py"]
  n1["scripts/build.mjs"]
  n2["scripts/builder-page.mjs"]
  n3["scripts/burners-page.mjs"]
  n4["scripts/charts.mjs"]
  n5["scripts/docs-page.mjs"]
  n6["scripts/ea-relay.mjs"]
  n7["scripts/feed-page.mjs"]
  n8["scripts/fetch.mjs"]
  n9["scripts/hub-page.mjs"]
  n10["scripts/leaders-page.mjs"]
  n11["scripts/lib.mjs"]
  n12["scripts/messages-page.mjs"]
  n13["scripts/probuilds-page.mjs"]
  n14["scripts/rankings.mjs"]
  n15["scripts/serve.mjs"]
  n16["scripts/tactics-page.mjs"]
  n17["scripts/updates-page.mjs"]
  n18["scripts/updates.mjs"]
  n1 --> n2
  n1 --> n3
  n1 --> n4
  n1 --> n5
  n1 --> n7
  n1 --> n9
  n1 --> n10
  n1 --> n11
  n1 --> n12
  n1 --> n13
  n1 --> n14
  n1 --> n16
  n1 --> n17
  n8 --> n11
  n15 --> n11
  n17 --> n11
  n18 --> n11
```
