import { describe, test, expect } from 'vitest'
import { format } from 'date-fns'
import { decideStreakUpdate, StreakInput } from '../streakRule'

const base: StreakInput = {
  targetDate: '2026-10-25',
  today: '2026-10-25',
  status: 'done',
  previousStatus: 'none',
  currentStreak: 5,
  lastCompletedDate: '2026-10-24',
  prevScheduledDate: () => '2026-10-24',
}
const run = (o: Partial<StreakInput>) => decideStreakUpdate({ ...base, ...o })

describe('REGRESSÃO: só marcar HOJE altera a ofensiva', () => {
  test('REGRESSÃO: data passada done não incrementa; pede recálculo sem excluir', () => {
    expect(run({ targetDate: '2026-10-20' })).toEqual({ type: 'recompute', excludeDate: undefined, approximate: null })
  })
  test('REGRESSÃO: data futura não altera nada (nem last_completed_date)', () => {
    expect(run({ targetDate: '2026-10-27' })).toEqual({ type: 'keep' })
    expect(run({ targetDate: '2026-10-27', status: 'failed' })).toEqual({ type: 'keep' })
  })
  test('REGRESSÃO: failed em dia passado NÃO zera; recalcula excluindo a data', () => {
    expect(run({ targetDate: '2026-10-20', status: 'failed' })).toEqual({
      type: 'recompute', excludeDate: '2026-10-20', approximate: null,
    })
  })
  test('REGRESSÃO: hoje failed zera e limpa a última data', () => {
    expect(run({ status: 'failed' })).toEqual({ type: 'set', streak: 0, lastDate: null })
  })
  test('REGRESSÃO: hoje marcar done estende a ofensiva se a última foi a ocorrência anterior', () => {
    expect(run({})).toEqual({ type: 'set', streak: 6, lastDate: '2026-10-25' })
  })
  test('REGRESSÃO: hoje marcar done com lacuna ou sem histórico reinicia em 1', () => {
    expect(run({ lastCompletedDate: '2026-10-20' })).toEqual({ type: 'set', streak: 1, lastDate: '2026-10-25' })
    expect(run({ lastCompletedDate: null, currentStreak: 0 })).toEqual({ type: 'set', streak: 1, lastDate: '2026-10-25' })
    expect(run({ prevScheduledDate: () => null })).toEqual({ type: 'set', streak: 1, lastDate: '2026-10-25' })
  })
  test('REGRESSÃO: hoje failed -> done volta a 1 (sem última data) ou +1 (última = ocorrência anterior)', () => {
    expect(run({ previousStatus: 'failed', lastCompletedDate: null, currentStreak: 0 })).toEqual({ type: 'set', streak: 1, lastDate: '2026-10-25' })
    expect(run({ previousStatus: 'failed' })).toEqual({ type: 'set', streak: 6, lastDate: '2026-10-25' })
  })
  test('REGRESSÃO: hoje done -> failed zera e limpa a última data', () => {
    expect(run({ previousStatus: 'done', status: 'failed', lastCompletedDate: '2026-10-25' })).toEqual({ type: 'set', streak: 0, lastDate: null })
  })
  test('REGRESSÃO: hoje repetir a mesma marcação não muda a ofensiva', () => {
    expect(run({ previousStatus: 'done' })).toEqual({ type: 'keep' })
    expect(run({ lastCompletedDate: '2026-10-25' })).toEqual({ type: 'set', streak: 5, lastDate: '2026-10-25' })
  })
  test('REGRESSÃO: hoje desfazer done recalcula excluindo hoje (com aproximação otimista)', () => {
    expect(run({ previousStatus: 'done', status: 'none', lastCompletedDate: '2026-10-25' })).toEqual({
      type: 'recompute', excludeDate: '2026-10-25', approximate: { streak: 4, lastDate: '2026-10-24' },
    })
    expect(run({ previousStatus: 'done', status: 'none', lastCompletedDate: '2026-10-25', currentStreak: 1 })).toEqual({
      type: 'recompute', excludeDate: '2026-10-25', approximate: { streak: 0, lastDate: null },
    })
  })
  test('REGRESSÃO: hábito que não ocorre hoje (última != hoje ao desfazer) não aproxima', () => {
    expect(run({ previousStatus: 'done', status: 'none', lastCompletedDate: '2026-10-22' })).toEqual({
      type: 'recompute', excludeDate: '2026-10-25', approximate: null,
    })
  })
  test('REGRESSÃO: virada de dia usa a data LOCAL (23:30 e 00:30)', () => {
    const at2330 = format(new Date(2026, 9, 24, 23, 30), 'yyyy-MM-dd')
    const at0030 = format(new Date(2026, 9, 25, 0, 30), 'yyyy-MM-dd')
    expect(at2330).toBe('2026-10-24')
    expect(at0030).toBe('2026-10-25')
    // 23:30 do dia 24: marcar 24 é "hoje"; 25 é futuro
    expect(run({ today: at2330, targetDate: '2026-10-24', lastCompletedDate: '2026-10-23', prevScheduledDate: () => '2026-10-23' }).type).toBe('set')
    expect(run({ today: at2330, targetDate: '2026-10-25' })).toEqual({ type: 'keep' })
    // 00:30 do dia 25: marcar 24 agora é passado
    expect(run({ today: at0030, targetDate: '2026-10-24' }).type).toBe('recompute')
  })
})
