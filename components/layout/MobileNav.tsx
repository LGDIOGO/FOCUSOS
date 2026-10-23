'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, Settings, Timer, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { splitNavDestinations, isMoreActive } from '@/lib/utils/navItems'
import { NAV_ICONS } from '@/components/layout/navIcons'
import { signOutAndRedirect } from '@/components/layout/session'
import { usePomodoroStore } from '@/lib/stores/pomodoroStore'

const { primary: PRIMARY, more: MORE } = splitNavDestinations()

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]'

interface MobileNavProps {
  onOpenSettings: () => void
}

export default function MobileNav({ onOpenSettings }: MobileNavProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const { toggle: togglePomodoro, isRunning } = usePomodoroStore()

  const closeSheet = () => { setMoreOpen(false); setConfirmingLogout(false) }

  // Fecha ao navegar
  useEffect(() => { setMoreOpen(false); setConfirmingLogout(false) }, [pathname])

  // ESC fecha; foco vai para o sheet ao abrir e volta ao botão ao fechar
  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMoreOpen(false); setConfirmingLogout(false) } }
    document.addEventListener('keydown', onKey)
    sheetRef.current?.focus()
    const btn = moreBtnRef.current
    return () => {
      document.removeEventListener('keydown', onKey)
      btn?.focus()
    }
  }, [moreOpen])

  const moreActive = isMoreActive(pathname)

  const tileClass = 'flex flex-col items-center justify-center gap-1.5 min-h-[72px] px-2 py-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] active:bg-[var(--bg-card)] transition-colors touch-manipulation select-none ' + FOCUS_RING

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(var(--nav-h)+env(safe-area-inset-bottom))] bg-[var(--bg-primary)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] px-1 pb-[env(safe-area-inset-bottom)] flex justify-around items-stretch z-[140] transition-colors duration-300"
      >
        {PRIMARY.map((item) => {
          const active = pathname === item.href
          const Icon = NAV_ICONS[item.icon]
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-1 flex-1 min-h-[52px] min-w-[44px] touch-manipulation select-none transition-colors',
                FOCUS_RING,
                active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] active:text-[var(--text-secondary)]'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} className={cn('shrink-0', active && 'text-red-500')} />
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>
              {active && (
                <motion.div
                  layoutId="active-nav-dot"
                  className="absolute top-1 w-1 h-1 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.7)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          )
        })}

        <button
          ref={moreBtnRef}
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={cn(
            'relative flex flex-col items-center justify-center gap-1 px-1 flex-1 min-h-[52px] min-w-[44px] touch-manipulation select-none transition-colors',
            FOCUS_RING,
            moreActive || moreOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] active:text-[var(--text-secondary)]'
          )}
        >
          <MoreHorizontal size={22} strokeWidth={moreActive || moreOpen ? 2.5 : 1.75} className={cn('shrink-0', moreActive && 'text-red-500')} />
          <span className="text-[11px] font-semibold leading-none">Mais</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <div className="lg:hidden fixed inset-0 z-[9000] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeSheet}
              aria-hidden="true"
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mais opções"
              tabIndex={-1}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="relative w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] rounded-t-[28px] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl outline-none"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-subtle)]" aria-hidden="true" />

              <div className="grid grid-cols-3 gap-3">
                {MORE.map((item) => {
                  const active = pathname === item.href
                  const Icon = NAV_ICONS[item.icon]
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeSheet}
                      aria-current={active ? 'page' : undefined}
                      className={cn(tileClass, active && 'text-[var(--text-primary)] border-red-500/40')}
                    >
                      <Icon size={22} className={cn(active && 'text-red-500')} />
                      <span className="text-[11px] font-semibold text-center leading-tight">{item.label}</span>
                    </Link>
                  )
                })}

                <button
                  type="button"
                  onClick={() => { closeSheet(); togglePomodoro() }}
                  className={tileClass}
                >
                  <span className="relative">
                    <Timer size={22} />
                    {isRunning && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                  </span>
                  <span className="text-[11px] font-semibold leading-tight">Modo Foco</span>
                </button>

                <button
                  type="button"
                  onClick={() => { closeSheet(); onOpenSettings() }}
                  className={tileClass}
                >
                  <Settings size={22} />
                  <span className="text-[11px] font-semibold leading-tight">Configurações</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmingLogout(true)}
                  className={cn(tileClass, 'text-red-400')}
                >
                  <LogOut size={22} />
                  <span className="text-[11px] font-semibold leading-tight">Sair</span>
                </button>
              </div>

              {confirmingLogout && (
                <div role="alertdialog" aria-label="Confirmar saída" className="mt-4 p-4 rounded-2xl border border-red-400/30 bg-red-400/5">
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Encerrar a sessão neste aparelho?</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmingLogout(false)}
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
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
