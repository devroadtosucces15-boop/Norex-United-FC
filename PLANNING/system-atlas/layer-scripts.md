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
  n15["scripts/issues-sync.mjs"]
  n16["scripts/leaders-page.mjs"]
  n17["scripts/lib.mjs"]
  n18["scripts/lib/chrome.mjs"]
  n19["scripts/lib/resultpost.mjs"]
  n20["scripts/lib/stars.mjs"]
  n21["scripts/link-inbox.mjs"]
  n22["scripts/media.mjs"]
  n23["scripts/messages-page.mjs"]
  n24["scripts/post-results.mjs"]
  n25["scripts/probuilds-page.mjs"]
  n26["scripts/rankings.mjs"]
  n27["scripts/serve-atlas-private.py"]
  n28["scripts/serve.mjs"]
  n29["scripts/stars-sync.mjs"]
  n30["scripts/tactics-page.mjs"]
  n31["scripts/test-atlas-local.py"]
  n32["scripts/updates-page.mjs"]
  n33["scripts/updates.mjs"]
  n5 --> n6
  n5 --> n7
  n5 --> n9
  n5 --> n10
  n5 --> n12
  n5 --> n14
  n5 --> n16
  n5 --> n17
  n5 --> n23
  n5 --> n25
  n5 --> n26
  n5 --> n30
  n5 --> n32
  n8 --> n18
  n13 --> n17
  n13 --> n19
  n19 --> n17
  n21 --> n20
  n22 --> n17
  n24 --> n17
  n24 --> n19
  n28 --> n17
  n29 --> n20
  n32 --> n17
  n33 --> n17
```
