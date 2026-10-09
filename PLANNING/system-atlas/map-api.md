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
  n30["API /api/cards/request"]
  n31["API /api/cards/request/cancel"]
  n32["API /api/cards/requests"]
  n33["API /api/cards/requests/decide"]
  n34["API /api/cards/requests/retry"]
  n35["API /api/cards/requests/review"]
  n36["API /api/cards/templates"]
  n37["API /api/cards/templates/update"]
  n38["API /api/chats"]
  n39["API /api/claim"]
  n40["API /api/contacts"]
  n41["API /api/crawl"]
  n42["API /api/docs"]
  n43["API /api/docs/ack"]
  n44["API /api/docs/acks"]
  n45["API /api/docs/discord"]
  n46["API /api/docs/remind"]
  n47["API /api/docs/remove"]
  n48["API /api/docs/restore"]
  n49["API /api/events"]
  n50["API /api/events/cancel"]
  n51["API /api/events/checkin"]
  n52["API /api/events/discord"]
  n53["API /api/events/lineup"]
  n54["API /api/events/nudge"]
  n55["API /api/events/plays"]
  n56["API /api/events/recommend"]
  n57["API /api/events/report/post"]
  n58["API /api/events/rsvp"]
  n59["API /api/events/templates"]
  n60["API /api/feed"]
  n61["API /api/feed/comment"]
  n62["API /api/feed/delete"]
  n63["API /api/feed/edit"]
  n64["API /api/feed/media/delete"]
  n65["API /api/feed/pin"]
  n66["API /api/feed/post"]
  n67["API /api/feed/react"]
  n68["API /api/feed/report"]
  n69["API /api/feed/setpublic"]
  n70["API /api/feed/share"]
  n71["API /api/feed/uncomment"]
  n72["API /api/feed/unreport"]
  n73["API /api/feedback/hide"]
  n74["API /api/feedback/send"]
  n75["API /api/game/publish"]
  n76["API /api/hof"]
  n77["API /api/hub/wave"]
  n78["API /api/locker"]
  n79["API /api/me"]
  n80["API /api/mybuild"]
  n81["API /api/notify"]
  n82["API /api/notify/ack"]
  n83["API /api/notify/announce"]
  n84["API /api/notify/count"]
  n85["API /api/notify/read"]
  n86["API /api/plays"]
  n87["API /api/probuilds"]
  n88["API /api/profile"]
  n89["API /api/ratings/rate"]
  n90["API /api/rush"]
  n91["API /api/rush/decide"]
  n92["API /api/rush/queue"]
  n93["API /api/scout"]
  n94["API /api/suggestions"]
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
  n115["bot/media.js"]
  n116["bot/members.js"]
  n117["bot/notify.js"]
  n118["bot/plays.js"]
  n119["bot/probuilds.js"]
  n120["bot/ratings.js"]
  n121["bot/settings.js"]
  n122["bot/trials.js"]
  n123["tests/avatarcard.test.mjs"]
  n124["tests/awards.test.mjs"]
  n125["tests/badges.test.mjs"]
  n126["tests/builder.test.mjs"]
  n127["tests/builds.test.mjs"]
  n128["tests/cardstudio.test.mjs"]
  n129["tests/chat.test.mjs"]
  n130["tests/clublookup.test.mjs"]
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
  n143["tests/lineuprec.test.mjs"]
  n144["tests/locker.test.mjs"]
  n145["tests/media.test.mjs"]
  n146["tests/members.test.mjs"]
  n147["tests/moderation.test.mjs"]
  n148["tests/notify.test.mjs"]
  n149["tests/playmedia.test.mjs"]
  n150["tests/plays.test.mjs"]
  n151["tests/probuilds.test.mjs"]
  n152["tests/profiles.test.mjs"]
  n153["tests/rush.test.mjs"]
  n154["tests/social.test.mjs"]
  n155["tests/squads.test.mjs"]
  n156["tests/studio.test.mjs"]
  n157["tests/submissions.test.mjs"]
  n158["tests/trials.test.mjs"]
  n159["tests/wave10.test.mjs"]
  n160["tests/wave11.test.mjs"]
  n161["tests/wave8.test.mjs"]
  n162["web/app.js"]
  n163["web/avatarcard.js"]
  n164["web/awards.js"]
  n165["web/badges.js"]
  n166["web/boardroom.js"]
  n167["web/builder.js"]
  n168["web/cardstudio.js"]
  n169["web/docs.js"]
  n170["web/dugout.js"]
  n171["web/events.js"]
  n172["web/feed.js"]
  n173["web/feedback.js"]
  n174["web/game.js"]
  n175["web/honours.js"]
  n176["web/hub.js"]
  n177["web/hubgold.js"]
  n178["web/hublive.js"]
  n179["web/locker.js"]
  n180["web/messages.js"]
  n181["web/mystats.js"]
  n182["web/notify.js"]
  n183["web/probuilds.js"]
  n184["web/profile.js"]
  n185["web/ratings.js"]
  n186["web/settings.js"]
  n187["web/squads.js"]
  n188["web/tactics.js"]
  n189["web/trials.js"]
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
  n102 --> n74
  n102 --> n83
  n102 --> n94
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
  n105 --> n38
  n106 --> n42
  n106 --> n43
  n106 --> n44
  n106 --> n45
  n106 --> n46
  n106 --> n47
  n106 --> n48
  n106 --> n94
  n107 --> n49
  n107 --> n50
  n107 --> n51
  n107 --> n52
  n107 --> n53
  n107 --> n54
  n107 --> n55
  n107 --> n56
  n107 --> n57
  n107 --> n58
  n107 --> n59
  n108 --> n60
  n108 --> n61
  n108 --> n62
  n108 --> n63
  n108 --> n65
  n108 --> n66
  n108 --> n67
  n108 --> n68
  n108 --> n69
  n108 --> n70
  n108 --> n71
  n108 --> n72
  n109 --> n73
  n109 --> n74
  n110 --> n75
  n111 --> n76
  n112 --> n77
  n113 --> n56
  n114 --> n78
  n115 --> n64
  n116 --> n3
  n116 --> n4
  n116 --> n5
  n116 --> n6
  n116 --> n7
  n116 --> n8
  n116 --> n9
  n116 --> n12
  n116 --> n13
  n116 --> n14
  n116 --> n15
  n116 --> n30
  n116 --> n39
  n116 --> n40
  n116 --> n41
  n116 --> n42
  n116 --> n76
  n116 --> n79
  n116 --> n87
  n116 --> n88
  n116 --> n90
  n116 --> n91
  n116 --> n92
  n116 --> n97
  n116 --> n99
  n117 --> n10
  n117 --> n11
  n117 --> n81
  n117 --> n82
  n117 --> n83
  n117 --> n84
  n117 --> n85
  n118 --> n86
  n119 --> n80
  n119 --> n87
  n120 --> n89
  n121 --> n25
  n122 --> n93
  n122 --> n95
  n122 --> n96
  n122 --> n98
  n123 --> n15
  n124 --> n16
  n124 --> n17
  n124 --> n18
  n124 --> n19
  n124 --> n20
  n124 --> n21
  n124 --> n22
  n124 --> n81
  n125 --> n0
  n125 --> n1
  n125 --> n2
  n125 --> n3
  n125 --> n23
  n125 --> n24
  n125 --> n39
  n125 --> n88
  n126 --> n28
  n127 --> n8
  n127 --> n26
  n127 --> n27
  n127 --> n28
  n128 --> n30
  n128 --> n31
  n128 --> n32
  n128 --> n33
  n128 --> n34
  n128 --> n35
  n128 --> n36
  n128 --> n37
  n129 --> n38
  n130 --> n41
  n131 --> n6
  n131 --> n41
  n132 --> n3
  n132 --> n79
  n133 --> n42
  n133 --> n43
  n133 --> n44
  n133 --> n45
  n133 --> n46
  n133 --> n47
  n133 --> n48
  n133 --> n81
  n133 --> n82
  n133 --> n84
  n133 --> n94
  n134 --> n38
  n135 --> n49
  n135 --> n51
  n135 --> n53
  n135 --> n55
  n135 --> n58
  n135 --> n86
  n135 --> n98
  n136 --> n8
  n136 --> n49
  n136 --> n50
  n136 --> n51
  n136 --> n53
  n136 --> n54
  n136 --> n57
  n136 --> n58
  n136 --> n81
  n136 --> n88
  n137 --> n60
  n137 --> n61
  n137 --> n62
  n137 --> n63
  n137 --> n65
  n137 --> n66
  n137 --> n67
  n137 --> n68
  n137 --> n69
  n137 --> n70
  n137 --> n71
  n137 --> n72
  n138 --> n4
  n138 --> n5
  n138 --> n6
  n138 --> n8
  n138 --> n25
  n138 --> n76
  n138 --> n79
  n138 --> n83
  n138 --> n90
  n138 --> n92
  n139 --> n8
  n139 --> n75
  n140 --> n76
  n141 --> n77
  n141 --> n81
  n142 --> n77
  n143 --> n49
  n143 --> n53
  n143 --> n56
  n143 --> n58
  n144 --> n22
  n144 --> n55
  n144 --> n58
  n144 --> n78
  n144 --> n85
  n144 --> n86
  n144 --> n99
  n145 --> n60
  n145 --> n62
  n145 --> n63
  n145 --> n64
  n145 --> n66
  n146 --> n3
  n146 --> n8
  n146 --> n12
  n146 --> n14
  n146 --> n39
  n146 --> n79
  n146 --> n88
  n146 --> n99
  n147 --> n7
  n147 --> n8
  n147 --> n9
  n147 --> n13
  n147 --> n38
  n147 --> n60
  n147 --> n61
  n147 --> n66
  n147 --> n68
  n147 --> n72
  n148 --> n3
  n148 --> n10
  n148 --> n11
  n148 --> n39
  n148 --> n81
  n148 --> n82
  n148 --> n83
  n148 --> n84
  n148 --> n85
  n148 --> n90
  n148 --> n91
  n148 --> n93
  n148 --> n95
  n148 --> n96
  n148 --> n97
  n148 --> n98
  n149 --> n86
  n150 --> n86
  n151 --> n8
  n151 --> n26
  n151 --> n27
  n151 --> n80
  n151 --> n87
  n152 --> n8
  n152 --> n79
  n152 --> n88
  n153 --> n8
  n153 --> n90
  n153 --> n91
  n153 --> n92
  n154 --> n60
  n154 --> n61
  n154 --> n63
  n154 --> n66
  n154 --> n71
  n155 --> n81
  n155 --> n88
  n156 --> n86
  n157 --> n16
  n157 --> n22
  n157 --> n26
  n157 --> n74
  n157 --> n89
  n157 --> n94
  n158 --> n8
  n158 --> n40
  n158 --> n93
  n158 --> n95
  n158 --> n96
  n158 --> n97
  n158 --> n98
  n159 --> n73
  n159 --> n74
  n159 --> n81
  n159 --> n89
  n160 --> n26
  n160 --> n29
  n160 --> n75
  n160 --> n81
  n161 --> n39
  n161 --> n49
  n161 --> n53
  n161 --> n58
  n161 --> n59
  n161 --> n81
  n162 --> n3
  n162 --> n4
  n162 --> n5
  n162 --> n6
  n162 --> n7
  n162 --> n8
  n162 --> n9
  n162 --> n12
  n162 --> n13
  n162 --> n14
  n162 --> n39
  n162 --> n62
  n162 --> n72
  n162 --> n73
  n162 --> n78
  n162 --> n79
  n162 --> n88
  n162 --> n90
  n162 --> n91
  n162 --> n92
  n162 --> n99
  n163 --> n15
  n164 --> n16
  n164 --> n17
  n164 --> n18
  n164 --> n19
  n164 --> n20
  n164 --> n21
  n164 --> n22
  n164 --> n52
  n165 --> n0
  n165 --> n1
  n165 --> n2
  n165 --> n23
  n165 --> n24
  n166 --> n4
  n166 --> n5
  n166 --> n6
  n166 --> n76
  n166 --> n83
  n167 --> n26
  n167 --> n27
  n167 --> n28
  n167 --> n29
  n167 --> n80
  n168 --> n30
  n168 --> n31
  n168 --> n32
  n168 --> n33
  n168 --> n34
  n168 --> n35
  n168 --> n36
  n168 --> n37
  n169 --> n42
  n169 --> n43
  n169 --> n44
  n169 --> n45
  n169 --> n46
  n169 --> n47
  n169 --> n48
  n169 --> n94
  n170 --> n49
  n170 --> n53
  n170 --> n55
  n170 --> n86
  n170 --> n95
  n170 --> n98
  n171 --> n49
  n171 --> n50
  n171 --> n51
  n171 --> n52
  n171 --> n53
  n171 --> n54
  n171 --> n56
  n171 --> n57
  n171 --> n58
  n171 --> n59
  n172 --> n45
  n172 --> n61
  n172 --> n62
  n172 --> n63
  n172 --> n64
  n172 --> n65
  n172 --> n66
  n172 --> n67
  n172 --> n68
  n172 --> n69
  n172 --> n70
  n172 --> n71
  n172 --> n72
  n173 --> n73
  n173 --> n74
  n174 --> n75
  n175 --> n76
  n176 --> n79
  n177 --> n78
  n177 --> n79
  n178 --> n77
  n179 --> n58
  n179 --> n78
  n179 --> n99
  n180 --> n38
  n181 --> n0
  n181 --> n90
  n182 --> n10
  n182 --> n11
  n182 --> n81
  n182 --> n82
  n182 --> n83
  n182 --> n84
  n182 --> n85
  n183 --> n80
  n183 --> n87
  n184 --> n88
  n185 --> n89
  n186 --> n25
  n187 --> n52
  n188 --> n86
  n189 --> n40
  n189 --> n93
  n189 --> n95
  n189 --> n96
  n189 --> n97
  n189 --> n98
```
