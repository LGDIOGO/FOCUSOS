import { describe, it, expect } from 'vitest'
import { NAV_DESTINATIONS, PRIMARY_HREFS, splitNavDestinations, isMoreActive } from '../navItems'

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
})
