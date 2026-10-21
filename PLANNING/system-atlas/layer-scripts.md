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
  n19["scripts/lib/matchpicture.mjs"]
  n20["scripts/lib/matchreview.mjs"]
  n21["scripts/lib/resultpost.mjs"]
  n22["scripts/lib/stars.mjs"]
  n23["scripts/link-inbox.mjs"]
  n24["scripts/media.mjs"]
  n25["scripts/messages-page.mjs"]
  n26["scripts/post-results.mjs"]
  n27["scripts/probuilds-page.mjs"]
  n28["scripts/rankings.mjs"]
  n29["scripts/serve-atlas-private.py"]
  n30["scripts/serve.mjs"]
  n31["scripts/stars-sync.mjs"]
  n32["scripts/tactics-page.mjs"]
  n33["scripts/test-atlas-local.py"]
  n34["scripts/updates-page.mjs"]
  n35["scripts/updates.mjs"]
  n5 --> n6
  n5 --> n7
  n5 --> n9
  n5 --> n10
  n5 --> n12
  n5 --> n14
  n5 --> n16
  n5 --> n17
  n5 --> n25
  n5 --> n27
  n5 --> n28
  n5 --> n32
  n5 --> n34
  n8 --> n17
  n8 --> n18
  n8 --> n19
  n8 --> n20
  n13 --> n17
  n13 --> n21
  n21 --> n17
  n23 --> n22
  n24 --> n17
  n26 --> n17
  n26 --> n21
  n30 --> n17
  n31 --> n22
  n34 --> n17
  n35 --> n17
```
