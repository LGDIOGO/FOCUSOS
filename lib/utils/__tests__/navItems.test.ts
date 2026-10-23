import { describe, it, expect } from 'vitest'
import { NAV_DESTINATIONS, PRIMARY_HREFS, splitNavDestinations, isMoreActive, isRouteActive } from '../navItems'

describe('navItems', () => {
  it('barra inferior tem 4 destinos fixos na ordem Resumo, Agenda, Hábitos, Trabalho', () => {
    const { primary } = splitNavDestinations()
    expect(primary.map((i) => i.label)).toEqual(['Resumo', 'Agenda', 'Hábitos', 'Trabalho'])
  })

  it('"Mais" tem todos os demais destinos, sem repetir nem perder nenhum', () => {
    const { primary, more } = splitNavDestinations()
    expect(primary.length + more.length).toBe(NAV_DESTINATIONS.length)
    const hrefs = primary.concat(more).map((i) => i.href).sort()
    expect(hrefs).toEqual(NAV_DESTINATIONS.map((i) => i.href).sort())
    expect(more.some((i) => PRIMARY_HREFS.indexOf(i.href) !== -1)).toBe(false)
  })

  it('isMoreActive só é verdadeiro em destino secundário', () => {
    expect(isMoreActive('/dashboard/finance')).toBe(true)
    expect(isMoreActive('/dashboard/habits')).toBe(false)
    expect(isMoreActive('/dashboard')).toBe(false)
    expect(isMoreActive(null)).toBe(false)
  })

  it('REGRESSÃO: subrota destaca o destino pai e o "Mais"', () => {
    expect(isRouteActive('/dashboard/aposentadoria/acompanhamento', '/dashboard/aposentadoria')).toBe(true)
    expect(isMoreActive('/dashboard/aposentadoria/acompanhamento')).toBe(true)
    expect(isRouteActive('/dashboard/habits/x', '/dashboard/habits')).toBe(true)
    expect(isMoreActive('/dashboard/habits/x')).toBe(false)
  })

  it('REGRESSÃO: /dashboard não fica ativo em subrotas e prefixo parcial não casa', () => {
    expect(isRouteActive('/dashboard/agenda', '/dashboard')).toBe(false)
    expect(isRouteActive('/dashboard', '/dashboard')).toBe(true)
    expect(isRouteActive('/dashboard/goalsx', '/dashboard/goals')).toBe(false)
  })
})

describe('ordem dos destinos', () => {
  it('Sidebar começa por Resumo, Agenda, Hábitos, Trabalho (igual à barra inferior)', () => {
    expect(NAV_DESTINATIONS.slice(0, 4).map((i) => i.label)).toEqual(['Resumo', 'Agenda', 'Hábitos', 'Trabalho'])
  })
  it('"Mais" segue Metas, Finanças, Estudos, Livros, Insights, Aposentadoria, IA', () => {
    expect(splitNavDestinations().more.map((i) => i.label)).toEqual(['Metas', 'Finanças', 'Estudos', 'Livros', 'Insights', 'Aposentadoria', 'IA'])
  })
})
