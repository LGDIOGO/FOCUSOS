import { describe, it, expect } from 'vitest'
import { diagnoseProbe } from '../firestoreDiagnostic'

describe('diagnoseProbe', () => {
  it('REGRESSÃO: conta nova sem nenhum hábito NÃO é erro (banner aparecia para todo usuário novo)', () => {
    expect(diagnoseProbe({ empty: true })).toBe('ok')
  })

  it('conta com dados está ok', () => {
    expect(diagnoseProbe({ empty: false })).toBe('ok')
  })

  it('regras bloqueando leitura viram permission_denied', () => {
    expect(diagnoseProbe({ error: { code: 'permission-denied' } })).toBe('permission_denied')
    expect(diagnoseProbe({ error: { message: 'Missing or insufficient PERMISSION' } })).toBe('permission_denied')
  })

  it('qualquer outro erro vira error', () => {
    expect(diagnoseProbe({ error: { code: 'unavailable' } })).toBe('error')
    expect(diagnoseProbe({ error: 'boom' })).toBe('error')
  })
})
