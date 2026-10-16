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
  n107["bot/notify.js"]
  n108["bot/panel.js"]
  n109["bot/playmedia.js"]
  n110["bot/plays.js"]
  n111["bot/points.js"]
  n112["bot/predict.js"]
  n113["bot/probuilds.js"]
  n114["bot/profanity.js"]
  n115["bot/profiles.js"]
  n116["bot/ratings.js"]
  n117["bot/recs.js"]
  n118["bot/register.mjs"]
  n119["bot/reminders.js"]
  n120["bot/roles.js"]
  n121["bot/servertools.js"]
  n122["bot/settings.js"]
  n123["bot/social.js"]
  n124["bot/squads.js"]
  n125["bot/statinsights.js"]
  n126["bot/trials.js"]
  n127["bot/ui.js"]
  n128["bot/vapid-gen.mjs"]
  n129["bot/voicerecap.js"]
  n130["bot/watchlist.js"]
  n131["bot/webpush.js"]
  n132["bot/worker.js"]
  n0 --> n1
  n1 --> n120
  n4 --> n15
  n4 --> n20
  n4 --> n107
  n4 --> n120
  n4 --> n122
  n4 --> n127
  n5 --> n107
  n5 --> n120
  n6 --> n4
  n6 --> n20
  n6 --> n24
  n6 --> n26
  n6 --> n28
  n6 --> n33
  n6 --> n38
  n6 --> n49
  n6 --> n107
  n6 --> n110
  n6 --> n111
  n6 --> n120
  n6 --> n126
  n6 --> n127
  n7 --> n16
  n7 --> n20
  n7 --> n120
  n7 --> n127
  n8 --> n30
  n8 --> n120
  n9 --> n10
  n9 --> n14
  n9 --> n120
  n9 --> n127
  n10 --> n38
  n10 --> n127
  n11 --> n47
  n11 --> n107
  n11 --> n120
  n12 --> n107
  n12 --> n120
  n19 --> n20
  n19 --> n107
  n19 --> n120
  n19 --> n127
  n20 --> n107
  n20 --> n120
  n20 --> n127
  n22 --> n40
  n24 --> n15
  n24 --> n20
  n24 --> n26
  n24 --> n43
  n24 --> n47
  n24 --> n107
  n24 --> n111
  n24 --> n115
  n24 --> n120
  n24 --> n122
  n24 --> n127
  n25 --> n120
  n27 --> n20
  n27 --> n47
  n27 --> n107
  n27 --> n120
  n27 --> n123
  n27 --> n127
  n28 --> n107
  n28 --> n120
  n29 --> n38
  n29 --> n120
  n29 --> n127
  n30 --> n107
  n30 --> n120
  n31 --> n120
  n32 --> n112
  n32 --> n120
  n33 --> n24
  n33 --> n121
  n33 --> n127
  n34 --> n4
  n34 --> n20
  n34 --> n107
  n34 --> n120
  n34 --> n127
  n35 --> n4
  n35 --> n107
  n35 --> n120
  n35 --> n123
  n37 --> n38
  n37 --> n107
  n37 --> n127
  n38 --> n21
  n38 --> n40
  n41 --> n107
  n41 --> n120
  n41 --> n127
  n42 --> n120
  n43 --> n0
  n43 --> n24
  n43 --> n120
  n44 --> n20
  n44 --> n38
  n44 --> n107
  n44 --> n120
  n44 --> n127
  n45 --> n4
  n45 --> n5
  n45 --> n107
  n45 --> n120
  n46 --> n127
  n47 --> n107
  n47 --> n120
  n48 --> n20
  n48 --> n38
  n48 --> n44
  n48 --> n120
  n48 --> n127
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
  n49 --> n107
  n49 --> n108
  n49 --> n109
  n49 --> n110
  n49 --> n111
  n49 --> n112
  n49 --> n113
  n49 --> n115
  n49 --> n116
  n49 --> n117
  n49 --> n120
  n49 --> n122
  n49 --> n123
  n49 --> n124
  n49 --> n125
  n49 --> n126
  n49 --> n130
  n49 --> n131
  n106 --> n127
  n107 --> n15
  n107 --> n26
  n107 --> n120
  n107 --> n127
  n107 --> n131
  n108 --> n26
  n108 --> n49
  n108 --> n120
  n108 --> n127
  n109 --> n20
  n109 --> n120
  n109 --> n127
  n110 --> n15
  n110 --> n20
  n110 --> n107
  n110 --> n120
  n110 --> n127
  n111 --> n120
  n112 --> n24
  n112 --> n107
  n112 --> n111
  n112 --> n120
  n113 --> n8
  n113 --> n120
  n114 --> n107
  n114 --> n111
  n114 --> n120
  n115 --> n5
  n115 --> n113
  n115 --> n116
  n115 --> n120
  n116 --> n4
  n116 --> n111
  n116 --> n120
  n117 --> n120
  n118 --> n16
  n119 --> n107
  n119 --> n120
  n121 --> n26
  n121 --> n120
  n121 --> n127
  n122 --> n7
  n122 --> n120
  n123 --> n107
  n123 --> n120
  n124 --> n20
  n124 --> n107
  n124 --> n120
  n124 --> n127
  n125 --> n1
  n125 --> n120
  n125 --> n127
  n126 --> n107
  n126 --> n120
  n127 --> n38
  n129 --> n107
  n129 --> n127
  n130 --> n20
  n130 --> n120
  n130 --> n127
  n132 --> n1
  n132 --> n2
  n132 --> n3
  n132 --> n4
  n132 --> n6
  n132 --> n7
  n132 --> n9
  n132 --> n11
  n132 --> n13
  n132 --> n15
  n132 --> n18
  n132 --> n19
  n132 --> n20
  n132 --> n24
  n132 --> n25
  n132 --> n26
  n132 --> n29
  n132 --> n33
  n132 --> n34
  n132 --> n35
  n132 --> n36
  n132 --> n37
  n132 --> n38
  n132 --> n41
  n132 --> n42
  n132 --> n44
  n132 --> n46
  n132 --> n47
  n132 --> n48
  n132 --> n49
  n132 --> n106
  n132 --> n107
  n132 --> n108
  n132 --> n112
  n132 --> n114
  n132 --> n119
  n132 --> n120
  n132 --> n121
  n132 --> n125
  n132 --> n127
  n132 --> n129
  n132 --> n130
```
