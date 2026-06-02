'use strict'

const vueA11y = require('eslint-plugin-vuejs-accessibility')
const vuePlugin = require('eslint-plugin-vue')
const vueParser = require('vue-eslint-parser')

function getVueConfig() {
  const a11yConfigs = vueA11y.configs['flat/recommended'] || [
    {
      plugins: { 'vuejs-accessibility': vueA11y },
      rules: vueA11y.configs.recommended.rules,
    },
  ]

  return [
    ...a11yConfigs,
    {
      files: ['**/*.vue', '**/*.js'],
      plugins: { vue: vuePlugin },
      languageOptions: {
        parser: vueParser,
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
      },
    },
  ]
}

module.exports = { getVueConfig }
