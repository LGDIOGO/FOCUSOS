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
