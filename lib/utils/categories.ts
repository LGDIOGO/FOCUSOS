/**
 * Regra de quais categorias aparecem em cada seletor. Função pura (sem Firebase)
 * para poder ser testada.
 *
 * Por que não é um filtro por igualdade: o filtro estrito `type === escopo`
 * (introduzido em 2026-10-05 para tirar tipos de Trabalho dos modais pessoais)
 * escondia também categorias legítimas do dono: as criadas na Configurações
 * (que gravam o escopo escolhido ali) ou no modal de outra área, e as antigas
 * sem `type` ou com `type` fora da lista. Hábitos, Compromissos e Metas são a
 * mesma vida pessoal, então compartilham as categorias entre si; só os escopos
 * de Trabalho continuam isolados.
 */

export type CategoryScopeId =
  | 'habits' | 'agenda' | 'goals'
  | 'work_type' | 'work_category'

const PERSONAL: string[] = ['habits', 'agenda', 'goals']
const ALL: string[] = [...PERSONAL, 'work_type', 'work_category']

export interface CategoryLike {
  id: string
  name: string
  type?: string
}

/** `type` ausente ou desconhecido (documento antigo). */
export const isLegacyScope = (type?: string) => !type || ALL.indexOf(type) === -1

export function categoriesForScope<T extends CategoryLike>(
  all: T[],
  scopes: string[] | null,
): T[] {
  if (!scopes) return all
  const personalPicker = scopes.some(s => PERSONAL.indexOf(s) !== -1)
  return all.filter(c => {
    if (scopes.indexOf(c.type as string) !== -1) return true
    if (!personalPicker) return false
    return PERSONAL.indexOf(c.type as string) !== -1 || isLegacyScope(c.type)
  })
}

/** Minúsculas, sem acento, sem espaços nas pontas e com espaços internos unificados. */
export const normalizeCategoryName = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Já existe categoria com esse nome entre as que o seletor do escopo `type`
 * enxerga? Escopos de Trabalho são isolados: só colidem dentro do próprio escopo.
 * `ignoreId` permite renomear sem colidir consigo mesma.
 */
export function findDuplicateCategory<T extends CategoryLike>(
  all: T[],
  name: string,
  type: string,
  ignoreId?: string,
): T | undefined {
  const key = normalizeCategoryName(name)
  if (!key) return undefined
  return categoriesForScope(all, [type]).find(
    c => c.id !== ignoreId && normalizeCategoryName(c.name) === key,
  )
}

export const DUPLICATE_CATEGORY_MESSAGE = 'Já existe uma categoria com esse nome.'

/**
 * Ordenação manual. `order` é opcional: documentos antigos (e os recém-criados,
 * que não gravam `order`) vão para o fim, por data de criação e, no empate,
 * pela posição original (sort estável).
 */
export interface OrderableCategory extends CategoryLike {
  order?: number
  created_at?: string
}

const hasOrder = (c: { order?: number }) => typeof c.order === 'number' && isFinite(c.order)

export function sortCategories<T extends OrderableCategory>(list: T[]): T[] {
  return list
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ao = hasOrder(a.c), bo = hasOrder(b.c)
      if (ao && bo && a.c.order !== b.c.order) return (a.c.order as number) - (b.c.order as number)
      if (ao !== bo) return ao ? -1 : 1
      const ac = a.c.created_at || '', bc = b.c.created_at || ''
      if (ac !== bc) return ac < bc ? -1 : 1
      return a.i - b.i
    })
    .map(x => x.c)
}

/**
 * Sobe (-1) ou desce (+1) uma categoria na lista já exibida. Devolve só os
 * `{id, order}` que mudaram, com a lista inteira renumerada 0..n-1 (assim docs
 * sem `order` ganham posição e nada fica `undefined`). Vazio se não há movimento.
 */
export function moveCategory<T extends OrderableCategory>(
  list: T[],
  id: string,
  direction: -1 | 1,
): Array<{ id: string; order: number }> {
  const sorted = sortCategories(list)
  const from = sorted.findIndex(c => c.id === id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= sorted.length) return []
  const next = sorted.slice()
  const tmp = next[from]; next[from] = next[to]; next[to] = tmp
  const patches: Array<{ id: string; order: number }> = []
  next.forEach((c, i) => { if (c.order !== i) patches.push({ id: c.id, order: i }) })
  return patches
}

/** Seleção do modal depois de excluir uma categoria: solta se era a excluída. */
export function selectionAfterDelete(value: string | null | undefined, deletedId: string): string | null {
  if (!value) return null
  return value === deletedId ? null : value
}
