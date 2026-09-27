import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithFirebaseToken, unauthorizedResponse } from '@/app/api/v1/_auth'
import {
  refreshAccessToken,
  createCalendarEvent,
  updateCalendarEvent,
  type GCalEvent,
} from '@/lib/utils/googleCalendar'
import { toRRule, allocateSlots, busyFrom, type Busy } from '@/lib/utils/calendarScheduling'

type Source = 'events' | 'work' | 'habits'
const ALL_SOURCES: Source[] = ['events', 'work', 'habits']

/** Coleção e campo de data inicial de cada origem. */
const SOURCE_META: Record<Source, { collection: string; startField: string; label: string }> = {
  events:  { collection: 'events',      startField: 'date',       label: 'Compromisso' },
  work:    { collection: 'work_items',  startField: 'date',       label: 'Trabalho' },
  habits:  { collection: 'habits',      startField: 'start_date', label: 'Hábito' },
}

/** Monta o evento do Google já com recorrência, em vez de uma cópia por dia. */
function buildGCalEvent(
  doc: any,
  startDate: string,
  time: string,
  durationMin: number,
  timezone: string,
  prefix: string,
): GCalEvent {
  const title = doc.title || doc.name || 'Sem título'
  const summary = [doc.emoji, title].filter(Boolean).join(' ').trim()

  const [h, m] = time.split(':').map(Number)
  const endTotal = h * 60 + m + durationMin
  const endH = String(Math.floor(endTotal / 60) % 24).padStart(2, '0')
  const endM = String(endTotal % 60).padStart(2, '0')

  const descricao = [doc.description, `— ${prefix} · FocusOS`].filter(Boolean).join('\n\n')

  const evt: GCalEvent & { recurrence?: string[] } = {
    summary,
    description: descricao,
    start: { dateTime: `${startDate}T${time}:00`, timeZone: timezone },
    end: { dateTime: `${startDate}T${endH}:${endM}:00`, timeZone: timezone },
  }

  const rrule = toRRule(doc.recurrence, doc.end_date)
  if (rrule.length) evt.recurrence = rrule

  return evt
}

export async function POST(req: NextRequest) {
  const uid = await authWithFirebaseToken(req)
  if (!uid) return unauthorizedResponse()

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
  const timezone = body.timezone || 'America/Sao_Paulo'
  const sources: Source[] = Array.isArray(body.sources) && body.sources.length
    ? body.sources.filter((s: string): s is Source => (ALL_SOURCES as string[]).includes(s))
    : ALL_SOURCES
  const onlyIds: string[] | undefined = body.event_ids || body.ids

  // Carrega tudo antes de decidir horários: o que não tem hora precisa saber o
  // que já está ocupado, inclusive pelas outras origens.
  const loaded: Record<Source, any[]> = { events: [], work: [], habits: [] }
  for (const src of sources) {
    const snap = await adminDb
      .collection(SOURCE_META[src].collection)
      .where('user_id', '==', uid)
      .get()
    loaded[src] = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(d => !d.is_archived)
      .filter(d => (d.title || d.name))
  }

  // Ocupação fixa: tudo que já tem horário próprio.
  const busy: Busy[] = []
  for (const src of ALL_SOURCES) {
    for (const d of loaded[src]) {
      const b = busyFrom(d.time, d.duration_min || 60)
      if (b) busy.push(b)
    }
  }

  // Sem horário entram em ordem estável e ganham uma hora cada, sem colidir.
  const untimed = ALL_SOURCES.flatMap(src =>
    loaded[src]
      .filter(d => !d.time)
      .map(d => ({ src, doc: d }))
  ).sort((a, b) =>
    (a.doc.sort_order ?? 999) - (b.doc.sort_order ?? 999) ||
    String(a.doc.title || a.doc.name).localeCompare(String(b.doc.title || b.doc.name))
  )

  const slots = allocateSlots(busy, untimed.length, 60)
  const assigned = new Map<string, string>()
  untimed.forEach((u, i) => assigned.set(`${u.src}:${u.doc.id}`, slots[i]))

  let synced = 0
  let updated = 0
  const errors: string[] = []

  for (const src of sources) {
    const meta = SOURCE_META[src]
    for (const d of loaded[src]) {
      if (onlyIds && !onlyIds.includes(d.id)) continue

      const startDate = d[meta.startField] || d.created_at?.split('T')[0]
      if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) continue

      const time = d.time || assigned.get(`${src}:${d.id}`) || '09:00'
      const duration = d.duration_min || 60

      try {
        const evt = buildGCalEvent(d, startDate, time, duration, timezone, meta.label)

        if (d.google_calendar_event_id) {
          await updateCalendarEvent(accessToken, d.google_calendar_event_id, evt)
          updated++
        } else {
          const created = await createCalendarEvent(accessToken, evt)
          await adminDb.collection(meta.collection).doc(d.id).update({
            google_calendar_event_id: created.id,
            google_calendar_synced_at: new Date().toISOString(),
          })
          synced++
        }
      } catch (err: any) {
        errors.push(`${meta.label} "${d.title || d.name}": ${err.message}`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    synced,
    updated,
    sources,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  })
}
