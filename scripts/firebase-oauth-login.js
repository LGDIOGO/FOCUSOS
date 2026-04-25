#!/usr/bin/env node
/**
 * Standalone Firebase OAuth2 login + Firestore rules deploy.
 * Uses Firebase CLI's own client_id/secret to get an access token,
 * then deploys firestore.rules via the Security Rules REST API.
 */
const http = require('http')
const https = require('https')
const crypto = require('crypto')
const { exec, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi'
const PROJECT_ID = 'foco-os---produtividade-bfb58'
const PORT = 9005
const REDIRECT_URI = `http://localhost:${PORT}`
const SCOPES = [
  'email',
  'openid',
  'https://www.googleapis.com/auth/cloudplatformprojects.readonly',
  'https://www.googleapis.com/auth/firebase',
  'https://www.googleapis.com/auth/cloud-platform',
].join(' ')

const RULES_PATH = path.join(__dirname, '..', 'firestore.rules')

function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const body = typeof data === 'string' ? data : new URLSearchParams(data).toString()
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { resolve(data) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function httpsRequest(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const bodyStr = body ? JSON.stringify(body) : null
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch (e) { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

async function exchangeCode(code) {
  console.log('Trocando código por token...')
  return httpsPost('https://oauth2.googleapis.com/token', {
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  })
}

async function deployRules(accessToken) {
  const rulesContent = fs.readFileSync(RULES_PATH, 'utf8')
  console.log('\nCriando novo ruleset no Firebase...')

  // 1. Create ruleset
  const createRes = await httpsRequest(
    'POST',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      source: {
        files: [{ name: 'firestore.rules', content: rulesContent }],
      },
    },
    { Authorization: `Bearer ${accessToken}` }
  )

  if (createRes.status !== 200) {
    console.error('Erro ao criar ruleset:', JSON.stringify(createRes.body, null, 2))
    process.exit(1)
  }

  const rulesetName = createRes.body.name
  console.log('Ruleset criado:', rulesetName)

  // 2. Release as active Firestore ruleset
  const releaseRes = await httpsRequest(
    'PATCH',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    { name: `projects/${PROJECT_ID}/releases/cloud.firestore`, rulesetName },
    { Authorization: `Bearer ${accessToken}` }
  )

  if (releaseRes.status !== 200) {
    // Try PUT if PATCH fails
    console.log('PATCH falhou, tentando PUT...')
    const putRes = await httpsRequest(
      'PUT',
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
      { name: `projects/${PROJECT_ID}/releases/cloud.firestore`, rulesetName },
      { Authorization: `Bearer ${accessToken}` }
    )
    if (putRes.status !== 200) {
      console.error('Erro ao publicar ruleset:', JSON.stringify(putRes.body, null, 2))
      process.exit(1)
    }
  }

  console.log('\n✅ Regras do Firestore atualizadas com sucesso!')
  console.log('Os dados do seu app agora devem aparecer normalmente.')
}

async function saveToken(tokens) {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')
  let config = {}
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')) } catch (e) {}
  config.tokens = { access_token: tokens.access_token, refresh_token: tokens.refresh_token }
  config.user = { email: 'authenticated' }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log('Token salvo no Firebase CLI configstore.')
}

async function main() {
  const state = crypto.randomBytes(16).toString('hex')

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(CLIENT_ID)}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(SCOPES)}&` +
    `state=${encodeURIComponent(state)}&` +
    `access_type=offline&` +
    `prompt=consent`

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const urlObj = new URL(req.url, `http://localhost:${PORT}`)
      const code = urlObj.searchParams.get('code')
      const returnedState = urlObj.searchParams.get('state')

      if (urlObj.pathname !== '/' || !code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<p>Aguardando autenticação...</p>')
        return
      }

      if (returnedState !== state) {
        res.writeHead(400)
        res.end('State mismatch - tente novamente')
        server.close()
        reject(new Error('State mismatch'))
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`
        <html><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h1 style="color:green">✅ Login bem-sucedido!</h1>
        <p>Deployando as regras do Firestore... Pode fechar esta janela.</p>
        </body></html>
      `)
      server.close()

      try {
        const tokens = await exchangeCode(code)
        if (!tokens.access_token) {
          console.error('Nenhum access_token retornado:', tokens)
          process.exit(1)
        }
        await saveToken(tokens)
        await deployRules(tokens.access_token)
        resolve()
      } catch (e) {
        reject(e)
      }
    })

    server.listen(PORT, '127.0.0.1', () => {
      console.log('\n====================================')
      console.log('FocusOS — Autenticação Firebase')
      console.log('====================================')
      console.log('\nAbrindo navegador para login...')
      console.log('Se não abrir automaticamente, acesse:')
      console.log(`\n  ${authUrl}\n`)

      // Open browser (Windows)
      exec(`start "" "${authUrl}"`, (err) => {
        if (err) {
          console.log('Não foi possível abrir o browser automaticamente.')
          console.log('Por favor, acesse a URL acima manualmente.')
        }
      })

      console.log('Aguardando autenticação no browser...')
    })

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Porta ${PORT} já está em uso. Feche outros processos e tente novamente.`)
      }
      reject(err)
    })
  })
}

main()
  .then(() => {
    console.log('\nPronto! Reinicie o app para ver seus dados.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\nErro:', err.message)
    process.exit(1)
  })
