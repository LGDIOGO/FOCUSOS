import { describe, it, expect, vi, beforeEach } from 'vitest'

const auth = vi.fn()
vi.mock('@/app/api/v1/_auth', () => ({
  authWithFirebaseToken: (...a: any[]) => auth(...a),
  unauthorizedResponse: () => Response.json({ error: 'Unauthorized' }, { status: 401 }),
}))

let dbBehavior: 'throw' | 'ok' = 'throw'
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        set: () => { if (dbBehavior === 'throw') throw new Error('SEGREDO-INTERNO /srv/path 9999'); return Promise.resolve() },
        get: () => { throw new Error('SEGREDO-INTERNO get') },
      }),
    }),
  },
}))
vi.mock('@/lib/utils/googleCalendar', () => ({
  buildAuthUrl: () => 'http://g', refreshAccessToken: vi.fn(), createCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(), exchangeCode: vi.fn(), getGoogleUserEmail: vi.fn(),
}))

import { GET as connect } from '../connect/route'
import { GET as callback } from '../callback/route'
import { NextRequest } from 'next/server'

beforeEach(() => {
  auth.mockReset(); auth.mockResolvedValue('u1')
  process.env.GOOGLE_CALENDAR_CLIENT_ID = 'id'
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 's'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('google-calendar: erros genéricos', () => {
  it('REGRESSÃO: connect 500 não devolve details nem a mensagem interna', async () => {
    const r = await connect(new NextRequest('http://x/api/integrations/google-calendar/connect'))
    expect(r.status).toBe(500)
    const text = await r.text()
    expect(text).not.toContain('SEGREDO-INTERNO')
    expect(JSON.parse(text).details).toBeUndefined()
  })

  it('REGRESSÃO: callback falha() usa mensagem fixa, sem err.message', async () => {
    const r = await callback(new NextRequest('http://x/api/integrations/google-calendar/callback?code=c&state=s'))
    const loc = decodeURIComponent(r.headers.get('location') || '')
    expect(loc).toContain('gcal=error')
    expect(loc).not.toContain('SEGREDO-INTERNO')
  })
})
