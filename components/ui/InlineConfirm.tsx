'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface InlineConfirmProps {
  /** Texto do botão que inicia a ação. */
  label: string
  /** Pergunta mostrada ao pedir confirmação. */
  message: string
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
  /** Classes do botão inicial. */
  className?: string
}

/** Confirmação dentro da UI (window.confirm não funciona no PWA instalado). Foco no "sim", alvos de 44px. */
export function InlineConfirm({ label, message, confirmLabel, onConfirm, disabled, className }: InlineConfirmProps) {
  const [asking, setAsking] = useState(false)
  const yesRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (asking) yesRef.current?.focus()
  }, [asking])

  if (asking) {
    return (
      <div role="alert" className="w-full rounded-xl border border-red-500/20 bg-red-500/10 p-3 space-y-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">{message}</p>
        <div className="flex flex-wrap gap-2">
          <button
            ref={yesRef}
            type="button"
            onClick={() => { setAsking(false); onConfirm() }}
            className="min-h-[44px] px-4 rounded-xl bg-red-500 text-white text-xs font-bold"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => setAsking(false)}
            className="min-h-[44px] px-4 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs font-bold"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button type="button" disabled={disabled} onClick={() => setAsking(true)} className={cn('min-h-[44px]', className)}>
      {label}
    </button>
  )
}
