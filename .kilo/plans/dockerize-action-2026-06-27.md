# Dockerize QualiBooth Action for Multi-CI Usage

## Goal
Convert the existing GitHub Action into a portable, self-contained Docker image that can be:
1. Pushed to GHCR via CI
2. Invoked from any CI system (GitHub Actions, GitLab CI, Jenkins, etc.)
3. Used without GitHub Actions runner-specific dependencies (`@actions/core`, `@actions/github`)

## Architecture Decisions

### Entry point design
- **`entrypoint.sh`** — bash script that:
  - Maps action inputs from `INPUT_*` env vars (GitHub Actions convention) or `QUALIBOOTH_ORG_UUID` etc. (universal fallback)
  - Sets up GitHub context env vars (`GITHUB_REPOSITORY`, `GITHUB_SHA`, `GITHUB_REF_NAME`, `GITHUB_HEAD_REF`) if not present, with clear error messages for missing values
  - Creates/wires `$GITHUB_OUTPUT` file so `setOutput('issues-found', ...)` works
  - Replaces `@actions/core` behavior (`core.info` → stdout, `core.setFailed` → exit 1)
  - Executes `node dist/index.js`

- **No more `@actions/core` / `@actions/github` at runtime** — the action reads env vars directly. The bundled `dist/index.js` is already self-contained via ncc, but we strip those two deps from `package.json` and rebuild to shrink the image further (~12MB → ~3-4MB).

### Dockerfile
- **Base**: `node:lts-alpine` (latest Node LTS, currently 22.x — satisfies `engines.node >= 20.0.0`)
- **Single-stage** — ncc bundles everything into `dist/index.js`, no separate npm install needed at runtime
- Copies only `dist/` + `entrypoint.sh` into the image

### Build & publish workflow
- `.github/workflows/docker-publish.yml` — triggers on tags matching `v*`, publishes to GHCR as `ghcr.io/${{ github.repository_owner }}/qualibooth-action:latest` and `ghcr.io/${{ github.repository_owner }}/qualibooth-action:<version>`

### Dependency cleanup (in dist rebuild)
- Remove `@actions/core` and `@actions/github` from `dependencies` in `package.json` — they were only used for env var I/O which the entrypoint replaces
- Rebuild dist with `npm run build` after removing them

## Files to Create / Modify

### Create: `.docker/entrypoint.sh`
```bash
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
```

### Create: `.docker/Dockerfile`
```dockerfile
FROM node:lts-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
RUN npx ncc build src/index.js -o dist --license licenses.txt

# --- Runtime image ---
FROM node:lts-alpine
LABEL org.opencontainers.image.source="https://github.com/qualibooth/QualiBooth-Action" \
      org.opencontainers.image.description="QualiBooth Accessibility Code Analysis — portable Docker image"

RUN apk add --no-cache bash git

WORKDIR /app

# Copy bundled dist from build stage
COPY --from=build /app/dist ./dist

# Entry point (must be executable)
COPY .docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

### Modify: `package.json`
Remove `@actions/core` and `@actions/github` from dependencies, then rebuild dist.

### Create: `.github/workflows/docker-publish.yml`
```yaml
name: Publish Docker Image

