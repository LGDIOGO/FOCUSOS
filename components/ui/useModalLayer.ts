'use client'

import { useEffect, useId, useRef } from 'react'
import { layerStack } from '@/lib/utils/modalLogic'

/**
 * Registra uma camada (sheet, mini-modal, seletor) na mesma pilha do Modal.
 * ESC chama `onEscape` só se esta for a camada do topo; as de baixo não reagem.
 */
export function useModalLayer(open: boolean, onEscape: () => void) {
  const id = useId()
  const ref = useRef(onEscape)
  ref.current = onEscape
  useEffect(() => {
    if (!open) return
    layerStack.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !layerStack.isTop(id)) return
      e.stopPropagation()
      ref.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      layerStack.remove(id)
    }
  }, [open, id])
}
