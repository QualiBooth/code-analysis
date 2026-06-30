#!/usr/bin/env bash
set -euo pipefail

# --- Auto-detect workspace: GITHUB_WORKSPACE (GitHub Actions) or /workspace mount ---
if [ -z "${GITHUB_WORKSPACE:-}" ] && [ -d "/workspace" ]; then
  export GITHUB_WORKSPACE="/workspace"
fi

# --- Wire QUALIBOOTH_OUTPUT so setOutput works inside the container ---
: "${QUALIBOOTH_OUTPUT:=/tmp/qualibooth-output.txt}"
mkdir -p "$(dirname "$QUALIBOOTH_OUTPUT")"
touch "$QUALIBOOTH_OUTPUT"

# --- Run the action ---
exec node /app/dist/index.js
