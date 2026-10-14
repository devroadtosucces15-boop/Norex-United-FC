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
  n86["bot/migrations/0046_server_tools.sql"]
  n87["bot/monitor.js"]
  n88["bot/notify.js"]
  n89["bot/playmedia.js"]
  n90["bot/plays.js"]
  n91["bot/points.js"]
  n92["bot/predict.js"]
  n93["bot/probuilds.js"]
  n94["bot/profanity.js"]
  n95["bot/profiles.js"]
  n96["bot/ratings.js"]
  n97["bot/recs.js"]
  n98["bot/register.mjs"]
  n99["bot/roles.js"]
  n100["bot/servertools.js"]
  n101["bot/settings.js"]
  n102["bot/social.js"]
  n103["bot/squads.js"]
  n104["bot/statinsights.js"]
  n105["bot/trials.js"]
  n106["bot/vapid-gen.mjs"]
  n107["bot/voicerecap.js"]
  n108["bot/webpush.js"]
  n109["bot/worker.js"]
  n0 --> n1
  n1 --> n99
  n4 --> n15
  n4 --> n19
  n4 --> n88
  n4 --> n99
  n4 --> n101
  n5 --> n88
  n5 --> n99
  n6 --> n4
  n6 --> n19
  n6 --> n21
  n6 --> n24
  n6 --> n40
  n6 --> n88
  n6 --> n90
  n6 --> n91
  n6 --> n99
  n6 --> n105
  n7 --> n16
  n7 --> n19
  n7 --> n99
  n8 --> n25
  n8 --> n99
  n9 --> n10
  n9 --> n14
  n9 --> n99
  n11 --> n39
  n11 --> n88
  n11 --> n99
  n12 --> n88
  n12 --> n99
  n19 --> n88
  n19 --> n99
  n21 --> n15
  n21 --> n19
  n21 --> n35
  n21 --> n39
  n21 --> n88
  n21 --> n91
  n21 --> n95
  n21 --> n99
  n21 --> n101
  n22 --> n99
  n23 --> n19
  n23 --> n39
  n23 --> n88
  n23 --> n99
  n23 --> n102
  n24 --> n88
  n24 --> n99
  n25 --> n88
  n25 --> n99
  n26 --> n99
  n27 --> n92
  n27 --> n99
  n28 --> n4
  n28 --> n19
  n28 --> n88
  n28 --> n99
  n29 --> n4
  n29 --> n88
  n29 --> n99
  n29 --> n102
  n31 --> n88
  n33 --> n88
  n33 --> n99
  n35 --> n0
  n35 --> n21
  n35 --> n99
  n37 --> n4
  n37 --> n5
  n37 --> n88
  n37 --> n99
  n39 --> n88
  n39 --> n99
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
  n40 --> n88
  n40 --> n89
  n40 --> n90
  n40 --> n91
  n40 --> n92
  n40 --> n93
  n40 --> n95
  n40 --> n96
  n40 --> n97
  n40 --> n99
  n40 --> n101
  n40 --> n102
  n40 --> n103
  n40 --> n104
  n40 --> n105
  n40 --> n108
  n88 --> n15
  n88 --> n99
  n88 --> n108
  n89 --> n19
  n89 --> n99
  n90 --> n15
  n90 --> n19
  n90 --> n88
  n90 --> n99
  n91 --> n99
  n92 --> n21
  n92 --> n88
  n92 --> n91
  n92 --> n99
  n93 --> n8
  n93 --> n99
  n94 --> n88
  n94 --> n91
  n94 --> n99
  n95 --> n5
  n95 --> n93
  n95 --> n96
  n95 --> n99
  n96 --> n4
  n96 --> n91
  n96 --> n99
  n97 --> n99
  n98 --> n16
  n100 --> n99
  n101 --> n7
  n101 --> n99
  n102 --> n88
  n102 --> n99
  n103 --> n19
  n103 --> n88
  n103 --> n99
  n104 --> n1
  n104 --> n99
  n105 --> n88
  n105 --> n99
  n107 --> n88
  n109 --> n1
  n109 --> n2
  n109 --> n3
  n109 --> n4
  n109 --> n6
  n109 --> n7
  n109 --> n9
  n109 --> n11
  n109 --> n13
  n109 --> n15
  n109 --> n18
  n109 --> n19
  n109 --> n21
  n109 --> n22
  n109 --> n28
  n109 --> n29
  n109 --> n30
  n109 --> n31
  n109 --> n33
  n109 --> n36
  n109 --> n38
  n109 --> n39
  n109 --> n40
  n109 --> n87
  n109 --> n88
  n109 --> n92
  n109 --> n94
  n109 --> n99
  n109 --> n100
  n109 --> n104
  n109 --> n107
```
