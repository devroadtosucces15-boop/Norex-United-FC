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
  n102["bot/monitor.js"]
  n103["bot/notify.js"]
  n104["bot/panel.js"]
  n105["bot/playmedia.js"]
  n106["bot/plays.js"]
  n107["bot/points.js"]
  n108["bot/predict.js"]
  n109["bot/probuilds.js"]
  n110["bot/profanity.js"]
  n111["bot/profiles.js"]
  n112["bot/ratings.js"]
  n113["bot/recs.js"]
  n114["bot/register.mjs"]
  n115["bot/reminders.js"]
  n116["bot/roles.js"]
  n117["bot/servertools.js"]
  n118["bot/settings.js"]
  n119["bot/social.js"]
  n120["bot/squads.js"]
  n121["bot/statinsights.js"]
  n122["bot/trials.js"]
  n123["bot/ui.js"]
  n124["bot/vapid-gen.mjs"]
  n125["bot/voicerecap.js"]
  n126["bot/watchlist.js"]
  n127["bot/webpush.js"]
  n128["bot/worker.js"]
  n0 --> n1
  n1 --> n116
  n4 --> n15
  n4 --> n20
  n4 --> n103
  n4 --> n116
  n4 --> n118
  n4 --> n123
  n5 --> n103
  n5 --> n116
  n6 --> n4
  n6 --> n20
  n6 --> n24
  n6 --> n26
  n6 --> n28
  n6 --> n33
  n6 --> n38
  n6 --> n49
  n6 --> n103
  n6 --> n106
  n6 --> n107
  n6 --> n116
  n6 --> n122
  n6 --> n123
  n7 --> n16
  n7 --> n20
  n7 --> n116
  n7 --> n123
  n8 --> n30
  n8 --> n116
  n9 --> n10
  n9 --> n14
  n9 --> n116
  n9 --> n123
  n10 --> n38
  n10 --> n123
  n11 --> n47
  n11 --> n103
  n11 --> n116
  n12 --> n103
  n12 --> n116
  n19 --> n20
  n19 --> n103
  n19 --> n116
  n19 --> n123
  n20 --> n103
  n20 --> n116
  n20 --> n123
  n22 --> n40
  n24 --> n15
  n24 --> n20
  n24 --> n26
  n24 --> n43
  n24 --> n47
  n24 --> n103
  n24 --> n107
  n24 --> n111
  n24 --> n116
  n24 --> n118
  n24 --> n123
  n25 --> n116
  n27 --> n20
  n27 --> n47
  n27 --> n103
  n27 --> n116
  n27 --> n119
  n27 --> n123
  n28 --> n103
  n28 --> n116
  n29 --> n38
  n29 --> n116
  n29 --> n123
  n30 --> n103
  n30 --> n116
  n31 --> n116
  n32 --> n108
  n32 --> n116
  n33 --> n24
  n33 --> n117
  n33 --> n123
  n34 --> n4
  n34 --> n20
  n34 --> n103
  n34 --> n116
  n34 --> n123
  n35 --> n4
  n35 --> n103
  n35 --> n116
  n35 --> n119
  n37 --> n38
  n37 --> n103
  n37 --> n123
  n38 --> n21
  n38 --> n40
  n41 --> n103
  n41 --> n116
  n41 --> n123
  n43 --> n0
  n43 --> n24
  n43 --> n116
  n44 --> n20
  n44 --> n38
  n44 --> n103
  n44 --> n116
  n44 --> n123
  n45 --> n4
  n45 --> n5
  n45 --> n103
  n45 --> n116
  n46 --> n123
  n47 --> n103
  n47 --> n116
  n48 --> n20
  n48 --> n38
  n48 --> n44
  n48 --> n116
  n48 --> n123
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
  n49 --> n103
  n49 --> n104
  n49 --> n105
  n49 --> n106
  n49 --> n107
  n49 --> n108
  n49 --> n109
  n49 --> n111
  n49 --> n112
  n49 --> n113
  n49 --> n116
  n49 --> n118
  n49 --> n119
  n49 --> n120
  n49 --> n121
  n49 --> n122
  n49 --> n126
  n49 --> n127
  n102 --> n123
  n103 --> n15
  n103 --> n116
  n103 --> n123
  n103 --> n127
  n104 --> n26
  n104 --> n49
  n104 --> n116
  n104 --> n123
  n105 --> n20
  n105 --> n116
  n105 --> n123
  n106 --> n15
  n106 --> n20
  n106 --> n103
  n106 --> n116
  n106 --> n123
  n107 --> n116
  n108 --> n24
  n108 --> n103
  n108 --> n107
  n108 --> n116
  n109 --> n8
  n109 --> n116
  n110 --> n103
  n110 --> n107
  n110 --> n116
  n111 --> n5
  n111 --> n109
  n111 --> n112
  n111 --> n116
  n112 --> n4
  n112 --> n107
  n112 --> n116
  n113 --> n116
  n114 --> n16
  n115 --> n103
  n115 --> n116
  n117 --> n26
  n117 --> n116
  n117 --> n123
  n118 --> n7
  n118 --> n116
  n119 --> n103
  n119 --> n116
  n120 --> n20
  n120 --> n103
  n120 --> n116
  n120 --> n123
  n121 --> n1
  n121 --> n116
  n121 --> n123
  n122 --> n103
  n122 --> n116
  n123 --> n38
  n125 --> n103
  n125 --> n123
  n126 --> n20
  n126 --> n116
  n126 --> n123
  n128 --> n1
  n128 --> n2
  n128 --> n3
  n128 --> n4
  n128 --> n6
  n128 --> n7
  n128 --> n9
  n128 --> n11
  n128 --> n13
  n128 --> n15
  n128 --> n18
  n128 --> n19
  n128 --> n20
  n128 --> n24
  n128 --> n25
  n128 --> n26
  n128 --> n29
  n128 --> n33
  n128 --> n34
  n128 --> n35
  n128 --> n36
  n128 --> n37
  n128 --> n38
  n128 --> n41
  n128 --> n44
  n128 --> n46
  n128 --> n47
  n128 --> n48
  n128 --> n49
  n128 --> n102
  n128 --> n103
  n128 --> n104
  n128 --> n108
  n128 --> n110
  n128 --> n115
  n128 --> n116
  n128 --> n117
  n128 --> n121
  n128 --> n123
  n128 --> n125
  n128 --> n126
```
