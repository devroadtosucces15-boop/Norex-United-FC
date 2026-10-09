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
  n12["TABLE SET"]
  n13["TABLE The"]
  n14["TABLE You"]
  n15["TABLE a"]
  n16["TABLE achievements"]
  n17["TABLE activity"]
  n18["TABLE api"]
  n19["TABLE archived"]
  n20["TABLE availability"]
  n21["TABLE avatar_cards"]
  n22["TABLE award_categories"]
  n23["TABLE award_votes"]
  n24["TABLE award_weeks"]
  n25["TABLE award_winners"]
  n26["TABLE badges"]
  n27["TABLE both"]
  n28["TABLE build"]
  n29["TABLE build_comments"]
  n30["TABLE builds"]
  n31["TABLE burner_clubs"]
  n32["TABLE card_requests"]
  n33["TABLE card_templates"]
  n34["TABLE card_unlocks"]
  n35["TABLE chat_messages"]
  n36["TABLE chats"]
  n37["TABLE claims"]
  n38["TABLE class"]
  n39["TABLE club_index"]
  n40["TABLE confirmed"]
  n41["TABLE data"]
  n42["TABLE doc_acks"]
  n43["TABLE docs"]
  n44["TABLE ea_relay"]
  n45["TABLE event_checkins"]
  n46["TABLE event_rsvps"]
  n47["TABLE events"]
  n48["TABLE every"]
  n49["TABLE everyone"]
  n50["TABLE feedback"]
  n51["TABLE flag_overrides"]
  n52["TABLE hof"]
  n53["TABLE hotw"]
  n54["TABLE hotw_votes"]
  n55["TABLE in"]
  n56["TABLE issue_reports"]
  n57["TABLE it"]
  n58["TABLE media"]
  n59["TABLE members"]
  n60["TABLE meta"]
  n61["TABLE my"]
  n62["TABLE my_builds"]
  n63["TABLE notes"]
  n64["TABLE notifications"]
  n65["TABLE notify_prefs"]
  n66["TABLE of"]
  n67["TABLE on"]
  n68["TABLE one"]
  n69["TABLE other"]
  n70["TABLE our"]
  n71["TABLE pathlib"]
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
  n118["bot/docs.js"]
  n119["bot/events.js"]
  n120["bot/exportcontent.js"]
  n121["bot/feed.js"]
  n122["bot/feedback.js"]
  n123["bot/game.js"]
  n124["bot/health.js"]
  n125["bot/honours.js"]
  n126["bot/hotw.js"]
  n127["bot/hub.js"]
  n128["bot/icons/make_icon.py"]
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
  n175["bot/migrations/0044_card_kit_number.sql"]
  n176["bot/notify.js"]
  n177["bot/playmedia.js"]
  n178["bot/plays.js"]
  n179["bot/points.js"]
  n180["bot/predict.js"]
  n181["bot/probuilds.js"]
  n182["bot/profanity.js"]
  n183["bot/profiles.js"]
  n184["bot/ratings.js"]
  n185["bot/recs.js"]
  n186["bot/register.mjs"]
  n187["bot/roles.js"]
  n188["bot/settings.js"]
  n189["bot/social.js"]
  n190["bot/squads.js"]
  n191["bot/statinsights.js"]
  n192["bot/trials.js"]
  n193["bot/voicerecap.js"]
  n194["bot/worker.js"]
  n195["data/clubs/76051.json"]
  n196["data/matches/51032003360095.json"]
  n197["data/state.json"]
  n198["data/updates/fc-27-career-mode-developer-launch-update.jso"]
  n199["data/updates/fc-27-fut-developer-launch-update.json"]
  n200["data/updates/fc-27-gameplay-developer-launch-update.json"]
  n201["data/updates/fc-27-the-grounds-developer-launch-update.jso"]
  n202["data/updates/pitch-notes-fc27-career-mode-deep-dive.json"]
  n203["data/updates/pitch-notes-fc27-fut-deep-dive.json"]
  n204["data/updates/pitch-notes-fc27-gameplay-deep-dive.json"]
  n205["data/updates/pitch-notes-fc27-launch-update.json"]
  n206["data/updates/pitch-notes-fc27-pc-deep-dive.json"]
  n207["data/updates/pitch-notes-fc27-the-grounds-deep-dive.json"]
  n208["scripts/build-atlas-explorer.py"]
  n209["scripts/build-atlas-history.py"]
  n210["scripts/build-atlas-local.py"]
  n211["scripts/build-atlas-private-view.py"]
  n212["scripts/build-system-atlas.py"]
  n213["scripts/build.mjs"]
  n214["scripts/builder-page.mjs"]
  n215["scripts/burners-page.mjs"]
  n216["scripts/docs-page.mjs"]
  n217["scripts/ea-relay.mjs"]
  n218["scripts/feed-page.mjs"]
  n219["scripts/fetch.mjs"]
  n220["scripts/leaders-page.mjs"]
  n221["scripts/lib.mjs"]
  n222["scripts/messages-page.mjs"]
  n223["scripts/probuilds-page.mjs"]
  n224["scripts/serve-atlas-private.py"]
  n225["scripts/test-atlas-local.py"]
  n226["scripts/updates-page.mjs"]
  n227["scripts/updates.mjs"]
  n228["tests/ask.test.mjs"]
  n229["tests/avatarcard.test.mjs"]
  n230["tests/awards.test.mjs"]
  n231["tests/badges.test.mjs"]
  n232["tests/builds.test.mjs"]
  n233["tests/burners.test.mjs"]
  n234["tests/cardstudio.test.mjs"]
  n235["tests/chat.test.mjs"]
  n236["tests/clublookup.test.mjs"]
  n237["tests/docs.test.mjs"]
  n238["tests/events.test.mjs"]
  n239["tests/feed.test.mjs"]
  n240["tests/honours.test.mjs"]
  n241["tests/insights.test.mjs"]
  n242["tests/issues.test.mjs"]
  n243["tests/locker.test.mjs"]
  n244["tests/media.test.mjs"]
  n245["tests/members.test.mjs"]
  n246["tests/mock.mjs"]
  n247["tests/packs.test.mjs"]
  n248["tests/playmedia.test.mjs"]
  n249["tests/plays.test.mjs"]
  n250["tests/probuilds.test.mjs"]
  n251["tests/push.test.mjs"]
  n252["tests/quickcommands.test.mjs"]
  n253["tests/site.test.mjs"]
  n254["tests/social.test.mjs"]
  n255["tests/squads.test.mjs"]
  n256["tests/statinsights.test.mjs"]
  n257["tests/updates.test.mjs"]
  n258["tests/wave10.test.mjs"]
  n259["tests/wave8.test.mjs"]
  n260["web/app.js"]
  n261["web/badges.js"]
  n262["web/boardroom.js"]
  n263["web/build-math.js"]
  n264["web/builder.js"]
  n265["web/docs.js"]
  n266["web/events.js"]
  n267["web/feed-public.js"]
  n268["web/feed.js"]
  n269["web/game.js"]
  n270["web/honours.js"]
  n271["web/metrics.js"]
  n272["web/mystats.js"]
  n273["web/notify.js"]
  n274["web/profile.js"]
  n275["web/recs.js"]
  n276["web/scout.js"]
  n277["web/settings.js"]
  n278["web/squads.js"]
  n279["web/trials.js"]
  n0 --> n93
  n1 --> n93
  n2 --> n9
  n2 --> n86
  n103 --> n15
  n103 --> n93
  n103 --> n94
  n104 --> n8
  n104 --> n12
  n104 --> n21
  n105 --> n12
  n105 --> n22
  n105 --> n23
  n105 --> n24
  n105 --> n25
  n105 --> n37
  n105 --> n60
  n105 --> n93
  n106 --> n4
  n106 --> n16
  n106 --> n20
  n106 --> n26
  n106 --> n37
  n106 --> n59
  n106 --> n68
  n106 --> n80
  n106 --> n83
  n106 --> n84
  n106 --> n93
  n106 --> n94
  n106 --> n98
  n106 --> n99
  n107 --> n17
  n107 --> n37
  n107 --> n46
  n107 --> n47
  n107 --> n75
  n107 --> n80
  n107 --> n83
  n107 --> n84
  n107 --> n93
  n107 --> n98
  n108 --> n12
  n108 --> n37
  n108 --> n60
  n109 --> n30
  n109 --> n61
  n109 --> n62
  n109 --> n102
  n110 --> n5
  n110 --> n12
  n110 --> n15
  n110 --> n31
  n110 --> n44
  n110 --> n86
  n110 --> n95
  n111 --> n11
  n111 --> n41
  n111 --> n93
  n112 --> n32
  n112 --> n33
  n112 --> n34
  n112 --> n37
  n112 --> n93
  n112 --> n98
  n113 --> n35
  n113 --> n36
  n113 --> n59
  n113 --> n93
  n113 --> n98
  n114 --> n9
  n114 --> n12
  n114 --> n39
  n115 --> n59
  n115 --> n69
  n115 --> n93
  n116 --> n12
  n116 --> n39
  n116 --> n60
  n117 --> n12
  n117 --> n37
  n117 --> n60
  n118 --> n12
  n118 --> n42
  n118 --> n43
  n118 --> n59
  n118 --> n60
  n118 --> n64
  n118 --> n91
  n118 --> n98
  n119 --> n9
  n119 --> n12
  n119 --> n15
  n119 --> n20
  n119 --> n37
  n119 --> n45
  n119 --> n46
  n119 --> n47
  n119 --> n59
  n119 --> n72
  n119 --> n74
  n119 --> n80
  n119 --> n83
  n119 --> n84
  n119 --> n93
  n119 --> n98
  n120 --> n12
  n121 --> n58
  n121 --> n64
  n121 --> n76
  n121 --> n77
  n121 --> n78
  n121 --> n98
  n122 --> n15
  n122 --> n37
  n122 --> n50
  n122 --> n64
  n122 --> n98
  n123 --> n15
  n123 --> n30
  n123 --> n41
  n123 --> n92
  n123 --> n93
  n123 --> n98
  n124 --> n39
  n124 --> n60
  n125 --> n20
  n125 --> n24
  n125 --> n25
  n125 --> n52
  n125 --> n59
  n125 --> n99
  n126 --> n12
  n126 --> n53
  n126 --> n54
  n126 --> n60
  n126 --> n77
  n126 --> n78
  n126 --> n98
  n127 --> n16
  n127 --> n17
  n127 --> n23
  n127 --> n46
  n127 --> n47
  n127 --> n59
  n127 --> n98
  n128 --> n71
  n129 --> n12
  n129 --> n20
  n129 --> n37
  n129 --> n47
  n129 --> n60
  n129 --> n65
  n129 --> n82
  n129 --> n83
  n129 --> n97
  n129 --> n98
  n129 --> n99
  n130 --> n56
  n131 --> n18
  n131 --> n37
  n131 --> n46
  n131 --> n47
  n131 --> n80
  n132 --> n16
  n132 --> n23
  n132 --> n30
  n132 --> n46
  n132 --> n47
  n132 --> n59
  n132 --> n64
  n132 --> n72
  n132 --> n74
  n132 --> n99
  n133 --> n15
  n133 --> n48
  n133 --> n58
  n133 --> n60
  n133 --> n70
  n133 --> n78
  n134 --> n6
  n134 --> n17
  n134 --> n20
  n134 --> n22
  n134 --> n23
  n134 --> n30
  n134 --> n35
  n134 --> n36
  n134 --> n37
  n134 --> n42
  n134 --> n50
  n134 --> n51
  n134 --> n60
  n134 --> n78
  n134 --> n79
  n134 --> n80
  n134 --> n81
  n134 --> n83
  n134 --> n84
  n134 --> n87
  n134 --> n91
  n134 --> n99
  n135 --> n17
  n135 --> n20
  n135 --> n37
  n135 --> n60
  n135 --> n80
  n135 --> n99
  n136 --> n8
  n137 --> n83
  n137 --> n84
  n138 --> n8
  n138 --> n63
  n138 --> n97
  n139 --> n80
  n140 --> n52
  n141 --> n30
  n142 --> n29
  n142 --> n30
  n142 --> n62
  n143 --> n64
  n143 --> n65
  n143 --> n82
  n144 --> n16
  n144 --> n26
  n144 --> n80
  n144 --> n90
  n145 --> n42
  n145 --> n43
  n145 --> n64
  n145 --> n91
  n146 --> n45
  n146 --> n46
  n146 --> n47
  n147 --> n47
  n147 --> n80
  n148 --> n22
  n148 --> n23
  n148 --> n24
  n148 --> n25
  n149 --> n85
  n150 --> n50
  n150 --> n79
  n150 --> n87
  n151 --> n76
  n151 --> n77
  n151 --> n78
  n152 --> n58
  n153 --> n15
  n153 --> n53
  n153 --> n54
  n154 --> n78
  n155 --> n35
  n155 --> n36
  n156 --> n39
  n156 --> n69
  n157 --> n75
  n158 --> n15
  n159 --> n21
  n160 --> n51
  n160 --> n67
  n161 --> n47
  n162 --> n88
  n162 --> n89
  n163 --> n72
  n163 --> n74
  n164 --> n74
  n165 --> n73
  n166 --> n81
  n167 --> n47
  n168 --> n31
  n169 --> n44
  n170 --> n56
  n171 --> n32
  n171 --> n33
  n171 --> n34
  n172 --> n32
  n173 --> n32
  n174 --> n32
  n175 --> n32
  n176 --> n7
  n176 --> n15
  n176 --> n42
  n176 --> n48
  n176 --> n64
  n176 --> n65
  n176 --> n81
  n176 --> n82
  n177 --> n73
  n177 --> n74
  n178 --> n72
  n178 --> n74
  n179 --> n75
  n180 --> n47
  n180 --> n79
  n180 --> n83
  n181 --> n29
  n181 --> n30
  n181 --> n61
  n181 --> n62
  n182 --> n15
  n182 --> n60
  n182 --> n101
  n183 --> n8
  n183 --> n17
  n183 --> n47
  n183 --> n80
  n184 --> n57
  n184 --> n87
  n185 --> n18
  n185 --> n20
  n185 --> n45
  n185 --> n46
  n185 --> n80
  n185 --> n83
  n185 --> n84
  n185 --> n85
  n186 --> n59
  n187 --> n6
  n187 --> n8
  n187 --> n51
  n188 --> n15
  n189 --> n64
  n189 --> n76
  n189 --> n78
  n190 --> n46
  n190 --> n80
  n190 --> n85
  n191 --> n15
  n191 --> n63
  n191 --> n88
  n191 --> n89
  n192 --> n59
  n192 --> n63
  n192 --> n97
  n193 --> n96
  n194 --> n19
  n194 --> n48
  n194 --> n92
  n195 --> n100
  n196 --> n100
  n197 --> n100
  n198 --> n14
  n198 --> n27
  n199 --> n14
  n199 --> n102
  n200 --> n14
  n200 --> n101
  n201 --> n13
  n201 --> n14
  n202 --> n4
  n202 --> n102
  n203 --> n57
  n204 --> n27
  n204 --> n57
  n204 --> n102
  n205 --> n13
  n206 --> n102
  n207 --> n13
  n207 --> n102
  n208 --> n71
  n209 --> n71
  n210 --> n71
  n211 --> n71
  n212 --> n67
  n212 --> n71
  n213 --> n9
  n213 --> n10
  n213 --> n11
  n213 --> n19
  n213 --> n48
  n213 --> n67
  n213 --> n68
  n213 --> n70
  n213 --> n94
  n213 --> n95
  n214 --> n9
  n214 --> n28
  n215 --> n10
  n216 --> n9
  n216 --> n28
  n216 --> n70
  n217 --> n5
  n218 --> n28
  n218 --> n55
  n219 --> n9
  n219 --> n10
  n219 --> n41
  n220 --> n19
  n220 --> n28
  n221 --> n7
  n222 --> n55
  n223 --> n28
  n224 --> n71
  n225 --> n71
  n226 --> n9
  n226 --> n28
  n227 --> n66
  n227 --> n78
  n228 --> n69
  n228 --> n86
  n229 --> n21
  n229 --> n59
  n230 --> n17
  n230 --> n23
  n230 --> n24
  n230 --> n25
  n231 --> n26
  n231 --> n64
  n232 --> n30
  n232 --> n61
  n233 --> n8
  n233 --> n31
  n233 --> n44
  n233 --> n86
  n234 --> n32
  n234 --> n33
  n234 --> n34
  n234 --> n59
  n234 --> n64
  n235 --> n36
  n235 --> n64
  n235 --> n102
  n236 --> n6
  n237 --> n17
  n237 --> n43
  n238 --> n9
  n238 --> n17
  n238 --> n20
  n238 --> n45
  n238 --> n46
  n238 --> n83
  n238 --> n84
  n239 --> n17
  n239 --> n64
  n240 --> n20
  n240 --> n52
  n240 --> n99
  n241 --> n97
  n242 --> n56
  n243 --> n16
  n243 --> n22
  n243 --> n23
  n243 --> n30
  n243 --> n46
  n243 --> n68
  n243 --> n72
  n243 --> n74
  n243 --> n99
  n244 --> n17
  n244 --> n58
  n245 --> n20
  n246 --> n6
  n247 --> n48
  n248 --> n73
  n249 --> n27
  n250 --> n29
  n251 --> n65
  n251 --> n81
  n252 --> n50
  n252 --> n51
  n252 --> n91
  n252 --> n97
  n253 --> n57
  n254 --> n17
  n254 --> n53
  n254 --> n54
  n254 --> n77
  n254 --> n78
  n255 --> n17
  n256 --> n18
  n256 --> n63
  n256 --> n88
  n256 --> n89
  n257 --> n3
  n257 --> n66
  n258 --> n18
  n258 --> n20
  n258 --> n50
  n258 --> n79
  n258 --> n83
  n258 --> n84
  n258 --> n85
  n259 --> n40
  n259 --> n46
  n259 --> n83
  n259 --> n84
  n260 --> n28
  n260 --> n38
  n260 --> n40
  n260 --> n49
  n260 --> n57
  n260 --> n92
  n261 --> n90
  n261 --> n102
  n262 --> n8
  n263 --> n96
  n264 --> n28
  n264 --> n38
  n264 --> n102
  n265 --> n49
  n265 --> n69
  n266 --> n9
  n266 --> n38
  n266 --> n40
  n267 --> n55
  n268 --> n57
  n269 --> n3
  n269 --> n9
  n270 --> n96
  n271 --> n9
  n271 --> n19
  n271 --> n38
  n271 --> n66
  n272 --> n101
  n272 --> n102
  n273 --> n95
  n274 --> n68
  n274 --> n90
  n275 --> n18
  n275 --> n94
  n276 --> n38
  n276 --> n92
  n277 --> n8
  n277 --> n38
  n278 --> n49
  n279 --> n94
```
