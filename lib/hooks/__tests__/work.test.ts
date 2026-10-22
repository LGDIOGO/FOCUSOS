import { describe, it, expect, vi } from 'vitest'

// useWork.ts importa Firebase no topo; as funções testadas aqui são puras.
vi.mock('@/lib/firebase/config', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('@/lib/context/AuthContext', () => ({ useCurrentUser: () => null }))
vi.mock('@/lib/hooks/useGoogleCalendar', () => ({ scheduleCalendarSync: () => {} }))

import { expandOccurrences, buildReport } from '../useWork'

const item = (over: Record<string, unknown> = {}) =>
  ({ id: 'a', title: 'Item', kind: 'Tarefa', date: '2025-03-10', ...over }) as any

const log = (item_id: string, log_date: string, status: string, extra = {}) =>
  ({ item_id, log_date, status, ...extra }) as any

describe('expandOccurrences', () => {
  it('item único aparece só no próprio dia', () => {
    const out = expandOccurrences([item()], [], '2025-03-09', '2025-03-12')
    expect(out.map(o => o.occurrence_date)).toEqual(['2025-03-10'])
  })

  it('série diária gera uma ocorrência por dia do intervalo', () => {
    const out = expandOccurrences(
      [item({ recurrence: { frequency: 'daily' } })], [], '2025-03-10', '2025-03-13',
    )
    expect(out.map(o => o.occurrence_date))
      .toEqual(['2025-03-10', '2025-03-11', '2025-03-12', '2025-03-13'])
  })

  it('REGRESSÃO: status é por data — marcar um dia não altera os outros', () => {
    const out = expandOccurrences(
      [item({ recurrence: { frequency: 'daily' } })],
      [log('a', '2025-03-11', 'done')],
      '2025-03-10', '2025-03-12',
    )
    const byDay = Object.fromEntries(out.map(o => [o.occurrence_date, o.status]))
    expect(byDay).toEqual({ '2025-03-10': 'none', '2025-03-11': 'done', '2025-03-12': 'none' })
  })

  it('log de outro item não vaza para este', () => {
    const out = expandOccurrences([item()], [log('outro', '2025-03-10', 'done')], '2025-03-10', '2025-03-10')
    expect(out[0].status).toBe('none')
  })

  it('end_date é inclusivo', () => {
    const out = expandOccurrences(
      [item({ recurrence: { frequency: 'daily' }, end_date: '2025-03-11' })],
      [], '2025-03-10', '2025-03-14',
    )
    expect(out.map(o => o.occurrence_date)).toEqual(['2025-03-10', '2025-03-11'])
  })

  it('intervalo invertido ou inválido devolve vazio', () => {
    expect(expandOccurrences([item()], [], '2025-03-12', '2025-03-10')).toEqual([])
    expect(expandOccurrences([item()], [], '', '')).toEqual([])
  })

  it('ordena por data, depois horário, itens sem horário por último', () => {
    const out = expandOccurrences(
      [item({ id: 'x', title: 'Zeta' }), item({ id: 'y', title: 'Alfa', time: '14:00' }), item({ id: 'z', title: 'Beta', time: '09:00' })],
      [], '2025-03-10', '2025-03-10',
    )
    expect(out.map(o => o.id)).toEqual(['z', 'y', 'x'])
  })
})

describe('buildReport', () => {
  const occ = (status: string, date = '2025-03-10', over = {}) =>
    ({ ...item(over), occurrence_date: date, status }) as any

  it('REGRESSÃO: parcial vale 0,5 no aproveitamento', () => {
    const r = buildReport([occ('done'), occ('partial')], '2025-03-10')
    expect(r.completionRate).toBe(75)
  })

  it('REGRESSÃO: dias futuros não derrubam o percentual', () => {
    const r = buildReport([occ('done'), occ('none', '2025-03-20')], '2025-03-10')
    expect(r.total).toBe(1)
    expect(r.completionRate).toBe(100)
  })

  it('conta cada status', () => {
    const r = buildReport([occ('done'), occ('partial'), occ('failed'), occ('none')], '2025-03-10')
    expect([r.done, r.partial, r.failed, r.pending]).toEqual([1, 1, 1, 1])
  })

  it('sem ocorrências vale 0, sem dividir por zero', () => {
    const r = buildReport([], '2025-03-10')
    expect(r.completionRate).toBe(0)
    expect(r.byDay).toEqual([])
  })

  it('agrupa por categoria; sem categoria vira "Interno"', () => {
    const r = buildReport(
      [occ('done', '2025-03-10', { marketplace: 'Loja' }), occ('none', '2025-03-10', { marketplace: '' })],
      '2025-03-10',
    )
    const names = r.byMarketplace.map(m => m.marketplace).sort()
    expect(names).toEqual(['Interno', 'Loja'])
  })

  it('por dia: parcial entra com meio ponto', () => {
    const r = buildReport([occ('done'), occ('partial')], '2025-03-10')
    expect(r.byDay[0].rate).toBe(75)
  })
})
