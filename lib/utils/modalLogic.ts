// Regras puras do Modal base (sem React/DOM) para poderem ser testadas.

/**
 * Decide se um clique no fundo deve fechar o modal.
 * Só fecha se o botão foi pressionado E solto no próprio fundo. Arrastar para
 * selecionar texto dentro do modal e soltar fora não pode fechar.
 */
export function shouldCloseOnBackdrop<T>(down: T | null, up: T | null, backdrop: T): boolean {
  return down !== null && up !== null && down === backdrop && up === backdrop
}

/**
 * Próximo índice de foco para o trap do Tab. Retorna `null` quando o navegador
 * pode seguir o comportamento padrão (foco no meio da lista).
 * `activeIndex` = -1 quando o foco está fora dos itens (ex.: no próprio diálogo).
 */
export function nextFocusIndex(count: number, activeIndex: number, shift: boolean): number | null {
  if (count <= 0) return null
  const last = count - 1
  if (shift) return activeIndex <= 0 ? last : null
  return activeIndex === -1 || activeIndex === last ? 0 : null
}

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
