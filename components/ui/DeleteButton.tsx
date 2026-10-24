'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!asking) return
    const t = setTimeout(() => setAsking(false), 6000)
    return () => clearTimeout(t)
  }, [asking])

  if (asking) {
    return (
      <span className="flex items-center gap-1 shrink-0" {...STOP} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAsking(false); onConfirm(e) }}
          className="min-h-[44px] px-3 rounded-xl bg-red-500/15 text-red-400 text-xs font-bold whitespace-nowrap focus-visible:outline focus-visible:outline-2"
        >
          Sim, excluir
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAsking(false) }}
          className="min-h-[44px] px-3 rounded-xl text-[var(--text-secondary)] text-xs font-bold focus-visible:outline focus-visible:outline-2"
        >
          Cancelar
        </button>
      </span>
    )
  }

  return (
    <button
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
