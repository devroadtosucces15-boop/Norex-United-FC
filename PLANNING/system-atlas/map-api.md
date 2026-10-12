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
  n7["API /api/admin/medals"]
  n8["API /api/admin/mute"]
  n9["API /api/admin/overview"]
  n10["API /api/admin/reports"]
  n11["API /api/admin/requests"]
  n12["API /api/admin/requests/decide"]
  n13["API /api/admin/squadweek"]
  n14["API /api/avatarcard"]
  n15["API /api/awards"]
  n16["API /api/awards/vote"]
  n17["API /api/badges"]
  n18["API /api/badges/remove"]
  n19["API /api/builds"]
  n20["API /api/builds/delete"]
  n21["API /api/builds/fork"]
  n22["API /api/cards/kit-number"]
  n23["API /api/cards/owner/requests"]
  n24["API /api/cards/owner/revoke"]
  n25["API /api/cards/request"]
  n26["API /api/cards/request/cancel"]
  n27["API /api/cards/requests"]
  n28["API /api/cards/requests/decide"]
  n29["API /api/cards/requests/retry"]
  n30["API /api/cards/requests/review"]
  n31["API /api/cards/templates"]
  n32["API /api/cards/templates/update"]
  n33["API /api/chats"]
  n34["API /api/claim"]
  n35["API /api/docs"]
  n36["API /api/docs/ack"]
  n37["API /api/docs/discord"]
  n38["API /api/events"]
  n39["API /api/events/checkin"]
  n40["API /api/events/discord"]
  n41["API /api/events/lineup"]
  n42["API /api/events/plays"]
  n43["API /api/events/recommend"]
  n44["API /api/events/rsvp"]
  n45["API /api/feed"]
  n46["API /api/feed/comment"]
  n47["API /api/feed/delete"]
  n48["API /api/feed/edit"]
  n49["API /api/feed/post"]
  n50["API /api/feed/react"]
  n51["API /api/feed/report"]
  n52["API /api/feed/uncomment"]
  n53["API /api/feed/unreport"]
  n54["API /api/feedback/hide"]
  n55["API /api/feedback/send"]
  n56["API /api/game/publish"]
  n57["API /api/hof"]
  n58["API /api/hof/remove"]
  n59["API /api/hub/wave"]
  n60["API /api/intel"]
  n61["API /api/intel/act"]
  n62["API /api/intel/remind"]
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
  n113["bot/insights.js"]
  n114["bot/lineuprec.js"]
  n115["bot/locker.js"]
  n116["bot/members.js"]
  n117["bot/notify.js"]
  n118["bot/plays.js"]
  n119["bot/predict.js"]
  n120["bot/probuilds.js"]
  n121["bot/ratings.js"]
  n122["bot/squads.js"]
  n123["bot/trials.js"]
  n124["tests/avatarcard.test.mjs"]
  n125["tests/awards.test.mjs"]
  n126["tests/badges.test.mjs"]
  n127["tests/builder.test.mjs"]
  n128["tests/builds.test.mjs"]
  n129["tests/cardstudio.test.mjs"]
  n130["tests/chat.test.mjs"]
  n131["tests/crawl.test.mjs"]
  n132["tests/discord.test.mjs"]
  n133["tests/docs.test.mjs"]
  n134["tests/drilldown.test.mjs"]
  n135["tests/dugout.test.mjs"]
  n136["tests/events.test.mjs"]
  n137["tests/feed.test.mjs"]
  n138["tests/flags.test.mjs"]
  n139["tests/game.test.mjs"]
  n140["tests/honours.test.mjs"]
  n141["tests/hub.test.mjs"]
  n142["tests/hublive.test.mjs"]
  n143["tests/intel.test.mjs"]
  n144["tests/issues.test.mjs"]
  n145["tests/lineuprec.test.mjs"]
  n146["tests/locker.test.mjs"]
  n147["tests/media.test.mjs"]
  n148["tests/members.test.mjs"]
  n149["tests/moderation.test.mjs"]
  n150["tests/next.test.mjs"]
  n151["tests/notify.test.mjs"]
  n152["tests/playmedia.test.mjs"]
  n153["tests/plays.test.mjs"]
  n154["tests/probuilds.test.mjs"]
  n155["tests/profiles.test.mjs"]
  n156["tests/rush.test.mjs"]
  n157["tests/social.test.mjs"]
  n158["tests/squads.test.mjs"]
  n159["tests/studio.test.mjs"]
  n160["tests/submissions.test.mjs"]
  n161["tests/trials.test.mjs"]
  n162["tests/wave10.test.mjs"]
  n163["tests/wave11.test.mjs"]
  n164["tests/wave8.test.mjs"]
  n165["web/app.js"]
  n166["web/avatarcard.js"]
  n167["web/awards.js"]
  n168["web/badges.js"]
  n169["web/boardroom.js"]
  n170["web/builder.js"]
  n171["web/cardstudio.js"]
  n172["web/docs.js"]
  n173["web/dugout.js"]
  n174["web/events.js"]
  n175["web/feed.js"]
  n176["web/feedback.js"]
  n177["web/game.js"]
  n178["web/honours.js"]
  n179["web/hub.js"]
  n180["web/hubgold.js"]
  n181["web/hublive.js"]
  n182["web/intel.js"]
  n183["web/locker.js"]
  n184["web/messages.js"]
  n185["web/mystats.js"]
  n186["web/notify.js"]
  n187["web/predict.js"]
  n188["web/probuilds.js"]
  n189["web/profile.js"]
  n190["web/ratings.js"]
  n191["web/report.js"]
  n192["web/squads.js"]
  n193["web/tactics.js"]
  n194["web/trials.js"]
  n100 --> n15
  n100 --> n16
  n101 --> n0
  n101 --> n1
  n101 --> n2
  n101 --> n7
  n101 --> n17
  n101 --> n18
  n102 --> n55
  n102 --> n69
  n102 --> n93
  n103 --> n19
  n103 --> n20
  n103 --> n21
  n104 --> n22
  n104 --> n23
  n104 --> n24
  n104 --> n25
  n104 --> n26
  n104 --> n27
  n104 --> n28
  n104 --> n29
  n104 --> n30
  n104 --> n31
  n104 --> n32
  n105 --> n33
  n106 --> n35
  n106 --> n36
  n106 --> n37
  n106 --> n76
  n106 --> n93
  n106 --> n94
  n107 --> n38
  n107 --> n39
  n107 --> n40
  n107 --> n41
  n107 --> n42
  n107 --> n43
  n107 --> n44
  n108 --> n45
  n108 --> n46
  n108 --> n47
  n108 --> n48
  n108 --> n49
  n108 --> n50
  n108 --> n51
  n108 --> n52
  n108 --> n53
  n109 --> n54
  n109 --> n55
  n110 --> n56
  n111 --> n57
  n111 --> n58
  n112 --> n59
  n113 --> n60
  n113 --> n61
  n113 --> n62
  n114 --> n43
  n115 --> n64
  n116 --> n3
  n116 --> n4
  n116 --> n5
  n116 --> n6
  n116 --> n8
  n116 --> n9
  n116 --> n10
  n116 --> n13
  n116 --> n14
  n116 --> n25
  n116 --> n34
  n116 --> n35
  n116 --> n57
  n116 --> n63
  n116 --> n65
  n116 --> n78
  n116 --> n85
  n116 --> n87
  n116 --> n88
  n116 --> n89
  n116 --> n97
  n116 --> n99
  n117 --> n11
  n117 --> n12
  n117 --> n67
  n117 --> n68
  n117 --> n69
  n117 --> n70
  n117 --> n71
  n117 --> n72
  n117 --> n73
  n118 --> n74
  n118 --> n75
  n119 --> n77
  n120 --> n66
  n120 --> n78
  n120 --> n79
  n120 --> n80
  n120 --> n81
  n120 --> n82
  n120 --> n83
  n120 --> n84
  n121 --> n86
  n122 --> n91
  n122 --> n92
  n123 --> n90
  n123 --> n95
  n123 --> n96
  n123 --> n98
  n124 --> n14
  n125 --> n15
  n125 --> n16
  n125 --> n67
  n126 --> n0
  n126 --> n1
  n126 --> n2
  n126 --> n3
  n126 --> n7
  n126 --> n17
  n126 --> n18
  n126 --> n34
  n126 --> n85
  n127 --> n21
  n128 --> n9
  n128 --> n19
  n128 --> n20
  n128 --> n21
  n129 --> n22
  n129 --> n23
  n129 --> n24
  n129 --> n25
  n129 --> n26
  n129 --> n27
  n129 --> n28
  n129 --> n29
  n129 --> n30
  n129 --> n31
  n129 --> n32
  n130 --> n33
  n131 --> n6
  n132 --> n3
  n132 --> n65
  n133 --> n35
  n133 --> n36
  n133 --> n37
  n133 --> n67
  n133 --> n68
  n133 --> n70
  n133 --> n76
  n133 --> n93
  n133 --> n94
  n134 --> n33
  n135 --> n38
  n135 --> n39
  n135 --> n41
  n135 --> n42
  n135 --> n44
  n135 --> n74
  n135 --> n98
  n136 --> n9
  n136 --> n38
  n136 --> n39
  n136 --> n41
  n136 --> n44
  n136 --> n67
  n136 --> n85
  n137 --> n45
  n137 --> n46
  n137 --> n47
  n137 --> n48
  n137 --> n49
  n137 --> n50
  n137 --> n51
  n137 --> n52
  n137 --> n53
  n138 --> n4
  n138 --> n5
  n138 --> n6
  n138 --> n9
  n138 --> n57
  n138 --> n65
  n138 --> n69
  n138 --> n87
  n138 --> n89
  n139 --> n9
  n139 --> n56
  n140 --> n57
  n140 --> n58
  n141 --> n59
  n141 --> n67
  n142 --> n59
  n143 --> n60
  n143 --> n61
  n143 --> n62
  n144 --> n63
  n145 --> n38
  n145 --> n41
  n145 --> n43
  n145 --> n44
  n146 --> n16
  n146 --> n42
  n146 --> n44
  n146 --> n64
  n146 --> n72
  n146 --> n74
  n146 --> n99
  n147 --> n45
  n147 --> n47
  n147 --> n48
  n147 --> n49
  n148 --> n3
  n148 --> n9
  n148 --> n13
  n148 --> n34
  n148 --> n65
  n148 --> n85
  n148 --> n99
  n149 --> n8
  n149 --> n9
  n149 --> n10
  n149 --> n33
  n149 --> n45
  n149 --> n46
  n149 --> n49
  n149 --> n51
  n149 --> n53
  n150 --> n0
  n150 --> n2
  n150 --> n4
  n150 --> n5
  n150 --> n7
  n150 --> n9
  n150 --> n14
  n150 --> n15
  n150 --> n16
  n150 --> n17
  n150 --> n18
  n150 --> n19
  n150 --> n20
  n150 --> n21
  n150 --> n22
  n150 --> n23
  n150 --> n24
  n150 --> n25
  n150 --> n26
  n150 --> n27
  n150 --> n28
  n150 --> n29
  n150 --> n30
  n150 --> n31
  n150 --> n32
  n150 --> n35
  n150 --> n36
  n150 --> n46
  n150 --> n49
  n150 --> n50
  n150 --> n58
  n150 --> n60
  n150 --> n61
  n150 --> n62
  n150 --> n63
  n150 --> n64
  n150 --> n65
  n150 --> n66
  n150 --> n67
  n150 --> n68
  n150 --> n71
  n150 --> n72
  n150 --> n73
  n150 --> n74
  n150 --> n75
  n150 --> n76
  n150 --> n77
  n150 --> n79
  n150 --> n80
  n150 --> n81
  n150 --> n82
  n150 --> n83
  n150 --> n84
  n150 --> n85
  n150 --> n90
  n150 --> n91
  n150 --> n92
  n150 --> n93
  n150 --> n94
  n150 --> n95
  n151 --> n3
  n151 --> n11
  n151 --> n12
  n151 --> n34
  n151 --> n67
  n151 --> n68
  n151 --> n69
  n151 --> n70
  n151 --> n71
  n151 --> n72
  n151 --> n73
  n151 --> n87
  n151 --> n88
  n151 --> n90
  n151 --> n95
  n151 --> n96
  n151 --> n97
  n151 --> n98
  n152 --> n74
  n153 --> n74
  n153 --> n75
  n154 --> n9
  n154 --> n19
  n154 --> n20
  n154 --> n66
  n154 --> n78
  n154 --> n79
  n154 --> n80
  n154 --> n81
  n154 --> n82
  n154 --> n83
  n154 --> n84
  n155 --> n9
  n155 --> n65
  n155 --> n85
  n156 --> n9
  n156 --> n87
  n156 --> n88
  n156 --> n89
  n157 --> n45
  n157 --> n46
  n157 --> n48
  n157 --> n49
  n157 --> n52
  n158 --> n67
  n158 --> n85
  n158 --> n91
  n158 --> n92
  n159 --> n74
  n160 --> n15
  n160 --> n16
  n160 --> n19
  n160 --> n55
  n160 --> n86
  n160 --> n93
  n161 --> n9
  n161 --> n90
  n161 --> n95
  n161 --> n96
  n161 --> n97
  n161 --> n98
  n162 --> n54
  n162 --> n55
  n162 --> n67
  n162 --> n77
  n162 --> n86
  n163 --> n19
  n163 --> n56
  n163 --> n67
  n164 --> n34
  n164 --> n38
  n164 --> n41
  n164 --> n44
  n164 --> n67
  n165 --> n3
  n165 --> n4
  n165 --> n5
  n165 --> n6
  n165 --> n8
  n165 --> n10
  n165 --> n13
  n165 --> n34
  n165 --> n47
  n165 --> n53
  n165 --> n54
  n165 --> n64
  n165 --> n65
  n165 --> n85
  n165 --> n87
  n165 --> n88
  n165 --> n89
  n165 --> n99
  n166 --> n14
  n167 --> n15
  n167 --> n16
  n167 --> n40
  n168 --> n0
  n168 --> n1
  n168 --> n2
  n168 --> n17
  n168 --> n18
  n169 --> n4
  n169 --> n5
  n169 --> n6
  n169 --> n57
  n169 --> n69
  n170 --> n19
  n170 --> n20
  n170 --> n21
  n170 --> n66
  n170 --> n82
  n171 --> n22
  n171 --> n23
  n171 --> n24
  n171 --> n25
  n171 --> n26
  n171 --> n27
  n171 --> n28
  n171 --> n29
  n171 --> n30
  n171 --> n31
  n171 --> n32
  n172 --> n35
  n172 --> n36
  n172 --> n37
  n172 --> n76
  n172 --> n93
  n172 --> n94
  n173 --> n38
  n173 --> n41
  n173 --> n42
  n173 --> n74
  n173 --> n95
  n173 --> n98
  n174 --> n38
  n174 --> n39
  n174 --> n40
  n174 --> n41
  n174 --> n43
  n174 --> n44
  n175 --> n37
  n175 --> n46
  n175 --> n47
  n175 --> n48
  n175 --> n49
  n175 --> n50
  n175 --> n51
  n175 --> n52
  n175 --> n53
  n176 --> n54
  n176 --> n55
  n177 --> n56
  n178 --> n57
  n178 --> n58
  n179 --> n65
  n180 --> n64
  n180 --> n65
  n181 --> n59
  n182 --> n60
  n182 --> n61
  n182 --> n62
  n183 --> n44
  n183 --> n64
  n183 --> n99
  n184 --> n33
  n185 --> n0
  n185 --> n87
  n186 --> n11
  n186 --> n12
  n186 --> n67
  n186 --> n68
  n186 --> n69
  n186 --> n70
  n186 --> n71
  n186 --> n72
  n186 --> n73
  n187 --> n77
  n188 --> n66
  n188 --> n78
  n188 --> n79
  n188 --> n80
  n188 --> n81
  n188 --> n83
  n188 --> n84
  n189 --> n85
  n190 --> n86
  n191 --> n63
  n192 --> n40
  n192 --> n91
  n192 --> n92
  n193 --> n74
  n193 --> n75
  n194 --> n90
  n194 --> n95
  n194 --> n96
  n194 --> n97
  n194 --> n98
```
