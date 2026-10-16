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
  n105["bot/monitor.js"]
  n106["bot/notify.js"]
  n107["bot/panel.js"]
  n108["bot/playmedia.js"]
  n109["bot/plays.js"]
  n110["bot/points.js"]
  n111["bot/predict.js"]
  n112["bot/probuilds.js"]
  n113["bot/profanity.js"]
  n114["bot/profiles.js"]
  n115["bot/ratings.js"]
  n116["bot/recs.js"]
  n117["bot/register.mjs"]
  n118["bot/reminders.js"]
  n119["bot/roles.js"]
  n120["bot/servertools.js"]
  n121["bot/settings.js"]
  n122["bot/social.js"]
  n123["bot/squads.js"]
  n124["bot/statinsights.js"]
  n125["bot/trials.js"]
  n126["bot/ui.js"]
  n127["bot/vapid-gen.mjs"]
  n128["bot/voicerecap.js"]
  n129["bot/watchlist.js"]
  n130["bot/webpush.js"]
  n131["bot/worker.js"]
  n0 --> n1
  n1 --> n119
  n4 --> n15
  n4 --> n20
  n4 --> n106
  n4 --> n119
  n4 --> n121
  n4 --> n126
  n5 --> n106
  n5 --> n119
  n6 --> n4
  n6 --> n20
  n6 --> n24
  n6 --> n26
  n6 --> n28
  n6 --> n33
  n6 --> n38
  n6 --> n49
  n6 --> n106
  n6 --> n109
  n6 --> n110
  n6 --> n119
  n6 --> n125
  n6 --> n126
  n7 --> n16
  n7 --> n20
  n7 --> n119
  n7 --> n126
  n8 --> n30
  n8 --> n119
  n9 --> n10
  n9 --> n14
  n9 --> n119
  n9 --> n126
  n10 --> n38
  n10 --> n126
  n11 --> n47
  n11 --> n106
  n11 --> n119
  n12 --> n106
  n12 --> n119
  n19 --> n20
  n19 --> n106
  n19 --> n119
  n19 --> n126
  n20 --> n106
  n20 --> n119
  n20 --> n126
  n22 --> n40
  n24 --> n15
  n24 --> n20
  n24 --> n26
  n24 --> n43
  n24 --> n47
  n24 --> n106
  n24 --> n110
  n24 --> n114
  n24 --> n119
  n24 --> n121
  n24 --> n126
  n25 --> n119
  n27 --> n20
  n27 --> n47
  n27 --> n106
  n27 --> n119
  n27 --> n122
  n27 --> n126
  n28 --> n106
  n28 --> n119
  n29 --> n38
  n29 --> n119
  n29 --> n126
  n30 --> n106
  n30 --> n119
  n31 --> n119
  n32 --> n111
  n32 --> n119
  n33 --> n24
  n33 --> n120
  n33 --> n126
  n34 --> n4
  n34 --> n20
  n34 --> n106
  n34 --> n119
  n34 --> n126
  n35 --> n4
  n35 --> n106
  n35 --> n119
  n35 --> n122
  n37 --> n38
  n37 --> n106
  n37 --> n126
  n38 --> n21
  n38 --> n40
  n41 --> n106
  n41 --> n119
  n41 --> n126
  n42 --> n119
  n43 --> n0
  n43 --> n24
  n43 --> n119
  n44 --> n20
  n44 --> n38
  n44 --> n106
  n44 --> n119
  n44 --> n126
  n45 --> n4
  n45 --> n5
  n45 --> n106
  n45 --> n119
  n46 --> n126
  n47 --> n106
  n47 --> n119
  n48 --> n20
  n48 --> n38
  n48 --> n44
  n48 --> n119
  n48 --> n126
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
  n49 --> n106
  n49 --> n107
  n49 --> n108
  n49 --> n109
  n49 --> n110
  n49 --> n111
  n49 --> n112
  n49 --> n114
  n49 --> n115
  n49 --> n116
  n49 --> n119
  n49 --> n121
  n49 --> n122
  n49 --> n123
  n49 --> n124
  n49 --> n125
  n49 --> n129
  n49 --> n130
  n105 --> n126
  n106 --> n15
  n106 --> n119
  n106 --> n126
  n106 --> n130
  n107 --> n26
  n107 --> n49
  n107 --> n119
  n107 --> n126
  n108 --> n20
  n108 --> n119
  n108 --> n126
  n109 --> n15
  n109 --> n20
  n109 --> n106
  n109 --> n119
  n109 --> n126
  n110 --> n119
  n111 --> n24
  n111 --> n106
  n111 --> n110
  n111 --> n119
  n112 --> n8
  n112 --> n119
  n113 --> n106
  n113 --> n110
  n113 --> n119
  n114 --> n5
  n114 --> n112
  n114 --> n115
  n114 --> n119
  n115 --> n4
  n115 --> n110
  n115 --> n119
  n116 --> n119
  n117 --> n16
  n118 --> n106
  n118 --> n119
  n120 --> n26
  n120 --> n119
  n120 --> n126
  n121 --> n7
  n121 --> n119
  n122 --> n106
  n122 --> n119
  n123 --> n20
  n123 --> n106
  n123 --> n119
  n123 --> n126
  n124 --> n1
  n124 --> n119
  n124 --> n126
  n125 --> n106
  n125 --> n119
  n126 --> n38
  n128 --> n106
  n128 --> n126
  n129 --> n20
  n129 --> n119
  n129 --> n126
  n131 --> n1
  n131 --> n2
  n131 --> n3
  n131 --> n4
  n131 --> n6
  n131 --> n7
  n131 --> n9
  n131 --> n11
  n131 --> n13
  n131 --> n15
  n131 --> n18
  n131 --> n19
  n131 --> n20
  n131 --> n24
  n131 --> n25
  n131 --> n26
  n131 --> n29
  n131 --> n33
  n131 --> n34
  n131 --> n35
  n131 --> n36
  n131 --> n37
  n131 --> n38
  n131 --> n41
  n131 --> n42
  n131 --> n44
  n131 --> n46
  n131 --> n47
  n131 --> n48
  n131 --> n49
  n131 --> n105
  n131 --> n106
  n131 --> n107
  n131 --> n111
  n131 --> n113
  n131 --> n118
  n131 --> n119
  n131 --> n120
  n131 --> n124
  n131 --> n126
  n131 --> n128
  n131 --> n129
```
