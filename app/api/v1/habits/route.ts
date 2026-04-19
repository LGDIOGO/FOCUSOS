import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithApiKey, unauthorizedResponse, errorResponse } from '../_auth'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  try {
    const snap = await adminDb
      .collection('habits')
      .where('user_id', '==', auth.userId)
      .where('is_archived', '==', false)
      .orderBy('sort_order')
      .get()

    const habits = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return Response.json({ habits, count: habits.length })
  } catch (e) {
    return errorResponse('Failed to fetch habits')
  }
}

export async function POST(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  try {
    const body = await req.json()
    const { name, type = 'positive', recurrence, time, emoji, color } = body

    if (!name) return errorResponse('name is required', 400)

    const countSnap = await adminDb
      .collection('habits')
      .where('user_id', '==', auth.userId)
      .get()

    const docRef = await adminDb.collection('habits').add({
      user_id: auth.userId,
      name: String(name).slice(0, 100),
      type: ['positive', 'negative'].includes(type) ? type : 'positive',
      status: 'none',
      streak: 0,
      is_archived: false,
      sort_order: countSnap.size,
      recurrence: recurrence ?? { frequency: 'daily', interval: 1 },
      time: time ?? null,
      emoji: emoji ?? null,
      color: color ?? null,
      created_at: new Date().toISOString(),
    })

    const doc = await docRef.get()
    return Response.json({ habit: { id: docRef.id, ...doc.data() } }, { status: 201 })
  } catch (e) {
    return errorResponse('Failed to create habit')
  }
}
