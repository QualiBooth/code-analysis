'use strict'

const jsxA11y = require('eslint-plugin-jsx-a11y')

function getReactConfig() {
  return [
    {
      plugins: { 'jsx-a11y': jsxA11y },
      files: ['**/*.{js,jsx,ts,tsx}'],
      rules: jsxA11y.flatConfigs.recommended.rules,
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
    },
  ]
}

module.exports = { getReactConfig }
