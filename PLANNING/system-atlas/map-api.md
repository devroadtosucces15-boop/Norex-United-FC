# API source connections

Static source references; this does not prove runtime invocation or SQL lineage. Top 100 by reference count.

```mermaid
flowchart LR
  n0["API /api/achievements"]
  n1["API /api/achievements/board"]
  n2["API /api/achievements/seen"]
  n3["API /api/admin/claims"]
  n4["API /api/admin/flags"]
  n5["API /api/admin/flags/reset"]
  n6["API /api/admin/health"]
  n7["API /api/admin/mute"]
  n8["API /api/admin/overview"]
  n9["API /api/admin/reports"]
  n10["API /api/admin/requests"]
  n11["API /api/admin/requests/decide"]
  n12["API /api/admin/squadweek"]
  n13["API /api/admin/warn"]
  n14["API /api/availability"]
  n15["API /api/avatarcard"]
  n16["API /api/awards"]
  n17["API /api/awards/board"]
  n18["API /api/awards/category"]
  n19["API /api/awards/category/remove"]
  n20["API /api/awards/vote"]
  n21["API /api/badges"]
  n22["API /api/badges/remove"]
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
  n39["API /api/docs"]
  n40["API /api/docs/ack"]
  n41["API /api/docs/discord"]
  n42["API /api/events"]
  n43["API /api/events/checkin"]
  n44["API /api/events/discord"]
  n45["API /api/events/lineup"]
  n46["API /api/events/plays"]
  n47["API /api/events/recommend"]
  n48["API /api/events/rsvp"]
  n49["API /api/feed"]
  n50["API /api/feed/comment"]
  n51["API /api/feed/delete"]
  n52["API /api/feed/edit"]
  n53["API /api/feed/post"]
  n54["API /api/feed/react"]
  n55["API /api/feed/report"]
  n56["API /api/feed/uncomment"]
  n57["API /api/feed/unreport"]
  n58["API /api/feedback/hide"]
  n59["API /api/feedback/send"]
  n60["API /api/game/publish"]
  n61["API /api/hof"]
  n62["API /api/hub/wave"]
  n63["API /api/issues"]
  n64["API /api/locker"]
  n65["API /api/me"]
  n66["API /api/mybuild"]
  n67["API /api/notify"]
  n68["API /api/notify/ack"]
  n69["API /api/notify/announce"]
  n70["API /api/notify/count"]
  n71["API /api/notify/prefs"]
  n72["API /api/notify/read"]
  n73["API /api/notify/test"]
  n74["API /api/plays"]
  n75["API /api/plays/discord"]
  n76["API /api/playstyle"]
  n77["API /api/predict"]
  n78["API /api/probuilds"]
  n79["API /api/probuilds/comment"]
  n80["API /api/probuilds/comment/delete"]
  n81["API /api/probuilds/feature"]
  n82["API /api/probuilds/post"]
  n83["API /api/probuilds/unpost"]
  n84["API /api/probuilds/vote"]
  n85["API /api/profile"]
  n86["API /api/ratings/rate"]
  n87["API /api/rush"]
  n88["API /api/rush/decide"]
  n89["API /api/rush/queue"]
  n90["API /api/scout"]
  n91["API /api/squads"]
  n92["API /api/squads/prefs"]
  n93["API /api/suggestions"]
  n94["API /api/suggestions/vote"]
  n95["API /api/trials"]
  n96["API /api/trials/add"]
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
  n112["bot/hub.js"]
  n113["bot/lineuprec.js"]
  n114["bot/locker.js"]
  n115["bot/members.js"]
  n116["bot/notify.js"]
  n117["bot/plays.js"]
  n118["bot/predict.js"]
  n119["bot/probuilds.js"]
  n120["bot/ratings.js"]
  n121["bot/squads.js"]
  n122["bot/trials.js"]
  n123["tests/avatarcard.test.mjs"]
  n124["tests/awards.test.mjs"]
  n125["tests/badges.test.mjs"]
  n126["tests/builder.test.mjs"]
  n127["tests/builds.test.mjs"]
  n128["tests/cardstudio.test.mjs"]
  n129["tests/chat.test.mjs"]
  n130["tests/crawl.test.mjs"]
  n131["tests/discord.test.mjs"]
  n132["tests/docs.test.mjs"]
  n133["tests/drilldown.test.mjs"]
  n134["tests/dugout.test.mjs"]
  n135["tests/events.test.mjs"]
  n136["tests/feed.test.mjs"]
  n137["tests/flags.test.mjs"]
  n138["tests/game.test.mjs"]
  n139["tests/honours.test.mjs"]
  n140["tests/hub.test.mjs"]
  n141["tests/hublive.test.mjs"]
  n142["tests/issues.test.mjs"]
  n143["tests/lineuprec.test.mjs"]
  n144["tests/locker.test.mjs"]
  n145["tests/media.test.mjs"]
  n146["tests/members.test.mjs"]
  n147["tests/moderation.test.mjs"]
  n148["tests/next.test.mjs"]
  n149["tests/notify.test.mjs"]
  n150["tests/playmedia.test.mjs"]
  n151["tests/plays.test.mjs"]
  n152["tests/probuilds.test.mjs"]
  n153["tests/profiles.test.mjs"]
  n154["tests/rush.test.mjs"]
  n155["tests/social.test.mjs"]
  n156["tests/squads.test.mjs"]
  n157["tests/studio.test.mjs"]
  n158["tests/submissions.test.mjs"]
  n159["tests/trials.test.mjs"]
  n160["tests/wave10.test.mjs"]
  n161["tests/wave11.test.mjs"]
  n162["tests/wave8.test.mjs"]
  n163["web/app.js"]
  n164["web/avatarcard.js"]
  n165["web/awards.js"]
  n166["web/badges.js"]
  n167["web/boardroom.js"]
  n168["web/builder.js"]
  n169["web/cardstudio.js"]
  n170["web/docs.js"]
  n171["web/dugout.js"]
  n172["web/events.js"]
  n173["web/feed.js"]
  n174["web/feedback.js"]
  n175["web/game.js"]
  n176["web/honours.js"]
  n177["web/hub.js"]
  n178["web/hubgold.js"]
  n179["web/hublive.js"]
  n180["web/locker.js"]
  n181["web/messages.js"]
  n182["web/mystats.js"]
  n183["web/notify.js"]
  n184["web/predict.js"]
  n185["web/probuilds.js"]
  n186["web/profile.js"]
  n187["web/ratings.js"]
  n188["web/report.js"]
  n189["web/squads.js"]
  n190["web/tactics.js"]
  n191["web/trials.js"]
  n100 --> n16
  n100 --> n17
  n100 --> n18
  n100 --> n19
  n100 --> n20
  n101 --> n0
  n101 --> n1
  n101 --> n2
  n101 --> n21
  n101 --> n22
  n102 --> n59
  n102 --> n69
  n102 --> n93
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
  n106 --> n39
  n106 --> n40
  n106 --> n41
  n106 --> n76
  n106 --> n93
  n106 --> n94
  n107 --> n42
  n107 --> n43
  n107 --> n44
  n107 --> n45
  n107 --> n46
  n107 --> n47
  n107 --> n48
  n108 --> n49
  n108 --> n50
  n108 --> n51
  n108 --> n52
  n108 --> n53
  n108 --> n54
  n108 --> n55
  n108 --> n56
  n108 --> n57
  n109 --> n58
  n109 --> n59
  n110 --> n60
  n111 --> n61
  n112 --> n62
  n113 --> n47
  n114 --> n64
  n115 --> n3
  n115 --> n4
  n115 --> n5
  n115 --> n6
  n115 --> n7
  n115 --> n8
  n115 --> n9
  n115 --> n12
  n115 --> n13
  n115 --> n14
  n115 --> n15
  n115 --> n29
  n115 --> n38
  n115 --> n39
  n115 --> n61
  n115 --> n63
  n115 --> n65
  n115 --> n78
  n115 --> n85
  n115 --> n87
  n115 --> n88
  n115 --> n89
  n115 --> n97
  n115 --> n99
  n116 --> n10
  n116 --> n11
  n116 --> n67
  n116 --> n68
  n116 --> n69
  n116 --> n70
  n116 --> n71
  n116 --> n72
  n116 --> n73
  n117 --> n74
  n117 --> n75
  n118 --> n77
  n119 --> n66
  n119 --> n78
  n119 --> n79
  n119 --> n80
  n119 --> n81
  n119 --> n82
  n119 --> n83
  n119 --> n84
  n120 --> n86
  n121 --> n91
  n121 --> n92
  n122 --> n90
  n122 --> n95
  n122 --> n96
  n122 --> n98
  n123 --> n15
  n124 --> n16
  n124 --> n17
  n124 --> n18
  n124 --> n19
  n124 --> n20
  n124 --> n67
  n125 --> n0
  n125 --> n1
  n125 --> n2
  n125 --> n3
  n125 --> n21
  n125 --> n22
  n125 --> n38
  n125 --> n85
  n126 --> n25
  n127 --> n8
  n127 --> n23
  n127 --> n24
  n127 --> n25
  n128 --> n26
  n128 --> n27
  n128 --> n28
  n128 --> n29
  n128 --> n30
  n128 --> n31
  n128 --> n32
  n128 --> n33
  n128 --> n34
  n128 --> n35
  n128 --> n36
  n129 --> n37
  n130 --> n6
  n131 --> n3
  n131 --> n65
  n132 --> n39
  n132 --> n40
  n132 --> n41
  n132 --> n67
  n132 --> n68
  n132 --> n70
  n132 --> n76
  n132 --> n93
  n132 --> n94
  n133 --> n37
  n134 --> n42
  n134 --> n43
  n134 --> n45
  n134 --> n46
  n134 --> n48
  n134 --> n74
  n134 --> n98
  n135 --> n8
  n135 --> n42
  n135 --> n43
  n135 --> n45
  n135 --> n48
  n135 --> n67
  n135 --> n85
  n136 --> n49
  n136 --> n50
  n136 --> n51
  n136 --> n52
  n136 --> n53
  n136 --> n54
  n136 --> n55
  n136 --> n56
  n136 --> n57
  n137 --> n4
  n137 --> n5
  n137 --> n6
  n137 --> n8
  n137 --> n61
  n137 --> n65
  n137 --> n69
  n137 --> n87
  n137 --> n89
  n138 --> n8
  n138 --> n60
  n139 --> n61
  n140 --> n62
  n140 --> n67
  n141 --> n62
  n142 --> n63
  n143 --> n42
  n143 --> n45
  n143 --> n47
  n143 --> n48
  n144 --> n20
  n144 --> n46
  n144 --> n48
  n144 --> n64
  n144 --> n72
  n144 --> n74
  n144 --> n99
  n145 --> n49
  n145 --> n51
  n145 --> n52
  n145 --> n53
  n146 --> n3
  n146 --> n8
  n146 --> n12
  n146 --> n14
  n146 --> n38
  n146 --> n65
  n146 --> n85
  n146 --> n99
  n147 --> n7
  n147 --> n8
  n147 --> n9
  n147 --> n13
  n147 --> n37
  n147 --> n49
  n147 --> n50
  n147 --> n53
  n147 --> n55
  n147 --> n57
  n148 --> n0
  n148 --> n2
  n148 --> n8
  n148 --> n15
  n148 --> n16
  n148 --> n20
  n148 --> n21
  n148 --> n22
  n148 --> n23
  n148 --> n24
  n148 --> n25
  n148 --> n26
  n148 --> n27
  n148 --> n28
  n148 --> n29
  n148 --> n30
  n148 --> n31
  n148 --> n32
  n148 --> n33
  n148 --> n34
  n148 --> n35
  n148 --> n36
  n148 --> n39
  n148 --> n40
  n148 --> n50
  n148 --> n53
  n148 --> n54
  n148 --> n63
  n148 --> n64
  n148 --> n65
  n148 --> n66
  n148 --> n67
  n148 --> n68
  n148 --> n71
  n148 --> n72
  n148 --> n73
  n148 --> n74
  n148 --> n75
  n148 --> n76
  n148 --> n77
  n148 --> n79
  n148 --> n80
  n148 --> n81
  n148 --> n82
  n148 --> n83
  n148 --> n84
  n148 --> n85
  n148 --> n90
  n148 --> n91
  n148 --> n92
  n148 --> n93
  n148 --> n94
  n148 --> n95
  n149 --> n3
  n149 --> n10
  n149 --> n11
  n149 --> n38
  n149 --> n67
  n149 --> n68
  n149 --> n69
  n149 --> n70
  n149 --> n71
  n149 --> n72
  n149 --> n73
  n149 --> n87
  n149 --> n88
  n149 --> n90
  n149 --> n95
  n149 --> n96
  n149 --> n97
  n149 --> n98
  n150 --> n74
  n151 --> n74
  n151 --> n75
  n152 --> n8
  n152 --> n23
  n152 --> n24
  n152 --> n66
  n152 --> n78
  n152 --> n79
  n152 --> n80
  n152 --> n81
  n152 --> n82
  n152 --> n83
  n152 --> n84
  n153 --> n8
  n153 --> n65
  n153 --> n85
  n154 --> n8
  n154 --> n87
  n154 --> n88
  n154 --> n89
  n155 --> n49
  n155 --> n50
  n155 --> n52
  n155 --> n53
  n155 --> n56
  n156 --> n67
  n156 --> n85
  n156 --> n91
  n156 --> n92
  n157 --> n74
  n158 --> n16
  n158 --> n20
  n158 --> n23
  n158 --> n59
  n158 --> n86
  n158 --> n93
  n159 --> n8
  n159 --> n90
  n159 --> n95
  n159 --> n96
  n159 --> n97
  n159 --> n98
  n160 --> n58
  n160 --> n59
  n160 --> n67
  n160 --> n77
  n160 --> n86
  n161 --> n23
  n161 --> n60
  n161 --> n67
  n162 --> n38
  n162 --> n42
  n162 --> n45
  n162 --> n48
  n162 --> n67
  n163 --> n3
  n163 --> n4
  n163 --> n5
  n163 --> n6
  n163 --> n7
  n163 --> n9
  n163 --> n12
  n163 --> n13
  n163 --> n14
  n163 --> n38
  n163 --> n51
  n163 --> n57
  n163 --> n58
  n163 --> n64
  n163 --> n65
  n163 --> n85
  n163 --> n87
  n163 --> n88
  n163 --> n89
  n163 --> n99
  n164 --> n15
  n165 --> n16
  n165 --> n17
  n165 --> n18
  n165 --> n19
  n165 --> n20
  n165 --> n44
  n166 --> n0
  n166 --> n1
  n166 --> n2
  n166 --> n21
  n166 --> n22
  n167 --> n4
  n167 --> n5
  n167 --> n6
  n167 --> n61
  n167 --> n69
  n168 --> n23
  n168 --> n24
  n168 --> n25
  n168 --> n66
  n168 --> n82
  n169 --> n26
  n169 --> n27
  n169 --> n28
  n169 --> n29
  n169 --> n30
  n169 --> n31
  n169 --> n32
  n169 --> n33
  n169 --> n34
  n169 --> n35
  n169 --> n36
  n170 --> n39
  n170 --> n40
  n170 --> n41
  n170 --> n76
  n170 --> n93
  n170 --> n94
  n171 --> n42
  n171 --> n45
  n171 --> n46
  n171 --> n74
  n171 --> n95
  n171 --> n98
  n172 --> n42
  n172 --> n43
  n172 --> n44
  n172 --> n45
  n172 --> n47
  n172 --> n48
  n173 --> n41
  n173 --> n50
  n173 --> n51
  n173 --> n52
  n173 --> n53
  n173 --> n54
  n173 --> n55
  n173 --> n56
  n173 --> n57
  n174 --> n58
  n174 --> n59
  n175 --> n60
  n176 --> n61
  n177 --> n65
  n178 --> n64
  n178 --> n65
  n179 --> n62
  n180 --> n48
  n180 --> n64
  n180 --> n99
  n181 --> n37
  n182 --> n0
  n182 --> n87
  n183 --> n10
  n183 --> n11
  n183 --> n67
  n183 --> n68
  n183 --> n69
  n183 --> n70
  n183 --> n71
  n183 --> n72
  n183 --> n73
  n184 --> n77
  n185 --> n66
  n185 --> n78
  n185 --> n79
  n185 --> n80
  n185 --> n81
  n185 --> n83
  n185 --> n84
  n186 --> n85
  n187 --> n86
  n188 --> n63
  n189 --> n44
  n189 --> n91
  n189 --> n92
  n190 --> n74
  n190 --> n75
  n191 --> n90
  n191 --> n95
  n191 --> n96
  n191 --> n97
  n191 --> n98
```
