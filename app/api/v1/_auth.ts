import { NextRequest } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { createHash, randomBytes } from 'crypto'
import { checkRateLimit } from '@/lib/server/rateLimit'

export const API_KEY_PREFIX = 'fos_live_'
export const API_KEY_RATE_LIMIT = 120 // requisições por minuto por chave

export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(24).toString('hex')
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/** Authenticate via FocusOS API key (Admin SDK). Qualquer erro = nega. */
export async function authWithApiKey(req: NextRequest): Promise<{ userId: string; keyId: string } | null> {
  const header = req.headers.get('authorization') || ''
  const xKey = req.headers.get('x-api-key') || ''
  const raw = (header.startsWith('Bearer ') ? header.slice(7) : xKey).trim()

  if (!raw.startsWith(API_KEY_PREFIX)) return null

  const hash = hashKey(raw)

  // Freio contra abuso por chave (o /mcp chama /v1, então conta em dobro).
  if (!checkRateLimit(`apikey:${hash}`, API_KEY_RATE_LIMIT, 60_000).ok) return null

  try {
    const snap = await adminDb.collection('api_keys').where('key_hash', '==', hash).limit(1).get()
    if (snap.empty) return null
    const data = snap.docs[0].data()
    snap.docs[0].ref.update({ last_used_at: new Date().toISOString() }).catch(() => {})
    return { userId: data.user_id, keyId: snap.docs[0].id }
  } catch {
    return null
  }
}

/**
 * Authenticate via Firebase ID token (gestão de chaves, IA, checkout, Google
 * Calendar). Sempre verifica a assinatura pelo Admin SDK; se a verificação
 * falhar por qualquer motivo, nega (falha fechada). Nunca decodifica o JWT sem
 * verificar.
 */
export async function authWithFirebaseToken(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded.uid || null
  } catch {
    return null
  }
}

export function unauthorizedResponse(msg = 'Unauthorized') {
  return Response.json({ error: msg }, { status: 401 })
}

export function errorResponse(msg: string, status = 500) {
  return Response.json({ error: msg }, { status })
}
