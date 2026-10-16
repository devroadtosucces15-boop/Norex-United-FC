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
  n18["tests/d1usage.test.mjs"]
  n19["tests/design.test.mjs"]
  n20["tests/discord.test.mjs"]
  n21["tests/discoveries.test.mjs"]
  n22["tests/docs.test.mjs"]
  n23["tests/drilldown.test.mjs"]
  n24["tests/dugout.test.mjs"]
  n25["tests/events-ui.test.mjs"]
  n26["tests/events.test.mjs"]
  n27["tests/extradata.test.mjs"]
  n28["tests/faces-api.test.mjs"]
  n29["tests/feed.test.mjs"]
  n30["tests/feedbackroom.test.mjs"]
  n31["tests/flags.test.mjs"]
  n32["tests/fun.test.mjs"]
  n33["tests/game.test.mjs"]
  n34["tests/honours.test.mjs"]
  n35["tests/host.test.mjs"]
  n36["tests/hub.test.mjs"]
  n37["tests/hublive.test.mjs"]
  n38["tests/hype.test.mjs"]
  n39["tests/insights.test.mjs"]
  n40["tests/insightwidget.test.mjs"]
  n41["tests/intel.test.mjs"]
  n42["tests/issues.test.mjs"]
  n43["tests/issuesrec.test.mjs"]
  n44["tests/lib.mjs"]
  n45["tests/lineuprec.test.mjs"]
  n46["tests/live.test.mjs"]
  n47["tests/locker.test.mjs"]
  n48["tests/media.test.mjs"]
  n49["tests/memberlive.test.mjs"]
  n50["tests/members.test.mjs"]
  n51["tests/mock.mjs"]
  n52["tests/moderation.test.mjs"]
  n53["tests/monitor.test.mjs"]
  n54["tests/next-quality.test.mjs"]
  n55["tests/next-runtime.test.mjs"]
  n56["tests/next.test.mjs"]
  n57["tests/notify.test.mjs"]
  n58["tests/packs.test.mjs"]
  n59["tests/panel.test.mjs"]
  n60["tests/phonefix.test.mjs"]
  n61["tests/playmedia.test.mjs"]
  n62["tests/plays.test.mjs"]
  n63["tests/points.test.mjs"]
  n64["tests/polish.test.mjs"]
  n65["tests/prefs.test.mjs"]
  n66["tests/probuilds.test.mjs"]
  n67["tests/profanity.test.mjs"]
  n68["tests/profiles.test.mjs"]
  n69["tests/push.test.mjs"]
  n70["tests/pwa.test.mjs"]
  n71["tests/quickcommands.test.mjs"]
  n72["tests/rankings.test.mjs"]
  n73["tests/recorder.test.mjs"]
  n74["tests/redirects.test.mjs"]
  n75["tests/reminders.test.mjs"]
  n76["tests/resultpost.test.mjs"]
  n77["tests/run.mjs"]
  n78["tests/rush.test.mjs"]
  n79["tests/servertools.test.mjs"]
  n80["tests/site.test.mjs"]
  n81["tests/social.test.mjs"]
  n82["tests/squads.test.mjs"]
  n83["tests/stars.test.mjs"]
  n84["tests/statinsights.test.mjs"]
  n85["tests/studio.test.mjs"]
  n86["tests/submissions.test.mjs"]
  n87["tests/tagline.test.mjs"]
  n88["tests/trials.test.mjs"]
  n89["tests/updates.test.mjs"]
  n90["tests/voicerecap.test.mjs"]
  n91["tests/watchlist.test.mjs"]
  n92["tests/wave10.test.mjs"]
  n93["tests/wave11.test.mjs"]
  n94["tests/wave8.test.mjs"]
  n0 --> n44
  n0 --> n51
  n1 --> n44
  n1 --> n51
  n2 --> n44
  n3 --> n44
  n3 --> n51
  n4 --> n44
  n4 --> n51
  n5 --> n44
  n5 --> n51
  n6 --> n44
  n6 --> n51
  n7 --> n44
  n7 --> n51
  n8 --> n44
  n8 --> n51
  n9 --> n51
  n10 --> n44
  n10 --> n51
  n11 --> n44
  n11 --> n51
  n12 --> n44
  n12 --> n51
  n13 --> n44
  n13 --> n51
  n14 --> n44
  n14 --> n51
  n15 --> n44
  n15 --> n51
  n16 --> n44
  n16 --> n51
  n17 --> n44
  n17 --> n51
  n18 --> n44
  n18 --> n51
  n19 --> n44
  n19 --> n51
  n20 --> n44
  n20 --> n51
  n21 --> n44
  n21 --> n51
  n22 --> n44
  n22 --> n51
  n23 --> n44
  n23 --> n51
  n24 --> n44
  n24 --> n51
  n25 --> n44
  n25 --> n51
  n26 --> n44
  n26 --> n51
  n27 --> n44
  n28 --> n44
  n28 --> n51
  n29 --> n44
  n29 --> n51
  n30 --> n44
  n30 --> n51
  n31 --> n44
  n31 --> n51
  n32 --> n44
  n32 --> n51
  n33 --> n44
  n33 --> n51
  n34 --> n44
  n34 --> n51
  n35 --> n44
  n35 --> n51
  n36 --> n44
  n36 --> n51
  n37 --> n44
  n37 --> n51
  n38 --> n44
  n38 --> n51
  n39 --> n44
  n39 --> n51
  n40 --> n44
  n40 --> n51
  n41 --> n44
  n41 --> n51
  n42 --> n44
  n42 --> n51
  n43 --> n44
  n43 --> n51
  n45 --> n44
  n45 --> n51
  n46 --> n44
  n46 --> n51
  n47 --> n44
  n47 --> n51
  n48 --> n44
  n48 --> n51
  n49 --> n44
  n49 --> n51
  n50 --> n44
  n50 --> n51
  n52 --> n44
  n52 --> n51
  n53 --> n44
  n53 --> n51
  n54 --> n44
  n54 --> n51
  n55 --> n44
  n55 --> n51
  n56 --> n9
  n56 --> n44
  n56 --> n51
  n57 --> n44
  n57 --> n51
  n58 --> n44
  n58 --> n51
  n59 --> n44
  n59 --> n51
  n60 --> n44
  n60 --> n51
  n61 --> n44
  n61 --> n51
  n62 --> n44
  n62 --> n51
  n63 --> n44
  n63 --> n51
  n64 --> n44
  n64 --> n51
  n65 --> n44
  n65 --> n51
  n66 --> n44
  n66 --> n51
  n67 --> n44
  n67 --> n51
  n68 --> n44
  n68 --> n51
  n69 --> n44
  n69 --> n51
  n70 --> n44
  n70 --> n51
  n71 --> n44
  n71 --> n51
  n72 --> n44
  n73 --> n44
  n73 --> n51
  n74 --> n44
  n75 --> n44
  n75 --> n51
  n76 --> n44
  n78 --> n44
  n78 --> n51
  n79 --> n44
  n79 --> n51
  n80 --> n44
  n80 --> n51
  n81 --> n44
  n81 --> n51
  n82 --> n44
  n82 --> n51
  n83 --> n44
  n84 --> n44
  n84 --> n51
  n85 --> n44
  n85 --> n51
  n86 --> n44
  n86 --> n51
  n87 --> n44
  n87 --> n51
  n88 --> n44
  n88 --> n51
  n89 --> n44
  n89 --> n51
  n90 --> n44
  n90 --> n51
  n91 --> n44
  n91 --> n51
  n92 --> n44
  n92 --> n51
  n93 --> n44
  n93 --> n51
  n94 --> n44
  n94 --> n51
```
