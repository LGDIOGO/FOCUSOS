'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface InlineNoticeProps {
  variant?: 'error' | 'info'
  message: string
  onClose: () => void
  /** Texto e ação opcionais (ex.: "Entrar"). */
  actionLabel?: string
  onAction?: () => void
  /** Some sozinho após N ms (padrão 6000; 0 desliga). */
  autoCloseMs?: number
  className?: string
}

/** Aviso inline acessível; substitui o alert do navegador, que é suprimido no PWA instalado. */
export function InlineNotice({
  variant = 'error',
  message,
  onClose,
  actionLabel,
  onAction,
  autoCloseMs = 6000,
  className,
}: InlineNoticeProps) {
  // `onClose` costuma chegar como arrow nova a cada render do pai; se fosse dependência do
  // efeito, qualquer re-render (ex.: digitar no chat) reiniciaria os 6s. Fica numa ref.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!autoCloseMs || actionLabel) return
    const t = setTimeout(() => onCloseRef.current(), autoCloseMs)
    return () => clearTimeout(t)
  }, [message, autoCloseMs, actionLabel])

  const Icon = variant === 'error' ? AlertTriangle : Info
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-3 pl-4 pr-1 py-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-[var(--text-primary)]',
        className
      )}
    >
      <Icon size={16} className="shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium py-2">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-black text-[var(--text-primary)] underline hover:opacity-80"
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:opacity-80"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
