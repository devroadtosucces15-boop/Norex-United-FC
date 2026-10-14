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
  n38["TABLE doc_acks"]
  n39["TABLE docs"]
  n40["TABLE ea_relay"]
  n41["TABLE event_checkins"]
  n42["TABLE event_rsvps"]
  n43["TABLE events"]
  n44["TABLE every"]
  n45["TABLE everyone"]
  n46["TABLE feedback"]
  n47["TABLE flag_overrides"]
  n48["TABLE guild_members"]
  n49["TABLE hof"]
  n50["TABLE hotw"]
  n51["TABLE hotw_votes"]
  n52["TABLE in"]
  n53["TABLE issue_reports"]
  n54["TABLE it"]
  n55["TABLE media"]
  n56["TABLE members"]
  n57["TABLE meta"]
  n58["TABLE my"]
  n59["TABLE my_builds"]
  n60["TABLE notes"]
  n61["TABLE notifications"]
  n62["TABLE notify_prefs"]
  n63["TABLE of"]
  n64["TABLE on"]
  n65["TABLE one"]
  n66["TABLE other"]
  n67["TABLE our"]
  n68["TABLE pathlib"]
  n69["TABLE play_assign"]
  n70["TABLE play_media"]
  n71["TABLE plays"]
  n72["TABLE points_log"]
  n73["TABLE post_comments"]
  n74["TABLE post_reactions"]
  n75["TABLE posts"]
  n76["TABLE predictions"]
  n77["TABLE profiles"]
  n78["TABLE push_subs"]
  n79["TABLE reminders"]
  n80["TABLE requests"]
  n81["TABLE rush_matches"]
  n82["TABLE rush_players"]
  n83["TABLE rush_prefs"]
  n84["TABLE site"]
  n85["TABLE star_ratings"]
  n86["TABLE stat_insight_feedback"]
  n87["TABLE stat_insights"]
  n88["TABLE stats"]
  n89["TABLE suggestions"]
  n90["TABLE tags"]
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
  n101["TABLE worker"]
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
  n177["bot/migrations/0046_server_tools.sql"]
  n178["bot/notify.js"]
  n179["bot/playmedia.js"]
  n180["bot/plays.js"]
  n181["bot/points.js"]
  n182["bot/predict.js"]
  n183["bot/probuilds.js"]
  n184["bot/profanity.js"]
  n185["bot/profiles.js"]
  n186["bot/ratings.js"]
  n187["bot/recs.js"]
  n188["bot/register.mjs"]
  n189["bot/roles.js"]
  n190["bot/servertools.js"]
  n191["bot/settings.js"]
  n192["bot/social.js"]
  n193["bot/squads.js"]
  n194["bot/statinsights.js"]
  n195["bot/trials.js"]
  n196["bot/voicerecap.js"]
  n197["bot/worker.js"]
  n198["data/clubs/76051.json"]
  n199["data/matches/51032003360095.json"]
  n200["data/state.json"]
  n201["data/updates/fc-27-career-mode-developer-launch-update.jso"]
  n202["data/updates/fc-27-fut-developer-launch-update.json"]
  n203["data/updates/fc-27-gameplay-developer-launch-update.json"]
  n204["data/updates/fc-27-the-grounds-developer-launch-update.jso"]
  n205["data/updates/pitch-notes-fc27-career-mode-deep-dive.json"]
  n206["data/updates/pitch-notes-fc27-fut-deep-dive.json"]
  n207["data/updates/pitch-notes-fc27-gameplay-deep-dive.json"]
  n208["data/updates/pitch-notes-fc27-launch-update.json"]
  n209["data/updates/pitch-notes-fc27-pc-deep-dive.json"]
  n210["data/updates/pitch-notes-fc27-the-grounds-deep-dive.json"]
  n211["scripts/build-atlas-explorer.py"]
  n212["scripts/build-atlas-history.py"]
  n213["scripts/build-atlas-local.py"]
  n214["scripts/build-atlas-private-view.py"]
  n215["scripts/build-system-atlas.py"]
  n216["scripts/build.mjs"]
  n217["scripts/builder-page.mjs"]
  n218["scripts/burners-page.mjs"]
  n219["scripts/charts.mjs"]
  n220["scripts/docs-page.mjs"]
  n221["scripts/feed-page.mjs"]
  n222["scripts/fetch.mjs"]
  n223["scripts/leaders-page.mjs"]
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
  n235["tests/burners-api.test.mjs"]
  n236["tests/burners.test.mjs"]
  n237["tests/cardstudio.test.mjs"]
  n238["tests/chat.test.mjs"]
  n239["tests/clublookup.test.mjs"]
  n240["tests/docs.test.mjs"]
  n241["tests/events.test.mjs"]
  n242["tests/feed.test.mjs"]
  n243["tests/honours.test.mjs"]
  n244["tests/insights.test.mjs"]
  n245["tests/issues.test.mjs"]
  n246["tests/locker.test.mjs"]
  n247["tests/media.test.mjs"]
  n248["tests/members.test.mjs"]
  n249["tests/mock.mjs"]
  n250["tests/next.test.mjs"]
  n251["tests/packs.test.mjs"]
  n252["tests/playmedia.test.mjs"]
  n253["tests/plays.test.mjs"]
  n254["tests/probuilds.test.mjs"]
  n255["tests/push.test.mjs"]
  n256["tests/quickcommands.test.mjs"]
  n257["tests/servertools.test.mjs"]
  n258["tests/site.test.mjs"]
  n259["tests/social.test.mjs"]
  n260["tests/squads.test.mjs"]
  n261["tests/statinsights.test.mjs"]
  n262["tests/updates.test.mjs"]
  n263["tests/wave10.test.mjs"]
  n264["tests/wave8.test.mjs"]
  n265["web/app.js"]
  n266["web/badges.js"]
  n267["web/boardroom.js"]
  n268["web/build-math.js"]
  n269["web/builder.js"]
  n270["web/docs.js"]
  n271["web/events.js"]
  n272["web/feed-public.js"]
  n273["web/feed.js"]
  n274["web/game.js"]
  n275["web/honours.js"]
  n276["web/metrics.js"]
  n277["web/mystats.js"]
  n278["web/notify.js"]
  n279["web/profile.js"]
  n280["web/recs.js"]
  n281["web/scout.js"]
  n282["web/settings.js"]
  n283["web/squads.js"]
  n284["web/trials.js"]
  n285["web/vthumb.js"]
  n0 --> n92
  n1 --> n92
  n2 --> n5
  n2 --> n84
  n103 --> n10
  n103 --> n92
  n103 --> n93
  n104 --> n4
  n104 --> n7
  n104 --> n17
  n105 --> n7
  n105 --> n18
  n105 --> n19
  n105 --> n20
  n105 --> n21
  n105 --> n33
  n105 --> n57
  n105 --> n92
  n106 --> n7
  n106 --> n11
  n106 --> n16
  n106 --> n22
  n106 --> n33
  n106 --> n56
  n106 --> n57
  n106 --> n65
  n106 --> n77
  n106 --> n81
  n106 --> n82
  n106 --> n92
  n106 --> n93
  n106 --> n97
  n106 --> n99
  n107 --> n12
  n107 --> n33
  n107 --> n42
  n107 --> n43
  n107 --> n72
  n107 --> n77
  n107 --> n81
  n107 --> n82
  n107 --> n92
  n107 --> n97
  n107 --> n101
  n108 --> n7
  n108 --> n33
  n108 --> n57
  n109 --> n26
  n109 --> n58
  n109 --> n59
  n109 --> n102
  n110 --> n7
  n110 --> n10
  n110 --> n27
  n110 --> n40
  n110 --> n84
  n110 --> n92
  n110 --> n94
  n111 --> n37
  n111 --> n92
  n112 --> n28
  n112 --> n29
  n112 --> n30
  n112 --> n33
  n112 --> n92
  n112 --> n97
  n113 --> n31
  n113 --> n32
  n113 --> n56
  n113 --> n92
  n113 --> n97
  n114 --> n5
  n114 --> n7
  n114 --> n35
  n115 --> n13
  n115 --> n56
  n115 --> n66
  n115 --> n92
  n115 --> n95
  n116 --> n7
  n116 --> n35
  n116 --> n57
  n117 --> n7
  n117 --> n33
  n117 --> n57
  n118 --> n7
  n118 --> n38
  n118 --> n39
  n118 --> n56
  n118 --> n57
  n118 --> n61
  n118 --> n89
  n118 --> n97
  n119 --> n5
  n119 --> n7
  n119 --> n10
  n119 --> n16
  n119 --> n33
  n119 --> n41
  n119 --> n42
  n119 --> n43
  n119 --> n56
  n119 --> n69
  n119 --> n71
  n119 --> n77
  n119 --> n81
  n119 --> n82
  n119 --> n92
  n119 --> n97
  n120 --> n7
  n121 --> n55
  n121 --> n61
  n121 --> n73
  n121 --> n74
  n121 --> n75
  n121 --> n97
  n122 --> n10
  n122 --> n33
  n122 --> n46
  n122 --> n61
  n122 --> n97
  n123 --> n10
  n123 --> n26
  n123 --> n37
  n123 --> n91
  n123 --> n97
  n124 --> n35
  n124 --> n57
  n125 --> n16
  n125 --> n20
  n125 --> n21
  n125 --> n49
  n125 --> n56
  n125 --> n99
  n126 --> n7
  n126 --> n50
  n126 --> n51
  n126 --> n57
  n126 --> n74
  n126 --> n75
  n126 --> n97
  n127 --> n11
  n127 --> n12
  n127 --> n19
  n127 --> n42
  n127 --> n43
  n127 --> n56
  n127 --> n97
  n128 --> n68
  n129 --> n16
  n129 --> n33
  n129 --> n43
  n129 --> n57
  n129 --> n62
  n129 --> n80
  n129 --> n81
  n129 --> n96
  n129 --> n97
  n129 --> n99
  n130 --> n53
  n131 --> n14
  n131 --> n33
  n131 --> n42
  n131 --> n43
  n131 --> n77
  n132 --> n11
  n132 --> n19
  n132 --> n26
  n132 --> n42
  n132 --> n43
  n132 --> n56
  n132 --> n61
  n132 --> n69
  n132 --> n71
  n132 --> n99
  n133 --> n10
  n133 --> n44
  n133 --> n55
  n133 --> n57
  n133 --> n67
  n133 --> n75
  n134 --> n3
  n134 --> n12
  n134 --> n16
  n134 --> n18
  n134 --> n19
  n134 --> n26
  n134 --> n31
  n134 --> n32
  n134 --> n33
  n134 --> n38
  n134 --> n46
  n134 --> n47
  n134 --> n57
  n134 --> n75
  n134 --> n76
  n134 --> n77
  n134 --> n78
  n134 --> n81
  n134 --> n82
  n134 --> n85
  n134 --> n89
  n134 --> n99
  n135 --> n12
  n135 --> n16
  n135 --> n33
  n135 --> n57
  n135 --> n77
  n135 --> n99
  n136 --> n4
  n137 --> n81
  n137 --> n82
  n138 --> n4
  n138 --> n60
  n138 --> n96
  n139 --> n77
  n140 --> n49
  n141 --> n26
  n142 --> n25
  n142 --> n26
  n142 --> n59
  n143 --> n61
  n143 --> n62
  n143 --> n80
  n144 --> n11
  n144 --> n22
  n144 --> n77
  n144 --> n88
  n145 --> n38
  n145 --> n39
  n145 --> n61
  n145 --> n89
  n146 --> n41
  n146 --> n42
  n146 --> n43
  n147 --> n43
  n147 --> n77
  n148 --> n18
  n148 --> n19
  n148 --> n20
  n148 --> n21
  n149 --> n83
  n150 --> n46
  n150 --> n76
  n150 --> n85
  n151 --> n73
  n151 --> n74
  n151 --> n75
  n152 --> n55
  n153 --> n10
  n153 --> n50
  n153 --> n51
  n154 --> n75
  n155 --> n31
  n155 --> n32
  n156 --> n35
  n156 --> n66
  n157 --> n72
  n158 --> n10
  n159 --> n17
  n160 --> n47
  n160 --> n64
  n161 --> n43
  n162 --> n86
  n162 --> n87
  n163 --> n69
  n163 --> n71
  n164 --> n71
  n165 --> n70
  n166 --> n78
  n167 --> n43
  n168 --> n27
  n169 --> n40
  n170 --> n53
  n171 --> n28
  n171 --> n29
  n171 --> n30
  n172 --> n28
  n173 --> n28
  n174 --> n28
  n175 --> n28
  n176 --> n28
  n177 --> n13
  n177 --> n48
  n177 --> n79
  n177 --> n90
  n178 --> n10
  n178 --> n38
  n178 --> n44
  n178 --> n61
  n178 --> n62
  n178 --> n78
  n178 --> n80
  n179 --> n70
  n179 --> n71
  n180 --> n69
  n180 --> n71
  n181 --> n72
  n182 --> n43
  n182 --> n76
  n182 --> n81
  n183 --> n25
  n183 --> n26
  n183 --> n58
  n183 --> n59
  n184 --> n10
  n185 --> n4
  n185 --> n12
  n185 --> n43
  n185 --> n77
  n186 --> n54
  n186 --> n85
  n187 --> n14
  n187 --> n16
  n187 --> n41
  n187 --> n42
  n187 --> n77
  n187 --> n81
  n187 --> n82
  n187 --> n83
  n188 --> n56
  n189 --> n3
  n189 --> n4
  n189 --> n47
  n190 --> n13
  n190 --> n48
  n190 --> n75
  n190 --> n79
  n190 --> n90
  n190 --> n101
  n191 --> n10
  n192 --> n61
  n192 --> n73
  n192 --> n75
  n193 --> n42
  n193 --> n77
  n193 --> n83
  n194 --> n10
  n194 --> n60
  n194 --> n86
  n194 --> n87
  n194 --> n101
  n195 --> n56
  n195 --> n60
  n195 --> n96
  n196 --> n95
  n197 --> n13
  n197 --> n15
  n197 --> n44
  n197 --> n91
  n198 --> n100
  n199 --> n100
  n200 --> n100
  n201 --> n9
  n201 --> n23
  n202 --> n9
  n202 --> n102
  n203 --> n9
  n204 --> n8
  n204 --> n9
  n205 --> n102
  n206 --> n54
  n207 --> n23
  n207 --> n54
  n207 --> n102
  n208 --> n8
  n209 --> n102
  n210 --> n8
  n210 --> n102
  n211 --> n68
  n212 --> n68
  n213 --> n68
  n214 --> n68
  n215 --> n64
  n215 --> n68
  n216 --> n5
  n216 --> n6
  n216 --> n15
  n216 --> n44
  n216 --> n64
  n216 --> n65
  n216 --> n67
  n216 --> n93
  n216 --> n94
  n217 --> n5
  n217 --> n24
  n218 --> n6
  n219 --> n98
  n220 --> n5
  n220 --> n24
  n220 --> n67
  n221 --> n24
  n221 --> n52
  n222 --> n5
  n222 --> n6
  n222 --> n37
  n223 --> n15
  n223 --> n24
  n224 --> n52
  n225 --> n24
  n226 --> n68
  n227 --> n68
  n228 --> n5
  n228 --> n24
  n229 --> n63
  n229 --> n75
  n230 --> n66
  n230 --> n84
  n231 --> n17
  n231 --> n56
  n232 --> n12
  n232 --> n19
  n232 --> n20
  n232 --> n21
  n233 --> n11
  n233 --> n22
  n233 --> n56
  n233 --> n61
  n234 --> n26
  n234 --> n58
  n235 --> n27
  n236 --> n4
  n236 --> n27
  n236 --> n40
  n236 --> n84
  n237 --> n28
  n237 --> n29
  n237 --> n30
  n237 --> n61
  n238 --> n32
  n238 --> n61
  n238 --> n102
  n239 --> n3
  n240 --> n12
  n240 --> n39
  n241 --> n5
  n241 --> n12
  n241 --> n16
  n241 --> n41
  n241 --> n42
  n241 --> n81
  n241 --> n82
  n242 --> n12
  n242 --> n61
  n243 --> n16
  n243 --> n49
  n243 --> n99
  n244 --> n96
  n245 --> n53
  n246 --> n11
  n246 --> n18
  n246 --> n19
  n246 --> n26
  n246 --> n42
  n246 --> n65
  n246 --> n69
  n246 --> n71
  n246 --> n99
  n247 --> n12
  n247 --> n55
  n248 --> n16
  n249 --> n3
  n250 --> n14
  n250 --> n44
  n250 --> n98
  n251 --> n44
  n252 --> n70
  n253 --> n23
  n254 --> n25
  n255 --> n62
  n255 --> n78
  n256 --> n46
  n256 --> n47
  n256 --> n89
  n256 --> n96
  n257 --> n13
  n257 --> n48
  n257 --> n79
  n257 --> n90
  n258 --> n54
  n259 --> n12
  n259 --> n50
  n259 --> n51
  n259 --> n74
  n259 --> n75
  n260 --> n12
  n261 --> n14
  n261 --> n60
  n261 --> n86
  n261 --> n87
  n262 --> n63
  n263 --> n14
  n263 --> n16
  n263 --> n46
  n263 --> n76
  n263 --> n81
  n263 --> n82
  n263 --> n83
  n264 --> n36
  n264 --> n42
  n264 --> n81
  n264 --> n82
  n265 --> n24
  n265 --> n34
  n265 --> n36
  n265 --> n45
  n265 --> n54
  n265 --> n91
  n266 --> n88
  n266 --> n102
  n267 --> n4
  n268 --> n95
  n269 --> n24
  n269 --> n34
  n269 --> n102
  n270 --> n45
  n270 --> n66
  n271 --> n5
  n271 --> n34
  n271 --> n36
  n272 --> n52
  n273 --> n54
  n274 --> n5
  n275 --> n95
  n276 --> n5
  n276 --> n15
  n276 --> n34
  n276 --> n63
  n277 --> n102
  n278 --> n94
  n279 --> n65
  n279 --> n88
  n280 --> n14
  n280 --> n93
  n281 --> n34
  n281 --> n91
  n282 --> n4
  n282 --> n34
  n283 --> n45
  n284 --> n93
  n285 --> n98
```
