'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  /** Primeira ação sugerida (ex.: abre o modal de criação). */
  actionLabel?: string
  onAction?: () => void
  className?: string
}

/** Estado vazio padrão: orienta a primeira ação. Só tokens de tema, texto >= 12px, alvo >= 44px. */
export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-12 md:py-16 gap-4 rounded-3xl md:rounded-[32px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-overlay)]',
        className
      )}
    >
      <div className="w-16 h-16 rounded-3xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
        {icon}
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-lg font-black text-[var(--text-primary)]">{title}</h3>
        {description && <p className="text-sm font-medium text-[var(--text-secondary)]">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-[44px] px-6 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-primary)] font-black text-sm hover:opacity-90 active:scale-95 transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
