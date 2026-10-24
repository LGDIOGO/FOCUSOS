import { describe, it, expect } from 'vitest'
import { categoriesForScope, findDuplicateCategory, sortCategories, moveCategory, selectionAfterDelete } from '../categories'

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

describe('sortCategories / moveCategory', () => {
  const mk = (id: string, order?: number, created_at?: string) => ({ id, name: id, order, created_at })

  it('REGRESSÃO: docs sem order vão para o fim (sem data primeiro, depois por criação), sem quebrar', () => {
    const list = [mk('a'), mk('b', 1), mk('c', 0), mk('d', undefined, '2026-01-01')]
    expect(sortCategories(list).map(c => c.id)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('não altera a lista original', () => {
    const list = [mk('a', 1), mk('b', 0)]
    sortCategories(list)
    expect(list.map(c => c.id)).toEqual(['a', 'b'])
  })

  it('REGRESSÃO: mover com docs sem order renumera tudo e nunca devolve undefined', () => {
    const list = [mk('a'), mk('b'), mk('c')]
    const patches = moveCategory(list, 'c', -1)
    expect(patches.every(p => typeof p.order === 'number')).toBe(true)
    const applied = list.map(c => ({ ...c, order: patches.find(p => p.id === c.id)?.order ?? c.order }))
    expect(sortCategories(applied).map(c => c.id)).toEqual(['a', 'c', 'b'])
  })

  it('só devolve o que mudou', () => {
    const list = [mk('a', 0), mk('b', 1), mk('c', 2)]
    expect(moveCategory(list, 'b', 1)).toEqual([{ id: 'c', order: 1 }, { id: 'b', order: 2 }])
  })

  it('primeiro não sobe, último não desce, id inexistente não faz nada', () => {
    const list = [mk('a', 0), mk('b', 1)]
    expect(moveCategory(list, 'a', -1)).toEqual([])
    expect(moveCategory(list, 'b', 1)).toEqual([])
    expect(moveCategory(list, 'x', 1)).toEqual([])
  })
})

describe('selectionAfterDelete', () => {
  it('REGRESSÃO: excluir a categoria selecionada limpa a seleção', () => {
    expect(selectionAfterDelete('x', 'x')).toBeNull()
  })
  it('excluir outra mantém a seleção', () => {
    expect(selectionAfterDelete('x', 'y')).toBe('x')
    expect(selectionAfterDelete('', 'y')).toBeNull()
    expect(selectionAfterDelete(null, 'y')).toBeNull()
  })
})
