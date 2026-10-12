#!/bin/bash
# usage: ./add-token.sh main   |   ./add-token.sh helper
cd "$(dirname "$0")"
read -r -s -p "Paste the bot token, then press Enter (nothing will show): " T; echo
T=$(printf %s "$T" | tr -d "[:space:]")
if ! printf %s "$T" | grep -Eq "^[A-Za-z0-9_-]{24,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,40}$"; then echo "That does not look like one bot token (length ${#T}). Nothing saved. Press Reset Token again, Copy once, paste once."; exit 1; fi
case "$1" in
  main) sed -i "s|^MAIN_TOKEN=.*|MAIN_TOKEN=$T|" .env ;;
  helper)
    CUR=$(grep -E "^HELPER_TOKENS=" .env | cut -d= -f2-)
    if [ -z "$CUR" ]; then NEW="$T"; else NEW="$CUR,$T"; fi
    sed -i "s|^HELPER_TOKENS=.*|HELPER_TOKENS=$NEW|" .env ;;
  *) echo "use: main or helper"; exit 1 ;;
esac
N=$(grep -E "^HELPER_TOKENS=" .env | cut -d= -f2- | tr "," "\n" | grep -c .)
M=$(grep -E "^MAIN_TOKEN=" .env | cut -d= -f2- | grep -c .)
echo "Saved. Main token set: $M | helper tokens saved: $N"
