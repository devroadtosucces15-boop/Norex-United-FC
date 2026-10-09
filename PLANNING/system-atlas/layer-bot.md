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
  n84["bot/migrations/0044_card_kit_number.sql"]
  n85["bot/monitor.js"]
  n86["bot/notify.js"]
  n87["bot/playmedia.js"]
  n88["bot/plays.js"]
  n89["bot/points.js"]
  n90["bot/predict.js"]
  n91["bot/probuilds.js"]
  n92["bot/profanity.js"]
  n93["bot/profiles.js"]
  n94["bot/ratings.js"]
  n95["bot/recs.js"]
  n96["bot/register.mjs"]
  n97["bot/roles.js"]
  n98["bot/settings.js"]
  n99["bot/social.js"]
  n100["bot/squads.js"]
  n101["bot/statinsights.js"]
  n102["bot/trials.js"]
  n103["bot/vapid-gen.mjs"]
  n104["bot/voicerecap.js"]
  n105["bot/webpush.js"]
  n106["bot/worker.js"]
  n0 --> n1
  n1 --> n97
  n4 --> n15
  n4 --> n19
  n4 --> n86
  n4 --> n97
  n4 --> n98
  n5 --> n86
  n5 --> n97
  n6 --> n4
  n6 --> n19
  n6 --> n21
  n6 --> n24
  n6 --> n40
  n6 --> n86
  n6 --> n88
  n6 --> n89
  n6 --> n97
  n6 --> n102
  n7 --> n16
  n7 --> n19
  n7 --> n97
  n8 --> n25
  n8 --> n97
  n9 --> n10
  n9 --> n14
  n9 --> n97
  n11 --> n39
  n11 --> n86
  n11 --> n97
  n12 --> n86
  n12 --> n97
  n19 --> n86
  n19 --> n97
  n21 --> n15
  n21 --> n19
  n21 --> n35
  n21 --> n39
  n21 --> n86
  n21 --> n89
  n21 --> n93
  n21 --> n97
  n21 --> n98
  n22 --> n97
  n23 --> n19
  n23 --> n39
  n23 --> n86
  n23 --> n97
  n23 --> n99
  n24 --> n86
  n24 --> n97
  n25 --> n86
  n25 --> n97
  n26 --> n97
  n27 --> n90
  n27 --> n97
  n28 --> n4
  n28 --> n19
  n28 --> n86
  n28 --> n97
  n29 --> n4
  n29 --> n86
  n29 --> n97
  n29 --> n99
  n31 --> n86
  n33 --> n86
  n33 --> n97
  n35 --> n0
  n35 --> n21
  n35 --> n97
  n37 --> n4
  n37 --> n5
  n37 --> n86
  n37 --> n97
  n39 --> n86
  n39 --> n97
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
  n40 --> n86
  n40 --> n87
  n40 --> n88
  n40 --> n89
  n40 --> n90
  n40 --> n91
  n40 --> n93
  n40 --> n94
  n40 --> n95
  n40 --> n97
  n40 --> n98
  n40 --> n99
  n40 --> n100
  n40 --> n101
  n40 --> n102
  n40 --> n105
  n86 --> n15
  n86 --> n97
  n86 --> n105
  n87 --> n19
  n87 --> n97
  n88 --> n15
  n88 --> n19
  n88 --> n86
  n88 --> n97
  n89 --> n97
  n90 --> n21
  n90 --> n86
  n90 --> n89
  n90 --> n97
  n91 --> n8
  n91 --> n97
  n92 --> n86
  n92 --> n89
  n92 --> n97
  n93 --> n5
  n93 --> n91
  n93 --> n94
  n93 --> n97
  n94 --> n4
  n94 --> n89
  n94 --> n97
  n95 --> n97
  n96 --> n16
  n98 --> n7
  n98 --> n97
  n99 --> n86
  n99 --> n97
  n100 --> n19
  n100 --> n86
  n100 --> n97
  n101 --> n1
  n101 --> n97
  n102 --> n86
  n102 --> n97
  n104 --> n86
  n106 --> n1
  n106 --> n2
  n106 --> n3
  n106 --> n4
  n106 --> n6
  n106 --> n7
  n106 --> n9
  n106 --> n11
  n106 --> n13
  n106 --> n15
  n106 --> n18
  n106 --> n19
  n106 --> n21
  n106 --> n22
  n106 --> n28
  n106 --> n29
  n106 --> n30
  n106 --> n31
  n106 --> n33
  n106 --> n36
  n106 --> n38
  n106 --> n39
  n106 --> n40
  n106 --> n85
  n106 --> n86
  n106 --> n90
  n106 --> n92
  n106 --> n97
  n106 --> n101
  n106 --> n104
```
