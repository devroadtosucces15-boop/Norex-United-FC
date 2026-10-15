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
  n126["tests/botfeat-sample.mjs"]
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
  n138["tests/feedbackroom.test.mjs"]
  n139["tests/flags.test.mjs"]
  n140["tests/fun.test.mjs"]
  n141["tests/game.test.mjs"]
  n142["tests/honours.test.mjs"]
  n143["tests/hub.test.mjs"]
  n144["tests/lineuprec.test.mjs"]
  n145["tests/locker.test.mjs"]
  n146["tests/media.test.mjs"]
  n147["tests/memberlive.test.mjs"]
  n148["tests/members.test.mjs"]
  n149["tests/moderation.test.mjs"]
  n150["tests/next.test.mjs"]
  n151["tests/notify.test.mjs"]
  n152["tests/playmedia.test.mjs"]
  n153["tests/plays.test.mjs"]
  n154["tests/prefs.test.mjs"]
  n155["tests/probuilds.test.mjs"]
  n156["tests/profiles.test.mjs"]
  n157["tests/rush.test.mjs"]
  n158["tests/social.test.mjs"]
  n159["tests/squads.test.mjs"]
  n160["tests/studio.test.mjs"]
  n161["tests/submissions.test.mjs"]
  n162["tests/trials.test.mjs"]
  n163["tests/wave10.test.mjs"]
  n164["tests/wave11.test.mjs"]
  n165["tests/wave8.test.mjs"]
  n166["web/app.js"]
  n167["web/avatarcard.js"]
  n168["web/awards.js"]
  n169["web/badges.js"]
  n170["web/boardroom.js"]
  n171["web/builder.js"]
  n172["web/cardstudio.js"]
  n173["web/docs.js"]
  n174["web/dugout.js"]
  n175["web/events.js"]
  n176["web/feed.js"]
  n177["web/feedback.js"]
  n178["web/game.js"]
  n179["web/honours.js"]
  n180["web/hub.js"]
  n181["web/hubgold.js"]
  n182["web/locker.js"]
  n183["web/messages.js"]
  n184["web/mystats.js"]
  n185["web/notify.js"]
  n186["web/probuilds.js"]
  n187["web/profile.js"]
  n188["web/settings.js"]
  n189["web/squads.js"]
  n190["web/tactics.js"]
  n191["web/trials.js"]
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
  n132 --> n2
  n132 --> n82
  n133 --> n40
  n133 --> n41
  n133 --> n42
  n133 --> n43
  n133 --> n44
  n133 --> n45
  n133 --> n46
  n133 --> n84
  n133 --> n85
  n133 --> n87
  n133 --> n94
  n133 --> n95
  n134 --> n37
  n135 --> n47
  n135 --> n49
  n135 --> n51
  n135 --> n52
  n135 --> n54
  n135 --> n89
  n135 --> n98
  n136 --> n7
  n136 --> n47
  n136 --> n48
  n136 --> n49
  n136 --> n51
  n136 --> n54
  n136 --> n84
  n136 --> n90
  n137 --> n55
  n137 --> n56
  n137 --> n57
  n137 --> n58
  n137 --> n60
  n137 --> n61
  n137 --> n62
  n137 --> n63
  n137 --> n64
  n137 --> n66
  n137 --> n67
  n138 --> n68
  n138 --> n69
  n138 --> n70
  n138 --> n71
  n138 --> n72
  n138 --> n73
  n138 --> n74
  n138 --> n75
  n139 --> n3
  n139 --> n4
  n139 --> n5
  n139 --> n7
  n139 --> n22
  n139 --> n79
  n139 --> n82
  n139 --> n86
  n139 --> n91
  n140 --> n90
  n141 --> n7
  n141 --> n76
  n141 --> n77
  n141 --> n78
  n142 --> n79
  n142 --> n80
  n143 --> n84
  n144 --> n47
  n144 --> n51
  n144 --> n53
  n144 --> n54
  n145 --> n19
  n145 --> n52
  n145 --> n54
  n145 --> n81
  n145 --> n88
  n145 --> n89
  n145 --> n99
  n146 --> n55
  n146 --> n57
  n146 --> n58
  n146 --> n59
  n146 --> n61
  n146 --> n65
  n147 --> n90
  n148 --> n2
  n148 --> n7
  n148 --> n10
  n148 --> n12
  n148 --> n38
  n148 --> n82
  n148 --> n90
  n148 --> n99
  n149 --> n6
  n149 --> n7
  n149 --> n8
  n149 --> n11
  n149 --> n37
  n149 --> n55
  n149 --> n56
  n149 --> n61
  n149 --> n63
  n149 --> n67
  n150 --> n0
  n150 --> n1
  n150 --> n3
  n150 --> n4
  n150 --> n6
  n150 --> n7
  n150 --> n8
  n150 --> n9
  n150 --> n10
  n150 --> n11
  n150 --> n12
  n150 --> n13
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
  n150 --> n33
  n150 --> n34
  n150 --> n35
  n150 --> n36
  n150 --> n39
  n150 --> n40
  n150 --> n41
  n150 --> n42
  n150 --> n44
  n150 --> n45
  n150 --> n46
  n150 --> n47
  n150 --> n48
  n150 --> n56
  n150 --> n57
  n150 --> n59
  n150 --> n60
  n150 --> n61
  n150 --> n62
  n150 --> n64
  n150 --> n65
  n150 --> n67
  n150 --> n70
  n150 --> n76
  n150 --> n77
  n150 --> n78
  n150 --> n80
  n150 --> n81
  n150 --> n82
  n150 --> n83
  n150 --> n84
  n150 --> n85
  n150 --> n87
  n150 --> n88
  n150 --> n89
  n150 --> n90
  n150 --> n91
  n150 --> n93
  n150 --> n94
  n150 --> n95
  n150 --> n96
  n150 --> n97
  n150 --> n98
  n150 --> n99
  n151 --> n2
  n151 --> n9
  n151 --> n38
  n151 --> n84
  n151 --> n85
  n151 --> n86
  n151 --> n87
  n151 --> n88
  n151 --> n91
  n151 --> n92
  n151 --> n93
  n151 --> n96
  n151 --> n97
  n151 --> n98
  n152 --> n89
  n153 --> n89
  n154 --> n82
  n155 --> n7
  n155 --> n23
  n155 --> n24
  n155 --> n83
  n156 --> n7
  n156 --> n82
  n156 --> n90
  n157 --> n7
  n157 --> n91
  n157 --> n92
  n158 --> n55
  n158 --> n56
  n158 --> n58
  n158 --> n61
  n158 --> n66
  n159 --> n84
  n159 --> n90
  n160 --> n89
  n161 --> n14
  n161 --> n19
  n161 --> n23
  n161 --> n74
  n161 --> n94
  n162 --> n7
  n162 --> n39
  n162 --> n93
  n162 --> n96
  n162 --> n97
  n162 --> n98
  n163 --> n68
  n163 --> n69
  n163 --> n70
  n163 --> n71
  n163 --> n72
  n163 --> n73
  n163 --> n74
  n163 --> n75
  n163 --> n84
  n164 --> n23
  n164 --> n78
  n164 --> n84
  n165 --> n38
  n165 --> n47
  n165 --> n51
  n165 --> n54
  n165 --> n84
  n166 --> n2
  n166 --> n3
  n166 --> n4
  n166 --> n5
  n166 --> n6
  n166 --> n8
  n166 --> n10
  n166 --> n11
  n166 --> n12
  n166 --> n38
  n166 --> n57
  n166 --> n67
  n166 --> n70
  n166 --> n81
  n166 --> n82
  n166 --> n90
  n166 --> n91
  n166 --> n92
  n166 --> n99
  n167 --> n13
  n168 --> n14
  n168 --> n15
  n168 --> n16
  n168 --> n17
  n168 --> n18
  n168 --> n19
  n168 --> n50
  n169 --> n0
  n169 --> n1
  n169 --> n20
  n169 --> n21
  n170 --> n3
  n170 --> n4
  n170 --> n5
  n170 --> n79
  n170 --> n86
  n171 --> n23
  n171 --> n24
  n171 --> n25
  n171 --> n83
  n172 --> n26
  n172 --> n27
  n172 --> n28
  n172 --> n29
  n172 --> n30
  n172 --> n31
  n172 --> n32
  n172 --> n33
  n172 --> n34
  n172 --> n35
  n172 --> n36
  n173 --> n40
  n173 --> n41
  n173 --> n42
  n173 --> n43
  n173 --> n44
  n173 --> n45
  n173 --> n46
  n173 --> n94
  n173 --> n95
  n174 --> n47
  n174 --> n51
  n174 --> n52
  n174 --> n89
  n174 --> n96
  n174 --> n98
  n175 --> n47
  n175 --> n48
  n175 --> n49
  n175 --> n50
  n175 --> n51
  n175 --> n53
  n175 --> n54
  n176 --> n43
  n176 --> n56
  n176 --> n57
  n176 --> n58
  n176 --> n59
  n176 --> n60
  n176 --> n61
  n176 --> n62
  n176 --> n63
  n176 --> n64
  n176 --> n65
  n176 --> n66
  n176 --> n67
  n177 --> n68
  n177 --> n69
  n177 --> n70
  n177 --> n71
  n177 --> n72
  n177 --> n73
  n177 --> n74
  n177 --> n75
  n178 --> n76
  n178 --> n77
  n178 --> n78
  n179 --> n79
  n179 --> n80
  n180 --> n82
  n181 --> n81
  n181 --> n82
  n182 --> n54
  n182 --> n81
  n182 --> n99
  n183 --> n37
  n184 --> n0
  n184 --> n91
  n185 --> n9
  n185 --> n84
  n185 --> n85
  n185 --> n86
  n185 --> n87
  n185 --> n88
  n186 --> n83
  n187 --> n90
  n188 --> n22
  n189 --> n50
  n190 --> n89
  n191 --> n39
  n191 --> n93
  n191 --> n96
  n191 --> n97
  n191 --> n98
```
