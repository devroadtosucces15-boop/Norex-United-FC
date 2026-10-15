#!/bin/bash
# Daily: update the YouTube plugin if a newer release exists, verify YouTube works, roll back if the update broke it,
# and write data/report.json (the bot DMs the owner when the status changes).
cd "$(dirname "$0")" || exit 1
YML=lavalink/application.yml; REP=data/report.json; mkdir -p data
cur=$(grep -oP "youtube-plugin:\K[0-9.]+" "$YML")
latest=$(curl -fsS -m 20 https://api.github.com/repos/lavalink-devs/youtube-source/releases/latest 2>/dev/null | grep -oP "\"tag_name\":\s*\"\K[^\"]+" | head -1)
report() { printf "{\"id\":\"%s\",\"time\":\"%s\",\"status\":\"%s\",\"message\":\"%s\",\"version\":\"%s\"}\n" "$(date +%s)" "$(date -u +%FT%TZ)" "$1" "$2" "$3" > "$REP.tmp" && mv "$REP.tmp" "$REP"; }
health() {
  for i in 1 2 3 4 5 6; do
    docker compose exec -T bot node -e "
const H={headers:{Authorization:process.env.LAVALINK_PASSWORD}};
fetch(\"http://lavalink:2333/v4/loadtracks?identifier=\"+encodeURIComponent(\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"),H).then(r=>r.json()).then(j=>process.exit(j.loadType===\"track\"?0:2)).catch(()=>process.exit(3))" && return 0
    code=$?; [ "$code" = 2 ] && return 1; sleep 15
  done; return 1
}
restart_lavalink() { docker compose restart lavalink >/dev/null 2>&1; sleep 45; }
if [ -n "$latest" ] && [ "$latest" != "$cur" ] && [ "$(printf "%s\n%s\n" "$cur" "$latest" | sort -V | tail -1)" = "$latest" ]; then
  cp "$YML" "$YML.bak"
  sed -i "s/youtube-plugin:$cur/youtube-plugin:$latest/" "$YML"; rm -f lavalink/plugins/youtube-plugin-*.jar; restart_lavalink
  if health; then report updated "YouTube plugin updated $cur to $latest and YouTube is working." "$latest"; exit 0; fi
  mv "$YML.bak" "$YML"; rm -f lavalink/plugins/youtube-plugin-*.jar; restart_lavalink
  report rollback "Tried YouTube plugin $latest but YouTube still failed, so I went back to $cur. SoundCloud keeps playing." "$cur"; exit 0
fi
if health; then report ok "YouTube is working (plugin $cur)." "$cur"
else report down "YouTube is not working on plugin $cur and no newer version fixes it. SoundCloud still plays. YouTube is probably blocking this server." "$cur"; fi
