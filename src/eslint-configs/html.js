'use strict'

const htmlPlugin = require('@html-eslint/eslint-plugin')
const jsxA11y = require('eslint-plugin-jsx-a11y')

function getHtmlConfig() {
  return [
    {
      ...htmlPlugin.configs['flat/recommended'],
      files: ['**/*.{html,htm}'],
      rules: {
        // Accessibility
        '@html-eslint/require-img-alt': 'error',
        '@html-eslint/require-input-label': 'error',
        '@html-eslint/no-abstract-roles': 'error',
        '@html-eslint/no-invalid-role': 'error',
        '@html-eslint/no-aria-hidden-body': 'error',
        '@html-eslint/no-aria-hidden-on-focusable': 'error',
        '@html-eslint/require-content': 'error',
        '@html-eslint/require-frame-title': 'warn',
        '@html-eslint/no-positive-tabindex': 'warn',
        '@html-eslint/no-non-scalable-viewport': 'warn',
        '@html-eslint/require-meta-viewport': 'warn',
        '@html-eslint/no-accesskey-attrs': 'warn',
        '@html-eslint/no-empty-headings': 'warn',
        '@html-eslint/no-heading-inside-button': 'warn',
        '@html-eslint/no-redundant-role': 'warn',
        '@html-eslint/no-skip-heading-levels': 'warn',
        '@html-eslint/require-form-method': 'warn',
        // Best Practice (a11y-relevant)
        '@html-eslint/no-duplicate-id': 'error',
        '@html-eslint/no-duplicate-attrs': 'error',
        '@html-eslint/no-nested-interactive': 'error',
        '@html-eslint/no-invalid-attr-value': 'warn',
        '@html-eslint/no-invalid-entity': 'warn',
        '@html-eslint/no-obsolete-attrs': 'warn',
        '@html-eslint/no-obsolete-tags': 'warn',
        '@html-eslint/no-target-blank': 'warn',
        '@html-eslint/require-button-type': 'warn',
        '@html-eslint/require-closing-tags': 'warn',
        '@html-eslint/require-details-summary': 'warn',
        '@html-eslint/require-doctype': 'warn',
        '@html-eslint/require-li-container': 'warn',
        // SEO (screen-reader relevant)
        '@html-eslint/require-lang': 'error',
        '@html-eslint/require-title': 'warn',
        '@html-eslint/no-multiple-h1': 'warn',
      },
    },
    {
      plugins: { 'jsx-a11y': jsxA11y },
      files: ['**/*.js'],
      rules: jsxA11y.flatConfigs.recommended.rules,
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
  ]
}

module.exports = { getHtmlConfig }
