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
  n27["tests/eventdecode.test.mjs"]
  n28["tests/events-ui.test.mjs"]
  n29["tests/events.test.mjs"]
  n30["tests/extradata.test.mjs"]
  n31["tests/faces-api.test.mjs"]
  n32["tests/feed.test.mjs"]
  n33["tests/feedbackroom.test.mjs"]
  n34["tests/flags.test.mjs"]
  n35["tests/fun.test.mjs"]
  n36["tests/game.test.mjs"]
  n37["tests/honours.test.mjs"]
  n38["tests/host.test.mjs"]
  n39["tests/hub.test.mjs"]
  n40["tests/hublive.test.mjs"]
  n41["tests/hype.test.mjs"]
  n42["tests/insights.test.mjs"]
  n43["tests/insightwidget.test.mjs"]
  n44["tests/intel.test.mjs"]
  n45["tests/issues.test.mjs"]
  n46["tests/issuesrec.test.mjs"]
  n47["tests/issuessync.test.mjs"]
  n48["tests/lib.mjs"]
  n49["tests/lineuprec.test.mjs"]
  n50["tests/live.test.mjs"]
  n51["tests/locker.test.mjs"]
  n52["tests/matchintel.test.mjs"]
  n53["tests/matchpicture.test.mjs"]
  n54["tests/matchreview.test.mjs"]
  n55["tests/media.test.mjs"]
  n56["tests/memberlive.test.mjs"]
  n57["tests/members.test.mjs"]
  n58["tests/mock.mjs"]
  n59["tests/moderation.test.mjs"]
  n60["tests/monitor.test.mjs"]
  n61["tests/next-quality.test.mjs"]
  n62["tests/next-runtime.test.mjs"]
  n63["tests/next.test.mjs"]
  n64["tests/notifcenter.test.mjs"]
  n65["tests/notify.test.mjs"]
  n66["tests/packs.test.mjs"]
  n67["tests/panel.test.mjs"]
  n68["tests/phonefix.test.mjs"]
  n69["tests/playmedia.test.mjs"]
  n70["tests/plays.test.mjs"]
  n71["tests/points.test.mjs"]
  n72["tests/polish.test.mjs"]
  n73["tests/prefs.test.mjs"]
  n74["tests/probuilds.test.mjs"]
  n75["tests/profanity.test.mjs"]
  n76["tests/profiles.test.mjs"]
  n77["tests/push.test.mjs"]
  n78["tests/pwa.test.mjs"]
  n79["tests/quickcommands.test.mjs"]
  n80["tests/rankings.test.mjs"]
  n81["tests/recorder.test.mjs"]
  n82["tests/redirects.test.mjs"]
  n83["tests/reminders.test.mjs"]
  n84["tests/resultpost.test.mjs"]
  n85["tests/rosterpic.test.mjs"]
  n86["tests/run.mjs"]
  n87["tests/rush.test.mjs"]
  n88["tests/servertools.test.mjs"]
  n89["tests/site.test.mjs"]
  n90["tests/social.test.mjs"]
  n91["tests/squads.test.mjs"]
  n92["tests/stars.test.mjs"]
  n93["tests/statinsights.test.mjs"]
  n94["tests/streamalerts.test.mjs"]
  n95["tests/studio.test.mjs"]
  n96["tests/submissions.test.mjs"]
  n97["tests/tagline.test.mjs"]
  n98["tests/trials.test.mjs"]
  n99["tests/updates.test.mjs"]
  n100["tests/voicerecap.test.mjs"]
  n101["tests/watchlist.test.mjs"]
  n102["tests/wave10.test.mjs"]
  n103["tests/wave11.test.mjs"]
  n104["tests/wave8.test.mjs"]
  n0 --> n48
  n0 --> n58
  n1 --> n48
  n1 --> n58
  n2 --> n48
  n2 --> n58
  n3 --> n48
  n4 --> n48
  n4 --> n58
  n5 --> n48
  n5 --> n58
  n6 --> n48
  n6 --> n58
  n7 --> n48
  n7 --> n58
  n8 --> n48
  n8 --> n58
  n9 --> n48
  n9 --> n58
  n10 --> n58
  n11 --> n48
  n11 --> n58
  n12 --> n48
  n12 --> n58
  n13 --> n48
  n13 --> n58
  n14 --> n48
  n14 --> n58
  n15 --> n48
  n15 --> n58
  n16 --> n48
  n16 --> n58
  n17 --> n48
  n17 --> n58
  n18 --> n48
  n18 --> n58
  n19 --> n48
  n19 --> n58
  n20 --> n48
  n20 --> n58
  n21 --> n48
  n21 --> n58
  n22 --> n48
  n22 --> n58
  n23 --> n48
  n23 --> n58
  n24 --> n48
  n24 --> n58
  n25 --> n48
  n25 --> n58
  n26 --> n48
  n26 --> n58
  n27 --> n48
  n28 --> n48
  n28 --> n58
  n29 --> n48
  n29 --> n58
  n30 --> n48
  n31 --> n48
  n31 --> n58
  n32 --> n48
  n32 --> n58
  n33 --> n48
  n33 --> n58
  n34 --> n48
  n34 --> n58
  n35 --> n48
  n35 --> n58
  n36 --> n48
  n36 --> n58
  n37 --> n48
  n37 --> n58
  n38 --> n48
  n38 --> n58
  n39 --> n48
  n39 --> n58
  n40 --> n48
  n40 --> n58
  n41 --> n48
  n41 --> n58
  n42 --> n48
  n42 --> n58
  n43 --> n48
  n43 --> n58
  n44 --> n48
  n44 --> n58
  n45 --> n48
  n45 --> n58
  n46 --> n48
  n46 --> n58
  n47 --> n48
  n47 --> n58
  n49 --> n48
  n49 --> n58
  n50 --> n48
  n50 --> n58
  n51 --> n48
  n51 --> n58
  n52 --> n48
  n53 --> n48
  n53 --> n58
  n54 --> n48
  n55 --> n48
  n55 --> n58
  n56 --> n48
  n56 --> n58
  n57 --> n48
  n57 --> n58
  n59 --> n48
  n59 --> n58
  n60 --> n48
  n60 --> n58
  n61 --> n48
  n61 --> n58
  n62 --> n48
  n62 --> n58
  n63 --> n10
  n63 --> n48
  n63 --> n58
  n64 --> n48
  n64 --> n58
  n65 --> n48
  n65 --> n58
  n66 --> n48
  n66 --> n58
  n67 --> n48
  n67 --> n58
  n68 --> n48
  n68 --> n58
  n69 --> n48
  n69 --> n58
  n70 --> n48
  n70 --> n58
  n71 --> n48
  n71 --> n58
  n72 --> n48
  n72 --> n58
  n73 --> n48
  n73 --> n58
  n74 --> n48
  n74 --> n58
  n75 --> n48
  n75 --> n58
  n76 --> n48
  n76 --> n58
  n77 --> n48
  n77 --> n58
  n78 --> n48
  n78 --> n58
  n79 --> n48
  n79 --> n58
  n80 --> n48
  n81 --> n48
  n81 --> n58
  n82 --> n48
  n83 --> n48
  n83 --> n58
  n84 --> n48
  n85 --> n48
  n85 --> n58
  n87 --> n48
  n87 --> n58
  n88 --> n48
  n88 --> n58
  n89 --> n48
  n89 --> n58
  n90 --> n48
  n90 --> n58
  n91 --> n48
  n91 --> n58
  n92 --> n48
  n93 --> n48
  n93 --> n58
  n94 --> n48
  n94 --> n58
  n95 --> n48
  n95 --> n58
  n96 --> n48
  n96 --> n58
  n97 --> n48
  n97 --> n58
  n98 --> n48
  n98 --> n58
  n99 --> n48
  n99 --> n58
  n100 --> n48
  n100 --> n58
  n101 --> n48
  n101 --> n58
  n102 --> n48
  n102 --> n58
  n103 --> n48
  n103 --> n58
  n104 --> n48
  n104 --> n58
```
