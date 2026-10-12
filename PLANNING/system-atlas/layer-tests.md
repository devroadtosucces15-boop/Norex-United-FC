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
  n11["tests/burners-api.test.mjs"]
  n12["tests/burners.test.mjs"]
  n13["tests/cardstudio.test.mjs"]
  n14["tests/chat.test.mjs"]
  n15["tests/clublookup.test.mjs"]
  n16["tests/crawl.test.mjs"]
  n17["tests/discord.test.mjs"]
  n18["tests/docs.test.mjs"]
  n19["tests/drilldown.test.mjs"]
  n20["tests/dugout.test.mjs"]
  n21["tests/events-ui.test.mjs"]
  n22["tests/events.test.mjs"]
  n23["tests/extradata.test.mjs"]
  n24["tests/feed.test.mjs"]
  n25["tests/flags.test.mjs"]
  n26["tests/game.test.mjs"]
  n27["tests/honours.test.mjs"]
  n28["tests/hub.test.mjs"]
  n29["tests/hublive.test.mjs"]
  n30["tests/hype.test.mjs"]
  n31["tests/insights.test.mjs"]
  n32["tests/insightwidget.test.mjs"]
  n33["tests/intel.test.mjs"]
  n34["tests/issues.test.mjs"]
  n35["tests/lib.mjs"]
  n36["tests/lineuprec.test.mjs"]
  n37["tests/live.test.mjs"]
  n38["tests/locker.test.mjs"]
  n39["tests/media.test.mjs"]
  n40["tests/members.test.mjs"]
  n41["tests/mock.mjs"]
  n42["tests/moderation.test.mjs"]
  n43["tests/monitor.test.mjs"]
  n44["tests/next-quality.test.mjs"]
  n45["tests/next-runtime.test.mjs"]
  n46["tests/next.test.mjs"]
  n47["tests/notify.test.mjs"]
  n48["tests/packs.test.mjs"]
  n49["tests/phonefix.test.mjs"]
  n50["tests/playmedia.test.mjs"]
  n51["tests/plays.test.mjs"]
  n52["tests/points.test.mjs"]
  n53["tests/polish.test.mjs"]
  n54["tests/probuilds.test.mjs"]
  n55["tests/profanity.test.mjs"]
  n56["tests/profiles.test.mjs"]
  n57["tests/push.test.mjs"]
  n58["tests/pwa.test.mjs"]
  n59["tests/quickcommands.test.mjs"]
  n60["tests/rankings.test.mjs"]
  n61["tests/run.mjs"]
  n62["tests/rush.test.mjs"]
  n63["tests/site.test.mjs"]
  n64["tests/social.test.mjs"]
  n65["tests/squads.test.mjs"]
  n66["tests/statinsights.test.mjs"]
  n67["tests/studio.test.mjs"]
  n68["tests/submissions.test.mjs"]
  n69["tests/tagline.test.mjs"]
  n70["tests/trials.test.mjs"]
  n71["tests/updates.test.mjs"]
  n72["tests/voicerecap.test.mjs"]
  n73["tests/wave10.test.mjs"]
  n74["tests/wave11.test.mjs"]
  n75["tests/wave8.test.mjs"]
  n0 --> n35
  n0 --> n41
  n1 --> n35
  n1 --> n41
  n2 --> n35
  n3 --> n35
  n3 --> n41
  n4 --> n35
  n4 --> n41
  n5 --> n35
  n5 --> n41
  n6 --> n35
  n6 --> n41
  n7 --> n35
  n7 --> n41
  n8 --> n35
  n8 --> n41
  n9 --> n35
  n9 --> n41
  n10 --> n35
  n10 --> n41
  n11 --> n35
  n11 --> n41
  n12 --> n35
  n12 --> n41
  n13 --> n35
  n13 --> n41
  n14 --> n35
  n14 --> n41
  n15 --> n35
  n15 --> n41
  n16 --> n35
  n16 --> n41
  n17 --> n35
  n17 --> n41
  n18 --> n35
  n18 --> n41
  n19 --> n35
  n19 --> n41
  n20 --> n35
  n20 --> n41
  n21 --> n35
  n21 --> n41
  n22 --> n35
  n22 --> n41
  n23 --> n35
  n24 --> n35
  n24 --> n41
  n25 --> n35
  n25 --> n41
  n26 --> n35
  n26 --> n41
  n27 --> n35
  n27 --> n41
  n28 --> n35
  n28 --> n41
  n29 --> n35
  n29 --> n41
  n30 --> n35
  n30 --> n41
  n31 --> n35
  n31 --> n41
  n32 --> n35
  n32 --> n41
  n33 --> n35
  n33 --> n41
  n34 --> n35
  n34 --> n41
  n36 --> n35
  n36 --> n41
  n37 --> n35
  n37 --> n41
  n38 --> n35
  n38 --> n41
  n39 --> n35
  n39 --> n41
  n40 --> n35
  n40 --> n41
  n42 --> n35
  n42 --> n41
  n43 --> n35
  n43 --> n41
  n44 --> n35
  n44 --> n41
  n45 --> n35
  n45 --> n41
  n46 --> n35
  n46 --> n41
  n47 --> n35
  n47 --> n41
  n48 --> n35
  n48 --> n41
  n49 --> n35
  n49 --> n41
  n50 --> n35
  n50 --> n41
  n51 --> n35
  n51 --> n41
  n52 --> n35
  n52 --> n41
  n53 --> n35
  n53 --> n41
  n54 --> n35
  n54 --> n41
  n55 --> n35
  n55 --> n41
  n56 --> n35
  n56 --> n41
  n57 --> n35
  n57 --> n41
  n58 --> n35
  n58 --> n41
  n59 --> n35
  n59 --> n41
  n60 --> n35
  n62 --> n35
  n62 --> n41
  n63 --> n35
  n63 --> n41
  n64 --> n35
  n64 --> n41
  n65 --> n35
  n65 --> n41
  n66 --> n35
  n66 --> n41
  n67 --> n35
  n67 --> n41
  n68 --> n35
  n68 --> n41
  n69 --> n35
  n69 --> n41
  n70 --> n35
  n70 --> n41
  n71 --> n35
  n71 --> n41
  n72 --> n35
  n72 --> n41
  n73 --> n35
  n73 --> n41
  n74 --> n35
  n74 --> n41
  n75 --> n35
  n75 --> n41
```
