'use client'

import { motion } from 'framer-motion'
import { usePerformanceMetrics } from '@/lib/hooks/usePerformance'
import { getParetoMessage } from '@/lib/utils/pareto'
import { TrendingUp, Target, Award } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'

export function PerformanceHeader() {
  const { data: metrics, isLoading } = usePerformanceMetrics()
  
  const daily = metrics?.daily || 0
  const weekly = metrics?.weekly || 0
  
  const paretoMessage = useMemo(() => {
    // Usamos o dia do ano + semana para manter a mensagem constante por um tempo ou rotacionar
    const seed = new Date().getMilliseconds() 
    return getParetoMessage(seed)
  }, [daily, weekly])

  if (isLoading) return <div className="h-12 w-48 bg-[var(--bg-overlay)] animate-pulse rounded-2xl" />

  return (
    <div className="flex flex-col items-end gap-3.5 pr-2">
      <div className="flex items-center gap-10">
        {/* Daily Progress */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">HOJE</span>
            <Target size={14} className="text-[var(--text-muted)]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-3xl font-black tracking-tighter text-[var(--text-primary)]",
              daily < 50 && "opacity-50"
            )}>{daily}%</span>
          </div>
          <div className="w-20 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1.5 overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${daily}%` }}
               className="h-full bg-[var(--text-primary)] transition-all duration-1000 shadow-[0_0_8px_rgba(var(--text-primary-rgb),0.3)]"
             />
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">SEMANA</span>
            <TrendingUp size={14} className={cn(weekly >= 80 ? "text-green-500" : "text-[var(--text-muted)]")} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-3xl font-black tracking-tighter text-[var(--text-primary)]",
              weekly < 50 && "opacity-50"
            )}>{weekly}%</span>
          </div>
          <div className="w-20 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1.5 overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${weekly}%` }}
               className={cn(
                 "h-full transition-all duration-1000",
                 weekly >= 80 ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]" : "bg-[var(--text-primary)]/60"
               )}
             />
          </div>
        </div>
      </div>

      {/* Pareto Message */}
      <motion.p 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[13px] font-black text-[var(--text-primary)] italic max-w-none text-right leading-none tracking-tightest bg-[var(--bg-overlay)] px-4 py-2 rounded-full border border-[var(--border-subtle)] shadow-xl inline-block mt-2"
      >
        {paretoMessage}
      </motion.p>
    </div>
  )
}
