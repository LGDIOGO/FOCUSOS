const GCAL_API = 'https://www.googleapis.com/calendar/v3'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export interface GCalEvent {
  id?: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error}`)
  return data.access_token
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const data = await res.json()
  if (!data.refresh_token && !data.access_token) throw new Error(`Code exchange failed: ${data.error}`)
  return data as { access_token: string; refresh_token?: string; id_token?: string; expires_in: number }
}

export function buildAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function createCalendarEvent(accessToken: string, event: GCalEvent): Promise<GCalEvent> {
  const res = await fetch(`${GCAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Create event failed: ${err.error?.message}`)
  }
  return res.json()
}

export async function updateCalendarEvent(accessToken: string, gcalId: string, event: GCalEvent): Promise<GCalEvent> {
  const res = await fetch(`${GCAL_API}/calendars/primary/events/${gcalId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Update event failed: ${err.error?.message}`)
  }
  return res.json()
}

export async function deleteCalendarEvent(accessToken: string, gcalId: string): Promise<void> {
  await fetch(`${GCAL_API}/calendars/primary/events/${gcalId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function toGCalEvent(event: {
  title: string
  description?: string
  date: string
  time?: string
  emoji?: string
}, timezone = 'America/Sao_Paulo'): GCalEvent {
  const summary = [event.emoji, event.title].filter(Boolean).join(' ')
  const description = event.description || ''

  if (event.time) {
    const [hStr, mStr] = event.time.split(':')
    const h = parseInt(hStr, 10)
    const endH = String((h + 1) % 24).padStart(2, '0')
    return {
      summary,
      description,
      start: { dateTime: `${event.date}T${event.time}:00`, timeZone: timezone },
      end: { dateTime: `${event.date}T${endH}:${mStr}:00`, timeZone: timezone },
    }
  }

  // All-day
  const next = new Date(event.date + 'T00:00:00')
  next.setDate(next.getDate() + 1)
  const endDate = next.toISOString().split('T')[0]
  return {
    summary,
    description,
    start: { date: event.date },
    end: { date: endDate },
  }
}

export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return data.email || ''
}
