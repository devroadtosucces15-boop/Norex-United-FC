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
  n8["scripts/cards.mjs"]
  n9["scripts/charts.mjs"]
  n10["scripts/docs-page.mjs"]
  n11["scripts/ea-relay.mjs"]
  n12["scripts/feed-page.mjs"]
  n13["scripts/fetch.mjs"]
  n14["scripts/hub-page.mjs"]
  n15["scripts/leaders-page.mjs"]
  n16["scripts/lib.mjs"]
  n17["scripts/lib/chrome.mjs"]
  n18["scripts/media.mjs"]
  n19["scripts/messages-page.mjs"]
  n20["scripts/probuilds-page.mjs"]
  n21["scripts/rankings.mjs"]
  n22["scripts/serve-atlas-private.py"]
  n23["scripts/serve.mjs"]
  n24["scripts/tactics-page.mjs"]
  n25["scripts/test-atlas-local.py"]
  n26["scripts/updates-page.mjs"]
  n27["scripts/updates.mjs"]
  n5 --> n6
  n5 --> n7
  n5 --> n9
  n5 --> n10
  n5 --> n12
  n5 --> n14
  n5 --> n15
  n5 --> n16
  n5 --> n19
  n5 --> n20
  n5 --> n21
  n5 --> n24
  n5 --> n26
  n8 --> n17
  n13 --> n16
  n18 --> n16
  n23 --> n16
  n26 --> n16
  n27 --> n16
```
