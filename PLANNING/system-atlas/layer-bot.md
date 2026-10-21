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
  n111["bot/monitor.js"]
  n112["bot/notifcenter.js"]
  n113["bot/notify.js"]
  n114["bot/panel.js"]
  n115["bot/playmedia.js"]
  n116["bot/plays.js"]
  n117["bot/points.js"]
  n118["bot/predict.js"]
  n119["bot/probuilds.js"]
  n120["bot/profanity.js"]
  n121["bot/profiles.js"]
  n122["bot/ratings.js"]
  n123["bot/recs.js"]
  n124["bot/register.mjs"]
  n125["bot/reminders.js"]
  n126["bot/roles.js"]
  n127["bot/routing.js"]
  n128["bot/servertools.js"]
  n129["bot/settings.js"]
  n130["bot/social.js"]
  n131["bot/squads.js"]
  n132["bot/statinsights.js"]
  n133["bot/streamalerts.js"]
  n134["bot/trials.js"]
  n135["bot/ui.js"]
  n136["bot/vapid-gen.mjs"]
  n137["bot/voicerecap.js"]
  n138["bot/watchlist.js"]
  n139["bot/webpush.js"]
  n140["bot/worker.js"]
  n0 --> n1
  n1 --> n126
  n2 --> n21
  n2 --> n39
  n2 --> n126
  n2 --> n129
  n2 --> n135
  n5 --> n16
  n5 --> n21
  n5 --> n113
  n5 --> n126
  n5 --> n127
  n5 --> n129
  n5 --> n135
  n6 --> n113
  n6 --> n126
  n7 --> n5
  n7 --> n21
  n7 --> n25
  n7 --> n27
  n7 --> n29
  n7 --> n34
  n7 --> n39
  n7 --> n51
  n7 --> n113
  n7 --> n116
  n7 --> n117
  n7 --> n126
  n7 --> n134
  n7 --> n135
  n8 --> n17
  n8 --> n21
  n8 --> n126
  n8 --> n135
  n9 --> n31
  n9 --> n126
  n10 --> n11
  n10 --> n15
  n10 --> n126
  n10 --> n135
  n11 --> n39
  n11 --> n135
  n12 --> n49
  n12 --> n113
  n12 --> n126
  n13 --> n113
  n13 --> n126
  n20 --> n21
  n20 --> n113
  n20 --> n126
  n20 --> n127
  n20 --> n135
  n21 --> n113
  n21 --> n126
  n21 --> n135
  n23 --> n41
  n25 --> n16
  n25 --> n21
  n25 --> n27
  n25 --> n45
  n25 --> n49
  n25 --> n112
  n25 --> n113
  n25 --> n117
  n25 --> n121
  n25 --> n126
  n25 --> n127
  n25 --> n129
  n25 --> n135
  n26 --> n126
  n28 --> n2
  n28 --> n21
  n28 --> n49
  n28 --> n113
  n28 --> n126
  n28 --> n130
  n28 --> n135
  n29 --> n113
  n29 --> n126
  n30 --> n39
  n30 --> n126
  n30 --> n135
  n31 --> n113
  n31 --> n126
  n32 --> n126
  n33 --> n118
  n33 --> n126
  n34 --> n25
  n34 --> n128
  n34 --> n135
  n35 --> n5
  n35 --> n21
  n35 --> n113
  n35 --> n126
  n35 --> n127
  n35 --> n135
  n36 --> n5
  n36 --> n113
  n36 --> n126
  n36 --> n130
  n38 --> n39
  n38 --> n113
  n38 --> n135
  n39 --> n22
  n39 --> n41
  n42 --> n113
  n42 --> n126
  n42 --> n135
  n43 --> n126
  n44 --> n129
  n45 --> n0
  n45 --> n25
  n45 --> n126
  n46 --> n2
  n46 --> n21
  n46 --> n39
  n46 --> n113
  n46 --> n126
  n46 --> n133
  n46 --> n135
  n47 --> n5
  n47 --> n6
  n47 --> n113
  n47 --> n126
  n48 --> n135
  n49 --> n113
  n49 --> n126
  n50 --> n2
  n50 --> n21
  n50 --> n39
  n50 --> n44
  n50 --> n46
  n50 --> n126
  n50 --> n133
  n50 --> n135
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
  n51 --> n113
  n51 --> n114
  n51 --> n115
  n51 --> n116
  n51 --> n117
  n51 --> n118
  n51 --> n119
  n51 --> n121
  n51 --> n122
  n51 --> n123
  n51 --> n126
  n51 --> n127
  n51 --> n129
  n51 --> n130
  n51 --> n131
  n51 --> n132
  n51 --> n134
  n51 --> n138
  n51 --> n139
  n111 --> n135
  n112 --> n126
  n113 --> n16
  n113 --> n27
  n113 --> n44
  n113 --> n112
  n113 --> n126
  n113 --> n135
  n113 --> n139
  n114 --> n27
  n114 --> n51
  n114 --> n126
  n114 --> n135
  n115 --> n21
  n115 --> n126
  n115 --> n135
  n116 --> n16
  n116 --> n21
  n116 --> n113
  n116 --> n126
  n116 --> n135
  n117 --> n126
  n118 --> n25
  n118 --> n113
  n118 --> n117
  n118 --> n126
  n119 --> n9
  n119 --> n126
  n120 --> n113
  n120 --> n117
  n120 --> n126
  n121 --> n6
  n121 --> n119
  n121 --> n122
  n121 --> n126
  n122 --> n5
  n122 --> n117
  n122 --> n126
  n123 --> n126
  n124 --> n17
  n125 --> n112
  n125 --> n113
  n125 --> n126
  n127 --> n113
  n127 --> n126
  n127 --> n129
  n128 --> n27
  n128 --> n126
  n128 --> n135
  n129 --> n8
  n129 --> n44
  n129 --> n126
  n129 --> n127
  n130 --> n113
  n130 --> n126
  n131 --> n21
  n131 --> n113
  n131 --> n126
  n131 --> n135
  n132 --> n1
  n132 --> n126
  n132 --> n127
  n132 --> n135
  n133 --> n21
  n133 --> n39
  n133 --> n44
  n133 --> n50
  n133 --> n126
  n133 --> n129
  n133 --> n135
  n133 --> n138
  n134 --> n113
  n134 --> n126
  n135 --> n39
  n137 --> n113
  n137 --> n135
  n138 --> n21
  n138 --> n126
  n138 --> n135
  n140 --> n1
  n140 --> n3
  n140 --> n4
  n140 --> n5
  n140 --> n7
  n140 --> n8
  n140 --> n10
  n140 --> n12
  n140 --> n14
  n140 --> n16
  n140 --> n19
  n140 --> n20
  n140 --> n21
  n140 --> n25
  n140 --> n26
  n140 --> n27
  n140 --> n30
  n140 --> n34
  n140 --> n35
  n140 --> n36
  n140 --> n37
  n140 --> n38
  n140 --> n39
  n140 --> n42
  n140 --> n43
  n140 --> n46
  n140 --> n48
  n140 --> n49
  n140 --> n50
  n140 --> n51
  n140 --> n111
  n140 --> n113
  n140 --> n114
  n140 --> n118
  n140 --> n120
  n140 --> n125
  n140 --> n126
  n140 --> n128
  n140 --> n132
  n140 --> n133
  n140 --> n135
  n140 --> n137
  n140 --> n138
```
