'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DeleteButtonProps {
  label: string
  onConfirm: (e: React.MouseEvent) => void
  iconSize?: number
  /** Classes do botão de lixeira (visibilidade, cor, alvo de toque). */
  className?: string
}

const STOP = {
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onMouseUp: (e: React.SyntheticEvent) => e.stopPropagation(),
  onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchEnd: (e: React.SyntheticEvent) => e.stopPropagation(),
}

/** Lixeira com confirmação inline ("Sim, excluir" / "Cancelar"), sem window.confirm. */
export function DeleteButton({ label, onConfirm, iconSize = 16, className }: DeleteButtonProps) {
  const [asking, setAsking] = useState(false)
  const trashRef = useRef<HTMLButtonElement>(null)
  const yesRef = useRef<HTMLButtonElement>(null)
  const boxRef = useRef<HTMLSpanElement>(null)
  const returnFocus = useRef(false)

  // Ao fechar sem excluir, devolve o foco à lixeira se ele estava na confirmação.
  function close() {
    const active = typeof document !== 'undefined' ? document.activeElement : null
    returnFocus.current = !!(active && boxRef.current && boxRef.current.contains(active))
    setAsking(false)
  }

  useEffect(() => {
    if (asking) {
      yesRef.current?.focus()
      const t = setTimeout(close, 6000)
      return () => clearTimeout(t)
    }
    if (returnFocus.current) {
      returnFocus.current = false
      trashRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asking])

  if (asking) {
    return (
      <span
        ref={boxRef}
        role="alert"
        className="flex flex-wrap items-center justify-end gap-1 shrink-0"
        {...STOP}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={yesRef}
          type="button"
          onClick={(e) => { e.stopPropagation(); setAsking(false); onConfirm(e) }}
          className="min-h-[44px] px-2 rounded-xl bg-red-500/15 text-red-400 text-xs font-bold whitespace-nowrap focus-visible:outline focus-visible:outline-2"
        >
          Sim, excluir
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); close() }}
          className="min-h-[44px] px-2 rounded-xl text-[var(--text-secondary)] text-xs font-bold focus-visible:outline focus-visible:outline-2"
        >
          Cancelar
        </button>
      </span>
    )
  }

  return (
    <button
      ref={trashRef}
      type="button"
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); setAsking(true) }}
      {...STOP}
      className={cn('min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 focus-visible:outline focus-visible:outline-2', className)}
    >
      <Trash2 size={iconSize} />
    </button>
  )
}
