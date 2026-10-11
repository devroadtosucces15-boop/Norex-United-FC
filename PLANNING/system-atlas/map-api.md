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
  n20["API /api/awards/close"]
  n21["API /api/awards/settings"]
  n22["API /api/awards/vote"]
  n23["API /api/badges"]
  n24["API /api/badges/remove"]
  n25["API /api/bot/settings"]
  n26["API /api/builds"]
  n27["API /api/builds/delete"]
  n28["API /api/builds/fork"]
  n29["API /api/builds/impact"]
  n30["API /api/cards/kit-number"]
  n31["API /api/cards/owner/requests"]
  n32["API /api/cards/owner/revoke"]
  n33["API /api/cards/request"]
  n34["API /api/cards/request/cancel"]
  n35["API /api/cards/requests"]
  n36["API /api/cards/requests/decide"]
  n37["API /api/cards/requests/retry"]
  n38["API /api/cards/requests/review"]
  n39["API /api/cards/templates"]
  n40["API /api/cards/templates/update"]
  n41["API /api/chats"]
  n42["API /api/claim"]
  n43["API /api/contacts"]
  n44["API /api/crawl"]
  n45["API /api/docs"]
  n46["API /api/docs/ack"]
  n47["API /api/docs/acks"]
  n48["API /api/docs/discord"]
  n49["API /api/events"]
  n50["API /api/events/checkin"]
  n51["API /api/events/discord"]
  n52["API /api/events/lineup"]
  n53["API /api/events/plays"]
  n54["API /api/events/recommend"]
  n55["API /api/events/rsvp"]
  n56["API /api/feed"]
  n57["API /api/feed/comment"]
  n58["API /api/feed/delete"]
  n59["API /api/feed/edit"]
  n60["API /api/feed/post"]
  n61["API /api/feed/react"]
  n62["API /api/feed/report"]
  n63["API /api/feed/uncomment"]
  n64["API /api/feed/unreport"]
  n65["API /api/feedback/hide"]
  n66["API /api/feedback/send"]
  n67["API /api/game/publish"]
  n68["API /api/hof"]
  n69["API /api/hub/wave"]
  n70["API /api/issues"]
  n71["API /api/locker"]
  n72["API /api/me"]
  n73["API /api/mybuild"]
  n74["API /api/notify"]
  n75["API /api/notify/ack"]
  n76["API /api/notify/announce"]
  n77["API /api/notify/count"]
  n78["API /api/notify/prefs"]
  n79["API /api/notify/read"]
  n80["API /api/notify/test"]
  n81["API /api/plays"]
  n82["API /api/playstyle"]
  n83["API /api/predict"]
  n84["API /api/probuilds"]
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
  n121["bot/settings.js"]
  n122["bot/squads.js"]
  n123["bot/trials.js"]
  n124["tests/avatarcard.test.mjs"]
  n125["tests/awards.test.mjs"]
  n126["tests/badges.test.mjs"]
  n127["tests/builder.test.mjs"]
  n128["tests/builds.test.mjs"]
  n129["tests/cardstudio.test.mjs"]
  n130["tests/chat.test.mjs"]
  n131["tests/clublookup.test.mjs"]
  n132["tests/crawl.test.mjs"]
  n133["tests/discord.test.mjs"]
  n134["tests/docs.test.mjs"]
  n135["tests/drilldown.test.mjs"]
  n136["tests/dugout.test.mjs"]
  n137["tests/events.test.mjs"]
  n138["tests/feed.test.mjs"]
  n139["tests/flags.test.mjs"]
  n140["tests/game.test.mjs"]
  n141["tests/honours.test.mjs"]
  n142["tests/hub.test.mjs"]
  n143["tests/hublive.test.mjs"]
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
  n182["web/locker.js"]
  n183["web/messages.js"]
  n184["web/mystats.js"]
  n185["web/notify.js"]
  n186["web/predict.js"]
  n187["web/probuilds.js"]
  n188["web/profile.js"]
  n189["web/ratings.js"]
  n190["web/report.js"]
  n191["web/settings.js"]
  n192["web/squads.js"]
  n193["web/tactics.js"]
  n194["web/trials.js"]
  n100 --> n16
  n100 --> n17
  n100 --> n18
  n100 --> n19
  n100 --> n20
  n100 --> n21
  n100 --> n22
  n101 --> n0
  n101 --> n1
  n101 --> n2
  n101 --> n23
  n101 --> n24
  n102 --> n66
  n102 --> n76
  n102 --> n93
  n103 --> n26
  n103 --> n27
  n103 --> n28
  n103 --> n29
  n104 --> n30
  n104 --> n31
  n104 --> n32
  n104 --> n33
  n104 --> n34
  n104 --> n35
  n104 --> n36
  n104 --> n37
  n104 --> n38
  n104 --> n39
  n104 --> n40
  n105 --> n41
  n106 --> n45
  n106 --> n46
  n106 --> n47
  n106 --> n48
  n106 --> n82
  n106 --> n93
  n106 --> n94
  n107 --> n49
  n107 --> n50
  n107 --> n51
  n107 --> n52
  n107 --> n53
  n107 --> n54
  n107 --> n55
  n108 --> n56
  n108 --> n57
  n108 --> n58
  n108 --> n59
  n108 --> n60
  n108 --> n61
  n108 --> n62
  n108 --> n63
  n108 --> n64
  n109 --> n65
  n109 --> n66
  n110 --> n67
  n111 --> n68
  n112 --> n69
  n113 --> n54
  n114 --> n71
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
  n115 --> n33
  n115 --> n42
  n115 --> n43
  n115 --> n44
  n115 --> n45
  n115 --> n68
  n115 --> n70
  n115 --> n72
  n115 --> n84
  n115 --> n85
  n115 --> n87
  n115 --> n88
  n115 --> n89
  n115 --> n97
  n115 --> n99
  n116 --> n10
  n116 --> n11
  n116 --> n74
  n116 --> n75
  n116 --> n76
  n116 --> n77
  n116 --> n78
  n116 --> n79
  n116 --> n80
  n117 --> n81
  n118 --> n83
  n119 --> n73
  n119 --> n84
  n120 --> n86
  n121 --> n25
  n122 --> n91
  n122 --> n92
  n123 --> n90
  n123 --> n95
  n123 --> n96
  n123 --> n98
  n124 --> n15
  n125 --> n16
  n125 --> n17
  n125 --> n18
  n125 --> n19
  n125 --> n20
  n125 --> n21
  n125 --> n22
  n125 --> n74
  n126 --> n0
  n126 --> n1
  n126 --> n2
  n126 --> n3
  n126 --> n23
  n126 --> n24
  n126 --> n42
  n126 --> n85
  n127 --> n28
  n128 --> n8
  n128 --> n26
  n128 --> n27
  n128 --> n28
  n129 --> n30
  n129 --> n31
  n129 --> n32
  n129 --> n33
  n129 --> n34
  n129 --> n35
  n129 --> n36
  n129 --> n37
  n129 --> n38
  n129 --> n39
  n129 --> n40
  n130 --> n41
  n131 --> n44
  n132 --> n6
  n132 --> n44
  n133 --> n3
  n133 --> n72
  n134 --> n45
  n134 --> n46
  n134 --> n47
  n134 --> n48
  n134 --> n74
  n134 --> n75
  n134 --> n77
  n134 --> n82
  n134 --> n93
  n134 --> n94
  n135 --> n41
  n136 --> n49
  n136 --> n50
  n136 --> n52
  n136 --> n53
  n136 --> n55
  n136 --> n81
  n136 --> n98
  n137 --> n8
  n137 --> n49
  n137 --> n50
  n137 --> n52
  n137 --> n55
  n137 --> n74
  n137 --> n85
  n138 --> n56
  n138 --> n57
  n138 --> n58
  n138 --> n59
  n138 --> n60
  n138 --> n61
  n138 --> n62
  n138 --> n63
  n138 --> n64
  n139 --> n4
  n139 --> n5
  n139 --> n6
  n139 --> n8
  n139 --> n25
  n139 --> n68
  n139 --> n72
  n139 --> n76
  n139 --> n87
  n139 --> n89
  n140 --> n8
  n140 --> n67
  n141 --> n68
  n142 --> n69
  n142 --> n74
  n143 --> n69
  n144 --> n70
  n145 --> n49
  n145 --> n52
  n145 --> n54
  n145 --> n55
  n146 --> n22
  n146 --> n53
  n146 --> n55
  n146 --> n71
  n146 --> n79
  n146 --> n81
  n146 --> n99
  n147 --> n56
  n147 --> n58
  n147 --> n59
  n147 --> n60
  n148 --> n3
  n148 --> n8
  n148 --> n12
  n148 --> n14
  n148 --> n42
  n148 --> n72
  n148 --> n85
  n148 --> n99
  n149 --> n7
  n149 --> n8
  n149 --> n9
  n149 --> n13
  n149 --> n41
  n149 --> n56
  n149 --> n57
  n149 --> n60
  n149 --> n62
  n149 --> n64
  n150 --> n0
  n150 --> n2
  n150 --> n8
  n150 --> n15
  n150 --> n16
  n150 --> n22
  n150 --> n23
  n150 --> n24
  n150 --> n30
  n150 --> n31
  n150 --> n32
  n150 --> n33
  n150 --> n34
  n150 --> n35
  n150 --> n36
  n150 --> n37
  n150 --> n38
  n150 --> n39
  n150 --> n40
  n150 --> n45
  n150 --> n46
  n150 --> n57
  n150 --> n60
  n150 --> n61
  n150 --> n70
  n150 --> n71
  n150 --> n72
  n150 --> n74
  n150 --> n75
  n150 --> n78
  n150 --> n79
  n150 --> n80
  n150 --> n81
  n150 --> n82
  n150 --> n83
  n150 --> n85
  n150 --> n90
  n150 --> n91
  n150 --> n92
  n150 --> n93
  n150 --> n94
  n150 --> n95
  n151 --> n3
  n151 --> n10
  n151 --> n11
  n151 --> n42
  n151 --> n74
  n151 --> n75
  n151 --> n76
  n151 --> n77
  n151 --> n78
  n151 --> n79
  n151 --> n80
  n151 --> n87
  n151 --> n88
  n151 --> n90
  n151 --> n95
  n151 --> n96
  n151 --> n97
  n151 --> n98
  n152 --> n81
  n153 --> n81
  n154 --> n8
  n154 --> n26
  n154 --> n27
  n154 --> n73
  n154 --> n84
  n155 --> n8
  n155 --> n72
  n155 --> n85
  n156 --> n8
  n156 --> n87
  n156 --> n88
  n156 --> n89
  n157 --> n56
  n157 --> n57
  n157 --> n59
  n157 --> n60
  n157 --> n63
  n158 --> n74
  n158 --> n85
  n158 --> n91
  n158 --> n92
  n159 --> n81
  n160 --> n16
  n160 --> n22
  n160 --> n26
  n160 --> n66
  n160 --> n86
  n160 --> n93
  n161 --> n8
  n161 --> n43
  n161 --> n90
  n161 --> n95
  n161 --> n96
  n161 --> n97
  n161 --> n98
  n162 --> n65
  n162 --> n66
  n162 --> n74
  n162 --> n83
  n162 --> n86
  n163 --> n26
  n163 --> n29
  n163 --> n67
  n163 --> n74
  n164 --> n42
  n164 --> n49
  n164 --> n52
  n164 --> n55
  n164 --> n74
  n165 --> n3
  n165 --> n4
  n165 --> n5
  n165 --> n6
  n165 --> n7
  n165 --> n9
  n165 --> n12
  n165 --> n13
  n165 --> n14
  n165 --> n42
  n165 --> n58
  n165 --> n64
  n165 --> n65
  n165 --> n71
  n165 --> n72
  n165 --> n85
  n165 --> n87
  n165 --> n88
  n165 --> n89
  n165 --> n99
  n166 --> n15
  n167 --> n16
  n167 --> n17
  n167 --> n18
  n167 --> n19
  n167 --> n20
  n167 --> n21
  n167 --> n22
  n167 --> n51
  n168 --> n0
  n168 --> n1
  n168 --> n2
  n168 --> n23
  n168 --> n24
  n169 --> n4
  n169 --> n5
  n169 --> n6
  n169 --> n68
  n169 --> n76
  n170 --> n26
  n170 --> n27
  n170 --> n28
  n170 --> n29
  n170 --> n73
  n171 --> n30
  n171 --> n31
  n171 --> n32
  n171 --> n33
  n171 --> n34
  n171 --> n35
  n171 --> n36
  n171 --> n37
  n171 --> n38
  n171 --> n39
  n171 --> n40
  n172 --> n45
  n172 --> n46
  n172 --> n47
  n172 --> n48
  n172 --> n82
  n172 --> n93
  n172 --> n94
  n173 --> n49
  n173 --> n52
  n173 --> n53
  n173 --> n81
  n173 --> n95
  n173 --> n98
  n174 --> n49
  n174 --> n50
  n174 --> n51
  n174 --> n52
  n174 --> n54
  n174 --> n55
  n175 --> n48
  n175 --> n57
  n175 --> n58
  n175 --> n59
  n175 --> n60
  n175 --> n61
  n175 --> n62
  n175 --> n63
  n175 --> n64
  n176 --> n65
  n176 --> n66
  n177 --> n67
  n178 --> n68
  n179 --> n72
  n180 --> n71
  n180 --> n72
  n181 --> n69
  n182 --> n55
  n182 --> n71
  n182 --> n99
  n183 --> n41
  n184 --> n0
  n184 --> n87
  n185 --> n10
  n185 --> n11
  n185 --> n74
  n185 --> n75
  n185 --> n76
  n185 --> n77
  n185 --> n78
  n185 --> n79
  n185 --> n80
  n186 --> n83
  n187 --> n73
  n187 --> n84
  n188 --> n85
  n189 --> n86
  n190 --> n70
  n191 --> n25
  n192 --> n51
  n192 --> n91
  n192 --> n92
  n193 --> n81
  n194 --> n43
  n194 --> n90
  n194 --> n95
  n194 --> n96
  n194 --> n97
  n194 --> n98
```
