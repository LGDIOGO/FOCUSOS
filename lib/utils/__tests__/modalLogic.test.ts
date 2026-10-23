import { describe, it, expect } from 'vitest'
import { shouldCloseOnBackdrop, nextFocusIndex } from '../modalLogic'

describe('shouldCloseOnBackdrop', () => {
  const bg = {}, input = {}
  it('fecha quando pressiona e solta no fundo', () => {
    expect(shouldCloseOnBackdrop(bg, bg, bg)).toBe(true)
  })
  it('REGRESSÃO: arrastar de dentro do modal e soltar no fundo não fecha', () => {
    expect(shouldCloseOnBackdrop(input, bg, bg)).toBe(false)
  })
  it('pressionar no fundo e soltar dentro não fecha', () => {
    expect(shouldCloseOnBackdrop(bg, input, bg)).toBe(false)
  })
  it('sem registro de pressionar não fecha', () => {
    expect(shouldCloseOnBackdrop(null, bg, bg)).toBe(false)
  })
})

describe('nextFocusIndex', () => {
  it('sem itens: deixa o padrão', () => expect(nextFocusIndex(0, -1, false)).toBeNull())
  it('Tab no último volta ao primeiro', () => expect(nextFocusIndex(3, 2, false)).toBe(0))
  it('Tab no meio segue o padrão', () => expect(nextFocusIndex(3, 1, false)).toBeNull())
  it('Shift+Tab no primeiro vai ao último', () => expect(nextFocusIndex(3, 0, true)).toBe(2))
  it('Shift+Tab com foco fora dos itens vai ao último', () => expect(nextFocusIndex(3, -1, true)).toBe(2))
  it('Tab com foco fora dos itens vai ao primeiro', () => expect(nextFocusIndex(3, -1, false)).toBe(0))
})