on:
  push:
    tags: ['v*']
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository_owner }}/qualibooth-action

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: .docker/Dockerfile
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          push: true
```

## Example Usages

### 1. GitHub Actions (using the Docker image directly)
```yaml
name: QualiBooth Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run QualiBooth Accessibility Scan
        uses: docker://ghcr.io/qualibooth/qualibooth-action:v1.0.0
        env:
          INPUT_ORG_UUID: ${{ secrets.QUALIBOOTH_ORG_UUID }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          GITHUB_SHA: ${{ github.sha }}
          GITHUB_REF_NAME: ${{ github.ref_name }}
          INPUT_PROJECT_TYPE: react
          INPUT_SCAN_PATHS: "src/"
        with:
          entrypoint: /entrypoint.sh   # optional, Docker already sets it

      - name: Check results
        if: steps.scan.outputs.issues-found != '0'
        run: echo "Found ${{ steps.scan.outputs.issues-found }} accessibility issues"
```

### 2. GitLab CI (.gitlab-ci.yml)
```yaml
qualibooth-scan:
  image: ghcr.io/qualibooth/qualibooth-action:v1.0.0
  variables:
    INPUT_ORG_UUID: $QUALIBOOTH_ORG_UUID
    GITHUB_REPOSITORY: "$CI_PROJECT_PATH"   # GitLab uses this format instead of GitHub's
    GITHUB_SHA: "$CI_COMMIT_SHA"
    GITHUB_REF_NAME: "$CI_COMMIT_BRANCH"
  script:
    - echo "Scan complete (check QualiBooth dashboard)"

  only on variables:
    - $QUALIBOOTH_ORG_UUID
```

### 3. GitLab CI — with `docker run` in a generic image (when you want control over the runner)
```yaml
qualibooth-scan:
  image: docker:24-dind
  services:
    - docker:24-dind

  variables:
    DOCKER_HOST: tcp://docker:2376
  script:
    - |
      docker run --rm \
        -v "$CI_PROJECT_DIR":/workspace \
        -e INPUT_ORG_UUID="$QUALIBOOTH_ORG_UUID" \
        -e GITHUB_REPOSITORY="$CI_PROJECT_PATH" \
        -e GITHUB_SHA="$CI_COMMIT_SHA" \
        -e GITHUB_REF_NAME="$CI_COMMIT_BRANCH" \
        ghcr.io/qualibooth/qualibooth-action:v1.0.0
```

### 4. Jenkins (Jenkinsfile)
```groovy
pipeline {
    agent none

    stages {
        stage('Accessibility Scan') {
            steps {
                script {
                    def image = 'ghcr.io/qualibooth/qualibooth-action:v1.0.0'
                    def containerId = sh(
                        script: """docker run -d --rm \\
                            -v \${WORKSPACE}:/workspace \\
                            -e INPUT_ORG_UUID=${QUALIBOOTH_ORG_UUID} \\
                            -e GITHUB_REPOSITORY=\${env.GIT_URL.tokenize('/')[-2..-1].join('/')} \\
                            -e GITHUB_SHA=\${env.GIT_COMMIT} \\
                            -e GITHUB_REF_NAME=master \\
                            ${image}
                        """,
                        returnStatus: true
                    )
                }
            }
        }
    }
}
```

### 5. GitHub Actions — using `docker run` step (full control, no `uses: docker://`)
```yaml
- name: Run QualiBooth Scan via Docker
  run: |
    docker run --rm \
      -v "${{ github.workspace }}:/workspace" \
      -e INPUT_ORG_UUID="${{ secrets.QUALIBOOTH_ORG_UUID }}" \
      -e GITHUB_REPOSITORY="${{ github.repository }}" \
      -e GITHUB_SHA="${{ github.sha }}" \
      -e GITHUB_REF_NAME="${{ github.ref_name }}" \
      -e INPUT_PROJECT_TYPE=react \
      ghcr.io/qualibooth/qualibooth-action:v1.0.0
```

## Notes & Edge Cases

- **`GITHUB_REPOSITORY`**: GitLab uses `$CI_PROJECT_PATH` (format `owner/repo`). The entrypoint just reads it as-is, so users on other CIs map it themselves.
- **Non-GitHub CI outputs**: `setOutput('issues-found', ...)` writes to `$GITHUB_OUTPUT`. For non-GitHub CIs, this file can be read from the container's `/tmp/github-output` volume mount if needed.
- **Image size**: Single-stage alpine build with ncc-bundled dist should land around 150-200MB (node:20-alpine ~70MB + bash/git + bundled ESLint deps). Stripping `@actions/core` and `@actions/github` from the bundle saves ~3-4MB of dist.
- **Security**: No secrets written to logs; only issue counts are echoed via `core.info`.
