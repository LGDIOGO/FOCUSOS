import { NextRequest } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { createHash, randomBytes } from 'crypto'

export const API_KEY_PREFIX = 'fos_live_'

export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(24).toString('hex')
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/** Authenticate via FocusOS API key — for data endpoints */
export async function authWithApiKey(req: NextRequest): Promise<{ userId: string; keyId: string } | null> {
  const header = req.headers.get('authorization') || ''
  const xKey = req.headers.get('x-api-key') || ''
  const raw = (header.startsWith('Bearer ') ? header.slice(7) : xKey).trim()

  if (!raw.startsWith(API_KEY_PREFIX)) return null

  try {
    const hash = hashKey(raw)
    const snap = await adminDb.collection('api_keys').where('key_hash', '==', hash).limit(1).get()
    if (snap.empty) return null

    const docRef = snap.docs[0].ref
    const data = snap.docs[0].data()
    docRef.update({ last_used_at: new Date().toISOString() }).catch(() => {})
    return { userId: data.user_id, keyId: snap.docs[0].id }
  } catch {
    return null
  }
}

/** Authenticate via Firebase ID token — for key management endpoints */
export async function authWithFirebaseToken(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded.uid
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
