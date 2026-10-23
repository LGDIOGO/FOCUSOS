import { describe, it, expect, beforeEach } from 'vitest'

// Função comum (não vi.fn): o vitest 4 dá o teste como falho quando um vi.fn
// devolve Promise rejeitada, mesmo que o código sob teste trate o erro.
let verify: (token: string) => Promise<{ uid?: string }> = async () => ({})
let calls: string[] = []
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (token: string) => {
      calls.push(token)
      return verify(token)
    },
  },
  adminDb: {},
}))

import { vi } from 'vitest'
import { authWithFirebaseToken } from '../_auth'

function b64url(o: object) {
  return Buffer.from(JSON.stringify(o)).toString('base64url')
}

function req(authorization?: string) {
  return new Request('http://x/api', { headers: authorization ? { authorization } : {} })
}

describe('authWithFirebaseToken', () => {
  beforeEach(() => {
    calls = []
    verify = async () => ({})
  })

  it('REGRESSÃO: JWT forjado (sem assinatura válida) NÃO autentica, mesmo com aud/exp corretos', async () => {
    verify = async () => {
      throw new Error('Admin SDK indisponível / assinatura inválida')
    }
    const forged =
      b64url({ alg: 'none' }) + '.' +
      b64url({ sub: 'uid-da-vitima', aud: 'foco-os---produtividade-bfb58', exp: Math.floor(Date.now() / 1000) + 3600 }) +
      '.assinatura-falsa'
    expect(await authWithFirebaseToken(req(`Bearer ${forged}`))).toBeNull()
  })

  it('devolve o uid verificado quando o Admin SDK aprova', async () => {
    verify = async () => ({ uid: 'abc123' })
    expect(await authWithFirebaseToken(req('Bearer token-valido'))).toBe('abc123')
    expect(calls).toEqual(['token-valido'])
  })

  it('sem header ou sem Bearer = null, sem chamar o Admin SDK', async () => {
    expect(await authWithFirebaseToken(req())).toBeNull()
    expect(await authWithFirebaseToken(req('Basic xxx'))).toBeNull()
    expect(calls).toEqual([])
  })

  it('token verificado sem uid = null', async () => {
    verify = async () => ({})
    expect(await authWithFirebaseToken(req('Bearer t'))).toBeNull()
  })
})
