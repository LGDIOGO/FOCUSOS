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
  // Tudo dentro de try: qualquer exceção solta aqui devolvia corpo vazio, e o
  // cliente só conseguia dizer "Unexpected end of JSON input".
  try {
    const uid = await authWithFirebaseToken(req)
    if (!uid) return unauthorizedResponse()

    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    const faltando = [
      !clientId && 'GOOGLE_CALENDAR_CLIENT_ID',
      !clientSecret && 'GOOGLE_CALENDAR_CLIENT_SECRET',
    ].filter(Boolean)

    if (faltando.length) {
      return NextResponse.json({
        error: `Faltam variáveis no servidor: ${faltando.join(', ')}.`,
      }, { status: 503 })
    }

    const state = randomBytes(24).toString('hex')
    const redirectUri = getRedirectUri(req)

    // Nonce com TTL de 10 min. Escrita via Admin SDK — se as credenciais de
    // serviço não estiverem no ambiente, é aqui que estoura.
    try {
      await adminDb.collection('oauth_states').doc(state).set({
        uid,
        redirect_uri: redirectUri,
        created_at: Date.now(),
        expires_at: Date.now() + 10 * 60 * 1000,
      })
    } catch (err: any) {
      const msg = String(err?.message || err)
      // Sem service account o Admin SDK procura credencial padrão, que não
      // existe na Vercel. A autenticação sobrevive (decodifica o token
      // localmente), mas qualquer escrita como esta falha.
      const semCredencial = /credential|default credentials|UNAUTHENTICATED|could not load|metadata/i.test(msg)
      return NextResponse.json({
        error: semCredencial
          ? 'Faltam as credenciais de serviço do Firebase no servidor (FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY).'
          : 'Não foi possível preparar a conexão (gravação no servidor falhou).',
        details: msg.slice(0, 300),
      }, { status: 500 })
    }

    return NextResponse.json({ url: buildAuthUrl(clientId!, redirectUri, state), state })
  } catch (err: any) {
    return NextResponse.json({
      error: 'Falha inesperada ao iniciar a conexão.',
      details: err?.message || String(err),
    }, { status: 500 })
  }
}
