import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { exchangeCode, getGoogleUserEmail } from '@/lib/utils/googleCalendar'

/** Volta para a agenda com a causa legível em vez de um 500 em branco. */
function falha(origin: string, msg: string) {
  return NextResponse.redirect(
    new URL(`/dashboard/agenda?gcal=error&msg=${encodeURIComponent(msg.slice(0, 180))}`, origin)
  )
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/dashboard/agenda?gcal=cancelled', origin))
  }

  // Daqui em diante tudo é protegido. Este endpoint recebe o usuário vindo do
  // consentimento do Google: estourar aqui deixava uma página em branco logo
  // depois de ele autorizar, e o refresh token se perdia sem explicação.
  try {
    return await concluir(req, origin, code, state)
  } catch (err: any) {
    const msg = String(err?.message || err)
    const semCredencial = /credential|default credentials|UNAUTHENTICATED|could not load|metadata/i.test(msg)
    return falha(origin, semCredencial
      ? 'Servidor sem as credenciais do Firebase (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).'
      : msg)
  }
}

async function concluir(req: NextRequest, origin: string, code: string, state: string) {
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

  // Sem refresh token não há sincronização depois que o access token expira.
  // O Google só o devolve na primeira autorização, ou com prompt=consent —
  // reconectar sem revogar antes costuma cair aqui.
  if (!tokens.refresh_token) {
    await stateDoc.ref.delete()
    return falha(origin, 'O Google não devolveu o token de renovação. Remova o acesso do FocusOS em myaccount.google.com/permissions e conecte de novo.')
  }

  await adminDb.collection('user_integrations').doc(uid).set({
    google_calendar: {
      refresh_token: tokens.refresh_token,
      access_token_hint: tokens.access_token.slice(0, 20),
      email,
      connected_at: Date.now(),
    },
  }, { merge: true })

  await stateDoc.ref.delete()

  return NextResponse.redirect(new URL('/dashboard/agenda?gcal=connected', origin))
}
