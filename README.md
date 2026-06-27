# QualiBooth Accessibility Code Analysis

A cross-platform Docker image that scans your codebase for accessibility issues using ESLint and reports results to your [QualiBooth](https://qualibooth.com) dashboard. Works with **GitHub Actions**, **GitLab CI**, **Jenkins**, and any CI that supports Docker.

Supports **React**, **Vue 3**, and **HTML** projects.

---

## Prerequisites

Add a secret/variable to your CI system:

| Secret Name | Where to find it |
|---|---|
| `QUALIBOOTH_ORG_UUID` | QualiBooth dashboard → Settings → Organization |

---

## Quick Start — GitHub Actions

Create `.github/workflows/qualibooth.yml`:

```yaml
name: QualiBooth Code Analysis

on:
  push:
    branches: ["main", "develop"]
  pull_request:
    branches: ["main"]

jobs:
  accessibility-scan:
    name: Accessibility Code Scan
    runs-on: ubuntu-latest

    steps:
      - name: Run QualiBooth Code Analysis
        uses: docker://ghcr.io/qualibooth/qualibooth-action:v1.0.4
        env:
          QUALIBOOTH_ORG_UUID: ${{ secrets.QUALIBOOTH_ORG_UUID }}
          QUALIBOOTH_REPO: ${{ github.repository }}
          QUALIBOOTH_SHA: ${{ github.sha }}
          QUALIBOOTH_BRANCH: ${{ github.ref_name }}
```

Results appear in your QualiBooth dashboard after each push.

---

## Docker Image

Published to GHCR as a portable image:

```bash
ghcr.io/qualibooth/qualibooth-action:v1.0.4
```

### GitHub Actions — `docker run` (Full Control)

```yaml
- name: Run QualiBooth Scan via Docker
  run: |
    docker run --rm \
      -v "${{ github.workspace }}:/workspace" \
      -e QUALIBOOTH_ORG_UUID="${{ secrets.QUALIBOOTH_ORG_UUID }}" \
      -e QUALIBOOTH_REPO="${{ github.repository }}" \
      -e QUALIBOOTH_SHA="${{ github.sha }}" \
      -e QUALIBOOTH_BRANCH="${{ github.ref_name }}" \
      -e QUALIBOOTH_PROJECT_TYPE=react \
      ghcr.io/qualibooth/qualibooth-action:v1.0.4
```

### GitLab CI — Native Image

```yaml
qualibooth-scan:
  image: ghcr.io/qualibooth/qualibooth-action:v1.0.4
  variables:
    QUALIBOOTH_ORG_UUID: $QUALIBOOTH_ORG_UUID
    QUALIBOOTH_REPO: "$CI_PROJECT_PATH"
    QUALIBOOTH_SHA: "$CI_COMMIT_SHA"
    QUALIBOOTH_BRANCH: "$CI_COMMIT_BRANCH"
```

### GitLab CI — With `docker run`

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
        -e QUALIBOOTH_ORG_UUID="$QUALIBOOTH_ORG_UUID" \
        -e QUALIBOOTH_REPO="$CI_PROJECT_PATH" \
        -e QUALIBOOTH_SHA="$CI_COMMIT_SHA" \
        -e QUALIBOOTH_BRANCH="$CI_COMMIT_BRANCH" \
        ghcr.io/qualibooth/qualibooth-action:v1.0.4
```

### Jenkins (Jenkinsfile)

```groovy
pipeline {
    agent none
    stages {
        stage('Accessibility Scan') {
            steps {
                script {
                    def image = 'ghcr.io/qualibooth/qualibooth-action:v1.0.4'
                    sh """
                      docker run --rm \\
                        -v \${WORKSPACE}:/workspace \\
                        -e QUALIBOOTH_ORG_UUID=\${env.QUALIBOOTH_ORG_UUID} \\
                        -e QUALIBOOTH_REPO=\${env.GIT_URL.tokenize('/')[-2..-1].join('/')} \\
                        -e QUALIBOOTH_SHA=\${env.GIT_COMMIT} \\
                        -e QUALIBOOTH_BRANCH=master \\
                        ${image}
                    """
                }
            }
        }
    }
}
```

---

## Environment Variables

All configuration is passed via environment variables prefixed with `QUALIBOOTH_`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `QUALIBOOTH_ORG_UUID` | ✅ | — | Your QualiBooth organization UUID. Found in QualiBooth → Settings → Organization. |
| `QUALIBOOTH_REPO` | ✅ | — | Repository identifier in `owner/repo` format (e.g. `myorg/myproject`). |
| `QUALIBOOTH_SHA` | ✅ | — | Full 40-character commit SHA for the scanned revision. |
| `QUALIBOOTH_BRANCH` | — | `main` | Branch or tag name associated with this scan. |
| `QUALIBOOTH_PR_HEAD` | — | — | Source branch name for pull request events (takes precedence over `QUALIBOOTH_BRANCH`). |
| `QUALIBOOTH_PROJECT_TYPE` | — | `react` | Project type: `react`, `vue`, or `html`. Determines which ESLint accessibility plugin is used. |
| `QUALIBOOTH_SCAN_PATHS` | — | `src/` | Comma-separated list of directories or file paths to scan, relative to the workspace root. |
| `QUALIBOOTH_FAIL_ON_ISSUES` | — | `false` | Set to `true` to exit with code 1 when accessibility issues are found, failing the CI job. |
| `QUALIBOOTH_API_URL` | — | `https://pipelinein.qualibooth.com` | Override the QualiBooth API endpoint (useful for staging or self-hosted deployments). |
| `QUALIBOOTH_WORKSPACE` | — | `.` | Absolute path to the repository root inside the container. Use when mounting code via `-v`. |
| `QUALIBOOTH_OUTPUT` | — | `/tmp/qualibooth-output` | File path for writing structured output (e.g., issue count). Useful for downstream CI steps. |

### Output Variables

After the scan completes, the following is written to the file specified by `QUALIBOOTH_OUTPUT`:

| Key | Description |
|---|---|
| `ISSUES_FOUND` | Number of accessibility issues found (integer as string) |

---

## Advanced Usage

### Vue project with custom scan paths

```yaml
- uses: docker://ghcr.io/qualibooth/qualibooth-action:v1.0.4
  env:
    QUALIBOOTH_ORG_UUID: ${{ secrets.QUALIBOOTH_ORG_UUID }}
    QUALIBOOTH_REPO: ${{ github.repository }}
    QUALIBOOTH_SHA: ${{ github.sha }}
    QUALIBOOTH_BRANCH: ${{ github.ref_name }}
    QUALIBOOTH_PROJECT_TYPE: vue
    QUALIBOOTH_SCAN_PATHS: "src/components, src/views, src/layouts"
```

### Fail the build on issues

```yaml
- uses: docker://ghcr.io/qualibooth/qualibooth-action:v1.0.4
  env:
    QUALIBOOTH_ORG_UUID: ${{ secrets.QUALIBOOTH_ORG_UUID }}
    QUALIBOOTH_REPO: ${{ github.repository }}
    QUALIBOOTH_SHA: ${{ github.sha }}
    QUALIBOOTH_BRANCH: ${{ github.ref_name }}
    QUALIBOOTH_FAIL_ON_ISSUES: "true"
```

### Use the issue count in a later step (GitHub Actions)

```yaml
- name: Run QualiBooth Scan
  id: qualibooth
  uses: docker://ghcr.io/qualibooth/qualibooth-action:v1.0.4
  env:
    QUALIBOOTH_ORG_UUID: ${{ secrets.QUALIBOOTH_ORG_UUID }}
    QUALIBOOTH_REPO: ${{ github.repository }}
    QUALIBOOTH_SHA: ${{ github.sha }}
    QUALIBOOTH_BRANCH: ${{ github.ref_name }}

- name: Check results
  if: steps.qualibooth.outputs.ISSUES_FOUND != '0'
  run: echo "Found ${{ steps.qualibooth.outputs.ISSUES_FOUND }} accessibility issues. Check QualiBooth for details."
```

### Point at a staging API

```yaml
- uses: docker://ghcr.io/qualibooth/qualibooth-action:v1.0.4
  env:
    QUALIBOOTH_ORG_UUID: ${{ secrets.QUALIBOOTH_ORG_UUID }}
    QUALIBOOTH_REPO: ${{ github.repository }}
    QUALIBOOTH_SHA: ${{ github.sha }}
    QUALIBOOTH_BRANCH: ${{ github.ref_name }}
    QUALIBOOTH_API_URL: https://pipelinein.staging.qualibooth.com
```

---

## Project Types

### React (`QUALIBOOTH_PROJECT_TYPE=react`)

Uses [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) with the `recommended` ruleset.

Scans: `.js` `.jsx` `.ts` `.tsx`

Example rules: `jsx-a11y/alt-text`, `jsx-a11y/anchor-is-valid`, `jsx-a11y/label-has-associated-control`

### Vue (`QUALIBOOTH_PROJECT_TYPE=vue`)

Uses [`eslint-plugin-vuejs-accessibility`](https://github.com/vue-a11y/eslint-plugin-vuejs-accessibility) with the `recommended` ruleset.

Scans: `.vue` `.js`

Example rules: `vuejs-accessibility/alt-text`, `vuejs-accessibility/anchor-is-valid`

### HTML (`QUALIBOOTH_PROJECT_TYPE=html`)

Uses [`eslint-plugin-html`](https://github.com/BenoitZugmeyer/eslint-plugin-html) to extract inline scripts from HTML files, then applies `eslint-plugin-jsx-a11y` rules.

Scans: `.html` `.htm` `.js`

---

## How It Works

1. The Docker image runs ESLint with the appropriate accessibility plugin for your `project-type`
2. Only accessibility rule violations are collected (rules prefixed `jsx-a11y/` or `vuejs-accessibility/`) — no other ESLint rules are applied or reported
3. Results are POSTed to `/metrics-sca/vertices/in` with the org UUID in the `authorization` header and repo, branch, commit SHA, and the full issue list in the body
4. Your QualiBooth dashboard shows the new scan run immediately

---

## Building the Docker Image Locally

```bash
docker build -f .docker/Dockerfile -t qualibooth-action:local .
```

After making source changes, rebuild `dist/` first:

```bash
npm install
npm run build
```

Then tag and push to GHCR (requires `packages: write` permission):

```bash
git tag v1.x.x
git push --follow-tags
```

The `.github/workflows/docker-publish.yml` workflow publishes automatically on `v*` tags.

---

## Troubleshooting

**HTTP 401 — Unauthorized**
Your `QUALIBOOTH_ORG_UUID` is missing or incorrect. Copy it exactly from QualiBooth → Settings → Organization.

**HTTP 422 — Unprocessable Entity**
The org UUID value is not a valid UUID. Copy it exactly from QualiBooth → Settings → Organization.

**No issues found / zero results**
Check that `QUALIBOOTH_SCAN_PATHS` points to a directory that exists in your workspace and contains the right file types for your `project-type`. Paths are relative to the repository root.

**Plugin or parse errors in the log**
Make sure `QUALIBOOTH_PROJECT_TYPE` matches your actual framework. Using `react` for a Vue project will result in parse errors on `.vue` files.

**Missing required environment variable error**
The entrypoint requires `QUALIBOOTH_ORG_UUID`, `QUALIBOOTH_REPO`, and `QUALIBOOTH_SHA`. On non-GitHub CIs, map them from your CI's built-in variables (e.g., `$CI_PROJECT_PATH`, `$CI_COMMIT_SHA`). See the examples above for each platform.

**Wrong results branch or repo name**
Ensure `QUALIBOOTH_REPO` is in `owner/repo` format. For pull requests, set `QUALIBOOTH_PR_HEAD` to the source branch — it takes precedence over `QUALIBOOTH_BRANCH`.
