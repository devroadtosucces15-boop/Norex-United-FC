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
  n207["scripts/build-atlas-explorer.py"]
  n208["scripts/build-atlas-local.py"]
  n209["scripts/build-atlas-private-view.py"]
  n210["scripts/build-system-atlas.py"]
  n211["scripts/build.mjs"]
  n212["scripts/builder-page.mjs"]
  n213["scripts/burners-page.mjs"]
  n214["scripts/docs-page.mjs"]
  n215["scripts/ea-relay.mjs"]
  n216["scripts/feed-page.mjs"]
  n217["scripts/fetch.mjs"]
  n218["scripts/leaders-page.mjs"]
  n219["scripts/lib.mjs"]
  n220["scripts/messages-page.mjs"]
  n221["scripts/probuilds-page.mjs"]
  n222["scripts/serve-atlas-private.py"]
  n223["scripts/updates-page.mjs"]
  n224["scripts/updates.mjs"]
  n225["tests/ask.test.mjs"]
  n226["tests/avatarcard.test.mjs"]
  n227["tests/awards.test.mjs"]
  n228["tests/badges.test.mjs"]
  n229["tests/builds.test.mjs"]
  n230["tests/burners.test.mjs"]
  n231["tests/cardstudio.test.mjs"]
  n232["tests/chat.test.mjs"]
  n233["tests/clublookup.test.mjs"]
  n234["tests/docs.test.mjs"]
  n235["tests/events.test.mjs"]
  n236["tests/feed.test.mjs"]
  n237["tests/honours.test.mjs"]
  n238["tests/insights.test.mjs"]
  n239["tests/issues.test.mjs"]
  n240["tests/locker.test.mjs"]
  n241["tests/media.test.mjs"]
  n242["tests/members.test.mjs"]
  n243["tests/mock.mjs"]
  n244["tests/packs.test.mjs"]
  n245["tests/playmedia.test.mjs"]
  n246["tests/plays.test.mjs"]
  n247["tests/probuilds.test.mjs"]
  n248["tests/push.test.mjs"]
  n249["tests/quickcommands.test.mjs"]
  n250["tests/site.test.mjs"]
  n251["tests/social.test.mjs"]
  n252["tests/squads.test.mjs"]
  n253["tests/statinsights.test.mjs"]
  n254["tests/updates.test.mjs"]
  n255["tests/wave10.test.mjs"]
  n256["tests/wave8.test.mjs"]
  n257["web/app.js"]
  n258["web/badges.js"]
  n259["web/boardroom.js"]
  n260["web/build-math.js"]
  n261["web/builder.js"]
  n262["web/docs.js"]
  n263["web/events.js"]
  n264["web/feed-public.js"]
  n265["web/feed.js"]
  n266["web/game.js"]
  n267["web/honours.js"]
  n268["web/metrics.js"]
  n269["web/mystats.js"]
  n270["web/notify.js"]
  n271["web/profile.js"]
  n272["web/recs.js"]
  n273["web/scout.js"]
  n274["web/settings.js"]
  n275["web/squads.js"]
  n276["web/trials.js"]
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
  n175 --> n7
  n175 --> n15
  n175 --> n42
  n175 --> n48
  n175 --> n64
  n175 --> n65
  n175 --> n81
  n175 --> n82
  n176 --> n73
  n176 --> n74
  n177 --> n72
  n177 --> n74
  n178 --> n75
  n179 --> n47
  n179 --> n79
  n179 --> n83
  n180 --> n29
  n180 --> n30
  n180 --> n37
  n180 --> n61
  n180 --> n62
  n181 --> n15
  n181 --> n60
  n181 --> n101
  n182 --> n8
  n182 --> n17
  n182 --> n47
  n182 --> n80
  n183 --> n57
  n183 --> n87
  n184 --> n18
  n184 --> n20
  n184 --> n45
  n184 --> n46
  n184 --> n80
  n184 --> n83
  n184 --> n84
  n184 --> n85
  n185 --> n59
  n186 --> n6
  n186 --> n8
  n186 --> n51
  n187 --> n15
  n188 --> n64
  n188 --> n76
  n188 --> n78
  n189 --> n46
  n189 --> n80
  n189 --> n85
  n190 --> n15
  n190 --> n63
  n190 --> n88
  n190 --> n89
  n191 --> n59
  n191 --> n63
  n191 --> n97
  n192 --> n96
  n193 --> n19
  n193 --> n48
  n193 --> n92
  n194 --> n100
  n195 --> n100
  n196 --> n100
  n197 --> n14
  n197 --> n27
  n198 --> n14
  n198 --> n102
  n199 --> n14
  n199 --> n101
  n200 --> n13
  n200 --> n14
  n201 --> n4
  n201 --> n102
  n202 --> n57
  n203 --> n27
  n203 --> n57
  n203 --> n102
  n204 --> n13
  n205 --> n102
  n206 --> n13
  n206 --> n102
  n207 --> n71
  n208 --> n71
  n209 --> n71
  n210 --> n67
  n210 --> n71
  n211 --> n9
  n211 --> n10
  n211 --> n11
  n211 --> n19
  n211 --> n48
  n211 --> n67
  n211 --> n68
  n211 --> n70
  n211 --> n94
  n211 --> n95
  n212 --> n9
  n212 --> n28
  n213 --> n10
  n214 --> n9
  n214 --> n28
  n214 --> n70
  n215 --> n5
  n216 --> n28
  n216 --> n55
  n217 --> n9
  n217 --> n10
  n217 --> n41
  n218 --> n19
  n218 --> n28
  n219 --> n7
  n220 --> n55
  n221 --> n28
  n222 --> n71
  n223 --> n9
  n223 --> n28
  n224 --> n66
  n224 --> n78
  n225 --> n69
  n225 --> n86
  n226 --> n21
  n226 --> n59
  n227 --> n17
  n227 --> n23
  n227 --> n24
  n227 --> n25
  n228 --> n26
  n228 --> n64
  n229 --> n30
  n229 --> n61
  n230 --> n8
  n230 --> n31
  n230 --> n44
  n230 --> n86
  n231 --> n32
  n231 --> n33
  n231 --> n34
  n231 --> n59
  n231 --> n64
  n232 --> n36
  n232 --> n64
  n232 --> n102
  n233 --> n6
  n234 --> n17
  n234 --> n43
  n235 --> n9
  n235 --> n17
  n235 --> n20
  n235 --> n45
  n235 --> n46
  n235 --> n83
  n235 --> n84
  n236 --> n17
  n236 --> n64
  n237 --> n20
  n237 --> n52
  n237 --> n99
  n238 --> n97
  n239 --> n56
  n240 --> n16
  n240 --> n22
  n240 --> n23
  n240 --> n30
  n240 --> n46
  n240 --> n68
  n240 --> n72
  n240 --> n74
  n240 --> n99
  n241 --> n17
  n241 --> n58
  n242 --> n20
  n243 --> n6
  n244 --> n48
  n245 --> n73
  n246 --> n27
  n247 --> n29
  n248 --> n65
  n248 --> n81
  n249 --> n50
  n249 --> n51
  n249 --> n91
  n249 --> n97
  n250 --> n57
  n251 --> n17
  n251 --> n53
  n251 --> n54
  n251 --> n77
  n251 --> n78
  n252 --> n17
  n253 --> n18
  n253 --> n63
  n253 --> n88
  n253 --> n89
  n254 --> n3
  n254 --> n66
  n255 --> n18
  n255 --> n20
  n255 --> n50
  n255 --> n79
  n255 --> n83
  n255 --> n84
  n255 --> n85
  n256 --> n40
  n256 --> n46
  n256 --> n83
  n256 --> n84
  n257 --> n28
  n257 --> n38
  n257 --> n40
  n257 --> n49
  n257 --> n57
  n257 --> n92
  n258 --> n90
  n258 --> n102
  n259 --> n8
  n260 --> n96
  n261 --> n28
  n261 --> n38
  n261 --> n102
  n262 --> n49
  n262 --> n69
  n263 --> n9
  n263 --> n38
  n263 --> n40
  n264 --> n55
  n265 --> n57
  n266 --> n3
  n266 --> n9
  n267 --> n96
  n268 --> n9
  n268 --> n19
  n268 --> n38
  n268 --> n66
  n269 --> n101
  n269 --> n102
  n270 --> n95
  n271 --> n68
  n271 --> n90
  n272 --> n18
  n272 --> n94
  n273 --> n38
  n273 --> n92
  n274 --> n8
  n274 --> n38
  n275 --> n49
  n276 --> n94
```
