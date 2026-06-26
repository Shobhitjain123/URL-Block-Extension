#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
NAME="focus-lock"
ZIP="$DIST/${NAME}.zip"

mkdir -p "$DIST"
rm -f "$ZIP"

# Package only extension runtime files (exclude dev/store tooling).
cd "$ROOT"
zip -r "$ZIP" \
  manifest.json \
  popup.html \
  blocked.html \
  privacy-policy.html \
  icons/ \
  src/ \
  -x "*.DS_Store" \
  -x "*/__pycache__/*"

echo "Created $ZIP"
echo "Upload this zip in the Chrome Web Store Developer Dashboard."
