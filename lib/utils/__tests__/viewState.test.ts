import { describe, it, expect } from 'vitest'
import { resolveViewState, matrixInitialScrollLeft } from '../viewState'

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

describe('matrixInitialScrollLeft', () => {
  it('REGRESSÃO: matriz larga abre rolada até o fim (dia mais recente visível), sem esconder dias antigos', () => {
    expect(matrixInitialScrollLeft(900, 360)).toBe(540)
  })
  it('matriz que cabe na tela não rola', () => {
    expect(matrixInitialScrollLeft(300, 360)).toBe(0)
    expect(matrixInitialScrollLeft(360, 360)).toBe(0)
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

describe('isFirstUseSummary com erro', () => {
  it('REGRESSÃO: falha de carregamento sem dados não vira "primeiro uso"', () => {
    expect(isFirstUseSummary({ loading: false, hasError: true, totalHabits: 0, habitsToday: 0, tasksToday: 0, eventsToday: 0 })).toBe(false)
  })
})
