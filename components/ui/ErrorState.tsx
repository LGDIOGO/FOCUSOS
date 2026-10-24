'use client'

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

/** Erro padrão de carregamento, com "Tentar de novo". Só tokens de tema. */
export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Verifique sua conexão e tente de novo.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center text-center px-6 py-10 gap-3 rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]',
        className
      )}
    >
      <AlertTriangle size={24} className="text-[var(--text-muted)]" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-base font-black text-[var(--text-primary)]">{title}</p>
        <p className="text-sm font-medium text-[var(--text-muted)]">{description}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] px-6 rounded-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] font-black text-sm hover:opacity-80 transition-all"
        >
          Tentar de novo
        </button>
      )}
    </div>
  )
}
