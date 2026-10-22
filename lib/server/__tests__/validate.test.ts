import { describe, it, expect } from 'vitest'
import { isIsoDate, isValidTimezone, isStringArray, toFiniteNumber, resolveRange } from '../validate'

describe('validate', () => {
  it('REGRESSÃO: data inexistente ou fora do formato é rejeitada', () => {
    expect(isIsoDate('2026-10-22')).toBe(true)
    expect(isIsoDate('2026-02-31')).toBe(false)
    expect(isIsoDate('22/10/2026')).toBe(false)
    expect(isIsoDate({})).toBe(false)
  })

  it('REGRESSÃO: timezone aceita IANA e rejeita lixo/injeção', () => {
    expect(isValidTimezone('America/Sao_Paulo')).toBe(true)
    expect(isValidTimezone('UTC')).toBe(true)
    expect(isValidTimezone('Nao/Existe')).toBe(false)
    expect(isValidTimezone('../../etc')).toBe(false)
    expect(isValidTimezone({ a: 1 })).toBe(false)
  })

  it('REGRESSÃO: event_ids exige array de strings', () => {
    expect(isStringArray(['a', 'b'])).toBe(true)
    expect(isStringArray('abc')).toBe(false)
    expect(isStringArray([1, 2])).toBe(false)
    expect(isStringArray({ length: 1 })).toBe(false)
  })

  it('REGRESSÃO: target_value não aceita NaN/Infinity/objeto', () => {
    expect(toFiniteNumber('10')).toBe(10)
    expect(toFiniteNumber(0)).toBe(0)
    expect(toFiniteNumber('abc')).toBeNull()
    expect(toFiniteNumber('')).toBeNull()
    expect(toFiniteNumber(Infinity)).toBeNull()
    expect(toFiniteNumber({})).toBeNull()
    expect(toFiniteNumber(null)).toBeNull()
  })

  it('REGRESSÃO: performance valida from/to/days e limita a 366 dias', () => {
    expect(resolveRange(null, '2026-10-22', null, '2026-10-22')).toEqual({ ok: true, from: '2026-10-15', to: '2026-10-22', days: 8 })
    expect(resolveRange('2026-01-01', '2026-12-31', null, 'x').ok).toBe(true)
    expect(resolveRange('2025-01-01', '2026-12-31', null, 'x').ok).toBe(false)
    expect(resolveRange('lixo', null, null, '2026-10-22').ok).toBe(false)
    expect(resolveRange(null, null, 'abc', '2026-10-22').ok).toBe(false)
    expect(resolveRange('2026-10-22', '2026-10-01', null, 'x').ok).toBe(false)
  })
})
