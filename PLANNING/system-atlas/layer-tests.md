# tests module dependencies

Source-level imports; isolated files appear without arrows.

```mermaid
flowchart LR
  n0["tests/aiinsights.test.mjs"]
  n1["tests/aispike.test.mjs"]
  n2["tests/alertroute.test.mjs"]
  n3["tests/ask.test.mjs"]
  n4["tests/aura.test.mjs"]
  n5["tests/avatarcard.test.mjs"]
  n6["tests/awards.test.mjs"]
  n7["tests/badges.test.mjs"]
  n8["tests/bot.test.mjs"]
  n9["tests/botcommands.test.mjs"]
  n10["tests/botfeat-sample.mjs"]
  n11["tests/builder.test.mjs"]
  n12["tests/builds.test.mjs"]
  n13["tests/burners-api.test.mjs"]
  n14["tests/burners.test.mjs"]
  n15["tests/cardstudio.test.mjs"]
  n16["tests/chat.test.mjs"]
  n17["tests/clublookup.test.mjs"]
  n18["tests/crawl.test.mjs"]
  n19["tests/d1usage.test.mjs"]
  n20["tests/design.test.mjs"]
  n21["tests/discord.test.mjs"]
  n22["tests/discoveries.test.mjs"]
  n23["tests/docs.test.mjs"]
  n24["tests/drilldown.test.mjs"]
  n25["tests/dugout.test.mjs"]
  n26["tests/events-ui.test.mjs"]
  n27["tests/events.test.mjs"]
  n28["tests/extradata.test.mjs"]
  n29["tests/faces-api.test.mjs"]
  n30["tests/feed.test.mjs"]
  n31["tests/feedbackroom.test.mjs"]
  n32["tests/flags.test.mjs"]
  n33["tests/fun.test.mjs"]
  n34["tests/game.test.mjs"]
  n35["tests/honours.test.mjs"]
  n36["tests/host.test.mjs"]
  n37["tests/hub.test.mjs"]
  n38["tests/hublive.test.mjs"]
  n39["tests/hype.test.mjs"]
  n40["tests/insights.test.mjs"]
  n41["tests/insightwidget.test.mjs"]
  n42["tests/intel.test.mjs"]
  n43["tests/issues.test.mjs"]
  n44["tests/issuesrec.test.mjs"]
  n45["tests/issuessync.test.mjs"]
  n46["tests/lib.mjs"]
  n47["tests/lineuprec.test.mjs"]
  n48["tests/live.test.mjs"]
  n49["tests/locker.test.mjs"]
  n50["tests/media.test.mjs"]
  n51["tests/memberlive.test.mjs"]
  n52["tests/members.test.mjs"]
  n53["tests/mock.mjs"]
  n54["tests/moderation.test.mjs"]
  n55["tests/monitor.test.mjs"]
  n56["tests/next-quality.test.mjs"]
  n57["tests/next-runtime.test.mjs"]
  n58["tests/next.test.mjs"]
  n59["tests/notifcenter.test.mjs"]
  n60["tests/notify.test.mjs"]
  n61["tests/packs.test.mjs"]
  n62["tests/panel.test.mjs"]
  n63["tests/phonefix.test.mjs"]
  n64["tests/playmedia.test.mjs"]
  n65["tests/plays.test.mjs"]
  n66["tests/points.test.mjs"]
  n67["tests/polish.test.mjs"]
  n68["tests/prefs.test.mjs"]
  n69["tests/probuilds.test.mjs"]
  n70["tests/profanity.test.mjs"]
  n71["tests/profiles.test.mjs"]
  n72["tests/push.test.mjs"]
  n73["tests/pwa.test.mjs"]
  n74["tests/quickcommands.test.mjs"]
  n75["tests/rankings.test.mjs"]
  n76["tests/recorder.test.mjs"]
  n77["tests/redirects.test.mjs"]
  n78["tests/reminders.test.mjs"]
  n79["tests/resultpost.test.mjs"]
  n80["tests/run.mjs"]
  n81["tests/rush.test.mjs"]
  n82["tests/servertools.test.mjs"]
  n83["tests/site.test.mjs"]
  n84["tests/social.test.mjs"]
  n85["tests/squads.test.mjs"]
  n86["tests/stars.test.mjs"]
  n87["tests/statinsights.test.mjs"]
  n88["tests/streamalerts.test.mjs"]
  n89["tests/studio.test.mjs"]
  n90["tests/submissions.test.mjs"]
  n91["tests/tagline.test.mjs"]
  n92["tests/trials.test.mjs"]
  n93["tests/updates.test.mjs"]
  n94["tests/voicerecap.test.mjs"]
  n95["tests/watchlist.test.mjs"]
  n96["tests/wave10.test.mjs"]
  n97["tests/wave11.test.mjs"]
  n98["tests/wave8.test.mjs"]
  n0 --> n46
  n0 --> n53
  n1 --> n46
  n1 --> n53
  n2 --> n46
  n2 --> n53
  n3 --> n46
  n4 --> n46
  n4 --> n53
  n5 --> n46
  n5 --> n53
  n6 --> n46
  n6 --> n53
  n7 --> n46
  n7 --> n53
  n8 --> n46
  n8 --> n53
  n9 --> n46
  n9 --> n53
  n10 --> n53
  n11 --> n46
  n11 --> n53
  n12 --> n46
  n12 --> n53
  n13 --> n46
  n13 --> n53
  n14 --> n46
  n14 --> n53
  n15 --> n46
  n15 --> n53
  n16 --> n46
  n16 --> n53
  n17 --> n46
  n17 --> n53
  n18 --> n46
  n18 --> n53
  n19 --> n46
  n19 --> n53
  n20 --> n46
  n20 --> n53
  n21 --> n46
  n21 --> n53
  n22 --> n46
  n22 --> n53
  n23 --> n46
  n23 --> n53
  n24 --> n46
  n24 --> n53
  n25 --> n46
  n25 --> n53
  n26 --> n46
  n26 --> n53
  n27 --> n46
  n27 --> n53
  n28 --> n46
  n29 --> n46
  n29 --> n53
  n30 --> n46
  n30 --> n53
  n31 --> n46
  n31 --> n53
  n32 --> n46
  n32 --> n53
  n33 --> n46
  n33 --> n53
  n34 --> n46
  n34 --> n53
  n35 --> n46
  n35 --> n53
  n36 --> n46
  n36 --> n53
  n37 --> n46
  n37 --> n53
  n38 --> n46
  n38 --> n53
  n39 --> n46
  n39 --> n53
  n40 --> n46
  n40 --> n53
  n41 --> n46
  n41 --> n53
  n42 --> n46
  n42 --> n53
  n43 --> n46
  n43 --> n53
  n44 --> n46
  n44 --> n53
  n45 --> n46
  n45 --> n53
  n47 --> n46
  n47 --> n53
  n48 --> n46
  n48 --> n53
  n49 --> n46
  n49 --> n53
  n50 --> n46
  n50 --> n53
  n51 --> n46
  n51 --> n53
  n52 --> n46
  n52 --> n53
  n54 --> n46
  n54 --> n53
  n55 --> n46
  n55 --> n53
  n56 --> n46
  n56 --> n53
  n57 --> n46
  n57 --> n53
  n58 --> n10
  n58 --> n46
  n58 --> n53
  n59 --> n46
  n59 --> n53
  n60 --> n46
  n60 --> n53
  n61 --> n46
  n61 --> n53
  n62 --> n46
  n62 --> n53
  n63 --> n46
  n63 --> n53
  n64 --> n46
  n64 --> n53
  n65 --> n46
  n65 --> n53
  n66 --> n46
  n66 --> n53
  n67 --> n46
  n67 --> n53
  n68 --> n46
  n68 --> n53
  n69 --> n46
  n69 --> n53
  n70 --> n46
  n70 --> n53
  n71 --> n46
  n71 --> n53
  n72 --> n46
  n72 --> n53
  n73 --> n46
  n73 --> n53
  n74 --> n46
  n74 --> n53
  n75 --> n46
  n76 --> n46
  n76 --> n53
  n77 --> n46
  n78 --> n46
  n78 --> n53
  n79 --> n46
  n81 --> n46
  n81 --> n53
  n82 --> n46
  n82 --> n53
  n83 --> n46
  n83 --> n53
  n84 --> n46
  n84 --> n53
  n85 --> n46
  n85 --> n53
  n86 --> n46
  n87 --> n46
  n87 --> n53
  n88 --> n46
  n88 --> n53
  n89 --> n46
  n89 --> n53
  n90 --> n46
  n90 --> n53
  n91 --> n46
  n91 --> n53
  n92 --> n46
  n92 --> n53
  n93 --> n46
  n93 --> n53
  n94 --> n46
  n94 --> n53
  n95 --> n46
  n95 --> n53
  n96 --> n46
  n96 --> n53
  n97 --> n46
  n97 --> n53
  n98 --> n46
  n98 --> n53
```
