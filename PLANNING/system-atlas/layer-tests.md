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
  n51["tests/matchpicture.test.mjs"]
  n52["tests/matchreview.test.mjs"]
  n53["tests/media.test.mjs"]
  n54["tests/memberlive.test.mjs"]
  n55["tests/members.test.mjs"]
  n56["tests/mock.mjs"]
  n57["tests/moderation.test.mjs"]
  n58["tests/monitor.test.mjs"]
  n59["tests/next-quality.test.mjs"]
  n60["tests/next-runtime.test.mjs"]
  n61["tests/next.test.mjs"]
  n62["tests/notifcenter.test.mjs"]
  n63["tests/notify.test.mjs"]
  n64["tests/packs.test.mjs"]
  n65["tests/panel.test.mjs"]
  n66["tests/phonefix.test.mjs"]
  n67["tests/playmedia.test.mjs"]
  n68["tests/plays.test.mjs"]
  n69["tests/points.test.mjs"]
  n70["tests/polish.test.mjs"]
  n71["tests/prefs.test.mjs"]
  n72["tests/probuilds.test.mjs"]
  n73["tests/profanity.test.mjs"]
  n74["tests/profiles.test.mjs"]
  n75["tests/push.test.mjs"]
  n76["tests/pwa.test.mjs"]
  n77["tests/quickcommands.test.mjs"]
  n78["tests/rankings.test.mjs"]
  n79["tests/recorder.test.mjs"]
  n80["tests/redirects.test.mjs"]
  n81["tests/reminders.test.mjs"]
  n82["tests/resultpost.test.mjs"]
  n83["tests/run.mjs"]
  n84["tests/rush.test.mjs"]
  n85["tests/servertools.test.mjs"]
  n86["tests/site.test.mjs"]
  n87["tests/social.test.mjs"]
  n88["tests/squads.test.mjs"]
  n89["tests/stars.test.mjs"]
  n90["tests/statinsights.test.mjs"]
  n91["tests/streamalerts.test.mjs"]
  n92["tests/studio.test.mjs"]
  n93["tests/submissions.test.mjs"]
  n94["tests/tagline.test.mjs"]
  n95["tests/trials.test.mjs"]
  n96["tests/updates.test.mjs"]
  n97["tests/voicerecap.test.mjs"]
  n98["tests/watchlist.test.mjs"]
  n99["tests/wave10.test.mjs"]
  n100["tests/wave11.test.mjs"]
  n101["tests/wave8.test.mjs"]
  n0 --> n47
  n0 --> n56
  n1 --> n47
  n1 --> n56
  n2 --> n47
  n2 --> n56
  n3 --> n47
  n4 --> n47
  n4 --> n56
  n5 --> n47
  n5 --> n56
  n6 --> n47
  n6 --> n56
  n7 --> n47
  n7 --> n56
  n8 --> n47
  n8 --> n56
  n9 --> n47
  n9 --> n56
  n10 --> n56
  n11 --> n47
  n11 --> n56
  n12 --> n47
  n12 --> n56
  n13 --> n47
  n13 --> n56
  n14 --> n47
  n14 --> n56
  n15 --> n47
  n15 --> n56
  n16 --> n47
  n16 --> n56
  n17 --> n47
  n17 --> n56
  n18 --> n47
  n18 --> n56
  n19 --> n47
  n19 --> n56
  n20 --> n47
  n20 --> n56
  n21 --> n47
  n21 --> n56
  n22 --> n47
  n22 --> n56
  n23 --> n47
  n23 --> n56
  n24 --> n47
  n24 --> n56
  n25 --> n47
  n25 --> n56
  n26 --> n47
  n26 --> n56
  n27 --> n47
  n27 --> n56
  n28 --> n47
  n28 --> n56
  n29 --> n47
  n30 --> n47
  n30 --> n56
  n31 --> n47
  n31 --> n56
  n32 --> n47
  n32 --> n56
  n33 --> n47
  n33 --> n56
  n34 --> n47
  n34 --> n56
  n35 --> n47
  n35 --> n56
  n36 --> n47
  n36 --> n56
  n37 --> n47
  n37 --> n56
  n38 --> n47
  n38 --> n56
  n39 --> n47
  n39 --> n56
  n40 --> n47
  n40 --> n56
  n41 --> n47
  n41 --> n56
  n42 --> n47
  n42 --> n56
  n43 --> n47
  n43 --> n56
  n44 --> n47
  n44 --> n56
  n45 --> n47
  n45 --> n56
  n46 --> n47
  n46 --> n56
  n48 --> n47
  n48 --> n56
  n49 --> n47
  n49 --> n56
  n50 --> n47
  n50 --> n56
  n51 --> n47
  n51 --> n56
  n52 --> n47
  n53 --> n47
  n53 --> n56
  n54 --> n47
  n54 --> n56
  n55 --> n47
  n55 --> n56
  n57 --> n47
  n57 --> n56
  n58 --> n47
  n58 --> n56
  n59 --> n47
  n59 --> n56
  n60 --> n47
  n60 --> n56
  n61 --> n10
  n61 --> n47
  n61 --> n56
  n62 --> n47
  n62 --> n56
  n63 --> n47
  n63 --> n56
  n64 --> n47
  n64 --> n56
  n65 --> n47
  n65 --> n56
  n66 --> n47
  n66 --> n56
  n67 --> n47
  n67 --> n56
  n68 --> n47
  n68 --> n56
  n69 --> n47
  n69 --> n56
  n70 --> n47
  n70 --> n56
  n71 --> n47
  n71 --> n56
  n72 --> n47
  n72 --> n56
  n73 --> n47
  n73 --> n56
  n74 --> n47
  n74 --> n56
  n75 --> n47
  n75 --> n56
  n76 --> n47
  n76 --> n56
  n77 --> n47
  n77 --> n56
  n78 --> n47
  n79 --> n47
  n79 --> n56
  n80 --> n47
  n81 --> n47
  n81 --> n56
  n82 --> n47
  n84 --> n47
  n84 --> n56
  n85 --> n47
  n85 --> n56
  n86 --> n47
  n86 --> n56
  n87 --> n47
  n87 --> n56
  n88 --> n47
  n88 --> n56
  n89 --> n47
  n90 --> n47
  n90 --> n56
  n91 --> n47
  n91 --> n56
  n92 --> n47
  n92 --> n56
  n93 --> n47
  n93 --> n56
  n94 --> n47
  n94 --> n56
  n95 --> n47
  n95 --> n56
  n96 --> n47
  n96 --> n56
  n97 --> n47
  n97 --> n56
  n98 --> n47
  n98 --> n56
  n99 --> n47
  n99 --> n56
  n100 --> n47
  n100 --> n56
  n101 --> n47
  n101 --> n56
```
