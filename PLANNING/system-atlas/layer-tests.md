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
  n44["tests/issuessync.test.mjs"]
  n45["tests/lib.mjs"]
  n46["tests/lineuprec.test.mjs"]
  n47["tests/live.test.mjs"]
  n48["tests/locker.test.mjs"]
  n49["tests/media.test.mjs"]
  n50["tests/memberlive.test.mjs"]
  n51["tests/members.test.mjs"]
  n52["tests/mock.mjs"]
  n53["tests/moderation.test.mjs"]
  n54["tests/monitor.test.mjs"]
  n55["tests/next-quality.test.mjs"]
  n56["tests/next-runtime.test.mjs"]
  n57["tests/next.test.mjs"]
  n58["tests/notify.test.mjs"]
  n59["tests/packs.test.mjs"]
  n60["tests/panel.test.mjs"]
  n61["tests/phonefix.test.mjs"]
  n62["tests/playmedia.test.mjs"]
  n63["tests/plays.test.mjs"]
  n64["tests/points.test.mjs"]
  n65["tests/polish.test.mjs"]
  n66["tests/prefs.test.mjs"]
  n67["tests/probuilds.test.mjs"]
  n68["tests/profanity.test.mjs"]
  n69["tests/profiles.test.mjs"]
  n70["tests/push.test.mjs"]
  n71["tests/pwa.test.mjs"]
  n72["tests/quickcommands.test.mjs"]
  n73["tests/rankings.test.mjs"]
  n74["tests/recorder.test.mjs"]
  n75["tests/redirects.test.mjs"]
  n76["tests/reminders.test.mjs"]
  n77["tests/resultpost.test.mjs"]
  n78["tests/run.mjs"]
  n79["tests/rush.test.mjs"]
  n80["tests/servertools.test.mjs"]
  n81["tests/site.test.mjs"]
  n82["tests/social.test.mjs"]
  n83["tests/squads.test.mjs"]
  n84["tests/stars.test.mjs"]
  n85["tests/statinsights.test.mjs"]
  n86["tests/studio.test.mjs"]
  n87["tests/submissions.test.mjs"]
  n88["tests/tagline.test.mjs"]
  n89["tests/trials.test.mjs"]
  n90["tests/updates.test.mjs"]
  n91["tests/voicerecap.test.mjs"]
  n92["tests/watchlist.test.mjs"]
  n93["tests/wave10.test.mjs"]
  n94["tests/wave11.test.mjs"]
  n95["tests/wave8.test.mjs"]
  n0 --> n45
  n0 --> n52
  n1 --> n45
  n1 --> n52
  n2 --> n45
  n3 --> n45
  n3 --> n52
  n4 --> n45
  n4 --> n52
  n5 --> n45
  n5 --> n52
  n6 --> n45
  n6 --> n52
  n7 --> n45
  n7 --> n52
  n8 --> n45
  n8 --> n52
  n9 --> n52
  n10 --> n45
  n10 --> n52
  n11 --> n45
  n11 --> n52
  n12 --> n45
  n12 --> n52
  n13 --> n45
  n13 --> n52
  n14 --> n45
  n14 --> n52
  n15 --> n45
  n15 --> n52
  n16 --> n45
  n16 --> n52
  n17 --> n45
  n17 --> n52
  n18 --> n45
  n18 --> n52
  n19 --> n45
  n19 --> n52
  n20 --> n45
  n20 --> n52
  n21 --> n45
  n21 --> n52
  n22 --> n45
  n22 --> n52
  n23 --> n45
  n23 --> n52
  n24 --> n45
  n24 --> n52
  n25 --> n45
  n25 --> n52
  n26 --> n45
  n26 --> n52
  n27 --> n45
  n28 --> n45
  n28 --> n52
  n29 --> n45
  n29 --> n52
  n30 --> n45
  n30 --> n52
  n31 --> n45
  n31 --> n52
  n32 --> n45
  n32 --> n52
  n33 --> n45
  n33 --> n52
  n34 --> n45
  n34 --> n52
  n35 --> n45
  n35 --> n52
  n36 --> n45
  n36 --> n52
  n37 --> n45
  n37 --> n52
  n38 --> n45
  n38 --> n52
  n39 --> n45
  n39 --> n52
  n40 --> n45
  n40 --> n52
  n41 --> n45
  n41 --> n52
  n42 --> n45
  n42 --> n52
  n43 --> n45
  n43 --> n52
  n44 --> n45
  n44 --> n52
  n46 --> n45
  n46 --> n52
  n47 --> n45
  n47 --> n52
  n48 --> n45
  n48 --> n52
  n49 --> n45
  n49 --> n52
  n50 --> n45
  n50 --> n52
  n51 --> n45
  n51 --> n52
  n53 --> n45
  n53 --> n52
  n54 --> n45
  n54 --> n52
  n55 --> n45
  n55 --> n52
  n56 --> n45
  n56 --> n52
  n57 --> n9
  n57 --> n45
  n57 --> n52
  n58 --> n45
  n58 --> n52
  n59 --> n45
  n59 --> n52
  n60 --> n45
  n60 --> n52
  n61 --> n45
  n61 --> n52
  n62 --> n45
  n62 --> n52
  n63 --> n45
  n63 --> n52
  n64 --> n45
  n64 --> n52
  n65 --> n45
  n65 --> n52
  n66 --> n45
  n66 --> n52
  n67 --> n45
  n67 --> n52
  n68 --> n45
  n68 --> n52
  n69 --> n45
  n69 --> n52
  n70 --> n45
  n70 --> n52
  n71 --> n45
  n71 --> n52
  n72 --> n45
  n72 --> n52
  n73 --> n45
  n74 --> n45
  n74 --> n52
  n75 --> n45
  n76 --> n45
  n76 --> n52
  n77 --> n45
  n79 --> n45
  n79 --> n52
  n80 --> n45
  n80 --> n52
  n81 --> n45
  n81 --> n52
  n82 --> n45
  n82 --> n52
  n83 --> n45
  n83 --> n52
  n84 --> n45
  n85 --> n45
  n85 --> n52
  n86 --> n45
  n86 --> n52
  n87 --> n45
  n87 --> n52
  n88 --> n45
  n88 --> n52
  n89 --> n45
  n89 --> n52
  n90 --> n45
  n90 --> n52
  n91 --> n45
  n91 --> n52
  n92 --> n45
  n92 --> n52
  n93 --> n45
  n93 --> n52
  n94 --> n45
  n94 --> n52
  n95 --> n45
  n95 --> n52
```
