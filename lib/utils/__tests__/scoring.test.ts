import { describe, it, expect } from 'vitest'
import {
  calcDailyScore,
  calcWeekScore,
  getStreakGraceDays,
  getEffectiveOfensiva,
  getOfensivaLabel,
  type HabitLog,
} from '../scoring'

const log = (status: HabitLog['status']): HabitLog => ({ habit_id: 'h', status, type: 'positive' })

describe('calcDailyScore', () => {
  it('sem logs vale 0', () => {
    expect(calcDailyScore([])).toBe(0)
  })

  it('parcial vale meio ponto', () => {
    expect(calcDailyScore([log('done'), log('partial')])).toBe(75)
    expect(calcDailyScore([log('partial')])).toBe(50)
  })

  it('falha e não registrado valem zero mas contam no total', () => {
    expect(calcDailyScore([log('done'), log('failed'), log('none'), log('done')])).toBe(50)
  })

  it('tudo feito é 100', () => {
    expect(calcDailyScore([log('done'), log('done')])).toBe(100)
  })
})

describe('calcWeekScore', () => {
  it('média arredondada dos dias', () => {
    expect(calcWeekScore([100, 50, 0])).toBe(50)
    expect(calcWeekScore([])).toBe(0)
  })
})

describe('período de graça da ofensiva', () => {
  it('cresce com a ofensiva: 1, 2 e 3 dias', () => {
    expect(getStreakGraceDays(0)).toBe(1)
    expect(getStreakGraceDays(6)).toBe(1)
    expect(getStreakGraceDays(7)).toBe(2)
    expect(getStreakGraceDays(29)).toBe(2)
    expect(getStreakGraceDays(30)).toBe(3)
  })
})

describe('getEffectiveOfensiva', () => {
  const today = '2025-03-10'

  it('feito hoje mantém', () => {
    expect(getEffectiveOfensiva(5, '2025-03-10', 'done', today)).toBe(5)
  })

  it('ontem ainda está na graça', () => {
    expect(getEffectiveOfensiva(5, '2025-03-09', 'none', today)).toBe(5)
  })

  it('passou da graça zera', () => {
    expect(getEffectiveOfensiva(5, '2025-03-07', 'none', today)).toBe(0)
  })

  it('ofensiva longa tem graça maior', () => {
    // 30+ dias: até 3 dias sem registrar
    expect(getEffectiveOfensiva(40, '2025-03-07', 'none', today)).toBe(40)
    expect(getEffectiveOfensiva(40, '2025-03-06', 'none', today)).toBe(0)
  })

  it('falha de hoje zera', () => {
    expect(getEffectiveOfensiva(5, '2025-03-09', 'failed', today)).toBe(0)
  })

  it('sem data de conclusão devolve o valor guardado', () => {
    expect(getEffectiveOfensiva(3, null, 'none', today)).toBe(3)
    expect(getEffectiveOfensiva(0, undefined, 'none', today)).toBe(0)
  })
})

describe('getOfensivaLabel', () => {
  it('singular, plural e marcos', () => {
    expect(getOfensivaLabel(0)).toBe('Comece hoje!')
    expect(getOfensivaLabel(1)).toBe('1 dia de ofensiva')
    expect(getOfensivaLabel(3)).toBe('3 dias seguidos')
    expect(getOfensivaLabel(10)).toContain('10 dias')
    expect(getOfensivaLabel(30)).toContain('🏆')
  })
})
