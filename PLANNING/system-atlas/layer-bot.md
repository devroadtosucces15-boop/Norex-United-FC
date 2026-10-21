# bot module dependencies

Source-level imports; isolated files appear without arrows.

```mermaid
flowchart LR
  n0["bot/aiinsights.js"]
  n1["bot/aispike.js"]
  n2["bot/alertroute.js"]
  n3["bot/ask.js"]
  n4["bot/avatarcard.js"]
  n5["bot/awards.js"]
  n6["bot/badges.js"]
  n7["bot/botcmds.js"]
  n8["bot/botcommands.js"]
  n9["bot/builds.js"]
  n10["bot/burners.js"]
  n11["bot/burnerstats.js"]
  n12["bot/cardstudio.js"]
  n13["bot/chat.js"]
  n14["bot/chatroom.js"]
  n15["bot/clublookup.js"]
  n16["bot/clubroom.js"]
  n17["bot/commanddefs.js"]
  n18["bot/crawl.js"]
  n19["bot/discordroles.js"]
  n20["bot/discoveries.js"]
  n21["bot/docs.js"]
  n22["bot/emojis.gen.js"]
  n23["bot/ensure-emojis.mjs"]
  n24["bot/ensure-resources.mjs"]
  n25["bot/events.js"]
  n26["bot/exportcontent.js"]
  n27["bot/faces.js"]
  n28["bot/feed.js"]
  n29["bot/feedback.js"]
  n30["bot/fun.js"]
  n31["bot/game.js"]
  n32["bot/health.js"]
  n33["bot/honours.js"]
  n34["bot/host.js"]
  n35["bot/hotw.js"]
  n36["bot/hub.js"]
  n37["bot/hubroom.js"]
  n38["bot/hype.js"]
  n39["bot/icons.js"]
  n40["bot/icons/make_icon.py"]
  n41["bot/iconset.mjs"]
  n42["bot/insights.js"]
  n43["bot/issues.js"]
  n44["bot/limits.js"]
  n45["bot/lineuprec.js"]
  n46["bot/live.js"]
  n47["bot/locker.js"]
  n48["bot/matchcard.js"]
  n49["bot/media.js"]
  n50["bot/memberlive.js"]
  n51["bot/members.js"]
  n52["bot/migrations/0001_init.sql"]
  n53["bot/migrations/0002_roles.sql"]
  n54["bot/migrations/0003_rush.sql"]
  n55["bot/migrations/0004_game.sql"]
  n56["bot/migrations/0005_trials.sql"]
  n57["bot/migrations/0006_profile2.sql"]
  n58["bot/migrations/0007_hof.sql"]
  n59["bot/migrations/0008_builds.sql"]
  n60["bot/migrations/0009_probuilds.sql"]
  n61["bot/migrations/0010_notify.sql"]
  n62["bot/migrations/0011_badges.sql"]
  n63["bot/migrations/0012_docs.sql"]
  n64["bot/migrations/0013_events.sql"]
  n65["bot/migrations/0014_wave8.sql"]
  n66["bot/migrations/0015_awards.sql"]
  n67["bot/migrations/0016_squads.sql"]
  n68["bot/migrations/0017_wave10.sql"]
  n69["bot/migrations/0018_feed.sql"]
  n70["bot/migrations/0019_media.sql"]
  n71["bot/migrations/0020_social.sql"]
  n72["bot/migrations/0021_feed_share.sql"]
  n73["bot/migrations/0022_chats.sql"]
  n74["bot/migrations/0023_moderation.sql"]
  n75["bot/migrations/0024_crawl.sql"]
  n76["bot/migrations/0025_points.sql"]
  n77["bot/migrations/0026_profanity.sql"]
  n78["bot/migrations/0027_avatar_cards.sql"]
  n79["bot/migrations/0028_flag_overrides.sql"]
  n80["bot/migrations/0029_report_poster.sql"]
  n81["bot/migrations/0030_stat_insights.sql"]
  n82["bot/migrations/0031_plays.sql"]
  n83["bot/migrations/0032_plays_discord.sql"]
  n84["bot/migrations/0033_play_media.sql"]
  n85["bot/migrations/0034_push.sql"]
  n86["bot/migrations/0035_event_plays.sql"]
  n87["bot/migrations/0036_burners.sql"]
  n88["bot/migrations/0037_ea_relay.sql"]
  n89["bot/migrations/0038_issue_reports.sql"]
  n90["bot/migrations/0039_card_studio.sql"]
  n91["bot/migrations/0040_card_generation.sql"]
  n92["bot/migrations/0041_export_content_cursors.sql"]
  n93["bot/migrations/0042_card_dual_outputs.sql"]
  n94["bot/migrations/0043_card_artwork_review.sql"]
  n95["bot/migrations/0044_card_kit_number.sql"]
  n96["bot/migrations/0045_card_owner_uploads.sql"]
  n97["bot/migrations/0046_server_tools.sql"]
  n98["bot/migrations/0047_fun.sql"]
  n99["bot/migrations/0048_profile_fun.sql"]
  n100["bot/migrations/0049_discoveries.sql"]
  n101["bot/migrations/0050_watchlist.sql"]
  n102["bot/migrations/0051_member_live.sql"]
  n103["bot/migrations/0052_feedback_reactions.sql"]
  n104["bot/migrations/0053_card_ai_notes.sql"]
  n105["bot/migrations/0053_club_docs_content.sql"]
  n106["bot/migrations/0054_d1_usage_indexes.sql"]
  n107["bot/migrations/0055_lineup_home.sql"]
  n108["bot/migrations/0056_stream_sources.sql"]
  n109["bot/migrations/0056_watchlist_channel.sql"]
  n110["bot/migrations/0057_forced_dm.sql"]
  n111["bot/migrations/0058_event_answers.sql"]
  n112["bot/monitor.js"]
  n113["bot/notifcenter.js"]
  n114["bot/notify.js"]
  n115["bot/panel.js"]
  n116["bot/playmedia.js"]
  n117["bot/plays.js"]
  n118["bot/points.js"]
  n119["bot/predict.js"]
  n120["bot/probuilds.js"]
  n121["bot/profanity.js"]
  n122["bot/profiles.js"]
  n123["bot/ratings.js"]
  n124["bot/recs.js"]
  n125["bot/register.mjs"]
  n126["bot/reminders.js"]
  n127["bot/roles.js"]
  n128["bot/routing.js"]
  n129["bot/servertools.js"]
  n130["bot/settings.js"]
  n131["bot/social.js"]
  n132["bot/squads.js"]
  n133["bot/statinsights.js"]
  n134["bot/streamalerts.js"]
  n135["bot/trials.js"]
  n136["bot/ui.js"]
  n137["bot/vapid-gen.mjs"]
  n138["bot/voicerecap.js"]
  n139["bot/watchlist.js"]
  n140["bot/webpush.js"]
  n141["bot/worker.js"]
  n0 --> n1
  n1 --> n127
  n2 --> n21
  n2 --> n39
  n2 --> n127
  n2 --> n130
  n2 --> n136
  n5 --> n16
  n5 --> n21
  n5 --> n114
  n5 --> n127
  n5 --> n128
  n5 --> n130
  n5 --> n136
  n6 --> n114
  n6 --> n127
  n7 --> n5
  n7 --> n21
  n7 --> n25
  n7 --> n27
  n7 --> n29
  n7 --> n34
  n7 --> n39
  n7 --> n51
  n7 --> n114
  n7 --> n117
  n7 --> n118
  n7 --> n127
  n7 --> n135
  n7 --> n136
  n8 --> n17
  n8 --> n21
  n8 --> n127
  n8 --> n136
  n9 --> n31
  n9 --> n127
  n10 --> n11
  n10 --> n15
  n10 --> n127
  n10 --> n136
  n11 --> n39
  n11 --> n136
  n12 --> n49
  n12 --> n114
  n12 --> n127
  n13 --> n114
  n13 --> n127
  n20 --> n21
  n20 --> n114
  n20 --> n127
  n20 --> n128
  n20 --> n136
  n21 --> n114
  n21 --> n127
  n21 --> n136
  n23 --> n41
  n25 --> n16
  n25 --> n21
  n25 --> n27
  n25 --> n45
  n25 --> n49
  n25 --> n113
  n25 --> n114
  n25 --> n118
  n25 --> n122
  n25 --> n127
  n25 --> n128
  n25 --> n130
  n25 --> n136
  n26 --> n127
  n28 --> n2
  n28 --> n21
  n28 --> n49
  n28 --> n114
  n28 --> n127
  n28 --> n131
  n28 --> n136
  n29 --> n114
  n29 --> n127
  n30 --> n39
  n30 --> n127
  n30 --> n136
  n31 --> n114
  n31 --> n127
  n32 --> n127
  n33 --> n119
  n33 --> n127
  n34 --> n25
  n34 --> n129
  n34 --> n136
  n35 --> n5
  n35 --> n21
  n35 --> n114
  n35 --> n127
  n35 --> n128
  n35 --> n136
  n36 --> n5
  n36 --> n114
  n36 --> n127
  n36 --> n131
  n38 --> n39
  n38 --> n114
  n38 --> n136
  n39 --> n22
  n39 --> n41
  n42 --> n114
  n42 --> n127
  n42 --> n136
  n43 --> n127
  n44 --> n130
  n45 --> n0
  n45 --> n25
  n45 --> n127
  n46 --> n2
  n46 --> n21
  n46 --> n39
  n46 --> n114
  n46 --> n127
  n46 --> n134
  n46 --> n136
  n47 --> n5
  n47 --> n6
  n47 --> n114
  n47 --> n127
  n48 --> n136
  n49 --> n114
  n49 --> n127
  n50 --> n2
  n50 --> n21
  n50 --> n39
  n50 --> n44
  n50 --> n46
  n50 --> n127
  n50 --> n134
  n50 --> n136
  n51 --> n0
  n51 --> n2
  n51 --> n4
  n51 --> n5
  n51 --> n6
  n51 --> n8
  n51 --> n9
  n51 --> n10
  n51 --> n12
  n51 --> n13
  n51 --> n15
  n51 --> n18
  n51 --> n19
  n51 --> n20
  n51 --> n21
  n51 --> n25
  n51 --> n27
  n51 --> n28
  n51 --> n29
  n51 --> n30
  n51 --> n31
  n51 --> n32
  n51 --> n33
  n51 --> n35
  n51 --> n36
  n51 --> n42
  n51 --> n43
  n51 --> n46
  n51 --> n47
  n51 --> n49
  n51 --> n50
  n51 --> n114
  n51 --> n115
  n51 --> n116
  n51 --> n117
  n51 --> n118
  n51 --> n119
  n51 --> n120
  n51 --> n122
  n51 --> n123
  n51 --> n124
  n51 --> n127
  n51 --> n128
  n51 --> n130
  n51 --> n131
  n51 --> n132
  n51 --> n133
  n51 --> n135
  n51 --> n139
  n51 --> n140
  n112 --> n136
  n113 --> n127
  n114 --> n16
  n114 --> n27
  n114 --> n44
  n114 --> n113
  n114 --> n127
  n114 --> n136
  n114 --> n140
  n115 --> n27
  n115 --> n51
  n115 --> n127
  n115 --> n136
  n116 --> n21
  n116 --> n127
  n116 --> n136
  n117 --> n16
  n117 --> n21
  n117 --> n114
  n117 --> n127
  n117 --> n136
  n118 --> n127
  n119 --> n25
  n119 --> n114
  n119 --> n118
  n119 --> n127
  n120 --> n9
  n120 --> n127
  n121 --> n114
  n121 --> n118
  n121 --> n127
  n122 --> n6
  n122 --> n120
  n122 --> n123
  n122 --> n127
  n123 --> n5
  n123 --> n118
  n123 --> n127
  n124 --> n127
  n125 --> n17
  n126 --> n113
  n126 --> n114
  n126 --> n127
  n128 --> n114
  n128 --> n127
  n128 --> n130
  n129 --> n27
  n129 --> n127
  n129 --> n136
  n130 --> n8
  n130 --> n27
  n130 --> n44
  n130 --> n127
  n130 --> n128
  n131 --> n114
  n131 --> n127
  n132 --> n21
  n132 --> n114
  n132 --> n127
  n132 --> n136
  n133 --> n1
  n133 --> n127
  n133 --> n128
  n133 --> n136
  n134 --> n21
  n134 --> n39
  n134 --> n44
  n134 --> n50
  n134 --> n127
  n134 --> n130
  n134 --> n136
  n134 --> n139
  n135 --> n114
  n135 --> n127
  n136 --> n39
  n138 --> n114
  n138 --> n136
  n139 --> n21
  n139 --> n127
  n139 --> n136
  n141 --> n1
  n141 --> n3
  n141 --> n4
  n141 --> n5
  n141 --> n7
  n141 --> n8
  n141 --> n10
  n141 --> n12
  n141 --> n14
  n141 --> n16
  n141 --> n19
  n141 --> n20
  n141 --> n21
  n141 --> n25
  n141 --> n26
  n141 --> n27
  n141 --> n30
  n141 --> n34
  n141 --> n35
  n141 --> n36
  n141 --> n37
  n141 --> n38
  n141 --> n39
  n141 --> n42
  n141 --> n43
  n141 --> n46
  n141 --> n48
  n141 --> n49
  n141 --> n50
  n141 --> n51
  n141 --> n112
  n141 --> n114
  n141 --> n115
  n141 --> n119
  n141 --> n121
  n141 --> n126
  n141 --> n127
  n141 --> n129
  n141 --> n133
  n141 --> n134
  n141 --> n136
  n141 --> n138
  n141 --> n139
```
