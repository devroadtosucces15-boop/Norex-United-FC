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
  n123["tests/alertroute.test.mjs"]
  n124["tests/avatarcard.test.mjs"]
  n125["tests/awards.test.mjs"]
  n126["tests/badges.test.mjs"]
  n127["tests/botfeat-sample.mjs"]
  n128["tests/builder.test.mjs"]
  n129["tests/builds.test.mjs"]
  n130["tests/cardstudio.test.mjs"]
  n131["tests/chat.test.mjs"]
  n132["tests/crawl.test.mjs"]
  n133["tests/d1usage.test.mjs"]
  n134["tests/discord.test.mjs"]
  n135["tests/docs.test.mjs"]
  n136["tests/drilldown.test.mjs"]
  n137["tests/dugout.test.mjs"]
  n138["tests/events.test.mjs"]
  n139["tests/feed.test.mjs"]
  n140["tests/feedbackroom.test.mjs"]
  n141["tests/flags.test.mjs"]
  n142["tests/fun.test.mjs"]
  n143["tests/game.test.mjs"]
  n144["tests/honours.test.mjs"]
  n145["tests/hub.test.mjs"]
  n146["tests/issues.test.mjs"]
  n147["tests/issuesrec.test.mjs"]
  n148["tests/lineuprec.test.mjs"]
  n149["tests/locker.test.mjs"]
  n150["tests/media.test.mjs"]
  n151["tests/memberlive.test.mjs"]
  n152["tests/members.test.mjs"]
  n153["tests/moderation.test.mjs"]
  n154["tests/next.test.mjs"]
  n155["tests/notify.test.mjs"]
  n156["tests/playmedia.test.mjs"]
  n157["tests/plays.test.mjs"]
  n158["tests/prefs.test.mjs"]
  n159["tests/probuilds.test.mjs"]
  n160["tests/profiles.test.mjs"]
  n161["tests/recorder.test.mjs"]
  n162["tests/rush.test.mjs"]
  n163["tests/social.test.mjs"]
  n164["tests/squads.test.mjs"]
  n165["tests/studio.test.mjs"]
  n166["tests/submissions.test.mjs"]
  n167["tests/trials.test.mjs"]
  n168["tests/wave10.test.mjs"]
  n169["tests/wave11.test.mjs"]
  n170["tests/wave8.test.mjs"]
  n171["web/app.js"]
  n172["web/avatarcard.js"]
  n173["web/awards.js"]
  n174["web/badges.js"]
  n175["web/boardroom.js"]
  n176["web/builder.js"]
  n177["web/cardstudio.js"]
  n178["web/docs.js"]
  n179["web/dugout.js"]
  n180["web/events.js"]
  n181["web/feed.js"]
  n182["web/feedback.js"]
  n183["web/game.js"]
  n184["web/honours.js"]
  n185["web/hub.js"]
  n186["web/hubgold.js"]
  n187["web/locker.js"]
  n188["web/messages.js"]
  n189["web/mystats.js"]
  n190["web/notify.js"]
  n191["web/probuilds.js"]
  n192["web/profile.js"]
  n193["web/report.js"]
  n194["web/settings.js"]
  n195["web/squads.js"]
  n196["web/tactics.js"]
  n197["web/trials.js"]
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
  n123 --> n22
  n123 --> n61
  n124 --> n13
  n125 --> n14
  n125 --> n15
  n125 --> n16
  n125 --> n17
  n125 --> n18
  n125 --> n19
  n125 --> n84
  n126 --> n0
  n126 --> n1
  n126 --> n2
  n126 --> n20
  n126 --> n21
  n126 --> n38
  n126 --> n90
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
  n133 --> n79
  n134 --> n2
  n134 --> n82
  n135 --> n40
  n135 --> n41
  n135 --> n42
  n135 --> n43
  n135 --> n44
  n135 --> n45
  n135 --> n46
  n135 --> n84
  n135 --> n85
  n135 --> n87
  n135 --> n94
  n135 --> n95
  n136 --> n37
  n137 --> n47
  n137 --> n49
  n137 --> n50
  n137 --> n51
  n137 --> n52
  n137 --> n54
  n137 --> n89
  n137 --> n98
  n138 --> n7
  n138 --> n47
  n138 --> n48
  n138 --> n49
  n138 --> n51
  n138 --> n54
  n138 --> n84
  n138 --> n90
  n139 --> n55
  n139 --> n56
  n139 --> n57
  n139 --> n58
  n139 --> n60
  n139 --> n61
  n139 --> n62
  n139 --> n63
  n139 --> n64
  n139 --> n66
  n139 --> n67
  n140 --> n68
  n140 --> n69
  n140 --> n70
  n140 --> n71
  n140 --> n72
  n140 --> n73
  n140 --> n74
  n140 --> n75
  n141 --> n3
  n141 --> n4
  n141 --> n5
  n141 --> n7
  n141 --> n22
  n141 --> n79
  n141 --> n82
  n141 --> n86
  n141 --> n91
  n142 --> n90
  n143 --> n7
  n143 --> n76
  n143 --> n77
  n143 --> n78
  n144 --> n79
  n145 --> n84
  n146 --> n80
  n147 --> n80
  n148 --> n47
  n148 --> n51
  n148 --> n53
  n148 --> n54
  n149 --> n19
  n149 --> n52
  n149 --> n54
  n149 --> n81
  n149 --> n88
  n149 --> n89
  n149 --> n99
  n150 --> n55
  n150 --> n57
  n150 --> n58
  n150 --> n59
  n150 --> n61
  n150 --> n65
  n151 --> n90
  n152 --> n2
  n152 --> n7
  n152 --> n10
  n152 --> n12
  n152 --> n38
  n152 --> n82
  n152 --> n90
  n152 --> n99
  n153 --> n6
  n153 --> n7
  n153 --> n8
  n153 --> n11
  n153 --> n37
  n153 --> n55
  n153 --> n56
  n153 --> n61
  n153 --> n63
  n153 --> n67
  n154 --> n0
  n154 --> n1
  n154 --> n3
  n154 --> n4
  n154 --> n6
  n154 --> n7
  n154 --> n8
  n154 --> n9
  n154 --> n10
  n154 --> n11
  n154 --> n12
  n154 --> n13
  n154 --> n14
  n154 --> n15
  n154 --> n16
  n154 --> n17
  n154 --> n18
  n154 --> n19
  n154 --> n20
  n154 --> n21
  n154 --> n22
  n154 --> n23
  n154 --> n24
  n154 --> n25
  n154 --> n26
  n154 --> n27
  n154 --> n28
  n154 --> n29
  n154 --> n30
  n154 --> n31
  n154 --> n32
  n154 --> n33
  n154 --> n34
  n154 --> n35
  n154 --> n36
  n154 --> n39
  n154 --> n40
  n154 --> n41
  n154 --> n42
  n154 --> n44
  n154 --> n45
  n154 --> n46
  n154 --> n47
  n154 --> n48
  n154 --> n56
  n154 --> n57
  n154 --> n59
  n154 --> n60
  n154 --> n61
  n154 --> n62
  n154 --> n64
  n154 --> n65
  n154 --> n67
  n154 --> n70
  n154 --> n76
  n154 --> n77
  n154 --> n78
  n154 --> n80
  n154 --> n81
  n154 --> n82
  n154 --> n83
  n154 --> n84
  n154 --> n85
  n154 --> n87
  n154 --> n88
  n154 --> n89
  n154 --> n90
  n154 --> n91
  n154 --> n93
  n154 --> n94
  n154 --> n95
  n154 --> n96
  n154 --> n97
  n154 --> n98
  n154 --> n99
  n155 --> n2
  n155 --> n9
  n155 --> n38
  n155 --> n84
  n155 --> n85
  n155 --> n86
  n155 --> n87
  n155 --> n88
  n155 --> n91
  n155 --> n92
  n155 --> n93
  n155 --> n96
  n155 --> n97
  n155 --> n98
  n156 --> n89
  n157 --> n89
  n158 --> n82
  n159 --> n7
  n159 --> n23
  n159 --> n24
  n159 --> n83
  n160 --> n7
  n160 --> n82
  n160 --> n90
  n161 --> n80
  n162 --> n7
  n162 --> n91
  n162 --> n92
  n163 --> n55
  n163 --> n56
  n163 --> n58
  n163 --> n61
  n163 --> n66
  n164 --> n84
  n164 --> n90
  n165 --> n89
  n166 --> n14
  n166 --> n19
  n166 --> n23
  n166 --> n74
  n166 --> n94
  n167 --> n7
  n167 --> n39
  n167 --> n93
  n167 --> n96
  n167 --> n97
  n167 --> n98
  n168 --> n68
  n168 --> n69
  n168 --> n70
  n168 --> n71
  n168 --> n72
  n168 --> n73
  n168 --> n74
  n168 --> n75
  n168 --> n84
  n169 --> n23
  n169 --> n78
  n169 --> n84
  n170 --> n38
  n170 --> n47
  n170 --> n51
  n170 --> n54
  n170 --> n84
  n171 --> n2
  n171 --> n3
  n171 --> n4
  n171 --> n5
  n171 --> n6
  n171 --> n8
  n171 --> n10
  n171 --> n11
  n171 --> n12
  n171 --> n38
  n171 --> n57
  n171 --> n67
  n171 --> n70
  n171 --> n81
  n171 --> n82
  n171 --> n90
  n171 --> n91
  n171 --> n92
  n171 --> n99
  n172 --> n13
  n173 --> n14
  n173 --> n15
  n173 --> n16
  n173 --> n17
  n173 --> n18
  n173 --> n19
  n173 --> n50
  n174 --> n0
  n174 --> n1
  n174 --> n20
  n174 --> n21
  n175 --> n3
  n175 --> n4
  n175 --> n5
  n175 --> n79
  n175 --> n86
  n176 --> n23
  n176 --> n24
  n176 --> n25
  n176 --> n83
  n177 --> n26
  n177 --> n27
  n177 --> n28
  n177 --> n29
  n177 --> n30
  n177 --> n31
  n177 --> n32
  n177 --> n33
  n177 --> n34
  n177 --> n35
  n177 --> n36
  n178 --> n40
  n178 --> n41
  n178 --> n42
  n178 --> n43
  n178 --> n44
  n178 --> n45
  n178 --> n46
  n178 --> n94
  n178 --> n95
  n179 --> n47
  n179 --> n51
  n179 --> n52
  n179 --> n89
  n179 --> n96
  n179 --> n98
  n180 --> n47
  n180 --> n48
  n180 --> n49
  n180 --> n50
  n180 --> n51
  n180 --> n53
  n180 --> n54
  n181 --> n43
  n181 --> n56
  n181 --> n57
  n181 --> n58
  n181 --> n59
  n181 --> n60
  n181 --> n61
  n181 --> n62
  n181 --> n63
  n181 --> n64
  n181 --> n65
  n181 --> n66
  n181 --> n67
  n182 --> n68
  n182 --> n69
  n182 --> n70
  n182 --> n71
  n182 --> n72
  n182 --> n73
  n182 --> n74
  n182 --> n75
  n183 --> n76
  n183 --> n77
  n183 --> n78
  n184 --> n79
  n185 --> n82
  n186 --> n81
  n186 --> n82
  n187 --> n54
  n187 --> n81
  n187 --> n99
  n188 --> n37
  n189 --> n0
  n189 --> n91
  n190 --> n9
  n190 --> n84
  n190 --> n85
  n190 --> n86
  n190 --> n87
  n190 --> n88
  n191 --> n83
  n192 --> n90
  n193 --> n80
  n194 --> n22
  n195 --> n50
  n196 --> n89
  n197 --> n39
  n197 --> n93
  n197 --> n96
  n197 --> n97
  n197 --> n98
```
