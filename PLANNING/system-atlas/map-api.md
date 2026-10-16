# API source connections

Static source references; this does not prove runtime invocation or SQL lineage. Top 100 by reference count.

```mermaid
flowchart LR
  n0["API /api/achievements"]
  n1["API /api/achievements/seen"]
  n2["API /api/admin/claims"]
  n3["API /api/admin/flags"]
  n4["API /api/admin/flags/reset"]
  n5["API /api/admin/health"]
  n6["API /api/admin/mute"]
  n7["API /api/admin/overview"]
  n8["API /api/admin/reports"]
  n9["API /api/admin/requests/decide"]
  n10["API /api/admin/squadweek"]
  n11["API /api/admin/warn"]
  n12["API /api/availability"]
  n13["API /api/avatarcard"]
  n14["API /api/awards"]
  n15["API /api/awards/category"]
  n16["API /api/awards/category/remove"]
  n17["API /api/awards/close"]
  n18["API /api/awards/settings"]
  n19["API /api/awards/vote"]
  n20["API /api/badges"]
  n21["API /api/badges/remove"]
  n22["API /api/bot/settings"]
  n23["API /api/builds"]
  n24["API /api/builds/delete"]
  n25["API /api/builds/fork"]
  n26["API /api/cards/kit-number"]
  n27["API /api/cards/owner/requests"]
  n28["API /api/cards/owner/revoke"]
  n29["API /api/cards/request"]
  n30["API /api/cards/request/cancel"]
  n31["API /api/cards/requests"]
  n32["API /api/cards/requests/decide"]
  n33["API /api/cards/requests/retry"]
  n34["API /api/cards/requests/review"]
  n35["API /api/cards/templates"]
  n36["API /api/cards/templates/update"]
  n37["API /api/chats"]
  n38["API /api/claim"]
  n39["API /api/contacts"]
  n40["API /api/docs"]
  n41["API /api/docs/ack"]
  n42["API /api/docs/acks"]
  n43["API /api/docs/discord"]
  n44["API /api/docs/remind"]
  n45["API /api/docs/remove"]
  n46["API /api/docs/restore"]
  n47["API /api/events"]
  n48["API /api/events/cancel"]
  n49["API /api/events/checkin"]
  n50["API /api/events/discord"]
  n51["API /api/events/lineup"]
  n52["API /api/events/plays"]
  n53["API /api/events/recommend"]
  n54["API /api/events/rsvp"]
  n55["API /api/feed"]
  n56["API /api/feed/comment"]
  n57["API /api/feed/delete"]
  n58["API /api/feed/edit"]
  n59["API /api/feed/media/delete"]
  n60["API /api/feed/pin"]
  n61["API /api/feed/post"]
  n62["API /api/feed/react"]
  n63["API /api/feed/report"]
  n64["API /api/feed/setpublic"]
  n65["API /api/feed/storage"]
  n66["API /api/feed/uncomment"]
  n67["API /api/feed/unreport"]
  n68["API /api/feedback"]
  n69["API /api/feedback/all"]
  n70["API /api/feedback/hide"]
  n71["API /api/feedback/react"]
  n72["API /api/feedback/read"]
  n73["API /api/feedback/report"]
  n74["API /api/feedback/send"]
  n75["API /api/feedback/why"]
  n76["API /api/game/admin"]
  n77["API /api/game/dismiss"]
  n78["API /api/game/publish"]
  n79["API /api/hof"]
  n80["API /api/issues"]
  n81["API /api/locker"]
  n82["API /api/me"]
  n83["API /api/mybuild"]
  n84["API /api/notify"]
  n85["API /api/notify/ack"]
  n86["API /api/notify/announce"]
  n87["API /api/notify/count"]
  n88["API /api/notify/read"]
  n89["API /api/plays"]
  n90["API /api/profile"]
  n91["API /api/rush"]
  n92["API /api/rush/decide"]
  n93["API /api/scout"]
  n94["API /api/suggestions"]
  n95["API /api/suggestions/decide"]
  n96["API /api/trials"]
  n97["API /api/trials/apply"]
  n98["API /api/trials/update"]
  n99["API /api/vote"]
  n100["bot/awards.js"]
  n101["bot/badges.js"]
  n102["bot/botcmds.js"]
  n103["bot/builds.js"]
  n104["bot/cardstudio.js"]
  n105["bot/chat.js"]
  n106["bot/docs.js"]
  n107["bot/events.js"]
  n108["bot/feed.js"]
  n109["bot/feedback.js"]
  n110["bot/game.js"]
  n111["bot/honours.js"]
  n112["bot/host.js"]
  n113["bot/lineuprec.js"]
  n114["bot/locker.js"]
  n115["bot/media.js"]
  n116["bot/members.js"]
  n117["bot/notify.js"]
  n118["bot/panel.js"]
  n119["bot/plays.js"]
  n120["bot/probuilds.js"]
  n121["bot/settings.js"]
  n122["bot/trials.js"]
  n123["tests/avatarcard.test.mjs"]
  n124["tests/awards.test.mjs"]
  n125["tests/badges.test.mjs"]
  n126["tests/botfeat-sample.mjs"]
  n127["tests/builder.test.mjs"]
  n128["tests/builds.test.mjs"]
  n129["tests/cardstudio.test.mjs"]
  n130["tests/chat.test.mjs"]
  n131["tests/crawl.test.mjs"]
  n132["tests/d1usage.test.mjs"]
  n133["tests/discord.test.mjs"]
  n134["tests/docs.test.mjs"]
  n135["tests/drilldown.test.mjs"]
  n136["tests/dugout.test.mjs"]
  n137["tests/events.test.mjs"]
  n138["tests/feed.test.mjs"]
  n139["tests/feedbackroom.test.mjs"]
  n140["tests/flags.test.mjs"]
  n141["tests/fun.test.mjs"]
  n142["tests/game.test.mjs"]
  n143["tests/honours.test.mjs"]
  n144["tests/hub.test.mjs"]
  n145["tests/issues.test.mjs"]
  n146["tests/issuesrec.test.mjs"]
  n147["tests/lineuprec.test.mjs"]
  n148["tests/locker.test.mjs"]
  n149["tests/media.test.mjs"]
  n150["tests/memberlive.test.mjs"]
  n151["tests/members.test.mjs"]
  n152["tests/moderation.test.mjs"]
  n153["tests/next.test.mjs"]
  n154["tests/notify.test.mjs"]
  n155["tests/playmedia.test.mjs"]
  n156["tests/plays.test.mjs"]
  n157["tests/prefs.test.mjs"]
  n158["tests/probuilds.test.mjs"]
  n159["tests/profiles.test.mjs"]
  n160["tests/recorder.test.mjs"]
  n161["tests/rush.test.mjs"]
  n162["tests/social.test.mjs"]
  n163["tests/squads.test.mjs"]
  n164["tests/studio.test.mjs"]
  n165["tests/submissions.test.mjs"]
  n166["tests/trials.test.mjs"]
  n167["tests/wave10.test.mjs"]
  n168["tests/wave11.test.mjs"]
  n169["tests/wave8.test.mjs"]
  n170["web/app.js"]
  n171["web/avatarcard.js"]
  n172["web/awards.js"]
  n173["web/badges.js"]
  n174["web/boardroom.js"]
  n175["web/builder.js"]
  n176["web/cardstudio.js"]
  n177["web/docs.js"]
  n178["web/dugout.js"]
  n179["web/events.js"]
  n180["web/feed.js"]
  n181["web/feedback.js"]
  n182["web/game.js"]
  n183["web/honours.js"]
  n184["web/hub.js"]
  n185["web/hubgold.js"]
  n186["web/locker.js"]
  n187["web/messages.js"]
  n188["web/mystats.js"]
  n189["web/notify.js"]
  n190["web/probuilds.js"]
  n191["web/profile.js"]
  n192["web/report.js"]
  n193["web/settings.js"]
  n194["web/squads.js"]
  n195["web/tactics.js"]
  n196["web/trials.js"]
  n100 --> n14
  n100 --> n15
  n100 --> n16
  n100 --> n17
  n100 --> n18
  n100 --> n19
  n101 --> n0
  n101 --> n1
  n101 --> n20
  n101 --> n21
  n102 --> n74
  n102 --> n86
  n102 --> n94
  n103 --> n23
  n103 --> n24
  n103 --> n25
  n104 --> n26
  n104 --> n27
  n104 --> n28
  n104 --> n29
  n104 --> n30
  n104 --> n31
  n104 --> n32
  n104 --> n33
  n104 --> n34
  n104 --> n35
  n104 --> n36
  n105 --> n37
  n106 --> n40
  n106 --> n41
  n106 --> n42
  n106 --> n43
  n106 --> n44
  n106 --> n45
  n106 --> n46
  n106 --> n94
  n106 --> n95
  n107 --> n47
  n107 --> n48
  n107 --> n49
  n107 --> n50
  n107 --> n51
  n107 --> n52
  n107 --> n53
  n107 --> n54
  n108 --> n55
  n108 --> n56
  n108 --> n57
  n108 --> n58
  n108 --> n60
  n108 --> n61
  n108 --> n62
  n108 --> n63
  n108 --> n64
  n108 --> n66
  n108 --> n67
  n109 --> n68
  n109 --> n69
  n109 --> n70
  n109 --> n71
  n109 --> n72
  n109 --> n73
  n109 --> n74
  n109 --> n75
  n110 --> n76
  n110 --> n77
  n110 --> n78
  n111 --> n79
  n112 --> n47
  n113 --> n53
  n114 --> n81
  n115 --> n59
  n115 --> n65
  n116 --> n2
  n116 --> n3
  n116 --> n4
  n116 --> n5
  n116 --> n6
  n116 --> n7
  n116 --> n8
  n116 --> n10
  n116 --> n11
  n116 --> n12
  n116 --> n13
  n116 --> n29
  n116 --> n38
  n116 --> n39
  n116 --> n40
  n116 --> n79
  n116 --> n80
  n116 --> n82
  n116 --> n90
  n116 --> n91
  n116 --> n92
  n116 --> n97
  n116 --> n99
  n117 --> n9
  n117 --> n84
  n117 --> n85
  n117 --> n86
  n117 --> n87
  n117 --> n88
  n118 --> n2
  n118 --> n8
  n118 --> n9
  n118 --> n32
  n118 --> n92
  n118 --> n95
  n119 --> n89
  n120 --> n83
  n121 --> n22
  n122 --> n93
  n122 --> n96
  n122 --> n98
  n123 --> n13
  n124 --> n14
  n124 --> n15
  n124 --> n16
  n124 --> n17
  n124 --> n18
  n124 --> n19
  n124 --> n84
  n125 --> n0
  n125 --> n1
  n125 --> n2
  n125 --> n20
  n125 --> n21
  n125 --> n38
  n125 --> n90
  n126 --> n90
  n127 --> n25
  n128 --> n7
  n128 --> n23
  n128 --> n24
  n128 --> n25
  n129 --> n26
  n129 --> n27
  n129 --> n28
  n129 --> n29
  n129 --> n30
  n129 --> n31
  n129 --> n32
  n129 --> n33
  n129 --> n34
  n129 --> n35
  n129 --> n36
  n130 --> n37
  n131 --> n5
  n132 --> n79
  n133 --> n2
  n133 --> n82
  n134 --> n40
  n134 --> n41
  n134 --> n42
  n134 --> n43
  n134 --> n44
  n134 --> n45
  n134 --> n46
  n134 --> n84
  n134 --> n85
  n134 --> n87
  n134 --> n94
  n134 --> n95
  n135 --> n37
  n136 --> n47
  n136 --> n49
  n136 --> n51
  n136 --> n52
  n136 --> n54
  n136 --> n89
  n136 --> n98
  n137 --> n7
  n137 --> n47
  n137 --> n48
  n137 --> n49
  n137 --> n51
  n137 --> n54
  n137 --> n84
  n137 --> n90
  n138 --> n55
  n138 --> n56
  n138 --> n57
  n138 --> n58
  n138 --> n60
  n138 --> n61
  n138 --> n62
  n138 --> n63
  n138 --> n64
  n138 --> n66
  n138 --> n67
  n139 --> n68
  n139 --> n69
  n139 --> n70
  n139 --> n71
  n139 --> n72
  n139 --> n73
  n139 --> n74
  n139 --> n75
  n140 --> n3
  n140 --> n4
  n140 --> n5
  n140 --> n7
  n140 --> n22
  n140 --> n79
  n140 --> n82
  n140 --> n86
  n140 --> n91
  n141 --> n90
  n142 --> n7
  n142 --> n76
  n142 --> n77
  n142 --> n78
  n143 --> n79
  n144 --> n84
  n145 --> n80
  n146 --> n80
  n147 --> n47
  n147 --> n51
  n147 --> n53
  n147 --> n54
  n148 --> n19
  n148 --> n52
  n148 --> n54
  n148 --> n81
  n148 --> n88
  n148 --> n89
  n148 --> n99
  n149 --> n55
  n149 --> n57
  n149 --> n58
  n149 --> n59
  n149 --> n61
  n149 --> n65
  n150 --> n90
  n151 --> n2
  n151 --> n7
  n151 --> n10
  n151 --> n12
  n151 --> n38
  n151 --> n82
  n151 --> n90
  n151 --> n99
  n152 --> n6
  n152 --> n7
  n152 --> n8
  n152 --> n11
  n152 --> n37
  n152 --> n55
  n152 --> n56
  n152 --> n61
  n152 --> n63
  n152 --> n67
  n153 --> n0
  n153 --> n1
  n153 --> n3
  n153 --> n4
  n153 --> n6
  n153 --> n7
  n153 --> n8
  n153 --> n9
  n153 --> n10
  n153 --> n11
  n153 --> n12
  n153 --> n13
  n153 --> n14
  n153 --> n15
  n153 --> n16
  n153 --> n17
  n153 --> n18
  n153 --> n19
  n153 --> n20
  n153 --> n21
  n153 --> n22
  n153 --> n23
  n153 --> n24
  n153 --> n25
  n153 --> n26
  n153 --> n27
  n153 --> n28
  n153 --> n29
  n153 --> n30
  n153 --> n31
  n153 --> n32
  n153 --> n33
  n153 --> n34
  n153 --> n35
  n153 --> n36
  n153 --> n39
  n153 --> n40
  n153 --> n41
  n153 --> n42
  n153 --> n44
  n153 --> n45
  n153 --> n46
  n153 --> n47
  n153 --> n48
  n153 --> n56
  n153 --> n57
  n153 --> n59
  n153 --> n60
  n153 --> n61
  n153 --> n62
  n153 --> n64
  n153 --> n65
  n153 --> n67
  n153 --> n70
  n153 --> n76
  n153 --> n77
  n153 --> n78
  n153 --> n80
  n153 --> n81
  n153 --> n82
  n153 --> n83
  n153 --> n84
  n153 --> n85
  n153 --> n87
  n153 --> n88
  n153 --> n89
  n153 --> n90
  n153 --> n91
  n153 --> n93
  n153 --> n94
  n153 --> n95
  n153 --> n96
  n153 --> n97
  n153 --> n98
  n153 --> n99
  n154 --> n2
  n154 --> n9
  n154 --> n38
  n154 --> n84
  n154 --> n85
  n154 --> n86
  n154 --> n87
  n154 --> n88
  n154 --> n91
  n154 --> n92
  n154 --> n93
  n154 --> n96
  n154 --> n97
  n154 --> n98
  n155 --> n89
  n156 --> n89
  n157 --> n82
  n158 --> n7
  n158 --> n23
  n158 --> n24
  n158 --> n83
  n159 --> n7
  n159 --> n82
  n159 --> n90
  n160 --> n80
  n161 --> n7
  n161 --> n91
  n161 --> n92
  n162 --> n55
  n162 --> n56
  n162 --> n58
  n162 --> n61
  n162 --> n66
  n163 --> n84
  n163 --> n90
  n164 --> n89
  n165 --> n14
  n165 --> n19
  n165 --> n23
  n165 --> n74
  n165 --> n94
  n166 --> n7
  n166 --> n39
  n166 --> n93
  n166 --> n96
  n166 --> n97
  n166 --> n98
  n167 --> n68
  n167 --> n69
  n167 --> n70
  n167 --> n71
  n167 --> n72
  n167 --> n73
  n167 --> n74
  n167 --> n75
  n167 --> n84
  n168 --> n23
  n168 --> n78
  n168 --> n84
  n169 --> n38
  n169 --> n47
  n169 --> n51
  n169 --> n54
  n169 --> n84
  n170 --> n2
  n170 --> n3
  n170 --> n4
  n170 --> n5
  n170 --> n6
  n170 --> n8
  n170 --> n10
  n170 --> n11
  n170 --> n12
  n170 --> n38
  n170 --> n57
  n170 --> n67
  n170 --> n70
  n170 --> n81
  n170 --> n82
  n170 --> n90
  n170 --> n91
  n170 --> n92
  n170 --> n99
  n171 --> n13
  n172 --> n14
  n172 --> n15
  n172 --> n16
  n172 --> n17
  n172 --> n18
  n172 --> n19
  n172 --> n50
  n173 --> n0
  n173 --> n1
  n173 --> n20
  n173 --> n21
  n174 --> n3
  n174 --> n4
  n174 --> n5
  n174 --> n79
  n174 --> n86
  n175 --> n23
  n175 --> n24
  n175 --> n25
  n175 --> n83
  n176 --> n26
  n176 --> n27
  n176 --> n28
  n176 --> n29
  n176 --> n30
  n176 --> n31
  n176 --> n32
  n176 --> n33
  n176 --> n34
  n176 --> n35
  n176 --> n36
  n177 --> n40
  n177 --> n41
  n177 --> n42
  n177 --> n43
  n177 --> n44
  n177 --> n45
  n177 --> n46
  n177 --> n94
  n177 --> n95
  n178 --> n47
  n178 --> n51
  n178 --> n52
  n178 --> n89
  n178 --> n96
  n178 --> n98
  n179 --> n47
  n179 --> n48
  n179 --> n49
  n179 --> n50
  n179 --> n51
  n179 --> n53
  n179 --> n54
  n180 --> n43
  n180 --> n56
  n180 --> n57
  n180 --> n58
  n180 --> n59
  n180 --> n60
  n180 --> n61
  n180 --> n62
  n180 --> n63
  n180 --> n64
  n180 --> n65
  n180 --> n66
  n180 --> n67
  n181 --> n68
  n181 --> n69
  n181 --> n70
  n181 --> n71
  n181 --> n72
  n181 --> n73
  n181 --> n74
  n181 --> n75
  n182 --> n76
  n182 --> n77
  n182 --> n78
  n183 --> n79
  n184 --> n82
  n185 --> n81
  n185 --> n82
  n186 --> n54
  n186 --> n81
  n186 --> n99
  n187 --> n37
  n188 --> n0
  n188 --> n91
  n189 --> n9
  n189 --> n84
  n189 --> n85
  n189 --> n86
  n189 --> n87
  n189 --> n88
  n190 --> n83
  n191 --> n90
  n192 --> n80
  n193 --> n22
  n194 --> n50
  n195 --> n89
  n196 --> n39
  n196 --> n93
  n196 --> n96
  n196 --> n97
  n196 --> n98
```
