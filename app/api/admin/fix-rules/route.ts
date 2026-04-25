import { NextRequest, NextResponse } from 'next/server'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'foco-os---produtividade-bfb58'

const RULES_SOURCE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }
    function isOwnerByField() {
      return isAuth() && request.auth.uid == resource.data.user_id;
    }
    function isOwnerByFieldOnCreate() {
      return isAuth() && request.auth.uid == request.resource.data.user_id;
    }

    match /profiles/{uid} {
      allow read, write: if isAuth() && request.auth.uid == uid;
    }
    match /settings/{uid} {
      allow read, write: if isAuth() && request.auth.uid == uid;
    }
    match /habits/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /habit_logs/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /events/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /event_logs/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /tasks/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /goals/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /notifications/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /categories/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /finance_entries/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
  }
}`

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.FIREBASE_OAUTH_REFRESH_TOKEN
  if (!refreshToken) throw new Error('FIREBASE_OAUTH_REFRESH_TOKEN not set in environment')

  const params = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`)
  return data.access_token
}

async function deployRules(accessToken: string): Promise<string> {
  // Create ruleset
  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: RULES_SOURCE }] } }),
    }
  )
  const created = await createRes.json()
  if (!createRes.ok) throw new Error(`Create ruleset failed: ${JSON.stringify(created)}`)

  const rulesetName: string = created.name

  // Release as active
  const patchRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        release: {
          name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
          rulesetName,
        },
      }),
    }
  )
  const patched = await patchRes.json()
  if (!patchRes.ok) throw new Error(`Release ruleset failed: ${JSON.stringify(patched)}`)

  return rulesetName
}

export async function POST(_req: NextRequest) {
  try {
    const accessToken = await getAccessToken()
    const rulesetName = await deployRules(accessToken)
    return NextResponse.json({ success: true, rulesetName })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) {
  try {
    const accessToken = await getAccessToken()
    const res = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
