# scripts module dependencies

Source-level imports; isolated files appear without arrows.

```mermaid
flowchart LR
  n0["scripts/build-atlas-explorer.py"]
  n1["scripts/build-atlas-local.py"]
  n2["scripts/build-system-atlas.py"]
  n3["scripts/build.mjs"]
  n4["scripts/builder-page.mjs"]
  n5["scripts/burners-page.mjs"]
  n6["scripts/charts.mjs"]
  n7["scripts/docs-page.mjs"]
  n8["scripts/ea-relay.mjs"]
  n9["scripts/feed-page.mjs"]
  n10["scripts/fetch.mjs"]
  n11["scripts/hub-page.mjs"]
  n12["scripts/leaders-page.mjs"]
  n13["scripts/lib.mjs"]
  n14["scripts/messages-page.mjs"]
  n15["scripts/probuilds-page.mjs"]
  n16["scripts/rankings.mjs"]
  n17["scripts/serve.mjs"]
  n18["scripts/tactics-page.mjs"]
  n19["scripts/updates-page.mjs"]
  n20["scripts/updates.mjs"]
  n3 --> n4
  n3 --> n5
  n3 --> n6
  n3 --> n7
  n3 --> n9
  n3 --> n11
  n3 --> n12
  n3 --> n13
  n3 --> n14
  n3 --> n15
  n3 --> n16
  n3 --> n18
  n3 --> n19
  n10 --> n13
  n17 --> n13
  n19 --> n13
  n20 --> n13
```
