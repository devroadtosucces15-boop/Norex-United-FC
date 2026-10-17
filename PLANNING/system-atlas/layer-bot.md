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
  n19["bot/discoveries.js"]
  n20["bot/docs.js"]
  n21["bot/emojis.gen.js"]
  n22["bot/ensure-emojis.mjs"]
  n23["bot/ensure-resources.mjs"]
  n24["bot/events.js"]
  n25["bot/exportcontent.js"]
  n26["bot/faces.js"]
  n27["bot/feed.js"]
  n28["bot/feedback.js"]
  n29["bot/fun.js"]
  n30["bot/game.js"]
  n31["bot/health.js"]
  n32["bot/honours.js"]
  n33["bot/host.js"]
  n34["bot/hotw.js"]
  n35["bot/hub.js"]
  n36["bot/hubroom.js"]
  n37["bot/hype.js"]
  n38["bot/icons.js"]
  n39["bot/icons/make_icon.py"]
  n40["bot/iconset.mjs"]
  n41["bot/insights.js"]
  n42["bot/issues.js"]
  n43["bot/lineuprec.js"]
  n44["bot/live.js"]
  n45["bot/locker.js"]
  n46["bot/matchcard.js"]
  n47["bot/media.js"]
  n48["bot/memberlive.js"]
  n49["bot/members.js"]
  n50["bot/migrations/0001_init.sql"]
  n51["bot/migrations/0002_roles.sql"]
  n52["bot/migrations/0003_rush.sql"]
  n53["bot/migrations/0004_game.sql"]
  n54["bot/migrations/0005_trials.sql"]
  n55["bot/migrations/0006_profile2.sql"]
  n56["bot/migrations/0007_hof.sql"]
  n57["bot/migrations/0008_builds.sql"]
  n58["bot/migrations/0009_probuilds.sql"]
  n59["bot/migrations/0010_notify.sql"]
  n60["bot/migrations/0011_badges.sql"]
  n61["bot/migrations/0012_docs.sql"]
  n62["bot/migrations/0013_events.sql"]
  n63["bot/migrations/0014_wave8.sql"]
  n64["bot/migrations/0015_awards.sql"]
  n65["bot/migrations/0016_squads.sql"]
  n66["bot/migrations/0017_wave10.sql"]
  n67["bot/migrations/0018_feed.sql"]
  n68["bot/migrations/0019_media.sql"]
  n69["bot/migrations/0020_social.sql"]
  n70["bot/migrations/0021_feed_share.sql"]
  n71["bot/migrations/0022_chats.sql"]
  n72["bot/migrations/0023_moderation.sql"]
  n73["bot/migrations/0024_crawl.sql"]
  n74["bot/migrations/0025_points.sql"]
  n75["bot/migrations/0026_profanity.sql"]
  n76["bot/migrations/0027_avatar_cards.sql"]
  n77["bot/migrations/0028_flag_overrides.sql"]
  n78["bot/migrations/0029_report_poster.sql"]
  n79["bot/migrations/0030_stat_insights.sql"]
  n80["bot/migrations/0031_plays.sql"]
  n81["bot/migrations/0032_plays_discord.sql"]
  n82["bot/migrations/0033_play_media.sql"]
  n83["bot/migrations/0034_push.sql"]
  n84["bot/migrations/0035_event_plays.sql"]
  n85["bot/migrations/0036_burners.sql"]
  n86["bot/migrations/0037_ea_relay.sql"]
  n87["bot/migrations/0038_issue_reports.sql"]
  n88["bot/migrations/0039_card_studio.sql"]
  n89["bot/migrations/0040_card_generation.sql"]
  n90["bot/migrations/0041_export_content_cursors.sql"]
  n91["bot/migrations/0042_card_dual_outputs.sql"]
  n92["bot/migrations/0043_card_artwork_review.sql"]
  n93["bot/migrations/0044_card_kit_number.sql"]
  n94["bot/migrations/0045_card_owner_uploads.sql"]
  n95["bot/migrations/0046_server_tools.sql"]
  n96["bot/migrations/0047_fun.sql"]
  n97["bot/migrations/0048_profile_fun.sql"]
  n98["bot/migrations/0049_discoveries.sql"]
  n99["bot/migrations/0050_watchlist.sql"]
  n100["bot/migrations/0051_member_live.sql"]
  n101["bot/migrations/0052_feedback_reactions.sql"]
  n102["bot/migrations/0053_card_ai_notes.sql"]
  n103["bot/migrations/0053_club_docs_content.sql"]
  n104["bot/migrations/0054_d1_usage_indexes.sql"]
  n105["bot/migrations/0055_lineup_home.sql"]
  n106["bot/monitor.js"]
  n107["bot/notifcenter.js"]
  n108["bot/notify.js"]
  n109["bot/panel.js"]
  n110["bot/playmedia.js"]
  n111["bot/plays.js"]
  n112["bot/points.js"]
  n113["bot/predict.js"]
  n114["bot/probuilds.js"]
  n115["bot/profanity.js"]
  n116["bot/profiles.js"]
  n117["bot/ratings.js"]
  n118["bot/recs.js"]
  n119["bot/register.mjs"]
  n120["bot/reminders.js"]
  n121["bot/roles.js"]
  n122["bot/servertools.js"]
  n123["bot/settings.js"]
  n124["bot/social.js"]
  n125["bot/squads.js"]
  n126["bot/statinsights.js"]
  n127["bot/trials.js"]
  n128["bot/ui.js"]
  n129["bot/vapid-gen.mjs"]
  n130["bot/voicerecap.js"]
  n131["bot/watchlist.js"]
  n132["bot/webpush.js"]
  n133["bot/worker.js"]
  n0 --> n1
  n1 --> n121
  n4 --> n15
  n4 --> n20
  n4 --> n108
  n4 --> n121
  n4 --> n123
  n4 --> n128
  n5 --> n108
  n5 --> n121
  n6 --> n4
  n6 --> n20
  n6 --> n24
  n6 --> n26
  n6 --> n28
  n6 --> n33
  n6 --> n38
  n6 --> n49
  n6 --> n108
  n6 --> n111
  n6 --> n112
  n6 --> n121
  n6 --> n127
  n6 --> n128
  n7 --> n16
  n7 --> n20
  n7 --> n121
  n7 --> n128
  n8 --> n30
  n8 --> n121
  n9 --> n10
  n9 --> n14
  n9 --> n121
  n9 --> n128
  n10 --> n38
  n10 --> n128
  n11 --> n47
  n11 --> n108
  n11 --> n121
  n12 --> n108
  n12 --> n121
  n19 --> n20
  n19 --> n108
  n19 --> n121
  n19 --> n128
  n20 --> n108
  n20 --> n121
  n20 --> n128
  n22 --> n40
  n24 --> n15
  n24 --> n20
  n24 --> n26
  n24 --> n43
  n24 --> n47
  n24 --> n107
  n24 --> n108
  n24 --> n112
  n24 --> n116
  n24 --> n121
  n24 --> n123
  n24 --> n128
  n25 --> n121
  n27 --> n20
  n27 --> n47
  n27 --> n108
  n27 --> n121
  n27 --> n124
  n27 --> n128
  n28 --> n108
  n28 --> n121
  n29 --> n38
  n29 --> n121
  n29 --> n128
  n30 --> n108
  n30 --> n121
  n31 --> n121
  n32 --> n113
  n32 --> n121
  n33 --> n24
  n33 --> n122
  n33 --> n128
  n34 --> n4
  n34 --> n20
  n34 --> n108
  n34 --> n121
  n34 --> n128
  n35 --> n4
  n35 --> n108
  n35 --> n121
  n35 --> n124
  n37 --> n38
  n37 --> n108
  n37 --> n128
  n38 --> n21
  n38 --> n40
  n41 --> n108
  n41 --> n121
  n41 --> n128
  n42 --> n121
  n43 --> n0
  n43 --> n24
  n43 --> n121
  n44 --> n20
  n44 --> n38
  n44 --> n108
  n44 --> n121
  n44 --> n128
  n45 --> n4
  n45 --> n5
  n45 --> n108
  n45 --> n121
  n46 --> n128
  n47 --> n108
  n47 --> n121
  n48 --> n20
  n48 --> n38
  n48 --> n44
  n48 --> n121
  n48 --> n128
  n49 --> n0
  n49 --> n3
  n49 --> n4
  n49 --> n5
  n49 --> n7
  n49 --> n8
  n49 --> n9
  n49 --> n11
  n49 --> n12
  n49 --> n14
  n49 --> n17
  n49 --> n18
  n49 --> n19
  n49 --> n20
  n49 --> n24
  n49 --> n26
  n49 --> n27
  n49 --> n28
  n49 --> n29
  n49 --> n30
  n49 --> n31
  n49 --> n32
  n49 --> n34
  n49 --> n35
  n49 --> n41
  n49 --> n42
  n49 --> n44
  n49 --> n45
  n49 --> n47
  n49 --> n48
  n49 --> n108
  n49 --> n109
  n49 --> n110
  n49 --> n111
  n49 --> n112
  n49 --> n113
  n49 --> n114
  n49 --> n116
  n49 --> n117
  n49 --> n118
  n49 --> n121
  n49 --> n123
  n49 --> n124
  n49 --> n125
  n49 --> n126
  n49 --> n127
  n49 --> n131
  n49 --> n132
  n106 --> n128
  n107 --> n121
  n108 --> n15
  n108 --> n26
  n108 --> n107
  n108 --> n121
  n108 --> n128
  n108 --> n132
  n109 --> n26
  n109 --> n49
  n109 --> n121
  n109 --> n128
  n110 --> n20
  n110 --> n121
  n110 --> n128
  n111 --> n15
  n111 --> n20
  n111 --> n108
  n111 --> n121
  n111 --> n128
  n112 --> n121
  n113 --> n24
  n113 --> n108
  n113 --> n112
  n113 --> n121
  n114 --> n8
  n114 --> n121
  n115 --> n108
  n115 --> n112
  n115 --> n121
  n116 --> n5
  n116 --> n114
  n116 --> n117
  n116 --> n121
  n117 --> n4
  n117 --> n112
  n117 --> n121
  n118 --> n121
  n119 --> n16
  n120 --> n107
  n120 --> n108
  n120 --> n121
  n122 --> n26
  n122 --> n121
  n122 --> n128
  n123 --> n7
  n123 --> n121
  n124 --> n108
  n124 --> n121
  n125 --> n20
  n125 --> n108
  n125 --> n121
  n125 --> n128
  n126 --> n1
  n126 --> n121
  n126 --> n128
  n127 --> n108
  n127 --> n121
  n128 --> n38
  n130 --> n108
  n130 --> n128
  n131 --> n20
  n131 --> n121
  n131 --> n128
  n133 --> n1
  n133 --> n2
  n133 --> n3
  n133 --> n4
  n133 --> n6
  n133 --> n7
  n133 --> n9
  n133 --> n11
  n133 --> n13
  n133 --> n15
  n133 --> n18
  n133 --> n19
  n133 --> n20
  n133 --> n24
  n133 --> n25
  n133 --> n26
  n133 --> n29
  n133 --> n33
  n133 --> n34
  n133 --> n35
  n133 --> n36
  n133 --> n37
  n133 --> n38
  n133 --> n41
  n133 --> n42
  n133 --> n44
  n133 --> n46
  n133 --> n47
  n133 --> n48
  n133 --> n49
  n133 --> n106
  n133 --> n108
  n133 --> n109
  n133 --> n113
  n133 --> n115
  n133 --> n120
  n133 --> n121
  n133 --> n122
  n133 --> n126
  n133 --> n128
  n133 --> n130
  n133 --> n131
```
