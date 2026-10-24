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

/** Pilha de camadas abertas (modais, sheets, seletores). Só a do topo reage ao ESC. */
export interface LayerStack {
  push(id: string): void
  remove(id: string): void
  isTop(id: string): boolean
  size(): number
}

export function createLayerStack(): LayerStack {
  const ids: string[] = []
  return {
    push(id) { ids.push(id) },
    remove(id) { const i = ids.lastIndexOf(id); if (i >= 0) ids.splice(i, 1) },
    isTop(id) { return ids.length > 0 && ids[ids.length - 1] === id },
    size() { return ids.length },
  }
}

/** Pilha única compartilhada por Modal e useModalLayer. */
export const layerStack = createLayerStack()
