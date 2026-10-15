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
  n102["bot/migrations/0053_club_docs_content.sql"]
  n103["bot/monitor.js"]
  n104["bot/notify.js"]
  n105["bot/panel.js"]
  n106["bot/playmedia.js"]
  n107["bot/plays.js"]
  n108["bot/points.js"]
  n109["bot/predict.js"]
  n110["bot/probuilds.js"]
  n111["bot/profanity.js"]
  n112["bot/profiles.js"]
  n113["bot/ratings.js"]
  n114["bot/recs.js"]
  n115["bot/register.mjs"]
  n116["bot/reminders.js"]
  n117["bot/roles.js"]
  n118["bot/servertools.js"]
  n119["bot/settings.js"]
  n120["bot/social.js"]
  n121["bot/squads.js"]
  n122["bot/statinsights.js"]
  n123["bot/trials.js"]
  n124["bot/ui.js"]
  n125["bot/vapid-gen.mjs"]
  n126["bot/voicerecap.js"]
  n127["bot/watchlist.js"]
  n128["bot/webpush.js"]
  n129["bot/worker.js"]
  n0 --> n1
  n1 --> n117
  n4 --> n15
  n4 --> n20
  n4 --> n104
  n4 --> n117
  n4 --> n119
  n4 --> n124
  n5 --> n104
  n5 --> n117
  n6 --> n4
  n6 --> n20
  n6 --> n24
  n6 --> n26
  n6 --> n28
  n6 --> n33
  n6 --> n38
  n6 --> n49
  n6 --> n104
  n6 --> n107
  n6 --> n108
  n6 --> n117
  n6 --> n123
  n6 --> n124
  n7 --> n16
  n7 --> n20
  n7 --> n117
  n7 --> n124
  n8 --> n30
  n8 --> n117
  n9 --> n10
  n9 --> n14
  n9 --> n117
  n9 --> n124
  n10 --> n38
  n10 --> n124
  n11 --> n47
  n11 --> n104
  n11 --> n117
  n12 --> n104
  n12 --> n117
  n19 --> n20
  n19 --> n104
  n19 --> n117
  n19 --> n124
  n20 --> n104
  n20 --> n117
  n20 --> n124
  n22 --> n40
  n24 --> n15
  n24 --> n20
  n24 --> n26
  n24 --> n43
  n24 --> n47
  n24 --> n104
  n24 --> n108
  n24 --> n112
  n24 --> n117
  n24 --> n119
  n24 --> n124
  n25 --> n117
  n27 --> n20
  n27 --> n47
  n27 --> n104
  n27 --> n117
  n27 --> n120
  n27 --> n124
  n28 --> n104
  n28 --> n117
  n29 --> n38
  n29 --> n117
  n29 --> n124
  n30 --> n104
  n30 --> n117
  n31 --> n117
  n32 --> n109
  n32 --> n117
  n33 --> n24
  n33 --> n118
  n33 --> n124
  n34 --> n4
  n34 --> n20
  n34 --> n104
  n34 --> n117
  n34 --> n124
  n35 --> n4
  n35 --> n104
  n35 --> n117
  n35 --> n120
  n37 --> n38
  n37 --> n104
  n37 --> n124
  n38 --> n21
  n38 --> n40
  n41 --> n104
  n41 --> n117
  n41 --> n124
  n43 --> n0
  n43 --> n24
  n43 --> n117
  n44 --> n20
  n44 --> n38
  n44 --> n104
  n44 --> n117
  n44 --> n124
  n45 --> n4
  n45 --> n5
  n45 --> n104
  n45 --> n117
  n46 --> n124
  n47 --> n104
  n47 --> n117
  n48 --> n20
  n48 --> n38
  n48 --> n44
  n48 --> n117
  n48 --> n124
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
  n49 --> n104
  n49 --> n105
  n49 --> n106
  n49 --> n107
  n49 --> n108
  n49 --> n109
  n49 --> n110
  n49 --> n112
  n49 --> n113
  n49 --> n114
  n49 --> n117
  n49 --> n119
  n49 --> n120
  n49 --> n121
  n49 --> n122
  n49 --> n123
  n49 --> n127
  n49 --> n128
  n103 --> n124
  n104 --> n15
  n104 --> n117
  n104 --> n124
  n104 --> n128
  n105 --> n26
  n105 --> n49
  n105 --> n117
  n105 --> n124
  n106 --> n20
  n106 --> n117
  n106 --> n124
  n107 --> n15
  n107 --> n20
  n107 --> n104
  n107 --> n117
  n107 --> n124
  n108 --> n117
  n109 --> n24
  n109 --> n104
  n109 --> n108
  n109 --> n117
  n110 --> n8
  n110 --> n117
  n111 --> n104
  n111 --> n108
  n111 --> n117
  n112 --> n5
  n112 --> n110
  n112 --> n113
  n112 --> n117
  n113 --> n4
  n113 --> n108
  n113 --> n117
  n114 --> n117
  n115 --> n16
  n116 --> n104
  n116 --> n117
  n118 --> n26
  n118 --> n117
  n118 --> n124
  n119 --> n7
  n119 --> n117
  n120 --> n104
  n120 --> n117
  n121 --> n20
  n121 --> n104
  n121 --> n117
  n121 --> n124
  n122 --> n1
  n122 --> n117
  n122 --> n124
  n123 --> n104
  n123 --> n117
  n124 --> n38
  n126 --> n104
  n126 --> n124
  n127 --> n20
  n127 --> n117
  n127 --> n124
  n129 --> n1
  n129 --> n2
  n129 --> n3
  n129 --> n4
  n129 --> n6
  n129 --> n7
  n129 --> n9
  n129 --> n11
  n129 --> n13
  n129 --> n15
  n129 --> n18
  n129 --> n19
  n129 --> n20
  n129 --> n24
  n129 --> n25
  n129 --> n26
  n129 --> n29
  n129 --> n33
  n129 --> n34
  n129 --> n35
  n129 --> n36
  n129 --> n37
  n129 --> n38
  n129 --> n41
  n129 --> n44
  n129 --> n46
  n129 --> n47
  n129 --> n48
  n129 --> n49
  n129 --> n103
  n129 --> n104
  n129 --> n105
  n129 --> n109
  n129 --> n111
  n129 --> n116
  n129 --> n117
  n129 --> n118
  n129 --> n122
  n129 --> n124
  n129 --> n126
  n129 --> n127
```
