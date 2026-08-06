import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithFirebaseToken, unauthorizedResponse } from '@/app/api/v1/_auth'

export async function GET(req: NextRequest) {
  const uid = await authWithFirebaseToken(req)
  if (!uid) return unauthorizedResponse()

  const doc = await adminDb.collection('user_integrations').doc(uid).get()
  const gcal = doc.exists ? doc.data()?.google_calendar : null

  if (!gcal?.refresh_token) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: true,
    email: gcal.email || null,
    connected_at: gcal.connected_at || null,
  })
}
