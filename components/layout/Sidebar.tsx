'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, Calendar, RefreshCcw, Target, Brain, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { SettingsModal } from '@/components/dashboard/SettingsModal'

const NAV_ITEMS = [
  { label: 'Resumo',    icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Agenda',    icon: Calendar,        href: '/dashboard/agenda' },
  { label: 'Hábitos',   icon: RefreshCcw,       href: '/dashboard/habits' },
  { label: 'Metas',    icon: Target,          href: '/dashboard/goals' },
  { label: 'IA Insights', icon: Brain,           href: '/dashboard/insights' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <aside className="hidden md:flex w-20 lg:w-64 h-screen border-r border-white/[0.06] bg-black flex-col p-4 gap-8 sticky top-0 bg-black/95 backdrop-blur-3xl z-[100]">
        {/* Logo */}
        <div className="relative z-[1000] flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <div className="w-4 h-4 rounded-sm bg-black rotate-45" />
          </div>
          <span className="hidden lg:block text-lg font-bold tracking-tight">FocusOS</span>
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
                  active ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                )}
              >
                <item.icon size={20} className={cn("transition-colors relative z-10", active ? "text-white" : "text-white/40 group-hover:text-white/70")} />
                <span className="hidden lg:block text-base font-medium relative z-10">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
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
            className="flex items-center gap-3 px-3 py-2.5 text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-xl transition-all"
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
