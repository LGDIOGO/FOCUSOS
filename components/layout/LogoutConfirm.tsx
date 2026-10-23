'use client'

import { useEffect, useRef } from 'react'
import { signOutAndRedirect } from '@/components/layout/session'

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]'

// Confirmação inline de saída (sem window.confirm: não funciona no PWA instalado).
export function LogoutConfirm({ onCancel, className = '' }: { onCancel: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollIntoView({ block: 'nearest' }) }, [])

  return (
    <div ref={ref} role="alertdialog" aria-label="Confirmar saída" className={'p-4 rounded-2xl border border-red-400/30 bg-red-400/5 ' + className}>
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Sair da conta neste aparelho?</p>
      <div className="flex gap-3">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className={'flex-1 min-h-[44px] rounded-xl border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-secondary)] ' + FOCUS_RING}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => { signOutAndRedirect() }}
          className={'flex-1 min-h-[44px] rounded-xl bg-red-500 text-white text-sm font-bold ' + FOCUS_RING}
        >
          Sair
        </button>
      </div>
    </div>
  )
}
