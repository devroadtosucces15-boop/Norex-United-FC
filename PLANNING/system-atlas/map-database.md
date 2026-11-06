# DATABASE source connections

Static source references; this does not prove runtime invocation or SQL lineage. Top 100 by reference count.

```mermaid
flowchart LR
  n0[".github/workflows/backup.yml"]
  n1[".github/workflows/ea-relay.yml"]
  n2[".github/workflows/issues-sync.yml"]
  n3[".github/workflows/link-inbox.yml"]
  n4[".github/workflows/update.yml"]
  n5["TABLE D1"]
  n6["TABLE Discord"]
  n7["TABLE EA"]
  n8["TABLE GitHub"]
  n9["TABLE League"]
  n10["TABLE RESEARCH"]
  n11["TABLE SET"]
  n12["TABLE The"]
  n13["TABLE You"]
  n14["TABLE a"]
  n15["TABLE achievements"]
  n16["TABLE activity"]
  n17["TABLE alerts"]
  n18["TABLE an"]
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
  n36["TABLE chat_members"]
  n37["TABLE chat_messages"]
  n38["TABLE chats"]
  n39["TABLE claims"]
  n40["TABLE class"]
  n41["TABLE club_index"]
  n42["TABLE confirmed"]
  n43["TABLE data"]
  n44["TABLE details"]
  n45["TABLE discoveries"]
  n46["TABLE discovery_useful"]
  n47["TABLE doc_acks"]
  n48["TABLE docs"]
  n49["TABLE ea_relay"]
  n50["TABLE event_answer_log"]
  n51["TABLE event_checkins"]
  n52["TABLE event_rsvps"]
  n53["TABLE events"]
  n54["TABLE every"]
  n55["TABLE everyone"]
  n56["TABLE feedback"]
  n57["TABLE flag_overrides"]
  n58["TABLE fun_jail"]
  n59["TABLE fun_trivia_q"]
  n60["TABLE fun_trivia_scores"]
  n61["TABLE fun_wheels"]
  n62["TABLE guild_members"]
  n63["TABLE here"]
  n64["TABLE hof"]
  n65["TABLE is"]
  n66["TABLE issue_reports"]
  n67["TABLE it"]
  n68["TABLE media"]
  n69["TABLE member_live"]
  n70["TABLE members"]
  n71["TABLE meta"]
  n72["TABLE notes"]
  n73["TABLE notifications"]
  n74["TABLE notify_prefs"]
  n75["TABLE on"]
  n76["TABLE one"]
  n77["TABLE other"]
  n78["TABLE panjab"]
  n79["TABLE pathlib"]
  n80["TABLE play_assign"]
  n81["TABLE plays"]
  n82["TABLE post_reactions"]
  n83["TABLE posts"]
  n84["TABLE predictions"]
  n85["TABLE profiles"]
  n86["TABLE push_subs"]
  n87["TABLE requests"]
  n88["TABLE rush_matches"]
  n89["TABLE rush_players"]
  n90["TABLE rush_prefs"]
  n91["TABLE server"]
  n92["TABLE site"]
  n93["TABLE suggestions"]
  n94["TABLE that"]
  n95["TABLE the"]
  n96["TABLE their"]
  n97["TABLE this"]
  n98["TABLE trials"]
  n99["TABLE users"]
  n100["TABLE v1"]
  n101["TABLE votes"]
  n102["TABLE watch_creators"]
  n103["TABLE watch_videos"]
  n104["TABLE your"]
  n105["bot/aiinsights.js"]
  n106["bot/alertroute.js"]
  n107["bot/avatarcard.js"]
  n108["bot/awards.js"]
  n109["bot/badges.js"]
  n110["bot/botcmds.js"]
  n111["bot/botcommands.js"]
  n112["bot/builds.js"]
  n113["bot/burners.js"]
  n114["bot/burnerstats.js"]
  n115["bot/cardstudio.js"]
  n116["bot/chat.js"]
  n117["bot/clublookup.js"]
  n118["bot/commanddefs.js"]
  n119["bot/crawl.js"]
  n120["bot/discordroles.js"]
  n121["bot/discoveries.js"]
  n122["bot/docs.js"]
  n123["bot/events.js"]
  n124["bot/exportcontent.js"]
  n125["bot/faces.js"]
  n126["bot/feed.js"]
  n127["bot/feedback.js"]
  n128["bot/fun.js"]
  n129["bot/game.js"]
  n130["bot/health.js"]
  n131["bot/honours.js"]
  n132["bot/host.js"]
  n133["bot/hotw.js"]
  n134["bot/hub.js"]
  n135["bot/icons/make_icon.py"]
  n136["bot/insights.js"]
  n137["bot/issues.js"]
  n138["bot/limits.js"]
  n139["bot/lineuprec.js"]
  n140["bot/locker.js"]
  n141["bot/media.js"]
  n142["bot/memberlive.js"]
  n143["bot/members.js"]
  n144["bot/migrations/0001_init.sql"]
  n145["bot/migrations/0002_roles.sql"]
  n146["bot/migrations/0003_rush.sql"]
  n147["bot/migrations/0005_trials.sql"]
  n148["bot/migrations/0006_profile2.sql"]
  n149["bot/migrations/0007_hof.sql"]
  n150["bot/migrations/0008_builds.sql"]
  n151["bot/migrations/0009_probuilds.sql"]
  n152["bot/migrations/0010_notify.sql"]
  n153["bot/migrations/0011_badges.sql"]
  n154["bot/migrations/0012_docs.sql"]
  n155["bot/migrations/0013_events.sql"]
  n156["bot/migrations/0014_wave8.sql"]
  n157["bot/migrations/0015_awards.sql"]
  n158["bot/migrations/0016_squads.sql"]
  n159["bot/migrations/0017_wave10.sql"]
  n160["bot/migrations/0018_feed.sql"]
  n161["bot/migrations/0019_media.sql"]
  n162["bot/migrations/0020_social.sql"]
  n163["bot/migrations/0021_feed_share.sql"]
  n164["bot/migrations/0022_chats.sql"]
  n165["bot/migrations/0024_crawl.sql"]
  n166["bot/migrations/0026_profanity.sql"]
  n167["bot/migrations/0027_avatar_cards.sql"]
  n168["bot/migrations/0028_flag_overrides.sql"]
  n169["bot/migrations/0029_report_poster.sql"]
  n170["bot/migrations/0031_plays.sql"]
  n171["bot/migrations/0032_plays_discord.sql"]
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
  n186["bot/migrations/0050_watchlist.sql"]
  n187["bot/migrations/0051_member_live.sql"]
  n188["bot/migrations/0052_feedback_reactions.sql"]
  n189["bot/migrations/0053_card_ai_notes.sql"]
  n190["bot/migrations/0053_club_docs_content.sql"]
  n191["bot/migrations/0055_lineup_home.sql"]
  n192["bot/migrations/0056_watchlist_channel.sql"]
  n193["bot/migrations/0057_forced_dm.sql"]
  n194["bot/migrations/0058_event_answers.sql"]
  n195["bot/notifcenter.js"]
  n196["bot/notify.js"]
  n197["bot/panel.js"]
  n198["bot/playmedia.js"]
  n199["bot/plays.js"]
  n200["bot/predict.js"]
  n201["bot/probuilds.js"]
  n202["bot/profiles.js"]
  n203["bot/ratings.js"]
  n204["bot/recs.js"]
  n205["bot/register.mjs"]
  n206["bot/reminders.js"]
  n207["bot/roles.js"]
  n208["bot/routing.js"]
  n209["bot/servertools.js"]
  n210["bot/social.js"]
  n211["bot/squads.js"]
  n212["bot/statinsights.js"]
  n213["bot/streamalerts.js"]
  n214["bot/trials.js"]
  n215["bot/voicerecap.js"]
  n216["bot/watchlist.js"]
  n217["bot/worker.js"]
  n218["data/clubs/1086886.json"]
  n219["data/matches/169336812580083.json"]
  n220["data/matches/169578657690016.json"]
  n221["data/state.json"]
  n222["data/updates/fc-27-career-mode-developer-launch-update.jso"]
  n223["data/updates/fc-27-fut-developer-launch-update.json"]
  n224["data/updates/fc-27-gameplay-developer-launch-update.json"]
  n225["data/updates/fc-27-the-grounds-developer-archetypes-update"]
  n226["data/updates/fc-27-the-grounds-developer-launch-update.jso"]
  n227["data/updates/fc27-title-update-v1-0-4.json"]
  n228["data/updates/fc27-title-update-v1-1-0.json"]
  n229["data/updates/pitch-notes-fc27-career-mode-deep-dive.json"]
  n230["data/updates/pitch-notes-fc27-fut-deep-dive.json"]
  n231["data/updates/pitch-notes-fc27-gameplay-deep-dive.json"]
  n232["data/updates/pitch-notes-fc27-launch-update.json"]
  n233["data/updates/pitch-notes-fc27-pc-deep-dive.json"]
  n234["data/updates/pitch-notes-fc27-the-grounds-deep-dive.json"]
  n235["data/updates/title-update-v1-0-3.json"]
  n236["data/updates/update-v1-1-pitch-notes.json"]
  n237["scripts/build-atlas-explorer.py"]
  n238["scripts/build-atlas-history.py"]
  n239["scripts/build-atlas-local.py"]
  n240["scripts/build-atlas-private-view.py"]
  n241["scripts/build-system-atlas.py"]
  n242["scripts/build.mjs"]
  n243["scripts/builder-page.mjs"]
  n244["scripts/burners-page.mjs"]
  n245["scripts/docs-page.mjs"]
  n246["scripts/feed-page.mjs"]
  n247["scripts/fetch.mjs"]
  n248["scripts/issues-sync.mjs"]
  n249["scripts/leaders-page.mjs"]
  n250["scripts/lib/events.mjs"]
  n251["scripts/lib/resultpost.mjs"]
  n252["scripts/lib/stars.mjs"]
  n253["scripts/link-inbox.mjs"]
  n254["scripts/post-results.mjs"]
  n255["scripts/probuilds-page.mjs"]
  n256["scripts/serve-atlas-private.py"]
  n257["scripts/stars-sync.mjs"]
  n258["scripts/test-atlas-local.py"]
  n259["scripts/updates-page.mjs"]
  n260["scripts/updates.mjs"]
  n261["tests/ask.test.mjs"]
  n262["tests/avatarcard.test.mjs"]
  n263["tests/awards.test.mjs"]
  n264["tests/badges.test.mjs"]
  n265["tests/botfeat-sample.mjs"]
  n266["tests/builds.test.mjs"]
  n267["tests/burners-api.test.mjs"]
  n268["tests/burners.test.mjs"]
  n269["tests/cardstudio.test.mjs"]
  n270["tests/chat.test.mjs"]
  n271["tests/checkin.test.mjs"]
  n272["tests/clublookup.test.mjs"]
  n273["tests/d1usage.test.mjs"]
  n274["tests/discoveries.test.mjs"]
  n275["tests/docs.test.mjs"]
  n276["tests/eventdecode.test.mjs"]
  n277["tests/events.test.mjs"]
  n278["tests/feed.test.mjs"]
  n279["tests/fun.test.mjs"]
  n280["tests/honours.test.mjs"]
  n281["tests/host.test.mjs"]
  n282["tests/insights.test.mjs"]
  n283["tests/issues.test.mjs"]
  n284["tests/issuesrec.test.mjs"]
  n285["tests/locker.test.mjs"]
  n286["tests/matchreview.test.mjs"]
  n287["tests/media.test.mjs"]
  n288["tests/memberlive.test.mjs"]
  n289["tests/members.test.mjs"]
  n290["tests/mock.mjs"]
  n291["tests/next.test.mjs"]
  n292["tests/notifcenter.test.mjs"]
  n293["tests/packs.test.mjs"]
  n294["tests/panel.test.mjs"]
  n295["tests/plays.test.mjs"]
  n296["tests/probuilds.test.mjs"]
  n297["tests/push.test.mjs"]
  n298["tests/quickcommands.test.mjs"]
  n299["tests/recorder.test.mjs"]
  n300["tests/reminders.test.mjs"]
  n301["tests/servertools.test.mjs"]
  n302["tests/site.test.mjs"]
  n303["tests/social.test.mjs"]
  n304["tests/statinsights.test.mjs"]
  n305["tests/watchlist.test.mjs"]
  n306["tests/wave10.test.mjs"]
  n307["tests/wave8.test.mjs"]
  n308["web/app.js"]
  n309["web/badges.js"]
  n310["web/boardroom.js"]
  n311["web/build-math.js"]
  n312["web/builder.js"]
  n313["web/docs.js"]
  n314["web/events.js"]
  n315["web/feed.js"]
  n316["web/game.js"]
  n317["web/honours.js"]
  n318["web/metrics.js"]
  n319["web/mystats.js"]
  n320["web/profile.js"]
  n321["web/recs.js"]
  n322["web/report.js"]
  n323["web/scout.js"]
  n324["web/settings.js"]
  n325["web/squads.js"]
  n326["web/trials.js"]
  n0 --> n95
  n1 --> n95
  n2 --> n95
  n3 --> n10
  n4 --> n7
  n4 --> n92
  n4 --> n95
  n105 --> n14
  n105 --> n95
  n105 --> n96
  n106 --> n91
  n107 --> n6
  n107 --> n11
  n107 --> n22
  n108 --> n11
  n108 --> n23
  n108 --> n24
  n108 --> n25
  n108 --> n26
  n108 --> n39
  n108 --> n71
  n108 --> n95
  n109 --> n11
  n109 --> n15
  n109 --> n21
  n109 --> n27
  n109 --> n39
  n109 --> n70
  n109 --> n71
  n109 --> n76
  n109 --> n85
  n109 --> n88
  n109 --> n89
  n109 --> n95
  n109 --> n96
  n109 --> n99
  n109 --> n101
  n110 --> n16
  n110 --> n39
  n110 --> n52
  n110 --> n53
  n110 --> n85
  n110 --> n88
  n110 --> n89
  n110 --> n95
  n110 --> n99
  n111 --> n11
  n111 --> n39
  n111 --> n71
  n112 --> n31
  n112 --> n104
  n113 --> n8
  n113 --> n11
  n113 --> n14
  n113 --> n32
  n113 --> n49
  n113 --> n92
  n113 --> n95
  n114 --> n43
  n114 --> n95
  n115 --> n33
  n115 --> n34
  n115 --> n35
  n115 --> n39
  n115 --> n75
  n115 --> n95
  n115 --> n99
  n116 --> n36
  n116 --> n37
  n116 --> n38
  n116 --> n70
  n116 --> n95
  n116 --> n99
  n117 --> n7
  n117 --> n11
  n117 --> n41
  n118 --> n17
  n118 --> n70
  n118 --> n77
  n118 --> n97
  n119 --> n11
  n119 --> n41
  n119 --> n71
  n120 --> n11
  n120 --> n39
  n120 --> n71
  n121 --> n45
  n121 --> n46
  n121 --> n71
  n122 --> n11
  n122 --> n47
  n122 --> n48
  n122 --> n70
  n122 --> n71
  n122 --> n73
  n122 --> n93
  n122 --> n99
  n123 --> n7
  n123 --> n11
  n123 --> n14
  n123 --> n21
  n123 --> n39
  n123 --> n50
  n123 --> n51
  n123 --> n52
  n123 --> n53
  n123 --> n70
  n123 --> n71
  n123 --> n80
  n123 --> n81
  n123 --> n85
  n123 --> n88
  n123 --> n89
  n123 --> n99
  n124 --> n11
  n125 --> n14
  n125 --> n33
  n125 --> n39
  n125 --> n62
  n125 --> n99
  n126 --> n68
  n126 --> n73
  n126 --> n82
  n126 --> n83
  n126 --> n99
  n127 --> n14
  n127 --> n39
  n127 --> n56
  n127 --> n73
  n127 --> n99
  n128 --> n11
  n128 --> n55
  n128 --> n58
  n128 --> n59
  n128 --> n60
  n128 --> n61
  n128 --> n71
  n128 --> n85
  n128 --> n99
  n129 --> n14
  n129 --> n31
  n129 --> n43
  n129 --> n94
  n129 --> n99
  n130 --> n41
  n130 --> n71
  n131 --> n21
  n131 --> n25
  n131 --> n26
  n131 --> n64
  n131 --> n70
  n131 --> n101
  n132 --> n85
  n133 --> n71
  n133 --> n82
  n133 --> n83
  n133 --> n99
  n134 --> n15
  n134 --> n16
  n134 --> n24
  n134 --> n52
  n134 --> n53
  n134 --> n70
  n135 --> n79
  n136 --> n21
  n136 --> n39
  n136 --> n53
  n136 --> n65
  n136 --> n71
  n136 --> n74
  n136 --> n87
  n136 --> n88
  n136 --> n98
  n136 --> n101
  n137 --> n16
  n137 --> n66
  n138 --> n63
  n139 --> n19
  n139 --> n39
  n139 --> n52
  n139 --> n53
  n139 --> n85
  n140 --> n15
  n140 --> n24
  n140 --> n31
  n140 --> n52
  n140 --> n53
  n140 --> n70
  n140 --> n73
  n140 --> n80
  n140 --> n81
  n140 --> n101
  n141 --> n14
  n141 --> n54
  n141 --> n68
  n141 --> n83
  n142 --> n14
  n142 --> n69
  n142 --> n85
  n142 --> n96
  n143 --> n5
  n143 --> n16
  n143 --> n21
  n143 --> n23
  n143 --> n24
  n143 --> n31
  n143 --> n37
  n143 --> n38
  n143 --> n39
  n143 --> n47
  n143 --> n56
  n143 --> n57
  n143 --> n83
  n143 --> n84
  n143 --> n85
  n143 --> n86
  n143 --> n88
  n143 --> n89
  n143 --> n93
  n143 --> n101
  n144 --> n16
  n144 --> n21
  n144 --> n85
  n144 --> n101
  n145 --> n6
  n146 --> n88
  n146 --> n89
  n147 --> n6
  n147 --> n72
  n147 --> n98
  n148 --> n85
  n149 --> n64
  n150 --> n31
  n151 --> n30
  n151 --> n31
  n152 --> n73
  n152 --> n74
  n152 --> n87
  n152 --> n91
  n153 --> n15
  n153 --> n27
  n153 --> n85
  n154 --> n47
  n154 --> n48
  n154 --> n73
  n154 --> n93
  n155 --> n51
  n155 --> n52
  n155 --> n53
  n156 --> n53
  n156 --> n85
  n157 --> n23
  n157 --> n24
  n157 --> n25
  n157 --> n26
  n158 --> n90
  n159 --> n56
  n159 --> n84
  n160 --> n82
  n160 --> n83
  n161 --> n68
  n162 --> n14
  n163 --> n83
  n164 --> n36
  n164 --> n37
  n164 --> n38
  n165 --> n41
  n165 --> n77
  n166 --> n14
  n167 --> n22
  n168 --> n57
  n168 --> n75
  n169 --> n53
  n170 --> n80
  n170 --> n81
  n171 --> n81
  n172 --> n86
  n173 --> n53
  n174 --> n32
  n175 --> n49
  n176 --> n66
  n177 --> n33
  n177 --> n34
  n177 --> n35
  n178 --> n33
  n179 --> n33
  n180 --> n33
  n181 --> n33
  n182 --> n33
  n183 --> n17
  n183 --> n62
  n184 --> n58
  n184 --> n59
  n184 --> n60
  n184 --> n61
  n185 --> n45
  n185 --> n46
  n186 --> n102
  n186 --> n103
  n187 --> n69
  n188 --> n56
  n189 --> n33
  n190 --> n14
  n190 --> n18
  n190 --> n47
  n190 --> n48
  n190 --> n73
  n190 --> n94
  n191 --> n53
  n192 --> n102
  n193 --> n73
  n194 --> n50
  n194 --> n52
  n194 --> n53
  n195 --> n75
  n196 --> n14
  n196 --> n47
  n196 --> n54
  n196 --> n73
  n196 --> n74
  n196 --> n86
  n196 --> n87
  n197 --> n33
  n197 --> n87
  n197 --> n88
  n197 --> n93
  n197 --> n97
  n198 --> n81
  n199 --> n80
  n199 --> n81
  n200 --> n84
  n200 --> n88
  n201 --> n30
  n201 --> n31
  n202 --> n6
  n202 --> n16
  n203 --> n67
  n204 --> n19
  n204 --> n21
  n204 --> n51
  n204 --> n52
  n204 --> n88
  n204 --> n89
  n204 --> n90
  n205 --> n70
  n206 --> n56
  n206 --> n73
  n207 --> n5
  n207 --> n6
  n207 --> n57
  n207 --> n75
  n208 --> n8
  n208 --> n65
  n208 --> n91
  n209 --> n17
  n209 --> n62
  n209 --> n83
  n210 --> n73
  n210 --> n83
  n211 --> n52
  n211 --> n90
  n212 --> n72
  n213 --> n94
  n214 --> n65
  n214 --> n70
  n214 --> n72
  n214 --> n98
  n215 --> n97
  n216 --> n102
  n216 --> n103
  n217 --> n17
  n217 --> n54
  n217 --> n94
  n218 --> n78
  n219 --> n78
  n220 --> n78
  n221 --> n78
  n222 --> n13
  n222 --> n28
  n223 --> n13
  n223 --> n104
  n224 --> n13
  n225 --> n75
  n226 --> n12
  n226 --> n13
  n227 --> n44
  n227 --> n100
  n228 --> n44
  n228 --> n100
  n229 --> n104
  n230 --> n67
  n231 --> n28
  n231 --> n67
  n231 --> n104
  n232 --> n12
  n233 --> n104
  n234 --> n12
  n234 --> n104
  n235 --> n44
  n235 --> n100
  n236 --> n100
  n237 --> n79
  n238 --> n79
  n239 --> n79
  n240 --> n79
  n241 --> n75
  n241 --> n79
  n242 --> n7
  n242 --> n9
  n242 --> n18
  n242 --> n20
  n242 --> n54
  n242 --> n65
  n242 --> n75
  n242 --> n76
  n242 --> n96
  n243 --> n7
  n243 --> n29
  n244 --> n9
  n245 --> n7
  n245 --> n29
  n246 --> n29
  n247 --> n7
  n247 --> n9
  n247 --> n43
  n248 --> n66
  n249 --> n20
  n249 --> n29
  n250 --> n65
  n251 --> n76
  n252 --> n8
  n252 --> n18
  n253 --> n10
  n254 --> n92
  n255 --> n29
  n256 --> n79
  n257 --> n10
  n257 --> n76
  n258 --> n79
  n259 --> n7
  n259 --> n29
  n260 --> n83
  n261 --> n77
  n261 --> n92
  n262 --> n22
  n262 --> n70
  n263 --> n16
  n263 --> n24
  n263 --> n25
  n263 --> n26
  n264 --> n15
  n264 --> n27
  n264 --> n70
  n264 --> n73
  n265 --> n33
  n265 --> n45
  n265 --> n46
  n265 --> n58
  n265 --> n60
  n265 --> n69
  n265 --> n72
  n265 --> n103
  n266 --> n31
  n267 --> n32
  n268 --> n6
  n268 --> n32
  n268 --> n49
  n268 --> n92
  n269 --> n28
  n269 --> n33
  n269 --> n34
  n269 --> n35
  n270 --> n38
  n270 --> n104
  n271 --> n50
  n271 --> n51
  n271 --> n52
  n272 --> n5
  n273 --> n36
  n273 --> n37
  n273 --> n38
  n273 --> n57
  n273 --> n64
  n274 --> n45
  n275 --> n16
  n275 --> n47
  n275 --> n48
  n276 --> n54
  n277 --> n7
  n277 --> n16
  n277 --> n21
  n277 --> n51
  n277 --> n52
  n277 --> n65
  n277 --> n74
  n277 --> n88
  n277 --> n89
  n278 --> n16
  n279 --> n59
  n279 --> n60
  n279 --> n61
  n280 --> n21
  n280 --> n64
  n280 --> n101
  n281 --> n62
  n282 --> n98
  n283 --> n66
  n284 --> n16
  n284 --> n66
  n285 --> n15
  n285 --> n23
  n285 --> n24
  n285 --> n31
  n285 --> n52
  n285 --> n76
  n285 --> n80
  n285 --> n81
  n285 --> n101
  n286 --> n94
  n287 --> n16
  n287 --> n68
  n288 --> n69
  n289 --> n21
  n290 --> n5
  n291 --> n19
  n291 --> n54
  n292 --> n56
  n292 --> n74
  n293 --> n54
  n294 --> n87
  n294 --> n88
  n294 --> n93
  n295 --> n28
  n296 --> n30
  n297 --> n74
  n297 --> n86
  n298 --> n56
  n298 --> n57
  n298 --> n93
  n298 --> n98
  n299 --> n67
  n300 --> n56
  n301 --> n17
  n301 --> n62
  n302 --> n67
  n303 --> n82
  n303 --> n83
  n304 --> n19
  n304 --> n72
  n305 --> n102
  n305 --> n103
  n306 --> n19
  n306 --> n21
  n306 --> n56
  n306 --> n84
  n306 --> n88
  n306 --> n89
  n306 --> n90
  n307 --> n42
  n307 --> n89
  n308 --> n29
  n308 --> n40
  n308 --> n42
  n308 --> n55
  n308 --> n63
  n308 --> n67
  n308 --> n94
  n309 --> n104
  n310 --> n6
  n311 --> n97
  n312 --> n29
  n312 --> n40
  n312 --> n104
  n313 --> n55
  n313 --> n77
  n314 --> n7
  n314 --> n40
  n314 --> n42
  n315 --> n67
  n316 --> n7
  n316 --> n18
  n317 --> n97
  n318 --> n7
  n318 --> n20
  n318 --> n40
  n319 --> n63
  n319 --> n104
  n320 --> n76
  n321 --> n19
  n321 --> n96
  n322 --> n65
  n323 --> n40
  n323 --> n94
  n324 --> n6
  n324 --> n40
  n325 --> n55
  n326 --> n91
  n326 --> n96
```
