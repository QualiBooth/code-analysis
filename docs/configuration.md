# Configuration Reference

## All Inputs

### `org-uuid` (required)

Your QualiBooth organization UUID. This is a UUID v4 string (e.g. `3fa85f64-5717-4562-b3fc-2c963f66afa6`).

Find it in QualiBooth → Settings → Organization.

Store it as a GitHub secret (`QUALIBOOTH_ORG_UUID`) and reference it via `${{ secrets.QUALIBOOTH_ORG_UUID }}`.

---

### `project-type` (default: `react`)

Controls which ESLint plugin and parser are used for the scan.

| Value | ESLint Plugin | Parser | Scanned Extensions |
|---|---|---|---|
| `react` | `eslint-plugin-jsx-a11y` | Default (espree) | `.js .jsx .ts .tsx` |
| `vue` | `eslint-plugin-vuejs-accessibility` | `vue-eslint-parser` | `.vue .js` |
| `html` | `eslint-plugin-html` + `eslint-plugin-jsx-a11y` | Default (espree) | `.html .htm .js` |

---

### `scan-paths` (default: `src/`)

Comma-separated list of file paths or directories to scan. Paths are relative to the repository root (i.e., relative to `GITHUB_WORKSPACE` after `actions/checkout`).

Examples:

```yaml
# Single directory
scan-paths: "src/"

# Multiple directories
scan-paths: "src/components, src/views, src/pages"

# Glob pattern
scan-paths: "src/**/*.jsx"

# Mix
scan-paths: "src/components, pages/, app/layouts"
```

If a path does not exist or contains no matching files, the action logs a warning and continues — it does not fail.

---

### `fail-on-issues` (default: `false`)

When set to `true`, the action exits with a non-zero code if any accessibility issues are found. This causes the GitHub Actions step to be marked as failed and can block PR merges when branch protection rules require passing checks.

```yaml
fail-on-issues: true
```

Even with `fail-on-issues: true`, results are always posted to QualiBooth before the failure is raised.

---

### `api-url` (default: `https://pipelinein.qualibooth.com`)

The base URL for the QualiBooth API. Override this for:

- **Staging** environments: `https://pipelinein.staging.qualibooth.com`
- **Self-hosted** deployments: `https://qualibooth.your-company.com`
- **Local development**: `http://localhost:3000`

The action appends `/metrics-sca/vertices/in` to whatever URL you provide.

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
4. Reference your fork in the workflow: `uses: your-org/QualiBooth-Action@your-branch`

---

## Troubleshooting

**`Cannot find module 'vue-eslint-parser'` or similar**

This should not happen with the pre-built `dist/index.js` since all dependencies are bundled. If you see this, you may be running `src/index.js` directly instead of `dist/index.js`. Run `npm run build` first.

**Vue `.vue` files are not being scanned**

Confirm `project-type: vue` is set. Also check that the paths in `scan-paths` include the directory containing your `.vue` files.

**HTML files return no issues**

`eslint-plugin-html` only lints the JavaScript inside `<script>` tags. If your HTML files have no inline scripts, no issues will be found — this is expected. For linting HTML attributes (like missing `alt` on `<img>` tags written in plain HTML without JS), you would need a different tool such as axe-core.

**The action reports 0 issues but I know there are violations**

Check that:
1. `scan-paths` includes the correct directories
2. `project-type` matches your actual framework
3. The violations are covered by `jsx-a11y` or `vuejs-accessibility` recommended rules (not all accessibility issues are detected by ESLint)

**API timeout**

The action times out HTTP requests after 30 seconds. If the QualiBooth API is unreachable, the action will fail with a timeout error. Check your network/firewall rules or the QualiBooth status page.
