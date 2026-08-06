import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithFirebaseToken, unauthorizedResponse } from '@/app/api/v1/_auth'

export async function POST(req: NextRequest) {
  const uid = await authWithFirebaseToken(req)
  if (!uid) return unauthorizedResponse()

  await adminDb.collection('user_integrations').doc(uid).set({
    google_calendar: null,
  }, { merge: true })

  return NextResponse.json({ success: true })
}
