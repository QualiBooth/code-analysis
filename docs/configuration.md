# Configuration Reference

All configuration is passed via environment variables prefixed with `QUALIBOOTH_`.

---

## `QUALIBOOTH_ORG_UUID` (required)

Your QualiBooth organization UUID. This is a UUID v4 string (e.g. `3fa85f64-5717-4562-b3fc-2c963f66afa6`).

Find it in QualiBooth → Settings → Organization.

Store it as a secret/variable in your CI system and pass it via the `QUALIBOOTH_ORG_UUID` environment variable.

---

## `QUALIBOOTH_REPO` (required)

Repository identifier in `owner/repo` format (e.g. `myorg/myproject`). The image uses this to label scan results on the QualiBooth dashboard.

Map from your CI's built-in variables:
- GitHub Actions: `${{ github.repository }}`
- GitLab CI: `$CI_PROJECT_PATH`
- Jenkins: `${env.GIT_URL.tokenize('/')[-2..-1].join('/')}`

---

## `QUALIBOOTH_SHA` (required)

Full 40-character commit SHA for the scanned revision. Map from your CI's built-in variables:
- GitHub Actions: `${{ github.sha }}`
- GitLab CI: `$CI_COMMIT_SHA`
- Jenkins: `${env.GIT_COMMIT}`

---

## `QUALIBOOTH_BRANCH` (default: `main`)

Branch or tag name associated with this scan. Map from your CI's built-in variables:
- GitHub Actions: `${{ github.ref_name }}`
- GitLab CI: `$CI_COMMIT_BRANCH`
- Jenkins: `master` (or your target branch)

---

## `QUALIBOOTH_PR_HEAD` (optional)

Source branch name for pull request events. When set, this takes precedence over `QUALIBOOTH_BRANCH`. Use this on PR pipelines so the dashboard shows the source branch rather than the target.

Map from your CI's built-in variables:
- GitHub Actions: `${{ github.event.pull_request.head.ref }}` (or rely on auto-detection)
- GitLab CI: `$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME`

---

## `QUALIBOOTH_PROJECT_TYPE` (default: `react`)

Controls which ESLint plugin and parser are used for the scan.

| Value | ESLint Plugin | Parser | Scanned Extensions |
|---|---|---|---|
| `react` | `eslint-plugin-jsx-a11y` | Default (espree) | `.js .jsx .ts .tsx` |
| `vue` | `eslint-plugin-vuejs-accessibility` | `vue-eslint-parser` | `.vue .js` |
| `html` | `eslint-plugin-html` + `eslint-plugin-jsx-a11y` | Default (espree) | `.html .htm .js` |

---

## `QUALIBOOTH_SCAN_PATHS` (default: `src/`)

Comma-separated list of file paths or directories to scan. Paths are relative to the workspace root (see `QUALIBOOTH_WORKSPACE`).

Examples:

```
# Single directory
QUALIBOOTH_SCAN_PATHS=src/

# Multiple directories
QUALIBOOTH_SCAN_PATHS="src/components, src/views, src/pages"

# Mix
QUALIBOOTH_SCAN_PATHS="src/components, pages/, app/layouts"
```

If a path does not exist or contains no matching files, the action logs a warning and continues — it does not fail.

---

## `QUALIBOOTH_FAIL_ON_ISSUES` (default: `false`)

When set to `true`, the container exits with code 1 if any accessibility issues are found. This causes the CI job to fail and can block PR merges when branch protection rules require passing checks.

Even with `QUALIBOOTH_FAIL_ON_ISSUES=true`, results are always posted to QualiBooth before the failure is raised.

---

## `QUALIBOOTH_API_URL` (default: `https://pipelinein.qualibooth.com`)

The base URL for the QualiBooth API. Override this for:

- **Staging** environments: `https://pipelinein.staging.qualibooth.com`
- **Self-hosted** deployments: `https://qualibooth.your-company.com`
- **Local development**: `http://localhost:3000`

The action appends `/metrics-sca/vertices/in` to whatever URL you provide.

---

## `QUALIBOOTH_WORKSPACE` (default: `.`)

Absolute path to the repository root inside the container. When mounting code via `-v`, set this to match your mount point:

```yaml
docker run --rm \
  -v "${{ github.workspace }}:/workspace" \
  -e QUALIBOOTH_WORKSPACE=/workspace \
  ...
```

---

## `QUALIBOOTH_OUTPUT` (default: `/tmp/qualibooth-output`)

