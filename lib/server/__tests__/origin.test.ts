import { describe, it, expect } from 'vitest'
import { internalOrigin } from '../origin'

describe('internalOrigin', () => {
  it('REGRESSÃO: nunca depende de header Host — só do ambiente', () => {
    // A função nem recebe a requisição: um Host forjado não tem como mudar o destino.
    expect(internalOrigin.length).toBeLessThanOrEqual(1)
  })

  it('prefere NEXT_PUBLIC_APP_URL (sem barra final)', () => {
    expect(internalOrigin({ NEXT_PUBLIC_APP_URL: 'https://app.exemplo.com/', VERCEL_URL: 'x.vercel.app' })).toBe('https://app.exemplo.com')
  })

  it('cai para VERCEL_URL, sempre https', () => {
    expect(internalOrigin({ VERCEL_URL: 'focusos-abc.vercel.app' })).toBe('https://focusos-abc.vercel.app')
  })

  it('ignora NEXT_PUBLIC_APP_URL sem protocolo http(s)', () => {
    expect(internalOrigin({ NEXT_PUBLIC_APP_URL: 'javascript:alert(1)', VERCEL_URL: 'a.vercel.app' })).toBe('https://a.vercel.app')
  })

  it('sem nada configurado = localhost', () => {
    expect(internalOrigin({})).toBe('http://localhost:3000')
  })
})
