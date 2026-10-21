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
  n51["tests/media.test.mjs"]
  n52["tests/memberlive.test.mjs"]
  n53["tests/members.test.mjs"]
  n54["tests/mock.mjs"]
  n55["tests/moderation.test.mjs"]
  n56["tests/monitor.test.mjs"]
  n57["tests/next-quality.test.mjs"]
  n58["tests/next-runtime.test.mjs"]
  n59["tests/next.test.mjs"]
  n60["tests/notifcenter.test.mjs"]
  n61["tests/notify.test.mjs"]
  n62["tests/packs.test.mjs"]
  n63["tests/panel.test.mjs"]
  n64["tests/phonefix.test.mjs"]
  n65["tests/playmedia.test.mjs"]
  n66["tests/plays.test.mjs"]
  n67["tests/points.test.mjs"]
  n68["tests/polish.test.mjs"]
  n69["tests/prefs.test.mjs"]
  n70["tests/probuilds.test.mjs"]
  n71["tests/profanity.test.mjs"]
  n72["tests/profiles.test.mjs"]
  n73["tests/push.test.mjs"]
  n74["tests/pwa.test.mjs"]
  n75["tests/quickcommands.test.mjs"]
  n76["tests/rankings.test.mjs"]
  n77["tests/recorder.test.mjs"]
  n78["tests/redirects.test.mjs"]
  n79["tests/reminders.test.mjs"]
  n80["tests/resultpost.test.mjs"]
  n81["tests/run.mjs"]
  n82["tests/rush.test.mjs"]
  n83["tests/servertools.test.mjs"]
  n84["tests/site.test.mjs"]
  n85["tests/social.test.mjs"]
  n86["tests/squads.test.mjs"]
  n87["tests/stars.test.mjs"]
  n88["tests/statinsights.test.mjs"]
  n89["tests/streamalerts.test.mjs"]
  n90["tests/studio.test.mjs"]
  n91["tests/submissions.test.mjs"]
  n92["tests/tagline.test.mjs"]
  n93["tests/trials.test.mjs"]
  n94["tests/updates.test.mjs"]
  n95["tests/voicerecap.test.mjs"]
  n96["tests/watchlist.test.mjs"]
  n97["tests/wave10.test.mjs"]
  n98["tests/wave11.test.mjs"]
  n99["tests/wave8.test.mjs"]
  n0 --> n47
  n0 --> n54
  n1 --> n47
  n1 --> n54
  n2 --> n47
  n2 --> n54
  n3 --> n47
  n4 --> n47
  n4 --> n54
  n5 --> n47
  n5 --> n54
  n6 --> n47
  n6 --> n54
  n7 --> n47
  n7 --> n54
  n8 --> n47
  n8 --> n54
  n9 --> n47
  n9 --> n54
  n10 --> n54
  n11 --> n47
  n11 --> n54
  n12 --> n47
  n12 --> n54
  n13 --> n47
  n13 --> n54
  n14 --> n47
  n14 --> n54
  n15 --> n47
  n15 --> n54
  n16 --> n47
  n16 --> n54
  n17 --> n47
  n17 --> n54
  n18 --> n47
  n18 --> n54
  n19 --> n47
  n19 --> n54
  n20 --> n47
  n20 --> n54
  n21 --> n47
  n21 --> n54
  n22 --> n47
  n22 --> n54
  n23 --> n47
  n23 --> n54
  n24 --> n47
  n24 --> n54
  n25 --> n47
  n25 --> n54
  n26 --> n47
  n26 --> n54
  n27 --> n47
  n27 --> n54
  n28 --> n47
  n28 --> n54
  n29 --> n47
  n30 --> n47
  n30 --> n54
  n31 --> n47
  n31 --> n54
  n32 --> n47
  n32 --> n54
  n33 --> n47
  n33 --> n54
  n34 --> n47
  n34 --> n54
  n35 --> n47
  n35 --> n54
  n36 --> n47
  n36 --> n54
  n37 --> n47
  n37 --> n54
  n38 --> n47
  n38 --> n54
  n39 --> n47
  n39 --> n54
  n40 --> n47
  n40 --> n54
  n41 --> n47
  n41 --> n54
  n42 --> n47
  n42 --> n54
  n43 --> n47
  n43 --> n54
  n44 --> n47
  n44 --> n54
  n45 --> n47
  n45 --> n54
  n46 --> n47
  n46 --> n54
  n48 --> n47
  n48 --> n54
  n49 --> n47
  n49 --> n54
  n50 --> n47
  n50 --> n54
  n51 --> n47
  n51 --> n54
  n52 --> n47
  n52 --> n54
  n53 --> n47
  n53 --> n54
  n55 --> n47
  n55 --> n54
  n56 --> n47
  n56 --> n54
  n57 --> n47
  n57 --> n54
  n58 --> n47
  n58 --> n54
  n59 --> n10
  n59 --> n47
  n59 --> n54
  n60 --> n47
  n60 --> n54
  n61 --> n47
  n61 --> n54
  n62 --> n47
  n62 --> n54
  n63 --> n47
  n63 --> n54
  n64 --> n47
  n64 --> n54
  n65 --> n47
  n65 --> n54
  n66 --> n47
  n66 --> n54
  n67 --> n47
  n67 --> n54
  n68 --> n47
  n68 --> n54
  n69 --> n47
  n69 --> n54
  n70 --> n47
  n70 --> n54
  n71 --> n47
  n71 --> n54
  n72 --> n47
  n72 --> n54
  n73 --> n47
  n73 --> n54
  n74 --> n47
  n74 --> n54
  n75 --> n47
  n75 --> n54
  n76 --> n47
  n77 --> n47
  n77 --> n54
  n78 --> n47
  n79 --> n47
  n79 --> n54
  n80 --> n47
  n82 --> n47
  n82 --> n54
  n83 --> n47
  n83 --> n54
  n84 --> n47
  n84 --> n54
  n85 --> n47
  n85 --> n54
  n86 --> n47
  n86 --> n54
  n87 --> n47
  n88 --> n47
  n88 --> n54
  n89 --> n47
  n89 --> n54
  n90 --> n47
  n90 --> n54
  n91 --> n47
  n91 --> n54
  n92 --> n47
  n92 --> n54
  n93 --> n47
  n93 --> n54
  n94 --> n47
  n94 --> n54
  n95 --> n47
  n95 --> n54
  n96 --> n47
  n96 --> n54
  n97 --> n47
  n97 --> n54
  n98 --> n47
  n98 --> n54
  n99 --> n47
  n99 --> n54
```
