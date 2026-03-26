'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, Calendar, RefreshCcw, Target, Brain } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV_ITEMS = [
  { label: 'Resumo',    icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Agenda',    icon: Calendar,        href: '/dashboard/agenda' },
  { label: 'Hábitos',   icon: RefreshCcw,       href: '/dashboard/habits' },
  { label: 'Metas',    icon: Target,          href: '/dashboard/goals' },
  { label: 'Insights', icon: Brain,           href: '/dashboard/insights' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/[0.08] px-6 py-4 flex justify-between items-center z-[5000]">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center gap-1 transition-all duration-300",
              active ? "text-white" : "text-white/40"
            )}
          >
            <item.icon size={22} className={cn("transition-colors", active ? "scale-110" : "")} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            
            {active && (
              <motion.div
                layoutId="active-nav-dot"
                className="absolute -top-1 w-1 h-1 bg-white rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
