#!/bin/bash
# Corrige el error "Unable to save asset to directory" en iOS Simulator con Expo Go.
# La carpeta ExponentExperienceData puede corromperse; este script la elimina.
#
# Uso: ./scripts/fix-simulator-cache.sh
# Luego: pnpm start

set -e

CACHE_BASE="$HOME/Library/Developer/CoreSimulator/Devices"
FOUND=0

echo "🔍 Buscando carpetas ExponentExperienceData..."

for DEVICE in "$CACHE_BASE"/*/; do
  for APP in "$DEVICE"data/Containers/Data/Application/*/; do
    EXP_CACHE="${APP}Library/Caches/ExponentExperienceData"
    if [ -d "$EXP_CACHE" ] 2>/dev/null; then
      echo "  Eliminando: $EXP_CACHE"
      rm -rf "$EXP_CACHE"
      FOUND=1
    fi
  done
done

if [ $FOUND -eq 0 ]; then
  echo "  No se encontró ExponentExperienceData."
fi

echo "✅ Listo. Reinicia el simulador (Device → Erase All Content and Settings) y vuelve a ejecutar: pnpm start"
