import { describe, it, expect } from 'vitest'
import { isIsoDate, isValidTimezone, isStringArray, toFiniteNumber, resolveRange, parseSyncBody, parseGoalNumbers } from '../validate'

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
    expect(resolveRange(null, null, 'abc', '2026-10-22').ok).toBe(true)
    expect(resolveRange('2026-10-22', '2026-10-01', null, 'x').ok).toBe(false)
  })

  it('REGRESSÃO: days <= 0 ou não numérico volta ao padrão 7', () => {
    const padrao = resolveRange(null, '2026-10-22', null, 'x')
    expect(resolveRange(null, '2026-10-22', '0', 'x')).toEqual(padrao)
    expect(resolveRange(null, '2026-10-22', '-5', 'x')).toEqual(padrao)
    expect(resolveRange(null, '2026-10-22', 'abc', 'x')).toEqual(padrao)
  })

  it('REGRESSÃO: sync responde erro com timezone inválido ou ids que não são lista de strings', () => {
    expect(parseSyncBody({ timezone: 'Lixo/Zona' }).ok).toBe(false)
    expect(parseSyncBody({ event_ids: 'abc' }).ok).toBe(false)
    expect(parseSyncBody({ ids: [1, 2] }).ok).toBe(false)
    expect(parseSyncBody({ event_ids: { length: 1 } }).ok).toBe(false)
    expect(parseSyncBody({})).toEqual({ ok: true, timezone: 'America/Sao_Paulo', onlyIds: undefined })
    expect(parseSyncBody({ timezone: 'UTC', ids: ['a'] })).toEqual({ ok: true, timezone: 'UTC', onlyIds: ['a'] })
  })

  it('REGRESSÃO: goals rejeita target_value/current_value não finitos', () => {
    expect(parseGoalNumbers('abc').ok).toBe(false)
    expect(parseGoalNumbers(Infinity).ok).toBe(false)
    expect(parseGoalNumbers(10, 'x').ok).toBe(false)
    expect(parseGoalNumbers(10, 5)).toEqual({ ok: true, target: 10, current: 5, progress_pct: 50 })
    expect(parseGoalNumbers(0)).toEqual({ ok: true, target: 0, current: 0, progress_pct: 0 })
  })
})
