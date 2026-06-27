'use strict'

const fs = require('fs')
const path = require('path')
const { runEslint } = require('./eslint-runner')
const { postScanResults } = require('./api-client')

function getInput(name) {
  const envKey = 'INPUT_' + name.toUpperCase().replace(/-/g, '_')
  return process.env[envKey] || ''
}

function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT
  if (outputPath) {
    fs.appendFileSync(outputPath, `${name}=${value}\n`)
  } else {
    console.log(`${name}=${value}`)
  }
}

async function run() {
  try {
    const orgUuid      = getInput('org-uuid') || process.env.QUALIBOOTH_ORG_UUID
    if (!orgUuid) throw new Error('INPUT_ORG_UUID is required (set QUALIBOOTH_ORG_UUID for non-GitHub CIs)')

    const projectType  = getInput('project-type') || 'react'
    const scanPathsRaw = getInput('scan-paths') || 'src/'
    const failOnIssues = getInput('fail-on-issues') === 'true'
    const apiUrl       = getInput('api-url') || 'https://pipelinein.qualibooth.com'

    const rawRepo   = process.env.GITHUB_REPOSITORY || ''
    const repo      = rawRepo.split('/')[1] || rawRepo
    const branch    = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || ''
    const fullSha   = process.env.GITHUB_SHA || ''
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

    setOutput('issues-found', String(issues.length))

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
        `Found ${issues.length} accessibility issue(s). Set fail-on-issues: false to allow the build to pass.`
      )
      process.exit(1)
    }

  } catch (error) {
    console.error(`QualiBooth Action failed: ${error.message}`)
    process.exit(1)
  }
}

run()
