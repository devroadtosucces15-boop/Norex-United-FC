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
  n42["tests/issuesrec.test.mjs"]
  n43["tests/lib.mjs"]
  n44["tests/lineuprec.test.mjs"]
  n45["tests/live.test.mjs"]
  n46["tests/locker.test.mjs"]
  n47["tests/media.test.mjs"]
  n48["tests/memberlive.test.mjs"]
  n49["tests/members.test.mjs"]
  n50["tests/mock.mjs"]
  n51["tests/moderation.test.mjs"]
  n52["tests/monitor.test.mjs"]
  n53["tests/next-quality.test.mjs"]
  n54["tests/next-runtime.test.mjs"]
  n55["tests/next.test.mjs"]
  n56["tests/notify.test.mjs"]
  n57["tests/packs.test.mjs"]
  n58["tests/panel.test.mjs"]
  n59["tests/phonefix.test.mjs"]
  n60["tests/playmedia.test.mjs"]
  n61["tests/plays.test.mjs"]
  n62["tests/points.test.mjs"]
  n63["tests/polish.test.mjs"]
  n64["tests/prefs.test.mjs"]
  n65["tests/probuilds.test.mjs"]
  n66["tests/profanity.test.mjs"]
  n67["tests/profiles.test.mjs"]
  n68["tests/push.test.mjs"]
  n69["tests/pwa.test.mjs"]
  n70["tests/quickcommands.test.mjs"]
  n71["tests/rankings.test.mjs"]
  n72["tests/recorder.test.mjs"]
  n73["tests/redirects.test.mjs"]
  n74["tests/reminders.test.mjs"]
  n75["tests/resultpost.test.mjs"]
  n76["tests/run.mjs"]
  n77["tests/rush.test.mjs"]
  n78["tests/servertools.test.mjs"]
  n79["tests/site.test.mjs"]
  n80["tests/social.test.mjs"]
  n81["tests/squads.test.mjs"]
  n82["tests/stars.test.mjs"]
  n83["tests/statinsights.test.mjs"]
  n84["tests/studio.test.mjs"]
  n85["tests/submissions.test.mjs"]
  n86["tests/tagline.test.mjs"]
  n87["tests/trials.test.mjs"]
  n88["tests/updates.test.mjs"]
  n89["tests/voicerecap.test.mjs"]
  n90["tests/watchlist.test.mjs"]
  n91["tests/wave10.test.mjs"]
  n92["tests/wave11.test.mjs"]
  n93["tests/wave8.test.mjs"]
  n0 --> n43
  n0 --> n50
  n1 --> n43
  n1 --> n50
  n2 --> n43
  n3 --> n43
  n3 --> n50
  n4 --> n43
  n4 --> n50
  n5 --> n43
  n5 --> n50
  n6 --> n43
  n6 --> n50
  n7 --> n43
  n7 --> n50
  n8 --> n43
  n8 --> n50
  n9 --> n50
  n10 --> n43
  n10 --> n50
  n11 --> n43
  n11 --> n50
  n12 --> n43
  n12 --> n50
  n13 --> n43
  n13 --> n50
  n14 --> n43
  n14 --> n50
  n15 --> n43
  n15 --> n50
  n16 --> n43
  n16 --> n50
  n17 --> n43
  n17 --> n50
  n18 --> n43
  n18 --> n50
  n19 --> n43
  n19 --> n50
  n20 --> n43
  n20 --> n50
  n21 --> n43
  n21 --> n50
  n22 --> n43
  n22 --> n50
  n23 --> n43
  n23 --> n50
  n24 --> n43
  n24 --> n50
  n25 --> n43
  n25 --> n50
  n26 --> n43
  n27 --> n43
  n27 --> n50
  n28 --> n43
  n28 --> n50
  n29 --> n43
  n29 --> n50
  n30 --> n43
  n30 --> n50
  n31 --> n43
  n31 --> n50
  n32 --> n43
  n32 --> n50
  n33 --> n43
  n33 --> n50
  n34 --> n43
  n34 --> n50
  n35 --> n43
  n35 --> n50
  n36 --> n43
  n36 --> n50
  n37 --> n43
  n37 --> n50
  n38 --> n43
  n38 --> n50
  n39 --> n43
  n39 --> n50
  n40 --> n43
  n40 --> n50
  n41 --> n43
  n41 --> n50
  n42 --> n43
  n42 --> n50
  n44 --> n43
  n44 --> n50
  n45 --> n43
  n45 --> n50
  n46 --> n43
  n46 --> n50
  n47 --> n43
  n47 --> n50
  n48 --> n43
  n48 --> n50
  n49 --> n43
  n49 --> n50
  n51 --> n43
  n51 --> n50
  n52 --> n43
  n52 --> n50
  n53 --> n43
  n53 --> n50
  n54 --> n43
  n54 --> n50
  n55 --> n9
  n55 --> n43
  n55 --> n50
  n56 --> n43
  n56 --> n50
  n57 --> n43
  n57 --> n50
  n58 --> n43
  n58 --> n50
  n59 --> n43
  n59 --> n50
  n60 --> n43
  n60 --> n50
  n61 --> n43
  n61 --> n50
  n62 --> n43
  n62 --> n50
  n63 --> n43
  n63 --> n50
  n64 --> n43
  n64 --> n50
  n65 --> n43
  n65 --> n50
  n66 --> n43
  n66 --> n50
  n67 --> n43
  n67 --> n50
  n68 --> n43
  n68 --> n50
  n69 --> n43
  n69 --> n50
  n70 --> n43
  n70 --> n50
  n71 --> n43
  n72 --> n43
  n72 --> n50
  n73 --> n43
  n74 --> n43
  n74 --> n50
  n75 --> n43
  n77 --> n43
  n77 --> n50
  n78 --> n43
  n78 --> n50
  n79 --> n43
  n79 --> n50
  n80 --> n43
  n80 --> n50
  n81 --> n43
  n81 --> n50
  n82 --> n43
  n83 --> n43
  n83 --> n50
  n84 --> n43
  n84 --> n50
  n85 --> n43
  n85 --> n50
  n86 --> n43
  n86 --> n50
  n87 --> n43
  n87 --> n50
  n88 --> n43
  n88 --> n50
  n89 --> n43
  n89 --> n50
  n90 --> n43
  n90 --> n50
  n91 --> n43
  n91 --> n50
  n92 --> n43
  n92 --> n50
  n93 --> n43
  n93 --> n50
```
