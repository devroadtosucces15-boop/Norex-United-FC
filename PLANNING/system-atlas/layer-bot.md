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
  n107["bot/monitor.js"]
  n108["bot/notifcenter.js"]
  n109["bot/notify.js"]
  n110["bot/panel.js"]
  n111["bot/playmedia.js"]
  n112["bot/plays.js"]
  n113["bot/points.js"]
  n114["bot/predict.js"]
  n115["bot/probuilds.js"]
  n116["bot/profanity.js"]
  n117["bot/profiles.js"]
  n118["bot/ratings.js"]
  n119["bot/recs.js"]
  n120["bot/register.mjs"]
  n121["bot/reminders.js"]
  n122["bot/roles.js"]
  n123["bot/servertools.js"]
  n124["bot/settings.js"]
  n125["bot/social.js"]
  n126["bot/squads.js"]
  n127["bot/statinsights.js"]
  n128["bot/trials.js"]
  n129["bot/ui.js"]
  n130["bot/vapid-gen.mjs"]
  n131["bot/voicerecap.js"]
  n132["bot/watchlist.js"]
  n133["bot/webpush.js"]
  n134["bot/worker.js"]
  n0 --> n1
  n1 --> n122
  n2 --> n21
  n2 --> n39
  n2 --> n122
  n2 --> n124
  n2 --> n129
  n5 --> n16
  n5 --> n21
  n5 --> n109
  n5 --> n122
  n5 --> n124
  n5 --> n129
  n6 --> n109
  n6 --> n122
  n7 --> n5
  n7 --> n21
  n7 --> n25
  n7 --> n27
  n7 --> n29
  n7 --> n34
  n7 --> n39
  n7 --> n50
  n7 --> n109
  n7 --> n112
  n7 --> n113
  n7 --> n122
  n7 --> n128
  n7 --> n129
  n8 --> n17
  n8 --> n21
  n8 --> n122
  n8 --> n129
  n9 --> n31
  n9 --> n122
  n10 --> n11
  n10 --> n15
  n10 --> n122
  n10 --> n129
  n11 --> n39
  n11 --> n129
  n12 --> n48
  n12 --> n109
  n12 --> n122
  n13 --> n109
  n13 --> n122
  n20 --> n21
  n20 --> n109
  n20 --> n122
  n20 --> n129
  n21 --> n109
  n21 --> n122
  n21 --> n129
  n23 --> n41
  n25 --> n16
  n25 --> n21
  n25 --> n27
  n25 --> n44
  n25 --> n48
  n25 --> n108
  n25 --> n109
  n25 --> n113
  n25 --> n117
  n25 --> n122
  n25 --> n124
  n25 --> n129
  n26 --> n122
  n28 --> n2
  n28 --> n21
  n28 --> n48
  n28 --> n109
  n28 --> n122
  n28 --> n125
  n28 --> n129
  n29 --> n109
  n29 --> n122
  n30 --> n39
  n30 --> n122
  n30 --> n129
  n31 --> n109
  n31 --> n122
  n32 --> n122
  n33 --> n114
  n33 --> n122
  n34 --> n25
  n34 --> n123
  n34 --> n129
  n35 --> n5
  n35 --> n21
  n35 --> n109
  n35 --> n122
  n35 --> n129
  n36 --> n5
  n36 --> n109
  n36 --> n122
  n36 --> n125
  n38 --> n39
  n38 --> n109
  n38 --> n129
  n39 --> n22
  n39 --> n41
  n42 --> n109
  n42 --> n122
  n42 --> n129
  n43 --> n122
  n44 --> n0
  n44 --> n25
  n44 --> n122
  n45 --> n2
  n45 --> n21
  n45 --> n39
  n45 --> n109
  n45 --> n122
  n45 --> n129
  n46 --> n5
  n46 --> n6
  n46 --> n109
  n46 --> n122
  n47 --> n129
  n48 --> n109
  n48 --> n122
  n49 --> n2
  n49 --> n21
  n49 --> n39
  n49 --> n45
  n49 --> n122
  n49 --> n129
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
  n50 --> n109
  n50 --> n110
  n50 --> n111
  n50 --> n112
  n50 --> n113
  n50 --> n114
  n50 --> n115
  n50 --> n117
  n50 --> n118
  n50 --> n119
  n50 --> n122
  n50 --> n124
  n50 --> n125
  n50 --> n126
  n50 --> n127
  n50 --> n128
  n50 --> n132
  n50 --> n133
  n107 --> n129
  n108 --> n122
  n109 --> n16
  n109 --> n27
  n109 --> n108
  n109 --> n122
  n109 --> n129
  n109 --> n133
  n110 --> n27
  n110 --> n50
  n110 --> n122
  n110 --> n129
  n111 --> n21
  n111 --> n122
  n111 --> n129
  n112 --> n16
  n112 --> n21
  n112 --> n109
  n112 --> n122
  n112 --> n129
  n113 --> n122
  n114 --> n25
  n114 --> n109
  n114 --> n113
  n114 --> n122
  n115 --> n9
  n115 --> n122
  n116 --> n109
  n116 --> n113
  n116 --> n122
  n117 --> n6
  n117 --> n115
  n117 --> n118
  n117 --> n122
  n118 --> n5
  n118 --> n113
  n118 --> n122
  n119 --> n122
  n120 --> n17
  n121 --> n108
  n121 --> n109
  n121 --> n122
  n123 --> n27
  n123 --> n122
  n123 --> n129
  n124 --> n8
  n124 --> n122
  n125 --> n109
  n125 --> n122
  n126 --> n21
  n126 --> n109
  n126 --> n122
  n126 --> n129
  n127 --> n1
  n127 --> n122
  n127 --> n129
  n128 --> n109
  n128 --> n122
  n129 --> n39
  n131 --> n109
  n131 --> n129
  n132 --> n21
  n132 --> n122
  n132 --> n129
  n134 --> n1
  n134 --> n3
  n134 --> n4
  n134 --> n5
  n134 --> n7
  n134 --> n8
  n134 --> n10
  n134 --> n12
  n134 --> n14
  n134 --> n16
  n134 --> n19
  n134 --> n20
  n134 --> n21
  n134 --> n25
  n134 --> n26
  n134 --> n27
  n134 --> n30
  n134 --> n34
  n134 --> n35
  n134 --> n36
  n134 --> n37
  n134 --> n38
  n134 --> n39
  n134 --> n42
  n134 --> n43
  n134 --> n45
  n134 --> n47
  n134 --> n48
  n134 --> n49
  n134 --> n50
  n134 --> n107
  n134 --> n109
  n134 --> n110
  n134 --> n114
  n134 --> n116
  n134 --> n121
  n134 --> n122
  n134 --> n123
  n134 --> n127
  n134 --> n129
  n134 --> n131
  n134 --> n132
```
