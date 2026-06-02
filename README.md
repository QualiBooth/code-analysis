# QualiBooth Accessibility Code Analysis

A GitHub Action that scans your codebase for accessibility issues using ESLint and reports results to your [QualiBooth](https://qualibooth.com) dashboard.

Supports **React**, **Vue 3**, and **HTML** projects.

---

## Prerequisites

Before adding the action to your workflow, add two secrets to your repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Where to find it |
|---|---|
| `QUALIBOOTH_ORG_UUID` | QualiBooth dashboard → Settings → Organization |
| `QUALIBOOTH_API_TOKEN` | QualiBooth dashboard → Settings → API Tokens → Generate |

---

## Quick Start

Create `.github/workflows/qualibooth.yml` in your repository:

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
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run QualiBooth Code Analysis
        uses: qualibooth/QualiBooth-Action@v1
        with:
          org-uuid: ${{ secrets.QUALIBOOTH_ORG_UUID }}
          api-token: ${{ secrets.QUALIBOOTH_API_TOKEN }}
```

That's it. Results appear in your QualiBooth dashboard after each push.

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `org-uuid` | ✅ | — | Your QualiBooth organization UUID |
| `api-token` | ✅ | — | Your QualiBooth API token |
| `project-type` | — | `react` | Project type: `react`, `vue`, or `html` |
| `scan-paths` | — | `src/` | Comma-separated paths to scan |
| `fail-on-issues` | — | `false` | Set to `true` to fail the build when issues are found |
| `api-url` | — | `https://api.qualibooth.com` | Override for staging or self-hosted deployments |

## Outputs

| Output | Description |
|---|---|
| `issues-found` | Number of accessibility issues found (as a string) |

---

## Project Types

### React (`project-type: react`)

Uses [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) with the `recommended` ruleset.

Scans: `.js` `.jsx` `.ts` `.tsx`

Example rules: `jsx-a11y/alt-text`, `jsx-a11y/anchor-is-valid`, `jsx-a11y/label-has-associated-control`

### Vue (`project-type: vue`)

Uses [`eslint-plugin-vuejs-accessibility`](https://github.com/vue-a11y/eslint-plugin-vuejs-accessibility) with the `recommended` ruleset.

Scans: `.vue` `.js`

Example rules: `vuejs-accessibility/alt-text`, `vuejs-accessibility/anchor-is-valid`

### HTML (`project-type: html`)

Uses [`eslint-plugin-html`](https://github.com/BenoitZugmeyer/eslint-plugin-html) to extract inline scripts from HTML files, then applies `eslint-plugin-jsx-a11y` rules.

Scans: `.html` `.htm` `.js`

---

## Advanced Usage

### Vue project

```yaml
- uses: qualibooth/QualiBooth-Action@v1
  with:
    org-uuid: ${{ secrets.QUALIBOOTH_ORG_UUID }}
    api-token: ${{ secrets.QUALIBOOTH_API_TOKEN }}
    project-type: vue
    scan-paths: "src/components, src/views, src/layouts"
```

### Fail the build on issues

```yaml
- uses: qualibooth/QualiBooth-Action@v1
  with:
    org-uuid: ${{ secrets.QUALIBOOTH_ORG_UUID }}
    api-token: ${{ secrets.QUALIBOOTH_API_TOKEN }}
    fail-on-issues: true
```

### Use the `issues-found` output in a later step

```yaml
- uses: qualibooth/QualiBooth-Action@v1
  id: qualibooth
  with:
    org-uuid: ${{ secrets.QUALIBOOTH_ORG_UUID }}
    api-token: ${{ secrets.QUALIBOOTH_API_TOKEN }}

- name: Comment on PR
  if: steps.qualibooth.outputs.issues-found != '0'
  run: echo "Found ${{ steps.qualibooth.outputs.issues-found }} accessibility issues. Check QualiBooth for details."
```

### Point at a staging API

```yaml
- uses: qualibooth/QualiBooth-Action@v1
  with:
    org-uuid: ${{ secrets.QUALIBOOTH_ORG_UUID }}
    api-token: ${{ secrets.QUALIBOOTH_API_TOKEN }}
    api-url: https://api.staging.qualibooth.com
```

---

## How It Works

1. `actions/checkout` checks out your repository to `GITHUB_WORKSPACE`
2. The action runs ESLint with the appropriate accessibility plugin for your `project-type`
3. Only accessibility rule violations are collected (rules prefixed `jsx-a11y/` or `vuejs-accessibility/`) — no other ESLint rules are applied or reported
4. Results are POSTed to `/code-analysis/scan-results` with repo, branch, commit SHA, and the full issue list
5. Your QualiBooth dashboard shows the new scan run immediately

---

## Releases and `dist/`

This action bundles all dependencies into `dist/index.js` using [`@vercel/ncc`](https://github.com/vercel/ncc). The `dist/` directory **must be committed** on release tags so GitHub Actions can run the action without installing `node_modules`.

To build after making source changes:

```bash
npm install
npm run build
git add dist/
git commit -m "chore: rebuild dist"
git tag v1.x.x
git push --follow-tags
```

---


## Troubleshooting

**HTTP 401 — Unauthorized**
Your `QUALIBOOTH_API_TOKEN` secret is missing or expired. Generate a new token in QualiBooth → Settings → API Tokens and update the secret.

**HTTP 422 — Unprocessable Entity**
The `org-uuid` value is not a valid UUID. Copy it exactly from QualiBooth → Settings → Organization.

**No issues found / zero results**
Check that `scan-paths` points to a directory that exists in your repository and contains the right file types for your `project-type`. Paths are relative to the repository root.

**Plugin or parse errors in the action log**
Make sure `project-type` matches your actual framework. Using `react` for a Vue project will result in parse errors on `.vue` files.
