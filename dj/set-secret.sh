#!/bin/bash
# Usage: ./set-secret.sh KEY   — hidden prompt, writes KEY=value into .env (replaces any existing line)
set -e; cd "$(dirname "$0")"; K="$1"; [ -n "$K" ] || { echo "usage: $0 KEY"; exit 1; }
read -rsp "Paste value for $K (hidden), Enter: " V; echo
V=$(printf '%s' "$V" | tr -d '[:space:]')
[ ${#V} -ge 16 ] && [ ${#V} -le 80 ] || { echo "Value looks wrong (${#V} chars). Nothing saved."; exit 1; }
grep -v "^$K=" .env > .env.new || true; echo "$K=$V" >> .env.new; mv .env.new .env; chmod 600 .env
echo "Saved $K (${#V} chars)."
