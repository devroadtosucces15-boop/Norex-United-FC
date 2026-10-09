# DATABASE source connections

Static source references; this does not prove runtime invocation or SQL lineage. Top 100 by reference count.

```mermaid
flowchart LR
  n0[".github/workflows/backup.yml"]
  n1[".github/workflows/ea-relay.yml"]
  n2[".github/workflows/update.yml"]
  n3["TABLE 2"]
  n4["TABLE 5"]
  n5["TABLE Actions"]
  n6["TABLE D1"]
  n7["TABLE DISCORD_CLIENT_SECRET"]
  n8["TABLE Discord"]
  n9["TABLE EA"]
  n10["TABLE League"]
  n11["TABLE NOREX"]
  n12["TABLE PLANNING"]
  n13["TABLE SET"]
  n14["TABLE The"]
  n15["TABLE You"]
  n16["TABLE a"]
  n17["TABLE achievements"]
  n18["TABLE activity"]
  n19["TABLE api"]
  n20["TABLE archived"]
  n21["TABLE availability"]
  n22["TABLE avatar_cards"]
  n23["TABLE award_categories"]
  n24["TABLE award_votes"]
  n25["TABLE award_weeks"]
  n26["TABLE award_winners"]
  n27["TABLE badges"]
  n28["TABLE both"]
  n29["TABLE build"]
  n30["TABLE build_comments"]
  n31["TABLE builds"]
  n32["TABLE burner_clubs"]
  n33["TABLE card_requests"]
  n34["TABLE card_templates"]
  n35["TABLE card_unlocks"]
  n36["TABLE chat_messages"]
  n37["TABLE chats"]
  n38["TABLE claims"]
  n39["TABLE class"]
  n40["TABLE club_index"]
  n41["TABLE confirmed"]
  n42["TABLE data"]
  n43["TABLE doc_acks"]
  n44["TABLE docs"]
  n45["TABLE ea_relay"]
  n46["TABLE event_checkins"]
  n47["TABLE event_rsvps"]
  n48["TABLE events"]
  n49["TABLE every"]
  n50["TABLE everyone"]
  n51["TABLE feedback"]
  n52["TABLE flag_overrides"]
  n53["TABLE hof"]
  n54["TABLE hotw"]
  n55["TABLE hotw_votes"]
  n56["TABLE in"]
  n57["TABLE issue_reports"]
  n58["TABLE it"]
  n59["TABLE media"]
  n60["TABLE members"]
  n61["TABLE meta"]
  n62["TABLE my"]
  n63["TABLE my_builds"]
  n64["TABLE notes"]
  n65["TABLE notifications"]
  n66["TABLE notify_prefs"]
  n67["TABLE of"]
  n68["TABLE on"]
  n69["TABLE one"]
  n70["TABLE other"]
  n71["TABLE our"]
  n72["TABLE play_assign"]
  n73["TABLE play_media"]
  n74["TABLE plays"]
  n75["TABLE points_log"]
  n76["TABLE post_comments"]
  n77["TABLE post_reactions"]
  n78["TABLE posts"]
  n79["TABLE predictions"]
  n80["TABLE profiles"]
  n81["TABLE push_subs"]
  n82["TABLE requests"]
  n83["TABLE rush_matches"]
  n84["TABLE rush_players"]
  n85["TABLE rush_prefs"]
  n86["TABLE site"]
  n87["TABLE star_ratings"]
  n88["TABLE stat_insight_feedback"]
  n89["TABLE stat_insights"]
  n90["TABLE stats"]
  n91["TABLE suggestions"]
  n92["TABLE that"]
  n93["TABLE the"]
  n94["TABLE their"]
  n95["TABLE then"]
  n96["TABLE this"]
  n97["TABLE trials"]
  n98["TABLE users"]
  n99["TABLE votes"]
  n100["TABLE way"]
  n101["TABLE you"]
  n102["TABLE your"]
  n103["bot/aiinsights.js"]
  n104["bot/aispike.js"]
  n105["bot/avatarcard.js"]
  n106["bot/awards.js"]
  n107["bot/badges.js"]
  n108["bot/botcmds.js"]
  n109["bot/botcommands.js"]
  n110["bot/builds.js"]
  n111["bot/burners.js"]
  n112["bot/burnerstats.js"]
  n113["bot/cardstudio.js"]
  n114["bot/chat.js"]
  n115["bot/clublookup.js"]
  n116["bot/commanddefs.js"]
  n117["bot/crawl.js"]
  n118["bot/discordroles.js"]
  n119["bot/docs.js"]
  n120["bot/events.js"]
  n121["bot/exportcontent.js"]
  n122["bot/feed.js"]
  n123["bot/feedback.js"]
  n124["bot/game.js"]
  n125["bot/health.js"]
  n126["bot/honours.js"]
  n127["bot/hotw.js"]
  n128["bot/hub.js"]
  n129["bot/insights.js"]
  n130["bot/issues.js"]
  n131["bot/lineuprec.js"]
  n132["bot/locker.js"]
  n133["bot/media.js"]
  n134["bot/members.js"]
  n135["bot/migrations/0001_init.sql"]
  n136["bot/migrations/0002_roles.sql"]
  n137["bot/migrations/0003_rush.sql"]
  n138["bot/migrations/0005_trials.sql"]
  n139["bot/migrations/0006_profile2.sql"]
  n140["bot/migrations/0007_hof.sql"]
  n141["bot/migrations/0008_builds.sql"]
  n142["bot/migrations/0009_probuilds.sql"]
  n143["bot/migrations/0010_notify.sql"]
  n144["bot/migrations/0011_badges.sql"]
  n145["bot/migrations/0012_docs.sql"]
  n146["bot/migrations/0013_events.sql"]
  n147["bot/migrations/0014_wave8.sql"]
  n148["bot/migrations/0015_awards.sql"]
  n149["bot/migrations/0016_squads.sql"]
  n150["bot/migrations/0017_wave10.sql"]
  n151["bot/migrations/0018_feed.sql"]
  n152["bot/migrations/0019_media.sql"]
  n153["bot/migrations/0020_social.sql"]
  n154["bot/migrations/0021_feed_share.sql"]
  n155["bot/migrations/0022_chats.sql"]
  n156["bot/migrations/0024_crawl.sql"]
  n157["bot/migrations/0025_points.sql"]
  n158["bot/migrations/0026_profanity.sql"]
  n159["bot/migrations/0027_avatar_cards.sql"]
  n160["bot/migrations/0028_flag_overrides.sql"]
  n161["bot/migrations/0029_report_poster.sql"]
  n162["bot/migrations/0030_stat_insights.sql"]
  n163["bot/migrations/0031_plays.sql"]
  n164["bot/migrations/0032_plays_discord.sql"]
  n165["bot/migrations/0033_play_media.sql"]
  n166["bot/migrations/0034_push.sql"]
  n167["bot/migrations/0035_event_plays.sql"]
  n168["bot/migrations/0036_burners.sql"]
  n169["bot/migrations/0037_ea_relay.sql"]
  n170["bot/migrations/0038_issue_reports.sql"]
  n171["bot/migrations/0039_card_studio.sql"]
  n172["bot/migrations/0040_card_generation.sql"]
  n173["bot/migrations/0042_card_dual_outputs.sql"]
  n174["bot/migrations/0043_card_artwork_review.sql"]
  n175["bot/notify.js"]
  n176["bot/playmedia.js"]
  n177["bot/plays.js"]
  n178["bot/points.js"]
  n179["bot/predict.js"]
  n180["bot/probuilds.js"]
  n181["bot/profanity.js"]
  n182["bot/profiles.js"]
  n183["bot/ratings.js"]
  n184["bot/recs.js"]
  n185["bot/register.mjs"]
  n186["bot/roles.js"]
  n187["bot/settings.js"]
  n188["bot/social.js"]
  n189["bot/squads.js"]
  n190["bot/statinsights.js"]
  n191["bot/trials.js"]
  n192["bot/voicerecap.js"]
  n193["bot/worker.js"]
  n194["data/clubs/76051.json"]
  n195["data/matches/51032003360095.json"]
  n196["data/state.json"]
  n197["data/updates/fc-27-career-mode-developer-launch-update.jso"]
  n198["data/updates/fc-27-fut-developer-launch-update.json"]
  n199["data/updates/fc-27-gameplay-developer-launch-update.json"]
  n200["data/updates/fc-27-the-grounds-developer-launch-update.jso"]
  n201["data/updates/pitch-notes-fc27-career-mode-deep-dive.json"]
  n202["data/updates/pitch-notes-fc27-fut-deep-dive.json"]
  n203["data/updates/pitch-notes-fc27-gameplay-deep-dive.json"]
  n204["data/updates/pitch-notes-fc27-launch-update.json"]
  n205["data/updates/pitch-notes-fc27-pc-deep-dive.json"]
  n206["data/updates/pitch-notes-fc27-the-grounds-deep-dive.json"]
  n207["scripts/build-system-atlas.py"]
  n208["scripts/build.mjs"]
  n209["scripts/builder-page.mjs"]
  n210["scripts/burners-page.mjs"]
  n211["scripts/docs-page.mjs"]
  n212["scripts/ea-relay.mjs"]
  n213["scripts/feed-page.mjs"]
  n214["scripts/fetch.mjs"]
  n215["scripts/leaders-page.mjs"]
  n216["scripts/lib.mjs"]
  n217["scripts/messages-page.mjs"]
  n218["scripts/probuilds-page.mjs"]
  n219["scripts/updates-page.mjs"]
  n220["scripts/updates.mjs"]
  n221["tests/ask.test.mjs"]
  n222["tests/avatarcard.test.mjs"]
  n223["tests/awards.test.mjs"]
  n224["tests/badges.test.mjs"]
  n225["tests/builds.test.mjs"]
  n226["tests/burners.test.mjs"]
  n227["tests/cardstudio.test.mjs"]
  n228["tests/chat.test.mjs"]
  n229["tests/clublookup.test.mjs"]
  n230["tests/docs.test.mjs"]
  n231["tests/events.test.mjs"]
  n232["tests/feed.test.mjs"]
  n233["tests/honours.test.mjs"]
  n234["tests/insights.test.mjs"]
  n235["tests/issues.test.mjs"]
  n236["tests/locker.test.mjs"]
  n237["tests/media.test.mjs"]
  n238["tests/members.test.mjs"]
  n239["tests/mock.mjs"]
  n240["tests/packs.test.mjs"]
  n241["tests/playmedia.test.mjs"]
  n242["tests/plays.test.mjs"]
  n243["tests/probuilds.test.mjs"]
  n244["tests/push.test.mjs"]
  n245["tests/quickcommands.test.mjs"]
  n246["tests/site.test.mjs"]
  n247["tests/social.test.mjs"]
  n248["tests/squads.test.mjs"]
  n249["tests/statinsights.test.mjs"]
  n250["tests/updates.test.mjs"]
  n251["tests/wave10.test.mjs"]
  n252["tests/wave8.test.mjs"]
  n253["web/app.js"]
  n254["web/badges.js"]
  n255["web/boardroom.js"]
  n256["web/build-math.js"]
  n257["web/builder.js"]
  n258["web/docs.js"]
  n259["web/events.js"]
  n260["web/feed-public.js"]
  n261["web/feed.js"]
  n262["web/game.js"]
  n263["web/honours.js"]
  n264["web/metrics.js"]
  n265["web/mystats.js"]
  n266["web/notify.js"]
  n267["web/profile.js"]
  n268["web/recs.js"]
  n269["web/scout.js"]
  n270["web/settings.js"]
  n271["web/squads.js"]
  n272["web/trials.js"]
  n0 --> n93
  n1 --> n93
  n2 --> n9
  n2 --> n86
  n103 --> n16
  n103 --> n93
  n103 --> n94
  n104 --> n12
  n105 --> n8
  n105 --> n13
  n105 --> n22
  n106 --> n13
  n106 --> n23
  n106 --> n24
  n106 --> n25
  n106 --> n26
  n106 --> n38
  n106 --> n61
  n106 --> n93
  n107 --> n4
  n107 --> n17
  n107 --> n21
  n107 --> n27
  n107 --> n38
  n107 --> n60
  n107 --> n69
  n107 --> n80
  n107 --> n83
  n107 --> n84
  n107 --> n93
  n107 --> n94
  n107 --> n98
  n107 --> n99
  n108 --> n18
  n108 --> n38
  n108 --> n47
  n108 --> n48
  n108 --> n75
  n108 --> n80
  n108 --> n83
  n108 --> n84
  n108 --> n93
  n108 --> n98
  n109 --> n13
  n109 --> n38
  n109 --> n61
  n110 --> n31
  n110 --> n62
  n110 --> n63
  n110 --> n102
  n111 --> n5
  n111 --> n13
  n111 --> n16
  n111 --> n32
  n111 --> n45
  n111 --> n86
  n111 --> n95
  n112 --> n11
  n112 --> n42
  n112 --> n93
  n113 --> n33
  n113 --> n34
  n113 --> n35
  n113 --> n93
  n113 --> n98
  n114 --> n36
  n114 --> n37
  n114 --> n60
  n114 --> n93
  n114 --> n98
  n115 --> n9
  n115 --> n13
  n115 --> n40
  n116 --> n60
  n116 --> n70
  n116 --> n93
  n117 --> n13
  n117 --> n40
  n117 --> n61
  n118 --> n13
  n118 --> n38
  n118 --> n61
  n119 --> n13
  n119 --> n43
  n119 --> n44
  n119 --> n60
  n119 --> n61
  n119 --> n65
  n119 --> n91
  n119 --> n98
  n120 --> n9
  n120 --> n13
  n120 --> n16
  n120 --> n21
  n120 --> n38
  n120 --> n46
  n120 --> n47
  n120 --> n48
  n120 --> n60
  n120 --> n72
  n120 --> n74
  n120 --> n80
  n120 --> n83
  n120 --> n84
  n120 --> n93
  n120 --> n98
  n121 --> n13
  n122 --> n59
  n122 --> n65
  n122 --> n76
  n122 --> n77
  n122 --> n78
  n122 --> n98
  n123 --> n16
  n123 --> n38
  n123 --> n51
  n123 --> n65
  n123 --> n98
  n124 --> n16
  n124 --> n31
  n124 --> n42
  n124 --> n92
  n124 --> n93
  n124 --> n98
  n125 --> n40
  n125 --> n61
  n126 --> n21
  n126 --> n25
  n126 --> n26
  n126 --> n53
  n126 --> n60
  n126 --> n99
  n127 --> n13
  n127 --> n54
  n127 --> n55
  n127 --> n61
  n127 --> n77
  n127 --> n78
  n127 --> n98
  n128 --> n17
  n128 --> n18
  n128 --> n24
  n128 --> n47
  n128 --> n48
  n128 --> n60
  n128 --> n98
  n129 --> n13
  n129 --> n21
  n129 --> n38
  n129 --> n48
  n129 --> n61
  n129 --> n66
  n129 --> n82
  n129 --> n83
  n129 --> n97
  n129 --> n98
  n129 --> n99
  n130 --> n57
  n131 --> n19
  n131 --> n38
  n131 --> n47
  n131 --> n48
  n131 --> n80
  n132 --> n17
  n132 --> n24
  n132 --> n31
  n132 --> n47
  n132 --> n48
  n132 --> n60
  n132 --> n65
  n132 --> n72
  n132 --> n74
  n132 --> n99
  n133 --> n16
  n133 --> n49
  n133 --> n59
  n133 --> n61
  n133 --> n71
  n133 --> n78
  n134 --> n6
  n134 --> n18
  n134 --> n21
  n134 --> n23
  n134 --> n24
  n134 --> n31
  n134 --> n36
  n134 --> n37
  n134 --> n38
  n134 --> n43
  n134 --> n51
  n134 --> n52
  n134 --> n61
  n134 --> n78
  n134 --> n79
  n134 --> n80
  n134 --> n81
  n134 --> n83
  n134 --> n84
  n134 --> n87
  n134 --> n91
  n134 --> n99
  n135 --> n18
  n135 --> n21
  n135 --> n38
  n135 --> n61
  n135 --> n80
  n135 --> n99
  n136 --> n8
  n137 --> n83
  n137 --> n84
  n138 --> n8
  n138 --> n64
  n138 --> n97
  n139 --> n80
  n140 --> n53
  n141 --> n31
  n142 --> n30
  n142 --> n31
  n142 --> n63
  n143 --> n65
  n143 --> n66
  n143 --> n82
  n144 --> n17
  n144 --> n27
  n144 --> n80
  n144 --> n90
  n145 --> n43
  n145 --> n44
  n145 --> n65
  n145 --> n91
  n146 --> n46
  n146 --> n47
  n146 --> n48
  n147 --> n48
  n147 --> n80
  n148 --> n23
  n148 --> n24
  n148 --> n25
  n148 --> n26
  n149 --> n85
  n150 --> n51
  n150 --> n79
  n150 --> n87
  n151 --> n76
  n151 --> n77
  n151 --> n78
  n152 --> n59
  n153 --> n16
  n153 --> n54
  n153 --> n55
  n154 --> n78
  n155 --> n36
  n155 --> n37
  n156 --> n40
  n156 --> n70
  n157 --> n75
  n158 --> n16
  n159 --> n22
  n160 --> n52
  n160 --> n68
  n161 --> n48
  n162 --> n88
  n162 --> n89
  n163 --> n72
  n163 --> n74
  n164 --> n74
  n165 --> n73
  n166 --> n81
  n167 --> n48
  n168 --> n32
  n169 --> n45
  n170 --> n57
  n171 --> n33
  n171 --> n34
  n171 --> n35
  n172 --> n33
  n173 --> n33
  n174 --> n33
  n175 --> n7
  n175 --> n16
  n175 --> n43
  n175 --> n49
  n175 --> n65
  n175 --> n66
  n175 --> n81
  n175 --> n82
  n176 --> n73
  n176 --> n74
  n177 --> n72
  n177 --> n74
  n178 --> n75
  n179 --> n48
  n179 --> n79
  n179 --> n83
  n180 --> n30
  n180 --> n31
  n180 --> n38
  n180 --> n62
  n180 --> n63
  n181 --> n16
  n181 --> n61
  n181 --> n101
  n182 --> n8
  n182 --> n18
  n182 --> n48
  n182 --> n80
  n183 --> n58
  n183 --> n87
  n184 --> n19
  n184 --> n21
  n184 --> n46
  n184 --> n47
  n184 --> n80
  n184 --> n83
  n184 --> n84
  n184 --> n85
  n185 --> n60
  n186 --> n6
  n186 --> n8
  n186 --> n52
  n187 --> n16
  n188 --> n65
  n188 --> n76
  n188 --> n78
  n189 --> n47
  n189 --> n80
  n189 --> n85
  n190 --> n16
  n190 --> n64
  n190 --> n88
  n190 --> n89
  n191 --> n60
  n191 --> n64
  n191 --> n97
  n192 --> n96
  n193 --> n20
  n193 --> n49
  n193 --> n92
  n194 --> n100
  n195 --> n100
  n196 --> n100
  n197 --> n15
  n197 --> n28
  n198 --> n15
  n198 --> n102
  n199 --> n15
  n199 --> n101
  n200 --> n14
  n200 --> n15
  n201 --> n4
  n201 --> n102
  n202 --> n58
  n203 --> n28
  n203 --> n58
  n203 --> n102
  n204 --> n14
  n205 --> n102
  n206 --> n14
  n206 --> n102
  n207 --> n68
  n208 --> n9
  n208 --> n10
  n208 --> n11
  n208 --> n20
  n208 --> n49
  n208 --> n68
  n208 --> n69
  n208 --> n71
  n208 --> n94
  n208 --> n95
  n209 --> n9
  n209 --> n29
  n210 --> n10
  n211 --> n9
  n211 --> n29
  n211 --> n71
  n212 --> n5
  n213 --> n29
  n213 --> n56
  n214 --> n9
  n214 --> n10
  n214 --> n42
  n215 --> n20
  n215 --> n29
  n216 --> n7
  n216 --> n12
  n217 --> n56
  n218 --> n29
  n219 --> n9
  n219 --> n29
  n220 --> n67
  n220 --> n78
  n221 --> n70
  n221 --> n86
  n222 --> n22
  n222 --> n60
  n223 --> n18
  n223 --> n24
  n223 --> n25
  n223 --> n26
  n224 --> n27
  n224 --> n65
  n225 --> n31
  n225 --> n62
  n226 --> n8
  n226 --> n32
  n226 --> n45
  n226 --> n86
  n227 --> n33
  n227 --> n34
  n227 --> n35
  n227 --> n60
  n227 --> n65
  n228 --> n37
  n228 --> n65
  n228 --> n102
  n229 --> n6
  n230 --> n18
  n230 --> n44
  n231 --> n9
  n231 --> n18
  n231 --> n21
  n231 --> n46
  n231 --> n47
  n231 --> n83
  n231 --> n84
  n232 --> n18
  n232 --> n65
  n233 --> n21
  n233 --> n53
  n233 --> n99
  n234 --> n97
  n235 --> n57
  n236 --> n17
  n236 --> n23
  n236 --> n24
  n236 --> n31
  n236 --> n47
  n236 --> n69
  n236 --> n72
  n236 --> n74
  n236 --> n99
  n237 --> n18
  n237 --> n59
  n238 --> n21
  n239 --> n6
  n240 --> n49
  n241 --> n73
  n242 --> n28
  n243 --> n30
  n244 --> n66
  n244 --> n81
  n245 --> n51
  n245 --> n52
  n245 --> n91
  n245 --> n97
  n246 --> n58
  n247 --> n18
  n247 --> n54
  n247 --> n55
  n247 --> n77
  n247 --> n78
  n248 --> n18
  n249 --> n19
  n249 --> n64
  n249 --> n88
  n249 --> n89
  n250 --> n3
  n250 --> n67
  n251 --> n19
  n251 --> n21
  n251 --> n51
  n251 --> n79
  n251 --> n83
  n251 --> n84
  n251 --> n85
  n252 --> n41
  n252 --> n47
  n252 --> n83
  n252 --> n84
  n253 --> n29
  n253 --> n39
  n253 --> n41
  n253 --> n50
  n253 --> n58
  n253 --> n92
  n254 --> n90
  n254 --> n102
  n255 --> n8
  n256 --> n96
  n257 --> n29
  n257 --> n39
  n257 --> n102
  n258 --> n50
  n258 --> n70
  n259 --> n9
  n259 --> n39
  n259 --> n41
  n260 --> n56
  n261 --> n58
  n262 --> n3
  n262 --> n9
  n263 --> n96
  n264 --> n9
  n264 --> n20
  n264 --> n39
  n264 --> n67
  n265 --> n101
  n265 --> n102
  n266 --> n95
  n267 --> n69
  n267 --> n90
  n268 --> n19
  n268 --> n94
  n269 --> n39
  n269 --> n92
  n270 --> n8
  n270 --> n39
  n271 --> n50
  n272 --> n94
```
