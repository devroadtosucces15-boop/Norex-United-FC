# bot module dependencies

Source-level imports; isolated files appear without arrows.

```mermaid
flowchart LR
  n0["bot/aiinsights.js"]
  n1["bot/aispike.js"]
  n2["bot/ask.js"]
  n3["bot/avatarcard.js"]
  n4["bot/awards.js"]
  n5["bot/badges.js"]
  n6["bot/botcmds.js"]
  n7["bot/botcommands.js"]
  n8["bot/builds.js"]
  n9["bot/burners.js"]
  n10["bot/burnerstats.js"]
  n11["bot/cardstudio.js"]
  n12["bot/chat.js"]
  n13["bot/chatroom.js"]
  n14["bot/clublookup.js"]
  n15["bot/clubroom.js"]
  n16["bot/commanddefs.js"]
  n17["bot/crawl.js"]
  n18["bot/discordroles.js"]
  n19["bot/docs.js"]
  n20["bot/ensure-resources.mjs"]
  n21["bot/events.js"]
  n22["bot/exportcontent.js"]
  n23["bot/feed.js"]
  n24["bot/feedback.js"]
  n25["bot/game.js"]
  n26["bot/health.js"]
  n27["bot/honours.js"]
  n28["bot/hotw.js"]
  n29["bot/hub.js"]
  n30["bot/hubroom.js"]
  n31["bot/hype.js"]
  n32["bot/icons/make_icon.py"]
  n33["bot/insights.js"]
  n34["bot/issues.js"]
  n35["bot/lineuprec.js"]
  n36["bot/live.js"]
  n37["bot/locker.js"]
  n38["bot/matchcard.js"]
  n39["bot/media.js"]
  n40["bot/members.js"]
  n41["bot/migrations/0001_init.sql"]
  n42["bot/migrations/0002_roles.sql"]
  n43["bot/migrations/0003_rush.sql"]
  n44["bot/migrations/0004_game.sql"]
  n45["bot/migrations/0005_trials.sql"]
  n46["bot/migrations/0006_profile2.sql"]
  n47["bot/migrations/0007_hof.sql"]
  n48["bot/migrations/0008_builds.sql"]
  n49["bot/migrations/0009_probuilds.sql"]
  n50["bot/migrations/0010_notify.sql"]
  n51["bot/migrations/0011_badges.sql"]
  n52["bot/migrations/0012_docs.sql"]
  n53["bot/migrations/0013_events.sql"]
  n54["bot/migrations/0014_wave8.sql"]
  n55["bot/migrations/0015_awards.sql"]
  n56["bot/migrations/0016_squads.sql"]
  n57["bot/migrations/0017_wave10.sql"]
  n58["bot/migrations/0018_feed.sql"]
  n59["bot/migrations/0019_media.sql"]
  n60["bot/migrations/0020_social.sql"]
  n61["bot/migrations/0021_feed_share.sql"]
  n62["bot/migrations/0022_chats.sql"]
  n63["bot/migrations/0023_moderation.sql"]
  n64["bot/migrations/0024_crawl.sql"]
  n65["bot/migrations/0025_points.sql"]
  n66["bot/migrations/0026_profanity.sql"]
  n67["bot/migrations/0027_avatar_cards.sql"]
  n68["bot/migrations/0028_flag_overrides.sql"]
  n69["bot/migrations/0029_report_poster.sql"]
  n70["bot/migrations/0030_stat_insights.sql"]
  n71["bot/migrations/0031_plays.sql"]
  n72["bot/migrations/0032_plays_discord.sql"]
  n73["bot/migrations/0033_play_media.sql"]
  n74["bot/migrations/0034_push.sql"]
  n75["bot/migrations/0035_event_plays.sql"]
  n76["bot/migrations/0036_burners.sql"]
  n77["bot/migrations/0037_ea_relay.sql"]
  n78["bot/migrations/0038_issue_reports.sql"]
  n79["bot/migrations/0039_card_studio.sql"]
  n80["bot/migrations/0040_card_generation.sql"]
  n81["bot/migrations/0041_export_content_cursors.sql"]
  n82["bot/migrations/0042_card_dual_outputs.sql"]
  n83["bot/migrations/0043_card_artwork_review.sql"]
  n84["bot/monitor.js"]
  n85["bot/notify.js"]
  n86["bot/playmedia.js"]
  n87["bot/plays.js"]
  n88["bot/points.js"]
  n89["bot/predict.js"]
  n90["bot/probuilds.js"]
  n91["bot/profanity.js"]
  n92["bot/profiles.js"]
  n93["bot/ratings.js"]
  n94["bot/recs.js"]
  n95["bot/register.mjs"]
  n96["bot/roles.js"]
  n97["bot/settings.js"]
  n98["bot/social.js"]
  n99["bot/squads.js"]
  n100["bot/statinsights.js"]
  n101["bot/trials.js"]
  n102["bot/vapid-gen.mjs"]
  n103["bot/voicerecap.js"]
  n104["bot/webpush.js"]
  n105["bot/worker.js"]
  n0 --> n1
  n1 --> n96
  n4 --> n15
  n4 --> n19
  n4 --> n85
  n4 --> n96
  n4 --> n97
  n5 --> n85
  n5 --> n96
  n6 --> n4
  n6 --> n19
  n6 --> n21
  n6 --> n24
  n6 --> n40
  n6 --> n85
  n6 --> n87
  n6 --> n88
  n6 --> n96
  n6 --> n101
  n7 --> n16
  n7 --> n19
  n7 --> n96
  n8 --> n25
  n8 --> n96
  n9 --> n10
  n9 --> n14
  n9 --> n96
  n11 --> n39
  n11 --> n85
  n11 --> n96
  n12 --> n85
  n12 --> n96
  n19 --> n85
  n19 --> n96
  n21 --> n15
  n21 --> n19
  n21 --> n35
  n21 --> n39
  n21 --> n85
  n21 --> n88
  n21 --> n92
  n21 --> n96
  n21 --> n97
  n22 --> n96
  n23 --> n19
  n23 --> n39
  n23 --> n85
  n23 --> n96
  n23 --> n98
  n24 --> n85
  n24 --> n96
  n25 --> n85
  n25 --> n96
  n26 --> n96
  n27 --> n89
  n27 --> n96
  n28 --> n4
  n28 --> n19
  n28 --> n85
  n28 --> n96
  n29 --> n4
  n29 --> n85
  n29 --> n96
  n29 --> n98
  n31 --> n85
  n33 --> n85
  n33 --> n96
  n35 --> n0
  n35 --> n21
  n35 --> n96
  n37 --> n4
  n37 --> n5
  n37 --> n85
  n37 --> n96
  n39 --> n85
  n39 --> n96
  n40 --> n0
  n40 --> n3
  n40 --> n4
  n40 --> n5
  n40 --> n7
  n40 --> n8
  n40 --> n9
  n40 --> n11
  n40 --> n12
  n40 --> n14
  n40 --> n17
  n40 --> n18
  n40 --> n19
  n40 --> n21
  n40 --> n23
  n40 --> n24
  n40 --> n25
  n40 --> n26
  n40 --> n27
  n40 --> n28
  n40 --> n29
  n40 --> n33
  n40 --> n34
  n40 --> n36
  n40 --> n37
  n40 --> n39
  n40 --> n85
  n40 --> n86
  n40 --> n87
  n40 --> n88
  n40 --> n89
  n40 --> n90
  n40 --> n92
  n40 --> n93
  n40 --> n94
  n40 --> n96
  n40 --> n97
  n40 --> n98
  n40 --> n99
  n40 --> n100
  n40 --> n101
  n40 --> n104
  n85 --> n15
  n85 --> n96
  n85 --> n104
  n86 --> n19
  n86 --> n96
  n87 --> n15
  n87 --> n19
  n87 --> n85
  n87 --> n96
  n88 --> n96
  n89 --> n21
  n89 --> n85
  n89 --> n88
  n89 --> n96
  n90 --> n8
  n90 --> n96
  n91 --> n85
  n91 --> n88
  n91 --> n96
  n92 --> n5
  n92 --> n90
  n92 --> n93
  n92 --> n96
  n93 --> n4
  n93 --> n88
  n93 --> n96
  n94 --> n96
  n95 --> n16
  n97 --> n7
  n97 --> n96
  n98 --> n85
  n98 --> n96
  n99 --> n19
  n99 --> n85
  n99 --> n96
  n100 --> n1
  n100 --> n96
  n101 --> n85
  n101 --> n96
  n103 --> n85
  n105 --> n1
  n105 --> n2
  n105 --> n3
  n105 --> n4
  n105 --> n6
  n105 --> n7
  n105 --> n9
  n105 --> n11
  n105 --> n13
  n105 --> n15
  n105 --> n18
  n105 --> n19
  n105 --> n21
  n105 --> n22
  n105 --> n28
  n105 --> n29
  n105 --> n30
  n105 --> n31
  n105 --> n33
  n105 --> n36
  n105 --> n38
  n105 --> n39
  n105 --> n40
  n105 --> n84
  n105 --> n85
  n105 --> n89
  n105 --> n91
  n105 --> n96
  n105 --> n100
  n105 --> n103
```
