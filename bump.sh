#!/bin/sh
# Verhoogt het versienummer in index.html en foto.html (bestandsnamen krijgen ?v=..., zo laden browsers nooit oude scripts).
# Gebruik: ./bump.sh            -> volgnummer van vandaag +1
set -e
cd "$(dirname "$0")"
today=$(date +%Y.%m.%d)
cur=$(grep -o 'v=[0-9.]*-[0-9]*' index.html | head -1 | sed 's/v=//')
if [ "${cur%-*}" = "$today" ]; then n=$(( ${cur##*-} + 1 )); else n=1; fi
new="$today-$n"
sed -i.bak -E "s/\?v=[0-9.]+-[0-9]+/?v=$new/g; s/>v[0-9.]+-[0-9]+</>v$new</g" index.html foto.html && rm -f index.html.bak foto.html.bak
echo "versie $cur -> $new"
