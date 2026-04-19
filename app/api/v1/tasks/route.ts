import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithApiKey, unauthorizedResponse, errorResponse } from '../_auth'

export async function GET(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  try {
    let q = adminDb.collection('tasks').where('user_id', '==', auth.userId) as any
    if (status) q = q.where('status', '==', status)

    const snap = await q.orderBy('created_at', 'desc').get()
    const tasks = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
    return Response.json({ tasks, count: tasks.length })
  } catch (e) {
    return errorResponse('Failed to fetch tasks')
  }
}

export async function POST(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  try {
    const body = await req.json()
    const { title, priority = 'medium', due_date, due_time, goal_id } = body

    if (!title) return errorResponse('title is required', 400)

    const docRef = await adminDb.collection('tasks').add({
      user_id: auth.userId,
      title: String(title).slice(0, 200),
      priority: ['low', 'medium', 'high', 'critical'].includes(priority) ? priority : 'medium',
      status: 'todo',
      done: false,
      due_date: due_date ?? null,
      due_time: due_time ?? null,
      goal_id: goal_id ?? null,
      created_at: new Date().toISOString(),
    })

    const doc = await docRef.get()
    return Response.json({ task: { id: docRef.id, ...doc.data() } }, { status: 201 })
  } catch (e) {
    return errorResponse('Failed to create task')
  }
}
