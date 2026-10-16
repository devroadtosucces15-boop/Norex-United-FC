# DATABASE source connections

Static source references; this does not prove runtime invocation or SQL lineage. Top 100 by reference count.

```mermaid
flowchart LR
  n0[".github/workflows/backup.yml"]
  n1[".github/workflows/ea-relay.yml"]
  n2[".github/workflows/link-inbox.yml"]
  n3[".github/workflows/update.yml"]
  n4["TABLE D1"]
  n5["TABLE Discord"]
  n6["TABLE EA"]
  n7["TABLE League"]
  n8["TABLE RESEARCH"]
  n9["TABLE SET"]
  n10["TABLE The"]
  n11["TABLE You"]
  n12["TABLE a"]
  n13["TABLE achievements"]
  n14["TABLE activity"]
  n15["TABLE alerts"]
  n16["TABLE an"]
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
  n34["TABLE chat_members"]
  n35["TABLE chat_messages"]
  n36["TABLE chats"]
  n37["TABLE claims"]
  n38["TABLE class"]
  n39["TABLE club_index"]
  n40["TABLE confirmed"]
  n41["TABLE data"]
  n42["TABLE discoveries"]
  n43["TABLE discovery_useful"]
  n44["TABLE doc_acks"]
  n45["TABLE docs"]
  n46["TABLE ea_relay"]
  n47["TABLE event_checkins"]
  n48["TABLE event_rsvps"]
  n49["TABLE events"]
  n50["TABLE every"]
  n51["TABLE everyone"]
  n52["TABLE feedback"]
  n53["TABLE flag_overrides"]
  n54["TABLE fun_jail"]
  n55["TABLE fun_trivia_q"]
  n56["TABLE fun_trivia_scores"]
  n57["TABLE fun_wheels"]
  n58["TABLE guild_members"]
  n59["TABLE hof"]
  n60["TABLE hotw"]
  n61["TABLE hotw_votes"]
  n62["TABLE in"]
  n63["TABLE is"]
  n64["TABLE issue_reports"]
  n65["TABLE it"]
  n66["TABLE media"]
  n67["TABLE member_live"]
  n68["TABLE members"]
  n69["TABLE meta"]
  n70["TABLE my"]
  n71["TABLE my_builds"]
  n72["TABLE notes"]
  n73["TABLE notifications"]
  n74["TABLE notify_prefs"]
  n75["TABLE of"]
  n76["TABLE on"]
  n77["TABLE one"]
  n78["TABLE other"]
  n79["TABLE our"]
  n80["TABLE pathlib"]
  n81["TABLE play_assign"]
  n82["TABLE play_media"]
  n83["TABLE plays"]
  n84["TABLE post_reactions"]
  n85["TABLE posts"]
  n86["TABLE predictions"]
  n87["TABLE profiles"]
  n88["TABLE push_subs"]
  n89["TABLE requests"]
  n90["TABLE rush_matches"]
  n91["TABLE rush_players"]
  n92["TABLE rush_prefs"]
  n93["TABLE site"]
  n94["TABLE suggestions"]
  n95["TABLE that"]
  n96["TABLE the"]
  n97["TABLE their"]
  n98["TABLE this"]
  n99["TABLE trials"]
  n100["TABLE users"]
  n101["TABLE votes"]
  n102["TABLE watch_videos"]
  n103["TABLE your"]
  n104["bot/aiinsights.js"]
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
  n119["bot/discoveries.js"]
  n120["bot/docs.js"]
  n121["bot/events.js"]
  n122["bot/exportcontent.js"]
  n123["bot/faces.js"]
  n124["bot/feed.js"]
  n125["bot/feedback.js"]
  n126["bot/fun.js"]
  n127["bot/game.js"]
  n128["bot/health.js"]
  n129["bot/honours.js"]
  n130["bot/host.js"]
  n131["bot/hotw.js"]
  n132["bot/hub.js"]
  n133["bot/icons/make_icon.py"]
  n134["bot/insights.js"]
  n135["bot/issues.js"]
  n136["bot/lineuprec.js"]
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
  n163["bot/migrations/0026_profanity.sql"]
  n164["bot/migrations/0027_avatar_cards.sql"]
  n165["bot/migrations/0028_flag_overrides.sql"]
  n166["bot/migrations/0029_report_poster.sql"]
  n167["bot/migrations/0031_plays.sql"]
  n168["bot/migrations/0032_plays_discord.sql"]
  n169["bot/migrations/0033_play_media.sql"]
  n170["bot/migrations/0034_push.sql"]
  n171["bot/migrations/0035_event_plays.sql"]
  n172["bot/migrations/0036_burners.sql"]
  n173["bot/migrations/0037_ea_relay.sql"]
  n174["bot/migrations/0038_issue_reports.sql"]
  n175["bot/migrations/0039_card_studio.sql"]
  n176["bot/migrations/0040_card_generation.sql"]
  n177["bot/migrations/0042_card_dual_outputs.sql"]
  n178["bot/migrations/0043_card_artwork_review.sql"]
  n179["bot/migrations/0044_card_kit_number.sql"]
  n180["bot/migrations/0045_card_owner_uploads.sql"]
  n181["bot/migrations/0046_server_tools.sql"]
  n182["bot/migrations/0047_fun.sql"]
  n183["bot/migrations/0049_discoveries.sql"]
  n184["bot/migrations/0050_watchlist.sql"]
  n185["bot/migrations/0051_member_live.sql"]
  n186["bot/migrations/0052_feedback_reactions.sql"]
  n187["bot/migrations/0053_card_ai_notes.sql"]
  n188["bot/migrations/0053_club_docs_content.sql"]
  n189["bot/notify.js"]
  n190["bot/panel.js"]
  n191["bot/playmedia.js"]
  n192["bot/plays.js"]
  n193["bot/predict.js"]
  n194["bot/probuilds.js"]
  n195["bot/profanity.js"]
  n196["bot/profiles.js"]
  n197["bot/ratings.js"]
  n198["bot/recs.js"]
  n199["bot/register.mjs"]
  n200["bot/reminders.js"]
  n201["bot/roles.js"]
  n202["bot/servertools.js"]
  n203["bot/social.js"]
  n204["bot/squads.js"]
  n205["bot/statinsights.js"]
  n206["bot/trials.js"]
  n207["bot/voicerecap.js"]
  n208["bot/watchlist.js"]
  n209["bot/worker.js"]
  n210["data/updates/fc-27-career-mode-developer-launch-update.jso"]
  n211["data/updates/fc-27-fut-developer-launch-update.json"]
  n212["data/updates/fc-27-gameplay-developer-launch-update.json"]
  n213["data/updates/fc-27-the-grounds-developer-launch-update.jso"]
  n214["data/updates/pitch-notes-fc27-career-mode-deep-dive.json"]
  n215["data/updates/pitch-notes-fc27-fut-deep-dive.json"]
  n216["data/updates/pitch-notes-fc27-gameplay-deep-dive.json"]
  n217["data/updates/pitch-notes-fc27-launch-update.json"]
  n218["data/updates/pitch-notes-fc27-pc-deep-dive.json"]
  n219["data/updates/pitch-notes-fc27-the-grounds-deep-dive.json"]
  n220["scripts/build-atlas-explorer.py"]
  n221["scripts/build-atlas-history.py"]
  n222["scripts/build-atlas-local.py"]
  n223["scripts/build-atlas-private-view.py"]
  n224["scripts/build-system-atlas.py"]
  n225["scripts/build.mjs"]
  n226["scripts/builder-page.mjs"]
  n227["scripts/burners-page.mjs"]
  n228["scripts/docs-page.mjs"]
  n229["scripts/feed-page.mjs"]
  n230["scripts/fetch.mjs"]
  n231["scripts/leaders-page.mjs"]
  n232["scripts/lib/stars.mjs"]
  n233["scripts/link-inbox.mjs"]
  n234["scripts/messages-page.mjs"]
  n235["scripts/post-results.mjs"]
  n236["scripts/probuilds-page.mjs"]
  n237["scripts/serve-atlas-private.py"]
  n238["scripts/stars-sync.mjs"]
  n239["scripts/test-atlas-local.py"]
  n240["scripts/updates-page.mjs"]
  n241["scripts/updates.mjs"]
  n242["tests/ask.test.mjs"]
  n243["tests/avatarcard.test.mjs"]
  n244["tests/awards.test.mjs"]
  n245["tests/badges.test.mjs"]
  n246["tests/botfeat-sample.mjs"]
  n247["tests/builds.test.mjs"]
  n248["tests/burners-api.test.mjs"]
  n249["tests/burners.test.mjs"]
  n250["tests/cardstudio.test.mjs"]
  n251["tests/chat.test.mjs"]
  n252["tests/clublookup.test.mjs"]
  n253["tests/d1usage.test.mjs"]
  n254["tests/discoveries.test.mjs"]
  n255["tests/docs.test.mjs"]
  n256["tests/events.test.mjs"]
  n257["tests/feed.test.mjs"]
  n258["tests/fun.test.mjs"]
  n259["tests/honours.test.mjs"]
  n260["tests/host.test.mjs"]
  n261["tests/insights.test.mjs"]
  n262["tests/issues.test.mjs"]
  n263["tests/issuesrec.test.mjs"]
  n264["tests/locker.test.mjs"]
  n265["tests/media.test.mjs"]
  n266["tests/memberlive.test.mjs"]
  n267["tests/members.test.mjs"]
  n268["tests/mock.mjs"]
  n269["tests/next.test.mjs"]
  n270["tests/packs.test.mjs"]
  n271["tests/panel.test.mjs"]
  n272["tests/playmedia.test.mjs"]
  n273["tests/plays.test.mjs"]
  n274["tests/probuilds.test.mjs"]
  n275["tests/push.test.mjs"]
  n276["tests/quickcommands.test.mjs"]
  n277["tests/recorder.test.mjs"]
  n278["tests/reminders.test.mjs"]
  n279["tests/servertools.test.mjs"]
  n280["tests/site.test.mjs"]
  n281["tests/social.test.mjs"]
  n282["tests/statinsights.test.mjs"]
  n283["tests/updates.test.mjs"]
  n284["tests/watchlist.test.mjs"]
  n285["tests/wave10.test.mjs"]
  n286["tests/wave8.test.mjs"]
  n287["web/app.js"]
  n288["web/badges.js"]
  n289["web/boardroom.js"]
  n290["web/build-math.js"]
  n291["web/builder.js"]
  n292["web/docs.js"]
  n293["web/events.js"]
  n294["web/feed-public.js"]
  n295["web/feed.js"]
  n296["web/game.js"]
  n297["web/honours.js"]
  n298["web/metrics.js"]
  n299["web/mystats.js"]
  n300["web/profile.js"]
  n301["web/recs.js"]
  n302["web/report.js"]
  n303["web/scout.js"]
  n304["web/settings.js"]
  n305["web/squads.js"]
  n306["web/trials.js"]
  n0 --> n96
  n1 --> n96
  n2 --> n8
  n3 --> n6
  n3 --> n93
  n3 --> n96
  n104 --> n12
  n104 --> n96
  n104 --> n97
  n105 --> n5
  n105 --> n9
  n105 --> n20
  n106 --> n9
  n106 --> n21
  n106 --> n22
  n106 --> n23
  n106 --> n24
  n106 --> n37
  n106 --> n69
  n106 --> n96
  n107 --> n9
  n107 --> n13
  n107 --> n19
  n107 --> n25
  n107 --> n37
  n107 --> n68
  n107 --> n69
  n107 --> n77
  n107 --> n87
  n107 --> n90
  n107 --> n91
  n107 --> n96
  n107 --> n97
  n107 --> n100
  n107 --> n101
  n108 --> n14
  n108 --> n37
  n108 --> n48
  n108 --> n49
  n108 --> n87
  n108 --> n90
  n108 --> n91
  n108 --> n96
  n108 --> n100
  n109 --> n9
  n109 --> n37
  n109 --> n69
  n110 --> n29
  n110 --> n70
  n110 --> n71
  n110 --> n103
  n111 --> n9
  n111 --> n12
  n111 --> n30
  n111 --> n46
  n111 --> n93
  n111 --> n96
  n112 --> n41
  n112 --> n96
  n113 --> n31
  n113 --> n32
  n113 --> n33
  n113 --> n37
  n113 --> n76
  n113 --> n96
  n113 --> n100
  n114 --> n34
  n114 --> n35
  n114 --> n36
  n114 --> n68
  n114 --> n96
  n114 --> n100
  n115 --> n6
  n115 --> n9
  n115 --> n39
  n116 --> n15
  n116 --> n68
  n116 --> n78
  n116 --> n96
  n116 --> n98
  n117 --> n9
  n117 --> n39
  n117 --> n69
  n118 --> n9
  n118 --> n37
  n118 --> n69
  n119 --> n42
  n119 --> n43
  n119 --> n69
  n120 --> n9
  n120 --> n44
  n120 --> n45
  n120 --> n68
  n120 --> n69
  n120 --> n73
  n120 --> n94
  n120 --> n100
  n121 --> n6
  n121 --> n9
  n121 --> n12
  n121 --> n19
  n121 --> n37
  n121 --> n47
  n121 --> n48
  n121 --> n49
  n121 --> n68
  n121 --> n69
  n121 --> n81
  n121 --> n83
  n121 --> n87
  n121 --> n90
  n121 --> n91
  n121 --> n100
  n122 --> n9
  n123 --> n12
  n123 --> n31
  n123 --> n37
  n123 --> n58
  n123 --> n100
  n124 --> n66
  n124 --> n73
  n124 --> n84
  n124 --> n85
  n124 --> n100
  n125 --> n12
  n125 --> n37
  n125 --> n52
  n125 --> n73
  n125 --> n100
  n126 --> n9
  n126 --> n51
  n126 --> n54
  n126 --> n55
  n126 --> n56
  n126 --> n57
  n126 --> n69
  n126 --> n87
  n126 --> n100
  n127 --> n12
  n127 --> n29
  n127 --> n41
  n127 --> n95
  n127 --> n100
  n128 --> n39
  n128 --> n69
  n129 --> n19
  n129 --> n23
  n129 --> n24
  n129 --> n59
  n129 --> n68
  n129 --> n101
  n130 --> n87
  n131 --> n60
  n131 --> n61
  n131 --> n69
  n131 --> n84
  n131 --> n85
  n131 --> n100
  n132 --> n13
  n132 --> n14
  n132 --> n22
  n132 --> n48
  n132 --> n49
  n132 --> n68
  n133 --> n80
  n134 --> n19
  n134 --> n37
  n134 --> n49
  n134 --> n63
  n134 --> n69
  n134 --> n74
  n134 --> n89
  n134 --> n90
  n134 --> n99
  n134 --> n101
  n135 --> n14
  n135 --> n64
  n136 --> n17
  n136 --> n37
  n136 --> n48
  n136 --> n49
  n136 --> n87
  n137 --> n13
  n137 --> n22
  n137 --> n29
  n137 --> n48
  n137 --> n49
  n137 --> n68
  n137 --> n73
  n137 --> n81
  n137 --> n83
  n137 --> n101
  n138 --> n12
  n138 --> n50
  n138 --> n66
  n138 --> n79
  n138 --> n85
  n139 --> n67
  n139 --> n87
  n139 --> n97
  n140 --> n4
  n140 --> n14
  n140 --> n19
  n140 --> n21
  n140 --> n22
  n140 --> n29
  n140 --> n35
  n140 --> n36
  n140 --> n37
  n140 --> n44
  n140 --> n52
  n140 --> n53
  n140 --> n85
  n140 --> n86
  n140 --> n87
  n140 --> n88
  n140 --> n90
  n140 --> n91
  n140 --> n94
  n140 --> n101
  n141 --> n14
  n141 --> n19
  n141 --> n87
  n141 --> n101
  n142 --> n5
  n143 --> n90
  n143 --> n91
  n144 --> n5
  n144 --> n72
  n144 --> n99
  n145 --> n87
  n146 --> n59
  n147 --> n29
  n148 --> n28
  n148 --> n29
  n148 --> n71
  n149 --> n73
  n149 --> n74
  n149 --> n89
  n150 --> n13
  n150 --> n25
  n150 --> n87
  n151 --> n44
  n151 --> n45
  n151 --> n73
  n151 --> n94
  n152 --> n47
  n152 --> n48
  n152 --> n49
  n153 --> n49
  n153 --> n87
  n154 --> n21
  n154 --> n22
  n154 --> n23
  n154 --> n24
  n155 --> n92
  n156 --> n52
  n156 --> n86
  n157 --> n84
  n157 --> n85
  n158 --> n66
  n159 --> n12
  n159 --> n60
  n159 --> n61
  n160 --> n85
  n161 --> n34
  n161 --> n35
  n161 --> n36
  n162 --> n39
  n162 --> n78
  n163 --> n12
  n164 --> n20
  n165 --> n53
  n165 --> n76
  n166 --> n49
  n167 --> n81
  n167 --> n83
  n168 --> n83
  n169 --> n82
  n170 --> n88
  n171 --> n49
  n172 --> n30
  n173 --> n46
  n174 --> n64
  n175 --> n31
  n175 --> n32
  n175 --> n33
  n176 --> n31
  n177 --> n31
  n178 --> n31
  n179 --> n31
  n180 --> n31
  n181 --> n15
  n181 --> n58
  n182 --> n54
  n182 --> n55
  n182 --> n56
  n182 --> n57
  n183 --> n42
  n183 --> n43
  n184 --> n102
  n185 --> n67
  n186 --> n52
  n187 --> n31
  n188 --> n12
  n188 --> n16
  n188 --> n44
  n188 --> n45
  n188 --> n73
  n188 --> n95
  n189 --> n12
  n189 --> n44
  n189 --> n50
  n189 --> n73
  n189 --> n74
  n189 --> n88
  n189 --> n89
  n190 --> n31
  n190 --> n89
  n190 --> n90
  n190 --> n94
  n190 --> n98
  n191 --> n82
  n191 --> n83
  n192 --> n81
  n192 --> n83
  n193 --> n49
  n193 --> n86
  n193 --> n90
  n194 --> n28
  n194 --> n29
  n194 --> n70
  n194 --> n71
  n195 --> n12
  n196 --> n5
  n196 --> n14
  n196 --> n49
  n197 --> n65
  n198 --> n17
  n198 --> n19
  n198 --> n47
  n198 --> n48
  n198 --> n90
  n198 --> n91
  n198 --> n92
  n199 --> n68
  n200 --> n52
  n200 --> n73
  n201 --> n4
  n201 --> n5
  n201 --> n53
  n201 --> n76
  n202 --> n15
  n202 --> n58
  n202 --> n85
  n203 --> n73
  n203 --> n85
  n204 --> n48
  n204 --> n92
  n205 --> n72
  n206 --> n63
  n206 --> n68
  n206 --> n72
  n206 --> n99
  n207 --> n98
  n208 --> n102
  n209 --> n15
  n209 --> n50
  n209 --> n95
  n210 --> n11
  n210 --> n26
  n211 --> n11
  n211 --> n103
  n212 --> n11
  n213 --> n10
  n213 --> n11
  n214 --> n103
  n215 --> n65
  n216 --> n26
  n216 --> n65
  n216 --> n103
  n217 --> n10
  n218 --> n103
  n219 --> n10
  n219 --> n103
  n220 --> n80
  n221 --> n80
  n222 --> n80
  n223 --> n80
  n224 --> n76
  n224 --> n80
  n225 --> n6
  n225 --> n7
  n225 --> n16
  n225 --> n18
  n225 --> n50
  n225 --> n76
  n225 --> n77
  n225 --> n79
  n225 --> n97
  n226 --> n6
  n226 --> n27
  n227 --> n7
  n228 --> n6
  n228 --> n27
  n228 --> n79
  n229 --> n27
  n229 --> n62
  n230 --> n6
  n230 --> n7
  n230 --> n41
  n231 --> n18
  n231 --> n27
  n232 --> n16
  n233 --> n8
  n234 --> n62
  n235 --> n93
  n236 --> n27
  n237 --> n80
  n238 --> n8
  n238 --> n77
  n239 --> n80
  n240 --> n6
  n240 --> n27
  n241 --> n75
  n241 --> n85
  n242 --> n78
  n242 --> n93
  n243 --> n20
  n243 --> n68
  n244 --> n14
  n244 --> n22
  n244 --> n23
  n244 --> n24
  n245 --> n13
  n245 --> n25
  n245 --> n68
  n245 --> n73
  n246 --> n31
  n246 --> n42
  n246 --> n43
  n246 --> n54
  n246 --> n56
  n246 --> n67
  n246 --> n72
  n246 --> n102
  n247 --> n29
  n247 --> n70
  n248 --> n30
  n249 --> n5
  n249 --> n30
  n249 --> n46
  n249 --> n93
  n250 --> n26
  n250 --> n31
  n250 --> n32
  n250 --> n33
  n250 --> n73
  n251 --> n36
  n251 --> n103
  n252 --> n4
  n253 --> n34
  n253 --> n35
  n253 --> n36
  n253 --> n53
  n253 --> n59
  n254 --> n42
  n255 --> n14
  n255 --> n44
  n255 --> n45
  n256 --> n6
  n256 --> n14
  n256 --> n19
  n256 --> n47
  n256 --> n48
  n256 --> n90
  n256 --> n91
  n257 --> n14
  n258 --> n55
  n258 --> n56
  n258 --> n57
  n259 --> n19
  n259 --> n59
  n259 --> n101
  n260 --> n58
  n261 --> n99
  n262 --> n64
  n263 --> n14
  n263 --> n64
  n264 --> n13
  n264 --> n21
  n264 --> n22
  n264 --> n29
  n264 --> n48
  n264 --> n77
  n264 --> n81
  n264 --> n83
  n264 --> n101
  n265 --> n14
  n265 --> n66
  n266 --> n67
  n267 --> n19
  n268 --> n4
  n269 --> n17
  n269 --> n50
  n270 --> n50
  n271 --> n89
  n271 --> n90
  n271 --> n94
  n272 --> n82
  n273 --> n26
  n274 --> n28
  n275 --> n74
  n275 --> n88
  n276 --> n52
  n276 --> n53
  n276 --> n94
  n276 --> n99
  n277 --> n65
  n278 --> n52
  n279 --> n15
  n279 --> n58
  n280 --> n65
  n281 --> n60
  n281 --> n61
  n281 --> n84
  n281 --> n85
  n282 --> n17
  n282 --> n72
  n283 --> n75
  n284 --> n102
  n285 --> n17
  n285 --> n19
  n285 --> n52
  n285 --> n86
  n285 --> n90
  n285 --> n91
  n285 --> n92
  n286 --> n40
  n286 --> n48
  n286 --> n91
  n287 --> n27
  n287 --> n38
  n287 --> n40
  n287 --> n51
  n287 --> n65
  n287 --> n95
  n288 --> n103
  n289 --> n5
  n290 --> n98
  n291 --> n27
  n291 --> n38
  n291 --> n103
  n292 --> n51
  n292 --> n78
  n293 --> n6
  n293 --> n38
  n293 --> n40
  n294 --> n62
  n295 --> n65
  n296 --> n6
  n296 --> n16
  n297 --> n98
  n298 --> n6
  n298 --> n18
  n298 --> n38
  n298 --> n75
  n299 --> n103
  n300 --> n77
  n301 --> n17
  n301 --> n97
  n302 --> n63
  n303 --> n38
  n303 --> n95
  n304 --> n5
  n304 --> n38
  n305 --> n51
  n306 --> n97
```
