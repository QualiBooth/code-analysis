'use strict'

const path = require('path')
const { ESLint } = require('eslint')
const { getConfigForProjectType } = require('./eslint-configs')

const A11Y_RULE_PREFIXES = ['jsx-a11y/', 'vuejs-accessibility/']

function isA11yRule(ruleId) {
  if (!ruleId) return false
  return A11Y_RULE_PREFIXES.some(prefix => ruleId.startsWith(prefix))
}

function mapSeverity(severityNum) {
  return severityNum === 2 ? 'error' : 'warning'
}

async function runEslint(projectType, scanPaths, repoRoot) {
  const overrideConfig = getConfigForProjectType(projectType)

  const eslint = new ESLint({
    cwd: repoRoot,
    overrideConfigFile: true,
    overrideConfig,
    errorOnUnmatchedPattern: false,
  })

  const absolutePaths = scanPaths.map(p =>
    path.isAbsolute(p) ? p : path.join(repoRoot, p)
  )

  const results = await eslint.lintFiles(absolutePaths)

  const issues = []

  for (const result of results) {
    const relativePath = path.relative(repoRoot, result.filePath).replace(/\\/g, '/')

    for (const message of result.messages) {
      if (!isA11yRule(message.ruleId)) continue

      issues.push({
        file: relativePath,
        line: message.line || 1,
        column: message.column || 1,
        rule: message.ruleId,
        message: message.message,
        severity: mapSeverity(message.severity),
      })
    }
  }

  return issues
}

module.exports = { runEslint }
