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
  n11["TABLE SET"]
  n12["TABLE The"]
  n13["TABLE You"]
  n14["TABLE a"]
  n15["TABLE achievements"]
  n16["TABLE activity"]
  n17["TABLE api"]
  n18["TABLE archived"]
  n19["TABLE availability"]
  n20["TABLE avatar_cards"]
  n21["TABLE award_categories"]
  n22["TABLE award_votes"]
  n23["TABLE award_weeks"]
  n24["TABLE award_winners"]
  n25["TABLE badges"]
  n26["TABLE both"]
  n27["TABLE build"]
  n28["TABLE build_comments"]
  n29["TABLE builds"]
  n30["TABLE burner_clubs"]
  n31["TABLE card_requests"]
  n32["TABLE card_templates"]
  n33["TABLE card_unlocks"]
  n34["TABLE chat_messages"]
  n35["TABLE chats"]
  n36["TABLE claims"]
  n37["TABLE class"]
  n38["TABLE club_index"]
  n39["TABLE confirmed"]
  n40["TABLE data"]
  n41["TABLE doc_acks"]
  n42["TABLE docs"]
  n43["TABLE ea_relay"]
  n44["TABLE event_checkins"]
  n45["TABLE event_rsvps"]
  n46["TABLE events"]
  n47["TABLE every"]
  n48["TABLE everyone"]
  n49["TABLE feedback"]
  n50["TABLE flag_overrides"]
  n51["TABLE hof"]
  n52["TABLE hotw"]
  n53["TABLE hotw_votes"]
  n54["TABLE in"]
  n55["TABLE issue_reports"]
  n56["TABLE it"]
  n57["TABLE media"]
  n58["TABLE members"]
  n59["TABLE meta"]
  n60["TABLE my"]
  n61["TABLE my_builds"]
  n62["TABLE notes"]
  n63["TABLE notifications"]
  n64["TABLE notify_prefs"]
  n65["TABLE of"]
  n66["TABLE on"]
  n67["TABLE one"]
  n68["TABLE other"]
  n69["TABLE our"]
  n70["TABLE pathlib"]
  n71["TABLE play_assign"]
  n72["TABLE play_media"]
  n73["TABLE plays"]
  n74["TABLE points_log"]
  n75["TABLE post_comments"]
  n76["TABLE post_reactions"]
  n77["TABLE posts"]
  n78["TABLE predictions"]
  n79["TABLE profiles"]
  n80["TABLE push_subs"]
  n81["TABLE requests"]
  n82["TABLE rush_matches"]
  n83["TABLE rush_players"]
  n84["TABLE rush_prefs"]
  n85["TABLE site"]
  n86["TABLE star_ratings"]
  n87["TABLE stat_insight_feedback"]
  n88["TABLE stat_insights"]
  n89["TABLE stats"]
  n90["TABLE suggestions"]
  n91["TABLE that"]
  n92["TABLE the"]
  n93["TABLE their"]
  n94["TABLE then"]
  n95["TABLE this"]
  n96["TABLE trials"]
  n97["TABLE users"]
  n98["TABLE view"]
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
  n176["bot/migrations/0045_card_owner_uploads.sql"]
  n177["bot/notify.js"]
  n178["bot/playmedia.js"]
  n179["bot/plays.js"]
  n180["bot/points.js"]
  n181["bot/predict.js"]
  n182["bot/probuilds.js"]
  n183["bot/profanity.js"]
  n184["bot/profiles.js"]
  n185["bot/ratings.js"]
  n186["bot/recs.js"]
  n187["bot/register.mjs"]
  n188["bot/roles.js"]
  n189["bot/settings.js"]
  n190["bot/social.js"]
  n191["bot/squads.js"]
  n192["bot/statinsights.js"]
  n193["bot/trials.js"]
  n194["bot/voicerecap.js"]
  n195["bot/worker.js"]
  n196["data/clubs/76051.json"]
  n197["data/matches/51032003360095.json"]
  n198["data/state.json"]
  n199["data/updates/fc-27-career-mode-developer-launch-update.jso"]
  n200["data/updates/fc-27-fut-developer-launch-update.json"]
  n201["data/updates/fc-27-gameplay-developer-launch-update.json"]
  n202["data/updates/fc-27-the-grounds-developer-launch-update.jso"]
  n203["data/updates/pitch-notes-fc27-career-mode-deep-dive.json"]
  n204["data/updates/pitch-notes-fc27-fut-deep-dive.json"]
  n205["data/updates/pitch-notes-fc27-gameplay-deep-dive.json"]
  n206["data/updates/pitch-notes-fc27-launch-update.json"]
  n207["data/updates/pitch-notes-fc27-pc-deep-dive.json"]
  n208["data/updates/pitch-notes-fc27-the-grounds-deep-dive.json"]
  n209["scripts/build-atlas-explorer.py"]
  n210["scripts/build-atlas-history.py"]
  n211["scripts/build-atlas-local.py"]
  n212["scripts/build-atlas-private-view.py"]
  n213["scripts/build-system-atlas.py"]
  n214["scripts/build.mjs"]
  n215["scripts/builder-page.mjs"]
  n216["scripts/burners-page.mjs"]
  n217["scripts/charts.mjs"]
  n218["scripts/docs-page.mjs"]
  n219["scripts/ea-relay.mjs"]
  n220["scripts/feed-page.mjs"]
  n221["scripts/fetch.mjs"]
  n222["scripts/leaders-page.mjs"]
  n223["scripts/lib.mjs"]
  n224["scripts/messages-page.mjs"]
  n225["scripts/probuilds-page.mjs"]
  n226["scripts/serve-atlas-private.py"]
  n227["scripts/test-atlas-local.py"]
  n228["scripts/updates-page.mjs"]
  n229["scripts/updates.mjs"]
  n230["tests/ask.test.mjs"]
  n231["tests/avatarcard.test.mjs"]
  n232["tests/awards.test.mjs"]
  n233["tests/badges.test.mjs"]
  n234["tests/builds.test.mjs"]
  n235["tests/burners.test.mjs"]
  n236["tests/cardstudio.test.mjs"]
  n237["tests/chat.test.mjs"]
  n238["tests/clublookup.test.mjs"]
  n239["tests/docs.test.mjs"]
  n240["tests/events.test.mjs"]
  n241["tests/feed.test.mjs"]
  n242["tests/honours.test.mjs"]
  n243["tests/insights.test.mjs"]
  n244["tests/issues.test.mjs"]
  n245["tests/locker.test.mjs"]
  n246["tests/media.test.mjs"]
  n247["tests/members.test.mjs"]
  n248["tests/mock.mjs"]
  n249["tests/next.test.mjs"]
  n250["tests/packs.test.mjs"]
  n251["tests/playmedia.test.mjs"]
  n252["tests/plays.test.mjs"]
  n253["tests/probuilds.test.mjs"]
  n254["tests/push.test.mjs"]
  n255["tests/quickcommands.test.mjs"]
  n256["tests/site.test.mjs"]
  n257["tests/social.test.mjs"]
  n258["tests/squads.test.mjs"]
  n259["tests/statinsights.test.mjs"]
  n260["tests/updates.test.mjs"]
  n261["tests/wave10.test.mjs"]
  n262["tests/wave8.test.mjs"]
  n263["web/app.js"]
  n264["web/badges.js"]
  n265["web/boardroom.js"]
  n266["web/build-math.js"]
  n267["web/builder.js"]
  n268["web/docs.js"]
  n269["web/events.js"]
  n270["web/feed-public.js"]
  n271["web/feed.js"]
  n272["web/game.js"]
  n273["web/honours.js"]
  n274["web/metrics.js"]
  n275["web/mystats.js"]
  n276["web/notify.js"]
  n277["web/profile.js"]
  n278["web/recs.js"]
  n279["web/scout.js"]
  n280["web/settings.js"]
  n281["web/squads.js"]
  n282["web/trials.js"]
  n283["web/vthumb.js"]
  n0 --> n92
  n1 --> n92
  n2 --> n9
  n2 --> n85
  n103 --> n14
  n103 --> n92
  n103 --> n93
  n104 --> n8
  n104 --> n11
  n104 --> n20
  n105 --> n11
  n105 --> n21
  n105 --> n22
  n105 --> n23
  n105 --> n24
  n105 --> n36
  n105 --> n59
  n105 --> n92
  n106 --> n4
  n106 --> n15
  n106 --> n19
  n106 --> n25
  n106 --> n36
  n106 --> n58
  n106 --> n67
  n106 --> n79
  n106 --> n82
  n106 --> n83
  n106 --> n92
  n106 --> n93
  n106 --> n97
  n106 --> n99
  n107 --> n16
  n107 --> n36
  n107 --> n45
  n107 --> n46
  n107 --> n74
  n107 --> n79
  n107 --> n82
  n107 --> n83
  n107 --> n92
  n107 --> n97
  n108 --> n11
  n108 --> n36
  n108 --> n59
  n109 --> n29
  n109 --> n60
  n109 --> n61
  n109 --> n102
  n110 --> n5
  n110 --> n11
  n110 --> n14
  n110 --> n30
  n110 --> n43
  n110 --> n85
  n110 --> n94
  n111 --> n40
  n111 --> n92
  n112 --> n31
  n112 --> n32
  n112 --> n33
  n112 --> n36
  n112 --> n92
  n112 --> n97
  n113 --> n34
  n113 --> n35
  n113 --> n58
  n113 --> n92
  n113 --> n97
  n114 --> n9
  n114 --> n11
  n114 --> n38
  n115 --> n58
  n115 --> n68
  n115 --> n92
  n116 --> n11
  n116 --> n38
  n116 --> n59
  n117 --> n11
  n117 --> n36
  n117 --> n59
  n118 --> n11
  n118 --> n41
  n118 --> n42
  n118 --> n58
  n118 --> n59
  n118 --> n63
  n118 --> n90
  n118 --> n97
  n119 --> n9
  n119 --> n11
  n119 --> n14
  n119 --> n19
  n119 --> n36
  n119 --> n44
  n119 --> n45
  n119 --> n46
  n119 --> n58
  n119 --> n71
  n119 --> n73
  n119 --> n79
  n119 --> n82
  n119 --> n83
  n119 --> n92
  n119 --> n97
  n120 --> n11
  n121 --> n57
  n121 --> n63
  n121 --> n75
  n121 --> n76
  n121 --> n77
  n121 --> n97
  n122 --> n14
  n122 --> n36
  n122 --> n49
  n122 --> n63
  n122 --> n97
  n123 --> n14
  n123 --> n29
  n123 --> n40
  n123 --> n91
  n123 --> n92
  n123 --> n97
  n124 --> n38
  n124 --> n59
  n125 --> n19
  n125 --> n23
  n125 --> n24
  n125 --> n51
  n125 --> n58
  n125 --> n99
  n126 --> n11
  n126 --> n52
  n126 --> n53
  n126 --> n59
  n126 --> n76
  n126 --> n77
  n126 --> n97
  n127 --> n15
  n127 --> n16
  n127 --> n22
  n127 --> n45
  n127 --> n46
  n127 --> n58
  n127 --> n97
  n128 --> n70
  n129 --> n11
  n129 --> n19
  n129 --> n36
  n129 --> n46
  n129 --> n59
  n129 --> n64
  n129 --> n81
  n129 --> n82
  n129 --> n96
  n129 --> n97
  n129 --> n99
  n130 --> n55
  n131 --> n17
  n131 --> n36
  n131 --> n45
  n131 --> n46
  n131 --> n79
  n132 --> n15
  n132 --> n22
  n132 --> n29
  n132 --> n45
  n132 --> n46
  n132 --> n58
  n132 --> n63
  n132 --> n71
  n132 --> n73
  n132 --> n99
  n133 --> n14
  n133 --> n47
  n133 --> n57
  n133 --> n59
  n133 --> n69
  n133 --> n77
  n134 --> n6
  n134 --> n16
  n134 --> n19
  n134 --> n21
  n134 --> n22
  n134 --> n29
  n134 --> n34
  n134 --> n35
  n134 --> n36
  n134 --> n41
  n134 --> n49
  n134 --> n50
  n134 --> n59
  n134 --> n77
  n134 --> n78
  n134 --> n79
  n134 --> n80
  n134 --> n82
  n134 --> n83
  n134 --> n86
  n134 --> n90
  n134 --> n99
  n135 --> n16
  n135 --> n19
  n135 --> n36
  n135 --> n59
  n135 --> n79
  n135 --> n99
  n136 --> n8
  n137 --> n82
  n137 --> n83
  n138 --> n8
  n138 --> n62
  n138 --> n96
  n139 --> n79
  n140 --> n51
  n141 --> n29
  n142 --> n28
  n142 --> n29
  n142 --> n61
  n143 --> n63
  n143 --> n64
  n143 --> n81
  n144 --> n15
  n144 --> n25
  n144 --> n79
  n144 --> n89
  n145 --> n41
  n145 --> n42
  n145 --> n63
  n145 --> n90
  n146 --> n44
  n146 --> n45
  n146 --> n46
  n147 --> n46
  n147 --> n79
  n148 --> n21
  n148 --> n22
  n148 --> n23
  n148 --> n24
  n149 --> n84
  n150 --> n49
  n150 --> n78
  n150 --> n86
  n151 --> n75
  n151 --> n76
  n151 --> n77
  n152 --> n57
  n153 --> n14
  n153 --> n52
  n153 --> n53
  n154 --> n77
  n155 --> n34
  n155 --> n35
  n156 --> n38
  n156 --> n68
  n157 --> n74
  n158 --> n14
  n159 --> n20
  n160 --> n50
  n160 --> n66
  n161 --> n46
  n162 --> n87
  n162 --> n88
  n163 --> n71
  n163 --> n73
  n164 --> n73
  n165 --> n72
  n166 --> n80
  n167 --> n46
  n168 --> n30
  n169 --> n43
  n170 --> n55
  n171 --> n31
  n171 --> n32
  n171 --> n33
  n172 --> n31
  n173 --> n31
  n174 --> n31
  n175 --> n31
  n176 --> n31
  n177 --> n7
  n177 --> n14
  n177 --> n41
  n177 --> n47
  n177 --> n63
  n177 --> n64
  n177 --> n80
  n177 --> n81
  n178 --> n72
  n178 --> n73
  n179 --> n71
  n179 --> n73
  n180 --> n74
  n181 --> n46
  n181 --> n78
  n181 --> n82
  n182 --> n28
  n182 --> n29
  n182 --> n60
  n182 --> n61
  n183 --> n14
  n183 --> n59
  n183 --> n101
  n184 --> n8
  n184 --> n16
  n184 --> n46
  n184 --> n79
  n185 --> n56
  n185 --> n86
  n186 --> n17
  n186 --> n19
  n186 --> n44
  n186 --> n45
  n186 --> n79
  n186 --> n82
  n186 --> n83
  n186 --> n84
  n187 --> n58
  n188 --> n6
  n188 --> n8
  n188 --> n50
  n189 --> n14
  n190 --> n63
  n190 --> n75
  n190 --> n77
  n191 --> n45
  n191 --> n79
  n191 --> n84
  n192 --> n14
  n192 --> n62
  n192 --> n87
  n192 --> n88
  n193 --> n58
  n193 --> n62
  n193 --> n96
  n194 --> n95
  n195 --> n18
  n195 --> n47
  n195 --> n91
  n196 --> n100
  n197 --> n100
  n198 --> n100
  n199 --> n13
  n199 --> n26
  n200 --> n13
  n200 --> n102
  n201 --> n13
  n201 --> n101
  n202 --> n12
  n202 --> n13
  n203 --> n4
  n203 --> n102
  n204 --> n56
  n205 --> n26
  n205 --> n56
  n205 --> n102
  n206 --> n12
  n207 --> n102
  n208 --> n12
  n208 --> n102
  n209 --> n70
  n210 --> n70
  n211 --> n70
  n212 --> n70
  n213 --> n66
  n213 --> n70
  n214 --> n9
  n214 --> n10
  n214 --> n18
  n214 --> n47
  n214 --> n66
  n214 --> n67
  n214 --> n69
  n214 --> n93
  n214 --> n94
  n215 --> n9
  n215 --> n27
  n216 --> n10
  n217 --> n98
  n218 --> n9
  n218 --> n27
  n218 --> n69
  n219 --> n5
  n220 --> n27
  n220 --> n54
  n221 --> n9
  n221 --> n10
  n221 --> n40
  n222 --> n18
  n222 --> n27
  n223 --> n7
  n224 --> n54
  n225 --> n27
  n226 --> n70
  n227 --> n70
  n228 --> n9
  n228 --> n27
  n229 --> n65
  n229 --> n77
  n230 --> n68
  n230 --> n85
  n231 --> n20
  n231 --> n58
  n232 --> n16
  n232 --> n22
  n232 --> n23
  n232 --> n24
  n233 --> n25
  n233 --> n63
  n234 --> n29
  n234 --> n60
  n235 --> n8
  n235 --> n30
  n235 --> n43
  n235 --> n85
  n236 --> n31
  n236 --> n32
  n236 --> n33
  n236 --> n58
  n236 --> n63
  n237 --> n35
  n237 --> n63
  n237 --> n102
  n238 --> n6
  n239 --> n16
  n239 --> n42
  n240 --> n9
  n240 --> n16
  n240 --> n19
  n240 --> n44
  n240 --> n45
  n240 --> n82
  n240 --> n83
  n241 --> n16
  n241 --> n63
  n242 --> n19
  n242 --> n51
  n242 --> n99
  n243 --> n96
  n244 --> n55
  n245 --> n15
  n245 --> n21
  n245 --> n22
  n245 --> n29
  n245 --> n45
  n245 --> n67
  n245 --> n71
  n245 --> n73
  n245 --> n99
  n246 --> n16
  n246 --> n57
  n247 --> n19
  n248 --> n6
  n249 --> n98
  n250 --> n47
  n251 --> n72
  n252 --> n26
  n253 --> n28
  n254 --> n64
  n254 --> n80
  n255 --> n49
  n255 --> n50
  n255 --> n90
  n255 --> n96
  n256 --> n56
  n257 --> n16
  n257 --> n52
  n257 --> n53
  n257 --> n76
  n257 --> n77
  n258 --> n16
  n259 --> n17
  n259 --> n62
  n259 --> n87
  n259 --> n88
  n260 --> n3
  n260 --> n65
  n261 --> n17
  n261 --> n19
  n261 --> n49
  n261 --> n78
  n261 --> n82
  n261 --> n83
  n261 --> n84
  n262 --> n39
  n262 --> n45
  n262 --> n82
  n262 --> n83
  n263 --> n27
  n263 --> n37
  n263 --> n39
  n263 --> n48
  n263 --> n56
  n263 --> n91
  n264 --> n89
  n264 --> n102
  n265 --> n8
  n266 --> n95
  n267 --> n27
  n267 --> n37
  n267 --> n102
  n268 --> n48
  n268 --> n68
  n269 --> n9
  n269 --> n37
  n269 --> n39
  n270 --> n54
  n271 --> n56
  n272 --> n3
  n272 --> n9
  n273 --> n95
  n274 --> n9
  n274 --> n18
  n274 --> n37
  n274 --> n65
  n275 --> n101
  n275 --> n102
  n276 --> n94
  n277 --> n67
  n277 --> n89
  n278 --> n17
  n278 --> n93
  n279 --> n37
  n279 --> n91
  n280 --> n8
  n280 --> n37
  n281 --> n48
  n282 --> n93
  n283 --> n98
```
