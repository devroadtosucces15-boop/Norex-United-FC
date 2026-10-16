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
  n104["bot/monitor.js"]
  n105["bot/notify.js"]
  n106["bot/panel.js"]
  n107["bot/playmedia.js"]
  n108["bot/plays.js"]
  n109["bot/points.js"]
  n110["bot/predict.js"]
  n111["bot/probuilds.js"]
  n112["bot/profanity.js"]
  n113["bot/profiles.js"]
  n114["bot/ratings.js"]
  n115["bot/recs.js"]
  n116["bot/register.mjs"]
  n117["bot/reminders.js"]
  n118["bot/roles.js"]
  n119["bot/servertools.js"]
  n120["bot/settings.js"]
  n121["bot/social.js"]
  n122["bot/squads.js"]
  n123["bot/statinsights.js"]
  n124["bot/trials.js"]
  n125["bot/ui.js"]
  n126["bot/vapid-gen.mjs"]
  n127["bot/voicerecap.js"]
  n128["bot/watchlist.js"]
  n129["bot/webpush.js"]
  n130["bot/worker.js"]
  n0 --> n1
  n1 --> n118
  n4 --> n15
  n4 --> n20
  n4 --> n105
  n4 --> n118
  n4 --> n120
  n4 --> n125
  n5 --> n105
  n5 --> n118
  n6 --> n4
  n6 --> n20
  n6 --> n24
  n6 --> n26
  n6 --> n28
  n6 --> n33
  n6 --> n38
  n6 --> n49
  n6 --> n105
  n6 --> n108
  n6 --> n109
  n6 --> n118
  n6 --> n124
  n6 --> n125
  n7 --> n16
  n7 --> n20
  n7 --> n118
  n7 --> n125
  n8 --> n30
  n8 --> n118
  n9 --> n10
  n9 --> n14
  n9 --> n118
  n9 --> n125
  n10 --> n38
  n10 --> n125
  n11 --> n47
  n11 --> n105
  n11 --> n118
  n12 --> n105
  n12 --> n118
  n19 --> n20
  n19 --> n105
  n19 --> n118
  n19 --> n125
  n20 --> n105
  n20 --> n118
  n20 --> n125
  n22 --> n40
  n24 --> n15
  n24 --> n20
  n24 --> n26
  n24 --> n43
  n24 --> n47
  n24 --> n105
  n24 --> n109
  n24 --> n113
  n24 --> n118
  n24 --> n120
  n24 --> n125
  n25 --> n118
  n27 --> n20
  n27 --> n47
  n27 --> n105
  n27 --> n118
  n27 --> n121
  n27 --> n125
  n28 --> n105
  n28 --> n118
  n29 --> n38
  n29 --> n118
  n29 --> n125
  n30 --> n105
  n30 --> n118
  n31 --> n118
  n32 --> n110
  n32 --> n118
  n33 --> n24
  n33 --> n119
  n33 --> n125
  n34 --> n4
  n34 --> n20
  n34 --> n105
  n34 --> n118
  n34 --> n125
  n35 --> n4
  n35 --> n105
  n35 --> n118
  n35 --> n121
  n37 --> n38
  n37 --> n105
  n37 --> n125
  n38 --> n21
  n38 --> n40
  n41 --> n105
  n41 --> n118
  n41 --> n125
  n42 --> n118
  n43 --> n0
  n43 --> n24
  n43 --> n118
  n44 --> n20
  n44 --> n38
  n44 --> n105
  n44 --> n118
  n44 --> n125
  n45 --> n4
  n45 --> n5
  n45 --> n105
  n45 --> n118
  n46 --> n125
  n47 --> n105
  n47 --> n118
  n48 --> n20
  n48 --> n38
  n48 --> n44
  n48 --> n118
  n48 --> n125
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
  n49 --> n105
  n49 --> n106
  n49 --> n107
  n49 --> n108
  n49 --> n109
  n49 --> n110
  n49 --> n111
  n49 --> n113
  n49 --> n114
  n49 --> n115
  n49 --> n118
  n49 --> n120
  n49 --> n121
  n49 --> n122
  n49 --> n123
  n49 --> n124
  n49 --> n128
  n49 --> n129
  n104 --> n125
  n105 --> n15
  n105 --> n118
  n105 --> n125
  n105 --> n129
  n106 --> n26
  n106 --> n49
  n106 --> n118
  n106 --> n125
  n107 --> n20
  n107 --> n118
  n107 --> n125
  n108 --> n15
  n108 --> n20
  n108 --> n105
  n108 --> n118
  n108 --> n125
  n109 --> n118
  n110 --> n24
  n110 --> n105
  n110 --> n109
  n110 --> n118
  n111 --> n8
  n111 --> n118
  n112 --> n105
  n112 --> n109
  n112 --> n118
  n113 --> n5
  n113 --> n111
  n113 --> n114
  n113 --> n118
  n114 --> n4
  n114 --> n109
  n114 --> n118
  n115 --> n118
  n116 --> n16
  n117 --> n105
  n117 --> n118
  n119 --> n26
  n119 --> n118
  n119 --> n125
  n120 --> n7
  n120 --> n118
  n121 --> n105
  n121 --> n118
  n122 --> n20
  n122 --> n105
  n122 --> n118
  n122 --> n125
  n123 --> n1
  n123 --> n118
  n123 --> n125
  n124 --> n105
  n124 --> n118
  n125 --> n38
  n127 --> n105
  n127 --> n125
  n128 --> n20
  n128 --> n118
  n128 --> n125
  n130 --> n1
  n130 --> n2
  n130 --> n3
  n130 --> n4
  n130 --> n6
  n130 --> n7
  n130 --> n9
  n130 --> n11
  n130 --> n13
  n130 --> n15
  n130 --> n18
  n130 --> n19
  n130 --> n20
  n130 --> n24
  n130 --> n25
  n130 --> n26
  n130 --> n29
  n130 --> n33
  n130 --> n34
  n130 --> n35
  n130 --> n36
  n130 --> n37
  n130 --> n38
  n130 --> n41
  n130 --> n42
  n130 --> n44
  n130 --> n46
  n130 --> n47
  n130 --> n48
  n130 --> n49
  n130 --> n104
  n130 --> n105
  n130 --> n106
  n130 --> n110
  n130 --> n112
  n130 --> n117
  n130 --> n118
  n130 --> n119
  n130 --> n123
  n130 --> n125
  n130 --> n127
  n130 --> n128
```
