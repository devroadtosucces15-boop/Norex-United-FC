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
  n68["API /api/feedback/hide"]
  n69["API /api/feedback/send"]
  n70["API /api/game/admin"]
  n71["API /api/game/dismiss"]
  n72["API /api/game/publish"]
  n73["API /api/hof"]
  n74["API /api/hof/remove"]
  n75["API /api/hub"]
  n76["API /api/hub/wave"]
  n77["API /api/intel"]
  n78["API /api/intel/act"]
  n79["API /api/intel/remind"]
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
  n113["bot/hub.js"]
  n114["bot/insights.js"]
  n115["bot/lineuprec.js"]
  n116["bot/locker.js"]
  n117["bot/media.js"]
  n118["bot/members.js"]
  n119["bot/notify.js"]
  n120["bot/panel.js"]
  n121["bot/plays.js"]
  n122["bot/probuilds.js"]
  n123["bot/settings.js"]
  n124["bot/trials.js"]
  n125["tests/avatarcard.test.mjs"]
  n126["tests/awards.test.mjs"]
  n127["tests/badges.test.mjs"]
  n128["tests/builder.test.mjs"]
  n129["tests/builds.test.mjs"]
  n130["tests/cardstudio.test.mjs"]
  n131["tests/chat.test.mjs"]
  n132["tests/crawl.test.mjs"]
  n133["tests/discord.test.mjs"]
  n134["tests/docs.test.mjs"]
  n135["tests/drilldown.test.mjs"]
  n136["tests/dugout.test.mjs"]
  n137["tests/events.test.mjs"]
  n138["tests/feed.test.mjs"]
  n139["tests/flags.test.mjs"]
  n140["tests/fun.test.mjs"]
  n141["tests/game.test.mjs"]
  n142["tests/honours.test.mjs"]
  n143["tests/hub.test.mjs"]
  n144["tests/hublive.test.mjs"]
  n145["tests/intel.test.mjs"]
  n146["tests/issues.test.mjs"]
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
  n157["tests/probuilds.test.mjs"]
  n158["tests/profiles.test.mjs"]
  n159["tests/rush.test.mjs"]
  n160["tests/social.test.mjs"]
  n161["tests/squads.test.mjs"]
  n162["tests/studio.test.mjs"]
  n163["tests/submissions.test.mjs"]
  n164["tests/trials.test.mjs"]
  n165["tests/wave10.test.mjs"]
  n166["tests/wave11.test.mjs"]
  n167["tests/wave8.test.mjs"]
  n168["web/app.js"]
  n169["web/avatarcard.js"]
  n170["web/awards.js"]
  n171["web/badges.js"]
  n172["web/boardroom.js"]
  n173["web/builder.js"]
  n174["web/cardstudio.js"]
  n175["web/docs.js"]
  n176["web/dugout.js"]
  n177["web/events.js"]
  n178["web/feed.js"]
  n179["web/feedback.js"]
  n180["web/game.js"]
  n181["web/honours.js"]
  n182["web/hub.js"]
  n183["web/hubgold.js"]
  n184["web/hublive.js"]
  n185["web/intel.js"]
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
  n102 --> n69
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
  n110 --> n70
  n110 --> n71
  n110 --> n72
  n111 --> n73
  n111 --> n74
  n112 --> n47
  n113 --> n75
  n113 --> n76
  n114 --> n77
  n114 --> n78
  n114 --> n79
  n115 --> n53
  n116 --> n81
  n117 --> n59
  n117 --> n65
  n118 --> n2
  n118 --> n3
  n118 --> n4
  n118 --> n5
  n118 --> n6
  n118 --> n7
  n118 --> n8
  n118 --> n10
  n118 --> n11
  n118 --> n12
  n118 --> n13
  n118 --> n29
  n118 --> n38
  n118 --> n39
  n118 --> n40
  n118 --> n73
  n118 --> n80
  n118 --> n82
  n118 --> n90
  n118 --> n91
  n118 --> n92
  n118 --> n97
  n118 --> n99
  n119 --> n9
  n119 --> n84
  n119 --> n85
  n119 --> n86
  n119 --> n87
  n119 --> n88
  n120 --> n2
  n120 --> n8
  n120 --> n9
  n120 --> n32
  n120 --> n92
  n120 --> n95
  n121 --> n89
  n122 --> n83
  n123 --> n22
  n124 --> n93
  n124 --> n96
  n124 --> n98
  n125 --> n13
  n126 --> n14
  n126 --> n15
  n126 --> n16
  n126 --> n17
  n126 --> n18
  n126 --> n19
  n126 --> n84
  n127 --> n0
  n127 --> n1
  n127 --> n2
  n127 --> n20
  n127 --> n21
  n127 --> n38
  n127 --> n90
  n128 --> n25
  n129 --> n7
  n129 --> n23
  n129 --> n24
  n129 --> n25
  n130 --> n26
  n130 --> n27
  n130 --> n28
  n130 --> n29
  n130 --> n30
  n130 --> n31
  n130 --> n32
  n130 --> n33
  n130 --> n34
  n130 --> n35
  n130 --> n36
  n131 --> n37
  n132 --> n5
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
  n139 --> n3
  n139 --> n4
  n139 --> n5
  n139 --> n7
  n139 --> n22
  n139 --> n73
  n139 --> n82
  n139 --> n86
  n139 --> n91
  n140 --> n90
  n141 --> n7
  n141 --> n70
  n141 --> n71
  n141 --> n72
  n142 --> n73
  n142 --> n74
  n143 --> n75
  n143 --> n76
  n143 --> n84
  n144 --> n76
  n145 --> n77
  n145 --> n78
  n145 --> n79
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
  n153 --> n68
  n153 --> n70
  n153 --> n71
  n153 --> n72
  n153 --> n74
  n153 --> n75
  n153 --> n77
  n153 --> n78
  n153 --> n79
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
  n157 --> n7
  n157 --> n23
  n157 --> n24
  n157 --> n83
  n158 --> n7
  n158 --> n82
  n158 --> n90
  n159 --> n7
  n159 --> n91
  n159 --> n92
  n160 --> n55
  n160 --> n56
  n160 --> n58
  n160 --> n61
  n160 --> n66
  n161 --> n84
  n161 --> n90
  n162 --> n89
  n163 --> n14
  n163 --> n19
  n163 --> n23
  n163 --> n69
  n163 --> n94
  n164 --> n7
  n164 --> n39
  n164 --> n93
  n164 --> n96
  n164 --> n97
  n164 --> n98
  n165 --> n68
  n165 --> n69
  n165 --> n84
  n166 --> n23
  n166 --> n72
  n166 --> n84
  n167 --> n38
  n167 --> n47
  n167 --> n51
  n167 --> n54
  n167 --> n84
  n168 --> n2
  n168 --> n3
  n168 --> n4
  n168 --> n5
  n168 --> n6
  n168 --> n8
  n168 --> n10
  n168 --> n11
  n168 --> n12
  n168 --> n38
  n168 --> n57
  n168 --> n67
  n168 --> n68
  n168 --> n81
  n168 --> n82
  n168 --> n90
  n168 --> n91
  n168 --> n92
  n168 --> n99
  n169 --> n13
  n170 --> n14
  n170 --> n15
  n170 --> n16
  n170 --> n17
  n170 --> n18
  n170 --> n19
  n170 --> n50
  n171 --> n0
  n171 --> n1
  n171 --> n20
  n171 --> n21
  n172 --> n3
  n172 --> n4
  n172 --> n5
  n172 --> n73
  n172 --> n86
  n173 --> n23
  n173 --> n24
  n173 --> n25
  n173 --> n83
  n174 --> n26
  n174 --> n27
  n174 --> n28
  n174 --> n29
  n174 --> n30
  n174 --> n31
  n174 --> n32
  n174 --> n33
  n174 --> n34
  n174 --> n35
  n174 --> n36
  n175 --> n40
  n175 --> n41
  n175 --> n42
  n175 --> n43
  n175 --> n44
  n175 --> n45
  n175 --> n46
  n175 --> n94
  n175 --> n95
  n176 --> n47
  n176 --> n51
  n176 --> n52
  n176 --> n89
  n176 --> n96
  n176 --> n98
  n177 --> n47
  n177 --> n48
  n177 --> n49
  n177 --> n50
  n177 --> n51
  n177 --> n53
  n177 --> n54
  n178 --> n43
  n178 --> n56
  n178 --> n57
  n178 --> n58
  n178 --> n59
  n178 --> n60
  n178 --> n61
  n178 --> n62
  n178 --> n63
  n178 --> n64
  n178 --> n65
  n178 --> n66
  n178 --> n67
  n179 --> n68
  n179 --> n69
  n180 --> n70
  n180 --> n71
  n180 --> n72
  n181 --> n73
  n181 --> n74
  n182 --> n75
  n182 --> n82
  n183 --> n81
  n183 --> n82
  n184 --> n76
  n185 --> n77
  n185 --> n78
  n185 --> n79
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
