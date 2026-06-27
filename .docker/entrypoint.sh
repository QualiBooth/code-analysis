#!/usr/bin/env bash
set -euo pipefail

# --- Map action inputs (INPUT_* from GitHub Actions, or QUALIBOOTH_ORG_UUID fallback) ---
if [ -z "${INPUT_ORG_UUID:-}" ] && [ -n "${QUALIBOOTH_ORG_UUID:-}" ]; then
  export INPUT_ORG_UUID="$QUALIBOOTH_ORG_UUID"
fi

# --- Provide GITHUB_* env vars with clear defaults / errors ---
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required (e.g. owner/repo)}"
: "${GITHUB_SHA:?GITHUB_SHA is required (commit SHA, full 40-char hex)}"
: "${GITHUB_REF_NAME:=main}"

# GITHUB_HEAD_REF takes priority on pull_request events
if [ -z "${GITHUB_HEAD_REF:-}" ]; then
  export GITHUB_HEAD_REF="${INPUT_PR_BRANCH:-${GITHUB_PR_HEAD:-}}"
fi

# --- Wire GITHUB_OUTPUT so setOutput works inside the container ---
: "${GITHUB_OUTPUT:=/tmp/github-output}"
mkdir -p "$(dirname "$GITHUB_OUTPUT")"
touch "$GITHUB_OUTPUT"

# --- Run the action ---
exec node dist/index.js
