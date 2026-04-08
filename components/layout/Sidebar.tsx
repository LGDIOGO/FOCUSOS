'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, Calendar, RefreshCcw, Target, Brain, Settings, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { SettingsModal } from '@/components/dashboard/SettingsModal'

const NAV_ITEMS = [
  { label: 'Resumo',    icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Agenda',    icon: Calendar,        href: '/dashboard/agenda' },
  { label: 'Hábitos',   icon: RefreshCcw,       href: '/dashboard/habits' },
  { label: 'Metas',    icon: Target,          href: '/dashboard/goals' },
  { label: 'Insights', icon: Brain,           href: '/dashboard/insights' },
  { label: 'Finanças',  icon: Wallet,          href: '/dashboard/finance' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <aside className="hidden lg:flex w-64 h-screen border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] flex-col p-4 gap-8 sticky top-0 z-[100] transition-all duration-300">
        {/* Logo */}
        <div className="relative z-[1000] flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-[9px] bg-[var(--text-primary)] flex items-center justify-center transition-colors flex-shrink-0">
            <div className="w-3.5 h-3.5 rounded-[3px] bg-[var(--bg-primary)] rotate-45 transition-colors" />
          </div>
          <span className="hidden lg:block text-lg font-bold tracking-tight text-[var(--text-primary)]">FocusOS</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative",
                  active 
                    ? "bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
                )}
              >
                <item.icon size={20} className={cn("transition-colors relative z-10", active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]")} />
                <span className="hidden lg:block text-base font-medium relative z-10">{item.label}</span>
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
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-3 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] rounded-xl transition-all"
          >
            <Settings size={20} />
            <span className="hidden lg:block text-base font-medium">Configurações</span>
          </button>
          <button 
            onClick={async () => {
              const { auth } = await import('@/lib/firebase/config')
              await auth.signOut()
              window.location.href = '/'
            }}
            className="flex items-center gap-3 px-3 py-2.5 text-red-400/60 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
          >
            <div className="w-5 h-5 flex items-center justify-center">
               <div className="w-2 h-2 rounded-full bg-red-400" />
            </div>
            <span className="hidden lg:block text-base font-bold">Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}
