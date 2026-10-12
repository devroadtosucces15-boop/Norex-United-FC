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
  n88["API /api/notify/prefs"]
  n89["API /api/notify/read"]
  n90["API /api/notify/test"]
  n91["API /api/plays"]
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
  n116["bot/media.js"]
  n117["bot/members.js"]
  n118["bot/notify.js"]
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
  n186["web/probuilds.js"]
  n187["web/profile.js"]
  n188["web/report.js"]
  n189["web/settings.js"]
  n190["web/squads.js"]
  n191["web/tactics.js"]
  n192["web/trials.js"]
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
  n102 --> n95
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
  n112 --> n75
  n112 --> n76
  n113 --> n77
  n113 --> n78
  n113 --> n79
  n114 --> n53
  n115 --> n81
  n116 --> n59
  n116 --> n65
  n117 --> n2
  n117 --> n3
  n117 --> n4
  n117 --> n5
  n117 --> n6
  n117 --> n7
  n117 --> n8
  n117 --> n10
  n117 --> n11
  n117 --> n12
  n117 --> n13
  n117 --> n29
  n117 --> n38
  n117 --> n39
  n117 --> n40
  n117 --> n73
  n117 --> n80
  n117 --> n82
  n117 --> n92
  n117 --> n93
  n117 --> n97
  n117 --> n99
  n118 --> n9
  n118 --> n84
  n118 --> n85
  n118 --> n86
  n118 --> n87
  n118 --> n88
  n118 --> n89
  n118 --> n90
  n119 --> n91
  n120 --> n83
  n121 --> n22
  n122 --> n94
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
  n125 --> n92
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
  n132 --> n95
  n133 --> n37
  n134 --> n47
  n134 --> n49
  n134 --> n51
  n134 --> n52
  n134 --> n54
  n134 --> n91
  n134 --> n98
  n135 --> n7
  n135 --> n47
  n135 --> n48
  n135 --> n49
  n135 --> n51
  n135 --> n54
  n135 --> n84
  n135 --> n92
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
  n137 --> n3
  n137 --> n4
  n137 --> n5
  n137 --> n7
  n137 --> n22
  n137 --> n73
  n137 --> n82
  n137 --> n86
  n137 --> n93
  n138 --> n7
  n138 --> n70
  n138 --> n71
  n138 --> n72
  n139 --> n73
  n139 --> n74
  n140 --> n75
  n140 --> n76
  n140 --> n84
  n141 --> n76
  n142 --> n77
  n142 --> n78
  n142 --> n79
  n143 --> n80
  n144 --> n47
  n144 --> n51
  n144 --> n53
  n144 --> n54
  n145 --> n19
  n145 --> n52
  n145 --> n54
  n145 --> n81
  n145 --> n89
  n145 --> n91
  n145 --> n99
  n146 --> n55
  n146 --> n57
  n146 --> n58
  n146 --> n59
  n146 --> n61
  n146 --> n65
  n147 --> n2
  n147 --> n7
  n147 --> n10
  n147 --> n12
  n147 --> n38
  n147 --> n82
  n147 --> n92
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
  n149 --> n68
  n149 --> n70
  n149 --> n71
  n149 --> n72
  n149 --> n74
  n149 --> n75
  n149 --> n77
  n149 --> n78
  n149 --> n79
  n149 --> n80
  n149 --> n81
  n149 --> n82
  n149 --> n83
  n149 --> n84
  n149 --> n85
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
  n149 --> n99
  n150 --> n2
  n150 --> n9
  n150 --> n38
  n150 --> n84
  n150 --> n85
  n150 --> n86
  n150 --> n87
  n150 --> n88
  n150 --> n89
  n150 --> n90
  n150 --> n93
  n150 --> n94
  n150 --> n96
  n150 --> n97
  n150 --> n98
  n151 --> n91
  n152 --> n91
  n153 --> n7
  n153 --> n23
  n153 --> n24
  n153 --> n83
  n154 --> n7
  n154 --> n82
  n154 --> n92
  n155 --> n7
  n155 --> n93
  n156 --> n55
  n156 --> n56
  n156 --> n58
  n156 --> n61
  n156 --> n66
  n157 --> n84
  n157 --> n92
  n158 --> n91
  n159 --> n14
  n159 --> n19
  n159 --> n23
  n159 --> n69
  n159 --> n95
  n160 --> n7
  n160 --> n39
  n160 --> n94
  n160 --> n96
  n160 --> n97
  n160 --> n98
  n161 --> n68
  n161 --> n69
  n161 --> n84
  n162 --> n23
  n162 --> n72
  n162 --> n84
  n163 --> n38
  n163 --> n47
  n163 --> n51
  n163 --> n54
  n163 --> n84
  n164 --> n2
  n164 --> n3
  n164 --> n4
  n164 --> n5
  n164 --> n6
  n164 --> n8
  n164 --> n10
  n164 --> n11
  n164 --> n12
  n164 --> n38
  n164 --> n57
  n164 --> n67
  n164 --> n68
  n164 --> n81
  n164 --> n82
  n164 --> n92
  n164 --> n93
  n164 --> n99
  n165 --> n13
  n166 --> n14
  n166 --> n15
  n166 --> n16
  n166 --> n17
  n166 --> n18
  n166 --> n19
  n166 --> n50
  n167 --> n0
  n167 --> n1
  n167 --> n20
  n167 --> n21
  n168 --> n3
  n168 --> n4
  n168 --> n5
  n168 --> n73
  n168 --> n86
  n169 --> n23
  n169 --> n24
  n169 --> n25
  n169 --> n83
  n170 --> n26
  n170 --> n27
  n170 --> n28
  n170 --> n29
  n170 --> n30
  n170 --> n31
  n170 --> n32
  n170 --> n33
  n170 --> n34
  n170 --> n35
  n170 --> n36
  n171 --> n40
  n171 --> n41
  n171 --> n42
  n171 --> n43
  n171 --> n44
  n171 --> n45
  n171 --> n46
  n171 --> n95
  n172 --> n47
  n172 --> n51
  n172 --> n52
  n172 --> n91
  n172 --> n96
  n172 --> n98
  n173 --> n47
  n173 --> n48
  n173 --> n49
  n173 --> n50
  n173 --> n51
  n173 --> n53
  n173 --> n54
  n174 --> n43
  n174 --> n56
  n174 --> n57
  n174 --> n58
  n174 --> n59
  n174 --> n60
  n174 --> n61
  n174 --> n62
  n174 --> n63
  n174 --> n64
  n174 --> n65
  n174 --> n66
  n174 --> n67
  n175 --> n68
  n175 --> n69
  n176 --> n70
  n176 --> n71
  n176 --> n72
  n177 --> n73
  n177 --> n74
  n178 --> n75
  n178 --> n82
  n179 --> n81
  n179 --> n82
  n180 --> n76
  n181 --> n77
  n181 --> n78
  n181 --> n79
  n182 --> n54
  n182 --> n81
  n182 --> n99
  n183 --> n37
  n184 --> n0
  n184 --> n93
  n185 --> n9
  n185 --> n84
  n185 --> n85
  n185 --> n86
  n185 --> n87
  n185 --> n88
  n185 --> n89
  n185 --> n90
  n186 --> n83
  n187 --> n92
  n188 --> n80
  n189 --> n22
  n190 --> n50
  n191 --> n91
  n192 --> n39
  n192 --> n94
  n192 --> n96
  n192 --> n97
  n192 --> n98
```
