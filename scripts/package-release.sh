#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PACKAGE_NAME="leetbeam"
VERSION="$(python3 - <<'PY'
import json
from pathlib import Path
manifest = json.loads(Path("manifest.json").read_text())
print(manifest.get("version", "0.0.0"))
PY
)"
OUT_ZIP="$DIST_DIR/${PACKAGE_NAME}-${VERSION}.zip"

mkdir -p "$DIST_DIR"
rm -f "$OUT_ZIP"

cd "$ROOT_DIR"

zip -r "$OUT_ZIP" \
  manifest.json \
  README.md \
  PRIVACY_POLICY.md \
  assets \
  src \
  store \
  -x "*.DS_Store" \
  -x "*/.DS_Store"

echo "Created $OUT_ZIP"
