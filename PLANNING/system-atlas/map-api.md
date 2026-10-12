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
  n10["API /api/admin/warn"]
  n11["API /api/avatarcard"]
  n12["API /api/awards"]
  n13["API /api/awards/category"]
  n14["API /api/awards/category/remove"]
  n15["API /api/awards/close"]
  n16["API /api/awards/settings"]
  n17["API /api/awards/vote"]
  n18["API /api/badges"]
  n19["API /api/badges/remove"]
  n20["API /api/bot/settings"]
  n21["API /api/builds"]
  n22["API /api/builds/delete"]
  n23["API /api/builds/fork"]
  n24["API /api/cards/kit-number"]
  n25["API /api/cards/owner/requests"]
  n26["API /api/cards/owner/revoke"]
  n27["API /api/cards/request"]
  n28["API /api/cards/request/cancel"]
  n29["API /api/cards/requests"]
  n30["API /api/cards/requests/decide"]
  n31["API /api/cards/requests/retry"]
  n32["API /api/cards/requests/review"]
  n33["API /api/cards/templates"]
  n34["API /api/cards/templates/update"]
  n35["API /api/chats"]
  n36["API /api/claim"]
  n37["API /api/contacts"]
  n38["API /api/docs"]
  n39["API /api/docs/ack"]
  n40["API /api/docs/discord"]
  n41["API /api/events"]
  n42["API /api/events/cancel"]
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
  n53["API /api/feed/pin"]
  n54["API /api/feed/post"]
  n55["API /api/feed/react"]
  n56["API /api/feed/report"]
  n57["API /api/feed/setpublic"]
  n58["API /api/feed/uncomment"]
  n59["API /api/feed/unreport"]
  n60["API /api/feedback/hide"]
  n61["API /api/feedback/send"]
  n62["API /api/game/admin"]
  n63["API /api/game/dismiss"]
  n64["API /api/game/publish"]
  n65["API /api/hof"]
  n66["API /api/hof/remove"]
  n67["API /api/hub/wave"]
  n68["API /api/intel"]
  n69["API /api/intel/act"]
  n70["API /api/intel/remind"]
  n71["API /api/issues"]
  n72["API /api/locker"]
  n73["API /api/me"]
  n74["API /api/mybuild"]
  n75["API /api/notify"]
  n76["API /api/notify/ack"]
  n77["API /api/notify/announce"]
  n78["API /api/notify/count"]
  n79["API /api/notify/prefs"]
  n80["API /api/notify/read"]
  n81["API /api/notify/test"]
  n82["API /api/plays"]
  n83["API /api/plays/discord"]
  n84["API /api/playstyle"]
  n85["API /api/predict"]
  n86["API /api/probuilds"]
  n87["API /api/probuilds/comment"]
  n88["API /api/probuilds/comment/delete"]
  n89["API /api/probuilds/feature"]
  n90["API /api/probuilds/post"]
  n91["API /api/probuilds/unpost"]
  n92["API /api/profile"]
  n93["API /api/rush"]
  n94["API /api/scout"]
  n95["API /api/suggestions"]
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
  n112["bot/hub.js"]
  n113["bot/insights.js"]
  n114["bot/lineuprec.js"]
  n115["bot/locker.js"]
  n116["bot/members.js"]
  n117["bot/notify.js"]
  n118["bot/plays.js"]
  n119["bot/predict.js"]
  n120["bot/probuilds.js"]
  n121["bot/settings.js"]
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
  n142["tests/intel.test.mjs"]
  n143["tests/issues.test.mjs"]
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
  n181["web/intel.js"]
  n182["web/locker.js"]
  n183["web/messages.js"]
  n184["web/mystats.js"]
  n185["web/notify.js"]
  n186["web/predict.js"]
  n187["web/probuilds.js"]
  n188["web/profile.js"]
  n189["web/report.js"]
  n190["web/settings.js"]
  n191["web/squads.js"]
  n192["web/tactics.js"]
  n193["web/trials.js"]
  n100 --> n12
  n100 --> n13
  n100 --> n14
  n100 --> n15
  n100 --> n16
  n100 --> n17
  n101 --> n0
  n101 --> n1
  n101 --> n18
  n101 --> n19
  n102 --> n61
  n102 --> n77
  n102 --> n95
  n103 --> n21
  n103 --> n22
  n103 --> n23
  n104 --> n24
  n104 --> n25
  n104 --> n26
  n104 --> n27
  n104 --> n28
  n104 --> n29
  n104 --> n30
  n104 --> n31
  n104 --> n32
  n104 --> n33
  n104 --> n34
  n105 --> n35
  n106 --> n38
  n106 --> n39
  n106 --> n40
  n106 --> n84
  n106 --> n95
  n107 --> n41
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
  n108 --> n58
  n108 --> n59
  n109 --> n60
  n109 --> n61
  n110 --> n62
  n110 --> n63
  n110 --> n64
  n111 --> n65
  n111 --> n66
  n112 --> n67
  n113 --> n68
  n113 --> n69
  n113 --> n70
  n114 --> n47
  n115 --> n72
  n116 --> n2
  n116 --> n3
  n116 --> n4
  n116 --> n5
  n116 --> n6
  n116 --> n7
  n116 --> n8
  n116 --> n10
  n116 --> n11
  n116 --> n27
  n116 --> n36
  n116 --> n37
  n116 --> n38
  n116 --> n65
  n116 --> n71
  n116 --> n73
  n116 --> n86
  n116 --> n92
  n116 --> n93
  n116 --> n97
  n116 --> n99
  n117 --> n9
  n117 --> n75
  n117 --> n76
  n117 --> n77
  n117 --> n78
  n117 --> n79
  n117 --> n80
  n117 --> n81
  n118 --> n82
  n118 --> n83
  n119 --> n85
  n120 --> n74
  n120 --> n86
  n120 --> n87
  n120 --> n88
  n120 --> n89
  n120 --> n90
  n120 --> n91
  n121 --> n20
  n122 --> n94
  n122 --> n96
  n122 --> n98
  n123 --> n11
  n124 --> n12
  n124 --> n13
  n124 --> n14
  n124 --> n15
  n124 --> n16
  n124 --> n17
  n124 --> n75
  n125 --> n0
  n125 --> n1
  n125 --> n2
  n125 --> n18
  n125 --> n19
  n125 --> n36
  n125 --> n92
  n126 --> n23
  n127 --> n7
  n127 --> n21
  n127 --> n22
  n127 --> n23
  n128 --> n24
  n128 --> n25
  n128 --> n26
  n128 --> n27
  n128 --> n28
  n128 --> n29
  n128 --> n30
  n128 --> n31
  n128 --> n32
  n128 --> n33
  n128 --> n34
  n129 --> n35
  n130 --> n5
  n131 --> n2
  n131 --> n73
  n132 --> n38
  n132 --> n39
  n132 --> n40
  n132 --> n75
  n132 --> n76
  n132 --> n78
  n132 --> n84
  n132 --> n95
  n133 --> n35
  n134 --> n41
  n134 --> n43
  n134 --> n45
  n134 --> n46
  n134 --> n48
  n134 --> n82
  n134 --> n98
  n135 --> n7
  n135 --> n41
  n135 --> n42
  n135 --> n43
  n135 --> n45
  n135 --> n48
  n135 --> n75
  n135 --> n92
  n136 --> n49
  n136 --> n50
  n136 --> n51
  n136 --> n52
  n136 --> n53
  n136 --> n54
  n136 --> n55
  n136 --> n56
  n136 --> n57
  n136 --> n58
  n136 --> n59
  n137 --> n3
  n137 --> n4
  n137 --> n5
  n137 --> n7
  n137 --> n20
  n137 --> n65
  n137 --> n73
  n137 --> n77
  n137 --> n93
  n138 --> n7
  n138 --> n62
  n138 --> n63
  n138 --> n64
  n139 --> n65
  n139 --> n66
  n140 --> n67
  n140 --> n75
  n141 --> n67
  n142 --> n68
  n142 --> n69
  n142 --> n70
  n143 --> n71
  n144 --> n41
  n144 --> n45
  n144 --> n47
  n144 --> n48
  n145 --> n17
  n145 --> n46
  n145 --> n48
  n145 --> n72
  n145 --> n80
  n145 --> n82
  n145 --> n99
  n146 --> n49
  n146 --> n51
  n146 --> n52
  n146 --> n54
  n147 --> n2
  n147 --> n7
  n147 --> n36
  n147 --> n73
  n147 --> n92
  n147 --> n99
  n148 --> n6
  n148 --> n7
  n148 --> n8
  n148 --> n10
  n148 --> n35
  n148 --> n49
  n148 --> n50
  n148 --> n54
  n148 --> n56
  n148 --> n59
  n149 --> n0
  n149 --> n1
  n149 --> n3
  n149 --> n4
  n149 --> n6
  n149 --> n7
  n149 --> n8
  n149 --> n9
  n149 --> n10
  n149 --> n11
  n149 --> n12
  n149 --> n13
  n149 --> n14
  n149 --> n15
  n149 --> n16
  n149 --> n17
  n149 --> n18
  n149 --> n19
  n149 --> n20
  n149 --> n21
  n149 --> n22
  n149 --> n23
  n149 --> n24
  n149 --> n25
  n149 --> n26
  n149 --> n27
  n149 --> n28
  n149 --> n29
  n149 --> n30
  n149 --> n31
  n149 --> n32
  n149 --> n33
  n149 --> n34
  n149 --> n37
  n149 --> n38
  n149 --> n39
  n149 --> n42
  n149 --> n50
  n149 --> n51
  n149 --> n53
  n149 --> n54
  n149 --> n55
  n149 --> n57
  n149 --> n59
  n149 --> n60
  n149 --> n62
  n149 --> n63
  n149 --> n64
  n149 --> n66
  n149 --> n68
  n149 --> n69
  n149 --> n70
  n149 --> n71
  n149 --> n72
  n149 --> n73
  n149 --> n74
  n149 --> n75
  n149 --> n76
  n149 --> n79
  n149 --> n80
  n149 --> n81
  n149 --> n82
  n149 --> n83
  n149 --> n84
  n149 --> n85
  n149 --> n87
  n149 --> n88
  n149 --> n89
  n149 --> n90
  n149 --> n91
  n149 --> n92
  n149 --> n93
  n149 --> n94
  n149 --> n95
  n149 --> n96
  n149 --> n97
  n149 --> n98
  n150 --> n2
  n150 --> n9
  n150 --> n36
  n150 --> n75
  n150 --> n76
  n150 --> n77
  n150 --> n78
  n150 --> n79
  n150 --> n80
  n150 --> n81
  n150 --> n93
  n150 --> n94
  n150 --> n96
  n150 --> n97
  n150 --> n98
  n151 --> n82
  n152 --> n82
  n152 --> n83
  n153 --> n7
  n153 --> n21
  n153 --> n22
  n153 --> n74
  n153 --> n86
  n153 --> n87
  n153 --> n88
  n153 --> n89
  n153 --> n90
  n153 --> n91
  n154 --> n7
  n154 --> n73
  n154 --> n92
  n155 --> n7
  n155 --> n93
  n156 --> n49
  n156 --> n50
  n156 --> n52
  n156 --> n54
  n156 --> n58
  n157 --> n75
  n157 --> n92
  n158 --> n82
  n159 --> n12
  n159 --> n17
  n159 --> n21
  n159 --> n61
  n159 --> n95
  n160 --> n7
  n160 --> n37
  n160 --> n94
  n160 --> n96
  n160 --> n97
  n160 --> n98
  n161 --> n60
  n161 --> n61
  n161 --> n75
  n161 --> n85
  n162 --> n21
  n162 --> n64
  n162 --> n75
  n163 --> n36
  n163 --> n41
  n163 --> n45
  n163 --> n48
  n163 --> n75
  n164 --> n2
  n164 --> n3
  n164 --> n4
  n164 --> n5
  n164 --> n6
  n164 --> n8
  n164 --> n10
  n164 --> n36
  n164 --> n51
  n164 --> n59
  n164 --> n60
  n164 --> n72
  n164 --> n73
  n164 --> n92
  n164 --> n93
  n164 --> n99
  n165 --> n11
  n166 --> n12
  n166 --> n13
  n166 --> n14
  n166 --> n15
  n166 --> n16
  n166 --> n17
  n166 --> n44
  n167 --> n0
  n167 --> n1
  n167 --> n18
  n167 --> n19
  n168 --> n3
  n168 --> n4
  n168 --> n5
  n168 --> n65
  n168 --> n77
  n169 --> n21
  n169 --> n22
  n169 --> n23
  n169 --> n74
  n169 --> n90
  n170 --> n24
  n170 --> n25
  n170 --> n26
  n170 --> n27
  n170 --> n28
  n170 --> n29
  n170 --> n30
  n170 --> n31
  n170 --> n32
  n170 --> n33
  n170 --> n34
  n171 --> n38
  n171 --> n39
  n171 --> n40
  n171 --> n84
  n171 --> n95
  n172 --> n41
  n172 --> n45
  n172 --> n46
  n172 --> n82
  n172 --> n96
  n172 --> n98
  n173 --> n41
  n173 --> n42
  n173 --> n43
  n173 --> n44
  n173 --> n45
  n173 --> n47
  n173 --> n48
  n174 --> n40
  n174 --> n50
  n174 --> n51
  n174 --> n52
  n174 --> n53
  n174 --> n54
  n174 --> n55
  n174 --> n56
  n174 --> n57
  n174 --> n58
  n174 --> n59
  n175 --> n60
  n175 --> n61
  n176 --> n62
  n176 --> n63
  n176 --> n64
  n177 --> n65
  n177 --> n66
  n178 --> n73
  n179 --> n72
  n179 --> n73
  n180 --> n67
  n181 --> n68
  n181 --> n69
  n181 --> n70
  n182 --> n48
  n182 --> n72
  n182 --> n99
  n183 --> n35
  n184 --> n0
  n184 --> n93
  n185 --> n9
  n185 --> n75
  n185 --> n76
  n185 --> n77
  n185 --> n78
  n185 --> n79
  n185 --> n80
  n185 --> n81
  n186 --> n85
  n187 --> n74
  n187 --> n86
  n187 --> n87
  n187 --> n88
  n187 --> n89
  n187 --> n91
  n188 --> n92
  n189 --> n71
  n190 --> n20
  n191 --> n44
  n192 --> n82
  n192 --> n83
  n193 --> n37
  n193 --> n94
  n193 --> n96
  n193 --> n97
  n193 --> n98
```
