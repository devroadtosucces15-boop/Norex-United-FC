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
  n17["tests/design.test.mjs"]
  n18["tests/discord.test.mjs"]
  n19["tests/discoveries.test.mjs"]
  n20["tests/docs.test.mjs"]
  n21["tests/drilldown.test.mjs"]
  n22["tests/dugout.test.mjs"]
  n23["tests/events-ui.test.mjs"]
  n24["tests/events.test.mjs"]
  n25["tests/extradata.test.mjs"]
  n26["tests/feed.test.mjs"]
  n27["tests/flags.test.mjs"]
  n28["tests/fun.test.mjs"]
  n29["tests/game.test.mjs"]
  n30["tests/honours.test.mjs"]
  n31["tests/host.test.mjs"]
  n32["tests/hub.test.mjs"]
  n33["tests/hublive.test.mjs"]
  n34["tests/hype.test.mjs"]
  n35["tests/insights.test.mjs"]
  n36["tests/insightwidget.test.mjs"]
  n37["tests/intel.test.mjs"]
  n38["tests/issues.test.mjs"]
  n39["tests/lib.mjs"]
  n40["tests/lineuprec.test.mjs"]
  n41["tests/live.test.mjs"]
  n42["tests/locker.test.mjs"]
  n43["tests/media.test.mjs"]
  n44["tests/memberlive.test.mjs"]
  n45["tests/members.test.mjs"]
  n46["tests/mock.mjs"]
  n47["tests/moderation.test.mjs"]
  n48["tests/monitor.test.mjs"]
  n49["tests/next-quality.test.mjs"]
  n50["tests/next-runtime.test.mjs"]
  n51["tests/next.test.mjs"]
  n52["tests/notify.test.mjs"]
  n53["tests/packs.test.mjs"]
  n54["tests/panel.test.mjs"]
  n55["tests/phonefix.test.mjs"]
  n56["tests/playmedia.test.mjs"]
  n57["tests/plays.test.mjs"]
  n58["tests/points.test.mjs"]
  n59["tests/polish.test.mjs"]
  n60["tests/probuilds.test.mjs"]
  n61["tests/profanity.test.mjs"]
  n62["tests/profiles.test.mjs"]
  n63["tests/push.test.mjs"]
  n64["tests/pwa.test.mjs"]
  n65["tests/quickcommands.test.mjs"]
  n66["tests/rankings.test.mjs"]
  n67["tests/redirects.test.mjs"]
  n68["tests/reminders.test.mjs"]
  n69["tests/resultpost.test.mjs"]
  n70["tests/run.mjs"]
  n71["tests/rush.test.mjs"]
  n72["tests/servertools.test.mjs"]
  n73["tests/site.test.mjs"]
  n74["tests/social.test.mjs"]
  n75["tests/squads.test.mjs"]
  n76["tests/statinsights.test.mjs"]
  n77["tests/studio.test.mjs"]
  n78["tests/submissions.test.mjs"]
  n79["tests/tagline.test.mjs"]
  n80["tests/trials.test.mjs"]
  n81["tests/updates.test.mjs"]
  n82["tests/voicerecap.test.mjs"]
  n83["tests/watchlist.test.mjs"]
  n84["tests/wave10.test.mjs"]
  n85["tests/wave11.test.mjs"]
  n86["tests/wave8.test.mjs"]
  n0 --> n39
  n0 --> n46
  n1 --> n39
  n1 --> n46
  n2 --> n39
  n3 --> n39
  n3 --> n46
  n4 --> n39
  n4 --> n46
  n5 --> n39
  n5 --> n46
  n6 --> n39
  n6 --> n46
  n7 --> n39
  n7 --> n46
  n8 --> n39
  n8 --> n46
  n9 --> n39
  n9 --> n46
  n10 --> n39
  n10 --> n46
  n11 --> n39
  n11 --> n46
  n12 --> n39
  n12 --> n46
  n13 --> n39
  n13 --> n46
  n14 --> n39
  n14 --> n46
  n15 --> n39
  n15 --> n46
  n16 --> n39
  n16 --> n46
  n17 --> n39
  n17 --> n46
  n18 --> n39
  n18 --> n46
  n19 --> n39
  n19 --> n46
  n20 --> n39
  n20 --> n46
  n21 --> n39
  n21 --> n46
  n22 --> n39
  n22 --> n46
  n23 --> n39
  n23 --> n46
  n24 --> n39
  n24 --> n46
  n25 --> n39
  n26 --> n39
  n26 --> n46
  n27 --> n39
  n27 --> n46
  n28 --> n39
  n28 --> n46
  n29 --> n39
  n29 --> n46
  n30 --> n39
  n30 --> n46
  n31 --> n39
  n31 --> n46
  n32 --> n39
  n32 --> n46
  n33 --> n39
  n33 --> n46
  n34 --> n39
  n34 --> n46
  n35 --> n39
  n35 --> n46
  n36 --> n39
  n36 --> n46
  n37 --> n39
  n37 --> n46
  n38 --> n39
  n38 --> n46
  n40 --> n39
  n40 --> n46
  n41 --> n39
  n41 --> n46
  n42 --> n39
  n42 --> n46
  n43 --> n39
  n43 --> n46
  n44 --> n39
  n44 --> n46
  n45 --> n39
  n45 --> n46
  n47 --> n39
  n47 --> n46
  n48 --> n39
  n48 --> n46
  n49 --> n39
  n49 --> n46
  n50 --> n39
  n50 --> n46
  n51 --> n39
  n51 --> n46
  n52 --> n39
  n52 --> n46
  n53 --> n39
  n53 --> n46
  n54 --> n39
  n54 --> n46
  n55 --> n39
  n55 --> n46
  n56 --> n39
  n56 --> n46
  n57 --> n39
  n57 --> n46
  n58 --> n39
  n58 --> n46
  n59 --> n39
  n59 --> n46
  n60 --> n39
  n60 --> n46
  n61 --> n39
  n61 --> n46
  n62 --> n39
  n62 --> n46
  n63 --> n39
  n63 --> n46
  n64 --> n39
  n64 --> n46
  n65 --> n39
  n65 --> n46
  n66 --> n39
  n67 --> n39
  n68 --> n39
  n68 --> n46
  n69 --> n39
  n71 --> n39
  n71 --> n46
  n72 --> n39
  n72 --> n46
  n73 --> n39
  n73 --> n46
  n74 --> n39
  n74 --> n46
  n75 --> n39
  n75 --> n46
  n76 --> n39
  n76 --> n46
  n77 --> n39
  n77 --> n46
  n78 --> n39
  n78 --> n46
  n79 --> n39
  n79 --> n46
  n80 --> n39
  n80 --> n46
  n81 --> n39
  n81 --> n46
  n82 --> n39
  n82 --> n46
  n83 --> n39
  n83 --> n46
  n84 --> n39
  n84 --> n46
  n85 --> n39
  n85 --> n46
  n86 --> n39
  n86 --> n46
```
