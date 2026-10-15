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
  n27["tests/feedbackroom.test.mjs"]
  n28["tests/flags.test.mjs"]
  n29["tests/fun.test.mjs"]
  n30["tests/game.test.mjs"]
  n31["tests/honours.test.mjs"]
  n32["tests/host.test.mjs"]
  n33["tests/hub.test.mjs"]
  n34["tests/hublive.test.mjs"]
  n35["tests/hype.test.mjs"]
  n36["tests/insights.test.mjs"]
  n37["tests/insightwidget.test.mjs"]
  n38["tests/intel.test.mjs"]
  n39["tests/issues.test.mjs"]
  n40["tests/lib.mjs"]
  n41["tests/lineuprec.test.mjs"]
  n42["tests/live.test.mjs"]
  n43["tests/locker.test.mjs"]
  n44["tests/media.test.mjs"]
  n45["tests/memberlive.test.mjs"]
  n46["tests/members.test.mjs"]
  n47["tests/mock.mjs"]
  n48["tests/moderation.test.mjs"]
  n49["tests/monitor.test.mjs"]
  n50["tests/next-quality.test.mjs"]
  n51["tests/next-runtime.test.mjs"]
  n52["tests/next.test.mjs"]
  n53["tests/notify.test.mjs"]
  n54["tests/packs.test.mjs"]
  n55["tests/panel.test.mjs"]
  n56["tests/phonefix.test.mjs"]
  n57["tests/playmedia.test.mjs"]
  n58["tests/plays.test.mjs"]
  n59["tests/points.test.mjs"]
  n60["tests/polish.test.mjs"]
  n61["tests/prefs.test.mjs"]
  n62["tests/probuilds.test.mjs"]
  n63["tests/profanity.test.mjs"]
  n64["tests/profiles.test.mjs"]
  n65["tests/push.test.mjs"]
  n66["tests/pwa.test.mjs"]
  n67["tests/quickcommands.test.mjs"]
  n68["tests/rankings.test.mjs"]
  n69["tests/redirects.test.mjs"]
  n70["tests/reminders.test.mjs"]
  n71["tests/resultpost.test.mjs"]
  n72["tests/run.mjs"]
  n73["tests/rush.test.mjs"]
  n74["tests/servertools.test.mjs"]
  n75["tests/site.test.mjs"]
  n76["tests/social.test.mjs"]
  n77["tests/squads.test.mjs"]
  n78["tests/statinsights.test.mjs"]
  n79["tests/studio.test.mjs"]
  n80["tests/submissions.test.mjs"]
  n81["tests/tagline.test.mjs"]
  n82["tests/trials.test.mjs"]
  n83["tests/updates.test.mjs"]
  n84["tests/voicerecap.test.mjs"]
  n85["tests/watchlist.test.mjs"]
  n86["tests/wave10.test.mjs"]
  n87["tests/wave11.test.mjs"]
  n88["tests/wave8.test.mjs"]
  n0 --> n40
  n0 --> n47
  n1 --> n40
  n1 --> n47
  n2 --> n40
  n3 --> n40
  n3 --> n47
  n4 --> n40
  n4 --> n47
  n5 --> n40
  n5 --> n47
  n6 --> n40
  n6 --> n47
  n7 --> n40
  n7 --> n47
  n8 --> n40
  n8 --> n47
  n9 --> n40
  n9 --> n47
  n10 --> n40
  n10 --> n47
  n11 --> n40
  n11 --> n47
  n12 --> n40
  n12 --> n47
  n13 --> n40
  n13 --> n47
  n14 --> n40
  n14 --> n47
  n15 --> n40
  n15 --> n47
  n16 --> n40
  n16 --> n47
  n17 --> n40
  n17 --> n47
  n18 --> n40
  n18 --> n47
  n19 --> n40
  n19 --> n47
  n20 --> n40
  n20 --> n47
  n21 --> n40
  n21 --> n47
  n22 --> n40
  n22 --> n47
  n23 --> n40
  n23 --> n47
  n24 --> n40
  n24 --> n47
  n25 --> n40
  n26 --> n40
  n26 --> n47
  n27 --> n40
  n27 --> n47
  n28 --> n40
  n28 --> n47
  n29 --> n40
  n29 --> n47
  n30 --> n40
  n30 --> n47
  n31 --> n40
  n31 --> n47
  n32 --> n40
  n32 --> n47
  n33 --> n40
  n33 --> n47
  n34 --> n40
  n34 --> n47
  n35 --> n40
  n35 --> n47
  n36 --> n40
  n36 --> n47
  n37 --> n40
  n37 --> n47
  n38 --> n40
  n38 --> n47
  n39 --> n40
  n39 --> n47
  n41 --> n40
  n41 --> n47
  n42 --> n40
  n42 --> n47
  n43 --> n40
  n43 --> n47
  n44 --> n40
  n44 --> n47
  n45 --> n40
  n45 --> n47
  n46 --> n40
  n46 --> n47
  n48 --> n40
  n48 --> n47
  n49 --> n40
  n49 --> n47
  n50 --> n40
  n50 --> n47
  n51 --> n40
  n51 --> n47
  n52 --> n40
  n52 --> n47
  n53 --> n40
  n53 --> n47
  n54 --> n40
  n54 --> n47
  n55 --> n40
  n55 --> n47
  n56 --> n40
  n56 --> n47
  n57 --> n40
  n57 --> n47
  n58 --> n40
  n58 --> n47
  n59 --> n40
  n59 --> n47
  n60 --> n40
  n60 --> n47
  n61 --> n40
  n61 --> n47
  n62 --> n40
  n62 --> n47
  n63 --> n40
  n63 --> n47
  n64 --> n40
  n64 --> n47
  n65 --> n40
  n65 --> n47
  n66 --> n40
  n66 --> n47
  n67 --> n40
  n67 --> n47
  n68 --> n40
  n69 --> n40
  n70 --> n40
  n70 --> n47
  n71 --> n40
  n73 --> n40
  n73 --> n47
  n74 --> n40
  n74 --> n47
  n75 --> n40
  n75 --> n47
  n76 --> n40
  n76 --> n47
  n77 --> n40
  n77 --> n47
  n78 --> n40
  n78 --> n47
  n79 --> n40
  n79 --> n47
  n80 --> n40
  n80 --> n47
  n81 --> n40
  n81 --> n47
  n82 --> n40
  n82 --> n47
  n83 --> n40
  n83 --> n47
  n84 --> n40
  n84 --> n47
  n85 --> n40
  n85 --> n47
  n86 --> n40
  n86 --> n47
  n87 --> n40
  n87 --> n47
  n88 --> n40
  n88 --> n47
```