File path for writing structured output. After the scan, the file will contain key=value pairs such as:

```
ISSUES_FOUND=3
```

Useful for downstream CI steps that need to read the issue count from outside the container. Mount a shared volume or bind-mount if you need to access this file post-scan.

---

## ESLint Configuration Details

The action runs ESLint with `overrideConfigFile: false`, which means it completely ignores any `eslint.config.js`, `.eslintrc.json`, or other ESLint configuration files in the user's repository. This is intentional — the action is isolated from project-specific lint rules so that only accessibility issues reach the QualiBooth API.

### React config (effective)

```js
[
  {
    plugins: { 'jsx-a11y': jsxA11yPlugin },
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: jsxA11yPlugin.flatConfigs.recommended.rules,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
]
```

### Vue config (effective)

```js
[
  // all configs from vuejs-accessibility flatConfigs['flat/recommended']
  ...vueA11yPlugin.configs['flat/recommended'],
  {
    files: ['**/*.vue', '**/*.js'],
    plugins: { vue: vuePlugin },
    languageOptions: {
      parser: vueEslintParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
  },
]
```

### HTML config (effective)

```js
[
  {
    plugins: { html: htmlPlugin, 'jsx-a11y': jsxA11yPlugin },
    files: ['**/*.{html,htm}'],
    processor: htmlPlugin.processors['.html'],
    rules: jsxA11yPlugin.flatConfigs.recommended.rules,
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
  {
    plugins: { 'jsx-a11y': jsxA11yPlugin },
    files: ['**/*.js'],
    rules: jsxA11yPlugin.flatConfigs.recommended.rules,
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
]
```

---

## Rule Filtering

The action only forwards messages whose `ruleId` starts with one of these prefixes to the QualiBooth API:

- `jsx-a11y/` — React and HTML accessibility rules
- `vuejs-accessibility/` — Vue accessibility rules

All other ESLint messages (syntax errors, style rules, etc.) are silently dropped. This keeps the QualiBooth dashboard focused on accessibility issues only.

---

## API Payload

The action POSTs the following JSON to `{api-url}/metrics-sca/vertices/in` with the org UUID sent as the `authorization` header:

```json
{
  "orgUuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "repo": "my-frontend",
  "branch": "main",
  "commitSha": "a1b2c3d",
  "issues": [
    {
      "file": "src/components/ProductCard.jsx",
      "line": 42,
      "column": 5,
      "rule": "jsx-a11y/alt-text",
      "message": "img elements must have an alt prop.",
      "severity": "error"
    }
  ]
}
```

An empty `issues` array is a valid payload — it records a clean scan run with zero issues.

---

## Extending the ESLint Config

Because the action ignores the repository's ESLint config entirely, you cannot extend the built-in rule set via `.eslintrc` or `eslint.config.js` in your project.

If you need a custom rule set:

1. Fork this repository
2. Edit `src/eslint-configs/<type>.js` for your project type
3. Run `npm install && npm run build` to rebuild `dist/`
4. Build and reference your own Docker image

---

## Troubleshooting

**`Cannot find module 'vue-eslint-parser'` or similar**

This should not happen with the pre-built `dist/index.js` since all dependencies are bundled. If you see this, you may be running `src/index.js` directly instead of `dist/index.js`. Run `npm run build` first.

**Vue `.vue` files are not being scanned**

Confirm `QUALIBOOTH_PROJECT_TYPE=vue` is set. Also check that the paths in `QUALIBOOTH_SCAN_PATHS` include the directory containing your `.vue` files.

**HTML files return no issues**

`eslint-plugin-html` only lints the JavaScript inside `<script>` tags. If your HTML files have no inline scripts, no issues will be found — this is expected. For linting HTML attributes (like missing `alt` on `<img>` tags written in plain HTML without JS), you would need a different tool such as axe-core.

**The action reports 0 issues but I know there are violations**

Check that:
1. `QUALIBOOTH_SCAN_PATHS` includes the correct directories
2. `QUALIBOOTH_PROJECT_TYPE` matches your actual framework
3. The violations are covered by `jsx-a11y` or `vuejs-accessibility` recommended rules (not all accessibility issues are detected by ESLint)

**API timeout**

The action times out HTTP requests after 30 seconds. If the QualiBooth API is unreachable, the action will fail with a timeout error. Check your network/firewall rules or the QualiBooth status page.
