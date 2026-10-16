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
  n144["tests/issues.test.mjs"]
  n145["tests/issuesrec.test.mjs"]
  n146["tests/lineuprec.test.mjs"]
  n147["tests/locker.test.mjs"]
  n148["tests/media.test.mjs"]
  n149["tests/memberlive.test.mjs"]
  n150["tests/members.test.mjs"]
  n151["tests/moderation.test.mjs"]
  n152["tests/next.test.mjs"]
  n153["tests/notify.test.mjs"]
  n154["tests/playmedia.test.mjs"]
  n155["tests/plays.test.mjs"]
  n156["tests/prefs.test.mjs"]
  n157["tests/probuilds.test.mjs"]
  n158["tests/profiles.test.mjs"]
  n159["tests/recorder.test.mjs"]
  n160["tests/rush.test.mjs"]
  n161["tests/social.test.mjs"]
  n162["tests/squads.test.mjs"]
  n163["tests/studio.test.mjs"]
  n164["tests/submissions.test.mjs"]
  n165["tests/trials.test.mjs"]
  n166["tests/wave10.test.mjs"]
  n167["tests/wave11.test.mjs"]
  n168["tests/wave8.test.mjs"]
  n169["web/app.js"]
  n170["web/avatarcard.js"]
  n171["web/awards.js"]
  n172["web/badges.js"]
  n173["web/boardroom.js"]
  n174["web/builder.js"]
  n175["web/cardstudio.js"]
  n176["web/docs.js"]
  n177["web/dugout.js"]
  n178["web/events.js"]
  n179["web/feed.js"]
  n180["web/feedback.js"]
  n181["web/game.js"]
  n182["web/honours.js"]
  n183["web/hub.js"]
  n184["web/hubgold.js"]
  n185["web/locker.js"]
  n186["web/messages.js"]
  n187["web/mystats.js"]
  n188["web/notify.js"]
  n189["web/probuilds.js"]
  n190["web/profile.js"]
  n191["web/report.js"]
  n192["web/settings.js"]
  n193["web/squads.js"]
  n194["web/tactics.js"]
  n195["web/trials.js"]
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
  n116 --> n80
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
  n143 --> n84
  n144 --> n80
  n145 --> n80
  n146 --> n47
  n146 --> n51
  n146 --> n53
  n146 --> n54
  n147 --> n19
  n147 --> n52
  n147 --> n54
  n147 --> n81
  n147 --> n88
  n147 --> n89
  n147 --> n99
  n148 --> n55
  n148 --> n57
  n148 --> n58
  n148 --> n59
  n148 --> n61
  n148 --> n65
  n149 --> n90
  n150 --> n2
  n150 --> n7
  n150 --> n10
  n150 --> n12
  n150 --> n38
  n150 --> n82
  n150 --> n90
  n150 --> n99
  n151 --> n6
  n151 --> n7
  n151 --> n8
  n151 --> n11
  n151 --> n37
  n151 --> n55
  n151 --> n56
  n151 --> n61
  n151 --> n63
  n151 --> n67
  n152 --> n0
  n152 --> n1
  n152 --> n3
  n152 --> n4
  n152 --> n6
  n152 --> n7
  n152 --> n8
  n152 --> n9
  n152 --> n10
  n152 --> n11
  n152 --> n12
  n152 --> n13
  n152 --> n14
  n152 --> n15
  n152 --> n16
  n152 --> n17
  n152 --> n18
  n152 --> n19
  n152 --> n20
  n152 --> n21
  n152 --> n22
  n152 --> n23
  n152 --> n24
  n152 --> n25
  n152 --> n26
  n152 --> n27
  n152 --> n28
  n152 --> n29
  n152 --> n30
  n152 --> n31
  n152 --> n32
  n152 --> n33
  n152 --> n34
  n152 --> n35
  n152 --> n36
  n152 --> n39
  n152 --> n40
  n152 --> n41
  n152 --> n42
  n152 --> n44
  n152 --> n45
  n152 --> n46
  n152 --> n47
  n152 --> n48
  n152 --> n56
  n152 --> n57
  n152 --> n59
  n152 --> n60
  n152 --> n61
  n152 --> n62
  n152 --> n64
  n152 --> n65
  n152 --> n67
  n152 --> n70
  n152 --> n76
  n152 --> n77
  n152 --> n78
  n152 --> n80
  n152 --> n81
  n152 --> n82
  n152 --> n83
  n152 --> n84
  n152 --> n85
  n152 --> n87
  n152 --> n88
  n152 --> n89
  n152 --> n90
  n152 --> n91
  n152 --> n93
  n152 --> n94
  n152 --> n95
  n152 --> n96
  n152 --> n97
  n152 --> n98
  n152 --> n99
  n153 --> n2
  n153 --> n9
  n153 --> n38
  n153 --> n84
  n153 --> n85
  n153 --> n86
  n153 --> n87
  n153 --> n88
  n153 --> n91
  n153 --> n92
  n153 --> n93
  n153 --> n96
  n153 --> n97
  n153 --> n98
  n154 --> n89
  n155 --> n89
  n156 --> n82
  n157 --> n7
  n157 --> n23
  n157 --> n24
  n157 --> n83
  n158 --> n7
  n158 --> n82
  n158 --> n90
  n159 --> n80
  n160 --> n7
  n160 --> n91
  n160 --> n92
  n161 --> n55
  n161 --> n56
  n161 --> n58
  n161 --> n61
  n161 --> n66
  n162 --> n84
  n162 --> n90
  n163 --> n89
  n164 --> n14
  n164 --> n19
  n164 --> n23
  n164 --> n74
  n164 --> n94
  n165 --> n7
  n165 --> n39
  n165 --> n93
  n165 --> n96
  n165 --> n97
  n165 --> n98
  n166 --> n68
  n166 --> n69
  n166 --> n70
  n166 --> n71
  n166 --> n72
  n166 --> n73
  n166 --> n74
  n166 --> n75
  n166 --> n84
  n167 --> n23
  n167 --> n78
  n167 --> n84
  n168 --> n38
  n168 --> n47
  n168 --> n51
  n168 --> n54
  n168 --> n84
  n169 --> n2
  n169 --> n3
  n169 --> n4
  n169 --> n5
  n169 --> n6
  n169 --> n8
  n169 --> n10
  n169 --> n11
  n169 --> n12
  n169 --> n38
  n169 --> n57
  n169 --> n67
  n169 --> n70
  n169 --> n81
  n169 --> n82
  n169 --> n90
  n169 --> n91
  n169 --> n92
  n169 --> n99
  n170 --> n13
  n171 --> n14
  n171 --> n15
  n171 --> n16
  n171 --> n17
  n171 --> n18
  n171 --> n19
  n171 --> n50
  n172 --> n0
  n172 --> n1
  n172 --> n20
  n172 --> n21
  n173 --> n3
  n173 --> n4
  n173 --> n5
  n173 --> n79
  n173 --> n86
  n174 --> n23
  n174 --> n24
  n174 --> n25
  n174 --> n83
  n175 --> n26
  n175 --> n27
  n175 --> n28
  n175 --> n29
  n175 --> n30
  n175 --> n31
  n175 --> n32
  n175 --> n33
  n175 --> n34
  n175 --> n35
  n175 --> n36
  n176 --> n40
  n176 --> n41
  n176 --> n42
  n176 --> n43
  n176 --> n44
  n176 --> n45
  n176 --> n46
  n176 --> n94
  n176 --> n95
  n177 --> n47
  n177 --> n51
  n177 --> n52
  n177 --> n89
  n177 --> n96
  n177 --> n98
  n178 --> n47
  n178 --> n48
  n178 --> n49
  n178 --> n50
  n178 --> n51
  n178 --> n53
  n178 --> n54
  n179 --> n43
  n179 --> n56
  n179 --> n57
  n179 --> n58
  n179 --> n59
  n179 --> n60
  n179 --> n61
  n179 --> n62
  n179 --> n63
  n179 --> n64
  n179 --> n65
  n179 --> n66
  n179 --> n67
  n180 --> n68
  n180 --> n69
  n180 --> n70
  n180 --> n71
  n180 --> n72
  n180 --> n73
  n180 --> n74
  n180 --> n75
  n181 --> n76
  n181 --> n77
  n181 --> n78
  n182 --> n79
  n183 --> n82
  n184 --> n81
  n184 --> n82
  n185 --> n54
  n185 --> n81
  n185 --> n99
  n186 --> n37
  n187 --> n0
  n187 --> n91
  n188 --> n9
  n188 --> n84
  n188 --> n85
  n188 --> n86
  n188 --> n87
  n188 --> n88
  n189 --> n83
  n190 --> n90
  n191 --> n80
  n192 --> n22
  n193 --> n50
  n194 --> n89
  n195 --> n39
  n195 --> n93
  n195 --> n96
  n195 --> n97
  n195 --> n98
```
