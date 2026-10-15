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
  n9["tests/botfeat-sample.mjs"]
  n10["tests/builder.test.mjs"]
  n11["tests/builds.test.mjs"]
  n12["tests/burners-api.test.mjs"]
  n13["tests/burners.test.mjs"]
  n14["tests/cardstudio.test.mjs"]
  n15["tests/chat.test.mjs"]
  n16["tests/clublookup.test.mjs"]
  n17["tests/crawl.test.mjs"]
  n18["tests/design.test.mjs"]
  n19["tests/discord.test.mjs"]
  n20["tests/discoveries.test.mjs"]
  n21["tests/docs.test.mjs"]
  n22["tests/drilldown.test.mjs"]
  n23["tests/dugout.test.mjs"]
  n24["tests/events-ui.test.mjs"]
  n25["tests/events.test.mjs"]
  n26["tests/extradata.test.mjs"]
  n27["tests/faces-api.test.mjs"]
  n28["tests/feed.test.mjs"]
  n29["tests/feedbackroom.test.mjs"]
  n30["tests/flags.test.mjs"]
  n31["tests/fun.test.mjs"]
  n32["tests/game.test.mjs"]
  n33["tests/honours.test.mjs"]
  n34["tests/host.test.mjs"]
  n35["tests/hub.test.mjs"]
  n36["tests/hublive.test.mjs"]
  n37["tests/hype.test.mjs"]
  n38["tests/insights.test.mjs"]
  n39["tests/insightwidget.test.mjs"]
  n40["tests/intel.test.mjs"]
  n41["tests/issues.test.mjs"]
  n42["tests/lib.mjs"]
  n43["tests/lineuprec.test.mjs"]
  n44["tests/live.test.mjs"]
  n45["tests/locker.test.mjs"]
  n46["tests/media.test.mjs"]
  n47["tests/memberlive.test.mjs"]
  n48["tests/members.test.mjs"]
  n49["tests/mock.mjs"]
  n50["tests/moderation.test.mjs"]
  n51["tests/monitor.test.mjs"]
  n52["tests/next-quality.test.mjs"]
  n53["tests/next-runtime.test.mjs"]
  n54["tests/next.test.mjs"]
  n55["tests/notify.test.mjs"]
  n56["tests/packs.test.mjs"]
  n57["tests/panel.test.mjs"]
  n58["tests/phonefix.test.mjs"]
  n59["tests/playmedia.test.mjs"]
  n60["tests/plays.test.mjs"]
  n61["tests/points.test.mjs"]
  n62["tests/polish.test.mjs"]
  n63["tests/prefs.test.mjs"]
  n64["tests/probuilds.test.mjs"]
  n65["tests/profanity.test.mjs"]
  n66["tests/profiles.test.mjs"]
  n67["tests/push.test.mjs"]
  n68["tests/pwa.test.mjs"]
  n69["tests/quickcommands.test.mjs"]
  n70["tests/rankings.test.mjs"]
  n71["tests/redirects.test.mjs"]
  n72["tests/reminders.test.mjs"]
  n73["tests/resultpost.test.mjs"]
  n74["tests/run.mjs"]
  n75["tests/rush.test.mjs"]
  n76["tests/servertools.test.mjs"]
  n77["tests/site.test.mjs"]
  n78["tests/social.test.mjs"]
  n79["tests/squads.test.mjs"]
  n80["tests/stars.test.mjs"]
  n81["tests/statinsights.test.mjs"]
  n82["tests/studio.test.mjs"]
  n83["tests/submissions.test.mjs"]
  n84["tests/tagline.test.mjs"]
  n85["tests/trials.test.mjs"]
  n86["tests/updates.test.mjs"]
  n87["tests/voicerecap.test.mjs"]
  n88["tests/watchlist.test.mjs"]
  n89["tests/wave10.test.mjs"]
  n90["tests/wave11.test.mjs"]
  n91["tests/wave8.test.mjs"]
  n0 --> n42
  n0 --> n49
  n1 --> n42
  n1 --> n49
  n2 --> n42
  n3 --> n42
  n3 --> n49
  n4 --> n42
  n4 --> n49
  n5 --> n42
  n5 --> n49
  n6 --> n42
  n6 --> n49
  n7 --> n42
  n7 --> n49
  n8 --> n42
  n8 --> n49
  n9 --> n49
  n10 --> n42
  n10 --> n49
  n11 --> n42
  n11 --> n49
  n12 --> n42
  n12 --> n49
  n13 --> n42
  n13 --> n49
  n14 --> n42
  n14 --> n49
  n15 --> n42
  n15 --> n49
  n16 --> n42
  n16 --> n49
  n17 --> n42
  n17 --> n49
  n18 --> n42
  n18 --> n49
  n19 --> n42
  n19 --> n49
  n20 --> n42
  n20 --> n49
  n21 --> n42
  n21 --> n49
  n22 --> n42
  n22 --> n49
  n23 --> n42
  n23 --> n49
  n24 --> n42
  n24 --> n49
  n25 --> n42
  n25 --> n49
  n26 --> n42
  n27 --> n42
  n27 --> n49
  n28 --> n42
  n28 --> n49
  n29 --> n42
  n29 --> n49
  n30 --> n42
  n30 --> n49
  n31 --> n42
  n31 --> n49
  n32 --> n42
  n32 --> n49
  n33 --> n42
  n33 --> n49
  n34 --> n42
  n34 --> n49
  n35 --> n42
  n35 --> n49
  n36 --> n42
  n36 --> n49
  n37 --> n42
  n37 --> n49
  n38 --> n42
  n38 --> n49
  n39 --> n42
  n39 --> n49
  n40 --> n42
  n40 --> n49
  n41 --> n42
  n41 --> n49
  n43 --> n42
  n43 --> n49
  n44 --> n42
  n44 --> n49
  n45 --> n42
  n45 --> n49
  n46 --> n42
  n46 --> n49
  n47 --> n42
  n47 --> n49
  n48 --> n42
  n48 --> n49
  n50 --> n42
  n50 --> n49
  n51 --> n42
  n51 --> n49
  n52 --> n42
  n52 --> n49
  n53 --> n42
  n53 --> n49
  n54 --> n9
  n54 --> n42
  n54 --> n49
  n55 --> n42
  n55 --> n49
  n56 --> n42
  n56 --> n49
  n57 --> n42
  n57 --> n49
  n58 --> n42
  n58 --> n49
  n59 --> n42
  n59 --> n49
  n60 --> n42
  n60 --> n49
  n61 --> n42
  n61 --> n49
  n62 --> n42
  n62 --> n49
  n63 --> n42
  n63 --> n49
  n64 --> n42
  n64 --> n49
  n65 --> n42
  n65 --> n49
  n66 --> n42
  n66 --> n49
  n67 --> n42
  n67 --> n49
  n68 --> n42
  n68 --> n49
  n69 --> n42
  n69 --> n49
  n70 --> n42
  n71 --> n42
  n72 --> n42
  n72 --> n49
  n73 --> n42
  n75 --> n42
  n75 --> n49
  n76 --> n42
  n76 --> n49
  n77 --> n42
  n77 --> n49
  n78 --> n42
  n78 --> n49
  n79 --> n42
  n79 --> n49
  n80 --> n42
  n81 --> n42
  n81 --> n49
  n82 --> n42
  n82 --> n49
  n83 --> n42
  n83 --> n49
  n84 --> n42
  n84 --> n49
  n85 --> n42
  n85 --> n49
  n86 --> n42
  n86 --> n49
  n87 --> n42
  n87 --> n49
  n88 --> n42
  n88 --> n49
  n89 --> n42
  n89 --> n49
  n90 --> n42
  n90 --> n49
  n91 --> n42
  n91 --> n49
```
