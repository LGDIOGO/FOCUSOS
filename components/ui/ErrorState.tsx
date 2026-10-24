'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ErrorStateProps {
  title?: string
  description?: string
  /** Pode devolver a Promise do refetch: enquanto ela roda o botão mostra "Tentando…". */
  onRetry?: () => void | Promise<unknown>
  className?: string
}

/** Erro padrão de carregamento, com "Tentar de novo". Só tokens de tema. */
export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Não conseguimos buscar seus dados agora. Confira a internet e toque em Tentar de novo.',
  onRetry,
  className,
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false)

  const handleRetry = async () => {
    if (!onRetry || retrying) return
    setRetrying(true)
    try {
      await onRetry()
    } catch {
      // o pai continua mostrando o erro
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center text-center px-6 py-10 gap-3 rounded-3xl md:rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]',
        className
      )}
    >
      <AlertTriangle size={24} className="text-[var(--text-muted)]" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-base font-black text-[var(--text-primary)]">{title}</p>
        <p className="text-sm font-medium text-[var(--text-secondary)]">{description}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="min-h-[44px] px-6 rounded-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] font-black text-sm hover:opacity-80 disabled:opacity-50 transition-all"
        >
          {retrying ? 'Tentando…' : 'Tentar de novo'}
        </button>
      )}
    </div>
  )
}
