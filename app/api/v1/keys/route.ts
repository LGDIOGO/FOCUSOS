import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import {
  authWithFirebaseToken,
  generateApiKey,
  hashKey,
  unauthorizedResponse,
  errorResponse,
} from '../_auth'

export async function GET(req: NextRequest) {
  const userId = await authWithFirebaseToken(req)
  if (!userId) return unauthorizedResponse()

  try {
    // Sem orderBy para evitar exigir índice composto no Firestore — ordenamos no cliente
    const snap = await adminDb
      .collection('api_keys')
      .where('user_id', '==', userId)
      .get()

    const keys = snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name,
        created_at: data.created_at,
        last_used_at: data.last_used_at ?? null,
        key_preview: data.key_preview,
      }
    })

    return Response.json({ keys })
  } catch (e) {
    return errorResponse('Failed to list keys')
  }
}

export async function POST(req: NextRequest) {
  const userId = await authWithFirebaseToken(req)
  if (!userId) return unauthorizedResponse()

  try {
    const body = await req.json()
    const name = (body?.name || 'Chave sem nome').slice(0, 80)

    const existing = await adminDb
      .collection('api_keys')
      .where('user_id', '==', userId)
      .get()

    if (existing.size >= 10) {
      return errorResponse('Limite de 10 chaves atingido', 400)
    }

    const key = generateApiKey()
    const docRef = await adminDb.collection('api_keys').add({
      user_id: userId,
      name,
      key_hash: hashKey(key),
      key_preview: key.slice(0, 14) + '••••••••••••••••',
      created_at: new Date().toISOString(),
      last_used_at: null,
    })

    return Response.json({ id: docRef.id, name, key, created_at: new Date().toISOString() }, { status: 201 })
  } catch (e) {
    return errorResponse('Failed to create key')
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await authWithFirebaseToken(req)
  if (!userId) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return errorResponse('Missing id', 400)

  try {
    const docRef = adminDb.collection('api_keys').doc(id)
    const doc = await docRef.get()
    if (!doc.exists || doc.data()?.user_id !== userId) {
      return errorResponse('Not found', 404)
    }
    await docRef.delete()
    return Response.json({ success: true })
  } catch (e) {
    return errorResponse('Failed to delete key')
  }
}
