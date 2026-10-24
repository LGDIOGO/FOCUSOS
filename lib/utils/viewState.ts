/**
 * Decide o que uma lista deve mostrar: carregando, erro, vazio ou conteudo.
 * Funcao pura (sem React/Firebase) para ser testada.
 *
 * Regra de seguranca: erro so vale se NAO ha dados em cache; com dados, mostramos
 * o conteudo (um erro de refetch nao pode apagar a tela do usuario).
 * Conta nova (colecao vazia, sem erro) cai em 'empty', nunca em 'error'.
 */
export type ViewState = 'loading' | 'error' | 'empty' | 'content'

export function resolveViewState(input: {
  isLoading: boolean
  isError?: boolean
  count: number
}): ViewState {
  if (input.count > 0) return 'content'
  if (input.isLoading) return 'loading'
  if (input.isError) return 'error'
  return 'empty'
}

/** Quantos dias a matriz de habitos mostra no celular (as colunas antigas ficam so a partir de sm). */
export const MATRIX_MOBILE_DAYS = 10

/** true se a coluna `index` (0 = mais antiga) de `total` deve sumir no celular. */
export function isMatrixDayHiddenOnMobile(index: number, total: number, mobileDays: number = MATRIX_MOBILE_DAYS): boolean {
  return index < total - mobileDays
}

/**
 * Primeiro uso do Resumo: tudo carregado e nenhum habito, tarefa ou compromisso existe
 * (nem fora de hoje). Com qualquer dado, ou ainda carregando, nao e primeiro uso.
 * `totalHabits` e `undefined` enquanto a lista completa ainda carrega.
 */
export function isFirstUseSummary(input: {
  loading: boolean
  hasError?: boolean
  totalHabits: number | undefined
  habitsToday: number
  tasksToday: number
  eventsToday: number
}): boolean {
  if (input.loading || input.hasError || input.totalHabits === undefined) return false
  return input.totalHabits === 0 && input.habitsToday === 0 && input.tasksToday === 0 && input.eventsToday === 0
}
