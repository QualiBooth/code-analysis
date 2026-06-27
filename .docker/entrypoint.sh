#!/usr/bin/env bash
set -euo pipefail

# --- Wire QUALIBOOTH_OUTPUT so setOutput works inside the container ---
: "${QUALIBOOTH_OUTPUT:=/tmp/qualibooth-output}"
mkdir -p "$(dirname "$QUALIBOOTH_OUTPUT")"
touch "$QUALIBOOTH_OUTPUT"

# --- Run the action ---
exec node /app/dist/index.js
