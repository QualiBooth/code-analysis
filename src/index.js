'use strict'

const fs = require('fs')
const path = require('path')
const { runEslint } = require('./eslint-runner')
const { postScanResults } = require('./api-client')

function getEnv(name) {
  return process.env['QUALIBOOTH_' + name] || ''
}

function setOutput(name, value) {
  const outputPath = process.env.QUALIBOOTH_OUTPUT
  if (outputPath) {
    fs.appendFileSync(outputPath, `${name}=${value}\n`)
  } else {
    console.log(`${name}=${value}`)
  }
}

async function run() {
  try {
    const orgUuid      = getEnv('ORG_UUID')
    if (!orgUuid) throw new Error('QUALIBOOTH_ORG_UUID is required')

    const projectType  = getEnv('PROJECT_TYPE') || 'react'
    const scanPathsRaw = getEnv('SCAN_PATHS') || '.'
    const failOnIssues = getEnv('FAIL_ON_ISSUES') === 'true'
    const apiUrl       = getEnv('API_URL') || 'https://pipelinein.prod.qualibooth.com'

    const rawRepo   = getEnv('REPO') || ''
    const repo      = rawRepo.split('/')[1] || rawRepo
    const branch    = getEnv('PR_HEAD') || getEnv('BRANCH') || ''
    const fullSha   = getEnv('SHA') || ''
    const commitSha = fullSha.slice(0, 7)
    const repoRoot  = process.env.GITHUB_WORKSPACE || path.resolve('.')

    console.log(`QualiBooth: project-type=${projectType}`)
    console.log(`Repo: ${repo} | Branch: ${branch} | Commit: ${commitSha}`)
    console.log(`Scanning paths: ${scanPathsRaw.split(',').map(p => p.trim()).filter(Boolean).join(', ')}`)

    const scanPaths = scanPathsRaw
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)

    console.log('Running ESLint accessibility analysis...')
    const issues = await runEslint(projectType, scanPaths, repoRoot)
    console.log(`Found ${issues.length} accessibility issue(s)`)

    setOutput('ISSUES_FOUND', String(issues.length))

    console.log('Posting results to QualiBooth API...')
    const response = await postScanResults({
      apiUrl,
      orgUuid,
      repo,
      branch,
      commitSha,
      issues,
    })
    console.log(`Results accepted. Run ID: ${response.runUuid || 'n/a'} | Accepted: ${response.accepted ?? issues.length}`)

    if (failOnIssues && issues.length > 0) {
      console.error(
        `Found ${issues.length} accessibility issue(s). Set QUALIBOOTH_FAIL_ON_ISSUES=false to allow the build to pass.`
      )
      process.exit(1)
    }

  } catch (error) {
    console.error(`QualiBooth failed: ${error.message}`)
    process.exit(1)
  }
}

run()
