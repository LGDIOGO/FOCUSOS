import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithFirebaseToken, unauthorizedResponse } from '@/app/api/v1/_auth'
import { buildAuthUrl } from '@/lib/utils/googleCalendar'
import { randomBytes } from 'crypto'

function getRedirectUri(req: NextRequest) {
  const configured = process.env.GOOGLE_CALENDAR_REDIRECT_URI
  if (configured) return configured
  const origin = req.nextUrl.origin
  return `${origin}/api/integrations/google-calendar/callback`
}

export async function GET(req: NextRequest) {
  const uid = await authWithFirebaseToken(req)
  if (!uid) return unauthorizedResponse()

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google Calendar não configurado no servidor.' }, { status: 503 })
  }

  const state = randomBytes(24).toString('hex')
  const redirectUri = getRedirectUri(req)

  // Store nonce with 10 min TTL
  await adminDb.collection('oauth_states').doc(state).set({
    uid,
    redirect_uri: redirectUri,
    created_at: Date.now(),
    expires_at: Date.now() + 10 * 60 * 1000,
  })

  const url = buildAuthUrl(clientId, redirectUri, state)
  return NextResponse.json({ url, state })
}
