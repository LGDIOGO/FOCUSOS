'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, Settings, Timer, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { splitNavDestinations, isMoreActive, isRouteActive } from '@/lib/utils/navItems'
import { NAV_ICONS } from '@/components/layout/navIcons'
import { LogoutConfirm } from '@/components/layout/LogoutConfirm'
import { usePomodoroStore } from '@/lib/stores/pomodoroStore'

const { primary: PRIMARY, more: MORE } = splitNavDestinations()

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]'

interface MobileNavProps {
  onOpenSettings: () => void
  /** Avisa o layout quando o sheet abre/fecha (o FAB some enquanto aberto). */
  onMoreOpenChange?: (open: boolean) => void
}

export default function MobileNav({ onOpenSettings, onMoreOpenChange }: MobileNavProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const { toggle: togglePomodoro, isRunning } = usePomodoroStore()

  const restoreFocusRef = useRef(true)
  useEffect(() => { onMoreOpenChange?.(moreOpen) }, [moreOpen, onMoreOpenChange])
  const closeSheet = () => { setMoreOpen(false); setConfirmingLogout(false) }
  // Fecha por ação (link, Foco, Configurações): não devolve o foco ao "Mais"
  const closeSheetAndAct = () => { restoreFocusRef.current = false; closeSheet() }

  // Fecha ao navegar
  useEffect(() => { restoreFocusRef.current = false; setMoreOpen(false); setConfirmingLogout(false) }, [pathname])

  // ESC fecha; foco vai para o sheet ao abrir e volta ao botão ao fechar
  useEffect(() => {
    if (!moreOpen) return
    restoreFocusRef.current = true
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMoreOpen(false); setConfirmingLogout(false); return }
      if (e.key !== 'Tab' || !sheetRef.current) return
      // Trap de foco: Tab/Shift+Tab circulam dentro do sheet
      const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === sheetRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    sheetRef.current?.focus()
    const btn = moreBtnRef.current
    return () => {
      document.removeEventListener('keydown', onKey)
      // Só devolve o foco ao "Mais" se fechou sem navegar/agir
      if (restoreFocusRef.current) btn?.focus()
    }
  }, [moreOpen])

  const moreActive = isMoreActive(pathname)

  const tileClass = 'flex flex-col items-center justify-center gap-1.5 min-h-[72px] px-2 py-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] active:bg-[var(--bg-card)] transition-colors touch-manipulation select-none ' + FOCUS_RING

  const rowClass = 'w-full min-h-[48px] flex items-center gap-3 px-3 rounded-xl text-[var(--text-secondary)] active:bg-[var(--bg-overlay)] transition-colors touch-manipulation select-none ' + FOCUS_RING

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(var(--nav-h)+env(safe-area-inset-bottom))] bg-[var(--bg-primary)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] px-1 pb-[env(safe-area-inset-bottom)] flex justify-around items-stretch z-[140] transition-colors duration-300"
      >
        {PRIMARY.map((item) => {
          const active = isRouteActive(pathname, item.href)
          const Icon = NAV_ICONS[item.icon]
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-1 flex-1 min-h-[52px] min-w-[44px] touch-manipulation select-none transition-colors',
                FOCUS_RING,
                active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] active:text-[var(--text-primary)]'
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
            moreActive || moreOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] active:text-[var(--text-primary)]'
          )}
        >
          <MoreHorizontal size={22} strokeWidth={moreActive || moreOpen ? 2.5 : 1.75} className={cn('shrink-0', moreActive && 'text-red-500')} />
          <span className="text-[11px] font-semibold leading-none">Mais</span>
          {moreActive && (
            <span className="absolute top-1 w-1 h-1 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.7)]" aria-hidden="true" />
          )}
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
                  const active = isRouteActive(pathname, item.href)
                  const Icon = NAV_ICONS[item.icon]
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeSheetAndAct}
                      aria-current={active ? 'page' : undefined}
                      className={cn(tileClass, active && 'text-[var(--text-primary)] border-red-500/40')}
                    >
                      <Icon size={22} className={cn(active && 'text-red-500')} />
                      <span className="text-[11px] font-semibold text-center leading-tight">{item.label}</span>
                    </Link>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-col">
                <button
                  type="button"
                  onClick={() => { closeSheetAndAct(); togglePomodoro() }}
                  className={rowClass}
                >
                  <span className="relative">
                    <Timer size={22} />
                    {isRunning && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                  </span>
                  <span className="text-sm font-semibold">Modo Foco</span>
                </button>

                <button
                  type="button"
                  onClick={() => { closeSheetAndAct(); onOpenSettings() }}
                  className={rowClass}
                >
                  <Settings size={22} />
                  <span className="text-sm font-semibold">Configurações</span>
                </button>

                <div className="border-t border-[var(--border-subtle)] mt-3 pt-3">
                  {confirmingLogout ? (
                    <LogoutConfirm onCancel={() => setConfirmingLogout(false)} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingLogout(true)}
                      className={rowClass + ' text-red-400'}
                    >
                      <LogOut size={22} />
                      <span className="text-sm font-semibold">Sair</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
