import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithFirebaseToken, unauthorizedResponse } from '@/app/api/v1/_auth'
import {
  refreshAccessToken,
  createCalendarEvent,
  updateCalendarEvent,
  toGCalEvent,
} from '@/lib/utils/googleCalendar'

export async function POST(req: NextRequest) {
  const uid = await authWithFirebaseToken(req)
  if (!uid) return unauthorizedResponse()

  // Get stored refresh token
  const intDoc = await adminDb.collection('user_integrations').doc(uid).get()
  const gcal = intDoc.exists ? intDoc.data()?.google_calendar : null
  if (!gcal?.refresh_token) {
    return NextResponse.json({ error: 'Google Calendar não conectado.' }, { status: 400 })
  }

  let accessToken: string
  try {
    accessToken = await refreshAccessToken(gcal.refresh_token)
  } catch (err: any) {
    return NextResponse.json({ error: `Falha ao renovar token: ${err.message}` }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const eventIds: string[] | undefined = body.event_ids // optional: sync specific events

  // Fetch events from Firestore
  let q = adminDb.collection('events').where('user_id', '==', uid)
  const snap = await q.get()
  const events = snap.docs.map(d => ({ id: d.id, ...d.data() as any }))

  const targets = eventIds
    ? events.filter(e => eventIds.includes(e.id))
    : events

  const timezone = body.timezone || 'America/Sao_Paulo'
  let synced = 0
  let updated = 0
  const errors: string[] = []

  for (const event of targets) {
    try {
      const gcalEvent = toGCalEvent(event, timezone)

      if (event.google_calendar_event_id) {
        // Update existing Google Calendar event
        await updateCalendarEvent(accessToken, event.google_calendar_event_id, gcalEvent)
        updated++
      } else {
        // Create new Google Calendar event
        const created = await createCalendarEvent(accessToken, gcalEvent)
        await adminDb.collection('events').doc(event.id).update({
          google_calendar_event_id: created.id,
          google_calendar_synced_at: new Date().toISOString(),
        })
        synced++
      }
    } catch (err: any) {
      errors.push(`${event.title}: ${err.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    synced,
    updated,
    errors: errors.length > 0 ? errors : undefined,
    total: targets.length,
  })
}
