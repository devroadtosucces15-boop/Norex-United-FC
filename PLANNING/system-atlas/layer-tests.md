# tests module dependencies

Source-level imports; isolated files appear without arrows.

```mermaid
flowchart LR
  n0["tests/aiinsights.test.mjs"]
  n1["tests/aispike.test.mjs"]
  n2["tests/ask.test.mjs"]
  n3["tests/aura.test.mjs"]
  n4["tests/avatarcard.test.mjs"]
  n5["tests/awards.test.mjs"]
  n6["tests/badges.test.mjs"]
  n7["tests/bot.test.mjs"]
  n8["tests/botcommands.test.mjs"]
  n9["tests/builder.test.mjs"]
  n10["tests/builds.test.mjs"]
  n11["tests/burners.test.mjs"]
  n12["tests/cardstudio.test.mjs"]
  n13["tests/chat.test.mjs"]
  n14["tests/clublookup.test.mjs"]
  n15["tests/crawl.test.mjs"]
  n16["tests/discord.test.mjs"]
  n17["tests/docs.test.mjs"]
  n18["tests/drilldown.test.mjs"]
  n19["tests/dugout.test.mjs"]
  n20["tests/events-ui.test.mjs"]
  n21["tests/events.test.mjs"]
  n22["tests/extradata.test.mjs"]
  n23["tests/feed.test.mjs"]
  n24["tests/flags.test.mjs"]
  n25["tests/game.test.mjs"]
  n26["tests/honours.test.mjs"]
  n27["tests/hub.test.mjs"]
  n28["tests/hublive.test.mjs"]
  n29["tests/hype.test.mjs"]
  n30["tests/insights.test.mjs"]
  n31["tests/insightwidget.test.mjs"]
  n32["tests/intel.test.mjs"]
  n33["tests/issues.test.mjs"]
  n34["tests/lib.mjs"]
  n35["tests/lineuprec.test.mjs"]
  n36["tests/live.test.mjs"]
  n37["tests/locker.test.mjs"]
  n38["tests/media.test.mjs"]
  n39["tests/members.test.mjs"]
  n40["tests/mock.mjs"]
  n41["tests/moderation.test.mjs"]
  n42["tests/monitor.test.mjs"]
  n43["tests/notify.test.mjs"]
  n44["tests/packs.test.mjs"]
  n45["tests/phonefix.test.mjs"]
  n46["tests/playmedia.test.mjs"]
  n47["tests/plays.test.mjs"]
  n48["tests/points.test.mjs"]
  n49["tests/polish.test.mjs"]
  n50["tests/probuilds.test.mjs"]
  n51["tests/profanity.test.mjs"]
  n52["tests/profiles.test.mjs"]
  n53["tests/push.test.mjs"]
  n54["tests/pwa.test.mjs"]
  n55["tests/quickcommands.test.mjs"]
  n56["tests/rankings.test.mjs"]
  n57["tests/run.mjs"]
  n58["tests/rush.test.mjs"]
  n59["tests/site.test.mjs"]
  n60["tests/social.test.mjs"]
  n61["tests/squads.test.mjs"]
  n62["tests/statinsights.test.mjs"]
  n63["tests/studio.test.mjs"]
  n64["tests/submissions.test.mjs"]
  n65["tests/tagline.test.mjs"]
  n66["tests/trials.test.mjs"]
  n67["tests/updates.test.mjs"]
  n68["tests/voicerecap.test.mjs"]
  n69["tests/wave10.test.mjs"]
  n70["tests/wave11.test.mjs"]
  n71["tests/wave8.test.mjs"]
  n0 --> n34
  n0 --> n40
  n1 --> n34
  n1 --> n40
  n2 --> n34
  n3 --> n34
  n3 --> n40
  n4 --> n34
  n4 --> n40
  n5 --> n34
  n5 --> n40
  n6 --> n34
  n6 --> n40
  n7 --> n34
  n7 --> n40
  n8 --> n34
  n8 --> n40
  n9 --> n34
  n9 --> n40
  n10 --> n34
  n10 --> n40
  n11 --> n34
  n11 --> n40
  n12 --> n34
  n12 --> n40
  n13 --> n34
  n13 --> n40
  n14 --> n34
  n14 --> n40
  n15 --> n34
  n15 --> n40
  n16 --> n34
  n16 --> n40
  n17 --> n34
  n17 --> n40
  n18 --> n34
  n18 --> n40
  n19 --> n34
  n19 --> n40
  n20 --> n34
  n20 --> n40
  n21 --> n34
  n21 --> n40
  n22 --> n34
  n23 --> n34
  n23 --> n40
  n24 --> n34
  n24 --> n40
  n25 --> n34
  n25 --> n40
  n26 --> n34
  n26 --> n40
  n27 --> n34
  n27 --> n40
  n28 --> n34
  n28 --> n40
  n29 --> n34
  n29 --> n40
  n30 --> n34
  n30 --> n40
  n31 --> n34
  n31 --> n40
  n32 --> n34
  n32 --> n40
  n33 --> n34
  n33 --> n40
  n35 --> n34
  n35 --> n40
  n36 --> n34
  n36 --> n40
  n37 --> n34
  n37 --> n40
  n38 --> n34
  n38 --> n40
  n39 --> n34
  n39 --> n40
  n41 --> n34
  n41 --> n40
  n42 --> n34
  n42 --> n40
  n43 --> n34
  n43 --> n40
  n44 --> n34
  n44 --> n40
  n45 --> n34
  n45 --> n40
  n46 --> n34
  n46 --> n40
  n47 --> n34
  n47 --> n40
  n48 --> n34
  n48 --> n40
  n49 --> n34
  n49 --> n40
  n50 --> n34
  n50 --> n40
  n51 --> n34
  n51 --> n40
  n52 --> n34
  n52 --> n40
  n53 --> n34
  n53 --> n40
  n54 --> n34
  n54 --> n40
  n55 --> n34
  n55 --> n40
  n56 --> n34
  n58 --> n34
  n58 --> n40
  n59 --> n34
  n59 --> n40
  n60 --> n34
  n60 --> n40
  n61 --> n34
  n61 --> n40
  n62 --> n34
  n62 --> n40
  n63 --> n34
  n63 --> n40
  n64 --> n34
  n64 --> n40
  n65 --> n34
  n65 --> n40
  n66 --> n34
  n66 --> n40
  n67 --> n34
  n67 --> n40
  n68 --> n34
  n68 --> n40
  n69 --> n34
  n69 --> n40
  n70 --> n34
  n70 --> n40
  n71 --> n34
  n71 --> n40
```
