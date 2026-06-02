'use strict'

const core = require('@actions/core')
const github = require('@actions/github')
const path = require('path')
const { runEslint } = require('./eslint-runner')
const { postScanResults } = require('./api-client')

async function run() {
  try {
    const orgUuid      = core.getInput('org-uuid', { required: true })
    const apiToken     = core.getInput('api-token', { required: true })
    const projectType  = core.getInput('project-type') || 'react'
    const scanPathsRaw = core.getInput('scan-paths') || 'src/'
    const failOnIssues = core.getInput('fail-on-issues') === 'true'
    const apiUrl       = core.getInput('api-url') || 'https://api.qualibooth.com'

    // GITHUB_HEAD_REF is set on pull_request events (the source branch name)
    // GITHUB_REF_NAME is set on push events
    const rawRepo   = process.env.GITHUB_REPOSITORY || ''
    const repo      = rawRepo.split('/')[1] || rawRepo
    const branch    = process.env.GITHUB_HEAD_REF
                   || process.env.GITHUB_REF_NAME
                   || github.context.ref.replace('refs/heads/', '')
    const fullSha   = process.env.GITHUB_SHA || github.context.sha || ''
    const commitSha = fullSha.slice(0, 7)
    const repoRoot  = process.env.GITHUB_WORKSPACE || path.resolve('.')

    const scanPaths = scanPathsRaw
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)

    core.info(`QualiBooth: project-type=${projectType}`)
    core.info(`Repo: ${repo} | Branch: ${branch} | Commit: ${commitSha}`)
    core.info(`Scanning paths: ${scanPaths.join(', ')}`)

    core.info('Running ESLint accessibility analysis...')
    const issues = await runEslint(projectType, scanPaths, repoRoot)
    core.info(`Found ${issues.length} accessibility issue(s)`)

    core.setOutput('issues-found', String(issues.length))

    core.info('Posting results to QualiBooth API...')
    const response = await postScanResults({
      apiUrl,
      apiToken,
      orgUuid,
      repo,
      branch,
      commitSha,
      issues,
    })
    core.info(`Results accepted. Run ID: ${response.runUuid || 'n/a'} | Accepted: ${response.accepted ?? issues.length}`)

    if (failOnIssues && issues.length > 0) {
      core.setFailed(
        `Found ${issues.length} accessibility issue(s). Set fail-on-issues: false to allow the build to pass.`
      )
    }

  } catch (error) {
    core.setFailed(`QualiBooth Action failed: ${error.message}`)
  }
}

run()
