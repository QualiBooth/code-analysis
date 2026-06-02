'use strict'

const https = require('https')
const http = require('http')
const { URL } = require('url')

async function postScanResults({ apiUrl, apiToken, orgUuid, repo, branch, commitSha, issues }) {
  const url = new URL('/code-analysis/scan-results', apiUrl)
  const body = JSON.stringify({ orgUuid, repo, branch, commitSha, issues })

  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http

    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization': `Bearer ${apiToken}`,
          'User-Agent': 'QualiBooth-Action/1.0',
        },
      },
      (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data))
            } catch {
              resolve({ raw: data })
            }
          } else {
            reject(new Error(`API responded with HTTP ${res.statusCode}: ${data}`))
          }
        })
      }
    )

    req.on('error', reject)

    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out after 30 seconds'))
    })

    req.write(body)
    req.end()
  })
}

module.exports = { postScanResults }
