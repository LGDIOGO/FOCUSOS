import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase/admin'

// GET /api/debug/data?token=<firebase-id-token>
// Uses Admin SDK (bypasses Firestore security rules) to check if data exists.
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Missing token param' }, { status: 400 })
    }

    // Verify the Firebase ID token to get the user's UID
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    // Count documents in each collection for this user
    const collections = ['habits', 'habit_logs', 'events', 'event_logs', 'tasks', 'goals', 'notifications', 'categories']
    const counts: Record<string, number> = {}

    await Promise.all(
      collections.map(async (col) => {
        const snap = await adminDb.collection(col).where('user_id', '==', uid).limit(100).get()
        counts[col] = snap.size
      })
    )

    // Check profile and settings (doc ID = uid)
    const [profileSnap, settingsSnap] = await Promise.all([
      adminDb.collection('profiles').doc(uid).get(),
      adminDb.collection('settings').doc(uid).get(),
    ])

    return NextResponse.json({
      uid,
      profile_exists: profileSnap.exists,
      settings_exists: settingsSnap.exists,
      document_counts: counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
