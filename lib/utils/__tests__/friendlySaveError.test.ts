import { describe, it, expect } from 'vitest'
import { friendlySaveError, GENERIC_SAVE_ERROR } from '../friendlySaveError'

describe('friendlySaveError', () => {
  it('REGRESSÃO: nunca repassa err.message cru', () => {
    const msg = 'FirebaseError: Missing or insufficient permissions (projects/x/databases)'
    const outs = [
      friendlySaveError(new Error(msg)),
      friendlySaveError({ message: msg }),
      friendlySaveError({ code: 'permission-denied', message: msg }),
      friendlySaveError({ code: 'weird/code', message: msg }),
      friendlySaveError(msg),
    ]
    outs.forEach(o => {
      expect(o).not.toContain('FirebaseError')
      expect(o).not.toContain('projects/x')
      expect(o).not.toBe(msg)
    })
  })

  it('REGRESSÃO: mapeia cada código conhecido', () => {
    expect(friendlySaveError({ code: 'permission-denied' })).toMatch(/permissão/)
    expect(friendlySaveError({ code: 'firestore/permission-denied' })).toMatch(/permissão/)
    expect(friendlySaveError({ code: 'unavailable' })).toMatch(/Sem conexão/)
    expect(friendlySaveError({ code: 'auth/network-request-failed' })).toMatch(/Sem conexão/)
    expect(friendlySaveError({ code: 'unauthenticated' })).toMatch(/sessão expirou/)
    expect(friendlySaveError({ code: 'resource-exhausted' })).toMatch(/Aguarde/)
    expect(friendlySaveError({ code: 'deadline-exceeded' })).toMatch(/demorou/)
  })

  it('REGRESSÃO: entrada estranha cai no texto genérico', () => {
    const vals: unknown[] = [undefined, null, 42, '', {}, [], { code: 123 }, { code: 'xyz' }]
    vals.forEach(v => expect(friendlySaveError(v)).toBe(GENERIC_SAVE_ERROR))
  })

  it('usa o contexto só no texto genérico', () => {
    expect(friendlySaveError(undefined, 'aplicar as ações')).toBe('Não foi possível aplicar as ações agora. Tente novamente.')
    expect(friendlySaveError({ code: 'unavailable' }, 'aplicar as ações')).toMatch(/Sem conexão/)
  })
})
