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
  n44["bot/lineuprec.js"]
  n45["bot/live.js"]
  n46["bot/locker.js"]
  n47["bot/matchcard.js"]
  n48["bot/media.js"]
  n49["bot/memberlive.js"]
  n50["bot/members.js"]
  n51["bot/migrations/0001_init.sql"]
  n52["bot/migrations/0002_roles.sql"]
  n53["bot/migrations/0003_rush.sql"]
  n54["bot/migrations/0004_game.sql"]
  n55["bot/migrations/0005_trials.sql"]
  n56["bot/migrations/0006_profile2.sql"]
  n57["bot/migrations/0007_hof.sql"]
  n58["bot/migrations/0008_builds.sql"]
  n59["bot/migrations/0009_probuilds.sql"]
  n60["bot/migrations/0010_notify.sql"]
  n61["bot/migrations/0011_badges.sql"]
  n62["bot/migrations/0012_docs.sql"]
  n63["bot/migrations/0013_events.sql"]
  n64["bot/migrations/0014_wave8.sql"]
  n65["bot/migrations/0015_awards.sql"]
  n66["bot/migrations/0016_squads.sql"]
  n67["bot/migrations/0017_wave10.sql"]
  n68["bot/migrations/0018_feed.sql"]
  n69["bot/migrations/0019_media.sql"]
  n70["bot/migrations/0020_social.sql"]
  n71["bot/migrations/0021_feed_share.sql"]
  n72["bot/migrations/0022_chats.sql"]
  n73["bot/migrations/0023_moderation.sql"]
  n74["bot/migrations/0024_crawl.sql"]
  n75["bot/migrations/0025_points.sql"]
  n76["bot/migrations/0026_profanity.sql"]
  n77["bot/migrations/0027_avatar_cards.sql"]
  n78["bot/migrations/0028_flag_overrides.sql"]
  n79["bot/migrations/0029_report_poster.sql"]
  n80["bot/migrations/0030_stat_insights.sql"]
  n81["bot/migrations/0031_plays.sql"]
  n82["bot/migrations/0032_plays_discord.sql"]
  n83["bot/migrations/0033_play_media.sql"]
  n84["bot/migrations/0034_push.sql"]
  n85["bot/migrations/0035_event_plays.sql"]
  n86["bot/migrations/0036_burners.sql"]
  n87["bot/migrations/0037_ea_relay.sql"]
  n88["bot/migrations/0038_issue_reports.sql"]
  n89["bot/migrations/0039_card_studio.sql"]
  n90["bot/migrations/0040_card_generation.sql"]
  n91["bot/migrations/0041_export_content_cursors.sql"]
  n92["bot/migrations/0042_card_dual_outputs.sql"]
  n93["bot/migrations/0043_card_artwork_review.sql"]
  n94["bot/migrations/0044_card_kit_number.sql"]
  n95["bot/migrations/0045_card_owner_uploads.sql"]
  n96["bot/migrations/0046_server_tools.sql"]
  n97["bot/migrations/0047_fun.sql"]
  n98["bot/migrations/0048_profile_fun.sql"]
  n99["bot/migrations/0049_discoveries.sql"]
  n100["bot/migrations/0050_watchlist.sql"]
  n101["bot/migrations/0051_member_live.sql"]
  n102["bot/migrations/0052_feedback_reactions.sql"]
  n103["bot/migrations/0053_card_ai_notes.sql"]
  n104["bot/migrations/0053_club_docs_content.sql"]
  n105["bot/migrations/0054_d1_usage_indexes.sql"]
  n106["bot/migrations/0055_lineup_home.sql"]
  n107["bot/migrations/0056_stream_sources.sql"]
  n108["bot/migrations/0056_watchlist_channel.sql"]
  n109["bot/monitor.js"]
  n110["bot/notifcenter.js"]
  n111["bot/notify.js"]
  n112["bot/panel.js"]
  n113["bot/playmedia.js"]
  n114["bot/plays.js"]
  n115["bot/points.js"]
  n116["bot/predict.js"]
  n117["bot/probuilds.js"]
  n118["bot/profanity.js"]
  n119["bot/profiles.js"]
  n120["bot/ratings.js"]
  n121["bot/recs.js"]
  n122["bot/register.mjs"]
  n123["bot/reminders.js"]
  n124["bot/roles.js"]
  n125["bot/servertools.js"]
  n126["bot/settings.js"]
  n127["bot/social.js"]
  n128["bot/squads.js"]
  n129["bot/statinsights.js"]
  n130["bot/streamalerts.js"]
  n131["bot/trials.js"]
  n132["bot/ui.js"]
  n133["bot/vapid-gen.mjs"]
  n134["bot/voicerecap.js"]
  n135["bot/watchlist.js"]
  n136["bot/webpush.js"]
  n137["bot/worker.js"]
  n0 --> n1
  n1 --> n124
  n2 --> n21
  n2 --> n39
  n2 --> n124
  n2 --> n126
  n2 --> n132
  n5 --> n16
  n5 --> n21
  n5 --> n111
  n5 --> n124
  n5 --> n126
  n5 --> n132
  n6 --> n111
  n6 --> n124
  n7 --> n5
  n7 --> n21
  n7 --> n25
  n7 --> n27
  n7 --> n29
  n7 --> n34
  n7 --> n39
  n7 --> n50
  n7 --> n111
  n7 --> n114
  n7 --> n115
  n7 --> n124
  n7 --> n131
  n7 --> n132
  n8 --> n17
  n8 --> n21
  n8 --> n124
  n8 --> n132
  n9 --> n31
  n9 --> n124
  n10 --> n11
  n10 --> n15
  n10 --> n124
  n10 --> n132
  n11 --> n39
  n11 --> n132
  n12 --> n48
  n12 --> n111
  n12 --> n124
  n13 --> n111
  n13 --> n124
  n20 --> n21
  n20 --> n111
  n20 --> n124
  n20 --> n132
  n21 --> n111
  n21 --> n124
  n21 --> n132
  n23 --> n41
  n25 --> n16
  n25 --> n21
  n25 --> n27
  n25 --> n44
  n25 --> n48
  n25 --> n110
  n25 --> n111
  n25 --> n115
  n25 --> n119
  n25 --> n124
  n25 --> n126
  n25 --> n132
  n26 --> n124
  n28 --> n2
  n28 --> n21
  n28 --> n48
  n28 --> n111
  n28 --> n124
  n28 --> n127
  n28 --> n132
  n29 --> n111
  n29 --> n124
  n30 --> n39
  n30 --> n124
  n30 --> n132
  n31 --> n111
  n31 --> n124
  n32 --> n124
  n33 --> n116
  n33 --> n124
  n34 --> n25
  n34 --> n125
  n34 --> n132
  n35 --> n5
  n35 --> n21
  n35 --> n111
  n35 --> n124
  n35 --> n132
  n36 --> n5
  n36 --> n111
  n36 --> n124
  n36 --> n127
  n38 --> n39
  n38 --> n111
  n38 --> n132
  n39 --> n22
  n39 --> n41
  n42 --> n111
  n42 --> n124
  n42 --> n132
  n43 --> n124
  n44 --> n0
  n44 --> n25
  n44 --> n124
  n45 --> n2
  n45 --> n21
  n45 --> n39
  n45 --> n111
  n45 --> n124
  n45 --> n130
  n45 --> n132
  n46 --> n5
  n46 --> n6
  n46 --> n111
  n46 --> n124
  n47 --> n132
  n48 --> n111
  n48 --> n124
  n49 --> n2
  n49 --> n21
  n49 --> n39
  n49 --> n45
  n49 --> n124
  n49 --> n130
  n49 --> n132
  n50 --> n0
  n50 --> n2
  n50 --> n4
  n50 --> n5
  n50 --> n6
  n50 --> n8
  n50 --> n9
  n50 --> n10
  n50 --> n12
  n50 --> n13
  n50 --> n15
  n50 --> n18
  n50 --> n19
  n50 --> n20
  n50 --> n21
  n50 --> n25
  n50 --> n27
  n50 --> n28
  n50 --> n29
  n50 --> n30
  n50 --> n31
  n50 --> n32
  n50 --> n33
  n50 --> n35
  n50 --> n36
  n50 --> n42
  n50 --> n43
  n50 --> n45
  n50 --> n46
  n50 --> n48
  n50 --> n49
  n50 --> n111
  n50 --> n112
  n50 --> n113
  n50 --> n114
  n50 --> n115
  n50 --> n116
  n50 --> n117
  n50 --> n119
  n50 --> n120
  n50 --> n121
  n50 --> n124
  n50 --> n126
  n50 --> n127
  n50 --> n128
  n50 --> n129
  n50 --> n131
  n50 --> n135
  n50 --> n136
  n109 --> n132
  n110 --> n124
  n111 --> n16
  n111 --> n27
  n111 --> n110
  n111 --> n124
  n111 --> n132
  n111 --> n136
  n112 --> n27
  n112 --> n50
  n112 --> n124
  n112 --> n132
  n113 --> n21
  n113 --> n124
  n113 --> n132
  n114 --> n16
  n114 --> n21
  n114 --> n111
  n114 --> n124
  n114 --> n132
  n115 --> n124
  n116 --> n25
  n116 --> n111
  n116 --> n115
  n116 --> n124
  n117 --> n9
  n117 --> n124
  n118 --> n111
  n118 --> n115
  n118 --> n124
  n119 --> n6
  n119 --> n117
  n119 --> n120
  n119 --> n124
  n120 --> n5
  n120 --> n115
  n120 --> n124
  n121 --> n124
  n122 --> n17
  n123 --> n110
  n123 --> n111
  n123 --> n124
  n125 --> n27
  n125 --> n124
  n125 --> n132
  n126 --> n8
  n126 --> n124
  n127 --> n111
  n127 --> n124
  n128 --> n21
  n128 --> n111
  n128 --> n124
  n128 --> n132
  n129 --> n1
  n129 --> n124
  n129 --> n132
  n130 --> n21
  n130 --> n39
  n130 --> n49
  n130 --> n124
  n130 --> n126
  n130 --> n132
  n130 --> n135
  n131 --> n111
  n131 --> n124
  n132 --> n39
  n134 --> n111
  n134 --> n132
  n135 --> n21
  n135 --> n124
  n135 --> n132
  n137 --> n1
  n137 --> n3
  n137 --> n4
  n137 --> n5
  n137 --> n7
  n137 --> n8
  n137 --> n10
  n137 --> n12
  n137 --> n14
  n137 --> n16
  n137 --> n19
  n137 --> n20
  n137 --> n21
  n137 --> n25
  n137 --> n26
  n137 --> n27
  n137 --> n30
  n137 --> n34
  n137 --> n35
  n137 --> n36
  n137 --> n37
  n137 --> n38
  n137 --> n39
  n137 --> n42
  n137 --> n43
  n137 --> n45
  n137 --> n47
  n137 --> n48
  n137 --> n49
  n137 --> n50
  n137 --> n109
  n137 --> n111
  n137 --> n112
  n137 --> n116
  n137 --> n118
  n137 --> n123
  n137 --> n124
  n137 --> n125
  n137 --> n129
  n137 --> n130
  n137 --> n132
  n137 --> n134
  n137 --> n135
```
