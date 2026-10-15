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
  n18["scripts/lib/resultpost.mjs"]
  n19["scripts/media.mjs"]
  n20["scripts/messages-page.mjs"]
  n21["scripts/post-results.mjs"]
  n22["scripts/probuilds-page.mjs"]
  n23["scripts/rankings.mjs"]
  n24["scripts/serve-atlas-private.py"]
  n25["scripts/serve.mjs"]
  n26["scripts/tactics-page.mjs"]
  n27["scripts/test-atlas-local.py"]
  n28["scripts/updates-page.mjs"]
  n29["scripts/updates.mjs"]
  n5 --> n6
  n5 --> n7
  n5 --> n9
  n5 --> n10
  n5 --> n12
  n5 --> n14
  n5 --> n15
  n5 --> n16
  n5 --> n20
  n5 --> n22
  n5 --> n23
  n5 --> n26
  n5 --> n28
  n8 --> n17
  n13 --> n16
  n13 --> n18
  n18 --> n16
  n19 --> n16
  n21 --> n16
  n21 --> n18
  n25 --> n16
  n28 --> n16
  n29 --> n16
```
