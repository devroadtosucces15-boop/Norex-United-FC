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
  n12["API /api/avatarcard"]
  n13["API /api/awards"]
  n14["API /api/awards/category"]
  n15["API /api/awards/category/remove"]
  n16["API /api/awards/close"]
  n17["API /api/awards/settings"]
  n18["API /api/awards/vote"]
  n19["API /api/badges"]
  n20["API /api/badges/remove"]
  n21["API /api/bot/settings"]
  n22["API /api/builds"]
  n23["API /api/builds/delete"]
  n24["API /api/builds/fork"]
  n25["API /api/cards/kit-number"]
  n26["API /api/cards/owner/requests"]
  n27["API /api/cards/owner/revoke"]
  n28["API /api/cards/request"]
  n29["API /api/cards/request/cancel"]
  n30["API /api/cards/requests"]
  n31["API /api/cards/requests/decide"]
  n32["API /api/cards/requests/retry"]
  n33["API /api/cards/requests/review"]
  n34["API /api/cards/templates"]
  n35["API /api/cards/templates/update"]
  n36["API /api/chats"]
  n37["API /api/claim"]
  n38["API /api/contacts"]
  n39["API /api/docs"]
  n40["API /api/docs/ack"]
  n41["API /api/docs/acks"]
  n42["API /api/docs/discord"]
  n43["API /api/docs/remind"]
  n44["API /api/docs/remove"]
  n45["API /api/docs/restore"]
  n46["API /api/events"]
  n47["API /api/events/cancel"]
  n48["API /api/events/checkin"]
  n49["API /api/events/discord"]
  n50["API /api/events/lineup"]
  n51["API /api/events/plays"]
  n52["API /api/events/recommend"]
  n53["API /api/events/rsvp"]
  n54["API /api/feed"]
  n55["API /api/feed/comment"]
  n56["API /api/feed/delete"]
  n57["API /api/feed/edit"]
  n58["API /api/feed/media/delete"]
  n59["API /api/feed/pin"]
  n60["API /api/feed/post"]
  n61["API /api/feed/react"]
  n62["API /api/feed/report"]
  n63["API /api/feed/setpublic"]
  n64["API /api/feed/storage"]
  n65["API /api/feed/uncomment"]
  n66["API /api/feed/unreport"]
  n67["API /api/feedback/hide"]
  n68["API /api/feedback/send"]
  n69["API /api/game/admin"]
  n70["API /api/game/dismiss"]
  n71["API /api/game/publish"]
  n72["API /api/hof"]
  n73["API /api/hof/remove"]
  n74["API /api/hub/wave"]
  n75["API /api/intel"]
  n76["API /api/intel/act"]
  n77["API /api/intel/remind"]
  n78["API /api/issues"]
  n79["API /api/locker"]
  n80["API /api/me"]
  n81["API /api/mybuild"]
  n82["API /api/notify"]
  n83["API /api/notify/ack"]
  n84["API /api/notify/announce"]
  n85["API /api/notify/count"]
  n86["API /api/notify/prefs"]
  n87["API /api/notify/read"]
  n88["API /api/notify/test"]
  n89["API /api/plays"]
  n90["API /api/plays/discord"]
  n91["API /api/playstyle"]
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
  n100 --> n13
  n100 --> n14
  n100 --> n15
  n100 --> n16
  n100 --> n17
  n100 --> n18
  n101 --> n0
  n101 --> n1
  n101 --> n19
  n101 --> n20
  n102 --> n68
  n102 --> n84
  n102 --> n95
  n103 --> n22
  n103 --> n23
  n103 --> n24
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
  n104 --> n35
  n105 --> n36
  n106 --> n39
  n106 --> n40
  n106 --> n41
  n106 --> n42
  n106 --> n43
  n106 --> n44
  n106 --> n45
  n106 --> n91
  n106 --> n95
  n107 --> n46
  n107 --> n47
  n107 --> n48
  n107 --> n49
  n107 --> n50
  n107 --> n51
  n107 --> n52
  n107 --> n53
  n108 --> n54
  n108 --> n55
  n108 --> n56
  n108 --> n57
  n108 --> n59
  n108 --> n60
  n108 --> n61
  n108 --> n62
  n108 --> n63
  n108 --> n65
  n108 --> n66
  n109 --> n67
  n109 --> n68
  n110 --> n69
  n110 --> n70
  n110 --> n71
  n111 --> n72
  n111 --> n73
  n112 --> n74
  n113 --> n75
  n113 --> n76
  n113 --> n77
  n114 --> n52
  n115 --> n79
  n116 --> n58
  n116 --> n64
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
  n117 --> n28
  n117 --> n37
  n117 --> n38
  n117 --> n39
  n117 --> n72
  n117 --> n78
  n117 --> n80
  n117 --> n92
  n117 --> n93
  n117 --> n97
  n117 --> n99
  n118 --> n9
  n118 --> n82
  n118 --> n83
  n118 --> n84
  n118 --> n85
  n118 --> n86
  n118 --> n87
  n118 --> n88
  n119 --> n89
  n119 --> n90
  n120 --> n81
  n121 --> n21
  n122 --> n94
  n122 --> n96
  n122 --> n98
  n123 --> n12
  n124 --> n13
  n124 --> n14
  n124 --> n15
  n124 --> n16
  n124 --> n17
  n124 --> n18
  n124 --> n82
  n125 --> n0
  n125 --> n1
  n125 --> n2
  n125 --> n19
  n125 --> n20
  n125 --> n37
  n125 --> n92
  n126 --> n24
  n127 --> n7
  n127 --> n22
  n127 --> n23
  n127 --> n24
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
  n128 --> n35
  n129 --> n36
  n130 --> n5
  n131 --> n2
  n131 --> n80
  n132 --> n39
  n132 --> n40
  n132 --> n41
  n132 --> n42
  n132 --> n43
  n132 --> n44
  n132 --> n45
  n132 --> n82
  n132 --> n83
  n132 --> n85
  n132 --> n91
  n132 --> n95
  n133 --> n36
  n134 --> n46
  n134 --> n48
  n134 --> n50
  n134 --> n51
  n134 --> n53
  n134 --> n89
  n134 --> n98
  n135 --> n7
  n135 --> n46
  n135 --> n47
  n135 --> n48
  n135 --> n50
  n135 --> n53
  n135 --> n82
  n135 --> n92
  n136 --> n54
  n136 --> n55
  n136 --> n56
  n136 --> n57
  n136 --> n59
  n136 --> n60
  n136 --> n61
  n136 --> n62
  n136 --> n63
  n136 --> n65
  n136 --> n66
  n137 --> n3
  n137 --> n4
  n137 --> n5
  n137 --> n7
  n137 --> n21
  n137 --> n72
  n137 --> n80
  n137 --> n84
  n137 --> n93
  n138 --> n7
  n138 --> n69
  n138 --> n70
  n138 --> n71
  n139 --> n72
  n139 --> n73
  n140 --> n74
  n140 --> n82
  n141 --> n74
  n142 --> n75
  n142 --> n76
  n142 --> n77
  n143 --> n78
  n144 --> n46
  n144 --> n50
  n144 --> n52
  n144 --> n53
  n145 --> n18
  n145 --> n51
  n145 --> n53
  n145 --> n79
  n145 --> n87
  n145 --> n89
  n145 --> n99
  n146 --> n54
  n146 --> n56
  n146 --> n57
  n146 --> n58
  n146 --> n60
  n146 --> n64
  n147 --> n2
  n147 --> n7
  n147 --> n10
  n147 --> n37
  n147 --> n80
  n147 --> n92
  n147 --> n99
  n148 --> n6
  n148 --> n7
  n148 --> n8
  n148 --> n11
  n148 --> n36
  n148 --> n54
  n148 --> n55
  n148 --> n60
  n148 --> n62
  n148 --> n66
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
  n149 --> n38
  n149 --> n39
  n149 --> n40
  n149 --> n41
  n149 --> n43
  n149 --> n44
  n149 --> n45
  n149 --> n47
  n149 --> n55
  n149 --> n56
  n149 --> n58
  n149 --> n59
  n149 --> n60
  n149 --> n61
  n149 --> n63
  n149 --> n64
  n149 --> n66
  n149 --> n67
  n149 --> n69
  n149 --> n70
  n149 --> n71
  n149 --> n73
  n149 --> n75
  n149 --> n76
  n149 --> n77
  n149 --> n78
  n149 --> n79
  n149 --> n80
  n149 --> n81
  n149 --> n82
  n149 --> n83
  n149 --> n86
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
  n150 --> n37
  n150 --> n82
  n150 --> n83
  n150 --> n84
  n150 --> n85
  n150 --> n86
  n150 --> n87
  n150 --> n88
  n150 --> n93
  n150 --> n94
  n150 --> n96
  n150 --> n97
  n150 --> n98
  n151 --> n89
  n152 --> n89
  n152 --> n90
  n153 --> n7
  n153 --> n22
  n153 --> n23
  n153 --> n81
  n154 --> n7
  n154 --> n80
  n154 --> n92
  n155 --> n7
  n155 --> n93
  n156 --> n54
  n156 --> n55
  n156 --> n57
  n156 --> n60
  n156 --> n65
  n157 --> n82
  n157 --> n92
  n158 --> n89
  n159 --> n13
  n159 --> n18
  n159 --> n22
  n159 --> n68
  n159 --> n95
  n160 --> n7
  n160 --> n38
  n160 --> n94
  n160 --> n96
  n160 --> n97
  n160 --> n98
  n161 --> n67
  n161 --> n68
  n161 --> n82
  n162 --> n22
  n162 --> n71
  n162 --> n82
  n163 --> n37
  n163 --> n46
  n163 --> n50
  n163 --> n53
  n163 --> n82
  n164 --> n2
  n164 --> n3
  n164 --> n4
  n164 --> n5
  n164 --> n6
  n164 --> n8
  n164 --> n10
  n164 --> n11
  n164 --> n37
  n164 --> n56
  n164 --> n66
  n164 --> n67
  n164 --> n79
  n164 --> n80
  n164 --> n92
  n164 --> n93
  n164 --> n99
  n165 --> n12
  n166 --> n13
  n166 --> n14
  n166 --> n15
  n166 --> n16
  n166 --> n17
  n166 --> n18
  n166 --> n49
  n167 --> n0
  n167 --> n1
  n167 --> n19
  n167 --> n20
  n168 --> n3
  n168 --> n4
  n168 --> n5
  n168 --> n72
  n168 --> n84
  n169 --> n22
  n169 --> n23
  n169 --> n24
  n169 --> n81
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
  n170 --> n35
  n171 --> n39
  n171 --> n40
  n171 --> n41
  n171 --> n42
  n171 --> n43
  n171 --> n44
  n171 --> n45
  n171 --> n91
  n171 --> n95
  n172 --> n46
  n172 --> n50
  n172 --> n51
  n172 --> n89
  n172 --> n96
  n172 --> n98
  n173 --> n46
  n173 --> n47
  n173 --> n48
  n173 --> n49
  n173 --> n50
  n173 --> n52
  n173 --> n53
  n174 --> n42
  n174 --> n55
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
  n175 --> n67
  n175 --> n68
  n176 --> n69
  n176 --> n70
  n176 --> n71
  n177 --> n72
  n177 --> n73
  n178 --> n80
  n179 --> n79
  n179 --> n80
  n180 --> n74
  n181 --> n75
  n181 --> n76
  n181 --> n77
  n182 --> n53
  n182 --> n79
  n182 --> n99
  n183 --> n36
  n184 --> n0
  n184 --> n93
  n185 --> n9
  n185 --> n82
  n185 --> n83
  n185 --> n84
  n185 --> n85
  n185 --> n86
  n185 --> n87
  n185 --> n88
  n186 --> n81
  n187 --> n92
  n188 --> n78
  n189 --> n21
  n190 --> n49
  n191 --> n89
  n191 --> n90
  n192 --> n38
  n192 --> n94
  n192 --> n96
  n192 --> n97
  n192 --> n98
```
