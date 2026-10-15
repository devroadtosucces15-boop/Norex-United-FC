# DATABASE source connections

Static source references; this does not prove runtime invocation or SQL lineage. Top 100 by reference count.

```mermaid
flowchart LR
  n0[".github/workflows/backup.yml"]
  n1[".github/workflows/ea-relay.yml"]
  n2[".github/workflows/update.yml"]
  n3["TABLE D1"]
  n4["TABLE Discord"]
  n5["TABLE EA"]
  n6["TABLE League"]
  n7["TABLE SET"]
  n8["TABLE The"]
  n9["TABLE You"]
  n10["TABLE a"]
  n11["TABLE achievements"]
  n12["TABLE activity"]
  n13["TABLE alerts"]
  n14["TABLE api"]
  n15["TABLE archived"]
  n16["TABLE availability"]
  n17["TABLE avatar_cards"]
  n18["TABLE award_categories"]
  n19["TABLE award_votes"]
  n20["TABLE award_weeks"]
  n21["TABLE award_winners"]
  n22["TABLE badges"]
  n23["TABLE both"]
  n24["TABLE build"]
  n25["TABLE build_comments"]
  n26["TABLE builds"]
  n27["TABLE burner_clubs"]
  n28["TABLE card_requests"]
  n29["TABLE card_templates"]
  n30["TABLE card_unlocks"]
  n31["TABLE chat_messages"]
  n32["TABLE chats"]
  n33["TABLE claims"]
  n34["TABLE class"]
  n35["TABLE club_index"]
  n36["TABLE confirmed"]
  n37["TABLE data"]
  n38["TABLE discoveries"]
  n39["TABLE doc_acks"]
  n40["TABLE docs"]
  n41["TABLE ea_relay"]
  n42["TABLE event_checkins"]
  n43["TABLE event_rsvps"]
  n44["TABLE events"]
  n45["TABLE every"]
  n46["TABLE everyone"]
  n47["TABLE feedback"]
  n48["TABLE flag_overrides"]
  n49["TABLE fun_trivia_q"]
  n50["TABLE fun_trivia_scores"]
  n51["TABLE fun_wheels"]
  n52["TABLE guild_members"]
  n53["TABLE hof"]
  n54["TABLE hotw"]
  n55["TABLE hotw_votes"]
  n56["TABLE in"]
  n57["TABLE issue_reports"]
  n58["TABLE it"]
  n59["TABLE media"]
  n60["TABLE member_live"]
  n61["TABLE members"]
  n62["TABLE meta"]
  n63["TABLE my"]
  n64["TABLE my_builds"]
  n65["TABLE notes"]
  n66["TABLE notifications"]
  n67["TABLE notify_prefs"]
  n68["TABLE of"]
  n69["TABLE on"]
  n70["TABLE one"]
  n71["TABLE other"]
  n72["TABLE our"]
  n73["TABLE pathlib"]
  n74["TABLE play_assign"]
  n75["TABLE play_media"]
  n76["TABLE plays"]
  n77["TABLE points_log"]
  n78["TABLE post_comments"]
  n79["TABLE post_reactions"]
  n80["TABLE posts"]
  n81["TABLE predictions"]
  n82["TABLE profiles"]
  n83["TABLE push_subs"]
  n84["TABLE reminders"]
  n85["TABLE requests"]
  n86["TABLE rush_matches"]
  n87["TABLE rush_players"]
  n88["TABLE rush_prefs"]
  n89["TABLE site"]
  n90["TABLE star_ratings"]
  n91["TABLE stat_insight_feedback"]
  n92["TABLE stat_insights"]
  n93["TABLE stats"]
  n94["TABLE suggestions"]
  n95["TABLE that"]
  n96["TABLE the"]
  n97["TABLE their"]
  n98["TABLE this"]
  n99["TABLE trials"]
  n100["TABLE users"]
  n101["TABLE votes"]
  n102["TABLE your"]
  n103["bot/aiinsights.js"]
  n104["bot/avatarcard.js"]
  n105["bot/awards.js"]
  n106["bot/badges.js"]
  n107["bot/botcmds.js"]
  n108["bot/botcommands.js"]
  n109["bot/builds.js"]
  n110["bot/burners.js"]
  n111["bot/burnerstats.js"]
  n112["bot/cardstudio.js"]
  n113["bot/chat.js"]
  n114["bot/clublookup.js"]
  n115["bot/commanddefs.js"]
  n116["bot/crawl.js"]
  n117["bot/discordroles.js"]
  n118["bot/discoveries.js"]
  n119["bot/docs.js"]
  n120["bot/events.js"]
  n121["bot/exportcontent.js"]
  n122["bot/faces.js"]
  n123["bot/feed.js"]
  n124["bot/feedback.js"]
  n125["bot/fun.js"]
  n126["bot/game.js"]
  n127["bot/health.js"]
  n128["bot/honours.js"]
  n129["bot/host.js"]
  n130["bot/hotw.js"]
  n131["bot/hub.js"]
  n132["bot/icons/make_icon.py"]
  n133["bot/insights.js"]
  n134["bot/issues.js"]
  n135["bot/lineuprec.js"]
  n136["bot/live.js"]
  n137["bot/locker.js"]
  n138["bot/media.js"]
  n139["bot/memberlive.js"]
  n140["bot/members.js"]
  n141["bot/migrations/0001_init.sql"]
  n142["bot/migrations/0002_roles.sql"]
  n143["bot/migrations/0003_rush.sql"]
  n144["bot/migrations/0005_trials.sql"]
  n145["bot/migrations/0006_profile2.sql"]
  n146["bot/migrations/0007_hof.sql"]
  n147["bot/migrations/0008_builds.sql"]
  n148["bot/migrations/0009_probuilds.sql"]
  n149["bot/migrations/0010_notify.sql"]
  n150["bot/migrations/0011_badges.sql"]
  n151["bot/migrations/0012_docs.sql"]
  n152["bot/migrations/0013_events.sql"]
  n153["bot/migrations/0014_wave8.sql"]
  n154["bot/migrations/0015_awards.sql"]
  n155["bot/migrations/0016_squads.sql"]
  n156["bot/migrations/0017_wave10.sql"]
  n157["bot/migrations/0018_feed.sql"]
  n158["bot/migrations/0019_media.sql"]
  n159["bot/migrations/0020_social.sql"]
  n160["bot/migrations/0021_feed_share.sql"]
  n161["bot/migrations/0022_chats.sql"]
  n162["bot/migrations/0024_crawl.sql"]
  n163["bot/migrations/0025_points.sql"]
  n164["bot/migrations/0026_profanity.sql"]
  n165["bot/migrations/0027_avatar_cards.sql"]
  n166["bot/migrations/0028_flag_overrides.sql"]
  n167["bot/migrations/0029_report_poster.sql"]
  n168["bot/migrations/0030_stat_insights.sql"]
  n169["bot/migrations/0031_plays.sql"]
  n170["bot/migrations/0032_plays_discord.sql"]
  n171["bot/migrations/0033_play_media.sql"]
  n172["bot/migrations/0034_push.sql"]
  n173["bot/migrations/0035_event_plays.sql"]
  n174["bot/migrations/0036_burners.sql"]
  n175["bot/migrations/0037_ea_relay.sql"]
  n176["bot/migrations/0038_issue_reports.sql"]
  n177["bot/migrations/0039_card_studio.sql"]
  n178["bot/migrations/0040_card_generation.sql"]
  n179["bot/migrations/0042_card_dual_outputs.sql"]
  n180["bot/migrations/0043_card_artwork_review.sql"]
  n181["bot/migrations/0044_card_kit_number.sql"]
  n182["bot/migrations/0045_card_owner_uploads.sql"]
  n183["bot/migrations/0046_server_tools.sql"]
  n184["bot/migrations/0047_fun.sql"]
  n185["bot/migrations/0049_discoveries.sql"]
  n186["bot/migrations/0051_member_live.sql"]
  n187["bot/notify.js"]
  n188["bot/panel.js"]
  n189["bot/playmedia.js"]
  n190["bot/plays.js"]
  n191["bot/points.js"]
  n192["bot/predict.js"]
  n193["bot/probuilds.js"]
  n194["bot/profanity.js"]
  n195["bot/profiles.js"]
  n196["bot/ratings.js"]
  n197["bot/recs.js"]
  n198["bot/register.mjs"]
  n199["bot/reminders.js"]
  n200["bot/roles.js"]
  n201["bot/servertools.js"]
  n202["bot/settings.js"]
  n203["bot/social.js"]
  n204["bot/squads.js"]
  n205["bot/statinsights.js"]
  n206["bot/trials.js"]
  n207["bot/voicerecap.js"]
  n208["bot/worker.js"]
  n209["data/updates/fc-27-career-mode-developer-launch-update.jso"]
  n210["data/updates/fc-27-fut-developer-launch-update.json"]
  n211["data/updates/fc-27-gameplay-developer-launch-update.json"]
  n212["data/updates/fc-27-the-grounds-developer-launch-update.jso"]
  n213["data/updates/pitch-notes-fc27-career-mode-deep-dive.json"]
  n214["data/updates/pitch-notes-fc27-fut-deep-dive.json"]
  n215["data/updates/pitch-notes-fc27-gameplay-deep-dive.json"]
  n216["data/updates/pitch-notes-fc27-launch-update.json"]
  n217["data/updates/pitch-notes-fc27-pc-deep-dive.json"]
  n218["data/updates/pitch-notes-fc27-the-grounds-deep-dive.json"]
  n219["scripts/build-atlas-explorer.py"]
  n220["scripts/build-atlas-history.py"]
  n221["scripts/build-atlas-local.py"]
  n222["scripts/build-atlas-private-view.py"]
  n223["scripts/build-system-atlas.py"]
  n224["scripts/build.mjs"]
  n225["scripts/builder-page.mjs"]
  n226["scripts/burners-page.mjs"]
  n227["scripts/docs-page.mjs"]
  n228["scripts/feed-page.mjs"]
  n229["scripts/fetch.mjs"]
  n230["scripts/leaders-page.mjs"]
  n231["scripts/messages-page.mjs"]
  n232["scripts/probuilds-page.mjs"]
  n233["scripts/serve-atlas-private.py"]
  n234["scripts/test-atlas-local.py"]
  n235["scripts/updates-page.mjs"]
  n236["scripts/updates.mjs"]
  n237["tests/ask.test.mjs"]
  n238["tests/avatarcard.test.mjs"]
  n239["tests/awards.test.mjs"]
  n240["tests/badges.test.mjs"]
  n241["tests/builds.test.mjs"]
  n242["tests/burners-api.test.mjs"]
  n243["tests/burners.test.mjs"]
  n244["tests/cardstudio.test.mjs"]
  n245["tests/chat.test.mjs"]
  n246["tests/clublookup.test.mjs"]
  n247["tests/discoveries.test.mjs"]
  n248["tests/docs.test.mjs"]
  n249["tests/events.test.mjs"]
  n250["tests/feed.test.mjs"]
  n251["tests/fun.test.mjs"]
  n252["tests/honours.test.mjs"]
  n253["tests/host.test.mjs"]
  n254["tests/insights.test.mjs"]
  n255["tests/issues.test.mjs"]
  n256["tests/locker.test.mjs"]
  n257["tests/media.test.mjs"]
  n258["tests/memberlive.test.mjs"]
  n259["tests/members.test.mjs"]
  n260["tests/mock.mjs"]
  n261["tests/next.test.mjs"]
  n262["tests/packs.test.mjs"]
  n263["tests/panel.test.mjs"]
  n264["tests/playmedia.test.mjs"]
  n265["tests/plays.test.mjs"]
  n266["tests/probuilds.test.mjs"]
  n267["tests/push.test.mjs"]
  n268["tests/quickcommands.test.mjs"]
  n269["tests/reminders.test.mjs"]
  n270["tests/servertools.test.mjs"]
  n271["tests/site.test.mjs"]
  n272["tests/social.test.mjs"]
  n273["tests/squads.test.mjs"]
  n274["tests/statinsights.test.mjs"]
  n275["tests/updates.test.mjs"]
  n276["tests/wave10.test.mjs"]
  n277["tests/wave8.test.mjs"]
  n278["web/app.js"]
  n279["web/badges.js"]
  n280["web/boardroom.js"]
  n281["web/build-math.js"]
  n282["web/builder.js"]
  n283["web/docs.js"]
  n284["web/events.js"]
  n285["web/feed-public.js"]
  n286["web/feed.js"]
  n287["web/game.js"]
  n288["web/honours.js"]
  n289["web/metrics.js"]
  n290["web/mystats.js"]
  n291["web/profile.js"]
  n292["web/recs.js"]
  n293["web/scout.js"]
  n294["web/settings.js"]
  n295["web/squads.js"]
  n296["web/trials.js"]
  n0 --> n96
  n1 --> n96
  n2 --> n5
  n2 --> n89
  n2 --> n96
  n103 --> n10
  n103 --> n96
  n103 --> n97
  n104 --> n4
  n104 --> n7
  n104 --> n17
  n105 --> n7
  n105 --> n18
  n105 --> n19
  n105 --> n20
  n105 --> n21
  n105 --> n33
  n105 --> n62
  n105 --> n96
  n106 --> n7
  n106 --> n11
  n106 --> n16
  n106 --> n22
  n106 --> n33
  n106 --> n61
  n106 --> n62
  n106 --> n70
  n106 --> n82
  n106 --> n86
  n106 --> n87
  n106 --> n96
  n106 --> n97
  n106 --> n100
  n106 --> n101
  n107 --> n12
  n107 --> n33
  n107 --> n43
  n107 --> n44
  n107 --> n77
  n107 --> n82
  n107 --> n86
  n107 --> n87
  n107 --> n96
  n107 --> n100
  n108 --> n7
  n108 --> n33
  n108 --> n62
  n109 --> n26
  n109 --> n63
  n109 --> n64
  n109 --> n102
  n110 --> n7
  n110 --> n10
  n110 --> n27
  n110 --> n41
  n110 --> n89
  n110 --> n96
  n111 --> n37
  n111 --> n96
  n112 --> n28
  n112 --> n29
  n112 --> n30
  n112 --> n33
  n112 --> n96
  n112 --> n100
  n113 --> n31
  n113 --> n32
  n113 --> n61
  n113 --> n96
  n113 --> n100
  n114 --> n5
  n114 --> n7
  n114 --> n35
  n115 --> n13
  n115 --> n61
  n115 --> n71
  n115 --> n96
  n115 --> n98
  n116 --> n7
  n116 --> n35
  n116 --> n62
  n117 --> n7
  n117 --> n33
  n117 --> n62
  n118 --> n38
  n118 --> n62
  n119 --> n7
  n119 --> n39
  n119 --> n40
  n119 --> n61
  n119 --> n62
  n119 --> n66
  n119 --> n94
  n119 --> n100
  n120 --> n5
  n120 --> n7
  n120 --> n10
  n120 --> n16
  n120 --> n33
  n120 --> n42
  n120 --> n43
  n120 --> n44
  n120 --> n61
  n120 --> n74
  n120 --> n76
  n120 --> n82
  n120 --> n86
  n120 --> n87
  n120 --> n100
  n121 --> n7
  n122 --> n10
  n122 --> n28
  n122 --> n33
  n122 --> n52
  n122 --> n100
  n123 --> n59
  n123 --> n66
  n123 --> n78
  n123 --> n79
  n123 --> n80
  n123 --> n100
  n124 --> n10
  n124 --> n33
  n124 --> n47
  n124 --> n66
  n124 --> n100
  n125 --> n7
  n125 --> n46
  n125 --> n49
  n125 --> n50
  n125 --> n51
  n125 --> n62
  n125 --> n82
  n125 --> n100
  n126 --> n10
  n126 --> n26
  n126 --> n37
  n126 --> n95
  n126 --> n100
  n127 --> n35
  n127 --> n62
  n128 --> n16
  n128 --> n20
  n128 --> n21
  n128 --> n53
  n128 --> n61
  n128 --> n101
  n129 --> n82
  n130 --> n54
  n130 --> n55
  n130 --> n62
  n130 --> n79
  n130 --> n80
  n130 --> n100
  n131 --> n11
  n131 --> n12
  n131 --> n19
  n131 --> n43
  n131 --> n44
  n131 --> n61
  n132 --> n73
  n133 --> n16
  n133 --> n33
  n133 --> n44
  n133 --> n62
  n133 --> n67
  n133 --> n85
  n133 --> n86
  n133 --> n99
  n133 --> n101
  n134 --> n57
  n135 --> n14
  n135 --> n33
  n135 --> n43
  n135 --> n44
  n135 --> n82
  n136 --> n62
  n137 --> n11
  n137 --> n19
  n137 --> n26
  n137 --> n43
  n137 --> n44
  n137 --> n61
  n137 --> n66
  n137 --> n74
  n137 --> n76
  n137 --> n101
  n138 --> n10
  n138 --> n45
  n138 --> n59
  n138 --> n72
  n138 --> n80
  n139 --> n60
  n139 --> n82
  n139 --> n97
  n140 --> n3
  n140 --> n12
  n140 --> n16
  n140 --> n18
  n140 --> n19
  n140 --> n26
  n140 --> n31
  n140 --> n32
  n140 --> n33
  n140 --> n39
  n140 --> n47
  n140 --> n48
  n140 --> n80
  n140 --> n81
  n140 --> n82
  n140 --> n83
  n140 --> n86
  n140 --> n87
  n140 --> n90
  n140 --> n94
  n140 --> n101
  n141 --> n12
  n141 --> n16
  n141 --> n82
  n141 --> n101
  n142 --> n4
  n143 --> n86
  n143 --> n87
  n144 --> n4
  n144 --> n65
  n144 --> n99
  n145 --> n82
  n146 --> n53
  n147 --> n26
  n148 --> n25
  n148 --> n26
  n148 --> n64
  n149 --> n66
  n149 --> n67
  n149 --> n85
  n150 --> n11
  n150 --> n22
  n150 --> n82
  n150 --> n93
  n151 --> n39
  n151 --> n40
  n151 --> n66
  n151 --> n94
  n152 --> n42
  n152 --> n43
  n152 --> n44
  n153 --> n44
  n153 --> n82
  n154 --> n18
  n154 --> n19
  n154 --> n20
  n154 --> n21
  n155 --> n88
  n156 --> n47
  n156 --> n81
  n156 --> n90
  n157 --> n78
  n157 --> n79
  n157 --> n80
  n158 --> n59
  n159 --> n10
  n159 --> n54
  n159 --> n55
  n160 --> n80
  n161 --> n31
  n161 --> n32
  n162 --> n35
  n162 --> n71
  n163 --> n77
  n164 --> n10
  n165 --> n17
  n166 --> n48
  n166 --> n69
  n167 --> n44
  n168 --> n91
  n168 --> n92
  n169 --> n74
  n169 --> n76
  n170 --> n76
  n171 --> n75
  n172 --> n83
  n173 --> n44
  n174 --> n27
  n175 --> n41
  n176 --> n57
  n177 --> n28
  n177 --> n29
  n177 --> n30
  n178 --> n28
  n179 --> n28
  n180 --> n28
  n181 --> n28
  n182 --> n28
  n183 --> n13
  n183 --> n52
  n183 --> n84
  n184 --> n49
  n184 --> n50
  n184 --> n51
  n185 --> n38
  n186 --> n60
  n187 --> n10
  n187 --> n39
  n187 --> n45
  n187 --> n66
  n187 --> n67
  n187 --> n83
  n187 --> n85
  n188 --> n28
  n188 --> n85
  n188 --> n86
  n188 --> n94
  n188 --> n98
  n189 --> n75
  n189 --> n76
  n190 --> n74
  n190 --> n76
  n191 --> n77
  n192 --> n44
  n192 --> n81
  n192 --> n86
  n193 --> n25
  n193 --> n26
  n193 --> n63
  n193 --> n64
  n194 --> n10
  n195 --> n4
  n195 --> n12
  n195 --> n44
  n196 --> n58
  n196 --> n90
  n197 --> n14
  n197 --> n16
  n197 --> n42
  n197 --> n43
  n197 --> n86
  n197 --> n87
  n197 --> n88
  n198 --> n61
  n199 --> n43
  n199 --> n66
  n199 --> n88
  n199 --> n90
  n199 --> n101
  n200 --> n3
  n200 --> n4
  n200 --> n48
  n201 --> n13
  n201 --> n52
  n201 --> n80
  n201 --> n84
  n202 --> n10
  n203 --> n66
  n203 --> n78
  n203 --> n80
  n204 --> n43
  n204 --> n88
  n205 --> n65
  n205 --> n91
  n205 --> n92
  n206 --> n61
  n206 --> n65
  n206 --> n99
  n207 --> n98
  n208 --> n13
  n208 --> n45
  n208 --> n95
  n209 --> n9
  n209 --> n23
  n210 --> n9
  n210 --> n102
  n211 --> n9
  n212 --> n8
  n212 --> n9
  n213 --> n102
  n214 --> n58
  n215 --> n23
  n215 --> n58
  n215 --> n102
  n216 --> n8
  n217 --> n102
  n218 --> n8
  n218 --> n102
  n219 --> n73
  n220 --> n73
  n221 --> n73
  n222 --> n73
  n223 --> n69
  n223 --> n73
  n224 --> n5
  n224 --> n6
  n224 --> n15
  n224 --> n45
  n224 --> n69
  n224 --> n70
  n224 --> n72
  n224 --> n97
  n225 --> n5
  n225 --> n24
  n226 --> n6
  n227 --> n5
  n227 --> n24
  n227 --> n72
  n228 --> n24
  n228 --> n56
  n229 --> n5
  n229 --> n6
  n229 --> n37
  n230 --> n15
  n230 --> n24
  n231 --> n56
  n232 --> n24
  n233 --> n73
  n234 --> n73
  n235 --> n5
  n235 --> n24
  n236 --> n68
  n236 --> n80
  n237 --> n71
  n237 --> n89
  n238 --> n17
  n238 --> n61
  n239 --> n12
  n239 --> n19
  n239 --> n20
  n239 --> n21
  n240 --> n11
  n240 --> n22
  n240 --> n61
  n240 --> n66
  n241 --> n26
  n241 --> n63
  n242 --> n27
  n243 --> n4
  n243 --> n27
  n243 --> n41
  n243 --> n89
  n244 --> n28
  n244 --> n29
  n244 --> n30
  n244 --> n66
  n245 --> n32
  n245 --> n66
  n245 --> n102
  n246 --> n3
  n247 --> n38
  n248 --> n12
  n248 --> n40
  n249 --> n5
  n249 --> n12
  n249 --> n16
  n249 --> n42
  n249 --> n43
  n249 --> n86
  n249 --> n87
  n250 --> n12
  n251 --> n49
  n251 --> n50
  n251 --> n51
  n252 --> n16
  n252 --> n53
  n252 --> n101
  n253 --> n28
  n253 --> n52
  n254 --> n99
  n255 --> n57
  n256 --> n11
  n256 --> n18
  n256 --> n19
  n256 --> n26
  n256 --> n43
  n256 --> n70
  n256 --> n74
  n256 --> n76
  n256 --> n101
  n257 --> n12
  n257 --> n59
  n258 --> n60
  n259 --> n16
  n260 --> n3
  n261 --> n14
  n261 --> n45
  n262 --> n45
  n263 --> n28
  n263 --> n85
  n263 --> n86
  n263 --> n94
  n264 --> n75
  n265 --> n23
  n266 --> n25
  n267 --> n67
  n267 --> n83
  n268 --> n47
  n268 --> n48
  n268 --> n94
  n268 --> n99
  n269 --> n43
  n269 --> n88
  n269 --> n90
  n269 --> n101
  n270 --> n13
  n270 --> n52
  n270 --> n84
  n271 --> n58
  n272 --> n12
  n272 --> n54
  n272 --> n55
  n272 --> n79
  n272 --> n80
  n273 --> n12
  n274 --> n14
  n274 --> n65
  n274 --> n91
  n274 --> n92
  n275 --> n68
  n276 --> n14
  n276 --> n16
  n276 --> n47
  n276 --> n81
  n276 --> n86
  n276 --> n87
  n276 --> n88
  n277 --> n36
  n277 --> n87
  n278 --> n24
  n278 --> n34
  n278 --> n36
  n278 --> n46
  n278 --> n58
  n278 --> n95
  n279 --> n93
  n279 --> n102
  n280 --> n4
  n281 --> n98
  n282 --> n24
  n282 --> n34
  n282 --> n102
  n283 --> n46
  n283 --> n71
  n284 --> n5
  n284 --> n34
  n284 --> n36
  n285 --> n56
  n286 --> n58
  n287 --> n5
  n288 --> n98
  n289 --> n5
  n289 --> n15
  n289 --> n34
  n289 --> n68
  n290 --> n102
  n291 --> n70
  n291 --> n93
  n292 --> n14
  n292 --> n97
  n293 --> n34
  n293 --> n95
  n294 --> n4
  n294 --> n34
  n295 --> n46
  n296 --> n97
```
