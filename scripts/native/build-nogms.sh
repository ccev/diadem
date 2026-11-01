#!/usr/bin/env bash
# Build the GMS-free (no Google Play Services) native Android variant, mainly for F-Droid
set -euo pipefail

GEO="node_modules/@capacitor/geolocation"
STASH="node_modules/@capacitor/.geolocation-nogms-stash"

restore() {
	if [ -L "$STASH" ] || [ -e "$STASH" ]; then mv "$STASH" "$GEO"; fi
}
trap restore EXIT

VITE_NO_GMS=true pnpm run build:native

if [ -L "$GEO" ] || [ -e "$GEO" ]; then mv "$GEO" "$STASH"; fi
pnpm exec cap sync android
