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
  n19["scripts/lib/stars.mjs"]
  n20["scripts/link-inbox.mjs"]
  n21["scripts/media.mjs"]
  n22["scripts/messages-page.mjs"]
  n23["scripts/post-results.mjs"]
  n24["scripts/probuilds-page.mjs"]
  n25["scripts/rankings.mjs"]
  n26["scripts/serve-atlas-private.py"]
  n27["scripts/serve.mjs"]
  n28["scripts/stars-sync.mjs"]
  n29["scripts/tactics-page.mjs"]
  n30["scripts/test-atlas-local.py"]
  n31["scripts/updates-page.mjs"]
  n32["scripts/updates.mjs"]
  n5 --> n6
  n5 --> n7
  n5 --> n9
  n5 --> n10
  n5 --> n12
  n5 --> n14
  n5 --> n15
  n5 --> n16
  n5 --> n22
  n5 --> n24
  n5 --> n25
  n5 --> n29
  n5 --> n31
  n8 --> n17
  n13 --> n16
  n13 --> n18
  n18 --> n16
  n20 --> n19
  n21 --> n16
  n23 --> n16
  n23 --> n18
  n27 --> n16
  n28 --> n19
  n31 --> n16
  n32 --> n16
```
