import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, resetRateLimits } from '../rateLimit'

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits())

  it('permite até o limite e bloqueia a próxima', () => {
    for (let i = 0; i < 3; i++) expect(checkRateLimit('k', 3, 1000, 100 + i).ok).toBe(true)
    const r = checkRateLimit('k', 3, 1000, 200)
    expect(r.ok).toBe(false)
    expect(r.retryAfterSec).toBeGreaterThan(0)
  })

  it('libera de novo depois da janela', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('k', 3, 1000, 0)
    expect(checkRateLimit('k', 3, 1000, 500).ok).toBe(false)
    expect(checkRateLimit('k', 3, 1000, 1001).ok).toBe(true)
  })

  it('chaves diferentes não se afetam', () => {
    checkRateLimit('a', 1, 1000, 0)
    expect(checkRateLimit('a', 1, 1000, 1).ok).toBe(false)
    expect(checkRateLimit('b', 1, 1000, 1).ok).toBe(true)
  })
})
