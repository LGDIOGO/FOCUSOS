import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { isIsoDate } from '@/lib/server/validate'
import { authWithApiKey, unauthorizedResponse, errorResponse } from '../_auth'

export async function GET(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (from != null && !isIsoDate(from)) return errorResponse('from must be YYYY-MM-DD', 400)
  if (to != null && !isIsoDate(to)) return errorResponse('to must be YYYY-MM-DD', 400)

  try {
    let q = adminDb.collection('events').where('user_id', '==', auth.userId) as any


    // Só where de user_id (sem índice composto); filtra from/to e ordena aqui.
    const snap = await q.get()
    const events = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((e: any) => (!from || String(e.date) >= from) && (!to || String(e.date) <= to))
      .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)) || String(a.time ?? '').localeCompare(String(b.time ?? '')))
    return Response.json({ events, count: events.length })
  } catch (e) {
    return errorResponse('Failed to fetch events')
  }
}

export async function POST(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  try {
    const body = await req.json()
    const { title, date, time, type = 'event', description, emoji, color, recurrence } = body

    if (!title) return errorResponse('title is required', 400)
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse('date is required in YYYY-MM-DD format', 400)
    }

    const docRef = await adminDb.collection('events').add({
      user_id: auth.userId,
      title: String(title).slice(0, 120),
      date,
      time: time ?? null,
      type: ['meeting', 'birthday', 'event', 'task', 'other'].includes(type) ? type : 'event',
      status: 'none',
      description: description ?? null,
      emoji: emoji ?? null,
      color: color ?? null,
      recurrence: recurrence ?? null,
      created_at: new Date().toISOString(),
    })

    const doc = await docRef.get()
    return Response.json({ event: { id: docRef.id, ...doc.data() } }, { status: 201 })
  } catch (e) {
    return errorResponse('Failed to create event')
  }
}
