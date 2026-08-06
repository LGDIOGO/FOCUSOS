import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { exchangeCode, getGoogleUserEmail } from '@/lib/utils/googleCalendar'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/dashboard/agenda?gcal=cancelled', origin))
  }

  // Look up nonce
  const stateDoc = await adminDb.collection('oauth_states').doc(state).get()
  if (!stateDoc.exists) {
    return NextResponse.redirect(new URL('/dashboard/agenda?gcal=error&msg=invalid_state', origin))
  }

  const { uid, redirect_uri, expires_at } = stateDoc.data()!

  if (Date.now() > expires_at) {
    await stateDoc.ref.delete()
    return NextResponse.redirect(new URL('/dashboard/agenda?gcal=error&msg=expired', origin))
  }

  // Exchange code for tokens
  let tokens
  try {
    tokens = await exchangeCode(code, redirect_uri)
  } catch (err: any) {
    await stateDoc.ref.delete()
    return NextResponse.redirect(new URL(`/dashboard/agenda?gcal=error&msg=${encodeURIComponent(err.message)}`, origin))
  }

  // Get user email
  let email = ''
  try {
    email = await getGoogleUserEmail(tokens.access_token)
  } catch {}

  // Persist refresh token
  await adminDb.collection('user_integrations').doc(uid).set({
    google_calendar: {
      refresh_token: tokens.refresh_token || null,
      access_token_hint: tokens.access_token.slice(0, 20),
      email,
      connected_at: Date.now(),
    },
  }, { merge: true })

  await stateDoc.ref.delete()

  return NextResponse.redirect(new URL('/dashboard/agenda?gcal=connected', origin))
}
