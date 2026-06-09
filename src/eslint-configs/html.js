'use strict'

const htmlPlugin = require('eslint-plugin-html')
const jsxA11y = require('eslint-plugin-jsx-a11y')

function getHtmlConfig() {
  return [
    {
      plugins: {
        html: htmlPlugin,
        'jsx-a11y': jsxA11y,
      },
      files: ['**/*.{html,htm}'],
      rules: jsxA11y.flatConfigs.recommended.rules,
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
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
