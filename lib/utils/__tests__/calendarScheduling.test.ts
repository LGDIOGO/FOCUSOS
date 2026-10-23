import { describe, it, expect } from 'vitest'
import { toRRule, allocateSlots, busyFrom, toMinutes, toHHMM } from '../calendarScheduling'

describe('toRRule', () => {
  it('sem regra, devolve vazio (evento único)', () => {
    expect(toRRule(undefined)).toEqual([])
    expect(toRRule(null)).toEqual([])
  })

  it('REGRESSÃO: série vira UM RRULE, não uma cópia por dia', () => {
    expect(toRRule({ frequency: 'daily' })).toEqual(['RRULE:FREQ=DAILY'])
    expect(toRRule({ frequency: 'weekly' })).toEqual(['RRULE:FREQ=WEEKLY'])
    expect(toRRule({ frequency: 'monthly' })).toEqual(['RRULE:FREQ=MONTHLY'])
    expect(toRRule({ frequency: 'yearly' })).toEqual(['RRULE:FREQ=YEARLY'])
  })

  it('dias específicos viram BYDAY', () => {
    expect(toRRule({ frequency: 'specific_days', days_of_week: [1, 3, 5] }))
      .toEqual(['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'])
    expect(toRRule({ frequency: 'specific_days', days_of_week: [0, 6] }))
      .toEqual(['RRULE:FREQ=WEEKLY;BYDAY=SU,SA'])
  })

  it('dias específicos vazios ou inválidos não geram regra', () => {
    expect(toRRule({ frequency: 'specific_days', days_of_week: [] })).toEqual([])
    expect(toRRule({ frequency: 'specific_days', days_of_week: [9, -1] })).toEqual([])
  })

  it('interval > 1 vira INTERVAL; interval 1 é omitido', () => {
    expect(toRRule({ frequency: 'weekly', interval: 2 })).toEqual(['RRULE:FREQ=WEEKLY;INTERVAL=2'])
    expect(toRRule({ frequency: 'weekly', interval: 1 })).toEqual(['RRULE:FREQ=WEEKLY'])
  })

  it('end_date vira UNTIL inclusivo em UTC', () => {
    expect(toRRule({ frequency: 'daily' }, '2025-03-15'))
      .toEqual(['RRULE:FREQ=DAILY;UNTIL=20250315T235959Z'])
  })

  it('UNTIL malformado é ignorado em vez de quebrar o Google', () => {
    expect(toRRule({ frequency: 'daily' }, 'amanhã')).toEqual(['RRULE:FREQ=DAILY'])
  })
})

describe('conversão de horas', () => {
  it('toMinutes / toHHMM são inversos', () => {
    expect(toMinutes('09:30')).toBe(570)
    expect(toHHMM(570)).toBe('09:30')
    expect(toHHMM(toMinutes('23:05'))).toBe('23:05')
  })

  it('toHHMM dá a volta na meia-noite', () => {
    expect(toHHMM(1440 + 30)).toBe('00:30')
  })

  it('toMinutes de lixo devolve NaN', () => {
    expect(Number.isNaN(toMinutes('abc'))).toBe(true)
  })
})

describe('busyFrom', () => {
  it('sem horário não ocupa nada', () => {
    expect(busyFrom(undefined)).toBeNull()
    expect(busyFrom('')).toBeNull()
  })

  it('assume 1h quando a duração é inválida', () => {
    expect(busyFrom('10:00', 0)).toEqual({ startMin: 600, endMin: 660 })
    expect(busyFrom('10:00', 30)).toEqual({ startMin: 600, endMin: 630 })
  })
})

/** Dois blocos de 1h se sobrepõem? */
const overlap = (a: string, b: string, dur = 60) => {
  const x = toMinutes(a), y = toMinutes(b)
  return x < y + dur && y < x + dur
}

describe('allocateSlots', () => {
  it('count 0 não aloca', () => {
    expect(allocateSlots([], 0)).toEqual([])
  })

  it('dia vazio começa às 06:00 em blocos de 1h', () => {
    expect(allocateSlots([], 3)).toEqual(['06:00', '07:00', '08:00'])
  })

  it('REGRESSÃO: nunca sobrepõe item que já tem horário', () => {
    const fixed = [busyFrom('06:30', 60)!, busyFrom('09:00', 120)!]
    const slots = allocateSlots(fixed, 4)
    for (const s of slots) {
      for (const f of ['06:30', '09:00']) {
        const dur = f === '09:00' ? 120 : 60
        const a = toMinutes(s), b = toMinutes(f)
        expect(a < b + dur && b < a + 60).toBe(false)
      }
    }
  })

  it('REGRESSÃO: os blocos alocados não se sobrepõem entre si', () => {
    const slots = allocateSlots([busyFrom('10:00', 60)!], 8)
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        expect(overlap(slots[i], slots[j])).toBe(false)
      }
    }
  })

  it('aproveita o vão entre dois compromissos', () => {
    // 06:00–07:00 e 08:00–09:00 ocupados: 07:00 cabe exatamente
    const fixed = [busyFrom('06:00', 60)!, busyFrom('08:00', 60)!]
    expect(allocateSlots(fixed, 1)).toEqual(['07:00'])
  })

  it('janela esgotada: enfileira depois, sem sumir nem sobrepor', () => {
    const slots = allocateSlots([], 20)
    expect(slots).toHaveLength(20)
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        expect(overlap(slots[i], slots[j])).toBe(false)
      }
    }
  })

  it('mantém a ordem pedida (ordem crescente de horário)', () => {
    const slots = allocateSlots([], 5).map(toMinutes)
    expect([...slots].sort((a, b) => a - b)).toEqual(slots)
  })
})
