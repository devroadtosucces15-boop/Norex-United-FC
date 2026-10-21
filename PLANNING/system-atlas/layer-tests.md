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
  n17["tests/checkin.test.mjs"]
  n18["tests/clublookup.test.mjs"]
  n19["tests/crawl.test.mjs"]
  n20["tests/d1usage.test.mjs"]
  n21["tests/design.test.mjs"]
  n22["tests/discord.test.mjs"]
  n23["tests/discoveries.test.mjs"]
  n24["tests/docs.test.mjs"]
  n25["tests/drilldown.test.mjs"]
  n26["tests/dugout.test.mjs"]
  n27["tests/events-ui.test.mjs"]
  n28["tests/events.test.mjs"]
  n29["tests/extradata.test.mjs"]
  n30["tests/faces-api.test.mjs"]
  n31["tests/feed.test.mjs"]
  n32["tests/feedbackroom.test.mjs"]
  n33["tests/flags.test.mjs"]
  n34["tests/fun.test.mjs"]
  n35["tests/game.test.mjs"]
  n36["tests/honours.test.mjs"]
  n37["tests/host.test.mjs"]
  n38["tests/hub.test.mjs"]
  n39["tests/hublive.test.mjs"]
  n40["tests/hype.test.mjs"]
  n41["tests/insights.test.mjs"]
  n42["tests/insightwidget.test.mjs"]
  n43["tests/intel.test.mjs"]
  n44["tests/issues.test.mjs"]
  n45["tests/issuesrec.test.mjs"]
  n46["tests/issuessync.test.mjs"]
  n47["tests/lib.mjs"]
  n48["tests/lineuprec.test.mjs"]
  n49["tests/live.test.mjs"]
  n50["tests/locker.test.mjs"]
  n51["tests/matchreview.test.mjs"]
  n52["tests/media.test.mjs"]
  n53["tests/memberlive.test.mjs"]
  n54["tests/members.test.mjs"]
  n55["tests/mock.mjs"]
  n56["tests/moderation.test.mjs"]
  n57["tests/monitor.test.mjs"]
  n58["tests/next-quality.test.mjs"]
  n59["tests/next-runtime.test.mjs"]
  n60["tests/next.test.mjs"]
  n61["tests/notifcenter.test.mjs"]
  n62["tests/notify.test.mjs"]
  n63["tests/packs.test.mjs"]
  n64["tests/panel.test.mjs"]
  n65["tests/phonefix.test.mjs"]
  n66["tests/playmedia.test.mjs"]
  n67["tests/plays.test.mjs"]
  n68["tests/points.test.mjs"]
  n69["tests/polish.test.mjs"]
  n70["tests/prefs.test.mjs"]
  n71["tests/probuilds.test.mjs"]
  n72["tests/profanity.test.mjs"]
  n73["tests/profiles.test.mjs"]
  n74["tests/push.test.mjs"]
  n75["tests/pwa.test.mjs"]
  n76["tests/quickcommands.test.mjs"]
  n77["tests/rankings.test.mjs"]
  n78["tests/recorder.test.mjs"]
  n79["tests/redirects.test.mjs"]
  n80["tests/reminders.test.mjs"]
  n81["tests/resultpost.test.mjs"]
  n82["tests/run.mjs"]
  n83["tests/rush.test.mjs"]
  n84["tests/servertools.test.mjs"]
  n85["tests/site.test.mjs"]
  n86["tests/social.test.mjs"]
  n87["tests/squads.test.mjs"]
  n88["tests/stars.test.mjs"]
  n89["tests/statinsights.test.mjs"]
  n90["tests/streamalerts.test.mjs"]
  n91["tests/studio.test.mjs"]
  n92["tests/submissions.test.mjs"]
  n93["tests/tagline.test.mjs"]
  n94["tests/trials.test.mjs"]
  n95["tests/updates.test.mjs"]
  n96["tests/voicerecap.test.mjs"]
  n97["tests/watchlist.test.mjs"]
  n98["tests/wave10.test.mjs"]
  n99["tests/wave11.test.mjs"]
  n100["tests/wave8.test.mjs"]
  n0 --> n47
  n0 --> n55
  n1 --> n47
  n1 --> n55
  n2 --> n47
  n2 --> n55
  n3 --> n47
  n4 --> n47
  n4 --> n55
  n5 --> n47
  n5 --> n55
  n6 --> n47
  n6 --> n55
  n7 --> n47
  n7 --> n55
  n8 --> n47
  n8 --> n55
  n9 --> n47
  n9 --> n55
  n10 --> n55
  n11 --> n47
  n11 --> n55
  n12 --> n47
  n12 --> n55
  n13 --> n47
  n13 --> n55
  n14 --> n47
  n14 --> n55
  n15 --> n47
  n15 --> n55
  n16 --> n47
  n16 --> n55
  n17 --> n47
  n17 --> n55
  n18 --> n47
  n18 --> n55
  n19 --> n47
  n19 --> n55
  n20 --> n47
  n20 --> n55
  n21 --> n47
  n21 --> n55
  n22 --> n47
  n22 --> n55
  n23 --> n47
  n23 --> n55
  n24 --> n47
  n24 --> n55
  n25 --> n47
  n25 --> n55
  n26 --> n47
  n26 --> n55
  n27 --> n47
  n27 --> n55
  n28 --> n47
  n28 --> n55
  n29 --> n47
  n30 --> n47
  n30 --> n55
  n31 --> n47
  n31 --> n55
  n32 --> n47
  n32 --> n55
  n33 --> n47
  n33 --> n55
  n34 --> n47
  n34 --> n55
  n35 --> n47
  n35 --> n55
  n36 --> n47
  n36 --> n55
  n37 --> n47
  n37 --> n55
  n38 --> n47
  n38 --> n55
  n39 --> n47
  n39 --> n55
  n40 --> n47
  n40 --> n55
  n41 --> n47
  n41 --> n55
  n42 --> n47
  n42 --> n55
  n43 --> n47
  n43 --> n55
  n44 --> n47
  n44 --> n55
  n45 --> n47
  n45 --> n55
  n46 --> n47
  n46 --> n55
  n48 --> n47
  n48 --> n55
  n49 --> n47
  n49 --> n55
  n50 --> n47
  n50 --> n55
  n51 --> n47
  n52 --> n47
  n52 --> n55
  n53 --> n47
  n53 --> n55
  n54 --> n47
  n54 --> n55
  n56 --> n47
  n56 --> n55
  n57 --> n47
  n57 --> n55
  n58 --> n47
  n58 --> n55
  n59 --> n47
  n59 --> n55
  n60 --> n10
  n60 --> n47
  n60 --> n55
  n61 --> n47
  n61 --> n55
  n62 --> n47
  n62 --> n55
  n63 --> n47
  n63 --> n55
  n64 --> n47
  n64 --> n55
  n65 --> n47
  n65 --> n55
  n66 --> n47
  n66 --> n55
  n67 --> n47
  n67 --> n55
  n68 --> n47
  n68 --> n55
  n69 --> n47
  n69 --> n55
  n70 --> n47
  n70 --> n55
  n71 --> n47
  n71 --> n55
  n72 --> n47
  n72 --> n55
  n73 --> n47
  n73 --> n55
  n74 --> n47
  n74 --> n55
  n75 --> n47
  n75 --> n55
  n76 --> n47
  n76 --> n55
  n77 --> n47
  n78 --> n47
  n78 --> n55
  n79 --> n47
  n80 --> n47
  n80 --> n55
  n81 --> n47
  n83 --> n47
  n83 --> n55
  n84 --> n47
  n84 --> n55
  n85 --> n47
  n85 --> n55
  n86 --> n47
  n86 --> n55
  n87 --> n47
  n87 --> n55
  n88 --> n47
  n89 --> n47
  n89 --> n55
  n90 --> n47
  n90 --> n55
  n91 --> n47
  n91 --> n55
  n92 --> n47
  n92 --> n55
  n93 --> n47
  n93 --> n55
  n94 --> n47
  n94 --> n55
  n95 --> n47
  n95 --> n55
  n96 --> n47
  n96 --> n55
  n97 --> n47
  n97 --> n55
  n98 --> n47
  n98 --> n55
  n99 --> n47
  n99 --> n55
  n100 --> n47
  n100 --> n55
```
