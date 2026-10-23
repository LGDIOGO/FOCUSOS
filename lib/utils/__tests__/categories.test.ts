import { describe, it, expect } from 'vitest'
import { categoriesForScope, findDuplicateCategory } from '../categories'

const cats = [
  { id: '1', name: 'Faculdade', type: 'agenda' },
  { id: '2', name: 'WCT', type: 'habits' },
  { id: '3', name: 'Z', type: 'goals' },
  { id: '4', name: 'Antiga' },                       // sem type
  { id: '5', name: 'Estranha', type: 'task' },       // type fora da lista
  { id: '6', name: 'Mercado Livre', type: 'work_type' },
  { id: '7', name: 'Campaign', type: 'work_category' },
]

describe('categoriesForScope', () => {
  it('REGRESSÃO: categoria criada em outra área pessoal ou sem type aparece no seletor de hábito', () => {
    const names = categoriesForScope(cats, ['habits']).map(c => c.name)
    expect(names).toEqual(['Faculdade', 'WCT', 'Z', 'Antiga', 'Estranha'])
  })

  it('compromisso e metas enxergam o mesmo conjunto pessoal', () => {
    expect(categoriesForScope(cats, ['agenda']).length).toBe(5)
    expect(categoriesForScope(cats, ['goals']).length).toBe(5)
  })

  it('tipos de Trabalho continuam fora dos modais pessoais', () => {
    const names = categoriesForScope(cats, ['habits']).map(c => c.name)
    expect(names).not.toContain('Mercado Livre')
    expect(names).not.toContain('Campaign')
  })

  it('escopos de Trabalho seguem estritos', () => {
    expect(categoriesForScope(cats, ['work_type']).map(c => c.name)).toEqual(['Mercado Livre'])
  })

  it('sem escopo devolve tudo', () => {
    expect(categoriesForScope(cats, null).length).toBe(7)
  })
})

describe('findDuplicateCategory', () => {
  const all = [
    { id: '1', name: 'Faculdade', type: 'agenda' },
    { id: '2', name: 'Mercado Livre', type: 'work_type' },
    { id: '3', name: 'Antiga' },
  ]
  it('REGRESSÃO: ignora maiúsculas, acentos e espaços', () => {
    expect(findDuplicateCategory(all, '  facúldade ', 'habits')?.id).toBe('1')
    expect(findDuplicateCategory(all, 'ANTIGA', 'agenda')?.id).toBe('3')
  })
  it('renomear não colide consigo mesma', () => {
    expect(findDuplicateCategory(all, 'Faculdade', 'agenda', '1')).toBeUndefined()
  })
  it('Trabalho é isolado dos escopos pessoais', () => {
    expect(findDuplicateCategory(all, 'Mercado Livre', 'habits')).toBeUndefined()
    expect(findDuplicateCategory(all, 'mercado livre', 'work_type')?.id).toBe('2')
  })
  it('nome vazio não é duplicado', () => {
    expect(findDuplicateCategory(all, '   ', 'habits')).toBeUndefined()
  })
})
