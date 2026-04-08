'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, Calendar, RefreshCcw, Target, Brain, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV_ITEMS = [
  { label: 'Resumo',    icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Agenda',    icon: Calendar,        href: '/dashboard/agenda' },
  { label: 'Hábitos',   icon: RefreshCcw,       href: '/dashboard/habits' },
  { label: 'Metas',    icon: Target,          href: '/dashboard/goals' },
  { label: 'Finanças', icon: Wallet,          href: '/dashboard/finance' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-t border-[var(--border-subtle)] px-6 py-4 flex justify-between items-center z-[5000] transition-colors duration-300">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center gap-1 transition-all duration-300",
              active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <item.icon size={22} className={cn("transition-colors", active ? "scale-110 text-red-500" : "")} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest transition-colors",
              active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
            )}>{item.label}</span>
            
            {active && (
              <motion.div
                layoutId="active-nav-dot"
                className="absolute -top-1 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
