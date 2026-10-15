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
  n21["bot/ensure-resources.mjs"]
  n22["bot/events.js"]
  n23["bot/exportcontent.js"]
  n24["bot/faces.js"]
  n25["bot/feed.js"]
  n26["bot/feedback.js"]
  n27["bot/fun.js"]
  n28["bot/game.js"]
  n29["bot/health.js"]
  n30["bot/honours.js"]
  n31["bot/host.js"]
  n32["bot/hotw.js"]
  n33["bot/hub.js"]
  n34["bot/hubroom.js"]
  n35["bot/hype.js"]
  n36["bot/icons/make_icon.py"]
  n37["bot/insights.js"]
  n38["bot/issues.js"]
  n39["bot/lineuprec.js"]
  n40["bot/live.js"]
  n41["bot/locker.js"]
  n42["bot/matchcard.js"]
  n43["bot/media.js"]
  n44["bot/memberlive.js"]
  n45["bot/members.js"]
  n46["bot/migrations/0001_init.sql"]
  n47["bot/migrations/0002_roles.sql"]
  n48["bot/migrations/0003_rush.sql"]
  n49["bot/migrations/0004_game.sql"]
  n50["bot/migrations/0005_trials.sql"]
  n51["bot/migrations/0006_profile2.sql"]
  n52["bot/migrations/0007_hof.sql"]
  n53["bot/migrations/0008_builds.sql"]
  n54["bot/migrations/0009_probuilds.sql"]
  n55["bot/migrations/0010_notify.sql"]
  n56["bot/migrations/0011_badges.sql"]
  n57["bot/migrations/0012_docs.sql"]
  n58["bot/migrations/0013_events.sql"]
  n59["bot/migrations/0014_wave8.sql"]
  n60["bot/migrations/0015_awards.sql"]
  n61["bot/migrations/0016_squads.sql"]
  n62["bot/migrations/0017_wave10.sql"]
  n63["bot/migrations/0018_feed.sql"]
  n64["bot/migrations/0019_media.sql"]
  n65["bot/migrations/0020_social.sql"]
  n66["bot/migrations/0021_feed_share.sql"]
  n67["bot/migrations/0022_chats.sql"]
  n68["bot/migrations/0023_moderation.sql"]
  n69["bot/migrations/0024_crawl.sql"]
  n70["bot/migrations/0025_points.sql"]
  n71["bot/migrations/0026_profanity.sql"]
  n72["bot/migrations/0027_avatar_cards.sql"]
  n73["bot/migrations/0028_flag_overrides.sql"]
  n74["bot/migrations/0029_report_poster.sql"]
  n75["bot/migrations/0030_stat_insights.sql"]
  n76["bot/migrations/0031_plays.sql"]
  n77["bot/migrations/0032_plays_discord.sql"]
  n78["bot/migrations/0033_play_media.sql"]
  n79["bot/migrations/0034_push.sql"]
  n80["bot/migrations/0035_event_plays.sql"]
  n81["bot/migrations/0036_burners.sql"]
  n82["bot/migrations/0037_ea_relay.sql"]
  n83["bot/migrations/0038_issue_reports.sql"]
  n84["bot/migrations/0039_card_studio.sql"]
  n85["bot/migrations/0040_card_generation.sql"]
  n86["bot/migrations/0041_export_content_cursors.sql"]
  n87["bot/migrations/0042_card_dual_outputs.sql"]
  n88["bot/migrations/0043_card_artwork_review.sql"]
  n89["bot/migrations/0044_card_kit_number.sql"]
  n90["bot/migrations/0045_card_owner_uploads.sql"]
  n91["bot/migrations/0046_server_tools.sql"]
  n92["bot/migrations/0047_fun.sql"]
  n93["bot/migrations/0048_profile_fun.sql"]
  n94["bot/migrations/0049_discoveries.sql"]
  n95["bot/migrations/0050_watchlist.sql"]
  n96["bot/migrations/0051_member_live.sql"]
  n97["bot/monitor.js"]
  n98["bot/notify.js"]
  n99["bot/panel.js"]
  n100["bot/playmedia.js"]
  n101["bot/plays.js"]
  n102["bot/points.js"]
  n103["bot/predict.js"]
  n104["bot/probuilds.js"]
  n105["bot/profanity.js"]
  n106["bot/profiles.js"]
  n107["bot/ratings.js"]
  n108["bot/recs.js"]
  n109["bot/register.mjs"]
  n110["bot/reminders.js"]
  n111["bot/roles.js"]
  n112["bot/servertools.js"]
  n113["bot/settings.js"]
  n114["bot/social.js"]
  n115["bot/squads.js"]
  n116["bot/statinsights.js"]
  n117["bot/trials.js"]
  n118["bot/ui.js"]
  n119["bot/vapid-gen.mjs"]
  n120["bot/voicerecap.js"]
  n121["bot/watchlist.js"]
  n122["bot/webpush.js"]
  n123["bot/worker.js"]
  n0 --> n1
  n1 --> n111
  n4 --> n15
  n4 --> n20
  n4 --> n98
  n4 --> n111
  n4 --> n113
  n4 --> n118
  n5 --> n98
  n5 --> n111
  n6 --> n4
  n6 --> n20
  n6 --> n22
  n6 --> n24
  n6 --> n26
  n6 --> n31
  n6 --> n45
  n6 --> n98
  n6 --> n101
  n6 --> n102
  n6 --> n111
  n6 --> n117
  n6 --> n118
  n7 --> n16
  n7 --> n20
  n7 --> n111
  n7 --> n118
  n8 --> n28
  n8 --> n111
  n9 --> n10
  n9 --> n14
  n9 --> n111
  n9 --> n118
  n10 --> n118
  n11 --> n43
  n11 --> n98
  n11 --> n111
  n12 --> n98
  n12 --> n111
  n19 --> n20
  n19 --> n98
  n19 --> n111
  n19 --> n118
  n20 --> n98
  n20 --> n111
  n20 --> n118
  n22 --> n15
  n22 --> n20
  n22 --> n24
  n22 --> n39
  n22 --> n43
  n22 --> n98
  n22 --> n102
  n22 --> n106
  n22 --> n111
  n22 --> n113
  n22 --> n118
  n23 --> n111
  n25 --> n20
  n25 --> n43
  n25 --> n98
  n25 --> n111
  n25 --> n114
  n25 --> n118
  n26 --> n98
  n26 --> n111
  n27 --> n111
  n27 --> n118
  n28 --> n98
  n28 --> n111
  n29 --> n111
  n30 --> n103
  n30 --> n111
  n31 --> n22
  n31 --> n112
  n31 --> n118
  n32 --> n4
  n32 --> n20
  n32 --> n98
  n32 --> n111
  n32 --> n118
  n33 --> n4
  n33 --> n98
  n33 --> n111
  n33 --> n114
  n35 --> n98
  n35 --> n118
  n37 --> n98
  n37 --> n111
  n37 --> n118
  n39 --> n0
  n39 --> n22
  n39 --> n111
  n40 --> n20
  n40 --> n98
  n40 --> n111
  n40 --> n118
  n41 --> n4
  n41 --> n5
  n41 --> n98
  n41 --> n111
  n42 --> n118
  n43 --> n98
  n43 --> n111
  n44 --> n20
  n44 --> n40
  n44 --> n111
  n44 --> n118
  n45 --> n0
  n45 --> n3
  n45 --> n4
  n45 --> n5
  n45 --> n7
  n45 --> n8
  n45 --> n9
  n45 --> n11
  n45 --> n12
  n45 --> n14
  n45 --> n17
  n45 --> n18
  n45 --> n19
  n45 --> n20
  n45 --> n22
  n45 --> n25
  n45 --> n26
  n45 --> n27
  n45 --> n28
  n45 --> n29
  n45 --> n30
  n45 --> n32
  n45 --> n33
  n45 --> n37
  n45 --> n38
  n45 --> n40
  n45 --> n41
  n45 --> n43
  n45 --> n44
  n45 --> n98
  n45 --> n99
  n45 --> n100
  n45 --> n101
  n45 --> n102
  n45 --> n103
  n45 --> n104
  n45 --> n106
  n45 --> n107
  n45 --> n108
  n45 --> n111
  n45 --> n113
  n45 --> n114
  n45 --> n115
  n45 --> n116
  n45 --> n117
  n45 --> n121
  n45 --> n122
  n98 --> n15
  n98 --> n111
  n98 --> n118
  n98 --> n122
  n99 --> n24
  n99 --> n45
  n99 --> n111
  n99 --> n118
  n100 --> n20
  n100 --> n111
  n100 --> n118
  n101 --> n15
  n101 --> n20
  n101 --> n98
  n101 --> n111
  n101 --> n118
  n102 --> n111
  n103 --> n22
  n103 --> n98
  n103 --> n102
  n103 --> n111
  n104 --> n8
  n104 --> n111
  n105 --> n98
  n105 --> n102
  n105 --> n111
  n106 --> n5
  n106 --> n104
  n106 --> n107
  n106 --> n111
  n107 --> n4
  n107 --> n102
  n107 --> n111
  n108 --> n111
  n109 --> n16
  n110 --> n4
  n110 --> n41
  n110 --> n98
  n110 --> n111
  n112 --> n24
  n112 --> n111
  n112 --> n118
  n113 --> n7
  n113 --> n111
  n114 --> n98
  n114 --> n111
  n115 --> n20
  n115 --> n98
  n115 --> n111
  n115 --> n118
  n116 --> n1
  n116 --> n111
  n116 --> n118
  n117 --> n98
  n117 --> n111
  n120 --> n98
  n120 --> n118
  n121 --> n20
  n121 --> n111
  n121 --> n118
  n123 --> n1
  n123 --> n2
  n123 --> n3
  n123 --> n4
  n123 --> n6
  n123 --> n7
  n123 --> n9
  n123 --> n11
  n123 --> n13
  n123 --> n15
  n123 --> n18
  n123 --> n19
  n123 --> n20
  n123 --> n22
  n123 --> n23
  n123 --> n24
  n123 --> n27
  n123 --> n31
  n123 --> n32
  n123 --> n33
  n123 --> n34
  n123 --> n35
  n123 --> n37
  n123 --> n40
  n123 --> n42
  n123 --> n43
  n123 --> n44
  n123 --> n45
  n123 --> n97
  n123 --> n98
  n123 --> n99
  n123 --> n103
  n123 --> n105
  n123 --> n110
  n123 --> n111
  n123 --> n112
  n123 --> n116
  n123 --> n118
  n123 --> n120
  n123 --> n121
```
