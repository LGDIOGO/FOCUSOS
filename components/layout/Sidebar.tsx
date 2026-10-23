'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Settings, Timer } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { usePomodoroStore } from '@/lib/stores/pomodoroStore'
import { NAV_DESTINATIONS } from '@/lib/utils/navItems'
import { NAV_ICONS } from '@/components/layout/navIcons'
import { signOutAndRedirect } from '@/components/layout/session'

interface SidebarProps {
  onOpenSettings: () => void
}

// Entre lg (1024) e xl (1280) a barra fica só com ícones (w-20); em xl+ completa (w-64).
export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const pathname = usePathname()
  const { toggle: togglePomodoro, isRunning, isOpen: pomodoroOpen } = usePomodoroStore()

  return (
    <aside className="hidden lg:flex lg:w-20 xl:w-64 shrink-0 h-dvh border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] flex-col p-4 gap-8 sticky top-0 z-[100] transition-all duration-300">
      {/* Logo */}
      <div className="relative z-[1000] flex items-center justify-center xl:justify-start gap-3 xl:px-2">
        <div className="w-8 h-8 rounded-[9px] bg-[var(--text-primary)] flex items-center justify-center transition-colors flex-shrink-0">
          <div className="w-3.5 h-3.5 rounded-[3px] bg-[var(--bg-primary)] rotate-45 transition-colors" />
        </div>
        <span className="hidden xl:block text-lg font-bold tracking-tight text-[var(--text-primary)]">FocusOS</span>
      </div>

      {/* Nav */}
      <nav aria-label="Navegação principal" className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5">
        {NAV_DESTINATIONS.map((item) => {
          const active = pathname === item.href
          const Icon = NAV_ICONS[item.icon]
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 min-h-[44px] rounded-xl transition-all duration-200 relative',
                active
                  ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
              )}
            >
              <Icon size={20} className={cn('transition-colors relative z-10 shrink-0', active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]')} />
              <span className="hidden xl:block text-base font-medium relative z-10">{item.label}</span>
              {active && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-red-500 rounded-r-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-2">
        {/* Pomodoro Focus trigger */}
        <button
          onClick={togglePomodoro}
          title="Modo Foco"
          aria-label="Modo Foco"
          className={cn(
            'flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 min-h-[44px] rounded-xl transition-all relative',
            pomodoroOpen
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
          )}
        >
          <div className="relative">
            <Timer size={20} />
            {isRunning && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
            )}
          </div>
          <span className="hidden xl:block text-base font-medium">Modo Foco</span>
        </button>

        <button
          onClick={onOpenSettings}
          title="Configurações"
          aria-label="Configurações"
          className="flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 min-h-[44px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] rounded-xl transition-all"
        >
          <Settings size={20} />
          <span className="hidden xl:block text-base font-medium">Configurações</span>
        </button>
        <button
          onClick={() => { signOutAndRedirect() }}
          title="Encerrar Sessão"
          aria-label="Encerrar Sessão"
          className="flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 min-h-[44px] text-red-400/60 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-red-400" />
          </div>
          <span className="hidden xl:block text-base font-bold">Encerrar Sessão</span>
        </button>
      </div>
    </aside>
  )
}
