import { describe, it, expect } from 'vitest'
import { occursOn } from '../recurrence'

/**
 * Regressões do motor único de recorrência. Cada bloco "REGRESSÃO" descreve um
 * bug que já aconteceu quando existiam três cópias divergentes da lógica.
 */

describe('occursOn — básico', () => {
  it('sem regra, só ocorre na data inicial', () => {
    expect(occursOn(undefined, '2025-03-10', '2025-03-10')).toBe(true)
    expect(occursOn(undefined, '2025-03-10', '2025-03-11')).toBe(false)
    expect(occursOn(null, '2025-03-10', '2025-03-11')).toBe(false)
  })

  it('nunca ocorre antes do início', () => {
    expect(occursOn({ frequency: 'daily' }, '2025-03-10', '2025-03-09')).toBe(false)
  })

  it('início ausente ou inválido não explode', () => {
    expect(occursOn({ frequency: 'daily' }, undefined, '2025-03-10')).toBe(false)
    expect(occursOn({ frequency: 'daily' }, '', '2025-03-10')).toBe(false)
    expect(occursOn({ frequency: 'daily' }, 'lixo', 'tambem-lixo')).toBe(false)
  })
})

describe('occursOn — diário', () => {
  it('REGRESSÃO: "dia sim, dia não" respeita o interval (hábitos ignoravam)', () => {
    const rule = { frequency: 'daily' as const, interval: 2 }
    expect(occursOn(rule, '2025-03-10', '2025-03-10')).toBe(true)
    expect(occursOn(rule, '2025-03-10', '2025-03-11')).toBe(false)
    expect(occursOn(rule, '2025-03-10', '2025-03-12')).toBe(true)
    expect(occursOn(rule, '2025-03-10', '2025-03-13')).toBe(false)
  })

  it('interval 0 ou negativo cai para 1', () => {
    expect(occursOn({ frequency: 'daily', interval: 0 }, '2025-03-10', '2025-03-11')).toBe(true)
    expect(occursOn({ frequency: 'daily', interval: -3 }, '2025-03-10', '2025-03-11')).toBe(true)
  })
})

describe('occursOn — end_date', () => {
  it('REGRESSÃO: série com prazo termina (eventos ignoravam end_date)', () => {
    const rule = { frequency: 'daily' as const }
    expect(occursOn(rule, '2025-03-10', '2025-03-15', '2025-03-15')).toBe(true) // inclusivo
    expect(occursOn(rule, '2025-03-10', '2025-03-16', '2025-03-15')).toBe(false)
  })

  it('end_date vazio/nulo significa sem fim', () => {
    expect(occursOn({ frequency: 'daily' }, '2025-03-10', '2030-01-01', null)).toBe(true)
    expect(occursOn({ frequency: 'daily' }, '2025-03-10', '2030-01-01', '')).toBe(true)
  })
})

describe('occursOn — semanal', () => {
  // 2025-01-06 é segunda-feira
  it('cai só no mesmo dia da semana do início', () => {
    const rule = { frequency: 'weekly' as const }
    expect(occursOn(rule, '2025-01-06', '2025-01-13')).toBe(true)
    expect(occursOn(rule, '2025-01-06', '2025-01-14')).toBe(false)
  })

  it('quinzenal pula semanas alternadas', () => {
    const rule = { frequency: 'weekly' as const, interval: 2 }
    expect(occursOn(rule, '2025-01-06', '2025-01-13')).toBe(false)
    expect(occursOn(rule, '2025-01-06', '2025-01-20')).toBe(true)
  })
})

describe('occursOn — dias específicos', () => {
  const monWedFri = { frequency: 'specific_days' as const, days_of_week: [1, 3, 5] }

  it('cai só nos dias marcados', () => {
    expect(occursOn(monWedFri, '2025-01-06', '2025-01-06')).toBe(true)  // seg
    expect(occursOn(monWedFri, '2025-01-06', '2025-01-07')).toBe(false) // ter
    expect(occursOn(monWedFri, '2025-01-06', '2025-01-08')).toBe(true)  // qua
    expect(occursOn(monWedFri, '2025-01-06', '2025-01-11')).toBe(false) // sáb
  })

  it('lista vazia nunca ocorre', () => {
    expect(occursOn({ frequency: 'specific_days', days_of_week: [] }, '2025-01-06', '2025-01-06')).toBe(false)
    expect(occursOn({ frequency: 'specific_days' }, '2025-01-06', '2025-01-06')).toBe(false)
  })

  it('interval 2 só vale em semanas alternadas', () => {
    const rule = { frequency: 'specific_days' as const, days_of_week: [1], interval: 2 }
    expect(occursOn(rule, '2025-01-06', '2025-01-13')).toBe(false)
    expect(occursOn(rule, '2025-01-06', '2025-01-20')).toBe(true)
  })
})

describe('occursOn — mensal', () => {
  const monthly = { frequency: 'monthly' as const }

  it('mantém o dia do mês', () => {
    expect(occursOn(monthly, '2025-01-15', '2025-02-15')).toBe(true)
    expect(occursOn(monthly, '2025-01-15', '2025-02-16')).toBe(false)
  })

  it('REGRESSÃO: dia 31 não some em meses curtos — cai no último dia', () => {
    expect(occursOn(monthly, '2025-01-31', '2025-02-28')).toBe(true)
    expect(occursOn(monthly, '2025-01-31', '2025-04-30')).toBe(true)
    expect(occursOn(monthly, '2025-01-31', '2025-06-30')).toBe(true)
    expect(occursOn(monthly, '2025-01-31', '2025-03-31')).toBe(true)
  })

  it('REGRESSÃO: dia 31 não ocorre duas vezes no mesmo mês', () => {
    expect(occursOn(monthly, '2025-01-31', '2025-04-29')).toBe(false)
    expect(occursOn(monthly, '2025-01-31', '2025-02-27')).toBe(false)
  })

  it('ano bissexto: dia 29/31 cai em 29 de fevereiro', () => {
    expect(occursOn(monthly, '2024-01-31', '2024-02-29')).toBe(true)
    expect(occursOn(monthly, '2024-01-31', '2024-02-28')).toBe(false)
  })

  it('interval 3 (trimestral)', () => {
    const rule = { frequency: 'monthly' as const, interval: 3 }
    expect(occursOn(rule, '2025-01-10', '2025-02-10')).toBe(false)
    expect(occursOn(rule, '2025-01-10', '2025-04-10')).toBe(true)
  })
})

describe('occursOn — anual', () => {
  const yearly = { frequency: 'yearly' as const }

  it('cai no mesmo dia e mês', () => {
    expect(occursOn(yearly, '2024-07-04', '2025-07-04')).toBe(true)
    expect(occursOn(yearly, '2024-07-04', '2025-07-05')).toBe(false)
    expect(occursOn(yearly, '2024-07-04', '2025-08-04')).toBe(false)
  })

  it('29/02 cai em 28/02 nos anos não bissextos', () => {
    expect(occursOn(yearly, '2024-02-29', '2025-02-28')).toBe(true)
    expect(occursOn(yearly, '2024-02-29', '2028-02-29')).toBe(true)
  })
})

describe('occursOn — regra desconhecida', () => {
  it('frequência inválida não ocorre', () => {
    expect(occursOn({ frequency: 'bogus' as any }, '2025-01-01', '2025-01-02')).toBe(false)
  })
})
