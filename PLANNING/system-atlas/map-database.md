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
  n44["TABLE discoveries"]
  n45["TABLE discovery_useful"]
  n46["TABLE doc_acks"]
  n47["TABLE docs"]
  n48["TABLE ea_relay"]
  n49["TABLE event_answer_log"]
  n50["TABLE event_checkins"]
  n51["TABLE event_rsvps"]
  n52["TABLE events"]
  n53["TABLE every"]
  n54["TABLE everyone"]
  n55["TABLE feedback"]
  n56["TABLE flag_overrides"]
  n57["TABLE fun_jail"]
  n58["TABLE fun_trivia_q"]
  n59["TABLE fun_trivia_scores"]
  n60["TABLE fun_wheels"]
  n61["TABLE guild_members"]
  n62["TABLE here"]
  n63["TABLE hof"]
  n64["TABLE hotw"]
  n65["TABLE hotw_votes"]
  n66["TABLE in"]
  n67["TABLE is"]
  n68["TABLE issue_reports"]
  n69["TABLE it"]
  n70["TABLE media"]
  n71["TABLE member_live"]
  n72["TABLE members"]
  n73["TABLE meta"]
  n74["TABLE notes"]
  n75["TABLE notifications"]
  n76["TABLE notify_prefs"]
  n77["TABLE on"]
  n78["TABLE one"]
  n79["TABLE other"]
  n80["TABLE pathlib"]
  n81["TABLE play_assign"]
  n82["TABLE plays"]
  n83["TABLE post_reactions"]
  n84["TABLE posts"]
  n85["TABLE predictions"]
  n86["TABLE profiles"]
  n87["TABLE push_subs"]
  n88["TABLE requests"]
  n89["TABLE rush_matches"]
  n90["TABLE rush_players"]
  n91["TABLE rush_prefs"]
  n92["TABLE server"]
  n93["TABLE site"]
  n94["TABLE suggestions"]
  n95["TABLE that"]
  n96["TABLE the"]
  n97["TABLE their"]
  n98["TABLE this"]
  n99["TABLE trials"]
  n100["TABLE users"]
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
  n218["data/updates/fc-27-career-mode-developer-launch-update.jso"]
  n219["data/updates/fc-27-fut-developer-launch-update.json"]
  n220["data/updates/fc-27-gameplay-developer-launch-update.json"]
  n221["data/updates/fc-27-the-grounds-developer-archetypes-update"]
  n222["data/updates/fc-27-the-grounds-developer-launch-update.jso"]
  n223["data/updates/pitch-notes-fc27-career-mode-deep-dive.json"]
  n224["data/updates/pitch-notes-fc27-fut-deep-dive.json"]
  n225["data/updates/pitch-notes-fc27-gameplay-deep-dive.json"]
  n226["data/updates/pitch-notes-fc27-launch-update.json"]
  n227["data/updates/pitch-notes-fc27-pc-deep-dive.json"]
  n228["data/updates/pitch-notes-fc27-the-grounds-deep-dive.json"]
  n229["scripts/build-atlas-explorer.py"]
  n230["scripts/build-atlas-history.py"]
  n231["scripts/build-atlas-local.py"]
  n232["scripts/build-atlas-private-view.py"]
  n233["scripts/build-system-atlas.py"]
  n234["scripts/build.mjs"]
  n235["scripts/builder-page.mjs"]
  n236["scripts/burners-page.mjs"]
  n237["scripts/docs-page.mjs"]
  n238["scripts/feed-page.mjs"]
  n239["scripts/fetch.mjs"]
  n240["scripts/issues-sync.mjs"]
  n241["scripts/leaders-page.mjs"]
  n242["scripts/lib/events.mjs"]
  n243["scripts/lib/resultpost.mjs"]
  n244["scripts/lib/stars.mjs"]
  n245["scripts/link-inbox.mjs"]
  n246["scripts/messages-page.mjs"]
  n247["scripts/post-results.mjs"]
  n248["scripts/probuilds-page.mjs"]
  n249["scripts/serve-atlas-private.py"]
  n250["scripts/stars-sync.mjs"]
  n251["scripts/test-atlas-local.py"]
  n252["scripts/updates-page.mjs"]
  n253["scripts/updates.mjs"]
  n254["tests/ask.test.mjs"]
  n255["tests/avatarcard.test.mjs"]
  n256["tests/awards.test.mjs"]
  n257["tests/badges.test.mjs"]
  n258["tests/botfeat-sample.mjs"]
  n259["tests/builds.test.mjs"]
  n260["tests/burners-api.test.mjs"]
  n261["tests/burners.test.mjs"]
  n262["tests/cardstudio.test.mjs"]
  n263["tests/chat.test.mjs"]
  n264["tests/checkin.test.mjs"]
  n265["tests/clublookup.test.mjs"]
  n266["tests/d1usage.test.mjs"]
  n267["tests/discoveries.test.mjs"]
  n268["tests/docs.test.mjs"]
  n269["tests/eventdecode.test.mjs"]
  n270["tests/events.test.mjs"]
  n271["tests/feed.test.mjs"]
  n272["tests/fun.test.mjs"]
  n273["tests/honours.test.mjs"]
  n274["tests/host.test.mjs"]
  n275["tests/insights.test.mjs"]
  n276["tests/issues.test.mjs"]
  n277["tests/issuesrec.test.mjs"]
  n278["tests/locker.test.mjs"]
  n279["tests/matchreview.test.mjs"]
  n280["tests/media.test.mjs"]
  n281["tests/memberlive.test.mjs"]
  n282["tests/members.test.mjs"]
  n283["tests/mock.mjs"]
  n284["tests/next.test.mjs"]
  n285["tests/notifcenter.test.mjs"]
  n286["tests/packs.test.mjs"]
  n287["tests/panel.test.mjs"]
  n288["tests/plays.test.mjs"]
  n289["tests/probuilds.test.mjs"]
  n290["tests/push.test.mjs"]
  n291["tests/quickcommands.test.mjs"]
  n292["tests/recorder.test.mjs"]
  n293["tests/reminders.test.mjs"]
  n294["tests/servertools.test.mjs"]
  n295["tests/site.test.mjs"]
  n296["tests/social.test.mjs"]
  n297["tests/statinsights.test.mjs"]
  n298["tests/watchlist.test.mjs"]
  n299["tests/wave10.test.mjs"]
  n300["tests/wave8.test.mjs"]
  n301["web/app.js"]
  n302["web/badges.js"]
  n303["web/boardroom.js"]
  n304["web/build-math.js"]
  n305["web/builder.js"]
  n306["web/docs.js"]
  n307["web/events.js"]
  n308["web/feed-public.js"]
  n309["web/feed.js"]
  n310["web/game.js"]
  n311["web/honours.js"]
  n312["web/metrics.js"]
  n313["web/mystats.js"]
  n314["web/profile.js"]
  n315["web/recs.js"]
  n316["web/report.js"]
  n317["web/scout.js"]
  n318["web/settings.js"]
  n319["web/squads.js"]
  n320["web/trials.js"]
  n0 --> n96
  n1 --> n96
  n2 --> n96
  n3 --> n10
  n4 --> n7
  n4 --> n93
  n4 --> n96
  n105 --> n14
  n105 --> n96
  n105 --> n97
  n106 --> n92
  n107 --> n6
  n107 --> n11
  n107 --> n22
  n108 --> n11
  n108 --> n23
  n108 --> n24
  n108 --> n25
  n108 --> n26
  n108 --> n39
  n108 --> n73
  n108 --> n96
  n109 --> n11
  n109 --> n15
  n109 --> n21
  n109 --> n27
  n109 --> n39
  n109 --> n72
  n109 --> n73
  n109 --> n78
  n109 --> n86
  n109 --> n89
  n109 --> n90
  n109 --> n96
  n109 --> n97
  n109 --> n100
  n109 --> n101
  n110 --> n16
  n110 --> n39
  n110 --> n51
  n110 --> n52
  n110 --> n86
  n110 --> n89
  n110 --> n90
  n110 --> n96
  n110 --> n100
  n111 --> n11
  n111 --> n39
  n111 --> n73
  n112 --> n31
  n112 --> n104
  n113 --> n8
  n113 --> n11
  n113 --> n14
  n113 --> n32
  n113 --> n48
  n113 --> n93
  n113 --> n96
  n114 --> n43
  n114 --> n96
  n115 --> n33
  n115 --> n34
  n115 --> n35
  n115 --> n39
  n115 --> n77
  n115 --> n96
  n115 --> n100
  n116 --> n36
  n116 --> n37
  n116 --> n38
  n116 --> n72
  n116 --> n96
  n116 --> n100
  n117 --> n7
  n117 --> n11
  n117 --> n41
  n118 --> n17
  n118 --> n72
  n118 --> n79
  n118 --> n98
  n119 --> n11
  n119 --> n41
  n119 --> n73
  n120 --> n11
  n120 --> n39
  n120 --> n73
  n121 --> n44
  n121 --> n45
  n121 --> n73
  n122 --> n11
  n122 --> n46
  n122 --> n47
  n122 --> n72
  n122 --> n73
  n122 --> n75
  n122 --> n94
  n122 --> n100
  n123 --> n7
  n123 --> n11
  n123 --> n14
  n123 --> n21
  n123 --> n39
  n123 --> n49
  n123 --> n50
  n123 --> n51
  n123 --> n52
  n123 --> n72
  n123 --> n73
  n123 --> n81
  n123 --> n82
  n123 --> n86
  n123 --> n89
  n123 --> n90
  n123 --> n100
  n124 --> n11
  n125 --> n14
  n125 --> n33
  n125 --> n39
  n125 --> n61
  n125 --> n100
  n126 --> n70
  n126 --> n75
  n126 --> n83
  n126 --> n84
  n126 --> n100
  n127 --> n14
  n127 --> n39
  n127 --> n55
  n127 --> n75
  n127 --> n100
  n128 --> n11
  n128 --> n54
  n128 --> n57
  n128 --> n58
  n128 --> n59
  n128 --> n60
  n128 --> n73
  n128 --> n86
  n128 --> n100
  n129 --> n14
  n129 --> n31
  n129 --> n43
  n129 --> n95
  n129 --> n100
  n130 --> n41
  n130 --> n73
  n131 --> n21
  n131 --> n25
  n131 --> n26
  n131 --> n63
  n131 --> n72
  n131 --> n101
  n132 --> n86
  n133 --> n64
  n133 --> n65
  n133 --> n73
  n133 --> n83
  n133 --> n84
  n133 --> n100
  n134 --> n15
  n134 --> n16
  n134 --> n24
  n134 --> n51
  n134 --> n52
  n134 --> n72
  n135 --> n80
  n136 --> n21
  n136 --> n39
  n136 --> n52
  n136 --> n67
  n136 --> n73
  n136 --> n76
  n136 --> n88
  n136 --> n89
  n136 --> n99
  n136 --> n101
  n137 --> n16
  n137 --> n68
  n138 --> n62
  n139 --> n19
  n139 --> n39
  n139 --> n51
  n139 --> n52
  n139 --> n86
  n140 --> n15
  n140 --> n24
  n140 --> n31
  n140 --> n51
  n140 --> n52
  n140 --> n72
  n140 --> n75
  n140 --> n81
  n140 --> n82
  n140 --> n101
  n141 --> n14
  n141 --> n53
  n141 --> n70
  n141 --> n84
  n142 --> n14
  n142 --> n71
  n142 --> n86
  n142 --> n97
  n143 --> n5
  n143 --> n16
  n143 --> n21
  n143 --> n23
  n143 --> n24
  n143 --> n31
  n143 --> n37
  n143 --> n38
  n143 --> n39
  n143 --> n46
  n143 --> n55
  n143 --> n56
  n143 --> n84
  n143 --> n85
  n143 --> n86
  n143 --> n87
  n143 --> n89
  n143 --> n90
  n143 --> n94
  n143 --> n101
  n144 --> n16
  n144 --> n21
  n144 --> n86
  n144 --> n101
  n145 --> n6
  n146 --> n89
  n146 --> n90
  n147 --> n6
  n147 --> n74
  n147 --> n99
  n148 --> n86
  n149 --> n63
  n150 --> n31
  n151 --> n30
  n151 --> n31
  n152 --> n75
  n152 --> n76
  n152 --> n88
  n152 --> n92
  n153 --> n15
  n153 --> n27
  n153 --> n86
  n154 --> n46
  n154 --> n47
  n154 --> n75
  n154 --> n94
  n155 --> n50
  n155 --> n51
  n155 --> n52
  n156 --> n52
  n156 --> n86
  n157 --> n23
  n157 --> n24
  n157 --> n25
  n157 --> n26
  n158 --> n91
  n159 --> n55
  n159 --> n85
  n160 --> n83
  n160 --> n84
  n161 --> n70
  n162 --> n14
  n162 --> n64
  n162 --> n65
  n163 --> n84
  n164 --> n36
  n164 --> n37
  n164 --> n38
  n165 --> n41
  n165 --> n79
  n166 --> n14
  n167 --> n22
  n168 --> n56
  n168 --> n77
  n169 --> n52
  n170 --> n81
  n170 --> n82
  n171 --> n82
  n172 --> n87
  n173 --> n52
  n174 --> n32
  n175 --> n48
  n176 --> n68
  n177 --> n33
  n177 --> n34
  n177 --> n35
  n178 --> n33
  n179 --> n33
  n180 --> n33
  n181 --> n33
  n182 --> n33
  n183 --> n17
  n183 --> n61
  n184 --> n57
  n184 --> n58
  n184 --> n59
  n184 --> n60
  n185 --> n44
  n185 --> n45
  n186 --> n102
  n186 --> n103
  n187 --> n71
  n188 --> n55
  n189 --> n33
  n190 --> n14
  n190 --> n18
  n190 --> n46
  n190 --> n47
  n190 --> n75
  n190 --> n95
  n191 --> n52
  n192 --> n102
  n193 --> n75
  n194 --> n49
  n194 --> n51
  n194 --> n52
  n195 --> n77
  n196 --> n14
  n196 --> n46
  n196 --> n53
  n196 --> n75
  n196 --> n76
  n196 --> n87
  n196 --> n88
  n197 --> n33
  n197 --> n88
  n197 --> n89
  n197 --> n94
  n197 --> n98
  n198 --> n82
  n199 --> n81
  n199 --> n82
  n200 --> n85
  n200 --> n89
  n201 --> n30
  n201 --> n31
  n202 --> n6
  n202 --> n16
  n203 --> n69
  n204 --> n19
  n204 --> n21
  n204 --> n50
  n204 --> n51
  n204 --> n89
  n204 --> n90
  n204 --> n91
  n205 --> n72
  n206 --> n55
  n206 --> n75
  n207 --> n5
  n207 --> n6
  n207 --> n56
  n207 --> n77
  n208 --> n8
  n208 --> n67
  n208 --> n92
  n209 --> n17
  n209 --> n61
  n209 --> n84
  n210 --> n75
  n210 --> n84
  n211 --> n51
  n211 --> n91
  n212 --> n74
  n213 --> n95
  n214 --> n67
  n214 --> n72
  n214 --> n74
  n214 --> n99
  n215 --> n98
  n216 --> n102
  n216 --> n103
  n217 --> n17
  n217 --> n53
  n217 --> n95
  n218 --> n13
  n218 --> n28
  n219 --> n13
  n219 --> n104
  n220 --> n13
  n221 --> n77
  n222 --> n12
  n222 --> n13
  n223 --> n104
  n224 --> n69
  n225 --> n28
  n225 --> n69
  n225 --> n104
  n226 --> n12
  n227 --> n104
  n228 --> n12
  n228 --> n104
  n229 --> n80
  n230 --> n80
  n231 --> n80
  n232 --> n80
  n233 --> n77
  n233 --> n80
  n234 --> n7
  n234 --> n9
  n234 --> n18
  n234 --> n20
  n234 --> n53
  n234 --> n77
  n234 --> n78
  n234 --> n97
  n235 --> n7
  n235 --> n29
  n236 --> n9
  n237 --> n7
  n237 --> n29
  n238 --> n29
  n238 --> n66
  n239 --> n7
  n239 --> n9
  n239 --> n43
  n240 --> n68
  n241 --> n20
  n241 --> n29
  n242 --> n67
  n243 --> n78
  n244 --> n8
  n244 --> n18
  n245 --> n10
  n246 --> n66
  n247 --> n93
  n248 --> n29
  n249 --> n80
  n250 --> n10
  n250 --> n78
  n251 --> n80
  n252 --> n7
  n252 --> n29
  n253 --> n84
  n254 --> n79
  n254 --> n93
  n255 --> n22
  n255 --> n72
  n256 --> n16
  n256 --> n24
  n256 --> n25
  n256 --> n26
  n257 --> n15
  n257 --> n27
  n257 --> n72
  n257 --> n75
  n258 --> n33
  n258 --> n44
  n258 --> n45
  n258 --> n57
  n258 --> n59
  n258 --> n71
  n258 --> n74
  n258 --> n103
  n259 --> n31
  n260 --> n32
  n261 --> n6
  n261 --> n32
  n261 --> n48
  n261 --> n93
  n262 --> n28
  n262 --> n33
  n262 --> n34
  n262 --> n35
  n263 --> n38
  n263 --> n104
  n264 --> n49
  n264 --> n50
  n264 --> n51
  n265 --> n5
  n266 --> n36
  n266 --> n37
  n266 --> n38
  n266 --> n56
  n266 --> n63
  n267 --> n44
  n268 --> n16
  n268 --> n46
  n268 --> n47
  n269 --> n53
  n270 --> n7
  n270 --> n16
  n270 --> n21
  n270 --> n50
  n270 --> n51
  n270 --> n67
  n270 --> n76
  n270 --> n89
  n270 --> n90
  n271 --> n16
  n272 --> n58
  n272 --> n59
  n272 --> n60
  n273 --> n21
  n273 --> n63
  n273 --> n101
  n274 --> n61
  n275 --> n99
  n276 --> n68
  n277 --> n16
  n277 --> n68
  n278 --> n15
  n278 --> n23
  n278 --> n24
  n278 --> n31
  n278 --> n51
  n278 --> n78
  n278 --> n81
  n278 --> n82
  n278 --> n101
  n279 --> n95
  n280 --> n16
  n280 --> n70
  n281 --> n71
  n282 --> n21
  n283 --> n5
  n284 --> n19
  n284 --> n53
  n285 --> n55
  n285 --> n76
  n286 --> n53
  n287 --> n88
  n287 --> n89
  n287 --> n94
  n288 --> n28
  n289 --> n30
  n290 --> n76
  n290 --> n87
  n291 --> n55
  n291 --> n56
  n291 --> n94
  n291 --> n99
  n292 --> n69
  n293 --> n55
  n294 --> n17
  n294 --> n61
  n295 --> n69
  n296 --> n64
  n296 --> n65
  n296 --> n83
  n296 --> n84
  n297 --> n19
  n297 --> n74
  n298 --> n102
  n298 --> n103
  n299 --> n19
  n299 --> n21
  n299 --> n55
  n299 --> n85
  n299 --> n89
  n299 --> n90
  n299 --> n91
  n300 --> n42
  n300 --> n90
  n301 --> n29
  n301 --> n40
  n301 --> n42
  n301 --> n54
  n301 --> n62
  n301 --> n69
  n301 --> n95
  n302 --> n104
  n303 --> n6
  n304 --> n98
  n305 --> n29
  n305 --> n40
  n305 --> n104
  n306 --> n54
  n306 --> n79
  n307 --> n7
  n307 --> n40
  n307 --> n42
  n308 --> n66
  n309 --> n69
  n310 --> n7
  n310 --> n18
  n311 --> n98
  n312 --> n7
  n312 --> n20
  n312 --> n40
  n313 --> n62
  n313 --> n104
  n314 --> n78
  n315 --> n19
  n315 --> n97
  n316 --> n67
  n317 --> n40
  n317 --> n95
  n318 --> n6
  n318 --> n40
  n319 --> n54
  n320 --> n92
  n320 --> n97
```
