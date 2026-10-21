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
  n67["API /api/feedback"]
  n68["API /api/feedback/all"]
  n69["API /api/feedback/hide"]
  n70["API /api/feedback/react"]
  n71["API /api/feedback/read"]
  n72["API /api/feedback/report"]
  n73["API /api/feedback/send"]
  n74["API /api/feedback/why"]
  n75["API /api/game/admin"]
  n76["API /api/game/dismiss"]
  n77["API /api/game/publish"]
  n78["API /api/hof"]
  n79["API /api/issues"]
  n80["API /api/locker"]
  n81["API /api/me"]
  n82["API /api/mybuild"]
  n83["API /api/notify"]
  n84["API /api/notify/ack"]
  n85["API /api/notify/announce"]
  n86["API /api/notify/count"]
  n87["API /api/notify/prefs"]
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
  n123["tests/alertroute.test.mjs"]
  n124["tests/avatarcard.test.mjs"]
  n125["tests/awards.test.mjs"]
  n126["tests/badges.test.mjs"]
  n127["tests/botfeat-sample.mjs"]
  n128["tests/builder.test.mjs"]
  n129["tests/builds.test.mjs"]
  n130["tests/cardstudio.test.mjs"]
  n131["tests/chat.test.mjs"]
  n132["tests/checkin.test.mjs"]
  n133["tests/crawl.test.mjs"]
  n134["tests/d1usage.test.mjs"]
  n135["tests/discord.test.mjs"]
  n136["tests/docs.test.mjs"]
  n137["tests/drilldown.test.mjs"]
  n138["tests/dugout.test.mjs"]
  n139["tests/events.test.mjs"]
  n140["tests/feed.test.mjs"]
  n141["tests/feedbackroom.test.mjs"]
  n142["tests/flags.test.mjs"]
  n143["tests/fun.test.mjs"]
  n144["tests/game.test.mjs"]
  n145["tests/honours.test.mjs"]
  n146["tests/hub.test.mjs"]
  n147["tests/issues.test.mjs"]
  n148["tests/issuesrec.test.mjs"]
  n149["tests/lineuprec.test.mjs"]
  n150["tests/locker.test.mjs"]
  n151["tests/media.test.mjs"]
  n152["tests/memberlive.test.mjs"]
  n153["tests/members.test.mjs"]
  n154["tests/moderation.test.mjs"]
  n155["tests/next.test.mjs"]
  n156["tests/notify.test.mjs"]
  n157["tests/playmedia.test.mjs"]
  n158["tests/plays.test.mjs"]
  n159["tests/prefs.test.mjs"]
  n160["tests/probuilds.test.mjs"]
  n161["tests/profiles.test.mjs"]
  n162["tests/recorder.test.mjs"]
  n163["tests/rush.test.mjs"]
  n164["tests/social.test.mjs"]
  n165["tests/squads.test.mjs"]
  n166["tests/studio.test.mjs"]
  n167["tests/submissions.test.mjs"]
  n168["tests/trials.test.mjs"]
  n169["tests/wave10.test.mjs"]
  n170["tests/wave11.test.mjs"]
  n171["tests/wave8.test.mjs"]
  n172["web/app.js"]
  n173["web/avatarcard.js"]
  n174["web/awards.js"]
  n175["web/badges.js"]
  n176["web/boardroom.js"]
  n177["web/builder.js"]
  n178["web/cardstudio.js"]
  n179["web/docs.js"]
  n180["web/dugout.js"]
  n181["web/events.js"]
  n182["web/feed.js"]
  n183["web/feedback.js"]
  n184["web/game.js"]
  n185["web/honours.js"]
  n186["web/hub.js"]
  n187["web/hubgold.js"]
  n188["web/locker.js"]
  n189["web/messages.js"]
  n190["web/mystats.js"]
  n191["web/notify.js"]
  n192["web/probuilds.js"]
  n193["web/profile.js"]
  n194["web/report.js"]
  n195["web/settings.js"]
  n196["web/squads.js"]
  n197["web/tactics.js"]
  n198["web/trials.js"]
  n100 --> n14
  n100 --> n15
  n100 --> n16
  n100 --> n17
  n100 --> n18
  n101 --> n0
  n101 --> n1
  n101 --> n19
  n101 --> n20
  n102 --> n73
  n102 --> n85
  n102 --> n94
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
  n106 --> n94
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
  n109 --> n69
  n109 --> n70
  n109 --> n71
  n109 --> n72
  n109 --> n73
  n109 --> n74
  n110 --> n75
  n110 --> n76
  n110 --> n77
  n111 --> n78
  n112 --> n46
  n113 --> n52
  n114 --> n80
  n115 --> n58
  n115 --> n64
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
  n116 --> n28
  n116 --> n37
  n116 --> n38
  n116 --> n39
  n116 --> n78
  n116 --> n79
  n116 --> n81
  n116 --> n90
  n116 --> n91
  n116 --> n92
  n116 --> n97
  n116 --> n99
  n117 --> n9
  n117 --> n83
  n117 --> n84
  n117 --> n85
  n117 --> n86
  n117 --> n87
  n117 --> n88
  n118 --> n2
  n118 --> n8
  n118 --> n9
  n118 --> n31
  n118 --> n92
  n118 --> n95
  n119 --> n89
  n120 --> n82
  n121 --> n21
  n122 --> n93
  n122 --> n96
  n122 --> n98
  n123 --> n21
  n123 --> n60
  n124 --> n13
  n125 --> n14
  n125 --> n15
  n125 --> n16
  n125 --> n17
  n125 --> n18
  n125 --> n83
  n126 --> n0
  n126 --> n1
  n126 --> n2
  n126 --> n19
  n126 --> n20
  n126 --> n37
  n126 --> n90
  n127 --> n90
  n128 --> n24
  n129 --> n7
  n129 --> n22
  n129 --> n23
  n129 --> n24
  n130 --> n25
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
  n131 --> n36
  n132 --> n46
  n132 --> n50
  n132 --> n53
  n133 --> n5
  n134 --> n78
  n135 --> n2
  n135 --> n81
  n136 --> n39
  n136 --> n40
  n136 --> n41
  n136 --> n42
  n136 --> n43
  n136 --> n44
  n136 --> n45
  n136 --> n83
  n136 --> n84
  n136 --> n86
  n136 --> n94
  n136 --> n95
  n137 --> n36
  n138 --> n46
  n138 --> n48
  n138 --> n49
  n138 --> n50
  n138 --> n51
  n138 --> n53
  n138 --> n89
  n138 --> n98
  n139 --> n7
  n139 --> n21
  n139 --> n46
  n139 --> n47
  n139 --> n48
  n139 --> n50
  n139 --> n53
  n139 --> n83
  n139 --> n86
  n139 --> n87
  n139 --> n90
  n140 --> n54
  n140 --> n55
  n140 --> n56
  n140 --> n57
  n140 --> n59
  n140 --> n60
  n140 --> n61
  n140 --> n62
  n140 --> n63
  n140 --> n65
  n140 --> n66
  n141 --> n67
  n141 --> n68
  n141 --> n69
  n141 --> n70
  n141 --> n71
  n141 --> n72
  n141 --> n73
  n141 --> n74
  n142 --> n3
  n142 --> n4
  n142 --> n5
  n142 --> n7
  n142 --> n21
  n142 --> n78
  n142 --> n81
  n142 --> n85
  n142 --> n91
  n143 --> n90
  n144 --> n7
  n144 --> n75
  n144 --> n76
  n144 --> n77
  n145 --> n78
  n146 --> n83
  n147 --> n79
  n148 --> n79
  n149 --> n46
  n149 --> n50
  n149 --> n52
  n149 --> n53
  n150 --> n18
  n150 --> n51
  n150 --> n53
  n150 --> n80
  n150 --> n88
  n150 --> n89
  n150 --> n99
  n151 --> n54
  n151 --> n56
  n151 --> n57
  n151 --> n58
  n151 --> n60
  n151 --> n64
  n152 --> n90
  n153 --> n2
  n153 --> n7
  n153 --> n10
  n153 --> n12
  n153 --> n37
  n153 --> n81
  n153 --> n90
  n153 --> n99
  n154 --> n6
  n154 --> n7
  n154 --> n8
  n154 --> n11
  n154 --> n36
  n154 --> n54
  n154 --> n55
  n154 --> n60
  n154 --> n62
  n154 --> n66
  n155 --> n0
  n155 --> n1
  n155 --> n3
  n155 --> n4
  n155 --> n6
  n155 --> n7
  n155 --> n8
  n155 --> n9
  n155 --> n10
  n155 --> n11
  n155 --> n12
  n155 --> n13
  n155 --> n14
  n155 --> n15
  n155 --> n16
  n155 --> n17
  n155 --> n18
  n155 --> n19
  n155 --> n20
  n155 --> n21
  n155 --> n22
  n155 --> n23
  n155 --> n24
  n155 --> n25
  n155 --> n26
  n155 --> n27
  n155 --> n28
  n155 --> n29
  n155 --> n30
  n155 --> n31
  n155 --> n32
  n155 --> n33
  n155 --> n34
  n155 --> n35
  n155 --> n38
  n155 --> n39
  n155 --> n40
  n155 --> n41
  n155 --> n43
  n155 --> n44
  n155 --> n45
  n155 --> n46
  n155 --> n47
  n155 --> n55
  n155 --> n56
  n155 --> n58
  n155 --> n59
  n155 --> n60
  n155 --> n61
  n155 --> n63
  n155 --> n64
  n155 --> n66
  n155 --> n69
  n155 --> n75
  n155 --> n76
  n155 --> n77
  n155 --> n79
  n155 --> n80
  n155 --> n81
  n155 --> n82
  n155 --> n83
  n155 --> n84
  n155 --> n86
  n155 --> n87
  n155 --> n88
  n155 --> n89
  n155 --> n90
  n155 --> n91
  n155 --> n93
  n155 --> n94
  n155 --> n95
  n155 --> n96
  n155 --> n97
  n155 --> n98
  n155 --> n99
  n156 --> n2
  n156 --> n9
  n156 --> n37
  n156 --> n83
  n156 --> n84
  n156 --> n85
  n156 --> n86
  n156 --> n87
  n156 --> n88
  n156 --> n91
  n156 --> n92
  n156 --> n93
  n156 --> n96
  n156 --> n97
  n156 --> n98
  n157 --> n89
  n158 --> n89
  n159 --> n81
  n160 --> n7
  n160 --> n22
  n160 --> n23
  n160 --> n82
  n161 --> n7
  n161 --> n81
  n161 --> n90
  n162 --> n79
  n163 --> n7
  n163 --> n91
  n163 --> n92
  n164 --> n54
  n164 --> n55
  n164 --> n57
  n164 --> n60
  n164 --> n65
  n165 --> n83
  n165 --> n90
  n166 --> n89
  n167 --> n14
  n167 --> n18
  n167 --> n22
  n167 --> n73
  n167 --> n94
  n168 --> n7
  n168 --> n38
  n168 --> n93
  n168 --> n96
  n168 --> n97
  n168 --> n98
  n169 --> n67
  n169 --> n68
  n169 --> n69
  n169 --> n70
  n169 --> n71
  n169 --> n72
  n169 --> n73
  n169 --> n74
  n169 --> n83
  n170 --> n22
  n170 --> n77
  n170 --> n83
  n171 --> n37
  n171 --> n46
  n171 --> n50
  n171 --> n53
  n171 --> n83
  n172 --> n2
  n172 --> n3
  n172 --> n4
  n172 --> n5
  n172 --> n6
  n172 --> n8
  n172 --> n10
  n172 --> n11
  n172 --> n12
  n172 --> n37
  n172 --> n56
  n172 --> n66
  n172 --> n69
  n172 --> n80
  n172 --> n81
  n172 --> n90
  n172 --> n91
  n172 --> n92
  n172 --> n99
  n173 --> n13
  n174 --> n14
  n174 --> n15
  n174 --> n16
  n174 --> n17
  n174 --> n18
  n174 --> n49
  n175 --> n0
  n175 --> n1
  n175 --> n19
  n175 --> n20
  n176 --> n3
  n176 --> n4
  n176 --> n5
  n176 --> n78
  n176 --> n85
  n177 --> n22
  n177 --> n23
  n177 --> n24
  n177 --> n82
  n178 --> n25
  n178 --> n26
  n178 --> n27
  n178 --> n28
  n178 --> n29
  n178 --> n30
  n178 --> n31
  n178 --> n32
  n178 --> n33
  n178 --> n34
  n178 --> n35
  n179 --> n39
  n179 --> n40
  n179 --> n41
  n179 --> n42
  n179 --> n43
  n179 --> n44
  n179 --> n45
  n179 --> n94
  n179 --> n95
  n180 --> n46
  n180 --> n50
  n180 --> n51
  n180 --> n89
  n180 --> n96
  n180 --> n98
  n181 --> n46
  n181 --> n47
  n181 --> n48
  n181 --> n49
  n181 --> n50
  n181 --> n52
  n181 --> n53
  n182 --> n42
  n182 --> n55
  n182 --> n56
  n182 --> n57
  n182 --> n58
  n182 --> n59
  n182 --> n60
  n182 --> n61
  n182 --> n62
  n182 --> n63
  n182 --> n64
  n182 --> n65
  n182 --> n66
  n183 --> n67
  n183 --> n68
  n183 --> n69
  n183 --> n70
  n183 --> n71
  n183 --> n72
  n183 --> n73
  n183 --> n74
  n184 --> n75
  n184 --> n76
  n184 --> n77
  n185 --> n78
  n186 --> n81
  n187 --> n80
  n187 --> n81
  n188 --> n53
  n188 --> n80
  n188 --> n99
  n189 --> n36
  n190 --> n0
  n190 --> n91
  n191 --> n9
  n191 --> n83
  n191 --> n84
  n191 --> n85
  n191 --> n86
  n191 --> n87
  n191 --> n88
  n192 --> n82
  n193 --> n90
  n194 --> n79
  n195 --> n21
  n196 --> n49
  n197 --> n89
  n198 --> n38
  n198 --> n93
  n198 --> n96
  n198 --> n97
  n198 --> n98
```
