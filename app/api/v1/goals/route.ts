import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithApiKey, unauthorizedResponse, errorResponse } from '../_auth'

export async function GET(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'active'

  try {
    const snap = await adminDb
      .collection('goals')
      .where('user_id', '==', auth.userId)
      .where('status', '==', status)
      .orderBy('created_at', 'desc')
      .get()

    const goals = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return Response.json({ goals, count: goals.length })
  } catch (e) {
    return errorResponse('Failed to fetch goals')
  }
}

export async function POST(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  try {
    const body = await req.json()
    const { title, target_value, current_value = 0, unit, start_date, end_date, emoji, color } = body

    if (!title) return errorResponse('title is required', 400)
    if (target_value == null) return errorResponse('target_value is required', 400)

    const today = new Date().toISOString().slice(0, 10)
    const docRef = await adminDb.collection('goals').add({
      user_id: auth.userId,
      title: String(title).slice(0, 120),
      target_value: Number(target_value),
      current_value: Number(current_value),
      progress_pct: target_value > 0 ? Math.round((Number(current_value) / Number(target_value)) * 100) : 0,
      unit: unit ?? null,
      start_date: start_date ?? today,
      end_date: end_date ?? null,
      status: 'active',
      emoji: emoji ?? null,
      color: color ?? null,
      created_at: new Date().toISOString(),
    })

    const doc = await docRef.get()
    return Response.json({ goal: { id: docRef.id, ...doc.data() } }, { status: 201 })
  } catch (e) {
    return errorResponse('Failed to create goal')
  }
}
