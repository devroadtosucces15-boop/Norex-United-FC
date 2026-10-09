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
  n85["bot/migrations/0045_card_owner_uploads.sql"]
  n86["bot/monitor.js"]
  n87["bot/notify.js"]
  n88["bot/playmedia.js"]
  n89["bot/plays.js"]
  n90["bot/points.js"]
  n91["bot/predict.js"]
  n92["bot/probuilds.js"]
  n93["bot/profanity.js"]
  n94["bot/profiles.js"]
  n95["bot/ratings.js"]
  n96["bot/recs.js"]
  n97["bot/register.mjs"]
  n98["bot/roles.js"]
  n99["bot/settings.js"]
  n100["bot/social.js"]
  n101["bot/squads.js"]
  n102["bot/statinsights.js"]
  n103["bot/trials.js"]
  n104["bot/vapid-gen.mjs"]
  n105["bot/voicerecap.js"]
  n106["bot/webpush.js"]
  n107["bot/worker.js"]
  n0 --> n1
  n1 --> n98
  n4 --> n15
  n4 --> n19
  n4 --> n87
  n4 --> n98
  n4 --> n99
  n5 --> n87
  n5 --> n98
  n6 --> n4
  n6 --> n19
  n6 --> n21
  n6 --> n24
  n6 --> n40
  n6 --> n87
  n6 --> n89
  n6 --> n90
  n6 --> n98
  n6 --> n103
  n7 --> n16
  n7 --> n19
  n7 --> n98
  n8 --> n25
  n8 --> n98
  n9 --> n10
  n9 --> n14
  n9 --> n98
  n11 --> n39
  n11 --> n87
  n11 --> n98
  n12 --> n87
  n12 --> n98
  n19 --> n87
  n19 --> n98
  n21 --> n15
  n21 --> n19
  n21 --> n35
  n21 --> n39
  n21 --> n87
  n21 --> n90
  n21 --> n94
  n21 --> n98
  n21 --> n99
  n22 --> n98
  n23 --> n19
  n23 --> n39
  n23 --> n87
  n23 --> n98
  n23 --> n100
  n24 --> n87
  n24 --> n98
  n25 --> n87
  n25 --> n98
  n26 --> n98
  n27 --> n91
  n27 --> n98
  n28 --> n4
  n28 --> n19
  n28 --> n87
  n28 --> n98
  n29 --> n4
  n29 --> n87
  n29 --> n98
  n29 --> n100
  n31 --> n87
  n33 --> n87
  n33 --> n98
  n35 --> n0
  n35 --> n21
  n35 --> n98
  n37 --> n4
  n37 --> n5
  n37 --> n87
  n37 --> n98
  n39 --> n87
  n39 --> n98
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
  n40 --> n87
  n40 --> n88
  n40 --> n89
  n40 --> n90
  n40 --> n91
  n40 --> n92
  n40 --> n94
  n40 --> n95
  n40 --> n96
  n40 --> n98
  n40 --> n99
  n40 --> n100
  n40 --> n101
  n40 --> n102
  n40 --> n103
  n40 --> n106
  n87 --> n15
  n87 --> n98
  n87 --> n106
  n88 --> n19
  n88 --> n98
  n89 --> n15
  n89 --> n19
  n89 --> n87
  n89 --> n98
  n90 --> n98
  n91 --> n21
  n91 --> n87
  n91 --> n90
  n91 --> n98
  n92 --> n8
  n92 --> n98
  n93 --> n87
  n93 --> n90
  n93 --> n98
  n94 --> n5
  n94 --> n92
  n94 --> n95
  n94 --> n98
  n95 --> n4
  n95 --> n90
  n95 --> n98
  n96 --> n98
  n97 --> n16
  n99 --> n7
  n99 --> n98
  n100 --> n87
  n100 --> n98
  n101 --> n19
  n101 --> n87
  n101 --> n98
  n102 --> n1
  n102 --> n98
  n103 --> n87
  n103 --> n98
  n105 --> n87
  n107 --> n1
  n107 --> n2
  n107 --> n3
  n107 --> n4
  n107 --> n6
  n107 --> n7
  n107 --> n9
  n107 --> n11
  n107 --> n13
  n107 --> n15
  n107 --> n18
  n107 --> n19
  n107 --> n21
  n107 --> n22
  n107 --> n28
  n107 --> n29
  n107 --> n30
  n107 --> n31
  n107 --> n33
  n107 --> n36
  n107 --> n38
  n107 --> n39
  n107 --> n40
  n107 --> n86
  n107 --> n87
  n107 --> n91
  n107 --> n93
  n107 --> n98
  n107 --> n102
  n107 --> n105
```
