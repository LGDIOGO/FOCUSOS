import { describe, it, expect } from 'vitest'
import { resolveViewState, isMatrixDayHiddenOnMobile, MATRIX_MOBILE_DAYS } from '../viewState'

describe('resolveViewState', () => {
  it('REGRESSÃO: conta nova (sem dados, sem erro) mostra estado vazio, nunca tela em branco nem erro', () => {
    expect(resolveViewState({ isLoading: false, isError: false, count: 0 })).toBe('empty')
    expect(resolveViewState({ isLoading: false, count: 0 })).toBe('empty')
  })
  it('carregando sem dados mostra carregamento, não vazio', () => {
    expect(resolveViewState({ isLoading: true, count: 0 })).toBe('loading')
  })
  it('erro sem dados mostra erro', () => {
    expect(resolveViewState({ isLoading: false, isError: true, count: 0 })).toBe('error')
  })
  it('REGRESSÃO: com dados em cache, erro de atualização não apaga o conteúdo', () => {
    expect(resolveViewState({ isLoading: false, isError: true, count: 3 })).toBe('content')
    expect(resolveViewState({ isLoading: true, count: 2 })).toBe('content')
  })
})

describe('isMatrixDayHiddenOnMobile', () => {
  it('REGRESSÃO: no celular só os últimos N dias aparecem; os mais recentes nunca somem', () => {
    const total = 30
    const hidden = Array.from({ length: total }, (_, i) => isMatrixDayHiddenOnMobile(i, total))
    expect(hidden.filter(h => !h).length).toBe(MATRIX_MOBILE_DAYS)
    expect(hidden[total - 1]).toBe(false)
    expect(hidden[total - MATRIX_MOBILE_DAYS]).toBe(false)
    expect(hidden[total - MATRIX_MOBILE_DAYS - 1]).toBe(true)
  })
  it('período curto (menos dias que a janela) não esconde nada', () => {
    expect(isMatrixDayHiddenOnMobile(0, 5)).toBe(false)
    expect(isMatrixDayHiddenOnMobile(0, MATRIX_MOBILE_DAYS)).toBe(false)
  })
})

import { isFirstUseSummary } from '../viewState'

describe('isFirstUseSummary', () => {
  const vazio = { loading: false, totalHabits: 0, habitsToday: 0, tasksToday: 0, eventsToday: 0 }
  it('REGRESSÃO: conta nova, tudo carregado e vazio, mostra a orientação de primeiro uso', () => {
    expect(isFirstUseSummary(vazio)).toBe(true)
  })
  it('enquanto carrega (ou lista completa ainda indefinida) não mostra, evitando piscar para quem tem dados', () => {
    expect(isFirstUseSummary({ ...vazio, loading: true })).toBe(false)
    expect(isFirstUseSummary({ ...vazio, totalHabits: undefined })).toBe(false)
  })
  it('REGRESSÃO: quem tem hábito (mesmo sem nada hoje) não vê o aviso de primeiro uso', () => {
    expect(isFirstUseSummary({ ...vazio, totalHabits: 2 })).toBe(false)
    expect(isFirstUseSummary({ ...vazio, tasksToday: 1 })).toBe(false)
    expect(isFirstUseSummary({ ...vazio, eventsToday: 1 })).toBe(false)
  })
})
