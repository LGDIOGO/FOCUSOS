import { describe, it, expect, vi, beforeEach } from 'vitest'

const auth = vi.fn()
vi.mock('@/app/api/v1/_auth', () => ({ authWithFirebaseToken: (...a: any[]) => auth(...a) }))

import { guardAiRequest, AI_MAX_BODY_BYTES, AI_RATE_LIMIT } from '../guard'
import { resetRateLimits } from '../rateLimit'

function post(body: string) {
  return new Request('http://x/api/ai/x', { method: 'POST', body })
}

describe('guardAiRequest', () => {
  beforeEach(() => {
    auth.mockReset()
    resetRateLimits()
  })

  it('sem token válido = 401 e não lê o corpo', async () => {
    auth.mockResolvedValue(null)
    const r = await guardAiRequest(post('{}'), 'x')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(401)
  })

  it('corpo acima do limite = 413', async () => {
    auth.mockResolvedValue('u1')
    const big = JSON.stringify({ text: 'a'.repeat(AI_MAX_BODY_BYTES + 1) })
    const r = await guardAiRequest(post(big), 'x')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(413)
  })

  it('JSON inválido = 400', async () => {
    auth.mockResolvedValue('u1')
    const r = await guardAiRequest(post('{nao-json'), 'x')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(400)
  })

  it('excesso de requisições do mesmo uid = 429 com Retry-After; outro uid segue livre', async () => {
    auth.mockResolvedValue('u1')
    for (let i = 0; i < AI_RATE_LIMIT; i++) {
      expect((await guardAiRequest(post('{}'), 'x')).ok).toBe(true)
    }
    const blocked = await guardAiRequest(post('{}'), 'x')
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(429)
      expect(Number(blocked.response.headers.get('Retry-After'))).toBeGreaterThan(0)
    }
    auth.mockResolvedValue('u2')
    expect((await guardAiRequest(post('{}'), 'x')).ok).toBe(true)
  })

  it('requisição válida devolve uid e corpo', async () => {
    auth.mockResolvedValue('u1')
    const r = await guardAiRequest(post('{"text":"oi"}'), 'x')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.uid).toBe('u1')
      expect(r.body).toEqual({ text: 'oi' })
    }
  })
})
