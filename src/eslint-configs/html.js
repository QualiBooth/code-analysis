'use strict'

const htmlPlugin = require('@html-eslint/eslint-plugin')
const jsxA11y = require('eslint-plugin-jsx-a11y')

function getHtmlConfig() {
  return [
    {
      ...htmlPlugin.configs['flat/recommended'],
      files: ['**/*.{html,htm}'],
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
