#!/usr/bin/env node
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')

const PROJECT_ID = 'foco-os---produtividade-bfb58'
const RULES_PATH = path.join(__dirname, '..', 'firestore.rules')

function request(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const bodyStr = body ? JSON.stringify(body) : null
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }
    const req = https.request(opts, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

async function main() {
  // Load token from configstore
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const token = config?.tokens?.access_token
  if (!token) { console.error('No access token found in configstore'); process.exit(1) }
  console.log('Token loaded, deploying rules...')

  const rulesContent = fs.readFileSync(RULES_PATH, 'utf8')
  console.log(`Rules file: ${rulesContent.length} chars`)

  // Step 1: Check current release
  const releaseRes = await request('GET',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    null, token)
  if (releaseRes.status === 200) {
    console.log('Current ruleset:', releaseRes.body.rulesetName)
    console.log('Updated at:', releaseRes.body.updateTime)
  } else {
    console.log('Release check result:', releaseRes.status, JSON.stringify(releaseRes.body))
  }

  // Step 2: Create new ruleset
  console.log('\nCreating new ruleset...')
  const createRes = await request('POST',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    { source: { files: [{ name: 'firestore.rules', content: rulesContent }] } },
    token)

  if (createRes.status !== 200) {
    console.error('Failed to create ruleset:', createRes.status, JSON.stringify(createRes.body, null, 2))

    // Token might be expired - try refreshing
    if (createRes.status === 401 && config?.tokens?.refresh_token) {
      console.log('Token expired, refresh needed...')
    }
    process.exit(1)
  }

  const rulesetName = createRes.body.name
  console.log('Ruleset created:', rulesetName)

  // Step 3: Release as active (Firebase Admin SDK wraps body in { release: ... })
  console.log('\nReleasing as active Firestore ruleset...')
  const patchRes = await request('PATCH',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    { release: { name: `projects/${PROJECT_ID}/releases/cloud.firestore`, rulesetName } },
    token)

  if (patchRes.status === 200) {
    console.log('\n✅ SUCCESS! Firestore rules deployed.')
    console.log('Ruleset:', patchRes.body.rulesetName)
    console.log('Updated:', patchRes.body.updateTime)
  } else {
    console.log('PATCH status:', patchRes.status, JSON.stringify(patchRes.body, null, 2))
    // Try without wrapper
    console.log('\nTrying without release wrapper...')
    const patch2Res = await request('PATCH',
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
      { name: `projects/${PROJECT_ID}/releases/cloud.firestore`, ruleset_name: rulesetName },
      token)
    if (patch2Res.status === 200) {
      console.log('\n✅ SUCCESS! Firestore rules deployed.')
    } else {
      console.error('All attempts failed:', patch2Res.status, JSON.stringify(patch2Res.body, null, 2))
      process.exit(1)
    }
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
