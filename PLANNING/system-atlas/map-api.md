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
  n49["API /api/docs/remind"]
  n50["API /api/events"]
  n51["API /api/events/checkin"]
  n52["API /api/events/discord"]
  n53["API /api/events/lineup"]
  n54["API /api/events/plays"]
  n55["API /api/events/recommend"]
  n56["API /api/events/rsvp"]
  n57["API /api/feed"]
  n58["API /api/feed/comment"]
  n59["API /api/feed/delete"]
  n60["API /api/feed/edit"]
  n61["API /api/feed/post"]
  n62["API /api/feed/react"]
  n63["API /api/feed/report"]
  n64["API /api/feed/uncomment"]
  n65["API /api/feed/unreport"]
  n66["API /api/feedback/hide"]
  n67["API /api/feedback/send"]
  n68["API /api/game/publish"]
  n69["API /api/hof"]
  n70["API /api/hub/wave"]
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
  n144["tests/lineuprec.test.mjs"]
  n145["tests/locker.test.mjs"]
  n146["tests/media.test.mjs"]
  n147["tests/members.test.mjs"]
  n148["tests/moderation.test.mjs"]
  n149["tests/next.test.mjs"]
  n150["tests/notify.test.mjs"]
  n151["tests/playmedia.test.mjs"]
  n152["tests/plays.test.mjs"]
  n153["tests/probuilds.test.mjs"]
  n154["tests/profiles.test.mjs"]
  n155["tests/rush.test.mjs"]
  n156["tests/social.test.mjs"]
  n157["tests/squads.test.mjs"]
  n158["tests/studio.test.mjs"]
  n159["tests/submissions.test.mjs"]
  n160["tests/trials.test.mjs"]
  n161["tests/wave10.test.mjs"]
  n162["tests/wave11.test.mjs"]
  n163["tests/wave8.test.mjs"]
  n164["web/app.js"]
  n165["web/avatarcard.js"]
  n166["web/awards.js"]
  n167["web/badges.js"]
  n168["web/boardroom.js"]
  n169["web/builder.js"]
  n170["web/cardstudio.js"]
  n171["web/docs.js"]
  n172["web/dugout.js"]
  n173["web/events.js"]
  n174["web/feed.js"]
  n175["web/feedback.js"]
  n176["web/game.js"]
  n177["web/honours.js"]
  n178["web/hub.js"]
  n179["web/hubgold.js"]
  n180["web/hublive.js"]
  n181["web/locker.js"]
  n182["web/messages.js"]
  n183["web/mystats.js"]
  n184["web/notify.js"]
  n185["web/predict.js"]
  n186["web/probuilds.js"]
  n187["web/profile.js"]
  n188["web/ratings.js"]
  n189["web/settings.js"]
  n190["web/squads.js"]
  n191["web/tactics.js"]
  n192["web/trials.js"]
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
  n102 --> n67
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
  n106 --> n49
  n106 --> n82
  n106 --> n93
  n106 --> n94
  n107 --> n50
  n107 --> n51
  n107 --> n52
  n107 --> n53
  n107 --> n54
  n107 --> n55
  n107 --> n56
  n108 --> n57
  n108 --> n58
  n108 --> n59
  n108 --> n60
  n108 --> n61
  n108 --> n62
  n108 --> n63
  n108 --> n64
  n108 --> n65
  n109 --> n66
  n109 --> n67
  n110 --> n68
  n111 --> n69
  n112 --> n70
  n113 --> n55
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
  n115 --> n69
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
  n134 --> n49
  n134 --> n74
  n134 --> n75
  n134 --> n77
  n134 --> n82
  n134 --> n93
  n134 --> n94
  n135 --> n41
  n136 --> n50
  n136 --> n51
  n136 --> n53
  n136 --> n54
  n136 --> n56
  n136 --> n81
  n136 --> n98
  n137 --> n8
  n137 --> n50
  n137 --> n51
  n137 --> n53
  n137 --> n56
  n137 --> n74
  n137 --> n85
  n138 --> n57
  n138 --> n58
  n138 --> n59
  n138 --> n60
  n138 --> n61
  n138 --> n62
  n138 --> n63
  n138 --> n64
  n138 --> n65
  n139 --> n4
  n139 --> n5
  n139 --> n6
  n139 --> n8
  n139 --> n25
  n139 --> n69
  n139 --> n72
  n139 --> n76
  n139 --> n87
  n139 --> n89
  n140 --> n8
  n140 --> n68
  n141 --> n69
  n142 --> n70
  n142 --> n74
  n143 --> n70
  n144 --> n50
  n144 --> n53
  n144 --> n55
  n144 --> n56
  n145 --> n22
  n145 --> n54
  n145 --> n56
  n145 --> n71
  n145 --> n79
  n145 --> n81
  n145 --> n99
  n146 --> n57
  n146 --> n59
  n146 --> n60
  n146 --> n61
  n147 --> n3
  n147 --> n8
  n147 --> n12
  n147 --> n14
  n147 --> n42
  n147 --> n72
  n147 --> n85
  n147 --> n99
  n148 --> n7
  n148 --> n8
  n148 --> n9
  n148 --> n13
  n148 --> n41
  n148 --> n57
  n148 --> n58
  n148 --> n61
  n148 --> n63
  n148 --> n65
  n149 --> n0
  n149 --> n2
  n149 --> n15
  n149 --> n16
  n149 --> n22
  n149 --> n23
  n149 --> n24
  n149 --> n30
  n149 --> n31
  n149 --> n32
  n149 --> n33
  n149 --> n34
  n149 --> n35
  n149 --> n36
  n149 --> n37
  n149 --> n38
  n149 --> n39
  n149 --> n40
  n149 --> n45
  n149 --> n46
  n149 --> n58
  n149 --> n61
  n149 --> n62
  n149 --> n71
  n149 --> n72
  n149 --> n74
  n149 --> n75
  n149 --> n78
  n149 --> n79
  n149 --> n80
  n149 --> n81
  n149 --> n82
  n149 --> n83
  n149 --> n85
  n149 --> n90
  n149 --> n91
  n149 --> n92
  n149 --> n93
  n149 --> n94
  n149 --> n95
  n150 --> n3
  n150 --> n10
  n150 --> n11
  n150 --> n42
  n150 --> n74
  n150 --> n75
  n150 --> n76
  n150 --> n77
  n150 --> n78
  n150 --> n79
  n150 --> n80
  n150 --> n87
  n150 --> n88
  n150 --> n90
  n150 --> n95
  n150 --> n96
  n150 --> n97
  n150 --> n98
  n151 --> n81
  n152 --> n81
  n153 --> n8
  n153 --> n26
  n153 --> n27
  n153 --> n73
  n153 --> n84
  n154 --> n8
  n154 --> n72
  n154 --> n85
  n155 --> n8
  n155 --> n87
  n155 --> n88
  n155 --> n89
  n156 --> n57
  n156 --> n58
  n156 --> n60
  n156 --> n61
  n156 --> n64
  n157 --> n74
  n157 --> n85
  n157 --> n91
  n157 --> n92
  n158 --> n81
  n159 --> n16
  n159 --> n22
  n159 --> n26
  n159 --> n67
  n159 --> n86
  n159 --> n93
  n160 --> n8
  n160 --> n43
  n160 --> n90
  n160 --> n95
  n160 --> n96
  n160 --> n97
  n160 --> n98
  n161 --> n66
  n161 --> n67
  n161 --> n74
  n161 --> n83
  n161 --> n86
  n162 --> n26
  n162 --> n29
  n162 --> n68
  n162 --> n74
  n163 --> n42
  n163 --> n50
  n163 --> n53
  n163 --> n56
  n163 --> n74
  n164 --> n3
  n164 --> n4
  n164 --> n5
  n164 --> n6
  n164 --> n7
  n164 --> n8
  n164 --> n9
  n164 --> n12
  n164 --> n13
  n164 --> n14
  n164 --> n42
  n164 --> n59
  n164 --> n65
  n164 --> n66
  n164 --> n71
  n164 --> n72
  n164 --> n85
  n164 --> n87
  n164 --> n88
  n164 --> n89
  n164 --> n99
  n165 --> n15
  n166 --> n16
  n166 --> n17
  n166 --> n18
  n166 --> n19
  n166 --> n20
  n166 --> n21
  n166 --> n22
  n166 --> n52
  n167 --> n0
  n167 --> n1
  n167 --> n2
  n167 --> n23
  n167 --> n24
  n168 --> n4
  n168 --> n5
  n168 --> n6
  n168 --> n69
  n168 --> n76
  n169 --> n26
  n169 --> n27
  n169 --> n28
  n169 --> n29
  n169 --> n73
  n170 --> n30
  n170 --> n31
  n170 --> n32
  n170 --> n33
  n170 --> n34
  n170 --> n35
  n170 --> n36
  n170 --> n37
  n170 --> n38
  n170 --> n39
  n170 --> n40
  n171 --> n45
  n171 --> n46
  n171 --> n47
  n171 --> n48
  n171 --> n49
  n171 --> n82
  n171 --> n93
  n171 --> n94
  n172 --> n50
  n172 --> n53
  n172 --> n54
  n172 --> n81
  n172 --> n95
  n172 --> n98
  n173 --> n50
  n173 --> n51
  n173 --> n52
  n173 --> n53
  n173 --> n55
  n173 --> n56
  n174 --> n48
  n174 --> n58
  n174 --> n59
  n174 --> n60
  n174 --> n61
  n174 --> n62
  n174 --> n63
  n174 --> n64
  n174 --> n65
  n175 --> n66
  n175 --> n67
  n176 --> n68
  n177 --> n69
  n178 --> n72
  n179 --> n71
  n179 --> n72
  n180 --> n70
  n181 --> n56
  n181 --> n71
  n181 --> n99
  n182 --> n41
  n183 --> n0
  n183 --> n87
  n184 --> n10
  n184 --> n11
  n184 --> n74
  n184 --> n75
  n184 --> n76
  n184 --> n77
  n184 --> n78
  n184 --> n79
  n184 --> n80
  n185 --> n83
  n186 --> n73
  n186 --> n84
  n187 --> n85
  n188 --> n86
  n189 --> n25
  n190 --> n52
  n190 --> n91
  n190 --> n92
  n191 --> n81
  n192 --> n43
  n192 --> n90
  n192 --> n95
  n192 --> n96
  n192 --> n97
  n192 --> n98
```
