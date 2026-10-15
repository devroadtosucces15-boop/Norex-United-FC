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
  n80["API /api/hof/remove"]
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
  n137["tests/feedbackroom.test.mjs"]
  n138["tests/flags.test.mjs"]
  n139["tests/fun.test.mjs"]
  n140["tests/game.test.mjs"]
  n141["tests/honours.test.mjs"]
  n142["tests/hub.test.mjs"]
  n143["tests/lineuprec.test.mjs"]
  n144["tests/locker.test.mjs"]
  n145["tests/media.test.mjs"]
  n146["tests/memberlive.test.mjs"]
  n147["tests/members.test.mjs"]
  n148["tests/moderation.test.mjs"]
  n149["tests/next.test.mjs"]
  n150["tests/notify.test.mjs"]
  n151["tests/playmedia.test.mjs"]
  n152["tests/plays.test.mjs"]
  n153["tests/prefs.test.mjs"]
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
  n181["web/locker.js"]
  n182["web/messages.js"]
  n183["web/mystats.js"]
  n184["web/notify.js"]
  n185["web/probuilds.js"]
  n186["web/profile.js"]
  n187["web/settings.js"]
  n188["web/squads.js"]
  n189["web/tactics.js"]
  n190["web/trials.js"]
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
  n111 --> n80
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
  n126 --> n25
  n127 --> n7
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
  n130 --> n5
  n131 --> n2
  n131 --> n82
  n132 --> n40
  n132 --> n41
  n132 --> n42
  n132 --> n43
  n132 --> n44
  n132 --> n45
  n132 --> n46
  n132 --> n84
  n132 --> n85
  n132 --> n87
  n132 --> n94
  n132 --> n95
  n133 --> n37
  n134 --> n47
  n134 --> n49
  n134 --> n51
  n134 --> n52
  n134 --> n54
  n134 --> n89
  n134 --> n98
  n135 --> n7
  n135 --> n47
  n135 --> n48
  n135 --> n49
  n135 --> n51
  n135 --> n54
  n135 --> n84
  n135 --> n90
  n136 --> n55
  n136 --> n56
  n136 --> n57
  n136 --> n58
  n136 --> n60
  n136 --> n61
  n136 --> n62
  n136 --> n63
  n136 --> n64
  n136 --> n66
  n136 --> n67
  n137 --> n68
  n137 --> n69
  n137 --> n70
  n137 --> n71
  n137 --> n72
  n137 --> n73
  n137 --> n74
  n137 --> n75
  n138 --> n3
  n138 --> n4
  n138 --> n5
  n138 --> n7
  n138 --> n22
  n138 --> n79
  n138 --> n82
  n138 --> n86
  n138 --> n91
  n139 --> n90
  n140 --> n7
  n140 --> n76
  n140 --> n77
  n140 --> n78
  n141 --> n79
  n141 --> n80
  n142 --> n84
  n143 --> n47
  n143 --> n51
  n143 --> n53
  n143 --> n54
  n144 --> n19
  n144 --> n52
  n144 --> n54
  n144 --> n81
  n144 --> n88
  n144 --> n89
  n144 --> n99
  n145 --> n55
  n145 --> n57
  n145 --> n58
  n145 --> n59
  n145 --> n61
  n145 --> n65
  n146 --> n90
  n147 --> n2
  n147 --> n7
  n147 --> n10
  n147 --> n12
  n147 --> n38
  n147 --> n82
  n147 --> n90
  n147 --> n99
  n148 --> n6
  n148 --> n7
  n148 --> n8
  n148 --> n11
  n148 --> n37
  n148 --> n55
  n148 --> n56
  n148 --> n61
  n148 --> n63
  n148 --> n67
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
  n149 --> n35
  n149 --> n36
  n149 --> n39
  n149 --> n40
  n149 --> n41
  n149 --> n42
  n149 --> n44
  n149 --> n45
  n149 --> n46
  n149 --> n47
  n149 --> n48
  n149 --> n56
  n149 --> n57
  n149 --> n59
  n149 --> n60
  n149 --> n61
  n149 --> n62
  n149 --> n64
  n149 --> n65
  n149 --> n67
  n149 --> n70
  n149 --> n76
  n149 --> n77
  n149 --> n78
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
  n149 --> n93
  n149 --> n94
  n149 --> n95
  n149 --> n96
  n149 --> n97
  n149 --> n98
  n149 --> n99
  n150 --> n2
  n150 --> n9
  n150 --> n38
  n150 --> n84
  n150 --> n85
  n150 --> n86
  n150 --> n87
  n150 --> n88
  n150 --> n91
  n150 --> n92
  n150 --> n93
  n150 --> n96
  n150 --> n97
  n150 --> n98
  n151 --> n89
  n152 --> n89
  n153 --> n82
  n154 --> n7
  n154 --> n23
  n154 --> n24
  n154 --> n83
  n155 --> n7
  n155 --> n82
  n155 --> n90
  n156 --> n7
  n156 --> n91
  n156 --> n92
  n157 --> n55
  n157 --> n56
  n157 --> n58
  n157 --> n61
  n157 --> n66
  n158 --> n84
  n158 --> n90
  n159 --> n89
  n160 --> n14
  n160 --> n19
  n160 --> n23
  n160 --> n74
  n160 --> n94
  n161 --> n7
  n161 --> n39
  n161 --> n93
  n161 --> n96
  n161 --> n97
  n161 --> n98
  n162 --> n68
  n162 --> n69
  n162 --> n70
  n162 --> n71
  n162 --> n72
  n162 --> n73
  n162 --> n74
  n162 --> n75
  n162 --> n84
  n163 --> n23
  n163 --> n78
  n163 --> n84
  n164 --> n38
  n164 --> n47
  n164 --> n51
  n164 --> n54
  n164 --> n84
  n165 --> n2
  n165 --> n3
  n165 --> n4
  n165 --> n5
  n165 --> n6
  n165 --> n8
  n165 --> n10
  n165 --> n11
  n165 --> n12
  n165 --> n38
  n165 --> n57
  n165 --> n67
  n165 --> n70
  n165 --> n81
  n165 --> n82
  n165 --> n90
  n165 --> n91
  n165 --> n92
  n165 --> n99
  n166 --> n13
  n167 --> n14
  n167 --> n15
  n167 --> n16
  n167 --> n17
  n167 --> n18
  n167 --> n19
  n167 --> n50
  n168 --> n0
  n168 --> n1
  n168 --> n20
  n168 --> n21
  n169 --> n3
  n169 --> n4
  n169 --> n5
  n169 --> n79
  n169 --> n86
  n170 --> n23
  n170 --> n24
  n170 --> n25
  n170 --> n83
  n171 --> n26
  n171 --> n27
  n171 --> n28
  n171 --> n29
  n171 --> n30
  n171 --> n31
  n171 --> n32
  n171 --> n33
  n171 --> n34
  n171 --> n35
  n171 --> n36
  n172 --> n40
  n172 --> n41
  n172 --> n42
  n172 --> n43
  n172 --> n44
  n172 --> n45
  n172 --> n46
  n172 --> n94
  n172 --> n95
  n173 --> n47
  n173 --> n51
  n173 --> n52
  n173 --> n89
  n173 --> n96
  n173 --> n98
  n174 --> n47
  n174 --> n48
  n174 --> n49
  n174 --> n50
  n174 --> n51
  n174 --> n53
  n174 --> n54
  n175 --> n43
  n175 --> n56
  n175 --> n57
  n175 --> n58
  n175 --> n59
  n175 --> n60
  n175 --> n61
  n175 --> n62
  n175 --> n63
  n175 --> n64
  n175 --> n65
  n175 --> n66
  n175 --> n67
  n176 --> n68
  n176 --> n69
  n176 --> n70
  n176 --> n71
  n176 --> n72
  n176 --> n73
  n176 --> n74
  n176 --> n75
  n177 --> n76
  n177 --> n77
  n177 --> n78
  n178 --> n79
  n178 --> n80
  n179 --> n82
  n180 --> n81
  n180 --> n82
  n181 --> n54
  n181 --> n81
  n181 --> n99
  n182 --> n37
  n183 --> n0
  n183 --> n91
  n184 --> n9
  n184 --> n84
  n184 --> n85
  n184 --> n86
  n184 --> n87
  n184 --> n88
  n185 --> n83
  n186 --> n90
  n187 --> n22
  n188 --> n50
  n189 --> n89
  n190 --> n39
  n190 --> n93
  n190 --> n96
  n190 --> n97
  n190 --> n98
```
