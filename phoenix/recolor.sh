#!/bin/sh
# brand red -> ember orange; cool blue-blacks -> warm blacks; cool greys -> warm greys
cd "${1:-$(dirname "$0")/next}"
FILES=$(grep -rlE "." static/*.css static/*.js pages lib light.css 2>/dev/null)
sed -i \
 -e 's/#c8352c/#e8741a/Ig' -e 's/#e0493f/#ff9a2e/Ig' -e 's/rgba(200,53,44/rgba(232,116,26/g' -e 's/#f08f87/#ffbf80/Ig' -e 's/#d23a2f/#e8741a/Ig' -e 's/#7a2a24/#7a3a12/Ig' -e 's/#3a1613/#3a1c0a/Ig' \
 -e 's/#080b11/#0a0705/Ig' -e 's/#0b0f16/#0c0805/Ig' -e 's/#0d1119/#110c08/Ig' -e 's/#111722/#17110b/Ig' -e 's/#171f2d/#1f1710/Ig' -e 's/#1f2a3c/#2a1f14/Ig' -e 's/#0a0e15/#0d0906/Ig' -e 's/#06080c/#060403/Ig' -e 's/#12161f/#1a130c/Ig' -e 's/#0f1522/#140e09/Ig' \
 -e 's/rgba(8,11,17/rgba(10,7,5/g' -e 's/rgba(13,17,25/rgba(17,12,8/g' -e 's/rgba(17,23,34/rgba(23,17,11/g' \
 -e 's/#eef2f9/#f7f1e6/Ig' -e 's/#9ba7bd/#bcae9a/Ig' -e 's/#8591a8/#988a78/Ig' -e 's/#8e9ab2/#a09280/Ig' -e 's/#aab4c9/#c4b7a4/Ig' -e 's/#c5cdde/#d6cab7/Ig' -e 's/#cfd8e8/#e0d5c3/Ig' -e 's/#cfd6e2/#ddd2c0/Ig' -e 's/#dbe3f2/#e8dfcf/Ig' -e 's/#7f8ba3/#8f8170/Ig' -e 's/#9aa6b8/#b0a290/Ig' -e 's/#8d98aa/#a09280/Ig' \
 $FILES
