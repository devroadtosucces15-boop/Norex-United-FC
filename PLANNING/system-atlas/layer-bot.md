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
  n107["bot/migrations/0056_watchlist_channel.sql"]
  n108["bot/monitor.js"]
  n109["bot/notifcenter.js"]
  n110["bot/notify.js"]
  n111["bot/panel.js"]
  n112["bot/playmedia.js"]
  n113["bot/plays.js"]
  n114["bot/points.js"]
  n115["bot/predict.js"]
  n116["bot/probuilds.js"]
  n117["bot/profanity.js"]
  n118["bot/profiles.js"]
  n119["bot/ratings.js"]
  n120["bot/recs.js"]
  n121["bot/register.mjs"]
  n122["bot/reminders.js"]
  n123["bot/roles.js"]
  n124["bot/servertools.js"]
  n125["bot/settings.js"]
  n126["bot/social.js"]
  n127["bot/squads.js"]
  n128["bot/statinsights.js"]
  n129["bot/trials.js"]
  n130["bot/ui.js"]
  n131["bot/vapid-gen.mjs"]
  n132["bot/voicerecap.js"]
  n133["bot/watchlist.js"]
  n134["bot/webpush.js"]
  n135["bot/worker.js"]
  n0 --> n1
  n1 --> n123
  n2 --> n21
  n2 --> n39
  n2 --> n123
  n2 --> n125
  n2 --> n130
  n5 --> n16
  n5 --> n21
  n5 --> n110
  n5 --> n123
  n5 --> n125
  n5 --> n130
  n6 --> n110
  n6 --> n123
  n7 --> n5
  n7 --> n21
  n7 --> n25
  n7 --> n27
  n7 --> n29
  n7 --> n34
  n7 --> n39
  n7 --> n50
  n7 --> n110
  n7 --> n113
  n7 --> n114
  n7 --> n123
  n7 --> n129
  n7 --> n130
  n8 --> n17
  n8 --> n21
  n8 --> n123
  n8 --> n130
  n9 --> n31
  n9 --> n123
  n10 --> n11
  n10 --> n15
  n10 --> n123
  n10 --> n130
  n11 --> n39
  n11 --> n130
  n12 --> n48
  n12 --> n110
  n12 --> n123
  n13 --> n110
  n13 --> n123
  n20 --> n21
  n20 --> n110
  n20 --> n123
  n20 --> n130
  n21 --> n110
  n21 --> n123
  n21 --> n130
  n23 --> n41
  n25 --> n16
  n25 --> n21
  n25 --> n27
  n25 --> n44
  n25 --> n48
  n25 --> n109
  n25 --> n110
  n25 --> n114
  n25 --> n118
  n25 --> n123
  n25 --> n125
  n25 --> n130
  n26 --> n123
  n28 --> n2
  n28 --> n21
  n28 --> n48
  n28 --> n110
  n28 --> n123
  n28 --> n126
  n28 --> n130
  n29 --> n110
  n29 --> n123
  n30 --> n39
  n30 --> n123
  n30 --> n130
  n31 --> n110
  n31 --> n123
  n32 --> n123
  n33 --> n115
  n33 --> n123
  n34 --> n25
  n34 --> n124
  n34 --> n130
  n35 --> n5
  n35 --> n21
  n35 --> n110
  n35 --> n123
  n35 --> n130
  n36 --> n5
  n36 --> n110
  n36 --> n123
  n36 --> n126
  n38 --> n39
  n38 --> n110
  n38 --> n130
  n39 --> n22
  n39 --> n41
  n42 --> n110
  n42 --> n123
  n42 --> n130
  n43 --> n123
  n44 --> n0
  n44 --> n25
  n44 --> n123
  n45 --> n2
  n45 --> n21
  n45 --> n39
  n45 --> n110
  n45 --> n123
  n45 --> n130
  n46 --> n5
  n46 --> n6
  n46 --> n110
  n46 --> n123
  n47 --> n130
  n48 --> n110
  n48 --> n123
  n49 --> n2
  n49 --> n21
  n49 --> n39
  n49 --> n45
  n49 --> n123
  n49 --> n130
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
  n50 --> n110
  n50 --> n111
  n50 --> n112
  n50 --> n113
  n50 --> n114
  n50 --> n115
  n50 --> n116
  n50 --> n118
  n50 --> n119
  n50 --> n120
  n50 --> n123
  n50 --> n125
  n50 --> n126
  n50 --> n127
  n50 --> n128
  n50 --> n129
  n50 --> n133
  n50 --> n134
  n108 --> n130
  n109 --> n123
  n110 --> n16
  n110 --> n27
  n110 --> n109
  n110 --> n123
  n110 --> n130
  n110 --> n134
  n111 --> n27
  n111 --> n50
  n111 --> n123
  n111 --> n130
  n112 --> n21
  n112 --> n123
  n112 --> n130
  n113 --> n16
  n113 --> n21
  n113 --> n110
  n113 --> n123
  n113 --> n130
  n114 --> n123
  n115 --> n25
  n115 --> n110
  n115 --> n114
  n115 --> n123
  n116 --> n9
  n116 --> n123
  n117 --> n110
  n117 --> n114
  n117 --> n123
  n118 --> n6
  n118 --> n116
  n118 --> n119
  n118 --> n123
  n119 --> n5
  n119 --> n114
  n119 --> n123
  n120 --> n123
  n121 --> n17
  n122 --> n109
  n122 --> n110
  n122 --> n123
  n124 --> n27
  n124 --> n123
  n124 --> n130
  n125 --> n8
  n125 --> n123
  n126 --> n110
  n126 --> n123
  n127 --> n21
  n127 --> n110
  n127 --> n123
  n127 --> n130
  n128 --> n1
  n128 --> n123
  n128 --> n130
  n129 --> n110
  n129 --> n123
  n130 --> n39
  n132 --> n110
  n132 --> n130
  n133 --> n21
  n133 --> n123
  n133 --> n130
  n135 --> n1
  n135 --> n3
  n135 --> n4
  n135 --> n5
  n135 --> n7
  n135 --> n8
  n135 --> n10
  n135 --> n12
  n135 --> n14
  n135 --> n16
  n135 --> n19
  n135 --> n20
  n135 --> n21
  n135 --> n25
  n135 --> n26
  n135 --> n27
  n135 --> n30
  n135 --> n34
  n135 --> n35
  n135 --> n36
  n135 --> n37
  n135 --> n38
  n135 --> n39
  n135 --> n42
  n135 --> n43
  n135 --> n45
  n135 --> n47
  n135 --> n48
  n135 --> n49
  n135 --> n50
  n135 --> n108
  n135 --> n110
  n135 --> n111
  n135 --> n115
  n135 --> n117
  n135 --> n122
  n135 --> n123
  n135 --> n124
  n135 --> n128
  n135 --> n130
  n135 --> n132
  n135 --> n133
```
